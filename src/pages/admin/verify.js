/**
 * pages/admin/verify.js
 * Admin page to review nominations, inspect full nomination paper,
 * audit statutory rule violations, manage physical document receipt intake,
 * and perform formal scrutiny (Valid / Rejected / Pending).
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, triggerPrint, calculateAge, getStudentYearLevel, isYearEligible, formatYearRuleDescription, sortPosts, comparePosts } from '../../utils.js';
import { buildNominationPaper } from '../submitNomination.js';
import { CONFIG } from '../../config.js';

export async function renderAdminVerify(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'verify', `
    <div class="text-center py-16">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 mt-4 text-sm">Loading nominations and scrutiny rules...</p>
    </div>
  `);

  try {
    const [noms, settings, posts] = await Promise.all([
      api.adminGetNominations(pwd, true),
      api.adminGetSettings(pwd).catch(() => ({})),
      api.adminGetPosts(pwd).catch(() => api.getPosts().catch(() => CONFIG.DEFAULT_POSTS || [])),
    ]);
    renderVerifyTable(container.querySelector('#adminMain'), noms, pwd, settings, posts);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `
      <div class="glass p-8 rounded-2xl border border-rose-500/30 text-center max-w-lg mx-auto my-12">
        <div class="text-4xl mb-3">📡</div>
        <h3 class="text-lg font-bold text-rose-300">Offline &amp; No Data Cached Yet</h3>
        <p class="text-slate-400 text-sm mt-2">Cannot connect to the server, and nominations have not been cached in IndexedDB on this device yet.</p>
        <p class="text-slate-500 text-xs mt-1">Please connect to the internet once to synchronize, or import a backup.</p>
        <div class="mt-6 flex justify-center gap-3">
          <button onclick="location.reload()" class="btn btn-primary text-xs">🔄 Retry Connection</button>
        </div>
      </div>
    `;
  }
}

/**
 * Audit engine: Checks a nomination against all statutory election rules:
 * - Research Scholar exclusion (Lyngdoh)
 * - Gender reservation (Female-only posts)
 * - Age limit ceilings (UG <= 22, PG <= 25, RS <= 28)
 * - Department restrictions for Association Secretaries
 * - Year-level eligibility (INCLUDE, EXCLUDE, ALL modes)
 * - Self-nomination / Proposer-Seconder identity cross checks
 * - Duplicate endorsements by proposer or seconder for the same post
 * - Multiple candidacies across posts (Candidate must withdraw all but 1 or all get cancelled)
 */
export function getNominationRuleViolations(nom, allPosts = [], allNominations = [], settings = {}) {
  const violations = [];
  if (!nom) return violations;

  const postRule = allPosts.find(p => p.post === nom.post) || {};
  const cCls = String(nom.candidateClass || nom.candidate?.CLASS || '').toUpperCase();
  const cDept = String(nom.candidateDept || nom.candidate?.Dept || '').toUpperCase();
  const cSerial = String(nom.candidateSerial || nom.candidate?.['Nominal Roll Serial Number'] || '').trim();
  const cAdm = String(nom.candidateAdmission || nom.candidate?.['ADMISION NO'] || '').trim().toLowerCase();

  const pName = nom.proposerName || nom.proposer?.NAME || '';
  const pCls = String(nom.proposerClass || nom.proposer?.CLASS || '').toUpperCase();
  const pDept = String(nom.proposerDept || nom.proposer?.Dept || '').toUpperCase();
  const pSerial = String(nom.proposerSerial || nom.proposer?.['Nominal Roll Serial Number'] || '').trim();
  const pAdm = String(nom.proposerAdmission || nom.proposer?.['ADMISION NO'] || '').trim().toLowerCase();

  const sName = nom.seconderName || nom.seconder?.NAME || '';
  const sCls = String(nom.seconderClass || nom.seconder?.CLASS || '').toUpperCase();
  const sDept = String(nom.seconderDept || nom.seconder?.Dept || '').toUpperCase();
  const sSerial = String(nom.seconderSerial || nom.seconder?.['Nominal Roll Serial Number'] || '').trim();
  const sAdm = String(nom.seconderAdmission || nom.seconder?.['ADMISION NO'] || '').trim().toLowerCase();

  // 1. Research Scholars Lyngdoh Ineligibility (RED)
  const cLvl = getStudentYearLevel(cCls);
  if (cLvl === 'RS' || cCls.includes('RESEARCH') || cCls.includes('SCHOLAR') || cCls.includes('PHD')) {
    violations.push({
      type: 'RESEARCH_SCHOLAR',
      severity: 'error',
      message: 'Research Scholars are barred from contesting in College Union Elections under Lyngdoh Committee norms.'
    });
  }

  // 2. Gender Restriction for Reserved Posts (RED)
  if (postRule.femaleOnly && nom.gender && nom.gender !== 'Female') {
    violations.push({
      type: 'GENDER_MISMATCH',
      severity: 'error',
      message: `The post "${nom.post}" is reserved for Female candidates only (Submitted: ${nom.gender}).`
    });
  }

  // 3. Age Limit Check (Lyngdoh Committee Statutory Limits) (RED)
  if (nom.dob) {
    const d = new Date(nom.dob);
    if (!isNaN(d.getTime())) {
      const cutoffDate = settings.electionDate ? new Date(settings.electionDate) : new Date();
      let ageYears = cutoffDate.getFullYear() - d.getFullYear();
      const m = cutoffDate.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && cutoffDate.getDate() < d.getDate())) {
        ageYears--;
      }

      const isPG = cLvl === '1_PG' || cLvl === '2_PG';
      const isUG = cLvl === '1_UG' || cLvl === '2_UG' || cLvl === '3_UG';

      if (isUG && ageYears > 22) {
        violations.push({
          type: 'AGE_LIMIT_UG',
          severity: 'error',
          message: `Candidate age is ${ageYears} years, exceeding the maximum statutory UG age limit of 22 years (Lyngdoh Committee recommendations).`
        });
      } else if (isPG && ageYears > 25) {
        violations.push({
          type: 'AGE_LIMIT_PG',
          severity: 'error',
          message: `Candidate age is ${ageYears} years, exceeding the maximum statutory PG age limit of 25 years (Lyngdoh Committee recommendations).`
        });
      } else if (cLvl === 'RS' && ageYears > 28) {
        violations.push({
          type: 'AGE_LIMIT_RS',
          severity: 'error',
          message: `Candidate age is ${ageYears} years, exceeding the maximum Research Scholar age limit of 28 years.`
        });
      }
    }
  }

  // 4. Department Restriction (Association Secretaries) (RED)
  if (postRule.deptRestriction) {
    const reqDept = (postRule.restrictedDept || (String(nom.post).startsWith('Association Secretary ') ? nom.post.replace('Association Secretary ', '').trim() : '')).trim();
    if (reqDept) {
      const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const nReq = norm(reqDept);
      const matches = d => {
        const nd = norm(d);
        return nd === nReq || nd.includes(nReq) || nReq.includes(nd);
      };
      if (!matches(cDept)) {
        violations.push({
          type: 'DEPT_CANDIDATE',
          severity: 'error',
          message: `Candidate belongs to department "${nom.candidateDept || 'N/A'}", but post requires "${reqDept}".`
        });
      }
      if (!matches(pDept)) {
        violations.push({
          type: 'DEPT_PROPOSER',
          severity: 'error',
          message: `Proposer belongs to department "${nom.proposerDept || 'N/A'}", but post requires "${reqDept}".`
        });
      }
      if (!matches(sDept)) {
        violations.push({
          type: 'DEPT_SECONDER',
          severity: 'error',
          message: `Seconder belongs to department "${nom.seconderDept || 'N/A'}", but post requires "${reqDept}".`
        });
      }
    }
  }

  // 5. Year Level Restriction (RED)
  if (postRule && !isYearEligible(cCls, postRule)) {
    const desc = formatYearRuleDescription(postRule);
    violations.push({
      type: 'YEAR_ELIGIBILITY',
      severity: 'error',
      message: `Candidate class (${nom.candidateClass || 'N/A'}) does not meet the year restriction for "${nom.post}" (${desc}).`
    });
  }

  // 6. Self Endorsement & Identity Cross-Checks (RED)
  if (cSerial && pSerial && cSerial === pSerial) {
    violations.push({
      type: 'SELF_PROPOSED',
      severity: 'error',
      message: 'Candidate cannot propose themselves (Proposer serial matches candidate).'
    });
  } else if (cAdm && pAdm && cAdm === pAdm) {
    violations.push({
      type: 'SELF_PROPOSED',
      severity: 'error',
      message: 'Candidate and Proposer have the same admission number.'
    });
  }

  if (cSerial && sSerial && cSerial === sSerial) {
    violations.push({
      type: 'SELF_SECONDED',
      severity: 'error',
      message: 'Candidate cannot second themselves (Seconder serial matches candidate).'
    });
  } else if (cAdm && sAdm && cAdm === sAdm) {
    violations.push({
      type: 'SELF_SECONDED',
      severity: 'error',
      message: 'Candidate and Seconder have the same admission number.'
    });
  }

  if (pSerial && sSerial && pSerial === sSerial) {
    violations.push({
      type: 'SAME_PROPOSER_SECONDER',
      severity: 'error',
      message: 'Proposer and Seconder cannot be the same person.'
    });
  } else if (pAdm && sAdm && pAdm === sAdm) {
    violations.push({
      type: 'SAME_PROPOSER_SECONDER',
      severity: 'error',
      message: 'Proposer and Seconder have the same admission number.'
    });
  }

  // 7. Duplicate Proposer / Seconder Endorsements on the SAME post (RED)
  const otherNominationsForPost = allNominations.filter(n => n.id !== nom.id && n.post === nom.post && n.status !== 'Rejected');
  
  if (pSerial || pAdm) {
    const dupProp = otherNominationsForPost.find(n => 
      (pSerial && (String(n.proposerSerial) === pSerial || String(n.seconderSerial) === pSerial)) ||
      (pAdm && (String(n.proposerAdmission).trim().toLowerCase() === pAdm || String(n.seconderAdmission).trim().toLowerCase() === pAdm))
    );
    if (dupProp) {
      violations.push({
        type: 'DUPLICATE_PROPOSER_ENDORSEMENT',
        severity: 'error',
        message: `🚩 Proposer (Sl #${pSerial || '–'}, ${pName}) has already endorsed nomination #${dupProp.id} (${dupProp.candidateName || dupProp.candidate?.NAME || 'Candidate'}) for this same post ("${nom.post}"). A student can endorse only 1 candidate for the same post.`
      });
    }
  }

  if (sSerial || sAdm) {
    const dupSec = otherNominationsForPost.find(n => 
      (sSerial && (String(n.proposerSerial) === sSerial || String(n.seconderSerial) === sSerial)) ||
      (sAdm && (String(n.proposerAdmission).trim().toLowerCase() === sAdm || String(n.seconderAdmission).trim().toLowerCase() === sAdm))
    );
    if (dupSec) {
      violations.push({
        type: 'DUPLICATE_SECONDER_ENDORSEMENT',
        severity: 'error',
        message: `🚩 Seconder (Sl #${sSerial || '–'}, ${sName}) has already endorsed nomination #${dupSec.id} (${dupSec.candidateName || dupSec.candidate?.NAME || 'Candidate'}) for this same post ("${nom.post}"). A student can endorse only 1 candidate for the same post.`
      });
    }
  }

  // 8. Multi-Post Candidacy (FLAGGED IN RED WITH STATUTORY CANCELLATION WARNING)
  const otherCandidatures = allNominations.filter(n => n.id !== nom.id && n.status !== 'Rejected' && (
    (cSerial && String(n.candidateSerial) === cSerial) ||
    (cAdm && String(n.candidateAdmission).trim().toLowerCase() === cAdm)
  ));
  if (otherCandidatures.length > 0) {
    const otherPosts = otherCandidatures.map(n => `"${n.post}" (#${n.id})`).join(', ');
    violations.push({
      type: 'MULTIPLE_CANDIDACY',
      severity: 'error',
      message: `🚩 MULTI-POST CANDIDACY: Candidate has filed nominations for ${otherCandidatures.length + 1} posts ("${nom.post}", ${otherPosts}). Statutory Rule: The candidate MUST withdraw from all but one post before withdrawal deadline; otherwise ALL nominations will be CANCELLED!`
    });
  }

  return violations;
}

