import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Switch,
  message,
  Popconfirm,
  Tooltip,
  Statistic,
  Row,
  Col,
  Typography,
  Badge,
  Drawer,
  Descriptions,
  Timeline,
  Progress
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  ExportOutlined,
  ImportOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  BarChartOutlined,
  DollarOutlined,
  UserOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '@/services/supabaseClient';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface DiscountCoupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: 'percentage'; // Only percentage discounts are supported
  discount_value: number; // Discount percentage with 3 decimal precision (e.g., 21.356)
  minimum_order_amount: number;
  maximum_discount_amount?: number;
  usage_limit?: number;
  usage_count: number;
  usage_limit_per_user: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  is_public: boolean;
  applicable_to: 'all' | 'specific_products' | 'categories';
  user_restrictions: 'all' | 'new_users' | 'specific_users';
  created_at: string;
  updated_at: string;
  created_by: string;
}

const Discounts: React.FC = () => {
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<DiscountCoupon | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<DiscountCoupon | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    totalUsage: 0,
    totalSavings: 0
  });
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [applicableTo, setApplicableTo] = useState<string>('all');
  const [userRestrictions, setUserRestrictions] = useState<string>('all');

  // Fetch coupons
  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      message.error('Failed to fetch coupons: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (coupons: DiscountCoupon[]) => {
    const now = new Date();
    const active = coupons.filter(c => c.is_active && (!c.valid_until || new Date(c.valid_until) > now)).length;
    const expired = coupons.filter(c => c.valid_until && new Date(c.valid_until) <= now).length;
    const totalUsage = coupons.reduce((sum, c) => sum + c.usage_count, 0);
    const totalSavings = coupons.reduce((sum, c) => {
      // Only percentage discounts are supported
      // Assuming average order value of 50 for calculation
      return sum + (c.usage_count * (c.discount_value / 100) * 50);
    }, 0);

    setStats({
      total: coupons.length,
      active,
      expired,
      totalUsage,
      totalSavings
    });
  };

  useEffect(() => {
    fetchCoupons();
    fetchUsers();
    fetchProducts();
    fetchCategories();
  }, []);

  // Fetch users for specific users selection
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  // Fetch products for specific products selection
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, title')
        .order('title');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
    }
  };

  // Fetch categories for categories selection
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  // Handle create/edit coupon
  const handleSaveCoupon = async (values: any) => {
    try {
      const couponData = {
        ...values,
        discount_type: 'percentage', // Always set to percentage
        discount_value: values.discount_value, // Already has 3 decimal precision from InputNumber
        valid_from: values.valid_from?.toISOString(),
        valid_until: values.valid_until?.toISOString(),
        product_ids: values.product_ids || [],
        category_ids: values.category_ids || [],
        restricted_user_ids: values.restricted_user_ids || []
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from('discount_coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);
        
        if (error) throw error;
        message.success('Coupon updated successfully');
      } else {
        const { error } = await supabase
          .from('discount_coupons')
          .insert([couponData]);
        
        if (error) throw error;
        message.success('Coupon created successfully');
      }

      setIsModalVisible(false);
      setEditingCoupon(null);
      setApplicableTo('all');
      setUserRestrictions('all');
      form.resetFields();
      fetchCoupons();
    } catch (error: any) {
      message.error('Failed to save coupon: ' + error.message);
    }
  };

  // Handle delete coupon
  const handleDeleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase
        .from('discount_coupons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      message.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (error: any) {
      message.error('Failed to delete coupon: ' + error.message);
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('discount_coupons')
        .update({ is_active: !isActive })
        .eq('id', id);
      
      if (error) throw error;
      message.success(`Coupon ${!isActive ? 'activated' : 'deactivated'} successfully`);
      fetchCoupons();
    } catch (error: any) {
      message.error('Failed to update coupon status: ' + error.message);
    }
  };

  // Copy coupon code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    message.success('Coupon code copied to clipboard');
  };

  // Get status tag
  const getStatusTag = (coupon: DiscountCoupon) => {
    const now = new Date();
    const isExpired = coupon.valid_until && new Date(coupon.valid_until) <= now;
    const isNotStarted = new Date(coupon.valid_from) > now;
    
    if (!coupon.is_active) {
      return <Tag color="red">Inactive</Tag>;
    }
    if (isExpired) {
      return <Tag color="orange">Expired</Tag>;
    }
    if (isNotStarted) {
      return <Tag color="blue">Scheduled</Tag>;
    }
    return <Tag color="green">Active</Tag>;
  };

  // Filter coupons
  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchText.toLowerCase()) ||
                         coupon.name.toLowerCase().includes(searchText.toLowerCase());
    
    let matchesFilter = true;
    if (filterStatus === 'active') {
      const now = new Date();
      matchesFilter = coupon.is_active && (!coupon.valid_until || new Date(coupon.valid_until) > now);
    } else if (filterStatus === 'expired') {
      matchesFilter = coupon.valid_until && new Date(coupon.valid_until) <= new Date();
    } else if (filterStatus === 'inactive') {
      matchesFilter = !coupon.is_active;
    }
    
    return matchesSearch && matchesFilter;
  });

  // Table columns
  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <Space>
          <Text code>{code}</Text>
          <Tooltip title="Copy code">
            <Button 
              type="text" 
              size="small" 
              icon={<CopyOutlined />} 
              onClick={() => handleCopyCode(code)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: DiscountCoupon) => (
        <div>
          <div>{name}</div>
          {record.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.description}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Discount',
      key: 'discount',
      render: (record: DiscountCoupon) => (
        <div>
          <div>
            {Number(record.discount_value).toFixed(3)}%
          </div>
          {record.minimum_order_amount > 0 && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Min: ${record.minimum_order_amount}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Usage',
      key: 'usage',
      render: (record: DiscountCoupon) => (
        <div>
          <div>{record.usage_count} / {record.usage_limit || '∞'}</div>
          {record.usage_limit && (
            <Progress 
              percent={Math.round((record.usage_count / record.usage_limit) * 100)} 
              size="small" 
              showInfo={false}
            />
          )}
        </div>
      ),
    },
    {
      title: 'Validity',
      key: 'validity',
      render: (record: DiscountCoupon) => (
        <div>
          <div>From: {dayjs(record.valid_from).format('MMM DD, YYYY')}</div>
          {record.valid_until && (
            <div>Until: {dayjs(record.valid_until).format('MMM DD, YYYY')}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: DiscountCoupon) => getStatusTag(record),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: DiscountCoupon) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => {
                setSelectedCoupon(record);
                setIsDetailDrawerVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => {
                setEditingCoupon(record);
                setApplicableTo(record.applicable_to || 'all');
                setUserRestrictions(record.user_restrictions || 'all');
                form.setFieldsValue({
                  ...record,
                  discount_type: 'percentage', // Always set to percentage
                  valid_from: dayjs(record.valid_from),
                  valid_until: record.valid_until ? dayjs(record.valid_until) : null,
                  product_ids: record.product_ids || [],
                  category_ids: record.category_ids || [],
                  restricted_user_ids: record.restricted_user_ids || []
                });
                setIsModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title={record.is_active ? 'Deactivate' : 'Activate'}>
            <Button 
              type="text" 
              icon={record.is_active ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              onClick={() => handleToggleActive(record.id, record.is_active)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this coupon?"
            onConfirm={() => handleDeleteCoupon(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>Discount Coupons</Title>
        <Text type="secondary">Manage discount coupons and promotional codes</Text>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Coupons"
              value={stats.total}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Coupons"
              value={stats.active}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Usage"
              value={stats.totalUsage}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Savings"
              value={stats.totalSavings}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Input
              placeholder="Search coupons..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            <Select
              placeholder="Filter by status"
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 150 }}
            >
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="expired">Expired</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchCoupons}>
              Refresh
            </Button>
            <Button icon={<ExportOutlined />}>
              Export
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setIsModalVisible(true);
              setApplicableTo('all');
              setUserRestrictions('all');
              form.resetFields();
            }}>
              Create Coupon
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredCoupons}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} coupons`
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingCoupon(null);
          setApplicableTo('all');
          setUserRestrictions('all');
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveCoupon}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Coupon Code"
                rules={[{ required: true, message: 'Please enter coupon code' }]}
              >
                <Input placeholder="e.g., WELCOME10" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Coupon Name"
                rules={[{ required: true, message: 'Please enter coupon name' }]}
              >
                <Input placeholder="e.g., Welcome Discount" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} placeholder="Describe this coupon..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="discount_value"
                label="Discount Percentage"
                rules={[
                  { required: true, message: 'Please enter discount percentage' },
                  { type: 'number', min: 0, max: 100, message: 'Discount must be between 0 and 100%' }
                ]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  precision={3}
                  style={{ width: '100%' }}
                  placeholder="21.356"
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="minimum_order_amount"
                label="Minimum Order Amount"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>
          
          {/* Hidden field to always set discount_type to percentage */}
          <Form.Item name="discount_type" hidden initialValue="percentage">
            <Input type="hidden" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="usage_limit"
                label="Usage Limit"
              >
                <InputNumber
                  min={1}
                  style={{ width: '100%' }}
                  placeholder="Unlimited"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="usage_limit_per_user"
                label="Per User Limit"
                rules={[{ required: true, message: 'Please enter per user limit' }]}
              >
                <InputNumber
                  min={1}
                  style={{ width: '100%' }}
                  placeholder="1"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="maximum_discount_amount"
                label="Max Discount Amount"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="No limit"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="valid_from"
                label="Valid From"
                rules={[{ required: true, message: 'Please select start date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="valid_until"
                label="Valid Until"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="applicable_to"
                label="Applicable To"
                rules={[{ required: true, message: 'Please select applicable scope' }]}
              >
                <Select
                  value={applicableTo}
                  onChange={(value) => {
                    setApplicableTo(value);
                    if (value === 'all') {
                      form.setFieldsValue({ product_ids: [], category_ids: [] });
                    } else if (value === 'specific_products') {
                      form.setFieldsValue({ category_ids: [] });
                    } else if (value === 'categories') {
                      form.setFieldsValue({ product_ids: [] });
                    }
                  }}
                >
                  <Option value="all">All Products</Option>
                  <Option value="specific_products">Specific Products</Option>
                  <Option value="categories">Categories</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="user_restrictions"
                label="User Restrictions"
                rules={[{ required: true, message: 'Please select user restrictions' }]}
              >
                <Select
                  value={userRestrictions}
                  onChange={(value) => {
                    setUserRestrictions(value);
                    if (value !== 'specific_users') {
                      form.setFieldsValue({ restricted_user_ids: [] });
                    }
                  }}
                >
                  <Option value="all">All Users</Option>
                  <Option value="new_users">New Users Only</Option>
                  <Option value="specific_users">Specific Users</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Show user selection when specific_users is selected */}
          {userRestrictions === 'specific_users' && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="restricted_user_ids"
                  label="Select Users"
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (getFieldValue('user_restrictions') === 'specific_users') {
                          if (!value || value.length === 0) {
                            return Promise.reject(new Error('Please select at least one user'));
                          }
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select users"
                    showSearch
                    filterOption={(input, option) => {
                      const user = users.find(u => u.id === option?.value);
                      if (!user) return false;
                      const name = user.name?.toLowerCase() || '';
                      const email = user.email?.toLowerCase() || '';
                      return name.includes(input.toLowerCase()) || email.includes(input.toLowerCase());
                    }}
                    style={{ width: '100%' }}
                  >
                    {users.map(user => (
                      <Option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Show product selection when specific_products is selected */}
          {applicableTo === 'specific_products' && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="product_ids"
                  label="Select Products"
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (getFieldValue('applicable_to') === 'specific_products') {
                          if (!value || value.length === 0) {
                            return Promise.reject(new Error('Please select at least one product'));
                          }
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select products"
                    showSearch
                    filterOption={(input, option) => {
                      const product = products.find(p => p.id === option?.value);
                      if (!product) return false;
                      const title = product.title?.toLowerCase() || '';
                      return title.includes(input.toLowerCase());
                    }}
                    style={{ width: '100%' }}
                  >
                    {products.map(product => (
                      <Option key={product.id} value={product.id}>
                        {product.title}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Show category selection when categories is selected */}
          {applicableTo === 'categories' && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="category_ids"
                  label="Select Categories"
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (getFieldValue('applicable_to') === 'categories') {
                          if (!value || value.length === 0) {
                            return Promise.reject(new Error('Please select at least one category'));
                          }
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select categories"
                    showSearch
                    filterOption={(input, option) => {
                      const category = categories.find(c => c.id === option?.value);
                      if (!category) return false;
                      const name = category.name?.toLowerCase() || '';
                      return name.includes(input.toLowerCase());
                    }}
                    style={{ width: '100%' }}
                  >
                    {categories.map(category => (
                      <Option key={category.id} value={category.id}>
                        {category.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="is_active"
                label="Active"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_public"
                label="Public"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingCoupon ? 'Update' : 'Create'} Coupon
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title="Coupon Details"
        placement="right"
        width={600}
        open={isDetailDrawerVisible}
        onClose={() => setIsDetailDrawerVisible(false)}
      >
        {selectedCoupon && (
          <div>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Code">
                <Text code>{selectedCoupon.code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Name">
                {selectedCoupon.name}
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {selectedCoupon.description || 'No description'}
              </Descriptions.Item>
              <Descriptions.Item label="Discount">
                {Number(selectedCoupon.discount_value).toFixed(3)}%
              </Descriptions.Item>
              <Descriptions.Item label="Minimum Order">
                ${selectedCoupon.minimum_order_amount}
              </Descriptions.Item>
              <Descriptions.Item label="Usage">
                {selectedCoupon.usage_count} / {selectedCoupon.usage_limit || '∞'}
              </Descriptions.Item>
              <Descriptions.Item label="Per User Limit">
                {selectedCoupon.usage_limit_per_user}
              </Descriptions.Item>
              <Descriptions.Item label="Valid From">
                {dayjs(selectedCoupon.valid_from).format('MMMM DD, YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Valid Until">
                {selectedCoupon.valid_until 
                  ? dayjs(selectedCoupon.valid_until).format('MMMM DD, YYYY HH:mm')
                  : 'No expiration'
                }
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {getStatusTag(selectedCoupon)}
              </Descriptions.Item>
              <Descriptions.Item label="Applicable To">
                {selectedCoupon.applicable_to.replace('_', ' ').toUpperCase()}
              </Descriptions.Item>
              <Descriptions.Item label="User Restrictions">
                {selectedCoupon.user_restrictions.replace('_', ' ').toUpperCase()}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: '24px' }}>
              <Title level={4}>Usage Timeline</Title>
              <Timeline>
                <Timeline.Item color="green">
                  Created on {dayjs(selectedCoupon.created_at).format('MMMM DD, YYYY')}
                </Timeline.Item>
                {selectedCoupon.usage_count > 0 && (
                  <Timeline.Item color="blue">
                    {selectedCoupon.usage_count} times used
                  </Timeline.Item>
                )}
                {selectedCoupon.valid_until && (
                  <Timeline.Item color="orange">
                    Expires on {dayjs(selectedCoupon.valid_until).format('MMMM DD, YYYY')}
                  </Timeline.Item>
                )}
              </Timeline>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Discounts;
