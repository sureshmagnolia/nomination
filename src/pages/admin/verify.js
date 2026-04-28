/**
 * pages/admin/verify.js
 * Admin page to review nominations and mark them Valid / Rejected.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast } from '../../utils.js';

export async function renderAdminVerify(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'verify', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominations...</p></div>
  `);

  try {
    const noms = await api.adminGetNominations(pwd);
    renderVerifyTable(container.querySelector('#adminMain'), noms, pwd);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderVerifyTable(main, noms, pwd) {
  main.innerHTML = `
    <div class="page-enter space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-white">Nomination Verification</h3>
          <p class="text-slate-400 text-sm">Review each submission and mark as Valid or Rejected.</p>
        </div>
        <!-- Filter -->
        <select id="statusFilter" class="field w-44">
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Valid">Valid</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div class="glass rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table" id="nomTable">
            <thead><tr>
              <th>Nom. ID</th>
              <th>Post</th>
              <th>Candidate</th>
              <th>Class / Dept</th>
              <th>Proposer</th>
              <th>Seconder</th>
              <th>Status</th>
              <th>Action</th>
            </tr></thead>
            <tbody id="nomTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>`;

  let allNoms = noms;

  const renderRows = (data) => {
    const tbody = main.querySelector('#nomTableBody');
    tbody.innerHTML = data.length ? data.map(n => `
      <tr id="row-${esc(n.id)}">
        <td class="font-mono text-indigo-300 text-xs">${esc(n.id)}</td>
        <td class="text-xs max-w-[140px] leading-snug">${esc(n.post)}</td>
        <td class="font-medium">${esc(n.candidateName || n.candidate?.NAME || 'N/A')}</td>
        <td class="text-xs text-slate-400">${esc(n.candidateClass || '')} / ${esc(n.candidateDept || '')}</td>
        <td class="text-xs">${esc(n.proposerName || n.proposer?.NAME || 'N/A')}</td>
        <td class="text-xs">${esc(n.seconderName || n.seconder?.NAME || 'N/A')}</td>
        <td><span class="badge badge-${(n.status || 'pending').toLowerCase()}">${esc(n.status)}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-success btn-sm verify-btn" data-id="${esc(n.id)}" data-action="Valid"
              ${n.status === 'Valid' ? 'disabled' : ''}>✅ Valid</button>
            <button class="btn btn-danger btn-sm verify-btn" data-id="${esc(n.id)}" data-action="Rejected"
              ${n.status === 'Rejected' ? 'disabled' : ''}>❌ Reject</button>
          </div>
        </td>
      </tr>`) .join('') : `<tr><td colspan="8" class="text-center text-slate-500 py-8">No nominations match the filter.</td></tr>`;
  };

  renderRows(allNoms);

  main.querySelector('#statusFilter').addEventListener('change', (e) => {
    const val = e.target.value;
    renderRows(val === 'all' ? allNoms : allNoms.filter(n => n.status === val));
  });

  main.querySelector('#nomTableBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('.verify-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const status = btn.dataset.action;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
    try {
      await api.adminVerifyNomination(pwd, id, status);
      const nom = allNoms.find(n => n.id === id);
      if (nom) nom.status = status;
      showToast(`Nomination ${id} marked as ${status}.`, status === 'Valid' ? 'success' : 'error');
      // Update the row's badge and buttons
      const row = main.querySelector(`#row-${id}`);
      if (row) {
        row.querySelector('.badge').className = `badge badge-${status.toLowerCase()}`;
        row.querySelector('.badge').textContent = status;
        row.querySelectorAll('.verify-btn').forEach(b => b.disabled = b.dataset.action === status);
      }
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.textContent = btn.dataset.action === 'Valid' ? '✅ Valid' : '❌ Reject';
    }
  });
}
