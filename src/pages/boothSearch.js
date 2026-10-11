/**
 * pages/boothSearch.js
 * Voter Polling Booth Search & Location Finder.
 * Allows electors to search by Name, Nominal Roll Serial Number, Admission Number, or Class
 * to find their assigned physical Polling Booth and Room / Venue Location.
 * 
 * Gatekeeping:
 * - Public mode: If locked by Admin, renders the clean security notice:
 *   "Polling Booth Search is currently locked. Booth allocations will be activated on the polling day."
 * - Admin mode: Always active 24/7 for election officials and helpdesk officers.
 */
import { api } from '../api.js';
import { esc, showToast, compareSl } from '../utils.js';
import { CONFIG } from '../config.js';
import { getStudentClassKeyBooth, isStudentInBoothCheck } from './admin/booths.js';
import { renderAdminLayout, getAdminPassword } from './admin/layout.js';

export async function renderBoothSearch(container, options = {}) {
  const isEmbedInAdmin = Boolean(options && options.adminMode);
  const adminPwd = getAdminPassword() || localStorage.getItem('adminPwd') || sessionStorage.getItem('adminPassword') || '';
  const isAdmin = Boolean(adminPwd) || isEmbedInAdmin;

  // If accessed directly from the Admin Sidebar (/admin/voter-lookup)
  if (isEmbedInAdmin) {
    if (!adminPwd) return; // getAdminPassword redirects to /admin if unauthenticated
    renderAdminLayout(container, 'voter-lookup', `
      <div class="text-center py-16">
        <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
        <p class="text-slate-400 mt-4 text-sm font-medium">Loading voter booth lookup tool...</p>
      </div>
    `);
    const mainEl = container.querySelector('#adminMain');
    await loadAndRenderSearch(mainEl, adminPwd, true, true);
    return;
  }

  // Standalone page (/find-booth)
  container.innerHTML = `
    <div class="text-center py-20">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 mt-4 text-sm font-medium">Checking polling booth allocations...</p>
    </div>
  `;

  await loadAndRenderSearch(container, adminPwd, isAdmin, false);
}

async function loadAndRenderSearch(targetContainer, adminPwd, isAdmin, isEmbedInAdmin) {
  try {
    const [settings, nominalRoll, boothPayload] = await Promise.all([
      api.getSettings().catch(() => ({})),
      api.getNominalRoll().catch(() => []),
      isAdmin 
        ? api.adminGetBooths(adminPwd, true).then(b => ({ isPublished: true, booths: Array.isArray(b) ? b : [] })).catch(() => ({ isPublished: false, booths: [] }))
        : api.getPublicBooths().catch(() => ({ isPublished: false, booths: [] }))
    ]);

    const isPublished = boothPayload.isPublished === true || settings.boothSearchPublished === 'true';

    // 1. If not admin and not published, render the exact requested security lock screen
    if (!isAdmin && !isPublished) {
      renderLockedScreen(targetContainer, settings);
      return;
    }

    const booths = Array.isArray(boothPayload.booths) ? boothPayload.booths : (Array.isArray(boothPayload) ? boothPayload : []);
    renderSearchInterface(targetContainer, settings, nominalRoll, booths, isAdmin, isPublished, isEmbedInAdmin);
  } catch (err) {
    console.error('Error rendering booth search:', err);
    targetContainer.innerHTML = `
      <div class="max-w-md mx-auto my-12 p-6 glass rounded-2xl border border-rose-500/20 text-center space-y-4">
        <div class="text-3xl">⚠️</div>
        <h3 class="text-lg font-bold text-white">Unable to Load Booth Search</h3>
        <p class="text-slate-400 text-sm leading-relaxed">${esc(err.message || 'Network error connecting to election server.')}</p>
        <button data-nav="/" class="btn btn-secondary px-6">Return to Home</button>
      </div>
    `;
  }
}

/**
 * Clean Security Lock Screen
 * Exactly displays:
 * "Polling Booth Search is currently locked. Booth allocations will be activated on the polling day."
 */
