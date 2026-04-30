/**
 * pages/finalList.js
 * Public page displaying the published final list of candidates.
 */
import { api } from '../api.js';
import { router } from '../router.js';
import { esc } from '../utils.js';

export async function renderFinalList(container) {
  let year = new Date().getFullYear();
  try {
    const s = await api.getPublicSchedule();
    if (s.electionYear) year = s.electionYear;
  } catch(e) {}

  container.innerHTML = publicLayout('Final Candidates List', `
    <div class="text-center py-20"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading Final List...</p></div>
  `, year);
  container.querySelector('#backToHome').addEventListener('click', () => router.navigate('/'));

  try {
    const data = await api.getFinalNominations();
    // getFinalNominations returns { active: [], withdrawn: [] }
    renderList(container.querySelector('main'), data.active || [], year);
  } catch (e) {
    container.querySelector('main').innerHTML = `<div class="alert alert-warning text-center py-10 shadow-xl">${esc(e.message)}</div>`;
  }
}

function renderList(main, nominations, year) {
  if (!nominations || nominations.length === 0) {
    main.innerHTML = `
      <div class="glass rounded-3xl p-20 text-center border-dashed border-white/10">
        <div class="text-6xl mb-6">🏁</div>
        <h2 class="text-2xl font-bold text-white mb-2">Final List Pending</h2>
        <p class="text-slate-400 max-w-md mx-auto">The final candidate list will be published after the withdrawal period and scrutiny. Please check back later.</p>
      </div>
    `;
    return;
  }
  
  // Group by post
  const byPost = {};
  nominations.forEach(n => {
    if (!byPost[n.post]) byPost[n.post] = [];
    byPost[n.post].push(n);
  });

  main.innerHTML = `
    <div class="page-enter space-y-10">
      <div class="text-center md:text-left border-b border-white/5 pb-8">
        <h2 class="text-3xl font-black text-white tracking-tight">Final Candidate List ${year}</h2>
        <p class="text-slate-400 mt-2">Official approved list of candidates for the College Union Election ${year}.</p>
      </div>
      
      <div class="space-y-12">
        ${Object.entries(byPost).map(([post, noms]) => `
          <div class="glass rounded-2xl overflow-hidden shadow-2xl border border-white/5">
            <div class="px-6 py-4 bg-gradient-to-r from-emerald-500/10 to-indigo-500/5 border-b border-white/10 flex justify-between items-center">
              <h3 class="font-bold text-emerald-400 text-sm uppercase tracking-widest">${esc(post)}</h3>
              <span class="text-[10px] text-slate-500 font-mono">${noms.length} Approved</span>
            </div>
            <div class="overflow-x-auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="w-16">#</th>
                    <th>Candidate Details</th>
                    <th>Department</th>
                  </tr>
                </thead>
                <tbody>
                  ${noms.map((n, i) => `
                    <tr class="hover:bg-white/[0.02] transition-colors">
                      <td class="text-slate-600 font-mono text-xs text-center">${i + 1}</td>
                      <td>
                        <div class="font-bold text-white text-base">${esc(n.candidateName)}</div>
                        <div class="text-xs text-slate-500 mt-0.5">${esc(n.candidateClass)}</div>
                      </td>
                      <td class="text-sm text-slate-400">${esc(n.candidateDept)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function publicLayout(title, bodyHtml, yearValue = '2026') {
  return `
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
          <span class="text-slate-600">|</span>
          <h1 class="font-bold text-white text-sm tracking-tight">${esc(title)}</h1>
        </div>
        <div class="text-[10px] text-slate-500 font-mono hidden sm:block">GVC ELECTION PORTAL ${yearValue}</div>
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-12">${bodyHtml}</main>
  </div>`;
}
