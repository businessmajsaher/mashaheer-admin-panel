import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Tag, Space, message, Popconfirm, Avatar } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';

interface Review {
  id: string;
  reviewer_id: string;
  influencer_id: string;
  rating: number;
  review_text: string;
  created_at: string;
  is_approved: boolean | null;
  is_rejected: boolean | null;
  approved_at: string | null;
  rejected_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  reviewer?: {
    name: string;
    profile_image_url?: string;
  };
  influencer?: {
    name: string;
    profile_image_url?: string;
  };
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchReviews();
  }, [currentPage, pageSize, filter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      // Build query with filters - fetch reviews and join with profiles
      let query = supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id(id, name, profile_image_url),
          influencer:profiles!influencer_id(id, name, profile_image_url)
        `, { count: 'exact' });

      // Apply status filter
      if (filter === 'pending') {
        // Pending = not approved and not rejected (both false or null)
        // We'll filter in JavaScript after fetching since Supabase doesn't support complex AND/OR easily
      } else if (filter === 'approved') {
        query = query.eq('is_approved', true);
      } else if (filter === 'rejected') {
        query = query.eq('is_rejected', true);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) {
        console.error('Error fetching reviews:', error);
        message.error('Failed to fetch reviews');
        return;
      }

      // Transform the data to handle nested profiles
      let transformedData = (data || []).map((review: any) => ({
        ...review,
        reviewer: review.reviewer || null,
        influencer: review.influencer || null,
      }));

      // Apply pending filter in JavaScript if needed
      if (filter === 'pending') {
        transformedData = transformedData.filter((review: Review) => 
          (!review.is_approved || review.is_approved === false) && 
          (!review.is_rejected || review.is_rejected === false)
        );
      }

      setReviews(transformedData);
      setTotal(filter === 'pending' ? transformedData.length : (count || 0));
    } catch (err) {
      console.error('Error fetching reviews:', err);
      message.error('Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to approve reviews');
        return;
      }

      const { error } = await supabase
        .from('reviews')
        .update({
          is_approved: true,
          is_rejected: false,
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          rejection_reason: null,
        })
        .eq('id', reviewId);

      if (error) {
        console.error('Error approving review:', error);
        message.error('Failed to approve review');
        return;
      }

      message.success('Review approved successfully');
      fetchReviews();
    } catch (err) {
      console.error('Error approving review:', err);
      message.error('Failed to approve review');
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to reject reviews');
        return;
      }

      const { error } = await supabase
        .from('reviews')
        .update({
          is_approved: false,
          is_rejected: true,
          rejected_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq('id', reviewId);

      if (error) {
        console.error('Error rejecting review:', error);
        message.error('Failed to reject review');
        return;
      }

      message.success('Review rejected successfully');
      fetchReviews();
    } catch (err) {
      console.error('Error rejecting review:', err);
      message.error('Failed to reject review');
    }
  };

  const getStatusTag = (review: Review) => {
    if (review.is_approved) {
      return <Tag color="green">Approved</Tag>;
    }
    if (review.is_rejected) {
      return <Tag color="red">Rejected</Tag>;
    }
    return <Tag color="orange">Pending</Tag>;
  };

  const columns = [
    {
      title: 'Reviewer',
      key: 'reviewer',
      render: (record: Review) => (
        <Space>
          <Avatar 
            src={record.reviewer?.profile_image_url} 
            size={32}
            style={{ backgroundColor: record.reviewer?.profile_image_url ? 'transparent' : '#1890ff' }}
          >
            {record.reviewer?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <span>{record.reviewer?.name || 'Unknown'}</span>
        </Space>
      ),
    },
    {
      title: 'Influencer',
      key: 'influencer',
      render: (record: Review) => (
        <Space>
          <Avatar 
            src={record.influencer?.profile_image_url} 
            size={32}
            style={{ backgroundColor: record.influencer?.profile_image_url ? 'transparent' : '#1890ff' }}
          >
            {record.influencer?.name?.charAt(0)?.toUpperCase() || 'I'}
          </Avatar>
          <span>{record.influencer?.name || 'Unknown'}</span>
        </Space>
      ),
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => (
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#faad14' }}>
          {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
        </span>
      ),
    },
    {
      title: 'Review',
      dataIndex: 'review_text',
      key: 'review_text',
      render: (text: string) => (
        <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {text || '-'}
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: Review) => getStatusTag(record),
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Review) => (
        <Space>
          {(!record.is_approved && !record.is_rejected) && (
            <>
              <Popconfirm
                title="Approve this review?"
                description="This review will be visible to the public."
                onConfirm={() => handleApprove(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button 
                  type="primary" 
                  icon={<CheckOutlined />} 
                  size="small"
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                  Approve
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Reject this review?"
                description="This review will be hidden from the public."
                onConfirm={() => handleReject(record.id)}
                okText="Yes"
                cancelText="No"
                okType="danger"
              >
                <Button 
                  danger 
                  icon={<CloseOutlined />} 
                  size="small"
                >
                  Reject
                </Button>
              </Popconfirm>
            </>
          )}
          {record.is_approved && (
            <Tag color="green">Approved</Tag>
          )}
          {record.is_rejected && (
            <Tag color="red">Rejected</Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ margin: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Reviews</Typography.Title>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchReviews}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Filter buttons */}
      <Space style={{ marginBottom: 16 }}>
        <Button 
          type={filter === 'all' ? 'primary' : 'default'}
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button 
          type={filter === 'pending' ? 'primary' : 'default'}
          onClick={() => setFilter('pending')}
        >
          Pending
        </Button>
        <Button 
          type={filter === 'approved' ? 'primary' : 'default'}
          onClick={() => setFilter('approved')}
        >
          Approved
        </Button>
        <Button 
          type={filter === 'rejected' ? 'primary' : 'default'}
          onClick={() => setFilter('rejected')}
        >
          Rejected
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={reviews}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} reviews`,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size || 10);
          },
        }}
      />
    </Card>
  );
}
