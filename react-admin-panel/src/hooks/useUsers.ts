import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, createUser, updateUser, deleteUser } from '@/services/userService';
import { User } from '@/types/user';

export function useUsers() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const create = useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<User> }) => updateUser(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const remove = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  return { ...usersQuery, create, update, remove };
} 