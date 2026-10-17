/**
 * pages/admin/resultsEntry.js
 * Admin page to input vote counts for each Table + Post combination.
 * Fully Offline-First: Powered by IndexedDB for 0ms local saves, continuous background
 * cloud synchronization when connected, emergency JSON/CSV downloads, and USB import.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading, sortPosts, isAssocPost, isYearRepPost } from '../../utils.js';
import { isUuc, formatMatrixPostName } from './counting.js';
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

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', async (e) => {
    try {
      const pending = await getPendingSyncCount();
      if (pending > 0) {
        e.preventDefault();
        e.returnValue = `You have ${pending} unsynced form(s) saved on this device. They will sync automatically once internet is restored.`;
      }
    } catch (_) {}
  });
}

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

/**
 * Helper to identify single-vote General posts (Chairperson, Vice Chair, Gen Sec, etc.)
 * Excludes Association posts (independent departmental rolls), Year Reps (year rolls), and UUC (dual-vote).
 */
export function isSingleVoteGeneral(postName) {
  if (!postName) return false;
  const p = typeof postName === 'string' ? postName : String(postName.post || postName.name || '');
  return !isAssocPost(p) && !isYearRepPost(p) && !isUuc(p);
}

/**
 * Calculates total tallied votes (candidates + NOTA + INVALID) for a table + post
 */
export function getFormTalliedVotes(allResults, tableNum, postName) {
  if (!Array.isArray(allResults) || !allResults.length) return null;
  const pTarget = String(postName || '').trim().toLowerCase();
  const tTarget = String(tableNum);
  const matches = allResults.filter(r => 
    String(r.TableNumber) === tTarget && 
    String(r.Post || '').trim().toLowerCase() === pTarget
  );
  if (!matches.length) return null;
  return matches.reduce((sum, r) => sum + (parseInt(r.Votes, 10) || 0), 0);
}

/**
 * Comprehensive cross-round disparity analysis for all tables.
 * Statutory rule:
 * - Single-vote General posts at Table T must have equal ballot totals (B).
 * - Dual-vote UUC at Table T must have exactly 2 * B votes.
 */
export function analyzeTableDisparities(allResults, matrix, formSerials, booths) {
  const pName = p => (typeof p === 'string' ? p : String(p?.post || p?.name || '')).trim();
  const formDisparities = {}; // serial -> { tableNum, serial, roundNum, postName, actual, expected, diff, message }
  const tableSummaries = {};  // tableNum -> { hasDisparity, baselineBallots, generalEntries, uucEntry, messages }
  let totalDisparitiesCount = 0;

  if (!matrix || !Array.isArray(matrix) || !booths || !Array.isArray(booths)) {
    return { formDisparities, tableSummaries, totalDisparitiesCount: 0 };
  }

  booths.forEach((b, t) => {
    const tableNum = String(b.boothNumber || (t + 1));
    const tableRow = matrix[t] || [];
    const generalEntries = [];
    let uucEntry = null;

    tableRow.forEach((postObj, r) => {
      if (!postObj) return;
      const post = pName(postObj);
      const serial = formSerials ? formSerials[`${t}-${r}`] : null;
      if (!serial) return;

      const totalVotes = getFormTalliedVotes(allResults, tableNum, post);
      if (totalVotes === null) return; // not entered yet

      if (isSingleVoteGeneral(post)) {
        generalEntries.push({
          serial: String(serial),
          round: r + 1,
          post,
          ballots: totalVotes
        });
      } else if (isUuc(post)) {
        uucEntry = {
          serial: String(serial),
          round: r + 1,
          post,
          votes: totalVotes,
          equivalentBallots: totalVotes / 2
        };
      }
    });

    let hasDisparity = false;
    const tableMessages = [];

    // 1. Cross-compare single-vote general posts among each other
    if (generalEntries.length > 1) {
      const freq = {};
      generalEntries.forEach(g => { freq[g.ballots] = (freq[g.ballots] || 0) + 1; });
      let consensusBallots = generalEntries[0].ballots;
      let maxCount = 0;
      Object.entries(freq).forEach(([val, count]) => {
        if (count > maxCount) {
          maxCount = count;
          consensusBallots = Number(val);
        }
      });

      if (uucEntry && Number.isInteger(uucEntry.equivalentBallots)) {
        consensusBallots = uucEntry.equivalentBallots;
      }

      generalEntries.forEach(g => {
        if (g.ballots !== consensusBallots) {
          hasDisparity = true;
          const ref = generalEntries.find(o => o.serial !== g.serial && o.ballots === consensusBallots) || generalEntries.find(o => o.serial !== g.serial);
          const diff = g.ballots - (ref ? ref.ballots : consensusBallots);
          const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
          const msg = `Disparity in Table ${tableNum}: Round ${g.round} (${g.post}) recorded ${g.ballots} ballots, but Round ${ref ? ref.round : '?' } (${ref ? ref.post : 'General'}) recorded ${ref ? ref.ballots : consensusBallots} ballots (Mismatch: ${diffStr}).`;

          formDisparities[g.serial] = {
            tableNum,
            serial: g.serial,
            roundNum: g.round,
            postName: g.post,
            actual: g.ballots,
            expected: ref ? ref.ballots : consensusBallots,
            diff,
            message: msg
          };
          tableMessages.push(msg);
          totalDisparitiesCount++;
        }
      });
    }

    // 2. Cross-compare UUC vs General posts (UUC must equal 2 * General ballots)
    if (uucEntry && generalEntries.length > 0) {
      generalEntries.forEach(g => {
        const expectedUuc = g.ballots * 2;
        if (uucEntry.votes !== expectedUuc) {
          hasDisparity = true;
          const diff = uucEntry.votes - expectedUuc;
          const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
          const uucMsg = `UUC Disparity in Table ${tableNum}: Round ${uucEntry.round} (UUC) has ${uucEntry.votes} votes (${uucEntry.equivalentBallots} ballots), which is NOT double the ${g.ballots} General ballots in Round ${g.round} (${g.post}). Expected UUC: ${expectedUuc} votes (Mismatch: ${diffStr} votes).`;

          if (!formDisparities[uucEntry.serial]) {
            formDisparities[uucEntry.serial] = {
              tableNum,
              serial: uucEntry.serial,
              roundNum: uucEntry.round,
              postName: uucEntry.post,
              actual: uucEntry.votes,
              expected: expectedUuc,
              diff,
              message: uucMsg
            };
            totalDisparitiesCount++;
          }
          if (!tableMessages.includes(uucMsg)) {
            tableMessages.push(uucMsg);
          }
        }
      });
    }

    tableSummaries[tableNum] = {
      hasDisparity,
      generalEntries,
      uucEntry,
      baselineBallots: generalEntries.length ? generalEntries[0].ballots : (uucEntry ? uucEntry.equivalentBallots : null),
      messages: tableMessages
    };
  });

  return { formDisparities, tableSummaries, totalDisparitiesCount };
}

