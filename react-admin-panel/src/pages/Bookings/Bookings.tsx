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
import { EyeOutlined, EditOutlined, ReloadOutlined, DollarOutlined } from '@ant-design/icons';
import { bookingService } from '../../services/bookingService';
import { serviceService } from '../../services/serviceService';
import { refundService, RefundRequest } from '../../services/refundService';
import { Booking, BookingFilters, BookingStatus } from '../../types/booking';
import { Service } from '../../types/service';
import { formatPrice } from '../../utils/currencyUtils';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bookingStatuses, setBookingStatuses] = useState<BookingStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [form] = Form.useForm();
  const [refundForm] = Form.useForm();
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

  const handleViewDetails = async (record: Booking) => {
    // Fetch full booking details including refunds
    try {
      const fullBooking = await bookingService.getBooking(record.id);
      setSelectedBooking(fullBooking);
      form.setFieldsValue({
        status_id: fullBooking.status_id,
        scheduled_time: fullBooking.scheduled_time ? dayjs(fullBooking.scheduled_time) : null,
        notes: fullBooking.notes || '',
        script: fullBooking.script || '',
        feedback: fullBooking.feedback || ''
      });
      setModalVisible(true);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      message.error('Failed to fetch booking details');
    }
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

  const handleInitiateRefund = (booking: Booking) => {
    setSelectedBooking(booking);
    // Get completed payment for this booking
    const completedPayment = (booking as any).payments?.find((p: any) => p.status === 'completed');
    if (completedPayment) {
      refundForm.setFieldsValue({
        amount: completedPayment.amount,
        reason: ''
      });
    }
    setRefundModalVisible(true);
  };

  const handleRefundSubmit = async (values: any) => {
    if (!selectedBooking) return;

    setRefundLoading(true);
    try {
      const refundRequest: RefundRequest = {
        booking_id: selectedBooking.id,
        amount: values.amount,
        reason: values.reason
      };

      const result = await refundService.initiateRefund(refundRequest);
      
      if (result.status === 'completed') {
        message.success('Refund processed successfully');
      } else if (result.status === 'processing') {
        message.info('Refund is being processed');
      } else {
        message.warning('Refund request submitted but may need manual review');
      }

      setRefundModalVisible(false);
      refundForm.resetFields();
      fetchBookings(pagination.current);
    } catch (error: any) {
      console.error('Refund error:', error);
      message.error(error.message || 'Failed to initiate refund');
    } finally {
      setRefundLoading(false);
    }
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
      title: 'Refund Status',
      key: 'refund_status',
      width: 150,
      render: (_: any, record: Booking) => {
        const refunds = (record as any).refunds || [];
        if (refunds.length === 0) {
          return <Tag>No Refund</Tag>;
        }
        
        // Get the latest refund
        const latestRefund = refunds.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        const refundStatus = latestRefund.status;
        const color = 
          refundStatus === 'completed' ? 'green' :
          refundStatus === 'processing' ? 'orange' :
          refundStatus === 'pending' ? 'blue' :
          refundStatus === 'failed' ? 'red' : 'default';
        
        return (
          <div>
            <Tag color={color}>
              {refundStatus?.toUpperCase() || 'N/A'}
            </Tag>
            {latestRefund.amount && (
              <div style={{ fontSize: '11px', color: '#666', marginTop: 4 }}>
                {formatPrice(Number(latestRefund.amount), 'KWD')}
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 300,
      render: (_: any, record: Booking) => {
        const completedPayment = (record as any).payments?.find((p: any) => p.status === 'completed');
        const refunds = (record as any).refunds || [];
        const hasCompletedRefund = refunds.some((r: any) => r.status === 'completed');
        
        return (
          <Space>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            >
              View Details
            </Button>
            {completedPayment && (
              <Button
                type="link"
                icon={<DollarOutlined />}
                danger={!hasCompletedRefund}
                disabled={hasCompletedRefund}
                onClick={() => handleInitiateRefund(record)}
                title={hasCompletedRefund ? 'Refund already completed' : 'Initiate manual refund'}
              >
                {hasCompletedRefund ? 'Refunded' : 'Refund'}
              </Button>
            )}
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
        );
      }
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
                <Descriptions.Item label="Days Gap" span={3}>
                  {selectedBooking.days_gap ? `${selectedBooking.days_gap} days` : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Is Published" span={3}>
                  {selectedBooking.is_published ? (
                    <Tag color="green">Yes {selectedBooking.published_at ? `(${dayjs(selectedBooking.published_at).format('YYYY-MM-DD HH:mm')})` : ''}</Tag>
                  ) : (
                    <Tag color="red">No</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>

              {/* Revision Time Frames (Non-editable) */}
              <Divider>Revision Time Frames</Divider>
              <Descriptions bordered size="small">
                <Descriptions.Item label="Influencer Approval Deadline" span={2}>
                  {selectedBooking.influencer_approval_deadline ? (
                    <span style={{ 
                      color: dayjs(selectedBooking.influencer_approval_deadline).isBefore(dayjs()) ? '#ff4d4f' : '#52c41a',
                      fontWeight: 'bold'
                    }}>
                      {dayjs(selectedBooking.influencer_approval_deadline).format('YYYY-MM-DD HH:mm')}
                      {dayjs(selectedBooking.influencer_approval_deadline).isBefore(dayjs()) && ' (Expired)'}
                    </span>
                  ) : 'Not set'}
                </Descriptions.Item>
                <Descriptions.Item label="Customer Approval and Payment Deadline" span={2}>
                  {selectedBooking.payment_deadline ? (
                    <span style={{ 
                      color: dayjs(selectedBooking.payment_deadline).isBefore(dayjs()) ? '#ff4d4f' : '#52c41a',
                      fontWeight: 'bold'
                    }}>
                      {dayjs(selectedBooking.payment_deadline).format('YYYY-MM-DD HH:mm')}
                      {dayjs(selectedBooking.payment_deadline).isBefore(dayjs()) && ' (Expired)'}
                    </span>
                  ) : 'Not set'}
                </Descriptions.Item>
                <Descriptions.Item label="Script Submission Deadline" span={2}>
                  {selectedBooking.script_submission_deadline ? (
                    <span style={{ 
                      color: dayjs(selectedBooking.script_submission_deadline).isBefore(dayjs()) ? '#ff4d4f' : '#52c41a',
                      fontWeight: 'bold'
                    }}>
                      {dayjs(selectedBooking.script_submission_deadline).format('YYYY-MM-DD HH:mm')}
                      {dayjs(selectedBooking.script_submission_deadline).isBefore(dayjs()) && ' (Expired)'}
                    </span>
                  ) : 'Not set'}
                </Descriptions.Item>
                <Descriptions.Item label="Auto-Approval Deadline" span={2}>
                  {selectedBooking.auto_approval_deadline ? (
                    <span style={{ 
                      color: dayjs(selectedBooking.auto_approval_deadline).isBefore(dayjs()) ? '#ff4d4f' : '#52c41a',
                      fontWeight: 'bold'
                    }}>
                      {dayjs(selectedBooking.auto_approval_deadline).format('YYYY-MM-DD HH:mm')}
                      {dayjs(selectedBooking.auto_approval_deadline).isBefore(dayjs()) && ' (Expired)'}
                    </span>
                  ) : 'Not set'}
                </Descriptions.Item>
                <Descriptions.Item label="Appointment End Time" span={2}>
                  {selectedBooking.appointment_end_time ? (
                    <span style={{ 
                      color: dayjs(selectedBooking.appointment_end_time).isBefore(dayjs()) ? '#ff4d4f' : '#52c41a',
                      fontWeight: 'bold'
                    }}>
                      {dayjs(selectedBooking.appointment_end_time).format('YYYY-MM-DD HH:mm')}
                      {dayjs(selectedBooking.appointment_end_time).isBefore(dayjs()) && ' (Expired)'}
                    </span>
                  ) : 'Not set'}
                </Descriptions.Item>
                {selectedBooking.influencer_response_deadline && (
                  <Descriptions.Item label="Influencer Response Deadline" span={2}>
                    <span style={{ 
                      color: dayjs(selectedBooking.influencer_response_deadline).isBefore(dayjs()) ? '#ff4d4f' : '#ff9800',
                      fontWeight: 'bold'
                    }}>
                      {dayjs(selectedBooking.influencer_response_deadline).format('YYYY-MM-DD HH:mm')}
                      {dayjs(selectedBooking.influencer_response_deadline).isBefore(dayjs()) && ' (Expired)'}
                    </span>
                  </Descriptions.Item>
                )}
                {selectedBooking.last_script_submitted_at && (
                  <Descriptions.Item label="Last Script Submitted" span={2}>
                    {dayjs(selectedBooking.last_script_submitted_at).format('YYYY-MM-DD HH:mm')}
                  </Descriptions.Item>
                )}
                {selectedBooking.last_script_rejected_at && (
                  <Descriptions.Item label="Last Script Rejected" span={2}>
                    {dayjs(selectedBooking.last_script_rejected_at).format('YYYY-MM-DD HH:mm')}
                    {selectedBooking.last_rejection_reason && (
                      <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                        Reason: {selectedBooking.last_rejection_reason}
                      </div>
                    )}
                  </Descriptions.Item>
                )}
                {selectedBooking.is_ai_generated_script && (
                  <Descriptions.Item label="AI Scripts Generated" span={2}>
                    <Tag color="purple">{selectedBooking.ai_script_count || 0} AI scripts</Tag>
                  </Descriptions.Item>
                )}
              </Descriptions>

              {/* Payment Information */}
              {(selectedBooking as any).payments && (selectedBooking as any).payments.length > 0 && (
                <>
                  <Divider>Payment Information</Divider>
                  <Descriptions bordered>
                    {(selectedBooking as any).payments.map((payment: any, index: number) => (
                      <React.Fragment key={payment.id || index}>
                        <Descriptions.Item label="Amount" span={1}>
                          {formatPrice(Number(payment.amount), 'KWD')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Status" span={1}>
                          <Tag color={payment.status === 'completed' ? 'green' : payment.status === 'pending' ? 'orange' : 'red'}>
                            {payment.status?.toUpperCase()}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Payment Method" span={1}>
                          {payment.payment_method || 'N/A'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Transaction Reference" span={3}>
                          {payment.transaction_reference || 'N/A'}
                        </Descriptions.Item>
                        {payment.paid_at && (
                          <Descriptions.Item label="Paid At" span={3}>
                            {dayjs(payment.paid_at).format('YYYY-MM-DD HH:mm')}
                          </Descriptions.Item>
                        )}
                      </React.Fragment>
                    ))}
                  </Descriptions>
                </>
              )}

              {/* Refund History */}
              {(selectedBooking as any).refunds && (selectedBooking as any).refunds.length > 0 && (
                <>
                  <Divider>Refund History</Divider>
                  <Descriptions bordered>
                    {(selectedBooking as any).refunds.map((refund: any, index: number) => (
                      <React.Fragment key={refund.id || index}>
                        <Descriptions.Item label="Amount" span={1}>
                          {formatPrice(Number(refund.amount), 'KWD')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Status" span={1}>
                          <Tag color={
                            refund.status === 'completed' ? 'green' : 
                            refund.status === 'processing' ? 'orange' : 
                            refund.status === 'failed' ? 'red' : 'default'
                          }>
                            {refund.status?.toUpperCase()}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Created At" span={1}>
                          {dayjs(refund.created_at).format('YYYY-MM-DD HH:mm')}
                        </Descriptions.Item>
                        {refund.reason && (
                          <Descriptions.Item label="Reason" span={3}>
                            {refund.reason}
                          </Descriptions.Item>
                        )}
                        {refund.hesabe_refund_id && (
                          <Descriptions.Item label="Hesabe Refund ID" span={3}>
                            {refund.hesabe_refund_id}
                          </Descriptions.Item>
                        )}
                      </React.Fragment>
                    ))}
                  </Descriptions>
                </>
              )}

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

        {/* Refund Modal */}
        <Modal
          title="Initiate Refund"
          open={refundModalVisible}
          onCancel={() => {
            setRefundModalVisible(false);
            refundForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          {selectedBooking && (
            <Form
              form={refundForm}
              layout="vertical"
              onFinish={handleRefundSubmit}
            >
              <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Booking ID" span={2}>
                  {selectedBooking.id}
                </Descriptions.Item>
                <Descriptions.Item label="Service" span={2}>
                  {selectedBooking.service?.title || 'N/A'}
                </Descriptions.Item>
                {(selectedBooking as any).payments?.find((p: any) => p.status === 'completed') && (
                  <>
                    <Descriptions.Item label="Payment Amount" span={2}>
                      {formatPrice(Number((selectedBooking as any).payments.find((p: any) => p.status === 'completed').amount), 'KWD')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Transaction Reference" span={2}>
                      {(selectedBooking as any).payments.find((p: any) => p.status === 'completed').transaction_reference || 'N/A'}
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>

              <Form.Item
                name="amount"
                label="Refund Amount"
                rules={[
                  { required: true, message: 'Please enter refund amount' },
                  {
                    validator: (_, value) => {
                      const completedPayment = (selectedBooking as any).payments?.find((p: any) => p.status === 'completed');
                      if (completedPayment && value > completedPayment.amount) {
                        return Promise.reject(new Error('Refund amount cannot exceed payment amount'));
                      }
                      if (value <= 0) {
                        return Promise.reject(new Error('Refund amount must be greater than 0'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Enter refund amount"
                  prefix="د.ك"
                />
              </Form.Item>

              <Form.Item
                name="reason"
                label="Refund Reason"
                rules={[{ required: true, message: 'Please enter refund reason' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="Enter reason for refund (e.g., Customer cancellation, Service not delivered, etc.)"
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={refundLoading}
                    danger
                  >
                    Initiate Refund
                  </Button>
                  <Button onClick={() => {
                    setRefundModalVisible(false);
                    refundForm.resetFields();
                  }}>
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default Bookings;
