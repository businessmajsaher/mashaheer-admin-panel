import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Modal, Form, Input, Alert, Spin, message, Popconfirm, Select, DatePicker, Divider, Row, Col, Space } from 'antd';
import { FileTextOutlined, EditOutlined, DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { contractService } from '@/services/contractService';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface Contract {
  id: string;
  title: string;
  template_type: string;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ContractInstance {
  id: string;
  contract_id: string;
  customer_id: string;
  influencer_id: string;
  booking_id?: string;
  status: 'draft' | 'pending' | 'signed' | 'completed' | 'cancelled';
  signed_at?: string;
  completed_at?: string;
  created_at: string;
  variables_data: Record<string, any>;
}

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractInstances, setContractInstances] = useState<ContractInstance[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch contracts on component mount
  useEffect(() => {
    fetchContracts();
  }, []);

  const handleCreateContract = async (values: any) => {
    setFormLoading(true);
    setFormError(null);
    try {
      // Extract variables from content
      const variables = contractService.extractVariables(values.content);
      
      const newContract = {
        title: values.title,
        template_type: values.template_type,
        content: values.content,
        variables: variables,
        is_active: values.is_active || true
      };
      
      await contractService.createContractTemplate(newContract);
      message.success('Contract template created successfully');
      setModalOpen(false);
      form.resetFields();
      fetchContracts();
    } catch (error: any) {
      console.error('Error creating contract:', error);
      setFormError(error.message || 'Failed to create contract template');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateContract = async (values: any) => {
    if (!editingContract) return;
    
    setEditFormLoading(true);
    setEditFormError(null);
    try {
      // Extract variables from content
      const variables = contractService.extractVariables(values.content);
      
      const updates = {
        title: values.title,
        template_type: values.template_type,
        content: values.content,
        variables: variables,
        is_active: values.is_active || true
      };
      
      await contractService.updateContractTemplate(editingContract.id, updates);
      message.success('Contract template updated successfully');
      setEditModalOpen(false);
      setEditingContract(null);
      editForm.resetFields();
      fetchContracts();
    } catch (error: any) {
      console.error('Error updating contract:', error);
      setEditFormError(error.message || 'Failed to update contract template');
    } finally {
      setEditFormLoading(false);
    }
  };

  const handleDeleteContract = async (id: string) => {
    try {
      await contractService.deleteContractTemplate(id);
      message.success('Contract template deleted successfully');
      fetchContracts();
    } catch (error: any) {
      console.error('Error deleting contract:', error);
      message.error(error.message || 'Failed to delete contract template');
    }
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState<'templates' | 'instances'>('templates');

  // Default contract template as HTML
  const defaultTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Digital Advertising Agreement</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            background-color: #fff;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #1890ff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1890ff;
            margin: 0;
            font-size: 28px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h2 {
            color: #1890ff;
            border-left: 4px solid #1890ff;
            padding-left: 15px;
            margin-bottom: 15px;
            font-size: 20px;
        }
        .parties {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #52c41a;
        }
        .campaign-details {
            background-color: #fff7e6;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #faad14;
        }
        .detail-item {
            margin-bottom: 8px;
            display: flex;
        }
        .detail-label {
            font-weight: 600;
            min-width: 150px;
            color: #333;
        }
        .detail-value {
            color: #1890ff;
            font-weight: 500;
        }
        .highlight {
            background-color: #fffbe6;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
        }
        .signature-section {
            background-color: #f9f0ff;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #722ed1;
            margin-top: 30px;
        }
        .signature-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #d9d9d9;
        }
        .signature-name {
            font-weight: 600;
            color: #333;
        }
        .signature-date {
            color: #666;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
            color: #666;
            font-size: 14px;
        }
        @media print {
            body { margin: 0; padding: 15px; }
            .header { page-break-after: avoid; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📄 DIGITAL ADVERTISING AGREEMENT</h1>
        <p><strong>Between Influencer & Customer via Mashahher Platform</strong></p>
    </div>

    <div class="section">
        <h2>1. PARTIES TO THE AGREEMENT</h2>
        <div class="parties">
            <p>This Agreement is entered into electronically on the Mashahher Application between:</p>
            <div>• <strong>Customer (Advertiser):</strong> <span class="highlight">{{customer_name}}</span> (ID: {{customer_id}})</div>
            <div>• <strong>Influencer:</strong> <span class="highlight">{{influencer_name}}</span> (ID: {{influencer_id}})</div>
            <div>• <strong>Platform:</strong> Mashahher, acting as a digital intermediary.</div>
        </div>
    </div>

    <div class="section">
        <h2>2. PURPOSE OF THE AGREEMENT</h2>
        <p>The Customer seeks to engage the Influencer to promote a product, service, brand, or campaign through social media channels. The Influencer agrees to deliver advertising content as specified in the booking details made through the Mashahher application.</p>
    </div>

    <div class="section">
        <h2>3. CAMPAIGN DETAILS</h2>
        <div class="campaign-details">
            <div class="detail-item">
                <span class="detail-label">Campaign Title:</span>
                <span class="detail-value">{{campaign_title}}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Ad Type:</span>
                <span class="detail-value">{{ad_type}}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Platform(s):</span>
                <span class="detail-value">{{platforms}}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Posting Date(s):</span>
                <span class="detail-value">{{posting_dates}}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">{{duration}}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Content Brief:</span>
                <span class="detail-value">{{content_brief}}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Approval Required:</span>
                <span class="detail-value">{{approval_required}}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>4. COMPENSATION & PAYMENT TERMS</h2>
        <div class="campaign-details">
            <div class="detail-item">
                <span class="detail-label">Agreed Price:</span>
                <span class="detail-value">{{agreed_price}}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Payment Method:</span>
                <span class="detail-value">Via Mashahher secure payment gateway</span>
            </div>
            <h3>Payment Schedule:</h3>
            <ul>
                <li>100% upfront payment is held in escrow by Mashahher</li>
                <li>Released to the Influencer after successful campaign completion</li>
            </ul>
        </div>
    </div>

    <div class="section">
        <h2>5. RESPONSIBILITIES</h2>
        <h3>A. Influencer Agrees to:</h3>
        <ul>
            <li>Create original content as per the campaign brief</li>
            <li>Publish content on agreed platforms and time</li>
            <li>Tag and mention the Customer/brand as instructed</li>
            <li>Comply with applicable advertising laws and disclose paid partnership</li>
        </ul>
        
        <h3>B. Customer Agrees to:</h3>
        <ul>
            <li>Provide clear brief and campaign material (if any)</li>
            <li>Not request edits beyond what is agreed in the booking</li>
            <li>Accept reasonable creative freedom by the Influencer</li>
        </ul>
    </div>

    <div class="section">
        <h2>6. CANCELLATION & REFUND POLICY</h2>
        <h3>By Customer:</h3>
        <ul>
            <li>Full refund if cancelled before Influencer accepts</li>
            <li>50% refund if cancelled after acceptance but before content delivery</li>
            <li>No refund after content is delivered or posted</li>
        </ul>
        <h3>By Influencer:</h3>
        <ul>
            <li>If unable to fulfill, full refund is issued to Customer</li>
            <li>Repeated cancellations may result in account penalties</li>
        </ul>
    </div>

    <div class="section">
        <h2>7. CONTENT OWNERSHIP & USAGE</h2>
        <h3>Usage Rights:</h3>
        <ul>
            <li>Customer may use posted content for reposting only (not paid ads), unless extended rights are purchased</li>
            <li>Influencer retains ownership of the content unless agreed otherwise</li>
        </ul>
    </div>

    <div class="section">
        <h2>8. NON-CIRCUMVENTION</h2>
        <p>All communication, bookings, and payments must be conducted through the Mashahher application. Any attempt to bypass the platform may result in account suspension and legal liability.</p>
    </div>

    <div class="section">
        <h2>9. LIABILITY & DISCLAIMER</h2>
        <p>Mashahher acts only as an intermediary and holds no responsibility for content quality, delivery disputes, or outcomes of advertising. Disputes will be handled via Mashahher support and dispute resolution process.</p>
    </div>

    <div class="section">
        <h2>10. AGREEMENT ACCEPTANCE</h2>
        <p>By clicking "Accept & Proceed", both parties confirm that they have read, understood, and agreed to be legally bound by this Agreement. This digital agreement holds the same legal effect as a signed physical contract.</p>
    </div>

    <div class="signature-section">
        <h2>DIGITAL SIGNATURES</h2>
        <p><strong>Signed Digitally via Mashahher App on {{signature_date}}</strong></p>
        <div class="signature-line">
            <span class="signature-name">Customer: {{customer_name}}</span>
            <span class="signature-date">{{signature_date}}</span>
        </div>
        <div class="signature-line">
            <span class="signature-name">Influencer: {{influencer_name}}</span>
            <span class="signature-date">{{signature_date}}</span>
        </div>
        <div class="signature-line">
            <span class="signature-name">Mashahher Representative (System Generated)</span>
            <span class="signature-date">{{signature_date}}</span>
        </div>
    </div>

    <div class="footer">
        <p>This document was generated electronically and is legally binding.</p>
        <p>© 2024 Mashahher Platform. All rights reserved.</p>
    </div>
</body>
</html>`;

  // Fetch contracts from Supabase
  const fetchContracts = async () => {
    console.log('🔄 Fetching contracts...');
    setLoading(true);
    try {
      const data = await contractService.getContractTemplates();
      console.log('✅ Contracts fetched successfully:', data?.length || 0, 'contracts');
      setContracts(data || []);
    } catch (err) {
      console.error('❌ Contracts fetch exception:', err);
      message.error('Failed to fetch contracts');
    } finally {
      setLoading(false);
    }
  };

  // Fetch contract instances from Supabase
  const fetchContractInstances = async () => {
    console.log('🔄 Fetching contract instances...');
    try {
      const { data, error } = await supabase
        .from('contract_instances')
        .select(`
          *,
          contract_templates(title, template_type),
          profiles!customer_id(name, email),
          profiles!influencer_id(name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Contract instances fetch error:', error);
        message.error(error.message);
      } else {
        console.log('✅ Contract instances fetched successfully:', data?.length || 0, 'instances');
      }
      
      setContractInstances(data || []);
    } catch (err) {
      console.error('❌ Contract instances fetch exception:', err);
    }
  };

  useEffect(() => {
    console.log('🚀 Contracts component mounted, fetching data...');
    fetchContracts();
    fetchContractInstances();
  }, []);

  // Extract variables from template content
  const extractVariables = (content: string): string[] => {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  };

  // Add Contract handler
  const handleAddContract = async (values: any) => {
    console.log('🔄 Adding contract with values:', values);
    setFormLoading(true);
    setFormError(null);
    try {
      const variables = contractService.extractVariables(values.content);
      
      const contractData = {
        title: values.title,
        template_type: values.template_type,
        content: values.content,
        variables: variables,
        is_active: values.is_active || true
      };
      
      console.log('📝 Creating contract with service:', contractData);
      await contractService.createContractTemplate(contractData);
      
      console.log('✅ Contract added successfully!');
      message.success('Contract template added!');
      setModalOpen(false);
      form.resetFields();
      fetchContracts();
    } catch (err: any) {
      console.error('❌ Contract add exception:', err);
      setFormError(err.message || 'Failed to add contract');
    } finally {
      setFormLoading(false);
    }
  };

  // Edit Contract handler
  const handleEditContract = async (values: any) => {
    setEditFormLoading(true);
    setEditFormError(null);
    try {
      const variables = extractVariables(values.content);
      
      const updateData = {
        title: values.title,
        template_type: values.template_type,
        content: values.content,
        variables: variables,
        is_active: values.is_active,
        updated_at: new Date().toISOString(),
      };

      console.log('📝 Updating contract with data:', updateData);
      const { error } = await supabase
        .from('contract_templates')
        .update(updateData)
        .eq('id', editingContract?.id);
      
      if (error) {
        console.error('❌ Contract update error:', error);
        throw error;
      }
      
      console.log('✅ Contract update successful!');
      message.success('Contract template updated!');
      setEditModalOpen(false);
      setEditingContract(null);
      fetchContracts();
    } catch (err: any) {
      console.error('❌ Contract update error:', err);
      setEditFormError(err.message || 'Failed to update contract');
    } finally {
      setEditFormLoading(false);
    }
  };


  // Preview contract with sample data
  const previewContract = (content: string) => {
    const sampleData = {
      customer_name: 'John Doe',
      customer_id: 'CUST001',
      influencer_name: 'Jane Smith',
      influencer_id: 'INF001',
      campaign_title: 'Summer Collection 2024',
      ad_type: 'Video',
      platforms: 'Instagram, TikTok',
      posting_dates: '2024-06-15, 2024-06-16',
      duration: '24h Story',
      content_brief: 'Showcase the new summer collection with lifestyle shots',
      approval_required: 'Yes',
      agreed_price: '$500',
      signature_date: new Date().toLocaleDateString()
    };

    let previewContent = content;
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      previewContent = previewContent.replace(regex, value);
    });

    return previewContent;
  };

  const templateColumns = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { 
      title: 'Type', 
      dataIndex: 'template_type', 
      key: 'template_type',
      render: (type: string) => (
        <span style={{ 
          color: type === 'advertising' ? '#1890ff' : type === 'collaboration' ? '#52c41a' : '#722ed1',
          fontWeight: 'bold'
        }}>
          {type?.toUpperCase() || '-'}
        </span>
      )
    },
    { 
      title: 'Variables', 
      dataIndex: 'variables', 
      key: 'variables',
      render: (variables: string[]) => (
        <span>{variables?.length || 0} variables</span>
      )
    },
    { 
      title: 'Status', 
      dataIndex: 'is_active', 
      key: 'is_active',
      render: (active: boolean) => (
        <span style={{ 
          color: active ? '#52c41a' : '#8c8c8c',
          fontWeight: 'bold'
        }}>
          {active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Contract) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => {
            setViewingContract(record);
            setViewModalOpen(true);
          }}>Preview</Button>
          <Button icon={<EditOutlined />} size="small" onClick={() => {
            setEditingContract(record);
            setEditModalOpen(true);
          }}>Edit</Button>
          <Popconfirm title="Delete this contract template?" onConfirm={() => handleDeleteContract(record.id)} okText="Yes" cancelText="No">
            <Button icon={<DeleteOutlined />} size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const instanceColumns = [
    { title: 'Contract', dataIndex: ['contract_templates', 'title'], key: 'contract_title' },
    { title: 'Customer', dataIndex: ['profiles', 'name'], key: 'customer_name' },
    { title: 'Influencer', dataIndex: ['profiles', 'name'], key: 'influencer_name' },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => {
        const colors = {
          draft: '#8c8c8c',
          pending: '#faad14',
          signed: '#52c41a',
          completed: '#1890ff',
          cancelled: '#ff4d4f'
        };
        return (
          <span style={{ 
            color: colors[status as keyof typeof colors] || '#8c8c8c',
            fontWeight: 'bold'
          }}>
            {status?.toUpperCase() || '-'}
          </span>
        );
      }
    },
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ContractInstance) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small">View</Button>
          <Button icon={<EditOutlined />} size="small">Edit</Button>
        </Space>
      ),
    },
  ];

  const filteredContracts = contracts.filter((c) => c.title?.toLowerCase().includes(search.toLowerCase()));
  const filteredInstances = contractInstances.filter((i) => 
    i.contract_templates?.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.profiles?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card style={{ margin: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Contracts</Typography.Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button 
            type={activeTab === 'templates' ? 'primary' : 'default'}
            onClick={() => setActiveTab('templates')}
          >
            Templates
          </Button>
          <Button 
            type={activeTab === 'instances' ? 'primary' : 'default'}
            onClick={() => setActiveTab('instances')}
          >
            Instances
          </Button>
          {activeTab === 'templates' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { 
              setModalOpen(true); 
              form.resetFields();
              form.setFieldsValue({ content: defaultTemplate });
            }}>
              Add Template
            </Button>
          )}
        </div>
      </div>
      
      {/* Search */}
      <Input.Search
        placeholder="Search contracts..."
        allowClear
        style={{ width: '100%', marginBottom: 16 }}
        value={search}
        onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
      />
      
      {loading ? <Spin size="large" /> : (
        <Table
          columns={activeTab === 'templates' ? templateColumns : instanceColumns}
          dataSource={activeTab === 'templates' ? filteredContracts : filteredInstances}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total: activeTab === 'templates' ? filteredContracts.length : filteredInstances.length,
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size || 10); },
            showSizeChanger: true,
          }}
        />
      )}
      
      {/* Add Template Modal */}
      <Modal
        title="Add Contract Template"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={null}
        width={800}
      >
        {formError && <Alert message={formError} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form form={form} layout="vertical" onFinish={handleCreateContract}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="Template Title"
                rules={[{ required: true, message: 'Please enter template title' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="template_type"
                label="Template Type"
                rules={[{ required: true, message: 'Please select template type' }]}
              >
                <Select placeholder="Select template type">
                  <Option value="advertising">Advertising Agreement</Option>
                  <Option value="collaboration">Collaboration Agreement</Option>
                  <Option value="sponsorship">Sponsorship Agreement</Option>
                  <Option value="custom">Custom Template</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="content"
            label="Template Content (HTML)"
            rules={[{ required: true, message: 'Please enter template content' }]}
          >
            <TextArea rows={20} placeholder="Enter your contract template content as HTML. Use {{variable_name}} for dynamic fields." />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
            initialValue={true}
          >
            <input type="checkbox" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={formLoading}>Add Template</Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Edit Template Modal */}
      <Modal
        title="Edit Contract Template"
        open={editModalOpen}
        onCancel={() => { 
          setEditModalOpen(false); 
          setEditingContract(null); 
          editForm.resetFields(); 
        }}
        footer={null}
        width={800}
      >
        {editFormError && <Alert message={editFormError} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form 
          form={editForm} 
          layout="vertical" 
          onFinish={handleUpdateContract}
          initialValues={editingContract ? {
            title: editingContract.title,
            template_type: editingContract.template_type,
            content: editingContract.content,
            is_active: editingContract.is_active
          } : {}}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="Template Title" rules={[{ required: true, message: 'Please enter template title' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="template_type" label="Template Type" rules={[{ required: true, message: 'Please select template type' }]}>
                <Select placeholder="Select template type">
                  <Option value="advertising">Advertising Agreement</Option>
                  <Option value="collaboration">Collaboration Agreement</Option>
                  <Option value="sponsorship">Sponsorship Agreement</Option>
                  <Option value="custom">Custom Template</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="content" label="Template Content (HTML)" rules={[{ required: true, message: 'Please enter template content' }]}>
            <TextArea rows={20} placeholder="Enter your contract template content as HTML. Use {{variable_name}} for dynamic fields." />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <input type="checkbox" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={editFormLoading}>Update Template</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Template Modal */}
      <Modal
        title={`Preview: ${viewingContract?.title}`}
        open={viewModalOpen}
        onCancel={() => { setViewModalOpen(false); setViewingContract(null); }}
        footer={null}
        width={900}
      >
        {viewingContract && (
          <div>
            <Divider>Template Variables</Divider>
            <div style={{ marginBottom: 16 }}>
              {viewingContract.variables?.map((variable, index) => (
                <span key={index} style={{ 
                  background: '#f0f0f0', 
                  padding: '4px 8px', 
                  margin: '2px', 
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  {variable}
                </span>
              ))}
            </div>
            
            <Divider>Preview with Sample Data</Divider>
            <div 
              style={{ 
                maxHeight: '500px',
                overflow: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: '8px'
              }}
              dangerouslySetInnerHTML={{ __html: previewContract(viewingContract.content) }}
            />
          </div>
        )}
      </Modal>
    </Card>
  );
}