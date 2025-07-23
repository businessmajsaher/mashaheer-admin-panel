import { supabase } from './supabaseClient';
import { User } from '@/types/user';

export const fetchUsers = async () => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data as User[];
};

export const createUser = async (user: Partial<User>) => {
  const { data, error } = await supabase.from('users').insert([user]).select();
  if (error) throw error;
  return data?.[0] as User;
};

export const updateUser = async (id: string, updates: Partial<User>) => {
  const { data, error } = await supabase.from('users').update(updates).eq('id', id).select();
  if (error) throw error;
  return data?.[0] as User;
};

export const deleteUser = async (id: string) => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
  return true;
}; 