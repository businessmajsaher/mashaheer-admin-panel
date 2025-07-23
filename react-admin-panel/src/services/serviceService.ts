import { supabase } from './supabaseClient';
import { Service } from '@/types/service';

export const fetchServices = async () => {
  const { data, error } = await supabase.from('services').select('*');
  if (error) throw error;
  return data as Service[];
};

export const createService = async (service: Partial<Service>) => {
  const { data, error } = await supabase.from('services').insert([service]).select();
  if (error) throw error;
  return data?.[0] as Service;
};

export const updateService = async (id: string, updates: Partial<Service>) => {
  const { data, error } = await supabase.from('services').update(updates).eq('id', id).select();
  if (error) throw error;
  return data?.[0] as Service;
};

export const deleteService = async (id: string) => {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
  return true;
}; 