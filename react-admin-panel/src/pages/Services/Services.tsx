import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Modal, Form, Input, Alert, Spin, message, Popconfirm, Upload, Select, Switch, DatePicker, InputNumber, Divider, Row, Col } from 'antd';
import { AppstoreAddOutlined, EditOutlined, DeleteOutlined, UploadOutlined, ReloadOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';
import dayjs from 'dayjs';
import { getCurrencyByCountry, getCurrencySymbol, formatPrice } from '@/utils/currencyUtils';

// Currency options for dropdown
const currencyOptions = [
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

const { TextArea } = Input;
const { Option } = Select;

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [filterForm] = Form.useForm();
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
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [editSelectedCurrency, setEditSelectedCurrency] = useState<string>('USD');
  const [filters, setFilters] = useState({
    category_id: undefined,
    service_type: undefined,
    primary_influencer_id: undefined
  });



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

  useEffect(() => { 
    console.log('🚀 Services component mounted, fetching data...');
    fetchServices(); 
    fetchCategories();
    fetchInfluencers();
    fetchPlatforms();
  }, [modalOpen, editModalOpen, filters]);

  // Set form values when editing service changes
  useEffect(() => {
    if (editingService && editModalOpen) {
      editForm.resetFields();
      editForm.setFieldsValue({
        title: editingService.title,
        description: editingService.description,
        thumbnail: editingService.thumbnail,
        min_duration_days: editingService.min_duration_days,
        is_flash_deal: editingService.is_flash_deal,
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
        offer_price: editingService.offer_price,
        currency: editingService.currency || 'USD'
      });
      setEditIsFlashDeal(editingService.is_flash_deal);
      setEditSelectedCurrency(editingService.currency || 'USD');
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
      
      // Set offer_price based on service type and flash deal status
      let offerPrice = values.price;
      if (values.is_flash_deal && values.offer_price) {
        offerPrice = values.offer_price;
      }

      const serviceData = {
        title: values.title,
        description: values.description,
        thumbnail,
        min_duration_days: values.min_duration_days,
        is_flash_deal: values.is_flash_deal || false,
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
        commission_percentage: values.commission_percentage || 0,
        payment_gateway_charge_card_percentage: values.payment_gateway_charge_card_percentage || 0,
        payment_gateway_charge_knet_percentage: values.payment_gateway_charge_knet_percentage || 0,
        created_at: new Date().toISOString(),
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
      let thumbnail = values.thumbnail;
      if (editThumbnailFile) {
        const filePath = `thumbnails/${Date.now()}-${editThumbnailFile.name}`;
        const { error: uploadError } = await supabase.storage.from('services').upload(filePath, editThumbnailFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('services').getPublicUrl(filePath);
        thumbnail = publicUrlData?.publicUrl;
      }
      
      // Handle flash deal to normal transition
      let flashFrom = null;
      let flashTo = null;
      let offerPrice = values.price;
      
      if (values.is_flash_deal) {
        // If it's a flash deal, set the flash dates and offer price
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
        
        if (values.offer_price) {
          offerPrice = values.offer_price;
        }
      } else {
        // If it's not a flash deal, clear flash dates and set offer price to regular price
        flashFrom = null;
        flashTo = null;
        offerPrice = values.price;
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
        is_flash_deal: values.is_flash_deal || false,
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
        commission_percentage: values.commission_percentage || 0,
        payment_gateway_charge_card_percentage: values.payment_gateway_charge_card_percentage || 0,
        payment_gateway_charge_knet_percentage: values.payment_gateway_charge_knet_percentage || 0,
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

  // Delete Service handler
  const handleDeleteService = async (id: string) => {
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      message.success('Service deleted!');
      fetchServices();
    } catch (err: any) {
      message.error(err.message || 'Failed to delete service');
    }
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
      render: (type: string) => (
        <span style={{ 
          color: type === 'flash' ? '#ff4d4f' : type === 'dual' ? '#1890ff' : '#52c41a',
          fontWeight: 'bold'
        }}>
          {type?.toUpperCase() || '-'}
        </span>
      )
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
          {currency || 'USD'}
        </span>
      )
    },
    { 
      title: 'Price', 
      dataIndex: 'price', 
      key: 'price',
      render: (price: number, record: any) => {
        const currency = record.currency || 'USD';
        const symbol = getCurrencySymbol(currency);
        return (
          <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
            {formatPrice(price || 0, currency)}
          </span>
        );
      }
    },
    { 
      title: 'Offer Price', 
      dataIndex: 'offer_price', 
      key: 'offer_price',
      render: (offerPrice: number, record: any) => {
        const currency = record.currency || 'USD';
        if (record.is_flash_deal && offerPrice) {
          return (
            <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
              {formatPrice(offerPrice, currency)}
            </span>
          );
        }
        return (
          <span style={{ color: '#8c8c8c' }}>
            {formatPrice(record.price || 0, currency)}
          </span>
        );
      }
    },
    { 
      title: 'Commission', 
      key: 'commission',
      render: (_: any, record: any) => {
        const currency = record.currency || 'USD';
        const servicePrice = (record.is_flash_deal && record.offer_price) ? record.offer_price : (record.price || 0);
        const commissionPercentage = record.commission_percentage || 0;
        const commissionAmount = (servicePrice * commissionPercentage) / 100;
        return (
          <div>
            <div style={{ fontWeight: 'bold', color: '#ff9800' }}>
              {formatPrice(commissionAmount, currency)}
            </div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
              ({commissionPercentage}%)
            </div>
          </div>
        );
      }
    },
    { 
      title: 'Card Charge', 
      key: 'payment_gateway_charge_card',
      render: (_: any, record: any) => {
        const currency = record.currency || 'USD';
        const servicePrice = (record.is_flash_deal && record.offer_price) ? record.offer_price : (record.price || 0);
        const cardChargePercentage = record.payment_gateway_charge_card_percentage || 0;
        const cardChargeAmount = (servicePrice * cardChargePercentage) / 100;
        return (
          <div>
            <div style={{ fontWeight: 'bold', color: '#f44336' }}>
              {formatPrice(cardChargeAmount, currency)}
            </div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
              Card ({cardChargePercentage}%)
            </div>
          </div>
        );
      }
    },
    { 
      title: 'KNET Charge', 
      key: 'payment_gateway_charge_knet',
      render: (_: any, record: any) => {
        const currency = record.currency || 'USD';
        const servicePrice = (record.is_flash_deal && record.offer_price) ? record.offer_price : (record.price || 0);
        const knetChargePercentage = record.payment_gateway_charge_knet_percentage || 0;
        const knetChargeAmount = (servicePrice * knetChargePercentage) / 100;
        return (
          <div>
            <div style={{ fontWeight: 'bold', color: '#ff9800' }}>
              {formatPrice(knetChargeAmount, currency)}
            </div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
              KNET ({knetChargePercentage}%)
            </div>
          </div>
        );
      }
    },
    { 
      title: 'Influencer Payout', 
      key: 'influencer_payout',
      render: (_: any, record: any) => {
        const currency = record.currency || 'USD';
        const servicePrice = (record.is_flash_deal && record.offer_price) ? record.offer_price : (record.price || 0);
        const commissionPercentage = record.commission_percentage || 0;
        const cardChargePercentage = record.payment_gateway_charge_card_percentage || 0;
        const knetChargePercentage = record.payment_gateway_charge_knet_percentage || 0;
        const commissionAmount = (servicePrice * commissionPercentage) / 100;
        const cardChargeAmount = (servicePrice * cardChargePercentage) / 100;
        const knetChargeAmount = (servicePrice * knetChargePercentage) / 100;
        
        // Calculate payout for both payment methods
        const payoutWithCard = servicePrice - commissionAmount - cardChargeAmount;
        const payoutWithKnet = servicePrice - commissionAmount - knetChargeAmount;
        
        // Show range if charges differ, otherwise show single value
        const chargesDiffer = cardChargePercentage !== knetChargePercentage;
        
        return (
          <div>
            {chargesDiffer ? (
              <>
                <div style={{ fontWeight: 'bold', color: '#4caf50', fontSize: '13px' }}>
                  {formatPrice(Math.min(payoutWithCard, payoutWithKnet), currency)} - {formatPrice(Math.max(payoutWithCard, payoutWithKnet), currency)}
                </div>
                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>
                  Card: {formatPrice(payoutWithCard, currency)} | KNET: {formatPrice(payoutWithKnet, currency)}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 'bold', color: '#4caf50', fontSize: '14px' }}>
                  {formatPrice(payoutWithCard, currency)}
                </div>
                <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                  Net payout
                </div>
              </>
            )}
          </div>
        );
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
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <span>
          <Button icon={<EditOutlined />} size="small" style={{ marginRight: 8 }} onClick={() => {
            setEditingService(record);
            setEditModalOpen(true);
          }}>Edit</Button>
          <Popconfirm title="Delete this service?" onConfirm={() => handleDeleteService(record.id)} okText="Yes" cancelText="No">
            <Button icon={<DeleteOutlined />} size="small" danger>Delete</Button>
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
          <Button type="primary" icon={<AppstoreAddOutlined />} onClick={() => { 
            setModalOpen(true); 
            form.resetFields(); 
            setIsFlashDeal(false);
          }}>
            Add Service
          </Button>
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
                <Option value="flash">Flash</Option>
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
        <Form form={form} layout="vertical" onFinish={handleAddService}>
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
                  onChange={(value) => setSelectedServiceType(value)}
                >
                  <Option value="normal">Normal</Option>
                  <Option value="dual">Dual</Option>
                  <Option value="flash">Flash</Option>
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
                rules={[{ required: true, message: 'Please enter minimum duration' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
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
            <Col span={8}>
              <Form.Item
                name="price"
                label={`Price (${getCurrencySymbol(selectedCurrency)})`}
                rules={[{ required: true, message: 'Please enter price' }]}
              >
                <InputNumber 
                  min={0} 
                  step={0.01} 
                  style={{ width: '100%' }} 
                  formatter={value => `${getCurrencySymbol(selectedCurrency)} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(new RegExp(`\\${getCurrencySymbol(selectedCurrency)}\\s?|(,*)`, 'g'), '')}
                  onChange={(value) => {
                    // Auto-update offer price for normal/duo services
                    if (!isFlashDeal && value) {
                      form.setFieldsValue({ offer_price: value });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="offer_price"
                label={`Offer Price (${getCurrencySymbol(selectedCurrency)})`}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (getFieldValue('is_flash_deal') && !value) {
                        return Promise.reject(new Error('Please enter offer price for flash deals'));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber 
                  min={0} 
                  step={0.01} 
                  style={{ width: '100%' }} 
                  disabled={!isFlashDeal}
                  formatter={value => `${getCurrencySymbol(selectedCurrency)} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(new RegExp(`\\${getCurrencySymbol(selectedCurrency)}\\s?|(,*)`, 'g'), '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Charges & Fees</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="commission_percentage"
                label="Commission Percentage (%)"
                rules={[
                  { required: false },
                  { type: 'number', min: 0, max: 100, message: 'Commission must be between 0 and 100' }
                ]}
                tooltip="Platform commission percentage deducted from service price"
              >
                <InputNumber 
                  min={0} 
                  max={100}
                  step={0.01} 
                  style={{ width: '100%' }} 
                  placeholder="e.g., 10.5"
                  suffix="%"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="payment_gateway_charge_card_percentage"
                label="Card Payment Charge (%)"
                rules={[
                  { required: false },
                  { type: 'number', min: 0, max: 100, message: 'Card charge must be between 0 and 100' }
                ]}
                tooltip="Payment gateway charge percentage for card payments (Visa, Mastercard, etc.)"
              >
                <InputNumber 
                  min={0} 
                  max={100}
                  step={0.01} 
                  style={{ width: '100%' }} 
                  placeholder="e.g., 2.9"
                  suffix="%"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="payment_gateway_charge_knet_percentage"
                label="KNET Payment Charge (%)"
                rules={[
                  { required: false },
                  { type: 'number', min: 0, max: 100, message: 'KNET charge must be between 0 and 100' }
                ]}
                tooltip="Payment gateway charge percentage for KNET payments (Kuwait National Payment Network)"
              >
                <InputNumber 
                  min={0} 
                  max={100}
                  step={0.01} 
                  style={{ width: '100%' }} 
                  placeholder="e.g., 1.5"
                  suffix="%"
                />
              </Form.Item>
            </Col>
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
                   filterOption={(input, option) =>
                     String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                   }
                   onChange={(value) => handleInfluencerChange(value, false)}
                 >
                   {influencers.map(influencer => (
                     <Option key={influencer.id} value={influencer.id}>
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
                 >
                   <Select 
                     placeholder="Select invited influencer" 
                     allowClear
                     showSearch
                     filterOption={(input, option) =>
                       String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                     }
                   >
                     {influencers.map(influencer => (
                       <Option key={influencer.id} value={influencer.id}>
                         {influencer.name} ({influencer.email})
                       </Option>
                     ))}
                   </Select>
                 </Form.Item>
               )}
             </Col>
           </Row>

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

                     <Row gutter={16}>
             <Col span={12}>
               <Form.Item
                 name="is_flash_deal"
                 label="Is Flash Deal"
                 valuePropName="checked"
               >
                 <Switch 
                   onChange={(checked) => {
                     setIsFlashDeal(checked);
                     if (checked) {
                       // When enabling flash deal, change service type to flash
                       form.setFieldsValue({ service_type: 'flash' });
                       setSelectedServiceType('flash');
                       
                       // When enabling flash deal, copy price to offer price if offer price is empty
                       const currentPrice = form.getFieldValue('price');
                       const currentOfferPrice = form.getFieldValue('offer_price');
                       if (currentPrice && !currentOfferPrice) {
                         form.setFieldsValue({ offer_price: currentPrice });
                       }
                     } else {
                       // When disabling flash deal, change service type back to normal
                       form.setFieldsValue({ service_type: 'normal' });
                       setSelectedServiceType('normal');
                     }
                   }}
                 />
               </Form.Item>
             </Col>
           </Row>

           {form.getFieldValue('is_flash_deal') && (
             <>
               <Divider>Flash Deal Settings</Divider>
               

               
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
                       onChange={(date, dateString) => {
                         console.log('DatePicker onChange - date:', date);
                         console.log('DatePicker onChange - dateString:', dateString);
                       }}
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
                       onChange={(date, dateString) => {
                         console.log('DatePicker onChange - date:', date);
                         console.log('DatePicker onChange - dateString:', dateString);
                       }}
                     />
                   </Form.Item>
                 </Col>
               </Row>
             </>
           )}

                     {selectedServiceType === 'dual' && (
             <Form.Item
               name="about_us"
               label="About Us"
             >
               <TextArea rows={3} />
             </Form.Item>
           )}

          <Form.Item label="Thumbnail">
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
          initialValues={editingService ? {
            title: editingService.title,
            description: editingService.description,
            thumbnail: editingService.thumbnail,
            min_duration_days: editingService.min_duration_days,
            is_flash_deal: editingService.is_flash_deal,
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
            offer_price: editingService.offer_price,
            currency: editingService.currency || 'USD',
            commission_percentage: editingService.commission_percentage || 0,
            payment_gateway_charge_card_percentage: editingService.payment_gateway_charge_card_percentage || 0,
            payment_gateway_charge_knet_percentage: editingService.payment_gateway_charge_knet_percentage || 0
          } : {}}
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
                  onChange={(value) => setSelectedServiceType(value)}
                >
                  <Option value="normal">Normal</Option>
                  <Option value="dual">Dual</Option>
                  <Option value="flash">Flash</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please enter service description' }]}>
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="min_duration_days" label="Minimum Duration (Days)" rules={[{ required: true, message: 'Please enter minimum duration' }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
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
            <Col span={8}>
              <Form.Item
                name="price"
                label={`Price (${getCurrencySymbol(editSelectedCurrency)})`}
                rules={[{ required: true, message: 'Please enter price' }]}
              >
                <InputNumber 
                  min={0} 
                  step={0.01} 
                  style={{ width: '100%' }} 
                  formatter={value => `${getCurrencySymbol(editSelectedCurrency)} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(new RegExp(`\\${getCurrencySymbol(editSelectedCurrency)}\\s?|(,*)`, 'g'), '')}
                  onChange={(value) => {
                    // Auto-update offer price for normal/duo services
                    if (!editIsFlashDeal && value) {
                      editForm.setFieldsValue({ offer_price: value });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="offer_price"
                label={`Offer Price (${getCurrencySymbol(editSelectedCurrency)})`}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (getFieldValue('is_flash_deal') && !value) {
                        return Promise.reject(new Error('Please enter offer price for flash deals'));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber 
                  min={0} 
                  step={0.01} 
                  style={{ width: '100%' }} 
                  disabled={!editIsFlashDeal}
                  formatter={value => `${getCurrencySymbol(editSelectedCurrency)} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(new RegExp(`\\${getCurrencySymbol(editSelectedCurrency)}\\s?|(,*)`, 'g'), '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Charges & Fees</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="commission_percentage"
                label="Commission Percentage (%)"
                rules={[
                  { required: false },
                  { type: 'number', min: 0, max: 100, message: 'Commission must be between 0 and 100' }
                ]}
                tooltip="Platform commission percentage deducted from service price"
              >
                <InputNumber 
                  min={0} 
                  max={100}
                  step={0.01} 
                  style={{ width: '100%' }} 
                  placeholder="e.g., 10.5"
                  suffix="%"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="payment_gateway_charge_card_percentage"
                label="Card Payment Charge (%)"
                rules={[
                  { required: false },
                  { type: 'number', min: 0, max: 100, message: 'Card charge must be between 0 and 100' }
                ]}
                tooltip="Payment gateway charge percentage for card payments (Visa, Mastercard, etc.)"
              >
                <InputNumber 
                  min={0} 
                  max={100}
                  step={0.01} 
                  style={{ width: '100%' }} 
                  placeholder="e.g., 2.9"
                  suffix="%"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="payment_gateway_charge_knet_percentage"
                label="KNET Payment Charge (%)"
                rules={[
                  { required: false },
                  { type: 'number', min: 0, max: 100, message: 'KNET charge must be between 0 and 100' }
                ]}
                tooltip="Payment gateway charge percentage for KNET payments (Kuwait National Payment Network)"
              >
                <InputNumber 
                  min={0} 
                  max={100}
                  step={0.01} 
                  style={{ width: '100%' }} 
                  placeholder="e.g., 1.5"
                  suffix="%"
                />
              </Form.Item>
            </Col>
          </Row>

                     <Row gutter={16}>
             <Col span={12}>
               <Form.Item name="primary_influencer_id" label="Primary Influencer" rules={[{ required: true, message: 'Please select primary influencer' }]}>
                 <Select 
                   placeholder="Select primary influencer"
                   showSearch
                   filterOption={(input, option) =>
                     String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                   }
                   onChange={(value) => handleInfluencerChange(value, true)}
                 >
                   {influencers.map(influencer => (
                     <Option key={influencer.id} value={influencer.id}>
                       {influencer.name} ({influencer.email}) {influencer.country ? `- ${influencer.country}` : ''}
                     </Option>
                   ))}
                 </Select>
               </Form.Item>
             </Col>
             <Col span={12}>
               {selectedServiceType === 'dual' && (
                 <Form.Item name="invited_influencer_id" label="Invited Influencer">
                   <Select 
                     placeholder="Select invited influencer" 
                     allowClear
                     showSearch
                     filterOption={(input, option) =>
                       String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                     }
                   >
                     {influencers.map(influencer => (
                       <Option key={influencer.id} value={influencer.id}>
                         {influencer.name} ({influencer.email})
                       </Option>
                     ))}
                   </Select>
                 </Form.Item>
               )}
             </Col>
           </Row>

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

          <Divider>Flash Deal Settings</Divider>

                     <Row gutter={16}>
             <Col span={12}>
               <Form.Item name="is_flash_deal" label="Is Flash Deal" valuePropName="checked"> 
                 <Switch 
                   onChange={(checked) => {
                     setEditIsFlashDeal(checked);
                     if (checked) {
                       // When enabling flash deal, change service type to flash
                       editForm.setFieldsValue({ service_type: 'flash' });
                       setSelectedServiceType('flash');
                       
                       // When enabling flash deal, copy price to offer price if offer price is empty
                       const currentPrice = editForm.getFieldValue('price');
                       const currentOfferPrice = editForm.getFieldValue('offer_price');
                       if (currentPrice && !currentOfferPrice) {
                         editForm.setFieldsValue({ offer_price: currentPrice });
                       }
                     } else {
                       // When disabling flash deal, change service type back to normal
                       editForm.setFieldsValue({ service_type: 'normal' });
                       setSelectedServiceType('normal');
                     }
                   }}
                 /> 
               </Form.Item>
             </Col>
           </Row>

           {editForm.getFieldValue('is_flash_deal') && (
             <>
               <Divider>Flash Deal Settings</Divider>
               

               
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
                       onChange={(date, dateString) => {
                         console.log('DatePicker onChange - date:', date);
                         console.log('DatePicker onChange - dateString:', dateString);
                       }}
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
                       onChange={(date, dateString) => {
                         console.log('DatePicker onChange - date:', date);
                         console.log('DatePicker onChange - dateString:', dateString);
                       }}
                     />
                   </Form.Item>
                 </Col>
               </Row>
             </>
           )}

                     {selectedServiceType === 'dual' && (
             <Form.Item name="about_us" label="About Us">
               <TextArea rows={3} />
             </Form.Item>
           )}

          <Form.Item label="Thumbnail">
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
    </Card>
  );
} 