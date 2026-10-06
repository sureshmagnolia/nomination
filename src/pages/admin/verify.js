/**
 * pages/admin/verify.js
 * Admin page to review nominations, inspect full nomination paper,
 * audit statutory rule violations, manage physical document receipt intake,
 * and perform formal scrutiny (Valid / Rejected / Pending).
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, triggerPrint, calculateAge, getStudentYearLevel, isYearEligible, formatYearRuleDescription, sortPosts, comparePosts, formatDobDate, parseDobToIso } from '../../utils.js';
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
    const [noms, settings, posts, roll] = await Promise.all([
      api.adminGetNominations(pwd, true),
      api.adminGetSettings(pwd).catch(() => ({})),
      api.adminGetPosts(pwd).catch(() => api.getPosts().catch(() => CONFIG.DEFAULT_POSTS || [])),
      api.getNominalRoll().catch(() => []),
    ]);
    renderVerifyTable(container.querySelector('#adminMain'), noms, pwd, settings, posts, roll);
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
export function getNominationRuleViolations(nom, allPosts = [], allNominations = [], settings = {}, nominalRoll = []) {
  const violations = [];
  if (!nom) return violations;

  const isPhys = nom.physicalReceived === true || nom.physicalReceived === 'true' || nom.physical_received === true || nom.physical_received === 'true';

  // Real Submissions: only nominations that have been physically received and not rejected count as actual submissions
  const realSubmissions = allNominations.filter(n =>
    n && n.id !== nom.id &&
    (n.physicalReceived === true || n.physicalReceived === 'true' || n.physical_received === true || n.physical_received === 'true') &&
    n.status !== 'Rejected'
  );

  // If this nomination is an online generation attempt only, flag an informational status (not a barring error)
  if (!isPhys) {
    violations.push({
      type: 'AWAITING_PHYSICAL_INTAKE',
      severity: 'info',
      badgeLabel: 'Draft Only',
      shortBadge: 'Draft Only',
      message: 'Online generation attempt only. Physical signed paper has not yet been received or confirmed by the Returning Officer.'
    });
  }

  const postRule = allPosts.find(p => p.post === nom.post) || {};
  let cCls = String(nom.candidateClass || nom.candidate?.CLASS || '').toUpperCase();
  let cDept = String(nom.candidateDept || nom.candidate?.Dept || '').toUpperCase();
  const cSerial = String(nom.candidateSerial || nom.candidate?.['Nominal Roll Serial Number'] || '').trim();
  const cAdm = String(nom.candidateAdmission || nom.candidate?.['ADMISION NO'] || '').trim().toLowerCase();
  const cName = nom.candidateName || nom.candidate?.NAME || '';

  const pName = nom.proposerName || nom.proposer?.NAME || '';
  let pCls = String(nom.proposerClass || nom.proposer?.CLASS || '').toUpperCase();
  let pDept = String(nom.proposerDept || nom.proposer?.Dept || '').toUpperCase();
  const pSerial = String(nom.proposerSerial || nom.proposer?.['Nominal Roll Serial Number'] || '').trim();
  const pAdm = String(nom.proposerAdmission || nom.proposer?.['ADMISION NO'] || '').trim().toLowerCase();

  const sName = nom.seconderName || nom.seconder?.NAME || '';
  let sCls = String(nom.seconderClass || nom.seconder?.CLASS || '').toUpperCase();
  let sDept = String(nom.seconderDept || nom.seconder?.Dept || '').toUpperCase();
  const sSerial = String(nom.seconderSerial || nom.seconder?.['Nominal Roll Serial Number'] || '').trim();
  const sAdm = String(nom.seconderAdmission || nom.seconder?.['ADMISION NO'] || '').trim().toLowerCase();

  // Voter Roll Verification Helper
  const findVoter = (sl) => {
    if (!sl || !Array.isArray(nominalRoll) || nominalRoll.length === 0) return null;
    const sStr = String(sl).trim();
    return nominalRoll.find(st => String(st['Nominal Roll Serial Number'] || st.serial_number || '').trim() === sStr) || null;
  };
  const hasRoll = Array.isArray(nominalRoll) && nominalRoll.length > 0;

  // 0A. Candidate Electoral Roll / Voter Verification
  if (!cSerial || cSerial === '–' || cSerial === '0') {
    violations.push({
      type: 'MISSING_CANDIDATE_SERIAL',
      severity: 'error',
      message: 'Candidate Electoral Roll Serial Number is missing. Candidate must be an enrolled student voter.'
    });
  } else if (hasRoll) {
    const candVoter = findVoter(cSerial);
    if (!candVoter) {
      violations.push({
        type: 'NON_VOTER_CANDIDATE',
        severity: 'error',
        message: `Candidate Serial #${cSerial} (${cName || 'Candidate'}) is NOT FOUND in the Electoral Roll! Only enrolled students can contest.`
      });
    } else {
      if (!cCls) cCls = String(candVoter['CLASS'] || candVoter.class || '').toUpperCase();
      if (!cDept) cDept = String(candVoter['Dept'] || candVoter.dept || '').toUpperCase();
    }
  }

  // 0B. Proposer Electoral Roll / Voter Verification
  if (!pSerial || pSerial === '–' || pSerial === '0') {
    violations.push({
      type: 'MISSING_PROPOSER_SERIAL',
      severity: 'error',
      message: 'Proposer Electoral Roll Serial Number is missing. Proposer must be an enrolled student voter.'
    });
  } else if (hasRoll) {
    const propVoter = findVoter(pSerial);
    if (!propVoter) {
      violations.push({
        type: 'NON_VOTER_PROPOSER',
        severity: 'error',
        message: `Proposer Serial #${pSerial} (${pName || 'Proposer'}) is NOT FOUND in the Electoral Roll! Proposer is a non-voter and cannot propose.`
      });
    } else {
      if (!pCls) pCls = String(propVoter['CLASS'] || propVoter.class || '').toUpperCase();
      if (!pDept) pDept = String(propVoter['Dept'] || propVoter.dept || '').toUpperCase();
    }
  }

  // 0C. Seconder Electoral Roll / Voter Verification
  if (!sSerial || sSerial === '–' || sSerial === '0') {
    violations.push({
      type: 'MISSING_SECONDER_SERIAL',
      severity: 'error',
      message: 'Seconder Electoral Roll Serial Number is missing. Seconder must be an enrolled student voter.'
    });
  } else if (hasRoll) {
    const secVoter = findVoter(sSerial);
    if (!secVoter) {
      violations.push({
        type: 'NON_VOTER_SECONDER',
        severity: 'error',
        message: `Seconder Serial #${sSerial} (${sName || 'Seconder'}) is NOT FOUND in the Electoral Roll! Seconder is a non-voter and cannot second.`
      });
    } else {
      if (!sCls) sCls = String(secVoter['CLASS'] || secVoter.class || '').toUpperCase();
      if (!sDept) sDept = String(secVoter['Dept'] || secVoter.dept || '').toUpperCase();
    }
  }

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

  // 3. Age Limit Check (Calicut University & Lyngdoh Committee Statutory Limits) (RED)
  const ugCutoffStr = parseDobToIso(settings?.ugDobCutoff) || '2004-09-29';
  const pgCutoffStr = parseDobToIso(settings?.pgDobCutoff) || '2001-09-29';
  const ugCutoffDisplay = formatDobDate(ugCutoffStr) || '29/09/2004';
  const pgCutoffDisplay = formatDobDate(pgCutoffStr) || '29/09/2001';

  if (nom.dob) {
    const candDobIso = parseDobToIso(nom.dob);
    const candDobDisplay = formatDobDate(nom.dob) || nom.dob;

    if (candDobIso) {
      const isPG = cLvl === '1_PG' || cLvl === '2_PG';
      const isRS = cLvl === 'RS' || cCls.includes('RESEARCH') || cCls.includes('SCHOLAR') || cCls.includes('PHD');
      const isUG = !isPG && !isRS;

      if (isUG && candDobIso < ugCutoffStr) {
        violations.push({
          type: 'AGE_OVER_LIMIT_UG',
          severity: 'error',
          badgeLabel: `Born before ${ugCutoffDisplay}`,
          shortBadge: `Over Age (<${ugCutoffDisplay})`,
          message: `Statutory Age Bar (UG): Candidate was born on ${candDobDisplay}, which is before the University cut-off date (${ugCutoffDisplay}). Maximum UG age limit is 22 years as of the Notification Date (must be born on or after ${ugCutoffDisplay}).`
        });
      } else if (isPG && candDobIso < pgCutoffStr) {
        violations.push({
          type: 'AGE_OVER_LIMIT_PG',
          severity: 'error',
          badgeLabel: `Born before ${pgCutoffDisplay}`,
          shortBadge: `Over Age (<${pgCutoffDisplay})`,
          message: `Statutory Age Bar (PG): Candidate was born on ${candDobDisplay}, which is before the University cut-off date (${pgCutoffDisplay}). Maximum PG age limit is 25 years as of the Notification Date (must be born on or after ${pgCutoffDisplay}).`
        });
      } else if (isRS) {
        const d = new Date(candDobIso);
        const notifDate = settings?.notificationDate ? new Date(settings.notificationDate) : new Date('2026-09-29');
        let ageYears = notifDate.getFullYear() - d.getFullYear();
        const m = notifDate.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && notifDate.getDate() < d.getDate())) {
          ageYears--;
        }
        if (ageYears > 28) {
          violations.push({
            type: 'AGE_LIMIT_RS',
            severity: 'error',
            badgeLabel: 'Age > 28 (RS)',
            shortBadge: 'Over Age (>28)',
            message: `Candidate age is ${ageYears} years, exceeding the maximum Research Scholar age limit of 28 years.`
          });
        }
      }
    } else {
      violations.push({
        type: 'INVALID_DOB',
        severity: 'error',
        badgeLabel: 'Invalid DOB',
        shortBadge: 'Invalid DOB',
        message: `Candidate Date of Birth "${nom.dob}" could not be parsed. Unable to verify statutory age eligibility.`
      });
    }
  } else {
    violations.push({
      type: 'MISSING_DOB',
      severity: 'error',
      badgeLabel: 'Missing DOB',
      shortBadge: 'Missing DOB',
      message: 'Candidate Date of Birth (DOB) is missing from nomination. Age cannot be verified against statutory limits.'
    });
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
          message: `Candidate belongs to department "${nom.candidateDept || cDept || 'N/A'}", but post requires "${reqDept}".`
        });
      }
      if (!matches(pDept)) {
        violations.push({
          type: 'DEPT_PROPOSER',
          severity: 'error',
          message: `Proposer (${pName ? pName + ' - ' : ''}Dept: "${nom.proposerDept || pDept || 'N/A'}") does not belong to "${reqDept}". Only voters of "${reqDept}" department can propose.`
        });
      }
      if (!matches(sDept)) {
        violations.push({
          type: 'DEPT_SECONDER',
          severity: 'error',
          message: `Seconder (${sName ? sName + ' - ' : ''}Dept: "${nom.seconderDept || sDept || 'N/A'}") does not belong to "${reqDept}". Only voters of "${reqDept}" department can second.`
        });
      }
    }
  }

  // 5. Year Level Restriction & Electorate Checks (RED)
  if (postRule) {
    const desc = formatYearRuleDescription(postRule);
    
    // Check Candidate Year Level
    if (!cCls) {
      violations.push({
        type: 'MISSING_CANDIDATE_CLASS',
        severity: 'error',
        message: `Candidate class details are missing from nomination.`
      });
    } else if (!isYearEligible(cCls, postRule)) {
      violations.push({
        type: 'YEAR_ELIGIBILITY',
        severity: 'error',
        message: `Candidate class (${nom.candidateClass || cCls}) does not meet the year restriction for "${nom.post}" (${desc}).`
      });
    }

    // Check Proposer Year Electorate (e.g. 1 UG Rep only proposed by 1 UG voters)
    if (!pCls) {
      violations.push({
        type: 'MISSING_PROPOSER_CLASS',
        severity: 'error',
        message: `Proposer class details are missing; cannot verify voter electorate for "${nom.post}".`
      });
    } else if (!isYearEligible(pCls, postRule)) {
      violations.push({
        type: 'YEAR_PROPOSER',
        severity: 'error',
        message: `Proposer (${pName ? pName + ' - ' : ''}${nom.proposerClass || pCls}) does not belong to the voter electorate for "${nom.post}" (${desc}). Only voters of this electorate can propose.`
      });
    }

    // Check Seconder Year Electorate (e.g. 1 UG Rep only seconded by 1 UG voters)
    if (!sCls) {
      violations.push({
        type: 'MISSING_SECONDER_CLASS',
        severity: 'error',
        message: `Seconder class details are missing; cannot verify voter electorate for "${nom.post}".`
      });
    } else if (!isYearEligible(sCls, postRule)) {
      violations.push({
        type: 'YEAR_SECONDER',
        severity: 'error',
        message: `Seconder (${sName ? sName + ' - ' : ''}${nom.seconderClass || sCls}) does not belong to the voter electorate for "${nom.post}" (${desc}). Only voters of this electorate can second.`
      });
    }
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

  // 7. Duplicate Proposer / Seconder Endorsements on the SAME post (Evaluated ONLY against Physically Received nominations)
  const otherRealSubmissionsForPost = realSubmissions.filter(n => n.post === nom.post);
  
  if (pSerial || pAdm) {
    const dupProp = otherRealSubmissionsForPost.find(n => 
      (pSerial && (String(n.proposerSerial) === pSerial || String(n.seconderSerial) === pSerial)) ||
      (pAdm && (String(n.proposerAdmission).trim().toLowerCase() === pAdm || String(n.seconderAdmission).trim().toLowerCase() === pAdm))
    );
    if (dupProp) {
      violations.push({
        type: 'DUPLICATE_PROPOSER_ENDORSEMENT',
        severity: 'error',
        message: `🚩 Proposer (Sl #${pSerial || '–'}, ${pName}) has already endorsed physically received nomination #${dupProp.id} (${dupProp.candidateName || dupProp.candidate?.NAME || 'Candidate'}) for this same post ("${nom.post}"). A student can endorse only 1 candidate for the same post.`
      });
    }
  }

  if (sSerial || sAdm) {
    const dupSec = otherRealSubmissionsForPost.find(n => 
      (sSerial && (String(n.proposerSerial) === sSerial || String(n.seconderSerial) === sSerial)) ||
      (sAdm && (String(n.proposerAdmission).trim().toLowerCase() === sAdm || String(n.seconderAdmission).trim().toLowerCase() === sAdm))
    );
    if (dupSec) {
      violations.push({
        type: 'DUPLICATE_SECONDER_ENDORSEMENT',
        severity: 'error',
        message: `🚩 Seconder (Sl #${sSerial || '–'}, ${sName}) has already endorsed physically received nomination #${dupSec.id} (${dupSec.candidateName || dupSec.candidate?.NAME || 'Candidate'}) for this same post ("${nom.post}"). A student can endorse only 1 candidate for the same post.`
      });
    }
  }

  // 8. Multi-Post Candidacy (Evaluated ONLY against Physically Received nominations)
  const otherRealCandidatures = realSubmissions.filter(n => 
    (cSerial && String(n.candidateSerial) === cSerial) ||
    (cAdm && String(n.candidateAdmission).trim().toLowerCase() === cAdm)
  );
  if (otherRealCandidatures.length > 0) {
    const otherPosts = otherRealCandidatures.map(n => `"${n.post}" (#${n.id})`).join(', ');
    violations.push({
      type: 'MULTIPLE_CANDIDACY',
      severity: 'error',
      message: `🚩 MULTI-POST CANDIDACY: Candidate has physically submitted nominations for ${otherRealCandidatures.length + (isPhys ? 1 : 0)} posts (${isPhys ? `"${nom.post}", ` : ''}${otherPosts}). Statutory Rule: The candidate MUST withdraw from all but one post before withdrawal deadline; otherwise ALL nominations will be CANCELLED!`
    });
  }

  // 9. Duplicate Physical Submissions for the exact same post
  const samePostRealSubmissions = realSubmissions.filter(n => 
    n.post === nom.post && (
      (cSerial && String(n.candidateSerial) === cSerial) ||
      (cAdm && String(n.candidateAdmission).trim().toLowerCase() === cAdm)
    )
  );
  if (samePostRealSubmissions.length > 0) {
    const dupIds = samePostRealSubmissions.map(n => `#${n.id}`).join(', ');
    violations.push({
      type: 'DUPLICATE_CANDIDATE_SUBMISSION',
      severity: isPhys ? 'error' : 'info',
      badgeLabel: isPhys ? 'Duplicate Intake' : 'Prior Physical Exists',
      shortBadge: isPhys ? 'Duplicate' : 'Draft',
      message: isPhys 
        ? `🚩 DUPLICATE PHYSICAL SUBMISSION: Another nomination (${dupIds}) has already been physically received for this candidate for "${nom.post}". Only 1 physical nomination can be accepted per candidate per post.`
        : `ℹ️ Notice: A nomination (${dupIds}) has already been physically received for this candidate for "${nom.post}". This unconfirmed online draft is superfluous.`
    });
  }

  return violations;
}

function renderVerifyTable(main, noms, pwd, settings = {}, posts = [], nominalRoll = []) {
  const allNoms = Array.isArray(noms) ? [...noms] : [];
  const allPosts = Array.isArray(posts) ? [...posts] : [];
  const allRoll = Array.isArray(nominalRoll) ? [...nominalRoll] : [];

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
        background: var(--table-th-bg, rgba(15, 23, 42, 0.95)) !important;
        color: var(--table-th-text, #94a3b8) !important;
        font-size: 0.6875rem !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.04em !important;
        border-bottom: 2px solid var(--table-th-border, rgba(255, 255, 255, 0.08)) !important;
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
        color: var(--text-heading, #ffffff) !important;
        background: var(--table-hover-bg, rgba(30, 41, 59, 0.95)) !important;
      }
      #nomTable td {
        padding: 0.45rem 0.35rem !important;
        font-size: 0.8125rem !important;
        border-bottom: 1px solid var(--table-td-border, rgba(255, 255, 255, 0.04)) !important;
        color: var(--table-td-text, #cbd5e1) !important;
        vertical-align: middle !important;
        overflow-wrap: break-word !important;
        word-break: break-word !important;
        white-space: normal !important;
      }
      #nomTable tr.nom-row:hover td {
        background: var(--table-hover-bg, rgba(99, 102, 241, 0.04)) !important;
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

      <!-- University Statutory Age Cut-Offs Reference Banner -->
      <div class="glass p-3 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300 shadow-md">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold text-[11px] px-2 py-0.5">🏛️ Statutory Age Eligibility</span>
          <span>🎓 UG: Born on or after <strong class="text-indigo-200 font-mono text-xs">${formatDobDate(settings?.ugDobCutoff || '2004-09-29')}</strong> (&lt;22 yrs)</span>
          <span class="text-slate-600 hidden sm:inline">•</span>
          <span>📚 PG: Born on or after <strong class="text-purple-200 font-mono text-xs">${formatDobDate(settings?.pgDobCutoff || '2001-09-29')}</strong> (&lt;25 yrs)</span>
        </div>
        <a href="#/admin/schedule" data-nav="/admin/schedule" class="btn btn-secondary btn-xs bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] px-2.5 py-1 rounded font-semibold inline-flex items-center gap-1 shrink-0 transition-colors">
          <span>⚙️</span> <span>Edit Dates in Schedule</span>
        </a>
      </div>

      <!-- Search & Filters -->
      <div class="glass rounded-xl p-3 sm:p-4 flex flex-wrap gap-2.5 items-center w-full shadow-lg">
        <div class="relative flex-1 min-w-[200px]">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none select-none">🔍</span>
          <input type="text" id="nomSearch" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors text-xs sm:text-sm py-2" placeholder="Search Candidate, ID, Post, Dept, or Roll Serial...">
        </div>
        <!-- Arrange / Self-Organize Dropdown -->
        <div class="w-full sm:w-auto shrink-0 min-w-[190px]">
          <select id="arrangeFilter" class="field w-full bg-black/20 focus:bg-black/40 transition-colors text-xs font-semibold text-indigo-300 border border-indigo-500/30 py-2" title="Self-organizing arrangement">
            <option value="post" selected>🏛️ Group by Post (Statutory)</option>
            <option value="latest">🕒 Latest Submitted 1st</option>
            <option value="flags">🚩 Flags &amp; Alerts 1st</option>
            <option value="age_bar">🔞 Age Ineligible 1st</option>
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
        <option value="age_bar">🔞 Age Ineligible (Born before Cut-Off)</option>
        <option value="multi">🚩 Multi-Post Candidacies</option>
        <option value="violations">⚠️ Rule Violations Flagged</option>
        <option value="endorser">🚩 Ineligible Endorsers (Rejection Ground)</option>
      `;
    } else if (activeTab === 'not_confirmed') {
      statusFilterEl.innerHTML = `
        <option value="all">All Physical Not Received</option>
        <option value="age_bar">🔞 Age Ineligible (Born before Cut-Off)</option>
        <option value="multi">🚩 Multi-Post Candidacies</option>
        <option value="violations">⚠️ Rule Violations Flagged</option>
        <option value="endorser">🚩 Ineligible Endorsers (Rejection Ground)</option>
      `;
    } else if (activeTab === 'scrutiny') {
      statusFilterEl.innerHTML = `
        <option value="all">All Received Nominations</option>
        <option value="Pending">Pending Decision</option>
        <option value="Valid">Valid</option>
        <option value="Rejected">Rejected</option>
        <option value="age_bar">🔞 Age Ineligible (Born before Cut-Off)</option>
        <option value="multi">🚩 Multi-Post Candidacies</option>
        <option value="violations">⚠️ Rule Violations Flagged</option>
        <option value="endorser">🚩 Ineligible Endorsers (Rejection Ground)</option>
        <option value="passed">✓ All Rules Passed</option>
      `;
    } else if (activeTab === 'accepted') {
      statusFilterEl.innerHTML = `
        <option value="all">All Accepted Nominations</option>
        <option value="age_bar">🔞 Age Ineligible (Born before Cut-Off)</option>
        <option value="multi">🚩 Multi-Post Candidacies</option>
        <option value="violations">⚠️ Rule Violations Flagged</option>
        <option value="endorser">🚩 Ineligible Endorsers (Rejection Ground)</option>
        <option value="passed">✓ All Rules Passed</option>
      `;
    } else if (activeTab === 'rejected') {
      statusFilterEl.innerHTML = `
        <option value="all">All Rejected Nominations</option>
        <option value="age_bar">🔞 Age Ineligible (Born before Cut-Off)</option>
        <option value="multi">🚩 Multi-Post Candidacies</option>
        <option value="violations">⚠️ Rule Violations Flagged</option>
        <option value="endorser">🚩 Ineligible Endorsers (Rejection Ground)</option>
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
      const violations = getNominationRuleViolations(n, allPosts, allNoms, settings, allRoll);
      const isRS = String(n.candidateClass || '').toUpperCase().includes('RESEARCH') || String(n.candidateClass || '').toUpperCase().includes('SCHOLAR');
      const isPhysical = n.physicalReceived === true || n.physicalReceived === 'true';
      const ageViolation = violations.find(v => v.type.startsWith('AGE_OVER_LIMIT') || v.type.startsWith('AGE_LIMIT'));
      const candDobFormatted = formatDobDate(n.dob);
      const propIssues = violations.filter(v => 
        v.type === 'NON_VOTER_PROPOSER' || 
        v.type.startsWith('YEAR_PROPOSER') || 
        v.type.startsWith('DEPT_PROPOSER') || 
        v.type.startsWith('MISSING_PROPOSER') || 
        v.type.startsWith('DUPLICATE_PROPOSER') || 
        v.type === 'SAME_PROPOSER_SECONDER'
      );
      const secIssues = violations.filter(v => 
        v.type === 'NON_VOTER_SECONDER' || 
        v.type.startsWith('YEAR_SECONDER') || 
        v.type.startsWith('DEPT_SECONDER') || 
        v.type.startsWith('MISSING_SECONDER') || 
        v.type.startsWith('DUPLICATE_SECONDER') || 
        v.type === 'SAME_PROPOSER_SECONDER'
      );

      return `
      <tr id="row-${esc(n.id)}" class="nom-row hover:bg-white/[0.03] transition-colors ${ageViolation ? 'bg-rose-950/10' : ''}">
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
            ${ageViolation ? `<span class="badge bg-rose-600/30 text-rose-200 border border-rose-500/50 text-[9px] px-1 py-0 font-bold shrink-0" title="${esc(ageViolation.message)}">🔞 ${esc(ageViolation.shortBadge || 'Over Age')}</span>` : ''}
          </div>
          <div class="text-[11px] text-slate-300 leading-tight mt-0.5 break-words">
            ${esc(n.candidateClass || '')}${n.candidateDept ? ` · <span class="text-slate-400 text-[10px]">${esc(n.candidateDept)}</span>` : ''}
          </div>
          <div class="text-[10px] text-slate-400 font-mono leading-tight mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Adm: ${esc(n.candidateAdmission || n.candidate?.['ADMISION NO'] || '–')}</span>
            ${candDobFormatted ? `<span>· DOB: <strong class="${ageViolation ? 'text-rose-400 font-bold' : 'text-slate-300'}">${esc(candDobFormatted)}</strong></span>` : ''}
          </div>
        </td>

        <!-- Proposer & Seconder -->
        <td class="py-2 px-2 text-xs leading-snug">
          <div class="text-[11px] text-slate-300 break-words">
            <span class="text-slate-500 font-mono font-semibold text-[10px]">P:</span>
            <span class="font-medium ${propIssues.length ? 'text-rose-300 font-bold' : ''}">${esc(n.proposerName || n.proposer?.NAME || 'N/A')}</span>
            <span class="text-[10px] font-mono text-slate-500 shrink-0">(#${esc(n.proposerSerial || n.proposer?.['Nominal Roll Serial Number'] || '–')})</span>
            ${propIssues.length ? `<span class="badge bg-rose-600/30 text-rose-200 border border-rose-500/50 text-[9px] px-1 py-0 font-bold ml-1" title="${esc(propIssues.map(v => v.message).join('; '))}">🚩 Ineligible</span>` : ''}
            ${n.proposerClass ? `<div class="text-[10px] text-slate-400 pl-3 leading-tight truncate">${esc(n.proposerClass)}</div>` : ''}
          </div>
          <div class="text-[11px] text-slate-300 mt-1 break-words">
            <span class="text-slate-500 font-mono font-semibold text-[10px]">S:</span>
            <span class="font-medium ${secIssues.length ? 'text-rose-300 font-bold' : ''}">${esc(n.seconderName || n.seconder?.NAME || 'N/A')}</span>
            <span class="text-[10px] font-mono text-slate-500 shrink-0">(#${esc(n.seconderSerial || n.seconder?.['Nominal Roll Serial Number'] || '–')})</span>
            ${secIssues.length ? `<span class="badge bg-rose-600/30 text-rose-200 border border-rose-500/50 text-[9px] px-1 py-0 font-bold ml-1" title="${esc(secIssues.map(v => v.message).join('; '))}">🚩 Ineligible</span>` : ''}
            ${n.seconderClass ? `<div class="text-[10px] text-slate-400 pl-3 leading-tight truncate">${esc(n.seconderClass)}</div>` : ''}
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
                ${n.status === 'Valid' ? '🔄 Move to Reject' : '❌ Reject'}
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
            const actionableViolations = violations.filter(v => v.severity !== 'info');
            if (actionableViolations.length === 0) {
              if (!isPhysical) {
                return `
                  <span class="badge bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0.5 inline-flex items-center gap-1 font-medium" title="Online draft paper only. Physical copy not yet received by RO.">
                    <span>⏳</span> Draft Only
                  </span>
                `;
              }
              return `
                <span class="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-1.5 py-0.5 inline-flex items-center gap-1 font-medium">
                  <span>✓</span> Clear
                </span>
              `;
            }
            const multiCand = actionableViolations.find(v => v.type === 'MULTIPLE_CANDIDACY');
            const ageViolation = actionableViolations.find(v => v.type.startsWith('AGE_OVER_LIMIT') || v.type.startsWith('AGE_LIMIT'));
            const endorserIssues = actionableViolations.filter(v => 
              v.type === 'NON_VOTER_PROPOSER' || 
              v.type === 'NON_VOTER_SECONDER' || 
              v.type.startsWith('YEAR_PROPOSER') || 
              v.type.startsWith('YEAR_SECONDER') || 
              v.type.startsWith('DEPT_PROPOSER') || 
              v.type.startsWith('DEPT_SECONDER') ||
              v.type.startsWith('MISSING_PROPOSER') ||
              v.type.startsWith('MISSING_SECONDER') ||
              v.type.startsWith('DUPLICATE_PROPOSER') ||
              v.type.startsWith('DUPLICATE_SECONDER') ||
              v.type === 'SAME_PROPOSER_SECONDER'
            );
            return `
              <div class="flex flex-col gap-1 items-start">
                ${multiCand ? `
                  <button type="button" class="view-nom-btn badge bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 text-[10px] px-1.5 py-0.5 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors" data-id="${esc(n.id)}" title="${esc(multiCand.message)}">
                    <span>🚩 Multi-Post</span>
                  </button>
                ` : ''}
                ${ageViolation ? `
                  <button type="button" class="view-nom-btn badge bg-rose-600/30 hover:bg-rose-600/50 text-rose-100 border border-rose-500/60 text-[10px] px-1.5 py-0.5 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors" data-id="${esc(n.id)}" title="${esc(ageViolation.message)}">
                    <span>🔞 ${esc(ageViolation.badgeLabel || 'Age Bar')}</span>
                  </button>
                ` : ''}
                ${endorserIssues.length > 0 ? `
                  <button type="button" class="view-nom-btn badge bg-rose-600/30 hover:bg-rose-600/50 text-rose-100 border border-rose-500/60 text-[10px] px-1.5 py-0.5 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors" data-id="${esc(n.id)}" title="${esc(endorserIssues.map(v => v.message).join(' | '))}">
                    <span>🚩 Ineligible Endorser (${endorserIssues.length})</span>
                  </button>
                ` : ''}
                <button type="button" class="view-nom-btn badge bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] px-1.5 py-0.5 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors" data-id="${esc(n.id)}" title="${esc(actionableViolations.map(v => v.message).join(' | '))}">
                  <span>⚠️ ${actionableViolations.length} ${actionableViolations.length === 1 ? 'Flag' : 'Flags'}</span>
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
      const flaggedCount = items.filter(n => getNominationRuleViolations(n, allPosts, allNoms, settings, allRoll).filter(v => v.severity !== 'info').length > 0).length;

      return `
      <tr class="post-group-header">
        <td colspan="7" class="post-group-header-cell py-2 px-3 border-y shadow-sm">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2">
              <span class="text-indigo-500 text-sm">🏛️</span>
              <span class="font-bold text-xs sm:text-sm tracking-wide uppercase font-mono post-group-title">${esc(postName)}</span>
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
            <div class="text-[11px] font-mono hidden sm:block post-group-subtitle">
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
        const violations = getNominationRuleViolations(n, allPosts, allNoms, settings, allRoll);
        const isRS = String(n.candidateClass || '').toUpperCase().includes('RESEARCH') || String(n.candidateClass || '').toUpperCase().includes('SCHOLAR');
        const isPhysical = n.physicalReceived === true || n.physicalReceived === 'true';
        const ageViolation = violations.find(v => v.type.startsWith('AGE_OVER_LIMIT') || v.type.startsWith('AGE_LIMIT'));
        const candDobFormatted = formatDobDate(n.dob);
        const propIssues = violations.filter(v => 
          v.type === 'NON_VOTER_PROPOSER' || 
          v.type.startsWith('YEAR_PROPOSER') || 
          v.type.startsWith('DEPT_PROPOSER') || 
          v.type.startsWith('MISSING_PROPOSER') || 
          v.type.startsWith('DUPLICATE_PROPOSER') || 
          v.type === 'SAME_PROPOSER_SECONDER'
        );
        const secIssues = violations.filter(v => 
          v.type === 'NON_VOTER_SECONDER' || 
          v.type.startsWith('YEAR_SECONDER') || 
          v.type.startsWith('DEPT_SECONDER') || 
          v.type.startsWith('MISSING_SECONDER') || 
          v.type.startsWith('DUPLICATE_SECONDER') || 
          v.type === 'SAME_PROPOSER_SECONDER'
        );
        const endorserIssues = violations.filter(v => 
          v.type === 'NON_VOTER_PROPOSER' || 
          v.type === 'NON_VOTER_SECONDER' || 
          v.type.startsWith('YEAR_PROPOSER') || 
          v.type.startsWith('YEAR_SECONDER') || 
          v.type.startsWith('DEPT_PROPOSER') || 
          v.type.startsWith('DEPT_SECONDER') || 
          v.type.startsWith('MISSING_PROPOSER') || 
          v.type.startsWith('MISSING_SECONDER') || 
          v.type.startsWith('DUPLICATE_PROPOSER') || 
          v.type.startsWith('DUPLICATE_SECONDER') || 
          v.type === 'SAME_PROPOSER_SECONDER'
        );

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
                  ${ageViolation ? `<span class="badge bg-rose-600/30 text-rose-200 border border-rose-500/50 text-[10px] px-1.5 py-0.2 font-bold">🔞 ${esc(ageViolation.shortBadge || 'Over Age')}</span>` : ''}
                </div>
                <div class="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                  <span class="font-mono text-slate-400">Adm: <strong class="text-slate-200">${esc(n.candidateAdmission || n.candidate?.['ADMISION NO'] || '–')}</strong></span>
                  <span class="text-slate-500">•</span>
                  <span>${esc(n.candidateClass || '')}${n.candidateDept ? ` (${esc(n.candidateDept)})` : ''}</span>
                  ${candDobFormatted ? `<span class="text-slate-500">•</span><span class="font-mono ${ageViolation ? 'text-rose-400 font-bold' : 'text-slate-400'}">DOB: ${esc(candDobFormatted)}</span>` : ''}
                </div>
              </div>

              <!-- Proposer & Seconder -->
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="${propIssues.length ? 'bg-rose-950/40 border border-rose-500/50' : 'bg-black/20 border border-white/5'} p-2 rounded space-y-0.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] uppercase font-bold text-slate-400">Proposer</span>
                    ${propIssues.length ? `<span class="badge bg-rose-600/40 text-rose-200 border border-rose-500/60 text-[8px] px-1 font-bold">🚩 Ineligible</span>` : ''}
                  </div>
                  <div class="font-medium ${propIssues.length ? 'text-rose-200 font-bold' : 'text-slate-200'} truncate">${esc(n.proposerName || n.proposer?.NAME || 'N/A')}</div>
                  <div class="text-[10px] font-mono text-slate-400">Sl. #${esc(n.proposerSerial || n.proposer?.['Nominal Roll Serial Number'] || '–')}</div>
                  ${n.proposerClass ? `<div class="text-[10px] text-slate-400 truncate">${esc(n.proposerClass)}</div>` : ''}
                </div>
                <div class="${secIssues.length ? 'bg-rose-950/40 border border-rose-500/50' : 'bg-black/20 border border-white/5'} p-2 rounded space-y-0.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] uppercase font-bold text-slate-400">Seconder</span>
                    ${secIssues.length ? `<span class="badge bg-rose-600/40 text-rose-200 border border-rose-500/60 text-[8px] px-1 font-bold">🚩 Ineligible</span>` : ''}
                  </div>
                  <div class="font-medium ${secIssues.length ? 'text-rose-200 font-bold' : 'text-slate-200'} truncate">${esc(n.seconderName || n.seconder?.NAME || 'N/A')}</div>
                  <div class="text-[10px] font-mono text-slate-400">Sl. #${esc(n.seconderSerial || n.seconder?.['Nominal Roll Serial Number'] || '–')}</div>
                  ${n.seconderClass ? `<div class="text-[10px] text-slate-400 truncate">${esc(n.seconderClass)}</div>` : ''}
                </div>
              </div>

              <!-- Scrutiny Audit & Violations in RED -->
              <div class="space-y-1.5">
                ${(() => {
                  const actionableViolations = violations.filter(v => v.severity !== 'info');
                  if (actionableViolations.length === 0) {
                    if (!isPhysical) {
                      return `
                        <div class="badge bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-1 flex items-center justify-center gap-1.5 font-medium">
                          <span>⏳</span> Online Draft Only (Awaiting Physical Intake)
                        </div>
                      `;
                    }
                    return `
                      <div class="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 flex items-center justify-center gap-1.5 font-medium">
                        <span>✓</span> All Statutory Rules Passed
                      </div>
                    `;
                  }
                  const multiCand = actionableViolations.find(v => v.type === 'MULTIPLE_CANDIDACY');
                  const ageViolation = actionableViolations.find(v => v.type.startsWith('AGE_OVER_LIMIT') || v.type.startsWith('AGE_LIMIT'));
                  return `
                    ${multiCand ? `
                      <div class="text-xs text-rose-200 bg-rose-950/60 border border-rose-500/50 p-2.5 rounded-lg leading-relaxed shadow-sm">
                        ${esc(multiCand.message)}
                      </div>
                    ` : ''}
                    ${ageViolation ? `
                      <div class="text-xs text-rose-200 bg-rose-950/70 border border-rose-500/60 p-2.5 rounded-lg leading-relaxed shadow-sm flex items-start gap-2">
                        <span class="text-sm shrink-0">🔞</span>
                        <div>
                          <strong class="text-rose-100">${esc(ageViolation.badgeLabel)}:</strong> ${esc(ageViolation.message)}
                        </div>
                      </div>
                    ` : ''}
                    ${endorserIssues.length > 0 ? `
                      <div class="text-xs text-rose-200 bg-rose-950/70 border border-rose-500/60 p-2.5 rounded-lg leading-relaxed shadow-sm space-y-1">
                        <div class="flex items-center gap-1.5 font-bold text-rose-100">
                          <span>🚩</span> <span>Ineligible Endorser (${endorserIssues.length} Rejection Grounds):</span>
                        </div>
                        ${endorserIssues.map(ei => `<div class="text-[11px] leading-tight">• ${esc(ei.message)}</div>`).join('')}
                      </div>
                    ` : ''}
                    <button type="button" class="view-nom-btn w-full badge bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs px-2.5 py-1.5 font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors" data-id="${esc(n.id)}" title="${esc(actionableViolations.map(v => v.message).join(' | '))}">
                      <span>⚠️ ${actionableViolations.length} Statutory Flag${actionableViolations.length > 1 ? 's' : ''} in RED</span>
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

    // Scrutiny Rule Violations in RED (computed first so summaryBar and scrutinyZone can both access it)
    const violations = getNominationRuleViolations(nom, allPosts, allNoms, settings, allRoll);
    const propIssues = violations.filter(v => 
      v.type === 'NON_VOTER_PROPOSER' || 
      v.type.startsWith('YEAR_PROPOSER') || 
      v.type.startsWith('DEPT_PROPOSER') || 
      v.type.startsWith('MISSING_PROPOSER') || 
      v.type.startsWith('DUPLICATE_PROPOSER') || 
      v.type === 'SAME_PROPOSER_SECONDER'
    );
    const secIssues = violations.filter(v => 
      v.type === 'NON_VOTER_SECONDER' || 
      v.type.startsWith('YEAR_SECONDER') || 
      v.type.startsWith('DEPT_SECONDER') || 
      v.type.startsWith('MISSING_SECONDER') || 
      v.type.startsWith('DUPLICATE_SECONDER') || 
      v.type === 'SAME_PROPOSER_SECONDER'
    );

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
          <div class="text-[11px] text-slate-400 font-mono mt-0.5">
            Adm: <span class="text-slate-200">${esc(candAdm)}</span> • ${esc(candCls)}${candDept ? ` (${esc(candDept)})` : ''}
            ${nom.dob ? `<div class="mt-0.5 font-sans">DOB: <strong class="${violations.some(v => v.type.startsWith('AGE_OVER_LIMIT') || v.type.startsWith('AGE_LIMIT')) ? 'text-rose-400 font-bold' : 'text-slate-200'}">${esc(formatDobDate(nom.dob))}</strong></div>` : ''}
          </div>
        </div>
        <div class="bg-slate-900/90 p-3 rounded-xl ${propIssues.length ? 'border-2 border-rose-500 bg-rose-950/40' : 'border border-white/10'} shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Proposer (Sl. #${esc(propSerial)})</span>
            ${propIssues.length ? `<span class="badge bg-rose-600/40 text-rose-100 border border-rose-400 text-[9px] font-bold">🚩 Ineligible</span>` : ''}
          </div>
          <div class="font-medium ${propIssues.length ? 'text-rose-200 font-bold' : 'text-slate-200'} text-sm mt-1 truncate" title="${esc(propName)}">${esc(propName)}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${esc(propCls)}</div>
          ${propIssues.length ? `<div class="text-[10px] text-rose-300 mt-1 font-semibold leading-tight">⚠️ ${esc(propIssues[0].message)}</div>` : ''}
        </div>
        <div class="bg-slate-900/90 p-3 rounded-xl ${secIssues.length ? 'border-2 border-rose-500 bg-rose-950/40' : 'border border-white/10'} shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Seconder (Sl. #${esc(secSerial)})</span>
            ${secIssues.length ? `<span class="badge bg-rose-600/40 text-rose-100 border border-rose-400 text-[9px] font-bold">🚩 Ineligible</span>` : ''}
          </div>
          <div class="font-medium ${secIssues.length ? 'text-rose-200 font-bold' : 'text-slate-200'} text-sm mt-1 truncate" title="${esc(secName)}">${esc(secName)}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${esc(secCls)}</div>
          ${secIssues.length ? `<div class="text-[10px] text-rose-300 mt-1 font-semibold leading-tight">⚠️ ${esc(secIssues[0].message)}</div>` : ''}
        </div>
      `;
    }

    const actionableViolations = violations.filter(v => v.severity !== 'info');
    const infoViolations = violations.filter(v => v.severity === 'info');

    let scrutinyHtml = '';
    if (actionableViolations.length > 0) {
      scrutinyHtml += `
        <div class="rounded-xl border border-rose-500/50 bg-rose-950/60 p-4 space-y-2.5 shadow-lg">
          <div class="flex items-center justify-between border-b border-rose-500/30 pb-2">
            <div class="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <span class="text-base">⚠️</span> Rule Violations & Scrutiny Warnings in RED (${actionableViolations.length})
            </div>
            <span class="badge bg-rose-500/30 text-rose-200 border border-rose-500/50 text-[10px] font-bold uppercase tracking-wider">Scrutiny Alert</span>
          </div>
          <div class="text-xs text-rose-200 space-y-2 pl-1">
            ${actionableViolations.map(v => {
              const isEndorser = v.type.includes('PROPOSER') || v.type.includes('SECONDER');
              return `
                <div class="flex items-start gap-2 ${v.type === 'MULTIPLE_CANDIDACY' ? 'bg-rose-900/50 p-2.5 rounded-lg border border-rose-500/40 font-semibold' : isEndorser ? 'bg-rose-900/30 p-2 rounded-lg border border-rose-500/30' : ''}">
                  <span class="text-rose-400 font-bold text-sm leading-none">•</span>
                  <span class="leading-relaxed">
                    ${isEndorser ? '<strong class="text-rose-100 uppercase tracking-wide text-[10px] bg-rose-600/50 px-1.5 py-0.5 rounded mr-1">Rejection Ground:</strong>' : ''}
                    ${esc(v.message)}
                  </span>
                </div>
              `;
            }).join('')}
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

    if (infoViolations.length > 0) {
      scrutinyHtml += `
        <div class="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 space-y-1.5 text-xs text-amber-200 shadow-sm mt-2">
          <div class="flex items-center gap-2 font-bold text-amber-300">
            <span>ℹ️</span> <span>Submission Status Notice</span>
          </div>
          ${infoViolations.map(iv => `<div>• ${esc(iv.message)}</div>`).join('')}
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
      const violations = getNominationRuleViolations(n, allPosts, allNoms, settings, allRoll);
      const isPhys = n.physicalReceived === true || n.physicalReceived === 'true';
      const actionableViolations = violations.filter(v => v.severity !== 'info');

      const isEndorserIssue = (vList) => vList.some(v => 
        v.type === 'NON_VOTER_PROPOSER' || 
        v.type === 'NON_VOTER_SECONDER' || 
        v.type.startsWith('YEAR_PROPOSER') || 
        v.type.startsWith('YEAR_SECONDER') || 
        v.type.startsWith('DEPT_PROPOSER') || 
        v.type.startsWith('DEPT_SECONDER') ||
        v.type.startsWith('MISSING_PROPOSER') ||
        v.type.startsWith('MISSING_SECONDER') ||
        v.type.startsWith('DUPLICATE_PROPOSER') ||
        v.type.startsWith('DUPLICATE_SECONDER') ||
        v.type === 'SAME_PROPOSER_SECONDER'
      );

      if (activeTab === 'intake') {
        if (s === 'received' && !isPhys) return false;
        if (s === 'awaiting' && isPhys) return false;
        if (s === 'age_bar' && !actionableViolations.some(v => v.type.startsWith('AGE_OVER_LIMIT') || v.type.startsWith('AGE_LIMIT'))) return false;
        if (s === 'multi' && !actionableViolations.some(v => v.type === 'MULTIPLE_CANDIDACY')) return false;
        if (s === 'violations' && actionableViolations.length === 0) return false;
        if (s === 'endorser' && !isEndorserIssue(actionableViolations)) return false;
      } else if (activeTab === 'not_confirmed') {
        if (s === 'age_bar' && !actionableViolations.some(v => v.type.startsWith('AGE_OVER_LIMIT') || v.type.startsWith('AGE_LIMIT'))) return false;
        if (s === 'multi' && !actionableViolations.some(v => v.type === 'MULTIPLE_CANDIDACY')) return false;
        if (s === 'violations' && actionableViolations.length === 0) return false;
        if (s === 'endorser' && !isEndorserIssue(actionableViolations)) return false;
      } else if (activeTab === 'scrutiny') {
        if (s === 'age_bar' && !actionableViolations.some(v => v.type.startsWith('AGE_OVER_LIMIT') || v.type.startsWith('AGE_LIMIT'))) return false;
        if (s === 'violations' && actionableViolations.length === 0) return false;
        if (s === 'multi' && !actionableViolations.some(v => v.type === 'MULTIPLE_CANDIDACY')) return false;
        if (s === 'endorser' && !isEndorserIssue(actionableViolations)) return false;
        if (s === 'passed' && actionableViolations.length > 0) return false;
        if (s !== 'all' && s !== 'violations' && s !== 'multi' && s !== 'endorser' && s !== 'passed' && s !== 'age_bar') {
          if (n.status !== s) return false;
        }
      } else if (activeTab === 'accepted' || activeTab === 'rejected') {
        if (s === 'age_bar' && !actionableViolations.some(v => v.type.startsWith('AGE_OVER_LIMIT') || v.type.startsWith('AGE_LIMIT'))) return false;
        if (s === 'violations' && actionableViolations.length === 0) return false;
        if (s === 'multi' && !actionableViolations.some(v => v.type === 'MULTIPLE_CANDIDACY')) return false;
        if (s === 'endorser' && !isEndorserIssue(actionableViolations)) return false;
        if (s === 'passed' && actionableViolations.length > 0) return false;
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
          const vA = getNominationRuleViolations(a, allPosts, allNoms, settings, allRoll).filter(v => v.severity !== 'info').length;
          const vB = getNominationRuleViolations(b, allPosts, allNoms, settings, allRoll).filter(v => v.severity !== 'info').length;
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
          const vA = getNominationRuleViolations(a, allPosts, allNoms, settings, allRoll).filter(v => v.severity !== 'info');
          const vB = getNominationRuleViolations(b, allPosts, allNoms, settings, allRoll).filter(v => v.severity !== 'info');
          const multiA = vA.some(v => v.type === 'MULTIPLE_CANDIDACY') ? 1 : 0;
          const multiB = vB.some(v => v.type === 'MULTIPLE_CANDIDACY') ? 1 : 0;
          if (multiA !== multiB) return multiB - multiA;
          const ageA = vA.some(v => v.type.startsWith('AGE_OVER_LIMIT') || v.type.startsWith('AGE_LIMIT')) ? 1 : 0;
          const ageB = vB.some(v => v.type.startsWith('AGE_OVER_LIMIT') || v.type.startsWith('AGE_LIMIT')) ? 1 : 0;
          if (ageA !== ageB) return ageB - ageA;
          if (vA.length !== vB.length) return vB.length - vA.length;
          return comparePosts(a.post, b.post);
        });
      } else if (arrangeMode === 'age_bar') {
        filtered.sort((a, b) => {
          const vA = getNominationRuleViolations(a, allPosts, allNoms, settings, allRoll).filter(v => v.severity !== 'info');
          const vB = getNominationRuleViolations(b, allPosts, allNoms, settings, allRoll).filter(v => v.severity !== 'info');
          const ageA = vA.some(v => v.type.startsWith('AGE_OVER_LIMIT') || v.type.startsWith('AGE_LIMIT')) ? 1 : 0;
          const ageB = vB.some(v => v.type.startsWith('AGE_OVER_LIMIT') || v.type.startsWith('AGE_LIMIT')) ? 1 : 0;
          if (ageA !== ageB) return ageB - ageA;
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
      const [freshNoms, freshPosts, freshRoll] = await Promise.all([
        api.adminGetNominations(pwd, true),
        api.adminGetPosts(pwd).catch(() => allPosts),
        api.getNominalRoll().catch(() => allRoll),
      ]);
      allNoms.length = 0;
      if (Array.isArray(freshNoms)) allNoms.push(...freshNoms);
      if (Array.isArray(freshPosts)) { allPosts.length = 0; allPosts.push(...freshPosts); }
      if (Array.isArray(freshRoll)) { allRoll.length = 0; allRoll.push(...freshRoll); }
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
      const nom = allNoms.find(n => n.id === id);
      const isPhysical = nom && (nom.physicalReceived === true || nom.physicalReceived === 'true');
      if (nom && !isPhysical) {
        await api.adminTogglePhysicalReceipt(pwd, id, true).catch(() => {});
        nom.physicalReceived = true;
        nom.physicalReceivedAt = new Date().toISOString();
      }
      await api.adminVerifyNomination(pwd, id, 'Valid');
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
    const violations = getNominationRuleViolations(nom, allPosts, allNoms, settings, allRoll);
    const actionableViolations = violations.filter(v => v.severity !== 'info');
    const isPhysical = nom && (nom.physicalReceived === true || nom.physicalReceived === 'true');
    const defaultReason = actionableViolations.length > 0 
      ? actionableViolations[0].message 
      : (!isPhysical ? 'Physical signed copy not submitted to Returning Officer' : 'Serial number or eligibility requirement not met');

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
      const violations = getNominationRuleViolations(nom, allPosts, allNoms, settings, allRoll);
      const actionableViolations = violations.filter(v => v.severity !== 'info');
      const isPhysical = nom && (nom.physicalReceived === true || nom.physicalReceived === 'true');
      const defaultReason = actionableViolations.length > 0 
        ? actionableViolations[0].message 
        : (!isPhysical ? 'Physical signed copy not submitted to Returning Officer' : 'Serial number or eligibility requirement not met');
      reason = prompt(`Please enter the statutory reason for rejecting Nomination #${id}:`, defaultReason);
      if (reason === null) return;
      reason = reason.trim() || 'Scrutiny criteria not satisfied';
    }

    btn.disabled = true;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
    
    try {
      const nom = allNoms.find(n => String(n.id) === String(id));
      const isPhysical = nom && (nom.physicalReceived === true || nom.physicalReceived === 'true');
      if (status === 'Valid' && nom && !isPhysical) {
        await api.adminTogglePhysicalReceipt(pwd, id, true).catch(() => {});
        nom.physicalReceived = true;
        nom.physicalReceivedAt = new Date().toISOString();
      }
      await api.adminVerifyNomination(pwd, id, status, reason);
      if (nom) {
        nom.status = status;
        nom.rejectionReason = status === 'Rejected' ? reason : null;
      }
      showToast(`Nomination #${id} marked as ${status}.`, 'success');
      applyFilters();
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.innerHTML = oldHtml;
    }
  });

  updateNomViewUI(); // Ensure initial view mode (cards or table) is applied
  applyFilters(); // Initial render with sorting applied
}
