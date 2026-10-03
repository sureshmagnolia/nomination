/**
 * submitNomination.js
 * Renders the nomination form for students.
 * Posts are loaded dynamically from the database via the API.
 */
import { api } from '../api.js';
import { CONFIG } from '../config.js';
import { router } from '../router.js';
import {
  checkEligibility, generateCaptcha, populateDobSelects,
  buildDobString, displayDob, calculateAge, esc,
  setLoading, showToast, todayFormatted, triggerPrint,
  formatYearRuleDescription, sortPosts
} from '../utils.js';
import { printBlankNominationForm } from '../noticesPrinter.js';

let nominalRoll = [];
let allPosts = [];      // [{post, femaleOnly, finalYearIneligible, yearRestriction, deptRestriction}]
let existingNominations = [];
let electionSchedule = {};
let captchaAnswer = '';

export async function renderSubmitNomination(container, options = {}) {
  const isAdminDirect = Boolean(window.ADMIN_BYPASS_PWD || options.isAdminDirect);
  let year = new Date().getFullYear();
  let collegeName = CONFIG.COLLEGE_NAME;
  let shortName = CONFIG.COLLEGE_SHORT_NAME;
  try {
    const [s, sets] = await Promise.all([
      api.getPublicSchedule().catch(() => ({})),
      api.getSettings().catch(() => ({}))
    ]);
    if (s.electionYear) year = s.electionYear;
    if (sets.electionYear) year = sets.electionYear;
    if (sets.collegeName) collegeName = sets.collegeName;
    if (sets.collegeShortName) shortName = sets.collegeShortName;
  } catch(e) {}

  const bodyContent = `
    <div id="loadingState" class="flex flex-col items-center justify-center py-24 gap-4">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 text-sm">Loading data...</p>
    </div>
    <div id="formArea" class="hidden"></div>
  `;

  if (isAdminDirect) {
    container.innerHTML = `<div class="page-enter max-w-5xl mx-auto">${bodyContent}</div>`;
  } else {
    container.innerHTML = publicLayout('Submit Nomination', bodyContent, year, shortName);
    container.querySelector('#backToHome')?.addEventListener('click', () => router.navigate('/'));
  }

  try {
    // Load nominal roll, posts, existing nominations, schedule, and settings in parallel
    const [rollData, postsData, nomsData, scheduleData, setsData] = await Promise.all([
      api.getNominalRoll(),
      api.getPosts().catch(() => null),
      api.getPublicNominations().catch(() => []),
      api.getPublicSchedule().catch(() => ({})),
      api.getSettings().catch(() => ({}))
    ]);

    nominalRoll = Array.isArray(rollData) ? rollData : [];
    existingNominations = Array.isArray(nomsData) ? nomsData : [];
    electionSchedule = scheduleData || {};

    if (nominalRoll.length === 0) throw new Error('Nominal roll is empty. Please contact the admin.');

    // Use database posts if available, otherwise fall back to config defaults
    const rawPosts = Array.isArray(postsData) && postsData.length > 0
      ? postsData
      : CONFIG.DEFAULT_POSTS;
    allPosts = rawPosts.map(p => {
      if (p.post === 'The Chairman' || p.post === 'Chairman') return { ...p, post: 'The Chairperson' };
      if (p.post === 'The Vice Chairman' || p.post === 'Vice Chairman') return { ...p, post: 'The Vice Chairperson' };
      return p;
    });

    renderForm(container, year, collegeName, setsData || {}, isAdminDirect);
  } catch (e) {
    container.querySelector('#loadingState').innerHTML = `
      <div class="alert alert-error">${esc(e.message)}</div>
      <button class="btn btn-secondary mt-4" id="backBtn">← Back to Home</button>`;
    container.querySelector('#backBtn').addEventListener('click', () => router.navigate('/'));
  }
}

