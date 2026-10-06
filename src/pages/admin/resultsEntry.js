/**
 * pages/admin/resultsEntry.js
 * Admin page to input vote counts for each Table + Post combination.
 * Fully Offline-First: Powered by IndexedDB for 0ms local saves, continuous background
 * cloud synchronization when connected, emergency JSON/CSV downloads, and USB import.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading, sortPosts } from '../../utils.js';
import {
  saveCountingMeta,
  getCountingMeta,
  saveFormResultsLocally,
  deleteFormResultsLocally,
  getAllResultsLocally,
  syncLedgerWithServer,
  getSyncQueue,
  updateSyncQueueItem,
  removeSyncQueueItem,
  getPendingSyncCount,
  downloadLocalBackupJSON,
  downloadResultsCSV,
  importBackupFromJSON
} from '../../offlineStorage.js';

let isSyncing = false;
let currentPwd = null;
let currentMain = null;
let cachedAllResults = [];
let cachedSerialsMeta = {};
let cachedBooths = [];
let cachedPosts = [];
let cachedFinalList = [];
let cachedMatrix = null;
let isOfflineMode = false;

window.addEventListener('beforeunload', async (e) => {
  try {
    const pending = await getPendingSyncCount();
    if (pending > 0) {
      e.preventDefault();
      e.returnValue = `You have ${pending} unsynced form(s) saved on this device. They will sync automatically once internet is restored.`;
    }
  } catch (_) {}
});

/**
 * Re-applies any pending local form edits from IndexedDB queue onto the in-memory results
 */
async function mergeQueueIntoResults(allResults) {
  try {
    const queue = await getSyncQueue();
    queue.forEach(item => {
      if (!item.payload || item.status === 'synced') return;
      item.payload.forEach(ns => {
        const idx = allResults.findIndex(r =>
          String(r.TableNumber) === String(ns.TableNumber) &&
          String(r.Post) === ns.Post &&
          r.CandidateId === ns.CandidateId
        );
        if (idx >= 0) {
          allResults[idx].Votes = ns.Votes;
          allResults[idx].RoundNumber = ns.RoundNumber;
          allResults[idx].FormSerial = ns.FormSerial;
        } else {
          allResults.push({ ...ns });
        }
      });
    });
  } catch (err) {
    console.warn('mergeQueueIntoResults error:', err);
  }
}

