import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Alert, Spin, message, Collapse, Input, Row, Col, Tag, Divider, Select, Modal, Form, Popconfirm } from 'antd';
import { EditOutlined, SaveOutlined, UndoOutlined, SearchOutlined, QuestionCircleOutlined, BookOutlined, VideoCameraOutlined, FileTextOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { helpSupportService, faqService, HelpSection, FAQItem } from '@/services/legalSupportService';
import { ProtectedButton } from '@/components/ProtectedButton';
import { PermissionGuard } from '@/components/PermissionGuard';

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;
const { Search } = Input;
const { Option } = Select;

export default function HelpSupport() {
  const [helpSections, setHelpSections] = useState<HelpSection[]>([]);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [faqForm] = Form.useForm();

  const categories = [
    { key: 'all', label: 'All Topics', color: 'blue' },
    { key: 'getting-started', label: 'Getting Started', color: 'green' },
    { key: 'account', label: 'Account Management', color: 'orange' },
    { key: 'payments', label: 'Payments & Billing', color: 'purple' },
    { key: 'campaigns', label: 'Campaigns', color: 'cyan' },
    { key: 'technical', label: 'Technical Support', color: 'red' },
    { key: 'safety', label: 'Safety & Security', color: 'magenta' }
  ];

  // Load help data from mock services
  useEffect(() => {
    const fetchHelpData = async () => {
      try {
        const [sections, faqs] = await Promise.all([
          helpSupportService.getActiveHelpSections(),
          faqService.getActiveFAQs()
        ]);
        setHelpSections(sections);
        setFaqItems(faqs);
      } catch (error) {
        message.error('Failed to load help data');
        console.error('Error fetching help data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHelpData();
  }, []);


  const handleEdit = (section: HelpSection) => {
    setEditingId(section.id);
    setEditContent(section.content);
  };

  const handleSave = async () => {
    if (!editingId) return;

    setSaving(true);
    try {
      await helpSupportService.updateHelpSection(editingId, {
        content: editContent,
        last_updated: new Date().toISOString()
      });
      
      // Refresh the data
      const updatedData = await helpSupportService.getActiveHelpSections();
      setHelpSections(updatedData);
      
      setEditingId(null);
      setEditContent('');
      message.success('Help section updated successfully!');
    } catch (error: any) {
      message.error(`Failed to save changes: ${error.message || 'Unknown error'}`);
      console.error('Error updating help section:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      // If search is empty, reload all FAQs
      const data = await faqService.getActiveFAQs();
      setFaqItems(data);
      return;
    }
    
    try {
      const results = await faqService.searchFAQs(searchTerm);
      setFaqItems(results);
    } catch (error) {
      message.error('Search failed');
      console.error('Error searching FAQs:', error);
    }
  };

  const handleFAQView = async (faqId: string) => {
    try {
      await faqService.incrementFAQView(faqId);
    } catch (error) {
      console.error('Error incrementing FAQ view:', error);
    }
  };

  const handleFAQHelpful = async (faqId: string) => {
    try {
      await faqService.incrementFAQHelpful(faqId);
      message.success('Thank you for your feedback!');
      // Refresh
      const faqs = await faqService.getActiveFAQs();
      setFaqItems(faqs);
    } catch (error: any) {
      message.error(`Failed to record feedback: ${error.message || 'Unknown error'}`);
      console.error('Error incrementing FAQ helpful:', error);
    }
  };

  const handleFAQEdit = (faq: FAQItem) => {
    setEditingFaq(faq);
    faqForm.setFieldsValue(faq);
    setFaqModalOpen(true);
  };

  const handleFAQDelete = async (faqId: string) => {
    try {
      await faqService.deleteFAQ(faqId);
      message.success('FAQ deleted');
      const faqs = await faqService.getActiveFAQs();
      setFaqItems(faqs);
    } catch (error: any) {
      message.error(`Failed to delete FAQ: ${error.message || 'Unknown error'}`);
      console.error('Error deleting FAQ:', error);
    }
  };

  const handleFAQSubmit = async (values: any) => {
    setSaving(true);
    try {
      if (editingFaq) {
        await faqService.updateFAQ(editingFaq.id, values);
        message.success('FAQ updated');
      } else {
        await faqService.createFAQ({
          ...values,
          is_active: true,
          order_index: faqItems.length + 1
        });
        message.success('FAQ created');
      }
      setFaqModalOpen(false);
      faqForm.resetFields();
      setEditingFaq(null);
      const faqs = await faqService.getActiveFAQs();
      setFaqItems(faqs);
    } catch (error: any) {
      message.error(`Failed to save FAQ: ${error.message || 'Unknown error'}`);
      console.error('Error saving FAQ:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredFAQItems = faqItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = !searchTerm || 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredHelpSections = helpSections.filter(section => {
    const matchesCategory = activeCategory === 'all' || section.category === activeCategory;
    const matchesSearch = !searchTerm || 
      section.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      section.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2} style={{ color: '#000' }}>Help & Support Center</Title>
      <Paragraph style={{ color: '#333' }}>
        Manage help documentation, frequently asked questions, and support resources to help users find answers quickly.
      </Paragraph>

      <Alert
        message="Help & Support Management"
        description="Edit help sections and FAQ items. Users can search and filter by category. Changes are saved to the database."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Search and Filter */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Search
              placeholder="Search help articles and FAQs..."
              allowClear
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              onSearch={handleSearch}
              enterButton
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={12}>
            <Space wrap>
              {categories.map((category: { key: string, label: string, color: string }) => (
                <Tag
                  key={category.key}
                  color={activeCategory === category.key ? category.color : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveCategory(category.key)}
                >
                  {category.label}
                </Tag>
              ))}
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          {/* Help Sections */}
          <Card title="Help Articles" style={{ marginBottom: 24 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {filteredHelpSections.map((section: HelpSection) => (
                <Card
                  key={section.id}
                  size="small"
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{section.title}</span>
                      <Space>
                        <small style={{ color: '#666' }}>
                          {new Date(section.last_updated).toLocaleDateString()}
                        </small>
                        {editingId !== section.id && (
                          <ProtectedButton
                            permission="help_support.edit"
                            type="primary"
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEdit(section)}
                            style={{ backgroundColor: '#000', borderColor: '#000' }}
                          >
                            Edit
                          </ProtectedButton>
                        )}
                      </Space>
                    </div>
                  }
                >
                  {editingId === section.id ? (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#000' }}>
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
                          style={{ backgroundColor: '#000', borderColor: '#000' }}
                        >
                          Save Changes
                        </Button>
                        <Button
                          icon={<UndoOutlined />}
                          onClick={handleCancel}
                          style={{ color: '#000', borderColor: '#000' }}
                        >
                          Cancel
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
          </Card>

          {/* FAQ Section */}
          <Card title="Frequently Asked Questions" extra={
            <ProtectedButton permission="help_support.create" type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditingFaq(null);
              faqForm.resetFields();
              setFaqModalOpen(true);
            }}>
              Add FAQ
            </ProtectedButton>
          }>
            <Collapse accordion>
              {filteredFAQItems.map((item: FAQItem) => (
                <Panel
                  header={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{item.question}</span>
                      <Space size="small">
                        {item.tags.map((tag: string) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </Space>
                    </div>
                  }
                  key={item.id}
                >
                  <div style={{ padding: '16px 0' }}>
                    <div
                      dangerouslySetInnerHTML={{ __html: item.answer }}
                      style={{
                        lineHeight: '1.6',
                        color: '#333'
                      }}
                    />
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Button 
                          size="small" 
                          onClick={() => handleFAQHelpful(item.id)}
                          icon="👍"
                          style={{ color: '#000', borderColor: '#000' }}
                        >
                          Helpful ({item.helpful_count})
                        </Button>
                        <ProtectedButton
                          permission="help_support.edit"
                          size="small"
                          onClick={() => handleFAQEdit(item)}
                          icon={<EditOutlined />}
                        >
                          Edit
                        </ProtectedButton>
                        <PermissionGuard permission="help_support.delete">
                          <Popconfirm title="Delete this FAQ?" onConfirm={() => handleFAQDelete(item.id)}>
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                            >
                              Delete
                            </Button>
                          </Popconfirm>
                        </PermissionGuard>
                      </Space>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        👁️ {item.view_count} views
                      </span>
                    </div>
                  </div>
                </Panel>
              ))}
            </Collapse>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* Quick Links */}
          <Card title="Quick Links" style={{ marginBottom: 24 }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button type="link" icon={<BookOutlined />} block style={{ textAlign: 'left', color: '#000' }}>
                User Guide & Tutorials
              </Button>
              <Button type="link" icon={<VideoCameraOutlined />} block style={{ textAlign: 'left', color: '#000' }}>
                Video Tutorials
              </Button>
              <Button type="link" icon={<FileTextOutlined />} block style={{ textAlign: 'left', color: '#000' }}>
                API Documentation
              </Button>
              <Button type="link" icon={<QuestionCircleOutlined />} block style={{ textAlign: 'left', color: '#000' }}>
                Contact Support
              </Button>
            </Space>
          </Card>

          {/* Statistics */}
          <Card title="Help Center Statistics">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#000' }}>
                    {helpSections.length}
                  </div>
                  <Text type="secondary">Help Articles</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#000' }}>
                    {faqItems.length}
                  </div>
                  <Text type="secondary">FAQ Items</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      <Modal
        title={editingFaq ? "Edit FAQ" : "Add New FAQ"}
        open={faqModalOpen}
        onCancel={() => setFaqModalOpen(false)}
        onOk={() => faqForm.submit()}
        confirmLoading={saving}
      >
        <Form form={faqForm} layout="vertical" onFinish={handleFAQSubmit}>
          <Form.Item name="question" label="Question" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="answer" label="Answer (HTML)" rules={[{ required: true }]}>
            <Input.TextArea rows={6} />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select>
              {categories.filter(c => c.key !== 'all').map(c => (
                <Option key={c.key} value={c.key}>{c.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="tags" label="Tags" initialValue={[]}>
            <Select mode="tags" placeholder="Add tags..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


