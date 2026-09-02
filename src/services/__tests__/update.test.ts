import * as Updates from 'expo-updates';
import { useUpdateStore, updateService } from '../update.service';
import { useNetworkStore } from '../network.service';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}));

jest.mock('expo-updates', () => ({
  isEnabled: true,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
  updateId: 'test-update-uuid-1234',
  runtimeVersion: '1.0.1',
  channel: 'preview',
}));

describe('Update Service & State Store (Phase 22)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNetworkStore
      .getState()
      .setNetworkState({ isConnected: true, isInternetReachable: true, isOnline: true });
    useUpdateStore.setState({
      status: 'idle',
      isUpdateAvailable: false,
      isChecking: false,
      isDownloading: false,
      isUpdateReady: false,
      lastChecked: null,
      error: null,
    });
  });

  it('should initialize with expected default values', () => {
    const state = useUpdateStore.getState();
    expect(state.status).toBe('idle');
    expect(state.isUpdateAvailable).toBe(false);
    expect(state.isChecking).toBe(false);
    expect(state.isDownloading).toBe(false);
    expect(state.isUpdateReady).toBe(false);
    expect(state.runtimeVersion).toBe('1.0.1');
    expect(state.channel).toBe('preview');
  });

  it('should handle offline mode gracefully without crashing', async () => {
    useNetworkStore
      .getState()
      .setNetworkState({ isConnected: false, isInternetReachable: false, isOnline: false });

    const res = await updateService.checkForUpdate(true);
    expect(res.isAvailable).toBe(false);
    expect(res.error).toBe('OFFLINE');

    const state = useUpdateStore.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe('OFFLINE');
    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it('should detect when an update is available', async () => {
    (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValueOnce({
      isAvailable: true,
      manifest: { id: 'update-group-5678' },
    });

    const res = await updateService.checkForUpdate(false);
    expect(res.isAvailable).toBe(true);

    const state = useUpdateStore.getState();
    expect(state.isUpdateAvailable).toBe(true);
    expect(state.status).toBe('available');
    expect(state.updateId).toBe('update-group-5678');
  });

  it('should detect when the app is already up to date', async () => {
    (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValueOnce({
      isAvailable: false,
    });

    const res = await updateService.checkForUpdate(true);
    expect(res.isAvailable).toBe(false);

    const state = useUpdateStore.getState();
    expect(state.isUpdateAvailable).toBe(false);
    expect(state.status).toBe('upToDate');
  });

  it('should handle update download and mark update as ready', async () => {
    useUpdateStore.setState({ isUpdateAvailable: true, status: 'available' });

    (Updates.fetchUpdateAsync as jest.Mock).mockResolvedValueOnce({
      isNew: true,
    });

    const res = await updateService.downloadUpdate();
    expect(res.success).toBe(true);

    const state = useUpdateStore.getState();
    expect(state.isUpdateReady).toBe(true);
    expect(state.status).toBe('ready');
  });

  it('should call reloadAsync when applying update', async () => {
    useUpdateStore.setState({ isUpdateReady: true, status: 'ready' });

    await updateService.applyUpdate();
    expect(Updates.reloadAsync).toHaveBeenCalledTimes(1);
  });
});
