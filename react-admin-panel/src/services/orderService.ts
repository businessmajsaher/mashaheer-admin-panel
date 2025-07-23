import { supabase } from './supabaseClient';
import { Order } from '@/types/order';

export const fetchOrders = async () => {
  const { data, error } = await supabase.from('orders').select('*');
  if (error) throw error;
  return data as Order[];
};

export const createOrder = async (order: Partial<Order>) => {
  const { data, error } = await supabase.from('orders').insert([order]).select();
  if (error) throw error;
  return data?.[0] as Order;
};

export const updateOrder = async (id: string, updates: Partial<Order>) => {
  const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select();
  if (error) throw error;
  return data?.[0] as Order;
};

export const deleteOrder = async (id: string) => {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw error;
  return true;
}; 