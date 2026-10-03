/**
 * pages/admin/layout.js
 * Shared admin layout with sidebar navigation.
 * Guards against unauthenticated access.
 */
import { router } from '../../router.js';
import { showToast } from '../../utils.js';
import { api } from '../../api.js';
import { CONFIG } from '../../config.js';
import { getHeaderThemeControlsHtml, setupHeaderThemeControls } from '../../theme.js';

export function getAdminPassword() {
  const pwd = localStorage.getItem('adminPwd');
  const loginDate = localStorage.getItem('adminLoginDate');
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  if (!pwd || loginDate !== today) {
    if (pwd) {
      // Clean up expired session
      localStorage.removeItem('adminPwd');
      localStorage.removeItem('adminLoginDate');
      localStorage.removeItem('adminSessionToken');
      sessionStorage.removeItem('adminSessionToken');
      showToast('Daily session expired. Please log in again.', 'warning');
    }
    router.navigate('/admin');
    return null;
  }

  // Sync the session token from localStorage into sessionStorage for api.js to read
  const token = localStorage.getItem('adminSessionToken');
  if (token) sessionStorage.setItem('adminSessionToken', token);

  return pwd;
}

export function renderAdminLayout(container, activeSection, contentHtml) {
  const pwd = getAdminPassword();
  const cachedShort = localStorage.getItem('cachedCollegeShortName') || CONFIG.COLLEGE_SHORT_NAME;

  if (pwd) {
    api.initAdminData(pwd);
    api.adminGetSettings(pwd).then(sets => {
      const shortName = sets.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;
      localStorage.setItem('cachedCollegeShortName', shortName);
      const logoEl = container.querySelector('#layout-college-logo');
      const nameEl = container.querySelector('#layout-college-name');
      if (logoEl) logoEl.textContent = shortName.charAt(0);
      if (nameEl) nameEl.textContent = shortName + ' Election';
    }).catch(() => {});
  }

  container.innerHTML = `
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <aside class="no-print w-60 flex-shrink-0 glass border-r border-white/10 flex flex-col">
      <div class="p-5 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div id="layout-college-logo" class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">${cachedShort.charAt(0)}</div>
          <div>
            <p id="layout-college-name" class="font-bold text-white text-xs">${cachedShort} Election</p>
            <p class="text-slate-500 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>
      <nav class="flex-1 p-3 space-y-1">
        ${navItem('dashboard',   '📊', 'Dashboard',         activeSection)}
        ${navItem('schedule',    '📅', 'Election Schedule',  activeSection)}
        ${navItem('nominal-roll','📜', 'Nominal Roll',       activeSection)}
        ${navItem('posts',       '📋', 'Manage Posts',       activeSection)}
        ${navItem('direct-nomination', '📝', 'Direct Entry',  activeSection)}
        ${navItem('verify',      '✅', 'Verify Nominations', activeSection)}
        ${navItem('withdrawals', '↩️', 'Withdrawals',       activeSection)}
        ${navItem('publish',     '📢', 'Publish Lists',      activeSection)}
        ${navItem('booths',      '🏫', 'Polling Booths',     activeSection)}
        ${navItem('officials',   '👥', 'Election Officials', activeSection)}
        ${navItem('ballots',     '🗳️', 'Ballot Printing',    activeSection)}
        ${navItem('notices',     '🖨️', 'Notices, Posters & Prints', activeSection)}
        <div class="border-t border-white/10 my-2"></div>
        ${navItem('counting',    '🧮', 'Counting Setup',     activeSection)}
        ${navItem('results-entry','📥', 'Results Entry',      activeSection)}
        ${navItem('results',     '🏆', 'Election Results',    activeSection)}
        <div class="border-t border-white/10 my-2"></div>
        ${navItem('settings',    '⚙️', 'Settings',           activeSection)}
        ${navItem('backup',      '💾', 'Backup & Restore',   activeSection)}
        ${navItem('public',      '🌐', 'Public Portal',      activeSection)}
        <div class="border-t border-white/10 my-2"></div>
        ${navItem('testing',     '🧪', 'Testing Tools',      activeSection)}
        ${navItem('audit',       '🛡️', 'Internal Audit',     activeSection)}
      </nav>
      <div class="p-3 border-t border-white/10">
        <button id="logoutBtn" class="sidebar-item text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-h-screen overflow-auto">
      <header class="no-print border-b border-white/10 glass px-6 py-2.5 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <h2 class="font-semibold text-white capitalize text-base">${activeSection.replace(/-/g,' ')}</h2>
          <div id="adminGlobalSyncBadge"></div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-slate-500 hidden sm:inline">Logged in as Admin</span>
          <div class="h-4 w-[1px] bg-white/10 hidden sm:block"></div>
          ${getHeaderThemeControlsHtml()}
        </div>
      </header>
      <main id="adminMain" class="flex-1 p-6 overflow-auto">
        ${contentHtml}
      </main>
    </div>
  </div>`;

  // Attach Header Theme Controls
  setupHeaderThemeControls(container);

  // Live Admin Sync Status badge subscription
  const syncBadgeEl = container.querySelector('#adminGlobalSyncBadge');
  if (syncBadgeEl && api.subscribeAdminSync) {
    const unsub = api.subscribeAdminSync((state) => {
      if (!syncBadgeEl || !document.body.contains(syncBadgeEl)) return;
      const { count = 0, isSyncing = false, isOnline = true } = state || {};

      if (isSyncing) {
        syncBadgeEl.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <span class="spinner" style="width:10px;height:10px;border-width:2px;"></span>
            Syncing ${count > 0 ? `(${count})` : ''}...
          </span>
        `;
      } else if (count > 0 || !isOnline) {
        syncBadgeEl.innerHTML = `
          <div class="flex items-center gap-1.5">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isOnline ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'}">
              <span class="w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'}"></span>
              ${!isOnline ? 'Offline' : ''} ${count > 0 ? `${count} Queued` : 'No Internet'}
            </span>
            ${isOnline && count > 0 ? `
              <button id="btnHeaderAdminSync" class="btn btn-xs py-0.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full flex items-center gap-1 text-[11px] shadow-sm">
                <span>⚡</span> Sync Now
              </button>
            ` : ''}
          </div>
        `;
        syncBadgeEl.querySelector('#btnHeaderAdminSync')?.addEventListener('click', async () => {
          showToast('Syncing all changes to server...', 'info');
          try {
            await api.syncAdminNow();
            showToast('Sync completed successfully!', 'success');
          } catch (err) {
            showToast(`Sync failed: ${err.message}`, 'error');
          }
        });
      } else {
        syncBadgeEl.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Synced
          </span>
        `;
      }
    });

    if (router.registerCleanup) router.registerCleanup(unsub);
  }

  // Sidebar navigation
  container.querySelectorAll('[data-admin-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dest = btn.dataset.adminNav;
      if (dest === 'public') { router.navigate('/'); return; }
      router.navigate(`/admin/${dest}`);
    });
  });

  container.querySelector('#logoutBtn').addEventListener('click', async () => {
    try {
      const pwd = localStorage.getItem('adminPwd');
      if (pwd) await api.adminLogout(pwd);
    } catch (e) { console.error('Logout API failed:', e); }

    localStorage.removeItem('adminPwd');
    localStorage.removeItem('adminLoginDate');
    localStorage.removeItem('adminSessionToken');
    sessionStorage.removeItem('adminSessionToken');
    showToast('Logged out.', 'info');
    router.navigate('/');
  });
}

function navItem(section, icon, label, active) {
  return `
  <button data-admin-nav="${section}" class="sidebar-item ${active === section ? 'active' : ''}">
    <span>${icon}</span> ${label}
  </button>`;
}
