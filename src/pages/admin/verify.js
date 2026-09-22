/**
 * pages/admin/verify.js
 * Admin page to review nominations, inspect full nomination paper,
 * audit statutory rule violations, and mark them Valid / Rejected.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, triggerPrint, calculateAge, getStudentYearLevel, isYearEligible, formatYearRuleDescription } from '../../utils.js';
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
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
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
 * - Multiple candidacies across posts
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

  // 1. Research Scholars Lyngdoh Ineligibility
  const cLvl = getStudentYearLevel(cCls);
  if (cLvl === 'RS' || cCls.includes('RESEARCH') || cCls.includes('SCHOLAR') || cCls.includes('PHD')) {
    violations.push({
      type: 'RESEARCH_SCHOLAR',
      severity: 'error',
      message: 'Research Scholars are barred from contesting in College Union Elections under Lyngdoh Committee norms.'
    });
  }

  // 2. Gender Restriction for Reserved Posts
  if (postRule.femaleOnly && nom.gender && nom.gender !== 'Female') {
    violations.push({
      type: 'GENDER_MISMATCH',
      severity: 'error',
      message: `The post "${nom.post}" is reserved for Female candidates only (Submitted: ${nom.gender}).`
    });
  }

  // 3. Age Limit Check (Lyngdoh Committee Statutory Limits)
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

  // 4. Department Restriction (Association Secretaries)
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
          severity: 'warning',
          message: `Proposer belongs to department "${nom.proposerDept || 'N/A'}", but post requires "${reqDept}".`
        });
      }
      if (!matches(sDept)) {
        violations.push({
          type: 'DEPT_SECONDER',
          severity: 'warning',
          message: `Seconder belongs to department "${nom.seconderDept || 'N/A'}", but post requires "${reqDept}".`
        });
      }
    }
  }

  // 5. Year Level Restriction
  if (postRule && !isYearEligible(cCls, postRule)) {
    const desc = formatYearRuleDescription(postRule);
    violations.push({
      type: 'YEAR_ELIGIBILITY',
      severity: 'error',
      message: `Candidate class (${nom.candidateClass || 'N/A'}) does not meet the year restriction for "${nom.post}" (${desc}).`
    });
  }

  // 6. Self Endorsement & Identity Cross-Checks
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

  // 7. Duplicate Proposer / Seconder Endorsements on the same post
  const otherNominationsForPost = allNominations.filter(n => n.id !== nom.id && n.post === nom.post && n.status !== 'Rejected');
  
  if (pSerial) {
    const dupProp = otherNominationsForPost.find(n => 
      String(n.proposerSerial) === pSerial || String(n.seconderSerial) === pSerial
    );
    if (dupProp) {
      violations.push({
        type: 'DUPLICATE_PROPOSER_ENDORSEMENT',
        severity: 'error',
        message: `Proposer (Sl #${pSerial}, ${pName}) has already endorsed nomination #${dupProp.id} (${dupProp.candidateName || 'Candidate'}) for this post.`
      });
    }
  }

  if (sSerial) {
    const dupSec = otherNominationsForPost.find(n => 
      String(n.proposerSerial) === sSerial || String(n.seconderSerial) === sSerial
    );
    if (dupSec) {
      violations.push({
        type: 'DUPLICATE_SECONDER_ENDORSEMENT',
        severity: 'error',
        message: `Seconder (Sl #${sSerial}, ${sName}) has already endorsed nomination #${dupSec.id} (${dupSec.candidateName || 'Candidate'}) for this post.`
      });
    }
  }

  // 8. Candidate Nominated for Multiple Posts
  const otherCandidatures = allNominations.filter(n => n.id !== nom.id && n.status !== 'Rejected' && (
    (cSerial && String(n.candidateSerial) === cSerial) ||
    (cAdm && String(n.candidateAdmission).trim().toLowerCase() === cAdm)
  ));
  if (otherCandidatures.length > 0) {
    const otherPosts = otherCandidatures.map(n => `"${n.post}" (#${n.id})`).join(', ');
    violations.push({
      type: 'MULTIPLE_CANDIDACY',
      severity: 'error',
      message: `Candidate has also filed nomination for other post(s): ${otherPosts}.`
    });
  }

  return violations;
}

function renderVerifyTable(main, noms, pwd, settings = {}, posts = []) {
  const allNoms = Array.isArray(noms) ? [...noms] : [];
  const allPosts = Array.isArray(posts) ? [...posts] : [];
  let nomViewMode = 'cards'; // 'cards' (card type for phone & mobile ease) | 'table'

  main.innerHTML = `
    <div class="page-enter space-y-4">
      <!-- Title Bar -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
        <div>
          <h3 class="text-xl font-bold text-white flex items-center gap-2">
            <span>Nomination Verification & Scrutiny</span>
          </h3>
          <p class="text-slate-400 text-sm">Review full candidate forms, audit statutory rule violations, and mark nominations as Valid or Rejected.</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button id="btnRefreshVerify" class="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200">
            <span id="refreshIcon">🔄</span> <span>Refresh List</span>
          </button>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="glass rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center w-full shadow-lg">
        <div class="relative flex-1 w-full">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          <input type="text" id="nomSearch" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors" placeholder="Search Candidate, ID, Post, Dept, or Roll Serial...">
        </div>
        <div class="w-full md:w-64 shrink-0">
          <select id="statusFilter" class="field w-full bg-black/20 focus:bg-black/40 transition-colors">
            <option value="all">All Submissions</option>
            <option value="Pending">Pending Review</option>
            <option value="Valid">Valid</option>
            <option value="Rejected">Rejected</option>
            <option value="violations">⚠️ Rule Violations Flagged</option>
            <option value="passed">✓ All Rules Passed</option>
          </select>
        </div>
        <div class="flex items-center rounded-lg bg-black/40 p-1 border border-white/10 shrink-0 self-end md:self-center">
          <button type="button" id="btnNomModeCards" class="btn btn-xs py-1.5 px-3 rounded text-xs flex items-center gap-1.5 transition-all ${nomViewMode === 'cards' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white'}" title="Card View (Optimized for Mobile/Phone)">
            <span>📇</span> <span>Cards</span>
          </button>
          <button type="button" id="btnNomModeTable" class="btn btn-xs py-1.5 px-3 rounded text-xs flex items-center gap-1.5 transition-all ${nomViewMode === 'table' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white'}" title="Table View">
            <span>📑</span> <span>Table</span>
          </button>
        </div>
      </div>

      <!-- Nominations List View (Cards or Table) -->
      <div class="glass rounded-xl overflow-hidden shadow-2xl" id="nomListView">
        <div id="nomCardsContainer" class="${nomViewMode === 'cards' ? '' : 'hidden'} p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5"></div>
        <div id="nomTableContainer" class="${nomViewMode === 'table' ? '' : 'hidden'} overflow-x-auto">
          <table class="data-table" id="nomTable">
            <thead><tr>
              <th>Nom. ID</th>
              <th>Post</th>
              <th>Candidate Details</th>
              <th>Class / Dept</th>
              <th>Proposer</th>
              <th>Seconder</th>
              <th>Status & Scrutiny</th>
              <th>Action</th>
            </tr></thead>
            <tbody id="nomTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Full Nomination Form Review Modal -->
    <div id="nomDetailModal" class="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] hidden flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div class="glass w-full max-w-3xl rounded-2xl p-4 sm:p-6 shadow-2xl border border-indigo-500/30 max-h-[92vh] flex flex-col my-auto">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-4 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl font-bold border border-indigo-500/30">📄</div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-lg font-bold text-white">Nomination Paper Review</h4>
                <span id="modalNomIdBadge" class="font-mono text-xs text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 rounded font-bold">#</span>
                <span id="modalNomStatusBadge" class="badge"></span>
              </div>
              <p class="text-slate-400 text-xs mt-0.5" id="modalNomTimestamp"></p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" id="btnModalPrevNom" class="btn btn-secondary btn-sm px-2.5 py-1 text-xs" title="Previous Nomination">◀ Prev</button>
            <span id="modalNomCounter" class="text-xs font-mono text-slate-400 px-1">1 / 1</span>
            <button type="button" id="btnModalNextNom" class="btn btn-secondary btn-sm px-2.5 py-1 text-xs" title="Next Nomination">Next ▶</button>
            <button type="button" id="btnCloseNomDetail" class="btn btn-secondary btn-sm px-2.5 py-1 text-sm ml-2 text-slate-400 hover:text-white" title="Close Modal">✕</button>
          </div>
        </div>

        <!-- Statutory Scrutiny Audit Box -->
        <div id="modalScrutinyZone" class="shrink-0 mb-3"></div>

        <!-- Rejection Reason Banner (if rejected) -->
        <div id="modalRejectionBanner" class="hidden bg-rose-500/15 border border-rose-500/40 rounded-xl p-3 mb-3 text-xs text-rose-300 shrink-0">
          <strong>⚠️ Statutory Rejection Reason:</strong> <span id="modalRejectionText"></span>
        </div>

        <!-- Modal Body (Print-zone with Authentic Nomination Paper) -->
        <div id="modalPaperZone" class="overflow-y-auto flex-1 pr-1 print-zone space-y-4"></div>

        <!-- Modal Footer Actions (Sticky) -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 mt-4 shrink-0">
          <button type="button" id="btnModalPrintPaper" class="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10">
            <span>🖨️</span> <span>Print Paper</span>
          </button>
          <div class="flex items-center gap-2">
            <button type="button" id="btnModalMarkValid" class="btn btn-primary btn-sm flex items-center gap-1.5 text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg">
              <span>✅</span> <span>Mark as Valid</span>
            </button>
            <button type="button" id="btnModalMarkReject" class="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs py-2 px-4 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold border border-rose-500/40 shadow-lg">
              <span>❌</span> <span>Reject Nomination</span>
            </button>
            <button type="button" id="btnModalCloseFooter" class="btn btn-secondary btn-sm text-xs py-2 px-3 text-slate-300">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Permanent Delete Warning Modal -->
    <div id="deleteNomModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-4">
      <div class="glass w-full max-w-md rounded-2xl p-6 shadow-2xl border border-red-500/30">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center text-xl font-bold border border-red-500/30">⚠️</div>
          <div>
            <h4 class="text-xl font-bold text-white">Delete Nomination</h4>
            <p class="text-slate-400 text-xs">Permanent deletion of submission</p>
          </div>
        </div>
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-3 my-4 text-xs text-red-200 leading-relaxed">
          <strong>WARNING:</strong> This will permanently delete the nomination of <strong id="delNomCandidate" class="text-white"></strong> for <strong id="delNomPost" class="text-white"></strong> (ID: <span id="delNomId" class="font-mono text-amber-300"></span>). This cannot be undone.
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Enter Admin Password to Confirm</label>
            <input type="password" id="delNomPwdInput" class="field w-full" placeholder="Admin Password" autocomplete="current-password">
          </div>
          <div id="delNomError" class="text-rose-400 text-xs font-medium hidden"></div>
        </div>
        <div class="flex gap-2 mt-6">
          <button type="button" id="btnCancelDelNom" class="btn btn-secondary flex-1">Cancel</button>
          <button type="button" id="btnConfirmDelNom" class="btn bg-red-600 hover:bg-red-500 text-white flex-1 font-bold">Permanently Delete</button>
        </div>
      </div>
    </div>
  `;

  let activeFilteredList = [];
  let currentDetailNomId = null;

  const detailModal = main.querySelector('#nomDetailModal');
  const paperZone = main.querySelector('#modalPaperZone');
  const scrutinyZone = main.querySelector('#modalScrutinyZone');
  const idBadge = main.querySelector('#modalNomIdBadge');
  const statusBadge = main.querySelector('#modalNomStatusBadge');
  const tsText = main.querySelector('#modalNomTimestamp');
  const counterText = main.querySelector('#modalNomCounter');
  const btnPrev = main.querySelector('#btnModalPrevNom');
  const btnNext = main.querySelector('#btnModalNextNom');
  const btnValid = main.querySelector('#btnModalMarkValid');
  const btnReject = main.querySelector('#btnModalMarkReject');
  const rejBanner = main.querySelector('#modalRejectionBanner');
  const rejText = main.querySelector('#modalRejectionText');

  const renderRows = (data) => {
    const tbody = main.querySelector('#nomTableBody');
    const cardsDiv = main.querySelector('#nomCardsContainer');

    tbody.innerHTML = data.length ? data.map(n => {
      const violations = getNominationRuleViolations(n, allPosts, allNoms, settings);
      const isRS = String(n.candidateClass || '').toUpperCase().includes('RESEARCH') || String(n.candidateClass || '').toUpperCase().includes('SCHOLAR');

      return `
      <tr id="row-${esc(n.id)}" class="hover:bg-white/[0.02] transition-colors">
        <td>
          <button type="button" class="view-nom-btn font-mono text-indigo-300 hover:text-indigo-200 text-xs font-bold hover:underline cursor-pointer flex items-center gap-1" data-id="${esc(n.id)}" title="Click to view full form">
            <span>📄</span> ${esc(n.id)}
          </button>
        </td>
        <td class="text-xs max-w-[140px] leading-snug font-medium text-slate-200">
          <div>${esc(n.post)}</div>
        </td>
        <td>
          <div class="font-bold text-white flex items-center gap-1.5 flex-wrap">
            <span class="hover:text-indigo-300 cursor-pointer view-nom-btn" data-id="${esc(n.id)}">${esc(n.candidateName || n.candidate?.NAME || 'N/A')}</span>
            <span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-bold text-[10px] px-1.5 py-0.2" title="Electoral Roll Serial Number">
              Sl. #${esc(n.candidateSerial || n.candidate?.['Nominal Roll Serial Number'] || '–')}
            </span>
            ${isRS ? `<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-1.5 py-0.2 font-semibold">⚠️ Ineligible (RS)</span>` : ''}
          </div>
          <div class="text-[11px] text-slate-400 font-mono">Adm: ${esc(n.candidateAdmission || n.candidate?.['ADMISION NO'] || '–')}</div>
        </td>
        <td class="text-xs text-slate-400">
          <div>${esc(n.candidateClass || '')}</div>
          <div class="text-[10px] opacity-60">${esc(n.candidateDept || '')}</div>
        </td>
        <td>
          <div class="text-xs font-medium text-slate-300 flex items-center gap-1">
            <span>${esc(n.proposerName || n.proposer?.NAME || 'N/A')}</span>
            <span class="badge bg-slate-800 text-slate-300 border border-white/10 font-mono text-[10px] px-1 py-0.2" title="Proposer Roll Serial">
              #${esc(n.proposerSerial || n.proposer?.['Nominal Roll Serial Number'] || '–')}
            </span>
          </div>
          <div class="text-[10px] text-slate-500 font-mono">Adm: ${esc(n.proposerAdmission || n.proposer?.['ADMISION NO'] || '–')}</div>
        </td>
        <td>
          <div class="text-xs font-medium text-slate-300 flex items-center gap-1">
            <span>${esc(n.seconderName || n.seconder?.NAME || 'N/A')}</span>
            <span class="badge bg-slate-800 text-slate-300 border border-white/10 font-mono text-[10px] px-1 py-0.2" title="Seconder Roll Serial">
              #${esc(n.seconderSerial || n.seconder?.['Nominal Roll Serial Number'] || '–')}
            </span>
          </div>
          <div class="text-[10px] text-slate-500 font-mono">Adm: ${esc(n.seconderAdmission || n.seconder?.['ADMISION NO'] || '–')}</div>
        </td>
        <td>
          <div>
            <span class="badge badge-${(n.status || 'pending').toLowerCase()} font-bold">${esc(n.status)}</span>
          </div>
          ${violations.length > 0 ? `
            <button type="button" class="view-nom-btn badge bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] px-2 py-0.5 mt-1 font-semibold flex items-center gap-1 cursor-pointer transition-colors" data-id="${esc(n.id)}" title="${esc(violations.map(v => v.message).join(' | '))}">
              <span>⚠️ ${violations.length} Rule Violation${violations.length > 1 ? 's' : ''}</span>
            </button>
          ` : `
            <span class="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.2 mt-1 inline-flex items-center gap-1 font-medium">
              <span>✓</span> Rules Passed
            </span>
          `}
          ${n.status === 'Rejected' && n.rejectionReason ? `
            <div class="text-[10px] text-rose-400 mt-1 max-w-[150px] leading-tight font-medium" title="${esc(n.rejectionReason)}">⚠️ ${esc(n.rejectionReason)}</div>
          ` : ''}
        </td>
        <td>
          <div class="flex items-center gap-1.5 flex-wrap">
            <button type="button" class="btn btn-secondary btn-xs view-nom-btn bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 px-2 py-1 flex items-center gap-1 font-semibold" data-id="${esc(n.id)}" title="View Full Nomination Form and Scrutiny Details">
              <span>📄</span> <span>View Form</span>
            </button>
            <button type="button" class="btn btn-primary btn-xs verify-btn bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white" data-id="${esc(n.id)}" data-action="Valid"
              ${n.status === 'Valid' ? 'disabled' : ''}>Valid</button>
            <button type="button" class="btn btn-secondary btn-xs verify-btn bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white" data-id="${esc(n.id)}" data-action="Rejected"
              ${n.status === 'Rejected' ? 'disabled' : ''}>Reject</button>
            <button type="button" class="btn btn-secondary btn-xs delete-nom-btn bg-red-900/20 hover:bg-red-700 text-red-400 hover:text-white border border-red-500/30 px-2" data-id="${esc(n.id)}" data-candidate="${esc(n.candidateName || n.candidate?.NAME || '')}" data-post="${esc(n.post)}" title="Delete Nomination">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="8" class="text-center text-slate-500 py-12">No nominations found matching those criteria.</td></tr>`;

    // 2. Render Cards (for mobile & card mode)
    if (cardsDiv) {
      cardsDiv.innerHTML = data.length ? data.map(n => {
        const violations = getNominationRuleViolations(n, allPosts, allNoms, settings);
        const isRS = String(n.candidateClass || '').toUpperCase().includes('RESEARCH') || String(n.candidateClass || '').toUpperCase().includes('SCHOLAR');
        return `
          <div class="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border ${violations.length ? 'border-rose-500/40 bg-rose-950/10' : 'border-white/10'} hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3.5 shadow-xl">
            <!-- Top Header: ID, Post, Status -->
            <div class="space-y-2.5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <button type="button" class="view-nom-btn font-mono text-xs text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 px-2 py-0.5 rounded border border-indigo-500/30 font-bold inline-flex items-center gap-1" data-id="${esc(n.id)}" title="Click to view full form">
                    <span>📄</span> #${esc(n.id)}
                  </button>
                  <span class="text-xs font-semibold text-slate-200 ml-1.5">${esc(n.post)}</span>
                </div>
                <span class="badge badge-${(n.status || 'pending').toLowerCase()} font-bold text-xs shrink-0">${esc(n.status)}</span>
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
                  <div class="text-[10px] font-mono text-slate-400">Sl. #${esc(n.proposerSerial || n.proposer?.['Nominal Roll Serial Number'] || '–')} • Adm: ${esc(n.proposerAdmission || n.proposer?.['ADMISION NO'] || '–')}</div>
                </div>
                <div class="bg-black/20 p-2 rounded border border-white/5 space-y-0.5">
                  <div class="text-[10px] uppercase font-bold text-slate-400">Seconder</div>
                  <div class="font-medium text-slate-200 truncate">${esc(n.seconderName || n.seconder?.NAME || 'N/A')}</div>
                  <div class="text-[10px] font-mono text-slate-400">Sl. #${esc(n.seconderSerial || n.seconder?.['Nominal Roll Serial Number'] || '–')} • Adm: ${esc(n.seconderAdmission || n.seconder?.['ADMISION NO'] || '–')}</div>
                </div>
              </div>

              <!-- Scrutiny Audit & Violations -->
              <div>
                ${violations.length > 0 ? `
                  <button type="button" class="view-nom-btn w-full badge bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs px-2.5 py-1.5 font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors" data-id="${esc(n.id)}" title="${esc(violations.map(v => v.message).join(' | '))}">
                    <span>⚠️ ${violations.length} Rule Violation${violations.length > 1 ? 's' : ''} Flagged</span>
                  </button>
                ` : `
                  <div class="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 flex items-center justify-center gap-1.5 font-medium">
                    <span>✓</span> All Statutory Rules Passed
                  </div>
                `}
                ${n.status === 'Rejected' && n.rejectionReason ? `
                  <div class="text-xs text-rose-400 mt-1.5 bg-rose-500/10 border border-rose-500/20 p-2 rounded font-medium">
                    ⚠️ ${esc(n.rejectionReason)}
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Touch-friendly Action Buttons for Phone -->
            <div class="space-y-2 pt-2 border-t border-white/10">
              <button type="button" class="btn btn-secondary btn-sm w-full view-nom-btn bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 py-2 flex items-center justify-center gap-1.5 font-bold text-xs" data-id="${esc(n.id)}">
                <span>📄</span> <span>View Full Nomination Paper</span>
              </button>
              <div class="flex items-center gap-2">
                <button type="button" class="btn btn-primary btn-sm flex-1 verify-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 text-xs" data-id="${esc(n.id)}" data-action="Valid" ${n.status === 'Valid' ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
                  ✅ Valid
                </button>
                <button type="button" class="btn btn-secondary btn-sm flex-1 verify-btn bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold py-2 text-xs" data-id="${esc(n.id)}" data-action="Rejected" ${n.status === 'Rejected' ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
                  ❌ Reject
                </button>
                <button type="button" class="btn btn-secondary btn-sm delete-nom-btn bg-red-900/20 hover:bg-red-700 text-red-400 hover:text-white border border-red-500/30 px-3 py-2 text-xs font-bold" data-id="${esc(n.id)}" data-candidate="${esc(n.candidateName || n.candidate?.NAME || '')}" data-post="${esc(n.post)}" title="Delete Nomination">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('') : `
        <div class="col-span-full text-center text-slate-500 py-12">
          <div class="text-3xl mb-2">🔍</div>
          <p class="text-slate-300 font-medium text-sm">No nominations found</p>
          <p class="text-xs text-slate-500 mt-1">Try broadening your search term or filter.</p>
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
    statusBadge.className = `badge badge-${(nom.status || 'pending').toLowerCase()} font-bold`;
    statusBadge.textContent = nom.status || 'Pending';
    tsText.textContent = nom.timestamp ? `Submitted: ${new Date(nom.timestamp).toLocaleString()}` : '';

    if (nom.status === 'Rejected' && nom.rejectionReason) {
      rejText.textContent = nom.rejectionReason;
      rejBanner.classList.remove('hidden');
    } else {
      rejBanner.classList.add('hidden');
    }

    // Scrutiny Rule Violations Audit
    const violations = getNominationRuleViolations(nom, allPosts, allNoms, settings);
    if (violations.length > 0) {
      scrutinyZone.innerHTML = `
        <div class="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 space-y-2.5 shadow-lg">
          <div class="flex items-center justify-between border-b border-rose-500/30 pb-2">
            <div class="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <span class="text-base">⚠️</span> Rule Violations & Scrutiny Warnings (${violations.length})
            </div>
            <span class="badge bg-rose-500/30 text-rose-200 border border-rose-500/50 text-[10px] font-bold uppercase tracking-wider">Scrutiny Alert</span>
          </div>
          <div class="text-xs text-rose-200/90 space-y-1.5 pl-1">
            ${violations.map(v => `
              <div class="flex items-start gap-2">
                <span class="text-rose-400 font-bold text-sm leading-none">•</span>
                <span>${esc(v.message)}</span>
              </div>
            `).join('')}
          </div>
        </div>`;
    } else {
      scrutinyZone.innerHTML = `
        <div class="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 flex items-center justify-between text-xs text-emerald-300 shadow-md">
          <div class="flex items-center gap-2.5">
            <span class="text-emerald-400 text-base">✅</span>
            <span><strong>Statutory Scrutiny Passed:</strong> Candidate satisfies all eligibility criteria, age limits, gender, year-level, and endorsement rules.</span>
          </div>
          <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold shrink-0">ALL RULES PASSED</span>
        </div>`;
    }

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

  // Delete Modal Setup
  let pendingDeleteId = null;
  const delModal = main.querySelector('#deleteNomModal');
  const delInput = main.querySelector('#delNomPwdInput');
  const delErr = main.querySelector('#delNomError');
  const btnConfirmDel = main.querySelector('#btnConfirmDelNom');

  const closeDelModal = () => {
    delModal?.classList.add('hidden');
    pendingDeleteId = null;
    if (delInput) delInput.value = '';
    if (delErr) { delErr.textContent = ''; delErr.classList.add('hidden'); }
  };

  main.querySelector('#btnCancelDelNom')?.addEventListener('click', closeDelModal);

  main.querySelector('#btnConfirmDelNom')?.addEventListener('click', async () => {
    const enteredPwd = (delInput?.value || '').trim();
    if (!enteredPwd) {
      if (delErr) { delErr.textContent = '❌ Please enter admin password.'; delErr.classList.remove('hidden'); }
      delInput?.focus();
      return;
    }
    if (!pendingDeleteId) return;

    btnConfirmDel.disabled = true;
    btnConfirmDel.textContent = 'Deleting...';
    if (delErr) delErr.classList.add('hidden');

    try {
      await api.adminDeleteNomination(enteredPwd, pendingDeleteId);
      const idx = allNoms.findIndex(x => x.id === pendingDeleteId);
      if (idx !== -1) allNoms.splice(idx, 1);
      showToast(`Nomination ${pendingDeleteId} permanently deleted.`, 'success');
      closeDelModal();
      if (currentDetailNomId === pendingDeleteId) closeNomDetail();
      applyFilters();
    } catch (err) {
      const msg = err.message.includes('password') ? 'Incorrect admin password.' : err.message;
      if (delErr) { delErr.textContent = `❌ ${msg}`; delErr.classList.remove('hidden'); }
      showToast(msg, 'error');
      delInput?.focus();
    } finally {
      btnConfirmDel.disabled = false;
      btnConfirmDel.textContent = 'Permanently Delete';
    }
  });

  const applyFilters = () => {
    const q = (main.querySelector('#nomSearch').value || '').trim().toLowerCase();
    const s = main.querySelector('#statusFilter').value;
    
    const filtered = allNoms.filter(n => {
      const violations = getNominationRuleViolations(n, allPosts, allNoms, settings);
      
      let matchStatus = true;
      if (s === 'violations') {
        matchStatus = violations.length > 0;
      } else if (s === 'passed') {
        matchStatus = violations.length === 0;
      } else if (s !== 'all') {
        matchStatus = n.status === s;
      }

      const matchSearch = !q || 
        String(n.id).toLowerCase().includes(q) || 
        String(n.candidateName || n.candidate?.NAME || '').toLowerCase().includes(q) || 
        String(n.candidateSerial || n.candidate?.['Nominal Roll Serial Number'] || '').toLowerCase().includes(q) || 
        String(n.candidateAdmission || n.candidate?.['ADMISION NO'] || '').toLowerCase().includes(q) || 
        String(n.candidateDept || '').toLowerCase().includes(q) || 
        String(n.post).toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });

    // Sort: Pending first, then Valid, then Rejected
    filtered.sort((a, b) => {
      const order = { 'Pending': 1, 'Valid': 2, 'Rejected': 3 };
      const aOrder = order[a.status] || 99;
      const bOrder = order[b.status] || 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(b.id).localeCompare(String(a.id));
    });

    activeFilteredList = filtered;
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

  main.querySelector('#nomSearch').addEventListener('input', applyFilters);
  main.querySelector('#statusFilter').addEventListener('change', applyFilters);

  const updateNomViewUI = () => {
    const cardsDiv = main.querySelector('#nomCardsContainer');
    const tableDiv = main.querySelector('#nomTableContainer');
    const btnC = main.querySelector('#btnNomModeCards');
    const btnT = main.querySelector('#btnNomModeTable');
    if (cardsDiv) cardsDiv.classList.toggle('hidden', nomViewMode !== 'cards');
    if (tableDiv) tableDiv.classList.toggle('hidden', nomViewMode !== 'table');
    if (btnC) btnC.className = `btn btn-xs py-1.5 px-3 rounded text-xs flex items-center gap-1.5 transition-all ${nomViewMode === 'cards' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white'}`;
    if (btnT) btnT.className = `btn btn-xs py-1.5 px-3 rounded text-xs flex items-center gap-1.5 transition-all ${nomViewMode === 'table' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white'}`;
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

    // Delete nomination button click
    const delBtn = e.target.closest('.delete-nom-btn');
    if (delBtn) {
      pendingDeleteId = delBtn.dataset.id;
      main.querySelector('#delNomCandidate').textContent = delBtn.dataset.candidate || 'Unknown';
      main.querySelector('#delNomPost').textContent = delBtn.dataset.post || 'Unknown';
      main.querySelector('#delNomId').textContent = pendingDeleteId;
      if (delInput) delInput.value = '';
      if (delErr) { delErr.textContent = ''; delErr.classList.add('hidden'); }
      delModal?.classList.remove('hidden');
      setTimeout(() => delInput?.focus(), 50);
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
        nom.rejectionReason = reason;
      }
      showToast(`Nomination #${id} marked as ${status}.`, 'success');
      applyFilters();
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.textContent = oldText;
    }
  });

  applyFilters(); // Initial render with sorting applied
}