export async function renderAdminResultsEntry(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  currentPwd = pwd;
  renderAdminLayout(container, 'results-entry', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Initializing counting database...</p></div>
  `);

  let booths = [], posts = [], nominationsRaw = [], allResults = [], savedMatrix = null, settings = {};
  isOfflineMode = false;

  try {
    // Attempt online fetch first
    [booths, posts, nominationsRaw, allResults, savedMatrix, settings] = await Promise.all([
      api.adminGetBooths(pwd),
      api.getPosts(),
      api.adminGetNominations(pwd),
      api.adminGetResults(pwd, true),
      api.adminGetCountingMatrix(pwd, true),
      api.adminGetSettings(pwd, true)
    ]);

    const allNoms = Array.isArray(nominationsRaw) ? nominationsRaw : [];
    const finalList = allNoms.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');

    // Cache metadata and reconcile server data with IndexedDB
    await saveCountingMeta({ booths, posts, finalList, savedMatrix, settings });
    allResults = await syncLedgerWithServer(allResults);

    cachedBooths = booths;
    cachedPosts = posts;
    cachedFinalList = finalList;
    cachedMatrix = savedMatrix;
    cachedAllResults = allResults;

  } catch (netErr) {
    console.warn('Network unavailable, attempting IndexedDB offline fallback:', netErr);
    isOfflineMode = true;

    // Load from IndexedDB
    const cachedMeta = await getCountingMeta();
    if (cachedMeta && cachedMeta.savedMatrix) {
      booths = cachedMeta.booths || [];
      posts = cachedMeta.posts || [];
      savedMatrix = cachedMeta.savedMatrix;
      settings = cachedMeta.settings || {};
      const finalList = cachedMeta.finalList || [];
      allResults = await getAllResultsLocally();

      cachedBooths = booths;
      cachedPosts = posts;
      cachedFinalList = finalList;
      cachedMatrix = savedMatrix;
      cachedAllResults = allResults;
    } else {
      container.querySelector('#adminMain').innerHTML = `
        <div class="glass p-8 rounded-2xl border border-rose-500/30 text-center max-w-lg mx-auto my-12">
          <div class="text-4xl mb-3">📡</div>
          <h3 class="text-lg font-bold text-rose-300">No Offline Counting Data Available</h3>
          <p class="text-slate-400 text-sm mt-2">Cannot connect to the server, and this device has not cached the counting matrix yet.</p>
          <div class="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button onclick="location.reload()" class="btn btn-primary text-xs">🔄 Retry Connection</button>
            <label for="emergencyFileImport" class="btn btn-secondary text-xs bg-slate-800 hover:bg-slate-700 cursor-pointer">
              <span>📥 Import USB Backup (.json)</span>
              <input type="file" id="emergencyFileImport" accept=".json" class="hidden">
            </label>
          </div>
        </div>
      `;
      // Setup emergency import handler
      container.querySelector('#emergencyFileImport')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          await importBackupFromJSON(text);
          showToast('Backup successfully imported! Reloading...', 'success');
          renderAdminResultsEntry(container);
        } catch (err) {
          showToast(`Import failed: ${err.message}`, 'error');
        }
      });
      return;
    }
  }

  const finalList = cachedFinalList;
  await mergeQueueIntoResults(allResults);
  renderEntryUI(container.querySelector('#adminMain'), pwd, booths, posts, finalList, allResults, savedMatrix, settings);
}

function renderEntryUI(main, pwd, booths, posts, finalList, allResults, savedMatrix, settings = {}) {
  currentMain = main;
  const isLocked = settings.resultsLocked === 'true';
  const pName = p => String(p.post || p.name || '');

  if (!savedMatrix) {
    main.innerHTML = `
      <div class="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
        <div class="text-5xl mb-4">⚠️</div>
        <h3 class="text-xl font-bold text-white mb-2">Matrix Not Set</h3>
        <p class="text-slate-400 mb-6 max-w-md mx-auto">The Counting Matrix must be generated and saved in the "Counting Setup" page before you can enter results.</p>
        <a href="#/admin/counting" class="btn btn-primary px-8 inline-block">Go to Counting Setup</a>
      </div>
    `;
    return;
  }

  const { matrix, formSerials } = savedMatrix;
  const serialMap = {};
  Object.entries(formSerials).forEach(([key, serial]) => {
    const [t, r] = key.split('-').map(Number);
    const post = matrix[t][r];
    serialMap[serial] = { t, r, postName: pName(post) };
  });

  const allFormSerialsMeta = {};
  Object.entries(formSerials).forEach(([key, serial]) => {
    const [t, r] = key.split('-').map(Number);
    const post = matrix[t][r];
    const boothNum = booths[t]?.boothNumber;
    allFormSerialsMeta[serial] = { serial, tableNum: boothNum, postName: pName(post), roundNum: r + 1 };
  });
  cachedSerialsMeta = allFormSerialsMeta;

  main.innerHTML = `
    <div class="page-enter w-full max-w-[1500px] mx-auto space-y-4">
      <!-- Top Title & Connectivity Bar -->
      <div class="glass rounded-2xl p-4 sm:p-5 border border-white/10 shadow-xl space-y-3">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h3 class="text-xl font-bold text-white flex items-center gap-2">
              <span>🗳️</span> <span>Vote Counting Entry</span>
            </h3>
            <p class="text-slate-400 text-xs sm:text-sm mt-0.5">
              Enter Form Serial Numbers to record physical ballot counts. Works 100% offline with automatic cloud synchronization.
            </p>
          </div>
          <!-- Action Buttons (Backup, CSV, Import, Sync) -->
          <div class="flex flex-wrap items-center gap-2">
            <button id="btnSyncNow" class="btn btn-sm btn-primary flex items-center gap-1.5 text-xs font-bold shadow-md shadow-indigo-950/40">
              <span id="syncIcon">⚡</span> <span id="syncBtnText">Sync with Cloud</span>
            </button>
            <button id="btnDownloadBackup" class="btn btn-sm btn-secondary flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200" title="Download complete JSON backup to USB drive">
              <span>📥</span> <span>Download Backup (JSON)</span>
            </button>
            <button id="btnDownloadCSV" class="btn btn-sm btn-secondary flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200" title="Export printable CSV summary">
              <span>📊</span> <span>Export CSV</span>
            </button>
            <label for="fileImportBackup" class="btn btn-sm btn-secondary flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 cursor-pointer" title="Import USB backup file">
              <span>📤</span> <span>Import Backup</span>
              <input type="file" id="fileImportBackup" accept=".json" class="hidden">
            </label>
          </div>
        </div>

        <!-- Real-Time Connectivity Banner -->
        <div id="connectivityBanner" class="p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs transition-colors">
          <div class="flex items-center gap-2">
            <span id="statusIndicatorDot" class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <span id="statusIndicatorText" class="font-bold text-emerald-300">Checking connection...</span>
          </div>
          <div id="queueStatsText" class="text-slate-400 font-mono text-[11px]">
            0 forms pending cloud sync
          </div>
        </div>
      </div>

      ${isLocked ? `
        <div class="alert alert-warning text-xs flex items-center justify-between">
          <span>🔒 <strong>Results are Locked &amp; Frozen:</strong> Vote entries cannot be added or edited. Unlock results from the Results page if changes are needed.</span>
          <button data-nav="/admin/results" class="btn btn-secondary btn-sm text-xs">Go to Results</button>
        </div>
      ` : ''}

      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">

        <!-- LEFT: Entry Panel -->
        <div class="xl:col-span-7 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="glass rounded-xl p-5 border border-indigo-500/20">
              <label class="block text-sm text-slate-300 mb-1 font-bold">Form Serial Number</label>
              <div class="flex gap-2">
                <input type="number" id="txtSerial" class="field text-lg font-mono font-bold" placeholder="e.g. 1" autofocus>
                <button id="btnLoadBySerial" class="btn btn-primary px-6 font-bold">Load Form</button>
              </div>
            </div>

            <div class="glass rounded-xl p-5 opacity-75">
              <label class="block text-sm text-slate-300 mb-1">Manual Selection (Fallback)</label>
              <div class="flex gap-2">
                <select id="selTable" class="field text-xs">
                  <option value="">Table...</option>
                  ${booths.map(b => `<option value="${b.boothNumber}">Table ${b.boothNumber}</option>`).join('')}
                </select>
                <select id="selPost" class="field text-xs">
                  <option value="">Post...</option>
                  ${sortPosts(posts).map(p => `<option value="${esc(p.post || p.name)}">${esc(p.post || p.name)}</option>`).join('')}
                </select>
                <button id="btnLoadForm" class="btn btn-secondary px-4 text-xs font-semibold">Load</button>
              </div>
            </div>
          </div>

          <div id="entryFormArea"></div>
        </div>

        <!-- RIGHT: Entered Forms Ledger -->
        <div class="xl:col-span-5">
          <div class="glass rounded-xl overflow-hidden border border-white/10 xl:sticky xl:top-6 shadow-2xl">
            <!-- Header -->
            <div class="bg-gradient-to-r from-slate-900/90 to-indigo-950/80 p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h4 class="font-bold text-white text-sm">Counting Forms Ledger</h4>
                <div id="ledgerSummary" class="flex flex-wrap gap-3 text-[11px] text-slate-400 mt-0.5"></div>
              </div>
              <span id="ledgerCount" class="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30 whitespace-nowrap">0/0 done</span>
            </div>
            <!-- Tabs -->
            <div class="flex border-b border-white/10 bg-slate-900/50">
              <button id="tabChips" class="ledger-tab active-tab px-4 py-2 text-xs font-semibold text-white border-b-2 border-indigo-400">All Forms</button>
              <button id="tabPending" class="ledger-tab px-4 py-2 text-xs font-semibold text-slate-400 border-b-2 border-transparent hover:text-white">⏳ Pending <span id="pendingTabCount" class="ml-1 bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full text-[10px]">0</span></button>
            </div>
            <!-- Legend (chips tab) -->
            <div id="panelChips">
              <div class="flex flex-wrap gap-2.5 px-4 py-2 border-b border-white/10 bg-slate-900/60 text-[10px] text-slate-400">
                <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500 inline-block"></span>Synced</span>
                <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-500 inline-block"></span>Local (IndexedDB)</span>
                <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-sky-500/30 border border-sky-500 inline-block"></span>Syncing</span>
                <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-600 inline-block"></span>Not Entered</span>
              </div>
              <div class="overflow-y-auto p-3" style="max-height: 52vh;">
                <div id="ledgerGrid" class="flex flex-wrap gap-1.5"></div>
              </div>
            </div>
            <!-- Pending list tab -->
            <div id="panelPending" class="hidden overflow-y-auto" style="max-height: 58vh;">
              <table class="w-full text-left">
                <thead class="sticky top-0 bg-slate-900/95 border-b border-white/10">
                  <tr>
                    <th class="px-3 py-2 text-[11px] text-slate-400 font-semibold w-14">Form #</th>
                    <th class="px-3 py-2 text-[11px] text-slate-400 font-semibold w-16">Table</th>
                    <th class="px-3 py-2 text-[11px] text-slate-400 font-semibold">Post</th>
                  </tr>
                </thead>
                <tbody id="pendingList"></tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  // ─── Status Banner Updater ──────────────────────────────────────────────────
  const updateConnectivityUI = async () => {
    const banner = main.querySelector('#connectivityBanner');
    const dot = main.querySelector('#statusIndicatorDot');
    const text = main.querySelector('#statusIndicatorText');
    const stats = main.querySelector('#queueStatsText');
    const syncBtn = main.querySelector('#syncBtnText');
    if (!banner) return;

    const isNetOnline = navigator.onLine;
    const pendingCount = await getPendingSyncCount();

    if (stats) stats.textContent = `${pendingCount} form(s) waiting in local outbox (IndexedDB)`;
    if (syncBtn) syncBtn.textContent = isSyncing ? 'Syncing...' : pendingCount > 0 ? `Sync Now (${pendingCount})` : 'Sync with Cloud';

    if (isSyncing) {
      banner.className = 'p-3 rounded-xl border border-sky-500/40 bg-sky-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs';
      if (dot) dot.className = 'w-3 h-3 rounded-full bg-sky-400 animate-ping';
      if (text) {
        text.className = 'font-bold text-sky-300';
        text.innerHTML = `<span>🔄 Cloud Sync Active:</span> Uploading vote entries to database...`;
      }
    } else if (!isNetOnline) {
      banner.className = 'p-3 rounded-xl border border-amber-500/40 bg-amber-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs';
      if (dot) dot.className = 'w-3 h-3 rounded-full bg-amber-400';
      if (text) {
        text.className = 'font-bold text-amber-300';
        text.innerHTML = `<span>🟡 Offline Mode:</span> Operating safely offline. Votes save locally into IndexedDB with 0ms delay.`;
      }
    } else if (pendingCount > 0) {
      banner.className = 'p-3 rounded-xl border border-indigo-500/40 bg-indigo-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs';
      if (dot) dot.className = 'w-3 h-3 rounded-full bg-indigo-400 animate-pulse';
      if (text) {
        text.className = 'font-bold text-indigo-300';
        text.innerHTML = `<span>🌐 Online:</span> ${pendingCount} local form(s) queued for synchronization. Click "Sync Now" or auto-sync in progress.`;
      }
    } else {
      banner.className = 'p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs';
      if (dot) dot.className = 'w-3 h-3 rounded-full bg-emerald-400';
      if (text) {
        text.className = 'font-bold text-emerald-300';
        text.innerHTML = `<span>🟢 Online &amp; Synced:</span> All local forms are backed up and verified in the cloud database.`;
      }
    }
  };

  // ─── Network Event Listeners ────────────────────────────────────────────────
  window.addEventListener('online', () => {
    showToast('Internet connected! Starting automatic background sync...', 'info');
    updateConnectivityUI();
    processQueue(main, allResults, allFormSerialsMeta);
  });
  window.addEventListener('offline', () => {
    showToast('Internet connection lost. Switched to 100% Offline Mode (IndexedDB active).', 'warning');
    updateConnectivityUI();
  });

  // ─── Emergency Backup / Export / Import Handlers ────────────────────────────
  main.querySelector('#btnDownloadBackup')?.addEventListener('click', async () => {
    try {
      const filename = await downloadLocalBackupJSON(settings?.collegeShortName || 'GCC');
      showToast(`Local backup downloaded: ${filename}`, 'success');
    } catch (err) {
      showToast(`Download failed: ${err.message}`, 'error');
    }
  });

  main.querySelector('#btnDownloadCSV')?.addEventListener('click', async () => {
    try {
      const filename = await downloadResultsCSV(settings?.collegeShortName || 'GCC');
      showToast(`Ledger spreadsheet downloaded: ${filename}`, 'success');
    } catch (err) {
      showToast(`CSV export failed: ${err.message}`, 'error');
    }
  });

  main.querySelector('#fileImportBackup')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importBackupFromJSON(text);
      showToast(`Successfully imported ${res.resultsCount} votes across ${res.queuedFormsCount} forms from backup!`, 'success');
      // Refresh local results and trigger sync if online
      const freshLocal = await getAllResultsLocally();
      allResults.length = 0;
      allResults.push(...freshLocal);
      await mergeQueueIntoResults(allResults);
      renderLedger(main, allResults, allFormSerialsMeta);
      updateConnectivityUI();
      processQueue(main, allResults, allFormSerialsMeta);
    } catch (err) {
      showToast(`Import error: ${err.message}`, 'error');
    }
    e.target.value = '';
  });

  main.querySelector('#btnSyncNow')?.addEventListener('click', () => {
    processQueue(main, allResults, allFormSerialsMeta, true);
  });

  // ─── Form Load Handlers ─────────────────────────────────────────────────────
  const txtSerial = main.querySelector('#txtSerial');
  const btnSerial = main.querySelector('#btnLoadBySerial');

  const loadBySerial = async () => {
    const s = txtSerial.value.trim();
    if (!s) return;
    const info = serialMap[s];
    if (!info) { showToast(`Invalid Serial Number: #${s}`, 'error'); return; }

    try {
      setLoading(btnSerial, true, 'Loading...');
      if (navigator.onLine) {
        api.invalidateCache('adminGetResults');
        const freshResults = await api.adminGetResults(pwd, true).catch(() => []);
        allResults = await syncLedgerWithServer(freshResults);
      } else {
        allResults = await getAllResultsLocally();
      }
      await mergeQueueIntoResults(allResults);
      renderFormGrid(booths[info.t].boothNumber, info.postName, s, info.r + 1);
      renderLedger(main, allResults, allFormSerialsMeta);
      updateConnectivityUI();
    } catch (e) {
      allResults = await getAllResultsLocally();
      await mergeQueueIntoResults(allResults);
      renderFormGrid(booths[info.t].boothNumber, info.postName, s, info.r + 1);
      renderLedger(main, allResults, allFormSerialsMeta);
      updateConnectivityUI();
    } finally {
      setLoading(btnSerial, false, 'Load Form');
    }
  };

  btnSerial.addEventListener('click', loadBySerial);
  txtSerial.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); loadBySerial(); } });

  main.querySelector('#btnLoadForm').addEventListener('click', async () => {
    const tableNum = main.querySelector('#selTable').value;
    const postName = main.querySelector('#selPost').value;
    if (!tableNum || !postName) { showToast('Select Table and Post', 'warning'); return; }

    const boothIdx = booths.findIndex(b => String(b.boothNumber) === String(tableNum));
    let foundSerial = null;
    let foundRound = null;
    if (boothIdx >= 0) {
      for (let r = 0; r < matrix[boothIdx].length; r++) {
        if (pName(matrix[boothIdx][r]) === postName) {
          foundRound = r + 1;
          foundSerial = formSerials[`${boothIdx}-${r}`];
          break;
        }
      }
    }

    try {
      setLoading(main.querySelector('#btnLoadForm'), true, '...');
      if (navigator.onLine) {
        api.invalidateCache('adminGetResults');
        const freshResults = await api.adminGetResults(pwd, true).catch(() => []);
        allResults = await syncLedgerWithServer(freshResults);
      } else {
        allResults = await getAllResultsLocally();
      }
      await mergeQueueIntoResults(allResults);
      renderFormGrid(tableNum, postName, foundSerial, foundRound);
      renderLedger(main, allResults, allFormSerialsMeta);
      updateConnectivityUI();
    } catch (e) {
      allResults = await getAllResultsLocally();
      await mergeQueueIntoResults(allResults);
      renderFormGrid(tableNum, postName, foundSerial, foundRound);
      renderLedger(main, allResults, allFormSerialsMeta);
      updateConnectivityUI();
    } finally {
      setLoading(main.querySelector('#btnLoadForm'), false, 'Load');
    }
  });

  // ─── Form Input Grid Rendering ──────────────────────────────────────────────
  const renderFormGrid = (tableNum, postName, serial, roundNum) => {
    const area = main.querySelector('#entryFormArea');
    const candidates = finalList.filter(c => c.post === postName).sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));

    if (candidates.length === 0) {
      area.innerHTML = `<div class="alert alert-warning">No candidates found for ${esc(postName)}.</div>`;
      return;
    }

    if (candidates.length === 1) {
      area.innerHTML = `
        <div class="glass p-8 rounded-2xl border border-emerald-500/30 text-center page-enter">
          <div class="text-4xl mb-3">🏆</div>
          <h3 class="text-lg font-bold text-emerald-400">Elected Unanimously (Unopposed)</h3>
          <p class="text-sm text-slate-300 mt-1"><strong>${esc(candidates[0].candidateName)}</strong> (${esc(candidates[0].candidateClass || '')}) is returned unopposed for <strong>${esc(postName)}</strong>.</p>
          <p class="text-xs text-slate-500 mt-2">No ballot voting or vote entry was conducted for this post.</p>
        </div>
      `;
      return;
    }

    const existing = allResults.filter(r => String(r.TableNumber) === String(tableNum) && String(r.Post) === postName);
    const getVotes = (cId) => {
      const match = existing.find(r => String(r.CandidateId) === String(cId));
      return match ? match.Votes : '';
    };

    area.innerHTML = `
      <div class="glass rounded-xl overflow-hidden page-enter border border-white/10 shadow-2xl">
        <div class="bg-indigo-500/10 p-4 border-b border-indigo-500/20 flex justify-between items-center">
          <div>
            <h4 class="font-bold text-indigo-300">Table ${tableNum} • Round ${roundNum || 'N/A'} • ${esc(postName)}</h4>
            <p class="text-[10px] text-slate-400 mt-1">Form Serial: #${serial || 'Manual'}</p>
          </div>
          ${serial ? `<div class="bg-indigo-500 text-white text-xs px-2.5 py-1 rounded-md font-mono font-bold shadow">FORM #${serial}</div>` : ''}
        </div>
        <div class="p-6 space-y-4">
          ${candidates.map((c, i) => `
            <div class="flex items-center justify-between bg-white/5 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
              <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold">${i + 1}</div>
                <div>
                  <div class="font-bold text-white flex items-center gap-2">
                    <span>${esc(c.candidateName)}</span>
                    ${c.candidateSerial ? `<span class="badge bg-indigo-500/20 text-indigo-300 font-mono text-xs">Sl. #${esc(c.candidateSerial)}</span>` : ''}
                  </div>
                  <div class="text-xs text-slate-400 mt-0.5">${esc(c.candidateClass || '')}</div>
                </div>
              </div>
              <div class="w-32">
                <input type="number" class="field text-center text-lg font-bold vote-input focus:ring-2 focus:ring-indigo-400" data-cid="${esc(c.id)}" data-cname="${esc(c.candidateName)}" placeholder="0" value="${getVotes(c.id)}" min="0" ${isLocked ? 'disabled' : ''}>
              </div>
            </div>
          `).join('')}

          <div class="border-t border-white/10 my-4"></div>

          <div class="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <div><div class="font-bold text-slate-300">NOTA</div></div>
            <div class="w-32">
              <input type="number" class="field text-center text-lg font-bold vote-input" data-cid="NOTA" data-cname="NOTA" placeholder="0" value="${getVotes('NOTA')}" min="0" ${isLocked ? 'disabled' : ''}>
            </div>
          </div>

          <div class="flex items-center justify-between bg-red-500/5 p-4 rounded-lg border border-red-500/20">
            <div><div class="font-bold text-red-400">INVALID</div></div>
            <div class="w-32">
              <input type="number" class="field text-center text-lg font-bold border-red-500/30 vote-input" data-cid="INVALID" data-cname="Invalid" placeholder="0" value="${getVotes('INVALID')}" min="0" ${isLocked ? 'disabled' : ''}>
            </div>
          </div>

          <div class="flex items-center justify-between bg-indigo-500/20 p-4 rounded-lg border border-indigo-500/40 mt-4">
            <div class="font-black text-indigo-300 text-xl tracking-wider">TOTAL BALLOTS TALLIED</div>
            <div class="w-32 text-center text-2xl font-black text-white font-mono" id="totalVotesDisplay">0</div>
          </div>
        </div>
        <div class="bg-slate-900/60 p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div class="flex items-center gap-3">
            <button id="btnClearForm" type="button" class="btn btn-secondary text-rose-300 hover:text-white hover:bg-rose-600/80 border-rose-500/40 px-4 text-xs font-bold transition flex items-center gap-1.5 shadow" ${isLocked ? 'disabled' : ''} title="Clear all saved votes for this form and reset ledger status to Not Entered">
              <span>🗑️</span> <span>Clear Form (Clean Start)</span>
            </button>
            <p class="text-xs text-slate-400 italic hidden sm:block">
              <span>💾 0ms IndexedDB local save · Automatic cloud sync</span>
            </p>
          </div>
          <button id="btnSaveVotes" class="btn ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-400' : 'btn-success'} px-10 font-bold shadow-lg" ${isLocked ? 'disabled' : ''}>
            ${isLocked ? '🔒 Results Locked (Save Blocked)' : '💾 Save Form Results'}
          </button>
        </div>
      </div>
    `;

    const updateGrandTotal = () => {
      let total = 0;
      area.querySelectorAll('.vote-input').forEach(inp => {
        total += parseInt(inp.value, 10) || 0;
      });
      const disp = area.querySelector('#totalVotesDisplay');
      if (disp) disp.textContent = total;
    };
    area.querySelectorAll('.vote-input').forEach(inp => {
      inp.addEventListener('input', updateGrandTotal);
    });
    updateGrandTotal();

    // ─── Clear Form (Clean Start) Handler ──────────────────────────────────────
    area.querySelector('#btnClearForm')?.addEventListener('click', async () => {
      if (isLocked) {
        showToast('Results are locked and frozen. No modifications allowed.', 'error');
        return;
      }

      const hasExistingSaved = allResults.some(r =>
        (serial && serial !== 'N/A' && String(r.FormSerial) === String(serial)) ||
        (String(r.TableNumber) === String(tableNum) && String(r.Post) === String(postName))
      );

      const confirmMsg = hasExistingSaved
        ? `Are you sure you want to completely clear Form #${serial || 'Manual'} (Table ${tableNum} • ${postName})?\n\nThis will permanently delete all entered vote counts for this form from both local storage and the cloud database, returning this form to 'Not Entered' (grey in ledger) for a clean start.`
        : `Clear all entered vote counts in this form?`;

      if (!confirm(confirmMsg)) return;

      const btnClear = area.querySelector('#btnClearForm');
      setLoading(btnClear, true, 'Clearing...');

      try {
        // 1. Delete matching entries from IndexedDB results_ledger and sync_queue
        await deleteFormResultsLocally(tableNum, postName, serial);

        // 2. Remove matching records from memory allResults array
        for (let i = allResults.length - 1; i >= 0; i--) {
          const r = allResults[i];
          const matchSerial = serial && serial !== 'N/A' && String(r.FormSerial) === String(serial);
          const matchTablePost = String(r.TableNumber) === String(tableNum) && String(r.Post) === String(postName);
          if (matchSerial || matchTablePost) {
            allResults.splice(i, 1);
          }
        }
        cachedAllResults = allResults;

        // 3. Clear on cloud database if online
        if (navigator.onLine) {
          try {
            await api.adminClearFormResults(pwd, { tableNumber: tableNum, post: postName, formSerial: serial });
          } catch (cloudErr) {
            console.warn('Cloud clear warning (will sync later):', cloudErr);
          }
        }

        // 4. Reset form inputs
        area.querySelectorAll('.vote-input').forEach(inp => {
          inp.value = '';
        });
        const disp = area.querySelector('#totalVotesDisplay');
        if (disp) disp.textContent = '0';

        showToast(`Form #${serial || 'Manual'} has been completely cleared! Ledger reset to Not Entered.`, 'success');

        // 5. Update ledger immediately so the cell changes from green back to grey
        renderLedger(main, allResults, allFormSerialsMeta);
        updateConnectivityUI();
      } catch (err) {
        console.error('Failed to clear form:', err);
        showToast(`Failed to clear form: ${err.message}`, 'error');
      } finally {
        setLoading(btnClear, false, '🗑️ Clear Form (Clean Start)');
      }
    });

    area.querySelector('#btnSaveVotes').addEventListener('click', async () => {
      if (isLocked) {
        showToast('Results are locked and frozen. No further vote entries are allowed.', 'error');
        return;
      }
      const inputs = area.querySelectorAll('.vote-input');
      const resultsToSave = [];

      inputs.forEach(inp => {
        resultsToSave.push({
          TableNumber: tableNum,
          RoundNumber: roundNum,
          Post: postName,
          CandidateId: inp.dataset.cid,
          CandidateName: inp.dataset.cname,
          Votes: parseInt(inp.value.trim(), 10) || 0,
          FormSerial: serial || 'N/A'
        });
      });

      if (resultsToSave.every(r => r.Votes === 0) && !confirm('All votes entered are 0. Are you sure you want to save?')) return;

      // 1. Save directly into IndexedDB (0ms latency, persists on power outage or reload)
      await saveFormResultsLocally(tableNum, postName, roundNum, serial, resultsToSave);

      // 2. Optimistically update in-memory results array
      resultsToSave.forEach(ns => {
        const idx = allResults.findIndex(r => String(r.TableNumber) === String(tableNum) && String(r.Post) === postName && r.CandidateId === ns.CandidateId);
        if (idx >= 0) {
          allResults[idx].Votes = ns.Votes;
          allResults[idx].RoundNumber = ns.RoundNumber;
          allResults[idx].FormSerial = ns.FormSerial;
        } else {
          allResults.push(ns);
        }
      });

      showToast(`Form #${serial || 'Manual'} saved to device (IndexedDB)!`, 'success');
      area.innerHTML = '';
      txtSerial.value = '';
      txtSerial.focus();

      renderLedger(main, allResults, allFormSerialsMeta);
      updateConnectivityUI();

      // 3. Process background sync queue if online
      processQueue(main, allResults, allFormSerialsMeta);
    });
  };

  // Initial UI sync
  renderLedger(main, allResults, allFormSerialsMeta);
  updateConnectivityUI();

  // Trigger sync worker on initial load in case unpushed forms exist
  processQueue(main, allResults, allFormSerialsMeta);
}

