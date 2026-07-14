/**
 * pages/admin/withdrawals.js
 * Admin page to review/approve student withdrawal requests AND
 * directly withdraw any Valid nomination without a student request.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

export async function renderAdminWithdrawals(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'withdrawals', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading withdrawals...</p></div>
  `);

  try {
    const noms = await api.adminGetNominations(pwd);
    renderWithdrawalUI(container.querySelector('#adminMain'), noms, pwd);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderWithdrawalUI(main, allNoms, pwd) {
  const allNomsList = Array.isArray(allNoms) ? allNoms : [];
  const withRequests = allNomsList.filter(n => n.withdrawalStatus && n.withdrawalStatus !== 'None');
  const validNoms    = allNomsList.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');

  main.innerHTML = `
    <div class="page-enter space-y-4">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
        <div>
          <h3 class="text-xl font-bold text-white">Withdrawals</h3>
          <p class="text-slate-400 text-sm">Approve student requests or directly withdraw any valid nomination.</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 border-b border-white/10 pb-0 mb-4">
        <button id="tabRequests" class="tab-btn px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 border-indigo-400 text-white bg-white/5">
          📥 Student Requests <span class="ml-1 badge badge-pending text-xs">${withRequests.length}</span>
        </button>
        <button id="tabDirect" class="tab-btn px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 border-transparent text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          ⚡ Admin Direct Withdrawal
        </button>
      </div>

      <!-- Tab: Student Requests -->
      <div id="panelRequests">
        <div class="glass rounded-xl p-4 flex items-center w-full shadow-lg mb-3">
          <div class="relative flex-1 w-full">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text" id="withSearch" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors" placeholder="Search by Candidate Name, ID, or Post...">
          </div>
        </div>
        <div class="glass rounded-xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr>
                <th>Nom. ID</th>
                <th>Post</th>
                <th>Candidate</th>
                <th>Class / Dept</th>
                <th>Withdrawal Status</th>
                <th>Action</th>
              </tr></thead>
              <tbody id="withdrawalTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tab: Direct Withdrawal -->
      <div id="panelDirect" class="hidden">
        <div class="alert mb-4" style="background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); border-radius:0.75rem; padding:0.75rem 1rem; color:#fbbf24; font-size:0.85rem;">
          🛡️ <strong>Admin Direct Withdrawal:</strong> You can immediately withdraw any Valid nomination without needing the candidate to submit a request. This is irreversible.
        </div>
        <div class="glass rounded-xl p-4 flex items-center w-full shadow-lg mb-3">
          <div class="relative flex-1 w-full">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text" id="directSearch" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors" placeholder="Search Valid nominations by name, ID, or post...">
          </div>
        </div>
        <div class="glass rounded-xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr>
                <th>Nom. ID</th>
                <th>Post</th>
                <th>Candidate</th>
                <th>Class / Dept</th>
                <th>Current Status</th>
                <th>Action</th>
              </tr></thead>
              <tbody id="directTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;

  // ── Tab switching ────────────────────────────────────────────────────────
  const tabRequests = main.querySelector('#tabRequests');
  const tabDirect   = main.querySelector('#tabDirect');
  const panelRequests = main.querySelector('#panelRequests');
  const panelDirect   = main.querySelector('#panelDirect');

  const activateTab = (tab) => {
    [tabRequests, tabDirect].forEach(t => {
      t.classList.remove('border-indigo-400', 'text-white', 'bg-white/5');
      t.classList.add('border-transparent', 'text-slate-400');
    });
    tab.classList.add('border-indigo-400', 'text-white', 'bg-white/5');
    tab.classList.remove('border-transparent', 'text-slate-400');
    panelRequests.classList.toggle('hidden', tab !== tabRequests);
    panelDirect.classList.toggle('hidden', tab !== tabDirect);
  };

  tabRequests.onclick = () => activateTab(tabRequests);
  tabDirect.onclick   = () => activateTab(tabDirect);

  // ── Tab 1: Student Requests ──────────────────────────────────────────────
  const renderRequestRows = (data) => {
    const tbody = main.querySelector('#withdrawalTableBody');
    tbody.innerHTML = data.length ? data.map(n => `
      <tr id="wrow-${esc(n.id)}">
        <td class="font-mono text-indigo-300 text-xs">${esc(n.id)}</td>
        <td class="text-xs font-medium text-slate-300">${esc(n.post)}</td>
        <td class="font-bold text-white">${esc(n.candidateName || 'N/A')}</td>
        <td class="text-xs text-slate-400">${esc(n.candidateClass || '')} / ${esc(n.candidateDept || '')}</td>
        <td>
          <span class="badge ${n.withdrawalStatus === 'Approved' ? 'badge-valid' : 'badge-pending'}">
            ${esc(n.withdrawalStatus)}
          </span>
        </td>
        <td>
          <button class="btn btn-primary btn-sm approve-btn bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white" data-id="${esc(n.id)}"
            ${n.withdrawalStatus === 'Approved' ? 'disabled' : ''}>
            ✅ Approve
          </button>
        </td>
      </tr>`).join('') : `<tr><td colspan="6" class="text-center text-slate-500 py-12">No withdrawal requests found.</td></tr>`;
  };

  const applyRequestSearch = () => {
    const q = main.querySelector('#withSearch').value.toLowerCase();
    renderRequestRows(withRequests.filter(n =>
      !q ||
      String(n.id).toLowerCase().includes(q) ||
      String(n.candidateName || '').toLowerCase().includes(q) ||
      String(n.post).toLowerCase().includes(q)
    ));
  };

  main.querySelector('#withSearch').addEventListener('input', applyRequestSearch);
  renderRequestRows(withRequests);

  main.querySelector('#panelRequests').addEventListener('click', async (e) => {
    const btn = e.target.closest('.approve-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
    try {
      await api.adminApproveWithdrawal(pwd, id);
      showToast('Withdrawal approved.', 'success');
      const req = withRequests.find(r => r.id === id);
      if (req) req.withdrawalStatus = 'Approved';
      applyRequestSearch();
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.innerHTML = '✅ Approve';
    }
  });

  // ── Tab 2: Direct Withdrawal ─────────────────────────────────────────────
  let directList = [...validNoms];

  const renderDirectRows = (data) => {
    const tbody = main.querySelector('#directTableBody');
    tbody.innerHTML = data.length ? data.map(n => `
      <tr id="drow-${esc(n.id)}">
        <td class="font-mono text-indigo-300 text-xs">${esc(n.id)}</td>
        <td class="text-xs font-medium text-slate-300">${esc(n.post)}</td>
        <td class="font-bold text-white">${esc(n.candidateName || 'N/A')}</td>
        <td class="text-xs text-slate-400">${esc(n.candidateClass || '')} / ${esc(n.candidateDept || '')}</td>
        <td>
          <span class="badge badge-valid">${esc(n.status)}</span>
          ${n.withdrawalStatus && n.withdrawalStatus !== 'None' ? `<span class="badge badge-pending ml-1">${esc(n.withdrawalStatus)}</span>` : ''}
        </td>
        <td>
          <button class="btn btn-sm direct-withdraw-btn" data-id="${esc(n.id)}"
            style="background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);"
            onmouseover="this.style.background='rgba(239,68,68,0.8)';this.style.color='white';"
            onmouseout="this.style.background='rgba(239,68,68,0.15)';this.style.color='#f87171';">
            ⚡ Withdraw Now
          </button>
        </td>
      </tr>`).join('') : `<tr><td colspan="6" class="text-center text-slate-500 py-12">No valid nominations available for withdrawal.</td></tr>`;
  };

  const applyDirectSearch = () => {
    const q = main.querySelector('#directSearch').value.toLowerCase();
    renderDirectRows(directList.filter(n =>
      !q ||
      String(n.id).toLowerCase().includes(q) ||
      String(n.candidateName || '').toLowerCase().includes(q) ||
      String(n.post).toLowerCase().includes(q)
    ));
  };

  main.querySelector('#directSearch').addEventListener('input', applyDirectSearch);
  renderDirectRows(directList);

  main.querySelector('#panelDirect').addEventListener('click', async (e) => {
    const btn = e.target.closest('.direct-withdraw-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const nom = directList.find(n => n.id === id);
    if (!confirm(`CONFIRM DIRECT WITHDRAWAL\n\nCandidate: ${nom?.candidateName || id}\nPost: ${nom?.post || ''}\n\nThis will immediately mark this nomination as Withdrawn. This cannot be undone. Proceed?`)) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
    try {
      await api.adminDirectWithdrawal(pwd, id);
      showToast(`Nomination ${id} directly withdrawn.`, 'success');
      directList = directList.filter(n => n.id !== id);
      applyDirectSearch();
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.innerHTML = '⚡ Withdraw Now';
    }
  });
}
