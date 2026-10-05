/**
 * pages/admin/officials.js
 * Comprehensive Election Officials & Team Builder
 * Manages Polling Booth Teams, Counting Table Teams, Faculty Seniority Roster,
 * Separate Non-Teaching Staff Roster (with dedicated Excel/CSV import), Exclusions, and Duty Orders.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { DEFAULT_FACULTY_ROSTER } from '../../data/facultySeed.js';
import { DEFAULT_NON_TEACHING_ROSTER } from '../../data/nonTeachingSeed.js';
import * as XLSX from 'xlsx';

/**
 * Normalizes department names to standard Title Case and auto-corrects common typos (e.g., 'Botony' -> 'Botany').
 * Designed to be generic across all colleges.
 */
export function normalizeDepartment(dept) {
  if (!dept) return '';
  const d = String(dept).trim();
  const map = {
    'botony': 'Botany',
    'botany': 'Botany',
    'chemestry': 'Chemistry',
    'chemistry': 'Chemistry',
    'maths': 'Mathematics',
    'mathamatics': 'Mathematics',
    'mathematics': 'Mathematics',
    'phisics': 'Physics',
    'physics': 'Physics',
    'zology': 'Zoology',
    'zoology': 'Zoology',
    'statstics': 'Statistics',
    'statistics': 'Statistics',
    'philosofy': 'Philosophy',
    'philosophy': 'Philosophy',
    'malayalam': 'Malayalam',
    'malayam': 'Malayalam',
    'economics': 'Economics',
    'economcs': 'Economics',
    'commerce': 'Commerce',
    'english': 'English',
    'history': 'History',
    'tamil': 'Tamil',
    'hindi': 'Hindi',
    'arabic': 'Arabic',
    'sanskrit': 'Sanskrit',
    'geography': 'Geography',
    'psychology': 'Psychology',
    'physical education': 'Physical Education',
    'computer science': 'Computer Science',
    'electronics': 'Electronics',
    'music': 'Music',
    'political science': 'Political Science'
  };
  const clean = d.toLowerCase().replace(/^(department of|dept of|dept\.? of)\s+/i, '').trim();
  return map[clean] || d;
}

/**
 * Formats Excel dates (Date objects, Excel serial numbers, or raw strings) to YYYY-MM-DD.
 */
