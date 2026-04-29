/**
 * pages/admin/testing.js
 * Admin page for testing utilities — inject test data and wipe data.
 * NEVER expose this in production navigation without careful consideration.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

export function renderAdminTesting(container) {
  const pwd = getAdminPassword(); if (!pwd) return;

  renderAdminLayout(container, 'testing', `
    <div class="page-enter space-y-8 max-w-3xl mx-auto">

      <!-- Warning Banner -->
      <div class="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-4">
        <div class="text-3xl">⚠️</div>
        <div>
          <h4 class="font-bold text-amber-400 text-lg">Testing Environment Tools</h4>
          <p class="text-amber-200/70 text-sm mt-1">
            These tools are for <strong>testing and debugging only</strong>. 
            Do not inject test data during or after the actual election process begins.
            Wiping data is <strong>irreversible</strong> — always confirm before acting.
          </p>
        </div>
      </div>

      <!-- Inject Test Data -->
      <div class="glass rounded-2xl overflow-hidden border border-indigo-500/20">
        <div class="bg-indigo-500/10 p-5 border-b border-indigo-500/20 flex items-center gap-3">
          <div class="text-2xl">🧪</div>
          <div>
            <h4 class="font-bold text-white text-lg">Inject Test Data</h4>
            <p class="text-slate-400 text-sm">Creates 2 synthetic, pre-approved candidates for every configured post using real students from the Nominal Roll.</p>
          </div>
        </div>
        <div class="p-6 space-y-4">
          <ul class="text-sm text-slate-400 space-y-1 list-disc list-inside">
            <li>Reads all posts from the <strong class="text-white">Posts</strong> sheet.</li>
            <li>Picks real students from <strong class="text-white">NominalRoll</strong> as candidates, proposers, and seconders.</li>
            <li>Sets status to <strong class="text-green-400">Valid</strong> and populates <strong class="text-white">Nominations, ValidList, and FinalList</strong>.</li>
            <li>IDs are prefixed with <code class="text-indigo-300 bg-black/30 px-1 rounded">TEST</code> for easy identification.</li>
          </ul>
          <div class="pt-2">
            <button id="btnInjectData" class="btn btn-primary gap-2">
              🧪 Inject Test Nominations
            </button>
          </div>
          <div id="injectStatus"></div>
        </div>
      </div>

      <!-- Wipe All Data -->
      <div class="glass rounded-2xl overflow-hidden border border-red-500/30">
        <div class="bg-red-500/10 p-5 border-b border-red-500/30 flex items-center gap-3">
          <div class="text-2xl">🗑️</div>
          <div>
            <h4 class="font-bold text-red-400 text-lg">Wipe All Transactional Data</h4>
            <p class="text-slate-400 text-sm">Permanently deletes all nominations, results, and resets the publish flags. Leaves NominalRoll, Posts, and Booth configuration intact.</p>
          </div>
        </div>
        <div class="p-6 space-y-4">
          <div class="rounded-lg bg-red-900/20 border border-red-800/40 p-4 text-sm text-red-300 space-y-1">
            <p>🗑️ <strong>Nominations</strong> sheet — will be cleared</p>
            <p>🗑️ <strong>ValidList</strong> sheet — will be cleared</p>
            <p>🗑️ <strong>FinalList</strong> sheet — will be cleared</p>
            <p>🗑️ <strong>Results</strong> sheet — will be cleared</p>
            <p>🔄 <strong>Publish flags</strong> — will be reset to false</p>
            <p class="text-green-400 mt-2">✅ NominalRoll, Posts, Booths, Settings (locations) — <strong>preserved</strong></p>
          </div>
          
          <!-- Password confirmation -->
          <div class="space-y-2 pt-2">
            <label class="block text-sm text-slate-300 font-medium">Confirm Admin Password</label>
            <input type="password" id="wipePasswordInput" class="field max-w-xs" placeholder="Enter today's admin password to confirm...">
          </div>
          
          <div>
            <button id="btnWipeData" class="btn bg-red-600 hover:bg-red-500 text-white border-none gap-2 px-6">
              🗑️ Permanently Wipe All Data
            </button>
          </div>
          <div id="wipeStatus"></div>
        </div>
      </div>

    </div>
  `);

  const main = container.querySelector('#adminMain');

  // ── Inject ────────────────────────────────────────────────────────────────
  main.querySelector('#btnInjectData').addEventListener('click', async (e) => {
    const btn = e.target;

    const confirmed = confirm(
      'This will inject test nominations for ALL configured posts.\n\nProceed?'
    );
    if (!confirmed) return;

    setLoading(btn, true, '🧪 Inject Test Nominations');
    const status = main.querySelector('#injectStatus');
    status.innerHTML = '';

    try {
      const res = await api.adminInjectTestData(pwd);
      status.innerHTML = `
        <div class="alert mt-3" style="background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #6ee7b7;">
          ✅ Successfully injected <strong>${res.injected}</strong> test nominations across all posts.
          They are pre-approved and appear in Valid/Final lists.
        </div>`;
      showToast(`Injected ${res.injected} test nominations!`, 'success');
    } catch (err) {
      status.innerHTML = `<div class="alert alert-error mt-3">❌ ${esc(err.message)}</div>`;
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setLoading(btn, false, '🧪 Inject Test Nominations');
    }
  });

  // ── Wipe ──────────────────────────────────────────────────────────────────
  main.querySelector('#btnWipeData').addEventListener('click', async (e) => {
    const btn = e.target;
    const enteredPwd = main.querySelector('#wipePasswordInput').value.trim();

    if (!enteredPwd) {
      showToast('Please enter the admin password to confirm the wipe.', 'warning');
      main.querySelector('#wipePasswordInput').focus();
      return;
    }

    const confirmed = confirm(
      '⚠️ DANGER ZONE ⚠️\n\n' +
      'This will PERMANENTLY DELETE:\n' +
      '• All Nominations\n• ValidList\n• FinalList\n• Results\n\n' +
      'This action CANNOT be undone.\n\nAre you absolutely sure?'
    );
    if (!confirmed) return;

    setLoading(btn, true, '🗑️ Wiping...');
    const status = main.querySelector('#wipeStatus');
    status.innerHTML = '';

    try {
      await api.adminWipeData(enteredPwd);
      main.querySelector('#wipePasswordInput').value = '';
      status.innerHTML = `
        <div class="alert mt-3" style="background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #fca5a5;">
          ✅ All transactional data has been wiped. Publish flags reset to false.
        </div>`;
      showToast('All data wiped successfully.', 'success');
    } catch (err) {
      status.innerHTML = `<div class="alert alert-error mt-3">❌ ${esc(err.message)}</div>`;
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setLoading(btn, false, '🗑️ Permanently Wipe All Data');
    }
  });
}
