import React, { useState, useEffect, useCallback } from 'react';
import {
    Table,
    Button,
    Card,
    Row,
    Col,
    Tag,
    DatePicker,
    Input,
    Select,
    Drawer,
    Descriptions,
    Statistic,
    Space,
    Modal,
    message,
    Divider,
    Alert
} from 'antd';
import {
    ReloadOutlined,
    EyeOutlined,
    StopOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { refundService, Refund } from '../../services/refundService';
import { formatPrice } from '../../utils/currencyUtils';
import { ProtectedButton } from '@/components/ProtectedButton';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const REFUND_STATUS_MAP: Record<number, { label: string; color: string }> = {
    0: { label: 'Pending', color: 'orange' },
    1: { label: 'Approved', color: 'green' },
    2: { label: 'Rejected', color: 'red' }
};

const LOCAL_STATUS_COLOR: Record<string, string> = {
    pending: 'blue',
    processing: 'orange',
    completed: 'green',
    failed: 'red',
    cancelled: 'default'
};

const Refunds: React.FC = () => {
    const [refunds, setRefunds] = useState<Refund[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
    const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
    const [hesabeDetails, setHesabeDetails] = useState<any>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [cancelLoading, setCancelLoading] = useState<string | null>(null);
    const [stats, setStats] = useState<any>(null);

    const fetchRefunds = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const result = await refundService.getRefunds(page, pagination.pageSize, {
                status: statusFilter
            });
            setRefunds(result.data);
            setPagination(prev => ({ ...prev, current: page, total: result.total }));
        } catch (err: any) {
            message.error('Failed to fetch refunds');
        } finally {
            setLoading(false);
        }
    }, [pagination.pageSize, statusFilter]);

    const fetchHesabeStats = useCallback(async () => {
        try {
            const params: any = {};
            if (dateRange?.[0]) params.date_from = dateRange[0].format('YYYY-MM-DD');
            if (dateRange?.[1]) params.date_to = dateRange[1].format('YYYY-MM-DD');
            if (search) params.search = search;

            const result = await refundService.getHesabeRefundList(params);
            if (result?.data?.response?.stats) {
                setStats(result.data.response.stats);
            }
        } catch (_err) {
            // Stats are optional - Hesabe may not be reachable in all envs
        }
    }, [dateRange, search]);

    useEffect(() => {
        fetchRefunds(1);
        fetchHesabeStats();
    }, [statusFilter]);

    const handleViewDetails = async (record: Refund) => {
        setSelectedRefund(record);
        setDetailsDrawerOpen(true);
        setHesabeDetails(null);

        if (record.hesabe_refund_id) {
            setDetailsLoading(true);
            try {
                const result = await refundService.getHesabeRefundDetails(record.hesabe_refund_id);
                setHesabeDetails(result?.data?.response || result?.data);
            } catch (_err) {
                // Details unavailable - show local data only
            } finally {
                setDetailsLoading(false);
            }
        }
    };

    const handleCancelRefund = (record: Refund) => {
        Modal.confirm({
            title: 'Cancel Refund',
            icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
            content: (
                <div>
                    <Alert
                        message="This action cannot be undone"
                        description="Cancelling this refund will permanently stop the refund process with Hesabe. The customer will NOT receive a refund."
                        type="error"
                        showIcon
                        style={{ marginBottom: 12 }}
                    />
                    <p>Refund ID: <strong>{record.hesabe_refund_id || record.id}</strong></p>
                    <p>Amount: <strong>{formatPrice(Number(record.amount), 'KWD')}</strong></p>
                </div>
            ),
            okText: 'Yes, Cancel Refund',
            okButtonProps: { danger: true },
            cancelText: 'Keep Refund',
            onOk: async () => {
                setCancelLoading(record.id);
                try {
                    if (record.hesabe_refund_id) {
                        await refundService.cancelRefund(record.hesabe_refund_id, record.id);
                    } else {
                        await refundService.cancelLocalRefund(record.id);
                    }
                    message.success('Refund cancelled successfully');
                    fetchRefunds(pagination.current);
                    if (detailsDrawerOpen && selectedRefund?.id === record.id) {
                        setDetailsDrawerOpen(false);
                    }
                } catch (err: any) {
                    message.error(err.message || 'Failed to cancel refund');
                } finally {
                    setCancelLoading(null);
                }
            }
        });
    };

    const getHesabeStatus = (status: number) =>
        REFUND_STATUS_MAP[status] || { label: `Status ${status}`, color: 'default' };

    const columns = [
        {
            title: 'Hesabe Refund ID',
            dataIndex: 'hesabe_refund_id',
            key: 'hesabe_refund_id',
            render: (id: string) => id
                ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{id}</span>
                : <Tag color="default">Local Only</Tag>
        },
        {
            title: 'Booking',
            key: 'booking',
            render: (_: any, record: Refund) => {
                const booking = (record as any).booking;
                return (
                    <div>
                        <div style={{ fontSize: 11, color: '#888' }}>{record.booking_id?.substring(0, 8)}...</div>
                        {booking?.service?.title && (
                            <div style={{ fontWeight: 500, fontSize: 12 }}>{booking.service.title}</div>
                        )}
                        {booking?.customer?.name && (
                            <div style={{ fontSize: 11, color: '#666' }}>{booking.customer.name}</div>
                        )}
                    </div>
                );
            }
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount: number) => (
                <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
                    {formatPrice(Number(amount), 'KWD')}
                </span>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={LOCAL_STATUS_COLOR[status] || 'default'}>
                    {status?.toUpperCase()}
                </Tag>
            )
        },
        {
            title: 'Transaction Ref',
            dataIndex: 'transaction_reference',
            key: 'transaction_reference',
            render: (ref: string) => ref
                ? <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{ref}</span>
                : '-'
        },
        {
            title: 'Reason',
            dataIndex: 'reason',
            key: 'reason',
            render: (reason: string) => reason || '-'
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => dayjs(date).format('DD MMM YYYY HH:mm')
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 180,
            render: (_: any, record: Refund) => {
                const isPending = record.status === 'pending' || record.status === 'processing';
                const isCancelling = cancelLoading === record.id;

                return (
                    <Space>
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewDetails(record)}
                        >
                            Details
                        </Button>
                        {isPending && (
                            <ProtectedButton
                                permission="refunds.reject"
                                size="small"
                                danger
                                icon={<StopOutlined />}
                                loading={isCancelling}
                                onClick={() => handleCancelRefund(record)}
                            >
                                Cancel
                            </ProtectedButton>
                        )}
                    </Space>
                );
            }
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            {/* Stats Row */}
            {stats && (
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="Total Requests"
                                value={stats.total_refund_request_count || 0}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col span={5}>
                        <Card>
                            <Statistic
                                title="Total Amount"
                                value={parseFloat(stats.total_refund_request_amount || '0')}
                                precision={3}
                                suffix="KWD"
                                valueStyle={{ color: '#722ed1' }}
                            />
                        </Card>
                    </Col>
                    <Col span={5}>
                        <Card>
                            <Statistic
                                title="Pending Amount"
                                value={parseFloat(stats.pending_total_refund_request_amount || '0')}
                                precision={3}
                                suffix="KWD"
                                valueStyle={{ color: '#fa8c16' }}
                            />
                        </Card>
                    </Col>
                    <Col span={5}>
                        <Card>
                            <Statistic
                                title="Approved Amount"
                                value={parseFloat(stats.approved_total_refund_request_amount || '0')}
                                precision={3}
                                suffix="KWD"
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={5}>
                        <Card>
                            <Statistic
                                title="Rejected Amount"
                                value={parseFloat(stats.rejected_total_refund_request_amount || '0')}
                                precision={3}
                                suffix="KWD"
                                valueStyle={{ color: '#ff4d4f' }}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            <Card
                title="Refunds"
                extra={
                    <Button icon={<ReloadOutlined />} onClick={() => { fetchRefunds(1); fetchHesabeStats(); }}>
                        Refresh
                    </Button>
                }
            >
                {/* Filters */}
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                        <RangePicker
                            style={{ width: '100%' }}
                            onChange={(dates) => setDateRange(dates as any)}
                            placeholder={['Date From', 'Date To']}
                        />
                    </Col>
                    <Col span={5}>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Filter by status"
                            allowClear
                            onChange={(val) => setStatusFilter(val)}
                        >
                            <Option value="pending">Pending</Option>
                            <Option value="processing">Processing</Option>
                            <Option value="completed">Completed</Option>
                            <Option value="failed">Failed</Option>
                            <Option value="cancelled">Cancelled</Option>
                        </Select>
                    </Col>
                    <Col span={6}>
                        <Input.Search
                            placeholder="Search by booking ID..."
                            allowClear
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onSearch={() => { fetchRefunds(1); fetchHesabeStats(); }}
                        />
                    </Col>
                </Row>

                <Table
                    columns={columns}
                    dataSource={refunds}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        ...pagination,
                        onChange: (page) => fetchRefunds(page),
                        showSizeChanger: false,
                        showTotal: (total) => `${total} refunds`
                    }}
                />
            </Card>

            {/* Details Drawer */}
            <Drawer
                title={`Refund Details${selectedRefund?.hesabe_refund_id ? ` — #${selectedRefund.hesabe_refund_id}` : ''}`}
                open={detailsDrawerOpen}
                onClose={() => setDetailsDrawerOpen(false)}
                width={600}
            >
                {selectedRefund && (
                    <div>
                        <Descriptions title="Local Record" bordered size="small" column={1} style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="Local Refund ID">{selectedRefund.id}</Descriptions.Item>
                            <Descriptions.Item label="Booking ID">{selectedRefund.booking_id}</Descriptions.Item>
                            <Descriptions.Item label="Amount">
                                <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
                                    {formatPrice(Number(selectedRefund.amount), 'KWD')}
                                </span>
                            </Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag color={LOCAL_STATUS_COLOR[selectedRefund.status]}>
                                    {selectedRefund.status?.toUpperCase()}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Transaction Ref">
                                {selectedRefund.transaction_reference || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Reason">{selectedRefund.reason || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Created At">
                                {dayjs(selectedRefund.created_at).format('DD MMM YYYY HH:mm')}
                            </Descriptions.Item>
                            {selectedRefund.processed_at && (
                                <Descriptions.Item label="Processed At">
                                    {dayjs(selectedRefund.processed_at).format('DD MMM YYYY HH:mm')}
                                </Descriptions.Item>
                            )}
                        </Descriptions>

                        {selectedRefund.hesabe_refund_id && (
                            <>
                                <Divider>Hesabe Details</Divider>
                                {detailsLoading ? (
                                    <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>
                                        Loading Hesabe details…
                                    </div>
                                ) : hesabeDetails ? (
                                    <Descriptions bordered size="small" column={1}>
                                        <Descriptions.Item label="Hesabe Refund ID">{hesabeDetails.id || selectedRefund.hesabe_refund_id}</Descriptions.Item>
                                        {hesabeDetails.status !== undefined && (
                                            <Descriptions.Item label="Hesabe Status">
                                                <Tag color={getHesabeStatus(hesabeDetails.status).color}>
                                                    {getHesabeStatus(hesabeDetails.status).label}
                                                </Tag>
                                            </Descriptions.Item>
                                        )}
                                        {hesabeDetails.amount && (
                                            <Descriptions.Item label="Amount">{hesabeDetails.amount} KWD</Descriptions.Item>
                                        )}
                                        {hesabeDetails.token && (
                                            <Descriptions.Item label="Token">
                                                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{hesabeDetails.token}</span>
                                            </Descriptions.Item>
                                        )}
                                        {hesabeDetails.order_reference_number && (
                                            <Descriptions.Item label="Order Ref">{hesabeDetails.order_reference_number}</Descriptions.Item>
                                        )}
                                        {hesabeDetails.refund_method !== undefined && (
                                            <Descriptions.Item label="Refund Method">
                                                {hesabeDetails.refund_method === '1' || hesabeDetails.refund_method === 1 ? 'Full Refund' : 'Partial Refund'}
                                            </Descriptions.Item>
                                        )}
                                        {hesabeDetails.recover_method && (
                                            <Descriptions.Item label="Recover Method">{hesabeDetails.recover_method}</Descriptions.Item>
                                        )}
                                        {hesabeDetails.approved_by && (
                                            <Descriptions.Item label="Approved By">{hesabeDetails.approved_by}</Descriptions.Item>
                                        )}
                                        {hesabeDetails.remarks && (
                                            <Descriptions.Item label="Remarks">{hesabeDetails.remarks}</Descriptions.Item>
                                        )}
                                        {hesabeDetails.refund_at && (
                                            <Descriptions.Item label="Refunded At">{hesabeDetails.refund_at}</Descriptions.Item>
                                        )}
                                        {hesabeDetails.transaction && (
                                            <>
                                                <Descriptions.Item label="Payment Method">
                                                    {hesabeDetails.transaction.display_name || hesabeDetails.transaction.payment_name || '-'}
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Transaction ID">
                                                    <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                                                        {hesabeDetails.transaction.transaction_id || '-'}
                                                    </span>
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Auth Code">{hesabeDetails.transaction.auth || '-'}</Descriptions.Item>
                                                <Descriptions.Item label="Track ID">{hesabeDetails.transaction.track_id || '-'}</Descriptions.Item>
                                            </>
                                        )}
                                    </Descriptions>
                                ) : (
                                    <Alert
                                        message="Could not load Hesabe details"
                                        description="The live Hesabe refund data is unavailable at this time. Local record information is shown above."
                                        type="warning"
                                        showIcon
                                    />
                                )}
                            </>
                        )}

                        {(selectedRefund.status === 'pending' || selectedRefund.status === 'processing') && (
                            <>
                                <Divider />
                                <ProtectedButton
                                    permission="refunds.reject"
                                    danger
                                    block
                                    icon={<StopOutlined />}
                                    loading={cancelLoading === selectedRefund.id}
                                    onClick={() => handleCancelRefund(selectedRefund)}
                                >
                                    Cancel This Refund
                                </ProtectedButton>
                            </>
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
};

// Local helper used inside the drawer component
function getHesabeStatus(status: number): { label: string; color: string } {
    const REFUND_STATUS_MAP: Record<number, { label: string; color: string }> = {
        0: { label: 'Pending', color: 'orange' },
        1: { label: 'Approved', color: 'green' },
        2: { label: 'Rejected', color: 'red' }
    };
    return REFUND_STATUS_MAP[status] || { label: `Status ${status}`, color: 'default' };
}

export default Refunds;
