/**
 * pages/admin/publish.js
 * Admin page for publishing the valid and final nomination lists.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

export async function renderAdminPublish(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'publish', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading settings...</p></div>
  `);

  try {
    const settings = await api.adminGetSettings(pwd);
    renderPublishPage(container.querySelector('#adminMain'), settings, pwd);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderPublishPage(main, settings, pwd) {
  const validPublished = settings.validListPublished === 'true';
  const finalPublished = settings.finalListPublished === 'true';

  main.innerHTML = `
    <div class="page-enter space-y-6">
      <div>
        <h3 class="text-xl font-bold text-white">Publish Lists</h3>
        <p class="text-slate-400 text-sm">Control public visibility of nomination lists. Publishing is a one-way action.</p>
      </div>

      <!-- Valid list publish -->
      <div class="glass rounded-xl p-6 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="font-bold text-white text-base">📋 Valid Nominations List</h4>
            <p class="text-slate-400 text-sm mt-1">Make the list of verified valid nominations visible to the public.</p>
          </div>
          <span class="badge ${validPublished ? 'badge-valid' : 'badge-pending'} text-sm">
            ${validPublished ? '✅ Published' : '⏳ Not Published'}
          </span>
        </div>
        ${!validPublished ? `
        <div class="alert alert-warning text-sm">
          ⚠ Ensure all nominations have been reviewed before publishing. This action is irreversible.
        </div>
        <button id="publishValidBtn" class="btn btn-primary">📢 Publish Valid Nominations List</button>` : `
        <div class="alert alert-success text-sm">✅ This list is currently visible to the public.</div>`}
      </div>

      <!-- Final list publish -->
      <div class="glass rounded-xl p-6 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="font-bold text-white text-base">🏁 Final Nominations List</h4>
            <p class="text-slate-400 text-sm mt-1">Publish the final list showing active and withdrawn candidates.</p>
          </div>
          <span class="badge ${finalPublished ? 'badge-valid' : 'badge-pending'} text-sm">
            ${finalPublished ? '✅ Published' : '⏳ Not Published'}
          </span>
        </div>
        ${!finalPublished ? `
        <div class="alert alert-warning text-sm">
          ⚠ Ensure all withdrawal requests have been processed before publishing the final list.
        </div>
        <button id="publishFinalBtn" class="btn btn-primary" ${!validPublished ? 'disabled title="Publish the valid list first"' : ''}>📢 Publish Final Nominations List</button>` : `
        <div class="alert alert-success text-sm">✅ The final list is currently visible to the public.</div>`}
      </div>
    </div>`;

  main.querySelector('#publishValidBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!confirm('Are you sure you want to publish the valid nominations list? This will be visible to all students.')) return;
    setLoading(btn, true, '📢 Publish Valid Nominations List');
    try {
      await api.adminPublishValidList(pwd);
      showToast('Valid nominations list published successfully!', 'success');
      // Re-render with updated state
      renderPublishPage(main, { validListPublished: 'true', finalListPublished: finalPublished ? 'true' : 'false' }, pwd);
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
      renderPublishPage(main, { validListPublished: 'true', finalListPublished: 'true' }, pwd);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      setLoading(btn, false, '📢 Publish Final Nominations List');
    }
  });
}
