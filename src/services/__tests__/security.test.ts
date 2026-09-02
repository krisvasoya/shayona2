import { formatCurrency, rupeesToPaise, paiseToRupees } from '@/src/utils';

describe('Multi-User Security & Isolation Logic', () => {
  const userA = { id: '11111111-1111-1111-1111-111111111111', shopName: 'Shop A' };
  const userB = { id: '22222222-2222-2222-2222-222222222222', shopName: 'Shop B' };

  // Simulated in-memory database with RLS policy evaluation
  interface MockRow {
    id: string;
    user_id: string;
    name: string;
  }

  const database: { customers: MockRow[] } = {
    customers: [
      { id: 'c1', user_id: userA.id, name: 'Customer of Shop A' },
      { id: 'c2', user_id: userB.id, name: 'Customer of Shop B' },
    ],
  };

  function evaluateSelectRLS(currentUserId: string, tableName: 'customers'): MockRow[] {
    return database[tableName].filter(row => row.user_id === currentUserId);
  }

  function evaluateUpdateRLS(
    currentUserId: string,
    tableName: 'customers',
    recordId: string,
    updates: Partial<MockRow>,
  ): boolean {
    const row = database[tableName].find(r => r.id === recordId && r.user_id === currentUserId);
    if (!row) return false; // RLS blocks update
    Object.assign(row, updates);
    return true;
  }

  function evaluateDeleteRLS(
    currentUserId: string,
    tableName: 'customers',
    recordId: string,
  ): boolean {
    const idx = database[tableName].findIndex(
      r => r.id === recordId && r.user_id === currentUserId,
    );
    if (idx === -1) return false; // RLS blocks delete
    database[tableName].splice(idx, 1);
    return true;
  }

  function evaluateStoragePathRLS(currentUserId: string, storagePath: string): boolean {
    // Expected path: invoices/{user_id}/{year}/{invoice_id}.pdf
    const parts = storagePath.split('/');
    const pathOwnerId = parts[0] === 'invoices' ? parts[1] : parts[0];
    return pathOwnerId === currentUserId;
  }

  describe('Customer & Buyer Data Isolation', () => {
    it('User A should only be able to SELECT their own records', () => {
      const recordsForA = evaluateSelectRLS(userA.id, 'customers');
      expect(recordsForA).toHaveLength(1);
      expect(recordsForA[0].name).toBe('Customer of Shop A');
      expect(recordsForA.every(r => r.user_id === userA.id)).toBe(true);
    });

    it('User B should only be able to SELECT their own records', () => {
      const recordsForB = evaluateSelectRLS(userB.id, 'customers');
      expect(recordsForB).toHaveLength(1);
      expect(recordsForB[0].name).toBe('Customer of Shop B');
      expect(recordsForB.every(r => r.user_id === userB.id)).toBe(true);
    });

    it('User A CANNOT update User B records (RLS rejection)', () => {
      const success = evaluateUpdateRLS(userA.id, 'customers', 'c2', { name: 'Hacked Name' });
      expect(success).toBe(false);
      expect(database.customers.find(c => c.id === 'c2')?.name).toBe('Customer of Shop B');
    });

    it('User A CANNOT delete User B records (RLS rejection)', () => {
      const success = evaluateDeleteRLS(userA.id, 'customers', 'c2');
      expect(success).toBe(false);
      expect(database.customers.some(c => c.id === 'c2')).toBe(true);
    });
  });

  describe('Storage PDF Isolation', () => {
    it('User A can access their own PDF path', () => {
      const pathA = `invoices/${userA.id}/2026/inv-001.pdf`;
      expect(evaluateStoragePathRLS(userA.id, pathA)).toBe(true);
    });

    it('User A CANNOT access User B PDF path', () => {
      const pathB = `invoices/${userB.id}/2026/inv-002.pdf`;
      expect(evaluateStoragePathRLS(userA.id, pathB)).toBe(false);
    });
  });

  describe('Financial Money Calculations (Paise Integer Arithmetic)', () => {
    it('should calculate monetary values deterministically without floating point drift', () => {
      // 3 items at ₹33.33 each: in paise: 3333 paise * 3 = 9999 paise (₹99.99)
      const qty = 3;
      const ratePaise = rupeesToPaise(33.33);
      const totalPaise = qty * ratePaise;

      expect(totalPaise).toBe(9999);
      expect(formatCurrency(totalPaise)).toContain('99.99');
      expect(paiseToRupees(totalPaise)).toBe(99.99);
    });

    it('should safely calculate Remaining = Total - Paid', () => {
      const totalAmountPaise = 500000; // ₹5,000.00
      const paidAmountPaise = 300000; // ₹3,000.00 (Jama)
      const remainingAmountPaise = totalAmountPaise - paidAmountPaise; // ₹2,000.00 (Baki)

      expect(remainingAmountPaise).toBe(200000);
      expect(remainingAmountPaise >= 0).toBe(true);
      expect(formatCurrency(remainingAmountPaise)).toContain('2,000.00');
    });
  });
});
