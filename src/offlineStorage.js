/**
 * offlineStorage.js
 * IndexedDB storage & offline synchronization for the Counting Stage.
 * Enables zero-latency local saves, offline operation, automatic background cloud sync,
 * and emergency JSON/CSV backups via USB.
 */

const DB_NAME = 'GCC_Election_Offline_DB';
const DB_VERSION = 1;

let _dbPromise = null;

/**
 * Initializes and opens the IndexedDB database.
 */
export function getDB() {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = req.result;

      // 1. Store for Counting Metadata (matrix, booths, posts, contest list, settings)
      if (!db.objectStoreNames.contains('counting_meta')) {
        db.createObjectStore('counting_meta', { keyPath: 'id' });
      }

      // 2. Store for Results Ledger (all entered vote records)
      if (!db.objectStoreNames.contains('results_ledger')) {
        const ledgerStore = db.createObjectStore('results_ledger', { keyPath: 'key' });
        ledgerStore.createIndex('by_form', 'FormSerial', { unique: false });
        ledgerStore.createIndex('by_table', 'TableNumber', { unique: false });
        ledgerStore.createIndex('by_post', 'Post', { unique: false });
      }

      // 3. Store for Outbox Sync Queue (forms awaiting cloud sync)
      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        queueStore.createIndex('by_status', 'status', { unique: false });
        queueStore.createIndex('by_timestamp', 'timestamp', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.error('IndexedDB open error:', req.error);
      reject(req.error);
    };
  });

  return _dbPromise;
}

/**
 * Helper to execute a transaction on an object store.
 */
async function txStore(storeName, mode = 'readonly') {
  const db = await getDB();
  const tx = db.transaction(storeName, mode);
  return { tx, store: tx.objectStore(storeName) };
}

// ─── Counting Metadata (Matrix, Booths, Posts, Contestants, Settings) ─────────

/**
 * Saves counting setup and metadata to IndexedDB.
 */
export async function saveCountingMeta(data) {
  try {
    const { tx, store } = await txStore('counting_meta', 'readwrite');
    const record = {
      id: 'current',
      savedMatrix: data.savedMatrix || null,
      booths: data.booths || [],
      posts: data.posts || [],
      finalList: data.finalList || [],
      settings: data.settings || {},
      cachedAt: new Date().toISOString()
    };
    store.put(record);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save counting meta to IndexedDB:', err);
    return false;
  }
}

/**
 * Retrieves cached counting setup and metadata.
 */
export async function getCountingMeta() {
  try {
    const { tx, store } = await txStore('counting_meta', 'readonly');
    const req = store.get('current');
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to read counting meta from IndexedDB:', err);
    return null;
  }
}

// ─── Results Ledger & Form Vote Persistence ──────────────────────────────────

/**
 * Generates a consistent composite key for a vote entry.
 */
export function makeVoteKey(tableNum, postName, candidateId) {
  return `${String(tableNum).trim()}_${String(postName).trim()}_${String(candidateId).trim()}`;
}

/**
 * Saves a completed form's vote counts locally to IndexedDB and enqueues for cloud sync.
 * Executes instantaneously with 0ms network latency.
 */
