import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncService } from '../sync.service';
import { localStore } from '@/src/database/localStore';
import { useNetworkStore } from '../network.service';
import { supabase } from '../supabase/client';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}));

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

jest.mock('../supabase/client', () => {
  const mockFrom = jest.fn();
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'usr-test-123', email: 'test@phone.internal' } },
        }),
      },
    },
  };
});

describe('Phase 12: Offline Mode & Data Synchronization Engine Tests', () => {
  const userId = 'usr-test-123';

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    useNetworkStore.getState().setNetworkState({
      isConnected: true,
      isInternetReachable: true,
      isOnline: true,
    });
  });

  it('should process sync queue in strict dependency order (Customer before Invoice)', async () => {
    // 1. Enqueue Invoice first, then Customer second
    await localStore.enqueueSyncItem(userId, {
      id: 'q-inv-1',
      user_id: userId,
      entity: 'INVOICE',
      entity_id: 'inv-1',
      operation: 'CREATE',
      payload: { invoice_number: 'INV-0001', party_type: 'CUSTOMER', party_id: 'cust-1' },
      created_at: '2026-09-02T10:05:00Z',
      retry_count: 0,
    });

    await localStore.enqueueSyncItem(userId, {
      id: 'q-cust-1',
      user_id: userId,
      entity: 'CUSTOMER',
      entity_id: 'cust-1',
      operation: 'CREATE',
      payload: { name: 'Kanti Bhai' },
      created_at: '2026-09-02T10:00:00Z',
      retry_count: 0,
    });

    const callOrder: string[] = [];

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      callOrder.push(table);
      return {
        upsert: jest.fn().mockResolvedValue({ error: null }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    const result = await syncService.processQueue(userId);

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(2);
    expect(result.remainingQueueCount).toBe(0);

    // Verify Customer table was touched BEFORE Invoices table
    const custIdx = callOrder.indexOf('customers');
    const invIdx = callOrder.indexOf('invoices');
    expect(custIdx).toBeGreaterThanOrEqual(0);
    expect(invIdx).toBeGreaterThanOrEqual(0);
    expect(custIdx).toBeLessThan(invIdx);
  });

  it('should gracefully abort and keep pending items if device is offline', async () => {
    useNetworkStore.getState().setNetworkState({ isOnline: false });

    await localStore.enqueueSyncItem(userId, {
      id: 'q-inv-2',
      user_id: userId,
      entity: 'INVOICE',
      entity_id: 'inv-2',
      operation: 'CREATE',
      payload: { invoice_number: 'INV-0002' },
      created_at: new Date().toISOString(),
      retry_count: 0,
    });

    const result = await syncService.syncAll(userId);

    expect(result.success).toBe(false);
    expect(result.syncedCount).toBe(0);
    expect(result.remainingQueueCount).toBe(1);

    const remaining = await localStore.getSyncQueue(userId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].entity_id).toBe('inv-2');
  });
});
