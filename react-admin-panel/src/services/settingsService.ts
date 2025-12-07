import { supabase } from './supabaseClient';

export interface AutomationTimingSettings {
  influencer_approval_hours: number;
  payment_deadline_hours: number;
  script_submission_base_hours: number;
  influencer_response_minutes: number;
  auto_approval_hour: number;
  auto_approval_minute: number;
  appointment_end_hour: number;
  appointment_end_minute: number;
}

export interface PlatformSettings {
  id: string;
  commission_percentage: number;
  platform_commission_fixed?: number;
  influencer_approval_hours?: number;
  payment_deadline_hours?: number;
  script_submission_base_hours?: number;
  influencer_response_minutes?: number;
  auto_approval_hour?: number;
  auto_approval_minute?: number;
  appointment_end_hour?: number;
  appointment_end_minute?: number;
  updated_by?: string;
  updated_at: string;
}

export const settingsService = {
  // Get platform settings
  async getSettings(): Promise<PlatformSettings | null> {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, return null
        return null;
      }
      throw error;
    }

    return data as PlatformSettings;
  },

  // Update platform settings
  async updateSettings(settings: Partial<AutomationTimingSettings & { commission_percentage?: number; platform_commission_fixed?: number }>): Promise<PlatformSettings> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Get existing settings or create new
    const existing = await this.getSettings();
    
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('platform_settings')
        .update({
          ...settings,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as PlatformSettings;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('platform_settings')
        .insert({
          commission_percentage: settings.commission_percentage || 0,
          platform_commission_fixed: settings.platform_commission_fixed || 0,
          influencer_approval_hours: settings.influencer_approval_hours || 12,
          payment_deadline_hours: settings.payment_deadline_hours || 12,
          script_submission_base_hours: settings.script_submission_base_hours || 8,
          influencer_response_minutes: settings.influencer_response_minutes || 30,
          auto_approval_hour: settings.auto_approval_hour || 22,
          auto_approval_minute: settings.auto_approval_minute || 30,
          appointment_end_hour: settings.appointment_end_hour || 23,
          appointment_end_minute: settings.appointment_end_minute || 59,
          updated_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data as PlatformSettings;
    }
  }
};


