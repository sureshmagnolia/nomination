/**
 * oathPrinter.js
 * Official Swearing-in Ceremony Oath (സത്യപ്രതിജ്ഞാ പത്രിക) Generator
 * Exclusively for Won Candidates of General Union Posts after Result Publication.
 * 
 * Features:
 *  - Strict pre-condition: Only generates after election results are published.
 *  - Only includes officially elected/won candidates (contested, unanimous, lot-resolved).
 *  - High-fidelity single A4 sheet layout per candidate with Anek Malayalam typography.
 *  - Configurable college name in Malayalam, academic year, oath date, and candidate details.
 *  - Live interactive A4 single-sheet preview & 1-click batch printing.
 */

import { esc, showToast } from './utils.js';
import { CONFIG } from './config.js';
import { api } from './api.js';

// Ensure Google Font 'Anek Malayalam' is loaded in the main document
export function ensureAnekMalayalamFont() {
  const fontId = 'font-anek-malayalam';
  if (!document.getElementById(fontId)) {
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@400;500;600;700;800;900&family=Inter:wght@400;600;700;800;900&display=swap';
    document.head.appendChild(link);
  }
}

/**
 * Checks whether a given post is a General Union post
 * (excludes class year representatives and department subject association secretaries)
 */
export function isGeneralPost(postName = '') {
  const p = String(postName || '').trim().toLowerCase();
  if (!p) return false;
  if (p.includes('representative') || p.includes('rep')) return false;
  if (p.includes('association') || p.includes('assoc')) return false;
  return true;
}

/**
 * Standardize English post title for official oath document
 */
export function getStandardGeneralPostTitle(postName = '') {
  let p = String(postName || '').trim();
  if (!p) return '';

  // Clean trailing acronym parentheticals like (UUC)
  p = p.replace(/\s*\(\s*uuc\s*\)/i, '').trim();

  // Ensure standard leading "THE "
  if (!p.toLowerCase().startsWith('the ')) {
    p = 'THE ' + p;
  }

  return p.toUpperCase();
}

/**
 * Compute post winners from posts, candidates, and counting results
 */
export function computePostWinners({ posts = [], candidates = [], results = [], isFinalPublished = false, tieDecisions = {} } = {}) {
  const postsList = Array.isArray(posts) ? posts : (posts?.posts || CONFIG.DEFAULT_POSTS || []);
  const candList = Array.isArray(candidates) ? candidates : (candidates?.active || candidates?.nominations || []);
  const resList = Array.isArray(results) ? results : (results?.results || []);

  const agg = {};
  resList.forEach(r => {
    const postKey = String(r.Post || '').trim();
    if (!agg[postKey]) agg[postKey] = {};
    if (!agg[postKey][r.CandidateId]) agg[postKey][r.CandidateId] = 0;
    agg[postKey][r.CandidateId] += Number(r.Votes) || 0;
  });

  return postsList.map(p => {
    const pPostTrim = String(p.post || '').trim().toLowerCase();
    const postCandidates = candList.filter(c => 
      String(c.post || '').trim().toLowerCase() === pPostTrim
    );
    const postAgg = agg[p.post] || agg[String(p.post || '').trim()] || {};
    const isUUC = p.post.toUpperCase().includes('UUC') || p.post.toUpperCase().includes('UNIVERSITY');
    const seats = isUUC ? 2 : 1;

    // Unanimous / uncontested
    if (isFinalPublished && postCandidates.length <= seats && postCandidates.length > 0) {
      return {
        post: p.post,
        isUUC,
        seats,
        winners: postCandidates.map(c => ({
          ...c,
          wonType: 'uncontested',
          wonText: 'Returned Unopposed'
        }))
      };
    }

    if (postCandidates.length === 0) {
      return { post: p.post, isUUC, seats, winners: [] };
    }

    // Normal election with votes
    const candidatesWithVotes = postCandidates.map(c => ({
      ...c,
      votes: Number(postAgg[c.id]) || 0
    })).sort((a, b) => b.votes - a.votes);

    const tieDecision = tieDecisions[p.post] || null;
    let winners = [];
    const v0 = candidatesWithVotes[0]?.votes || 0;
    const v1 = candidatesWithVotes[1]?.votes || 0;
    const v2 = candidatesWithVotes[2]?.votes || 0;

    if (seats === 1) {
      if (v0 > 0 && v0 === v1) {
        if (tieDecision) {
          const w = candidatesWithVotes.find(c => c.id === tieDecision.winnerId || c.candidateName === tieDecision.candidateName);
          if (w) winners = [{ ...w, wonType: 'lot', wonText: `Won by Lot (${w.votes} votes)` }];
        }
      } else if (v0 > 0) {
        const lead = v0 - (v1 || 0);
        winners = [{ ...candidatesWithVotes[0], wonType: 'votes', wonText: `Elected (${v0} votes, lead +${lead})` }];
      }
    } else {
      // UUC (2 seats)
      if (v0 > 0 && v0 === v1 && v1 === v2) {
        if (tieDecision) {
          const w = candidatesWithVotes.find(c => c.id === tieDecision.winnerId || c.candidateName === tieDecision.candidateName);
          if (w) winners = [{ ...w, wonType: 'lot', wonText: `Won by Lot (${w.votes} votes)` }];
        }
      } else if (v0 > 0 && v0 === v1 && v1 > (v2 || 0)) {
        winners = [
          { ...candidatesWithVotes[0], wonType: 'votes', wonText: `Elected (${v0} votes)` },
          { ...candidatesWithVotes[1], wonType: 'votes', wonText: `Elected (${v1} votes)` }
        ];
      } else if (v0 > 0 && v0 > v1 && v1 > 0 && v1 === (v2 || 0)) {
        if (tieDecision) {
          const w2 = candidatesWithVotes.find(c => (c.id === tieDecision.winnerId || c.candidateName === tieDecision.candidateName) && c.id !== candidatesWithVotes[0].id);
          winners = [
            { ...candidatesWithVotes[0], wonType: 'votes', wonText: `Elected 1st Seat (${v0} votes)` },
            { ...(w2 || candidatesWithVotes[1]), wonType: 'lot', wonText: `Won 2nd Seat by Lot (${v1} votes)` }
          ];
        } else {
          winners = [{ ...candidatesWithVotes[0], wonType: 'votes', wonText: `Elected 1st Seat (${v0} votes)` }];
        }
      } else if (v0 > 0 && v1 > 0 && v0 > v1 && v1 > (v2 || 0)) {
        winners = [
          { ...candidatesWithVotes[0], wonType: 'votes', wonText: `Elected 1st Seat (${v0} votes)` },
          { ...candidatesWithVotes[1], wonType: 'votes', wonText: `Elected 2nd Seat (${v1} votes)` }
        ];
      } else if (v0 > 0) {
        winners = [{ ...candidatesWithVotes[0], wonType: 'votes', wonText: `Elected 1st Seat (${v0} votes)` }];
      }
    }

    return { post: p.post, isUUC, seats, winners };
  });
}

