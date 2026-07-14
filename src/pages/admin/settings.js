/**
 * pages/admin/settings.js
 * Admin settings page for college info and security.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast } from '../../utils.js';

export async function renderSettings(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'settings', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading settings...</p></div>
  `);

  try {
    const settings = await api.adminGetSettings(pwd);
    
    const main = container.querySelector('#adminMain');
    main.innerHTML = `
      <div class="page-enter space-y-8 max-w-4xl mx-auto">
        <div>
          <h3 class="text-2xl font-bold text-white">System Settings</h3>
          <p class="text-slate-400 text-sm mt-1">Manage your college branding and security credentials.</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- College Information -->
          <div class="glass rounded-2xl p-8 space-y-6">
            <div>
              <h4 class="font-bold text-white text-lg">College Information</h4>
              <p class="text-slate-400 text-xs mt-1">This branding appears on the public portal and all official documents.</p>
            </div>
            
            <div class="space-y-5">
              <div>
                <label class="text-xs text-slate-400 uppercase tracking-wider block mb-2">Full College Name</label>
                <input type="text" id="inputCollegeName" class="field text-sm py-2.5" value="${esc(settings.collegeName)}">
              </div>
              <div>
                <label class="text-xs text-slate-400 uppercase tracking-wider block mb-2">Short Form (Abbreviation)</label>
                <input type="text" id="inputCollegeShort" class="field text-sm py-2.5" value="${esc(settings.collegeShortName)}">
              </div>
              <button id="btnUpdateBranding" class="btn btn-primary w-full py-3 mt-2">Save Branding</button>
            </div>
          </div>

          <!-- Security & Access -->
          <div class="glass rounded-2xl p-8 space-y-6 border border-rose-500/20">
            <div>
              <h4 class="font-bold text-rose-300 text-lg">Security & Access</h4>
              <p class="text-rose-300/60 text-xs mt-1">Update your login credentials and OTP email destination.</p>
            </div>
            
            <div class="space-y-5">
              <div>
                <label class="text-xs text-slate-400 uppercase tracking-wider block mb-2">New Admin Password</label>
                <input type="password" id="inputAdminPassword" class="field text-sm py-2.5" placeholder="Leave blank to keep current">
              </div>
              <div>
                <label class="text-xs text-slate-400 uppercase tracking-wider block mb-2">Admin Email (For OTP)</label>
                <input type="email" id="inputAdminEmail" class="field text-sm py-2.5" value="${esc(settings.adminEmail || '')}" placeholder="admin@college.edu">
              </div>
              <button id="btnUpdateSecurity" class="btn bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 w-full py-3 mt-2">Update Credentials</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Handle branding update
    container.querySelector('#btnUpdateBranding').addEventListener('click', async () => {
      const collegeName = container.querySelector('#inputCollegeName').value.trim();
      const collegeShortName = container.querySelector('#inputCollegeShort').value.trim();
      if (!collegeName || !collegeShortName) return showToast('Please fill all branding fields.', 'error');

      try {
        await api.adminUpdateSettings(pwd, { collegeName, collegeShortName });
        showToast('College branding updated successfully! Refresh to see changes system-wide.', 'success');
      } catch (e) {
        showToast(e.message, 'error');
      }
    });

    // Handle security update
    container.querySelector('#btnUpdateSecurity').addEventListener('click', async () => {
      const newPassword = container.querySelector('#inputAdminPassword').value.trim();
      const newEmail = container.querySelector('#inputAdminEmail').value.trim();
      
      try {
        await api.adminUpdateCredentials(pwd, { newPassword, newEmail });
        showToast('Security credentials updated successfully!', 'success');
        container.querySelector('#inputAdminPassword').value = '';
      } catch (e) {
        showToast(e.message, 'error');
      }
    });

  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}
