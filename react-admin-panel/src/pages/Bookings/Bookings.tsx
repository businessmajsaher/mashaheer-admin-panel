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
  Divider,
  Alert
} from 'antd';
import { EyeOutlined, ReloadOutlined, DollarOutlined, ExclamationCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { bookingService } from '../../services/bookingService';
import { serviceService } from '../../services/serviceService';
import { refundService, RefundRequest } from '../../services/refundService';
import { contractService } from '../../services/contractService';
import html2pdf from 'html2pdf.js';
import { Booking, BookingFilters, BookingStatus } from '../../types/booking';
import { Service } from '../../types/service';
import { formatPrice } from '../../utils/currencyUtils';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';

dayjs.extend(advancedFormat);

const BOOKING_DATE_DISPLAY = 'Do MMMM YYYY h:mm a';

const { TextArea } = Input;
const { Option } = Select;

const LOCAL_REFUND_STATUS_COLOR: Record<string, string> = {
  pending: 'blue',
  processing: 'orange',
  completed: 'green',
  failed: 'red',
  cancelled: 'default'
};

type ContractParty = 'customer' | 'influencer';

function contractHasRenderableBlob(contract: Record<string, unknown>): boolean {
  const pdf =
    (typeof contract.pdf_url === 'string' && contract.pdf_url) ||
    (typeof contract.signed_pdf_url === 'string' && contract.signed_pdf_url) ||
    (typeof contract.document_url === 'string' && contract.document_url);
  if (pdf) return true;
  const html = contract.generated_content;
  if (typeof html === 'string' && html.trim().length > 0) return true;
  const sigs = contract.signatures;
  return Array.isArray(sigs) && sigs.length > 0;
}

function normalizedSignerType(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim().toLowerCase();
  return t || null;
}

function isCustomerSignerType(t: string): boolean {
  return t === 'customer' || t === 'brand' || t === 'client';
}

function isInfluencerSignerType(t: string): boolean {
  return t === 'influencer' || t === 'creator';
}

function hasPartySignature(contract: Record<string, unknown>, party: ContractParty): boolean {
  const sigs = contract.signatures;
  if (!Array.isArray(sigs)) return false;
  for (const s of sigs) {
    const t = normalizedSignerType((s as { signer_type?: string }).signer_type);
    if (!t) continue;
    if (party === 'customer' && isCustomerSignerType(t)) return true;
    if (party === 'influencer' && isInfluencerSignerType(t)) return true;
  }
  return false;
}

function getPartySignatureRows(
  contract: Record<string, unknown>,
  party: ContractParty
): { signer_type?: string; signature_data?: string | null; signed_at?: string | null }[] {
  const sigs = contract.signatures;
  if (!Array.isArray(sigs)) return [];
  return sigs.filter((s) => {
    const t = normalizedSignerType((s as { signer_type?: string }).signer_type);
    if (!t) return false;
    if (party === 'customer') return isCustomerSignerType(t);
    return isInfluencerSignerType(t);
  }) as { signer_type?: string; signature_data?: string | null; signed_at?: string | null }[];
}

function partyPdfUrlFromVariables(contract: Record<string, unknown>, party: ContractParty): string {
  const v = contract.variables;
  if (!v || typeof v !== 'object') return '';
  const o = v as Record<string, unknown>;
  if (party === 'customer') {
    return (
      (typeof o.customer_pdf_url === 'string' && o.customer_pdf_url.trim()) ||
      (typeof o.customer_signed_pdf_url === 'string' && o.customer_signed_pdf_url.trim()) ||
      (typeof o.customer_contract_pdf_url === 'string' && o.customer_contract_pdf_url.trim()) ||
      ''
    );
  }
  return (
    (typeof o.influencer_pdf_url === 'string' && o.influencer_pdf_url.trim()) ||
    (typeof o.influencer_signed_pdf_url === 'string' && o.influencer_signed_pdf_url.trim()) ||
    (typeof o.influencer_contract_pdf_url === 'string' && o.influencer_contract_pdf_url.trim()) ||
    ''
  );
}

/**
 * Customer/influencer copy: party-specific PDF in variables, or HTML with that party's signature block.
 * If signature rows exist, only parties with a matching signer_type can download. If none exist, both copies are allowed when there is any renderable contract content.
 */
function canDownloadPartyContract(contract: Record<string, unknown>, party: ContractParty): boolean {
  if (partyPdfUrlFromVariables(contract, party)) return true;
  if (!contractHasRenderableBlob(contract)) return false;
  const sigs = contract.signatures;
  const hasRows = Array.isArray(sigs) && sigs.length > 0;
  if (hasRows) return hasPartySignature(contract, party);
  return true;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPartyContractHtml(contract: Record<string, unknown>, party: ContractParty): string {
  const partyLabel = party === 'customer' ? 'Customer' : 'Influencer';
  const raw = contract.generated_content;
  const fragment =
    typeof raw === 'string' && raw.trim()
      ? raw.trim()
      : '<p><em>No contract body was stored for this instance.</em></p>';

  const rows = getPartySignatureRows(contract, party);
  let sigHtml = '';
  if (rows.length > 0) {
    const row = rows[0];
    const sigData = row.signature_data;
    const signedAt = row.signed_at ? String(row.signed_at) : '';
    sigHtml += `<section style="margin-top:2rem;border-top:1px solid #ccc;padding-top:1rem;"><h2>${partyLabel} signature</h2>`;
    if (sigData && (sigData.startsWith('data:image') || /^https?:\/\//i.test(sigData))) {
      const safeSrc = sigData.replace(/"/g, '&quot;');
      sigHtml += `<p><img src="${safeSrc}" alt="Signature" style="max-width:320px;max-height:120px;" /></p>`;
    } else if (sigData) {
      sigHtml += `<p><pre style="white-space:pre-wrap;">${escapeHtml(sigData)}</pre></p>`;
    }
    if (signedAt) sigHtml += `<p><small>Signed at: ${escapeHtml(signedAt)}</small></p>`;
    sigHtml += '</section>';
  } else {
    sigHtml += `<p style="margin-top:2rem;color:#666;"><small>${partyLabel} copy. No separate signature record was found for this party; the contract text below is unchanged.</small></p>`;
  }

  if (/^<!DOCTYPE/i.test(fragment) || /^<html/i.test(fragment)) {
    if (/<\/body>/i.test(fragment)) return fragment.replace(/<\/body>/i, `${sigHtml}</body>`);
    return `${fragment}${sigHtml}`;
  }
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Contract — ${partyLabel} copy</title></head><body><h1>${partyLabel} copy</h1>${fragment}${sigHtml}</body></html>`;
}

function triggerBlobDownload(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadPartyContract(contract: Record<string, unknown>, party: ContractParty, bookingId: string) {
  const shortId = bookingId.slice(0, 8);
  const partyPdf = partyPdfUrlFromVariables(contract, party);
  if (partyPdf) {
    const a = document.createElement('a');
    a.href = partyPdf;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = `contract-${shortId}-${party}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    message.success(`${party === 'customer' ? 'Customer' : 'Influencer'} contract PDF opened`);
    return;
  }
  const gen = contract.generated_content;
  if (typeof gen === 'string' && gen.trim()) {
    const html = buildPartyContractHtml(contract, party);
    triggerBlobDownload(`contract-${shortId}-${party}.html`, 'text/html;charset=utf-8', html);
    message.success(`${party === 'customer' ? 'Customer' : 'Influencer'} copy downloaded`);
    return;
  }
  const sharedPdf =
    (typeof contract.pdf_url === 'string' && contract.pdf_url.trim()) ||
    (typeof contract.signed_pdf_url === 'string' && contract.signed_pdf_url.trim()) ||
    (typeof contract.document_url === 'string' && contract.document_url.trim()) ||
    '';
  if (sharedPdf) {
    const a = document.createElement('a');
    a.href = sharedPdf;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = `contract-${shortId}-${party}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    message.success('Opening contract PDF');
    return;
  }
  const html = buildPartyContractHtml(contract, party);
  triggerBlobDownload(`contract-${shortId}-${party}.html`, 'text/html;charset=utf-8', html);
  message.success(`${party === 'customer' ? 'Customer' : 'Influencer'} copy downloaded`);
}


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
        script: fullBooking.script || ''
      });
      setModalVisible(true);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      message.error('Failed to fetch booking details');
    }
  };

  const handleDownloadContract = async (instanceId: string, party?: 'customer' | 'influencer') => {
    try {
      const html = await contractService.downloadContractHtml(instanceId, party);
      const shortId = instanceId.slice(0, 8);
      
      if (!party) {
        // Final Agreement as PDF
        // Create an off-screen container to prevent UI shifting
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '800px'; // Set a fixed width for consistent rendering
        
        const element = document.createElement('div');
        element.innerHTML = html;
        element.style.padding = '40px';
        element.style.backgroundColor = 'white';
        element.style.fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
        
        container.appendChild(element);
        document.body.appendChild(container);
        
        const opt = {
          margin: 10,
          filename: `final-signed-contract-${shortId}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };
        
        try {
          await html2pdf().from(element).set(opt).save();
          message.success('Final signed contract PDF downloaded');
        } finally {
          document.body.removeChild(container);
        }
      } else {
        // Separate party copies still as HTML (per requirement or common practice)
        // or if they also want PDF, we could do it. 
        // User said: "clicking on the either of theire sinature its sign in image i should able to download"
        // I'll implement handleDownloadSignatureOnly for that.
        const filename = `contract-${shortId}-${party}.html`;
        triggerBlobDownload(filename, 'text/html;charset=utf-8', html);
        message.success(`${party === 'customer' ? 'Customer' : 'Influencer'} contract copy downloaded`);
      }
    } catch (error: any) {
      console.error('Download error:', error);
      message.error(error.message || 'Failed to download contract');
    }
  };

  const handleDownloadSignatureOnly = async (instanceId: string, party: 'customer' | 'influencer') => {
    try {
      await contractService.downloadSignatureOnly(instanceId, party);
      message.success(`${party === 'customer' ? 'Customer' : 'Influencer'} signature downloaded`);
    } catch (error: any) {
      message.error(error.message || 'Failed to download signature');
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
      const { feedback: _f, ...rest } = values;
      await bookingService.updateBooking(selectedBooking.id, {
        ...rest,
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
      id: allValues.id,
      service_id: allValues.service_id,
      status: allValues.status,
      date_from: allValues.date_from?.toISOString(),
      date_to: allValues.date_to?.toISOString()
    };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleInitiateRefund = (booking: Booking) => {
    // Show warning dialog before opening the refund form
    Modal.confirm({
      title: 'Initiate Refund',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <Alert
            message="This action cannot be undone"
            description="A refund request will be submitted to Hesabe. Once initiated, you can only cancel it while it is still in 'Pending' status."
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
          />
          <p>Booking: <strong>{(booking as any).service?.title || booking.id}</strong></p>
        </div>
      ),
      okText: 'Continue to Refund',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        setSelectedBooking(booking);
        const completedPayment = (booking as any).payments?.find((p: any) => p.status === 'completed');
        if (completedPayment) {
          refundForm.setFieldsValue({
            amount: completedPayment.amount,
            reason: ''
          });
        }
        setRefundModalVisible(true);
      }
    });
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
      const r = result as any;

      if (result.status === 'completed') {
        message.success('Refund processed successfully');
      } else if (result.status === 'processing') {
        message.info('Refund is being processed');
      } else {
        message.warning('Refund request submitted but may need manual review');
      }

      const bookingId = selectedBooking.id;
      const mergedRefund = {
        id: r.id,
        booking_id: r.booking_id ?? bookingId,
        amount: r.amount,
        currency: r.currency ?? 'KWD',
        status: r.status,
        reason: r.reason ?? values.reason,
        created_at: r.created_at ?? new Date().toISOString(),
        hesabe_refund_id: r.hesabe_refund_id
      };

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...(b as any), refunds: [...(((b as any).refunds as any[]) || []), mergedRefund] }
            : b
        )
      );
      setSelectedBooking((prev) =>
        prev && prev.id === bookingId
          ? { ...(prev as any), refunds: [...(((prev as any).refunds as any[]) || []), mergedRefund] }
          : prev
      );

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
      render: (date: string) => date ? dayjs(date).format(BOOKING_DATE_DISPLAY) : 'N/A'
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
        const refunds: any[] = (record as any).refunds || [];
        const isPublished = (record as any).is_published === true;
        // Hide Refund when a non-terminal refund exists (failed/cancelled can retry)
        const refundBlocksNew = refunds.some((r: any) => {
          const s = String(r.status || '').toLowerCase();
          return s === 'pending' || s === 'processing' || s === 'completed';
        });
        const hasAnyRefund = refunds.length > 0;
        const latestRefund = hasAnyRefund
          ? [...refunds].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          : null;

        return (
          <Space>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            >
              View Details
            </Button>
            {completedPayment && !isPublished && !refundBlocksNew && (
              <Button
                type="link"
                icon={<DollarOutlined />}
                danger
                onClick={() => handleInitiateRefund(record)}
                title="Initiate refund"
              >
                Refund
              </Button>
            )}
            {hasAnyRefund && latestRefund && (
              <Tag color={LOCAL_REFUND_STATUS_COLOR[latestRefund.status] || 'default'} style={{ marginLeft: 4 }}>
                REFUND {latestRefund.status?.toUpperCase()}
              </Tag>
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
            <Col span={4}>
              <Form.Item name="id" style={{ marginBottom: 0, width: '100%' }}>
                <Input placeholder="Booking ID" allowClear />
              </Form.Item>
            </Col>
            <Col span={4}>
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
            <Col span={4}>
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
            <Col span={4}>
              <Form.Item name="date_from" style={{ marginBottom: 0, width: '100%' }}>
                <DatePicker
                  placeholder="Filter by date from"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
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
                <Descriptions.Item label="Booking ID" span={3}>
                  {selectedBooking.id}
                </Descriptions.Item>
                <Descriptions.Item label="Transaction Ref" span={3}>
                  {(selectedBooking as any).payments?.find((p: any) => p.status === 'completed')?.transaction_reference || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Service" span={3}>
                  {selectedBooking.service?.title || 'N/A'}
                  {selectedBooking.service?.service_type === 'dual' && (
                    <Tag color="purple" style={{ marginLeft: 8 }}>Dual Booking</Tag>
                  )}
                </Descriptions.Item>
                {selectedBooking.service?.service_type === 'dual' && selectedBooking.invited_influencer && (
                  <Descriptions.Item label="Invited Partner" span={3}>
                    {selectedBooking.invited_influencer.name} ({selectedBooking.invited_influencer.email})
                  </Descriptions.Item>
                )}
                {selectedBooking.contract && (
                  <Descriptions.Item label="Contract Status" span={3}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Tag color={
                        selectedBooking.contract.status === 'signed' ? 'green' :
                          selectedBooking.contract.status === 'completed' ? 'green' :
                            selectedBooking.contract.status === 'active' ? 'green' :
                              selectedBooking.contract.status === 'pending' ? 'orange' : 'default'
                      }>
                        {selectedBooking.contract.status?.toUpperCase()}
                      </Tag>
                      <Space wrap size="small">
                        <Button
                          type="primary"
                          size="small"
                          icon={<DownloadOutlined />}
                          disabled={!canDownloadPartyContract(selectedBooking.contract as Record<string, unknown>, 'customer')}
                          onClick={() => handleDownloadSignatureOnly(selectedBooking.contract!.id, 'customer')}
                        >
                          Customer signature
                        </Button>
                        <Button
                          type="primary"
                          size="small"
                          icon={<DownloadOutlined />}
                          disabled={!canDownloadPartyContract(selectedBooking.contract as Record<string, unknown>, 'influencer')}
                          onClick={() => handleDownloadSignatureOnly(selectedBooking.contract!.id, 'influencer')}
                        >
                          Influencer signature
                        </Button>
                        {(selectedBooking.contract.status === 'active' || selectedBooking.contract.status === 'completed') && (
                          <Button
                            type="primary"
                            size="small"
                            icon={<DownloadOutlined />}
                            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                            onClick={() => handleDownloadContract(selectedBooking.contract!.id)}
                          >
                            Final Signed Agreement (PDF)
                          </Button>
                        )}
                      </Space>
                      <span style={{ fontSize: 12, color: '#888' }}>
                        Download separate party copies or the consolidated final agreement once both parties have signed. Signatures are automatically injected as images into the document.
                      </span>
                    </Space>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Customer" span={3}>
                  {selectedBooking.customer?.name || 'N/A'} ({selectedBooking.customer?.email || 'N/A'})
                </Descriptions.Item>
                <Descriptions.Item
                  label={selectedBooking.service?.service_type === 'dual' ? 'Customer contact for this booking' : 'Influencer'}
                  span={3}
                >
                  {selectedBooking.influencer?.name || 'N/A'} ({selectedBooking.influencer?.email || 'N/A'})
                  {selectedBooking.service?.service_type === 'dual' && (
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      Primary or first invited influencer who received the customer&apos;s request; payouts follow the service split.
                    </div>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Scheduled Time" span={3}>
                  {selectedBooking.scheduled_time ? dayjs(selectedBooking.scheduled_time).format(BOOKING_DATE_DISPLAY) : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Completed Time" span={3}>
                  {selectedBooking.completed_time ? dayjs(selectedBooking.completed_time).format(BOOKING_DATE_DISPLAY) : 'Not completed'}
                </Descriptions.Item>
                <Descriptions.Item label="Notes" span={3}>
                  {selectedBooking.notes || 'None'}
                </Descriptions.Item>
                <Descriptions.Item label="Script" span={3}>
                  {selectedBooking.script || 'No script provided'}
                </Descriptions.Item>
                <Descriptions.Item label="Script Created At" span={3}>
                  {selectedBooking.script_created_at ? dayjs(selectedBooking.script_created_at).format(BOOKING_DATE_DISPLAY) : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Script Approved At" span={3}>
                  {selectedBooking.script_approved_at ? dayjs(selectedBooking.script_approved_at).format(BOOKING_DATE_DISPLAY) : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Script Rejected Count" span={3}>
                  {selectedBooking.script_rejected_count || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Days Gap" span={3}>
                  {selectedBooking.days_gap ? `${selectedBooking.days_gap} days` : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Is Published" span={3}>
                  {selectedBooking.is_published ? (
                    <Tag color="green">Yes {selectedBooking.published_at ? `(${dayjs(selectedBooking.published_at).format(BOOKING_DATE_DISPLAY)})` : ''}</Tag>
                  ) : (
                    <Tag color="red">No</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>

              {/* Revision Time Frames (Non-editable) */}
              <Divider>Revision Time Frames</Divider>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Influencer Approval Deadline" span={2}>
                  {selectedBooking.influencer_approval_deadline ? (
                    <span style={{
                      color: dayjs(selectedBooking.influencer_approval_deadline).isBefore(dayjs()) ? '#ff4d4f' : '#52c41a',
                      fontWeight: 'bold'
                    }}>
                      {dayjs(selectedBooking.influencer_approval_deadline).format(BOOKING_DATE_DISPLAY)}
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
                      {dayjs(selectedBooking.payment_deadline).format(BOOKING_DATE_DISPLAY)}
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
                      {dayjs(selectedBooking.script_submission_deadline).format(BOOKING_DATE_DISPLAY)}
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
                      {dayjs(selectedBooking.auto_approval_deadline).format(BOOKING_DATE_DISPLAY)}
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
                      {dayjs(selectedBooking.appointment_end_time).format(BOOKING_DATE_DISPLAY)}
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
                      {dayjs(selectedBooking.influencer_response_deadline).format(BOOKING_DATE_DISPLAY)}
                      {dayjs(selectedBooking.influencer_response_deadline).isBefore(dayjs()) && ' (Expired)'}
                    </span>
                  </Descriptions.Item>
                )}
                {selectedBooking.last_script_submitted_at && (
                  <Descriptions.Item label="Last Script Submitted" span={2}>
                    {dayjs(selectedBooking.last_script_submitted_at).format(BOOKING_DATE_DISPLAY)}
                  </Descriptions.Item>
                )}
                {selectedBooking.last_script_rejected_at && (
                  <Descriptions.Item label="Last Script Rejected" span={2}>
                    {dayjs(selectedBooking.last_script_rejected_at).format(BOOKING_DATE_DISPLAY)}
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
                            {dayjs(payment.paid_at).format(BOOKING_DATE_DISPLAY)}
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
                          {dayjs(refund.created_at).format(BOOKING_DATE_DISPLAY)}
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
              <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
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
