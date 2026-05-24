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
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
        <div>
          <h3 class="text-xl font-bold text-white">Nomination Verification</h3>
          <p class="text-slate-400 text-sm">Review each submission and mark as Valid or Rejected.</p>
        </div>
      </div>

      <div class="glass rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center w-full shadow-lg">
        <div class="relative flex-1 w-full">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          <input type="text" id="nomSearch" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors" placeholder="Search by Candidate Name, ID, or Post...">
        </div>
        <div class="w-full md:w-56 shrink-0">
          <select id="statusFilter" class="field w-full bg-black/20 focus:bg-black/40 transition-colors">
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Valid">Valid</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div class="glass rounded-xl overflow-hidden shadow-2xl">
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

  const allNoms = Array.isArray(noms) ? noms : [];

  const renderRows = (data) => {
    const tbody = main.querySelector('#nomTableBody');
    tbody.innerHTML = data.length ? data.map(n => `
      <tr id="row-${esc(n.id)}">
        <td class="font-mono text-indigo-300 text-xs">${esc(n.id)}</td>
        <td class="text-xs max-w-[140px] leading-snug font-medium">${esc(n.post)}</td>
        <td class="font-bold text-white">${esc(n.candidateName || n.candidate?.NAME || 'N/A')}</td>
        <td class="text-xs text-slate-400">
          <div>${esc(n.candidateClass || '')}</div>
          <div class="text-[10px] opacity-60">${esc(n.candidateDept || '')}</div>
        </td>
        <td class="text-xs">${esc(n.proposerName || n.proposer?.NAME || 'N/A')}</td>
        <td class="text-xs">${esc(n.seconderName || n.seconder?.NAME || 'N/A')}</td>
        <td><span class="badge badge-${(n.status || 'pending').toLowerCase()}">${esc(n.status)}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm verify-btn bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white" data-id="${esc(n.id)}" data-action="Valid"
              ${n.status === 'Valid' ? 'disabled' : ''}>Valid</button>
            <button class="btn btn-secondary btn-sm verify-btn bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white" data-id="${esc(n.id)}" data-action="Rejected"
              ${n.status === 'Rejected' ? 'disabled' : ''}>Reject</button>
          </div>
        </td>
      </tr>`).join('') : `<tr><td colspan="8" class="text-center text-slate-500 py-12">No nominations found matching those criteria.</td></tr>`;
  };

  const applyFilters = () => {
    const q = main.querySelector('#nomSearch').value.toLowerCase();
    const s = main.querySelector('#statusFilter').value;
    
    const filtered = allNoms.filter(n => {
      const matchStatus = s === 'all' || n.status === s;
      const matchSearch = !q || 
        String(n.id).toLowerCase().includes(q) || 
        String(n.candidateName || n.candidate?.NAME || '').toLowerCase().includes(q) || 
        String(n.post).toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });

    // Sort: Pending first, then Valid, then Rejected
    filtered.sort((a, b) => {
      const order = { 'Pending': 1, 'Valid': 2, 'Rejected': 3 };
      const aOrder = order[a.status] || 99;
      const bOrder = order[b.status] || 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(b.id).localeCompare(String(a.id));
    });

    renderRows(filtered);
  };

  main.querySelector('#nomSearch').addEventListener('input', applyFilters);
  main.querySelector('#statusFilter').addEventListener('change', applyFilters);

  applyFilters(); // Initial render with sorting applied

  main.querySelector('#nomTableBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('.verify-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const status = btn.dataset.action;
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
    
    try {
      await api.adminVerifyNomination(pwd, id, status);
      const nom = allNoms.find(n => n.id === id);
      if (nom) nom.status = status;
      showToast(`Nomination ${id} marked as ${status}.`, 'success');
      applyFilters(); // Re-filter to keep UI consistent
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.textContent = oldText;
    }
  });
}
