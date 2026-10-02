import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading, isYearEligible, sortPosts } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { saveCountingMeta, getCountingMeta } from '../../offlineStorage.js';
import { router } from '../../router.js';

export function isUuc(postName) {
  if (!postName) return false;
  const u = String(postName).toUpperCase();
  return u.includes('UUC') || u.includes('UNIVERSITY UNION COUNCILLOR') || u.includes('COUNCILLOR');
}

export async function renderAdminCounting(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'counting', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading Counting Setup & Officials...</p></div>
  `);

  try {
    const [savedMatrix, posts, nominationsRaw, booths, nominalRoll, settings, officialsRaw] = await Promise.all([
      api.adminGetCountingMatrix(pwd, true).catch(() => null),
      api.getPosts().catch(() => []),
      api.adminGetNominations(pwd).catch(() => []),
      api.adminGetBooths(pwd, true).catch(() => []),
      api.getNominalRoll().catch(() => []),
      api.adminGetSettings(pwd).catch(() => ({})),
      api.adminGetOfficials(pwd, true).catch(() => null)
    ]);

    const allNoms = Array.isArray(nominationsRaw) ? nominationsRaw : [];
    const finalList = allNoms.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');
    const boothsList = Array.isArray(booths) ? booths : (Array.isArray(booths?.booths) ? booths.booths : []);
    const postsList = Array.isArray(posts) ? posts : (Array.isArray(posts?.posts) ? posts.posts : []);
    const nominalRollList = Array.isArray(nominalRoll) ? nominalRoll : [];

    let countingTeams = [];
    if (officialsRaw && Array.isArray(officialsRaw.countingTeams)) {
      countingTeams = officialsRaw.countingTeams;
    } else {
      try {
        countingTeams = JSON.parse(localStorage.getItem('gcc_counting_teams') || '[]');
      } catch (_) {}
    }

    // Cache metadata in IndexedDB for offline access
    await saveCountingMeta({ savedMatrix, posts: postsList, finalList, booths: boothsList, settings, countingTeams });

    renderCountingUI(container.querySelector('#adminMain'), pwd, savedMatrix, postsList, finalList, boothsList, nominalRollList, settings, false, countingTeams);
  } catch (e) {
    console.warn('Counting online load failed, checking IndexedDB cache:', e);
    const cached = await getCountingMeta();
    if (cached && cached.savedMatrix) {
      renderCountingUI(
        container.querySelector('#adminMain'),
        pwd,
        cached.savedMatrix,
        cached.posts || [],
        cached.finalList || [],
        cached.booths || [],
        [],
        cached.settings || {},
        true,
        cached.countingTeams || []
      );
    } else {
      container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
    }
  }
}

function getSupervisorNameForTable(tableNum, countingTeams) {
  if (!Array.isArray(countingTeams)) return '';
  const team = countingTeams.find(t => String(t.tableNumber) === String(tableNum));
  if (!team || !team.supervisor) return '';
  if (typeof team.supervisor === 'string') return team.supervisor;
  return team.supervisor.name || team.supervisor.fullName || '';
}

function renderCountingUI(main, pwd, savedMatrix, posts, finalList, booths, nominalRoll, settings = {}, isOffline = false, countingTeams = []) {
  const collegeName = settings?.collegeName || CONFIG.COLLEGE_NAME || 'Government Victoria College Palakkad';
  const electionYear = settings?.electionYear || new Date().getFullYear().toString();
  const collegeLogo = settings?.collegeLogo || '';
  
  const boothsList = Array.isArray(booths) ? booths : [];
  const postsList = Array.isArray(posts) ? posts : [];
  const nominalRollList = Array.isArray(nominalRoll) ? nominalRoll : [];
  const candidatesList = Array.isArray(finalList) ? finalList : [];

  if (!boothsList.length) { 
    main.innerHTML = `
      <div class="page-enter text-center py-16 bg-white/5 rounded-2xl border border-white/10 max-w-lg mx-auto p-8 shadow-xl">
        <div class="text-4xl mb-3">🗳️</div>
        <h3 class="text-lg font-bold text-white mb-2">No Polling Booths Configured</h3>
        <p class="text-slate-400 text-xs leading-relaxed mb-6">Polling booths must be created before the counting matrix can allocate counting tables.</p>
        <button id="btnGoToBooths" class="btn btn-primary btn-sm text-xs font-bold">Go to Polling Booths Setup</button>
      </div>
    `;
    main.querySelector('#btnGoToBooths')?.addEventListener('click', () => router.navigate('/admin/booths'));
    return; 
  }
  if (!postsList.length) { 
    main.innerHTML = `<div class="alert alert-error">❌ No election posts found.</div>`; 
    return; 
  }

  const pName = p => String(p?.post || p?.name || '');

  const getBoothClasses = (b) => {
    if (Array.isArray(b?.classes)) return b.classes;
    if (typeof b?.classes === 'string') return b.classes.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };

  // ── Render Display ─────────────────────────────────────────────────────────
  const renderDisplay = (data) => {
    const matrix = Array.isArray(data?.matrix) ? data.matrix : [];
    const formSerials = data?.formSerials && typeof data.formSerials === 'object' ? data.formSerials : {};
    const totalRounds = Number(data?.totalRounds) || (matrix[0] ? matrix[0].length : 0);
    const roundLabels = Array.isArray(data?.roundLabels) && data.roundLabels.length === totalRounds
      ? data.roundLabels
      : Array.from({ length: totalRounds }, (_, i) => `Round ${i + 1}`);
    const T = boothsList.length;
    const isMismatch = matrix.length !== T;

    // Build list of active contesting posts sorted statutorily
    const sortedPostObjects = sortPosts(postsList);

    // Map each post to its counting tables/rounds
    const postTableMap = {};
    sortedPostObjects.forEach(p => {
      const pn = pName(p);
      postTableMap[pn] = [];
    });

    for (let t = 0; t < T; t++) {
      for (let r = 0; r < totalRounds; r++) {
        const post = matrix[t] ? matrix[t][r] : null;
        if (!post) continue;
        const pn = pName(post);
        const bNum = boothsList[t]?.boothNumber || (t + 1);
        const roomName = boothsList[t]?.roomName || `Table ${bNum}`;
        const serial = formSerials[`${t}-${r}`] || `${t + 1}-${r + 1}`;
        const supName = getSupervisorNameForTable(bNum, countingTeams);
        if (!postTableMap[pn]) postTableMap[pn] = [];
        postTableMap[pn].push({
          tIndex: t,
          roundIndex: r,
          tableNum: bNum,
          roundNum: r + 1,
          roomName,
          serial,
          supervisorName: supName
        });
      }
    }

    // Ensure every post's table list is strictly sorted Table Number wise (1 to T)
    Object.values(postTableMap).forEach(list => {
      list.sort((a, b) => Number(a.tableNum) - Number(b.tableNum) || Number(a.roundNum) - Number(b.roundNum));
    });

    main.innerHTML = `
      <div class="page-enter space-y-6">
        ${isMismatch ? `
          <div class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">⚠️</span>
              <div>
                <strong>Booth Configuration Mismatch:</strong>
                <span>The saved counting matrix was generated for <strong>${matrix.length} tables</strong>, but there are currently <strong>${T} polling booths</strong> configured.</span>
              </div>
            </div>
            <button id="btnNoticeRegenerate" class="btn btn-sm bg-amber-500 hover:bg-amber-600 text-black font-bold shrink-0">
              🔄 Regenerate Matrix Now
            </button>
          </div>
        ` : ''}

        <!-- Top Header & Secondary Tools -->
        <div class="flex items-center justify-between no-print flex-wrap gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-xl font-bold text-white">Counting Matrix &amp; Forms</h3>
              ${isOffline ? '<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold">Offline Mode (IndexedDB)</span>' : ''}
            </div>
            <p class="text-slate-400 text-sm mt-0.5">${T} tables · ${totalRounds} rounds · ${postsList.length} posts total</p>
          </div>
          <div class="flex gap-2 flex-wrap items-center">
            <a href="#/admin/results?openPanelColors=true" class="btn btn-secondary border-purple-500/40 text-purple-300 hover:bg-purple-500/20 text-xs font-semibold flex items-center gap-1.5" title="Confidential candidate panel colors">
              <span>🎨</span> Set Candidate Colors
            </a>
            <a href="#/admin/officials" class="btn btn-secondary border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white text-xs font-semibold flex items-center gap-1.5">
              <span>👥</span> Allot Counting Teams
            </a>
            <button id="btnRegenerate" class="btn btn-secondary bg-white/5 border-white/10 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5">
              <span>🔄</span> Regenerate Matrix
            </button>
          </div>
        </div>

        <!-- Dedicated Printing & Consolidation Toolbar -->
        <div class="glass p-4 sm:p-5 rounded-2xl border border-indigo-500/30 shadow-2xl no-print space-y-4 bg-slate-900/60 backdrop-blur-md">
          
          <!-- Row 1: Target Post Selector & Layout / Recount Controls -->
          <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 pb-3.5 border-b border-white/10">
            <!-- Post Selector -->
            <div class="flex items-center gap-2.5 flex-1 min-w-[300px]">
              <label for="selPostPrint" class="text-xs font-bold text-indigo-300 shrink-0 uppercase tracking-wide flex items-center gap-1.5">
                <span>🎯</span> Target Post:
              </label>
              <select id="selPostPrint" class="field text-xs py-2 px-3 bg-black/40 border border-white/20 hover:border-indigo-400/50 rounded-xl text-white font-medium flex-1 focus:outline-none focus:border-indigo-400 shadow-inner transition-colors">
                <option value="all">🌟 All Posts (Complete Election Batch)</option>
                ${sortedPostObjects.map(p => {
                  const pn = pName(p);
                  const isPostUuc = isUuc(pn);
                  const countTbls = (postTableMap[pn] || []).length;
                  return `<option value="${esc(pn)}">${esc(pn)} (${countTbls} table${countTbls === 1 ? '' : 's'})${isPostUuc ? ' ⭐ [2 Vacancies]' : ''}</option>`;
                }).join('')}
              </select>
            </div>

            <!-- Settings: Orientation & Recount Mode -->
            <div class="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
              <!-- Orientation Selector -->
              <div class="flex items-center gap-1.5 bg-black/40 border border-white/15 px-3 py-1.5 rounded-xl text-xs shadow-inner">
                <label for="selOrientation" class="text-[11px] font-semibold text-slate-400">Layout:</label>
                <select id="selOrientation" class="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer">
                  <option value="portrait" class="bg-slate-900 text-white">📄 Portrait</option>
                  <option value="landscape" class="bg-slate-900 text-white">📄 Landscape</option>
                </select>
              </div>

              <!-- Recount Mode Toggle -->
              <label class="flex items-center gap-2 cursor-pointer text-xs font-bold px-3 py-1.5 rounded-xl select-none transition-all border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 shadow-sm" title="Enable to stamp forms and consolidation sheets with RECOUNTING label">
                <input type="checkbox" id="chkRecountMode" class="rounded accent-amber-500 w-4 h-4 cursor-pointer">
                <span>🔁 Recounting Mode</span>
              </label>
            </div>
          </div>

          <!-- Row 2: Print Actions Grid (Balanced 4 Equal Columns) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <!-- 1. Counting Forms -->
            <button type="button" id="btnPrintForms" class="btn btn-primary text-xs font-bold py-2.5 px-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]" title="Print Counting Forms (Form 6) ordered Table 1 to ${T}">
              <span>🖨️</span>
              <span id="labelPrintForms" class="truncate">Print Counting Forms</span>
            </button>

            <!-- 2. Tabulation Sheet -->
            <button type="button" id="btnPrintConsolidation" class="btn btn-secondary text-xs font-semibold py-2.5 px-3.5 rounded-xl border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]" title="Print Manual Tabulation & Consolidation Register (fits 1 A4 page in Portrait/Landscape)">
              <span>📊</span>
              <span id="labelPrintConsolidation" class="truncate">Tabulation Sheet</span>
            </button>

            <!-- 3. UUC Tally Sheet -->
            <button type="button" id="btnPrintUucTally" class="btn btn-secondary text-xs font-semibold py-2.5 px-3.5 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]" title="Print Working Dual-Vote Tally Sheet for University Union Councillor">
              <span>🧮</span>
              <span id="labelPrintUuc" class="truncate">UUC Tally Sheet</span>
            </button>

            <!-- 4. Full Post Dossier -->
            <button type="button" id="btnPrintPackage" class="btn btn-secondary text-xs font-bold py-2.5 px-3.5 rounded-xl border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] shadow-md" title="Print complete set for Post (Tabulation Sheet + Tally Sheet + Counting Forms)">
              <span>📑</span>
              <span id="labelPrintDossier" class="truncate">Full Post Dossier</span>
            </button>
          </div>

          <!-- Bottom Status & Hints Bar -->
          <div class="text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/5">
            <span id="printScopeHint" class="flex items-center gap-1.5 text-slate-300">
              💡 <strong>Scope:</strong> Printing across all ${totalRounds} rounds and ${T} tables (ordered Table 1 to ${T}). Select a specific post for recounting or single-post packet.
            </span>
            <div class="flex items-center gap-2.5">
              <span id="recountBadgeStatus" class="hidden text-amber-300 font-bold text-[10.5px] bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1">
                <span>⚠️</span> RECOUNT MODE ACTIVE
              </span>
              <span class="text-indigo-300 font-mono text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                Table 1..${T} Order · Supervisor Auto-filled
              </span>
            </div>
          </div>
        </div>

        <!-- Counting Matrix Table -->
        <div class="glass rounded-xl overflow-hidden no-print shadow-2xl">
          <div class="p-3 border-b border-white/10 bg-slate-900/60 flex items-center justify-between">
            <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Table × Round Allocation Matrix</h4>
            <span class="text-[11px] text-slate-500">Form Serials: #1 .. #${T * totalRounds}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="data-table text-xs">
              <thead><tr>
                <th class="w-36">Table &amp; Supervisor</th>
                ${roundLabels.map(l => `<th>${esc(l)}</th>`).join('')}
              </tr></thead>
              <tbody>
                ${boothsList.map((b, t) => {
                  const bNum = b.boothNumber || (t + 1);
                  const supName = getSupervisorNameForTable(bNum, countingTeams);
                  const tableRow = Array.isArray(matrix[t]) 
                    ? matrix[t] 
                    : Array.from({ length: totalRounds }, () => null);
                  return `
                  <tr>
                    <td class="font-bold text-indigo-300 whitespace-nowrap bg-black/15">
                      <div class="flex items-center gap-1.5">
                        <span class="text-sm">🪑</span>
                        <span>Table ${bNum}</span>
                      </div>
                      <div class="text-[11px] text-slate-400 font-normal truncate max-w-[140px]" title="${esc(b.roomName || '')}">
                        ${esc(b.roomName || `Room ${bNum}`)}
                      </div>
                      <div class="text-[10px] text-slate-500 font-normal italic mt-0.5 truncate max-w-[140px]" title="Supervisor: ${esc(supName || 'Unassigned')}">
                        ${supName ? `👤 ${esc(supName)}` : '<span class="text-amber-400/80">⚠️ No supervisor</span>'}
                      </div>
                    </td>
                    ${tableRow.map((post, r) => {
                      if (!post) return '<td class="align-top py-2.5 min-w-[110px] text-slate-600">–</td>';
                      const pn = pName(post);
                      const isPostUuc = isUuc(pn);
                      const serial = formSerials[`${t}-${r}`] || `${t + 1}-${r + 1}`;
                      return `
                      <td class="align-top py-2.5 min-w-[110px]">
                        <div class="flex items-center justify-between gap-1 mb-1">
                          <span class="text-[10px] text-slate-400 font-mono font-bold">#${esc(serial)}</span>
                          ${isPostUuc ? '<span class="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">2-Seat</span>' : ''}
                        </div>
                        <div class="badge ${isPostUuc ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'badge-valid'} block text-left truncate cursor-pointer hover:underline" data-quick-post="${esc(pn)}" title="Click to filter print options to ${esc(pn)}">
                          ${esc(pn)}
                        </div>
                      </td>`;
                    }).join('')}
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Post-Wise Quick Actions Directory -->
        <div class="glass rounded-xl p-5 border border-white/10 shadow-2xl no-print space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
            <div>
              <h4 class="font-bold text-white text-sm flex items-center gap-2">
                <span>📋</span> Post-Wise Tabulation &amp; Recount Dossiers
              </h4>
              <p class="text-xs text-slate-400 mt-0.5">Quick 1-click access to print individual Counting Forms, Tabulation Registers, and UUC Tally Sheets for any post.</p>
            </div>
            <span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono text-xs">
              ${sortedPostObjects.length} Posts
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            ${sortedPostObjects.map(p => {
              const pn = pName(p);
              const postUuc = isUuc(pn);
              const tbls = postTableMap[pn] || [];
              const cands = candidatesList.filter(c => c.post === pn);
              return `
                <div class="p-3.5 rounded-xl border ${postUuc ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10 bg-white/[0.02]'} flex flex-col justify-between gap-3 hover:border-white/20 transition-all">
                  <div>
                    <div class="flex items-start justify-between gap-2">
                      <h5 class="font-bold text-xs text-white leading-snug">${esc(pn)}</h5>
                      ${postUuc ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">2 Seats</span>' : ''}
                    </div>
                    <div class="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>👥 ${cands.length} Candidate${cands.length === 1 ? '' : 's'}</span>
                      <span>•</span>
                      <span>🪑 ${tbls.length} Table${tbls.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5 pt-2 border-t border-white/5 flex-wrap">
                    <button type="button" class="btn btn-secondary btn-xs py-1 px-2 text-[11px] quick-print-forms" data-post="${esc(pn)}" title="Print counting forms for ${esc(pn)}">
                      🖨️ Forms
                    </button>
                    <button type="button" class="btn btn-secondary btn-xs py-1 px-2 text-[11px] quick-print-tab" data-post="${esc(pn)}" title="Print manual consolidation sheet for ${esc(pn)}">
                      📊 Tabulation
                    </button>
                    ${postUuc ? `
                      <button type="button" class="btn btn-secondary btn-xs py-1 px-2 text-[11px] border-amber-500/40 text-amber-300 quick-print-uuc" data-post="${esc(pn)}" title="Print Dual-Vote Tally Sheet for ${esc(pn)}">
                        🧮 Tally
                      </button>
                    ` : ''}
                    <button type="button" class="btn btn-primary btn-xs py-1 px-2 text-[11px] quick-print-dossier" data-post="${esc(pn)}" title="Print complete dossier for ${esc(pn)}">
                      📑 All
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>`;

    // ─── Attach Events ────────────────────────────────────────────────────────
    const selPostPrint = main.querySelector('#selPostPrint');
    const labelPrintForms = main.querySelector('#labelPrintForms');
    const labelPrintConsolidation = main.querySelector('#labelPrintConsolidation');
    const labelPrintDossier = main.querySelector('#labelPrintDossier');
    const btnPrintUucTally = main.querySelector('#btnPrintUucTally');
    const printScopeHint = main.querySelector('#printScopeHint');
    const chkRecountMode = main.querySelector('#chkRecountMode');
    const selOrientation = main.querySelector('#selOrientation');
    const recountBadgeStatus = main.querySelector('#recountBadgeStatus');

    const updatePrintScopeUI = () => {
      const selected = selPostPrint.value;
      const isRecount = !!chkRecountMode?.checked;
      const isPostUuc = isUuc(selected);

      if (selected === 'all') {
        labelPrintForms.textContent = isRecount ? 'Print Recount Forms' : 'Print All Forms';
        labelPrintConsolidation.textContent = isRecount ? 'All Recount Tabulations' : 'All Tabulation Sheets';
        if (labelPrintDossier) labelPrintDossier.textContent = isRecount ? 'Full Recount Dossier' : 'Full Election Dossier';
        printScopeHint.innerHTML = `💡 <strong>Scope:</strong> Batch printing all ${totalRounds} rounds and ${T} tables across the entire election (ordered Table 1 to ${T}).`;
        if (btnPrintUucTally) {
          btnPrintUucTally.classList.remove('opacity-40');
          btnPrintUucTally.title = 'Print Working Dual-Vote Tally Sheet for University Union Councillor';
        }
      } else {
        const tblCount = (postTableMap[selected] || []).length;
        labelPrintForms.textContent = isRecount ? `Recount Forms (${tblCount})` : `Print Forms (${tblCount})`;
        labelPrintConsolidation.textContent = isRecount ? `Recount Tabulation` : `Tabulation Sheet`;
        if (labelPrintDossier) labelPrintDossier.textContent = isRecount ? `Recount Dossier (${tblCount})` : `Full Post Dossier (${tblCount})`;
        printScopeHint.innerHTML = `💡 <strong>Scope:</strong> Focused on <strong>${esc(selected)}</strong> (${tblCount} table${tblCount === 1 ? '' : 's'}, ordered Table 1 to ${T}). Ideal for recounting or single-post packets.`;
        if (btnPrintUucTally) {
          if (!isPostUuc) {
            btnPrintUucTally.classList.add('opacity-40');
            btnPrintUucTally.title = 'UUC Tally Sheet is only applicable for University Union Councillor';
          } else {
            btnPrintUucTally.classList.remove('opacity-40');
            btnPrintUucTally.title = 'Print Working Dual-Vote Tally Sheet for University Union Councillor';
          }
        }
      }
    };

    selPostPrint?.addEventListener('change', updatePrintScopeUI);
    chkRecountMode?.addEventListener('change', () => {
      if (chkRecountMode.checked) {
        recountBadgeStatus?.classList.remove('hidden');
        showToast('Recounting Mode active: Forms and Tabulation will carry RECOUNTING labels.', 'info');
      } else {
        recountBadgeStatus?.classList.add('hidden');
      }
      updatePrintScopeUI();
    });

    // Matrix cell click shortcut to select post in dropdown
    main.querySelectorAll('[data-quick-post]').forEach(badge => {
      badge.addEventListener('click', () => {
        const postName = badge.dataset.quickPost;
        if (selPostPrint && postName) {
          selPostPrint.value = postName;
          updatePrintScopeUI();
          selPostPrint.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    // ── Main Print Action Handlers ───────────────────────────────────────────

    // 1. Print Counting Forms (Ordered strictly Table Number wise: 1 to T)
    const executePrintForms = (postFilter = 'all') => {
      const isRecount = !!chkRecountMode?.checked;
      const orientation = selOrientation?.value || 'portrait';
      let html = '';
      let count = 0;

      for (let t = 0; t < T; t++) {
        for (let r = 0; r < totalRounds; r++) {
          const post = matrix[t] ? matrix[t][r] : null;
          if (!post) continue;
          const pn = pName(post);
          if (postFilter !== 'all' && pn !== postFilter) continue;

          const serial = formSerials[`${t}-${r}`] || `${t + 1}-${r + 1}`;
          const cands = candidatesList.filter(c => c.post === pn).sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));
          const bNum = boothsList[t]?.boothNumber || (t + 1);
          const roomName = boothsList[t]?.roomName || `Table ${bNum}`;
          const supName = getSupervisorNameForTable(bNum, countingTeams);

          html += buildFormHtml(bNum, r + 1, pn, cands, serial, collegeName, electionYear, collegeLogo, supName, roomName, isRecount);
          count++;
        }
      }

      if (!count) {
        showToast(postFilter === 'all' ? 'No counting forms found.' : `No tables assigned for "${postFilter}".`, 'warning');
        return;
      }
      const title = postFilter === 'all' 
        ? (isRecount ? 'Recount Forms - All Posts' : 'Counting Forms - All Posts') 
        : (isRecount ? `Recount Forms - ${postFilter}` : `Counting Forms - ${postFilter}`);
      triggerCountingPrint(html, title, collegeLogo, orientation);
    };

    main.querySelector('#btnPrintForms')?.addEventListener('click', () => {
      executePrintForms(selPostPrint.value);
    });

    // 2. Print Tabulation & Consolidation Sheets (Fits on 1 A4 page in Portrait/Landscape)
    const executePrintConsolidation = (postFilter = 'all') => {
      const isRecount = !!chkRecountMode?.checked;
      const orientation = selOrientation?.value || 'landscape';
      let html = '';
      let count = 0;

      const targetPosts = postFilter === 'all' ? sortedPostObjects.map(p => pName(p)) : [postFilter];

      targetPosts.forEach(pn => {
        const tables = postTableMap[pn] || [];
        tables.sort((a, b) => Number(a.tableNum) - Number(b.tableNum) || Number(a.roundNum) - Number(b.roundNum));
        const cands = candidatesList.filter(c => c.post === pn).sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));
        html += buildConsolidationHtml(pn, tables, cands, collegeName, electionYear, collegeLogo, isRecount);
        count++;
      });

      if (!count) {
        showToast('No tabulation sheets generated.', 'warning');
        return;
      }
      const title = postFilter === 'all' 
        ? (isRecount ? 'Recount Consolidation Sheets - All Posts' : 'Consolidation Sheets - All Posts') 
        : (isRecount ? `Recount Consolidation Sheet - ${postFilter}` : `Consolidation Sheet - ${postFilter}`);
      triggerCountingPrint(html, title, collegeLogo, orientation);
    };

    main.querySelector('#btnPrintConsolidation')?.addEventListener('click', () => {
      executePrintConsolidation(selPostPrint.value);
    });

    // 3. Print UUC Tally Sheet (Helper sheet for counting officers)
    const executePrintUucTally = (tableFilter = null) => {
      const isRecount = !!chkRecountMode?.checked;
      const orientation = selOrientation?.value || 'portrait';
      const uucPosts = sortedPostObjects.filter(p => isUuc(pName(p)));
      if (!uucPosts.length) {
        showToast('No University Union Councillor (UUC) post found in election configuration.', 'warning');
        return;
      }

      let html = '';
      let count = 0;

      uucPosts.forEach(p => {
        const pn = pName(p);
        const tables = postTableMap[pn] || [];
        tables.sort((a, b) => Number(a.tableNum) - Number(b.tableNum) || Number(a.roundNum) - Number(b.roundNum));
        const cands = candidatesList.filter(c => c.post === pn).sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));

        tables.forEach(tInfo => {
          if (tableFilter && String(tInfo.tableNum) !== String(tableFilter)) return;
          html += buildUucTallySheetHtml(tInfo.tableNum, tInfo.roundNum, tInfo.serial, cands, collegeName, electionYear, collegeLogo, tInfo.supervisorName, tInfo.roomName, isRecount);
          count++;
        });
      });

      if (!count) {
        showToast('No UUC counting tables found.', 'warning');
        return;
      }
      triggerCountingPrint(html, isRecount ? 'UUC Recount Tally Sheets' : 'UUC Dual-Vote Tally Sheets', collegeLogo, orientation);
    };

    main.querySelector('#btnPrintUucTally')?.addEventListener('click', () => {
      executePrintUucTally();
    });

    // 4. Print Full Dossier (Consolidation Sheet + Tally Sheet + Counting Forms Table 1..N)
    const executePrintPackage = (postFilter = 'all') => {
      const isRecount = !!chkRecountMode?.checked;
      const orientation = selOrientation?.value || 'portrait';
      let html = '';
      const targetPosts = postFilter === 'all' ? sortedPostObjects.map(p => pName(p)) : [postFilter];

      targetPosts.forEach(pn => {
        const tables = postTableMap[pn] || [];
        tables.sort((a, b) => Number(a.tableNum) - Number(b.tableNum) || Number(a.roundNum) - Number(b.roundNum));
        const cands = candidatesList.filter(c => c.post === pn).sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));
        const isPostUuc = isUuc(pn);

        // First: Tabulation Consolidation Sheet for the Post (Form 7 - fits on 1 page)
        html += buildConsolidationHtml(pn, tables, cands, collegeName, electionYear, collegeLogo, isRecount);

        // Second: If UUC, append UUC Tally Sheets for all tables (ordered Table 1 to N)
        if (isPostUuc) {
          tables.forEach(tInfo => {
            html += buildUucTallySheetHtml(tInfo.tableNum, tInfo.roundNum, tInfo.serial, cands, collegeName, electionYear, collegeLogo, tInfo.supervisorName, tInfo.roomName, isRecount);
          });
        }

        // Third: Counting Forms (Form 6) for each table (ordered Table 1 to N)
        tables.forEach(tInfo => {
          html += buildFormHtml(tInfo.tableNum, tInfo.roundNum, pn, cands, tInfo.serial, collegeName, electionYear, collegeLogo, tInfo.supervisorName, tInfo.roomName, isRecount);
        });
      });

      if (!html) {
        showToast('No dossier documents generated.', 'warning');
        return;
      }
      const title = postFilter === 'all' 
        ? (isRecount ? 'Complete Recount Dossier - All Posts' : 'Complete Counting Dossier') 
        : (isRecount ? `Recount Dossier - ${postFilter}` : `Counting Dossier - ${postFilter}`);
      triggerCountingPrint(html, title, collegeLogo, orientation);
    };

    main.querySelector('#btnPrintPackage')?.addEventListener('click', () => {
      executePrintPackage(selPostPrint.value);
    });

    // ── Quick Print Buttons per Post ─────────────────────────────────────────
    main.querySelectorAll('.quick-print-forms').forEach(btn => {
      btn.addEventListener('click', () => executePrintForms(btn.dataset.post));
    });
    main.querySelectorAll('.quick-print-tab').forEach(btn => {
      btn.addEventListener('click', () => executePrintConsolidation(btn.dataset.post));
    });
    main.querySelectorAll('.quick-print-uuc').forEach(btn => {
      btn.addEventListener('click', () => executePrintUucTally());
    });
    main.querySelectorAll('.quick-print-dossier').forEach(btn => {
      btn.addEventListener('click', () => executePrintPackage(btn.dataset.post));
    });

    // Matrix Regenerate listeners
    main.querySelector('#btnRegenerate')?.addEventListener('click', () => {
      if (confirm('Are you sure? This will discard the current matrix and generate a new one based on current Booths and Posts. Results entry serial numbers may change!')) {
        generateAndSave();
      }
    });

    main.querySelector('#btnNoticeRegenerate')?.addEventListener('click', () => {
      if (confirm('Regenerate counting matrix to align with all ' + T + ' polling booths?')) {
        generateAndSave();
      }
    });
  };

  // ── Function to generate matrix from scratch and save to backend ──────────────
  const generateAndSave = async () => {
    const T = boothsList.length;
    
    const getPostDept = (p) => {
      if (p?.restrictedDept) return String(p.restrictedDept).toUpperCase().trim();
      const name = pName(p);
      const prefix = 'Association Secretary ';
      if (name.toUpperCase().startsWith(prefix.toUpperCase())) {
        return name.substring(prefix.length).toUpperCase().trim();
      }
      return null;
    };

    const classToDept = {};
    nominalRollList.forEach(s => {
      const c = String(s['CLASS'] || '').trim();
      const d = String(s['Dept']  || '').trim().toUpperCase();
      if (c && d) {
        classToDept[c] = d;
        const u = c.toUpperCase();
        if (u.includes('RESEARCH') || u.includes('SCHOLAR') || u.includes('PHD') || u.includes('PH.D')) {
          classToDept[`RESEARCH SCHOLAR - ${s['Dept']}`] = d;
        }
      }
    });

    const boothDepts = boothsList.map(b => new Set(getBoothClasses(b).map(c => classToDept[c] || '').filter(Boolean)));
    const boothYears = boothsList.map(b => {
      const yrs = new Set();
      getBoothClasses(b).forEach(c => {
        const u = c.toUpperCase();
        const isPG = ['MA','MSC','MCOM','M.SC','M.COM','M.A'].some(pg => u.includes(pg));
        if (isPG) {
          yrs.add('PG');
        } else {
          if (u.includes('1ST YEAR') || /^\s*(1|1ST|I)\b/.test(u) || /\b1ST\b/.test(u)) yrs.add('1');
          if (u.includes('2ND YEAR') || /^\s*(2|2ND|II)\b/.test(u) || /\b2ND\b/.test(u)) yrs.add('2');
          if (u.includes('3RD YEAR') || /^\s*(3|3RD|III)\b/.test(u) || /\b3RD\b/.test(u)) yrs.add('3');
        }
      });
      return yrs;
    });

    const isMatch = (post, bIdx) => {
      const pDept = getPostDept(post);
      if (pDept && !boothDepts[bIdx].has(pDept)) return false;
      const yrRule = post.yearRule;
      if (!yrRule || yrRule === 'ALL') return true;
      const bYrs = boothYears[bIdx];
      if (yrRule === 'PG')  return bYrs.has('PG');
      if (yrRule === 'UG1') return bYrs.has('1');
      if (yrRule === 'UG2') return bYrs.has('2');
      if (yrRule === 'UG3') return bYrs.has('3');
      return true;
    };

    const maxPostsAtTable = Math.max(...boothsList.map((_, i) => postsList.filter(p => isMatch(p, i)).length), 1);
    const R = Math.max(maxPostsAtTable, 1);
    const matrix = Array.from({ length: T }, () => Array.from({ length: R }, () => null));

    boothsList.forEach((_, t) => {
      const matchingPosts = postsList.filter(p => isMatch(p, t));
      matchingPosts.forEach((p, r) => {
        if (r < R) matrix[t][r] = p;
      });
    });

    let currentSerial = 1;
    const formSerials = {};
    for (let r = 0; r < R; r++) {
      for (let t = 0; t < T; t++) {
        if (matrix[t][r]) {
          formSerials[`${t}-${r}`] = currentSerial++;
        }
      }
    }

    const payload = {
      matrix,
      formSerials,
      totalRounds: R,
      roundLabels: Array.from({ length: R }, (_, i) => `Round ${i + 1}`)
    };

    try {
      await api.adminSaveCountingMatrix(pwd, payload);
      await saveCountingMeta({ savedMatrix: payload, posts: postsList, finalList: candidatesList, booths: boothsList, settings, countingTeams });
      showToast('Counting matrix generated and saved successfully.', 'success');
      renderDisplay(payload);
    } catch (e) {
      console.warn('Online save matrix failed, saving locally to IndexedDB:', e);
      await saveCountingMeta({ savedMatrix: payload, posts: postsList, finalList: candidatesList, booths: boothsList, settings, countingTeams });
      showToast('Matrix saved locally to IndexedDB (Offline).', 'info');
      renderDisplay(payload);
    }
  };

  if (savedMatrix && Array.isArray(savedMatrix.matrix) && savedMatrix.matrix.length) {
    renderDisplay(savedMatrix);
  } else {
    main.innerHTML = `
      <div class="page-enter text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10 max-w-xl mx-auto p-8 shadow-xl">
        <div class="text-5xl mb-4">🧩</div>
        <h3 class="text-xl font-bold text-white mb-2">No Counting Matrix Generated</h3>
        <p class="text-slate-400 text-sm mb-6 leading-relaxed">
          The counting matrix has not been generated yet. Generating will automatically distribute posts across ${boothsList.length} counting tables and assign Form # serials.
        </p>
        <button id="btnInitialGenerate" class="btn btn-primary px-8 font-bold shadow-lg">Generate Matrix Now</button>
      </div>
    `;
    main.querySelector('#btnInitialGenerate')?.addEventListener('click', generateAndSave);
  }
}

/**
 * Trigger print dialog with styled printable window
 */
function triggerCountingPrint(htmlContent, title = 'Counting Documents', collegeLogo = '', orientation = 'portrait') {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Pop-up was blocked. Please allow pop-ups for this site to print counting forms.');
    return;
  }
  w.document.write(`<!DOCTYPE html><html><head><title>${esc(title)}</title><style>
    @page { size: A4 ${orientation}; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #000; font-size: 12px; }
    .pg { page-break-after: always; padding: 6px 8px; position: relative; }
    .pg:last-child { page-break-after: avoid; }
    .serial-tag { position: absolute; top: 8px; right: 8px; border: 2px solid #000; padding: 4px 10px; font-family: monospace; font-size: 15px; font-weight: bold; background: #fff; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th, td { border: 1.5px solid #000; padding: 5px 6px; }
    th { background: #f3f4f6; }
    .watermark-global { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 450px; height: 450px; opacity: 0.08; pointer-events: none; z-index: -1; background-size: contain; background-repeat: no-repeat; background-position: center; }
  </style></head><body>
    ${collegeLogo ? `<div class="watermark-global" style="background-image: url('${collegeLogo}');"></div>` : ''}
    ${htmlContent}
    <script>window.onload=()=>setTimeout(()=>window.print(), 400);<\/script>
  </body></html>`);
  w.document.close();
}

/**
 * Form 6 — Standard Table Counting Form
 */
function buildFormHtml(tableNum, roundNum, postName, candidates, serial, collegeName = CONFIG.COLLEGE_NAME || 'Government Victoria College Palakkad', electionYear = '', collegeLogo = '', supervisorName = '', roomName = '', isRecount = false) {
  const yearStr = electionYear || new Date().getFullYear().toString();
  const candsList = Array.isArray(candidates) ? candidates : [];
  const isPostUuc = isUuc(postName);

  const rows = candsList.length
    ? candsList.map((c, i) => `<tr>
        <td style="text-align:center;padding:14px 8px;font-weight:bold">${i+1}</td>
        <td style="padding:14px 8px;font-size:15px;font-weight:bold">
          ${esc(c.candidateName || '')}
          <div style="font-size:11px;font-weight:normal;color:#444;margin-top:2px;">${esc(c.candidateClass || '')}</div>
        </td>
        <td style="padding:14px 8px"></td></tr>`).join('')
    : `<tr><td colspan="3" style="padding:14px;text-align:center;color:#555">No Contesting Candidates</td></tr>`;

  return `<div class="pg">
    <div class="serial-tag" ${isRecount ? 'style="border-color:#b91c1c;color:#b91c1c;"' : ''}>
      ${isRecount ? `RECOUNT — FORM #${serial}` : `FORM #${serial}`}
    </div>
    <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px;padding-right:110px;">
      ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:42px;max-width:120px;margin:0 auto 4px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
      <div style="font-size:13px;font-weight:bold;color:#111;text-transform:uppercase;">${esc(collegeName)}</div>
      <div style="font-size:12px;font-weight:bold;color:#444;margin-top:2px;">College Union Election ${esc(yearStr)}</div>
      <h2 style="margin:5px 0 0;font-size:19px;text-transform:uppercase;letter-spacing:2px">
        Counting Form ${isRecount ? '<span style="color:#b91c1c;font-size:14px;border:1.5px solid #b91c1c;padding:2px 6px;vertical-align:middle;margin-left:6px;">RECOUNT</span>' : ''}
      </h2>
      <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:14px;font-weight:bold;background:#f9fafb;padding:4px 8px;border:1px solid #ccc;">
        <span>TABLE NO: <u>${tableNum}</u> ${roomName ? `<span style="font-size:11px;font-weight:normal;color:#555">(${esc(roomName)})</span>` : ''}</span>
        <span>ROUND NO: <u>${roundNum}</u></span>
      </div>
      <h3 style="margin:8px 0 0;font-size:15px;text-decoration:underline;text-transform:uppercase">POST: ${esc(postName)}</h3>
      ${isPostUuc ? `<div style="font-size:11px;font-weight:bold;color:#b45309;margin-top:3px;">⭐ TWO (2) VACANCIES — DUAL-VOTE COUNTING (Total votes tallied = 2 × Ballots cast)</div>` : ''}
    </div>
    <table>
      <thead><tr>
        <th style="width:8%;text-align:center">#</th>
        <th style="text-align:left;width:62%">Candidate Name &amp; Class</th>
        <th style="width:30%;text-align:center">Votes Tallied</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr><td style="text-align:center;padding:14px 8px">–</td><td style="padding:14px 8px;font-weight:bold">NOTA</td><td></td></tr>
        <tr><td style="text-align:center;padding:14px 8px">–</td><td style="padding:14px 8px;font-weight:bold;color:#444">INVALID</td><td></td></tr>
        <tr style="background:#eee;border-top:2px solid #000"><td style="text-align:center;padding:14px 8px">–</td><td style="padding:14px 8px;font-weight:black;font-size:16px">TOTAL VOTES TALLIED</td><td></td></tr>
      </tbody>
    </table>
    <div style="display:flex;justify-content:space-between;margin-top:55px;text-align:center">
      <div>
        <div style="border-top:1.5px solid #000;width:200px;margin-bottom:4px"></div>
        <div style="font-size:11px">Signature of the Agents</div>
      </div>
      <div>
        <div style="border-top:1.5px solid #000;width:220px;margin-bottom:4px"></div>
        <div style="font-size:11px;font-weight:bold">Counting Supervisor Signature</div>
        ${supervisorName ? `<div style="font-size:10.5px;color:#222;margin-top:3px;font-style:italic;">( Name: ${esc(supervisorName)} )</div>` : `<div style="font-size:10.5px;color:#666;margin-top:3px;font-style:italic;">( Name: _______________________ )</div>`}
      </div>
    </div>
  </div>`;
}

/**
 * Form 7 — Manual Consolidation & Tabulation Register (Post-Wise)
 * Designed to fit strictly on 1 single page A4 in both Portrait and Landscape.
 */
function buildConsolidationHtml(postName, tableEntries, candidates, collegeName = CONFIG.COLLEGE_NAME || 'Government Victoria College Palakkad', electionYear = '', collegeLogo = '', isRecount = false) {
  const yearStr = electionYear || new Date().getFullYear().toString();
  const candsList = Array.isArray(candidates) ? candidates : [];
  const entries = Array.isArray(tableEntries) ? tableEntries : [];
  const postUuc = isUuc(postName);

  const numCands = candsList.length;
  // Calculate relative column widths
  const candColWidth = numCands > 0 ? Math.floor(45 / Math.max(numCands, 1)) : 20;

  const rows = entries.length ? entries.map((entry, idx) => `
    <tr>
      <td style="text-align:center;font-weight:bold;padding:4px 3px;">${idx + 1}</td>
      <td style="font-size:11px;padding:4px 5px;">
        <strong>Table ${entry.tableNum}</strong>
        ${entry.roomName ? `<span style="font-size:9.5px;color:#555"> (${esc(entry.roomName)})</span>` : ''}
      </td>
      <td style="text-align:center;font-size:11px;padding:4px 3px;">R-${entry.roundNum}</td>
      <td style="text-align:center;font-family:monospace;font-weight:bold;font-size:11.5px;padding:4px 3px;">#${esc(entry.serial)}</td>
      ${candsList.map(() => `<td style="padding:4px 4px"></td>`).join('')}
      <td style="padding:4px 4px"></td>
      <td style="padding:4px 4px"></td>
      <td style="padding:4px 4px;background:#fafafa"></td>
      <td style="padding:4px 4px"></td>
    </tr>
  `).join('') : `
    <tr>
      <td style="text-align:center;padding:4px 3px;">1</td>
      <td style="padding:4px 5px;">Table 1</td>
      <td style="text-align:center;padding:4px 3px;">R-1</td>
      <td style="text-align:center;font-family:monospace;padding:4px 3px;">–</td>
      ${candsList.map(() => `<td style="padding:4px 4px"></td>`).join('')}
      <td style="padding:4px 4px"></td><td style="padding:4px 4px"></td><td style="padding:4px 4px"></td><td style="padding:4px 4px"></td>
    </tr>
  `;

  return `<div class="pg pg-consolidation" style="page-break-inside:avoid;">
    ${isRecount ? `<div style="position:absolute;top:6px;right:6px;border:2px solid #b91c1c;color:#b91c1c;padding:3px 10px;font-size:12px;font-weight:bold;letter-spacing:1px;background:#fff;">🔁 RECOUNTING</div>` : ''}
    <div style="text-align:center;border-bottom:1.5px solid #000;padding-bottom:5px;margin-bottom:8px;">
      ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:30px;max-width:100px;margin:0 auto 2px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
      <div style="font-size:11.5px;font-weight:bold;color:#111;text-transform:uppercase;">${esc(collegeName)}</div>
      <div style="font-size:10.5px;font-weight:bold;color:#444;margin-top:1px;">College Union Election ${esc(yearStr)}</div>
      <h2 style="margin:3px 0 0;font-size:15px;text-transform:uppercase;letter-spacing:1px">
        FORM 7 — TABULATION &amp; CONSOLIDATION REGISTER ${isRecount ? '<span style="color:#b91c1c;">(RECOUNT)</span>' : ''}
      </h2>
      <h3 style="margin:3px 0 0;font-size:13px;text-decoration:underline;text-transform:uppercase">
        POST: ${esc(postName)} ${postUuc ? '<span style="font-size:11px;color:#b45309;font-weight:bold;">[2 Vacancies — Dual-Vote]</span>' : ''}
      </h3>
    </div>

    <table style="font-size:10.5px;margin-bottom:8px;">
      <thead>
        <tr>
          <th style="width:4%;text-align:center;padding:4px 2px;">#</th>
          <th style="width:14%;text-align:left;padding:4px 5px;">Table / Booth</th>
          <th style="width:6%;text-align:center;padding:4px 2px;">Round</th>
          <th style="width:10%;text-align:center;padding:4px 2px;">Ref Form #</th>
          ${candsList.map(c => `
            <th style="width:${candColWidth}%;text-align:center;padding:4px 3px;">
              ${esc(c.candidateName)}
              <div style="font-size:8.5px;font-weight:normal;color:#444">${esc(c.candidateClass || '')}</div>
            </th>
          `).join('')}
          <th style="width:7%;text-align:center;padding:4px 2px;">NOTA</th>
          <th style="width:7%;text-align:center;padding:4px 2px;">INVALID</th>
          <th style="width:11%;text-align:center;padding:4px 2px;">Total Tallied</th>
          <th style="width:7%;text-align:center;padding:4px 2px;">Initial</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr style="background:#eee;font-weight:bold;border-top:1.5px solid #000;border-bottom:2px double #000;">
          <td colspan="4" style="text-align:right;padding:5px;font-size:11px;letter-spacing:0.5px">GRAND TOTAL:</td>
          ${candsList.map(() => `<td style="padding:5px"></td>`).join('')}
          <td style="padding:5px"></td>
          <td style="padding:5px"></td>
          <td style="background:#e0e7ff;font-size:12.5px;font-weight:black;text-align:center;padding:5px"></td>
          <td style="padding:5px"></td>
        </tr>
      </tbody>
    </table>

    <!-- Statutory Result Declaration Box (Compact) -->
    <div style="margin-top:6px;border:1.5px solid #000;padding:6px 10px;border-radius:3px;font-size:10.5px;">
      <div style="font-weight:bold;text-transform:uppercase;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px">
        Statutory Result Consolidation &amp; Declaration
      </div>
      ${postUuc ? `
        <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:3px;">
          <div>1. Highest Votes: ________________________ (Votes: _____)</div>
          <div>2. Second Highest: ________________________ (Votes: _____)</div>
        </div>
        <div style="margin-top:3px;"><strong>DECLARED ELECTED (UUC):</strong> 1. ___________________________ &nbsp;&nbsp;&nbsp;&nbsp; 2. ___________________________</div>
      ` : `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div>Highest Valid Votes: ____________________________________ (Votes: _______)</div>
          <div><strong>DECLARED ELECTED:</strong> ____________________________________</div>
        </div>
      `}
    </div>

    <!-- Official Signatures -->
    <div style="display:flex;justify-content:space-between;margin-top:20px;text-align:center;">
      <div>
        <div style="border-top:1.5px solid #000;width:170px;margin-bottom:2px"></div>
        <div style="font-size:10px;font-weight:bold">Tabulating Officer</div>
      </div>
      <div>
        <div style="border-top:1.5px solid #000;width:170px;margin-bottom:2px"></div>
        <div style="font-size:10px;font-weight:bold">Returning Officer (Seal)</div>
      </div>
    </div>

    <!-- White space for agents to sign on page bottom itself, no table needed -->
    <div style="margin-top:12px;border-top:1px dashed #777;padding-top:4px;">
      <div style="font-size:9.5px;font-weight:bold;color:#333;margin-bottom:2px">
        Signatures of Contesting Candidates / Authorized Counting Agents:
      </div>
      <div style="height:42px;"></div>
    </div>
  </div>`;
}

/**
 * Form 6-T (UUC) — Batch-of-25 Dual-Vote Counting Tally Sheet
 * Implements the 25-Ballot Milestone Check Method for foolproof UUC tallying.
 */
function buildUucTallySheetHtml(tableNum, roundNum, serial, candidates, collegeName = CONFIG.COLLEGE_NAME || 'Government Victoria College Palakkad', electionYear = '', collegeLogo = '', supervisorName = '', roomName = '', isRecount = false) {
  const yearStr = electionYear || new Date().getFullYear().toString();
  const candsList = Array.isArray(candidates) ? candidates : [];

  return `<div class="pg pg-tally" style="page-break-inside:avoid;">
    ${isRecount ? `<div style="position:absolute;top:6px;right:6px;border:2px solid #b91c1c;color:#b91c1c;padding:3px 10px;font-size:12px;font-weight:bold;letter-spacing:1px;background:#fff;">🔁 RECOUNTING</div>` : ''}
    <div style="text-align:center;border-bottom:1.5px solid #000;padding-bottom:5px;margin-bottom:6px;">
      ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:32px;max-width:100px;margin:0 auto 2px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
      <div style="font-size:11.5px;font-weight:bold;color:#111;text-transform:uppercase;">${esc(collegeName)}</div>
      <div style="font-size:10.5px;font-weight:bold;color:#444;margin-top:1px;">College Union Election ${esc(yearStr)}</div>
      <h2 style="margin:2px 0 0;font-size:15px;text-transform:uppercase;letter-spacing:1px">
        FORM 6-T (UUC) — BATCH-OF-25 DUAL-VOTE TALLY SHEET ${isRecount ? '<span style="color:#b91c1c;">(RECOUNT)</span>' : ''}
      </h2>
      <div style="font-size:11.5px;font-weight:bold;margin-top:1px;text-decoration:underline">
        POST: UNIVERSITY UNION COUNCILLOR (TWO VACANCIES)
      </div>
      
      <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:11.5px;font-weight:bold;background:#f3f4f6;padding:4px 8px;border:1px solid #000;">
        <span>TABLE NO: <u>${tableNum}</u> ${roomName ? `<span style="font-weight:normal;color:#555">(${esc(roomName)})</span>` : ''}</span>
        <span>ROUND NO: <u>${roundNum}</u></span>
        <span>REF COUNTING FORM: <u>#${serial}</u></span>
        <span>SUPERVISOR: <u>${esc(supervisorName || '__________________')}</u></span>
      </div>
    </div>

    <!-- The 3-Step Milestone Rule Guide -->
    <div style="border:1.5px solid #000;padding:5px 8px;margin-bottom:6px;font-size:10px;background:#fefce8;line-height:1.35;">
      <strong>📌 BATCH-OF-25 COUNTING PROTOCOL (AVOIDS END-OF-ROUND RECOUNTS):</strong>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:3px;">
        <div style="background:#fff;padding:3px 6px;border:1px solid #eab308;border-radius:3px;">
          <strong>1. Pre-Bundle in 25s:</strong> Rubber-band physical ballots into packets of <strong>25 ballots</strong>.
        </div>
        <div style="background:#fff;padding:3px 6px;border:1px solid #eab308;border-radius:3px;">
          <strong>2. Milestone Rule:</strong> Each 25-ballot packet MUST yield <strong>exactly 50 votes</strong> (2 × 25).
        </div>
        <div style="background:#fff;padding:3px 6px;border:1px solid #eab308;border-radius:3px;">
          <strong>3. Lock &amp; Proceed:</strong> Verify subtotal = 50 before opening the next batch. Sum rows at the end.
        </div>
      </div>
    </div>

    <!-- Section 1: Ballot & Batch Target Account -->
    <table style="width:100%;margin-bottom:6px;font-size:10.5px;">
      <tr>
        <td style="width:35%;padding:4px 6px;font-weight:bold;background:#f3f4f6">
          Total Physical Ballots in Box: <br>
          <span style="font-size:14px;font-family:monospace">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] Ballots</span>
        </td>
        <td style="width:35%;padding:4px 6px;font-weight:bold;background:#e0e7ff;text-align:center">
          Expected Total Accountable Votes: <br>
          <span style="font-size:14px;font-family:monospace;color:#1e40af">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] = 2 × Ballots</span>
        </td>
        <td style="width:30%;padding:4px 6px;font-size:9.5px;background:#f9fafb;line-height:1.3">
          <strong>Dual-Vote Rule Reminder:</strong><br>
          • 2 candidates marked = 1 vote to each<br>
          • 1 candidate marked = 1 Valid + 1 Invalid<br>
          • NOTA = 2 NOTA | Overvote = 2 Invalid
        </td>
      </tr>
    </table>

    <!-- Section 2: Batch-of-25 Milestone Tally Matrix -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:6px;font-size:10.5px;">
      <thead>
        <tr>
          <th style="width:3%;text-align:center;padding:4px 2px;">#</th>
          <th style="width:25%;text-align:left;padding:4px 6px;">Candidate Name &amp; Class</th>
          <th style="width:12%;text-align:center;padding:4px 2px;">
            Batch 1 (1–25)
            <div style="font-size:8.5px;font-weight:normal;color:#555">Target: 50 votes</div>
          </th>
          <th style="width:12%;text-align:center;padding:4px 2px;">
            Batch 2 (26–50)
            <div style="font-size:8.5px;font-weight:normal;color:#555">Target: 50 votes</div>
          </th>
          <th style="width:12%;text-align:center;padding:4px 2px;">
            Batch 3 (51–75)
            <div style="font-size:8.5px;font-weight:normal;color:#555">Target: 50 votes</div>
          </th>
          <th style="width:12%;text-align:center;padding:4px 2px;">
            Batch 4 (76–100)
            <div style="font-size:8.5px;font-weight:normal;color:#555">Target: 50 votes</div>
          </th>
          <th style="width:11%;text-align:center;padding:4px 2px;">
            Remainder Batch
            <div style="font-size:8.5px;font-weight:normal;color:#555">Target: 2 × Rem</div>
          </th>
          <th style="width:13%;text-align:center;padding:4px 2px;background:#e0e7ff;">
            FINAL TOTAL
            <div style="font-size:8.5px;font-weight:normal;color:#1e40af">Transfer to Form 6</div>
          </th>
        </tr>
      </thead>
      <tbody>
        ${candsList.map((c, i) => `
          <tr>
            <td style="text-align:center;font-weight:bold;padding:5px 2px;">${i + 1}</td>
            <td style="font-weight:bold;padding:5px 6px;">
              ${esc(c.candidateName)}
              <div style="font-size:8.5px;font-weight:normal;color:#555">${esc(c.candidateClass || '')}</div>
            </td>
            <td style="padding:5px 4px;"></td>
            <td style="padding:5px 4px;"></td>
            <td style="padding:5px 4px;"></td>
            <td style="padding:5px 4px;"></td>
            <td style="padding:5px 4px;"></td>
            <td style="padding:5px 4px;background:#f8fafc;font-weight:bold;font-size:12px;text-align:center;"></td>
          </tr>
        `).join('')}
        <tr>
          <td style="text-align:center;font-weight:bold;padding:5px 2px;">–</td>
          <td style="font-weight:bold;padding:5px 6px;">NOTA</td>
          <td style="padding:5px 4px;"></td>
          <td style="padding:5px 4px;"></td>
          <td style="padding:5px 4px;"></td>
          <td style="padding:5px 4px;"></td>
          <td style="padding:5px 4px;"></td>
          <td style="padding:5px 4px;background:#f8fafc;font-weight:bold;font-size:12px;text-align:center;"></td>
        </tr>
        <tr>
          <td style="text-align:center;font-weight:bold;padding:5px 2px;">–</td>
          <td style="padding:5px 6px;">
            <strong style="color:#b91c1c;">INVALID</strong>
            <div style="font-size:8.5px;color:#555;">(Unmatched 1-choice, Overvote &gt;2, Blank)</div>
          </td>
          <td style="padding:5px 4px;"></td>
          <td style="padding:5px 4px;"></td>
          <td style="padding:5px 4px;"></td>
          <td style="padding:5px 4px;"></td>
          <td style="padding:5px 4px;"></td>
          <td style="padding:5px 4px;background:#f8fafc;font-weight:bold;font-size:12px;text-align:center;color:#b91c1c;"></td>
        </tr>

        <!-- Batch Milestone Verification Subtotal Row -->
        <tr style="background:#fef3c7;font-weight:bold;border-top:2px solid #000;">
          <td colspan="2" style="text-align:right;padding:5px 6px;font-size:10px;letter-spacing:0.5px;">
            BATCH TOTAL VOTES:
          </td>
          <td style="text-align:center;padding:5px;font-size:11px;font-family:monospace;">[ &nbsp;&nbsp;&nbsp;&nbsp; ]</td>
          <td style="text-align:center;padding:5px;font-size:11px;font-family:monospace;">[ &nbsp;&nbsp;&nbsp;&nbsp; ]</td>
          <td style="text-align:center;padding:5px;font-size:11px;font-family:monospace;">[ &nbsp;&nbsp;&nbsp;&nbsp; ]</td>
          <td style="text-align:center;padding:5px;font-size:11px;font-family:monospace;">[ &nbsp;&nbsp;&nbsp;&nbsp; ]</td>
          <td style="text-align:center;padding:5px;font-size:11px;font-family:monospace;">[ &nbsp;&nbsp;&nbsp;&nbsp; ]</td>
          <td style="text-align:center;padding:5px;background:#dbeafe;font-size:13px;font-weight:black;"></td>
        </tr>

        <!-- Batch Balance Check (Must Equal Target) -->
        <tr style="background:#f9fafb;font-size:9.5px;border-bottom:2px double #000;">
          <td colspan="2" style="text-align:right;padding:4px 6px;font-weight:bold;color:#444;">
            MILESTONE CHECK:
          </td>
          <td style="text-align:center;padding:3px;color:#15803d;font-weight:bold;">= 50 [ &nbsp; ]</td>
          <td style="text-align:center;padding:3px;color:#15803d;font-weight:bold;">= 50 [ &nbsp; ]</td>
          <td style="text-align:center;padding:3px;color:#15803d;font-weight:bold;">= 50 [ &nbsp; ]</td>
          <td style="text-align:center;padding:3px;color:#15803d;font-weight:bold;">= 50 [ &nbsp; ]</td>
          <td style="text-align:center;padding:3px;color:#15803d;font-weight:bold;">= 2×Rem [ &nbsp; ]</td>
          <td style="text-align:center;padding:3px;font-weight:bold;color:#1e40af;">GRAND TOTAL</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top:6px;border-top:1px dashed #777;padding-top:4px;font-size:9.5px;color:#555;font-style:italic;text-align:center;">
      * Working tally sheet for Table Counting Officers. Verify each 25-ballot packet milestone before opening the next. Transfer final verified totals directly onto official Counting Form (Form 6). No signatures required.
    </div>
  </div>`;
}

