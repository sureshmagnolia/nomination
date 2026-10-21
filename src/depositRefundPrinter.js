/**
 * depositRefundPrinter.js
 * Official Security Deposit Refund & Forfeiture Register Generator
 * (സെക്യൂരിറ്റി ഡെപ്പോസിറ്റ് റീഫണ്ട് / കണ്ടുകെട്ടൽ രജിസ്റ്റർ)
 * 
 * Rules & Statutory Guidelines:
 *  - Candidates contesting for General Union Offices remit a Security Deposit fee of ₹50/-.
 *  - As per Calicut University College Union Election Rules / Statutes:
 *      • If a candidate secures 20.00% or more of the total polled votes, the deposit is refunded.
 *      • If a candidate secures less than 20.00% of the polled votes, the deposit is FORFEITED.
 *  - General Ballot total is uniform for all general posts (single-vote posts).
 *  - As clarified by Returning Officer: For UUC, the denominator is ALSO the total of general ballots (not doubled).
 *  - Table Columns:
 *      1. Sl. No.
 *      2. Post Name
 *      3. Name of Candidate
 *      4. Class
 *      5. Votes Secured
 *      6. Total Votes Polled (General Ballot Total)
 *      7. Percentage of Votes Secured (with 2 decimal points)
 *      8. Signature of Candidate who received refund (or "Amount Forfeited" if < 20%)
 */

import { esc, showToast } from './utils.js';
import { CONFIG } from './config.js';
import { api } from './api.js';
import { isGeneralPost, getStandardGeneralPostTitle, ensureAnekMalayalamFont } from './oathPrinter.js';

/**
 * Checks if a post is UUC (University Union Councillor)
 */
export function isUucPost(postName = '') {
  const p = String(postName || '').toUpperCase();
  return p.includes('UUC') || p.includes('UNIVERSITY UNION COUNCILLOR');
}

/**
 * Deduces total physical general ballot papers polled from:
 * 1. Overrides in localStorage / saved counting matrix (`tablePolledBallots`)
 * 2. Sum of votes in single-vote general posts (Chairman, Gen Sec, etc.)
 */
export function deduceGeneralBallotsPolled(results = [], posts = []) {
  // 1. Check if tablePolledBallots exists in localStorage
  try {
    const raw = localStorage.getItem('gcc_table_polled_ballots');
    if (raw) {
      const parsed = JSON.parse(raw);
      const sum = Object.values(parsed).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
      if (sum > 0) return sum;
    }
  } catch (_) {}

  // 2. Fallback: Aggregate single-vote general posts to find highest polled vote total
  if (!Array.isArray(results) || !results.length) return 0;

  const postVoteSums = {};
  results.forEach(r => {
    const p = String(r.Post || '').trim();
    if (!p || isUucPost(p) || !isGeneralPost(p)) return; // Exclude UUC and non-general posts
    const v = parseInt(r.Votes, 10) || 0;
    postVoteSums[p] = (postVoteSums[p] || 0) + v;
  });

  const sums = Object.values(postVoteSums).filter(v => v > 0);
  if (sums.length > 0) {
    // Return the maximum vote total cast for any single-vote general executive post
    return Math.max(...sums);
  }

  // 3. Fallback: if single-vote posts have no votes, check UUC total votes
  const uucResults = results.filter(r => isUucPost(r.Post));
  const uucSum = uucResults.reduce((acc, r) => acc + (parseInt(r.Votes, 10) || 0), 0);
  if (uucSum > 0) {
    // In UUC dual-vote, rough single ballot equivalent is approx uucSum / 2
    return Math.round(uucSum / 2);
  }

  return 0;
}

/**
 * Compute Deposit Refund Register Records for all General Contested Candidates
 */
