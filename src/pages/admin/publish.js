/**
 * pages/admin/publish.js
 * Admin page for publishing and printing the valid and final nomination lists.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

export async function renderAdminPublish(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'publish', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading data...</p></div>
  `);

  try {
    const [settings, nominations] = await Promise.all([
      api.adminGetSettings(pwd),
      api.adminGetNominations(pwd)
    ]);
    renderPublishPage(container.querySelector('#adminMain'), settings, nominations, pwd);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderPublishPage(main, settings, nominations, pwd) {
  const validPublished = settings.validListPublished === 'true';
  const finalPublished = settings.finalListPublished === 'true';

  main.innerHTML = `
    <div class="page-enter space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="text-xl font-bold text-white">Publish & Print Lists</h3>
          <p class="text-slate-400 text-sm">Control public visibility and generate official printed lists.</p>
        </div>
      </div>

      <!-- Valid list publish -->
      <div class="glass rounded-xl p-6 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="font-bold text-white text-base">📋 Valid Nominations List</h4>
            <p class="text-slate-400 text-sm mt-1">List of all verified nominations (Valid status).</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="btnPrintValid" class="btn btn-secondary btn-sm">🖨️ Print List</button>
            <span class="badge ${validPublished ? 'badge-valid' : 'badge-pending'} text-sm">
              ${validPublished ? '✅ Published' : '⏳ Not Published'}
            </span>
          </div>
        </div>
        ${!validPublished ? `
        <div class="alert alert-warning text-sm">
          ⚠ Ensure all nominations have been reviewed before publishing.
        </div>
        <button id="publishValidBtn" class="btn btn-primary">📢 Publish Valid Nominations List</button>` : `
        <div class="alert alert-success text-sm">✅ This list is currently visible to the public.</div>`}
      </div>

      <!-- Final list publish -->
      <div class="glass rounded-xl p-6 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="font-bold text-white text-base">🏁 Final Nominations List</h4>
            <p class="text-slate-400 text-sm mt-1">Final list of candidates after the withdrawal period.</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="btnPrintFinal" class="btn btn-secondary btn-sm">🖨️ Print List</button>
            <span class="badge ${finalPublished ? 'badge-valid' : 'badge-pending'} text-sm">
              ${finalPublished ? '✅ Published' : '⏳ Not Published'}
            </span>
          </div>
        </div>
        ${!finalPublished ? `
        <div class="alert alert-warning text-sm">
          ⚠ Ensure all withdrawal requests have been processed before publishing.
        </div>
        <button id="publishFinalBtn" class="btn btn-primary" ${!validPublished ? 'disabled title="Publish the valid list first"' : ''}>📢 Publish Final Nominations List</button>` : `
        <div class="alert alert-success text-sm">✅ The final list is currently visible to the public.</div>`}
      </div>
    </div>`;

  // ── Print Logic ───────────────────────────────────────────────────────────
  const printList = (type) => {
    const isFinal = type === 'final';
    const list = isFinal 
      ? nominations.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved')
      : nominations.filter(n => n.status === 'Valid');
    
    if (list.length === 0) { alert('No valid nominations found to print.'); return; }

    // Group by post
    const grouped = {};
    list.forEach(n => {
      if (!grouped[n.post]) grouped[n.post] = [];
      grouped[n.post].push(n);
    });

    const posts = Object.keys(grouped).sort();
    
    let html = `
      <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #000;padding-bottom:15px">
        <div style="font-size:12px;color:#444">Government Victoria College, Palakkad</div>
        <h1 style="margin:5px 0;font-size:22px;text-transform:uppercase">College Union Election 2026-27</h1>
        <h2 style="margin:0;font-size:18px;color:#000">${isFinal ? 'FINAL LIST OF ELIGIBLE CANDIDATES' : 'LIST OF VALID NOMINATIONS'}</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">
        <thead>
          <tr style="background:#f0f0f0">
            <th style="border:1px solid #000;padding:8px;text-align:center;width:40px">#</th>
            <th style="border:1px solid #000;padding:8px;text-align:left">Candidate Name</th>
            <th style="border:1px solid #000;padding:8px;text-align:left">Class</th>
            <th style="border:1px solid #000;padding:8px;text-align:left">Department</th>
          </tr>
        </thead>
        <tbody>
    `;

    posts.forEach(post => {
      html += `
        <tr>
          <td colspan="4" style="border:1px solid #000;padding:10px 8px;background:#eee;font-weight:bold;text-transform:uppercase">
            POST: ${esc(post)}
          </td>
        </tr>
      `;
      grouped[post].forEach((n, idx) => {
        html += `
          <tr>
            <td style="border:1px solid #000;padding:8px;text-align:center">${idx + 1}</td>
            <td style="border:1px solid #000;padding:8px;font-weight:bold">${esc(n.candidateName)}</td>
            <td style="border:1px solid #000;padding:8px">${esc(n.candidateClass)}</td>
            <td style="border:1px solid #000;padding:8px">${esc(n.candidateDept)}</td>
          </tr>
        `;
      });
    });

    html += `
        </tbody>
      </table>
      <div style="margin-top:60px;display:flex;justify-content:flex-end">
        <div style="text-align:center">
          <div style="font-weight:bold;margin-bottom:40px">RETURNING OFFICER</div>
          <div style="font-size:11px">Signature & Seal</div>
        </div>
      </div>
    `;

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Print List</title><style>
      @page{size:A4;margin:20mm}
      body{font-family:Arial,sans-serif;line-height:1.4}
    </style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);
    w.document.close();
  };

  main.querySelector('#btnPrintValid').addEventListener('click', () => printList('valid'));
  main.querySelector('#btnPrintFinal').addEventListener('click', () => printList('final'));

  // ── Action Buttons ────────────────────────────────────────────────────────
  main.querySelector('#publishValidBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!confirm('Are you sure you want to publish the valid nominations list? This will be visible to all students.')) return;
    setLoading(btn, true, '📢 Publish Valid Nominations List');
    try {
      await api.adminPublishValidList(pwd);
      showToast('Valid nominations list published successfully!', 'success');
      renderPublishPage(main, { validListPublished: 'true', finalListPublished: finalPublished ? 'true' : 'false' }, nominations, pwd);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      setLoading(btn, false, '📢 Publish Valid Nominations List');
    }
  });

  main.querySelector('#publishFinalBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!confirm('Are you sure you want to publish the final nominations list?')) return;
    setLoading(btn, true, '📢 Publish Final Nominations List');
    try {
      await api.adminPublishFinalList(pwd);
      showToast('Final nominations list published successfully!', 'success');
      renderPublishPage(main, { validListPublished: 'true', finalListPublished: 'true' }, nominations, pwd);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      setLoading(btn, false, '📢 Publish Final Nominations List');
    }
  });
}