function renderLockedScreen(container, settings) {
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;
  const year = settings.electionYear || new Date().getFullYear();

  container.innerHTML = `
    <div class="page-enter min-h-[80vh] flex items-center justify-center p-4">
      <div class="glass rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center space-y-6 border border-white/10 shadow-2xl relative overflow-hidden">
        <!-- Background subtle glow -->
        <div class="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="w-20 h-20 bg-slate-800/80 border border-slate-700/80 text-amber-400 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-inner shadow-black/40">
          🔒
        </div>

        <div class="space-y-2">
          <span class="inline-block text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            ${esc(shortName)} Election ${esc(year)}
          </span>
          <h3 class="text-2xl font-black text-white tracking-tight">Polling Booth Search</h3>
        </div>

        <div class="p-4.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-sm md:text-base leading-relaxed font-medium">
          Polling Booth Search is currently locked. Booth allocations will be activated on the polling day.
        </div>

        <p class="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
          Please refer to the published Nominal Roll or election notifications for general voter status inquiries.
        </p>

        <div class="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button data-nav="/" class="btn btn-secondary flex items-center justify-center gap-2">
            <span>←</span> Back to Portal
          </button>
          <button data-nav="/nominal-roll" class="btn btn-primary flex items-center justify-center gap-2">
            <span>📜</span> View Nominal Roll
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Live Search Interface (Used by Public when Live & Admin 24/7)
 */
function renderSearchInterface(container, settings, nominalRoll, booths, isAdmin, isPublished, isEmbedInAdmin) {
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;
  const year = settings.electionYear || new Date().getFullYear();

  const students = Array.isArray(nominalRoll) ? [...nominalRoll] : [];
  students.sort(compareSl);

  // Extract distinct sorted classes for filter dropdown
  const allClasses = Array.from(new Set(
    students.map(s => String(s['CLASS'] || s['class'] || '').trim()).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));

  container.innerHTML = `
    <div class="page-enter ${isEmbedInAdmin ? 'space-y-6' : 'min-h-screen flex flex-col pb-16'}">
      ${!isEmbedInAdmin ? `
      <!-- Standalone Header -->
      <header class="glass sticky top-0 z-40 border-b border-white/10">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <button data-nav="${isAdmin ? '/admin/booths' : '/'}" class="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs">
              <span>←</span> <span>${isAdmin ? 'Admin Panel' : 'Home'}</span>
            </button>
            <div class="hidden sm:block h-5 w-px bg-white/10"></div>
            <div>
              <h1 class="text-base sm:text-lg font-bold text-white tracking-tight leading-tight flex items-center gap-2">
                <span>🏢</span> Find My Polling Booth
              </h1>
              <p class="text-[11px] text-slate-400 hidden sm:block">${esc(shortName)} Election ${esc(year)} &bull; Voter Hall &amp; Room Finder</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            ${isAdmin ? `
              <span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 font-semibold flex items-center gap-1.5">
                <span>🛡️</span> <span>Official Master View</span>
                <span class="text-[10px] text-slate-400 font-mono">(${isPublished ? 'Public: Live' : 'Public: Locked'})</span>
              </span>
              <a href="#/admin/publish" class="btn btn-secondary btn-xs">Publish Settings</a>
            ` : `
              <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1 font-medium flex items-center gap-1">
                <span>🟢</span> <span>Search Active</span>
              </span>
            `}
          </div>
        </div>
      </header>
      ` : `
      <!-- Embedded Admin Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5">
            <h3 class="text-xl font-bold text-white">Voter Booth Lookup</h3>
            <span class="badge ${isPublished ? 'badge-valid' : 'bg-slate-700 text-slate-300'} text-xs">
              ${isPublished ? '🟢 Public Search: Live' : '🔒 Public Search: Locked'}
            </span>
          </div>
          <p class="text-slate-400 text-sm">Instant always-on lookup to locate any student's allotted polling booth and physical room.</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <a href="#/admin/publish" class="btn btn-primary btn-sm flex items-center gap-1.5">
            <span>📢</span> ${isPublished ? 'Manage Visibility' : 'Publish to Students'}
          </a>
          <a href="#/admin/booths" class="btn btn-secondary btn-sm flex items-center gap-1.5">
            <span>⚙️</span> Manage Allotments
          </a>
        </div>
      </div>
      `}

      <!-- Main Search Area -->
      <main class="${isEmbedInAdmin ? 'space-y-6' : 'flex-1 max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-12 w-full space-y-6'}">
        
        <!-- Admin Notice Banner if public is still locked -->
        ${(isAdmin && !isPublished && !isEmbedInAdmin) ? `
          <div class="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/30 text-xs text-amber-200 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-base">🔒</span>
              <span><strong>Notice for Officials:</strong> Public access is currently locked. Public visitors see the locked message. This search is exclusively accessible to you as an administrator.</span>
            </div>
            <a href="#/admin/publish" class="btn btn-primary btn-xs whitespace-nowrap">Publish to Students</a>
          </div>
        ` : ''}

        <!-- Page Intro Hero (Only on Standalone page) -->
        ${!isEmbedInAdmin ? `
        <div class="text-center space-y-2">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Locate Your Polling Room &amp; Booth
          </h2>
          <p class="text-slate-400 text-sm max-w-xl mx-auto">
            Search with your <strong>Name</strong>, <strong>Roll Serial Number</strong> (e.g. 104), <strong>Admission Number</strong>, or filter by your <strong>Class</strong>.
          </p>
        </div>
        ` : ''}

        <!-- Search Controls Box -->
        <div class="glass rounded-2xl p-4 sm:p-6 border border-white/10 shadow-xl space-y-4">
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="relative flex-1">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-base">
                🔍
              </span>
              <input 
                type="text" 
                id="boothSearchInput" 
                class="field pl-10 pr-10 py-3 text-base w-full bg-slate-900/80 border-white/15 focus:border-indigo-500 placeholder-slate-500 text-white rounded-xl" 
                placeholder="Type Name, Serial # (e.g. 105), or Admission #..." 
                autofocus
                autocomplete="off"
              >
              <button 
                id="btnClearSearch" 
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white hidden text-lg"
                title="Clear Search"
              >
                &times;
              </button>
            </div>

            <div class="sm:w-64 shrink-0">
              <select id="classFilterSelect" class="field py-3 text-sm w-full bg-slate-900/80 border-white/15 text-white rounded-xl">
                <option value="">All Classes (${allClasses.length})</option>
                ${allClasses.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5 flex-wrap gap-2">
            <span id="resultsCountLabel">Type in the search box to find your allocated room</span>
            <span class="text-slate-500 font-mono">${students.length} Registered Voters &bull; ${booths.length} Polling Booths</span>
          </div>
        </div>

        <!-- Results Display Container -->
        <div id="resultsContainer" class="space-y-4 min-h-[220px]">
          <!-- Populated dynamically via JS -->
        </div>

        <!-- Help & Verification Footer Note -->
        <div class="rounded-xl p-4 bg-slate-900/40 border border-white/5 text-xs text-slate-400 space-y-1 text-center sm:text-left">
          <div class="font-bold text-slate-300 flex items-center justify-center sm:justify-start gap-1.5">
            <span>ℹ️</span> <span>Important Voter Information</span>
          </div>
          <p>
            Please carry your original <strong>College Identity Card</strong>. Voters must report to the designated room corresponding to their class allotment.
          </p>
        </div>
      </main>
    </div>
  `;

  // Search logic setup
  const searchInput = container.querySelector('#boothSearchInput');
  const classSelect = container.querySelector('#classFilterSelect');
  const clearBtn = container.querySelector('#btnClearSearch');
  const countLabel = container.querySelector('#resultsCountLabel');
  const resultsContainer = container.querySelector('#resultsContainer');

  const updateSearch = () => {
    const rawQuery = (searchInput.value || '').trim();
    const query = rawQuery.toLowerCase();
    const selectedClass = (classSelect.value || '').trim();

    clearBtn.classList.toggle('hidden', rawQuery.length === 0);

    // Initial default prompt when user hasn't typed anything
    if (!query && !selectedClass) {
      countLabel.textContent = 'Enter search query or choose class above';
      resultsContainer.innerHTML = `
        <div class="glass rounded-2xl p-10 text-center space-y-3 border border-white/5">
          <div class="text-4xl text-slate-500">🏢</div>
          <h4 class="text-lg font-bold text-white">Find Your Polling Location</h4>
          <p class="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Enter your <strong>Name</strong>, <strong>Roll Serial Number</strong> (e.g. 154, D15, RS2), or <strong>Admission Number</strong> to view your exact room and venue.
          </p>
        </div>
      `;
      return;
    }

    // Filter students
    const matches = students.filter(s => {
      const name = String(s['NAME'] || s['name'] || '').toLowerCase();
      const sl = String(s['Nominal Roll Serial Number'] || s['serial_number'] || s['Sl'] || '').toLowerCase();
      const adm = String(s['ADMISION NO'] || s['ADMISSION NO'] || s['admission_no'] || '').toLowerCase();
      const cls = String(s['CLASS'] || s['class'] || '').trim();

      if (selectedClass && cls.toUpperCase() !== selectedClass.toUpperCase()) {
        return false;
      }

      if (!query) return true;

      // Exact or partial matches
      return name.includes(query) || 
             sl === query || 
             sl.includes(query) || 
             adm === query || 
             adm.includes(query) ||
             cls.toLowerCase().includes(query);
    });

    // Update count label
    if (matches.length === 0) {
      countLabel.innerHTML = `<span class="text-rose-400 font-semibold">0 students found</span> matching query`;
      resultsContainer.innerHTML = `
        <div class="glass rounded-2xl p-10 text-center space-y-3 border border-rose-500/20">
          <div class="text-4xl text-rose-400">🔍</div>
          <h4 class="text-lg font-bold text-white">No Matching Voters Found</h4>
          <p class="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            We could not find any elector matching <em>"${esc(rawQuery)}"</em>.
            Please verify the spelling of your name or try searching by your exact <strong>Admission Number</strong>.
          </p>
        </div>
      `;
      return;
    }

    const totalMatches = matches.length;
    const displayList = matches.slice(0, 30); // show top 30 for super fast rendering

    countLabel.innerHTML = `Found <strong class="text-white">${totalMatches}</strong> matching voter${totalMatches > 1 ? 's' : ''}${totalMatches > 30 ? ' (showing top 30)' : ''}`;

    // Render result cards
    resultsContainer.innerHTML = displayList.map(student => {
      const studentName = student['NAME'] || student['name'] || 'Elector';
      const slNo = student['Nominal Roll Serial Number'] || student['serial_number'] || student['Sl'] || '-';
      const admNo = student['ADMISION NO'] || student['ADMISSION NO'] || student['admission_no'] || '-';
      const className = student['CLASS'] || student['class'] || 'Unknown Class';
      const deptName = student['Dept'] || student['dept'] || student['department'] || '';

      // Find allotted booth
      const allottedBooth = booths.find(b => isStudentInBoothCheck(student, b.classes));
      const roomLocation = allottedBooth?.roomName ? allottedBooth.roomName.trim() : '';
      const boothNumber = allottedBooth?.boothNumber;

      return `
        <div class="glass rounded-2xl p-5 sm:p-6 border border-white/10 hover:border-indigo-500/30 transition shadow-lg space-y-4">
          <!-- Top Row: Student Identity & Subtle Booth Number Tag -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-lg sm:text-xl font-bold text-white tracking-tight">${esc(studentName)}</h3>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Sl #${esc(slNo)}
                </span>
              </div>
              <div class="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Adm No: <strong class="text-slate-300 font-mono">${esc(admNo)}</strong></span>
                <span>&bull;</span>
                <span class="text-slate-300 font-semibold">${esc(className)}</span>
                ${deptName ? `<span>(${esc(deptName)})</span>` : ''}
              </div>
            </div>

            <!-- SUBTLE / NON-PROMINENT BOOTH NUMBER BADGE -->
            <div class="shrink-0 pt-1 sm:pt-0">
              ${allottedBooth ? `
                <span class="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700/80 font-medium shadow-sm">
                  <span class="text-slate-400">🏢</span> <span>Booth ${esc(boothNumber)}</span>
                </span>
              ` : `
                <span class="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-medium">
                  <span>⏳</span> <span>Booth Pending</span>
                </span>
              `}
            </div>
          </div>

          <!-- HERO / PROMINENT ROOM / VENUE LOCATION -->
          ${allottedBooth && roomLocation ? `
            <div class="rounded-xl p-4 sm:p-5 bg-emerald-500/10 border-2 border-emerald-500/40 shadow-xl shadow-emerald-950/20 relative overflow-hidden group">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0 mt-0.5 shadow-inner">
                  📍
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 mb-0.5">
                    Allotted Polling Venue / Room
                  </div>
                  <div class="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug break-words">
                    ${esc(roomLocation)}
                  </div>
                  <div class="text-xs text-emerald-300/80 mt-1 flex items-center gap-2">
                    <span>Vote at Booth ${esc(boothNumber)}</span>
                    <span>&bull;</span>
                    <span>Room: ${esc(roomLocation)}</span>
                  </div>
                </div>
              </div>
            </div>
          ` : allottedBooth ? `
            <div class="rounded-xl p-4 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm">
              <div class="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                <span>📍</span> <span>Room Allocation in Progress</span>
              </div>
              <p>You are allotted to <strong>Booth ${esc(boothNumber)}</strong>. The specific room name is being assigned by the Returning Officer.</p>
            </div>
          ` : `
            <div class="rounded-xl p-4 bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs sm:text-sm">
              <div class="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                <span>⏳</span> <span>Class Booth Allocation Pending</span>
              </div>
              <p>Your class (<strong>${esc(className)}</strong>) has not yet been assigned to a physical booth. Please check back shortly or consult your department election official.</p>
            </div>
          `}
        </div>
      `;
    }).join('');

    if (totalMatches > 30) {
      resultsContainer.insertAdjacentHTML('beforeend', `
        <div class="p-4 rounded-xl glass border border-white/10 text-center text-xs text-slate-400">
          Showing 30 of ${totalMatches} matching voters. Refine your query with your specific Roll Serial Number or Admission Number to narrow down results.
        </div>
      `);
    }
  };

  // Event Listeners
  searchInput.addEventListener('input', updateSearch);
  classSelect.addEventListener('change', updateSearch);
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    updateSearch();
  });

  // Initial trigger
  updateSearch();
}
