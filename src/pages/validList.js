/**
 * pages/validList.js
 * Public page displaying the published list of valid nominations.
 */
import { api } from '../api.js';
import { router } from '../router.js';
import { esc, comparePosts } from '../utils.js';
import { CONFIG } from '../config.js';
import { exportNominationsToExcel } from '../excelExporter.js';

export async function renderValidList(container) {
  let year = new Date().getFullYear();
  let shortName = CONFIG.COLLEGE_SHORT_NAME;
  let allPosts = [];
  let isPublished = false;
  try {
    const [s, sets, postsData] = await Promise.all([
      api.getPublicSchedule().catch(() => ({})),
      api.getSettings().catch(() => ({})),
      api.getPosts().catch(() => [])
    ]);
    if (s.electionYear) year = s.electionYear;
    if (sets.electionYear) year = sets.electionYear;
    if (sets.collegeShortName) shortName = sets.collegeShortName;
    else if (sets.shortName) shortName = sets.shortName;
    allPosts = postsData || [];
    isPublished = s.isValidListActive === true || s.validListPublished === 'true' || sets.validListPublished === 'true' || s.validListOverride === 'FORCE_OPEN';
  } catch(e) {}

  container.innerHTML = publicLayout('Valid Nominations List', `
    <div class="text-center py-20"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading Valid Nominations...</p></div>
  `, year, shortName);
  container.querySelector('#backToHome').addEventListener('click', () => router.navigate('/'));

  try {
    const data = await api.getValidNominations();
    const list = Array.isArray(data) ? data : [];
    if (!isPublished && list.length === 0) {
      renderPending(container.querySelector('main'));
      return;
    }
    renderList(container.querySelector('main'), list, year, shortName, allPosts);
  } catch (e) {
    if (!isPublished) {
      renderPending(container.querySelector('main'));
    } else {
      renderList(container.querySelector('main'), [], year, shortName, allPosts);
    }
  }
}

function renderPending(main) {
  main.innerHTML = `
    <div class="glass rounded-3xl p-20 text-center border-dashed border-white/10">
      <div class="text-6xl mb-6">📋</div>
      <h2 class="text-2xl font-bold text-white mb-2">List Not Published</h2>
      <p class="text-slate-400 max-w-md mx-auto">The valid nominations list has not been released yet. Please check back later for updates.</p>
    </div>
  `;
}

