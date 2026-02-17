import { supabase } from './supabaseClient';
import { settingsService } from './settingsService';

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
  hesabe_invoice_id?: string;
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
    periodType: 'weekly' | 'monthly',
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
      periodStart = new Date(startDate);
      periodStart.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      periodEnd = new Date(endDate);
      periodEnd.setHours(23, 59, 59, 999);
    }

    // If both dates are explicitly cleared (empty strings), show all payments
    if (startDate === '' && endDate === '') {
      periodStart = null;
      periodEnd = null;
    }

    // Get platform settings for commission
    const settings = await settingsService.getSettings();
    const platformCommissionFixed = settings?.platform_commission_fixed || 0;

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
        payer:profiles!payments_payer_id_fkey(id, name, email),
        payee:profiles!payments_payee_id_fkey(id, name, email, commission_percentage),
        booking:bookings!payments_booking_id_fkey(
          id,
          service_id,
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
    for (const payment of payments || []) {
      const influencerId = payment.payee_id;

      if (!influencerId) {
        console.warn('Skipping payment without payee_id:', payment.id);
        continue;
      }

      if (!earningsMap.has(influencerId)) {
        earningsMap.set(influencerId, {
          influencer_id: influencerId,
          influencer_name: payment.payee?.name || 'Unknown',
          influencer_email: payment.payee?.email || '',
          total_earnings: 0,
          total_pg_charges: 0,
          total_platform_commission: 0,
          net_payout: 0,
          currency: payment.currency || 'KWD',
          payment_count: 0,
          payments: []
        });
      }

      const earning = earningsMap.get(influencerId)!;
      const paymentAmount = parseFloat(payment.amount) || 0;

      // 1. Calculate PG Charge (Bank Deduction)
      // FIXED: 1.5% of total amount
      const pgCharge = paymentAmount * 0.015;
      const netAfterBank = paymentAmount - pgCharge;

      // 2. Determine Service Type & Calculate Platform Commission + Net Payout
      const service = payment.booking?.service;
      const serviceType = service?.service_type || 'individual'; // Default to individual if unknown

      // Derive Original Price and Discount
      // original_price comes from service.price
      // discount = original_price - paymentAmount
      const originalPrice = service?.price || paymentAmount;
      const discountAmount = Math.max(0, originalPrice - paymentAmount);

      let platformCommission = 0;
      let netPayout = 0;
      let influencerSharePercentage = 0;

      if (serviceType === 'dual') {
        // === DUAL SERVICE LOGIC ===
        // Platform Commission: 5% fixed on Net After Bank (configured in settings)
        // Then remaining is split between primary and invited based on percentages

        // Use setting or default to 5%
        const commissionRate = settings?.commission_percentage || 5;

        // Calculate Platform Commission on Net After Bank
        platformCommission = netAfterBank * (commissionRate / 100);

        const amountAfterCommission = netAfterBank - platformCommission;

        // Determine if payee is Primary or Invited
        const isPrimary = influencerId === service?.primary_influencer_id;
        const isInvited = influencerId === service?.invited_influencer_id;

        if (isPrimary || isInvited) {
          // Get split percentage
          if (isPrimary) {
            influencerSharePercentage = service?.primary_influencer_earnings_percentage ?? 50;
          } else {
            influencerSharePercentage = service?.invited_influencer_earnings_percentage ?? 50;
          }

          // Calculate payout based on split
          netPayout = amountAfterCommission * (influencerSharePercentage / 100);
        } else {
          // Fallback
          console.warn(`Payment ${payment.id}: Payee ${influencerId} mismatch for dual service.`);
          netPayout = amountAfterCommission; // Default to full amount?
          influencerSharePercentage = 100;
        }

      } else {
        // === INDIVIDUAL SERVICE LOGIC ===
        // Platform Commission: Variable % from Profile (payee.commission_percentage) OR default local 2%
        // Calculated on Net After Bank

        // Use profile's commission percentage (default to 2 if not set/zero? User said "vary based on influencers")
        // User example said "2% commission". Let's assume profile has it, or we default to 2.
        const commissionRate = payment.payee?.commission_percentage || 2;

        influencerSharePercentage = 100; // Individual gets 100% of the share after platform comm

        platformCommission = netAfterBank * (commissionRate / 100);

        netPayout = netAfterBank - platformCommission;
      }

      // Accumulate totals
      earning.total_earnings += paymentAmount;
      earning.total_pg_charges += pgCharge;
      earning.total_platform_commission += platformCommission;
      earning.net_payout += netPayout;
      earning.payment_count += 1;

      earning.payments.push({
        payment_id: payment.id,
        booking_id: payment.booking_id,
        service_title: payment.booking?.service?.title || 'Unknown Service',
        service_type: serviceType,
        original_price: originalPrice,
        discount_amount: discountAmount,
        amount: paymentAmount, // Transaction Amount (Final Charged Amount)
        pg_charge: pgCharge,
        platform_commission: platformCommission,
        net_after_bank: netAfterBank,
        net_amount: netPayout, // The calculated share for THIS payee
        currency: payment.currency || 'KWD',
        paid_at: payment.paid_at || '',
        transaction_reference: payment.transaction_reference,
        influencer_share_percentage: influencerSharePercentage,
        status: payment.status
      });
    }

    const earningsList = Array.from(earningsMap.values());

    // Check settlement status for each influencer
    // OLD: Only checked exact period match
    // const settlements = await this.getSettlements(periodType, startDate, endDate);

    // NEW: Fetch all settlements for these influencers within the requested time window
    // to correctly flag individual payments as settled.

    // Get list of influencer IDs
    const influencerIds = earningsList.map(e => e.influencer_id);

    // Fetch relevant settlements (overlapping the queried range)
    // If no range, fetch all? That might be heavy. 
    // If no range, maybe default to last 3 months or just fetch all for these users.
    // Let's rely on checking if payment date falls into ANY settlement cache.

    const { data: allSettlements } = await supabase
      .from('settlements')
      .select('influencer_id, period_start, period_end')
      .in('influencer_id', influencerIds);

    // Create a quick lookup for settlements: Map<influencerId, Array<{start, end}>>
    const settlementLookup = new Map<string, Array<{ start: number, end: number }>>();

    (allSettlements || []).forEach(s => {
      const ranges = settlementLookup.get(s.influencer_id) || [];
      // Store as timestamps for easier comparison
      // period_start is YYYY-MM-DD. Treat as Start of Day in Local/UTC? 
      // Should match how 'paid_at' is compared. 
      // safe approach: simple string comparison or Date objects.
      // Let's use Date objects (00:00:00 to 23:59:59)
      const start = new Date(s.period_start).setHours(0, 0, 0, 0);
      const end = new Date(s.period_end).setHours(23, 59, 59, 999);
      ranges.push({ start, end });
      settlementLookup.set(s.influencer_id, ranges);
    });

    earningsList.forEach(earning => {
      // Mark individual payments
      const ranges = settlementLookup.get(earning.influencer_id) || [];

      earning.payments.forEach(payment => {
        const paidTime = new Date(payment.paid_at).getTime();
        const isSettled = ranges.some(range => paidTime >= range.start && paidTime <= range.end);
        payment.is_settled = isSettled;
      });

      // Check if the *requested* period is fully settled (for the main table status)
      // This preserves existing 'is_settled' logic for the Main View
      // But now we can be smarter: If ALL payments in this view are settled, mark as settled?
      // Or stick to "Is there a settlement for this exact range?"
      // User wants "Separate unsettled services". 
      // The Modal handles the separation. 
      // The Main table 'Settled' status usually implies "I have run the settlement for this specific view".
      // Let's keep the exact match check for the Main Table "Settlement Status" column consistency,
      // OR update it to "Partially Settled" if some are settled?
      // Let's stick to the original logic for the main table flag, but derived from the fetched settlements?

      // Original logic: exact match of periodType + start + end
      if (startDate && endDate) {
        // Check if there's a settlement matching this EXACT range
        const exactMatch = (allSettlements || []).find(s =>
          s.influencer_id === earning.influencer_id &&
          s.period_start === startDate.split('T')[0] &&
          s.period_end === endDate.split('T')[0]
        );
        earning.is_settled = !!exactMatch;
        if (exactMatch) {
          earning.settled_at = new Date().toISOString(); // Mock or fetch actual if needed
          // earning.settlement_id = exactMatch.id; // We didn't fetch ID above, but can if needed
        }
      } else {
        earning.is_settled = false;
      }
    });

    return earningsList;
  },

  // Get cash out summary for a period
  async getCashOutSummary(
    periodType: 'weekly' | 'monthly',
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
    periodType: 'weekly' | 'monthly',
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
    periodType: 'weekly' | 'monthly',
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
    periodType: 'weekly' | 'monthly',
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
        return dataNoSettler;
      }

      throw error;
    }

    return data;
  },

  // Remove settlement (unsettle)
  async unmarkSettled(
    influencerId: string,
    periodType: 'weekly' | 'monthly',
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

