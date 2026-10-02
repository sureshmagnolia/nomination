/**
 * pages/admin/officials.js
 * Comprehensive Election Officials & Team Builder
 * Manages Polling Booth Teams, Counting Table Teams, Faculty Seniority Roster, Exclusions, and Import/Export.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { DEFAULT_FACULTY_ROSTER } from '../../data/facultySeed.js';
import { DEFAULT_NON_TEACHING_ROSTER } from '../../data/nonTeachingSeed.js';
import * as XLSX from 'xlsx';

export async function renderAdminOfficials(container) {
  const pwd = getAdminPassword();
  if (!pwd) return;

  renderAdminLayout(container, 'officials', `
    <div class="text-center py-16">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 mt-4 text-sm font-medium">Loading Election Officials & Seniority Roster...</p>
    </div>
  `);

  try {
    const [officialsData, booths, settings] = await Promise.all([
      api.adminGetOfficials(pwd, true).catch(() => null),
      api.adminGetBooths(pwd, true).catch(() => []),
      api.adminGetSettings(pwd).catch(() => ({}))
    ]);

    renderOfficialsUI(container.querySelector('#adminMain'), pwd, officialsData, booths, settings);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderOfficialsUI(main, pwd, initialOfficialsData, initialBooths, settings) {
  const collegeName = settings?.collegeName || CONFIG.COLLEGE_NAME || 'Government Victoria College Palakkad';
  const electionYear = settings?.electionYear || new Date().getFullYear().toString();

  // 1. Initialize State with defaults or persisted data
  let faculty = [];
  if (initialOfficialsData && Array.isArray(initialOfficialsData.faculty) && initialOfficialsData.faculty.length > 0) {
    faculty = initialOfficialsData.faculty;
  } else {
    // Read from localStorage cache or seed default 92 faculty
    const cached = localStorage.getItem('gcc_faculty_roster');
    if (cached) {
      try { faculty = JSON.parse(cached); } catch (_) { faculty = [...DEFAULT_FACULTY_ROSTER]; }
    } else {
      faculty = [...DEFAULT_FACULTY_ROSTER];
    }
  }

  let nonTeaching = [];
  if (initialOfficialsData && Array.isArray(initialOfficialsData.nonTeaching) && initialOfficialsData.nonTeaching.length > 0) {
    nonTeaching = initialOfficialsData.nonTeaching;
  } else {
    const cachedNT = localStorage.getItem('gcc_non_teaching_roster');
    if (cachedNT) {
      try { nonTeaching = JSON.parse(cachedNT); } catch (_) { nonTeaching = [...DEFAULT_NON_TEACHING_ROSTER]; }
    } else {
      nonTeaching = [...DEFAULT_NON_TEACHING_ROSTER];
    }
  }

  // Ensure booths exist (fallback to 11 booths if not configured)
  let booths = Array.isArray(initialBooths) && initialBooths.length > 0 ? initialBooths : [];
  if (booths.length === 0) {
    booths = Array.from({ length: 11 }, (_, i) => ({ boothNumber: i + 1, roomName: `Booth ${i + 1}`, classes: [] }));
  }

  let pollingTeams = Array.isArray(initialOfficialsData?.pollingTeams) ? initialOfficialsData.pollingTeams : [];
  let countingTeams = Array.isArray(initialOfficialsData?.countingTeams) ? initialOfficialsData.countingTeams : [];

  // Active UI tab: 'polling' | 'counting' | 'roster'
  let activeTab = 'polling';
  let rosterSearch = '';
  let rosterFilter = 'all'; // 'all' | 'active' | 'excluded'

  // Helper: Get faculty by name or PEN
  const getFaculty = (identifier) => {
    if (!identifier) return null;
    return faculty.find(f => f.pen === identifier || f.name === identifier || `${f.name} (${f.pen})` === identifier);
  };

  // Helper: Check if faculty is on polling duty
  const getPollingAssignment = (fName) => {
    if (!fName) return null;
    for (const team of pollingTeams) {
      if (team.presidingOfficer?.name === fName) return { role: 'Presiding Officer', boothNumber: team.boothNumber };
      if (team.pollingOfficer1?.name === fName) return { role: 'Polling Officer 1', boothNumber: team.boothNumber };
      if (team.pollingOfficer2?.name === fName) return { role: 'Polling Officer 2', boothNumber: team.boothNumber };
    }
    return null;
  };

  // Helper: Check if faculty is on counting duty
  const getCountingAssignment = (fName) => {
    if (!fName) return null;
    for (const team of countingTeams) {
      if (team.supervisor?.name === fName) return { role: 'Counting Supervisor', tableNumber: team.tableNumber };
      if (team.countingOfficer1?.name === fName) return { role: 'Counting Officer 1', tableNumber: team.tableNumber };
      if (team.countingOfficer2?.name === fName) return { role: 'Counting Officer 2', tableNumber: team.tableNumber };
    }
    return null;
  };

  // Save changes to API & local cache
  const saveAll = async (quiet = false) => {
    localStorage.setItem('gcc_faculty_roster', JSON.stringify(faculty));
    localStorage.setItem('gcc_non_teaching_roster', JSON.stringify(nonTeaching));
    localStorage.setItem('gcc_polling_teams', JSON.stringify(pollingTeams));
    localStorage.setItem('gcc_counting_teams', JSON.stringify(countingTeams));

    try {
      await api.adminSaveOfficials(pwd, {
        faculty,
        nonTeaching,
        pollingTeams,
        countingTeams
      });
      if (!quiet) showToast('Officials and rosters saved successfully!', 'success');
    } catch (e) {
      if (!quiet) showToast(`Saved locally (Cloud sync failed: ${e.message})`, 'warning');
    }
  };

  // ─── Team Builder Algorithms ────────────────────────────────────────────────

  // Auto-allot Polling Teams
  const autoAllotPolling = () => {
    const numBooths = booths.length;
    if (numBooths === 0) {
      showToast('No polling booths configured.', 'error');
      return;
    }

    // Available, non-excluded faculty sorted by seniority rank (1 = seniormost)
    const availableFaculty = faculty
      .filter(f => !f.isExcluded)
      .sort((a, b) => a.seniority - b.seniority);

    const requiredFaculty = numBooths * 3;
    if (availableFaculty.length < requiredFaculty) {
      showToast(`Warning: Only ${availableFaculty.length} active faculty available for ${requiredFaculty} polling positions.`, 'warning');
    }

    const availableNT = nonTeaching.filter(nt => !nt.isExcluded);

    // 1. Top numBooths seniors -> Presiding Officers
    const presidingPool = availableFaculty.slice(0, numBooths);
    // 2. Next numBooths * 2 -> Polling Officers
    const pollingPool = availableFaculty.slice(numBooths, numBooths * 3);

    const newTeams = [];
    for (let i = 0; i < numBooths; i++) {
      const b = booths[i];
      const pOfficer = presidingPool[i] || null;
      const po1 = pollingPool[i * 2] || null;
      const po2 = pollingPool[i * 2 + 1] || null;
      const assistant = availableNT[i % (availableNT.length || 1)] || null;

      // Verify hierarchy: Presiding Officer must be strictly seniormost
      const teamFaculty = [pOfficer, po1, po2].filter(Boolean);
      teamFaculty.sort((a, b) => a.seniority - b.seniority);

      newTeams.push({
        boothNumber: b.boothNumber,
        roomName: b.roomName || `Booth ${b.boothNumber}`,
        presidingOfficer: teamFaculty[0] || null,
        pollingOfficer1: teamFaculty[1] || null,
        pollingOfficer2: teamFaculty[2] || null,
        pollingAssistant: assistant ? { name: assistant.name, designation: assistant.designation } : null
      });
    }

    pollingTeams = newTeams;
    saveAll(false);
    renderUI();
  };

  // Auto-allot Counting Teams
  const autoAllotCounting = (preferFresh = true) => {
    const numTables = booths.length;
    if (numTables === 0) {
      showToast('No counting tables configured.', 'error');
      return;
    }

    // Assigned polling faculty names
    const pollingAssignedNames = new Set();
    pollingTeams.forEach(t => {
      if (t.presidingOfficer?.name) pollingAssignedNames.add(t.presidingOfficer.name);
      if (t.pollingOfficer1?.name) pollingAssignedNames.add(t.pollingOfficer1.name);
      if (t.pollingOfficer2?.name) pollingAssignedNames.add(t.pollingOfficer2.name);
    });

    const activeFaculty = faculty.filter(f => !f.isExcluded).sort((a, b) => a.seniority - b.seniority);
    const freshFaculty = activeFaculty.filter(f => !pollingAssignedNames.has(f.name));

    let countingPool = [];
    if (preferFresh && freshFaculty.length >= numTables * 3) {
      // Complete fresh pool without double duty
      countingPool = freshFaculty;
    } else {
      // Use fresh faculty first, fill remaining with polling faculty
      countingPool = [...freshFaculty, ...activeFaculty.filter(f => pollingAssignedNames.has(f.name))];
    }

    const availableNT = nonTeaching.filter(nt => !nt.isExcluded);

    const supervisorPool = countingPool.slice(0, numTables);
    const officerPool = countingPool.slice(numTables, numTables * 3);

    const newCountingTeams = [];
    let doubleDutyCount = 0;

    for (let i = 0; i < numTables; i++) {
      const b = booths[i];
      const sup = supervisorPool[i] || null;
      const co1 = officerPool[i * 2] || null;
      const co2 = officerPool[i * 2 + 1] || null;
      const assistant = availableNT[(i + numTables) % (availableNT.length || 1)] || null;

      const teamFaculty = [sup, co1, co2].filter(Boolean);
      teamFaculty.sort((a, b) => a.seniority - b.seniority);

      teamFaculty.forEach(f => {
        if (pollingAssignedNames.has(f.name)) doubleDutyCount++;
      });

      newCountingTeams.push({
        tableNumber: b.boothNumber,
        roomName: b.roomName || `Table ${b.boothNumber}`,
        supervisor: teamFaculty[0] || null,
        countingOfficer1: teamFaculty[1] || null,
        countingOfficer2: teamFaculty[2] || null,
        countingAssistant: assistant ? { name: assistant.name, designation: assistant.designation } : null
      });
    }

    countingTeams = newCountingTeams;
    saveAll(false);
    if (doubleDutyCount > 0) {
      showToast(`Counting teams allotted with ${doubleDutyCount} double duty faculty members flagged.`, 'warning');
    } else {
      showToast('Counting teams allotted cleanly with 0 double duties!', 'success');
    }
    renderUI();
  };

  // ─── Render Main UI ─────────────────────────────────────────────────────────

  const renderUI = () => {
    // Calculate Summary Metrics
    const totalFaculty = faculty.length;
    const activeFaculty = faculty.filter(f => !f.isExcluded).length;
    const excludedFaculty = totalFaculty - activeFaculty;

    let pollingSlotsFilled = 0;
    pollingTeams.forEach(t => {
      if (t.presidingOfficer) pollingSlotsFilled++;
      if (t.pollingOfficer1) pollingSlotsFilled++;
      if (t.pollingOfficer2) pollingSlotsFilled++;
    });

    let countingSlotsFilled = 0;
    let doubleDutyCount = 0;
    const assignedPollingNames = new Set(
      pollingTeams.flatMap(t => [t.presidingOfficer?.name, t.pollingOfficer1?.name, t.pollingOfficer2?.name]).filter(Boolean)
    );

    countingTeams.forEach(t => {
      [t.supervisor, t.countingOfficer1, t.countingOfficer2].filter(Boolean).forEach(f => {
        countingSlotsFilled++;
        if (assignedPollingNames.has(f.name)) doubleDutyCount++;
      });
    });

    main.innerHTML = `
      <div class="page-enter space-y-6">
        <!-- Top Title and Action Bar -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print border-b border-white/10 pb-4">
          <div>
            <div class="flex items-center gap-3">
              <span class="text-3xl">👥</span>
              <div>
                <h3 class="text-xl font-bold text-white tracking-wide">Election Officials & Team Builder</h3>
                <p class="text-slate-400 text-xs">Assign Presiding Officers, Polling Officers, Counting Supervisors & Assistants based on Official Faculty Seniority.</p>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button id="btnSaveAll" class="btn btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold shadow">
              💾 Save All Changes
            </button>
            <a href="#/admin/booths" class="btn btn-secondary text-xs px-3 py-2 flex items-center gap-1">
              🏫 Go to Booths
            </a>
            <a href="#/admin/counting" class="btn btn-secondary text-xs px-3 py-2 flex items-center gap-1">
              🧮 Go to Counting
            </a>
          </div>
        </div>

        <!-- Metric Ribbon -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 no-print">
          <div class="glass p-3 rounded-xl border border-white/10 flex flex-col justify-between">
            <span class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Faculty Roster</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold text-white font-mono">${activeFaculty}</span>
              <span class="text-xs text-slate-400">/ ${totalFaculty} Total</span>
            </div>
            <span class="text-[10px] text-amber-300/80 mt-1">${excludedFaculty} excluded from duty</span>
          </div>

          <div class="glass p-3 rounded-xl border border-indigo-500/30 flex flex-col justify-between bg-indigo-950/20">
            <span class="text-[11px] uppercase tracking-wider text-indigo-300 font-semibold">Polling Teams</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold text-indigo-200 font-mono">${pollingSlotsFilled}</span>
              <span class="text-xs text-slate-400">/ ${booths.length * 3} Faculty</span>
            </div>
            <span class="text-[10px] text-indigo-400 mt-1">${booths.length} Booths configured</span>
          </div>

          <div class="glass p-3 rounded-xl border border-purple-500/30 flex flex-col justify-between bg-purple-950/20">
            <span class="text-[11px] uppercase tracking-wider text-purple-300 font-semibold">Counting Teams</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold text-purple-200 font-mono">${countingSlotsFilled}</span>
              <span class="text-xs text-slate-400">/ ${booths.length * 3} Faculty</span>
            </div>
            <span class="text-[10px] text-purple-400 mt-1">${booths.length} Counting Tables</span>
          </div>

          <div class="glass p-3 rounded-xl border ${doubleDutyCount > 0 ? 'border-amber-500/50 bg-amber-950/30' : 'border-emerald-500/30 bg-emerald-950/20'} flex flex-col justify-between">
            <span class="text-[11px] uppercase tracking-wider ${doubleDutyCount > 0 ? 'text-amber-300' : 'text-emerald-300'} font-semibold">Double Duty Alert</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold ${doubleDutyCount > 0 ? 'text-amber-200' : 'text-emerald-200'} font-mono">${doubleDutyCount}</span>
              <span class="text-xs text-slate-400">Staff Assigned</span>
            </div>
            <span class="text-[10px] ${doubleDutyCount > 0 ? 'text-amber-400' : 'text-emerald-400'} mt-1">${doubleDutyCount > 0 ? 'Serving Polling & Counting' : 'Clean Separation (0 Overlap)'}</span>
          </div>

          <div class="glass p-3 rounded-xl border border-white/10 flex flex-col justify-between">
            <span class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Reserves Available</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold text-emerald-400 font-mono">${Math.max(0, activeFaculty - (pollingSlotsFilled + (countingSlotsFilled - doubleDutyCount)))}</span>
              <span class="text-xs text-slate-400">Standby Faculty</span>
            </div>
            <span class="text-[10px] text-slate-400 mt-1">Ready for emergency relief</span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex border-b border-white/10 no-print gap-2">
          <button class="nav-tab px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'polling' ? 'border-indigo-500 text-indigo-300 bg-white/5' : 'border-transparent text-slate-400 hover:text-white'}" data-tab="polling">
            🏫 Polling Booth Teams (${booths.length})
          </button>
          <button class="nav-tab px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'counting' ? 'border-purple-500 text-purple-300 bg-white/5' : 'border-transparent text-slate-400 hover:text-white'}" data-tab="counting">
            🧮 Counting Table Teams (${booths.length})
            ${doubleDutyCount > 0 ? `<span class="bg-amber-500 text-black text-[10px] px-1.5 py-0.2 rounded-full font-bold">${doubleDutyCount}</span>` : ''}
          </button>
          <button class="nav-tab px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'roster' ? 'border-emerald-500 text-emerald-300 bg-white/5' : 'border-transparent text-slate-400 hover:text-white'}" data-tab="roster">
            📋 Faculty Seniority Roster (${faculty.length})
          </button>
        </div>

        <!-- Tab 1: Polling Booth Teams -->
        <div id="tabContent-polling" class="${activeTab === 'polling' ? '' : 'hidden'} space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3 bg-white/5 p-4 rounded-xl border border-white/10 no-print">
            <div>
              <h4 class="font-bold text-white text-base">Polling Booth Officials Allotment</h4>
              <p class="text-xs text-slate-400">Each polling booth requires 1 Presiding Officer (Seniormost faculty), 2 Polling Officers (Other faculty), and 1 Polling Assistant (Non-teaching staff).</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button id="btnAutoAllotPolling" class="btn btn-primary bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 flex items-center gap-1.5 shadow">
                ⚡ Auto-Allot Polling Teams
              </button>
              <button id="btnPrintPollingOrders" class="btn btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5">
                🖨️ Print Appointment Orders
              </button>
              <button id="btnClearPollingTeams" class="btn btn-secondary text-xs text-red-300 hover:text-red-200 hover:bg-red-500/20 px-3 py-2">
                🗑️ Clear All
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="pollingTeamsGrid">
            ${booths.map((b, idx) => {
              const team = pollingTeams.find(t => t.boothNumber === b.boothNumber) || {
                boothNumber: b.boothNumber,
                roomName: b.roomName || `Booth ${b.boothNumber}`,
                presidingOfficer: null,
                pollingOfficer1: null,
                pollingOfficer2: null,
                pollingAssistant: null
              };

              // Check hierarchy: is any Polling Officer more senior than the Presiding Officer?
              const pRank = team.presidingOfficer ? team.presidingOfficer.seniority : 999;
              const po1Rank = team.pollingOfficer1 ? team.pollingOfficer1.seniority : 999;
              const po2Rank = team.pollingOfficer2 ? team.pollingOfficer2.seniority : 999;
              const hierarchyViolation = (po1Rank < pRank) || (po2Rank < pRank);

              return `
                <div class="glass rounded-xl border ${hierarchyViolation ? 'border-amber-500/70 bg-amber-950/20' : 'border-white/10'} p-4 flex flex-col justify-between space-y-3 relative group" data-booth="${b.boothNumber}">
                  <div>
                    <div class="flex items-center justify-between pb-2.5 border-b border-white/10">
                      <div>
                        <span class="font-mono text-indigo-400 font-bold text-sm">Booth ${b.boothNumber}</span>
                        <h5 class="font-bold text-white text-base">${esc(b.roomName || `Booth ${b.boothNumber}`)}</h5>
                      </div>
                      <span class="text-[11px] font-mono bg-white/10 text-slate-300 px-2 py-0.5 rounded border border-white/10">
                        ${b.classes ? `${b.classes.length} classes` : ''}
                      </span>
                    </div>

                    ${hierarchyViolation ? `
                      <div class="mt-2.5 p-2 rounded bg-amber-500/20 border border-amber-500/40 text-[11px] text-amber-200 flex items-center justify-between gap-1">
                        <span>⚠️ Hierarchy Mismatch: Polling Officer is more senior than Presiding Officer!</span>
                        <button class="btn btn-secondary text-[10px] py-0.5 px-1.5 btn-fix-hierarchy-polling" data-booth="${b.boothNumber}">Swap</button>
                      </div>
                    ` : ''}

                    <div class="space-y-3 pt-3">
                      <!-- Presiding Officer -->
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                            <span>👑</span> Presiding Officer <span class="text-[10px] text-slate-400 font-normal">(Seniormost)</span>
                          </label>
                          ${team.presidingOfficer ? `<span class="text-[10px] font-mono text-amber-200 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">Rank #${team.presidingOfficer.seniority}</span>` : ''}
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-indigo-400 focus:outline-none select-polling-role" data-booth="${b.boothNumber}" data-role="presidingOfficer">
                          <option value="">-- Select Presiding Officer --</option>
                          ${faculty.map(f => {
                            const isAssignedElsewhere = getPollingAssignment(f.name) && getPollingAssignment(f.name).boothNumber !== b.boothNumber;
                            const isSelected = team.presidingOfficer?.name === f.name;
                            return `
                              <option value="${esc(f.name)}" ${isSelected ? 'selected' : ''} ${isAssignedElsewhere ? 'disabled' : ''}>
                                ${f.isExcluded ? '⛔ ' : ''}#${f.seniority} ${esc(f.name)} (${esc(f.designation)} · PEN:${f.pen}) ${isAssignedElsewhere ? `(Already in Booth ${getPollingAssignment(f.name).boothNumber})` : ''}
                              </option>
                            `;
                          }).join('')}
                        </select>
                      </div>

                      <!-- Polling Officer 1 -->
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                            <span>👤</span> Polling Officer 1
                          </label>
                          ${team.pollingOfficer1 ? `<span class="text-[10px] font-mono text-indigo-200 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">Rank #${team.pollingOfficer1.seniority}</span>` : ''}
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-indigo-400 focus:outline-none select-polling-role" data-booth="${b.boothNumber}" data-role="pollingOfficer1">
                          <option value="">-- Select Polling Officer 1 --</option>
                          ${faculty.map(f => {
                            const isAssignedElsewhere = getPollingAssignment(f.name) && getPollingAssignment(f.name).boothNumber !== b.boothNumber;
                            const isSelected = team.pollingOfficer1?.name === f.name;
                            return `
                              <option value="${esc(f.name)}" ${isSelected ? 'selected' : ''} ${isAssignedElsewhere ? 'disabled' : ''}>
                                ${f.isExcluded ? '⛔ ' : ''}#${f.seniority} ${esc(f.name)} (${esc(f.designation)} · PEN:${f.pen}) ${isAssignedElsewhere ? `(Already in Booth ${getPollingAssignment(f.name).boothNumber})` : ''}
                              </option>
                            `;
                          }).join('')}
                        </select>
                      </div>

                      <!-- Polling Officer 2 -->
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                            <span>👤</span> Polling Officer 2
                          </label>
                          ${team.pollingOfficer2 ? `<span class="text-[10px] font-mono text-indigo-200 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">Rank #${team.pollingOfficer2.seniority}</span>` : ''}
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-indigo-400 focus:outline-none select-polling-role" data-booth="${b.boothNumber}" data-role="pollingOfficer2">
                          <option value="">-- Select Polling Officer 2 --</option>
                          ${faculty.map(f => {
                            const isAssignedElsewhere = getPollingAssignment(f.name) && getPollingAssignment(f.name).boothNumber !== b.boothNumber;
                            const isSelected = team.pollingOfficer2?.name === f.name;
                            return `
                              <option value="${esc(f.name)}" ${isSelected ? 'selected' : ''} ${isAssignedElsewhere ? 'disabled' : ''}>
                                ${f.isExcluded ? '⛔ ' : ''}#${f.seniority} ${esc(f.name)} (${esc(f.designation)} · PEN:${f.pen}) ${isAssignedElsewhere ? `(Already in Booth ${getPollingAssignment(f.name).boothNumber})` : ''}
                              </option>
                            `;
                          }).join('')}
                        </select>
                      </div>

                      <!-- Polling Assistant (Non Teaching) -->
                      <div>
                        <label class="text-[11px] font-bold text-slate-300 flex items-center gap-1 mb-1">
                          <span>🤝</span> Polling Assistant <span class="text-[10px] text-slate-400 font-normal">(Non-Teaching)</span>
                        </label>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-indigo-400 focus:outline-none select-polling-assistant" data-booth="${b.boothNumber}">
                          <option value="">-- Select Non-Teaching Staff --</option>
                          ${nonTeaching.map(nt => `
                            <option value="${esc(nt.name)}" ${team.pollingAssistant?.name === nt.name ? 'selected' : ''}>
                              ${esc(nt.name)} (${esc(nt.designation)}${nt.pen ? ` · PEN:${nt.pen}` : ''})
                            </option>
                          `).join('')}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Tab 2: Counting Table Teams -->
        <div id="tabContent-counting" class="${activeTab === 'counting' ? '' : 'hidden'} space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3 bg-white/5 p-4 rounded-xl border border-white/10 no-print">
            <div>
              <h4 class="font-bold text-white text-base">Counting Table Officials Allotment</h4>
              <p class="text-xs text-slate-400">Each counting table requires 1 Counting Supervisor (Seniormost at table), 2 Counting Officers, and 1 Counting Assistant. Staff serving polling duty are flagged with double duty.</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button id="btnAutoAllotCountingFresh" class="btn btn-primary bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2 flex items-center gap-1.5 shadow">
                ⚡ Auto-Allot (Fresh Faculty First)
              </button>
              <button id="btnPrintCountingOrders" class="btn btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5">
                🖨️ Print Counting Orders
              </button>
              <button id="btnClearCountingTeams" class="btn btn-secondary text-xs text-red-300 hover:text-red-200 hover:bg-red-500/20 px-3 py-2">
                🗑️ Clear All
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="countingTeamsGrid">
            ${booths.map((b, idx) => {
              const team = countingTeams.find(t => t.tableNumber === b.boothNumber) || {
                tableNumber: b.boothNumber,
                roomName: b.roomName || `Table ${b.boothNumber}`,
                supervisor: null,
                countingOfficer1: null,
                countingOfficer2: null,
                countingAssistant: null
              };

              const supRank = team.supervisor ? team.supervisor.seniority : 999;
              const co1Rank = team.countingOfficer1 ? team.countingOfficer1.seniority : 999;
              const co2Rank = team.countingOfficer2 ? team.countingOfficer2.seniority : 999;
              const hierarchyViolation = (co1Rank < supRank) || (co2Rank < supRank);

              // Detect Double Duty on Table
              const supDouble = team.supervisor ? getPollingAssignment(team.supervisor.name) : null;
              const co1Double = team.countingOfficer1 ? getPollingAssignment(team.countingOfficer1.name) : null;
              const co2Double = team.countingOfficer2 ? getPollingAssignment(team.countingOfficer2.name) : null;
              const hasDoubleDuty = !!(supDouble || co1Double || co2Double);

              return `
                <div class="glass rounded-xl border ${hasDoubleDuty ? 'border-amber-500/50 bg-amber-950/20' : 'border-white/10'} p-4 flex flex-col justify-between space-y-3 relative group" data-table="${b.boothNumber}">
                  <div>
                    <div class="flex items-center justify-between pb-2.5 border-b border-white/10">
                      <div>
                        <span class="font-mono text-purple-400 font-bold text-sm">Counting Table ${b.boothNumber}</span>
                        <h5 class="font-bold text-white text-base">${esc(b.roomName || `Table ${b.boothNumber}`)}</h5>
                      </div>
                      ${hasDoubleDuty ? `
                        <span class="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                          ⚠️ Double Duty Flag
                        </span>
                      ` : `
                        <span class="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">Fresh Team</span>
                      `}
                    </div>

                    ${hierarchyViolation ? `
                      <div class="mt-2.5 p-2 rounded bg-amber-500/20 border border-amber-500/40 text-[11px] text-amber-200 flex items-center justify-between gap-1">
                        <span>⚠️ Hierarchy Mismatch: Counting Officer is more senior than Supervisor!</span>
                        <button class="btn btn-secondary text-[10px] py-0.5 px-1.5 btn-fix-hierarchy-counting" data-table="${b.boothNumber}">Swap</button>
                      </div>
                    ` : ''}

                    <div class="space-y-3 pt-3">
                      <!-- Counting Supervisor -->
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                            <span>👑</span> Counting Supervisor <span class="text-[10px] text-slate-400 font-normal">(Seniormost)</span>
                          </label>
                          ${team.supervisor ? `<span class="text-[10px] font-mono text-purple-200 bg-purple-500/20 px-1.5 py-0.2 rounded border border-purple-500/30">Rank #${team.supervisor.seniority}</span>` : ''}
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-purple-400 focus:outline-none select-counting-role" data-table="${b.boothNumber}" data-role="supervisor">
                          <option value="">-- Select Counting Supervisor --</option>
                          ${faculty.map(f => {
                            const pAssigned = getPollingAssignment(f.name);
                            const isSelected = team.supervisor?.name === f.name;
                            return `
                              <option value="${esc(f.name)}" ${isSelected ? 'selected' : ''}>
                                ${f.isExcluded ? '⛔ ' : ''}#${f.seniority} ${esc(f.name)} (${esc(f.designation)}) ${pAssigned ? `[⚠️ Double Duty: Booth ${pAssigned.boothNumber}]` : ''}
                              </option>
                            `;
                          }).join('')}
                        </select>
                        ${supDouble ? `<p class="text-[10px] text-amber-300 mt-1">⚠️ Double Duty: Serving at Polling Booth ${supDouble.boothNumber} (${supDouble.role})</p>` : ''}
                      </div>

                      <!-- Counting Officer 1 -->
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                            <span>👤</span> Counting Officer 1
                          </label>
                          ${team.countingOfficer1 ? `<span class="text-[10px] font-mono text-indigo-200 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">Rank #${team.countingOfficer1.seniority}</span>` : ''}
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-purple-400 focus:outline-none select-counting-role" data-table="${b.boothNumber}" data-role="countingOfficer1">
                          <option value="">-- Select Counting Officer 1 --</option>
                          ${faculty.map(f => {
                            const pAssigned = getPollingAssignment(f.name);
                            const isSelected = team.countingOfficer1?.name === f.name;
                            return `
                              <option value="${esc(f.name)}" ${isSelected ? 'selected' : ''}>
                                ${f.isExcluded ? '⛔ ' : ''}#${f.seniority} ${esc(f.name)} (${esc(f.designation)}) ${pAssigned ? `[⚠️ Double Duty: Booth ${pAssigned.boothNumber}]` : ''}
                              </option>
                            `;
                          }).join('')}
                        </select>
                        ${co1Double ? `<p class="text-[10px] text-amber-300 mt-1">⚠️ Double Duty: Serving at Polling Booth ${co1Double.boothNumber} (${co1Double.role})</p>` : ''}
                      </div>

                      <!-- Counting Officer 2 -->
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                            <span>👤</span> Counting Officer 2
                          </label>
                          ${team.countingOfficer2 ? `<span class="text-[10px] font-mono text-indigo-200 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">Rank #${team.countingOfficer2.seniority}</span>` : ''}
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-purple-400 focus:outline-none select-counting-role" data-table="${b.boothNumber}" data-role="countingOfficer2">
                          <option value="">-- Select Counting Officer 2 --</option>
                          ${faculty.map(f => {
                            const pAssigned = getPollingAssignment(f.name);
                            const isSelected = team.countingOfficer2?.name === f.name;
                            return `
                              <option value="${esc(f.name)}" ${isSelected ? 'selected' : ''}>
                                ${f.isExcluded ? '⛔ ' : ''}#${f.seniority} ${esc(f.name)} (${esc(f.designation)}) ${pAssigned ? `[⚠️ Double Duty: Booth ${pAssigned.boothNumber}]` : ''}
                              </option>
                            `;
                          }).join('')}
                        </select>
                        ${co2Double ? `<p class="text-[10px] text-amber-300 mt-1">⚠️ Double Duty: Serving at Polling Booth ${co2Double.boothNumber} (${co2Double.role})</p>` : ''}
                      </div>

                      <!-- Counting Assistant (Non Teaching) -->
                      <div>
                        <label class="text-[11px] font-bold text-slate-300 flex items-center gap-1 mb-1">
                          <span>🤝</span> Counting Assistant <span class="text-[10px] text-slate-400 font-normal">(Non-Teaching)</span>
                        </label>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-purple-400 focus:outline-none select-counting-assistant" data-table="${b.boothNumber}">
                          <option value="">-- Select Non-Teaching Staff --</option>
                          ${nonTeaching.map(nt => `
                            <option value="${esc(nt.name)}" ${team.countingAssistant?.name === nt.name ? 'selected' : ''}>
                              ${esc(nt.name)} (${esc(nt.designation)}${nt.pen ? ` · PEN:${nt.pen}` : ''})
                            </option>
                          `).join('')}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Tab 3: Faculty Seniority Roster & Exclusions -->
        <div id="tabContent-roster" class="${activeTab === 'roster' ? '' : 'hidden'} space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3 bg-white/5 p-4 rounded-xl border border-white/10 no-print">
            <div>
              <h4 class="font-bold text-white text-base">College Faculty Seniority List (${faculty.length} Faculty)</h4>
              <p class="text-xs text-slate-400">Manage teacher seniority, PEN numbers, and mark duty exclusions (Returning Officer, Medical Leave, etc.). You can import updated CSV / Excel files anytime.</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <label class="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 cursor-pointer flex items-center gap-1.5 shadow">
                📥 Import Excel / CSV
                <input type="file" id="fileRosterImport" accept=".xlsx,.xls,.csv" class="hidden" />
              </label>
              <button id="btnExportRoster" class="btn btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5">
                📤 Export Roster
              </button>
              <button id="btnResetToDefaultRoster" class="btn btn-secondary text-xs text-amber-300 hover:bg-amber-500/20 px-3 py-2">
                🔄 Reset to College Seed (92)
              </button>
            </div>
          </div>

          <!-- Search and Filter Bar -->
          <div class="flex items-center justify-between gap-3 flex-wrap no-print">
            <div class="flex-1 min-w-[240px]">
              <input type="text" id="inputRosterSearch" value="${esc(rosterSearch)}" placeholder="Search by name, PEN, designation..." class="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-400" />
            </div>
            <div class="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button class="filter-roster-btn px-3 py-1 rounded-lg font-semibold transition-colors ${rosterFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}" data-filter="all">All (${faculty.length})</button>
              <button class="filter-roster-btn px-3 py-1 rounded-lg font-semibold transition-colors ${rosterFilter === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}" data-filter="active">Active (${activeFaculty})</button>
              <button class="filter-roster-btn px-3 py-1 rounded-lg font-semibold transition-colors ${rosterFilter === 'excluded' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}" data-filter="excluded">Excluded (${excludedFaculty})</button>
            </div>
          </div>

          <!-- Roster Table -->
          <div class="glass rounded-xl overflow-hidden border border-white/10">
            <div class="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table class="data-table text-xs w-full">
                <thead class="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-white/10">
                  <tr>
                    <th class="w-16 text-center">Seniority #</th>
                    <th>Name</th>
                    <th>PEN</th>
                    <th>Designation</th>
                    <th>Joining Date</th>
                    <th>Assigned Duty</th>
                    <th>Duty Status</th>
                    <th class="text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  ${faculty
                    .filter(f => {
                      if (rosterFilter === 'active' && f.isExcluded) return false;
                      if (rosterFilter === 'excluded' && !f.isExcluded) return false;
                      if (rosterSearch) {
                        const s = rosterSearch.toLowerCase();
                        return (f.name || '').toLowerCase().includes(s) ||
                               String(f.pen || '').toLowerCase().includes(s) ||
                               (f.designation || '').toLowerCase().includes(s);
                      }
                      return true;
                    })
                    .map(f => {
                      const pDuty = getPollingAssignment(f.name);
                      const cDuty = getCountingAssignment(f.name);

                      return `
                        <tr class="${f.isExcluded ? 'bg-red-950/20 opacity-70' : 'hover:bg-white/5'} transition-colors">
                          <td class="text-center font-mono font-bold ${f.seniority <= 15 ? 'text-amber-300' : 'text-slate-300'}">
                            #${f.seniority}
                          </td>
                          <td class="font-bold text-white whitespace-nowrap">
                            ${esc(f.name)}
                          </td>
                          <td class="font-mono text-slate-300">
                            ${f.pen || '–'}
                          </td>
                          <td class="text-slate-300">
                            ${esc(f.designation || '–')}
                          </td>
                          <td class="font-mono text-slate-400">
                            ${f.joiningDate || '–'}
                          </td>
                          <td>
                            <div class="flex items-center gap-1.5 flex-wrap">
                              ${pDuty ? `<span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">Booth ${pDuty.boothNumber} (${pDuty.role})</span>` : ''}
                              ${cDuty ? `<span class="badge bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold">Table ${cDuty.tableNumber} (${cDuty.role})</span>` : ''}
                              ${!pDuty && !cDuty ? `<span class="text-slate-500 text-[11px]">–</span>` : ''}
                            </div>
                          </td>
                          <td>
                            ${f.isExcluded ? `
                              <span class="badge bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold" title="${esc(f.exclusionReason || 'Excluded')}">
                                ⛔ Excluded${f.exclusionReason ? `: ${esc(f.exclusionReason)}` : ''}
                              </span>
                            ` : `
                              <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                                ✓ Available
                              </span>
                            `}
                          </td>
                          <td class="text-right">
                            <button class="btn btn-secondary text-[11px] py-1 px-2.5 btn-toggle-exclude ${f.isExcluded ? 'text-emerald-300 hover:text-emerald-200' : 'text-red-300 hover:text-red-200'}" data-pen="${f.pen || f.name}">
                              ${f.isExcluded ? '✓ Make Available' : '⛔ Exclude'}
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Printable Appointment Orders Container (Hidden until print) -->
        <div id="printOrdersContainer" class="hidden print:block"></div>
      </div>
    `;

    bindEvents();
  };

  // ─── Event Bindings ─────────────────────────────────────────────────────────

  const bindEvents = () => {
    // Tab switching
    main.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        activeTab = e.currentTarget.dataset.tab;
        renderUI();
      });
    });

    // Save All
    main.querySelector('#btnSaveAll')?.addEventListener('click', async () => {
      const btn = main.querySelector('#btnSaveAll');
      setLoading(btn, true, '💾 Saving...');
      await saveAll(false);
      setLoading(btn, false, '💾 Save All Changes');
    });

    // Polling Auto-Allot
    main.querySelector('#btnAutoAllotPolling')?.addEventListener('click', () => {
      if (confirm('⚡ Auto-Allot Polling Teams?\n\nThis will assign the seniormost available faculty as Presiding Officers, followed by Polling Officers 1 & 2 for all booths based on the official Seniority List.\n\nProceed?')) {
        autoAllotPolling();
      }
    });

    // Clear Polling Teams
    main.querySelector('#btnClearPollingTeams')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all Polling Booth official assignments?')) {
        pollingTeams = [];
        saveAll(false);
        renderUI();
      }
    });

    // Counting Auto-Allot
    main.querySelector('#btnAutoAllotCountingFresh')?.addEventListener('click', () => {
      if (confirm('⚡ Auto-Allot Counting Teams?\n\nThis will prioritize FRESH faculty members who are not assigned to Polling Duty. If fresh faculty is insufficient, remaining slots will be filled with polling staff with Double Duty flags.\n\nProceed?')) {
        autoAllotCounting(true);
      }
    });

    // Clear Counting Teams
    main.querySelector('#btnClearCountingTeams')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all Counting Table official assignments?')) {
        countingTeams = [];
        saveAll(false);
        renderUI();
      }
    });

    // Change Polling Officer Dropdown
    main.querySelectorAll('.select-polling-role').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const boothNum = parseInt(e.target.dataset.booth, 10);
        const role = e.target.dataset.role;
        const selectedName = e.target.value;

        let team = pollingTeams.find(t => t.boothNumber === boothNum);
        if (!team) {
          team = { boothNumber: boothNum, roomName: `Booth ${boothNum}`, presidingOfficer: null, pollingOfficer1: null, pollingOfficer2: null, pollingAssistant: null };
          pollingTeams.push(team);
        }

        const selectedFac = selectedName ? getFaculty(selectedName) : null;
        team[role] = selectedFac;
        saveAll(true);
        renderUI();
      });
    });

    // Change Polling Assistant Dropdown
    main.querySelectorAll('.select-polling-assistant').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const boothNum = parseInt(e.target.dataset.booth, 10);
        const selectedName = e.target.value;
        let team = pollingTeams.find(t => t.boothNumber === boothNum);
        if (!team) {
          team = { boothNumber: boothNum, roomName: `Booth ${boothNum}`, presidingOfficer: null, pollingOfficer1: null, pollingOfficer2: null, pollingAssistant: null };
          pollingTeams.push(team);
        }
        const nt = nonTeaching.find(n => n.name === selectedName);
        team.pollingAssistant = nt ? { name: nt.name, designation: nt.designation } : null;
        saveAll(true);
      });
    });

    // Swap / Fix Hierarchy for Polling Booth
    main.querySelectorAll('.btn-fix-hierarchy-polling').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const boothNum = parseInt(e.currentTarget.dataset.booth, 10);
        const team = pollingTeams.find(t => t.boothNumber === boothNum);
        if (!team) return;

        const teamFaculty = [team.presidingOfficer, team.pollingOfficer1, team.pollingOfficer2].filter(Boolean);
        teamFaculty.sort((a, b) => a.seniority - b.seniority);

        team.presidingOfficer = teamFaculty[0] || null;
        team.pollingOfficer1 = teamFaculty[1] || null;
        team.pollingOfficer2 = teamFaculty[2] || null;

        showToast(`Booth ${boothNum} hierarchy fixed: Seniormost is now Presiding Officer!`, 'success');
        saveAll(false);
        renderUI();
      });
    });

    // Change Counting Role Dropdown
    main.querySelectorAll('.select-counting-role').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const tableNum = parseInt(e.target.dataset.table, 10);
        const role = e.target.dataset.role;
        const selectedName = e.target.value;

        let team = countingTeams.find(t => t.tableNumber === tableNum);
        if (!team) {
          team = { tableNumber: tableNum, roomName: `Table ${tableNum}`, supervisor: null, countingOfficer1: null, countingOfficer2: null, countingAssistant: null };
          countingTeams.push(team);
        }

        const selectedFac = selectedName ? getFaculty(selectedName) : null;
        team[role] = selectedFac;
        saveAll(true);
        renderUI();
      });
    });

    // Change Counting Assistant Dropdown
    main.querySelectorAll('.select-counting-assistant').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const tableNum = parseInt(e.target.dataset.table, 10);
        const selectedName = e.target.value;
        let team = countingTeams.find(t => t.tableNumber === tableNum);
        if (!team) {
          team = { tableNumber: tableNum, roomName: `Table ${tableNum}`, supervisor: null, countingOfficer1: null, countingOfficer2: null, countingAssistant: null };
          countingTeams.push(team);
        }
        const nt = nonTeaching.find(n => n.name === selectedName);
        team.countingAssistant = nt ? { name: nt.name, designation: nt.designation } : null;
        saveAll(true);
      });
    });

    // Fix Hierarchy for Counting Table
    main.querySelectorAll('.btn-fix-hierarchy-counting').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tableNum = parseInt(e.currentTarget.dataset.table, 10);
        const team = countingTeams.find(t => t.tableNumber === tableNum);
        if (!team) return;

        const teamFaculty = [team.supervisor, team.countingOfficer1, team.countingOfficer2].filter(Boolean);
        teamFaculty.sort((a, b) => a.seniority - b.seniority);

        team.supervisor = teamFaculty[0] || null;
        team.countingOfficer1 = teamFaculty[1] || null;
        team.countingOfficer2 = teamFaculty[2] || null;

        showToast(`Table ${tableNum} hierarchy fixed: Seniormost is now Counting Supervisor!`, 'success');
        saveAll(false);
        renderUI();
      });
    });

    // Roster Search and Filter
    main.querySelector('#inputRosterSearch')?.addEventListener('input', (e) => {
      rosterSearch = e.target.value;
      renderUI();
    });

    main.querySelectorAll('.filter-roster-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        rosterFilter = e.currentTarget.dataset.filter;
        renderUI();
      });
    });

    // Toggle Exclude
    main.querySelectorAll('.btn-toggle-exclude').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pen = e.currentTarget.dataset.pen;
        const target = faculty.find(f => String(f.pen) === pen || f.name === pen);
        if (!target) return;

        if (target.isExcluded) {
          target.isExcluded = false;
          target.exclusionReason = '';
          showToast(`${target.name} is now Available for election duty.`, 'success');
        } else {
          const reason = prompt(`Enter reason for excluding ${target.name} from election duty:\n(e.g., Returning Officer, ARO, Medical Leave, Observer, On Deputation):`, 'Returning Officer / Official Duty');
          if (reason !== null) {
            target.isExcluded = true;
            target.exclusionReason = reason.trim() || 'Official Duty';
            showToast(`${target.name} excluded from duty (${target.exclusionReason}).`, 'info');
          }
        }
        saveAll(false);
        renderUI();
      });
    });

    // Reset to Default College Roster
    main.querySelector('#btnResetToDefaultRoster')?.addEventListener('click', () => {
      if (confirm('🔄 Reset Faculty Seniority List to original college seed (92 Teachers)?\n\nThis will restore the original names, PENs, and designations from SENIORITY LIST OF TEACHERS.xlsx.')) {
        faculty = [...DEFAULT_FACULTY_ROSTER];
        saveAll(false);
        showToast('Restored 92 faculty members from original college seniority list!', 'success');
        renderUI();
      }
    });

    // Export Roster (CSV)
    main.querySelector('#btnExportRoster')?.addEventListener('click', () => {
      const rows = [
        ['Seniority', 'Name', 'PEN', 'Designation', 'Joining Date', 'Status', 'Exclusion Reason', 'Polling Duty', 'Counting Duty']
      ];
      faculty.forEach(f => {
        const p = getPollingAssignment(f.name);
        const c = getCountingAssignment(f.name);
        rows.push([
          f.seniority,
          f.name,
          f.pen,
          f.designation,
          f.joiningDate,
          f.isExcluded ? 'Excluded' : 'Available',
          f.exclusionReason || '',
          p ? `Booth ${p.boothNumber} (${p.role})` : '',
          c ? `Table ${c.tableNumber} (${c.role})` : ''
        ]);
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Faculty_Seniority_Election_Roster_${electionYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    // Import Excel / CSV
    main.querySelector('#fileRosterImport')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          if (!jsonRows || jsonRows.length < 2) {
            showToast('Invalid or empty spreadsheet format.', 'error');
            return;
          }

          // Search for row with headers or parse rows
          let headerIdx = -1;
          for (let r = 0; r < Math.min(10, jsonRows.length); r++) {
            const rowStr = (jsonRows[r] || []).map(c => String(c).toLowerCase()).join(' ');
            if (rowStr.includes('name') || rowStr.includes('sl') || rowStr.includes('seniority') || rowStr.includes('pen')) {
              headerIdx = r;
              break;
            }
          }

          const parsedFaculty = [];
          const startR = headerIdx >= 0 ? headerIdx + 1 : 2;

          for (let r = startR; r < jsonRows.length; r++) {
            const row = jsonRows[r];
            if (!row || row.length === 0) continue;

            const sl = row[0] !== undefined ? parseInt(row[0], 10) : parsedFaculty.length + 1;
            const name = row[1] !== undefined ? String(row[1]).trim() : '';
            if (!name || name.toLowerCase().includes('seniority') || name.toLowerCase().includes('college')) continue;

            const pen = row[2] !== undefined ? String(row[2]).trim() : '';
            const desig = row[3] !== undefined ? String(row[3]).trim() : 'Assistant Professor';
            let dt = row[4] !== undefined ? String(row[4]).trim() : '';

            parsedFaculty.push({
              seniority: isNaN(sl) ? parsedFaculty.length + 1 : sl,
              name: name,
              pen: pen,
              designation: desig,
              joiningDate: dt,
              isExcluded: false,
              exclusionReason: ''
            });
          }

          if (parsedFaculty.length === 0) {
            showToast('No faculty rows could be parsed. Check column layout.', 'error');
            return;
          }

          if (confirm(`📥 Successfully parsed ${parsedFaculty.length} faculty records from "${file.name}".\n\nReplace current faculty roster with this list?`)) {
            faculty = parsedFaculty;
            saveAll(false);
            showToast(`Imported ${parsedFaculty.length} faculty records!`, 'success');
            renderUI();
          }
        } catch (err) {
          showToast(`Import error: ${err.message}`, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    });

    // Print Polling Orders
    main.querySelector('#btnPrintPollingOrders')?.addEventListener('click', () => {
      printDutyOrders('polling');
    });

    // Print Counting Orders
    main.querySelector('#btnPrintCountingOrders')?.addEventListener('click', () => {
      printDutyOrders('counting');
    });
  };

  // ─── Duty Orders Printer ───────────────────────────────────────────────────

  const printDutyOrders = (type) => {
    const isPolling = type === 'polling';
    const title = isPolling ? 'ORDER OF APPOINTMENT OF POLLING PERSONNEL' : 'ORDER OF APPOINTMENT OF COUNTING PERSONNEL';
    const subTitle = isPolling ? 'COLLEGE UNION ELECTION – POLLING DUTY ROSTER' : 'COLLEGE UNION ELECTION – COUNTING DUTY ROSTER';

    const printHtml = `
      <div class="print-page p-8 max-w-4xl mx-auto bg-white text-black font-sans text-xs">
        <style>
          @media print {
            body * { visibility: hidden; }
            #printOrdersContainer, #printOrdersContainer * { visibility: visible; }
            #printOrdersContainer { position: absolute; left: 0; top: 0; width: 100%; }
            .print-page { padding: 20px; page-break-after: always; }
          }
        </style>

        <!-- Header -->
        <div class="text-center border-b-2 border-black pb-3 mb-4">
          <h2 class="text-base font-bold uppercase tracking-wider">${esc(collegeName)}</h2>
          <h3 class="text-sm font-bold uppercase mt-0.5">${esc(title)}</h3>
          <p class="text-[11px] font-semibold text-slate-700 mt-0.5">${esc(subTitle)} · ${esc(electionYear)}</p>
        </div>

        <div class="flex justify-between items-center text-[11px] font-mono mb-4">
          <span>Order No: GCC/ELEC/${electionYear}/${isPolling ? 'POLL' : 'COUNT'}-01</span>
          <span>Date: ${new Date().toLocaleDateString('en-GB')}</span>
        </div>

        <p class="text-[11px] leading-relaxed mb-4 text-justify">
          In exercise of powers vested with the Returning Officer for the conduct of College Union Election ${esc(electionYear)}, 
          the following members of teaching and non-teaching staff are hereby appointed for <strong>${isPolling ? 'Polling Duty' : 'Counting Duty'}</strong> 
          at the venues specified below. Officials are requested to report for duty strictly on schedule 
          (${isPolling ? '8:30 AM on Polling Day' : '1:30 PM on Counting Day'}) without fail.
        </p>

        <!-- Roster Table -->
        <table class="w-full border-collapse border border-black text-[11px] mb-6">
          <thead>
            <tr class="bg-gray-100 font-bold border-b border-black">
              <th class="border border-black p-1.5 w-14 text-center">${isPolling ? 'Booth #' : 'Table #'}</th>
              <th class="border border-black p-1.5 w-24">Room / Venue</th>
              <th class="border border-black p-1.5 w-28 text-left">${isPolling ? 'Presiding Officer' : 'Counting Supervisor'}</th>
              <th class="border border-black p-1.5 text-left">${isPolling ? 'Polling Officer 1' : 'Counting Officer 1'}</th>
              <th class="border border-black p-1.5 text-left">${isPolling ? 'Polling Officer 2' : 'Counting Officer 2'}</th>
              <th class="border border-black p-1.5 text-left">${isPolling ? 'Polling Assistant' : 'Counting Assistant'}</th>
              <th class="border border-black p-1.5 w-20 text-center">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${(isPolling ? pollingTeams : countingTeams).map((t, i) => {
              const head = isPolling ? t.presidingOfficer : t.supervisor;
              const o1 = isPolling ? t.pollingOfficer1 : t.countingOfficer1;
              const o2 = isPolling ? t.pollingOfficer2 : t.countingOfficer2;
              const asst = isPolling ? t.pollingAssistant : t.countingAssistant;

              return `
                <tr class="border-b border-black">
                  <td class="border border-black p-1.5 text-center font-bold font-mono">
                    ${isPolling ? t.boothNumber : t.tableNumber}
                  </td>
                  <td class="border border-black p-1.5 font-semibold">
                    ${esc(t.roomName || (isPolling ? `Booth ${t.boothNumber}` : `Table ${t.tableNumber}`))}
                  </td>
                  <td class="border border-black p-1.5">
                    <strong>${esc(head?.name || '–')}</strong><br>
                    <span class="text-[10px] text-gray-700">${esc(head?.designation || '')}${head?.pen ? ` · PEN:${head.pen}` : ''}</span>
                  </td>
                  <td class="border border-black p-1.5">
                    <strong>${esc(o1?.name || '–')}</strong><br>
                    <span class="text-[10px] text-gray-700">${esc(o1?.designation || '')}${o1?.pen ? ` · PEN:${o1.pen}` : ''}</span>
                  </td>
                  <td class="border border-black p-1.5">
                    <strong>${esc(o2?.name || '–')}</strong><br>
                    <span class="text-[10px] text-gray-700">${esc(o2?.designation || '')}${o2?.pen ? ` · PEN:${o2.pen}` : ''}</span>
                  </td>
                  <td class="border border-black p-1.5">
                    ${esc(asst?.name || '–')}<br>
                    <span class="text-[10px] text-gray-700">${esc(asst?.designation || '')}</span>
                  </td>
                  <td class="border border-black p-1.5"></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Signatures & Statutory Footer -->
        <div class="mt-8 flex justify-between items-end pt-4">
          <div class="text-[10px] text-gray-600">
            <p>Copy forwarded for compliance to:</p>
            <p>1. All Appointed Officials</p>
            <p>2. Principal's Table / Guard File</p>
            <p>3. Notice Board</p>
          </div>
          <div class="text-center">
            <div class="w-40 border-b border-black mb-1"></div>
            <p class="font-bold text-[11px] uppercase">Returning Officer</p>
            <p class="text-[10px]">${esc(collegeName)}</p>
          </div>
        </div>
      </div>
    `;

    const printContainer = main.querySelector('#printOrdersContainer');
    if (printContainer) {
      printContainer.innerHTML = printHtml;
      printContainer.classList.remove('hidden');
      window.print();
      setTimeout(() => printContainer.classList.add('hidden'), 1000);
    }
  };

  renderUI();
}
