/**
 * pages/admin/login.js
 * Admin login page — verifies password against Apps Script backend.
 */
import { api } from '../../api.js';
import { router } from '../../router.js';
import { esc, setLoading, showToast } from '../../utils.js';

export function renderAdminLogin(container) {
  container.innerHTML = `
  <div class="page-enter min-h-screen flex items-center justify-center p-4">
    <div class="glass rounded-2xl p-10 w-full max-w-md text-center space-y-6">
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl mx-auto shadow-lg">🔐</div>
      <div>
        <h1 class="text-2xl font-bold text-white">Admin Login</h1>
        <p class="text-slate-400 text-sm mt-1">Election Management Portal</p>
      </div>
      <div id="errorMsg" class="hidden alert alert-error text-left"></div>
      <form id="loginForm" class="space-y-4 text-left">
        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-1">Admin Password</label>
          <input id="adminPassword" type="password" class="field" placeholder="Enter admin password" />
        </div>
        <button type="submit" id="loginBtn" class="btn btn-primary w-full text-base py-3">Login to Admin Panel →</button>
      </form>
      <button id="backHome" class="text-slate-500 hover:text-slate-300 text-sm transition">← Back to Public Portal</button>
    </div>
  </div>`;

  container.querySelector('#backHome').addEventListener('click', () => router.navigate('/'));

  const form = container.querySelector('#loginForm');
  const pwdInput = container.querySelector('#adminPassword');
  const errMsg = container.querySelector('#errorMsg');
  const btn = container.querySelector('#loginBtn');

  const doLogin = async (e) => {
    e.preventDefault();
    const password = pwdInput.value;
    if (!password) { showToast('Please enter the admin password.', 'error'); return; }
    setLoading(btn, true, 'Login to Admin Panel →');
    errMsg.classList.add('hidden');
    try {
      await api.adminLogin(password);
      // Store in sessionStorage (ephemeral)
      sessionStorage.setItem('adminPwd', password);
      showToast('Logged in successfully!', 'success');
      router.navigate('/admin/dashboard');
    } catch (err) {
      errMsg.textContent = `❌ ${err.message}`;
      errMsg.classList.remove('hidden');
    } finally {
      setLoading(btn, false, 'Login to Admin Panel →');
    }
  };

  form.addEventListener('submit', doLogin);
}
