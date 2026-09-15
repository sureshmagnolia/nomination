/**
 * api.js
 * All communication with the Vercel backend.
 * Includes in-memory caching and background sync queue for instant UI response.
 */
import { CONFIG } from './config.js';

const BASE_URL = CONFIG.API_BASE_URL;

// --- Background Sync & Cache Infrastructure ---
let _cache = {};
const _syncQueue = [];
let _isSyncing = false;
let _statusCallback = null;

// ─── Session Helpers ──────────────────────────────────────────────────────────
function getSessionToken() {
  // sessionStorage is kept in sync with localStorage by layout.js on every admin page load
  return sessionStorage.getItem('adminSessionToken') || localStorage.getItem('adminSessionToken');
}

function handleSessionExpired() {
  // Clear ALL admin session data from both storage locations
  localStorage.removeItem('adminPwd');
  localStorage.removeItem('adminLoginDate');
  localStorage.removeItem('adminSessionToken');
  sessionStorage.removeItem('adminSessionToken');
  _cache = {};
  alert('⚠️ Another admin has logged in from a different device. You have been logged out.');
  window.location.hash = '/admin';
}

export function setSyncStatusCallback(cb) {
  _statusCallback = cb;
}

function updateStatus(status) {
  if (_statusCallback) _statusCallback(status);
}

function setupUnloadGuard() {
  if (window._unloadGuardAdded) return;
  window._unloadGuardAdded = true;
  window.addEventListener('beforeunload', (e) => {
    if (_syncQueue.length > 0 || _isSyncing) {
      e.returnValue = "Changes are still saving. Are you sure you want to leave?";
      return e.returnValue;
    }
  });
}

async function processQueue() {
  if (_isSyncing || _syncQueue.length === 0) return;
  _isSyncing = true;
  setupUnloadGuard();
  updateStatus('saving');

  while (_syncQueue.length > 0) {
    const task = _syncQueue[0];
    try {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task.body),
      });
      if (!res.ok) {
        let errMessage = `Network error: ${res.status}`;
        try { const errData = await res.json(); if (errData.error) errMessage = errData.error; } catch(e) {}
        throw new Error(errMessage);
      }
      const data = await res.json();
      if (data.error === 'SESSION_EXPIRED') { handleSessionExpired(); _syncQueue.length = 0; break; }
      if (data.error) throw new Error(data.error);
      if (task.resolve) task.resolve(data);
    } catch (err) {
      console.error("Background sync failed for", task.body.action, err);
      if (task.reject) task.reject(err);
    }
    _syncQueue.shift();
  }

  _isSyncing = false;
  updateStatus('saved');
  setTimeout(() => {
    if (!_isSyncing && _syncQueue.length === 0) {
      updateStatus('idle');
    }
  }, 3000);
}

