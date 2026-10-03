/**
 * pages/withdraw.js
 * Students can look up their valid nomination and submit a withdrawal request.
 */
import { api } from '../api.js';
import { router } from '../router.js';
import { esc, setLoading, showToast, triggerPrint, todayFormatted } from '../utils.js';
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

  container.innerHTML = publicLayout('Withdrawal Form', `
    <div id="loadingState" class="flex flex-col items-center justify-center py-24 gap-4">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 text-sm">Checking schedule...</p>
    </div>
    <div id="withdrawArea" class="hidden"></div>
  `, year, shortName);

  container.querySelector('#backToHome').addEventListener('click', () => router.navigate('/'));

  try {
    const [schedule, sets] = await Promise.all([
      api.getPublicSchedule().catch(() => ({})),
      api.getSettings().catch(() => ({}))
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

    area.innerHTML = `
      <div class="glass rounded-2xl p-8 max-w-2xl mx-auto">
        <div class="text-center mb-8">
          <div class="text-5xl mb-3">↩️</div>
          <h2 class="text-xl font-bold text-white">Submit Withdrawal</h2>
          <p class="text-slate-400 text-sm mt-2">Enter your 10-digit nomination ID and Admission Number to securely fetch your details and submit a withdrawal request.</p>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-slate-300 mb-1">Nomination ID (10 digits)</label>
            <input id="withdrawId" type="text" maxlength="10" class="field text-center text-xl tracking-widest font-mono" placeholder="0000000000" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-300 mb-1">Your Admission Number (Authentication)</label>
            <input id="authAdm" type="text" class="field text-center text-xl tracking-widest font-mono" placeholder="12345" />
          </div>
          <button id="fetchBtn" class="btn btn-primary w-full">Fetch Nomination Details</button>
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

    area.querySelectorAll('.btn-blank-with-trigger').forEach(b => b.onclick = () => triggerBlankWithdrawalAlert(sets));

    const fetchBtn = area.querySelector('#fetchBtn');
    fetchBtn.addEventListener('click', async () => {
      const id = area.querySelector('#withdrawId').value.trim();
      const adm = area.querySelector('#authAdm').value.trim();
      if (id.length !== 10 || !/^\d+$/.test(id)) {
        showToast('Please enter a valid 10-digit numeric ID.', 'error'); return;
      }
      if (!adm) {
        showToast('Please enter your Admission Number.', 'error'); return;
      }
      setLoading(fetchBtn, true, 'Fetch Nomination Details');
      try {
        const nom = await api.getNomination(id, adm);
        showDetails(area.querySelector('#nominationDetails'), nom, id, adm, collegeName, year, sets?.collegeLogo || '');
      } catch (e) {
        area.querySelector('#nominationDetails').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
      } finally {
        setLoading(fetchBtn, false, 'Fetch Nomination Details');
      }
    });

  } catch (e) {
    container.querySelector('#loadingState').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function showDetails(area, nom, id, adm, collegeName = null, year = null, collegeLogo = '') {
  if (nom.status !== 'Valid') {
    area.innerHTML = `<div class="alert alert-warning">⚠ This nomination has status <strong>${esc(nom.status)}</strong>. Only <strong>Valid</strong> nominations can be withdrawn.</div>`;
    return;
  }
  if (nom.withdrawalStatus === 'Requested' || nom.withdrawalStatus === 'Pending' || nom.withdrawalStatus === 'Approved') {
    const stText = nom.withdrawalStatus === 'Approved' ? 'approved' : 'submitted and is currently under review by the Returning Officer';
    area.innerHTML = `<div class="alert alert-info">ℹ A withdrawal request has already been ${stText} for this nomination.</div>`;
    return;
  }

  area.innerHTML = `
    <div class="space-y-4">
      <div class="alert alert-success">✅ Nomination found. Please review the details below before submitting your withdrawal.</div>
      <div class="glass rounded-xl p-5 text-sm space-y-2">
        <p><span class="text-slate-400 w-36 inline-block">Nomination ID:</span> <strong class="font-mono text-indigo-300">${esc(id)}</strong></p>
        <p><span class="text-slate-400 w-36 inline-block">Post:</span> <strong class="text-white">${esc(nom.post)}</strong></p>
        <p><span class="text-slate-400 w-36 inline-block">Candidate:</span> ${esc(nom.candidate?.NAME || nom.candidateName || 'N/A')}</p>
        <p><span class="text-slate-400 w-36 inline-block">Class:</span> ${esc(nom.candidate?.CLASS || nom.candidateClass || 'N/A')}</p>
        <p><span class="text-slate-400 w-36 inline-block">Dept:</span> ${esc(nom.candidate?.Dept || nom.candidateDept || 'N/A')}</p>
      </div>
      <div class="alert alert-warning text-sm">
        ⚠ <strong>Warning:</strong> Submitting this withdrawal is irreversible. The request will be sent to the Returning Officer for final approval.
      </div>
      <div class="flex gap-3">
        <button id="withdrawBtn" class="btn btn-danger flex-1">Submit Withdrawal Request</button>
      </div>
    </div>`;

  area.querySelector('#withdrawBtn').addEventListener('click', async () => {
    const btn = area.querySelector('#withdrawBtn');
    setLoading(btn, true, 'Submit Withdrawal Request');
    try {
      await api.submitWithdrawal(id, adm);
      area.innerHTML = `
        <div class="alert alert-success">✅ Withdrawal request submitted successfully! The Returning Officer will review your request.</div>
        <div class="mt-4 no-print">
          <button id="printWithdrawal" class="btn btn-secondary">🖨️ Print Withdrawal Form</button>
        </div>
        <div class="print-zone mt-4">
          ${buildWithdrawalPaper(id, nom, collegeName, year, false, collegeLogo)}
        </div>`;
      area.querySelector('#printWithdrawal').addEventListener('click', () => {
        triggerPrint(buildWithdrawalPaper(id, nom, collegeName, year, false, collegeLogo), 'Withdrawal Form', collegeLogo);
      });
      showToast('Withdrawal request submitted!', 'success');
    } catch (e) {
      showToast(`Failed: ${e.message}`, 'error');
      setLoading(btn, false, 'Submit Withdrawal Request');
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
