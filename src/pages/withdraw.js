/**
 * pages/withdraw.js
 * Students can look up their valid nomination and submit a withdrawal request.
 */
import { api } from '../api.js';
import { router } from '../router.js';
import { esc, setLoading, showToast, triggerPrint, todayFormatted } from '../utils.js';
import { CONFIG } from '../config.js';

export async function renderWithdraw(container) {
  container.innerHTML = publicLayout('Withdrawal Form', `
    <div class="glass rounded-2xl p-8 max-w-2xl mx-auto">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">↩️</div>
        <h2 class="text-xl font-bold text-white">Submit Withdrawal</h2>
        <p class="text-slate-400 text-sm mt-2">Enter your 10-digit nomination ID to fetch your details and submit a withdrawal request.</p>
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-1">Nomination ID (10 digits)</label>
          <input id="withdrawId" type="text" maxlength="10" class="field text-center text-xl tracking-widest font-mono" placeholder="0000000000" />
        </div>
        <button id="fetchBtn" class="btn btn-primary w-full">Fetch Nomination Details</button>
      </div>
      <div id="nominationDetails" class="mt-8"></div>
    </div>
  `);

  container.querySelector('#backToHome').addEventListener('click', () => router.navigate('/'));

  const fetchBtn = container.querySelector('#fetchBtn');
  fetchBtn.addEventListener('click', async () => {
    const id = container.querySelector('#withdrawId').value.trim();
    if (id.length !== 10 || !/^\d+$/.test(id)) {
      showToast('Please enter a valid 10-digit numeric ID.', 'error'); return;
    }
    setLoading(fetchBtn, true, 'Fetch Nomination Details');
    try {
      const nom = await api.getNomination(id);
      showDetails(container.querySelector('#nominationDetails'), nom, id);
    } catch (e) {
      container.querySelector('#nominationDetails').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
    } finally {
      setLoading(fetchBtn, false, 'Fetch Nomination Details');
    }
  });
}

function showDetails(area, nom, id) {
  if (nom.status !== 'Valid') {
    area.innerHTML = `<div class="alert alert-warning">⚠ This nomination has status <strong>${esc(nom.status)}</strong>. Only <strong>Valid</strong> nominations can be withdrawn.</div>`;
    return;
  }
  if (nom.withdrawalStatus === 'Requested' || nom.withdrawalStatus === 'Approved') {
    area.innerHTML = `<div class="alert alert-info">ℹ A withdrawal has already been ${esc(nom.withdrawalStatus.toLowerCase())} for this nomination.</div>`;
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
      await api.submitWithdrawal(id);
      area.innerHTML = `
        <div class="alert alert-success">✅ Withdrawal request submitted successfully! The Returning Officer will review your request.</div>
        <div class="mt-4 no-print">
          <button id="printWithdrawal" class="btn btn-secondary">🖨️ Print Withdrawal Form</button>
        </div>
        <div class="print-zone mt-4">
          ${buildWithdrawalPaper(id, nom)}
        </div>`;
      area.querySelector('#printWithdrawal').addEventListener('click', triggerPrint);
      showToast('Withdrawal request submitted!', 'success');
    } catch (e) {
      showToast(`Failed: ${e.message}`, 'error');
      setLoading(btn, false, 'Submit Withdrawal Request');
    }
  });


}

function buildWithdrawalPaper(id, nom) {
  const today = todayFormatted();
  const name = nom.candidate?.NAME || nom.candidateName || 'N/A';
  const cls  = nom.candidate?.CLASS || nom.candidateClass || 'N/A';
  const dept = nom.candidate?.Dept || nom.candidateDept || 'N/A';

  return `
  <div class="print-paper border border-slate-700 rounded-xl p-8 bg-slate-900 text-slate-200 space-y-5">
    <div class="flex justify-between text-sm">
      <div>
        <p class="font-bold text-white text-base">${esc(CONFIG.COLLEGE_NAME)}</p>
        <p class="text-slate-400">College Union Election — Withdrawal Form</p>
      </div>
      <p class="text-slate-400 text-xs">Date: ${today}</p>
    </div>
    <h2 class="text-center font-bold text-xl text-white border-y border-white/10 py-3">WITHDRAWAL OF NOMINATION</h2>
    <div class="space-y-2 text-sm">
      <p><span class="text-slate-400 w-40 inline-block">Nomination ID:</span> <strong class="font-mono text-indigo-300 text-lg">${esc(id)}</strong></p>
      <p><span class="text-slate-400 w-40 inline-block">Post:</span> <strong class="text-white">${esc(nom.post)}</strong></p>
      <p><span class="text-slate-400 w-40 inline-block">Candidate Name:</span> ${esc(name)}</p>
      <p><span class="text-slate-400 w-40 inline-block">Class:</span> ${esc(cls)}</p>
      <p><span class="text-slate-400 w-40 inline-block">Department:</span> ${esc(dept)}</p>
    </div>
    <p class="text-sm text-slate-300 border border-white/10 rounded-lg p-4">
      I, <strong>${esc(name)}</strong>, hereby withdraw my nomination for the post of <strong>${esc(nom.post)}</strong> in the College Union Election.
    </p>
    <div class="flex justify-around mt-8 text-sm text-slate-400">
      <div class="text-center">
        <p class="mb-8">___________________________</p>
        <p>Signature of Candidate</p>
      </div>
      <div class="text-center">
        <p class="mb-8">______ / ______ / ________</p>
        <p>Date</p>
      </div>
      <div class="text-center">
        <p class="mb-8">___________________________</p>
        <p>Returning Officer</p>
      </div>
    </div>
  </div>`;
}

function publicLayout(title, bodyHtml) {
  return `
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
        <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
        <span class="text-slate-600">|</span>
        <h1 class="font-bold text-white text-sm">${esc(title)}</h1>
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">${bodyHtml}</main>
  </div>`;
}
