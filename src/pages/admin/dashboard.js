/**
 * pages/admin/dashboard.js
 * Admin dashboard with summary statistics.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast } from '../../utils.js';

export async function renderAdminDashboard(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'dashboard', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading dashboard...</p></div>
  `);

  try {
    const [noms, settings] = await Promise.all([
      api.adminGetNominations(pwd),
      api.adminGetSettings(pwd),
    ]);

    const total     = noms.length;
    const pending   = noms.filter(n => n.status === 'Pending').length;
    const valid     = noms.filter(n => n.status === 'Valid').length;
    const rejected  = noms.filter(n => n.status === 'Rejected').length;
    const withdrawn = noms.filter(n => n.withdrawalStatus === 'Requested').length;

    const main = container.querySelector('#adminMain');
    main.innerHTML = `
      <div class="page-enter space-y-6">
        <div>
          <h3 class="text-xl font-bold text-white">Dashboard Overview</h3>
          <p class="text-slate-400 text-sm mt-1">Summary of the current election status.</p>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          ${stat('Total Nominations', total, '#6366f1')}
          ${stat('Pending Review', pending, '#f59e0b')}
          ${stat('Valid', valid, '#10b981')}
          ${stat('Rejected', rejected, '#ef4444')}
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          ${stat('Withdrawal Requests', withdrawn, '#8b5cf6')}
          ${stat('Valid List Published', settings.validListPublished === 'true' ? '✅ Yes' : '❌ No', '#0ea5e9')}
          ${stat('Final List Published', settings.finalListPublished === 'true' ? '✅ Yes' : '❌ No', '#0ea5e9')}
        </div>

        <!-- Quick actions -->
        <div class="glass rounded-xl p-5 space-y-3">
          <h4 class="font-semibold text-white">Quick Actions</h4>
          <div class="flex flex-wrap gap-3">
            <button class="btn btn-secondary btn-sm" data-admin-nav="verify">✅ Review Nominations (${pending} pending)</button>
            <button class="btn btn-secondary btn-sm" data-admin-nav="withdrawals">↩️ Process Withdrawals (${withdrawn} pending)</button>
            <button class="btn btn-secondary btn-sm" data-admin-nav="publish">📢 Publish Lists</button>
          </div>
        </div>

        <!-- Recent nominations -->
        <div class="glass rounded-xl overflow-hidden">
          <div class="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <h4 class="font-semibold text-white text-sm">Recent Nominations</h4>
            <span class="text-xs text-slate-500">${total} total</span>
          </div>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr><th>Nom. ID</th><th>Post</th><th>Candidate</th><th>Dept</th><th>Status</th><th>Withdrawal</th></tr></thead>
              <tbody>
                ${noms.slice(-10).reverse().map(n => `<tr>
                  <td class="font-mono text-indigo-300 text-xs">${esc(n.id)}</td>
                  <td class="text-xs">${esc(n.post)}</td>
                  <td class="font-medium">${esc(n.candidateName)}</td>
                  <td class="text-xs">${esc(n.candidateDept)}</td>
                  <td><span class="badge badge-${(n.status||'pending').toLowerCase()}">${esc(n.status)}</span></td>
                  <td class="text-xs text-slate-500">${esc(n.withdrawalStatus || 'None')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;

    container.querySelectorAll('[data-admin-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { router } = window._appRouter || {};
        import('../../router.js').then(({ router }) => router.navigate(`/admin/${btn.dataset.adminNav}`));
      });
    });
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function stat(label, value, color) {
  return `
  <div class="glass rounded-xl p-5">
    <p class="text-xs text-slate-400 uppercase tracking-wide mb-2">${label}</p>
    <p class="text-3xl font-bold" style="color:${color}">${value}</p>
  </div>`;
}