/**
 * Real-time evaluator called as operator types vote numbers in a form.
 */
export function checkLiveFormDisparity(tableNum, postName, currentTotal, allResults, matrix, formSerials, booths, currentSerial, currentRound) {
  if (currentTotal === null || currentTotal === undefined || isNaN(currentTotal) || currentTotal <= 0) return null;
  const pName = p => (typeof p === 'string' ? p : String(p?.post || p?.name || '')).trim();
  const curPostStr = pName(postName);
  const curTableStr = String(tableNum);

  const isGen = isSingleVoteGeneral(curPostStr);
  const isUucPost = isUuc(curPostStr);

  if (!isGen && !isUucPost) return null; // Association and Year Rep posts are exempt

  const otherGeneralEntries = [];
  let existingUucEntry = null;

  if (matrix && booths) {
    const tIdx = booths.findIndex(b => String(b.boothNumber) === curTableStr);
    if (tIdx >= 0 && matrix[tIdx]) {
      matrix[tIdx].forEach((pObj, r) => {
        if (!pObj) return;
        const p = pName(pObj);
        const s = formSerials ? formSerials[`${tIdx}-${r}`] : null;
        if (!s || String(s) === String(currentSerial) || (p.toLowerCase() === curPostStr.toLowerCase() && r + 1 === Number(currentRound))) {
          return; // Skip current form being edited
        }

        const sum = getFormTalliedVotes(allResults, curTableStr, p);
        if (sum === null) return;

        if (isSingleVoteGeneral(p)) {
          otherGeneralEntries.push({ post: p, round: r + 1, serial: String(s), ballots: sum });
        } else if (isUuc(p)) {
          existingUucEntry = { post: p, round: r + 1, serial: String(s), votes: sum, equivalentBallots: sum / 2 };
        }
      });
    }
  }

  // 1. Single-Vote General Post live validation
  if (isGen) {
    if (otherGeneralEntries.length > 0) {
      const mismatchRef = otherGeneralEntries.find(o => o.ballots !== currentTotal);
      if (mismatchRef) {
        const diff = currentTotal - mismatchRef.ballots;
        const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
        return {
          isDisparity: true,
          postType: 'general',
          currentTotal,
          expectedTotal: mismatchRef.ballots,
          diff,
          diffStr,
          title: `⚠️ General Ballot Total Disparity Detected for Table ${curTableStr}!`,
          message: `Current Form Total is <strong>${currentTotal} ballots</strong>, but <strong>Round ${mismatchRef.round} (${esc(mismatchRef.post)}, Form #${mismatchRef.serial})</strong> recorded <strong class="text-emerald-300 font-mono">${mismatchRef.ballots} ballots</strong> (Mismatch: <strong>${diffStr} ballots</strong>).`,
          subtext: `All General posts at Table ${curTableStr} are counted from the same physical General Ballot papers and must have identical total counts. You can still save if this faithfully reflects the physical counting sheet, but it will be flagged in RED across the ledger.`
        };
      }
    }

    if (existingUucEntry) {
      const expectedBallots = existingUucEntry.equivalentBallots;
      if (currentTotal !== expectedBallots) {
        const diff = currentTotal - expectedBallots;
        const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
        return {
          isDisparity: true,
          postType: 'general_vs_uuc',
          currentTotal,
          expectedTotal: expectedBallots,
          diff,
          diffStr,
          title: `⚠️ General vs UUC Disparity Detected for Table ${curTableStr}!`,
          message: `Current General Total is <strong>${currentTotal} ballots</strong>, but <strong>Round ${existingUucEntry.round} (UUC, Form #${existingUucEntry.serial})</strong> recorded <strong>${existingUucEntry.votes} votes</strong> (${expectedBallots} ballots × 2 votes). Expected: <strong class="text-emerald-300 font-mono">${expectedBallots} ballots</strong> (Mismatch: <strong>${diffStr} ballots</strong>).`,
          subtext: `UUC ballots have double the total votes of General ballots. You can still save this form, but it will be flagged in RED.`
        };
      }
    }

    if (otherGeneralEntries.length > 0) {
      return {
        isDisparity: false,
        postType: 'general',
        currentTotal,
        message: `🟢 Consistent: Exactly matches ${otherGeneralEntries[0].ballots} ballots in Round ${otherGeneralEntries[0].round} (${esc(otherGeneralEntries[0].post)})`
      };
    }
  }

  // 2. UUC live validation (must be double General total)
  if (isUucPost) {
    if (otherGeneralEntries.length > 0) {
      const refGen = otherGeneralEntries[0];
      const expectedUuc = refGen.ballots * 2;
      if (currentTotal !== expectedUuc) {
        const diff = currentTotal - expectedUuc;
        const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
        return {
          isDisparity: true,
          postType: 'uuc',
          currentTotal,
          expectedTotal: expectedUuc,
          diff,
          diffStr,
          title: `⚠️ UUC Dual-Vote Disparity Detected for Table ${curTableStr}!`,
          message: `Current UUC Total is <strong>${currentTotal} votes</strong> (${currentTotal / 2} ballots), but <strong>Round ${refGen.round} (${esc(refGen.post)}, Form #${refGen.serial})</strong> recorded <strong>${refGen.ballots} ballots</strong>. Since UUC has 2 votes per ballot, expected UUC total is <strong class="text-emerald-300 font-mono">${expectedUuc} votes</strong> (${refGen.ballots} × 2). Disparity: <strong>${diffStr} votes</strong>.`,
          subtext: `UUC should have double the total of that table as it has 2 votes per ballot. You can still save if this reflects the physical counting sheet, but it will be flagged in RED.`
        };
      } else {
        return {
          isDisparity: false,
          postType: 'uuc',
          currentTotal,
          message: `🟢 Consistent: Exactly double (${currentTotal} votes = 2 × ${refGen.ballots} ballots) of Round ${refGen.round} (${esc(refGen.post)})`
        };
      }
    }
  }

  return null;
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

      <!-- Quick Form Entry & Search Bar -->
      <div class="glass rounded-xl p-3 sm:p-4 border border-indigo-500/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        <!-- Form Serial Quick Entry -->
        <div class="flex items-center gap-2 flex-1 max-w-lg">
          <label for="txtSerial" class="text-xs font-bold text-indigo-300 whitespace-nowrap flex items-center gap-1.5">
            <span>⚡ Form #</span>
          </label>
          <div class="flex gap-2 flex-1">
            <input type="number" id="txtSerial" class="field text-sm font-mono font-bold py-1.5 px-3" placeholder="Enter Form Serial (e.g. 1)" autofocus>
            <button id="btnLoadBySerial" class="btn btn-primary px-5 py-1.5 text-xs font-bold whitespace-nowrap shadow-md">
              Load &amp; Enter
            </button>
          </div>
        </div>

        <!-- Manual Table + Post Fallback -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-[11px] text-slate-400 font-medium whitespace-nowrap">Or Manual:</span>
          <select id="selTable" class="field text-xs py-1.5 px-2 w-28">
            <option value="">Table...</option>
            ${booths.map(b => `<option value="${b.boothNumber}">Table ${b.boothNumber}</option>`).join('')}
          </select>
          <select id="selPost" class="field text-xs py-1.5 px-2 w-44">
            <option value="">Post...</option>
            ${sortPosts(posts).map(p => `<option value="${esc(p.post || p.name)}">${esc(p.post || p.name)}</option>`).join('')}
          </select>
          <button id="btnLoadForm" class="btn btn-secondary px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap">
            Load
          </button>
        </div>
      </div>

      <!-- FULL-WIDTH: Entered Forms Ledger -->
      <div id="ledgerContainerFull" class="w-full transition-all duration-300">
        <div class="glass rounded-xl overflow-hidden border border-white/10 shadow-2xl">
          <!-- Header -->
          <div class="bg-gradient-to-r from-slate-900/90 to-indigo-950/80 p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 class="font-bold text-white text-base flex items-center gap-2">
                <span>Counting Forms Ledger</span>
              </h4>
              <div id="ledgerSummary" class="flex flex-wrap gap-2.5 text-[11px] text-slate-400 mt-1"></div>
            </div>
            <div class="flex items-center gap-2">
              <span id="ledgerCount" class="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-md border border-indigo-500/30 whitespace-nowrap">0/0 done</span>
            </div>
          </div>
          <!-- Tabs -->
          <div class="flex border-b border-white/10 bg-slate-900/50">
            <button id="tabMatrix" class="ledger-tab active-tab px-4 py-2.5 text-xs font-bold text-white border-b-2 border-indigo-400 flex items-center gap-1.5">
              <span>▦</span> <span>Table × Round Matrix</span>
            </button>
            <button id="tabChips" class="ledger-tab px-3.5 py-2.5 text-xs font-semibold text-slate-400 border-b-2 border-transparent hover:text-white flex items-center gap-1.5">
              <span>⠿</span> <span>Flat Chips</span>
            </button>
            <button id="tabPending" class="ledger-tab px-3.5 py-2.5 text-xs font-semibold text-slate-400 border-b-2 border-transparent hover:text-white flex items-center gap-1.5">
              <span>⏳</span> <span>Missing</span> <span id="pendingTabCount" class="ml-1 bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full text-[10px]">0</span>
            </button>
          </div>
          <!-- Matrix View Panel (default) -->
          <div id="panelMatrix">
            <div id="disparitySummaryBanner" class="hidden p-3 border-b border-red-500/40 bg-red-950/40 transition-all"></div>
            <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/60 text-[10px] text-slate-400">
              <div class="flex flex-wrap gap-3">
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500 inline-block"></span>Synced</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-500 inline-block"></span>Local</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-red-500/30 border border-red-500 inline-block"></span>⚠️ Disparity</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-600 border-dashed inline-block"></span>Missing</span>
              </div>
              <span class="text-[10px] text-indigo-300/80 font-medium">✨ Click any cell to pop up the result entry form</span>
            </div>
            <div class="ledger-matrix-container p-2.5" id="ledgerMatrixGrid"></div>
          </div>
          <!-- Flat Chips Panel -->
          <div id="panelChips" class="hidden">
            <div class="flex flex-wrap gap-3 px-4 py-2 border-b border-white/10 bg-slate-900/60 text-[10px] text-slate-400">
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500 inline-block"></span>Synced</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-500 inline-block"></span>Local (IndexedDB)</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-red-500/30 border border-red-500 inline-block"></span>Disparity Mismatch</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-600 inline-block"></span>Not Entered</span>
            </div>
            <div class="overflow-y-auto p-4" style="max-height: 70vh;">
              <div id="ledgerGrid" class="flex flex-wrap gap-2"></div>
            </div>
          </div>
          <!-- Pending list tab -->
          <div id="panelPending" class="hidden overflow-y-auto" style="max-height: 70vh;">
            <table class="w-full text-left">
              <thead class="sticky top-0 bg-slate-900/95 border-b border-white/10">
                <tr>
                  <th class="px-4 py-2.5 text-xs text-slate-400 font-semibold w-16">Form #</th>
                  <th class="px-4 py-2.5 text-xs text-slate-400 font-semibold w-24">Table</th>
                  <th class="px-4 py-2.5 text-xs text-slate-400 font-semibold">Post</th>
                  <th class="px-4 py-2.5 text-xs text-slate-400 font-semibold w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody id="pendingList"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Pop-Up Modal Container for Result Entry -->
      <div id="resultsModalContainer"></div>
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
  txtSerial.addEventListener('wheel', () => txtSerial.blur(), { passive: true });

  // Prevent wheel scroll from modifying active number inputs, ensuring smooth page scrolling
  main.addEventListener('wheel', () => {
    if (document.activeElement && document.activeElement.type === 'number') {
      document.activeElement.blur();
    }
  }, { passive: true });

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

  // ─── Form Input Grid Modal Rendering ───────────────────────────────────────
  const renderFormGrid = (tableNum, postName, serial, roundNum) => {
    const modalArea = main.querySelector('#resultsModalContainer');
    if (!modalArea) return;

    const candidates = finalList.filter(c => c.post === postName).sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));

    const closeModal = () => {
      modalArea.innerHTML = '';
      document.removeEventListener('keydown', handleEsc);
      const txt = main.querySelector('#txtSerial');
      if (txt) {
        txt.value = '';
        txt.focus();
      }
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleEsc);

    if (candidates.length === 0) {
      modalArea.innerHTML = `
        <div id="modalBackdrop" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-modal-backdrop">
          <div class="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4 animate-modal-card">
            <div class="text-3xl">⚠️</div>
            <h3 class="text-base font-bold text-white">No Candidates Found</h3>
            <p class="text-xs text-slate-400">No candidates are registered for <strong>${esc(postName)}</strong>.</p>
            <button id="btnCloseModalEmpty" class="btn btn-secondary w-full py-2 text-xs font-bold">Close</button>
          </div>
        </div>
      `;
      modalArea.querySelector('#btnCloseModalEmpty')?.addEventListener('click', closeModal);
      modalArea.querySelector('#modalBackdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'modalBackdrop') closeModal();
      });
      return;
    }

    if (candidates.length === 1) {
      modalArea.innerHTML = `
        <div id="modalBackdrop" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-modal-backdrop">
          <div class="bg-slate-900 border border-emerald-500/40 rounded-2xl p-7 max-w-md w-full shadow-2xl text-center space-y-4 animate-modal-card">
            <div class="text-4xl mb-1">🏆</div>
            <h3 class="text-lg font-bold text-emerald-400">Elected Unopposed</h3>
            <p class="text-sm text-slate-200">
              <strong>${esc(candidates[0].candidateName)}</strong> (${esc(candidates[0].candidateClass || '')}) is returned unopposed for <strong>${esc(postName)}</strong>.
            </p>
            <p class="text-xs text-slate-400">No ballot voting or vote entry was conducted for this post.</p>
            <div class="pt-2">
              <button id="btnCloseModalUnopposed" class="btn btn-primary px-8 py-2 text-xs font-bold">Close</button>
            </div>
          </div>
        </div>
      `;
      modalArea.querySelector('#btnCloseModalUnopposed')?.addEventListener('click', closeModal);
      modalArea.querySelector('#modalBackdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'modalBackdrop') closeModal();
      });
      return;
    }

    const existing = allResults.filter(r => String(r.TableNumber) === String(tableNum) && String(r.Post) === postName);
    const getVotes = (cId) => {
      const match = existing.find(r => String(r.CandidateId) === String(cId));
      return match ? match.Votes : '';
    };

    modalArea.innerHTML = `
      <div id="modalBackdrop" class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-modal-backdrop">
        <div class="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-modal-card border-white/10" style="box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(99, 102, 241, 0.2);">
          
          <!-- Modal Header -->
          <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 border-b border-indigo-500/20 flex justify-between items-center shrink-0">
            <div>
              <h4 class="font-bold text-indigo-200 text-base sm:text-lg flex items-center gap-2">
                <span>Table ${tableNum} • Round ${roundNum || 'N/A'} • ${esc(postName)}</span>
              </h4>
              <p class="text-xs text-slate-400 mt-0.5">Form Serial: #${serial || 'Manual'}</p>
            </div>
            <div class="flex items-center gap-2">
              ${serial ? `<div class="bg-indigo-500 text-white text-xs px-2.5 py-1 rounded-md font-mono font-bold shadow">FORM #${serial}</div>` : ''}
              <button id="btnCloseModalX" type="button" class="text-slate-400 hover:text-white text-lg w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors" title="Close (Esc)">✕</button>
            </div>
          </div>

          <!-- Modal Scrollable Body -->
          <div class="p-4 sm:p-6 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
            ${candidates.map((c, i) => `
              <div class="flex items-center justify-between bg-white/5 p-3 sm:p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                <div class="flex items-center gap-3 sm:gap-4">
                  <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0">${i + 1}</div>
                  <div>
                    <div class="font-bold text-white flex items-center gap-2 flex-wrap">
                      <span>${esc(c.candidateName)}</span>
                      ${c.candidateSerial ? `<span class="badge bg-indigo-500/20 text-indigo-300 font-mono text-xs">Sl. #${esc(c.candidateSerial)}</span>` : ''}
                    </div>
                    <div class="text-xs text-slate-400 mt-0.5">${esc(c.candidateClass || '')}</div>
                  </div>
                </div>
                <div class="w-28 sm:w-32 shrink-0">
                  <input type="number" class="field text-center text-lg font-bold vote-input focus:ring-2 focus:ring-indigo-400" data-cid="${esc(c.id)}" data-cname="${esc(c.candidateName)}" placeholder="0" value="${getVotes(c.id)}" min="0" ${isLocked ? 'disabled' : ''}>
                </div>
              </div>
            `).join('')}

            <div class="border-t border-white/10 my-3"></div>

            <div class="flex items-center justify-between bg-slate-800/50 p-3 sm:p-4 rounded-xl border border-slate-700">
              <div class="font-bold text-slate-300">NOTA</div>
              <div class="w-28 sm:w-32 shrink-0">
                <input type="number" class="field text-center text-lg font-bold vote-input" data-cid="NOTA" data-cname="NOTA" placeholder="0" value="${getVotes('NOTA')}" min="0" ${isLocked ? 'disabled' : ''}>
              </div>
            </div>

            <div class="flex items-center justify-between bg-red-500/5 p-3 sm:p-4 rounded-xl border border-red-500/20">
              <div class="font-bold text-red-400">INVALID</div>
              <div class="w-28 sm:w-32 shrink-0">
                <input type="number" class="field text-center text-lg font-bold border-red-500/30 vote-input" data-cid="INVALID" data-cname="Invalid" placeholder="0" value="${getVotes('INVALID')}" min="0" ${isLocked ? 'disabled' : ''}>
              </div>
            </div>

            <div class="flex items-center justify-between bg-indigo-500/20 p-3.5 sm:p-4 rounded-xl border border-indigo-500/40 mt-4">
              <div class="font-black text-indigo-300 text-lg sm:text-xl tracking-wider">TOTAL BALLOTS TALLIED</div>
              <div class="w-28 sm:w-32 text-center text-2xl font-black text-white font-mono" id="totalVotesDisplay">0</div>
            </div>

            <div id="disparityAlertArea" class="transition-all"></div>
          </div>

          <!-- Modal Footer -->
          <div class="bg-slate-950/90 p-4 border-t border-white/10 flex flex-wrap justify-between items-center gap-3 shrink-0">
            <div class="flex items-center gap-2">
              <button id="btnClearForm" type="button" class="btn btn-secondary text-rose-300 hover:text-white hover:bg-rose-600/80 border-rose-500/40 px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 shadow" ${isLocked ? 'disabled' : ''} title="Clear all saved votes for this form and reset ledger status to Not Entered">
                <span>🗑️</span> <span>Clear Form</span>
              </button>
              <button id="btnCancelModal" type="button" class="btn btn-secondary px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white">
                Cancel
              </button>
            </div>
            <button id="btnSaveVotes" class="btn ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-400' : 'btn-success'} px-8 py-2.5 font-bold shadow-lg" ${isLocked ? 'disabled' : ''}>
              ${isLocked ? '🔒 Results Locked' : '💾 Save Form Results'}
            </button>
          </div>

        </div>
      </div>
    `;

    modalArea.querySelector('#btnCloseModalX')?.addEventListener('click', closeModal);
    modalArea.querySelector('#btnCancelModal')?.addEventListener('click', closeModal);
    modalArea.querySelector('#modalBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'modalBackdrop') closeModal();
    });

    let currentDisparityInfo = null;

    const updateGrandTotal = () => {
      let total = 0;
      modalArea.querySelectorAll('.vote-input').forEach(inp => {
        total += parseInt(inp.value, 10) || 0;
      });
      const disp = modalArea.querySelector('#totalVotesDisplay');
      if (disp) disp.textContent = total;

      const alertArea = modalArea.querySelector('#disparityAlertArea');
      if (!alertArea) return;

      currentDisparityInfo = checkLiveFormDisparity(
        tableNum,
        postName,
        total,
        allResults,
        savedMatrix?.matrix,
        savedMatrix?.formSerials,
        booths,
        serial,
        roundNum
      );

      if (currentDisparityInfo && currentDisparityInfo.isDisparity) {
        alertArea.innerHTML = `
          <div class="mt-3 p-4 bg-red-950/70 border-2 border-red-500 rounded-xl text-xs space-y-2 disparity-pulse shadow-xl text-left">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2 font-bold text-red-300 text-sm">
                <span class="text-lg">⚠️</span>
                <span>${esc(currentDisparityInfo.title)}</span>
              </div>
              <span class="badge bg-red-500/30 text-red-200 border border-red-500 font-mono text-[11px] font-bold px-2.5 py-0.5 rounded shadow-sm">
                Mismatch: ${currentDisparityInfo.diffStr || currentDisparityInfo.diff}
              </span>
            </div>
            <div class="text-slate-100 text-xs leading-relaxed bg-black/30 p-2.5 rounded-lg border border-red-500/30">
              ${currentDisparityInfo.message}
            </div>
            <div class="text-[11px] text-red-300/90 leading-tight">
              ℹ️ <strong>Statutory Note:</strong> ${currentDisparityInfo.subtext}
            </div>
          </div>
        `;
      } else if (currentDisparityInfo && !currentDisparityInfo.isDisparity && total > 0) {
        alertArea.innerHTML = `
          <div class="mt-3 p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between shadow-sm">
            <span class="flex items-center gap-2 font-medium">
              <span>✅</span> <span>${currentDisparityInfo.message}</span>
            </span>
            <span class="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/30 font-mono font-bold">Consistent</span>
          </div>
        `;
      } else {
        alertArea.innerHTML = '';
      }
    };

    modalArea.querySelectorAll('.vote-input').forEach(inp => {
      inp.addEventListener('input', updateGrandTotal);
      inp.addEventListener('wheel', () => inp.blur(), { passive: true });
    });
    updateGrandTotal();

    // Auto-focus first input field for immediate typing
    setTimeout(() => {
      const firstInput = modalArea.querySelector('.vote-input');
      if (firstInput && !isLocked) {
        firstInput.focus();
        firstInput.select();
      }
    }, 60);

    // ─── Clear Form (Clean Start) Handler ──────────────────────────────────────
    modalArea.querySelector('#btnClearForm')?.addEventListener('click', async () => {
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

      const btnClear = modalArea.querySelector('#btnClearForm');
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
        modalArea.querySelectorAll('.vote-input').forEach(inp => {
          inp.value = '';
        });
        const disp = modalArea.querySelector('#totalVotesDisplay');
        if (disp) disp.textContent = '0';
        updateGrandTotal();

        showToast(`Form #${serial || 'Manual'} has been completely cleared! Ledger reset to Not Entered.`, 'success');

        // 5. Update ledger immediately so the cell changes from green back to grey
        renderLedger(main, allResults, allFormSerialsMeta);
        updateConnectivityUI();
      } catch (err) {
        console.error('Failed to clear form:', err);
        showToast(`Failed to clear form: ${err.message}`, 'error');
      } finally {
        setLoading(btnClear, false, '🗑️ Clear Form');
      }
    });

    // ─── Save Form Results Handler ─────────────────────────────────────────────
    modalArea.querySelector('#btnSaveVotes')?.addEventListener('click', async () => {
      if (isLocked) {
        showToast('Results are locked and frozen. No further vote entries are allowed.', 'error');
        return;
      }
      const inputs = modalArea.querySelectorAll('.vote-input');
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

      const btnSave = modalArea.querySelector('#btnSaveVotes');
      setLoading(btnSave, true, 'Saving...');

      try {
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

        if (currentDisparityInfo && currentDisparityInfo.isDisparity) {
          showToast(`Form #${serial || 'Manual'} saved! Flagged in RED due to General Ballot disparity.`, 'warning');
        } else {
          showToast(`Form #${serial || 'Manual'} saved to device (IndexedDB)!`, 'success');
        }

        // Close modal and return focus to serial entry
        closeModal();

        // 3. Update ledger immediately
        renderLedger(main, allResults, allFormSerialsMeta);
        updateConnectivityUI();

        // 4. Process background sync queue if online
        processQueue(main, allResults, allFormSerialsMeta);
      } catch (saveErr) {
        console.error('Failed to save votes:', saveErr);
        showToast(`Failed to save votes: ${saveErr.message}`, 'error');
      } finally {
        setLoading(btnSave, false, '💾 Save Form Results');
      }
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
  const countEl = main.querySelector('#ledgerCount');
  const summaryEl = main.querySelector('#ledgerSummary');
  const matrixGridEl = main.querySelector('#ledgerMatrixGrid');
  const chipsGridEl = main.querySelector('#ledgerGrid');
  const disparityBanner = main.querySelector('#disparitySummaryBanner');
  if (!matrixGridEl && !chipsGridEl) return;

  const queue = await getSyncQueue();
  const statusMap = {};

  // 1. Pre-populate all known form serials as 'not-entered'
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

  // 4. Run full cross-round ballot disparity analysis
  const matrixData = cachedMatrix?.matrix || [];
  const formSerialsMap = cachedMatrix?.formSerials || {};
  const boothsList = cachedBooths || [];
  const totalRounds = cachedMatrix?.totalRounds || (matrixData[0] ? matrixData[0].length : 0);

  const { formDisparities, tableSummaries, totalDisparitiesCount } = analyzeTableDisparities(
    allResults,
    matrixData,
    formSerialsMap,
    boothsList
  );

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
      ${doneLocal > 0 ? `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>${doneLocal} Local</span>` : ''}
      ${totalDisparitiesCount > 0 ? `<span class="flex items-center gap-1 text-red-400 font-bold"><span class="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse"></span>${totalDisparitiesCount} Disparity</span>` : ''}
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-slate-500 inline-block"></span>${pendingCount} Pending</span>
      ${failed > 0 ? `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span>${failed} Failed</span>` : ''}
    `;
  }

  // 5. Update Disparity Banner
  if (disparityBanner) {
    if (totalDisparitiesCount > 0) {
      disparityBanner.className = 'p-3 border-b border-red-500/50 bg-red-950/60 flex items-center justify-between gap-3 text-xs shadow-inner';
      disparityBanner.innerHTML = `
        <div class="flex items-center gap-2 font-bold text-red-200">
          <span class="text-base animate-pulse">⚠️</span>
          <span><strong>${totalDisparitiesCount} General Ballot Disparity Alert(s):</strong> Inconsistent ballot counts detected across rounds.</span>
        </div>
        <span class="text-[10px] bg-red-500/30 text-red-200 border border-red-500/50 px-2.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
          Flagged in RED below
        </span>
      `;
    } else {
      disparityBanner.className = 'hidden';
      disparityBanner.innerHTML = '';
    }
  }

  const currentSerial = String(main.querySelector('#txtSerial')?.value || '').trim();

  // ─── 6. Render Table × Round Matrix Grid (Default Tab) ───────────────────────
  if (matrixGridEl && matrixData.length > 0) {
    let mHtml = `
      <table class="ledger-matrix-table">
        <thead>
          <tr>
            <th class="ledger-sticky-col w-20 text-left px-2">Table</th>
            ${Array.from({ length: totalRounds }).map((_, r) => `
              <th class="text-center min-w-[70px]">R${r + 1}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    boothsList.forEach((b, t) => {
      const tableNum = String(b.boothNumber || (t + 1));
      const tSummary = tableSummaries[tableNum] || {};
      const row = matrixData[t] || [];

      mHtml += `<tr>`;
      // Sticky table header
      mHtml += `
        <td class="ledger-sticky-col p-1.5 align-middle">
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center justify-between gap-1">
              <span class="font-bold text-indigo-300 text-xs">🪑 T${tableNum}</span>
              ${tSummary.hasDisparity ? `
                <span class="badge bg-red-500/30 text-red-200 border border-red-500 text-[8px] px-1 py-0 font-bold shrink-0 animate-pulse" title="${esc((tSummary.messages || []).join('\n'))}">
                  ⚠️ Mismatch
                </span>
              ` : (tSummary.baselineBallots !== null && tSummary.baselineBallots !== undefined ? `
                <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[8px] px-1 py-0 shrink-0" title="Consistent General Ballots: ${tSummary.baselineBallots}">
                  🗳️ ${tSummary.baselineBallots}
                </span>
              ` : '')}
            </div>
          </div>
        </td>
      `;

      // Round cells
      for (let r = 0; r < totalRounds; r++) {
        const postObj = row[r];
        if (!postObj) {
          mHtml += `<td class="text-center text-slate-600 font-mono text-[10px] bg-slate-900/30 select-none">—</td>`;
          continue;
        }

        const postName = typeof postObj === 'string' ? postObj : String(postObj.post || postObj.name || '');
        const shortName = formatMatrixPostName(postName);
        const serial = formSerialsMap[`${t}-${r}`];
        if (!serial) {
          mHtml += `<td class="text-center text-slate-600 font-mono text-[10px]">—</td>`;
          continue;
        }

        const sStr = String(serial);
        const st = statusMap[sStr] || 'not-entered';
        const isDisp = Boolean(formDisparities[sStr]);
        const dispInfo = formDisparities[sStr];
        const tallied = getFormTalliedVotes(allResults, tableNum, postName);

        let cellClass = 'ledger-matrix-cell';
        let cellTitle = `Form #${sStr} | Table ${tableNum} • Round ${r + 1} | ${postName}`;

        if (currentSerial && sStr === currentSerial) {
          cellClass += ' ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900 scale-105';
        }

        if (isDisp) {
          cellClass += ' bg-red-500/30 text-red-100 border border-red-500 disparity-pulse shadow-md font-bold';
          cellTitle += ` | ⚠️ DISPARITY: ${dispInfo?.message || 'Mismatched ballot count'}`;
        } else if (st === 'synced') {
          cellClass += ' bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30';
          cellTitle += ` | 🟢 Synced (${tallied !== null ? tallied + ' ballots/votes' : ''})`;
        } else if (st === 'pending' || st === 'retry') {
          cellClass += ' bg-amber-500/25 text-amber-300 border border-amber-500/50 hover:bg-amber-500/40 shadow-sm';
          cellTitle += ` | 💾 Local (IndexedDB) (${tallied !== null ? tallied + ' ballots/votes' : ''})`;
        } else if (st === 'syncing') {
          cellClass += ' bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse';
          cellTitle += ' | 🔵 Uploading to Cloud...';
        } else if (st === 'error') {
          cellClass += ' bg-red-500/20 text-red-300 border border-red-500/50';
          cellTitle += ' | ❌ Cloud Sync Error';
        } else {
          cellClass += ' bg-slate-800/80 text-slate-400 border border-slate-700/80 border-dashed hover:border-slate-500 hover:bg-slate-700/60';
          cellTitle += ' | ⏳ Missing / Not Entered (Click to load and enter form)';
        }

        mHtml += `
          <td>
            <button type="button" class="${cellClass}" data-serial="${sStr}" title="${esc(cellTitle)}">
              <span class="font-mono font-bold leading-none ${isDisp ? 'text-red-200' : ''}">#${sStr}</span>
              <span class="text-[8.5px] truncate max-w-full opacity-90 leading-tight">${esc(shortName)}</span>
              ${tallied !== null ? `
                <span class="text-[8px] font-mono font-bold mt-0.5 px-1 rounded ${isDisp ? 'bg-red-900/80 text-red-200 border border-red-500/60' : 'bg-black/30 text-white/90'}">
                  ${isDisp ? '⚠️ ' : ''}${tallied}
                </span>
              ` : ''}
            </button>
          </td>
        `;
      }
      mHtml += `</tr>`;
    });

    mHtml += `</tbody></table>`;
    matrixGridEl.innerHTML = mHtml;

    // Single click on matrix button loads form
    matrixGridEl.querySelectorAll('button[data-serial]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.serial;
        const txt = main.querySelector('#txtSerial');
        const btnLoad = main.querySelector('#btnLoadBySerial');
        if (txt && s) {
          txt.value = s;
          if (btnLoad) btnLoad.click();
        }
      });
    });
  }

  // ─── 7. Render Flat Chips Grid ──────────────────────────────────────────────
  if (chipsGridEl) {
    const chipClass = (st, s) => {
      let base = 'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold select-none transition-all border cursor-pointer';
      if (currentSerial && String(s) === currentSerial) {
        base += ' ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900 shadow-md shadow-indigo-500/40 font-extrabold scale-105';
      }
      if (formDisparities[String(s)]) {
        return `${base} bg-red-500/30 text-red-200 border-red-500 disparity-pulse hover:bg-red-500/40 font-bold`;
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
      if (formDisparities[String(s)]) {
        return `${base} | ⚠️ DISPARITY: ${formDisparities[String(s)].message}${action}`;
      }
      if (st === 'error') {
        const item = queue.find(i => String(i.formSerial) === String(s));
        return `${base} | ❌ Cloud Sync Error: ${item?.errorMsg || 'Retrying...'}${action}`;
      }
      if (st === 'pending') return `${base} | 💾 Saved locally in IndexedDB (Queued for Cloud Sync)${action}`;
      if (st === 'synced') return `${base} | 🟢 Synced with Cloud Database${action}`;
      if (st === 'syncing') return `${base} | 🔵 Uploading to Cloud...${action}`;
      return `${base} | ⏳ Not entered yet${action}`;
    };

    chipsGridEl.innerHTML = allSerials.map(s => {
      const st = statusMap[String(s)] || 'not-entered';
      const qItem = queue.find(i => String(i.formSerial) === String(s));
      return `<button class="${chipClass(st, s)}"
        title="${chipTitle(s, st, allFormSerialsMeta)}"
        data-serial="${s}"
        ${st === 'error' && qItem ? `data-id="${qItem.id}"` : ''}
      >${s}</button>`;
    }).join('');

    chipsGridEl.querySelectorAll('button[data-serial]').forEach(chip => {
      chip.addEventListener('click', () => {
        const serial = chip.dataset.serial;
        const txtSerial = main.querySelector('#txtSerial');
        const btnLoad = main.querySelector('#btnLoadBySerial');
        if (txtSerial && serial) {
          txtSerial.value = serial;
          if (btnLoad) btnLoad.click();
        }
      });
    });
  }

  // ─── 8. Render Pending Forms List Tab ───────────────────────────────────────
  const pendingList = main.querySelector('#pendingList');
  const pendingTabCount = main.querySelector('#pendingTabCount');
  const pendingSerials = allSerials.filter(s => {
    const st = statusMap[String(s)] || 'not-entered';
    return st === 'not-entered';
  });
  if (pendingTabCount) pendingTabCount.textContent = pendingSerials.length;
  if (pendingList) {
    if (pendingSerials.length === 0) {
      pendingList.innerHTML = `<tr><td colspan="4" class="px-3 py-8 text-center text-emerald-400 font-bold text-sm">🎉 All counting forms have been entered!</td></tr>`;
    } else {
      pendingList.innerHTML = pendingSerials.map(s => {
        const info = allFormSerialsMeta[String(s)] || {};
        return `
          <tr class="border-b border-white/5 hover:bg-white/5 transition cursor-pointer pending-row" data-serial="${s}">
            <td class="px-3 py-2 font-bold text-slate-300 text-xs">#${s}</td>
            <td class="px-3 py-2 text-slate-400 text-xs font-semibold">Table ${info.tableNum || '?'}</td>
            <td class="px-3 py-2 text-slate-300 text-xs leading-tight font-medium">${esc(info.postName || '?')}</td>
            <td class="px-3 py-2 text-right">
              <button type="button" class="btn btn-xs btn-primary px-2 py-0.5 text-[10px] font-bold">Load</button>
            </td>
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
          }
        });
      });
    }
  }

  // ─── 9. Tab Switching Logic ─────────────────────────────────────────────────
  if (!main.dataset.tabsInit) {
    main.dataset.tabsInit = '1';
    const tabMatrix = main.querySelector('#tabMatrix');
    const tabChips = main.querySelector('#tabChips');
    const tabPending = main.querySelector('#tabPending');
    const panelMatrix = main.querySelector('#panelMatrix');
    const panelChips = main.querySelector('#panelChips');
    const panelPending = main.querySelector('#panelPending');

    const activateTab = (tab, panel) => {
      [tabMatrix, tabChips, tabPending].forEach(t => {
        if (!t) return;
        t.classList.remove('text-white', 'border-indigo-400', 'font-bold');
        t.classList.add('text-slate-400', 'border-transparent', 'font-semibold');
      });
      [panelMatrix, panelChips, panelPending].forEach(p => {
        if (!p) return;
        p.classList.add('hidden');
      });
      tab.classList.add('text-white', 'border-indigo-400', 'font-bold');
      tab.classList.remove('text-slate-400', 'border-transparent', 'font-semibold');
      panel.classList.remove('hidden');
    };

    tabMatrix?.addEventListener('click', () => activateTab(tabMatrix, panelMatrix));
    tabChips?.addEventListener('click', () => activateTab(tabChips, panelChips));
    tabPending?.addEventListener('click', () => activateTab(tabPending, panelPending));
  }
}
