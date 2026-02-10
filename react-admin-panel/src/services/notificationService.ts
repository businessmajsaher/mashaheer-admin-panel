import { supabase } from './supabaseClient';

export interface SendNotificationRequest {
  user_id: string;
  booking_id: string;
  notification_type: 'status_change' | 'auto_reject' | 'auto_cancel' | 'auto_refund' | 'auto_approve' | 'script_rejected' | 'payment_required' | 'script_approved';
  status_name: string;
  message: string;
  booking_details?: {
    service_title?: string;
    scheduled_time?: string;
    influencer_name?: string;
    customer_name?: string;
  };
}

export const notificationService = {
  // Send booking notification (email + FCM + DB record)
  async sendBookingNotification(request: SendNotificationRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/send-booking-notification`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send notification');
      }

      const result = await response.json();
      return { success: result.success || false };
    } catch (error: any) {
      console.error('Notification error:', error);
      return { success: false, error: error.message || 'Failed to send notification' };
    }
  },

  // Send account notification (email + FCM + DB record)
  async sendAccountNotification(request: {
    user_id: string;
    notification_type: 'verification_approved' | 'verification_rejected' | 'account_update';
    message: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/send-account-notification`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send notification');
      }

      const result = await response.json();
      return { success: result.success || false };
    } catch (error: any) {
      console.error('Account notification error:', error);
      return { success: false, error: error.message || 'Failed to send account notification' };
    }
  }
};


