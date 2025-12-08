import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Table, Button, Typography, Modal, Form, Input, Alert, Spin, message, Checkbox, Select, Space, Upload, Drawer, Image, Popconfirm, Steps, Row, Col, Card as AntCard, Divider, Switch, InputNumber, Progress, Tag } from 'antd';
import { UserAddOutlined, UploadOutlined, VideoCameraOutlined, PictureOutlined, DeleteOutlined, PlusOutlined, DollarOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';
import { uploadInfluencerProfileImage } from '@/services/storageService';
import { generateRandomPassword, sendWelcomeEmail } from '@/services/emailService';
import Cropper from 'react-easy-crop';
import { Modal as AntdModal, Slider } from 'antd';

export default function Influencers() {
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [influencerCreated, setInfluencerCreated] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<any>(null);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailMedia, setDetailMedia] = useState<any[]>([]);
  const [detailSocial, setDetailSocial] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commissionsModalOpen, setCommissionsModalOpen] = useState(false);
  const [commissionsLoading, setCommissionsLoading] = useState(false);
  const [commissionsData, setCommissionsData] = useState<any[]>([]);

  // Handler for profile image upload
  const handleProfileImageUpload = async (file: File) => {
    console.log('🚀 handleProfileImageUpload called with file:', file.name, file.size, file.type);
    setProfileImageUploading(true);
    setUploadProgress(0);
    
    try {
      console.log('📤 Starting profile image upload...');
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
      
      // Use the storage service for authenticated upload
      const url = await uploadInfluencerProfileImage(file);
      
      // Complete the progress
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (url) {
        form.setFieldsValue({ profile_image_url: url });
        // Update preview with the uploaded URL (replaces the local blob URL)
        setProfileImagePreview(url);
        console.log('✅ Profile image uploaded successfully:', url);
        
        // Show success message
        message.success('Profile image uploaded successfully!');
        // Reset the file input after successful upload
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error('No URL returned from upload');
      }
    } catch (err: any) {
      console.error('❌ Upload error:', err);
      
      // Show specific error messages based on error type
      let errorMessage = 'Failed to upload profile image';
      if (err.message?.includes('StorageApiError')) {
        errorMessage = 'Storage error: Please check your permissions';
      } else if (err.message?.includes('network')) {
        errorMessage = 'Network error: Please check your connection';
      } else if (err.message?.includes('size')) {
        errorMessage = 'File too large: Please choose a smaller image';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      message.error(errorMessage);
      
      // Clear the preview if upload fails
      setProfileImagePreview(null);
      form.setFieldsValue({ profile_image_url: null });
    } finally {
      setProfileImageUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          message.error('File size must be less than 5MB');
          return;
        }
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
          message.error('Please select a valid image file (JPG, PNG, GIF)');
          return;
        }
        
        // Show immediate preview
        const previewUrl = URL.createObjectURL(file);
        setProfileImagePreview(previewUrl);
        console.log('📁 Drag & drop: About to call handleProfileImageUpload');
        // Then upload the file
        handleProfileImageUpload(file);
      } else {
        message.error('Please drop a valid image file');
      }
    }
  };

  // Countries list with currency codes
  const countries = [
    { value: 'US', label: 'United States', currency: 'USD' },
    { value: 'CA', label: 'Canada', currency: 'CAD' },
    { value: 'GB', label: 'United Kingdom', currency: 'GBP' },
    { value: 'AU', label: 'Australia', currency: 'AUD' },
    { value: 'DE', label: 'Germany', currency: 'EUR' },
    { value: 'FR', label: 'France', currency: 'EUR' },
    { value: 'IT', label: 'Italy', currency: 'EUR' },
    { value: 'ES', label: 'Spain', currency: 'EUR' },
    { value: 'NL', label: 'Netherlands', currency: 'EUR' },
    { value: 'BE', label: 'Belgium', currency: 'EUR' },
    { value: 'CH', label: 'Switzerland', currency: 'CHF' },
    { value: 'AT', label: 'Austria', currency: 'EUR' },
    { value: 'SE', label: 'Sweden', currency: 'SEK' },
    { value: 'NO', label: 'Norway', currency: 'NOK' },
    { value: 'DK', label: 'Denmark', currency: 'DKK' },
    { value: 'FI', label: 'Finland', currency: 'EUR' },
    { value: 'IE', label: 'Ireland', currency: 'EUR' },
    { value: 'NZ', label: 'New Zealand', currency: 'NZD' },
    { value: 'JP', label: 'Japan', currency: 'JPY' },
    { value: 'KR', label: 'South Korea', currency: 'KRW' },
    { value: 'SG', label: 'Singapore', currency: 'SGD' },
    { value: 'HK', label: 'Hong Kong', currency: 'HKD' },
    { value: 'AE', label: 'United Arab Emirates', currency: 'AED' },
    { value: 'BH', label: 'Bahrain', currency: 'BHD' },
    { value: 'KW', label: 'Kuwait', currency: 'KWD' },
    { value: 'OM', label: 'Oman', currency: 'OMR' },
    { value: 'QA', label: 'Qatar', currency: 'QAR' },
    { value: 'SA', label: 'Saudi Arabia', currency: 'SAR' },
    { value: 'IN', label: 'India', currency: 'INR' },
    { value: 'BR', label: 'Brazil', currency: 'BRL' },
    { value: 'MX', label: 'Mexico', currency: 'MXN' },
    { value: 'AR', label: 'Argentina', currency: 'ARS' },
    { value: 'CL', label: 'Chile', currency: 'CLP' },
    { value: 'CO', label: 'Colombia', currency: 'COP' },
    { value: 'PE', label: 'Peru', currency: 'PEN' },
    { value: 'ZA', label: 'South Africa', currency: 'ZAR' },
    { value: 'EG', label: 'Egypt', currency: 'EGP' },
    { value: 'NG', label: 'Nigeria', currency: 'NGN' },
    { value: 'KE', label: 'Kenya', currency: 'KES' },
    { value: 'MA', label: 'Morocco', currency: 'MAD' },
    { value: 'TH', label: 'Thailand', currency: 'THB' },
    { value: 'VN', label: 'Vietnam', currency: 'VND' },
    { value: 'PH', label: 'Philippines', currency: 'PHP' },
    { value: 'MY', label: 'Malaysia', currency: 'MYR' },
    { value: 'ID', label: 'Indonesia', currency: 'IDR' },
    { value: 'TR', label: 'Turkey', currency: 'TRY' },
    { value: 'IL', label: 'Israel', currency: 'ILS' },
    { value: 'PL', label: 'Poland', currency: 'PLN' },
    { value: 'CZ', label: 'Czech Republic', currency: 'CZK' },
    { value: 'HU', label: 'Hungary', currency: 'HUF' },
    { value: 'RO', label: 'Romania', currency: 'RON' },
    { value: 'BG', label: 'Bulgaria', currency: 'BGN' },
    { value: 'HR', label: 'Croatia', currency: 'EUR' },
    { value: 'SI', label: 'Slovenia', currency: 'EUR' },
    { value: 'SK', label: 'Slovakia', currency: 'EUR' },
    { value: 'LT', label: 'Lithuania', currency: 'EUR' },
    { value: 'LV', label: 'Latvia', currency: 'EUR' },
    { value: 'EE', label: 'Estonia', currency: 'EUR' },
    { value: 'RU', label: 'Russia', currency: 'RUB' },
    { value: 'UA', label: 'Ukraine', currency: 'UAH' },
    { value: 'BY', label: 'Belarus', currency: 'BYN' },
    { value: 'KZ', label: 'Kazakhstan', currency: 'KZT' },
    { value: 'UZ', label: 'Uzbekistan', currency: 'UZS' },
    { value: 'KG', label: 'Kyrgyzstan', currency: 'KGS' },
    { value: 'TJ', label: 'Tajikistan', currency: 'TJS' },
    { value: 'TM', label: 'Turkmenistan', currency: 'TMT' },
    { value: 'AZ', label: 'Azerbaijan', currency: 'AZN' },
    { value: 'GE', label: 'Georgia', currency: 'GEL' },
    { value: 'AM', label: 'Armenia', currency: 'AMD' },
    { value: 'MD', label: 'Moldova', currency: 'MDL' },
    { value: 'AL', label: 'Albania', currency: 'ALL' },
    { value: 'MK', label: 'North Macedonia', currency: 'MKD' },
    { value: 'ME', label: 'Montenegro', currency: 'EUR' },
    { value: 'RS', label: 'Serbia', currency: 'RSD' },
    { value: 'BA', label: 'Bosnia and Herzegovina', currency: 'BAM' },
    { value: 'XK', label: 'Kosovo', currency: 'EUR' },
    { value: 'GR', label: 'Greece', currency: 'EUR' },
    { value: 'CY', label: 'Cyprus', currency: 'EUR' },
    { value: 'MT', label: 'Malta', currency: 'EUR' },
    { value: 'PT', label: 'Portugal', currency: 'EUR' },
    { value: 'LU', label: 'Luxembourg', currency: 'EUR' },
    { value: 'IS', label: 'Iceland', currency: 'ISK' },
    { value: 'OTHER', label: 'Other', currency: 'USD' }
  ];

  // Fetch influencers from Supabase
  const fetchInfluencers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, bio, country, profile_image_url, is_verified, commission_percentage, created_at')
      .eq('role', 'influencer')
      .order('created_at', { ascending: false });
    if (error) message.error(error.message);
    setInfluencers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInfluencers();
  }, [drawerOpen, fetchInfluencers]); // refresh after modal closes

  // Fetch social media platforms for dropdown
  useEffect(() => {
    async function fetchPlatforms() {
      console.log('Fetching social media platforms...');
      const { data, error } = await supabase.from('social_media_platforms').select('id, name');
      if (error) {
        console.error('Error fetching platforms:', error);
      } else {
        console.log('Platforms fetched:', data);
        setPlatforms(data || []);
      }
    }
    fetchPlatforms();
  }, []);

  useEffect(() => {
    async function logCurrentUserRole() {
      const { data: userData } = await supabase.auth.getUser();
      console.log('Current Supabase user:', userData?.user);
      if (userData?.user) {
        console.log('User role:', userData.user.user_metadata?.role || 'unknown');
      }
    }
    logCurrentUserRole();
  }, []);

  // Handle step navigation
  const handleNextStep = async () => {
    try {
      // Validate current step fields
      const currentStepFields = getStepFields(currentStep);
      await form.validateFields(currentStepFields);
      
      // Move to next step
      next();
    } catch (validationError: any) {
      console.error('Step validation failed:', validationError);
      message.error('Please complete all required fields before proceeding to the next step.');
    }
  };

  // Get fields for current step validation
  const getStepFields = (step: number) => {
    switch (step) {
      case 0: // Basic Info
        return ['email', 'name', 'country'];
      case 1: // Social Media
        return ['social_links'];
      case 2: // Additional Media
        return []; // No required fields for media step
      default:
        return [];
    }
  };

  // Add/Update Influencer handler
  const handleAddInfluencer = async () => {
    console.log('🚀 handleAddInfluencer FUNCTION CALLED!');
    console.log('=== FINAL FORM SUBMISSION ===');
    console.log('Processing final submission on step:', currentStep);
    console.log('Media files to upload:', mediaFiles.length);
    
    // Get form values manually since we're not using onFinish
    const values = form.getFieldsValue();
    console.log('Form values retrieved:', values);
    console.log('Verification status in form values:', values.is_verified, 'Type:', typeof values.is_verified);
    
    // Check if form is valid
    try {
      await form.validateFields();
      console.log('6. Form validation passed');
    } catch (validationError: any) {
      console.error('6. Form validation failed:', validationError);
      console.error('Validation error details:', validationError.errorFields);
      setFormError('Form validation failed. Please check all required fields.');
      setFormLoading(false);
      return;
    }
    
    // Check if email already exists (only for new influencers)
    if (!editingInfluencer) {
      console.log('6a. Checking if email already exists...');
      try {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', values.email)
          .single();
        
        if (existingUser && !checkError) {
          console.log('6b. Email already exists:', existingUser);
          setFormError(`An influencer with email "${values.email}" already exists. Please use a different email address or edit the existing influencer.`);
          setFormLoading(false);
          return;
        }
        console.log('6c. Email is available for new influencer');
      } catch (checkErr: any) {
        // If it's a "not found" error, that's good - email is available
        if (checkErr.code === 'PGRST116') {
          console.log('6d. Email is available (no existing user found)');
        } else {
          console.error('6e. Error checking email availability:', checkErr);
          // Continue anyway - let the Edge Function handle it
        }
      }
    }
    
    // Get current form values again after validation
    const currentFormValues = form.getFieldsValue();
    console.log('7. Current form values after validation:', currentFormValues);
    console.log('8. Current form values keys:', Object.keys(currentFormValues));
    
    // Generate random password for the influencer (only for new influencers)
    let randomPassword = null;
    if (!editingInfluencer) {
      randomPassword = generateRandomPassword(12);
      console.log('🔐 Generated random password for influencer:', randomPassword);
    }
    
    setFormLoading(true);
    setFormError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      console.log('9. JWT access token used for Edge Function:', token);
      
      let influencerId: string;
      
      if (editingInfluencer) {
        // Update existing influencer - handle media files too
        console.log('13. Updating existing influencer with media files');
        
        try {
          // Update profile first
          const profileUpdateData = {
            name: values.name,
            bio: values.bio || null,
            country: values.country,
            is_verified: values.is_verified || false,
            profile_image_url: values.profile_image_url || null,
            commission_percentage: values.commission_percentage !== undefined && values.commission_percentage !== null ? Number(values.commission_percentage) : 0
          };
          
          console.log('13a. Profile update data:', profileUpdateData);
          console.log('13b. Profile image URL value:', values.profile_image_url);
          console.log('13c. Social links value:', values.social_links);
          console.log('13d. Verification status value:', values.is_verified, 'Type:', typeof values.is_verified);
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update(profileUpdateData)
            .eq('id', editingInfluencer.id);
          
          if (updateError) {
            console.error('Error updating profile:', updateError);
            throw new Error(`Failed to update influencer: ${updateError.message}`);
          }
          
          console.log('14. Profile updated successfully');
          
          // Verify the profile update
          const { data: verifyProfile, error: verifyError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', editingInfluencer.id)
            .single();
          
          if (verifyError) {
            console.error('Profile verification error:', verifyError);
          } else {
            console.log('14a. Profile verification after update:', verifyProfile);
            console.log('14b. Updated profile image URL:', verifyProfile.profile_image_url);
            console.log('14c. Updated verification status:', verifyProfile.is_verified);
          }
          
          influencerId = editingInfluencer.id;
          
          // Update social links for existing influencer
          if (values.social_links && values.social_links.length > 0) {
            console.log('14a. Updating social links for existing influencer...');
            console.log('14b. Social links to update:', values.social_links);
            console.log('14c. Social links structure check:', values.social_links.map((link: any) => ({
              platform_id: link.platform_id,
              handle: link.handle,
              profile_url: link.profile_url,
              url: link.url // Check if this exists
            })));
            
            try {
              // First, delete existing social links
              const { error: deleteError } = await supabase
                .from('social_links')
                .delete()
                .eq('user_id', influencerId);
              
              if (deleteError) {
                console.error('14c. Error deleting existing social links:', deleteError);
                throw new Error(`Failed to delete existing social links: ${deleteError.message}`);
              }
              
              console.log('14d. Existing social links deleted successfully');
              
              // Then, insert new social links
              const socialLinksData = values.social_links.map((link: any) => ({
                user_id: influencerId,
                platform_id: link.platform_id,
                handle: link.handle,
                profile_url: link.profile_url,
                created_at: new Date().toISOString()
              }));
              
              const { data: insertedSocialLinks, error: socialError } = await supabase
                .from('social_links')
                .insert(socialLinksData)
                .select();
              
              if (socialError) {
                console.error('14e. Error inserting social links:', socialError);
                throw new Error(`Failed to insert social links: ${socialError.message}`);
              }
              
              console.log('14f. Social links updated successfully:', insertedSocialLinks);
              
            } catch (socialError: any) {
              console.error('Social links update error:', socialError);
              throw new Error(`Failed to update social links: ${socialError.message}`);
            }
          } else {
            console.log('14a. No social links to update for existing influencer');
          }
          
          // Handle media files for existing influencer
          if (mediaFiles.length > 0) {
            console.log('15. Processing media files for existing influencer...');
            console.log('15a. Media files to process:', mediaFiles);
            
            // Filter out existing media files (they don't have actual File objects)
            const newMediaFiles = mediaFiles.filter(mediaFile => mediaFile.file !== null);
            console.log('15b. New media files to upload:', newMediaFiles);
            
            if (newMediaFiles.length > 0) {
              // Test storage bucket access
              try {
                const { data: bucketTest, error: bucketError } = await supabase.storage
                  .from('influencer-media')
                  .list('', { limit: 1 });
                
                if (bucketError) {
                  console.error('15c. Storage bucket test failed:', bucketError);
                  throw new Error(`Storage bucket not accessible: ${bucketError.message}`);
                }
                
                console.log('15d. Storage bucket test successful');
              } catch (bucketTestError) {
                console.error('15e. Storage bucket test error:', bucketTestError);
                throw bucketTestError;
              }
              
              try {
                const uploadPromises = newMediaFiles.map(async (mediaFile, index) => {
                  console.log(`15f. Processing new media file ${index + 1}:`, mediaFile);
                  const file = mediaFile.file;
                  
                  if (!file) {
                    console.warn(`15g. Skipping media file ${index + 1} - no file object`);
                    return null;
                  }
                  
                  // Validate file before upload
                  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                  const allowedVideoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
                  const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
                  
                  if (!allAllowedTypes.includes(file.type)) {
                    const errorMsg = `File ${file.name} has invalid type: ${file.type || 'unknown'}`;
                    console.error(`15g1. ${errorMsg}`);
                    throw new Error(errorMsg);
                  }
                  
                  const maxImageSize = 10 * 1024 * 1024; // 10MB
                  const maxVideoSize = 100 * 1024 * 1024; // 100MB
                  const maxSize = file.type.startsWith('image/') ? maxImageSize : maxVideoSize;
                  
                  if (file.size > maxSize) {
                    const errorMsg = `File ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds size limit (${(maxSize / (1024 * 1024)).toFixed(0)}MB)`;
                    console.error(`15g2. ${errorMsg}`);
                    throw new Error(errorMsg);
                  }
                  
                  if (file.size === 0) {
                    const errorMsg = `File ${file.name} appears to be empty or corrupted`;
                    console.error(`15g3. ${errorMsg}`);
                    throw new Error(errorMsg);
                  }
                  
                  const filePath = `influencer-media/${Date.now()}-${file.name}`;
                  
                  console.log(`15h. Uploading file ${index + 1} to path:`, filePath);
                  
                  // Upload to storage with better error handling
                  let uploadError;
                  try {
                    const uploadResult = await supabase.storage
                      .from('influencer-media')
                      .upload(filePath, file, { upsert: true });
                    uploadError = uploadResult.error;
                  } catch (storageError: any) {
                    console.error(`15h1. Storage upload exception for file ${index + 1}:`, storageError);
                    throw new Error(`Storage upload failed: ${storageError.message || 'Unknown error'}`);
                  }
                  
                  if (uploadError) {
                    console.error(`15i. Upload error for file ${index + 1}:`, uploadError);
                    
                    // Provide specific error messages
                    let errorMessage = `Failed to upload ${file.name}`;
                    if (uploadError.message?.includes('duplicate') || uploadError.message?.includes('already exists')) {
                      errorMessage = `File ${file.name} already exists. Please rename the file.`;
                    } else if (uploadError.message?.includes('size') || uploadError.message?.includes('too large')) {
                      errorMessage = `File ${file.name} is too large. Maximum size: ${file.type.startsWith('image/') ? '10MB' : '100MB'}`;
                    } else if (uploadError.message?.includes('permission') || uploadError.message?.includes('access')) {
                      errorMessage = `Permission denied for ${file.name}. Please check storage permissions.`;
                    } else if (uploadError.message?.includes('network') || uploadError.message?.includes('timeout')) {
                      errorMessage = `Network error uploading ${file.name}. Please check your connection and try again.`;
                    } else {
                      errorMessage = `Failed to upload ${file.name}: ${uploadError.message || 'Unknown error'}`;
                    }
                    
                    throw new Error(errorMessage);
                  }
                  
                  console.log(`15j. File ${index + 1} uploaded successfully to storage`);
                  
                  // Get public URL
                  const { data: publicUrlData } = supabase.storage
                    .from('influencer-media')
                    .getPublicUrl(filePath);
                  
                  const fileUrl = publicUrlData?.publicUrl;
                  console.log(`15k. Public URL for file ${index + 1}:`, fileUrl);
                  
                  return {
                    file_url: fileUrl,
                    file_type: file.type,
                    file_name: file.name
                  };
                });
                
                const uploadResults = await Promise.all(uploadPromises);
                const uploadedMediaFiles = uploadResults.filter(result => result !== null);
                console.log('15l. Media files uploaded successfully:', uploadedMediaFiles);
                
                if (uploadedMediaFiles.length > 0) {
                  // Insert media files into database
                  console.log('15m. Inserting media files into database...');
                  const mediaData = uploadedMediaFiles.map((media) => {
                    // Determine file type based on MIME type - only use 'image' and 'video' for now
                    let fileType = 'image'; // Default to image
                    if (media!.file_type.startsWith('video/')) {
                      fileType = 'video';
                    } else if (!media!.file_type.startsWith('image/')) {
                      // For non-image, non-video files, default to image for now
                      // This can be updated once the constraint is fixed
                      fileType = 'image';
                    }
                    
                    return {
                      influencer_id: influencerId,
                      file_url: media!.file_url,
                      file_type: fileType, // Use the mapped file type
                      file_name: media!.file_name,
                      file_size: 0, // Default value since we don't have it in the uploaded media
                      mime_type: media!.file_type, // Store the original MIME type
                      created_at: new Date().toISOString()
                    };
                  });
                  
                  const { data: insertedMedia, error: mediaError } = await supabase
                    .from('influencer_media')
                    .insert(mediaData)
                    .select();
                  
                  if (mediaError) {
                    console.error('❌ Media insertion error:', mediaError);
                    console.error('❌ Error details:', JSON.stringify(mediaError, null, 2));
                    throw new Error(`Failed to save media files: ${mediaError.message}`);
                  }
                  
                  console.log('✅ Media files saved to database:', insertedMedia);
                } else {
                  console.log('15m. No new media files to insert into database');
                }
                
              } catch (uploadError: any) {
                console.error('Media upload error:', uploadError);
                throw new Error(`Failed to upload media files: ${uploadError.message}`);
              }
            } else {
              console.log('15c. No new media files to upload for existing influencer');
            }
          } else {
            console.log('15. No media files to process for existing influencer');
          }
          
        } catch (updateError: any) {
          console.error('Error updating influencer:', updateError);
          throw new Error(`Failed to update influencer: ${updateError.message}`);
        }
      } else {
        // For new influencers, create profile directly with a generated UUID
        console.log('13. Creating new influencer profile directly in database');
        
        try {
          console.log('14. Creating influencer with comprehensive Edge Function');
          
          // Upload media files first if any exist
          let uploadedMediaFiles: Array<{
            file_url: string;
            file_type: string;
            file_name: string;
          }> = [];
          if (mediaFiles.length > 0) {
            console.log('15. Uploading media files to storage...');
            console.log('15a. Media files to upload:', mediaFiles);
            
            // Test storage bucket access
            try {
              const { data: bucketTest, error: bucketError } = await supabase.storage
                .from('influencer-media')
                .list('', { limit: 1 });
              
              if (bucketError) {
                console.error('15a1. Storage bucket test failed:', bucketError);
                throw new Error(`Storage bucket not accessible: ${bucketError.message}`);
              }
              
              console.log('15a2. Storage bucket test successful');
            } catch (bucketTestError) {
              console.error('15a3. Storage bucket test error:', bucketTestError);
              throw bucketTestError;
            }
            
            try {
              const uploadPromises = mediaFiles.map(async (mediaFile, index) => {
                console.log(`15b. Processing media file ${index + 1}:`, mediaFile);
                const file = mediaFile.file;
                
                // Validate file before upload
                const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                const allowedVideoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
                const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
                
                if (!allAllowedTypes.includes(file.type)) {
                  const errorMsg = `File ${file.name} has invalid type: ${file.type || 'unknown'}`;
                  console.error(`15b1. ${errorMsg}`);
                  throw new Error(errorMsg);
                }
                
                const maxImageSize = 10 * 1024 * 1024; // 10MB
                const maxVideoSize = 100 * 1024 * 1024; // 100MB
                const maxSize = file.type.startsWith('image/') ? maxImageSize : maxVideoSize;
                
                if (file.size > maxSize) {
                  const errorMsg = `File ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds size limit (${(maxSize / (1024 * 1024)).toFixed(0)}MB)`;
                  console.error(`15b2. ${errorMsg}`);
                  throw new Error(errorMsg);
                }
                
                if (file.size === 0) {
                  const errorMsg = `File ${file.name} appears to be empty or corrupted`;
                  console.error(`15b3. ${errorMsg}`);
                  throw new Error(errorMsg);
                }
                
                const filePath = `influencer-media/${Date.now()}-${file.name}`;
                
                console.log(`15c. Uploading file ${index + 1} to path:`, filePath);
                
                // Upload to storage with better error handling
                let uploadError;
                try {
                  const uploadResult = await supabase.storage
                    .from('influencer-media')
                    .upload(filePath, file, { upsert: true });
                  uploadError = uploadResult.error;
                } catch (storageError: any) {
                  console.error(`15c1. Storage upload exception for file ${index + 1}:`, storageError);
                  throw new Error(`Storage upload failed: ${storageError.message || 'Unknown error'}`);
                }
                
                if (uploadError) {
                  console.error(`15d. Upload error for file ${index + 1}:`, uploadError);
                  
                  // Provide specific error messages
                  let errorMessage = `Failed to upload ${file.name}`;
                  if (uploadError.message?.includes('duplicate') || uploadError.message?.includes('already exists')) {
                    errorMessage = `File ${file.name} already exists. Please rename the file.`;
                  } else if (uploadError.message?.includes('size') || uploadError.message?.includes('too large')) {
                    errorMessage = `File ${file.name} is too large. Maximum size: ${file.type.startsWith('image/') ? '10MB' : '100MB'}`;
                  } else if (uploadError.message?.includes('permission') || uploadError.message?.includes('access')) {
                    errorMessage = `Permission denied for ${file.name}. Please check storage permissions.`;
                  } else if (uploadError.message?.includes('network') || uploadError.message?.includes('timeout')) {
                    errorMessage = `Network error uploading ${file.name}. Please check your connection and try again.`;
                  } else {
                    errorMessage = `Failed to upload ${file.name}: ${uploadError.message || 'Unknown error'}`;
                  }
                  
                  throw new Error(errorMessage);
                }
                
                console.log(`15e. File ${index + 1} uploaded successfully to storage`);
                
                // Get public URL
                const { data: publicUrlData } = supabase.storage
                  .from('influencer-media')
                  .getPublicUrl(filePath);
                
                const fileUrl = publicUrlData?.publicUrl;
                console.log(`15f. Public URL for file ${index + 1}:`, fileUrl);
                
                return {
                  file_url: fileUrl,
                  file_type: file.type,
                  file_name: file.name
                };
              });
              
              uploadedMediaFiles = await Promise.all(uploadPromises);
              console.log('16. Media files uploaded successfully:', uploadedMediaFiles);
            } catch (uploadError: any) {
              console.error('Media upload error:', uploadError);
              throw new Error(`Failed to upload media files: ${uploadError.message}`);
            }
          } else {
            console.log('15. No media files to upload');
          }
          
          // Prepare all data for the comprehensive Edge Function
          const influencerData = {
            email: values.email,
            password: randomPassword || 'existing_password', // Use random password for new, existing for updates
            name: values.name,
            bio: values.bio || null,
            country: values.country,
            profile_image_url: values.profile_image_url || null,
            is_verified: values.is_verified || false,
            commission_percentage: values.commission_percentage !== undefined && values.commission_percentage !== null ? Number(values.commission_percentage) : 0,
            social_links: values.social_links || [],
            media_files: uploadedMediaFiles,
            is_update: !!editingInfluencer
          };
          
          console.log('17. Sending complete data to Edge Function:', influencerData);
          
          const response = await fetch('https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer-complete', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(influencerData)
          });
          
          console.log('18. Edge Function response status:', response.status);
          
          let result;
          try {
            result = await response.json();
            console.log('19. Edge Function response:', result);
          } catch (parseError) {
            console.error('20. Failed to parse Edge Function response:', parseError);
            const textResponse = await response.text();
            console.log('21. Raw Edge Function response text:', textResponse);
            throw new Error('Invalid response from Edge Function');
          }
          
          if (!response.ok && response.status !== 201) {
            console.error('22. Edge Function error response:', result);
            
            // Handle specific error cases
            if (result.error === 'Failed to create user in authentication system' && result.details?.includes('already been registered')) {
              throw new Error(`An influencer with email "${values.email}" already exists. Please use a different email address or edit the existing influencer.`);
            } else if (result.error === 'Failed to create user in authentication system') {
              throw new Error(`Failed to create user account: ${result.details || 'Authentication system error'}`);
            } else {
              throw new Error(result.error || result.details || `HTTP ${response.status}: Failed to create influencer`);
            }
          }
          
          // Get the user ID from Edge Function response
          influencerId = result.user.id;
          console.log('23. Influencer created successfully with ID:', influencerId);
          
        } catch (error: any) {
          console.error('Error in comprehensive Edge Function:', error);
          throw new Error(`Failed to create influencer: ${error.message}`);
        }
      }
      
      if (influencerId) {
        console.log('24. Processing additional data for influencer ID:', influencerId);
        
        if (editingInfluencer) {
          console.log('25. Updating existing influencer');
          message.success('Influencer updated successfully!');
          
          // Refresh the influencers list to show updated data
          console.log('26. Refreshing influencers list after update...');
          fetchInfluencers();
        } else {
          console.log('25. Success! Influencer created');
          message.success('Influencer created successfully!');
          
          // Send welcome email to the influencer (only for new influencers)
          if (randomPassword) {
            console.log('📧 Sending welcome email to influencer...');
            console.log('📧 Email details:', {
              email: values.email,
              name: values.name,
              password: randomPassword
            });
            
            try {
              const emailResult = await sendWelcomeEmail(
                values.email, 
                values.name, 
                randomPassword
              );
              
              console.log('📧 Email result:', emailResult);
              
              if (emailResult.success) {
                message.success('📧 Welcome email sent to influencer!');
                console.log('✅ Welcome email sent successfully');
              } else {
                message.warning('⚠️ Influencer created but email failed to send. Please contact them manually.');
                console.error('❌ Email sending failed:', emailResult.error);
              }
            } catch (emailError: any) {
              console.error('❌ Email sending error:', emailError);
              message.warning('⚠️ Influencer created but email failed to send. Please contact them manually.');
            }
            
            // Show password info to admin
            message.info(`🔑 Influencer password: ${randomPassword} - Please share this with the influencer`);
          } else {
            console.log('📧 No random password generated, skipping welcome email');
          }
          
          // Refresh the influencers list to show the newly created one
          console.log('26. Refreshing influencers list...');
          fetchInfluencers();
        }
        
        // Social links and media files are handled by the Edge Function
        console.log('27. Social links and media files processed by Edge Function');
        

        
        // Show success message and keep form open
        if (editingInfluencer) {
          message.success('Influencer updated successfully! You can continue editing or close the form.');
        } else {
          message.success('Influencer profile created successfully! You can now add more details or close the form.');
          // Show additional guidance for new influencers
          message.info('💡 Tip: You can now add media files in the "Additional Media" step, or click "Close Form" when done.');
        }
        
        // Set a flag to indicate the influencer was created/updated
        setFormLoading(false);
        
        // Only set influencerCreated to true if we're editing an existing one
        if (editingInfluencer) {
          setInfluencerCreated(true);
        }
        
        // Close the form and reset after successful creation/update
        setDrawerOpen(false);
        form.resetFields();
        setMediaFiles([]);
        setCurrentStep(0);
        setProfileImagePreview(null);
        setEditingInfluencer(null);
        setInfluencerCreated(false);
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        console.error('28. No influencer ID available');
        throw new Error('Failed to create or update influencer');
      }
    } catch (err: any) {
      console.error('29. Add Influencer error:', err, JSON.stringify(err, null, 2));
      setFormError(
        (err && (err.message || err.error_description || err.error)) ||
        JSON.stringify(err) ||
        'Failed to create influencer'
      );
    } finally {
      setFormLoading(false);
    }
  };

  // Helper function to upload media files
  const uploadMediaFiles = async (userId: string, mediaFiles: any[]) => {
    try {
      console.log('📁 Starting media file upload for user:', userId);
      console.log('📁 Number of files to upload:', mediaFiles.length);
      
      const uploadPromises = mediaFiles.map(async (mediaFile, index) => {
        console.log(`📁 Processing file ${index + 1}:`, mediaFile);
        const file = mediaFile.file;
        const filePath = `influencer-media/${userId}/${Date.now()}-${file.name}`;
        
        console.log(`📁 Uploading file ${index + 1} to storage path:`, filePath);
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('influencer-media')
          .upload(filePath, file, { upsert: true });
        
        if (uploadError) {
          console.error(`📁 Storage upload error for file ${index + 1}:`, uploadError);
          throw uploadError;
        }
        
        console.log(`📁 File ${index + 1} uploaded to storage successfully`);
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('influencer-media')
          .getPublicUrl(filePath);
        
        const fileUrl = publicUrlData?.publicUrl;
        console.log(`📁 Public URL for file ${index + 1}:`, fileUrl);
        
        // Determine file type
        const fileType = file.type.startsWith('image/') ? 'image' : 'video';
        
        // Insert into database (if table exists)
        try {
          console.log(`📁 Attempting to insert file ${index + 1} into influencer_media table`);
          
          const { data: insertData, error: dbError } = await supabase
            .from('influencer_media')
            .insert({
              influencer_id: userId,
              file_url: fileUrl,
              file_type: fileType,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              created_at: new Date().toISOString()
            })
            .select();
          
          if (dbError) {
            console.error(`📁 Database insert error for file ${index + 1}:`, dbError);
            console.error(`📁 Error details:`, JSON.stringify(dbError, null, 2));
            
            // Check if it's a table not found error
            if (dbError.message && dbError.message.includes('relation "influencer_media" does not exist')) {
              console.error('📁 CRITICAL: influencer_media table does not exist!');
              console.error('📁 Please run the create_influencer_media_table.sql script in your Supabase database');
              throw new Error('influencer_media table does not exist. Please create it first.');
            }
            
            // Continue even if DB insert fails for other reasons
            console.warn(`📁 Continuing without database insert for file ${index + 1}`);
          } else {
            console.log(`📁 File ${index + 1} inserted into database successfully:`, insertData);
          }
        } catch (dbTableError: any) {
          console.error(`📁 Database table error for file ${index + 1}:`, dbTableError);
          
          if (dbTableError.message && dbTableError.message.includes('relation "influencer_media" does not exist')) {
            console.error('📁 CRITICAL: influencer_media table does not exist!');
            throw new Error('influencer_media table does not exist. Please create it first.');
          }
          
          console.warn(`📁 Continuing without database insert for file ${index + 1}`);
        }
        
        return { success: true, fileUrl };
      });
      
      const results = await Promise.all(uploadPromises);
      console.log('📁 All media files processed successfully:', results);
      return results;
    } catch (error) {
      console.error('📁 Error uploading media files:', error);
      throw error;
    }
  };

  // Helper function to update social links
  const updateSocialLinks = async (userId: string, socialLinks: any[]) => {
    try {
      // First, delete existing social links
      const { error: deleteError } = await supabase
        .from('social_links')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Then create new social links
      await createSocialLinks(userId, socialLinks);
    } catch (error) {
      console.error('Error updating social links:', error);
      throw error;
    }
  };

  // Helper function to create social links separately
  const createSocialLinks = async (userId: string, socialLinks: any[]) => {
    try {
      // Create social links
      const socialLinksData = socialLinks.map((link: any) => ({
        user_id: userId,
        platform_id: link.platform_id,
        handle: link.handle,
        profile_url: link.profile_url,
        created_at: new Date().toISOString()
      }));

      const { error: socialError } = await supabase
        .from('social_links')
        .insert(socialLinksData);

      if (socialError) throw socialError;



      // Create default wallet
      const { error: walletError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          balance: 0,
          currency: 'USD',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (walletError) throw walletError;

    } catch (error) {
      console.error('Error creating additional data:', error);
      throw error;
    }
  };

  // Function to fetch user by email and update with additional data
  const fetchAndUpdateUser = async (email: string, additionalData: any) => {
    try {
      console.log('24. Fetching user by email:', email);
      
      // First, get the user from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }
      
      console.log('25. Found profile:', profileData);
      
      // Update the profile with additional data
      const { error: updateError } = await supabase
        .from('profiles')
        .update(additionalData)
        .eq('email', email);
      
      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }
      
      console.log('26. Profile updated successfully');
      return profileData;
      
    } catch (error) {
      console.error('Error in fetchAndUpdateUser:', error);
      throw error;
    }
  };

  // Handle edit influencer
  const handleEditInfluencer = (record: any) => {
    setEditingInfluencer(record);
    setInfluencerCreated(true);
    setDrawerOpen(true);
  };

  // Handle delete influencer
  const handleDeleteInfluencer = async (record: any) => {
    try {
      console.log('Deleting influencer:', record.id);
      
      // Delete from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', record.id);
      
      if (profileError) {
        console.error('Error deleting profile:', profileError);
        message.error('Failed to delete influencer profile');
        return;
      }

      // Delete associated social links
      try {
        const { error: socialError } = await supabase
          .from('social_links')
          .delete()
          .eq('user_id', record.id);
        
        if (socialError) {
          console.warn('Error deleting social links:', socialError);
        }
      } catch (socialTableError) {
        console.warn('Social links table not accessible:', socialTableError);
      }

      // Delete associated social stats
      try {
        const { error: statsError } = await supabase
          .from('social_stats')
          .delete()
          .eq('user_id', record.id);
        
        if (statsError) {
          console.warn('Error deleting social stats:', statsError);
        }
      } catch (statsTableError) {
        console.warn('Social stats table not accessible:', statsTableError);
      }

      // Delete associated media files from storage and database
      try {
        const { data: mediaFiles } = await supabase
          .from('influencer_media')
          .select('file_url')
          .eq('influencer_id', record.id);
        
        if (mediaFiles && mediaFiles.length > 0) {
          // Delete from storage
          const filePaths = mediaFiles.map(media => {
            const path = media.file_url.split('/storage/v1/object/public/influencer-media/')[1];
            return path;
          }).filter(Boolean);
          
          if (filePaths.length > 0) {
            const { error: storageError } = await supabase.storage
              .from('influencer-media')
              .remove(filePaths);
            
            if (storageError) {
              console.warn('Error deleting media from storage:', storageError);
            }
          }
          
          // Delete from database
          const { error: mediaError } = await supabase
            .from('influencer_media')
            .delete()
            .eq('influencer_id', record.id);
          
          if (mediaError) {
            console.warn('Error deleting media from database:', mediaError);
          }
        }
      } catch (mediaTableError) {
        console.warn('Media table not accessible:', mediaTableError);
      }

      // Delete associated wallet
      try {
        const { error: walletError } = await supabase
          .from('wallets')
          .delete()
          .eq('user_id', record.id);
        
        if (walletError) {
          console.warn('Error deleting wallet:', walletError);
        }
      } catch (walletTableError) {
        console.warn('Wallets table not accessible:', walletTableError);
      }

      // Delete profile image from storage if exists
      if (record.profile_image_url) {
        try {
          const profileImagePath = record.profile_image_url.split('/storage/v1/object/public/influencer-profile/')[1];
          if (profileImagePath) {
            const { error: profileImageError } = await supabase.storage
              .from('influencer-profile')
              .remove([profileImagePath]);
            
            if (profileImageError) {
              console.warn('Error deleting profile image from storage:', profileImageError);
            }
          }
        } catch (profileImageTableError) {
          console.warn('Profile image storage not accessible:', profileImageTableError);
        }
      }

      message.success('Influencer deleted successfully');
      
      // Refresh the influencers list
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, created_at')
        .eq('role', 'influencer')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error refreshing influencers list:', error);
      } else {
        setInfluencers(data || []);
      }
      
    } catch (error) {
      console.error('Error deleting influencer:', error);
      message.error('Failed to delete influencer');
    }
  };


  // Fetch media and social links for influencer
  const openDetail = async (record: any) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(record);
    try {
      // Fetch media - handle case where table might not exist
      try {
        const { data: media, error: mediaError } = await supabase
          .from('influencer_media')
          .select('*')
          .eq('influencer_id', record.id);
        
        if (mediaError) {
          console.warn('Media table might not exist or have different structure:', mediaError);
          setDetailMedia([]);
        } else {
          setDetailMedia(media || []);
        }
      } catch (mediaTableError) {
        console.warn('influencer_media table not accessible:', mediaTableError);
        setDetailMedia([]);
      }
      
      // Fetch social links (with platform name)
      try {
        const { data: social, error: socialError } = await supabase
          .from('social_links')
          .select('*, social_media_platforms(name)')
          .eq('user_id', record.id);
        
        if (socialError) {
          console.warn('Social links table might not exist or have different structure:', socialError);
          setDetailSocial([]);
        } else {
          setDetailSocial(social || []);
        }
      } catch (socialTableError) {
        console.warn('social_links table not accessible:', socialTableError);
        setDetailSocial([]);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // Add media count column
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { 
      title: 'Bio', 
      dataIndex: 'bio', 
      key: 'bio',
      render: (bio: string) => bio ? (bio.length > 50 ? bio.substring(0, 50) + '...' : bio) : '-',
      width: 200
    },
    { 
      title: 'Country', 
      dataIndex: 'country', 
      key: 'country',
      render: (countryCode: string) => {
        const country = countries.find(c => c.value === countryCode);
        return country ? country.label : countryCode || '-';
      }
    },
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: 'Media',
      key: 'media',
      render: (unused: any, record: any) => <MediaCount influencerId={record.id} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (unused: any, record: any) => (
        <Space>
          <Button 
            type="primary" 
            size="small"
            onClick={() => handleEditInfluencer(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Influencer"
            description="Are you sure you want to delete this influencer? This action cannot be undone."
            onConfirm={() => handleDeleteInfluencer(record)}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Button 
              danger 
              size="small"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // MediaCount subcomponent
  function MediaCount({ influencerId }: { influencerId: string }) {
    const [count, setCount] = useState<number | null>(null);
    const [error, setError] = useState<boolean>(false);
    
    useEffect(() => {
      let mounted = true;
      
      async function fetchMediaCount() {
        try {
          const { data, error, count } = await supabase
            .from('influencer_media')
            .select('id', { count: 'exact', head: true })
            .eq('influencer_id', influencerId);
          
          if (mounted) {
            if (error) {
              console.warn('influencer_media table not accessible:', error);
              setError(true);
              setCount(0);
            } else if (count !== null) {
              setCount(count);
            } else {
              setCount(0);
            }
          }
        } catch (err: any) {
          if (mounted) {
            console.warn('influencer_media table not accessible:', err);
            setError(true);
            setCount(0);
          }
        }
      }
      
      fetchMediaCount();
        
      return () => { mounted = false; };
    }, [influencerId]);
    
    if (error) {
      return <span title="Media table not accessible">-</span>;
    }
    
    return count === null ? <Spin size="small" /> : <span>{count}</span>;
  }

  // Helper to delete media from Supabase Storage and DB
  const handleDeleteMedia = async (media: any) => {
    try {
      // Remove from storage
      const filePath = media.file_url.split('/storage/v1/object/public/influencer-media/')[1];
      if (filePath) {
        const { error: storageError } = await supabase.storage.from('influencer-media').remove([filePath]);
        if (storageError) throw storageError;
      }
      
      // Remove from DB - handle case where table might not exist
      try {
        const { error: dbError } = await supabase.from('influencer_media').delete().eq('id', media.id);
        if (dbError) throw dbError;
        setDetailMedia((prev) => prev.filter((m) => m.id !== media.id));
        message.success('Media deleted');
      } catch (dbTableError) {
        console.warn('influencer_media table not accessible:', dbTableError);
        // Still remove from local state even if DB update fails
        setDetailMedia((prev) => prev.filter((m) => m.id !== media.id));
        message.success('Media removed from storage');
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete media');
    }
  };

  // Helper to replace (edit) image media
  const handleReplaceImage = async (media: any, file: File) => {
    try {
      // Remove old file from storage
      const oldFilePath = media.file_url.split('/storage/v1/object/public/influencer-media/')[1];
      if (oldFilePath) {
        await supabase.storage.from('influencer-media').remove([oldFilePath]);
      }
      // Upload new file
      const newFilePath = `influencer-media/${media.influencer_id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('influencer-media').upload(newFilePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('influencer-media').getPublicUrl(newFilePath);
      const newFileUrl = publicUrlData?.publicUrl;
      
      // Update DB entry - handle case where table might not exist
      try {
        const { error: updateError } = await supabase.from('influencer_media').update({ file_url: newFileUrl }).eq('id', media.id);
        if (updateError) throw updateError;
        setDetailMedia((prev) => prev.map((m) => m.id === media.id ? { ...m, file_url: newFileUrl } : m));
        message.success('Image replaced');
      } catch (dbTableError) {
        console.warn('influencer_media table not accessible:', dbTableError);
        // Still update local state even if DB update fails
        setDetailMedia((prev) => prev.map((m) => m.id === media.id ? { ...m, file_url: newFileUrl } : m));
        message.success('Image replaced in storage');
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to replace image');
    }
  };

  // Responsive layout helpers
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Step content
  const stepItems = [
    {
      title: 'Basic Information',
      content: (
        <div className="space-y-6">
          <Form.Item
            name="email"
            label={<span style={{ fontWeight: '600', color: '#262626' }}>Email</span>}
            rules={[
              { required: true, message: 'Please input email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input 
              placeholder="Enter email" 
              size="large"
              style={{
                borderRadius: '8px',
                border: '1px solid #d9d9d9',
                padding: '12px 16px',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            />
          </Form.Item>
          

          
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: '600', color: '#262626' }}>Full Name</span>}
            rules={[{ required: true, message: 'Please input full name!' }]}
          >
            <Input 
              placeholder="Enter full name" 
              size="large"
              style={{
                borderRadius: '8px',
                border: '1px solid #d9d9d9',
                padding: '12px 16px',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            />
          </Form.Item>
          
          <Form.Item
            name="bio"
            label={<span style={{ fontWeight: '600', color: '#262626' }}>Bio</span>}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Enter bio (optional)" 
              maxLength={500}
              showCount
              style={{
                borderRadius: '8px',
                border: '1px solid #d9d9d9',
                padding: '12px 16px',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            />
          </Form.Item>
          
          <Form.Item
            name="country"
            label={<span style={{ fontWeight: '600', color: '#262626' }}>Country</span>}
            rules={[{ required: true, message: 'Please select a country!' }]}
          >
            <Select 
              placeholder="Select country"
              size="large"
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              style={{
                borderRadius: '8px',
                border: 'none',
                padding: '12px 16px',
                fontSize: '14px',
                height: '48px',
                transition: 'all 0.3s ease'
              }}
            >
              {countries.map((country) => (
                <Select.Option key={country.value} value={country.value} label={country.label}>
                  {country.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>
      )
    },
    {
      title: 'Profile Settings',
      content: (
        <div className="space-y-6">
          <Form.Item
            name="is_verified"
            label={<span style={{ fontWeight: '600', color: '#262626' }}>Verification Status</span>}
            valuePropName="checked"
          >
            <Switch 
              style={{
                backgroundColor: '#d9d9d9'
              }}
              onChange={(checked) => {
                console.log('Switch onChange - checked:', checked, 'Type:', typeof checked);
                form.setFieldsValue({ is_verified: checked });
              }}
            />
          </Form.Item>
          
          <Form.Item
            name="commission_percentage"
            label={<span style={{ fontWeight: '600', color: '#262626' }}>Commission Percentage (%)</span>}
            rules={[
              { 
                type: 'number', 
                min: 0, 
                max: 100, 
                message: 'Commission must be between 0 and 100%' 
              }
            ]}
            tooltip="The commission percentage (0-100%) that will be deducted from this influencer's earnings. This is specific to this influencer and can be different for each influencer."
          >
            <InputNumber 
              placeholder="Enter commission percentage (0-100)"
              min={0}
              max={100}
              precision={2}
              size="large"
              style={{
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #d9d9d9',
                padding: '12px 16px',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
              formatter={(value) => value ? `${value}%` : ''}
              parser={(value) => value ? value.replace('%', '') : ''}
            />
          </Form.Item>
          
          <Form.Item
            name="profile_image_url"
            label={<span style={{ fontWeight: '600', color: '#262626', fontSize: '16px' }}>Profile Image</span>}
          >
            <div 
              style={{ 
                border: `2px dashed ${isDragOver ? '#1890ff' : '#d9d9d9'}`, 
                borderRadius: '12px', 
                padding: '24px', 
                textAlign: 'center',
                background: isDragOver ? '#f0f8ff' : '#fafafa',
                transition: 'all 0.3s ease',
                position: 'relative',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {profileImagePreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img 
                    src={profileImagePreview} 
                    alt="Profile preview" 
                    style={{ 
                      width: '120px', 
                      height: '120px', 
                      objectFit: 'cover', 
                      borderRadius: '50%',
                      border: '4px solid #fff',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                    }}
                  />
                  <div style={{ 
                    position: 'absolute', 
                    top: '-8px', 
                    right: '-8px',
                    background: '#ff4d4f',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(255, 77, 79, 0.4)'
                  }}
                  onClick={() => {
                    setProfileImagePreview(null);
                    form.setFieldsValue({ profile_image_url: null });
                    // Reset the file input
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}>
                    <DeleteOutlined style={{ color: 'white', fontSize: '14px' }} />
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '48px', 
                    color: '#d9d9d9', 
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <PictureOutlined />
                  </div>
                  <Typography.Title level={4} style={{ color: '#8c8c8c', margin: '0 0 8px 0' }}>
                    Upload Profile Image
                  </Typography.Title>
                  <Typography.Text style={{ color: '#8c8c8c', display: 'block', marginBottom: '16px' }}>
                    {isDragOver ? 'Drop your image here!' : 'Drag & drop an image here, or click to browse'}
                  </Typography.Text>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <Button 
                      type="primary"
                      icon={profileImageUploading ? <Spin size="small" /> : <UploadOutlined />}
                      loading={profileImageUploading}
                      size="large"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        borderRadius: '8px',
                        height: '40px',
                        paddingLeft: '20px',
                        paddingRight: '20px',
                        fontWeight: '500'
                      }}
                    >
                      {profileImageUploading ? 'Uploading...' : 'Choose Image'}
                    </Button>
                  </div>
                  <Typography.Text style={{ 
                    color: '#8c8c8c', 
                    fontSize: '12px', 
                    display: 'block', 
                    marginTop: '8px' 
                  }}>
                    Supports: JPG, PNG, GIF (Max 5MB)
                  </Typography.Text>
                  {profileImageUploading && (
                    <div style={{ width: '100%', marginTop: '16px' }}>
                      <Progress 
                        percent={uploadProgress} 
                        status="active"
                        strokeColor={{
                          '0%': '#108ee9',
                          '100%': '#87d068',
                        }}
                        style={{ marginBottom: '8px' }}
                      />
                      <Typography.Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        Uploading... {uploadProgress}%
                      </Typography.Text>
                    </div>
                  )}
                </div>
              )}
              
              <input
                ref={fileInputRef}
                key={profileImagePreview ? 'has-image' : 'no-image'}
                id="profile-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif"
                style={{ display: 'none' }}
                onChange={(e) => {
                  console.log('📁 File input onChange triggered');
                  const file = e.target.files?.[0];
                  console.log('📁 Selected file:', file);
                  if (file) {
                    // Validate file size (5MB max)
                    if (file.size > 5 * 1024 * 1024) {
                      message.error('File size must be less than 5MB');
                      // Reset the input only on error
                      e.target.value = '';
                      return;
                    }
                    
                    // Validate file type
                    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                    if (!allowedTypes.includes(file.type)) {
                      message.error('Please select a valid image file (JPG, PNG, GIF)');
                      // Reset the input only on error
                      e.target.value = '';
                      return;
                    }
                    
                    // Show immediate preview
                    const previewUrl = URL.createObjectURL(file);
                    setProfileImagePreview(previewUrl);
                    console.log('📁 File input: About to call handleProfileImageUpload');
                    // Then upload the file
                    handleProfileImageUpload(file);
                  }
                }}
              />
            </div>
          </Form.Item>
        </div>
      )
    },
    {
      title: 'Social Media',
      content: (
        <div style={{ padding: '24px 0' }}>
          <div style={{ marginBottom: '24px' }}>
            <Typography.Title level={4} style={{ margin: '0 0 8px 0', color: '#262626' }}>
              Social Media Profiles
            </Typography.Title>
            <Typography.Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
              Add the influencer's social media profiles with follower counts to showcase their reach
            </Typography.Text>
          </div>
          
          <Form.List name="social_links">
            {(fields, { add, remove }) => (
              <>
                {fields.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '48px 24px',
                    border: '2px dashed #d9d9d9',
                    borderRadius: '12px',
                    background: '#fafafa',
                    marginBottom: '24px'
                  }}>
                    <div style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }}>
                      <PlusOutlined />
                    </div>
                    <Typography.Title level={4} style={{ color: '#8c8c8c', margin: '0 0 8px 0' }}>
                      No Social Media Links Added
                    </Typography.Title>
                    <Typography.Text style={{ color: '#8c8c8c', display: 'block', marginBottom: '16px' }}>
                      Click the button below to add social media profiles
                    </Typography.Text>
                  </div>
                )}
                
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{
                    background: '#fff',
                    border: '1px solid #f0f0f0',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: '#52c41a' 
                      }} />
                      <Typography.Text style={{ fontWeight: '500', color: '#262626' }}>
                        Social Media Profile #{name + 1}
                      </Typography.Text>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <Form.Item
                        {...restField}
                        name={[name, 'platform_id']}
                        rules={[
                          { required: true, message: 'Please select a platform' },
                        ]}
                        style={{ margin: 0 }}
                      >
                        <Select 
                          placeholder="Select Platform"
                          size="large"
                          style={{
                            borderRadius: '8px',
                            height: '48px'
                          }}
                          showSearch
                          filterOption={(input, option) =>
                            (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                          }
                        >
                          {platforms.map((platform) => (
                            <Select.Option key={platform.id} value={platform.id}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {platform.icon_url && (
                                  <img 
                                    src={platform.icon_url} 
                                    alt={platform.name}
                                    style={{ width: '20px', height: '20px', borderRadius: '4px' }}
                                  />
                                )}
                                <span>{platform.name}</span>
                              </div>
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                      
                      <Form.Item
                        {...restField}
                        name={[name, 'handle']}
                        rules={[
                          { required: true, message: 'Please enter follower count' },
                          { 
                            pattern: /^[0-9,]+$/, 
                            message: 'Please enter a valid number (e.g., 1000, 1,000, 1000000)' 
                          }
                        ]}
                        style={{ margin: 0 }}
                      >
                        <Input 
                          placeholder="Follower count (e.g., 1000, 1,000, 1000000)" 
                          size="large"
                          style={{
                            borderRadius: '8px',
                            height: '48px'
                          }}
                          prefix={<span style={{ color: '#8c8c8c' }}>👥</span>}
                          onChange={(e) => {
                            // Format number with commas as user types
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                            e.target.value = formatted;
                          }}
                        />
                      </Form.Item>
                    </div>
                    
                    <Form.Item
                      {...restField}
                      name={[name, 'profile_url']}
                      style={{ margin: 0 }}
                    >
                      <Input 
                        placeholder="Full profile URL (optional)" 
                        size="large"
                        style={{
                          borderRadius: '8px',
                          height: '48px'
                        }}
                        prefix={<span style={{ color: '#8c8c8c' }}>🔗</span>}
                      />
                    </Form.Item>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'flex-end', 
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid #f0f0f0'
                    }}>
                      <Button 
                        danger 
                        onClick={() => remove(name)}
                        icon={<DeleteOutlined />}
                        size="middle"
                        style={{
                          borderRadius: '8px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div style={{ marginTop: '24px' }}>
                  <Button 
                    type="dashed" 
                    onClick={() => add()} 
                    block 
                    icon={<PlusOutlined />}
                    size="large"
                    style={{
                      borderRadius: '12px',
                      border: '2px dashed #1890ff',
                      color: '#1890ff',
                      height: '56px',
                      fontSize: '16px',
                      fontWeight: '500',
                      background: '#f0f8ff',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e6f7ff';
                      e.currentTarget.style.borderColor = '#40a9ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f0f8ff';
                      e.currentTarget.style.borderColor = '#1890ff';
                    }}
                  >
                    Add Social Media Link
                  </Button>
                </div>
              </>
            )}
          </Form.List>
        </div>
      )
    },
    {
      title: 'Additional Media',
      content: (
        <div style={{ padding: '24px 0' }}>
          <div style={{ marginBottom: '24px' }}>
            <Typography.Title level={4} style={{ margin: '0 0 8px 0', color: '#262626' }}>
              Media Gallery
            </Typography.Title>
            <Typography.Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
              Upload images and videos to showcase the influencer's work and portfolio
            </Typography.Text>
          </div>
          
          <Form.Item
            name="media_files"
            style={{ margin: 0 }}
          >
            <div style={{ 
              border: '2px dashed #d9d9d9', 
              borderRadius: '12px', 
              padding: '32px', 
              textAlign: 'center',
              background: '#fafafa',
              transition: 'all 0.3s ease',
              position: 'relative',
              minHeight: '200px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = '#1890ff';
              e.currentTarget.style.background = '#f0f8ff';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = '#d9d9d9';
              e.currentTarget.style.background = '#fafafa';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = '#d9d9d9';
              e.currentTarget.style.background = '#fafafa';
              
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) {
                handleMediaFilesUpload(files);
              }
            }}
            >
              {mediaFiles.length === 0 ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '64px', 
                    color: '#d9d9d9', 
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <UploadOutlined />
                  </div>
                  <Typography.Title level={3} style={{ color: '#8c8c8c', margin: '0 0 12px 0' }}>
                    Upload Media Files
                  </Typography.Title>
                  <Typography.Text style={{ color: '#8c8c8c', display: 'block', marginBottom: '20px', fontSize: '16px' }}>
                    Drag & drop files here, or click to browse
                  </Typography.Text>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <Button 
                      type="primary"
                      icon={<UploadOutlined />}
                      size="large"
                      onClick={() => document.getElementById('media-upload')?.click()}
                      style={{
                        borderRadius: '8px',
                        height: '48px',
                        paddingLeft: '24px',
                        paddingRight: '24px',
                        fontWeight: '500',
                        fontSize: '16px'
                      }}
                    >
                      Choose Files
                    </Button>
                  </div>
                  <Typography.Text style={{ 
                    color: '#8c8c8c', 
                    fontSize: '12px', 
                    display: 'block', 
                    marginTop: '12px' 
                  }}>
                    Supports: Images (JPG, PNG, GIF, WEBP - Max 10MB) | Videos (MP4, MOV, AVI, WEBM - Max 100MB, 5 min)
                  </Typography.Text>
                </div>
              ) : (
                <div style={{ width: '100%' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '20px' 
                  }}>
                    <Typography.Title level={4} style={{ margin: 0, color: '#262626' }}>
                      Media Files ({mediaFiles.length})
                    </Typography.Title>
                    <Button 
                      type="primary"
                      icon={<UploadOutlined />}
                      onClick={() => document.getElementById('media-upload')?.click()}
                      style={{
                        borderRadius: '8px',
                        height: '36px'
                      }}
                    >
                      Add More
                    </Button>
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                    gap: '16px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    padding: '8px'
                  }}>
                    {mediaFiles.map((file, index) => (
                      <div key={index} style={{
                        position: 'relative',
                        background: '#fff',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      >
                        {file.type.startsWith('image/') ? (
                          <img 
                            src={file.preview} 
                            alt={`Media ${index + 1}`}
                            style={{ 
                              width: '100%', 
                              height: '80px', 
                              objectFit: 'cover',
                              borderRadius: '8px 8px 0 0'
                            }}
                          />
                        ) : (
                          <div style={{ 
                            width: '100%', 
                            height: '80px', 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px 8px 0 0'
                          }}>
                            <VideoCameraOutlined style={{ fontSize: '24px', color: '#fff' }} />
                          </div>
                        )}
                        
                        <div style={{ padding: '8px' }}>
                          <div style={{ 
                            fontSize: '10px', 
                            color: '#8c8c8c', 
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {file.name}
                          </div>
                          <div style={{ 
                            fontSize: '10px', 
                            color: file.type.startsWith('image/') ? '#52c41a' : '#1890ff',
                            fontWeight: '500',
                            marginBottom: '2px'
                          }}>
                            {file.type.startsWith('image/') ? '📷 Image' : '🎥 Video'}
                          </div>
                          <div style={{ 
                            fontSize: '9px', 
                            color: '#bfbfbf',
                            fontWeight: '400'
                          }}>
                            {(file.size / (1024 * 1024)).toFixed(1)}MB
                          </div>
                        </div>
                        
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            const newFiles = mediaFiles.filter((_, i) => i !== index);
                            setMediaFiles(newFiles);
                          }}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <input
                id="media-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    handleMediaFilesUpload(files);
                  }
                  // Reset the input
                  e.target.value = '';
                }}
              />
            </div>
          </Form.Item>
        </div>
      )
    }
  ];



  // Step navigation with validation
  const next = async () => {
    try {
      if (currentStep === 0) {
        // Validate only required fields for step 1
        await form.validateFields(['email', 'name']);
      } else if (currentStep === 1) {
        // Step 2 has no required fields, just proceed
      } else if (currentStep === 2) {
        // Step 3 has no required fields, just proceed
      } else if (currentStep === 3) {
        // Step 4 has no required fields, just proceed
      }
      
      setCurrentStep((s) => s + 1);
    } catch (err) {
      console.error('Validation failed:', err);
      // Validation errors are shown by AntD
    }
  };
  const prev = () => setCurrentStep((s) => s - 1);



  // Reset form when drawer opens
  useEffect(() => {
    if (drawerOpen) {
      if (!editingInfluencer) {
        // Reset form for new influencer
        form.resetFields();
        setCurrentStep(0);
        setFormError(null);
        setProfileImagePreview(null);
        setMediaFiles([]);
        console.log('Form reset for new influencer, current step:', 0);
      }
    }
  }, [drawerOpen, form, editingInfluencer]);

  // Function to load influencer data for editing
  const loadInfluencerForEditing = async (influencer: any) => {
    try {
      console.log('Loading influencer data for editing:', influencer);
      console.log('Influencer object keys:', Object.keys(influencer));
      console.log('Influencer bio value:', influencer.bio, 'Type:', typeof influencer.bio);
      console.log('Influencer profile_image_url value:', influencer.profile_image_url, 'Type:', typeof influencer.profile_image_url);
      console.log('Influencer is_verified value:', influencer.is_verified, 'Type:', typeof influencer.is_verified);
      
      // Small delay to ensure form is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Set basic form fields
      const formData = {
        email: influencer.email,
        name: influencer.name,
        bio: influencer.bio,
        country: influencer.country,
        is_verified: influencer.is_verified,
        profile_image_url: influencer.profile_image_url,
        commission_percentage: influencer.commission_percentage !== undefined && influencer.commission_percentage !== null ? Number(influencer.commission_percentage) : 0
      };
      
      console.log('Setting form fields with data:', formData);
      
      // Try to set form values with retry mechanism
      let retryCount = 0;
      const maxRetries = 5;
      
      const setFormValues = () => {
        try {
          form.setFieldsValue(formData);
          console.log('Form values set successfully');
        } catch (error) {
          console.error('Error setting form values:', error);
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying to set form values (attempt ${retryCount}/${maxRetries})`);
            setTimeout(setFormValues, 100);
          }
        }
      };
      
      setFormValues();
      
      console.log('Form fields set:', {
        email: influencer.email,
        name: influencer.name,
        bio: influencer.bio,
        country: influencer.country,
        is_verified: influencer.is_verified,
        profile_image_url: influencer.profile_image_url
      });
      
      // Set profile image preview
      if (influencer.profile_image_url) {
        console.log('Setting profile image preview:', influencer.profile_image_url);
        setProfileImagePreview(influencer.profile_image_url);
      } else {
        console.log('No profile image URL found');
        setProfileImagePreview(null);
      }
      
      // Load social links
      const { data: socialLinks } = await supabase
        .from('social_links')
        .select('*')
        .eq('user_id', influencer.id);
      
      console.log('Social links loaded from database:', socialLinks);
      
      if (socialLinks && socialLinks.length > 0) {
        const mappedSocialLinks = socialLinks.map(link => ({
          platform_id: link.platform_id,
          handle: link.handle,
          profile_url: link.profile_url
        }));
        
        console.log('Mapped social links for form:', mappedSocialLinks);
        
        form.setFieldsValue({
          social_links: mappedSocialLinks
        });
      } else {
        console.log('No social links found for influencer');
      }
      
      // Load existing media files
      try {
        const { data: existingMedia } = await supabase
          .from('influencer_media')
          .select('*')
          .eq('influencer_id', influencer.id);
        
        console.log('Existing media data:', existingMedia);
        
        if (existingMedia && existingMedia.length > 0) {
          const mediaFilesData = existingMedia.map(media => ({
            file: null, // We don't have the actual file, just the URL
            name: media.file_name,
            type: media.file_type || 'image/jpeg',
            size: 0, // We don't have file size for existing files
            preview: media.file_url,
            isExisting: true,
            mediaId: media.id
          }));
          console.log('Processed media files data:', mediaFilesData);
          setMediaFiles(mediaFilesData);
        }
      } catch (mediaError) {
        console.warn('Could not load existing media:', mediaError);
      }
      
      setCurrentStep(0);
      setFormError(null);
      console.log('Influencer data loaded for editing');
    } catch (error) {
      console.error('Error loading influencer for editing:', error);
      setFormError('Failed to load influencer data for editing');
    }
  };

  // Monitor form values for debugging and sync profile image preview
  useEffect(() => {
    if (drawerOpen) {
      // Sync profile image preview with form field
      const interval = setInterval(() => {
        const values = form.getFieldsValue();
        
        // Sync profile image preview with form field
        if (values.profile_image_url && !profileImagePreview) {
          setProfileImagePreview(values.profile_image_url);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [drawerOpen, form, profileImagePreview]);

  // Handle editing influencer data loading
  useEffect(() => {
    if (drawerOpen && editingInfluencer) {
      // Small delay to ensure form is mounted
      const timer = setTimeout(() => {
        loadInfluencerForEditing(editingInfluencer);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [drawerOpen, editingInfluencer]);

  // Handler for media files upload
  const handleMediaFilesUpload = async (files: File[]) => {
    const maxImageSize = 10 * 1024 * 1024; // 10MB for images
    const maxVideoSize = 100 * 1024 * 1024; // 100MB for videos
    const maxVideoDuration = 300; // 5 minutes in seconds
    
    const validFiles: File[] = [];
    const errors: Array<{ file: string; reason: string }> = [];

    // Allowed file types
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    // Validate each file
    for (const file of files) {
      const fileErrors: string[] = [];

      // Check file type
      if (!allAllowedTypes.includes(file.type)) {
        fileErrors.push(`Invalid file type. Allowed: Images (JPG, PNG, GIF, WEBP) or Videos (MP4, MOV, AVI, WEBM)`);
      }

      // Check file size based on type
      if (file.type.startsWith('image/')) {
        if (file.size > maxImageSize) {
          fileErrors.push(`Image size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 10MB limit`);
        }
      } else if (file.type.startsWith('video/')) {
        if (file.size > maxVideoSize) {
          fileErrors.push(`Video size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 100MB limit`);
        }
        
        // Validate video duration
        try {
          const duration = await getVideoDuration(file);
          if (duration > maxVideoDuration) {
            fileErrors.push(`Video duration (${Math.round(duration)}s) exceeds 5 minute limit`);
          }
        } catch (durationError) {
          console.warn('Could not read video duration:', durationError);
          // Don't block upload if we can't read duration, but log it
        }
      }

      // Check if file is corrupted (has size but no type)
      if (file.size === 0) {
        fileErrors.push('File appears to be empty or corrupted');
      }

      if (fileErrors.length > 0) {
        errors.push({
          file: file.name,
          reason: fileErrors.join('; ')
        });
      } else {
        validFiles.push(file);
      }
    }

    // Show detailed error messages
    if (errors.length > 0) {
      const errorMessages = errors.map(e => `• ${e.file}: ${e.reason}`).join('\n');
      message.error({
        content: (
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              {errors.length} file(s) failed validation:
            </div>
            <div style={{ fontSize: '12px', whiteSpace: 'pre-line' }}>
              {errorMessages}
            </div>
          </div>
        ),
        duration: 10,
        style: { marginTop: '20vh' }
      });
    }

    // Only process valid files
    if (validFiles.length > 0) {
      const newFiles = validFiles.map(file => ({
        file,
        name: file.name,
        type: file.type,
        size: file.size,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      }));
      setMediaFiles(prev => [...prev, ...newFiles]);
      
      if (validFiles.length > 0) {
        message.success(`${validFiles.length} file(s) added successfully`);
      }
    }
  };

  // Helper function to get video duration
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Could not load video metadata'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  // Helper to get cropped image blob
  async function getCroppedImg(imageSrc: string, cropPixels: any) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    canvas.width = cropPixels.width;
    canvas.height = cropPixels.height;
    ctx.drawImage(
      image,
      cropPixels.x,
      cropPixels.y,
      cropPixels.width,
      cropPixels.height,
      0,
      0,
      cropPixels.width,
      cropPixels.height
    );
    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/jpeg');
    });
  }
  function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', (error) => reject(error));
      img.setAttribute('crossOrigin', 'anonymous');
      img.src = url;
    });
  }

  // Function to open commissions modal
  const openCommissionsModal = async () => {
    setCommissionsModalOpen(true);
    setCommissionsLoading(true);
    try {
      // Fetch influencers with commission data
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, commission_percentage')
        .eq('role', 'influencer')
        .order('name', { ascending: true });
      
      if (error) {
        message.error('Failed to load commissions');
        console.error('Error fetching commissions:', error);
      } else {
        setCommissionsData(data || []);
      }
    } catch (error: any) {
      message.error('Failed to load commissions');
      console.error('Error:', error);
    } finally {
      setCommissionsLoading(false);
    }
  };

  // Columns for commissions table
  const commissionColumns = [
    {
      title: 'Influencer Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Commission Percentage',
      dataIndex: 'commission_percentage',
      key: 'commission_percentage',
      render: (value: number | null | undefined) => {
        const commission = value !== null && value !== undefined ? Number(value) : 0;
        return (
          <Tag color={commission > 0 ? 'blue' : 'default'} style={{ fontSize: '14px', padding: '4px 12px' }}>
            {commission.toFixed(2)}%
          </Tag>
        );
      },
      sorter: (a: any, b: any) => {
        const aVal = a.commission_percentage !== null && a.commission_percentage !== undefined ? Number(a.commission_percentage) : 0;
        const bVal = b.commission_percentage !== null && b.commission_percentage !== undefined ? Number(b.commission_percentage) : 0;
        return aVal - bVal;
      }
    }
  ];

  return (
    <Card style={{ margin: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Influencers</Typography.Title>
        <Space>
          <Button 
            icon={<DollarOutlined />} 
            onClick={openCommissionsModal}
            style={{ borderRadius: '6px' }}
          >
            View Commissions
          </Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => {
            // Reset all state for new influencer creation
            setEditingInfluencer(null);
            setInfluencerCreated(false);
            setMediaFiles([]);
            setProfileImagePreview(null);
            setCurrentStep(0);
            setFormError(null);
            form.resetFields();
            setDrawerOpen(true);
          }}>
            Add Influencer
          </Button>
        </Space>
      </div>
      {loading ? <Spin size="large" /> : <Table columns={columns} dataSource={influencers} rowKey="id" onRow={(record: any) => ({ onClick: () => openDetail(record) })} />}
      <Drawer
        title="Add Influencer"
        open={drawerOpen}
        onClose={() => { 
          console.log('Drawer closing - user action or programmatic close');
          setDrawerOpen(false); 
          setMediaFiles([]); 
          form.resetFields(); 
          setFormError(null); 
          setCurrentStep(0); 
          setInfluencerCreated(false);
          setEditingInfluencer(null);
          setProfileImagePreview(null);
        }}
        width="100vw"
        styles={{ body: { background: '#f7f8fa', minHeight: '100vh', padding: isMobile ? 8 : 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' } }}
        closeIcon
      >
        {formError && <Alert message={formError} type="error" showIcon style={{ marginBottom: 16, maxWidth: 600 }} />}
        
        <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', marginTop: 16 }}>
          <Steps current={currentStep} items={stepItems.map(s => ({ title: s.title }))} style={{ marginBottom: 32 }} responsive direction={isMobile ? 'vertical' : 'horizontal'} />
          
          {/* Step guidance */}
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <Typography.Text type="secondary">
              Step {currentStep + 1} of {stepItems.length}: {stepItems[currentStep].title}
              {currentStep === stepItems.length - 1 && (
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  {' '}• Final step - Add media files and submit
                </span>
              )}
            </Typography.Text>
          </div>
          
          <Divider style={{ margin: '16px 0 32px 0' }} />
          <AntCard style={{ boxShadow: '0 2px 8px #0001', borderRadius: 12, background: '#fff', padding: isMobile ? 12 : 32 }} styles={{ body: { padding: 0 } }}>
            <Form
              key={editingInfluencer?.id || 'new'}
              form={form}
              layout="vertical"
              initialValues={{
                social_links: []
              }}
            >
              <div className="space-y-6">
                {/* Render all steps but hide non-active ones */}
                {stepItems.map((step, index) => (
                  <div 
                    key={index}
                    style={{
                      display: index === currentStep ? 'block' : 'none'
                    }}
                  >
                    {step.content}
                  </div>
                ))}
              </div>
              
              {/* Form buttons */}
              <div className="flex justify-between items-center pt-8 pb-4">
                <div className="flex items-center space-x-3">
                  {/* Show Close Form button after successful creation/update */}
                  {influencerCreated && (
                    <Button 
                      onClick={() => {
                        setDrawerOpen(false);
                        setInfluencerCreated(false);
                        setEditingInfluencer(null);
                        setMediaFiles([]);
                        form.resetFields();
                        setFormError(null);
                        setCurrentStep(0);
                        setProfileImagePreview(null);
                      }}
                      size="large"
                      style={{
                        minWidth: '120px',
                        height: '44px',
                        borderRadius: '8px',
                        border: '1px solid #ff4d4f',
                        color: '#ff4d4f',
                        background: '#ffffff',
                        boxShadow: '0 2px 8px rgba(255, 77, 79, 0.15)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Close Form
                    </Button>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {currentStep > 0 && (
                    <Button 
                      onClick={() => setCurrentStep(currentStep - 1)}
                      size="large"
                      style={{
                        minWidth: '120px',
                        height: '44px',
                        borderRadius: '8px',
                        border: '1px solid #d9d9d9',
                        color: '#666',
                        background: '#ffffff',
                        transition: 'all 0.3s ease'
                      }}
                      icon={<span>←</span>}
                    >
                      Previous
                    </Button>
                  )}
                  
                  {currentStep < stepItems.length - 1 ? (
                    <Button 
                      onClick={handleNextStep}
                      type="primary"
                      size="large"
                      style={{
                        minWidth: '120px',
                        height: '44px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      icon={<span>→</span>}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button 
                      type="primary" 
                      onClick={() => {
                        handleAddInfluencer();
                      }}
                      loading={formLoading}
                      size="large"
                      style={{
                        minWidth: '140px',
                        height: '48px',
                        borderRadius: '10px',
                        background: influencerCreated 
                          ? 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)' 
                          : 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                        border: 'none',
                        boxShadow: influencerCreated 
                          ? '0 6px 16px rgba(24, 144, 255, 0.3)' 
                          : '0 6px 16px rgba(82, 196, 26, 0.3)',
                        fontSize: '16px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                      }}
                      icon={<span>{influencerCreated ? '🔄' : '✓'}</span>}
                    >
                      {influencerCreated ? 'Update Influencer' : 'Create Influencer & Save Media'}
                    </Button>
                  )}
                </div>
              </div>
            </Form>
          </AntCard>
        </div>
      </Drawer>
      <Drawer
        title={detailData ? detailData.name : 'Influencer Details'}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={500}
      >
        {detailLoading ? <Spin size="large" /> : detailData && (
          <div>
            <Typography.Paragraph><b>Email:</b> {detailData.email}</Typography.Paragraph>
            <Typography.Paragraph><b>Bio:</b> {detailData.bio || '-'}</Typography.Paragraph>
            <Typography.Paragraph><b>Verified:</b> {detailData.is_verified ? 'Yes' : 'No'}</Typography.Paragraph>
            <Typography.Paragraph><b>Profile Image:</b><br />
              {detailData.profile_image_url ? <Image src={detailData.profile_image_url} width={80} /> : '-'}</Typography.Paragraph>
            <Typography.Paragraph><b>Media:</b></Typography.Paragraph>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {detailMedia.length === 0 && <span>No media</span>}
              {detailMedia.map((m: any) =>
                m.file_type === 'image' ? (
                  <div key={m.id} style={{ position: 'relative', display: 'inline-block' }}>
                    <Image src={m.file_url} width={80} height={80} style={{ objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: 2, right: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Upload
                        showUploadList={false}
                        accept="image/*"
                        beforeUpload={(file) => { handleReplaceImage(m, file); return false; }}
                      >
                        <Button size="small" type="link">Edit</Button>
                      </Upload>
                      <Popconfirm title="Delete this image?" onConfirm={() => handleDeleteMedia(m)} okText="Yes" cancelText="No">
                        <Button size="small" danger type="link">Delete</Button>
                      </Popconfirm>
                    </div>
                  </div>
                ) : m.file_type === 'video' ? (
                  <div key={m.id} style={{ position: 'relative', display: 'inline-block' }}>
                    <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                      <VideoCameraOutlined style={{ fontSize: 48 }} />
                    </a>
                    <div style={{ position: 'absolute', top: 2, right: 2 }}>
                      <Popconfirm title="Delete this video?" onConfirm={() => handleDeleteMedia(m)} okText="Yes" cancelText="No">
                        <Button size="small" danger type="link">Delete</Button>
                      </Popconfirm>
                    </div>
                  </div>
                ) : null
              )}
            </div>
            <Typography.Paragraph><b>Social Links:</b></Typography.Paragraph>
            <ul>
              {detailSocial.length === 0 && <li>No social links</li>}
              {detailSocial.map((s: any) => (
                <li key={s.id}>
                  <b>{s.social_media_platforms?.name || 'Platform'}:</b> {s.handle} (<a href={s.profile_url} target="_blank" rel="noopener noreferrer">Profile</a>)
                </li>
              ))}
            </ul>
          </div>
        )}
      </Drawer>

      {/* Commissions Modal */}
      <Modal
        title={
          <Space>
            <DollarOutlined />
            <span>Influencer Commissions</span>
          </Space>
        }
        open={commissionsModalOpen}
        onCancel={() => setCommissionsModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setCommissionsModalOpen(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        <div style={{ marginTop: 16 }}>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            View and manage commission percentages for each influencer. Commissions are set individually per influencer.
          </Typography.Paragraph>
          <Spin spinning={commissionsLoading}>
            <Table
              columns={commissionColumns}
              dataSource={commissionsData}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} influencers`,
              }}
              locale={{
                emptyText: 'No influencers found'
              }}
            />
          </Spin>
        </div>
      </Modal>

    </Card>
  );
} 