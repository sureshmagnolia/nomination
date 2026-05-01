/**
 * pages/admin/resultsEntry.js
 * Admin page to input vote counts for each Table + Post combination.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

const syncQueue = [];
let isSyncing = false;
let currentPwd = null;
let currentMain = null;

window.addEventListener('beforeunload', (e) => {
  if (syncQueue.some(i => i.status === 'pending' || i.status === 'syncing' || i.status === 'retry')) {
    e.preventDefault();
    e.returnValue = 'You have unsaved forms syncing in the background. Are you sure you want to leave?';
  }
});

export async function renderAdminResultsEntry(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'results-entry', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading data...</p></div>
  `);

  try {
    const [booths, posts, nominationsRaw, allResults, savedMatrix] = await Promise.all([
      api.adminGetBooths(pwd).catch(() => []),
      api.getPosts(),
      api.adminGetNominations(pwd).catch(() => []),
      api.getResults().catch(() => []),
      api.adminGetCountingMatrix(pwd).catch(() => null)
    ]);
    const allNoms  = Array.isArray(nominationsRaw) ? nominationsRaw : [];
    const finalList = allNoms.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');
    renderEntryUI(container.querySelector('#adminMain'), pwd, booths, posts, finalList, allResults, savedMatrix);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderEntryUI(main, pwd, booths, posts, finalList, allResults, savedMatrix) {
  currentMain = main;
  const pName = p => String(p.post || p.name || '');

  if (!savedMatrix) {
    main.innerHTML = `
      <div class="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
        <div class="text-5xl mb-4">⚠️</div>
        <h3 class="text-xl font-bold text-white mb-2">Matrix Not Set</h3>
        <p class="text-slate-400 mb-6">The Counting Matrix must be generated and saved in the "Counting Setup" page before you can enter results.</p>
      </div>
    `;
    return;
  }

  const { matrix, formSerials } = savedMatrix;
  const serialMap = {};
  Object.entries(formSerials).forEach(([key, serial]) => {
    const [t, r] = key.split('-').map(Number);
    const post = matrix[t][r];
    serialMap[serial] = { t, r, postName: pName(post) };
  });

  // Build a map of all valid form serials with their table/post info
  const allFormSerialsMeta = {};
  Object.entries(formSerials).forEach(([key, serial]) => {
    const [t, r] = key.split('-').map(Number);
    const post = matrix[t][r];
    const boothNum = booths[t]?.boothNumber;
    allFormSerialsMeta[serial] = { serial, tableNum: boothNum, postName: pName(post), roundNum: r + 1 };
  });

  main.innerHTML = `
    <div class="page-enter w-full max-w-[1500px] mx-auto">
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">

        <!-- LEFT: Entry Panel -->
        <div class="xl:col-span-7 space-y-4">
          <div>
            <h3 class="text-xl font-bold text-white">Enter Vote Counts</h3>
            <p class="text-slate-400 text-sm">Enter the Form Serial Number from the counting form to load the entry sheet.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="glass rounded-xl p-5">
              <label class="block text-sm text-slate-300 mb-1">Form Serial Number</label>
              <div class="flex gap-2">
                <input type="number" id="txtSerial" class="field" placeholder="e.g. 15" autofocus>
                <button id="btnLoadBySerial" class="btn btn-primary px-6">Load Form</button>
              </div>
            </div>

            <div class="glass rounded-xl p-5 opacity-60">
              <label class="block text-sm text-slate-300 mb-1">Manual Selection (Fallback)</label>
              <div class="flex gap-2">
                <select id="selTable" class="field text-xs">
                  <option value="">Table...</option>
                  ${booths.map(b => `<option value="${b.boothNumber}">Table ${b.boothNumber}</option>`).join('')}
                </select>
                <select id="selPost" class="field text-xs">
                  <option value="">Post...</option>
                  ${posts.map(p => `<option value="${esc(p.post||p.name)}">${esc(p.post||p.name)}</option>`).join('')}
                </select>
                <button id="btnLoadForm" class="btn btn-secondary px-4 text-xs">Load</button>
              </div>
            </div>
          </div>

          <div id="entryFormArea"></div>
        </div>

        <!-- RIGHT: Entered Forms Ledger -->
        <div class="xl:col-span-5">
          <div class="glass rounded-xl overflow-hidden border border-white/10 xl:sticky xl:top-20">
            <div class="bg-gradient-to-r from-slate-900/80 to-indigo-900/60 p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h4 class="font-bold text-white text-sm">Entered Forms Ledger</h4>
                <p class="text-[10px] text-slate-400 mt-0.5">Live sync status vs Google Sheet</p>
              </div>
              <span id="ledgerCount" class="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30">0 forms</span>
            </div>
            <div class="overflow-y-auto" style="max-height: 70vh;">
              <table class="w-full text-left text-xs">
                <thead class="sticky top-0 bg-slate-900/95 border-b border-white/10">
                  <tr>
                    <th class="px-3 py-2 text-slate-400 font-semibold w-16">Form #</th>
                    <th class="px-3 py-2 text-slate-400 font-semibold">Table / Post</th>
                    <th class="px-3 py-2 text-slate-400 font-semibold text-right w-24">Status</th>
                  </tr>
                </thead>
                <tbody id="ledgerBody">
                  <tr><td colspan="3" class="px-3 py-8 text-center text-slate-500 italic">No forms entered yet this session.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  const txtSerial = main.querySelector('#txtSerial');
  const btnSerial = main.querySelector('#btnLoadBySerial');

  const loadBySerial = async () => {
    const s = txtSerial.value.trim();
    if (!s) return;
    const info = serialMap[s];
    if (!info) { showToast(`Invalid Serial Number: ${s}`, 'error'); return; }
    
    try {
      setLoading(btnSerial, true, 'Loading...');
      const freshResults = await api.getResults().catch(() => []);
      allResults.length = 0;
      allResults.push(...freshResults);
      renderFormGrid(booths[info.t].boothNumber, info.postName, s, info.r + 1);
    } catch (e) {
      renderFormGrid(booths[info.t].boothNumber, info.postName, s, info.r + 1);
    } finally {
      setLoading(btnSerial, false, 'Load Form');
    }
  };

  btnSerial.addEventListener('click', loadBySerial);
  txtSerial.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadBySerial(); });

  main.querySelector('#btnLoadForm').addEventListener('click', async () => {
    const tableNum = main.querySelector('#selTable').value;
    const postName = main.querySelector('#selPost').value;
    if (!tableNum || !postName) { showToast('Select Table and Post', 'warning'); return; }
    
    const boothIdx = booths.findIndex(b => String(b.boothNumber) === String(tableNum));
    let foundSerial = null;
    let foundRound = null;
    if (boothIdx >= 0) {
      for (let r = 0; r < matrix[boothIdx].length; r++) {
        if (pName(matrix[boothIdx][r]) === postName) {
          foundRound = r + 1;
          foundSerial = formSerials[`${boothIdx}-${r}`];
          break;
        }
      }
    }

    try {
      setLoading(main.querySelector('#btnLoadForm'), true, '...');
      const freshResults = await api.getResults().catch(() => []);
      allResults.length = 0;
      allResults.push(...freshResults);
      renderFormGrid(tableNum, postName, foundSerial, foundRound);
    } catch (e) {
      renderFormGrid(tableNum, postName, foundSerial, foundRound);
    } finally {
      setLoading(main.querySelector('#btnLoadForm'), false, 'Load');
    }
  });

  const renderFormGrid = (tableNum, postName, serial, roundNum) => {
    const area = main.querySelector('#entryFormArea');
    const candidates = finalList.filter(c => c.post === postName);
    
    if (candidates.length === 0) {
      area.innerHTML = `<div class="alert alert-warning">No candidates found for ${esc(postName)}.</div>`;
      return;
    }

    const existing = allResults.filter(r => String(r.TableNumber) === String(tableNum) && String(r.Post) === postName);
    const getVotes = (cId) => existing.find(r => r.CandidateId === cId)?.Votes || '';

    area.innerHTML = `
      <div class="glass rounded-xl overflow-hidden page-enter">
        <div class="bg-indigo-500/10 p-4 border-b border-indigo-500/20 flex justify-between items-center">
          <div>
            <h4 class="font-bold text-indigo-300">Table ${tableNum} • Round ${roundNum || 'N/A'} • ${esc(postName)}</h4>
            <p class="text-[10px] text-slate-400 mt-1">Form Serial: #${serial || 'Manual'}</p>
          </div>
          ${serial ? `<div class="bg-indigo-500 text-white text-xs px-2 py-1 rounded font-bold">FORM #${serial}</div>` : ''}
        </div>
        <div class="p-6 space-y-4">
          ${candidates.map((c, i) => `
            <div class="flex items-center justify-between bg-white/5 p-4 rounded-lg border border-white/5">
              <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">${i + 1}</div>
                <div>
                  <div class="font-bold text-white">${esc(c.candidateName)}</div>
                  <div class="text-xs text-slate-400">${esc(c.candidateClass)}</div>
                </div>
              </div>
              <div class="w-32">
                <input type="number" class="field text-center text-lg font-bold vote-input" data-cid="${esc(c.id)}" data-cname="${esc(c.candidateName)}" placeholder="0" value="${getVotes(c.id)}" min="0">
              </div>
            </div>
          `).join('')}
          
          <div class="border-t border-white/10 my-4"></div>

          <div class="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <div><div class="font-bold text-slate-300">NOTA</div></div>
            <div class="w-32">
              <input type="number" class="field text-center text-lg font-bold vote-input" data-cid="NOTA" data-cname="NOTA" placeholder="0" value="${getVotes('NOTA')}" min="0">
            </div>
          </div>
          
          <div class="flex items-center justify-between bg-red-500/5 p-4 rounded-lg border border-red-500/20">
            <div><div class="font-bold text-red-400">INVALID</div></div>
            <div class="w-32">
              <input type="number" class="field text-center text-lg font-bold border-red-500/30 vote-input" data-cid="INVALID" data-cname="Invalid" placeholder="0" value="${getVotes('INVALID')}" min="0">
            </div>
          </div>

          <div class="flex items-center justify-between bg-indigo-500/20 p-4 rounded-lg border border-indigo-500/40 mt-4">
            <div class="font-black text-indigo-300 text-xl tracking-wider">TOTAL</div>
            <div class="w-32 text-center text-2xl font-black text-white" id="totalVotesDisplay">0</div>
          </div>
        </div>
        <div class="bg-slate-900/50 p-4 border-t border-white/10 flex justify-between items-center">
          <p class="text-xs text-slate-500 italic ml-2">Verify that this total matches the physical ballot count.</p>
          <button id="btnSaveVotes" class="btn btn-success px-12">💾 Save Form Results</button>
        </div>
      </div>
    `;

    const updateGrandTotal = () => {
      let total = 0;
      area.querySelectorAll('.vote-input').forEach(inp => {
        total += parseInt(inp.value, 10) || 0;
      });
      const disp = area.querySelector('#totalVotesDisplay');
      if (disp) disp.textContent = total;
    };
    area.querySelectorAll('.vote-input').forEach(inp => {
      inp.addEventListener('input', updateGrandTotal);
    });
    updateGrandTotal();

    area.querySelector('#btnSaveVotes').addEventListener('click', async () => {
      const inputs = area.querySelectorAll('.vote-input');
      const resultsToSave = [];
      
      inputs.forEach(inp => {
        const votes = inp.value.trim();
        if (votes !== '') {
          resultsToSave.push({
            TableNumber: tableNum,
            RoundNumber: roundNum,
            Post: postName,
            CandidateId: inp.dataset.cid,
            CandidateName: inp.dataset.cname,
            Votes: parseInt(votes, 10),
            FormSerial: serial || 'N/A'
          });
        }
      });

      if (resultsToSave.length === 0) { showToast('Enter votes', 'warning'); return; }

      // Optimistically update allResults
      resultsToSave.forEach(ns => {
        const idx = allResults.findIndex(r => String(r.TableNumber) === String(tableNum) && String(r.Post) === postName && r.CandidateId === ns.CandidateId);
        if (idx >= 0) {
            allResults[idx].Votes = ns.Votes;
            allResults[idx].RoundNumber = ns.RoundNumber;
            allResults[idx].FormSerial = ns.FormSerial;
        } else {
            allResults.push(ns);
        }
      });

      // Queue the save
      const syncId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      syncQueue.push({
        id: syncId,
        serial: serial || 'Manual',
        tableNum,
        postName,
        roundNum,
        payload: resultsToSave,
        status: 'pending'
      });

      showToast(`Form #${serial || 'Manual'} queued!`, 'info');
      area.innerHTML = '';
      txtSerial.value = '';
      txtSerial.focus();

      currentPwd = pwd;
      renderLedger(main, allResults, allFormSerialsMeta);
      processQueue(main, allResults, allFormSerialsMeta);
    });
  };

  // Initial ledger render from server data
  renderLedger(main, allResults, allFormSerialsMeta);

  // Resume any pending syncs if navigating back
  if (syncQueue.some(i => i.status === 'pending' || i.status === 'retry')) {
    processQueue(main, allResults, allFormSerialsMeta);
  }
}

async function processQueue(main, allResults, allFormSerialsMeta) {
  if (isSyncing) return;
  isSyncing = true;

  while (syncQueue.some(i => i.status === 'pending' || i.status === 'retry')) {
    const item = syncQueue.find(i => i.status === 'pending' || i.status === 'retry');
    item.status = 'syncing';
    renderLedger(main, allResults, allFormSerialsMeta);

    try {
      await api.adminSaveResults(currentPwd, item.payload);
      item.status = 'success';
    } catch (err) {
      item.status = 'error';
      item.errorMsg = err.message;
    }
    renderLedger(main, allResults, allFormSerialsMeta);
  }

  isSyncing = false;
}

function renderLedger(main, allResults, allFormSerialsMeta) {
  const body = main.querySelector('#ledgerBody');
  const countEl = main.querySelector('#ledgerCount');
  if (!body) return;

  // Build a map of serials that have data in allResults (server-confirmed)
  const serverSerials = new Set();
  allResults.forEach(r => {
    if (r.FormSerial && r.FormSerial !== 'N/A') serverSerials.add(String(r.FormSerial));
  });

  // Build rows: start from allFormSerialsMeta, determine status from queue or server
  const rows = [];

  // 1. Add all forms in the sync queue (most recent activity)
  syncQueue.forEach(item => {
    rows.push({
      serial: item.serial,
      tableNum: item.tableNum,
      postName: item.postName,
      roundNum: item.roundNum,
      status: item.status,
      id: item.id,
      errorMsg: item.errorMsg || ''
    });
  });

  // 2. Add forms from server that are NOT already in the queue
  const queueSerials = new Set(syncQueue.map(q => String(q.serial)));
  serverSerials.forEach(serial => {
    if (!queueSerials.has(serial)) {
      const meta = allFormSerialsMeta[serial] || {};
      rows.push({
        serial,
        tableNum: meta.tableNum || '—',
        postName: meta.postName || '—',
        roundNum: meta.roundNum || '—',
        status: 'server'
      });
    }
  });

  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="3" class="px-3 py-8 text-center text-slate-500 italic">No forms entered yet this session.</td></tr>`;
    if (countEl) countEl.textContent = '0 forms';
    return;
  }

  // Sort: queue items first (newest first), then server items (by serial desc)
  rows.sort((a, b) => {
    const order = { syncing: 0, pending: 1, retry: 2, error: 3, success: 4, server: 5 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return Number(b.serial) - Number(a.serial);
  });

  const statusBadge = (item) => {
    switch (item.status) {
      case 'syncing':
        return `<span class="flex items-center justify-end gap-1 text-blue-300"><span class="spinner" style="width:9px;height:9px;border-width:2px;"></span> Syncing</span>`;
      case 'pending':
      case 'retry':
        return `<span class="text-amber-400">⏳ Queued</span>`;
      case 'success':
        return `<span class="text-green-400">✅ Saved</span>`;
      case 'error':
        return `<button class="text-red-400 hover:text-red-300 underline retry-btn text-right" data-id="${item.id}" title="${esc(item.errorMsg)}">❌ Failed</button>`;
      case 'server':
        return `<span class="text-slate-400">☁️ In Sheet</span>`;
      default:
        return '—';
    }
  };

  body.innerHTML = rows.map(item => `
    <tr class="border-b border-white/5 hover:bg-white/5 transition ${item.status === 'syncing' ? 'bg-blue-500/5' : item.status === 'error' ? 'bg-red-500/5' : ''}">
      <td class="px-3 py-2.5 font-bold text-white">#${item.serial}</td>
      <td class="px-3 py-2.5">
        <div class="text-slate-300 leading-tight truncate max-w-[160px]" title="${esc(item.postName)}">${esc(item.postName)}</div>
        <div class="text-[10px] text-slate-500">Table ${item.tableNum} · Rnd ${item.roundNum}</div>
      </td>
      <td class="px-3 py-2.5 text-right text-[11px] font-semibold">${statusBadge(item)}</td>
    </tr>
  `).join('');

  if (countEl) countEl.textContent = `${rows.length} form${rows.length !== 1 ? 's' : ''}`;

  // Attach retry listeners
  body.querySelectorAll('.retry-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = syncQueue.find(i => i.id === id);
      if (item) {
        item.status = 'retry';
        renderLedger(main, allResults, allFormSerialsMeta);
        processQueue(main, allResults, allFormSerialsMeta);
      }
    });
  });
}
