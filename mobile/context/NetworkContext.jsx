/**
 * NetworkContext.jsx
 *
 * Provides real-time network connectivity state to the entire app.
 * When the device transitions from OFFLINE → ONLINE, it automatically
 * triggers the offline punch sync worker.
 *
 * Usage:
 *   const { isOnline, pendingCount, triggerSync } = useNetwork();
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import {
  getQueue,
  removeFromQueue,
  getPendingCount,
} from '../utils/offlineQueue';
import { storage } from '../utils/storage';

const NetworkContext = createContext({
  isOnline: true,
  pendingCount: 0,
  triggerSync: async () => {},
  refreshPendingCount: async () => {},
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // Track previous state to detect offline → online transition
  const wasOnline = useRef(true);
  // Guard against concurrent sync runs
  const isSyncing = useRef(false);

  /** Refresh the pending count badge from storage */
  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  /**
   * Sync all queued offline punches to the server.
   * Called automatically when internet is restored.
   */
  const triggerSync = useCallback(async () => {
    if (isSyncing.current) return;

    const queue = await getQueue();
    if (queue.length === 0) return;

    isSyncing.current = true;
    console.log(`[NetworkContext] Starting sync of ${queue.length} offline punch(es)...`);

    let syncedCount = 0;
    let failedCount = 0;

    for (const entry of queue) {
      try {
        const res = await apiFetch(ENDPOINTS.togglePunch, {
          method: 'POST',
          body: JSON.stringify({
            latitude: entry.latitude,
            longitude: entry.longitude,
            geofenceReason: entry.geofenceReason,
            workSummary: entry.workSummary,
            earlyReason: entry.earlyReason,
            lateReason: entry.lateReason,
            locationAddress: entry.locationAddress,
            isMocked: entry.isMocked,
            clientTime: entry.clientTime, // preserves the real punch time
            isOfflineSync: true,          // tells backend: skip 60s clock-tamper check
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            await removeFromQueue(entry.id);
            syncedCount++;
            console.log(`[NetworkContext] Synced punch #${entry.id}`);
          } else {
            console.warn(`[NetworkContext] Server rejected punch #${entry.id}:`, json.message);
            // Remove from queue even on server rejection to prevent infinite retries
            // (e.g., duplicate punch for same day)
            await removeFromQueue(entry.id);
            failedCount++;
          }
        } else {
          failedCount++;
          console.error(`[NetworkContext] HTTP error for punch #${entry.id}:`, res.status);
        }
      } catch (err) {
        failedCount++;
        console.error(`[NetworkContext] Sync error for punch #${entry.id}:`, err);
        // Network failed mid-sync — keep entry in queue, stop syncing
        isSyncing.current = false;
        await refreshPendingCount();
        break;
      }
    }

    isSyncing.current = false;
    await refreshPendingCount();

    if (syncedCount > 0) {
      Toast.show({
        type: 'success',
        text1: '✅ Attendance Synced',
        text2: `${syncedCount} punch${syncedCount > 1 ? 'es' : ''} synced to server.`,
        visibilityTime: 4000,
      });
    }

    if (failedCount > 0 && syncedCount === 0) {
      Toast.show({
        type: 'error',
        text1: 'Sync Failed',
        text2: 'Could not sync offline punches. Will retry on next reconnect.',
        visibilityTime: 4000,
      });
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    // Load initial pending count
    refreshPendingCount();

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;

      setIsOnline(online);

      if (!wasOnline.current && online) {
        // Transitioned: OFFLINE → ONLINE
        console.log('[NetworkContext] Device came back online. Triggering sync...');
        Toast.show({
          type: 'info',
          text1: '🌐 Back Online',
          text2: 'Syncing your offline punches...',
          visibilityTime: 2500,
        });
        triggerSync();
      }

      if (wasOnline.current && !online) {
        console.log('[NetworkContext] Device went offline.');
      }

      wasOnline.current = online;
    });

    return () => unsubscribe();
  }, [triggerSync, refreshPendingCount]);

  return (
    <NetworkContext.Provider value={{ isOnline, pendingCount, triggerSync, refreshPendingCount }}>
      {children}
    </NetworkContext.Provider>
  );
};
