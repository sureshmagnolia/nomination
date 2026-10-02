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

  // 1. Initialize State with defaults or persisted data
  let faculty = [];
  const cachedFac = localStorage.getItem('gcc_faculty_roster');
  if (cachedFac !== null) {
    try { faculty = JSON.parse(cachedFac); } catch (_) { faculty = []; }
  } else if (initialOfficialsData && Array.isArray(initialOfficialsData.faculty)) {
    faculty = initialOfficialsData.faculty;
  } else {
    faculty = [...DEFAULT_FACULTY_ROSTER];
    localStorage.setItem('gcc_faculty_roster', JSON.stringify(faculty));
  }

  let nonTeaching = [];
  const cachedNT = localStorage.getItem('gcc_non_teaching_roster');
  if (cachedNT !== null) {
    try { nonTeaching = JSON.parse(cachedNT); } catch (_) { nonTeaching = []; }
  } else if (initialOfficialsData && Array.isArray(initialOfficialsData.nonTeaching)) {
    nonTeaching = initialOfficialsData.nonTeaching;
  } else {
    nonTeaching = [...DEFAULT_NON_TEACHING_ROSTER];
    localStorage.setItem('gcc_non_teaching_roster', JSON.stringify(nonTeaching));
  }

  // One-time upgrade migration (v2) for existing 92-teacher setups
  // If the user has explicitly cleared the rosters or already completed migration, we do NOT overwrite their data.
  const isMigratedV2 = localStorage.getItem('gcc_roster_migrated_v2');
  if (!isMigratedV2) {
    // Only upgrade if faculty has records and is the old 92-member roster
    if (faculty.length > 0 && faculty.length <= 92) {
      const existingMap = new Map(faculty.map(f => [f.name.toLowerCase().trim(), f]));
      faculty = DEFAULT_FACULTY_ROSTER.map(f => {
        const existing = existingMap.get(f.name.toLowerCase().trim());
        if (existing) {
          return {
            ...f,
            isExcluded: existing.isExcluded ?? false,
            exclusionReason: existing.exclusionReason || ''
          };
        }
        return { ...f };
      });
      localStorage.setItem('gcc_faculty_roster', JSON.stringify(faculty));
    }

    if (nonTeaching.length > 0) {
      const isOldDummyNT = nonTeaching.some(nt => nt.name === 'Sri. K. Ramesh' || nt.name === 'Smt. P. Vasantha');
      const hasLibrarianInNT = nonTeaching.some(nt => (nt.designation || '').toLowerCase().includes('librarian'));
      if (isOldDummyNT || hasLibrarianInNT) {
        nonTeaching = [...DEFAULT_NON_TEACHING_ROSTER];
        localStorage.setItem('gcc_non_teaching_roster', JSON.stringify(nonTeaching));
      }
    }

    localStorage.setItem('gcc_roster_migrated_v2', 'true');
  }

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

  let pollingTeams = Array.isArray(initialOfficialsData?.pollingTeams) ? initialOfficialsData.pollingTeams : [];
  let countingTeams = Array.isArray(initialOfficialsData?.countingTeams) ? initialOfficialsData.countingTeams : [];

  // Active UI state
  let activeTab = 'polling'; // 'polling' | 'counting' | 'faculty' | 'nonteaching'
  let facultySearch = '';
  let facultyFilter = 'all'; // 'all' | 'active' | 'excluded'
  let nonTeachingSearch = '';
  let nonTeachingFilter = 'all'; // 'all' | 'active' | 'excluded'

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
      if (team.pollingOfficer1?.name === fName) return { role: 'Polling Officer', boothNumber: team.boothNumber };
      if (team.pollingOfficer2?.name === fName) return { role: 'Polling Officer', boothNumber: team.boothNumber };
    }
    return null;
  };

  // Helper: Check if faculty is on counting duty
  const getCountingAssignment = (fName) => {
    if (!fName) return null;
    for (const team of countingTeams) {
      if (team.supervisor?.name === fName) return { role: 'Counting Supervisor', tableNumber: team.tableNumber };
      if (team.countingOfficer1?.name === fName) return { role: 'Counting Officer', tableNumber: team.tableNumber };
      if (team.countingOfficer2?.name === fName) return { role: 'Counting Officer', tableNumber: team.tableNumber };
    }
    return null;
  };

  // Helper: Check if non-teaching staff is assigned
  const getNonTeachingAssignment = (ntName) => {
    if (!ntName) return { polling: null, counting: null };
    const p = pollingTeams.find(t => t.pollingAssistant?.name === ntName);
    const c = countingTeams.find(t => t.countingAssistant?.name === ntName);
    return {
      polling: p ? { boothNumber: p.boothNumber } : null,
      counting: c ? { tableNumber: c.tableNumber } : null
    };
  };

  // Helper: Generate HTML for a single faculty table row
  const getFacultyRowHtml = (f) => {
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
          ${esc(f.designation || '–')}${f.department ? `<span class="text-[10px] text-indigo-300/80 block font-normal">${esc(f.department)}</span>` : ''}
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
          ${asstDuty.polling ? `<span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">Booth ${asstDuty.polling.boothNumber}</span>` : '<span class="text-slate-500">–</span>'}
        </td>
        <td>
          ${asstDuty.counting ? `<span class="badge bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold">Table ${asstDuty.counting.tableNumber}</span>` : '<span class="text-slate-500">–</span>'}
        </td>
        <td>
          ${nt.isExcluded ? `
            <span class="badge bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold" title="${esc(nt.exclusionReason || 'Excluded')}">
              ⛔ Excluded${nt.exclusionReason ? `: ${esc(nt.exclusionReason)}` : ''}
            </span>
          ` : `
            <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
              ✓ Available
            </span>
          `}
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

  // Reusable file import handler for Faculty (Regular Excel, CSV, or Guest Faculty)
  const handleFacultyFile = (file) => {
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

        const isGuestFile = file.name.toLowerCase().includes('guest') || jsonRows.some(row => (row || []).some(cell => String(cell).toLowerCase().includes('guest')));

        if (isGuestFile) {
          let nameCol = 1, deptCol = 2;
          let startR = 1;
          for (let r = 0; r < Math.min(6, jsonRows.length); r++) {
            const row = (jsonRows[r] || []).map(c => String(c).toLowerCase());
            row.forEach((c, i) => {
              if (c.includes('name') || c.includes('lecturer')) { nameCol = i; startR = r + 1; }
              if (c.includes('dept') || c.includes('department')) deptCol = i;
            });
          }

          const parsedGuests = [];
          for (let r = startR; r < jsonRows.length; r++) {
            const row = jsonRows[r];
            if (!row || row.length === 0) continue;
            const name = row[nameCol] !== undefined ? String(row[nameCol]).trim() : '';
            if (!name || name.toLowerCase().includes('guest') || name.toLowerCase().includes('name') || name.toLowerCase().includes('lecturer')) continue;
            const dept = row[deptCol] !== undefined ? String(row[deptCol]).trim() : '';

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

        // Regular Faculty List Parsing
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
            department: '',
            joiningDate: dt,
            isExcluded: false,
            exclusionReason: ''
          });
        }

        if (parsedFaculty.length === 0) {
          showToast('No faculty rows could be parsed. Check column layout.', 'error');
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
        const workbook = XLSX.read(data, { type: 'array' });
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
          const row = (jsonRows[r] || []).map(c => String(c).toLowerCase());
          const hasName = row.some((c, i) => {
            if (c.includes('name') || c.includes('staff') || c.includes('employee')) {
              nameCol = i;
              return true;
            }
            return false;
          });
          row.forEach((c, i) => {
            if (c.includes('desig') || c.includes('post') || c.includes('cadre') || c.includes('role')) desigCol = i;
            if (c.includes('pen') || c.includes('id') || c.includes('code')) penCol = i;
            if (c.includes('dept') || c.includes('department')) deptCol = i;
          });
          if (hasName) {
            headerIdx = r;
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
          const dept = row[deptCol] !== undefined ? String(row[deptCol]).trim() : '';

          // Check if UGC Librarian, Librarian Gr.IV, or any Librarian
          if (desig.toLowerCase().includes('librarian')) {
            detectedLibrarians.push({
              name: name,
              designation: desig,
              pen: pen,
              department: dept || 'Library'
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
                The roster has been cleared. You can upload your new Faculty Excel / CSV file, or restore the official 103 faculty roster.
              </p>
              <div class="flex items-center justify-center gap-2 pt-2">
                <label class="btn btn-primary bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 cursor-pointer flex items-center gap-1.5 shadow">
                  📥 Import Faculty (Excel / CSV)
                  <input type="file" id="fileFacultyImportEmpty" accept=".xlsx,.xls,.csv" class="hidden" />
                </label>
                <button id="btnResetFacultyRosterEmpty" class="btn btn-secondary text-xs text-amber-300 hover:bg-amber-500/20 px-3 py-2">
                  🔄 Restore Official Roster (103)
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
      tbody.querySelector('#fileFacultyImportEmpty')?.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFacultyFile(e.target.files[0]);
      });
      tbody.querySelector('#btnResetFacultyRosterEmpty')?.addEventListener('click', () => {
        faculty = [...DEFAULT_FACULTY_ROSTER];
        saveAll(false);
        renderUI();
      });
      return;
    }
    const filtered = faculty.filter(f => {
      if (facultyFilter === 'active' && f.isExcluded) return false;
      if (facultyFilter === 'excluded' && !f.isExcluded) return false;
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
                The non-teaching roster has been cleared. You can upload your new staff list as Excel / CSV, or restore the official 16 staff roster.
              </p>
              <div class="flex items-center justify-center gap-2 pt-2">
                <label class="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 cursor-pointer flex items-center gap-1.5 shadow">
                  📥 Upload Non-Teaching (Excel / CSV)
                  <input type="file" id="fileNonTeachingImportEmpty" accept=".xlsx,.xls,.csv" class="hidden" />
                </label>
                <button id="btnResetNTRosterEmpty" class="btn btn-secondary text-xs text-emerald-300 hover:bg-emerald-500/20 px-3 py-2">
                  🔄 Restore Official NTS List (16)
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
      tbody.querySelector('#fileNonTeachingImportEmpty')?.addEventListener('change', (e) => {
        if (e.target.files[0]) handleNonTeachingFile(e.target.files[0]);
      });
      tbody.querySelector('#btnResetNTRosterEmpty')?.addEventListener('click', () => {
        nonTeaching = [...DEFAULT_NON_TEACHING_ROSTER];
        saveAll(false);
        renderUI();
      });
      return;
    }
    const filtered = nonTeaching.filter(nt => {
      if (nonTeachingFilter === 'active' && nt.isExcluded) return false;
      if (nonTeachingFilter === 'excluded' && !nt.isExcluded) return false;
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

    tbody.innerHTML = filtered.map(getNonTeachingRowHtml).join('');
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
    if (availableNT.length === 0) {
      showToast('Notice: No active Non-Teaching Staff available. Please upload the Non-Teaching Staff list in the "Non-Teaching Staff" tab.', 'info');
    }

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
      const assistant = availableNT.length > 0 ? (availableNT[i % availableNT.length] || null) : null;

      // Verify hierarchy: Presiding Officer must be strictly seniormost
      const teamFaculty = [pOfficer, po1, po2].filter(Boolean);
      teamFaculty.sort((a, b) => a.seniority - b.seniority);

      newTeams.push({
        boothNumber: b.boothNumber,
        roomName: b.roomName || `Booth ${b.boothNumber}`,
        presidingOfficer: teamFaculty[0] || null,
        pollingOfficer1: teamFaculty[1] || null,
        pollingOfficer2: teamFaculty[2] || null,
        pollingAssistant: assistant ? { name: assistant.name, designation: assistant.designation, pen: assistant.pen || '' } : null
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
      countingPool = freshFaculty;
    } else {
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
      // Pair with non-teaching staff, shifting offset to use fresh staff if available
      const assistant = availableNT.length > 0 ? (availableNT[(i + numTables) % availableNT.length] || null) : null;

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
        countingAssistant: assistant ? { name: assistant.name, designation: assistant.designation, pen: assistant.pen || '' } : null
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
    // Preserve active search field focus and selection before replacing main.innerHTML
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

    const totalNT = nonTeaching.length;
    const activeNT = nonTeaching.filter(n => !n.isExcluded).length;

    let pollingSlotsFilled = 0;
    let pollingAsstFilled = 0;
    pollingTeams.forEach(t => {
      if (t.presidingOfficer) pollingSlotsFilled++;
      if (t.pollingOfficer1) pollingSlotsFilled++;
      if (t.pollingOfficer2) pollingSlotsFilled++;
      if (t.pollingAssistant) pollingAsstFilled++;
    });

    let countingSlotsFilled = 0;
    let countingAsstFilled = 0;
    let doubleDutyCount = 0;
    const assignedPollingNames = new Set(
      pollingTeams.flatMap(t => [t.presidingOfficer?.name, t.pollingOfficer1?.name, t.pollingOfficer2?.name]).filter(Boolean)
    );

    countingTeams.forEach(t => {
      [t.supervisor, t.countingOfficer1, t.countingOfficer2].filter(Boolean).forEach(f => {
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
                <p class="text-slate-400 text-xs">Allot Presiding Officers, Polling Officers, Counting Supervisors, and Non-Teaching Polling Assistants.</p>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
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
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 no-print">
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
            <span class="text-[10px] text-emerald-400 mt-1">For Polling & Counting Assistants</span>
          </div>

          <div class="glass p-3 rounded-xl border border-indigo-500/30 flex flex-col justify-between bg-indigo-950/20">
            <span class="text-[11px] uppercase tracking-wider text-indigo-300 font-semibold">Polling Teams</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold text-indigo-200 font-mono">${pollingSlotsFilled}</span>
              <span class="text-xs text-slate-400">/ ${booths.length * 3} Faculty</span>
            </div>
            <span class="text-[10px] text-indigo-400 mt-1">${pollingAsstFilled} / ${booths.length} Assistants</span>
          </div>

          <div class="glass p-3 rounded-xl border border-purple-500/30 flex flex-col justify-between bg-purple-950/20">
            <span class="text-[11px] uppercase tracking-wider text-purple-300 font-semibold">Counting Teams</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold text-purple-200 font-mono">${countingSlotsFilled}</span>
              <span class="text-xs text-slate-400">/ ${booths.length * 3} Faculty</span>
            </div>
            <span class="text-[10px] text-purple-400 mt-1">${countingAsstFilled} / ${booths.length} Assistants</span>
          </div>

          <div class="glass p-3 rounded-xl border ${doubleDutyCount > 0 ? 'border-amber-500/50 bg-amber-950/30' : 'border-emerald-500/30 bg-emerald-950/20'} flex flex-col justify-between">
            <span class="text-[11px] uppercase tracking-wider ${doubleDutyCount > 0 ? 'text-amber-300' : 'text-emerald-300'} font-semibold">Double Duty Alert</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-bold ${doubleDutyCount > 0 ? 'text-amber-200' : 'text-emerald-200'} font-mono">${doubleDutyCount}</span>
              <span class="text-xs text-slate-400">Staff Assigned</span>
            </div>
            <span class="text-[10px] ${doubleDutyCount > 0 ? 'text-amber-400' : 'text-emerald-400'} mt-1">${doubleDutyCount > 0 ? 'Serving Polling & Counting' : 'Clean Separation (0 Overlap)'}</span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex border-b border-white/10 no-print gap-2 overflow-x-auto">
          <button class="nav-tab px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'polling' ? 'border-indigo-500 text-indigo-300 bg-white/5' : 'border-transparent text-slate-400 hover:text-white'}" data-tab="polling">
            🏫 Polling Booth Teams (${booths.length})
          </button>
          <button class="nav-tab px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'counting' ? 'border-purple-500 text-purple-300 bg-white/5' : 'border-transparent text-slate-400 hover:text-white'}" data-tab="counting">
            🧮 Counting Table Teams (${booths.length})
            ${doubleDutyCount > 0 ? `<span class="bg-amber-500 text-black text-[10px] px-1.5 py-0.2 rounded-full font-bold">${doubleDutyCount}</span>` : ''}
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
              <p class="text-xs text-slate-400">Each booth needs 1 Presiding Officer (Seniormost faculty), 2 Polling Officers (Faculty), and 1 Polling Assistant (Non-teaching staff).</p>
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
                    <div class="flex items-center justify-between pb-2.5 border-b border-white/10 gap-2">
                      <div>
                        <span class="font-mono text-indigo-400 font-bold text-sm">Booth ${b.boothNumber}</span>
                        <h5 class="font-bold text-white text-base">${esc(b.roomName || `Booth ${b.boothNumber}`)}</h5>
                      </div>
                      <div class="flex items-center gap-1.5 flex-wrap justify-end">
                        <span class="text-[11px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1 shadow-sm font-semibold" title="Total Voters Assigned to Booth ${b.boothNumber}">
                          <span>🗳️</span> <span>${getBoothVoterCount(b)} voters</span>
                        </span>
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
                      <div class="pt-1 border-t border-white/10">
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                            <span>🤝</span> Polling Assistant <span class="text-[10px] text-slate-400 font-normal">(Non-Teaching)</span>
                          </label>
                          <a href="javascript:void(0)" class="text-[10px] text-emerald-400 hover:underline btn-goto-nonteaching">Manage List</a>
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-emerald-400 focus:outline-none select-polling-assistant" data-booth="${b.boothNumber}">
                          <option value="">-- Select Non-Teaching Staff --</option>
                          ${nonTeaching.map(nt => `
                            <option value="${esc(nt.name)}" ${team.pollingAssistant?.name === nt.name ? 'selected' : ''}>
                              ${nt.isExcluded ? '⛔ ' : ''}${esc(nt.name)} (${esc(nt.designation)}${nt.pen ? ` · PEN:${nt.pen}` : ''})
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
              <p class="text-xs text-slate-400">Each table needs 1 Counting Supervisor (Seniormost at table), 2 Counting Officers, and 1 Counting Assistant. Staff serving polling duty are flagged with double duty.</p>
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

              const supDouble = team.supervisor ? getPollingAssignment(team.supervisor.name) : null;
              const co1Double = team.countingOfficer1 ? getPollingAssignment(team.countingOfficer1.name) : null;
              const co2Double = team.countingOfficer2 ? getPollingAssignment(team.countingOfficer2.name) : null;
              const asstDouble = team.countingAssistant ? getNonTeachingAssignment(team.countingAssistant.name).polling : null;
              const hasDoubleDuty = !!(supDouble || co1Double || co2Double || asstDouble);

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
                      <div class="pt-1 border-t border-white/10">
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                            <span>🤝</span> Counting Assistant <span class="text-[10px] text-slate-400 font-normal">(Non-Teaching)</span>
                          </label>
                          <a href="javascript:void(0)" class="text-[10px] text-emerald-400 hover:underline btn-goto-nonteaching">Manage List</a>
                        </div>
                        <select class="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-xs text-white focus:border-purple-400 focus:outline-none select-counting-assistant" data-table="${b.boothNumber}">
                          <option value="">-- Select Non-Teaching Staff --</option>
                          ${nonTeaching.map(nt => {
                            const ntAssigned = getNonTeachingAssignment(nt.name);
                            return `
                              <option value="${esc(nt.name)}" ${team.countingAssistant?.name === nt.name ? 'selected' : ''}>
                                ${nt.isExcluded ? '⛔ ' : ''}${esc(nt.name)} (${esc(nt.designation)}${nt.pen ? ` · PEN:${nt.pen}` : ''}) ${ntAssigned.polling ? `[⚠️ Booth ${ntAssigned.polling.boothNumber}]` : ''}
                              </option>
                            `;
                          }).join('')}
                        </select>
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
              <button id="btnResetFacultyRoster" class="btn btn-secondary text-xs text-amber-300 hover:bg-amber-500/20 px-3 py-2">
                🔄 Reset to Official Roster (103)
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
              <button class="filter-faculty-btn px-3 py-1 rounded-lg font-semibold transition-colors ${facultyFilter === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}" data-filter="active">Active (${activeFaculty})</button>
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
                                The roster has been cleared. You can upload your new Faculty Excel / CSV file, or restore the official 103 faculty roster.
                              </p>
                              <div class="flex items-center justify-center gap-2 pt-2">
                                <label class="btn btn-primary bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 cursor-pointer flex items-center gap-1.5 shadow">
                                  📥 Import Faculty (Excel / CSV)
                                  <input type="file" id="fileFacultyImportEmpty" accept=".xlsx,.xls,.csv" class="hidden" />
                                </label>
                                <button id="btnResetFacultyRosterEmpty" class="btn btn-secondary text-xs text-amber-300 hover:bg-amber-500/20 px-3 py-2">
                                  🔄 Restore Official Roster (103)
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      `;
                    }
                    const filtered = faculty.filter(f => {
                      if (facultyFilter === 'active' && f.isExcluded) return false;
                      if (facultyFilter === 'excluded' && !f.isExcluded) return false;
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
              <button id="btnResetNTRoster" class="btn btn-secondary text-xs text-emerald-300 hover:bg-emerald-500/20 px-3 py-2">
                🔄 Reset to Official NTS List (16)
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
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input type="text" id="newStaffName" placeholder="Full Name (e.g. Sri. K. Ramesh)" class="bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white" />
              <input type="text" id="newStaffDesig" placeholder="Designation (e.g. Senior Clerk, Office Attendant)" class="bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white" />
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
              <button class="filter-nt-btn px-3 py-1 rounded-lg font-semibold transition-colors ${nonTeachingFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}" data-filter="active">Active (${activeNT})</button>
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
                                The non-teaching roster has been cleared. You can upload your new staff list as Excel / CSV, or restore the official 16 staff roster.
                              </p>
                              <div class="flex items-center justify-center gap-2 pt-2">
                                <label class="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 cursor-pointer flex items-center gap-1.5 shadow">
                                  📥 Upload Non-Teaching (Excel / CSV)
                                  <input type="file" id="fileNonTeachingImportEmpty" accept=".xlsx,.xls,.csv" class="hidden" />
                                </label>
                                <button id="btnResetNTRosterEmpty" class="btn btn-secondary text-xs text-emerald-300 hover:bg-emerald-500/20 px-3 py-2">
                                  🔄 Restore Official NTS List (16)
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      `;
                    }
                    const filtered = nonTeaching.filter(nt => {
                      if (nonTeachingFilter === 'active' && nt.isExcluded) return false;
                      if (nonTeachingFilter === 'excluded' && !nt.isExcluded) return false;
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

    // Restore focus and cursor selection if user had an active search field
    if (searchFocusState) {
      const el = main.querySelector('#' + searchFocusState.id);
      if (el) {
        el.focus();
        try {
          el.setSelectionRange(searchFocusState.start, searchFocusState.end);
        } catch (_) {}
      }
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
      if (confirm('⚡ Auto-Allot Polling Teams?\n\nThis will assign the seniormost available faculty as Presiding Officers, followed by Polling Officers 1 & 2 for all booths based on the official Seniority List, and assign Non-Teaching Polling Assistants.\n\nProceed?')) {
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
        team.pollingAssistant = nt ? { name: nt.name, designation: nt.designation, pen: nt.pen || '' } : null;
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
        team.countingAssistant = nt ? { name: nt.name, designation: nt.designation, pen: nt.pen || '' } : null;
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
      const penInput = main.querySelector('#newStaffPen');

      const name = (nameInput?.value || '').trim();
      const desig = (desigInput?.value || '').trim() || 'Staff';
      const pen = (penInput?.value || '').trim();

      if (!name) {
        showToast('Please enter the staff member name.', 'error');
        return;
      }

      nonTeaching.push({
        id: 'nt_' + Date.now(),
        name,
        designation: desig,
        pen,
        isExcluded: false,
        exclusionReason: ''
      });

      nameInput.value = '';
      desigInput.value = '';
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
        localStorage.setItem('gcc_roster_migrated_v2', 'true');
        await saveAll(false);
        showToast('All rosters and team assignments cleared! Ready for new CSV uploads.', 'info');
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
        });
        countingTeams.forEach(t => {
          t.supervisor = null;
          t.countingOfficer1 = null;
          t.countingOfficer2 = null;
        });
        localStorage.setItem('gcc_roster_migrated_v2', 'true');
        await saveAll(false);
        showToast('Faculty roster cleared. You can now upload your new Faculty file.', 'info');
        renderUI();
      }
    });

    // Reset Faculty Roster
    main.querySelector('#btnResetFacultyRoster')?.addEventListener('click', () => {
      if (confirm('🔄 Reset Faculty Seniority List to official college roster (103 Faculty)?\n\nThis includes:\n• 92 Teaching Faculty (from SENIORITY LIST OF TEACHERS.xlsx)\n• 2 Librarians (UGC Librarian SATHEESH-K.M & Librarian Gr.IV REKHA R NAIR)\n• 9 Guest Lecturers (from Guest 26-27.xlsx)')) {
        faculty = [...DEFAULT_FACULTY_ROSTER];
        saveAll(false);
        showToast('Restored 103 faculty members (92 Teaching + 2 Librarians + 9 Guest Lecturers)!', 'success');
        renderUI();
      }
    });

    main.querySelector('#btnResetFacultyRosterEmpty')?.addEventListener('click', () => {
      faculty = [...DEFAULT_FACULTY_ROSTER];
      saveAll(false);
      showToast('Restored 103 faculty members (92 Teaching + 2 Librarians + 9 Guest Lecturers)!', 'success');
      renderUI();
    });

    // Reset Non-Teaching Roster
    main.querySelector('#btnResetNTRoster')?.addEventListener('click', () => {
      if (confirm('🔄 Reset Non-Teaching Staff List to official list (16 Staff from NTS DETAILS SEP 2026.xlsx)?\n\nThis restores the 16 Lab Assistants, Herbarium Keeper, Library Assistants, and Office Attendants (with Librarians properly in Faculty).')) {
        nonTeaching = [...DEFAULT_NON_TEACHING_ROSTER];
        saveAll(false);
        showToast('Restored 16 official Non-Teaching staff members!', 'success');
        renderUI();
      }
    });

    main.querySelector('#btnResetNTRosterEmpty')?.addEventListener('click', () => {
      nonTeaching = [...DEFAULT_NON_TEACHING_ROSTER];
      saveAll(false);
      showToast('Restored 16 official Non-Teaching staff members!', 'success');
      renderUI();
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

    // Export Non-Teaching (CSV)
    main.querySelector('#btnExportNonTeaching')?.addEventListener('click', () => {
      const rows = [
        ['Sl No', 'Staff Name', 'Designation', 'PEN', 'Status', 'Exclusion Reason', 'Polling Booth', 'Counting Table']
      ];
      nonTeaching.forEach((nt, idx) => {
        const asstDuty = getNonTeachingAssignment(nt.name);
        rows.push([
          idx + 1,
          nt.name,
          nt.designation || 'Staff',
          nt.pen || '',
          nt.isExcluded ? 'Excluded' : 'Available',
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
    .slip-statutory-note {
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
    const title = isPolling ? 'ORDER OF APPOINTMENT OF POLLING PERSONNEL' : 'ORDER OF APPOINTMENT OF COUNTING PERSONNEL';
    const subTitle = isPolling ? 'COLLEGE UNION ELECTION – CONSOLIDATED POLLING DUTY ROSTER' : 'COLLEGE UNION ELECTION – CONSOLIDATED COUNTING DUTY ROSTER';
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
          In exercise of powers vested with the Returning Officer under the College Union Election Rules and Constitution, 
          the following members of teaching faculty and non-teaching staff are hereby appointed for <strong>${isPolling ? 'Polling Duty' : 'Counting Duty'}</strong> 
          at the designated venues specified below for <strong>College Union Election ${esc(electionYear)}</strong>. All officials are strictly directed to report 
          for duty at <strong>${esc(reportingTime)}</strong> on ${isPolling ? 'Polling Day' : 'Counting Day'} without fail.
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
              const asst = isPolling ? t.pollingAssistant : t.countingAssistant;

              return `
                <tr>
                  <td class="col-center" style="font-weight: 700; font-family: monospace; font-size: 11px;">
                    ${isPolling ? t.boothNumber : t.tableNumber}
                  </td>
                  <td style="font-weight: 600;">
                    ${esc(t.roomName || (isPolling ? `Booth ${t.boothNumber}` : `Table ${t.tableNumber}`))}
                  </td>
                  <td>
                    ${head && head.name ? `
                      <span class="staff-name">${esc(head.name)}</span>
                      <span class="staff-meta">${esc(head.designation || (isPolling ? 'Professor' : 'Supervisor'))}${head.pen ? ` · PEN: ${esc(head.pen)}` : ''}</span>
                    ` : '<span class="unassigned">– Not Assigned –</span>'}
                  </td>
                  <td>
                    <div style="margin-bottom: 5px;">
                      ${o1 && o1.name ? `
                        <span class="staff-name">1. ${esc(o1.name)}</span>
                        <span class="staff-meta" style="margin-left: 14px;">${esc(o1.designation || 'Faculty')}${o1.pen ? ` · PEN: ${esc(o1.pen)}` : ''}</span>
                      ` : '<span class="unassigned">1. – Not Assigned –</span>'}
                    </div>
                    <div style="border-top: 1px dashed #cbd5e1; padding-top: 4px;">
                      ${o2 && o2.name ? `
                        <span class="staff-name">2. ${esc(o2.name)}</span>
                        <span class="staff-meta" style="margin-left: 14px;">${esc(o2.designation || 'Faculty')}${o2.pen ? ` · PEN: ${esc(o2.pen)}` : ''}</span>
                      ` : '<span class="unassigned">2. – Not Assigned –</span>'}
                    </div>
                  </td>
                  <td>
                    ${asst && asst.name ? `
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
          <strong>STATUTORY ELECTION DUTY INSTRUCTIONS:</strong>
          <ol>
            <li><strong>Reporting & Material Collection:</strong> Appointed officials shall report at the Central Distribution Counter at <strong>${esc(reportingTime)}</strong> to collect ballot boxes/materials, voter registers, and statutory envelopes.</li>
            <li><strong>Commencement & Conclusion:</strong> ${isPolling ? 'Polling commences strictly at 09:30 AM and closes at 01:30 PM. All electors standing in queue at 01:30 PM must be given tokens.' : 'Counting commences at 02:00 PM and shall proceed continuously till declaration of results.'}</li>
            <li><strong>Statutory Obligation:</strong> Election duty is mandatory. Absence without prior written sanction of the Returning Officer constitutes dereliction of statutory duty.</li>
            <li><strong>Handover:</strong> Immediately after completion, all sealed packets and ballot boxes must be delivered to the Returning Officer under proper receipt.</li>
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
      if (head && head.name) {
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
      if (o1 && o1.name) {
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
      if (o2 && o2.name) {
        personnel.push({
          name: o2.name,
          designation: o2.designation || 'Faculty',
          pen: o2.pen || '',
          role: officerRole,
          boothNumber: num,
          venue: venue
        });
      }

      const asst = isPolling ? t.pollingAssistant : t.countingAssistant;
      if (asst && asst.name) {
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

      return `
        <div class="slip-container ${isSecondOnPage && !isLast ? 'slip-page-break' : ''}">
          <!-- Slip Header -->
          <div class="slip-header">
            ${collegeLogo ? `<img src="${collegeLogo}" class="header-logo" alt="College Logo">` : ''}
            <div class="slip-college">${esc(collegeName)}</div>
            <div class="slip-office">OFFICE OF THE RETURNING OFFICER · COLLEGE UNION ELECTION ${esc(electionYear)}</div>
            <div class="slip-title">ORDER OF APPOINTMENT AS ${esc(p.role.toUpperCase())}</div>
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
              In exercise of powers vested with the Returning Officer under the College Union Election Rules and Constitution, 
              you are hereby appointed as <strong>${esc(p.role)}</strong> for <strong>${isPolling ? 'Polling Booth' : 'Counting Table'} ${p.boothNumber} (${esc(p.venue)})</strong> 
              for the conduct of <strong>College Union Election ${esc(electionYear)}</strong>.
            </p>
            <p>
              You are strictly directed to report for election duty at <strong>${esc(reportingTime)}</strong> on 
              <strong>${isPolling ? 'Polling Day' : 'Counting Day'}</strong> at the <strong>${esc(p.venue)} / Central Election Office</strong> without fail.
            </p>
            <div class="slip-statutory-note">
              <strong>Statutory Warning:</strong> Election duty is a mandatory public responsibility. Absence or delay without prior written 
              permission of the Returning Officer will be treated as dereliction of duty and reported for statutory disciplinary action.
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
              <span><strong>ACKNOWLEDGEMENT:</strong> Received Order No. ${esc(apptOrderNo)} for duty as <strong>${esc(p.role)}</strong> at ${isPolling ? 'Booth' : 'Table'} ${p.boothNumber}.</span>
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
