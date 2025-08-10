import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Modal, Form, Input, Alert, Spin, message, Popconfirm, Upload } from 'antd';
import { AppstoreAddOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';

const { TextArea } = Input;

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [thumbnailFile, setThumbnailFile] = useState<any>(null);
  const [editThumbnailFile, setEditThumbnailFile] = useState<any>(null);
  const [iconFile, setIconFile] = useState<any>(null);
  const [editIconFile, setEditIconFile] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch categories from Supabase
  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('service_categories').select('*').order('created_at', { ascending: false });
    if (error) message.error(error.message);
    setCategories(data || []);
    setLoading(false);
  };
  useEffect(() => { fetchCategories(); }, [modalOpen, editModalOpen]);

  // Add Category handler
  const handleAddCategory = async (values: any) => {
    setFormLoading(true);
    setFormError(null);
    try {
      let thumb = values.thumb;
      let icon = values.icon;
      
      if (thumbnailFile) {
        const filePath = `thumbnails/${Date.now()}-${thumbnailFile.name}`;
        const { error: uploadError } = await supabase.storage.from('category').upload(filePath, thumbnailFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('category').getPublicUrl(filePath);
        thumb = publicUrlData?.publicUrl;
      }
      
      if (iconFile) {
        const filePath = `icons/${Date.now()}-${iconFile.name}`;
        const { error: uploadError } = await supabase.storage.from('category').upload(filePath, iconFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('category').getPublicUrl(filePath);
        icon = publicUrlData?.publicUrl;
      }
      
      const { error } = await supabase.from('service_categories').insert([
        {
          name: values.name,
          description: values.description,
          icon,
          thumb,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      message.success('Category added!');
      setModalOpen(false);
      form.resetFields();
      setThumbnailFile(null);
      setIconFile(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add category');
    } finally {
      setFormLoading(false);
    }
  };

  // Edit Category handler
  const handleEditCategory = async (values: any) => {
    setEditFormLoading(true);
    setEditFormError(null);
    try {
      let thumb = values.thumb;
      let icon = values.icon;
      
      if (editThumbnailFile) {
        const filePath = `thumbnails/${Date.now()}-${editThumbnailFile.name}`;
        const { error: uploadError } = await supabase.storage.from('category').upload(filePath, editThumbnailFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('category').getPublicUrl(filePath);
        thumb = publicUrlData?.publicUrl;
      }
      
      if (editIconFile) {
        const filePath = `icons/${Date.now()}-${editIconFile.name}`;
        const { error: uploadError } = await supabase.storage.from('category').upload(filePath, editIconFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('category').getPublicUrl(filePath);
        icon = publicUrlData?.publicUrl;
      }
      
      const { error } = await supabase.from('service_categories').update({
        name: values.name,
        description: values.description,
        icon,
        thumb,
      }).eq('id', editingCategory.id);
      if (error) throw error;
      message.success('Category updated!');
      setEditModalOpen(false);
      setEditingCategory(null);
      setEditThumbnailFile(null);
      setEditIconFile(null);
    } catch (err: any) {
      setEditFormError(err.message || 'Failed to update category');
    } finally {
      setEditFormLoading(false);
    }
  };

  // Delete Category handler
  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from('service_categories').delete().eq('id', id);
      if (error) throw error;
      message.success('Category deleted!');
      fetchCategories();
    } catch (err: any) {
      message.error(err.message || 'Failed to delete category');
    }
  };

  const columns = [
    { 
      title: 'Thumbnail', 
      dataIndex: 'thumb', 
      key: 'thumb', 
      render: (url: string) => url ? <img src={url} alt="thumbnail" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: '4px' }} /> : '-' 
    },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { 
      title: 'Icon', 
      dataIndex: 'icon', 
      key: 'icon', 
      render: (icon: string) => icon ? <img src={icon} alt="icon" style={{ width: 32, height: 32, objectFit: 'contain' }} /> : '-' 
    },
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <span>
          <Button icon={<EditOutlined />} size="small" style={{ marginRight: 8 }} onClick={() => {
            setEditingCategory(record);
            setEditModalOpen(true);
            editForm.setFieldsValue({ 
              name: record.name, 
              description: record.description, 
              icon: record.icon,
              thumb: record.thumb 
            });
            setEditThumbnailFile(null);
            setEditIconFile(null);
          }}>Edit</Button>
          <Popconfirm title="Delete this category?" onConfirm={() => handleDeleteCategory(record.id)} okText="Yes" cancelText="No">
            <Button icon={<DeleteOutlined />} size="small" danger>Delete</Button>
          </Popconfirm>
        </span>
      ),
    },
  ];

  const filteredCategories = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

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
        <Typography.Title level={4} style={{ margin: 0 }}>Service Categories</Typography.Title>
        <Button type="primary" icon={<AppstoreAddOutlined />} onClick={() => { setModalOpen(true); form.resetFields(); }}>
          Add Category
        </Button>
      </div>
      <Input.Search
        placeholder="Search categories"
        allowClear
        style={{ width: 300, marginBottom: 16 }}
        value={search}
        onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
      />
      {loading ? <Spin size="large" /> : (
        <Table
          columns={columns}
          dataSource={filteredCategories}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total: filteredCategories.length,
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size || 10); },
            showSizeChanger: true,
          }}
        />
      )}
      {/* Add Modal */}
      <Modal
        title="Add Category"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setThumbnailFile(null); form.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        {formError && <Alert message={formError} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form form={form} layout="vertical" onFinish={handleAddCategory}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a category name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a category description' }]}
          >
            <TextArea rows={3} />
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
        title="Edit Category"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingCategory(null); setEditThumbnailFile(null); }}
        footer={null}
        destroyOnClose
      >
        {editFormError && <Alert message={editFormError} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form form={editForm} layout="vertical" onFinish={handleEditCategory}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter a category name' }]}> <Input autoFocus /> </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please enter a category description' }]}> <TextArea rows={3} /> </Form.Item>
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
            {(editIconFile || editForm.getFieldValue('icon')) && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={editIconFile ? URL.createObjectURL(editIconFile) : editForm.getFieldValue('icon')}
                  alt="icon"
                  style={{ width: 32, height: 32, objectFit: 'contain' }}
                />
              </div>
            )}
          </Form.Item>
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
            {(editThumbnailFile || editForm.getFieldValue('thumb')) && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={editThumbnailFile ? URL.createObjectURL(editThumbnailFile) : editForm.getFieldValue('thumb')}
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