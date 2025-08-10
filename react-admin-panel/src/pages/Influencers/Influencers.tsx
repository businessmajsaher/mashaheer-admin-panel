import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Modal, Form, Input, Alert, Spin, message, Checkbox, Select, Space, Upload, Drawer, Image, Popconfirm, Steps, Row, Col, Card as AntCard, Divider } from 'antd';
import { UserAddOutlined, UploadOutlined, VideoCameraOutlined, PictureOutlined } from '@ant-design/icons';
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
    setFormLoading(true);
    setFormError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      console.log('JWT access token used for Edge Function:', token);
      
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
      
      console.log('Sending data to Edge Function:', influencerData);
      
      console.log('Making request to Edge Function...');
      const response = await fetch('https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(influencerData)
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      let result;
      try {
        result = await response.json();
        console.log('Edge Function response:', result);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        const textResponse = await response.text();
        console.log('Raw response text:', textResponse);
        throw new Error('Invalid response from server');
      }
      
      if (response.ok || response.status === 201) {
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
        console.error('Edge Function error response:', result);
        throw new Error(result.error || result.details || `HTTP ${response.status}: Failed to create influencer`);
      }
    } catch (err: any) {
      console.error('Add Influencer error:', err, JSON.stringify(err, null, 2));
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
      
      // Try to fetch media count, but handle case where table doesn't exist
      supabase.from('influencer_media')
        .select('id', { count: 'exact', head: true })
        .eq('influencer_id', influencerId)
        .then(({ count, error }) => { 
          if (mounted) {
            if (error) {
              console.warn('influencer_media table not accessible:', error);
              setError(true);
              setCount(0);
            } else {
              setCount(count || 0);
            }
          }
        })
        .catch((err) => {
          if (mounted) {
            console.warn('influencer_media table not accessible:', err);
            setError(true);
            setCount(0);
          }
        });
        
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
      title: 'Basic Info',
      content: (
        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="name"
              label="Name"
              rules={[
                { required: true, message: 'Please enter a name' },
                { validator: (_, value) => value && value.trim() ? Promise.resolve() : Promise.reject(new Error('Name cannot be empty or whitespace')) }
              ]}
            >
              <Input autoFocus />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter an email' },
                { type: 'email', message: 'Please enter a valid email' },
                {
                  async validator(_, value) {
                    if (!value) return Promise.resolve();
                    // Check if email exists in Supabase
                    const { data } = await supabase.from('profiles').select('id').eq('email', value).maybeSingle();
                    if (data) {
                      return Promise.reject(new Error('This email is already registered.'));
                    }
                    return Promise.resolve();
                  },
                  validateTrigger: 'onBlur',
                },
              ]}
            >
              <Input type="email" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please enter a password' },
                { min: 8, message: 'Password must be at least 8 characters' }
              ]}
            >
              <Input.Password />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="is_verified" valuePropName="checked" style={{ marginTop: isMobile ? 0 : 32 }}> <Checkbox>Is Verified</Checkbox> </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="bio" label="Bio"> <Input.TextArea rows={2} /> </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              label="Profile Image"
              required
              tooltip="Upload a profile image for the influencer"
            >
              {profileImagePreview && (
                <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Image src={profileImagePreview} width={96} height={96} style={{ objectFit: 'cover', borderRadius: 8 }} />
                  <Button
                    danger
                    size="small"
                    style={{ marginTop: 8 }}
                    disabled={profileImageUploading}
                    onClick={() => {
                      setProfileImagePreview(null);
                      form.setFieldsValue({ profile_image_url: undefined });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={file => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    setCropImage(e.target?.result as string);
                    setCropModalOpen(true);
                  };
                  reader.readAsDataURL(file);
                  return false;
                }}
                disabled={profileImageUploading}
              >
                <Button loading={profileImageUploading} disabled={profileImageUploading}>Choose Image</Button>
              </Upload>
              <Form.Item name="profile_image_url" style={{ display: 'none' }} rules={[{ required: true, message: 'Please upload a profile image' }]}> <Input type="hidden" /> </Form.Item>
              <AntdModal
                open={cropModalOpen}
                onCancel={() => setCropModalOpen(false)}
                onOk={async () => {
                  setProfileImageUploading(true);
                  try {
                    if (!cropImage || !croppedAreaPixels) return;
                    const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels);
                    const ext = 'jpg';
                    const filePath = `influencers/profile/${Date.now()}-cropped.jpg`;
                    const bucketName = 'influencer-profile';
                    // Get current user and role
                    const { data: userData } = await supabase.auth.getUser();
                    const userRole = userData?.user?.user_metadata?.role || 'unknown';
                    console.log('Uploading to bucket:', bucketName);
                    console.log('Full file path:', `${bucketName}/${filePath}`);
                    console.log('Current user role:', userRole);
                    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, croppedBlob, { upsert: true, contentType: 'image/jpeg' });
                    if (uploadError) {
                      console.error('Upload error details:', JSON.stringify(uploadError, null, 2));
                      throw uploadError;
                    }
                    const { data: publicUrlData, error: urlError } = supabase.storage.from(bucketName).getPublicUrl(filePath);
                    if (urlError) {
                      console.error('Public URL error:', JSON.stringify(urlError, null, 2));
                      throw urlError;
                    }
                    const url = publicUrlData?.publicUrl;
                    console.log('Public URL:', url);
                    if (url) {
                      form.setFieldsValue({ profile_image_url: url });
                      setProfileImagePreview(url);
                    }
                    setCropModalOpen(false);
                  } catch (err: any) {
                    console.error('Crop upload handler error:', err, JSON.stringify(err, null, 2));
                    message.error(
                      (err && (err.message || err.error_description || err.error)) ||
                      JSON.stringify(err) ||
                      'Failed to upload profile image'
                    );
                  } finally {
                    setProfileImageUploading(false);
                  }
                }}
                okText="Crop & Upload"
                cancelText="Cancel"
                width={400}
                destroyOnClose
              >
                {cropImage && (
                  <div style={{ position: 'relative', width: '100%', height: 300, background: '#222' }}>
                    <Cropper
                      image={cropImage}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={(_: any, croppedAreaPixels: any) => setCroppedAreaPixels(croppedAreaPixels)}
                    />
                  </div>
                )}
                <div style={{ marginTop: 16 }}>
                  <span>Zoom: </span>
                  <Slider min={1} max={3} step={0.1} value={zoom} onChange={setZoom} style={{ width: 200 }} />
                </div>
              </AntdModal>
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: 'Social Links',
      content: (
        <Form.List name="social_links">
          {(fields, { add, remove }) => (
            <div>
              <Typography.Text strong>Social Media Links</Typography.Text>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8, flexWrap: isMobile ? 'wrap' : 'nowrap' }} align="baseline">
                  <Form.Item {...restField} name={[name, 'platform_id']} rules={[{ required: true, message: 'Platform' }]} style={{ minWidth: 120 }}>
                    <Select placeholder="Platform">
                      {platforms.map((p: any) => (
                        <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'handle']} rules={[{ required: true, message: 'Handle' }]}> <Input placeholder="Handle" /> </Form.Item>
                  <Form.Item {...restField} name={[name, 'profile_url']} rules={[{ required: true, message: 'Profile URL' }]}> <Input placeholder="Profile URL" /> </Form.Item>
                  <Form.Item {...restField} name={[name, 'followers_count']} rules={[{ required: true, message: 'Followers' }]}> <Input type="number" placeholder="Followers" min={0} /> </Form.Item>
                  <Form.Item {...restField} name={[name, 'engagement_rate']} rules={[{ required: false }]}> <Input type="number" step="0.01" placeholder="Engagement %" min={0} max={100} /> </Form.Item>
                  <Button danger onClick={() => remove(name)} type="link">Remove</Button>
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block>Add Social Link</Button>
              </Form.Item>
            </div>
          )}
        </Form.List>
      ),
    },
    {
      title: 'Media',
      content: (
        <Form.Item label="Media (Images/Videos)">
          <Upload
            multiple
            accept="image/*,video/*"
            beforeUpload={() => false}
            fileList={mediaFiles}
            onChange={({ fileList }) => setMediaFiles(fileList)}
            listType="picture"
          >
            <Button icon={<UploadOutlined />}>Select Files</Button>
          </Upload>
        </Form.Item>
      ),
    },
  ];

  // Step field names for validation
  const stepFieldNames = [
    ["name", "email", "password", "bio", "profile_image_url", "is_verified"],
    ["social_links"],
    ["mediaFiles"] // Not a form field, but for completeness
  ];

  // Step navigation with validation
  const next = async () => {
    try {
      await form.validateFields(stepFieldNames[currentStep]);
      setCurrentStep((s) => s + 1);
    } catch (err) {
      // Validation errors are shown by AntD
    }
  };
  const prev = () => setCurrentStep((s) => s - 1);

  // Handler for profile image upload
  const handleProfileImageUpload = async (file: File) => {
    setProfileImageUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `influencers/profile/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('influencer-profile').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('influencer-profile').getPublicUrl(filePath);
      const url = publicUrlData?.publicUrl;
      if (url) {
        form.setFieldsValue({ profile_image_url: url });
        setProfileImagePreview(url);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to upload profile image');
    } finally {
      setProfileImageUploading(false);
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
              style={{ maxWidth: 520, margin: '0 auto', padding: isMobile ? 8 : 24 }}
            >
              {stepItems[currentStep].content}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 40 }}>
                {currentStep > 0 && <Button size="large" style={{ minWidth: 120 }} onClick={prev}>Previous</Button>}
                {currentStep < stepItems.length - 1 && <Button type="primary" size="large" style={{ minWidth: 120, marginLeft: 'auto' }} onClick={next}>Next</Button>}
                {currentStep === stepItems.length - 1 && <Button type="primary" size="large" style={{ minWidth: 120, marginLeft: 'auto' }} htmlType="submit" loading={formLoading}>Create</Button>}
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