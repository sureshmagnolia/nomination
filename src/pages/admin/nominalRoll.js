/**
 * pages/admin/nominalRoll.js
 * Admin Nominal Roll management (CRUD + Finalize + Print with watermarks).
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading, compareSl, getProgWeight, getStudentDeptClassKey } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { openPrintRollModal } from '../../rollPrinter.js';

export async function renderAdminNominalRoll(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'nominal-roll', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominal roll...</p></div>
  `);

  const adminMain = container.querySelector('#adminMain');
  await reloadRollData(adminMain, pwd);
}

async function reloadRollData(main, pwd) {
  if (!main) return;
  main.innerHTML = `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominal roll...</p></div>
  `;

  try {
    const [nominalRoll, settings, corrections] = await Promise.all([
      api.getNominalRoll().catch(() => []),
      api.adminGetSettings(pwd),
      api.adminGetRollCorrections(pwd).catch(() => [])
    ]);
    renderNominalRollUI(main, pwd, nominalRoll, settings, corrections);
  } catch (e) {
    main.innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderNominalRollUI(main, pwd, nominalRoll, settings, corrections = []) {
  const isFinal = settings.nominalRollFinalized === 'true' || settings.isRollFinalized === 'true';
  const isDraft = !isFinal && settings.draftRollPublished === 'true';
  const isUnpublished = !isFinal && !isDraft;
  let students = [...nominalRoll];
  students.sort((a, b) => compareSl(a, b));
  let filterText = '';
  let selectedDept = '';
  let selectedClass = '';
  let showCorrections = false;
  let adminArrangeMode = 'dept-class'; // 'dept-class' | 'serial' | 'name'
  let currentPage = 1;
  const PAGE_SIZE = 50;
  let adminViewMode = 'cards'; // 'cards' (card type for phone & mobile ease) | 'table'

  const allDepts = [...new Set(nominalRoll.map(s => String(s['Dept'] || '').trim()).filter(d => d && d !== '-' && d !== '–'))].sort();

  const getAvailableClasses = (dept) => {
    return Array.from(new Set(
      students
        .filter(s => !dept || (s['Dept'] || '').trim().toLowerCase() === dept.toLowerCase())
        .map(s => getStudentDeptClassKey(s))
        .filter(Boolean)
    )).sort((a, b) => {
      const wA = getProgWeight(a);
      const wB = getProgWeight(b);
      if (wA !== wB) return wA - wB;
      return a.localeCompare(b);
    });
  };

  const allClasses = [...new Set(nominalRoll.map(s => getStudentDeptClassKey(s)).filter(Boolean))].sort((a, b) => {
    const wA = getProgWeight(a);
    const wB = getProgWeight(b);
    if (wA !== wB) return wA - wB;
    return a.localeCompare(b);
  });

  // ── Upload Panel (injected above the table) ───────────────────────────────
  const uploadPanelHtml = isFinal ? `
    <div id="uploadPanel" class="glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
      <div class="w-full flex items-center justify-between px-6 py-4 bg-white/5 opacity-80 cursor-not-allowed">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🔒</span>
          <div class="text-left">
            <div class="text-slate-300 font-bold text-sm flex items-center gap-2">
              Upload New Nominal Roll
              <span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] py-0.5 px-2">LOCKED</span>
            </div>
            <div class="text-slate-400 text-xs">Uploading or replacing the roll is disabled while Nominal Roll is finalized. Unfinalize first to upload new data.</div>
          </div>
        </div>
      </div>
    </div>
  ` : `
    <div id="uploadPanel" class="glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
      <button id="toggleUploadPanel" class="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors">
        <div class="flex items-center gap-3">
          <span class="text-2xl">📤</span>
          <div class="text-left">
            <div class="text-white font-bold text-sm">Upload New Nominal Roll</div>
            <div class="text-slate-400 text-xs">Replace entire roll from CSV — resets all nominations & results</div>
          </div>
        </div>
        <span id="uploadChevron" class="text-slate-400 text-lg transition-transform duration-200">▼</span>
      </button>

      <div id="uploadPanelBody" class="hidden border-t border-white/10">
        <div class="p-6 space-y-6">

          <!-- Step 1: Download Template -->
          <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
            <div>
              <div class="text-white font-bold text-sm mb-1">📥 Step 1 — Download the CSV Template</div>
              <div class="text-slate-400 text-xs">The template contains both Format 1 (Class) and Format 2 (Year/Stream) examples.<br><strong>CRITICAL:</strong> Keep ONLY the header row of the format you want to use. Delete ALL other sample rows and titles before saving.</div>
            </div>
            <button id="btnDownloadTemplate" class="btn btn-secondary shrink-0">
              <span id="templateBtnText">⬇️ Download Template</span>
            </button>
          </div>

          <!-- Step 2: Pick CSV File -->
          <div>
            <div class="text-white font-bold text-sm mb-3">📂 Step 2 — Select Your CSV File</div>
            <label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-indigo-400/50 hover:bg-indigo-500/5 transition-all group">
              <div class="text-center">
                <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">📁</div>
                <div class="text-slate-400 text-sm" id="filePickerLabel">Click to select a .csv file</div>
              </div>
              <input type="file" id="csvFileInput" accept=".csv" class="hidden">
            </label>
          </div>

          <!-- Preview (hidden until file selected) -->
          <div id="csvPreview" class="hidden space-y-4">
            <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm">
              <div class="text-emerald-300 font-bold mb-2">✅ File Parsed Successfully</div>
              <div id="csvSummary" class="text-slate-300 space-y-1 text-xs"></div>
            </div>

            <!-- Roll Update Notice -->
            <div class="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
              <div class="text-indigo-300 font-bold text-sm mb-2">🔄 Nominal Roll Update & Automatic Re-mapping</div>
              <ul class="text-indigo-200/90 text-xs space-y-1.5 list-disc list-inside">
                <li>The Nominal Roll student voter records will be <strong>replaced</strong> with the uploaded CSV data</li>
                <li><strong>Existing Nominations are SAFELY PRESERVED:</strong> All candidates, proposers, and seconders will be <strong>automatically re-mapped</strong> using their Admission Numbers!</li>
                <li>Serial numbers for candidates, proposers, and seconders will be recalculated based on the new roll</li>
                <li>Draft and finalized roll publication flags will be reset so you can review before publishing</li>
              </ul>
            </div>

            <!-- Confirmation -->
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Type <span class="text-indigo-400 font-mono">CONFIRM</span> to upload
                </label>
                <input type="text" id="confirmResetText" class="field font-mono tracking-widest uppercase" placeholder="CONFIRM" autocomplete="off">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Re-enter Admin Password</label>
                <input type="password" id="confirmPwd" class="field" placeholder="Admin password" autocomplete="current-password">
              </div>
              <button id="btnUploadRoll" class="btn w-full py-3 text-sm font-bold opacity-50 cursor-not-allowed" disabled
                style="background: linear-gradient(135deg, #4f46e5, #4338ca); color: white; border: none;">
                📤 Upload Roll & Auto-Remap Nominations
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;


  const refreshTable = () => {
    const availableClasses = getAvailableClasses(selectedDept);
    if (selectedClass && !availableClasses.includes(selectedClass) && !allClasses.includes(selectedClass)) {
      selectedClass = '';
    }

    const filtered = students.filter(s => {
      // Department filter
      if (selectedDept && String(s['Dept'] || '').trim().toLowerCase() !== selectedDept.toLowerCase()) {
        return false;
      }
      // Class filter
      if (selectedClass) {
        const studentClsKey = getStudentDeptClassKey(s).toLowerCase();
        const rawCls = String(s['CLASS'] || '').trim().toLowerCase();
        const targetCls = selectedClass.toLowerCase();
        if (studentClsKey !== targetCls && rawCls !== targetCls) {
          return false;
        }
      }
      // Search text filter
      if (filterText) {
        const q = filterText.toLowerCase();
        const match = [
          s['NAME'],
          s['CLASS'],
          getStudentDeptClassKey(s),
          s['ADMISION NO'] || s['ADMISSION NO'],
          s['Nominal Roll Serial Number'],
          s['Dept']
        ].some(v => String(v || '').toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    if (adminArrangeMode === 'dept-class') {
      filtered.sort((a, b) => {
        const dA = String(a['Dept'] || '').trim().toUpperCase();
        const dB = String(b['Dept'] || '').trim().toUpperCase();
        if (dA !== dB) return dA.localeCompare(dB);

        const cA = getStudentDeptClassKey(a).toUpperCase();
        const cB = getStudentDeptClassKey(b).toUpperCase();
        const wA = getProgWeight(cA);
        const wB = getProgWeight(cB);
        if (wA !== wB) return wA - wB;

        if (cA !== cB) return cA.localeCompare(cB);

        // Sort names in each class alphabetically based on their name
        const nA = String(a['NAME'] || '').trim().toUpperCase();
        const nB = String(b['NAME'] || '').trim().toUpperCase();
        if (nA !== nB) return nA.localeCompare(nB);

        return compareSl(a, b);
      });
    } else if (adminArrangeMode === 'name') {
      filtered.sort((a, b) => {
        const nA = String(a['NAME'] || '').trim().toUpperCase();
        const nB = String(b['NAME'] || '').trim().toUpperCase();
        if (nA !== nB) return nA.localeCompare(nB);
        return compareSl(a, b);
      });
    } else {
      filtered.sort((a, b) => compareSl(a, b));
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, filtered.length);
    const pageStudents = filtered.slice(startIndex, endIndex);

    let buttonsHTML = '';
    if (totalPages > 1) {
      buttonsHTML = `
        <button class="btn btn-sm btn-secondary px-2.5 py-1 text-xs pg-btn" data-page="1" ${currentPage === 1 ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''} title="First Page">« First</button>
        <button class="btn btn-sm btn-secondary px-2.5 py-1 text-xs pg-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''} title="Previous Page">‹ Prev</button>
      `;

      const windowSize = 2;
      let pagesToShow = [];
      for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || (p >= currentPage - windowSize && p <= currentPage + windowSize)) {
          pagesToShow.push(p);
        }
      }

      let lastP = 0;
      pagesToShow.forEach(p => {
        if (lastP && p - lastP > 1) {
          buttonsHTML += `<span class="px-1 text-slate-500 font-bold">…</span>`;
        }
        const isActive = p === currentPage;
        buttonsHTML += `
          <button class="btn btn-sm px-3 py-1 text-xs font-mono rounded-lg pg-btn transition-colors ${isActive ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40' : 'btn-secondary text-slate-300 hover:text-white'}" data-page="${p}">
            ${p}
          </button>
        `;
        lastP = p;
      });

      buttonsHTML += `
        <button class="btn btn-sm btn-secondary px-2.5 py-1 text-xs pg-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''} title="Next Page">Next ›</button>
        <button class="btn btn-sm btn-secondary px-2.5 py-1 text-xs pg-btn" data-page="${totalPages}" ${currentPage === totalPages ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''} title="Last Page">Last »</button>
      `;
    }

    main.innerHTML = `
      <div class="page-enter space-y-6">
        ${uploadPanelHtml}

        <!-- Publication Stage Status Banner -->
        <div class="glass rounded-xl p-4 border ${isFinal ? 'border-emerald-500/30 bg-emerald-500/10' : (isDraft ? 'border-amber-500/30 bg-amber-500/10' : 'border-slate-700 bg-slate-800/40')} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${isFinal ? '🔒' : (isDraft ? '📋' : '⏳')}</span>
            <div>
              <div class="font-bold text-sm flex items-center gap-2 ${isFinal ? 'text-emerald-300' : (isDraft ? 'text-amber-300' : 'text-slate-300')}">
                ${isFinal ? 'Nominal Roll Finalized & Locked' : (isDraft ? 'Draft Nominal Roll Published' : 'Nominal Roll Unpublished')}
                <span class="badge ${isFinal ? 'badge-valid' : (isDraft ? 'badge-pending' : 'bg-slate-700 text-slate-300')} text-[10px] py-0.5 px-2">
                  ${isFinal ? 'PUBLIC (1, 2, 3...)' : (isDraft ? 'PUBLIC (D1, D2, D3...)' : 'HIDDEN FROM PUBLIC')}
                </span>
              </div>
              <div class="text-slate-400 text-xs mt-0.5">
                ${isFinal ? 'Voter list is locked and read-only. Standard 1, 2, 3... serial numbers are active.' : (isDraft ? 'Draft list is live to students with provisional D1, D2... Sl. numbers. Editing is enabled and student correction requests can be submitted.' : 'The voter list is currently not published to the public. Publish draft when ready for student review.')}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            ${isUnpublished ? `
              <button id="btnPublishDraft" class="btn btn-sm btn-primary bg-amber-600 hover:bg-amber-500 text-white font-medium">📢 Publish Draft Roll</button>
            ` : ''}
            ${isDraft ? `
              <button id="btnUnpublishDraft" class="btn btn-sm btn-secondary border-rose-500/30 text-rose-300 hover:bg-rose-500/20">🚫 Unpublish Draft</button>
            ` : ''}
            ${isFinal ? `
              <button id="btnUnfinalizeBanner" class="btn bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30 text-xs py-2 px-3">🔓 Unfinalize Roll</button>
            ` : ''}
          </div>
        </div>

        <!-- Student Correction Requests (if any exist) -->
        ${corrections && corrections.length > 0 ? `
          <div class="glass rounded-xl border border-amber-500/30 overflow-hidden shadow-lg">
            <div class="flex items-center justify-between p-4 bg-amber-500/10 cursor-pointer select-none" id="toggleCorrectionsPanel">
              <div class="flex items-center gap-2.5">
                <span class="text-xl">📝</span>
                <div>
                  <strong class="text-white text-sm">Student Correction Requests</strong>
                  <span class="text-xs text-amber-300 ml-2">(${corrections.filter(c => c.status === 'Pending').length} Pending / ${corrections.length} Total)</span>
                </div>
              </div>
              <span id="corrChevron" class="text-slate-400 text-sm">▼ View Requests</span>
            </div>
            <div id="correctionsPanelBody" class="p-4 space-y-3 bg-black/20 border-t border-amber-500/20 hidden">
              <!-- Mobile Card View for Corrections -->
              <div class="md:hidden space-y-3">
                ${corrections.map(c => `
                  <div class="glass p-3.5 rounded-xl border border-amber-500/30 space-y-2 bg-slate-900/80">
                    <div class="flex items-center justify-between gap-2">
                      <span class="badge ${c.status === 'Resolved' ? 'badge-valid' : (c.status === 'Dismissed' ? 'bg-slate-700 text-slate-400' : 'badge-pending')} text-[10px]">
                        ${esc(c.status)}
                      </span>
                      <span class="text-slate-400 font-mono text-[10px]">${c.timestamp ? new Date(c.timestamp).toLocaleDateString() : '–'}</span>
                    </div>
                    <div>
                      <div class="font-bold text-white text-sm">${esc(c.student_name)}</div>
                      <div class="text-xs text-indigo-300 font-mono mt-0.5">Adm: <strong>${esc(c.admission_no)}</strong> • ${esc(c.class_name || '–')} (${esc(c.department || '–')})</div>
                    </div>
                    <div class="text-xs bg-black/40 p-2.5 rounded-lg border border-white/10 space-y-1">
                      <div class="text-amber-300 font-semibold text-[11px]">📝 ${esc(c.correction_type)}</div>
                      <div class="text-slate-300 leading-relaxed">${esc(c.details)}</div>
                    </div>
                    ${c.contact_info ? `<div class="text-[11px] text-slate-400">📞 Contact: ${esc(c.contact_info)}</div>` : ''}
                    <div class="flex gap-2 pt-1.5 border-t border-white/10">
                      ${c.status !== 'Resolved' ? `<button class="btn btn-xs btn-success flex-1 resolve-corr py-1.5 font-medium" data-id="${esc(c.id)}">✅ Resolve</button>` : ''}
                      ${c.status !== 'Dismissed' ? `<button class="btn btn-xs btn-secondary flex-1 dismiss-corr py-1.5 font-medium" data-id="${esc(c.id)}">✕ Dismiss</button>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- Desktop Table View for Corrections -->
              <div class="hidden md:block overflow-x-auto">
                <table class="data-table text-xs">
                  <thead><tr>
                    <th>Date</th>
                    <th>Adm. No</th>
                    <th>Student Name</th>
                    <th>Class / Dept</th>
                    <th>Issue Type</th>
                    <th>Details</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr></thead>
                  <tbody>
                    ${corrections.map(c => `
                      <tr>
                        <td class="whitespace-nowrap text-slate-400 font-mono text-[10px]">${c.timestamp ? new Date(c.timestamp).toLocaleDateString() : '–'}</td>
                        <td class="font-mono text-indigo-300 font-bold">${esc(c.admission_no)}</td>
                        <td class="font-bold text-white">${esc(c.student_name)}</td>
                        <td class="text-slate-300">${esc(c.class_name || '–')} / ${esc(c.department || '–')}</td>
                        <td><span class="badge badge-pending text-[10px]">${esc(c.correction_type)}</span></td>
                        <td class="max-w-xs text-slate-300">${esc(c.details)}</td>
                        <td class="text-slate-400 text-[10px]">${esc(c.contact_info || '–')}</td>
                        <td><span class="badge ${c.status === 'Resolved' ? 'badge-valid' : (c.status === 'Dismissed' ? 'bg-slate-700 text-slate-400' : 'badge-pending')} text-[10px]">${esc(c.status)}</span></td>
                        <td>
                          <div class="flex gap-1.5">
                            ${c.status !== 'Resolved' ? `<button class="btn btn-xs btn-success resolve-corr" data-id="${esc(c.id)}">Resolve</button>` : ''}
                            ${c.status !== 'Dismissed' ? `<button class="btn btn-xs btn-secondary dismiss-corr" data-id="${esc(c.id)}">Dismiss</button>` : ''}
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ` : ''}

        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-bold text-white">Nominal Roll Management</h3>
            <p class="text-slate-400 text-sm">Manage student data, review draft edits, and finalize the official voter list.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            ${isUnpublished ? `<button id="btnPublishDraftTop" class="btn btn-warning bg-amber-600 hover:bg-amber-500 text-white">📢 Publish Draft Roll</button>` : ''}
            ${isDraft ? `<button id="btnUnpublishDraftTop" class="btn btn-secondary border-rose-500/30 text-rose-300 hover:bg-rose-500/20">🚫 Unpublish Draft</button>` : ''}
            ${!isFinal ? `
              <button id="btnAddNew" class="btn btn-success">➕ Add Student</button>
            ` : `
              <button id="btnAddNew" class="btn btn-success bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/30" title="Add a student to the Final Nominal Roll. A suffixed serial number (e.g. 124a) will be inserted alphabetically after the preceding voter without altering any other voter's serial number.">➕ Add Voter (Final Roll)</button>
            `}
            <button id="btnPrintRoll" class="btn btn-secondary">🖨️ Print Roll</button>
            ${!isFinal && students.length > 0 ? `<button id="btnFixSerialsDept" class="btn bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs py-2 px-3 flex items-center gap-1.5 font-semibold" title="Re-serialise Draft Electoral Roll contiguous 1..N based on Department, Class (RS at end), and Student Name A-Z">🔢 Re-serialise Draft Roll</button>` : ''}
            ${!isFinal ? `<button id="btnRemapNoms" class="btn bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 text-xs py-2 px-3">🔄 Re-map Nominations</button>` : ''}
            ${!isFinal && students.length > 0 ? `<button id="btnClearRoll" class="btn bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs py-2 px-3">🗑️ Clear Roll Data</button>` : ''}
            ${!isFinal ? `<button id="btnFinalize" class="btn btn-primary">🔒 Finalize & Lock Roll</button>` : ''}
            ${isFinal ? `<span class="badge badge-valid py-2 px-4 flex items-center gap-2">✅ ROLL FINALIZED</span>` : ''}
            ${isFinal ? `<button id="btnUnfinalize" class="btn bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30">🔓 Unfinalize</button>` : ''}
          </div>
        </div>

        <div class="glass rounded-xl p-4 space-y-3 shadow-lg mb-2">
          <!-- Top Row: Search input + View Mode toggles + Count -->
          <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div class="relative flex-1 w-full">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
              <input type="text" id="searchInput" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors text-sm" placeholder="Search by student name, admission no, or serial..." value="${esc(filterText)}">
            </div>
            <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <div class="flex items-center rounded-lg bg-black/40 p-1 border border-white/10 shrink-0">
                <button type="button" id="btnModeCards" class="btn btn-xs py-1.5 px-3 rounded text-xs flex items-center gap-1.5 transition-all ${adminViewMode === 'cards' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white'}" title="Card View (Optimized for Mobile/Phone)">
                  <span>📇</span> <span>Cards</span>
                </button>
                <button type="button" id="btnModeTable" class="btn btn-xs py-1.5 px-3 rounded text-xs flex items-center gap-1.5 transition-all ${adminViewMode === 'table' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white'}" title="Table View">
                  <span>📑</span> <span>Table</span>
                </button>
              </div>
              <div class="text-slate-400 text-xs text-right whitespace-nowrap">
                Showing <strong class="text-white">${filtered.length ? startIndex + 1 : 0}</strong>–<strong class="text-white">${endIndex}</strong> of <strong class="text-white">${filtered.length}</strong>
              </div>
            </div>
          </div>

          <!-- Bottom Row: Department Filter + Class Filter + Arrange Order + Reset -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-center pt-1 border-t border-white/5">
            <!-- Department Filter -->
            <div class="md:col-span-3">
              <select id="adminDeptFilter" class="field text-xs bg-slate-900 border-white/10 text-white w-full py-2" title="Filter by Department">
                <option value="">🏢 All Depts (${allDepts.length})</option>
                ${allDepts.map(d => `<option value="${esc(d)}" ${selectedDept.toLowerCase() === d.toLowerCase() ? 'selected' : ''}>${esc(d)}</option>`).join('')}
              </select>
            </div>

            <!-- Class Filter -->
            <div class="md:col-span-4">
              <select id="adminClassFilter" class="field text-xs bg-slate-900 border-white/10 text-white w-full py-2 font-medium" title="Filter by Class">
                <option value="">🎓 All Classes (${availableClasses.length})</option>
                ${availableClasses.map(c => `<option value="${esc(c)}" ${selectedClass.toLowerCase() === c.toLowerCase() ? 'selected' : ''}>${esc(c)}</option>`).join('')}
              </select>
            </div>

            <!-- Arrangement Select -->
            <div class="md:col-span-4">
              <select id="adminArrangeSelect" class="field text-xs bg-slate-900 border-white/10 text-white w-full py-2">
                <option value="dept-class" ${adminArrangeMode === 'dept-class' ? 'selected' : ''}>🏢 Sort: Dept ➔ Class ➔ Name (A-Z)</option>
                <option value="serial" ${adminArrangeMode === 'serial' ? 'selected' : ''}>🔢 Sort: Serial Number</option>
                <option value="name" ${adminArrangeMode === 'name' ? 'selected' : ''}>🔤 Sort: Student Name (A–Z)</option>
              </select>
            </div>

            <!-- Reset Filters Button -->
            <div class="md:col-span-1 flex justify-end">
              <button type="button" id="btnAdminClearFilters" class="btn btn-secondary text-xs px-2.5 py-2 w-full text-slate-400 hover:text-white flex items-center justify-center gap-1 ${filterText || selectedDept || selectedClass ? 'text-amber-300 border-amber-500/30' : ''}" title="Reset search and filters">
                ✕ Reset
              </button>
            </div>
          </div>
        </div>

        <div class="glass rounded-xl overflow-hidden shadow-2xl" id="adminRollListView">
          ${adminViewMode === 'cards' ? `
            <!-- Card View (Mobile-First Responsive Grid) -->
            <div class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" id="adminRollCards">
              ${pageStudents.length ? pageStudents.map(s => `
                <div class="bg-slate-900/70 backdrop-blur-md p-4 rounded-xl border border-white/10 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3 shadow-lg">
                  <div class="space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                      <span class="badge ${isDraft ? 'badge-pending text-amber-300 border border-amber-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'} font-mono font-bold text-xs py-1 px-2.5">
                        ${isDraft ? 'Draft Sl. D' : 'Sl. #'}${esc(s['Nominal Roll Serial Number'])}
                      </span>
                      <span class="font-mono text-xs text-slate-300 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                        Adm: <strong class="text-indigo-300">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</strong>
                      </span>
                    </div>
                    
                    <div>
                      <h4 class="text-white font-bold text-base leading-snug break-words">${esc(s['NAME'])}</h4>
                      <div class="text-slate-300 text-xs mt-2 space-y-1">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="text-slate-400 font-medium">🎓 Class:</span>
                          <span class="text-slate-200 font-medium">${esc(s['CLASS'])}</span>
                        </div>
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="text-slate-400 font-medium">🏢 Dept:</span>
                          <span class="text-slate-300">${esc(s['Dept'] || '–')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                    <div class="flex items-center gap-2 pt-2.5 border-t border-white/10">
                      <button type="button" class="btn btn-sm btn-secondary text-indigo-300 hover:text-white edit-student flex-1 py-1.5 text-xs flex items-center justify-center gap-1.5 font-medium border-indigo-500/30 hover:border-indigo-400"
                        data-serial="${esc(s['Nominal Roll Serial Number'])}"
                        data-name="${esc(s['NAME'])}"
                        data-class="${esc(s['CLASS'])}"
                        data-adm="${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '')}"
                        data-dept="${esc(s['Dept'] || '')}">
                        ✏️ Edit
                      </button>
                      <button type="button" class="btn btn-sm bg-rose-500/15 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30 delete-student flex-1 py-1.5 text-xs flex items-center justify-center gap-1.5 font-medium"
                        data-serial="${s['Nominal Roll Serial Number']}"
                        data-name="${esc(s['NAME'])}">
                        🗑️ Delete
                      </button>
                    </div>
                </div>
              `).join('') : `
                <div class="col-span-full text-center py-12 text-slate-500">
                  <div class="text-3xl mb-2">🔍</div>
                  <p class="text-slate-300 font-medium text-sm">No students found</p>
                  <p class="text-xs text-slate-500 mt-1">Try broadening your search term.</p>
                </div>
              `}
            </div>
          ` : `
            <!-- Table View (Desktop Table) -->
            <div class="overflow-x-auto">
              <table class="data-table">
                <thead><tr>
                  <th class="w-24 text-center">${isDraft ? 'Draft Sl. No' : 'Sl. No'}</th>
                  <th>Admission No</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr></thead>
                <tbody id="adminRollTableBody">
                  ${pageStudents.length ? pageStudents.map(s => `
                    <tr>
                      <td class="text-center font-bold font-mono ${isDraft ? 'text-amber-400' : 'text-indigo-400'}">${isDraft ? 'D' : ''}${esc(s['Nominal Roll Serial Number'])}</td>
                      <td class="font-mono text-xs">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                      <td class="text-white font-medium">${esc(s['NAME'])}</td>
                      <td class="text-slate-300 text-sm">${esc(s['CLASS'])}</td>
                      <td class="text-slate-400 text-xs">${esc(s['Dept'] || '–')}</td>
                      <td>
                        <button class="text-indigo-400 hover:text-indigo-300 edit-student mr-3" data-serial="${esc(s['Nominal Roll Serial Number'])}" data-name="${esc(s['NAME'])}" data-class="${esc(s['CLASS'])}" data-adm="${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '')}" data-dept="${esc(s['Dept'] || '')}">Edit</button>
                        <button class="text-rose-400 hover:text-rose-300 delete-student" data-serial="${s['Nominal Roll Serial Number']}" data-name="${esc(s['NAME'])}">Delete</button>
                      </td>
                    </tr>
                  `).join('') : `<tr><td colspan="6" class="text-center py-10 text-slate-500">No students found matching your search.</td></tr>`}
                </tbody>
              </table>
            </div>
          `}

          <!-- Pagination Controls Footer -->
          <div id="adminPaginationBar" class="p-4 border-t border-white/10 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div id="adminPaginationInfo">Page <strong class="text-white">${currentPage}</strong> of <strong class="text-white">${totalPages}</strong> (${filtered.length} total students)</div>
            <div id="adminPaginationControls" class="flex items-center gap-1 flex-wrap justify-center">
              ${totalPages > 1 ? buttonsHTML : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Add / Edit Student Modal -->
      <div id="addModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10">
          <h4 id="modalTitle" class="text-xl font-bold text-white mb-2">Add New Student</h4>
          ${isFinal ? `
            <div class="bg-indigo-500/15 border border-indigo-500/30 rounded-xl p-3 mb-4 text-xs text-indigo-200 leading-relaxed">
              ℹ️ <strong>Final Roll Addition:</strong> Existing voters will keep their exact serial numbers. This new voter will be inserted alphabetically into their class with a suffixed serial number (e.g., <strong>124a</strong>) based on the preceding voter.
            </div>
          ` : ''}
          <div class="space-y-4">
            <input type="hidden" id="editOldSerial" value="">
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
              <input type="text" id="addName" class="field" placeholder="Student Name">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Class Name</label>
              <select id="addClass" class="field">
                <option value="">-- Select Class --</option>
                ${allClasses.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Admission No</label>
              <input type="text" id="addAdm" class="field" placeholder="Adm No">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Department</label>
              <select id="addDept" class="field">
                <option value="">-- Select Department --</option>
                ${allDepts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="flex gap-2 mt-8">
            <button id="btnCancelAdd" class="btn btn-secondary flex-1">Cancel</button>
            <button id="btnConfirmAdd" class="btn btn-primary flex-1">Save Student</button>
          </div>
        </div>
      </div>

      <!-- Unfinalize Modal -->
      <div id="unfinalizeModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl font-bold border border-rose-500/30">🔓</div>
            <div>
              <h4 class="text-xl font-bold text-white">Unfinalize Nominal Roll</h4>
              <p class="text-slate-400 text-xs">Unlock roll for editing, adding, or deleting</p>
            </div>
          </div>
          <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 my-4 text-xs text-amber-200 leading-relaxed">
            ⚠️ <strong>Admin Verification:</strong> Enter your Admin Password below to unlock the Nominal Roll. (No OTP required).
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Admin Password</label>
              <input type="password" id="unfinalizePwdInput" class="field w-full" placeholder="Enter Admin Password" autocomplete="current-password">
            </div>
            <div id="unfinalizeError" class="text-rose-400 text-xs font-medium hidden"></div>
          </div>
          <div class="flex gap-2 mt-6">
            <button type="button" id="btnCancelUnfinalize" class="btn btn-secondary flex-1">Cancel</button>
            <button type="button" id="btnConfirmUnfinalize" class="btn bg-rose-600 hover:bg-rose-500 text-white flex-1 font-bold">Confirm & Unlock</button>
          </div>
        </div>
      </div>

      <!-- Clear Nominal Roll Modal -->
      <div id="clearRollModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-2xl p-6 shadow-2xl border border-rose-500/30">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl font-bold border border-rose-500/30">🗑️</div>
            <div>
              <h4 class="text-xl font-bold text-white">Clear Nominal Roll Alone</h4>
              <p class="text-slate-400 text-xs">Delete student records without deleting nominations</p>
            </div>
          </div>
          
          <div class="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 my-3 text-xs text-indigo-200 leading-relaxed space-y-1.5">
            <div class="font-bold text-indigo-300 flex items-center gap-1.5">
              <span>🛡️</span> Nominations Safety Guarantee
            </div>
            <div>This will clear all <strong>${students.length}</strong> student records from the Nominal Roll <strong>alone</strong>.</div>
            <div class="text-indigo-200/80">Existing nominations will <strong>NOT</strong> be deleted. When you upload a new nominal roll or add students, the system will <strong>automatically re-map</strong> candidate, proposer, and seconder serial numbers using their Admission Numbers.</div>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Type <span class="text-rose-400 font-mono">CLEAR</span> to confirm
              </label>
              <input type="text" id="clearRollConfirmText" class="field w-full font-mono uppercase" placeholder="CLEAR" autocomplete="off">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Admin Password</label>
              <input type="password" id="clearRollPwdInput" class="field w-full" placeholder="Enter Admin Password" autocomplete="current-password">
            </div>
            <div id="clearRollError" class="text-rose-400 text-xs font-medium hidden"></div>
          </div>

          <div class="flex gap-2 mt-6">
            <button type="button" id="btnCancelClearRoll" class="btn btn-secondary flex-1">Cancel</button>
            <button type="button" id="btnConfirmClearRoll" class="btn bg-rose-600 hover:bg-rose-500 text-white flex-1 font-bold">🗑️ Clear Roll Data</button>
          </div>
        </div>
      </div>
    `;

    // Search
    const searchInp = main.querySelector('#searchInput');
    if (searchInp) {
      searchInp.oninput = (e) => {
        filterText = e.target.value;
        currentPage = 1;
        refreshTable();
        const freshInput = main.querySelector('#searchInput');
        if (freshInput) {
          freshInput.focus();
          const val = freshInput.value;
          freshInput.value = '';
          freshInput.value = val;
        }
      };
    }

    // Department Filter
    const adminDeptSel = main.querySelector('#adminDeptFilter');
    if (adminDeptSel) {
      adminDeptSel.onchange = (e) => {
        selectedDept = e.target.value;
        selectedClass = '';
        currentPage = 1;
        refreshTable();
      };
    }

    // Class Filter
    const adminClassSel = main.querySelector('#adminClassFilter');
    if (adminClassSel) {
      adminClassSel.onchange = (e) => {
        selectedClass = e.target.value;
        currentPage = 1;
        refreshTable();
      };
    }

    // Arrange Select
    const adminArrangeSel = main.querySelector('#adminArrangeSelect');
    if (adminArrangeSel) {
      adminArrangeSel.onchange = (e) => {
        adminArrangeMode = e.target.value;
        currentPage = 1;
        refreshTable();
      };
    }

    // Clear Filters
    const btnClearFilters = main.querySelector('#btnAdminClearFilters');
    if (btnClearFilters) {
      btnClearFilters.onclick = () => {
        filterText = '';
        selectedDept = '';
        selectedClass = '';
        currentPage = 1;
        refreshTable();
      };
    }

    // View Mode Toggles
    const btnCards = main.querySelector('#btnModeCards');
    if (btnCards) {
      btnCards.onclick = () => {
        if (adminViewMode !== 'cards') {
          adminViewMode = 'cards';
          refreshTable();
        }
      };
    }
    const btnTable = main.querySelector('#btnModeTable');
    if (btnTable) {
      btnTable.onclick = () => {
        if (adminViewMode !== 'table') {
          adminViewMode = 'table';
          refreshTable();
        }
      };
    }

    // Pagination button clicks
    const pgControls = main.querySelector('#adminPaginationControls');
    if (pgControls) {
      pgControls.onclick = (e) => {
        const btn = e.target.closest('.pg-btn');
        if (!btn || btn.disabled) return;
        const targetPage = Number(btn.dataset.page);
        if (targetPage && targetPage !== currentPage) {
          currentPage = targetPage;
          refreshTable();
          main.querySelector('#adminRollListView')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      };
    }

    // Student Add/Edit/Delete Handlers (active on both Draft and Final Roll)
    const openModal = (isEdit, data = {}) => {
      main.querySelector('#modalTitle').textContent = isEdit ? 'Edit Student' : (isFinal ? 'Add Voter (Final Roll)' : 'Add New Student');
      main.querySelector('#editOldSerial').value = isEdit ? data.serial : '';
      main.querySelector('#addName').value = data.name || '';
      main.querySelector('#addClass').value = data.class || '';
      main.querySelector('#addAdm').value = data.adm || '';
      main.querySelector('#addDept').value = data.dept || '';
      main.querySelector('#addModal').classList.remove('hidden');
    };

    if (main.querySelector('#btnAddNew')) main.querySelector('#btnAddNew').onclick = () => openModal(false);
    if (main.querySelector('#btnCancelAdd')) main.querySelector('#btnCancelAdd').onclick = () => main.querySelector('#addModal').classList.add('hidden');
    if (main.querySelector('#btnConfirmAdd')) {
      main.querySelector('#btnConfirmAdd').onclick = async (e) => {
        const payload = {
          old_serial: main.querySelector('#editOldSerial').value,
          name: main.querySelector('#addName').value,
          class: main.querySelector('#addClass').value,
          admission_no: main.querySelector('#addAdm').value,
          dept: main.querySelector('#addDept').value
        };
        if (!payload.name || !payload.class) return showToast('Please fill required fields.', 'warning');
        
        setLoading(e.target, true, 'Save Student');
        try {
          if (payload.old_serial) {
            await api.adminUpdateStudent(pwd, payload);
            showToast('Student updated successfully.', 'success');
          } else {
            const res = await api.adminAddStudent(pwd, payload);
            if (res && res.serial) {
              showToast(`Student added with Serial #${res.serial}${res.isFinalAddition ? ' (Suffix Addition on Final Roll)' : ''}.`, 'success');
            } else {
              showToast('Student added successfully.', 'success');
            }
          }
          main.querySelector('#addModal').classList.add('hidden');
          await reloadRollData(main, pwd);
        } catch (err) {
          showToast(err.message, 'error');
          setLoading(e.target, false, 'Save Student');
        }
      };
    }

    main.querySelectorAll('.edit-student').forEach(btn => {
      btn.onclick = () => {
        openModal(true, {
          serial: btn.dataset.serial,
          name: btn.dataset.name,
          class: btn.dataset.class,
          adm: btn.dataset.adm,
          dept: btn.dataset.dept
        });
      };
    });

    main.querySelectorAll('.delete-student').forEach(btn => {
      btn.onclick = async () => {
        const sNum = btn.dataset.serial;
        const sName = btn.dataset.name || '';
        const confirmMsg = isFinal 
          ? `⚠️ Delete student #${sNum} (${sName}) from the FINAL Electoral Roll?\n\nThe student will be removed. All other students' serial numbers will remain strictly UNCHANGED.`
          : `Delete student #${sNum} (${sName}) from the Draft Roll?`;
        if (!confirm(confirmMsg)) return;
        try {
          await api.adminDeleteStudent(pwd, sNum);
          showToast(`Student #${sNum} removed successfully.`, 'success');
          await reloadRollData(main, pwd);
        } catch (err) { showToast(err.message, 'error'); }
      };
    });

    // Actions when NOT finalized (CSV upload, bulk renumber, clear, finalize)
    if (!isFinal) {

      // ── Upload Panel Handlers (only active when not finalized) ────────────
      if (main.querySelector('#toggleUploadPanel')) {
        main.querySelector('#toggleUploadPanel').onclick = () => {
          const body = main.querySelector('#uploadPanelBody');
          const chevron = main.querySelector('#uploadChevron');
          if (body) body.classList.toggle('hidden');
          if (chevron) chevron.style.transform = body && body.classList.contains('hidden') ? '' : 'rotate(180deg)';
        };
      }

      if (main.querySelector('#btnDownloadTemplate')) {
        main.querySelector('#btnDownloadTemplate').onclick = async (e) => {
          const btn = e.currentTarget;
          setLoading(btn, true, 'Downloading...');
          try {
            const data = await api.adminGetNominalRollTemplate(pwd);
            const csvRows = [data.headers.join(',')];
            data.rows.forEach(row => {
              csvRows.push(row.map(cell => {
                const s = String(cell ?? '');
                return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
              }).join(','));
            });
            const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'NominalRoll_Template.csv'; a.click();
            URL.revokeObjectURL(url);
            showToast('Template downloaded!', 'success');
          } catch (err) {
            showToast(err.message, 'error');
          } finally {
            setLoading(btn, false, '⬇️ Download Template');
          }
        };
      }

      // CSV File Parsing
      let parsedRows = null;
      let usedHeaders = [];
      const legacyHeaders = ['Nominal Roll Serial Number', 'NAME', 'CLASS', 'ADMISION NO', 'Dept'];
      const explicitHeaders = ['Nominal Roll Serial Number', 'NAME', 'YEAR', 'STREAM', 'ADMISION NO', 'Dept'];

      if (main.querySelector('#csvFileInput')) {
        main.querySelector('#csvFileInput').onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          main.querySelector('#filePickerLabel').textContent = `📄 ${file.name}`;

          const reader = new FileReader();
          reader.onload = (ev) => {
            const text = ev.target.result;
            const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
            if (lines.length < 2) {
              showToast('CSV file appears empty.', 'error'); return;
            }

            let headerRowIndex = -1;
            let detectedDelimiter = ',';
            const normCol = c => String(c || '').trim().replace(/^"|"$/g, '').toUpperCase().replace(/\s+/g, ' ');
            const isAdmCol = c => {
              const u = normCol(c);
              return u === 'ADMISION NO' || u === 'ADMISSION NO' || u === 'ADMISION NUMBER' || u === 'ADMISSION NUMBER' || u === 'ADM NO';
            };

            for (let i = 0; i < Math.min(lines.length, 20); i++) {
              const delim = lines[i].includes('\t') && !lines[i].includes(',') ? '\t' : ',';
              const cols = lines[i].split(delim).map(normCol);

              const hasSerial = cols.some(c => c === 'NOMINAL ROLL SERIAL NUMBER' || c === 'SERIAL NUMBER' || c === 'SL. NO' || c === 'SL NO');
              const hasName = cols.includes('NAME');
              const hasDept = cols.includes('DEPT') || cols.includes('DEPARTMENT');
              const hasAdm = cols.some(isAdmCol);
              const hasClass = cols.includes('CLASS');
              const hasYear = cols.includes('YEAR');
              const hasStream = cols.includes('STREAM');

              if (hasSerial && hasName && hasDept && hasAdm) {
                headerRowIndex = i;
                detectedDelimiter = delim;
                usedHeaders = (hasYear && hasStream) ? explicitHeaders : legacyHeaders;
                break;
              }
            }

            if (headerRowIndex === -1) {
              showToast('Missing required columns. Please use one of the standard templates.', 'error');
              main.querySelector('#csvPreview')?.classList.add('hidden');
              return;
            }

            const rawHeaders = lines[headerRowIndex].split(detectedDelimiter).map(h => h.trim().replace(/^"|"$/g, ''));
            const normHeaders = rawHeaders.map(normCol);
            
            let idxMap;
            if (usedHeaders === explicitHeaders) {
              const sIdx = normHeaders.findIndex(c => c === 'NOMINAL ROLL SERIAL NUMBER' || c === 'SERIAL NUMBER' || c === 'SL. NO' || c === 'SL NO');
              const nIdx = normHeaders.indexOf('NAME');
              const yIdx = normHeaders.indexOf('YEAR');
              const stIdx = normHeaders.indexOf('STREAM');
              const aIdx = normHeaders.findIndex(isAdmCol);
              const dIdx = normHeaders.findIndex(c => c === 'DEPT' || c === 'DEPARTMENT');
              idxMap = [sIdx, nIdx, yIdx, stIdx, aIdx, dIdx];
            } else {
              const sIdx = normHeaders.findIndex(c => c === 'NOMINAL ROLL SERIAL NUMBER' || c === 'SERIAL NUMBER' || c === 'SL. NO' || c === 'SL NO');
              const nIdx = normHeaders.indexOf('NAME');
              const cIdx = normHeaders.indexOf('CLASS');
              const aIdx = normHeaders.findIndex(isAdmCol);
              const dIdx = normHeaders.findIndex(c => c === 'DEPT' || c === 'DEPARTMENT');
              idxMap = [sIdx, nIdx, cIdx, aIdx, dIdx];
            }
            
            parsedRows = lines.slice(headerRowIndex + 1).map(line => {
              const cells = [];
              let cur = '', inQ = false;
              for (const ch of line + detectedDelimiter) {
                if (ch === '"') { inQ = !inQ; }
                else if (ch === detectedDelimiter && !inQ) { cells.push(cur.trim()); cur = ''; }
                else cur += ch;
              }
              return idxMap.map(i => (i >= 0 ? cells[i] ?? '' : ''));
            }).filter(r => r[1] && r[1].trim() !== '' && r[1].toUpperCase() !== 'NAME');

            const deptIdx = usedHeaders.indexOf('Dept');
            
            let classes = [];
            if (usedHeaders === legacyHeaders) {
              classes = [...new Set(parsedRows.map(r => r[usedHeaders.indexOf('CLASS')]))].sort();
            } else {
              const formatYearPrefix = (y) => {
                const u = String(y || '').trim().toUpperCase();
                if (u === '1' || u === '1ST' || u === 'I') return '1ST YEAR';
                if (u === '2' || u === '2ND' || u === 'II') return '2ND YEAR';
                if (u === '3' || u === '3RD' || u === 'III') return '3RD YEAR';
                if (u && !u.includes('YEAR')) return `${u} YEAR`;
                return u;
              };
              classes = [...new Set(parsedRows.map(r => `${formatYearPrefix(r[usedHeaders.indexOf('YEAR')])} ${r[usedHeaders.indexOf('STREAM')]} ${r[deptIdx]}`.replace(/\s+/g, ' ').trim()))].sort();
            }
            const depts = [...new Set(parsedRows.map(r => r[deptIdx]))].sort();

            main.querySelector('#csvSummary').innerHTML = `
              <div>👥 <strong class="text-white">${parsedRows.length}</strong> students detected using <strong>${usedHeaders === legacyHeaders ? 'Legacy Format' : 'Explicit Format'}</strong></div>
              <div>🏛️ <strong class="text-white">${depts.length}</strong> departments: ${depts.map(d => `<span class="text-indigo-300">${esc(d)}</span>`).join(', ')}</div>
              <div>📚 <strong class="text-white">${classes.length}</strong> unique classes found</div>
            `;
            main.querySelector('#csvPreview')?.classList.remove('hidden');
            checkUploadReady();
          };
          reader.readAsText(file);
        };
      }

      const checkUploadReady = () => {
        const resetVal = main.querySelector('#confirmResetText')?.value.trim().toUpperCase() || '';
        const resetOk = resetVal === 'RESET' || resetVal === 'CONFIRM';
        const pwdOk = (main.querySelector('#confirmPwd')?.value.trim() || '') !== '';
        const btn = main.querySelector('#btnUploadRoll');
        if (!btn) return;
        const ready = resetOk && pwdOk && parsedRows && parsedRows.length > 0;
        btn.disabled = !ready;
        btn.classList.toggle('opacity-50', !ready);
        btn.classList.toggle('cursor-not-allowed', !ready);
      };

      main.querySelector('#confirmResetText')?.addEventListener('input', checkUploadReady);
      main.querySelector('#confirmPwd')?.addEventListener('input', checkUploadReady);

      if (main.querySelector('#btnUploadRoll')) {
        main.querySelector('#btnUploadRoll').onclick = async (e) => {
          const confirmPwd = main.querySelector('#confirmPwd').value.trim();
          if (!parsedRows || parsedRows.length === 0) return showToast('No data to upload.', 'error');
          if (!confirm(`CONFIRMATION\n\nYou are about to update the Nominal Roll with ${parsedRows.length} students.\nExisting nominations will be preserved and automatically re-mapped by Admission Number.\n\nProceed?`)) return;

          setLoading(e.target, true, 'Uploading & Re-mapping...');
          try {
            const res = await api.adminUploadNominalRoll(confirmPwd, { headers: usedHeaders, rows: parsedRows });
            const remapMsg = res.remappedNominations !== undefined ? ` Re-mapped ${res.remappedNominations} existing nominations.` : '';
            showToast(`✅ Nominal Roll updated with ${res.count || parsedRows.length} students.${remapMsg}`, 'success');
            await reloadRollData(main, pwd);
          } catch (err) {
            showToast(err.message, 'error');
            setLoading(e.target, false, '📤 Upload Roll & Auto-Remap Nominations');
          }
        };
      }

      // Clear Nominal Roll Alone Modal & Handlers
      const openClearRollModal = () => {
        const modal = main.querySelector('#clearRollModal');
        const confirmTxt = main.querySelector('#clearRollConfirmText');
        const pwdInp = main.querySelector('#clearRollPwdInput');
        const errEl = main.querySelector('#clearRollError');
        if (confirmTxt) confirmTxt.value = '';
        if (pwdInp) pwdInp.value = '';
        if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
        if (modal) {
          modal.classList.remove('hidden');
          if (confirmTxt) setTimeout(() => confirmTxt.focus(), 50);
        }
      };

      if (main.querySelector('#btnClearRoll')) {
        main.querySelector('#btnClearRoll').onclick = openClearRollModal;
      }
      if (main.querySelector('#btnCancelClearRoll')) {
        main.querySelector('#btnCancelClearRoll').onclick = () => {
          main.querySelector('#clearRollModal')?.classList.add('hidden');
        };
      }

      if (main.querySelector('#btnConfirmClearRoll')) {
        main.querySelector('#btnConfirmClearRoll').onclick = async (e) => {
          const confirmTxt = (main.querySelector('#clearRollConfirmText')?.value || '').trim().toUpperCase();
          const enteredPwd = (main.querySelector('#clearRollPwdInput')?.value || '').trim();
          const errEl = main.querySelector('#clearRollError');
          const btn = e.target;

          if (confirmTxt !== 'CLEAR') {
            if (errEl) {
              errEl.textContent = '❌ Please type CLEAR to confirm deletion.';
              errEl.classList.remove('hidden');
            }
            main.querySelector('#clearRollConfirmText')?.focus();
            return;
          }

          if (!enteredPwd) {
            if (errEl) {
              errEl.textContent = '❌ Please enter your admin password.';
              errEl.classList.remove('hidden');
            }
            main.querySelector('#clearRollPwdInput')?.focus();
            return;
          }

          setLoading(btn, true, 'Clearing Roll Data...');
          if (errEl) errEl.classList.add('hidden');

          try {
            const res = await api.adminClearNominalRoll(enteredPwd);
            showToast(`🗑️ Cleared ${res.clearedCount} students from Nominal Roll. ${res.preservedNominations || 0} nominations remain preserved.`, 'success');
            main.querySelector('#clearRollModal')?.classList.add('hidden');
            await reloadRollData(main, pwd);
          } catch (err) {
            if (errEl) {
              errEl.textContent = `❌ ${err.message}`;
              errEl.classList.remove('hidden');
            }
            setLoading(btn, false, '🗑️ Clear Roll Data');
          }
        };
      }

      // Re-serialise Draft Electoral Roll Department-wise On-Demand
      if (main.querySelector('#btnFixSerialsDept')) {
        main.querySelector('#btnFixSerialsDept').onclick = async (e) => {
          const btn = e.currentTarget;
          const conf = confirm(
            "🔢 Re-serialise Draft Electoral Roll?\n\n" +
            "This will reassign contiguous sequential 1..N serial numbers:\n" +
            "• Department A-Z (Botany -> Chemistry -> ... -> Zoology)\n" +
            "• Class Progression (I UG -> II UG -> III UG -> I PG -> II PG -> Research Scholars at end)\n" +
            "• Student Name Alphabetical (A to Z)\n\n" +
            "Existing nominations will be automatically remapped using Admission Numbers.\n\n" +
            "NOTE: This action is strictly prohibited on the Final Electoral Roll.\n\n" +
            "Do you want to proceed?"
          );
          if (!conf) return;

          setLoading(btn, true, 'Re-serialising...');
          try {
            const res = await api.adminFixSerialNumbersDeptWise(pwd);
            showToast(`🔢 Sequential Sl. No successfully assigned for ${res.count} students across all departments! ${res.remappedNominations || 0} nominations re-mapped.`, 'success');
            await reloadRollData(main, pwd);
          } catch (err) {
            showToast(err.message, 'error');
            setLoading(btn, false, '🔢 Re-serialise Draft Roll');
          }
        };
      }

      // Re-map Nominations On-Demand
      if (main.querySelector('#btnRemapNoms')) {
        main.querySelector('#btnRemapNoms').onclick = async (e) => {
          setLoading(e.target, true, 'Re-mapping...');
          try {
            const res = await api.adminRemapNominations(pwd);
            showToast(`🔄 Re-mapping complete: ${res.remapped || 0} of ${res.total || 0} nominations re-linked to Nominal Roll.`, 'success');
            await reloadRollData(main, pwd);
          } catch (err) {
            showToast(err.message, 'error');
            setLoading(e.target, false, '🔄 Re-map Nominations');
          }
        };
      }
    } // end if (!isFinal)

    // Publish Draft handlers
    const handlePublishDraft = async (e) => {
      setLoading(e.target, true, 'Publishing Draft...');
      try {
        await api.adminPublishDraftRoll(pwd);
        showToast('Draft Nominal Roll published! Serial numbers are set to D1, D2...', 'success');
        await reloadRollData(main, pwd);
      } catch (err) {
        showToast(err.message, 'error');
        setLoading(e.target, false, '📢 Publish Draft Roll');
      }
    };
    if (main.querySelector('#btnPublishDraft')) main.querySelector('#btnPublishDraft').onclick = handlePublishDraft;
    if (main.querySelector('#btnPublishDraftTop')) main.querySelector('#btnPublishDraftTop').onclick = handlePublishDraft;

    // Unpublish Draft handlers
    const handleUnpublishDraft = async (e) => {
      if (!confirm('Unpublish the Draft Nominal Roll? Public visitors will no longer be able to see it.')) return;
      setLoading(e.target, true, 'Unpublishing...');
      try {
        await api.adminUnpublishDraftRoll(pwd);
        showToast('Draft Nominal Roll unpublished.', 'success');
        await reloadRollData(main, pwd);
      } catch (err) {
        showToast(err.message, 'error');
        setLoading(e.target, false, '🚫 Unpublish Draft');
      }
    };
    if (main.querySelector('#btnUnpublishDraft')) main.querySelector('#btnUnpublishDraft').onclick = handleUnpublishDraft;
    if (main.querySelector('#btnUnpublishDraftTop')) main.querySelector('#btnUnpublishDraftTop').onclick = handleUnpublishDraft;

    // Corrections Panel Toggle
    const togglePanel = main.querySelector('#toggleCorrectionsPanel');
    if (togglePanel) {
      togglePanel.onclick = () => {
        const body = main.querySelector('#correctionsPanelBody');
        const chev = main.querySelector('#corrChevron');
        if (body) {
          const isHidden = body.classList.toggle('hidden');
          if (chev) chev.textContent = isHidden ? '▼ View Requests' : '▲ Hide Requests';
        }
      };
    }

    // Resolve / Dismiss Correction Requests
    main.querySelectorAll('.resolve-corr').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        try {
          await api.adminUpdateRollCorrection(pwd, id, 'Resolved');
          showToast('Correction marked as Resolved.', 'success');
          await reloadRollData(main, pwd);
        } catch (err) { showToast(err.message, 'error'); }
      };
    });

    main.querySelectorAll('.dismiss-corr').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        try {
          await api.adminUpdateRollCorrection(pwd, id, 'Dismissed');
          showToast('Correction marked as Dismissed.', 'success');
          await reloadRollData(main, pwd);
        } catch (err) { showToast(err.message, 'error'); }
      };
    });

    // Finalize button handler
    const handleFinalize = async (e) => {
      if (!confirm('Are you sure you want to finalize the Nominal Roll?\n\nThis will lock the list and prevent any further additions, edits, or deletions.')) return;
      
      const doFinalize = async (matchNominations = false) => {
        setLoading(e.target, true, 'Finalizing...');
        try {
          const res = await api.adminFinalizeRoll(pwd, { matchNominations });
          if (res && res.requiresMatching) {
            setLoading(e.target, false, '🔒 Finalize & Lock Roll');
            if (confirm(`⚠️ ${res.count} existing nominations found!\n\nBecause you edited the Nominal Roll, their Serial Numbers have shifted.\n\nWould you like the system to automatically remap them using their Admission Numbers?`)) {
              return await doFinalize(true);
            } else {
              return; // Admin cancelled the remap, so we don't finalize.
            }
          }
          showToast('Nominal Roll Finalized & Locked Successfully!', 'success');
          await reloadRollData(main, pwd);
        } catch (err) {
          showToast(err.message, 'error');
          setLoading(e.target, false, '🔒 Finalize & Lock Roll');
        }
      };
      await doFinalize(false);
    };

    if (main.querySelector('#btnFinalize')) main.querySelector('#btnFinalize').onclick = handleFinalize;
    if (main.querySelector('#btnFinalizeTop')) main.querySelector('#btnFinalizeTop').onclick = handleFinalize;

    // Unfinalize handlers (modal with admin password, no OTP)
    const openUnfinalizeModal = () => {
      const modal = main.querySelector('#unfinalizeModal');
      const input = main.querySelector('#unfinalizePwdInput');
      const errEl = main.querySelector('#unfinalizeError');
      if (input) input.value = '';
      if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
      if (modal) {
        modal.classList.remove('hidden');
        if (input) setTimeout(() => input.focus(), 50);
      }
    };

    if (main.querySelector('#btnUnfinalize')) {
      main.querySelector('#btnUnfinalize').onclick = openUnfinalizeModal;
    }
    if (main.querySelector('#btnUnfinalizeBanner')) {
      main.querySelector('#btnUnfinalizeBanner').onclick = openUnfinalizeModal;
    }

    if (main.querySelector('#btnCancelUnfinalize')) {
      main.querySelector('#btnCancelUnfinalize').onclick = () => {
        main.querySelector('#unfinalizeModal')?.classList.add('hidden');
      };
    }

    const doUnfinalize = async () => {
      const input = main.querySelector('#unfinalizePwdInput');
      const enteredPwd = (input?.value || '').trim();
      const errEl = main.querySelector('#unfinalizeError');
      const btn = main.querySelector('#btnConfirmUnfinalize');

      if (!enteredPwd) {
        if (errEl) {
          errEl.textContent = '❌ Please enter your admin password.';
          errEl.classList.remove('hidden');
        }
        input?.focus();
        return;
      }

      setLoading(btn, true, 'Unlocking...');
      if (errEl) errEl.classList.add('hidden');

      try {
        await api.adminUnfinalizeRoll(enteredPwd);
        showToast('Nominal Roll Unlocked! You can now add, edit, or delete students.', 'success');
        main.querySelector('#unfinalizeModal')?.classList.add('hidden');
        await reloadRollData(main, pwd);
      } catch (err) {
        const msg = (err.message && (err.message.includes('UNAUTHORIZED') || err.message.includes('password')))
          ? 'Incorrect admin password. Please try again.'
          : (err.message || 'Incorrect password');
        if (errEl) {
          errEl.textContent = `❌ ${msg}`;
          errEl.classList.remove('hidden');
        }
        showToast(msg, 'error');
        setLoading(btn, false, 'Confirm & Unlock');
        input?.focus();
      }
    };

    if (main.querySelector('#btnConfirmUnfinalize')) {
      main.querySelector('#btnConfirmUnfinalize').onclick = doUnfinalize;
    }
    if (main.querySelector('#unfinalizePwdInput')) {
      main.querySelector('#unfinalizePwdInput').onkeydown = (e) => {
        if (e.key === 'Enter') doUnfinalize();
      };
    }

    // Printing via interactive Print Modal (All, Department, Class filtering)
    if (main.querySelector('#btnPrintRoll')) {
      main.querySelector('#btnPrintRoll').onclick = () => {
        openPrintRollModal({
          students,
          isFinal,
          isDraft,
          collegeName: settings.collegeName,
          collegeLogo: settings.collegeLogo,
          electionYear: settings.electionYear,
          initialSort: adminArrangeMode === 'dept-class' ? 'dept-class' : (adminArrangeMode === 'name' ? 'class' : 'serial')
        });
      };
    }

  }; // end refreshTable

  refreshTable();
}