function renderForm(container, year, collegeName, setsData = {}, isAdminDirect = false) {
  const captcha = generateCaptcha();
  captchaAnswer = captcha.answer;

  container.querySelector('#loadingState').classList.add('hidden');
  const formArea = container.querySelector('#formArea');
  formArea.classList.remove('hidden');

  // 1. Enforce Final Nominal Roll publication
  const isRollFinal = setsData.nominalRollFinalized === 'true' || setsData.isRollFinalized === 'true';
  const isDraft = !isRollFinal && setsData.draftRollPublished === 'true';

  if (!window.ADMIN_BYPASS_PWD && !isRollFinal) {
    formArea.innerHTML = `
      <div class="glass p-12 text-center rounded-2xl border border-amber-500/20 max-w-2xl mx-auto page-enter">
        <div class="text-6xl mb-6">📜</div>
        <div class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3 inline-block">
          ${isDraft ? 'Draft Nominal Roll Live' : 'Nominal Roll Unpublished'}
        </div>
        <h3 class="text-2xl font-bold text-white mb-3">Nominations Not Open Yet</h3>
        <p class="text-slate-400 mb-6 leading-relaxed">
          Nomination submission will become active only after the <strong>Final Nominal Roll</strong> is officially published by the Returning Officer.
          ${isDraft ? '<br/><span class="text-xs text-amber-400/90 mt-2 block">Currently, only the Draft Voter List is published for verification & claims.</span>' : ''}
        </p>
        <div class="flex justify-center gap-3">
          <button id="viewRollBtn" class="btn btn-primary">📜 View Nominal Roll</button>
          <button id="backBtn" class="btn btn-secondary">← Back to Home</button>
        </div>
        <div class="mt-8 pt-4 border-t border-white/5 text-center">
          <button type="button" class="btn-blank-nom-trigger text-xs text-slate-400 hover:text-slate-300 underline underline-offset-4 transition inline-flex items-center gap-1.5 opacity-75 hover:opacity-100 cursor-pointer">
            <span>📄</span> Need to fill manually? Print Blank Nomination Form
          </button>
        </div>
      </div>
    `;
    formArea.querySelector('#viewRollBtn').onclick = () => router.navigate('/nominal-roll');
    formArea.querySelector('#backBtn').onclick = () => router.navigate('/');
    formArea.querySelectorAll('.btn-blank-nom-trigger').forEach(b => b.onclick = () => triggerBlankNominationAlert(setsData));
    return;
  }

  // 2. Nomination Window Access Gate (Strictly Manual Administrative Control)
  // Schedule dates are for informational guidance and statutory reference only.
  const nomOverride = electionSchedule.nominationOverride;
  const isNomOpen = electionSchedule.isNominationActive === true || 
                    electionSchedule.isNomActive === true || 
                    electionSchedule.nominationOpen === 'true' || 
                    setsData?.nominationOpen === 'true' || 
                    nomOverride === 'FORCE_OPEN';

  if (!window.ADMIN_BYPASS_PWD && !isNomOpen) {
    const start = electionSchedule.nominationStart ? new Date(electionSchedule.nominationStart) : null;
    const deadline = electionSchedule.nominationDeadline ? new Date(electionSchedule.nominationDeadline) : null;
    const startStr = start && !isNaN(start.getTime()) ? start.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' }) : '';
    const endStr = deadline && !isNaN(deadline.getTime()) ? deadline.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' }) : '';

    formArea.innerHTML = `
      <div class="glass p-12 text-center rounded-2xl border border-rose-500/20 max-w-2xl mx-auto page-enter">
        <div class="text-6xl mb-6">🛑</div>
        <div class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3 inline-block">
          Filing Closed
        </div>
        <h3 class="text-2xl font-bold text-white mb-3">Nomination Window Closed</h3>
        <p class="text-slate-400 mb-6 leading-relaxed">
          Candidate nomination submissions are currently closed by the Returning Officer.
          ${startStr ? `<br><span class="text-xs text-slate-500 mt-3 inline-block">Official Reference Schedule: <strong>${startStr}</strong> ${endStr ? `to <strong>${endStr}</strong>` : ''}</span>` : ''}
        </p>
        <button id="expiredBackBtn" class="btn btn-secondary">← Back to Home</button>
        <div class="mt-8 pt-4 border-t border-white/5 text-center">
          <button type="button" class="btn-blank-nom-trigger text-xs text-slate-400 hover:text-slate-300 underline underline-offset-4 transition inline-flex items-center gap-1.5 opacity-75 hover:opacity-100 cursor-pointer">
            <span>📄</span> Need to fill manually? Print Blank Nomination Form
          </button>
        </div>
      </div>
    `;
    formArea.querySelector('#expiredBackBtn').onclick = () => router.navigate('/');
    formArea.querySelectorAll('.btn-blank-nom-trigger').forEach(b => b.onclick = () => triggerBlankNominationAlert(setsData));
    return;
  }

  const sortedPosts = sortPosts(allPosts);
  const postOptions = sortedPosts.map(p => `<option value="${esc(p.post)}">${esc(p.post)}</option>`).join('');

  formArea.innerHTML = `
    <div id="warningBox" class="hidden alert alert-warning mb-4"></div>

    <form id="nomForm" class="space-y-8">
      <!-- Post Applied For (Searchable & Scrollable Combobox) -->
      <div class="relative" id="postComboboxContainer">
        <label class="block text-sm font-semibold text-slate-300 mb-1.5">Post Applied For <span class="text-rose-400">*</span></label>
        
        <!-- Native select kept hidden for programmatic validation & values -->
        <select id="postSelect" class="hidden">${postOptions}</select>

        <!-- Searchable & Scrollable Combobox Trigger -->
        <button type="button" id="postComboboxBtn" class="field w-full text-left flex items-center justify-between cursor-pointer select-none bg-black/40 hover:border-indigo-500/50 transition">
          <span id="postComboboxLabel" class="font-medium text-white truncate">${sortedPosts.length > 0 ? esc(sortedPosts[0].post) : 'Select Post'}</span>
          <span id="postComboboxArrow" class="text-slate-400 text-xs ml-2 transition-transform duration-200">▼</span>
        </button>

        <!-- Searchable Dropdown Popup Menu -->
        <div id="postComboboxMenu" class="hidden absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-slate-900 border border-white/20 shadow-2xl overflow-hidden backdrop-blur-xl">
          <div class="p-2.5 border-b border-white/10 bg-black/40 sticky top-0 z-10">
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input type="text" id="postSearchInput" class="w-full bg-slate-800/90 border border-white/15 rounded-lg pl-8 pr-8 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition" placeholder="Search post by name or department (e.g. Botany, Vice, Rep)..." autocomplete="off" />
              <button type="button" id="postSearchClear" class="hidden absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">✕</button>
            </div>
          </div>
          <div id="postComboboxList" class="max-h-64 overflow-y-auto divide-y divide-white/5 p-1 custom-scrollbar"></div>
        </div>

        <div id="postRuleBadgeStrip" class="mt-2.5 flex flex-wrap items-center gap-2"></div>
      </div>

      <!-- Three columns: Candidate / Proposer / Seconder -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${personBlock('candidate', 'Candidate', true, isAdminDirect)}
        ${personBlock('proposer', 'Proposer', false, isAdminDirect)}
        ${personBlock('seconder', 'Seconder', false, isAdminDirect)}
      </div>

      ${isAdminDirect ? '' : `
      <!-- Captcha -->
      <div class="glass rounded-xl p-5">
        <label class="block text-sm font-semibold text-slate-300 mb-2">🤖 Captcha Verification</label>
        <p class="text-slate-400 text-sm mb-3">What is <strong id="captchaQuestion" class="text-white text-base">${captcha.question}</strong>?</p>
        <div class="flex items-center gap-3">
          <input id="captchaInput" type="number" class="field w-40" placeholder="Your answer" />
          <button type="button" id="refreshCaptcha" class="btn btn-secondary btn-sm">↺ Refresh</button>
        </div>
      </div>
      `}

      <!-- Submit -->
      <div class="flex gap-3">
        <button type="button" id="backHomeBtn" class="btn btn-secondary">← Back</button>
        <button type="submit" id="submitBtn" class="btn btn-primary flex-1">Generate &amp; Preview Nomination</button>
      </div>

      <!-- Inconspicuous blank form option -->
      <div class="mt-6 pt-4 border-t border-white/5 text-center">
        <button type="button" class="btn-blank-nom-trigger text-xs text-slate-400 hover:text-slate-300 underline underline-offset-4 transition inline-flex items-center gap-1.5 opacity-75 hover:opacity-100 cursor-pointer">
          <span>📄</span> Need to fill manually? Print Blank Nomination Form
        </button>
      </div>
    </form>

    <!-- Print Preview (hidden until submitted) -->
    <div id="previewSection" class="hidden mt-10">
      <div class="flex items-center justify-between mb-4 no-print">
        <h2 class="text-lg font-bold text-white">📄 Nomination Preview</h2>
        <div class="flex gap-3">
          <button id="printBtn" class="btn btn-success">🖨️ Print Form</button>
          <button id="newNomBtn" class="btn btn-secondary">Submit Another</button>
        </div>
      </div>
      <div id="printZone" class="print-zone"></div>
    </div>
  `;

  // Helper to show eligibility badges for selected post
  function updatePostBadgeStrip(area) {
    const pName = area.querySelector('#postSelect')?.value;
    const strip = area.querySelector('#postRuleBadgeStrip');
    if (!strip || !pName) return;

    const rule = allPosts.find(p => p.post === pName) || {};
    const badges = [];

    if (rule.femaleOnly) {
      badges.push('<span class="badge bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs">♀ Female Candidates Only</span>');
    }

    const deptName = rule.restrictedDept || (rule.deptRestriction && String(rule.post || '').startsWith('Association Secretary ') ? rule.post.replace('Association Secretary ', '').trim() : '');
    if (rule.deptRestriction || deptName) {
      badges.push(`<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">🏢 ${esc(deptName || 'Dept')} Only (Candidate & Supporters)</span>`);
    }

    const yrDesc = formatYearRuleDescription(rule);
    if (yrDesc && yrDesc !== 'All Years Eligible' && yrDesc !== 'All Years') {
      const isBarred = rule.yearRuleMode === 'EXCLUDE' || rule.finalYearIneligible;
      if (isBarred) {
        badges.push(`<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold">🚫 ${esc(yrDesc)}</span>`);
      } else {
        badges.push(`<span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">🎓 ${esc(yrDesc)}</span>`);
      }
    }

    if (badges.length === 0) {
      badges.push('<span class="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">✓ Open to all eligible students</span>');
    }

    strip.innerHTML = badges.join('');
  }

  // Populate DOB dropdowns
  populateDobSelects(
    formArea.querySelector('#dob-day'),
    formArea.querySelector('#dob-month'),
    formArea.querySelector('#dob-year')
  );

  // Auto-fill listeners on BOTH input and change so typing serial immediately populates details!
  ['candidate','proposer','seconder'].forEach(role => {
    const el = formArea.querySelector(`#serial-${role}`);
    if (el) {
      el.addEventListener('input', () => fillDetails(formArea, role, isAdminDirect));
      el.addEventListener('change', () => fillDetails(formArea, role, isAdminDirect));
    }
  });

  // Attach search modal triggers
  formArea.querySelectorAll('.find-serial-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      const label = btn.dataset.label;
      openFindSerialModal(role, label, (serial, adm) => {
        const input = formArea.querySelector(`#serial-${role}`);
        if (input) {
          input.value = serial;
          fillDetails(formArea, role, isAdminDirect);
        }
        if (role === 'candidate' && !isAdminDirect) {
          const authInput = formArea.querySelector('#auth-candidate');
          if (authInput && (!authInput.value || authInput.value.trim() === '') && adm && adm !== '–') {
            authInput.value = adm;
            runValidation(formArea, isAdminDirect);
          }
        }
      });
    });
  });

  // Real-time listener on auth-candidate
  const authInput = formArea.querySelector('#auth-candidate');
  if (authInput) {
    authInput.addEventListener('input', () => runValidation(formArea, isAdminDirect));
    authInput.addEventListener('change', () => runValidation(formArea, isAdminDirect));
  }

  // Initialize searchable & scrollable Post dropdown
  setupPostCombobox(formArea, sortedPosts);

  // Revalidate on any change
  formArea.querySelector('#postSelect')?.addEventListener('change', () => {
    updatePostBadgeStrip(formArea);
    runValidation(formArea, isAdminDirect);
  });
  updatePostBadgeStrip(formArea);
  formArea.querySelectorAll('[name="gender"]').forEach(r => r.addEventListener('change', () => runValidation(formArea, isAdminDirect)));
  formArea.querySelectorAll('.dob-sel').forEach(s => s.addEventListener('change', () => runValidation(formArea, isAdminDirect)));

  // Captcha refresh
  formArea.querySelector('#refreshCaptcha')?.addEventListener('click', () => {
    const c = generateCaptcha();
    captchaAnswer = c.answer;
    formArea.querySelector('#captchaInput').value = '';
    formArea.querySelector('#captchaQuestion').textContent = c.question;
  });

  formArea.querySelector('#backHomeBtn')?.addEventListener('click', () => {
    if (isAdminDirect) {
      router.navigate('/admin/dashboard');
    } else {
      router.navigate('/');
    }
  });
  formArea.querySelector('#nomForm')?.addEventListener('submit', (e) => handleSubmit(e, formArea, year, collegeName, setsData?.collegeLogo || '', isAdminDirect));

  // Wire up blank nomination printing
  formArea.querySelectorAll('.btn-blank-nom-trigger').forEach(btn => {
    btn.addEventListener('click', () => triggerBlankNominationAlert(setsData));
  });
}

