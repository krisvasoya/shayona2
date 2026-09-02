import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buyerService } from '@/src/services/buyer.service';

export const BUYERS_QUERY_KEY = ['buyers'];

export function useBuyers(searchQuery?: string) {
  return useQuery({
    queryKey: [...BUYERS_QUERY_KEY, searchQuery || ''],
    queryFn: () => buyerService.getBuyers(searchQuery),
  });
}

export function useBuyerDetails(buyerId: string) {
  return useQuery({
    queryKey: ['buyer', buyerId],
    queryFn: () => buyerService.getBuyerById(buyerId),
    enabled: Boolean(buyerId),
  });
}

export function useCreateBuyer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; phone?: string; address?: string }) =>
      buyerService.createBuyer(data),
    onSuccess: result => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: BUYERS_QUERY_KEY });
      }
    },
  });
}

export function useUpdateBuyer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      buyerId,
      data,
    }: {
      buyerId: string;
      data: { name: string; phone?: string; address?: string };
    }) => buyerService.updateBuyer(buyerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BUYERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['buyer', variables.buyerId] });
    },
  });
}

export function useDeleteBuyer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (buyerId: string) => buyerService.deleteBuyer(buyerId),
    onSuccess: result => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: BUYERS_QUERY_KEY });
      }
    },
  });
}