/**
 * Background Sync Processor: Drains the IndexedDB queue to the cloud API
 */
async function processQueue(main, allResults, allFormSerialsMeta, manualClick = false) {
  if (isSyncing) return;
  const queue = await getSyncQueue();
  const pendingItems = queue.filter(i => i.status === 'pending' || i.status === 'error' || i.status === 'retry');

  if (pendingItems.length === 0) {
    if (manualClick) showToast('All forms are already synced with the cloud.', 'info');
    return;
  }

  if (!navigator.onLine) {
    if (manualClick) showToast('Cannot sync: No internet connection detected.', 'warning');
    return;
  }

  isSyncing = true;
  const syncBtn = main.querySelector('#syncBtnText');
  const syncIcon = main.querySelector('#syncIcon');
  if (syncBtn) syncBtn.textContent = 'Syncing...';
  if (syncIcon) syncIcon.className = 'animate-spin inline-block';

  let syncedSuccessCount = 0;

  for (const item of pendingItems) {
    await updateSyncQueueItem(item.id, { status: 'syncing' });
    renderLedger(main, allResults, allFormSerialsMeta);

    try {
      await api.adminSaveResults(currentPwd, item.payload);
      await updateSyncQueueItem(item.id, { status: 'synced', errorMsg: null });
      syncedSuccessCount++;
    } catch (err) {
      console.warn('Sync failed for item', item.id, err);
      await updateSyncQueueItem(item.id, { status: 'error', errorMsg: err.message });
      // If network failed completely, break the loop
      if (!navigator.onLine || err.message.includes('Network') || err.message.includes('fetch')) {
        break;
      }
    }

    renderLedger(main, allResults, allFormSerialsMeta);
  }

  isSyncing = false;
  if (syncIcon) syncIcon.className = 'inline-block';
  if (syncedSuccessCount > 0) {
    showToast(`Synced ${syncedSuccessCount} form(s) to cloud database!`, 'success');
  }

  renderLedger(main, allResults, allFormSerialsMeta);
  const bannerStats = main.querySelector('#queueStatsText');
  const pendingRemaining = await getPendingSyncCount();
  if (bannerStats) bannerStats.textContent = `${pendingRemaining} form(s) waiting in local outbox (IndexedDB)`;
  if (syncBtn) syncBtn.textContent = pendingRemaining > 0 ? `Sync Now (${pendingRemaining})` : 'Sync with Cloud';
}

