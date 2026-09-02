import {
  isValidIndianMobile,
  normalizePhoneE164,
  extract10DigitPhone,
  formatPhoneDisplay,
} from '../phone';

describe('Indian Mobile Number Utilities', () => {
  describe('isValidIndianMobile', () => {
    it('should validate 10-digit Indian mobile numbers starting with 6, 7, 8, 9', () => {
      expect(isValidIndianMobile('9876543210')).toBe(true);
      expect(isValidIndianMobile('8123456789')).toBe(true);
      expect(isValidIndianMobile('7000000000')).toBe(true);
      expect(isValidIndianMobile('6354129870')).toBe(true);
    });

    it('should validate numbers with spaces and formatting', () => {
      expect(isValidIndianMobile('98765 43210')).toBe(true);
      expect(isValidIndianMobile('+91 98765 43210')).toBe(true);
      expect(isValidIndianMobile('09876543210')).toBe(true);
      expect(isValidIndianMobile('919876543210')).toBe(true);
    });

    it('should reject invalid mobile numbers', () => {
      expect(isValidIndianMobile('1234567890')).toBe(false); // starts with 1
      expect(isValidIndianMobile('5555555555')).toBe(false); // starts with 5
      expect(isValidIndianMobile('98765')).toBe(false); // too short
      expect(isValidIndianMobile('9876543210123')).toBe(false); // too long
      expect(isValidIndianMobile('')).toBe(false);
    });
  });

  describe('normalizePhoneE164', () => {
    it('should format 10-digit number to +91 E.164 format', () => {
      expect(normalizePhoneE164('9876543210')).toBe('+919876543210');
      expect(normalizePhoneE164('+91 98765 43210')).toBe('+919876543210');
      expect(normalizePhoneE164('09876543210')).toBe('+919876543210');
      expect(normalizePhoneE164('919876543210')).toBe('+919876543210');
    });
  });

  describe('extract10DigitPhone', () => {
    it('should extract clean 10-digit number', () => {
      expect(extract10DigitPhone('+919876543210')).toBe('9876543210');
      expect(extract10DigitPhone('09876543210')).toBe('9876543210');
      expect(extract10DigitPhone('+91 98765 43210')).toBe('9876543210');
    });
  });

  describe('formatPhoneDisplay', () => {
    it('should format number for UI display', () => {
      expect(formatPhoneDisplay('9876543210')).toBe('+91 98765 43210');
      expect(formatPhoneDisplay('+919876543210')).toBe('+91 98765 43210');
    });
  });
});
