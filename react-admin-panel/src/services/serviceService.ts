import { supabase } from './supabaseClient';
import { Service, CreateServiceData, UpdateServiceData, ServiceFilters } from '../types/service';

export const serviceService = {
  // Get all services with filters and pagination
  async getServices(page: number = 1, limit: number = 10, filters?: ServiceFilters) {
    let query = supabase
      .from('services')
      .select(`
        *,
        category:service_categories(name),
        primary_influencer:profiles!primary_influencer_id(name, email),
        invited_influencer:profiles!invited_influencer_id(name, email),
        platform:social_media_platforms(name)
      `, { count: 'exact' });

    // Apply filters
    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters?.service_type) {
      query = query.eq('service_type', filters.service_type);
    }
    if (filters?.influencer_id) {
      query = query.eq('primary_influencer_id', filters.influencer_id);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: data as Service[],
      total: count || 0,
      page,
      limit
    };
  },

  // Get single service by ID
  async getService(id: string) {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        category:service_categories(name),
        primary_influencer:profiles!primary_influencer_id(name, email),
        invited_influencer:profiles!invited_influencer_id(name, email),
        platform:social_media_platforms(name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Service;
  },

  // Create new service
  async createService(serviceData: CreateServiceData, isFromAdmin: boolean = false) {
    let thumbnailUrl = null;

    // Upload thumbnail if provided
    if (serviceData.thumbnail) {
      const fileName = `services/${Date.now()}-${serviceData.thumbnail.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, serviceData.thumbnail);

      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(fileName);
      
      thumbnailUrl = urlData.publicUrl;
    }

    // Create service
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .insert({
        title: serviceData.title,
        description: serviceData.description,
        thumbnail: thumbnailUrl,
        min_duration_days: serviceData.min_duration_days,
        is_flash_deal: serviceData.is_flash_deal,
        flash_from: serviceData.flash_from,
        flash_to: serviceData.flash_to,
        location_required: serviceData.location_required,
        about_us: serviceData.about_us,
        service_type: serviceData.service_type,
        primary_influencer_id: serviceData.influencer_id,
        invited_influencer_id: serviceData.duo_influencer_id,
        category_id: serviceData.category_id,
        platform_id: serviceData.platform_id
      })
      .select()
      .single();

    if (serviceError) throw serviceError;

    return service as Service;
  },

  // Update service
  async updateService(id: string, serviceData: UpdateServiceData) {
    let thumbnailUrl = null;

    // Upload new thumbnail if provided
    if (serviceData.thumbnail) {
      const fileName = `services/${Date.now()}-${serviceData.thumbnail.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, serviceData.thumbnail);

      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(fileName);
      
      thumbnailUrl = urlData.publicUrl;
    }

    const updateData: any = {};
    if (serviceData.title !== undefined) updateData.title = serviceData.title;
    if (serviceData.description !== undefined) updateData.description = serviceData.description;
    if (serviceData.min_duration_days !== undefined) updateData.min_duration_days = serviceData.min_duration_days;
    if (serviceData.is_flash_deal !== undefined) updateData.is_flash_deal = serviceData.is_flash_deal;
    if (serviceData.flash_from !== undefined) updateData.flash_from = serviceData.flash_from;
    if (serviceData.flash_to !== undefined) updateData.flash_to = serviceData.flash_to;
    if (serviceData.location_required !== undefined) updateData.location_required = serviceData.location_required;
    if (serviceData.about_us !== undefined) updateData.about_us = serviceData.about_us;
    if (serviceData.service_type !== undefined) updateData.service_type = serviceData.service_type;
    if (serviceData.influencer_id !== undefined) updateData.primary_influencer_id = serviceData.influencer_id;
    if (serviceData.duo_influencer_id !== undefined) updateData.invited_influencer_id = serviceData.duo_influencer_id;
    if (serviceData.category_id !== undefined) updateData.category_id = serviceData.category_id;
    if (serviceData.platform_id !== undefined) updateData.platform_id = serviceData.platform_id;
    if (thumbnailUrl) updateData.thumbnail = thumbnailUrl;

    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Service;
  },

  // Delete service
  async deleteService(id: string) {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // Disable expired flash deals
  async disableExpiredFlashDeals() {
    const { error } = await supabase
      .from('services')
      .update({ is_flash_deal: false })
      .eq('is_flash_deal', true)
      .lt('flash_to', new Date().toISOString());

    if (error) throw error;
    return true;
  }
}; 