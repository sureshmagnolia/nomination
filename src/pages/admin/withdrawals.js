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
  main.innerHTML = `
    <div class="page-enter space-y-4">
      <div>
        <h3 class="text-xl font-bold text-white">Withdrawal Requests</h3>
        <p class="text-slate-400 text-sm">Approve or view submitted withdrawal requests.</p>
      </div>
      ${noms.length === 0 ? '<div class="alert alert-info">No withdrawal requests found.</div>' : `
      <div class="glass rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr>
              <th>Nom. ID</th><th>Post</th><th>Candidate</th><th>Class/Dept</th>
              <th>Withdrawal Status</th><th>Action</th>
            </tr></thead>
            <tbody>
              ${noms.map(n => `
              <tr id="wrow-${esc(n.id)}">
                <td class="font-mono text-indigo-300 text-xs">${esc(n.id)}</td>
                <td class="text-xs">${esc(n.post)}</td>
                <td class="font-medium">${esc(n.candidateName || 'N/A')}</td>
                <td class="text-xs text-slate-400">${esc(n.candidateClass || '')} / ${esc(n.candidateDept || '')}</td>
                <td>
                  <span class="badge ${n.withdrawalStatus === 'Approved' ? 'badge-valid' : 'badge-pending'}">
                    ${esc(n.withdrawalStatus)}
                  </span>
                </td>
                <td>
                  <button class="btn btn-success btn-sm approve-btn" data-id="${esc(n.id)}"
                    ${n.withdrawalStatus === 'Approved' ? 'disabled' : ''}>
                    ✅ Approve
                  </button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`}
    </div>`;

  main.addEventListener('click', async (e) => {
    const btn = e.target.closest('.approve-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
    try {
      await api.adminApproveWithdrawal(pwd, id);
      showToast(`Withdrawal for ${id} approved.`, 'success');
      const row = main.querySelector(`#wrow-${id}`);
      if (row) {
        const badge = row.querySelector('.badge');
        badge.textContent = 'Approved';
        badge.className = 'badge badge-valid';
        btn.textContent = '✅ Approve';
        btn.disabled = true;
      }
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.textContent = '✅ Approve';
    }
  });
}
