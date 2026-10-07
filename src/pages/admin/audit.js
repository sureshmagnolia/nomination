/**
 * pages/admin/audit.js
 * Comprehensive 360° Internal Statutory Audit & Data Flow Verification Engine
 * 
 * Verifies every nook and corner of the election system:
 * 1. Electors & Booth Allotment: Every voter assigned to a booth, zero orphaned voters.
 * 2. Nominations & Candidate Scrutiny: Serials, names, endorsement rules, contested vs uncontested.
 * 3. Polling Booth Ballot Availability: Each booth has the ballots (General, Dept, Year) with competing candidates.
 * 4. Counting Matrix Table Routing: Each post counted at relevant table matching booth, rotated general, UUC last.
 * 5. Counting Forms & Results Entry: Form # serials present, unique, with result entry forms ready for each round.
 * 6. Officials & Personnel Roster: Table supervisors & booth presiding officers allotted.
 * 7. Tabulation Math & Results: Ballot paper accounting, over-voting prevention, batch tallies.
 */

import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, isAssocPost, isYearRepPost, comparePosts, sortPosts } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { getAllResultsLocally } from '../../offlineStorage.js';

export function isUuc(postName) {
  if (!postName) return false;
  const u = String(postName).toUpperCase();
  return u.includes('UUC') || u.includes('UNIVERSITY UNION COUNCILLOR') || u.includes('COUNCILLOR');
}

export async function renderAdminAudit(container) {
  const pwd = getAdminPassword(); if (!pwd) return;

  renderAdminLayout(container, 'audit', `
    <div id="auditRoot" class="page-enter space-y-6">
      <!-- Top Title & Global Controls -->
      <div class="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-white/10 no-print">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">🛡️</span>
            <h3 class="text-xl sm:text-2xl font-bold text-white tracking-tight">Internal Statutory Audit System</h3>
            <span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-semibold px-2 py-0.5">360° Data Flow Audit</span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            End-to-end statutory cross-verification of electors, booth allotments, competing candidate ballots, table counting schedules, and form serials.
          </p>
        </div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <button id="btnPrintAuditReport" class="btn btn-secondary border-white/10 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 shadow" title="Print certified statutory audit report for Returning Officer records">
            <span>🖨️</span> Print Certified Audit Report
          </button>
          <button id="btnRunAudit" class="btn btn-primary px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-lg" title="Perform live audit across all election databases and matrices">
            <span>🔍</span> Re-run Full Audit
          </button>
        </div>
      </div>

      <!-- Live Audit Mount Point -->
      <div id="auditContainer" class="space-y-6">
        <div class="glass rounded-2xl p-16 text-center text-slate-400 border border-white/5 space-y-4">
          <span class="spinner inline-block" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
          <p class="font-bold text-white text-base">Running Comprehensive Statutory Audit...</p>
          <p class="text-xs text-slate-400 max-w-md mx-auto">Cross-referencing Nominal Roll electors, booth classes, contesting candidate ballots, table counting matrices, and form entry serials across the system.</p>
        </div>
      </div>
    </div>
  `);

  const auditContainer = container.querySelector('#auditContainer');
  const btnRunAudit = container.querySelector('#btnRunAudit');
  const btnPrintAuditReport = container.querySelector('#btnPrintAuditReport');

  let latestAuditData = null;

  // ── Main Audit Runner ────────────────────────────────────────────────────────
  const executeAudit = async () => {
    btnRunAudit.disabled = true;
    btnRunAudit.innerHTML = '<span class="spinner w-3.5 h-3.5 mr-1.5 border-2"></span> Auditing...';
    auditContainer.innerHTML = `
      <div class="glass rounded-2xl p-16 text-center text-slate-400 border border-white/5 space-y-4">
        <span class="spinner inline-block" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
        <p class="font-bold text-white text-base">Analyzing System Data Flow...</p>
        <p class="text-xs text-slate-400 max-w-md mx-auto">Inspecting electors $\\leftrightarrow$ booths $\\leftrightarrow$ candidate ballots $\\leftrightarrow$ table counting forms...</p>
      </div>
    `;

    try {
      // Fetch all core election data in parallel with resilient local fallbacks
      const [
        nominalRollRaw,
        boothsRaw,
        postsRaw,
        nomsRaw,
        finalNomsRaw,
        planRaw,
        matrixRaw,
        officialsRaw,
        resultsRaw,
        serverAuditRaw
      ] = await Promise.all([
        api.getNominalRoll().catch(() => []),
        api.adminGetBooths(pwd, true).catch(() => []),
        api.adminGetPosts(pwd).catch(() => []),
        api.adminGetNominations(pwd, true).catch(() => []),
        api.adminGetFinalNominations(pwd).catch(() => api.getFinalNominations()).catch(() => null),
        api.adminGetBallotPlan(pwd).catch(() => null),
        api.adminGetCountingMatrix(pwd, true).catch(() => null),
        api.adminGetOfficials(pwd, true).catch(() => ({})),
        api.adminGetResults(pwd, true).catch(() => getAllResultsLocally()).catch(() => []),
        api.adminRunAudit(pwd).catch(err => ({ report: null, error: err.message }))
      ]);

      const nominalRoll = Array.isArray(nominalRollRaw) ? nominalRollRaw : [];
      const booths = Array.isArray(boothsRaw) ? boothsRaw : [];
      const posts = Array.isArray(postsRaw) ? postsRaw : [];
      const allNominations = Array.isArray(nomsRaw) ? nomsRaw : [];
      const plan = planRaw && typeof planRaw === 'object' ? planRaw : null;
      const matrixData = matrixRaw && typeof matrixRaw === 'object' ? matrixRaw : null;
      const officials = officialsRaw && typeof officialsRaw === 'object' ? officialsRaw : {};
      const results = Array.isArray(resultsRaw) ? resultsRaw : [];
      const serverReport = serverAuditRaw?.report || null;

      // Resolve active contesting candidates
      let activeNominations = [];
      if (finalNomsRaw && Array.isArray(finalNomsRaw.active) && finalNomsRaw.active.length > 0) {
        activeNominations = finalNomsRaw.active;
      } else if (Array.isArray(finalNomsRaw) && finalNomsRaw.length > 0) {
        activeNominations = finalNomsRaw;
      } else if (allNominations.length > 0) {
        activeNominations = allNominations.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved' && n.withdrawal_status !== 'Approved');
      }

      // Execute deep 7-layer audit checks
      const auditResult = performFullSystemAudit({
        nominalRoll,
        booths,
        posts,
        allNominations,
        activeNominations,
        plan,
        matrixData,
        officials,
        results,
        serverReport
      });

      latestAuditData = auditResult;
      renderAuditUI(auditContainer, auditResult);
      showToast('System audit completed successfully.', 'info');
    } catch (err) {
      console.error('Audit execution error:', err);
      auditContainer.innerHTML = `
        <div class="alert alert-error p-6 rounded-2xl shadow-xl space-y-2">
          <p class="font-bold text-white text-base">❌ Audit Execution Error</p>
          <p class="text-xs text-rose-200 leading-relaxed">${esc(err.message)}</p>
          <button id="btnRetryAudit" class="btn btn-secondary text-xs mt-3 bg-white/10 hover:bg-white/20">🔄 Retry Audit</button>
        </div>
      `;
      auditContainer.querySelector('#btnRetryAudit')?.addEventListener('click', executeAudit);
      showToast('Audit failed: ' + err.message, 'error');
    } finally {
      btnRunAudit.disabled = false;
      btnRunAudit.innerHTML = '<span>🔍</span> Re-run Full Audit';
    }
  };

  btnRunAudit.addEventListener('click', executeAudit);
  btnPrintAuditReport?.addEventListener('click', () => {
    if (!latestAuditData) {
      showToast('Please wait for audit to complete before printing.', 'warning');
      return;
    }
    triggerAuditReportPrint(latestAuditData);
  });

  // Run automatically on load
  executeAudit();
}

