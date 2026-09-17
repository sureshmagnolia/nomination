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
  let withRequests = allNomsList.filter(n => n.withdrawalStatus && n.withdrawalStatus !== 'None');
  let directList   = allNomsList.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');
  let withdrawnList = allNomsList.filter(n => n.withdrawalStatus === 'Approved');

  main.innerHTML = `
    <div class="page-enter space-y-4">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
        <div>
          <h3 class="text-xl font-bold text-white">Withdrawal Management</h3>
          <p class="text-slate-400 text-sm">Approve student requests, directly withdraw candidates, or restore accidental withdrawals.</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 border-b border-white/10 pb-0 mb-4">
        <button id="tabRequests" class="tab-btn px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 border-indigo-400 text-white bg-white/5">
          📥 Student Requests <span id="reqCountBadge" class="ml-1 badge badge-pending text-xs">${withRequests.length}</span>
        </button>
        <button id="tabDirect" class="tab-btn px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 border-transparent text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          ⚡ Admin Direct Withdrawal & Restoration
        </button>
      </div>

      <!-- Tab: Student Requests -->
      <div id="panelRequests">
        <div class="glass rounded-xl p-4 flex items-center w-full shadow-lg mb-3">
          <div class="relative flex-1 w-full">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text" id="withSearch" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors" placeholder="Search requests by candidate name, ID, or post...">
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

      <!-- Tab: Direct Withdrawal & Restoration -->
      <div id="panelDirect" class="hidden space-y-6">
        <div class="alert" style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius:0.75rem; padding:0.85rem 1.2rem; color:#7dd3fc; font-size:0.85rem;">
          💡 <strong>Direct Withdrawal & Accidental Recovery:</strong> You can directly withdraw any candidate from the active valid list. If a withdrawal was made accidentally, you can immediately <strong>Restore</strong> the candidate back to the active Valid List using the <em>Withdrawn Candidates (Restorable)</em> section below.
        </div>

        <!-- Section 1: Active Valid Nominations -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-white text-base flex items-center gap-2">
              <span>⚡ Active Valid Candidates</span>
              <span id="activeCountBadge" class="badge badge-valid text-xs">${directList.length}</span>
            </h4>
            <span class="text-xs text-slate-400">Candidates currently competing</span>
          </div>

          <div class="glass rounded-xl p-3 flex items-center w-full shadow-lg">
            <div class="relative flex-1 w-full">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
              <input type="text" id="directSearch" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors" placeholder="Search active candidates by name, ID, or post...">
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

        <!-- Section 2: Withdrawn Candidates (Restorable) -->
        <div class="space-y-3 pt-6 border-t border-white/10">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-amber-300 text-base flex items-center gap-2">
              <span>↺ Withdrawn Candidates (Restorable)</span>
              <span id="withdrawnCountBadge" class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">${withdrawnList.length}</span>
            </h4>
            <span class="text-xs text-amber-400/80">Accidentally withdrawn? Click Restore to return candidate to the Valid list</span>
          </div>

          <div class="glass rounded-xl p-3 flex items-center w-full shadow-lg">
            <div class="relative flex-1 w-full">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
              <input type="text" id="restoreSearch" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors" placeholder="Search withdrawn candidates to restore...">
            </div>
          </div>

          <div class="glass rounded-xl overflow-hidden shadow-2xl border border-amber-500/20">
            <div class="overflow-x-auto">
              <table class="data-table">
                <thead><tr>
                  <th>Nom. ID</th>
                  <th>Post</th>
                  <th>Candidate</th>
                  <th>Class / Dept</th>
                  <th>Withdrawal Source</th>
                  <th>Action</th>
                </tr></thead>
                <tbody id="withdrawnTableBody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // ── Tab switching ────────────────────────────────────────────────────────
  const tabRequests   = main.querySelector('#tabRequests');
  const tabDirect     = main.querySelector('#tabDirect');
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

  const updateBadges = () => {
    const bReq = main.querySelector('#reqCountBadge');
    if (bReq) bReq.textContent = withRequests.length;
    const bAct = main.querySelector('#activeCountBadge');
    if (bAct) bAct.textContent = directList.length;
    const bWit = main.querySelector('#withdrawnCountBadge');
    if (bWit) bWit.textContent = withdrawnList.length;
  };

  // ── Tab 1: Student Requests ──────────────────────────────────────────────
  const renderRequestRows = (data) => {
    const tbody = main.querySelector('#withdrawalTableBody');
    tbody.innerHTML = data.length ? data.map(n => {
      const isApproved = n.withdrawalStatus === 'Approved';
      const isPending  = n.withdrawalStatus === 'Pending' || n.withdrawalStatus === 'Requested';
      const isRejected = n.withdrawalStatus === 'Rejected';

      let statusBadge = `<span class="badge badge-pending">Pending</span>`;
      if (isApproved) statusBadge = `<span class="badge badge-valid">Approved (Withdrawn)</span>`;
      else if (isRejected) statusBadge = `<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/30">Rejected (Active)</span>`;

      return `
      <tr id="wrow-${esc(n.id)}">
        <td class="font-mono text-indigo-300 text-xs">${esc(n.id)}</td>
        <td class="text-xs font-medium text-slate-300">${esc(n.post)}</td>
        <td class="font-bold text-white">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span>${esc(n.candidateName || 'N/A')}</span>
            ${(n.candidateSerial || n.candidate?.['Nominal Roll Serial Number']) ? `<span class="badge bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">Sl. #${esc(n.candidateSerial || n.candidate?.['Nominal Roll Serial Number'])}</span>` : ''}
          </div>
        </td>
        <td class="text-xs text-slate-400">${esc(n.candidateClass || '')} / ${esc(n.candidateDept || '')}</td>
        <td>${statusBadge}</td>
        <td>
          ${isApproved ? `
            <button class="btn btn-sm unapprove-btn" data-id="${esc(n.id)}"
              style="background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.4);"
              title="Undo approval and restore candidate to active Valid list">
              ↺ Restore Approval
            </button>
          ` : isPending ? `
            <div class="flex items-center gap-1.5">
              <button class="btn btn-primary btn-sm approve-btn bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white" data-id="${esc(n.id)}" title="Approve withdrawal and withdraw candidate">
                ✅ Approve
              </button>
              <button class="btn btn-sm reject-btn" data-id="${esc(n.id)}"
                style="background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);" title="Reject request; keep candidate active">
                ❌ Reject
              </button>
            </div>
          ` : `
            <button class="btn btn-sm approve-btn text-xs bg-slate-700/50 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-300 border border-white/10" data-id="${esc(n.id)}" title="Re-evaluate and approve withdrawal">
              Approve
            </button>
          `}
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="6" class="text-center text-slate-500 py-12">No withdrawal requests found.</td></tr>`;
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
    // 1. Approve Request
    const appBtn = e.target.closest('.approve-btn');
    if (appBtn) {
      const id = appBtn.dataset.id;
      appBtn.disabled = true;
      appBtn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
      try {
        await api.adminApproveWithdrawal(pwd, id);
        showToast('Withdrawal request approved.', 'success');
        const req = withRequests.find(r => r.id === id);
        if (req) req.withdrawalStatus = 'Approved';
        
        // Synchronize with direct & withdrawn lists
        const targetNom = allNomsList.find(n => n.id === id) || req;
        if (targetNom) {
          targetNom.withdrawalStatus = 'Approved';
          directList = directList.filter(n => n.id !== id);
          if (!withdrawnList.some(n => n.id === id)) withdrawnList.unshift(targetNom);
        }
        updateBadges();
        applyRequestSearch();
        applyDirectSearch();
        applyRestoreSearch();
      } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
        appBtn.disabled = false;
        appBtn.innerHTML = '✅ Approve';
      }
      return;
    }

    // 2. Reject Request
    const rejBtn = e.target.closest('.reject-btn');
    if (rejBtn) {
      const id = rejBtn.dataset.id;
      const req = withRequests.find(r => r.id === id);
      if (!confirm(`REJECT WITHDRAWAL REQUEST\n\nCandidate: ${req?.candidateName || id}\nPost: ${req?.post || ''}\n\nRejecting this request will keep the candidate active on the Valid List. Proceed?`)) return;
      rejBtn.disabled = true;
      rejBtn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
      try {
        await api.adminRejectWithdrawal(pwd, id);
        showToast(`Withdrawal request for ${req?.candidateName || id} rejected. Candidate remains active.`, 'info');
        if (req) req.withdrawalStatus = 'Rejected';
        
        const targetNom = allNomsList.find(n => n.id === id) || req;
        if (targetNom) {
          targetNom.withdrawalStatus = 'Rejected';
          withdrawnList = withdrawnList.filter(n => n.id !== id);
          if (!directList.some(n => n.id === id)) directList.unshift(targetNom);
        }
        updateBadges();
        applyRequestSearch();
        applyDirectSearch();
        applyRestoreSearch();
      } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
        rejBtn.disabled = false;
        rejBtn.innerHTML = '❌ Reject';
      }
      return;
    }

    // 3. Restore Accidental Approval in Requests tab
    const unappBtn = e.target.closest('.unapprove-btn');
    if (unappBtn) {
      const id = unappBtn.dataset.id;
      const req = withRequests.find(r => r.id === id);
      if (!confirm(`RESTORE STUDENT WITHDRAWAL APPROVAL\n\nCandidate: ${req?.candidateName || id}\nPost: ${req?.post || ''}\n\nThis will undo the approved withdrawal, restore the candidate to the active Valid List, and return this request to 'Pending'.\n\nProceed?`)) return;
      unappBtn.disabled = true;
      unappBtn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
      try {
        await api.adminRestoreWithdrawal(pwd, id, 'Pending');
        showToast(`✅ Withdrawal approval undone! ${req?.candidateName || id} restored to Valid list.`, 'success');
        if (req) req.withdrawalStatus = 'Pending';

        const targetNom = allNomsList.find(n => n.id === id) || req;
        if (targetNom) {
          targetNom.withdrawalStatus = 'Pending';
          withdrawnList = withdrawnList.filter(n => n.id !== id);
          if (!directList.some(n => n.id === id)) directList.unshift(targetNom);
        }
        updateBadges();
        applyRequestSearch();
        applyDirectSearch();
        applyRestoreSearch();
      } catch (err) {
        showToast(`Restore Failed: ${err.message}`, 'error');
        unappBtn.disabled = false;
        unappBtn.innerHTML = '↺ Restore Approval';
      }
      return;
    }
  });

  // ── Tab 2: Direct Withdrawal & Restoration ───────────────────────────────
  const renderDirectRows = (data) => {
    const tbody = main.querySelector('#directTableBody');
    tbody.innerHTML = data.length ? data.map(n => `
      <tr id="drow-${esc(n.id)}">
        <td class="font-mono text-indigo-300 text-xs">${esc(n.id)}</td>
        <td class="text-xs font-medium text-slate-300">${esc(n.post)}</td>
        <td class="font-bold text-white">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span>${esc(n.candidateName || 'N/A')}</span>
            ${(n.candidateSerial || n.candidate?.['Nominal Roll Serial Number']) ? `<span class="badge bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">Sl. #${esc(n.candidateSerial || n.candidate?.['Nominal Roll Serial Number'])}</span>` : ''}
          </div>
        </td>
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
      </tr>`).join('') : `<tr><td colspan="6" class="text-center text-slate-500 py-8">No active valid nominations found.</td></tr>`;
  };

  const renderWithdrawnRows = (data) => {
    const tbody = main.querySelector('#withdrawnTableBody');
    tbody.innerHTML = data.length ? data.map(n => {
      const isStudent = withRequests.some(r => r.id === n.id);
      return `
      <tr id="rrow-${esc(n.id)}" class="bg-amber-950/10">
        <td class="font-mono text-indigo-300 text-xs">${esc(n.id)}</td>
        <td class="text-xs font-medium text-slate-300">${esc(n.post)}</td>
        <td class="font-bold text-white">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span>${esc(n.candidateName || 'N/A')}</span>
            ${(n.candidateSerial || n.candidate?.['Nominal Roll Serial Number']) ? `<span class="badge bg-amber-500/20 text-amber-300 font-mono text-[10px]">Sl. #${esc(n.candidateSerial || n.candidate?.['Nominal Roll Serial Number'])}</span>` : ''}
          </div>
        </td>
        <td class="text-xs text-slate-400">${esc(n.candidateClass || '')} / ${esc(n.candidateDept || '')}</td>
        <td>
          <span class="badge ${isStudent ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'} text-xs">
            ${isStudent ? 'Student Request' : 'Admin Direct'}
          </span>
        </td>
        <td>
          <button class="btn btn-sm restore-withdraw-btn flex items-center gap-1.5" data-id="${esc(n.id)}"
            style="background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.35);"
            onmouseover="this.style.background='rgba(16,185,129,0.8)';this.style.color='white';"
            onmouseout="this.style.background='rgba(16,185,129,0.15)';this.style.color='#34d399';"
            title="Restore this nomination back to the active Valid List">
            ↺ Restore to Valid List
          </button>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="6" class="text-center text-slate-500 py-8">No withdrawn nominations found.</td></tr>`;
  };

  const applyDirectSearch = () => {
    const q = (main.querySelector('#directSearch')?.value || '').toLowerCase();
    renderDirectRows(directList.filter(n =>
      !q ||
      String(n.id).toLowerCase().includes(q) ||
      String(n.candidateName || '').toLowerCase().includes(q) ||
      String(n.post).toLowerCase().includes(q)
    ));
  };

  const applyRestoreSearch = () => {
    const q = (main.querySelector('#restoreSearch')?.value || '').toLowerCase();
    renderWithdrawnRows(withdrawnList.filter(n =>
      !q ||
      String(n.id).toLowerCase().includes(q) ||
      String(n.candidateName || '').toLowerCase().includes(q) ||
      String(n.post).toLowerCase().includes(q)
    ));
  };

  main.querySelector('#directSearch').addEventListener('input', applyDirectSearch);
  main.querySelector('#restoreSearch').addEventListener('input', applyRestoreSearch);

  renderDirectRows(directList);
  renderWithdrawnRows(withdrawnList);

  main.querySelector('#panelDirect').addEventListener('click', async (e) => {
    // 1. Direct Withdraw action
    const wBtn = e.target.closest('.direct-withdraw-btn');
    if (wBtn) {
      const id = wBtn.dataset.id;
      const nom = directList.find(n => n.id === id);
      if (!confirm(`CONFIRM DIRECT WITHDRAWAL\n\nCandidate: ${nom?.candidateName || id}\nPost: ${nom?.post || ''}\n\nThis will mark this nomination as Withdrawn.\n(Note: You can easily restore it below at any time if done accidentally).\n\nProceed?`)) return;
      
      wBtn.disabled = true;
      wBtn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
      try {
        await api.adminDirectWithdrawal(pwd, id);
        showToast(`Nomination ${id} marked as Withdrawn.`, 'success');
        
        // Move from directList to withdrawnList
        if (nom) {
          nom.withdrawalStatus = 'Approved';
          directList = directList.filter(n => n.id !== id);
          if (!withdrawnList.some(n => n.id === id)) {
            withdrawnList.unshift(nom);
          }
        }
        updateBadges();
        applyDirectSearch();
        applyRestoreSearch();
      } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
        wBtn.disabled = false;
        wBtn.innerHTML = '⚡ Withdraw Now';
      }
      return;
    }

    // 2. Restore Withdrawn Nomination action
    const rBtn = e.target.closest('.restore-withdraw-btn');
    if (rBtn) {
      const id = rBtn.dataset.id;
      const nom = withdrawnList.find(n => n.id === id);
      if (!confirm(`CONFIRM RESTORE NOMINATION\n\nCandidate: ${nom?.candidateName || id}\nPost: ${nom?.post || ''}\n\nThis will undo the withdrawal and immediately return this candidate to the active Valid List.\n\nProceed?`)) return;

      rBtn.disabled = true;
      rBtn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>';
      
      const isStudentReq = withRequests.some(r => r.id === id);
      const targetStatus = isStudentReq ? 'Pending' : 'None';

      try {
        await api.adminRestoreWithdrawal(pwd, id, targetStatus);
        showToast(`✅ Nomination ${id} (${nom?.candidateName || ''}) successfully restored to Valid List!`, 'success');

        // Move from withdrawnList back to directList
        if (nom) {
          nom.withdrawalStatus = targetStatus;
          withdrawnList = withdrawnList.filter(n => n.id !== id);
          if (!directList.some(n => n.id === id)) {
            directList.unshift(nom);
          }
        }
        const reqItem = withRequests.find(r => r.id === id);
        if (reqItem) reqItem.withdrawalStatus = 'Pending';

        updateBadges();
        applyDirectSearch();
        applyRestoreSearch();
        applyRequestSearch();
      } catch (err) {
        showToast(`Restore Failed: ${err.message}`, 'error');
        rBtn.disabled = false;
        rBtn.innerHTML = '↺ Restore to Valid List';
      }
      return;
    }
  });
}
