/**
 * pages/submitNomination.js
 * Multi-step nomination form with auto-fill, eligibility checks, captcha, and print preview.
 * Posts are loaded dynamically from the Google Sheet via the API.
 */
import { api } from '../api.js';
import { CONFIG } from '../config.js';
import { router } from '../router.js';
import {
  checkEligibility, generateCaptcha, populateDobSelects,
  buildDobString, displayDob, calculateAge, esc,
  setLoading, showToast, todayFormatted, triggerPrint
} from '../utils.js';

let nominalRoll = [];
let allPosts = [];      // [{post, femaleOnly, finalYearIneligible, yearRestriction, deptRestriction}]
let existingNominations = [];
let electionSchedule = {};
let captchaAnswer = '';

export async function renderSubmitNomination(container) {
  let year = new Date().getFullYear();
  try {
    const s = await api.getPublicSchedule();
    if (s.electionYear) year = s.electionYear;
  } catch(e) {}

  container.innerHTML = publicLayout('Submit Nomination', `
    <div id="loadingState" class="flex flex-col items-center justify-center py-24 gap-4">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 text-sm">Loading data...</p>
    </div>
    <div id="formArea" class="hidden"></div>
  `, year);

  container.querySelector('#backToHome').addEventListener('click', () => router.navigate('/'));

  try {
    // Load nominal roll, posts, existing nominations, and schedule in parallel
    const [rollData, postsData, nomsData, scheduleData] = await Promise.all([
      api.getNominalRoll(),
      api.getPosts().catch(() => null),
      api.getPublicNominations().catch(() => []),
      api.getPublicSchedule().catch(() => ({})),
    ]);

    nominalRoll = Array.isArray(rollData) ? rollData : [];
    existingNominations = Array.isArray(nomsData) ? nomsData : [];
    electionSchedule = scheduleData || {};

    if (nominalRoll.length === 0) throw new Error('Nominal roll is empty. Please contact the admin.');

    // Use sheet posts if available, otherwise fall back to config defaults
    allPosts = Array.isArray(postsData) && postsData.length > 0
      ? postsData
      : CONFIG.DEFAULT_POSTS;

    renderForm(container, year);
  } catch (e) {
    container.querySelector('#loadingState').innerHTML = `
      <div class="alert alert-error">${esc(e.message)}</div>
      <button class="btn btn-secondary mt-4" id="backBtn">← Back to Home</button>`;
    container.querySelector('#backBtn').addEventListener('click', () => router.navigate('/'));
  }
}

function renderForm(container, year) {
  const captcha = generateCaptcha();
  captchaAnswer = captcha.answer;

  container.querySelector('#loadingState').classList.add('hidden');
  const formArea = container.querySelector('#formArea');
  formArea.classList.remove('hidden');

  const now = new Date();
  const deadline = electionSchedule.nominationDeadline ? new Date(electionSchedule.nominationDeadline) : null;

  // Skip deadline check if admin is doing direct entry
  if (!window.ADMIN_BYPASS_PWD && deadline && now > deadline) {
    formArea.innerHTML = `
      <div class="glass p-12 text-center rounded-2xl border border-rose-500/20 max-w-2xl mx-auto page-enter">
        <div class="text-6xl mb-6">⏳</div>
        <h3 class="text-2xl font-bold text-white mb-3">Nomination Filing Ended</h3>
        <p class="text-slate-400 mb-6">The official deadline for filing nominations was <strong>${new Date(deadline).toLocaleString()}</strong>.</p>
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

  // Populate DOB dropdowns
  populateDobSelects(
    formArea.querySelector('#dob-day'),
    formArea.querySelector('#dob-month'),
    formArea.querySelector('#dob-year')
  );

  // Auto-fill listeners
  ['candidate','proposer','seconder'].forEach(role => {
    formArea.querySelector(`#serial-${role}`).addEventListener('change', () => fillDetails(formArea, role));
  });

  // Revalidate on any change
  formArea.querySelector('#postSelect').addEventListener('change', () => runValidation(formArea));
  formArea.querySelectorAll('[name="gender"]').forEach(r => r.addEventListener('change', () => runValidation(formArea)));
  formArea.querySelectorAll('.dob-sel').forEach(s => s.addEventListener('change', () => runValidation(formArea)));

  // Captcha refresh
  formArea.querySelector('#refreshCaptcha').addEventListener('click', () => {
    const c = generateCaptcha();
    captchaAnswer = c.answer;
    formArea.querySelector('#captchaInput').value = '';
    formArea.querySelector('#captchaQuestion').textContent = c.question;
  });

  formArea.querySelector('#backHomeBtn').addEventListener('click', () => router.navigate('/'));
  formArea.querySelector('#nomForm').addEventListener('submit', (e) => handleSubmit(e, formArea, year));
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
    <div>
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
  const serial = formArea.querySelector(`#serial-${role}`).value.trim();
  const box = formArea.querySelector(`#details-${role}`);
  const student = nominalRoll.find(s => String(s['Nominal Roll Serial Number']) === serial);
  if (!student) {
    box.innerHTML = serial ? `<span class="text-red-400">⚠ Student not found</span>` : '';
    return;
  }
  box.innerHTML = `
    <p><span class="text-slate-500">Name:</span> <strong class="text-slate-200">${esc(student['NAME'])}</strong></p>
    <p><span class="text-slate-500">Class:</span> ${esc(student['CLASS'])}</p>
    <p><span class="text-slate-500">Dept:</span> ${esc(student['Dept'] || 'N/A')}</p>`;
  runValidation(formArea);
}