function renderList(main, nominations, year = '2026', shortName = null, allPosts = []) {
  if ((!nominations || nominations.length === 0) && (!allPosts || allPosts.length === 0)) {
    renderPending(main);
    return;
  }
  
  // Group by post and sort posts (Association Secretaries alphabetically sorted)
  const byPost = {};
  if (Array.isArray(allPosts)) {
    allPosts.forEach(p => {
      const pName = typeof p === 'string' ? p : p.post;
      if (pName && !byPost[pName]) byPost[pName] = [];
    });
  }
  nominations.forEach(n => {
    if (n.post) {
      if (!byPost[n.post]) byPost[n.post] = [];
      byPost[n.post].push(n);
    }
  });

  const sortedPosts = Object.keys(byPost).sort(comparePosts);

  main.innerHTML = `
    <div class="page-enter space-y-10">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-8 gap-4">
        <div>
          <h2 class="text-3xl font-black text-white tracking-tight">Verified Nominations</h2>
          <p class="text-slate-400 mt-2">Official list of all candidates whose nominations have been verified as valid.</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <a href="#/withdraw" class="btn btn-secondary btn-sm flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 font-semibold" title="Submit Candidature Withdrawal">
            <span>↩️</span> Withdraw Candidature
          </a>
          <button id="btnExportValidExcel" class="btn btn-secondary btn-sm flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10" title="Download Valid Nominations in Excel (.xlsx)">
            <span>📊</span> Download Excel
          </button>
        </div>
      </div>
      
      <div class="space-y-12">
        ${sortedPosts.map(post => {
          const noms = byPost[post] || [];
          const hasNoValid = noms.length === 0;

          if (hasNoValid) {
            return `
            <div class="glass rounded-2xl overflow-hidden shadow-2xl border border-rose-500/30 bg-rose-950/10">
              <div class="px-6 py-4 bg-gradient-to-r from-rose-500/15 via-red-950/20 to-slate-900 border-b border-rose-500/20 flex justify-between items-center">
                <h3 class="font-bold text-rose-300 text-sm uppercase tracking-widest">${esc(post)}</h3>
                <span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                  ⚠️ NO VALID NOMINATIONS
                </span>
              </div>
              <div class="p-6 text-center text-slate-400 text-xs space-y-1">
                <p class="font-bold text-rose-200 text-sm tracking-wide">No Valid Nominations</p>
                <p class="text-[11px] text-slate-400">No valid nominations received for this post or all nominations were rejected during scrutiny.</p>
              </div>
            </div>
            `;
          }

          noms.sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));
          return `
          <div class="glass rounded-2xl overflow-hidden shadow-2xl border border-white/5">
            <div class="px-6 py-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border-b border-white/10 flex justify-between items-center">
              <h3 class="font-bold text-indigo-300 text-sm uppercase tracking-widest">${esc(post)}</h3>
              <span class="text-[10px] text-slate-500 font-mono">${noms.length} Candidate${noms.length > 1 ? 's' : ''}</span>
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
                        <div class="font-bold text-white text-base flex items-center gap-2">
                          <span>${esc(n.candidateName)}</span>
                          ${n.candidateSerial ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" title="Electoral Roll Serial Number">Roll Sl. #${esc(n.candidateSerial)}</span>` : ''}
                        </div>
                        <div class="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>${esc(n.candidateClass)}</span>
                          ${n.candidateAdmission ? `<span class="text-slate-500 font-mono">Adm: ${esc(n.candidateAdmission)}</span>` : ''}
                          ${n.id ? `<span class="text-indigo-300 font-mono text-[11px] bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/30" title="Nomination ID">Nom ID: <strong class="font-mono text-indigo-200">${esc(n.id)}</strong></span>` : ''}
                        </div>
                      </td>
                      <td class="text-sm text-slate-400">
                        <div class="flex items-center justify-between gap-2">
                          <span>${esc(n.candidateDept)}</span>
                          ${n.id ? `
                            <a href="#/withdraw?id=${encodeURIComponent(n.id)}" class="btn btn-xs bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[11px] px-2 py-0.5 rounded transition inline-flex items-center gap-1 font-semibold shrink-0" title="Submit Withdrawal of Candidature">
                              <span>↩️</span> Withdraw
                            </a>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
        }).join('')}
      </div>

      <!-- Statutory Bottom Warning for Candidates -->
      <div class="rounded-2xl p-6 border-2 border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-red-950/25 to-slate-900/90 shadow-2xl backdrop-blur-md space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center text-xl shrink-0 shadow-inner">
            ⚠️
          </div>
          <div>
            <h4 class="font-extrabold text-rose-300 text-sm sm:text-base uppercase tracking-wider">
              Statutory Warning / Mandatory Notice to Candidates
            </h4>
            <p class="text-xs text-rose-200/80 font-medium">
              Simultaneous Contesting Prohibition &amp; Automatic Cancellation Clause
            </p>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-black/40 border border-rose-500/20 space-y-2.5 text-xs text-rose-100/90 leading-relaxed">
          <p>
            <strong>Mandatory Rule:</strong> Candidates who have submitted nominations for more than 1 post must withdraw all additional nominations on or before the official withdrawal deadline, so as to contest for only ONE post.
          </p>
          <div class="font-bold text-rose-200 bg-rose-500/15 p-3 rounded-lg border border-rose-500/30 flex items-start gap-2">
            <span class="text-base shrink-0">🚨</span>
            <span>If any candidate fails to withdraw their additional nominations before the stipulated withdrawal deadline, <strong>ALL nominations submitted by that candidate shall automatically get CANCELLED</strong> under the College Union Election Rules and University Statutes, and the candidate will not be permitted to contest for any post.</span>
          </div>
          <p class="text-[11px] text-rose-200/75 pt-2 border-t border-rose-500/20 font-sans">
            <strong>നിയമപരമായ മുന്നറിയിപ്പ്:</strong> ഒന്നിലധികം പോസ്റ്റുകളിലേക്ക് നാമനിർദ്ദേശ പത്രിക സമർപ്പിച്ച സ്ഥാനാർത്ഥികൾ നിശ്ചിത പിൻവലിക്കൽ സമയപരിധിക്ക് മുൻപായി അധിക പത്രികകൾ പിൻവലിക്കേണ്ടതാണ് (ഒരു പോസ്റ്റിലേക്ക് മാത്രമേ മത്സരിക്കാൻ അനുവാദമുള്ളൂ). അല്ലാത്തപക്ഷം പ്രസ്തുത സ്ഥാനാർത്ഥിയുടെ <strong>എല്ലാ നാമനിർദ്ദേശ പത്രികകളും സ്വമേധയാ റദ്ദാക്കപ്പെടുന്നതും (CANCELLED)</strong>, തെരഞ്ഞെടുപ്പിൽ മത്സരിക്കാനുള്ള അർഹത പൂർണ്ണമായും നഷ്ടപ്പെടുന്നതുമാണ്.
          </p>
        </div>
      </div>
    </div>`;

  main.querySelector('#btnExportValidExcel')?.addEventListener('click', () => {
    try {
      exportNominationsToExcel(nominations, 'valid', { year, shortName, posts: allPosts });
    } catch (e) {
      alert(e.message);
    }
  });
}

function publicLayout(title, bodyHtml, yearValue = '2026', shortName = null) {
  const brandShort = shortName || CONFIG.COLLEGE_SHORT_NAME;
  return `
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
          <span class="text-slate-600">|</span>
          <h1 class="font-bold text-white text-sm tracking-tight">${esc(title)}</h1>
        </div>
        <div class="text-[10px] text-slate-500 font-mono hidden sm:block">${esc(brandShort).toUpperCase()} ELECTION PORTAL ${yearValue}</div>
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-12">${bodyHtml}</main>
  </div>`;
}
