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

describe('PHASE 8 — Professional Invoice PDF Generation & Tests', () => {
  describe('Indian Number to Words Formatting', () => {
    it('should format English currency words correctly', () => {
      expect(numberToWordsEn(29500)).toBe('Twenty Nine Thousand Five Hundred Rupees Only');
      expect(numberToWordsEn(27600)).toBe('Twenty Seven Thousand Six Hundred Rupees Only');
      expect(numberToWordsEn(450)).toBe('Four Hundred Fifty Rupees Only');
      expect(numberToWordsEn(1000)).toBe('One Thousand Rupees Only');
      expect(numberToWordsEn(100000)).toBe('One Lakh Rupees Only');
      expect(numberToWordsEn(1500000)).toBe('Fifteen Lakh Rupees Only');
      expect(numberToWordsEn(0)).toBe('Zero Rupees Only');
    });

    it('should format Gujarati currency words correctly', () => {
      expect(numberToWordsGu(29500)).toBe('ઓગણત્રીસ હજાર પાંચસો રૂપિયા પૂરા');
      expect(numberToWordsGu(27600)).toBe('સત્તાવીસ હજાર છસો રૂપિયા પૂરા');
      expect(numberToWordsGu(450)).toBe('ચારસો પચાસ રૂપિયા પૂરા');
      expect(numberToWordsGu(0)).toBe('શૂન્ય રૂપિયા પૂરા');
    });

    it('should use amountInWords with language switch', () => {
      expect(amountInWords(29500, 'en')).toBe('Twenty Nine Thousand Five Hundred Rupees Only');
      expect(amountInWords(29500, 'gu')).toBe('ઓગણત્રીસ હજાર પાંચસો રૂપિયા પૂરા');
    });
  });

  describe('Invoice HTML Template & Acceptance Test', () => {
    const mockProfile: DbProfile = {
      id: 'usr-123',
      name: 'Shayona Owner',
      email: null,
      phone: '+919898967433',
      shop_name: 'Shayona Enterprise',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const customerInvoice: InvoiceDetail = {
      id: 'inv-001',
      user_id: 'usr-123',
      invoice_number: 'INV-0001',
      party_type: 'CUSTOMER',
      party_id: 'cust-123',
      party_name: 'Kanti bhai',
      invoice_date: '2026-09-02',
      total_amount: 2950000, // ₹29,500.00
      paid_amount: 0, // ₹0.00 (Jama)
      remaining_amount: 2950000, // ₹29,500.00 (Baki)
      notes: 'Payment due on delivery',
      pdf_path: null,
      items_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          invoice_id: 'inv-001',
          item_name: 'Cotton Fabric Roll (White 40m)',
          quantity: 2,
          rate: 1000000, // ₹10,000.00
          amount: 2000000, // ₹20,000.00
          created_at: new Date().toISOString(),
        },
        {
          id: 'item-2',
          invoice_id: 'inv-001',
          item_name: 'Dyeing & Finishing Batch',
          quantity: 1,
          rate: 950000, // ₹9,500.00
          amount: 950000, // ₹9,500.00
          created_at: new Date().toISOString(),
        },
      ],
    };

    it('should generate valid HTML containing dynamic shop, customer, and unpaid ledger', () => {
      const options: InvoicePdfOptions = {
        invoice: customerInvoice,
        profile: mockProfile,
        language: 'en',
      };

      const html = pdfService.generateInvoiceHtml(options);

      // Title
      expect(html).toContain('INVOICE');
      expect(html).not.toContain('TAX INVOICE');

      // Shop Information (Dynamic)
      expect(html).toContain('Shayona Enterprise');
      expect(html).toContain('+91 98989 67433');

      // Invoice Meta
      expect(html).toContain('INV-0001');
      expect(html).toContain('02 Sep 2026');

      // Customer
      expect(html).toContain('Kanti bhai');
      expect(html).toContain('CUSTOMER');

      // Line items
      expect(html).toContain('Cotton Fabric Roll (White 40m)');
      expect(html).toContain('Dyeing & Finishing Batch');
      expect(html).toContain('₹20,000.00');
      expect(html).toContain('₹9,500.00');

      // Totals
      expect(html).toContain('Subtotal');
      expect(html).toContain('Grand Total (₹)');
      expect(html).toContain('₹29,500.00');

      // Jama & Baki
      expect(html).toContain('Jama / Paid');
      expect(html).toContain('₹0.00');
      expect(html).toContain('Baki');
      expect(html).toContain('₹29,500.00');

      // Amount in words
      expect(html).toContain('AMOUNT CHARGEABLE (IN WORDS)');
      expect(html).toContain('Twenty Nine Thousand Five Hundred Rupees Only');

      // Notes
      expect(html).toContain('Payment due on delivery');

      // Authorised Signatory
      expect(html).toContain('Authorised Signatory');
      expect(html).toContain('Shayona Enterprise');
    });

    it('should generate BUYER invoice PDF with Buyer label and name', () => {
      const buyerInvoice: InvoiceDetail = {
        ...customerInvoice,
        party_type: 'BUYER',
        party_name: 'Wholesale Textile Traders',
      };

      const html = pdfService.generateInvoiceHtml({
        invoice: buyerInvoice,
        profile: mockProfile,
        language: 'en',
      });

      expect(html).toContain('BUYER');
      expect(html).toContain('Wholesale Textile Traders');
    });

    it('should calculate and display partial payment correctly (Paid ₹10,000, Baki ₹19,500)', () => {
      const partialInvoice: InvoiceDetail = {
        ...customerInvoice,
        paid_amount: 1000000,
        remaining_amount: 1950000,
      };

      const html = pdfService.generateInvoiceHtml({
        invoice: partialInvoice,
        profile: mockProfile,
        language: 'en',
      });

      expect(html).toContain('₹10,000.00');
      expect(html).toContain('₹19,500.00');
    });

    it('should calculate and display fully paid invoice (Paid ₹29,500, Baki ₹0.00)', () => {
      const fullyPaidInvoice: InvoiceDetail = {
        ...customerInvoice,
        paid_amount: 2950000,
        remaining_amount: 0,
      };

      const html = pdfService.generateInvoiceHtml({
        invoice: fullyPaidInvoice,
        profile: mockProfile,
        language: 'en',
      });

      expect(html).toContain('₹29,500.00');
      expect(html).toContain('₹0.00');
    });

    it('CRITICAL ZERO-GST CHECK: should contain ZERO GST, Tax, CGST, SGST, IGST, or HSN', () => {
      const html = pdfService.generateInvoiceHtml({
        invoice: customerInvoice,
        profile: mockProfile,
        language: 'en',
      });

      const gstMatches = html.match(/\b(GSTIN|CGST|SGST|IGST|HSN|TAX INVOICE|GST %|GST AMOUNT)\b/i);
      expect(gstMatches).toBeNull();
      expect(html).not.toContain('TAX INVOICE');
      expect(html).not.toContain('CGST');
      expect(html).not.toContain('SGST');
      expect(html).not.toContain('IGST');
      expect(html).not.toContain('HSN');
    });

    it('should handle long text descriptions and party names cleanly without breaking structure', () => {
      const longTextInvoice: InvoiceDetail = {
        ...customerInvoice,
        party_name: 'Shreeji Commercial Wholesale Distributors and Export House Private Limited',
        items: [
          {
            id: 'long-item-1',
            invoice_id: 'inv-001',
            item_name:
              'Premium Combed Cotton 60s Count Yarn with Soft Flow Reactive Dyeing and Bio-wash Finishing Treatment Special Order #49281',
            quantity: 10,
            rate: 295000,
            amount: 2950000,
            created_at: new Date().toISOString(),
          },
        ],
      };

      const html = pdfService.generateInvoiceHtml({
        invoice: longTextInvoice,
        profile: {
          ...mockProfile,
          shop_name: 'Shayona Advanced Textile Manufacturing and Trading Corporation',
        },
        language: 'en',
      });

      expect(html).toContain('Shayona Advanced Textile Manufacturing and Trading Corporation');
      expect(html).toContain(
        'Shreeji Commercial Wholesale Distributors and Export House Private Limited',
      );
      expect(html).toContain('Premium Combed Cotton 60s Count Yarn');
    });

    it('should generate PDF file and return valid file URI', async () => {
      const res = await pdfService.createInvoicePdf({
        invoice: customerInvoice,
        profile: mockProfile,
        language: 'en',
      });

      expect(res.uri).toBeDefined();
      expect(res.uri).toContain('.pdf');
    });
  });
});
