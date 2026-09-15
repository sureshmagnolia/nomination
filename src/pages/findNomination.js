/**
 * pages/findNomination.js
 * Lets students retrieve a previously submitted nomination by 10-digit ID.
 */
import { api } from '../api.js';
import { router } from '../router.js';
import { CONFIG } from '../config.js';
import { esc, showToast, setLoading, triggerPrint, calculateAge } from '../utils.js';
import { buildNominationPaper } from './submitNomination.js';

export async function renderFindNomination(container) {
  let year = new Date().getFullYear();
  let shortName = CONFIG.COLLEGE_SHORT_NAME;
  let collegeName = CONFIG.COLLEGE_NAME;
  try {
    const sets = await api.getSettings().catch(() => ({}));
    if (sets.electionYear) year = sets.electionYear;
    if (sets.collegeName) collegeName = sets.collegeName;
    if (sets.collegeShortName) shortName = sets.collegeShortName;
  } catch(e) {}

  container.innerHTML = publicLayout('Find My Nomination', `
    <div class="glass rounded-2xl p-8 max-w-lg mx-auto">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">🔍</div>
        <h2 class="text-xl font-bold text-white">Retrieve Nomination</h2>
        <p class="text-slate-400 text-sm mt-2">Enter your 10-digit unique nomination ID to find and print your form.</p>
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-1">Nomination ID (10 digits)</label>
          <input id="searchId" type="text" maxlength="10" class="field text-center text-xl tracking-widest font-mono" placeholder="0000000000" />
        </div>
        <button id="searchBtn" class="btn btn-primary w-full">🔍 Find Nomination</button>
      </div>
      <div id="resultArea" class="mt-8"></div>
    </div>
  `, year, shortName);

  container.querySelector('#backToHome').addEventListener('click', () => router.navigate('/'));
  const btn = container.querySelector('#searchBtn');
  btn.addEventListener('click', async () => {
    const id = container.querySelector('#searchId').value.trim();
    if (id.length !== 10 || !/^\d+$/.test(id)) {
      showToast('Please enter a valid 10-digit numeric ID.', 'error'); return;
    }
    setLoading(btn, true, '🔍 Find Nomination');
    try {
      const nom = await api.getNomination(id);
      showNomResult(container.querySelector('#resultArea'), nom, id, year, collegeName);
    } catch (e) {
      container.querySelector('#resultArea').innerHTML = `<div class="alert alert-error mt-4">❌ ${esc(e.message)}</div>`;
    } finally {
      setLoading(btn, false, '🔍 Find Nomination');
    }
  });
}

function showNomResult(area, nom, id, yearValue, collegeName) {
  // Format DOB from ISO string (or YYYY-MM-DD) to DD/MM/YYYY
  let dobDisplay = nom.dob || 'N/A';
  const d = new Date(nom.dob);
  if (!isNaN(d.getTime())) {
    dobDisplay = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  
  // Calculate age using the utility function
  const age = calculateAge(nom.dob);

  const statusMap = { Pending: 'pending', Valid: 'valid', Rejected: 'rejected' };
  area.innerHTML = `
    <div class="space-y-4">
      <div class="alert alert-success">✅ Nomination found! Status: <strong>${esc(nom.status)}</strong></div>
      <div id="printZone" class="print-zone">
        ${buildNominationPaper(id, nom.post, nom.gender, dobDisplay, age, nom.candidate, nom.proposer, nom.seconder, nom.status, yearValue, collegeName)}
      </div>
      <div class="flex gap-3 no-print">
        <button id="printBtn" class="btn btn-success flex-1">🖨️ Print</button>
      </div>
    </div>`;
  area.querySelector('#printBtn').addEventListener('click', () => {
    triggerPrint(area.querySelector('#printZone').innerHTML);
  });
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
