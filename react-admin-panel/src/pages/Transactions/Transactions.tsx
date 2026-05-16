import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Input, Space, Table, Tag, Typography, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { supabase } from '../../services/supabaseClient';
import { formatPrice } from '../../utils/currencyUtils';

const { Title, Text } = Typography;

/** Tier A: match Cash Out rounding (3 dp) without Hesabe PG fetch — PG uses 1.5% of payment amount. */
function roundToFils(n: number): number {
  return Math.round(Number(n) * 1000) / 1000;
}

/** Tier A dual platform commission when app settings are not loaded here (Cash Out uses settings service). */
const DUAL_PLATFORM_COMMISSION_FALLBACK_PCT = 5;

interface RefundStub {
  id: string;
  status: string | null;
  amount?: number | null;
  currency?: string | null;
  created_at: string | null;
  payment_id?: string | null;
}

interface TransactionRow {
  id: string;
  booking_id: string | null;
  currency: string | null;
  status: string | null;
  transaction_reference: string | null;
  created_at: string | null;
  paid_at: string | null;
  service_title: string | null;
  refunds?: RefundStub[] | null;
  service_type: string;
  original_price: number;
  discount_amount: number;
  final_amount: number;
  pg_charge: number;
  net_after_bank: number;
  platform_commission: number;
  influencer_share_percentage: number | null;
  net_amount: number;
}

const statusColor = (status: string | null) => {
  const normalized = (status || '').toLowerCase();
  if (['completed', 'paid', 'success', 'successful'].includes(normalized)) return 'green';
  if (['pending', 'processing'].includes(normalized)) return 'orange';
  if (['failed', 'cancelled', 'rejected'].includes(normalized)) return 'red';
  return 'default';
};

const refundStatusColor = (status: string | null) => {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'completed') return 'green';
  if (normalized === 'processing') return 'orange';
  if (normalized === 'pending') return 'blue';
  if (normalized === 'failed') return 'red';
  if (normalized === 'cancelled') return 'default';
  return 'default';
};

function latestRefund(refunds: RefundStub[] | null | undefined): RefundStub | null {
  if (!refunds?.length) return null;
  return [...refunds].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  )[0];
}

