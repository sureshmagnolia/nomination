/**
 * pages/admin/layout.js
 * Shared admin layout with sidebar navigation.
 * Guards against unauthenticated access.
 */
import { router } from '../../router.js';
import { showToast } from '../../utils.js';

export function getAdminPassword() {
  const pwd = localStorage.getItem('adminPwd');
  const loginDate = localStorage.getItem('adminLoginDate');
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  if (!pwd || loginDate !== today) {
    if (pwd) {
      // Clean up expired session
      localStorage.removeItem('adminPwd');
      localStorage.removeItem('adminLoginDate');
      showToast('Daily session expired. Please log in again.', 'warning');
    }
    router.navigate('/admin');
    return null;
  }
  return pwd;
}

export function renderAdminLayout(container, activeSection, contentHtml) {
  container.innerHTML = `
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <aside class="no-print w-60 flex-shrink-0 glass border-r border-white/10 flex flex-col">
      <div class="p-5 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">G</div>
          <div>
            <p class="font-bold text-white text-xs">GVC Election</p>
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
        ${navItem('ballots',     '🗳️', 'Ballot Printing',    activeSection)}
        <div class="border-t border-white/10 my-2"></div>
        ${navItem('counting',    '🧮', 'Counting Setup',     activeSection)}
        ${navItem('results-entry','📥', 'Results Entry',      activeSection)}
        <div class="border-t border-white/10 my-2"></div>
        ${navItem('public',      '🌐', 'Public Portal',      activeSection)}
        <div class="border-t border-white/10 my-2"></div>
        ${navItem('testing',     '🧪', 'Testing Tools',      activeSection)}
      </nav>
      <div class="p-3 border-t border-white/10">
        <button id="logoutBtn" class="sidebar-item text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-h-screen overflow-auto">
      <header class="no-print border-b border-white/10 glass px-6 py-3 flex items-center justify-between flex-shrink-0">
        <h2 class="font-semibold text-white capitalize">${activeSection.replace(/-/g,' ')}</h2>
        <span class="text-xs text-slate-500">Logged in as Admin</span>
      </header>
      <main id="adminMain" class="flex-1 p-6 overflow-auto">
        ${contentHtml}
      </main>
    </div>
  </div>`;

  // Sidebar navigation
  container.querySelectorAll('[data-admin-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dest = btn.dataset.adminNav;
      if (dest === 'public') { router.navigate('/'); return; }
      router.navigate(`/admin/${dest}`);
    });
  });

  container.querySelector('#logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('adminPwd');
    localStorage.removeItem('adminLoginDate');
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
