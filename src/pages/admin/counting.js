import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading, isYearEligible, sortPosts, isAssocPost, isYearRepPost, comparePosts } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { saveCountingMeta, getCountingMeta, getAllResultsLocally } from '../../offlineStorage.js';
import { router } from '../../router.js';

export function isUuc(postName) {
  if (!postName) return false;
  const u = String(postName).toUpperCase();
  return u.includes('UUC') || u.includes('UNIVERSITY UNION COUNCILLOR') || u.includes('COUNCILLOR');
}

/**
 * Automatically deduces physical ballots polled at a counting table
 * by inspecting results entered for single-vote general posts (Chairman, Gen Sec, etc.).
 * Dual-vote UUC post is explicitly excluded because voters cast 2 votes on UUC ballots.
 */
export function deduceBallotsFromResults(results, tableNum) {
  if (!Array.isArray(results) || !results.length) return null;
  const tableResults = results.filter(r => String(r.TableNumber) === String(tableNum));
  if (!tableResults.length) return null;

  const postVoteSums = {};
  tableResults.forEach(r => {
    const p = String(r.Post || '').trim();
    if (!p || isUuc(p)) return; // Exclude UUC dual-vote post!
    const v = parseInt(r.Votes, 10) || 0;
    postVoteSums[p] = (postVoteSums[p] || 0) + v;
  });

  const validEntries = Object.entries(postVoteSums).filter(([_, count]) => count > 0);
  if (!validEntries.length) return null;

  // Prioritize executive single-vote general posts
  const priorityOrder = ['CHAIRMAN', 'GENERAL SECRETARY', 'VICE CHAIRMAN', 'JOINT SECRETARY', 'ARTS CLUB SECRETARY', 'STUDENT EDITOR', 'MAGAZINE EDITOR'];
  for (const prio of priorityOrder) {
    const match = validEntries.find(([pName]) => pName.toUpperCase().includes(prio));
    if (match) {
      return { ballots: match[1], postName: match[0] };
    }
  }

  // Fallback to highest ballot sum among single-vote posts
  validEntries.sort((a, b) => b[1] - a[1]);
  return { ballots: validEntries[0][1], postName: validEntries[0][0] };
}

/**
 * Sorts election posts specifically for statutory counting order:
 * 1. Department Association Secretaries (FIRST, Alphabetical)
 * 2. Year / Class Representatives (SECOND, Year order)
 * 3. General Union Executive Seats (THIRD, Seniority order)
 * 4. University Union Councillor (UUC - LAST ALWAYS)
 */
export function sortPostsForCounting(posts) {
  if (!Array.isArray(posts)) return [];
  const uuc = posts.filter(p => isUuc(p?.post || p?.name || p));
  const assoc = posts.filter(p => !uuc.includes(p) && (isAssocPost(p) || Boolean(p?.deptRestriction) || Boolean(p?.restrictedDept)));
  const reps = posts.filter(p => !uuc.includes(p) && !assoc.includes(p) && isYearRepPost(p));
  const general = posts.filter(p => !uuc.includes(p) && !assoc.includes(p) && !reps.includes(p));

  assoc.sort(comparePosts);
  reps.sort(comparePosts);
  general.sort(comparePosts);
  uuc.sort(comparePosts);

  return [...assoc, ...reps, ...general, ...uuc];
}

