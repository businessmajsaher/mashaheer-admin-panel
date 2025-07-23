import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin, Alert } from 'antd';
import { UserOutlined, ShoppingCartOutlined, TeamOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/services/supabaseClient';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ influencers: 0, customers: 0, orders: 0 });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        // Influencers count
        const { count: influencers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'influencer');
        // Customers count
        const { count: customers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer');
        // Orders count
        const { count: orders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });
        setStats({ influencers: influencers || 0, customers: customers || 0, orders: orders || 0 });

        // For chart: group by month (demo: just show total for now)
        setChartData([
          { name: 'Influencers', value: influencers || 0 },
          { name: 'Customers', value: customers || 0 },
          { name: 'Orders', value: orders || 0 },
        ]);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      {loading && <Spin size="large" />}
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Influencers" value={stats.influencers} prefix={<TeamOutlined />} valueStyle={{ fontSize: 32 }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Customers" value={stats.customers} prefix={<UserOutlined />} valueStyle={{ fontSize: 32 }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Orders" value={stats.orders} prefix={<ShoppingCartOutlined />} valueStyle={{ fontSize: 32 }} />
          </Card>
        </Col>
      </Row>
      <Card style={{ marginTop: 32 }}>
        <Typography.Title level={4} style={{ marginBottom: 16 }}>
          Platform Overview
        </Typography.Title>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#1890ff" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
} 