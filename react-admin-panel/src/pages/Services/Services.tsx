import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Modal, Form, Input, Alert, Spin, message, Popconfirm, Upload, Select, Switch, DatePicker, InputNumber, Divider, Row, Col, Drawer, Descriptions, Tag } from 'antd';
import { AppstoreAddOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, UploadOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { ProtectedButton } from '@/components/ProtectedButton';
import { supabase } from '@/services/supabaseClient';
import { settingsService } from '@/services/settingsService';
import dayjs from 'dayjs';
import { getCurrencyByCountry, getCurrencySymbol, formatPrice, getCurrencyDecimals } from '@/utils/currencyUtils';

// Currency options for dropdown
const allCurrencyOptions = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'AUD', label: 'AUD (A$)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CHF', label: 'CHF' },
  { value: 'INR', label: 'INR (₹)' },
  { value: 'BRL', label: 'BRL (R$)' },
  { value: 'MXN', label: 'MXN ($)' },
  { value: 'SGD', label: 'SGD (S$)' },
  { value: 'HKD', label: 'HKD (HK$)' },
  { value: 'NZD', label: 'NZD (NZ$)' },
  { value: 'SEK', label: 'SEK (kr)' },
  { value: 'NOK', label: 'NOK (kr)' },
  { value: 'DKK', label: 'DKK (kr)' },
  { value: 'ZAR', label: 'ZAR (R)' },
  { value: 'TRY', label: 'TRY (₺)' },
  { value: 'RUB', label: 'RUB (₽)' },
  { value: 'KRW', label: 'KRW (₩)' },
  { value: 'THB', label: 'THB (฿)' },
  { value: 'MYR', label: 'MYR (RM)' },
  { value: 'IDR', label: 'IDR (Rp)' },
  { value: 'PHP', label: 'PHP (₱)' },
  { value: 'VND', label: 'VND (₫)' },
  { value: 'AED', label: 'AED (د.إ)' },
  { value: 'BHD', label: 'BHD (د.ب)' },
  { value: 'KWD', label: 'KWD (د.ك)' },
  { value: 'OMR', label: 'OMR (ر.ع.)' },
  { value: 'QAR', label: 'QAR (ر.ق)' },
  { value: 'SAR', label: 'SAR (ر.س)' },
  { value: 'EGP', label: 'EGP (E£)' },
  { value: 'NGN', label: 'NGN (₦)' },
  { value: 'KES', label: 'KES (KSh)' },
  { value: 'MAD', label: 'MAD' },
  { value: 'ARS', label: 'ARS (AR$)' },
  { value: 'CLP', label: 'CLP (CL$)' },
  { value: 'COP', label: 'COP (CO$)' },
  { value: 'PEN', label: 'PEN (S/)' },
  { value: 'UAH', label: 'UAH (₴)' },
  { value: 'BYN', label: 'BYN (Br)' },
  { value: 'KZT', label: 'KZT (₸)' },
  { value: 'UZS', label: 'UZS (so\'m)' },
  { value: 'KGS', label: 'KGS (с)' },
  { value: 'TJS', label: 'TJS (ЅM)' },
  { value: 'TMT', label: 'TMT (T)' },
  { value: 'AZN', label: 'AZN (₼)' },
  { value: 'GEL', label: 'GEL (₾)' },
  { value: 'AMD', label: 'AMD (֏)' },
  { value: 'MDL', label: 'MDL (L)' },
  { value: 'ALL', label: 'ALL (L)' },
  { value: 'MKD', label: 'MKD (ден)' },
  { value: 'RSD', label: 'RSD (дин)' },
  { value: 'BAM', label: 'BAM (KM)' },
  { value: 'ISK', label: 'ISK (kr)' }
];

// Phase 1: Only KWD is allowed
// To enable all currencies in future phases, change this to: const currencyOptions = allCurrencyOptions;
const currencyOptions = allCurrencyOptions.filter(option => option.value === 'KWD');

const { TextArea } = Input;
const { Option } = Select;

const MSG_FLASH_BLOCKS_OFFER =
  'Flash deal is on. Turn it off before enabling manual offer.';
