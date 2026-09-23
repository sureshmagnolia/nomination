/**
 * rollPrinter.js
 * Comprehensive print engine and modal dialog for Nominal Rolls (Draft & Final).
 * Supports:
 *   1. All Students, Department-Wise, or Specific Class filtering
 *   2. 1 Column (Standard) or 2 Columns (Side-by-Side Dual Lists to save space & paper)
 *   3. No Voter Signature/Remarks on Draft/Final Nominal Roll (reserved for Marked Copy in Booths)
 *   4. Sole official signatory: Returning Officer (aligned right)
 */
import { esc, compareSl, getProgWeight, getStudentDeptClassKey, formatCorrectionDeadline } from './utils.js';
import { CONFIG } from './config.js';

const STORAGE_KEY = 'gcc_nominal_roll_last_print_options';

function loadLastPrintState() {
  try {
    const raw = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) ||
                (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STORAGE_KEY));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return {
    scope: null,
    dept: null,
    className: null,
    sortBy: null,
    columns: null,
    pageBreakPerClass: null
  };
}

const lastPrintState = loadLastPrintState();

function saveLastPrintState(patch) {
  Object.assign(lastPrintState, patch);
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(lastPrintState));
  } catch (e) {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lastPrintState));
    } catch (_) {}
  }
}

/**
 * Opens the interactive Print Roll modal dialog.
 */
