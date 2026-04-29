/**
 * pages/admin/nominalRoll.js
 * Admin Nominal Roll management (CRUD + Finalize + Print with watermarks).
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';
import { CONFIG } from '../../config.js';

export async function renderAdminNominalRoll(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'nominalRoll', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominal roll...</p></div>
  `);

  try {
    const [nominalRoll, settings] = await Promise.all([
      api.getNominalRoll(),
      api.getSettings()
    ]);
    renderNominalRollUI(container.querySelector('#adminMain'), pwd, nominalRoll, settings);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderNominalRollUI(main, pwd, nominalRoll, settings) {
  const isFinal = settings.nominalRollFinalized === 'true';
  let students = [...nominalRoll];
  let filterText = '';

  const refreshTable = () => {
    const filtered = students.filter(s => 
      [s['NAME'], s['CLASS'], s['ADMISION NO'], s['Nominal Roll Serial Number']].some(v => 
        String(v || '').toLowerCase().includes(filterText.toLowerCase())
      )
    );

    main.innerHTML = `
      <div class="page-enter space-y-6">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-bold text-white">Nominal Roll Management</h3>
            <p class="text-slate-400 text-sm">Manage student data and finalize the official voter list.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            ${!isFinal ? `<button id="btnAddNew" class="btn btn-success">➕ Add Student</button>` : ''}
            <div class="dropdown relative inline-block">
              <button class="btn btn-secondary dropdown-toggle">🖨️ Print Roll ▼</button>
              <div class="dropdown-menu absolute right-0 mt-2 w-48 glass rounded-lg shadow-xl hidden z-50 overflow-hidden border border-white/10">
                <button class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10" id="btnPrintSerial">Sorted by Serial No</button>
                <button class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10" id="btnPrintClass">Sorted by Class</button>
              </div>
            </div>
            ${!isFinal ? `<button id="btnFinalize" class="btn btn-primary">🔒 Finalize & Lock Roll</button>` : ''}
            ${isFinal ? `<span class="badge badge-valid py-2 px-4">✅ ROLL FINALIZED</span>` : ''}
          </div>
        </div>

        <div class="glass rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center">
          <div class="relative flex-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text" id="searchInput" class="field pl-10" placeholder="Search by name, class, adm. no, or serial..." value="${esc(filterText)}">
          </div>
          <div class="text-slate-400 text-sm">Showing <strong>${filtered.length}</strong> of ${students.length} students</div>
        </div>

        <div class="glass rounded-xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr>
                <th>Sl. No</th>
                <th>Admission No</th>
                <th>Name</th>
                <th>Class</th>
                <th>Department</th>
                ${!isFinal ? '<th>Actions</th>' : ''}
              </tr></thead>
              <tbody>
                ${filtered.length ? filtered.map(s => `
                  <tr>
                    <td class="font-bold text-indigo-400">${esc(s['Nominal Roll Serial Number'])}</td>
                    <td class="font-mono text-xs">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                    <td class="text-white font-medium">${esc(s['NAME'])}</td>
                    <td class="text-slate-300 text-sm">${esc(s['CLASS'])}</td>
                    <td class="text-slate-400 text-xs">${esc(s['Dept'] || '–')}</td>
                    ${!isFinal ? `
                      <td>
                        <button class="text-rose-400 hover:text-rose-300 delete-student" data-serial="${s['Nominal Roll Serial Number']}">Delete</button>
                      </td>
                    ` : ''}
                  </tr>
                `).join('') : '<tr><td colspan="6" class="text-center py-10 text-slate-500">No students found matching your search.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Add Student Modal (Placeholder logic) -->
      <div id="addModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10">
          <h4 class="text-xl font-bold text-white mb-4">Add New Student</h4>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Serial Number (Draft)</label>
              <input type="number" id="addSerial" class="field" placeholder="e.g. 1001">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
              <input type="text" id="addName" class="field" placeholder="Student Name">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Class Name</label>
              <input type="text" id="addClass" class="field" placeholder="e.g. 1ST YEAR BA HISTORY">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Admission No</label>
              <input type="text" id="addAdm" class="field" placeholder="Adm No">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Department</label>
              <input type="text" id="addDept" class="field" placeholder="e.g. History">
            </div>
          </div>
          <div class="flex gap-2 mt-8">
            <button id="btnCancelAdd" class="btn btn-secondary flex-1">Cancel</button>
            <button id="btnConfirmAdd" class="btn btn-primary flex-1">Save Student</button>
          </div>
        </div>
      </div>
    `;

    // Dropdown toggle
    const dropBtn = main.querySelector('.dropdown-toggle');
    const dropMenu = main.querySelector('.dropdown-menu');
    if (dropBtn) {
      dropBtn.onclick = (e) => {
        e.stopPropagation();
        dropMenu.classList.toggle('hidden');
      };
    }
    window.onclick = () => dropMenu?.classList.add('hidden');

    // Search
    main.querySelector('#searchInput').oninput = (e) => {
      filterText = e.target.value;
      refreshTable();
      main.querySelector('#searchInput').focus();
      // Move cursor to end
      const val = main.querySelector('#searchInput').value;
      main.querySelector('#searchInput').value = '';
      main.querySelector('#searchInput').value = val;
    };

    // Actions
    if (!isFinal) {
      main.querySelector('#btnAddNew').onclick = () => main.querySelector('#addModal').classList.remove('hidden');
      main.querySelector('#btnCancelAdd').onclick = () => main.querySelector('#addModal').classList.add('hidden');
      main.querySelector('#btnConfirmAdd').onclick = async (e) => {
        const payload = {
          serial: main.querySelector('#addSerial').value,
          name: main.querySelector('#addName').value,
          class: main.querySelector('#addClass').value,
          admission: main.querySelector('#addAdm').value,
          dept: main.querySelector('#addDept').value
        };
        if (!payload.serial || !payload.name || !payload.class) return showToast('Please fill required fields.', 'warning');
        
        setLoading(e.target, true, 'Save Student');
        try {
          await api.adminAddStudent(pwd, payload);
          showToast('Student added to roll.', 'success');
          // Reload page
          renderAdminNominalRoll(main.closest('#appContainer') || main.parentElement);
        } catch (err) {
          showToast(err.message, 'error');
          setLoading(e.target, false, 'Save Student');
        }
      };

      main.querySelectorAll('.delete-student').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm(`Delete student #${btn.dataset.serial}?`)) return;
          try {
            await api.adminDeleteStudent(pwd, btn.dataset.serial);
            showToast('Student removed.', 'success');
            renderAdminNominalRoll(main.closest('#appContainer') || main.parentElement);
          } catch (err) { showToast(err.message, 'error'); }
        };
      });

      main.querySelector('#btnFinalize').onclick = async (e) => {
        if (!confirm('FINALIZATION WARNING:\n\n1. All students will be sorted by Class and Name.\n2. NEW Serial Numbers will be generated sequentially (1, 2, 3...).\n3. The roll will be LOCKED for all future edits.\n\nAre you absolutely sure?')) return;
        setLoading(e.target, true, 'Finalizing...');
        try {
          await api.adminFinalizeRoll(pwd);
          showToast('Nominal Roll Finalized Successfully!', 'success');
          renderAdminNominalRoll(main.closest('#appContainer') || main.parentElement);
        } catch (err) {
          showToast(err.message, 'error');
          setLoading(e.target, false, 'Finalize & Lock Roll');
        }
      };
    }

    // Printing
    main.querySelector('#btnPrintSerial').onclick = () => triggerRollPrint(students, isFinal, 'serial');
    main.querySelector('#btnPrintClass').onclick = () => triggerRollPrint(students, isFinal, 'class');
  };

  refreshTable();
}

function triggerRollPrint(students, isFinal, sortBy) {
  const data = [...students];
  if (sortBy === 'class') {
    data.sort((a, b) => {
      const cA = String(a['CLASS']).toUpperCase();
      const cB = String(b['CLASS']).toUpperCase();
      if (cA !== cB) return cA.localeCompare(cB);
      return String(a['NAME']).toUpperCase().localeCompare(String(b['NAME']).toUpperCase());
    });
  } else {
    data.sort((a, b) => Number(a['Nominal Roll Serial Number']) - Number(b['Nominal Roll Serial Number']));
  }

  const collegeName = CONFIG.COLLEGE_NAME || 'GOVERNMENT VICTORIA COLLEGE, PALAKKAD';
  const watermark = isFinal ? 'FINAL NOMINAL ROLL' : 'DRAFT NOMINAL ROLL';
  const timestamp = new Date().toLocaleString();

  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <html>
      <head>
        <title>${watermark}</title>
        <style>
          @page { margin: 15mm; }
          body { font-family: sans-serif; color: #000; line-height: 1.4; font-size: 11px; margin: 0; padding: 0; }
          .watermark { 
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px; color: rgba(0,0,0,0.05); font-weight: bold; pointer-events: none; z-index: -1;
            white-space: nowrap; text-transform: uppercase;
          }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .college { font-size: 18px; font-weight: bold; }
          .title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-top: 5px; }
          .meta { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 10px; }
          
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 5px 8px; text-align: left; }
          th { background: #eee; font-weight: bold; text-transform: uppercase; font-size: 10px; }
          .sl { width: 40px; text-align: center; font-weight: bold; }
          .adm { width: 80px; font-family: monospace; }
          .cls { width: 180px; font-size: 9px; }

          .footer { margin-top: 30px; display: flex; justify-content: space-between; font-weight: bold; }
          .no-print { display: none; }
        </style>
      </head>
      <body>
        <div class="watermark">${watermark}</div>
        <div class="header">
          <div class="college">${esc(collegeName)}</div>
          <div class="title">College Union Election — ${watermark}</div>
        </div>
        <div class="meta">
          <div>Sorted by: ${sortBy === 'class' ? 'Class' : 'Serial Number'}</div>
          <div>Printed on: ${timestamp}</div>
          <div>Total Students: ${data.length}</div>
        </div>
        <table>
          <thead><tr>
            <th class="sl">Sl. No</th>
            <th class="adm">Adm. No</th>
            <th>Name</th>
            <th class="cls">Class</th>
          </tr></thead>
          <tbody>
            ${data.map(s => `
              <tr>
                <td class="sl">${esc(s['Nominal Roll Serial Number'])}</td>
                <td class="adm">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                <td style="font-weight:bold">${esc(s['NAME'])}</td>
                <td class="cls">${esc(s['CLASS'])}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <div>Returning Officer</div>
          <div>Principal</div>
        </div>
        <script>window.print();</script>
      </body>
    </html>
  `);
  printWin.document.close();
}
