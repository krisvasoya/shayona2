import { z } from 'zod';

export const invoiceItemFormSchema = z.object({
  item_name: z
    .string()
    .trim()
    .min(1, 'Item name is required.')
    .max(150, 'Item name cannot exceed 150 characters.'),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a valid number' })
    .positive('Quantity must be greater than 0.')
    .max(100000, 'Quantity is too large.'),
  rate_rupees: z
    .number({ invalid_type_error: 'Rate must be a valid number' })
    .nonnegative('Rate cannot be negative.')
    .max(10000000, 'Rate is too large.'),
});

export const invoiceFormSchema = z.object({
  invoice_number: z
    .string()
    .trim()
    .min(1, 'Invoice number is required.')
    .max(50, 'Invoice number cannot exceed 50 characters.'),
  party_type: z.enum(['CUSTOMER', 'BUYER']),
  party_id: z.string().trim().min(1, 'Please select a customer or buyer.'),
  party_name: z.string().trim().min(1, 'Party name is required.'),
  invoice_date: z.string().min(1, 'Invoice date is required.'),
  items: z.array(invoiceItemFormSchema).min(1, 'At least one line item is required on the bill.'),
  paid_amount_rupees: z
    .number({ invalid_type_error: 'Paid amount must be a number' })
    .nonnegative('Paid amount cannot be negative.')
    .default(0),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters.').optional(),
});

export type InvoiceItemFormValues = z.infer<typeof invoiceItemFormSchema>;
export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
