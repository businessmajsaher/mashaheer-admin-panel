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
import { EyeOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { bookingService } from '../../services/bookingService';
import { serviceService } from '../../services/serviceService';
import { Booking, BookingFilters, BookingStatus } from '../../types/booking';
import { Service } from '../../types/service';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bookingStatuses, setBookingStatuses] = useState<BookingStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
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
      console.error('Error fetching bookings:', error);
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

  const fetchBookingStatuses = async () => {
    try {
      const statuses = await bookingService.getBookingStatuses();
      setBookingStatuses(statuses);
    } catch (error) {
      message.error('Failed to fetch booking statuses');
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchServices();
    fetchBookingStatuses();
  }, [filters]);

  const handleViewDetails = (record: Booking) => {
    setSelectedBooking(record);
    form.setFieldsValue({
      status_id: record.status_id,
      scheduled_time: record.scheduled_time ? dayjs(record.scheduled_time) : null,
      notes: record.notes || '',
      script: record.script || '',
      feedback: record.feedback || ''
    });
    setModalVisible(true);
  };

  const handleUpdateStatus = async (bookingId: string, statusId: string) => {
    try {
      await bookingService.updateBookingStatus(bookingId, statusId);
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
        scheduled_time: values.scheduled_time?.toISOString()
      });
      message.success('Booking updated successfully');
      setModalVisible(false);
      fetchBookings(pagination.current);
    } catch (error) {
      message.error('Failed to update booking');
    }
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setFilters({});
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleFilterChange = (changedValues: any, allValues: any) => {
    const newFilters: BookingFilters = {
      service_id: allValues.service_id,
      status: allValues.status,
      date_from: allValues.date_from?.toISOString(),
      date_to: allValues.date_to?.toISOString()
    };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const getStatusColor = (statusName: string) => {
    const lowerStatus = statusName?.toLowerCase() || '';
    if (lowerStatus.includes('pending')) return 'orange';
    if (lowerStatus.includes('approved') || lowerStatus.includes('confirmed')) return 'blue';
    if (lowerStatus.includes('completed')) return 'green';
    if (lowerStatus.includes('cancel')) return 'red';
    if (lowerStatus.includes('script')) return 'purple';
    return 'default';
  };

  const columns = [
    {
      title: 'Service',
      dataIndex: 'service',
      key: 'service',
      render: (service: any) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{service?.title || 'N/A'}</div>
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
          <div>{customer?.name || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{customer?.email || ''}</div>
        </div>
      )
    },
    {
      title: 'Influencer',
      dataIndex: 'influencer',
      key: 'influencer',
      render: (influencer: any) => (
        <div>
          <div>{influencer?.name || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{influencer?.email || ''}</div>
        </div>
      )
    },
    {
      title: 'Scheduled Time',
      dataIndex: 'scheduled_time',
      key: 'scheduled_time',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : 'N/A'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: any) => (
        <Tag color={getStatusColor(status?.name || '')}>
          {status?.name?.toUpperCase() || 'N/A'}
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
            value={record.status_id}
            style={{ width: 150 }}
            onChange={(value) => handleUpdateStatus(record.id, value)}
          >
            {bookingStatuses.map(status => (
              <Option key={status.id} value={status.id}>
                {status.name}
              </Option>
            ))}
          </Select>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="Bookings">
        <Form
          form={filterForm}
          onValuesChange={handleFilterChange}
          layout="inline"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col span={5}>
              <Form.Item name="service_id" style={{ marginBottom: 0, width: '100%' }}>
                <Select
                  placeholder="Filter by service"
                  style={{ width: '100%' }}
                  allowClear
                >
                  {services.map(service => (
                    <Option key={service.id} value={service.id}>{service.title}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="status" style={{ marginBottom: 0, width: '100%' }}>
                <Select
                  placeholder="Filter by status"
                  style={{ width: '100%' }}
                  allowClear
                >
                  {bookingStatuses.map(status => (
                    <Option key={status.id} value={status.id}>{status.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="date_from" style={{ marginBottom: 0, width: '100%' }}>
                <DatePicker
                  placeholder="Filter by date from"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="date_to" style={{ marginBottom: 0, width: '100%' }}>
                <DatePicker
                  placeholder="Filter by date to"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleResetFilters}
                style={{ width: '100%' }}
              >
                Reset
              </Button>
            </Col>
          </Row>
        </Form>

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
                <Tag color={getStatusColor(selectedBooking.status?.name || '')} style={{ fontSize: '16px', padding: '8px 16px' }}>
                  {selectedBooking.status?.name?.toUpperCase() || 'N/A'}
                </Tag>
              </div>
              <Descriptions title="Booking Information" bordered>
                <Descriptions.Item label="Service" span={3}>
                  {selectedBooking.service?.title || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Customer" span={3}>
                  {selectedBooking.customer?.name || 'N/A'} ({selectedBooking.customer?.email || 'N/A'})
                </Descriptions.Item>
                <Descriptions.Item label="Influencer" span={3}>
                  {selectedBooking.influencer?.name || 'N/A'} ({selectedBooking.influencer?.email || 'N/A'})
                </Descriptions.Item>
                <Descriptions.Item label="Scheduled Time" span={3}>
                  {selectedBooking.scheduled_time ? dayjs(selectedBooking.scheduled_time).format('YYYY-MM-DD HH:mm') : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Completed Time" span={3}>
                  {selectedBooking.completed_time ? dayjs(selectedBooking.completed_time).format('YYYY-MM-DD HH:mm') : 'Not completed'}
                </Descriptions.Item>
                <Descriptions.Item label="Notes" span={3}>
                  {selectedBooking.notes || 'None'}
                </Descriptions.Item>
                <Descriptions.Item label="Script" span={3}>
                  {selectedBooking.script || 'No script provided'}
                </Descriptions.Item>
                <Descriptions.Item label="Script Created At" span={3}>
                  {selectedBooking.script_created_at ? dayjs(selectedBooking.script_created_at).format('YYYY-MM-DD HH:mm') : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Script Approved At" span={3}>
                  {selectedBooking.script_approved_at ? dayjs(selectedBooking.script_approved_at).format('YYYY-MM-DD HH:mm') : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Script Rejected Count" span={3}>
                  {selectedBooking.script_rejected_count || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Feedback" span={3}>
                  {selectedBooking.feedback || 'No feedback'}
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
              >
                <Form.Item
                  name="status_id"
                  label="Status"
                  rules={[{ required: true, message: 'Please select status' }]}
                >
                  <Select>
                    {bookingStatuses.map(status => (
                      <Option key={status.id} value={status.id}>
                        {status.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="scheduled_time"
                  label="Scheduled Time"
                  rules={[{ required: true, message: 'Please select scheduled time' }]}
                >
                  <DatePicker 
                    showTime 
                    style={{ width: '100%' }} 
                    format="YYYY-MM-DD HH:mm"
                  />
                </Form.Item>

                <Form.Item
                  name="notes"
                  label="Notes"
                >
                  <TextArea rows={3} placeholder="Enter notes" />
                </Form.Item>

                <Form.Item
                  name="script"
                  label="Script"
                >
                  <TextArea rows={4} placeholder="Enter script content" />
                </Form.Item>

                <Form.Item
                  name="feedback"
                  label="Feedback"
                >
                  <TextArea rows={3} placeholder="Enter feedback" />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      Update Booking
                    </Button>
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
