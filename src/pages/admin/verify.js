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
        <td class="text-xs max-w-[140px] leading-snug font-medium text-slate-200">${esc(n.post)}</td>
        <td>
          <div class="font-bold text-white flex items-center gap-1.5">
            <span>${esc(n.candidateName || n.candidate?.NAME || 'N/A')}</span>
            <span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-bold text-[10px] px-1.5 py-0.2" title="Electoral Roll Serial Number">
              Sl. #${esc(n.candidateSerial || n.candidate?.['Nominal Roll Serial Number'] || '–')}
            </span>
            ${(String(n.candidateClass || '').toUpperCase().includes('RESEARCH') || String(n.candidateClass || '').toUpperCase().includes('SCHOLAR')) ? `<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-1.5 py-0.2 font-semibold">⚠️ Ineligible (RS)</span>` : ''}
          </div>
          <div class="text-[11px] text-slate-400 font-mono">Adm: ${esc(n.candidateAdmission || n.candidate?.['ADMISION NO'] || '–')}</div>
        </td>
        <td class="text-xs text-slate-400">
          <div>${esc(n.candidateClass || '')}</div>
          <div class="text-[10px] opacity-60">${esc(n.candidateDept || '')}</div>
        </td>
        <td>
          <div class="text-xs font-medium text-slate-300 flex items-center gap-1">
            <span>${esc(n.proposerName || n.proposer?.NAME || 'N/A')}</span>
            <span class="badge bg-slate-800 text-slate-300 border border-white/10 font-mono text-[10px] px-1 py-0.2" title="Proposer Roll Serial">
              #${esc(n.proposerSerial || n.proposer?.['Nominal Roll Serial Number'] || '–')}
            </span>
          </div>
          <div class="text-[10px] text-slate-500 font-mono">Adm: ${esc(n.proposerAdmission || n.proposer?.['ADMISION NO'] || '–')}</div>
        </td>
        <td>
          <div class="text-xs font-medium text-slate-300 flex items-center gap-1">
            <span>${esc(n.seconderName || n.seconder?.NAME || 'N/A')}</span>
            <span class="badge bg-slate-800 text-slate-300 border border-white/10 font-mono text-[10px] px-1 py-0.2" title="Seconder Roll Serial">
              #${esc(n.seconderSerial || n.seconder?.['Nominal Roll Serial Number'] || '–')}
            </span>
          </div>
          <div class="text-[10px] text-slate-500 font-mono">Adm: ${esc(n.seconderAdmission || n.seconder?.['ADMISION NO'] || '–')}</div>
        </td>
        <td>
          <span class="badge badge-${(n.status || 'pending').toLowerCase()}">${esc(n.status)}</span>
          ${n.status === 'Rejected' && n.rejectionReason ? `<div class="text-[10px] text-rose-400 mt-1 max-w-[150px] leading-tight font-medium" title="${esc(n.rejectionReason)}">⚠️ ${esc(n.rejectionReason)}</div>` : ''}
        </td>
        <td>
          <div class="flex items-center gap-1.5">
            <button class="btn btn-primary btn-xs verify-btn bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white" data-id="${esc(n.id)}" data-action="Valid"
              ${n.status === 'Valid' ? 'disabled' : ''}>Valid</button>
            <button class="btn btn-secondary btn-xs verify-btn bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white" data-id="${esc(n.id)}" data-action="Rejected"
              ${n.status === 'Rejected' ? 'disabled' : ''}>Reject</button>
            <button class="btn btn-secondary btn-xs delete-nom-btn bg-red-900/20 hover:bg-red-700 text-red-400 hover:text-white border border-red-500/30 px-2" data-id="${esc(n.id)}" data-candidate="${esc(n.candidateName || n.candidate?.NAME || '')}" data-post="${esc(n.post)}" title="Delete Nomination">🗑️</button>
          </div>
        </td>
      </tr>`).join('') : `<tr><td colspan="8" class="text-center text-slate-500 py-12">No nominations found matching those criteria.</td></tr>`;
  };

  // Add Delete Warning Modal to main
  main.insertAdjacentHTML('beforeend', `
    <div id="deleteNomModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-4">
      <div class="glass w-full max-w-md rounded-2xl p-6 shadow-2xl border border-red-500/30">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center text-xl font-bold border border-red-500/30">⚠️</div>
          <div>
            <h4 class="text-xl font-bold text-white">Delete Nomination</h4>
            <p class="text-slate-400 text-xs">Permanent deletion of submission</p>
          </div>
        </div>
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-3 my-4 text-xs text-red-200 leading-relaxed">
          <strong>WARNING:</strong> This will permanently delete the nomination of <strong id="delNomCandidate" class="text-white"></strong> for <strong id="delNomPost" class="text-white"></strong> (ID: <span id="delNomId" class="font-mono text-amber-300"></span>). This cannot be undone.
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Enter Admin Password to Confirm</label>
            <input type="password" id="delNomPwdInput" class="field w-full" placeholder="Admin Password" autocomplete="current-password">
          </div>
          <div id="delNomError" class="text-rose-400 text-xs font-medium hidden"></div>
        </div>
        <div class="flex gap-2 mt-6">
          <button type="button" id="btnCancelDelNom" class="btn btn-secondary flex-1">Cancel</button>
          <button type="button" id="btnConfirmDelNom" class="btn bg-red-600 hover:bg-red-500 text-white flex-1 font-bold">Permanently Delete</button>
        </div>
      </div>
    </div>
  `);

  let pendingDeleteId = null;
  const delModal = main.querySelector('#deleteNomModal');
  const delInput = main.querySelector('#delNomPwdInput');
  const delErr = main.querySelector('#delNomError');
  const btnConfirmDel = main.querySelector('#btnConfirmDelNom');

  const closeDelModal = () => {
    delModal?.classList.add('hidden');
    pendingDeleteId = null;
    if (delInput) delInput.value = '';
    if (delErr) { delErr.textContent = ''; delErr.classList.add('hidden'); }
  };

  main.querySelector('#btnCancelDelNom')?.addEventListener('click', closeDelModal);

  main.querySelector('#btnConfirmDelNom')?.addEventListener('click', async () => {
    const enteredPwd = (delInput?.value || '').trim();
    if (!enteredPwd) {
      if (delErr) { delErr.textContent = '❌ Please enter admin password.'; delErr.classList.remove('hidden'); }
      delInput?.focus();
      return;
    }
    if (!pendingDeleteId) return;

    btnConfirmDel.disabled = true;
    btnConfirmDel.textContent = 'Deleting...';
    if (delErr) delErr.classList.add('hidden');

    try {
      await api.adminDeleteNomination(enteredPwd, pendingDeleteId);
      const idx = allNoms.findIndex(x => x.id === pendingDeleteId);
      if (idx !== -1) allNoms.splice(idx, 1);
      showToast(`Nomination ${pendingDeleteId} permanently deleted.`, 'success');
      closeDelModal();
      applyFilters();
    } catch (err) {
      const msg = err.message.includes('password') ? 'Incorrect admin password.' : err.message;
      if (delErr) { delErr.textContent = `❌ ${msg}`; delErr.classList.remove('hidden'); }
      showToast(msg, 'error');
      delInput?.focus();
    } finally {
      btnConfirmDel.disabled = false;
      btnConfirmDel.textContent = 'Permanently Delete';
    }
  });

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
    // Delete nomination button click
    const delBtn = e.target.closest('.delete-nom-btn');
    if (delBtn) {
      pendingDeleteId = delBtn.dataset.id;
      main.querySelector('#delNomCandidate').textContent = delBtn.dataset.candidate || 'Unknown';
      main.querySelector('#delNomPost').textContent = delBtn.dataset.post || 'Unknown';
      main.querySelector('#delNomId').textContent = pendingDeleteId;
      if (delInput) delInput.value = '';
      if (delErr) { delErr.textContent = ''; delErr.classList.add('hidden'); }
      delModal?.classList.remove('hidden');
      setTimeout(() => delInput?.focus(), 50);
      return;
    }

    const btn = e.target.closest('.verify-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const status = btn.dataset.action;

    let reason = null;
    if (status === 'Rejected') {
      reason = prompt(`Please enter the statutory reason for rejecting Nomination #${id}:`, 'Serial number or eligibility requirement not met');
      if (reason === null) return; // Returning officer cancelled prompt
      reason = reason.trim() || 'Scrutiny criteria not satisfied';
    }

    btn.disabled = true;
    const oldText = btn.textContent;
    btn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
    
    try {
      await api.adminVerifyNomination(pwd, id, status, reason);
      const nom = allNoms.find(n => n.id === id);
      if (nom) {
        nom.status = status;
        if (reason) nom.rejectionReason = reason;
      }
      showToast(`Nomination ${id} marked as ${status}.`, 'success');
      applyFilters(); // Re-filter to keep UI consistent
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.textContent = oldText;
    }
  });
}
