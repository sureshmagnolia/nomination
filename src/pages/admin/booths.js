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
    const [nominalRoll, booths, locations, posts, nominations, plan, settings] = await Promise.all([
      api.getNominalRoll(),
      api.adminGetBooths(pwd).catch(() => []),
      api.adminGetLocations(pwd).catch(() => []),
      api.adminGetPosts(pwd).catch(() => []),
      api.adminGetFinalNominations(pwd).catch(() => api.getFinalNominations()).catch(() => ({ active: [] })),
      api.adminGetBallotPlan(pwd).catch(() => null),
      api.adminGetSettings(pwd).catch(() => ({}))
    ]);
    renderBoothsUI(container.querySelector('#adminMain'), pwd, nominalRoll, booths, locations, posts, nominations, plan, settings);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderBoothsUI(main, pwd, nominalRoll, initialBooths, initialLocations, posts, nominations, plan, settings) {
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
  let editingLocIdx = null;
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
        <!-- Locations Modal -->
        <div id="locationsModal" class="fixed inset-0 z-50 flex items-center justify-center hidden">
          <div class="absolute inset-0 bg-slate-900/80" id="locationsModalOverlay"></div>
          <div class="relative bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg p-6 z-10 flex flex-col max-h-[90vh]">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-white text-lg">📍 Manage &amp; Edit Locations</h4>
                <span id="locationsCountBadge" class="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-mono">
                  ${locations.length} Locations
                </span>
              </div>
              <button id="btnCloseLocationsModal" class="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            <div class="flex gap-2 mb-4">
              <input type="text" id="newLocationInput" class="field flex-1" placeholder="Add room or location name (e.g. Room 101, Auditorium)...">
              <button id="btnAddLocation" class="btn btn-secondary whitespace-nowrap">➕ Add</button>
            </div>

            <!-- Scrollable Locations List -->
            <div class="flex-1 overflow-y-auto mb-4 pr-1 min-h-[140px] max-h-[360px]" id="locationsListContainer">
              <div id="locationsList" class="space-y-2"></div>
            </div>

            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
              <span class="text-xs text-slate-400">💡 Click <strong>✏️ Edit</strong> or double-click to rename.</span>
              <div class="flex gap-2">
                <button id="btnCloseLocationsModal2" class="btn btn-secondary">Close</button>
                <button id="btnSaveLocations" class="btn btn-primary">💾 Save Locations</button>
              </div>
            </div>
          </div>
        </div>

      <div class="page-enter space-y-6">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-bold text-white">Polling Booth Allotment</h3>
            <p class="text-slate-400 text-sm">Designate rooms and allot classes to polling booths.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button id="btnClearAll" class="btn btn-secondary border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white">🗑️ Clear All</button>
            <button id="btnAutoAllot" class="btn btn-secondary">⚡ Auto Allot</button>
            <button id="btnManageLocations" class="btn btn-secondary border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white">📍 Manage Locations</button>
            <button id="btnSaveBooths" class="btn btn-primary">💾 Save Configuration</button>
            <button id="btnRegenPlan" class="btn btn-primary border-indigo-500 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 px-4">🔄 Finalize Master Plan</button>
            <button id="btnPrintRolls" class="btn btn-secondary">🖨️ Print Marked Copy (Electoral Rolls)</button>
            <button id="btnPrintBallotAccounts" class="btn btn-secondary border-indigo-500/30 text-indigo-300 hover:bg-indigo-500 hover:text-white">📑 Print Ballot Accounts</button>
          </div>
        </div>
        <div id="printArea" class="hidden"></div>




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
                <div class="flex gap-1.5 items-center mb-2">
                  <select class="field text-sm py-1 flex-1 room-name-select" data-idx="${i}">
                    <option value="">-- Assign Location --</option>
                    ${locations.map(loc => `
                      <option value="${esc(loc)}" 
                        ${b.roomName === loc ? 'selected' : ''}
                        ${booths.some((ob, oi) => oi !== i && ob.roomName === loc) ? 'disabled' : ''}
                      >${esc(loc)}</option>
                    `).join('')}
                    <option value="__ADD_NEW__">➕ Add / Manage Locations...</option>
                  </select>
                  ${b.roomName ? `
                    <button type="button" class="btn btn-secondary btn-xs py-1.5 px-2 text-slate-300 hover:text-white border-white/10 quick-edit-loc-btn" data-idx="${i}" title="Edit / Rename '${esc(b.roomName)}'">
                      ✏️
                    </button>
                  ` : ''}
                </div>
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
      area.innerHTML = buildElectoralRollHtml(booths, nominalRoll, posts, classStats, nominations, plan);
      
      const printWin = window.open('', '_blank');
      printWin.document.write(`
        <html>
          <head>
            <title>Electoral Rolls - Booth Allotment</title>
            <style>
              @page { size: A4 portrait; margin: 10mm 12mm; }
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 0; font-size: 11px; }
              .facing-sheet { padding: 0; page-break-before: always; break-before: page; page-break-after: always; break-after: page; display: flex; flex-direction: column; height: 250mm; }
              .facing-sheet:first-of-type { page-break-before: avoid; break-before: avoid; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
              .college-name { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
              .title { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
              .stats-table { width: 99.5%; margin: 0 auto; border-collapse: collapse; border: 1.5px solid #555; }
              .stats-table th, .stats-table td { border: 1px solid #555; padding: 4px 6px; text-align: left; }
              .stats-table th { background: #f0f0f0; font-size: 10px; text-transform: uppercase; font-weight: bold; }
              .footer { display: flex; justify-content: space-between; margin-top: 20px; padding: 0 30px; }
              .sig-line { border-top: 1.5px solid #000; padding-top: 5px; width: 160px; text-align: center; font-size: 11px; font-weight: bold; }
              .roll-page { page-break-before: always; break-before: page; }
              .roll-page:first-of-type { page-break-before: avoid; break-before: avoid; }
              .roll-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 4px; font-size: 11px; }
              .roll-table { width: 99.5%; margin: 0 auto; border-collapse: collapse; border: 1.5px solid #555; table-layout: fixed; }
              .roll-table thead { display: table-header-group; }
              .roll-table tbody { orphans: 4; widows: 4; }
              .roll-table th { background: #e8e8e8; font-weight: bold; text-transform: uppercase; font-size: 9px; border: 1px solid #555; padding: 4px 4px; }
              .roll-table td { border: 1px solid #555; padding: 2px 4px; font-size: 10px; }
              .roll-table tr { page-break-inside: avoid; break-inside: avoid; height: 24px; }
              @media print {
                .no-print { display: none; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
    
    main.querySelector('#btnPrintBallotAccounts').addEventListener('click', () => {
      const area = main.querySelector('#printArea');
      area.innerHTML = buildBallotAccountHtml(booths, nominalRoll, posts, classStats, nominations, plan);
      
      const printWin = window.open('', '_blank');
      printWin.document.write(`
        <html>
          <head>
            <title>Ballot Accounts - Booth Wise</title>
            <style>
              @page { size: A4 portrait; margin: 10mm; }
              body { font-family: sans-serif; color: #333; margin: 0; padding: 0; }
              .page-break { page-break-after: always; }
              .account-page { padding: 20px; display: flex; flex-direction: column; box-sizing: border-box; border: 1px solid #ccc; margin: 5px; min-height: 250mm; position: relative; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
              .college-name { font-size: 20px; font-weight: bold; margin-bottom: 3px; }
              .title { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
              .stats-table { width: 99.5%; margin: 0 auto; border-collapse: collapse; border: 1.5px solid #000; }
              .stats-table th, .stats-table td { border: 1px solid #000; padding: 6px 10px; text-align: left; font-size: 11px; }
              .stats-table th { background: #f2f2f2; font-size: 11px; text-transform: uppercase; font-weight: bold; }
              .footer { display: flex; justify-content: flex-end; margin-top: 30px; padding-right: 30px; }
              .sig-line { border-top: 1.5px solid #000; padding-top: 8px; width: 220px; text-align: center; font-size: 13px; font-weight: bold; }
              @media print { .no-print { display: none; } .page-break { page-break-after: always; } }
            </style>
          </head>
          <body>${area.innerHTML}</body>
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
        const val = e.target.value;
        const boothIdx = parseInt(e.target.dataset.idx, 10);
        if (val === '__ADD_NEW__') {
          e.target.value = booths[boothIdx].roomName || '';
          openModal();
          const inp = modal.querySelector('#newLocationInput');
          if (inp) inp.focus();
          return;
        }
        booths[boothIdx].roomName = val;
        refreshUI();
      });
    });

    main.querySelectorAll('.quick-edit-loc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const boothIdx = parseInt(e.currentTarget.dataset.idx, 10);
        const curRoom = booths[boothIdx]?.roomName;
        if (!curRoom) return;
        const locIdx = locations.indexOf(curRoom);
        openModal();
        if (locIdx !== -1) {
          editingLocIdx = locIdx;
          rerenderLocationsList();
          const editInp = modal.querySelector(`.loc-edit-input[data-idx="${locIdx}"]`);
          if (editInp) {
            editInp.focus();
            editInp.select();
          }
        }
      });
    });

    const modal = main.querySelector('#locationsModal');
    const closeModal = () => {
      editingLocIdx = null;
      modal.classList.add('hidden');
    };
    const openModal = () => {
      modal.classList.remove('hidden');
      rerenderLocationsList();
    };

    const commitLocEdit = (idx) => {
      const input = modal.querySelector(`.loc-edit-input[data-idx="${idx}"]`);
      if (!input) return;
      const newVal = input.value.trim();
      if (!newVal) {
        showToast('Location name cannot be blank.', 'error');
        input.focus();
        return;
      }
      const oldVal = locations[idx];
      if (newVal === oldVal) {
        editingLocIdx = null;
        rerenderLocationsList();
        return;
      }
      const duplicate = locations.some((l, i) => i !== idx && l.toLowerCase() === newVal.toLowerCase());
      if (duplicate) {
        showToast(`Location "${newVal}" already exists.`, 'error');
        input.focus();
        return;
      }
      locations[idx] = newVal;
      let affected = 0;
      booths.forEach(b => {
        if (b.roomName === oldVal) {
          b.roomName = newVal;
          affected++;
        }
      });
      editingLocIdx = null;
      rerenderLocationsList();
      if (affected > 0) {
        showToast(`Renamed to "${newVal}" (updated ${affected} booth assignment). Remember to save!`, 'info');
      } else {
        showToast(`Renamed to "${newVal}".`, 'info');
      }
    };

    const rerenderLocationsList = () => {
      const countBadge = modal.querySelector('#locationsCountBadge');
      if (countBadge) countBadge.textContent = `${locations.length} Locations`;

      const list = modal.querySelector('#locationsList');
      if (!locations.length) {
        list.innerHTML = '<div class="p-6 text-center text-slate-500 text-sm italic bg-black/20 rounded-xl border border-white/5">No locations added yet. Add your rooms and halls above.</div>';
        return;
      }

      list.innerHTML = locations.map((loc, i) => {
        const assignedBooths = booths.filter(b => b.roomName === loc);
        if (editingLocIdx === i) {
          return `
            <div class="p-2.5 rounded-lg bg-indigo-950/50 border border-indigo-500/50 flex items-center gap-2">
              <input type="text" class="field text-sm py-1 flex-1 loc-edit-input" data-idx="${i}" value="${esc(loc)}">
              <button type="button" class="btn btn-primary btn-xs py-1 px-2.5 save-loc-edit" data-idx="${i}" title="Save rename">✓ Save</button>
              <button type="button" class="btn btn-secondary btn-xs py-1 px-2 cancel-loc-edit" data-idx="${i}" title="Cancel">✕</button>
            </div>
          `;
        }
        return `
          <div class="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 transition-colors loc-item-row" data-idx="${i}">
            <div class="flex items-center gap-2 min-w-0 flex-1 cursor-pointer loc-label-wrap" data-idx="${i}" title="Double-click to edit">
              <span class="text-base text-slate-400 flex-shrink-0">📍</span>
              <span class="text-sm font-medium text-white truncate loc-text">${esc(loc)}</span>
              ${assignedBooths.length ? assignedBooths.map(ab => `
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                  Booth ${ab.boothNumber}
                </span>
              `).join('') : ''}
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button type="button" class="btn btn-secondary btn-xs py-1 px-2 text-slate-300 hover:text-white border-white/10 edit-location" data-idx="${i}" title="Rename location">
                ✏️ Edit
              </button>
              <button type="button" class="btn btn-secondary btn-xs py-1 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20 delete-location" data-idx="${i}" title="Delete location">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.edit-location').forEach(btn => {
        btn.addEventListener('click', (e) => {
          editingLocIdx = parseInt(e.currentTarget.dataset.idx, 10);
          rerenderLocationsList();
          const inp = modal.querySelector(`.loc-edit-input[data-idx="${editingLocIdx}"]`);
          if (inp) {
            inp.focus();
            inp.select();
          }
        });
      });

      list.querySelectorAll('.loc-label-wrap').forEach(wrap => {
        wrap.addEventListener('dblclick', (e) => {
          editingLocIdx = parseInt(e.currentTarget.dataset.idx, 10);
          rerenderLocationsList();
          const inp = modal.querySelector(`.loc-edit-input[data-idx="${editingLocIdx}"]`);
          if (inp) {
            inp.focus();
            inp.select();
          }
        });
      });

      list.querySelectorAll('.save-loc-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          commitLocEdit(parseInt(e.currentTarget.dataset.idx, 10));
        });
      });

      list.querySelectorAll('.cancel-loc-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          editingLocIdx = null;
          rerenderLocationsList();
        });
      });

      list.querySelectorAll('.loc-edit-input').forEach(inp => {
        inp.addEventListener('keydown', (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          if (e.key === 'Enter') {
            e.preventDefault();
            commitLocEdit(idx);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            editingLocIdx = null;
            rerenderLocationsList();
          }
        });
      });

      list.querySelectorAll('.delete-location').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          const loc = locations[idx];
          const assigned = booths.filter(b => b.roomName === loc);
          if (assigned.length > 0) {
            const boothNums = assigned.map(b => `Booth ${b.boothNumber}`).join(', ');
            if (!confirm(`"${loc}" is currently assigned to ${boothNums}.\n\nDeleting it will remove the assignment from these booths. Proceed?`)) {
              return;
            }
          }
          locations.splice(idx, 1);
          booths.forEach(b => { if (b.roomName === loc) b.roomName = ''; });
          if (editingLocIdx === idx) editingLocIdx = null;
          else if (editingLocIdx > idx) editingLocIdx--;
          rerenderLocationsList();
        });
      });
    };

    main.querySelector('#btnManageLocations').addEventListener('click', openModal);
    main.querySelector('#btnCloseLocationsModal').addEventListener('click', closeModal);
    main.querySelector('#btnCloseLocationsModal2').addEventListener('click', closeModal);
    main.querySelector('#locationsModalOverlay').addEventListener('click', closeModal);

    main.querySelector('#btnAddLocation').addEventListener('click', () => {
      const input = main.querySelector('#newLocationInput');
      const val = input.value.trim();
      if (!val) return;
      if (locations.some(l => l.toLowerCase() === val.toLowerCase())) {
        showToast(`Location "${val}" already exists.`, 'error');
        input.focus();
        return;
      }
      locations.push(val);
      input.value = '';
      rerenderLocationsList();
      showToast(`Added "${val}". Click "Save Locations" to persist.`, 'info');
      const container = modal.querySelector('#locationsListContainer');
      if (container) container.scrollTop = container.scrollHeight;
    });

    main.querySelector('#newLocationInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        main.querySelector('#btnAddLocation').click();
      }
    });

    rerenderLocationsList();

    main.querySelector('#btnSaveLocations').addEventListener('click', async (e) => {
      if (editingLocIdx !== null) {
        commitLocEdit(editingLocIdx);
      }
      const btn = e.target;
      setLoading(btn, true, '💾 Save Locations');
      try {
        await api.adminSaveLocations(pwd, locations);
        await api.adminSaveBooths(pwd, booths);
        showToast('Locations and booth assignments saved successfully!', 'success');
        closeModal();
        refreshUI();
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

    main.querySelector('#btnRegenPlan').addEventListener('click', async (e) => {
      const btn = e.target;
      const defaultText = '🔄 Finalize Master Plan';
      try {
        setLoading(btn, true, defaultText);
        showToast('Calculating and saving Master Plan on server...', 'info');
        await api.adminGenerateBallotPlan(pwd);
        showToast('Master Plan finalized successfully! You can now print documents.', 'success');
        plan = await api.adminGetBallotPlan(pwd).catch(() => null);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(btn, false, defaultText);
      }
    });

    main.querySelector('#btnAutoAllot').addEventListener('click', () => {
      autoAllot();
      refreshUI();
      showToast('Auto allotment complete. Please review and save.', 'info');
    });
  };

  const buildElectoralRollHtml = (booths, students, posts, classStats, nominationsResponse, plan) => {
    const collegeName = settings?.collegeName || CONFIG.COLLEGE_NAME || 'COLLEGE UNION ELECTION';
    const electionYear = settings?.electionYear || new Date().getFullYear().toString();
    const collegeLogo = settings?.collegeLogo || '';
    let html = '';
    
    if (!plan) {
      return `<div class="alert alert-error">❌ Master Ballot Plan not generated. Please generate it from the Ballot Printing page first.</div>`;
    }

    const sortedBooths = [...booths].sort((a, b) => a.boothNumber - b.boothNumber);

    sortedBooths.forEach((b) => {
      if (!b.classes || b.classes.length === 0) return;
      const boothStudents = students.filter(s => b.classes.includes(String(s.CLASS).trim()));
      const totalVoters = boothStudents.length;
      const boothClasses = b.classes.map(cn => classStats[cn]).filter(Boolean);
      
      const assignments = plan.boothAssignments[b.boothNumber] || { general: null, reps: [], assocs: [] };

      html += `
      <div class="facing-sheet">
          <div class="header">
            ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:50px;max-width:130px;margin:0 auto 6px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
            <div class="college-name">${esc(collegeName)}</div>
            <div class="title">College Union Election ${esc(electionYear)} — Booth Facing Sheet</div>
          </div>
          
          <div style="font-size: 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ccc; padding-bottom: 8px;">
            <div>
              <strong>BOOTH:</strong> <span style="font-size: 20px; border: 2px solid #000; padding: 2px 12px; margin-left: 5px;">${b.boothNumber}</span>
              <span style="margin-left: 20px;"><strong>LOCATION:</strong> ${esc(b.roomName || 'UNSPECIFIED')}</span>
            </div>
            <div style="text-align: right; font-size: 10px; color: #666;">
              Ref: ${new Date().getFullYear()} Election
            </div>
          </div>

          <div style="flex: 1; display: flex; flex-direction: column; margin-bottom: 20px;">
            <h4 style="border-bottom: 2px solid #000; padding-bottom: 3px; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase;">1. Allocation Statistics</h4>
            <table class="stats-table" style="flex: 1; font-size: 13px;">
              <thead>
                <tr style="background:#f5f5f5">
                  <th style="width:25%; font-size:11px;">Department</th>
                  <th style="font-size:11px;">Class Name</th>
                  <th style="text-align:right; width:15%; font-size:11px;">Voters</th>
                </tr>
              </thead>
              <tbody>
                ${boothClasses.map((c) => `
                  <tr><td style="font-size:13px; font-weight:bold;">${esc(c.dept)}</td><td style="font-size:13px;">${esc(c.name)}</td><td style="text-align:right; font-size:13px; font-weight:bold;">${c.count}</td></tr>
                `).join('')}
                <tr style="font-weight:bold; background:#eee">
                  <td colspan="2" style="font-size:12px;">TOTAL VOTERS ALLOTTED TO THIS BOOTH</td>
                  <td style="text-align:right; font-size:14px;">${totalVoters}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="flex: 1.5; display: flex; flex-direction: column; margin-bottom: 20px;">
            <h4 style="border-bottom: 2px solid #000; padding-bottom: 3px; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase;">2. Ballots &amp; Books Account (To be filled by PO)</h4>
            <table class="stats-table" style="flex: 1; font-size: 12px;">
              <thead>
                <tr>
                  <th style="width:20%; font-size:11px;">Ballot Category</th>
                  <th style="width:15%; font-size:11px;">Serial Range</th>
                  <th style="width:10%; text-align:center; font-size:11px;">Total Qty</th>
                  <th style="width:18%; font-size:11px;">Book IDs</th>
                  <th style="width:10%; text-align:center; font-size:11px;">Ballots Used</th>
                  <th style="width:10%; text-align:center; font-size:11px;">Ballots Returned</th>
                  <th style="font-size:11px;">Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${(assignments.generalParts && assignments.generalParts.length > 1) ? assignments.generalParts.map(gp => `
                  <tr style="font-weight:bold">
                    <td style="font-size:12px;">${esc(gp.title || 'General Union Posts')}</td>
                    <td style="font-size:12px;">${gp.prefix === 'G' ? 'G' : gp.prefix + '-'}${gp.start} - ${gp.prefix === 'G' ? 'G' : gp.prefix + '-'}${gp.end}</td>
                    <td style="text-align:center; font-size:13px;">${gp.count}</td>
                    <td style="font-size:11px;">${gp.bookIds}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join('') : (assignments.general ? `
                  <tr style="font-weight:bold">
                    <td style="font-size:12px;">${esc(assignments.general.title || 'General Union Posts')}</td>
                    <td style="font-size:12px;">${assignments.general.prefix && assignments.general.prefix !== 'G' ? assignments.general.prefix + '-' : 'G'}${assignments.general.start} - ${assignments.general.prefix && assignments.general.prefix !== 'G' ? assignments.general.prefix + '-' : 'G'}${assignments.general.end}</td>
                    <td style="text-align:center; font-size:13px;">${assignments.general.count}</td>
                    <td style="font-size:11px;">${assignments.general.bookIds}</td>
                    <td></td><td></td><td></td>
                  </tr>
                ` : '')}
                ${assignments.reps.map(r => `
                  <tr>
                    <td style="font-size:12px; font-weight:bold;">${esc(r.post)}</td>
                    <td style="font-size:12px;">R${r.start} - R${r.end}</td>
                    <td style="text-align:center; font-size:13px;">${r.count}</td>
                    <td style="font-size:11px;">${r.bookIds}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join('')}
                ${assignments.assocs.map(a => `
                  <tr>
                    <td style="font-size:12px; font-weight:bold;">${esc(a.post)}</td>
                    <td style="font-size:12px;">A${a.start} - A${a.end}</td>
                    <td style="text-align:center; font-size:13px;">${a.count}</td>
                    <td style="font-size:11px;">${a.bookIds}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <div class="sig-line">Returning Officer</div>
            <div class="sig-line">Presiding Officer</div>
          </div>
        </div>`;

      boothClasses.forEach(cls => {
        const classStudents = students.filter(s => String(s['CLASS']).trim() === cls.name);
        classStudents.sort((a, b) => String(a['NAME']).localeCompare(String(b['NAME'])));

        html += `
        <div class="roll-page">
          <div class="roll-header">
            <div><strong>BOOTH ${b.boothNumber}</strong> | ${esc(b.roomName || 'No Room')}</div>
            <div style="text-align:center; flex-grow:1; font-weight:bold; font-size:13px;">College Union Election ${esc(electionYear)} — MARKED COPY (${esc(cls.name)})</div>
            <div>Dept: ${esc(cls.dept)}</div>
          </div>
          <table class="roll-table">
            <thead>
              <tr>
                <th style="width:38px">Sl.No</th>
                <th style="width:70px">Adm. No</th>
                <th>Student Name</th>
                <th style="width:160px">Class</th>
                <th style="width:100px">Voter Signature</th>
              </tr>
            </thead>
            <tbody>
              ${classStudents.map(s => `
                <tr>
                  <td style="text-align:center; font-weight:bold;">${esc(String(s['Nominal Roll Serial Number'] || s['SL_NO'] || s['SL NO'] || s['Serial Number'] || s['serial_number'] || '–'))}</td>
                  <td style="font-family:monospace; font-size:9px; white-space:nowrap;">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                  <td style="font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(s['NAME'])}</td>
                  <td style="font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(s['CLASS'])}</td>
                  <td></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="display:flex; justify-content:space-between; margin-top:14px; padding:6px 12px; font-size:10px; font-weight:bold; border-top:1.5px solid #000;">
            <div>Verified by Polling Officer: ___________________</div>
            <div>Signature of Presiding Officer: ___________________</div>
          </div>
        </div>`;
      });
    });
    return html;
  };

  const buildBallotAccountHtml = (booths, students, posts, classStats, nominationsResponse, plan) => {
    const collegeName = settings?.collegeName || CONFIG.COLLEGE_NAME || 'COLLEGE UNION ELECTION';
    const electionYear = settings?.electionYear || new Date().getFullYear().toString();
    const collegeLogo = settings?.collegeLogo || '';
    let html = '';
    if (!plan) return `<div class="alert alert-error">❌ Master Ballot Plan not generated.</div>`;

    const sortedBooths = [...booths].sort((a, b) => a.boothNumber - b.boothNumber);

    sortedBooths.forEach((b) => {
      if (!b.classes || b.classes.length === 0) return;
      const assignments = plan.boothAssignments[b.boothNumber] || { general: null, reps: [], assocs: [] };

      const boothGeneralPosts = (assignments.generalParts && assignments.generalParts.length > 1)
        ? assignments.generalParts.map(gp => ({ name: gp.title || `General Union Posts - Part ${gp.partNumber}`, count: gp.count }))
        : (assignments.general ? [{ name: assignments.general.title || 'General Union Posts', count: assignments.general.count }] : []);
      const boothRepPosts = assignments.reps.map(r => ({ name: r.post, count: r.count }));
      const boothAssocPosts = assignments.assocs.map(a => ({ name: a.post, count: a.count }));
      const allBoothPosts = [...boothGeneralPosts, ...boothRepPosts, ...boothAssocPosts];

      html += `
      <div class="page-break">
        <div class="account-page">
          <div>
            <div class="header">
              ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:50px;max-width:130px;margin:0 auto 6px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
              <div class="college-name">${esc(collegeName)}</div>
              <div class="title">College Union Election ${esc(electionYear)} — Ballots &amp; Books Account</div>
            </div>
            
            <div style="font-size: 16px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; background: #f9f9f9; padding: 10px; border: 1px solid #ddd;">
              <div><strong>BOOTH NUMBER:</strong> <span style="font-size: 22px; font-weight: bold; margin-left: 10px;">${b.boothNumber}</span></div>
              <div style="text-align: right;"><strong>LOCATION:</strong> ${esc(b.roomName || 'UNSPECIFIED')}</div>
            </div>

          <div style="flex: 1; display: flex; flex-direction: column; margin-top: 10px; margin-bottom: 20px;">
            <table class="stats-table" style="flex: 1; font-size: 13px;">
              <thead>
                <tr>
                  <th style="width:22%; font-size:12px;">Ballot Category</th>
                  <th style="width:18%; font-size:12px;">Serial Range</th>
                  <th style="width:10%; text-align:center; font-size:12px;">Total Qty</th>
                  <th style="width:16%; font-size:12px;">Book IDs</th>
                  <th style="width:11%; text-align:center; font-size:12px;">No. Used</th>
                  <th style="width:11%; text-align:center; font-size:12px;">No. Returned</th>
                  <th style="font-size:12px;">Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${(assignments.generalParts && assignments.generalParts.length > 1) ? assignments.generalParts.map(gp => `
                  <tr style="font-weight:bold;">
                    <td style="font-size:13px;">${esc(gp.title || 'General Union Posts')}</td>
                    <td style="font-size:13px;">${gp.prefix === 'G' ? 'G' : gp.prefix + '-'}${gp.start} - ${gp.prefix === 'G' ? 'G' : gp.prefix + '-'}${gp.end}</td>
                    <td style="text-align:center; font-size:14px;">${gp.count}</td>
                    <td style="font-size:11px;">${esc(gp.bookIds || '-')}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join('') : (assignments.general ? `
                  <tr style="font-weight:bold;">
                    <td style="font-size:13px;">${esc(assignments.general.title || 'General Union Posts')}</td>
                    <td style="font-size:13px;">${assignments.general.prefix && assignments.general.prefix !== 'G' ? assignments.general.prefix + '-' : 'G'}${assignments.general.start} - ${assignments.general.prefix && assignments.general.prefix !== 'G' ? assignments.general.prefix + '-' : 'G'}${assignments.general.end}</td>
                    <td style="text-align:center; font-size:14px;">${assignments.general.count}</td>
                    <td style="font-size:11px;">${esc(assignments.general.bookIds || '-')}</td>
                    <td></td><td></td><td></td>
                  </tr>
                ` : '')}
                ${assignments.reps.map(r => `
                  <tr>
                    <td style="font-size:13px; font-weight:bold;">${esc(r.post)}</td>
                    <td style="font-size:13px;">R${r.start} - R${r.end}</td>
                    <td style="text-align:center; font-size:14px;">${r.count}</td>
                    <td style="font-size:11px;">${esc(r.bookIds || '-')}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join('')}
                ${assignments.assocs.map(a => `
                  <tr>
                    <td style="font-size:13px; font-weight:bold;">${esc(a.post)}</td>
                    <td style="font-size:13px;">A${a.start} - A${a.end}</td>
                    <td style="text-align:center; font-size:14px;">${a.count}</td>
                    <td style="font-size:11px;">${esc(a.bookIds || '-')}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div style="margin-top: 15px; font-size: 12px; color: #555; background: #fffde7; padding: 10px; border: 1px dashed #fbc02d;">
              <strong>Note:</strong> Total Qty should be equal to (Number of Ballots Used + Number of Ballots Returned). Please record any discrepancies in the Remarks column.
            </div>
          </div>

          <div style="flex: 1.2; display: flex; flex-direction: column; margin-bottom: 10px;">
            <h4 style="margin: 0 0 8px 0; font-size: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 2px;">3. Account of Votes (To be filled by PO)</h4>
            <table class="stats-table" style="flex: 1; font-size: 13px;">
              <thead>
                <tr>
                  <th style="width:35%; font-size:12px;">Name of Post</th>
                  <th style="width:15%; text-align:center; font-size:12px;">Total Voters Assigned</th>
                  <th style="width:20%; text-align:center; font-size:12px;">No. of Votes Recorded</th>
                  <th style="width:30%; font-size:12px;">Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${allBoothPosts.map(p => `
                  <tr>
                    <td style="font-size: 13px; font-weight: bold;">${esc(p.name)}</td>
                    <td style="text-align:center; font-weight:bold; font-size:14px;">${p.count}</td>
                    <td></td>
                    <td></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          </div>

          <div class="footer">
            <div class="sig-line">Presiding Officer</div>
          </div>
        </div>
      </div>`;
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
