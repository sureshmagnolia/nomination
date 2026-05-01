/**
 * api.js
 * All communication with the Google Apps Script Web App backend.
 * Includes in-memory caching and background sync queue for instant UI response.
 */
import { CONFIG } from './config.js';

const BASE_URL = CONFIG.APPS_SCRIPT_URL;

// --- Background Sync & Cache Infrastructure ---
let _cache = {};
const _syncQueue = [];
let _isSyncing = false;
let _statusCallback = null;

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
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(task.body),
      });
      if (!res.ok) throw new Error(`Network error: ${res.status}`);
      const data = await res.json();
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
  const cacheKey = JSON.stringify(params);
  if (_cache[cacheKey] !== undefined) return _cache[cacheKey];

  const url = new URL(BASE_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  url.searchParams.append('_t', Date.now()); 
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Network error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  
  _cache[cacheKey] = data;
  return data;
}

// Direct synchronous post (blocks UI until server responds)
async function post(body) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Network error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// Background queued post (resolves when server finishes)
function bgPost(body) {
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
  // Pre-fetchers
  initPublicData: async () => {
    const promises = [
      api.getPublicSchedule().catch(()=>null),
      api.getSettings().catch(()=>null),
      api.getPosts().catch(()=>null),
      api.getResults().catch(()=>null),
      api.getNominalRoll().catch(()=>null)
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
  getNomination: (id) => get({ action: 'getNomination', id }),
  getValidNominations: () => get({ action: 'getValidNominations' }),
  getFinalNominations: () => get({ action: 'getFinalNominations' }),
  submitNomination: (payload) => post({ action: 'submitNomination', ...payload }),
  submitWithdrawal: (id) => post({ action: 'submitWithdrawal', id }),

  // ─── Admin API ──────────────────────────────────────────────────────────────

  adminLogin: (password) => post({ action: 'adminLogin', password }),
  adminSendOTP: (password) => post({ action: 'adminSendOTP', password }),
  adminVerifyOTP: (password, otp) => post({ action: 'adminVerifyOTP', password, otp }),
  adminGetNominations: (password) => get({ action: 'adminGetNominations', password }),

  adminVerifyNomination: (password, id, status) => {
    updateCache({ action: 'adminGetNominations', password }, (noms) => {
      const n = noms.find(x => x.id === id);
      if (n) n.status = status;
      return noms;
    });
    bgPost({ action: 'adminVerifyNomination', password, id, status });
    return Promise.resolve({ ok: true });
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

  adminGetSettings: (password) => get({ action: 'adminGetSettings', password }),
  
  adminUpdateSettings: (password, settings) => {
    updateCache({ action: 'adminGetSettings', password }, old => ({...old, ...settings}));
    bgPost({ action: 'adminUpdateSettings', password, ...settings });
    return Promise.resolve({ ok: true });
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

  getResults: () => get({ action: 'getResults' }),

  adminSaveResults: (password, results) => {
    // We queue the network save, invalidate the results cache since it's hard to append optimally here
    bgPost({ action: 'adminSaveResults', password, results }).then(() => invalidateCache('getResults'));
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

  // ─── Nominal Roll Management ────────────────────────────────────────────────
  
  getSettings: () => get({ action: 'getSettings' }),

  adminAddStudent: async (password, studentData) => {
    await bgPost({ action: 'adminAddStudent', password, ...studentData });
    invalidateCache('getNominalRoll');
    return { ok: true };
  },

  adminDeleteStudent: async (password, serial) => {
    await bgPost({ action: 'adminDeleteStudent', password, serial });
    invalidateCache('getNominalRoll');
    return { ok: true };
  },

  adminFinalizeRoll: async (password) => {
    await bgPost({ action: 'adminFinalizeRoll', password });
    invalidateCache('getNominalRoll');
    return { ok: true };
  },

  // ─── Schedule Management ───────────────────────────────────────────────────

  getPublicSchedule: () => get({ action: 'getPublicSchedule' }),

  adminSaveSchedule: (password, scheduleData) => {
    updateCache({ action: 'getPublicSchedule' }, scheduleData);
    bgPost({ action: 'adminSaveSchedule', password, ...scheduleData });
    return Promise.resolve({ ok: true });
  },
};
