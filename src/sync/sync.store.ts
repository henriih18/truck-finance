import { create } from 'zustand';

type SyncState = {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  setOnline: (v: boolean) => void;
};

export const syncStore = create<SyncState>((set) => ({
  online: true,
  syncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  setOnline: (v) => set({ online: v }),
}));