function runValidation(formArea) {
  const warnings = [];
  const postName = formArea.querySelector('#postSelect').value;
  const gender = formArea.querySelector('[name="gender"]:checked')?.value || null;

  const roles = ['candidate','proposer','seconder'];
  const serials = roles.map(r => formArea.querySelector(`#serial-${r}`).value.trim());
  const students = serials.map(s => s ? nominalRoll.find(st => String(st['Nominal Roll Serial Number']) === s) : null);

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
  if (warnings.length) {
    box.innerHTML = '<strong class="block mb-1">⚠ Eligibility Warnings</strong>' + warnings.map(w => `<p class="text-sm">• ${esc(w)}</p>`).join('');
    box.classList.remove('hidden');
  } else {
    box.classList.add('hidden');
  }
  return warnings;
}

async function handleSubmit(e, formArea, yearValue) {
  e.preventDefault();
  const warnings = runValidation(formArea);
  if (warnings.length) { showToast('Please resolve all eligibility warnings first.', 'error'); return; }

  const captchaVal = formArea.querySelector('#captchaInput').value.trim();
  if (captchaVal !== captchaAnswer) { showToast('Captcha answer is incorrect.', 'error'); return; }

  const post = formArea.querySelector('#postSelect').value;
  const gender = formArea.querySelector('[name="gender"]:checked')?.value;
  const day = formArea.querySelector('#dob-day').value;
  const month = formArea.querySelector('#dob-month').value;
  const year = formArea.querySelector('#dob-year').value;

  if (!gender) { showToast('Please select a gender for the candidate.', 'error'); return; }
  if (!day || !month || !year) { showToast('Please enter a complete date of birth.', 'error'); return; }

  const roles = ['candidate','proposer','seconder'];
  const serials = roles.map(r => formArea.querySelector(`#serial-${r}`).value.trim());
  const students = serials.map(s => nominalRoll.find(st => String(st['Nominal Roll Serial Number']) === s));
  if (students.some(s => !s)) { showToast('One or more serial numbers are invalid.', 'error'); return; }

  const submitBtn = formArea.querySelector('#submitBtn');
  setLoading(submitBtn, true, 'Generate &amp; Preview Nomination');

  try {
    const payload = {
      post, gender,
      dob: buildDobString(day, month, year),
      candidateSerial: serials[0],
      proposerSerial:  serials[1],
      seconderSerial:  serials[2],
    };

    // If admin is doing direct entry, include password to bypass deadline
    if (window.ADMIN_BYPASS_PWD) {
      payload.password = window.ADMIN_BYPASS_PWD;
    }

    const result = await api.submitNomination(payload);

    showPreview(formArea, result.id, { post, gender, day, month, year, students }, yearValue);
    showToast(`Nomination submitted! ID: ${result.id}`, 'success');
  } catch (err) {
    showToast(`Submission failed: ${err.message}`, 'error');
  } finally {
    setLoading(submitBtn, false, 'Generate &amp; Preview Nomination');
  }
}

function showPreview(formArea, id, { post, gender, day, month, year, students }, yearValue) {
  const [candidate, proposer, seconder] = students;
  const dob = buildDobString(day, month, year);
  const dobDisplay = displayDob(day, month, year);
  const age = calculateAge(dob);

  const preview = formArea.querySelector('#previewSection');
  formArea.querySelector('#printZone').innerHTML =
    buildNominationPaper(id, post, gender, dobDisplay, age, candidate, proposer, seconder, '', yearValue);

  preview.classList.remove('hidden');
  preview.scrollIntoView({ behavior: 'smooth' });
  preview.querySelector('#printBtn').addEventListener('click', () => {
    triggerPrint(formArea.querySelector('#printZone').innerHTML);
  });
  preview.querySelector('#newNomBtn').addEventListener('click', () => renderSubmitNomination(formArea.closest('#app')));
}

export function buildNominationPaper(id, post, gender, dobDisplay, age, candidate, proposer, seconder, status = '', yearValue = '2026') {
  const today = todayFormatted();
  return `
  <div class="print-paper border border-slate-700 rounded-xl p-8 bg-slate-900 text-slate-200 space-y-4">
    <div class="flex justify-between items-start text-sm">
      <div>
        <p class="font-bold text-white text-base">${CONFIG.COLLEGE_NAME}</p>
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
      <p><span class="text-slate-500">Name:</span> <strong class="text-slate-200">${esc(s['NAME'])}</strong></p>
      <p><span class="text-slate-500">Class:</span> ${esc(s['CLASS'])}</p>
      <p><span class="text-slate-500">Dept:</span> ${esc(s['Dept'] || 'N/A')}</p>
      <p><span class="text-slate-500">Electoral Roll No:</span> ${esc(s['Nominal Roll Serial Number'])}</p>
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

function publicLayout(title, bodyHtml, yearValue = '2026') {
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
          ${CONFIG.COLLEGE_SHORT_NAME} Election Portal ${yearValue}
        </div>
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">${bodyHtml}</main>
  </div>`;
}