function triggerBlankNominationAlert(setsData = {}) {
  const proceed = confirm(
    "⚠️ NOTICE: BLANK NOMINATION FORM\n\n" +
    "You are requesting a BLANK Nomination Form for manual physical submission.\n\n" +
    "• This form must be hand-filled neatly in black or blue ballpoint ink in block letters.\n" +
    "• Proposer and Seconder signatures and Electoral Roll Serial Numbers are mandatory.\n" +
    "• The candidate must sign the statutory consent declaration in person before the Returning Officer.\n" +
    "• Physical submission must be completed before the official deadline.\n\n" +
    "Do you want to proceed and print the blank form?"
  );
  if (proceed) {
    printBlankNominationForm(setsData);
  }
}

function openFindSerialModal(role, roleLabel, onSelect) {
  const existing = document.getElementById('findSerialModalContainer');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'findSerialModalContainer';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm page-enter';
  
  modal.innerHTML = `
    <div class="relative bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-indigo-950/40">
        <div>
          <h3 class="font-bold text-white text-base flex items-center gap-2">
            🔍 Find Electoral Roll Serial Number
          </h3>
          <p class="text-xs text-slate-400">Selecting for: <strong class="text-indigo-300 uppercase">${esc(roleLabel)}</strong></p>
        </div>
        <button id="closeSerialModalBtn" class="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
      </div>
      
      <div class="p-4 border-b border-white/10 space-y-2 bg-slate-900/80">
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input type="text" id="serialSearchInput" class="field pl-10 w-full text-sm" placeholder="Search by Student Name, Admission No, or Class..." autofocus />
        </div>
        <div class="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span>⚠️</span>
          <span><strong>Critical:</strong> An incorrect Electoral Roll Serial Number leads to automatic rejection during scrutiny. Verify your Name and Admission No.</span>
        </div>
      </div>
      
      <div id="serialSearchResults" class="p-4 overflow-y-auto space-y-2 flex-1 max-h-[50vh]">
        <p class="text-slate-500 text-xs text-center py-6">Type a student name or admission number to search ${nominalRoll.length} students.</p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const searchInput = modal.querySelector('#serialSearchInput');
  const resultsBox = modal.querySelector('#serialSearchResults');
  const closeBtn = modal.querySelector('#closeSerialModalBtn');

  const close = () => modal.remove();
  closeBtn.onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  const renderResults = () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      resultsBox.innerHTML = `<p class="text-slate-500 text-xs text-center py-6">Type a student name or admission number to search ${nominalRoll.length} students.</p>`;
      return;
    }
    const matches = nominalRoll.filter(s => {
      const name = String(s['NAME'] || s.name || '').toLowerCase();
      const adm  = String(s['ADMISION NO'] || s['ADMISSION NO'] || s.admission_no || s['Admission No'] || s['Adm No'] || '').toLowerCase();
      const cls  = String(s['CLASS'] || s.class || '').toLowerCase();
      const dept = String(s['Dept'] || s.dept || '').toLowerCase();
      const sl   = String(s['Nominal Roll Serial Number'] || s.serial_number || '');
      return name.includes(q) || adm.includes(q) || cls.includes(q) || dept.includes(q) || sl === q || sl.includes(q);
    }).slice(0, 30);

    if (matches.length === 0) {
      resultsBox.innerHTML = `<p class="text-rose-400 text-xs text-center py-6">No matching student found in the published Nominal Roll for "${esc(q)}".</p>`;
      return;
    }

    resultsBox.innerHTML = matches.map(s => {
      const sl   = String(s['Nominal Roll Serial Number'] || s.serial_number || '');
      const name = String(s['NAME'] || s.name || '');
      const adm  = String(s['ADMISION NO'] || s['ADMISSION NO'] || s.admission_no || s['Admission No'] || s['Adm No'] || '–');
      const cls  = String(s['CLASS'] || s.class || '');
      const dept = String(s['Dept'] || s.dept || 'N/A');
      const isRS = cls.toUpperCase().includes('RESEARCH') || cls.toUpperCase().includes('SCHOLAR');
      const cannotSelect = role === 'candidate' && isRS;
      return `
        <div class="glass hover:bg-white/[0.04] p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3 transition-colors ${cannotSelect ? 'opacity-70' : ''}">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-bold text-xs px-2 py-0.5">
                Sl. #${esc(sl)}
              </span>
              <span class="font-bold text-white text-sm truncate">${esc(name)}</span>
              ${cannotSelect ? `<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-1.5 py-0.2">Cannot Contest</span>` : ''}
            </div>
            <div class="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-3">
              <span>Adm: <strong class="text-slate-300 font-mono">${esc(adm)}</strong></span>
              <span>Class: ${esc(cls)}</span>
              <span>Dept: ${esc(dept)}</span>
            </div>
          </div>
          ${cannotSelect ? `
            <button type="button" disabled class="btn btn-secondary btn-xs shrink-0 px-2.5 py-1 text-xs font-medium opacity-40 cursor-not-allowed" title="Research Scholars are not eligible to contest">
              Ineligible
            </button>
          ` : `
            <button type="button" class="btn btn-primary btn-xs shrink-0 select-serial-btn px-3 py-1 text-xs font-semibold" data-serial="${esc(sl)}" data-adm="${esc(adm)}">
              Select #${esc(sl)}
            </button>
          `}
        </div>
      `;
    }).join('');

    resultsBox.querySelectorAll('.select-serial-btn').forEach(btn => {
      btn.onclick = () => {
        onSelect(btn.dataset.serial, btn.dataset.adm);
        close();
      };
    });
  };

  searchInput.oninput = renderResults;
  setTimeout(() => searchInput.focus(), 100);
}

function personBlock(role, label, isCandidate, isAdminDirect = false) {
  return `
  <div class="glass rounded-xl p-4 space-y-3 border border-white/10 shadow-lg">
    <div class="flex items-center justify-between border-b border-white/10 pb-2">
      <h3 class="font-bold text-white text-sm uppercase tracking-wide flex items-center gap-1.5">
        <span>${isCandidate ? '👤' : (role === 'proposer' ? '✍️' : '🤝')}</span>
        ${label}
      </h3>
      <button type="button" class="find-serial-btn text-[11px] text-slate-400 hover:text-indigo-300 transition-colors flex items-center gap-1 py-1 px-2.5 rounded bg-white/[0.04] hover:bg-white/10 border border-white/10 cursor-pointer font-normal shrink-0 whitespace-nowrap" data-role="${role}" data-label="${label}" title="Lookup Serial Number in Nominal Roll">
        <span class="text-xs opacity-75">🔍</span> Find Sl. No.
      </button>
    </div>
    <div>
      <label class="text-xs text-slate-400 flex items-center justify-between">
        <span>Nominal Roll Serial No. <span class="text-rose-400">*</span></span>
        <span class="text-[10px] text-slate-500">Official voter list number</span>
      </label>
      <input id="serial-${role}" type="number" class="field mt-1 w-full font-mono text-base font-bold text-indigo-200" placeholder="e.g. 42" required />
    </div>
    <div id="details-${role}" class="text-xs text-slate-400 space-y-1 min-h-[3rem]"></div>
    ${isCandidate ? `
    ${isAdminDirect ? '' : `
    <div class="mt-4 pt-4 border-t border-white/10">
      <label class="text-xs font-semibold text-indigo-300 block mb-1">
        Your Admission Number (Authentication) <span class="text-rose-400">*</span>
      </label>
      <input id="auth-candidate" type="text" class="field mt-1 border-indigo-500/30 bg-indigo-900/20 font-mono text-sm" placeholder="Must match candidate serial record" required />
      <div id="auth-feedback" class="min-h-[1.25rem]"></div>
    </div>
    `}
    <div class="mt-4">
      <label class="text-xs text-slate-400 block mb-1">Gender <span class="text-rose-400">*</span></label>
      <div class="flex gap-4">
        <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="radio" name="gender" value="Male" class="accent-indigo-500" /> Male
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="radio" name="gender" value="Female" class="accent-indigo-500" /> Female
        </label>
      </div>
    </div>
    <div>
      <label class="text-xs text-slate-400 block mb-1">Date of Birth <span class="text-rose-400">*</span></label>
      <div class="flex gap-1.5 items-center">
        <select id="dob-day"   class="field dob-sel" style="flex: 1; min-width: 0;"><option value="">Day</option></select>
        <select id="dob-month" class="field dob-sel" style="flex: 1.5; min-width: 0;"><option value="">Month</option></select>
        <select id="dob-year"  class="field dob-sel" style="flex: 1.1; min-width: 0;"><option value="">Year</option></select>
      </div>
    </div>` : ''}
  </div>`;
}

function fillDetails(formArea, role, isAdminDirect = false) {
  const serial = formArea.querySelector(`#serial-${role}`)?.value.trim();
  const box = formArea.querySelector(`#details-${role}`);
  if (!box) return;
  const student = nominalRoll.find(s => String(s['Nominal Roll Serial Number'] || s.serial_number || '') === serial);
  if (!student) {
    box.innerHTML = serial ? `
      <div class="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-2.5 rounded-lg mt-1 text-xs">
        ⚠️ Serial <strong>#${esc(serial)}</strong> not found in the published Nominal Roll!
      </div>` : '';
    runValidation(formArea, isAdminDirect);
    return;
  }

  const sl = esc(student['Nominal Roll Serial Number'] || student.serial_number);
  const name = esc(student['NAME'] || student.name || '');
  const cls = esc(student['CLASS'] || student.class || '');
  const dept = esc(student['Dept'] || student.dept || 'N/A');
  const adm = esc(student['ADMISION NO'] || student['ADMISSION NO'] || student.admission_no || '–');

  box.innerHTML = `
    <div class="bg-indigo-950/40 border border-indigo-500/30 rounded-lg p-2.5 space-y-1 mt-1 text-xs">
      <div class="flex items-center justify-between border-b border-indigo-500/20 pb-1 mb-1">
        <span class="text-slate-400 font-medium">Electoral Roll Sl. No:</span>
        <span class="badge bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 font-mono font-bold text-xs px-2 py-0.5">
          #${sl}
        </span>
      </div>
      <p><span class="text-slate-400">Name:</span> <strong class="text-white">${name}</strong></p>
      <p><span class="text-slate-400">Class:</span> <span class="text-slate-200">${cls}</span></p>
      <p><span class="text-slate-400">Dept:</span> <span class="text-slate-200">${dept}</span></p>
      <p><span class="text-slate-400">Adm No:</span> <span class="text-indigo-300 font-mono font-semibold">${adm}</span></p>
    </div>`;

  runValidation(formArea, isAdminDirect);
}

