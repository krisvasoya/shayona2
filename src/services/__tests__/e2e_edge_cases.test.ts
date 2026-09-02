import { formatCurrency, rupeesToPaise, paiseToRupees, amountInWords } from '@/src/utils';
import { pdfService } from '@/src/services/pdf.service';
import { getDateRange } from '@/src/features/dashboard/dateUtils';
import { DbInvoice, DbProfile } from '@/src/types/database';
import { InvoiceDetail } from '@/src/types/invoice';

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

describe('Phase 15: End-to-End System, Edge-Case & Data-Integrity Test Suite', () => {
  const userAProfile: DbProfile = {
    id: 'usr-e2e-1111',
    name: 'Shayona Owner',
    email: 'shayona@test.internal',
    phone: '9876543210',
    shop_name: 'Shayona Enterprise & Co.',
    address: null,
    language: 'en',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  describe('1. Large Amounts & Decimal Arithmetic Precision', () => {
    it('Accurately calculates and formats small decimals without floating point loss', () => {
      const decimals = [10.5, 99.99, 100.25, 999.95];
      decimals.forEach(rupeeVal => {
        const paise = rupeesToPaise(rupeeVal);
        const backToRupees = paiseToRupees(paise);
        expect(backToRupees).toBeCloseTo(rupeeVal, 2);
      });

      // 3 items @ ₹33.33 = ₹99.99 (9999 paise)
      const qty = 3;
      const ratePaise = rupeesToPaise(33.33);
      const totalPaise = qty * ratePaise;
      expect(totalPaise).toBe(9999);
      expect(paiseToRupees(totalPaise)).toBe(99.99);
      expect(formatCurrency(totalPaise)).toBe('₹99.99');
    });

    it('Accurately handles and formats large numbers up to ₹1,00,00,000.00 (1 Crore)', () => {
      const largeAmounts = [
        { rupees: 99999.99, paise: 9999999, formatted: '₹99,999.99' },
        { rupees: 999999.99, paise: 99999999, formatted: '₹9,99,999.99' },
        { rupees: 9999999.99, paise: 999999999, formatted: '₹99,99,999.99' },
        { rupees: 10000000.0, paise: 1000000000, formatted: '₹1,00,00,000.00' },
      ];

      largeAmounts.forEach(({ rupees, paise, formatted }) => {
        expect(rupeesToPaise(rupees)).toBe(paise);
        expect(paiseToRupees(paise)).toBe(rupees);
        expect(formatCurrency(paise)).toBe(formatted);
      });
    });

    it('Generates correct amount in words for large and decimal amounts', () => {
      expect(amountInWords(29500)).toBe('Twenty Nine Thousand Five Hundred Rupees Only');
      expect(amountInWords(99999)).toBe(
        'Ninety Nine Thousand Nine Hundred Ninety Nine Rupees Only',
      );
      expect(amountInWords(10000000)).toBe('One Crore Rupees Only');
    });
  });

  describe('2. Multi-Item Invoice Integrity', () => {
    it('Calculates subtotal, total, Jama, and Baki for 1, 2, 5, 10 items without discrepancy', () => {
      const itemConfigs = [
        { qty: 2, rate: 100.0 }, // 200.00
        { qty: 5, rate: 50.0 }, // 250.00
        { qty: 10, rate: 12.5 }, // 125.00
        { qty: 4, rate: 250.75 }, // 1003.00
        { qty: 1, rate: 999.95 }, // 999.95
        { qty: 3, rate: 333.33 }, // 999.99
        { qty: 6, rate: 45.0 }, // 270.00
        { qty: 8, rate: 15.25 }, // 122.00
        { qty: 12, rate: 8.5 }, // 102.00
        { qty: 7, rate: 77.7 }, // 543.90
      ];

      let runningTotalPaise = 0;
      itemConfigs.forEach(item => {
        const itemAmountPaise = Math.round(item.qty * rupeesToPaise(item.rate));
        runningTotalPaise += itemAmountPaise;
      });

      expect(runningTotalPaise).toBe(461584); // ₹4,615.84
      expect(paiseToRupees(runningTotalPaise)).toBe(4615.84);

      // Financial invariant: Baki = Total - Jama
      const jamaPaise = rupeesToPaise(2000);
      const bakiPaise = Math.max(0, runningTotalPaise - jamaPaise);
      expect(bakiPaise).toBe(261584); // ₹2,615.84
      expect(jamaPaise + bakiPaise).toBe(runningTotalPaise);
    });
  });

  describe('3. Dashboard Date Range & Filter Boundary Integrity', () => {
    it('Computes Today range with inclusive single-day boundaries', () => {
      const today = getDateRange('TODAY');
      expect(today.startDate).toBe(today.endDate);
    });

    it('Computes This Month range spanning exactly 1st to last day of the current month', () => {
      const thisMonth = getDateRange('THIS_MONTH');
      expect(thisMonth.startDate).toMatch(/^\d{4}-\d{2}-01$/);
      // Validates end day is 28, 29, 30, or 31
      const endDay = parseInt(thisMonth.endDate.split('-')[2], 10);
      expect([28, 29, 30, 31]).toContain(endDay);
    });

    it('Computes This Year range spanning Jan 01 to Dec 31', () => {
      const thisYear = getDateRange('THIS_YEAR');
      expect(thisYear.startDate).toMatch(/^\d{4}-01-01$/);
      expect(thisYear.endDate).toMatch(/^\d{4}-12-31$/);
    });

    it('Computes Custom Date Range spanning arbitrary boundaries', () => {
      const custom = getDateRange('CUSTOM', { from: '2026-03-15', to: '2026-09-02' });
      expect(custom.startDate).toBe('2026-03-15');
      expect(custom.endDate).toBe('2026-09-02');
    });

    it('Gracefully formats empty dashboard values without NaN or undefined strings', () => {
      const emptyTotalBilled = 0;
      const emptyTotalJama = 0;
      const emptyTotalBaki = 0;

      expect(formatCurrency(emptyTotalBilled)).toBe('₹0.00');
      expect(formatCurrency(emptyTotalJama)).toBe('₹0.00');
      expect(formatCurrency(emptyTotalBaki)).toBe('₹0.00');
    });
  });

  describe('4. Customer & Buyer PDF Document Restriction Audit', () => {
    const sampleInvoice: InvoiceDetail = {
      id: 'inv-doc-test',
      user_id: userAProfile.id,
      invoice_number: 'INV-2026-999',
      party_type: 'CUSTOMER',
      party_id: 'cust-999',
      party_name: "Kanti 'M' Bhai & Sons (GIDC)",
      invoice_date: '2026-09-02',
      total_amount: 2950000, // ₹29,500
      paid_amount: 1000000, // ₹10,000 internal Jama
      remaining_amount: 1950000, // ₹19,500 internal Baki
      pdf_path: null,
      notes: 'Hand delivered package',
      created_at: '2026-09-02T10:00:00Z',
      updated_at: '2026-09-02T10:00:00Z',
      items_count: 2,
      items: [
        {
          id: 'item-1',
          invoice_id: 'inv-doc-test',
          item_name: 'Cotton Fabric Roll (100% Pure)',
          quantity: 2,
          rate: 1000000, // ₹10,000
          amount: 2000000, // ₹20,000
          created_at: '2026-09-02T10:00:00Z',
        },
        {
          id: 'item-2',
          invoice_id: 'inv-doc-test',
          item_name: 'Silk Thread Spool',
          quantity: 1,
          rate: 950000, // ₹9,500
          amount: 950000, // ₹9,500
          created_at: '2026-09-02T10:00:00Z',
        },
      ],
    };

    it('English customer PDF contains Grand Total, Words, and Authorised Signatory without Subtotal', () => {
      const html = pdfService.generateInvoiceHtml({
        invoice: sampleInvoice,
        profile: userAProfile,
        language: 'en',
      });

      expect(html).toContain('INV-2026-999');
      expect(html).toContain('Shayona Enterprise &amp; Co.');
      expect(html).toContain('Grand Total');
      expect(html).not.toContain('Subtotal');
      expect(html).toContain('₹29,500.00');
      expect(html).toContain('Twenty Nine Thousand Five Hundred Rupees Only');
      expect(html).toContain('Authorised Signatory');
    });

    it('English customer PDF STRICTLY excludes GST, CGST, SGST, IGST, HSN, Tax, Jama, and Baki', () => {
      const html = pdfService.generateInvoiceHtml({
        invoice: sampleInvoice,
        profile: userAProfile,
        language: 'en',
      });

      // Internal tax/financial terms that must NOT be leaked onto customer invoice
      expect(html).not.toMatch(/\bGST\b/i);
      expect(html).not.toMatch(/\bCGST\b/i);
      expect(html).not.toMatch(/\bSGST\b/i);
      expect(html).not.toMatch(/\bIGST\b/i);
      expect(html).not.toMatch(/\bHSN\b/i);
      expect(html).not.toMatch(/\bTax\b/i);
      expect(html).not.toMatch(/\bJama\b/i);
      expect(html).not.toMatch(/\bPaid Amount\b/i);
      expect(html).not.toMatch(/\bBaki\b/i);
      expect(html).not.toMatch(/\bRemaining Due\b/i);
    });

    it('Gujarati customer PDF renders proper Gujarati typography without placeholder glyphs', () => {
      const html = pdfService.generateInvoiceHtml({
        invoice: sampleInvoice,
        profile: userAProfile,
        language: 'gu',
      });

      expect(html).toContain('કુલ રકમ');
      expect(html).toContain('સહી / સિક્કો');
      expect(html).not.toContain('□');
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
    });

    it('Escapes special characters (&, <, >, \', ") safely in HTML without breakage', () => {
      const specialPartyInvoice: InvoiceDetail = {
        ...sampleInvoice,
        party_name: 'Alpha & Omega <Traders> "Gold" & \'Silver\'',
      };

      const html = pdfService.generateInvoiceHtml({
        invoice: specialPartyInvoice,
        profile: userAProfile,
        language: 'en',
      });

      expect(html).toContain(
        'Alpha &amp; Omega &lt;Traders&gt; &quot;Gold&quot; &amp; &#39;Silver&#39;',
      );
    });
  });

  describe('5. Search Query Sanitization & Filter Robustness', () => {
    const mockInvoices: Partial<DbInvoice>[] = [
      { id: '1', invoice_number: 'INV-0001', total_amount: 100000, remaining_amount: 100000 },
      { id: '2', invoice_number: 'INV-0002', total_amount: 200000, remaining_amount: 0 },
      { id: '3', invoice_number: 'INV-0003', total_amount: 300000, remaining_amount: 150000 },
    ];

    it('Filters invoices correctly by Baki and Paid status', () => {
      const bakiInvoices = mockInvoices.filter(inv => Number(inv.remaining_amount) > 0);
      const paidInvoices = mockInvoices.filter(inv => Number(inv.remaining_amount) === 0);

      expect(bakiInvoices).toHaveLength(2);
      expect(paidInvoices).toHaveLength(1);
      expect(paidInvoices[0].invoice_number).toBe('INV-0002');
    });
  });
});
