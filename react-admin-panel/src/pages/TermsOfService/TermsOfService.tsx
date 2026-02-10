import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Alert, Spin, message } from 'antd';
import { EditOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import { termsOfServiceService, TermsOfServiceSection } from '@/services/legalSupportService';

const { Title, Paragraph } = Typography;

export default function TermsOfService() {
  const [sections, setSections] = useState<TermsOfServiceSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Load terms of service sections from database
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const data = await termsOfServiceService.getAllSections();
        setSections(data);
      } catch (error) {
        message.error('Failed to load terms of service sections');
        console.error('Error fetching terms sections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  const handleEdit = (section: TermsOfServiceSection) => {
    setEditingId(section.id);
    setEditContent(section.content);
  };

  const handleSave = async () => {
    if (!editingId) return;

    setSaving(true);
    try {
      await termsOfServiceService.updateSection(editingId, {
        content: editContent,
        last_updated: new Date().toISOString()
      });
      
      // Refresh the data
      const updatedData = await termsOfServiceService.getAllSections();
      setSections(updatedData);
      
      setEditingId(null);
      setEditContent('');
      message.success('Terms of service section updated successfully!');
    } catch (error) {
      message.error('Failed to save changes');
      console.error('Error updating terms section:', error);
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
      <Title level={2} style={{ color: '#000' }}>إدارة شروط الخدمة</Title>
      <Paragraph style={{ color: '#333' }}>
        إدارة محتوى شروط الخدمة الخاصة بك. تغطي هذه الشروط الشاملة جميع جوانب استخدام المنصة وحقوق المستخدمين والالتزامات القانونية.
      </Paragraph>

      <Alert
        message="إدارة شروط الخدمة"
        description="قم بتعديل أقسام شروط الخدمة الخاصة بك. يمكن تخصيص كل قسم بمحتوى HTML. يتم حفظ التغييرات في قاعدة البيانات."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {sections.map((section) => (
          <Card
            key={section.id}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{section.title}</span>
                <Space>
                  <small style={{ color: '#666' }}>
                    آخر تحديث: {new Date(section.last_updated).toLocaleDateString()}
                  </small>
                  {editingId !== section.id && (
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => handleEdit(section)}
                      style={{ backgroundColor: '#000', borderColor: '#000' }}
                    >
                      تعديل
                    </Button>
                  )}
                </Space>
              </div>
            }
            style={{ width: '100%' }}
          >
            {editingId === section.id ? (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#000' }}>
                    محتوى HTML:
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
                    placeholder="أدخل محتوى HTML هنا..."
                  />
                </div>
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={handleSave}
                    style={{ backgroundColor: '#000', borderColor: '#000' }}
                  >
                    حفظ التغييرات
                  </Button>
                  <Button
                    icon={<UndoOutlined />}
                    onClick={handleCancel}
                    style={{ color: '#000', borderColor: '#000' }}
                  >
                    إلغاء
                  </Button>
                </Space>
              </div>
            ) : (
              <div
                dangerouslySetInnerHTML={{ __html: section.content }}
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


