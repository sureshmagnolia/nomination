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
    const [booths, posts, finalList, allResults] = await Promise.all([
      api.adminGetBooths(pwd).catch(() => []),
      api.getPosts(),
      api.getFinalList(),
      api.getResults().catch(() => [])
    ]);
    renderEntryUI(container.querySelector('#adminMain'), pwd, booths, posts, finalList, allResults);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderEntryUI(main, pwd, booths, posts, finalList, allResults) {
  main.innerHTML = `
    <div class="page-enter space-y-6 max-w-4xl mx-auto">
      <div>
        <h3 class="text-xl font-bold text-white">Enter Vote Counts</h3>
        <p class="text-slate-400 text-sm">Select a Table and a Post to enter the vote tallies from the counting forms.</p>
      </div>

      <div class="glass rounded-xl p-6 flex flex-col md:flex-row gap-4 items-end">
        <div class="flex-1">
          <label class="block text-sm text-slate-300 mb-1">Select Table (Booth)</label>
          <select id="selTable" class="field">
            <option value="">-- Choose a Table --</option>
            ${booths.map(b => `<option value="${b.boothNumber}">Table ${b.boothNumber} (${esc(b.roomName)})</option>`).join('')}
          </select>
        </div>
        <div class="flex-1">
          <label class="block text-sm text-slate-300 mb-1">Select Post</label>
          <select id="selPost" class="field">
            <option value="">-- Choose a Post --</option>
            ${posts.map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('')}
          </select>
        </div>
        <button id="btnLoadForm" class="btn btn-secondary px-8">Load Form</button>
      </div>

      <div id="entryFormArea"></div>
    </div>
  `;

  main.querySelector('#btnLoadForm').addEventListener('click', () => {
    const tableNum = main.querySelector('#selTable').value;
    const postName = main.querySelector('#selPost').value;
    
    if (!tableNum || !postName) {
      showToast('Please select both a Table and a Post.', 'warning');
      return;
    }

    renderFormGrid(tableNum, postName);
  });

  const renderFormGrid = (tableNum, postName) => {
    const area = main.querySelector('#entryFormArea');
    const candidates = finalList.filter(c => c.post === postName);
    
    if (candidates.length === 0) {
      area.innerHTML = `<div class="alert alert-warning">No candidates found for ${esc(postName)}. Cannot enter votes.</div>`;
      return;
    }

    // Extract existing results for this Table + Post
    const existing = allResults.filter(r => String(r.TableNumber) === String(tableNum) && String(r.Post) === postName);
    const getVotes = (cId) => existing.find(r => r.CandidateId === cId)?.Votes || '';
    const invalidVotes = getVotes('INVALID') || '';

    area.innerHTML = `
      <div class="glass rounded-xl overflow-hidden page-enter">
        <div class="bg-indigo-500/10 p-4 border-b border-indigo-500/20">
          <h4 class="font-bold text-indigo-300">Entering Results for Table ${tableNum} • ${esc(postName)}</h4>
        </div>
        <div class="p-6 space-y-4">
          ${candidates.map((c, i) => `
            <div class="flex items-center justify-between bg-white/5 p-4 rounded-lg border border-white/5">
              <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">${i + 1}</div>
                <div>
                  <div class="font-bold text-white">${esc(c.candidateName || c.candidate?.NAME)}</div>
                  <div class="text-xs text-slate-500 font-mono">ID: ${esc(c.id)}</div>
                </div>
              </div>
              <div class="w-32">
                <input type="number" class="field text-center text-lg font-bold vote-input" data-cid="${esc(c.id)}" data-cname="${esc(c.candidateName || c.candidate?.NAME)}" placeholder="0" value="${getVotes(c.id)}" min="0">
              </div>
            </div>
          `).join('')}
          
          <div class="border-t border-white/10 my-4"></div>
          
          <div class="flex items-center justify-between bg-red-500/5 p-4 rounded-lg border border-red-500/20">
            <div class="flex items-center gap-4">
              <div class="w-8 h-8 rounded-full bg-red-950 flex items-center justify-center text-red-500 font-bold">!</div>
              <div>
                <div class="font-bold text-red-400">Invalid / Blank Votes</div>
                <div class="text-xs text-slate-500">Votes that were rejected or left blank</div>
              </div>
            </div>
            <div class="w-32">
              <input type="number" class="field text-center text-lg font-bold border-red-500/30 vote-input" data-cid="INVALID" data-cname="Invalid / Blank Votes" placeholder="0" value="${invalidVotes}" min="0">
            </div>
          </div>
        </div>
        <div class="bg-slate-900/50 p-4 border-t border-white/10 text-right">
          <button id="btnSaveVotes" class="btn btn-success px-8">💾 Save Votes</button>
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
            Votes: parseInt(votes, 10)
          });
        }
      });

      if (resultsToSave.length === 0) {
        showToast('No votes entered. Please enter at least one value.', 'warning');
        return;
      }

      setLoading(btn, true, '💾 Saving...');
      try {
        await api.adminSaveResults(pwd, resultsToSave);
        
        // Update local cache so we don't need a full reload if they click it again
        resultsToSave.forEach(ns => {
          const idx = allResults.findIndex(r => String(r.TableNumber) === String(tableNum) && String(r.Post) === postName && r.CandidateId === ns.CandidateId);
          if (idx >= 0) allResults[idx].Votes = ns.Votes;
          else allResults.push(ns);
        });

        showToast('Results saved successfully!', 'success');
        area.innerHTML = '';
        main.querySelector('#selTable').value = '';
        main.querySelector('#selPost').value = '';
      } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
      } finally {
        setLoading(btn, false, '💾 Save Votes');
      }
    });
  };
}
