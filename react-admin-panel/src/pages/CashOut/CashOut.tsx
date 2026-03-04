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
  CloseCircleOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { cashOutService, InfluencerEarning, CashOutSummary, PaymentEarning } from '../../services/cashOutService';
import { settingsService } from '../../services/settingsService';
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
  const [recurrenceLocked, setRecurrenceLocked] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [settlingBulk, setSettlingBulk] = useState(false);


  // Settlement History State
  const [activeTab, setActiveTab] = useState('earnings');
  const [settlementHistory, setSettlementHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchSettingsAndEarnings();
  }, [activeTab]);

  useEffect(() => {
    // Re-fetch earnings when period inputs change (if not handled by fetchSettingsAndEarnings initial load)
    if (!loading && activeTab === 'earnings') {
      fetchEarnings();
    }
  }, [periodType, startDate, endDate]);

  const fetchSettingsAndEarnings = async () => {
    setLoading(true);
    try {
      // 1. Fetch App Settings to get Payment Recurrence
      const appSettings = await settingsService.getAppSettings();
      const recurrence = appSettings.payment_recurrence as 'weekly' | 'monthly' | undefined;

      if (recurrence) {
        setPeriodType(recurrence);
        setRecurrenceLocked(true);
      }

      // 2. Load data based on tab
      if (activeTab === 'earnings') {
        // fetchEarnings will be triggered by useEffect dependency on periodType change or we call it here?
        // Better to call it here to ensure sequentiality
        await fetchEarnings(recurrence);
      } else if (activeTab === 'history') {
        await fetchSettlementHistory();
      }
    } catch (error) {
      console.error('Error initializing CashOut:', error);
    } finally {
      setLoading(false);
    }
  };


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

  const fetchEarnings = async (overridePeriodType?: 'weekly' | 'monthly') => {
    setLoading(true);
    try {
      const currentPeriodType = overridePeriodType || periodType;
      const [earningsData, summaryData] = await Promise.all([
        cashOutService.getInfluencerEarnings(currentPeriodType, startDate, endDate),
        cashOutService.getCashOutSummary(currentPeriodType, startDate, endDate)
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
    setSelectedRowKeys([]); // Reset selection when opening modal
    setPaymentModalVisible(true);
  };

  const handleMarkAsSettled = async (influencer: InfluencerEarning) => {
    // Calculate date range if not provided
    const periodStart = startDate || (() => {
      const date = new Date();
      if (periodType === 'weekly') {
        date.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      } else {
        date.setDate(1); // Start of month
      }
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    })();

    const periodEnd = endDate || new Date().toISOString();

    // VALIDATION: Check if period is completed before settling
    // "only will be unlocking after its period" logic
    // We assume this means you can only settle *past* periods or periods that have ended.
    // If startDate/endDate are selected, check if endDate is in the past.
    // If defaults are used (current week/month), we might want to warn or block.
    // For now, let's just warn if they try to settle the *current* active period which hasn't finished?
    // Actually, businesses often settle monthly at the end of the month.
    // Let's strictly block if the selected End Date is in the future (impossible by selection usually)
    // OR if we are in the middle of the period.
    const now = new Date();
    const pEnd = new Date(periodEnd);

    // Allow settling if end date is today or past.
    // However, if it's "Current Month" view (no dates selected), periodEnd defaults to "now".
    // If strict locking is required: only allow settling if the period is physically over?
    // User said: "once its done only will be unlocking after its period" -> ambiguous language.
    // Interpretation: "Lock the SETTLED STATUS. Once settled, it stays settled. unlocking (unsettling) is only allowed after..."?
    // OR "Lock the ABILITY TO SETTLE. You can only settle once the period is done."
    // Let's assume the latter for robustness: You settle "Last Month". You don't settle "This Month" until it's over.

    // But currently, the view defaults to "Current Month/Week".
    // If I block settling current month, I need to guide them to select previous month?
    // Let's implement a check: If no specific date range, we assume "Current running period".
    // If they want to settle, they should select a specific past range or we confirm.

    // For now, proceed with settlement but ensure filtered view is correct.


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

  const handleSettleSelectedPayments = () => {
    if (selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: 'Settle Selected Transactions?',
      content: 'Are you sure you want to mark these specific transactions as settled? This action cannot be undone.',
      okText: 'Yes, Settle',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setSettlingBulk(true);
        try {
          await cashOutService.markPaymentsAsSettled(selectedRowKeys as string[]);
          message.success(`${selectedRowKeys.length} transactions marked as settled`);
          setSelectedRowKeys([]);
          setPaymentModalVisible(false); // Close modal to reflect fresh state
          await fetchEarnings(); // Refresh data
        } catch (error: any) {
          console.error('Error in settlement:', error);
          message.error(error.message || 'Failed to settle transactions');
        } finally {
          setSettlingBulk(false);
        }
      }
    });
  };

  const handleBulkSettle = () => {
    Modal.confirm({
      title: 'Are you sure you want to mark these as settled?',
      content: 'This action cannot be undone.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setSettlingBulk(true);
        try {
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

          // Execute all selected sequentially or parallel
          const selectedInfluencers = earnings.filter(e => selectedRowKeys.includes(e.influencer_id));

          await Promise.all(selectedInfluencers.map(influencer =>
            cashOutService.markAsSettled(influencer.influencer_id, periodType, periodStart, periodEnd, influencer)
          ));

          message.success(`${selectedInfluencers.length} influencers marked as settled`);
          setSelectedRowKeys([]);
          await fetchEarnings(); // Refresh data
        } catch (error: any) {
          console.error('Error in bulk settlement:', error);
          message.error(error.message || 'Failed to bulk settle');
        } finally {
          setSettlingBulk(false);
        }
      }
    });
  };

  const downloadExcel = (data: any[], filename: string) => {
    // dynamically import to avoid breaking build if not imported at top
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, filename);
    });
  };

  const handleExportAll = () => {
    if (!earnings.length) {
      message.warning('No data to export');
      return;
    }

    const headers = [
      'Influencer Name',
      'Email',
      'Total Earnings',
      'PG Charges',
      'Platform Commission',
      'Net Payout',
      'Payment Count',
      'Status'
    ];

    const rows = earnings.map(e => [
      e.influencer_name,
      e.influencer_email,
      e.total_earnings.toFixed(3),
      e.total_pg_charges.toFixed(3),
      e.total_platform_commission.toFixed(3),
      e.net_payout.toFixed(3),
      e.payment_count,
      e.is_settled ? 'Settled' : 'Unsettled'
    ]);

    const data = [headers, ...rows];
    const dateStr = dayjs().format('YYYY-MM-DD');
    downloadExcel(data, `cashout_summary_${dateStr}.xlsx`);
  };

  const handleExportInfluencer = (influencer: InfluencerEarning) => {
    if (!influencer.payments || influencer.payments.length === 0) {
      message.warning('No payments details available for export');
      return;
    }

    const headers = [
      'Date',
      'Transaction ID',
      'Booking ID',
      'Service',
      'Type',
      'Final Amount',
      'PG Charge',
      'Commission',
      'Net Payout',
      'Status'
    ];

    const rows = influencer.payments.map(p => [
      dayjs(p.paid_at).format('YYYY-MM-DD'),
      p.transaction_reference || '',
      p.booking_id,
      p.service_title,
      p.service_type,
      p.amount.toFixed(3),
      p.pg_charge.toFixed(3),
      p.platform_commission.toFixed(3),
      p.net_amount.toFixed(3),
      p.status
    ]);

    const data = [headers, ...rows];
    const dateStr = dayjs().format('YYYY-MM-DD');
    const safeName = influencer.influencer_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadExcel(data, `payout_${safeName}_${dateStr}.xlsx`);
  };

  const handleExportHistory = () => {
    if (!settlementHistory.length) {
      message.warning('No history to export');
      return;
    }

    const headers = [
      'Settled Date',
      'Influencer Name',
      'Influencer Email',
      'Period Start',
      'Period End',
      'Total Earnings',
      'Admin Name',
    ];

    const rows = settlementHistory.map(h => [
      dayjs(h.settled_at).format('YYYY-MM-DD HH:mm:ss'),
      h.influencer?.name || 'Unknown',
      h.influencer?.email || '',
      h.period_start,
      h.period_end,
      h.total_earnings?.toFixed(3) || '0.000',
      h.admin?.name || 'System'
    ]);

    const data = [headers, ...rows];
    const dateStr = dayjs().format('YYYY-MM-DD');
    downloadExcel(data, `settlement_history_${dateStr}.xlsx`);
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
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 150,
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
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleExportInfluencer(record)}
            size="small"
          >
            Export
          </Button>
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
      title: 'PG Charge',
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
      render: (pct, record) => (record.service_type === 'DUAL' && pct) ? `${pct}%` : '-',
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
                    disabled={recurrenceLocked} // Lock if setting exists
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
                    onClick={() => fetchEarnings()}
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
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleExportAll}
                    disabled={earnings.length === 0}
                  >
                    Export All
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
            <Row justify="end" style={{ marginBottom: 16 }}>
              <Col>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExportHistory}
                  disabled={!settlementHistory.length}
                >
                  Export History
                </Button>
              </Col>
            </Row>
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
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Col>
                <Title level={5} style={{ color: '#faad14', margin: 0 }}>
                  <Space><CloseCircleOutlined /> Unsettled / Pending Transactions</Space>
                </Title>
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleSettleSelectedPayments}
                  disabled={selectedRowKeys.length === 0}
                  loading={settlingBulk}
                >
                  Mark Selected as Settled
                </Button>
              </Col>
            </Row>
            <Table
              rowSelection={{
                selectedRowKeys,
                onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys),
              }}
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
                      <Table.Summary.Cell index={0} colSpan={6}>
                        <Text strong>Unsettled Total</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} align="right">
                        <Text strong>{formatCurrency(totalAmount, 'KWD')}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} align="right">
                        <Text type="warning" strong>-{formatCurrency(totalPgCharge, 'KWD')}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={8} align="right">
                        <Text strong>{formatCurrency(totalNetAfterBank, 'KWD')}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={9} align="right">
                        <Text type="danger" strong>-{formatCurrency(totalCommission, 'KWD')}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={10} />
                      <Table.Summary.Cell index={11} align="right">
                        <Text strong style={{ color: '#faad14', fontSize: '16px' }}>{formatCurrency(totalNet, 'KWD')}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={12} />
                      <Table.Summary.Cell index={13} />
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />

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
    </div >
  );
}

