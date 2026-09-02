import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMEMBER_ME_KEY = 'shayona_auth_remember_me';
let memoryStore: Record<string, string> = {};

export const authStorage = {
  async getRememberMe(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        const val = await AsyncStorage.getItem(REMEMBER_ME_KEY);
        return val !== 'false';
      }
      const val = await SecureStore.getItemAsync(REMEMBER_ME_KEY);
      return val !== 'false';
    } catch {
      return true;
    }
  },

  async setRememberMe(enabled: boolean): Promise<void> {
    try {
      const strVal = enabled ? 'true' : 'false';
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(REMEMBER_ME_KEY, strVal);
      } else {
        await SecureStore.setItemAsync(REMEMBER_ME_KEY, strVal);
      }
    } catch {
      // Ignored in non-fatal conditions
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      const rememberMe = await this.getRememberMe();

      if (!rememberMe) {
        return memoryStore[key] || null;
      }

      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return memoryStore[key] || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      memoryStore[key] = value;
      const rememberMe = await this.getRememberMe();

      if (!rememberMe) {
        // Do not persist to disk if rememberMe is disabled
        return;
      }

      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch {
      // Memory store already holds the runtime value
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      delete memoryStore[key];
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {
      // Ignored
    }
  },

  async clearAllAuth(): Promise<void> {
    memoryStore = {};
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.clear();
      } else {
        // Clear Supabase session keys from SecureStore
        await SecureStore.deleteItemAsync('supabase.auth.token');
      }
    } catch {
      // Ignored
    }
  },
};
