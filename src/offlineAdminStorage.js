/**
 * offlineAdminStorage.js
 * Universal IndexedDB offline persistence and outbox sync engine for Admin operations.
 * Covers: Scrutiny/Verification, Physical Receipt, Withdrawals, Posts, Booths, Nominal Roll, Settings.
 * NOTE: Strictly Admin-only. Public submissions (e.g. submitNomination) do NOT use local queuing.
 */

import { getPendingSyncCount } from './offlineStorage.js';

const ADMIN_DB_NAME = 'GCC_Election_Admin_DB';
const ADMIN_DB_VERSION = 1;

let _dbPromise = null;
const _syncListeners = new Set();
let _isSyncing = false;

// ─── Live Cloud Database Reachability State ─────────────────────────────────
let _isCloudReachable = false;
let _lastCheckedAt = 0;
let _checkingPromise = null;

export async function checkCloudReachable(force = false) {
  if (typeof window === 'undefined') return false;
  if (!navigator.onLine) {
    _isCloudReachable = false;
    notifySyncListeners();
    return false;
  }

  const now = Date.now();
  if (!force && _checkingPromise) {
    return _checkingPromise;
  }
  if (!force && _lastCheckedAt > 0 && (now - _lastCheckedAt < 12000)) {
    return _isCloudReachable;
  }

  _checkingPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`/api/main?action=ping&_t=${Date.now()}`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        _isCloudReachable = Boolean(data && data.ok === true && data.db !== false);
      } else {
        _isCloudReachable = false;
      }
    } catch (err) {
      _isCloudReachable = false;
    } finally {
      _lastCheckedAt = Date.now();
      _checkingPromise = null;
      notifySyncListeners();
    }
    return _isCloudReachable;
  })();

  return _checkingPromise;
}

export function markCloudSuccess() {
  _isCloudReachable = true;
  _lastCheckedAt = Date.now();
  notifySyncListeners();
}

export function markCloudFailure(err) {
  _isCloudReachable = false;
  _lastCheckedAt = Date.now();
  notifySyncListeners();
}

export function isCloudOnline() {
  return Boolean(_isCloudReachable && (typeof navigator !== 'undefined' ? navigator.onLine : false));
}

export async function getTotalPendingCount() {
  const [adminCount, resultsCount] = await Promise.all([
    getAdminOutboxCount().catch(() => 0),
    getPendingSyncCount ? getPendingSyncCount().catch(() => 0) : 0
  ]);
  return {
    total: adminCount + resultsCount,
    adminCount,
    resultsCount
  };
}

function openAdminDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(ADMIN_DB_NAME, ADMIN_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('admin_cache')) {
        db.createObjectStore('admin_cache', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('admin_outbox')) {
        const outboxStore = db.createObjectStore('admin_outbox', { keyPath: 'id', autoIncrement: true });
        outboxStore.createIndex('status', 'status', { unique: false });
        outboxStore.createIndex('queuedAt', 'queuedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.error('Failed to open Admin IndexedDB:', req.error);
      reject(req.error);
    };
  });
  return _dbPromise;
}

export function subscribeAdminSync(listener) {
  _syncListeners.add(listener);
  // Trigger ping check in background on initial subscription
  checkCloudReachable(false).catch(() => {});
  
  // Emit current state immediately (defaults to offline/local-only until verified)
  getTotalPendingCount().then(({ total, adminCount, resultsCount }) => {
    const isOnline = Boolean(_isCloudReachable && navigator.onLine);
    listener({
      isSyncing: _isSyncing,
      count: total,
      adminCount,
      resultsCount,
      isOnline,
      isCloudReachable: _isCloudReachable
    });
  }).catch(() => {});
  return () => _syncListeners.delete(listener);
}

export function notifySyncListeners(state = {}) {
  getTotalPendingCount().then(({ total, adminCount, resultsCount }) => {
    const isOnline = Boolean(_isCloudReachable && navigator.onLine);
    const detail = {
      isSyncing: _isSyncing,
      count: total,
      adminCount,
      resultsCount,
      isOnline,
      isCloudReachable: _isCloudReachable,
      ...state
    };
    _syncListeners.forEach(fn => {
      try { fn(detail); } catch (e) { console.error('Sync listener error:', e); }
    });
  }).catch(() => {});
}

