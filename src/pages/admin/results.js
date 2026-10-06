/**
 * pages/admin/results.js
 * Admin page to view aggregated results and print the official result sheet.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, sortPosts, isAssocPost, isYearRepPost } from '../../utils.js';
import { CONFIG } from '../../config.js';
import {
  getAllResultsLocally,
  syncLedgerWithServer,
  getCountingMeta,
  downloadLocalBackupJSON,
  downloadResultsCSV
} from '../../offlineStorage.js';

import { router } from '../../router.js';

let activeAdminResultsPollTimer = null;
let lastDataFingerprint = '';

// ── Confidential Admin-Only Candidate Panel Colors ──────────────────────────
const CONFIDENTIAL_PANEL_KEY = 'gcc_admin_confidential_panel_colors';

const PANEL_PALETTE = [
  { id: 'red', hex: '#ef4444', name: 'Red', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/40', ring: 'ring-red-500', dot: 'bg-red-500', lightBorder: 'border-red-500/20', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { id: 'blue', hex: '#3b82f6', name: 'Blue', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/40', ring: 'ring-blue-500', dot: 'bg-blue-500', lightBorder: 'border-blue-500/20', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'green', hex: '#10b981', name: 'Green', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40', ring: 'ring-emerald-500', dot: 'bg-emerald-500', lightBorder: 'border-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'yellow', hex: '#eab308', name: 'Yellow', bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/40', ring: 'ring-yellow-500', dot: 'bg-yellow-500', lightBorder: 'border-yellow-500/20', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { id: 'purple', hex: '#a855f7', name: 'Purple', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/40', ring: 'ring-purple-500', dot: 'bg-purple-500', lightBorder: 'border-purple-500/20', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'orange', hex: '#f97316', name: 'Orange', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/40', ring: 'ring-orange-500', dot: 'bg-orange-500', lightBorder: 'border-orange-500/20', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { id: 'cyan', hex: '#06b6d4', name: 'Cyan', bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/40', ring: 'ring-cyan-500', dot: 'bg-cyan-500', lightBorder: 'border-cyan-500/20', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { id: 'pink', hex: '#ec4899', name: 'Pink', bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/40', ring: 'ring-pink-500', dot: 'bg-pink-500', lightBorder: 'border-pink-500/20', badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
];

function getConfidentialPanelData() {
  try {
    const raw = localStorage.getItem(CONFIDENTIAL_PANEL_KEY);
    if (!raw) return { candidates: {}, labels: {} };
    const parsed = JSON.parse(raw);
    return {
      candidates: parsed.candidates || {},
      labels: parsed.labels || {}
    };
  } catch (e) {
    return { candidates: {}, labels: {} };
  }
}

function saveConfidentialPanelData(data) {
  try {
    localStorage.setItem(CONFIDENTIAL_PANEL_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save confidential panel colors to localStorage:', e);
  }
}

function getCandidateColorInfo(candidate, panelData) {
  if (!candidate || !panelData || !panelData.candidates) return null;
  const candName = String(candidate.candidateName || candidate.name || candidate.CandidateName || '').trim();
  const candPost = String(candidate.post || candidate.Post || '').trim();
  const candIdStr = candidate.id != null ? String(candidate.id).trim() : (candidate.CandidateId != null ? String(candidate.CandidateId).trim() : '');
  const candSerial = String(candidate.candidateSerial || candidate.candidate_serial || candidate.serial || '').trim();

  let colorId = null;
  const entries = panelData.candidates;

  // 1. Direct ID matches
  if (candIdStr && entries[candIdStr]) colorId = entries[candIdStr];
  else if (candidate.id && entries[candidate.id]) colorId = entries[candidate.id];
  else if (candidate.CandidateId && entries[candidate.CandidateId]) colorId = entries[candidate.CandidateId];

  // 2. Direct Name + Post matches
  if (!colorId && candName && candPost) {
    if (entries[`${candName}_${candPost}`]) colorId = entries[`${candName}_${candPost}`];
    else if (entries[`${candName.toLowerCase()}_${candPost.toLowerCase()}`]) colorId = entries[`${candName.toLowerCase()}_${candPost.toLowerCase()}`];
  }

  // 3. Name matches
  if (!colorId && candName) {
    if (entries[candName]) colorId = entries[candName];
    else if (entries[candName.toLowerCase()]) colorId = entries[candName.toLowerCase()];
  }

  // 4. Candidate Serial match
  if (!colorId && candSerial && entries[`serial_${candSerial}`]) {
    colorId = entries[`serial_${candSerial}`];
  }

  // 5. Case-insensitive / whitespace-tolerant search over all keys in panelData.candidates
  if (!colorId) {
    const normName = candName.toLowerCase().replace(/\s+/g, ' ');
    const normPost = candPost.toLowerCase().replace(/\s+/g, ' ');
    const normId = candIdStr.toLowerCase();

    for (const [k, val] of Object.entries(entries)) {
      if (!val || val === 'none') continue;
      const kNorm = String(k).toLowerCase().trim().replace(/\s+/g, ' ');
      if (normId && kNorm === normId) { colorId = val; break; }
      if (normName && normPost && (kNorm === `${normName}_${normPost}` || kNorm === `${normPost}_${normName}`)) { colorId = val; break; }
      if (normName && (kNorm === normName || kNorm.endsWith(`_${normName}`) || kNorm.startsWith(`${normName}_`))) { colorId = val; break; }
    }
  }

  if (!colorId || colorId === 'none') return null;
  const item = PANEL_PALETTE.find(p => p.id === colorId);
  if (!item) return null;
  const customLabel = panelData.labels && panelData.labels[colorId];
  return {
    ...item,
    displayName: customLabel && customLabel.trim() ? customLabel.trim() : `${item.name} Panel`
  };
}

/**
 * Calculates confidential panel standings strictly categorized into:
 * 1. General Executive Posts (Chairperson, Vice Chairperson, Secretary, UUC, etc.)
 * 2. Class / Year Representatives (I UG, II UG, III UG, PG Rep, Lady Rep, etc.)
 * 3. Department Associations (Association Secretaries)
 */
function calculateSplitCategoryStandings(postResults, candidates, panelData, isLocked) {
  const activeColorCount = Object.keys(panelData.candidates || {}).filter(k => panelData.candidates[k] && panelData.candidates[k] !== 'none').length;

  const colorCandidatesMap = {};
  PANEL_PALETTE.forEach(p => {
    colorCandidatesMap[p.id] = 0;
  });

  candidates.forEach(c => {
    const colorInfo = getCandidateColorInfo(c, panelData);
    if (colorInfo && colorCandidatesMap[colorInfo.id] !== undefined) {
      colorCandidatesMap[colorInfo.id]++;
    }
  });

  const activePanels = PANEL_PALETTE.filter(p => 
    colorCandidatesMap[p.id] > 0 || 
    Object.values(panelData.candidates || {}).some(col => col === p.id)
  ).map(p => ({
    ...p,
    displayName: (panelData.labels && panelData.labels[p.id] && panelData.labels[p.id].trim()) ? panelData.labels[p.id].trim() : `${p.name} Panel`
  }));

  const categories = {
    General: { name: 'General', label: 'General Executive', posts: [], counts: {} },
    Reps: { name: 'Reps', label: 'Representatives', posts: [], counts: {} },
    Associations: { name: 'Associations', label: 'Department Associations', posts: [], counts: {} }
  };

  ['General', 'Reps', 'Associations'].forEach(catKey => {
    activePanels.forEach(p => {
      categories[catKey].counts[p.id] = 0;
    });
    categories[catKey].counts.unassigned = 0;
    categories[catKey].counts.total = 0;
  });

  postResults.forEach(res => {
    if (res.type === 'no-candidates') {
      const catKey = isAssocPost(res.post) ? 'Associations' : (isYearRepPost(res.post) ? 'Reps' : 'General');
      categories[catKey].posts.push({
        postName: res.post,
        candidateName: '—',
        candidateClass: '',
        panelId: 'none',
        panelName: 'No Nominee',
        panelDot: 'bg-slate-600',
        panelBadge: 'bg-slate-800 text-slate-500 border-slate-700',
        votes: 0,
        margin: 0,
        statusText: 'No candidate',
        isWon: false,
        isLeading: false,
        noCandidate: true
      });
      return;
    }

    const catKey = isAssocPost(res.post) ? 'Associations' : (isYearRepPost(res.post) ? 'Reps' : 'General');
    const cat = categories[catKey];
    const isUUC = res.post.toUpperCase().includes('UUC') || res.post.toUpperCase().includes('UNIVERSITY');
    const seats = isUUC ? 2 : 1;

    // Unanimous declaration (uncontested won)
    if (res.type === 'unanimous') {
      const winner = res.winner || (res.candidates && res.candidates[0]);
      if (winner) {
        const colorInfo = getCandidateColorInfo(winner, panelData);
        const panelId = colorInfo ? colorInfo.id : 'unassigned';
        const panelName = colorInfo ? colorInfo.displayName : 'Others / Ind.';
        const panelDot = colorInfo ? colorInfo.dot : 'bg-slate-500';
        const panelBadge = colorInfo ? colorInfo.badge : 'bg-slate-800 text-slate-300 border-slate-700';

        if (cat.counts[panelId] !== undefined) {
          cat.counts[panelId]++;
        } else {
          cat.counts.unassigned++;
        }
        cat.counts.total++;

        cat.posts.push({
          postName: res.post,
          candidateName: winner.candidateName,
          candidateClass: winner.candidateClass || '',
          panelId,
          panelName,
          panelDot,
          panelBadge,
          votes: 'Uncontested',
          margin: 0,
          statusText: 'Won (Uncontested)',
          isWon: true,
          isLeading: false
        });
      }
      return;
    }

    // Contested election
    if (res.candidates && res.candidates.length > 0) {
      let runnerUpVotes = 0;
      if (res.candidates.length > seats) {
        runnerUpVotes = Number(res.candidates[seats].votes) || 0;
      }

      for (let s = 0; s < seats; s++) {
        const topCand = res.candidates[s];
        if (!topCand) continue;

        const candVotes = Number(topCand.votes) || 0;
        const colorInfo = getCandidateColorInfo(topCand, panelData);
        const postLabel = isUUC ? `${res.post} (Seat ${s + 1})` : res.post;
        const leadMargin = candVotes > 0 ? (candVotes - runnerUpVotes) : 0;
        const isTieForSeat = res.isTie && s === 0;

        const panelId = colorInfo ? colorInfo.id : 'unassigned';
        const panelName = colorInfo ? colorInfo.displayName : 'Others / Ind.';
        const panelDot = colorInfo ? colorInfo.dot : 'bg-slate-500';
        const panelBadge = colorInfo ? colorInfo.badge : 'bg-slate-800 text-slate-300 border-slate-700';

        const isLeadingOrWon = candVotes > 0 && !isTieForSeat;

        if (isLeadingOrWon) {
          if (cat.counts[panelId] !== undefined) {
            cat.counts[panelId]++;
          } else {
            cat.counts.unassigned++;
          }
        } else {
          cat.counts.unassigned++;
        }
        cat.counts.total++;

        let statusText = 'Pending';
        if (candVotes === 0) {
          statusText = 'No votes entered';
        } else if (isTieForSeat) {
          statusText = `Tied (${candVotes} v)`;
        } else if (isLocked) {
          statusText = `Won (${candVotes} v)`;
        } else {
          statusText = `Lead +${leadMargin} (${candVotes} v)`;
        }

        cat.posts.push({
          postName: postLabel,
          candidateName: topCand.candidateName,
          candidateClass: topCand.candidateClass || '',
          panelId,
          panelName,
          panelDot,
          panelBadge,
          votes: candVotes,
          margin: leadMargin,
          statusText,
          isWon: Boolean(isLocked && isLeadingOrWon),
          isLeading: Boolean(!isLocked && isLeadingOrWon)
        });
      }
    }
  });

  const grandTotals = {
    unassigned: 0,
    total: 0
  };
  activePanels.forEach(p => {
    grandTotals[p.id] = 0;
  });

  ['General', 'Reps', 'Associations'].forEach(k => {
    activePanels.forEach(p => {
      grandTotals[p.id] += categories[k].counts[p.id] || 0;
    });
    grandTotals.unassigned += categories[k].counts.unassigned || 0;
    grandTotals.total += categories[k].counts.total || 0;
  });

  return {
    hasAssignedColors: activeColorCount > 0,
    activePanels,
    categories,
    grandTotals
  };
}

