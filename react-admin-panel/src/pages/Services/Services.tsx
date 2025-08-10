import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Modal, Form, Input, Alert, Spin, message, Popconfirm, Upload, Select, Switch, DatePicker, InputNumber, Divider, Row, Col } from 'antd';
import { AppstoreAddOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [thumbnailFile, setThumbnailFile] = useState<any>(null);
  const [editThumbnailFile, setEditThumbnailFile] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');
  const [filters, setFilters] = useState({
    category_id: undefined,
    service_type: undefined,
    primary_influencer_id: undefined
  });

  // Debug function to log Supabase client state
  const debugSupabaseState = async () => {
    console.log('🔍 === SUPABASE DEBUG INFO ===');
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Supabase Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Current Session:', sessionData);
      
      const { data: userData } = await supabase.auth.getUser();
      console.log('Current User:', userData);
      
      // Test basic connection
      const { data: testData, error: testError } = await supabase
        .from('social_media_platforms')
        .select('count', { count: 'exact', head: true });
      console.log('Platforms Test Query:', { data: testData, error: testError });
      
    } catch (error) {
      console.error('Debug Error:', error);
    }
    console.log('🔍 === END DEBUG INFO ===');
  };

  // Fetch services from Supabase
  const fetchServices = async () => {
    console.log('🔄 Fetching services...');
    setLoading(true);
    try {
      let query = supabase.from('services').select('*').order('created_at', { ascending: false });
      
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters.service_type) {
        query = query.eq('service_type', filters.service_type);
      }
      if (filters.primary_influencer_id) {
        query = query.eq('primary_influencer_id', filters.primary_influencer_id);
      }
      
      console.log('🔍 Services query:', query);
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Services fetch error:', error);
        message.error(error.message);
      } else {
        console.log('✅ Services fetched successfully:', data?.length || 0, 'services');
      }
      
      setServices(data || []);
    } catch (err) {
      console.error('❌ Services fetch exception:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories from Supabase
  const fetchCategories = async () => {
    console.log('🔄 Fetching categories...');
    try {
      const { data, error } = await supabase.from('service_categories').select('*').order('name');
      if (error) {
        console.error('❌ Categories fetch error:', error);
        message.error(error.message);
      } else {
        console.log('✅ Categories fetched successfully:', data?.length || 0, 'categories');
      }
      setCategories(data || []);
    } catch (err) {
      console.error('❌ Categories fetch exception:', err);
    }
  };

  // Fetch influencers from Supabase
  const fetchInfluencers = async () => {
    console.log('🔄 Fetching influencers...');
    try {
      const { data, error } = await supabase.from('profiles').select('id, name, email').eq('role', 'influencer').order('name');
      if (error) {
        console.error('❌ Influencers fetch error:', error);
        message.error(error.message);
      } else {
        console.log('✅ Influencers fetched successfully:', data?.length || 0, 'influencers');
      }
      setInfluencers(data || []);
    } catch (err) {
      console.error('❌ Influencers fetch exception:', err);
    }
  };

  // Fetch platforms from Supabase
  const fetchPlatforms = async () => {
    console.log('🔄 Fetching platforms...');
    try {
      const { data, error } = await supabase.from('social_media_platforms').select('*').order('name');
      if (error) {
        console.error('❌ Platforms fetch error:', error);
        message.error(error.message);
      } else {
        console.log('✅ Platforms fetched successfully:', data?.length || 0, 'platforms');
      }
      setPlatforms(data || []);
    } catch (err) {
      console.error('❌ Platforms fetch exception:', err);
    }
  };

  useEffect(() => { 
    console.log('🚀 Services component mounted, fetching data...');
    debugSupabaseState();
    fetchServices(); 
    fetchCategories();
    fetchInfluencers();
    fetchPlatforms();
  }, [modalOpen, editModalOpen, filters]);

  // Add Service handler
  const handleAddService = async (values: any) => {
    console.log('🔄 Adding service with values:', values);
    setFormLoading(true);
    setFormError(null);
    try {
      let thumbnail = values.thumbnail;
      if (thumbnailFile) {
        console.log('📁 Uploading thumbnail file:', thumbnailFile.name);
        const filePath = `thumbnails/${Date.now()}-${thumbnailFile.name}`;
        const { error: uploadError } = await supabase.storage.from('services').upload(filePath, thumbnailFile, { upsert: true });
        if (uploadError) {
          console.error('❌ Thumbnail upload error:', uploadError);
          throw uploadError;
        }
        const { data: publicUrlData } = supabase.storage.from('services').getPublicUrl(filePath);
        thumbnail = publicUrlData?.publicUrl;
        console.log('✅ Thumbnail uploaded successfully:', thumbnail);
      }
      
      const serviceData = {
        title: values.title,
        description: values.description,
        thumbnail,
        min_duration_days: values.min_duration_days,
        is_flash_deal: values.is_flash_deal || false,
        flash_from: values.flash_from?.toISOString(),
        flash_to: values.flash_to?.toISOString(),
        location_required: values.location_required || false,
        about_us: values.about_us,
        service_type: values.service_type,
        primary_influencer_id: values.primary_influencer_id,
        invited_influencer_id: values.invited_influencer_id,
        category_id: values.category_id,
        platform_id: values.platform_id,
        created_at: new Date().toISOString(),
      };
      
      console.log('📝 Inserting service data:', serviceData);
      const { error } = await supabase.from('services').insert([serviceData]);
      
      if (error) {
        console.error('❌ Service insert error:', error);
        throw error;
      }
      
      console.log('✅ Service added successfully!');
      message.success('Service added!');
      setModalOpen(false);
      form.resetFields();
      setThumbnailFile(null);
    } catch (err: any) {
      console.error('❌ Service add exception:', err);
      setFormError(err.message || 'Failed to add service');
    } finally {
      setFormLoading(false);
    }
  };

  // Edit Service handler
  const handleEditService = async (values: any) => {
    setEditFormLoading(true);
    setEditFormError(null);
    try {
      let thumbnail = values.thumbnail;
      if (editThumbnailFile) {
        const filePath = `thumbnails/${Date.now()}-${editThumbnailFile.name}`;
        const { error: uploadError } = await supabase.storage.from('services').upload(filePath, editThumbnailFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('services').getPublicUrl(filePath);
        thumbnail = publicUrlData?.publicUrl;
      }
      
      const { error } = await supabase.from('services').update({
        title: values.title,
        description: values.description,
        thumbnail,
        min_duration_days: values.min_duration_days,
        is_flash_deal: values.is_flash_deal || false,
        flash_from: values.flash_from?.toISOString(),
        flash_to: values.flash_to?.toISOString(),
        location_required: values.location_required || false,
        about_us: values.about_us,
        service_type: values.service_type,
        primary_influencer_id: values.primary_influencer_id,
        invited_influencer_id: values.invited_influencer_id,
        category_id: values.category_id,
        platform_id: values.platform_id,
      }).eq('id', editingService.id);
      if (error) throw error;
      message.success('Service updated!');
      setEditModalOpen(false);
      setEditingService(null);
      setEditThumbnailFile(null);
    } catch (err: any) {
      setEditFormError(err.message || 'Failed to update service');
    } finally {
      setEditFormLoading(false);
    }
  };

  // Delete Service handler
  const handleDeleteService = async (id: string) => {
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      message.success('Service deleted!');
      fetchServices();
    } catch (err: any) {
      message.error(err.message || 'Failed to delete service');
    }
  };

  const columns = [
    { 
      title: 'Thumbnail', 
      dataIndex: 'thumbnail', 
      key: 'thumbnail', 
      render: (url: string) => url ? <img src={url} alt="thumbnail" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '4px' }} /> : '-' 
    },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { 
      title: 'Type', 
      dataIndex: 'service_type', 
      key: 'service_type',
      render: (type: string) => (
        <span style={{ 
          color: type === 'flash' ? '#ff4d4f' : type === 'dual' ? '#1890ff' : '#52c41a',
          fontWeight: 'bold'
        }}>
          {type?.toUpperCase() || '-'}
        </span>
      )
    },
    { 
      title: 'Duration', 
      dataIndex: 'min_duration_days', 
      key: 'min_duration_days',
      render: (days: number) => days ? `${days} days` : '-'
    },
    { 
      title: 'Flash Deal', 
      dataIndex: 'is_flash_deal', 
      key: 'is_flash_deal',
      render: (isFlash: boolean) => (
        <span style={{ 
          color: isFlash ? '#ff4d4f' : '#8c8c8c',
          fontWeight: 'bold'
        }}>
          {isFlash ? 'Yes' : 'No'}
        </span>
      )
    },
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <span>
          <Button icon={<EditOutlined />} size="small" style={{ marginRight: 8 }} onClick={() => {
            setEditingService(record);
            setEditModalOpen(true);
            editForm.setFieldsValue({ 
              title: record.title,
              description: record.description,
              thumbnail: record.thumbnail,
              min_duration_days: record.min_duration_days,
              is_flash_deal: record.is_flash_deal,
              flash_from: record.flash_from ? dayjs(record.flash_from) : null,
              flash_to: record.flash_to ? dayjs(record.flash_to) : null,
              location_required: record.location_required,
              about_us: record.about_us,
              service_type: record.service_type,
              primary_influencer_id: record.primary_influencer_id,
              invited_influencer_id: record.invited_influencer_id,
              category_id: record.category_id,
              platform_id: record.platform_id
            });
            setEditThumbnailFile(null);
            setSelectedServiceType(record.service_type);
          }}>Edit</Button>
          <Popconfirm title="Delete this service?" onConfirm={() => handleDeleteService(record.id)} okText="Yes" cancelText="No">
            <Button icon={<DeleteOutlined />} size="small" danger>Delete</Button>
          </Popconfirm>
        </span>
      ),
    },
  ];

  const filteredServices = services.filter((s) => s.title?.toLowerCase().includes(search.toLowerCase()));

  // Helper to compress and resize image
  async function compressAndResizeImage(file: File, maxSize = 200, quality = 0.7): Promise<{ blob: Blob, type: string, ext: string }> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height *= maxSize / width));
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width *= maxSize / height));
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Use PNG if original is PNG, else JPEG
        const isPng = file.type === 'image/png';
        const outType = isPng ? 'image/png' : 'image/jpeg';
        const outExt = isPng ? '.png' : '.jpg';
        canvas.toBlob(
          (blob) => {
            if (blob) resolve({ blob, type: outType, ext: outExt });
            else reject(new Error('Image compression failed'));
          },
          outType,
          quality
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  return (
    <Card style={{ margin: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Services</Typography.Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button 
            type="default" 
            onClick={debugSupabaseState}
            style={{ borderColor: '#1890ff', color: '#1890ff' }}
          >
            🔍 Debug Supabase
          </Button>
          <Button type="primary" icon={<AppstoreAddOutlined />} onClick={() => { setModalOpen(true); form.resetFields(); }}>
            Add Service
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Select
            placeholder="Filter by category"
            style={{ width: '100%' }}
            allowClear
            onChange={(value) => setFilters(prev => ({ ...prev, category_id: value }))}
          >
            {categories.map(cat => (
              <Option key={cat.id} value={cat.id}>{cat.name}</Option>
            ))}
          </Select>
        </Col>
        <Col span={6}>
          <Select
            placeholder="Filter by type"
            style={{ width: '100%' }}
            allowClear
            onChange={(value) => setFilters(prev => ({ ...prev, service_type: value }))}
          >
            <Option value="normal">Normal</Option>
            <Option value="dual">Dual</Option>
            <Option value="flash">Flash</Option>
          </Select>
        </Col>
        <Col span={6}>
          <Input.Search
            placeholder="Search services"
            allowClear
            style={{ width: '100%' }}
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </Col>
      </Row>
      
      {loading ? <Spin size="large" /> : (
        <Table
          columns={columns}
          dataSource={filteredServices}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total: filteredServices.length,
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size || 10); },
            showSizeChanger: true,
          }}
        />
      )}
      
      {/* Add Modal */}
      <Modal
        title="Add Service"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setThumbnailFile(null); form.resetFields(); }}
        footer={null}
        destroyOnClose
        width={800}
      >
        {formError && <Alert message={formError} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form form={form} layout="vertical" onFinish={handleAddService}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="Title"
                rules={[{ required: true, message: 'Please enter service title' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="service_type"
                label="Service Type"
                rules={[{ required: true, message: 'Please select service type' }]}
              >
                <Select 
                  placeholder="Select service type"
                  onChange={(value) => setSelectedServiceType(value)}
                >
                  <Option value="normal">Normal</Option>
                  <Option value="dual">Dual</Option>
                  <Option value="flash">Flash</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter service description' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="min_duration_days"
                label="Minimum Duration (Days)"
                rules={[{ required: true, message: 'Please enter minimum duration' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category_id"
                label="Category"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select placeholder="Select category">
                  {categories.map(cat => (
                    <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

                     <Row gutter={16}>
             <Col span={12}>
               <Form.Item
                 name="primary_influencer_id"
                 label="Primary Influencer"
                 rules={[{ required: true, message: 'Please select primary influencer' }]}
               >
                 <Select placeholder="Select primary influencer">
                   {influencers.map(influencer => (
                     <Option key={influencer.id} value={influencer.id}>
                       {influencer.name} ({influencer.email})
                     </Option>
                   ))}
                 </Select>
               </Form.Item>
             </Col>
             <Col span={12}>
               {selectedServiceType === 'dual' && (
                 <Form.Item
                   name="invited_influencer_id"
                   label="Invited Influencer"
                 >
                   <Select placeholder="Select invited influencer" allowClear>
                     {influencers.map(influencer => (
                       <Option key={influencer.id} value={influencer.id}>
                         {influencer.name} ({influencer.email})
                       </Option>
                     ))}
                   </Select>
                 </Form.Item>
               )}
             </Col>
           </Row>

                     <Row gutter={16}>
             <Col span={12}>
               <Form.Item
                 name="platform_id"
                 label="Platform"
                 rules={[{ required: true, message: 'Please select platform' }]}
               >
                 <Select placeholder="Select platform">
                   {platforms.map(platform => (
                     <Option key={platform.id} value={platform.id}>
                       {platform.name}
                     </Option>
                   ))}
                 </Select>
               </Form.Item>
             </Col>
             <Col span={12}>
               <Form.Item
                 name="location_required"
                 label="Location Required"
                 valuePropName="checked"
               >
                 <Switch />
               </Form.Item>
             </Col>
           </Row>

                     <Row gutter={16}>
             <Col span={12}>
               <Form.Item
                 name="is_flash_deal"
                 label="Is Flash Deal"
                 valuePropName="checked"
               >
                 <Switch />
               </Form.Item>
             </Col>
           </Row>

           {form.getFieldValue('is_flash_deal') && (
             <>
               <Divider>Flash Deal Settings</Divider>
               <Row gutter={16}>
                 <Col span={12}>
                   <Form.Item
                     name="flash_from"
                     label="Flash Deal From"
                     rules={[{ required: true, message: 'Please select flash deal start date' }]}
                   >
                     <DatePicker showTime style={{ width: '100%' }} />
                   </Form.Item>
                 </Col>
                 <Col span={12}>
                   <Form.Item
                     name="flash_to"
                     label="Flash Deal To"
                     rules={[{ required: true, message: 'Please select flash deal end date' }]}
                   >
                     <DatePicker showTime style={{ width: '100%' }} />
                   </Form.Item>
                 </Col>
               </Row>
             </>
           )}

                     {selectedServiceType === 'dual' && (
             <Form.Item
               name="about_us"
               label="About Us"
             >
               <TextArea rows={3} />
             </Form.Item>
           )}

          <Form.Item label="Thumbnail">
            <Upload
              accept="image/jpeg,image/png"
              showUploadList={false}
              beforeUpload={async (file) => {
                if (!file.type.startsWith('image/')) {
                  message.error('Only image files are allowed.');
                  return false;
                }
                // Compress and resize
                try {
                  const { blob, type, ext } = await compressAndResizeImage(file, 200, 0.7);
                  if (blob.size > 500 * 1024) {
                    message.error('Thumbnail must be less than 500KB after compression.');
                    return false;
                  }
                  setThumbnailFile(new File([blob], file.name.replace(/\.[^.]+$/, ext), { type }));
                } catch (err) {
                  message.error('Failed to process image.');
                  return false;
                }
                return false;
              }}
              style={{ marginTop: 8 }}
            >
              <Button icon={<UploadOutlined />}>Upload Thumbnail</Button>
            </Upload>
            {thumbnailFile && <div style={{ marginTop: 8 }}><img src={URL.createObjectURL(thumbnailFile)} alt="thumbnail" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '4px' }} /></div>}
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={formLoading}>Add</Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Edit Modal */}
      <Modal
        title="Edit Service"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingService(null); setEditThumbnailFile(null); }}
        footer={null}
        destroyOnClose
        width={800}
      >
        {editFormError && <Alert message={editFormError} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form form={editForm} layout="vertical" onFinish={handleEditService}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please enter service title' }]}> <Input autoFocus /> </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="service_type" label="Service Type" rules={[{ required: true, message: 'Please select service type' }]}>
                <Select 
                  placeholder="Select service type"
                  onChange={(value) => setSelectedServiceType(value)}
                >
                  <Option value="normal">Normal</Option>
                  <Option value="dual">Dual</Option>
                  <Option value="flash">Flash</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please enter service description' }]}> <TextArea rows={3} /> </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="min_duration_days" label="Minimum Duration (Days)" rules={[{ required: true, message: 'Please enter minimum duration' }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category_id" label="Category" rules={[{ required: true, message: 'Please select category' }]}>
                <Select placeholder="Select category">
                  {categories.map(cat => (
                    <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

                     <Row gutter={16}>
             <Col span={12}>
               <Form.Item name="primary_influencer_id" label="Primary Influencer" rules={[{ required: true, message: 'Please select primary influencer' }]}>
                 <Select placeholder="Select primary influencer">
                   {influencers.map(influencer => (
                     <Option key={influencer.id} value={influencer.id}>
                       {influencer.name} ({influencer.email})
                     </Option>
                   ))}
                 </Select>
               </Form.Item>
             </Col>
             <Col span={12}>
               {selectedServiceType === 'dual' && (
                 <Form.Item name="invited_influencer_id" label="Invited Influencer">
                   <Select placeholder="Select invited influencer" allowClear>
                     {influencers.map(influencer => (
                       <Option key={influencer.id} value={influencer.id}>
                         {influencer.name} ({influencer.email})
                       </Option>
                     ))}
                   </Select>
                 </Form.Item>
               )}
             </Col>
           </Row>

                     <Row gutter={16}>
             <Col span={12}>
               <Form.Item name="platform_id" label="Platform" rules={[{ required: true, message: 'Please select platform' }]}>
                 <Select placeholder="Select platform">
                   {platforms.map(platform => (
                     <Option key={platform.id} value={platform.id}>
                       {platform.name}
                     </Option>
                   ))}
                 </Select>
               </Form.Item>
             </Col>
             <Col span={12}>
               <Form.Item name="location_required" label="Location Required" valuePropName="checked"> <Switch /> </Form.Item>
             </Col>
           </Row>

          <Divider>Flash Deal Settings</Divider>

                     <Row gutter={16}>
             <Col span={12}>
               <Form.Item name="is_flash_deal" label="Is Flash Deal" valuePropName="checked"> <Switch /> </Form.Item>
             </Col>
           </Row>

           {editForm.getFieldValue('is_flash_deal') && (
             <>
               <Divider>Flash Deal Settings</Divider>
               <Row gutter={16}>
                 <Col span={12}>
                   <Form.Item name="flash_from" label="Flash Deal From" rules={[{ required: true, message: 'Please select flash deal start date' }]}> <DatePicker showTime style={{ width: '100%' }} /> </Form.Item>
                 </Col>
                 <Col span={12}>
                   <Form.Item name="flash_to" label="Flash Deal To" rules={[{ required: true, message: 'Please select flash deal end date' }]}> <DatePicker showTime style={{ width: '100%' }} /> </Form.Item>
                 </Col>
               </Row>
             </>
           )}

                     {selectedServiceType === 'dual' && (
             <Form.Item name="about_us" label="About Us"> <TextArea rows={3} /> </Form.Item>
           )}

          <Form.Item label="Thumbnail">
            <Upload
              accept="image/jpeg,image/png"
              showUploadList={false}
              beforeUpload={async (file) => {
                if (!file.type.startsWith('image/')) {
                  message.error('Only image files are allowed.');
                  return false;
                }
                // Compress and resize
                try {
                  const { blob, type, ext } = await compressAndResizeImage(file, 200, 0.7);
                  if (blob.size > 500 * 1024) {
                    message.error('Thumbnail must be less than 500KB after compression.');
                    return false;
                  }
                  setEditThumbnailFile(new File([blob], file.name.replace(/\.[^.]+$/, ext), { type }));
                } catch (err) {
                  message.error('Failed to process image.');
                  return false;
                }
                return false;
              }}
              style={{ marginTop: 8 }}
            >
              <Button icon={<UploadOutlined />}>Upload Thumbnail</Button>
            </Upload>
            {(editThumbnailFile || editForm.getFieldValue('thumbnail')) && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={editThumbnailFile ? URL.createObjectURL(editThumbnailFile) : editForm.getFieldValue('thumbnail')}
                  alt="thumbnail"
                  style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '4px' }}
                />
              </div>
            )}
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={editFormLoading}>Update</Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
} 