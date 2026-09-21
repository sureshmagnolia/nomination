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
  formatYearRuleDescription
} from '../utils.js';

let nominalRoll = [];
let allPosts = [];      // [{post, femaleOnly, finalYearIneligible, yearRestriction, deptRestriction}]
let existingNominations = [];
let electionSchedule = {};
let captchaAnswer = '';

export async function renderSubmitNomination(container) {
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

  container.innerHTML = publicLayout('Submit Nomination', `
    <div id="loadingState" class="flex flex-col items-center justify-center py-24 gap-4">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 text-sm">Loading data...</p>
    </div>
    <div id="formArea" class="hidden"></div>
  `, year, shortName);

  container.querySelector('#backToHome').addEventListener('click', () => router.navigate('/'));

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
    allPosts = Array.isArray(postsData) && postsData.length > 0
      ? postsData
      : CONFIG.DEFAULT_POSTS;

    renderForm(container, year, collegeName, setsData || {});
  } catch (e) {
    container.querySelector('#loadingState').innerHTML = `
      <div class="alert alert-error">${esc(e.message)}</div>
      <button class="btn btn-secondary mt-4" id="backBtn">← Back to Home</button>`;
    container.querySelector('#backBtn').addEventListener('click', () => router.navigate('/'));
  }
}

