import { supabase } from './supabaseClient';
import { settingsService } from './settingsService';
import dayjs from 'dayjs';

/** Stored on `settlements.period_type`; admin cash-out uses date range (`custom`). */
export type SettlementPeriodType = 'weekly' | 'monthly' | 'custom';

/** Admin UI uses 3 dp for money cells; normalize floats so totals match summed rows */
function roundToFils(n: number): number {
  return Math.round(Number(n) * 1000) / 1000;
}

export interface InfluencerEarning {
  influencer_id: string;
  influencer_name: string;
  influencer_email: string;
  total_earnings: number;
  total_pg_charges: number;
  total_platform_commission: number;
  net_payout: number;
  currency: string;
  payment_count: number;
  payments: PaymentEarning[];
  is_settled?: boolean;
  settled_at?: string;
  settlement_id?: string;
}

export interface PaymentEarning {
  /** Unique UI row id (payment_id + influencer_id) for dual splits */
  row_id: string;
  payment_id: string;
  booking_id: string;
  service_title: string;
  service_type: string;
  original_price: number;
  discount_amount: number;
  amount: number;
  pg_charge: number;
  platform_commission: number;
  net_after_bank: number;
  net_amount: number;
  currency: string;
  paid_at: string;
  transaction_reference?: string;
  influencer_share_percentage?: number;
  status: string;
  is_settled?: boolean;
}

export interface CashOutSummary {
  period_start: string;
  period_end: string;
  total_earnings: number;
  total_pg_charges: number;
  total_platform_commission: number;
  total_net_payout: number;
  influencer_count: number;
  payment_count: number;
}

