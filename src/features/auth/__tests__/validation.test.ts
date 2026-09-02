import {
  signUpSchema,
  loginSchema,
  forgotPasswordRequestSchema,
  resetPasswordSchema,
} from '../validation';

describe('Auth Validation Schemas', () => {
  describe('signUpSchema', () => {
    it('should validate valid registration data', () => {
      const result = signUpSchema.safeParse({
        shopName: 'Shayona General Store',
        phone: '9876543210',
        password: 'password123',
        confirmPassword: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing or short shop name', () => {
      const result = signUpSchema.safeParse({
        shopName: 'A',
        phone: '9876543210',
        password: 'password123',
        confirmPassword: 'password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Shop name must be at least 2 characters');
      }
    });

    it('should reject invalid mobile number', () => {
      const result = signUpSchema.safeParse({
        shopName: 'ABC Store',
        phone: '12345',
        password: 'password123',
        confirmPassword: 'password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid 10-digit Indian mobile number');
      }
    });

    it('should reject weak password (< 6 chars)', () => {
      const result = signUpSchema.safeParse({
        shopName: 'ABC Store',
        phone: '9876543210',
        password: '123',
        confirmPassword: '123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 6 characters');
      }
    });

    it('should reject password mismatch', () => {
      const result = signUpSchema.safeParse({
        shopName: 'ABC Store',
        phone: '9876543210',
        password: 'password123',
        confirmPassword: 'differentPassword',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Passwords do not match.');
      }
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login credentials', () => {
      const result = loginSchema.safeParse({
        phone: '9876543210',
        password: 'password123',
        rememberMe: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        phone: '9876543210',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordRequestSchema', () => {
    it('should validate valid phone number for password reset', () => {
      const result = forgotPasswordRequestSchema.safeParse({
        phone: '9876543210',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate complete reset password data', () => {
      const result = resetPasswordSchema.safeParse({
        phone: '9876543210',
        otp: '123456',
        newPassword: 'newPassword123',
        confirmNewPassword: 'newPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject mismatched reset passwords', () => {
      const result = resetPasswordSchema.safeParse({
        phone: '9876543210',
        otp: '123456',
        newPassword: 'newPassword123',
        confirmNewPassword: 'wrongMismatch',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Passwords do not match.');
      }
    });
  });
});