const MSG_OFFER_BLOCKS_FLASH =
  'Manual offer is on. Turn it off before enabling flash deal.';

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const addFlashWatch = Form.useWatch('is_flash_deal', form);
  const addOfferWatch = Form.useWatch('offer_active', form);
  const editFlashWatch = Form.useWatch('is_flash_deal', editForm);
  const editOfferWatch = Form.useWatch('offer_active', editForm);
  const showAddDiscount = !!addFlashWatch || !!addOfferWatch;
  const showEditDiscount = !!editFlashWatch || !!editOfferWatch;
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [thumbnailFile, setThumbnailFile] = useState<any>(null);
  const [editThumbnailFile, setEditThumbnailFile] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');
  const [isFlashDeal, setIsFlashDeal] = useState(false);
  const [editIsFlashDeal, setEditIsFlashDeal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('KWD');
  const [editSelectedCurrency, setEditSelectedCurrency] = useState<string>('KWD');
  const [filters, setFilters] = useState({
    category_id: undefined,
    service_type: undefined,
    primary_influencer_id: undefined
  });
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedServiceDetails, setSelectedServiceDetails] = useState<any>(null);
  const [serviceBookings, setServiceBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);



  // Fetch services from Supabase with category information
  const fetchServices = async () => {
    console.log('🔄 Fetching services...');
    setLoading(true);
    try {
      let query = supabase.from('services').select(`
        *,
        profiles!primary_influencer_id(country),
        service_categories!category_id (
          id,
          name
        )
      `).order('created_at', { ascending: false });

      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters.service_type) {
        query = query.eq('service_type', filters.service_type);
      }
      if (filters.primary_influencer_id) {
        query = query.eq('primary_influencer_id', filters.primary_influencer_id);
      }

      console.log('🔍 Services query:', query);
      const { data, error } = await query;

      if (error) {
        console.error('❌ Services fetch error:', error);
        message.error(error.message);
      } else {
        console.log('✅ Services fetched successfully:', data?.length || 0, 'services');
      }

      setServices(data || []);
    } catch (err) {
      console.error('❌ Services fetch exception:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories from Supabase
  const fetchCategories = async () => {
    console.log('🔄 Fetching categories...');
    try {
      const { data, error } = await supabase.from('service_categories').select('*').order('name');
      if (error) {
        console.error('❌ Categories fetch error:', error);
        message.error(error.message);
      } else {
        console.log('✅ Categories fetched successfully:', data?.length || 0, 'categories');
      }
      setCategories(data || []);
    } catch (err) {
      console.error('❌ Categories fetch exception:', err);
    }
  };

  // Fetch influencers from Supabase
  const fetchInfluencers = async () => {
    console.log('🔄 Fetching influencers...');
    try {
      const { data, error } = await supabase.from('profiles').select('id, name, email, country').eq('role', 'influencer').order('name');
      if (error) {
        console.error('❌ Influencers fetch error:', error);
        message.error(error.message);
      } else {
        console.log('✅ Influencers fetched successfully:', data?.length || 0, 'influencers');
      }
      setInfluencers(data || []);
    } catch (err) {
      console.error('❌ Influencers fetch exception:', err);
    }
  };

  // Fetch platforms from Supabase
  const fetchPlatforms = async () => {
    console.log('🔄 Fetching platforms...');
    try {
      const { data, error } = await supabase.from('social_media_platforms').select('*').order('name');
      if (error) {
        console.error('❌ Platforms fetch error:', error);
        message.error(error.message);
      } else {
        console.log('✅ Platforms fetched successfully:', data?.length || 0, 'platforms');
      }
      setPlatforms(data || []);
    } catch (err) {
      console.error('❌ Platforms fetch exception:', err);
    }
  };

  // Fetch platform settings
  const fetchPlatformSettings = async () => {
    try {
      const settings = await settingsService.getSettings();
      setPlatformSettings(settings);
    } catch (error) {
      console.error('Error fetching platform settings:', error);
    }
  };

  useEffect(() => {
    console.log('🚀 Services component mounted, fetching data...');
    fetchServices();
    fetchCategories();
    fetchInfluencers();
    fetchPlatforms();
    fetchPlatformSettings();
  }, [modalOpen, editModalOpen, filters]);

  // Set form values when editing service changes
  useEffect(() => {
    if (editingService && editModalOpen) {
      editForm.resetFields();
      const p = Number(editingService.price);
      const o = Number(editingService.offer_price);
      const discountPct =
        p > 0 && o < p && o > 0 ? Number((((1 - o / p) * 100).toFixed(3))) : 0;

      editForm.setFieldsValue({
        title: editingService.title,
        description: editingService.description,
        thumbnail: editingService.thumbnail,
        min_duration_days: editingService.min_duration_days,
        is_flash_deal: editingService.is_flash_deal,
        offer_active: !!editingService.offer_active,
        flash_from: editingService.flash_from ? dayjs(editingService.flash_from) : null,
        flash_to: editingService.flash_to ? dayjs(editingService.flash_to) : null,
        location_required: editingService.location_required,
        about_us: editingService.about_us,
        service_type: editingService.service_type,
        primary_influencer_id: editingService.primary_influencer_id,
        invited_influencer_id: editingService.invited_influencer_id,
        category_id: editingService.category_id,
        platform_id: editingService.platform_ids || editingService.platform_id,
        price: editingService.price,
        discount_percentage: discountPct,
        currency: editingService.currency || 'KWD'
      });
      setEditIsFlashDeal(editingService.is_flash_deal);
      setEditSelectedCurrency(editingService.currency || 'KWD');
      setSelectedServiceType(editingService.service_type);
    }
  }, [editingService, editModalOpen, editForm]);

  // Reset form when edit modal closes
  useEffect(() => {
    if (!editModalOpen) {
      editForm.resetFields();
      setEditThumbnailFile(null);
    }
  }, [editModalOpen, editForm]);

  // Handle influencer selection and auto-populate currency
  const handleInfluencerChange = (influencerId: string, isEditForm: boolean = false) => {
    const selectedInfluencer = influencers.find(inf => inf.id === influencerId);
    if (selectedInfluencer && selectedInfluencer.country) {
      const currency = getCurrencyByCountry(selectedInfluencer.country);
      if (isEditForm) {
        setEditSelectedCurrency(currency);
        editForm.setFieldsValue({ currency });
      } else {
        setSelectedCurrency(currency);
        form.setFieldsValue({ currency });
      }
    }
  };

  // Add Service handler
  const handleAddService = async (values: any) => {
    console.log('🔄 Adding service with values:', values);
    setFormLoading(true);
    setFormError(null);
    try {
      if (values.service_type === 'dual') {
        if (!values.about_us?.trim()) {
          message.error('About Us is required for dual services');
          return;
        }
        if (!values.invited_influencer_id) {
          message.error('Invited Influencer is required for dual services');
          return;
        }
        if (values.primary_influencer_id === values.invited_influencer_id) {
          message.error('Primary and invited influencer must be different people');
          return;
        }
      }

      if (!thumbnailFile) {
        message.error('Thumbnail is required');
        return;
      }

      // Ensure form shows inline error under the upload field too
      await form.validateFields().catch(() => {
        // errors shown inline
        throw new Error('Validation failed');
      });

      let thumbnail = values.thumbnail;
      if (thumbnailFile) {
        console.log('📁 Uploading thumbnail file:', thumbnailFile.name);
        const filePath = `thumbnails/${Date.now()}-${thumbnailFile.name}`;
        const { error: uploadError } = await supabase.storage.from('services').upload(filePath, thumbnailFile, { upsert: true });
        if (uploadError) {
          console.error('❌ Thumbnail upload error:', uploadError);
          throw uploadError;
        }
        const { data: publicUrlData } = supabase.storage.from('services').getPublicUrl(filePath);
        thumbnail = publicUrlData?.publicUrl;
        console.log('✅ Thumbnail uploaded successfully:', thumbnail);
      }

      const disc = values.discount_percentage ?? 0;
      const flashOn = !!values.is_flash_deal;
      const offerOn = !!values.offer_active;
      if (flashOn && offerOn) {
        message.error('Flash deal and manual offer cannot both be active.');
        return;
      }
      if (flashOn && disc <= 0) {
        message.error('Enter a discount % for flash deals');
        return;
      }
      if (offerOn && disc <= 0) {
        message.error('Enter a discount % when manual offer is active');
        return;
      }
      let offerPrice = values.price;
      const discountApplies = (flashOn || offerOn) && disc > 0 && disc < 100;
      if (discountApplies) {
        offerPrice = Number((values.price * (1 - disc / 100)).toFixed(3));
      }

      const serviceData = {
        title: values.title,
        description: values.description,
        thumbnail,
        min_duration_days: values.min_duration_days,
        is_flash_deal: flashOn,
        offer_active: offerOn,
        flash_from: values.flash_from?.toISOString(),
        flash_to: values.flash_to?.toISOString(),
        location_required: values.location_required || false,
        about_us: values.about_us,
        service_type: values.service_type,
        primary_influencer_id: values.primary_influencer_id,
        invited_influencer_id: values.invited_influencer_id,
        category_id: values.category_id,
        platform_ids: values.platform_id ? (Array.isArray(values.platform_id) ? values.platform_id : [values.platform_id]) : [], // Ensure it's always an array
        price: values.price,
        offer_price: offerPrice,
        currency: values.currency || selectedCurrency,
        primary_influencer_earnings_percentage: values.service_type === 'dual' ? (values.primary_influencer_earnings_percentage || 50) : null,
        invited_influencer_earnings_percentage: values.service_type === 'dual' ? (values.invited_influencer_earnings_percentage || 50) : null,
        created_at: new Date().toISOString(),
        is_suspended: false,
      };

      console.log('📝 Inserting service data:', serviceData);
      const { error } = await supabase.from('services').insert([serviceData]);

      if (error) {
        console.error('❌ Service insert error:', error);
        throw error;
      }

      console.log('✅ Service added successfully!');
      message.success('Service added!');
      setModalOpen(false);
      form.resetFields();
      setThumbnailFile(null);
    } catch (err: any) {
      console.error('❌ Service add exception:', err);
      setFormError(err.message || 'Failed to add service');
    } finally {
      setFormLoading(false);
    }
  };

  // Edit Service handler
  const handleEditService = async (values: any) => {
    setEditFormLoading(true);
    setEditFormError(null);
    try {
      if (values.service_type === 'dual') {
        if (!values.about_us?.trim()) {
          message.error('About Us is required for dual services');
          return;
        }
        if (!values.invited_influencer_id) {
          message.error('Invited Influencer is required for dual services');
          return;
        }
        if (values.primary_influencer_id === values.invited_influencer_id) {
          message.error('Primary and invited influencer must be different people');
          return;
        }
      }

      if (!editThumbnailFile && !editForm.getFieldValue('thumbnail')) {
        message.error('Thumbnail is required');
        return;
      }

      // Ensure form shows inline error under the upload field too
      await editForm.validateFields().catch(() => {
        // errors shown inline
        throw new Error('Validation failed');
      });

      let thumbnail = values.thumbnail;
      if (editThumbnailFile) {
        const filePath = `thumbnails/${Date.now()}-${editThumbnailFile.name}`;
        const { error: uploadError } = await supabase.storage.from('services').upload(filePath, editThumbnailFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('services').getPublicUrl(filePath);
        thumbnail = publicUrlData?.publicUrl;
      }

      let flashFrom = null;
      let flashTo = null;
      const disc = values.discount_percentage ?? 0;
      const flashOn = !!values.is_flash_deal;
      const offerOn = !!values.offer_active;
      if (flashOn && offerOn) {
        message.error('Flash deal and manual offer cannot both be active.');
        return;
      }
      if (offerOn && disc <= 0) {
        message.error('Enter a discount % when manual offer is active');
        return;
      }

      let offerPrice = values.price;
      const discountApplies = (flashOn || offerOn) && disc > 0 && disc < 100;
      if (discountApplies) {
        offerPrice = Number((values.price * (1 - disc / 100)).toFixed(3));
      }

      if (flashOn) {
        if (disc <= 0) {
          message.error('Enter a discount % for flash deals');
          return;
        }
        if (values.flash_from && typeof values.flash_from.toISOString === 'function') {
          flashFrom = values.flash_from.toISOString();
        } else if (values.flash_from) {
          console.warn('⚠️ Flash from date is not a valid dayjs object:', values.flash_from);
          flashFrom = null;
        }

        if (values.flash_to && typeof values.flash_to.toISOString === 'function') {
          flashTo = values.flash_to.toISOString();
        } else if (values.flash_to) {
          console.warn('⚠️ Flash to date is not a valid dayjs object:', values.flash_to);
          flashTo = null;
        }
      } else {
        flashFrom = null;
        flashTo = null;
        if (!discountApplies) {
          offerPrice = values.price;
        }
      }

      console.log('🔍 Date Debug:');
      console.log('Flash From (raw):', values.flash_from);
      console.log('Flash To (raw):', values.flash_to);
      console.log('Flash From (processed):', flashFrom);
      console.log('Flash To (processed):', flashTo);

      const updateData = {
        title: values.title,
        description: values.description,
        thumbnail,
        min_duration_days: values.min_duration_days,
        is_flash_deal: flashOn,
        offer_active: offerOn,
        flash_from: flashFrom,
        flash_to: flashTo,
        location_required: values.location_required || false,
        about_us: values.about_us,
        service_type: values.service_type,
        primary_influencer_id: values.primary_influencer_id,
        invited_influencer_id: values.invited_influencer_id,
        category_id: values.category_id,
        platform_ids: values.platform_id ? (Array.isArray(values.platform_id) ? values.platform_id : [values.platform_id]) : [],
        price: values.price,
        offer_price: offerPrice,
        currency: values.currency || editSelectedCurrency,
        primary_influencer_earnings_percentage: values.service_type === 'dual' ? (values.primary_influencer_earnings_percentage || 50) : null,
        invited_influencer_earnings_percentage: values.service_type === 'dual' ? (values.invited_influencer_earnings_percentage || 50) : null,
      };

      console.log('📝 Updating service with data:', updateData);
      console.log('🔄 Service type transition:', editingService.service_type, '->', values.service_type);
      console.log('🔄 Flash deal transition:', editingService.is_flash_deal, '->', values.is_flash_deal);
      console.log('🔍 Service type in updateData:', updateData.service_type);
      console.log('🔍 Is flash deal in updateData:', updateData.is_flash_deal);

      const { error } = await supabase.from('services').update(updateData).eq('id', editingService.id);
      if (error) {
        console.error('❌ Supabase update error:', error);
        throw error;
      }

      // Check if any rows were actually updated
      const { count, error: countError } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('id', editingService.id);

      if (countError) {
        console.error('❌ Count query error:', countError);
      } else {
        console.log('🔍 Rows affected by update:', count);
      }

      console.log('✅ Service update successful!');
      console.log('📊 Updated service data:', updateData);
      console.log('🆔 Service ID:', editingService.id);

      // Verify the update by querying the database
      const { data: verifyData, error: verifyError } = await supabase
        .from('services')
        .select('*')
        .eq('id', editingService.id)
        .single();

      if (verifyError) {
        console.error('❌ Verification query error:', verifyError);
      } else {
        console.log('🔍 Database verification after update:', verifyData);
        console.log('🔍 Service type in database:', verifyData.service_type);
        console.log('🔍 Is flash deal in database:', verifyData.is_flash_deal);
      }

      message.success('Service updated!');
      setEditModalOpen(false);
      setEditingService(null);
      setEditThumbnailFile(null);

      // Refresh the services list to show updated data
      fetchServices();
    } catch (err: any) {
      console.error('❌ Service update error:', err);
      setEditFormError(err.message || 'Failed to update service');
    } finally {
      setEditFormLoading(false);
    }
  };

  const handleToggleServiceSuspended = async (record: any) => {
    try {
      const nextSuspended = !record.is_suspended;
      const { error } = await supabase
        .from('services')
        .update({ is_suspended: nextSuspended })
        .eq('id', record.id);
      if (error) throw error;
      message.success(nextSuspended ? 'Service suspended' : 'Service activated');
      fetchServices();
    } catch (err: any) {
      message.error(err.message || 'Failed to update service status');
    }
  };

  // Fetch bookings for a service
  const fetchServiceBookings = async (serviceId: string) => {
    setBookingsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          created_at,
          customer_id,
          influencer_id,
          status_id,
          booking_statuses(name)
        `)
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServiceBookings(data || []);
    } catch (err: any) {
      console.error('Error fetching service bookings:', err);
      message.error('Failed to fetch bookings');
    } finally {
      setBookingsLoading(false);
    }
  };

  // Handle view details
  const handleViewDetails = async (record: any) => {
    setSelectedServiceDetails(record);
    setDetailDrawerVisible(true);
    await fetchServiceBookings(record.id);
  };

  const columns = [
    {
      title: 'Thumbnail',
      dataIndex: 'thumbnail',
      key: 'thumbnail',
      render: (url: string) => url ? <img src={url} alt="thumbnail" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '4px' }} /> : '-'
    },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    {
      title: 'Type',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (type: string, record: any) => {
        let displayType = type?.toUpperCase() || '-';
        if (record.is_flash_deal && type !== 'flash') {
          displayType = `FLASH ${displayType}`;
        }
        return (
          <span style={{
            color: type === 'flash' || record.is_flash_deal ? '#ff4d4f' : type === 'dual' ? '#1890ff' : '#52c41a',
            fontWeight: 'bold'
          }}>
            {displayType}
          </span>
        );
      }
    },
    {
      title: 'Category',
      dataIndex: 'category_id',
      key: 'category',
      render: (categoryId: string, record: any) => {
        const category = record.service_categories;
        if (category && typeof category === 'object' && !Array.isArray(category)) {
          return <span style={{ color: '#1890ff', fontWeight: '500' }}>{category.name}</span>;
        }
        // Fallback: find category from categories list
        const cat = categories.find(c => c.id === categoryId);
        return cat ? <span style={{ color: '#1890ff', fontWeight: '500' }}>{cat.name}</span> : '-';
      }
    },
    {
      title: 'Duration',
      dataIndex: 'min_duration_days',
      key: 'min_duration_days',
      render: (days: number) => days ? `${days} days` : '-'
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      render: (currency: string) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {currency || 'KWD'}
        </span>
      )
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number, record: any) => {
        return (
          <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
            {formatPrice(price || 0, 'KWD')}
          </span>
        );
      }
    },
    {
      title: 'Offer Price',
      dataIndex: 'offer_price',
      key: 'offer_price',
      render: (offerPrice: number, record: any) => {
        const showOffer = record.is_flash_deal || record.offer_active;
        if (showOffer && offerPrice != null && Number(offerPrice) !== Number(record.price)) {
          return (
            <span style={{ fontWeight: 'bold', color: record.is_flash_deal ? '#ff4d4f' : '#1890ff' }}>
              {formatPrice(offerPrice, 'KWD')}
            </span>
          );
        }
        return (
          <span style={{ color: '#8c8c8c' }}>
            {formatPrice(record.price || 0, 'KWD')}
          </span>
        );
      }
    },
    {
      title: 'Influencer Share',
      key: 'influencer_payout',
      render: (_: any, record: any) => {
        if (record.service_type === 'dual') {
          const primaryPct = record.primary_influencer_earnings_percentage || 50;
          const invitedPct = record.invited_influencer_earnings_percentage || 50;
          const platformComm = platformSettings?.commission_percentage || 5; // Default to 5% if not set

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>
                <span style={{ fontWeight: '500', color: '#faad14' }}>Platform:</span> {platformComm}%
              </div>
              <div>
                <span style={{ fontWeight: '500', color: '#1890ff' }}>Primary:</span> {primaryPct}%
              </div>
              <div>
                <span style={{ fontWeight: '500', color: '#722ed1' }}>Invited:</span> {invitedPct}%
              </div>
            </div>
          );
        }

        return <span style={{ color: '#8c8c8c' }}>-</span>;
      }
    },
    {
      title: 'Flash Deal',
      dataIndex: 'is_flash_deal',
      key: 'is_flash_deal',
      render: (isFlash: boolean) => (
        <span style={{
          color: isFlash ? '#ff4d4f' : '#8c8c8c',
          fontWeight: 'bold'
        }}>
          {isFlash ? 'Yes' : 'No'}
        </span>
      )
    },
    {
      title: 'Manual offer',
      dataIndex: 'offer_active',
      key: 'offer_active',
      render: (active: boolean, record: any) => (
        <span style={{
          color: active && !record.is_flash_deal ? '#1890ff' : '#8c8c8c',
          fontWeight: 'bold'
        }}>
          {active ? 'Yes' : 'No'}
        </span>
      )
    },
    {
      title: 'Listing status',
      key: 'is_suspended',
      render: (_: unknown, record: any) =>
        record.is_suspended ? (
          <Tag color="red">Suspended</Tag>
        ) : (
          <Tag color="green">Active</Tag>
        ),
    },
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <span>
          <Button icon={<EyeOutlined />} size="small" style={{ marginRight: 8 }} onClick={() => handleViewDetails(record)}>
            View Details
          </Button>
          <ProtectedButton
            permission="services.edit"
            icon={<EditOutlined />}
            size="small"
            style={{ marginRight: 8 }}
            onClick={() => {
              setEditingService(record);
              setEditModalOpen(true);
            }}
          >
            Edit
          </ProtectedButton>
          <Popconfirm
            title={record.is_suspended ? 'Activate this service?' : 'Suspend this service?'}
            description={
              record.is_suspended
                ? 'The service will show as active again in admin lists.'
                : 'The row is kept so bookings and related records stay valid. Use your customer app to hide suspended services from new bookings if needed.'
            }
            onConfirm={() => handleToggleServiceSuspended(record)}
            okText="Yes"
            cancelText="No"
          >
            <ProtectedButton
              permission="services.edit"
              icon={record.is_suspended ? <CheckCircleOutlined /> : <StopOutlined />}
              size="small"
              type={record.is_suspended ? 'primary' : 'default'}
              danger={!record.is_suspended}
            >
              {record.is_suspended ? 'Activate' : 'Suspend'}
            </ProtectedButton>
          </Popconfirm>
        </span>
      ),
    },
  ];

  const filteredServices = services.filter((s) => s.title?.toLowerCase().includes(search.toLowerCase()));

  const handleResetFilters = () => {
    filterForm.resetFields();
    setFilters({
      category_id: undefined,
      service_type: undefined,
      primary_influencer_id: undefined
    });
    setSearch('');
    setCurrentPage(1);
  };

  // Helper to compress and resize image
  async function compressAndResizeImage(file: File, maxSize = 200, quality = 0.7): Promise<{ blob: Blob, type: string, ext: string }> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height *= maxSize / width));
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width *= maxSize / height));
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Use PNG if original is PNG, else JPEG
        const isPng = file.type === 'image/png';
        const outType = isPng ? 'image/png' : 'image/jpeg';
        const outExt = isPng ? '.png' : '.jpg';
        canvas.toBlob(
          (blob) => {
            if (blob) resolve({ blob, type: outType, ext: outExt });
            else reject(new Error('Image compression failed'));
          },
          outType,
          quality
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  return (
    <Card style={{ margin: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Services</Typography.Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <ProtectedButton
            permission="services.create"
            type="primary"
            icon={<AppstoreAddOutlined />}
            onClick={() => {
              setModalOpen(true);
              form.resetFields();
              form.setFieldsValue({ currency: 'KWD' });
              setSelectedCurrency('KWD');
              setIsFlashDeal(false);
            }}
          >
            Add Service
          </ProtectedButton>
        </div>
      </div>

      {/* Filters */}
      <Form form={filterForm} layout="inline">
        <Row gutter={[16, 16]} style={{ marginBottom: 16, width: '100%' }}>
          <Col span={6}>
            <Form.Item name="category_id" style={{ margin: 0, width: '100%' }}>
              <Select
                placeholder="Filter by category"
                style={{ width: '100%' }}
                allowClear
                onChange={(value) => setFilters(prev => ({ ...prev, category_id: value }))}
              >
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="service_type" style={{ margin: 0, width: '100%' }}>
              <Select
                placeholder="Filter by type"
                style={{ width: '100%' }}
                allowClear
                onChange={(value) => setFilters(prev => ({ ...prev, service_type: value }))}
              >
                <Option value="normal">Normal</Option>
                <Option value="dual">Dual</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="search" style={{ margin: 0, width: '100%' }}>
              <Input.Search
                placeholder="Search services"
                allowClear
                style={{ width: '100%' }}
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
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

      {loading ? <Spin size="large" /> : (
        <Table
          columns={columns}
          dataSource={filteredServices}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total: filteredServices.length,
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size || 10); },
            showSizeChanger: true,
          }}
        />
      )}

      {/* Add Modal */}
      <Modal
        title="Add Service"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setThumbnailFile(null); form.resetFields(); }}
        footer={null}
        width={800}
      >
        {formError && <Alert message={formError} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddService}
          initialValues={{ offer_active: false, is_flash_deal: false }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="Title"
                rules={[{ required: true, message: 'Please enter service title' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="service_type"
                label="Service Type"
                rules={[{ required: true, message: 'Please select service type' }]}
              >
                <Select
                  placeholder="Select service type"
                  onChange={(value) => {
                    setSelectedServiceType(value);
                    if (value === 'dual') {
                      // Set default 50/50 split for dual services
                      form.setFieldsValue({
                        primary_influencer_earnings_percentage: 50,
                        invited_influencer_earnings_percentage: 50
                      });
                    } else {
                      // Clear earnings split for non-dual services
                      form.setFieldsValue({
                        primary_influencer_earnings_percentage: undefined,
                        invited_influencer_earnings_percentage: undefined
                      });
                    }
                  }}
                >
                  <Option value="normal">Normal</Option>
                  <Option value="dual">Dual</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter service description' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="min_duration_days"
                label="Minimum Duration (Days)"
                rules={[
                  { required: true, message: 'Please enter minimum duration' },
                  { type: 'number', min: 2, message: 'Minimum duration must be greater than 1 day' }
                ]}
              >
                <InputNumber min={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category_id"
                label="Category"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select placeholder="Select category">
                  {categories.map(cat => (
                    <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider>Offers &amp; flash deal</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="offer_active"
                label="Manual offer active"
                valuePropName="checked"
                tooltip={
                  addFlashWatch
                    ? MSG_FLASH_BLOCKS_OFFER
                    : 'Uses discounted offer price. Cannot be on while flash deal is on.'
                }
              >
                <Switch
                  disabled={!!addFlashWatch}
                  onChange={(checked) => {
                    if (checked) {
                      form.setFieldValue('is_flash_deal', false);
                      setIsFlashDeal(false);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_flash_deal"
                label="Is Flash Deal"
                valuePropName="checked"
                tooltip={addOfferWatch ? MSG_OFFER_BLOCKS_FLASH : undefined}
              >
                <Switch
                  disabled={!!addOfferWatch}
                  onChange={(checked) => {
                    setIsFlashDeal(checked);
                    if (checked) {
                      form.setFieldValue('offer_active', false);
                    }
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {addFlashWatch ? (
            <>
              <Divider>Flash deal dates</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="flash_from"
                    label="Flash Deal From"
                    rules={[
                      { required: true, message: 'Please select flash deal start date' },
                      {
                        validator: (_, value) => {
                          if (!value) {
                            return Promise.reject(new Error('Please select flash deal start date'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD HH:mm"
                      placeholder="Select start date and time"
                      showNow={false}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="flash_to"
                    label="Flash Deal To"
                    rules={[
                      { required: true, message: 'Please select flash deal end date' },
                      {
                        validator: (_, value) => {
                          if (!value) {
                            return Promise.reject(new Error('Please select flash deal end date'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD HH:mm"
                      placeholder="Select end date and time"
                      showNow={false}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          ) : null}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="currency"
                label="Currency"
                rules={[{ required: true, message: 'Please select currency' }]}
              >
                <Select
                  placeholder="Select currency"
                  value={selectedCurrency}
                  onChange={(value) => setSelectedCurrency(value)}
                >
                  {currencyOptions.map(option => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={showAddDiscount ? 8 : 16}>
              <Form.Item
                name="price"
                label={`Price (${getCurrencySymbol(selectedCurrency)})`}
                rules={[{ required: true, message: 'Please enter price' }]}
              >
                <InputNumber
                  min={0.101}
                  step={0.001}
                  style={{ width: '100%' }}
                  formatter={value => `${getCurrencySymbol(selectedCurrency)} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={
                    ((value: string | undefined) =>
                      value
                        ? parseFloat(value.replace(new RegExp(`\\${getCurrencySymbol(selectedCurrency)}\\s?|(,*)`, 'g'), ''))
                        : 0) as NonNullable<React.ComponentProps<typeof InputNumber>['parser']>
                  }
                />
              </Form.Item>
            </Col>
            {showAddDiscount && (
              <Col span={8}>
                <Form.Item
                  name="discount_percentage"
                  label="Discount %"
                  tooltip="Shown when manual offer or flash deal is on. Final charge = price × (1 − discount%)."
                  validateTrigger={['onChange', 'onBlur']}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const v = value ?? 0;
                        if (getFieldValue('is_flash_deal') && (!v || v <= 0)) {
                          return Promise.reject(new Error('Enter a discount % for flash deals'));
                        }
                        if (getFieldValue('offer_active') && (!v || v <= 0)) {
                          return Promise.reject(new Error('Enter a discount % when manual offer is active'));
                        }
                        if (v > 99) {
                          return Promise.reject(new Error('Max discount is 99%'));
                        }
                        return Promise.resolve();
                      }
                    })
                  ]}
                >
                  <InputNumber
                    min={0}
                    step={1}
                    precision={0}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="primary_influencer_id"
                label="Primary Influencer"
                rules={[{ required: true, message: 'Please select primary influencer' }]}
              >
                <Select
                  placeholder="Select primary influencer"
                  showSearch
                  optionFilterProp="label"
                  filterOption={(input, option) => {
                    const searchText = input.toLowerCase();
                    const influencer = influencers.find(inf => inf.id === option?.value);
                    if (!influencer) return false;

                    const name = influencer.name?.toLowerCase() || '';
                    const email = influencer.email?.toLowerCase() || '';
                    const country = influencer.country?.toLowerCase() || '';

                    return name.includes(searchText) ||
                      email.includes(searchText) ||
                      country.includes(searchText);
                  }}
                  onChange={(value) => handleInfluencerChange(value, false)}
                >
                  {influencers.map(influencer => (
                    <Option
                      key={influencer.id}
                      value={influencer.id}
                      label={`${influencer.name || ''} ${influencer.email || ''} ${influencer.country || ''}`}
                    >
                      {influencer.name} ({influencer.email}) {influencer.country ? `- ${influencer.country}` : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              {selectedServiceType === 'dual' && (
                <Form.Item
                  name="invited_influencer_id"
                  label="Invited Influencer"
                  rules={[
                    { required: true, message: 'Invited influencer is required for dual services' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (value && value === getFieldValue('primary_influencer_id')) {
                          return Promise.reject(new Error('Must differ from primary influencer'));
                        }
                        return Promise.resolve();
                      }
                    })
                  ]}
                >
                  <Select
                    placeholder="Select invited influencer"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    filterOption={(input, option) => {
                      const searchText = input.toLowerCase();
                      const influencer = influencers.find(inf => inf.id === option?.value);
                      if (!influencer) return false;

                      const name = influencer.name?.toLowerCase() || '';
                      const email = influencer.email?.toLowerCase() || '';
                      const country = influencer.country?.toLowerCase() || '';

                      return name.includes(searchText) ||
                        email.includes(searchText) ||
                        country.includes(searchText);
                    }}
                  >
                    {influencers.map(influencer => (
                      <Option
                        key={influencer.id}
                        value={influencer.id}
                        label={`${influencer.name || ''} ${influencer.email || ''} ${influencer.country || ''}`}
                      >
                        {influencer.name} ({influencer.email})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Col>
          </Row>

          {selectedServiceType === 'dual' && (
            <>
              <Divider>Earnings Split</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="primary_influencer_earnings_percentage"
                    label="Primary Influencer Earnings (%)"
                    rules={[
                      { required: true, message: 'Please enter primary influencer earnings percentage' },
                      { type: 'number', min: 0, max: 100, message: 'Percentage must be between 0 and 100' },
                      {
                        validator: (_, value) => {
                          const invitedPercentage = form.getFieldValue('invited_influencer_earnings_percentage') || 0;
                          const total = (value || 0) + invitedPercentage;
                          if (total !== 100) {
                            return Promise.reject(new Error(`Total must equal 100%. Current total: ${total}%`));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                    tooltip="Percentage of earnings for the primary influencer. Must sum to 100% with invited influencer percentage."
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.01}
                      style={{ width: '100%' }}
                      placeholder="e.g., 60"
                      suffix="%"
                      onChange={() => {
                        // Trigger validation for invited influencer percentage
                        form.validateFields(['invited_influencer_earnings_percentage']);
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="invited_influencer_earnings_percentage"
                    label="Invited Influencer Earnings (%)"
                    rules={[
                      { required: true, message: 'Please enter invited influencer earnings percentage' },
                      { type: 'number', min: 0, max: 100, message: 'Percentage must be between 0 and 100' },
                      {
                        validator: (_, value) => {
                          const primaryPercentage = form.getFieldValue('primary_influencer_earnings_percentage') || 0;
                          const total = primaryPercentage + (value || 0);
                          if (total !== 100) {
                            return Promise.reject(new Error(`Total must equal 100%. Current total: ${total}%`));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                    tooltip="Percentage of earnings for the invited influencer. Must sum to 100% with primary influencer percentage."
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.01}
                      style={{ width: '100%' }}
                      placeholder="e.g., 40"
                      suffix="%"
                      onChange={() => {
                        // Trigger validation for primary influencer percentage
                        form.validateFields(['primary_influencer_earnings_percentage']);
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="platform_id"
                label="Platforms"
                rules={[{ required: true, message: 'Please select platforms' }]}
              >
                <Select
                  placeholder="Select platform"
                  mode="multiple"
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {platforms.map(platform => (
                    <Option key={platform.id} value={platform.id}>
                      {platform.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="location_required"
                label="Location Required"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          {selectedServiceType === 'dual' && (
            <Form.Item
              name="about_us"
              label="About Us"
              rules={[{ required: true, message: 'About Us is required for dual services' }]}
            >
              <TextArea rows={3} />
            </Form.Item>
          )}

          <Form.Item
            label="Thumbnail"
            required
            validateTrigger={['onChange', 'onBlur']}
            rules={[
              {
                validator: async () => {
                  if (!thumbnailFile) {
                    throw new Error('Thumbnail is required');
                  }
                }
              }
            ]}
          >
            <Upload
              accept="image/jpeg,image/png"
              showUploadList={false}
              beforeUpload={async (file) => {
                if (!file.type.startsWith('image/')) {
                  message.error('Only image files are allowed.');
                  return false;
                }
                // Compress and resize
                try {
                  const { blob, type, ext } = await compressAndResizeImage(file, 200, 0.7);
                  if (blob.size > 500 * 1024) {
                    message.error('Thumbnail must be less than 500KB after compression.');
                    return false;
                  }
                  setThumbnailFile(new File([blob], file.name.replace(/\.[^.]+$/, ext), { type }));
                  // trigger inline validation immediately
                  form.validateFields().catch(() => {});
                } catch (err) {
                  message.error('Failed to process image.');
                  return false;
                }
                return false;
              }}
              style={{ marginTop: 8 }}
            >
              <Button icon={<UploadOutlined />}>Upload Thumbnail</Button>
            </Upload>
            {thumbnailFile && <div style={{ marginTop: 8 }}><img src={URL.createObjectURL(thumbnailFile)} alt="thumbnail" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '4px' }} /></div>}
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={formLoading}>Add</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Service"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingService(null);
          editForm.resetFields();
          setEditThumbnailFile(null);
        }}
        footer={null}
        width={800}
      >
        {editFormError && <Alert message={editFormError} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form
          key={editingService?.id || 'new'}
          form={editForm}
          layout="vertical"
          onFinish={handleEditService}
          initialValues={editingService ? (() => {
            const p = Number(editingService.price);
            const o = Number(editingService.offer_price);
            const discountPct =
              p > 0 && o < p && o > 0 ? Number((((1 - o / p) * 100).toFixed(3))) : 0;
            return {
            title: editingService.title,
            description: editingService.description,
            thumbnail: editingService.thumbnail,
            min_duration_days: editingService.min_duration_days,
            is_flash_deal: editingService.is_flash_deal,
            offer_active: !!editingService.offer_active,
            flash_from: editingService.flash_from ? dayjs(editingService.flash_from) : null,
            flash_to: editingService.flash_to ? dayjs(editingService.flash_to) : null,
            location_required: editingService.location_required,
            about_us: editingService.about_us,
            service_type: editingService.service_type,
            primary_influencer_id: editingService.primary_influencer_id,
            invited_influencer_id: editingService.invited_influencer_id,
            category_id: editingService.category_id,
            platform_id: editingService.platform_ids || editingService.platform_id,
            price: editingService.price,
            discount_percentage: discountPct,
            currency: editingService.currency || 'KWD',
            primary_influencer_earnings_percentage: editingService.primary_influencer_earnings_percentage || 50,
            invited_influencer_earnings_percentage: editingService.invited_influencer_earnings_percentage || 50
          };
          })() : {}}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please enter service title' }]}>
                <Input autoFocus />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="service_type" label="Service Type" rules={[{ required: true, message: 'Please select service type' }]}>
                <Select
                  placeholder="Select service type"
                  onChange={(value) => {
                    setSelectedServiceType(value);
                    if (value === 'dual') {
                      // Set default 50/50 split for dual services if not already set
                      const currentPrimary = editForm.getFieldValue('primary_influencer_earnings_percentage');
                      const currentInvited = editForm.getFieldValue('invited_influencer_earnings_percentage');
                      if (!currentPrimary || !currentInvited) {
                        editForm.setFieldsValue({
                          primary_influencer_earnings_percentage: 50,
                          invited_influencer_earnings_percentage: 50
                        });
                      }
                    } else {
                      // Clear earnings split for non-dual services
                      editForm.setFieldsValue({
                        primary_influencer_earnings_percentage: undefined,
                        invited_influencer_earnings_percentage: undefined
                      });
                    }
                  }}
                >
                  <Option value="normal">Normal</Option>
                  <Option value="dual">Dual</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please enter service description' }]}>
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="min_duration_days"
                label="Minimum Duration (Days)"
                rules={[
                  { required: true, message: 'Please enter minimum duration' },
                  { type: 'number', min: 2, message: 'Minimum duration must be greater than 1 day' }
                ]}
              >
                <InputNumber min={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category_id" label="Category" rules={[{ required: true, message: 'Please select category' }]}>
                <Select placeholder="Select category">
                  {categories.map(cat => (
                    <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider>Offers &amp; flash deal</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="offer_active"
                label="Manual offer active"
                valuePropName="checked"
                tooltip={
                  editFlashWatch
                    ? MSG_FLASH_BLOCKS_OFFER
                    : 'Uses discounted offer price. Cannot be on while flash deal is on.'
                }
              >
                <Switch
                  disabled={!!editFlashWatch}
                  onChange={(checked) => {
                    if (checked) {
                      editForm.setFieldValue('is_flash_deal', false);
                      setEditIsFlashDeal(false);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_flash_deal"
                label="Is Flash Deal"
                valuePropName="checked"
                tooltip={editOfferWatch ? MSG_OFFER_BLOCKS_FLASH : undefined}
              >
                <Switch
                  disabled={!!editOfferWatch}
                  onChange={(checked) => {
                    setEditIsFlashDeal(checked);
                    if (checked) {
                      editForm.setFieldValue('offer_active', false);
                    }
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {editFlashWatch ? (
            <>
              <Divider>Flash deal dates</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="flash_from"
                    label="Flash Deal From"
                    rules={[
                      { required: true, message: 'Please select flash deal start date' },
                      {
                        validator: (_, value) => {
                          if (!value) {
                            return Promise.reject(new Error('Please select flash deal start date'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD HH:mm"
                      placeholder="Select start date and time"
                      showNow={false}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="flash_to"
                    label="Flash Deal To"
                    rules={[
                      { required: true, message: 'Please select flash deal end date' },
                      {
                        validator: (_, value) => {
                          if (!value) {
                            return Promise.reject(new Error('Please select flash deal end date'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD HH:mm"
                      placeholder="Select end date and time"
                      showNow={false}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          ) : null}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="currency"
                label="Currency"
                rules={[{ required: true, message: 'Please select currency' }]}
              >
                <Select
                  placeholder="Select currency"
                  value={editSelectedCurrency}
                  onChange={(value) => setEditSelectedCurrency(value)}
                >
                  {currencyOptions.map(option => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={showEditDiscount ? 8 : 16}>
              <Form.Item
                name="price"
                label={`Price (${getCurrencySymbol(editSelectedCurrency)})`}
                rules={[{ required: true, message: 'Please enter price' }]}
              >
                <InputNumber
                  min={0.101}
                  step={0.001}
                  style={{ width: '100%' }}
                  formatter={value => `${getCurrencySymbol(editSelectedCurrency)} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={
                    ((value: string | undefined) =>
                      value
                        ? parseFloat(value.replace(new RegExp(`\\${getCurrencySymbol(editSelectedCurrency)}\\s?|(,*)`, 'g'), ''))
                        : 0) as NonNullable<React.ComponentProps<typeof InputNumber>['parser']>
                  }
                />
              </Form.Item>
            </Col>
            {showEditDiscount && (
              <Col span={8}>
                <Form.Item
                  name="discount_percentage"
                  label="Discount %"
                  tooltip="Shown when manual offer or flash deal is on. Final charge = price × (1 − discount%)."
                  validateTrigger={['onChange', 'onBlur']}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const v = value ?? 0;
                        if (getFieldValue('is_flash_deal') && (!v || v <= 0)) {
                          return Promise.reject(new Error('Enter a discount % for flash deals'));
                        }
                        if (getFieldValue('offer_active') && (!v || v <= 0)) {
                          return Promise.reject(new Error('Enter a discount % when manual offer is active'));
                        }
                        if (v > 99) {
                          return Promise.reject(new Error('Max discount is 99%'));
                        }
                        return Promise.resolve();
                      }
                    })
                  ]}
                >
                  <InputNumber
                    min={0}
                    step={1}
                    precision={0}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="primary_influencer_id" label="Primary Influencer" rules={[{ required: true, message: 'Please select primary influencer' }]}>
                <Select
                  placeholder="Select primary influencer"
                  showSearch
                  optionFilterProp="label"
                  filterOption={(input, option) => {
                    const searchText = input.toLowerCase();
                    const influencer = influencers.find(inf => inf.id === option?.value);
                    if (!influencer) return false;

                    const name = influencer.name?.toLowerCase() || '';
                    const email = influencer.email?.toLowerCase() || '';
                    const country = influencer.country?.toLowerCase() || '';

                    return name.includes(searchText) ||
                      email.includes(searchText) ||
                      country.includes(searchText);
                  }}
                  onChange={(value) => handleInfluencerChange(value, true)}
                >
                  {influencers.map(influencer => (
                    <Option
                      key={influencer.id}
                      value={influencer.id}
                      label={`${influencer.name || ''} ${influencer.email || ''} ${influencer.country || ''}`}
                    >
                      {influencer.name} ({influencer.email}) {influencer.country ? `- ${influencer.country}` : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              {selectedServiceType === 'dual' && (
                <Form.Item
                  name="invited_influencer_id"
                  label="Invited Influencer"
                  rules={[
                    { required: true, message: 'Invited influencer is required for dual services' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (value && value === getFieldValue('primary_influencer_id')) {
                          return Promise.reject(new Error('Must differ from primary influencer'));
                        }
                        return Promise.resolve();
                      }
                    })
                  ]}
                >
                  <Select
                    placeholder="Select invited influencer"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    filterOption={(input, option) => {
                      const searchText = input.toLowerCase();
                      const influencer = influencers.find(inf => inf.id === option?.value);
                      if (!influencer) return false;

                      const name = influencer.name?.toLowerCase() || '';
                      const email = influencer.email?.toLowerCase() || '';
                      const country = influencer.country?.toLowerCase() || '';

                      return name.includes(searchText) ||
                        email.includes(searchText) ||
                        country.includes(searchText);
                    }}
                  >
                    {influencers.map(influencer => (
                      <Option
                        key={influencer.id}
                        value={influencer.id}
                        label={`${influencer.name || ''} ${influencer.email || ''} ${influencer.country || ''}`}
                      >
                        {influencer.name} ({influencer.email})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Col>
          </Row>

          {selectedServiceType === 'dual' && (
            <>
              <Divider>Earnings Split</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="primary_influencer_earnings_percentage"
                    label="Primary Influencer Earnings (%)"
                    rules={[
                      { required: true, message: 'Please enter primary influencer earnings percentage' },
                      { type: 'number', min: 0, max: 100, message: 'Percentage must be between 0 and 100' },
                      {
                        validator: (_, value) => {
                          const invitedPercentage = editForm.getFieldValue('invited_influencer_earnings_percentage') || 0;
                          const total = (value || 0) + invitedPercentage;
                          if (total !== 100) {
                            return Promise.reject(new Error(`Total must equal 100%. Current total: ${total}%`));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                    tooltip="Percentage of earnings for the primary influencer. Must sum to 100% with invited influencer percentage."
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.01}
                      style={{ width: '100%' }}
                      placeholder="e.g., 60"
                      suffix="%"
                      onChange={() => {
                        // Trigger validation for invited influencer percentage
                        editForm.validateFields(['invited_influencer_earnings_percentage']);
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="invited_influencer_earnings_percentage"
                    label="Invited Influencer Earnings (%)"
                    rules={[
                      { required: true, message: 'Please enter invited influencer earnings percentage' },
                      { type: 'number', min: 0, max: 100, message: 'Percentage must be between 0 and 100' },
                      {
                        validator: (_, value) => {
                          const primaryPercentage = editForm.getFieldValue('primary_influencer_earnings_percentage') || 0;
                          const total = primaryPercentage + (value || 0);
                          if (total !== 100) {
                            return Promise.reject(new Error(`Total must equal 100%. Current total: ${total}%`));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                    tooltip="Percentage of earnings for the invited influencer. Must sum to 100% with primary influencer percentage."
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.01}
                      style={{ width: '100%' }}
                      placeholder="e.g., 40"
                      suffix="%"
                      onChange={() => {
                        // Trigger validation for primary influencer percentage
                        editForm.validateFields(['primary_influencer_earnings_percentage']);
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="platform_id" label="Platforms" rules={[{ required: true, message: 'Please select platforms' }]}>
                <Select
                  placeholder="Select platform"
                  mode="multiple"
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {platforms.map(platform => (
                    <Option key={platform.id} value={platform.id}>
                      {platform.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location_required" label="Location Required" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          {selectedServiceType === 'dual' && (
            <Form.Item
              name="about_us"
              label="About Us"
              rules={[{ required: true, message: 'About Us is required for dual services' }]}
            >
              <TextArea rows={3} />
            </Form.Item>
          )}

          <Form.Item
            label="Thumbnail"
            required
            validateTrigger={['onChange', 'onBlur']}
            rules={[
              {
                validator: async () => {
                  if (!editThumbnailFile && !editForm.getFieldValue('thumbnail')) {
                    throw new Error('Thumbnail is required');
                  }
                }
              }
            ]}
          >
            <Upload
              accept="image/jpeg,image/png"
              showUploadList={false}
              beforeUpload={async (file) => {
                if (!file.type.startsWith('image/')) {
                  message.error('Only image files are allowed.');
                  return false;
                }
                // Compress and resize
                try {
                  const { blob, type, ext } = await compressAndResizeImage(file, 200, 0.7);
                  if (blob.size > 500 * 1024) {
                    message.error('Thumbnail must be less than 500KB after compression.');
                    return false;
                  }
                  setEditThumbnailFile(new File([blob], file.name.replace(/\.[^.]+$/, ext), { type }));
                  // trigger inline validation immediately
                  editForm.validateFields().catch(() => {});
                } catch (err) {
                  message.error('Failed to process image.');
                  return false;
                }
                return false;
              }}
              style={{ marginTop: 8 }}
            >
              <Button icon={<UploadOutlined />}>Upload Thumbnail</Button>
            </Upload>
            {(editThumbnailFile || editForm.getFieldValue('thumbnail')) && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={editThumbnailFile ? URL.createObjectURL(editThumbnailFile) : editForm.getFieldValue('thumbnail')}
                  alt="thumbnail"
                  style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '4px' }}
                />
              </div>
            )}
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={editFormLoading}>Update</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Service Details Drawer */}
      <Drawer
        title="Service Details"
        placement="right"
        width={600}
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedServiceDetails(null);
          setServiceBookings([]);
        }}
      >
        {selectedServiceDetails && (
          <div>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Title">
                {selectedServiceDetails.title}
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {selectedServiceDetails.description || 'No description'}
              </Descriptions.Item>
              <Descriptions.Item label="Service Type">
                <span style={{
                  color: selectedServiceDetails.service_type === 'flash' ? '#ff4d4f' : selectedServiceDetails.service_type === 'dual' ? '#1890ff' : '#52c41a',
                  fontWeight: 'bold'
                }}>
                  {selectedServiceDetails.service_type?.toUpperCase() || '-'}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Listing status">
                {selectedServiceDetails.is_suspended ? (
                  <Tag color="red">Suspended</Tag>
                ) : (
                  <Tag color="green">Active</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                {selectedServiceDetails.service_categories?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Price">
                {selectedServiceDetails.price ? `${getCurrencySymbol(selectedServiceDetails.currency || 'KWD')} ${selectedServiceDetails.price}` : '-'}
              </Descriptions.Item>
              {(selectedServiceDetails.is_flash_deal || selectedServiceDetails.offer_active) && (
                <Descriptions.Item label={selectedServiceDetails.is_flash_deal ? 'Flash deal offer price' : 'Manual offer price'}>
                  {selectedServiceDetails.offer_price ? `${getCurrencySymbol(selectedServiceDetails.currency || 'KWD')} ${selectedServiceDetails.offer_price}` : '-'}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Minimum Duration">
                {selectedServiceDetails.min_duration_days} days
              </Descriptions.Item>
              <Descriptions.Item label="Location Required">
                {selectedServiceDetails.location_required ? 'Yes' : 'No'}
              </Descriptions.Item>
              <Descriptions.Item label="Flash Deal">
                {selectedServiceDetails.is_flash_deal ? 'Yes' : 'No'}
              </Descriptions.Item>
              <Descriptions.Item label="Manual offer active">
                {selectedServiceDetails.offer_active ? 'Yes' : 'No'}
              </Descriptions.Item>
              {selectedServiceDetails.flash_from && (
                <Descriptions.Item label="Flash Deal From">
                  {dayjs(selectedServiceDetails.flash_from).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
              {selectedServiceDetails.flash_to && (
                <Descriptions.Item label="Flash Deal To">
                  {dayjs(selectedServiceDetails.flash_to).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Service Created At">
                {dayjs(selectedServiceDetails.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Bookings</Divider>

            {bookingsLoading ? (
              <Spin />
            ) : serviceBookings.length > 0 ? (
              <div>
                <Typography.Title level={5}>Booking Created At</Typography.Title>
                <Table
                  dataSource={serviceBookings}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Booking ID',
                      dataIndex: 'id',
                      key: 'id',
                      render: (id: string) => <Typography.Text code>{id.substring(0, 8)}...</Typography.Text>
                    },
                    {
                      title: 'Created At',
                      dataIndex: 'created_at',
                      key: 'created_at',
                      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
                    },
                    {
                      title: 'Status',
                      key: 'status',
                      render: (record: any) => {
                        const statusName = record.booking_statuses?.name || '-';
                        return (
                          <Tag color={statusName === 'completed' ? 'green' : statusName === 'cancelled' ? 'red' : 'blue'}>
                            {statusName}
                          </Tag>
                        );
                      }
                    }
                  ]}
                />
              </div>
            ) : (
              <Typography.Text type="secondary">No bookings found for this service</Typography.Text>
            )}
          </div>
        )}
      </Drawer>
    </Card>
  );
} 