export const cashOutService = {
  // Get influencer earnings for a specific period
  async getInfluencerEarnings(
    periodType: SettlementPeriodType,
    startDate?: string,
    endDate?: string
  ): Promise<InfluencerEarning[]> {
    // Calculate date range
    // If explicit dates are provided, use them
    // Otherwise, calculate based on period type (weekly/monthly)
    // But if user clears the date range, show ALL payments
    let periodStart: Date | null = null;
    let periodEnd: Date | null = null;

    // Only calculate default period if no explicit dates are provided
    // IMPORTANT: By default, show ALL payments (no date filter)
    // User can select a date range if they want to filter
    // This ensures payments are visible immediately
    if (!startDate && !endDate) {
      // Don't set periodStart and periodEnd - this will show all payments
      periodStart = null;
      periodEnd = null;

      // Optional: Uncomment below if you want to default to current month
      // periodEnd = new Date();
      // if (periodType === 'weekly') {
      //   periodStart = new Date(periodEnd);
      //   periodStart.setDate(periodEnd.getDate() - periodEnd.getDay());
      //   periodStart.setHours(0, 0, 0, 0);
      // } else {
      //   periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
      //   periodStart.setHours(0, 0, 0, 0);
      // }
    }

    // Use provided dates if available (overrides period calculation)
    if (startDate) {
      periodStart = dayjs(startDate).startOf('day').toDate();
    }
    if (endDate) {
      periodEnd = dayjs(endDate).endOf('day').toDate();
    }

    // If both dates are explicitly cleared (empty strings), show all payments
    if (startDate === '' && endDate === '') {
      periodStart = null;
      periodEnd = null;
    }

    // Dual / shared platform commission: App Settings (`dual_platform_commission_percentage`) then platform_settings
    const dualCommissionRate = await settingsService.getDualPlatformCommissionPercentage();

    // Get all completed payments to influencers
    // First, get all payments with payee_id (influencer receiving payment)
    const { data: allPayments, error: allPaymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        booking_id,
        payee_id,
        amount,
        currency,
        status,
        paid_at,
        created_at,
        transaction_reference,
        is_settled,
        settled_at,
        payer:profiles!payments_payer_id_fkey(id, name, email),
        payee:profiles!payments_payee_id_fkey(id, name, email, commission_percentage),
        booking:bookings!payments_booking_id_fkey(
          id,
          is_published,
          service_id,
          service_type,
          influencer_id,
          invited_influencer_id,
          primary_influencer_earnings_percentage,
          invited_influencer_earnings_percentage,
          service:services!bookings_service_id_fkey(
            title,
            service_type,
            price,
            primary_influencer_id,
            invited_influencer_id,
            primary_influencer_earnings_percentage,
            invited_influencer_earnings_percentage
          )
        )
      `)
      .not('payee_id', 'is', null)
      .order('created_at', { ascending: false });

    if (allPaymentsError) {
      console.error('Error fetching all payments:', allPaymentsError);
      throw allPaymentsError;
    }

    // Filter by status - accept multiple possible status values
    // Include: completed, paid, success, successful (case-insensitive)
    let payments = (allPayments || []).filter(p => {
      const status = (p.status || '').toLowerCase().trim();
      return ['completed', 'paid', 'success', 'successful'].includes(status);
    });

    // Debug: Log payments that were filtered out
    const filteredOut = (allPayments || []).filter(p => {
      const status = (p.status || '').toLowerCase().trim();
      return !['completed', 'paid', 'success', 'successful'].includes(status);
    });

    if (filteredOut.length > 0) {
      console.log('Payments filtered out by status:', filteredOut.map(p => ({
        id: p.id,
        status: p.status,
        amount: p.amount,
        payee_id: p.payee_id,
        paid_at: p.paid_at
      })));
    }

    // Filter by date range - use paid_at if available, otherwise use created_at
    // Only filter if date range is explicitly provided (periodStart and periodEnd are set)
    if (periodStart && periodEnd) {
      const beforeFilter = payments.length;
      payments = payments.filter(p => {
        // Use paid_at if available, otherwise fall back to created_at
        const paymentDate = p.paid_at ? new Date(p.paid_at) : new Date(p.created_at);

        // Check if payment is within the date range
        if (paymentDate < periodStart!) return false;
        if (paymentDate > periodEnd!) return false;
        return true;
      });
      console.log(`Date filter (${periodStart.toISOString()} to ${periodEnd.toISOString()}): ${beforeFilter} payments before, ${payments.length} after filtering`);
    } else {
      console.log('No date range filter applied - showing all payments with valid status');
    }

    // Debug logging - Enhanced to show exactly what's happening
    console.log('=== CASH OUT DEBUG ===');
    console.log('Period Type:', periodType);
    console.log('Start Date:', startDate || 'not set');
    console.log('End Date:', endDate || 'not set');
    console.log('Period Start:', periodStart ? periodStart.toISOString() : 'NULL (showing all)');
    console.log('Period End:', periodEnd ? periodEnd.toISOString() : 'NULL (showing all)');
    console.log('Total Payments Fetched:', allPayments?.length || 0);
    console.log('Payments With Payee ID:', (allPayments || []).filter(p => p.payee_id).length);
    console.log('Payments After Status Filter:', payments.length);
    console.log('Payments After Date Filter:', payments.length);

    // Group payments by influencer
    const earningsMap = new Map<string, InfluencerEarning>();

    console.log('Grouping payments. Total payments to group:', payments.length);
    console.log('Payment IDs to group:', payments.map(p => p.id));

    // NEW LOGIC: Iterate through payments and apply Individual vs Dual logic
    // Fetch PG charges dynamically
    // Process payments in batches to avoid overwhelming the server
    const batchSize = 5;
    for (let i = 0; i < payments.length; i += batchSize) {
      const batch = payments.slice(i, i + batchSize);

      await Promise.all(batch.map(async (payment) => {
        let pgCharge = 0;
        const paymentAmount = parseFloat(payment.amount) || 0;

        // Try to fetch dynamic PG charge from Hesabe
        if (payment.transaction_reference && !payment.transaction_reference.startsWith('MH_')) {
          try {
            // MH_ is just a prefix we usually use for mock IDs, let's assume it's a real Hesabe reference otherwise
            const invoiceDetails = await this.getHesabeInvoiceDetails(payment.transaction_reference);
            if (invoiceDetails?.success && invoiceDetails?.invoice?.pg_charge !== undefined) {
              pgCharge = parseFloat(invoiceDetails.invoice.pg_charge);
            } else {
              // Fallback if not found in response
              pgCharge = paymentAmount * 0.015;
            }
          } catch (e) {
            console.warn(`Failed to fetch Hesabe invoice for ${payment.transaction_reference}, using fallback`, e);
            pgCharge = paymentAmount * 0.015;
          }
        } else {
          // If transaction reference is a mock or missing, fallback to 1.5%
          pgCharge = paymentAmount * 0.015;
        }

        const netAfterBank = paymentAmount - pgCharge;

        const influencerId = payment.payee_id;

        if (!influencerId) {
          console.warn('Skipping payment without payee_id:', payment.id);
          return;
        }

        const booking = payment.booking as {
          service_type?: string;
          influencer_id?: string;
          invited_influencer_id?: string | null;
          primary_influencer_earnings_percentage?: number | null;
          invited_influencer_earnings_percentage?: number | null;
          service?: {
            title?: string;
            service_type?: string;
            price?: number;
            primary_influencer_id?: string;
            invited_influencer_id?: string | null;
            primary_influencer_earnings_percentage?: number | null;
            invited_influencer_earnings_percentage?: number | null;
          };
        } | undefined;

        const service = booking?.service;

        // Booking row mirrors service_type & influencers for cash-out; use when nested service is missing or thin
        const serviceType = String(
          booking?.service_type ?? service?.service_type ?? 'normal'
        ).toLowerCase();
        const originalPrice = service?.price || paymentAmount;
        const discountAmount = Math.max(0, originalPrice - paymentAmount);

        const ensureEarning = (id: string) => {
          if (!earningsMap.has(id)) {
            earningsMap.set(id, {
              influencer_id: id,
              influencer_name:
                id === payment.payee_id ? payment.payee?.name || 'Unknown' : 'Unknown',
              influencer_email: id === payment.payee_id ? payment.payee?.email || '' : '',
              total_earnings: 0,
              total_pg_charges: 0,
              total_platform_commission: 0,
              net_payout: 0,
              currency: payment.currency || 'KWD',
              payment_count: 0,
              payments: []
            });
          }
          return earningsMap.get(id)!;
        };

        const pushPaymentEarning = (
          targetId: string,
          opts: {
            platformCommission: number;
            netPayout: number;
            influencerSharePercentage: number;
            attributedGross: number;
            pgPart: number;
            netAfterBankPart: number;
          }
        ) => {
          const attributedGross = roundToFils(opts.attributedGross);
          const pgPart = roundToFils(opts.pgPart);
          const platformCommission = roundToFils(opts.platformCommission);
          const netAfterBankPart = roundToFils(opts.netAfterBankPart);
          const netPayout = roundToFils(opts.netPayout);

          const earning = ensureEarning(targetId);
          earning.total_earnings += attributedGross;
          earning.total_pg_charges += pgPart;
          earning.total_platform_commission += platformCommission;
          earning.net_payout += netPayout;
          earning.payment_count += 1;

          earning.payments.push({
            row_id: `${payment.id}_${targetId}`,
            payment_id: payment.id,
            booking_id: payment.booking_id,
            service_title: service?.title || 'Unknown Service',
            service_type: serviceType,
            original_price: originalPrice,
            discount_amount: discountAmount,
            amount: attributedGross,
            pg_charge: pgPart,
            platform_commission: platformCommission,
            net_after_bank: netAfterBankPart,
            net_amount: netPayout,
            currency: payment.currency || 'KWD',
            paid_at: payment.paid_at || '',
            transaction_reference: payment.transaction_reference,
            influencer_share_percentage: opts.influencerSharePercentage,
            status: payment.status,
            is_settled: payment.is_settled
          });
        };

        const primaryId = service?.primary_influencer_id ?? booking?.influencer_id;
        const invitedId = service?.invited_influencer_id ?? booking?.invited_influencer_id ?? undefined;
        const isDual =
          serviceType === 'dual' && primaryId && invitedId;

        if (isDual) {
          const commissionRate = dualCommissionRate;
          const platformCommissionFull = netAfterBank * (commissionRate / 100);
          const amountAfterCommission = netAfterBank - platformCommissionFull;

          const primaryPctRaw =
            service?.primary_influencer_earnings_percentage ??
            booking?.primary_influencer_earnings_percentage ??
            50;
          const invitedPctRaw =
            service?.invited_influencer_earnings_percentage ??
            booking?.invited_influencer_earnings_percentage ??
            50;
          const primaryPct = Number.isFinite(Number(primaryPctRaw)) ? Number(primaryPctRaw) : 50;
          const invitedPct = Number.isFinite(Number(invitedPctRaw)) ? Number(invitedPctRaw) : 50;

          const splits: { id: string; pct: number }[] = [
            { id: primaryId!, pct: primaryPct },
            { id: invitedId!, pct: invitedPct }
          ];

          for (const { id, pct } of splits) {
            const share = pct / 100;
            const attributedGross = paymentAmount * share;
            const pgPart = pgCharge * share;
            const platPart = platformCommissionFull * share;
            const netAfterPart = netAfterBank * share;
            const netPayout = amountAfterCommission * share;

            pushPaymentEarning(id, {
              platformCommission: platPart,
              netPayout,
              influencerSharePercentage: pct,
              attributedGross,
              pgPart,
              netAfterBankPart: netAfterPart
            });
          }
        } else {
          const earning = ensureEarning(influencerId);

          const commissionRate = payment.payee?.commission_percentage || 2;
          const influencerSharePercentage = 100;
          const gross = roundToFils(paymentAmount);
          const pg = roundToFils(pgCharge);
          const netBank = roundToFils(netAfterBank);
          const platformCommission = roundToFils(netBank * (commissionRate / 100));
          const netPayout = roundToFils(netBank - platformCommission);

          earning.total_earnings += gross;
          earning.total_pg_charges += pg;
          earning.total_platform_commission += platformCommission;
          earning.net_payout += netPayout;
          earning.payment_count += 1;

          earning.payments.push({
            row_id: `${payment.id}_${influencerId}`,
            payment_id: payment.id,
            booking_id: payment.booking_id,
            service_title: service?.title || 'Unknown Service',
            service_type: serviceType,
            original_price: originalPrice,
            discount_amount: discountAmount,
            amount: gross,
            pg_charge: pg,
            platform_commission: platformCommission,
            net_after_bank: netBank,
            net_amount: netPayout,
            currency: payment.currency || 'KWD',
            paid_at: payment.paid_at || '',
            transaction_reference: payment.transaction_reference,
            influencer_share_percentage: influencerSharePercentage,
            status: payment.status,
            is_settled: payment.is_settled
          });
        }
      }));
    }

    const earningsList = Array.from(earningsMap.values());

    const profileIds = [...new Set(earningsList.map((e) => e.influencer_id))];
    if (profileIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id,name,email')
        .in('id', profileIds);
      const byId = new Map((profileRows || []).map((p: { id: string; name: string; email: string }) => [p.id, p]));
      earningsList.forEach((e) => {
        const p = byId.get(e.influencer_id);
        if (p) {
          e.influencer_name = p.name || e.influencer_name;
          e.influencer_email = p.email || e.influencer_email;
        }
      });
    }

    earningsList.forEach((earning) => {
      earning.is_settled =
        earning.payments.length > 0 && earning.payments.every((p) => p.is_settled);
    });

    return earningsList;
  },

  // Get cash out summary for a period
  async getCashOutSummary(
    periodType: SettlementPeriodType,
    startDate?: string,
    endDate?: string
  ): Promise<CashOutSummary> {
    const earnings = await this.getInfluencerEarnings(periodType, startDate, endDate);

    const summary: CashOutSummary = {
      period_start: startDate || '',
      period_end: endDate || '',
      total_earnings: 0,
      total_pg_charges: 0,
      total_platform_commission: 0,
      total_net_payout: 0,
      influencer_count: earnings.length,
      payment_count: 0
    };

    earnings.forEach(earning => {
      summary.total_earnings += earning.total_earnings;
      summary.total_pg_charges += earning.total_pg_charges;
      summary.total_platform_commission += earning.total_platform_commission;
      summary.total_net_payout += earning.net_payout;
      summary.payment_count += earning.payment_count;
    });

    return summary;
  },

  // Get Hesabe invoice details (calls edge function)
  async getHesabeInvoiceDetails(invoiceId: string): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-hesabe-invoice?invoice_id=${invoiceId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch invoice details');
    }

    return await response.json();
  },

  // Check if influencer is settled for a period
  async isSettled(
    influencerId: string,
    periodType: SettlementPeriodType,
    startDate: string,
    endDate: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('settlements')
      .select('id')
      .eq('influencer_id', influencerId)
      .eq('period_type', periodType)
      .eq('period_start', startDate.split('T')[0]) // Extract date part
      .eq('period_end', endDate.split('T')[0]) // Extract date part
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine
      console.error('Error checking settlement:', error);
    }

    return !!data;
  },

  // Get all settlements for a period
  async getSettlements(
    periodType: SettlementPeriodType,
    startDate?: string,
    endDate?: string
  ): Promise<Map<string, any>> {
    let query = supabase
      .from('settlements')
      .select('*')
      .eq('period_type', periodType);

    if (startDate) {
      query = query.eq('period_start', startDate.split('T')[0]);
    }
    if (endDate) {
      query = query.eq('period_end', endDate.split('T')[0]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching settlements:', error);
      return new Map();
    }

    // Create a map keyed by influencer_id
    const settlementMap = new Map();
    (data || []).forEach(settlement => {
      settlementMap.set(settlement.influencer_id, settlement);
    });

    return settlementMap;
  },

  // Mark influencer as settled
  async markAsSettled(
    influencerId: string,
    periodType: SettlementPeriodType,
    startDate: string,
    endDate: string,
    earnings: InfluencerEarning,
    notes?: string
  ): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Extract date part (YYYY-MM-DD)
    const periodStart = startDate.split('T')[0];
    const periodEnd = endDate.split('T')[0];

    const { data, error } = await supabase
      .from('settlements')
      .insert({
        influencer_id: influencerId,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd,
        total_earnings: earnings.total_earnings,
        total_pg_charges: earnings.total_pg_charges,
        total_platform_commission: earnings.total_platform_commission,
        net_payout: earnings.net_payout,
        currency: earnings.currency,
        payment_count: earnings.payment_count,
        settled_by: user.id,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      // If it's a unique constraint violation, update instead
      if (error.code === '23505') {
        const { data: updated, error: updateError } = await supabase
          .from('settlements')
          .update({
            total_earnings: earnings.total_earnings,
            total_pg_charges: earnings.total_pg_charges,
            total_platform_commission: earnings.total_platform_commission,
            net_payout: earnings.net_payout,
            currency: earnings.currency,
            payment_count: earnings.payment_count,
            settled_by: user.id,
            settled_at: new Date().toISOString(),
            notes: notes || null
          })
          .eq('influencer_id', influencerId)
          .eq('period_type', periodType)
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .select()
          .single();

        // If updated fails with FK violation (23503), try clearing settled_by
        if (updateError && updateError.code === '23503' && updateError.message.includes('settlements_settled_by_fkey')) {
          console.warn('Settled by profile not found, clearing settled_by field');
          const { data: updatedNoSettler, error: updateError2 } = await supabase
            .from('settlements')
            .update({
              total_earnings: earnings.total_earnings,
              total_pg_charges: earnings.total_pg_charges,
              total_platform_commission: earnings.total_platform_commission,
              net_payout: earnings.net_payout,
              currency: earnings.currency,
              payment_count: earnings.payment_count,
              settled_by: null, // Clear settled_by
              settled_at: new Date().toISOString(),
              notes: notes || null
            })
            .eq('influencer_id', influencerId)
            .eq('period_type', periodType)
            .eq('period_start', periodStart)
            .eq('period_end', periodEnd)
            .select()
            .single();

          if (updateError2) throw updateError2;
          return updatedNoSettler;
        }

        if (updateError) throw updateError;
        // Mark underlying payment rows as settled (UI relies on payments.is_settled)
        const paymentIds = (earnings.payments || []).map((p) => p.payment_id).filter(Boolean);
        if (paymentIds.length > 0) {
          await this.markPaymentsAsSettled(paymentIds);
        }
        return updated;
      }

      // If insert fails with FK violation (23503), try inserting without settled_by
      if (error.code === '23503' && error.message.includes('settlements_settled_by_fkey')) {
        console.warn('Settled by profile not found, inserting without settled_by');
        const { data: dataNoSettler, error: error2 } = await supabase
          .from('settlements')
          .insert({
            influencer_id: influencerId,
            period_type: periodType,
            period_start: periodStart,
            period_end: periodEnd,
            total_earnings: earnings.total_earnings,
            total_pg_charges: earnings.total_pg_charges,
            total_platform_commission: earnings.total_platform_commission,
            net_payout: earnings.net_payout,
            currency: earnings.currency,
            payment_count: earnings.payment_count,
            settled_by: null, // No settler
            notes: notes || null
          })
          .select()
          .single();

        if (error2) throw error2;
        const paymentIds = (earnings.payments || []).map((p) => p.payment_id).filter(Boolean);
        if (paymentIds.length > 0) {
          await this.markPaymentsAsSettled(paymentIds);
        }
        return dataNoSettler;
      }

      throw error;
    }

    // Mark underlying payment rows as settled (UI relies on payments.is_settled)
    const paymentIds = (earnings.payments || []).map((p) => p.payment_id).filter(Boolean);
    if (paymentIds.length > 0) {
      await this.markPaymentsAsSettled(paymentIds);
    }
    return data;
  },

  // Mark given individual payments as settled
  async markPaymentsAsSettled(paymentIds: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    if (!paymentIds || paymentIds.length === 0) return;

    const { error } = await supabase
      .from('payments')
      .update({
        is_settled: true,
        settled_at: new Date().toISOString()
      })
      .in('id', paymentIds);

    if (error) {
      console.error('Error marking payments as settled:', error);
      throw error;
    }
  },

  // Remove settlement (unsettle)
  async unmarkSettled(
    influencerId: string,
    periodType: SettlementPeriodType,
    startDate: string,
    endDate: string
  ): Promise<void> {
    const periodStart = startDate.split('T')[0];
    const periodEnd = endDate.split('T')[0];

    const { error } = await supabase
      .from('settlements')
      .delete()
      .eq('influencer_id', influencerId)
      .eq('period_type', periodType)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd);

    if (error) throw error;
  },

  // Get all settlements history
  async getAllSettlements(): Promise<any[]> {
    const { data, error } = await supabase
      .from('settlements')
      .select(`
        *,
        influencer:profiles!settlements_influencer_id_fkey(id, name, email),
        admin:profiles!settlements_settled_by_fkey(id, name, email)
      `)
      .order('settled_at', { ascending: false });

    if (error) {
      console.error('Error fetching settlement history:', error);
      throw error;
    }

    return data || [];
  }
};

