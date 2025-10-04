import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Alert, Spin, message } from 'antd';
import { EditOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import { legalNoticesService, LegalNotice } from '@/services/legalSupportService';

const { Title, Paragraph } = Typography;

export default function LegalNotices() {
  const [contents, setContents] = useState<LegalNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Load legal notices from mock service
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const data = await legalNoticesService.getAllNotices();
        setContents(data);
      } catch (error) {
        message.error('Failed to load legal notices');
        console.error('Error fetching legal notices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, []);

  const handleEdit = (content: LegalNotice) => {
    setEditingId(content.id);
    setEditContent(content.content);
  };

  const handleSave = async () => {
    if (!editingId) return;

    setSaving(true);
    try {
      await legalNoticesService.updateNotice(editingId, {
        content: editContent,
        last_updated: new Date().toISOString()
      });
      
      // Refresh the data
      const updatedData = await legalNoticesService.getAllNotices();
      setContents(updatedData);
      
      setEditingId(null);
      setEditContent('');
      message.success('Legal notice updated successfully!');
    } catch (error) {
      message.error('Failed to save changes');
      console.error('Error updating legal notice:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>Legal Notices</Title>
      <Paragraph>
        Manage legal notices and disclaimers displayed to users. These notices help protect your platform and inform users about important legal information.
      </Paragraph>

      <Alert
        message="Legal Notice Management"
        description="You can edit the HTML content of each legal notice below. Changes are saved automatically to local storage for this demo. In production, this would connect to your backend database."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {contents.map((content) => (
          <Card
            key={content.id}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{content.title}</span>
                <Space>
                  <small style={{ color: '#666' }}>
                    Last updated: {new Date(content.last_updated).toLocaleDateString()}
                  </small>
                  {editingId !== content.id && (
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => handleEdit(content)}
                    >
                      Edit
                    </Button>
                  )}
                </Space>
              </div>
            }
            style={{ width: '100%' }}
          >
            {editingId === content.id ? (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                    HTML Content:
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{
                      width: '100%',
                      height: '300px',
                      padding: '12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                    placeholder="Enter HTML content here..."
                  />
                </div>
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={handleSave}
                  >
                    Save Changes
                  </Button>
                  <Button
                    icon={<UndoOutlined />}
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </Space>
              </div>
            ) : (
              <div
                dangerouslySetInnerHTML={{ __html: content.content }}
                style={{
                  lineHeight: '1.6',
                  color: '#333'
                }}
              />
            )}
          </Card>
        ))}
      </Space>
    </div>
  );
}


