import { supabase } from './supabaseClient';

export interface CreatePaymentRequest {
  booking_id: string;
  amount: number;
  currency?: string;
  payment_method?: string;
}

export interface PaymentResponse {
  payment_id: string;
  order_reference: string;
  payment: any;
}

/**
 * Create payment record with booking ID in transaction reference
 * This ensures the webhook can find the payment when Hesabe calls it
 */
export const paymentService = {
  /**
   * Create payment record with booking ID in reference number
   * Format: MH_<booking-id>_<timestamp>
   */
  async createPaymentForBooking(request: CreatePaymentRequest): Promise<PaymentResponse> {
    const { booking_id, amount, currency = 'KWD', payment_method = 'KNET' } = request;

    // 1. Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('customer_id, influencer_id, service_id')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // 2. Generate order reference with booking ID
    // Format: MH_<booking-id>_<timestamp>
    const timestamp = Math.floor(Date.now() / 1000);
    const orderReference = `MH_${booking_id}_${timestamp}`;

    console.log('Creating payment with reference:', orderReference);

    // 3. Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: booking_id,
        payer_id: booking.customer_id,
        payee_id: booking.influencer_id,
        amount: amount,
        currency: currency,
        status: 'pending',
        transaction_reference: orderReference, // CRITICAL: Set before sending to Hesabe
        payment_method: payment_method
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    console.log('Payment created successfully:', payment.id);

    return {
      payment_id: payment.id,
      order_reference: orderReference,
      payment: payment
    };
  },

  /**
   * Get payment by booking ID
   */
  async getPaymentByBookingId(booking_id: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get payment by transaction reference
   */
  async getPaymentByReference(transaction_reference: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_reference', transaction_reference)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Complete payment flow: Create payment record and initiate Hesabe payment
   * This is the main function to use when customer wants to pay
   */
  async initiatePaymentForBooking(bookingId: string, amount: number, currency: string = 'KWD') {
    // 1. Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        influencer_id,
        service_id,
        status_id,
        status:booking_statuses(name)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // 2. Check if payment already exists
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .in('status', ['pending', 'processing', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPayment && existingPayment.status === 'completed') {
      throw new Error('Payment already completed for this booking');
    }

    // 3. Generate order reference with booking ID
    const timestamp = Math.floor(Date.now() / 1000);
    const orderReference = `MH_${bookingId}_${timestamp}`;

    // 4. Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        payer_id: booking.customer_id,
        payee_id: booking.influencer_id,
        amount: amount,
        currency: currency,
        status: 'pending',
        transaction_reference: orderReference,
        payment_method: 'KNET'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    // 5. Update booking status to "awaiting payment" if needed
    const { data: awaitingPaymentStatus } = await supabase
      .from('booking_statuses')
      .select('id')
      .eq('name', 'awaiting payment')
      .maybeSingle();

    if (awaitingPaymentStatus && booking.status_id !== awaitingPaymentStatus.id) {
      const paymentDeadline = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(); // 12 hours
      await supabase
        .from('bookings')
        .update({ 
          status_id: awaitingPaymentStatus.id,
          payment_deadline: paymentDeadline
        })
        .eq('id', bookingId);
    }

    return {
      payment_id: payment.id,
      order_reference: orderReference,
      payment: payment
    };
  }
};

