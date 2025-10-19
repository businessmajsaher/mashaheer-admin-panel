import { supabase } from './supabaseClient';

export interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  upsert?: boolean;
}

export interface StorageError {
  message: string;
  statusCode?: number;
  error?: any;
}

/**
 * Storage service for handling file uploads with proper authentication
 */
export class StorageService {
  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(options: UploadOptions): Promise<string> {
    const { bucket, path, file, upsert = true } = options;
    
    try {
      console.log(`📤 Uploading file to ${bucket}/${path}`);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated to upload files');
      }
      
      console.log(`👤 Uploading as user: ${user.email}`);
      
      // Upload the file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { 
          upsert,
          cacheControl: '3600',
          contentType: file.type
        });
      
      if (error) {
        console.error(`❌ Upload error for ${bucket}/${path}:`, error);
        throw new Error(`Upload failed: ${error.message}`);
      }
      
      console.log(`✅ File uploaded successfully:`, data);
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      
      if (!publicUrlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }
      
      console.log(`🔗 Public URL: ${publicUrlData.publicUrl}`);
      return publicUrlData.publicUrl;
      
    } catch (error: any) {
      console.error(`❌ StorageService upload error:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a file from Supabase Storage
   */
  static async deleteFile(bucket: string, path: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting file from ${bucket}/${path}`);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated to delete files');
      }
      
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
      
      if (error) {
        console.error(`❌ Delete error for ${bucket}/${path}:`, error);
        throw new Error(`Delete failed: ${error.message}`);
      }
      
      console.log(`✅ File deleted successfully: ${path}`);
      
    } catch (error: any) {
      console.error(`❌ StorageService delete error:`, error);
      throw error;
    }
  }
  
  /**
   * Get public URL for a file
   */
  static getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }
  
  /**
   * List files in a bucket (with authentication)
   */
  static async listFiles(bucket: string, path?: string): Promise<any[]> {
    try {
      console.log(`📋 Listing files in ${bucket}${path ? `/${path}` : ''}`);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated to list files');
      }
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path);
      
      if (error) {
        console.error(`❌ List error for ${bucket}:`, error);
        throw new Error(`List failed: ${error.message}`);
      }
      
      console.log(`✅ Files listed successfully:`, data);
      return data || [];
      
    } catch (error: any) {
      console.error(`❌ StorageService list error:`, error);
      throw error;
    }
  }
}

/**
 * Helper function for uploading influencer profile images
 */
export async function uploadInfluencerProfileImage(file: File, influencerId?: string): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name}`;
  const path = `influencers/profile/${fileName}`;
  
  return StorageService.uploadFile({
    bucket: 'influencer-profile',
    path,
    file,
    upsert: true
  });
}

/**
 * Helper function for uploading platform icons
 */
export async function uploadPlatformIcon(file: File): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name}`;
  const path = `platform-icons/${fileName}`;
  
  return StorageService.uploadFile({
    bucket: 'platforms',
    path,
    file,
    upsert: true
  });
}

/**
 * Helper function for uploading service thumbnails
 */
export async function uploadServiceThumbnail(file: File, serviceId?: string): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name}`;
  const path = `services/thumbnails/${fileName}`;
  
  return StorageService.uploadFile({
    bucket: 'service-thumbnails',
    path,
    file,
    upsert: true
  });
}

/**
 * Helper function for uploading category thumbnails
 */
export async function uploadCategoryThumbnail(file: File, categoryId?: string): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name}`;
  const path = `categories/thumbnails/${fileName}`;
  
  return StorageService.uploadFile({
    bucket: 'category-thumbnails',
    path,
    file,
    upsert: true
  });
}
