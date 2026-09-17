/**
 * pages/admin/results.js
 * Admin page to view aggregated results and print the official result sheet.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast } from '../../utils.js';

export async function renderAdminResults(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'results', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Aggregating results...</p></div>
  `);

  async function loadData(force = false) {
    const main = container.querySelector('#adminMain');
    if (!main) return;
    if (force) {
      api.invalidateCache('adminGetResults');
      api.invalidateCache('getResults');
      api.invalidateCache('adminGetFinalNominations');
      api.invalidateCache('adminGetNominations');
      api.invalidateCache('adminGetSettings');
      api.invalidateCache('getSettings');
      api.invalidateCache('getPosts');
      api.invalidateCache('getPublicSchedule');
    }

    try {
      const [posts, candidatesResp, results, schedule, sets] = await Promise.all([
        api.getPosts(),
        api.adminGetFinalNominations(pwd).catch(async () => {
          const all = await api.adminGetNominations(pwd).catch(() => []);
          return {
            active: all.filter(n => n.status !== 'Rejected' && n.withdrawalStatus !== 'Approved'),
            withdrawn: all.filter(n => n.withdrawalStatus === 'Approved'),
            isPublished: false
          };
        }),
        api.adminGetResults(pwd, force).catch(() => api.getResults(force).catch(() => [])),
        api.getPublicSchedule().catch(() => ({})),
        api.adminGetSettings(pwd).catch(() => ({}))
      ]);
      renderResultsUI(main, pwd, posts, candidatesResp.active || [], results, schedule, sets, candidatesResp.isPublished, loadData);
    } catch (e) {
      main.innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
    }
  }

  await loadData(false);
}

function renderResultsUI(main, pwd, posts, candidates, results, schedule, sets, isFinalPublished = false, reloadData = null) {
  const year = schedule.electionYear || new Date().getFullYear();
  const collegeName = sets.collegeName || 'GOVERNMENT VICTORIA COLLEGE PALAKKAD';
  const shortName = sets.collegeShortName || 'GVC';
  let isLocked = sets.resultsLocked === 'true';
  let isPublic = sets.resultsPublished === 'true';
  let isCountingActive = sets.countingActive === 'true' || schedule.countingActive === 'true';
  
  // 1. Aggregate results
  const agg = {};
  results.forEach(r => {
    if (!agg[r.Post]) agg[r.Post] = {};
    if (!agg[r.Post][r.CandidateId]) agg[r.Post][r.CandidateId] = 0;
    agg[r.Post][r.CandidateId] += Number(r.Votes) || 0;
  });

  // 2. Determine Winners
  const postResults = posts.map(p => {
    const postCandidates = candidates.filter(c => c.post === p.post);
    const postAgg = agg[p.post] || {};
    
    // Check for Unanimous
    if (postCandidates.length === 1) {
      return {
        post: p.post,
        type: 'unanimous',
        winner: postCandidates[0],
        candidates: postCandidates
      };
    }

    if (postCandidates.length === 0) {
      return { post: p.post, type: 'no-candidates' };
    }

    // Normal Election
    const candidatesWithVotes = postCandidates.map(c => ({
      ...c,
      votes: postAgg[c.id] || 0
    }));

    // Sort by votes
    candidatesWithVotes.sort((a, b) => b.votes - a.votes);
    
    const maxVotes = candidatesWithVotes[0].votes;
    const winners = candidatesWithVotes.filter(c => c.votes === maxVotes && c.votes > 0);
    const isTie = winners.length > 1;

    return {
      post: p.post,
      type: 'election',
      candidates: candidatesWithVotes,
      winner: isTie ? null : winners[0],
      isTie,
      totalVotes: Object.values(postAgg).reduce((a, b) => a + b, 0),
      nota: postAgg['NOTA'] || 0,
      invalid: postAgg['INVALID'] || 0
    };
  });

  main.innerHTML = `
    <div class="page-enter space-y-6">
      ${!isFinalPublished ? `
        <div class="alert alert-warning text-xs flex items-center justify-between">
          <span>ℹ️ <strong>Preview Mode:</strong> Final candidate list has not been published yet. Showing active nominations for internal review.</span>
          <button data-nav="/admin/publish" class="btn btn-secondary btn-sm">Publish Lists</button>
        </div>
      ` : ''}

      <!-- Control Panels: Lock/Freeze, Live Counting, and Public Visibility -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 rounded-xl border ${isCountingActive ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-500/10 border-slate-500/30'} flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${isCountingActive ? '🗳️' : '⏳'}</span>
            <div>
              <div class="font-bold text-sm text-white">${isCountingActive ? 'Counting: Active' : 'Counting: Inactive'}</div>
              <div class="text-xs text-slate-400">${isCountingActive ? 'Public sees "Counting in Progress"' : 'Public sees "Counting Not Started"'}</div>
            </div>
          </div>
          <button id="btnToggleCounting" class="btn btn-sm ${isCountingActive ? 'bg-rose-500/80 hover:bg-rose-600 text-white font-bold' : 'bg-amber-500 hover:bg-amber-600 text-black font-bold'}">
            ${isCountingActive ? '⏸️ Stop Counting' : '⚡ Set Counting Active'}
          </button>
        </div>

        <div class="p-4 rounded-xl border ${isLocked ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'} flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${isLocked ? '🔒' : '🔓'}</span>
            <div>
              <div class="font-bold text-sm text-white">${isLocked ? 'Results: Locked & Frozen' : 'Results: Unlocked'}</div>
              <div class="text-xs text-slate-400">${isLocked ? 'Vote entry blocked' : 'Vote entry portal open'}</div>
            </div>
          </div>
          <button id="btnToggleLock" class="btn btn-sm ${isLocked ? 'btn-secondary' : 'bg-amber-500 hover:bg-amber-600 text-black font-bold'}">
            ${isLocked ? '🔓 Unlock' : '🔒 Freeze / Lock'}
          </button>
        </div>

        <div class="p-4 rounded-xl border ${isPublic ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-500/10 border-slate-500/30'} flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${isPublic ? '🌐' : '👁️‍🗨️'}</span>
            <div>
              <div class="font-bold text-sm text-white">${isPublic ? 'Public View: Published' : 'Public View: Hidden'}</div>
              <div class="text-xs text-slate-400">${isPublic ? 'Results visible to public' : 'Only admins see results'}</div>
            </div>
          </div>
          <button id="btnTogglePublic" class="btn btn-sm ${isPublic ? 'bg-rose-500/80 hover:bg-rose-600 text-white font-bold' : 'btn-success font-bold'}">
            ${isPublic ? '👁️‍🗨️ Hide' : '📢 Publish'}
          </button>
        </div>
      </div>

      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10">
        <div>
          <h2 class="text-xl font-bold text-white tracking-tight">Vote Counting Overview</h2>
          <p class="text-slate-400 text-sm">Post-wise breakdown of votes and leading candidates.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button id="btnAdminRefreshResults" class="btn btn-secondary px-5 flex items-center gap-2">
            <span>🔄</span> Refresh Results
          </button>
          <button id="btnPrintOfficial" class="btn btn-primary px-6 flex items-center gap-2">
            <span>🖨️</span> Print Official Result Sheet
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6">
        ${postResults.map(res => {
          const isUUC = res.post.toUpperCase().includes('UUC') || res.post.toUpperCase().includes('UNIVERSITY');
          const seats = isUUC ? 2 : 1;
          
          // Calculate Lead
          let leadThreshold = 0;
          if (res.type === 'election' && res.candidates.length > seats) {
            leadThreshold = res.candidates[seats].votes;
          }

          return `
            <div class="glass rounded-2xl overflow-hidden border border-white/5 page-enter shadow-lg">
              <div class="px-6 py-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                <h4 class="font-bold text-indigo-400 uppercase tracking-wider text-sm">${esc(res.post)}</h4>
                ${res.type === 'unanimous' ? 
                  `<span class="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ELECTED UNANIMOUSLY</span>` : 
                  `<span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">${res.isTie ? '⚖️ TIE DETECTED' : 'CONTESTED ELECTION'}</span>`
                }
              </div>
              <div class="p-6">
                ${res.type === 'no-candidates' ? 
                  `<p class="text-slate-500 italic text-sm text-center py-4">No valid nominations received for this post.</p>` :
                  `
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="text-slate-500 text-[10px] uppercase tracking-widest text-left border-b border-white/5">
                        <th class="pb-3 font-bold">Candidate Name</th>
                        <th class="pb-3 font-bold text-center">Class</th>
                        <th class="pb-3 font-bold text-right">Votes</th>
                        <th class="pb-3 font-bold text-center w-24">Status</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                      ${res.candidates.map((c, i) => {
                        const isLeading = i < seats && c.votes > 0;
                        const lead = isLeading ? (c.votes - leadThreshold) : 0;
                        
                        return `
                          <tr class="${isLeading ? 'bg-white/[0.02]' : ''}">
                            <td class="py-4">
                              <div class="flex items-center gap-2">
                                <span class="font-bold text-white">${esc(c.candidateName)}</span>
                                ${lead > 0 ? `<span class="bg-green-500/20 text-green-400 text-[9px] px-1.5 py-0.5 rounded font-black border border-green-500/30">LEAD: ${lead}</span>` : ''}
                              </div>
                            </td>
                            <td class="py-4 text-slate-400 text-center text-[11px]">${esc(c.candidateClass)}</td>
                            <td class="py-4 text-right font-mono text-lg ${isLeading ? 'text-amber-400' : 'text-slate-300'}">
                              ${res.type === 'unanimous' ? '—' : c.votes}
                            </td>
                            <td class="py-4 text-center">
                              ${isLeading ? 
                                (isLocked ? 
                                  `<span class="text-emerald-400 text-[10px] font-black border border-emerald-400/30 px-2 py-0.5 rounded bg-emerald-500/10 tracking-wider">ELECTED</span>` : 
                                  `<span class="text-amber-400 text-[10px] font-black border border-amber-400/30 px-2 py-0.5 rounded bg-amber-500/10 tracking-wider">LEADING</span>`
                                ) : ''
                              }
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>

                  ${res.type === 'election' ? `
                    <div class="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                      <div class="flex justify-between items-center py-2 px-3 bg-white/5 rounded border border-white/5 text-[11px]">
                        <span class="text-slate-500 uppercase tracking-widest font-bold">NOTA</span>
                        <span class="text-white font-bold">${res.nota}</span>
                      </div>
                      <div class="flex justify-between items-center py-2 px-3 bg-white/5 rounded border border-white/5 text-[11px]">
                        <span class="text-slate-500 uppercase tracking-widest font-bold">Invalid</span>
                        <span class="text-red-400/70 font-bold">${res.invalid}</span>
                      </div>
                      <div class="flex justify-between items-center py-2 px-3 bg-indigo-500/10 rounded border border-indigo-500/20 text-[11px]">
                        <span class="text-indigo-300 uppercase tracking-widest font-bold">Valid Votes</span>
                        <span class="text-white font-black text-sm">${res.totalVotes - res.invalid}</span>
                      </div>
                      <div class="flex justify-between items-center py-2 px-3 bg-purple-500/10 rounded border border-purple-500/20 text-[11px]">
                        <span class="text-purple-300 uppercase tracking-widest font-bold">Grand Total</span>
                        <span class="text-white font-black text-sm">${res.totalVotes}</span>
                      </div>
                    </div>
                  ` : ''}
                  `
                }
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  main.querySelector('#btnPrintOfficial').addEventListener('click', () => {
    const printHtml = `
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; padding: 20px; }
        .official-sheet { max-w: 850px; margin: 0 auto; padding: 40px; border: 1px solid #ddd; background: white; }
        .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
        .header h2 { margin: 5px 0 0 0; font-size: 16px; color: #444; font-weight: 600; }
        .result-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        .result-table th, .result-table td { border: 1px solid #000; padding: 12px 10px; font-size: 13px; }
        .result-table th { background: #f2f2f2; text-align: left; text-transform: uppercase; font-size: 11px; }
        .post-header { background: #f9f9f9; font-weight: bold; font-size: 14px; text-transform: uppercase; color: #000; }
        .winner-row { background: #fafff9 !important; font-weight: bold; }
        .footer { margin-top: 80px; display: flex; justify-content: space-between; align-items: flex-start; }
        .sig-box { width: 250px; border-top: 1px solid #000; text-align: center; padding-top: 8px; font-size: 12px; font-weight: bold; margin-top: 40px; }
        @media print {
          body { padding: 0; }
          .official-sheet { border: none; width: 100%; max-width: 100%; padding: 0; }
          .post-header { background-color: #eee !important; -webkit-print-color-adjust: exact; }
          .winner-row { background-color: #fafff9 !important; -webkit-print-color-adjust: exact; }
        }
      </style>
      <div class="official-sheet">
        <div class="header">
          <h1>College Union Election ${year}</h1>
          <h2>${esc(collegeName)}</h2>
          <div style="font-size: 18px; margin-top: 15px; font-weight: 900; text-decoration: underline;">OFFICIAL RESULT NOTIFICATION</div>
        </div>

        <p style="font-size: 14px; margin-bottom: 25px; text-align: justify;">
          The following candidates are hereby declared to have been duly elected to the respective offices of the College Union for the academic year ${year}, 
          based on the counting of votes held on ${new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'})}.
        </p>

        <table class="result-table">
          <thead>
            <tr>
              <th style="width: 10%; text-align: center;">Sl. No.</th>
              <th style="width: 45%;">Name of Candidate</th>
              <th style="text-align: center; width: 15%;">Votes Secured</th>
              <th style="width: 30%;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${postResults.map(res => {
              if (res.type === 'no-candidates') return '';
              return `
                <tr class="post-header">
                  <td colspan="4" style="background: #eaeaea; padding: 15px 10px; border-bottom: 2px solid #000;">
                    ${esc(res.post)}
                  </td>
                </tr>
                ${res.candidates.map((c, idx) => {
                  const isWinner = res.winner && res.winner.id === c.id;
                  return `
                    <tr class="${isWinner ? 'winner-row' : ''}">
                      <td style="text-align: center; color: #555; font-size: 12px;">${idx + 1}</td>
                      <td style="font-weight: ${isWinner ? 'bold' : 'normal'}; font-size: 14px;">${esc(c.candidateName)}</td>
                      <td style="text-align: center; font-weight: bold; font-size: 14px;">${res.type === 'unanimous' ? '—' : (c.votes || 0)}</td>
                      <td style="font-size: 12px; font-weight: bold;">
                        ${isWinner ? (res.type === 'unanimous' ? 'ELECTED UNANIMOUSLY' : '✓ ELECTED') : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div style="font-size: 13px;">
            <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
            <p><strong>Place:</strong> Palakkad</p>
          </div>
          <div class="sig-box">
            RETURNING OFFICER<br>
            <span style="font-weight: normal; font-size: 11px;">College Union Election ${year}</span>
          </div>
        </div>
      </div>
    `;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      showToast('Popup blocked! Please allow popups to print.', 'error');
      return;
    }
    printWin.document.write(`
      <html>
        <head><title>Election Results ${year}</title></head>
        <body>
          ${printHtml}
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
              }, 500);
            });
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  });

  // ── Admin Refresh Results ──────────────────────────────────────────────────
  const btnAdminRefresh = main.querySelector('#btnAdminRefreshResults');
  if (btnAdminRefresh && reloadData) {
    btnAdminRefresh.onclick = async () => {
      btnAdminRefresh.disabled = true;
      btnAdminRefresh.innerHTML = '<span>⏳</span> Refreshing...';
      try {
        await reloadData(true);
        showToast('Election results refreshed with latest counts.', 'success');
      } catch (err) {
        showToast(`Refresh failed: ${err.message}`, 'error');
        btnAdminRefresh.disabled = false;
        btnAdminRefresh.innerHTML = '<span>🔄</span> Refresh Results';
      }
    };
  }

  // ── Toggle Counting Mode ────────────────────────────────────────────────────
  const btnCounting = main.querySelector('#btnToggleCounting');
  if (btnCounting) {
    btnCounting.onclick = async () => {
      const willActivate = !isCountingActive;
      const msg = willActivate
        ? 'Set Counting Mode Active? Visitors to the public portal will see "Counting in Progress".'
        : 'Set Counting Mode Inactive? Visitors to the public portal will be asked to wait for counting to begin.';
      if (!confirm(msg)) return;

      btnCounting.disabled = true;
      btnCounting.textContent = 'Please wait...';
      try {
        const res = await api.adminToggleCounting(pwd);
        isCountingActive = res.active;
        sets.countingActive = isCountingActive ? 'true' : 'false';
        showToast(isCountingActive ? '⚡ Counting mode active! Public sees "Counting in Progress".' : '⏳ Counting mode inactive. Public asked to wait.', 'success');
        renderResultsUI(main, pwd, posts, candidates, results, schedule, sets, isFinalPublished, reloadData);
      } catch (err) {
        showToast(err.message, 'error');
        btnCounting.disabled = false;
        btnCounting.textContent = isCountingActive ? '⏸️ Stop Counting' : '⚡ Set Counting Active';
      }
    };
  }

  // ── Toggle Lock / Freeze ────────────────────────────────────────────────────
  const btnLock = main.querySelector('#btnToggleLock');
  if (btnLock) {
    btnLock.onclick = async () => {
      const willLock = !isLocked;
      const msg = willLock 
        ? 'Lock and freeze election results? No further vote entries will be allowed.'
        : 'Unlock election results? Vote entries will be re-enabled.';
      if (!confirm(msg)) return;

      btnLock.disabled = true;
      btnLock.textContent = 'Please wait...';
      try {
        const res = await api.adminToggleLockResults(pwd);
        isLocked = res.locked;
        sets.resultsLocked = isLocked ? 'true' : 'false';
        showToast(isLocked ? '🔒 Results locked and frozen.' : '🔓 Results unlocked for editing.', 'success');
        renderResultsUI(main, pwd, posts, candidates, results, schedule, sets, isFinalPublished, reloadData);
      } catch (err) {
        showToast(err.message, 'error');
        btnLock.disabled = false;
        btnLock.textContent = isLocked ? '🔓 Unlock Results' : '🔒 Freeze / Lock';
      }
    };
  }

  // ── Toggle Public Visibility ────────────────────────────────────────────────
  const btnPublic = main.querySelector('#btnTogglePublic');
  if (btnPublic) {
    btnPublic.onclick = async () => {
      const willPublish = !isPublic;
      const msg = willPublish
        ? 'Publish election results to the public portal? Anyone visiting the site will see live results.'
        : 'Hide election results from public view? The public portal will show counting in progress.';
      if (!confirm(msg)) return;

      btnPublic.disabled = true;
      btnPublic.textContent = 'Please wait...';
      try {
        const res = await api.adminTogglePublishResults(pwd);
        isPublic = res.published;
        sets.resultsPublished = isPublic ? 'true' : 'false';
        showToast(isPublic ? '📢 Results published to public portal!' : '👁️‍🗨️ Results hidden from public view.', 'success');
        renderResultsUI(main, pwd, posts, candidates, results, schedule, sets, isFinalPublished, reloadData);
      } catch (err) {
        showToast(err.message, 'error');
        btnPublic.disabled = false;
        btnPublic.textContent = isPublic ? '👁️‍🗨️ Hide Public View' : '📢 Publish to Public';
      }
    };
  }
}
