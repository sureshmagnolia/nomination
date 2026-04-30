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

  try {
    const [posts, nominations, results, schedule] = await Promise.all([
      api.getPosts(),
      api.getFinalNominations(),
      api.getResults().catch(() => []),
      api.getPublicSchedule().catch(() => ({}))
    ]);
    renderResultsUI(container.querySelector('#adminMain'), pwd, posts, nominations.active || [], results, schedule);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderResultsUI(main, pwd, posts, candidates, results, schedule) {
  const year = schedule.electionYear || new Date().getFullYear();
  
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
      <div class="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10">
        <div>
          <h3 class="text-2xl font-bold text-white">Election Results Summary</h3>
          <p class="text-slate-400 text-sm">Post-wise breakdown of votes and winning candidates.</p>
        </div>
        <button id="btnPrintOfficial" class="btn btn-primary px-8 flex items-center gap-2">
          <span>🖨️</span> Print Official Result Sheet
        </button>
      </div>

      <div class="grid grid-cols-1 gap-6">
        ${postResults.map(res => `
          <div class="glass rounded-2xl overflow-hidden border border-white/5">
            <div class="px-6 py-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <h4 class="font-bold text-indigo-400 uppercase tracking-wider text-sm">${esc(res.post)}</h4>
              ${res.type === 'unanimous' ? 
                `<span class="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">UNANIMOUS</span>` : 
                `<span class="text-xs text-slate-500">${res.type === 'election' ? res.totalVotes + ' total votes' : 'No contestants'}</span>`
              }
            </div>
            <div class="p-6">
              ${res.type === 'no-candidates' ? 
                `<p class="text-slate-500 italic text-sm text-center">No valid nominations received for this post.</p>` :
                `
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-slate-500 text-xs text-left border-b border-white/5">
                      <th class="pb-2 font-medium">Candidate Name</th>
                      <th class="pb-2 font-medium text-center">Class</th>
                      <th class="pb-2 font-medium text-right">Votes</th>
                      <th class="pb-2 font-medium text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/5">
                    ${res.candidates.map(c => {
                      const isWinner = res.winner && res.winner.id === c.id;
                      return `
                        <tr>
                          <td class="py-3 font-bold text-white">${esc(c.candidateName)}</td>
                          <td class="py-3 text-slate-400 text-center text-xs">${esc(c.candidateClass)}</td>
                          <td class="py-3 text-right font-mono text-lg ${isWinner ? 'text-emerald-400' : 'text-slate-300'}">
                            ${res.type === 'unanimous' ? '—' : c.votes}
                          </td>
                          <td class="py-3 text-center">
                            ${isWinner ? 
                              `<span class="text-emerald-400 text-[10px] font-black border border-emerald-400/30 px-2 py-0.5 rounded">WON</span>` : 
                              ''
                            }
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
                `
              }
            </div>
          </div>
        `).join('')}
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
          <h2>GOVERNMENT VICTORIA COLLEGE PALAKKAD</h2>
          <div style="font-size: 18px; margin-top: 15px; font-weight: 900; text-decoration: underline;">OFFICIAL RESULT NOTIFICATION</div>
        </div>

        <p style="font-size: 14px; margin-bottom: 25px; text-align: justify;">
          The following candidates are hereby declared to have been duly elected to the respective offices of the College Union for the academic year ${year}, 
          based on the counting of votes held on ${new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'})}.
        </p>

        <table class="result-table">
          <thead>
            <tr>
              <th style="width: 35%;">Office / Post</th>
              <th style="width: 35%;">Name of Candidate</th>
              <th style="text-align: center; width: 10%;">Votes</th>
              <th style="width: 20%;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${postResults.map(res => {
              if (res.type === 'no-candidates') return '';
              return `
                <tr class="post-header">
                  <td colspan="4" style="background: #eee;">${esc(res.post)}</td>
                </tr>
                ${res.candidates.map(c => {
                  const isWinner = res.winner && res.winner.id === c.id;
                  return `
                    <tr class="${isWinner ? 'winner-row' : ''}">
                      <td style="padding-left: 20px; color: #555; font-size: 11px;">${esc(res.post)}</td>
                      <td>${esc(c.candidateName)}</td>
                      <td style="text-align: center;">${res.type === 'unanimous' ? '—' : (c.votes || 0)}</td>
                      <td style="font-size: 11px;">${isWinner ? (res.type === 'unanimous' ? 'Elected Unanimously' : 'WON BY HIGHEST VOTE') : ''}</td>
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
                window.close();
              }, 500);
            });
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  });
}
