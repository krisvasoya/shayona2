import { z } from 'zod';
import { isValidIndianMobile } from '@/src/utils/phone';

export const signUpSchema = z
  .object({
    shopName: z
      .string()
      .trim()
      .min(1, 'Shop name is required.')
      .min(2, 'Shop name must be at least 2 characters.')
      .max(100, 'Shop name cannot exceed 100 characters.'),
    phone: z
      .string()
      .trim()
      .min(1, 'Mobile number is required.')
      .refine(val => isValidIndianMobile(val), {
        message: 'Please enter a valid 10-digit Indian mobile number.',
      }),
    password: z
      .string()
      .min(1, 'Password is required.')
      .min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string().min(1, 'Confirm password is required.'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, 'Mobile number is required.')
    .refine(val => isValidIndianMobile(val), {
      message: 'Please enter a valid 10-digit mobile number.',
    }),
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean().default(true),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const forgotPasswordRequestSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, 'Mobile number is required.')
    .refine(val => isValidIndianMobile(val), {
      message: 'Please enter a valid 10-digit mobile number.',
    }),
});

export type ForgotPasswordRequestData = z.infer<typeof forgotPasswordRequestSchema>;

export const resetPasswordSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .min(1, 'Mobile number is required.')
      .refine(val => isValidIndianMobile(val), {
        message: 'Please enter a valid 10-digit mobile number.',
      }),
    otp: z
      .string()
      .trim()
      .min(1, 'OTP is required.')
      .min(4, 'OTP must be at least 4 digits.')
      .max(8, 'OTP cannot exceed 8 digits.'),
    newPassword: z
      .string()
      .min(1, 'New password is required.')
      .min(6, 'Password must be at least 6 characters.'),
    confirmNewPassword: z.string().min(1, 'Confirm password is required.'),
  })
  .refine(data => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match.',
    path: ['confirmNewPassword'],
  });

export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