function renderVerifyTable(main, noms, pwd, settings = {}, posts = []) {
  const allNoms = Array.isArray(noms) ? [...noms] : [];
  const allPosts = Array.isArray(posts) ? [...posts] : [];

  let activeTab = 'intake'; // 'intake' (1. All Submissions) | 'not_confirmed' (2. Physical Not Received) | 'scrutiny' (3. Physical Received) | 'accepted' | 'rejected'
  let nomViewMode = localStorage.getItem('admin_verify_view_mode') || 'table'; // 'cards' | 'table' (defaults to table for admin list scrutiny)
  let arrangeMode = 'post'; // 'post' (Group by Post - Statutory) | 'latest' | 'flags' | 'serial' | 'name'
  let sortCol = null; // null | 'serial' | 'id' | 'post' | 'name' | 'status' | 'flags'
  let sortAsc = true;

  main.innerHTML = `
    <style>
      #nomTable {
        width: 100% !important;
        max-width: 100% !important;
        table-layout: fixed !important;
        border-collapse: separate;
        border-spacing: 0;
      }
      #nomTable th {
        padding: 0.55rem 0.35rem !important;
        background: rgba(15, 23, 42, 0.95) !important;
        color: #94a3b8 !important;
        font-size: 0.6875rem !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.04em !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
        user-select: none;
        overflow: hidden;
        white-space: normal !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
      }
      #nomTable th.sortable-th {
        cursor: pointer;
        transition: color 0.15s ease, background 0.15s ease;
      }
      #nomTable th.sortable-th:hover {
        color: #ffffff !important;
        background: rgba(30, 41, 59, 0.95) !important;
      }
      #nomTable td {
        padding: 0.45rem 0.35rem !important;
        font-size: 0.8125rem !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
        vertical-align: middle !important;
        overflow-wrap: break-word !important;
        word-break: break-word !important;
        white-space: normal !important;
      }
      #nomTable tr.nom-row:hover td {
        background: rgba(99, 102, 241, 0.04) !important;
      }
      #nomTable tr.post-group-header td {
        padding: 0.45rem 0.75rem !important;
        white-space: normal !important;
        word-break: break-word !important;
      }
    </style>

    <div class="page-enter space-y-4">
      <!-- Title Bar -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
        <div>
          <h3 class="text-xl font-bold text-white flex items-center gap-2">
            <span>Nomination Verification & Scrutiny</span>
            ${!navigator.onLine ? '<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold">📡 Offline Mode (IndexedDB)</span>' : ''}
          </h3>
          <p class="text-slate-400 text-sm">Verify online submissions, mark physical prints/documents received, and scrutinize eligible nominations.</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button id="btnRefreshVerify" class="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200">
            <span id="refreshIcon">🔄</span> <span>Refresh List</span>
          </button>
        </div>
      </div>

      <!-- Top Workflow Tabs -->
      <div class="flex flex-wrap items-center gap-2 border-b border-white/10 pb-0">
        <button type="button" id="tabBtnIntake" class="tab-btn px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'intake' ? 'border-indigo-400 text-white bg-indigo-950/40 shadow-lg shadow-indigo-950/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}">
          <span>📥</span> <span>1. All Submissions</span>
          <span id="tabCountIntake" class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-bold">0</span>
        </button>
        <button type="button" id="tabBtnNotConfirmed" class="tab-btn px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'not_confirmed' ? 'border-amber-400 text-white bg-amber-950/40 shadow-lg shadow-amber-950/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}">
          <span>⏳</span> <span>2. Physical Not Received</span>
          <span id="tabCountNotConfirmed" class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">0</span>
        </button>
        <button type="button" id="tabBtnScrutiny" class="tab-btn px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'scrutiny' ? 'border-sky-400 text-white bg-sky-950/40 shadow-lg shadow-sky-950/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}">
          <span>📋</span> <span>3. Physical Received</span>
          <span id="tabCountScrutiny" class="badge bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-mono font-bold">0</span>
        </button>
        <button type="button" id="tabBtnAccepted" class="tab-btn px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'accepted' ? 'border-emerald-400 text-white bg-emerald-950/40 shadow-lg shadow-emerald-950/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}">
          <span>✅</span> <span>4. Accepted Nominations</span>
          <span id="tabCountAccepted" class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">0</span>
        </button>
        <button type="button" id="tabBtnRejected" class="tab-btn px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'rejected' ? 'border-rose-400 text-white bg-rose-950/40 shadow-lg shadow-rose-950/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}">
          <span>❌</span> <span>5. Rejected Nominations</span>
          <span id="tabCountRejected" class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold">0</span>
        </button>
      </div>

      <!-- Context Information Banners -->
      <div id="bannerIntake" class="${activeTab === 'intake' ? '' : 'hidden'} text-xs bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3 text-indigo-200 leading-relaxed shadow-sm">
        💡 <strong>All Submissions:</strong> Complete registry of all online nominations filed by students. Mark physical prints and documents as received to advance candidates to Formal Scrutiny.
      </div>
      <div id="bannerNotConfirmed" class="${activeTab === 'not_confirmed' ? '' : 'hidden'} text-xs bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-amber-200 leading-relaxed shadow-sm">
        ⏳ <strong>Physical Not Received:</strong> These nominations were submitted online, but physical signed hard copies and supporting certificates have not yet been marked received. Review the list below and click <strong>Confirm Physical</strong> once received in the RO office.
      </div>
      <div id="bannerScrutiny" class="${activeTab === 'scrutiny' ? '' : 'hidden'} text-xs bg-sky-950/30 border border-sky-500/30 rounded-xl p-3 text-sky-200 leading-relaxed shadow-sm">
        📋 <strong>Formal Scrutiny (Physical Received):</strong> This view lists ONLY nominations whose signed physical hard copies and certificates have been confirmed in the RO office. Mark each nomination as <strong>Valid</strong>, <strong>Invalid (Reject)</strong>, or <strong>Pending</strong>.
      </div>
      <div id="bannerAccepted" class="${activeTab === 'accepted' ? '' : 'hidden'} text-xs bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-emerald-200 leading-relaxed shadow-sm">
        ✅ <strong>Accepted Nominations:</strong> These nominations have passed formal scrutiny and have been marked <strong>Valid</strong>. They are eligible for publication in the preliminary valid list unless withdrawn before the statutory withdrawal deadline.
      </div>
      <div id="bannerRejected" class="${activeTab === 'rejected' ? '' : 'hidden'} text-xs bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 text-rose-200 leading-relaxed shadow-sm">
        ❌ <strong>Rejected Nominations:</strong> These nominations were rejected during formal scrutiny. The statutory reason for rejection is recorded and viewable below. You can view the full paper or revert/re-scrutinize if needed upon appeal.
      </div>

      <!-- Search & Filters -->
      <div class="glass rounded-xl p-3 sm:p-4 flex flex-wrap gap-2.5 items-center w-full shadow-lg">
        <div class="relative flex-1 min-w-[200px]">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          <input type="text" id="nomSearch" class="field w-full pl-9 bg-black/20 focus:bg-black/40 transition-colors text-xs sm:text-sm py-2" placeholder="Search Candidate, ID, Post, Dept, or Roll Serial...">
        </div>
        <!-- Arrange / Self-Organize Dropdown -->
        <div class="w-full sm:w-auto shrink-0 min-w-[190px]">
          <select id="arrangeFilter" class="field w-full bg-black/20 focus:bg-black/40 transition-colors text-xs font-semibold text-indigo-300 border border-indigo-500/30 py-2" title="Self-organizing arrangement">
            <option value="post" selected>🏛️ Group by Post (Statutory)</option>
            <option value="latest">🕒 Latest Submitted 1st</option>
            <option value="flags">🚩 Flags &amp; Alerts 1st</option>
            <option value="serial">📋 Roll Serial (#1..N)</option>
            <option value="name">🔤 Candidate Name (A-Z)</option>
          </select>
        </div>
        <!-- Post Filter Dropdown -->
        <div class="w-full sm:w-auto shrink-0 min-w-[160px]">
          <select id="postFilter" class="field w-full bg-black/20 focus:bg-black/40 transition-colors text-xs font-medium py-2">
            <option value="all">All Posts</option>
          </select>
        </div>
        <!-- Status Filter Dropdown -->
        <div class="w-full sm:w-auto shrink-0 min-w-[150px]">
          <select id="statusFilter" class="field w-full bg-black/20 focus:bg-black/40 transition-colors text-xs font-medium py-2">
            <option value="all">All Statuses</option>
          </select>
        </div>
        <!-- Cards / Table Toggle -->
        <div class="flex items-center rounded-lg bg-black/40 p-1 border border-white/10 shrink-0">
          <button type="button" id="btnNomModeCards" class="btn btn-xs py-1.5 px-3 rounded text-xs flex items-center gap-1.5 transition-all ${nomViewMode === 'cards' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white'}" title="Card View (Optimized for Mobile/Phone)">
            <span>📇</span> <span>Cards</span>
          </button>
          <button type="button" id="btnNomModeTable" class="btn btn-xs py-1.5 px-3 rounded text-xs flex items-center gap-1.5 transition-all ${nomViewMode === 'table' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white'}" title="List View (Tidy & Self-Organizing)">
            <span>📑</span> <span>List</span>
          </button>
        </div>
      </div>

      <!-- Item Counter / Summary -->
      <div class="flex items-center justify-between text-xs text-slate-400 px-1">
        <span id="nomListCountText">Showing 0 nominations</span>
        <span id="nomSortHintText" class="text-[11px] text-slate-500 italic">Self-organized: Grouped by Post (Statutory Order)</span>
      </div>

      <!-- Nominations List View (Cards or Table) -->
      <div class="glass rounded-xl overflow-hidden shadow-2xl" id="nomListView">
        <div id="nomCardsContainer" class="${nomViewMode === 'cards' ? '' : 'hidden'} p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5"></div>
        <div id="nomTableContainer" class="${nomViewMode === 'table' ? '' : 'hidden'} w-full overflow-hidden">
          <table class="data-table nom-tidy-table" id="nomTable">
            <colgroup>
              <col style="width: 8%;">   <!-- # / ID -->
              <col style="width: 14%;">  <!-- Post -->
              <col style="width: 23%;">  <!-- Candidate Details -->
              <col style="width: 17%;">  <!-- Proposer & Seconder -->
              <col style="width: 18%;">  <!-- Physical Receipt / Status -->
              <col style="width: 10%;">  <!-- Flags & Alerts -->
              <col style="width: 10%;">  <!-- Action -->
            </colgroup>
            <thead><tr>
              <th class="text-center sortable-th" data-sort="serial" title="Sort by Serial / ID"># / ID <span class="sort-icon text-[9px] opacity-40 ml-0.5">↕</span></th>
              <th class="sortable-th" data-sort="post" title="Sort by Post (Statutory Order)">Post <span class="sort-icon text-[9px] opacity-40 ml-0.5">↕</span></th>
              <th class="sortable-th" data-sort="name" title="Sort by Candidate Name">Candidate Details <span class="sort-icon text-[9px] opacity-40 ml-0.5">↕</span></th>
              <th>Proposer &amp; Seconder</th>
              <th id="thStatusOrReceipt" class="sortable-th" data-sort="status" title="Sort by Physical Receipt / Status">
                ${activeTab === 'intake' || activeTab === 'not_confirmed' ? 'Physical Copy' : 'Scrutiny Status'} <span class="sort-icon text-[9px] opacity-40 ml-0.5">↕</span>
              </th>
              <th class="sortable-th" data-sort="flags" title="Sort by Flags & Alerts">Flags &amp; Alerts <span class="sort-icon text-[9px] opacity-40 ml-0.5">↕</span></th>
              <th class="text-center">Action</th>
            </tr></thead>
            <tbody id="nomTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Full Nomination Form Review Modal -->
    <div id="nomDetailModal" class="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] hidden flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      <div class="glass w-full max-w-5xl rounded-2xl shadow-2xl border border-indigo-500/30 h-[94vh] max-h-[960px] flex flex-col overflow-hidden my-auto bg-slate-950/95">
        <!-- Modal Header (Fixed at top) -->
        <div class="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3.5 bg-slate-900/90 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl font-bold border border-indigo-500/30">📄</div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-base sm:text-lg font-bold text-white">Nomination Paper Review</h4>
                <span id="modalNomIdBadge" class="font-mono text-xs text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 rounded font-bold">#</span>
                <span id="modalNomReceiptBadge" class="badge"></span>
                <span id="modalNomStatusBadge" class="badge"></span>
              </div>
              <p class="text-slate-400 text-xs mt-0.5" id="modalNomTimestamp"></p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" id="btnModalPrevNom" class="btn btn-secondary btn-sm px-2.5 py-1 text-xs" title="Previous Nomination">◀ Prev</button>
            <span id="modalNomCounter" class="text-xs font-mono text-slate-400 px-1 font-semibold">1 / 1</span>
            <button type="button" id="btnModalNextNom" class="btn btn-secondary btn-sm px-2.5 py-1 text-xs" title="Next Nomination">Next ▶</button>
            <button type="button" id="btnCloseNomDetail" class="btn btn-secondary btn-sm px-2.5 py-1 text-sm ml-2 text-slate-400 hover:text-white" title="Close Modal">✕</button>
          </div>
        </div>

        <!-- Unified Scrollable Modal Body -->
        <div id="modalScrollBody" class="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 custom-scroll">
          
          <!-- Key Particulars At A Glance -->
          <div id="modalSummaryBar" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs"></div>

          <!-- Statutory Scrutiny Audit Box (Flags in RED) -->
          <div id="modalScrutinyZone"></div>

          <!-- Rejection Reason Banner (if rejected) -->
          <div id="modalRejectionBanner" class="hidden bg-rose-500/15 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-300">
            <strong>⚠️ Statutory Rejection Reason:</strong> <span id="modalRejectionText"></span>
          </div>

          <!-- Official Printed Nomination Paper & HoD Certificate -->
          <div class="bg-slate-900/60 rounded-xl p-2 sm:p-3 border border-white/5 shadow-inner">
            <div id="modalPaperZone" class="print-zone space-y-4"></div>
          </div>

        </div>

        <!-- Modal Footer Actions (Fixed at bottom) -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 sm:px-6 py-3.5 bg-slate-900/95 shrink-0">
          <div class="flex items-center gap-2">
            <button type="button" id="btnModalPrintPaper" class="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 shadow">
              <span>🖨️</span> <span>Print Paper</span>
            </button>
            <button type="button" id="btnModalTogglePhysical" class="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs py-2 px-3.5 bg-indigo-900/40 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/40 shadow">
              <span id="modalPhysicalBtnIcon">📥</span> <span id="modalPhysicalBtnText">Mark Physical Received</span>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" id="btnModalMarkValid" class="btn btn-primary btn-sm flex items-center gap-1.5 text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg">
              <span>✅</span> <span>Valid</span>
            </button>
            <button type="button" id="btnModalMarkReject" class="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs py-2 px-4 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold border border-rose-500/40 shadow-lg">
              <span>❌</span> <span>Reject</span>
            </button>
            <button type="button" id="btnModalMarkPending" class="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 shadow" title="Reset nomination status to Pending">
              <span>↩</span> <span>Pending</span>
            </button>
            <button type="button" id="btnModalDeleteNom" class="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs py-2 px-3.5 bg-red-950/40 hover:bg-red-800 text-red-300 hover:text-white border border-red-500/40 shadow-lg" title="Permanently delete nomination">
              <span>🗑️</span> <span>Delete</span>
            </button>
            <button type="button" id="btnModalCloseFooter" class="btn btn-secondary btn-sm text-xs py-2 px-3 text-slate-300">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  let activeFilteredList = [];
  let currentDetailNomId = null;

  const detailModal = main.querySelector('#nomDetailModal');
  const paperZone = main.querySelector('#modalPaperZone');
  const scrutinyZone = main.querySelector('#modalScrutinyZone');
  const summaryBar = main.querySelector('#modalSummaryBar');
  const scrollBody = main.querySelector('#modalScrollBody');
  const idBadge = main.querySelector('#modalNomIdBadge');
  const receiptBadge = main.querySelector('#modalNomReceiptBadge');
  const statusBadge = main.querySelector('#modalNomStatusBadge');
  const tsText = main.querySelector('#modalNomTimestamp');
  const counterText = main.querySelector('#modalNomCounter');
  const btnPrev = main.querySelector('#btnModalPrevNom');
  const btnNext = main.querySelector('#btnModalNextNom');
  const btnValid = main.querySelector('#btnModalMarkValid');
  const btnReject = main.querySelector('#btnModalMarkReject');
  const btnPending = main.querySelector('#btnModalMarkPending');
  const btnTogglePhysical = main.querySelector('#btnModalTogglePhysical');
  const modalPhysicalIcon = main.querySelector('#modalPhysicalBtnIcon');
  const modalPhysicalText = main.querySelector('#modalPhysicalBtnText');
  const btnModalDelete = main.querySelector('#btnModalDeleteNom');
  const rejBanner = main.querySelector('#modalRejectionBanner');
  const rejText = main.querySelector('#modalRejectionText');

  // Populate Post Filter Dropdown (Strictly sorted in statutory order)
  const postFilterEl = main.querySelector('#postFilter');
  const updatePostFilterOptions = () => {
    const rawUniquePosts = [...new Set(allPosts.map(p => p.post).concat(allNoms.map(n => n.post)).filter(Boolean))];
    const uniquePosts = sortPosts(rawUniquePosts);
    const currVal = postFilterEl.value;
    postFilterEl.innerHTML = `
      <option value="all">All Posts (${allNoms.length})</option>
      ${uniquePosts.map(p => {
        const cnt = allNoms.filter(n => n.post === p).length;
        return `<option value="${esc(p)}" ${currVal === p ? 'selected' : ''}>${esc(p)} (${cnt})</option>`;
      }).join('')}
    `;
  };
  updatePostFilterOptions();

  // Populate Status Filter Dropdown based on active tab
  const statusFilterEl = main.querySelector('#statusFilter');
  const updateStatusFilterOptions = () => {
    if (activeTab === 'intake') {
      statusFilterEl.innerHTML = `
        <option value="all">All Submissions</option>
        <option value="received">✅ Physical Copy Received</option>
        <option value="awaiting">⏳ Awaiting Physical Copy</option>
        <option value="multi">🚩 Multi-Post Candidacies</option>
        <option value="violations">⚠️ Rule Violations Flagged</option>
      `;
    } else if (activeTab === 'not_confirmed') {
      statusFilterEl.innerHTML = `
        <option value="all">All Physical Not Received</option>
        <option value="multi">🚩 Multi-Post Candidacies</option>
        <option value="violations">⚠️ Rule Violations Flagged</option>
      `;
    } else if (activeTab === 'scrutiny') {
      statusFilterEl.innerHTML = `
        <option value="all">All Received Nominations</option>
        <option value="Pending">Pending Decision</option>
        <option value="Valid">Valid</option>
        <option value="Rejected">Rejected</option>
        <option value="multi">🚩 Multi-Post Candidacies</option>
        <option value="violations">⚠️ Rule Violations Flagged</option>
        <option value="passed">✓ All Rules Passed</option>
      `;
    } else if (activeTab === 'accepted') {
      statusFilterEl.innerHTML = `
        <option value="all">All Accepted Nominations</option>
        <option value="multi">🚩 Multi-Post Candidacies</option>
        <option value="violations">⚠️ Rule Violations Flagged</option>
        <option value="passed">✓ All Rules Passed</option>
      `;
    } else if (activeTab === 'rejected') {
      statusFilterEl.innerHTML = `
        <option value="all">All Rejected Nominations</option>
        <option value="multi">🚩 Multi-Post Candidacies</option>
        <option value="violations">⚠️ Rule Violations Flagged</option>
      `;
    }
  };
  updateStatusFilterOptions();

  // Helper to toggle physical copy receipt
  const togglePhysicalReceipt = async (nomId, targetState) => {
    const nom = allNoms.find(n => String(n.id) === String(nomId));
    if (!nom) return;

    try {
      await api.adminTogglePhysicalReceipt(pwd, nomId, targetState);
      nom.physicalReceived = targetState;
      nom.physicalReceivedAt = targetState ? new Date().toISOString() : null;
      showToast(`Nomination #${nomId}: Physical copy marked as ${targetState ? 'Received' : 'Pending'}.`, 'success');
      applyFilters();
      if (currentDetailNomId === nomId) openNomDetail(nomId);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    }
  };

  // Helper to permanently delete a nomination with confirmation
  const confirmAndDeleteNomination = async (nomId) => {
    const nom = allNoms.find(n => String(n.id) === String(nomId));
    const candName = nom ? (nom.candidateName || nom.candidate?.NAME || 'Candidate') : 'Candidate';
    const postName = nom ? nom.post : 'Post';

    const confirmed = confirm(
      `⚠️ PERMANENT DELETION CONFIRMATION\n\n` +
      `Are you sure you want to permanently delete Nomination #${nomId}?\n` +
      `• Candidate: ${candName}\n` +
      `• Post: ${postName}\n\n` +
      `This will completely remove the submission from the database. This action CANNOT be undone.`
    );
    if (!confirmed) return;

    try {
      await api.adminDeleteNomination(pwd, nomId);
      const idx = allNoms.findIndex(x => String(x.id) === String(nomId));
      if (idx !== -1) allNoms.splice(idx, 1);
      showToast(`Nomination #${nomId} permanently deleted.`, 'success');
      if (currentDetailNomId === nomId) closeNomDetail();
      updatePostFilterOptions();
      applyFilters();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  // Render Rows (Table & Cards)
  const renderRows = (data) => {
    const tbody = main.querySelector('#nomTableBody');
    const cardsDiv = main.querySelector('#nomCardsContainer');
    const thStatusOrReceipt = main.querySelector('#thStatusOrReceipt');
    if (thStatusOrReceipt) {
      const sortIcon = `<span class="sort-icon text-[9px] opacity-40 ml-0.5">↕</span>`;
      if (activeTab === 'intake' || activeTab === 'not_confirmed') thStatusOrReceipt.innerHTML = `Physical Receipt ${sortIcon}`;
      else if (activeTab === 'accepted') thStatusOrReceipt.innerHTML = `Accepted Status ${sortIcon}`;
      else if (activeTab === 'rejected') thStatusOrReceipt.innerHTML = `Rejection Reason ${sortIcon}`;
      else thStatusOrReceipt.innerHTML = `Scrutiny Status ${sortIcon}`;
    }

    const renderRowHtml = (n, systemSerial, showPostName = true) => {
      const violations = getNominationRuleViolations(n, allPosts, allNoms, settings);
      const isRS = String(n.candidateClass || '').toUpperCase().includes('RESEARCH') || String(n.candidateClass || '').toUpperCase().includes('SCHOLAR');
      const isPhysical = n.physicalReceived === true || n.physicalReceived === 'true';

      return `
      <tr id="row-${esc(n.id)}" class="nom-row hover:bg-white/[0.03] transition-colors">
        <!-- # / ID -->
        <td class="text-center py-2 px-1 bg-black/15">
          <div class="font-mono font-bold text-xs text-indigo-300">#${systemSerial}</div>
          <button type="button" class="view-nom-btn font-mono text-[10px] text-slate-400 hover:text-indigo-200 hover:underline cursor-pointer block mx-auto mt-0.5 break-all max-w-full leading-tight" data-id="${esc(n.id)}" title="Nomination ID: ${esc(n.id)} (Click to view form)">
            ${esc(n.id)}
          </button>
        </td>

        <!-- Post -->
        <td class="py-2 px-2 text-xs leading-snug">
          <div class="font-semibold text-slate-200 break-words" title="${esc(n.post)}">${esc(n.post)}</div>
        </td>

        <!-- Candidate Details -->
        <td class="py-2 px-2 text-xs leading-snug">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-bold text-white hover:text-indigo-300 cursor-pointer view-nom-btn break-words" data-id="${esc(n.id)}">
              ${esc(n.candidateName || n.candidate?.NAME || 'N/A')}
            </span>
            <span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-bold text-[10px] px-1 py-0 shrink-0" title="Electoral Roll Serial Number">
              #${esc(n.candidateSerial || n.candidate?.['Nominal Roll Serial Number'] || '–')}
            </span>
            ${isRS ? `<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] px-1 py-0 font-bold shrink-0">⚠️ RS</span>` : ''}
          </div>
          <div class="text-[11px] text-slate-300 leading-tight mt-0.5 break-words">
            ${esc(n.candidateClass || '')}${n.candidateDept ? ` · <span class="text-slate-400 text-[10px]">${esc(n.candidateDept)}</span>` : ''}
          </div>
          <div class="text-[10px] text-slate-400 font-mono leading-tight mt-0.5">
            Adm: ${esc(n.candidateAdmission || n.candidate?.['ADMISION NO'] || '–')}
          </div>
        </td>

        <!-- Proposer & Seconder -->
        <td class="py-2 px-2 text-xs leading-snug">
          <div class="text-[11px] text-slate-300 break-words">
            <span class="text-slate-500 font-mono font-semibold text-[10px]">P:</span>
            <span class="font-medium">${esc(n.proposerName || n.proposer?.NAME || 'N/A')}</span>
            <span class="text-[10px] font-mono text-slate-500 shrink-0">(#${esc(n.proposerSerial || n.proposer?.['Nominal Roll Serial Number'] || '–')})</span>
          </div>
          <div class="text-[11px] text-slate-300 mt-1 break-words">
            <span class="text-slate-500 font-mono font-semibold text-[10px]">S:</span>
            <span class="font-medium">${esc(n.seconderName || n.seconder?.NAME || 'N/A')}</span>
            <span class="text-[10px] font-mono text-slate-500 shrink-0">(#${esc(n.seconderSerial || n.seconder?.['Nominal Roll Serial Number'] || '–')})</span>
          </div>
        </td>

        <!-- Physical Copy / Scrutiny Status -->
        <td class="py-2 px-2 text-xs">
          ${activeTab === 'intake' || activeTab === 'not_confirmed' ? `
            ${!isPhysical ? `
              <button type="button" class="toggle-physical-btn btn btn-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-2 rounded text-xs inline-flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer w-full text-center flex-wrap" data-id="${esc(n.id)}" data-target="true" title="Confirm physical signed nomination copy & certificates received in office">
                <span>📥</span> <span>Confirm Physical</span>
              </button>
            ` : `
              <div class="flex items-center justify-between gap-1 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1 flex-wrap">
                <span class="text-emerald-300 font-bold text-xs inline-flex items-center gap-1">
                  <span>✅</span> Received
                </span>
                <button type="button" class="toggle-physical-btn text-[10px] text-slate-400 hover:text-rose-300 underline cursor-pointer" data-id="${esc(n.id)}" data-target="false" title="Click to undo physical receipt">
                  Unmark
                </button>
              </div>
            `}
            ${n.status && n.status !== 'Pending' ? `
              <div class="mt-1">
                <span class="badge badge-${n.status.toLowerCase()} text-[9px] px-1.5 py-0 font-semibold">${esc(n.status)}</span>
              </div>
            ` : ''}
          ` : activeTab === 'accepted' ? `
            <div class="flex items-center gap-1 flex-wrap">
              <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold inline-flex items-center gap-1 py-0.5 px-2">
                <span>✅</span> Valid
              </span>
              <button type="button" class="btn btn-secondary btn-xs verify-btn bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-semibold" data-id="${esc(n.id)}" data-action="Rejected" title="Move from Valid to Rejected">
                Reject
              </button>
              <button type="button" class="btn btn-secondary btn-xs verify-btn bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 px-1 py-0.5 text-[10px]" data-id="${esc(n.id)}" data-action="Pending" title="Reset nomination status to Pending">
                ↩
              </button>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-0.5 border-t border-white/5">
              <span class="text-emerald-400/90 font-medium">📥 Copy: Received</span>
              <button type="button" class="toggle-physical-btn text-slate-500 hover:text-rose-300 underline cursor-pointer" data-id="${esc(n.id)}" data-target="false" title="Revert physical copy receipt">
                Unmark
              </button>
            </div>
          ` : activeTab === 'rejected' ? `
            <div class="flex items-center gap-1 flex-wrap">
              <span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold inline-flex items-center gap-1 py-0.5 px-2">
                <span>❌</span> Rejected
              </span>
              <button type="button" class="btn btn-primary btn-xs verify-btn bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-semibold" data-id="${esc(n.id)}" data-action="Valid" title="Move from Rejected to Valid">
                Valid
              </button>
              <button type="button" class="btn btn-secondary btn-xs verify-btn bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 px-1 py-0.5 text-[10px]" data-id="${esc(n.id)}" data-action="Pending" title="Reset nomination status to Pending">
                ↩
              </button>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-0.5 border-t border-white/5">
              <span class="text-emerald-400/90 font-medium">📥 Copy: Received</span>
              <button type="button" class="toggle-physical-btn text-slate-500 hover:text-rose-300 underline cursor-pointer" data-id="${esc(n.id)}" data-target="false" title="Revert physical copy receipt">
                Unmark
              </button>
            </div>
            ${n.rejectionReason ? `
              <div class="text-[10px] text-rose-400 break-words font-medium leading-tight mt-1" title="${esc(n.rejectionReason)}">⚠️ ${esc(n.rejectionReason)}</div>
            ` : ''}
          ` : `
            <div class="flex items-center gap-1 flex-wrap">
              <button type="button" class="btn btn-primary btn-xs verify-btn bg-emerald-600/25 hover:bg-emerald-600 text-emerald-400 hover:text-white px-2 py-1 text-xs font-bold rounded ${n.status === 'Valid' ? 'opacity-40 cursor-not-allowed' : ''}" data-id="${esc(n.id)}" data-action="Valid" ${n.status === 'Valid' ? 'disabled' : ''} title="${n.status === 'Rejected' ? 'Move from Rejected to Valid' : 'Mark Valid'}">
                ${n.status === 'Rejected' ? '🔄 Valid' : '✅ Valid'}
              </button>
              <button type="button" class="btn btn-secondary btn-xs verify-btn bg-rose-600/25 hover:bg-rose-600 text-rose-400 hover:text-white px-2 py-1 text-xs font-bold rounded ${n.status === 'Rejected' ? 'opacity-40 cursor-not-allowed' : ''}" data-id="${esc(n.id)}" data-action="Rejected" ${n.status === 'Rejected' ? 'disabled' : ''} title="${n.status === 'Valid' ? 'Move from Valid to Rejected' : 'Reject'}">
                ${n.status === 'Valid' ? '🔄 Reject' : '❌ Reject'}
              </button>
              ${n.status && n.status !== 'Pending' ? `
                <button type="button" class="btn btn-secondary btn-xs verify-btn bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 px-1.5 py-1 text-xs font-semibold" data-id="${esc(n.id)}" data-action="Pending" title="Reset nomination status to Pending">
                  ↩
                </button>
              ` : ''}
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-0.5 border-t border-white/5">
              <span class="text-emerald-400/90 font-medium">📥 Copy: Received</span>
              <button type="button" class="toggle-physical-btn text-slate-500 hover:text-rose-300 underline cursor-pointer" data-id="${esc(n.id)}" data-target="false" title="Revert physical copy receipt">
                Unmark
              </button>
            </div>
            ${n.status === 'Rejected' && n.rejectionReason ? `
              <div class="text-[10px] text-rose-400 break-words font-medium leading-tight mt-1" title="${esc(n.rejectionReason)}">⚠️ ${esc(n.rejectionReason)}</div>
            ` : ''}
          `}
        </td>

        <!-- Flags & Alerts (Styled in RED) -->
        <td class="py-2 px-2 text-xs">
          ${(() => {
            if (violations.length === 0) {
              return `
                <span class="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-1.5 py-0.5 inline-flex items-center gap-1 font-medium">
                  <span>✓</span> Clear
                </span>
              `;
            }
            const multiCand = violations.find(v => v.type === 'MULTIPLE_CANDIDACY');
            return `
              <div class="flex flex-col gap-1 items-start">
                ${multiCand ? `
                  <button type="button" class="view-nom-btn badge bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 text-[10px] px-1.5 py-0.5 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors" data-id="${esc(n.id)}" title="${esc(multiCand.message)}">
                    <span>🚩 Multi-Post</span>
                  </button>
                ` : ''}
                <button type="button" class="view-nom-btn badge bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] px-1.5 py-0.5 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors" data-id="${esc(n.id)}" title="${esc(violations.map(v => v.message).join(' | '))}">
                  <span>⚠️ ${violations.length} ${violations.length === 1 ? 'Flag' : 'Flags'}</span>
                </button>
              </div>
            `;
          })()}
        </td>

        <!-- Actions -->
        <td class="text-center py-2 px-1">
          <div class="flex flex-wrap items-center justify-center gap-1">
            <button type="button" class="btn btn-secondary btn-xs view-nom-btn bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 px-2 py-1 text-xs font-semibold" data-id="${esc(n.id)}" title="View Full Nomination Paper">
              <span>📄 View</span>
            </button>
            <button type="button" class="btn btn-secondary btn-xs delete-nom-btn bg-red-950/20 hover:bg-red-700 text-red-400 hover:text-white border border-red-500/30 px-1.5 py-1 text-xs font-bold" data-id="${esc(n.id)}" title="Permanently delete nomination">
              <span>🗑️</span>
            </button>
          </div>
        </td>
      </tr>`;
    };

    const renderPostGroupHeader = (postName, items) => {
      const totalCount = items.length;
      const physCount = items.filter(n => n.physicalReceived === true || n.physicalReceived === 'true').length;
      const validCount = items.filter(n => n.status === 'Valid').length;
      const rejCount = items.filter(n => n.status === 'Rejected').length;
      const flaggedCount = items.filter(n => getNominationRuleViolations(n, allPosts, allNoms, settings).length > 0).length;

      return `
      <tr class="post-group-header">
        <td colspan="7" class="bg-gradient-to-r from-indigo-950/85 via-slate-900/95 to-slate-950/90 py-2 px-3 border-y border-indigo-500/30 shadow-sm">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2">
              <span class="text-indigo-400 text-sm">🏛️</span>
              <span class="font-bold text-white text-xs sm:text-sm tracking-wide uppercase font-mono">${esc(postName)}</span>
              <span class="badge bg-indigo-500/25 text-indigo-200 border border-indigo-500/50 text-[10px] font-mono font-bold">
                ${totalCount} ${totalCount === 1 ? 'Candidate' : 'Candidates'}
              </span>
              ${activeTab === 'intake' || activeTab === 'not_confirmed' ? `
                <span class="badge ${physCount === totalCount && totalCount > 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-300 border-white/10'} text-[10px] font-mono font-semibold">
                  ${physCount}/${totalCount} Physical Received
                </span>
              ` : activeTab === 'scrutiny' ? `
                <span class="badge bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono font-semibold">${validCount} Valid</span>
                ${rejCount > 0 ? `<span class="badge bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] font-mono font-semibold">${rejCount} Rejected</span>` : ''}
              ` : ''}
              ${flaggedCount > 0 ? `
                <span class="badge bg-rose-500/25 text-rose-300 border border-rose-500/50 text-[10px] font-bold">
                  ⚠️ ${flaggedCount} Flagged
                </span>
              ` : ''}
            </div>
            <div class="text-[11px] text-slate-400 font-mono hidden sm:block">
              Statutory Scrutiny Group
            </div>
          </div>
        </td>
      </tr>`;
    };

    // 1. Render Table Rows (Self-Organizing Post Grouping or Flat Sort)
    if (!data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-slate-500 py-12">
            ${activeTab === 'scrutiny' 
              ? 'No nominations have physical copies marked as received yet. Go to Tab 1 or Tab 2 to mark physical prints and documents received.' 
              : activeTab === 'not_confirmed'
              ? 'All submitted nominations have their physical copies confirmed! None pending.'
              : activeTab === 'accepted'
              ? 'No accepted (Valid) nominations found.'
              : activeTab === 'rejected'
              ? 'No rejected nominations found.'
              : 'No nominations found matching criteria.'}
          </td>
        </tr>`;
    } else if (arrangeMode === 'post' && !sortCol) {
      const rawPosts = [...new Set(data.map(n => n.post).filter(Boolean))];
      const uniquePosts = sortPosts(rawPosts);
      let runningIdx = 1;
      let html = '';
      uniquePosts.forEach(p => {
        const postItems = data.filter(n => n.post === p);
        if (!postItems.length) return;
        postItems.sort((a, b) => {
          const sA = parseInt(a.candidateSerial) || 0;
          const sB = parseInt(b.candidateSerial) || 0;
          if (sA && sB && sA !== sB) return sA - sB;
          const tA = new Date(a.timestamp || 0).getTime();
          const tB = new Date(b.timestamp || 0).getTime();
          if (tA !== tB) return tA - tB;
          return String(a.id).localeCompare(String(b.id));
        });
        html += renderPostGroupHeader(p, postItems);
        html += postItems.map(n => renderRowHtml(n, runningIdx++, false)).join('');
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = data.map((n, idx) => renderRowHtml(n, idx + 1, true)).join('');
    }

    // 2. Render Cards View (for mobile & card mode)
    if (cardsDiv) {
      cardsDiv.innerHTML = data.length ? data.map((n, idx) => {
        const systemSerial = idx + 1;
        const violations = getNominationRuleViolations(n, allPosts, allNoms, settings);
        const isRS = String(n.candidateClass || '').toUpperCase().includes('RESEARCH') || String(n.candidateClass || '').toUpperCase().includes('SCHOLAR');
        const isPhysical = n.physicalReceived === true || n.physicalReceived === 'true';

        return `
          <div class="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border ${violations.length ? 'border-rose-500/40 bg-rose-950/10' : 'border-white/10'} hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3.5 shadow-xl">
            <!-- Top Header: System Serial (#1), ID, Post, Status -->
            <div class="space-y-2.5">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="badge bg-indigo-500/30 text-indigo-200 border border-indigo-500/50 font-mono font-bold text-xs px-2 py-0.5" title="System Serial Number in list">
                    #${systemSerial}
                  </span>
                  <button type="button" class="view-nom-btn font-mono text-xs text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 px-2 py-0.5 rounded border border-indigo-500/30 font-bold inline-flex items-center gap-1" data-id="${esc(n.id)}" title="Click to view full form">
                    <span>📄</span> #${esc(n.id)}
                  </button>
                  <span class="text-xs font-semibold text-slate-200">${esc(n.post)}</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <span class="badge badge-${(n.status || 'pending').toLowerCase()} font-bold text-xs">${esc(n.status)}</span>
                </div>
              </div>

              <!-- Physical Receipt Status Indicator -->
              <div class="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg ${isPhysical ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-amber-950/30 border border-amber-500/30 text-amber-300'}">
                <span class="font-semibold flex items-center gap-1.5">
                  <span>${isPhysical ? '✅' : '⏳'}</span>
                  <span>Physical Copy: <strong>${isPhysical ? 'Received' : 'Awaiting Receipt'}</strong></span>
                </span>
                ${isPhysical && n.physicalReceivedAt ? `
                  <span class="text-[10px] opacity-75 font-mono">${new Date(n.physicalReceivedAt).toLocaleDateString()}</span>
                ` : ''}
              </div>

              <!-- Candidate Info -->
              <div class="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1">
                <div class="font-bold text-white text-base flex items-center gap-1.5 flex-wrap">
                  <span class="hover:text-indigo-300 cursor-pointer view-nom-btn" data-id="${esc(n.id)}">${esc(n.candidateName || n.candidate?.NAME || 'N/A')}</span>
                  <span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-bold text-[10px] px-1.5 py-0.2" title="Electoral Roll Serial Number">
                    Sl. #${esc(n.candidateSerial || n.candidate?.['Nominal Roll Serial Number'] || '–')}
                  </span>
                  ${isRS ? `<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-1.5 py-0.2 font-semibold">⚠️ Ineligible (RS)</span>` : ''}
                </div>
                <div class="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                  <span class="font-mono text-slate-400">Adm: <strong class="text-slate-200">${esc(n.candidateAdmission || n.candidate?.['ADMISION NO'] || '–')}</strong></span>
                  <span class="text-slate-500">•</span>
                  <span>${esc(n.candidateClass || '')} (${esc(n.candidateDept || '')})</span>
                </div>
              </div>

              <!-- Proposer & Seconder -->
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="bg-black/20 p-2 rounded border border-white/5 space-y-0.5">
                  <div class="text-[10px] uppercase font-bold text-slate-400">Proposer</div>
                  <div class="font-medium text-slate-200 truncate">${esc(n.proposerName || n.proposer?.NAME || 'N/A')}</div>
                  <div class="text-[10px] font-mono text-slate-400">Sl. #${esc(n.proposerSerial || n.proposer?.['Nominal Roll Serial Number'] || '–')}</div>
                </div>
                <div class="bg-black/20 p-2 rounded border border-white/5 space-y-0.5">
                  <div class="text-[10px] uppercase font-bold text-slate-400">Seconder</div>
                  <div class="font-medium text-slate-200 truncate">${esc(n.seconderName || n.seconder?.NAME || 'N/A')}</div>
                  <div class="text-[10px] font-mono text-slate-400">Sl. #${esc(n.seconderSerial || n.seconder?.['Nominal Roll Serial Number'] || '–')}</div>
                </div>
              </div>

              <!-- Scrutiny Audit & Violations in RED -->
              <div class="space-y-1.5">
                ${(() => {
                  if (violations.length === 0) {
                    return `
                      <div class="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 flex items-center justify-center gap-1.5 font-medium">
                        <span>✓</span> All Statutory Rules Passed
                      </div>
                    `;
                  }
                  const multiCand = violations.find(v => v.type === 'MULTIPLE_CANDIDACY');
                  return `
                    ${multiCand ? `
                      <div class="text-xs text-rose-200 bg-rose-950/60 border border-rose-500/50 p-2.5 rounded-lg leading-relaxed shadow-sm">
                        ${esc(multiCand.message)}
                      </div>
                    ` : ''}
                    <button type="button" class="view-nom-btn w-full badge bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs px-2.5 py-1.5 font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors" data-id="${esc(n.id)}" title="${esc(violations.map(v => v.message).join(' | '))}">
                      <span>⚠️ ${violations.length} Statutory Flag${violations.length > 1 ? 's' : ''} in RED</span>
                    </button>
                  `;
                })()}
                ${n.status === 'Rejected' && n.rejectionReason ? `
                  <div class="text-xs text-rose-400 mt-1 bg-rose-500/10 border border-rose-500/20 p-2 rounded font-medium">
                    ⚠️ ${esc(n.rejectionReason)}
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Touch-friendly Action Buttons -->
            <div class="space-y-2 pt-2 border-t border-white/10">
              <button type="button" class="btn btn-secondary btn-sm w-full view-nom-btn bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 py-2 flex items-center justify-center gap-1.5 font-bold text-xs" data-id="${esc(n.id)}">
                <span>📄</span> <span>View Full Nomination Paper</span>
              </button>

              <div class="flex items-center gap-2">
                ${activeTab === 'intake' || activeTab === 'not_confirmed' ? `
                  <button type="button" class="btn btn-sm flex-1 toggle-physical-btn ${isPhysical ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10' : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold'} py-2 text-xs" data-id="${esc(n.id)}" data-target="${isPhysical ? 'false' : 'true'}">
                    <span>${isPhysical ? '↩ Unmark Physical' : '📥 Mark Received'}</span>
                  </button>
                ` : activeTab === 'accepted' ? `
                  <button type="button" class="btn btn-secondary btn-sm flex-1 verify-btn bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 font-bold py-2 text-xs" data-id="${esc(n.id)}" data-action="Pending" title="Reset nomination status to Pending">
                    ↩ Reset
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm flex-1 verify-btn bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold py-2 text-xs" data-id="${esc(n.id)}" data-action="Rejected" title="Reject nomination">
                    ❌ Reject
                  </button>
                ` : activeTab === 'rejected' ? `
                  <button type="button" class="btn btn-primary btn-sm flex-1 verify-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 text-xs" data-id="${esc(n.id)}" data-action="Valid" title="Mark nomination as Valid">
                    ✅ Valid
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm flex-1 verify-btn bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 font-bold py-2 text-xs" data-id="${esc(n.id)}" data-action="Pending" title="Reset nomination status to Pending">
                    ↩ Reset
                  </button>
                ` : `
                  <button type="button" class="btn btn-primary btn-sm flex-1 verify-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 text-xs" data-id="${esc(n.id)}" data-action="Valid" ${n.status === 'Valid' ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''} title="${n.status === 'Rejected' ? 'Move from Rejected to Valid' : 'Mark Valid'}">
                    ${n.status === 'Rejected' ? '🔄 Move to Valid' : '✅ Valid'}
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm flex-1 verify-btn bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold py-2 text-xs" data-id="${esc(n.id)}" data-action="Rejected" ${n.status === 'Rejected' ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''} title="${n.status === 'Valid' ? 'Move from Valid to Rejected' : 'Reject'}">
                    ${n.status === 'Valid' ? '🔄 Move to Reject' : '❌ Reject'}
                  </button>
                  ${n.status && n.status !== 'Pending' ? `
                    <button type="button" class="btn btn-secondary btn-sm verify-btn bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 font-bold px-2.5 py-2 text-xs" data-id="${esc(n.id)}" data-action="Pending" title="Reset nomination status back to Pending">
                      ↩
                    </button>
                  ` : ''}
                `}

                <button type="button" class="btn btn-secondary btn-sm delete-nom-btn bg-red-900/20 hover:bg-red-700 text-red-400 hover:text-white border border-red-500/30 px-3 py-2 text-xs font-bold" data-id="${esc(n.id)}" title="Permanently Delete Nomination">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('') : `
        <div class="col-span-full text-center text-slate-500 py-12">
          <div class="text-3xl mb-2">${activeTab === 'not_confirmed' ? '🎉' : '🔍'}</div>
          <p class="text-slate-300 font-medium text-sm">
            ${activeTab === 'not_confirmed' ? 'All Physical Copies Confirmed' : activeTab === 'accepted' ? 'No accepted nominations found' : activeTab === 'rejected' ? 'No rejected nominations found' : 'No nominations found'}
          </p>
          <p class="text-xs text-slate-500 mt-1">
            ${activeTab === 'not_confirmed'
              ? 'All submitted nominations have their physical copies marked as received in office.'
              : activeTab === 'scrutiny' 
              ? 'No physical copies marked as received yet. Mark physical receipts in Tab 1 or Tab 2.' 
              : activeTab === 'accepted'
              ? 'Scrutinize nominations in Tab 2 and mark them Valid.'
              : activeTab === 'rejected'
              ? 'Nominations rejected during scrutiny will be listed here.'
              : 'Try broadening your search term or filter.'}
          </p>
        </div>
      `;
    }
  };

  const openNomDetail = (nomId) => {
    const nom = allNoms.find(n => String(n.id) === String(nomId));
    if (!nom) return;
    currentDetailNomId = nom.id;

    // Track active position in filtered list
    const idx = activeFilteredList.findIndex(n => String(n.id) === String(nom.id));
    const total = activeFilteredList.length;
    counterText.textContent = total > 0 ? `${idx + 1} / ${total}` : '1 / 1';
    btnPrev.disabled = idx <= 0;
    btnNext.disabled = idx === -1 || idx >= total - 1;

    idBadge.textContent = `#${nom.id}`;
    
    // Physical receipt badge in modal
    const isPhys = nom.physicalReceived === true || nom.physicalReceived === 'true';
    receiptBadge.className = `badge ${isPhys ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'} font-bold`;
    receiptBadge.textContent = isPhys ? 'Physical Received' : 'Awaiting Physical';

    modalPhysicalIcon.textContent = isPhys ? '↩' : '📥';
    modalPhysicalText.textContent = isPhys ? 'Unmark Physical Copy' : 'Mark Physical Received';

    statusBadge.className = `badge badge-${(nom.status || 'pending').toLowerCase()} font-bold`;
    statusBadge.textContent = nom.status || 'Pending';
    tsText.textContent = nom.timestamp ? `Submitted: ${new Date(nom.timestamp).toLocaleString()}` : '';

    if (nom.status === 'Rejected' && nom.rejectionReason) {
      rejText.textContent = nom.rejectionReason;
      rejBanner.classList.remove('hidden');
    } else {
      rejBanner.classList.add('hidden');
    }

    // Configure Modal Decision Action Buttons (Valid / Reject / Pending)
    if (btnValid) {
      const isAlreadyValid = nom.status === 'Valid';
      btnValid.disabled = isAlreadyValid;
      btnValid.style.opacity = isAlreadyValid ? '0.5' : '1';
      btnValid.style.cursor = isAlreadyValid ? 'not-allowed' : 'pointer';
      btnValid.innerHTML = isAlreadyValid ? '<span>✅ Current: Valid</span>' : '<span>✅ Move to Valid</span>';
      btnValid.title = isAlreadyValid ? 'Nomination is currently Valid' : 'Approve and mark nomination as Valid';
    }
    if (btnReject) {
      const isAlreadyRejected = nom.status === 'Rejected';
      btnReject.disabled = isAlreadyRejected;
      btnReject.style.opacity = isAlreadyRejected ? '0.5' : '1';
      btnReject.style.cursor = isAlreadyRejected ? 'not-allowed' : 'pointer';
      btnReject.innerHTML = isAlreadyRejected ? '<span>❌ Current: Rejected</span>' : '<span>❌ Move to Reject</span>';
      btnReject.title = isAlreadyRejected ? 'Nomination is currently Rejected' : 'Scrutinize and reject nomination';
    }
    if (btnPending) {
      const isPending = !nom.status || nom.status === 'Pending';
      btnPending.disabled = isPending;
      btnPending.style.opacity = isPending ? '0.5' : '1';
      btnPending.style.cursor = isPending ? 'not-allowed' : 'pointer';
      btnPending.innerHTML = isPending ? '<span>↩ Current: Pending</span>' : '<span>↩ Reset to Pending</span>';
      btnPending.title = isPending ? 'Nomination is currently awaiting decision' : 'Revert decision and reset status to Pending';
    }

    if (scrollBody) scrollBody.scrollTop = 0;

    const candName = nom.candidateName || nom.candidate?.NAME || nom.candidate?.['Name of the Student'] || 'N/A';
    const candSerial = nom.candidateSerial || nom.candidate?.['Nominal Roll Serial Number'] || nom.candidate?.serial_number || '–';
    const candAdm = nom.candidateAdmission || nom.candidate?.['ADMISION NO'] || nom.candidate?.admission_no || '–';
    const candCls = nom.candidateClass || nom.candidate?.['CLASS'] || nom.candidate?.class || '–';
    const candDept = nom.candidateDept || nom.candidate?.['Dept'] || nom.candidate?.dept || '';
    
    const propName = nom.proposerName || nom.proposer?.NAME || nom.proposer?.['Name of the Student'] || 'N/A';
    const propSerial = nom.proposerSerial || nom.proposer?.['Nominal Roll Serial Number'] || nom.proposer?.serial_number || '–';
    const propCls = nom.proposerClass || nom.proposer?.['CLASS'] || nom.proposer?.class || '';
    
    const secName = nom.seconderName || nom.seconder?.NAME || nom.seconder?.['Name of the Student'] || 'N/A';
    const secSerial = nom.seconderSerial || nom.seconder?.['Nominal Roll Serial Number'] || nom.seconder?.serial_number || '–';
    const secCls = nom.seconderClass || nom.seconder?.['CLASS'] || nom.seconder?.class || '';

    if (summaryBar) {
      summaryBar.innerHTML = `
        <div class="bg-slate-900/90 p-3 rounded-xl border border-indigo-500/30 shadow-md">
          <div class="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Contesting Post</div>
          <div class="font-bold text-white text-sm mt-1 truncate" title="${esc(nom.post)}">${esc(nom.post)}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">Gender: <strong class="text-slate-200">${esc(nom.gender || '–')}</strong></div>
        </div>
        <div class="bg-slate-900/90 p-3 rounded-xl border border-white/10 shadow-md">
          <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Candidate (Sl. #${esc(candSerial)})</div>
          <div class="font-bold text-white text-sm mt-1 truncate" title="${esc(candName)}">${esc(candName)}</div>
          <div class="text-[11px] text-slate-400 font-mono mt-0.5">Adm: <span class="text-slate-200">${esc(candAdm)}</span> • ${esc(candCls)}${candDept ? ` (${esc(candDept)})` : ''}</div>
        </div>
        <div class="bg-slate-900/90 p-3 rounded-xl border border-white/10 shadow-md">
          <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Proposer (Sl. #${esc(propSerial)})</div>
          <div class="font-medium text-slate-200 text-sm mt-1 truncate" title="${esc(propName)}">${esc(propName)}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${esc(propCls)}</div>
        </div>
        <div class="bg-slate-900/90 p-3 rounded-xl border border-white/10 shadow-md">
          <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Seconder (Sl. #${esc(secSerial)})</div>
          <div class="font-medium text-slate-200 text-sm mt-1 truncate" title="${esc(secName)}">${esc(secName)}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${esc(secCls)}</div>
        </div>
      `;
    }

    // Scrutiny Rule Violations in RED
    const violations = getNominationRuleViolations(nom, allPosts, allNoms, settings);

    let scrutinyHtml = '';
    if (violations.length > 0) {
      scrutinyHtml += `
        <div class="rounded-xl border border-rose-500/50 bg-rose-950/60 p-4 space-y-2.5 shadow-lg">
          <div class="flex items-center justify-between border-b border-rose-500/30 pb-2">
            <div class="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <span class="text-base">⚠️</span> Rule Violations & Scrutiny Warnings in RED (${violations.length})
            </div>
            <span class="badge bg-rose-500/30 text-rose-200 border border-rose-500/50 text-[10px] font-bold uppercase tracking-wider">Scrutiny Alert</span>
          </div>
          <div class="text-xs text-rose-200 space-y-2 pl-1">
            ${violations.map(v => `
              <div class="flex items-start gap-2 ${v.type === 'MULTIPLE_CANDIDACY' ? 'bg-rose-900/50 p-2.5 rounded-lg border border-rose-500/40 font-semibold' : ''}">
                <span class="text-rose-400 font-bold text-sm leading-none">•</span>
                <span class="leading-relaxed">${esc(v.message)}</span>
              </div>
            `).join('')}
          </div>
        </div>`;
    } else {
      scrutinyHtml = `
        <div class="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 flex items-center justify-between text-xs text-emerald-300 shadow-md">
          <div class="flex items-center gap-2.5">
            <span class="text-emerald-400 text-base">✅</span>
            <span><strong>Statutory Scrutiny Passed:</strong> Candidate satisfies all eligibility criteria, age limits, gender, year-level, and endorsement rules.</span>
          </div>
          <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold shrink-0">ALL RULES PASSED</span>
        </div>`;
    }

    scrutinyZone.innerHTML = scrutinyHtml;

    // Format DOB & calculate age
    let dobDisplay = nom.dob || 'N/A';
    const d = new Date(nom.dob);
    if (!isNaN(d.getTime())) {
      dobDisplay = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    const age = calculateAge(nom.dob);

    const yearVal = settings?.electionYear || new Date().getFullYear();
    const cName = settings?.collegeName || CONFIG.COLLEGE_NAME;
    const cLogo = settings?.collegeLogo || '';

    // Render official nomination form paper
    paperZone.innerHTML = buildNominationPaper(
      nom.id,
      nom.post,
      nom.gender,
      dobDisplay,
      age,
      nom.candidate,
      nom.proposer,
      nom.seconder,
      nom.status,
      yearVal,
      cName,
      cLogo
    );

    detailModal.classList.remove('hidden');
  };

  const closeNomDetail = () => {
    detailModal.classList.add('hidden');
    currentDetailNomId = null;
  };

  const applyFilters = () => {
    const q = (main.querySelector('#nomSearch').value || '').trim().toLowerCase();
    const selectedPost = main.querySelector('#postFilter')?.value || 'all';
    const s = main.querySelector('#statusFilter').value;
    const arrangeEl = main.querySelector('#arrangeFilter');
    if (arrangeEl && !sortCol) {
      arrangeMode = arrangeEl.value;
    }

    // Update Tab Counts
    const intakeCount = allNoms.length;
    const receivedCount = allNoms.filter(n => n.physicalReceived === true || n.physicalReceived === 'true').length;
    const notConfirmedCount = allNoms.filter(n => n.physicalReceived !== true && n.physicalReceived !== 'true').length;
    const acceptedCount = allNoms.filter(n => n.status === 'Valid').length;
    const rejectedCount = allNoms.filter(n => n.status === 'Rejected').length;

    main.querySelector('#tabCountIntake').textContent = intakeCount;
    main.querySelector('#tabCountScrutiny').textContent = receivedCount;
    const tabCountNotConfirmedEl = main.querySelector('#tabCountNotConfirmed');
    if (tabCountNotConfirmedEl) tabCountNotConfirmedEl.textContent = notConfirmedCount;
    main.querySelector('#tabCountAccepted').textContent = acceptedCount;
    main.querySelector('#tabCountRejected').textContent = rejectedCount;

    // Filter by active workflow tab first
    let baseList = allNoms;
    if (activeTab === 'scrutiny') {
      baseList = allNoms.filter(n => n.physicalReceived === true || n.physicalReceived === 'true');
    } else if (activeTab === 'not_confirmed') {
      baseList = allNoms.filter(n => n.physicalReceived !== true && n.physicalReceived !== 'true');
    } else if (activeTab === 'accepted') {
      baseList = allNoms.filter(n => n.status === 'Valid');
    } else if (activeTab === 'rejected') {
      baseList = allNoms.filter(n => n.status === 'Rejected');
    }

    const filtered = baseList.filter(n => {
      // 1. Post Filter
      if (selectedPost !== 'all' && n.post !== selectedPost) {
        return false;
      }

      // 2. Status / Feature Filter
      const violations = getNominationRuleViolations(n, allPosts, allNoms, settings);
      const isPhys = n.physicalReceived === true || n.physicalReceived === 'true';

      if (activeTab === 'intake') {
        if (s === 'received' && !isPhys) return false;
        if (s === 'awaiting' && isPhys) return false;
        if (s === 'multi' && !violations.some(v => v.type === 'MULTIPLE_CANDIDACY')) return false;
        if (s === 'violations' && violations.length === 0) return false;
      } else if (activeTab === 'not_confirmed') {
        if (s === 'multi' && !violations.some(v => v.type === 'MULTIPLE_CANDIDACY')) return false;
        if (s === 'violations' && violations.length === 0) return false;
      } else if (activeTab === 'scrutiny') {
        if (s === 'violations' && violations.length === 0) return false;
        if (s === 'multi' && !violations.some(v => v.type === 'MULTIPLE_CANDIDACY')) return false;
        if (s === 'passed' && violations.length > 0) return false;
        if (s !== 'all' && s !== 'violations' && s !== 'multi' && s !== 'passed') {
          if (n.status !== s) return false;
        }
      } else if (activeTab === 'accepted' || activeTab === 'rejected') {
        if (s === 'violations' && violations.length === 0) return false;
        if (s === 'multi' && !violations.some(v => v.type === 'MULTIPLE_CANDIDACY')) return false;
        if (s === 'passed' && violations.length > 0) return false;
      }

      // 3. Search Filter
      const matchSearch = !q || 
        String(n.id).toLowerCase().includes(q) || 
        String(n.candidateName || n.candidate?.NAME || '').toLowerCase().includes(q) || 
        String(n.candidateSerial || n.candidate?.['Nominal Roll Serial Number'] || '').toLowerCase().includes(q) || 
        String(n.candidateAdmission || n.candidate?.['ADMISION NO'] || '').toLowerCase().includes(q) || 
        String(n.candidateDept || '').toLowerCase().includes(q) || 
        String(n.proposerName || '').toLowerCase().includes(q) || 
        String(n.seconderName || '').toLowerCase().includes(q) || 
        String(n.post).toLowerCase().includes(q);

      return matchSearch;
    });

    // Self-organizing sort logic:
    if (sortCol) {
      filtered.sort((a, b) => {
        let diff = 0;
        if (sortCol === 'serial') {
          const sA = parseInt(a.candidateSerial) || 0;
          const sB = parseInt(b.candidateSerial) || 0;
          diff = sA - sB;
        } else if (sortCol === 'id') {
          diff = String(a.id).localeCompare(String(b.id));
        } else if (sortCol === 'post') {
          diff = comparePosts(a.post, b.post);
        } else if (sortCol === 'name') {
          const nA = a.candidateName || a.candidate?.NAME || '';
          const nB = b.candidateName || b.candidate?.NAME || '';
          diff = nA.localeCompare(nB);
        } else if (sortCol === 'status') {
          if (activeTab === 'intake' || activeTab === 'not_confirmed') {
            const pA = a.physicalReceived === true || a.physicalReceived === 'true' ? 1 : 0;
            const pB = b.physicalReceived === true || b.physicalReceived === 'true' ? 1 : 0;
            diff = pB - pA;
          } else {
            diff = String(a.status || '').localeCompare(String(b.status || ''));
          }
        } else if (sortCol === 'flags') {
          const vA = getNominationRuleViolations(a, allPosts, allNoms, settings).length;
          const vB = getNominationRuleViolations(b, allPosts, allNoms, settings).length;
          diff = vB - vA;
        }
        return sortAsc ? diff : -diff;
      });
    } else {
      // Use arrangeMode
      if (arrangeMode === 'post') {
        filtered.sort((a, b) => {
          const pComp = comparePosts(a.post, b.post);
          if (pComp !== 0) return pComp;
          const sA = parseInt(a.candidateSerial) || 0;
          const sB = parseInt(b.candidateSerial) || 0;
          if (sA && sB && sA !== sB) return sA - sB;
          const tA = new Date(a.timestamp || 0).getTime();
          const tB = new Date(b.timestamp || 0).getTime();
          return tA - tB;
        });
      } else if (arrangeMode === 'latest') {
        filtered.sort((a, b) => {
          const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
          const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
          if (timeA !== timeB) return timeB - timeA;
          return String(b.id).localeCompare(String(a.id));
        });
      } else if (arrangeMode === 'flags') {
        filtered.sort((a, b) => {
          const vA = getNominationRuleViolations(a, allPosts, allNoms, settings);
          const vB = getNominationRuleViolations(b, allPosts, allNoms, settings);
          const multiA = vA.some(v => v.type === 'MULTIPLE_CANDIDACY') ? 1 : 0;
          const multiB = vB.some(v => v.type === 'MULTIPLE_CANDIDACY') ? 1 : 0;
          if (multiA !== multiB) return multiB - multiA;
          if (vA.length !== vB.length) return vB.length - vA.length;
          return comparePosts(a.post, b.post);
        });
      } else if (arrangeMode === 'serial') {
        filtered.sort((a, b) => {
          const sA = parseInt(a.candidateSerial) || 99999;
          const sB = parseInt(b.candidateSerial) || 99999;
          return sA - sB;
        });
      } else if (arrangeMode === 'name') {
        filtered.sort((a, b) => {
          const nA = a.candidateName || a.candidate?.NAME || '';
          const nB = b.candidateName || b.candidate?.NAME || '';
          return nA.localeCompare(nB);
        });
      }
    }

    activeFilteredList = filtered;

    const sortDescMap = {
      post: 'Grouped by Post (Statutory Order)',
      latest: 'Latest Submissions First',
      flags: 'Rule Flags & Alerts First',
      serial: 'Electoral Roll Serial (#1..N)',
      name: 'Candidate Name (A-Z)'
    };
    const sortText = sortCol 
      ? `Sorted by ${sortCol.toUpperCase()} (${sortAsc ? 'Ascending ▲' : 'Descending ▼'})` 
      : sortDescMap[arrangeMode] || 'Self-organized';

    main.querySelector('#nomListCountText').textContent = `Showing ${filtered.length} of ${baseList.length} nominations`;
    const hintEl = main.querySelector('#nomSortHintText');
    if (hintEl) hintEl.textContent = `Organization: ${sortText}`;

    renderRows(filtered);

    // If modal is open, refresh counter & navigation
    if (currentDetailNomId) {
      const idx = activeFilteredList.findIndex(n => String(n.id) === String(currentDetailNomId));
      const total = activeFilteredList.length;
      counterText.textContent = total > 0 ? `${idx + 1} / ${total}` : '1 / 1';
      btnPrev.disabled = idx <= 0;
      btnNext.disabled = idx === -1 || idx >= total - 1;
    }
  };

  // Switch Workflow Tabs
  const setWorkflowTab = (tab) => {
    activeTab = tab;
    const btnI = main.querySelector('#tabBtnIntake');
    const btnS = main.querySelector('#tabBtnScrutiny');
    const btnNC = main.querySelector('#tabBtnNotConfirmed');
    const btnA = main.querySelector('#tabBtnAccepted');
    const btnR = main.querySelector('#tabBtnRejected');

    const banI = main.querySelector('#bannerIntake');
    const banS = main.querySelector('#bannerScrutiny');
    const banNC = main.querySelector('#bannerNotConfirmed');
    const banA = main.querySelector('#bannerAccepted');
    const banR = main.querySelector('#bannerRejected');

    if (btnI) {
      btnI.className = `tab-btn px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'intake' ? 'border-indigo-400 text-white bg-indigo-950/40 shadow-lg shadow-indigo-950/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`;
    }
    if (btnS) {
      btnS.className = `tab-btn px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'scrutiny' ? 'border-sky-400 text-white bg-sky-950/40 shadow-lg shadow-sky-950/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`;
    }
    if (btnNC) {
      btnNC.className = `tab-btn px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'not_confirmed' ? 'border-amber-400 text-white bg-amber-950/40 shadow-lg shadow-amber-950/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`;
    }
    if (btnA) {
      btnA.className = `tab-btn px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'accepted' ? 'border-emerald-400 text-white bg-emerald-950/40 shadow-lg shadow-emerald-950/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`;
    }
    if (btnR) {
      btnR.className = `tab-btn px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'rejected' ? 'border-rose-400 text-white bg-rose-950/40 shadow-lg shadow-rose-950/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`;
    }

    if (banI) banI.classList.toggle('hidden', activeTab !== 'intake');
    if (banS) banS.classList.toggle('hidden', activeTab !== 'scrutiny');
    if (banNC) banNC.classList.toggle('hidden', activeTab !== 'not_confirmed');
    if (banA) banA.classList.toggle('hidden', activeTab !== 'accepted');
    if (banR) banR.classList.toggle('hidden', activeTab !== 'rejected');

    updateStatusFilterOptions();
    applyFilters();
  };

  main.querySelector('#tabBtnIntake')?.addEventListener('click', () => setWorkflowTab('intake'));
  main.querySelector('#tabBtnNotConfirmed')?.addEventListener('click', () => setWorkflowTab('not_confirmed'));
  main.querySelector('#tabBtnScrutiny')?.addEventListener('click', () => setWorkflowTab('scrutiny'));
  main.querySelector('#tabBtnAccepted')?.addEventListener('click', () => setWorkflowTab('accepted'));
  main.querySelector('#tabBtnRejected')?.addEventListener('click', () => setWorkflowTab('rejected'));

  main.querySelector('#nomSearch').addEventListener('input', applyFilters);
  main.querySelector('#postFilter').addEventListener('change', applyFilters);
  main.querySelector('#statusFilter').addEventListener('change', applyFilters);

  main.querySelector('#arrangeFilter')?.addEventListener('change', (e) => {
    arrangeMode = e.target.value;
    sortCol = null; // Clear manual column sort
    main.querySelectorAll('#nomTable thead th.sortable-th .sort-icon').forEach(icon => {
      icon.textContent = '↕';
      icon.classList.add('opacity-40');
      icon.classList.remove('text-indigo-400', 'font-bold');
    });
    applyFilters();
  });

  // Sortable Column Headers in List/Table
  main.querySelectorAll('#nomTable thead th.sortable-th').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (!col) return;
      if (sortCol === col) {
        sortAsc = !sortAsc;
      } else {
        sortCol = col;
        sortAsc = true;
      }
      main.querySelectorAll('#nomTable thead th.sortable-th').forEach(otherTh => {
        const icon = otherTh.querySelector('.sort-icon');
        if (!icon) return;
        if (otherTh === th) {
          icon.textContent = sortAsc ? '▲' : '▼';
          icon.classList.remove('opacity-40');
          icon.classList.add('text-indigo-400', 'font-bold');
        } else {
          icon.textContent = '↕';
          icon.classList.add('opacity-40');
          icon.classList.remove('text-indigo-400', 'font-bold');
        }
      });
      applyFilters();
    });
  });

  const updateNomViewUI = () => {
    const cardsDiv = main.querySelector('#nomCardsContainer');
    const tableDiv = main.querySelector('#nomTableContainer');
    const btnC = main.querySelector('#btnNomModeCards');
    const btnT = main.querySelector('#btnNomModeTable');
    if (cardsDiv) cardsDiv.classList.toggle('hidden', nomViewMode !== 'cards');
    if (tableDiv) tableDiv.classList.toggle('hidden', nomViewMode !== 'table');
    if (btnC) btnC.className = `btn btn-xs py-1.5 px-3 rounded text-xs flex items-center gap-1.5 transition-all ${nomViewMode === 'cards' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white'}`;
    if (btnT) btnT.className = `btn btn-xs py-1.5 px-3 rounded text-xs flex items-center gap-1.5 transition-all ${nomViewMode === 'table' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white'}`;
    try { localStorage.setItem('admin_verify_view_mode', nomViewMode); } catch (_) {}
  };

  main.querySelector('#btnNomModeCards')?.addEventListener('click', () => {
    if (nomViewMode !== 'cards') {
      nomViewMode = 'cards';
      updateNomViewUI();
    }
  });

  main.querySelector('#btnNomModeTable')?.addEventListener('click', () => {
    if (nomViewMode !== 'table') {
      nomViewMode = 'table';
      updateNomViewUI();
    }
  });

  // Refresh List button
  main.querySelector('#btnRefreshVerify')?.addEventListener('click', async () => {
    const btn = main.querySelector('#btnRefreshVerify');
    const icon = main.querySelector('#refreshIcon');
    if (btn) btn.disabled = true;
    if (icon) icon.classList.add('animate-spin');
    try {
      const [freshNoms, freshPosts] = await Promise.all([
        api.adminGetNominations(pwd, true),
        api.adminGetPosts(pwd).catch(() => allPosts),
      ]);
      allNoms.length = 0;
      if (Array.isArray(freshNoms)) allNoms.push(...freshNoms);
      if (Array.isArray(freshPosts)) { allPosts.length = 0; allPosts.push(...freshPosts); }
      updatePostFilterOptions();
      applyFilters();
      showToast('Nomination list & rules refreshed.', 'info');
    } catch (err) {
      showToast(`Refresh failed: ${err.message}`, 'error');
    } finally {
      if (btn) btn.disabled = false;
      if (icon) icon.classList.remove('animate-spin');
    }
  });

  // Modal Action Listeners
  btnValid.addEventListener('click', async () => {
    if (!currentDetailNomId) return;
    const id = currentDetailNomId;
    btnValid.disabled = true;
    const origText = btnValid.innerHTML;
    btnValid.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span> Validating...';
    try {
      await api.adminVerifyNomination(pwd, id, 'Valid');
      const nom = allNoms.find(n => n.id === id);
      if (nom) {
        nom.status = 'Valid';
        nom.rejectionReason = null;
      }
      showToast(`Nomination #${id} marked as Valid.`, 'success');
      applyFilters();
      openNomDetail(id);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      btnValid.disabled = false;
      btnValid.innerHTML = origText;
    }
  });

  btnReject.addEventListener('click', async () => {
    if (!currentDetailNomId) return;
    const id = currentDetailNomId;
    const nom = allNoms.find(n => n.id === id);
    const violations = getNominationRuleViolations(nom, allPosts, allNoms, settings);
    const defaultReason = violations.length > 0 ? violations[0].message : 'Serial number or eligibility requirement not met';

    const reason = prompt(`Please enter the statutory reason for rejecting Nomination #${id}:`, defaultReason);
    if (reason === null) return;
    const trimmedReason = reason.trim() || 'Scrutiny criteria not satisfied';

    btnReject.disabled = true;
    const origText = btnReject.innerHTML;
    btnReject.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span> Rejecting...';
    try {
      await api.adminVerifyNomination(pwd, id, 'Rejected', trimmedReason);
      if (nom) {
        nom.status = 'Rejected';
        nom.rejectionReason = trimmedReason;
      }
      showToast(`Nomination #${id} marked as Rejected.`, 'success');
      applyFilters();
      openNomDetail(id);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      btnReject.disabled = false;
      btnReject.innerHTML = origText;
    }
  });

  btnPending?.addEventListener('click', async () => {
    if (!currentDetailNomId) return;
    const id = currentDetailNomId;
    btnPending.disabled = true;
    const origText = btnPending.innerHTML;
    btnPending.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span> Reverting...';
    try {
      await api.adminVerifyNomination(pwd, id, 'Pending', null);
      const nom = allNoms.find(n => n.id === id);
      if (nom) {
        nom.status = 'Pending';
        nom.rejectionReason = null;
      }
      showToast(`Nomination #${id} reset to Pending.`, 'info');
      applyFilters();
      openNomDetail(id);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      btnPending.disabled = false;
      btnPending.innerHTML = origText;
    }
  });

  btnTogglePhysical?.addEventListener('click', async () => {
    if (!currentDetailNomId) return;
    const id = currentDetailNomId;
    const nom = allNoms.find(n => n.id === id);
    if (!nom) return;
    const nextState = !(nom.physicalReceived === true || nom.physicalReceived === 'true');
    await togglePhysicalReceipt(id, nextState);
  });

  btnModalDelete?.addEventListener('click', async () => {
    if (!currentDetailNomId) return;
    await confirmAndDeleteNomination(currentDetailNomId);
  });

  main.querySelector('#btnModalPrintPaper')?.addEventListener('click', () => {
    triggerPrint(paperZone.innerHTML);
  });

  btnPrev.addEventListener('click', () => {
    const idx = activeFilteredList.findIndex(n => String(n.id) === String(currentDetailNomId));
    if (idx > 0) openNomDetail(activeFilteredList[idx - 1].id);
  });

  btnNext.addEventListener('click', () => {
    const idx = activeFilteredList.findIndex(n => String(n.id) === String(currentDetailNomId));
    if (idx !== -1 && idx < activeFilteredList.length - 1) openNomDetail(activeFilteredList[idx + 1].id);
  });

  main.querySelector('#btnCloseNomDetail')?.addEventListener('click', closeNomDetail);
  main.querySelector('#btnModalCloseFooter')?.addEventListener('click', closeNomDetail);

  // Keyboard navigation for modal
  window.addEventListener('keydown', (e) => {
    if (detailModal.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeNomDetail();
    else if (e.key === 'ArrowLeft' && !btnPrev.disabled) btnPrev.click();
    else if (e.key === 'ArrowRight' && !btnNext.disabled) btnNext.click();
  });

  // Main List Delegation (Cards & Table)
  main.querySelector('#nomListView')?.addEventListener('click', async (e) => {
    // Open full form review modal
    const viewBtn = e.target.closest('.view-nom-btn');
    if (viewBtn) {
      const id = viewBtn.dataset.id;
      if (id) openNomDetail(id);
      return;
    }

    // Toggle physical receipt button click
    const togglePhysBtn = e.target.closest('.toggle-physical-btn');
    if (togglePhysBtn) {
      const id = togglePhysBtn.dataset.id;
      const targetState = togglePhysBtn.dataset.target === 'true';
      await togglePhysicalReceipt(id, targetState);
      return;
    }

    // Delete nomination button click (with prompt confirmation)
    const delBtn = e.target.closest('.delete-nom-btn');
    if (delBtn) {
      const id = delBtn.dataset.id;
      await confirmAndDeleteNomination(id);
      return;
    }

    // Quick verify row buttons
    const btn = e.target.closest('.verify-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const status = btn.dataset.action;

    let reason = null;
    if (status === 'Rejected') {
      const nom = allNoms.find(n => String(n.id) === String(id));
      const violations = getNominationRuleViolations(nom, allPosts, allNoms, settings);
      const defaultReason = violations.length > 0 ? violations[0].message : 'Serial number or eligibility requirement not met';
      reason = prompt(`Please enter the statutory reason for rejecting Nomination #${id}:`, defaultReason);
      if (reason === null) return;
      reason = reason.trim() || 'Scrutiny criteria not satisfied';
    }

    btn.disabled = true;
    const oldText = btn.textContent;
    btn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
    
    try {
      await api.adminVerifyNomination(pwd, id, status, reason);
      const nom = allNoms.find(n => String(n.id) === String(id));
      if (nom) {
        nom.status = status;
        nom.rejectionReason = status === 'Rejected' ? reason : null;
      }
      showToast(`Nomination #${id} marked as ${status}.`, 'success');
      applyFilters();
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.textContent = oldText;
    }
  });

  updateNomViewUI(); // Ensure initial view mode (cards or table) is applied
  applyFilters(); // Initial render with sorting applied
}
