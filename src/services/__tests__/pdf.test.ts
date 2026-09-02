import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { amountInWords, numberToWordsEn, numberToWordsGu } from '@/src/utils/numberToWords';
import { pdfService, InvoicePdfOptions } from '../pdf.service';
import { InvoiceDetail } from '@/src/types/invoice';
import { DbProfile } from '@/src/types/database';

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

describe('PHASE 8 & 9 — Professional Invoice PDF Generation & Delivery Tests', () => {
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

  describe('Customer-Facing Invoice HTML Template (Subtotal & Grand Total ONLY)', () => {
    const mockProfile: DbProfile = {
      id: 'usr-123',
      name: 'Owner',
      email: null,
      phone: '9898967433',
      shop_name: 'Shayona Enterprise',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const customerInvoice: InvoiceDetail = {
      id: 'inv-001',
      user_id: 'usr-123',
      invoice_number: 'INV-0001',
      invoice_date: '2026-09-02',
      party_type: 'CUSTOMER',
      party_id: 'cust-1',
      party_name: 'Kanti bhai',
      total_amount: 2950000,
      paid_amount: 0,
      remaining_amount: 2950000,
      pdf_path: null,
      notes: 'Payment due on delivery',
      items_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          invoice_id: 'inv-001',
          item_name: 'Cotton Fabric Roll (White 40m)',
          quantity: 2,
          rate: 1000000,
          amount: 2000000,
          created_at: new Date().toISOString(),
        },
        {
          id: 'item-2',
          invoice_id: 'inv-001',
          item_name: 'Dyeing & Finishing Batch',
          quantity: 1,
          rate: 950000,
          amount: 950000,
          created_at: new Date().toISOString(),
        },
      ],
    };

    const buyerInvoice: InvoiceDetail = {
      id: 'inv-002',
      user_id: 'usr-123',
      invoice_number: 'INV-0002',
      invoice_date: '2026-09-02',
      party_type: 'BUYER',
      party_id: 'buy-1',
      party_name: 'Manish Textile Wholesale Hub',
      total_amount: 5000000,
      paid_amount: 2000000,
      remaining_amount: 3000000,
      pdf_path: null,
      notes: 'Wholesale delivery',
      items_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'item-3',
          invoice_id: 'inv-002',
          item_name: 'Polyester Silk Dress Material (50 Sets)',
          quantity: 50,
          rate: 100000,
          amount: 5000000,
          created_at: new Date().toISOString(),
        },
      ],
    };

    it('should generate exact customer-facing non-GST invoice with Subtotal & Grand Total ONLY', () => {
      const options: InvoicePdfOptions = {
        invoice: customerInvoice,
        profile: mockProfile,
        language: 'en',
      };

      const html = pdfService.generateInvoiceHtml(options);

      // Shop Information (Dynamic)
      expect(html).toContain('Shayona Enterprise');
      expect(html).toContain('+91 98989 67433');

      // Invoice Meta
      expect(html).toContain('INV-0001');
      expect(html).toContain('02 Sep 2026');

      // Customer
      expect(html).toContain('Kanti bhai');
      expect(html).toContain('CUSTOMER');

      // Items
      expect(html).toContain('Cotton Fabric Roll (White 40m)');
      expect(html).toContain('Dyeing &amp; Finishing Batch');
      expect(html).toContain('₹20,000.00');
      expect(html).toContain('₹9,500.00');

      // Totals: MUST contain Subtotal and Grand Total ONLY
      expect(html).toContain('Subtotal');
      expect(html).toContain('Grand Total');
      expect(html).toContain('₹29,500.00');

      // STRICT CHECK: MUST NOT CONTAIN JAMA OR BAKI
      expect(html).not.toContain('Jama');
      expect(html).not.toContain('Paid Amount');
      expect(html).not.toContain('Baki');
      expect(html).not.toContain('Remaining Due');

      // Amount in Words
      expect(html).toContain('Twenty Nine Thousand Five Hundred Rupees Only');

      // Authorised Signatory
      expect(html).toContain('Authorised Signatory');
      expect(html).toContain('Shayona Enterprise');
    });

    it('should render BUYER invoices with Subtotal and Grand Total ONLY, without Jama or Baki', () => {
      const options: InvoicePdfOptions = {
        invoice: buyerInvoice,
        profile: mockProfile,
        language: 'en',
      };

      const html = pdfService.generateInvoiceHtml(options);

      expect(html).toContain('BUYER');
      expect(html).toContain('Manish Textile Wholesale Hub');
      expect(html).toContain('Polyester Silk Dress Material');
      expect(html).toContain('Subtotal');
      expect(html).toContain('Grand Total');
      expect(html).toContain('₹50,000.00');
      expect(html).toContain('Fifty Thousand Rupees Only');

      // STRICT CHECK: NO Jama, NO Baki in customer-facing PDF
      expect(html).not.toContain('Jama');
      expect(html).not.toContain('Baki');
    });

    it('should render Gujarati customer-facing invoice with Subtotal & Grand Total ONLY', () => {
      const options: InvoicePdfOptions = {
        invoice: customerInvoice,
        profile: mockProfile,
        language: 'gu',
      };

      const html = pdfService.generateInvoiceHtml(options);

      expect(html).toContain('ઇનવોઇસ (INVOICE)');
      expect(html).toContain('ગ્રાહક (CUSTOMER)');
      expect(html).toContain('સબટોટલ (Subtotal)');
      expect(html).toContain('કુલ રકમ (Grand Total)');
      expect(html).toContain('ઓગણત્રીસ હજાર પાંચસો રૂપિયા પૂરા');
      expect(html).toContain('સહી / સિક્કો');

      // STRICT CHECK: NO Jama, NO Baki in Gujarati customer-facing PDF
      expect(html).not.toContain('જમા');
      expect(html).not.toContain('બાકી');
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

    it('should generate PDF file and return valid file URI', async () => {
      const res = await pdfService.createInvoicePdf({
        invoice: customerInvoice,
        profile: mockProfile,
        language: 'en',
      });

      expect(res.uri).toBeDefined();
      expect(res.uri).toContain('.pdf');
    });

    it('PHASE 9: should invoke native sharing with application/pdf MIME type and dialog title', async () => {
      const shareSpy = jest.spyOn(Sharing, 'shareAsync');
      await pdfService.shareInvoicePdf('file:///mock/cache/Invoice-INV-0001.pdf', 'INV-0001');

      expect(shareSpy).toHaveBeenCalledWith(
        'file:///mock/cache/Invoice-INV-0001.pdf',
        expect.objectContaining({
          mimeType: 'application/pdf',
          dialogTitle: 'Share Bill #INV-0001',
        }),
      );
    });

    it('PHASE 9: should support WhatsApp sharing with custom WhatsApp dialog title', async () => {
      const shareSpy = jest.spyOn(Sharing, 'shareAsync');
      await pdfService.shareInvoiceViaWhatsApp(
        'file:///mock/cache/Invoice-INV-0001.pdf',
        'INV-0001',
      );

      expect(shareSpy).toHaveBeenCalledWith(
        'file:///mock/cache/Invoice-INV-0001.pdf',
        expect.objectContaining({
          mimeType: 'application/pdf',
          dialogTitle: 'Send Bill #INV-0001 via WhatsApp',
        }),
      );
    });

    it('PHASE 9: should invoke native printing via expo-print printAsync', async () => {
      const printSpy = jest.spyOn(Print, 'printAsync');
      await pdfService.printInvoice({
        invoice: customerInvoice,
        profile: mockProfile,
        language: 'en',
      });

      expect(printSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('INVOICE'),
        }),
      );
    });
  });
});