export async function renderAdminResults(container) {
  const pwd = getAdminPassword(); if (!pwd) return;

  // Clear any existing poll timer from a previous visit
  if (activeAdminResultsPollTimer) {
    clearInterval(activeAdminResultsPollTimer);
    activeAdminResultsPollTimer = null;
  }

  // Register cleanup with router: automatically cancel timer whenever navigating away
  router.registerCleanup(() => {
    if (activeAdminResultsPollTimer) {
      clearInterval(activeAdminResultsPollTimer);
      activeAdminResultsPollTimer = null;
    }
  });

  // Also bind hashchange/popstate as an immediate safety guard
  const onRouteExit = () => {
    if (!window.location.hash.startsWith('#/admin/results')) {
      if (activeAdminResultsPollTimer) {
        clearInterval(activeAdminResultsPollTimer);
        activeAdminResultsPollTimer = null;
      }
      window.removeEventListener('hashchange', onRouteExit);
      window.removeEventListener('popstate', onRouteExit);
    }
  };
  window.addEventListener('hashchange', onRouteExit);
  window.addEventListener('popstate', onRouteExit);

  renderAdminLayout(container, 'results', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Aggregating live results...</p></div>
  `);

  let isLivePolling = true;

  async function loadData(force = false, silent = false) {
    // If user navigated away from Results, abort immediately to prevent route hijacking
    if (!window.location.hash.startsWith('#/admin/results')) {
      if (activeAdminResultsPollTimer) {
        clearInterval(activeAdminResultsPollTimer);
        activeAdminResultsPollTimer = null;
      }
      return;
    }

    const main = container.querySelector('#adminMain');
    if (!main) return;
    if (force) {
      api.invalidateCache('adminGetResults');
      api.invalidateCache('getResults');
      api.invalidateCache('adminGetFinalNominations');
      api.invalidateCache('adminGetNominations');
      api.invalidateCache('adminGetSettings');
      api.invalidateCache('getSettings');
      api.invalidateCache('getPosts');
      api.invalidateCache('getPublicSchedule');
    }

    try {
      const [posts, candidatesResp, results, schedule, sets] = await Promise.all([
        api.getPosts().catch(() => []),
        api.adminGetFinalNominations(pwd).catch(async () => {
          const all = await api.adminGetNominations(pwd).catch(() => []);
          return {
            active: all.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved'),
            withdrawn: all.filter(n => n.withdrawalStatus === 'Approved'),
            isPublished: false
          };
        }),
        api.adminGetResults(pwd, force).catch(() => api.getResults(force).catch(() => [])),
        api.getPublicSchedule().catch(() => ({})),
        api.adminGetSettings(pwd).catch(() => ({}))
      ]);

      // Cache server results locally into IndexedDB
      if (Array.isArray(results) && results.length > 0) {
        await syncLedgerWithServer(results);
      }

      // Robust extraction of active candidates
      let activeCandidates = [];
      let isFinalPublished = false;

      if (candidatesResp) {
        if (Array.isArray(candidatesResp)) {
          activeCandidates = candidatesResp;
        } else if (Array.isArray(candidatesResp.active) && candidatesResp.active.length > 0) {
          activeCandidates = candidatesResp.active;
          isFinalPublished = Boolean(candidatesResp.isPublished);
        } else if (Array.isArray(candidatesResp.nominations) && candidatesResp.nominations.length > 0) {
          activeCandidates = candidatesResp.nominations;
        }
      }

      // If activeCandidates is empty (e.g. before final list publication), fallback to adminGetNominations or local IndexedDB cache
      if (!activeCandidates || activeCandidates.length === 0) {
        try {
          const allNoms = await api.adminGetNominations(pwd);
          if (Array.isArray(allNoms) && allNoms.length > 0) {
            const valid = allNoms.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');
            if (valid.length > 0) {
              activeCandidates = valid;
            } else {
              activeCandidates = allNoms.filter(n => n.withdrawalStatus !== 'Approved' && n.status !== 'Rejected');
            }
          }
        } catch (err) {
          console.warn('adminGetNominations fallback in results:', err);
        }
      }

      if (!activeCandidates || activeCandidates.length === 0) {
        try {
          const cachedMeta = await getCountingMeta();
          if (cachedMeta && Array.isArray(cachedMeta.finalList) && cachedMeta.finalList.length > 0) {
            activeCandidates = cachedMeta.finalList;
          }
        } catch (err) {
          console.warn('getCountingMeta candidate check error:', err);
        }
      }

      // Clean & normalize candidate properties
      activeCandidates = (activeCandidates || []).map(c => ({
        ...c,
        id: c.id != null ? c.id : (c.CandidateId || c.candidateId),
        post: c.post || c.Post || '',
        candidateSerial: c.candidateSerial || c.candidate_serial || c.serial || '',
        candidateName: c.candidateName || c.candidate_name || c.name || '',
        candidateClass: c.candidateClass || c.candidate_class || c.class || '',
        candidateDept: c.candidateDept || c.candidate_dept || c.dept || ''
      }));

      // Check data fingerprint: If background polling data has not changed, do NOT re-render DOM or flash the screen!
      const currentFingerprint = JSON.stringify(results) + '_' + activeCandidates.length + '_' + (sets.resultsLocked || 'false') + '_' + (sets.resultsPublished || 'false');
      if (silent && currentFingerprint === lastDataFingerprint) {
        return;
      }
      lastDataFingerprint = currentFingerprint;

      const scrollPos = container.closest('.overflow-auto')?.scrollTop || window.scrollY;
      renderResultsUI(main, pwd, posts || [], activeCandidates, results || [], schedule, sets, isFinalPublished, loadData, isLivePolling, (val) => {
        isLivePolling = val;
      }, false);
      if (silent && scrollPos) {
        container.closest('.overflow-auto')?.scrollTo({ top: scrollPos, behavior: 'instant' });
      }
    } catch (e) {
      console.warn('Results online load failed, checking IndexedDB cache:', e);
      const localResults = await getAllResultsLocally();
      const cachedMeta = await getCountingMeta();
      if (cachedMeta && (cachedMeta.posts?.length || localResults.length > 0)) {
        const posts = cachedMeta.posts || [];
        const candidates = cachedMeta.finalList || [];
        const sets = cachedMeta.settings || {};
        renderResultsUI(main, pwd, posts, candidates, localResults, {}, sets, false, loadData, false, () => {}, true);
      } else {
        if (!silent) main.innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
      }
    }
  }

  // Live auto-polling every 6 seconds for gentle background updates as new data is entered
  if (activeAdminResultsPollTimer) clearInterval(activeAdminResultsPollTimer);
  activeAdminResultsPollTimer = setInterval(() => {
    const isStillOnResults = window.location.hash.startsWith('#/admin/results');
    const rootEl = document.getElementById('adminResultsRoot');
    if (!isStillOnResults || !rootEl || !document.body.contains(rootEl)) {
      clearInterval(activeAdminResultsPollTimer);
      activeAdminResultsPollTimer = null;
      return;
    }
    if (isLivePolling) {
      loadData(true, true);
    }
  }, 6000);

  await loadData(true);
}

function renderResultsUI(main, pwd, posts, candidates, results, schedule, sets, isFinalPublished = false, reloadData = null, isLivePolling = true, setLivePolling = null, isOffline = false) {
  const year = sets.electionYear || schedule.electionYear || new Date().getFullYear();
  const collegeName = sets.collegeName || 'GOVERNMENT VICTORIA COLLEGE PALAKKAD';
  const shortName = sets.collegeShortName || 'GVC';
  const collegeLogo = sets.collegeLogo || '';
  const collegePlace = sets.collegePlace || CONFIG.COLLEGE_PLACE || 'Palakkad';
  let isLocked = sets.resultsLocked === 'true';
  let isPublic = sets.resultsPublished === 'true';
  let isCountingActive = sets.countingActive === 'true' || schedule.countingActive === 'true';
  
  // 1. Aggregate results
  const agg = {};
  results.forEach(r => {
    const postKey = String(r.Post || '').trim();
    if (!agg[postKey]) agg[postKey] = {};
    if (!agg[postKey][r.CandidateId]) agg[postKey][r.CandidateId] = 0;
    agg[postKey][r.CandidateId] += Number(r.Votes) || 0;
  });

  // 2. Determine Winners
  const sortedPosts = sortPosts(posts);
  const postResults = sortedPosts.map(p => {
    const pPostTrim = String(p.post || '').trim().toLowerCase();
    const postCandidates = candidates.filter(c => 
      String(c.post || '').trim().toLowerCase() === pPostTrim
    );
    const postAgg = agg[p.post] || agg[String(p.post || '').trim()] || {};
    
    // Check for Unanimous (Permissible ONLY if the Final List is officially set and published!)
    if (isFinalPublished && postCandidates.length === 1) {
      return {
        post: p.post,
        type: 'unanimous',
        winner: postCandidates[0],
        candidates: postCandidates
      };
    }

    // Single candidate in draft preview before final list publication
    if (!isFinalPublished && postCandidates.length === 1) {
      return {
        post: p.post,
        type: 'draft-single',
        candidates: postCandidates
      };
    }

    if (postCandidates.length === 0) {
      return { post: p.post, type: 'no-candidates' };
    }

    // Normal Election
    const candidatesWithVotes = postCandidates.map(c => ({
      ...c,
      votes: postAgg[c.id] || 0
    }));

    // Sort by votes
    candidatesWithVotes.sort((a, b) => b.votes - a.votes);
    
    const maxVotes = candidatesWithVotes[0].votes;
    const winners = candidatesWithVotes.filter(c => c.votes === maxVotes && c.votes > 0);
    const isTie = winners.length > 1;

    return {
      post: p.post,
      type: 'election',
      candidates: candidatesWithVotes,
      winner: isTie ? null : winners[0],
      isTie,
      totalVotes: Object.values(postAgg).reduce((a, b) => a + b, 0),
      nota: postAgg['NOTA'] || 0,
      invalid: postAgg['INVALID'] || 0
    };
  });

  // 3. Confidential Admin-Only Candidate Panel Calculation
  const panelData = getConfidentialPanelData();
  const splitStandings = calculateSplitCategoryStandings(postResults, candidates, panelData, isLocked);

  main.innerHTML = `
    <div id="adminResultsRoot" class="page-enter space-y-6">
      ${!isFinalPublished ? `
        <div class="glass p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 shadow-lg page-enter">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-start gap-3">
              <span class="text-3xl">⚠️</span>
              <div>
                <h3 class="font-bold text-amber-300 text-sm sm:text-base flex items-center gap-2">
                  <span>Final List of Contesting Candidates Not Published</span>
                  <span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">DRAFT PREVIEW</span>
                </h3>
                <p class="text-slate-300 text-xs mt-1 leading-relaxed max-w-2xl">
                  Official election results, winner declarations, and counting tallies become official <strong>only after the Returning Officer sets and publishes the Final List of Contesting Candidates</strong>.
                  ${candidates.length > 0 
                    ? `Showing a draft preview of <strong>${candidates.length} scrutinized Valid candidates</strong>. Uncontested winner declarations are strictly locked until publication.` 
                    : 'No scrutinized valid candidates found. Newly submitted nominations remain hidden until scrutinized in Verify Nominations.'}
                </p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 shrink-0">
              <button data-nav="/admin/verify" class="btn btn-secondary btn-sm text-xs">🔍 Verify Nominations</button>
              <button data-nav="/admin/withdrawals" class="btn btn-secondary btn-sm text-xs">↩️ Withdrawals</button>
              <button data-nav="/admin/publish" class="btn btn-primary btn-sm text-xs font-bold shadow-md">📢 Publish Final List</button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Admin Real-Time Status & Live Publication Control Banner -->
      <div class="glass p-4 rounded-2xl border ${isPublic ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-amber-500/40 bg-amber-500/10'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div class="flex items-start sm:items-center gap-3">
          <span class="text-3xl">${isPublic ? '🌐' : '👁️‍🗨️'}</span>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-sm uppercase tracking-wider">${isPublic ? 'Results are Publicly Live' : 'Admin Live Monitoring Mode'}</span>
              <span class="badge ${isPublic ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'} text-[10px] font-bold">
                ${isPublic ? '📢 VISIBLE TO STUDENTS' : '🔒 HIDDEN FROM STUDENTS • ADMIN LIVE ONLY'}
              </span>
            </div>
            <p class="text-slate-300 text-xs mt-1">
              ${isPublic ? 'All students and electors can currently view live vote counts and winners on the public portal.' : 'You can see all votes live as entries are recorded. Public visitors see "Counting in Progress" until you click Publish.'}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button id="btnPublishBanner" class="btn btn-sm ${isPublic ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'btn-primary'} font-bold shadow-lg flex items-center gap-1.5" title="Action: ${isPublic ? 'Hides election results from public portal view.' : 'Publishes final verified election results to the public portal.'}&#10;Prerequisite: Verify all round counts and finalize declarations.">
            <span>${isPublic ? '🔒' : '📢'}</span> ${isPublic ? 'Hide from Public' : 'Push Live to Public'}
          </button>
        </div>
      </div>

      <!-- Control Panels: Lock/Freeze, Live Counting, and Public Visibility -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 rounded-xl border ${isCountingActive ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-500/10 border-slate-500/30'} flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${isCountingActive ? '🗳️' : '⏳'}</span>
            <div>
              <div class="font-bold text-sm text-white">${isCountingActive ? 'Counting: Active' : 'Counting: Inactive'}</div>
              <div class="text-xs text-slate-400">${isCountingActive ? 'Public sees "Counting in Progress"' : 'Public sees "Counting Not Started"'}</div>
            </div>
          </div>
          <button id="btnToggleCounting" class="btn btn-sm ${isCountingActive ? 'bg-rose-500/80 hover:bg-rose-600 text-white font-bold' : 'bg-amber-500 hover:bg-amber-600 text-black font-bold'}" title="Action: ${isCountingActive ? 'Deactivates counting status mode.' : 'Marks counting active and informs public portal counting is underway.'}&#10;Prerequisite: Polling concluded and ballot boxes received at counting hall.">
            ${isCountingActive ? '⏸️ Stop Counting' : '⚡ Set Counting Active'}
          </button>
        </div>

        <div class="p-4 rounded-xl border ${isLocked ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'} flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${isLocked ? '🔒' : '🔓'}</span>
            <div>
              <div class="font-bold text-sm text-white">${isLocked ? 'Results: Locked & Frozen' : 'Results: Unlocked'}</div>
              <div class="text-xs text-slate-400">${isLocked ? 'Vote entry blocked' : 'Vote entry portal open'}</div>
            </div>
          </div>
          <button id="btnToggleLock" class="btn btn-sm ${isLocked ? 'btn-secondary' : 'bg-amber-500 hover:bg-amber-600 text-black font-bold'}" title="Action: ${isLocked ? 'Unlocks vote entry portal for further additions or corrections.' : 'Freezes and locks all vote entries against edits.'}&#10;Prerequisite: Verify all counting rounds against Form 7 tabulation sheets.">
            ${isLocked ? '🔓 Unlock' : '🔒 Freeze / Lock'}
          </button>
        </div>

        <div class="p-4 rounded-xl border ${isPublic ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-500/10 border-slate-500/30'} flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${isPublic ? '🌐' : '👁️‍🗨️'}</span>
            <div>
              <div class="font-bold text-sm text-white">${isPublic ? 'Public View: Live' : 'Public View: Hidden'}</div>
              <div class="text-xs text-slate-400">${isPublic ? 'Results visible to everyone' : 'Only admin sees live counts'}</div>
            </div>
          </div>
          <button id="btnTogglePublic" class="btn btn-sm ${isPublic ? 'bg-rose-500/80 hover:bg-rose-600 text-white font-bold' : 'btn-success font-bold'}" title="Action: ${isPublic ? 'Hides candidate scores and winner declarations from public.' : 'Broadcasts results and winner declarations to public portal.'}&#10;Prerequisite: Returning Officer approval of final count.">
            ${isPublic ? '👁️‍🗨️ Hide' : '📢 Publish'}
          </button>
        </div>
      </div>

      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-xl font-bold text-white tracking-tight">Vote Counting Overview</h2>
            ${isOffline ? `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <span class="w-2 h-2 rounded-full bg-amber-400"></span> Offline Mode (IndexedDB)
              </span>
            ` : `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Admin Live Stream
              </span>
            `}
          </div>
          <p class="text-slate-400 text-sm mt-0.5">Real-time tally of counting matrix entries and leading candidates.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2.5">
          ${!isOffline ? `
            <button id="btnToggleAutoRefresh" class="btn btn-secondary px-3.5 text-xs flex items-center gap-1.5 font-mono" title="Action: Toggles automatic background polling (every 4 seconds) on or off.">
              <span>${isLivePolling ? '🟢' : '⏸️'}</span> Live Polling: ${isLivePolling ? 'ON (4s)' : 'PAUSED'}
            </button>
            <button id="btnAdminRefreshResults" class="btn btn-secondary px-3 text-xs flex items-center gap-1.5" title="Action: Immediately re-fetches latest vote records and updates margin calculations.">
              <span>🔄</span> Refresh
            </button>
          ` : ''}
          <button id="btnResultsExportBackup" class="btn btn-secondary px-3 text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10" title="Action: Downloads full JSON backup file containing all counting entries and timestamps.&#10;Prerequisite: Save to external USB drive for audit safety.">
            <span>📥</span> Backup (JSON)
          </button>
          <button id="btnResultsExportCSV" class="btn btn-secondary px-3 text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10" title="Action: Exports a comprehensive CSV spreadsheet of candidate scores and margins.">
            <span>📊</span> CSV
          </button>
          <button id="btnOpenStandingsModal" class="btn btn-secondary px-3 text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10" title="Confidential: View panel standings modal split by General, Reps, and Associations">
            <span>📊</span> Standings
          </button>
          <button id="btnOpenPanelSetup" class="btn btn-secondary px-3 text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10" title="Confidential: Assign candidate colors">
            <span>🎨</span> Colors
          </button>
          <a href="#/trends" target="_blank" class="btn btn-secondary px-3.5 text-xs flex items-center gap-1.5 font-bold text-sky-300 border-sky-500/30 hover:bg-sky-500/10" title="Action: Opens projector-friendly trends and live declaration screen in a new window.">
            <span>🎯</span> Trends Screen
          </a>
          <button id="btnPrintOfficial" class="btn btn-primary px-5 text-xs flex items-center gap-1.5 font-bold shadow-lg" title="Action: Generates official University Form 8 Declaration of Results printable sheet.&#10;Prerequisite: Ensure all post counts are verified and finalized.">
            <span>🖨️</span> Print Official Result Sheet
          </button>
        </div>
      </div>


      ${candidates.length === 0 ? `
        <div class="glass p-12 rounded-3xl border border-white/10 text-center max-w-xl mx-auto shadow-xl page-enter">
          <div class="text-5xl mb-4">📋</div>
          <h3 class="text-xl font-bold text-white mb-2">Final Candidate Roster Pending</h3>
          <p class="text-slate-400 text-sm leading-relaxed mb-6">
            No finalized contesting candidates to display. Once nominations are scrutinized in <strong>Admin → Verify Nominations</strong> and the <strong>Final List of Contesting Candidates</strong> is published in <strong>Admin → Publish Lists</strong>, the candidate roster and results will appear here.
          </p>
          <div class="flex justify-center gap-3">
            <button data-nav="/admin/verify" class="btn btn-secondary btn-sm">1. Verify Nominations</button>
            <button data-nav="/admin/publish" class="btn btn-primary btn-sm">2. Publish Final List</button>
          </div>
        </div>
      ` : `
        <div class="grid grid-cols-1 gap-6">
          ${postResults.map(res => {
            const isUUC = res.post.toUpperCase().includes('UUC') || res.post.toUpperCase().includes('UNIVERSITY');
            const seats = isUUC ? 2 : 1;
            
            // Calculate Lead
            let leadThreshold = 0;
            if (res.type === 'election' && res.candidates.length > seats) {
              leadThreshold = res.candidates[seats].votes;
            }

            return `
              <div class="glass rounded-2xl overflow-hidden border border-white/5 page-enter shadow-lg">
                <div class="px-6 py-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                  <h4 class="font-bold text-indigo-400 uppercase tracking-wider text-sm">${esc(res.post)}</h4>
                  ${res.type === 'unanimous' ? 
                    `<span class="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ELECTED UNANIMOUSLY</span>` : 
                    (res.type === 'draft-single' ?
                      `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">1 VALID NOMINEE • AWAITING FINAL LIST</span>` :
                      `<span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">${res.isTie ? '⚖️ TIE DETECTED' : (isFinalPublished ? 'CONTESTED ELECTION' : 'CONTESTED (DRAFT PREVIEW)')}</span>`
                    )
                  }
                </div>
                <div class="p-6">
                  ${res.type === 'no-candidates' ? 
                    `<p class="text-slate-500 italic text-sm text-center py-4">No valid nominations received for this post.</p>` :
                    `
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="text-slate-500 text-[10px] uppercase tracking-widest text-left border-b border-white/5">
                          <th class="pb-3 font-bold">Candidate Name</th>
                          <th class="pb-3 font-bold text-center">Class</th>
                          <th class="pb-3 font-bold text-right">Votes</th>
                          <th class="pb-3 font-bold text-center w-24">Status</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-white/5">
                        ${res.candidates.map((c, i) => {
                          const isLeading = i < seats && c.votes > 0;
                          const lead = isLeading ? (c.votes - leadThreshold) : 0;
                          
                          return `
                            <tr class="${isLeading ? 'bg-white/[0.02]' : ''}">
                              <td class="py-4">
                                <div class="flex items-center gap-2 flex-wrap">
                                  <span class="font-bold text-white">${esc(c.candidateName)}</span>
                                  ${c.candidateSerial ? `<span class="badge bg-indigo-500/20 text-indigo-300 font-mono text-[9px]">Sl. #${esc(c.candidateSerial)}</span>` : ''}
                                  ${lead > 0 ? `<span class="bg-green-500/20 text-green-400 text-[9px] px-1.5 py-0.5 rounded font-black border border-green-500/30">LEAD: ${lead}</span>` : ''}
                                </div>
                              </td>
                              <td class="py-4 text-slate-400 text-center text-[11px]">${esc(c.candidateClass)}</td>
                              <td class="py-4 text-right font-mono text-lg ${isLeading ? 'text-amber-400' : 'text-slate-300'}">
                                ${(res.type === 'unanimous' || res.type === 'draft-single') ? '—' : c.votes}
                              </td>
                              <td class="py-4 text-center">
                                ${res.type === 'draft-single' ? 
                                  `<span class="text-amber-400 text-[10px] font-bold border border-amber-400/30 px-2 py-0.5 rounded bg-amber-500/10 tracking-wider">AWAITING FINAL LIST</span>` :
                                  (isLeading ? 
                                    (isLocked ? 
                                      `<span class="text-emerald-400 text-[10px] font-black border border-emerald-400/30 px-2 py-0.5 rounded bg-emerald-500/10 tracking-wider">ELECTED</span>` : 
                                      (isFinalPublished ? 
                                        `<span class="text-amber-400 text-[10px] font-black border border-amber-400/30 px-2 py-0.5 rounded bg-amber-500/10 tracking-wider">LEADING</span>` :
                                        `<span class="text-slate-400 text-[10px] font-bold border border-white/10 px-2 py-0.5 rounded bg-white/5 tracking-wider">DRAFT TALLY</span>`
                                      )
                                    ) : ''
                                  )
                                }
                              </td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>

                    ${res.type === 'election' ? `
                      <div class="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                        <div class="flex justify-between items-center py-2 px-3 bg-white/5 rounded border border-white/5 text-[11px]">
                          <span class="text-slate-500 uppercase tracking-widest font-bold">NOTA</span>
                          <span class="text-white font-bold">${res.nota}</span>
                        </div>
                        <div class="flex justify-between items-center py-2 px-3 bg-white/5 rounded border border-white/5 text-[11px]">
                          <span class="text-slate-500 uppercase tracking-widest font-bold">Invalid</span>
                          <span class="text-red-400/70 font-bold">${res.invalid}</span>
                        </div>
                        <div class="flex justify-between items-center py-2 px-3 bg-indigo-500/10 rounded border border-indigo-500/20 text-[11px]">
                          <span class="text-indigo-300 uppercase tracking-widest font-bold">Valid Votes</span>
                          <span class="text-white font-black text-sm">${res.totalVotes - res.invalid}</span>
                        </div>
                        <div class="flex justify-between items-center py-2 px-3 bg-purple-500/10 rounded border border-purple-500/20 text-[11px]">
                          <span class="text-purple-300 uppercase tracking-widest font-bold">Grand Total</span>
                          <span class="text-white font-black text-sm">${res.totalVotes}</span>
                        </div>
                      </div>
                    ` : ''}
                    `
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <!-- Modal: Confidential Panel Standings (Inconspicuous, Hidable Modal) -->
    <div id="modalPanelStandings" class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;">
      <div class="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-slate-200 my-auto" style="position: relative; z-index: 10000; max-height: 88vh;">
          <!-- Modal Header -->
          <div class="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-2.5">
              <span class="text-lg">📊</span>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-white text-sm tracking-wide">Panel Standings</h3>
                  <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">CONFIDENTIAL</span>
                </div>
                <p class="text-[11px] text-slate-400 mt-0.5">Split by General, Representatives, and Associations.</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button id="btnStandingsOpenSetup" class="btn btn-secondary btn-xs text-[11px] px-2.5 py-1 text-slate-300 border-slate-700 hover:text-white bg-slate-800 hover:bg-slate-700" title="Manage candidate color tags">
                <span>🎨</span> Colors
              </button>
              <button id="btnCloseStandingsModal" class="btn btn-secondary btn-xs text-slate-400 hover:text-white px-2.5 py-1 text-sm border-slate-700 hover:bg-slate-800" title="Close (ESC)">
                ✕
              </button>
            </div>
          </div>

          <!-- Modal Body (Scrollable) -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scroll bg-slate-900">
            ${!splitStandings.hasAssignedColors ? `
              <div class="text-center py-8 px-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
                <div class="text-3xl">🎨</div>
                <div class="text-sm font-bold text-white">No Candidate Colors Assigned</div>
                <p class="text-xs text-slate-400 max-w-sm mx-auto">
                  Tag candidates by color on this Admin PC to track panel leads across posts.
                </p>
                <button id="btnPromptSetColors" class="btn btn-primary btn-sm text-xs font-bold">
                  Set Candidate Colors
                </button>
              </div>
            ` : `
              <!-- 1. Category Summary Numbers Table -->
              <div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
                <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Seat Count Summary</span>
                  <span class="text-[10px] font-mono text-slate-500">${isLocked ? 'Final Declared' : 'Leading / Won'}</span>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-xs text-left">
                    <thead>
                      <tr class="text-slate-400 border-b border-slate-800/80 text-[10px] uppercase font-mono">
                        <th class="py-1.5 pr-2">Category</th>
                        ${splitStandings.activePanels.map(p => `
                          <th class="py-1.5 px-2 text-center">
                            <span class="inline-flex items-center gap-1">
                              <span class="w-2 h-2 rounded-full ${p.dot}"></span>
                              <span>${esc(p.displayName)}</span>
                            </span>
                          </th>
                        `).join('')}
                        <th class="py-1.5 px-2 text-center text-slate-500">Others</th>
                        <th class="py-1.5 pl-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800/60 font-mono">
                      <tr>
                        <td class="py-2 pr-2 font-sans font-medium text-white flex items-center gap-1.5">
                          <span class="text-indigo-400">🏛️</span> General
                        </td>
                        ${splitStandings.activePanels.map(p => `
                          <td class="py-2 px-2 text-center font-bold ${splitStandings.categories.General.counts[p.id] > 0 ? p.text : 'text-slate-600'}">
                            ${splitStandings.categories.General.counts[p.id] || 0}
                          </td>
                        `).join('')}
                        <td class="py-2 px-2 text-center text-slate-500">
                          ${splitStandings.categories.General.counts.unassigned || 0}
                        </td>
                        <td class="py-2 pl-2 text-right font-bold text-white">
                          ${splitStandings.categories.General.counts.total || 0}
                        </td>
                      </tr>
                      <tr>
                        <td class="py-2 pr-2 font-sans font-medium text-white flex items-center gap-1.5">
                          <span class="text-sky-400">🎓</span> Representatives
                        </td>
                        ${splitStandings.activePanels.map(p => `
                          <td class="py-2 px-2 text-center font-bold ${splitStandings.categories.Reps.counts[p.id] > 0 ? p.text : 'text-slate-600'}">
                            ${splitStandings.categories.Reps.counts[p.id] || 0}
                          </td>
                        `).join('')}
                        <td class="py-2 px-2 text-center text-slate-500">
                          ${splitStandings.categories.Reps.counts.unassigned || 0}
                        </td>
                        <td class="py-2 pl-2 text-right font-bold text-white">
                          ${splitStandings.categories.Reps.counts.total || 0}
                        </td>
                      </tr>
                      <tr>
                        <td class="py-2 pr-2 font-sans font-medium text-white flex items-center gap-1.5">
                          <span class="text-amber-400">🏢</span> Associations
                        </td>
                        ${splitStandings.activePanels.map(p => `
                          <td class="py-2 px-2 text-center font-bold ${splitStandings.categories.Associations.counts[p.id] > 0 ? p.text : 'text-slate-600'}">
                            ${splitStandings.categories.Associations.counts[p.id] || 0}
                          </td>
                        `).join('')}
                        <td class="py-2 px-2 text-center text-slate-500">
                          ${splitStandings.categories.Associations.counts.unassigned || 0}
                        </td>
                        <td class="py-2 pl-2 text-right font-bold text-white">
                          ${splitStandings.categories.Associations.counts.total || 0}
                        </td>
                      </tr>
                      <tr class="font-bold bg-white/[0.03] border-t border-slate-700">
                        <td class="py-2 pr-2 font-sans text-indigo-300">
                          Total Seats
                        </td>
                        ${splitStandings.activePanels.map(p => `
                          <td class="py-2 px-2 text-center text-sm ${p.text}">
                            ${splitStandings.grandTotals[p.id] || 0}
                          </td>
                        `).join('')}
                        <td class="py-2 px-2 text-center text-slate-400">
                          ${splitStandings.grandTotals.unassigned || 0}
                        </td>
                        <td class="py-2 pl-2 text-right text-sm text-white">
                          ${splitStandings.grandTotals.total || 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- 2. Which Panel Leads Which Posts (Split View) -->
              <div class="space-y-4">
                <!-- General Posts -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span class="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <span>🏛️</span> General Posts (${splitStandings.categories.General.posts.length})
                    </span>
                    <span class="text-[10px] text-slate-500 font-mono">Major Executive</span>
                  </div>
                  ${splitStandings.categories.General.posts.length === 0 ? `
                    <div class="text-[11px] text-slate-500 italic py-1">No general posts found.</div>
                  ` : `
                    <div class="space-y-1">
                      ${splitStandings.categories.General.posts.map(p => `
                        <div class="flex items-center justify-between py-1.5 px-2.5 rounded bg-slate-950/50 border border-slate-800/60 text-xs">
                          <div class="min-w-0 flex items-center gap-2">
                            <span class="text-slate-400 font-mono text-[11px] shrink-0">${esc(p.postName)}:</span>
                            <span class="text-white font-medium truncate">${esc(p.candidateName)}</span>
                          </div>
                          <div class="flex items-center gap-2 shrink-0 ml-2">
                            ${!p.noCandidate ? `
                              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${p.panelBadge}">
                                <span class="w-1.5 h-1.5 rounded-full ${p.panelDot}"></span>
                                <span>${esc(p.panelName)}</span>
                              </span>
                              <span class="text-[11px] font-mono ${p.isWon ? 'text-emerald-400 font-bold' : (p.isLeading ? 'text-amber-300' : 'text-slate-400')}">
                                ${esc(p.statusText)}
                              </span>
                            ` : `
                              <span class="text-slate-500 italic text-[11px]">No candidate</span>
                            `}
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  `}
                </div>

                <!-- Representatives -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span class="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                      <span>🎓</span> Representatives (${splitStandings.categories.Reps.posts.length})
                    </span>
                    <span class="text-[10px] text-slate-500 font-mono">Class / Year Reps</span>
                  </div>
                  ${splitStandings.categories.Reps.posts.length === 0 ? `
                    <div class="text-[11px] text-slate-500 italic py-1">No representative posts found.</div>
                  ` : `
                    <div class="space-y-1">
                      ${splitStandings.categories.Reps.posts.map(p => `
                        <div class="flex items-center justify-between py-1.5 px-2.5 rounded bg-slate-950/50 border border-slate-800/60 text-xs">
                          <div class="min-w-0 flex items-center gap-2">
                            <span class="text-slate-400 font-mono text-[11px] shrink-0">${esc(p.postName)}:</span>
                            <span class="text-white font-medium truncate">${esc(p.candidateName)}</span>
                          </div>
                          <div class="flex items-center gap-2 shrink-0 ml-2">
                            ${!p.noCandidate ? `
                              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${p.panelBadge}">
                                <span class="w-1.5 h-1.5 rounded-full ${p.panelDot}"></span>
                                <span>${esc(p.panelName)}</span>
                              </span>
                              <span class="text-[11px] font-mono ${p.isWon ? 'text-emerald-400 font-bold' : (p.isLeading ? 'text-amber-300' : 'text-slate-400')}">
                                ${esc(p.statusText)}
                              </span>
                            ` : `
                              <span class="text-slate-500 italic text-[11px]">No candidate</span>
                            `}
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  `}
                </div>

                <!-- Department Associations -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span class="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <span>🏢</span> Department Associations (${splitStandings.categories.Associations.posts.length})
                    </span>
                    <span class="text-[10px] text-slate-500 font-mono">Association Secretaries</span>
                  </div>
                  ${splitStandings.categories.Associations.posts.length === 0 ? `
                    <div class="text-[11px] text-slate-500 italic py-1">No association posts found.</div>
                  ` : `
                    <div class="space-y-1">
                      ${splitStandings.categories.Associations.posts.map(p => `
                        <div class="flex items-center justify-between py-1.5 px-2.5 rounded bg-slate-950/50 border border-slate-800/60 text-xs">
                          <div class="min-w-0 flex items-center gap-2">
                            <span class="text-slate-400 font-mono text-[11px] shrink-0">${esc(p.postName)}:</span>
                            <span class="text-white font-medium truncate">${esc(p.candidateName)}</span>
                          </div>
                          <div class="flex items-center gap-2 shrink-0 ml-2">
                            ${!p.noCandidate ? `
                              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${p.panelBadge}">
                                <span class="w-1.5 h-1.5 rounded-full ${p.panelDot}"></span>
                                <span>${esc(p.panelName)}</span>
                              </span>
                              <span class="text-[11px] font-mono ${p.isWon ? 'text-emerald-400 font-bold' : (p.isLeading ? 'text-amber-300' : 'text-slate-400')}">
                                ${esc(p.statusText)}
                              </span>
                            ` : `
                              <span class="text-slate-500 italic text-[11px]">No candidate</span>
                            `}
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  `}
                </div>
              </div>
            `}
          </div>

          <!-- Modal Footer -->
          <div class="px-5 py-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs shrink-0">
            <span class="text-[11px] text-slate-500">Press ESC or click outside to hide.</span>
            <button id="btnHideStandingsModal" class="btn btn-secondary btn-xs px-3 py-1 text-slate-300 hover:text-white border-slate-700 bg-slate-800 hover:bg-slate-700">
              Hide (ESC)
            </button>
          </div>
        </div>
      </div>

      <!-- Modal: Assign Candidate Panel Colors -->
      <div id="modalPanelColors" class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;">
        <div class="relative z-10 w-full max-w-3xl rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl flex flex-col h-[650px] max-h-[92vh] overflow-hidden my-auto" style="position: relative; z-index: 10000; max-height: 92vh;">
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl shrink-0">🎨</div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-white text-base">Set Candidate Colors</h3>
                  <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">CONFIDENTIAL</span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">Strictly saved on this Admin PC browser. Never visible to students or in print.</p>
              </div>
            </div>
            <button id="btnClosePanelModal" class="btn btn-secondary btn-xs text-slate-400 hover:text-white px-2.5 py-1 text-sm rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors">
              ✕
            </button>
          </div>

          <!-- Search & Filter Controls -->
          <div class="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <div class="relative w-full sm:flex-1">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input type="text" id="inputFilterPanelCand" placeholder="Filter by candidate or post name..." class="input input-sm w-full pl-8 text-xs bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
            </div>
            <button id="btnToggleCustomLabels" type="button" class="btn btn-secondary btn-sm text-xs shrink-0 flex items-center gap-1.5 text-slate-200 border-slate-700 bg-slate-800 hover:bg-slate-700">
              <span>🏷️</span> Rename Panels (Optional)
            </button>
          </div>

          <!-- Collapsible Custom Names Section -->
          <div id="sectionCustomLabels" class="p-4 border-b border-slate-800 bg-slate-950/80 hidden shrink-0">
            <div class="text-xs font-bold text-slate-300 mb-2">Customize Panel Aliases (e.g. Front A, Alliance B):</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              ${PANEL_PALETTE.map(p => `
                <div class="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span class="w-3.5 h-3.5 rounded-full ${p.dot} shrink-0 shadow-sm"></span>
                  <input type="text" data-color-label-id="${p.id}" value="${esc(panelData.labels?.[p.id] || '')}" placeholder="${p.name} Panel" class="input input-xs bg-slate-950 border border-slate-700 text-white text-xs w-full focus:ring-0 p-1 rounded">
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Candidate List by Post (Scrollable) -->
          <div id="modalPanelCandList" class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scroll bg-slate-900">
            ${(() => {
              // Collect all unique post names across configured posts and candidate records
              const postMap = new Map();
              sortedPosts.forEach(p => {
                const pName = String(p.post || '').trim();
                if (pName) postMap.set(pName.toLowerCase(), pName);
              });
              candidates.forEach(c => {
                const cPost = String(c.post || '').trim();
                if (cPost && !postMap.has(cPost.toLowerCase())) {
                  postMap.set(cPost.toLowerCase(), cPost);
                }
              });

              let renderedAnyCandidate = false;
              const groupsHtml = Array.from(postMap.entries()).map(([postKeyLower, postOriginalName]) => {
                const postCandidates = candidates.filter(c => String(c.post || '').trim().toLowerCase() === postKeyLower);
                if (postCandidates.length === 0) return '';
                renderedAnyCandidate = true;

                return `
                  <div class="panel-post-group bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm" data-post-name="${esc(postKeyLower)}">
                    <div class="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></span>
                        <h4 class="font-bold text-indigo-300 text-xs uppercase tracking-wider">${esc(postOriginalName)}</h4>
                      </div>
                      <span class="text-[11px] text-slate-400 font-mono bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">${postCandidates.length} candidate${postCandidates.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="space-y-2">
                      ${postCandidates.map(c => {
                        const candKey = c.id != null && String(c.id).trim() !== '' ? String(c.id).trim() : `${c.candidateName}_${c.post}`;
                        const curColorId = panelData.candidates?.[candKey] || 
                                           (c.id != null ? panelData.candidates?.[String(c.id)] : null) || 
                                           panelData.candidates?.[`${c.candidateName}_${c.post}`] || 
                                           panelData.candidates?.[c.candidateName] || 'none';
                        return `
                          <div class="panel-cand-item p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3" 
                               data-cand-id="${esc(c.id != null ? String(c.id) : '')}"
                               data-cand-name="${esc(c.candidateName || '')}"
                               data-cand-name-post="${esc(`${c.candidateName}_${c.post}`)}"
                               data-cand-search="${esc(((c.candidateName || '') + ' ' + (c.candidateClass || '') + ' ' + (c.candidateDept || '') + ' ' + postOriginalName).toLowerCase())}">
                            <div class="min-w-0">
                              <div class="font-bold text-white text-sm truncate flex items-center gap-2">
                                <span>${esc(c.candidateName)}</span>
                                ${c.candidateSerial ? `<span class="badge bg-indigo-500/20 text-indigo-300 font-mono text-[9px] px-1.5 py-0.5 border border-indigo-500/30">Sl. #${esc(c.candidateSerial)}</span>` : ''}
                              </div>
                              <div class="text-xs text-slate-400 truncate mt-0.5">${esc(c.candidateClass || c.candidateDept || '')}</div>
                            </div>

                            <!-- Color Swatches Row -->
                            <div class="flex items-center gap-1.5 flex-wrap shrink-0">
                              ${PANEL_PALETTE.map(pal => `
                                <button type="button" class="swatch-btn w-7 h-7 rounded-full ${pal.dot} transition-all duration-150 flex items-center justify-center text-xs text-white font-bold cursor-pointer shadow-sm ${curColorId === pal.id ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-65 hover:opacity-100 hover:scale-105'}" data-cand-key="${esc(candKey)}" data-color="${pal.id}" title="${pal.name} Panel">
                                  ${curColorId === pal.id ? '✓' : ''}
                                </button>
                              `).join('')}
                              <button type="button" class="swatch-btn px-2.5 h-7 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-150 cursor-pointer ${curColorId === 'none' || !curColorId ? 'ring-2 ring-white/50 text-white font-bold bg-slate-700' : 'opacity-65 hover:opacity-100'}" data-cand-key="${esc(candKey)}" data-color="none" title="Clear / No Panel">
                                None
                              </button>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `;
              }).join('');

              if (!renderedAnyCandidate) {
                return `
                  <div class="text-center py-16 px-6 bg-slate-950/40 rounded-2xl border border-slate-800/80 my-auto">
                    <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-3xl flex items-center justify-center mx-auto mb-3">
                      📋
                    </div>
                    <h4 class="font-bold text-white text-base">No Contesting Candidates Found Yet</h4>
                    <p class="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                      Nominations have not been entered or scrutinized in this election yet. Once candidate nominations are submitted and validated, you can assign them panel colors right here.
                    </p>
                  </div>
                `;
              }
              return groupsHtml;
            })()}
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button id="btnModalClearAll" type="button" class="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer font-medium">
              <span>🗑️</span> Clear All Colors
            </button>
            <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button id="btnCancelPanelModal" type="button" class="btn btn-secondary btn-sm text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300">
                Cancel
              </button>
              <button id="btnSavePanelColors" type="button" class="btn btn-primary btn-sm text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-1.5">
                <span>💾</span> Save & Apply Tally
              </button>
            </div>
          </div>
        </div>
      </div>
  `;

  main.querySelector('#btnResultsExportBackup')?.addEventListener('click', async () => {
    try {
      const filename = await downloadLocalBackupJSON(shortName);
      showToast(`Results backup downloaded: ${filename}`, 'success');
    } catch (err) {
      showToast(`Backup failed: ${err.message}`, 'error');
    }
  });

  main.querySelector('#btnResultsExportCSV')?.addEventListener('click', async () => {
    try {
      const filename = await downloadResultsCSV(shortName);
      showToast(`Results spreadsheet downloaded: ${filename}`, 'success');
    } catch (err) {
      showToast(`CSV export failed: ${err.message}`, 'error');
    }
  });

  main.querySelector('#btnPrintOfficial').addEventListener('click', () => {
    if (!isFinalPublished) {
      if (!confirm('⚠️ Notice: The Final List of Contesting Candidates has NOT been published yet.\n\nAny printed result sheet will be marked as an unofficial DRAFT. Do you wish to proceed?')) {
        return;
      }
    }
    const printHtml = `
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; padding: 20px; position: relative; }
        .official-sheet { max-w: 850px; margin: 0 auto; padding: 40px; border: 1px solid #ddd; background: white; }
        .watermark-global {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 500px;
          height: 500px;
          opacity: 0.08;
          filter: grayscale(100%);
          pointer-events: none;
          z-index: -1;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
        }
        .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 25px; }
        .header h1 { margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 0.5px; color: #000; }
        .header h2 { margin: 5px 0 0 0; font-size: 15px; color: #000; font-weight: 600; text-transform: uppercase; }
        .post-group { page-break-inside: avoid !important; break-inside: avoid !important; margin-bottom: 14px !important; display: block !important; }
        .result-table { width: 100%; border-collapse: collapse; page-break-inside: avoid !important; break-inside: avoid !important; }
        .result-table th, .result-table td { border: 1px solid #000; padding: 7px 9px; font-size: 12px; color: #000; }
        .result-table th { background: #f2f2f2; text-align: left; text-transform: uppercase; font-size: 11px; }
        .post-header { background: #eaeaea; font-weight: bold; font-size: 13px; text-transform: uppercase; color: #000; padding: 9px 10px; border-bottom: 2px solid #000; }
        .winner-row { background: #ffffff !important; font-weight: bold; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-start; page-break-inside: avoid !important; break-inside: avoid !important; }
        .sig-box { width: 250px; border-top: 1px solid #000; text-align: center; padding-top: 8px; font-size: 12px; font-weight: bold; color: #000; margin-top: 30px; }
        @page {
          margin: 12mm 15mm 16mm 15mm;
          @bottom-right {
            content: "Page " counter(page) " of " counter(pages);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 8.5pt;
            font-weight: 600;
            color: #000000;
          }
          @bottom-left {
            content: "${esc(collegeName)} — Official Results Declaration ${esc(year)}";
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 8pt;
            color: #000000;
          }
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000000 !important;
            border-color: #000000 !important;
          }
          body { padding: 0; }
          .official-sheet { border: none; width: 100%; max-width: 100%; padding: 0; }
          .post-group { page-break-inside: avoid !important; break-inside: avoid !important; }
          .result-table { page-break-inside: avoid !important; break-inside: avoid !important; }
          thead { display: table-header-group; }
          thead tr { page-break-after: avoid !important; break-after: avoid !important; }
          tr { page-break-inside: avoid !important; break-inside: avoid !important; }
        }
      </style>
      <div class="official-sheet">
        <div class="header">
          ${!isFinalPublished ? `
            <div style="background:#f9f9f9;border:1.5px solid #000;padding:8px 12px;text-align:center;font-weight:bold;color:#000;font-size:12px;margin-bottom:15px;text-transform:uppercase;letter-spacing:0.5px;">
              ⚠️ DRAFT RESULT PREVIEW — AWAITING OFFICIAL PUBLICATION OF FINAL CANDIDATES LIST
            </div>
          ` : ''}
          ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:60px;max-width:140px;margin:0 auto 8px auto;display:block;object-fit:contain;filter:grayscale(100%)" alt="College Logo">` : ''}
          <h2>${esc(collegeName)}</h2>
          <h1>College Union Election ${year}</h1>
          <div style="font-size: 18px; margin-top: 15px; font-weight: 900; text-decoration: underline; color: #000;">
            ${isFinalPublished ? 'OFFICIAL RESULT NOTIFICATION' : 'DRAFT RESULT NOTIFICATION (PROVISIONAL)'}
          </div>
        </div>

        <p style="font-size: 13.5px; margin-bottom: 22px; text-align: justify; color: #000;">
          ${isFinalPublished ? `
            The following candidates are hereby declared to have been duly elected to the respective offices of the College Union for the academic year ${year}, 
            based on the counting of votes held on ${new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'})}.
          ` : `
            PROVISIONAL DRAFT: The following is an interim compilation of votes and scrutinized candidate nominations. 
            Official result declaration and uncontested winner notifications are subject to the publication of the Final List of Contesting Candidates by the Returning Officer.
          `}
        </p>

        <div class="results-container">
          ${postResults.map(res => {
            if (res.type === 'no-candidates') return '';
            return `
              <div class="post-group">
                <table class="result-table">
                  <thead>
                    <tr style="page-break-after:avoid;break-after:avoid">
                      <th colspan="4" class="post-header">
                        POST: ${esc(res.post)}
                      </th>
                    </tr>
                    <tr style="page-break-after:avoid;break-after:avoid">
                      <th style="width: 10%; text-align: center;">Sl. No.</th>
                      <th style="width: 45%;">Name of Candidate</th>
                      <th style="text-align: center; width: 15%;">Votes Secured</th>
                      <th style="width: 30%;">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${res.candidates.map((c, idx) => {
                      const isWinner = res.winner && res.winner.id === c.id;
                      return `
                        <tr class="${isWinner ? 'winner-row' : ''}">
                          <td style="text-align: center; color: #000; font-size: 12px;">${idx + 1}</td>
                          <td style="font-weight: ${isWinner ? 'bold' : 'normal'}; font-size: 13px; color: #000;">
                            ${esc(c.candidateName)} ${c.candidateSerial ? `<span style="font-size: 11px; font-weight: normal; color: #333;">(Roll Sl. #${esc(c.candidateSerial)})</span>` : ''}
                          </td>
                          <td style="text-align: center; font-weight: bold; font-size: 13px; color: #000;">${res.type === 'unanimous' ? '—' : (c.votes || 0)}</td>
                          <td style="font-size: 11.5px; font-weight: bold; color: #000;">
                            ${isWinner ? (res.type === 'unanimous' ? 'ELECTED UNANIMOUSLY' : '✓ ELECTED') : (res.type === 'draft-single' ? 'PROVISIONAL (FINAL LIST PENDING)' : '')}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `;
          }).join('')}
        </div>

        <div class="footer">
          <div style="font-size: 13px;">
            <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
            <p><strong>Place:</strong> ${esc(collegePlace)}</p>
          </div>
          <div class="sig-box">
            RETURNING OFFICER<br>
            <span style="font-weight: normal; font-size: 11px;">College Union Election ${year}</span>
          </div>
        </div>
      </div>
    `;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      showToast('Popup blocked! Please allow popups to print.', 'error');
      return;
    }
    printWin.document.write(`
      <html>
        <head><title>Election Results ${year}</title></head>
        <body>
          ${collegeLogo ? `<div class="watermark-global" style="background-image: url('${collegeLogo}');"></div>` : ''}
          ${printHtml}
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
              }, 500);
            });
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  });

  // ── Admin Refresh Results ──────────────────────────────────────────────────
  const btnAdminRefresh = main.querySelector('#btnAdminRefreshResults');
  if (btnAdminRefresh && reloadData) {
    btnAdminRefresh.onclick = async () => {
      btnAdminRefresh.disabled = true;
      btnAdminRefresh.innerHTML = '<span>⏳</span> Refreshing...';
      try {
        await reloadData(true);
        showToast('Election results refreshed with latest counts.', 'success');
      } catch (err) {
        showToast(`Refresh failed: ${err.message}`, 'error');
        btnAdminRefresh.disabled = false;
        btnAdminRefresh.innerHTML = '<span>🔄</span> Refresh Now';
      }
    };
  }

  // ── Auto-Refresh Toggle ────────────────────────────────────────────────────
  const btnAuto = main.querySelector('#btnToggleAutoRefresh');
  if (btnAuto && setLivePolling) {
    btnAuto.onclick = () => {
      const nextVal = !isLivePolling;
      setLivePolling(nextVal);
      showToast(nextVal ? '🟢 Live auto-polling active (updating every 4s).' : '⏸️ Live auto-polling paused.', 'info');
      btnAuto.innerHTML = `<span>${nextVal ? '🟢' : '⏸️'}</span> Live Polling: ${nextVal ? 'ON (4s)' : 'PAUSED'}`;
      if (nextVal && reloadData) reloadData(true);
    };
  }

  // ── Publish / Hide from Top Banner ──────────────────────────────────────────
  const btnTopBanner = main.querySelector('#btnPublishBanner');
  if (btnTopBanner) {
    btnTopBanner.onclick = () => {
      const btnPublic = main.querySelector('#btnTogglePublic');
      if (btnPublic) btnPublic.click();
    };
  }

  // ── Toggle Counting Mode ────────────────────────────────────────────────────
  const btnCounting = main.querySelector('#btnToggleCounting');
  if (btnCounting) {
    btnCounting.onclick = async () => {
      const willActivate = !isCountingActive;
      const msg = willActivate
        ? 'Set Counting Mode Active? Visitors to the public portal will see "Counting in Progress".'
        : 'Set Counting Mode Inactive? Visitors to the public portal will be asked to wait for counting to begin.';
      if (!confirm(msg)) return;

      btnCounting.disabled = true;
      btnCounting.textContent = 'Please wait...';
      try {
        const res = await api.adminToggleCounting(pwd);
        isCountingActive = res.active;
        sets.countingActive = isCountingActive ? 'true' : 'false';
        showToast(isCountingActive ? '⚡ Counting mode active! Public sees "Counting in Progress".' : '⏳ Counting mode inactive. Public asked to wait.', 'success');
        renderResultsUI(main, pwd, posts, candidates, results, schedule, sets, isFinalPublished, reloadData);
      } catch (err) {
        showToast(err.message, 'error');
        btnCounting.disabled = false;
        btnCounting.textContent = isCountingActive ? '⏸️ Stop Counting' : '⚡ Set Counting Active';
      }
    };
  }

  // ── Toggle Lock / Freeze ────────────────────────────────────────────────────
  const btnLock = main.querySelector('#btnToggleLock');
  if (btnLock) {
    btnLock.onclick = async () => {
      const willLock = !isLocked;
      const msg = willLock 
        ? 'Lock and freeze election results? No further vote entries will be allowed.'
        : 'Unlock election results? Vote entries will be re-enabled.';
      if (!confirm(msg)) return;

      btnLock.disabled = true;
      btnLock.textContent = 'Please wait...';
      try {
        const res = await api.adminToggleLockResults(pwd);
        isLocked = res.locked;
        sets.resultsLocked = isLocked ? 'true' : 'false';
        showToast(isLocked ? '🔒 Results locked and frozen.' : '🔓 Results unlocked for editing.', 'success');
        renderResultsUI(main, pwd, posts, candidates, results, schedule, sets, isFinalPublished, reloadData);
      } catch (err) {
        showToast(err.message, 'error');
        btnLock.disabled = false;
        btnLock.textContent = isLocked ? '🔓 Unlock Results' : '🔒 Freeze / Lock';
      }
    };
  }

  // ── Toggle Public Visibility ────────────────────────────────────────────────
  const btnPublic = main.querySelector('#btnTogglePublic');
  if (btnPublic) {
    btnPublic.onclick = async () => {
      const willPublish = !isPublic;
      const msg = willPublish
        ? 'Publish election results to the public portal? Anyone visiting the site will see live results.'
        : 'Hide election results from public view? The public portal will show counting in progress.';
      if (!confirm(msg)) return;

      btnPublic.disabled = true;
      btnPublic.textContent = 'Please wait...';
      try {
        const res = await api.adminTogglePublishResults(pwd);
        isPublic = res.published;
        sets.resultsPublished = isPublic ? 'true' : 'false';
        showToast(isPublic ? '📢 Results published to public portal!' : '👁️‍🗨️ Results hidden from public view.', 'success');
        renderResultsUI(main, pwd, posts, candidates, results, schedule, sets, isFinalPublished, reloadData);
      } catch (err) {
        showToast(err.message, 'error');
        btnPublic.disabled = false;
        btnPublic.textContent = isPublic ? '👁️‍🗨️ Hide Public View' : '📢 Publish to Public';
      }
    };
  }

  // ── Bind Navigation Buttons ────────────────────────────────────────────────
  main.querySelectorAll('[data-nav]').forEach(btn => {
    btn.onclick = () => {
      const target = btn.dataset.nav;
      if (target) router.navigate(target);
    };
  });

  // ── Confidential Panel Modals (Standings & Set Colors) ──────────────────────
  // Check if modals were previously open before this re-render
  const prevStandingsEl = document.getElementById('modalPanelStandings');
  const wasStandingsOpen = prevStandingsEl && !prevStandingsEl.classList.contains('hidden');
  const prevColorsEl = document.getElementById('modalPanelColors');
  const wasColorsOpen = prevColorsEl && !prevColorsEl.classList.contains('hidden');

  // Clean up any existing portaled modal elements in document.body
  document.querySelectorAll('#modalPanelStandings, #modalPanelColors').forEach(el => {
    if (el.parentElement === document.body) el.remove();
  });

  // Portal modals to document.body so they attach directly to viewport window
  // (immune to #adminResultsRoot page-enter transform and #adminMain scroll containment)
  const standingsModal = main.querySelector('#modalPanelStandings');
  if (standingsModal) {
    document.body.appendChild(standingsModal);
    if (wasStandingsOpen) standingsModal.classList.remove('hidden');
  }

  const panelModal = main.querySelector('#modalPanelColors');
  if (panelModal) {
    document.body.appendChild(panelModal);
    if (wasColorsOpen) panelModal.classList.remove('hidden');
  }

  let workingCandidateColors = { ...(panelData.candidates || {}) };

  function openStandingsModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (standingsModal) standingsModal.classList.remove('hidden');
  }

  function closeStandingsModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (standingsModal) standingsModal.classList.add('hidden');
  }

  function openPanelModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    closeStandingsModal();
    if (panelModal) {
      panelModal.classList.remove('hidden');
      const latestData = getConfidentialPanelData();
      workingCandidateColors = { ...(latestData.candidates || {}) };

      // Re-sync all swatch buttons in the modal to reflect current saved state
      panelModal.querySelectorAll('.panel-cand-item').forEach(parentRow => {
        const cId = parentRow.getAttribute('data-cand-id');
        const cName = parentRow.getAttribute('data-cand-name');
        const cNamePost = parentRow.getAttribute('data-cand-name-post');

        parentRow.querySelectorAll('.swatch-btn').forEach(btn => {
          const candKey = btn.getAttribute('data-cand-key');
          const sColor = btn.getAttribute('data-color');
          const curColor = (candKey && workingCandidateColors[candKey]) ||
                           (cId && workingCandidateColors[cId]) ||
                           (cNamePost && workingCandidateColors[cNamePost]) ||
                           (cNamePost && workingCandidateColors[cNamePost.toLowerCase()]) ||
                           (cName && workingCandidateColors[cName]) ||
                           (cName && workingCandidateColors[cName.toLowerCase()]) || 'none';
          const isMatch = (curColor === 'none' && sColor === 'none') || (curColor === sColor);
          if (isMatch) {
            btn.classList.remove('opacity-65');
            btn.classList.add('ring-2', sColor === 'none' ? 'ring-white/50' : 'ring-white', 'scale-110');
            if (sColor !== 'none') btn.textContent = '✓';
          } else {
            btn.classList.add('opacity-65');
            btn.classList.remove('ring-2', 'ring-white', 'ring-white/50', 'scale-110');
            if (sColor !== 'none') btn.textContent = '';
          }
        });
      });

      const searchInput = panelModal.querySelector('#inputFilterPanelCand');
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      panelModal.querySelectorAll('.panel-post-group, .panel-cand-item').forEach(el => el.classList.remove('hidden'));
    }
  }

  function closePanelModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (panelModal) {
      panelModal.classList.add('hidden');
      renderResultsUI(main, pwd, posts, candidates, results, schedule, sets, isFinalPublished, reloadData, isLivePolling, setLivePolling, isOffline);
    }
  }

  // Standings modal triggers
  main.querySelector('#btnOpenStandingsModal')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openStandingsModal(e);
  });
  standingsModal?.querySelector('#btnCloseStandingsModal')?.addEventListener('click', closeStandingsModal);
  standingsModal?.querySelector('#btnHideStandingsModal')?.addEventListener('click', closeStandingsModal);
  standingsModal?.querySelector('#btnStandingsOpenSetup')?.addEventListener('click', openPanelModal);
  standingsModal?.querySelector('#btnPromptSetColors')?.addEventListener('click', openPanelModal);

  standingsModal?.addEventListener('click', (e) => {
    if (e.target === standingsModal) closeStandingsModal(e);
  });

  // Panel colors modal triggers
  main.querySelector('#btnOpenPanelSetup')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openPanelModal(e);
  });
  panelModal?.querySelector('#btnClosePanelModal')?.addEventListener('click', closePanelModal);
  panelModal?.querySelector('#btnCancelPanelModal')?.addEventListener('click', closePanelModal);

  panelModal?.addEventListener('click', (e) => {
    if (e.target === panelModal) closePanelModal(e);
  });

  // ESC key dismisses modals
  const handleEscapeKey = (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (standingsModal && !standingsModal.classList.contains('hidden')) {
        closeStandingsModal(e);
      } else if (panelModal && !panelModal.classList.contains('hidden')) {
        closePanelModal(e);
      }
    }
  };
  window.addEventListener('keydown', handleEscapeKey);
  router.registerCleanup(() => {
    window.removeEventListener('keydown', handleEscapeKey);
    document.querySelectorAll('#modalPanelStandings, #modalPanelColors').forEach(el => el.remove());
  });

  // Toggle Custom Panel Names in modal
  const btnToggleLabels = panelModal?.querySelector('#btnToggleCustomLabels');
  const sectionLabels = panelModal?.querySelector('#sectionCustomLabels');
  if (btnToggleLabels && sectionLabels) {
    btnToggleLabels.onclick = () => {
      sectionLabels.classList.toggle('hidden');
    };
  }

  // Filter candidates/posts in modal
  const inputFilter = panelModal?.querySelector('#inputFilterPanelCand');
  if (inputFilter && panelModal) {
    inputFilter.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const candItems = panelModal.querySelectorAll('.panel-cand-item');
      candItems.forEach(item => {
        const text = item.getAttribute('data-cand-search') || '';
        item.classList.toggle('hidden', Boolean(q && !text.includes(q)));
      });

      panelModal.querySelectorAll('.panel-post-group').forEach(group => {
        const hasVisibleChildren = Array.from(group.querySelectorAll('.panel-cand-item')).some(item => !item.classList.contains('hidden'));
        group.classList.toggle('hidden', !hasVisibleChildren);
      });
    });
  }

  // Swatch selection in modal with immediate auto-save
  if (panelModal) {
    panelModal.querySelectorAll('.swatch-btn').forEach(btn => {
      btn.onclick = () => {
        const candKey = btn.getAttribute('data-cand-key');
        const color = btn.getAttribute('data-color');
        if (!candKey) return;

        const parentRow = btn.closest('.panel-cand-item');
        const cId = parentRow?.getAttribute('data-cand-id');
        const cName = parentRow?.getAttribute('data-cand-name');
        const cNamePost = parentRow?.getAttribute('data-cand-name-post');

        if (color === 'none') {
          delete workingCandidateColors[candKey];
          if (cId) delete workingCandidateColors[cId];
          if (cNamePost) {
            delete workingCandidateColors[cNamePost];
            delete workingCandidateColors[cNamePost.toLowerCase()];
          }
          if (cName) {
            delete workingCandidateColors[cName];
            delete workingCandidateColors[cName.toLowerCase()];
          }
        } else {
          workingCandidateColors[candKey] = color;
          if (cId) workingCandidateColors[cId] = color;
          if (cNamePost) {
            workingCandidateColors[cNamePost] = color;
            workingCandidateColors[cNamePost.toLowerCase()] = color;
          }
          if (cName) {
            workingCandidateColors[cName] = color;
            workingCandidateColors[cName.toLowerCase()] = color;
          }
        }

        // Auto-save immediately to localStorage on every swatch click
        const curData = getConfidentialPanelData();
        saveConfidentialPanelData({
          candidates: workingCandidateColors,
          labels: curData.labels || {}
        });

        // Update UI for this candidate's swatches
        if (parentRow) {
          parentRow.querySelectorAll('.swatch-btn').forEach(s => {
            const sColor = s.getAttribute('data-color');
            const isMatch = (color === 'none' && sColor === 'none') || (color === sColor);
            if (isMatch) {
              s.classList.remove('opacity-65');
              s.classList.add('ring-2', sColor === 'none' ? 'ring-white/50' : 'ring-white', 'scale-110');
              if (sColor !== 'none') s.textContent = '✓';
            } else {
              s.classList.add('opacity-65');
              s.classList.remove('ring-2', 'ring-white', 'ring-white/50', 'scale-110');
              if (sColor !== 'none') s.textContent = '';
            }
          });
        }
      };
    });
  }

  // Auto-save custom aliases on input
  if (sectionLabels) {
    sectionLabels.querySelectorAll('input[data-color-label-id]').forEach(inp => {
      inp.addEventListener('input', () => {
        const cid = inp.getAttribute('data-color-label-id');
        const val = inp.value.trim();
        const curData = getConfidentialPanelData();
        const newLabels = { ...(curData.labels || {}) };
        if (val) newLabels[cid] = val;
        else delete newLabels[cid];
        saveConfidentialPanelData({
          candidates: workingCandidateColors,
          labels: newLabels
        });
      });
    });
  }

  // Save Modal Changes
  panelModal?.querySelector('#btnSavePanelColors')?.addEventListener('click', () => {
    const workingLabels = {};
    if (sectionLabels) {
      sectionLabels.querySelectorAll('input[data-color-label-id]').forEach(inp => {
        const cid = inp.getAttribute('data-color-label-id');
        const val = inp.value.trim();
        if (val) workingLabels[cid] = val;
      });
    }

    saveConfidentialPanelData({
      candidates: workingCandidateColors,
      labels: workingLabels
    });

    closePanelModal();
    showToast('🎨 Candidate panel colors saved.', 'success');
  });

  // Clear All Colors
  function executeClearAllColors() {
    if (!confirm('⚠️ Are you sure you want to clear all candidate panel colors from this browser?\n\nThis will remove confidential panel tags.')) {
      return;
    }
    localStorage.removeItem(CONFIDENTIAL_PANEL_KEY);
    closeStandingsModal();
    closePanelModal();
    showToast('Candidate panel colors cleared.', 'info');
    renderResultsUI(main, pwd, posts, candidates, results, schedule, sets, isFinalPublished, reloadData, isLivePolling, setLivePolling, isOffline);
  }

  panelModal?.querySelector('#btnModalClearAll')?.addEventListener('click', executeClearAllColors);

  // Auto-open if redirected with openPanelColors flag
  if (window.location.hash.includes('openPanelColors=true')) {
    setTimeout(() => {
      openPanelModal();
      window.history.replaceState(null, '', '#/admin/results');
    }, 50);
  }
}

