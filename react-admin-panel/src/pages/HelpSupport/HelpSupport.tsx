import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Alert, Spin, message, Collapse, Input, Row, Col, Tag, Divider } from 'antd';
import { EditOutlined, SaveOutlined, UndoOutlined, SearchOutlined, QuestionCircleOutlined, BookOutlined, VideoCameraOutlined, FileTextOutlined } from '@ant-design/icons';
import { helpSupportService, faqService, HelpSection, FAQItem } from '@/services/legalSupportService';

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;
const { Search } = Input;

export default function HelpSupport() {
  const [helpSections, setHelpSections] = useState<HelpSection[]>([]);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

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
    } catch (error) {
      message.error('Failed to save changes');
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
    } catch (error) {
      message.error('Failed to record feedback');
      console.error('Error incrementing FAQ helpful:', error);
    }
  };

  const filteredFAQItems = faqItems.filter(item => 
    activeCategory === 'all' || item.category === activeCategory
  );

  const filteredHelpSections = helpSections.filter(section => 
    activeCategory === 'all' || section.category === activeCategory
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>Help & Support Center</Title>
      <Paragraph>
        Manage your help documentation, FAQs, and support resources to help users find answers quickly.
      </Paragraph>

      <Alert
        message="Help & Support Management"
        description="Edit help sections and FAQ items. Users can search and filter content by category. Changes are saved to local storage for this demo."
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
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={handleSearch}
              enterButton
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={12}>
            <Space wrap>
              {categories.map(category => (
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
              {filteredHelpSections.map((section) => (
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
                          <Button
                            type="primary"
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEdit(section)}
                          >
                            Edit
                          </Button>
                        )}
                      </Space>
                    </div>
                  }
                >
                  {editingId === section.id ? (
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
          <Card title="Frequently Asked Questions">
            <Collapse accordion>
              {filteredFAQItems.map((item) => (
                <Panel
                  header={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{item.question}</span>
                      <Space size="small">
                        {item.tags.map(tag => (
                          <Tag key={tag} size="small">{tag}</Tag>
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
                      <Button 
                        size="small" 
                        onClick={() => handleFAQHelpful(item.id)}
                        icon="👍"
                      >
                        Helpful ({item.helpful_count})
                      </Button>
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
              <Button type="link" icon={<BookOutlined />} block style={{ textAlign: 'left' }}>
                User Guide & Tutorials
              </Button>
              <Button type="link" icon={<VideoCameraOutlined />} block style={{ textAlign: 'left' }}>
                Video Tutorials
              </Button>
              <Button type="link" icon={<FileTextOutlined />} block style={{ textAlign: 'left' }}>
                API Documentation
              </Button>
              <Button type="link" icon={<QuestionCircleOutlined />} block style={{ textAlign: 'left' }}>
                Contact Support
              </Button>
            </Space>
          </Card>

          {/* Statistics */}
          <Card title="Help Center Stats">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                    {helpSections.length}
                  </div>
                  <Text type="secondary">Help Articles</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                    {faqItems.length}
                  </div>
                  <Text type="secondary">FAQ Items</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}


