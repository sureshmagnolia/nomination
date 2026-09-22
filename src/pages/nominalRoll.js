/**
 * pages/nominalRoll.js
 * Public view of the Nominal Roll (Unpublished, Draft, or Final).
 * Features 50-per-page pagination, Department filter, and Class filter.
 */
import { api } from '../api.js';
import { esc, showToast, compareSl, getProgWeight, getStudentDeptClassKey } from '../utils.js';
import { CONFIG } from '../config.js';

export async function renderNominalRoll(container) {
  container.innerHTML = `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominal roll...</p></div>
  `;

  try {
    const [nominalRoll, settings] = await Promise.all([
      api.getNominalRoll().catch(() => []),
      api.getSettings().catch(() => ({}))
    ]);
    renderPublicRollUI(container, nominalRoll, settings);
  } catch (e) {
    container.innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderPublicRollUI(container, nominalRoll, settings) {
  const isFinal = settings.nominalRollFinalized === 'true' || settings.isRollFinalized === 'true';
  const isDraft = !isFinal && settings.draftRollPublished === 'true';
  const isPublished = isFinal || isDraft;
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;

  // 1. If not published at all, show friendly Unpublished screen
  if (!isPublished) {
    container.innerHTML = `
      <div class="page-enter min-h-[75vh] flex items-center justify-center p-4">
        <div class="glass rounded-2xl p-10 max-w-md w-full text-center space-y-5 border border-white/10 shadow-2xl">
          <div class="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">⏳</div>
          <h3 class="text-2xl font-bold text-white tracking-tight">Nominal Roll Not Published</h3>
          <p class="text-slate-400 text-sm leading-relaxed">
            The voter list / nominal roll has not yet been published by the election authorities of <strong class="text-slate-300">${esc(collegeName)}</strong>. Please check back later or view the election schedule.
          </p>
          <div class="pt-2">
            <button data-nav="/" class="btn btn-secondary w-full flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const students = Array.isArray(nominalRoll) ? [...nominalRoll] : [];
  students.sort((a, b) => compareSl(a, b));
  
  // Extract unique departments and classes
  const allDepartments = Array.from(new Set(
    students.map(s => (s['Dept'] || s['DEPT'] || s['department'] || '').trim()).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));

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

  // State
  let filterText = '';
  let selectedDept = '';
  let selectedClass = '';
  let arrangeMode = 'dept-class'; // 'dept-class' | 'serial' | 'name'
  let currentPage = 1;
  const PAGE_SIZE = 50;

  const formatSerial = (rawSerial) => {
    const num = String(rawSerial || '');
    return isDraft ? `D${num}` : num;
  };

  const getFilteredStudents = () => {
    const filtered = students.filter(s => {
      // Dept filter
      if (selectedDept && (s['Dept'] || '').trim().toLowerCase() !== selectedDept.toLowerCase()) {
        return false;
      }
      // Class filter
      if (selectedClass && getStudentDeptClassKey(s).toLowerCase() !== selectedClass.toLowerCase()) {
        return false;
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

    // Apply arrangement order
    if (arrangeMode === 'dept-class') {
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
    } else if (arrangeMode === 'name') {
      filtered.sort((a, b) => {
        const nA = String(a['NAME'] || '').trim().toUpperCase();
        const nB = String(b['NAME'] || '').trim().toUpperCase();
        if (nA !== nB) return nA.localeCompare(nB);
        return compareSl(a, b);
      });
    } else {
      filtered.sort((a, b) => compareSl(a, b));
    }

    return filtered;
  };

  // Initial Shell Render
  container.innerHTML = `
    <div class="page-enter space-y-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <button data-nav="/" class="text-slate-400 hover:text-white mb-2 flex items-center gap-2 text-sm transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Back to Home
          </button>
          <div class="flex items-center gap-3">
            <h3 class="text-2xl font-bold text-white">Nominal Roll</h3>
            ${isDraft ? 
              `<span class="badge badge-pending text-xs py-1.5 px-3 border border-amber-500/30 text-amber-300">📋 DRAFT LIST (SUBJECT TO CORRECTION)</span>` : 
              `<span class="badge badge-valid text-xs py-1.5 px-3">✅ FINALIZED VOTER LIST</span>`
            }
          </div>
          <p class="text-slate-400 text-sm mt-0.5">${esc(collegeName)} — College Union Election</p>
        </div>
      </div>

      ${isDraft ? `
        <!-- Draft Notice Banner -->
        <div class="glass rounded-xl p-4 border border-amber-500/30 bg-amber-500/10 flex items-start gap-3 text-amber-200 text-sm shadow-lg">
          <span class="text-2xl">⚠️</span>
          <div>
            <strong class="text-amber-100 font-semibold block mb-0.5">DRAFT NOMINAL ROLL PUBLISHED</strong>
            Serial numbers shown as <strong>D1, D2, D3...</strong> are provisional and subject to change upon finalization. Students are advised to verify their Name, Class, and Department.
          </div>
        </div>
      ` : ''}

      <!-- Search & Multi-Level Filters Bar -->
      <div class="glass rounded-xl p-4 space-y-3 shadow-xl">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center">
          <!-- Text Search -->
          <div class="relative md:col-span-4">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text" id="searchInput" class="field pl-10 w-full text-sm py-2" placeholder="Search name, adm. no, serial...">
          </div>

          <!-- Arrangement / Sort Option -->
          <div class="md:col-span-3">
            <select id="arrangeSelect" class="field text-xs sm:text-sm py-2 w-full bg-slate-900 border-white/10 text-white font-medium" title="Arrange nominal roll by department, class, or serial">
              <option value="dept-class" selected>🏢 Arrange: Dept ➔ Class ➔ Name (A-Z)</option>
              <option value="serial">🔢 Arrange: Serial Number</option>
              <option value="name">🔤 Arrange: Student Name (A–Z)</option>
            </select>
          </div>

          <!-- Department Filter -->
          <div class="md:col-span-2">
            <select id="deptFilter" class="field text-xs sm:text-sm py-2 w-full bg-slate-900 border-white/10 text-white">
              <option value="">All Depts (${allDepartments.length})</option>
              ${allDepartments.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
            </select>
          </div>

          <!-- Class Filter -->
          <div class="md:col-span-2">
            <select id="classFilter" class="field text-xs sm:text-sm py-2 w-full bg-slate-900 border-white/10 text-white">
              <option value="">All Classes</option>
            </select>
          </div>

          <!-- Reset Filter Button -->
          <div class="md:col-span-1 flex justify-end">
            <button id="btnClearFilters" class="btn btn-secondary text-xs px-2.5 py-2 w-full text-slate-400 hover:text-white" title="Reset all filters">
              ✕ Reset
            </button>
          </div>
        </div>

        <!-- Filter info summary & items per page -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs text-slate-400">
          <div id="filterSummaryText">
            Loading voters...
          </div>
          <div class="flex items-center gap-1.5 font-mono text-slate-500">
            <span>📄 50 entries per page</span>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <div class="glass rounded-xl overflow-hidden shadow-2xl">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr>
              <th class="w-24 text-center">${isDraft ? 'Draft Sl. No' : 'Sl. No'}</th>
              <th>Admission No</th>
              <th>Name</th>
              <th>Class</th>
              <th>Department</th>
            </tr></thead>
            <tbody id="rollTableBody"></tbody>
          </table>
        </div>

        <!-- Pagination Controls Footer -->
        <div id="paginationBar" class="p-4 border-t border-white/10 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div id="paginationInfo">Showing 0 of 0 students</div>
          <div id="paginationControls" class="flex items-center gap-1 flex-wrap justify-center"></div>
        </div>
      </div>
    </div>
  `;

  // Helper to populate class dropdown dynamically
  const populateClassDropdown = (dept) => {
    const classSelect = container.querySelector('#classFilter');
    const available = getAvailableClasses(dept);
    
    // Check if currently selected class is still valid
    const currentClassStillValid = available.includes(selectedClass);
    if (!currentClassStillValid) selectedClass = '';

    classSelect.innerHTML = `
      <option value="">🎓 All Classes (${available.length})</option>
      ${available.map(c => `<option value="${esc(c)}" ${c === selectedClass ? 'selected' : ''}>${esc(c)}</option>`).join('')}
    `;
  };

  populateClassDropdown('');

  // Main UI update function
  const updateTableAndPagination = () => {
    const filtered = getFilteredStudents();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, filtered.length);
    const pageStudents = filtered.slice(startIndex, endIndex);

    // 1. Render Table Rows
    const tbody = container.querySelector('#rollTableBody');
    if (pageStudents.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-12 text-slate-500">
            <div class="text-3xl mb-2">🔍</div>
            <p class="text-slate-300 font-medium text-sm">No students found</p>
            <p class="text-xs text-slate-500 mt-1">Try broadening your search term or resetting the class/department filters.</p>
          </td>
        </tr>`;
    } else {
      tbody.innerHTML = pageStudents.map(s => `
        <tr>
          <td class="text-center font-bold font-mono ${isDraft ? 'text-amber-400' : 'text-indigo-400'}">${esc(formatSerial(s['Nominal Roll Serial Number']))}</td>
          <td class="font-mono text-xs text-slate-300">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
          <td class="text-white font-medium">${esc(s['NAME'])}</td>
          <td class="text-slate-300 text-sm">${esc(getStudentDeptClassKey(s))}</td>
          <td class="text-slate-400 text-xs">${esc(s['Dept'] || '–')}</td>
        </tr>
      `).join('');
    }

    // 2. Summary Text
    const summaryText = container.querySelector('#filterSummaryText');
    const hasFilter = Boolean(filterText || selectedDept || selectedClass);
    const filterParts = [];
    if (selectedDept) filterParts.push(`Dept: <strong>${esc(selectedDept)}</strong>`);
    if (selectedClass) filterParts.push(`Class: <strong>${esc(selectedClass)}</strong>`);
    if (filterText) filterParts.push(`Search: "<strong>${esc(filterText)}</strong>"`);

    summaryText.innerHTML = `
      Showing <strong class="text-white">${filtered.length ? startIndex + 1 : 0}</strong> to <strong class="text-white">${endIndex}</strong> of <strong class="text-white">${filtered.length}</strong> students
      ${hasFilter ? `<span class="text-indigo-300/80 ml-1">(${filterParts.join(', ')})</span>` : ''}
    `;

    // 3. Pagination Info & Buttons
    const pageInfo = container.querySelector('#paginationInfo');
    pageInfo.innerHTML = `Page <strong class="text-white">${currentPage}</strong> of <strong class="text-white">${totalPages}</strong> (${filtered.length} total students)`;

    const controls = container.querySelector('#paginationControls');
    
    if (totalPages <= 1) {
      controls.innerHTML = '';
      return;
    }

    let buttonsHTML = `
      <button class="btn btn-sm btn-secondary px-2.5 py-1 text-xs pg-btn" data-page="1" ${currentPage === 1 ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''} title="First Page">« First</button>
      <button class="btn btn-sm btn-secondary px-2.5 py-1 text-xs pg-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''} title="Previous Page">‹ Prev</button>
    `;

    // Numbered page buttons with intelligent windowing
    const windowSize = 2; // Show 2 pages on either side
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

    controls.innerHTML = buttonsHTML;
  };

  // Initial table render
  updateTableAndPagination();

  // ── Event Handlers ──────────────────────────────────────────────────────────

  // Search input
  const searchInput = container.querySelector('#searchInput');
  searchInput.addEventListener('input', (e) => {
    filterText = e.target.value.trim();
    currentPage = 1;
    updateTableAndPagination();
  });

  // Department dropdown
  const deptSelect = container.querySelector('#deptFilter');
  deptSelect.addEventListener('change', (e) => {
    selectedDept = e.target.value;
    populateClassDropdown(selectedDept);
    currentPage = 1;
    updateTableAndPagination();
  });

  // Class dropdown
  const classSelect = container.querySelector('#classFilter');
  classSelect.addEventListener('change', (e) => {
    selectedClass = e.target.value;
    currentPage = 1;
    updateTableAndPagination();
  });

  // Arrange dropdown
  const arrangeSelect = container.querySelector('#arrangeSelect');
  if (arrangeSelect) {
    arrangeSelect.addEventListener('change', (e) => {
      arrangeMode = e.target.value;
      currentPage = 1;
      updateTableAndPagination();
    });
  }

  // Clear filters
  container.querySelector('#btnClearFilters').addEventListener('click', () => {
    filterText = '';
    selectedDept = '';
    selectedClass = '';
    arrangeMode = 'dept-class';
    currentPage = 1;
    searchInput.value = '';
    deptSelect.value = '';
    if (arrangeSelect) arrangeSelect.value = 'dept-class';
    populateClassDropdown('');
    updateTableAndPagination();
    showToast('Filters reset.', 'info');
  });

  // Pagination button clicks
  container.querySelector('#paginationControls').addEventListener('click', (e) => {
    const btn = e.target.closest('.pg-btn');
    if (!btn || btn.disabled) return;
    const targetPage = Number(btn.dataset.page);
    if (targetPage && targetPage !== currentPage) {
      currentPage = targetPage;
      updateTableAndPagination();
      // Smooth scroll table into view
      container.querySelector('#rollTableBody').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

}