export async function saveFormResultsLocally(tableNum, postName, roundNum, formSerial, resultsArray) {
  const db = await getDB();
  const tx = db.transaction(['results_ledger', 'sync_queue'], 'readwrite');
  const ledgerStore = tx.objectStore('results_ledger');
  const queueStore = tx.objectStore('sync_queue');

  const now = new Date().toISOString();

  // 1. Update Results Ledger
  resultsArray.forEach(item => {
    const key = makeVoteKey(tableNum, postName, item.CandidateId);
    ledgerStore.put({
      key,
      TableNumber: tableNum,
      RoundNumber: roundNum,
      Post: postName,
      CandidateId: item.CandidateId,
      CandidateName: item.CandidateName,
      Votes: parseInt(item.Votes, 10) || 0,
      FormSerial: formSerial || 'N/A',
      updatedAt: now
    });
  });

  // 2. Enqueue into Outbox Sync Queue
  const syncId = 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  queueStore.put({
    id: syncId,
    formSerial: formSerial || 'N/A',
    tableNum,
    postName,
    roundNum,
    payload: resultsArray,
    timestamp: Date.now(),
    isoTime: now,
    status: 'pending', // 'pending' | 'syncing' | 'synced' | 'error'
    errorMsg: null,
    retryCount: 0
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:sync-state-changed'));
      }
      resolve({ ok: true, syncId });
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Completely deletes a form's vote counts locally from IndexedDB and cancels matching items in sync_queue.
 */
export async function deleteFormResultsLocally(tableNum, postName, formSerial) {
  try {
    const db = await getDB();
    const tx = db.transaction(['results_ledger', 'sync_queue'], 'readwrite');
    const ledgerStore = tx.objectStore('results_ledger');
    const queueStore = tx.objectStore('sync_queue');

    // 1. Delete matching entries from results_ledger
    const ledgerReq = ledgerStore.getAll();
    ledgerReq.onsuccess = () => {
      const items = ledgerReq.result || [];
      items.forEach(item => {
        const matchSerial = formSerial && formSerial !== 'N/A' && String(item.FormSerial) === String(formSerial);
        const matchTablePost = tableNum !== undefined && postName && String(item.TableNumber) === String(tableNum) && String(item.Post) === String(postName);
        if (matchSerial || matchTablePost) {
          ledgerStore.delete(item.key);
        }
      });
    };

    // 2. Delete matching entries from sync_queue
    const queueReq = queueStore.getAll();
    queueReq.onsuccess = () => {
      const qItems = queueReq.result || [];
      qItems.forEach(q => {
        const matchSerial = formSerial && formSerial !== 'N/A' && String(q.formSerial) === String(formSerial);
        const matchTablePost = tableNum !== undefined && postName && String(q.tableNum) === String(tableNum) && String(q.postName) === String(postName);
        if (matchSerial || matchTablePost) {
          queueStore.delete(q.id);
        }
      });
    };

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:sync-state-changed'));
        }
        resolve({ ok: true });
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('deleteFormResultsLocally error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Retrieves all vote results stored in the local IndexedDB ledger.
 */
export async function getAllResultsLocally() {
  try {
    const { store } = await txStore('results_ledger', 'readonly');
    const req = store.getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('Failed to read all results from IndexedDB:', err);
    return [];
  }
}

/**
 * Reconciles server results with local IndexedDB ledger:
 * Merges fresh server data into IndexedDB, while preserving any pending local outbox edits.
 */
export async function syncLedgerWithServer(serverResults = []) {
  if (!Array.isArray(serverResults)) return [];
  try {
    const db = await getDB();
    const pendingQueue = await getSyncQueue();
    const pendingKeys = new Set();

    // Collect all keys currently waiting in the sync queue
    pendingQueue.forEach(item => {
      if (item.status === 'pending' || item.status === 'syncing') {
        (item.payload || []).forEach(p => {
          pendingKeys.add(makeVoteKey(item.tableNum, item.postName, p.CandidateId));
        });
      }
    });

    const tx = db.transaction(['results_ledger'], 'readwrite');
    const ledgerStore = tx.objectStore('results_ledger');

    serverResults.forEach(r => {
      const key = makeVoteKey(r.TableNumber, r.Post, r.CandidateId);
      // Only write server data if this entry is not actively pending local sync
      if (!pendingKeys.has(key)) {
        ledgerStore.put({
          key,
          TableNumber: r.TableNumber,
          RoundNumber: r.RoundNumber,
          Post: r.Post,
          CandidateId: r.CandidateId,
          CandidateName: r.CandidateName,
          Votes: parseInt(r.Votes, 10) || 0,
          FormSerial: r.FormSerial || 'N/A',
          updatedAt: r.updatedAt || new Date().toISOString()
        });
      }
    });

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return await getAllResultsLocally();
  } catch (err) {
    console.warn('Error syncing ledger with server:', err);
    return await getAllResultsLocally();
  }
}

// ─── Outbox Sync Queue ────────────────────────────────────────────────────────

/**
 * Gets all items in the Outbox Sync Queue.
 */
export async function getSyncQueue(statusFilter = null) {
  try {
    const { store } = await txStore('sync_queue', 'readonly');
    const req = store.getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const list = req.result || [];
        if (statusFilter) {
          resolve(list.filter(i => i.status === statusFilter));
        } else {
          resolve(list);
        }
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('Error reading sync queue from IndexedDB:', err);
    return [];
  }
}

/**
 * Updates a sync queue item's status and error information.
 */
export async function updateSyncQueueItem(id, updates = {}) {
  try {
    const { tx, store } = await txStore('sync_queue', 'readwrite');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        Object.assign(item, updates);
        store.put(item);
      }
    };
    return new Promise((resolve) => {
      tx.oncomplete = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:sync-state-changed'));
        }
        resolve(true);
      };
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Error updating sync queue item:', err);
    return false;
  }
}

/**
 * Deletes a sync queue item (e.g. once successfully synced or dismissed).
 */
export async function removeSyncQueueItem(id) {
  try {
    const { tx, store } = await txStore('sync_queue', 'readwrite');
    store.delete(id);
    return new Promise((resolve) => {
      tx.oncomplete = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:sync-state-changed'));
        }
        resolve(true);
      };
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

/**
 * Returns count of unsynced items.
 */
export async function getPendingSyncCount() {
  const queue = await getSyncQueue();
  return queue.filter(i => i.status === 'pending' || i.status === 'error' || i.status === 'syncing').length;
}

/**
 * Flushes all pending forms in the results sync queue to the online server database.
 */
export async function flushResultsSyncQueue(saveResultsApiFn, getPasswordFn) {
  const queue = await getSyncQueue();
  const pending = queue.filter(i => i.status === 'pending' || i.status === 'error' || i.status === 'syncing');
  if (pending.length === 0) return 0;

  const pwd = typeof getPasswordFn === 'function' ? getPasswordFn() : getPasswordFn;
  if (!pwd) return 0;

  let successCount = 0;
  for (const item of pending) {
    if (!navigator.onLine) break;
    try {
      await updateSyncQueueItem(item.id, { status: 'syncing' });
      await saveResultsApiFn(pwd, item.payload);
      await updateSyncQueueItem(item.id, { status: 'synced', errorMsg: null });
      await removeSyncQueueItem(item.id);
      successCount++;
    } catch (err) {
      console.warn('Results queue flush error for item', item.id, err);
      await updateSyncQueueItem(item.id, { status: 'error', errorMsg: err.message });
      if (!navigator.onLine || err.message?.includes('Network') || err.message?.includes('fetch')) {
        break;
      }
    }
  }
  return successCount;
}

// ─── Emergency Backup Export & Import (USB Safety Net) ─────────────────────────

/**
 * Builds a complete JSON export of all local counting data, ledger, and sync status.
 */
export async function exportLocalDataAsJSON() {
  const meta = await getCountingMeta();
  const results = await getAllResultsLocally();
  const queue = await getSyncQueue();

  const exportPayload = {
    app: 'GCC_Election_Portal',
    type: 'COUNTING_OFFLINE_BACKUP',
    version: 1,
    exportedAt: new Date().toISOString(),
    meta,
    resultsCount: results.length,
    results,
    syncQueue: queue
  };

  return exportPayload;
}

/**
 * Generates and triggers browser download of an emergency JSON backup file.
 */
export async function downloadLocalBackupJSON(collegeShort = 'GCC') {
  const data = await exportLocalDataAsJSON();
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${collegeShort}_Counting_Backup_${dateStr}.json`;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return filename;
}

/**
 * Generates and triggers browser download of a clean CSV spreadsheet of all entered results.
 */
export async function downloadResultsCSV(collegeShort = 'GCC') {
  const results = await getAllResultsLocally();
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${collegeShort}_Counting_Ledger_${dateStr}.csv`;

  // Sort by FormSerial / Table / Post
  results.sort((a, b) => {
    const sA = parseInt(a.FormSerial, 10) || 0;
    const sB = parseInt(b.FormSerial, 10) || 0;
    if (sA !== sB) return sA - sB;
    const tA = parseInt(a.TableNumber, 10) || 0;
    const tB = parseInt(b.TableNumber, 10) || 0;
    if (tA !== tB) return tA - tB;
    return String(a.Post || '').localeCompare(String(b.Post || ''));
  });

  const header = ['Form Serial', 'Table Number', 'Round Number', 'Post', 'Candidate ID', 'Candidate Name', 'Votes', 'Recorded At'];
  const rows = results.map(r => [
    `"${r.FormSerial || ''}"`,
    `"${r.TableNumber || ''}"`,
    `"${r.RoundNumber || ''}"`,
    `"${(r.Post || '').replace(/"/g, '""')}"`,
    `"${r.CandidateId || ''}"`,
    `"${(r.CandidateName || '').replace(/"/g, '""')}"`,
    r.Votes || 0,
    `"${r.updatedAt || ''}"`
  ]);

  const csvContent = [header.join(','), ...rows.map(row => row.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return filename;
}

/**
 * Imports a previously downloaded JSON backup file into IndexedDB and queues it for cloud upload.
 */
export async function importBackupFromJSON(jsonText) {
  let parsed;
  try {
    parsed = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
  } catch (e) {
    throw new Error('Invalid JSON file format.');
  }

  if (!parsed || parsed.type !== 'COUNTING_OFFLINE_BACKUP' || !Array.isArray(parsed.results)) {
    throw new Error('Unrecognized backup file. Must be a valid Counting Offline Backup JSON.');
  }

  const db = await getDB();
  const tx = db.transaction(['counting_meta', 'results_ledger', 'sync_queue'], 'readwrite');
  const metaStore = tx.objectStore('counting_meta');
  const ledgerStore = tx.objectStore('results_ledger');
  const queueStore = tx.objectStore('sync_queue');

  // 1. Restore metadata if present
  if (parsed.meta) {
    metaStore.put({
      id: 'current',
      ...parsed.meta,
      restoredAt: new Date().toISOString()
    });
  }

  // 2. Restore results into ledger
  parsed.results.forEach(r => {
    const key = makeVoteKey(r.TableNumber, r.Post, r.CandidateId);
    ledgerStore.put({
      key,
      TableNumber: r.TableNumber,
      RoundNumber: r.RoundNumber,
      Post: r.Post,
      CandidateId: r.CandidateId,
      CandidateName: r.CandidateName,
      Votes: parseInt(r.Votes, 10) || 0,
      FormSerial: r.FormSerial || 'N/A',
      updatedAt: r.updatedAt || new Date().toISOString()
    });
  });

  // 3. Group results by form to queue for cloud sync
  const groupedByForm = {};
  parsed.results.forEach(r => {
    const formKey = `${r.TableNumber}_${r.Post}`;
    if (!groupedByForm[formKey]) {
      groupedByForm[formKey] = {
        tableNum: r.TableNumber,
        postName: r.Post,
        roundNum: r.RoundNumber,
        formSerial: r.FormSerial,
        payload: []
      };
    }
    groupedByForm[formKey].payload.push(r);
  });

  let queuedCount = 0;
  Object.values(groupedByForm).forEach(group => {
    const syncId = 'import_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    queueStore.put({
      id: syncId,
      formSerial: group.formSerial || 'N/A',
      tableNum: group.tableNum,
      postName: group.postName,
      roundNum: group.roundNum,
      payload: group.payload,
      timestamp: Date.now(),
      isoTime: new Date().toISOString(),
      status: 'pending',
      errorMsg: null,
      isImported: true
    });
    queuedCount++;
  });

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return {
    success: true,
    resultsCount: parsed.results.length,
    queuedFormsCount: queuedCount,
    exportedAt: parsed.exportedAt
  };
}
