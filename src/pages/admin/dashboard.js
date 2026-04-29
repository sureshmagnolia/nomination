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
      <div class="page-enter space-y-8">
        <div class="flex items-end justify-between">
          <div>
            <h3 class="text-2xl font-bold text-white">Admin Dashboard</h3>
            <p class="text-slate-400 text-sm mt-1">Real-time overview of nomination and election status.</p>
          </div>
          <div class="text-right hidden md:block">
            <p class="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Last Updated</p>
            <p class="text-xs text-indigo-400 font-mono">${new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
          ${stat('Total Submissions', total, 'from-indigo-500/20 to-indigo-600/5', 'text-indigo-400')}
          ${stat('Pending Review', pending, 'from-amber-500/20 to-amber-600/5', 'text-amber-400')}
          ${stat('Valid Nominations', valid, 'from-emerald-500/20 to-emerald-600/5', 'text-emerald-400')}
          ${stat('Rejected', rejected, 'from-rose-500/20 to-rose-600/5', 'text-rose-400')}
        </div>

        <!-- Secondary Stats & Actions -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 glass rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h4 class="font-bold text-white mb-2">Management Actions</h4>
              <p class="text-slate-400 text-xs mb-6">Process incoming requests and publish official lists to the public portal.</p>
            </div>
            <div class="flex flex-wrap gap-3">
              <button class="btn btn-primary" data-admin-nav="verify">
                <span>✅ Review Nominations</span>
                ${pending > 0 ? `<span class="ml-1 bg-white/20 px-1.5 py-0.5 rounded text-[10px]">${pending}</span>` : ''}
              </button>
              <button class="btn btn-secondary" data-admin-nav="withdrawals">
                <span>↩️ Withdrawals</span>
                ${withdrawn > 0 ? `<span class="ml-1 bg-indigo-500/40 px-1.5 py-0.5 rounded text-[10px]">${withdrawn}</span>` : ''}
              </button>
              <button class="btn btn-secondary" data-admin-nav="publish">📢 Publish Lists</button>
            </div>
          </div>
          
          <div class="glass rounded-2xl p-6 space-y-4">
            <h4 class="font-bold text-white text-sm">Visibility Status</h4>
            <div class="space-y-3">
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400">Valid List</span>
                <span class="badge ${settings.validListPublished === 'true' ? 'badge-valid' : 'badge-pending'}">${settings.validListPublished === 'true' ? 'Published' : 'Hidden'}</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400">Final List</span>
                <span class="badge ${settings.finalListPublished === 'true' ? 'badge-valid' : 'badge-pending'}">${settings.finalListPublished === 'true' ? 'Published' : 'Hidden'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Table View -->
        <div class="glass rounded-2xl overflow-hidden shadow-2xl">
          <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <h4 class="font-bold text-white text-sm">Recent Activity</h4>
            <span class="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Top 10 Latest</span>
          </div>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nomination ID</th>
                  <th>Candidate Name</th>
                  <th>Post</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${noms.slice(-10).reverse().map(n => `
                  <tr>
                    <td class="font-mono text-indigo-400 text-xs">${esc(n.id)}</td>
                    <td>
                      <div class="font-semibold text-white">${esc(n.candidateName)}</div>
                      <div class="text-[10px] text-slate-500">${esc(n.candidateClass)}</div>
                    </td>
                    <td class="text-xs text-slate-300 font-medium">${esc(n.post)}</td>
                    <td class="text-xs text-slate-400">${esc(n.candidateDept)}</td>
                    <td><span class="badge badge-${(n.status||'pending').toLowerCase()}">${esc(n.status)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${total > 10 ? `
          <div class="p-3 text-center border-t border-white/5 bg-white/[0.01]">
            <button class="text-[10px] text-indigo-400 font-bold uppercase tracking-widest hover:text-indigo-300 transition" data-admin-nav="verify">View All Nominations →</button>
          </div>` : ''}
        </div>
      </div>`;

    container.querySelectorAll('[data-admin-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        import('../../router.js').then(({ router }) => router.navigate(`/admin/${btn.dataset.adminNav}`));
      });
    });
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function stat(label, value, gradient, textColor) {
  return `
  <div class="glass rounded-2xl p-6 relative overflow-hidden group">
    <div class="absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3 relative z-10">${label}</p>
    <p class="text-3xl font-black ${textColor} relative z-10">${value}</p>
  </div>`;
}