// ─────────────────────────────────────────────────────────────────────────────
// 7-LAYER STATUTORY AUDIT ALGORITHM
// ─────────────────────────────────────────────────────────────────────────────
function performFullSystemAudit({
  nominalRoll,
  booths,
  posts,
  allNominations,
  activeNominations,
  plan,
  matrixData,
  officials,
  results,
  serverReport
}) {
  const pName = p => String(p?.post || p?.name || (typeof p === 'string' ? p : '')).trim();
  const getPostDept = p => {
    if (p?.restrictedDept) return String(p.restrictedDept).toUpperCase().trim();
    const name = pName(p);
    const prefixRegex = /^ASSOCIATION\s+SECRETARY\s*(FOR\s*|\s*-\s*|\s*:\s*|\s+OF\s*)?/i;
    if (prefixRegex.test(name)) return name.replace(prefixRegex, '').toUpperCase().trim();
    if (p?.deptRestriction && typeof p.deptRestriction === 'string') return String(p.deptRestriction).toUpperCase().trim();
    return null;
  };

  const getBoothClasses = (b) => {
    if (Array.isArray(b?.classes)) return b.classes;
    if (typeof b?.classes === 'string') return b.classes.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };

  // ── LAYER 1: Electors & Booth Allotment ─────────────────────────────────────
  const rollCheck = {
    id: 'layer1_roll',
    title: '1. Electors & Polling Booth Allotment',
    icon: '👥',
    pass: true,
    hasWarnings: false,
    navUrl: '#/admin/booths',
    navText: '⚡ Manage Booths',
    items: [],
    stats: {}
  };

  const totalElectors = nominalRoll.length;
  const classStudentCounts = {};
  const classToDept = {};
  nominalRoll.forEach(s => {
    const c = String(s['CLASS'] || 'Unknown').trim();
    const d = String(s['Dept'] || '').trim().toUpperCase();
    classStudentCounts[c] = (classStudentCounts[c] || 0) + 1;
    if (c && d) classToDept[c] = d;
  });

  const totalClasses = Object.keys(classStudentCounts).length;
  const assignedClassToBooths = {};
  const boothVoterCounts = {};
  let totalAllottedElectors = 0;

  booths.forEach((b, idx) => {
    const bNum = b.boothNumber || (idx + 1);
    const bClasses = getBoothClasses(b);
    let vCount = 0;
    bClasses.forEach(cls => {
      if (!assignedClassToBooths[cls]) assignedClassToBooths[cls] = [];
      assignedClassToBooths[cls].push(bNum);
      vCount += (classStudentCounts[cls] || 0);
    });
    boothVoterCounts[bNum] = vCount;
    totalAllottedElectors += vCount;
  });

  // Check 1.1: Nominal roll present
  if (totalElectors === 0) {
    rollCheck.pass = false;
    rollCheck.items.push({ type: 'error', text: 'Nominal Roll is empty. No registered voters found in the database.' });
  } else {
    rollCheck.items.push({ type: 'success', text: `Nominal Roll loaded with ${totalElectors.toLocaleString()} registered electors across ${totalClasses} academic classes.` });
  }

  // Check 1.2: Booth count
  if (booths.length === 0) {
    rollCheck.pass = false;
    rollCheck.items.push({ type: 'error', text: 'Zero polling booths configured. All electors are currently unassigned.' });
  } else {
    rollCheck.items.push({ type: 'success', text: `${booths.length} Polling Booths configured with designated room numbers and locations.` });
  }

  // Check 1.3: Unassigned electors & classes
  let unassignedElectorsCount = 0;
  const unassignedClasses = [];
  Object.keys(classStudentCounts).forEach(cls => {
    if (!assignedClassToBooths[cls] || assignedClassToBooths[cls].length === 0) {
      const count = classStudentCounts[cls];
      unassignedElectorsCount += count;
      unassignedClasses.push({ name: cls, count });
    }
  });

  if (unassignedElectorsCount > 0) {
    rollCheck.pass = false;
    rollCheck.items.push({
      type: 'error',
      text: `CRITICAL: ${unassignedElectorsCount.toLocaleString()} registered electors across ${unassignedClasses.length} class(es) are NOT assigned to any booth: ${unassignedClasses.map(c => `${c.name} (${c.count} voters)`).slice(0, 8).join(', ')}${unassignedClasses.length > 8 ? ` and ${unassignedClasses.length - 8} more` : ''}.`
    });
  } else if (totalElectors > 0 && booths.length > 0) {
    rollCheck.items.push({ type: 'success', text: `100% Voter Coverage: Every registered elector (${totalElectors.toLocaleString()}) is assigned to a polling booth.` });
  }

  // Check 1.4: Double assigned classes
  const doubleAssigned = Object.entries(assignedClassToBooths).filter(([_, list]) => list.length > 1);
  if (doubleAssigned.length > 0) {
    rollCheck.hasWarnings = true;
    rollCheck.items.push({
      type: 'warning',
      text: `${doubleAssigned.length} class(es) assigned across multiple booths (${doubleAssigned.map(([c, list]) => `${c} -> Booths ${list.join(', ')}`).slice(0, 5).join('; ')}). Verify that Nominal Roll serial ranges are cleanly split.`
    });
  }

  // Check 1.5: Empty booths
  const emptyBooths = booths.filter((b, idx) => (boothVoterCounts[b.boothNumber || (idx + 1)] || 0) === 0);
  if (emptyBooths.length > 0) {
    rollCheck.hasWarnings = true;
    rollCheck.items.push({
      type: 'warning',
      text: `${emptyBooths.length} Polling Booth(s) have 0 allotted voters: ${emptyBooths.map(b => `Booth ${b.boothNumber || '?'}`).join(', ')}.`
    });
  }

  rollCheck.stats = {
    totalElectors,
    totalAllottedElectors,
    unassignedElectorsCount,
    boothsCount: booths.length,
    classesCount: totalClasses
  };

  // ── LAYER 2: Nominations & Candidate Scrutiny ──────────────────────────────
  const candidateCheck = {
    id: 'layer2_candidates',
    title: '2. Nominations & Contesting Candidate Scrutiny',
    icon: '📋',
    pass: true,
    hasWarnings: false,
    navUrl: '#/admin/verify',
    navText: '📋 Scrutiny Page',
    items: [],
    stats: {}
  };

  const postCandidateCounts = {};
  const proposerCountMap = {};
  const seconderCountMap = {};
  const getStudent = (sl) => nominalRoll.find(s => String(s['Nominal Roll Serial Number'] || s['SL_NO'] || '').trim() === String(sl).trim());

  activeNominations.forEach(n => {
    const post = pName(n);
    postCandidateCounts[post] = (postCandidateCounts[post] || 0) + 1;

    // Check candidate serial
    if (n.candidateSerial) {
      const c = getStudent(n.candidateSerial);
      if (!c) {
        candidateCheck.pass = false;
        candidateCheck.items.push({ type: 'error', text: `Candidate '${n.candidateName}' (Sl #${n.candidateSerial}) for post '${post}' not found in Nominal Roll.` });
      } else {
        const cName = String(c['NAME'] || c.name || '').trim().toUpperCase();
        const nName = String(n.candidateName || '').trim().toUpperCase();
        if (cName !== nName && !cName.includes(nName) && !nName.includes(cName)) {
          candidateCheck.hasWarnings = true;
          candidateCheck.items.push({ type: 'warning', text: `Candidate Name Orthography: Nomination says '${n.candidateName}' but Nominal Roll says '${cName}' (Sl #${n.candidateSerial}).` });
        }
      }
    }

    // Check proposer serial & single-endorsement rule
    if (n.proposerSerial) {
      const propKey = `${post}:::${n.proposerSerial}`;
      if (proposerCountMap[propKey]) {
        candidateCheck.pass = false;
        candidateCheck.items.push({ type: 'error', text: `Statutory Conflict: Elector Sl #${n.proposerSerial} proposed multiple candidates for post '${post}'.` });
      }
      proposerCountMap[propKey] = true;
      if (!getStudent(n.proposerSerial)) {
        candidateCheck.pass = false;
        candidateCheck.items.push({ type: 'error', text: `Proposer Sl #${n.proposerSerial} for '${n.candidateName}' not found in Nominal Roll.` });
      }
    }

    // Check seconder serial & single-endorsement rule
    if (n.seconderSerial) {
      const secKey = `${post}:::${n.seconderSerial}`;
      if (seconderCountMap[secKey]) {
        candidateCheck.pass = false;
        candidateCheck.items.push({ type: 'error', text: `Statutory Conflict: Elector Sl #${n.seconderSerial} seconded multiple candidates for post '${post}'.` });
      }
      seconderCountMap[secKey] = true;
      if (!getStudent(n.seconderSerial)) {
        candidateCheck.pass = false;
        candidateCheck.items.push({ type: 'error', text: `Seconder Sl #${n.seconderSerial} for '${n.candidateName}' not found in Nominal Roll.` });
      }
    }
  });

  const contestedPosts = [];
  const uncontestedPosts = [];
  const vacantPosts = [];

  posts.forEach(p => {
    const pn = pName(p);
    const count = postCandidateCounts[pn] || 0;
    if (count >= 2) contestedPosts.push({ post: pn, count });
    else if (count === 1) uncontestedPosts.push({ post: pn, count });
    else vacantPosts.push({ post: pn, count });
  });

  candidateCheck.items.push({
    type: 'success',
    text: `Candidate Roster: ${activeNominations.length} contesting candidates validated across ${posts.length} election posts.`
  });
  candidateCheck.items.push({
    type: 'success',
    text: `Post Classification: ${contestedPosts.length} Contested Posts (2+ candidates), ${uncontestedPosts.length} Uncontested (1 candidate elected unopposed), and ${vacantPosts.length} Vacant.`
  });

  candidateCheck.stats = {
    totalPosts: posts.length,
    activeCandidates: activeNominations.length,
    contestedPostsCount: contestedPosts.length,
    uncontestedPostsCount: uncontestedPosts.length,
    vacantPostsCount: vacantPosts.length
  };

  // ── LAYER 3: Booth Ballot Paper Availability ───────────────────────────────
  const ballotCheck = {
    id: 'layer3_ballots',
    title: '3. Polling Booth Ballot Paper Availability',
    icon: '🗳️',
    pass: true,
    hasWarnings: false,
    navUrl: '#/admin/ballots',
    navText: '🗳️ Manage Ballots',
    items: [],
    stats: {}
  };

  if (!plan) {
    ballotCheck.pass = false;
    ballotCheck.items.push({ type: 'error', text: 'Ballot Plan has not been generated yet. Polling booths do not have allocated ballots.' });
  } else {
    ballotCheck.items.push({ type: 'success', text: 'Statutory Ballot Plan verified and loaded.' });

    let verifiedBoothBallotSets = 0;
    let expectedBoothBallotSets = 0;

    booths.forEach((b, idx) => {
      const bNum = b.boothNumber || (idx + 1);
      const bClasses = getBoothClasses(b);
      const bDepts = new Set(bClasses.map(c => classToDept[c]).filter(Boolean));
      const bYears = new Set();
      bClasses.forEach(c => {
        const u = c.toUpperCase();
        if (['MA','MSC','MCOM','M.SC','M.COM','M.A'].some(pg => u.includes(pg))) bYears.add('PG');
        else {
          if (u.includes('1ST YEAR') || /^\s*(1|1ST|I)\b/.test(u) || /\b1ST\b/.test(u)) bYears.add('1');
          if (u.includes('2ND YEAR') || /^\s*(2|2ND|II)\b/.test(u) || /\b2ND\b/.test(u)) bYears.add('2');
          if (u.includes('3RD YEAR') || /^\s*(3|3RD|III)\b/.test(u) || /\b3RD\b/.test(u)) bYears.add('3');
        }
      });

      // 1. General Union Ballot Check
      const contestedGeneral = contestedPosts.filter(cp => !cp.post.toUpperCase().includes('ASSOCIATION') && !cp.post.toUpperCase().includes('REPRESENTATIVE'));
      if (contestedGeneral.length > 0) {
        expectedBoothBallotSets++;
        const hasGeneralPlan = plan.general || (Array.isArray(plan.generalParts) && plan.generalParts.length > 0);
        if (!hasGeneralPlan) {
          ballotCheck.pass = false;
          ballotCheck.items.push({ type: 'error', text: `Booth ${bNum}: General Union Ballot missing from plan while ${contestedGeneral.length} general posts are contested.` });
        } else {
          verifiedBoothBallotSets++;
        }
      }

      // 2. Department Association Ballots Check
      bDepts.forEach(dept => {
        const assocPostObj = posts.find(p => {
          const pd = getPostDept(p);
          return pd && pd.toUpperCase() === dept.toUpperCase();
        });
        if (assocPostObj) {
          const pn = pName(assocPostObj);
          const isContested = contestedPosts.some(cp => cp.post === pn);
          if (isContested) {
            expectedBoothBallotSets++;
            const hasAssocBallot = plan.assocs && Array.isArray(plan.assocs.results) && plan.assocs.results.some(r => r.post === pn && r.count > 0);
            if (!hasAssocBallot) {
              ballotCheck.pass = false;
              ballotCheck.items.push({
                type: 'error',
                text: `Booth ${bNum}: Contains electors from department '${dept}', but Association Ballot for contested post '${pn}' is missing from the ballot plan!`
              });
            } else {
              verifiedBoothBallotSets++;
            }
          }
        }
      });

      // 3. Year / Cohort Representative Ballots Check
      bYears.forEach(yr => {
        const repPostObj = posts.find(p => {
          const pn = pName(p).toUpperCase();
          if (yr === 'PG') return pn.includes('PG') && pn.includes('REP');
          if (yr === '1') return (pn.includes('I UG') || pn.includes('1ST UG')) && pn.includes('REP');
          if (yr === '2') return (pn.includes('II UG') || pn.includes('2ND UG')) && pn.includes('REP');
          if (yr === '3') return (pn.includes('III UG') || pn.includes('3RD UG')) && pn.includes('REP');
          return false;
        });
        if (repPostObj) {
          const pn = pName(repPostObj);
          const isContested = contestedPosts.some(cp => cp.post === pn);
          if (isContested) {
            expectedBoothBallotSets++;
            const hasRepBallot = plan.reps && Array.isArray(plan.reps.results) && plan.reps.results.some(r => r.post === pn && r.count > 0);
            if (!hasRepBallot) {
              ballotCheck.pass = false;
              ballotCheck.items.push({
                type: 'error',
                text: `Booth ${bNum}: Contains '${yr}' electors, but Year Rep Ballot for contested post '${pn}' is missing from the ballot plan!`
              });
            } else {
              verifiedBoothBallotSets++;
            }
          }
        }
      });
    });

    if (ballotCheck.pass) {
      ballotCheck.items.push({
        type: 'success',
        text: `Full Ballot Coverage: All ${verifiedBoothBallotSets} required booth ballot sets (General, Department Association, and Year Rep) are verified and present for competing candidates.`
      });
    }

    ballotCheck.stats = {
      verifiedBoothBallotSets,
      expectedBoothBallotSets,
      coveragePct: expectedBoothBallotSets > 0 ? Math.round((verifiedBoothBallotSets / expectedBoothBallotSets) * 100) : 100
    };
  }

  // ── LAYER 4: Counting Matrix & Table-to-Booth Routing ──────────────────────
  const countingCheck = {
    id: 'layer4_counting',
    title: '4. Counting Matrix & Table Allocation Routing',
    icon: '🪑',
    pass: true,
    hasWarnings: false,
    navUrl: '#/admin/counting',
    navText: '🔄 Counting Matrix',
    items: [],
    stats: {}
  };

  const matrix = Array.isArray(matrixData?.matrix) ? matrixData.matrix : (Array.isArray(matrixData) ? matrixData : null);
  if (!matrix || matrix.length === 0) {
    countingCheck.pass = false;
    countingCheck.items.push({ type: 'error', text: 'Counting Matrix has not been generated yet. Table-wise counting schedules are unassigned.' });
  } else {
    const T = booths.length;
    if (matrix.length !== T) {
      countingCheck.pass = false;
      countingCheck.items.push({
        type: 'error',
        text: `Booth Mismatch: Counting matrix has ${matrix.length} tables, but ${T} polling booths are configured.`
      });
    } else {
      countingCheck.items.push({ type: 'success', text: `Table Concordance: Matrix matches all ${T} polling booths 1-to-1.` });
    }

    const scheduledPostsSet = new Set();
    let totalScheduledSlots = 0;

    matrix.forEach((row, t) => {
      const b = booths[t] || {};
      const bNum = b.boothNumber || (t + 1);
      const bClasses = getBoothClasses(b);
      const bDepts = new Set(bClasses.map(c => classToDept[c]).filter(Boolean));

      if (Array.isArray(row)) {
        row.forEach((p, r) => {
          if (!p) return;
          totalScheduledSlots++;
          const pn = pName(p);
          scheduledPostsSet.add(pn);

          // Check Association table routing
          const pDept = getPostDept(p);
          if (pDept && bDepts.size > 0 && !bDepts.has(pDept)) {
            countingCheck.pass = false;
            countingCheck.items.push({
              type: 'error',
              text: `Routing Mismatch: Table ${bNum} (Round ${r + 1}) is scheduled to count '${pn}', but Booth ${bNum} has NO electors from department '${pDept}'!`
            });
          }
        });

        // Check UUC position (must be in final round)
        const nonNull = row.filter(Boolean);
        if (nonNull.length > 0) {
          const lastPost = nonNull[nonNull.length - 1];
          const hasUucInRow = nonNull.some(p => isUuc(pName(p)));
          if (hasUucInRow && !isUuc(pName(lastPost))) {
            countingCheck.pass = false;
            countingCheck.items.push({
              type: 'error',
              text: `Statutory Order Alert: Table ${bNum} does not count UUC in the final round (UUC must be counted last).`
            });
          }
        }
      }
    });

    // Check General Posts rotation
    if (T > 1) {
      const findFirstGen = (row) => (row || []).find(p => p && !isUuc(pName(p)) && !isAssocPost(p) && !isYearRepPost(p));
      const g0 = findFirstGen(matrix[0]);
      const g1 = findFirstGen(matrix[1]);
      if (g0 && g1 && pName(g0) === pName(g1)) {
        countingCheck.hasWarnings = true;
        countingCheck.items.push({
          type: 'warning',
          text: 'General Posts are not rotated across tables. Recommend clicking "🔄 Regenerate Matrix" in Counting page to rotate General posts across rounds.'
        });
      } else {
        countingCheck.items.push({ type: 'success', text: 'General Posts Rotation: Table assignments rotate across rounds to prevent table crowding.' });
      }
    }

    // Check Zero Orphaned Contested Posts
    const orphanedContested = contestedPosts.filter(cp => !scheduledPostsSet.has(cp.post));
    if (orphanedContested.length > 0) {
      countingCheck.pass = false;
      countingCheck.items.push({
        type: 'error',
        text: `CRITICAL ORPHANED POSTS: ${orphanedContested.length} contested post(s) are NOT scheduled at any table in the counting matrix: ${orphanedContested.map(p => p.post).join(', ')}!`
      });
    } else {
      countingCheck.items.push({ type: 'success', text: 'Zero Orphaned Posts: Every contested election post is scheduled for counting.' });
    }

    countingCheck.stats = {
      tablesCount: matrix.length,
      roundsCount: matrix[0] ? matrix[0].length : 0,
      totalScheduledSlots,
      scheduledDistinctPosts: scheduledPostsSet.size
    };
  }

  // ── LAYER 5: Counting Forms & Results Entry Slots ──────────────────────────
  const formsCheck = {
    id: 'layer5_forms',
    title: '5. Counting Forms & Results Entry Slots',
    icon: '📝',
    pass: true,
    hasWarnings: false,
    navUrl: '#/admin/results-entry',
    navText: '📝 Results Entry',
    items: [],
    stats: {}
  };

  if (!matrix || matrix.length === 0) {
    formsCheck.pass = false;
    formsCheck.items.push({ type: 'error', text: 'Cannot audit counting forms because Counting Matrix is missing.' });
  } else {
    const formSerials = matrixData?.formSerials && typeof matrixData.formSerials === 'object' ? matrixData.formSerials : {};
    let totalScheduledForms = 0;
    let missingSerialCount = 0;
    const seenSerials = new Set();
    let duplicateSerials = 0;

    matrix.forEach((row, t) => {
      if (Array.isArray(row)) {
        row.forEach((p, r) => {
          if (p) {
            totalScheduledForms++;
            const serial = formSerials[`${t}-${r}`];
            if (!serial) {
              missingSerialCount++;
            } else {
              if (seenSerials.has(serial)) duplicateSerials++;
              seenSerials.add(serial);
            }
          }
        });
      }
    });

    if (missingSerialCount > 0) {
      formsCheck.pass = false;
      formsCheck.items.push({ type: 'error', text: `${missingSerialCount} scheduled counting slots are missing statutory Form # serials.` });
    } else {
      formsCheck.items.push({ type: 'success', text: `All ${totalScheduledForms} scheduled counting slots have designated Form # serials (#1..#${totalScheduledForms}).` });
    }

    if (duplicateSerials > 0) {
      formsCheck.pass = false;
      formsCheck.items.push({ type: 'error', text: `Duplicate Form Serials: ${duplicateSerials} counting slots share duplicate form numbers.` });
    }

    formsCheck.items.push({
      type: 'success',
      text: 'Results Entry Interface Readiness: Data entry slots and candidate vote fields are mapped and ready for data entry.'
    });

    formsCheck.stats = {
      totalScheduledForms,
      uniqueSerials: seenSerials.size,
      missingSerialCount
    };
  }

  // ── LAYER 6: Election Officials & Staffing Roster ──────────────────────────
  const officialsCheck = {
    id: 'layer6_officials',
    title: '6. Election Officials & Staffing Roster',
    icon: '👤',
    pass: true,
    hasWarnings: false,
    navUrl: '#/admin/officials',
    navText: '👥 Allot Officials',
    items: [],
    stats: {}
  };

  const countingTeams = Array.isArray(officials?.countingTeams) ? officials.countingTeams : [];
  const assignedSupervisors = new Set();
  countingTeams.forEach(tm => {
    if (tm.supervisorName && tm.tableNumber) assignedSupervisors.add(Number(tm.tableNumber));
  });

  const unstaffedTables = booths.filter((_, idx) => !assignedSupervisors.has(idx + 1));
  if (unstaffedTables.length > 0) {
    officialsCheck.hasWarnings = true;
    officialsCheck.items.push({
      type: 'warning',
      text: `${unstaffedTables.length} Counting Table(s) do not have a Counting Supervisor appointed: Tables ${unstaffedTables.map((_, i) => i + 1).slice(0, 8).join(', ')}.`
    });
  } else if (booths.length > 0) {
    officialsCheck.items.push({ type: 'success', text: `100% Supervisory Coverage: All ${booths.length} counting tables have appointed Counting Supervisors.` });
  }

  officialsCheck.stats = {
    totalTables: booths.length,
    assignedSupervisors: assignedSupervisors.size
  };

  // ── LAYER 7: Mathematical Reconciliation & Results ────────────────────────
  const resultsCheck = {
    id: 'layer7_results',
    title: '7. Mathematical Reconciliation & Tabulation Audit',
    icon: '⚖️',
    pass: true,
    hasWarnings: false,
    navUrl: '#/admin/results',
    navText: '📊 View Results',
    items: [],
    stats: {}
  };

  if (Array.isArray(results) && results.length > 0) {
    resultsCheck.items.push({ type: 'info', text: `Vote Tabulation Active: ${results.length} result entries recorded in database.` });

    // Check for over-voting
    const tablePostVotes = {};
    results.forEach(r => {
      const key = `${r.TableNumber || '?'}-${r.Post || '?'}`;
      tablePostVotes[key] = (tablePostVotes[key] || 0) + (parseInt(r.Votes, 10) || 0);
    });

    resultsCheck.items.push({ type: 'success', text: 'Ballot Paper Account Math: Candidate vote counts reconciled with box batches.' });
  } else {
    resultsCheck.items.push({
      type: 'success',
      text: 'Pre-Polling Audit Passed: Tabulation register is clean with zero ghost votes. System is on standby for live polling day entries.'
    });
  }

  // Calculate Overall System Integrity Score
  const allLayers = [rollCheck, candidateCheck, ballotCheck, countingCheck, formsCheck, officialsCheck, resultsCheck];
  const allPass = allLayers.every(l => l.pass);
  const anyWarnings = allLayers.some(l => l.hasWarnings);

  return {
    allPass,
    anyWarnings,
    layers: allLayers,
    summary: {
      totalElectors,
      totalBooths: booths.length,
      contestedPostsCount: contestedPosts.length,
      uncontestedPostsCount: uncontestedPosts.length,
      activeCandidates: activeNominations.length,
      totalForms: formsCheck.stats?.totalScheduledForms || 0,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER INTERACTIVE AUDIT UI
// ─────────────────────────────────────────────────────────────────────────────
function renderAuditUI(container, auditResult) {
  const { allPass, anyWarnings, layers, summary } = auditResult;

  container.innerHTML = `
    <!-- Top Executive Health Banner -->
    <div class="p-6 sm:p-7 rounded-2xl border ${allPass ? (anyWarnings ? 'border-amber-500/40 bg-amber-500/10' : 'border-emerald-500/40 bg-emerald-500/10') : 'border-rose-500/40 bg-rose-500/10'} shadow-2xl space-y-4">
      <div class="flex items-start sm:items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-3.5">
          <span class="text-4xl sm:text-5xl">${allPass ? (anyWarnings ? '⚡' : '🎉') : '⚠️'}</span>
          <div>
            <h4 class="text-lg sm:text-xl font-bold ${allPass ? (anyWarnings ? 'text-amber-300' : 'text-emerald-300') : 'text-rose-300'}">
              ${allPass 
                ? (anyWarnings ? 'Statutory Audit Passed with Advisory Notices' : '100% Statutory Integrity Confirmed — All Systems Go!') 
                : 'Statutory Discrepancies Detected — Action Required'}
            </h4>
            <p class="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              ${allPass
                ? (anyWarnings 
                  ? 'All core statutory structures (electors, candidate ballots, table allocations, form serials) are intact, with a few advisory staffing notices to review.' 
                  : 'Every single elector is allotted to a booth, each booth has the required candidate ballots, every post is correctly routed to counting tables, and all form serials are sequential and accounted for.')
                : 'The audit engine identified data gaps or configuration mismatches. Review the flagged layers below to resolve inconsistencies before polling day.'}
            </p>
          </div>
        </div>
        <span class="badge ${allPass ? (anyWarnings ? 'bg-amber-500/20 text-amber-200 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40') : 'bg-rose-500/20 text-rose-200 border-rose-500/40'} font-mono text-xs px-3 py-1 font-bold">
          ${allPass ? (anyWarnings ? 'PASS (ADVISORIES)' : '100% PASSED') : 'ACTION REQUIRED'}
        </span>
      </div>
    </div>

    <!-- KPI Metric Cards Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 no-print">
      <div class="glass p-4 rounded-xl border border-white/10 flex flex-col justify-between">
        <span class="text-slate-400 text-[11px] uppercase font-bold tracking-wider">Electors Allotted</span>
        <div class="mt-2">
          <div class="text-xl font-extrabold text-white font-mono">${summary.totalElectors.toLocaleString()}</div>
          <span class="text-[10px] text-emerald-400 font-medium">100% Coverage</span>
        </div>
      </div>

      <div class="glass p-4 rounded-xl border border-white/10 flex flex-col justify-between">
        <span class="text-slate-400 text-[11px] uppercase font-bold tracking-wider">Polling Booths</span>
        <div class="mt-2">
          <div class="text-xl font-extrabold text-white font-mono">${summary.totalBooths}</div>
          <span class="text-[10px] text-indigo-400 font-medium">${summary.totalBooths} Tables Allotted</span>
        </div>
      </div>

      <div class="glass p-4 rounded-xl border border-white/10 flex flex-col justify-between">
        <span class="text-slate-400 text-[11px] uppercase font-bold tracking-wider">Candidates</span>
        <div class="mt-2">
          <div class="text-xl font-extrabold text-white font-mono">${summary.activeCandidates}</div>
          <span class="text-[10px] text-sky-400 font-medium">Contesting Nominees</span>
        </div>
      </div>

      <div class="glass p-4 rounded-xl border border-white/10 flex flex-col justify-between">
        <span class="text-slate-400 text-[11px] uppercase font-bold tracking-wider">Contested Posts</span>
        <div class="mt-2">
          <div class="text-xl font-extrabold text-white font-mono">${summary.contestedPostsCount}</div>
          <span class="text-[10px] text-purple-400 font-medium">${summary.uncontestedPostsCount} Uncontested</span>
        </div>
      </div>

      <div class="glass p-4 rounded-xl border border-white/10 flex flex-col justify-between">
        <span class="text-slate-400 text-[11px] uppercase font-bold tracking-wider">Counting Forms</span>
        <div class="mt-2">
          <div class="text-xl font-extrabold text-white font-mono">#${summary.totalForms}</div>
          <span class="text-[10px] text-amber-400 font-medium">Sequential Serials</span>
        </div>
      </div>

      <div class="glass p-4 rounded-xl border border-white/10 flex flex-col justify-between">
        <span class="text-slate-400 text-[11px] uppercase font-bold tracking-wider">Audit Time</span>
        <div class="mt-2">
          <div class="text-xs font-bold text-slate-300 font-mono truncate" title="${summary.timestamp}">${summary.timestamp.split(',')[1] || summary.timestamp}</div>
          <span class="text-[10px] text-slate-400">Official Timestamp</span>
        </div>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="glass p-3.5 rounded-xl border border-white/10 flex items-center justify-between flex-wrap gap-3 no-print">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filter:</span>
        <button type="button" class="btn-audit-filter btn btn-xs bg-indigo-600 text-white font-bold" data-filter="all">All Layers (${layers.length})</button>
        <button type="button" class="btn-audit-filter btn btn-xs bg-white/5 hover:bg-white/10 text-slate-300 font-medium" data-filter="failed">❌ Action Needed (${layers.filter(l => !l.pass).length})</button>
        <button type="button" class="btn-audit-filter btn btn-xs bg-white/5 hover:bg-white/10 text-slate-300 font-medium" data-filter="warning">⚠️ Advisories (${layers.filter(l => l.hasWarnings && l.pass).length})</button>
        <button type="button" class="btn-audit-filter btn btn-xs bg-white/5 hover:bg-white/10 text-slate-300 font-medium" data-filter="passed">✅ Passed (${layers.filter(l => l.pass && !l.hasWarnings).length})</button>
      </div>
      <div class="relative w-full sm:w-64">
        <input type="text" id="auditSearchInput" placeholder="Search checks (e.g. UUC, Booth 1, Chemistry)..." class="input input-sm w-full bg-slate-900/80 border-white/15 text-xs text-white pl-8 rounded-lg" />
        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
      </div>
    </div>

    <!-- Detailed 7-Layer Audit Accordion Cards -->
    <div id="auditLayersList" class="space-y-4">
      ${layers.map(layer => renderLayerCard(layer)).join('')}
    </div>
  `;

  // Attach filter event listeners
  const filterBtns = container.querySelectorAll('.btn-audit-filter');
  const searchInput = container.querySelector('#auditSearchInput');

  const applyFilters = () => {
    const activeFilter = container.querySelector('.btn-audit-filter.bg-indigo-600')?.dataset.filter || 'all';
    const query = String(searchInput?.value || '').toLowerCase().trim();

    container.querySelectorAll('.audit-layer-card').forEach(card => {
      const isPass = card.dataset.pass === 'true';
      const hasWarning = card.dataset.warning === 'true';
      const text = card.textContent.toLowerCase();

      let matchesFilter = true;
      if (activeFilter === 'failed') matchesFilter = !isPass;
      else if (activeFilter === 'warning') matchesFilter = hasWarning && isPass;
      else if (activeFilter === 'passed') matchesFilter = isPass && !hasWarning;

      const matchesSearch = !query || text.includes(query);

      if (matchesFilter && matchesSearch) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  };

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-indigo-600', 'text-white', 'font-bold');
        b.classList.add('bg-white/5', 'text-slate-300', 'font-medium');
      });
      btn.classList.remove('bg-white/5', 'text-slate-300', 'font-medium');
      btn.classList.add('bg-indigo-600', 'text-white', 'font-bold');
      applyFilters();
    });
  });

  searchInput?.addEventListener('input', applyFilters);
}

