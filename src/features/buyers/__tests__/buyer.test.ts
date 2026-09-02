import { buyerFormSchema } from '../validation';
import { BuyerSummary } from '@/src/types/buyer';

describe('Buyer Module Unit Tests', () => {
  describe('Buyer Form Validation', () => {
    it('should validate valid buyer data', () => {
      const result = buyerFormSchema.safeParse({
        name: 'Mahavir Textiles',
        phone: '9876543210',
        address: 'Shop 104, New Cloth Market, Surat',
      });
      expect(result.success).toBe(true);
    });

    it('should validate buyer with optional fields omitted', () => {
      const result = buyerFormSchema.safeParse({
        name: 'Jay Ambe Traders',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty buyer name', () => {
      const result = buyerFormSchema.safeParse({
        name: '   ',
        phone: '9876543210',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Buyer name is required');
      }
    });

    it('should reject invalid mobile number (non-10 digit)', () => {
      const result = buyerFormSchema.safeParse({
        name: 'Shreeji Enterprise',
        phone: '12345',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid 10-digit mobile number');
      }
    });

    it('should reject overly long address (> 250 characters)', () => {
      const result = buyerFormSchema.safeParse({
        name: 'Shreeji Enterprise',
        address: 'x'.repeat(251),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Safe Buyer Deletion Logic', () => {
    function canDeleteBuyer(buyer: { invoiceCount: number }): {
      allowed: boolean;
      reason?: string;
    } {
      if (buyer.invoiceCount > 0) {
        return {
          allowed: false,
          reason: `Cannot delete buyer because they have ${buyer.invoiceCount} existing invoice(s).`,
        };
      }
      return { allowed: true };
    }

    it('should PREVENT deletion if buyer has active invoices', () => {
      const buyerWithBills = { invoiceCount: 5 };
      const check = canDeleteBuyer(buyerWithBills);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('5 existing invoice(s)');
    });

    it('should ALLOW deletion if buyer has 0 invoices', () => {
      const freshBuyer = { invoiceCount: 0 };
      const check = canDeleteBuyer(freshBuyer);
      expect(check.allowed).toBe(true);
    });
  });

  describe('Buyer Ledger Aggregation', () => {
    it('should accurately aggregate Total Amount, Jama, and Baki', () => {
      const buyerInvoices = [
        { total_amount: 500000, paid_amount: 300000, remaining_amount: 200000 }, // ₹5000 total, ₹3000 paid, ₹2000 baki
        { total_amount: 1000000, paid_amount: 1000000, remaining_amount: 0 }, // ₹10000 fully paid
        { total_amount: 200000, paid_amount: 50000, remaining_amount: 150000 }, // ₹2000 total, ₹500 paid, ₹1500 baki
      ];

      const buyerStats: Pick<
        BuyerSummary,
        'total_bills' | 'total_amount' | 'total_jama' | 'total_baki'
      > = {
        total_bills: buyerInvoices.length,
        total_amount: buyerInvoices.reduce((sum, inv) => sum + inv.total_amount, 0),
        total_jama: buyerInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0),
        total_baki: buyerInvoices.reduce((sum, inv) => sum + inv.remaining_amount, 0),
      };

      expect(buyerStats.total_bills).toBe(3);
      expect(buyerStats.total_amount).toBe(1700000); // ₹17,000.00
      expect(buyerStats.total_jama).toBe(1350000); // ₹13,500.00
      expect(buyerStats.total_baki).toBe(350000); // ₹3,500.00
      expect(buyerStats.total_amount - buyerStats.total_jama).toBe(buyerStats.total_baki);
    });
  });
});
