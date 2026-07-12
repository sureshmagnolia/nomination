/**
 * pages/nominalRoll.js
 * Public view of the Nominal Roll (Draft or Final).
 */
import { api } from '../api.js';
import { esc } from '../utils.js';
import { CONFIG } from '../config.js';

export async function renderNominalRoll(container) {
  container.innerHTML = `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominal roll...</p></div>
  `;

  try {
    const [nominalRoll, settings] = await Promise.all([
      api.getNominalRoll(),
      api.getSettings()
    ]);
    renderPublicRollUI(container, nominalRoll, settings);
  } catch (e) {
    container.innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderPublicRollUI(container, nominalRoll, settings) {
  const isFinal = settings.nominalRollFinalized === 'true';
  let students = [...nominalRoll];
  let filterText = '';

  const refreshTable = () => {
    const filtered = students.filter(s => 
      [s['NAME'], s['CLASS'], s['ADMISION NO'], s['Nominal Roll Serial Number']].some(v => 
        String(v || '').toLowerCase().includes(filterText.toLowerCase())
      )
    );

    container.innerHTML = `
      <div class="page-enter space-y-6">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <button data-nav="/" class="text-slate-400 hover:text-white mb-2 flex items-center gap-2 text-sm transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              Back to Home
            </button>
            <h3 class="text-2xl font-bold text-white">Nominal Roll</h3>
            <p class="text-slate-400 text-sm">Official list of eligible voters.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <div class="dropdown relative inline-block">
              <button class="btn btn-secondary dropdown-toggle">🖨️ Print Roll ▼</button>
              <div class="dropdown-menu absolute right-0 mt-2 w-48 glass rounded-lg shadow-xl hidden z-50 overflow-hidden border border-white/10">
                <button class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10" id="btnPrintSerial">Sorted by Serial No</button>
                <button class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10" id="btnPrintClass">Sorted by Class</button>
              </div>
            </div>
            ${isFinal ? `<span class="badge badge-valid py-2 px-4">FINALIZED LIST</span>` : `<span class="badge badge-pending py-2 px-4">DRAFT LIST</span>`}
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
              </tr></thead>
              <tbody>
                ${filtered.length ? filtered.map(s => `
                  <tr>
                    <td class="font-bold text-indigo-400">${esc(s['Nominal Roll Serial Number'])}</td>
                    <td class="font-mono text-xs">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                    <td class="text-white font-medium">${esc(s['NAME'])}</td>
                    <td class="text-slate-300 text-sm">${esc(s['CLASS'])}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" class="text-center py-10 text-slate-500">No students found matching your search.</td></tr>'}
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
    container.querySelector('#btnPrintSerial').onclick = () => triggerRollPrint(students, isFinal, 'serial');
    container.querySelector('#btnPrintClass').onclick = () => triggerRollPrint(students, isFinal, 'class');
  };

  refreshTable();
}

// Re-using the same print function logic
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
