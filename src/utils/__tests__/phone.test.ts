import {
  isValidIndianMobile,
  normalizePhoneE164,
  extract10DigitPhone,
  formatPhoneDisplay,
  phoneToSyntheticEmail,
  isSyntheticPhoneEmail,
  syntheticEmailToPhone,
  PHONE_AUTH_DOMAIN,
} from '../phone';

describe('Phone Number Utilities', () => {
  describe('isValidIndianMobile', () => {
    it('should validate 10-digit mobile numbers starting with 6, 7, 8, 9', () => {
      expect(isValidIndianMobile('9876543210')).toBe(true);
      expect(isValidIndianMobile('8123456789')).toBe(true);
      expect(isValidIndianMobile('7012345678')).toBe(true);
      expect(isValidIndianMobile('6398765432')).toBe(true);
    });

    it('should validate numbers with country code +91 or 91 or leading 0', () => {
      expect(isValidIndianMobile('+919876543210')).toBe(true);
      expect(isValidIndianMobile('919876543210')).toBe(true);
      expect(isValidIndianMobile('09876543210')).toBe(true);
    });

    it('should reject invalid starting digits (0-5)', () => {
      expect(isValidIndianMobile('5876543210')).toBe(false);
      expect(isValidIndianMobile('1234567890')).toBe(false);
      expect(isValidIndianMobile('0000000000')).toBe(false);
    });

    it('should reject invalid lengths', () => {
      expect(isValidIndianMobile('987654321')).toBe(false); // 9 digits
      expect(isValidIndianMobile('987654321000')).toBe(false); // 12 digits not starting with 91
      expect(isValidIndianMobile('')).toBe(false);
    });
  });

  describe('normalizePhoneE164', () => {
    it('should normalize 10-digit number to +91...', () => {
      expect(normalizePhoneE164('9876543210')).toBe('+919876543210');
    });

    it('should normalize formatted input with spaces and hyphens', () => {
      expect(normalizePhoneE164('98765 43210')).toBe('+919876543210');
      expect(normalizePhoneE164('98765-43210')).toBe('+919876543210');
      expect(normalizePhoneE164('+91 98765-43210')).toBe('+919876543210');
    });

    it('should normalize numbers with leading 0 or 91', () => {
      expect(normalizePhoneE164('09876543210')).toBe('+919876543210');
      expect(normalizePhoneE164('919876543210')).toBe('+919876543210');
    });
  });

  describe('extract10DigitPhone', () => {
    it('should extract clean 10 digits', () => {
      expect(extract10DigitPhone('+919876543210')).toBe('9876543210');
      expect(extract10DigitPhone('09876543210')).toBe('9876543210');
      expect(extract10DigitPhone('9876543210')).toBe('9876543210');
    });
  });

  describe('formatPhoneDisplay', () => {
    it('should format into readable Indian mobile display', () => {
      expect(formatPhoneDisplay('+919876543210')).toBe('+91 98765 43210');
      expect(formatPhoneDisplay('9876543210')).toBe('+91 98765 43210');
    });
  });

  describe('Zero-Cost Synthetic Phone Auth Mapping', () => {
    it('should map 10-digit phone to synthetic email', () => {
      expect(phoneToSyntheticEmail('9876543210')).toBe(`9876543210@${PHONE_AUTH_DOMAIN}`);
      expect(phoneToSyntheticEmail('+91 98765 43210')).toBe(`9876543210@${PHONE_AUTH_DOMAIN}`);
    });

    it('should recognize synthetic phone emails', () => {
      expect(isSyntheticPhoneEmail(`9876543210@${PHONE_AUTH_DOMAIN}`)).toBe(true);
      expect(isSyntheticPhoneEmail('user@gmail.com')).toBe(false);
      expect(isSyntheticPhoneEmail(null)).toBe(false);
    });

    it('should extract phone number from synthetic email', () => {
      expect(syntheticEmailToPhone(`9876543210@${PHONE_AUTH_DOMAIN}`)).toBe('9876543210');
      expect(syntheticEmailToPhone('user@gmail.com')).toBe('user@gmail.com');
    });
  });
});
