import { invoiceItemFormSchema, invoiceFormSchema } from '../validation';
import { rupeesToPaise, formatCurrency, paiseToRupees } from '@/src/utils';

describe('Invoice Core Module Unit Tests', () => {
  describe('Invoice Item Validation', () => {
    it('should validate valid line item', () => {
      const result = invoiceItemFormSchema.safeParse({
        item_name: 'Cotton Fabric 100m',
        quantity: 10,
        rate_rupees: 150.5,
      });
      expect(result.success).toBe(true);
    });

    it('should validate decimal quantities (e.g. 2.5 kg or 1.75 meters)', () => {
      const result = invoiceItemFormSchema.safeParse({
        item_name: 'Loose Tea Pack',
        quantity: 2.5,
        rate_rupees: 320,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty or whitespace item name', () => {
      const result = invoiceItemFormSchema.safeParse({
        item_name: '   ',
        quantity: 1,
        rate_rupees: 100,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Item name is required');
      }
    });

    it('should reject invalid or non-positive quantities (<= 0)', () => {
      expect(
        invoiceItemFormSchema.safeParse({
          item_name: 'Item A',
          quantity: 0,
          rate_rupees: 100,
        }).success,
      ).toBe(false);

      expect(
        invoiceItemFormSchema.safeParse({
          item_name: 'Item A',
          quantity: -5,
          rate_rupees: 100,
        }).success,
      ).toBe(false);
    });

    it('should allow zero rate (free samples / promotional)', () => {
      const result = invoiceItemFormSchema.safeParse({
        item_name: 'Free Sample Pouch',
        quantity: 1,
        rate_rupees: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative rates', () => {
      const result = invoiceItemFormSchema.safeParse({
        item_name: 'Sample',
        quantity: 1,
        rate_rupees: -50,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Invoice Form Validation', () => {
    it('should validate valid complete invoice', () => {
      const result = invoiceFormSchema.safeParse({
        invoice_number: 'INV-0001',
        party_type: 'CUSTOMER',
        party_id: 'cust-uuid-1234',
        party_name: 'Ramesh Patel',
        invoice_date: '2026-09-02',
        items: [
          { item_name: 'Item 1', quantity: 2, rate_rupees: 250 },
          { item_name: 'Item 2', quantity: 1, rate_rupees: 500 },
        ],
        paid_amount_rupees: 500,
        notes: 'Payment via UPI',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invoice with empty items array', () => {
      const result = invoiceFormSchema.safeParse({
        invoice_number: 'INV-0001',
        party_type: 'CUSTOMER',
        party_id: 'cust-uuid-1234',
        party_name: 'Ramesh Patel',
        invoice_date: '2026-09-02',
        items: [],
        paid_amount_rupees: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('At least one line item is required');
      }
    });

    it('should reject invoice without party', () => {
      const result = invoiceFormSchema.safeParse({
        invoice_number: 'INV-0001',
        party_type: 'CUSTOMER',
        party_id: '   ',
        party_name: '',
        invoice_date: '2026-09-02',
        items: [{ item_name: 'Item 1', quantity: 1, rate_rupees: 100 }],
        paid_amount_rupees: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Item & Total Financial Arithmetic (Paise Precision)', () => {
    it('should calculate individual item amount in integer paise without floating point drift', () => {
      // 3 items at ₹33.33 = 3 * 3333 = 9999 paise
      const qty = 3;
      const rateRupees = 33.33;
      const ratePaise = rupeesToPaise(rateRupees);
      const amountPaise = Math.round(qty * ratePaise);

      expect(amountPaise).toBe(9999);
      expect(paiseToRupees(amountPaise)).toBe(99.99);
    });

    it('should sum multiple line items accurately into total bill amount', () => {
      const items = [
        { item_name: 'Item A', quantity: 2, rate_rupees: 149.5 }, // 2 * 14950 = 29900 paise (₹299.00)
        { item_name: 'Item B', quantity: 5, rate_rupees: 100.0 }, // 5 * 10000 = 50000 paise (₹500.00)
        { item_name: 'Item C', quantity: 1.5, rate_rupees: 200.0 }, // 1.5 * 20000 = 30000 paise (₹300.00)
      ];

      const itemAmounts = items.map(it => Math.round(it.quantity * rupeesToPaise(it.rate_rupees)));
      const totalAmountPaise = itemAmounts.reduce((sum, amt) => sum + amt, 0);

      expect(totalAmountPaise).toBe(109900); // ₹1,099.00
      expect(formatCurrency(totalAmountPaise)).toContain('1,099.00');
    });

    it('should correctly calculate Remaining Due (Baki) = Total - Paid', () => {
      const totalAmountPaise = 100000; // ₹1,000.00
      const paidAmountPaise = 40000; // ₹400.00 (Jama)
      const remainingAmountPaise = Math.max(0, totalAmountPaise - paidAmountPaise); // ₹600.00 (Baki)

      expect(remainingAmountPaise).toBe(60000);
      expect(formatCurrency(remainingAmountPaise)).toContain('600.00');
    });

    it('should handle fully paid invoice (Remaining = 0)', () => {
      const totalAmountPaise = 250000; // ₹2,500.00
      const paidAmountPaise = 250000; // ₹2,500.00
      const remainingAmountPaise = Math.max(0, totalAmountPaise - paidAmountPaise);

      expect(remainingAmountPaise).toBe(0);
    });

    it('should prevent negative remaining amount when paid > total', () => {
      const totalAmountPaise = 50000; // ₹500.00
      const paidAmountPaise = 60000; // ₹600.00
      const remainingAmountPaise = Math.max(0, totalAmountPaise - paidAmountPaise);

      expect(remainingAmountPaise).toBe(0);
    });
  });

  describe('Sequential Invoice Numbering Strategy', () => {
    it('should format sequential numbers with 4 digits padding', () => {
      const generateNumber = (count: number) => `INV-${String(count + 1).padStart(4, '0')}`;

      expect(generateNumber(0)).toBe('INV-0001');
      expect(generateNumber(9)).toBe('INV-0010');
      expect(generateNumber(99)).toBe('INV-0100');
      expect(generateNumber(1005)).toBe('INV-1006');
    });
  });
});
