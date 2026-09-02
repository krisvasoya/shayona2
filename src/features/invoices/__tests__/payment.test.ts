import { invoiceService } from '@/src/services/invoice.service';
import { localStore } from '@/src/database/localStore';
import { LocalInvoice } from '@/src/database/types';
import { supabase } from '@/src/services/supabase/client';

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'mock-uuid-payment-1234',
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}));

// Mock Supabase client
jest.mock('@/src/services/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('Phase 16: Customer Payment / Jama Update Feature Unit Tests', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const invoiceId = 'test-inv-001';

  beforeEach(async () => {
    jest.clearAllMocks();

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: userId, email: 'user@example.com' } },
      error: null,
    });

    await localStore.clearUserStore(userId);

    // Initial Test Invoice: Total = ₹29,500 (2,950,000 paise), Paid = ₹0, Remaining = ₹29,500
    const initialInvoice: LocalInvoice = {
      id: invoiceId,
      user_id: userId,
      invoice_number: 'INV-0001',
      party_type: 'CUSTOMER',
      party_id: 'cust-001',
      invoice_date: '2026-09-02',
      total_amount: 2950000, // 29500 INR in paise
      paid_amount: 0,
      remaining_amount: 2950000,
      pdf_path: null,
      notes: 'Initial test invoice',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'SYNCED',
      local_updated_at: new Date().toISOString(),
    };

    await localStore.upsertInvoice(userId, initialInvoice);
  });

  it('1. Rejects zero payment (<= 0)', async () => {
    const res = await invoiceService.recordPayment(invoiceId, 0);
    expect(res.data).toBeNull();
    expect(res.error).toBe('Payment amount must be greater than zero.');
  });

  it('2. Rejects negative payment (< 0)', async () => {
    const res = await invoiceService.recordPayment(invoiceId, -500);
    expect(res.data).toBeNull();
    expect(res.error).toBe('Payment amount must be greater than zero.');
  });

  it('3. Rejects payment greater than current Baki', async () => {
    // Current Baki is ₹29,500; attempt ₹30,000
    const res = await invoiceService.recordPayment(invoiceId, 30000);
    expect(res.data).toBeNull();
    expect(res.error).toBe('Payment amount cannot exceed remaining Baki.');
  });

  it('4. Multi-step partial payment accumulation test (User Story Example)', async () => {
    // Step 1: Customer gives ₹10,000
    const step1 = await invoiceService.recordPayment(invoiceId, 10000);
    expect(step1.error).toBeUndefined();
    expect(step1.data).not.toBeNull();
    expect(step1.data?.paid_amount).toBe(1000000); // 10,000 INR in paise
    expect(step1.data?.remaining_amount).toBe(1950000); // 19,500 INR in paise
    expect(step1.data?.total_amount).toBe(2950000);

    // Step 2: Customer gives another ₹5,000
    const step2 = await invoiceService.recordPayment(invoiceId, 5000);
    expect(step2.error).toBeUndefined();
    expect(step2.data).not.toBeNull();
    expect(step2.data?.paid_amount).toBe(1500000); // 15,000 INR in paise
    expect(step2.data?.remaining_amount).toBe(1450000); // 14,500 INR in paise

    // Step 3: Customer pays remaining ₹14,500
    const step3 = await invoiceService.recordPayment(invoiceId, 14500);
    expect(step3.error).toBeUndefined();
    expect(step3.data).not.toBeNull();
    expect(step3.data?.paid_amount).toBe(2950000); // ₹29,500 in paise
    expect(step3.data?.remaining_amount).toBe(0); // ₹0 Baki (Fully Paid)

    // Step 4: Attempting to add payment to fully paid invoice is rejected
    const step4 = await invoiceService.recordPayment(invoiceId, 1);
    expect(step4.data).toBeNull();
    expect(step4.error).toBe('This invoice is already fully paid.');
  });

  it('5. Exact full payment in single transaction', async () => {
    const res = await invoiceService.recordPayment(invoiceId, 29500);
    expect(res.error).toBeUndefined();
    expect(res.data?.paid_amount).toBe(2950000);
    expect(res.data?.remaining_amount).toBe(0);
  });

  it('6. Supports decimal rupee payments accurately without floating point loss', async () => {
    // Pay ₹500.50
    const res = await invoiceService.recordPayment(invoiceId, 500.5);
    expect(res.error).toBeUndefined();
    expect(res.data?.paid_amount).toBe(50050); // 500.50 INR = 50050 paise
    expect(res.data?.remaining_amount).toBe(2950000 - 50050);
  });

  it('7. Enforces user isolation: User B cannot record payment on User A invoice', async () => {
    // Switch auth session to User B
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: '22222222-2222-2222-2222-222222222222', email: 'userb@example.com' } },
      error: null,
    });

    const res = await invoiceService.recordPayment(invoiceId, 1000);
    expect(res.data).toBeNull();
    expect(res.error).toBe('Invoice not found.');
  });
});
