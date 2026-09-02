jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'exp://mock-redirect-uri'),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  canOpenURL: jest.fn().mockResolvedValue(true),
  openURL: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({
    uri: 'file:///mock/invoice.pdf',
    base64: 'JVBERi0xLjQKJc...',
  }),
  printAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///mock/cache/',
  documentDirectory: 'file:///mock/doc/',
  EncodingType: { Base64: 'base64' },
  copyAsync: jest.fn().mockResolvedValue(undefined),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }),
}));

import { authService, UserProfile } from '@/src/services/auth.service';
import { supabase } from '@/src/services/supabase/client';
import { pdfService } from '@/src/services/pdf.service';
import { DbProfile } from '@/src/types/database';
import { InvoiceDetail } from '@/src/types/invoice';

jest.mock('@/src/services/supabase/client', () => {
  const mockSingle = jest.fn();
  const mockSelect = jest.fn(() => ({ single: mockSingle }));
  const mockEq = jest.fn(() => ({ select: mockSelect }));
  const mockUpdate = jest.fn(() => ({ eq: mockEq }));
  const mockFrom = jest.fn(() => ({
    update: mockUpdate,
  }));

  return {
    supabase: {
      from: mockFrom,
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
      },
    },
  };
});

describe('Business Profile & Optional Address & Invoice Header Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. authService.updateUserProfile', () => {
    it('successfully updates shop name, mobile number, and optional shop address', async () => {
      const mockUpdatedProfile: UserProfile = {
        id: 'user-biz-123',
        shop_name: 'Shayona Sarees & Textiles',
        phone: '+919876543210',
        address: '104, Shivalik Plaza, Ambawadi, Ahmedabad',
        language: 'en',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-09-02T12:00:00Z',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockUpdatedProfile,
        error: null,
      });
      const mockSelect = jest.fn(() => ({ single: mockSingle }));
      const mockEq = jest.fn(() => ({ select: mockSelect }));
      const mockUpdate = jest.fn(() => ({ eq: mockEq }));
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const res = await authService.updateUserProfile('user-biz-123', {
        shop_name: 'Shayona Sarees & Textiles',
        phone: '9876543210',
        address: '104, Shivalik Plaza, Ambawadi, Ahmedabad',
      });

      expect(res.error).toBeUndefined();
      expect(res.profile).toEqual(mockUpdatedProfile);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          shop_name: 'Shayona Sarees & Textiles',
          phone: '+919876543210',
          address: '104, Shivalik Plaza, Ambawadi, Ahmedabad',
        }),
      );
    });

    it('handles empty/null optional address cleanly without crashing or setting string "null"', async () => {
      const mockUpdatedProfile: UserProfile = {
        id: 'user-biz-123',
        shop_name: 'Shayona Beads',
        phone: '+919876543210',
        address: null,
        language: 'en',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-09-02T12:00:00Z',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockUpdatedProfile,
        error: null,
      });
      const mockSelect = jest.fn(() => ({ single: mockSingle }));
      const mockEq = jest.fn(() => ({ select: mockSelect }));
      const mockUpdate = jest.fn(() => ({ eq: mockEq }));
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const res = await authService.updateUserProfile('user-biz-123', {
        shop_name: 'Shayona Beads',
        phone: '9876543210',
        address: '   ', // whitespace only
      });

      expect(res.error).toBeUndefined();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          shop_name: 'Shayona Beads',
          address: null,
        }),
      );
    });
  });

  describe('2. Invoice Header & PDF Address Rendering Rules', () => {
    const sampleInvoice: InvoiceDetail = {
      id: 'inv-addr-01',
      user_id: 'user-biz-123',
      invoice_number: 'INV-1001',
      invoice_date: '2026-09-02',
      party_type: 'CUSTOMER',
      party_id: 'cust-1',
      party_name: 'Jayesh Patel',
      total_amount: 1500000,
      paid_amount: 0,
      remaining_amount: 1500000,
      pdf_path: null,
      notes: null,
      items_count: 1,
      created_at: '2026-09-02T10:00:00Z',
      updated_at: '2026-09-02T10:00:00Z',
      items: [
        {
          id: 'item-1',
          invoice_id: 'inv-addr-01',
          item_name: 'Designer Bandhani Saree',
          quantity: 3,
          rate: 500000,
          amount: 1500000,
          created_at: '2026-09-02T10:00:00Z',
        },
      ],
    };

    it('Renders Shop Address underneath Shop Name and Mobile when address is provided', () => {
      const profileWithAddress: DbProfile = {
        id: 'user-biz-123',
        name: 'Shop Owner',
        email: 'owner@shayona.com',
        phone: '9876543210',
        shop_name: 'Shayona Emporium',
        address: 'Shop 402, Millennium Market, Ring Road, Surat',
        language: 'en',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      const html = pdfService.generateInvoiceHtml({
        invoice: sampleInvoice,
        profile: profileWithAddress,
        language: 'en',
      });

      expect(html).toContain('Shayona Emporium');
      expect(html).toContain('+91 98765 43210');
      expect(html).toContain('Shop 402, Millennium Market, Ring Road, Surat');
      expect(html).toContain('class="shop-address"');
      // Subtotal MUST NOT appear
      expect(html).not.toContain('Subtotal');
      // Grand Total MUST appear
      expect(html).toContain('Grand Total');
      expect(html).toContain('₹15,000.00');
    });

    it('Does NOT render address line or empty placeholder when address is empty or null', () => {
      const profileNoAddress: DbProfile = {
        id: 'user-biz-123',
        name: 'Shop Owner',
        email: 'owner@shayona.com',
        phone: '9876543210',
        shop_name: 'Shayona Emporium',
        address: null,
        language: 'en',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      const html = pdfService.generateInvoiceHtml({
        invoice: sampleInvoice,
        profile: profileNoAddress,
        language: 'en',
      });

      expect(html).toContain('Shayona Emporium');
      expect(html).toContain('+91 98765 43210');
      expect(html).not.toContain('class="shop-address"');
      expect(html).not.toContain('null');
      expect(html).not.toContain('undefined');
    });
  });
});
