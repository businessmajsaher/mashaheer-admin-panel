import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Avatar, Spin, Empty } from 'antd';
import { UserOutlined, StarOutlined, ShoppingCartOutlined, CalendarOutlined, TrophyOutlined, DollarOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';
import { dashboardService, TopInfluencer, PaymentLog } from '@/services/dashboardService';
import { formatPrice } from '@/utils/currencyUtils';
import dayjs from 'dayjs';

export default function Dashboard() {
  const [stats, setStats] = useState({ influencers: 0, customers: 0, bookings: 0, services: 0 });
  const [topInfluencers, setTopInfluencers] = useState<TopInfluencer[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [loadingInfluencers, setLoadingInfluencers] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Influencers count (profiles with role 'influencer')
        const { count: influencers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'influencer');

        // Customers count (profiles with role 'customer')
        const { count: customers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer');

        // Bookings count
        const { count: bookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true });

        // Services count
        const { count: services } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true });

        setStats({ 
          influencers: influencers || 0, 
          customers: customers || 0, 
          bookings: bookings || 0,
          services: services || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    fetchTopInfluencers();
    fetchPaymentLogs();
  }, []);

  const fetchTopInfluencers = async () => {
    setLoadingInfluencers(true);
    try {
      const data = await dashboardService.getTopInfluencers(10);
      setTopInfluencers(data);
    } catch (error) {
      console.error('Error fetching top influencers:', error);
    } finally {
      setLoadingInfluencers(false);
    }
  };

  const fetchPaymentLogs = async () => {
    setLoadingPayments(true);
    try {
      const data = await dashboardService.getRecentPaymentLogs();
      setPaymentLogs(data);
    } catch (error) {
      console.error('Error fetching payment logs:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const statCards = [
    { name: 'Influencers', value: stats.influencers || 0 },
    { name: 'Customers', value: stats.customers || 0 },
    { name: 'Bookings', value: stats.bookings || 0 },
    { name: 'Services', value: stats.services || 0 },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px' }}>Dashboard</h1>
      
      <Row gutter={[16, 16]}>
        {statCards.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <Statistic 
                title={stat.name} 
                value={stat.value} 
                prefix={
                  index === 0 ? <StarOutlined /> :
                  index === 1 ? <UserOutlined /> :
                  index === 2 ? <CalendarOutlined /> :
                  <ShoppingCartOutlined />
                }
                valueStyle={{ fontSize: 32 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        {/* Top Performing Influencers */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <span>
                <TrophyOutlined style={{ marginRight: 8, color: '#ffd700' }} />
                Top Performing Influencers
              </span>
            }
            loading={loadingInfluencers}
          >
            {topInfluencers.length > 0 ? (
              <Table
                dataSource={topInfluencers}
                rowKey="influencer_id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Rank',
                    key: 'rank',
                    width: 60,
                    render: (_: any, __: any, index: number) => (
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#666',
                        fontSize: index < 3 ? '18px' : '14px'
                      }}>
                        #{index + 1}
                      </span>
                    )
                  },
                  {
                    title: 'Influencer',
                    key: 'influencer',
                    render: (_: any, record: TopInfluencer) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar 
                          src={record.profile_image_url} 
                          icon={<UserOutlined />}
                          size="small"
                        />
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{record.name}</div>
                          <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{record.email}</div>
                        </div>
                      </div>
                    )
                  },
                  {
                    title: 'Revenue',
                    key: 'revenue',
                    align: 'right',
                    render: (_: any, record: TopInfluencer) => (
                      <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                        {formatPrice(record.total_revenue, 'KWD')}
                      </span>
                    )
                  },
                  {
                    title: 'Bookings',
                    key: 'bookings',
                    align: 'right',
                    render: (_: any, record: TopInfluencer) => (
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{record.completed_bookings}/{record.total_bookings}</div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                          {record.completion_rate.toFixed(1)}% complete
                        </div>
                      </div>
                    )
                  },
                  {
                    title: 'Rating',
                    key: 'rating',
                    align: 'right',
                    render: (_: any, record: TopInfluencer) => (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <StarOutlined style={{ color: '#faad14' }} />
                          <span style={{ fontWeight: 'bold' }}>
                            {record.average_rating > 0 ? record.average_rating.toFixed(1) : 'N/A'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                          {record.review_count} reviews
                        </div>
                      </div>
                    )
                  }
                ]}
              />
            ) : (
              <Empty description="No influencer data available" />
            )}
          </Card>
        </Col>

        {/* Payment Logs */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <span>
                <DollarOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                Recent Payment Logs
              </span>
            }
            loading={loadingPayments}
            extra={
              <a href="/bookings">View All</a>
            }
          >
            {paymentLogs.length > 0 ? (
              <Table
                dataSource={paymentLogs}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ y: 400 }}
                columns={[
                  {
                    title: 'Date',
                    key: 'date',
                    width: 120,
                    render: (_: any, record: PaymentLog) => (
                      <div style={{ fontSize: '12px' }}>
                        {dayjs(record.created_at).format('MMM DD')}
                        <div style={{ color: '#8c8c8c' }}>
                          {dayjs(record.created_at).format('HH:mm')}
                        </div>
                      </div>
                    )
                  },
                  {
                    title: 'Customer',
                    key: 'customer',
                    render: (_: any, record: PaymentLog) => (
                      <div>
                        <div style={{ fontWeight: '500' }}>{record.payer?.name || 'N/A'}</div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                          {record.payer?.email || ''}
                        </div>
                      </div>
                    )
                  },
                  {
                    title: 'Influencer',
                    key: 'influencer',
                    render: (_: any, record: PaymentLog) => (
                      <div>
                        <div style={{ fontWeight: '500' }}>{record.payee?.name || 'N/A'}</div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                          {record.payee?.email || ''}
                        </div>
                      </div>
                    )
                  },
                  {
                    title: 'Amount',
                    key: 'amount',
                    align: 'right',
                    render: (_: any, record: PaymentLog) => (
                      <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                        {formatPrice(record.amount, 'KWD')}
                      </span>
                    )
                  },
                  {
                    title: 'Status',
                    key: 'status',
                    width: 100,
                    render: (_: any, record: PaymentLog) => (
                      <Tag color={
                        record.status === 'completed' ? 'green' :
                        record.status === 'pending' ? 'orange' :
                        'red'
                      }>
                        {record.status?.toUpperCase()}
                      </Tag>
                    )
                  },
                  {
                    title: 'Method',
                    key: 'method',
                    width: 80,
                    render: (_: any, record: PaymentLog) => (
                      <span style={{ fontSize: '12px' }}>
                        {record.payment_method || 'N/A'}
                      </span>
                    )
                  }
                ]}
              />
            ) : (
              <Empty description="No payment logs available" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card title="Quick Actions">
            <p>Welcome to your admin dashboard! Here you can manage:</p>
            <ul>
              <li><strong>Categories:</strong> Manage service categories</li>
              <li><strong>Services:</strong> Create and manage services</li>
              <li><strong>Bookings:</strong> View and manage bookings</li>
              <li><strong>Users:</strong> Manage influencers and customers</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
} 