/**
 * pages/withdraw.js
 * Students can search their published accepted nomination or enter their 10-digit ID,
 * authenticate using their Date of Birth as a password, and submit a formal withdrawal request
 * with a printable official form and tear-off receipt.
 */
import { api } from '../api.js';
import { router } from '../router.js';
import {
  esc, setLoading, showToast, triggerPrint, todayFormatted,
  populateDobSelects, buildDobString, formatDobDate
} from '../utils.js';
import { CONFIG } from '../config.js';
import { printBlankWithdrawalForm, buildWithdrawalPaper } from '../noticesPrinter.js';

export async function renderWithdraw(container) {
  let year = new Date().getFullYear();
  let shortName = CONFIG.COLLEGE_SHORT_NAME;
  let collegeName = CONFIG.COLLEGE_NAME;
  try {
    const [schedule, sets] = await Promise.all([
      api.getPublicSchedule().catch(() => ({})),
      api.getSettings().catch(() => ({}))
    ]);
    if (schedule.electionYear) year = schedule.electionYear;
    if (sets.electionYear) year = sets.electionYear;
    if (sets.collegeName) collegeName = sets.collegeName;
    if (sets.collegeShortName) shortName = sets.collegeShortName;
  } catch(e) {}

  container.innerHTML = publicLayout('Withdrawal of Candidature', `
    <div id="loadingState" class="flex flex-col items-center justify-center py-24 gap-4">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 text-sm">Checking schedule and candidate lists...</p>
    </div>
    <div id="withdrawArea" class="hidden"></div>
  `, year, shortName);

  container.querySelector('#backToHome').addEventListener('click', () => router.navigate('/'));

  try {
    const [schedule, sets, validNoms] = await Promise.all([
      api.getPublicSchedule().catch(() => ({})),
      api.getSettings().catch(() => ({})),
      api.getValidNominations().catch(() => [])
    ]);

    const now = new Date();
    const start = schedule.withdrawalStart ? new Date(schedule.withdrawalStart) : null;
    const end = schedule.withdrawalEnd ? new Date(schedule.withdrawalEnd) : null;
    const isValidPublished = sets?.validListPublished === 'true' || schedule?.validListPublished === 'true';

    const area = container.querySelector('#withdrawArea');
    container.querySelector('#loadingState').classList.add('hidden');
    area.classList.remove('hidden');

    if (!isValidPublished) {
      area.innerHTML = `
        <div class="glass p-12 text-center rounded-2xl border border-amber-500/20 max-w-2xl mx-auto page-enter">
          <div class="text-6xl mb-6">⏳</div>
          <div class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3 inline-block">
            Awaiting Scrutiny
          </div>
          <h3 class="text-2xl font-bold text-white mb-3">Withdrawals Not Open Yet</h3>
          <p class="text-slate-400 mb-6 leading-relaxed">
            Withdrawal of candidature will open only after the <strong>Valid Nominations List</strong> is officially published by the Returning Officer.
          </p>
          <button id="expiredBackBtn" class="btn btn-secondary">← Back to Home</button>
          <div class="mt-8 pt-4 border-t border-white/5 text-center">
            <button type="button" class="btn-blank-with-trigger text-xs text-slate-400 hover:text-slate-300 underline underline-offset-4 transition inline-flex items-center gap-1.5 opacity-75 hover:opacity-100 cursor-pointer">
              <span>📄</span> Need to submit physically? Print Blank Withdrawal Form
            </button>
          </div>
        </div>
      `;
      area.querySelector('#expiredBackBtn').onclick = () => router.navigate('/');
      area.querySelectorAll('.btn-blank-with-trigger').forEach(b => b.onclick = () => triggerBlankWithdrawalAlert(sets));
      return;
    }

    const isWithOpen = schedule?.isWithdrawalActive === true || 
                       schedule?.isWithActive === true || 
                       schedule?.withdrawalOpen === 'true' || 
                       sets?.withdrawalOpen === 'true' || 
                       schedule?.withdrawalOverride === 'FORCE_OPEN';

    if (!isWithOpen) {
      const startStr = start && !isNaN(start.getTime()) ? start.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' }) : '';
      const endStr = end && !isNaN(end.getTime()) ? end.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' }) : '';

      area.innerHTML = `
        <div class="glass p-12 text-center rounded-2xl border border-rose-500/20 max-w-2xl mx-auto page-enter">
          <div class="text-6xl mb-6">🛑</div>
          <div class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3 inline-block">
            Withdrawals Closed
          </div>
          <h3 class="text-2xl font-bold text-white mb-3">Withdrawal Window Closed</h3>
          <p class="text-slate-400 mb-6 leading-relaxed">
            Withdrawal of candidature is currently closed by the Returning Officer.
            ${startStr ? `<br><span class="text-xs text-slate-500 mt-3 inline-block">Official Reference Schedule: <strong>${startStr}</strong> ${endStr ? `to <strong>${endStr}</strong>` : ''}</span>` : ''}
          </p>
          <button id="expiredBackBtn" class="btn btn-secondary">← Back to Home</button>
          <div class="mt-8 pt-4 border-t border-white/5 text-center">
            <button type="button" class="btn-blank-with-trigger text-xs text-slate-400 hover:text-slate-300 underline underline-offset-4 transition inline-flex items-center gap-1.5 opacity-75 hover:opacity-100 cursor-pointer">
              <span>📄</span> Need to submit physically? Print Blank Withdrawal Form
            </button>
          </div>
        </div>
      `;
      area.querySelector('#expiredBackBtn').onclick = () => router.navigate('/');
      area.querySelectorAll('.btn-blank-with-trigger').forEach(b => b.onclick = () => triggerBlankWithdrawalAlert(sets));
      return;
    }

    const validCandidates = Array.isArray(validNoms) ? [...validNoms] : [];
    validCandidates.sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));

    // Check query params for pre-selected ID (e.g. from valid list link)
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    let preselectedId = '';
    if (qIndex !== -1) {
      const qParams = new URLSearchParams(hash.substring(qIndex + 1));
      preselectedId = qParams.get('id') || qParams.get('nomId') || '';
    }

    area.innerHTML = `
      <div class="glass rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto shadow-2xl border border-white/10">
        <div class="text-center mb-8">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center text-3xl mb-3 shadow-inner">
            ↩️
          </div>
          <h2 class="text-2xl font-bold text-white tracking-tight">Withdrawal of Candidature</h2>
          <p class="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            Choose your name from the published accepted nominations or enter your Nomination ID. You must authenticate using your <strong>Date of Birth</strong> as your verification password.
          </p>
        </div>

        <!-- Mode Toggle -->
        <div class="flex rounded-xl bg-slate-900/80 p-1 border border-white/10 mb-6">
          <button type="button" id="tabSearchMode" class="flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all text-white bg-indigo-600 shadow-md">
            🔍 Choose from Published List
          </button>
          <button type="button" id="tabManualMode" class="flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all text-slate-400 hover:text-slate-200">
            🔢 Enter 10-Digit Nomination ID
          </button>
        </div>

        <!-- Panel 1: Searchable Candidate Selector -->
        <div id="panelSearch" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-slate-300 mb-1.5">
              Select Candidate from Accepted Nominations
            </label>
            <div class="relative">
              <input id="candSearchInput" type="text" class="field pr-10 text-sm placeholder:text-slate-500" placeholder="Type candidate name, post, department, or admission no..." autocomplete="off" />
              <button type="button" id="clearSearchBtn" class="absolute right-3 top-2.5 text-slate-400 hover:text-white hidden text-sm">✕</button>
            </div>
            
            <!-- Live Results Dropdown -->
            <div id="candResultsBox" class="mt-2 rounded-xl bg-slate-900 border border-white/15 max-h-60 overflow-y-auto hidden shadow-2xl divide-y divide-white/5 z-20">
              <!-- Dynamically populated -->
            </div>
          </div>

          <!-- Selected Candidate Preview Card -->
          <div id="selectedCandidateCard" class="hidden p-4 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 shadow-lg relative page-enter">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-emerald-400 text-base">✅</span>
                  <strong id="cardCandName" class="text-white text-base"></strong>
                  <span id="cardCandPost" class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold"></span>
                </div>
                <div class="text-xs text-slate-400 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Class: <strong id="cardCandClass" class="text-slate-200"></strong></span>
                  <span>Dept: <strong id="cardCandDept" class="text-slate-200"></strong></span>
                  <span>Adm: <strong id="cardCandAdm" class="text-slate-200 font-mono"></strong></span>
                  <span>Nom ID: <strong id="cardNomId" class="text-indigo-300 font-mono"></strong></span>
                </div>
              </div>
              <button type="button" id="btnChangeCand" class="btn btn-secondary btn-xs text-xs shrink-0">
                Change
              </button>
            </div>
          </div>
        </div>

        <!-- Panel 2: Manual Nomination ID Input (Hidden by default) -->
        <div id="panelManual" class="hidden space-y-4">
          <div>
            <label class="block text-sm font-semibold text-slate-300 mb-1.5">Nomination ID (10 digits)</label>
            <input id="withdrawIdManual" type="text" maxlength="10" class="field text-center text-xl tracking-widest font-mono" placeholder="0000000000" />
            <p class="text-[11px] text-slate-500 mt-1">Found on your submitted nomination acknowledgement slip or verified list.</p>
          </div>
        </div>

        <!-- Hidden ID holder to keep both inputs synchronized -->
        <input id="withdrawId" type="hidden" value="" />

        <!-- Security Authentication Section (DOB as password) -->
        <div class="border-t border-white/10 pt-6 mt-6 space-y-5">
          <div class="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs flex items-start gap-3">
            <span class="text-2xl shrink-0">🔒</span>
            <div class="space-y-1">
              <p class="font-bold text-amber-100 text-sm">Security Verification: Date of Birth as Password</p>
              <p class="leading-relaxed text-amber-200/90">
                To prevent unauthorized or fraudulent withdrawals, you must enter your <strong>Date of Birth</strong> exactly as provided during nomination submission.
              </p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-300 mb-1.5">
              Candidate Date of Birth (Verification Password) <span class="text-rose-400">*</span>
            </label>
            <div class="flex gap-2">
              <select id="dob-day" class="field dob-sel" style="flex: 1;"><option value="">Day</option></select>
              <select id="dob-month" class="field dob-sel" style="flex: 1.4;"><option value="">Month</option></select>
              <select id="dob-year" class="field dob-sel" style="flex: 1.1;"><option value="">Year</option></select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-300 mb-1.5">Candidate Admission Number (Authentication)</label>
            <input id="authAdm" type="text" class="field text-base font-mono" placeholder="e.g. 12345" />
          </div>

          <button id="fetchBtn" class="btn btn-primary w-full py-3 text-base font-bold shadow-lg shadow-indigo-600/30">
            🔍 Verify Identity &amp; Fetch Nomination Details
          </button>
        </div>

        <div id="nominationDetails" class="mt-8"></div>

        <!-- Inconspicuous blank form option -->
        <div class="mt-8 pt-4 border-t border-white/5 text-center">
          <button type="button" class="btn-blank-with-trigger text-xs text-slate-400 hover:text-slate-300 underline underline-offset-4 transition inline-flex items-center gap-1.5 opacity-75 hover:opacity-100 cursor-pointer">
            <span>📄</span> Need to submit physically? Print Blank Withdrawal Form
          </button>
        </div>
      </div>
    `;

    // Populate DOB dropdowns
    populateDobSelects(
      area.querySelector('#dob-day'),
      area.querySelector('#dob-month'),
      area.querySelector('#dob-year')
    );

    // Wire up blank withdrawal notice
    area.querySelectorAll('.btn-blank-with-trigger').forEach(b => b.onclick = () => triggerBlankWithdrawalAlert(sets));

    // Tab Switching
    const tabSearch = area.querySelector('#tabSearchMode');
    const tabManual = area.querySelector('#tabManualMode');
    const panelSearch = area.querySelector('#panelSearch');
    const panelManual = area.querySelector('#panelManual');
    const withdrawId = area.querySelector('#withdrawId');
    const withdrawIdManual = area.querySelector('#withdrawIdManual');
    const searchInput = area.querySelector('#candSearchInput');
    const resultsBox = area.querySelector('#candResultsBox');
    const clearBtn = area.querySelector('#clearSearchBtn');
    const selectedCard = area.querySelector('#selectedCandidateCard');
    const btnChangeCand = area.querySelector('#btnChangeCand');
    const authAdm = area.querySelector('#authAdm');

    tabSearch.addEventListener('click', () => {
      tabSearch.className = 'flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all text-white bg-indigo-600 shadow-md';
      tabManual.className = 'flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all text-slate-400 hover:text-slate-200';
      panelSearch.classList.remove('hidden');
      panelManual.classList.add('hidden');
    });

    tabManual.addEventListener('click', () => {
      tabManual.className = 'flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all text-white bg-indigo-600 shadow-md';
      tabSearch.className = 'flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all text-slate-400 hover:text-slate-200';
      panelManual.classList.remove('hidden');
      panelSearch.classList.add('hidden');
      withdrawIdManual.focus();
    });

    withdrawIdManual.addEventListener('input', () => {
      const val = withdrawIdManual.value.trim();
      withdrawId.value = val;
      // Auto-populate admission number if matches a known candidate
      const match = validCandidates.find(c => String(c.id) === val);
      if (match && match.candidateAdmission) {
        authAdm.value = match.candidateAdmission;
      }
    });

    // Helper: Select a Candidate
    function selectCandidate(cand) {
      if (!cand) return;
      withdrawId.value = cand.id || '';
      withdrawIdManual.value = cand.id || '';
      if (cand.candidateAdmission) {
        authAdm.value = cand.candidateAdmission;
      }

      area.querySelector('#cardCandName').textContent = cand.candidateName || 'N/A';
      area.querySelector('#cardCandPost').textContent = cand.post || '';
      area.querySelector('#cardCandClass').textContent = cand.candidateClass || 'N/A';
      area.querySelector('#cardCandDept').textContent = cand.candidateDept || 'N/A';
      area.querySelector('#cardCandAdm').textContent = cand.candidateAdmission || 'N/A';
      area.querySelector('#cardNomId').textContent = cand.id || 'N/A';

      selectedCard.classList.remove('hidden');
      resultsBox.classList.add('hidden');
      searchInput.value = '';
      clearBtn.classList.add('hidden');
    }

    btnChangeCand.addEventListener('click', () => {
      selectedCard.classList.add('hidden');
      withdrawId.value = '';
      withdrawIdManual.value = '';
      searchInput.value = '';
      searchInput.focus();
      renderCandidateResults('');
    });

    // Render candidate live search results
    function renderCandidateResults(query = '') {
      const q = String(query).trim().toLowerCase();
      let matches = validCandidates;
      if (q) {
        matches = validCandidates.filter(c =>
          String(c.candidateName || '').toLowerCase().includes(q) ||
          String(c.post || '').toLowerCase().includes(q) ||
          String(c.candidateDept || '').toLowerCase().includes(q) ||
          String(c.candidateClass || '').toLowerCase().includes(q) ||
          String(c.candidateAdmission || '').toLowerCase().includes(q) ||
          String(c.candidateSerial || '').includes(q) ||
          String(c.id || '').includes(q)
        );
      }

      if (matches.length === 0) {
        resultsBox.innerHTML = `
          <div class="p-4 text-center text-xs text-slate-500">
            No accepted candidate found matching "<strong>${esc(query)}</strong>".
          </div>
        `;
        resultsBox.classList.remove('hidden');
        return;
      }

      resultsBox.innerHTML = matches.slice(0, 15).map(c => {
        const isWithdrawn = c.withdrawalStatus === 'Approved';
        const isPending = c.withdrawalStatus === 'Pending' || c.withdrawalStatus === 'Requested';
        let badgeHtml = '';
        if (isWithdrawn) {
          badgeHtml = '<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">Already Withdrawn</span>';
        } else if (isPending) {
          badgeHtml = '<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">Withdrawal Pending</span>';
        }

        return `
          <div class="cand-item p-3 hover:bg-indigo-600/20 cursor-pointer transition flex items-center justify-between gap-3 text-left" data-id="${esc(c.id)}">
            <div class="min-w-0">
              <div class="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                <span>${esc(c.candidateName)}</span>
                ${c.candidateSerial ? `<span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-white/10">Roll Sl. #${esc(c.candidateSerial)}</span>` : ''}
                ${badgeHtml}
              </div>
              <div class="text-xs text-indigo-300 font-medium mt-0.5">${esc(c.post)}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">
                ${esc(c.candidateClass)}${c.candidateDept ? ` • ${esc(c.candidateDept)}` : ''} ${c.candidateAdmission ? `• Adm: ${esc(c.candidateAdmission)}` : ''}
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="text-indigo-400 hover:text-indigo-200 text-xs font-semibold underline underline-offset-2">Select →</span>
            </div>
          </div>
        `;
      }).join('');

      resultsBox.querySelectorAll('.cand-item').forEach(el => {
        el.addEventListener('click', () => {
          const candId = el.getAttribute('data-id');
          const cand = validCandidates.find(c => String(c.id) === String(candId));
          selectCandidate(cand);
        });
      });

      resultsBox.classList.remove('hidden');
    }

    searchInput.addEventListener('input', () => {
      const q = searchInput.value;
      if (q.trim()) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
      renderCandidateResults(q);
    });

    searchInput.addEventListener('focus', () => {
      renderCandidateResults(searchInput.value);
    });

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.classList.add('hidden');
      renderCandidateResults('');
    });

    // Close search dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsBox.contains(e.target)) {
        resultsBox.classList.add('hidden');
      }
    });

    // Auto-select if initial pre-selected ID was passed via URL hash
    if (preselectedId) {
      const matched = validCandidates.find(c => String(c.id) === String(preselectedId));
      if (matched) {
        selectCandidate(matched);
      } else {
        withdrawId.value = preselectedId;
        withdrawIdManual.value = preselectedId;
        tabManual.click();
      }
    }

    // Verify Identity & Fetch Nomination Details Handler
    const fetchBtn = area.querySelector('#fetchBtn');
    fetchBtn.addEventListener('click', async () => {
      const id = withdrawId.value.trim();
      const adm = authAdm.value.trim();
      const day = area.querySelector('#dob-day').value;
      const month = area.querySelector('#dob-month').value;
      const yearVal = area.querySelector('#dob-year').value;

      if (!id || id.length !== 10 || !/^\d+$/.test(id)) {
        showToast('Please select a candidate or enter a valid 10-digit numeric Nomination ID.', 'error');
        return;
      }

      if (!day || !month || !yearVal) {
        showToast('Please select your complete Date of Birth (Day, Month, Year) as verification password.', 'error');
        return;
      }

      const formattedDob = buildDobString(day, month, yearVal);

      setLoading(fetchBtn, true, 'Verifying Identity...');
      area.querySelector('#nominationDetails').innerHTML = '';

      try {
        const nom = await api.getNomination(id, adm, formattedDob, true);
        showDetails(area.querySelector('#nominationDetails'), nom, id, adm, formattedDob, collegeName, year, sets?.collegeLogo || '', sets?.collegePlace || CONFIG.COLLEGE_PLACE || 'Palakkad');
      } catch (e) {
        area.querySelector('#nominationDetails').innerHTML = `
          <div class="alert alert-error text-sm p-4 rounded-xl space-y-1">
            <p class="font-bold">❌ Authentication Failed</p>
            <p>${esc(e.message || 'Verification failed. Please check your Date of Birth and Admission Number.')}</p>
          </div>
        `;
      } finally {
        setLoading(fetchBtn, false, '🔍 Verify Identity &amp; Fetch Nomination Details');
      }
    });

  } catch (e) {
    container.querySelector('#loadingState').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function showDetails(area, nom, id, adm, dob, collegeName = null, year = null, collegeLogo = '', collegePlace = null) {
  if (nom.status !== 'Valid') {
    area.innerHTML = `
      <div class="alert alert-warning text-sm p-4 rounded-xl">
        ⚠️ This nomination has status <strong>${esc(nom.status)}</strong>. Only nominations marked <strong>Valid</strong> after scrutiny can be withdrawn.
      </div>
    `;
    return;
  }

  if (nom.withdrawalStatus === 'Requested' || nom.withdrawalStatus === 'Pending' || nom.withdrawalStatus === 'Approved') {
    const stText = nom.withdrawalStatus === 'Approved' ? 'approved' : 'submitted and is currently under review by the Returning Officer';
    area.innerHTML = `
      <div class="alert alert-info text-sm p-4 rounded-xl">
        ℹ️ A notice of withdrawal has already been <strong>${stText}</strong> for this nomination.
      </div>
    `;
    return;
  }

  const candName = nom.candidate?.NAME || nom.candidateName || 'N/A';
  const candClass = nom.candidate?.CLASS || nom.candidateClass || 'N/A';
  const candDept = nom.candidate?.Dept || nom.candidateDept || 'N/A';
  const candSerial = nom.candidateSerial || nom.candidate?.['Nominal Roll Serial Number'] || '';
  const candAdm = nom.candidateAdmission || nom.candidate?.['ADMISION NO'] || adm || '';

  area.innerHTML = `
    <div class="space-y-4 page-enter">
      <div class="alert alert-success text-sm flex items-center gap-2">
        <span>✅</span>
        <span>Candidate identity authenticated successfully. Please review the details below before submitting withdrawal.</span>
      </div>

      <div class="glass rounded-xl p-5 text-sm space-y-2 border border-white/10 shadow-lg">
        <p><span class="text-slate-400 w-36 inline-block font-semibold">Nomination ID:</span> <strong class="font-mono text-indigo-300 font-bold">${esc(id)}</strong></p>
        <p><span class="text-slate-400 w-36 inline-block font-semibold">Post Contested:</span> <strong class="text-white text-base">${esc(nom.post)}</strong></p>
        <p><span class="text-slate-400 w-36 inline-block font-semibold">Candidate Name:</span> <strong class="text-white">${esc(candName)}</strong></p>
        <p><span class="text-slate-400 w-36 inline-block font-semibold">Class:</span> <span class="text-slate-200">${esc(candClass)}</span></p>
        <p><span class="text-slate-400 w-36 inline-block font-semibold">Department:</span> <span class="text-slate-200">${esc(candDept)}</span></p>
        <p><span class="text-slate-400 w-36 inline-block font-semibold">Admission No:</span> <span class="text-slate-200 font-mono">${esc(candAdm)}</span></p>
        ${candSerial ? `<p><span class="text-slate-400 w-36 inline-block font-semibold">Roll Serial:</span> <span class="text-slate-200 font-mono">#${esc(candSerial)}</span></p>` : ''}
      </div>

      <div class="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-200 text-xs space-y-1.5">
        <p class="font-bold text-rose-100 flex items-center gap-1.5">
          <span>⚠️</span> Statutory Notice &amp; Final Warning
        </p>
        <p class="leading-relaxed">
          Submitting this notice of withdrawal is final. Once accepted by the Returning Officer, it is completely irreversible and your candidature for this office will stand withdrawn.
        </p>
      </div>

      <div class="flex gap-3 pt-2">
        <button id="withdrawBtn" class="btn btn-danger flex-1 py-3 text-base font-bold shadow-lg shadow-rose-600/30">
          ↩️ Submit Formal Withdrawal Request
        </button>
      </div>
    </div>
  `;

  area.querySelector('#withdrawBtn').addEventListener('click', async () => {
    const proceed = confirm(`⚠️ Are you sure you want to withdraw your candidature for the post of "${nom.post}"?\n\nThis action is final and will be forwarded to the Returning Officer for statutory approval.`);
    if (!proceed) return;

    const btn = area.querySelector('#withdrawBtn');
    setLoading(btn, true, 'Submitting Withdrawal...');
    try {
      await api.submitWithdrawal(id, candAdm, dob);
      area.innerHTML = `
        <div class="space-y-6 page-enter">
          <div class="alert alert-success text-sm flex items-start gap-3 p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30">
            <span class="text-2xl shrink-0">✅</span>
            <div class="space-y-1">
              <strong class="text-emerald-100 text-base">Withdrawal Request Submitted Successfully!</strong>
              <p class="text-emerald-200/90 leading-relaxed">
                Your notice of withdrawal has been registered and forwarded to the Returning Officer. Please print your official withdrawal notice along with the receipt below for physical verification.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 no-print">
            <button id="printWithdrawal" class="btn btn-success flex items-center gap-2 py-2.5 px-5 font-bold shadow-lg shadow-emerald-600/30">
              <span>🖨️</span> Print Withdrawal Form &amp; Receipt
            </button>
            <button id="btnDoneHome" class="btn btn-secondary">
              ← Return to Home
            </button>
          </div>

          <div class="print-zone mt-4">
            ${buildWithdrawalPaper(id, nom, collegeName, year, false, collegeLogo, collegePlace)}
          </div>
        </div>
      `;

      area.querySelector('#printWithdrawal').addEventListener('click', () => {
        triggerPrint(buildWithdrawalPaper(id, nom, collegeName, year, false, collegeLogo, collegePlace), 'Withdrawal Form', collegeLogo);
      });

      area.querySelector('#btnDoneHome')?.addEventListener('click', () => router.navigate('/'));

      showToast('Withdrawal request submitted successfully!', 'success');
    } catch (e) {
      showToast(`Submission failed: ${e.message}`, 'error');
      setLoading(btn, false, '↩️ Submit Formal Withdrawal Request');
    }
  });
}

function triggerBlankWithdrawalAlert(sets = {}) {
  const proceed = confirm(
    "⚠️ NOTICE: BLANK WITHDRAWAL FORM\n\n" +
    "You are requesting a BLANK Notice of Withdrawal Form for manual physical submission.\n\n" +
    "• This form must be hand-filled neatly, dated, and signed by the candidate.\n" +
    "• It must be submitted in person to the Returning Officer before the withdrawal deadline.\n" +
    "• Withdrawal of candidature, once accepted by the Returning Officer, is final and irreversible.\n\n" +
    "Do you want to proceed and print the blank form?"
  );
  if (proceed) {
    printBlankWithdrawalForm(sets);
  }
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
