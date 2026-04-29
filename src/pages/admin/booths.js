/**
 * pages/admin/booths.js
 * Admin page to manage Polling Booths and allot students (class-wise).
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

export async function renderAdminBooths(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'booths', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading booth data...</p></div>
  `);

  try {
    const [nominalRoll, booths] = await Promise.all([
      api.getNominalRoll(),
      api.adminGetBooths(pwd).catch(() => [])
    ]);
    renderBoothsUI(container.querySelector('#adminMain'), pwd, nominalRoll, booths);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderBoothsUI(main, pwd, nominalRoll, initialBooths) {
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
  let booths = initialBooths.length ? [...initialBooths] : [{ boothNumber: 1, roomName: 'Room 1', classes: [] }];

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
            <button id="btnAutoAllot" class="btn btn-secondary">⚡ Auto Allot</button>
            <button id="btnSaveBooths" class="btn btn-primary">💾 Save Configuration</button>
          </div>
        </div>

        <!-- Booth Configuration -->
        <div class="glass rounded-xl p-5">
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
                <input type="text" class="field text-sm py-1 mb-2 room-name-input" data-idx="${i}" placeholder="Room Name / Number" value="${esc(b.roomName)}">
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
    main.querySelector('#btnUpdateBoothCount').addEventListener('click', () => {
      const num = parseInt(main.querySelector('#numBoothsInput').value, 10);
      if (num > 0 && num <= 50) {
        if (num > booths.length) {
          for (let i = booths.length; i < num; i++) booths.push({ boothNumber: i + 1, roomName: `Room ${i + 1}`, classes: [] });
        } else if (num < booths.length) {
          // Remove extra booths, move their classes to unassigned
          booths = booths.slice(0, num);
          // Any class that was in a removed booth is now simply not in any booth's classes array.
        }
        refreshUI();
      }
    });

    main.querySelectorAll('.room-name-input').forEach(input => {
      input.addEventListener('change', (e) => {
        booths[e.target.dataset.idx].roomName = e.target.value.trim();
      });
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
        // Sort classes within dept by size descending
        const sortedClasses = [...dept.classes].sort((a, b) => b.count - a.count);
        sortedClasses.forEach(cls => {
          // Find emptiest booth for each class
          booths.sort((a, b) => a.totalStudents - b.totalStudents);
          booths[0].classes.push(cls.name);
          booths[0].totalStudents += cls.count;
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
