import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchServices, createService, updateService, deleteService } from '@/services/serviceService';
import { Service } from '@/types/service';

export function useServices() {
  const queryClient = useQueryClient();

  const servicesQuery = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: fetchServices,
  });

  const create = useMutation({
    mutationFn: createService,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Service> }) => updateService(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });

  const remove = useMutation({
    mutationFn: deleteService,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });

  return { ...servicesQuery, create, update, remove };
} 