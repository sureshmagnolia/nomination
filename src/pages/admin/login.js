/**
 * pages/admin/login.js
 * Admin login page — verifies password against Apps Script backend.
 */
import { api } from '../../api.js';
import { router } from '../../router.js';
import { esc, setLoading, showToast } from '../../utils.js';

export function renderAdminLogin(container) {
  container.innerHTML = `
    <div class="glass max-w-md w-full mx-auto p-10 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden page-enter">
      <!-- Background Glow -->
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl"></div>

      <div class="text-center mb-8 relative z-10">
        <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-xl">G</div>
        <h2 class="text-3xl font-black text-white tracking-tight">Admin Access</h2>
        <p class="text-slate-400 text-sm mt-2">Secure Gateway for Election Management</p>
      </div>

      <div id="errorMsg" class="hidden alert alert-error text-left mb-6"></div>
      
      <form id="loginForm" class="space-y-6 text-left relative z-10">
        <input type="text" name="username" value="admin" style="display:none;" autocomplete="username" />
        
        <!-- Step 1: Password -->
        <div id="passwordStep">
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Admin Password</label>
          <input id="adminPassword" type="password" class="field text-lg" placeholder="Enter password" autocomplete="current-password" />
          <button type="submit" id="btnRequestOTP" class="btn btn-primary w-full text-base py-4 mt-6 group">
            <span>Request Secure OTP</span>
            <span class="ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        <!-- Step 2: OTP (Hidden initially) -->
        <div id="otpStep" class="hidden space-y-6">
          <div class="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
            <p class="text-xs text-indigo-300 leading-relaxed">
              🔐 <strong>Check your Email</strong><br/>
              A 6-digit verification code has been sent to your registered email address.
            </p>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Enter 6-Digit OTP</label>
            <input id="adminOTP" type="number" class="field text-center text-2xl tracking-[0.5em] font-black" placeholder="000000" maxlength="6" />
          </div>
          <button type="button" id="btnVerifyLogin" class="btn btn-success w-full text-base py-4 shadow-lg shadow-emerald-500/20">
            <span>Verify & Login</span>
          </button>
          <button type="button" id="btnBackToPassword" class="w-full text-[10px] text-slate-500 hover:text-slate-300 uppercase tracking-widest font-bold transition">
            ← Use a different password
          </button>
        </div>
      </form>
    </div>
  `;

  const form = container.querySelector('#loginForm');
  const errorEl = container.querySelector('#errorMsg');
  const passwordStep = container.querySelector('#passwordStep');
  const otpStep = container.querySelector('#otpStep');
  const pwdInput = container.querySelector('#adminPassword');
  const otpInput = container.querySelector('#adminOTP');

  const showError = (msg) => {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    errorEl.classList.add('shake');
    setTimeout(() => errorEl.classList.remove('shake'), 500);
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const password = pwdInput.value.trim();
    if (!password) return showError('Please enter the admin password.');

    const btn = container.querySelector('#btnRequestOTP');
    setLoading(btn, true, 'Verifying...');
    errorEl.classList.add('hidden');

    try {
      // First, verify password and request OTP
      await api.adminSendOTP(password);
      
      // Transition to OTP step
      passwordStep.classList.add('hidden');
      otpStep.classList.remove('hidden');
      otpStep.classList.add('page-enter');
      otpInput.focus();
      showToast('OTP sent successfully!', 'success');
    } catch (err) {
      showError(err.message === 'Unauthorized' ? 'Incorrect admin password.' : err.message);
    } finally {
      setLoading(btn, false, 'Request Secure OTP');
    }
  };

  container.querySelector('#btnVerifyLogin').onclick = async (e) => {
    const password = pwdInput.value.trim();
    const otp = otpInput.value.trim();
    if (!otp || otp.length !== 6) return showError('Please enter a valid 6-digit OTP.');

    setLoading(e.target, true, 'Verifying OTP...');
    errorEl.classList.add('hidden');

    try {
      await api.adminVerifyOTP(password, otp);
      
      // Success! Store session and navigate
      sessionStorage.setItem('adminPwd', password);
      showToast('Authentication successful!', 'success');
      import('../../router.js').then(({ router }) => router.navigate('/admin/dashboard'));
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(e.target, false, 'Verify & Login');
    }
  };

  container.querySelector('#btnBackToPassword').onclick = () => {
    otpStep.classList.add('hidden');
    passwordStep.classList.remove('hidden');
    passwordStep.classList.add('page-enter');
    errorEl.classList.add('hidden');
  };
}