async function get(params) {
  const token = getSessionToken();
  const headers = {};
  const queryParams = { ...params };
  
  if (queryParams.password) {
    headers['X-Admin-Password'] = queryParams.password;
    delete queryParams.password;
  }
  if (token) {
    headers['X-Session-Token'] = token;
    delete queryParams.sessionToken;
  }

  // Use the original params for the cache key to maintain compatibility with updateCache
  const cacheKey = JSON.stringify(params);
  if (_cache[cacheKey] !== undefined) return _cache[cacheKey];

  const url = new URL(BASE_URL, window.location.origin);
  Object.entries(queryParams).forEach(([k, v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    let errMessage = `Network error: ${res.status}`;
    try { const errData = await res.json(); if (errData.error) errMessage = errData.error; } catch(e) {}
    throw new Error(errMessage);
  }
  const data = await res.json();
  if (data.error === 'SESSION_EXPIRED') { handleSessionExpired(); throw new Error('SESSION_EXPIRED'); }
  if (data.error) throw new Error(data.error);

  _cache[cacheKey] = data;
  return data;
}

// Direct synchronous post (blocks UI until server responds)
async function post(body) {
  // Inject session token for admin requests
  const token = getSessionToken();
  if (token && body.password) body = { ...body, sessionToken: token };

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let errMessage = `Network error: ${res.status}`;
    try { const errData = await res.json(); if (errData.error) errMessage = errData.error; } catch(e) {}
    throw new Error(errMessage);
  }
  const data = await res.json();
  if (data.error === 'SESSION_EXPIRED') { handleSessionExpired(); throw new Error('SESSION_EXPIRED'); }
  if (data.error) throw new Error(data.error);
  return data;
}

// Background queued post (resolves when server finishes)
function bgPost(body) {
  // Inject session token for admin requests
  const token = getSessionToken();
  if (token && body.password) body = { ...body, sessionToken: token };

  return new Promise((resolve, reject) => {
    _syncQueue.push({ body, resolve, reject });
    processQueue();
  });
}

function updateCache(params, newDataOrUpdater) {
  const key = JSON.stringify(params);
  if (typeof newDataOrUpdater === 'function') {
    if (_cache[key] !== undefined) _cache[key] = newDataOrUpdater(_cache[key]);
  } else {
    _cache[key] = newDataOrUpdater;
  }
}

// Clear specific caches based on substring action match
function invalidateCache(actionSubstring) {
  Object.keys(_cache).forEach(k => {
    if (k.includes(actionSubstring)) delete _cache[k];
  });
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const api = {
  invalidateCache,
  
  // Pre-fetchers
  initPublicData: async () => {
    const promises = [
      api.getPublicSchedule().catch(()=>null),
      api.getSettings().catch(()=>null),
      api.getPosts().catch(()=>null),
      api.getResults().catch(()=>null),
      api.getNominalRoll().catch(()=>null),
      api.getPublicNominations().catch(()=>null),
      api.getValidNominations().catch(()=>null),
      api.getFinalNominations().catch(()=>null)
    ];
    await Promise.all(promises);
  },

  initAdminData: async (password) => {
    const promises = [
      api.adminGetNominations(password).catch(()=>null),
      api.adminGetSettings(password).catch(()=>null),
      api.adminGetPosts(password).catch(()=>null),
      api.adminGetBooths(password).catch(()=>null),
      api.adminGetLocations(password).catch(()=>null),
      api.adminGetBallotPlan(password).catch(()=>null),
      api.adminGetCountingMatrix(password).catch(()=>null)
    ];
    await Promise.all(promises);
  },

  /** Fetch the full nominal roll */
  getNominalRoll: () => get({ action: 'getNominalRoll' }),
  getPosts: () => get({ action: 'getPosts' }),
  getPublicNominations: () => get({ action: 'getPublicNominations' }),
  getNomination: (id, admissionNo) => get({ action: 'getNomination', id, admissionNo }),
  getValidNominations: () => get({ action: 'getValidNominations' }),
  getFinalNominations: () => get({ action: 'getFinalNominations' }),
  submitNomination: (payload) => post({ action: 'submitNomination', ...payload }),
  submitWithdrawal: (id, admissionNo) => post({ action: 'submitWithdrawal', id, admissionNo }),

  // ─── Admin API ──────────────────────────────────────────────────────────────

  adminLogin: async (password) => {
    // Login does NOT send a sessionToken — it creates a new one
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adminLogin', password }),
    });
    if (!res.ok) throw new Error(`Network error: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (data.sessionToken) {
      sessionStorage.setItem('adminSessionToken', data.sessionToken);
    }
    return data;
  },
  adminLogout: (password) => post({ action: 'adminLogout', password }),
  adminSendOTP: (password) => post({ action: 'adminSendOTP', password }),
  adminVerifyOTP: (password, otp) => post({ action: 'adminVerifyOTP', password, otp }),
  adminGetNominations: (password) => get({ action: 'adminGetNominations', password }),
  adminGetFinalNominations: (password) => get({ action: 'adminGetFinalNominations', password }),

  adminVerifyNomination: (password, id, status) => {
    updateCache({ action: 'adminGetNominations', password }, (noms) => {
      const n = noms.find(x => x.id === id);
      if (n) n.status = status;
      return noms;
    });
    bgPost({ action: 'adminVerifyNomination', password, id, status });
    return Promise.resolve({ ok: true });
  },

  adminDeleteNomination: async (password, id) => {
    const res = await post({ action: 'adminDeleteNomination', password, confirmPassword: password, id });
    invalidateCache('adminGetNominations');
    invalidateCache('getPublicNominations');
    invalidateCache('getValidNominations');
    invalidateCache('getFinalNominations');
    return res;
  },

  adminApproveWithdrawal: (password, id) => {
    updateCache({ action: 'adminGetNominations', password }, (noms) => {
      const n = noms.find(x => x.id === id);
      if (n) n.withdrawalStatus = 'Approved';
      return noms;
    });
    bgPost({ action: 'adminApproveWithdrawal', password, id });
    return Promise.resolve({ ok: true });
  },

  adminDirectWithdrawal: (password, id) => {
    updateCache({ action: 'adminGetNominations', password }, (noms) => {
      const n = noms.find(x => x.id === id);
      if (n) n.withdrawalStatus = 'Approved';
      return noms;
    });
    bgPost({ action: 'adminDirectWithdrawal', password, id });
    return Promise.resolve({ ok: true });
  },

  adminRestoreWithdrawal: (password, id) => {
    updateCache({ action: 'adminGetNominations', password }, (noms) => {
      const n = noms.find(x => x.id === id);
      if (n) n.withdrawalStatus = 'None';
      return noms;
    });
    bgPost({ action: 'adminRestoreWithdrawal', password, id });
    invalidateCache('getFinalNominations');
    invalidateCache('adminGetFinalNominations');
    return Promise.resolve({ ok: true });
  },

  adminPublishValidList: (password) => {
    updateCache({ action: 'adminGetSettings', password }, old => ({...old, validListPublished: 'true'}));
    bgPost({ action: 'adminPublishValidList', password });
    invalidateCache('getValidNominations');
    return Promise.resolve({ ok: true });
  },

  adminPublishFinalList: (password) => {
    updateCache({ action: 'adminGetSettings', password }, old => ({...old, finalListPublished: 'true'}));
    bgPost({ action: 'adminPublishFinalList', password });
    invalidateCache('getFinalNominations');
    return Promise.resolve({ ok: true });
  },

  adminUnpublishValidList: async (password) => {
    updateCache({ action: 'adminGetSettings', password }, old => ({...old, validListPublished: 'false', finalListPublished: 'false'}));
    await bgPost({ action: 'adminUnpublishValidList', password });
    invalidateCache('getValidNominations');
    invalidateCache('getFinalNominations');
    return { ok: true };
  },

  adminUnpublishFinalList: async (password) => {
    updateCache({ action: 'adminGetSettings', password }, old => ({...old, finalListPublished: 'false'}));
    await bgPost({ action: 'adminUnpublishFinalList', password });
    invalidateCache('getFinalNominations');
    return { ok: true };
  },

  adminGetSettings: (password) => get({ action: 'adminGetSettings', password }),
  
  adminUpdateSettings: (password, settings) => {
    updateCache({ action: 'adminGetSettings', password }, old => ({...old, ...settings}));
    bgPost({ action: 'adminUpdateSettings', password, ...settings });
    return Promise.resolve({ ok: true });
  },

  adminUpdateCredentials: (password, credentials) => {
    return post({ action: 'adminUpdateCredentials', password, ...credentials });
  },

  getPublicSettings: () => get({ action: 'adminGetSettings', password: 'NONE' }),

  // ─── Posts Management ───────────────────────────────────────────────────────

  adminGetPosts: (password) => get({ action: 'adminGetPosts', password }),

  adminAddPost: async (password, postData) => {
    updateCache({ action: 'adminGetPosts', password }, posts => [...posts, postData]);
    await bgPost({ action: 'adminAddPost', password, ...postData });
    invalidateCache('getPosts');
    return { ok: true };
  },

  adminUpdatePost: async (password, postData) => {
    updateCache({ action: 'adminGetPosts', password }, posts => {
      const idx = posts.findIndex(p => p.post === postData.post);
      if (idx !== -1) posts[idx] = postData;
      return posts;
    });
    await bgPost({ action: 'adminUpdatePost', password, ...postData });
    invalidateCache('getPosts');
    return { ok: true };
  },

  adminDeletePost: async (password, postName) => {
    updateCache({ action: 'adminGetPosts', password }, posts => posts.filter(p => p.post !== postName));
    await bgPost({ action: 'adminDeletePost', password, postName });
    invalidateCache('getPosts');
    return { ok: true };
  },

  adminReorderPosts: async (password, postsList) => {
    updateCache({ action: 'adminGetPosts', password }, posts => {
      const pMap = {};
      posts.forEach(p => pMap[p.post] = p);
      return postsList.map(name => pMap[name]).filter(Boolean);
    });
    await bgPost({ action: 'adminReorderPosts', password, posts: postsList });
    invalidateCache('getPosts');
    return { ok: true };
  },

  // ─── Booths & Locations ───────────────────────────────────────────────────────

  adminGetBooths: (password) => get({ action: 'adminGetBooths', password }),

  adminSaveBooths: (password, booths) => {
    updateCache({ action: 'adminGetBooths', password }, booths);
    bgPost({ action: 'adminSaveBooths', password, booths });
    return Promise.resolve({ ok: true });
  },

  adminGetLocations: (password) => get({ action: 'adminGetLocations', password }),

  adminSaveLocations: (password, locations) => {
    updateCache({ action: 'adminGetLocations', password }, locations);
    bgPost({ action: 'adminSaveLocations', password, locations });
    return Promise.resolve({ ok: true });
  },

  // ─── Results Management ──────────────────────────────────────────────────────

  getResults: (force = false) => {
    if (force) invalidateCache('getResults');
    return get({ action: 'getResults' });
  },

  adminGetResults: (password, force = false) => {
    if (force) invalidateCache('adminGetResults');
    return get({ action: 'adminGetResults', password });
  },

  adminToggleLockResults: async (password) => {
    const res = await post({ action: 'adminToggleLockResults', password });
    updateCache({ action: 'adminGetSettings', password }, old => ({ ...old, resultsLocked: res.locked ? 'true' : 'false' }));
    invalidateCache('getSettings');
    invalidateCache('adminGetSettings');
    return res;
  },

  adminTogglePublishResults: async (password) => {
    const res = await post({ action: 'adminTogglePublishResults', password });
    updateCache({ action: 'adminGetSettings', password }, old => ({ ...old, resultsPublished: res.published ? 'true' : 'false' }));
    invalidateCache('getResults');
    invalidateCache('adminGetResults');
    invalidateCache('getSettings');
    invalidateCache('adminGetSettings');
    return res;
  },

  adminLockResults: async (password) => {
    const res = await post({ action: 'adminLockResults', password });
    updateCache({ action: 'adminGetSettings', password }, old => ({ ...old, resultsLocked: 'true' }));
    invalidateCache('getSettings');
    invalidateCache('adminGetSettings');
    return res;
  },

  adminUnlockResults: async (password) => {
    const res = await post({ action: 'adminUnlockResults', password });
    updateCache({ action: 'adminGetSettings', password }, old => ({ ...old, resultsLocked: 'false' }));
    invalidateCache('getSettings');
    invalidateCache('adminGetSettings');
    return res;
  },

  adminPublishResults: async (password) => {
    const res = await post({ action: 'adminPublishResults', password });
    updateCache({ action: 'adminGetSettings', password }, old => ({ ...old, resultsPublished: 'true' }));
    invalidateCache('getResults');
    invalidateCache('adminGetResults');
    invalidateCache('getSettings');
    invalidateCache('adminGetSettings');
    return res;
  },

  adminUnpublishResults: async (password) => {
    const res = await post({ action: 'adminUnpublishResults', password });
    updateCache({ action: 'adminGetSettings', password }, old => ({ ...old, resultsPublished: 'false' }));
    invalidateCache('getResults');
    invalidateCache('adminGetResults');
    invalidateCache('getSettings');
    invalidateCache('adminGetSettings');
    return res;
  },

  adminSaveResults: (password, results) => {
    // We queue the network save, invalidate the results cache since it's hard to append optimally here
    bgPost({ action: 'adminSaveResults', password, results }).then(() => {
      invalidateCache('getResults');
      invalidateCache('adminGetResults');
    });
    return Promise.resolve({ ok: true });
  },

  adminInjectTestData: (password) => post({ action: 'adminInjectTestData', password }),
  adminWipeData: (password) => {
    _cache = {}; // Clear everything
    return post({ action: 'adminWipeData', password });
  },

  // ─── Counting Matrix Persistence ─────────────────────────────────────────────

  adminGetCountingMatrix: (password) => get({ action: 'adminGetCountingMatrix', password }),

  adminSaveCountingMatrix: (password, matrixData) => {
    updateCache({ action: 'adminGetCountingMatrix', password }, matrixData);
    bgPost({ action: 'adminSaveCountingMatrix', password, matrixData });
    return Promise.resolve({ ok: true });
  },

  adminGenerateBallotPlan: async (password) => {
    // This generates heavily on the backend, so we must wait
    const res = await bgPost({ action: 'adminGenerateBallotPlan', password });
    updateCache({ action: 'adminGetBallotPlan', password }, res.plan);
    return res;
  },

  adminGetBallotPlan: (password) => get({ action: 'adminGetBallotPlan', password }),
  
  adminRunAudit: (password) => post({ action: 'adminRunAudit', password }),

  // ─── Nominal Roll Management ────────────────────────────────────────────────
  
  getSettings: () => get({ action: 'getSettings' }),

  adminAddStudent: async (password, studentData) => {
    await bgPost({ action: 'adminAddStudent', password, ...studentData });
    invalidateCache('getNominalRoll');
    return { ok: true };
  },

  adminUpdateStudent: async (password, studentData) => {
    await bgPost({ action: 'adminUpdateStudent', password, ...studentData });
    invalidateCache('getNominalRoll');
    return { ok: true };
  },

  adminDeleteStudent: async (password, serial) => {
    await bgPost({ action: 'adminDeleteStudent', password, serial });
    invalidateCache('getNominalRoll');
    return { ok: true };
  },

  adminPublishDraftRoll: async (password) => {
    const res = await post({ action: 'adminPublishDraftRoll', password });
    invalidateCache('getSettings');
    invalidateCache('adminGetSettings');
    return res;
  },

  adminUnpublishDraftRoll: async (password) => {
    const res = await post({ action: 'adminUnpublishDraftRoll', password });
    invalidateCache('getSettings');
    invalidateCache('adminGetSettings');
    return res;
  },

  submitRollCorrection: (payload) => post({ action: 'submitRollCorrection', ...payload }),

  adminGetRollCorrections: (password) => get({ action: 'adminGetRollCorrections', password }),

  adminUpdateRollCorrection: (password, id, status, notes = '') => 
    post({ action: 'adminUpdateRollCorrection', password, id, status, notes }),

  adminFinalizeRoll: async (password, options = {}) => {
    const res = await post({ action: 'adminFinalizeRoll', password, ...options });
    if (res && res.requiresMatching) return res;
    invalidateCache('getSettings');
    invalidateCache('adminGetSettings');
    invalidateCache('getNominalRoll');
    return res || { ok: true };
  },

  adminUnfinalizeRoll: async (password) => {
    const res = await post({ action: 'adminUnfinalizeRoll', password, confirmPassword: password });
    invalidateCache('getSettings');
    invalidateCache('adminGetSettings');
    invalidateCache('getNominalRoll');
    return res || { ok: true };
  },

  adminGetNominalRollTemplate: (password) =>
    get({ action: 'adminGetNominalRollTemplate', password }),

  adminUploadNominalRoll: async (password, payload) => {
    // This is a heavy destructive operation — must be blocking (not bgPost)
    const res = await post({ action: 'adminUploadNominalRoll', password, ...payload });
    // Wipe all related caches so the UI refreshes with the new data
    invalidateCache('getNominalRoll');
    invalidateCache('adminGetNominations');
    invalidateCache('getSettings');
    invalidateCache('adminGetSettings');
    invalidateCache('getValidNominations');
    invalidateCache('getFinalNominations');
    invalidateCache('getPublicNominations');
    return res;
  },

  // ─── Schedule Management ───────────────────────────────────────────────────

  getPublicSchedule: () => get({ action: 'getPublicSchedule' }),

  adminSaveSchedule: (password, scheduleData) => {
    updateCache({ action: 'getPublicSchedule' }, scheduleData);
    bgPost({ action: 'adminSaveSchedule', password, ...scheduleData });
    return Promise.resolve({ ok: true });
  },

  // ─── Backup & Restore Suite ─────────────────────────────────────────────────

  adminExportBackup: (password) => post({ action: 'adminExportBackup', password }),

  adminGetSnapshots: (password) => get({ action: 'adminGetSnapshots', password }),

  adminDownloadSnapshot: (password, snapshotId) =>
    post({ action: 'adminDownloadSnapshot', password, snapshotId }),

  adminRestoreBackup: async (password, payload) => {
    const res = await post({ action: 'adminRestoreBackup', password, ...payload });
    _cache = {}; // Clear all cache so fresh state reflects across UI
    return res;
  },

  adminRevertSnapshot: async (password, snapshotId) => {
    const res = await post({ action: 'adminRevertSnapshot', password, snapshotId });
    _cache = {};
    return res;
  },
};
