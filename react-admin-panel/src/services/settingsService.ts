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

/** Fields the admin Settings form may send alongside automation timing. */
export type PlatformSettingsUpdate = Partial<
  AutomationTimingSettings & Pick<PlatformSettings, 'commission_percentage' | 'platform_commission_fixed'>
>;

export const settingsService = {
  // Get app settings (key-value pairs)
  async getAppSettings(): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value');

    if (error) {
      console.error('Error fetching app_settings:', error);
      return {};
    }

    const settings: Record<string, string> = {};
    data?.forEach((item: { key: string; value: string }) => {
      settings[item.key] = item.value;
    });

    return settings;
  },

  // Update app setting
  async updateAppSetting(key: string, value: string): Promise<void> {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    if (error) throw error;
  },

  /** Dual / shared platform commission: App Settings key first, then platform_settings (same value as Settings form). */
  async getDualPlatformCommissionPercentage(): Promise<number> {
    const [platform, app] = await Promise.all([this.getSettings(), this.getAppSettings()]);
    const fromApp = parseFloat(app.dual_platform_commission_percentage || '');
    if (Number.isFinite(fromApp) && fromApp >= 0 && fromApp <= 100) {
      return fromApp;
    }
    return platform?.commission_percentage ?? 5;
  },

  // Get platform settings
  async getSettings(): Promise<PlatformSettings | null> {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    return data && data.length > 0 ? (data[0] as PlatformSettings) : null;
  },

  // Update platform settings
  async updateSettings(settings: PlatformSettingsUpdate): Promise<PlatformSettings> {
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


