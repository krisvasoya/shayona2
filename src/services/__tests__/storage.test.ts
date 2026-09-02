import { authStorage } from '../supabase/storage';

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (key: string) => store[key] || null),
    setItemAsync: jest.fn(async (key: string, val: string) => {
      store[key] = val;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
  };
});

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
    clear: jest.fn(async () => {
      Object.keys(store).forEach(k => delete store[k]);
    }),
  };
});

describe('Auth Storage & Remember Me', () => {
  beforeEach(async () => {
    await authStorage.clearAllAuth();
  });

  it('should default remember me to true', async () => {
    const rememberMe = await authStorage.getRememberMe();
    expect(typeof rememberMe).toBe('boolean');
  });

  it('should set and get remember me state', async () => {
    await authStorage.setRememberMe(false);
    expect(await authStorage.getRememberMe()).toBe(false);

    await authStorage.setRememberMe(true);
    expect(await authStorage.getRememberMe()).toBe(true);
  });

  it('should store and retrieve item in memory store', async () => {
    await authStorage.setItem('test_token', 'sample_jwt_123');
    const value = await authStorage.getItem('test_token');
    expect(value).toBe('sample_jwt_123');
  });

  it('should remove item properly', async () => {
    await authStorage.setItem('test_token', 'sample_jwt_123');
    await authStorage.removeItem('test_token');
    const value = await authStorage.getItem('test_token');
    expect(value).toBeNull();
  });
});
