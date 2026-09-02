import { getDateRange, formatLocalDate } from '../dateUtils';

describe('Dashboard Feature Module Unit Tests', () => {
  describe('Date Range Calculation Utilities', () => {
    it('should format date to local YYYY-MM-DD correctly', () => {
      const d = new Date(2026, 8, 2); // 2026-09-02 (month is 0-indexed)
      expect(formatLocalDate(d)).toBe('2026-09-02');
    });

    it('should calculate TODAY date range as single calendar day', () => {
      const range = getDateRange('TODAY');
      expect(range.startDate).toBe(range.endDate);
      expect(range.label).toBe('Today');
    });

    it('should calculate THIS_WEEK range from Monday to Sunday', () => {
      const range = getDateRange('THIS_WEEK');
      expect(range.startDate).toBeDefined();
      expect(range.endDate).toBeDefined();
      expect(range.startDate <= range.endDate).toBe(true);
      expect(range.label).toBe('This Week');
    });

    it('should calculate THIS_MONTH range from 1st to end of month', () => {
      const range = getDateRange('THIS_MONTH');
      expect(range.startDate.endsWith('-01')).toBe(true);
      expect(range.endDate >= range.startDate).toBe(true);
      expect(range.label).toBe('This Month');
    });

    it('should calculate THIS_YEAR range from Jan 1 to Dec 31', () => {
      const range = getDateRange('THIS_YEAR');
      expect(range.startDate.endsWith('-01-01')).toBe(true);
      expect(range.endDate.endsWith('-12-31')).toBe(true);
      expect(range.label).toBe('This Year');
    });

    it('should calculate CUSTOM date range properly and handle inverted dates', () => {
      const range = getDateRange('CUSTOM', {
        from: '2026-08-15',
        to: '2026-08-01',
      });
      expect(range.startDate).toBe('2026-08-01');
      expect(range.endDate).toBe('2026-08-15');
      expect(range.label).toBe('2026-08-01 to 2026-08-15');
    });
  });

  describe('Ledger Calculation & Aggregation Logic', () => {
    it('Case A: should aggregate unpaid invoice (Paid ₹0, Baki ₹29,500)', () => {
      const invoices = [{ total_amount: 2950000, paid_amount: 0, remaining_amount: 2950000 }];

      const totalBilled = invoices.reduce((sum, i) => sum + i.total_amount, 0);
      const totalJama = invoices.reduce((sum, i) => sum + i.paid_amount, 0);
      const totalBaki = invoices.reduce((sum, i) => sum + i.remaining_amount, 0);
      const pendingCount = invoices.filter(i => i.remaining_amount > 0).length;

      expect(totalBilled).toBe(2950000);
      expect(totalJama).toBe(0);
      expect(totalBaki).toBe(2950000);
      expect(pendingCount).toBe(1);
    });

    it('Case B: should aggregate partially paid invoice (Paid ₹10,000, Baki ₹19,500)', () => {
      const invoices = [{ total_amount: 2950000, paid_amount: 1000000, remaining_amount: 1950000 }];

      const totalBilled = invoices.reduce((sum, i) => sum + i.total_amount, 0);
      const totalJama = invoices.reduce((sum, i) => sum + i.paid_amount, 0);
      const totalBaki = invoices.reduce((sum, i) => sum + i.remaining_amount, 0);
      const pendingCount = invoices.filter(i => i.remaining_amount > 0).length;

      expect(totalBilled).toBe(2950000);
      expect(totalJama).toBe(1000000);
      expect(totalBaki).toBe(1950000);
      expect(pendingCount).toBe(1);
    });

    it('Case C: should aggregate fully paid invoice (Paid ₹29,500, Baki ₹0)', () => {
      const invoices = [{ total_amount: 2950000, paid_amount: 2950000, remaining_amount: 0 }];

      const totalBilled = invoices.reduce((sum, i) => sum + i.total_amount, 0);
      const totalJama = invoices.reduce((sum, i) => sum + i.paid_amount, 0);
      const totalBaki = invoices.reduce((sum, i) => sum + i.remaining_amount, 0);
      const pendingCount = invoices.filter(i => i.remaining_amount > 0).length;

      expect(totalBilled).toBe(2950000);
      expect(totalJama).toBe(2950000);
      expect(totalBaki).toBe(0);
      expect(pendingCount).toBe(0);
    });
  });
});