function renderForm(container, year, collegeName, setsData = {}) {
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
      </div>
    `;
    formArea.querySelector('#viewRollBtn').onclick = () => router.navigate('/nominal-roll');
    formArea.querySelector('#backBtn').onclick = () => router.navigate('/');
    return;
  }

  // 2. Enforce Schedule Windows (Start and End)
  const now = new Date();
  const start = electionSchedule.nominationStart ? new Date(electionSchedule.nominationStart) : null;
  const deadline = electionSchedule.nominationDeadline ? new Date(electionSchedule.nominationDeadline) : null;

  if (!window.ADMIN_BYPASS_PWD && start && !isNaN(start.getTime()) && now < start) {
    formArea.innerHTML = `
      <div class="glass p-12 text-center rounded-2xl border border-amber-500/20 max-w-2xl mx-auto page-enter">
        <div class="text-6xl mb-6">📅</div>
        <div class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3 inline-block">
          Scheduled Opening
        </div>
        <h3 class="text-2xl font-bold text-white mb-3">Nomination Filing Not Started</h3>
        <p class="text-slate-400 mb-6 leading-relaxed">
          Nomination submissions are scheduled to open on <strong>${start.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</strong>.
        </p>
        <button id="pendingBackBtn" class="btn btn-secondary">← Back to Home</button>
      </div>
    `;
    formArea.querySelector('#pendingBackBtn').onclick = () => router.navigate('/');
    return;
  }

  if (!window.ADMIN_BYPASS_PWD && deadline && !isNaN(deadline.getTime()) && now > deadline) {
    formArea.innerHTML = `
      <div class="glass p-12 text-center rounded-2xl border border-rose-500/20 max-w-2xl mx-auto page-enter">
        <div class="text-6xl mb-6">⏳</div>
        <div class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3 inline-block">
          Filing Ended
        </div>
        <h3 class="text-2xl font-bold text-white mb-3">Nomination Window Closed</h3>
        <p class="text-slate-400 mb-6 leading-relaxed">The official deadline for filing nominations was <strong>${deadline.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</strong>.</p>
        <button id="expiredBackBtn" class="btn btn-secondary">← Back to Home</button>
      </div>
    `;
    formArea.querySelector('#expiredBackBtn').onclick = () => router.navigate('/');
    return;
  }

  const postOptions = allPosts.map(p => `<option value="${esc(p.post)}">${esc(p.post)}</option>`).join('');

  formArea.innerHTML = `
    <div id="warningBox" class="hidden alert alert-warning mb-4"></div>

    <form id="nomForm" class="space-y-8">
      <!-- Post -->
      <div>
        <label class="block text-sm font-semibold text-slate-300 mb-1">Post Applied For</label>
        <select id="postSelect" class="field">${postOptions}</select>
        <div id="postRuleBadgeStrip" class="mt-2.5 flex flex-wrap items-center gap-2"></div>
      </div>

      <!-- Three columns: Candidate / Proposer / Seconder -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${personBlock('candidate', 'Candidate', true)}
        ${personBlock('proposer', 'Proposer', false)}
        ${personBlock('seconder', 'Seconder', false)}
      </div>

      <!-- Captcha -->
      <div class="glass rounded-xl p-5">
        <label class="block text-sm font-semibold text-slate-300 mb-2">🤖 Captcha Verification</label>
        <p class="text-slate-400 text-sm mb-3">What is <strong id="captchaQuestion" class="text-white text-base">${captcha.question}</strong>?</p>
        <div class="flex items-center gap-3">
          <input id="captchaInput" type="number" class="field w-40" placeholder="Your answer" />
          <button type="button" id="refreshCaptcha" class="btn btn-secondary btn-sm">↺ Refresh</button>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex gap-3">
        <button type="button" id="backHomeBtn" class="btn btn-secondary">← Back</button>
        <button type="submit" id="submitBtn" class="btn btn-primary flex-1">Generate &amp; Preview Nomination</button>
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
      el.addEventListener('input', () => fillDetails(formArea, role));
      el.addEventListener('change', () => fillDetails(formArea, role));
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
          fillDetails(formArea, role);
        }
        if (role === 'candidate') {
          const authInput = formArea.querySelector('#auth-candidate');
          if (authInput && (!authInput.value || authInput.value.trim() === '') && adm && adm !== '–') {
            authInput.value = adm;
            runValidation(formArea);
          }
        }
      });
    });
  });

  // Real-time listener on auth-candidate
  const authInput = formArea.querySelector('#auth-candidate');
  if (authInput) {
    authInput.addEventListener('input', () => runValidation(formArea));
    authInput.addEventListener('change', () => runValidation(formArea));
  }

  // Revalidate on any change
  formArea.querySelector('#postSelect')?.addEventListener('change', () => {
    updatePostBadgeStrip(formArea);
    runValidation(formArea);
  });
  updatePostBadgeStrip(formArea);
  formArea.querySelectorAll('[name="gender"]').forEach(r => r.addEventListener('change', () => runValidation(formArea)));
  formArea.querySelectorAll('.dob-sel').forEach(s => s.addEventListener('change', () => runValidation(formArea)));

  // Captcha refresh
  formArea.querySelector('#refreshCaptcha')?.addEventListener('click', () => {
    const c = generateCaptcha();
    captchaAnswer = c.answer;
    formArea.querySelector('#captchaInput').value = '';
    formArea.querySelector('#captchaQuestion').textContent = c.question;
  });

  formArea.querySelector('#backHomeBtn')?.addEventListener('click', () => router.navigate('/'));
  formArea.querySelector('#nomForm')?.addEventListener('submit', (e) => handleSubmit(e, formArea, year, collegeName, setsData?.collegeLogo || ''));
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

function personBlock(role, label, isCandidate) {
  return `
  <div class="glass rounded-xl p-4 space-y-3 border border-white/10 shadow-lg">
    <div class="flex items-center justify-between border-b border-white/10 pb-2">
      <h3 class="font-bold text-white text-sm uppercase tracking-wide flex items-center gap-2">
        <span>${isCandidate ? '👤' : (role === 'proposer' ? '✍️' : '🤝')}</span>
        ${label}
      </h3>
      <button type="button" class="btn btn-secondary btn-xs text-[11px] py-1 px-2.5 flex items-center gap-1.5 find-serial-btn border-indigo-500/30 text-indigo-300 hover:text-white" data-role="${role}" data-label="${label}">
        🔍 Find Sl. No.
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
    <div class="mt-4 pt-4 border-t border-white/10">
      <label class="text-xs font-semibold text-indigo-300 block mb-1">
        Your Admission Number (Authentication) <span class="text-rose-400">*</span>
      </label>
      <input id="auth-candidate" type="text" class="field mt-1 border-indigo-500/30 bg-indigo-900/20 font-mono text-sm" placeholder="Must match candidate serial record" required />
      <div id="auth-feedback" class="min-h-[1.25rem]"></div>
    </div>
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
      <div class="flex gap-2">
        <select id="dob-day"   class="field dob-sel"><option value="">Day</option></select>
        <select id="dob-month" class="field dob-sel"><option value="">Month</option></select>
        <select id="dob-year"  class="field dob-sel"><option value="">Year</option></select>
      </div>
    </div>` : ''}
  </div>`;
}

function fillDetails(formArea, role) {
  const serial = formArea.querySelector(`#serial-${role}`)?.value.trim();
  const box = formArea.querySelector(`#details-${role}`);
  if (!box) return;
  const student = nominalRoll.find(s => String(s['Nominal Roll Serial Number'] || s.serial_number || '') === serial);
  if (!student) {
    box.innerHTML = serial ? `
      <div class="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-2.5 rounded-lg mt-1 text-xs">
        ⚠️ Serial <strong>#${esc(serial)}</strong> not found in the published Nominal Roll!
      </div>` : '';
    runValidation(formArea);
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

  runValidation(formArea);
}

