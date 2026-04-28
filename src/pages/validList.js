/**
 * pages/validList.js
 * Public page displaying the published list of valid nominations.
 */
import { api } from '../api.js';
import { router } from '../router.js';
import { esc } from '../utils.js';

export async function renderValidList(container) {
  container.innerHTML = publicLayout('Valid Nominations List', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading list...</p></div>
  `);
  container.querySelector('#backToHome').addEventListener('click', () => router.navigate('/'));

  try {
    const data = await api.getValidNominations();
    renderList(container.querySelector('main'), data);
  } catch (e) {
    container.querySelector('main').innerHTML = `<div class="alert alert-warning text-center">${esc(e.message)}</div>`;
  }
}

function renderList(main, nominations) {
  if (!nominations || nominations.length === 0) {
    main.innerHTML = `<div class="alert alert-info text-center">The valid nominations list has not been published yet. Please check back later.</div>`;
    return;
  }
  // Group by post
  const byPost = {};
  nominations.forEach(n => {
    if (!byPost[n.post]) byPost[n.post] = [];
    byPost[n.post].push(n);
  });

  main.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-white">✅ Valid Nominations</h2>
      <p class="text-slate-400 text-sm mt-1">Official list of candidates with valid nominations.</p>
    </div>
    ${Object.entries(byPost).map(([post, noms]) => `
      <div class="glass rounded-xl mb-6 overflow-hidden">
        <div class="px-5 py-3 bg-indigo-500/10 border-b border-white/10">
          <h3 class="font-bold text-indigo-300 text-sm uppercase tracking-wide">${esc(post)}</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr>
              <th>#</th><th>Nomination ID</th><th>Name</th><th>Class</th><th>Dept</th>
            </tr></thead>
            <tbody>
              ${noms.map((n, i) => `<tr>
                <td class="text-slate-500">${i+1}</td>
                <td class="font-mono text-indigo-300 text-xs">${esc(n.id)}</td>
                <td class="font-semibold">${esc(n.candidateName)}</td>
                <td>${esc(n.candidateClass)}</td>
                <td>${esc(n.candidateDept)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}`;
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
