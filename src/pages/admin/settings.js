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
        
        <!-- Danger Zone -->
        <div class="mt-8 border border-rose-500/30 bg-rose-950/20 rounded-2xl p-6">
          <div class="flex items-start gap-4">
            <div class="text-3xl">⚠️</div>
            <div class="flex-1">
              <h4 class="font-bold text-rose-400 text-lg">Danger Zone: New Election Year</h4>
              <p class="text-rose-200/60 text-sm mt-1">This action permanently deletes all Nominal Roll students, Nominations, and resets election state flags. Your configuration (Posts, Booths, Passwords) will be kept.</p>
              
              <div class="mt-5 space-y-4 max-w-md">
                <button id="btnInitReset" class="btn bg-rose-600 text-white hover:bg-rose-700 w-full">🚨 Start Factory Reset</button>
                
                <div id="resetFlow" class="hidden space-y-4 mt-4 p-4 bg-black/40 rounded-xl border border-rose-500/20">
                  <div id="resetStep1">
                    <label class="text-xs font-bold text-rose-300 block mb-2">1. Enter Admin Password to request OTP</label>
                    <input type="password" id="resetPwd" class="field text-sm mb-2" placeholder="Admin Password">
                    <button id="btnResetSendOTP" class="btn btn-secondary w-full">Send OTP to Email</button>
                  </div>
                  
                  <div id="resetStep2" class="hidden">
                    <label class="text-xs font-bold text-emerald-400 block mb-2">2. Check Email for OTP</label>
                    <input type="text" id="resetOTP" class="field text-center tracking-widest text-lg font-mono mb-3" placeholder="000000" maxlength="6">
                    <label class="text-xs font-bold text-rose-300 block mb-2">3. Type RESET to confirm</label>
                    <input type="text" id="resetConfirmText" class="field text-center font-mono uppercase text-rose-400 mb-3" placeholder="RESET">
                    <button id="btnResetConfirm" class="btn bg-rose-600 text-white hover:bg-rose-700 w-full font-bold">PERMANENTLY WIPE DATA</button>
                  </div>
                </div>
              </div>
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

    // Handle Factory Reset
    const btnInitReset = container.querySelector('#btnInitReset');
    const resetFlow = container.querySelector('#resetFlow');
    const resetStep1 = container.querySelector('#resetStep1');
    const resetStep2 = container.querySelector('#resetStep2');
    
    btnInitReset.addEventListener('click', () => {
      resetFlow.classList.remove('hidden');
      btnInitReset.classList.add('hidden');
    });

    container.querySelector('#btnResetSendOTP').addEventListener('click', async (e) => {
      const resetPwd = container.querySelector('#resetPwd').value;
      if (!resetPwd) return showToast('Password required', 'error');
      
      const btn = e.target;
      const oldText = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      try {
        await api.post({ action: 'adminSendOTP', password: resetPwd });
        showToast('OTP sent to your admin email!', 'success');
        resetStep1.classList.add('hidden');
        resetStep2.classList.remove('hidden');
      } catch (err) {
        showToast(err.message, 'error');
        btn.textContent = oldText;
        btn.disabled = false;
      }
    });

    container.querySelector('#btnResetConfirm').addEventListener('click', async (e) => {
      const resetPwd = container.querySelector('#resetPwd').value;
      const otp = container.querySelector('#resetOTP').value.trim();
      const confirm = container.querySelector('#resetConfirmText').value.trim().toUpperCase();
      
      if (!otp || otp.length !== 6) return showToast('Enter 6-digit OTP', 'error');
      if (confirm !== 'RESET') return showToast('Type RESET to confirm', 'error');
      
      const btn = e.target;
      btn.textContent = 'WIPING DATA...';
      btn.disabled = true;
      try {
        await api.post({ action: 'adminFactoryReset', password: resetPwd, otp });
        showToast('✅ System Reset Successful! Reloading...', 'success');
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        showToast(err.message, 'error');
        btn.textContent = 'PERMANENTLY WIPE DATA';
        btn.disabled = false;
      }
    });

  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}
