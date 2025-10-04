import { supabase } from './supabaseClient';

// Types for Legal and Support system
export interface LegalNotice {
  id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  version: number;
  last_updated: string;
  created_at: string;
  updated_by?: string;
}

export interface ContactSupportInfo {
  id: string;
  title: string;
  content: string;
  contact_type: 'email' | 'phone' | 'chat' | 'social' | 'hours';
  priority: number;
  is_active: boolean;
  last_updated: string;
  created_at: string;
  updated_by?: string;
}

export interface HelpSection {
  id: string;
  title: string;
  content: string;
  category: string;
  order_index: number;
  is_active: boolean;
  last_updated: string;
  created_at: string;
  updated_by?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  order_index: number;
  is_active: boolean;
  view_count: number;
  helpful_count: number;
  last_updated: string;
  created_at: string;
  updated_by?: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  message: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: string;
  response_count: number;
  last_response_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketResponse {
  id: string;
  ticket_id: string;
  responder_id: string;
  message: string;
  is_internal: boolean;
  attachments: string[];
  created_at: string;
}

export interface SupportCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

// Legal Notices Service
export const legalNoticesService = {
  // Get all active legal notices
  async getActiveNotices(): Promise<LegalNotice[]> {
    const { data, error } = await supabase
      .from('legal_notices')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get all legal notices (admin only)
  async getAllNotices(): Promise<LegalNotice[]> {
    const { data, error } = await supabase
      .from('legal_notices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get legal notice by ID
  async getNoticeById(id: string): Promise<LegalNotice | null> {
    const { data, error } = await supabase
      .from('legal_notices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new legal notice
  async createNotice(notice: Omit<LegalNotice, 'id' | 'created_at' | 'last_updated'>): Promise<LegalNotice> {
    const { data, error } = await supabase
      .from('legal_notices')
      .insert([notice])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update legal notice
  async updateNotice(id: string, updates: Partial<LegalNotice>): Promise<LegalNotice> {
    const { data, error } = await supabase
      .from('legal_notices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete legal notice
  async deleteNotice(id: string): Promise<void> {
    const { error } = await supabase
      .from('legal_notices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Contact Support Service
export const contactSupportService = {
  // Get all active contact support info
  async getActiveContactInfo(): Promise<ContactSupportInfo[]> {
    const { data, error } = await supabase
      .from('contact_support_info')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get all contact support info (admin only)
  async getAllContactInfo(): Promise<ContactSupportInfo[]> {
    const { data, error } = await supabase
      .from('contact_support_info')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get contact info by type
  async getContactInfoByType(type: string): Promise<ContactSupportInfo[]> {
    const { data, error } = await supabase
      .from('contact_support_info')
      .select('*')
      .eq('contact_type', type)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create new contact support info
  async createContactInfo(info: Omit<ContactSupportInfo, 'id' | 'created_at' | 'last_updated'>): Promise<ContactSupportInfo> {
    const { data, error } = await supabase
      .from('contact_support_info')
      .insert([info])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update contact support info
  async updateContactInfo(id: string, updates: Partial<ContactSupportInfo>): Promise<ContactSupportInfo> {
    const { data, error } = await supabase
      .from('contact_support_info')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete contact support info
  async deleteContactInfo(id: string): Promise<void> {
    const { error } = await supabase
      .from('contact_support_info')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Help & Support Service
export const helpSupportService = {
  // Get all active help sections
  async getActiveHelpSections(): Promise<HelpSection[]> {
    const { data, error } = await supabase
      .from('help_sections')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get all help sections (admin only)
  async getAllHelpSections(): Promise<HelpSection[]> {
    const { data, error } = await supabase
      .from('help_sections')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get help sections by category
  async getHelpSectionsByCategory(category: string): Promise<HelpSection[]> {
    const { data, error } = await supabase
      .from('help_sections')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create new help section
  async createHelpSection(section: Omit<HelpSection, 'id' | 'created_at' | 'last_updated'>): Promise<HelpSection> {
    const { data, error } = await supabase
      .from('help_sections')
      .insert([section])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update help section
  async updateHelpSection(id: string, updates: Partial<HelpSection>): Promise<HelpSection> {
    const { data, error } = await supabase
      .from('help_sections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete help section
  async deleteHelpSection(id: string): Promise<void> {
    const { error } = await supabase
      .from('help_sections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// FAQ Service
export const faqService = {
  // Get all active FAQ items
  async getActiveFAQs(): Promise<FAQItem[]> {
    const { data, error } = await supabase
      .from('faq_items')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get all FAQ items (admin only)
  async getAllFAQs(): Promise<FAQItem[]> {
    const { data, error } = await supabase
      .from('faq_items')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get FAQ items by category
  async getFAQsByCategory(category: string): Promise<FAQItem[]> {
    const { data, error } = await supabase
      .from('faq_items')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Search FAQ items
  async searchFAQs(searchTerm: string): Promise<FAQItem[]> {
    const { data, error } = await supabase
      .from('faq_items')
      .select('*')
      .or(`question.ilike.%${searchTerm}%,answer.ilike.%${searchTerm}%`)
      .eq('is_active', true)
      .order('helpful_count', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Increment FAQ view count
  async incrementFAQView(id: string): Promise<void> {
    const { error } = await supabase
      .from('faq_items')
      .update({ view_count: supabase.sql`view_count + 1` })
      .eq('id', id);

    if (error) throw error;
  },

  // Increment FAQ helpful count
  async incrementFAQHelpful(id: string): Promise<void> {
    const { error } = await supabase
      .from('faq_items')
      .update({ helpful_count: supabase.sql`helpful_count + 1` })
      .eq('id', id);

    if (error) throw error;
  },

  // Create new FAQ item
  async createFAQ(faq: Omit<FAQItem, 'id' | 'created_at' | 'last_updated' | 'view_count' | 'helpful_count'>): Promise<FAQItem> {
    const { data, error } = await supabase
      .from('faq_items')
      .insert([faq])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update FAQ item
  async updateFAQ(id: string, updates: Partial<FAQItem>): Promise<FAQItem> {
    const { data, error } = await supabase
      .from('faq_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete FAQ item
  async deleteFAQ(id: string): Promise<void> {
    const { error } = await supabase
      .from('faq_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Support Tickets Service
export const supportTicketsService = {
  // Get user's support tickets
  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get all support tickets (admin only)
  async getAllTickets(): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get support ticket by ID
  async getTicketById(id: string): Promise<SupportTicket | null> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new support ticket
  async createTicket(ticket: Omit<SupportTicket, 'id' | 'ticket_number' | 'response_count' | 'created_at' | 'updated_at'>): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert([ticket])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update support ticket
  async updateTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get ticket responses
  async getTicketResponses(ticketId: string): Promise<SupportTicketResponse[]> {
    const { data, error } = await supabase
      .from('support_ticket_responses')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('is_internal', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Add response to ticket
  async addTicketResponse(response: Omit<SupportTicketResponse, 'id' | 'created_at'>): Promise<SupportTicketResponse> {
    const { data, error } = await supabase
      .from('support_ticket_responses')
      .insert([response])
      .select()
      .single();

    if (error) throw error;

    // Update ticket response count and last response time
    await supabase
      .from('support_tickets')
      .update({ 
        response_count: supabase.sql`response_count + 1`,
        last_response_at: new Date().toISOString()
      })
      .eq('id', response.ticket_id);

    return data;
  }
};

// Support Categories Service
export const supportCategoriesService = {
  // Get all active support categories
  async getActiveCategories(): Promise<SupportCategory[]> {
    const { data, error } = await supabase
      .from('support_categories')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get all support categories (admin only)
  async getAllCategories(): Promise<SupportCategory[]> {
    const { data, error } = await supabase
      .from('support_categories')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create new support category
  async createCategory(category: Omit<SupportCategory, 'id' | 'created_at'>): Promise<SupportCategory> {
    const { data, error } = await supabase
      .from('support_categories')
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update support category
  async updateCategory(id: string, updates: Partial<SupportCategory>): Promise<SupportCategory> {
    const { data, error } = await supabase
      .from('support_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete support category
  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('support_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
