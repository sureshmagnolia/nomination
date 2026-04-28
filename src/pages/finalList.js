/**
 * pages/finalList.js
 * Public page displaying the final nominations list after withdrawals.
 */
import { api } from '../api.js';
import { router } from '../router.js';
import { esc } from '../utils.js';

export async function renderFinalList(container) {
  container.innerHTML = publicLayout('Final Nominations List', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading final list...</p></div>
  `);
  container.querySelector('#backToHome').addEventListener('click', () => router.navigate('/'));

  try {
    const data = await api.getFinalNominations();
    renderFinal(container.querySelector('main'), data);
  } catch (e) {
    container.querySelector('main').innerHTML = `<div class="alert alert-warning text-center">${esc(e.message)}</div>`;
  }
}

function renderFinal(main, { active = [], withdrawn = [] } = {}) {
  if (!active.length && !withdrawn.length) {
    main.innerHTML = `<div class="alert alert-info text-center">The final nominations list has not been published yet. Please check back later.</div>`;
    return;
  }

  // Group active by post
  const byPost = {};
  active.forEach(n => {
    if (!byPost[n.post]) byPost[n.post] = [];
    byPost[n.post].push(n);
  });

  main.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-white">🏁 Final Nominations</h2>
      <p class="text-slate-400 text-sm mt-1">Final list of candidates after processing withdrawals.</p>
    </div>

    <h3 class="text-lg font-bold text-emerald-400 mb-4">Active Candidates</h3>
    ${Object.keys(byPost).length ? Object.entries(byPost).map(([post, noms]) => `
      <div class="glass rounded-xl mb-6 overflow-hidden">
        <div class="px-5 py-3 bg-emerald-500/10 border-b border-white/10">
          <h4 class="font-bold text-emerald-300 text-sm uppercase tracking-wide">${esc(post)}</h4>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>#</th><th>Nomination ID</th><th>Name</th><th>Class</th><th>Dept</th></tr></thead>
            <tbody>${noms.map((n,i) => `<tr>
              <td class="text-slate-500">${i+1}</td>
              <td class="font-mono text-indigo-300 text-xs">${esc(n.id)}</td>
              <td class="font-semibold">${esc(n.candidateName)}</td>
              <td>${esc(n.candidateClass)}</td>
              <td>${esc(n.candidateDept)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `).join('') : '<div class="alert alert-info mb-6">No active candidates.</div>'}

    ${withdrawn.length ? `
    <h3 class="text-lg font-bold text-slate-400 mb-4 mt-8">Withdrawn Nominations</h3>
    <div class="glass rounded-xl overflow-hidden opacity-70">
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead><tr><th>Nomination ID</th><th>Post</th><th>Name</th><th>Class</th><th>Dept</th></tr></thead>
          <tbody>${withdrawn.map(n => `<tr>
            <td class="font-mono text-slate-500 text-xs">${esc(n.id)}</td>
            <td>${esc(n.post)}</td>
            <td class="line-through text-slate-500">${esc(n.candidateName)}</td>
            <td>${esc(n.candidateClass)}</td>
            <td>${esc(n.candidateDept)}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>` : ''}
  `;
}

function publicLayout(title, bodyHtml) {
  return `
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
        <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
        <span class="text-slate-600">|</span>
        <h1 class="font-bold text-white text-sm">${esc(title)}</h1>
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-8">${bodyHtml}</main>
  </div>`;
}
