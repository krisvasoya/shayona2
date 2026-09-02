import { amountInWords, numberToWordsEn, numberToWordsGu } from '@/src/utils/numberToWords';
import { pdfService, InvoicePdfOptions } from '../pdf.service';
import { InvoiceDetail } from '@/src/types/invoice';
import { DbProfile } from '@/src/types/database';

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: 'file:///mock/invoice.pdf' }),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('Invoice PDF Service & Design Compliance', () => {
  describe('Indian Number to Words Formatting', () => {
    it('should format English currency words correctly', () => {
      expect(numberToWordsEn(27600)).toBe('Twenty Seven Thousand Six Hundred Rupees Only');
      expect(numberToWordsEn(450)).toBe('Four Hundred Fifty Rupees Only');
      expect(numberToWordsEn(100000)).toBe('One Lakh Rupees Only');
      expect(numberToWordsEn(1500000)).toBe('Fifteen Lakh Rupees Only');
      expect(numberToWordsEn(0)).toBe('Zero Rupees Only');
    });

    it('should format Gujarati currency words correctly', () => {
      expect(numberToWordsGu(27600)).toBe('સત્તાવીસ હજાર છસો રૂપિયા પૂરા');
      expect(numberToWordsGu(450)).toBe('ચારસો પચાસ રૂપિયા પૂરા');
      expect(numberToWordsGu(0)).toBe('શૂન્ય રૂપિયા પૂરા');
    });

    it('should use amountInWords with language switch', () => {
      expect(amountInWords(450, 'en')).toBe('Four Hundred Fifty Rupees Only');
      expect(amountInWords(450, 'gu')).toBe('ચારસો પચાસ રૂપિયા પૂરા');
    });
  });

  describe('Invoice HTML Template & Acceptance Test', () => {
    const mockProfile: DbProfile = {
      id: 'usr-123',
      name: 'Shop Owner',
      email: null,
      phone: '+919876543210',
      shop_name: 'Test Retail Store',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const acceptanceInvoice: InvoiceDetail = {
      id: 'inv-001',
      user_id: 'usr-123',
      invoice_number: 'INV-0001',
      party_type: 'CUSTOMER',
      party_id: 'cust-123',
      party_name: 'Test Customer',
      invoice_date: '2026-07-04',
      total_amount: 45000, // ₹450.00
      paid_amount: 20000, // ₹200.00 (Jama)
      remaining_amount: 25000, // ₹250.00 (Baki)
      notes: null,
      pdf_path: null,
      items_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          invoice_id: 'inv-001',
          item_name: 'Product A',
          quantity: 2,
          rate: 10000, // ₹100.00
          amount: 20000, // ₹200.00
          created_at: new Date().toISOString(),
        },
        {
          id: 'item-2',
          invoice_id: 'inv-001',
          item_name: 'Product B',
          quantity: 5,
          rate: 5000, // ₹50.00
          amount: 25000, // ₹250.00
          created_at: new Date().toISOString(),
        },
      ],
    };

    it('should generate valid HTML containing exact sample structure', () => {
      const options: InvoicePdfOptions = {
        invoice: acceptanceInvoice,
        profile: mockProfile,
        language: 'en',
      };

      const html = pdfService.generateInvoiceHtml(options);

      // Title
      expect(html).toContain('INVOICE');

      // Shop Information
      expect(html).toContain('Test Retail Store');
      expect(html).toContain('98765 43210');

      // Invoice Meta
      expect(html).toContain('INV-0001');
      expect(html).toContain('04 Jul 2026');

      // Customer
      expect(html).toContain('Test Customer');
      expect(html).toContain('CUSTOMER');

      // Line items
      expect(html).toContain('Product A');
      expect(html).toContain('Product B');
      expect(html).toContain('₹200.00');
      expect(html).toContain('₹250.00');

      // Totals
      expect(html).toContain('Subtotal');
      expect(html).toContain('Grand Total (₹)');
      expect(html).toContain('₹450.00');

      // Jama & Baki
      expect(html).toContain('Jama / Paid');
      expect(html).toContain('₹200.00');
      expect(html).toContain('Baki');
      expect(html).toContain('₹250.00');

      // Amount in words
      expect(html).toContain('AMOUNT CHARGEABLE (IN WORDS)');
      expect(html).toContain('Four Hundred Fifty Rupees Only');

      // Authorised Signatory
      expect(html).toContain('Authorised Signatory');
      expect(html).toContain('Test Retail Store');
    });

    it('CRITICAL GST CHECK: should contain ZERO GST, Tax, CGST, SGST, IGST, or HSN', () => {
      const options: InvoicePdfOptions = {
        invoice: acceptanceInvoice,
        profile: mockProfile,
        language: 'en',
      };

      const html = pdfService.generateInvoiceHtml(options);

      const gstMatches = html.match(/\b(GSTIN|CGST|SGST|IGST|HSN|TAX INVOICE|GST %|GST AMOUNT)\b/i);
      expect(gstMatches).toBeNull();
      expect(html).not.toContain('TAX INVOICE');
      expect(html).not.toContain('CGST');
      expect(html).not.toContain('SGST');
      expect(html).not.toContain('IGST');
      expect(html).not.toContain('HSN');
    });

    it('should generate Gujarati PDF HTML with embedded fonts', () => {
      const options: InvoicePdfOptions = {
        invoice: acceptanceInvoice,
        profile: mockProfile,
        language: 'gu',
      };

      const html = pdfService.generateInvoiceHtml(options);

      expect(html).toContain('બિલ / ઇનવોઇસ');
      expect(html).toContain('કુલ રકમ (Grand Total)');
      expect(html).toContain('જમા (Jama / Paid)');
      expect(html).toContain('બાકી (Baki / Due)');
      expect(html).toContain('ચારસો પચાસ રૂપિયા પૂરા');
      expect(html).toContain('Noto+Sans+Gujarati');
    });
  });
});
