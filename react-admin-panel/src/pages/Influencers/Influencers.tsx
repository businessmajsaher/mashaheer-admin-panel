import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Modal, Form, Input, Alert, Spin, message, Checkbox, Select, Space, Upload, Drawer, Image, Popconfirm, Steps, Row, Col, Card as AntCard, Divider, Switch, InputNumber } from 'antd';
import { UserAddOutlined, UploadOutlined, VideoCameraOutlined, PictureOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';
import Cropper from 'react-easy-crop';
import { Modal as AntdModal, Slider } from 'antd';

export default function Influencers() {
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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

  // Fetch influencers from Supabase
  useEffect(() => {
    async function fetchInfluencers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, created_at')
        .eq('role', 'influencer')
        .order('created_at', { ascending: false });
      if (error) message.error(error.message);
      setInfluencers(data || []);
      setLoading(false);
    }
    fetchInfluencers();
  }, [drawerOpen]); // refresh after modal closes

  // Fetch social media platforms for dropdown
  useEffect(() => {
    async function fetchPlatforms() {
      const { data, error } = await supabase.from('social_media_platforms').select('id, name');
      if (!error && data) setPlatforms(data);
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

  // Add Influencer handler
  const handleAddInfluencer = async (values: any) => {
    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('Form submission triggered at:', new Date().toISOString());
    console.log('Current step:', currentStep);
    console.log('1. Raw form values received:', values);
    console.log('2. Form values type:', typeof values);
    console.log('3. Form values keys:', Object.keys(values));
    console.log('4. Form values length:', Object.keys(values).length);
    console.log('5. Individual field values:');
    console.log('   - email:', values.email, 'Type:', typeof values.email, 'Present:', !!values.email);
    console.log('   - password:', values.password ? '[HIDDEN]' : 'missing', 'Type:', typeof values.password, 'Present:', !!values.password);
    console.log('   - name:', values.name, 'Type:', typeof values.name, 'Present:', !!values.name);
    console.log('   - bio:', values.bio, 'Type:', typeof values.bio, 'Present:', !!values.bio);
    console.log('   - is_verified:', values.is_verified, 'Type:', typeof values.is_verified, 'Present:', !!values.is_verified);
    console.log('   - profile_image_url:', values.profile_image_url, 'Type:', typeof values.profile_image_url, 'Present:', !!values.profile_image_url);
    
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
    
    // Get current form values again after validation
    const currentFormValues = form.getFieldsValue();
    console.log('7. Current form values after validation:', currentFormValues);
    console.log('8. Current form values keys:', Object.keys(currentFormValues));
    
    setFormLoading(true);
    setFormError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      console.log('9. JWT access token used for Edge Function:', token);
      
      // Debug: Log the raw form values again
      console.log('10. Raw form values (again):', values);
      console.log('11. Form values type (again):', typeof values);
      console.log('12. Form values keys (again):', Object.keys(values));
      
      // Prepare the data to send to the Edge Function
      // Note: Your Edge Function only handles basic fields, not social_links
      const influencerData = {
        email: values.email,
        password: values.password,
        name: values.name,
        bio: values.bio || null,
        is_verified: values.is_verified || false,
        profile_image_url: values.profile_image_url || null
      };
      
      console.log('13. Sending data to Edge Function:', influencerData);
      console.log('14. Data being stringified:', JSON.stringify(influencerData, null, 2));
      
      console.log('15. Making request to Edge Function...');
      const response = await fetch('https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(influencerData)
      });
      
      console.log('16. Response status:', response.status);
      console.log('17. Response headers:', Object.fromEntries(response.headers.entries()));
      
      let result;
      try {
        result = await response.json();
        console.log('18. Edge Function response:', result);
      } catch (parseError) {
        console.error('19. Failed to parse response:', parseError);
        const textResponse = await response.text();
        console.log('20. Raw response text:', textResponse);
        throw new Error('Invalid response from server');
      }
      
      if (response.ok || response.status === 201) {
        console.log('21. Success! Influencer created');
        message.success('Influencer created successfully!');
        
        // If we have social links, create them separately since the Edge Function doesn't handle them
        if (values.social_links && values.social_links.length > 0) {
          try {
            await createSocialLinks(result.user.id, values.social_links);
            message.info('Social links added successfully');
          } catch (socialError) {
            console.error('Failed to create social links:', socialError);
            message.warning('Influencer created but social links failed to save');
          }
        }
        
        setDrawerOpen(false);
        form.resetFields();
        setMediaFiles([]);
        setCurrentStep(0);
        setProfileImagePreview(null);
      } else {
        console.error('22. Edge Function error response:', result);
        throw new Error(result.error || result.details || `HTTP ${response.status}: Failed to create influencer`);
      }
    } catch (err: any) {
      console.error('23. Add Influencer error:', err, JSON.stringify(err, null, 2));
      setFormError(
        (err && (err.message || err.error_description || err.error)) ||
        JSON.stringify(err) ||
        'Failed to create influencer'
      );
    } finally {
      setFormLoading(false);
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: socialError } = await supabase
        .from('social_links')
        .insert(socialLinksData);

      if (socialError) throw socialError;

      // Create social stats if followers/engagement data is provided
      const socialStatsData = socialLinks
        .filter((link: any) => link.followers_count || link.engagement_rate)
        .map((link: any) => ({
          user_id: userId,
          platform_id: link.platform_id,
          followers_count: link.followers_count || 0,
          engagement_rate: link.engagement_rate || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

      if (socialStatsData.length > 0) {
        const { error: statsError } = await supabase
          .from('social_stats')
          .insert(socialStatsData);

        if (statsError) throw statsError;
      }

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
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: 'Media',
      key: 'media',
      render: (unused: any, record: any) => <MediaCount influencerId={record.id} />,
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
  const isMobile = window.innerWidth < 768;

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
            name="password"
            label={<span style={{ fontWeight: '600', color: '#262626' }}>Password</span>}
            rules={[
              { required: true, message: 'Please input password!' },
              { min: 6, message: 'Password must be at least 6 characters!' }
            ]}
          >
            <Input.Password 
              placeholder="Enter password" 
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
            />
          </Form.Item>
          
          <Form.Item
            name="profile_image_url"
            label={<span style={{ fontWeight: '600', color: '#262626' }}>Profile Image</span>}
          >
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={() => document.getElementById('profile-upload')?.click()}
                  icon={<UploadOutlined />}
                  size="large"
                  style={{
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(24, 144, 255, 0.4)',
                    transition: 'all 0.3s ease',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Upload Image
                </Button>
                {profileImagePreview && (
                  <Button 
                    danger 
                    size="large"
                    onClick={() => {
                      setProfileImagePreview(null);
                      form.setFieldsValue({ profile_image_url: null });
                    }}
                    style={{
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)',
                      transition: 'all 0.3s ease',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
                                           <input
                id="profile-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleProfileImageUpload(file);
                  }
                }}
              />
              {profileImagePreview && (
                <div className="mt-3 inline-block">
                  <img 
                    src={profileImagePreview} 
                    alt="Profile preview" 
                    className="w-16 h-16 object-cover rounded-full border-2 border-white shadow-lg"
                  />
                </div>
              )}
            </div>
          </Form.Item>
        </div>
      )
    },
    {
      title: 'Social Media',
      content: (
        <div className="space-y-6">
          <Form.List name="social_links">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="flex items-center space-x-3 p-6 border border-gray-200 rounded-xl bg-gray-50">
                    <Form.Item
                      {...restField}
                      name={[name, 'platform']}
                      rules={[{ required: true, message: 'Missing platform' }]}
                      className="flex-1"
                    >
                      <Select 
                        placeholder="Select platform"
                        size="large"
                        style={{
                          borderRadius: '8px'
                        }}
                      >
                        <Select.Option value="instagram">Instagram</Select.Option>
                        <Select.Option value="youtube">YouTube</Select.Option>
                        <Select.Option value="tiktok">TikTok</Select.Option>
                        <Select.Option value="twitter">Twitter</Select.Option>
                        <Select.Option value="facebook">Facebook</Select.Option>
                        <Select.Option value="linkedin">LinkedIn</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'handle']}
                      rules={[{ required: true, message: 'Missing handle' }]}
                      className="flex-1"
                    >
                      <Input 
                        placeholder="Enter handle" 
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
                      {...restField}
                      name={[name, 'followers_count']}
                      className="flex-1"
                    >
                      <InputNumber 
                        placeholder="Followers count" 
                        min={0}
                        size="large"
                        style={{
                          borderRadius: '8px',
                          border: '1px solid #d9d9d9',
                          padding: '12px 16px',
                          fontSize: '14px',
                          transition: 'all 0.3s ease',
                          width: '100%'
                        }}
                      />
                    </Form.Item>
                    <Button 
                      danger 
                      onClick={() => remove(name)}
                      icon={<DeleteOutlined />}
                      size="large"
                      style={{
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(255, 77, 79, 0.2)',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </div>
                ))}
                <Form.Item>
                  <Button 
                    type="dashed" 
                    onClick={() => add()} 
                    block 
                    icon={<PlusOutlined />}
                    size="large"
                    style={{
                      borderRadius: '8px',
                      border: '2px dashed #1890ff',
                      color: '#1890ff',
                      height: '48px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Add Social Media Link
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </div>
      )
    }
  ];

  // Step navigation with validation
  const next = async () => {
    try {
      console.log('Next button clicked, current step:', currentStep);
      
      if (currentStep === 0) {
        // Validate only required fields for step 1
        await form.validateFields(['email', 'password', 'name']);
        console.log('Step 1 validation passed');
      } else if (currentStep === 1) {
        // Step 2 has no required fields, just proceed
        console.log('Step 2 - no validation needed');
      } else if (currentStep === 2) {
        // Step 3 has no required fields, just proceed
        console.log('Step 3 - no validation needed');
      }
      
      setCurrentStep((s) => s + 1);
      console.log('Moved to step:', currentStep + 1);
    } catch (err) {
      console.error('Validation failed:', err);
      // Validation errors are shown by AntD
    }
  };
  const prev = () => setCurrentStep((s) => s - 1);



  // Reset form when drawer opens
  useEffect(() => {
    if (drawerOpen) {
      form.resetFields();
      setCurrentStep(0);
      setFormError(null);
      setProfileImagePreview(null);
      console.log('Form reset, current step:', 0);
    }
  }, [drawerOpen, form]);

  // Monitor form values for debugging
  useEffect(() => {
    if (drawerOpen) {
      // Log form values every time the step changes
      const interval = setInterval(() => {
        const values = form.getFieldsValue();
        console.log('Current form values:', values);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [drawerOpen, form]);

  // Handler for profile image upload
  const handleProfileImageUpload = async (file: File) => {
    console.log('=== PROFILE IMAGE UPLOAD STARTED ===');
    console.log('File selected:', file.name, file.size, file.type);
    
    setProfileImageUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `influencers/profile/${Date.now()}-${file.name}`;
      console.log('Uploading to path:', filePath);
      
      const { error: uploadError } = await supabase.storage.from('influencer-profile').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage.from('influencer-profile').getPublicUrl(filePath);
      const url = publicUrlData?.publicUrl;
      console.log('Upload successful, URL:', url);
      
      if (url) {
        console.log('Setting form field profile_image_url to:', url);
        form.setFieldsValue({ profile_image_url: url });
        setProfileImagePreview(url);
        console.log('Form field updated, preview set');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      message.error(err.message || 'Failed to upload profile image');
    } finally {
      setProfileImageUploading(false);
      console.log('=== PROFILE IMAGE UPLOAD COMPLETED ===');
    }
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

  return (
    <Card style={{ margin: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Influencers</Typography.Title>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setDrawerOpen(true)}>
          Add Influencer
        </Button>
      </div>
      {loading ? <Spin size="large" /> : <Table columns={columns} dataSource={influencers} rowKey="id" onRow={(record: any) => ({ onClick: () => openDetail(record) })} />}
      <Drawer
        title="Add Influencer"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setMediaFiles([]); form.resetFields(); setFormError(null); setCurrentStep(0); }}
        width="100vw"
        bodyStyle={{ background: '#f7f8fa', minHeight: '100vh', padding: isMobile ? 8 : 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}
        closeIcon
      >
        {formError && <Alert message={formError} type="error" showIcon style={{ marginBottom: 16, maxWidth: 600 }} />}
        <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', marginTop: 16 }}>
          <Steps current={currentStep} items={stepItems.map(s => ({ title: s.title }))} style={{ marginBottom: 32 }} responsive direction={isMobile ? 'vertical' : 'horizontal'} />
          <Divider style={{ margin: '16px 0 32px 0' }} />
          <AntCard style={{ boxShadow: '0 2px 8px #0001', borderRadius: 12, background: '#fff', padding: isMobile ? 12 : 32 }} bodyStyle={{ padding: 0 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleAddInfluencer}
              initialValues={{
                is_verified: false,
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
                
                                <div className="flex justify-between items-center pt-8 pb-4">
                  <Button 
                    onClick={prev}
                    disabled={currentStep === 0}
                    size="large"
                    style={{
                      minWidth: '120px',
                      height: '44px',
                      borderRadius: '8px',
                      border: currentStep === 0 ? '1px solid #d9d9d9' : '1px solid #1890ff',
                      color: currentStep === 0 ? '#bfbfbf' : '#1890ff',
                      background: currentStep === 0 ? '#f5f5f5' : '#ffffff',
                      boxShadow: currentStep === 0 ? 'none' : '0 2px 8px rgba(24, 144, 255, 0.15)',
                      transition: 'all 0.3s ease'
                    }}
                    icon={currentStep === 0 ? null : <span>←</span>}
                  >
                    Previous
                  </Button>
                  
                  {currentStep < stepItems.length - 1 ? (
                    <Button 
                      onClick={next}
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
                      htmlType="submit"
                      loading={formLoading}
                      size="large"
                      style={{
                        minWidth: '140px',
                        height: '48px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                        border: 'none',
                        boxShadow: '0 6px 16px rgba(82, 196, 26, 0.3)',
                        fontSize: '16px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                      }}
                      icon={<span>✓</span>}
                    >
                      Create Influencer
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
    </Card>
  );
} 