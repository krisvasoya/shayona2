import { invoiceService } from '@/src/services/invoice.service';
import { localStore } from '@/src/database/localStore';
import { supabase } from '@/src/services/supabase/client';
import { DbInvoice, DbProfile } from '@/src/types/database';
import { pdfService } from '@/src/services/pdf.service';

jest.mock('@/src/services/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substring(2, 9)),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
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

describe('PHASE 17 — Payment History & Outstanding Ledger Audit Tests', () => {
  const userAId = 'usr-tenant-a-1111';
  const userBId = 'usr-tenant-b-2222';

  const mockUserAProfile: DbProfile = {
    id: userAId,
    name: 'Shayona Owner',
    email: 'shayona@test.com',
    phone: '9898967433',
    shop_name: 'Shayona Enterprise',
    address: null,
    language: 'en',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const sampleInvoice: DbInvoice = {
    id: 'inv-history-001',
    user_id: userAId,
    invoice_number: 'INV-0001',
    party_type: 'CUSTOMER',
    party_id: 'cust-kantibhai',
    invoice_date: '2026-09-01',
    total_amount: 2950000, // ₹29,500.00
    paid_amount: 0, // ₹0.00
    remaining_amount: 2950000, // ₹29,500.00
    notes: 'Initial credit bill',
    pdf_path: null,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await localStore.clearUserStore(userAId);
    await localStore.clearUserStore(userBId);

    // Mock authenticated user as User A
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: userAId } },
      error: null,
    });

    // Seed User A's invoice in localStore
    await localStore.upsertInvoice(userAId, {
      ...sampleInvoice,
      sync_status: 'SYNCED',
      local_updated_at: sampleInvoice.updated_at,
    });
  });

  describe('1. Sequential Payment History Accumulation', () => {
    it('Records Payment 1 (₹10,000) on 2026-09-02: Jama=₹10,000, Baki=₹19,500', async () => {
      const res = await invoiceService.recordPayment(
        sampleInvoice.id,
        10000,
        '2026-09-02',
        'Part payment via GPay',
      );

      expect(res.error).toBeUndefined();
      expect(res.data).not.toBeNull();
      expect(res.data?.paid_amount).toBe(1000000); // ₹10,000
      expect(res.data?.remaining_amount).toBe(1950000); // ₹19,500

      const payments = await invoiceService.getInvoicePayments(sampleInvoice.id);
      expect(payments).toHaveLength(1);
      expect(payments[0].amount).toBe(1000000);
      expect(payments[0].payment_date).toBe('2026-09-02');
      expect(payments[0].notes).toBe('Part payment via GPay');
    });

    it('Records Payment 2 (₹5,000) on 2026-09-10: Jama=₹15,000, Baki=₹14,500', async () => {
      // Payment 1
      await invoiceService.recordPayment(sampleInvoice.id, 10000, '2026-09-02', 'Payment 1');

      // Payment 2
      const res2 = await invoiceService.recordPayment(
        sampleInvoice.id,
        5000,
        '2026-09-10',
        'Cash payment 2',
      );

      expect(res2.data?.paid_amount).toBe(1500000); // ₹15,000
      expect(res2.data?.remaining_amount).toBe(1450000); // ₹14,500

      const payments = await invoiceService.getInvoicePayments(sampleInvoice.id);
      expect(payments).toHaveLength(2);
      // Newest date first
      expect(payments[0].payment_date).toBe('2026-09-10');
      expect(payments[0].amount).toBe(500000);
      expect(payments[1].payment_date).toBe('2026-09-02');
      expect(payments[1].amount).toBe(1000000);
    });

    it('Records Payment 3 (₹14,500) on 2026-09-20: Jama=₹29,500, Baki=₹0 (Status: Fully Paid)', async () => {
      await invoiceService.recordPayment(sampleInvoice.id, 10000, '2026-09-02');
      await invoiceService.recordPayment(sampleInvoice.id, 5000, '2026-09-10');
      const res3 = await invoiceService.recordPayment(
        sampleInvoice.id,
        14500,
        '2026-09-20',
        'Final settlement',
      );

      expect(res3.data?.paid_amount).toBe(2950000); // ₹29,500
      expect(res3.data?.remaining_amount).toBe(0); // ₹0

      const payments = await invoiceService.getInvoicePayments(sampleInvoice.id);
      expect(payments).toHaveLength(3);

      const totalPaymentsSum = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      expect(totalPaymentsSum).toBe(sampleInvoice.total_amount);
      expect(sampleInvoice.total_amount - totalPaymentsSum).toBe(0);

      // Attempting further payment on fully paid invoice is blocked
      const overRes = await invoiceService.recordPayment(sampleInvoice.id, 1, '2026-09-21');
      expect(overRes.error).toBe('This invoice is already fully paid.');
    });
  });

  describe('2. Validation & Edge Cases', () => {
    it('Rejects zero, negative, NaN, and overpayments greater than Baki', async () => {
      const zeroRes = await invoiceService.recordPayment(sampleInvoice.id, 0);
      expect(zeroRes.error).toBe('Payment amount must be greater than zero.');

      const negRes = await invoiceService.recordPayment(sampleInvoice.id, -500);
      expect(negRes.error).toBe('Payment amount must be greater than zero.');

      const overRes = await invoiceService.recordPayment(sampleInvoice.id, 30000);
      expect(overRes.error).toBe('Payment amount cannot exceed remaining Baki.');
    });

    it('Generates stable payment UUIDs and enqueues sync queue operations for offline sync', async () => {
      await invoiceService.recordPayment(sampleInvoice.id, 10000, '2026-09-02', 'Offline payment');

      const queue = await localStore.getSyncQueue(userAId);
      const paymentSyncItem = queue.find(q => q.entity === 'PAYMENT');
      const invoiceSyncItem = queue.find(q => q.entity === 'INVOICE');

      expect(paymentSyncItem).toBeDefined();
      expect(paymentSyncItem?.operation).toBe('CREATE');
      expect(paymentSyncItem?.payload?.amount).toBe(1000000);
      expect(paymentSyncItem?.payload?.payment_date).toBe('2026-09-02');

      expect(invoiceSyncItem).toBeDefined();
      expect(invoiceSyncItem?.operation).toBe('UPDATE');
    });
  });

  describe('3. Multi-User & Data Isolation Security', () => {
    it('User B cannot view or record payments against User A invoice', async () => {
      // Switch authentication context to User B
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: userBId } },
        error: null,
      });

      // User B trying to record payment on User A's invoice
      const res = await invoiceService.recordPayment(sampleInvoice.id, 5000);
      expect(res.error).toBe('Invoice not found.');

      // User B query for payments returns empty list
      const payments = await invoiceService.getInvoicePayments(sampleInvoice.id);
      expect(payments).toHaveLength(0);
    });
  });

  describe('4. Strict Customer-Facing PDF & Print Independence', () => {
    it('Customer-facing PDF strictly excludes payment history, Jama, and Baki', async () => {
      await invoiceService.recordPayment(sampleInvoice.id, 10000, '2026-09-02');
      const updatedInvoice = await invoiceService.getInvoiceById(sampleInvoice.id);

      const html = pdfService.generateInvoiceHtml({
        invoice: updatedInvoice!,
        profile: mockUserAProfile,
        language: 'en',
      });

      // Must contain clean total
      expect(html).toContain('Grand Total');
      expect(html).toContain('₹29,500.00');

      // Must NOT contain internal payment history or ledger breakdowns
      expect(html).not.toMatch(/\bPayment History\b/i);
      expect(html).not.toMatch(/\bJama\b/i);
      expect(html).not.toMatch(/\bBaki\b/i);
      expect(html).not.toMatch(/\bPaid Amount\b/i);
      expect(html).not.toMatch(/\bRemaining Due\b/i);
      expect(html).not.toMatch(/\bGST\b/i);
    });
  });
});