function runValidation(formArea) {
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

  // Real-time Candidate Admission check
  const authAdmInput = formArea.querySelector('#auth-candidate');
  const authAdm = authAdmInput?.value.trim().toLowerCase();
  const candStudent = students[0];
  const authFeedback = formArea.querySelector('#auth-feedback');

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

  // Eligibility (pass dynamic allPosts rules and existing noms for endorsing checks)
  const roleLabels = ['Candidate', 'Proposer', 'Seconder'];
  students.forEach((st, i) => {
    if (st) warnings.push(...checkEligibility(st, postName, roleLabels[i], i === 0 ? gender : null, allPosts, existingNominations));
  });

  const box = formArea.querySelector('#warningBox');
  if (box) {
    if (warnings.length) {
      box.innerHTML = '<strong class="block mb-1">⚠ Eligibility & Serial Number Warnings</strong>' + warnings.map(w => `<p class="text-sm">• ${esc(w)}</p>`).join('');
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }
  return warnings;
}

async function handleSubmit(e, formArea, yearValue, collegeName, collegeLogo = '') {
  e.preventDefault();
  const warnings = runValidation(formArea);
  if (warnings.length) { showToast('Please resolve all eligibility warnings first.', 'error'); return; }

  const captchaVal = formArea.querySelector('#captchaInput')?.value.trim();
  if (captchaVal !== captchaAnswer) { showToast('Captcha answer is incorrect.', 'error'); return; }

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

  const candidateAdmission = formArea.querySelector('#auth-candidate')?.value.trim();
  if (!candidateAdmission) { showToast('Please enter the Candidate Admission Number.', 'error'); return; }

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

    showPreview(formArea, result.id, { post, gender, day, month, year, dob: formattedDob, students }, yearValue, collegeName, collegeLogo);
    showToast(`Nomination submitted! ID: ${result.id}`, 'success');
  } catch (err) {
    showToast(`Submission failed: ${err.message}`, 'error');
  } finally {
    setLoading(submitBtn, false, 'Generate &amp; Preview Nomination');
  }
}

function showPreview(formArea, id, { post, gender, day, month, year, dob, students }, yearValue, collegeName, collegeLogo = '') {
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
  preview.querySelector('#newNomBtn')?.addEventListener('click', () => renderSubmitNomination(formArea.closest('#app')));
}