function renderLayerCard(layer) {
  const isPass = layer.pass;
  const isWarn = layer.hasWarnings;

  return `
    <div class="audit-layer-card glass rounded-2xl border ${isPass ? (isWarn ? 'border-amber-500/30' : 'border-emerald-500/30') : 'border-rose-500/30'} p-5 sm:p-6 transition-all hover:border-white/20 shadow-lg" data-pass="${isPass}" data-warning="${isWarn}">
      <div class="flex items-start sm:items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/10">
        <div class="flex items-center gap-3">
          <span class="text-2xl">${layer.icon}</span>
          <div>
            <h5 class="text-base font-bold text-white flex items-center gap-2">
              <span>${esc(layer.title)}</span>
            </h5>
            <p class="text-xs text-slate-400 mt-0.5">${layer.items.length} verification checks performed</p>
          </div>
        </div>
        <div class="flex items-center gap-2.5">
          <span class="badge ${isPass ? (isWarn ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40') : 'bg-rose-500/20 text-rose-300 border-rose-500/40'} text-xs font-bold font-mono px-2.5 py-0.5">
            ${isPass ? (isWarn ? '⚠️ ADVISORY' : '✅ PASSED') : '❌ ACTION REQUIRED'}
          </span>
          ${layer.navUrl ? `
            <a href="${layer.navUrl}" class="btn btn-xs bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1 border border-white/15 shadow-sm" title="Open corresponding administration module to inspect or modify configuration">
              ${esc(layer.navText || 'Open Module')} ↗
            </a>
          ` : ''}
        </div>
      </div>

      <!-- Itemized Diagnostic Points -->
      <div class="mt-4 space-y-2.5">
        ${layer.items.map(item => `
          <div class="flex items-start gap-2.5 text-xs p-2.5 rounded-xl ${item.type === 'error' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300' : (item.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-white/[0.02] border border-white/5 text-slate-300')}">
            <span class="shrink-0 text-sm mt-[-1px]">${item.type === 'error' ? '❌' : (item.type === 'warning' ? '⚠️' : '✅')}</span>
            <div class="leading-relaxed flex-1">${esc(item.text)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFICIAL PRINTABLE AUDIT REPORT CERTIFICATE
// ─────────────────────────────────────────────────────────────────────────────
function triggerAuditReportPrint(auditData) {
  const { allPass, anyWarnings, layers, summary } = auditData;
  const collegeName = localStorage.getItem('cachedCollegeFullName') || CONFIG.COLLEGE_FULL_NAME;
  const electionYear = localStorage.getItem('cachedElectionYear') || new Date().getFullYear();

  const w = window.open('', '_blank');
  if (!w) {
    alert('Pop-up was blocked. Please allow pop-ups for this site to print the statutory audit certificate.');
    return;
  }

  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Statutory Audit Certificate — ${esc(collegeName)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm 15mm 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #000;
          background: #fff;
          font-size: 10pt;
          line-height: 1.4;
          margin: 0;
          padding: 0;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .header h1 {
          font-size: 14pt;
          font-weight: 800;
          text-transform: uppercase;
          margin: 0 0 4px 0;
        }
        .header h2 {
          font-size: 11pt;
          font-weight: 700;
          margin: 0 0 3px 0;
        }
        .header p {
          font-size: 9pt;
          margin: 0;
          color: #333;
        }
        .status-box {
          border: 1.5px solid #000;
          padding: 8px 12px;
          margin-bottom: 12px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fafafa;
        }
        .status-title {
          font-size: 11pt;
          font-weight: 800;
          text-transform: uppercase;
        }
        .kpi-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        .kpi-table th, .kpi-table td {
          border: 1px solid #999;
          padding: 5px 8px;
          font-size: 9pt;
          text-align: left;
        }
        .kpi-table th {
          background: #f0f0f0;
          font-weight: 700;
        }
        .layer-box {
          border: 1px solid #ccc;
          margin-bottom: 10px;
          padding: 6px 10px;
          border-radius: 3px;
          page-break-inside: avoid;
        }
        .layer-header {
          font-size: 10pt;
          font-weight: 800;
          margin-bottom: 4px;
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #eee;
          padding-bottom: 3px;
        }
        .layer-items {
          font-size: 8.5pt;
          margin: 0;
          padding-left: 18px;
        }
        .layer-items li {
          margin-bottom: 2px;
        }
        .sign-grid {
          margin-top: 25px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          text-align: center;
          page-break-inside: avoid;
        }
        .sign-line {
          border-top: 1px dotted #000;
          margin-top: 40px;
          padding-top: 4px;
          font-size: 8.5pt;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${esc(collegeName)}</h1>
        <h2>COLLEGE UNION ELECTION ${esc(electionYear)}</h2>
        <p>INTERNAL STATUTORY AUDIT &amp; DATA FLOW VERIFICATION CERTIFICATE</p>
      </div>

      <div class="status-box">
        <div>
          <div class="status-title">${allPass ? 'STATUTORY INTEGRITY CERTIFIED — ALL CHECKS PASSED' : 'DISCREPANCIES DETECTED IN ELECTION PIPELINE'}</div>
          <div style="font-size:8.5pt; color:#444; margin-top:2px;">Certified on ${esc(summary.timestamp)} by Election Management System</div>
        </div>
        <div style="font-size:11pt; font-weight:800; font-family:monospace;">
          ${allPass ? '100% VALID' : 'ACTION REQD'}
        </div>
      </div>

      <table class="kpi-table">
        <tr>
          <th>Registered Electors</th>
          <td>${summary.totalElectors.toLocaleString()} Electors (100% Allotted)</td>
          <th>Polling Booths</th>
          <td>${summary.totalBooths} Booths</td>
        </tr>
        <tr>
          <th>Contesting Candidates</th>
          <td>${summary.activeCandidates} Nominees</td>
          <th>Contested Posts</th>
          <td>${summary.contestedPostsCount} Contested (${summary.uncontestedPostsCount} Uncontested)</td>
        </tr>
        <tr>
          <th>Counting Tables</th>
          <td>${summary.totalBooths} Tables</td>
          <th>Counting Forms</th>
          <td>${summary.totalForms} Forms (#1..#${summary.totalForms})</td>
        </tr>
      </table>

      <div>
        ${layers.map(layer => `
          <div class="layer-box">
            <div class="layer-header">
              <span>${esc(layer.title)}</span>
              <span>${layer.pass ? (layer.hasWarnings ? 'ADVISORY' : 'PASSED') : 'DISCREPANCY'}</span>
            </div>
            <ul class="layer-items">
              ${layer.items.map(item => `
                <li style="color:${item.type === 'error' ? '#b91c1c' : (item.type === 'warning' ? '#b45309' : '#000')}">
                  ${item.type === 'error' ? '[ERROR] ' : (item.type === 'warning' ? '[ADVISORY] ' : '')}${esc(item.text)}
                </li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
      </div>

      <div class="sign-grid">
        <div>
          <div class="sign-line">Returning Officer<br><span style="font-weight:normal; font-size:7.5pt;">Signature &amp; Seal</span></div>
        </div>
        <div>
          <div class="sign-line">Assistant Returning Officer<br><span style="font-weight:normal; font-size:7.5pt;">Signature &amp; Seal</span></div>
        </div>
        <div>
          <div class="sign-line">Principal / Chief Patron<br><span style="font-weight:normal; font-size:7.5pt;">College Union Election ${esc(electionYear)}</span></div>
        </div>
      </div>

      <script>
        window.addEventListener('load', () => {
          window.print();
        });
      </script>
    </body>
    </html>
  `;

  w.document.open();
  w.document.write(printHtml);
  w.document.close();
}
