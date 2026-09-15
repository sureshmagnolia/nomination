/**
 * pages/nominalRoll.js
 * Public view of the Nominal Roll (Unpublished, Draft, or Final).
 */
import { api } from '../api.js';
import { esc, showToast } from '../utils.js';
import { CONFIG } from '../config.js';

export async function renderNominalRoll(container) {
  container.innerHTML = `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominal roll...</p></div>
  `;

  try {
    const [nominalRoll, settings] = await Promise.all([
      api.getNominalRoll().catch(() => []),
      api.getSettings().catch(() => ({}))
    ]);
    renderPublicRollUI(container, nominalRoll, settings);
  } catch (e) {
    container.innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderPublicRollUI(container, nominalRoll, settings) {
  const isFinal = settings.nominalRollFinalized === 'true' || settings.isRollFinalized === 'true';
  const isDraft = !isFinal && settings.draftRollPublished === 'true';
  const isPublished = isFinal || isDraft;
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;

  // 1. If not published at all, show friendly Unpublished screen
  if (!isPublished) {
    container.innerHTML = `
      <div class="page-enter min-h-[75vh] flex items-center justify-center p-4">
        <div class="glass rounded-2xl p-10 max-w-md w-full text-center space-y-5 border border-white/10 shadow-2xl">
          <div class="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">⏳</div>
          <h3 class="text-2xl font-bold text-white tracking-tight">Nominal Roll Not Published</h3>
          <p class="text-slate-400 text-sm leading-relaxed">
            The voter list / nominal roll has not yet been published by the election authorities of <strong class="text-slate-300">${esc(collegeName)}</strong>. Please check back later or view the election schedule.
          </p>
          <div class="pt-2">
            <button data-nav="/" class="btn btn-secondary w-full flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  let students = [...nominalRoll];
  let filterText = '';

  const refreshTable = () => {
    const filtered = students.filter(s => 
      [s['NAME'], s['CLASS'], s['ADMISION NO'], s['Nominal Roll Serial Number'], s['Dept']].some(v => 
        String(v || '').toLowerCase().includes(filterText.toLowerCase())
      )
    );

    const formatSerial = (rawSerial) => {
      const num = String(rawSerial || '');
      return isDraft ? `D${num}` : num;
    };

    container.innerHTML = `
      <!-- Correction Request Modal -->
      <div id="correctionModal" class="fixed inset-0 z-50 flex items-center justify-center hidden">
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" id="correctionModalOverlay"></div>
        <div class="relative bg-slate-900 rounded-2xl border border-amber-500/30 shadow-2xl w-full max-w-lg p-6 z-10 space-y-4 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">📝</span>
              <div>
                <h4 class="font-bold text-white text-lg leading-tight">Draft Roll Correction Request</h4>
                <p class="text-xs text-amber-400/90">Submit request for errors or missing details</p>
              </div>
            </div>
            <button id="btnCloseCorrectionModal" class="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
          </div>

          <form id="correctionForm" class="space-y-3.5 text-sm">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Admission Number <span class="text-rose-400">*</span></label>
              <input type="text" id="corrAdmNo" class="field text-sm" placeholder="e.g. 260556" required>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Student Full Name <span class="text-rose-400">*</span></label>
              <input type="text" id="corrName" class="field text-sm" placeholder="Full name as in college records" required>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Class</label>
                <input type="text" id="corrClass" class="field text-sm" placeholder="e.g. 1st Year B.Sc Botany">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                <input type="text" id="corrDept" class="field text-sm" placeholder="e.g. Botany">
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Type of Correction <span class="text-rose-400">*</span></label>
              <select id="corrType" class="field text-sm bg-slate-800">
                <option value="Spelling Error in Name">Spelling Error in Name</option>
                <option value="Incorrect Class / Year">Incorrect Class / Year</option>
                <option value="Incorrect Department">Incorrect Department</option>
                <option value="Wrong Admission Number">Wrong Admission Number</option>
                <option value="Missing Name in Roll">Missing Name from Nominal Roll</option>
                <option value="Other Discrepancy">Other Discrepancy</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Correction Details / Explanation <span class="text-rose-400">*</span></label>
              <textarea id="corrDetails" rows="3" class="field text-sm" placeholder="Describe the mistake and the correct information clearly..." required></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Contact Phone / Email (Optional)</label>
              <input type="text" id="corrContact" class="field text-sm" placeholder="For the Returning Officer to reach you if needed">
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button type="button" id="btnCancelCorrection" class="btn btn-secondary">Cancel</button>
              <button type="submit" id="btnSubmitCorrection" class="btn btn-primary bg-amber-600 hover:bg-amber-500 text-white font-medium">
                Submit Request
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="page-enter space-y-6">
        <!-- Header -->
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <button data-nav="/" class="text-slate-400 hover:text-white mb-2 flex items-center gap-2 text-sm transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              Back to Home
            </button>
            <div class="flex items-center gap-3">
              <h3 class="text-2xl font-bold text-white">Nominal Roll</h3>
              ${isDraft ? 
                `<span class="badge badge-pending text-xs py-1.5 px-3 border border-amber-500/30 text-amber-300">📋 DRAFT LIST (SUBJECT TO CORRECTION)</span>` : 
                `<span class="badge badge-valid text-xs py-1.5 px-3">✅ FINALIZED VOTER LIST</span>`
              }
            </div>
            <p class="text-slate-400 text-sm mt-0.5">${esc(collegeName)} — College Union Election</p>
          </div>
          
          <div class="flex flex-wrap items-center gap-2">
            ${isDraft ? `
              <button id="btnOpenCorrection" class="btn btn-sm btn-primary bg-amber-600 hover:bg-amber-500 text-white font-medium flex items-center gap-1.5 shadow-lg shadow-amber-900/20">
                ✏️ Submit Edit / Correction Request
              </button>
            ` : ''}

            <div class="dropdown relative inline-block">
              <button class="btn btn-secondary btn-sm dropdown-toggle">🖨️ Print Roll ▼</button>
              <div class="dropdown-menu absolute right-0 mt-2 w-48 glass rounded-lg shadow-xl hidden z-50 overflow-hidden border border-white/10">
                <button class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10" id="btnPrintSerial">Sorted by Serial No</button>
                <button class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10" id="btnPrintClass">Sorted by Class</button>
              </div>
            </div>
          </div>
        </div>

        ${isDraft ? `
          <!-- Draft Notice Banner -->
          <div class="glass rounded-xl p-4 border border-amber-500/30 bg-amber-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-amber-200 text-sm shadow-lg">
            <div class="flex items-start gap-3">
              <span class="text-2xl">⚠️</span>
              <div>
                <strong class="text-amber-100 font-semibold block mb-0.5">DRAFT NOMINAL ROLL PUBLISHED</strong>
                Serial numbers shown as <strong>D1, D2, D3...</strong> are provisional and subject to change upon finalization. Students are advised to verify their Name, Class, and Department.
              </div>
            </div>
            <button id="btnOpenCorrectionBanner" class="btn btn-sm btn-secondary border-amber-400/40 text-amber-200 hover:bg-amber-500 hover:text-white shrink-0">
              Request Changes
            </button>
          </div>
        ` : ''}

        <!-- Search Bar -->
        <div class="glass rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center">
          <div class="relative flex-1 w-full">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text" id="searchInput" class="field pl-10 w-full" placeholder="Search by name, class, adm. no, dept, or serial..." value="${esc(filterText)}">
          </div>
          <div class="text-slate-400 text-sm whitespace-nowrap">Showing <strong>${filtered.length}</strong> of ${students.length} students</div>
        </div>

        <!-- Data Table -->
        <div class="glass rounded-xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr>
                <th class="w-24 text-center">${isDraft ? 'Draft Sl. No' : 'Sl. No'}</th>
                <th>Admission No</th>
                <th>Name</th>
                <th>Class</th>
                <th>Department</th>
              </tr></thead>
              <tbody>
                ${filtered.length ? filtered.map(s => `
                  <tr>
                    <td class="text-center font-bold font-mono ${isDraft ? 'text-amber-400' : 'text-indigo-400'}">${esc(formatSerial(s['Nominal Roll Serial Number']))}</td>
                    <td class="font-mono text-xs">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                    <td class="text-white font-medium">${esc(s['NAME'])}</td>
                    <td class="text-slate-300 text-sm">${esc(s['CLASS'])}</td>
                    <td class="text-slate-400 text-xs">${esc(s['Dept'] || '–')}</td>
                  </tr>
                `).join('') : '<tr><td colspan="5" class="text-center py-10 text-slate-500">No students found matching your search.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Dropdown toggle
    const dropBtn = container.querySelector('.dropdown-toggle');
    const dropMenu = container.querySelector('.dropdown-menu');
    if (dropBtn) {
      dropBtn.onclick = (e) => {
        e.stopPropagation();
        dropMenu.classList.toggle('hidden');
      };
    }
    window.onclick = () => dropMenu?.classList.add('hidden');

    // Search
    container.querySelector('#searchInput').oninput = (e) => {
      filterText = e.target.value;
      refreshTable();
      const input = container.querySelector('#searchInput');
      input.focus();
      const val = input.value;
      input.value = '';
      input.value = val;
    };

    // Printing
    container.querySelector('#btnPrintSerial').onclick = () => triggerRollPrint(students, isFinal, isDraft, 'serial', collegeName);
    container.querySelector('#btnPrintClass').onclick = () => triggerRollPrint(students, isFinal, isDraft, 'class', collegeName);

    // Modal Events
    const modal = container.querySelector('#correctionModal');
    const openModal = () => modal?.classList.remove('hidden');
    const closeModal = () => modal?.classList.add('hidden');

    container.querySelector('#btnOpenCorrection')?.addEventListener('click', openModal);
    container.querySelector('#btnOpenCorrectionBanner')?.addEventListener('click', openModal);
    container.querySelector('#btnCloseCorrectionModal')?.addEventListener('click', closeModal);
    container.querySelector('#btnCancelCorrection')?.addEventListener('click', closeModal);
    container.querySelector('#correctionModalOverlay')?.addEventListener('click', closeModal);

    // Submit Correction Form
    const corrForm = container.querySelector('#correctionForm');
    if (corrForm) {
      corrForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = container.querySelector('#btnSubmitCorrection');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        const payload = {
          admissionNo: container.querySelector('#corrAdmNo').value.trim(),
          studentName: container.querySelector('#corrName').value.trim(),
          className: container.querySelector('#corrClass').value.trim(),
          department: container.querySelector('#corrDept').value.trim(),
          correctionType: container.querySelector('#corrType').value,
          details: container.querySelector('#corrDetails').value.trim(),
          contactInfo: container.querySelector('#corrContact').value.trim(),
        };

        try {
          await api.submitRollCorrection(payload);
          closeModal();
          showToast('Your correction request has been submitted successfully to the Returning Officer.', 'success');
          corrForm.reset();
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Request';
        }
      };
    }
  };

  refreshTable();
}

// Print function supporting Draft D1, D2 and Final 1, 2
function triggerRollPrint(students, isFinal, isDraft, sortBy, collegeName) {
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
          .college { font-size: 18px; font-weight: bold; text-transform: uppercase; }
          .title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-top: 5px; }
          .meta { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 10px; }
          
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 5px 8px; text-align: left; }
          th { background: #eee; font-weight: bold; text-transform: uppercase; font-size: 10px; }
          .sl { width: 50px; text-align: center; font-weight: bold; font-family: monospace; }
          .adm { width: 80px; font-family: monospace; }
          .cls { width: 160px; font-size: 9px; }
          .dept { width: 100px; font-size: 9px; }

          .footer { margin-top: 30px; display: flex; justify-content: space-between; font-weight: bold; }
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
            <th class="sl">${isDraft ? 'Draft Sl.' : 'Sl. No'}</th>
            <th class="adm">Adm. No</th>
            <th>Name</th>
            <th class="cls">Class</th>
            <th class="dept">Department</th>
          </tr></thead>
          <tbody>
            ${data.map(s => `
              <tr>
                <td class="sl">${isDraft ? 'D' : ''}${esc(s['Nominal Roll Serial Number'])}</td>
                <td class="adm">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                <td style="font-weight:bold">${esc(s['NAME'])}</td>
                <td class="cls">${esc(s['CLASS'])}</td>
                <td class="dept">${esc(s['Dept'] || '–')}</td>
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
