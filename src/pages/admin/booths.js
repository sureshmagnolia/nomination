/**
 * pages/admin/booths.js
 * Admin page to manage Polling Booths and allot students (class-wise).
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading, getStudentYearLevel, compareClassesByYearOrder, compareSl } from '../../utils.js';
import { CONFIG } from '../../config.js';

export async function renderAdminBooths(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'booths', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading booth data...</p></div>
  `);

  try {
    const [nominalRoll, booths, locations, posts, finalNomsRes, allNomsList, plan, settings] = await Promise.all([
      api.getNominalRoll(),
      api.adminGetBooths(pwd, true).catch(err => { console.error('GetBooths error:', err); return null; }),
      api.adminGetLocations(pwd, true).catch(err => { console.error('GetLocations error:', err); return null; }),
      api.adminGetPosts(pwd).catch(() => []),
      api.adminGetFinalNominations(pwd).catch(() => api.getFinalNominations()).catch(() => null),
      api.adminGetNominations(pwd, true).catch(() => []),
      api.adminGetBallotPlan(pwd).catch(() => null),
      api.adminGetSettings(pwd).catch(() => ({}))
    ]);

    let resolvedNominations = [];
    if (finalNomsRes && Array.isArray(finalNomsRes.active) && finalNomsRes.active.length > 0) {
      resolvedNominations = finalNomsRes.active;
    } else if (Array.isArray(finalNomsRes) && finalNomsRes.length > 0) {
      resolvedNominations = finalNomsRes;
    } else if (Array.isArray(allNomsList) && allNomsList.length > 0) {
      resolvedNominations = allNomsList.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');
    }

    if (booths === null || locations === null) {
      container.querySelector('#adminMain').innerHTML = `
        <div class="alert alert-error max-w-xl mx-auto my-8 p-6 text-center">
          <p class="font-bold text-lg text-white mb-2">❌ Error Connecting to Server</p>
          <p class="text-sm text-slate-300 mb-4">Could not retrieve existing polling booth and location data from the server. To protect your data from being overwritten, interface initialization has been paused.</p>
          <button id="btnRetryLoadBooths" class="btn btn-primary px-6">🔄 Retry Connection</button>
        </div>
      `;
      container.querySelector('#btnRetryLoadBooths')?.addEventListener('click', () => renderAdminBooths(container));
      return;
    }

    renderBoothsUI(container.querySelector('#adminMain'), pwd, nominalRoll, booths, locations, posts, resolvedNominations, plan, settings, container);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

export const getStudentClassKeyBooth = (s) => {
  const c = String(s['CLASS'] || 'Unknown').trim();
  const dept = String(s['Dept'] || 'Unknown').trim();
  const upper = c.toUpperCase();
  if (upper.includes('RESEARCH') || upper.includes('SCHOLAR') || upper.includes('PH.D') || upper.includes('PHD')) {
    return `RESEARCH SCHOLAR - ${dept}`;
  }
  return c;
};

export const isStudentInBoothCheck = (s, boothClasses) => {
  if (!boothClasses || !boothClasses.length) return false;
  const key = getStudentClassKeyBooth(s);
  const raw = String(s['CLASS'] || '').trim();
  return boothClasses.includes(key) || boothClasses.includes(raw);
};

function renderBoothsUI(main, pwd, nominalRoll, initialBooths, initialLocations, posts, nominations, plan, settings, container) {
  // Helper for identifying distinct class key (e.g. Research Scholars by Dept)
  const getStudentClassKey = getStudentClassKeyBooth;
  const isStudentInBooth = isStudentInBoothCheck;

  // Check if Research Scholars are present or enabled in settings
  const rsCount = nominalRoll.filter(s => {
    const c = String(s['CLASS'] || s['class'] || '').toUpperCase();
    const sl = String(s['Nominal Roll Serial Number'] || s['serial_number'] || s['Sl'] || '').toUpperCase();
    return c.includes('RESEARCH') || c.includes('SCHOLAR') || c.includes('PHD') || sl.startsWith('RS');
  }).length;
  const isRSActive = rsCount > 0 || settings.includeResearchScholars === true;

  // 1. Process Nominal Roll to get classes and sizes
  const classStats = {};
  nominalRoll.forEach(student => {
    const key = getStudentClassKey(student);
    const dept = String(student['Dept'] || 'Unknown').trim();
    if (!classStats[key]) {
      classStats[key] = { name: key, dept: dept, count: 0 };
    }
    classStats[key].count++;
  });
  
  const allClasses = Object.values(classStats).sort(compareClassesByYearOrder);
  let booths = initialBooths.length ? [...initialBooths] : [{ boothNumber: 1, roomName: '', classes: [] }];
  
  // Migrate legacy generic 'RESEARCH SCHOLAR' entries to department-specific classes if applicable
  booths.forEach(b => {
    if (b.classes && b.classes.includes('RESEARCH SCHOLAR')) {
      b.classes = b.classes.filter(c => c !== 'RESEARCH SCHOLAR');
      const bDepts = new Set(b.classes.map(c => classStats[c]?.dept).filter(Boolean));
      Object.keys(classStats).filter(k => k.startsWith('RESEARCH SCHOLAR - ')).forEach(rKey => {
        if (bDepts.has(classStats[rKey].dept)) {
          b.classes.push(rKey);
        }
      });
    }
    if (Array.isArray(b.classes)) {
      b.classes.sort(compareClassesByYearOrder);
    }
  });


  let locations = [...initialLocations];
  let editingLocIdx = null;
  let isFirstRender = true;

  let currentProposals = [];
  let customSplitSolver = null;

  // Memoized cache for department association contest info
  const _deptAssocCache = new Map();
  const getDeptAssocContestInfo = (deptName) => {
    const dClean = String(deptName || '').trim();
    if (!dClean) return { hasContest: false, candidateCount: 0, post: null, reason: 'empty_dept' };
    if (_deptAssocCache.has(dClean)) return _deptAssocCache.get(dClean);
    const dUpper = dClean.toUpperCase();

    // 1. If Ballot Plan is already generated and has association records,
    // only departments present in plan.assocs.results have an active contest
    if (plan && plan.assocs && Array.isArray(plan.assocs.results) && plan.assocs.results.length > 0) {
      const hasPlanContest = plan.assocs.results.some(r => {
        const pPost = String(r.post || '').toUpperCase();
        return pPost.includes(dUpper) || (pPost.startsWith('ASSOCIATION SECRETARY') && pPost.includes(dUpper));
      });
      if (hasPlanContest) {
        const res = { hasContest: true, candidateCount: 2, post: `Association Secretary ${dClean}`, reason: 'plan_active' };
        _deptAssocCache.set(dClean, res);
        return res;
      }
    }

    // 2. Locate the Association Secretary post rule for this department
    const assocPost = (posts || []).find(p => {
      const pName = String(p.post || '').toUpperCase().trim();
      const pDept = String(p.restrictedDept || '').toUpperCase().trim();
      const isAssoc = pName.includes('ASSOCIATION') || pName.includes('ASSOC') || !!p.deptRestriction;
      if (!isAssoc) return false;
      if (pDept && pDept === dUpper) return true;
      if (pName.startsWith('ASSOCIATION SECRETARY')) {
        const target = pName.replace('ASSOCIATION SECRETARY', '').trim();
        return target === dUpper || target.includes(dUpper) || dUpper.includes(target);
      }
      return false;
    });

    if (!assocPost) {
      // If there's no Association Secretary post configured for this department at all, no association contest
      const res = { hasContest: false, candidateCount: 0, post: null, reason: 'no_post' };
      _deptAssocCache.set(dClean, res);
      return res;
    }

    const postName = String(assocPost.post || '').trim();

    // 3. Count candidates from nominations (resolvedNominations: valid, non-withdrawn)
    if (Array.isArray(nominations) && nominations.length > 0) {
      const activeCands = nominations.filter(n => {
        const nPost = String(n.post || '').trim();
        const isMatch = nPost.toLowerCase() === postName.toLowerCase();
        const isValid = (!n.status || n.status === 'Valid');
        const notWithdrawn = (n.withdrawalStatus !== 'Approved');
        return isMatch && isValid && notWithdrawn;
      });

      const candidateCount = activeCands.length;
      // Contest requires >= 2 candidates. If 0 or 1 candidate, no contest / unopposed / no ballot.
      const hasContest = candidateCount >= 2;
      const res = {
        hasContest,
        candidateCount,
        post: postName,
        reason: hasContest ? 'contested' : (candidateCount === 1 ? 'unopposed' : 'no_candidates')
      };
      _deptAssocCache.set(dClean, res);
      return res;
    }

    // 4. Default: If no nominations data exists in system yet, assume contested
    const res = { hasContest: true, candidateCount: 2, post: postName, reason: 'assumed_contested' };
    _deptAssocCache.set(dClean, res);
    return res;
  };

  // Memoized cache for representative post contest info
  const _repCache = new Map();
  const getRepContestInfo = (yearLevel) => {
    if (!yearLevel || yearLevel === 'RS') {
      return { hasContest: false, candidateCount: 0, post: null, key: 'RS' };
    }

    const repKey = (yearLevel === '1_PG' || yearLevel === '2_PG') ? 'PG' : yearLevel; // '1_UG', '2_UG', '3_UG', 'PG'
    if (_repCache.has(repKey)) return _repCache.get(repKey);

    // 1. Check if Ballot Plan already exists and has reps
    if (plan && plan.reps && Array.isArray(plan.reps.results) && plan.reps.results.length > 0) {
      const hasPlanContest = plan.reps.results.some(r => {
        const pPost = String(r.post || '').toUpperCase();
        if (repKey === '1_UG' && (pPost.includes('I UG') || pPost.includes('1ST UG') || pPost.includes('I YEAR'))) return true;
        if (repKey === '2_UG' && (pPost.includes('II UG') || pPost.includes('2ND UG') || pPost.includes('II YEAR'))) return true;
        if (repKey === '3_UG' && (pPost.includes('III UG') || pPost.includes('3RD UG') || pPost.includes('III YEAR'))) return true;
        if (repKey === 'PG' && pPost.includes('PG')) return true;
        return false;
      });
      if (hasPlanContest) {
        const res = { hasContest: true, candidateCount: 2, post: `${repKey} Representative`, key: repKey, reason: 'plan_active' };
        _repCache.set(repKey, res);
        return res;
      }
    }

    // 2. Locate the Representative post rule from posts
    const repPost = (posts || []).find(p => {
      const pName = String(p.post || '').toUpperCase().trim();
      if (pName.includes('ASSOCIATION') || pName.includes('ASSOC') || p.deptRestriction) return false;
      if (!pName.includes('REPRESENTATIVE') && !pName.includes('REP')) return false;

      if (repKey === '1_UG') {
        return p.yearRestriction === '1' || pName.includes('I UG') || pName.includes('1ST UG') || pName.includes('I YEAR');
      }
      if (repKey === '2_UG') {
        return p.yearRestriction === '2' || pName.includes('II UG') || pName.includes('2ND UG') || pName.includes('II YEAR');
      }
      if (repKey === '3_UG') {
        return p.yearRestriction === '3' || pName.includes('III UG') || pName.includes('3RD UG') || pName.includes('III YEAR');
      }
      if (repKey === 'PG') {
        return p.yearRestriction === 'PG' || pName.includes('PG');
      }
      return false;
    });

    if (!repPost) {
      const res = { hasContest: false, candidateCount: 0, post: null, key: repKey, reason: 'no_post' };
      _repCache.set(repKey, res);
      return res;
    }

    const postName = String(repPost.post || '').trim();

    // 3. Count candidates from nominations (resolvedNominations: valid, non-withdrawn)
    if (Array.isArray(nominations) && nominations.length > 0) {
      const activeCands = nominations.filter(n => {
        const nPost = String(n.post || '').trim();
        const isMatch = nPost.toLowerCase() === postName.toLowerCase();
        const isValid = (!n.status || n.status === 'Valid');
        const notWithdrawn = (n.withdrawalStatus !== 'Approved');
        return isMatch && isValid && notWithdrawn;
      });

      const candidateCount = activeCands.length;
      const hasContest = candidateCount >= 2;
      const res = {
        hasContest,
        candidateCount,
        post: postName,
        key: repKey,
        reason: hasContest ? 'contested' : (candidateCount === 1 ? 'unopposed' : 'no_candidates')
      };
      _repCache.set(repKey, res);
      return res;
    }

    // 4. Default if nominations not loaded: assume contested
    const res = { hasContest: true, candidateCount: 2, post: postName, key: repKey, reason: 'assumed_contested' };
    _repCache.set(repKey, res);
    return res;
  };

  // Helper to determine exact ballot paper count and eligibility for a class
  const getClassBallotInfo = (cls) => {
    const deptName = String(cls.dept || 'Unknown').trim();
    const assocInfo = getDeptAssocContestInfo(deptName);
    const yLevel = getStudentYearLevel(cls.name);
    const repInfo = getRepContestInfo(yLevel);

    // 1 General Union Ballot (always)
    // + 1 Association Ballot (if department Association Secretary is contested)
    // + 1 Representative Ballot (if cohort Representative post is contested)
    const ballotsPerStudent = 1 + (assocInfo.hasContest ? 1 : 0) + (repInfo.hasContest ? 1 : 0);
    const totalBallots = (cls.count || 0) * ballotsPerStudent;

    return {
      dept: deptName,
      yearLevel: yLevel,
      repKey: repInfo.key,
      hasAssocContest: assocInfo.hasContest,
      assocPost: assocInfo.post,
      hasRepContest: repInfo.hasContest,
      repPost: repInfo.post,
      ballotsPerStudent,
      totalBallots
    };
  };

  // Helper to compute combined voters, ballots, cohorts and PG presence for any set of classes
  const calcClassesWorkload = (classes, deptName) => {
    let totalVoters = 0;
    let totalBallots = 0;
    const cohorts = new Set();
    const assocInfo = getDeptAssocContestInfo(deptName);

    classes.forEach(c => {
      totalVoters += (c.count || 0);
      const bInfo = getClassBallotInfo(c);
      totalBallots += bInfo.totalBallots;
      if (bInfo.repKey && bInfo.repKey !== 'RS') {
        cohorts.add(bInfo.repKey);
      }
    });

    return {
      totalVoters,
      totalBallots,
      hasAssocContest: assocInfo.hasContest,
      assocCandidateCount: assocInfo.candidateCount,
      assocPost: assocInfo.post,
      cohorts: Array.from(cohorts),
      hasPG: cohorts.has('PG')
    };
  };

  const openSplitModal = (splitDepts, intactCount, totalDepts) => {
    const modal = main.querySelector('#splitAlertModal');
    const content = main.querySelector('#splitAlertModalContent');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
        <strong>⚖️ Smart Balanced Allotment Applied:</strong><br>
        To prevent severe voter imbalance across booths (such as having booths with 240+ voters while others sit with under 90) and keep every booth evenly balanced around the target average, 
        <strong>${splitDepts.length} department${splitDepts.length > 1 ? 's' : ''}</strong> was divided across <strong>strictly 2 booths</strong> (the maximum allowable limit). 
        All other <strong>${intactCount} of ${totalDepts} departments</strong> remain 100% intact in single booths.
      </div>

      <div class="space-y-3">
        ${splitDepts.map(sd => `
          <div class="border border-white/15 bg-white/5 rounded-xl p-4 space-y-2">
            <div class="flex justify-between items-center border-b border-white/10 pb-2">
              <h5 class="font-bold text-base text-white">🏛️ ${esc(sd.name)}</h5>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  Total: ${sd.part1.count + sd.part2.count} Voters
                </span>
                ${!sd.hasAssocContest ? `
                  <span class="text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30">
                    No Assoc Contest
                  </span>
                ` : `
                  <span class="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    Contested Assoc
                  </span>
                `}
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div class="bg-black/30 rounded-lg p-2.5 border border-white/5">
                <div class="text-xs text-indigo-300 font-bold mb-1 flex items-center justify-between">
                  <span>📍 Booth ${sd.part1.boothNumber}</span>
                  <span class="text-[10px] text-slate-400 font-normal">(${esc(sd.part1.label)})</span>
                </div>
                <div class="text-lg font-mono font-bold text-white mb-1">
                  ${sd.part1.count} <span class="text-xs font-normal text-slate-400">voters</span>
                  <span class="text-xs font-normal text-indigo-300 ml-1">(${sd.part1.ballots} ballots)</span>
                </div>
                <div class="text-[11px] text-slate-300 line-clamp-2">
                  ${sd.part1.classes.map(c => esc(c)).join(', ')}
                </div>
              </div>

              <div class="bg-black/30 rounded-lg p-2.5 border border-white/5">
                <div class="text-xs text-amber-300 font-bold mb-1 flex items-center justify-between">
                  <span>📍 Booth ${sd.part2.boothNumber}</span>
                  <span class="text-[10px] text-slate-400 font-normal">(${esc(sd.part2.label)})</span>
                </div>
                <div class="text-lg font-mono font-bold text-white mb-1">
                  ${sd.part2.count} <span class="text-xs font-normal text-slate-400">voters</span>
                  <span class="text-xs font-normal text-amber-300 ml-1">(${sd.part2.ballots} ballots)</span>
                </div>
                <div class="text-[11px] text-slate-300 line-clamp-2">
                  ${sd.part2.classes.map(c => esc(c)).join(', ')}
                </div>
              </div>
            </div>

            <p class="text-[11px] text-amber-300/90 pt-1">
              ${!sd.hasAssocContest 
                ? `ℹ️ <em>${esc(sd.name)} has no Association Secretary contest (no departmental association ballot issued). Staff only issue General Union ballots &amp; eligible Rep ballots for this department.</em>` 
                : `💡 <em>Counting instruction: During vote counting, ballots from Booth ${sd.part1.boothNumber} and Booth ${sd.part2.boothNumber} for ${esc(sd.name)} association will need to be aggregated together.</em>`}
            </p>
          </div>
        `).join('')}
      </div>
    `;

    modal.classList.remove('hidden');
  };

  const closeSplitModal = () => {
    const modal = main.querySelector('#splitAlertModal');
    if (modal) modal.classList.add('hidden');
  };

  const openStrategyModal = (proposals) => {
    currentProposals = [...proposals];
    const modal = main.querySelector('#strategySelectModal');
    const container = main.querySelector('#strategyModalCardsContainer');
    if (!modal || !container) return;

    let activeFilter = 'all';

    const getCardBorderClass = (color) => {
      if (color === 'emerald') return 'border-emerald-500/40 hover:border-emerald-400';
      if (color === 'amber') return 'border-amber-500/40 hover:border-amber-400';
      if (color === 'cyan') return 'border-cyan-500/40 hover:border-cyan-400';
      if (color === 'fuchsia') return 'border-fuchsia-500/40 hover:border-fuchsia-400';
      return 'border-indigo-500/40 hover:border-indigo-400';
    };

    const getBadgeStyle = (color) => {
      if (color === 'emerald') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      if (color === 'amber') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      if (color === 'cyan') return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
      if (color === 'fuchsia') return 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30';
      return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    };

    const getBtnStyle = (color) => {
      if (color === 'emerald') return 'background:#059669;';
      if (color === 'amber') return 'background:#d97706;';
      if (color === 'cyan') return 'background:#0891b2;';
      if (color === 'fuchsia') return 'background:#c026d3;';
      return 'background:#4f46e5;';
    };

    const renderModalContent = () => {
      let filtered = currentProposals;
      if (activeFilter === 'minimal') {
        filtered = currentProposals.filter(p => p.splitDepts.length <= 1);
      } else if (activeFilter === 'balanced') {
        filtered = currentProposals.filter(p => p.splitDepts.length === 2);
      } else if (activeFilter === 'uniform') {
        filtered = currentProposals.filter(p => p.splitDepts.length >= 3);
      }

      container.innerHTML = `
        <!-- Top Toolbar: Strategy Category Tabs & Quick Depth Explorer -->
        <div class="mb-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3 bg-black/40 p-2.5 rounded-xl border border-white/10">
            <div class="flex flex-wrap items-center gap-1.5" id="strategyFilterTabs">
              <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all filter-tab-btn ${activeFilter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'}" data-filter="all">
                All Plans (${currentProposals.length})
              </button>
              <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all filter-tab-btn ${activeFilter === 'minimal' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'}" data-filter="minimal">
                🛡️ Minimal Splits (0-1)
              </button>
              <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all filter-tab-btn ${activeFilter === 'balanced' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'}" data-filter="balanced">
                ⚖️ Balanced (2 Splits)
              </button>
              <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all filter-tab-btn ${activeFilter === 'uniform' ? 'bg-fuchsia-600 text-white shadow-md' : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'}" data-filter="uniform">
                🎯 Equal Voters (3+ Splits)
              </button>
            </div>

            <!-- Custom Split Quick Depth Pills -->
            <div class="flex items-center gap-1.5 text-xs">
              <span class="text-slate-400 font-semibold hidden sm:inline">Split Depth:</span>
              <div class="flex items-center gap-1 flex-wrap" id="depthPillsContainer">
                ${[1, 2, 3, 4, 5].map(k => {
                  const hasPlan = currentProposals.some(p => p.splitDepts.length === k);
                  return `
                    <button type="button" class="px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all depth-pill-btn ${hasPlan ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10'}" data-depth="${k}" title="Generate or view allotment plan with ${k} department split${k > 1 ? 's' : ''}">
                      ${k} Dept${k > 1 ? 's' : ''}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        ${filtered.length === 0 ? `
          <div class="p-8 text-center text-slate-400 bg-black/20 rounded-xl border border-white/5 my-4">
            <span class="text-2xl mb-2 block">🔍</span>
            <p class="text-sm">No plans found in this category. Click "All Plans" or select a Split Depth pill to generate a plan.</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-2">
            ${filtered.map(p => {
              const spreadNote = p.spread <= 25 
                ? `<span class="text-[11px] font-bold text-fuchsia-300 bg-fuchsia-500/20 px-1.5 py-0.5 rounded border border-fuchsia-500/30">(${p.spread} spread • Approx Equal!)</span>`
                : p.spread <= 45
                  ? `<span class="text-[11px] font-bold text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-500/30">(${p.spread} spread • High Uniformity)</span>`
                  : p.spread <= 70
                    ? `<span class="text-[11px] font-bold text-emerald-400">(${p.spread} spread)</span>`
                    : `<span class="text-[11px] font-bold text-amber-400">(${p.spread} spread)</span>`;

              const ballotSpreadNote = p.ballotSpread <= 110 
                ? `<span class="text-[11px] text-emerald-400">(${p.ballotSpread} spread)</span>` 
                : `<span class="text-[11px] text-amber-400">(${p.ballotSpread} spread)</span>`;

              const countingComplexity = p.splitDepts.length === 0 
                ? 'None (0 Merges)' 
                : p.splitDepts.length === 1 
                  ? 'Minimal (1 Dept Merge)' 
                  : p.splitDepts.length === 2 
                    ? 'Moderate (2 Dept Merges)' 
                    : `Multi-Dept (${p.splitDepts.length} Dept Merges)`;

              return `
                <div class="bg-slate-850 rounded-2xl border ${getCardBorderClass(p.badgeColor)} flex flex-col justify-between p-4.5 transition-all shadow-xl relative overflow-hidden group" style="background:#1e293b;">
                  <div class="space-y-3">
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                      <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${getBadgeStyle(p.badgeColor)}">
                        ${p.badge}
                      </span>
                      <span class="text-xs font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        ${p.splitDepts.length === 0 ? '0 Splits' : `${p.splitDepts.length} Split Dept${p.splitDepts.length > 1 ? 's' : ''}`}
                      </span>
                    </div>

                    <div>
                      <h5 class="text-base font-bold text-white mb-1">${esc(p.title)}</h5>
                      <p class="text-xs text-slate-300 leading-relaxed">${esc(p.tagline)}</p>
                    </div>

                    <div class="bg-black/40 rounded-xl p-3 space-y-2 text-xs border border-white/5">
                      <div class="flex justify-between items-center">
                        <span class="text-slate-400">Voter Queue Range:</span>
                        <span class="font-mono font-bold text-white">${p.minBooth} – ${p.maxBooth} voters ${spreadNote}</span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-slate-400">Ballot Paper Workload:</span>
                        <span class="font-mono font-bold text-indigo-300">${p.minBallots} – ${p.maxBallots} ballots ${ballotSpreadNote}</span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-slate-400">Total Books / Booth:</span>
                        <span class="font-bold ${p.minBooks > 0 ? 'text-emerald-300' : 'text-amber-300'}">
                          ${p.minBooks} – ${p.maxBooks} books (1 Gen + Assoc + Reps)
                        </span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-slate-400">PG Cohort Distribution:</span>
                        <span class="font-bold text-purple-300">${p.pgBoothsCount} of ${p.booths.length} Booths handle PG</span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-slate-400">Department Integrity:</span>
                        <span class="font-bold text-white">${p.intactCount} of ${p.totalDepts} Intact</span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-slate-400">Counting Complexity:</span>
                        <span class="font-bold ${p.splitDepts.length <= 1 ? 'text-emerald-300' : p.splitDepts.length === 2 ? 'text-amber-300' : 'text-fuchsia-300'}">
                          ${countingComplexity}
                        </span>
                      </div>
                    </div>

                    <!-- Hardship Equalization Callout -->
                    <div class="text-[11px] ${p.splitDepts.length >= 3 ? 'bg-fuchsia-500/10 border-fuchsia-500/25 text-fuchsia-200' : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-200'} border rounded-lg p-2.5 space-y-1">
                      <div class="font-bold ${p.splitDepts.length >= 3 ? 'text-fuchsia-300' : 'text-indigo-300'} flex items-center gap-1.5">
                        <span>⚖️</span> <span>Equal Hardship &amp; Multi-Ballot Balancing Active:</span>
                      </div>
                      <p class="text-[10px] text-slate-300 leading-normal">
                        Workload factors in <strong>General</strong> (1), <strong>Dept Association</strong> (${p.contestedDeptsCount} contested), and <strong>Cohort Representatives</strong> (I UG, II UG, III UG, PG). 
                        ${p.splitDepts.length >= 3 
                          ? `With ${p.splitDepts.length} departments split into balanced halves, voter queues across all booths are equalized to within ${p.spread} voters for near-identical officer workloads.`
                          : p.uncontestedDepts && p.uncontestedDepts.length > 0 
                            ? `Uncontested depts (<em>${esc(p.uncontestedDepts.join(', '))}</em>) and PG split cohorts are interleaved across separate booths to ensure equal staff burdens.` 
                            : `Staff book management (${p.minBooks}–${p.maxBooks} books/booth) and ballot issuance are tightly equalized across all booths.`}
                      </p>
                    </div>

                    <!-- Split Details -->
                    ${p.splitDepts.length > 0 ? `
                      <div class="space-y-1.5">
                        <div class="text-[11px] font-bold ${p.splitDepts.length >= 3 ? 'text-cyan-300' : 'text-amber-300'} uppercase tracking-wider flex items-center gap-1">
                          <span>⚠️</span> Split Aggregation Notice (${p.splitDepts.length} Dept${p.splitDepts.length > 1 ? 's' : ''}):
                        </div>
                        <div class="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                          ${p.splitDepts.map(sd => `
                            <div class="text-[11px] bg-black/40 border border-white/10 rounded-lg p-2 space-y-1">
                              <div class="font-bold text-white flex justify-between">
                                <span>🏛️ ${esc(sd.name)}</span>
                                <div class="flex items-center gap-1.5">
                                  <span class="font-mono text-amber-400 text-[10px]">${sd.part1.count + sd.part2.count} voters</span>
                                  ${!sd.hasAssocContest ? `<span class="text-[9px] bg-rose-500/20 text-rose-300 px-1 py-0.2 rounded font-bold">Uncontested Assoc</span>` : ''}
                                </div>
                              </div>
                              <div class="grid grid-cols-2 gap-1.5 text-[10px]">
                                <div class="bg-white/5 p-1 rounded">
                                  <span class="font-bold text-amber-300">Booth ${sd.part1.boothNumber}:</span> ${sd.part1.count} v (${sd.part1.ballots} b) &bull; ${esc(sd.part1.label)}
                                </div>
                                <div class="bg-white/5 p-1 rounded">
                                  <span class="font-bold text-amber-300">Booth ${sd.part2.boothNumber}:</span> ${sd.part2.count} v (${sd.part2.ballots} b) &bull; ${esc(sd.part2.label)}
                                </div>
                              </div>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : `
                      <div class="text-[11px] bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-emerald-200">
                        ✨ <strong>100% Department Integrity:</strong> Every department sits completely intact in a single booth. No ballot merging needed.
                      </div>
                    `}

                    <!-- Expandable Booth Breakdown -->
                    <div>
                      <button type="button" class="btn btn-secondary btn-xs w-full text-slate-300 toggle-proposal-booths-btn hover:text-white" data-pid="${p.id}">
                        🔍 Preview All ${p.booths.length} Booths
                      </button>
                      <div id="booths-preview-${p.id}" class="hidden mt-2 max-h-56 overflow-y-auto space-y-1.5 bg-black/50 rounded-lg p-2 border border-white/10 text-[11px]">
                        ${p.booths.map(b => `
                          <div class="p-2 rounded bg-white/5 hover:bg-white/10 transition-colors space-y-1">
                            <div class="flex items-center justify-between gap-2">
                              <span class="font-bold text-indigo-300 font-mono">Booth ${b.boothNumber}:</span>
                              <div class="flex items-center gap-1.5">
                                <span class="font-mono text-white text-[11px] px-1.5 py-0.5 rounded bg-white/10">${b.totalStudents} Voters</span>
                                <span class="font-mono text-indigo-300 text-[11px] px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 font-bold">${b.totalBallots} Ballots</span>
                              </div>
                            </div>
                            <div class="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                              <span>📚 Books: <strong class="text-slate-200">${b.totalBooksCount}</strong> (1 Gen + ${b.assocBooksCount} Assoc + ${b.repBooksCount} Rep)</span>
                              <span class="${b.hasPG ? 'text-purple-300' : 'text-slate-400'} font-medium">${b.hasPG ? '🎓 Includes PG' : '🏫 UG Only'}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                              <span class="truncate">Reps: <strong class="text-slate-300">${b.repPosts.length ? esc(b.repPosts.join(', ')) : 'None'}</strong></span>
                              ${b.uncontestedDepts.length > 0 ? `<span class="text-amber-300/80 font-medium whitespace-nowrap">No Assoc: ${esc(b.uncontestedDepts.join(', '))}</span>` : '<span class="text-emerald-400/80 whitespace-nowrap">All Assoc Contested</span>'}
                            </div>
                            <div class="text-slate-300 text-[10px] truncate" title="${esc(b.classes.join(', '))}">
                              ${esc(b.classes.join(', '))}
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  </div>

                  <div class="pt-3 mt-3 border-t border-white/10">
                    <button type="button" class="btn btn-primary w-full py-2.5 font-bold shadow-lg select-strategy-apply-btn text-white text-sm" data-pid="${p.id}" style="${getBtnStyle(p.badgeColor)}">
                      ✓ Apply ${esc(p.title.split(':')[0])}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      `;

      // Bind Category Filter Tabs
      container.querySelectorAll('.filter-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          activeFilter = e.currentTarget.dataset.filter;
          renderModalContent();
        });
      });

      // Bind Depth Pills
      container.querySelectorAll('.depth-pill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const depth = parseInt(e.currentTarget.dataset.depth, 10);
          const existing = currentProposals.find(p => p.splitDepts.length === depth);
          if (existing) {
            if (depth <= 1) activeFilter = 'minimal';
            else if (depth === 2) activeFilter = 'balanced';
            else activeFilter = 'uniform';
            renderModalContent();
          } else if (customSplitSolver) {
            const newProp = customSplitSolver(depth);
            if (newProp) {
              currentProposals.push(newProp);
              if (depth <= 1) activeFilter = 'minimal';
              else if (depth === 2) activeFilter = 'balanced';
              else activeFilter = 'uniform';
              renderModalContent();
              showToast(`🎯 Generated custom plan splitting ${depth} department${depth > 1 ? 's' : ''}!`, 'success');
            } else {
              showToast(`Could not split ${depth} departments with current classes.`, 'info');
            }
          }
        });
      });

      // Bind accordion toggles
      container.querySelectorAll('.toggle-proposal-booths-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const pid = e.currentTarget.dataset.pid;
          const box = container.querySelector(`#booths-preview-${pid}`);
          if (box) {
            box.classList.toggle('hidden');
            e.currentTarget.textContent = box.classList.contains('hidden') ? `🔍 Preview All ${booths.length} Booths` : '▲ Hide Booth Preview';
          }
        });
      });

      // Bind Apply buttons
      container.querySelectorAll('.select-strategy-apply-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const pid = e.currentTarget.dataset.pid;
          const selectedProposal = currentProposals.find(p => p.id === pid);
          if (!selectedProposal) return;

          closeStrategyModal();
          applyProposal(selectedProposal);
        });
      });
    };

    renderModalContent();
    modal.classList.remove('hidden');
  };

  const closeStrategyModal = () => {
    const modal = main.querySelector('#strategySelectModal');
    if (modal) modal.classList.add('hidden');
  };

  const applyProposal = async (proposal) => {
    for (let i = 0; i < booths.length; i++) {
      const pb = proposal.booths.find(b => b.boothNumber === booths[i].boothNumber);
      if (pb) {
        booths[i].classes = [...pb.classes].sort(compareClassesByYearOrder);
        booths[i].totalStudents = pb.totalStudents;
        booths[i].totalBallots = pb.totalBallots;
      }
    }
    try {
      await api.adminSaveBooths(pwd, booths);
      refreshUI();
      showToast(`✅ Successfully applied "${proposal.title}" across ${booths.length} booths!`, 'success');
      if (proposal.splitDepts && proposal.splitDepts.length > 0) {
        openSplitModal(proposal.splitDepts, proposal.intactCount, proposal.totalDepts);
      }
    } catch (err) {
      refreshUI();
      showToast(`Applied in memory (Failed to save to database: ${err.message})`, 'error');
      if (proposal.splitDepts && proposal.splitDepts.length > 0) {
        openSplitModal(proposal.splitDepts, proposal.intactCount, proposal.totalDepts);
      }
    }
  };

  const generateAllotmentProposals = () => {
    const numBooths = booths.length;
    if (numBooths === 0) return [];

    // 1. Group all classes by Department and determine Association & Representative workload
    const deptsMap = {};
    allClasses.forEach(cls => {
      const deptName = String(cls.dept || 'Unknown').trim();
      if (!deptsMap[deptName]) {
        deptsMap[deptName] = {
          name: deptName,
          total: 0,
          classes: [],
          totalBallots: 0,
          cohorts: []
        };
      }
      deptsMap[deptName].classes.push(cls);
    });

    // Populate workload metrics
    Object.values(deptsMap).forEach(d => {
      const workload = calcClassesWorkload(d.classes, d.name);
      d.total = workload.totalVoters;
      d.totalBallots = workload.totalBallots;
      d.hasAssocContest = workload.hasAssocContest;
      d.assocCandidateCount = workload.assocCandidateCount;
      d.assocPost = workload.assocPost;
      d.cohorts = workload.cohorts;
      d.hasPG = workload.hasPG;
    });

    const depts = Object.values(deptsMap);
    const totalStudents = nominalRoll.length || depts.reduce((sum, d) => sum + d.total, 0);
    const meanVoters = totalStudents / numBooths;
    const totalBallots = depts.reduce((sum, d) => sum + d.totalBallots, 0);
    const meanBallots = totalBallots / numBooths;
    const numDepts = depts.length;

    const contestedDeptsCount = depts.filter(d => d.hasAssocContest).length;
    const uncontestedDeptsList = depts.filter(d => !d.hasAssocContest).map(d => d.name);

    // Fast bitmask representation of rep posts: 1_UG=1, 2_UG=2, 3_UG=4, PG=8
    function getCohortMask(cohorts) {
      let mask = 0;
      if (!cohorts) return 0;
      for (let i = 0; i < cohorts.length; i++) {
        const c = cohorts[i];
        if (c === '1_UG') mask |= 1;
        else if (c === '2_UG') mask |= 2;
        else if (c === '3_UG') mask |= 4;
        else if (c === 'PG') mask |= 8;
      }
      return mask;
    }

    // Attach repMask and deptIndex to all items for O(1) bitwise loss evaluation
    const deptIndexMap = new Map();
    depts.forEach((d, idx) => {
      deptIndexMap.set(d.name, idx);
      d.deptIdx = idx;
      d.repMask = getCohortMask(d.cohorts);
    });

    const isUG = (c) => {
      const u = (c.name || '').toUpperCase();
      return u.includes('B.COM') || u.includes('BCOM') || 
             u.includes('B.A') || u.includes('BA') || 
             u.includes('B.SC') || u.includes('BSC') || 
             u.includes('BBA') || u.includes('BCA') || 
             u.includes('UG') || /^(I|II|III)\s+(DC|YEAR|B)/i.test(u);
    };

    // Helper A: Smart-split a department into 2 balanced coherent halves (closest to 50/50)
    function splitSmartBalanced(dept) {
      const classes = [...dept.classes];
      if (classes.length <= 1) return null;

      const n = classes.length;
      let bestA = [], bestB = [], bestDiff = Infinity;
      if (n <= 12) {
        for (let mask = 1; mask < (1 << n) - 1; mask++) {
          const partA = [], partB = [];
          let sumA = 0, sumB = 0;
          for (let i = 0; i < n; i++) {
            if ((mask >> i) & 1) { partA.push(classes[i]); sumA += classes[i].count; }
            else { partB.push(classes[i]); sumB += classes[i].count; }
          }
          const diff = Math.abs(sumA - sumB);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestA = partA;
            bestB = partB;
          }
        }
      }
      if (bestA.length === 0 || bestB.length === 0) {
        classes.sort((a, b) => b.count - a.count);
        let sumA = 0, sumB = 0;
        for (const c of classes) {
          if (sumA <= sumB) { bestA.push(c); sumA += c.count; }
          else { bestB.push(c); sumB += c.count; }
        }
      }

      const workloadA = calcClassesWorkload(bestA, dept.name);
      const workloadB = calcClassesWorkload(bestB, dept.name);

      const getLabel = (pClasses) => {
        const allUG = pClasses.every(isUG);
        const allPG = pClasses.every(c => !isUG(c));
        const safeDept = dept.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const names = pClasses.map(c => c.name.replace(new RegExp(`\\s+${safeDept}`, 'gi'), '')).join(', ');
        if (allUG) return `UG (${names})`;
        if (allPG) return `PG & Scholars (${names})`;
        return names;
      };

      const dIdx = deptIndexMap.get(dept.name) ?? 0;
      return [
        {
          name: dept.name,
          partLabel: getLabel(bestA),
          total: workloadA.totalVoters,
          totalBallots: workloadA.totalBallots,
          hasAssocContest: workloadA.hasAssocContest,
          assocCandidateCount: workloadA.assocCandidateCount,
          assocPost: workloadA.assocPost,
          cohorts: workloadA.cohorts,
          repMask: getCohortMask(workloadA.cohorts),
          deptIdx: dIdx,
          hasPG: workloadA.hasPG,
          classes: bestA,
          isSplit: true,
          deptName: dept.name
        },
        {
          name: dept.name,
          partLabel: getLabel(bestB),
          total: workloadB.totalVoters,
          totalBallots: workloadB.totalBallots,
          hasAssocContest: workloadB.hasAssocContest,
          assocCandidateCount: workloadB.assocCandidateCount,
          assocPost: workloadB.assocPost,
          cohorts: workloadB.cohorts,
          repMask: getCohortMask(workloadB.cohorts),
          deptIdx: dIdx,
          hasPG: workloadB.hasPG,
          classes: bestB,
          isSplit: true,
          deptName: dept.name
        }
      ];
    }

    // Helper B: Academic Cohort split (Strict UG vs PG & Scholars)
    function splitAcademicCohort(dept) {
      const classes = [...dept.classes];
      if (classes.length <= 1) return null;
      const ugClasses = classes.filter(isUG);
      const pgClasses = classes.filter(c => !isUG(c));
      if (ugClasses.length === 0 || pgClasses.length === 0) return splitSmartBalanced(dept);

      const workloadUG = calcClassesWorkload(ugClasses, dept.name);
      const workloadPG = calcClassesWorkload(pgClasses, dept.name);

      const dIdx = deptIndexMap.get(dept.name) ?? 0;
      return [
        {
          name: dept.name,
          partLabel: 'UG',
          total: workloadUG.totalVoters,
          totalBallots: workloadUG.totalBallots,
          hasAssocContest: workloadUG.hasAssocContest,
          assocCandidateCount: workloadUG.assocCandidateCount,
          assocPost: workloadUG.assocPost,
          cohorts: workloadUG.cohorts,
          repMask: getCohortMask(workloadUG.cohorts),
          deptIdx: dIdx,
          hasPG: false,
          classes: ugClasses,
          isSplit: true,
          deptName: dept.name
        },
        {
          name: dept.name,
          partLabel: 'PG & Scholars',
          total: workloadPG.totalVoters,
          totalBallots: workloadPG.totalBallots,
          hasAssocContest: workloadPG.hasAssocContest,
          assocCandidateCount: workloadPG.assocCandidateCount,
          assocPost: workloadPG.assocPost,
          cohorts: workloadPG.cohorts,
          repMask: getCohortMask(workloadPG.cohorts),
          deptIdx: dIdx,
          hasPG: true,
          classes: pgClasses,
          isSplit: true,
          deptName: dept.name
        }
      ];
    }

    // Partition Solver with multi-restart, local hill-climbing, and bitmasked O(1) evaluations
    // Factors in:
    // 1. Voter disparity across booths
    // 2. Physical ballot paper issuance workload (General + Assoc + Rep ballots per cohort)
    // 3. Spreading uncontested departments across booths (preventing clustering of easy jobs)
    // 4. Balancing total physical ballot books managed (1 General + Assoc books + Rep books)
    // 5. PG cohort presence/distribution across booths
    function solvePartition(items, B, penalty = 75, numRestarts = 25) {
      let bestAlloc = null, bestLoss = Infinity;
      const constraint = (b, it) => it.isSplit && b.items.some(o => o.isSplit && o.deptName === it.deptName);

      function calcLoss(alloc) {
        let voterSumSq = 0, ballotSumSq = 0;
        let maxV = -Infinity, minV = Infinity;
        let maxB = -Infinity, minB = Infinity;
        let maxBooks = -Infinity, minBooks = Infinity;
        let zeroAssocCount = 0;
        let clusterPenalty = 0;

        for (let i = 0; i < B; i++) {
          const b = alloc[i];
          const vDiff = b.total - meanVoters;
          voterSumSq += vDiff * vDiff;
          if (b.total > maxV) maxV = b.total;
          if (b.total < minV) minV = b.total;

          const bDiff = b.totalBallots - meanBallots;
          ballotSumSq += bDiff * bDiff;
          if (b.totalBallots > maxB) maxB = b.totalBallots;
          if (b.totalBallots < minB) minB = b.totalBallots;

          let deptAssocMask = 0;
          let deptUncontestedMask = 0;
          let repMask = 0;

          for (let k = 0; k < b.items.length; k++) {
            const it = b.items[k];
            if (it.hasAssocContest) {
              deptAssocMask |= (1 << (it.deptIdx || 0));
            } else {
              deptUncontestedMask |= (1 << (it.deptIdx || 0));
            }
            repMask |= (it.repMask || 0);
          }

          // Count set bits in deptAssocMask
          let assocCount = 0;
          let tempA = deptAssocMask;
          while (tempA > 0) { assocCount += (tempA & 1); tempA >>= 1; }

          // Count set bits in deptUncontestedMask
          let uncontestedCount = 0;
          let tempU = deptUncontestedMask;
          while (tempU > 0) { uncontestedCount += (tempU & 1); tempU >>= 1; }

          // Count contested rep books from repMask
          let repBooksCount = 0;
          if (repMask & 1) repBooksCount++;
          if (repMask & 2) repBooksCount++;
          if (repMask & 4) repBooksCount++;
          if (repMask & 8) repBooksCount++;

          const totalBooks = 1 + assocCount + repBooksCount;
          if (totalBooks > maxBooks) maxBooks = totalBooks;
          if (totalBooks < minBooks) minBooks = totalBooks;

          if (assocCount === 0 && contestedDeptsCount >= B) {
            zeroAssocCount++;
          }
          if (uncontestedCount > 1) {
            clusterPenalty += (uncontestedCount - 1) * 450;
          }
        }

        const vWeight = 1.0;
        const bWeight = 0.50;
        const spreadLoss = (maxV - minV) * penalty + (maxB - minB) * (penalty * 0.45);
        const bookSpreadLoss = (maxBooks - minBooks) * 85;
        const zeroAssocPenalty = zeroAssocCount * 1200;

        return (voterSumSq * vWeight) + (ballotSumSq * bWeight) + spreadLoss + bookSpreadLoss + zeroAssocPenalty + clusterPenalty;
      }

      for (let r = 0; r < numRestarts; r++) {
        const alloc = Array.from({ length: B }, (_, i) => ({ id: i, total: 0, totalBallots: 0, items: [] }));
        const sorted = [...items];
        if (r === 0) sorted.sort((a, b) => b.totalBallots - a.totalBallots || b.total - a.total);
        else if (r === 1) sorted.sort((a, b) => b.total - a.total);
        else if (r === 2) sorted.sort((a, b) => (b.hasAssocContest ? 1 : 0) - (a.hasAssocContest ? 1 : 0));
        else if (r === 3) sorted.sort((a, b) => (b.hasPG ? 1 : 0) - (a.hasPG ? 1 : 0));
        else sorted.sort(() => Math.random() - 0.5);

        let valid = true;
        for (const it of sorted) {
          let bestB = null, minAddLoss = Infinity;
          for (let i = 0; i < B; i++) {
            const b = alloc[i];
            if (constraint(b, it)) continue;
            b.items.push(it);
            b.total += it.total;
            b.totalBallots += it.totalBallots;
            const cost = calcLoss(alloc);
            b.items.pop();
            b.total -= it.total;
            b.totalBallots -= it.totalBallots;

            if (cost < minAddLoss) { minAddLoss = cost; bestB = b; }
          }
          if (!bestB) {
            const validBooths = alloc.filter(b => !constraint(b, it));
            if (validBooths.length > 0) {
              validBooths.sort((a, b) => a.totalBallots - b.totalBallots || a.total - b.total);
              bestB = validBooths[0];
            } else {
              valid = false;
              bestB = alloc[0];
            }
          }
          bestB.items.push(it);
          bestB.total += it.total;
          bestB.totalBallots += it.totalBallots;
        }
        if (!valid) continue;

        let currentLoss = calcLoss(alloc), improved = true, step = 0;
        while (improved && step < 25) {
          improved = false; step++;

          for (let i = 0; i < B; i++) {
            for (let j = 0; j < B; j++) {
              if (i === j) continue;
              for (let k = 0; k < alloc[i].items.length; k++) {
                const it = alloc[i].items[k];
                if (constraint(alloc[j], it)) continue;

                alloc[i].total -= it.total;
                alloc[i].totalBallots -= it.totalBallots;
                alloc[j].total += it.total;
                alloc[j].totalBallots += it.totalBallots;
                alloc[i].items.splice(k, 1);
                alloc[j].items.push(it);

                const newLoss = calcLoss(alloc);
                if (newLoss < currentLoss - 0.001) {
                  currentLoss = newLoss;
                  improved = true;
                  break;
                } else {
                  alloc[j].items.pop();
                  alloc[i].items.splice(k, 0, it);
                  alloc[i].total += it.total;
                  alloc[i].totalBallots += it.totalBallots;
                  alloc[j].total -= it.total;
                  alloc[j].totalBallots -= it.totalBallots;
                }
              }
              if (improved) break;
            }
            if (improved) break;
          }
          if (improved) continue;

          for (let i = 0; i < B; i++) {
            for (let j = i + 1; j < B; j++) {
              for (let ki = 0; ki < alloc[i].items.length; ki++) {
                for (let kj = 0; kj < alloc[j].items.length; kj++) {
                  const itA = alloc[i].items[ki], itB = alloc[j].items[kj];
                  if (constraint(alloc[j], itA) || constraint(alloc[i], itB)) continue;

                  alloc[i].total += itB.total - itA.total;
                  alloc[i].totalBallots += itB.totalBallots - itA.totalBallots;
                  alloc[j].total += itA.total - itB.total;
                  alloc[j].totalBallots += itA.totalBallots - itB.totalBallots;
                  alloc[i].items[ki] = itB;
                  alloc[j].items[kj] = itA;

                  const newLoss = calcLoss(alloc);
                  if (newLoss < currentLoss - 0.001) {
                    currentLoss = newLoss;
                    improved = true;
                    break;
                  } else {
                    alloc[i].items[ki] = itA;
                    alloc[j].items[kj] = itB;
                    alloc[i].total += itA.total - itB.total;
                    alloc[i].totalBallots += itA.totalBallots - itB.totalBallots;
                    alloc[j].total += itB.total - itA.total;
                    alloc[j].totalBallots += itB.totalBallots - itA.totalBallots;
                  }
                }
                if (improved) break;
              }
              if (improved) break;
            }
            if (improved) break;
          }
        }

        if (currentLoss < bestLoss) {
          bestLoss = currentLoss;
          bestAlloc = JSON.parse(JSON.stringify(alloc));
        }
      }
      return bestAlloc;
    }

    function formatProposal(id, title, badge, badgeColor, tagline, alloc, splitDeptsList) {
      if (!alloc) return null;
      alloc.sort((a, b) => a.id - b.id);
      const boothsRes = alloc.map((b, i) => {
        const cList = [];
        let bBallots = 0;
        const bAssocs = new Set();
        const bUncontestedAssocs = new Set();
        const bCohorts = new Set();
        const bRepPosts = new Set();

        b.items.forEach(it => {
          it.classes.forEach(c => {
            cList.push(c.name);
            const bInfo = getClassBallotInfo(c);
            bBallots += bInfo.totalBallots;
            if (bInfo.repKey && bInfo.repKey !== 'RS') {
              bCohorts.add(bInfo.repKey);
              if (bInfo.hasRepContest) {
                bRepPosts.add(bInfo.repPost || `${bInfo.repKey} Rep`);
              }
            }
          });
          const dName = it.deptName || it.name;
          if (it.hasAssocContest) {
            bAssocs.add(dName);
          } else {
            bUncontestedAssocs.add(dName);
          }
        });

        const hasPG = bCohorts.has('PG');
        const assocBooksCount = bAssocs.size;
        const repBooksCount = bRepPosts.size;
        const totalBooksCount = 1 + assocBooksCount + repBooksCount; // 1 General + Assoc + Reps

        return {
          boothNumber: i + 1,
          totalStudents: b.total,
          totalBallots: bBallots,
          assocBooksCount,
          assocDepts: Array.from(bAssocs),
          uncontestedDepts: Array.from(bUncontestedAssocs),
          cohorts: Array.from(bCohorts),
          hasPG,
          repBooksCount,
          repPosts: Array.from(bRepPosts),
          totalBooksCount,
          classes: cList,
          items: b.items
        };
      });

      const splitSummary = splitDeptsList.map(sd => {
        const part1Booth = boothsRes.find(b => b.classes.includes(sd.halves[0].classes[0]?.name));
        const part2Booth = boothsRes.find(b => b.classes.includes(sd.halves[1].classes[0]?.name));
        return {
          name: sd.dept.name,
          hasAssocContest: sd.dept.hasAssocContest,
          part1: {
            boothNumber: part1Booth ? part1Booth.boothNumber : '?',
            label: sd.halves[0].partLabel,
            classes: sd.halves[0].classes.map(c => c.name),
            count: sd.halves[0].total,
            ballots: sd.halves[0].totalBallots
          },
          part2: {
            boothNumber: part2Booth ? part2Booth.boothNumber : '?',
            label: sd.halves[1].partLabel,
            classes: sd.halves[1].classes.map(c => c.name),
            count: sd.halves[1].total,
            ballots: sd.halves[1].totalBallots
          }
        };
      });

      const totals = boothsRes.map(b => b.totalStudents);
      const minBooth = Math.min(...totals);
      const maxBooth = Math.max(...totals);

      const ballotTotals = boothsRes.map(b => b.totalBallots);
      const minBallots = Math.min(...ballotTotals);
      const maxBallots = Math.max(...ballotTotals);

      const bookTotals = boothsRes.map(b => b.totalBooksCount);
      const minBooks = Math.min(...bookTotals);
      const maxBooks = Math.max(...bookTotals);

      const pgBoothsCount = boothsRes.filter(b => b.hasPG).length;

      return {
        id,
        title,
        badge,
        badgeColor,
        tagline,
        minBooth,
        maxBooth,
        spread: maxBooth - minBooth,
        minBallots,
        maxBallots,
        ballotSpread: maxBallots - minBallots,
        minBooks,
        maxBooks,
        bookSpread: maxBooks - minBooks,
        pgBoothsCount,
        uncontestedDepts: uncontestedDeptsList,
        contestedDeptsCount,
        intactCount: numDepts - splitSummary.length,
        totalDepts: numDepts,
        splitDepts: splitSummary,
        booths: boothsRes
      };
    }

    const proposals = [];
    const eligibleSplitDepts = depts.filter(d => d.classes.length > 1).sort((a, b) => b.total - a.total);
    const largeDepts = eligibleSplitDepts.filter(d => d.total > meanVoters * 0.75);

    const generateProposalForKDepts = (k, id, title, badge, badgeColor, tagline, penalty = 130, restarts = 30) => {
      if (!eligibleSplitDepts || eligibleSplitDepts.length < k || k <= 0) return null;
      const deptsToSplit = eligibleSplitDepts.slice(0, k);
      const splitPairs = [];
      const splitNames = new Set();
      for (const d of deptsToSplit) {
        const halves = splitSmartBalanced(d);
        if (!halves) return null;
        splitPairs.push({ dept: d, halves });
        splitNames.add(d.name);
      }
      const items = [
        ...depts.filter(d => !splitNames.has(d.name)),
        ...splitPairs.flatMap(sp => [sp.halves[0], sp.halves[1]])
      ];
      const alloc = solvePartition(items, numBooths, penalty, restarts);
      if (!alloc) return null;
      return formatProposal(id, title, badge, badgeColor, tagline, alloc, splitPairs);
    };

    customSplitSolver = (k) => {
      return generateProposalForKDepts(
        k,
        `custom-${k}`,
        `Custom Plan: ${k} Dept Split${k > 1 ? 's' : ''}`,
        `🎯 ${k} Dept Split${k > 1 ? 's' : ''}`,
        k >= 4 ? 'fuchsia' : k === 3 ? 'cyan' : k === 2 ? 'indigo' : 'emerald',
        `Splits the top ${k} largest departments into 50/50 halves to tighten booth voter queue equality.`,
        160,
        35
      );
    };

    // Check Plan 0: 100% Pure Integrity (0 Splits)
    const tier0Alloc = solvePartition(depts, numBooths, 60, 20);
    if (tier0Alloc) {
      const t0Totals = tier0Alloc.map(b => b.total);
      const t0Ballots = tier0Alloc.map(b => b.totalBallots);
      const t0Min = Math.min(...t0Totals);
      const t0Max = Math.max(...t0Totals);
      const t0Spread = t0Max - t0Min;
      const t0BMin = Math.min(...t0Ballots);
      const t0BMax = Math.max(...t0Ballots);
      const t0BSpread = t0BMax - t0BMin;

      const isTier0Balanced = (t0Max <= Math.round(meanVoters * 1.25)) && 
                              (t0Min >= Math.round(meanVoters * 0.75)) && 
                              (t0Spread <= 55) && 
                              (t0BSpread <= 90);
      if (isTier0Balanced) {
        proposals.push(formatProposal(
          'pure',
          'Plan 0: Pure Integrity',
          '✨ 100% Whole (0 Splits)',
          'emerald',
          'Zero departments are split. Every department sits whole in a single booth with equalized staff hardship and balanced ballot loads.',
          tier0Alloc,
          []
        ));
      }
    }

    // Plan A: Minimal Splitting (Only 1 Dept Split)
    if (largeDepts.length > 0 || eligibleSplitDepts.length > 0) {
      const d1 = (largeDepts[0] || eligibleSplitDepts[0]);
      const h1 = splitSmartBalanced(d1);
      if (h1) {
        const items1 = [...depts.filter(d => d.name !== d1.name), h1[0], h1[1]];
        const alloc1 = solvePartition(items1, numBooths, 65, 25);
        if (alloc1) {
          proposals.push(formatProposal(
            'minimal',
            'Plan A: Minimal Splitting',
            '🛡️ Easiest Counting',
            'emerald',
            `Maximizes whole departments. Only 1 department (${esc(d1.name)}) is split; all other ${numDepts - 1} departments remain 100% whole with equalized ballot loads.`,
            alloc1,
            [{ dept: d1, halves: h1 }]
          ));
        }
      }
    }

    // Plan B: Balanced Queues (Smart 50/50 Halves on 2 Depts)
    if (largeDepts.length >= 2 || eligibleSplitDepts.length >= 2) {
      const d1 = largeDepts[0] || eligibleSplitDepts[0];
      const d2 = largeDepts[1] || eligibleSplitDepts[1];
      const h1 = splitSmartBalanced(d1), h2 = splitSmartBalanced(d2);
      if (h1 && h2) {
        const items2 = [...depts.filter(d => d.name !== d1.name && d.name !== d2.name), h1[0], h1[1], h2[0], h2[1]];
        const alloc2 = solvePartition(items2, numBooths, 85, 30);
        if (alloc2) {
          proposals.push(formatProposal(
            'balanced',
            'Plan B: Balanced Queues',
            '⚖️ Recommended • Optimal Flow',
            'indigo',
            `Divides ${esc(d1.name)} and ${esc(d2.name)} into balanced 50/50 halves to equalize officer workloads, ballot issuance burdens, and avoid crowded hallways.`,
            alloc2,
            [{ dept: d1, halves: h1 }, { dept: d2, halves: h2 }]
          ));
        }
      }
    }

    // Plan C: Academic Cohort (UG vs PG Split)
    if (largeDepts.length >= 2 || eligibleSplitDepts.length >= 2) {
      const d1 = largeDepts[0] || eligibleSplitDepts[0];
      const d2 = largeDepts[1] || eligibleSplitDepts[1];
      const h1 = splitAcademicCohort(d1), h2 = splitAcademicCohort(d2);
      if (h1 && h2) {
        const items3 = [...depts.filter(d => d.name !== d1.name && d.name !== d2.name), h1[0], h1[1], h2[0], h2[1]];
        const alloc3 = solvePartition(items3, numBooths, 55, 25);
        if (alloc3) {
          proposals.push(formatProposal(
            'cohort',
            'Plan C: Academic Cohort',
            '🎓 UG vs PG Segregation',
            'amber',
            `Separates Undergraduates from Postgraduates & Scholars while interleaving uncontested departments to maintain equal staff workload across all booths.`,
            alloc3,
            [{ dept: d1, halves: h1 }, { dept: d2, halves: h2 }]
          ));
        }
      }
    }

    // Plan D: High Uniformity (3 Dept Splits)
    if (eligibleSplitDepts.length >= 3) {
      const d1 = eligibleSplitDepts[0], d2 = eligibleSplitDepts[1], d3 = eligibleSplitDepts[2];
      const pD = generateProposalForKDepts(
        3,
        'uniform',
        'Plan D: High Uniformity',
        '⚖️ High Uniformity (3 Splits)',
        'cyan',
        `Splits 3 large departments (${esc(d1.name)}, ${esc(d2.name)}, ${esc(d3.name)}) into balanced 50/50 halves to achieve high voter queue consistency across all booths.`,
        140,
        30
      );
      if (pD) proposals.push(pD);
    }

    // Plan E: Equal Voters (Max Splitting ~ Same Voter Count Across All Booths)
    if (eligibleSplitDepts.length >= 3) {
      const maxK = Math.min(eligibleSplitDepts.length, numBooths * 2, 8);
      let bestEqualProp = null;
      let minSpread = Infinity;
      const startK = eligibleSplitDepts.length >= 4 ? 4 : 3;
      for (let k = startK; k <= maxK; k++) {
        const candidate = generateProposalForKDepts(
          k,
          'equal',
          'Plan E: Equal Voters (Max Splitting)',
          '🎯 Equal Voters (~Same Count)',
          'fuchsia',
          `Splits ${k} departments into balanced halves so that all booths have approximately the exact same number of voters.`,
          260,
          40
        );
        if (candidate && candidate.spread < minSpread) {
          minSpread = candidate.spread;
          bestEqualProp = candidate;
        }
      }
      if (bestEqualProp) {
        bestEqualProp.tagline = `Divides ${bestEqualProp.splitDepts.length} departments into 50/50 halves so every polling booth has approximately the exact same number of voters (${bestEqualProp.minBooth}–${bestEqualProp.maxBooth} voters, only ${bestEqualProp.spread} spread!).`;
        proposals.push(bestEqualProp);
      }
    }

    return proposals.filter(Boolean);
  };

  const refreshUI = () => {
    // Recalculate booth stats
    booths.forEach(b => b.totalStudents = 0);
    const unallocated = [];
    
    allClasses.forEach(cls => {
      const assignedBooth = booths.find(b => b.classes && b.classes.includes(cls.name));
      if (assignedBooth) {
        assignedBooth.totalStudents += cls.count;
      } else {
        unallocated.push(cls);
      }
    });

    // Check department integrity across booths
    const deptBoothMap = {};
    allClasses.forEach(cls => {
      const b = booths.find(b => b.classes && b.classes.includes(cls.name));
      if (b) {
        if (!deptBoothMap[cls.dept]) deptBoothMap[cls.dept] = new Map();
        const cur = deptBoothMap[cls.dept].get(b.boothNumber) || { count: 0, classes: [] };
        cur.count += cls.count;
        cur.classes.push(cls.name);
        deptBoothMap[cls.dept].set(b.boothNumber, cur);
      }
    });
    const currentSplitDepts = Object.entries(deptBoothMap)
      .filter(([_, bMap]) => bMap.size > 1)
      .map(([dept, bMap]) => ({
        dept,
        booths: Array.from(bMap.entries()).map(([boothNum, info]) => ({ boothNum, count: info.count, classes: info.classes }))
      }));

    const scrollPos = window.scrollY;

    main.innerHTML = `
        <!-- Locations Modal -->
        <div id="locationsModal" class="fixed inset-0 z-50 flex items-center justify-center hidden">
          <div class="absolute inset-0 bg-slate-900/80" id="locationsModalOverlay"></div>
          <div class="relative bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg p-6 z-10 flex flex-col max-h-[90vh]">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-white text-lg">📍 Manage &amp; Edit Locations</h4>
                <span id="locationsCountBadge" class="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-mono">
                  ${locations.length} Locations
                </span>
              </div>
              <button id="btnCloseLocationsModal" class="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            <div class="flex gap-2 mb-4">
              <input type="text" id="newLocationInput" class="field flex-1" placeholder="Add room or location name (e.g. Room 101, Auditorium)...">
              <button id="btnAddLocation" class="btn btn-secondary whitespace-nowrap" title="Action: Adds this room or hall name to the available locations list and saves it to the database.&#10;Prerequisite: Enter a valid, non-duplicate room name.">➕ Add</button>
            </div>

            <!-- Scrollable Locations List -->
            <div class="flex-1 overflow-y-auto mb-4 pr-1 min-h-[140px] max-h-[360px]" id="locationsListContainer">
              <div id="locationsList" class="space-y-2"></div>
            </div>

            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
              <span class="text-xs text-slate-400">💡 Click <strong>✏️ Edit</strong> or double-click to rename.</span>
              <div class="flex gap-2">
                <button id="btnCloseLocationsModal2" class="btn btn-secondary" title="Close this modal without additional changes">Close</button>
                <button id="btnSaveLocations" class="btn btn-primary" title="Action: Saves the full list of campus room locations and current booth assignments to the database.&#10;Prerequisite: Complete your room name edits or additions.">💾 Save Locations</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Strategy Selection Modal -->
        <div id="strategySelectModal" class="fixed inset-0 z-50 flex items-center justify-center hidden">
          <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" id="strategyModalOverlay"></div>
          <div class="relative bg-slate-900 rounded-2xl border border-indigo-500/30 shadow-2xl w-full max-w-7xl p-6 z-10 flex flex-col max-h-[92vh] text-white">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div class="flex items-center gap-2.5">
                <span class="text-2xl">⚡</span>
                <div>
                  <h4 class="font-bold text-indigo-300 text-lg">Polling Booth Allotment Optimizer</h4>
                  <p class="text-xs text-slate-400">The solver evaluated your voters across distinct optimization models. Choose the strategy that best matches your election priorities:</p>
                </div>
              </div>
              <button id="btnCloseStrategyModal" class="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <div class="flex-1 overflow-y-auto pr-1" id="strategyModalCardsContainer">
              <!-- Dynamically populated with strategy cards -->
            </div>

            <div class="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span class="text-xs text-slate-400">💡 Click <strong>Preview Booths</strong> on any plan to see all booth assignments before applying.</span>
              <button id="btnCancelStrategyModal" class="btn btn-secondary px-5">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Split Department Alert Modal -->
        <div id="splitAlertModal" class="fixed inset-0 z-50 flex items-center justify-center hidden">
          <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" id="splitAlertModalOverlay"></div>
          <div class="relative bg-slate-800 rounded-2xl border border-amber-500/40 shadow-2xl w-full max-w-xl p-6 z-10 flex flex-col max-h-[90vh]">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div class="flex items-center gap-2.5">
                <span class="text-2xl">⚠️</span>
                <div>
                  <h4 class="font-bold text-amber-300 text-lg">Department Split Notice</h4>
                  <p class="text-xs text-slate-400">Election Counting &amp; Ballot Precaution</p>
                </div>
              </div>
              <button id="btnCloseSplitAlertModal" class="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <div class="flex-1 overflow-y-auto pr-1 space-y-4 text-sm" id="splitAlertModalContent">
              <!-- Dynamically populated -->
            </div>

            <div class="pt-4 border-t border-white/10 flex justify-end">
              <button id="btnAckSplitAlertModal" class="btn btn-primary bg-amber-600 hover:bg-amber-500 text-white font-bold px-6">
                Understood &bull; View Allotments
              </button>
            </div>
          </div>
        </div>

      <div class="page-enter space-y-6">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-bold text-white">Polling Booth Allotment</h3>
            <p class="text-slate-400 text-sm">Designate rooms and allot classes to polling booths.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button id="btnClearAll" class="btn btn-secondary border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white" title="Action: Unassigns all classes from all booths to reset allotments to blank.&#10;Prerequisite: Ensure you want to wipe current assignments; you will need to re-allot classes manually or via Auto Allot.">🗑️ Clear All</button>
            <button id="btnAutoAllot" class="btn btn-secondary" title="Action: Analyzes voter loads and automatically distributes classes evenly. Offers multiple allotment strategies ranging from 0-1 department splits up to high-uniformity multi-split plans for approximately equal voters across all booths.&#10;Prerequisite: Set the total booth count first and ensure the Nominal Roll has been imported.">⚡ Auto Allot</button>
            <a href="#/admin/officials" class="btn btn-secondary border-indigo-500/30 text-indigo-300 hover:bg-indigo-500 hover:text-white" title="Action: Opens the Election Officials Team Builder to allot Presiding Officers, Polling Officers, and Peons to booths.&#10;Prerequisite: Configure booths and assign room locations first so polling stations exist for staffing.">👥 Allot Officials (Team Builder)</a>
            <button id="btnManageLocations" class="btn btn-secondary border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white" title="Action: Opens Location Manager to add, rename, or delete campus rooms and halls for polling booths.&#10;Prerequisite: Have your list of room numbers / hall names ready.">📍 Manage Locations</button>
            <button id="btnToggleRSBooths" class="btn btn-secondary ${isRSActive ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20' : 'border-amber-500/40 text-amber-300 hover:bg-amber-500/20'} flex items-center gap-1.5" title="Court Order: Add or remove Research Scholars (RS1–RS21) across department booths & ballot plan">
              <span>⚖️</span>
              <span>${isRSActive ? 'Court Addendum Active (RS1–RS21)' : 'Add Research Scholars (Court Order)'}</span>
            </button>
            <button id="btnSaveBooths" class="btn btn-primary" title="Action: Saves all assigned room locations and class-to-booth allocations to the database.&#10;Prerequisite: Assign room locations and ensure all classes are allocated to booths before saving.">💾 Save Configuration</button>
            <button id="btnRegenPlan" class="btn btn-primary border-indigo-500 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 px-4" title="Action: Calculates voter counts, generates official ballot slip serial ranges (G, R, A), bundles 50-slip books, and freezes the Master Plan.&#10;Prerequisite: Click '💾 Save Configuration' first to ensure your latest booth and class allocations are saved in the database.">🔄 Finalize Master Plan</button>
            <button id="btnPrintRolls" class="btn btn-secondary" title="Action: Generates official printable Marked Copies of the Electoral Roll for each booth with voter details and ballot checkboxes.&#10;Prerequisite: Complete class allotments, save configuration, and click '🔄 Finalize Master Plan' first.">🖨️ Print Marked Copy (Electoral Rolls)</button>
            <button id="btnPrintBallotAccounts" class="btn btn-secondary border-indigo-500/30 text-indigo-300 hover:bg-indigo-500 hover:text-white" title="Action: Generates statutory Presiding Officer Ballot Paper Accounts (Form 4 / Form V) pre-filled with official book numbers and serial ranges.&#10;Prerequisite: Click '🔄 Finalize Master Plan' first so ballot serial number ranges and book counts are generated.">📑 Print Ballot Accounts</button>
          </div>
        </div>
        <div id="printArea" class="hidden"></div>

        <!-- Court Addendum Status Banner -->
        ${isRSActive ? `
          <div class="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
            <div class="flex items-center gap-2.5">
              <span class="text-xl">⚖️</span>
              <div>
                <strong class="text-emerald-300">Court Addendum Active:</strong>
                <span class="text-slate-300 ml-1">21 Ph.D. Research Scholars (RS1–RS21) are allotted across 5 department booths (Economics, Geography, Mathematics, Music, Tamil). Ballot ranges are planned to accommodate them; if scholars are excluded by the University, the extra ballots act as official Booth Reserves. Existing 1..1887 serial numbers are unchanged.</span>
              </div>
            </div>
            <button id="btnToggleRSBoothsBanner" class="btn btn-xs btn-secondary border-rose-500/40 text-rose-300 hover:bg-rose-500/20 whitespace-nowrap">
              Exclude Scholars
            </button>
          </div>
        ` : ''}

        <!-- Department Integrity & Counting Notice Banner -->
        ${currentSplitDepts.length > 0 ? `
          <div class="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200 shadow-lg">
            <div class="flex items-start gap-3">
              <span class="text-2xl mt-0.5">⚠️</span>
              <div class="flex-1">
                <div class="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <h5 class="font-bold text-amber-300 text-sm">Counting Notice: ${currentSplitDepts.length} Department${currentSplitDepts.length > 1 ? 's' : ''} Split Across Booths</h5>
                  <span class="text-[11px] bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded font-mono">Max 2 Booths per Dept</span>
                </div>
                <p class="text-xs text-slate-300 mb-2.5">
                  To avoid overwhelming individual booths, the following department(s) are allotted across multiple booths. 
                  <strong>During vote counting, ballots for these departments must be aggregated from the listed booths:</strong>
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  ${currentSplitDepts.map(sd => `
                    <div class="bg-black/40 rounded-lg p-2.5 border border-amber-500/20 text-xs">
                      <div class="font-bold text-white mb-1.5 flex items-center justify-between">
                        <span>🏛️ ${esc(sd.dept)}</span>
                        <span class="text-amber-400 font-mono text-[11px]">${sd.booths.reduce((s, b) => s + b.count, 0)} total voters</span>
                      </div>
                      <div class="space-y-1">
                        ${sd.booths.map(b => `
                          <div class="flex items-start gap-1.5 text-[11px] bg-white/5 p-1 rounded">
                            <span class="font-mono text-amber-300 font-bold whitespace-nowrap">Booth ${b.boothNum}:</span>
                            <span class="text-slate-300">${b.count} voters (${esc(b.classes.join(', '))})</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        ` : (unallocated.length === 0 && booths.some(b => b.classes && b.classes.length > 0)) ? `
          <div class="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-200 flex items-center gap-2.5 text-xs shadow-sm">
            <span class="text-base">✨</span>
            <div>
              <strong class="text-emerald-300">100% Department Integrity (0 Splits):</strong>
              <span class="text-slate-300 ml-1">Every department is contained within a single booth. No ballot box merging or cross-booth aggregation is required during counting.</span>
            </div>
          </div>
        ` : ''}

        <!-- Booth Configuration -->
        <div class="glass rounded-xl p-5 border-l-4 border-l-indigo-500">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="font-bold text-white text-base">Booth Setup</h4>
              <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2 py-0.5 font-medium flex items-center gap-1">
                <span>🛡️</span> <span>Database Persisted</span>
              </span>
            </div>
            <div class="flex gap-2 items-center">
              <label class="text-sm text-slate-300 mb-0 whitespace-nowrap">Total Booths:</label>
              <input type="number" id="numBoothsInput" class="field w-20 py-1 font-mono text-center font-bold" min="1" max="50" value="${booths.length}" title="Enter the total number of physical polling booths (1 to 50)">
              <button id="btnUpdateBoothCount" class="btn btn-primary btn-sm bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1 px-3" title="Action: Updates the total number of polling booths and immediately saves to database.&#10;Prerequisite: Enter the desired booth count (1–50) in the input field.">
                <span>🔢</span> <span>Update & Save</span>
              </button>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="boothsContainer">
            ${booths.map((b, i) => {
              const bClasses = b.classes || [];
              let bBallots = 0;
              const bAssocDepts = new Set();
              const bNoContestDepts = new Set();
              const bCohorts = new Set();
              const bRepPosts = new Set();

              bClasses.forEach(cName => {
                const cls = classStats[cName];
                if (cls) {
                  const bInfo = getClassBallotInfo(cls);
                  bBallots += bInfo.totalBallots;
                  if (bInfo.hasAssocContest) {
                    bAssocDepts.add(cls.dept);
                  } else {
                    bNoContestDepts.add(cls.dept);
                  }
                  if (bInfo.repKey && bInfo.repKey !== 'RS') {
                    bCohorts.add(bInfo.repKey);
                    if (bInfo.hasRepContest) {
                      bRepPosts.add(bInfo.repPost || `${bInfo.repKey} Rep`);
                    }
                  }
                }
              });

              const hasPG = bCohorts.has('PG');
              const assocBooksCount = bAssocDepts.size;
              const repBooksCount = bRepPosts.size;
              const totalBooks = 1 + assocBooksCount + repBooksCount;

              return `
              <div class="border border-white/10 rounded-lg p-3 bg-white/5 shadow-inner">
                <div class="text-[10px] text-slate-400 font-bold uppercase mb-1 flex justify-between items-center">
                  <span class="text-white font-mono">Booth ${i + 1}</span>
                  <div class="flex items-center gap-1.5 font-mono text-[10px]">
                    <span class="${b.totalStudents > 0 ? 'text-white font-semibold' : ''}">${b.totalStudents} Voters</span>
                    <span>&bull;</span>
                    <span class="${bBallots > 0 ? 'text-indigo-300 font-bold' : ''}">${bBallots} Ballots</span>
                  </div>
                </div>
                <div class="flex gap-1.5 items-center mb-1.5">
                  <select class="field text-sm py-1 flex-1 room-name-select" data-idx="${i}">
                    <option value="">-- Assign Location --</option>
                    ${locations.map(loc => `
                      <option value="${esc(loc)}" 
                        ${b.roomName === loc ? 'selected' : ''}
                        ${booths.some((ob, oi) => oi !== i && ob.roomName === loc) ? 'disabled' : ''}
                      >${esc(loc)}</option>
                    `).join('')}
                    <option value="__ADD_NEW__">➕ Add / Manage Locations...</option>
                  </select>
                  ${b.roomName ? `
                    <button type="button" class="btn btn-secondary btn-xs py-1.5 px-2 text-slate-300 hover:text-white border-white/10 quick-edit-loc-btn" data-idx="${i}" title="Edit / Rename '${esc(b.roomName)}'">
                      ✏️
                    </button>
                  ` : ''}
                </div>
                <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1 px-0.5">
                  <span>📚 Books: <strong class="text-indigo-300 font-semibold">${totalBooks}</strong> <span class="text-[9px] text-slate-500">(1G + ${assocBooksCount}A + ${repBooksCount}R)</span></span>
                  <span class="${hasPG ? 'text-purple-300 font-medium' : 'text-slate-400'}">${hasPG ? '🎓 PG + UG' : '🏫 UG Only'}</span>
                </div>
                <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1 px-0.5">
                  <span class="truncate" title="Representatives: ${esc(Array.from(bRepPosts).join(', ') || 'None')}">Reps: <strong class="text-slate-300">${bRepPosts.size ? esc(Array.from(bRepPosts).map(r => r.replace(' Representative', ' Rep')).join(', ')) : 'None'}</strong></span>
                  ${bNoContestDepts.size > 0 ? `<span class="text-amber-300/80 truncate max-w-[130px]" title="No Assoc Contest: ${esc(Array.from(bNoContestDepts).join(', '))}">No Assoc: ${esc(Array.from(bNoContestDepts).join(', '))}</span>` : '<span class="text-emerald-400/80">All Contested</span>'}
                </div>
                <div class="text-xs text-slate-500 h-16 overflow-y-auto bg-black/20 rounded p-1">
                  ${b.classes.length ? b.classes.slice().sort(compareClassesByYearOrder).map(c => `<div class="whitespace-nowrap overflow-hidden text-ellipsis">• ${esc(c)} (${classStats[c]?.count || 0})</div>`).join('') : '<em class="opacity-30">No classes assigned</em>'}
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </div>

        <!-- Unallocated Warning -->
        ${unallocated.length ? `
          <div class="alert alert-warning py-2 text-sm">
            ⚠️ <strong>${unallocated.length} classes</strong> are currently unassigned.
          </div>
        ` : ''}

        <!-- Class Allocation Table -->
        <div class="glass rounded-xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr>
                <th>Department</th>
                <th>Class</th>
                <th>Students</th>
                <th>Assigned Booth</th>
              </tr></thead>
              <tbody>
                ${allClasses.map(cls => {
                  const assignedBooth = booths.find(b => b.classes.includes(cls.name));
                  return `
                    <tr>
                      <td class="text-xs text-slate-400">${esc(cls.dept)}</td>
                      <td class="font-medium text-sm text-white">${esc(cls.name)}</td>
                      <td class="font-mono text-indigo-300">${cls.count}</td>
                      <td>
                        <select class="field w-full md:w-44 py-1 text-xs class-booth-select" data-class="${esc(cls.name)}">
                          <option value="">-- Unassigned --</option>
                          ${booths.map((b, i) => `
                            <option value="${i}" ${assignedBooth === b ? 'selected' : ''}>Booth ${i + 1}</option>
                          `).join('')}
                        </select>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Re-scroll to previous position
    if (!isFirstRender) {
      window.scrollTo(0, scrollPos);
    }
    isFirstRender = false;

    // --- Listeners ---
    main.querySelector('#btnClearAll').addEventListener('click', async () => {
      const assignedCount = booths.reduce((acc, b) => acc + (b.classes ? b.classes.length : 0), 0);
      if (assignedCount === 0) {
        showToast('All classes are already unassigned.', 'info');
        return;
      }
      if (!confirm(`⚠️ CONFIRM CLEAR ALL CLASS ALLOTMENTS\n\nAre you sure you want to unassign all ${assignedCount} class allotment(s) across all booths?\n\nRoom locations and booth counts will be kept intact.\n\nProceed?`)) {
        return;
      }
      booths.forEach(b => b.classes = []);
      try {
        await api.adminSaveBooths(pwd, booths);
        showToast('✅ All class allotments cleared and saved to database.', 'success');
      } catch (err) {
        showToast(`Failed to update database: ${err.message}`, 'error');
      }
      refreshUI();
    });

    main.querySelector('#btnPrintRolls').addEventListener('click', () => {
      generateAndPrintElectoralRolls(pwd);
    });
    
    main.querySelector('#btnPrintBallotAccounts').addEventListener('click', () => {
      generateAndPrintBallotAccounts(pwd);
    });

    main.querySelector('#btnUpdateBoothCount').addEventListener('click', async () => {
      const num = parseInt(main.querySelector('#numBoothsInput').value, 10);
      if (isNaN(num) || num < 1 || num > 50) {
        showToast('Please enter a valid booth count between 1 and 50.', 'error');
        return;
      }
      if (num === booths.length) {
        showToast(`Booth count is already set to ${num}.`, 'info');
        return;
      }

      // If reducing count, check if any booths will lose assigned classes or locations
      if (num < booths.length) {
        const affectedBooths = booths.slice(num);
        const hasAssignedClasses = affectedBooths.some(b => b.classes && b.classes.length > 0);
        const hasAssignedRooms = affectedBooths.some(b => b.roomName && b.roomName.trim());
        let warningMsg = `⚠️ CONFIRM BOOTH COUNT REDUCTION\n\nYou are reducing total booths from ${booths.length} to ${num}.\n`;
        if (hasAssignedClasses || hasAssignedRooms) {
          warningMsg += `\nWarning: Booth(s) ${num + 1} to ${booths.length} will be removed. Any assigned classes will return to unallocated status.\n`;
        }
        warningMsg += `\nDo you want to proceed and save this change to the database?`;
        if (!confirm(warningMsg)) return;
      } else {
        if (!confirm(`Confirm setting total polling booths to ${num} and saving to database?`)) return;
      }

      if (num > booths.length) {
        for (let i = booths.length; i < num; i++) booths.push({ boothNumber: i + 1, roomName: '', classes: [] });
      } else if (num < booths.length) {
        booths = booths.slice(0, num);
      }

      try {
        await api.adminSaveBooths(pwd, booths);
        await api.adminSaveLocations(pwd, locations);
        showToast(`✅ Total booths updated to ${num} and saved to database!`, 'success');
      } catch (err) {
        showToast(`Failed to persist to database: ${err.message}`, 'error');
      }
      refreshUI();
    });

    main.querySelectorAll('.room-name-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const val = e.target.value;
        const boothIdx = parseInt(e.target.dataset.idx, 10);
        if (val === '__ADD_NEW__') {
          e.target.value = booths[boothIdx].roomName || '';
          openModal();
          const inp = modal.querySelector('#newLocationInput');
          if (inp) inp.focus();
          return;
        }

        // If unassigning an already assigned location, prompt for confirmation
        if (!val && booths[boothIdx].roomName) {
          const oldRoom = booths[boothIdx].roomName;
          if (!confirm(`Remove assigned room location "${oldRoom}" from Booth ${boothIdx + 1}?`)) {
            e.target.value = oldRoom;
            return;
          }
        }

        booths[boothIdx].roomName = val;
        try {
          await api.adminSaveBooths(pwd, booths);
          await api.adminSaveLocations(pwd, locations);
          showToast(`✅ Booth ${boothIdx + 1} location saved as "${val || 'Unassigned'}".`, 'success');
        } catch (err) {
          showToast(`Failed to save location: ${err.message}`, 'error');
        }
        refreshUI();
      });
    });

    main.querySelectorAll('.quick-edit-loc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const boothIdx = parseInt(e.currentTarget.dataset.idx, 10);
        const curRoom = booths[boothIdx]?.roomName;
        if (!curRoom) return;
        const locIdx = locations.indexOf(curRoom);
        openModal();
        if (locIdx !== -1) {
          editingLocIdx = locIdx;
          rerenderLocationsList();
          const editInp = modal.querySelector(`.loc-edit-input[data-idx="${locIdx}"]`);
          if (editInp) {
            editInp.focus();
            editInp.select();
          }
        }
      });
    });

    const modal = main.querySelector('#locationsModal');
    const closeModal = () => {
      const newInp = modal.querySelector('#newLocationInput');
      if (newInp && newInp.value.trim()) {
        if (!confirm('You have entered an unadded location. Discard it?')) return;
      }
      editingLocIdx = null;
      modal.classList.add('hidden');
      refreshUI();
    };
    const openModal = () => {
      modal.classList.remove('hidden');
      rerenderLocationsList();
    };

    const commitLocEdit = async (idx) => {
      const input = modal.querySelector(`.loc-edit-input[data-idx="${idx}"]`);
      if (!input) return;
      const newVal = input.value.trim();
      if (!newVal) {
        showToast('Location name cannot be blank.', 'error');
        input.focus();
        return;
      }
      const oldVal = locations[idx];
      if (newVal === oldVal) {
        editingLocIdx = null;
        rerenderLocationsList();
        return;
      }
      const duplicate = locations.some((l, i) => i !== idx && l.toLowerCase() === newVal.toLowerCase());
      if (duplicate) {
        showToast(`Location "${newVal}" already exists.`, 'error');
        input.focus();
        return;
      }

      // If this location is assigned to any booths, confirm renaming
      const affected = booths.filter(b => b.roomName === oldVal).length;
      if (affected > 0) {
        if (!confirm(`Confirm renaming location "${oldVal}" to "${newVal}"?\n\nThis will update ${affected} booth assignment(s).`)) {
          input.value = oldVal;
          return;
        }
      }

      locations[idx] = newVal;
      booths.forEach(b => {
        if (b.roomName === oldVal) {
          b.roomName = newVal;
        }
      });
      editingLocIdx = null;
      rerenderLocationsList();
      try {
        await api.adminSaveLocations(pwd, locations);
        if (affected > 0) {
          await api.adminSaveBooths(pwd, booths);
        }
        showToast(`✅ Renamed to "${newVal}" and saved to database.`, 'success');
      } catch (err) {
        showToast(`Failed to save rename: ${err.message}`, 'error');
      }
    };

    const rerenderLocationsList = () => {
      const countBadge = modal.querySelector('#locationsCountBadge');
      if (countBadge) countBadge.textContent = `${locations.length} Locations`;

      const list = modal.querySelector('#locationsList');
      if (!locations.length) {
        list.innerHTML = '<div class="p-6 text-center text-slate-500 text-sm italic bg-black/20 rounded-xl border border-white/5">No locations added yet. Add your rooms and halls above.</div>';
        return;
      }

      list.innerHTML = locations.map((loc, i) => {
        const assignedBooths = booths.filter(b => b.roomName === loc);
        if (editingLocIdx === i) {
          return `
            <div class="p-2.5 rounded-lg bg-indigo-950/50 border border-indigo-500/50 flex items-center gap-2">
              <input type="text" class="field text-sm py-1 flex-1 loc-edit-input" data-idx="${i}" value="${esc(loc)}">
              <button type="button" class="btn btn-primary btn-xs py-1 px-2.5 save-loc-edit" data-idx="${i}" title="Save rename">✓ Save</button>
              <button type="button" class="btn btn-secondary btn-xs py-1 px-2 cancel-loc-edit" data-idx="${i}" title="Cancel">✕</button>
            </div>
          `;
        }
        return `
          <div class="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 transition-colors loc-item-row" data-idx="${i}">
            <div class="flex items-center gap-2 min-w-0 flex-1 cursor-pointer loc-label-wrap" data-idx="${i}" title="Double-click to edit">
              <span class="text-base text-slate-400 flex-shrink-0">📍</span>
              <span class="text-sm font-medium text-white truncate loc-text">${esc(loc)}</span>
              ${assignedBooths.length ? assignedBooths.map(ab => `
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                  Booth ${ab.boothNumber}
                </span>
              `).join('') : ''}
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button type="button" class="btn btn-secondary btn-xs py-1 px-2 text-slate-300 hover:text-white border-white/10 edit-location" data-idx="${i}" title="Rename location">
                ✏️ Edit
              </button>
              <button type="button" class="btn btn-secondary btn-xs py-1 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20 delete-location" data-idx="${i}" title="Delete location">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.edit-location').forEach(btn => {
        btn.addEventListener('click', (e) => {
          editingLocIdx = parseInt(e.currentTarget.dataset.idx, 10);
          rerenderLocationsList();
          const inp = modal.querySelector(`.loc-edit-input[data-idx="${editingLocIdx}"]`);
          if (inp) {
            inp.focus();
            inp.select();
          }
        });
      });

      list.querySelectorAll('.loc-label-wrap').forEach(wrap => {
        wrap.addEventListener('dblclick', (e) => {
          editingLocIdx = parseInt(e.currentTarget.dataset.idx, 10);
          rerenderLocationsList();
          const inp = modal.querySelector(`.loc-edit-input[data-idx="${editingLocIdx}"]`);
          if (inp) {
            inp.focus();
            inp.select();
          }
        });
      });

      list.querySelectorAll('.save-loc-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          commitLocEdit(parseInt(e.currentTarget.dataset.idx, 10));
        });
      });

      list.querySelectorAll('.cancel-loc-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          editingLocIdx = null;
          rerenderLocationsList();
        });
      });

      list.querySelectorAll('.loc-edit-input').forEach(inp => {
        inp.addEventListener('keydown', (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          if (e.key === 'Enter') {
            e.preventDefault();
            commitLocEdit(idx);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            editingLocIdx = null;
            rerenderLocationsList();
          }
        });
      });

      list.querySelectorAll('.delete-location').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          const loc = locations[idx];
          const assigned = booths.filter(b => b.roomName === loc);
          let confirmMsg = `Delete location "${loc}"?`;
          if (assigned.length > 0) {
            const boothNums = assigned.map(b => `Booth ${b.boothNumber}`).join(', ');
            confirmMsg = `⚠️ WARNING: "${loc}" is currently assigned to ${boothNums}.\n\nDeleting it will remove the room assignment from these booths.\n\nAre you sure you want to delete "${loc}"?`;
          }
          if (!confirm(confirmMsg)) return;

          locations.splice(idx, 1);
          booths.forEach(b => { if (b.roomName === loc) b.roomName = ''; });
          if (editingLocIdx === idx) editingLocIdx = null;
          else if (editingLocIdx > idx) editingLocIdx--;
          rerenderLocationsList();

          try {
            await api.adminSaveLocations(pwd, locations);
            if (assigned.length > 0) {
              await api.adminSaveBooths(pwd, booths);
            }
            showToast(`🗑️ Location "${loc}" deleted and updated in database.`, 'success');
          } catch (err) {
            showToast(`Failed to delete location: ${err.message}`, 'error');
          }
        });
      });
    };

    main.querySelector('#btnManageLocations').addEventListener('click', openModal);
    main.querySelector('#btnCloseLocationsModal').addEventListener('click', closeModal);
    main.querySelector('#btnCloseLocationsModal2').addEventListener('click', closeModal);
    main.querySelector('#locationsModalOverlay').addEventListener('click', closeModal);

    main.querySelector('#btnAddLocation').addEventListener('click', async () => {
      const input = main.querySelector('#newLocationInput');
      const val = input.value.trim();
      if (!val) return;
      if (locations.some(l => l.toLowerCase() === val.toLowerCase())) {
        showToast(`Location "${val}" already exists.`, 'error');
        input.focus();
        return;
      }
      locations.push(val);
      input.value = '';
      rerenderLocationsList();
      try {
        await api.adminSaveLocations(pwd, locations);
        showToast(`✅ Added "${val}" and saved to database.`, 'success');
      } catch (err) {
        showToast(`Failed to save location: ${err.message}`, 'error');
      }
      const container = modal.querySelector('#locationsListContainer');
      if (container) container.scrollTop = container.scrollHeight;
    });

    main.querySelector('#newLocationInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        main.querySelector('#btnAddLocation').click();
      }
    });

    rerenderLocationsList();

    main.querySelector('#btnSaveLocations').addEventListener('click', async (e) => {
      if (editingLocIdx !== null) {
        await commitLocEdit(editingLocIdx);
      }
      const btn = e.target;
      setLoading(btn, true, '💾 Save Locations');
      try {
        await api.adminSaveLocations(pwd, locations);
        await api.adminSaveBooths(pwd, booths);
        showToast('✅ Locations and booth assignments saved to database successfully!', 'success');
        closeModal();
        refreshUI();
      } catch (err) {
        showToast(`Failed to save: ${err.message}`, 'error');
      } finally {
        setLoading(btn, false, '💾 Save Locations');
      }
    });

    main.querySelectorAll('.class-booth-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const clsName = e.target.dataset.class;
        const newBoothIdx = e.target.value;
        const currentAssignedBooth = booths.find(b => b.classes && b.classes.includes(clsName));

        // If unassigning an already assigned class, prompt for confirmation
        if (newBoothIdx === '' && currentAssignedBooth) {
          if (!confirm(`Unassign class "${clsName}" from Booth ${currentAssignedBooth.boothNumber}?`)) {
            e.target.value = String(booths.indexOf(currentAssignedBooth));
            return;
          }
        }

        booths.forEach(b => { b.classes = b.classes.filter(c => c !== clsName); });
        if (newBoothIdx !== '') {
          booths[parseInt(newBoothIdx, 10)].classes.push(clsName);
          booths[parseInt(newBoothIdx, 10)].classes.sort(compareClassesByYearOrder);
        }
        try {
          await api.adminSaveBooths(pwd, booths);
          showToast(`Class "${clsName}" assigned to ${newBoothIdx !== '' ? `Booth ${parseInt(newBoothIdx, 10) + 1}` : 'Unassigned'} and saved.`, 'info');
        } catch (err) {
          showToast(`Failed to save class assignment: ${err.message}`, 'error');
        }
        refreshUI();
      });
    });

    main.querySelector('#btnSaveBooths').addEventListener('click', async (e) => {
      if (!confirm(`💾 CONFIRM SAVE CONFIGURATION\n\nSave ${booths.length} Polling Booth(s) and ${locations.length} Location(s) to the database?`)) {
        return;
      }
      const btn = e.target;
      setLoading(btn, true, '💾 Save Configuration');
      try {
        await api.adminSaveLocations(pwd, locations);
        await api.adminSaveBooths(pwd, booths);
        showToast('✅ Booth and location configuration saved to database successfully!', 'success');
      } catch (err) {
        showToast(`Failed to save: ${err.message}`, 'error');
      } finally {
        setLoading(btn, false, '💾 Save Configuration');
      }
    });

    main.querySelector('#btnRegenPlan').addEventListener('click', async (e) => {
      const btn = e.target;
      const defaultText = '🔄 Finalize Master Plan';
      try {
        setLoading(btn, true, defaultText);
        showToast('Calculating and saving Master Plan on server...', 'info');
        await api.adminGenerateBallotPlan(pwd);
        showToast('Master Plan finalized successfully! You can now print documents.', 'success');
        plan = await api.adminGetBallotPlan(pwd).catch(() => null);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(btn, false, defaultText);
      }
    });

    const handleToggleRS = async (btn) => {
      const isCurrentlyActive = isRSActive;
      const confirmMsg = isCurrentlyActive
        ? 'Are you sure you want to EXCLUDE Research Scholars from the election?\n\nTheir records (RS1–RS18) will be removed from the nominal roll and booths.\n\nThe Master Ballot Plan remains locked and intact, with extra ballots acting as official Booth Reserves.'
        : 'Are you sure you want to INCLUDE Research Scholars per Court Order?\n\nScholars will be appended as serials RS1–RS18 across 5 department booths (Economics, Geography, Mathematics, Music, Tamil).';
      if (!confirm(confirmMsg)) return;

      const defaultText = btn.innerHTML;
      setLoading(btn, true, 'Updating...');
      try {
        const res = await api.adminToggleResearchScholars(pwd, !isCurrentlyActive);
        showToast(res.message || 'Updated Research Scholars status successfully!', 'success');
        if (container) {
          setTimeout(() => renderAdminBooths(container), 400);
        } else {
          location.reload();
        }
      } catch (err) {
        showToast(`Failed to update: ${err.message}`, 'error');
        setLoading(btn, false, defaultText);
      }
    };

    main.querySelector('#btnToggleRSBooths')?.addEventListener('click', (e) => handleToggleRS(e.currentTarget));
    main.querySelector('#btnToggleRSBoothsBanner')?.addEventListener('click', (e) => handleToggleRS(e.currentTarget));

    main.querySelector('#btnCloseSplitAlertModal')?.addEventListener('click', closeSplitModal);
    main.querySelector('#btnAckSplitAlertModal')?.addEventListener('click', closeSplitModal);
    main.querySelector('#splitAlertModalOverlay')?.addEventListener('click', closeSplitModal);

    main.querySelector('#btnCloseStrategyModal')?.addEventListener('click', closeStrategyModal);
    main.querySelector('#btnCancelStrategyModal')?.addEventListener('click', closeStrategyModal);
    main.querySelector('#strategyModalOverlay')?.addEventListener('click', closeStrategyModal);

    main.querySelector('#btnAutoAllot').addEventListener('click', () => {
      if (!booths || booths.length === 0) {
        showToast('Please configure at least 1 polling booth first.', 'error');
        return;
      }
      if (!allClasses || allClasses.length === 0) {
        showToast('No classes found in nominal roll to allot.', 'error');
        return;
      }
      const btn = main.querySelector('#btnAutoAllot');
      setLoading(btn, true, '⚡ Analyzing...');
      setTimeout(() => {
        try {
          const proposals = generateAllotmentProposals();
          setLoading(btn, false, '⚡ Auto Allot');
          if (!proposals || proposals.length === 0) {
            showToast('Unable to generate allotment proposals.', 'error');
            return;
          }
          openStrategyModal(proposals);
        } catch (err) {
          setLoading(btn, false, '⚡ Auto Allot');
          showToast(`Error generating proposals: ${err.message}`, 'error');
        }
      }, 40);
    });
  };

  refreshUI();
}

export const buildElectoralRollHtml = (booths, students, posts, classStats, nominationsResponse, plan, settings = {}) => {
  const collegeName = settings?.collegeName || CONFIG.COLLEGE_NAME || 'COLLEGE UNION ELECTION';
  const electionYear = settings?.electionYear || new Date().getFullYear().toString();
  const collegeLogo = settings?.collegeLogo || '';
  let html = '';
  
  if (!plan) {
    return `<div class="alert alert-error">❌ Master Ballot Plan not generated. Please generate it from the Ballot Printing page first.</div>`;
  }

  const sortedBooths = [...booths].sort((a, b) => a.boothNumber - b.boothNumber);

  sortedBooths.forEach((b) => {
    if (!b.classes || b.classes.length === 0) return;
    const boothStudents = students.filter(s => isStudentInBoothCheck(s, b.classes));
    const totalVoters = boothStudents.length;
    const boothClasses = b.classes.map(cn => classStats[cn]).filter(Boolean).sort(compareClassesByYearOrder);
    
    const assignments = plan.boothAssignments[b.boothNumber] || { general: null, reps: [], assocs: [] };

    html += `
    <div class="facing-sheet">
        <div class="header">
          ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:50px;max-width:130px;margin:0 auto 6px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
          <div class="college-name">${esc(collegeName)}</div>
          <div class="title">College Union Election ${esc(electionYear)} — Booth Facing Sheet</div>
        </div>
        
        <div style="font-size: 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ccc; padding-bottom: 8px;">
          <div>
            <strong>BOOTH:</strong> <span style="font-size: 20px; border: 2px solid #000; padding: 2px 12px; margin-left: 5px;">${b.boothNumber}</span>
            <span style="margin-left: 20px;"><strong>LOCATION:</strong> ${esc(b.roomName || 'UNSPECIFIED')}</span>
          </div>
          <div style="text-align: right; font-size: 10px; color: #666;">
            Ref: ${new Date().getFullYear()} Election
          </div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; margin-bottom: 20px;">
          <h4 style="border-bottom: 2px solid #000; padding-bottom: 3px; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase;">1. Allocation Statistics</h4>
          <table class="stats-table" style="flex: 1; font-size: 13px;">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="width:25%; font-size:11px;">Department</th>
                <th style="font-size:11px;">Class Name</th>
                <th style="text-align:right; width:15%; font-size:11px;">Voters</th>
              </tr>
            </thead>
            <tbody>
              ${boothClasses.map((c) => `
                <tr><td style="font-size:13px; font-weight:bold;">${esc(c.dept)}</td><td style="font-size:13px;">${esc(c.name)}</td><td style="text-align:right; font-size:13px; font-weight:bold;">${c.count}</td></tr>
              `).join('')}
              <tr style="font-weight:bold; background:#eee">
                <td colspan="2" style="font-size:12px;">TOTAL VOTERS ALLOTTED TO THIS BOOTH</td>
                <td style="text-align:right; font-size:14px;">${totalVoters}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 2. BALLOTS & BOOKS ACCOUNT -->
        <div style="margin-bottom: 12px;">
          <h4 style="border-bottom: 2px solid #000; padding-bottom: 2px; font-size: 13px; margin: 0 0 5px 0; text-transform: uppercase;">2. Ballots &amp; Books Account (To be filled by PrO)</h4>
          <table class="stats-table" style="font-size: 11px;">
            <thead>
              <tr>
                <th style="width:20%; font-size:10px;">Ballot Category</th>
                <th style="width:15%; font-size:10px;">Serial Range</th>
                <th style="width:10%; text-align:center; font-size:10px;">Total Qty</th>
                <th style="width:18%; font-size:10px;">Book IDs</th>
                <th style="width:10%; text-align:center; font-size:10px;">Ballots Used</th>
                <th style="width:10%; text-align:center; font-size:10px;">Ballots Returned</th>
                <th style="font-size:10px;">Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${(assignments.generalParts && assignments.generalParts.length > 1) ? assignments.generalParts.map(gp => `
                <tr style="font-weight:bold">
                  <td style="font-size:11px;">${esc(gp.title || 'General Union Posts')}</td>
                  <td style="font-size:11px;">${gp.prefix === 'G' ? 'G' : gp.prefix + '-'}${gp.start} - ${gp.prefix === 'G' ? 'G' : gp.prefix + '-'}${gp.end}</td>
                  <td style="text-align:center; font-size:12px;">${gp.count}</td>
                  <td style="font-size:10px;">${gp.bookIds}</td>
                  <td style="height: 20px;"></td><td style="height: 20px;"></td><td style="height: 20px;"></td>
                </tr>
              `).join('') : (assignments.general ? `
                <tr style="font-weight:bold">
                  <td style="font-size:11px;">${esc(assignments.general.title || 'General Union Posts')}</td>
                  <td style="font-size:11px;">${assignments.general.prefix && assignments.general.prefix !== 'G' ? assignments.general.prefix + '-' : 'G'}${assignments.general.start} - ${assignments.general.prefix && assignments.general.prefix !== 'G' ? assignments.general.prefix + '-' : 'G'}${assignments.general.end}</td>
                  <td style="text-align:center; font-size:12px;">${assignments.general.count}</td>
                  <td style="font-size:10px;">${assignments.general.bookIds}</td>
                  <td style="height: 20px;"></td><td style="height: 20px;"></td><td style="height: 20px;"></td>
                </tr>
              ` : '')}
              ${assignments.reps.map(r => `
                <tr>
                  <td style="font-size:11px; font-weight:bold;">${esc(r.post)}</td>
                  <td style="font-size:11px;">R${r.start} - R${r.end}</td>
                  <td style="text-align:center; font-size:12px;">${r.count}</td>
                  <td style="font-size:10px;">${r.bookIds}</td>
                  <td style="height: 20px;"></td><td style="height: 20px;"></td><td style="height: 20px;"></td>
                </tr>
              `).join('')}
              ${(assignments.assocs || []).slice().sort((a, b) => String(a.post || '').localeCompare(String(b.post || ''))).map(a => `
                <tr>
                  <td style="font-size:11px; font-weight:bold;">${esc(a.post)}</td>
                  <td style="font-size:11px;">A${a.start} - A${a.end}</td>
                  <td style="text-align:center; font-size:12px;">${a.count}</td>
                  <td style="font-size:10px;">${a.bookIds}</td>
                  <td style="height: 20px;"></td><td style="height: 20px;"></td><td style="height: 20px;"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- 3. ACCOUNT OF BALLOT BOX STRIP SEALS -->
        <div style="margin-bottom: 12px;">
          <h4 style="border-bottom: 2px solid #000; padding-bottom: 2px; font-size: 13px; margin: 0 0 5px 0; text-transform: uppercase;">3. Account of Ballot Box Strip Seals (To be filled by PrO)</h4>
          <table class="stats-table" style="font-size: 11px;">
            <thead>
              <tr>
                <th style="width: 5%; text-align: center; font-size: 10px;">Sl.</th>
                <th style="width: 47%; font-size: 10px;">Item / Description</th>
                <th style="width: 18%; text-align: center; font-size: 10px;">Number (Count)</th>
                <th style="width: 30%; font-size: 10px;">Serial Number(s)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center; font-weight: bold;">1</td>
                <td style="font-weight: 600;">Number of Strip Seals Issued</td>
                <td style="text-align: center; height: 22px;"></td>
                <td style="height: 22px;"></td>
              </tr>
              <tr>
                <td style="text-align: center; font-weight: bold;">2</td>
                <td style="font-weight: 600;">Number of Strip Seals Used</td>
                <td style="text-align: center; height: 22px;"></td>
                <td style="height: 22px;"></td>
              </tr>
              <tr>
                <td style="text-align: center; font-weight: bold;">3</td>
                <td style="font-weight: 600;">Sl. Number(s) of Strip Seals Used</td>
                <td style="text-align: center; height: 22px; color: #888;">—</td>
                <td style="height: 22px;"></td>
              </tr>
              <tr>
                <td style="text-align: center; font-weight: bold;">4</td>
                <td style="font-weight: 600;">Number and Sl. Number of Strip Seals Returned (Unused)</td>
                <td style="text-align: center; height: 22px;"></td>
                <td style="height: 22px;"></td>
              </tr>
              <tr>
                <td style="text-align: center; font-weight: bold;">5</td>
                <td style="font-weight: 600;">Number and Sl. Number of Strip Seals Damaged (if any)</td>
                <td style="text-align: center; height: 22px;"></td>
                <td style="height: 22px;"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer" style="display: flex; justify-content: space-between; margin-top: 15px; padding: 0 20px;">
          <div class="sig-line">Returning Officer</div>
          <div class="sig-line">Signature of Presiding Officer</div>
        </div>
      </div>`;

    boothClasses.forEach(cls => {
      const isRSClass = cls.name.startsWith('RESEARCH SCHOLAR');
      const classStudents = students.filter(s => getStudentClassKeyBooth(s) === cls.name || String(s['CLASS']).trim() === cls.name);
      if (isRSClass) {
        classStudents.sort((a, b) => compareSl(a, b));
      } else {
        classStudents.sort((a, b) => String(a['NAME']).localeCompare(String(b['NAME'])));
      }

      html += `
      <div class="roll-page">
        <div class="roll-header">
          <div><strong>BOOTH ${b.boothNumber}</strong> | ${esc(b.roomName || 'No Room')}</div>
          <div style="text-align:center; flex-grow:1; font-weight:bold; font-size:13px;">
            ${isRSClass ? `<span style="text-transform:uppercase;">ADDENDUM — RESEARCH SCHOLARS (${esc(cls.dept)})</span>` : `College Union Election ${esc(electionYear)} — MARKED COPY (${esc(cls.name)})`}
          </div>
          <div>Dept: ${esc(cls.dept)}</div>
        </div>
        <table class="roll-table">
          <thead>
            <tr>
              <th style="width:38px">Sl.No</th>
              <th style="width:70px">Adm. No</th>
              <th>Student Name</th>
              <th style="width:160px">Class</th>
              <th style="width:100px">Voter Signature</th>
            </tr>
          </thead>
          <tbody>
            ${classStudents.map(s => `
              <tr>
                <td style="text-align:center; font-weight:bold;">${esc(String(s['Nominal Roll Serial Number'] || s['SL_NO'] || s['SL NO'] || s['Serial Number'] || s['serial_number'] || '–'))}</td>
                <td style="font-family:monospace; font-size:9px; white-space:nowrap;">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                <td style="font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(s['NAME'])}</td>
                <td style="font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(s['CLASS'])}</td>
                <td></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
    });
  });
  return html;
};

export function triggerElectoralRollPrint(html) {
  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Popup blocked! Please allow popups for this site to print.');
    return;
  }
  printWin.document.write(`
    <html>
      <head>
        <title>Electoral Rolls - Booth Allotment</title>
        <style>
          @page {
            margin: 10mm 12mm 14mm 12mm;
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-family: Arial, sans-serif;
              font-size: 8.5pt;
              font-weight: bold;
              color: #374151;
            }
            @bottom-left {
              content: "College Union Election — Electoral Roll";
              font-family: Arial, sans-serif;
              font-size: 8pt;
              color: #6b7280;
            }
          }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 0; font-size: 11px; }
          .facing-sheet { padding: 0; page-break-before: always; break-before: page; page-break-after: always; break-after: page; display: flex; flex-direction: column; min-height: 250mm; }
          .facing-sheet:first-of-type { page-break-before: avoid; break-before: avoid; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
          .college-name { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
          .title { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
          .stats-table { width: 99.5%; margin: 0 auto; border-collapse: collapse; border: 1.5px solid #555; }
          .stats-table th, .stats-table td { border: 1px solid #555; padding: 4px 6px; text-align: left; }
          .stats-table th { background: #f0f0f0; font-size: 10px; text-transform: uppercase; font-weight: bold; }
          .footer { display: flex; justify-content: space-between; margin-top: 20px; padding: 0 30px; }
          .sig-line { border-top: 1.5px solid #000; padding-top: 5px; width: 160px; text-align: center; font-size: 11px; font-weight: bold; }
          .roll-page { page-break-before: always; break-before: page; }
          .roll-page:first-of-type { page-break-before: avoid; break-before: avoid; }
          .roll-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 4px; font-size: 11px; }
          .roll-table { width: 99.5%; margin: 0 auto; border-collapse: collapse; border: 1.5px solid #555; table-layout: fixed; }
          .roll-table thead { display: table-header-group; }
          .roll-table tbody { orphans: 4; widows: 4; }
          .roll-table th { background: #e8e8e8; font-weight: bold; text-transform: uppercase; font-size: 9px; border: 1px solid #555; padding: 4px 4px; }
          .roll-table td { border: 1px solid #555; padding: 2px 4px; font-size: 10px; }
          .roll-table tr { page-break-inside: avoid; break-inside: avoid; height: 24px; }
          @media print {
            .no-print { display: none; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color: #000000 !important; border-color: #000000 !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => { printWin.print(); }, 500);
}

export async function generateAndPrintElectoralRolls(pwd) {
  showToast('Preparing Electoral Rolls...', 'info');
  try {
    let [nominalRoll, booths, posts, nominations, plan, settings] = await Promise.all([
      api.getNominalRoll(),
      api.adminGetBooths(pwd, true).catch(() => []),
      api.adminGetPosts(pwd).catch(() => []),
      api.adminGetFinalNominations(pwd).catch(() => api.getFinalNominations()).catch(() => ({ active: [] })),
      api.adminGetBallotPlan(pwd).catch(() => null),
      api.adminGetSettings(pwd).catch(() => ({}))
    ]);

    if (!plan) {
      const genRes = await api.adminGenerateBallotPlan(pwd).catch(() => null);
      plan = genRes?.plan || null;
    }

    if (!plan) {
      showToast('❌ Master Ballot Plan not generated yet. Please finalize the Master Plan first.', 'error');
      return;
    }

    const classStats = {};
    (nominalRoll || []).forEach(s => {
      const key = getStudentClassKeyBooth(s);
      if (!classStats[key]) {
        classStats[key] = {
          name: key,
          dept: String(s['Dept'] || 'General').trim(),
          count: 0
        };
      }
      classStats[key].count++;
    });

    const html = buildElectoralRollHtml(booths, nominalRoll, posts, classStats, nominations, plan, settings);
    triggerElectoralRollPrint(html);
  } catch (err) {
    showToast(`Failed to generate electoral rolls: ${err.message}`, 'error');
  }
}

export const buildBallotAccountHtml = (booths, students, posts, classStats, nominationsResponse, plan, settings = {}) => {
  const collegeName = settings?.collegeName || CONFIG.COLLEGE_NAME || 'COLLEGE UNION ELECTION';
  const electionYear = settings?.electionYear || new Date().getFullYear().toString();
  const collegeLogo = settings?.collegeLogo || '';
  let html = '';
  if (!plan) return `<div class="alert alert-error">❌ Master Ballot Plan not generated.</div>`;

  const sortedBooths = [...booths].sort((a, b) => a.boothNumber - b.boothNumber);

  sortedBooths.forEach((b) => {
    if (!b.classes || b.classes.length === 0) return;
    const assignments = plan.boothAssignments[b.boothNumber] || { general: null, reps: [], assocs: [] };

    const boothGeneralPosts = (assignments.generalParts && assignments.generalParts.length > 1)
      ? assignments.generalParts.map(gp => ({ name: gp.title || `General Union Posts - Part ${gp.partNumber}`, count: gp.count }))
      : (assignments.general ? [{ name: assignments.general.title || 'General Union Posts', count: assignments.general.count }] : []);
    const boothRepPosts = assignments.reps.map(r => ({ name: r.post, count: r.count }));
    const boothAssocPosts = assignments.assocs.map(a => ({ name: a.post, count: a.count }));
    const allBoothPosts = [...boothGeneralPosts, ...boothRepPosts, ...boothAssocPosts];

    html += `
    <div class="page-break">
      <div class="account-page">
        
        <!-- Header -->
        <div class="account-header">
          ${collegeLogo ? `<img src="${collegeLogo}" class="college-logo-img" alt="Emblem">` : ''}
          <div class="college-name">${esc(collegeName)}</div>
          <div class="account-doc-title">COLLEGE UNION ELECTION ${esc(electionYear)} &mdash; BALLOTS &amp; BOOKS ACCOUNT</div>
        </div>
        
        <!-- Booth Details Banner -->
        <div class="booth-meta-banner">
          <div class="meta-booth-id">
            <span class="meta-label">BOOTH NUMBER:</span>
            <span class="meta-booth-val">${b.boothNumber}</span>
          </div>
          <div class="meta-location">
            <span class="meta-label">LOCATION / VENUE:</span>
            <span class="meta-venue-val">${esc(b.roomName || 'UNSPECIFIED')}</span>
          </div>
        </div>

        <!-- SECTION 1: BALLOTS & BOOKS ACCOUNT -->
        <div class="account-section">
          <h4 class="section-heading">1. Ballots &amp; Books Account</h4>
          <table class="account-table table-ballots">
            <thead>
              <tr>
                <th style="width:24%;">Ballot Category</th>
                <th style="width:18%;">Serial Range</th>
                <th style="width:11%; text-align:center;">Total Qty</th>
                <th style="width:15%;">Book IDs</th>
                <th style="width:11%; text-align:center;">No. Used</th>
                <th style="width:11%; text-align:center;">No. Returned</th>
                <th style="width:10%;">Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${(assignments.generalParts && assignments.generalParts.length > 1) ? assignments.generalParts.map(gp => `
                <tr class="row-general">
                  <td class="col-cat">${esc(gp.title || 'General Union Posts')}</td>
                  <td class="col-serial">${gp.prefix === 'G' ? 'G' : gp.prefix + '-'}${gp.start} - ${gp.prefix === 'G' ? 'G' : gp.prefix + '-'}${gp.end}</td>
                  <td class="col-qty text-center">${gp.count}</td>
                  <td class="col-books">${esc(gp.bookIds || '-')}</td>
                  <td class="col-fill"></td>
                  <td class="col-fill"></td>
                  <td class="col-fill"></td>
                </tr>
              `).join('') : (assignments.general ? `
                <tr class="row-general">
                  <td class="col-cat">${esc(assignments.general.title || 'General Union Posts')}</td>
                  <td class="col-serial">${assignments.general.prefix && assignments.general.prefix !== 'G' ? assignments.general.prefix + '-' : 'G'}${assignments.general.start} - ${assignments.general.prefix && assignments.general.prefix !== 'G' ? assignments.general.prefix + '-' : 'G'}${assignments.general.end}</td>
                  <td class="col-qty text-center">${assignments.general.count}</td>
                  <td class="col-books">${esc(assignments.general.bookIds || '-')}</td>
                  <td class="col-fill"></td>
                  <td class="col-fill"></td>
                  <td class="col-fill"></td>
                </tr>
              ` : '')}
              ${assignments.reps.map(r => `
                <tr>
                  <td class="col-cat">${esc(r.post)}</td>
                  <td class="col-serial">R${r.start} - R${r.end}</td>
                  <td class="col-qty text-center">${r.count}</td>
                  <td class="col-books">${esc(r.bookIds || '-')}</td>
                  <td class="col-fill"></td>
                  <td class="col-fill"></td>
                  <td class="col-fill"></td>
                </tr>
              `).join('')}
              ${assignments.assocs.map(a => `
                <tr>
                  <td class="col-cat">${esc(a.post)}</td>
                  <td class="col-serial">A${a.start} - A${a.end}</td>
                  <td class="col-qty text-center">${a.count}</td>
                  <td class="col-books">${esc(a.bookIds || '-')}</td>
                  <td class="col-fill"></td>
                  <td class="col-fill"></td>
                  <td class="col-fill"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="account-note-box">
            <strong>Note:</strong> Total Qty should be equal to (Number of Ballots Used + Number of Ballots Returned). Please record any discrepancies in the Remarks column.
          </div>
        </div>

        <!-- SECTION 2: ACCOUNT OF BALLOT BOX STRIP SEALS -->
        <div class="account-section">
          <h4 class="section-heading">2. Account of Ballot Box Strip Seals (To be filled by PrO)</h4>
          <table class="account-table table-seals">
            <thead>
              <tr>
                <th style="width: 6%; text-align: center;">Sl.</th>
                <th style="width: 46%;">Item / Description</th>
                <th style="width: 18%; text-align: center;">Number (Count)</th>
                <th style="width: 30%;">Serial Number(s)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="text-center font-bold">1</td>
                <td class="font-semibold">Number of Strip Seals Issued</td>
                <td class="col-fill text-center"></td>
                <td class="col-fill"></td>
              </tr>
              <tr>
                <td class="text-center font-bold">2</td>
                <td class="font-semibold">Number of Strip Seals Used</td>
                <td class="col-fill text-center"></td>
                <td class="col-fill"></td>
              </tr>
              <tr>
                <td class="text-center font-bold">3</td>
                <td class="font-semibold">Sl. Number(s) of Strip Seals Used</td>
                <td class="text-center text-muted">&mdash;</td>
                <td class="col-fill"></td>
              </tr>
              <tr>
                <td class="text-center font-bold">4</td>
                <td class="font-semibold">Number and Sl. Number of Strip Seals Returned (Unused)</td>
                <td class="col-fill text-center"></td>
                <td class="col-fill"></td>
              </tr>
              <tr>
                <td class="text-center font-bold">5</td>
                <td class="font-semibold">Number and Sl. Number of Strip Seals Damaged (if any)</td>
                <td class="col-fill text-center"></td>
                <td class="col-fill"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- SECTION 3: ACCOUNT OF VOTES -->
        <div class="account-section">
          <h4 class="section-heading">3. Account of Votes (To be filled by PrO)</h4>
          <table class="account-table table-votes">
            <thead>
              <tr>
                <th style="width:36%;">Name of Post</th>
                <th style="width:20%; text-align:center;">Total Voters Assigned</th>
                <th style="width:22%; text-align:center;">No. of Votes Recorded</th>
                <th style="width:22%;">Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${allBoothPosts.map(p => `
                <tr>
                  <td class="col-post-title">${esc(p.name)}</td>
                  <td class="col-voters-assigned text-center">${p.count}</td>
                  <td class="col-fill"></td>
                  <td class="col-fill"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Footer / Signature -->
        <div class="account-footer">
          <div class="footer-meta">
            <div class="date-field"><strong>Date:</strong> ________________________</div>
            <div class="booth-field"><strong>Polling Station / Booth:</strong> ${b.boothNumber}</div>
          </div>
          <div class="sig-block">
            <div class="sig-line-bar"></div>
            <div class="sig-title">Signature of Presiding Officer</div>
          </div>
        </div>

      </div>
    </div>`;
  });
  return html;
};

export function triggerBallotAccountPrint(html) {
  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Popup blocked! Please allow popups for this site to print.');
    return;
  }
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ballot Accounts - Booth Wise</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 8mm 6mm 8mm;
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-family: Arial, sans-serif;
              font-size: 7.5pt;
              font-weight: bold;
              color: #000000;
            }
            @bottom-left {
              content: "College Union Election — Ballot Paper Account";
              font-family: Arial, sans-serif;
              font-size: 7.5pt;
              color: #000000;
            }
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #000000;
            background: #e2e8f0;
            line-height: 1.25;
            font-size: 8.5pt;
          }

          .screen-topbar {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: #000000;
            color: #ffffff;
            padding: 8px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }
          .topbar-btn {
            background: #000000;
            color: #ffffff;
            border: 1.5px solid #ffffff;
            padding: 6px 14px;
            font-weight: 700;
            font-size: 12px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .topbar-btn:hover { background: #333333; }

          .page-break {
            page-break-after: always;
            break-after: page;
            display: flex;
            justify-content: center;
            margin: 6mm auto;
          }

          .account-page {
            width: 194mm;
            height: 283mm;
            min-height: 283mm;
            max-height: 283mm;
            background: #ffffff;
            padding: 5mm 6mm 4mm 6mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
            border: 2px solid #000000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            position: relative;
            overflow: hidden;
          }

          @media print {
            html, body {
              width: 210mm;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              height: 283mm !important;
              max-height: 283mm !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
            }
            .account-page {
              width: 100% !important;
              height: 100% !important;
              min-height: 283mm !important;
              max-height: 283mm !important;
              border: 2px solid #000000 !important;
              box-shadow: none !important;
              padding: 5mm 6mm 4mm 6mm !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
            }
          }

          .account-header {
            text-align: center;
            border-bottom: 2px solid #000000;
            padding-bottom: 5px;
            flex-shrink: 0;
          }
          .college-logo-img {
            max-height: 44px;
            max-width: 120px;
            margin: 0 auto 3px auto;
            display: block;
            object-fit: contain;
          }
          .college-name {
            font-size: 15pt;
            font-weight: 900;
            letter-spacing: 0.5px;
            color: #000000;
            line-height: 1.15;
          }
          .account-doc-title {
            font-size: 10pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #000000;
            margin-top: 2px;
          }

          .booth-meta-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 2px solid #000000;
            background: #ffffff;
            padding: 6px 12px;
            flex-shrink: 0;
          }
          .meta-booth-id {
            display: flex;
            align-items: baseline;
            gap: 6px;
          }
          .meta-location {
            display: flex;
            align-items: baseline;
            gap: 6px;
            text-align: right;
          }
          .meta-label {
            font-size: 9.5pt;
            font-weight: 900;
            letter-spacing: 0.3px;
            color: #000000;
          }
          .meta-booth-val {
            font-size: 17pt;
            font-weight: 900;
            color: #000000;
            line-height: 1;
          }
          .meta-venue-val {
            font-size: 10.5pt;
            font-weight: 700;
            color: #000000;
          }

          .account-section {
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
          }
          .section-heading {
            font-size: 11pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            border-bottom: 2px solid #000000;
            padding-bottom: 2px;
            margin-bottom: 4px;
            color: #000000;
          }

          .account-table {
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #000000;
            background: #ffffff;
            color: #000000;
          }
          .account-table th {
            background: #f4f4f5;
            color: #000000;
            border: 1.5px solid #000000;
            padding: 6px 6px;
            font-size: 9.5pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.2px;
          }
          .account-table td {
            border: 1.5px solid #000000;
            padding: 6px 7px;
            color: #000000;
            vertical-align: middle;
            font-size: 10pt;
          }

          .table-ballots td.col-fill {
            height: 36px;
          }
          .table-seals td.col-fill {
            height: 33px;
          }
          .table-votes td.col-fill {
            height: 38px;
          }

          .col-cat {
            font-weight: 700;
            font-size: 10pt;
          }
          .row-general .col-cat {
            font-weight: 900;
          }
          .col-serial {
            font-size: 10pt;
            font-weight: 600;
            font-family: monospace;
          }
          .col-qty {
            font-size: 11pt;
            font-weight: 900;
          }
          .col-books {
            font-size: 9pt;
            font-weight: 600;
          }

          .col-post-title {
            font-weight: 800;
            font-size: 10.5pt;
          }
          .col-voters-assigned {
            font-weight: 900;
            font-size: 12pt;
          }

          .text-center { text-align: center; }
          .text-muted { color: #555555; }
          .font-bold { font-weight: 900; }
          .font-semibold { font-weight: 700; }

          .account-note-box {
            margin-top: 4px;
            font-size: 8.5pt;
            color: #000000;
            background: #ffffff;
            padding: 5px 8px;
            border: 1.5px dashed #000000;
            line-height: 1.25;
          }

          .account-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding: 2px 10px 2px 10px;
            flex-shrink: 0;
          }
          .footer-meta {
            font-size: 10pt;
            color: #000000;
            line-height: 1.6;
          }
          .sig-block {
            text-align: center;
            width: 240px;
          }
          .sig-line-bar {
            border-top: 2px solid #000000;
            margin-bottom: 5px;
            width: 100%;
          }
          .sig-title {
            font-size: 10.5pt;
            font-weight: 900;
            color: #000000;
          }
        </style>
      </head>
      <body>
        <div class="screen-topbar no-print">
          <div style="display: flex; align-items: center; gap: 12px;">
            <strong style="font-size: 14px; color: #fff;">Ballots &amp; Books Account (Form 2)</strong>
            <span style="font-size: 11px; color: #cbd5e1;">A4 Portrait &bull; Print Ready</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="topbar-btn" onclick="window.print()">
              <span>🖨️</span> Print All Booths (A4)
            </button>
            <button class="topbar-btn" style="background: #333333; border: 1.5px solid #666;" onclick="window.close()">
              <span>✕</span> Close
            </button>
          </div>
        </div>

        ${html}
      </body>
    </html>
  `);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => { printWin.print(); }, 500);
}

export async function generateAndPrintBallotAccounts(pwd) {
  showToast('Preparing Ballot Accounts...', 'info');
  try {
    let [nominalRoll, booths, posts, nominations, plan, settings] = await Promise.all([
      api.getNominalRoll(),
      api.adminGetBooths(pwd, true).catch(() => []),
      api.adminGetPosts(pwd).catch(() => []),
      api.adminGetFinalNominations(pwd).catch(() => api.getFinalNominations()).catch(() => ({ active: [] })),
      api.adminGetBallotPlan(pwd).catch(() => null),
      api.adminGetSettings(pwd).catch(() => ({}))
    ]);

    if (!plan) {
      const genRes = await api.adminGenerateBallotPlan(pwd).catch(() => null);
      plan = genRes?.plan || null;
    }

    if (!plan) {
      showToast('❌ Master Ballot Plan not generated yet. Please finalize the Master Plan first.', 'error');
      return;
    }

    const classStats = {};
    (nominalRoll || []).forEach(s => {
      const key = getStudentClassKeyBooth(s);
      if (!classStats[key]) {
        classStats[key] = {
          name: key,
          dept: String(s['Dept'] || 'General').trim(),
          count: 0
        };
      }
      classStats[key].count++;
    });

    const html = buildBallotAccountHtml(booths, nominalRoll, posts, classStats, nominations, plan, settings);
    triggerBallotAccountPrint(html);
  } catch (err) {
    showToast(`Failed to generate ballot accounts: ${err.message}`, 'error');
  }
}