/**
 * Renders the Right-hand Forms Ledger
 */
async function renderLedger(main, allResults, allFormSerialsMeta) {
  const grid = main.querySelector('#ledgerGrid');
  const countEl = main.querySelector('#ledgerCount');
  const summaryEl = main.querySelector('#ledgerSummary');
  if (!grid) return;

  const queue = await getSyncQueue();
  const statusMap = {};

  // 1. Pre-populate all known form serials as 'pending'
  Object.keys(allFormSerialsMeta).forEach(serial => {
    statusMap[String(serial)] = 'not-entered';
  });

  // 2. Mark server-confirmed forms
  allResults.forEach(r => {
    if (r.FormSerial && r.FormSerial !== 'N/A') {
      statusMap[String(r.FormSerial)] = 'synced';
    }
  });

  // 3. Overlay sync queue statuses (highest priority)
  queue.forEach(item => {
    if (item.formSerial && item.formSerial !== 'N/A') {
      statusMap[String(item.formSerial)] = item.status;
    }
  });

  const allSerials = Object.keys(allFormSerialsMeta).map(Number).sort((a, b) => a - b);
  const total = allSerials.length;
  let doneSynced = 0, doneLocal = 0, failed = 0, pendingCount = 0;

  allSerials.forEach(s => {
    const st = statusMap[String(s)] || 'not-entered';
    if (st === 'synced') doneSynced++;
    else if (st === 'pending' || st === 'retry') doneLocal++;
    else if (st === 'syncing') doneLocal++;
    else if (st === 'error') failed++;
    else pendingCount++;
  });

  const completedTotal = doneSynced + doneLocal;
  if (countEl) countEl.textContent = `${completedTotal}/${total} done`;
  if (summaryEl) {
    summaryEl.innerHTML = `
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>${doneSynced} Synced</span>
      ${doneLocal > 0 ? `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>${doneLocal} Local (IndexedDB)</span>` : ''}
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-slate-500 inline-block"></span>${pendingCount} Pending</span>
      ${failed > 0 ? `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span>${failed} Failed</span>` : ''}
    `;
  }

  const currentSerial = String(main.querySelector('#txtSerial')?.value || '').trim();
  const chipClass = (st, s) => {
    let base = 'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold select-none transition-all border cursor-pointer';
    if (currentSerial && String(s) === currentSerial) {
      base += ' ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900 shadow-md shadow-indigo-500/40 font-extrabold scale-105';
    }
    switch (st) {
      case 'synced':
        return `${base} bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30`;
      case 'syncing':
        return `${base} bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse`;
      case 'pending':
      case 'retry':
        return `${base} bg-amber-500/25 text-amber-300 border-amber-500/50 hover:bg-amber-500/40 shadow-sm`;
      case 'error':
        return `${base} bg-red-500/25 text-red-300 border-red-500/50 hover:bg-red-500/40 retry-btn`;
      default: // not entered yet
        return `${base} bg-slate-800/80 text-slate-500 border-slate-700 hover:bg-slate-700/80`;
    }
  };

  const chipTitle = (s, st, meta) => {
    const info = meta[String(s)] || {};
    const base = `Form #${s} | Table ${info.tableNum || '?'} | ${info.postName || '?'}`;
    const action = ' | Click to load form';
    if (st === 'error') {
      const item = queue.find(i => String(i.formSerial) === String(s));
      return `${base} | ❌ Cloud Sync Error: ${item?.errorMsg || 'Retrying...'}${action}`;
    }
    if (st === 'pending') return `${base} | 💾 Saved locally in IndexedDB (Queued for Cloud Sync)${action}`;
    if (st === 'synced') return `${base} | 🟢 Synced with Cloud Database${action}`;
    if (st === 'syncing') return `${base} | 🔵 Uploading to Cloud...${action}`;
    return `${base} | ⏳ Not entered yet${action}`;
  };

  grid.innerHTML = allSerials.map(s => {
    const st = statusMap[String(s)] || 'not-entered';
    const qItem = queue.find(i => String(i.formSerial) === String(s));
    return `<button class="${chipClass(st, s)}"
      title="${chipTitle(s, st, allFormSerialsMeta)}"
      data-serial="${s}"
      ${st === 'error' && qItem ? `data-id="${qItem.id}"` : ''}
    >${s}</button>`;
  }).join('');

  // Single-click on any chip: load that form for result entry
  grid.querySelectorAll('button[data-serial]').forEach(chip => {
    chip.addEventListener('click', () => {
      const serial = chip.dataset.serial;
      const txtSerial = main.querySelector('#txtSerial');
      const btnLoad = main.querySelector('#btnLoadBySerial');
      if (txtSerial && serial) {
        txtSerial.value = serial;
        if (btnLoad) {
          btnLoad.click();
        }
        main.querySelector('#entryFormArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Pending forms list tab
  const pendingList = main.querySelector('#pendingList');
  const pendingTabCount = main.querySelector('#pendingTabCount');
  const pendingSerials = allSerials.filter(s => {
    const st = statusMap[String(s)] || 'not-entered';
    return st === 'not-entered';
  });
  if (pendingTabCount) pendingTabCount.textContent = pendingSerials.length;
  if (pendingList) {
    if (pendingSerials.length === 0) {
      pendingList.innerHTML = `<tr><td colspan="3" class="px-3 py-8 text-center text-emerald-400 font-bold text-sm">🎉 All forms have been entered!</td></tr>`;
    } else {
      pendingList.innerHTML = pendingSerials.map(s => {
        const info = allFormSerialsMeta[String(s)] || {};
        return `
          <tr class="border-b border-white/5 hover:bg-white/5 transition cursor-pointer pending-row" data-serial="${s}">
            <td class="px-3 py-2 font-bold text-slate-300 text-xs">#${s}</td>
            <td class="px-3 py-2 text-slate-400 text-xs">Table ${info.tableNum || '?'}</td>
            <td class="px-3 py-2 text-slate-300 text-xs leading-tight">${esc(info.postName || '?')}</td>
          </tr>
        `;
      }).join('');

      pendingList.querySelectorAll('.pending-row').forEach(row => {
        row.addEventListener('click', () => {
          const serial = row.dataset.serial;
          const txtSerial = main.querySelector('#txtSerial');
          const btnLoad = main.querySelector('#btnLoadBySerial');
          if (txtSerial && serial) {
            txtSerial.value = serial;
            if (btnLoad) btnLoad.click();
            main.querySelector('#entryFormArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }
  }

  // Tabs switching
  if (!main.dataset.tabsInit) {
    main.dataset.tabsInit = '1';
    const tabChips = main.querySelector('#tabChips');
    const tabPending = main.querySelector('#tabPending');
    const panelChips = main.querySelector('#panelChips');
    const panelPending = main.querySelector('#panelPending');
    tabChips?.addEventListener('click', () => {
      tabChips.classList.add('text-white', 'border-indigo-400'); tabChips.classList.remove('text-slate-400', 'border-transparent');
      tabPending.classList.remove('text-white', 'border-indigo-400'); tabPending.classList.add('text-slate-400', 'border-transparent');
      panelChips.classList.remove('hidden'); panelPending.classList.add('hidden');
    });
    tabPending?.addEventListener('click', () => {
      tabPending.classList.add('text-white', 'border-indigo-400'); tabPending.classList.remove('text-slate-400', 'border-transparent');
      tabChips.classList.remove('text-white', 'border-indigo-400'); tabChips.classList.add('text-slate-400', 'border-transparent');
      panelPending.classList.remove('hidden'); panelChips.classList.add('hidden');
    });
  }
}
