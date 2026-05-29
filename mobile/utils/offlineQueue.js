/**
 * offlineQueue.js
 * Manages a persistent queue of punch actions that failed due to no internet.
 * Each entry is stored in AsyncStorage under the key OFFLINE_PUNCH_QUEUE_KEY.
 *
 * Queue entry shape:
 * {
 *   id: string,          // unique identifier (timestamp-based)
 *   type: 'IN' | 'OUT',  // punch direction (derived from API response on sync)
 *   latitude: number,
 *   longitude: number,
 *   locationAddress: string,
 *   geofenceReason: string,
 *   earlyReason: string,
 *   lateReason: string,
 *   workSummary: string,
 *   isMocked: boolean,
 *   clientTime: string,  // ISO-8601 — the REAL time the employee punched
 *   syncedAt: string | null,
 * }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@hrms_offline_punch_queue';

/** Returns a unique ID string */
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Read the full queue from storage. Returns [] if empty or on error. */
export const getQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[OfflineQueue] getQueue error:', e);
    return [];
  }
};

/** Persist the given array back to storage. */
const saveQueue = async (queue) => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[OfflineQueue] saveQueue error:', e);
  }
};

/**
 * Add a new punch action to the queue.
 * @param {object} punch - The punch payload (location, reasons, etc.)
 * @returns {string} The generated ID of the queued item.
 */
export const addToQueue = async (punch) => {
  const queue = await getQueue();
  const id = makeId();
  const entry = {
    id,
    latitude: punch.latitude,
    longitude: punch.longitude,
    locationAddress: punch.locationAddress || '',
    geofenceReason: punch.geofenceReason || '',
    earlyReason: punch.earlyReason || '',
    lateReason: punch.lateReason || '',
    workSummary: punch.workSummary || '',
    isMocked: punch.isMocked || false,
    clientTime: punch.clientTime || new Date().toISOString(),
    syncedAt: null,
  };
  queue.push(entry);
  await saveQueue(queue);
  console.log(`[OfflineQueue] Queued punch #${id}. Queue size: ${queue.length}`);
  return id;
};

/**
 * Remove a specific entry from the queue (after successful sync).
 * @param {string} id - The ID of the entry to remove.
 */
export const removeFromQueue = async (id) => {
  const queue = await getQueue();
  const updated = queue.filter((entry) => entry.id !== id);
  await saveQueue(updated);
  console.log(`[OfflineQueue] Removed #${id}. Remaining: ${updated.length}`);
};

/**
 * Remove all entries from the queue. Called on logout.
 */
export const clearQueue = async () => {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
    console.log('[OfflineQueue] Queue cleared.');
  } catch (e) {
    console.error('[OfflineQueue] clearQueue error:', e);
  }
};

/**
 * Returns the number of pending (unsynced) items in the queue.
 */
export const getPendingCount = async () => {
  const queue = await getQueue();
  return queue.length;
};
