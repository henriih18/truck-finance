import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { syncStore } from './sync.store';

let syncServiceRef: { syncAll: () => Promise<void> } | null = null;

export function setSyncService(s: { syncAll: () => Promise<void> }) {
  syncServiceRef = s;
}

export function startNetworkMonitor() {
  NetInfo.addEventListener((state: NetInfoState) => {
    const online = !!state.isConnected && !!state.isInternetReachable;
    const wasOffline = !syncStore.getState().online;
    syncStore.getState().setOnline(online);
    if (online && wasOffline) {
      syncServiceRef?.syncAll();
    }
  });

  setInterval(() => {
    if (syncStore.getState().online) syncServiceRef?.syncAll();
  }, 60_000);
}