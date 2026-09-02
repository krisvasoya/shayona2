import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService, InvoiceFilters } from '@/src/services/invoice.service';
import { InvoiceFormData } from '@/src/types/invoice';
import { CUSTOMERS_QUERY_KEY } from '@/src/features/customers';
import { BUYERS_QUERY_KEY } from '@/src/features/buyers';

export const INVOICES_QUERY_KEY = ['invoices'];

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: [
      ...INVOICES_QUERY_KEY,
      filters?.partyType || '',
      filters?.paymentStatus || '',
      filters?.searchQuery || '',
    ],
    queryFn: () => invoiceService.getInvoices(filters),
  });
}

export function useInvoiceDetails(invoiceId: string) {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceService.getInvoiceById(invoiceId),
    enabled: Boolean(invoiceId),
  });
}

export function useInvoicePayments(invoiceId: string) {
  return useQuery({
    queryKey: ['payments', invoiceId],
    queryFn: () => invoiceService.getInvoicePayments(invoiceId),
    enabled: Boolean(invoiceId),
  });
}

export function useNextInvoiceNumber() {
  return useQuery({
    queryKey: ['next-invoice-number'],
    queryFn: () => invoiceService.getNextInvoiceNumber(),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InvoiceFormData) => invoiceService.createInvoice(data),
    onSuccess: result => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: BUYERS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ['next-invoice-number'] });
      }
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: InvoiceFormData }) =>
      invoiceService.updateInvoice(invoiceId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['payments', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: BUYERS_QUERY_KEY });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) => invoiceService.deleteInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: BUYERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['next-invoice-number'] });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      paymentRupees,
      paymentDate,
      notes,
    }: {
      invoiceId: string;
      paymentRupees: number;
      paymentDate?: string;
      notes?: string;
    }) => invoiceService.recordPayment(invoiceId, paymentRupees, paymentDate, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['payments', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: BUYERS_QUERY_KEY });
    },
  });
}
