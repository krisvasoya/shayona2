import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isOnline: boolean;
  setNetworkState: (state: Partial<NetworkState>) => void;
}

export const useNetworkStore = create<NetworkState>(set => ({
  isConnected: true,
  isInternetReachable: true,
  isOnline: true,
  setNetworkState: newState => set(state => ({ ...state, ...newState })),
}));

let isInitialized = false;

export const networkService = {
  init(): () => void {
    if (isInitialized) return () => {};
    isInitialized = true;

    // Fetch initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      useNetworkStore.getState().setNetworkState({
        isConnected: Boolean(state.isConnected),
        isInternetReachable: state.isInternetReachable,
        isOnline,
      });
    });

    // Listen for connectivity changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      useNetworkStore.getState().setNetworkState({
        isConnected: Boolean(state.isConnected),
        isInternetReachable: state.isInternetReachable,
        isOnline,
      });
    });

    return unsubscribe;
  },

  isOnline(): boolean {
    return useNetworkStore.getState().isOnline;
  },
};