export function computeDepositRefundRecords({
  posts = [],
  candidates = [],
  results = [],
  nominalRoll = [],
  generalBallotsTotal = 0,
  isFinalPublished = false
} = {}) {
  const postsList = Array.isArray(posts) ? posts : (posts?.posts || CONFIG.DEFAULT_POSTS || []);
  const candList = Array.isArray(candidates) ? candidates : (candidates?.active || candidates?.nominations || []);
  const resList = Array.isArray(results) ? results : (results?.results || []);
  const rollList = Array.isArray(nominalRoll) ? nominalRoll : [];

  // Map votes per post per candidate
  const agg = {};
  resList.forEach(r => {
    const postKey = String(r.Post || '').trim().toLowerCase();
    if (!agg[postKey]) agg[postKey] = {};
    const cId = String(r.CandidateId || r.candidateId || '').trim();
    if (cId) {
      if (!agg[postKey][cId]) agg[postKey][cId] = 0;
      agg[postKey][cId] += Number(r.Votes) || 0;
    }
  });

  // Filter only General Posts
  const generalPosts = postsList.filter(p => isGeneralPost(p.post || p.name || p));

  const records = [];
  let serial = 1;

  generalPosts.forEach(p => {
    const postName = String(p.post || p.name || p).trim();
    const postKey = postName.toLowerCase();
    const isUUC = isUucPost(postName);
    const seats = isUUC ? 2 : 1;

    // Filter candidates running for this post
    const postCandidates = candList.filter(c => 
      String(c.post || '').trim().toLowerCase() === postKey
    );

    if (postCandidates.length === 0) return;

    // Check if uncontested / unopposed
    const isUnopposed = isFinalPublished && postCandidates.length <= seats;

    // Attach vote counts to candidates
    const postAgg = agg[postKey] || {};
    const candidateRows = postCandidates.map(c => {
      // Lookup votes by ID or Candidate Name
      let votes = 0;
      const cId = String(c.id || '').trim();
      if (cId && postAgg[cId] !== undefined) {
        votes = Number(postAgg[cId]) || 0;
      } else {
        // Fallback search in results matching candidateName
        const matchingRes = resList.filter(r => 
          String(r.Post || '').trim().toLowerCase() === postKey &&
          String(r.CandidateName || '').trim().toUpperCase() === String(c.candidateName || c.name || '').trim().toUpperCase()
        );
        votes = matchingRes.reduce((s, r) => s + (Number(r.Votes) || 0), 0);
      }

      // Lookup class if missing
      let candClass = c.candidateClass || c.candidate_class || c.class || '';
      if (!candClass && rollList.length) {
        const student = rollList.find(s => 
          (c.candidateAdmission && String(s['ADMISION NO'] || s['Admission No'] || '').trim() === String(c.candidateAdmission).trim()) ||
          (c.id && String(s['Nominal Roll Serial Number'] || '').trim() === String(c.id).trim()) ||
          (String(s['NAME'] || '').trim().toUpperCase() === String(c.candidateName || c.name || '').trim().toUpperCase())
        );
        if (student) candClass = String(student['CLASS'] || '').trim();
      }

      return {
        ...c,
        candidateName: (c.candidateName || c.name || 'Candidate Name').toUpperCase(),
        candidateClass: (candClass || '—').toUpperCase(),
        votes: isUnopposed ? null : votes
      };
    });

    // Sort candidates descending by votes
    candidateRows.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    candidateRows.forEach(cand => {
      const votes = cand.votes;
      let pct = 0;
      let isEligible = false;
      let statusRemark = '';
      let isForfeited = false;

      if (isUnopposed) {
        pct = 100.00;
        isEligible = true;
        statusRemark = 'Returned Unopposed (Eligible)';
      } else if (generalBallotsTotal > 0 && votes != null) {
        // Note: For UUC the denominator is also the total of general ballots, not doubled!
        pct = Number(((votes / generalBallotsTotal) * 100).toFixed(2));
        isEligible = pct >= 20.00;
        isForfeited = !isEligible;
        statusRemark = isEligible ? 'Eligible for Refund (≥ 20.00%)' : 'Forfeited (< 20.00%)';
      } else {
        pct = 0.00;
        isEligible = false;
        isForfeited = true;
        statusRemark = 'Pending Counts / Zero Votes';
      }

      records.push({
        slNo: serial++,
        postName: postName.toUpperCase(),
        postTitleStandard: getStandardGeneralPostTitle(postName),
        isUUC,
        isUnopposed,
        candidateId: cand.id,
        candidateName: cand.candidateName,
        candidateClass: cand.candidateClass,
        votesSecured: isUnopposed ? 'Unopposed' : (votes != null ? votes : 0),
        totalPolled: generalBallotsTotal > 0 ? generalBallotsTotal : (isUnopposed ? 'N/A' : 0),
        percentage: isUnopposed ? '100.00%' : (pct.toFixed(2) + '%'),
        pctRaw: pct,
        depositAmount: 50,
        isEligible,
        isForfeited,
        statusRemark,
        signatureText: isForfeited ? 'Amount Forfeited' : ''
      });
    });
  });

  return records;
}

/**
 * Format date as DD/MM/YYYY
 */
function getFormattedCurrentDate() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Open Security Deposit Refund & Forfeiture Register Modal
 */