export async function renderAdminCounting(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  router.registerCleanup(() => {
    document.querySelectorAll('#modalBpa, #modalSpecificForms').forEach(el => el.remove());
  });
  renderAdminLayout(container, 'counting', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading Counting Setup & Officials...</p></div>
  `);

  try {
    const [savedMatrix, posts, nominationsRaw, booths, nominalRoll, settings, officialsRaw, resultsRaw] = await Promise.all([
      api.adminGetCountingMatrix(pwd, true).catch(() => null),
      api.getPosts().catch(() => []),
      api.adminGetNominations(pwd).catch(() => []),
      api.adminGetBooths(pwd, true).catch(() => []),
      api.getNominalRoll().catch(() => []),
      api.adminGetSettings(pwd).catch(() => ({})),
      api.adminGetOfficials(pwd, true).catch(() => null),
      api.adminGetResults(pwd, true).catch(() => [])
    ]);

    const allNoms = Array.isArray(nominationsRaw) ? nominationsRaw : [];
    const finalList = allNoms.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');
    const boothsList = Array.isArray(booths) ? booths : (Array.isArray(booths?.booths) ? booths.booths : []);
    const postsList = Array.isArray(posts) ? posts : (Array.isArray(posts?.posts) ? posts.posts : []);
    const nominalRollList = Array.isArray(nominalRoll) ? nominalRoll : [];
    const resultsList = Array.isArray(resultsRaw) ? resultsRaw : (Array.isArray(resultsRaw?.results) ? resultsRaw.results : []);

    let countingTeams = [];
    if (officialsRaw && Array.isArray(officialsRaw.countingTeams)) {
      countingTeams = officialsRaw.countingTeams;
    } else {
      try {
        countingTeams = JSON.parse(localStorage.getItem('gcc_counting_teams') || '[]');
      } catch (_) {}
    }

    // Cache metadata in IndexedDB for offline access
    await saveCountingMeta({ savedMatrix, posts: postsList, finalList, booths: boothsList, settings, countingTeams, nominalRoll: nominalRollList, results: resultsList });

    renderCountingUI(container.querySelector('#adminMain'), pwd, savedMatrix, postsList, finalList, boothsList, nominalRollList, settings, false, countingTeams, resultsList);
  } catch (e) {
    console.warn('Counting online load failed, checking IndexedDB cache:', e);
    const cached = await getCountingMeta();
    const localResults = await getAllResultsLocally().catch(() => []);
    if (cached && cached.savedMatrix) {
      renderCountingUI(
        container.querySelector('#adminMain'),
        pwd,
        cached.savedMatrix,
        cached.posts || [],
        cached.finalList || [],
        cached.booths || [],
        cached.nominalRoll || [],
        cached.settings || {},
        true,
        cached.countingTeams || [],
        localResults.length ? localResults : (cached.results || [])
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

function renderCountingUI(main, pwd, savedMatrix, posts, finalList, booths, nominalRoll, settings = {}, isOffline = false, countingTeams = [], allResults = []) {
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
        <button id="btnGoToBooths" class="btn btn-primary btn-sm text-xs font-bold" title="Action: Navigates to Polling Booths configuration to set up physical booths and class allocations.&#10;Prerequisite: Ensure Nominal Roll has been imported.">Go to Polling Booths Setup</button>
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

  const getPostDept = (p) => {
    if (p?.restrictedDept) return String(p.restrictedDept).toUpperCase().trim();
    const name = pName(p);
    const prefixRegex = /^ASSOCIATION\s+SECRETARY\s*(FOR\s*|\s*-\s*|\s*:\s*|\s+OF\s*)?/i;
    if (prefixRegex.test(name)) {
      return name.replace(prefixRegex, '').toUpperCase().trim();
    }
    return null;
  };

  const getBoothClasses = (b) => {
    if (Array.isArray(b?.classes)) return b.classes;
    if (typeof b?.classes === 'string') return b.classes.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };

  let currentSavedMatrix = savedMatrix;
  let localBpa = {};
  try {
    localBpa = JSON.parse(localStorage.getItem('gcc_table_polled_ballots') || '{}');
  } catch (_) {}
  let tablePolledBallots = {
    ...(currentSavedMatrix?.tablePolledBallots || {}),
    ...localBpa
  };

  // Helper to get voter count for a table/booth
  const getVoterCountForTable = (tableNum) => {
    const b = boothsList.find(booth => Number(booth?.boothNumber) === Number(tableNum)) || boothsList[Number(tableNum) - 1];
    return getBoothVoterCount(b, nominalRollList);
  };

  // Helper to determine effective voter count (BPA polled ballots vs nominal roll allotted)
  const getEffectiveVoterCountForTable = (tableNum) => {
    const b = boothsList.find(booth => Number(booth?.boothNumber) === Number(tableNum)) || boothsList[Number(tableNum) - 1];
    const allotted = getBoothVoterCount(b, nominalRollList);
    const sTable = String(tableNum);

    // 1. Manual entry in tablePolledBallots
    const manual = parseInt(tablePolledBallots[sTable], 10);
    if (!isNaN(manual) && manual > 0) {
      return { count: manual, isActual: true, source: 'manual', allotted };
    }

    // 2. Auto-deduced from single-vote general posts
    const deduced = deduceBallotsFromResults(allResults, tableNum);
    if (deduced && deduced.ballots > 0) {
      return { count: deduced.ballots, isActual: true, source: 'deduced', deducedPost: deduced.postName, allotted };
    }

    // 3. Fallback to nominal roll allotted count
    return { count: allotted, isActual: false, source: 'allotted', allotted };
  };

  const saveTablePolledBallots = async (newBpa) => {
    tablePolledBallots = { ...newBpa };
    try {
      localStorage.setItem('gcc_table_polled_ballots', JSON.stringify(tablePolledBallots));
    } catch (_) {}

    const updated = currentSavedMatrix ? { ...currentSavedMatrix, tablePolledBallots } : { tablePolledBallots };
    currentSavedMatrix = updated;

    try {
      await api.adminSaveCountingMatrix(pwd, updated);
      await saveCountingMeta({
        savedMatrix: updated,
        posts: postsList,
        finalList: candidatesList,
        booths: boothsList,
        settings,
        countingTeams,
        nominalRoll: nominalRollList,
        results: allResults
      });
      showToast('Ballot Paper Account saved. UUC Tally Sheets updated with actual ballot targets.', 'success');
    } catch (e) {
      console.warn('Online save BPA failed, saving locally:', e);
      await saveCountingMeta({
        savedMatrix: updated,
        posts: postsList,
        finalList: candidatesList,
        booths: boothsList,
        settings,
        countingTeams,
        nominalRoll: nominalRollList,
        results: allResults
      });
      showToast('Saved locally to IndexedDB (Offline mode).', 'info');
    }
    renderDisplay(updated);
  };

  // ── Render Display ─────────────────────────────────────────────────────────
  const renderDisplay = (data) => {
    currentSavedMatrix = data;
    tablePolledBallots = {
      ...(currentSavedMatrix?.tablePolledBallots || {}),
      ...localBpa,
      ...tablePolledBallots
    };
    const matrix = Array.isArray(data?.matrix) ? data.matrix : [];
    const formSerials = data?.formSerials && typeof data.formSerials === 'object' ? data.formSerials : {};
    const totalRounds = Number(data?.totalRounds) || (matrix[0] ? matrix[0].length : 0);
    const roundLabels = Array.isArray(data?.roundLabels) && data.roundLabels.length === totalRounds
      ? data.roundLabels
      : Array.from({ length: totalRounds }, (_, i) => `Round ${i + 1}`);
    const T = boothsList.length;
    const isMismatch = matrix.length !== T;

    // Build list of active contesting posts sorted statutorily (Assoc 1st, Reps, General, UUC Last)
    const sortedPostObjects = sortPostsForCounting(postsList);

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
        const b = boothsList[t];
        const bNum = b?.boothNumber || (t + 1);
        const roomName = b?.roomName || `Table ${bNum}`;
        const serial = formSerials[`${t}-${r}`] || `${t + 1}-${r + 1}`;
        const supName = getSupervisorNameForTable(bNum, countingTeams);
        const voterCount = getBoothVoterCount(b, nominalRollList);
        if (!postTableMap[pn]) postTableMap[pn] = [];
        postTableMap[pn].push({
          tIndex: t,
          roundIndex: r,
          tableNum: bNum,
          roundNum: r + 1,
          roomName,
          serial,
          supervisorName: supName,
          voterCount,
          booth: b
        });
      }
    }

    // Ensure every post's table list is strictly sorted Table Number wise (1 to T)
    Object.values(postTableMap).forEach(list => {
      list.sort((a, b) => Number(a.tableNum) - Number(b.tableNum) || Number(a.roundNum) - Number(b.roundNum));
    });

    // Compile comprehensive list of all scheduled counting forms
    const allFormsList = [];
    for (let t = 0; t < T; t++) {
      const bNum = boothsList[t]?.boothNumber || (t + 1);
      const roomName = boothsList[t]?.roomName || `Table ${bNum}`;
      const supName = getSupervisorNameForTable(bNum, countingTeams);
      for (let r = 0; r < totalRounds; r++) {
        const post = matrix[t] ? matrix[t][r] : null;
        if (!post) continue;
        const pn = pName(post);
        const serial = formSerials[`${t}-${r}`] || `${bNum}-${r + 1}`;
        const candsCount = candidatesList.filter(c => c.post === pn).length;
        allFormsList.push({
          key: `${t}-${r}`,
          altKey: `${bNum}-${r + 1}`,
          t,
          r,
          bNum,
          roundNum: r + 1,
          pn,
          serial,
          roomName,
          supName,
          candsCount
        });
      }
    }

    const tablesWithPolledCount = boothsList.filter((b, t) => {
      const bNum = b?.boothNumber || (t + 1);
      const eff = getEffectiveVoterCountForTable(bNum);
      return eff.isActual;
    }).length;

    // Detect if current matrix adheres to statutory counting order
    // (Associations 1st, General Union Posts rotated across tables, UUC Last Always)
    const isOrderStatutory = (() => {
      if (!Array.isArray(matrix) || !matrix.length || matrix.length !== T) return true;
      for (let t = 0; t < T; t++) {
        const row = matrix[t];
        if (!Array.isArray(row)) continue;
        const nonNull = row.filter(Boolean);
        if (!nonNull.length) continue;
        const lastP = nonNull[nonNull.length - 1];
        const hasUuc = nonNull.some(p => isUuc(pName(p)));
        if (hasUuc && !isUuc(pName(lastP))) return false;
        const firstP = nonNull[0];
        const hasAssoc = nonNull.some(p => isAssocPost(p) || Boolean(getPostDept(p)));
        if (hasAssoc && !isAssocPost(firstP) && !getPostDept(firstP)) return false;
      }
      if (T > 1) {
        const findFirstGen = (row) => row.find(p => p && !isUuc(pName(p)) && !isAssocPost(p) && !isYearRepPost(p));
        const g0 = findFirstGen(matrix[0] || []);
        const g1 = findFirstGen(matrix[1] || []);
        if (g0 && g1 && pName(g0) === pName(g1)) return false;
      }
      return true;
    })();

    main.innerHTML = `
      <div id="adminCountingRoot" class="page-enter space-y-6">
        ${isMismatch ? `
          <div class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">⚠️</span>
              <div>
                <strong>Booth Configuration Mismatch:</strong>
                <span>The saved counting matrix was generated for <strong>${matrix.length} tables</strong>, but there are currently <strong>${T} polling booths</strong> configured.</span>
              </div>
            </div>
            <button id="btnNoticeRegenerate" class="btn btn-sm bg-amber-500 hover:bg-amber-600 text-black font-bold shrink-0" title="Action: Regenerates the table × round counting matrix to adapt to the updated number of polling booths.&#10;Prerequisite: Confirm that current booth configurations are finalized.">
              🔄 Regenerate Matrix Now
            </button>
          </div>
        ` : ''}

        ${!isMismatch && !isOrderStatutory ? `
          <div class="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">🔄</span>
              <div>
                <strong>Statutory Allocation Order Notice:</strong>
                <span>Current matrix does not follow statutory counting order (<strong>Department Associations 1st</strong>, <strong>General Union Posts rotated across tables each round</strong>, and <strong>UUC Last Always</strong>).</span>
              </div>
            </div>
            <button id="btnOrderRegenerate" class="btn btn-sm bg-indigo-600 hover:bg-indigo-500 text-white font-bold shrink-0 shadow" title="Action: Re-runs statutory counting allocation algorithm: Associations 1st, General Union Posts rotated across tables, UUC Last Always.">
              🔄 Re-align Matrix Now
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
            <p class="text-slate-400 text-sm mt-0.5">${T} tables · ${totalRounds} rounds · ${postsList.length} posts total · ${allFormsList.length} counting forms</p>
          </div>
          <div class="flex gap-2 flex-wrap items-center">
            <button id="btnOpenBpaModal" class="btn btn-secondary border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm" title="Action: Enter or auto-detect actual ballots polled in box (Ballot Paper Account / Form 5 / PO Diary) per table to calibrate UUC 25-ballot batches and expected vote totals.">
              <span>🗳️</span> Ballot Paper Account ${tablesWithPolledCount > 0 ? `<span class="badge bg-emerald-500/30 text-emerald-200 border border-emerald-500/50 text-[10px] py-0 px-1 font-mono">${tablesWithPolledCount}/${T} Polled</span>` : ''}
            </button>
            <a href="#/admin/officials" class="btn btn-secondary border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white text-xs font-semibold flex items-center gap-1.5" title="Action: Opens the Election Officials Team Builder to allot Counting Supervisors and Counting Assistants to tables.&#10;Prerequisite: Configure booths/tables and upload staff rosters first.">
              <span>👥</span> Allot Counting Teams
            </a>
            <button id="btnRegenerate" class="btn btn-secondary bg-white/5 border-white/10 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5" title="Action: Re-runs statutory counting allocation: Department Associations 1st, General Union Posts rotated across tables each round, and UUC Last Always.&#10;Prerequisite: Recommended if candidate lists or booth configurations have changed.">
              <span>🔄</span> Regenerate Matrix
            </button>
          </div>
        </div>

        <!-- Dedicated Printing & Consolidation Toolbar -->
        <div class="glass p-4 sm:p-5 rounded-2xl border border-indigo-500/30 shadow-2xl no-print space-y-4 bg-slate-900/60 backdrop-blur-md">
          
          <!-- Row 1: Flexible Scope & Filter Selectors -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pb-3.5 border-b border-white/10">
            <!-- 1. Post Selector -->
            <div>
              <label for="selPostPrint" class="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <span>🎯</span> Target Post:
              </label>
              <select id="selPostPrint" class="field text-xs py-2 px-3 bg-black/40 border border-white/20 hover:border-indigo-400/50 rounded-xl text-white font-medium w-full focus:outline-none focus:border-indigo-400 shadow-inner transition-colors" title="Filter counting forms by election post">
                <option value="all">🌟 All Posts (Complete Election)</option>
                ${sortedPostObjects.map(p => {
                  const pn = pName(p);
                  const isPostUuc = isUuc(pn);
                  const countTbls = (postTableMap[pn] || []).length;
                  return `<option value="${esc(pn)}">${esc(pn)} (${countTbls} table${countTbls === 1 ? '' : 's'})${isPostUuc ? ' ⭐' : ''}</option>`;
                }).join('')}
              </select>
            </div>

            <!-- 2. Booth / Table Selector -->
            <div>
              <label for="selBoothPrint" class="text-[11px] font-bold text-sky-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <span>🪑</span> Polling Booth / Table:
              </label>
              <select id="selBoothPrint" class="field text-xs py-2 px-3 bg-black/40 border border-white/20 hover:border-sky-400/50 rounded-xl text-white font-medium w-full focus:outline-none focus:border-sky-400 shadow-inner transition-colors" title="Filter counting forms for a specific table or all tables">
                <option value="all">🏢 All Booths / Tables (1 to ${T})</option>
                ${boothsList.map((b, t) => {
                  const bNum = b.boothNumber || (t + 1);
                  const supName = getSupervisorNameForTable(bNum, countingTeams);
                  const room = b.roomName ? ` (${b.roomName})` : '';
                  return `<option value="${bNum}">Table ${bNum}${esc(room)}${supName ? ` · ${esc(supName)}` : ''}</option>`;
                }).join('')}
              </select>
            </div>

            <!-- 3. Counting Round Selector -->
            <div>
              <label for="selRoundPrint" class="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <span>🔄</span> Counting Round:
              </label>
              <select id="selRoundPrint" class="field text-xs py-2 px-3 bg-black/40 border border-white/20 hover:border-amber-400/50 rounded-xl text-white font-medium w-full focus:outline-none focus:border-amber-400 shadow-inner transition-colors" title="Filter counting forms for a specific round or all rounds">
                <option value="all">🔢 All Rounds (1 to ${totalRounds})</option>
                ${Array.from({ length: totalRounds }, (_, r) => `
                  <option value="${r + 1}">Round ${r + 1}</option>
                `).join('')}
              </select>
            </div>

            <!-- 4. Collate / Sorting Order -->
            <div>
              <label for="selCollatePrint" class="text-[11px] font-bold text-purple-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <span>📑</span> Print Collate Order:
              </label>
              <select id="selCollatePrint" class="field text-xs py-2 px-3 bg-black/40 border border-white/20 hover:border-purple-400/50 rounded-xl text-white font-medium w-full focus:outline-none focus:border-purple-400 shadow-inner transition-colors" title="Select whether sheets are grouped by Table packets or Round batches">
                <option value="table">🪑 Group by Table (Table 1 R1..Rn, Table 2...)</option>
                <option value="round">🔄 Group by Round (Round 1 T1..Tn, Round 2...)</option>
              </select>
            </div>
          </div>

          <!-- Filter Toolbar Actions: Quick Specific Picker & Layout / Recount Controls -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-0.5">
            <div class="flex items-center gap-2 flex-wrap">
              <button type="button" id="btnOpenFormPicker" class="btn btn-secondary text-xs px-3 py-1.5 rounded-xl border-purple-500/40 bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 flex items-center gap-1.5 font-bold shadow-sm" title="Action: Opens interactive checklist to pick exact custom forms to print.">
                <span>☑️</span> Pick Specific Forms...
              </button>
              <button type="button" id="btnResetPrintFilters" class="btn btn-secondary text-xs px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white border-white/10" title="Reset all scope filters to All Posts, All Booths, All Rounds">
                <span>↺</span> Reset Filters
              </button>
            </div>

            <!-- Settings: Orientation & Recount Mode -->
            <div class="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
              <!-- Orientation Selector -->
              <div class="flex items-center gap-1.5 bg-black/40 border border-white/15 px-3 py-1.5 rounded-xl text-xs shadow-inner">
                <label for="selOrientation" class="text-[11px] font-semibold text-slate-400">Layout:</label>
                <select id="selOrientation" class="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer" title="Action: Switches print layout format between Portrait and Landscape.">
                  <option value="portrait" class="bg-slate-900 text-white">📄 Portrait</option>
                  <option value="landscape" class="bg-slate-900 text-white">📄 Landscape</option>
                </select>
              </div>

              <!-- Recount Mode Toggle -->
              <label class="flex items-center gap-2 cursor-pointer text-xs font-bold px-3 py-1.5 rounded-xl select-none transition-all border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 shadow-sm" title="Action: Toggles statutory Recount Mode, adding high-visibility 'RECOUNTING' headers and audit stamps to all printed forms.">
                <input type="checkbox" id="chkRecountMode" class="rounded accent-amber-500 w-4 h-4 cursor-pointer">
                <span>🔁 Recounting Mode</span>
              </label>
            </div>
          </div>

          <!-- Row 2: Print Actions Grid (Balanced 4 Equal Columns) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <!-- 1. Counting Forms -->
            <button type="button" id="btnPrintForms" class="btn btn-primary text-xs font-bold py-2.5 px-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]" title="Action: Prints statutory Form 6 Counting Sheets matching current filters (Booth, Round, Post).">
              <span>🖨️</span>
              <span id="labelPrintForms" class="truncate">Print Counting Forms</span>
            </button>

            <!-- 2. Tabulation Sheet -->
            <button type="button" id="btnPrintConsolidation" class="btn btn-secondary text-xs font-semibold py-2.5 px-3.5 rounded-xl border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]" title="Action: Prints the official Manual Tabulation & Consolidation Register (Form 7) across counting tables.">
              <span>📊</span>
              <span id="labelPrintConsolidation" class="truncate">Tabulation Sheet</span>
            </button>

            <!-- 3. UUC Tally Sheet -->
            <button type="button" id="btnPrintUucTally" class="btn btn-secondary text-xs font-semibold py-2.5 px-3.5 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]" title="Action: Prints dual-vote batch tally sheets for University Union Councillor (Form 6-T).">
              <span>🧮</span>
              <span id="labelPrintUuc" class="truncate">UUC Tally Sheet</span>
            </button>

            <!-- 4. Full Post Dossier -->
            <button type="button" id="btnPrintPackage" class="btn btn-secondary text-xs font-bold py-2.5 px-3.5 rounded-xl border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] shadow-md" title="Action: Generates a complete comprehensive counting packet (Tabulation Register + Dual-Vote Tally Sheet + Table Counting Forms) for the selected post or booth.">
              <span>📑</span>
              <span id="labelPrintDossier" class="truncate">Full Post Dossier</span>
            </button>
          </div>

          <!-- Bottom Status & Hints Bar -->
          <div class="text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/5">
            <span id="printScopeHint" class="flex items-center gap-1.5 text-slate-300">
              💡 <strong>Scope:</strong> Batch printing all ${allFormsList.length} counting forms across all ${totalRounds} rounds and ${T} tables.
            </span>
            <div class="flex items-center gap-2.5">
              <span id="recountBadgeStatus" class="hidden text-amber-300 font-bold text-[10.5px] bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1">
                <span>⚠️</span> RECOUNT MODE ACTIVE
              </span>
              <span class="text-indigo-300 font-mono text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                Supervisor Auto-filled · Form # Serials Active
              </span>
            </div>
          </div>
        </div>

        <!-- Counting Matrix Table -->
        <div class="glass rounded-xl overflow-hidden no-print shadow-2xl">
          <div class="p-3 border-b border-white/10 bg-slate-900/60 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Table × Round Allocation Matrix</h4>
              <p class="text-[11px] text-slate-400 mt-0.5">Click any <strong>🖨️ Form</strong> button for 1-click printing, or click round/table headers to print entire batches.</p>
            </div>
            <span class="text-[11px] text-slate-500 font-mono">Form Serials: #1 .. #${T * totalRounds}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="data-table text-xs">
              <thead><tr>
                <th class="w-44">Table &amp; Supervisor</th>
                ${roundLabels.map((l, r) => `
                  <th class="text-center align-middle">
                    <div class="flex flex-col items-center gap-1 py-0.5">
                      <span class="font-bold">${esc(l)}</span>
                      <button type="button" class="btn-print-round-header px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer shadow-sm" data-round="${r + 1}" title="Print all counting forms for ${esc(l)} across all tables">
                        🖨️ All ${esc(l)}
                      </button>
                    </div>
                  </th>
                `).join('')}
              </tr></thead>
              <tbody>
                ${boothsList.map((b, t) => {
                  const bNum = b.boothNumber || (t + 1);
                  const supName = getSupervisorNameForTable(bNum, countingTeams);
                  const eff = getEffectiveVoterCountForTable(bNum);
                  const tableRow = Array.isArray(matrix[t]) 
                    ? matrix[t] 
                    : Array.from({ length: totalRounds }, () => null);
                  return `
                  <tr>
                    <td class="font-bold text-indigo-300 whitespace-nowrap bg-black/15">
                      <div class="flex items-center justify-between gap-1.5">
                        <div class="flex items-center gap-1.5">
                          <span class="text-sm">🪑</span>
                          <span>Table ${bNum}</span>
                        </div>
                        ${eff.isActual 
                          ? `<span class="badge bg-emerald-500/20 text-emerald-300 font-mono text-[9px] px-1.5 py-0.5 border border-emerald-500/40" title="Ballot Paper Account: ${eff.count} ballots in box (${eff.source === 'deduced' ? 'Auto-deduced from ' + eff.deducedPost : 'Manual Entry'}). Allotted: ${eff.allotted}">🗳️ ${eff.count} Polled</span>` 
                          : (eff.allotted > 0 ? `<span class="badge bg-indigo-500/20 text-indigo-300 font-mono text-[9px] px-1.5 py-0.5 border border-indigo-500/30" title="${eff.allotted} registered electors allotted (Turnout unknown)">${eff.allotted} Allotted</span>` : '')
                        }
                      </div>
                      <div class="text-[11px] text-slate-400 font-normal truncate max-w-[140px]" title="${esc(b.roomName || '')}">
                        ${esc(b.roomName || `Room ${bNum}`)}
                      </div>
                      <div class="text-[10px] text-slate-500 font-normal italic mt-0.5 truncate max-w-[140px]" title="Supervisor: ${esc(supName || 'Unassigned')}">
                        ${supName ? `👤 ${esc(supName)}` : '<span class="text-amber-400/80">⚠️ No supervisor</span>'}
                      </div>
                      <button type="button" class="btn-print-table-row w-full mt-2 py-1 px-1.5 rounded text-[9.5px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm" data-table="${bNum}" title="Print all counting forms for Table ${bNum} across all rounds">
                        <span>🖨️</span> Table ${bNum} Packet
                      </button>
                    </td>
                    ${tableRow.map((post, r) => {
                      if (!post) return '<td class="align-top py-2.5 min-w-[110px] text-slate-600">–</td>';
                      const pn = pName(post);
                      const isPostUuc = isUuc(pn);
                      const serial = formSerials[`${t}-${r}`] || `${bNum}-${r + 1}`;
                      const batches = isPostUuc ? getUucBatchesForVoterCount(eff.count) : [];
                      const batchSummary = isPostUuc ? getUucBatchesSummaryText(batches, eff.count) : '';
                      return `
                      <td class="align-top py-2.5 min-w-[125px]">
                        <div class="flex items-center justify-between gap-1 mb-1">
                          <span class="text-[10px] text-slate-400 font-mono font-bold">#${esc(serial)}</span>
                          <div class="flex items-center gap-1">
                            <button type="button" class="btn-print-matrix-cell px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-white/10 text-slate-200 hover:bg-indigo-600 hover:text-white border border-white/20 transition-all cursor-pointer shadow-sm" data-table="${bNum}" data-round="${r + 1}" data-post="${esc(pn)}" title="Print single Counting Form #${esc(serial)} (Table ${bNum}, Round ${r + 1}: ${esc(pn)})">
                              🖨️ Form
                            </button>
                            ${isPostUuc ? `
                              <button type="button" class="print-single-uuc-btn px-1.5 py-0.5 rounded text-[9px] font-bold ${eff.isActual ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'} hover:brightness-110 transition-all cursor-pointer shadow-sm" data-table="${bNum}" title="Print UUC Tally Sheet for Table ${bNum} (${eff.count} ${eff.isActual ? 'actual ballots in box' : 'allotted electors'}: ${batchSummary})">
                                🧮 ${eff.count ? `${eff.count}b` : '2-Seat'}
                              </button>
                            ` : ''}
                          </div>
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
                    <button type="button" class="btn btn-secondary btn-xs py-1 px-2 text-[11px] quick-print-forms" data-post="${esc(pn)}" title="Action: Prints counting forms (Form 6) for ${esc(pn)}.&#10;Prerequisite: Verify candidate list for ${esc(pn)}.">
                      🖨️ Forms
                    </button>
                    <button type="button" class="btn btn-secondary btn-xs py-1 px-2 text-[11px] quick-print-tab" data-post="${esc(pn)}" title="Action: Prints manual consolidation tabulation sheet (Form 7) for ${esc(pn)}.&#10;Prerequisite: Confirm counting tables and rounds.">
                      📊 Tabulation
                    </button>
                    ${postUuc ? `
                      <button type="button" class="btn btn-secondary btn-xs py-1 px-2 text-[11px] border-amber-500/40 text-amber-300 quick-print-uuc" data-post="${esc(pn)}" title="Action: Prints dual-vote batch tally sheet (Form 6-T) for ${esc(pn)}.&#10;Prerequisite: UUC dual vacancy candidate tallying.">
                        🧮 Tally
                      </button>
                    ` : ''}
                    <button type="button" class="btn btn-primary btn-xs py-1 px-2 text-[11px] quick-print-dossier" data-post="${esc(pn)}" title="Action: Prints complete post package (Forms + Tabulation + Tally) for ${esc(pn)}.&#10;Prerequisite: Ready to dispatch to counting hall.">
                      📑 All
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- ── Modal: Pick Specific Counting Forms ──────────────────────────────── -->
        <div id="modalSpecificForms" class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;">
          <div class="relative z-[10000] bg-slate-900 border border-indigo-500/40 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto" style="position: relative; z-index: 10000; max-height: 90vh;">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/60">
              <div class="flex items-center gap-2.5">
                <span class="text-2xl">🖨️</span>
                <div>
                  <h3 class="font-bold text-white text-base">Select Specific Counting Forms to Print</h3>
                  <p class="text-xs text-slate-400">Choose any combination of booths, rounds, or individual forms.</p>
                </div>
              </div>
              <button type="button" id="btnCloseSpecificModal" class="text-slate-400 hover:text-white text-xl p-1 rounded-lg hover:bg-white/10 transition-colors">✕</button>
            </div>

            <!-- Quick Preset Actions & Search Bar -->
            <div class="p-3.5 bg-slate-950/40 border-b border-white/10 space-y-2.5">
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div class="flex items-center gap-2 flex-1">
                  <input type="text" id="inputSearchModalForms" class="field text-xs py-1.5 px-3 bg-black/40 border border-white/20 rounded-xl text-white placeholder-slate-500 w-full focus:outline-none focus:border-indigo-400" placeholder="Search by post, table, round, or supervisor...">
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button type="button" id="btnModalSelectAll" class="btn btn-secondary btn-xs text-[11px] px-2.5 py-1">Select All (${allFormsList.length})</button>
                  <button type="button" id="btnModalClearAll" class="btn btn-secondary btn-xs text-[11px] px-2.5 py-1 text-slate-400">Clear All</button>
                </div>
              </div>

              <!-- Quick filters: By Round & By Table pills -->
              <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span class="text-slate-400 font-semibold mr-1">Quick Select:</span>
                <span class="text-indigo-300 font-bold">Rounds:</span>
                ${Array.from({ length: totalRounds }, (_, r) => `
                  <button type="button" class="btn-modal-toggle-round px-2 py-0.5 rounded text-[10.5px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white transition-colors" data-round="${r + 1}">
                    R${r + 1}
                  </button>
                `).join('')}
                <span class="text-slate-500 mx-1">|</span>
                <span class="text-sky-300 font-bold">Tables:</span>
                ${boothsList.map((b, t) => {
                  const bNum = b.boothNumber || (t + 1);
                  return `
                    <button type="button" class="btn-modal-toggle-table px-2 py-0.5 rounded text-[10.5px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500 hover:text-white transition-colors" data-table="${bNum}">
                      T${bNum}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Forms Checkbox Grid (Scrollable) -->
            <div id="modalFormsListContainer" class="p-4 overflow-y-auto max-h-[50vh] grid grid-cols-1 md:grid-cols-2 gap-2.5">
              ${allFormsList.map(f => `
                <label class="modal-form-item flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-black/25 hover:bg-indigo-950/20 hover:border-indigo-500/30 cursor-pointer select-none transition-all" data-search="${esc(`${f.pn} table ${f.bNum} round ${f.roundNum} ${f.roomName} ${f.supName} #${f.serial}`.toLowerCase())}" data-round="${f.roundNum}" data-table="${f.bNum}">
                  <input type="checkbox" class="chk-modal-form rounded accent-indigo-500 w-4 h-4 mt-0.5 shrink-0" data-key="${f.key}">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono text-[10px] font-bold">Form #${esc(f.serial)}</span>
                      <div class="flex items-center gap-1.5 text-[11px] font-bold">
                        <span class="text-sky-300">Table ${f.bNum}</span>
                        <span class="text-slate-500">•</span>
                        <span class="text-amber-300">Round ${f.roundNum}</span>
                      </div>
                    </div>
                    <div class="font-bold text-white text-xs truncate mt-1">${esc(f.pn)}</div>
                    <div class="flex items-center justify-between text-[10.5px] text-slate-400 mt-1">
                      <span class="truncate max-w-[170px]" title="${esc(f.roomName)}">📍 ${esc(f.roomName)}</span>
                      <span class="truncate max-w-[140px] text-slate-500" title="${esc(f.supName || 'No supervisor')}">${f.supName ? `👤 ${esc(f.supName)}` : '⚠️ No Sup'}</span>
                    </div>
                  </div>
                </label>
              `).join('')}
            </div>

            <!-- Footer -->
            <div class="p-3.5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between gap-3 flex-wrap">
              <div class="text-xs text-slate-300">
                Selected: <strong id="modalCountSelected" class="text-indigo-300 font-mono text-sm">0</strong> of <span class="font-mono">${allFormsList.length}</span> forms
              </div>
              <div class="flex items-center gap-2">
                <button type="button" id="btnCancelSpecificModal" class="btn btn-secondary text-xs px-3 py-1.5">Cancel</button>
                <button type="button" id="btnConfirmPrintSpecific" class="btn btn-primary text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-lg">
                  <span>🖨️</span>
                  <span>Print Selected Forms</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Modal: Ballot Paper Account & Actual Turnout Management ──────────────── -->
        <div id="modalBpa" class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;">
          <div class="relative z-[10000] bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto" style="position: relative; z-index: 10000; max-height: 92vh;">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/60">
              <div class="flex items-center gap-2.5">
                <span class="text-2xl">🗳️</span>
                <div>
                  <h3 class="font-bold text-white text-base">Ballot Paper Account &amp; Table Turnout (Form 5 / PO Diary)</h3>
                  <p class="text-xs text-slate-400">Set physical ballots polled per table to calibrate UUC 25-ballot milestone targets &amp; Form 6-T tally sheets.</p>
                </div>
              </div>
              <button type="button" id="btnCloseBpaModal" class="text-slate-400 hover:text-white text-xl p-1 rounded-lg hover:bg-white/10 transition-colors">✕</button>
            </div>

            <!-- Quick Auto-Detect & Bulk Presets Bar -->
            <div class="p-3.5 bg-slate-950/40 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5">
              <div class="flex items-center gap-2 flex-wrap">
                <button type="button" id="btnBpaAutoDetect" class="btn btn-secondary btn-xs text-xs px-3 py-1.5 rounded-xl border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-black font-bold flex items-center gap-1.5 shadow-sm" title="Inspect counting data entries for single-vote general posts (Chairman, Gen Sec, etc.) and auto-fill polled ballots count for all tables.">
                  <span>⚡</span> Auto-Detect All from General Seats Results
                </button>
                <button type="button" id="btnBpaResetAllotted" class="btn btn-secondary btn-xs text-xs px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white border-white/10" title="Clear all manual overrides and revert to nominal roll allotted electors">
                  <span>🔄</span> Reset to Allotted Electors
                </button>
              </div>
              <div class="text-[11px] text-slate-400">
                <span class="text-emerald-400 font-bold">ℹ️ Note:</span> Dual-vote UUC post is excluded; ballots are deduced from single-vote executive posts.
              </div>
            </div>

            <!-- Table of Booths (Scrollable) -->
            <div class="p-4 overflow-y-auto max-h-[55vh]">
              <table class="data-table text-xs w-full">
                <thead>
                  <tr class="bg-black/40">
                    <th class="w-32">Table / Booth</th>
                    <th class="text-center w-24">Allotted Electors</th>
                    <th class="text-left w-48">Detected from Results</th>
                    <th class="text-center w-36">Actual Ballots in Box</th>
                    <th class="text-center w-24">Turnout %</th>
                    <th class="text-left">UUC 25-Ballot Batches Preview</th>
                  </tr>
                </thead>
                <tbody id="bpaTableBody">
                  <!-- Populated dynamically -->
                </tbody>
              </table>
            </div>

            <!-- Footer Stats & Save -->
            <div class="p-3.5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between gap-3 flex-wrap">
              <div class="flex items-center gap-4 text-xs text-slate-300">
                <div>Total Allotted: <strong id="bpaTotalAllotted" class="text-indigo-300 font-mono text-sm">0</strong></div>
                <div>Total Polled: <strong id="bpaTotalPolled" class="text-emerald-300 font-mono text-sm">0</strong></div>
                <div>Overall Turnout: <strong id="bpaOverallTurnout" class="text-amber-300 font-mono text-sm">0%</strong></div>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" id="btnCancelBpaModal" class="btn btn-secondary text-xs px-3 py-1.5">Cancel</button>
                <button type="button" id="btnSaveBpaModal" class="btn btn-primary text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-lg bg-emerald-600 hover:bg-emerald-500">
                  <span>💾</span>
                  <span>Save &amp; Apply to Tally Sheets</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>`;

    // Clean up any existing portaled modal instances in document.body
    document.querySelectorAll('#modalBpa, #modalSpecificForms').forEach(el => {
      if (el.parentElement === document.body) el.remove();
    });

    // Portal modals directly to document.body so they attach to the top-level viewport window
    // (immune to #adminCountingRoot page-enter transform and #adminMain scroll containment)
    const modalSpecific = main.querySelector('#modalSpecificForms');
    if (modalSpecific) {
      document.body.appendChild(modalSpecific);
    }
    const modalBpa = main.querySelector('#modalBpa');
    if (modalBpa) {
      document.body.appendChild(modalBpa);
    }

    // ─── Attach Events ────────────────────────────────────────────────────────
    const selPostPrint = main.querySelector('#selPostPrint');
    const selBoothPrint = main.querySelector('#selBoothPrint');
    const selRoundPrint = main.querySelector('#selRoundPrint');
    const selCollatePrint = main.querySelector('#selCollatePrint');
    const labelPrintForms = main.querySelector('#labelPrintForms');
    const labelPrintConsolidation = main.querySelector('#labelPrintConsolidation');
    const labelPrintDossier = main.querySelector('#labelPrintDossier');
    const btnPrintUucTally = main.querySelector('#btnPrintUucTally');
    const printScopeHint = main.querySelector('#printScopeHint');
    const chkRecountMode = main.querySelector('#chkRecountMode');
    const selOrientation = main.querySelector('#selOrientation');
    const recountBadgeStatus = main.querySelector('#recountBadgeStatus');

    // Helper: Compute matching scheduled forms based on current filters and ordering
    const getMatchingForms = ({
      postFilter = 'all',
      boothFilter = 'all',
      roundFilter = 'all',
      collateOrder = 'table',
      specificKeys = null
    }) => {
      const forms = [];
      if (specificKeys && (specificKeys instanceof Set ? specificKeys.size > 0 : specificKeys.length > 0)) {
        const keySet = specificKeys instanceof Set ? specificKeys : new Set(specificKeys);
        if (collateOrder === 'round') {
          for (let r = 0; r < totalRounds; r++) {
            for (let t = 0; t < T; t++) {
              const post = matrix[t] ? matrix[t][r] : null;
              if (!post) continue;
              const bNum = boothsList[t]?.boothNumber || (t + 1);
              const roundNum = r + 1;
              const key = `${t}-${r}`;
              const keyAlt = `${bNum}-${roundNum}`;
              if (keySet.has(key) || keySet.has(keyAlt)) {
                forms.push({ t, r, bNum, roundNum, post, pn: pName(post) });
              }
            }
          }
        } else {
          for (let t = 0; t < T; t++) {
            for (let r = 0; r < totalRounds; r++) {
              const post = matrix[t] ? matrix[t][r] : null;
              if (!post) continue;
              const bNum = boothsList[t]?.boothNumber || (t + 1);
              const roundNum = r + 1;
              const key = `${t}-${r}`;
              const keyAlt = `${bNum}-${roundNum}`;
              if (keySet.has(key) || keySet.has(keyAlt)) {
                forms.push({ t, r, bNum, roundNum, post, pn: pName(post) });
              }
            }
          }
        }
      } else {
        if (collateOrder === 'round') {
          for (let r = 0; r < totalRounds; r++) {
            const roundNum = r + 1;
            if (roundFilter !== 'all' && String(roundNum) !== String(roundFilter)) continue;
            for (let t = 0; t < T; t++) {
              const bNum = boothsList[t]?.boothNumber || (t + 1);
              if (boothFilter !== 'all' && String(bNum) !== String(boothFilter)) continue;
              const post = matrix[t] ? matrix[t][r] : null;
              if (!post) continue;
              const pn = pName(post);
              if (postFilter !== 'all' && pn !== postFilter) continue;
              forms.push({ t, r, bNum, roundNum, post, pn });
            }
          }
        } else {
          for (let t = 0; t < T; t++) {
            const bNum = boothsList[t]?.boothNumber || (t + 1);
            if (boothFilter !== 'all' && String(bNum) !== String(boothFilter)) continue;
            for (let r = 0; r < totalRounds; r++) {
              const roundNum = r + 1;
              if (roundFilter !== 'all' && String(roundNum) !== String(roundFilter)) continue;
              const post = matrix[t] ? matrix[t][r] : null;
              if (!post) continue;
              const pn = pName(post);
              if (postFilter !== 'all' && pn !== postFilter) continue;
              forms.push({ t, r, bNum, roundNum, post, pn });
            }
          }
        }
      }
      return forms;
    };

    const updatePrintScopeUI = () => {
      const postFilter = selPostPrint?.value || 'all';
      const boothFilter = selBoothPrint?.value || 'all';
      const roundFilter = selRoundPrint?.value || 'all';
      const collateOrder = selCollatePrint?.value || 'table';
      const isRecount = !!chkRecountMode?.checked;

      const matchingForms = getMatchingForms({ postFilter, boothFilter, roundFilter, collateOrder });
      const count = matchingForms.length;

      // Compute clear label for the main print button
      let formsBtnText = '';
      if (boothFilter !== 'all' && roundFilter !== 'all') {
        formsBtnText = `Print Form (Table ${boothFilter} · R${roundFilter})`;
      } else if (boothFilter !== 'all') {
        formsBtnText = `Print Table ${boothFilter} Forms (${count})`;
      } else if (roundFilter !== 'all') {
        formsBtnText = `Print Round ${roundFilter} Forms (${count})`;
      } else if (postFilter !== 'all') {
        formsBtnText = `Print ${postFilter} Forms (${count})`;
      } else {
        formsBtnText = `Print All Forms (${count})`;
      }
      if (isRecount) formsBtnText = `Recount: ` + formsBtnText;
      if (labelPrintForms) labelPrintForms.textContent = formsBtnText;

      // Scope Hint text
      let scopeDesc = '';
      const orderDesc = collateOrder === 'round' ? 'Ordered Round-wise (R1 T1..Tn, R2...)' : 'Ordered Table-wise (T1 R1..Rn, T2...)';

      if (boothFilter !== 'all' && roundFilter !== 'all') {
        const postLabel = matchingForms[0]?.pn ? `for post <strong>${esc(matchingForms[0].pn)}</strong>` : '';
        scopeDesc = `💡 <strong>Scope:</strong> Printing single Counting Form for <strong>Table ${boothFilter}</strong>, <strong>Round ${roundFilter}</strong> ${postLabel}.`;
      } else if (boothFilter !== 'all') {
        scopeDesc = `💡 <strong>Scope:</strong> Printing all <strong>${count} counting forms</strong> for <strong>Table / Booth ${boothFilter}</strong> across its rounds. Ideal for supervisor table packets.`;
      } else if (roundFilter !== 'all') {
        scopeDesc = `💡 <strong>Scope:</strong> Printing all <strong>${count} counting forms</strong> for <strong>Round ${roundFilter}</strong> across all counting tables. Ideal for round-by-round counting hall distribution.`;
      } else if (postFilter !== 'all') {
        scopeDesc = `💡 <strong>Scope:</strong> Focused on post <strong>${esc(postFilter)}</strong> (${count} forms). ${orderDesc}.`;
      } else {
        scopeDesc = `💡 <strong>Scope:</strong> Batch printing all <strong>${count} forms</strong> across all ${totalRounds} rounds and ${T} tables. ${orderDesc}.`;
      }
      if (printScopeHint) printScopeHint.innerHTML = scopeDesc;

      // Consolidation button label
      if (labelPrintConsolidation) {
        if (postFilter === 'all') {
          labelPrintConsolidation.textContent = isRecount ? 'All Recount Tabulations' : 'All Tabulation Sheets';
        } else {
          labelPrintConsolidation.textContent = isRecount ? 'Recount Tabulation' : 'Tabulation Sheet';
        }
      }

      // Dossier button label
      if (labelPrintDossier) {
        if (postFilter === 'all') {
          labelPrintDossier.textContent = isRecount ? 'Full Recount Dossier' : 'Full Election Dossier';
        } else {
          labelPrintDossier.textContent = isRecount ? `Recount Dossier (${esc(postFilter)})` : `Full Dossier (${esc(postFilter)})`;
        }
      }

      // UUC Tally Sheet state
      if (btnPrintUucTally) {
        const isPostUuc = postFilter === 'all' || isUuc(postFilter);
        if (!isPostUuc) {
          btnPrintUucTally.classList.add('opacity-40');
          btnPrintUucTally.title = 'UUC Tally Sheet is only applicable for University Union Councillor';
        } else {
          btnPrintUucTally.classList.remove('opacity-40');
          btnPrintUucTally.title = boothFilter !== 'all' 
            ? `Print Dual-Vote Tally Sheet for Table ${boothFilter}` 
            : 'Print Dual-Vote Tally Sheets across all UUC tables';
        }
      }
    };

    selPostPrint?.addEventListener('change', updatePrintScopeUI);
    selBoothPrint?.addEventListener('change', updatePrintScopeUI);
    selRoundPrint?.addEventListener('change', updatePrintScopeUI);
    selCollatePrint?.addEventListener('change', updatePrintScopeUI);

    chkRecountMode?.addEventListener('change', () => {
      if (chkRecountMode.checked) {
        recountBadgeStatus?.classList.remove('hidden');
        showToast('Recounting Mode active: Forms and Tabulation will carry RECOUNTING labels.', 'info');
      } else {
        recountBadgeStatus?.classList.add('hidden');
      }
      updatePrintScopeUI();
    });

    main.querySelector('#btnResetPrintFilters')?.addEventListener('click', () => {
      if (selPostPrint) selPostPrint.value = 'all';
      if (selBoothPrint) selBoothPrint.value = 'all';
      if (selRoundPrint) selRoundPrint.value = 'all';
      if (selCollatePrint) selCollatePrint.value = 'table';
      updatePrintScopeUI();
      showToast('Print filters reset to All Booths and All Rounds.', 'info');
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

    // 1. Print Counting Forms (Supporting Booth filter, Round filter, Post filter, and Specific keys)
    const executePrintForms = (options = {}) => {
      const postFilter = options.postFilter || selPostPrint?.value || 'all';
      const boothFilter = options.boothFilter || selBoothPrint?.value || 'all';
      const roundFilter = options.roundFilter || selRoundPrint?.value || 'all';
      const collateOrder = options.collateOrder || selCollatePrint?.value || 'table';
      const specificKeys = options.specificKeys || null;
      const isRecount = !!chkRecountMode?.checked;
      const orientation = selOrientation?.value || 'portrait';

      const matchingForms = getMatchingForms({ postFilter, boothFilter, roundFilter, collateOrder, specificKeys });

      if (!matchingForms.length) {
        showToast('No matching counting forms found for the selected filter combination.', 'warning');
        return;
      }

      let html = '';
      matchingForms.forEach(f => {
        const { t, r, bNum, roundNum, pn } = f;
        const serial = formSerials[`${t}-${r}`] || `${bNum}-${roundNum}`;
        const cands = candidatesList.filter(c => c.post === pn).sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));
        const roomName = boothsList[t]?.roomName || `Table ${bNum}`;
        const supName = getSupervisorNameForTable(bNum, countingTeams);

        html += buildFormHtml(bNum, roundNum, pn, cands, serial, collegeName, electionYear, collegeLogo, supName, roomName, isRecount);
      });

      let title = 'Counting Forms';
      if (specificKeys) {
        title = isRecount ? `Recount Forms - Custom Selection (${matchingForms.length} Forms)` : `Counting Forms - Custom Selection (${matchingForms.length} Forms)`;
      } else if (boothFilter !== 'all' && roundFilter !== 'all') {
        title = isRecount ? `Recount Form - Table ${boothFilter} Round ${roundFilter}` : `Counting Form - Table ${boothFilter} Round ${roundFilter}`;
      } else if (boothFilter !== 'all') {
        title = isRecount ? `Recount Forms - Table ${boothFilter} (All Rounds)` : `Counting Forms - Table ${boothFilter} (All Rounds)`;
      } else if (roundFilter !== 'all') {
        title = isRecount ? `Recount Forms - Round ${roundFilter} (All Tables)` : `Counting Forms - Round ${roundFilter} (All Tables)`;
      } else if (postFilter !== 'all') {
        title = isRecount ? `Recount Forms - ${postFilter}` : `Counting Forms - ${postFilter}`;
      } else {
        title = isRecount ? `Recount Forms - All Tables & Rounds (${matchingForms.length} Forms)` : `Counting Forms - All Tables & Rounds (${matchingForms.length} Forms)`;
      }

      triggerCountingPrint(html, title, collegeLogo, orientation);
    };

    main.querySelector('#btnPrintForms')?.addEventListener('click', () => {
      executePrintForms();
    });

    // 2. Print Tabulation & Consolidation Sheets (Fits on 1 A4 page in Portrait/Landscape)
    const executePrintConsolidation = (postFilter = null) => {
      const activePostFilter = postFilter || selPostPrint?.value || 'all';
      const isRecount = !!chkRecountMode?.checked;
      const orientation = selOrientation?.value || 'landscape';
      let html = '';
      let count = 0;

      const targetPosts = activePostFilter === 'all' ? sortedPostObjects.map(p => pName(p)) : [activePostFilter];

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
      const title = activePostFilter === 'all' 
        ? (isRecount ? 'Recount Consolidation Sheets - All Posts' : 'Consolidation Sheets - All Posts') 
        : (isRecount ? `Recount Consolidation Sheet - ${activePostFilter}` : `Consolidation Sheet - ${activePostFilter}`);
      triggerCountingPrint(html, title, collegeLogo, orientation);
    };

    main.querySelector('#btnPrintConsolidation')?.addEventListener('click', () => {
      executePrintConsolidation();
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

      const targetTable = tableFilter || (selBoothPrint?.value !== 'all' ? selBoothPrint?.value : null);
      let html = '';
      let count = 0;

      uucPosts.forEach(p => {
        const pn = pName(p);
        const tables = postTableMap[pn] || [];
        tables.sort((a, b) => Number(a.tableNum) - Number(b.tableNum) || Number(a.roundNum) - Number(b.roundNum));
        const cands = candidatesList.filter(c => c.post === pn).sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));

        tables.forEach(tInfo => {
          if (targetTable && String(tInfo.tableNum) !== String(targetTable)) return;
          const eff = getEffectiveVoterCountForTable(tInfo.tableNum);
          html += buildUucTallySheetHtml(tInfo.tableNum, tInfo.roundNum, tInfo.serial, cands, collegeName, electionYear, collegeLogo, tInfo.supervisorName, tInfo.roomName, isRecount, eff.count, orientation, eff.isActual, eff.allotted);
          count++;
        });
      });

      if (!count) {
        showToast(targetTable ? `No UUC counting tables found for Table ${targetTable}.` : 'No UUC counting tables found.', 'warning');
        return;
      }
      const title = targetTable 
        ? (isRecount ? `UUC Recount Tally Sheet - Table ${targetTable}` : `UUC Tally Sheet - Table ${targetTable}`)
        : (isRecount ? 'UUC Recount Tally Sheets - All Tables' : 'UUC Dual-Vote Tally Sheets - All Tables');
      triggerCountingPrint(html, title, collegeLogo, orientation);
    };

    main.querySelector('#btnPrintUucTally')?.addEventListener('click', () => {
      executePrintUucTally();
    });

    // 4. Print Full Dossier (Consolidation Sheet + Tally Sheet + Counting Forms Table 1..N)
    const executePrintPackage = (postFilter = null, boothFilter = null) => {
      const activePostFilter = postFilter || selPostPrint?.value || 'all';
      const activeBoothFilter = boothFilter || selBoothPrint?.value || 'all';
      const isRecount = !!chkRecountMode?.checked;
      const orientation = selOrientation?.value || 'portrait';
      let html = '';
      const targetPosts = activePostFilter === 'all' ? sortedPostObjects.map(p => pName(p)) : [activePostFilter];

      targetPosts.forEach(pn => {
        let tables = postTableMap[pn] || [];
        tables.sort((a, b) => Number(a.tableNum) - Number(b.tableNum) || Number(a.roundNum) - Number(b.roundNum));
        if (activeBoothFilter !== 'all') {
          tables = tables.filter(t => String(t.tableNum) === String(activeBoothFilter));
        }
        const cands = candidatesList.filter(c => c.post === pn).sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));
        const isPostUuc = isUuc(pn);

        // First: Tabulation Consolidation Sheet for the Post (Form 7 - fits on 1 page)
        html += buildConsolidationHtml(pn, tables, cands, collegeName, electionYear, collegeLogo, isRecount);

        // Second: If UUC, append UUC Tally Sheets
        if (isPostUuc) {
          tables.forEach(tInfo => {
            const eff = getEffectiveVoterCountForTable(tInfo.tableNum);
            html += buildUucTallySheetHtml(tInfo.tableNum, tInfo.roundNum, tInfo.serial, cands, collegeName, electionYear, collegeLogo, tInfo.supervisorName, tInfo.roomName, isRecount, eff.count, orientation, eff.isActual, eff.allotted);
          });
        }

        // Third: Counting Forms (Form 6) for each table
        tables.forEach(tInfo => {
          html += buildFormHtml(tInfo.tableNum, tInfo.roundNum, pn, cands, tInfo.serial, collegeName, electionYear, collegeLogo, tInfo.supervisorName, tInfo.roomName, isRecount);
        });
      });

      if (!html) {
        showToast('No dossier documents generated.', 'warning');
        return;
      }
      const title = activePostFilter === 'all' 
        ? (isRecount ? 'Complete Recount Dossier - All Posts' : 'Complete Counting Dossier') 
        : (isRecount ? `Recount Dossier - ${activePostFilter}` : `Counting Dossier - ${activePostFilter}`);
      triggerCountingPrint(html, title, collegeLogo, orientation);
    };

    main.querySelector('#btnPrintPackage')?.addEventListener('click', () => {
      executePrintPackage();
    });

    // ── 1-Click Direct Print Handlers on Matrix Table ───────────────────────
    // Round Header 1-click batch print
    main.querySelectorAll('.btn-print-round-header').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rNum = btn.dataset.round;
        if (selRoundPrint) selRoundPrint.value = rNum;
        if (selBoothPrint) selBoothPrint.value = 'all';
        updatePrintScopeUI();
        executePrintForms({ roundFilter: rNum, boothFilter: 'all', postFilter: 'all' });
      });
    });

    // Table Row 1-click table packet print
    main.querySelectorAll('.btn-print-table-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bNum = btn.dataset.table;
        if (selBoothPrint) selBoothPrint.value = bNum;
        if (selRoundPrint) selRoundPrint.value = 'all';
        updatePrintScopeUI();
        executePrintForms({ boothFilter: bNum, roundFilter: 'all', postFilter: 'all' });
      });
    });

    // Single Matrix Cell 1-click single form print
    main.querySelectorAll('.btn-print-matrix-cell').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bNum = btn.dataset.table;
        const rNum = btn.dataset.round;
        const postName = btn.dataset.post;
        executePrintForms({ boothFilter: bNum, roundFilter: rNum, postFilter: postName });
      });
    });

    // ── Quick Print Buttons per Post Directory ──────────────────────────────
    main.querySelectorAll('.quick-print-forms').forEach(btn => {
      btn.addEventListener('click', () => executePrintForms({ postFilter: btn.dataset.post, boothFilter: 'all', roundFilter: 'all' }));
    });
    main.querySelectorAll('.quick-print-tab').forEach(btn => {
      btn.addEventListener('click', () => executePrintConsolidation(btn.dataset.post));
    });
    main.querySelectorAll('.quick-print-uuc').forEach(btn => {
      btn.addEventListener('click', () => executePrintUucTally());
    });
    main.querySelectorAll('.print-single-uuc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        executePrintUucTally(btn.dataset.table);
      });
    });
    main.querySelectorAll('.quick-print-dossier').forEach(btn => {
      btn.addEventListener('click', () => executePrintPackage(btn.dataset.post));
    });

    // ── Specific Forms Picker Modal Logic ────────────────────────────────────
    const inputModalSearch = modalSpecific?.querySelector('#inputSearchModalForms');
    const modalCountEl = modalSpecific?.querySelector('#modalCountSelected');

    const updateModalSelectionCount = () => {
      if (!modalSpecific || !modalCountEl) return;
      const checkedCount = modalSpecific.querySelectorAll('.chk-modal-form:checked').length;
      modalCountEl.textContent = checkedCount;
    };

    const openSpecificModal = () => {
      if (!modalSpecific) return;
      modalSpecific.classList.remove('hidden');

      // Pre-select based on active toolbar filters if any
      const curBooth = selBoothPrint?.value || 'all';
      const curRound = selRoundPrint?.value || 'all';
      const curPost = selPostPrint?.value || 'all';

      modalSpecific.querySelectorAll('.modal-form-item').forEach(item => {
        const chk = item.querySelector('.chk-modal-form');
        if (!chk) return;
        const t = item.dataset.table;
        const r = item.dataset.round;
        const s = item.dataset.search || '';

        const matchTable = curBooth === 'all' || String(t) === String(curBooth);
        const matchRound = curRound === 'all' || String(r) === String(curRound);
        const matchPost = curPost === 'all' || s.includes(curPost.toLowerCase());

        chk.checked = matchTable && matchRound && matchPost;
      });

      if (inputModalSearch) {
        inputModalSearch.value = '';
        modalSpecific.querySelectorAll('.modal-form-item').forEach(i => i.classList.remove('hidden'));
        inputModalSearch.focus();
      }
      updateModalSelectionCount();
    };

    const closeSpecificModal = () => {
      if (modalSpecific) modalSpecific.classList.add('hidden');
    };

    main.querySelector('#btnOpenFormPicker')?.addEventListener('click', openSpecificModal);
    modalSpecific?.querySelector('#btnCloseSpecificModal')?.addEventListener('click', closeSpecificModal);
    modalSpecific?.querySelector('#btnCancelSpecificModal')?.addEventListener('click', closeSpecificModal);
    modalSpecific?.addEventListener('click', (e) => {
      if (e.target === modalSpecific) closeSpecificModal();
    });

    // Search filter inside modal
    inputModalSearch?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      modalSpecific?.querySelectorAll('.modal-form-item').forEach(item => {
        const text = item.dataset.search || '';
        item.classList.toggle('hidden', Boolean(q && !text.includes(q)));
      });
    });

    // Modal Select All / Clear All
    modalSpecific?.querySelector('#btnModalSelectAll')?.addEventListener('click', () => {
      modalSpecific?.querySelectorAll('.modal-form-item:not(.hidden) .chk-modal-form').forEach(chk => {
        chk.checked = true;
      });
      updateModalSelectionCount();
    });

    modalSpecific?.querySelector('#btnModalClearAll')?.addEventListener('click', () => {
      modalSpecific?.querySelectorAll('.chk-modal-form').forEach(chk => {
        chk.checked = false;
      });
      updateModalSelectionCount();
    });

    // Modal Toggle by Round pills
    modalSpecific?.querySelectorAll('.btn-modal-toggle-round').forEach(btn => {
      btn.addEventListener('click', () => {
        const rNum = btn.dataset.round;
        const matchingChks = modalSpecific?.querySelectorAll(`.modal-form-item[data-round="${rNum}"] .chk-modal-form`) || [];
        const allChecked = Array.from(matchingChks).every(c => c.checked);
        matchingChks.forEach(c => { c.checked = !allChecked; });
        updateModalSelectionCount();
      });
    });

    // Modal Toggle by Table pills
    modalSpecific?.querySelectorAll('.btn-modal-toggle-table').forEach(btn => {
      btn.addEventListener('click', () => {
        const tNum = btn.dataset.table;
        const matchingChks = modalSpecific?.querySelectorAll(`.modal-form-item[data-table="${tNum}"] .chk-modal-form`) || [];
        const allChecked = Array.from(matchingChks).every(c => c.checked);
        matchingChks.forEach(c => { c.checked = !allChecked; });
        updateModalSelectionCount();
      });
    });

    // Checkbox change listener
    modalSpecific?.querySelectorAll('.chk-modal-form').forEach(chk => {
      chk.addEventListener('change', updateModalSelectionCount);
    });

    // Confirm Print Selected Forms from Modal
    modalSpecific?.querySelector('#btnConfirmPrintSpecific')?.addEventListener('click', () => {
      const selectedKeys = new Set();
      modalSpecific?.querySelectorAll('.chk-modal-form:checked').forEach(chk => {
        const key = chk.dataset.key;
        if (key) selectedKeys.add(key);
      });

      if (!selectedKeys.size) {
        showToast('Please select at least one form to print.', 'warning');
        return;
      }

      closeSpecificModal();
      executePrintForms({ specificKeys: selectedKeys, collateOrder: selCollatePrint?.value || 'table' });
    });

    // ── Ballot Paper Account (BPA) Modal Logic ─────────────────────────────
    const bpaTableBody = modalBpa?.querySelector('#bpaTableBody');
    const bpaTotalAllottedEl = modalBpa?.querySelector('#bpaTotalAllotted');
    const bpaTotalPolledEl = modalBpa?.querySelector('#bpaTotalPolled');
    const bpaOverallTurnoutEl = modalBpa?.querySelector('#bpaOverallTurnout');

    const recalculateBpaStats = () => {
      if (!modalBpa) return;
      let totalAllotted = 0;
      let totalPolled = 0;

      modalBpa.querySelectorAll('.bpa-row').forEach(row => {
        const allotted = parseInt(row.dataset.allotted, 10) || 0;
        const input = row.querySelector('.bpa-input-table');
        const turnoutEl = row.querySelector('.bpa-row-turnout');
        const previewEl = row.querySelector('.bpa-row-preview');

        const val = parseInt(input?.value, 10);
        const effectiveCount = (!isNaN(val) && val > 0) ? val : allotted;

        totalAllotted += allotted;
        if (!isNaN(val) && val > 0) {
          totalPolled += val;
        } else {
          totalPolled += allotted;
        }

        // Update row turnout %
        if (turnoutEl) {
          if (allotted > 0 && !isNaN(val) && val > 0) {
            const pct = Math.round((val / allotted) * 100);
            turnoutEl.innerHTML = `<span class="font-bold font-mono ${pct > 100 ? 'text-rose-400' : 'text-emerald-300'}">${pct}%</span>`;
          } else if (allotted > 0) {
            turnoutEl.innerHTML = `<span class="text-slate-500 font-mono text-[11px]">(100% allotted)</span>`;
          } else {
            turnoutEl.textContent = '–';
          }
        }

        // Update row preview
        if (previewEl) {
          const batches = getUucBatchesForVoterCount(effectiveCount);
          const summary = getUucBatchesSummaryText(batches, effectiveCount);
          previewEl.innerHTML = `<span class="text-slate-300 font-medium">${summary}</span> <span class="text-amber-400/90 font-bold ml-1">(${effectiveCount * 2} votes target)</span>`;
        }
      });

      if (bpaTotalAllottedEl) bpaTotalAllottedEl.textContent = totalAllotted;
      if (bpaTotalPolledEl) bpaTotalPolledEl.textContent = totalPolled;
      if (bpaOverallTurnoutEl) {
        const overallPct = totalAllotted > 0 ? Math.round((totalPolled / totalAllotted) * 100) : 0;
        bpaOverallTurnoutEl.textContent = `${overallPct}%`;
      }
    };

    const openBpaModal = () => {
      if (!modalBpa || !bpaTableBody) return;

      let rowsHtml = '';
      for (let t = 0; t < T; t++) {
        const b = boothsList[t];
        const bNum = b?.boothNumber || (t + 1);
        const roomName = b?.roomName || `Table ${bNum}`;
        const allotted = getBoothVoterCount(b, nominalRollList);
        const deduced = deduceBallotsFromResults(allResults, bNum);
        const sNum = String(bNum);
        const manualVal = tablePolledBallots[sNum] !== undefined ? tablePolledBallots[sNum] : '';

        rowsHtml += `
          <tr class="bpa-row hover:bg-white/[0.02]" data-table="${bNum}" data-allotted="${allotted}">
            <td class="font-bold text-sky-300 py-2">
              <div>Table ${bNum}</div>
              <div class="text-[10px] text-slate-400 font-normal truncate max-w-[120px]">${esc(roomName)}</div>
            </td>
            <td class="text-center font-mono font-bold text-indigo-300 py-2">
              ${allotted || '<span class="text-slate-500">0</span>'}
            </td>
            <td class="text-left text-[11px] py-2">
              ${deduced && deduced.ballots > 0
                ? `<span class="badge bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10.5px] cursor-pointer hover:bg-emerald-500/30 bpa-btn-apply-deduced" data-table="${bNum}" data-count="${deduced.ballots}" title="Click to use ${deduced.ballots} for Table ${bNum}">
                     ⚡ ${deduced.ballots} (${esc(deduced.postName)})
                   </span>`
                : '<span class="text-slate-500 italic text-[10.5px]">No results entered yet</span>'
              }
            </td>
            <td class="text-center py-2">
              <input type="number" min="0" max="9999" class="bpa-input-table field text-center font-mono font-bold text-xs py-1 px-2 w-24 bg-black/60 border border-white/20 focus:border-emerald-400 rounded-lg text-emerald-300" data-table="${bNum}" value="${manualVal !== undefined && manualVal !== null ? manualVal : ''}" placeholder="${allotted || '0'}">
            </td>
            <td class="text-center bpa-row-turnout py-2">
              –
            </td>
            <td class="text-left text-xs bpa-row-preview py-2">
              –
            </td>
          </tr>
        `;
      }

      bpaTableBody.innerHTML = rowsHtml;

      // Attach row input listeners
      bpaTableBody.querySelectorAll('.bpa-input-table').forEach(input => {
        input.addEventListener('input', recalculateBpaStats);
      });

      // Attach click to apply deduced
      bpaTableBody.querySelectorAll('.bpa-btn-apply-deduced').forEach(btn => {
        btn.addEventListener('click', () => {
          const tNum = btn.dataset.table;
          const count = btn.dataset.count;
          const input = bpaTableBody.querySelector(`.bpa-input-table[data-table="${tNum}"]`);
          if (input && count) {
            input.value = count;
            recalculateBpaStats();
          }
        });
      });

      recalculateBpaStats();
      modalBpa.classList.remove('hidden');
    };

    const closeBpaModal = () => {
      if (!modalBpa) return;
      modalBpa.classList.add('hidden');
    };

    main.querySelector('#btnOpenBpaModal')?.addEventListener('click', openBpaModal);
    modalBpa?.querySelector('#btnCloseBpaModal')?.addEventListener('click', closeBpaModal);
    modalBpa?.querySelector('#btnCancelBpaModal')?.addEventListener('click', closeBpaModal);
    modalBpa?.addEventListener('click', (e) => {
      if (e.target === modalBpa) closeBpaModal();
    });

    modalBpa?.querySelector('#btnBpaAutoDetect')?.addEventListener('click', () => {
      let detectedCount = 0;
      modalBpa?.querySelectorAll('.bpa-row').forEach(row => {
        const bNum = row.dataset.table;
        const deduced = deduceBallotsFromResults(allResults, bNum);
        if (deduced && deduced.ballots > 0) {
          const input = row.querySelector('.bpa-input-table');
          if (input) {
            input.value = deduced.ballots;
            detectedCount++;
          }
        }
      });
      recalculateBpaStats();
      if (detectedCount > 0) {
        showToast(`Auto-detected actual polled ballots for ${detectedCount} table(s) from results entry!`, 'success');
      } else {
        showToast('No single-vote results found yet for auto-deduction. Enter values manually or enter results first.', 'info');
      }
    });

    modalBpa?.querySelector('#btnBpaResetAllotted')?.addEventListener('click', () => {
      modalBpa?.querySelectorAll('.bpa-input-table').forEach(input => {
        input.value = '';
      });
      recalculateBpaStats();
      showToast('Reset all tables to allotted nominal roll electors.', 'info');
    });

    modalBpa?.querySelector('#btnSaveBpaModal')?.addEventListener('click', async () => {
      const newBpa = {};
      modalBpa?.querySelectorAll('.bpa-input-table').forEach(inp => {
        const tNum = inp.dataset.table;
        const val = parseInt(inp.value, 10);
        if (!isNaN(val) && val > 0) {
          newBpa[tNum] = val;
        }
      });
      closeBpaModal();
      await saveTablePolledBallots(newBpa);
    });

    // Close on Escape key
    const onModalEscKey = (e) => {
      if (e.key === 'Escape') {
        if (modalBpa && !modalBpa.classList.contains('hidden')) closeBpaModal();
        if (modalSpecific && !modalSpecific.classList.contains('hidden')) closeSpecificModal();
      }
    };
    window.addEventListener('keydown', onModalEscKey);

    // Initial calculation of print labels & hints
    updatePrintScopeUI();

    // Matrix Regenerate listeners
    main.querySelector('#btnRegenerate')?.addEventListener('click', () => {
      if (confirm(`Are you sure? This will regenerate the counting matrix following statutory allocation:\n\n• Department Associations: Round 1 (FIRST)\n• Year Representatives: Round 2\n• General Union Posts: Rotated per table across rounds\n• University Union Councillor (UUC): Final Round (LAST ALWAYS)\n\nResults entry serial numbers may change!`)) {
        generateAndSave();
      }
    });

    main.querySelector('#btnNoticeRegenerate')?.addEventListener('click', () => {
      if (confirm(`Regenerate counting matrix to align with all ${T} polling booths (Associations 1st, rotated General posts, UUC Last)?`)) {
        generateAndSave();
      }
    });

    main.querySelector('#btnOrderRegenerate')?.addEventListener('click', () => {
      if (confirm(`Re-align counting matrix to statutory order (Associations 1st, rotated General posts, UUC Last Always) across all ${T} polling booths?`)) {
        generateAndSave();
      }
    });
  };

  // ── Function to generate matrix from scratch and save to backend ──────────────
  const generateAndSave = async () => {
    const T = boothsList.length;

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

    const isDeptMatch = (pDept, bIdx) => {
      if (!pDept) return false;
      const bD = boothDepts[bIdx];
      if (bD.has(pDept)) return true;
      const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const pNorm = norm(pDept);
      for (const d of bD) {
        const dNorm = norm(d);
        if (dNorm === pNorm || dNorm.includes(pNorm) || pNorm.includes(dNorm)) return true;
      }
      return false;
    };

    const isYearMatch = (post, bIdx) => {
      const bYrs = boothYears[bIdx];
      const yrRule = post.yearRule;
      if (yrRule && yrRule !== 'ALL') {
        if (yrRule === 'PG')  return bYrs.has('PG');
        if (yrRule === 'UG1' || yrRule === '1') return bYrs.has('1');
        if (yrRule === 'UG2' || yrRule === '2') return bYrs.has('2');
        if (yrRule === 'UG3' || yrRule === '3') return bYrs.has('3');
      }
      const yrRes = String(post.yearRestriction || '').toUpperCase().trim();
      if (yrRes) {
        if (yrRes.includes('PG')) return bYrs.has('PG');
        if (yrRes === '1') return bYrs.has('1');
        if (yrRes === '2') return bYrs.has('2');
        if (yrRes === '3') return bYrs.has('3');
      }
      const nameUpper = pName(post).toUpperCase();
      if (nameUpper.includes('PG')) return bYrs.has('PG');
      if (nameUpper.includes('I UG') || nameUpper.includes('1ST UG') || nameUpper.includes('1_UG') || nameUpper.includes('1ST YEAR UG')) return bYrs.has('1');
      if (nameUpper.includes('II UG') || nameUpper.includes('2ND UG') || nameUpper.includes('2_UG') || nameUpper.includes('2ND YEAR UG')) return bYrs.has('2');
      if (nameUpper.includes('III UG') || nameUpper.includes('3RD UG') || nameUpper.includes('3_UG') || nameUpper.includes('3RD YEAR UG')) return bYrs.has('3');
      return true;
    };

    const isMatch = (post, bIdx) => {
      if (isUuc(pName(post))) return true;
      if (isAssocPost(post) || Boolean(getPostDept(post))) {
        const pDept = getPostDept(post);
        return isDeptMatch(pDept, bIdx);
      }
      if (isYearRepPost(post)) {
        return isYearMatch(post, bIdx);
      }
      return true;
    };

    // 1. Four-Tier Statutory Segregation
    const uucPosts = postsList.filter(p => isUuc(pName(p)));
    const assocPosts = postsList.filter(p => !uucPosts.includes(p) && (isAssocPost(p) || Boolean(getPostDept(p))));
    const yearRepPosts = postsList.filter(p => !uucPosts.includes(p) && !assocPosts.includes(p) && isYearRepPost(p));
    const generalPosts = postsList.filter(p => !uucPosts.includes(p) && !assocPosts.includes(p) && !yearRepPosts.includes(p));

    // Sort within tiers
    assocPosts.sort(comparePosts);
    yearRepPosts.sort(comparePosts);
    generalPosts.sort(comparePosts);
    uucPosts.sort(comparePosts);

    const G = generalPosts.length;

    // 2. Build table rounds:
    //    Tier 1: Association Posts (FIRST)
    //    Tier 2: Year Representatives (SECOND)
    //    Tier 3: General Union Posts (THIRD, ROTATED PER TABLE EACH ROUND: generalPosts[(t + i) % G])
    //    Tier 4: University Union Councillor (UUC - LAST ALWAYS)
    const tablePrefix = [];
    const tableUuc = [];

    for (let t = 0; t < T; t++) {
      const myAssoc = assocPosts.filter(ap => isMatch(ap, t));
      const myYearReps = yearRepPosts.filter(yp => isMatch(yp, t));
      const myGeneral = [];
      if (G > 0) {
        for (let i = 0; i < G; i++) {
          myGeneral.push(generalPosts[(t + i) % G]);
        }
      }
      tablePrefix.push([...myAssoc, ...myYearReps, ...myGeneral]);
      tableUuc.push(uucPosts.filter(up => isMatch(up, t)));
    }

    const maxPrefix = Math.max(...tablePrefix.map(p => p.length), 0);
    const maxUuc = Math.max(...tableUuc.map(u => u.length), 0);
    const R = Math.max(maxPrefix + maxUuc, 1);

    // Construct matrix: non-UUC fill early rounds, UUC is anchored to the final rounds across all tables
    const matrix = Array.from({ length: T }, (_, t) => {
      const row = Array.from({ length: R }, () => null);
      const prefix = tablePrefix[t];
      prefix.forEach((p, idx) => {
        row[idx] = p;
      });
      const uuc = tableUuc[t];
      uuc.forEach((p, idx) => {
        row[R - maxUuc + idx] = p;
      });
      return row;
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

    const roundLabels = Array.from({ length: R }, (_, i) => {
      if (maxUuc > 0 && i >= R - maxUuc) {
        return maxUuc === 1 ? `Round ${i + 1} (UUC)` : `Round ${i + 1} (UUC ${i - (R - maxUuc) + 1})`;
      }
      if (i === 0 && assocPosts.length > 0) {
        return `Round 1 (Assoc)`;
      }
      return `Round ${i + 1}`;
    });

    const payload = {
      matrix,
      formSerials,
      totalRounds: R,
      roundLabels,
      tablePolledBallots: tablePolledBallots || {}
    };

    try {
      await api.adminSaveCountingMatrix(pwd, payload);
      await saveCountingMeta({ savedMatrix: payload, posts: postsList, finalList: candidatesList, booths: boothsList, settings, countingTeams, nominalRoll: nominalRollList, results: allResults });
      showToast('Counting matrix regenerated statutorily (Assoc 1st, Rotated General, UUC Last).', 'success');
      renderDisplay(payload);
    } catch (e) {
      console.warn('Online save matrix failed, saving locally to IndexedDB:', e);
      await saveCountingMeta({ savedMatrix: payload, posts: postsList, finalList: candidatesList, booths: boothsList, settings, countingTeams, nominalRoll: nominalRollList, results: allResults });
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
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page {
      size: A4 ${orientation === 'landscape' ? 'landscape' : 'portrait'};
      margin: 8mm 10mm 12mm 10mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 8pt;
        font-weight: bold;
        color: #000000;
      }
      @bottom-left {
        content: "College Union Election — Counting Record";
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 7.5pt;
        color: #000000;
      }
    }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #000000; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; break-inside: avoid; }
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #000; font-size: 12px; }
    .pg { page-break-after: always; padding: 6px 8px; position: relative; }
    .pg:last-child { page-break-after: avoid; }
    .serial-tag { border: 2px solid #000; padding: 4px 10px; font-family: monospace; font-size: 14px; font-weight: bold; background: #fff; border-radius: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th, td { border: 1.5px solid #000; padding: 5px 6px; }
    th { background: #f3f4f6; }
    .watermark-global { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 450px; height: 450px; opacity: 0.08; filter: grayscale(100%); pointer-events: none; z-index: -1; background-size: contain; background-repeat: no-repeat; background-position: center; }

    /* UUC Dual-Vote Tally Marking Compartments */
    .tally-td { padding: 4px !important; vertical-align: top; background: #fff !important; }
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
        <td style="text-align:center;padding:12px 8px;font-weight:bold">${i+1}</td>
        <td style="padding:12px 10px;font-size:14.5px;font-weight:bold;line-height:1.2;">
          ${esc(c.candidateName || '')}
          <div style="font-size:11px;font-weight:normal;color:#475569;margin-top:2px;">${esc(c.candidateClass || '')}</div>
        </td>
        <td style="padding:12px 8px"></td></tr>`).join('')
    : `<tr><td colspan="3" style="padding:12px;text-align:center;color:#555">No Contesting Candidates</td></tr>`;

  return `<div class="pg" style="page-break-inside:avoid;">
    <!-- Top 3-Column Header: Balanced Left Spacer + Center Branding + Right Badge -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
      <!-- Left spacer strictly balancing right badge width for perfect true centering -->
      <div style="width:140px;flex-shrink:0;"></div>

      <!-- Center Branding -->
      <div style="flex:1;text-align:center;padding:0 6px;">
        ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:42px;max-width:120px;margin:0 auto 4px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
        <div style="font-size:13.5px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;line-height:1.2;">${esc(collegeName)}</div>
        <div style="font-size:11.5px;font-weight:700;color:#334155;margin-top:2px;">College Union Election ${esc(yearStr)}</div>
        <h2 style="margin:5px 0 0;font-size:19px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#000;">
          Counting Form ${isRecount ? '<span style="color:#b91c1c;font-size:13px;border:1.5px solid #b91c1c;padding:2px 6px;vertical-align:middle;margin-left:8px;border-radius:2px;letter-spacing:1px;">RECOUNT</span>' : ''}
        </h2>
      </div>

      <!-- Right Form Serial Badge -->
      <div style="width:140px;flex-shrink:0;display:flex;justify-content:flex-end;">
        <div class="serial-tag" ${isRecount ? 'style="border-color:#b91c1c;color:#b91c1c;white-space:nowrap;"' : 'style="white-space:nowrap;"'}>
          ${isRecount ? `RECOUNT — FORM #${serial}` : `FORM #${serial}`}
        </div>
      </div>
    </div>

    <!-- Table No and Round No Bar — Perfectly Aligned 100% Width -->
    <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:5px 12px;border:1.5px solid #000;margin-bottom:8px;font-size:13px;font-weight:bold;">
      <span>TABLE NO: <u style="font-size:14px;font-weight:800;">${tableNum}</u> ${roomName ? `<span style="font-size:11px;font-weight:normal;color:#475569">(${esc(roomName)})</span>` : ''}</span>
      <span>ROUND NO: <u style="font-size:14px;font-weight:800;">${roundNum}</u></span>
    </div>

    <!-- Post Title Bar — Perfectly Aligned 100% Width -->
    <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px;">
      <h3 style="margin:0;font-size:15px;font-weight:800;text-decoration:underline;text-transform:uppercase;letter-spacing:0.5px;">POST: ${esc(postName)}</h3>
      ${isPostUuc ? `<div style="font-size:11px;font-weight:bold;color:#b45309;margin-top:3px;">⭐ TWO (2) VACANCIES — DUAL-VOTE COUNTING (Total votes tallied = 2 × Ballots cast)</div>` : ''}
    </div>

    <!-- Candidate Table — Full 100% Width -->
    <table>
      <thead><tr>
        <th style="width:8%;text-align:center;padding:8px 6px;">#</th>
        <th style="text-align:left;width:62%;padding:8px 10px;">Candidate Name &amp; Class</th>
        <th style="width:30%;text-align:center;padding:8px 6px;">Votes Tallied</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr><td style="text-align:center;padding:12px 8px;font-weight:bold">–</td><td style="padding:12px 10px;font-weight:bold">NOTA</td><td></td></tr>
        <tr><td style="text-align:center;padding:12px 8px;font-weight:bold">–</td><td style="padding:12px 10px;font-weight:bold;color:#444">INVALID</td><td></td></tr>
        <tr style="background:#eee;border-top:2px solid #000"><td style="text-align:center;padding:12px 8px;font-weight:bold">–</td><td style="padding:12px 10px;font-weight:black;font-size:15px">TOTAL VOTES TALLIED</td><td></td></tr>
      </tbody>
    </table>

    <!-- Signature Block -->
    <div style="display:flex;justify-content:space-between;margin-top:50px;text-align:center">
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
 * Calculates the exact number of voters allotted to a booth / hall.
 * Cross-references the booth's assigned classes against nominalRollList,
 * with fallback to b.totalStudents or b.voterCount.
 */
export function getBoothVoterCount(b, nominalRollList = []) {
  if (!b) return 0;
  const bClasses = Array.isArray(b.classes)
    ? b.classes
    : (typeof b.classes === 'string' ? b.classes.split(',').map(s => s.trim()).filter(Boolean) : []);

  if (Array.isArray(nominalRollList) && nominalRollList.length > 0 && bClasses.length > 0) {
    let count = 0;
    nominalRollList.forEach(s => {
      const rawClass = String(s['CLASS'] || s['Class'] || s.class || '').trim();
      const dept = String(s['Dept'] || s['Department'] || s.dept || '').trim();
      const upper = rawClass.toUpperCase();
      const key = (upper.includes('RESEARCH') || upper.includes('SCHOLAR') || upper.includes('PH.D') || upper.includes('PHD'))
        ? `RESEARCH SCHOLAR - ${dept}`
        : rawClass;
      if (bClasses.includes(key) || bClasses.includes(rawClass)) {
        count++;
      }
    });
    if (count > 0) return count;
  }

  if (typeof b.totalStudents === 'number' && b.totalStudents > 0) return b.totalStudents;
  if (typeof b.totalVoters === 'number' && b.totalVoters > 0) return b.totalVoters;
  if (typeof b.voterCount === 'number' && b.voterCount > 0) return b.voterCount;
  if (typeof b.voters === 'number' && b.voters > 0) return b.voters;
  return 0;
}

/**
 * Computes dynamic batch definitions for UUC dual-vote counting tally sheet (Form 6-T).
 * E.g. If voter count is 130: 5 batches of 25 + Rest (5).
 * If voter count is 100: 4 batches of 25.
 * If voter count <= 0: defaults to standard 4 batches of 25 + Remainder.
 */
export function getUucBatchesForVoterCount(voterCount) {
  const count = Number(voterCount) || 0;
  if (count <= 0) {
    // Default fallback if voter count is unconfigured or 0: 4 batches of 25 + Rest
    return [
      { id: 1, name: 'Batch 1', range: '1–25', ballots: 25, targetVotes: 50, isRest: false },
      { id: 2, name: 'Batch 2', range: '26–50', ballots: 25, targetVotes: 50, isRest: false },
      { id: 3, name: 'Batch 3', range: '51–75', ballots: 25, targetVotes: 50, isRest: false },
      { id: 4, name: 'Batch 4', range: '76–100', ballots: 25, targetVotes: 50, isRest: false },
      { id: 5, name: 'Remainder Batch', range: 'Remainder', ballots: 0, targetVotes: '2 × Rem', isRest: true }
    ];
  }

  const batchSize = 25;
  const numFull = Math.floor(count / batchSize);
  const remainder = count % batchSize;
  const batches = [];

  for (let i = 1; i <= numFull; i++) {
    const start = (i - 1) * batchSize + 1;
    const end = i * batchSize;
    batches.push({
      id: i,
      name: `Batch ${i}`,
      range: `${start}–${end}`,
      ballots: batchSize,
      targetVotes: batchSize * 2,
      isRest: false
    });
  }

  if (remainder > 0) {
    const start = numFull * batchSize + 1;
    const end = count;
    batches.push({
      id: numFull + 1,
      name: `Rest (${remainder})`,
      range: `${start}–${end}`,
      ballots: remainder,
      targetVotes: remainder * 2,
      isRest: true
    });
  }

  return batches;
}

export function getUucBatchesSummaryText(batches, voterCount) {
  const count = Number(voterCount) || 0;
  if (count <= 0) return '4 Batches of 25 + Rest';
  const fullCount = batches.filter(b => !b.isRest).length;
  const restBatch = batches.find(b => b.isRest);
  if (fullCount > 0 && restBatch) {
    return `${fullCount} ${fullCount === 1 ? 'Batch' : 'Batches'} of 25 + Rest ${restBatch.ballots}`;
  }
  if (fullCount > 0 && !restBatch) {
    return `${fullCount} ${fullCount === 1 ? 'Batch' : 'Batches'} of 25`;
  }
  if (restBatch) {
    return `Rest ${restBatch.ballots}`;
  }
  return '';
}

/**
 * Form 6-T (UUC) — Batch-of-25 Dual-Vote Counting Tally Sheet
 * Implements the 25-Ballot Milestone Check Method for foolproof UUC tallying.
 * Dynamically computes batches based on the exact voters allotted to that table / hall / booth.
 * Dynamically scales row height in portrait and landscape so the table completely fills the A4 page without leaving empty space at the bottom.
 */
export function buildUucTallySheetHtml(tableNum, roundNum, serial, candidates, collegeName = CONFIG.COLLEGE_NAME || 'Government Victoria College Palakkad', electionYear = '', collegeLogo = '', supervisorName = '', roomName = '', isRecount = false, voterCount = 0, orientation = 'portrait', isActualBallotsKnown = false, allottedElectors = 0) {
  const yearStr = electionYear || new Date().getFullYear().toString();
  const candsList = Array.isArray(candidates) ? candidates : [];
  const numVoters = Number(voterCount) || 0;
  const batches = getUucBatchesForVoterCount(numVoters);
  const batchesSummary = getUucBatchesSummaryText(batches, numVoters);

  // Column width calculations - optimized to maximize writing space for tally marks in batch columns
  const numBatches = batches.length;
  const indexWidth = 2.5;
  const nameWidth = numBatches > 6 ? 15 : (numBatches > 4 ? 17 : 19);
  const finalWidth = numBatches > 6 ? 6.5 : 7.5;
  const remainingWidth = 100 - (indexWidth + nameWidth + finalWidth);
  const batchColWidth = (remainingWidth / numBatches).toFixed(1);

  // Dynamic row height calculation based on total row count and orientation so rows fully expand to fill the printable A4 page
  const totalRows = candsList.length + 2; // candidates + NOTA + Invalid
  const isLandscape = String(orientation || '').toLowerCase() === 'landscape';
  const availableH = isLandscape ? 490 : 810;
  const computedH = Math.floor(availableH / totalRows);
  const rowHeightPx = isLandscape 
    ? Math.max(36, Math.min(80, computedH))
    : Math.max(45, Math.min(135, computedH));
  const rowHStyle = `height:${rowHeightPx}px;`;

  return `<div class="pg pg-tally" style="page-break-inside:avoid;padding:2px 2px;">
    <!-- Stripped compact header line -->
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1.5px solid #000;padding-bottom:2px;margin-bottom:3px;">
      <div>
        <span style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">${esc(collegeName)}</span>
        <span style="font-size:10.5px;font-weight:700;color:#1e3a8a;margin-left:8px;">FORM 6-T (UUC) — BATCH TALLY SHEET</span>
        <span style="font-size:9.5px;font-weight:600;color:#333;margin-left:6px;">[POST: UNIVERSITY UNION COUNCILLOR]</span>
        ${isRecount ? '<span style="color:#b91c1c;font-weight:bold;margin-left:6px;">(RECOUNT)</span>' : ''}
      </div>
      <div style="font-size:9.5px;font-family:monospace;font-weight:bold;color:#111;">
        REF: #${serial} | ${esc(yearStr)}
      </div>
    </div>

    <!-- Stripped 1-line metadata bar -->
    <div style="display:flex;justify-content:space-between;align-items:center;background:#f3f4f6;border:1px solid #000;padding:2px 6px;font-size:9px;font-weight:bold;margin-bottom:3px;gap:6px;flex-wrap:nowrap;">
      <span>TABLE: <u>${tableNum}</u> ${roomName ? `<span style="font-weight:normal;color:#444">(${esc(roomName)})</span>` : ''}</span>
      <span>ROUND: <u>${roundNum}</u></span>
      ${isActualBallotsKnown 
        ? `<span>BALLOTS IN BOX: <u style="background:#e0f2fe;padding:1px 5px;border:1px solid #0284c7;font-size:10px;">[ ${numVoters} ]</u> <span style="font-weight:normal;color:#444">(${esc(batchesSummary)}${allottedElectors ? ` · Turnout ${Math.round((numVoters / allottedElectors) * 100)}%` : ''})</span></span>
           <span>EXP. VOTES (2×): <u style="background:#fef3c7;padding:1px 5px;border:1px solid #d97706;font-size:10px;">[ ${numVoters * 2} ]</u></span>`
        : (numVoters > 0 
            ? `<span>ALLOTTED: <u>${numVoters}</u> <span style="font-weight:normal;color:#444">(${esc(batchesSummary)})</span></span>
               <span>BALLOTS IN BOX: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</span>
               <span>EXP. VOTES (2×): [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</span>`
            : `<span>BALLOTS IN BOX: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</span>
               <span>EXP. VOTES (2×): [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</span>`
          )
      }
      <span>SUPERVISOR: <u>${esc(supervisorName || '__________________')}</u></span>
    </div>

    <!-- Squeezed 1-line instructions bar -->
    <div style="background:#fefce8;border:1px solid #d97706;padding:2px 6px;font-size:8px;line-height:1.25;display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;color:#1c1917;">
      <div><strong>📌 INSTRUCTIONS:</strong> ${isActualBallotsKnown ? `Ballots in box = <strong>${numVoters}</strong> (Target votes = <strong>${numVoters * 2}</strong>) • ` : ''}Pre-bundle physical ballots in 25s • Each 25-ballot packet MUST yield 50 votes (2 × 25) • Verify batch total = 50 before next batch • Sum rows for Form 6.</div>
      <div style="white-space:nowrap;margin-left:8px;"><strong>Dual-Vote:</strong> 2 votes/ballot (1 vote = 1 Valid + 1 Invalid • Overvote = 2 Invalid • NOTA = 2 NOTA)</div>
    </div>

    <!-- Dynamic Batch-of-25 Milestone Tally Matrix -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:4px;font-size:10px;">
      <thead>
        <tr>
          <th style="width:${indexWidth}%;text-align:center;padding:3px 1px;">#</th>
          <th style="width:${nameWidth}%;text-align:left;padding:3px 4px;">
            <div style="font-size:${numBatches > 5 ? '8.5px' : '9.5px'};line-height:1.1;">Candidate Name &amp; Class</div>
          </th>
          ${batches.map(b => `
            <th style="width:${batchColWidth}%;text-align:center;padding:3px 1px;">
              <div style="font-weight:bold;font-size:${numBatches > 6 ? '8.5px' : '9.5px'}">${esc(b.name)}</div>
              <div style="font-size:7.5px;font-weight:normal;color:#333">${esc(b.range)}</div>
              <div style="font-size:7.5px;font-weight:normal;color:#555">Target: ${b.targetVotes} v</div>
            </th>
          `).join('')}
          <th style="width:${finalWidth}%;text-align:center;padding:3px 1px;background:#e0e7ff;">
            <div style="font-weight:bold;font-size:8.5px;line-height:1.1;">TOTAL</div>
            <div style="font-size:6.5px;font-weight:normal;color:#1e40af;line-height:1;">To Form 6</div>
          </th>
        </tr>
      </thead>
      <tbody>
        ${candsList.map((c, i) => `
          <tr style="${rowHStyle}">
            <td style="text-align:center;font-weight:bold;padding:4px 1px;vertical-align:top;">${i + 1}</td>
            <td style="font-weight:bold;padding:4px 4px;line-height:1.2;vertical-align:top;">
              <div style="font-size:${numBatches > 6 ? '9px' : '10px'};white-space:normal;word-break:break-word;">${esc(c.candidateName)}</div>
              <div style="font-size:8px;font-weight:normal;color:#555;margin-top:2px;">${esc(c.candidateClass || '')}</div>
            </td>
            ${batches.map(() => `<td class="tally-td"></td>`).join('')}
            <td style="padding:4px 1px;background:#f8fafc;font-weight:bold;font-size:12px;text-align:center;font-family:monospace;white-space:nowrap;vertical-align:middle;">[ &nbsp;&nbsp;&nbsp; ]</td>
          </tr>
        `).join('')}
        <tr style="${rowHStyle}">
          <td style="text-align:center;font-weight:bold;padding:4px 1px;vertical-align:top;">–</td>
          <td style="font-weight:bold;padding:4px 4px;font-size:10px;vertical-align:top;">NOTA</td>
          ${batches.map(() => `<td class="tally-td"></td>`).join('')}
          <td style="padding:4px 1px;background:#f8fafc;font-weight:bold;font-size:12px;text-align:center;font-family:monospace;white-space:nowrap;vertical-align:middle;">[ &nbsp;&nbsp;&nbsp; ]</td>
        </tr>
        <tr style="${rowHStyle}">
          <td style="text-align:center;font-weight:bold;padding:4px 1px;vertical-align:top;">–</td>
          <td style="padding:4px 4px;line-height:1.2;vertical-align:top;">
            <strong style="color:#b91c1c;font-size:9.5px;">INVALID</strong>
            <div style="font-size:7.5px;color:#555;margin-top:2px;">(1-choice, &gt;2, Blank)</div>
          </td>
          ${batches.map(() => `<td class="tally-td"></td>`).join('')}
          <td style="padding:4px 1px;background:#f8fafc;font-weight:bold;font-size:12px;text-align:center;color:#b91c1c;font-family:monospace;white-space:nowrap;vertical-align:middle;">[ &nbsp;&nbsp;&nbsp; ]</td>
        </tr>

        <!-- Batch Milestone Verification Subtotal Row -->
        <tr style="background:#fef3c7;font-weight:bold;border-top:2px solid #000;height:32px;">
          <td colspan="2" style="text-align:right;padding:4px 4px;font-size:9px;letter-spacing:0.3px;">
            BATCH TOTAL:
          </td>
          ${batches.map(() => `
            <td style="text-align:center;padding:4px 1px;font-size:11px;font-family:monospace;white-space:nowrap;">[ &nbsp;&nbsp;&nbsp; ]</td>
          `).join('')}
          <td style="text-align:center;padding:4px 1px;background:#dbeafe;font-size:12px;font-weight:bold;font-family:monospace;white-space:nowrap;">[ &nbsp;&nbsp;&nbsp; ]</td>
        </tr>

        <!-- Batch Balance Check (Must Equal Target) -->
        <tr style="background:#f9fafb;font-size:8.5px;border-bottom:2px double #000;height:26px;">
          <td colspan="2" style="text-align:right;padding:3px 4px;font-weight:bold;color:#444;font-size:8.5px;">
            CHECK:
          </td>
          ${batches.map(b => `
            <td style="text-align:center;padding:3px 1px;color:#15803d;font-weight:bold;font-size:8.5px;white-space:nowrap;">
              = ${b.targetVotes} [ &nbsp; ]
            </td>
          `).join('')}
          <td style="text-align:center;padding:3px 1px;font-weight:bold;color:#1e40af;font-size:8.5px;white-space:nowrap;">= ${numVoters > 0 ? numVoters * 2 : 'Total'} [ ${isActualBallotsKnown ? '✓' : '&nbsp;'} ]</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top:3px;border-top:1px dashed #777;padding-top:2px;font-size:8px;color:#555;font-style:italic;text-align:center;">
      * Working tally sheet for Table Counting Officers. ${isActualBallotsKnown ? `Ballots in box as per Ballot Paper Account: <strong>${numVoters}</strong> (${esc(batchesSummary)}${allottedElectors ? `, Allotted: ${allottedElectors}` : ''}).` : `Allotted: ${numVoters || 'General'} electors (${esc(batchesSummary)}).`} Verify each batch milestone before opening the next. Transfer final verified totals directly onto official Counting Form (Form 6). No signatures required.
    </div>
  </div>`;
}

