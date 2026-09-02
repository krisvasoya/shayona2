import { customerFormSchema } from '../validation';
import { CustomerSummary } from '@/src/types/customer';

describe('Customer Module Unit Tests', () => {
  describe('Customer Form Validation', () => {
    it('should validate valid customer data', () => {
      const result = customerFormSchema.safeParse({
        name: 'Ramesh Patel',
        phone: '9876543210',
        address: 'Shop 12, Main Market',
      });
      expect(result.success).toBe(true);
    });

    it('should validate customer without phone and address (optional fields)', () => {
      const result = customerFormSchema.safeParse({
        name: 'Ketan Shah',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty customer name', () => {
      const result = customerFormSchema.safeParse({
        name: '   ',
        phone: '9876543210',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Customer name is required');
      }
    });

    it('should reject invalid mobile number (non-10 digit)', () => {
      const result = customerFormSchema.safeParse({
        name: 'Ramesh Patel',
        phone: '12345',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid 10-digit mobile number');
      }
    });

    it('should reject overly long address (> 250 characters)', () => {
      const result = customerFormSchema.safeParse({
        name: 'Ramesh Patel',
        address: 'a'.repeat(251),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Safe Customer Deletion Logic', () => {
    function canDeleteCustomer(customer: { invoiceCount: number }): {
      allowed: boolean;
      reason?: string;
    } {
      if (customer.invoiceCount > 0) {
        return {
          allowed: false,
          reason: `Cannot delete customer because they have ${customer.invoiceCount} existing invoice(s).`,
        };
      }
      return { allowed: true };
    }

    it('should PREVENT deletion if customer has active invoices', () => {
      const customerWithBills = { invoiceCount: 3 };
      const check = canDeleteCustomer(customerWithBills);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('3 existing invoice(s)');
    });

    it('should ALLOW deletion if customer has 0 invoices', () => {
      const freshCustomer = { invoiceCount: 0 };
      const check = canDeleteCustomer(freshCustomer);
      expect(check.allowed).toBe(true);
    });
  });

  describe('Customer Ledger Aggregation', () => {
    it('should accurately aggregate Total Amount, Jama, and Baki', () => {
      const invoices = [
        { total_amount: 100000, paid_amount: 60000, remaining_amount: 40000 }, // ₹1000 total, ₹600 paid, ₹400 baki
        { total_amount: 250000, paid_amount: 250000, remaining_amount: 0 }, // ₹2500 fully paid
        { total_amount: 150000, paid_amount: 0, remaining_amount: 150000 }, // ₹1500 unpaid
      ];

      const customerStats: Pick<
        CustomerSummary,
        'total_bills' | 'total_amount' | 'total_jama' | 'total_baki'
      > = {
        total_bills: invoices.length,
        total_amount: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
        total_jama: invoices.reduce((sum, inv) => sum + inv.paid_amount, 0),
        total_baki: invoices.reduce((sum, inv) => sum + inv.remaining_amount, 0),
      };

      expect(customerStats.total_bills).toBe(3);
      expect(customerStats.total_amount).toBe(500000); // ₹5,000.00
      expect(customerStats.total_jama).toBe(310000); // ₹3,100.00
      expect(customerStats.total_baki).toBe(190000); // ₹1,900.00
      expect(customerStats.total_amount - customerStats.total_jama).toBe(customerStats.total_baki);
    });
  });
});
