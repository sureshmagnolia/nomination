/**
 * pages/admin/booths.js
 * Admin page to manage Polling Booths and allot students (class-wise).
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { getBallotMasterPlan } from '../../utils/ballotMath.js';

export async function renderAdminBooths(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'booths', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading booth data...</p></div>
  `);

  try {
    const [nominalRoll, booths, locations, posts, nominations] = await Promise.all([
      api.getNominalRoll(),
      api.adminGetBooths(pwd).catch(() => []),
      api.adminGetLocations(pwd).catch(() => []),
      api.getPosts().catch(() => []),
      api.getFinalNominations().catch(() => ({ active: [] }))
    ]);
    renderBoothsUI(container.querySelector('#adminMain'), pwd, nominalRoll, booths, locations, posts, nominations);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderBoothsUI(main, pwd, nominalRoll, initialBooths, initialLocations, posts, nominations) {
  // 1. Process Nominal Roll to get classes and sizes
  const classStats = {};
  nominalRoll.forEach(student => {
    const c = String(student['CLASS'] || 'Unknown').trim();
    const dept = String(student['Dept'] || 'Unknown').trim();
    if (!classStats[c]) {
      classStats[c] = { name: c, dept: dept, count: 0 };
    }
    classStats[c].count++;
  });
  
  const allClasses = Object.values(classStats).sort((a, b) => a.name.localeCompare(b.name));
  let booths = initialBooths.length ? [...initialBooths] : [{ boothNumber: 1, roomName: '', classes: [] }];
  let locations = [...initialLocations];
  let isFirstRender = true;

  const refreshUI = () => {
    // Recalculate booth stats
    booths.forEach(b => b.totalStudents = 0);
    const unallocated = [];
    
    allClasses.forEach(cls => {
      const assignedBooth = booths.find(b => b.classes.includes(cls.name));
      if (assignedBooth) {
        assignedBooth.totalStudents += cls.count;
      } else {
        unallocated.push(cls);
      }
    });

    const scrollPos = window.scrollY;

    main.innerHTML = `
      <div class="page-enter space-y-6">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-bold text-white">Polling Booth Allotment</h3>
            <p class="text-slate-400 text-sm">Designate rooms and allot classes to polling booths.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button id="btnClearAll" class="btn btn-secondary border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white">🗑️ Clear All</button>
            <button id="btnPrintRolls" class="btn btn-secondary">🖨️ Print Electoral Rolls</button>
            <button id="btnAutoAllot" class="btn btn-secondary">⚡ Auto Allot</button>
            <button id="btnSaveBooths" class="btn btn-primary">💾 Save Configuration</button>
          </div>
        </div>
        <div id="printArea" class="hidden"></div>

        <!-- Location Management -->
        <div class="glass rounded-xl p-5 border-l-4 border-l-purple-500">
          <h4 class="font-bold text-white mb-3">Manage Locations</h4>
          <div class="flex gap-2 mb-3">
            <input type="text" id="newLocationInput" class="field flex-1" placeholder="Add a new room or location name...">
            <button id="btnAddLocation" class="btn btn-secondary">Add Location</button>
            <button id="btnSaveLocations" class="btn btn-primary">💾 Save Locations</button>
          </div>
          <div class="flex flex-wrap gap-2">
            ${locations.length ? locations.map((loc, i) => `
              <span class="badge badge-valid bg-white/10 text-white border border-white/20 px-3 py-1 flex items-center gap-2">
                ${esc(loc)}
                <button class="text-red-400 hover:text-red-300 font-bold delete-location" data-idx="${i}">×</button>
              </span>
            `).join('') : '<span class="text-slate-500 text-sm">No locations added yet.</span>'}
          </div>
        </div>

        <!-- Booth Configuration -->
        <div class="glass rounded-xl p-5 border-l-4 border-l-indigo-500">
          <div class="flex justify-between items-center mb-4">
            <h4 class="font-bold text-white">Booth Setup</h4>
            <div class="flex gap-2 items-center">
              <label class="text-sm text-slate-300 mb-0">Total Booths:</label>
              <input type="number" id="numBoothsInput" class="field w-20 py-1" min="1" max="20" value="${booths.length}">
              <button id="btnUpdateBoothCount" class="btn btn-secondary btn-sm">Update</button>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="boothsContainer">
            ${booths.map((b, i) => `
              <div class="border border-white/10 rounded-lg p-3 bg-white/5 shadow-inner">
                <div class="text-[10px] text-slate-500 font-bold uppercase mb-1 flex justify-between">
                  <span>Booth ${i + 1}</span>
                  <span class="${b.totalStudents > 0 ? 'text-indigo-400' : ''}">${b.totalStudents} Students</span>
                </div>
                <select class="field text-sm py-1 mb-2 room-name-select" data-idx="${i}">
                  <option value="">-- Assign Location --</option>
                  ${locations.map(loc => `
                    <option value="${esc(loc)}" 
                      ${b.roomName === loc ? 'selected' : ''}
                      ${booths.some((ob, oi) => oi !== i && ob.roomName === loc) ? 'disabled' : ''}
                    >${esc(loc)}</option>
                  `).join('')}
                </select>
                <div class="text-xs text-slate-500 h-16 overflow-y-auto bg-black/20 rounded p-1">
                  ${b.classes.length ? b.classes.map(c => `<div class="whitespace-nowrap overflow-hidden text-ellipsis">• ${esc(c)} (${classStats[c]?.count || 0})</div>`).join('') : '<em class="opacity-30">No classes assigned</em>'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Unallocated Warning -->
        ${unallocated.length ? `
          <div class="alert alert-warning py-2 text-sm">
            ⚠️ <strong>${unallocated.length} classes</strong> are currently unassigned.
          </div>
        ` : ''}

        <!-- Class Allocation Table -->
        <div class="glass rounded-xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr>
                <th>Department</th>
                <th>Class</th>
                <th>Students</th>
                <th>Assigned Booth</th>
              </tr></thead>
              <tbody>
                ${allClasses.map(cls => {
                  const assignedBooth = booths.find(b => b.classes.includes(cls.name));
                  return `
                    <tr>
                      <td class="text-xs text-slate-400">${esc(cls.dept)}</td>
                      <td class="font-medium text-sm text-white">${esc(cls.name)}</td>
                      <td class="font-mono text-indigo-300">${cls.count}</td>
                      <td>
                        <select class="field w-full md:w-44 py-1 text-xs class-booth-select" data-class="${esc(cls.name)}">
                          <option value="">-- Unassigned --</option>
                          ${booths.map((b, i) => `
                            <option value="${i}" ${assignedBooth === b ? 'selected' : ''}>Booth ${i + 1}</option>
                          `).join('')}
                        </select>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Re-scroll to previous position
    if (!isFirstRender) {
      window.scrollTo(0, scrollPos);
    }
    isFirstRender = false;

    // --- Listeners ---
    main.querySelector('#btnClearAll').addEventListener('click', () => {
      if (confirm('Clear all class allotments? Room locations will be kept.')) {
        booths.forEach(b => b.classes = []);
        refreshUI();
      }
    });

    main.querySelector('#btnPrintRolls').addEventListener('click', () => {
      const area = main.querySelector('#printArea');
      area.innerHTML = buildElectoralRollHtml(booths, nominalRoll, posts, classStats, nominations);
      
      const printWin = window.open('', '_blank');
      printWin.document.write(`
        <html>
          <head>
            <title>Electoral Rolls - Booth Allotment</title>
            <style>
              body { font-family: sans-serif; color: #333; margin: 0; padding: 0; }
              .page-break { page-break-after: always; }
              .facing-sheet { padding: 30px; border: 2px solid #000; height: 95vh; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
              .college-name { font-size: 20px; font-weight: bold; margin-bottom: 2px; }
              .title { font-size: 18px; font-weight: bold; text-transform: uppercase; }
              .stats-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              .stats-table th, .stats-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              .stats-table th { background: #f5f5f5; font-size: 12px; }
              .roll-page { padding: 30px; }
              .roll-header { display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 15px; font-size: 12px; }
              .roll-table { width: 100%; border-collapse: collapse; }
              .roll-table th, .roll-table td { border: 1.2px solid #000; padding: 6px 10px; text-align: left; font-size: 11px; }
              .roll-table th { background: #eee; font-weight: bold; }
              .footer { display: flex; justify-content: space-around; margin-top: 50px; font-size: 13px; font-weight: bold; }
              @media print {
                .no-print { display: none; }
                .page-break { page-break-after: always; }
              }
            </style>
          </head>
          <body>
            ${area.innerHTML}
          </body>
        </html>
      `);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => { printWin.print(); }, 500);
    });

    main.querySelector('#btnUpdateBoothCount').addEventListener('click', () => {
      const num = parseInt(main.querySelector('#numBoothsInput').value, 10);
      if (num > 0 && num <= 50) {
        if (num > booths.length) {
          for (let i = booths.length; i < num; i++) booths.push({ boothNumber: i + 1, roomName: '', classes: [] });
        } else if (num < booths.length) {
          booths = booths.slice(0, num);
        }
        refreshUI();
      }
    });

    main.querySelectorAll('.room-name-select').forEach(select => {
      select.addEventListener('change', (e) => {
        booths[e.target.dataset.idx].roomName = e.target.value;
        refreshUI();
      });
    });

    main.querySelector('#btnAddLocation').addEventListener('click', () => {
      const val = main.querySelector('#newLocationInput').value.trim();
      if (val && !locations.includes(val)) {
        locations.push(val);
        refreshUI();
      }
    });

    main.querySelectorAll('.delete-location').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.target.dataset.idx;
        const loc = locations[idx];
        locations.splice(idx, 1);
        booths.forEach(b => { if (b.roomName === loc) b.roomName = ''; });
        refreshUI();
      });
    });

    main.querySelector('#btnSaveLocations').addEventListener('click', async (e) => {
      const btn = e.target;
      setLoading(btn, true, '💾 Save Locations');
      try {
        await api.adminSaveLocations(pwd, locations);
        showToast('Locations saved successfully!', 'success');
      } catch (err) {
        showToast(`Failed to save: ${err.message}`, 'error');
      } finally {
        setLoading(btn, false, '💾 Save Locations');
      }
    });

    main.querySelectorAll('.class-booth-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const clsName = e.target.dataset.class;
        const newBoothIdx = e.target.value;
        booths.forEach(b => { b.classes = b.classes.filter(c => c !== clsName); });
        if (newBoothIdx !== '') {
          booths[parseInt(newBoothIdx, 10)].classes.push(clsName);
        }
        refreshUI();
      });
    });

    main.querySelector('#btnSaveBooths').addEventListener('click', async (e) => {
      const btn = e.target;
      setLoading(btn, true, '💾 Save Configuration');
      try {
        await api.adminSaveBooths(pwd, booths);
        showToast('Booth configuration saved successfully!', 'success');
      } catch (err) {
        showToast(`Failed to save: ${err.message}`, 'error');
      } finally {
        setLoading(btn, false, '💾 Save Configuration');
      }
    });

    main.querySelector('#btnAutoAllot').addEventListener('click', () => {
      autoAllot();
      refreshUI();
      showToast('Auto allotment complete. Please review and save.', 'info');
    });
  };

  const buildElectoralRollHtml = (booths, students, posts, classStats, nominationsResponse) => {
    let html = '';
    const candidates = nominationsResponse.active || [];
    const plan = getBallotMasterPlan(posts, candidates, booths, students);

    const sortedBooths = [...booths].sort((a, b) => a.boothNumber - b.boothNumber);

    sortedBooths.forEach((b) => {
      if (!b.classes || b.classes.length === 0) return;
      const boothStudents = students.filter(s => b.classes.includes(String(s.CLASS).trim()));
      const totalVoters = boothStudents.length;
      const boothClasses = b.classes.map(cn => classStats[cn]).filter(Boolean);
      
      const assignments = plan.boothAssignments[b.boothNumber] || { general: null, reps: [], assocs: [] };

      html += `
      <div class="page-break">
        <div class="facing-sheet">
          <div class="header">
            <div class="college-name">${esc(CONFIG.COLLEGE_NAME || 'COLLEGE UNION ELECTION')}</div>
            <div class="title" style="font-size: 14px;">Electoral Roll — Booth Facing Sheet</div>
          </div>
          
          <div style="font-size: 16px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ccc; padding-bottom: 10px;">
            <div>
              <strong>BOOTH:</strong> <span style="font-size: 24px; border: 2px solid #000; padding: 2px 15px; margin-left: 5px;">${b.boothNumber}</span>
              <span style="margin-left: 20px;"><strong>LOC:</strong> ${esc(b.roomName || 'UNSPECIFIED')}</span>
            </div>
            <div style="text-align: right; font-size: 11px; color: #666;">
              Ref: ${new Date().getFullYear()} Election
            </div>
          </div>

          <div style="flex-grow: 1; display: grid; grid-template-columns: 1fr 1.3fr; gap: 20px;">
            <!-- Left Column: Classes -->
            <div>
              <h4 style="border-bottom: 1px solid #eee; padding-bottom: 3px; font-size: 12px; margin: 0;">Allocation Statistics</h4>
              <table class="stats-table" style="font-size: 10px; margin-top: 5px;">
                <thead><tr><th>Dept</th><th>Class Name</th><th style="text-align:right">Voters</th></tr></thead>
                <tbody>
                  ${boothClasses.map((c) => `
                    <tr><td>${esc(c.dept)}</td><td>${esc(c.name)}</td><td style="text-align:right">${c.count}</td></tr>
                  `).join('')}
                  <tr style="font-weight:bold; background:#f9f9f9"><td colspan="2">TOTAL VOTERS</td><td style="text-align:right">${totalVoters}</td></tr>
                </tbody>
              </table>
            </div>

            <!-- Right Column: Ballots -->
            <div>
              <h4 style="border-bottom: 1px solid #eee; padding-bottom: 3px; font-size: 12px; margin: 0;">Ballots & Books Assigned</h4>
              <table class="stats-table" style="font-size: 9px; margin-top: 5px; width: 100%;">
                <thead>
                  <tr style="background:#f0f7ff">
                    <th>Ballot Category</th>
                    <th>Serial Ranges</th>
                    <th style="text-align:right">Book IDs</th>
                  </tr>
                </thead>
                <tbody>
                  ${assignments.general ? `
                    <tr style="font-weight:bold">
                      <td>General Union Posts</td>
                      <td>G${assignments.general.start} - G${assignments.general.end}</td>
                      <td style="text-align:right; color:#4f46e5">${assignments.general.bookIds}</td>
                    </tr>
                  ` : ''}
                  ${assignments.reps.map(r => `
                    <tr>
                      <td style="font-size:8.5px">${esc(r.post)}</td>
                      <td>R${r.start} - R${r.end}</td>
                      <td style="text-align:right; color:#10b981">${r.bookIds}</td>
                    </tr>
                  `).join('')}
                  ${assignments.assocs.map(a => `
                    <tr>
                      <td style="font-size:8.5px">${esc(a.post)}</td>
                      <td>A${a.start} - A${a.end}</td>
                      <td style="text-align:right; color:#f59e0b">${a.bookIds}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="footer" style="margin-top: 20px;">
            <div style="border-top: 1px solid #000; padding-top: 5px; width: 180px; text-align: center; font-size: 11px;">Returning Officer</div>
            <div style="border-top: 1px solid #000; padding-top: 5px; width: 180px; text-align: center; font-size: 11px;">Presiding Officer</div>
          </div>
        </div>
      </div>`;

      boothClasses.forEach(cls => {
        const classStudents = students.filter(s => String(s['CLASS']).trim() === cls.name);
        classStudents.sort((a, b) => String(a['NAME']).localeCompare(String(b['NAME'])));
        html += `
        <div class="page-break">
          <div class="roll-page">
            <div class="roll-header">
              <div><strong>BOOTH ${b.boothNumber}</strong> | ${esc(b.roomName || 'No Room')}</div>
              <div style="text-align:center; flex-grow:1; font-weight:bold; font-size:14px;">ELECTORAL ROLL - ${esc(cls.name)}</div>
              <div>Dept: ${esc(cls.dept)}</div>
            </div>
            <table class="roll-table">
              <thead><tr>
                <th style="width:40px">Sl.No</th>
                <th style="width:90px">Adm. No</th>
                <th>Student Name</th>
                <th style="width:140px">Class</th>
                <th style="width:100px">Signature</th>
              </tr></thead>
              <tbody>
                ${classStudents.map((s) => `
                  <tr>
                    <td style="text-align:center; font-weight:bold">${esc(s['Nominal Roll Serial Number'] || '–')}</td>
                    <td style="font-family:monospace">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                    <td style="font-weight:bold">${esc(s['NAME'])}</td>
                    <td style="font-size:10px">${esc(s['CLASS'])}</td>
                    <td></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="margin-top:20px; text-align:right; font-size:10px; color:#999">Total Voters: ${classStudents.length}</div>
          </div>
        </div>`;
      });
    });
    return html;
  };

  const autoAllot = () => {
    booths.forEach(b => { b.classes = []; b.totalStudents = 0; });
    const depts = {};
    allClasses.forEach(cls => {
      if (!depts[cls.dept]) depts[cls.dept] = { name: cls.dept, total: 0, classes: [] };
      depts[cls.dept].classes.push(cls);
      depts[cls.dept].total += cls.count;
    });
    const numBooths = booths.length;
    const totalStudents = nominalRoll.length;
    const mean = totalStudents / numBooths;
    const maxTolerance = mean * 1.25;
    const deptList = Object.values(depts).sort((a, b) => b.total - a.total);

    deptList.forEach(dept => {
      booths.sort((a, b) => a.totalStudents - b.totalStudents);
      const targetBooth = booths[0];
      if (targetBooth.totalStudents + dept.total > maxTolerance && dept.classes.length > 1) {
        booths.sort((a, b) => a.totalStudents - b.totalStudents);
        const splitBooth1 = booths[0];
        const splitBooth2 = booths.length > 1 ? booths[1] : booths[0];
        const sortedClasses = [...dept.classes].sort((a, b) => b.count - a.count);
        sortedClasses.forEach(cls => {
          const currentBooth = splitBooth1.totalStudents <= splitBooth2.totalStudents ? splitBooth1 : splitBooth2;
          currentBooth.classes.push(cls.name);
          currentBooth.totalStudents += cls.count;
        });
      } else {
        dept.classes.forEach(cls => targetBooth.classes.push(cls.name));
        targetBooth.totalStudents += dept.total;
      }
    });
    booths.sort((a, b) => a.boothNumber - b.boothNumber);
  };

  refreshUI();
}
