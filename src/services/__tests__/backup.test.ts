import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { backupService, AccountBackupV1 } from '@/src/services/backup.service';
import { localStore } from '@/src/database/localStore';
import { DbCustomer, DbBuyer, DbInvoice, DbInvoiceItem, DbPayment } from '@/src/types/database';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substring(2, 9)),
}));

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

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///mock/cache/',
  documentDirectory: 'file:///mock/doc/',
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }),
}));

describe('PHASE 18 — Data Backup, Restore & Recovery Audit Tests', () => {
  const userAId = 'usr-backup-tenant-a';
  const userBId = 'usr-backup-tenant-b';

  const sampleCustomer: DbCustomer = {
    id: 'cust-101',
    user_id: userAId,
    name: 'Rameshbhai Patel',
    phone: '9876543210',
    address: 'Surat, Gujarat',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  };

  const sampleBuyer: DbBuyer = {
    id: 'buy-201',
    user_id: userAId,
    name: 'Shreeji Silk Mills',
    phone: '9822233344',
    address: 'Ring Road, Surat',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  };

  const sampleInvoice: DbInvoice = {
    id: 'inv-301',
    user_id: userAId,
    invoice_number: 'INV-0089',
    party_type: 'CUSTOMER',
    party_id: 'cust-101',
    invoice_date: '2026-08-15',
    total_amount: 5000000, // ₹50,000.00
    paid_amount: 2000000, // ₹20,000.00
    remaining_amount: 3000000, // ₹30,000.00
    notes: 'Credit purchase',
    pdf_path: null,
    created_at: '2026-08-15T10:00:00Z',
    updated_at: '2026-08-15T10:00:00Z',
  };

  const sampleItem: DbInvoiceItem = {
    id: 'item-401',
    invoice_id: 'inv-301',
    item_name: 'Bandhani Silk Saree',
    quantity: 10,
    rate: 500000,
    amount: 5000000,
    created_at: '2026-08-15T10:00:00Z',
  };

  const samplePayment: DbPayment = {
    id: 'pay-501',
    user_id: userAId,
    invoice_id: 'inv-301',
    amount: 2000000,
    payment_date: '2026-08-20',
    notes: 'Advance via NEFT',
    created_at: '2026-08-20T11:00:00Z',
    updated_at: '2026-08-20T11:00:00Z',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await localStore.clearUserStore(userAId);
    await localStore.clearUserStore(userBId);

    // Seed local database for User A
    await localStore.upsertCustomer(userAId, {
      ...sampleCustomer,
      sync_status: 'SYNCED',
      local_updated_at: sampleCustomer.updated_at,
    });
    await localStore.upsertBuyer(userAId, {
      ...sampleBuyer,
      sync_status: 'SYNCED',
      local_updated_at: sampleBuyer.updated_at,
    });
    await localStore.upsertInvoice(userAId, {
      ...sampleInvoice,
      sync_status: 'SYNCED',
      local_updated_at: sampleInvoice.updated_at,
    });
    await localStore.setInvoiceItemsForInvoice(userAId, sampleInvoice.id, [
      { ...sampleItem, sync_status: 'SYNCED', local_updated_at: sampleItem.created_at },
    ]);
    await localStore.upsertPayment(userAId, {
      ...samplePayment,
      sync_status: 'SYNCED',
      local_updated_at: samplePayment.updated_at,
    });
  });

  describe('1. Export Backup Verification', () => {
    it('Exports structured Version 1 backup containing all business records', async () => {
      const res = await backupService.exportBackup(userAId);
      expect(res.success).toBe(true);
      expect(res.filePath).toBeDefined();

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      const writtenJson = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
      const parsed: AccountBackupV1 = JSON.parse(writtenJson);

      expect(parsed.backupVersion).toBe(1);
      expect(parsed.appName).toBe('Shayona Invoice');
      expect(parsed.userId).toBe(userAId);
      expect(parsed.customers).toHaveLength(1);
      expect(parsed.customers[0].name).toBe('Rameshbhai Patel');
      expect(parsed.buyers).toHaveLength(1);
      expect(parsed.invoices).toHaveLength(1);
      expect(parsed.invoiceItems).toHaveLength(1);
      expect(parsed.payments).toHaveLength(1);
      expect(parsed.payments[0].amount).toBe(2000000);

      // Verify native share dialog triggered
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        res.filePath,
        expect.objectContaining({ mimeType: 'application/json' }),
      );
    });

    it('Strictly excludes passwords, auth tokens, session secrets, and service-role keys', async () => {
      await backupService.exportBackup(userAId);
      const writtenJson = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];

      expect(writtenJson).not.toMatch(/\bpassword\b/i);
      expect(writtenJson).not.toMatch(/\baccess_token\b/i);
      expect(writtenJson).not.toMatch(/\brefresh_token\b/i);
      expect(writtenJson).not.toMatch(/\bservice_role\b/i);
      expect(writtenJson).not.toMatch(/\bapikey\b/i);
    });
  });

  describe('2. Backup Validation & Malformed Payloads', () => {
    it('Rejects invalid JSON, empty strings, and non-object payloads', () => {
      expect(backupService.validateBackup('').valid).toBe(false);
      expect(backupService.validateBackup('{ invalid json').valid).toBe(false);
      expect(backupService.validateBackup('123').valid).toBe(false);
    });

    it('Rejects unsupported backup versions', () => {
      const invalidVersion = JSON.stringify({
        backupVersion: 2,
        customers: [],
        buyers: [],
        invoices: [],
        invoiceItems: [],
      });
      const res = backupService.validateBackup(invalidVersion);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Unsupported backup version');
    });

    it('Rejects invoices with negative financial amounts', () => {
      const invalidNegative = JSON.stringify({
        backupVersion: 1,
        customers: [],
        buyers: [],
        invoices: [
          {
            id: 'inv-bad-1',
            invoice_number: 'INV-BAD-1',
            total_amount: -500,
            paid_amount: 0,
            remaining_amount: -500,
          },
        ],
        invoiceItems: [],
        payments: [],
      });
      const res = backupService.validateBackup(invalidNegative);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('negative financial values');
    });

    it('Rejects invoices where paid amount exceeds total', () => {
      const invalidOverpaid = JSON.stringify({
        backupVersion: 1,
        customers: [],
        buyers: [],
        invoices: [
          {
            id: 'inv-bad-2',
            invoice_number: 'INV-BAD-2',
            total_amount: 1000,
            paid_amount: 2000, // Invalid: paid > total
            remaining_amount: 0,
          },
        ],
        invoiceItems: [],
        payments: [],
      });
      const res = backupService.validateBackup(invalidOverpaid);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('paid amount exceeding total');
    });
  });

  describe('3. Restore & Multi-User Ownership Safety', () => {
    it('Safely remaps records to the current authenticated user when restoring as User B', async () => {
      // Export User A data
      await backupService.exportBackup(userAId);
      const writtenJson = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
      const validBackup = JSON.parse(writtenJson);

      // Restore into User B account
      const restoreRes = await backupService.restoreBackup(validBackup, userBId);
      expect(restoreRes.success).toBe(true);
      expect(restoreRes.invoicesRestored).toBe(1);
      expect(restoreRes.customersRestored).toBe(1);
      expect(restoreRes.buyersRestored).toBe(1);
      expect(restoreRes.paymentsRestored).toBe(1);

      // Verify User B now owns the restored records
      const userBInvoices = await localStore.getInvoices(userBId);
      expect(userBInvoices).toHaveLength(1);
      expect(userBInvoices[0].user_id).toBe(userBId);
      expect(userBInvoices[0].invoice_number).toBe('INV-0089');

      const userBCustomers = await localStore.getCustomers(userBId);
      expect(userBCustomers).toHaveLength(1);
      expect(userBCustomers[0].user_id).toBe(userBId);

      const userBPayments = await localStore.getPayments(userBId);
      expect(userBPayments).toHaveLength(1);
      expect(userBPayments[0].user_id).toBe(userBId);
      expect(userBPayments[0].amount).toBe(2000000);

      // Verify User A records were unaffected
      const userAInvoices = await localStore.getInvoices(userAId);
      expect(userAInvoices).toHaveLength(1);
      expect(userAInvoices[0].user_id).toBe(userAId);
    });

    it('Preserves financial invariant: Baki = Total - Jama across restored records', async () => {
      await backupService.exportBackup(userAId);
      const writtenJson = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
      const validBackup = JSON.parse(writtenJson);

      await backupService.restoreBackup(validBackup, userBId);
      const userBInvoices = await localStore.getInvoices(userBId);
      const inv = userBInvoices[0];

      expect(inv.total_amount).toBe(5000000);
      expect(inv.paid_amount).toBe(2000000);
      expect(inv.remaining_amount).toBe(3000000);
      expect(inv.total_amount - inv.paid_amount).toBe(inv.remaining_amount);
    });

    it('Restore is idempotent and does not create duplicate entries when run multiple times', async () => {
      await backupService.exportBackup(userAId);
      const writtenJson = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
      const validBackup = JSON.parse(writtenJson);

      // Run restore twice
      await backupService.restoreBackup(validBackup, userAId);
      await backupService.restoreBackup(validBackup, userAId);

      const invoices = await localStore.getInvoices(userAId);
      const customers = await localStore.getCustomers(userAId);
      const payments = await localStore.getPayments(userAId);

      expect(invoices).toHaveLength(1);
      expect(customers).toHaveLength(1);
      expect(payments).toHaveLength(1);
    });
  });
});