export function buildNominationPaper(id, post, gender, dobDisplay, age, candidate, proposer, seconder, status = '', yearValue = '2026', collegeName = null, collegeLogo = '') {
  const today = todayFormatted();
  const cName = collegeName || CONFIG.COLLEGE_NAME;
  return `
  <div class="print-paper border border-slate-700 rounded-xl p-8 bg-slate-900 text-slate-200 space-y-4">
    <div class="flex justify-between items-start text-sm">
      <div>
        ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:45px;max-width:120px;margin-bottom:4px;display:block;object-fit:contain" alt="College Logo">` : ''}
        <p class="font-bold text-white text-base">${esc(cName)}</p>
        <p class="text-slate-400">College Union Election ${yearValue}</p>
      </div>
      <div class="text-right">
        <p class="text-slate-400 text-xs">Generated: ${today}</p>
        ${status ? `<span class="badge badge-${status.toLowerCase()}">${esc(status)}</span>` : ''}
      </div>
    </div>
    <h2 class="text-center font-bold text-xl text-white border-y border-white/10 py-3">NOMINATION PAPER</h2>
    <p class="text-sm"><span class="font-semibold text-slate-400 w-40 inline-block">Post Applied For:</span> <strong class="text-white">${esc(post)}</strong></p>
    <div class="space-y-3">
      ${sectionBlock('Candidate', candidate, gender, dobDisplay, age)}
      ${sectionBlock('Proposer', proposer)}
      ${sectionBlock('Seconder', seconder)}
    </div>
    <div class="border-t border-white/10 pt-6 text-center space-y-3">
      <h3 class="font-bold text-white">Consent of Candidate</h3>
      <p class="text-sm text-slate-400">I agree, if elected, to serve on the body to which I am proposed as a candidate.</p>
      <div class="flex justify-around mt-6 text-sm text-slate-400">
        <p>Signature: _______________________</p>
        <p>Date: ______ / ______ / ________</p>
      </div>
      <p class="text-xs text-slate-500 italic mb-4">(To be signed in front of the Returning Officer)</p>
    </div>
    <div class="border-t border-white/10 pt-2 text-right">
      <p class="text-[10px] text-slate-500 font-mono">Ref ID: ${esc(id)}</p>
    </div>
  </div>`;
}

function sectionBlock(label, s, gender = null, dob = null, age = null) {
  if (!s) return '';
  const slNo = s['Nominal Roll Serial Number'] || s.serial_number || s.SL_NO || '';
  const admNo = s['ADMISION NO'] || s['ADMISSION NO'] || s.admission_no || s.candidateAdmission || s.proposerAdmission || s.seconderAdmission || '';
  return `
  <div class="glass rounded-lg p-4 text-sm space-y-1 border border-white/10">
    <div class="flex items-center justify-between border-b border-white/10 pb-1 mb-2">
      <h3 class="font-bold text-white uppercase text-xs tracking-widest">${label} Details</h3>
      <span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-bold text-xs px-2.5 py-0.5">
        Electoral Roll Sl. #${esc(slNo)}
      </span>
    </div>
    <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
      <p><span class="text-slate-400">Name:</span> <strong class="text-white text-sm">${esc(s['NAME'] || s.name || '')}</strong></p>
      <p><span class="text-slate-400">Admission No:</span> <strong class="text-indigo-300 font-mono">${esc(admNo || '–')}</strong></p>
      <p><span class="text-slate-400">Class:</span> <span class="text-slate-200">${esc(s['CLASS'] || s.class || '')}</span></p>
      <p><span class="text-slate-400">Dept:</span> <span class="text-slate-200">${esc(s['Dept'] || s.dept || 'N/A')}</span></p>
      ${gender ? `<p><span class="text-slate-400">Gender:</span> <span class="text-slate-200">${esc(gender)}</span></p>` : ''}
      ${dob ? `<p><span class="text-slate-400">Date of Birth:</span> <span class="text-slate-200">${esc(dob)}</span></p>` : ''}
      ${age ? `<p class="col-span-2"><span class="text-slate-400">Age as on Notification Date:</span> <strong class="text-emerald-400">${esc(age)}</strong></p>` : ''}
    </div>
    ${label !== 'Candidate' ? `
    <div class="flex justify-between mt-4 text-slate-500 text-xs pt-2 border-t border-white/5">
      <span>Date: ______ / ______ / ________</span>
      <span>Signature: _______________</span>
    </div>` : ''}
  </div>`;
}

function publicLayout(title, bodyHtml, yearValue = '2026', shortName = null) {
  const brandShort = shortName || CONFIG.COLLEGE_SHORT_NAME;
  return `
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-50 border-b border-white/10 glass">
      <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
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
    <main class="max-w-4xl mx-auto px-4 py-8">${bodyHtml}</main>
  </div>`;
}
