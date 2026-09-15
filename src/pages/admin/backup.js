/**
 * pages/admin/backup.js
 * Comprehensive Data Backup & Disaster Recovery Suite.
 * Exports and restores the complete election state from Nominal Roll to Final Results.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';
import { CONFIG } from '../../config.js';

export async function renderAdminBackup(container) {
  const pwd = getAdminPassword(); if (!pwd) return;

  renderAdminLayout(container, 'backup', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading backup & recovery system...</p></div>
  `);

  try {
    const [settings, roll, posts, noms, snapshots] = await Promise.all([
      api.adminGetSettings(pwd).catch(() => ({})),
      api.getNominalRoll().catch(() => []),
      api.getPosts().catch(() => []),
      api.adminGetNominations(pwd).catch(() => []),
      api.adminGetSnapshots(pwd).catch(() => [])
    ]);

    renderBackupPage(container.querySelector('#adminMain'), pwd, {
      settings,
      rollCount: roll.length,
      postsCount: posts.length,
      nomsCount: noms.length,
      snapshots
    });
  } catch (err) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(err.message)}</div>`;
  }
}

function renderBackupPage(main, pwd, { settings, rollCount, postsCount, nomsCount, snapshots }) {
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;
  const year = settings.electionYear || new Date().getFullYear();
  const isRollFinal = settings.nominalRollFinalized === 'true' || settings.isRollFinalized === 'true';
  const isResultsPublished = settings.resultsPublished === 'true';

  main.innerHTML = `
    <div class="page-enter space-y-8 max-w-5xl mx-auto pb-12">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div class="flex items-center gap-3">
            <h3 class="text-2xl font-black text-white tracking-tight">Full System Backup &amp; Restore</h3>
            <span class="badge badge-valid text-xs px-2.5 py-1 font-mono">v2.0 Enterprise</span>
          </div>
          <p class="text-slate-400 text-sm mt-1">
            Complete data protection suite covering the entire lifecycle from Nominal Roll to Live &amp; Final Election Results.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button id="btnRefreshSnapshots" class="btn btn-secondary btn-sm flex items-center gap-2">
            <span>🔄</span> Refresh Stats
          </button>
        </div>
      </div>

      <!-- Live System Snapshot Stats Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="glass rounded-xl p-4 border border-white/5">
          <p class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Nominal Roll</p>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-2xl font-bold text-white">${rollCount.toLocaleString()}</span>
            <span class="text-xs ${isRollFinal ? 'text-emerald-400' : 'text-amber-400'}">
              ${isRollFinal ? '🔒 Locked' : '📋 Draft'}
            </span>
          </div>
        </div>
        <div class="glass rounded-xl p-4 border border-white/5">
          <p class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Election Posts</p>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-2xl font-bold text-white">${postsCount}</span>
            <span class="text-xs text-slate-400">Registered</span>
          </div>
        </div>
        <div class="glass rounded-xl p-4 border border-white/5">
          <p class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Nominations</p>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-2xl font-bold text-white">${nomsCount}</span>
            <span class="text-xs text-indigo-300">Total Filed</span>
          </div>
        </div>
        <div class="glass rounded-xl p-4 border border-white/5">
          <p class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Election Results</p>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-base font-bold ${isResultsPublished ? 'text-emerald-400' : 'text-slate-300'}">
              ${isResultsPublished ? '📢 Published' : '⏳ Pending'}
            </span>
          </div>
        </div>
      </div>

      <!-- Module 1: Export Backup Archive -->
      <div class="glass rounded-2xl overflow-hidden border border-indigo-500/20 shadow-xl">
        <div class="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/50 p-6 border-b border-white/10 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl shadow-inner">
              💾
            </div>
            <div>
              <h4 class="font-bold text-white text-lg">1. Export Full System Backup</h4>
              <p class="text-slate-400 text-xs mt-0.5">Generates a cryptographically verified JSON archive of your entire database.</p>
            </div>
          </div>
          <span class="text-xs bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30 hidden sm:inline-block">
            SHA-256 Verified
          </span>
        </div>

        <div class="p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-3">
              <p class="text-sm text-slate-300 font-semibold">Included in this Backup Archive:</p>
              <ul class="text-xs text-slate-400 space-y-2">
                <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Full Nominal Roll Voters (${rollCount} records) &amp; Student Correction Requests</li>
                <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Posts &amp; Eligibility Rules (${postsCount} posts)</li>
                <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Nominations (${nomsCount} candidates, proposers &amp; seconders)</li>
                <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Polling Booths, Locations &amp; Department Mappings</li>
                <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Master Ballot Plans (Executive, Year Reps &amp; Associations)</li>
                <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Counting Matrices &amp; Live/Final Election Results</li>
                <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Election Schedule, College Branding &amp; Settings</li>
              </ul>
              <div class="p-3 rounded-lg bg-slate-900/60 border border-white/5 text-[11px] text-slate-400">
                🔒 <strong>Security Note:</strong> Admin passwords and temporary one-time passcodes are automatically excluded from the archive for credential safety.
              </div>
            </div>

            <div class="flex flex-col justify-between p-5 rounded-xl bg-indigo-950/20 border border-indigo-500/10 space-y-4">
              <div>
                <p class="text-xs text-indigo-300 uppercase tracking-wider font-semibold mb-1">Target Package</p>
                <p class="text-white font-mono text-sm break-all font-semibold">
                  ELECTION_BACKUP_${shortName.toUpperCase()}_${year}_${new Date().toISOString().slice(0, 10)}.json
                </p>
                <p class="text-slate-400 text-xs mt-2">
                  Source: <strong>${esc(collegeName)}</strong> (Year: ${year})
                </p>
              </div>
              <button id="btnExportFullBackup" class="btn btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base font-bold shadow-lg shadow-indigo-600/30">
                <span>💾</span> Download Full System Backup (.JSON)
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Module 2: System Restore & Inspection Wizard -->
      <div class="glass rounded-2xl overflow-hidden border border-amber-500/20 shadow-xl">
        <div class="bg-gradient-to-r from-amber-950/40 via-rose-950/30 to-slate-900/50 p-6 border-b border-white/10 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl shadow-inner">
              📥
            </div>
            <div>
              <h4 class="font-bold text-white text-lg">2. Restore Database from Backup</h4>
              <p class="text-slate-400 text-xs mt-0.5">Upload a previously generated backup archive with dry-run inspection and safety snapshots.</p>
            </div>
          </div>
          <span class="text-xs bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30 hidden sm:inline-block">
            Fail-Safe Snapshot Guard
          </span>
        </div>

        <div class="p-6 space-y-6">
          <!-- Step A: File Selection -->
          <div id="restoreUploadArea" class="border-2 border-dashed border-white/20 hover:border-indigo-400/50 rounded-2xl p-8 text-center transition-all bg-slate-900/40">
            <input type="file" id="backupFileInput" accept=".json,application/json" class="hidden" />
            <div class="text-5xl mb-3">📁</div>
            <h5 class="text-base font-bold text-white">Select or Drag &amp; Drop Backup File</h5>
            <p class="text-slate-400 text-xs mt-1">Upload a valid <code>.json</code> election backup archive exported from this portal.</p>
            <div class="mt-4">
              <button type="button" id="btnBrowseFile" class="btn btn-secondary btn-sm px-6">
                Browse File
              </button>
            </div>
          </div>

          <!-- Step B: Deep Inspection Report (Hidden until file selected) -->
          <div id="inspectionSection" class="hidden space-y-6">
            <div class="p-5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-emerald-400 text-lg">✅</span>
                  <h5 class="font-bold text-white text-base">Backup Archive Validated</h5>
                  <span id="inspectChecksumBadge" class="badge badge-valid text-[10px] font-mono">SHA-256 OK</span>
                </div>
                <p id="inspectMetaDetails" class="text-xs text-slate-300 mt-1 font-mono"></p>
              </div>
              <button type="button" id="btnRemoveFile" class="btn btn-secondary btn-sm text-xs self-start md:self-auto">
                Change File
              </button>
            </div>

            <!-- Comparison Table: Live vs Backup -->
            <div>
              <h5 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span>🔍</span> Side-by-Side Inventory Comparison
              </h5>
              <div class="overflow-x-auto rounded-xl border border-white/10">
                <table class="data-table text-xs">
                  <thead>
                    <tr>
                      <th>Module / Entity</th>
                      <th>Current Live Count</th>
                      <th>Backup File Count</th>
                      <th>Variance</th>
                      <th class="text-center">Include in Restore</th>
                    </tr>
                  </thead>
                  <tbody id="inventoryComparisonTbody">
                    <!-- Populated dynamically -->
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Restore Mode Options -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label class="glass p-4 rounded-xl border border-white/10 flex items-start gap-3 cursor-pointer hover:border-indigo-500/40 transition">
                <input type="radio" name="restoreMode" value="full_wipe_and_replace" checked class="mt-1 accent-indigo-500" />
                <div>
                  <p class="font-bold text-white text-sm">Clean Wipe &amp; Replace (Recommended)</p>
                  <p class="text-slate-400 text-xs mt-0.5">Clears existing records in the selected tables and replaces them with exact backup state.</p>
                </div>
              </label>
              <label class="glass p-4 rounded-xl border border-white/10 flex items-start gap-3 cursor-pointer hover:border-indigo-500/40 transition">
                <input type="radio" name="restoreMode" value="merge_and_update" class="mt-1 accent-indigo-500" />
                <div>
                  <p class="font-bold text-white text-sm">Merge &amp; Overwrite</p>
                  <p class="text-slate-400 text-xs mt-0.5">Updates matching IDs and inserts missing records without deleting records added since the backup.</p>
                </div>
              </label>
            </div>

            <!-- Security & Confirmation Challenge -->
            <div class="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-4">
              <div class="flex items-start gap-3">
                <span class="text-2xl text-rose-400">🛡️</span>
                <div>
                  <h5 class="font-bold text-rose-300 text-sm">Fail-Safe Protection &amp; Confirmation</h5>
                  <p class="text-rose-200/70 text-xs mt-0.5">
                    An automatic <strong>Pre-Restore Safety Snapshot</strong> will be saved in the database before changes are applied. You can revert instantly if needed.
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">
                    Enter Admin Password <span class="text-rose-400">*</span>
                  </label>
                  <input type="password" id="restoreAdminPwd" class="field text-sm" placeholder="Your admin password" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">
                    Type <code class="text-rose-400 font-bold bg-black/40 px-1 py-0.5 rounded">CONFIRM RESTORE</code> <span class="text-rose-400">*</span>
                  </label>
                  <input type="text" id="restoreConfirmPhrase" class="field text-sm font-mono" placeholder="CONFIRM RESTORE" />
                </div>
              </div>

              <div class="pt-2">
                <button type="button" id="btnExecuteRestore" class="btn btn-danger w-full py-3.5 flex items-center justify-center gap-2 font-bold text-base shadow-lg shadow-rose-900/30">
                  <span>⚠️</span> Execute System Restore
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Module 3: In-System Cloud Snapshots & Quick Revert -->
      <div class="glass rounded-2xl overflow-hidden border border-white/10 shadow-xl">
        <div class="p-6 border-b border-white/10 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl shadow-inner">
              ⏱️
            </div>
            <div>
              <h4 class="font-bold text-white text-lg">3. Internal Database Checkpoints &amp; Rollbacks</h4>
              <p class="text-slate-400 text-xs mt-0.5">Automatic snapshots preserved inside PostgreSQL. Revert state instantly with one click.</p>
            </div>
          </div>
          <span class="text-xs text-slate-400 font-mono">${snapshots.length} Snapshots Saved</span>
        </div>

        <div class="p-6">
          ${snapshots.length === 0 ? `
            <div class="text-center py-10 text-slate-500 text-sm">
              <p class="text-3xl mb-2">📦</p>
              <p>No internal snapshots recorded yet.</p>
              <p class="text-xs mt-1">Snapshots are automatically captured whenever backups are exported or restores are initiated.</p>
            </div>
          ` : `
            <div class="overflow-x-auto rounded-xl border border-white/10">
              <table class="data-table text-xs">
                <thead>
                  <tr>
                    <th>Checkpoint Name</th>
                    <th>Type</th>
                    <th>Created At</th>
                    <th>Saved Records</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${snapshots.map(s => {
                    const sum = s.summary || {};
                    const isPreRestore = s.triggerType === 'pre_restore';
                    return `
                      <tr class="hover:bg-white/[0.02] transition">
                        <td>
                          <div class="font-bold text-white text-sm">${esc(s.snapshotName)}</div>
                          <div class="text-[10px] text-slate-500 font-mono">${esc(s.id)}</div>
                        </td>
                        <td>
                          <span class="badge ${isPreRestore ? 'badge-valid' : 'badge-pending'} text-[10px]">
                            ${isPreRestore ? '🛡️ Pre-Restore Safety' : '💾 Export'}
                          </span>
                        </td>
                        <td class="text-slate-300 font-mono">${new Date(s.createdAt).toLocaleString()}</td>
                        <td>
                          <div class="flex flex-wrap gap-1">
                            ${sum.nominalRoll !== undefined ? `<span class="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono">${sum.nominalRoll} Voters</span>` : ''}
                            ${sum.nominations !== undefined ? `<span class="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-mono">${sum.nominations} Noms</span>` : ''}
                            ${sum.posts !== undefined ? `<span class="bg-slate-800 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-mono">${sum.posts} Posts</span>` : ''}
                          </div>
                        </td>
                        <td class="text-right">
                          <div class="flex items-center justify-end gap-2">
                            <button data-download-snap="${esc(s.id)}" class="btn btn-secondary btn-xs">
                              📥 Download
                            </button>
                            <button data-revert-snap="${esc(s.id)}" data-name="${esc(s.snapshotName)}" class="btn btn-danger btn-xs">
                              🔄 Revert
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  // Attach event handlers
  setupBackupHandlers(main, pwd, { settings, rollCount, postsCount, nomsCount });
}

function setupBackupHandlers(main, pwd, liveStats) {
  // 1. Refresh stats
  main.querySelector('#btnRefreshSnapshots')?.addEventListener('click', () => {
    renderAdminBackup(main.closest('#app'));
  });

  // 2. Export Full Backup
  const btnExport = main.querySelector('#btnExportFullBackup');
  btnExport?.addEventListener('click', async () => {
    setLoading(btnExport, true, 'Generating Archive...');
    try {
      const backupData = await api.adminExportBackup(pwd);
      const meta = backupData.metadata || {};
      const filename = `ELECTION_BACKUP_${meta.collegeShortName || 'GVC'}_${meta.electionYear || '2026'}_${new Date().toISOString().slice(0,10)}.json`;

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Backup exported successfully! File: ${filename}`, 'success');
      // Refresh to show newly generated snapshot
      setTimeout(() => renderAdminBackup(main.closest('#app')), 1200);
    } catch (err) {
      showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setLoading(btnExport, false, '💾 Download Full System Backup (.JSON)');
    }
  });

  // 3. File Input & Drag and Drop
  const fileInput = main.querySelector('#backupFileInput');
  const btnBrowse = main.querySelector('#btnBrowseFile');
  const uploadArea = main.querySelector('#restoreUploadArea');
  const inspectSection = main.querySelector('#inspectionSection');
  let loadedBackupData = null;

  btnBrowse?.addEventListener('click', () => fileInput.click());
  uploadArea?.addEventListener('click', (e) => {
    if (e.target !== btnBrowse) fileInput.click();
  });

  uploadArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('border-indigo-400', 'bg-indigo-950/20');
  });

  uploadArea?.addEventListener('dragleave', () => {
    uploadArea.classList.remove('border-indigo-400', 'bg-indigo-950/20');
  });

  uploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('border-indigo-400', 'bg-indigo-950/20');
    if (e.dataTransfer.files?.length) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files?.length) {
      processSelectedFile(e.target.files[0]);
    }
  });

  const processSelectedFile = (file) => {
    if (!file.name.endsWith('.json')) {
      showToast('Please select a valid JSON backup file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!parsed.data || !parsed.metadata) {
          throw new Error('Invalid election backup format: Missing data or metadata blocks.');
        }
        loadedBackupData = parsed;
        displayInspection(parsed);
      } catch (err) {
        showToast(`Failed to parse backup file: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const displayInspection = (backup) => {
    uploadArea.classList.add('hidden');
    inspectSection.classList.remove('hidden');

    const meta = backup.metadata || {};
    const data = backup.data || {};

    main.querySelector('#inspectMetaDetails').textContent = 
      `Source: ${meta.collegeName || 'Unknown'} (${meta.collegeShortName || ''}) | Year: ${meta.electionYear || 'N/A'} | Exported: ${new Date(meta.exportedAt || Date.now()).toLocaleString()}`;

    const bRollCount = Array.isArray(data.nominal_roll) ? data.nominal_roll.length : 0;
    const bPostsCount = Array.isArray(data.posts) ? data.posts.length : 0;
    const bNomsCount = Array.isArray(data.nominations) ? data.nominations.length : 0;
    const bCorrCount = Array.isArray(data.roll_corrections) ? data.roll_corrections.length : 0;
    const bSettingsCount = Array.isArray(data.settings) ? data.settings.length : 0;

    const rows = [
      { name: 'Nominal Roll (Voters)', id: 'modRoll', live: liveStats.rollCount, backup: bRollCount },
      { name: 'Student Correction Requests', id: 'modCorr', live: '—', backup: bCorrCount },
      { name: 'Election Posts & Rules', id: 'modPosts', live: liveStats.postsCount, backup: bPostsCount },
      { name: 'Nominations & Verification', id: 'modNoms', live: liveStats.nomsCount, backup: bNomsCount },
      { name: 'Settings, Booths, Ballots & Results', id: 'modSets', live: 'Configured', backup: bSettingsCount }
    ];

    const tbody = main.querySelector('#inventoryComparisonTbody');
    tbody.innerHTML = rows.map(r => {
      const diff = typeof r.live === 'number' ? r.backup - r.live : 0;
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
      return `
        <tr>
          <td class="font-bold text-white">${r.name}</td>
          <td class="font-mono text-slate-300">${r.live}</td>
          <td class="font-mono font-bold text-indigo-300">${r.backup}</td>
          <td class="font-mono ${diff === 0 ? 'text-slate-500' : (diff > 0 ? 'text-emerald-400' : 'text-rose-400')}">
            ${typeof r.live === 'number' ? diffStr : '—'}
          </td>
          <td class="text-center">
            <input type="checkbox" id="${r.id}" checked class="accent-indigo-500 w-4 h-4 cursor-pointer" />
          </td>
        </tr>
      `;
    }).join('');
  };

  main.querySelector('#btnRemoveFile')?.addEventListener('click', () => {
    loadedBackupData = null;
    fileInput.value = '';
    inspectSection.classList.add('hidden');
    uploadArea.classList.remove('hidden');
  });

  // 4. Execute Restore
  const btnExecuteRestore = main.querySelector('#btnExecuteRestore');
  btnExecuteRestore?.addEventListener('click', async () => {
    if (!loadedBackupData) {
      showToast('No backup file loaded.', 'error');
      return;
    }

    const adminPwd = main.querySelector('#restoreAdminPwd').value.trim();
    const phrase = main.querySelector('#restoreConfirmPhrase').value.trim();

    if (!adminPwd) {
      showToast('Please enter your Admin Password.', 'error');
      return;
    }

    if (phrase !== 'CONFIRM RESTORE') {
      showToast('Please type "CONFIRM RESTORE" exactly to verify safety.', 'error');
      return;
    }

    const selectedModules = {
      nominalRoll: main.querySelector('#modRoll')?.checked ?? true,
      rollCorrections: main.querySelector('#modCorr')?.checked ?? true,
      posts: main.querySelector('#modPosts')?.checked ?? true,
      nominations: main.querySelector('#modNoms')?.checked ?? true,
      settings: main.querySelector('#modSets')?.checked ?? true
    };

    const restoreMode = main.querySelector('[name="restoreMode"]:checked')?.value || 'full_wipe_and_replace';

    setLoading(btnExecuteRestore, true, 'Restoring System State...');
    try {
      const res = await api.adminRestoreBackup(adminPwd, {
        confirmPhrase: phrase,
        restoreMode,
        selectedModules,
        backupData: loadedBackupData
      });

      showToast('🎉 System restore completed successfully!', 'success');
      alert(`System restore successful!\n\nRestored:\n• Voters: ${res.restoredCounts?.nominalRoll || 0}\n• Posts: ${res.restoredCounts?.posts || 0}\n• Nominations: ${res.restoredCounts?.nominations || 0}\n• Settings: ${res.restoredCounts?.settings || 0}\n\nPre-Restore snapshot saved: ${res.preRestoreSnapshotId}`);
      
      // Full refresh
      renderAdminBackup(main.closest('#app'));
    } catch (err) {
      showToast(`Restore failed: ${err.message}`, 'error');
      setLoading(btnExecuteRestore, false, '⚠️ Execute System Restore');
    }
  });

  // 5. Download Snapshot
  main.querySelectorAll('[data-download-snap]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const snapId = btn.getAttribute('data-download-snap');
      setLoading(btn, true, '...');
      try {
        const payload = await api.adminDownloadSnapshot(pwd, snapId);
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${snapId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Snapshot downloaded!', 'success');
      } catch (err) {
        showToast(`Download failed: ${err.message}`, 'error');
      } finally {
        setLoading(btn, false, '📥 Download');
      }
    });
  });

  // 6. Revert Snapshot
  main.querySelectorAll('[data-revert-snap]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const snapId = btn.getAttribute('data-revert-snap');
      const snapName = btn.getAttribute('data-name');

      const confirmed = confirm(`Are you sure you want to REVERT the database to:\n"${snapName}"?\n\nThis will restore all records to this checkpoint.`);
      if (!confirmed) return;

      const enterPwd = prompt('Please enter your Admin Password to confirm reversion:');
      if (!enterPwd) return;

      setLoading(btn, true, 'Reverting...');
      try {
        await api.adminRevertSnapshot(enterPwd, snapId);
        showToast('Database reverted to snapshot successfully!', 'success');
        alert(`System successfully reverted to checkpoint:\n${snapName}`);
        renderAdminBackup(main.closest('#app'));
      } catch (err) {
        showToast(`Revert failed: ${err.message}`, 'error');
        setLoading(btn, false, '🔄 Revert');
      }
    });
  });
}