export function openPrintRollModal({ students, isFinal, isDraft, collegeName, collegeLogo = '', electionYear = '', draftRollEnd = '', initialDept = '', initialClass = '', initialSort = 'dept-class' }) {
  const existingModal = document.getElementById('printRollModalContainer');
  if (existingModal) existingModal.remove();

  const cName = collegeName || CONFIG.COLLEGE_NAME || 'College Union Election';
  const correctionDeadline = formatCorrectionDeadline(draftRollEnd);

  // Extract unique departments and classes
  const allDepartments = Array.from(new Set(
    students.map(s => (s['Dept'] || s['DEPT'] || s['department'] || '').trim()).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));

  const getClassesForDept = (dept) => {
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

  // Determine initial scope & dropdown values from last saved state or initial props
  let currentScope = initialClass ? 'class' : (initialDept ? 'dept' : (lastPrintState.scope || 'all'));

  let currentDept = initialDept || (lastPrintState.dept && allDepartments.includes(lastPrintState.dept) ? lastPrintState.dept : (allDepartments[0] || ''));

  const classesForInitialDept = getClassesForDept(currentScope === 'dept' ? currentDept : (currentDept || ''));
  let currentClass = initialClass || (lastPrintState.className && classesForInitialDept.includes(lastPrintState.className) ? lastPrintState.className : (classesForInitialDept[0] || ''));

  let currentSort = lastPrintState.sortBy || initialSort || 'dept-class';
  let currentColumns = lastPrintState.columns || '1';
  let pageBreakEachClass = (lastPrintState.pageBreakPerClass !== null && lastPrintState.pageBreakPerClass !== undefined)
    ? lastPrintState.pageBreakPerClass
    : true;

  const modalEl = document.createElement('div');
  modalEl.id = 'printRollModalContainer';
  modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';

  const cleanupModal = () => {
    window.removeEventListener('keydown', handleKeyDown);
    modalEl.remove();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      cleanupModal();
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  const renderModalContent = () => {
    const classesForCurrentDept = getClassesForDept(currentScope === 'dept' ? currentDept : (currentDept || ''));
    if (!classesForCurrentDept.includes(currentClass)) {
      currentClass = classesForCurrentDept[0] || '';
      saveLastPrintState({ className: currentClass });
    }

    // Compute preview count
    let targetStudents = [];
    let scopeDesc = '';
    if (currentScope === 'all') {
      targetStudents = students;
      scopeDesc = `Entire College (${students.length} students across ${allDepartments.length} departments)`;
    } else if (currentScope === 'dept') {
      targetStudents = students.filter(s => (s['Dept'] || '').trim().toLowerCase() === currentDept.toLowerCase());
      scopeDesc = `Department of ${currentDept} (${targetStudents.length} students)`;
    } else if (currentScope === 'class') {
      targetStudents = students.filter(s => getStudentDeptClassKey(s).toLowerCase() === currentClass.toLowerCase());
      scopeDesc = `Class: ${currentClass} (${targetStudents.length} students)`;
    }

    modalEl.innerHTML = `
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-md" id="printModalBackdrop"></div>

      <!-- Dialog Card -->
      <div class="relative bg-slate-900 border border-white/15 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 text-slate-200 z-10 max-h-[90vh] overflow-y-auto">
        
        <!-- Header -->
        <div class="flex items-start justify-between border-b border-white/10 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xl shadow-inner">🖨️</div>
            <div>
              <h3 class="font-bold text-white text-lg leading-tight">Print Nominal Roll</h3>
              <p class="text-xs text-slate-400 mt-0.5">Configure filter scope, layout, and sorting for printing</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${isDraft ? 
              `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold">📋 DRAFT (D1, D2...)</span>` : 
              `<span class="badge badge-valid text-[11px] font-mono font-bold">✅ FINAL (1, 2, 3...)</span>`
            }
            <button id="btnClosePrintModal" class="text-slate-400 hover:text-white text-2xl leading-none px-1">&times;</button>
          </div>
        </div>

        <!-- Scope Selection (Tabs) -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-slate-300 uppercase tracking-wider block">1. Select Print Scope</label>
          <div class="grid grid-cols-3 gap-2">
            <button type="button" class="scope-btn p-3 rounded-xl border text-center transition-all ${currentScope === 'all' ? 'border-indigo-500 bg-indigo-600/20 text-white font-bold shadow-lg shadow-indigo-900/30' : 'border-white/10 bg-black/20 text-slate-400 hover:text-white hover:bg-white/5'}" data-scope="all">
              <div class="text-base mb-1">🏛️</div>
              <div class="text-xs">All Students</div>
              <div class="text-[10px] text-slate-500 font-mono mt-0.5">${students.length} voters</div>
            </button>

            <button type="button" class="scope-btn p-3 rounded-xl border text-center transition-all ${currentScope === 'dept' ? 'border-indigo-500 bg-indigo-600/20 text-white font-bold shadow-lg shadow-indigo-900/30' : 'border-white/10 bg-black/20 text-slate-400 hover:text-white hover:bg-white/5'}" data-scope="dept">
              <div class="text-base mb-1">🏢</div>
              <div class="text-xs">Department Wise</div>
              <div class="text-[10px] text-slate-500 font-mono mt-0.5">${allDepartments.length} depts</div>
            </button>

            <button type="button" class="scope-btn p-3 rounded-xl border text-center transition-all ${currentScope === 'class' ? 'border-indigo-500 bg-indigo-600/20 text-white font-bold shadow-lg shadow-indigo-900/30' : 'border-white/10 bg-black/20 text-slate-400 hover:text-white hover:bg-white/5'}" data-scope="class">
              <div class="text-base mb-1">🎓</div>
              <div class="text-xs">Specific Class</div>
              <div class="text-[10px] text-slate-500 font-mono mt-0.5">Single class</div>
            </button>
          </div>
        </div>

        <!-- Scope Parameters (Conditional) -->
        <div class="space-y-3 bg-black/30 p-4 rounded-xl border border-white/5">
          ${currentScope === 'dept' ? `
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">Choose Department</label>
              <select id="printDeptSelect" class="field text-sm bg-slate-800 border-white/10 text-white w-full">
                ${allDepartments.map(d => {
                  const cnt = students.filter(s => (s['Dept'] || '').trim().toLowerCase() === d.toLowerCase()).length;
                  return `<option value="${esc(d)}" ${d === currentDept ? 'selected' : ''}>${esc(d)} (${cnt} students)</option>`;
                }).join('')}
              </select>
            </div>
          ` : ''}

          ${currentScope === 'class' ? `
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1.5">Filter by Department (Optional)</label>
                <select id="printClassDeptFilter" class="field text-sm bg-slate-800 border-white/10 text-white w-full">
                  <option value="">All Departments</option>
                  ${allDepartments.map(d => `<option value="${esc(d)}" ${d === currentDept ? 'selected' : ''}>${esc(d)}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1.5">Choose Class</label>
                <select id="printClassSelect" class="field text-sm bg-slate-800 border-white/10 text-white w-full">
                  ${classesForCurrentDept.map(c => {
                    const cnt = students.filter(s => (s['CLASS'] || '').trim().toLowerCase() === c.toLowerCase()).length;
                    return `<option value="${esc(c)}" ${c === currentClass ? 'selected' : ''}>${esc(c)} (${cnt} students)</option>`;
                  }).join('')}
                </select>
              </div>
            </div>
          ` : ''}

          ${currentScope === 'all' ? `
            <div class="text-xs text-slate-400 flex items-center gap-2">
              <span>ℹ</span>
              <span>All <strong>${students.length}</strong> students across the entire institution will be included in the print job.</span>
            </div>
          ` : ''}
        </div>

        <!-- Sort Order, Column Layout & Page Break Options -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">2. Sort Order</label>
            <select id="printSortSelect" class="field text-xs bg-slate-800 border-white/10 text-white w-full py-2">
              <option value="dept-class" ${currentSort === 'dept-class' ? 'selected' : ''}>🏢 Dept ➔ Class ➔ Name (A-Z)</option>
              <option value="serial" ${currentSort === 'serial' ? 'selected' : ''}>🔢 By Serial Number</option>
              <option value="class" ${currentSort === 'class' ? 'selected' : ''}>🎓 By Class & Alphabetical</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">3. Column Layout</label>
            <select id="printColumnsSelect" class="field text-xs bg-slate-800 border-white/10 text-white w-full py-2">
              <option value="1" ${currentColumns === '1' ? 'selected' : ''}>1 Column (Standard)</option>
              <option value="2" ${currentColumns === '2' ? 'selected' : ''}>2 Columns (Saves Space / Paper)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">4. Multi-Class Layout</label>
            ${currentScope === 'class' ? `
              <div class="field text-xs bg-slate-800/50 text-slate-400 py-2 border-dashed">
                Single Class Mode
              </div>
            ` : `
              <label class="flex items-center gap-2 p-2 rounded-lg bg-slate-800/60 border border-white/5 cursor-pointer hover:bg-slate-800 h-[38px]">
                <input type="checkbox" id="pageBreakCheckbox" class="rounded text-indigo-600" ${pageBreakEachClass ? 'checked' : ''}>
                <span class="text-xs text-slate-300">New page per class</span>
              </label>
            `}
          </div>
        </div>

        <!-- Live Preview Banner -->
        <div class="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-between text-xs text-indigo-200">
          <div class="flex items-center gap-2">
            <span class="text-base">📋</span>
            <div>
              <strong class="text-white block">Ready to Print: ${targetStudents.length} Students</strong>
              <span>${esc(scopeDesc)}</span>
            </div>
          </div>
          <div class="text-right font-mono text-[11px] text-indigo-300">
            ${isDraft ? 'Provisional Draft' : 'Official Final'}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button type="button" id="btnCancelPrintModal" class="btn btn-secondary text-sm">Cancel</button>
          <button type="button" id="btnExecutePrint" class="btn btn-primary bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 px-5 py-2.5 shadow-lg shadow-indigo-900/40">
            <span>🖨️ Open Print View</span>
            <span class="badge bg-white/20 text-white text-[10px] px-1.5">${targetStudents.length}</span>
          </button>
        </div>

      </div>
    `;

    // Bind events - only manual dismissals close the modal
    modalEl.querySelector('#btnClosePrintModal').onclick = cleanupModal;
    modalEl.querySelector('#btnCancelPrintModal').onclick = cleanupModal;
    modalEl.querySelector('#printModalBackdrop').onclick = cleanupModal;

    // Scope button clicks
    modalEl.querySelectorAll('.scope-btn').forEach(btn => {
      btn.onclick = () => {
        currentScope = btn.dataset.scope;
        saveLastPrintState({ scope: currentScope });
        renderModalContent();
      };
    });

    // Dept select
    const deptSel = modalEl.querySelector('#printDeptSelect');
    if (deptSel) {
      deptSel.onchange = (e) => {
        currentDept = e.target.value;
        saveLastPrintState({ dept: currentDept });
        renderModalContent();
      };
    }

    // Class Dept filter
    const classDeptSel = modalEl.querySelector('#printClassDeptFilter');
    if (classDeptSel) {
      classDeptSel.onchange = (e) => {
        currentDept = e.target.value;
        saveLastPrintState({ dept: currentDept });
        renderModalContent();
      };
    }

    // Class select
    const classSel = modalEl.querySelector('#printClassSelect');
    if (classSel) {
      classSel.onchange = (e) => {
        currentClass = e.target.value;
        saveLastPrintState({ className: currentClass });
        renderModalContent();
      };
    }

    // Sort order
    const sortSel = modalEl.querySelector('#printSortSelect');
    if (sortSel) {
      sortSel.onchange = (e) => {
        currentSort = e.target.value;
        saveLastPrintState({ sortBy: currentSort });
      };
    }

    // Column layout
    const colSel = modalEl.querySelector('#printColumnsSelect');
    if (colSel) {
      colSel.onchange = (e) => {
        currentColumns = e.target.value;
        saveLastPrintState({ columns: currentColumns });
      };
    }

    // Page break checkbox
    const pbCheck = modalEl.querySelector('#pageBreakCheckbox');
    if (pbCheck) {
      pbCheck.onchange = (e) => {
        pageBreakEachClass = e.target.checked;
        saveLastPrintState({ pageBreakPerClass: pageBreakEachClass });
      };
    }

    // Execute Print button - does NOT close modal automatically
    const btnExecute = modalEl.querySelector('#btnExecutePrint');
    if (btnExecute) {
      btnExecute.onclick = () => {
        saveLastPrintState({
          scope: currentScope,
          dept: currentDept,
          className: currentClass,
          sortBy: currentSort,
          columns: currentColumns,
          pageBreakPerClass: pageBreakEachClass
        });

        executeRollPrint({
          students,
          isFinal,
          isDraft,
          collegeName: cName,
          collegeLogo,
          electionYear,
          scope: currentScope,
          dept: currentDept,
          className: currentClass,
          sortBy: currentSort,
          pageBreakPerClass: pageBreakEachClass,
          columns: currentColumns
        });

        // Modal intentionally stays open until user manually closes it.
        // Provide visual confirmation feedback on the print button.
        const originalHtml = btnExecute.innerHTML;
        btnExecute.innerHTML = `<span>✅ Print View Opened!</span><span class="badge bg-white/20 text-white text-[10px] px-1.5">${targetStudents.length}</span>`;
        btnExecute.classList.remove('bg-indigo-600', 'hover:bg-indigo-500');
        btnExecute.classList.add('bg-emerald-600', 'hover:bg-emerald-500');

        setTimeout(() => {
          if (document.body.contains(btnExecute)) {
            btnExecute.innerHTML = originalHtml;
            btnExecute.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
            btnExecute.classList.add('bg-indigo-600', 'hover:bg-indigo-500');
          }
        }, 2200);
      };
    }
  };

  renderModalContent();
  document.body.appendChild(modalEl);
}

/**
 * Generates the clean, official print window and executes window.print().
 */
export function executeRollPrint({
  students,
  isFinal,
  isDraft,
  collegeName,
  collegeLogo = '',
  electionYear = '',
  scope = 'all',
  dept = '',
  className = '',
  sortBy = 'serial',
  pageBreakPerClass = true,
  columns = '1'
}) {
  const yearStr = electionYear || new Date().getFullYear().toString();
  // 1. Filter students based on scope
  let data = [...students];
  let scopeSubtitle = 'Master Nominal Roll';

  if (scope === 'dept' && dept) {
    data = data.filter(s => (s['Dept'] || '').trim().toLowerCase() === dept.toLowerCase());
    scopeSubtitle = `Department of ${dept}`;
  } else if (scope === 'class' && className) {
    data = data.filter(s => getStudentDeptClassKey(s).toLowerCase() === className.toLowerCase());
    scopeSubtitle = `Class: ${className}`;
  }

  if (data.length === 0) {
    alert('No students found for the selected print criteria.');
    return;
  }

  // 2. Sorting
  if (sortBy === 'dept-class') {
    data.sort((a, b) => {
      // 1. Department A-Z
      const dA = String(a['Dept'] || a['DEPT'] || '').trim().toUpperCase();
      const dB = String(b['Dept'] || b['DEPT'] || '').trim().toUpperCase();
      if (dA !== dB) return dA.localeCompare(dB);

      // 2. Program Level Progression: I UG -> II UG -> III UG -> I PG -> II PG -> RS (6000 at dept end)
      const cA = getStudentDeptClassKey(a).toUpperCase();
      const cB = getStudentDeptClassKey(b).toUpperCase();
      const wA = getProgWeight(cA);
      const wB = getProgWeight(cB);
      if (wA !== wB) return wA - wB;

      // 3. Class Name
      if (cA !== cB) return cA.localeCompare(cB);

      // 4. Name A-Z within Class
      const nA = String(a['NAME'] || '').trim().toUpperCase();
      const nB = String(b['NAME'] || '').trim().toUpperCase();
      if (nA !== nB) return nA.localeCompare(nB);

      // 5. Sl. No (natural alphanumeric: handles 124, 124a, 124b)
      return compareSl(a, b);
    });
  } else if (sortBy === 'class') {
    data.sort((a, b) => {
      const dA = String(a['Dept'] || '').toUpperCase();
      const dB = String(b['Dept'] || '').toUpperCase();
      if (dA !== dB) return dA.localeCompare(dB);

      const cA = getStudentDeptClassKey(a).toUpperCase();
      const cB = getStudentDeptClassKey(b).toUpperCase();
      if (cA !== cB) {
        const wA = getProgWeight(cA);
        const wB = getProgWeight(cB);
        if (wA !== wB) return wA - wB;
        return cA.localeCompare(cB);
      }
      const nA = String(a['NAME'] || '').toUpperCase();
      const nB = String(b['NAME'] || '').toUpperCase();
      if (nA !== nB) return nA.localeCompare(nB);
      return compareSl(a, b);
    });
  } else {
    data.sort((a, b) => compareSl(a, b));
  }

  const watermark = isFinal ? 'FINAL NOMINAL ROLL' : 'DRAFT NOMINAL ROLL';
  const timestamp = new Date().toLocaleString();
  const formatSl = (raw) => isDraft ? `D${raw}` : raw;

  let bodyContent = '';

  // Case A: Page-break per class (either single class, or multi-class with pageBreakPerClass)
  if (scope === 'class' || (pageBreakPerClass && scope !== 'single_table')) {
    // Group by (Dept, Class) so each department's research scholars form their own separate class group at the end of that department!
    const groups = {};
    const groupOrder = [];

    data.forEach(s => {
      const sDept = String(s['Dept'] || s['DEPT'] || 'GENERAL').trim();
      const clsKey = getStudentDeptClassKey(s);
      const groupKey = `${sDept}___${clsKey}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          dept: sDept,
          clsName: clsKey,
          students: []
        };
        groupOrder.push(groupKey);
      }
      groups[groupKey].students.push(s);
    });

    if (sortBy === 'dept-class' || sortBy === 'class') {
      groupOrder.sort((gA, gB) => {
        const itemA = groups[gA];
        const itemB = groups[gB];
        if (itemA.dept.toUpperCase() !== itemB.dept.toUpperCase()) {
          return itemA.dept.toUpperCase().localeCompare(itemB.dept.toUpperCase());
        }
        const wA = getProgWeight(itemA.clsName);
        const wB = getProgWeight(itemB.clsName);
        if (wA !== wB) return wA - wB;
        return itemA.clsName.localeCompare(itemB.clsName);
      });
    }

    groupOrder.forEach((gKey, idx) => {
      const group = groups[gKey];
      const classStudents = group.students;
      const cKey = group.clsName;
      const classDept = group.dept || (scope === 'dept' ? dept : '–');
      const isLastClass = idx === groupOrder.length - 1;

      // Ensure names in each nominal roll Class are sorted alphabetically based on their name, tie-broken by serial
      classStudents.sort((a, b) => {
        const nA = String(a['NAME'] || '').trim().toUpperCase();
        const nB = String(b['NAME'] || '').trim().toUpperCase();
        if (nA !== nB) return nA.localeCompare(nB);
        return compareSl(a, b);
      });

      if (columns === '2') {
        // 2 Columns Mode: Chunk by ~70 students per page (35 per column)
        const PAGE_SIZE = 70;
        const numPages = Math.max(1, Math.ceil(classStudents.length / PAGE_SIZE));

        for (let p = 0; p < numPages; p++) {
          const pageChunk = classStudents.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
          const mid = Math.ceil(pageChunk.length / 2);
          const leftList = pageChunk.slice(0, mid);
          const rightList = pageChunk.slice(mid);
          const isLastPageOfClass = p === numPages - 1;
          const isVeryLastPage = isLastClass && isLastPageOfClass;

          bodyContent += `
            <div class="page-container ${!isVeryLastPage ? 'page-break' : ''}">
              <div class="watermark">${watermark}</div>
              
              <div class="print-header">
                ${collegeLogo ? `<img src="${collegeLogo}" class="college-logo" alt="College Logo">` : ''}
                <div class="college-name">${esc(collegeName)}</div>
                <div class="election-title">College Union Election ${esc(yearStr)} — ${watermark}</div>
                <div class="class-header">
                  <span class="badge-tag">CLASS: ${esc(cKey)}</span>
                  <span class="badge-tag">DEPARTMENT: ${esc(classDept)}</span>
                  ${numPages > 1 ? `<span class="badge-tag">PAGE ${p + 1} OF ${numPages}</span>` : ''}
                </div>
                <div class="meta-bar">
                  <div>Students in Class: <strong>${classStudents.length}</strong></div>
                  <div>Sorted By: ${sortBy === 'dept-class' ? 'Dept ➔ Class ➔ Sl. No' : (sortBy === 'class' ? 'Class & Alphabetical' : 'Serial Number')}</div>
                  <div>Printed: ${timestamp}</div>
                </div>
              </div>

              <div class="dual-columns">
                <div class="column-half">
                  <table class="roll-table">
                    <thead>
                      <tr>
                        <th class="col-sl">${isDraft ? 'Draft Sl.' : 'Sl. No'}</th>
                        <th class="col-adm">Adm. No</th>
                        <th>Student Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${leftList.map(s => `
                        <tr>
                          <td class="col-sl font-mono font-bold">${formatSl(esc(s['Nominal Roll Serial Number']))}</td>
                          <td class="col-adm font-mono">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                          <td class="font-semibold">${esc(s['NAME'])}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>

                <div class="column-half">
                  <table class="roll-table">
                    <thead>
                      <tr>
                        <th class="col-sl">${isDraft ? 'Draft Sl.' : 'Sl. No'}</th>
                        <th class="col-adm">Adm. No</th>
                        <th>Student Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rightList.map(s => `
                        <tr>
                          <td class="col-sl font-mono font-bold">${formatSl(esc(s['Nominal Roll Serial Number']))}</td>
                          <td class="col-adm font-mono">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                          <td class="font-semibold">${esc(s['NAME'])}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>

              ${isLastPageOfClass ? `
                <div class="print-footer">
                  ${isDraft ? `
                    <div class="draft-footnote">
                      <strong>NOTE:</strong> Any corrections or changes may be intimated to the Returning Officer (RO) in written form duly forwarded by the HoD of the department, before <strong>${esc(correctionDeadline)}</strong>.
                    </div>
                  ` : ''}
                  <div class="sig-box">
                    <div class="sig-line"></div>
                    <div>Returning Officer</div>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }

      } else {
        // 1 Column Mode: Standard single table without signature/remarks
        bodyContent += `
          <div class="page-container ${!isLastClass ? 'page-break' : ''}">
            <div class="watermark">${watermark}</div>
            
            <div class="print-header">
              ${collegeLogo ? `<img src="${collegeLogo}" class="college-logo" alt="College Logo">` : ''}
              <div class="college-name">${esc(collegeName)}</div>
              <div class="election-title">College Union Election ${esc(yearStr)} — ${watermark}</div>
              <div class="class-header">
                <span class="badge-tag">CLASS: ${esc(cKey)}</span>
                <span class="badge-tag">DEPARTMENT: ${esc(classDept)}</span>
              </div>
              <div class="meta-bar">
                <div>Students in Class: <strong>${classStudents.length}</strong></div>
                <div>Sorted By: ${sortBy === 'dept-class' ? 'Dept ➔ Class ➔ Sl. No' : (sortBy === 'class' ? 'Class & Alphabetical' : 'Serial Number')}</div>
                <div>Printed: ${timestamp}</div>
              </div>
            </div>

            <table class="roll-table">
              <thead>
                <tr>
                  <th class="col-sl">${isDraft ? 'Draft Sl. No' : 'Sl. No'}</th>
                  <th class="col-adm">Admission No</th>
                  <th>Student Full Name</th>
                </tr>
              </thead>
              <tbody>
                ${classStudents.map(s => `
                  <tr>
                    <td class="col-sl font-mono font-bold">${formatSl(esc(s['Nominal Roll Serial Number']))}</td>
                    <td class="col-adm font-mono">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                    <td class="font-semibold">${esc(s['NAME'])}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="print-footer">
              ${isDraft ? `
                <div class="draft-footnote">
                  <strong>NOTE:</strong> Any corrections or changes may be intimated to the Returning Officer (RO) in written form duly forwarded by the HoD of the department, before <strong>${esc(correctionDeadline)}</strong>.
                </div>
              ` : ''}
              <div class="sig-box">
                <div class="sig-line"></div>
                <div>Returning Officer</div>
              </div>
            </div>
          </div>
        `;
      }
    });

  } else {
    // Case B: Continuous table (Entire College or Department continuous)
    if (columns === '2') {
      // 2 Columns Continuous Mode: Chunk by 70 students per page
      const PAGE_SIZE = 70;
      const numPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));

      for (let p = 0; p < numPages; p++) {
        const pageChunk = data.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
        const mid = Math.ceil(pageChunk.length / 2);
        const leftList = pageChunk.slice(0, mid);
        const rightList = pageChunk.slice(mid);
        const isLastPage = p === numPages - 1;

        bodyContent += `
          <div class="page-container ${!isLastPage ? 'page-break' : ''}">
            <div class="watermark">${watermark}</div>

            <div class="print-header">
              ${collegeLogo ? `<img src="${collegeLogo}" class="college-logo" alt="College Logo">` : ''}
              <div class="college-name">${esc(collegeName)}</div>
              <div class="election-title">College Union Election ${esc(yearStr)} — ${watermark}</div>
              <div class="class-header">
                <span class="badge-tag">${esc(scopeSubtitle.toUpperCase())}</span>
                ${numPages > 1 ? `<span class="badge-tag">PAGE ${p + 1} OF ${numPages}</span>` : ''}
              </div>
              <div class="meta-bar">
                <div>Total Students: <strong>${data.length}</strong></div>
                <div>Sorted By: ${sortBy === 'dept-class' ? 'Dept ➔ Class ➔ Sl. No' : (sortBy === 'class' ? 'Class & Alphabetical' : 'Serial Number')}</div>
                <div>Printed: ${timestamp}</div>
              </div>
            </div>

            <div class="dual-columns">
              <div class="column-half">
                <table class="roll-table">
                  <thead>
                    <tr>
                      <th class="col-sl">${isDraft ? 'Draft Sl.' : 'Sl. No'}</th>
                      <th class="col-adm">Adm. No</th>
                      <th>Student Name</th>
                      <th>Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${leftList.map(s => `
                      <tr>
                        <td class="col-sl font-mono font-bold">${formatSl(esc(s['Nominal Roll Serial Number']))}</td>
                        <td class="col-adm font-mono">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                        <td class="font-semibold">${esc(s['NAME'])}</td>
                        <td class="text-xs">${esc(getStudentDeptClassKey(s))}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <div class="column-half">
                <table class="roll-table">
                  <thead>
                    <tr>
                      <th class="col-sl">${isDraft ? 'Draft Sl.' : 'Sl. No'}</th>
                      <th class="col-adm">Adm. No</th>
                      <th>Student Name</th>
                      <th>Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rightList.map(s => `
                      <tr>
                        <td class="col-sl font-mono font-bold">${formatSl(esc(s['Nominal Roll Serial Number']))}</td>
                        <td class="col-adm font-mono">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                        <td class="font-semibold">${esc(s['NAME'])}</td>
                        <td class="text-xs">${esc(getStudentDeptClassKey(s))}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            ${isLastPage ? `
              <div class="print-footer">
                ${isDraft ? `
                  <div class="draft-footnote">
                    <strong>NOTE:</strong> Any corrections or changes may be intimated to the Returning Officer (RO) in written form duly forwarded by the HoD of the department, before <strong>${esc(correctionDeadline)}</strong>.
                  </div>
                ` : ''}
                <div class="sig-box">
                  <div class="sig-line"></div>
                  <div>Returning Officer</div>
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }

    } else {
      // 1 Column Continuous Mode: Single continuous table without signature/remarks
      bodyContent = `
        <div class="page-container">
          <div class="watermark">${watermark}</div>

          <div class="print-header">
            ${collegeLogo ? `<img src="${collegeLogo}" class="college-logo" alt="College Logo">` : ''}
            <div class="college-name">${esc(collegeName)}</div>
            <div class="election-title">College Union Election ${esc(yearStr)} — ${watermark}</div>
            <div class="class-header">
              <span class="badge-tag">${esc(scopeSubtitle.toUpperCase())}</span>
            </div>
            <div class="meta-bar">
              <div>Total Students: <strong>${data.length}</strong></div>
              <div>Sorted By: ${sortBy === 'dept-class' ? 'Dept ➔ Class ➔ Sl. No' : (sortBy === 'class' ? 'Class & Alphabetical' : 'Serial Number')}</div>
              <div>Printed: ${timestamp}</div>
            </div>
          </div>

          <table class="roll-table">
            <thead>
              <tr>
                <th class="col-sl">${isDraft ? 'Draft Sl. No' : 'Sl. No'}</th>
                <th class="col-adm">Admission No</th>
                <th>Student Full Name</th>
                <th>Class</th>
                <th>Department</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(s => `
                <tr>
                  <td class="col-sl font-mono font-bold">${formatSl(esc(s['Nominal Roll Serial Number']))}</td>
                  <td class="col-adm font-mono">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                  <td class="font-semibold">${esc(s['NAME'])}</td>
                  <td>${esc(getStudentDeptClassKey(s))}</td>
                  <td>${esc(s['Dept'] || '–')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="print-footer">
            ${isDraft ? `
              <div class="draft-footnote">
                <strong>NOTE:</strong> Any corrections or changes may be intimated to the Returning Officer (RO) in written form duly forwarded by the HoD of the department, before <strong>${esc(correctionDeadline)}</strong>.
              </div>
            ` : ''}
            <div class="sig-box">
              <div class="sig-line"></div>
              <div>Returning Officer</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Popup blocked! Please allow popups for this site to print.');
    return;
  }
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${watermark} — ${scopeSubtitle}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            .watermark {
              color: rgba(0, 0, 0, 0.035) !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #111827;
            line-height: 1.35;
            font-size: 11px;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .page-container {
            position: relative;
            margin-bottom: 20px;
            overflow: hidden;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 52px;
            color: rgba(0, 0, 0, 0.035);
            font-weight: 900;
            letter-spacing: 3px;
            pointer-events: none;
            z-index: 0;
            white-space: nowrap;
            text-transform: uppercase;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            user-select: none;
          }
          .college-logo {
            max-height: 55px;
            max-width: 140px;
            margin: 0 auto 6px auto;
            display: block;
            object-fit: contain;
          }
          .print-header {
            text-align: center;
            border-bottom: 2px solid #1f2937;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .college-name {
            font-size: 17px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .election-title {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            margin-top: 2px;
            color: #374151;
          }
          .class-header {
            margin-top: 6px;
            display: flex;
            justify-content: center;
            gap: 12px;
          }
          .badge-tag {
            display: inline-block;
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            padding: 2px 10px;
            border-radius: 4px;
            font-weight: 800;
            font-size: 11px;
          }
          .meta-bar {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-top: 8px;
            color: #4b5563;
          }
          .dual-columns {
            display: flex;
            gap: 12px;
            width: 100%;
            align-items: flex-start;
          }
          .column-half {
            flex: 1;
            width: calc(50% - 6px);
          }
          .column-half .roll-table {
            width: 100%;
          }
          .roll-table {
            width: 100%;
            border-collapse: collapse;
          }
          .roll-table th, .roll-table td {
            border: 1px solid #9ca3af;
            padding: 3px 6px;
            text-align: left;
            vertical-align: middle;
          }
          .roll-table th {
            background: #e5e7eb;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 9.5px;
            color: #111827;
          }
          .col-sl { width: 55px; text-align: center; }
          .col-adm { width: 85px; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
          .font-semibold { font-weight: 600; }
          .font-bold { font-weight: 700; }
          .text-xs { font-size: 9.5px; }
          
          .print-footer {
            margin-top: 20px;
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            page-break-inside: avoid;
            gap: 20px;
          }
          .draft-footnote {
            flex: 1;
            font-size: 9.5px;
            line-height: 1.4;
            color: #1f2937;
            border: 1px solid #9ca3af;
            background: #f9fafb;
            padding: 6px 10px;
            border-radius: 4px;
            text-align: left;
          }
          .sig-box {
            text-align: center;
            font-weight: 700;
            font-size: 11px;
            width: 160px;
            margin-left: auto;
            flex-shrink: 0;
          }
          .sig-line {
            border-bottom: 1px dashed #4b5563;
            margin-bottom: 6px;
            height: 40px;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}
