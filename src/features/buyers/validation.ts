import { z } from 'zod';
import { isValidIndianMobile } from '@/src/utils/phone';

export const buyerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Buyer name is required.')
    .min(2, 'Buyer name must be at least 2 characters.')
    .max(100, 'Buyer name cannot exceed 100 characters.'),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(val => !val || isValidIndianMobile(val), {
      message: 'Please enter a valid 10-digit mobile number.',
    }),
  address: z.string().trim().max(250, 'Address cannot exceed 250 characters.').optional(),
});

export type BuyerFormData = z.infer<typeof buyerFormSchema>;
