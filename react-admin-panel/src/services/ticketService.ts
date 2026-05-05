import { supabase } from './supabaseClient';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Pending from Customer' | 'Resolved' | 'Closed';
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    email: string;
  };
}

export const ticketService = {
  // Fetch all tickets with user profiles
  async getTickets() {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        user:profiles!user_id(name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SupportTicket[];
  },

  // Create a new ticket
  async createTicket(ticket: Omit<SupportTicket, 'id' | 'status' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert([{ ...ticket, status: 'Open' }])
      .select()
      .single();

    if (error) throw error;
    return data as SupportTicket;
  },

  // Update ticket status
  async updateTicketStatus(ticketId: string, status: SupportTicket['status']) {
    const { data, error } = await supabase
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;
    return data as SupportTicket;
  },

  // Find user by email for auto-fill
  async findUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Fetch all users for the dropdown
  async getAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }
};
