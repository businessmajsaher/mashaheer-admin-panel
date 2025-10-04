import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Space,
  Card,
  Row,
  Col,
  Tag,
  Select,
  DatePicker,
  Descriptions,
  Image,
  Divider
} from 'antd';
import { EyeOutlined, EditOutlined } from '@ant-design/icons';
import { bookingService } from '../../services/bookingService';
import { serviceService } from '../../services/serviceService';
import { Booking, BookingFilters } from '../../types/booking';
import { Service } from '../../types/service';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<BookingFilters>({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const fetchBookings = async (page = 1) => {
    setLoading(true);
    try {
      const result = await bookingService.getBookings(page, pagination.pageSize, filters);
      setBookings(result.data);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: result.total
      }));
    } catch (error) {
      message.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const result = await serviceService.getServices(1, 100);
      setServices(result.data);
    } catch (error) {
      message.error('Failed to fetch services');
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchServices();
  }, [filters]);

  const handleViewDetails = (record: Booking) => {
    setSelectedBooking(record);
    form.setFieldsValue({
      status: record.status,
      booking_date: dayjs(record.booking_date),
      duration_days: record.duration_days,
      total_amount: record.total_amount,
      location: record.location,
      special_requirements: record.special_requirements,
      script_content: record.script_content || ''
    });
    setModalVisible(true);
  };

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      await bookingService.updateBookingStatus(bookingId, status as any);
      message.success('Booking status updated successfully');
      fetchBookings(pagination.current);
    } catch (error) {
      message.error('Failed to update booking status');
    }
  };

  const handleSubmit = async (values: any) => {
    if (!selectedBooking) return;

    try {
      await bookingService.updateBooking(selectedBooking.id, {
        ...values,
        booking_date: values.booking_date?.toISOString()
      });
      message.success('Booking updated successfully');
      setModalVisible(false);
      fetchBookings(pagination.current);
    } catch (error) {
      message.error('Failed to update booking');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'blue';
      case 'completed': return 'green';
      case 'canceled': return 'red';
      case 'script_for_approval': return 'purple';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Service',
      dataIndex: 'service',
      key: 'service',
      render: (service: any) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{service?.title}</div>
          {service?.thumbnail && (
            <Image
              src={service.thumbnail}
              alt="Service thumbnail"
              width={40}
              height={40}
              style={{ objectFit: 'cover', borderRadius: '4px', marginTop: 4 }}
            />
          )}
        </div>
      )
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
      render: (customer: any) => (
        <div>
          <div>{customer?.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{customer?.email}</div>
        </div>
      )
    },
    {
      title: 'Influencer',
      dataIndex: 'influencer',
      key: 'influencer',
      render: (influencer: any) => (
        <div>
          <div>{influencer?.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{influencer?.email}</div>
        </div>
      )
    },
    {
      title: 'Booking Date',
      dataIndex: 'booking_date',
      key: 'booking_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: 'Duration',
      dataIndex: 'duration_days',
      key: 'duration_days',
      render: (days: number) => `${days} days`
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => `$${amount}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Booking) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            View Details
          </Button>
          <Select
            value={record.status}
            style={{ width: 120 }}
            onChange={(value) => handleUpdateStatus(record.id, value)}
          >
            <Option value="pending">Pending</Option>
            <Option value="approved">Approved</Option>
            <Option value="script_for_approval">Script for Approval</Option>
            <Option value="completed">Completed</Option>
            <Option value="canceled">Canceled</Option>
          </Select>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="Bookings">
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              placeholder="Filter by service"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => setFilters(prev => ({ ...prev, service_id: value }))}
            >
              {services.map(service => (
                <Option key={service.id} value={service.id}>{service.title}</Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="Filter by status"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <Option value="pending">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="script_for_approval">Script for Approval</Option>
              <Option value="completed">Completed</Option>
              <Option value="canceled">Canceled</Option>
            </Select>
          </Col>
          <Col span={6}>
            <DatePicker
              placeholder="Filter by date from"
              style={{ width: '100%' }}
              onChange={(date) => setFilters(prev => ({ 
                ...prev, 
                date_from: date?.toISOString() 
              }))}
            />
          </Col>
          <Col span={6}>
            <DatePicker
              placeholder="Filter by date to"
              style={{ width: '100%' }}
              onChange={(date) => setFilters(prev => ({ 
                ...prev, 
                date_to: date?.toISOString() 
              }))}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={bookings}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            onChange: (page) => fetchBookings(page),
            showSizeChanger: false
          }}
        />

        <Modal
          title="Booking Details"
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={700}
        >
          {selectedBooking && (
            <div>
              <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <Tag color={getStatusColor(selectedBooking.status)} style={{ fontSize: '16px', padding: '8px 16px' }}>
                  {selectedBooking.status === 'script_for_approval' ? 'Script for Your Approval' : selectedBooking.status.toUpperCase()}
                </Tag>
              </div>
              <Descriptions title="Booking Information" bordered>
                <Descriptions.Item label="Service" span={3}>
                  {selectedBooking.service?.title}
                </Descriptions.Item>
                <Descriptions.Item label="Customer" span={3}>
                  {selectedBooking.customer?.name} ({selectedBooking.customer?.email})
                </Descriptions.Item>
                <Descriptions.Item label="Influencer" span={3}>
                  {selectedBooking.influencer?.name} ({selectedBooking.influencer?.email})
                </Descriptions.Item>
                <Descriptions.Item label="Booking Date">
                  {dayjs(selectedBooking.booking_date).format('YYYY-MM-DD')}
                </Descriptions.Item>
                <Descriptions.Item label="Duration">
                  {selectedBooking.duration_days} days
                </Descriptions.Item>
                <Descriptions.Item label="Total Amount">
                  ${selectedBooking.total_amount}
                </Descriptions.Item>
                <Descriptions.Item label="Location" span={3}>
                  {selectedBooking.location || 'Not specified'}
                </Descriptions.Item>
                <Descriptions.Item label="Special Requirements" span={3}>
                  {selectedBooking.special_requirements || 'None'}
                </Descriptions.Item>
                <Descriptions.Item label="Script Content" span={3}>
                  {selectedBooking.script_content || 'No script provided'}
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="status"
                      label="Status"
                      rules={[{ required: true, message: 'Please select status' }]}
                    >
                      <Select>
                        <Option value="pending">Pending</Option>
                        <Option value="approved">Approved</Option>
                        <Option value="script_for_approval">Script for Approval</Option>
                        <Option value="completed">Completed</Option>
                        <Option value="canceled">Canceled</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="booking_date"
                      label="Booking Date"
                      rules={[{ required: true, message: 'Please select booking date' }]}
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="duration_days"
                      label="Duration (Days)"
                      rules={[{ required: true, message: 'Please enter duration' }]}
                    >
                      <Input type="number" min={1} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="total_amount"
                      label="Total Amount"
                      rules={[{ required: true, message: 'Please enter total amount' }]}
                    >
                      <Input type="number" min={0} step={0.01} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="location"
                  label="Location"
                >
                  <Input placeholder="Enter location" />
                </Form.Item>

                <Form.Item
                  name="special_requirements"
                  label="Special Requirements"
                >
                  <TextArea rows={3} placeholder="Enter special requirements" />
                </Form.Item>

                <Form.Item
                  name="script_content"
                  label="Script Content"
                >
                  <TextArea rows={4} placeholder="Enter script content" />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      Update Booking
                    </Button>
                    {selectedBooking?.status !== 'script_for_approval' && (
                      <Button type="default" icon={<EditOutlined />}>
                        Edit Script
                      </Button>
                    )}
                    <Button onClick={() => setModalVisible(false)}>
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </div>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default Bookings; 