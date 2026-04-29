/**
 * api.js
 * All communication with the Google Apps Script Web App backend.
 */
import { CONFIG } from './config.js';

const BASE_URL = CONFIG.APPS_SCRIPT_URL;

async function get(params) {
  const url = new URL(BASE_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Network error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function post(body) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    // IMPORTANT: Must use text/plain (not application/json) to avoid CORS preflight
    // OPTIONS requests that Google Apps Script cannot handle. The body is still
    // valid JSON and Apps Script reads it via e.postData.contents.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Network error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const api = {
  /** Fetch the full nominal roll */
  getNominalRoll: () => get({ action: 'getNominalRoll' }),

  /** Fetch all configured posts with their rules */
  getPosts: () => get({ action: 'getPosts' }),

  /** Fetch a single nomination by its 10-digit ID */
  getNomination: (id) => get({ action: 'getNomination', id }),

  /** Fetch the published list of valid nominations (only if admin has published) */
  getValidNominations: () => get({ action: 'getValidNominations' }),

  /** Fetch the published final list (post-withdrawals) */
  getFinalNominations: () => get({ action: 'getFinalNominations' }),

  /** Submit a new nomination form */
  submitNomination: (payload) => post({ action: 'submitNomination', ...payload }),

  /** Submit a withdrawal request by nomination ID */
  submitWithdrawal: (id) => post({ action: 'submitWithdrawal', id }),

  // ─── Admin API ──────────────────────────────────────────────────────────────

  /** Verify admin password; returns { ok: true } or throws */
  adminLogin: (password) => post({ action: 'adminLogin', password }),

  /** Fetch all nominations for admin review */
  adminGetNominations: (password) => get({ action: 'adminGetNominations', password }),

  /** Mark a nomination as Valid or Rejected */
  adminVerifyNomination: (password, id, status) =>
    post({ action: 'adminVerifyNomination', password, id, status }),

  /** Approve a withdrawal request */
  adminApproveWithdrawal: (password, id) =>
    post({ action: 'adminApproveWithdrawal', password, id }),

  /** Publish the valid nominations list to students */
  adminPublishValidList: (password) =>
    post({ action: 'adminPublishValidList', password }),

  /** Publish the final nominations list to students */
  adminPublishFinalList: (password) =>
    post({ action: 'adminPublishFinalList', password }),

  /** Get current publish settings */
  adminGetSettings: (password) => get({ action: 'adminGetSettings', password }),

  // ─── Posts Management ───────────────────────────────────────────────────────

  /** Admin: get all posts */
  adminGetPosts: (password) => get({ action: 'adminGetPosts', password }),

  /** Admin: add a new post */
  adminAddPost: (password, postData) =>
    post({ action: 'adminAddPost', password, ...postData }),

  /** Admin: update an existing post */
  adminUpdatePost: (password, postData) =>
    post({ action: 'adminUpdatePost', password, ...postData }),

  /** Admin: delete a post */
  adminDeletePost: (password, postName) =>
    post({ action: 'adminDeletePost', password, postName }),

  /** Admin: reorder posts (send full ordered array of post names) */
  adminReorderPosts: (password, posts) =>
    post({ action: 'adminReorderPosts', password, posts }),

  // ─── Booths Management ───────────────────────────────────────────────────────

  /** Admin: get all booths */
  adminGetBooths: (password) => get({ action: 'adminGetBooths', password }),

  /** Admin: save all booths */
  adminSaveBooths: (password, booths) =>
    post({ action: 'adminSaveBooths', password, booths }),

  // ─── Locations Management ────────────────────────────────────────────────────

  /** Admin: get available locations */
  adminGetLocations: (password) => get({ action: 'adminGetLocations', password }),

  /** Admin: save locations */
  adminSaveLocations: (password, locations) =>
    post({ action: 'adminSaveLocations', password, locations }),

  // ─── Results Management ──────────────────────────────────────────────────────

  /** Public: get all results */
  getResults: () => get({ action: 'getResults' }),

  /** Admin: save results for a table and post */
  adminSaveResults: (password, results) =>
    post({ action: 'adminSaveResults', password, results }),

  // ─── Testing Tools ───────────────────────────────────────────────────────────

  /** Admin: inject synthetic test nominations for all posts */
  adminInjectTestData: (password) =>
    post({ action: 'adminInjectTestData', password }),

  /** Admin: wipe all transactional data (Nominations, Valid/Final Lists, Results) */
  adminWipeData: (password) =>
    post({ action: 'adminWipeData', password }),
};
