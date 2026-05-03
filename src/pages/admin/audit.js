/**
 * pages/admin/audit.js
 * Admin Internal Audit System Dashboard
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast } from '../../utils.js';

export async function renderAdminAudit(container) {
  const pwd = getAdminPassword(); if (!pwd) return;

  renderAdminLayout(container, 'audit', `
    <div class="page-enter space-y-8">
      <div class="flex items-end justify-between">
        <div>
          <h3 class="text-2xl font-bold text-white">Internal Audit System</h3>
          <p class="text-slate-400 text-sm mt-1">Cross-check nominal roll, ballot plans, nominations, and counting matrices for discrepancies.</p>
        </div>
        <button id="btnRunAudit" class="btn btn-primary">
          <span class="mr-2">🔍</span> Run Full System Audit
        </button>
      </div>

      <div id="auditResults" class="space-y-6">
        <div class="glass rounded-2xl p-8 text-center text-slate-400 border border-white/5">
          <div class="text-4xl mb-4 opacity-50">🛡️</div>
          <p>Click "Run Full System Audit" to begin verifying data integrity.</p>
        </div>
      </div>
    </div>
  `);

  const btnRunAudit = container.querySelector('#btnRunAudit');
  const auditResults = container.querySelector('#auditResults');

  btnRunAudit.addEventListener('click', async () => {
    btnRunAudit.disabled = true;
    btnRunAudit.innerHTML = '<span class="spinner w-4 h-4 mr-2 border-2"></span> Running Audit...';
    auditResults.innerHTML = `
      <div class="glass rounded-2xl p-12 text-center text-slate-400 border border-white/5">
        <div class="spinner w-10 h-10 border-4 border-indigo-500 mb-4 mx-auto"></div>
        <p class="font-bold text-white">Analyzing Data...</p>
        <p class="text-xs mt-2">This may take a few seconds as the system cross-references all data layers.</p>
      </div>
    `;

    try {
      const res = await api.adminRunAudit(pwd);
      const report = res.report;
      
      const renderCheck = (title, checkObj) => {
        if (checkObj.pass) {
          return `
            <div class="glass rounded-2xl p-6 border-l-4 border-emerald-500 bg-emerald-500/5">
              <div class="flex items-center text-emerald-400 font-bold mb-2">
                <span class="mr-2">✅</span> ${esc(title)}
              </div>
              <p class="text-xs text-slate-400">All data points passed the integrity check perfectly.</p>
            </div>
          `;
        } else {
          return `
            <div class="glass rounded-2xl p-6 border-l-4 border-rose-500 bg-rose-500/5">
              <div class="flex items-center text-rose-400 font-bold mb-4">
                <span class="mr-2">❌</span> ${esc(title)}
              </div>
              <ul class="list-disc pl-5 space-y-2 text-xs text-rose-300">
                ${checkObj.details.map(d => `<li>${esc(d)}</li>`).join('')}
              </ul>
            </div>
          `;
        }
      };

      auditResults.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${renderCheck('1. Nominal Roll vs Ballot Plan', report.rollCheck)}
          ${renderCheck('2. Serial Number Integrity (Nominations)', report.serialCheck)}
          ${renderCheck('3. Counting Matrix vs Results Math', report.resultsCheck)}
          ${renderCheck('4. Ballot Forms Accounting', report.formsCheck)}
        </div>
      `;

      if (report.rollCheck.pass && report.serialCheck.pass && report.resultsCheck.pass && report.formsCheck.pass) {
         auditResults.innerHTML = `
           <div class="glass rounded-2xl p-8 text-center border border-emerald-500/30 bg-emerald-500/10 mb-6">
             <div class="text-4xl mb-4">🎉</div>
             <h3 class="text-xl font-bold text-emerald-400">All Systems Go!</h3>
             <p class="text-sm text-slate-300 mt-2">The audit found absolutely zero discrepancies. The data is perfectly synchronized.</p>
           </div>
         ` + auditResults.innerHTML;
      } else {
         auditResults.innerHTML = `
           <div class="glass rounded-2xl p-8 text-center border border-rose-500/30 bg-rose-500/10 mb-6">
             <div class="text-4xl mb-4">⚠️</div>
             <h3 class="text-xl font-bold text-rose-400">Discrepancies Found</h3>
             <p class="text-sm text-slate-300 mt-2">Please review the failed checks below and resolve the inconsistencies.</p>
           </div>
         ` + auditResults.innerHTML;
      }

      showToast('Audit completed.', 'info');
    } catch (err) {
      auditResults.innerHTML = `<div class="alert alert-error">❌ Audit failed: ${esc(err.message)}</div>`;
      showToast(err.message, 'error');
    } finally {
      btnRunAudit.disabled = false;
      btnRunAudit.innerHTML = '<span class="mr-2">🔍</span> Run Full System Audit';
    }
  });
}