function formatExcelDate(val) {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val)) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof val === 'number' && val > 10000 && val < 60000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d)) {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return String(val).trim();
}

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
    const [officialsData, booths, settings, nominalRoll] = await Promise.all([
      api.adminGetOfficials(pwd, true).catch(() => null),
      api.adminGetBooths(pwd, true).catch(() => []),
      api.adminGetSettings(pwd).catch(() => ({})),
      api.getNominalRoll().catch(() => [])
    ]);

    renderOfficialsUI(container.querySelector('#adminMain'), pwd, officialsData, booths, settings, nominalRoll || []);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderOfficialsUI(main, pwd, initialOfficialsData, initialBooths, settings, nominalRoll = []) {
  const collegeName = settings?.collegeName || CONFIG.COLLEGE_NAME || 'Government Victoria College Palakkad';
  const electionYear = settings?.electionYear || new Date().getFullYear().toString();
  const collegeLogo = settings?.collegeLogo || '';
  const collegeShortName = settings?.collegeShortName || CONFIG.COLLEGE_SHORT_NAME || 'GCC';

  // 1. Initialize State with saved data or clean empty defaults
  let faculty = [];
  const cachedFac = localStorage.getItem('gcc_faculty_roster');
  if (cachedFac !== null) {
    try { faculty = JSON.parse(cachedFac); } catch (_) { faculty = []; }
  } else if (initialOfficialsData && Array.isArray(initialOfficialsData.faculty)) {
    faculty = initialOfficialsData.faculty;
  } else {
    faculty = Array.isArray(DEFAULT_FACULTY_ROSTER) ? [...DEFAULT_FACULTY_ROSTER] : [];
    localStorage.setItem('gcc_faculty_roster', JSON.stringify(faculty));
  }

  let nonTeaching = [];
  const cachedNT = localStorage.getItem('gcc_non_teaching_roster');
  if (cachedNT !== null) {
    try { nonTeaching = JSON.parse(cachedNT); } catch (_) { nonTeaching = []; }
  } else if (initialOfficialsData && Array.isArray(initialOfficialsData.nonTeaching)) {
    nonTeaching = initialOfficialsData.nonTeaching;
  } else {
    nonTeaching = Array.isArray(DEFAULT_NON_TEACHING_ROSTER) ? [...DEFAULT_NON_TEACHING_ROSTER] : [];
    localStorage.setItem('gcc_non_teaching_roster', JSON.stringify(nonTeaching));
  }

  // Auto-sanitize department names across loaded rosters (corrects typos like 'Botony' -> 'Botany' generically)
  faculty.forEach(f => {
    if (f.department) f.department = normalizeDepartment(f.department);
  });
  nonTeaching.forEach(nt => {
    if (nt.department) nt.department = normalizeDepartment(nt.department);
  });

  // Ensure migration flag is set so legacy hardcoded migrations never overwrite user rosters
  localStorage.setItem('gcc_roster_migrated_v2', 'true');

  // Voter count calculation per booth from Nominal Roll
  const getStudentClassKey = (s) => {
    const c = String(s['CLASS'] || s['Class'] || 'Unknown').trim();
    const dept = String(s['Dept'] || s['Department'] || 'Unknown').trim();
    const upper = c.toUpperCase();
    if (upper.includes('RESEARCH') || upper.includes('SCHOLAR') || upper.includes('PH.D') || upper.includes('PHD')) {
      return `RESEARCH SCHOLAR - ${dept}`;
    }
    return c;
  };

  const isStudentInBooth = (s, boothClasses) => {
    if (!boothClasses || !boothClasses.length) return false;
    const key = getStudentClassKey(s);
    const raw = String(s['CLASS'] || s['Class'] || '').trim();
    return boothClasses.includes(key) || boothClasses.includes(raw);
  };

  const getBoothVoterCount = (b) => {
    if (Array.isArray(nominalRoll) && nominalRoll.length > 0 && Array.isArray(b.classes) && b.classes.length > 0) {
      return nominalRoll.filter(s => isStudentInBooth(s, b.classes)).length;
    }
    return b.totalVoters || b.voterCount || b.voters || 0;
  };

  // Ensure booths exist (fallback to 11 booths if not configured)
  let booths = Array.isArray(initialBooths) && initialBooths.length > 0 ? initialBooths : [];
  if (booths.length === 0) {
    booths = Array.from({ length: 11 }, (_, i) => ({ boothNumber: i + 1, roomName: `Booth ${i + 1}`, classes: [] }));
  }

  let pollingTeams = [];
  const cachedPoll = localStorage.getItem('gcc_polling_teams');
  if (cachedPoll !== null) {
    try { pollingTeams = JSON.parse(cachedPoll); } catch (_) { pollingTeams = []; }
  } else if (Array.isArray(initialOfficialsData?.pollingTeams)) {
    pollingTeams = initialOfficialsData.pollingTeams;
    localStorage.setItem('gcc_polling_teams', JSON.stringify(pollingTeams));
  }

  let countingTeams = [];
  const cachedCount = localStorage.getItem('gcc_counting_teams');
  if (cachedCount !== null) {
    try { countingTeams = JSON.parse(cachedCount); } catch (_) { countingTeams = []; }
  } else if (Array.isArray(initialOfficialsData?.countingTeams)) {
    countingTeams = initialOfficialsData.countingTeams;
    localStorage.setItem('gcc_counting_teams', JSON.stringify(countingTeams));
  }

  let observers = [];
  const cachedObs = localStorage.getItem('gcc_election_observers');
  if (cachedObs !== null) {
    try { observers = JSON.parse(cachedObs); } catch (_) { observers = []; }
  } else if (Array.isArray(initialOfficialsData?.observers)) {
    observers = initialOfficialsData.observers;
    localStorage.setItem('gcc_election_observers', JSON.stringify(observers));
  }

  const isObserver = (name) => {
    if (!name) return false;
    return observers.some(o => o.name === name);
  };

  let disciplineCharge = [];
  const cachedDisc = localStorage.getItem('gcc_election_discipline');
  if (cachedDisc !== null) {
    try { disciplineCharge = JSON.parse(cachedDisc); } catch (_) { disciplineCharge = []; }
  } else if (Array.isArray(initialOfficialsData?.disciplineCharge)) {
    disciplineCharge = initialOfficialsData.disciplineCharge;
    localStorage.setItem('gcc_election_discipline', JSON.stringify(disciplineCharge));
  }

  const isDiscipline = (name) => {
    if (!name) return false;
    const clean = String(name).trim().toLowerCase();
    return disciplineCharge.some(d => String(d.name || '').trim().toLowerCase() === clean);
  };

  let grievanceCell = [];
  const cachedGriev = localStorage.getItem('gcc_election_grievance');
  if (cachedGriev !== null) {
    try { grievanceCell = JSON.parse(cachedGriev); } catch (_) { grievanceCell = []; }
  } else if (Array.isArray(initialOfficialsData?.grievanceCell)) {
    grievanceCell = initialOfficialsData.grievanceCell;
    localStorage.setItem('gcc_election_grievance', JSON.stringify(grievanceCell));
  }

  const isGrievance = (name) => {
    if (!name) return false;
    const clean = String(name).trim().toLowerCase();
    return grievanceCell.some(g => String(g.name || '').trim().toLowerCase() === clean);
  };

  // Active UI state
  let activeTab = 'polling'; // 'polling' | 'counting' | 'faculty' | 'nonteaching'
  let facultySearch = '';
  let facultyFilter = 'all'; // 'all' | 'active' | 'excluded'
  let nonTeachingSearch = '';
  let nonTeachingFilter = 'all'; // 'all' | 'active' | 'excluded'

  // Helper: Classification predicates
  const isLibrarian = (f) => {
    if (!f) return false;
    const d = (f.designation || '').toLowerCase();
    const dept = (f.department || '').toLowerCase();
    return d.includes('librarian') || dept === 'library';
  };

  const isGuestFaculty = (f) => {
    if (!f) return false;
    const d = (f.designation || '').toLowerCase();
    return d.includes('guest');
  };

  const isRegularFaculty = (f) => {
    return f && !isLibrarian(f) && !isGuestFaculty(f);
  };

  // Universal Category Rank: 1 (Permanent Faculty) < 2 (Guest Faculty) < 3 (Non-Teaching Staff)
  const getStaffCategoryRank = (person) => {
    if (!person) return 99;
    const nameLower = String(person.name || '').trim().toLowerCase();
    const isFac = person.type === 'Teaching Faculty' || person.isFaculty || faculty.some(f => String(f.name || '').trim().toLowerCase() === nameLower);
    if (isFac) {
      if (isGuestFaculty(person)) return 2;
      return 1;
    }
    return 3;
  };

  // Universal Sorter: Department (A-Z) -> Permanent Faculty (Seniority #1, #2...) -> Guest Faculty -> Non-Teaching Staff
  const compareOfficials = (a, b) => {
    const deptA = String(a.department || '').trim().toLowerCase();
    const deptB = String(b.department || '').trim().toLowerCase();
    if (deptA !== deptB) {
      if (!deptA) return 1;
      if (!deptB) return -1;
      return deptA.localeCompare(deptB);
    }

    const catA = getStaffCategoryRank(a);
    const catB = getStaffCategoryRank(b);
    if (catA !== catB) return catA - catB;

    const senA = (a.seniority !== undefined && a.seniority !== null && !isNaN(a.seniority)) ? Number(a.seniority) : 9999;
    const senB = (b.seniority !== undefined && b.seniority !== null && !isNaN(b.seniority)) ? Number(b.seniority) : 9999;
    if (senA !== senB) return senA - senB;

    return String(a.name || '').trim().localeCompare(String(b.name || '').trim());
  };

  // Helper: Get faculty by name or PEN
  const getFaculty = (identifier) => {
    if (!identifier) return null;
    const clean = String(identifier).trim().toLowerCase();
    return faculty.find(f => {
      const pen = String(f.pen || '').trim().toLowerCase();
      const name = String(f.name || '').trim().toLowerCase();
      const combo = `${name} (${pen})`;
      return (pen && pen === clean) || name === clean || combo === clean;
    });
  };

  // Helper: Get person from either Teaching Faculty or Non-Teaching Staff roster
  const getPerson = (identifier) => {
    if (!identifier) return null;
    const clean = String(identifier).trim().toLowerCase();
    const fac = faculty.find(f => {
      const pen = String(f.pen || '').trim().toLowerCase();
      const name = String(f.name || '').trim().toLowerCase();
      const combo = `${name} (${pen})`;
      return (pen && pen === clean) || name === clean || combo === clean;
    });
    if (fac) return { ...fac, type: 'Teaching Faculty' };
    const nt = nonTeaching.find(n => {
      const pen = String(n.pen || '').trim().toLowerCase();
      const name = String(n.name || '').trim().toLowerCase();
      const combo = `${name} (${pen})`;
      return (pen && pen === clean) || name === clean || combo === clean;
    });
    if (nt) return { ...nt, type: 'Non-Teaching Staff' };
    return null;
  };

  // Helper: Render all roster options (Teaching Faculty + Non-Teaching Staff) with optgroups for Observers, Discipline, and Grievance modals
  const renderAllRosterOptions = (currentSelectedName, draftList, currentIdx, placeholder = '-- Select Official from Roster --') => {
    let html = `<option value="">${placeholder}</option>`;

    // Group 1: Teaching Faculty sorted by Dept -> Permanent Faculty (Seniority) -> Guest
    const sortedFac = [...faculty].sort(compareOfficials);
    html += `<optgroup label="Teaching Faculty (${sortedFac.length})">`;
    sortedFac.forEach(f => {
      const isCur = currentSelectedName === f.name;
      const isChosenInOther = draftList.some((item, i) => i !== currentIdx && item.name === f.name);
      let prefix = '';
      if (f.isExcluded) prefix += '⛔ [Excluded] ';
      if (isChosenInOther) prefix += '🚩 [Selected in another slot] ';
      const deptStr = (f.department || '').trim();
      html += `
        <option value="${esc(f.name)}" ${isCur ? 'selected' : ''} ${isChosenInOther ? 'disabled' : ''}>
          ${prefix}#${f.seniority || '–'} ${esc(f.name)} (${esc(f.designation || 'Faculty')}${deptStr ? ` · ${esc(deptStr)}` : ''} · PEN:${f.pen || '–'})
        </option>
      `;
    });
    html += `</optgroup>`;

    // Group 2: Non-Teaching Staff sorted by Dept / Section
    const sortedNT = [...nonTeaching].sort(compareOfficials);
    html += `<optgroup label="Non-Teaching Staff (${sortedNT.length})">`;
    sortedNT.forEach((nt) => {
      const isCur = currentSelectedName === nt.name;
      const isChosenInOther = draftList.some((item, i) => i !== currentIdx && item.name === nt.name);
      let prefix = '';
      if (nt.isExcluded) prefix += '⛔ [Excluded] ';
      if (isChosenInOther) prefix += '🚩 [Selected in another slot] ';
      const deptStr = (nt.department || nt.section || 'Office').trim();
      html += `
        <option value="${esc(nt.name)}" ${isCur ? 'selected' : ''} ${isChosenInOther ? 'disabled' : ''}>
          ${prefix}${esc(nt.name)} (${esc(nt.designation || 'Staff')}${deptStr ? ` · ${esc(deptStr)}` : ''} · PEN:${nt.pen || '–'})
        </option>
      `;
    });
    html += `</optgroup>`;

    return html;
  };

  // Helper: Check if faculty is on polling duty
  const getPollingAssignment = (fName) => {
    if (!fName) return null;
    const clean = String(fName).trim().toLowerCase();
    for (const team of pollingTeams) {
      if (team.presidingOfficer && String(team.presidingOfficer.name).trim().toLowerCase() === clean) {
        return { role: 'Presiding Officer', boothNumber: team.boothNumber, slot: 'presidingOfficer' };
      }
      if (team.pollingOfficer1 && String(team.pollingOfficer1.name).trim().toLowerCase() === clean) {
        return { role: 'Polling Officer', boothNumber: team.boothNumber, slot: 'pollingOfficer1' };
      }
      if (team.pollingOfficer2 && String(team.pollingOfficer2.name).trim().toLowerCase() === clean) {
        return { role: 'Polling Officer', boothNumber: team.boothNumber, slot: 'pollingOfficer2' };
      }
      if (team.pollingOfficer3 && String(team.pollingOfficer3.name).trim().toLowerCase() === clean) {
        return { role: 'Polling Officer', boothNumber: team.boothNumber, slot: 'pollingOfficer3' };
      }
    }
    return null;
  };

  // Helper: Check if faculty is on counting duty
  const getCountingAssignment = (fName) => {
    if (!fName) return null;
    const clean = String(fName).trim().toLowerCase();
    for (const team of countingTeams) {
      const tbl = team.tableNumber || team.boothNumber;
      if (team.supervisor && String(team.supervisor.name).trim().toLowerCase() === clean) {
        return { role: 'Counting Supervisor', tableNumber: tbl, boothNumber: tbl, slot: 'supervisor' };
      }
      if (team.countingOfficer1 && String(team.countingOfficer1.name).trim().toLowerCase() === clean) {
        return { role: 'Counting Officer 1', tableNumber: tbl, boothNumber: tbl, slot: 'countingOfficer1' };
      }
      if (team.countingOfficer2 && String(team.countingOfficer2.name).trim().toLowerCase() === clean) {
        return { role: 'Counting Officer 2', tableNumber: tbl, boothNumber: tbl, slot: 'countingOfficer2' };
      }
      if (team.countingOfficer3 && String(team.countingOfficer3.name).trim().toLowerCase() === clean) {
        return { role: 'Counting Officer 3', tableNumber: tbl, boothNumber: tbl, slot: 'countingOfficer3' };
      }
    }
    return null;
  };

  // Helper: Check if non-teaching staff is assigned
  const getNonTeachingAssignment = (ntName) => {
    if (!ntName) return { polling: null, counting: null, countingTables: [] };
    const clean = String(ntName).trim().toLowerCase();
    const p = pollingTeams.find(t => t.pollingAssistant && String(t.pollingAssistant.name).trim().toLowerCase() === clean);
    const cList = countingTeams.filter(t => t.countingAssistant && String(t.countingAssistant.name).trim().toLowerCase() === clean);
    const countingTables = cList.map(t => t.tableNumber || t.boothNumber).sort((a, b) => a - b);
    return {
      polling: p ? { boothNumber: p.boothNumber, role: 'Polling Assistant' } : null,
      counting: cList.length > 0 ? {
        tableNumber: countingTables.join(', '),
        tableNumbers: countingTables,
        count: countingTables.length,
        role: 'Counting Assistant'
      } : null,
      countingTables
    };
  };

  // Helper: Generate HTML for a single faculty table row
  const getFacultyRowHtml = (f) => {
    const pDuty = getPollingAssignment(f.name);
    const cDuty = getCountingAssignment(f.name);
    const isObs = isObserver(f.name);
    const isDisc = isDiscipline(f.name);
    const isGriev = isGrievance(f.name);
    const isPosted = isObs || isDisc || isGriev || pDuty || cDuty;

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
          ${esc(f.designation || '–')}${f.department ? `<span class="text-[10px] text-indigo-300/80 block font-normal">${esc(f.department)}</span>` : ''}
        </td>
        <td class="font-mono text-slate-400">
          ${f.joiningDate || '–'}
        </td>
        <td>
          <div class="flex items-center gap-1.5 flex-wrap">
            ${isObs ? `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">⚖️ Observer</span>` : ''}
            ${isDisc ? `<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">🛡️ Discipline</span>` : ''}
            ${isGriev ? `<span class="badge bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold">🤝 Grievance</span>` : ''}
            ${pDuty ? `<span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">Booth ${pDuty.boothNumber} (${pDuty.role})</span>` : ''}
            ${cDuty ? `<span class="badge bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold">Table ${cDuty.tableNumber} (${cDuty.role})</span>` : ''}
            ${pDuty && cDuty ? `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">⚠️ Double Duty</span>` : ''}
            ${!isPosted ? (f.isExcluded ? `<span class="text-slate-500 text-[11px]">–</span>` : `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-semibold" title="Standby Duty at Central Control Room">📋 Reserve Pool</span>`) : ''}
          </div>
        </td>
        <td>
          ${f.isExcluded ? `
            <span class="badge bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold" title="${esc(f.exclusionReason || 'Excluded from election duties')}">
              ⛔ Excluded${f.exclusionReason ? `: ${esc(f.exclusionReason)}` : ''}
            </span>
          ` : (isPosted ? `
            <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
              ✓ Posted
            </span>
          ` : `
            <span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold" title="Not posted · Standby in Reserve Pool">
              📋 Reserve (Standby)
            </span>
          `)}
        </td>
        <td class="text-right">
          <button class="btn btn-secondary text-[11px] py-1 px-2.5 btn-toggle-exclude-fac ${f.isExcluded ? 'text-emerald-300 hover:text-emerald-200' : 'text-red-300 hover:text-red-200'}" data-pen="${f.pen || f.name}">
            ${f.isExcluded ? '✓ Make Available' : '⛔ Exclude'}
          </button>
        </td>
      </tr>
    `;
  };

  // Helper: Generate HTML for a single non-teaching table row
  const getNonTeachingRowHtml = (nt, idx) => {
    const asstDuty = getNonTeachingAssignment(nt.name);
    const isObs = isObserver(nt.name);
    const isDisc = isDiscipline(nt.name);
    const isGriev = isGrievance(nt.name);
    const isPosted = isObs || isDisc || isGriev || asstDuty.polling || asstDuty.counting;

    return `
      <tr class="${nt.isExcluded ? 'bg-red-950/20 opacity-70' : 'hover:bg-white/5'} transition-colors">
        <td class="text-center font-mono text-slate-400">
          ${idx + 1}
        </td>
        <td class="font-bold text-white whitespace-nowrap">
          ${esc(nt.name)}
        </td>
        <td class="text-slate-300">
          ${esc(nt.designation || 'Staff')}${nt.department ? `<span class="text-[10px] text-emerald-300/80 block font-normal">${esc(nt.department)}</span>` : ''}
        </td>
        <td class="font-mono text-slate-300">
          ${nt.pen || '–'}
        </td>
        <td>
          <div class="flex items-center gap-1 flex-wrap">
            ${isObs ? `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">⚖️ Observer</span>` : ''}
            ${isDisc ? `<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">🛡️ Discipline</span>` : ''}
            ${isGriev ? `<span class="badge bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold">🤝 Grievance</span>` : ''}
            ${asstDuty.polling ? `<span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">Booth ${asstDuty.polling.boothNumber}</span>` : ''}
            ${!isPosted ? (nt.isExcluded ? '<span class="text-slate-500">–</span>' : '<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-semibold" title="Standby Duty at Central Control Room">📋 Reserve Pool</span>') : ''}
          </div>
        </td>
        <td>
          ${asstDuty.counting ? `<span class="badge bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold">Table ${asstDuty.counting.tableNumber}</span>` : '<span class="text-slate-500">–</span>'}
        </td>
        <td>
          ${nt.isExcluded ? `
            <span class="badge bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold" title="${esc(nt.exclusionReason || 'Excluded from election duties')}">
              ⛔ Excluded${nt.exclusionReason ? `: ${esc(nt.exclusionReason)}` : ''}
            </span>
          ` : (isPosted ? `
            <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
              ✓ Posted
            </span>
          ` : `
            <span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold" title="Not posted · Standby in Reserve Pool">
              📋 Reserve (Standby)
            </span>
          `)}
        </td>
        <td class="text-right whitespace-nowrap space-x-1">
          <button class="btn btn-secondary text-[11px] py-1 px-2 btn-toggle-exclude-nt ${nt.isExcluded ? 'text-emerald-300 hover:text-emerald-200' : 'text-red-300 hover:text-red-200'}" data-name="${esc(nt.name)}">
            ${nt.isExcluded ? '✓ Enable' : '⛔ Exclude'}
          </button>
          <button class="btn btn-secondary text-[11px] py-1 px-1.5 text-red-400 hover:bg-red-500/20 btn-delete-nt" data-name="${esc(nt.name)}" title="Remove from roster">
            🗑️
          </button>
        </td>
      </tr>
    `;
  };

  // Downloadable CSV Templates
  const downloadFacultyTemplate = () => {
    const csvContent = `Seniority,Name,PEN,Designation,Joining Date,Department\r\n` +
      `1,Dr. Example Professor,100001,Professor,2005-06-01,Physics\r\n` +
      `2,Dr. Example Associate Professor,100002,Associate Professor,2008-09-15,Chemistry\r\n` +
      `3,Sri. Example Assistant Professor,100003,Assistant Professor,2014-02-10,Mathematics\r\n` +
      `4,Smt. Example UGC Librarian,100004,UGC Librarian,2016-08-01,Library\r\n` +
      `5,Example Guest Lecturer,100005,Guest Lecturer,2022-09-01,Commerce\r\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Faculty_Seniority_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded Faculty Seniority CSV Template!', 'success');
  };

  const downloadNonTeachingTemplate = () => {
    const csvContent = `Sl No,Staff Name,Designation,PEN,Department\r\n` +
      `1,Sri. Example Staff One,Senior Clerk,200001,Office\r\n` +
      `2,Smt. Example Staff Two,Office Attendant,200002,Administration\r\n` +
      `3,Sri. Example Staff Three,Lab Assistant,200003,Physics\r\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Non_Teaching_Staff_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded Non-Teaching Staff CSV Template!', 'success');
  };

  // Reusable file import handler for Faculty (Regular Excel, CSV, or Guest Faculty)
  const handleFacultyFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (!jsonRows || jsonRows.length < 2) {
          showToast('Invalid or empty spreadsheet format.', 'error');
          return;
        }

        const isGuestFile = file.name.toLowerCase().includes('guest') || jsonRows.some(row => (row || []).some(cell => String(cell).toLowerCase().includes('guest')));

        if (isGuestFile) {
          let nameCol = 1, deptCol = 2;
          let startR = 1;
          for (let r = 0; r < Math.min(6, jsonRows.length); r++) {
            const rawRow = jsonRows[r] || [];
            const row = rawRow.map(c => String(c || '').toLowerCase().trim());
            if (row.filter(c => c.length > 0).length < 2) continue;
            row.forEach((c, i) => {
              if (c.includes('name') || c.includes('lecturer')) { nameCol = i; startR = r + 1; }
              if (c.includes('dept') || c.includes('department') || c.includes('subject') || c.includes('branch') || c.includes('discipline')) deptCol = i;
            });
          }

          const parsedGuests = [];
          for (let r = startR; r < jsonRows.length; r++) {
            const row = jsonRows[r];
            if (!row || row.length === 0) continue;
            const name = row[nameCol] !== undefined ? String(row[nameCol]).trim() : '';
            if (!name || name.toLowerCase().includes('guest') || name.toLowerCase().includes('name') || name.toLowerCase().includes('lecturer')) continue;
            const dept = row[deptCol] !== undefined ? normalizeDepartment(row[deptCol]) : '';

            parsedGuests.push({
              name: name,
              pen: '',
              designation: 'Guest Lecturer',
              department: dept,
              joiningDate: '',
              isExcluded: false,
              exclusionReason: ''
            });
          }

          if (parsedGuests.length === 0) {
            showToast('No guest lecturers found in file.', 'error');
            return;
          }

          if (confirm(`📥 Parsed ${parsedGuests.length} Guest Lecturers from "${file.name}".\n\nAppend these to the Teaching Faculty Roster (starting from Seniority #${faculty.length + 1})?`)) {
            let added = 0;
            parsedGuests.forEach(g => {
              if (!faculty.some(f => f.name.toLowerCase() === g.name.toLowerCase())) {
                faculty.push({
                  ...g,
                  seniority: faculty.length + 1
                });
                added++;
              }
            });
            saveAll(false);
            showToast(`Added ${added} Guest Lecturers to Faculty Roster!`, 'success');
            renderUI();
            return;
          }
        }

        // Regular Faculty List Parsing (Generic for any college)
        let headerIdx = -1;
        let seniorityCol = 0, nameCol = 1, penCol = 2, desigCol = 3, dateCol = 4, deptCol = -1;

        for (let r = 0; r < Math.min(10, jsonRows.length); r++) {
          const rawRow = jsonRows[r] || [];
          const row = rawRow.map(c => String(c || '').toLowerCase().trim());
          const nonEmpty = row.filter(c => c.length > 0);
          if (nonEmpty.length < 2) continue; // Skip title headers that span only 1 cell

          let foundName = -1;
          row.forEach((c, i) => {
            if (c === 'name' || c === 'teacher' || c === 'faculty' || c.includes('name of') || c.includes('teacher name') || c.includes('faculty name') || c.includes('staff name')) {
              foundName = i;
            }
          });

          if (foundName >= 0) {
            headerIdx = r;
            nameCol = foundName;
            row.forEach((c, i) => {
              if (c.includes('sl') || c.includes('seniority') || c.includes('s.no') || c === 'no' || c === 'no.') seniorityCol = i;
              if (c.includes('pen') || c.includes('id') || c.includes('code')) penCol = i;
              if (c.includes('desig') || c.includes('post') || c.includes('rank') || c.includes('role')) desigCol = i;
              if (c.includes('date') || c.includes('joining') || c.includes('doj')) dateCol = i;
              if (c.includes('dept') || c.includes('department') || c.includes('subject') || c.includes('branch') || c.includes('discipline')) deptCol = i;
            });
            break;
          }
        }

        const parsedFaculty = [];
        const startR = headerIdx >= 0 ? headerIdx + 1 : 1;

        for (let r = startR; r < jsonRows.length; r++) {
          const row = jsonRows[r];
          if (!row || row.length === 0) continue;

          const rawSl = row[seniorityCol] !== undefined ? parseInt(row[seniorityCol], 10) : parsedFaculty.length + 1;
          const name = row[nameCol] !== undefined ? String(row[nameCol]).trim() : '';
          if (!name || name.toLowerCase().includes('seniority') || name.toLowerCase().includes('college') || name.toLowerCase() === 'name') continue;

          const pen = penCol >= 0 && row[penCol] !== undefined ? String(row[penCol]).trim() : '';
          const desig = desigCol >= 0 && row[desigCol] !== undefined ? String(row[desigCol]).trim() : 'Assistant Professor';
          let dt = dateCol >= 0 && row[dateCol] !== undefined ? formatExcelDate(row[dateCol]) : '';
          let dept = deptCol >= 0 && row[deptCol] !== undefined ? normalizeDepartment(row[deptCol]) : '';

          parsedFaculty.push({
            seniority: isNaN(rawSl) ? parsedFaculty.length + 1 : rawSl,
            name: name,
            pen: pen,
            designation: desig,
            department: dept,
            joiningDate: dt,
            isExcluded: false,
            exclusionReason: ''
          });
        }

        if (parsedFaculty.length === 0) {
          showToast('No faculty rows could be parsed. Check column layout or use CSV template.', 'error');
          return;
        }

        if (confirm(`📥 Successfully parsed ${parsedFaculty.length} teaching faculty records from "${file.name}".\n\nReplace current teaching faculty roster with this list?`)) {
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
  };

  // Reusable file import handler for Non-Teaching (with automated Librarian detection)
  const handleNonTeachingFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (!jsonRows || jsonRows.length < 1) {
          showToast('Invalid or empty spreadsheet format.', 'error');
          return;
        }

        // Scan for header row
        let headerIdx = -1;
        let nameCol = 2, desigCol = 3, penCol = 1, deptCol = 4;

        for (let r = 0; r < Math.min(10, jsonRows.length); r++) {
          const rawRow = jsonRows[r] || [];
          const row = rawRow.map(c => String(c || '').toLowerCase().trim());
          const nonEmpty = row.filter(c => c.length > 0);
          if (nonEmpty.length < 2) continue;

          let foundName = -1;
          row.forEach((c, i) => {
            if (c.includes('name') || c.includes('staff') || c.includes('employee')) {
              foundName = i;
            }
          });
          if (foundName >= 0) {
            headerIdx = r;
            nameCol = foundName;
            row.forEach((c, i) => {
              if (c.includes('desig') || c.includes('post') || c.includes('cadre') || c.includes('role')) desigCol = i;
              if (c.includes('pen') || c.includes('id') || c.includes('code')) penCol = i;
              if (c.includes('dept') || c.includes('department') || c.includes('subject') || c.includes('branch') || c.includes('discipline') || c.includes('section')) deptCol = i;
            });
            break;
          }
        }

        const parsedNT = [];
        const detectedLibrarians = [];
        const startR = headerIdx >= 0 ? headerIdx + 1 : 0;

        for (let r = startR; r < jsonRows.length; r++) {
          const row = jsonRows[r];
          if (!row || row.length === 0) continue;

          const name = row[nameCol] !== undefined ? String(row[nameCol]).trim() : '';
          if (!name || name.toLowerCase().includes('staff name') || name.toLowerCase().includes('total') || name.toLowerCase().includes('college') || name.toLowerCase().includes('details')) continue;

          const desig = row[desigCol] !== undefined ? String(row[desigCol]).trim() : 'Staff';
          const pen = row[penCol] !== undefined ? String(row[penCol]).trim() : '';
          const dept = row[deptCol] !== undefined ? normalizeDepartment(row[deptCol]) : '';

          // Check if UGC Librarian, Librarian Gr.IV, or any Librarian
          if (desig.toLowerCase().includes('librarian')) {
            detectedLibrarians.push({
              name: name,
              designation: desig,
              pen: pen,
              department: normalizeDepartment(dept || 'Library')
            });
          } else {
            parsedNT.push({
              id: 'nt_' + (parsedNT.length + 1) + '_' + Date.now(),
              name: name,
              designation: desig,
              pen: pen,
              department: dept,
              isExcluded: false,
              exclusionReason: ''
            });
          }
        }

        if (parsedNT.length === 0 && detectedLibrarians.length === 0) {
          showToast('No staff rows could be parsed from the file.', 'error');
          return;
        }

        let confirmMsg = `📥 Successfully parsed ${parsedNT.length} Non-Teaching Staff members from "${file.name}".`;
        if (detectedLibrarians.length > 0) {
          confirmMsg += `\n\n📚 Identified ${detectedLibrarians.length} Librarian(s):\n${detectedLibrarians.map(l => '• ' + l.name + ' (' + l.designation + ')').join('\n')}\nPer election guidelines, Librarians are included in the Teaching Faculty Roster and excluded from Non-Teaching Staff.`;
        }
        confirmMsg += `\n\nApply this update to your election rosters?`;

        if (confirm(confirmMsg)) {
          nonTeaching = parsedNT;
          // Add librarians to faculty if not already present
          let libAdded = 0;
          detectedLibrarians.forEach(lib => {
            if (!faculty.some(f => f.pen === lib.pen || f.name.toLowerCase() === lib.name.toLowerCase())) {
              faculty.push({
                seniority: faculty.length + 1,
                name: lib.name,
                pen: lib.pen,
                designation: lib.designation,
                department: lib.department,
                joiningDate: '',
                isExcluded: false,
                exclusionReason: ''
              });
              libAdded++;
            }
          });

          saveAll(false);
          showToast(`Imported ${parsedNT.length} Non-Teaching staff!${libAdded > 0 ? ` (${libAdded} Librarians added to Faculty)` : ''}`, 'success');
          renderUI();
        }
      } catch (err) {
        showToast(`Non-teaching import error: ${err.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Live in-place DOM update for Faculty table rows (preserves search input focus & cursor position)
  const updateFacultyTableRows = () => {
    const tbody = main.querySelector('#facultyTableBody');
    if (!tbody) return;
    if (faculty.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-12 text-slate-400">
            <div class="space-y-3 max-w-md mx-auto">
              <span class="text-4xl block">📋</span>
              <h5 class="text-white font-bold text-sm">Teaching Faculty Roster is Empty</h5>
              <p class="text-xs text-slate-400 leading-relaxed">
                No teaching faculty uploaded yet. Upload your College Faculty Seniority Excel / CSV file or download our template format.
              </p>
              <div class="flex items-center justify-center gap-2 pt-2">
                <label class="btn btn-primary bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 cursor-pointer flex items-center gap-1.5 shadow">
                  📥 Import Faculty (Excel / CSV)
                  <input type="file" id="fileFacultyImportEmpty" accept=".xlsx,.xls,.csv" class="hidden" />
                </label>
                <button id="btnDownloadFacultyTemplateEmpty" class="btn btn-secondary text-xs text-sky-300 hover:bg-sky-500/20 px-3 py-2 flex items-center gap-1">
                  📄 Download CSV Template
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
      tbody.querySelector('#fileFacultyImportEmpty')?.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFacultyFile(e.target.files[0]);
      });
      tbody.querySelector('#btnDownloadFacultyTemplateEmpty')?.addEventListener('click', () => {
        downloadFacultyTemplate();
      });
      return;
    }
    const filtered = faculty.filter(f => {
      const isObs = isObserver(f.name);
      const isDisc = isDiscipline(f.name);
      const isGriev = isGrievance(f.name);
      const pDuty = getPollingAssignment(f.name);
      const cDuty = getCountingAssignment(f.name);
      const isPosted = isObs || isDisc || isGriev || pDuty || cDuty;

      if (facultyFilter === 'active' && f.isExcluded) return false;
      if (facultyFilter === 'excluded' && !f.isExcluded) return false;
      if (facultyFilter === 'posted' && (f.isExcluded || !isPosted)) return false;
      if (facultyFilter === 'reserve' && (f.isExcluded || isPosted)) return false;
      if (facultySearch) {
        const s = facultySearch.toLowerCase().trim();
        return (f.name || '').toLowerCase().includes(s) ||
               String(f.pen || '').toLowerCase().includes(s) ||
               (f.designation || '').toLowerCase().includes(s) ||
               (f.department || '').toLowerCase().includes(s);
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-8 text-slate-400">
            No teaching staff found matching "<strong>${esc(facultySearch)}</strong>".
          </td>
        </tr>
      `;
      return;
    }

    filtered.sort((a, b) => (Number(a.seniority) || 9999) - (Number(b.seniority) || 9999));
    tbody.innerHTML = filtered.map(getFacultyRowHtml).join('');
  };

  // Live in-place DOM update for Non-Teaching table rows (preserves search input focus & cursor position)
  const updateNonTeachingTableRows = () => {
    const tbody = main.querySelector('#nonTeachingTableBody');
    if (!tbody) return;
    if (nonTeaching.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-12 text-slate-400">
            <div class="space-y-3 max-w-md mx-auto">
              <span class="text-4xl block">🤝</span>
              <h5 class="text-white font-bold text-sm">Non-Teaching Staff Roster is Empty</h5>
              <p class="text-xs text-slate-400 leading-relaxed">
                No non-teaching staff uploaded yet. Upload your staff list as Excel / CSV or download our template format.
              </p>
              <div class="flex items-center justify-center gap-2 pt-2">
                <label class="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 cursor-pointer flex items-center gap-1.5 shadow">
                  📥 Upload Non-Teaching (Excel / CSV)
                  <input type="file" id="fileNonTeachingImportEmpty" accept=".xlsx,.xls,.csv" class="hidden" />
                </label>
                <button id="btnDownloadNTTemplateEmpty" class="btn btn-secondary text-xs text-sky-300 hover:bg-sky-500/20 px-3 py-2 flex items-center gap-1">
                  📄 Download CSV Template
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
      tbody.querySelector('#fileNonTeachingImportEmpty')?.addEventListener('change', (e) => {
        if (e.target.files[0]) handleNonTeachingFile(e.target.files[0]);
      });
      tbody.querySelector('#btnDownloadNTTemplateEmpty')?.addEventListener('click', () => {
        downloadNonTeachingTemplate();
      });
      return;
    }
    const filtered = nonTeaching.filter(nt => {
      const isObs = isObserver(nt.name);
      const isDisc = isDiscipline(nt.name);
      const isGriev = isGrievance(nt.name);
      const asstDuty = getNonTeachingAssignment(nt.name);
      const isPosted = isObs || isDisc || isGriev || asstDuty.polling || asstDuty.counting;

      if (nonTeachingFilter === 'active' && nt.isExcluded) return false;
      if (nonTeachingFilter === 'excluded' && !nt.isExcluded) return false;
      if (nonTeachingFilter === 'posted' && (nt.isExcluded || !isPosted)) return false;
      if (nonTeachingFilter === 'reserve' && (nt.isExcluded || isPosted)) return false;
      if (nonTeachingSearch) {
        const s = nonTeachingSearch.toLowerCase().trim();
        return (nt.name || '').toLowerCase().includes(s) ||
               String(nt.pen || '').toLowerCase().includes(s) ||
               (nt.designation || '').toLowerCase().includes(s) ||
               (nt.department || '').toLowerCase().includes(s);
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-8 text-slate-400">
            No non-teaching staff found matching "<strong>${esc(nonTeachingSearch)}</strong>".
          </td>
        </tr>
      `;
      return;
    }

    filtered.sort(compareOfficials);
    tbody.innerHTML = filtered.map(getNonTeachingRowHtml).join('');
  };

  // Save changes to API & local cache
  const saveAll = async (quiet = false) => {
    localStorage.setItem('gcc_faculty_roster', JSON.stringify(faculty));
    localStorage.setItem('gcc_non_teaching_roster', JSON.stringify(nonTeaching));
    localStorage.setItem('gcc_polling_teams', JSON.stringify(pollingTeams));
    localStorage.setItem('gcc_counting_teams', JSON.stringify(countingTeams));
    localStorage.setItem('gcc_election_observers', JSON.stringify(observers));
    localStorage.setItem('gcc_election_discipline', JSON.stringify(disciplineCharge));
    localStorage.setItem('gcc_election_grievance', JSON.stringify(grievanceCell));

    try {
      await api.adminSaveOfficials(pwd, {
        faculty,
        nonTeaching,
        pollingTeams,
        countingTeams,
        observers,
        disciplineCharge,
        grievanceCell
      });
      if (!quiet) showToast('Officials and rosters saved successfully!', 'success');
    } catch (e) {
      if (!quiet) showToast(`Saved locally (Cloud sync failed: ${e.message})`, 'warning');
    }
  };

  // ─── Team Builder Algorithms ────────────────────────────────────────────────

  // Auto-allot Polling Teams (Fills empty slots only, strictly preserving all manual allotments)
  const autoAllotPolling = () => {
    const numBooths = booths.length;
    if (numBooths === 0) {
      showToast('No polling booths configured.', 'error');
      return;
    }

    // Ensure every booth has a team entry in pollingTeams
    booths.forEach(b => {
      let team = pollingTeams.find(t => t.boothNumber === b.boothNumber);
      if (!team) {
        team = {
          boothNumber: b.boothNumber,
          roomName: b.roomName || `Booth ${b.boothNumber}`,
          presidingOfficer: null,
          pollingOfficer1: null,
          pollingOfficer2: null,
          pollingOfficer3: null,
          showPollingOfficer3: false,
          pollingAssistant: null
        };
        pollingTeams.push(team);
      }
    });

    // 1. Identify all currently assigned/manual faculty & assistants in polling
    const preservedPollingFacultyNames = new Set();
    const preservedPollingAssistantNames = new Set();
    observers.forEach(o => { if (o.name) preservedPollingFacultyNames.add(o.name); });
    disciplineCharge.forEach(d => { if (d.name) preservedPollingFacultyNames.add(d.name); });
    pollingTeams.forEach(t => {
      if (t.presidingOfficer?.name) preservedPollingFacultyNames.add(t.presidingOfficer.name);
      if (t.pollingOfficer1?.name) preservedPollingFacultyNames.add(t.pollingOfficer1.name);
      if (t.pollingOfficer2?.name) preservedPollingFacultyNames.add(t.pollingOfficer2.name);
      if (t.pollingOfficer3?.name) preservedPollingFacultyNames.add(t.pollingOfficer3.name);
      if (t.pollingAssistant?.name) preservedPollingAssistantNames.add(t.pollingAssistant.name);
    });

    // Identify counting assignments to minimize double duty
    const countingAssignedNames = new Set();
    countingTeams.forEach(t => {
      if (t.supervisor?.name) countingAssignedNames.add(t.supervisor.name);
      if (t.countingOfficer1?.name) countingAssignedNames.add(t.countingOfficer1.name);
      if (t.countingOfficer2?.name) countingAssignedNames.add(t.countingOfficer2.name);
      if (t.countingOfficer3?.name) countingAssignedNames.add(t.countingOfficer3.name);
    });

    // Identify which slots are empty across all polling booths
    const emptyPresidingBooths = [];
    const emptyPO1Booths = [];
    const emptyPO2Booths = [];
    const emptyPO3Booths = [];
    const emptyAssistantBooths = [];

    booths.forEach(b => {
      const team = pollingTeams.find(t => t.boothNumber === b.boothNumber);
      if (!team) return;
      if (!team.presidingOfficer) emptyPresidingBooths.push(team);
      if (!team.pollingOfficer1) emptyPO1Booths.push(team);
      if (!team.pollingOfficer2) emptyPO2Booths.push(team);
      if (team.showPollingOfficer3 && !team.pollingOfficer3) emptyPO3Booths.push(team);
      if (!team.pollingAssistant) emptyAssistantBooths.push(team);
    });

    const totalEmptySlots = emptyPresidingBooths.length + emptyPO1Booths.length + emptyPO2Booths.length + emptyPO3Booths.length + emptyAssistantBooths.length;

    if (totalEmptySlots === 0) {
      showToast('All polling slots are already filled! No empty slots to auto-allot.', 'info');
      return;
    }

    const observerNames = new Set(observers.map(o => o.name));
    const disciplineNames = new Set(disciplineCharge.map(d => d.name));
    const grievanceNames = new Set(grievanceCell.map(g => g.name));
    // Candidate active, non-excluded faculty not already allotted in Polling, Observers, Discipline Charge, or Grievance Cell
    const candidateFaculty = faculty
      .filter(f => !f.isExcluded && !preservedPollingFacultyNames.has(f.name) && !observerNames.has(f.name) && !disciplineNames.has(f.name) && !grievanceNames.has(f.name))
      .sort((a, b) => a.seniority - b.seniority);

    let filledCount = 0;
    let doubleDutyCount = 0;
    let librarianCount = 0;
    let guestCount = 0;
    const newlyAssignedFacultyNames = new Set();

    // 2. Fill Empty Presiding Officers (Must be Regular Teaching Faculty, seniormost)
    if (emptyPresidingBooths.length > 0) {
      const activeRegular = candidateFaculty.filter(isRegularFaculty);
      const freshRegular = activeRegular.filter(f => !countingAssignedNames.has(f.name));
      const doubleDutyRegular = activeRegular.filter(f => countingAssignedNames.has(f.name));
      const presidingPool = [...freshRegular, ...doubleDutyRegular];

      let pIdx = 0;
      emptyPresidingBooths.forEach(team => {
        while (pIdx < presidingPool.length && newlyAssignedFacultyNames.has(presidingPool[pIdx].name)) {
          pIdx++;
        }
        if (pIdx < presidingPool.length) {
          const selected = presidingPool[pIdx];
          team.presidingOfficer = selected;
          newlyAssignedFacultyNames.add(selected.name);
          filledCount++;
          if (countingAssignedNames.has(selected.name)) doubleDutyCount++;
          pIdx++;
        }
      });
    }

    // 3. Fill Empty Polling Officers (PO1, PO2, PO3)
    const emptyPOSlots = [];
    emptyPO1Booths.forEach(t => emptyPOSlots.push({ team: t, role: 'pollingOfficer1' }));
    emptyPO2Booths.forEach(t => emptyPOSlots.push({ team: t, role: 'pollingOfficer2' }));
    emptyPO3Booths.forEach(t => emptyPOSlots.push({ team: t, role: 'pollingOfficer3' }));

    if (emptyPOSlots.length > 0) {
      const remainingCandidates = candidateFaculty.filter(f => !newlyAssignedFacultyNames.has(f.name));
      const freshCandidates = remainingCandidates.filter(f => !countingAssignedNames.has(f.name));
      const doubleDutyCandidates = remainingCandidates.filter(f => countingAssignedNames.has(f.name));
      const poPool = [...freshCandidates, ...doubleDutyCandidates];

      let poIdx = 0;
      emptyPOSlots.forEach(slot => {
        while (poIdx < poPool.length && newlyAssignedFacultyNames.has(poPool[poIdx].name)) {
          poIdx++;
        }
        if (poIdx < poPool.length) {
          const selected = poPool[poIdx];
          slot.team[slot.role] = selected;
          newlyAssignedFacultyNames.add(selected.name);
          filledCount++;
          if (countingAssignedNames.has(selected.name)) doubleDutyCount++;
          if (isGuestFaculty(selected)) guestCount++;
          if (isLibrarian(selected)) librarianCount++;
          poIdx++;
        }
      });
    }

    // 4. Fill Empty Polling Assistants (Non-Teaching Staff)
    if (emptyAssistantBooths.length > 0) {
      const countingAsstNames = new Set(countingTeams.map(t => t.countingAssistant?.name).filter(Boolean));
      const availableNT = nonTeaching.filter(nt => !nt.isExcluded && !preservedPollingAssistantNames.has(nt.name) && !observerNames.has(nt.name) && !disciplineNames.has(nt.name) && !grievanceNames.has(nt.name));
      const freshNT = availableNT.filter(nt => !countingAsstNames.has(nt.name));
      const doubleDutyNT = availableNT.filter(nt => countingAsstNames.has(nt.name));
      const ntPool = [...freshNT, ...doubleDutyNT];

      let ntIdx = 0;
      emptyAssistantBooths.forEach(team => {
        if (ntIdx < ntPool.length) {
          const selected = ntPool[ntIdx];
          team.pollingAssistant = { name: selected.name, designation: selected.designation, pen: selected.pen || '' };
          filledCount++;
          ntIdx++;
        }
      });
    }

    saveAll(false);

    const extraDetails = [];
    if (librarianCount > 0) extraDetails.push(`${librarianCount} Librarian${librarianCount > 1 ? 's' : ''}`);
    if (guestCount > 0) extraDetails.push(`${guestCount} Guest Faculty`);
    const extraStr = extraDetails.length > 0 ? ` (Utilized ${extraDetails.join(' & ')} as Polling Officers)` : '';

    if (filledCount > 0) {
      if (doubleDutyCount > 0) {
        showToast(`Auto-allotted ${filledCount} empty slot(s) while preserving manual selections (${doubleDutyCount} double duty required).${extraStr}`, 'warning');
      } else {
        showToast(`Auto-allotted ${filledCount} empty slot(s) cleanly while preserving manual selections!${extraStr}`, 'success');
      }
    } else {
      showToast('Could not fill any empty slots. Please check faculty and non-teaching rosters.', 'warning');
    }
    renderUI();
  };

  // Auto-allot Counting Teams (Fills empty slots only, strictly preserving all manual allotments)
  const autoAllotCounting = (preferFresh = true) => {
    const numTables = booths.length;
    if (numTables === 0) {
      showToast('No counting tables configured.', 'error');
      return;
    }

    // Ensure every table has a team entry in countingTeams
    booths.forEach(b => {
      let team = countingTeams.find(t => t.tableNumber === b.boothNumber);
      if (!team) {
        team = {
          tableNumber: b.boothNumber,
          roomName: b.roomName || `Table ${b.boothNumber}`,
          supervisor: null,
          countingOfficer1: null,
          countingOfficer2: null,
          countingOfficer3: null,
          showCountingOfficer3: false,
          countingAssistant: null
        };
        countingTeams.push(team);
      }
    });

    // 1. Identify all currently assigned/manual faculty & assistants in counting
    const preservedCountingFacultyNames = new Set();
    const preservedCountingAssistantNames = new Set();
    observers.forEach(o => { if (o.name) preservedCountingFacultyNames.add(o.name); });
    disciplineCharge.forEach(d => { if (d.name) preservedCountingFacultyNames.add(d.name); });
    countingTeams.forEach(t => {
      if (t.supervisor?.name) preservedCountingFacultyNames.add(t.supervisor.name);
      if (t.countingOfficer1?.name) preservedCountingFacultyNames.add(t.countingOfficer1.name);
      if (t.countingOfficer2?.name) preservedCountingFacultyNames.add(t.countingOfficer2.name);
      if (t.countingOfficer3?.name) preservedCountingFacultyNames.add(t.countingOfficer3.name);
      if (t.countingAssistant?.name) preservedCountingAssistantNames.add(t.countingAssistant.name);
    });

    // Identify polling duty assignments to minimize double duty
    const pollingAssignedNames = new Set();
    pollingTeams.forEach(t => {
      if (t.presidingOfficer?.name) pollingAssignedNames.add(t.presidingOfficer.name);
      if (t.pollingOfficer1?.name) pollingAssignedNames.add(t.pollingOfficer1.name);
      if (t.pollingOfficer2?.name) pollingAssignedNames.add(t.pollingOfficer2.name);
      if (t.pollingOfficer3?.name) pollingAssignedNames.add(t.pollingOfficer3.name);
    });

    // Identify which slots are empty across all counting tables
    const emptySupervisorTables = [];
    const emptyCO1Tables = [];
    const emptyCO2Tables = [];
    const emptyCO3Tables = [];
    const emptyAssistantTables = [];

    booths.forEach(b => {
      const team = countingTeams.find(t => t.tableNumber === b.boothNumber);
      if (!team) return;
      if (!team.supervisor) emptySupervisorTables.push(team);
      if (!team.countingOfficer1) emptyCO1Tables.push(team);
      if (!team.countingOfficer2) emptyCO2Tables.push(team);
      if (team.showCountingOfficer3 && !team.countingOfficer3) emptyCO3Tables.push(team);
      if (!team.countingAssistant) emptyAssistantTables.push(team);
    });

    const totalEmptySlots = emptySupervisorTables.length + emptyCO1Tables.length + emptyCO2Tables.length + emptyCO3Tables.length + emptyAssistantTables.length;

    if (totalEmptySlots === 0) {
      showToast('All counting slots are already filled! No empty slots to auto-allot.', 'info');
      return;
    }

    const observerNames = new Set(observers.map(o => o.name));
    const disciplineNames = new Set(disciplineCharge.map(d => d.name));
    const grievanceNames = new Set(grievanceCell.map(g => g.name));
    // Candidate active, non-excluded faculty not already allotted in Counting, Observers, Discipline Charge, or Grievance Cell
    const candidateFaculty = faculty
      .filter(f => !f.isExcluded && !preservedCountingFacultyNames.has(f.name) && !observerNames.has(f.name) && !disciplineNames.has(f.name) && !grievanceNames.has(f.name))
      .sort((a, b) => a.seniority - b.seniority);

    let filledCount = 0;
    let doubleDutyCount = 0;
    let librarianCount = 0;
    let guestCount = 0;
    const newlyAssignedFacultyNames = new Set();

    // 2. Fill Empty Counting Supervisors (Must be Regular Teaching Faculty, seniormost)
    if (emptySupervisorTables.length > 0) {
      const activeRegular = candidateFaculty.filter(isRegularFaculty);
      const freshRegular = activeRegular.filter(f => !pollingAssignedNames.has(f.name));
      const doubleDutyRegular = activeRegular.filter(f => pollingAssignedNames.has(f.name));
      const supervisorPool = preferFresh ? [...freshRegular, ...doubleDutyRegular] : [...activeRegular];

      let sIdx = 0;
      emptySupervisorTables.forEach(team => {
        while (sIdx < supervisorPool.length && newlyAssignedFacultyNames.has(supervisorPool[sIdx].name)) {
          sIdx++;
        }
        if (sIdx < supervisorPool.length) {
          const selected = supervisorPool[sIdx];
          team.supervisor = selected;
          newlyAssignedFacultyNames.add(selected.name);
          filledCount++;
          if (pollingAssignedNames.has(selected.name)) doubleDutyCount++;
          sIdx++;
        }
      });
    }

    // 3. Fill Empty Counting Officers (CO1, CO2, CO3)
    const emptyCOSlots = [];
    emptyCO1Tables.forEach(t => emptyCOSlots.push({ team: t, role: 'countingOfficer1' }));
    emptyCO2Tables.forEach(t => emptyCOSlots.push({ team: t, role: 'countingOfficer2' }));
    emptyCO3Tables.forEach(t => emptyCOSlots.push({ team: t, role: 'countingOfficer3' }));

    if (emptyCOSlots.length > 0) {
      const remainingCandidates = candidateFaculty.filter(f => !newlyAssignedFacultyNames.has(f.name));
      const freshCandidates = remainingCandidates.filter(f => !pollingAssignedNames.has(f.name));
      const doubleDutyCandidates = remainingCandidates.filter(f => pollingAssignedNames.has(f.name));
      const coPool = preferFresh ? [...freshCandidates, ...doubleDutyCandidates] : [...remainingCandidates];

      let coIdx = 0;
      emptyCOSlots.forEach(slot => {
        while (coIdx < coPool.length && newlyAssignedFacultyNames.has(coPool[coIdx].name)) {
          coIdx++;
        }
        if (coIdx < coPool.length) {
          const selected = coPool[coIdx];
          slot.team[slot.role] = selected;
          newlyAssignedFacultyNames.add(selected.name);
          filledCount++;
          if (pollingAssignedNames.has(selected.name)) doubleDutyCount++;
          if (isGuestFaculty(selected)) guestCount++;
          if (isLibrarian(selected)) librarianCount++;
          coIdx++;
        }
      });
    }

    // 4. Fill Empty Counting Assistants (Non-Teaching Staff)
    if (emptyAssistantTables.length > 0) {
      const pollingAsstNames = new Set(pollingTeams.map(t => t.pollingAssistant?.name).filter(Boolean));
      const availableNT = nonTeaching.filter(nt => !nt.isExcluded && !preservedCountingAssistantNames.has(nt.name) && !observerNames.has(nt.name) && !disciplineNames.has(nt.name) && !grievanceNames.has(nt.name));
      const freshNT = availableNT.filter(nt => !pollingAsstNames.has(nt.name));
      const doubleDutyNT = availableNT.filter(nt => pollingAsstNames.has(nt.name));
      const ntPool = [...freshNT, ...doubleDutyNT];
      const effectivePool = ntPool.length > 0 ? ntPool : nonTeaching.filter(nt => !nt.isExcluded && !observerNames.has(nt.name) && !disciplineNames.has(nt.name) && !grievanceNames.has(nt.name));

      if (effectivePool.length > 0) {
        let ntIdx = 0;
        emptyAssistantTables.forEach(team => {
          // Round-robin assignment across available staff when there is a staff shortage
          const selected = effectivePool[ntIdx % effectivePool.length];
          team.countingAssistant = { name: selected.name, designation: selected.designation, pen: selected.pen || '' };
          filledCount++;
          ntIdx++;
        });
      }
    }

    saveAll(false);

    const extraDetails = [];
    if (librarianCount > 0) extraDetails.push(`${librarianCount} Librarian${librarianCount > 1 ? 's' : ''}`);
    if (guestCount > 0) extraDetails.push(`${guestCount} Guest Faculty`);
    const extraStr = extraDetails.length > 0 ? ` (Utilized ${extraDetails.join(' & ')} as Counting Officers)` : '';

    if (filledCount > 0) {
      if (doubleDutyCount > 0) {
        showToast(`Auto-allotted ${filledCount} empty slot(s) while preserving manual selections (${doubleDutyCount} double duty required).${extraStr}`, 'warning');
      } else {
        showToast(`Auto-allotted ${filledCount} empty slot(s) cleanly while preserving manual selections!${extraStr}`, 'success');
      }
    } else {
      showToast('Could not fill any empty slots. Please check faculty and non-teaching rosters.', 'warning');
    }
    renderUI();
  };

  // ─── Dropdown Option Renderers with Duplicate Allotment Flags ──────────────

  // Helper to render faculty options in Polling dropdowns
  const renderPollingFacultyOptions = (boothNumber, currentRole, currentSelectedName) => {
    return [...faculty].sort(compareOfficials).map(f => {
      const isSelected = currentSelectedName === f.name;
      const isObs = isObserver(f.name);
      const isDisc = isDiscipline(f.name);
      const isGriev = isGrievance(f.name);
      const pDuty = getPollingAssignment(f.name);
      // Already allotted to another polling slot (either another booth or another role in this booth)
      const isAllottedInPolling = pDuty && !(pDuty.boothNumber === boothNumber && pDuty.slot === currentRole);
      const cDuty = getCountingAssignment(f.name);

      let prefix = '';
      if (f.isExcluded) prefix += '⛔ ';
      if (isObs) {
        prefix += '⚖️ [Allotted: Observer] ';
      } else if (isDisc) {
        prefix += '🛡️ [Allotted: Discipline Charge] ';
      } else if (isGriev) {
        prefix += '🤝 [Allotted: Grievance Cell] ';
      } else if (isAllottedInPolling) {
        prefix += `🚩 [Allotted: Booth ${pDuty.boothNumber} - ${pDuty.role}] `;
      } else if (isSelected) {
        prefix += '✓ (Current) ';
      }

      const tag = isGuestFaculty(f) ? '[Guest]' : isLibrarian(f) ? '[Librarian]' : '';
      const doubleTag = cDuty ? `[⚠️ Double Duty: Table ${cDuty.tableNumber}]` : '';
      const deptStr = (f.department || '').trim();

      return `
        <option value="${esc(f.name)}" ${isSelected ? 'selected' : ''} ${(isAllottedInPolling || isObs || isDisc || isGriev) && !isSelected ? 'disabled' : ''}>
          ${prefix}#${f.seniority || '–'} ${esc(f.name)} (${esc(f.designation || 'Faculty')}${deptStr ? ` · ${esc(deptStr)}` : ''} · PEN:${f.pen || '–'}) ${tag} ${doubleTag}
        </option>
      `;
    }).join('');
  };

  // Helper to render faculty options in Counting dropdowns
  const renderCountingFacultyOptions = (tableNumber, currentRole, currentSelectedName) => {
    return [...faculty].sort(compareOfficials).map(f => {
      const isSelected = currentSelectedName === f.name;
      const isObs = isObserver(f.name);
      const isDisc = isDiscipline(f.name);
      const isGriev = isGrievance(f.name);
      const cDuty = getCountingAssignment(f.name);
      // Already allotted to another counting slot (either another table or another role on this table)
      const isAllottedInCounting = cDuty && !(cDuty.tableNumber === tableNumber && cDuty.slot === currentRole);
      const pDuty = getPollingAssignment(f.name);

      let prefix = '';
      if (f.isExcluded) prefix += '⛔ ';
      if (isObs) {
        prefix += '⚖️ [Allotted: Observer] ';
      } else if (isDisc) {
        prefix += '🛡️ [Allotted: Discipline Charge] ';
      } else if (isGriev) {
        prefix += '🤝 [Allotted: Grievance Cell] ';
      } else if (isAllottedInCounting) {
        prefix += `🚩 [Allotted: Table ${cDuty.tableNumber} - ${cDuty.role}] `;
      } else if (isSelected) {
        prefix += '✓ (Current) ';
      }

      const tag = isGuestFaculty(f) ? '[Guest]' : isLibrarian(f) ? '[Librarian]' : '';
      const doubleTag = pDuty ? `[⚠️ Double Duty: Booth ${pDuty.boothNumber}]` : '';
      const deptStr = (f.department || '').trim();

      return `
        <option value="${esc(f.name)}" ${isSelected ? 'selected' : ''} ${(isAllottedInCounting || isObs || isDisc || isGriev) && !isSelected ? 'disabled' : ''}>
          ${prefix}#${f.seniority || '–'} ${esc(f.name)} (${esc(f.designation || 'Faculty')}${deptStr ? ` · ${esc(deptStr)}` : ''} · PEN:${f.pen || '–'}) ${tag} ${doubleTag}
        </option>
      `;
    }).join('');
  };

  // Helper to render Non-Teaching options in Polling Assistant dropdowns
  const renderPollingNonTeachingOptions = (boothNumber, currentSelectedName) => {
    return [...nonTeaching].sort(compareOfficials).map(nt => {
      const isSelected = currentSelectedName === nt.name;
      const isObs = isObserver(nt.name);
      const isDisc = isDiscipline(nt.name);
      const isGriev = isGrievance(nt.name);
      const ntAssigned = getNonTeachingAssignment(nt.name);
      const isAllottedInPolling = ntAssigned.polling && ntAssigned.polling.boothNumber !== boothNumber;

      let prefix = '';
      if (nt.isExcluded) prefix += '⛔ ';
      if (isObs) {
        prefix += '⚖️ [Allotted: Observer] ';
      } else if (isDisc) {
        prefix += '🛡️ [Allotted: Discipline Charge] ';
      } else if (isGriev) {
        prefix += '🤝 [Allotted: Grievance Cell] ';
      } else if (isAllottedInPolling) {
        prefix += `🚩 [Allotted: Booth ${ntAssigned.polling.boothNumber} - Polling Assistant] `;
      } else if (isSelected) {
        prefix += '✓ (Current) ';
      }

      const doubleTag = ntAssigned.counting ? `[⚠️ Double Duty: Table ${ntAssigned.counting.tableNumber}]` : '';
      const deptStr = (nt.department || nt.section || 'Office').trim();

      return `
        <option value="${esc(nt.name)}" ${isSelected ? 'selected' : ''} ${(isAllottedInPolling || isObs || isDisc || isGriev) && !isSelected ? 'disabled' : ''}>
          ${prefix}${esc(nt.name)} (${esc(nt.designation || 'Staff')}${deptStr ? ` · ${esc(deptStr)}` : ''}${nt.pen ? ` · PEN:${nt.pen}` : ''}) ${doubleTag}
        </option>
      `;
    }).join('');
  };

  // Helper to render Non-Teaching options in Counting Assistant dropdowns
  const renderCountingNonTeachingOptions = (tableNumber, currentSelectedName) => {
    return [...nonTeaching].sort(compareOfficials).map(nt => {
      const isSelected = currentSelectedName === nt.name;
      const isObs = isObserver(nt.name);
      const isDisc = isDiscipline(nt.name);
      const isGriev = isGrievance(nt.name);
      const ntAssigned = getNonTeachingAssignment(nt.name);
      const otherTables = (ntAssigned.countingTables || []).filter(t => t !== tableNumber);
      const isAlreadyOnOtherTables = otherTables.length > 0;

      let prefix = '';
      if (nt.isExcluded) prefix += '⛔ ';
      if (isObs) {
        prefix += '⚖️ [Allotted: Observer] ';
      } else if (isDisc) {
        prefix += '🛡️ [Allotted: Discipline Charge] ';
      } else if (isGriev) {
        prefix += '🤝 [Allotted: Grievance Cell] ';
      } else if (isSelected) {
        prefix += '✓ (Current) ';
      } else if (isAlreadyOnOtherTables) {
        prefix += `🤝 [Assigned: Table ${otherTables.join(', ')}] `;
      }

      const doubleTag = ntAssigned.polling ? `[⚠️ Double Duty: Booth ${ntAssigned.polling.boothNumber}]` : '';
      const multiTag = ntAssigned.countingTables && ntAssigned.countingTables.length > 1 ? `[${ntAssigned.countingTables.length} Tables]` : '';
      const deptStr = (nt.department || nt.section || 'Office').trim();

      // Note: Do NOT disable for counting table overlap - staff shortage allows same assistant on multiple tables!
      const isDisabled = (isObs || isDisc || isGriev) && !isSelected;

      return `
        <option value="${esc(nt.name)}" ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}>
          ${prefix}${esc(nt.name)} (${esc(nt.designation || 'Staff')}${deptStr ? ` · ${esc(deptStr)}` : ''}${nt.pen ? ` · PEN:${nt.pen}` : ''}) ${multiTag} ${doubleTag}
        </option>
      `;
    }).join('');
  };

  // ─── Render Main UI ─────────────────────────────────────────────────────────

  const renderUI = () => {
    // Preserve scroll position and search field focus before replacing main.innerHTML
    const scrollY = window.scrollY;
    const activeEl = document.activeElement;
    const searchFocusState = (activeEl && (activeEl.id === 'inputFacultySearch' || activeEl.id === 'inputNonTeachingSearch')) ? {
      id: activeEl.id,
      start: activeEl.selectionStart,
      end: activeEl.selectionEnd
    } : null;

    // Calculate Summary Metrics
    const totalFaculty = faculty.length;
    const activeFaculty = faculty.filter(f => !f.isExcluded).length;
    const excludedFaculty = totalFaculty - activeFaculty;
    const postedFaculty = faculty.filter(f => !f.isExcluded && (isObserver(f.name) || isDiscipline(f.name) || isGrievance(f.name) || getPollingAssignment(f.name) || getCountingAssignment(f.name))).length;
    const reserveFaculty = Math.max(0, activeFaculty - postedFaculty);

    const totalNT = nonTeaching.length;
    const activeNT = nonTeaching.filter(n => !n.isExcluded).length;
    const postedNT = nonTeaching.filter(nt => {
      const a = getNonTeachingAssignment(nt.name);
      return !nt.isExcluded && (isObserver(nt.name) || isDiscipline(nt.name) || isGrievance(nt.name) || a.polling || a.counting);
    }).length;
    const reserveNT = Math.max(0, activeNT - postedNT);

    const totalObservers = observers.length;
    const totalDiscipline = disciplineCharge.length;
    const totalGrievance = grievanceCell.length;

    let pollingSlotsFilled = 0;
    let pollingAsstFilled = 0;
    pollingTeams.forEach(t => {
      if (t.presidingOfficer) pollingSlotsFilled++;
      if (t.pollingOfficer1) pollingSlotsFilled++;
      if (t.pollingOfficer2) pollingSlotsFilled++;
      if (t.pollingOfficer3) pollingSlotsFilled++;
      if (t.pollingAssistant) pollingAsstFilled++;
    });

    let countingSlotsFilled = 0;
    let countingAsstFilled = 0;
    let doubleDutyCount = 0;
    const assignedPollingNames = new Set(
      pollingTeams.flatMap(t => [t.presidingOfficer?.name, t.pollingOfficer1?.name, t.pollingOfficer2?.name, t.pollingOfficer3?.name]).filter(Boolean)
    );

    countingTeams.forEach(t => {
      [t.supervisor, t.countingOfficer1, t.countingOfficer2, t.countingOfficer3].filter(Boolean).forEach(f => {
        countingSlotsFilled++;
        if (assignedPollingNames.has(f.name)) doubleDutyCount++;
      });
      if (t.countingAssistant) countingAsstFilled++;
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
                <p class="text-slate-400 text-xs">Allot Observers, Campus Discipline, Grievance Cell, Presiding Officers, Polling Officers, Counting Supervisors, and Assistants.</p>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button id="btnPrintMasterDutyListTop" class="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 flex items-center gap-1.5 shadow" title="Print Consolidated Master Duty List for all Polling and Counting Personnel">
              🖨️ Master Duty List (Polling &amp; Counting)
            </button>
            <button id="btnSaveAll" class="btn btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold shadow">
              💾 Save All Changes
            </button>
            <button id="btnClearAllRosters" class="btn btn-secondary text-xs text-rose-300 hover:text-white hover:bg-rose-600/40 border-rose-500/30 px-3 py-2 flex items-center gap-1.5 font-semibold transition-colors" title="Delete Teaching Faculty, Non-Teaching Staff, and Team Allotments to start fresh">
              🗑️ Delete All Rosters
            </button>
            <a href="#/admin/booths" class="btn btn-secondary text-xs px-3 py-2 flex items-center gap-1">
              🏫 Polling Booths
            </a>
            <a href="#/admin/counting" class="btn btn-secondary text-xs px-3 py-2 flex items-center gap-1">
              🧮 Counting Matrix
            </a>
          </div>
        </div>

        <!-- Metric Ribbon -->
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 no-print">
          <div class="glass p-3 rounded-xl border border-amber-500/40 flex flex-col justify-between bg-amber-950/20">
            <span class="text-[11px] uppercase tracking-wider text-amber-300 font-semibold">Observers</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold text-amber-200 font-mono">${totalObservers}</span>
              <span class="text-xs text-slate-400">Appointed</span>
            </div>
            <span class="text-[10px] text-amber-400 mt-1">General Supervision</span>
          </div>

          <div class="glass p-3 rounded-xl border border-rose-500/40 flex flex-col justify-between bg-rose-950/20">
            <span class="text-[11px] uppercase tracking-wider text-rose-300 font-semibold">Campus Discipline</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold text-rose-200 font-mono">${totalDiscipline}</span>
              <span class="text-xs text-slate-400">In Charge</span>
            </div>
            <span class="text-[10px] text-rose-400 mt-1">Campus Order</span>
          </div>

          <div class="glass p-3 rounded-xl border border-blue-500/40 flex flex-col justify-between bg-blue-950/20">
            <span class="text-[11px] uppercase tracking-wider text-blue-300 font-semibold">Grievance Cell</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold text-blue-200 font-mono">${totalGrievance}</span>
              <span class="text-xs text-slate-400">Appointed</span>
            </div>
            <span class="text-[10px] text-blue-400 mt-1">Queries &amp; Redressal</span>
          </div>

          <div class="glass p-3 rounded-xl border border-white/10 flex flex-col justify-between">
            <span class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Faculty Roster</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold text-white font-mono">${activeFaculty}</span>
              <span class="text-xs text-slate-400">/ ${totalFaculty} Total</span>
            </div>
            <span class="text-[10px] text-amber-300/80 mt-1">${excludedFaculty} excluded from duty</span>
          </div>

          <div class="glass p-3 rounded-xl border border-emerald-500/30 flex flex-col justify-between bg-emerald-950/20">
            <span class="text-[11px] uppercase tracking-wider text-emerald-300 font-semibold">Non-Teaching Staff</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold text-emerald-200 font-mono">${activeNT}</span>
              <span class="text-xs text-slate-400">/ ${totalNT} Total</span>
            </div>
            <span class="text-[10px] text-emerald-400 mt-1">For Polling &amp; Counting Assistants</span>
          </div>

          <div class="glass p-3 rounded-xl border border-indigo-500/30 flex flex-col justify-between bg-indigo-950/20">
            <span class="text-[11px] uppercase tracking-wider text-indigo-300 font-semibold">Polling Teams</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold text-indigo-200 font-mono">${pollingSlotsFilled}</span>
              <span class="text-xs text-slate-400">/ ${booths.length * 3 + pollingTeams.filter(t => t.pollingOfficer3).length} Faculty</span>
            </div>
            <span class="text-[10px] text-indigo-400 mt-1">${pollingAsstFilled} / ${booths.length} Assistants${pollingTeams.filter(t => t.pollingOfficer3).length > 0 ? ` · ${pollingTeams.filter(t => t.pollingOfficer3).length} addl` : ''}</span>
          </div>

          <div class="glass p-3 rounded-xl border border-purple-500/30 flex flex-col justify-between bg-purple-950/20">
            <span class="text-[11px] uppercase tracking-wider text-purple-300 font-semibold">Counting Teams</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold text-purple-200 font-mono">${countingSlotsFilled}</span>
              <span class="text-xs text-slate-400">/ ${booths.length * 3 + countingTeams.filter(t => t.countingOfficer3).length} Faculty</span>
            </div>
            <span class="text-[10px] text-purple-400 mt-1">${countingAsstFilled} / ${booths.length} Assistants${countingTeams.filter(t => t.countingOfficer3).length > 0 ? ` · ${countingTeams.filter(t => t.countingOfficer3).length} addl` : ''}</span>
          </div>

          <div class="glass p-3 rounded-xl border ${doubleDutyCount > 0 ? 'border-amber-500/50 bg-amber-950/30' : 'border-emerald-500/30 bg-emerald-950/20'} flex flex-col justify-between">
            <span class="text-[11px] uppercase tracking-wider ${doubleDutyCount > 0 ? 'text-amber-300' : 'text-emerald-300'} font-semibold">Double Duty Alert</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold ${doubleDutyCount > 0 ? 'text-amber-200' : 'text-emerald-200'} font-mono">${doubleDutyCount}</span>
              <span class="text-xs text-slate-400">Staff Assigned</span>
            </div>
            <span class="text-[10px] ${doubleDutyCount > 0 ? 'text-amber-400' : 'text-emerald-400'} mt-1">${doubleDutyCount > 0 ? 'Serving Polling &amp; Counting' : 'Clean Separation (0 Overlap)'}</span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex border-b border-white/10 no-print gap-2 overflow-x-auto">
          <button class="nav-tab px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'polling' ? 'border-indigo-500 text-indigo-300 bg-white/5' : 'border-transparent text-slate-400 hover:text-white'}" data-tab="polling">
            🏫 Polling Booth Teams (${booths.length})
            ${doubleDutyCount > 0 ? `<span class="bg-amber-500 text-black text-[10px] px-1.5 py-0.2 rounded-full font-bold" title="${doubleDutyCount} personnel assigned to both Polling and Counting">${doubleDutyCount}</span>` : ''}
          </button>
          <button class="nav-tab px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'counting' ? 'border-purple-500 text-purple-300 bg-white/5' : 'border-transparent text-slate-400 hover:text-white'}" data-tab="counting">
            🧮 Counting Table Teams (${booths.length})
            ${doubleDutyCount > 0 ? `<span class="bg-amber-500 text-black text-[10px] px-1.5 py-0.2 rounded-full font-bold" title="${doubleDutyCount} personnel assigned to both Polling and Counting">${doubleDutyCount}</span>` : ''}
          </button>
          <button class="nav-tab px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'faculty' ? 'border-blue-500 text-blue-300 bg-white/5' : 'border-transparent text-slate-400 hover:text-white'}" data-tab="faculty">
            📋 Teaching Faculty Roster (${faculty.length})
          </button>
          <button class="nav-tab px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'nonteaching' ? 'border-emerald-500 text-emerald-300 bg-white/5' : 'border-transparent text-slate-400 hover:text-white'}" data-tab="nonteaching">
            🤝 Non-Teaching Staff Roster (${nonTeaching.length})
          </button>
        </div>

        <!-- Tab 1: Polling Booth Teams -->
        <div id="tabContent-polling" class="${activeTab === 'polling' ? '' : 'hidden'} space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3 bg-white/5 p-4 rounded-xl border border-white/10 no-print">
            <div>
              <h4 class="font-bold text-white text-base">Polling Booth Officials Allotment</h4>
              <p class="text-xs text-slate-400">Each booth needs 1 Presiding Officer (Seniormost regular faculty), 2 Polling Officers (Regular faculty, Guest faculty, or Librarians), and 1 Polling Assistant (Non-teaching staff). Double duty with counting tables is strictly minimized.</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button id="btnAutoAllotPolling" class="btn btn-primary bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 flex items-center gap-1.5 shadow" title="Auto-allot empty polling slots while preserving all manually chosen officials">
                ⚡ Auto-Allot Polling Teams
              </button>
              <button id="btnOpenObserverModal" class="btn btn-secondary border-amber-500/50 text-amber-300 hover:text-white hover:bg-amber-600/30 text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold shadow" title="Appoint Election Observers">
                ⚖️ Allot Observers (${observers.length})
              </button>
              <button id="btnOpenDisciplineModal" class="btn btn-secondary border-rose-500/50 text-rose-300 hover:text-white hover:bg-rose-600/30 text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold shadow" title="Appoint Campus Discipline Committee">
                🛡️ Allot Discipline (${disciplineCharge.length})
              </button>
              <button id="btnOpenGrievanceModal" class="btn btn-secondary border-blue-500/50 text-blue-300 hover:text-white hover:bg-blue-600/30 text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold shadow" title="Appoint Grievance Committee">
                🤝 Allot Grievance (${grievanceCell.length})
              </button>
              <button id="btnPrintMasterDutyListPolling" class="btn btn-primary bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 flex items-center gap-1.5 shadow" title="Print Master Duty List with Observers, Discipline Committee, and Grievance Cell">
                🖨️ Master Duty List
              </button>
              <button id="btnPrintPollingOrders" class="btn btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5">
                🖨️ Print Appointment Orders
              </button>
              <button id="btnClearPollingTeams" class="btn btn-secondary text-xs text-red-300 hover:text-red-200 hover:bg-red-500/20 px-3 py-2">
                🗑️ Clear All
              </button>
            </div>
          </div>

          <!-- Election Observers -->
          <div class="glass rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-slate-900/40 p-4 shadow-lg no-print">
            <div class="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-amber-500/20">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-lg shadow-inner">⚖️</div>
                <div>
                  <h5 class="font-bold text-white text-sm flex items-center gap-2">
                    Election Observers
                    <span class="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">${observers.length} Appointed</span>
                  </h5>
                  <p class="text-[11px] text-slate-400">Senior officials appointed to oversee the election process across polling booths and counting tables. Displayed 1st on the Master Duty List.</p>
                </div>
              </div>
              <button id="btnManageObserversBanner" class="btn btn-secondary border-amber-500/50 text-amber-300 hover:bg-amber-500/20 text-xs px-3 py-1.5 flex items-center gap-1 font-semibold">
                ➕ Add / Manage Observers
              </button>
            </div>
            ${observers.length === 0 ? `
              <div class="py-3 text-center text-slate-400 text-xs">
                No observers appointed yet. Click <button class="text-amber-300 underline font-semibold btn-manage-observers-inline">Allot Observers</button> to appoint faculty or staff as election observers.
              </div>
            ` : `
              <div class="flex items-center gap-2 flex-wrap pt-3">
                ${observers.map((obs, idx) => `
                  <div class="flex items-center gap-2 bg-slate-900/90 border border-amber-500/40 rounded-lg px-3 py-1.5 shadow-sm">
                    <span class="text-amber-400 text-xs font-mono font-bold">#${idx + 1}</span>
                    <div>
                      <div class="font-bold text-white text-xs">${esc(obs.name)}</div>
                      <div class="text-[10px] text-slate-400">${esc(obs.department || obs.designation || 'Official')}${obs.pen ? ` · PEN: ${esc(obs.pen)}` : ''}</div>
                    </div>
                    <button class="text-rose-400 hover:text-rose-200 text-xs ml-1.5 btn-quick-remove-observer" data-name="${esc(obs.name)}" title="Remove observer">✖</button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Campus Discipline -->
          <div class="glass rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-950/30 via-slate-900/60 to-slate-900/40 p-4 shadow-lg no-print">
            <div class="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-rose-500/20">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center text-lg shadow-inner">🛡️</div>
                <div>
                  <h5 class="font-bold text-white text-sm flex items-center gap-2">
                    Campus Discipline Committee
                    <span class="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full">${disciplineCharge.length} Appointed</span>
                  </h5>
                  <p class="text-[11px] text-slate-400">Officials appointed to assist with campus discipline and order. Displayed 2nd on the Master Duty List.</p>
                </div>
              </div>
              <button id="btnManageDisciplineBanner" class="btn btn-secondary border-rose-500/50 text-rose-300 hover:bg-rose-500/20 text-xs px-3 py-1.5 flex items-center gap-1 font-semibold">
                ➕ Add / Manage Discipline
              </button>
            </div>
            ${disciplineCharge.length === 0 ? `
              <div class="py-3 text-center text-slate-400 text-xs">
                No discipline personnel appointed yet. Click <button class="text-rose-300 underline font-semibold btn-manage-discipline-inline">Allot Discipline</button> to appoint faculty or staff for campus discipline duty.
              </div>
            ` : `
              <div class="flex items-center gap-2 flex-wrap pt-3">
                ${disciplineCharge.map((disc, idx) => `
                  <div class="flex items-center gap-2 bg-slate-900/90 border border-rose-500/40 rounded-lg px-3 py-1.5 shadow-sm">
                    <span class="text-rose-400 text-xs font-mono font-bold">#${idx + 1}</span>
                    <div>
                      <div class="font-bold text-white text-xs">${esc(disc.name)}</div>
                      <div class="text-[10px] text-slate-400">${esc(disc.department || disc.designation || 'Staff')}${disc.pen ? ` · PEN: ${esc(disc.pen)}` : ''}</div>
                    </div>
                    <button class="text-rose-400 hover:text-rose-200 text-xs ml-1.5 btn-quick-remove-discipline" data-name="${esc(disc.name)}" title="Remove from discipline committee">✖</button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Grievance Redressal Committee -->
          <div class="glass rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-slate-900/40 p-4 shadow-lg no-print">
            <div class="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-blue-500/20">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center text-lg shadow-inner">🤝</div>
                <div>
                  <h5 class="font-bold text-white text-sm flex items-center gap-2">
                    Grievance Redressal Committee
                    <span class="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full">${grievanceCell.length} Appointed</span>
                  </h5>
                  <p class="text-[11px] text-slate-400">Officials appointed to handle election-related queries, appeals, and student grievances. Listed in Section 3 after Discipline Committee.</p>
                </div>
              </div>
              <button id="btnManageGrievanceBanner" class="btn btn-secondary border-blue-500/50 text-blue-300 hover:bg-blue-500/20 text-xs px-3 py-1.5 flex items-center gap-1 font-semibold">
                ➕ Add / Manage Grievance Committee
              </button>
            </div>
            ${grievanceCell.length === 0 ? `
              <div class="py-3 text-center text-slate-400 text-xs">
                No grievance committee personnel appointed yet. Click <button class="text-blue-300 underline font-semibold btn-manage-grievance-inline">Allot Grievance</button> to appoint officials.
              </div>
            ` : `
              <div class="flex items-center gap-2 flex-wrap pt-3">
                ${grievanceCell.map((g, idx) => `
                  <div class="flex items-center gap-2 bg-slate-900/90 border border-blue-500/40 rounded-lg px-3 py-1.5 shadow-sm">
                    <span class="text-blue-400 text-xs font-mono font-bold">#${idx + 1}</span>
                    <div>
                      <div class="font-bold text-white text-xs">${esc(g.name)}</div>
                      <div class="text-[10px] text-slate-400">${esc(g.department || g.designation || 'Official')}${g.pen ? ` · PEN: ${esc(g.pen)}` : ''}</div>
                    </div>
                    <button class="text-rose-400 hover:text-rose-200 text-xs ml-1.5 btn-quick-remove-grievance" data-name="${esc(g.name)}" title="Remove from grievance cell">✖</button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="pollingTeamsGrid">
            ${booths.map((b, idx) => {
              const team = pollingTeams.find(t => t.boothNumber === b.boothNumber) || {
                boothNumber: b.boothNumber,
                roomName: b.roomName || `Booth ${b.boothNumber}`,
                presidingOfficer: null,
                pollingOfficer1: null,
                pollingOfficer2: null,
                pollingOfficer3: null,
                pollingAssistant: null
              };

              // Check hierarchy: is any Polling Officer more senior than the Presiding Officer?
              const pRank = team.presidingOfficer ? team.presidingOfficer.seniority : 999;
              const po1Rank = team.pollingOfficer1 ? team.pollingOfficer1.seniority : 999;
              const po2Rank = team.pollingOfficer2 ? team.pollingOfficer2.seniority : 999;
              const po3Rank = team.pollingOfficer3 ? team.pollingOfficer3.seniority : 999;
              const hierarchyViolation = (po1Rank < pRank) || (po2Rank < pRank) || (po3Rank < pRank);

              // Double duty checks for Polling Booth
              const pDouble = team.presidingOfficer ? getCountingAssignment(team.presidingOfficer.name) : null;
              const po1Double = team.pollingOfficer1 ? getCountingAssignment(team.pollingOfficer1.name) : null;
              const po2Double = team.pollingOfficer2 ? getCountingAssignment(team.pollingOfficer2.name) : null;
              const po3Double = team.pollingOfficer3 ? getCountingAssignment(team.pollingOfficer3.name) : null;
              const asstDouble = team.pollingAssistant ? getNonTeachingAssignment(team.pollingAssistant.name).counting : null;
              const hasDoubleDuty = !!(pDouble || po1Double || po2Double || po3Double || asstDouble);

              return `
                <div class="glass rounded-xl border ${hierarchyViolation ? 'border-amber-500/70 bg-amber-950/20' : (hasDoubleDuty ? 'border-amber-500/50 bg-amber-950/20' : 'border-white/10')} p-4 flex flex-col justify-between space-y-3 relative group" data-booth="${b.boothNumber}">
                  <div>
                    <div class="flex items-center justify-between pb-2.5 border-b border-white/10 gap-2">
                      <div>
                        <span class="font-mono text-indigo-400 font-bold text-sm">Booth ${b.boothNumber}</span>
                        <h5 class="font-bold text-white text-base">${esc(b.roomName || `Booth ${b.boothNumber}`)}</h5>
                      </div>
                      <div class="flex items-center gap-1.5 flex-wrap justify-end">
                        <span class="text-[11px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1 shadow-sm font-semibold" title="Total Voters Assigned to Booth ${b.boothNumber}">
                          <span>🗳️</span> <span>${getBoothVoterCount(b)} voters</span>
                        </span>
                        ${hasDoubleDuty ? `
                          <span class="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1" title="One or more officials in this booth are also assigned to Counting duty">
                            ⚠️ Double Duty Flag
                          </span>
                        ` : `
                          <span class="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">Fresh Team</span>
                        `}
                        <span class="text-[11px] font-mono bg-white/10 text-slate-300 px-2 py-0.5 rounded border border-white/10" title="Assigned Classes">
                          ${b.classes ? `${b.classes.length} classes` : '0 classes'}
                        </span>
                      </div>
                    </div>

                    ${hierarchyViolation ? `
                      <div class="mt-2.5 p-2 rounded bg-amber-500/20 border border-amber-500/40 text-[11px] text-amber-200 flex items-center justify-between gap-1">
                        <span>⚠️ Hierarchy Alert: Polling Officer is more senior than Presiding Officer!</span>
                        <button class="btn btn-secondary text-[10px] py-0.5 px-1.5 btn-fix-hierarchy-polling" data-booth="${b.boothNumber}">Swap</button>
                      </div>
                    ` : ''}

                    <div class="space-y-3 pt-3">
                      <!-- Presiding Officer -->
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                            <span>👑</span> Presiding Officer <span class="text-[10px] text-slate-400 font-normal">(Seniormost Regular Faculty)</span>
                          </label>
                          ${team.presidingOfficer ? `<span class="text-[10px] font-mono text-amber-200 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">Rank #${team.presidingOfficer.seniority}</span>` : ''}
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-indigo-400 focus:outline-none select-polling-role" data-booth="${b.boothNumber}" data-role="presidingOfficer">
                          <option value="">-- Select Presiding Officer --</option>
                          ${renderPollingFacultyOptions(b.boothNumber, 'presidingOfficer', team.presidingOfficer?.name)}
                        </select>
                        ${pDouble ? `<p class="text-[10px] text-amber-300 mt-1">⚠️ Double Duty: Serving at Counting Table ${pDouble.tableNumber} (${pDouble.role})</p>` : ''}
                      </div>

                      <!-- Polling Officer (Slot 1) -->
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                            <span>👤</span> Polling Officer
                          </label>
                          ${team.pollingOfficer1 ? `<span class="text-[10px] font-mono text-indigo-200 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">Rank #${team.pollingOfficer1.seniority}</span>` : ''}
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-indigo-400 focus:outline-none select-polling-role" data-booth="${b.boothNumber}" data-role="pollingOfficer1">
                          <option value="">-- Select Polling Officer --</option>
                          ${renderPollingFacultyOptions(b.boothNumber, 'pollingOfficer1', team.pollingOfficer1?.name)}
                        </select>
                        ${po1Double ? `<p class="text-[10px] text-amber-300 mt-1">⚠️ Double Duty: Serving at Counting Table ${po1Double.tableNumber} (${po1Double.role})</p>` : ''}
                      </div>

                      <!-- Polling Officer (Slot 2) -->
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                            <span>👤</span> Polling Officer
                          </label>
                          ${team.pollingOfficer2 ? `<span class="text-[10px] font-mono text-indigo-200 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">Rank #${team.pollingOfficer2.seniority}</span>` : ''}
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-indigo-400 focus:outline-none select-polling-role" data-booth="${b.boothNumber}" data-role="pollingOfficer2">
                          <option value="">-- Select Polling Officer --</option>
                          ${renderPollingFacultyOptions(b.boothNumber, 'pollingOfficer2', team.pollingOfficer2?.name)}
                        </select>
                        ${po2Double ? `<p class="text-[10px] text-amber-300 mt-1">⚠️ Double Duty: Serving at Counting Table ${po2Double.tableNumber} (${po2Double.role})</p>` : ''}
                      </div>

                      <!-- Polling Officer (Slot 3 - Optional / High Voter Booth) -->
                      ${team.pollingOfficer3 || team.showPollingOfficer3 ? `
                        <div class="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 space-y-1.5 transition-all">
                          <div class="flex items-center justify-between mb-0.5">
                            <label class="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                              <span>👤</span> Polling Officer 3 <span class="text-[10px] text-indigo-400 font-normal">(Additional · Optional)</span>
                            </label>
                            <div class="flex items-center gap-1.5">
                              ${team.pollingOfficer3 ? `<span class="text-[10px] font-mono text-indigo-200 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">Rank #${team.pollingOfficer3.seniority}</span>` : ''}
                              <button type="button" class="text-[10px] text-rose-400 hover:text-rose-200 hover:underline btn-remove-polling-officer3 flex items-center gap-0.5" data-booth="${b.boothNumber}" title="Remove 3rd Polling Officer slot">
                                <span>✖</span> Remove
                              </button>
                            </div>
                          </div>
                          <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-indigo-400 focus:outline-none select-polling-role" data-booth="${b.boothNumber}" data-role="pollingOfficer3">
                            <option value="">-- Select Additional Polling Officer --</option>
                            ${renderPollingFacultyOptions(b.boothNumber, 'pollingOfficer3', team.pollingOfficer3?.name)}
                          </select>
                          ${po3Double ? `<p class="text-[10px] text-amber-300 mt-1">⚠️ Double Duty: Serving at Counting Table ${po3Double.tableNumber} (${po3Double.role})</p>` : ''}
                        </div>
                      ` : `
                        <div class="pt-0.5">
                          <button type="button" class="w-full py-1.5 px-2 rounded-lg border border-dashed border-indigo-500/40 text-[11px] text-indigo-300 hover:text-white hover:bg-indigo-600/20 hover:border-indigo-400 transition flex items-center justify-center gap-1.5 btn-add-polling-officer3" data-booth="${b.boothNumber}" title="Add a 3rd Polling Officer manually for high-voter booths">
                            <span>➕</span> Add 3rd Polling Officer <span class="text-[10px] text-indigo-400/80 font-normal">(Optional / High Voters)</span>
                          </button>
                        </div>
                      `}

                      <!-- Polling Assistant (Non Teaching) -->
                      <div class="pt-1 border-t border-white/10">
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                            <span>🤝</span> Polling Assistant <span class="text-[10px] text-slate-400 font-normal">(Non-Teaching)</span>
                          </label>
                          <a href="javascript:void(0)" class="text-[10px] text-emerald-400 hover:underline btn-goto-nonteaching">Manage List</a>
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-emerald-400 focus:outline-none select-polling-assistant" data-booth="${b.boothNumber}">
                          <option value="">-- Select Non-Teaching Staff --</option>
                          ${renderPollingNonTeachingOptions(b.boothNumber, team.pollingAssistant?.name)}
                        </select>
                        ${asstDouble ? `<p class="text-[10px] text-amber-300 mt-1">⚠️ Double Duty: Serving at Counting Table ${asstDouble.tableNumber} (Counting Assistant)</p>` : ''}
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
              <p class="text-xs text-slate-400">Each table needs 1 Counting Supervisor (Seniormost at table), 2 Counting Officers, and 1 Counting Assistant. Staff serving polling duty are flagged with double duty.</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button id="btnAssignCountingAssistantMulti" class="btn btn-secondary border-emerald-500/50 text-emerald-300 hover:text-white hover:bg-emerald-600/30 text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold shadow" title="Assign the same Counting Assistant to multiple tables simultaneously due to staff shortage">
                🤝 Multi-Table Assistant
              </button>
              <button id="btnAutoAllotCountingFresh" class="btn btn-primary bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2 flex items-center gap-1.5 shadow" title="Auto-allot empty counting slots while preserving all manually chosen officials">
                ⚡ Auto-Allot (Fresh Faculty First)
              </button>
              <button id="btnPrintMasterDutyListCounting" class="btn btn-primary bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 flex items-center gap-1.5 shadow" title="Print Master Duty List with Observers 1st and Department-wise Officials">
                🖨️ Master Duty List
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
                countingOfficer3: null,
                countingAssistant: null
              };

              const supRank = team.supervisor ? team.supervisor.seniority : 999;
              const co1Rank = team.countingOfficer1 ? team.countingOfficer1.seniority : 999;
              const co2Rank = team.countingOfficer2 ? team.countingOfficer2.seniority : 999;
              const co3Rank = team.countingOfficer3 ? team.countingOfficer3.seniority : 999;
              const hierarchyViolation = (co1Rank < supRank) || (co2Rank < supRank) || (co3Rank < supRank);

              const supDouble = team.supervisor ? getPollingAssignment(team.supervisor.name) : null;
              const co1Double = team.countingOfficer1 ? getPollingAssignment(team.countingOfficer1.name) : null;
              const co2Double = team.countingOfficer2 ? getPollingAssignment(team.countingOfficer2.name) : null;
              const co3Double = team.countingOfficer3 ? getPollingAssignment(team.countingOfficer3.name) : null;
              const asstDouble = team.countingAssistant ? getNonTeachingAssignment(team.countingAssistant.name).polling : null;
              const hasDoubleDuty = !!(supDouble || co1Double || co2Double || co3Double || asstDouble);

              return `
                <div class="glass rounded-xl border ${hasDoubleDuty ? 'border-amber-500/50 bg-amber-950/20' : 'border-white/10'} p-4 flex flex-col justify-between space-y-3 relative group" data-table="${b.boothNumber}">
                  <div>
                    <div class="flex items-center justify-between pb-2.5 border-b border-white/10 gap-2">
                      <div>
                        <span class="font-mono text-purple-400 font-bold text-sm">Counting Table ${b.boothNumber}</span>
                        <h5 class="font-bold text-white text-base">${esc(b.roomName || `Table ${b.boothNumber}`)}</h5>
                      </div>
                      <div class="flex items-center gap-1.5 flex-wrap justify-end">
                        <span class="text-[11px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 flex items-center gap-1 shadow-sm font-semibold" title="Total Voters Assigned to Booth ${b.boothNumber}">
                          <span>🗳️</span> <span>${getBoothVoterCount(b)} voters</span>
                        </span>
                        ${hasDoubleDuty ? `
                          <span class="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                            ⚠️ Double Duty Flag
                          </span>
                        ` : `
                          <span class="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">Fresh Team</span>
                        `}
                      </div>
                    </div>

                    ${hierarchyViolation ? `
                      <div class="mt-2.5 p-2 rounded bg-amber-500/20 border border-amber-500/40 text-[11px] text-amber-200 flex items-center justify-between gap-1">
                        <span>⚠️ Hierarchy Alert: Counting Officer is more senior than Supervisor!</span>
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
                          ${renderCountingFacultyOptions(b.boothNumber, 'supervisor', team.supervisor?.name)}
                        </select>
                        ${supDouble ? `<p class="text-[10px] text-amber-300 mt-1">⚠️ Double Duty: Serving at Polling Booth ${supDouble.boothNumber} (${supDouble.role})</p>` : ''}
                      </div>

                      <!-- Counting Officer (Slot 1) -->
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                            <span>👤</span> Counting Officer
                          </label>
                          ${team.countingOfficer1 ? `<span class="text-[10px] font-mono text-indigo-200 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">Rank #${team.countingOfficer1.seniority}</span>` : ''}
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-purple-400 focus:outline-none select-counting-role" data-table="${b.boothNumber}" data-role="countingOfficer1">
                          <option value="">-- Select Counting Officer --</option>
                          ${renderCountingFacultyOptions(b.boothNumber, 'countingOfficer1', team.countingOfficer1?.name)}
                        </select>
                        ${co1Double ? `<p class="text-[10px] text-amber-300 mt-1">⚠️ Double Duty: Serving at Polling Booth ${co1Double.boothNumber} (${co1Double.role})</p>` : ''}
                      </div>

                      <!-- Counting Officer (Slot 2) -->
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                            <span>👤</span> Counting Officer
                          </label>
                          ${team.countingOfficer2 ? `<span class="text-[10px] font-mono text-indigo-200 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">Rank #${team.countingOfficer2.seniority}</span>` : ''}
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-purple-400 focus:outline-none select-counting-role" data-table="${b.boothNumber}" data-role="countingOfficer2">
                          <option value="">-- Select Counting Officer --</option>
                          ${renderCountingFacultyOptions(b.boothNumber, 'countingOfficer2', team.countingOfficer2?.name)}
                        </select>
                        ${co2Double ? `<p class="text-[10px] text-amber-300 mt-1">⚠️ Double Duty: Serving at Polling Booth ${co2Double.boothNumber} (${co2Double.role})</p>` : ''}
                      </div>

                      <!-- Counting Officer (Slot 3 - Optional / High Load Table) -->
                      ${team.countingOfficer3 || team.showCountingOfficer3 ? `
                        <div class="p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/30 space-y-1.5 transition-all">
                          <div class="flex items-center justify-between mb-0.5">
                            <label class="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                              <span>👤</span> Counting Officer 3 <span class="text-[10px] text-purple-400 font-normal">(Additional · Optional)</span>
                            </label>
                            <div class="flex items-center gap-1.5">
                              ${team.countingOfficer3 ? `<span class="text-[10px] font-mono text-purple-200 bg-purple-500/20 px-1.5 py-0.2 rounded border border-purple-500/30">Rank #${team.countingOfficer3.seniority}</span>` : ''}
                              <button type="button" class="text-[10px] text-rose-400 hover:text-rose-200 hover:underline btn-remove-counting-officer3 flex items-center gap-0.5" data-table="${b.boothNumber}" title="Remove 3rd Counting Officer slot">
                                <span>✖</span> Remove
                              </button>
                            </div>
                          </div>
                          <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-purple-400 focus:outline-none select-counting-role" data-table="${b.boothNumber}" data-role="countingOfficer3">
                            <option value="">-- Select Additional Counting Officer --</option>
                            ${renderCountingFacultyOptions(b.boothNumber, 'countingOfficer3', team.countingOfficer3?.name)}
                          </select>
                          ${co3Double ? `<p class="text-[10px] text-amber-300 mt-1">⚠️ Double Duty: Serving at Polling Booth ${co3Double.boothNumber} (${co3Double.role})</p>` : ''}
                        </div>
                      ` : `
                        <div class="pt-0.5">
                          <button type="button" class="w-full py-1.5 px-2 rounded-lg border border-dashed border-purple-500/40 text-[11px] text-purple-300 hover:text-white hover:bg-purple-600/20 hover:border-purple-400 transition flex items-center justify-center gap-1.5 btn-add-counting-officer3" data-table="${b.boothNumber}" title="Add a 3rd Counting Officer manually for high-load tables">
                            <span>➕</span> Add 3rd Counting Officer <span class="text-[10px] text-purple-400/80 font-normal">(Optional / High Load)</span>
                          </button>
                        </div>
                      `}

                      <!-- Counting Assistant (Non Teaching) -->
                      <div class="pt-1 border-t border-white/10">
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                            <span>🤝</span> Counting Assistant <span class="text-[10px] text-slate-400 font-normal">(Non-Teaching)</span>
                          </label>
                          <a href="javascript:void(0)" class="text-[10px] text-emerald-400 hover:underline btn-goto-nonteaching">Manage List</a>
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-purple-400 focus:outline-none select-counting-assistant" data-table="${b.boothNumber}">
                          <option value="">-- Select Non-Teaching Staff --</option>
                          ${renderCountingNonTeachingOptions(b.boothNumber, team.countingAssistant?.name)}
                        </select>
                        ${(() => {
                          const asstAssignment = team.countingAssistant ? getNonTeachingAssignment(team.countingAssistant.name) : null;
                          const otherTables = asstAssignment ? (asstAssignment.countingTables || []).filter(t => t !== b.boothNumber) : [];
                          if (otherTables.length > 0) {
                            return `<p class="text-[10px] text-purple-300 font-semibold mt-1 flex items-center gap-1"><span>🔗</span> Also assisting Table ${otherTables.join(', ')} (${asstAssignment.countingTables.length} tables total)</p>`;
                          }
                          return '';
                        })()}
                        ${asstDouble ? `<p class="text-[10px] text-amber-300 mt-1">⚠️ Double Duty: Serving at Polling Booth ${asstDouble.boothNumber}</p>` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Tab 3: Faculty Seniority Roster (Teaching) -->
        <div id="tabContent-faculty" class="${activeTab === 'faculty' ? '' : 'hidden'} space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3 bg-white/5 p-4 rounded-xl border border-white/10 no-print">
            <div>
              <h4 class="font-bold text-white text-base">Teaching Faculty Seniority List (${faculty.length} Faculty)</h4>
              <p class="text-xs text-slate-400">Official seniority list for Presiding Officers and Polling Officers. Upload Excel/CSV to replace or update.</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <label class="btn btn-primary bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 cursor-pointer flex items-center gap-1.5 shadow">
                📥 Import Faculty (Excel / CSV)
                <input type="file" id="fileFacultyImport" accept=".xlsx,.xls,.csv" class="hidden" />
              </label>
              <button id="btnExportFaculty" class="btn btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5">
                📤 Export Roster
              </button>
              <button id="btnDownloadFacultyTemplate" class="btn btn-secondary text-xs text-sky-300 hover:bg-sky-500/20 px-3 py-2 flex items-center gap-1.5" title="Download sample CSV template for Teaching Faculty">
                📄 Download CSV Template
              </button>
              <button id="btnClearFacultyRoster" class="btn btn-secondary text-xs text-rose-300 hover:text-white hover:bg-rose-600/30 border-rose-500/20 px-3 py-2 flex items-center gap-1" title="Clear teaching faculty roster to upload a fresh file">
                🗑️ Clear Faculty Roster
              </button>
            </div>
          </div>

          <!-- Search and Filter Bar -->
          <div class="flex items-center justify-between gap-3 flex-wrap no-print">
            <div class="flex-1 min-w-[240px]">
              <input type="text" id="inputFacultySearch" value="${esc(facultySearch)}" placeholder="Search teaching staff by name, PEN, designation, department..." autocomplete="off" spellcheck="false" class="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-400" />
            </div>
            <div class="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button class="filter-faculty-btn px-3 py-1 rounded-lg font-semibold transition-colors ${facultyFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}" data-filter="all">All (${faculty.length})</button>
              <button class="filter-faculty-btn px-3 py-1 rounded-lg font-semibold transition-colors ${facultyFilter === 'posted' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}" data-filter="posted">Posted (${postedFaculty})</button>
              <button class="filter-faculty-btn px-3 py-1 rounded-lg font-semibold transition-colors ${facultyFilter === 'reserve' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}" data-filter="reserve">Reserve (${reserveFaculty})</button>
              <button class="filter-faculty-btn px-3 py-1 rounded-lg font-semibold transition-colors ${facultyFilter === 'excluded' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}" data-filter="excluded">Excluded (${excludedFaculty})</button>
            </div>
          </div>

          <!-- Faculty Table -->
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
                    <th>Status</th>
                    <th class="text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5" id="facultyTableBody">
                  ${(() => {
                    if (faculty.length === 0) {
                      return `
                        <tr>
                          <td colspan="8" class="text-center py-12 text-slate-400">
                            <div class="space-y-3 max-w-md mx-auto">
                              <span class="text-4xl block">📋</span>
                              <h5 class="text-white font-bold text-sm">Teaching Faculty Roster is Empty</h5>
                              <p class="text-xs text-slate-400 leading-relaxed">
                                No teaching faculty uploaded yet. Upload your College Faculty Seniority Excel / CSV file or download our template format.
                              </p>
                              <div class="flex items-center justify-center gap-2 pt-2">
                                <label class="btn btn-primary bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 cursor-pointer flex items-center gap-1.5 shadow">
                                  📥 Import Faculty (Excel / CSV)
                                  <input type="file" id="fileFacultyImportEmpty" accept=".xlsx,.xls,.csv" class="hidden" />
                                </label>
                                <button id="btnDownloadFacultyTemplateEmpty" class="btn btn-secondary text-xs text-sky-300 hover:bg-sky-500/20 px-3 py-2 flex items-center gap-1">
                                  📄 Download CSV Template
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      `;
                    }
                    const filtered = faculty.filter(f => {
                      const isObs = isObserver(f.name);
                      const isDisc = isDiscipline(f.name);
                      const isGriev = isGrievance(f.name);
                      const pDuty = getPollingAssignment(f.name);
                      const cDuty = getCountingAssignment(f.name);
                      const isPosted = isObs || isDisc || isGriev || pDuty || cDuty;

                      if (facultyFilter === 'active' && f.isExcluded) return false;
                      if (facultyFilter === 'excluded' && !f.isExcluded) return false;
                      if (facultyFilter === 'posted' && (f.isExcluded || !isPosted)) return false;
                      if (facultyFilter === 'reserve' && (f.isExcluded || isPosted)) return false;
                      if (facultySearch) {
                        const s = facultySearch.toLowerCase().trim();
                        return (f.name || '').toLowerCase().includes(s) ||
                               String(f.pen || '').toLowerCase().includes(s) ||
                               (f.designation || '').toLowerCase().includes(s) ||
                               (f.department || '').toLowerCase().includes(s);
                      }
                      return true;
                    });
                    if (filtered.length === 0) {
                      return `<tr><td colspan="8" class="text-center py-8 text-slate-400">No teaching staff found matching "<strong>${esc(facultySearch)}</strong>".</td></tr>`;
                    }
                    return filtered.map(getFacultyRowHtml).join('');
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab 4: Non-Teaching Staff Roster (Separate List) -->
        <div id="tabContent-nonteaching" class="${activeTab === 'nonteaching' ? '' : 'hidden'} space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3 bg-white/5 p-4 rounded-xl border border-white/10 no-print">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl">🤝</span>
                <h4 class="font-bold text-white text-base">Non-Teaching Staff Roster (${nonTeaching.length} Staff)</h4>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Separate official list for Polling Assistants and Counting Assistants. Upload your independent Non-Teaching Staff list as Excel or CSV.</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <label class="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 cursor-pointer flex items-center gap-1.5 shadow">
                📥 Upload Non-Teaching List (Excel / CSV)
                <input type="file" id="fileNonTeachingImport" accept=".xlsx,.xls,.csv" class="hidden" />
              </label>
              <button id="btnAddStaffModalBtn" class="btn btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5">
                ➕ Add Staff Member
              </button>
              <button id="btnExportNonTeaching" class="btn btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5">
                📤 Export CSV
              </button>
              <button id="btnDownloadNTTemplate" class="btn btn-secondary text-xs text-sky-300 hover:bg-sky-500/20 px-3 py-2 flex items-center gap-1.5" title="Download sample CSV template for Non-Teaching Staff">
                📄 Download CSV Template
              </button>
              <button id="btnClearNonTeachingList" class="btn btn-secondary text-xs text-rose-300 hover:text-white hover:bg-rose-600/30 border-rose-500/20 px-3 py-2 flex items-center gap-1" title="Clear non-teaching staff roster to upload a fresh file">
                🗑️ Clear Non-Teaching Roster
              </button>
            </div>
          </div>

          <!-- Add Staff Quick Form (Hidden by default) -->
          <div id="addStaffPanel" class="hidden bg-slate-900 border border-emerald-500/30 p-4 rounded-xl space-y-3 no-print">
            <h5 class="font-bold text-emerald-300 text-sm flex items-center gap-1.5">
              <span>➕</span> Add New Non-Teaching Staff Member
            </h5>
            <div class="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <input type="text" id="newStaffName" placeholder="Full Name (e.g. Sri. K. Ramesh)" class="bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white" />
              <input type="text" id="newStaffDesig" placeholder="Designation (e.g. Senior Clerk, Office Attendant)" class="bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white" />
              <input type="text" id="newStaffDept" placeholder="Department (e.g. Office, Chemistry)" class="bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white" />
              <input type="text" id="newStaffPen" placeholder="PEN (Optional)" class="bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white" />
              <div class="flex gap-2">
                <button id="btnConfirmAddStaff" class="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-xs flex-1 font-bold">Save Staff</button>
                <button id="btnCancelAddStaff" class="btn btn-secondary text-xs">Cancel</button>
              </div>
            </div>
          </div>

          <!-- Search and Filter Bar -->
          <div class="flex items-center justify-between gap-3 flex-wrap no-print">
            <div class="flex-1 min-w-[240px]">
              <input type="text" id="inputNonTeachingSearch" value="${esc(nonTeachingSearch)}" placeholder="Search non-teaching staff by name, PEN, designation, department..." autocomplete="off" spellcheck="false" class="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400" />
            </div>
            <div class="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button class="filter-nt-btn px-3 py-1 rounded-lg font-semibold transition-colors ${nonTeachingFilter === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}" data-filter="all">All (${nonTeaching.length})</button>
              <button class="filter-nt-btn px-3 py-1 rounded-lg font-semibold transition-colors ${nonTeachingFilter === 'posted' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}" data-filter="posted">Posted (${postedNT})</button>
              <button class="filter-nt-btn px-3 py-1 rounded-lg font-semibold transition-colors ${nonTeachingFilter === 'reserve' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}" data-filter="reserve">Reserve (${reserveNT})</button>
              <button class="filter-nt-btn px-3 py-1 rounded-lg font-semibold transition-colors ${nonTeachingFilter === 'excluded' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}" data-filter="excluded">Excluded (${totalNT - activeNT})</button>
            </div>
          </div>

          <!-- Non-Teaching Staff Table -->
          <div class="glass rounded-xl overflow-hidden border border-white/10">
            <div class="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table class="data-table text-xs w-full">
                <thead class="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-white/10">
                  <tr>
                    <th class="w-12 text-center">#</th>
                    <th>Staff Name</th>
                    <th>Designation</th>
                    <th>PEN</th>
                    <th>Assigned Polling Booth</th>
                    <th>Assigned Counting Table</th>
                    <th>Status</th>
                    <th class="text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5" id="nonTeachingTableBody">
                  ${(() => {
                    if (nonTeaching.length === 0) {
                      return `
                        <tr>
                          <td colspan="8" class="text-center py-12 text-slate-400">
                            <div class="space-y-3 max-w-md mx-auto">
                              <span class="text-4xl block">🤝</span>
                              <h5 class="text-white font-bold text-sm">Non-Teaching Staff Roster is Empty</h5>
                              <p class="text-xs text-slate-400 leading-relaxed">
                                No non-teaching staff uploaded yet. Upload your staff list as Excel / CSV or download our template format.
                              </p>
                              <div class="flex items-center justify-center gap-2 pt-2">
                                <label class="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 cursor-pointer flex items-center gap-1.5 shadow">
                                  📥 Upload Non-Teaching (Excel / CSV)
                                  <input type="file" id="fileNonTeachingImportEmpty" accept=".xlsx,.xls,.csv" class="hidden" />
                                </label>
                                <button id="btnDownloadNTTemplateEmpty" class="btn btn-secondary text-xs text-sky-300 hover:bg-sky-500/20 px-3 py-2 flex items-center gap-1">
                                  📄 Download CSV Template
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      `;
                    }
                    const filtered = nonTeaching.filter(nt => {
                      const isObs = isObserver(nt.name);
                      const isDisc = isDiscipline(nt.name);
                      const isGriev = isGrievance(nt.name);
                      const asstDuty = getNonTeachingAssignment(nt.name);
                      const isPosted = isObs || isDisc || isGriev || asstDuty.polling || asstDuty.counting;

                      if (nonTeachingFilter === 'active' && nt.isExcluded) return false;
                      if (nonTeachingFilter === 'excluded' && !nt.isExcluded) return false;
                      if (nonTeachingFilter === 'posted' && (nt.isExcluded || !isPosted)) return false;
                      if (nonTeachingFilter === 'reserve' && (nt.isExcluded || isPosted)) return false;
                      if (nonTeachingSearch) {
                        const s = nonTeachingSearch.toLowerCase().trim();
                        return (nt.name || '').toLowerCase().includes(s) ||
                               String(nt.pen || '').toLowerCase().includes(s) ||
                               (nt.designation || '').toLowerCase().includes(s) ||
                               (nt.department || '').toLowerCase().includes(s);
                      }
                      return true;
                    });
                    if (filtered.length === 0) {
                      return `<tr><td colspan="8" class="text-center py-8 text-slate-400">No non-teaching staff found matching "<strong>${esc(nonTeachingSearch)}</strong>".</td></tr>`;
                    }
                    return filtered.map(getNonTeachingRowHtml).join('');
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    `;

    bindEvents();

    // Restore focus and cursor selection if user had an active search field, else maintain scroll position
    if (searchFocusState) {
      const el = main.querySelector('#' + searchFocusState.id);
      if (el) {
        el.focus();
        try {
          el.setSelectionRange(searchFocusState.start, searchFocusState.end);
        } catch (_) {}
      }
    } else if (scrollY > 0) {
      window.scrollTo(0, scrollY);
    }
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

    // Manage List jump link from cards to Non-Teaching tab
    main.querySelectorAll('.btn-goto-nonteaching').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = 'nonteaching';
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
      if (confirm('⚡ Auto-Allot Polling Teams?\n\nThis will automatically fill empty slots with eligible faculty and staff while preserving any manually selected officials.\n\nDouble duty with Counting Table assignments will be strictly minimized.\n\nProceed?')) {
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
      if (confirm('⚡ Auto-Allot Counting Teams?\n\nThis will automatically fill empty slots with eligible faculty and staff while preserving any manually selected officials.\n\nFresh faculty not on polling duty will be prioritized.\n\nProceed?')) {
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

        // Release from any previous polling assignment to avoid duplicates
        if (selectedName) {
          pollingTeams.forEach(t => {
            ['presidingOfficer', 'pollingOfficer1', 'pollingOfficer2', 'pollingOfficer3'].forEach(r => {
              if (t[r] && t[r].name === selectedName && !(t.boothNumber === boothNum && r === role)) {
                t[r] = null;
              }
            });
          });
        }

        let team = pollingTeams.find(t => t.boothNumber === boothNum);
        if (!team) {
          team = { boothNumber: boothNum, roomName: `Booth ${boothNum}`, presidingOfficer: null, pollingOfficer1: null, pollingOfficer2: null, pollingOfficer3: null, pollingAssistant: null };
          pollingTeams.push(team);
        }

        const selectedFac = selectedName ? getFaculty(selectedName) : null;
        team[role] = selectedFac;
        saveAll(true);
        renderUI();
      });
    });

    // Add 3rd Polling Officer Slot
    main.querySelectorAll('.btn-add-polling-officer3').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const boothNum = parseInt(e.currentTarget.dataset.booth, 10);
        let team = pollingTeams.find(t => t.boothNumber === boothNum);
        if (!team) {
          team = { boothNumber: boothNum, roomName: `Booth ${boothNum}`, presidingOfficer: null, pollingOfficer1: null, pollingOfficer2: null, pollingOfficer3: null, pollingAssistant: null };
          pollingTeams.push(team);
        }
        team.showPollingOfficer3 = true;
        renderUI();
      });
    });

    // Remove 3rd Polling Officer Slot
    main.querySelectorAll('.btn-remove-polling-officer3').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const boothNum = parseInt(e.currentTarget.dataset.booth, 10);
        const team = pollingTeams.find(t => t.boothNumber === boothNum);
        if (team) {
          team.pollingOfficer3 = null;
          team.showPollingOfficer3 = false;
          saveAll(false);
          renderUI();
        }
      });
    });

    // Change Polling Assistant Dropdown
    main.querySelectorAll('.select-polling-assistant').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const boothNum = parseInt(e.target.dataset.booth, 10);
        const selectedName = e.target.value;

        // Release from any other polling booth assistant slot to avoid duplicates
        if (selectedName) {
          pollingTeams.forEach(t => {
            if (t.pollingAssistant && t.pollingAssistant.name === selectedName && t.boothNumber !== boothNum) {
              t.pollingAssistant = null;
            }
          });
        }

        let team = pollingTeams.find(t => t.boothNumber === boothNum);
        if (!team) {
          team = { boothNumber: boothNum, roomName: `Booth ${boothNum}`, presidingOfficer: null, pollingOfficer1: null, pollingOfficer2: null, pollingOfficer3: null, pollingAssistant: null };
          pollingTeams.push(team);
        }
        const nt = nonTeaching.find(n => n.name === selectedName);
        team.pollingAssistant = nt ? { name: nt.name, designation: nt.designation, pen: nt.pen || '' } : null;
        saveAll(true);
        renderUI();
      });
    });

    // Swap / Fix Hierarchy for Polling Booth
    main.querySelectorAll('.btn-fix-hierarchy-polling').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const boothNum = parseInt(e.currentTarget.dataset.booth, 10);
        const team = pollingTeams.find(t => t.boothNumber === boothNum);
        if (!team) return;

        const teamFaculty = [team.presidingOfficer, team.pollingOfficer1, team.pollingOfficer2, team.pollingOfficer3].filter(Boolean);
        teamFaculty.sort((a, b) => a.seniority - b.seniority);

        team.presidingOfficer = teamFaculty[0] || null;
        team.pollingOfficer1 = teamFaculty[1] || null;
        team.pollingOfficer2 = teamFaculty[2] || null;
        team.pollingOfficer3 = teamFaculty[3] || null;

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

        // Release from any previous counting assignment to avoid duplicates
        if (selectedName) {
          countingTeams.forEach(t => {
            ['supervisor', 'countingOfficer1', 'countingOfficer2', 'countingOfficer3'].forEach(r => {
              if (t[r] && t[r].name === selectedName && !(t.tableNumber === tableNum && r === role)) {
                t[r] = null;
              }
            });
          });
        }

        let team = countingTeams.find(t => t.tableNumber === tableNum);
        if (!team) {
          team = { tableNumber: tableNum, roomName: `Table ${tableNum}`, supervisor: null, countingOfficer1: null, countingOfficer2: null, countingOfficer3: null, countingAssistant: null };
          countingTeams.push(team);
        }

        const selectedFac = selectedName ? getFaculty(selectedName) : null;
        team[role] = selectedFac;
        saveAll(true);
        renderUI();
      });
    });

    // Add 3rd Counting Officer Slot
    main.querySelectorAll('.btn-add-counting-officer3').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tableNum = parseInt(e.currentTarget.dataset.table, 10);
        let team = countingTeams.find(t => t.tableNumber === tableNum);
        if (!team) {
          team = { tableNumber: tableNum, roomName: `Table ${tableNum}`, supervisor: null, countingOfficer1: null, countingOfficer2: null, countingOfficer3: null, countingAssistant: null };
          countingTeams.push(team);
        }
        team.showCountingOfficer3 = true;
        renderUI();
      });
    });

    // Remove 3rd Counting Officer Slot
    main.querySelectorAll('.btn-remove-counting-officer3').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tableNum = parseInt(e.currentTarget.dataset.table, 10);
        const team = countingTeams.find(t => t.tableNumber === tableNum);
        if (team) {
          team.countingOfficer3 = null;
          team.showCountingOfficer3 = false;
          saveAll(false);
          renderUI();
        }
      });
    });

    // Change Counting Assistant Dropdown
    main.querySelectorAll('.select-counting-assistant').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const tableNum = parseInt(e.target.dataset.table, 10);
        const selectedName = e.target.value;

        // Note: Same counting assistant CAN be assigned to multiple tables due to staff shortage.
        // Do NOT release them from other counting tables.
        let team = countingTeams.find(t => t.tableNumber === tableNum);
        if (!team) {
          team = { tableNumber: tableNum, roomName: `Table ${tableNum}`, supervisor: null, countingOfficer1: null, countingOfficer2: null, countingOfficer3: null, countingAssistant: null };
          countingTeams.push(team);
        }
        const nt = nonTeaching.find(n => n.name === selectedName);
        team.countingAssistant = nt ? { name: nt.name, designation: nt.designation, pen: nt.pen || '' } : null;
        saveAll(true);
        renderUI();
      });
    });

    // Fix Hierarchy for Counting Table
    main.querySelectorAll('.btn-fix-hierarchy-counting').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tableNum = parseInt(e.currentTarget.dataset.table, 10);
        const team = countingTeams.find(t => t.tableNumber === tableNum);
        if (!team) return;

        const teamFaculty = [team.supervisor, team.countingOfficer1, team.countingOfficer2, team.countingOfficer3].filter(Boolean);
        teamFaculty.sort((a, b) => a.seniority - b.seniority);

        team.supervisor = teamFaculty[0] || null;
        team.countingOfficer1 = teamFaculty[1] || null;
        team.countingOfficer2 = teamFaculty[2] || null;
        team.countingOfficer3 = teamFaculty[3] || null;

        showToast(`Table ${tableNum} hierarchy fixed: Seniormost is now Counting Supervisor!`, 'success');
        saveAll(false);
        renderUI();
      });
    });

    // Faculty Search and Filter (In-place live filtering without page re-render)
    main.querySelector('#inputFacultySearch')?.addEventListener('input', (e) => {
      facultySearch = e.target.value;
      updateFacultyTableRows();
    });

    main.querySelector('#inputFacultySearch')?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.target.value = '';
        facultySearch = '';
        updateFacultyTableRows();
      }
    });

    main.querySelectorAll('.filter-faculty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        facultyFilter = e.currentTarget.dataset.filter;
        main.querySelectorAll('.filter-faculty-btn').forEach(b => {
          if (b.dataset.filter === facultyFilter) {
            b.className = 'filter-faculty-btn px-3 py-1 rounded-lg font-semibold transition-colors bg-indigo-600 text-white';
          } else {
            b.className = 'filter-faculty-btn px-3 py-1 rounded-lg font-semibold transition-colors text-slate-400 hover:text-white';
          }
        });
        updateFacultyTableRows();
      });
    });

    // Delegated click handler on Faculty table body so dynamically filtered rows respond immediately
    main.querySelector('#facultyTableBody')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-toggle-exclude-fac');
      if (!btn) return;
      const pen = btn.dataset.pen;
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

    // Non-Teaching Search and Filter (In-place live filtering without page re-render)
    main.querySelector('#inputNonTeachingSearch')?.addEventListener('input', (e) => {
      nonTeachingSearch = e.target.value;
      updateNonTeachingTableRows();
    });

    main.querySelector('#inputNonTeachingSearch')?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.target.value = '';
        nonTeachingSearch = '';
        updateNonTeachingTableRows();
      }
    });

    main.querySelectorAll('.filter-nt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        nonTeachingFilter = e.currentTarget.dataset.filter;
        main.querySelectorAll('.filter-nt-btn').forEach(b => {
          if (b.dataset.filter === nonTeachingFilter) {
            b.className = 'filter-nt-btn px-3 py-1 rounded-lg font-semibold transition-colors bg-emerald-600 text-white';
          } else {
            b.className = 'filter-nt-btn px-3 py-1 rounded-lg font-semibold transition-colors text-slate-400 hover:text-white';
          }
        });
        updateNonTeachingTableRows();
      });
    });

    // Delegated click handler on Non-Teaching table body
    main.querySelector('#nonTeachingTableBody')?.addEventListener('click', (e) => {
      const excludeBtn = e.target.closest('.btn-toggle-exclude-nt');
      if (excludeBtn) {
        const name = excludeBtn.dataset.name;
        const target = nonTeaching.find(n => n.name === name);
        if (!target) return;

        if (target.isExcluded) {
          target.isExcluded = false;
          target.exclusionReason = '';
          showToast(`${target.name} is now Available for duty.`, 'success');
        } else {
          const reason = prompt(`Enter reason for excluding ${target.name} from duty:\n(e.g., Essential Office Duty, Leave):`, 'Office Duty');
          if (reason !== null) {
            target.isExcluded = true;
            target.exclusionReason = reason.trim() || 'Office Duty';
            showToast(`${target.name} excluded (${target.exclusionReason}).`, 'info');
          }
        }
        saveAll(false);
        renderUI();
        return;
      }

      const delBtn = e.target.closest('.btn-delete-nt');
      if (delBtn) {
        const name = delBtn.dataset.name;
        if (confirm(`Remove "${name}" from the Non-Teaching Staff roster?`)) {
          nonTeaching = nonTeaching.filter(n => n.name !== name);
          saveAll(false);
          showToast(`Removed "${name}" from Non-Teaching roster.`, 'info');
          renderUI();
        }
      }
    });

    // Add Staff Modal Toggle
    main.querySelector('#btnAddStaffModalBtn')?.addEventListener('click', () => {
      const panel = main.querySelector('#addStaffPanel');
      if (panel) {
        panel.classList.toggle('hidden');
        main.querySelector('#newStaffName')?.focus();
      }
    });

    main.querySelector('#btnCancelAddStaff')?.addEventListener('click', () => {
      main.querySelector('#addStaffPanel')?.classList.add('hidden');
    });

    // Confirm Add Staff
    main.querySelector('#btnConfirmAddStaff')?.addEventListener('click', () => {
      const nameInput = main.querySelector('#newStaffName');
      const desigInput = main.querySelector('#newStaffDesig');
      const deptInput = main.querySelector('#newStaffDept');
      const penInput = main.querySelector('#newStaffPen');

      const name = (nameInput?.value || '').trim();
      const desig = (desigInput?.value || '').trim() || 'Staff';
      const dept = normalizeDepartment((deptInput?.value || '').trim());
      const pen = (penInput?.value || '').trim();

      if (!name) {
        showToast('Please enter the staff member name.', 'error');
        return;
      }

      nonTeaching.push({
        id: 'nt_' + Date.now(),
        name,
        designation: desig,
        department: dept,
        pen,
        isExcluded: false,
        exclusionReason: ''
      });

      nameInput.value = '';
      desigInput.value = '';
      if (deptInput) deptInput.value = '';
      if (penInput) penInput.value = '';
      main.querySelector('#addStaffPanel')?.classList.add('hidden');

      saveAll(false);
      showToast(`Added "${name}" to Non-Teaching roster!`, 'success');
      renderUI();
    });

    // Clear All Rosters
    main.querySelector('#btnClearAllRosters')?.addEventListener('click', async () => {
      const confirmText = prompt(
        '⚠️ CONFIRM CLEAR ALL ROSTERS:\n\n' +
        'This will clear:\n' +
        ' • Teaching Faculty Roster (' + faculty.length + ' members)\n' +
        ' • Non-Teaching Staff Roster (' + nonTeaching.length + ' members)\n' +
        ' • All Polling Booth & Counting Table official assignments\n\n' +
        'You will have an empty canvas to upload your new Excel / CSV files.\n\n' +
        'Type DELETE in the box below to confirm:'
      );
      if (confirmText && confirmText.trim().toUpperCase() === 'DELETE') {
        faculty = [];
        nonTeaching = [];
        pollingTeams = [];
        countingTeams = [];
        observers = [];
        disciplineCharge = [];
        localStorage.removeItem('gcc_election_observers');
        localStorage.removeItem('gcc_election_discipline');
        localStorage.setItem('gcc_roster_migrated_v2', 'true');
        await saveAll(false);
        showToast('All rosters, team assignments, observers, and discipline committee cleared!', 'info');
        renderUI();
      }
    });

    // Clear Faculty Roster
    main.querySelector('#btnClearFacultyRoster')?.addEventListener('click', async () => {
      if (confirm(
        '🗑️ Clear the entire Teaching Faculty roster (' + faculty.length + ' faculty)?\n\n' +
        'This will also clear current Polling & Counting faculty duty assignments so you can upload a fresh Faculty Excel/CSV file.\n\n' +
        'Proceed?'
      )) {
        faculty = [];
        pollingTeams.forEach(t => {
          t.presidingOfficer = null;
          t.pollingOfficer1 = null;
          t.pollingOfficer2 = null;
          t.pollingOfficer3 = null;
          t.showPollingOfficer3 = false;
        });
        countingTeams.forEach(t => {
          t.supervisor = null;
          t.countingOfficer1 = null;
          t.countingOfficer2 = null;
          t.countingOfficer3 = null;
          t.showCountingOfficer3 = false;
        });
        localStorage.setItem('gcc_roster_migrated_v2', 'true');
        await saveAll(false);
        showToast('Faculty roster cleared. You can now upload your new Faculty file.', 'info');
        renderUI();
      }
    });

    // Download Faculty CSV Template
    main.querySelector('#btnDownloadFacultyTemplate')?.addEventListener('click', () => {
      downloadFacultyTemplate();
    });
    main.querySelector('#btnDownloadFacultyTemplateEmpty')?.addEventListener('click', () => {
      downloadFacultyTemplate();
    });

    // Download Non-Teaching CSV Template
    main.querySelector('#btnDownloadNTTemplate')?.addEventListener('click', () => {
      downloadNonTeachingTemplate();
    });
    main.querySelector('#btnDownloadNTTemplateEmpty')?.addEventListener('click', () => {
      downloadNonTeachingTemplate();
    });

    // Clear Non-Teaching Roster
    main.querySelector('#btnClearNonTeachingList')?.addEventListener('click', async () => {
      if (confirm('🗑️ Clear entire Non-Teaching Staff roster (' + nonTeaching.length + ' staff)?\n\nYou will be able to upload a fresh file using "Upload Non-Teaching List".')) {
        nonTeaching = [];
        pollingTeams.forEach(t => { t.pollingAssistant = null; });
        countingTeams.forEach(t => { t.countingAssistant = null; });
        localStorage.setItem('gcc_roster_migrated_v2', 'true');
        await saveAll(false);
        showToast('Cleared Non-Teaching Staff roster. Ready for new upload.', 'info');
        renderUI();
      }
    });

    // Export Faculty (CSV)
    main.querySelector('#btnExportFaculty')?.addEventListener('click', () => {
      const rows = [
        ['Seniority', 'Name', 'PEN', 'Department', 'Designation', 'Joining Date', 'Status', 'Exclusion Reason', 'Polling Duty', 'Counting Duty']
      ];
      const sortedFac = [...faculty].sort(compareOfficials);
      sortedFac.forEach(f => {
        const p = getPollingAssignment(f.name);
        const c = getCountingAssignment(f.name);
        const isObs = isObserver(f.name);
        const isDisc = isDiscipline(f.name);
        const isGriev = isGrievance(f.name);
        const isPosted = isObs || isDisc || isGriev || p || c;
        const statusStr = f.isExcluded ? 'Excluded' : (isPosted ? 'Posted' : 'Reserve (Standby)');

        rows.push([
          f.seniority || '',
          f.name,
          f.pen || '',
          f.department || '',
          f.designation || '',
          f.joiningDate || '',
          statusStr,
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

    // Export Non-Teaching (CSV)
    main.querySelector('#btnExportNonTeaching')?.addEventListener('click', () => {
      const rows = [
        ['Sl No', 'Staff Name', 'Department', 'Designation', 'PEN', 'Status', 'Exclusion Reason', 'Polling Booth', 'Counting Table']
      ];
      const sortedNT = [...nonTeaching].sort(compareOfficials);
      sortedNT.forEach((nt, idx) => {
        const asstDuty = getNonTeachingAssignment(nt.name);
        const isObs = isObserver(nt.name);
        const isDisc = isDiscipline(nt.name);
        const isGriev = isGrievance(nt.name);
        const isPosted = isObs || isDisc || isGriev || asstDuty.polling || asstDuty.counting;
        const statusStr = nt.isExcluded ? 'Excluded' : (isPosted ? 'Posted' : 'Reserve (Standby)');

        rows.push([
          idx + 1,
          nt.name,
          nt.department || nt.section || 'Office',
          nt.designation || 'Staff',
          nt.pen || '',
          statusStr,
          nt.exclusionReason || '',
          asstDuty.polling ? `Booth ${asstDuty.polling.boothNumber}` : '',
          asstDuty.counting ? `Table ${asstDuty.counting.tableNumber}` : ''
        ]);
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Non_Teaching_Staff_Roster_${electionYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    // Import Faculty (Excel / CSV) - Toolbar & Empty State
    main.querySelector('#fileFacultyImport')?.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFacultyFile(e.target.files[0]);
    });
    main.querySelector('#fileFacultyImportEmpty')?.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFacultyFile(e.target.files[0]);
    });

    // Import Non-Teaching (Excel / CSV) - Toolbar & Empty State
    main.querySelector('#fileNonTeachingImport')?.addEventListener('change', (e) => {
      if (e.target.files[0]) handleNonTeachingFile(e.target.files[0]);
    });
    main.querySelector('#fileNonTeachingImportEmpty')?.addEventListener('change', (e) => {
      if (e.target.files[0]) handleNonTeachingFile(e.target.files[0]);
    });

    // Print Polling Orders (Opens in New Tab)
    main.querySelector('#btnPrintPollingOrders')?.addEventListener('click', () => {
      openDutyOrdersWindow('polling');
    });

    // Print Counting Orders (Opens in New Tab)
    main.querySelector('#btnPrintCountingOrders')?.addEventListener('click', () => {
      openDutyOrdersWindow('counting');
    });

    // Print Master Duty List (Polling & Counting)
    const handlePrintMasterDutyList = () => {
      openMasterDutyListWindow();
    };
    main.querySelector('#btnPrintMasterDutyListTop')?.addEventListener('click', handlePrintMasterDutyList);
    main.querySelector('#btnPrintMasterDutyListPolling')?.addEventListener('click', handlePrintMasterDutyList);
    main.querySelector('#btnPrintMasterDutyListCounting')?.addEventListener('click', handlePrintMasterDutyList);

    // Open Observer Allotment Modal
    main.querySelector('#btnOpenObserverModal')?.addEventListener('click', () => openObserverModal());
    main.querySelector('#btnManageObserversBanner')?.addEventListener('click', () => openObserverModal());
    main.querySelector('.btn-manage-observers-inline')?.addEventListener('click', () => openObserverModal());

    // Open Discipline Charge Allotment Modal
    main.querySelector('#btnOpenDisciplineModal')?.addEventListener('click', () => openDisciplineModal());
    main.querySelector('#btnManageDisciplineBanner')?.addEventListener('click', () => openDisciplineModal());
    main.querySelector('.btn-manage-discipline-inline')?.addEventListener('click', () => openDisciplineModal());

    // Open Grievance Cell Allotment Modal
    main.querySelector('#btnOpenGrievanceModal')?.addEventListener('click', () => openGrievanceModal());
    main.querySelector('#btnManageGrievanceBanner')?.addEventListener('click', () => openGrievanceModal());
    main.querySelector('.btn-manage-grievance-inline')?.addEventListener('click', () => openGrievanceModal());

    // Open Multi-Table Counting Assistant Allotment Modal
    main.querySelector('#btnAssignCountingAssistantMulti')?.addEventListener('click', () => openMultiTableAssistantModal());

    // Quick remove observer from banner
    main.querySelectorAll('.btn-quick-remove-observer').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const name = e.currentTarget.dataset.name;
        if (confirm(`Remove "${name}" from Election Observers?`)) {
          observers = observers.filter(o => o.name !== name);
          await saveAll(false);
          showToast(`Removed "${name}" from Observers.`, 'info');
          renderUI();
        }
      });
    });

    // Quick remove discipline from banner
    main.querySelectorAll('.btn-quick-remove-discipline').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const name = e.currentTarget.dataset.name;
        if (confirm(`Remove "${name}" from Campus Discipline Charge?`)) {
          disciplineCharge = disciplineCharge.filter(d => d.name !== name);
          await saveAll(false);
          showToast(`Removed "${name}" from Discipline Charge.`, 'info');
          renderUI();
        }
      });
    });

    // Quick remove grievance from banner
    main.querySelectorAll('.btn-quick-remove-grievance').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const name = e.currentTarget.dataset.name;
        if (confirm(`Remove "${name}" from Students Grievance Redressal Committee?`)) {
          grievanceCell = grievanceCell.filter(g => g.name !== name);
          await saveAll(false);
          showToast(`Removed "${name}" from Grievance Redressal Committee.`, 'info');
          renderUI();
        }
      });
    });
  };

  // ─── Observers Allotment Modal ──────────────────────────────────────────────

  const openObserverModal = () => {
    const existing = document.getElementById('observerModalContainer');
    if (existing) existing.remove();

    let draftObservers = observers.map(o => ({ ...o }));
    if (draftObservers.length === 0) {
      draftObservers.push({ name: '', pen: '', department: '', designation: '', seniority: 999, type: '' });
    }

    const modal = document.createElement('div');
    modal.id = 'observerModalContainer';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md';

    const renderModal = () => {
      modal.innerHTML = `
        <div class="glass border border-amber-500/40 rounded-2xl w-full max-w-2xl bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <!-- Modal Header -->
          <div class="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-xl shadow-inner border border-amber-500/30">
                ⚖️
              </div>
              <div>
                <h4 class="font-bold text-white text-base">Election Observers Allotment</h4>
                <p class="text-xs text-slate-400">Appoint election observers. Observers appear first on the Master Duty List.</p>
              </div>
            </div>
            <button id="btnCloseObsModal" class="text-slate-400 hover:text-white text-2xl font-bold px-2 py-1 leading-none">&times;</button>
          </div>

          <!-- Modal Body: Observers List -->
          <div class="p-5 overflow-y-auto space-y-4 flex-1">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-300">Observer Appointments (${draftObservers.length})</span>
              <button type="button" id="btnAddObserverRow" class="btn btn-secondary border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs px-3 py-1.5 flex items-center gap-1 font-semibold">
                ➕ Add Another Observer
              </button>
            </div>

            <div class="space-y-3" id="observerRowsContainer">
              ${draftObservers.map((obs, idx) => {
                const personSelected = getPerson(obs.name);
                return `
                  <div class="p-3.5 rounded-xl border border-white/10 bg-white/5 space-y-2 relative" data-obs-idx="${idx}">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                        <span>⚖️</span> Observer #${idx + 1}
                      </span>
                      <button type="button" class="text-xs text-rose-400 hover:text-rose-200 hover:underline btn-remove-obs-row flex items-center gap-1" data-idx="${idx}">
                        <span>✖</span> Remove
                      </button>
                    </div>

                    <div class="grid grid-cols-1 gap-2">
                      <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-amber-400 focus:outline-none obs-faculty-select" data-idx="${idx}">
                        ${renderAllRosterOptions(obs.name, draftObservers, idx, '-- Select Official (Teaching Faculty or Non-Teaching Staff) for Observer Duty --')}
                      </select>
                    </div>

                    ${personSelected ? `
                      <div class="flex items-center gap-2 flex-wrap text-[11px] text-slate-300 bg-black/30 p-2 rounded-lg border border-white/5 font-mono">
                        <span class="text-amber-300 font-semibold">${personSelected.type}</span>
                        <span>•</span>
                        <span>Dept: <strong class="text-white">${esc(personSelected.department || '–')}</strong></span>
                        <span>•</span>
                        <span>PEN: <strong class="text-white">${esc(personSelected.pen || '–')}</strong></span>
                        <span>•</span>
                        <span>Desig: <strong class="text-white">${esc(personSelected.designation || 'Official')}</strong></span>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-4 border-t border-white/10 flex items-center justify-between bg-white/5">
            <span class="text-[11px] text-slate-400">All personnel across Faculty and Staff rosters can be appointed. Saved to cloud database.</span>
            <div class="flex items-center gap-2">
              <button type="button" id="btnCancelObsModal" class="btn btn-secondary text-xs px-4 py-2">Cancel</button>
              <button type="button" id="btnSaveObsModal" class="btn btn-primary bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2 flex items-center gap-1.5 shadow">
                💾 Save Observers
              </button>
            </div>
          </div>
        </div>
      `;

      modal.querySelector('#btnCloseObsModal').onclick = () => modal.remove();
      modal.querySelector('#btnCancelObsModal').onclick = () => modal.remove();

      modal.querySelector('#btnAddObserverRow').onclick = () => {
        draftObservers.push({ name: '', pen: '', department: '', designation: '', seniority: 999, type: '' });
        renderModal();
      };

      modal.querySelectorAll('.btn-remove-obs-row').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx, 10);
          draftObservers.splice(idx, 1);
          if (draftObservers.length === 0) {
            draftObservers.push({ name: '', pen: '', department: '', designation: '', seniority: 999, type: '' });
          }
          renderModal();
        };
      });

      modal.querySelectorAll('.obs-faculty-select').forEach(sel => {
        sel.onchange = (e) => {
          const idx = parseInt(sel.dataset.idx, 10);
          const pName = e.target.value;
          const p = getPerson(pName);
          if (p) {
            draftObservers[idx] = {
              name: p.name,
              pen: p.pen || '',
              department: p.department || '',
              designation: p.designation || (p.type === 'Teaching Faculty' ? 'Faculty' : 'Staff'),
              seniority: p.seniority || 999,
              type: p.type
            };
          } else {
            draftObservers[idx] = { name: '', pen: '', department: '', designation: '', seniority: 999, type: '' };
          }
          renderModal();
        };
      });

      modal.querySelector('#btnSaveObsModal').onclick = async () => {
        const validObs = draftObservers.filter(o => o.name && o.name.trim().length > 0);
        observers = validObs;
        await saveAll(false);
        modal.remove();
        showToast(`Appointed ${observers.length} Election Observer(s) successfully!`, 'success');
        renderUI();
      };
    };

    renderModal();
    document.body.appendChild(modal);
  };

  // ─── Discipline Charge Allotment Modal ────────────────────────────────────────

  const openDisciplineModal = () => {
    const existing = document.getElementById('disciplineModalContainer');
    if (existing) existing.remove();

    let draftDiscipline = disciplineCharge.map(d => ({ ...d }));
    if (draftDiscipline.length === 0) {
      draftDiscipline.push({ name: '', pen: '', department: '', designation: '', seniority: 999, type: '' });
    }

    const modal = document.createElement('div');
    modal.id = 'disciplineModalContainer';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md';

    const renderModal = () => {
      modal.innerHTML = `
        <div class="glass border border-rose-500/40 rounded-2xl w-full max-w-2xl bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <!-- Modal Header -->
          <div class="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center text-xl shadow-inner border border-rose-500/30">
                🛡️
              </div>
              <div>
                <h4 class="font-bold text-white text-base">Campus Discipline Committee Allotment</h4>
                <p class="text-xs text-slate-400">Appoint officials to assist with campus discipline and order. Listed 2nd on the Master Duty List.</p>
              </div>
            </div>
            <button id="btnCloseDiscModal" class="text-slate-400 hover:text-white text-2xl font-bold px-2 py-1 leading-none">&times;</button>
          </div>

          <!-- Modal Body: Discipline List -->
          <div class="p-5 overflow-y-auto space-y-4 flex-1">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-rose-300">Discipline Appointments (${draftDiscipline.length})</span>
              <button type="button" id="btnAddDisciplineRow" class="btn btn-secondary border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-xs px-3 py-1.5 flex items-center gap-1 font-semibold">
                ➕ Add Another Official
              </button>
            </div>

            <div class="space-y-3" id="disciplineRowsContainer">
              ${draftDiscipline.map((disc, idx) => {
                const person = getPerson(disc.name);
                return `
                  <div class="p-3.5 rounded-xl border border-white/10 bg-white/5 space-y-2 relative" data-disc-idx="${idx}">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-rose-300 font-mono flex items-center gap-1.5">
                        <span>🛡️</span> Discipline In-Charge #${idx + 1}
                      </span>
                      <button type="button" class="text-xs text-rose-400 hover:text-rose-200 hover:underline btn-remove-disc-row flex items-center gap-1" data-idx="${idx}">
                        <span>✖</span> Remove
                      </button>
                    </div>

                    <div class="grid grid-cols-1 gap-2">
                      <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-rose-400 focus:outline-none disc-person-select" data-idx="${idx}">
                        ${renderAllRosterOptions(disc.name, draftDiscipline, idx, '-- Select Official (Teaching Faculty or Non-Teaching Staff) for Discipline Charge --')}
                      </select>
                    </div>

                    ${person ? `
                      <div class="flex items-center gap-2 flex-wrap text-[11px] text-slate-300 bg-black/30 p-2 rounded-lg border border-white/5 font-mono">
                        <span class="text-rose-300 font-semibold">${person.type}</span>
                        <span>•</span>
                        <span>Dept: <strong class="text-white">${esc(person.department || '–')}</strong></span>
                        <span>•</span>
                        <span>PEN: <strong class="text-white">${esc(person.pen || '–')}</strong></span>
                        <span>•</span>
                        <span>Desig: <strong class="text-white">${esc(person.designation || '–')}</strong></span>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-4 border-t border-white/10 flex items-center justify-between bg-white/5">
            <span class="text-[11px] text-slate-400">All roster personnel (Faculty &amp; Staff) are available. Saved to cloud database.</span>
            <div class="flex items-center gap-2">
              <button type="button" id="btnCancelDiscModal" class="btn btn-secondary text-xs px-4 py-2">Cancel</button>
              <button type="button" id="btnSaveDiscModal" class="btn btn-primary bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 flex items-center gap-1.5 shadow">
                💾 Save Discipline Charge
              </button>
            </div>
          </div>
        </div>
      `;

      modal.querySelector('#btnCloseDiscModal').onclick = () => modal.remove();
      modal.querySelector('#btnCancelDiscModal').onclick = () => modal.remove();

      modal.querySelector('#btnAddDisciplineRow').onclick = () => {
        draftDiscipline.push({ name: '', pen: '', department: '', designation: '', seniority: 999, type: '' });
        renderModal();
      };

      modal.querySelectorAll('.btn-remove-disc-row').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx, 10);
          draftDiscipline.splice(idx, 1);
          if (draftDiscipline.length === 0) {
            draftDiscipline.push({ name: '', pen: '', department: '', designation: '', seniority: 999, type: '' });
          }
          renderModal();
        };
      });

      modal.querySelectorAll('.disc-person-select').forEach(sel => {
        sel.onchange = (e) => {
          const idx = parseInt(sel.dataset.idx, 10);
          const pName = e.target.value;
          const p = getPerson(pName);
          if (p) {
            draftDiscipline[idx] = {
              name: p.name,
              pen: p.pen || '',
              department: p.department || '',
              designation: p.designation || (p.type === 'Teaching Faculty' ? 'Faculty' : 'Staff'),
              seniority: p.seniority || 999,
              type: p.type
            };
          } else {
            draftDiscipline[idx] = { name: '', pen: '', department: '', designation: '', seniority: 999, type: '' };
          }
          renderModal();
        };
      });

      modal.querySelector('#btnSaveDiscModal').onclick = async () => {
        const validDisc = draftDiscipline.filter(d => d.name && d.name.trim().length > 0);
        disciplineCharge = validDisc;
        await saveAll(false);
        modal.remove();
        showToast(`Appointed ${disciplineCharge.length} Discipline In-Charge Official(s) successfully!`, 'success');
        renderUI();
      };
    };

    renderModal();
    document.body.appendChild(modal);
  };

  // ─── Students Grievance Redressal Committee Modal ────────────────────────────

  const openGrievanceModal = () => {
    const existing = document.getElementById('grievanceModalContainer');
    if (existing) existing.remove();

    let draftGrievance = grievanceCell.map(g => ({ ...g }));
    if (draftGrievance.length === 0) {
      draftGrievance.push({ name: '', pen: '', department: '', designation: '', seniority: 999, type: '' });
    }

    const modal = document.createElement('div');
    modal.id = 'grievanceModalContainer';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md';

    const renderModal = () => {
      modal.innerHTML = `
        <div class="glass border border-blue-500/40 rounded-2xl w-full max-w-2xl bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <!-- Modal Header -->
          <div class="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center text-xl shadow-inner border border-blue-500/30">
                🤝
              </div>
              <div>
                <h4 class="font-bold text-white text-base">Grievance Redressal Committee Allotment</h4>
                <p class="text-xs text-slate-400">Appoint officials to handle student election queries, appeals, and grievances. Displayed in Section 3 after Discipline Committee.</p>
              </div>
            </div>
            <button id="btnCloseGrievModal" class="text-slate-400 hover:text-white text-2xl font-bold px-2 py-1 leading-none">&times;</button>
          </div>

          <!-- Modal Body: Grievance List -->
          <div class="p-5 overflow-y-auto space-y-4 flex-1">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-blue-300">Grievance Cell Appointments (${draftGrievance.length})</span>
              <button type="button" id="btnAddGrievanceRow" class="btn btn-secondary border-blue-500/40 text-blue-300 hover:bg-blue-500/20 text-xs px-3 py-1.5 flex items-center gap-1 font-semibold">
                ➕ Add Another Official
              </button>
            </div>

            <div class="space-y-3" id="grievanceRowsContainer">
              ${draftGrievance.map((g, idx) => {
                const person = getPerson(g.name);
                return `
                  <div class="p-3.5 rounded-xl border border-white/10 bg-white/5 space-y-2 relative" data-griev-idx="${idx}">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-blue-300 font-mono flex items-center gap-1.5">
                        <span>⚖️</span> Grievance Official #${idx + 1}
                      </span>
                      <button type="button" class="text-xs text-rose-400 hover:text-rose-200 hover:underline btn-remove-griev-row flex items-center gap-1" data-idx="${idx}">
                        <span>✖</span> Remove
                      </button>
                    </div>

                    <div class="grid grid-cols-1 gap-2">
                      <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-blue-400 focus:outline-none griev-person-select" data-idx="${idx}">
                        ${renderAllRosterOptions(g.name, draftGrievance, idx, '-- Select Official (All Roster Personnel Selectable) --')}
                      </select>
                    </div>

                    ${person ? `
                      <div class="flex items-center gap-2 flex-wrap text-[11px] text-slate-300 bg-black/30 p-2 rounded-lg border border-white/5 font-mono">
                        <span class="text-blue-300 font-semibold">${person.type}</span>
                        <span>•</span>
                        <span>Dept: <strong class="text-white">${esc(person.department || '–')}</strong></span>
                        <span>•</span>
                        <span>PEN: <strong class="text-white">${esc(person.pen || '–')}</strong></span>
                        <span>•</span>
                        <span>Desig: <strong class="text-white">${esc(person.designation || '–')}</strong></span>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-4 border-t border-white/10 flex items-center justify-between bg-white/5">
            <span class="text-[11px] text-slate-400">All roster personnel (Faculty &amp; Staff) are available. Saved to cloud database.</span>
            <div class="flex items-center gap-2">
              <button type="button" id="btnCancelGrievModal" class="btn btn-secondary text-xs px-4 py-2">Cancel</button>
              <button type="button" id="btnSaveGrievModal" class="btn btn-primary bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 flex items-center gap-1.5 shadow">
                💾 Save Grievance Cell
              </button>
            </div>
          </div>
        </div>
      `;

      modal.querySelector('#btnCloseGrievModal').onclick = () => modal.remove();
      modal.querySelector('#btnCancelGrievModal').onclick = () => modal.remove();

      modal.querySelector('#btnAddGrievanceRow').onclick = () => {
        draftGrievance.push({ name: '', pen: '', department: '', designation: '', seniority: 999, type: '' });
        renderModal();
      };

      modal.querySelectorAll('.btn-remove-griev-row').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx, 10);
          draftGrievance.splice(idx, 1);
          if (draftGrievance.length === 0) {
            draftGrievance.push({ name: '', pen: '', department: '', designation: '', seniority: 999, type: '' });
          }
          renderModal();
        };
      });

      modal.querySelectorAll('.griev-person-select').forEach(sel => {
        sel.onchange = (e) => {
          const idx = parseInt(sel.dataset.idx, 10);
          const pName = e.target.value;
          const p = getPerson(pName);
          if (p) {
            draftGrievance[idx] = {
              name: p.name,
              pen: p.pen || '',
              department: p.department || '',
              designation: p.designation || (p.type === 'Teaching Faculty' ? 'Faculty' : 'Staff'),
              seniority: p.seniority || 999,
              type: p.type
            };
          } else {
            draftGrievance[idx] = { name: '', pen: '', department: '', designation: '', seniority: 999, type: '' };
          }
          renderModal();
        };
      });

      modal.querySelector('#btnSaveGrievModal').onclick = async () => {
        const validGriev = draftGrievance.filter(g => g.name && g.name.trim().length > 0);
        grievanceCell = validGriev;
        await saveAll(false);
        modal.remove();
        showToast(`Appointed ${grievanceCell.length} Grievance Official(s) successfully!`, 'success');
        renderUI();
      };
    };

    renderModal();
    document.body.appendChild(modal);
  };

  // ─── Multi-Table Counting Assistant Allotment Modal ─────────────────────────

  const openMultiTableAssistantModal = () => {
    const existing = document.getElementById('multiAssistantModalContainer');
    if (existing) existing.remove();

    const sortedNT = [...nonTeaching].sort(compareOfficials);
    if (sortedNT.length === 0) {
      showToast('No non-teaching staff found in the roster.', 'error');
      return;
    }

    let selectedStaffName = sortedNT[0].name;

    const modal = document.createElement('div');
    modal.id = 'multiAssistantModalContainer';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md';

    const renderModal = () => {
      const selectedStaff = nonTeaching.find(n => n.name === selectedStaffName) || sortedNT[0];
      const ntAssignment = getNonTeachingAssignment(selectedStaff.name);
      const currentlyAssignedTables = new Set(ntAssignment.countingTables || []);

      modal.innerHTML = `
        <div class="glass border border-emerald-500/40 rounded-2xl w-full max-w-2xl bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <!-- Modal Header -->
          <div class="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xl shadow-inner border border-emerald-500/30">
                🤝
              </div>
              <div>
                <h4 class="font-bold text-white text-base">Assign Counting Assistant to Multiple Tables</h4>
                <p class="text-xs text-slate-400">Allot the same non-teaching staff member to assist across multiple counting tables simultaneously to resolve staff shortages.</p>
              </div>
            </div>
            <button id="btnCloseMultiAsstModal" class="text-slate-400 hover:text-white text-2xl font-bold px-2 py-1 leading-none">&times;</button>
          </div>

          <!-- Modal Body -->
          <div class="p-5 overflow-y-auto space-y-4 flex-1">
            <!-- Step 1: Choose Assistant -->
            <div class="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
              <label class="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                1. Select Non-Teaching Staff Member
              </label>
              <select id="selectModalStaff" class="w-full bg-slate-950 border border-white/20 rounded-lg p-2.5 text-xs text-white focus:border-emerald-400 focus:outline-none">
                ${sortedNT.map(nt => {
                  const asst = getNonTeachingAssignment(nt.name);
                  const isCur = nt.name === selectedStaff.name;
                  const tableInfo = asst.countingTables.length > 0 ? ` [Currently on Tables: ${asst.countingTables.join(', ')}]` : ' [Not assigned to counting]';
                  const excl = nt.isExcluded ? ' ⛔ [Excluded]' : '';
                  return `
                    <option value="${esc(nt.name)}" ${isCur ? 'selected' : ''}>
                      ${esc(nt.name)} (${esc(nt.designation || 'Staff')}${nt.department ? ` · ${esc(nt.department)}` : ''})${tableInfo}${excl}
                    </option>
                  `;
                }).join('')}
              </select>
              <div class="text-[11px] text-slate-300 flex items-center justify-between pt-1">
                <span>Designation: <strong>${esc(selectedStaff.designation || 'Staff')}</strong></span>
                <span>Department: <strong>${esc(selectedStaff.department || selectedStaff.section || 'Office')}</strong></span>
                <span>PEN: <strong class="font-mono">${esc(selectedStaff.pen || '–')}</strong></span>
              </div>
            </div>

            <!-- Step 2: Choose Tables -->
            <div class="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <label class="block text-xs font-bold uppercase tracking-wider text-purple-300">
                  2. Select Counting Tables to Assign to
                </label>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <button type="button" id="btnSelectAllTables" class="btn btn-secondary text-[11px] py-0.5 px-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border-purple-500/40">Select All</button>
                  <button type="button" id="btnClearAllTables" class="btn btn-secondary text-[11px] py-0.5 px-2 text-slate-300">Clear All</button>
                  <button type="button" id="btnSelectOddTables" class="btn btn-secondary text-[11px] py-0.5 px-2 text-slate-300">Odd Tables</button>
                  <button type="button" id="btnSelectEvenTables" class="btn btn-secondary text-[11px] py-0.5 px-2 text-slate-300">Even Tables</button>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1" id="tableCheckboxesContainer">
                ${booths.map(b => {
                  const currentTeam = countingTeams.find(t => t.tableNumber === b.boothNumber);
                  const isAssignedToThis = currentTeam?.countingAssistant?.name === selectedStaff.name;
                  const otherAssistant = currentTeam?.countingAssistant && !isAssignedToThis ? currentTeam.countingAssistant.name : null;

                  return `
                    <label class="flex items-center gap-2 p-2.5 rounded-lg border ${isAssignedToThis ? 'border-emerald-500/60 bg-emerald-950/30' : 'border-white/10 bg-slate-900/60 hover:border-white/20'} cursor-pointer transition select-none">
                      <input type="checkbox" class="chk-modal-table rounded bg-slate-950 border-white/20 text-emerald-500 focus:ring-0" data-table="${b.boothNumber}" ${isAssignedToThis ? 'checked' : ''}>
                      <div class="text-xs leading-tight">
                        <div class="font-bold text-white flex items-center gap-1">
                          <span>Table ${b.boothNumber}</span>
                          ${isAssignedToThis ? '<span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded">Current</span>' : ''}
                        </div>
                        <div class="text-[10px] text-slate-400 truncate max-w-[140px]">${esc(b.roomName || `Table ${b.boothNumber}`)}</div>
                        ${otherAssistant ? `<div class="text-[9px] text-amber-300/80 truncate max-w-[140px]" title="Currently has ${esc(otherAssistant)}">Has: ${esc(otherAssistant)}</div>` : ''}
                      </div>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-4 border-t border-white/10 bg-slate-950 flex items-center justify-between">
            <button type="button" id="btnCancelMultiAsstModal" class="btn btn-secondary text-xs px-4 py-2 text-slate-300">
              Cancel
            </button>
            <button type="button" id="btnApplyMultiAsst" class="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 flex items-center gap-1.5 shadow">
              <span>✓</span> Apply Table Allotments
            </button>
          </div>
        </div>
      `;

      modal.querySelector('#btnCloseMultiAsstModal').onclick = () => modal.remove();
      modal.querySelector('#btnCancelMultiAsstModal').onclick = () => modal.remove();

      modal.querySelector('#selectModalStaff').onchange = (e) => {
        selectedStaffName = e.target.value;
        renderModal();
      };

      modal.querySelector('#btnSelectAllTables').onclick = () => {
        modal.querySelectorAll('.chk-modal-table').forEach(chk => { chk.checked = true; });
      };

      modal.querySelector('#btnClearAllTables').onclick = () => {
        modal.querySelectorAll('.chk-modal-table').forEach(chk => { chk.checked = false; });
      };

      modal.querySelector('#btnSelectOddTables').onclick = () => {
        modal.querySelectorAll('.chk-modal-table').forEach(chk => {
          const num = parseInt(chk.dataset.table, 10);
          chk.checked = (num % 2 === 1);
        });
      };

      modal.querySelector('#btnSelectEvenTables').onclick = () => {
        modal.querySelectorAll('.chk-modal-table').forEach(chk => {
          const num = parseInt(chk.dataset.table, 10);
          chk.checked = (num % 2 === 0);
        });
      };

      modal.querySelector('#btnApplyMultiAsst').onclick = async () => {
        const staffObj = nonTeaching.find(n => n.name === selectedStaffName);
        if (!staffObj) return;

        const checkedTables = [];
        modal.querySelectorAll('.chk-modal-table').forEach(chk => {
          const tableNum = parseInt(chk.dataset.table, 10);
          let team = countingTeams.find(t => t.tableNumber === tableNum);
          if (!team) {
            team = { tableNumber: tableNum, roomName: `Table ${tableNum}`, supervisor: null, countingOfficer1: null, countingOfficer2: null, countingOfficer3: null, countingAssistant: null };
            countingTeams.push(team);
          }

          if (chk.checked) {
            team.countingAssistant = { name: staffObj.name, designation: staffObj.designation, pen: staffObj.pen || '' };
            checkedTables.push(tableNum);
          } else {
            if (team.countingAssistant && team.countingAssistant.name === staffObj.name) {
              team.countingAssistant = null;
            }
          }
        });

        await saveAll(true);
        modal.remove();
        showToast(`Assigned ${staffObj.name} to ${checkedTables.length} table(s): ${checkedTables.length > 0 ? `Tables ${checkedTables.sort((a,b)=>a-b).join(', ')}` : 'None'}!`, 'success');
        renderUI();
      };
    };

    renderModal();
    document.body.appendChild(modal);
  };

  // ─── Master Duty List Standalone Print Engine (Both Polling & Counting) ─────

  const getMasterDutyData = () => {
    // 1. Observers (Listed 1st) - strictly exclude any official marked as excluded
    const obsList = observers
      .filter((obs) => {
        const p = getPerson(obs.name);
        return !p?.isExcluded;
      })
      .map((obs) => {
        const p = getPerson(obs.name);
        return {
          name: obs.name,
          designation: (p?.designation || obs.designation || 'Faculty').trim(),
          department: (p?.department || obs.department || '').trim() || '–',
          pen: (p?.pen || obs.pen || '–').trim(),
          seniority: p?.seniority || obs.seniority || 999,
          duty: 'Election Observer',
          station: 'Central Control Room / Campus',
          reportingTime: '07:30 AM',
          type: p?.type || 'Teaching Faculty'
        };
      });
    obsList.sort(compareOfficials);
    obsList.forEach((obs, idx) => {
      obs.slNo = `Obs-${idx + 1}`;
    });

    // 2. Campus Discipline Committee (Listed 2nd) - strictly exclude excluded
    const discList = disciplineCharge
      .filter((disc) => {
        const p = getPerson(disc.name);
        return !p?.isExcluded;
      })
      .map((disc) => {
        const p = getPerson(disc.name);
        return {
          name: disc.name,
          designation: (p?.designation || disc.designation || (p?.type === 'Teaching Faculty' ? 'Faculty' : 'Staff')).trim(),
          department: (p?.department || disc.department || (p?.type === 'Teaching Faculty' ? '' : 'Office')).trim() || '–',
          pen: (p?.pen || disc.pen || '–').trim(),
          seniority: p?.seniority || disc.seniority || 999,
          duty: 'Campus Discipline Duty',
          station: 'Campus & Corridors',
          reportingTime: '07:30 AM',
          type: p?.type || 'Teaching Faculty'
        };
      });
    discList.sort(compareOfficials);
    discList.forEach((disc, idx) => {
      disc.slNo = `Disc-${idx + 1}`;
    });

    // 3. Grievance Redressal Committee (Listed 3rd) - strictly exclude excluded
    const grievList = grievanceCell
      .filter((g) => {
        const p = getPerson(g.name);
        return !p?.isExcluded;
      })
      .map((g) => {
        const p = getPerson(g.name);
        return {
          name: g.name,
          designation: (p?.designation || g.designation || (p?.type === 'Teaching Faculty' ? 'Faculty' : 'Staff')).trim(),
          department: (p?.department || g.department || (p?.type === 'Teaching Faculty' ? '' : 'Office')).trim() || '–',
          pen: (p?.pen || g.pen || '–').trim(),
          seniority: p?.seniority || g.seniority || 999,
          duty: 'Grievance Committee Member',
          station: 'Grievance Cell / Principal Office',
          reportingTime: '08:00 AM',
          type: p?.type || 'Teaching Faculty'
        };
      });
    grievList.sort(compareOfficials);
    grievList.forEach((g, idx) => {
      g.slNo = `Griev-${idx + 1}`;
    });

    // 4. Department-wise Officials (Teaching Faculty & Non-Teaching Staff)
    const personnel = [];
    const reserveList = [];

    const assignedObs = new Set(obsList.map(o => String(o.name || '').trim().toLowerCase()));
    const assignedDisc = new Set(discList.map(d => String(d.name || '').trim().toLowerCase()));
    const assignedGriev = new Set(grievList.map(g => String(g.name || '').trim().toLowerCase()));

    // Teaching Faculty
    faculty.forEach(f => {
      // Excluded ones are NOT reserve and must NOT be shown anywhere
      if (f.isExcluded) return;

      const fNameLower = String(f.name || '').trim().toLowerCase();
      if (assignedObs.has(fNameLower) || assignedDisc.has(fNameLower) || assignedGriev.has(fNameLower)) {
        return; // Handled in dedicated sections above
      }
      const pDuty = getPollingAssignment(f.name);
      const cDuty = getCountingAssignment(f.name);

      if (pDuty || cDuty) {
        const duties = [];
        const stations = [];
        if (pDuty) {
          duties.push(`Booth ${pDuty.boothNumber} (${pDuty.role})`);
          const b = booths.find(x => x.boothNumber === pDuty.boothNumber);
          stations.push(b?.roomName || `Booth ${pDuty.boothNumber}`);
        }
        if (cDuty) {
          duties.push(`Table ${cDuty.tableNumber} (${cDuty.role})`);
          const b = booths.find(x => x.boothNumber === cDuty.tableNumber);
          stations.push(b?.roomName || `Table ${cDuty.tableNumber}`);
        }

        personnel.push({
          name: f.name,
          designation: (f.designation || 'Faculty').trim(),
          department: (f.department || '').trim() || '–',
          pen: (f.pen || '–').trim(),
          seniority: (f.seniority !== undefined && f.seniority !== null) ? f.seniority : 999,
          duty: duties.join(' + '),
          hasDoubleDuty: !!(pDuty && cDuty),
          isReserve: false,
          station: stations.join(' / '),
          type: 'Teaching Faculty'
        });
      } else {
        // Not excluded and Not posted -> ON RESERVE!
        const resEntry = {
          name: f.name,
          designation: (f.designation || 'Faculty').trim(),
          department: (f.department || '').trim() || '–',
          pen: (f.pen || '–').trim(),
          seniority: (f.seniority !== undefined && f.seniority !== null) ? f.seniority : 999,
          duty: 'Reserve Duty (Standby)',
          hasDoubleDuty: false,
          isReserve: true,
          station: 'Central Control Room (Reserve Pool)',
          type: 'Teaching Faculty'
        };
        personnel.push(resEntry);
        reserveList.push(resEntry);
      }
    });

    // Non-Teaching Staff
    nonTeaching.forEach(nt => {
      // Excluded ones are NOT reserve and must NOT be shown anywhere
      if (nt.isExcluded) return;

      const ntNameLower = String(nt.name || '').trim().toLowerCase();
      if (assignedObs.has(ntNameLower) || assignedDisc.has(ntNameLower) || assignedGriev.has(ntNameLower)) {
        return;
      }
      const ntAssigned = getNonTeachingAssignment(nt.name);

      if (ntAssigned.polling || ntAssigned.counting) {
        const duties = [];
        const stations = [];
        if (ntAssigned.polling) {
          duties.push(`Booth ${ntAssigned.polling.boothNumber} (Polling Assistant)`);
          const b = booths.find(x => x.boothNumber === ntAssigned.polling.boothNumber);
          stations.push(b?.roomName || `Booth ${ntAssigned.polling.boothNumber}`);
        }
        if (ntAssigned.counting) {
          const cTables = ntAssigned.countingTables && ntAssigned.countingTables.length > 0 ? ntAssigned.countingTables : [ntAssigned.counting.tableNumber];
          const tableLabel = cTables.length > 1 ? `Tables ${cTables.join(', ')}` : `Table ${cTables[0]}`;
          duties.push(`${tableLabel} (Counting Assistant)`);
          const stationNames = cTables.map(num => {
            const b = booths.find(x => x.boothNumber === num);
            return b?.roomName || `Table ${num}`;
          });
          stations.push([...new Set(stationNames)].join(' / '));
        }

        personnel.push({
          name: nt.name,
          designation: (nt.designation || 'Staff').trim(),
          department: (nt.department || nt.section || 'Office').trim() || 'Office',
          pen: (nt.pen || '–').trim(),
          seniority: 9999,
          duty: duties.join(' + '),
          hasDoubleDuty: !!(ntAssigned.polling && ntAssigned.counting),
          isReserve: false,
          station: stations.join(' / '),
          type: 'Non-Teaching Staff'
        });
      } else {
        // Not excluded and Not posted -> ON RESERVE!
        const resEntry = {
          name: nt.name,
          designation: (nt.designation || 'Staff').trim(),
          department: (nt.department || nt.section || 'Office').trim() || 'Office',
          pen: (nt.pen || '–').trim(),
          seniority: 9999,
          duty: 'Reserve Duty (Standby Assistant)',
          hasDoubleDuty: false,
          isReserve: true,
          station: 'Central Control Room (Reserve Pool)',
          type: 'Non-Teaching Staff'
        };
        personnel.push(resEntry);
        reserveList.push(resEntry);
      }
    });

    // Universal Sort: Dept (A-Z) -> Permanent Faculty (Seniority) -> Guest Faculty -> Non-Teaching Staff
    personnel.sort(compareOfficials);
    reserveList.sort(compareOfficials);

    return { obsList, discList, grievList, personnel, reserveList };
  };

  const openMasterDutyListWindow = () => {
    const orderNo = `GCC/ELEC/${electionYear}/MASTER-DUTY-01`;
    const orderDate = new Date().toLocaleDateString('en-GB');

    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up was blocked by your browser. Please allow pop-ups for this site to view and print the Master Duty List.');
      return;
    }

    const pageHtml = buildStandaloneMasterDutyListPage(orderNo, orderDate);
    win.document.open();
    win.document.write(pageHtml);
    win.document.close();
  };

  const buildStandaloneMasterDutyListPage = (orderNo, orderDate) => {
    const title = `Master_Duty_List_Polling_Counting_${electionYear}`;
    const deptWiseHtml = buildDeptWiseMasterRollHtml(orderNo, orderDate);
    const boothWiseHtml = buildBoothWiseDeploymentHtml(orderNo, orderDate);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <style id="dynamicMasterStyle">
    @page {
      size: A4 landscape;
      margin: 8mm 10mm 8mm 10mm;
    }
  </style>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10px;
      line-height: 1.35;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .sheet-wrapper {
        padding: 0 !important;
        margin: 0 !important;
      }
      .paper-sheet {
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
        max-width: none !important;
        width: 100% !important;
      }
    }
    /* Action Bar on Screen */
    .top-action-bar {
      position: sticky;
      top: 0;
      z-index: 999;
      background: #064e3b;
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 13px;
    }
    .action-bar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .action-bar-left .title-badge {
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.2px;
    }
    .action-bar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-tab-toggle {
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.25);
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.15s ease;
    }
    .btn-tab-toggle:hover {
      background: rgba(255,255,255,0.25);
    }
    .btn-tab-toggle.active {
      background: #10b981;
      border-color: #34d399;
      color: #ffffff;
      font-weight: 700;
    }
    .btn-action {
      background: #f59e0b;
      border: 1px solid #d97706;
      color: #000000;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .btn-action:hover {
      background: #fbbf24;
    }
    .btn-close-win {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .btn-close-win:hover {
      background: #ef4444;
      color: #ffffff;
    }

    /* Paper Document Canvas */
    .sheet-wrapper {
      padding: 20px;
      display: flex;
      justify-content: center;
    }
    .paper-sheet {
      background: #ffffff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      border: 1px solid #cbd5e1;
      padding: 12mm 15mm;
      max-width: 297mm;
      min-height: 210mm;
      box-sizing: border-box;
      position: relative;
    }

    /* Typography & Print Components */
    .header-container {
      text-align: center;
      border-bottom: 2px solid #000000;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .header-logo {
      height: 38px;
      margin-bottom: 3px;
      display: inline-block;
    }
    .college-title {
      font-size: 15px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 2px 0;
      color: #000000;
    }
    .order-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 2px 0 1px 0;
      color: #064e3b;
    }
    .order-sub {
      font-size: 9.5px;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
      text-transform: uppercase;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      font-weight: 700;
      margin: 6px 0 8px 0;
      padding: 3px 0;
      border-bottom: 1px dashed #64748b;
      color: #000000;
    }
    .preamble-text {
      font-size: 9.5px;
      line-height: 1.4;
      margin-bottom: 8px;
      text-align: justify;
      color: #000000;
    }
    .section-title-box {
      background: #f1f5f9;
      border: 1px solid #000000;
      padding: 4px 8px;
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      margin: 10px 0 6px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      break-after: avoid;
      page-break-after: avoid;
    }
    .master-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 10px;
    }
    .master-table th, .master-table td {
      border: 1px solid #000000;
      padding: 4px 5px;
      vertical-align: middle;
      font-size: 9px;
      word-break: break-word;
    }
    .master-table th {
      background: #f1f5f9 !important;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8.5px;
      color: #000000;
      text-align: left;
    }
    .master-table th.col-center, .master-table td.col-center {
      text-align: center;
    }
    .master-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .master-table tbody tr:nth-child(even) {
      background-color: #f8fafc !important;
    }
    .staff-name {
      font-weight: 700;
      font-size: 9.5px;
      color: #000000;
      display: block;
    }
    .staff-meta {
      font-size: 8px;
      color: #475569;
      display: block;
    }
    .dept-badge {
      font-weight: 700;
      color: #064e3b;
      font-size: 9px;
    }
    .col-sign {
      width: 125px;
      min-width: 110px;
      text-align: center;
    }
    .sign-box {
      height: 26px;
      border: 1px dashed #94a3b8;
      background: #ffffff;
      margin: 2px 0;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .copy-block {
      font-size: 8.5px;
      color: #374151;
      line-height: 1.4;
    }
    .ro-sign-block {
      text-align: center;
      width: 220px;
    }
    .ro-sign-line {
      border-bottom: 1px solid #000000;
      height: 38px;
      margin-bottom: 3px;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    .summary-metrics-bar {
      display: flex;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      font-size: 9px;
      font-weight: 600;
      margin-bottom: 10px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <!-- Action Bar on Screen -->
  <div class="no-print top-action-bar">
    <div class="action-bar-left">
      <span class="title-badge">📑 Master Duty List (Polling &amp; Counting)</span>
    </div>
    <div class="action-bar-right">
      <button id="btnViewDept" onclick="switchMasterView('dept')" class="btn-tab-toggle active">
        📋 Department-Wise Master Roll
      </button>
      <button id="btnViewBooth" onclick="switchMasterView('booth')" class="btn-tab-toggle">
        🏫 Booth &amp; Table Schedule
      </button>
      <button id="btnViewCombined" onclick="switchMasterView('combined')" class="btn-tab-toggle">
        📑 Combined View (All Sections)
      </button>
      <button onclick="window.print()" class="btn-action">
        🖨️ Print Master Duty List
      </button>
      <button onclick="window.close()" class="btn-close-win">
        ✕ Close
      </button>
    </div>
  </div>

  <!-- Document Sheet -->
  <div class="sheet-wrapper">
    <div id="paperSheet" class="paper-sheet">
      <!-- View 1: Department-Wise Master Roll (Observers 1st) -->
      <div id="viewDeptWise">
        ${deptWiseHtml}
      </div>

      <!-- View 2: Booth & Table-Wise Deployment Schedule -->
      <div id="viewBoothWise" style="display: none;">
        ${boothWiseHtml}
      </div>

      <!-- View 3: Combined View -->
      <div id="viewCombined" style="display: none;">
        ${deptWiseHtml}
        <div class="page-break" style="margin: 20px 0;"></div>
        ${boothWiseHtml}
      </div>
    </div>
  </div>

  <script>
    function switchMasterView(mode) {
      const vDept = document.getElementById('viewDeptWise');
      const vBooth = document.getElementById('viewBoothWise');
      const vComb = document.getElementById('viewCombined');
      const bDept = document.getElementById('btnViewDept');
      const bBooth = document.getElementById('btnViewBooth');
      const bComb = document.getElementById('btnViewCombined');

      bDept.classList.remove('active');
      bBooth.classList.remove('active');
      bComb.classList.remove('active');

      if (mode === 'booth') {
        vDept.style.display = 'none';
        vBooth.style.display = 'block';
        vComb.style.display = 'none';
        bBooth.classList.add('active');
      } else if (mode === 'combined') {
        vDept.style.display = 'none';
        vBooth.style.display = 'none';
        vComb.style.display = 'block';
        bComb.classList.add('active');
      } else {
        vDept.style.display = 'block';
        vBooth.style.display = 'none';
        vComb.style.display = 'none';
        bDept.classList.add('active');
      }
    }

    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 350);
    });
  <\/script>
</body>
</html>`;
  };

  const buildDeptWiseMasterRollHtml = (orderNo, orderDate) => {
    const { obsList, discList, grievList, personnel, reserveList } = getMasterDutyData();
    const totalPersonnelCount = obsList.length + discList.length + grievList.length + personnel.length;
    const activeDutyCount = obsList.length + discList.length + grievList.length + personnel.filter(p => !p.isReserve).length;
    const doubleDutyCount = personnel.filter(p => p.hasDoubleDuty).length;

    const obsHasDept = obsList.some(o => o.department && o.department.trim() && o.department !== '–' && o.department !== 'N/A' && o.department !== '-');
    const discHasDept = discList.some(d => d.department && d.department.trim() && d.department !== '–' && d.department !== 'N/A' && d.department !== '-');
    const grievHasDept = grievList.some(g => g.department && g.department.trim() && g.department !== '–' && g.department !== 'N/A' && g.department !== '-');
    const personnelHasDept = personnel.some(p => p.department && p.department.trim() && p.department !== '–' && p.department !== 'N/A' && p.department !== '-');

    return `
      <div class="master-duty-page">
        <!-- Header -->
        <div class="header-container">
          ${collegeLogo ? `<img src="${collegeLogo}" class="header-logo" alt="College Logo">` : ''}
          <h2 class="college-title">${esc(collegeName)}</h2>
          <h3 class="order-title">ELECTION OFFICIALS MASTER DUTY LIST</h3>
          <p class="order-sub">College Union Election ${esc(electionYear)} · Polling &amp; Counting Duty Roster</p>
        </div>

        <!-- Meta Bar -->
        <div class="meta-bar">
          <span>Order No: ${esc(orderNo)}</span>
          <span>Ref: Election Notification No. ${esc(collegeShortName)}/ELEC/${esc(electionYear)}/01</span>
          <span>Date: ${esc(orderDate)}</span>
        </div>

        <!-- Preamble -->
        <p class="preamble-text">
          For the smooth, fair, and orderly conduct of the <strong>College Union Election ${esc(electionYear)}</strong>, 
          the following Teaching Faculty and Non-Teaching Staff members are assigned election duties as 
          <strong>Observers, Campus Discipline Committee, Grievance Committee, Polling &amp; Counting Personnel, and Reserve Pool</strong>. 
          Officials are sorted department-wise for administrative convenience and are kindly requested to report at their respective stations as scheduled. 
          Personnel in the Reserve Pool are requested to remain on standby at the Central Control Room for relief and support as needed. 
          Your kind cooperation and active support are earnestly requested for the successful conduct of the election.
        </p>

        <!-- Summary Metrics -->
        <div class="summary-metrics-bar">
          <span><strong>Total Roster Personnel:</strong> ${totalPersonnelCount}</span>
          <span>•</span>
          <span><strong>Observers:</strong> ${obsList.length}</span>
          <span>•</span>
          <span><strong>Discipline Committee:</strong> ${discList.length}</span>
          <span>•</span>
          <span><strong>Grievance Committee:</strong> ${grievList.length}</span>
          <span>•</span>
          <span><strong>Active Duty Deployed:</strong> ${activeDutyCount}</span>
          <span>•</span>
          <span><strong>Reserve Pool:</strong> ${reserveList.length}</span>
          <span>•</span>
          <span><strong>Double Duty (Poll &amp; Count):</strong> ${doubleDutyCount}</span>
        </div>

        <!-- SECTION 1: ELECTION OBSERVERS -->
        <div class="section-title-box">
          <span>⚖️ SECTION 1: ELECTION OBSERVERS</span>
          <span style="font-size: 8.5px; font-weight: normal;">General Supervision</span>
        </div>

        ${obsList.length === 0 ? `
          <div style="border: 1px dashed #cbd5e1; padding: 10px; text-align: center; color: #64748b; font-style: italic; margin-bottom: 10px;">
            No separate observers appointed.
          </div>
        ` : `
          <table class="master-table">
            <colgroup>
              ${obsHasDept ? `
                <col style="width: 7%;">
                <col style="width: 28%;">
                <col style="width: 22%;">
                <col style="width: 18%;">
                <col style="width: 11%;">
                <col style="width: 14%;">
              ` : `
                <col style="width: 8%;">
                <col style="width: 38%;">
                <col style="width: 24%;">
                <col style="width: 14%;">
                <col style="width: 16%;">
              `}
            </colgroup>
            <thead>
              <tr>
                <th class="col-center">Sl #</th>
                <th>Name of Observer</th>
                ${obsHasDept ? '<th>Department</th>' : ''}
                <th>Designation</th>
                <th>PEN #</th>
                <th class="col-center">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${obsList.map(obs => `
                <tr style="background: #fffbeb !important;">
                  <td class="col-center" style="font-weight: 700; font-family: monospace;">${esc(obs.slNo)}</td>
                  <td>
                    <span class="staff-name">${esc(obs.name)}</span>
                  </td>
                  ${obsHasDept ? `<td><span class="dept-badge">${esc(obs.department)}</span></td>` : ''}
                  <td>${esc(obs.designation)}</td>
                  <td style="font-family: monospace; font-weight: 600;">${esc(obs.pen)}</td>
                  <td class="col-sign">
                    <div class="sign-box"></div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <!-- SECTION 2: CAMPUS DISCIPLINE -->
        <div class="section-title-box" style="margin-top: 14px;">
          <span>🛡️ SECTION 2: CAMPUS DISCIPLINE</span>
          <span style="font-size: 8.5px; font-weight: normal;">Campus &amp; Corridor Order</span>
        </div>

        ${discList.length === 0 ? `
          <div style="border: 1px dashed #cbd5e1; padding: 10px; text-align: center; color: #64748b; font-style: italic; margin-bottom: 10px;">
            No separate discipline committee appointed.
          </div>
        ` : `
          <table class="master-table">
            <colgroup>
              ${discHasDept ? `
                <col style="width: 7%;">
                <col style="width: 28%;">
                <col style="width: 22%;">
                <col style="width: 18%;">
                <col style="width: 11%;">
                <col style="width: 14%;">
              ` : `
                <col style="width: 8%;">
                <col style="width: 38%;">
                <col style="width: 24%;">
                <col style="width: 14%;">
                <col style="width: 16%;">
              `}
            </colgroup>
            <thead>
              <tr>
                <th class="col-center">Sl #</th>
                <th>Name of Official</th>
                ${discHasDept ? '<th>Department</th>' : ''}
                <th>Designation</th>
                <th>PEN #</th>
                <th class="col-center">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${discList.map(disc => `
                <tr style="background: #f0fdf4 !important;">
                  <td class="col-center" style="font-weight: 700; font-family: monospace;">${esc(disc.slNo)}</td>
                  <td>
                    <span class="staff-name">${esc(disc.name)}</span>
                  </td>
                  ${discHasDept ? `<td><span class="dept-badge" style="color: #166534;">${esc(disc.department)}</span></td>` : ''}
                  <td>${esc(disc.designation)}</td>
                  <td style="font-family: monospace; font-weight: 600;">${esc(disc.pen)}</td>
                  <td class="col-sign">
                    <div class="sign-box"></div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <!-- SECTION 3: GRIEVANCE REDRESSAL COMMITTEE -->
        <div class="section-title-box" style="margin-top: 14px;">
          <span>🤝 SECTION 3: GRIEVANCE REDRESSAL COMMITTEE</span>
          <span style="font-size: 8.5px; font-weight: normal;">Station: Grievance Cell / Principal Office · Reporting: 08:00 AM</span>
        </div>

        ${grievList.length === 0 ? `
          <div style="border: 1px dashed #cbd5e1; padding: 10px; text-align: center; color: #64748b; font-style: italic; margin-bottom: 10px;">
            No separate grievance committee appointed.
          </div>
        ` : `
          <table class="master-table">
            <colgroup>
              ${grievHasDept ? `
                <col style="width: 7%;">
                <col style="width: 28%;">
                <col style="width: 22%;">
                <col style="width: 18%;">
                <col style="width: 11%;">
                <col style="width: 14%;">
              ` : `
                <col style="width: 8%;">
                <col style="width: 38%;">
                <col style="width: 24%;">
                <col style="width: 14%;">
                <col style="width: 16%;">
              `}
            </colgroup>
            <thead>
              <tr>
                <th class="col-center">Sl #</th>
                <th>Name of Official</th>
                ${grievHasDept ? '<th>Department</th>' : ''}
                <th>Designation</th>
                <th>PEN #</th>
                <th class="col-center">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${grievList.map(g => `
                <tr style="background: #f0f9ff !important;">
                  <td class="col-center" style="font-weight: 700; font-family: monospace;">${esc(g.slNo)}</td>
                  <td>
                    <span class="staff-name">${esc(g.name)}</span>
                  </td>
                  ${grievHasDept ? `<td><span class="dept-badge" style="color: #0369a1;">${esc(g.department)}</span></td>` : ''}
                  <td>${esc(g.designation)}</td>
                  <td style="font-family: monospace; font-weight: 600;">${esc(g.pen)}</td>
                  <td class="col-sign">
                    <div class="sign-box"></div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <!-- SECTION 4: DEPARTMENT-WISE DUTY ROSTER -->
        <div class="section-title-box" style="margin-top: 14px;">
          <span>📋 SECTION 4: DEPARTMENT-WISE DUTY ROSTER</span>
          <span style="font-size: 8.5px; font-weight: normal;">Attendance &amp; Duty Register (Active Duty &amp; Reserve Pool)</span>
        </div>

        ${personnel.length === 0 ? `
          <div style="border: 1px dashed #cbd5e1; padding: 10px; text-align: center; color: #64748b; font-style: italic; margin-bottom: 10px;">
            No personnel duty allotments recorded yet. Please complete booth and table allotments in the Team Builder first.
          </div>
        ` : `
          <table class="master-table">
            <colgroup>
              ${personnelHasDept ? `
                <col style="width: 5%;">
                <col style="width: 22%;">
                <col style="width: 16%;">
                <col style="width: 14%;">
                <col style="width: 10%;">
                <col style="width: 21%;">
                <col style="width: 12%;">
              ` : `
                <col style="width: 6%;">
                <col style="width: 28%;">
                <col style="width: 18%;">
                <col style="width: 12%;">
                <col style="width: 24%;">
                <col style="width: 12%;">
              `}
            </colgroup>
            <thead>
              <tr>
                <th class="col-center">Sl #</th>
                <th>Name of Official</th>
                ${personnelHasDept ? '<th>Department</th>' : ''}
                <th>Designation</th>
                <th>PEN #</th>
                <th>Duty Assigned &amp; Station</th>
                <th class="col-center">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${personnel.map((p, idx) => `
                <tr style="${p.isReserve ? 'background: #f8fafc !important;' : ''}">
                  <td class="col-center" style="font-weight: 700; font-family: monospace;">${idx + 1}</td>
                  <td>
                    <span class="staff-name">${esc(p.name)}</span>
                    ${p.hasDoubleDuty ? `<span style="font-size: 8px; color: #b45309; font-weight: bold; background: #fef3c7; padding: 1px 4px; border-radius: 3px; display: inline-block; margin-top: 1px;">⚠️ Double Duty (Polling &amp; Counting)</span>` : ''}
                    ${p.isReserve ? `<span style="font-size: 8px; color: #475569; font-weight: 600; background: #e2e8f0; padding: 1px 5px; border-radius: 3px; display: inline-block; margin-top: 1px;">Reserve Official</span>` : ''}
                  </td>
                  ${personnelHasDept ? `
                  <td>
                    <span class="dept-badge">${esc(p.department)}</span>
                  </td>
                  ` : ''}
                  <td>
                    <span>${esc(p.designation)}</span>
                  </td>
                  <td style="font-family: monospace; font-weight: 600;">${esc(p.pen)}</td>
                  <td>
                    ${p.isReserve ? `
                      <strong style="color: #475569;">${esc(p.duty)}</strong><br>
                      <span class="staff-meta">Station: ${esc(p.station)}</span>
                    ` : `
                      <div style="font-weight: 600; color: #0f172a;">${esc(p.duty)}</div>
                      <span class="staff-meta">Venue: ${esc(p.station)}</span>
                    `}
                  </td>
                  <td class="col-sign">
                    <div class="sign-box"></div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <!-- Footer Signatures -->
        <div class="footer-row">
          <div class="copy-block">
            <strong>Copy forwarded for kind information and necessary action:</strong><br>
            1. All Appointed Observers, Discipline Committee, Grievance Committee, Polling &amp; Counting Personnel<br>
            2. Reserve Pool Personnel<br>
            3. The Principal, ${esc(collegeName)}<br>
            4. Election Office File<br>
            5. Guard File / Record File
          </div>
          <div class="ro-sign-block">
            <div class="ro-sign-line"></div>
            <strong>RETURNING OFFICER</strong><br>
            <span style="font-size: 9px;">College Union Election ${esc(electionYear)}</span><br>
            <span style="font-size: 8.5px; color: #4b5563;">${esc(collegeName)}</span>
          </div>
        </div>
      </div>
    `;
  };

  const buildBoothWiseDeploymentHtml = (orderNo, orderDate) => {
    const { obsList, discList, grievList, reserveList } = getMasterDutyData();

    const obsHasDept = obsList.some(o => o.department && o.department.trim() && o.department !== '–' && o.department !== 'N/A' && o.department !== '-');
    const discHasDept = discList.some(d => d.department && d.department.trim() && d.department !== '–' && d.department !== 'N/A' && d.department !== '-');
    const grievHasDept = grievList.some(g => g.department && g.department.trim() && g.department !== '–' && g.department !== 'N/A' && g.department !== '-');
    const resHasDept = reserveList.some(r => r.department && r.department.trim() && r.department !== '–' && r.department !== 'N/A' && r.department !== '-');

    const pollHasDept = booths.some(b => {
      const team = pollingTeams.find(t => t.boothNumber === b.boothNumber) || {};
      const slots = [team.presidingOfficer, team.pollingOfficer1, team.pollingOfficer2, team.pollingOfficer3, team.pollingAssistant];
      return slots.some(s => {
        if (!s || !s.name) return false;
        const personObj = getPerson(s.name);
        const dept = (personObj?.department || (s.isAssistant ? 'Office' : '')).trim();
        return dept && dept !== '–' && dept !== 'N/A' && dept !== '-';
      });
    });

    const countHasDept = booths.some(b => {
      const team = countingTeams.find(t => t.tableNumber === b.boothNumber) || {};
      const slots = [team.supervisor, team.countingOfficer1, team.countingOfficer2, team.countingOfficer3, team.countingAssistant];
      return slots.some(s => {
        if (!s || !s.name) return false;
        const personObj = getPerson(s.name);
        const dept = (personObj?.department || (s.isAssistant ? 'Office' : '')).trim();
        return dept && dept !== '–' && dept !== 'N/A' && dept !== '-';
      });
    });

    return `
      <div class="master-booth-page">
        <!-- Header -->
        <div class="header-container">
          ${collegeLogo ? `<img src="${collegeLogo}" class="header-logo" alt="College Logo">` : ''}
          <h2 class="college-title">${esc(collegeName)}</h2>
          <h3 class="order-title">BOOTH-WISE &amp; TABLE-WISE DUTY SCHEDULE</h3>
          <p class="order-sub">College Union Election ${esc(electionYear)} · Assigned Teams</p>
        </div>

        <!-- Meta Bar -->
        <div class="meta-bar">
          <span>Order No: ${esc(orderNo)}</span>
          <span>Ref: Election Notification No. ${esc(collegeShortName)}/ELEC/${esc(electionYear)}/01</span>
          <span>Date: ${esc(orderDate)}</span>
        </div>

        <!-- SECTION 1: OBSERVERS (SHOWN FIRST) -->
        <div class="section-title-box">
          <span>⚖️ ELECTION OBSERVERS</span>
          <span style="font-size: 8.5px; font-weight: normal;">General Supervision</span>
        </div>

        ${obsList.length === 0 ? `
          <div style="border: 1px dashed #cbd5e1; padding: 8px; text-align: center; color: #64748b; font-style: italic; margin-bottom: 10px;">
            No separate observers appointed.
          </div>
        ` : `
          <table class="master-table">
            <colgroup>
              ${obsHasDept ? `
                <col style="width: 8%;">
                <col style="width: 28%;">
                <col style="width: 22%;">
                <col style="width: 16%;">
                <col style="width: 12%;">
                <col style="width: 14%;">
              ` : `
                <col style="width: 8%;">
                <col style="width: 38%;">
                <col style="width: 22%;">
                <col style="width: 16%;">
                <col style="width: 16%;">
              `}
            </colgroup>
            <thead>
              <tr>
                <th class="col-center">Slot #</th>
                <th>Name of Observer</th>
                ${obsHasDept ? '<th>Department</th>' : ''}
                <th>Designation</th>
                <th>PEN #</th>
                <th class="col-center">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${obsList.map(obs => `
                <tr style="background: #fffbeb !important;">
                  <td class="col-center" style="font-weight: 700; font-family: monospace;">${esc(obs.slNo)}</td>
                  <td><span class="staff-name">${esc(obs.name)}</span></td>
                  ${obsHasDept ? `<td><span class="dept-badge">${esc(obs.department)}</span></td>` : ''}
                  <td>${esc(obs.designation)}</td>
                  <td style="font-family: monospace; font-weight: 600;">${esc(obs.pen)}</td>
                  <td class="col-sign"><div class="sign-box"></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <!-- SECTION 2: CAMPUS DISCIPLINE -->
        <div class="section-title-box" style="margin-top: 14px;">
          <span>🛡️ CAMPUS DISCIPLINE</span>
          <span style="font-size: 8.5px; font-weight: normal;">Station: Campus &amp; Corridors · Reporting: 07:30 AM</span>
        </div>

        ${discList.length === 0 ? `
          <div style="border: 1px dashed #cbd5e1; padding: 8px; text-align: center; color: #64748b; font-style: italic; margin-bottom: 10px;">
            No separate discipline committee appointed.
          </div>
        ` : `
          <table class="master-table">
            <colgroup>
              ${discHasDept ? `
                <col style="width: 8%;">
                <col style="width: 28%;">
                <col style="width: 22%;">
                <col style="width: 16%;">
                <col style="width: 12%;">
                <col style="width: 14%;">
              ` : `
                <col style="width: 8%;">
                <col style="width: 38%;">
                <col style="width: 22%;">
                <col style="width: 16%;">
                <col style="width: 16%;">
              `}
            </colgroup>
            <thead>
              <tr>
                <th class="col-center">Slot #</th>
                <th>Name of Official</th>
                ${discHasDept ? '<th>Department</th>' : ''}
                <th>Designation</th>
                <th>PEN #</th>
                <th class="col-center">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${discList.map(disc => `
                <tr style="background: #f0fdf4 !important;">
                  <td class="col-center" style="font-weight: 700; font-family: monospace;">${esc(disc.slNo)}</td>
                  <td>
                    <span class="staff-name">${esc(disc.name)}</span>
                  </td>
                  ${discHasDept ? `<td><span class="dept-badge" style="color: #166534;">${esc(disc.department)}</span></td>` : ''}
                  <td>${esc(disc.designation)}</td>
                  <td style="font-family: monospace; font-weight: 600;">${esc(disc.pen)}</td>
                  <td class="col-sign"><div class="sign-box"></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <!-- SECTION 3: GRIEVANCE REDRESSAL COMMITTEE -->
        <div class="section-title-box" style="margin-top: 14px;">
          <span>🤝 GRIEVANCE REDRESSAL COMMITTEE</span>
          <span style="font-size: 8.5px; font-weight: normal;">Station: Grievance Cell / Principal Office · Reporting: 08:00 AM</span>
        </div>

        ${grievList.length === 0 ? `
          <div style="border: 1px dashed #cbd5e1; padding: 8px; text-align: center; color: #64748b; font-style: italic; margin-bottom: 10px;">
            No separate grievance committee appointed.
          </div>
        ` : `
          <table class="master-table">
            <colgroup>
              ${grievHasDept ? `
                <col style="width: 8%;">
                <col style="width: 28%;">
                <col style="width: 22%;">
                <col style="width: 16%;">
                <col style="width: 12%;">
                <col style="width: 14%;">
              ` : `
                <col style="width: 8%;">
                <col style="width: 38%;">
                <col style="width: 22%;">
                <col style="width: 16%;">
                <col style="width: 16%;">
              `}
            </colgroup>
            <thead>
              <tr>
                <th class="col-center">Slot #</th>
                <th>Name of Official</th>
                ${grievHasDept ? '<th>Department</th>' : ''}
                <th>Designation</th>
                <th>PEN #</th>
                <th class="col-center">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${grievList.map(g => `
                <tr style="background: #f0f9ff !important;">
                  <td class="col-center" style="font-weight: 700; font-family: monospace;">${esc(g.slNo)}</td>
                  <td>
                    <span class="staff-name">${esc(g.name)}</span>
                  </td>
                  ${grievHasDept ? `<td><span class="dept-badge" style="color: #0369a1;">${esc(g.department)}</span></td>` : ''}
                  <td>${esc(g.designation)}</td>
                  <td style="font-family: monospace; font-weight: 600;">${esc(g.pen)}</td>
                  <td class="col-sign"><div class="sign-box"></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <!-- PART A: POLLING BOOTHS -->
        <div class="section-title-box">
          <span>🏫 PART A: POLLING BOOTHS (BOOTHS 1 TO ${booths.length})</span>
          <span style="font-size: 8.5px; font-weight: normal;">Reporting: 08:00 AM · Polling: 09:30 AM – 01:30 PM</span>
        </div>

        <table class="master-table">
          <colgroup>
            ${pollHasDept ? `
              <col style="width: 6%;">
              <col style="width: 14%;">
              <col style="width: 15%;">
              <col style="width: 24%;">
              <col style="width: 18%;">
              <col style="width: 9%;">
              <col style="width: 14%;">
            ` : `
              <col style="width: 7%;">
              <col style="width: 16%;">
              <col style="width: 18%;">
              <col style="width: 30%;">
              <col style="width: 13%;">
              <col style="width: 16%;">
            `}
          </colgroup>
          <thead>
            <tr>
              <th class="col-center">Booth #</th>
              <th>Station / Venue</th>
              <th>Designated Role</th>
              <th>Name of Official</th>
              ${pollHasDept ? '<th>Department</th>' : ''}
              <th>PEN #</th>
              <th class="col-center">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${booths.map(b => {
              const team = pollingTeams.find(t => t.boothNumber === b.boothNumber) || {};
              const slots = [
                { role: 'Presiding Officer', person: team.presidingOfficer, isHead: true },
                { role: 'Polling Officer', person: team.pollingOfficer1 },
                { role: 'Polling Officer', person: team.pollingOfficer2 },
                ...(team.pollingOfficer3 ? [{ role: 'Polling Officer', person: team.pollingOfficer3 }] : []),
                { role: 'Polling Assistant', person: team.pollingAssistant, isAssistant: true }
              ];

              return slots.map((s, sIdx) => {
                const personObj = s.person ? getPerson(s.person.name) : null;
                const dept = (personObj?.department || (s.isAssistant ? 'Office' : '')).trim() || '–';
                const pen = s.person?.pen || personObj?.pen || '–';

                return `
                  <tr>
                    ${sIdx === 0 ? `
                      <td rowspan="${slots.length}" class="col-center" style="font-weight: 800; font-family: monospace; font-size: 11px; background: #f8fafc;">
                        Booth ${b.boothNumber}
                      </td>
                      <td rowspan="${slots.length}" style="font-weight: 700; background: #f8fafc;">
                        ${esc(b.roomName || `Booth ${b.boothNumber}`)}
                      </td>
                    ` : ''}
                    <td style="font-weight: ${s.isHead ? '700' : 'normal'}; color: ${s.isHead ? '#b45309' : (s.isAssistant ? '#047857' : '#0f172a')};">
                      ${esc(s.role)}
                    </td>
                    <td>
                      ${s.person && s.person.name && !personObj?.isExcluded ? `
                        <span class="staff-name">${esc(s.person.name)}</span>
                      ` : (personObj?.isExcluded ? '<span style="color: #94a3b8; font-style: italic;">– Excluded Official –</span>' : '<span style="color: #94a3b8; font-style: italic;">– Unassigned –</span>')}
                    </td>
                    ${pollHasDept ? `<td><span class="dept-badge">${esc(personObj?.isExcluded ? '–' : dept)}</span></td>` : ''}
                    <td style="font-family: monospace;">${esc(personObj?.isExcluded ? '–' : pen)}</td>
                    <td class="col-sign"><div class="sign-box"></div></td>
                  </tr>
                `;
              }).join('');
            }).join('')}
          </tbody>
        </table>

        <!-- PART B: COUNTING TABLES -->
        <div class="section-title-box">
          <span>🧮 PART B: COUNTING TABLES (TABLES 1 TO ${booths.length})</span>
          <span style="font-size: 8.5px; font-weight: normal;">Reporting: 01:30 PM · Counting: 02:00 PM Continuously</span>
        </div>

        <table class="master-table">
          <colgroup>
            ${countHasDept ? `
              <col style="width: 6%;">
              <col style="width: 14%;">
              <col style="width: 15%;">
              <col style="width: 24%;">
              <col style="width: 18%;">
              <col style="width: 9%;">
              <col style="width: 14%;">
            ` : `
              <col style="width: 7%;">
              <col style="width: 16%;">
              <col style="width: 18%;">
              <col style="width: 30%;">
              <col style="width: 13%;">
              <col style="width: 16%;">
            `}
          </colgroup>
          <thead>
            <tr>
              <th class="col-center">Table #</th>
              <th>Station / Venue</th>
              <th>Designated Role</th>
              <th>Name of Official</th>
              ${countHasDept ? '<th>Department</th>' : ''}
              <th>PEN #</th>
              <th class="col-center">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${booths.map(b => {
              const team = countingTeams.find(t => t.tableNumber === b.boothNumber) || {};
              const slots = [
                { role: 'Counting Supervisor', person: team.supervisor, isHead: true },
                { role: 'Counting Officer 1', person: team.countingOfficer1 },
                { role: 'Counting Officer 2', person: team.countingOfficer2 },
                { role: 'Counting Officer 3 (Addl)', person: team.countingOfficer3 },
                { role: 'Counting Assistant', person: team.countingAssistant, isAssistant: true }
              ].filter(s => s.role !== 'Counting Officer 3 (Addl)' || team.countingOfficer3);

              return slots.map((s, sIdx) => {
                const personObj = s.person ? getPerson(s.person.name) : null;
                const dept = (personObj?.department || (s.isAssistant ? 'Office' : '')).trim() || '–';
                const pen = s.person?.pen || personObj?.pen || '–';

                return `
                  <tr>
                    ${sIdx === 0 ? `
                      <td rowspan="${slots.length}" class="col-center" style="font-weight: 800; font-family: monospace; font-size: 11px; background: #f8fafc;">
                        Table ${b.boothNumber}
                      </td>
                      <td rowspan="${slots.length}" style="font-weight: 700; background: #f8fafc;">
                        ${esc(b.roomName || `Table ${b.boothNumber}`)}
                      </td>
                    ` : ''}
                    <td style="font-weight: ${s.isHead ? '700' : 'normal'}; color: ${s.isHead ? '#7e22ce' : (s.isAssistant ? '#047857' : '#0f172a')};">
                      ${esc(s.role)}
                    </td>
                    <td>
                      ${s.person && s.person.name && !personObj?.isExcluded ? `
                        <span class="staff-name">${esc(s.person.name)}</span>
                      ` : (personObj?.isExcluded ? '<span style="color: #94a3b8; font-style: italic;">– Excluded Official –</span>' : '<span style="color: #94a3b8; font-style: italic;">– Unassigned –</span>')}
                    </td>
                    ${countHasDept ? `<td><span class="dept-badge">${esc(personObj?.isExcluded ? '–' : dept)}</span></td>` : ''}
                    <td style="font-family: monospace;">${esc(personObj?.isExcluded ? '–' : pen)}</td>
                    <td class="col-sign"><div class="sign-box"></div></td>
                  </tr>
                `;
              }).join('');
            }).join('')}
          </tbody>
        </table>

        <!-- PART C: RESERVE POOL -->
        <div class="section-title-box" style="margin-top: 14px;">
          <span>👥 PART C: RESERVE POOL (STANDBY)</span>
          <span style="font-size: 8.5px; font-weight: normal;">Station: Central Control Room · Reporting: 08:00 AM · Standby for Relief</span>
        </div>

        ${reserveList.length === 0 ? `
          <div style="border: 1px dashed #cbd5e1; padding: 8px; text-align: center; color: #64748b; font-style: italic; margin-bottom: 10px;">
            All non-excluded personnel have been deployed to active duty stations. No reserve personnel currently unassigned.
          </div>
        ` : `
          <table class="master-table">
            <colgroup>
              ${resHasDept ? `
                <col style="width: 8%;">
                <col style="width: 28%;">
                <col style="width: 22%;">
                <col style="width: 16%;">
                <col style="width: 12%;">
                <col style="width: 14%;">
              ` : `
                <col style="width: 8%;">
                <col style="width: 38%;">
                <col style="width: 22%;">
                <col style="width: 16%;">
                <col style="width: 16%;">
              `}
            </colgroup>
            <thead>
              <tr>
                <th class="col-center">Slot #</th>
                <th>Name of Official</th>
                ${resHasDept ? '<th>Department</th>' : ''}
                <th>Designation</th>
                <th>PEN #</th>
                <th class="col-center">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${reserveList.map((res, rIdx) => `
                <tr style="background: #f8fafc !important;">
                  <td class="col-center" style="font-weight: 700; font-family: monospace;">Res-${rIdx + 1}</td>
                  <td><span class="staff-name">${esc(res.name)}</span></td>
                  ${resHasDept ? `<td><span class="dept-badge">${esc(res.department)}</span></td>` : ''}
                  <td>${esc(res.designation)}</td>
                  <td style="font-family: monospace; font-weight: 600;">${esc(res.pen)}</td>
                  <td class="col-sign"><div class="sign-box"></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <!-- Footer Signatures -->
        <div class="footer-row">
          <div class="copy-block">
            <strong>Copy forwarded for kind information and necessary action:</strong><br>
            1. All Appointed Observers, Discipline Committee, Grievance Committee, Polling &amp; Counting Personnel<br>
            2. Reserve Pool Personnel<br>
            3. The Principal, ${esc(collegeName)}<br>
            4. Election Office File<br>
            5. Guard File / Record File
          </div>
          <div class="ro-sign-block">
            <div class="ro-sign-line"></div>
            <strong>RETURNING OFFICER</strong><br>
            <span style="font-size: 9px;">College Union Election ${esc(electionYear)}</span><br>
            <span style="font-size: 8.5px; color: #4b5563;">${esc(collegeName)}</span>
          </div>
        </div>
      </div>
    `;
  };

  // ─── Duty Orders Standalone Window & High-Precision Print Engine ──────────

  const openDutyOrdersWindow = (type) => {
    const isPolling = type === 'polling';
    const orderNo = `GCC/ELEC/${electionYear}/${isPolling ? 'POLL' : 'COUNT'}-01`;
    const orderDate = new Date().toLocaleDateString('en-GB');
    const reportingTime = isPolling ? '08:00 AM' : '01:30 PM';

    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up was blocked by your browser. Please allow pop-ups for this site to view and print appointment orders.');
      return;
    }

    const pageHtml = buildStandaloneDutyOrdersPage(type, orderNo, orderDate, reportingTime);
    win.document.open();
    win.document.write(pageHtml);
    win.document.close();
  };

  const buildStandaloneDutyOrdersPage = (type, orderNo, orderDate, reportingTime) => {
    const isPolling = type === 'polling';
    const title = isPolling ? `Polling_Duty_Orders_${electionYear}` : `Counting_Duty_Orders_${electionYear}`;
    const rosterHtml = buildRosterHtml(type, orderNo, orderDate, reportingTime);
    const individualHtml = buildIndividualOrdersHtml(type, orderNo, orderDate, reportingTime);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <style id="dynamicPageStyle">
    @page {
      size: A4 landscape;
      margin: 8mm 10mm 8mm 10mm;
    }
  </style>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10px;
      line-height: 1.35;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .sheet-wrapper {
        padding: 0 !important;
        margin: 0 !important;
      }
      .paper-sheet {
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
        max-width: none !important;
        width: 100% !important;
      }
    }
    /* Screen View Action Bar */
    .top-action-bar {
      position: sticky;
      top: 0;
      z-index: 999;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 13px;
    }
    .action-bar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .action-bar-left .title-badge {
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.2px;
    }
    .action-bar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-action {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-action:hover { background: #4338ca; }
    .btn-tab-toggle {
      background: #334155;
      color: #e2e8f0;
      border: 1px solid #475569;
      padding: 7px 14px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-tab-toggle:hover { background: #475569; color: #ffffff; }
    .btn-tab-toggle.active { background: #2563eb; color: #ffffff; border-color: #3b82f6; }
    .btn-close-win {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      padding: 7px 14px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-close-win:hover { background: #334155; color: #ffffff; }

    /* Paper Sheet Container on Screen */
    .sheet-wrapper {
      padding: 24px 20px;
      display: flex;
      justify-content: center;
    }
    .paper-sheet {
      background: #ffffff;
      color: #000000;
      width: 100%;
      max-width: 1120px;
      box-shadow: 0 4px 25px rgba(0,0,0,0.12);
      border-radius: 4px;
      padding: 25px 32px;
      transition: max-width 0.2s ease;
    }
    .paper-sheet.portrait-mode {
      max-width: 820px;
    }

    /* Document Layout */
    .header-container {
      text-align: center;
      border-bottom: 2px solid #000000;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .header-logo {
      max-height: 52px;
      max-width: 140px;
      margin: 0 auto 5px auto;
      display: block;
      object-fit: contain;
    }
    .college-title {
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
      color: #000000;
    }
    .order-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 3px 0 0 0;
      color: #111827;
    }
    .order-sub {
      font-size: 10.5px;
      font-weight: 700;
      color: #374151;
      margin: 2px 0 0 0;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      font-weight: 700;
      margin: 8px 0 10px 0;
      padding: 4px 0;
      border-bottom: 1px dashed #64748b;
      color: #000000;
    }
    .preamble-text {
      font-size: 10px;
      line-height: 1.45;
      margin-bottom: 10px;
      text-align: justify;
      color: #000000;
    }
    .roster-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 10px;
    }
    .roster-table th, .roster-table td {
      border: 1px solid #000000;
      padding: 5px 6px;
      vertical-align: top;
      font-size: 9.5px;
      word-break: break-word;
    }
    .roster-table th {
      background: #f1f5f9 !important;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 9px;
      color: #000000;
      text-align: left;
    }
    .roster-table th.col-center, .roster-table td.col-center {
      text-align: center;
    }
    .roster-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .roster-table tbody tr:nth-child(even) {
      background-color: #f8fafc !important;
    }
    .staff-name {
      font-weight: 700;
      font-size: 10px;
      color: #000000;
      display: block;
    }
    .staff-meta {
      font-size: 8.5px;
      color: #374151;
      display: block;
      margin-top: 1px;
    }
    .unassigned {
      color: #94a3b8;
      font-style: italic;
      font-size: 8.5px;
    }
    .instructions-panel {
      border: 1px solid #64748b;
      background: #f8fafc !important;
      padding: 6px 10px;
      font-size: 8.5px;
      line-height: 1.4;
      margin-bottom: 10px;
      border-radius: 3px;
      color: #1e293b;
    }
    .instructions-panel ol {
      margin: 2px 0 0 14px;
      padding: 0;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 12px;
      page-break-inside: avoid;
    }
    .copy-block {
      font-size: 8.5px;
      color: #374151;
      line-height: 1.4;
    }
    .ro-sign-block {
      text-align: center;
      width: 200px;
    }
    .ro-sign-line {
      border-bottom: 1px solid #000000;
      height: 38px;
      margin-bottom: 3px;
    }

    /* Individual Slips */
    .slip-container {
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
      border: 1.5px solid #1f2937;
      border-radius: 4px;
      padding: 16px 20px;
      margin-bottom: 20px;
      background: #ffffff;
      position: relative;
    }
    .slip-page-break {
      page-break-after: always;
      break-after: page;
    }
    .slip-header {
      text-align: center;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .slip-college {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .slip-office {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #1f2937;
      margin-top: 1px;
    }
    .slip-title {
      font-size: 11.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
      color: #000000;
    }
    .slip-meta-bar {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      font-weight: 700;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px dashed #666666;
    }
    .slip-to-block {
      font-size: 11px;
      margin-bottom: 8px;
      line-height: 1.4;
      padding: 5px 8px;
      background: #f8fafc;
      border-left: 3px solid #1e293b;
    }
    .slip-body {
      font-size: 10.5px;
      line-height: 1.45;
      margin-bottom: 10px;
      text-align: justify;
    }
    .slip-body p {
      margin: 0 0 6px 0;
    }
    .slip-note {
      font-size: 9.5px;
      color: #334155;
      font-style: italic;
      border-left: 2px solid #94a3b8;
      padding-left: 6px;
      margin-top: 6px;
    }
    .slip-sign-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 12px;
      margin-bottom: 12px;
    }
    .slip-ack-section {
      border-top: 1.5px dashed #000000;
      padding-top: 8px;
      margin-top: 10px;
      font-size: 9.5px;
    }
    .slip-ack-cut {
      text-align: center;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #4b5563;
      margin-bottom: 4px;
    }
    .slip-ack-sign-line {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 4px;
    }
  </style>
</head>
<body>
  <!-- Action Bar on Screen -->
  <div class="no-print top-action-bar">
    <div class="action-bar-left">
      <span class="title-badge">${isPolling ? '🏫 Polling Booth Officials Duty Orders' : '🧮 Counting Table Officials Duty Orders'}</span>
    </div>
    <div class="action-bar-right">
      <button id="btnRoster" onclick="switchView('roster')" class="btn-tab-toggle active">
        📋 Consolidated Roster (Landscape)
      </button>
      <button id="btnIndividual" onclick="switchView('individual')" class="btn-tab-toggle">
        📜 Individual Appointment Orders (Slips)
      </button>
      <button onclick="window.print()" class="btn-action">
        🖨️ Print Document
      </button>
      <button onclick="window.close()" class="btn-close-win">
        ✕ Close
      </button>
    </div>
  </div>

  <!-- Document Sheet -->
  <div class="sheet-wrapper">
    <div id="paperSheet" class="paper-sheet">
      <div id="viewRoster">
        ${rosterHtml}
      </div>
      <div id="viewIndividual" style="display: none;">
        ${individualHtml}
      </div>
    </div>
  </div>

  <script>
    function switchView(mode) {
      const roster = document.getElementById('viewRoster');
      const ind = document.getElementById('viewIndividual');
      const sheet = document.getElementById('paperSheet');
      const btnR = document.getElementById('btnRoster');
      const btnI = document.getElementById('btnIndividual');
      const stylePage = document.getElementById('dynamicPageStyle');

      if (mode === 'individual') {
        roster.style.display = 'none';
        ind.style.display = 'block';
        sheet.classList.add('portrait-mode');
        btnR.classList.remove('active');
        btnI.classList.add('active');
        if (stylePage) stylePage.innerHTML = '@page { size: A4 portrait; margin: 10mm 12mm; }';
      } else {
        roster.style.display = 'block';
        ind.style.display = 'none';
        sheet.classList.remove('portrait-mode');
        btnR.classList.add('active');
        btnI.classList.remove('active');
        if (stylePage) stylePage.innerHTML = '@page { size: A4 landscape; margin: 8mm 10mm; }';
      }
    }

    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 350);
    });
  <\/script>
</body>
</html>`;
  };

  const buildRosterHtml = (type, orderNo, orderDate, reportingTime) => {
    const isPolling = type === 'polling';
    const title = isPolling ? 'POLLING DUTY ROSTER' : 'COUNTING DUTY ROSTER';
    const subTitle = isPolling ? 'COLLEGE UNION ELECTION – POLLING DUTY' : 'COLLEGE UNION ELECTION – COUNTING DUTY';
    const teams = isPolling ? pollingTeams : countingTeams;

    return `
      <div class="roster-page">
        <!-- Header -->
        <div class="header-container">
          ${collegeLogo ? `<img src="${collegeLogo}" class="header-logo" alt="College Logo">` : ''}
          <h2 class="college-title">${esc(collegeName)}</h2>
          <h3 class="order-title">${esc(title)}</h3>
          <p class="order-sub">${esc(subTitle)} · ${esc(electionYear)}</p>
        </div>

        <!-- Meta Bar -->
        <div class="meta-bar">
          <span>Order No: ${esc(orderNo)}</span>
          <span>Ref: Election Notification No. ${esc(collegeShortName)}/ELEC/${esc(electionYear)}/01</span>
          <span>Date: ${esc(orderDate)}</span>
        </div>

        <!-- Preamble -->
        <p class="preamble-text">
          For the smooth and orderly conduct of the <strong>College Union Election ${esc(electionYear)}</strong>, 
          the following teaching faculty and non-teaching staff members are assigned <strong>${isPolling ? 'Polling Duty' : 'Counting Duty'}</strong> 
          at the designated venues specified below. All officials are kindly requested to report for duty at 
          <strong>${esc(reportingTime)}</strong> on ${isPolling ? 'Polling Day' : 'Counting Day'}. Your kind cooperation is earnestly requested.
        </p>

        <!-- Table -->
        <table class="roster-table">
          <colgroup>
            <col style="width: 5.5%;">
            <col style="width: 14%;">
            <col style="width: 25.5%;">
            <col style="width: 34%;">
            <col style="width: 14%;">
            <col style="width: 7%;">
          </colgroup>
          <thead>
            <tr>
              <th class="col-center">${isPolling ? 'Booth #' : 'Table #'}</th>
              <th>${isPolling ? 'Polling Station / Venue' : 'Counting Table / Venue'}</th>
              <th>${isPolling ? 'Presiding Officer (Seniormost)' : 'Counting Supervisor (Seniormost)'}</th>
              <th>${isPolling ? 'Polling Officers' : 'Counting Officers'}</th>
              <th>${isPolling ? 'Polling Assistant (Non-Teaching)' : 'Counting Assistant (Non-Teaching)'}</th>
              <th class="col-center">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${booths.map((b) => {
              const t = teams.find(team => (isPolling ? team.boothNumber : team.tableNumber) === b.boothNumber) || {
                boothNumber: b.boothNumber,
                tableNumber: b.boothNumber,
                roomName: b.roomName || (isPolling ? `Booth ${b.boothNumber}` : `Table ${b.boothNumber}`),
                presidingOfficer: null,
                pollingOfficer1: null,
                pollingOfficer2: null,
                pollingAssistant: null,
                supervisor: null,
                countingOfficer1: null,
                countingOfficer2: null,
                countingAssistant: null
              };

              const head = isPolling ? t.presidingOfficer : t.supervisor;
              const o1 = isPolling ? t.pollingOfficer1 : t.countingOfficer1;
              const o2 = isPolling ? t.pollingOfficer2 : t.countingOfficer2;
              const o3 = isPolling ? t.pollingOfficer3 : t.countingOfficer3;
              const asst = isPolling ? t.pollingAssistant : t.countingAssistant;

              const isHeadValid = head && head.name && !getPerson(head.name)?.isExcluded;
              const isO1Valid = o1 && o1.name && !getPerson(o1.name)?.isExcluded;
              const isO2Valid = o2 && o2.name && !getPerson(o2.name)?.isExcluded;
              const isO3Valid = o3 && o3.name && !getPerson(o3.name)?.isExcluded;
              const isAsstValid = asst && asst.name && !getPerson(asst.name)?.isExcluded;

              return `
                <tr>
                  <td class="col-center" style="font-weight: 700; font-family: monospace; font-size: 11px;">
                    ${isPolling ? t.boothNumber : t.tableNumber}
                  </td>
                  <td style="font-weight: 600;">
                    ${esc(t.roomName || (isPolling ? `Booth ${t.boothNumber}` : `Table ${t.tableNumber}`))}
                  </td>
                  <td>
                    ${isHeadValid ? `
                      <span class="staff-name">${esc(head.name)}</span>
                      <span class="staff-meta">${esc(head.designation || (isPolling ? 'Professor' : 'Supervisor'))}${head.pen ? ` · PEN: ${esc(head.pen)}` : ''}</span>
                    ` : '<span class="unassigned">– Not Assigned –</span>'}
                  </td>
                  <td>
                    <div style="margin-bottom: 5px;">
                      ${isO1Valid ? `
                        <span class="staff-name">1. ${esc(o1.name)}</span>
                        <span class="staff-meta" style="margin-left: 14px;">${esc(o1.designation || 'Faculty')}${o1.pen ? ` · PEN: ${esc(o1.pen)}` : ''}</span>
                      ` : '<span class="unassigned">1. – Not Assigned –</span>'}
                    </div>
                    <div style="border-top: 1px dashed #cbd5e1; padding-top: 4px;">
                      ${isO2Valid ? `
                        <span class="staff-name">2. ${esc(o2.name)}</span>
                        <span class="staff-meta" style="margin-left: 14px;">${esc(o2.designation || 'Faculty')}${o2.pen ? ` · PEN: ${esc(o2.pen)}` : ''}</span>
                      ` : '<span class="unassigned">2. – Not Assigned –</span>'}
                    </div>
                    ${isO3Valid ? `
                      <div style="border-top: 1px dashed #cbd5e1; padding-top: 4px; margin-top: 4px;">
                        <span class="staff-name">3. ${esc(o3.name)} <span style="font-size: 8.5px; color: #4338ca; font-weight: bold; background: #e0e7ff; padding: 1px 4px; border-radius: 3px;">Optional / Addl</span></span>
                        <span class="staff-meta" style="margin-left: 14px;">${esc(o3.designation || 'Faculty')}${o3.pen ? ` · PEN: ${esc(o3.pen)}` : ''}</span>
                      </div>
                    ` : ''}
                  </td>
                  <td>
                    ${isAsstValid ? `
                      <span class="staff-name">${esc(asst.name)}</span>
                      <span class="staff-meta">${esc(asst.designation || 'Staff')}${asst.pen ? ` · PEN: ${esc(asst.pen)}` : ''}</span>
                    ` : '<span class="unassigned">– Not Assigned –</span>'}
                  </td>
                  <td></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Instructions Panel -->
        <div class="instructions-panel">
          <strong>GENERAL GUIDELINES &amp; INSTRUCTIONS:</strong>
          <ol>
            <li><strong>Reporting &amp; Material Collection:</strong> Appointed officials are kindly requested to report at the Central Distribution Counter at <strong>${esc(reportingTime)}</strong> to collect ballot boxes/materials, voter registers, and envelopes.</li>
            <li><strong>Timing:</strong> ${isPolling ? 'Polling commences at 09:30 AM and closes at 01:30 PM. All electors standing in queue at 01:30 PM will be issued tokens.' : 'Counting commences at 02:00 PM and will proceed continuously until the declaration of results.'}</li>
            <li><strong>Support &amp; Relief:</strong> Appointed officials are requested to extend their kind cooperation. In case of any unavoidable difficulty, please inform the Returning Officer promptly so that relief arrangements can be made from the Reserve Pool.</li>
            <li><strong>Handover:</strong> Immediately upon completion of duties, please hand over all sealed packets and materials to the Returning Officer under receipt.</li>
          </ol>
        </div>

        <!-- Footer Signatures -->
        <div class="footer-row">
          <div class="copy-block">
            <strong>Copy forwarded for information &amp; compliance to:</strong><br>
            1. All Appointed Officials (Teaching Faculty &amp; Non-Teaching Staff)<br>
            2. The Principal, ${esc(collegeName)} (for official records)<br>
            3. College Election Observer &amp; Notice Board<br>
            4. Guard File / Record File
          </div>
          <div class="ro-sign-block">
            <div class="ro-sign-line"></div>
            <strong>RETURNING OFFICER</strong><br>
            <span style="font-size: 9px;">College Union Election ${esc(electionYear)}</span><br>
            <span style="font-size: 8.5px; color: #4b5563;">${esc(collegeName)}</span>
          </div>
        </div>
      </div>
    `;
  };

  const buildIndividualOrdersHtml = (type, orderNo, orderDate, reportingTime) => {
    const isPolling = type === 'polling';
    const teams = isPolling ? pollingTeams : countingTeams;
    const personnel = [];

    const headRole = isPolling ? 'Presiding Officer' : 'Counting Supervisor';
    const officerRole = isPolling ? 'Polling Officer' : 'Counting Officer';
    const asstRole = isPolling ? 'Polling Assistant' : 'Counting Assistant';

    booths.forEach((b) => {
      const t = teams.find(team => (isPolling ? team.boothNumber : team.tableNumber) === b.boothNumber) || {};
      const num = isPolling ? b.boothNumber : b.boothNumber;
      const venue = t.roomName || b.roomName || (isPolling ? `Booth ${num}` : `Table ${num}`);

      const head = isPolling ? t.presidingOfficer : t.supervisor;
      if (head && head.name && !getPerson(head.name)?.isExcluded) {
        personnel.push({
          name: head.name,
          designation: head.designation || (isPolling ? 'Professor' : 'Supervisor'),
          pen: head.pen || '',
          role: headRole,
          boothNumber: num,
          venue: venue
        });
      }

      const o1 = isPolling ? t.pollingOfficer1 : t.countingOfficer1;
      if (o1 && o1.name && !getPerson(o1.name)?.isExcluded) {
        personnel.push({
          name: o1.name,
          designation: o1.designation || 'Faculty',
          pen: o1.pen || '',
          role: officerRole,
          boothNumber: num,
          venue: venue
        });
      }

      const o2 = isPolling ? t.pollingOfficer2 : t.countingOfficer2;
      if (o2 && o2.name && !getPerson(o2.name)?.isExcluded) {
        personnel.push({
          name: o2.name,
          designation: o2.designation || 'Faculty',
          pen: o2.pen || '',
          role: officerRole,
          boothNumber: num,
          venue: venue
        });
      }

      const o3 = isPolling ? t.pollingOfficer3 : t.countingOfficer3;
      if (o3 && o3.name && !getPerson(o3.name)?.isExcluded) {
        personnel.push({
          name: o3.name,
          designation: o3.designation || 'Faculty',
          pen: o3.pen || '',
          role: isPolling ? 'Polling Officer (Additional)' : 'Counting Officer (Additional)',
          boothNumber: num,
          venue: venue
        });
      }

      const asst = isPolling ? t.pollingAssistant : t.countingAssistant;
      if (asst && asst.name && !getPerson(asst.name)?.isExcluded) {
        personnel.push({
          name: asst.name,
          designation: asst.designation || 'Non-Teaching Staff',
          pen: asst.pen || '',
          role: asstRole,
          boothNumber: num,
          venue: venue
        });
      }
    });

    // In counting mode, consolidate assistants assigned to multiple tables into one slip
    if (!isPolling) {
      const consolidated = [];
      const asstMap = new Map();

      personnel.forEach(p => {
        if (p.role === 'Counting Assistant') {
          if (!asstMap.has(p.name)) {
            const entry = { ...p, tables: [p.boothNumber], venues: [p.venue] };
            asstMap.set(p.name, entry);
            consolidated.push(entry);
          } else {
            const entry = asstMap.get(p.name);
            entry.tables.push(p.boothNumber);
            entry.venues.push(p.venue);
          }
        } else {
          consolidated.push(p);
        }
      });

      asstMap.forEach(entry => {
        if (entry.tables.length > 1) {
          entry.tables.sort((a, b) => a - b);
          entry.boothNumber = `Tables ${entry.tables.join(', ')}`;
          entry.venue = [...new Set(entry.venues)].join(' / ');
        }
      });

      personnel.length = 0;
      personnel.push(...consolidated);
    }

    if (personnel.length === 0) {
      return `
        <div style="padding: 40px; text-align: center; color: #64748b;">
          <p style="font-size: 14px; font-weight: bold;">No officials assigned yet.</p>
          <p style="font-size: 12px; margin-top: 4px;">Please allot personnel to booths before printing individual appointment orders.</p>
        </div>
      `;
    }

    return personnel.map((p, idx) => {
      const isSecondOnPage = (idx % 2 === 1);
      const isLast = (idx === personnel.length - 1);
      const apptOrderNo = `${orderNo}/APPT-${String(idx + 1).padStart(2, '0')}`;
      const stationText = isPolling 
        ? `Polling Booth ${p.boothNumber}` 
        : (String(p.boothNumber).startsWith('Tables') ? `Counting ${p.boothNumber}` : `Counting Table ${p.boothNumber}`);

      return `
        <div class="slip-container ${isSecondOnPage && !isLast ? 'slip-page-break' : ''}">
          <!-- Slip Header -->
          <div class="slip-header">
            ${collegeLogo ? `<img src="${collegeLogo}" class="header-logo" alt="College Logo">` : ''}
            <div class="slip-college">${esc(collegeName)}</div>
            <div class="slip-office">OFFICE OF THE RETURNING OFFICER · COLLEGE UNION ELECTION ${esc(electionYear)}</div>
            <div class="slip-title">DUTY APPOINTMENT: ${esc(p.role.toUpperCase())}</div>
          </div>

          <!-- Slip Meta Bar -->
          <div class="slip-meta-bar">
            <span>Order No: <strong>${esc(apptOrderNo)}</strong></span>
            <span>Date: <strong>${esc(orderDate)}</strong></span>
          </div>

          <!-- To Recipient -->
          <div class="slip-to-block">
            <strong>To:</strong> ${esc(p.name)}, ${esc(p.designation)} ${p.pen ? `(PEN: ${esc(p.pen)})` : ''}
          </div>

          <!-- Body -->
          <div class="slip-body">
            <p>
              For the smooth and orderly conduct of the <strong>College Union Election ${esc(electionYear)}</strong>, 
              you are assigned duty as <strong>${esc(p.role)}</strong> for <strong>${stationText} (${esc(p.venue)})</strong>.
            </p>
            <p>
              You are kindly requested to report for election duty at <strong>${esc(reportingTime)}</strong> on 
              <strong>${isPolling ? 'Polling Day' : 'Counting Day'}</strong> at <strong>${esc(p.venue)} / Central Election Office</strong>.
            </p>
            <div class="slip-note" style="border-left-color: #64748b; font-style: normal; color: #475569;">
              <strong>Note:</strong> In case of unavoidable exigencies, please inform the Returning Officer in advance so that suitable relief arrangements can be made from the Reserve Pool. Your kind cooperation is earnestly solicited.
            </div>
          </div>

          <!-- Signatures -->
          <div class="slip-sign-row">
            <div style="font-size: 8.5px; color: #475569;">
              Copy to: 1. Official Concerned &nbsp; 2. Principal's Office &nbsp; 3. Guard File
            </div>
            <div style="text-align: center; width: 170px;">
              <div style="border-bottom: 1px solid #000; height: 30px; margin-bottom: 2px;"></div>
              <strong style="font-size: 10px;">RETURNING OFFICER</strong><br>
              <span style="font-size: 8px;">${esc(collegeName)}</span>
            </div>
          </div>

          <!-- Detachable Acknowledgement Slip -->
          <div class="slip-ack-section">
            <div class="slip-ack-cut">✂ - - - - - - - - - - - - - - - - - - - TEAR OFF &amp; RETURN TO RETURNING OFFICER - - - - - - - - - - - - - - - - - - -</div>
            <div style="display: flex; justify-content: space-between; font-size: 9px; margin-top: 4px;">
              <span><strong>ACKNOWLEDGEMENT:</strong> Received Order No. ${esc(apptOrderNo)} for duty as <strong>${esc(p.role)}</strong> at ${stationText}.</span>
            </div>
            <div class="slip-ack-sign-line">
              <span>Signature of Official: __________________________</span>
              <span>Date: ____________</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  renderUI();
}
