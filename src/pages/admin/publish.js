/**
 * pages/admin/publish.js
 * Admin page for publishing and printing all official election lists:
 *   1. Nominal Roll (Draft & Finalized Voter Lists)
 *   2. Valid Nominations List (Pre-withdrawal Verified Candidates)
 *   3. Final Candidates List (Post-withdrawal Approved & Uncontested)
 *   4. Election Results Declaration & Freezing
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { openPrintRollModal } from '../../rollPrinter.js';

export async function renderAdminPublish(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'publish', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading election lists & settings...</p></div>
  `);

  await reloadPublishData(container.querySelector('#adminMain'), pwd);
}

async function reloadPublishData(main, pwd) {
  if (!main) return;
  main.innerHTML = `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading election lists & settings...</p></div>
  `;

  try {
    const [settings, nominations, postsData, nominalRoll, resultsPayload] = await Promise.all([
      api.adminGetSettings(pwd),
      api.adminGetNominations(pwd).catch(() => []),
      api.getPosts().catch(() => []),
      api.getNominalRoll().catch(() => []),
      api.adminGetResults(pwd).catch(() => ({ results: [] }))
    ]);
    renderPublishPage(main, settings, nominations, postsData, nominalRoll, resultsPayload?.results || [], pwd);
  } catch (e) {
    main.innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderPublishPage(main, settings, nominations, postsData, nominalRoll, results, pwd) {
  const isRollFinal = settings.nominalRollFinalized === 'true' || settings.isRollFinalized === 'true';
  const isDraftRoll = !isRollFinal && settings.draftRollPublished === 'true';
  const isRollUnpublished = !isRollFinal && !isDraftRoll;
  const validPublished = settings.validListPublished === 'true';
  const finalPublished = settings.finalListPublished === 'true';
  const resultsPublished = settings.resultsPublished === 'true';
  const resultsLocked = settings.resultsLocked === 'true';
  const isCountingActive = settings.countingActive === 'true';

  const year = settings.electionYear || new Date().getFullYear();
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;
  const collegeLogo = settings.collegeLogo || '';

  // Filter nominations
  const validList = nominations.filter(n => n.status === 'Valid');
  const finalList = nominations.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');
  const withdrawnList = nominations.filter(n => n.status === 'Valid' && n.withdrawalStatus === 'Approved');

  // Count posts with candidates
  const validPostsCount = new Set(validList.map(n => n.post)).size;
  const finalPostsCount = new Set(finalList.map(n => n.post)).size;

  // Count uncontested / unanimous candidates in final list
  const postCounts = {};
  finalList.forEach(n => { postCounts[n.post] = (postCounts[n.post] || 0) + 1; });
  const uncontestedPosts = Object.keys(postCounts).filter(p => postCounts[p] === 1);

  main.innerHTML = `
    <div class="page-enter space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 class="text-xl font-bold text-white">Publish & Print Lists</h3>
          <p class="text-slate-400 text-sm">Control public visibility, audit election pipeline stages, and generate official signed documents.</p>
        </div>
        <button id="btnRefreshPublish" class="btn btn-secondary btn-sm flex items-center gap-2 shrink-0">
          <span>🔄</span> Refresh State
        </button>
      </div>

      <!-- Election Pipeline Overview Bar -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="glass rounded-xl p-3 border ${isRollFinal ? 'border-emerald-500/30 bg-emerald-500/10' : (isDraftRoll ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/10 bg-white/5')}">
          <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">1. Nominal Roll</div>
          <div class="text-white font-bold text-sm mt-0.5">${nominalRoll.length} Voters</div>
          <div class="text-xs font-semibold ${isRollFinal ? 'text-emerald-400' : (isDraftRoll ? 'text-amber-400' : 'text-slate-400')}">
            ${isRollFinal ? '🔒 Finalized' : (isDraftRoll ? '📋 Draft Live' : '⏳ Unpublished')}
          </div>
        </div>

        <div class="glass rounded-xl p-3 border ${validPublished ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'}">
          <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">2. Valid List</div>
          <div class="text-white font-bold text-sm mt-0.5">${validList.length} Candidates</div>
          <div class="text-xs font-semibold ${validPublished ? 'text-emerald-400' : 'text-slate-400'}">
            ${validPublished ? '✅ Published' : '⏳ Pending'}
          </div>
        </div>

        <div class="glass rounded-xl p-3 border ${finalPublished ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'}">
          <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">3. Final List</div>
          <div class="text-white font-bold text-sm mt-0.5">${finalList.length} Approved</div>
          <div class="text-xs font-semibold ${finalPublished ? 'text-emerald-400' : 'text-slate-400'}">
            ${finalPublished ? '✅ Published' : '⏳ Pending'}
          </div>
        </div>

        <div class="glass rounded-xl p-3 border ${resultsPublished ? 'border-emerald-500/30 bg-emerald-500/10' : (isCountingActive ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/10 bg-white/5')}">
          <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">4. Results</div>
          <div class="text-white font-bold text-sm mt-0.5">${resultsLocked ? '🔒 Frozen' : (isCountingActive ? '🗳️ Counting' : '🔓 Live Entry')}</div>
          <div class="text-xs font-semibold ${resultsPublished ? 'text-emerald-400' : (isCountingActive ? 'text-amber-400' : 'text-slate-400')}">
            ${resultsPublished ? '📢 Publicly Live' : (isCountingActive ? '⚡ Counting Active' : '👁️‍🗨️ Hidden')}
          </div>
        </div>
      </div>

      <!-- 1. Nominal Roll publish & print -->
      <div class="glass rounded-xl p-6 space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-white text-base">📜 Nominal Roll (Voter List) Stages</h4>
              <span class="badge ${isRollFinal ? 'badge-valid' : (isDraftRoll ? 'badge-pending' : 'bg-slate-700 text-slate-300')} text-xs">
                ${isRollFinal ? '🔒 Finalized (1, 2, 3...)' : (isDraftRoll ? '📋 Draft Published (D1, D2...)' : '⏳ Unpublished')}
              </span>
            </div>
            <p class="text-slate-400 text-xs mt-1">
              Registered Voters: <strong class="text-white">${nominalRoll.length} students</strong>. 
              ${isRollFinal ? 'Official finalized numbers (1, 2, 3...) are active.' : (isDraftRoll ? 'Draft list (D1, D2...) is open for student correction requests.' : 'The voter list is currently hidden from public visitors.')}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button id="btnPrintNominalRoll" class="btn btn-secondary btn-sm flex items-center gap-1.5" ${nominalRoll.length === 0 ? 'disabled' : ''}>
              <span>🖨️</span> Print Roll
            </button>
            <button data-nav="/admin/nominal-roll" class="btn btn-secondary btn-sm">👥 Manage Roll</button>
          </div>
        </div>

        ${isRollUnpublished ? `
        <div class="alert alert-warning text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span>ℹ️ The Nominal Roll is currently <strong>Unpublished</strong> (hidden from students). Publish the Draft Roll so students can verify their details and submit corrections.</span>
          </div>
          <button id="publishDraftRollBtn" class="btn btn-primary bg-amber-600 hover:bg-amber-500 text-white shrink-0">📢 Publish Draft Roll</button>
        </div>
        ` : ''}

        ${isDraftRoll ? `
        <div class="alert alert-success text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span>📋 <strong>Draft Roll is currently live to students</strong> with <strong>D1, D2...</strong> provisional Sl. numbers. Correction requests can be submitted.</span>
          <div class="flex gap-2 shrink-0">
            <button id="unpublishDraftRollBtn" class="btn btn-sm" style="background:#dc2626;color:white;border:none;">🚫 Unpublish Draft</button>
            <button data-nav="/admin/nominal-roll" class="btn btn-sm btn-primary">🔒 Finalize in Roll Management</button>
          </div>
        </div>
        ` : ''}

        ${isRollFinal ? `
        <div class="alert alert-success text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span>✅ <strong>Nominal Roll is Finalized & Locked.</strong> Serial numbers are standard <strong>1, 2, 3...</strong> and nominations are locked to official serials.</span>
          <button data-nav="/admin/nominal-roll" class="btn btn-sm bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30 shrink-0">🔓 Unfinalize</button>
        </div>
        ` : ''}
      </div>

      <!-- 2. Valid list publish & print -->
      <div class="glass rounded-xl p-6 space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-white text-base">📋 Valid Nominations List</h4>
              <span class="badge ${validPublished ? 'badge-valid' : 'badge-pending'} text-xs">
                ${validPublished ? '✅ Published' : '⏳ Not Published'}
              </span>
            </div>
            <p class="text-slate-400 text-xs mt-1">
              Verified Candidates: <strong class="text-white">${validList.length} candidates</strong> across <strong class="text-white">${validPostsCount} posts</strong>.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button id="btnPrintValid" class="btn btn-secondary btn-sm flex items-center gap-1.5" ${validList.length === 0 ? 'disabled' : ''}>
              <span>🖨️</span> Print Valid List
            </button>
            <button data-nav="/admin/verify" class="btn btn-secondary btn-sm">✅ Review Nominations</button>
          </div>
        </div>

        ${!validPublished ? `
        <div class="alert alert-warning text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span>⚠️ Ensure all received nomination papers have been verified by the Returning Officer before publishing.</span>
          <button id="publishValidBtn" class="btn btn-primary shrink-0" ${validList.length === 0 ? 'disabled title="No valid candidates to publish"' : ''}>
            📢 Publish Valid Nominations List
          </button>
        </div>` : `
        <div class="alert alert-success text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span>✅ This list is currently visible to students on the public portal (<code>#/valid-list</code>).</span>
          <button id="unpublishValidBtn" class="btn btn-sm shrink-0" style="background:#dc2626;color:white;border:none;">🚫 Unpublish Valid List</button>
        </div>`}
      </div>

      <!-- 3. Final list publish & print -->
      <div class="glass rounded-xl p-6 space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-white text-base">🏁 Final Nominations List</h4>
              <span class="badge ${finalPublished ? 'badge-valid' : 'badge-pending'} text-xs">
                ${finalPublished ? '✅ Published' : '⏳ Not Published'}
              </span>
            </div>
            <p class="text-slate-400 text-xs mt-1">
              Approved Contesting: <strong class="text-white">${finalList.length} candidates</strong> across <strong class="text-white">${finalPostsCount} posts</strong> 
              (${withdrawnList.length} Withdrawn${uncontestedPosts.length > 0 ? `, <span class="text-emerald-400 font-bold">${uncontestedPosts.length} Uncontested/Unanimous</span>` : ''}).
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button id="btnPrintFinal" class="btn btn-secondary btn-sm flex items-center gap-1.5" ${finalList.length === 0 ? 'disabled' : ''}>
              <span>🖨️</span> Print Final List
            </button>
            <button data-nav="/admin/withdrawals" class="btn btn-secondary btn-sm">↩️ Withdrawals</button>
          </div>
        </div>

        ${!finalPublished ? `
        <div class="alert alert-warning text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span>⚠️ Publish after the withdrawal scrutiny deadline has passed. Uncontested candidates will be flagged as elected unanimously.</span>
          <button id="publishFinalBtn" class="btn btn-primary shrink-0" ${!validPublished ? 'disabled title="Publish the valid list first"' : ''}>
            📢 Publish Final Nominations List
          </button>
        </div>` : `
        <div class="alert alert-success text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span>✅ The final candidate list is currently visible to students on the public portal (<code>#/final-list</code>).</span>
          <button id="unpublishFinalBtn" class="btn btn-sm shrink-0" style="background:#dc2626;color:white;border:none;">🚫 Unpublish Final List</button>
        </div>`}
      </div>

      <!-- 4. Election Results publish, freeze & print -->
      <div class="glass rounded-xl p-6 space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-white text-base">📊 Election Results Visibility & Official Declaration</h4>
              <span class="badge ${resultsPublished ? 'badge-valid' : 'badge-pending'} text-xs">
                ${resultsPublished ? '📢 Publicly Live' : '👁️‍🗨️ Hidden from Public'}
              </span>
              <span class="badge ${isCountingActive ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-700 text-slate-300'} text-xs">
                ${isCountingActive ? '⚡ Counting in Progress' : '⏳ Counting Inactive'}
              </span>
              ${resultsLocked ? `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">🔒 Locked & Frozen</span>` : ''}
            </div>
            <p class="text-slate-400 text-xs mt-1">
              Control live counting status, public results visibility, and lock vote tallies against modification.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button id="btnPrintResults" class="btn btn-primary btn-sm flex items-center gap-1.5">
              <span>🖨️</span> Print Official Result Sheet
            </button>
            <button data-nav="/admin/results" class="btn btn-secondary btn-sm">🏆 View Results</button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-2">
          <button id="toggleCountingBtn" class="btn ${isCountingActive ? 'btn-danger' : 'bg-amber-500 hover:bg-amber-600 text-black font-bold'} btn-sm">
            ${isCountingActive ? '⏸️ Stop Counting Mode' : '⚡ Set Counting Active'}
          </button>
          <button id="toggleResultsPublishBtn" class="btn ${resultsPublished ? 'btn-danger' : 'btn-primary'} btn-sm">
            ${resultsPublished ? '🚫 Hide Results from Public' : '📢 Publish Results to Public'}
          </button>
          <button id="toggleResultsLockBtn" class="btn ${resultsLocked ? 'btn-secondary' : 'bg-amber-500 hover:bg-amber-600 text-black font-bold'} btn-sm">
            ${resultsLocked ? '🔓 Unlock Results' : '🔒 Freeze / Lock Results'}
          </button>
        </div>
      </div>
    </div>`;

  // ── Print Nominal Roll Modal ───────────────────────────────────────────────
  main.querySelector('#btnPrintNominalRoll')?.addEventListener('click', () => {
    if (nominalRoll.length === 0) {
      showToast('Nominal Roll is empty. Add students before printing.', 'error');
      return;
    }
    openPrintRollModal({
      students: nominalRoll,
      isFinal: isRollFinal,
      isDraft: isDraftRoll,
      collegeName,
      collegeLogo,
      electionYear: year
    });
  });

  // ── Print Valid & Final Lists ─────────────────────────────────────────────
  const printNominationList = (type) => {
    const isFinal = type === 'final';
    const list = isFinal ? finalList : validList;
    
    if (list.length === 0) {
      alert(isFinal ? 'No approved contesting candidates found to print.' : 'No valid nominations found to print.');
      return;
    }

    // Group by post
    const grouped = {};
    list.forEach(n => {
      if (!grouped[n.post]) grouped[n.post] = [];
      grouped[n.post].push(n);
    });

    // Use official post order from postsData
    const orderedPostNames = postsData.map(p => p.post || p.name).filter(name => grouped[name]);
    // Add any remaining posts not in postsData
    Object.keys(grouped).forEach(name => {
      if (!orderedPostNames.includes(name)) orderedPostNames.push(name);
    });

    // Sort candidates alphabetically within each post
    orderedPostNames.forEach(post => {
      if (grouped[post]) {
        grouped[post].sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));
      }
    });

    let html = `
      <div style="text-align:center;margin-bottom:25px;border-bottom:2px solid #000;padding-bottom:12px">
        ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:55px;max-width:140px;margin:0 auto 6px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
        <div style="font-size:13px;font-weight:600;color:#333;text-transform:uppercase;letter-spacing:0.5px">${esc(collegeName)}</div>
        <h1 style="margin:4px 0;font-size:20px;text-transform:uppercase;font-weight:800;letter-spacing:0.5px">College Union Election ${esc(year)}</h1>
        <h2 style="margin:4px 0 0 0;font-size:15px;color:#111;text-transform:uppercase;font-weight:700">
          ${isFinal ? 'FINAL LIST OF ELIGIBLE CONTESTING CANDIDATES' : 'LIST OF VALID NOMINATIONS'}
        </h2>
      </div>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px">
        <thead>
          <tr style="background:#f0f0f0">
            <th style="border:1px solid #000;padding:6px;text-align:center;width:40px">#</th>
            <th style="border:1px solid #000;padding:6px 8px;text-align:left">Candidate Name</th>
            <th style="border:1px solid #000;padding:6px 8px;text-align:center;width:80px">Roll Sl. No</th>
            <th style="border:1px solid #000;padding:6px 8px;text-align:center;width:90px">Adm. No</th>
            <th style="border:1px solid #000;padding:6px 8px;text-align:left">Class</th>
            <th style="border:1px solid #000;padding:6px 8px;text-align:left">Department</th>
            ${isFinal ? '<th style="border:1px solid #000;padding:6px 8px;text-align:center;width:140px">Remarks</th>' : ''}
          </tr>
        </thead>
        <tbody>
    `;

    orderedPostNames.forEach(post => {
      const noms = grouped[post];
      const isUncontested = isFinal && noms.length === 1;

      html += `
        <tr>
          <td colspan="${isFinal ? '7' : '6'}" style="border:1px solid #000;padding:8px;background:#f3f4f6;font-weight:bold;text-transform:uppercase;font-size:13px">
            POST: ${esc(post)}
            <span style="font-size:11px;font-weight:normal;float:right">
              ${noms.length} Candidate${noms.length > 1 ? 's' : ''} ${isUncontested ? '— (UNCONTESTED)' : ''}
            </span>
          </td>
        </tr>
      `;

      noms.forEach((n, idx) => {
        const sl  = n.candidateSerial || n.candidate?.['Nominal Roll Serial Number'] || n.candidate?.serial_number || '–';
        const adm = n.candidate?.['ADMISION NO'] || n.candidateAdmission || n.candidate?.admission_no || '–';
        html += `
          <tr>
            <td style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold">${idx + 1}</td>
            <td style="border:1px solid #000;padding:6px 8px;font-weight:bold">${esc(n.candidateName)}</td>
            <td style="border:1px solid #000;padding:6px 8px;text-align:center;font-family:monospace;font-weight:bold">${esc(sl)}</td>
            <td style="border:1px solid #000;padding:6px 8px;text-align:center;font-family:monospace">${esc(adm)}</td>
            <td style="border:1px solid #000;padding:6px 8px">${esc(n.candidateClass)}</td>
            <td style="border:1px solid #000;padding:6px 8px">${esc(n.candidateDept)}</td>
            ${isFinal ? `
              <td style="border:1px solid #000;padding:6px 8px;text-align:center;font-weight:bold;font-size:11px">
                ${isUncontested ? '<span style="color:#047857">ELECTED UNOPPOSED</span>' : '<span style="color:#1d4ed8">CONTESTING</span>'}
              </td>
            ` : ''}
          </tr>
        `;
      });
    });

    html += `
        </tbody>
      </table>
      <div style="margin-top:50px;display:flex;justify-content:space-between;align-items:flex-end">
        <div style="font-size:11px;color:#555">
          <div><strong>Date of Publication:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div><strong>Place:</strong> Palakkad</div>
        </div>
        <div style="text-align:center;width:220px">
          <div style="border-top:1px solid #000;padding-top:6px;font-weight:bold;font-size:12px">RETURNING OFFICER</div>
          <div style="font-size:10px;color:#555">Signature & Official Seal</div>
        </div>
      </div>
    `;

    const w = window.open('', '_blank');
    if (!w) {
      showToast('Popup blocked! Please allow popups to print.', 'error');
      return;
    }
    w.document.write(`<!DOCTYPE html><html><head><title>${isFinal ? 'Final List' : 'Valid List'} - ${esc(shortName)} Election ${esc(year)}</title><style>
      @page{size:A4;margin:15mm}
      body{font-family:Arial,sans-serif;line-height:1.4;margin:0;padding:10px;}
    </style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);
    w.document.close();
  };

  main.querySelector('#btnPrintValid')?.addEventListener('click', () => printNominationList('valid'));
  main.querySelector('#btnPrintFinal')?.addEventListener('click', () => printNominationList('final'));

  // ── Print Official Result Sheet ───────────────────────────────────────────
  main.querySelector('#btnPrintResults')?.addEventListener('click', () => {
    // Aggregate results
    const agg = {};
    (results || []).forEach(r => {
      const p = r.Post || r.post;
      const c = r.CandidateId || r.candidateId;
      if (!agg[p]) agg[p] = {};
      if (!agg[p][c]) agg[p][c] = 0;
      agg[p][c] += Number(r.Votes || r.votes) || 0;
    });

    const postResults = postsData.map(p => {
      const postName = p.post || p.name;
      const postCandidates = finalList.filter(c => c.post === postName);
      if (postCandidates.length === 0) return { post: postName, type: 'no-candidates', candidates: [] };
      if (postCandidates.length === 1) {
        return {
          post: postName,
          type: 'unanimous',
          candidates: postCandidates,
          winner: postCandidates[0]
        };
      }
      const postAgg = agg[postName] || {};
      const withVotes = postCandidates.map(c => ({
        ...c,
        votes: postAgg[c.id] || 0
      })).sort((a, b) => b.votes - a.votes);

      const isUUC = postName.toUpperCase().includes('UUC') || postName.toUpperCase().includes('UNIVERSITY');
      const seats = isUUC ? 2 : 1;
      const winners = withVotes.slice(0, seats);

      return {
        post: postName,
        type: 'election',
        candidates: withVotes,
        winners,
        totalVotes: Object.values(postAgg).reduce((a, b) => a + b, 0)
      };
    });

    const printHtml = `
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #222; line-height: 1.5; padding: 15px; }
        .official-sheet { max-width: 850px; margin: 0 auto; padding: 25px; border: 1px solid #ddd; background: white; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
        .header h2 { margin: 4px 0 0 0; font-size: 14px; color: #333; font-weight: 600; text-transform: uppercase; }
        .result-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
        .result-table th, .result-table td { border: 1px solid #000; padding: 8px 10px; }
        .result-table th { background: #f2f2f2; text-align: left; text-transform: uppercase; font-size: 11px; }
        .post-header { background: #f9f9f9; font-weight: bold; font-size: 13px; text-transform: uppercase; }
        .winner-row { background: #f0fdf4 !important; font-weight: bold; }
        .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
        .sig-box { width: 220px; border-top: 1px solid #000; text-align: center; padding-top: 6px; font-size: 12px; font-weight: bold; }
        @media print {
          body { padding: 0; }
          .official-sheet { border: none; width: 100%; max-width: 100%; padding: 0; }
          .post-header { background-color: #eee !important; -webkit-print-color-adjust: exact; }
          .winner-row { background-color: #f0fdf4 !important; -webkit-print-color-adjust: exact; }
        }
      </style>
      <div class="official-sheet">
        <div class="header">
          ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:60px;max-width:140px;margin:0 auto 8px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
          <h2>${esc(collegeName)}</h2>
          <h1>College Union Election ${esc(year)}</h1>
          <div style="font-size: 16px; margin-top: 12px; font-weight: 900; text-decoration: underline;">OFFICIAL RESULT DECLARATION NOTIFICATION</div>
        </div>

        <p style="font-size: 13px; margin-bottom: 20px; text-align: justify;">
          The following candidates are hereby declared to have been duly elected to the respective offices of the College Union for the academic year ${esc(year)}, 
          based on the scrutiny, uncontested nominations, and counting of votes held on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>

        <table class="result-table">
          <thead>
            <tr>
              <th style="width: 8%; text-align: center;">#</th>
              <th style="width: 42%;">Name of Candidate</th>
              <th style="width: 25%;">Class / Department</th>
              <th style="text-align: center; width: 10%;">Votes</th>
              <th style="width: 15%; text-align: center;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${postResults.map(res => {
              if (res.type === 'no-candidates') return '';
              return `
                <tr class="post-header">
                  <td colspan="5" style="background: #eaeaea; padding: 10px 8px; border-bottom: 2px solid #000;">
                    POST: ${esc(res.post)}
                  </td>
                </tr>
                ${res.candidates.map((c, idx) => {
                  const isWinner = res.type === 'unanimous' || (res.winners && res.winners.some(w => w.id === c.id));
                  return `
                    <tr class="${isWinner ? 'winner-row' : ''}">
                      <td style="text-align: center; font-size: 11px;">${idx + 1}</td>
                      <td style="font-weight: ${isWinner ? 'bold' : 'normal'};">${esc(c.candidateName)} ${c.candidateSerial ? `<span style="font-size: 10px; font-weight: normal; color: #555;">(Roll Sl. #${esc(c.candidateSerial)})</span>` : ''}</td>
                      <td style="color: #444;">${esc(c.candidateClass)}</td>
                      <td style="text-align: center; font-weight: bold;">${res.type === 'unanimous' ? '—' : (c.votes || 0)}</td>
                      <td style="font-size: 11px; font-weight: bold; text-align: center; color: ${isWinner ? '#047857' : '#555'};">
                        ${isWinner ? (res.type === 'unanimous' ? 'ELECTED UNOPPOSED' : '✓ ELECTED') : 'CONTESTING'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div style="font-size: 11px; color: #444;">
            <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p><strong>Place:</strong> Palakkad</p>
          </div>
          <div class="sig-box">
            RETURNING OFFICER<br>
            <span style="font-weight: normal; font-size: 10px;">College Union Election ${esc(year)}</span>
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
      <!DOCTYPE html>
      <html>
        <head><title>Official Results Declaration - ${esc(shortName)} Election ${esc(year)}</title></head>
        <body>
          ${printHtml}
          <script>window.addEventListener('load', () => setTimeout(() => window.print(), 500));<\/script>
        </body>
      </html>
    `);
    printWin.document.close();
  });

  // ── Action Event Listeners ────────────────────────────────────────────────
  main.querySelector('#btnRefreshPublish')?.addEventListener('click', () => reloadPublishData(main, pwd));

  // Publish / Unpublish Draft Nominal Roll
  main.querySelector('#publishDraftRollBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    setLoading(btn, true, 'Publishing Draft...');
    try {
      await api.adminPublishDraftRoll(pwd);
      showToast('Draft Nominal Roll published! Serial numbers are set to D1, D2...', 'success');
      await reloadPublishData(main, pwd);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      setLoading(btn, false, '📢 Publish Draft Roll');
    }
  });

  main.querySelector('#unpublishDraftRollBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!confirm('Unpublish the Draft Nominal Roll? Students will no longer be able to view it.')) return;
    setLoading(btn, true, 'Unpublishing...');
    try {
      await api.adminUnpublishDraftRoll(pwd);
      showToast('Draft Nominal Roll unpublished.', 'success');
      await reloadPublishData(main, pwd);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      setLoading(btn, false, '🚫 Unpublish Draft');
    }
  });

  // Publish / Unpublish Valid List
  main.querySelector('#publishValidBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!confirm('Are you sure you want to publish the valid nominations list? This will be visible to all students.')) return;
    setLoading(btn, true, 'Publishing...');
    try {
      await api.adminPublishValidList(pwd);
      showToast('Valid nominations list published successfully!', 'success');
      await reloadPublishData(main, pwd);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      setLoading(btn, false, '📢 Publish Valid Nominations List');
    }
  });

  main.querySelector('#unpublishValidBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!confirm('Unpublish Valid List?\n\nThis will remove it from public view. The Final List will also be unpublished.')) return;
    setLoading(btn, true, 'Unpublishing...');
    try {
      await api.adminUnpublishValidList(pwd);
      showToast('Valid list unpublished.', 'success');
      await reloadPublishData(main, pwd);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      setLoading(btn, false, '🚫 Unpublish Valid List');
    }
  });

  // Publish / Unpublish Final List
  main.querySelector('#publishFinalBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!confirm('Are you sure you want to publish the final nominations list?')) return;
    setLoading(btn, true, 'Publishing...');
    try {
      await api.adminPublishFinalList(pwd);
      showToast('Final nominations list published successfully!', 'success');
      await reloadPublishData(main, pwd);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      setLoading(btn, false, '📢 Publish Final Nominations List');
    }
  });

  main.querySelector('#unpublishFinalBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!confirm('Unpublish Final List?\n\nThis will remove the final candidate list from public view.')) return;
    setLoading(btn, true, 'Unpublishing...');
    try {
      await api.adminUnpublishFinalList(pwd);
      showToast('Final list unpublished.', 'success');
      await reloadPublishData(main, pwd);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      setLoading(btn, false, '🚫 Unpublish Final List');
    }
  });

  // Toggle Results Public Visibility
  main.querySelector('#toggleResultsPublishBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const isPub = resultsPublished;
    const msg = isPub 
      ? 'Hide election results from public view? Public visitors will see counting in progress.'
      : 'Publish election results to the public portal? Results will be immediately visible to all visitors.';
    if (!confirm(msg)) return;
    setLoading(btn, true, 'Updating...');
    try {
      const res = await api.adminTogglePublishResults(pwd);
      showToast(res.published ? '📢 Results published to public view!' : '👁️‍🗨️ Results hidden from public view.', 'success');
      await reloadPublishData(main, pwd);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      setLoading(btn, false, isPub ? '🚫 Hide Results from Public' : '📢 Publish Results to Public');
    }
  });

  // Toggle Results Freeze / Lock
  main.querySelector('#toggleResultsLockBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const isLocked = resultsLocked;
    const msg = isLocked 
      ? 'Unlock election results? Vote entry modifications will be re-enabled.'
      : 'Freeze and lock election results? Further vote entries will be blocked.';
    if (!confirm(msg)) return;
    setLoading(btn, true, 'Updating...');
    try {
      const res = await api.adminToggleLockResults(pwd);
      showToast(res.locked ? '🔒 Results locked and frozen.' : '🔓 Results unlocked for live entry.', 'success');
      await reloadPublishData(main, pwd);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      setLoading(btn, false, isLocked ? '🔓 Unlock Results' : '🔒 Freeze / Lock Results');
    }
  });

  // Toggle Counting Mode
  main.querySelector('#toggleCountingBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const isAct = isCountingActive;
    const msg = isAct
      ? 'Deactivate Counting Mode? Public visitors to the results page will be asked to wait.'
      : 'Activate Counting Mode? Public visitors will see "Counting in Progress".';
    if (!confirm(msg)) return;
    setLoading(btn, true, 'Updating...');
    try {
      const res = await api.adminToggleCounting(pwd);
      showToast(res.active ? '⚡ Live counting mode active!' : '⏳ Counting mode inactive.', 'success');
      await reloadPublishData(main, pwd);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      setLoading(btn, false, isAct ? '⏸️ Stop Counting Mode' : '⚡ Set Counting Active');
    }
  });
}
