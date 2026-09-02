import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '@/src/services/customer.service';

export const CUSTOMERS_QUERY_KEY = ['customers'];

export function useCustomers(searchQuery?: string) {
  return useQuery({
    queryKey: [...CUSTOMERS_QUERY_KEY, searchQuery || ''],
    queryFn: () => customerService.getCustomers(searchQuery),
  });
}

export function useCustomerDetails(customerId: string) {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerService.getCustomerById(customerId),
    enabled: Boolean(customerId),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; phone?: string; address?: string }) =>
      customerService.createCustomer(data),
    onSuccess: result => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      }
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      data,
    }: {
      customerId: string;
      data: { name: string; phone?: string; address?: string };
    }) => customerService.updateCustomer(customerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => customerService.deleteCustomer(customerId),
    onSuccess: result => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      }
    },
  });
}
