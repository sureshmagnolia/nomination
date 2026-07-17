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

  const allClasses = [...new Set(nominalRoll.map(s => String(s['CLASS']).trim()))].sort();
  const allDepts = [...new Set(nominalRoll.map(s => String(s['Dept'] || '–').trim()))].sort();

  // ── Upload Panel (injected above the table) ───────────────────────────────
  const uploadPanelHtml = `
    <div id="uploadPanel" class="glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
      <button id="toggleUploadPanel" class="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors">
        <div class="flex items-center gap-3">
          <span class="text-2xl">📤</span>
          <div class="text-left">
            <div class="text-white font-bold text-sm">Upload New Nominal Roll</div>
            <div class="text-slate-400 text-xs">Replace entire roll from CSV — resets all nominations & results</div>
          </div>
        </div>
        <span id="uploadChevron" class="text-slate-400 text-lg transition-transform duration-200">▼</span>
      </button>

      <div id="uploadPanelBody" class="hidden border-t border-white/10">
        <div class="p-6 space-y-6">

          <!-- Step 1: Download Template -->
          <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
            <div>
              <div class="text-white font-bold text-sm mb-1">📥 Step 1 — Download the CSV Template</div>
              <div class="text-slate-400 text-xs">The template contains both Format 1 (Class) and Format 2 (Year/Stream) examples.<br><strong>CRITICAL:</strong> Keep ONLY the header row of the format you want to use. Delete ALL other sample rows and titles before saving.</div>
            </div>
            <button id="btnDownloadTemplate" class="btn btn-secondary shrink-0">
              <span id="templateBtnText">⬇️ Download Template</span>
            </button>
          </div>

          <!-- Step 2: Pick CSV File -->
          <div>
            <div class="text-white font-bold text-sm mb-3">📂 Step 2 — Select Your CSV File</div>
            <label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-indigo-400/50 hover:bg-indigo-500/5 transition-all group">
              <div class="text-center">
                <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">📁</div>
                <div class="text-slate-400 text-sm" id="filePickerLabel">Click to select a .csv file</div>
              </div>
              <input type="file" id="csvFileInput" accept=".csv" class="hidden">
            </label>
          </div>

          <!-- Preview (hidden until file selected) -->
          <div id="csvPreview" class="hidden space-y-4">
            <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm">
              <div class="text-emerald-300 font-bold mb-2">✅ File Parsed Successfully</div>
              <div id="csvSummary" class="text-slate-300 space-y-1 text-xs"></div>
            </div>

            <!-- Danger Warning -->
            <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div class="text-red-300 font-bold text-sm mb-2">⚠️ DESTRUCTIVE OPERATION — Read Before Proceeding</div>
              <ul class="text-red-200/80 text-xs space-y-1 list-disc list-inside">
                <li>The entire current Nominal Roll will be <strong>permanently replaced</strong></li>
                <li>All submitted <strong>Nominations</strong> will be deleted</li>
                <li>The <strong>Valid List</strong> and <strong>Final List</strong> will be cleared</li>
                <li>All <strong>Results</strong> and <strong>Ballot Plans</strong> will be wiped</li>
                <li>Election flags (finalized, published) will be <strong>reset to false</strong></li>
              </ul>
            </div>

            <!-- Confirmation -->
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Type <span class="text-red-400 font-mono">RESET</span> to confirm
                </label>
                <input type="text" id="confirmResetText" class="field font-mono tracking-widest uppercase" placeholder="RESET" autocomplete="off">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Re-enter Admin Password</label>
                <input type="password" id="confirmPwd" class="field" placeholder="Admin password" autocomplete="current-password">
              </div>
              <button id="btnUploadRoll" class="btn w-full py-3 text-sm font-bold opacity-50 cursor-not-allowed" disabled
                style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; border: none;">
                🚨 Upload & Reset Entire System
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;


  const refreshTable = () => {
    const filtered = students.filter(s => 
      [s['NAME'], s['CLASS'], s['ADMISION NO'], s['Nominal Roll Serial Number']].some(v => 
        String(v || '').toLowerCase().includes(filterText.toLowerCase())
      )
    );

    main.innerHTML = `
      <div class="page-enter space-y-6">
        ${uploadPanelHtml}
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-bold text-white">Nominal Roll Management</h3>
            <p class="text-slate-400 text-sm">Manage student data and finalize the official voter list.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            ${!isFinal ? `<button id="btnAddNew" class="btn btn-success">➕ Add Student</button>` : ''}
            <button id="btnPrintRoll" class="btn btn-secondary">🖨️ Print Roll</button>
            ${!isFinal ? `<button id="btnFinalize" class="btn btn-primary">🔒 Finalize & Lock Roll</button>` : ''}
            ${isFinal ? `<span class="badge badge-valid py-2 px-4">✅ ROLL FINALIZED</span>` : ''}
          </div>
        </div>

        <div class="glass rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center w-full shadow-lg mb-2">
          <div class="relative flex-1 w-full">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text" id="searchInput" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors" placeholder="Search by student name, class, admission no, or serial..." value="${esc(filterText)}">
          </div>
          <div class="text-slate-400 text-sm md:w-auto w-full text-right shrink-0">
            Showing <strong class="text-white">${filtered.length}</strong> / ${students.length} students
          </div>
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
                        <button class="text-indigo-400 hover:text-indigo-300 edit-student mr-3" data-serial="${esc(s['Nominal Roll Serial Number'])}" data-name="${esc(s['NAME'])}" data-class="${esc(s['CLASS'])}" data-adm="${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '')}" data-dept="${esc(s['Dept'] || '')}">Edit</button>
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

      <!-- Add / Edit Student Modal -->
      <div id="addModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10">
          <h4 id="modalTitle" class="text-xl font-bold text-white mb-4">Add New Student</h4>
          <div class="space-y-4">
            <input type="hidden" id="editOldSerial" value="">
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Serial Number (Draft)</label>
              <input type="text" id="addSerial" class="field" placeholder="e.g. 1001 or 1001a">
              <p class="text-[10px] text-slate-500 mt-1">Use suffixes like 'a' to insert between numbers.</p>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
              <input type="text" id="addName" class="field" placeholder="Student Name">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Class Name</label>
              <select id="addClass" class="field">
                <option value="">-- Select Class --</option>
                ${allClasses.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Admission No</label>
              <input type="text" id="addAdm" class="field" placeholder="Adm No">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Department</label>
              <select id="addDept" class="field">
                <option value="">-- Select Department --</option>
                ${allDepts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="flex gap-2 mt-8">
            <button id="btnCancelAdd" class="btn btn-secondary flex-1">Cancel</button>
            <button id="btnConfirmAdd" class="btn btn-primary flex-1">Save Student</button>
          </div>
        </div>
      </div>
    `;

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
      const openModal = (isEdit, data = {}) => {
        main.querySelector('#modalTitle').textContent = isEdit ? 'Edit Student' : 'Add New Student';
        main.querySelector('#editOldSerial').value = isEdit ? data.serial : '';
        main.querySelector('#addSerial').value = data.serial || '';
        main.querySelector('#addName').value = data.name || '';
        main.querySelector('#addClass').value = data.class || '';
        main.querySelector('#addAdm').value = data.adm || '';
        main.querySelector('#addDept').value = data.dept || '';
        main.querySelector('#addModal').classList.remove('hidden');
      };

      main.querySelector('#btnAddNew').onclick = () => openModal(false);
      main.querySelector('#btnCancelAdd').onclick = () => main.querySelector('#addModal').classList.add('hidden');
      main.querySelector('#btnConfirmAdd').onclick = async (e) => {
        const payload = {
          old_serial: main.querySelector('#editOldSerial').value,
          serial_number: main.querySelector('#addSerial').value,
          name: main.querySelector('#addName').value,
          class: main.querySelector('#addClass').value,
          admission_no: main.querySelector('#addAdm').value,
          dept: main.querySelector('#addDept').value
        };
        if (!payload.serial_number || !payload.name || !payload.class) return showToast('Please fill required fields.', 'warning');
        
        setLoading(e.target, true, 'Save Student');
        try {
          if (payload.old_serial) {
            await api.adminUpdateStudent(pwd, payload);
            showToast('Student updated.', 'success');
          } else {
            await api.adminAddStudent(pwd, payload);
            showToast('Student added.', 'success');
          }
          main.querySelector('#addModal').classList.add('hidden');
          renderAdminNominalRoll(main.closest('#appContainer') || main.parentElement);
        } catch (err) {
          showToast(err.message, 'error');
          setLoading(e.target, false, 'Save Student');
        }
      };

      main.querySelectorAll('.edit-student').forEach(btn => {
        btn.onclick = () => {
          openModal(true, {
            serial: btn.dataset.serial,
            name: btn.dataset.name,
            class: btn.dataset.class,
            adm: btn.dataset.adm,
            dept: btn.dataset.dept
          });
        };
      });

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
    main.querySelector('#btnPrintRoll').onclick = () => triggerRollPrint(students, isFinal, settings.collegeName);

    // ── Upload Panel Handlers ────────────────────────────────────────────────

    // Toggle collapse
    main.querySelector('#toggleUploadPanel').onclick = () => {
      const body = main.querySelector('#uploadPanelBody');
      const chevron = main.querySelector('#uploadChevron');
      body.classList.toggle('hidden');
      chevron.style.transform = body.classList.contains('hidden') ? '' : 'rotate(180deg)';
    };

    // Download Template
    main.querySelector('#btnDownloadTemplate').onclick = async (e) => {
      const btn = e.currentTarget;
      setLoading(btn, true, 'Downloading...');
      try {
        const data = await api.adminGetNominalRollTemplate(pwd);
        // Build CSV string
        const csvRows = [data.headers.join(',')];
        data.rows.forEach(row => {
          csvRows.push(row.map(cell => {
            const s = String(cell ?? '');
            return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          }).join(','));
        });
        const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'NominalRoll_Template.csv'; a.click();
        URL.revokeObjectURL(url);
        showToast('Template downloaded!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(btn, false, '⬇️ Download Template');
      }
    };

    // CSV File Parsing
    let parsedRows = null;
    let usedHeaders = [];
    const legacyHeaders = ['Nominal Roll Serial Number', 'NAME', 'CLASS', 'ADMISION NO', 'Dept'];
    const explicitHeaders = ['Nominal Roll Serial Number', 'NAME', 'YEAR', 'STREAM', 'ADMISION NO', 'Dept'];

    main.querySelector('#csvFileInput').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      main.querySelector('#filePickerLabel').textContent = `📄 ${file.name}`;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          showToast('CSV file appears empty.', 'error'); return;
        }

        // Find the header row dynamically (in case they left the "FORMAT 1:" title above it)
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(lines.length, 20); i++) {
          const cols = lines[i].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          if (legacyHeaders.every(h => cols.includes(h))) {
            headerRowIndex = i;
            usedHeaders = legacyHeaders;
            break;
          }
          if (explicitHeaders.every(h => cols.includes(h))) {
            headerRowIndex = i;
            usedHeaders = explicitHeaders;
            break;
          }
        }

        if (headerRowIndex === -1) {
          showToast('Missing required columns. Please use one of the standard templates.', 'error');
          main.querySelector('#csvPreview').classList.add('hidden');
          return;
        }

        const headers = lines[headerRowIndex].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const idxMap = usedHeaders.map(h => headers.indexOf(h));
        
        parsedRows = lines.slice(headerRowIndex + 1).map(line => {
          // Simple CSV parse (handles quoted commas)
          const cells = [];
          let cur = '', inQ = false;
          for (const ch of line + ',') {
            if (ch === '"') { inQ = !inQ; }
            else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
            else cur += ch;
          }
          return idxMap.map(i => cells[i] ?? '');
        }).filter(r => r[1] && r[1].trim() !== '' && r[1] !== 'NAME'); // filter blank rows and accidental header dupes

        // Summary
        const nameIdx = usedHeaders.indexOf('NAME');
        const deptIdx = usedHeaders.indexOf('Dept');
        
        let classes = [];
        if (usedHeaders === legacyHeaders) {
          classes = [...new Set(parsedRows.map(r => r[usedHeaders.indexOf('CLASS')]))].sort();
        } else {
          classes = [...new Set(parsedRows.map(r => `${r[usedHeaders.indexOf('YEAR')]} ${r[usedHeaders.indexOf('STREAM')]} ${r[deptIdx]}`.trim()))].sort();
        }
        const depts = [...new Set(parsedRows.map(r => r[deptIdx]))].sort();

        main.querySelector('#csvSummary').innerHTML = `
          <div>👥 <strong class="text-white">${parsedRows.length}</strong> students detected using <strong>${usedHeaders === legacyHeaders ? 'Legacy Format' : 'Explicit Format'}</strong></div>
          <div>🏛️ <strong class="text-white">${depts.length}</strong> departments: ${depts.map(d => `<span class="text-indigo-300">${esc(d)}</span>`).join(', ')}</div>
          <div>📚 <strong class="text-white">${classes.length}</strong> unique classes found</div>
        `;
        main.querySelector('#csvPreview').classList.remove('hidden');
        checkUploadReady();
      };
      reader.readAsText(file);
    };

    // Enable/disable upload button based on RESET text + password
    const checkUploadReady = () => {
      const resetOk = main.querySelector('#confirmResetText')?.value.trim().toUpperCase() === 'RESET';
      const pwdOk = (main.querySelector('#confirmPwd')?.value.trim() || '') !== '';
      const btn = main.querySelector('#btnUploadRoll');
      if (!btn) return;
      const ready = resetOk && pwdOk && parsedRows && parsedRows.length > 0;
      btn.disabled = !ready;
      btn.classList.toggle('opacity-50', !ready);
      btn.classList.toggle('cursor-not-allowed', !ready);
    };

    main.querySelector('#confirmResetText').addEventListener('input', checkUploadReady);
    main.querySelector('#confirmPwd').addEventListener('input', checkUploadReady);

    // Upload action
    main.querySelector('#btnUploadRoll').onclick = async (e) => {
      const confirmPwd = main.querySelector('#confirmPwd').value.trim();
      if (!parsedRows || parsedRows.length === 0) return showToast('No data to upload.', 'error');
      if (!confirm(`FINAL CONFIRMATION\n\nYou are about to replace the Nominal Roll with ${parsedRows.length} students.\nAll nominations, results, and election data will be permanently deleted.\n\nThis CANNOT be undone. Proceed?`)) return;

      setLoading(e.target, true, 'Uploading & Resetting...');
      try {
        const res = await api.adminUploadNominalRoll(confirmPwd, { headers: usedHeaders, rows: parsedRows });
        showToast(`✅ Nominal Roll updated with ${res.count || parsedRows.length} students. All election data has been reset.`, 'success');
        // Reload the whole page to reflect fresh data
        const appContainer = main.closest('#appContainer') || main.parentElement;
        renderAdminNominalRoll(appContainer);
      } catch (err) {
        showToast(err.message, 'error');
        setLoading(e.target, false, '🚨 Upload & Reset Entire System');
      }
    };

  }; // end refreshTable

  refreshTable();
}


function triggerRollPrint(students, isFinal, collegeName) {
  const getClassWeight = (className) => {
    const cls = String(className).toUpperCase();
    if (cls.includes('PH D') || cls.includes('PHD')) return 3000;
    
    let typeWeight = 4000;
    if (cls.match(/\b(BA|BSC|BCOM|BBA|BCA)\b/)) typeWeight = 1000;
    else if (cls.match(/\b(MA|MSC|MCOM|MBA|MCA)\b/)) typeWeight = 2000;

    let yearWeight = 900;
    if (cls.includes('1ST YEAR') || cls.match(/\bI\b/)) yearWeight = 100;
    else if (cls.includes('2ND YEAR') || cls.match(/\bII\b/)) yearWeight = 200;
    else if (cls.includes('3RD YEAR') || cls.match(/\bIII\b/)) yearWeight = 300;

    return typeWeight + yearWeight;
  };

  // Sort primarily by Dept, then Class (custom), then Name
  const data = [...students].sort((a, b) => {
    const dA = String(a['Dept'] || '').toUpperCase();
    const dB = String(b['Dept'] || '').toUpperCase();
    if (dA !== dB) return dA.localeCompare(dB);

    const cA = String(a['CLASS']).toUpperCase();
    const cB = String(b['CLASS']).toUpperCase();
    if (cA !== cB) {
      const wA = getClassWeight(cA);
      const wB = getClassWeight(cB);
      if (wA !== wB) return wA - wB;
      return cA.localeCompare(cB);
    }
    
    return String(a['NAME']).toUpperCase().localeCompare(String(b['NAME']).toUpperCase());
  });

  // Group by Class
  const classes = {};
  data.forEach(s => {
    const cls = String(s['CLASS']).toUpperCase() || 'UNKNOWN CLASS';
    if (!classes[cls]) classes[cls] = [];
    classes[cls].push(s);
  });

  const fallbackCollege = CONFIG.COLLEGE_NAME || 'GOVERNMENT VICTORIA COLLEGE, PALAKKAD';
  const cName = collegeName || fallbackCollege;
  const watermark = isFinal ? 'FINAL NOMINAL ROLL' : 'DRAFT NOMINAL ROLL';
  const timestamp = new Date().toLocaleString();

  let htmlContent = '';
  
  // Render each class as a separate page
  Object.keys(classes).forEach(cls => {
    const studentsInClass = classes[cls];
    // Attempt to extract Department (assume they share the same department in the class)
    const dept = esc(studentsInClass[0]['Dept'] || 'UNKNOWN DEPARTMENT');

    const len = studentsInClass.length;
    let squishClass = '';
    // A4 usually fits ~35 students on page 1, and ~40 on subsequent pages.
    // If the overflow onto the last page is 6 students or fewer, applying tighter padding pulls them into the previous page.
    const spill = len <= 35 ? 0 : ((len - 35) % 40);
    if (spill > 0 && spill <= 6) squishClass = 'squish';

    htmlContent += `
      <div class="page-break">
        <div class="watermark">${watermark}</div>
        <table class="${squishClass}">
          <thead>
            <tr>
              <th colspan="3" class="table-header">
                <div class="college">${esc(cName)}</div>
                <div class="title">Department of ${dept}</div>
                <div class="title" style="margin-top: 5px;">${esc(cls)} — ${watermark}</div>
                <div class="meta">
                  <div>Printed on: ${timestamp}</div>
                  <div>Students in Class: ${studentsInClass.length}</div>
                </div>
              </th>
            </tr>
            <tr>
              <th class="sl">Sl. No</th>
              <th class="adm">Adm. No</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            ${studentsInClass.map(s => `
              <tr>
                <td class="sl">${esc(s['Nominal Roll Serial Number'])}</td>
                <td class="adm">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                <td>${esc(s['NAME'])}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="table-footer">
                <div class="footer-content">Returning Officer</div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  });

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
            font-size: 80px; color: #f1f5f9; font-weight: bold; pointer-events: none; z-index: -1;
            white-space: nowrap; text-transform: uppercase;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          .page-break { page-break-after: always; position: relative; }
          .page-break:last-child { page-break-after: auto; }
          
          .table-header { background: transparent; border: none; text-align: center; padding: 0 0 10px 0; }
          .table-header .college { font-size: 18px; font-weight: bold; text-transform: uppercase; color: #000; }
          .table-header .title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-top: 2px; color: #000; }
          .table-header .meta { display: flex; justify-content: space-between; font-size: 10px; margin-top: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; color: #000; font-weight: normal; text-transform: none; }
          
          .table-footer { border: none; padding: 40px 40px 0 0; }
          .footer-content { text-align: right; font-weight: bold; font-size: 11px; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; }
          th { background: #eee; font-weight: bold; text-transform: uppercase; font-size: 10px; }
          .sl { width: 50px; text-align: center; }
          .adm { width: 65px; font-family: monospace; }

          .squish th, .squish td { padding: 1px 4px !important; }
          .squish table { margin-bottom: 5px !important; }
          .squish .table-header { padding: 0 0 2px 0 !important; }
          .squish .table-footer { padding: 10px 40px 0 0 !important; }

          .no-print { display: none; }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>window.print();</script>
      </body>
    </html>
  `);
  printWin.document.close();
}
