import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { UserOutlined, StarOutlined, ShoppingCartOutlined, CalendarOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';

export default function Dashboard() {
  const [stats, setStats] = useState({ influencers: 0, customers: 0, bookings: 0, services: 0 });

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
  }, []);

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
        <Col span={24}>
          <Card title="Recent Activity">
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