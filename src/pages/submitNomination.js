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
  formArea.querySelector('#nomForm')?.addEventListener('submit', (e) => handleSubmit(e, formArea, year, collegeName));
}

function personBlock(role, label, isCandidate) {
  return `
  <div class="glass rounded-xl p-4 space-y-3">
    <h3 class="font-bold text-white text-sm uppercase tracking-wide border-b border-white/10 pb-2">${label}</h3>
    <div>
      <label class="text-xs text-slate-400">Nominal Roll Serial No.</label>
      <input id="serial-${role}" type="number" class="field mt-1" placeholder="Enter serial number" />
    </div>
    <div id="details-${role}" class="text-xs text-slate-400 space-y-1 min-h-[3rem]"></div>
    ${isCandidate ? `
    <div class="mt-4 pt-4 border-t border-white/10">
      <label class="text-xs font-semibold text-indigo-300 block mb-1">Your Admission Number (Auth)</label>
      <input id="auth-candidate" type="text" class="field mt-1 border-indigo-500/30 bg-indigo-900/20" placeholder="Required for submission" />
    </div>
    <div class="mt-4">
      <label class="text-xs text-slate-400 block mb-1">Gender</label>
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
      <label class="text-xs text-slate-400 block mb-1">Date of Birth</label>
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
    box.innerHTML = serial ? `<span class="text-red-400">⚠ Student not found</span>` : '';
    return;
  }
  box.innerHTML = `
    <p><span class="text-slate-500">Name:</span> <strong class="text-slate-200">${esc(student['NAME'] || student.name || '')}</strong></p>
    <p><span class="text-slate-500">Class:</span> ${esc(student['CLASS'] || student.class || '')}</p>
    <p><span class="text-slate-500">Dept:</span> ${esc(student['Dept'] || student.dept || 'N/A')}</p>`;
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

  // Eligibility (pass dynamic allPosts rules and existing noms for endorsing checks)
  const roleLabels = ['Candidate', 'Proposer', 'Seconder'];
  students.forEach((st, i) => {
    if (st) warnings.push(...checkEligibility(st, postName, roleLabels[i], i === 0 ? gender : null, allPosts, existingNominations));
  });

  const box = formArea.querySelector('#warningBox');
  if (box) {
    if (warnings.length) {
      box.innerHTML = '<strong class="block mb-1">⚠ Eligibility Warnings</strong>' + warnings.map(w => `<p class="text-sm">• ${esc(w)}</p>`).join('');
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }
  return warnings;
}

async function handleSubmit(e, formArea, yearValue, collegeName) {
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

    showPreview(formArea, result.id, { post, gender, day, month, year, dob: formattedDob, students }, yearValue, collegeName);
    showToast(`Nomination submitted! ID: ${result.id}`, 'success');
  } catch (err) {
    showToast(`Submission failed: ${err.message}`, 'error');
  } finally {
    setLoading(submitBtn, false, 'Generate &amp; Preview Nomination');
  }
}

function showPreview(formArea, id, { post, gender, day, month, year, dob, students }, yearValue, collegeName) {
  const [candidate, proposer, seconder] = students;
  const dobDisplay = displayDob(day, month, year);
  const age = calculateAge(dob);

  const preview = formArea.querySelector('#previewSection');
  formArea.querySelector('#printZone').innerHTML =
    buildNominationPaper(id, post, gender, dobDisplay, age, candidate, proposer, seconder, 'Pending', yearValue, collegeName);

  preview.classList.remove('hidden');
  preview.scrollIntoView({ behavior: 'smooth' });
  preview.querySelector('#printBtn')?.addEventListener('click', () => {
    triggerPrint(formArea.querySelector('#printZone').innerHTML);
  });
  preview.querySelector('#newNomBtn')?.addEventListener('click', () => renderSubmitNomination(formArea.closest('#app')));
}

export function buildNominationPaper(id, post, gender, dobDisplay, age, candidate, proposer, seconder, status = '', yearValue = '2026', collegeName = null) {
  const today = todayFormatted();
  const cName = collegeName || CONFIG.COLLEGE_NAME;
  return `
  <div class="print-paper border border-slate-700 rounded-xl p-8 bg-slate-900 text-slate-200 space-y-4">
    <div class="flex justify-between items-start text-sm">
      <div>
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
  return `
  <div class="glass rounded-lg p-4 text-sm space-y-1">
    <h3 class="font-bold text-white uppercase text-xs tracking-widest mb-2 border-b border-white/10 pb-1">${label} Details</h3>
    <div class="grid grid-cols-2 gap-x-4 gap-y-1">
      <p><span class="text-slate-500">Name:</span> <strong class="text-slate-200">${esc(s['NAME'] || s.name || '')}</strong></p>
      <p><span class="text-slate-500">Class:</span> ${esc(s['CLASS'] || s.class || '')}</p>
      <p><span class="text-slate-500">Dept:</span> ${esc(s['Dept'] || s.dept || 'N/A')}</p>
      <p><span class="text-slate-500">Electoral Roll No:</span> ${esc(s['Nominal Roll Serial Number'] || s.serial_number || '')}</p>
      ${gender ? `<p><span class="text-slate-500">Gender:</span> ${esc(gender)}</p>` : ''}
      ${dob ? `<p><span class="text-slate-500">Date of Birth:</span> ${esc(dob)}</p>` : ''}
      ${age ? `<p class="col-span-2"><span class="text-slate-500">Age as on Notification Date:</span> ${esc(age)}</p>` : ''}
    </div>
    ${label !== 'Candidate' ? `
    <div class="flex justify-between mt-4 text-slate-500 text-xs">
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
