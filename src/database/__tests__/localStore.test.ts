import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStore } from '../localStore';
import { LocalCustomer, LocalInvoice, SyncQueueItem } from '../types';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] || null),
    setItem: jest.fn(async (key: string, val: string) => {
      store[key] = val;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach(k => delete store[k]);
    }),
    clear: jest.fn(async () => {
      Object.keys(store).forEach(k => delete store[k]);
    }),
  };
});

describe('Local Database & Multi-User Partitioning Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should isolate customer records between User A and User B', async () => {
    const userA = 'usr-A-111';
    const userB = 'usr-B-222';

    const customerA: LocalCustomer = {
      id: 'cust-a-1',
      user_id: userA,
      name: 'User A Customer (Kanti Bhai)',
      phone: '9898967433',
      address: 'Surat',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'SYNCED',
      local_updated_at: new Date().toISOString(),
    };

    const customerB: LocalCustomer = {
      id: 'cust-b-1',
      user_id: userB,
      name: 'User B Customer (Ramesh Bhai)',
      phone: '9898967434',
      address: 'Ahmedabad',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'SYNCED',
      local_updated_at: new Date().toISOString(),
    };

    await localStore.upsertCustomer(userA, customerA);
    await localStore.upsertCustomer(userB, customerB);

    const userACustomers = await localStore.getCustomers(userA);
    const userBCustomers = await localStore.getCustomers(userB);

    // User A should only see Customer A
    expect(userACustomers).toHaveLength(1);
    expect(userACustomers[0].name).toBe('User A Customer (Kanti Bhai)');

    // User B should only see Customer B
    expect(userBCustomers).toHaveLength(1);
    expect(userBCustomers[0].name).toBe('User B Customer (Ramesh Bhai)');
  });

  it('should isolate invoices and calculate offline balances properly', async () => {
    const userA = 'usr-A-111';

    const invoice1: LocalInvoice = {
      id: 'inv-1',
      user_id: userA,
      invoice_number: 'INV-0001',
      party_type: 'CUSTOMER',
      party_id: 'cust-1',
      invoice_date: '2026-09-02',
      total_amount: 2950000,
      paid_amount: 1000000,
      remaining_amount: 1950000,
      pdf_path: null,
      notes: null,
      created_at: '2026-09-02T10:00:00Z',
      updated_at: '2026-09-02T10:00:00Z',
      sync_status: 'PENDING_CREATE',
      local_updated_at: '2026-09-02T10:00:00Z',
    };

    await localStore.upsertInvoice(userA, invoice1);

    const invoices = await localStore.getInvoices(userA);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].invoice_number).toBe('INV-0001');
    expect(invoices[0].remaining_amount).toBe(1950000);
  });

  it('should manage FIFO sync queue correctly', async () => {
    const userId = 'usr-A-111';

    const item1: SyncQueueItem = {
      id: 'queue-1',
      user_id: userId,
      entity: 'CUSTOMER',
      entity_id: 'cust-1',
      operation: 'CREATE',
      payload: { name: 'Kanti Bhai' },
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    const item2: SyncQueueItem = {
      id: 'queue-2',
      user_id: userId,
      entity: 'INVOICE',
      entity_id: 'inv-1',
      operation: 'CREATE',
      payload: { invoice_number: 'INV-0001' },
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    await localStore.enqueueSyncItem(userId, item1);
    await localStore.enqueueSyncItem(userId, item2);

    let queue = await localStore.getSyncQueue(userId);
    expect(queue).toHaveLength(2);
    expect(queue[0].entity).toBe('CUSTOMER');
    expect(queue[1].entity).toBe('INVOICE');

    await localStore.removeSyncQueueItem(userId, 'queue-1');
    queue = await localStore.getSyncQueue(userId);
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe('queue-2');
  });
});