export async function openDepositRefundModal(options = {}) {
  ensureAnekMalayalamFont();

  const existing = document.getElementById('depositRefundModalContainer');
  if (existing) existing.remove();

  const pwd = options.pwd || sessionStorage.getItem('adminPassword') || localStorage.getItem('adminPwd') || '';

  // Show preliminary loading modal
  const modalEl = document.createElement('div');
  modalEl.id = 'depositRefundModalContainer';
  modalEl.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5';
  modalEl.innerHTML = `
    <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-md"></div>
    <div class="relative bg-slate-900 border border-white/15 rounded-2xl p-8 text-center text-slate-200 z-10 shadow-2xl max-w-md w-full">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-sm font-semibold text-slate-300 mt-4">Loading Contested Candidates &amp; Vote Percentages...</p>
    </div>
  `;
  document.body.appendChild(modalEl);

  try {
    let settings = options.settings;
    let schedule = options.schedule;
    let posts = options.posts;
    let candidates = options.candidates;
    let results = options.results;
    let nominalRoll = options.nominalRoll;

    // Fetch missing dependencies if not provided
    try {
      if (!settings || !schedule) {
        const setsPromise = pwd ? api.adminGetSettings(pwd).catch(() => ({})) : api.getSettings().catch(() => ({}));
        const schedPromise = api.getPublicSchedule().catch(() => ({}));
        const [s, sc] = await Promise.all([setsPromise, schedPromise]);
        settings = settings || s || {};
        schedule = schedule || sc || {};
      }

      if (!posts || !Array.isArray(posts) || posts.length === 0) {
        const rawPosts = pwd ? await api.adminGetPosts(pwd).catch(() => null) : await api.getPosts().catch(() => null);
        if (Array.isArray(rawPosts)) posts = rawPosts;
        else if (Array.isArray(rawPosts?.posts)) posts = rawPosts.posts;
        else posts = CONFIG.DEFAULT_POSTS || [];
      }

      if (!results || !Array.isArray(results) || results.length === 0) {
        const rawRes = pwd ? await api.adminGetResults(pwd, true).catch(() => null) : await api.getResults(true).catch(() => null);
        if (Array.isArray(rawRes)) results = rawRes;
        else if (Array.isArray(rawRes?.results)) results = rawRes.results;
        else {
          try {
            const { getAllResultsLocally } = await import('./offlineStorage.js');
            const local = await getAllResultsLocally();
            if (Array.isArray(local) && local.length > 0) results = local;
          } catch (_) {}
        }
      }

      if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
        if (pwd) {
          try {
            const fn = await api.adminGetFinalNominations(pwd).catch(() => null);
            if (Array.isArray(fn?.active) && fn.active.length > 0) {
              candidates = fn.active;
            } else if (Array.isArray(fn) && fn.length > 0) {
              candidates = fn;
            }
          } catch (_) {}
        }
        if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
          let allNoms = pwd ? await api.adminGetNominations(pwd, true).catch(() => []) : [];
          if (!Array.isArray(allNoms) && Array.isArray(allNoms?.nominations)) {
            allNoms = allNoms.nominations;
          }
          if (Array.isArray(allNoms) && allNoms.length) {
            candidates = allNoms.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');
          }
        }
      }

      if (!nominalRoll || !Array.isArray(nominalRoll) || nominalRoll.length === 0) {
        nominalRoll = await api.getNominalRoll().catch(() => []);
      }
    } catch (err) {
      console.warn('Error fetching deposit refund dependencies:', err);
    }

    posts = Array.isArray(posts) ? posts : (posts?.posts || CONFIG.DEFAULT_POSTS || []);
    candidates = Array.isArray(candidates) ? candidates : (candidates?.active || candidates?.nominations || []);
    results = Array.isArray(results) ? results : (results?.results || []);
    nominalRoll = Array.isArray(nominalRoll) ? nominalRoll : [];

    const isFinalPublished = (settings?.finalListPublished === 'true') || 
                             (settings?.finalListPublished === true) || 
                             (schedule?.finalListPublished === 'true') || 
                             (schedule?.finalListPublished === true);

    // Initial deduction of General Ballots Polled
    let savedGeneralBallots = parseInt(localStorage.getItem('gcc_deposit_general_ballots_polled'), 10);
    if (isNaN(savedGeneralBallots) || savedGeneralBallots <= 0) {
      savedGeneralBallots = deduceGeneralBallotsPolled(results, posts);
    }

    const collegeName = settings.collegeName || schedule.collegeName || CONFIG.DEFAULT_COLLEGE_NAME || 'GOVERNMENT COLLEGE CHITTUR';
    const collegePlace = settings.collegePlace || schedule.collegePlace || 'Chittur';
    const rawElectionYear = String(settings.electionYear || schedule.electionYear || new Date().getFullYear()).trim();
    const yearMatch = rawElectionYear.match(/\b(20\d\d)\b/);
    const electionYear = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
    const academicYear = settings.academicYear || `${electionYear} - ${parseInt(electionYear, 10) + 1}`;
    let registerDate = settings.depositRegisterDate || localStorage.getItem('gcc_deposit_register_date') || getFormattedCurrentDate();

    // State
    let currentGeneralBallots = savedGeneralBallots || 0;
    let filterMode = 'all'; // 'all' | 'eligible' | 'forfeited'

    function renderModalUI() {
      // Recompute records using currentGeneralBallots
      const records = computeDepositRefundRecords({
        posts,
        candidates,
        results,
        nominalRoll,
        generalBallotsTotal: currentGeneralBallots,
        isFinalPublished
      });

      const totalCandidates = records.length;
      const eligibleCount = records.filter(r => r.isEligible).length;
      const forfeitedCount = records.filter(r => r.isForfeited).length;
      const totalDepositCollected = totalCandidates * 50;
      const totalRefundable = eligibleCount * 50;
      const totalForfeited = forfeitedCount * 50;

      const filteredRecords = records.filter(r => {
        if (filterMode === 'eligible') return r.isEligible;
        if (filterMode === 'forfeited') return r.isForfeited;
        return true;
      });

      modalEl.innerHTML = `
        <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-md" id="depositRefundBackdrop"></div>
        
        <div class="relative bg-slate-900 border border-white/15 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col z-10 shadow-2xl overflow-hidden animate-scale-in">
          
          <!-- Top Modal Header -->
          <div class="px-6 py-4 border-b border-white/10 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="text-2xl p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">💰</span>
              <div>
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                  Security Deposit Refund &amp; Forfeiture Register
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ₹50 Deposit • 20% Threshold
                  </span>
                </h3>
                <p class="text-xs text-slate-400">
                  സെക്യൂരിറ്റി ഡെപ്പോസിറ്റ് റീഫണ്ട് / കണ്ടുകെട്ടൽ രജിസ്റ്റർ — General Union Candidates (Denominator: Total General Ballots).
                </p>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-2 flex-wrap">
              <button type="button" id="btnPrintDepositRegisterLandscape" class="btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5" title="Print Official Register (A4 Landscape)">
                <span>🖨️</span> Print Register (A4 Landscape)
              </button>
              <button type="button" id="btnPrintDepositRegisterPortrait" class="btn bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5" title="Print A4 Portrait">
                <span>📄</span> Portrait
              </button>
              <button type="button" id="btnCloseDepositModalBtn" class="btn btn-secondary text-xs font-bold p-2 rounded-xl text-slate-400 hover:text-white" title="Close Modal">
                ✕
              </button>
            </div>
          </div>

          <!-- Configuration & KPI Stats Strip -->
          <div class="p-4 sm:p-5 bg-slate-950/40 border-b border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-center">
            
            <!-- Denominator Config Box (Cols 1-4) -->
            <div class="lg:col-span-4 p-3 rounded-2xl bg-slate-900 border border-indigo-500/30 flex flex-col justify-between">
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                  <span>🗳️</span> Total General Ballots Polled (Denominator):
                </label>
                <button type="button" id="btnAutoDetectBallots" class="text-[10px] text-amber-300 hover:underline font-mono" title="Auto-detect from results/matrix">
                  ⚡ Auto-Detect
                </button>
              </div>
              <div class="flex items-center gap-2">
                <input type="number" id="inputGeneralBallots" min="1" max="99999" value="${currentGeneralBallots}" class="field font-mono font-bold text-base px-3 py-1.5 bg-black/60 border border-indigo-500/40 rounded-xl text-emerald-300 w-full focus:ring-2 focus:ring-emerald-400" placeholder="e.g. 1200">
                <button type="button" id="btnApplyBallots" class="btn btn-primary text-xs font-bold px-3 py-2 bg-indigo-600 hover:bg-indigo-500 shrink-0">
                  Recalculate
                </button>
              </div>
              <p class="text-[10px] text-slate-400 mt-1.5">
                <span class="text-emerald-400 font-bold">Rule:</span> Denominator for all general seats (including UUC) is this total general ballot count.
              </p>
            </div>

            <!-- Date & College Setting (Cols 5-6) -->
            <div class="lg:col-span-2 p-3 rounded-2xl bg-slate-900 border border-white/10 flex flex-col justify-between">
              <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Register Date:
              </label>
              <input type="text" id="inputRegisterDate" value="${esc(registerDate)}" class="field font-mono text-xs px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white w-full" placeholder="DD/MM/YYYY">
              <span class="text-[10px] text-slate-500 mt-1">Appears on official print footer</span>
            </div>

            <!-- 4 Quick KPI Summary Pills (Cols 7-12) -->
            <div class="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div class="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-center">
                <div class="text-[10px] uppercase font-bold text-slate-400">Total Contested</div>
                <div class="text-lg font-black text-white font-mono mt-0.5">${totalCandidates}</div>
                <div class="text-[9px] text-slate-500">₹${totalDepositCollected} collected</div>
              </div>
              <div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <div class="text-[10px] uppercase font-bold text-emerald-300">Refund Eligible</div>
                <div class="text-lg font-black text-emerald-400 font-mono mt-0.5">${eligibleCount}</div>
                <div class="text-[9px] text-emerald-300/80">₹${totalRefundable} to refund</div>
              </div>
              <div class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
                <div class="text-[10px] uppercase font-bold text-rose-300">Deposit Forfeited</div>
                <div class="text-lg font-black text-rose-400 font-mono mt-0.5">${forfeitedCount}</div>
                <div class="text-[9px] text-rose-300/80">₹${totalForfeited} to union fund</div>
              </div>
              <div class="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center">
                <div class="text-[10px] uppercase font-bold text-indigo-300">Threshold</div>
                <div class="text-lg font-black text-indigo-300 font-mono mt-0.5">20.00%</div>
                <div class="text-[9px] text-slate-400">&ge; 20% gets refund</div>
              </div>
            </div>

          </div>

          <!-- Filter Sub-header -->
          <div class="px-6 py-2.5 bg-slate-950/60 border-b border-white/10 flex items-center justify-between gap-3 text-xs flex-wrap">
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 font-medium">Show:</span>
              <button type="button" class="btn-filter-tab px-2.5 py-1 rounded-lg font-bold text-xs ${filterMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}" data-mode="all">
                All Candidates (${totalCandidates})
              </button>
              <button type="button" class="btn-filter-tab px-2.5 py-1 rounded-lg font-bold text-xs ${filterMode === 'eligible' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}" data-mode="eligible">
                Eligible for Refund (${eligibleCount})
              </button>
              <button type="button" class="btn-filter-tab px-2.5 py-1 rounded-lg font-bold text-xs ${filterMode === 'forfeited' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}" data-mode="forfeited">
                Forfeited (${forfeitedCount})
              </button>
            </div>
            <div class="text-[11px] text-slate-400">
              ${currentGeneralBallots > 0 ? `Active Denominator: <strong class="text-emerald-300 font-mono">${currentGeneralBallots}</strong> votes` : '<strong class="text-amber-400 font-bold">⚠️ Warning: Enter total general ballots polled to compute percentages</strong>'}
            </div>
          </div>

          <!-- Main Interactive Table Body -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/60">
            ${totalCandidates === 0 ? `
              <div class="text-center py-16 px-6 bg-slate-950/40 rounded-2xl border border-white/10 max-w-lg mx-auto">
                <div class="text-4xl mb-3">📋</div>
                <h4 class="font-bold text-white text-base">No Contested General Candidates Found</h4>
                <p class="text-xs text-slate-400 mt-1 leading-relaxed">
                  No validated nominations or declared candidate records exist for General Union posts. Verify that nominations are scrutinized and published.
                </p>
              </div>
            ` : `
              <div class="overflow-x-auto rounded-2xl border border-white/10 shadow-lg bg-slate-950/70">
                <table class="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr class="bg-black/60 border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th class="p-3 w-12 text-center">Sl.</th>
                      <th class="p-3 w-48">Post</th>
                      <th class="p-3">Name of Candidate</th>
                      <th class="p-3 w-36">Class</th>
                      <th class="p-3 w-28 text-center">Votes Secured</th>
                      <th class="p-3 w-28 text-center">Total Polled</th>
                      <th class="p-3 w-24 text-center">Vote %</th>
                      <th class="p-3 w-36 text-center">Status</th>
                      <th class="p-3 w-48 text-left">Candidate Signature / Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/5">
                    ${filteredRecords.map(r => `
                      <tr class="hover:bg-white/[0.02] transition ${r.isEligible ? 'bg-emerald-500/[0.02]' : 'bg-rose-500/[0.02]'}">
                        <td class="p-3 text-center font-mono text-slate-400 font-bold">${r.slNo}</td>
                        <td class="p-3 font-bold text-indigo-300 text-[11px]">
                          ${esc(r.postTitleStandard || r.postName)}
                          ${r.isUUC ? '<span class="ml-1 text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">UUC</span>' : ''}
                        </td>
                        <td class="p-3 font-bold text-white text-xs">
                          ${esc(r.candidateName)}
                        </td>
                        <td class="p-3 font-mono text-slate-300 text-[11px]">${esc(r.candidateClass)}</td>
                        <td class="p-3 text-center font-mono font-bold text-white text-xs">
                          ${r.votesSecured}
                        </td>
                        <td class="p-3 text-center font-mono text-slate-400 text-xs">
                          ${r.totalPolled}
                        </td>
                        <td class="p-3 text-center font-mono font-black text-xs ${r.isEligible ? 'text-emerald-400' : 'text-rose-400'}">
                          ${r.percentage}
                        </td>
                        <td class="p-3 text-center">
                          ${r.isEligible ? `
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              ✓ Eligible (₹50)
                            </span>
                          ` : `
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              ✗ Forfeited (< 20%)
                            </span>
                          `}
                        </td>
                        <td class="p-3">
                          ${r.isEligible ? `
                            <div class="text-[11px] text-slate-400 border-b border-dashed border-slate-600 pb-1">
                              Signature: <span class="font-mono text-slate-600">__________________</span>
                            </div>
                          ` : `
                            <div class="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider text-rose-400 bg-rose-950/40 border border-rose-500/30">
                              Amount Forfeited
                            </div>
                          `}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <!-- Bottom Footer -->
          <div class="px-6 py-3 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-xs flex-wrap gap-2">
            <div class="text-slate-400 text-[11px]">
              Statutory Basis: Calicut University Election Rules / College Union Constitution (Rule: 20% vote deposit recovery).
            </div>
            <div class="flex items-center gap-2">
              <button type="button" id="btnCloseDepositBottom" class="btn btn-secondary text-xs font-bold px-4 py-2 rounded-xl">
                Close
              </button>
            </div>
          </div>

        </div>
      `;

      // Event Listeners
      const closeDialog = () => modalEl.remove();
      modalEl.querySelector('#btnCloseDepositModalBtn')?.addEventListener('click', closeDialog);
      modalEl.querySelector('#btnCloseDepositBottom')?.addEventListener('click', closeDialog);
      modalEl.querySelector('#depositRefundBackdrop')?.addEventListener('click', closeDialog);

      // Filter tabs
      modalEl.querySelectorAll('.btn-filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          filterMode = btn.dataset.mode;
          renderModalUI();
        });
      });

      // Recalculate button
      modalEl.querySelector('#btnApplyBallots')?.addEventListener('click', () => {
        const val = parseInt(modalEl.querySelector('#inputGeneralBallots')?.value, 10);
        if (!isNaN(val) && val > 0) {
          currentGeneralBallots = val;
          localStorage.setItem('gcc_deposit_general_ballots_polled', String(val));
          showToast(`General Ballot total updated to ${val}. Percentages recalculated!`, 'success');
          renderModalUI();
        } else {
          showToast('Please enter a valid positive number for general ballots.', 'error');
        }
      });

      // Auto-detect button
      modalEl.querySelector('#btnAutoDetectBallots')?.addEventListener('click', () => {
        const detected = deduceGeneralBallotsPolled(results, posts);
        if (detected > 0) {
          currentGeneralBallots = detected;
          localStorage.setItem('gcc_deposit_general_ballots_polled', String(detected));
          showToast(`Auto-detected ${detected} general ballots from counting data.`, 'success');
          renderModalUI();
        } else {
          showToast('Could not deduce general ballots from results yet. Please enter manually.', 'warning');
        }
      });

      // Date update
      modalEl.querySelector('#inputRegisterDate')?.addEventListener('change', (e) => {
        registerDate = e.target.value.trim() || getFormattedCurrentDate();
        localStorage.setItem('gcc_deposit_register_date', registerDate);
      });

      // Print buttons
      modalEl.querySelector('#btnPrintDepositRegisterLandscape')?.addEventListener('click', () => {
        triggerDepositPrint('landscape', records, {
          collegeName,
          collegePlace,
          electionYear,
          academicYear,
          registerDate,
          generalBallotsTotal: currentGeneralBallots
        });
      });

      modalEl.querySelector('#btnPrintDepositRegisterPortrait')?.addEventListener('click', () => {
        triggerDepositPrint('portrait', records, {
          collegeName,
          collegePlace,
          electionYear,
          academicYear,
          registerDate,
          generalBallotsTotal: currentGeneralBallots
        });
      });
    }

    renderModalUI();

  } catch (err) {
    console.error('Fatal error in openDepositRefundModal:', err);
    modalEl.innerHTML = `
      <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-md" id="depositRefundBackdrop"></div>
      <div class="relative bg-slate-900 border border-rose-500/30 rounded-2xl p-6 sm:p-8 text-center text-slate-200 z-10 shadow-2xl max-w-lg w-full space-y-4">
        <div class="w-14 h-14 mx-auto rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <h3 class="text-lg font-bold text-white">Error Initializing Deposit Refund Register</h3>
        <p class="text-xs text-rose-300 font-mono bg-black/40 p-3 rounded-lg text-left break-all">
          ${esc(err.message || String(err))}
        </p>
        <div class="flex justify-center gap-3 pt-2">
          <button id="btnCloseDepositErr" class="btn btn-secondary text-xs font-bold py-2 px-5 rounded-xl">Close</button>
        </div>
      </div>
    `;
    modalEl.querySelector('#btnCloseDepositErr')?.addEventListener('click', () => modalEl.remove());
    modalEl.querySelector('#depositRefundBackdrop')?.addEventListener('click', () => modalEl.remove());
  }
}

