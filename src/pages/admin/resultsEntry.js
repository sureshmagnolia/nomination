/**
 * pages/admin/resultsEntry.js
 * Admin page to input vote counts for each Table + Post combination.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

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
  const pName = p => String(p.post || p.name || '');

  // ── IMPORTANT: Use the SAVED matrix data from the backend ──────────────────
  if (!savedMatrix) {
    main.innerHTML = `
      <div class="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
        <div class="text-5xl mb-4">⚠️</div>
        <h3 class="text-xl font-bold text-white mb-2">Matrix Not Set</h3>
        <p class="text-slate-400 mb-6">The Counting Matrix must be generated and saved in the "Counting Setup" page before you can enter results by Serial Number.</p>
      </div>
    `;
    return;
  }

  const { matrix, formSerials } = savedMatrix;
  
  // Reconstruct serialMap for lookup: serial -> {t, r, postName}
  const serialMap = {};
  Object.entries(formSerials).forEach(([key, serial]) => {
    const [t, r] = key.split('-').map(Number);
    const post = matrix[t][r];
    serialMap[serial] = { t, r, postName: pName(post) };
  });

  main.innerHTML = `
    <div class="page-enter space-y-6 max-w-4xl mx-auto">
      <div>
        <h3 class="text-xl font-bold text-white">Enter Vote Counts</h3>
        <p class="text-slate-400 text-sm">Enter the Form Serial Number from the counting form to load the entry sheet.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="glass rounded-xl p-6">
          <label class="block text-sm text-slate-300 mb-1">Form Serial Number</label>
          <div class="flex gap-2">
            <input type="number" id="txtSerial" class="field" placeholder="e.g. 15" autofocus>
            <button id="btnLoadBySerial" class="btn btn-primary px-6">Load Form</button>
          </div>
          <p class="text-[10px] text-slate-500 mt-2 italic">Found on the top-right corner of the printed counting form.</p>
        </div>

        <div class="glass rounded-xl p-6 opacity-60">
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
      renderFormGrid(booths[info.t].boothNumber, info.postName, s);
    } catch (e) {
      renderFormGrid(booths[info.t].boothNumber, info.postName, s);
    } finally {
      setLoading(btnSerial, false, 'Load Form');
    }
  };

  btnSerial.addEventListener('click', loadBySerial);
  txtSerial.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadBySerial(); });

  const btnLoadManual = main.querySelector('#btnLoadForm');
  btnLoadManual.addEventListener('click', async () => {
    const tableNum = main.querySelector('#selTable').value;
    const postName = main.querySelector('#selPost').value;
    if (!tableNum || !postName) { showToast('Select Table and Post', 'warning'); return; }
    
    try {
      setLoading(btnLoadManual, true, '...');
      const freshResults = await api.getResults().catch(() => []);
      allResults.length = 0;
      allResults.push(...freshResults);
      renderFormGrid(tableNum, postName, null);
    } catch (e) {
      renderFormGrid(tableNum, postName, null);
    } finally {
      setLoading(btnLoadManual, false, 'Load');
    }
  });

  const renderFormGrid = (tableNum, postName, serial) => {
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
            <h4 class="font-bold text-indigo-300">Form #${serial || 'N/A'} • Table ${tableNum} • ${esc(postName)}</h4>
            <p class="text-[10px] text-slate-500 mt-1">Enter total votes counted for each candidate below.</p>
          </div>
          ${serial ? `<div class="bg-indigo-500 text-white text-xs px-2 py-1 rounded font-bold">SERIAL #${serial}</div>` : ''}
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
            <div>
              <div class="font-bold text-slate-300">NOTA</div>
              <div class="text-xs text-slate-500">None Of The Above</div>
            </div>
            <div class="w-32">
              <input type="number" class="field text-center text-lg font-bold vote-input" data-cid="NOTA" data-cname="NOTA" placeholder="0" value="${getVotes('NOTA')}" min="0">
            </div>
          </div>
          
          <div class="flex items-center justify-between bg-red-500/5 p-4 rounded-lg border border-red-500/20">
            <div>
              <div class="font-bold text-red-400">INVALID</div>
              <div class="text-xs text-slate-500">Rejected ballots</div>
            </div>
            <div class="w-32">
              <input type="number" class="field text-center text-lg font-bold border-red-500/30 vote-input" data-cid="INVALID" data-cname="Invalid" placeholder="0" value="${getVotes('INVALID')}" min="0">
            </div>
          </div>
        </div>
        <div class="bg-slate-900/50 p-4 border-t border-white/10 text-right">
          <button id="btnSaveVotes" class="btn btn-success px-12">💾 Save Form Results</button>
        </div>
      </div>
    `;

    area.querySelector('#btnSaveVotes').addEventListener('click', async (e) => {
      const btn = e.target;
      const inputs = area.querySelectorAll('.vote-input');
      const resultsToSave = [];
      
      inputs.forEach(inp => {
        const votes = inp.value.trim();
        if (votes !== '') {
          resultsToSave.push({
            TableNumber: tableNum,
            Post: postName,
            CandidateId: inp.dataset.cid,
            CandidateName: inp.dataset.cname,
            Votes: parseInt(votes, 10),
            FormSerial: serial || 'N/A'
          });
        }
      });

      if (resultsToSave.length === 0) { showToast('Enter votes', 'warning'); return; }

      setLoading(btn, true, '💾 Saving...');
      try {
        await api.adminSaveResults(pwd, resultsToSave);
        resultsToSave.forEach(ns => {
          const idx = allResults.findIndex(r => String(r.TableNumber) === String(tableNum) && String(r.Post) === postName && r.CandidateId === ns.CandidateId);
          if (idx >= 0) allResults[idx].Votes = ns.Votes; else allResults.push(ns);
        });
        showToast('Form results saved!', 'success');
        area.innerHTML = '';
        txtSerial.value = '';
        txtSerial.focus();
      } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
      } finally {
        setLoading(btn, false, '💾 Save Form Results');
      }
    });
  };
}
