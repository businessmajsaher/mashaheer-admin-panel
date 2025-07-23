import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrders, createOrder, updateOrder, deleteOrder } from '@/services/orderService';
import { Order } from '@/types/order';

export function useOrders() {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: fetchOrders,
  });

  const create = useMutation({
    mutationFn: createOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Order> }) => updateOrder(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const remove = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  return { ...ordersQuery, create, update, remove };
} 