/**
 * Format current date as DD/MM/YYYY
 */
function getFormattedCurrentDate() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Open Oath of Office (സത്യപ്രതിജ്ഞ) Generator Modal
 * Enforces requirement: strictly for won candidates and only after results declaration.
 */
export async function openOathModal(options = {}) {
  ensureAnekMalayalamFont();

  const existing = document.getElementById('oathModalContainer');
  if (existing) existing.remove();

  const pwd = options.pwd || sessionStorage.getItem('adminPassword') || localStorage.getItem('adminPwd') || '';

  // Show preliminary loading modal
  const modalEl = document.createElement('div');
  modalEl.id = 'oathModalContainer';
  modalEl.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5';
  modalEl.innerHTML = `
    <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-md"></div>
    <div class="relative bg-slate-900 border border-white/15 rounded-2xl p-8 text-center text-slate-200 z-10 shadow-2xl max-w-md w-full">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-sm font-semibold text-slate-300 mt-4">Verifying Result Declaration &amp; Loading Won Candidates...</p>
    </div>
  `;
  document.body.appendChild(modalEl);

  try {
    let settings = options.settings;
    let schedule = options.schedule;
    let posts = options.posts;
    let candidates = options.candidates;
    let results = options.results;
    let nominations = options.nominations;
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
          let allNoms = nominations;
          if (!allNoms || !Array.isArray(allNoms)) {
            allNoms = pwd ? await api.adminGetNominations(pwd, true).catch(() => []) : [];
            if (!Array.isArray(allNoms) && Array.isArray(allNoms?.nominations)) {
              allNoms = allNoms.nominations;
            }
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
      console.warn('Error fetching oath dependencies:', err);
    }

    // Ensure all collections are guaranteed arrays
    posts = Array.isArray(posts) ? posts : (posts?.posts || CONFIG.DEFAULT_POSTS || []);
    candidates = Array.isArray(candidates) ? candidates : (candidates?.active || candidates?.nominations || []);
    results = Array.isArray(results) ? results : (results?.results || []);
    nominalRoll = Array.isArray(nominalRoll) ? nominalRoll : [];

    // Check if results are declared and published
    let isResultsPublished = (settings?.resultsPublished === 'true') || 
                             (settings?.resultsPublished === true) || 
                             (schedule?.resultsPublished === 'true') || 
                             (schedule?.resultsPublished === true) || 
                             (options.isResultsPublished === true);

    if (!isResultsPublished) {
      try {
        const freshSets = pwd ? await api.adminGetSettings(pwd).catch(() => null) : await api.getSettings().catch(() => null);
        if (freshSets?.resultsPublished === 'true' || freshSets?.resultsPublished === true) {
          isResultsPublished = true;
          settings = Object.assign(settings || {}, freshSets);
        }
      } catch (_) {}
    }

    // ── RULE ENFORCEMENT: CANNOT GENERATE BEFORE RESULT IS PUBLISHED ─────────────
    if (!isResultsPublished) {
      modalEl.innerHTML = `
        <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-md" id="oathBackdrop"></div>
        <div class="relative bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-center text-slate-200 z-10 shadow-2xl max-w-lg w-full space-y-5 animate-scale-in">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-3xl shadow-inner">
            🔒
          </div>
          <div class="space-y-2">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <span>⚠️</span> Statutory Pre-Condition Lock
            </div>
            <h3 class="text-xl font-black text-white">Results Awaiting Official Declaration</h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
              Swearing-in Ceremony Oaths (<strong>സത്യപ്രതിജ്ഞാ പത്രിക</strong>) are generated strictly for <strong>Won Candidates</strong> after official election results are declared and published by the Returning Officer.
            </p>
          </div>

          <div class="p-4 rounded-xl bg-black/40 border border-white/5 text-left text-xs text-slate-400 space-y-2">
            <div class="flex items-center justify-between font-bold text-slate-300">
              <span>Current Election Lifecycle Stage:</span>
              <span class="text-amber-400 font-mono">Stage 1 / 2 (Not Published)</span>
            </div>
            <p class="text-[11px] text-slate-400 leading-normal">
              To generate and print these statutory oaths, navigate to the <strong>Results Command Center</strong>, review counting tallies, and click <strong>"Declare &amp; Publish Results" (Stage 3)</strong>.
            </p>
          </div>

          <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button id="btnCloseOathGuard" class="btn btn-secondary text-xs font-bold py-2.5 px-5 rounded-xl w-full sm:w-auto">
              Close
            </button>
            <a href="#/admin/results" id="btnGoToResultsCmd" class="btn bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-5 rounded-xl w-full sm:w-auto shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2">
              <span>🏆</span> Go to Results Command Center &rarr;
            </a>
          </div>
        </div>
      `;

      const closeGuard = () => modalEl.remove();
      modalEl.querySelector('#btnCloseOathGuard')?.addEventListener('click', closeGuard);
      modalEl.querySelector('#oathBackdrop')?.addEventListener('click', closeGuard);
      modalEl.querySelector('#btnGoToResultsCmd')?.addEventListener('click', closeGuard);
      return;
    }

    // ── EXTRACT WON CANDIDATES FOR ALL GENERAL POSTS ──────────────────────────────
    const tieDecisions = settings?.tieDecisions || JSON.parse(localStorage.getItem('election_tie_decisions') || '{}');
    const postResults = computePostWinners({
      posts,
      candidates,
      results,
      isFinalPublished: true,
      tieDecisions
    });

    // Filter only General Posts and extract won candidates
    const generalPosts = posts.filter(p => isGeneralPost(p.post));
    const wonCandidatesList = [];

    generalPosts.forEach(p => {
      const pr = postResults.find(r => String(r.post || '').toLowerCase().trim() === String(p.post || '').toLowerCase().trim());
      const winners = pr?.winners || [];
      const isUUC = pr?.isUUC || p.post.toUpperCase().includes('UUC') || p.post.toUpperCase().includes('UNIVERSITY');

      if (isUUC) {
        // Handle UUC Seat 1
        if (winners[0]) {
          wonCandidatesList.push(formatWinnerItem(winners[0], p.post, 'THE UNIVERSITY UNION COUNCILLOR', 'uuc_1', 'University Union Councillor (Councillor 1)', nominalRoll));
        }
        // Handle UUC Seat 2
        if (winners[1]) {
          wonCandidatesList.push(formatWinnerItem(winners[1], p.post, 'THE UNIVERSITY UNION COUNCILLOR', 'uuc_2', 'University Union Councillor (Councillor 2)', nominalRoll));
        }
      } else if (winners[0]) {
        const defaultTitleEn = getStandardGeneralPostTitle(p.post);
        wonCandidatesList.push(formatWinnerItem(winners[0], p.post, defaultTitleEn, `post_${p.post.replace(/\s+/g, '_')}`, p.post, nominalRoll));
      }
    });

    // If no won candidates were found in general posts
    if (wonCandidatesList.length === 0) {
      modalEl.innerHTML = `
        <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-md" id="oathBackdrop"></div>
        <div class="relative bg-slate-900 border border-white/15 rounded-2xl p-6 sm:p-8 text-center text-slate-200 z-10 shadow-2xl max-w-lg w-full space-y-4">
          <div class="text-3xl">⚠️</div>
          <h3 class="text-lg font-bold text-white">No Won Candidates Found for General Posts</h3>
          <p class="text-xs text-slate-400">
            No winning candidates were recorded in the declared results for Executive/General Union posts. Please verify votes entry in Results Command Center.
          </p>
          <button id="btnCloseOathEmpty" class="btn btn-secondary text-xs font-bold py-2 px-5 rounded-xl">Close</button>
        </div>
      `;
      modalEl.querySelector('#btnCloseOathEmpty')?.addEventListener('click', () => modalEl.remove());
      modalEl.querySelector('#oathBackdrop')?.addEventListener('click', () => modalEl.remove());
      return;
    }

    // ── MODAL STATE MANAGEMENT ──────────────────────────────────────────────────
    const yearNum = settings.electionYear || schedule.electionYear || new Date().getFullYear();
    let collegeNameMl = 'ഗവൺമെന്റ് കോളേജ് ചിറ്റൂരിലെ';
    let academicYear = `${Number(yearNum) - 1}-${yearNum}`;
    let oathDate = getFormattedCurrentDate();
    let selectedIndex = 0;
    let viewMode = 'single'; // 'single' | 'all'

    // Helper to re-render the modal interface
    function renderOathModalUI() {
      const selectedItem = wonCandidatesList[selectedIndex] || wonCandidatesList[0];
      const totalWon = wonCandidatesList.length;
      const activeWonCount = wonCandidatesList.filter(item => item.enabled !== false).length;

      modalEl.innerHTML = `
        <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-md" id="oathBackdrop"></div>
        
        <div class="relative bg-slate-900 border border-white/15 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col z-10 shadow-2xl overflow-hidden animate-scale-in">
          
          <!-- Top Modal Header -->
          <div class="px-6 py-4 border-b border-white/10 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="text-2xl p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">📜</span>
              <div>
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                  Swearing-in Ceremony Oaths (സത്യപ്രതിജ്ഞ)
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Won Candidates Only
                  </span>
                </h3>
                <p class="text-xs text-slate-400">
                  Pre-aligned single A4 sheets in <strong>Anek Malayalam</strong> font with custom college details and candidate registry.
                </p>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-2">
              <button type="button" id="btnPrintCurrentOath" class="btn bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5">
                <span>🖨️</span> Print Active Sheet
              </button>
              <button type="button" id="btnPrintAllOaths" class="btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5">
                <span>🖨️</span> Print All Oaths (${activeWonCount})
              </button>
              <button type="button" id="btnCloseOathModalBtn" class="btn btn-secondary text-xs font-bold p-2 rounded-xl text-slate-400 hover:text-white" title="Close Modal">
                ✕
              </button>
            </div>
          </div>

          <!-- Main Body: Two Columns (Left: Configuration & Selector, Right: A4 Preview) -->
          <div class="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            
            <!-- LEFT PANEL (Cols 1-5): Config & Candidate Selector List -->
            <div class="lg:col-span-5 p-5 border-r border-white/10 overflow-y-auto space-y-5 bg-slate-900/50">
              
              <!-- Global Parameters Card -->
              <div class="glass p-4 rounded-2xl border border-white/10 space-y-3">
                <div class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                  <span>🏛️ Oath Document Configuration</span>
                  <span class="text-[10px] font-mono text-slate-400">General Union</span>
                </div>

                <div class="space-y-2">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-300 mb-1">College Name in Malayalam</label>
                    <input type="text" id="inputCollegeMl" class="input input-sm w-full bg-slate-950 text-white text-xs border border-white/10 rounded-lg px-2.5 py-1.5" value="${esc(collegeNameMl)}" placeholder="e.g. ഗവൺമെന്റ് കോളേജ് ചിറ്റൂരിലെ">
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="block text-[11px] font-bold text-slate-300 mb-1">Academic Year</label>
                      <input type="text" id="inputAcademicYear" class="input input-sm w-full bg-slate-950 text-white text-xs border border-white/10 rounded-lg px-2.5 py-1.5" value="${esc(academicYear)}" placeholder="2026-2027">
                    </div>
                    <div>
                      <label class="block text-[11px] font-bold text-slate-300 mb-1">Date of Oath</label>
                      <input type="text" id="inputOathDate" class="input input-sm w-full bg-slate-950 text-white text-xs border border-white/10 rounded-lg px-2.5 py-1.5" value="${esc(oathDate)}" placeholder="DD/MM/YYYY">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Won Candidates List -->
              <div class="space-y-2">
                <div class="flex items-center justify-between px-1">
                  <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Elected General Post Winners (${totalWon})
                  </span>
                  <span class="text-[10px] text-slate-400">Click to preview / edit</span>
                </div>

                <div class="space-y-2" id="wonCandidatesCardList">
                  ${wonCandidatesList.map((item, idx) => `
                    <div class="cand-item-card p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${idx === selectedIndex ? 'bg-indigo-600/20 border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'bg-white/5 border-white/10 hover:border-white/20'}" data-index="${idx}">
                      <div class="flex items-center gap-3 min-w-0">
                        <input type="checkbox" class="item-enable-checkbox rounded border-slate-700 text-indigo-600 focus:ring-0" ${item.enabled !== false ? 'checked' : ''} data-index="${idx}" title="Include in batch printing">
                        <div class="min-w-0">
                          <div class="text-xs font-bold text-white truncate">${esc(item.postTitleEn)}</div>
                          <div class="text-[11px] text-indigo-300 font-semibold truncate">${esc(item.candidateName)}</div>
                          <div class="text-[10px] text-slate-400 truncate">${esc(item.candidateClass)}</div>
                        </div>
                      </div>
                      <div class="text-right shrink-0">
                        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
                          ${esc(item.wonText)}
                        </span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Selected Candidate Live Edit Card -->
              <div class="glass p-4 rounded-2xl border border-indigo-500/30 space-y-3 bg-gradient-to-br from-indigo-950/30 to-transparent">
                <div class="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                  <span>✏️ Active Sheet Editor</span>
                  <span class="text-[10px] font-mono text-slate-400">Sheet ${selectedIndex + 1} of ${totalWon}</span>
                </div>

                <div class="space-y-2">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-400 mb-0.5">English Post Title (Centered Upper)</label>
                    <input type="text" class="input-active-post-title input input-sm w-full bg-slate-950 text-white text-xs border border-white/10 rounded-lg px-2.5 py-1.5 font-bold uppercase" value="${esc(selectedItem.postTitleEn)}">
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-400 mb-0.5">Candidate Name</label>
                    <input type="text" class="input-active-cand-name input input-sm w-full bg-slate-950 text-white text-xs border border-white/10 rounded-lg px-2.5 py-1.5 font-bold uppercase" value="${esc(selectedItem.candidateName)}">
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-400 mb-0.5">Class / Department</label>
                    <input type="text" class="input-active-cand-class input input-sm w-full bg-slate-950 text-white text-xs border border-white/10 rounded-lg px-2.5 py-1.5 uppercase" value="${esc(selectedItem.candidateClass)}">
                  </div>
                </div>
              </div>

            </div>

            <!-- RIGHT PANEL (Cols 6-12): Single-Sheet A4 Live Preview -->
            <div class="lg:col-span-7 p-6 overflow-hidden flex flex-col bg-slate-950/60">
              
              <!-- Preview Toolbar -->
              <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4 shrink-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>📄</span> Live A4 Print Preview
                  </span>
                  <span class="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                    Font: Anek Malayalam
                  </span>
                </div>

                <!-- Preview View Mode Toggle -->
                <div class="inline-flex p-0.5 bg-slate-900 rounded-lg border border-white/10 text-xs">
                  <button type="button" id="btnPreviewSingle" class="px-2.5 py-1 rounded-md font-bold transition ${viewMode === 'single' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
                    Active Sheet
                  </button>
                  <button type="button" id="btnPreviewAll" class="px-2.5 py-1 rounded-md font-bold transition ${viewMode === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
                    All Sheets (${totalWon})
                  </button>
                </div>
              </div>

              <!-- Interactive Sheet Display Canvas -->
              <div class="flex-1 flex flex-col items-center justify-start overflow-y-auto py-2 px-1">
                <style>
                  .oath-sheet-preview, .oath-sheet-preview * {
                    color: #000000 !important;
                  }
                  .oath-post-title-preview {
                    color: #000000 !important;
                    font-weight: 800 !important;
                  }
                  .oath-title-ml-preview {
                    color: #000000 !important;
                    font-weight: 800 !important;
                  }
                  .oath-sheet-preview hr {
                    border: none !important;
                    border-top: 2px solid #2563eb !important;
                    opacity: 1 !important;
                  }
                </style>
                ${viewMode === 'single' ? renderSingleA4SheetHtml(selectedItem, collegeNameMl, academicYear, oathDate) : `
                  <div class="w-full space-y-6 flex flex-col items-center">
                    ${wonCandidatesList.filter(item => item.enabled !== false).map((item, i) => `
                      <div class="relative w-full flex flex-col items-center">
                        <div class="w-full max-w-[620px] text-right mb-1">
                          <span class="text-[10px] font-mono text-slate-500">Sheet ${i + 1} of ${activeWonCount}</span>
                        </div>
                        ${renderSingleA4SheetHtml(item, collegeNameMl, academicYear, oathDate)}
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>

            </div>

          </div>

        </div>
      `;

      // ── EVENT LISTENERS BINDING ───────────────────────────────────────────────
      
      // Close modal
      const closeModal = () => modalEl.remove();
      modalEl.querySelector('#btnCloseOathModalBtn')?.addEventListener('click', closeModal);
      modalEl.querySelector('#oathBackdrop')?.addEventListener('click', closeModal);

      // Global parameters change
      modalEl.querySelector('#inputCollegeMl')?.addEventListener('input', (e) => {
        collegeNameMl = e.target.value.trim() || 'ഗവൺമെന്റ് കോളേജ് ചിറ്റൂരിലെ';
        updatePreviewDisplay();
      });

      modalEl.querySelector('#inputAcademicYear')?.addEventListener('input', (e) => {
        academicYear = e.target.value.trim() || '2026-2027';
        updatePreviewDisplay();
      });

      modalEl.querySelector('#inputOathDate')?.addEventListener('input', (e) => {
        oathDate = e.target.value.trim() || getFormattedCurrentDate();
        updatePreviewDisplay();
      });

      // View mode switch
      modalEl.querySelector('#btnPreviewSingle')?.addEventListener('click', () => {
        viewMode = 'single';
        renderOathModalUI();
      });
      modalEl.querySelector('#btnPreviewAll')?.addEventListener('click', () => {
        viewMode = 'all';
        renderOathModalUI();
      });

      // Select candidate card
      modalEl.querySelectorAll('.cand-item-card').forEach(card => {
        card.addEventListener('click', () => {
          const idx = Number(card.dataset.index);
          if (!isNaN(idx) && idx !== selectedIndex) {
            selectedIndex = idx;
            renderOathModalUI();
          }
        });
      });

      // Toggle include in batch
      modalEl.querySelectorAll('.item-enable-checkbox').forEach(chk => {
        chk.addEventListener('change', (e) => {
          e.stopPropagation();
          const idx = Number(chk.dataset.index);
          if (!isNaN(idx) && wonCandidatesList[idx]) {
            wonCandidatesList[idx].enabled = chk.checked;
            renderOathModalUI();
          }
        });
      });

      // Active item inline inputs
      modalEl.querySelector('.input-active-post-title')?.addEventListener('input', (e) => {
        if (wonCandidatesList[selectedIndex]) {
          wonCandidatesList[selectedIndex].postTitleEn = e.target.value.trim().toUpperCase();
          updatePreviewDisplay();
        }
      });

      modalEl.querySelector('.input-active-cand-name')?.addEventListener('input', (e) => {
        if (wonCandidatesList[selectedIndex]) {
          wonCandidatesList[selectedIndex].candidateName = e.target.value.trim().toUpperCase();
          updatePreviewDisplay();
        }
      });

      modalEl.querySelector('.input-active-cand-class')?.addEventListener('input', (e) => {
        if (wonCandidatesList[selectedIndex]) {
          wonCandidatesList[selectedIndex].candidateClass = e.target.value.trim().toUpperCase();
          updatePreviewDisplay();
        }
      });

      // Print actions
      modalEl.querySelector('#btnPrintCurrentOath')?.addEventListener('click', () => {
        printOathSheets([wonCandidatesList[selectedIndex]], { collegeNameMl, academicYear, oathDate });
      });

      modalEl.querySelector('#btnPrintAllOaths')?.addEventListener('click', () => {
        const toPrint = wonCandidatesList.filter(item => item.enabled !== false);
        if (!toPrint.length) {
          showToast('Please check at least one candidate oath to print.', 'error');
          return;
        }
        printOathSheets(toPrint, { collegeNameMl, academicYear, oathDate });
      });

      function updatePreviewDisplay() {
        const container = modalEl.querySelector('.overflow-y-auto.py-2.px-1');
        if (!container) return;
        if (viewMode === 'single') {
          container.innerHTML = renderSingleA4SheetHtml(wonCandidatesList[selectedIndex], collegeNameMl, academicYear, oathDate);
        } else {
          container.innerHTML = `
            <div class="w-full space-y-6 flex flex-col items-center">
              ${wonCandidatesList.filter(item => item.enabled !== false).map((item, i) => `
                <div class="relative w-full flex flex-col items-center">
                  <div class="w-full max-w-[620px] text-right mb-1">
                    <span class="text-[10px] font-mono text-slate-500">Sheet ${i + 1} of ${activeWonCount}</span>
                  </div>
                  ${renderSingleA4SheetHtml(item, collegeNameMl, academicYear, oathDate)}
                </div>
              `).join('')}
            </div>
          `;
        }
      }
    }

    renderOathModalUI();

  } catch (err) {
    console.error('Fatal error in openOathModal:', err);
    modalEl.innerHTML = `
      <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-md" id="oathBackdrop"></div>
      <div class="relative bg-slate-900 border border-rose-500/30 rounded-2xl p-6 sm:p-8 text-center text-slate-200 z-10 shadow-2xl max-w-lg w-full space-y-4">
        <div class="w-14 h-14 mx-auto rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <h3 class="text-lg font-bold text-white">Error Initializing Oath Generator</h3>
        <p class="text-xs text-rose-300 font-mono bg-black/40 p-3 rounded-lg text-left break-all">
          ${esc(err.message || String(err))}
        </p>
        <div class="flex justify-center gap-3 pt-2">
          <button id="btnCloseOathErr" class="btn btn-secondary text-xs font-bold py-2 px-5 rounded-xl">Close</button>
        </div>
      </div>
    `;
    modalEl.querySelector('#btnCloseOathErr')?.addEventListener('click', () => modalEl.remove());
    modalEl.querySelector('#oathBackdrop')?.addEventListener('click', () => modalEl.remove());
  }
}


/**
 * Format winner item with candidate details and class lookup
 */
function formatWinnerItem(winner, originalPost, defaultTitleEn, id, label, nominalRoll = []) {
  let candClass = winner.candidateClass || winner.candidate_class || winner.class || '';

  // Fallback to nominal roll if class not directly on winner
  if (!candClass && nominalRoll.length) {
    const student = nominalRoll.find(s => 
      (winner.candidateAdmission && String(s['ADMISION NO'] || s['Admission No'] || '').trim() === String(winner.candidateAdmission).trim()) ||
      (winner.id && String(s['Nominal Roll Serial Number'] || '').trim() === String(winner.id).trim()) ||
      (String(s['NAME'] || '').trim().toUpperCase() === String(winner.candidateName || winner.name || '').trim().toUpperCase())
    );
    if (student) {
      candClass = String(student['CLASS'] || '').trim();
    }
  }

  return {
    id,
    postLabel: label || originalPost,
    postOriginal: originalPost,
    postTitleEn: defaultTitleEn || originalPost.toUpperCase(),
    candidateName: (winner.candidateName || winner.name || 'CANDIDATE NAME').toUpperCase(),
    candidateClass: (candClass || 'CLASS / DEPARTMENT').toUpperCase(),
    wonType: winner.wonType || 'votes',
    wonText: winner.wonText || 'Elected',
    votes: winner.votes || 0,
    enabled: true
  };
}

/**
 * Render single A4 Sheet HTML representation for modal preview
 */
export function renderSingleA4SheetHtml(item, collegeNameMl, academicYear, oathDate) {
  if (!item) return '';

  return `
    <div class="oath-sheet-preview shadow-2xl rounded-sm text-black" style="
      width: 100%;
      max-width: 620px;
      aspect-ratio: 210 / 297;
      background: #ffffff;
      padding: 38px 36px 32px 36px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      border: 1px solid #d1d5db;
    ">
      <!-- Top Header: Post Title & Malayalam Title -->
      <div style="text-align: center; margin-bottom: 2px;">
        <div class="oath-post-title-preview" style="
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
          font-size: 21px !important;
          font-weight: 800 !important;
          letter-spacing: 0.8px !important;
          color: #000000 !important;
          margin: 0 !important;
          padding: 0 !important;
          text-transform: uppercase !important;
          line-height: 1.2 !important;
        ">${esc(item.postTitleEn)}</div>
        
        <div class="oath-title-ml-preview" style="
          font-family: 'Anek Malayalam', 'Noto Sans Malayalam', sans-serif !important;
          font-size: 27px !important;
          font-weight: 800 !important;
          color: #000000 !important;
          margin: 6px 0 0 0 !important;
          padding: 0 !important;
          line-height: 1.3 !important;
        ">സത്യപ്രതിജ്ഞ</div>
      </div>

      <!-- Top Blue Horizontal Divider Line -->
      <hr style="
        border: none;
        border-top: 2px solid #2563eb;
        margin: 14px 0 20px 0;
        width: 100%;
      ">

      <!-- Main Body Text in Anek Malayalam Font -->
      <div style="
        font-family: 'Anek Malayalam', 'Noto Sans Malayalam', sans-serif;
        font-size: 17.5px;
        font-weight: 600;
        line-height: 2.15;
        color: #000;
        text-align: center;
        margin: 0 auto;
        max-width: 550px;
      ">
        ${esc(collegeNameMl)} ${esc(academicYear)} അധ്യയന വർഷത്തിലെ കോളേജ് യൂണിയൻ ${esc(item.postTitleEn)} ആയി തിരഞ്ഞെടുക്കപ്പെട്ട ${esc(item.candidateName)} എന്ന ഞാൻ കോളേജിന്റെയും സർവ്വകലാശാലയുടെയും ചട്ടങ്ങൾക്കും നിയമങ്ങൾക്കും അനുസൃതമായി പ്രവർത്തിക്കുമെന്നും എന്നിൽ അർപ്പിതമായ കർത്തവ്യങ്ങൾ നിർഭയമായും പക്ഷപാത രഹിതമായും നിർവഹിക്കുമെന്നും ഇതിനാൽ<br>
        ദൃഢ / സഗൗരവം / ദൈവ നാമത്തിൽ<br>
        പ്രതിജ്ഞ ചെയ്യുന്നു.
      </div>

      <!-- Bottom Blue Horizontal Divider Line -->
      <hr style="
        border: none;
        border-top: 2px solid #2563eb;
        margin: 22px 0 14px 0;
        width: 100%;
      ">

      <!-- Footer Bar -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-family: 'Inter', -apple-system, sans-serif;
      ">
        <!-- Date (Left) -->
        <div style="
          font-size: 14px;
          font-weight: 700;
          color: #000;
        ">
          ${esc(oathDate)}
        </div>

        <!-- Candidate Name & Class (Right) -->
        <div style="text-align: right;">
          <div style="
            font-size: 15px;
            font-weight: 800;
            color: #000;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          ">
            ${esc(item.candidateName)}
          </div>
          <div style="
            font-size: 12.5px;
            font-weight: 700;
            color: #111;
            text-transform: uppercase;
            margin-top: 2px;
          ">
            ${esc(item.candidateClass)}
          </div>
        </div>
      </div>

    </div>
  `;
}

/**
 * Trigger official printing of single-page A4 Oath documents
 */
export function printOathSheets(oaths = [], { collegeNameMl, academicYear, oathDate }) {
  if (!oaths || !oaths.length) {
    showToast('No candidates selected to print.', 'error');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up blocker prevented opening print window. Please allow pop-ups for this site.');
    return;
  }

  const sheetsHtml = oaths.map((item, idx) => `
    <div class="oath-a4-page">
      <div class="oath-content-container">
        
        <!-- Header -->
        <div class="oath-header">
          <div class="post-title-en">${esc(item.postTitleEn)}</div>
          <div class="oath-title-ml">സത്യപ്രതിജ്ഞ</div>
        </div>

        <!-- Top Blue Line -->
        <hr class="blue-divider">

        <!-- Body Malayalam Affirmation -->
        <div class="oath-body-ml">
          ${esc(collegeNameMl)} ${esc(academicYear)} അധ്യയന വർഷത്തിലെ കോളേജ് യൂണിയൻ ${esc(item.postTitleEn)} ആയി തിരഞ്ഞെടുക്കപ്പെട്ട ${esc(item.candidateName)} എന്ന ഞാൻ കോളേജിന്റെയും സർവ്വകലാശാലയുടെയും ചട്ടങ്ങൾക്കും നിയമങ്ങൾക്കും അനുസൃതമായി പ്രവർത്തിക്കുമെന്നും എന്നിൽ അർപ്പിതമായ കർത്തവ്യങ്ങൾ നിർഭയമായും പക്ഷപാത രഹിതമായും നിർവഹിക്കുമെന്നും ഇതിനാൽ<br>
          ദൃഢ / സഗൗരവം / ദൈവ നാമത്തിൽ<br>
          പ്രതിജ്ഞ ചെയ്യുന്നു.
        </div>

        <!-- Bottom Blue Line -->
        <hr class="blue-divider">

        <!-- Footer -->
        <div class="oath-footer">
          <div class="oath-date">${esc(oathDate)}</div>
          <div class="candidate-sign-box">
            <div class="cand-name">${esc(item.candidateName)}</div>
            <div class="cand-class">${esc(item.candidateClass)}</div>
          </div>
        </div>

      </div>
    </div>
  `).join('');

  printWindow.document.write(`<!DOCTYPE html>
<html lang="ml">
<head>
  <meta charset="utf-8">
  <title>College Union Election - Swearing-in Ceremony Oaths</title>
  
  <!-- Anek Malayalam & Inter Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@400;500;600;700;800;900&family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@400;500;600;700;800;900&family=Inter:wght@400;600;700;800;900&display=swap');

    @page {
      size: A4 portrait;
      margin: 15mm 20mm 15mm 20mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      width: 100%;
    }

    .oath-a4-page {
      width: 100%;
      height: 265mm;
      max-height: 265mm;
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      position: relative;
    }

    .oath-a4-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    .oath-content-container {
      width: 100%;
      max-width: 175mm;
      margin: 0 auto;
    }

    .oath-header {
      text-align: center;
      margin-bottom: 2mm;
    }

    .post-title-en {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 21pt;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #000;
      text-transform: uppercase;
      margin: 0;
    }

    .oath-title-ml {
      font-family: 'Anek Malayalam', 'Noto Sans Malayalam', sans-serif;
      font-size: 25pt;
      font-weight: 800;
      color: #000;
      margin-top: 4mm;
    }

    .blue-divider {
      border: none !important;
      border-top: 2.5pt solid #2563eb !important;
      width: 100%;
      margin: 6mm 0 8mm 0;
    }

    .oath-body-ml {
      font-family: 'Anek Malayalam', 'Noto Sans Malayalam', sans-serif;
      font-size: 16.5pt;
      font-weight: 600;
      line-height: 2.15;
      color: #000;
      text-align: center;
      margin: 0 auto;
      max-width: 165mm;
    }

    .oath-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-family: 'Inter', -apple-system, sans-serif;
      margin-top: 2mm;
    }

    .oath-date {
      font-size: 13.5pt;
      font-weight: 700;
      color: #000;
    }

    .candidate-sign-box {
      text-align: right;
    }

    .cand-name {
      font-size: 14.5pt;
      font-weight: 800;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .cand-class {
      font-size: 12.5pt;
      font-weight: 700;
      color: #111;
      text-transform: uppercase;
      margin-top: 2mm;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  ${sheetsHtml}
  <script>
    // Wait for fonts to finish rendering before triggering print dialog
    if (document.fonts) {
      document.fonts.ready.then(() => {
        setTimeout(() => {
          window.print();
        }, 300);
      });
    } else {
      window.onload = () => {
        setTimeout(() => {
          window.print();
        }, 500);
      };
    }
  </script>
</body>
</html>`);

  printWindow.document.close();
}
