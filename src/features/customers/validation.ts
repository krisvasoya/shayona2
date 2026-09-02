import { z } from 'zod';
import { isValidIndianMobile } from '@/src/utils/phone';

export const customerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Customer name is required.')
    .min(2, 'Customer name must be at least 2 characters.')
    .max(100, 'Customer name cannot exceed 100 characters.'),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(val => !val || isValidIndianMobile(val), {
      message: 'Please enter a valid 10-digit mobile number.',
    }),
  address: z.string().trim().max(250, 'Address cannot exceed 250 characters.').optional(),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;
