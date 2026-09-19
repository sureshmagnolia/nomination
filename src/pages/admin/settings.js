/**
 * pages/admin/settings.js
 * Admin settings page for college info and security.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

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
              <h4 class="font-bold text-white text-lg">College Information &amp; Branding</h4>
              <p class="text-slate-400 text-xs mt-1">This branding and logo appear on the public portal and all official print documents.</p>
            </div>
            
            <div class="space-y-5">
              <!-- College Logo Upload & Preview -->
              <div>
                <label class="text-xs text-slate-400 uppercase tracking-wider block mb-2">College Logo (Printed Above College Name)</label>
                <div class="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/10">
                  <div id="logoPreviewBox" class="w-20 h-20 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    ${settings.collegeLogo
                      ? `<img id="logoPreviewImg" src="${settings.collegeLogo}" class="w-full h-full object-contain" alt="College Logo">`
                      : `<span id="logoPlaceholder" class="text-xs text-slate-500 text-center px-1">No Logo</span>`}
                  </div>
                  <div class="flex-1 space-y-2">
                    <div class="flex flex-wrap gap-2">
                      <label class="btn btn-secondary text-xs py-1.5 px-3 cursor-pointer">
                        <span>📁 Choose Logo Image</span>
                        <input type="file" id="inputCollegeLogo" accept="image/*" class="hidden">
                      </label>
                      <button type="button" id="btnRemoveLogo" class="btn text-xs py-1.5 px-3 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 ${settings.collegeLogo ? '' : 'hidden'}">
                        🗑️ Remove
                      </button>
                    </div>
                    <p class="text-[11px] text-slate-400">PNG, JPG, or SVG. Auto-scaled for sharp, crisp print headers.</p>
                  </div>
                </div>
              </div>

              <div>
                <label class="text-xs text-slate-400 uppercase tracking-wider block mb-2">Full College Name</label>
                <input type="text" id="inputCollegeName" class="field text-sm py-2.5" value="${esc(settings.collegeName)}">
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="text-xs text-slate-400 uppercase tracking-wider block mb-2">Short Form (Abbreviation)</label>
                  <input type="text" id="inputCollegeShort" class="field text-sm py-2.5" value="${esc(settings.collegeShortName)}">
                </div>
                <div>
                  <label class="text-xs text-slate-400 uppercase tracking-wider block mb-2">Election Year</label>
                  <input type="text" id="inputElectionYear" class="field text-sm py-2.5" value="${esc(settings.electionYear || new Date().getFullYear().toString())}" placeholder="e.g. 2026">
                </div>
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
        
        <!-- Backup & Disaster Recovery -->
        <div class="mt-8 border border-sky-500/30 bg-sky-950/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div class="flex items-start gap-4">
            <div class="text-3xl">💾</div>
            <div>
              <h4 class="font-bold text-sky-400 text-lg">Full Data Backup & Disaster Recovery</h4>
              <p class="text-sky-200/70 text-sm mt-1">Export or restore the entire election database: Nominal Roll, Corrections, Nominations, Booths, Ballots, Counting Matrices, and Certified Results. Includes automatic pre-restore safety snapshots and 1-click rollbacks.</p>
            </div>
          </div>
          <a href="#/admin/backup" class="btn bg-sky-600 hover:bg-sky-500 text-white font-semibold px-5 py-2.5 whitespace-nowrap shadow-lg shadow-sky-900/40">
            Open Backup Center &rarr;
          </a>
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

    let currentLogoDataUrl = settings.collegeLogo || '';

    const logoInput = container.querySelector('#inputCollegeLogo');
    const logoPreviewBox = container.querySelector('#logoPreviewBox');
    const btnRemoveLogo = container.querySelector('#btnRemoveLogo');

    logoInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        return showToast('Please select a valid image file.', 'error');
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          // Offscreen canvas compression: max 260px wide, 130px high
          const MAX_WIDTH = 260;
          const MAX_HEIGHT = 130;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          currentLogoDataUrl = canvas.toDataURL('image/png');
          logoPreviewBox.innerHTML = `<img id="logoPreviewImg" src="${currentLogoDataUrl}" class="w-full h-full object-contain" alt="College Logo">`;
          btnRemoveLogo?.classList.remove('hidden');
          showToast('Logo image selected and ready to save!', 'info');
        };
        img.onerror = () => showToast('Failed to parse selected image.', 'error');
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });

    btnRemoveLogo?.addEventListener('click', () => {
      currentLogoDataUrl = '';
      logoPreviewBox.innerHTML = `<span id="logoPlaceholder" class="text-xs text-slate-500 text-center px-1">No Logo</span>`;
      btnRemoveLogo.classList.add('hidden');
      if (logoInput) logoInput.value = '';
      showToast('Logo cleared. Click "Save Branding" to apply.', 'info');
    });

    // Handle branding update
    container.querySelector('#btnUpdateBranding').addEventListener('click', async (e) => {
      const collegeName = container.querySelector('#inputCollegeName').value.trim();
      const collegeShortName = container.querySelector('#inputCollegeShort').value.trim();
      const electionYear = container.querySelector('#inputElectionYear').value.trim() || new Date().getFullYear().toString();
      if (!collegeName || !collegeShortName) return showToast('Please fill all branding fields.', 'error');

      const btn = e.currentTarget;
      setLoading(btn, true, 'Saving...');
      try {
        await api.adminUpdateSettings(pwd, {
          collegeName,
          collegeShortName,
          electionYear,
          collegeLogo: currentLogoDataUrl
        });
        showToast('College branding & logo updated successfully! Refresh to see changes system-wide.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(btn, false, 'Save Branding');
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