/** Payment-linked refunds plus booking refunds not tied to another payment (legacy rows). */
function refundsForPaymentRow(item: {
  id: string;
  refunds?: RefundStub[] | null;
  booking?: { refunds?: RefundStub[] | null } | null;
}): RefundStub[] {
  const byPayment = item.refunds ?? [];
  const fromBooking = (item.booking?.refunds ?? []).filter(
    (r) => !r.payment_id || r.payment_id === item.id
  );
  const seen = new Set<string>();
  const out: RefundStub[] = [];
  for (const r of [...byPayment, ...fromBooking]) {
    if (!r?.id || seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

/**
 * Tier A financials aligned with Cash Out payment line logic (estimated PG 1.5%;
 * dual split uses fixed dual commission % — see DUAL_PLATFORM_COMMISSION_FALLBACK_PCT).
 */
function deriveTierAFinancials(raw: {
  amount: unknown;
  payee_id?: string | null;
  payee?: { commission_percentage?: number | null } | null;
  booking?: {
    service_type?: string | null;
    influencer_id?: string | null;
    invited_influencer_id?: string | null;
    primary_influencer_earnings_percentage?: number | null;
    invited_influencer_earnings_percentage?: number | null;
    service?: {
      title?: string | null;
      service_type?: string | null;
      price?: number | null;
      primary_influencer_id?: string | null;
      invited_influencer_id?: string | null;
      primary_influencer_earnings_percentage?: number | null;
      invited_influencer_earnings_percentage?: number | null;
    } | null;
  } | null;
}): Omit<
  TransactionRow,
  | 'id'
  | 'booking_id'
  | 'currency'
  | 'status'
  | 'transaction_reference'
  | 'created_at'
  | 'paid_at'
  | 'refunds'
  | 'amount'
> & { service_title: string | null } {
  const paymentAmount = parseFloat(String(raw.amount)) || 0;
  const booking = raw.booking;
  const service = booking?.service;
  const serviceType = String(
    booking?.service_type ?? service?.service_type ?? 'normal'
  ).toLowerCase();
  const originalPrice = Number(service?.price ?? paymentAmount);
  const discountAmount = Math.max(0, originalPrice - paymentAmount);
  const pgCharge = roundToFils(paymentAmount * 0.015);
  const netAfterBank = roundToFils(paymentAmount - pgCharge);
  const payeeId = raw.payee_id || null;
  const payeeCommission = Number(raw.payee?.commission_percentage) || 2;

  const primaryId = service?.primary_influencer_id ?? booking?.influencer_id;
  const invitedId = service?.invited_influencer_id ?? booking?.invited_influencer_id ?? undefined;
  const payeeIsSplitMember =
    payeeId && primaryId && invitedId && (payeeId === primaryId || payeeId === invitedId);
  const isDual = serviceType === 'dual' && primaryId && invitedId && payeeIsSplitMember;

  if (isDual) {
    const commissionRate = DUAL_PLATFORM_COMMISSION_FALLBACK_PCT;
    const platformCommissionFull = roundToFils(netAfterBank * (commissionRate / 100));
    const amountAfterCommission = roundToFils(netAfterBank - platformCommissionFull);

    const primaryPctRaw =
      service?.primary_influencer_earnings_percentage ??
      booking?.primary_influencer_earnings_percentage ??
      50;
    const invitedPctRaw =
      service?.invited_influencer_earnings_percentage ??
      booking?.invited_influencer_earnings_percentage ??
      50;
    const primaryPct = Number.isFinite(Number(primaryPctRaw)) ? Number(primaryPctRaw) : 50;
    const invitedPct = Number.isFinite(Number(invitedPctRaw)) ? Number(invitedPctRaw) : 50;
    const pct = payeeId === primaryId ? primaryPct : invitedPct;
    const share = pct / 100;

    const attributedGross = roundToFils(paymentAmount * share);
    const pgPart = roundToFils(pgCharge * share);
    const netBankPart = roundToFils(netAfterBank * share);
    const platPart = roundToFils(platformCommissionFull * share);
    const netPayout = roundToFils(amountAfterCommission * share);
    const originalPart = roundToFils(originalPrice * share);
    const discountPart = roundToFils(discountAmount * share);

    return {
      service_type: serviceType,
      service_title: service?.title || null,
      original_price: originalPart,
      discount_amount: discountPart,
      final_amount: attributedGross,
      pg_charge: pgPart,
      net_after_bank: netBankPart,
      platform_commission: platPart,
      influencer_share_percentage: pct,
      net_amount: netPayout
    };
  }

  const gross = roundToFils(paymentAmount);
  const pg = roundToFils(pgCharge);
  const netBank = roundToFils(netAfterBank);
  const platformCommission = roundToFils(netBank * (payeeCommission / 100));
  const netPayout = roundToFils(netBank - platformCommission);

  return {
    service_type: serviceType,
    service_title: service?.title || null,
    original_price: roundToFils(originalPrice),
    discount_amount: roundToFils(discountAmount),
    final_amount: gross,
    pg_charge: pg,
    net_after_bank: netBank,
    platform_commission: platformCommission,
    influencer_share_percentage: null,
    net_amount: netPayout
  };
}

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          booking_id,
          payee_id,
          amount,
          currency,
          status,
          transaction_reference,
          created_at,
          paid_at,
          payee:profiles!payments_payee_id_fkey(name, commission_percentage),
          booking:bookings!payments_booking_id_fkey(
            service_type,
            influencer_id,
            invited_influencer_id,
            primary_influencer_earnings_percentage,
            invited_influencer_earnings_percentage,
            service:services!bookings_service_id_fkey(
              title,
              service_type,
              price,
              primary_influencer_id,
              invited_influencer_id,
              primary_influencer_earnings_percentage,
              invited_influencer_earnings_percentage
            ),
            refunds:refunds(id, status, amount, currency, created_at, payment_id)
          ),
          refunds:refunds!refunds_payment_id_fkey(
            id,
            status,
            amount,
            currency,
            created_at,
            payment_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) throw error;

      const mapped: TransactionRow[] = (data || []).map((item: any) => {
        const fin = deriveTierAFinancials(item);
        return {
          id: item.id,
          booking_id: item.booking_id,
          currency: item.currency,
          status: item.status,
          transaction_reference: item.transaction_reference,
          created_at: item.created_at,
          paid_at: item.paid_at,
          refunds: refundsForPaymentRow(item),
          service_type: fin.service_type,
          service_title: fin.service_title,
          original_price: fin.original_price,
          discount_amount: fin.discount_amount,
          final_amount: fin.final_amount,
          pg_charge: fin.pg_charge,
          net_after_bank: fin.net_after_bank,
          platform_commission: fin.platform_commission,
          influencer_share_percentage: fin.influencer_share_percentage,
          net_amount: fin.net_amount
        };
      });

      setTransactions(mapped);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      message.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return transactions;

    return transactions.filter((item) => {
      const refundIds = (item.refunds || []).map((r) => r.id).join(' ');
      const fields = [
        item.id,
        item.booking_id || '',
        item.transaction_reference || '',
        item.status || '',
        item.service_title || '',
        item.service_type || '',
        String(item.final_amount),
        latestRefund(item.refunds)?.status || '',
        refundIds
      ];
      return fields.some((field) => field.toLowerCase().includes(term));
    });
  }, [transactions, search]);

  const columns: ColumnsType<TransactionRow> = [
    {
      title: 'Transaction ID',
      dataIndex: 'transaction_reference',
      key: 'transaction_reference',
      width: 130,
      render: (value: string | null) =>
        value ? <Text copyable={{ text: value }}>{value.substring(0, 12)}{value.length > 12 ? '…' : ''}</Text> : <Tag>N/A</Tag>
    },
    {
      title: 'Booking ID',
      dataIndex: 'booking_id',
      key: 'booking_id',
      width: 120,
      render: (value: string | null) =>
        value ? <Text copyable={{ text: value }}>{value.substring(0, 8)}…</Text> : '-'
    },
    {
      title: 'Service',
      dataIndex: 'service_title',
      key: 'service_title',
      ellipsis: true,
      render: (value: string | null) => value || '-'
    },
    {
      title: 'Service Type',
      dataIndex: 'service_type',
      key: 'service_type',
      width: 110,
      render: (text: string) => (
        <Tag color={text === 'dual' ? 'purple' : text === 'flash' ? 'red' : 'blue'}>
          {(text || 'normal').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Original Price',
      dataIndex: 'original_price',
      key: 'original_price',
      align: 'right',
      render: (v: number, r: TransactionRow) => formatPrice(v, r.currency || 'KWD')
    },
    {
      title: 'Discount',
      dataIndex: 'discount_amount',
      key: 'discount_amount',
      align: 'right',
      render: (v: number, r: TransactionRow) =>
        v > 0 ? <Text type="danger">-{formatPrice(v, r.currency || 'KWD')}</Text> : '-'
    },
    {
      title: 'Final Amount',
      dataIndex: 'final_amount',
      key: 'final_amount',
      align: 'right',
      render: (v: number, r: TransactionRow) => <Text strong>{formatPrice(v, r.currency || 'KWD')}</Text>
    },
    {
      title: 'PG Charge',
      dataIndex: 'pg_charge',
      key: 'pg_charge',
      align: 'right',
      render: (v: number, r: TransactionRow) => (
        <Text type="warning">-{formatPrice(v, r.currency || 'KWD')}</Text>
      )
    },
    {
      title: 'Net After Bank',
      dataIndex: 'net_after_bank',
      key: 'net_after_bank',
      align: 'right',
      render: (v: number, r: TransactionRow) => formatPrice(v, r.currency || 'KWD')
    },
    {
      title: 'Commission',
      dataIndex: 'platform_commission',
      key: 'platform_commission',
      align: 'right',
      render: (v: number, r: TransactionRow) => (
        <Text type="danger">-{formatPrice(v, r.currency || 'KWD')}</Text>
      )
    },
    {
      title: 'Influencer Share %',
      dataIndex: 'influencer_share_percentage',
      key: 'influencer_share_percentage',
      align: 'center',
      width: 130,
      render: (pct: number | null, record: TransactionRow) => {
        if (String(record.service_type || '').toLowerCase() !== 'dual') return '-';
        const n = Number(pct);
        return Number.isFinite(n) ? `${n}%` : '-';
      }
    },
    {
      title: 'Influencer Earnings',
      dataIndex: 'net_amount',
      key: 'net_amount',
      align: 'right',
      render: (v: number, r: TransactionRow) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatPrice(v, r.currency || 'KWD')}
        </Text>
      )
    },
    {
      title: 'Payment Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: string | null) => (
        <Tag color={statusColor(value)}>{(value || 'unknown').toUpperCase()}</Tag>
      )
    },
    {
      title: 'Date',
      dataIndex: 'paid_at',
      key: 'paid_at',
      width: 110,
      render: (value: string | null, record: TransactionRow) =>
        dayjs(value || record.created_at).format('YYYY-MM-DD')
    },
    {
      title: 'Refund reference ID',
      key: 'refund_reference_ids',
      width: 200,
      render: (_: unknown, record: TransactionRow) => {
        const list = record.refunds || [];
        if (!list.length) return <Text type="secondary">—</Text>;
        return (
          <Space direction="vertical" size={4}>
            {list.map((rf) => (
              <Link key={rf.id} to={`/refunds?refundId=${encodeURIComponent(rf.id)}`}>
                <Text code copyable={{ text: rf.id }} style={{ fontSize: 12 }}>
                  {rf.id.substring(0, 8)}…
                </Text>
              </Link>
            ))}
          </Space>
        );
      }
    },
    {
      title: 'Refund status',
      key: 'refund_status',
      align: 'center',
      width: 120,
      render: (_: unknown, record: TransactionRow) => {
        const rf = latestRefund(record.refunds);
        if (!rf?.status) return <Text type="secondary">—</Text>;
        return <Tag color={refundStatusColor(rf.status)}>{rf.status.toUpperCase()}</Tag>;
      }
    }
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            Transactions
          </Title>
          <Input
            placeholder="Search by ref, booking, service, refund IDs…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 380 }}
            allowClear
          />
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredTransactions}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          scroll={{ x: 2200 }}
        />
      </Card>
    </Space>
  );
};

export default Transactions;