function runValidation(formArea, isAdminDirect = false) {
  const warnings = [];
  const postName = formArea.querySelector('#postSelect')?.value;
  const gender = formArea.querySelector('[name="gender"]:checked')?.value || null;

  const roles = ['candidate','proposer','seconder'];
  const serials = roles.map(r => formArea.querySelector(`#serial-${r}`)?.value.trim() || '');
  const students = serials.map(s => s ? nominalRoll.find(st => String(st['Nominal Roll Serial Number'] || st.serial_number || '') === s) : null);

  // Uniqueness
  const [cS, pS, sS] = serials;
  if (cS && cS === pS) warnings.push('Candidate and Proposer cannot be the same person.');
  if (cS && cS === sS) warnings.push('Candidate and Seconder cannot be the same person.');
  if (pS && pS === sS) warnings.push('Proposer and Seconder cannot be the same person.');

  // Real-time Candidate Admission check (only for public nominations)
  const authAdmInput = formArea.querySelector('#auth-candidate');
  const authFeedback = formArea.querySelector('#auth-feedback');
  const candStudent = students[0];

  if (!isAdminDirect && authAdmInput) {
    const authAdm = authAdmInput.value.trim().toLowerCase();
    if (candStudent && authAdm) {
      const actualAdm = String(candStudent['ADMISION NO'] || candStudent['ADMISSION NO'] || candStudent.admission_no || '').trim().toLowerCase();
      if (actualAdm && authAdm !== actualAdm) {
        warnings.push(`Authentication Failed: Entered Admission Number "${authAdmInput.value}" does NOT match Electoral Roll Serial #${candStudent['Nominal Roll Serial Number']} (${candStudent['NAME']}). A mismatched serial number will result in rejection!`);
        if (authFeedback) {
          authFeedback.innerHTML = `<span class="text-rose-400 text-xs font-semibold flex items-center gap-1 mt-1">❌ Mismatch with Serial #${esc(candStudent['Nominal Roll Serial Number'])}! Registered Adm No is different.</span>`;
        }
      } else if (actualAdm && authAdm === actualAdm) {
        if (authFeedback) {
          authFeedback.innerHTML = `<span class="text-emerald-400 text-xs font-semibold flex items-center gap-1 mt-1">✅ Verified: Admission No matches Electoral Roll Serial #${esc(candStudent['Nominal Roll Serial Number'])}</span>`;
        }
      }
    } else if (authFeedback) {
      authFeedback.innerHTML = '';
    }
  }

  // Eligibility (pass dynamic allPosts rules and existing noms for endorsing checks)
  const roleLabels = ['Candidate', 'Proposer', 'Seconder'];
  students.forEach((st, i) => {
    if (st) warnings.push(...checkEligibility(st, postName, roleLabels[i], i === 0 ? gender : null, allPosts, existingNominations, isAdminDirect));
  });

  const infoNotices = [];

  // Direct Entry Notice for Duplicate Endorsements (accepted in direct entry, but flagged for admin)
  if (isAdminDirect) {
    if (pS) {
      const dupP = existingNominations.find(n => n.post === postName && n.status !== 'Rejected' && (String(n.proposerSerial) === pS || String(n.seconderSerial) === pS));
      if (dupP) {
        infoNotices.push(`⚠️ Direct Entry Notice: Proposer (#${pS}) has already endorsed candidate "${dupP.candidateName || 'Candidate'}" for "${postName}". Allowed in direct entry, but will be flagged during scrutiny.`);
      }
    }
    if (sS) {
      const dupS = existingNominations.find(n => n.post === postName && n.status !== 'Rejected' && (String(n.proposerSerial) === sS || String(n.seconderSerial) === sS));
      if (dupS) {
        infoNotices.push(`⚠️ Direct Entry Notice: Seconder (#${sS}) has already endorsed candidate "${dupS.candidateName || 'Candidate'}" for "${postName}". Allowed in direct entry, but will be flagged during scrutiny.`);
      }
    }
  }

  // Check for multi-submissions across different posts (Informational flag - allowed)
  if (cS) {
    const candOther = existingNominations.filter(n => n.status !== 'Rejected' && String(n.candidateSerial) === cS && n.post !== postName);
    if (candOther.length > 0) {
      const postsList = candOther.map(n => `"${n.post}"`).join(', ');
      infoNotices.push(`🚩 MULTI-POST CANDIDACY: Candidate (#${cS}) has also submitted nomination for: ${postsList}. Statutory Rule: The candidate MUST withdraw from all but one post before withdrawal deadline; otherwise ALL nominations will be CANCELLED!`);
    }
  }

  const box = formArea.querySelector('#warningBox');
  if (box) {
    const allMessages = [
      ...warnings.map(w => `<p class="text-sm font-semibold text-rose-300">• ${esc(w)}</p>`),
      ...infoNotices.map(info => `<p class="text-xs ${info.startsWith('🚩') ? 'text-rose-300 font-semibold' : 'text-indigo-300'}">• ${esc(info)}</p>`)
    ];
    if (allMessages.length) {
      box.innerHTML = `<strong class="block mb-1 text-sm ${warnings.length ? 'text-rose-200' : 'text-indigo-200'}">${warnings.length ? '⚠️ Eligibility Rejection Warnings' : 'ℹ️ Candidacy & Multi-Submission Notices'}</strong>` + allMessages.join('');
      box.className = `alert ${warnings.length ? 'alert-warning border-rose-500/50 bg-rose-950/40 text-rose-200' : 'alert-info'} mb-4`;
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }
  return warnings;
}

async function handleSubmit(e, formArea, yearValue, collegeName, collegeLogo = '', isAdminDirect = false) {
  e.preventDefault();
  const warnings = runValidation(formArea, isAdminDirect);
  if (warnings.length) {
    const msg = warnings.join('\n\n');
    alert(`⚠️ NOMINATION SUBMISSION REJECTED:\n\n${msg}`);
    showToast(warnings[0], 'error');
    return;
  }

  if (!isAdminDirect) {
    const captchaVal = formArea.querySelector('#captchaInput')?.value.trim();
    if (captchaVal !== captchaAnswer) { showToast('Captcha answer is incorrect.', 'error'); return; }
  }

  const post = formArea.querySelector('#postSelect')?.value;
  const gender = formArea.querySelector('[name="gender"]:checked')?.value;
  const day = formArea.querySelector('#dob-day')?.value;
  const month = formArea.querySelector('#dob-month')?.value;
  const year = formArea.querySelector('#dob-year')?.value;

  if (!gender) { showToast('Please select a gender for the candidate.', 'error'); return; }
  if (!day || !month || !year) { showToast('Please select a complete Date of Birth (Day, Month, Year).', 'error'); return; }

  const roles = ['candidate','proposer','seconder'];
  const serials = roles.map(r => formArea.querySelector(`#serial-${r}`)?.value.trim() || '');
  const students = serials.map(s => nominalRoll.find(st => String(st['Nominal Roll Serial Number'] || st.serial_number || '') === s));
  if (students.some(s => !s)) { showToast('One or more serial numbers are invalid.', 'error'); return; }

  let candidateAdmission = formArea.querySelector('#auth-candidate')?.value?.trim();
  if (isAdminDirect) {
    // In admin direct mode, candidate admission is not entered manually; fetch directly from nominal roll record
    const candStudent = students[0];
    candidateAdmission = candStudent ? String(candStudent['ADMISION NO'] || candStudent['ADMISSION NO'] || candStudent.admission_no || '').trim() : '';
  } else {
    if (!candidateAdmission) { showToast('Please enter the Candidate Admission Number.', 'error'); return; }
  }

  const submitBtn = formArea.querySelector('#submitBtn');
  setLoading(submitBtn, true, 'Generating & Previewing...');

  try {
    const formattedDob = buildDobString(day, month, year); // YYYY-MM-DD

    const payload = {
      post, gender,
      dob: formattedDob,
      candidateSerial: serials[0],
      proposerSerial:  serials[1],
      seconderSerial:  serials[2],
      candidateAdmission
    };

    // If admin is doing direct entry, include password to bypass deadline
    if (window.ADMIN_BYPASS_PWD) {
      payload.password = window.ADMIN_BYPASS_PWD;
    }

    const result = await api.submitNomination(payload);

    showPreview(formArea, result.id, { post, gender, day, month, year, dob: formattedDob, students }, yearValue, collegeName, collegeLogo, isAdminDirect);
    showToast(`Nomination submitted! ID: ${result.id}`, 'success');
  } catch (err) {
    showToast(`Submission failed: ${err.message}`, 'error');
  } finally {
    setLoading(submitBtn, false, 'Generate &amp; Preview Nomination');
  }
}

function showPreview(formArea, id, { post, gender, day, month, year, dob, students }, yearValue, collegeName, collegeLogo = '', isAdminDirect = false) {
  const [candidate, proposer, seconder] = students;
  const dobDisplay = displayDob(day, month, year);
  const age = calculateAge(dob);

  const preview = formArea.querySelector('#previewSection');
  formArea.querySelector('#printZone').innerHTML =
    buildNominationPaper(id, post, gender, dobDisplay, age, candidate, proposer, seconder, 'Pending', yearValue, collegeName, collegeLogo);

  preview.classList.remove('hidden');
  preview.scrollIntoView({ behavior: 'smooth' });
  preview.querySelector('#printBtn')?.addEventListener('click', () => {
    triggerPrint(formArea.querySelector('#printZone').innerHTML);
  });
  preview.querySelector('#newNomBtn')?.addEventListener('click', () => {
    const container = formArea.closest('#nominationWrapper') || formArea.closest('#app');
    renderSubmitNomination(container, { isAdminDirect });
  });
}

export function buildNominationPaper(id, post, gender, dobDisplay, age, candidate, proposer, seconder, status = '', yearValue = '2026', collegeName = null, collegeLogo = '') {
  const today = todayFormatted();
  const cName = collegeName || CONFIG.COLLEGE_NAME;

  const candName = candidate ? (candidate['Name of the Student'] || candidate.name || candidate.NAME || '') : '';
  const candSlNo = candidate ? (candidate['Nominal Roll Serial Number'] || candidate.serial_number || candidate.SL_NO || '') : '';
  const candAdmNo = candidate ? (candidate['ADMISION NO'] || candidate['ADMISSION NO'] || candidate.admission_no || '') : '';
  const candClass = candidate ? (candidate['CLASS'] || candidate.class || '') : '';

  const candDept = candidate ? (candidate['Dept'] || candidate.dept || '') : '';

  const certHtml = `
  <div class="print-paper border border-slate-700 rounded-xl p-8 bg-slate-900 text-slate-200 space-y-4" style="page-break-before: always; margin-top: 20px;">
    <div class="flex justify-between items-start text-sm border-b border-white/10 pb-4">
      <div>
        ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:45px;max-width:120px;margin-bottom:4px;display:block;object-fit:contain" alt="College Logo">` : ''}
        <p class="font-bold text-white text-base">${esc(cName)}</p>
        <p class="text-slate-400">College Union Election ${yearValue}</p>
      </div>
      <div class="text-right text-xs text-slate-400">
        <p>Supporting Document</p>
        <p class="font-mono mt-1">Ref ID: ${esc(id)}</p>
      </div>
    </div>
    
    <h2 class="text-center font-bold text-xl text-white py-3 uppercase underline" style="margin-top:20px;margin-bottom:20px;">Certificate from Head of Department</h2>
    
    <div class="my-6 text-base leading-relaxed space-y-6 text-slate-300">
      <p class="text-justify" style="line-height: 1.8;">
        This is to certify that <strong class="text-white">${esc(candName)}</strong> (Admission No: <strong class="text-white">${esc(candAdmNo)}</strong>, Nominal Roll Sl. No: <strong class="text-white">${esc(candSlNo)}</strong>), a student of <strong class="text-white">${esc(candClass)}</strong> class in this department, has no academic arrears and maintains the necessary minimum attendance as prescribed by the University election rules and bylaws to contest in the College Union Election ${yearValue}.
      </p>
      
      <div class="flex justify-between text-sm text-slate-400" style="margin-top: 80px;">
        <div class="space-y-3">
          <p>Date: ______ / ______ / ${yearValue}</p>
          <p>Place: ____________________</p>
        </div>
        <div class="text-center space-y-2">
          <p>_______________________</p>
          <p class="font-bold text-white">Name & Signature of the HoD</p>
          <p>Department of _________________</p>
          <p class="text-xs italic">(Office Seal)</p>
        </div>
      </div>
    </div>
  </div>`;

  return `
  <div class="print-paper border border-slate-700 rounded-xl p-3.5 bg-slate-900 text-slate-200 space-y-2.5">
    <div class="flex justify-between items-start text-sm pb-1.5 border-b border-white/10">
      <div>
        ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:44px;max-width:110px;margin-bottom:2px;display:block;object-fit:contain" alt="College Logo">` : ''}
        <p class="font-bold text-white text-base">${esc(cName)}</p>
        <p class="text-slate-400 text-xs">College Union Election ${yearValue}</p>
      </div>
      <div class="text-right space-y-0.5">
        <div class="flex items-center justify-end gap-2">
          <span class="text-slate-400 text-xs">Generated: ${today}</span>
          ${status ? `<span class="badge">${esc(status)}</span>` : ''}
        </div>
        <p class="text-xs text-indigo-300 font-mono font-semibold">Ref ID: ${esc(id)}</p>
      </div>
    </div>
    <h2 class="text-center font-bold text-base text-white border-y border-white/10 py-1 uppercase tracking-wider">NOMINATION PAPER</h2>
    <div class="text-xs flex items-baseline">
      <span class="font-bold text-white shrink-0 text-sm">Post Applied For:</span>
      <span class="ml-3 text-sm font-bold text-white border-b border-slate-400 pb-0.5 flex-1">${esc(post)}</span>
    </div>
    <div class="space-y-2.5">
      ${sectionBlock('Candidate', candidate, gender, dobDisplay, age)}
      ${sectionBlock('Proposer', proposer)}
      ${sectionBlock('Seconder', seconder)}
    </div>
    <div class="border-t border-white/10 pt-2 text-center">
      <h3 class="font-bold text-white text-xs uppercase tracking-wide mb-1">Consent of Candidate</h3>
      <p class="text-xs text-slate-300 mb-2">"I agree, if elected, to serve on the body to which I am proposed as a candidate."</p>
      <div class="flex justify-around items-start text-xs text-slate-400 mt-2">
        <div class="text-center">
          <div><strong>Signature of Candidate:</strong> <span class="dotted-line" style="width:230px;border-bottom:1.5px solid #000;height:20px;margin-left:4px;">&nbsp;</span></div>
          <div class="text-[9.5px] text-slate-500 italic mt-1">(To be signed in front of the Returning Officer)</div>
        </div>
        <div class="pt-0.5">
          <span><strong>Date:</strong> _____ / _____ / 202___</span>
        </div>
      </div>
    </div>

    <!-- Tear-off Dotted Line (Generous buffer so tearing never impairs candidate signature) -->
    <div style="display:flex;align-items:center;margin:26px 0 16px 0;">
      <div style="flex:1;border-top:1.5px dashed #444;"></div>
      <span style="padding:0 8px;font-size:8pt;font-weight:bold;text-transform:uppercase;white-space:nowrap;letter-spacing:0.02em;">
        ✂ Tear-off Acknowledgement Slip (To be signed &amp; returned to Candidate by Returning Officer) ✂
      </span>
      <div style="flex:1;border-top:1.5px dashed #444;"></div>
    </div>

    <!-- RO Acknowledgement Slip -->
    <div class="border border-white/20 rounded-lg p-3 bg-white/[0.03] space-y-2 text-xs">
      <div class="flex justify-between items-start border-b border-white/10 pb-1">
        <div>
          <p class="font-bold text-white text-xs uppercase tracking-wide">RECEIPT / ACKNOWLEDGEMENT SLIP</p>
          <p class="text-[10px] text-slate-400">${esc(cName)} • College Union Election ${yearValue}</p>
        </div>
        <div class="text-right font-mono text-[10px] text-slate-400">
          <p>Ref ID: <strong class="text-indigo-300 font-bold">${esc(id)}</strong></p>
        </div>
      </div>
      <div class="text-slate-300 text-xs leading-normal space-y-1.5">
        <p>
          Received nomination paper of Candidate: <strong class="text-white">${esc(candName)}</strong> (Roll Sl. #${esc(candSlNo)}, Adm No: <strong class="text-indigo-300 font-mono">${esc(candAdmNo)}</strong>, Class: ${esc(candClass)}${candDept ? `, Dept: ${esc(candDept)}` : ''})
        </p>
        <p>
          for the post of: <strong class="text-white font-semibold">${esc(post)}</strong> on _____ / _____ / ${yearValue} at _____ : _____ AM/PM.
        </p>
      </div>
      <div class="flex justify-between items-end pt-2 text-xs text-slate-400">
        <div>
          <p>Candidate: <strong class="text-white">${esc(candName)}</strong></p>
          <p class="italic text-[9.5px] text-slate-500">(Keep this receipt safely as proof of submission)</p>
        </div>
        <div class="text-center">
          <div style="border-top:1.5px dashed #000;width:220px;margin-top:22px;margin-bottom:3px;"></div>
          <p class="font-bold text-white text-[10px]">Signature &amp; Seal of Returning Officer</p>
        </div>
      </div>
    </div>
  </div>
  ${certHtml}`;
}

function sectionBlock(label, s, gender = null, dob = null, age = null) {
  if (!s) return '';
  const slNo = s['Nominal Roll Serial Number'] || s.serial_number || s.SL_NO || '';
  const admNo = s['ADMISION NO'] || s['ADMISSION NO'] || s.admission_no || s.candidateAdmission || s.proposerAdmission || s.seconderAdmission || '';

  if (label === 'Candidate') {
    return `
    <div class="glass rounded-lg p-3 text-xs space-y-2 border border-white/10">
      <div class="flex items-center justify-between border-b border-white/10 pb-1 mb-1">
        <h3 class="font-bold text-white uppercase text-xs tracking-wider">Candidate Details</h3>
        <span class="badge font-mono font-bold text-xs px-2 py-0.5">
          Roll Sl. #${esc(slNo)}
        </span>
      </div>
      <div class="space-y-2">
        <p><span class="text-slate-400 font-semibold">Name of Candidate:</span> <strong class="text-white text-sm ml-1.5">${esc(s['NAME'] || s.name || '')}</strong></p>
        <div class="grid grid-cols-2 gap-x-8 gap-y-2">
          <p><span class="text-slate-400 font-semibold">Admission No:</span> <strong class="text-indigo-300 font-mono ml-1">${esc(admNo || '–')}</strong></p>
          <p><span class="text-slate-400 font-semibold">Class:</span> <span class="text-slate-200 ml-1 font-medium">${esc(s['CLASS'] || s.class || '')}</span></p>
          <p><span class="text-slate-400 font-semibold">Department:</span> <span class="text-slate-200 ml-1 font-medium">${esc(s['Dept'] || s.dept || 'N/A')}</span></p>
          ${gender ? `<p><span class="text-slate-400 font-semibold">Gender:</span> <span class="text-slate-200 ml-1 font-medium">${esc(gender)}</span></p>` : ''}
        </div>
        ${dob || age ? `
        <div class="grid grid-cols-2 gap-x-8 pt-1.5 border-t border-white/5">
          ${dob ? `<p><span class="text-slate-400 font-semibold">Date of Birth:</span> <span class="text-slate-200 ml-1 font-mono">${esc(dob)}</span></p>` : ''}
          ${age ? `<p><span class="text-slate-400 font-semibold">Age (as on cutoff):</span> <strong class="text-emerald-400 ml-1">${esc(age)} yrs</strong></p>` : ''}
        </div>` : ''}
      </div>
    </div>`;
  }

  return `
  <div class="glass rounded-lg p-3 text-xs space-y-2 border border-white/10">
    <div class="flex items-center justify-between border-b border-white/10 pb-1 mb-1">
      <h3 class="font-bold text-white uppercase text-xs tracking-wider">${label} Details</h3>
      <span class="badge font-mono font-bold text-xs px-2 py-0.5">
        Roll Sl. #${esc(slNo)}
      </span>
    </div>
    <div class="space-y-2">
      <p><span class="text-slate-400 font-semibold">Name of ${label}:</span> <strong class="text-white text-sm ml-1.5">${esc(s['NAME'] || s.name || '')}</strong></p>
      <div class="grid grid-cols-3 gap-x-5">
        <p><span class="text-slate-400 font-semibold">Adm No:</span> <strong class="text-indigo-300 font-mono ml-1">${esc(admNo || '–')}</strong></p>
        <p><span class="text-slate-400 font-semibold">Class:</span> <span class="text-slate-200 ml-1 font-medium">${esc(s['CLASS'] || s.class || '')}</span></p>
        <p><span class="text-slate-400 font-semibold">Department:</span> <span class="text-slate-200 ml-1 font-medium">${esc(s['Dept'] || s.dept || 'N/A')}</span></p>
      </div>
      <div class="flex justify-between items-end pt-2 text-slate-400 text-xs border-t border-white/5">
        <span>Date: _____ / _____ / 202___</span>
        <span><strong>Signature of ${label}:</strong> <span class="dotted-line" style="width:230px;border-bottom:1.5px solid #000;height:22px;margin-left:4px;">&nbsp;</span></span>
      </div>
    </div>
  </div>`;
}

function publicLayout(title, bodyHtml, yearValue = '2026', shortName = null) {
  const brandShort = shortName || CONFIG.COLLEGE_SHORT_NAME;
  return `
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-50 border-b border-white/10 glass">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <button id="backToHome" class="btn btn-secondary btn-sm flex items-center gap-2">
            <span class="text-lg">←</span> Home
          </button>
          <div class="h-6 w-px bg-white/10 mx-2"></div>
          <h1 class="font-bold text-white text-lg tracking-tight">${esc(title)}</h1>
        </div>
        <div class="text-xs text-slate-500 font-medium hidden md:block uppercase tracking-widest">
          ${esc(brandShort)} Election Portal ${yearValue}
        </div>
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-8">${bodyHtml}</main>
  </div>`;
}

/**
 * Setup searchable & scrollable combobox for Post selection
 */
function setupPostCombobox(formArea, sortedPosts) {
  const container = formArea.querySelector('#postComboboxContainer');
  const select = formArea.querySelector('#postSelect');
  const trigger = formArea.querySelector('#postComboboxBtn');
  const label = formArea.querySelector('#postComboboxLabel');
  const arrow = formArea.querySelector('#postComboboxArrow');
  const menu = formArea.querySelector('#postComboboxMenu');
  const searchInput = formArea.querySelector('#postSearchInput');
  const clearBtn = formArea.querySelector('#postSearchClear');
  const list = formArea.querySelector('#postComboboxList');

  if (!container || !select || !trigger || !menu || !list) return;

  function renderOptions(filterText = '') {
    const q = (filterText || '').toLowerCase().trim();
    const filtered = sortedPosts.filter(p => {
      if (!q) return true;
      const name = String(p.post || '').toLowerCase();
      const dept = String(p.restrictedDept || (p.deptRestriction && String(p.post || '').startsWith('Association Secretary ') ? p.post.replace('Association Secretary ', '') : '')).toLowerCase();
      return name.includes(q) || dept.includes(q);
    });

    if (filtered.length === 0) {
      list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">No matching posts found.</div>`;
      return;
    }

    const currentVal = select.value;
    list.innerHTML = filtered.map(p => {
      const isSelected = p.post === currentVal;
      const badges = [];
      if (p.femaleOnly) {
        badges.push('<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/30">♀ Female Only</span>');
      }
      const deptName = p.restrictedDept || (p.deptRestriction && String(p.post || '').startsWith('Association Secretary ') ? p.post.replace('Association Secretary ', '').trim() : '');
      if (p.deptRestriction || deptName) {
        badges.push(`<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">🏢 ${esc(deptName || 'Dept')} Only</span>`);
      }
      const yrDesc = formatYearRuleDescription(p);
      if (yrDesc && yrDesc !== 'All Years Eligible' && yrDesc !== 'All Years') {
        badges.push(`<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">🎓 ${esc(yrDesc)}</span>`);
      }

      return `
        <div class="post-opt-item px-3.5 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition text-xs ${isSelected ? 'bg-indigo-600/30 text-white font-bold' : 'text-slate-200 hover:bg-white/10 hover:text-white'}" data-value="${esc(p.post)}">
          <div class="flex flex-col gap-1 min-w-0 pr-3">
            <span class="truncate text-sm font-semibold">${esc(p.post)}</span>
            ${badges.length ? `<div class="flex flex-wrap items-center gap-1.5">${badges.join('')}</div>` : ''}
          </div>
          ${isSelected ? '<span class="text-indigo-400 font-bold shrink-0 text-sm">✓</span>' : ''}
        </div>
      `;
    }).join('');

    list.querySelectorAll('.post-opt-item').forEach(item => {
      item.onclick = (e) => {
        e.stopPropagation();
        selectPost(item.dataset.value);
      };
    });
  }

  function selectPost(val) {
    select.value = val;
    label.textContent = val;
    closeMenu();
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function openMenu() {
    menu.classList.remove('hidden');
    arrow.style.transform = 'rotate(180deg)';
    renderOptions(searchInput.value);
    setTimeout(() => {
      searchInput.focus();
      searchInput.select();
    }, 50);
  }

  function closeMenu() {
    menu.classList.add('hidden');
    arrow.style.transform = 'rotate(0deg)';
  }

  trigger.onclick = (e) => {
    e.stopPropagation();
    if (menu.classList.contains('hidden')) {
      openMenu();
    } else {
      closeMenu();
    }
  };

  searchInput.oninput = () => {
    const val = searchInput.value;
    clearBtn.classList.toggle('hidden', !val);
    renderOptions(val);
  };

  clearBtn.onclick = (e) => {
    e.stopPropagation();
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    renderOptions('');
    searchInput.focus();
  };

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      closeMenu();
    }
  });

  // Close on Escape key
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      trigger.focus();
    }
  });

  // Keep label synced if select changes programmatically
  select.addEventListener('change', () => {
    label.textContent = select.value;
  });

  // Initial setup
  if (sortedPosts.length > 0 && !select.value) {
    select.value = sortedPosts[0].post;
  }
  label.textContent = select.value || (sortedPosts[0]?.post || 'Select Post');
}