// ─── Cache Operations ────────────────────────────────────────────────────────
export async function getAdminCached(key) {
  try {
    const db = await openAdminDB();
    return new Promise((resolve) => {
      const tx = db.transaction('admin_cache', 'readonly');
      const store = tx.objectStore('admin_cache');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('getAdminCached error:', err);
    return null;
  }
}

export async function setAdminCached(key, data) {
  try {
    const db = await openAdminDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('admin_cache', 'readwrite');
      const store = tx.objectStore('admin_cache');
      const req = store.put({ key, data, cachedAt: Date.now() });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('setAdminCached error:', err);
    return false;
  }
}

export async function invalidateAdminCached(keyPrefix) {
  try {
    const db = await openAdminDB();
    return new Promise((resolve) => {
      const tx = db.transaction('admin_cache', 'readwrite');
      const store = tx.objectStore('admin_cache');
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (!keyPrefix || cursor.key.startsWith(keyPrefix)) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve(true);
        }
      };
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('invalidateAdminCached error:', err);
    return false;
  }
}

// ─── Outbox Operations ───────────────────────────────────────────────────────
export async function enqueueAdminMutation(action, payload, label = '') {
  try {
    const db = await openAdminDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('admin_outbox', 'readwrite');
      const store = tx.objectStore('admin_outbox');
      const item = {
        action,
        payload,
        label: label || action,
        queuedAt: Date.now(),
        status: 'pending',
        retries: 0,
        lastError: null
      };
      const req = store.add(item);
      req.onsuccess = () => {
        const id = req.result;
        notifySyncListeners();
        resolve(id);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('enqueueAdminMutation error:', err);
    throw err;
  }
}

export async function getAdminOutbox() {
  try {
    const db = await openAdminDB();
    return new Promise((resolve) => {
      const tx = db.transaction('admin_outbox', 'readonly');
      const store = tx.objectStore('admin_outbox');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('getAdminOutbox error:', err);
    return [];
  }
}

export async function removeAdminOutboxItem(id) {
  try {
    const db = await openAdminDB();
    return new Promise((resolve) => {
      const tx = db.transaction('admin_outbox', 'readwrite');
      const store = tx.objectStore('admin_outbox');
      const req = store.delete(id);
      req.onsuccess = () => {
        notifySyncListeners();
        resolve(true);
      };
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('removeAdminOutboxItem error:', err);
    return false;
  }
}

export async function getAdminOutboxCount() {
  try {
    const db = await openAdminDB();
    return new Promise((resolve) => {
      const tx = db.transaction('admin_outbox', 'readonly');
      const store = tx.objectStore('admin_outbox');
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch (err) {
    return 0;
  }
}

// ─── Outbox Background Sync Worker ───────────────────────────────────────────
export async function flushAdminOutbox(apiPostFn, getSessionTokenFn) {
  if (_isSyncing) return;
  if (!navigator.onLine || !_isCloudReachable) {
    notifySyncListeners();
    return;
  }

  const items = await getAdminOutbox();
  if (!items || items.length === 0) {
    notifySyncListeners();
    return;
  }

  _isSyncing = true;
  notifySyncListeners({ isSyncing: true });

  try {
    for (const item of items) {
      if (!navigator.onLine || !_isCloudReachable) break;

      try {
        let body = { ...item.payload, action: item.action };
        const token = getSessionTokenFn ? getSessionTokenFn() : null;
        if (token && body.password) {
          body.sessionToken = token;
        }

        await apiPostFn(body);
        // Successful post, remove from queue
        await removeAdminOutboxItem(item.id);
      } catch (postErr) {
        console.warn(`Admin outbox sync failed for item #${item.id} (${item.action}):`, postErr);
        // If unauthorized session or session expired, abort
        if (postErr.message?.includes('UNAUTHORIZED_SESSION') || postErr.message === 'SESSION_EXPIRED') {
          break;
        }
        // Update retry count
        try {
          const db = await openAdminDB();
          const tx = db.transaction('admin_outbox', 'readwrite');
          const store = tx.objectStore('admin_outbox');
          item.retries = (item.retries || 0) + 1;
          item.lastError = postErr.message;
          item.status = 'failed';
          store.put(item);
        } catch (_) {}

        // If offline error, halt processing until network returns
        if (!navigator.onLine || postErr.message?.includes('Failed to fetch') || postErr.message?.includes('Network error')) {
          _isCloudReachable = false;
          break;
        }
      }
    }
  } finally {
    _isSyncing = false;
    notifySyncListeners({ isSyncing: false });
  }
}

// Listen to network events and window events to maintain accurate online status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    checkCloudReachable(true).then((online) => {
      if (online) {
        window.dispatchEvent(new CustomEvent('admin:online-reconnected'));
      }
    });
  });
  window.addEventListener('offline', () => {
    _isCloudReachable = false;
    notifySyncListeners({ isOnline: false, isCloudReachable: false });
  });
  window.addEventListener('app:sync-state-changed', () => {
    notifySyncListeners();
  });
  window.addEventListener('focus', () => {
    if (Date.now() - _lastCheckedAt > 15000) {
      checkCloudReachable(false);
    }
  });
  setInterval(() => {
    checkCloudReachable(false);
  }, 25000);
}

// ─── Full Admin Backup Export & Import (USB) ──────────────────────────────────
export async function exportAdminSnapshotJSON() {
  const db = await openAdminDB();
  const tx = db.transaction(['admin_cache', 'admin_outbox'], 'readonly');
  
  const cacheReq = tx.objectStore('admin_cache').getAll();
  const outboxReq = tx.objectStore('admin_outbox').getAll();

  await new Promise((resolve) => { tx.oncomplete = resolve; });

  const snapshot = {
    exportedAt: new Date().toISOString(),
    version: ADMIN_DB_VERSION,
    appName: 'GCC_Election_Admin_Snapshot',
    cache: cacheReq.result || [],
    outbox: outboxReq.result || []
  };

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url;
  a.download = `GCC_Election_Admin_Backup_${dStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importAdminSnapshotJSON(jsonString) {
  const snapshot = JSON.parse(jsonString);
  if (!snapshot.cache && !snapshot.outbox) {
    throw new Error('Invalid Admin Backup JSON structure.');
  }

  const db = await openAdminDB();
  const tx = db.transaction(['admin_cache', 'admin_outbox'], 'readwrite');
  const cacheStore = tx.objectStore('admin_cache');
  const outboxStore = tx.objectStore('admin_outbox');

  if (Array.isArray(snapshot.cache)) {
    for (const item of snapshot.cache) {
      if (item && item.key) cacheStore.put(item);
    }
  }

  if (Array.isArray(snapshot.outbox)) {
    for (const item of snapshot.outbox) {
      if (item && item.action) {
        const copy = { ...item };
        delete copy.id; // Allow auto-increment to prevent ID collision
        outboxStore.add(copy);
      }
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      notifySyncListeners();
      resolve(true);
    };
    tx.onerror = () => reject(tx.error);
  });
}
