import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  DatePicker,
  Select,
  Button,
  Space,
  Typography,
  Statistic,
  Row,
  Col,
  Tag,
  message,
  Spin,
  Descriptions,
  Modal,
  Divider
} from 'antd';
import {
  DollarOutlined,
  CalendarOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { cashOutService, InfluencerEarning, CashOutSummary, PaymentEarning } from '../../services/cashOutService';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export default function CashOut() {
  const [loading, setLoading] = useState(false);
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('monthly');
  const [startDate, setStartDate] = useState<string>();
  const [endDate, setEndDate] = useState<string>();
  const [earnings, setEarnings] = useState<InfluencerEarning[]>([]);
  const [summary, setSummary] = useState<CashOutSummary | null>(null);
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerEarning | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<PaymentEarning[]>([]);
  const [settling, setSettling] = useState<string | null>(null);

  useEffect(() => {
    fetchEarnings();
  }, [periodType, startDate, endDate]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const [earningsData, summaryData] = await Promise.all([
        cashOutService.getInfluencerEarnings(periodType, startDate, endDate),
        cashOutService.getCashOutSummary(periodType, startDate, endDate)
      ]);
      setEarnings(earningsData);
      setSummary(summaryData);
    } catch (error: any) {
      console.error('Error fetching earnings:', error);
      message.error(error.message || 'Failed to fetch earnings data');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (value: 'weekly' | 'monthly') => {
    setPeriodType(value);
    // Reset dates when period type changes
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setStartDate(dates[0].startOf('day').toISOString());
      setEndDate(dates[1].endOf('day').toISOString());
    } else {
      setStartDate(undefined);
      setEndDate(undefined);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'KWD') => {
    return new Intl.NumberFormat('en-KW', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  };

  const handleViewPayments = (influencer: InfluencerEarning) => {
    setSelectedInfluencer(influencer);
    setSelectedPayments(influencer.payments);
    setPaymentModalVisible(true);
  };

  const handleMarkAsSettled = async (influencer: InfluencerEarning) => {
    // Calculate date range if not provided
    const periodStart = startDate || (() => {
      const date = new Date();
      if (periodType === 'weekly') {
        date.setDate(date.getDate() - date.getDay());
      } else {
        date.setDate(1);
      }
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    })();
    
    const periodEnd = endDate || new Date().toISOString();

    setSettling(influencer.influencer_id);
    try {
      await cashOutService.markAsSettled(
        influencer.influencer_id,
        periodType,
        periodStart,
        periodEnd,
        influencer
      );
      message.success(`${influencer.influencer_name} marked as settled`);
      await fetchEarnings(); // Refresh data
    } catch (error: any) {
      console.error('Error marking as settled:', error);
      message.error(error.message || 'Failed to mark as settled');
    } finally {
      setSettling(null);
    }
  };

  const handleUnmarkSettled = async (influencer: InfluencerEarning) => {
    // Calculate date range if not provided
    const periodStart = startDate || (() => {
      const date = new Date();
      if (periodType === 'weekly') {
        date.setDate(date.getDate() - date.getDay());
      } else {
        date.setDate(1);
      }
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    })();
    
    const periodEnd = endDate || new Date().toISOString();

    setSettling(influencer.influencer_id);
    try {
      await cashOutService.unmarkSettled(
        influencer.influencer_id,
        periodType,
        periodStart,
        periodEnd
      );
      message.success(`${influencer.influencer_name} settlement removed`);
      await fetchEarnings(); // Refresh data
    } catch (error: any) {
      console.error('Error unmarking settled:', error);
      message.error(error.message || 'Failed to remove settlement');
    } finally {
      setSettling(null);
    }
  };

  const columns: ColumnsType<InfluencerEarning> = [
    {
      title: 'Influencer',
      dataIndex: 'influencer_name',
      key: 'influencer_name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.influencer_email}</div>
        </div>
      ),
    },
    {
      title: 'Total Earnings',
      dataIndex: 'total_earnings',
      key: 'total_earnings',
      align: 'right',
      render: (amount, record) => formatCurrency(amount, record.currency),
      sorter: (a, b) => a.total_earnings - b.total_earnings,
    },
    {
      title: 'PG Charges',
      dataIndex: 'total_pg_charges',
      key: 'total_pg_charges',
      align: 'right',
      render: (amount, record) => (
        <Text type="warning">-{formatCurrency(amount, record.currency)}</Text>
      ),
    },
    {
      title: 'Platform Commission',
      dataIndex: 'total_platform_commission',
      key: 'total_platform_commission',
      align: 'right',
      render: (amount, record) => (
        <Text type="danger">-{formatCurrency(amount, record.currency)}</Text>
      ),
    },
    {
      title: 'Net Payout',
      dataIndex: 'net_payout',
      key: 'net_payout',
      align: 'right',
      render: (amount, record) => (
        <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
          {formatCurrency(amount, record.currency)}
        </Text>
      ),
      sorter: (a, b) => a.net_payout - b.net_payout,
    },
    {
      title: 'Payments',
      dataIndex: 'payment_count',
      key: 'payment_count',
      align: 'center',
      render: (count) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: 'Settlement Status',
      key: 'settlement_status',
      align: 'center',
      render: (_, record) => {
        if (record.is_settled) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Settled
            </Tag>
          );
        }
        return (
          <Tag color="default" icon={<CloseCircleOutlined />}>
            Unsettled
          </Tag>
        );
      },
      filters: [
        { text: 'Settled', value: 'settled' },
        { text: 'Unsettled', value: 'unsettled' },
      ],
      onFilter: (value, record) => {
        if (value === 'settled') return record.is_settled === true;
        if (value === 'unsettled') return record.is_settled === false;
        return true;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewPayments(record)}
            size="small"
          >
            Details
          </Button>
          {record.is_settled ? (
            <Button
              type="link"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleUnmarkSettled(record)}
              loading={settling === record.influencer_id}
              size="small"
            >
              Unsettle
            </Button>
          ) : (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleMarkAsSettled(record)}
              loading={settling === record.influencer_id}
              size="small"
            >
              Mark Settled
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const paymentColumns: ColumnsType<PaymentEarning> = [
    {
      title: 'Service',
      dataIndex: 'service_title',
      key: 'service_title',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount, record) => formatCurrency(amount, record.currency),
    },
    {
      title: 'PG Charge',
      dataIndex: 'pg_charge',
      key: 'pg_charge',
      align: 'right',
      render: (amount, record) => (
        <Text type="warning">-{formatCurrency(amount, record.currency)}</Text>
      ),
    },
    {
      title: 'Platform Commission',
      dataIndex: 'platform_commission',
      key: 'platform_commission',
      align: 'right',
      render: (amount, record) => (
        <Text type="danger">-{formatCurrency(amount, record.currency)}</Text>
      ),
    },
    {
      title: 'Net Amount',
      dataIndex: 'net_amount',
      key: 'net_amount',
      align: 'right',
      render: (amount, record) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatCurrency(amount, record.currency)}
        </Text>
      ),
    },
    {
      title: 'Paid At',
      dataIndex: 'paid_at',
      key: 'paid_at',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Cash Out & Settlements</Title>

      {/* Filters and Summary */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle" style={{ marginBottom: '16px' }}>
          <Col>
            <Space>
              <Text strong>Period:</Text>
              <Select
                value={periodType}
                onChange={handlePeriodChange}
                style={{ width: 120 }}
              >
                <Option value="weekly">Weekly</Option>
                <Option value="monthly">Monthly</Option>
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
              <Text strong>Date Range:</Text>
              <RangePicker
                onChange={handleDateRangeChange}
                format="YYYY-MM-DD"
                allowClear
              />
            </Space>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchEarnings}
              loading={loading}
            >
              Refresh
            </Button>
          </Col>
        </Row>

        {summary && (
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Total Earnings"
                value={summary.total_earnings}
                prefix={<DollarOutlined />}
                suffix="KWD"
                precision={3}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Total PG Charges"
                value={summary.total_pg_charges}
                prefix="-"
                suffix="KWD"
                precision={3}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Platform Commission"
                value={summary.total_platform_commission}
                prefix="-"
                suffix="KWD"
                precision={3}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Total Net Payout"
                value={summary.total_net_payout}
                prefix={<DollarOutlined />}
                suffix="KWD"
                precision={3}
                valueStyle={{ color: '#52c41a', fontSize: '20px' }}
              />
            </Col>
          </Row>
        )}
        {earnings.length > 0 && (
          <Row gutter={16} style={{ marginTop: '16px' }}>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="Total Influencers"
                value={earnings.length}
                suffix={`(${earnings.filter(e => e.is_settled).length} settled, ${earnings.filter(e => !e.is_settled).length} unsettled)`}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="Settled Amount"
                value={earnings.filter(e => e.is_settled).reduce((sum, e) => sum + e.net_payout, 0)}
                prefix={<DollarOutlined />}
                suffix="KWD"
                precision={3}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="Pending Settlement"
                value={earnings.filter(e => !e.is_settled).reduce((sum, e) => sum + e.net_payout, 0)}
                prefix={<DollarOutlined />}
                suffix="KWD"
                precision={3}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
          </Row>
        )}
      </Card>

      {/* Earnings Table */}
      <Card>
        <Spin spinning={loading}>
          {earnings.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                No completed payments found for the selected period.
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '14px', marginTop: '8px', display: 'block' }}>
                Make sure payments have:
                <ul style={{ textAlign: 'left', display: 'inline-block', marginTop: '8px' }}>
                  <li>Status: "completed", "paid", "success", or "successful"</li>
                  <li>Payee ID set (influencer receiving payment)</li>
                  <li>Date within the selected period</li>
                </ul>
                <br />
                Check the browser console for detailed payment information.
              </Text>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={earnings}
              rowKey="influencer_id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} influencers`,
              }}
            summary={(pageData) => {
              const totalEarnings = pageData.reduce((sum, record) => sum + record.total_earnings, 0);
              const totalPgCharges = pageData.reduce((sum, record) => sum + record.total_pg_charges, 0);
              const totalCommission = pageData.reduce((sum, record) => sum + record.total_platform_commission, 0);
              const totalNetPayout = pageData.reduce((sum, record) => sum + record.net_payout, 0);
              const currency = pageData[0]?.currency || 'KWD';

              return (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={1}>
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong>{formatCurrency(totalEarnings, currency)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <Text type="warning" strong>
                        -{formatCurrency(totalPgCharges, currency)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <Text type="danger" strong>
                        -{formatCurrency(totalCommission, currency)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      <Text strong style={{ color: '#52c41a', fontSize: '18px' }}>
                        {formatCurrency(totalNetPayout, currency)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="center">
                      <Tag color="blue">
                        {pageData.reduce((sum, record) => sum + record.payment_count, 0)}
                      </Tag>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} />
                  </Table.Summary.Row>
                </Table.Summary>
              );
            }}
          />
          )}
        </Spin>
      </Card>

      {/* Payment Details Modal */}
      <Modal
        title={`Payment Details - ${selectedInfluencer?.influencer_name}`}
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={1000}
      >
        {selectedInfluencer && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: '16px' }}>
              <Descriptions.Item label="Total Earnings">
                {formatCurrency(selectedInfluencer.total_earnings, selectedInfluencer.currency)}
              </Descriptions.Item>
              <Descriptions.Item label="Total PG Charges">
                <Text type="warning">
                  -{formatCurrency(selectedInfluencer.total_pg_charges, selectedInfluencer.currency)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Platform Commission">
                <Text type="danger">
                  -{formatCurrency(selectedInfluencer.total_platform_commission, selectedInfluencer.currency)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Net Payout">
                <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                  {formatCurrency(selectedInfluencer.net_payout, selectedInfluencer.currency)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <Table
              columns={paymentColumns}
              dataSource={selectedPayments}
              rowKey="payment_id"
              pagination={false}
              size="small"
            />
          </>
        )}
      </Modal>
    </div>
  );
}

