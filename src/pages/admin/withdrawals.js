/**
 * pages/admin/withdrawals.js
 * Admin page to review and approve withdrawal requests.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast } from '../../utils.js';

export async function renderAdminWithdrawals(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'withdrawals', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading withdrawal requests...</p></div>
  `);

  try {
    const noms = await api.adminGetNominations(pwd);
    const withRequests = noms.filter(n => n.withdrawalStatus && n.withdrawalStatus !== 'None');
    renderWithdrawalList(container.querySelector('#adminMain'), withRequests, pwd);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderWithdrawalList(main, noms, pwd) {
  const allRequests = Array.isArray(noms) ? noms : [];

  main.innerHTML = `
    <div class="page-enter space-y-4">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
        <div>
          <h3 class="text-xl font-bold text-white">Withdrawal Requests</h3>
          <p class="text-slate-400 text-sm">Approve or view submitted withdrawal requests.</p>
        </div>
      </div>

      <div class="glass rounded-xl p-4 flex items-center w-full shadow-lg mb-2">
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
              <th>Class/Dept</th>
              <th>Withdrawal Status</th>
              <th>Action</th>
            </tr></thead>
            <tbody id="withdrawalTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>`;

  const renderRows = (data) => {
    const tbody = main.querySelector('#withdrawalTableBody');
    tbody.innerHTML = data.length ? data.map(n => `
      <tr id="wrow-${esc(n.id)}">
        <td class="font-mono text-indigo-300 text-xs">${esc(n.id)}</td>
        <td class="text-xs font-medium text-slate-300">${esc(n.post)}</td>
        <td class="font-bold text-white">${esc(n.candidateName || n.candidate?.NAME || 'N/A')}</td>
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
      </tr>`).join('') : `<tr><td colspan="6" class="text-center text-slate-500 py-12">No withdrawal requests found matching those criteria.</td></tr>`;
  };

  const applySearch = () => {
    const q = main.querySelector('#withSearch').value.toLowerCase();
    const filtered = allRequests.filter(n => 
      !q || 
      String(n.id).toLowerCase().includes(q) || 
      String(n.candidateName || n.candidate?.NAME || '').toLowerCase().includes(q) || 
      String(n.post).toLowerCase().includes(q)
    );
    renderRows(filtered);
  };

  main.querySelector('#withSearch').addEventListener('input', applySearch);
  renderRows(allRequests);

  main.addEventListener('click', async (e) => {
    const btn = e.target.closest('.approve-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    btn.disabled = true;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
    
    try {
      await api.adminApproveWithdrawal(pwd, id);
      showToast(`Withdrawal for ${id} approved.`, 'success');
      const req = allRequests.find(r => r.id === id);
      if (req) req.withdrawalStatus = 'Approved';
      applySearch(); // Refresh the list view
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.innerHTML = oldHtml;
    }
  });
}
