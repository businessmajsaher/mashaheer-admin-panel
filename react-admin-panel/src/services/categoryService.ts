import { supabase } from './supabaseClient';
import { ServiceCategory, CreateCategoryData, UpdateCategoryData } from '../types/category';

export const categoryService = {
  // Get all categories with pagination and search
  async getCategories(page: number = 1, limit: number = 10, search?: string) {
    let query = supabase
      .from('service_categories')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: data as ServiceCategory[],
      total: count || 0,
      page,
      limit
    };
  },

  // Get single category by ID
  async getCategory(id: string) {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as ServiceCategory;
  },

  // Create new category
  async createCategory(categoryData: CreateCategoryData) {
    let thumbnailUrl = null;

    // Upload thumbnail if provided
    if (categoryData.thumbnail) {
      const fileName = `categories/${Date.now()}-${categoryData.thumbnail.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, categoryData.thumbnail);

      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(fileName);
      
      thumbnailUrl = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('service_categories')
      .insert({
        name: categoryData.name,
        description: categoryData.description,
        thumb: thumbnailUrl,
        icon: categoryData.icon
      })
      .select()
      .single();

    if (error) throw error;
    return data as ServiceCategory;
  },

  // Update category
  async updateCategory(id: string, categoryData: UpdateCategoryData) {
    let thumbnailUrl = null;

    // Upload new thumbnail if provided
    if (categoryData.thumbnail) {
      const fileName = `categories/${Date.now()}-${categoryData.thumbnail.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, categoryData.thumbnail);

      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(fileName);
      
      thumbnailUrl = urlData.publicUrl;
    }

    const updateData: any = {};
    if (categoryData.name !== undefined) updateData.name = categoryData.name;
    if (categoryData.description !== undefined) updateData.description = categoryData.description;
    if (categoryData.icon !== undefined) updateData.icon = categoryData.icon;
    if (thumbnailUrl) updateData.thumb = thumbnailUrl;

    const { data, error } = await supabase
      .from('service_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ServiceCategory;
  },

  // Delete category
  async deleteCategory(id: string) {
    const { error } = await supabase
      .from('service_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
}; 