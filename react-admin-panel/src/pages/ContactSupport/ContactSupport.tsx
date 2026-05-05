import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Alert, Spin, message, Form, Input, Select, Row, Col, Divider, Modal, Table, Tag } from 'antd';
import { EditOutlined, SaveOutlined, UndoOutlined, PhoneOutlined, MailOutlined, MessageOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { contactSupportService, ContactSupportInfo, supportCategoriesService, SupportCategory } from '@/services/legalSupportService';
import { ticketService, SupportTicket } from '@/services/ticketService';
import { useAuth } from '@/context/AuthContext';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface TicketFormValues {
  user_id: string;
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
  priority: SupportTicket['priority'];
}

export default function ContactSupport() {
  const { user } = useAuth();
  const [contactInfo, setContactInfo] = useState<ContactSupportInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [users, setUsers] = useState<{id: string, name: string, email: string}[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: undefined,
    category: undefined,
    priority: undefined
  });

  // Load contact support info, tickets and users
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const infoData = await contactSupportService.getAllContactInfo();
        setContactInfo(infoData);
        
        const ticketsData = await ticketService.getTickets();
        setTickets(ticketsData);

        const categoriesData = await supportCategoriesService.getActiveCategories();
        setCategories(categoriesData);

        setUsersLoading(true);
        const usersData = await ticketService.getAllUsers();
        setUsers(usersData);
      } catch (error) {
        message.error('Failed to load support information');
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
        setTicketsLoading(false);
        setUsersLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchTickets = async () => {
    try {
      const ticketsData = await ticketService.getTickets();
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const handleEdit = (info: ContactSupportInfo) => {
    setEditingId(info.id);
    setEditContent(info.content);
  };

  const handleSave = async () => {
    if (!editingId) return;

    setSaving(true);
    try {
      await contactSupportService.updateContactInfo(editingId, {
        content: editContent,
        last_updated: new Date().toISOString()
      });

      // Refresh the data
      const updatedData = await contactSupportService.getAllContactInfo();
      setContactInfo(updatedData);

      setEditingId(null);
      setEditContent('');
      message.success('Contact information updated successfully!');
    } catch (error) {
      message.error('Failed to save changes');
      console.error('Error updating contact info:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleUserSelect = (userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    if (foundUser) {
      form.setFieldsValue({ 
        name: foundUser.name,
        user_id: foundUser.id,
        email: foundUser.email
      });
      message.success(`User selected: ${foundUser.name}`);
    }
  };

  const handleTicketSubmit = async (values: TicketFormValues) => {
    if (!values.user_id) {
      message.error('Invalid user identification. Please select a valid user.');
      return;
    }

    try {
      await ticketService.createTicket({
        user_id: values.user_id,
        subject: values.subject,
        message: values.message,
        category: values.category,
        priority: values.priority
      });

      message.success('Ticket created successfully!');
      form.resetFields();
      fetchTickets();
    } catch (error) {
      message.error('Failed to create ticket. Please try again.');
      console.error('Error creating support ticket:', error);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: SupportTicket['status']) => {
    const update = async () => {
      try {
        await ticketService.updateTicketStatus(ticketId, newStatus);
        message.success('Ticket status updated');
        fetchTickets();
      } catch (error) {
        message.error('Failed to update status');
      }
    };

    if (newStatus === 'Closed') {
      Modal.confirm({
        title: 'Are you sure you want to close this ticket?',
        content: 'Once a ticket is closed, it cannot be reopened.',
        okText: 'Confirm Close',
        okType: 'danger',
        onOk: update
      });
    } else {
      update();
    }
  };

  const filteredTickets = tickets.filter(t => {
    return (!filters.status || t.status === filters.status) &&
           (!filters.category || t.category === filters.category) &&
           (!filters.priority || t.priority === filters.priority);
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
      <Title level={2} style={{ color: '#000' }}>Customer Support Management</Title>
      <Paragraph style={{ color: '#333' }}>
        Manage customer support information and provide multiple ways for users to access your support team.
      </Paragraph>

      <Alert
        message="Customer Support Management"
        description="Edit contact information, support hours, and help content. Changes are saved to the database."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Tickets Table / List */}
            <Card 
              title="Support Tickets" 
              extra={
                <Space>
                  <Select 
                    placeholder="Status" 
                    allowClear 
                    style={{ width: 120 }}
                    value={filters.status}
                    onChange={v => setFilters({...filters, status: v})}
                  >
                    <Option value="Open">Open</Option>
                    <Option value="In Progress">In Progress</Option>
                    <Option value="Pending from Customer">Pending Customer</Option>
                    <Option value="Resolved">Resolved</Option>
                    <Option value="Closed">Closed</Option>
                  </Select>
                  <Select 
                    placeholder="Category" 
                    allowClear 
                    style={{ width: 150 }}
                    value={filters.category}
                    onChange={v => setFilters({...filters, category: v})}
                  >
                    {categories.map(cat => (
                      <Option key={cat.id} value={cat.name}>{cat.name}</Option>
                    ))}
                  </Select>
                  <Button onClick={() => setFilters({status: undefined, category: undefined, priority: undefined})}>Reset</Button>
                </Space>
              }
            >
              <Table 
                dataSource={filteredTickets}
                loading={ticketsLoading}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                columns={[
                  {
                    title: 'User',
                    key: 'user',
                    render: (_, record) => (
                      <div>
                        <div>{record.user?.name}</div>
                        <small style={{ color: '#888' }}>{record.user?.email}</small>
                      </div>
                    )
                  },
                  {
                    title: 'Subject',
                    dataIndex: 'subject',
                    key: 'subject',
                  },
                  {
                    title: 'Category',
                    dataIndex: 'category',
                    key: 'category',
                  },
                  {
                    title: 'Priority',
                    dataIndex: 'priority',
                    key: 'priority',
                    render: (priority) => (
                      <Tag color={priority === 'Critical' ? 'red' : priority === 'High' ? 'orange' : 'blue'}>
                        {priority}
                      </Tag>
                    )
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status, record) => (
                      <Select 
                        value={status} 
                        size="small" 
                        disabled={status === 'Closed'}
                        onChange={(v) => handleStatusChange(record.id, v)}
                        style={{ width: 140 }}
                      >
                        <Option value="Open">Open</Option>
                        <Option value="In Progress">In Progress</Option>
                        <Option value="Pending from Customer">Pending Customer</Option>
                        <Option value="Resolved">Resolved</Option>
                        <Option value="Closed">Closed</Option>
                      </Select>
                    )
                  },
                  {
                    title: 'Action',
                    key: 'action',
                    render: (_, record) => (
                      <Button size="small" icon={<MailOutlined />} onClick={() => message.info(`Contacting: ${record.user?.email}`)} />
                    )
                  }
                ]}
              />
            </Card>

            {/* Existing Support Info Cards */}
            {contactInfo.map((info) => (
              <Card
                key={info.id}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{info.title}</span>
                    <Space>
                      <small style={{ color: '#666' }}>
                        Last updated: {new Date(info.last_updated).toLocaleDateString()}
                      </small>
                      {editingId !== info.id && (
                        <Button
                          type="primary"
                          icon={<EditOutlined />}
                          size="small"
                          onClick={() => handleEdit(info)}
                          style={{ backgroundColor: '#000', borderColor: '#000' }}
                        >
                          Edit
                        </Button>
                      )}
                    </Space>
                  </div>
                }
                style={{ width: '100%' }}
              >
                {editingId === info.id ? (
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
                    dangerouslySetInnerHTML={{ __html: info.content }}
                    style={{
                      lineHeight: '1.6',
                      color: '#333'
                    }}
                  />
                )}
              </Card>
            ))}
          </Space>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Create Support Ticket" style={{ position: 'sticky', top: 24 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleTicketSubmit}
            >
              <Form.Item
                name="user_id"
                label="User Email"
                rules={[{ required: true, message: 'Please select a user' }]}
              >
                <Select
                  showSearch
                  placeholder="Search user by email"
                  loading={usersLoading}
                  onChange={handleUserSelect}
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={users.map(u => ({
                    value: u.id,
                    label: u.email,
                  }))}
                  prefix={<MailOutlined />}
                />
              </Form.Item>

              <Form.Item
                name="name"
                label="Full Name (Auto-filled)"
              >
                <Input prefix={<UserOutlined />} readOnly placeholder="Select user above" />
              </Form.Item>

              <Form.Item
                name="subject"
                label="Subject"
                rules={[{ required: true, message: 'Please enter a subject' }]}
              >
                <Input placeholder="Brief summary of inquiry" />
              </Form.Item>

              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please select a category' }]}
              >
                <Select placeholder="Select category">
                  {categories.map(cat => (
                    <Option key={cat.id} value={cat.name}>{cat.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true, message: 'Please select priority' }]}
              >
                <Select placeholder="Select priority level">
                  <Option value="Low">Low – General Questions</Option>
                  <Option value="Medium">Medium – Account Issues</Option>
                  <Option value="High">High – Urgent Issues</Option>
                  <Option value="Critical">Critical – Platform Problems</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="message"
                label="Message"
                rules={[{ required: true, message: 'Please enter details' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="Describe the issue in detail..."
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block icon={<MessageOutlined />} style={{ backgroundColor: '#000', borderColor: '#000' }}>
                  Create Ticket
                </Button>
              </Form.Item>
            </Form>

            <Divider />

            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">
                <ClockCircleOutlined /> Direct ticket creation for identified users
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
