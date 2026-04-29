/**
 * pages/admin/booths.js
 * Admin page to manage Polling Booths and allot students (class-wise).
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';
import { CONFIG } from '../../config.js';

export async function renderAdminBooths(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'booths', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading booth data...</p></div>
  `);

  try {
    const [nominalRoll, booths, locations, posts] = await Promise.all([
      api.getNominalRoll(),
      api.adminGetBooths(pwd).catch(() => []),
      api.adminGetLocations(pwd).catch(() => []),
      api.getPosts().catch(() => [])
    ]);
    renderBoothsUI(container.querySelector('#adminMain'), pwd, nominalRoll, booths, locations, posts);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderBoothsUI(main, pwd, nominalRoll, initialBooths, initialLocations, posts) {
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

    main.innerHTML = `
      <div class="page-enter space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xl font-bold text-white">Polling Booth Allotment</h3>
            <p class="text-slate-400 text-sm">Designate rooms and allot classes to polling booths.</p>
          </div>
          <div class="flex gap-2">
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
              <div class="border border-white/10 rounded-lg p-3 bg-white/5">
                <div class="text-xs text-slate-400 font-bold uppercase mb-1 flex justify-between">
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
                <div class="text-xs text-slate-500 h-16 overflow-y-auto">
                  ${b.classes.length ? b.classes.map(c => `<div>• ${esc(c)} (${classStats[c]?.count || 0})</div>`).join('') : '<em>No classes assigned</em>'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Unallocated Warning -->
        ${unallocated.length ? `
          <div class="alert alert-warning">
            ⚠️ <strong>${unallocated.length} classes</strong> are not assigned to any booth!
          </div>
        ` : ''}

        <!-- Class Allocation Table -->
        <div class="glass rounded-xl overflow-hidden">
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
                      <td class="font-medium text-sm">${esc(cls.name)}</td>
                      <td>${cls.count}</td>
                      <td>
                        <select class="field w-40 py-1 text-sm class-booth-select" data-class="${esc(cls.name)}">
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

    // Attach Event Listeners
    main.querySelector('#btnPrintRolls').addEventListener('click', () => {
      const area = main.querySelector('#printArea');
      area.innerHTML = buildElectoralRollHtml(booths, nominalRoll, posts, classStats);
      
      const printWin = window.open('', '_blank');
      printWin.document.write(`
        <html>
          <head>
            <title>Electoral Rolls - Booth Allotment</title>
            <style>
              body { font-family: sans-serif; color: #333; margin: 0; padding: 0; }
              .page-break { page-break-after: always; }
              .facing-sheet { padding: 40px; border: 2px solid #000; height: 92vh; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
              .college-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
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

    function buildElectoralRollHtml(booths, students, posts, classStats) {
      let html = '';
      booths.forEach((b) => {
        if (!b.classes || b.classes.length === 0) return;
        const boothClasses = b.classes.map(cn => classStats[cn]).filter(Boolean);
        const totalVoters = boothClasses.reduce((sum, c) => sum + c.count, 0);
        const boothDepts = [...new Set(boothClasses.map(c => c.dept.toUpperCase()))];
        const assignedPosts = posts.filter(p => {
          if (!p.deptRestriction) return true;
          const prefix = 'Association Secretary ';
          const reqDept = p.post.startsWith(prefix) ? p.post.replace(prefix, '').toUpperCase() : null;
          return reqDept && boothDepts.includes(reqDept);
        });

        html += `
        <div class="page-break">
          <div class="facing-sheet">
            <div class="header">
              <div class="college-name">${esc(CONFIG.COLLEGE_NAME || 'COLLEGE UNION ELECTION')}</div>
              <div class="title">Electoral Roll — Booth Facing Sheet</div>
            </div>
            <div style="font-size: 20px; margin-bottom: 30px;">
              <p><strong>BOOTH NO:</strong> <span style="font-size: 32px; border: 2px solid #000; padding: 5px 20px; margin-left: 10px;">${b.boothNumber}</span></p>
              <p><strong>LOCATION:</strong> ${esc(b.roomName || 'UNSPECIFIED')}</p>
            </div>
            <div style="flex-grow: 1;">
              <h4 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">Allocation Statistics</h4>
              <table class="stats-table">
                <thead><tr><th>#</th><th>Department</th><th>Class Name</th><th style="text-align:right">Voters</th></tr></thead>
                <tbody>
                  ${boothClasses.map((c, i) => `
                    <tr><td>${i+1}</td><td>${esc(c.dept)}</td><td>${esc(c.name)}</td><td style="text-align:right">${c.count}</td></tr>
                  `).join('')}
                  <tr style="font-weight:bold; background:#f9f9f9"><td colspan="3">GRAND TOTAL VOTERS</td><td style="text-align:right">${totalVoters}</td></tr>
                </tbody>
              </table>
              <h4 style="margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Ballots Assigned to this Booth</h4>
              <div style="display:flex; flex-wrap:wrap; gap:10px; font-size: 11px;">
                ${assignedPosts.map(p => `<span style="padding:4px 8px; border:1px solid #ccc; border-radius:4px;">${esc(p.post)}</span>`).join('')}
              </div>
            </div>
            <div class="footer">
              <div>Returning Officer Signature</div>
              <div>Presiding Officer Signature</div>
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
    }

    // Existing Listeners
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
        refreshUI(); // refresh to update disabled state of options in other dropdowns
      });
    });

    // Location Management Listeners
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
        // Clear it from any booth using it
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
        
        // Remove from all booths first
        booths.forEach(b => { b.classes = b.classes.filter(c => c !== clsName); });
        
        // Add to new booth
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

  const autoAllot = () => {
    // Reset all allocations
    booths.forEach(b => { b.classes = []; b.totalStudents = 0; });
    
    // Group classes by department
    const depts = {};
    allClasses.forEach(cls => {
      if (!depts[cls.dept]) depts[cls.dept] = { name: cls.dept, total: 0, classes: [] };
      depts[cls.dept].classes.push(cls);
      depts[cls.dept].total += cls.count;
    });

    const numBooths = booths.length;
    const totalStudents = nominalRoll.length;
    const mean = totalStudents / numBooths;
    const maxTolerance = mean * 1.25; // allow up to 25% deviation before splitting a dept

    // Sort departments by size descending
    const deptList = Object.values(depts).sort((a, b) => b.total - a.total);

    deptList.forEach(dept => {
      // Find the booth with the least students
      booths.sort((a, b) => a.totalStudents - b.totalStudents);
      const targetBooth = booths[0];

      // If adding this entire department exceeds max tolerance and it has multiple classes, split it
      if (targetBooth.totalStudents + dept.total > maxTolerance && dept.classes.length > 1) {
        // Strict split into max 2 booths
        booths.sort((a, b) => a.totalStudents - b.totalStudents);
        const splitBooth1 = booths[0];
        const splitBooth2 = booths.length > 1 ? booths[1] : booths[0]; // fallback to 1 if only 1 booth exists
        
        // Sort classes within dept by size descending
        const sortedClasses = [...dept.classes].sort((a, b) => b.count - a.count);
        sortedClasses.forEach(cls => {
          // Distribute only between the two emptiest booths
          const currentBooth = splitBooth1.totalStudents <= splitBooth2.totalStudents ? splitBooth1 : splitBooth2;
          currentBooth.classes.push(cls.name);
          currentBooth.totalStudents += cls.count;
        });
      } else {
        // Place whole department in the emptiest booth
        dept.classes.forEach(cls => targetBooth.classes.push(cls.name));
        targetBooth.totalStudents += dept.total;
      }
    });

    // Re-sort booths by their original number for display
    booths.sort((a, b) => a.boothNumber - b.boothNumber);
  };

  refreshUI();
}
