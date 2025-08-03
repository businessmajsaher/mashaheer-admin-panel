import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Modal, Form, Input, Alert, Spin, message, Popconfirm, Upload } from 'antd';
import { AppstoreAddOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';

export default function Platforms() {
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
  const [editingPlatform, setEditingPlatform] = useState<any>(null);
  const [iconFile, setIconFile] = useState<any>(null);
  const [editIconFile, setEditIconFile] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch platforms from Supabase
  const fetchPlatforms = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('social_media_platforms').select('*').order('created_at', { ascending: false });
    if (error) message.error(error.message);
    setPlatforms(data || []);
    setLoading(false);
  };
  useEffect(() => { fetchPlatforms(); }, [modalOpen, editModalOpen]);

  // Add Platform handler
  const handleAddPlatform = async (values: any) => {
    setFormLoading(true);
    setFormError(null);
    try {
      let icon_url = values.icon_url;
      if (iconFile) {
        const filePath = `platform-icons/${Date.now()}-${iconFile.name}`;
        const { error: uploadError } = await supabase.storage.from('platforms').upload(filePath, iconFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('platforms').getPublicUrl(filePath);
        icon_url = publicUrlData?.publicUrl;
      }
      const { error } = await supabase.from('social_media_platforms').insert([
        {
          name: values.name,
          icon_url,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      message.success('Platform added!');
      setModalOpen(false);
      form.resetFields();
      setIconFile(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add platform');
    } finally {
      setFormLoading(false);
    }
  };

  // Edit Platform handler
  const handleEditPlatform = async (values: any) => {
    setEditFormLoading(true);
    setEditFormError(null);
    try {
      let icon_url = values.icon_url;
      if (editIconFile) {
        const filePath = `platform-icons/${Date.now()}-${editIconFile.name}`;
        const { error: uploadError } = await supabase.storage.from('platforms').upload(filePath, editIconFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('platforms').getPublicUrl(filePath);
        icon_url = publicUrlData?.publicUrl;
      }
      const { error } = await supabase.from('social_media_platforms').update({
        name: values.name,
        icon_url,
      }).eq('id', editingPlatform.id);
      if (error) throw error;
      message.success('Platform updated!');
      setEditModalOpen(false);
      setEditingPlatform(null);
      setEditIconFile(null);
    } catch (err: any) {
      setEditFormError(err.message || 'Failed to update platform');
    } finally {
      setEditFormLoading(false);
    }
  };

  // Delete Platform handler
  const handleDeletePlatform = async (id: string) => {
    try {
      const { error } = await supabase.from('social_media_platforms').delete().eq('id', id);
      if (error) throw error;
      message.success('Platform deleted!');
      fetchPlatforms();
    } catch (err: any) {
      message.error(err.message || 'Failed to delete platform');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Icon', dataIndex: 'icon_url', key: 'icon_url', render: (url: string) => url ? <img src={url} alt="icon" style={{ width: 32, height: 32, objectFit: 'contain' }} /> : '-' },
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <span>
          <Button icon={<EditOutlined />} size="small" style={{ marginRight: 8 }} onClick={() => {
            setEditingPlatform(record);
            setEditModalOpen(true);
            editForm.setFieldsValue({ name: record.name, icon_url: record.icon_url });
            setEditIconFile(null);
          }}>Edit</Button>
          <Popconfirm title="Delete this platform?" onConfirm={() => handleDeletePlatform(record.id)} okText="Yes" cancelText="No">
            <Button icon={<DeleteOutlined />} size="small" danger>Delete</Button>
          </Popconfirm>
        </span>
      ),
    },
  ];

  const filteredPlatforms = platforms.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  // Helper to compress and resize image
  async function compressAndResizeImage(file: File, maxSize = 100, quality = 0.7): Promise<{ blob: Blob, type: string, ext: string }> {
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
        <Typography.Title level={4} style={{ margin: 0 }}>Platforms</Typography.Title>
        <Button type="primary" icon={<AppstoreAddOutlined />} onClick={() => { setModalOpen(true); form.resetFields(); }}>
          Add Platform
        </Button>
      </div>
      <Input.Search
        placeholder="Search platforms"
        allowClear
        style={{ width: 300, marginBottom: 16 }}
        value={search}
        onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
      />
      {loading ? <Spin size="large" /> : (
        <Table
          columns={columns}
          dataSource={filteredPlatforms}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total: filteredPlatforms.length,
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size || 10); },
            showSizeChanger: true,
          }}
        />
      )}
      {/* Add Modal */}
      <Modal
        title="Add Platform"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setIconFile(null); form.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        {formError && <Alert message={formError} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form form={form} layout="vertical" onFinish={handleAddPlatform}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a platform name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Icon">
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
                  const { blob, type, ext } = await compressAndResizeImage(file, 100, 0.7);
                  if (blob.size > 200 * 1024) {
                    message.error('Icon must be less than 200KB after compression.');
                    return false;
                  }
                  setIconFile(new File([blob], file.name.replace(/\.[^.]+$/, ext), { type }));
                } catch (err) {
                  message.error('Failed to process image.');
                  return false;
                }
                return false;
              }}
              style={{ marginTop: 8 }}
            >
              <Button icon={<UploadOutlined />}>Upload Icon</Button>
            </Upload>
            {iconFile && <div style={{ marginTop: 8 }}><img src={URL.createObjectURL(iconFile)} alt="icon" style={{ width: 32, height: 32, objectFit: 'contain' }} /></div>}
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={formLoading}>Add</Button>
          </Form.Item>
        </Form>
      </Modal>
      {/* Edit Modal */}
      <Modal
        title="Edit Platform"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingPlatform(null); setEditIconFile(null); }}
        footer={null}
        destroyOnClose
      >
        {editFormError && <Alert message={editFormError} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form form={editForm} layout="vertical" onFinish={handleEditPlatform}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter a platform name' }]}> <Input autoFocus /> </Form.Item>
          <Form.Item label="Icon">
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
                  const { blob, type, ext } = await compressAndResizeImage(file, 100, 0.7);
                  if (blob.size > 200 * 1024) {
                    message.error('Icon must be less than 200KB after compression.');
                    return false;
                  }
                  setEditIconFile(new File([blob], file.name.replace(/\.[^.]+$/, ext), { type }));
                } catch (err) {
                  message.error('Failed to process image.');
                  return false;
                }
                return false;
              }}
              style={{ marginTop: 8 }}
            >
              <Button icon={<UploadOutlined />}>Upload Icon</Button>
            </Upload>
            {(editIconFile || editForm.getFieldValue('icon_url')) && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={editIconFile ? URL.createObjectURL(editIconFile) : editForm.getFieldValue('icon_url')}
                  alt="icon"
                  style={{ width: 32, height: 32, objectFit: 'contain' }}
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