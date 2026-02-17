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
  Divider,
  Tabs
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

  // Settlement History State
  const [activeTab, setActiveTab] = useState('earnings');
  const [settlementHistory, setSettlementHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'earnings') {
      fetchEarnings();
    } else if (activeTab === 'history') {
      fetchSettlementHistory();
    }
  }, [periodType, startDate, endDate, activeTab]);

  const fetchSettlementHistory = async () => {
    setHistoryLoading(true);
    try {
      const history = await cashOutService.getAllSettlements();
      setSettlementHistory(history);
    } catch (error: any) {
      console.error('Error fetching settlement history:', error);
      message.error(error.message || 'Failed to fetch settlement history');
    } finally {
      setHistoryLoading(false);
    }
  };

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
      render: (amount, record) => formatCurrency(amount, 'KWD'),
      sorter: (a, b) => a.total_earnings - b.total_earnings,
    },
    {
      title: 'PG Charges',
      dataIndex: 'total_pg_charges',
      key: 'total_pg_charges',
      align: 'right',
      render: (amount, record) => (
        <Text type="warning">-{formatCurrency(amount, 'KWD')}</Text>
      ),
    },
    {
      title: 'Platform Commission',
      dataIndex: 'total_platform_commission',
      key: 'total_platform_commission',
      align: 'right',
      render: (amount, record) => (
        <Text type="danger">-{formatCurrency(amount, 'KWD')}</Text>
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
      title: 'Transaction ID',
      dataIndex: 'transaction_reference',
      key: 'transaction_reference',
      width: 150,
      render: (text) => <Text copyable={{ text: text || '' }}>{text?.substring(0, 8) || '-'}</Text>,
    },
    {
      title: 'Booking ID',
      dataIndex: 'booking_id',
      key: 'booking_id',
      width: 150,
      render: (text) => <Text copyable={{ text: text || '' }}>{text?.substring(0, 8)}</Text>,
    },
    {
      title: 'Service Type',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (text) => <Tag color={text === 'dual' ? 'purple' : 'blue'}>{(text || 'NORMAL').toUpperCase()}</Tag>,
    },
    {
      title: 'Original Price',
      dataIndex: 'original_price',
      key: 'original_price',
      align: 'right',
      render: (amount) => formatCurrency(amount, 'KWD'),
    },
    {
      title: 'Discount',
      dataIndex: 'discount_amount',
      key: 'discount_amount',
      align: 'right',
      render: (amount) => amount > 0 ? <Text type="danger">-{formatCurrency(amount, 'KWD')}</Text> : '-',
    },
    {
      title: 'Final Amount',
      dataIndex: 'amount', // This is the transaction amount
      key: 'amount',
      align: 'right',
      render: (amount, record) => <Text strong>{formatCurrency(amount, 'KWD')}</Text>,
    },
    {
      title: 'PG Charge (1.5%)',
      dataIndex: 'pg_charge',
      key: 'pg_charge',
      align: 'right',
      render: (amount) => <Text type="warning">-{formatCurrency(amount, 'KWD')}</Text>,
    },
    {
      title: 'Net After Bank',
      dataIndex: 'net_after_bank',
      key: 'net_after_bank',
      align: 'right',
      render: (amount) => formatCurrency(amount, 'KWD'),
    },
    {
      title: 'Commission',
      dataIndex: 'platform_commission',
      key: 'platform_commission',
      align: 'right',
      render: (amount) => <Text type="danger">-{formatCurrency(amount, 'KWD')}</Text>,
    },
    {
      title: 'Influencer Share %',
      dataIndex: 'influencer_share_percentage',
      key: 'influencer_share_percentage',
      align: 'center',
      render: (pct) => pct ? `${pct}%` : '-',
    },
    {
      title: 'Influencer Earnings',
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color="success">{(status || 'PAID').toUpperCase()}</Tag>,
    },
    {
      title: 'Date',
      dataIndex: 'paid_at',
      key: 'paid_at',
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
    },
  ];

  const handleViewHistoryDetails = async (settlement: any) => {
    setLoading(true);
    try {
      // Create a temporary influencer object for the modal header
      const influencer: InfluencerEarning = {
        influencer_id: settlement.influencer_id,
        influencer_name: settlement.influencer?.name || 'Unknown',
        influencer_email: settlement.influencer?.email || '',
        total_earnings: settlement.total_earnings,
        total_pg_charges: settlement.total_pg_charges,
        total_platform_commission: settlement.total_platform_commission,
        net_payout: settlement.net_payout,
        currency: settlement.currency,
        payment_count: settlement.payment_count,
        payments: []
      };
      setSelectedInfluencer(influencer);

      // Fetch specific payments for this settlement period
      const earnings = await cashOutService.getInfluencerEarnings(
        settlement.period_type,
        settlement.period_start,
        settlement.period_end
      );

      // Filter for this specific influencer
      const influencerEarning = earnings.find(e => e.influencer_id === settlement.influencer_id);

      if (influencerEarning) {
        setSelectedPayments(influencerEarning.payments);
      } else {
        setSelectedPayments([]);
        // Try to fetch all payments if specific period fetch fails to match logic
        // But for now, just show empty or warning
        console.warn('No specific payment details found for this period via getInfluencerEarnings');
      }

      setPaymentModalVisible(true);
    } catch (error) {
      console.error('Error fetching details:', error);
      message.error('Failed to load settlement details');
    } finally {
      setLoading(false);
    }
  };

  const historyColumns = [
    {
      title: 'Settled Date',
      dataIndex: 'settled_at',
      key: 'settled_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: any, b: any) => new Date(a.settled_at).getTime() - new Date(b.settled_at).getTime(),
    },
    {
      title: 'Influencer',
      dataIndex: ['influencer', 'name'],
      key: 'influencer_name',
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text || 'Unknown'}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.influencer?.email}</div>
        </div>
      ),
    },
    {
      title: 'Period',
      key: 'period',
      render: (_: any, record: any) => (
        <Space direction="vertical" size={0}>
          <Tag color="cyan">{(record.period_type || 'monthly').toUpperCase()}</Tag>
          <Text style={{ fontSize: '12px', color: '#666' }}>
            {record.period_start} to {record.period_end}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'total_earnings',
      key: 'total_earnings',
      align: 'right' as const,
      render: (val: number) => formatCurrency(val, 'KWD'),
    },
    {
      title: 'Net Payout',
      dataIndex: 'net_payout',
      key: 'net_payout',
      align: 'right' as const,
      render: (val: number, record: any) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatCurrency(val, record.currency || 'KWD')}
        </Text>
      ),
    },
    {
      title: 'Admin',
      dataIndex: ['admin', 'name'],
      key: 'admin',
      render: (text: string) => <Tag>{text || 'System'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewHistoryDetails(record)}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Cash Out & Settlements</Title>

      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
        <Tabs.TabPane tab="Current Earnings" key="earnings">
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
                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchEarnings}
                    loading={loading}
                  >
                    Refresh
                  </Button>
                  <Button
                    onClick={() => {
                      setStartDate(undefined);
                      setEndDate(undefined);
                      fetchEarnings();
                    }}
                  >
                    Show All Payments
                  </Button>
                </Space>
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
          <Card bodyStyle={{ padding: 0 }}>
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
                      <li>Date within the selected period (if date range is selected)</li>
                    </ul>
                    <br />
                    <Text type="warning" style={{ fontSize: '14px', display: 'block', marginTop: '16px' }}>
                      💡 Tip: Try clearing the date range filter to see all payments, or check the browser console (F12) for detailed payment information.
                    </Text>
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
                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={1}>
                            <Text strong>Total</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            <Text strong>{formatCurrency(totalEarnings, 'KWD')}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">
                            <Text type="warning" strong>
                              -{formatCurrency(totalPgCharges, 'KWD')}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            <Text type="danger" strong>
                              -{formatCurrency(totalCommission, 'KWD')}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right">
                            <Text strong style={{ color: '#52c41a', fontSize: '18px' }}>
                              {formatCurrency(totalNetPayout, 'KWD')}
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
        </Tabs.TabPane>

        <Tabs.TabPane tab="Settlement History" key="history">
          <Card>
            <Table
              columns={historyColumns}
              dataSource={settlementHistory}
              loading={historyLoading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} settlements`,
              }}
            />
          </Card>
        </Tabs.TabPane>
      </Tabs>

      {/* Payment Details Modal */}
      <Modal
        title={`Payment Details - ${selectedInfluencer?.influencer_name}`}
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={1400}
      >
        {selectedInfluencer && (
          <>
            {/* Unsettled Transactions */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={5} style={{ color: '#faad14' }}>
                <Space><CloseCircleOutlined /> Unsettled / Pending Transactions</Space>
              </Title>
              <Table
                columns={paymentColumns}
                dataSource={selectedPayments.filter(p => !p.is_settled)}
                rowKey="payment_id"
                pagination={false}
                size="small"
                scroll={{ x: 1300 }}
                locale={{ emptyText: 'No unsettled transactions' }}
                summary={(pageData) => {
                  const totalAmount = pageData.reduce((sum, record) => sum + Number(record.amount || 0), 0);
                  const totalPgCharge = pageData.reduce((sum, record) => sum + Number(record.pg_charge || 0), 0);
                  const totalCommission = pageData.reduce((sum, record) => sum + Number(record.platform_commission || 0), 0);
                  const totalNet = pageData.reduce((sum, record) => sum + Number(record.net_amount || 0), 0);
                  const totalNetAfterBank = pageData.reduce((sum, record) => sum + Number(record.net_after_bank || 0), 0);

                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row style={{ background: '#fffbe6' }}>
                        <Table.Summary.Cell index={0} colSpan={5}>
                          <Text strong>Unsettled Total</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5} align="right">
                          <Text strong>{formatCurrency(totalAmount, 'KWD')}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6} align="right">
                          <Text type="warning" strong>-{formatCurrency(totalPgCharge, 'KWD')}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={7} align="right">
                          <Text strong>{formatCurrency(totalNetAfterBank, 'KWD')}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={8} align="right">
                          <Text type="danger" strong>-{formatCurrency(totalCommission, 'KWD')}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={9} />
                        <Table.Summary.Cell index={10} align="right">
                          <Text strong style={{ color: '#faad14', fontSize: '16px' }}>{formatCurrency(totalNet, 'KWD')}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={11} />
                        <Table.Summary.Cell index={12} />
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            </div>

            {/* Settled Transactions */}
            {selectedPayments.some(p => p.is_settled) && (
              <div style={{ marginTop: '32px' }}>
                <Title level={5} style={{ color: '#52c41a' }}>
                  <Space><CheckCircleOutlined /> Previously Settled Transactions</Space>
                </Title>
                <Table
                  columns={paymentColumns}
                  dataSource={selectedPayments.filter(p => p.is_settled)}
                  rowKey="payment_id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 1300 }}
                  style={{ opacity: 0.8 }}
                  summary={(pageData) => {
                    const totalNet = pageData.reduce((sum, record) => sum + Number(record.net_amount || 0), 0);
                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row style={{ background: '#f6ffed' }}>
                          <Table.Summary.Cell index={0} colSpan={10}>
                            <Text strong>Settled Total</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={10} align="right">
                            <Text strong style={{ color: '#52c41a' }}>{formatCurrency(totalNet, 'KWD')}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={11} />
                          <Table.Summary.Cell index={12} />
                        </Table.Summary.Row>
                      </Table.Summary>
                    );
                  }}
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