/**
 * Triggers the browser print dialog with official high-fidelity print stylesheet
 */
function triggerDepositPrint(orientation = 'landscape', records = [], meta = {}) {
  const isLandscape = orientation === 'landscape';
  const totalCandidates = records.length;
  const eligibleCount = records.filter(r => r.isEligible).length;
  const forfeitedCount = records.filter(r => r.isForfeited).length;
  const totalDepositCollected = totalCandidates * 50;
  const totalRefundable = eligibleCount * 50;
  const totalForfeited = forfeitedCount * 50;

  const printHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Security Deposit Refund &amp; Forfeiture Register - College Union Election ${esc(meta.electionYear)}</title>
      <style>
        @page {
          size: A4 ${isLandscape ? 'landscape' : 'portrait'};
          margin: 10mm 12mm 12mm 12mm;
          @bottom-right {
            content: "Page " counter(page) " of " counter(pages);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 8pt;
            font-weight: bold;
            color: #000;
          }
          @bottom-left {
            content: "${esc(meta.collegeName)} — Deposit Refund Register ${esc(meta.electionYear)}";
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 8pt;
            color: #000;
          }
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          margin: 0;
          padding: 15px;
          background: #ffffff;
          color: #000000;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 11px;
          line-height: 1.35;
        }

        .register-container {
          max-width: ${isLandscape ? '1060px' : '780px'};
          margin: 0 auto;
        }

        .header {
          text-align: center;
          border-bottom: 2.5px solid #000000;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }

        .header h1 {
          font-size: 16px;
          font-weight: 900;
          text-transform: uppercase;
          margin: 0;
          letter-spacing: 0.5px;
          color: #000000;
        }

        .header h2 {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          margin: 3px 0 0 0;
          color: #111111;
        }

        .header h3 {
          font-size: 13.5px;
          font-weight: 900;
          text-transform: uppercase;
          text-decoration: underline;
          text-underline-offset: 3px;
          margin: 6px 0 2px 0;
          letter-spacing: 0.8px;
        }

        .header .subtitle-ml {
          font-size: 11px;
          font-weight: 700;
          color: #222222;
          margin-top: 2px;
        }

        .statutory-intro {
          font-size: 10px;
          text-align: justify;
          margin-bottom: 10px;
          color: #111111;
          line-height: 1.4;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
          border-radius: 4px;
        }

        .summary-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1.5px solid #000000;
          background: #f1f5f9;
          padding: 6px 12px;
          margin-bottom: 12px;
          font-size: 10.5px;
          font-weight: bold;
        }

        .summary-box div {
          margin-right: 15px;
        }

        .summary-box strong {
          font-weight: 900;
          color: #000;
        }

        table.register-table {
          width: 100%;
          border-collapse: collapse;
          page-break-inside: auto;
          margin-bottom: 15px;
        }

        table.register-table thead {
          display: table-header-group;
        }

        table.register-table thead tr {
          page-break-after: avoid;
          break-after: avoid;
        }

        table.register-table th {
          border: 1px solid #000000;
          background: #e2e8f0;
          padding: 5px 6px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          color: #000000;
        }

        table.register-table td {
          border: 1px solid #000000;
          padding: 5px 6px;
          font-size: 10px;
          color: #000000;
          vertical-align: middle;
        }

        table.register-table tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .col-sl { width: 5%; text-align: center; font-weight: bold; }
        .col-post { width: 20%; font-weight: 800; }
        .col-cand { width: 22%; font-weight: 700; }
        .col-class { width: 13%; font-weight: 500; }
        .col-votes { width: 8%; text-align: center; font-weight: 900; }
        .col-total { width: 8%; text-align: center; }
        .col-pct { width: 8%; text-align: center; font-weight: 900; }
        .col-sig { width: 16%; }

        .forfeit-label {
          font-weight: 900;
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: #000000;
          display: inline-block;
          border: 1px solid #000000;
          padding: 2px 5px;
          background: #f8fafc;
        }

        .refund-sig-line {
          min-height: 24px;
          display: flex;
          align-items: flex-end;
          border-bottom: 1px solid #000000;
          font-size: 8.5px;
          color: #555555;
          padding-bottom: 1px;
        }

        .footer {
          margin-top: 25px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          page-break-inside: avoid;
          break-inside: avoid;
          border-top: 1.5px solid #000000;
          padding-top: 10px;
        }

        .sig-block {
          text-align: right;
          line-height: 1.3;
        }

        .sig-title {
          font-weight: 900;
          font-size: 11px;
          text-transform: uppercase;
        }

        @media print {
          body {
            padding: 0;
            background: #fff;
          }
          .register-container {
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="register-container">
        
        <div class="header">
          <h1>${esc(meta.collegeName)}</h1>
          <h2>College Union Elections ${esc(meta.electionYear)}</h2>
          <h3>REGISTER OF SECURITY DEPOSIT REFUND &amp; FORFEITURE (GENERAL POSTS)</h3>
          <div class="subtitle-ml">സെക്യൂരിറ്റി ഡെപ്പോസിറ്റ് റീഫണ്ട് / കണ്ടുകെട്ടൽ രജിസ്റ്റർ (ജനറൽ സ്ഥാനങ്ങൾ)</div>
        </div>

        <div class="statutory-intro">
          <strong>STATUTORY PROVISION (Calicut University Election Rules / College Union Constitution):</strong>
          Every candidate contesting for General Union Offices remits a statutory Security Deposit of <strong>₹50/-</strong>. 
          Candidates securing <strong>20.00% or more</strong> of the total physical general ballot papers polled are entitled to receive a full refund of their deposit.
          For candidates securing <strong>less than 20.00%</strong> of the polled general votes, the security deposit is permanently <strong>FORFEITED</strong> to the College Union Fund.
          <em>(Denominator applied for all General Union posts including UUC: Total General Ballots Polled = <strong>${meta.generalBallotsTotal || '—'}</strong>).</em>
        </div>

        <div class="summary-box">
          <div>Total General Contestants: <strong>${totalCandidates}</strong></div>
          <div>Total Deposit Collected (@ ₹50): <strong>₹${totalDepositCollected}/-</strong></div>
          <div>Refund Eligible (&ge; 20%): <strong>${eligibleCount} (₹${totalRefundable}/-)</strong></div>
          <div>Forfeited to Union Fund (&lt; 20%): <strong>${forfeitedCount} (₹${totalForfeited}/-)</strong></div>
        </div>

        <table class="register-table">
          <thead>
            <tr>
              <th class="col-sl">Sl.</th>
              <th class="col-post">Post</th>
              <th class="col-cand">Name of Candidate</th>
              <th class="col-class">Class</th>
              <th class="col-votes">Votes Secured</th>
              <th class="col-total">Total Polled</th>
              <th class="col-pct">Vote %</th>
              <th class="col-sig">Signature of Candidate / Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td class="col-sl">${r.slNo}</td>
                <td class="col-post">${esc(r.postTitleStandard || r.postName)}</td>
                <td class="col-cand">${esc(r.candidateName)}</td>
                <td class="col-class">${esc(r.candidateClass)}</td>
                <td class="col-votes">${r.votesSecured}</td>
                <td class="col-total">${r.totalPolled}</td>
                <td class="col-pct">${r.percentage}</td>
                <td class="col-sig">
                  ${r.isForfeited ? `
                    <div class="forfeit-label">AMOUNT FORFEITED</div>
                  ` : `
                    <div class="refund-sig-line">Sign:</div>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div style="font-weight: 600; font-size: 10.5px; line-height: 1.4;">
            <div><strong>Date of Audit / Disbursement:</strong> ${esc(meta.registerDate)}</div>
            <div><strong>Place:</strong> ${esc(meta.collegePlace)}</div>
            <div style="margin-top: 6px; font-size: 9.5px; color: #333;">Total Refund Disbursed: ₹${totalRefundable}/- • Total Forfeited: ₹${totalForfeited}/-</div>
          </div>

          <div style="display: flex; gap: 40px;">
            <div style="text-align: center; min-width: 170px;">
              <div style="border-bottom: 1.5px solid #000; height: 35px; margin-bottom: 4px;"></div>
              <div class="sig-title">RETURNING OFFICER</div>
              <div style="font-size: 9.5px;">College Union Elections ${esc(meta.electionYear)}</div>
            </div>

            <div style="text-align: center; min-width: 170px;">
              <div style="border-bottom: 1.5px solid #000; height: 35px; margin-bottom: 4px;"></div>
              <div class="sig-title">PRINCIPAL / PATRON</div>
              <div style="font-size: 9.5px;">${esc(meta.collegeName)}</div>
            </div>
          </div>
        </div>

      </div>

      <script>
        window.addEventListener('load', () => {
          window.focus();
          setTimeout(() => {
            window.print();
          }, 350);
        });
      </script>
    </body>
    </html>
  `;

  const printWin = window.open('', '_blank');
  if (!printWin) {
    showToast('Popup blocked! Please allow popups to open the print document.', 'error');
    return;
  }
  printWin.document.open();
  printWin.document.write(printHtml);
  printWin.document.close();
}
