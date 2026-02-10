import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Select,
  Space,
  Typography,
  Progress,
  Tag,
  Timeline,
  List,
  Avatar,
  Tooltip,
  Button,
  message
} from 'antd';
import {
  DollarOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  CalendarOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  ExportOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '@/services/supabaseClient';
import { getCouponAnalytics } from '@/services/discountService';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface AnalyticsData {
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  totalUsage: number;
  totalSavings: number;
  averageOrderValue: number;
  topCoupons: Array<{
    id: string;
    code: string;
    name: string;
    usage_count: number;
    total_savings: number;
  }>;
  recentUsage: Array<{
    id: string;
    coupon_code: string;
    user_email: string;
    discount_amount: number;
    used_at: string;
  }>;
  usageByDay: Array<{
    date: string;
    usage_count: number;
    total_savings: number;
  }>;
}

const Analytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);
  const [selectedCoupon, setSelectedCoupon] = useState<string>('all');

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0].toISOString();
      const endDate = dateRange[1].toISOString();

      // Get basic coupon statistics
      const { data: coupons, error: couponsError } = await supabase
        .from('discount_coupons')
        .select('*');

      if (couponsError) throw couponsError;

      // Get usage statistics
      const { data: usageData, error: usageError } = await supabase
        .from('coupon_usage_log')
        .select(`
          *,
          discount_coupons!inner(code, name)
        `)
        .gte('used_at', startDate)
        .lte('used_at', endDate);

      if (usageError) throw usageError;

      // Calculate analytics
      const now = new Date();
      const totalCoupons = coupons?.length || 0;
      const activeCoupons = coupons?.filter(c => 
        c.is_active && (!c.valid_until || new Date(c.valid_until) > now)
      ).length || 0;
      const expiredCoupons = coupons?.filter(c => 
        c.valid_until && new Date(c.valid_until) <= now
      ).length || 0;

      const totalUsage = usageData?.length || 0;
      const totalSavings = usageData?.reduce((sum, usage) => sum + usage.discount_amount, 0) || 0;
      const averageOrderValue = totalUsage > 0 ? totalSavings / totalUsage : 0;

      // Top performing coupons
      const couponStats = new Map();
      usageData?.forEach(usage => {
        const couponId = usage.coupon_id;
        if (!couponStats.has(couponId)) {
          couponStats.set(couponId, {
            id: couponId,
            code: usage.discount_coupons.code,
            name: usage.discount_coupons.name,
            usage_count: 0,
            total_savings: 0
          });
        }
        const stats = couponStats.get(couponId);
        stats.usage_count += 1;
        stats.total_savings += usage.discount_amount;
      });

      const topCoupons = Array.from(couponStats.values())
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10);

      // Recent usage
      const recentUsage = usageData
        ?.sort((a, b) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime())
        .slice(0, 20)
        .map(usage => ({
          id: usage.id,
          coupon_code: usage.discount_coupons.code,
          user_email: `User ${usage.user_id.slice(0, 8)}...`, // Show partial user ID instead of email
          discount_amount: usage.discount_amount,
          used_at: usage.used_at
        })) || [];

      // Usage by day
      const usageByDayMap = new Map();
      usageData?.forEach(usage => {
        const date = dayjs(usage.used_at).format('YYYY-MM-DD');
        if (!usageByDayMap.has(date)) {
          usageByDayMap.set(date, {
            date,
            usage_count: 0,
            total_savings: 0
          });
        }
        const dayStats = usageByDayMap.get(date);
        dayStats.usage_count += 1;
        dayStats.total_savings += usage.discount_amount;
      });

      const usageByDay = Array.from(usageByDayMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setAnalyticsData({
        totalCoupons,
        activeCoupons,
        expiredCoupons,
        totalUsage,
        totalSavings,
        averageOrderValue,
        topCoupons,
        recentUsage,
        usageByDay
      });

    } catch (error: any) {
      message.error('Failed to fetch analytics: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  // Export analytics data
  const handleExport = () => {
    if (!analyticsData) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Coupons', analyticsData.totalCoupons],
      ['Active Coupons', analyticsData.activeCoupons],
      ['Expired Coupons', analyticsData.expiredCoupons],
      ['Total Usage', analyticsData.totalUsage],
      ['Total Savings', analyticsData.totalSavings],
      ['Average Order Value', analyticsData.averageOrderValue]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coupon-analytics-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!analyticsData) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>Coupon Analytics</Title>
          <Text type="secondary">Track coupon performance and usage statistics</Text>
        </div>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchAnalytics}>
            Refresh
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            Export
          </Button>
        </Space>
      </div>

      {/* Key Metrics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Coupons"
              value={analyticsData.totalCoupons}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Coupons"
              value={analyticsData.activeCoupons}
              valueStyle={{ color: '#3f8600' }}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Usage"
              value={analyticsData.totalUsage}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Savings"
              value={analyticsData.totalSavings}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Top Performing Coupons */}
        <Col span={12}>
          <Card title="Top Performing Coupons" style={{ marginBottom: '16px' }}>
            <List
              dataSource={analyticsData.topCoupons}
              renderItem={(coupon, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ backgroundColor: '#1890ff' }}>
                        {index + 1}
                      </Avatar>
                    }
                    title={
                      <Space>
                        <Text code>{coupon.code}</Text>
                        <Tag color="blue">{coupon.usage_count} uses</Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <div>{coupon.name}</div>
                        <Text type="secondary">
                          Total savings: ${coupon.total_savings.toFixed(2)}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Recent Usage */}
        <Col span={12}>
          <Card title="Recent Usage" style={{ marginBottom: '16px' }}>
            <List
              dataSource={analyticsData.recentUsage}
              renderItem={(usage) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<ShoppingCartOutlined />} />}
                    title={
                      <Space>
                        <Text code>{usage.coupon_code}</Text>
                        <Tag color="green">${usage.discount_amount.toFixed(2)}</Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <div>User: {usage.user_email}</div>
                        <Text type="secondary">
                          {dayjs(usage.used_at).format('MMM DD, YYYY HH:mm')}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Usage Trends */}
      <Row gutter={16}>
        <Col span={24}>
          <Card title="Usage Trends">
            <Table
              dataSource={analyticsData.usageByDay}
              columns={[
                {
                  title: 'Date',
                  dataIndex: 'date',
                  key: 'date',
                  render: (date: string) => dayjs(date).format('MMM DD, YYYY')
                },
                {
                  title: 'Usage Count',
                  dataIndex: 'usage_count',
                  key: 'usage_count',
                  render: (count: number) => (
                    <Space>
                      <Text>{count}</Text>
                      <Progress 
                        percent={Math.min((count / Math.max(...analyticsData.usageByDay.map(d => d.usage_count))) * 100, 100)} 
                        size="small" 
                        showInfo={false}
                      />
                    </Space>
                  )
                },
                {
                  title: 'Total Savings',
                  dataIndex: 'total_savings',
                  key: 'total_savings',
                  render: (amount: number) => `$${amount.toFixed(2)}`
                }
              ]}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Performance Summary */}
      <Row gutter={16} style={{ marginTop: '16px' }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Average Order Value"
              value={analyticsData.averageOrderValue}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Usage Rate"
              value={analyticsData.totalCoupons > 0 ? (analyticsData.totalUsage / analyticsData.totalCoupons) : 0}
              suffix="uses/coupon"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Average Savings"
              value={analyticsData.totalUsage > 0 ? (analyticsData.totalSavings / analyticsData.totalUsage) : 0}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Analytics;
