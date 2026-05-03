/**
 * main.js - Application entry point
 * Sets up the router and background decorations, then starts the app.
 */
import './style.css';
import { CONFIG } from './config.js';
import { router } from './router.js';
import { api, setSyncStatusCallback } from './api.js';
import { renderHome }               from './pages/home.js';
import { renderSubmitNomination }   from './pages/submitNomination.js';
import { renderFindNomination }     from './pages/findNomination.js';
import { renderValidList }          from './pages/validList.js';
import { renderFinalList }          from './pages/finalList.js';
import { renderWithdraw }           from './pages/withdraw.js';
import { renderAdminLogin }         from './pages/admin/login.js';
import { renderAdminDashboard }     from './pages/admin/dashboard.js';
import { renderAdminVerify }        from './pages/admin/verify.js';
import { renderAdminWithdrawals }   from './pages/admin/withdrawals.js';
import { renderAdminPublish }       from './pages/admin/publish.js';
import { renderAdminPosts }         from './pages/admin/posts.js';
import { renderAdminBooths }        from './pages/admin/booths.js';
import { renderAdminCounting }      from './pages/admin/counting.js';
import { renderAdminResultsEntry }  from './pages/admin/resultsEntry.js';
import { renderAdminBallots }      from './pages/admin/ballots.js';
import { renderAdminTesting }      from './pages/admin/testing.js';
import { renderAdminResults }      from './pages/admin/results.js';
import { renderResults }            from './pages/results.js';
import { renderNominalRoll }        from './pages/nominalRoll.js';
import { renderAdminNominalRoll }   from './pages/admin/nominalRoll.js';
import { renderAdminSchedule }      from './pages/admin/schedule.js';
import { renderAdminDirectNomination } from './pages/admin/directNomination.js';
import { renderAdminAudit }          from './pages/admin/audit.js';

// ─── Background decoration ────────────────────────────────────────────────────
const app = document.getElementById('app');
document.body.insertAdjacentHTML('afterbegin', `
  <div class="bg-blob bg-blob-1"></div>
  <div class="bg-blob bg-blob-2"></div>
  <div class="bg-blob bg-blob-3"></div>
`);

// ─── Setup warning banner ─────────────────────────────────────────────────────
if (CONFIG.APPS_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
  document.body.insertAdjacentHTML('afterbegin', `
    <div id="setup-banner" style="
      position:fixed;top:0;left:0;right:0;z-index:9999;
      background:#dc2626;color:white;text-align:center;
      padding:0.75rem 1rem;font-size:0.85rem;font-weight:600;
      font-family:Inter,sans-serif;
    ">
      ⚙️ Setup Required: Open <code style="background:rgba(0,0,0,0.3);padding:0.1rem 0.4rem;border-radius:4px;">src/config.js</code>
      and replace <code style="background:rgba(0,0,0,0.3);padding:0.1rem 0.4rem;border-radius:4px;">YOUR_SCRIPT_ID</code>
      with your Google Apps Script Web App URL, then rebuild &amp; push.
    </div>
  `);
  document.getElementById('app').style.marginTop = '48px';
}

// ─── Router setup ─────────────────────────────────────────────────────────────
const render = (fn) => (params) => {
  app.innerHTML = '';
  fn(app, params);
};

router
  .on('/',                  render(renderHome))
  .on('/submit',            render(renderSubmitNomination))
  .on('/find',              render(renderFindNomination))
  .on('/valid-list',        render(renderValidList))
  .on('/final-list',        render(renderFinalList))
  .on('/withdraw',          render(renderWithdraw))
  .on('/results',           render(renderResults))
  .on('/nominal-roll',      render(renderNominalRoll))
  .on('/admin',             render(renderAdminLogin))
  .on('/admin/dashboard',   render(renderAdminDashboard))
  .on('/admin/verify',      render(renderAdminVerify))
  .on('/admin/withdrawals', render(renderAdminWithdrawals))
  .on('/admin/publish',     render(renderAdminPublish))
  .on('/admin/posts',       render(renderAdminPosts))
  .on('/admin/ballots',     render(renderAdminBallots))
  .on('/admin/booths',      render(renderAdminBooths))
  .on('/admin/counting',    render(renderAdminCounting))
  .on('/admin/results-entry', render(renderAdminResultsEntry))
  .on('/admin/results',       render(renderAdminResults))
  .on('/admin/nominal-roll', render(renderAdminNominalRoll))
  .on('/admin/schedule',     render(renderAdminSchedule))
  .on('/admin/direct-nomination', render(renderAdminDirectNomination))
  .on('/admin/testing',     render(renderAdminTesting))
  .on('/admin/audit',       render(renderAdminAudit))
  .setDefault('/');

// Handle clicks on data-nav attributes globally (delegation)
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-nav]');
  if (el) {
    e.preventDefault();
    router.navigate(el.dataset.nav);
  }
});

router.start();

// ─── Background Sync UI & Init ────────────────────────────────────────────────
document.body.insertAdjacentHTML('beforeend', `
  <div id="sync-status" class="fixed top-4 right-4 z-[9999] bg-black/80 backdrop-blur border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 text-xs font-medium text-white shadow-xl transition-all duration-300 transform translate-y-[-150%] opacity-0">
    <span id="sync-icon" class="animate-spin inline-block">🔄</span>
    <span id="sync-text">Saving changes...</span>
  </div>
`);

const syncUI = document.getElementById('sync-status');
const syncIcon = document.getElementById('sync-icon');
const syncText = document.getElementById('sync-text');

setSyncStatusCallback((status) => {
  if (status === 'saving') {
    syncUI.classList.remove('translate-y-[-150%]', 'opacity-0');
    syncUI.classList.add('translate-y-0', 'opacity-100');
    syncIcon.className = 'animate-spin inline-block text-indigo-400';
    syncIcon.innerHTML = '&#8635;'; // refresh icon
    syncText.innerText = 'Saving changes...';
  } else if (status === 'saved') {
    syncIcon.className = 'inline-block text-emerald-400';
    syncIcon.innerHTML = '&#10003;'; // check icon
    syncText.innerText = 'All changes saved';
  } else if (status === 'idle') {
    syncUI.classList.remove('translate-y-0', 'opacity-100');
    syncUI.classList.add('translate-y-[-150%]', 'opacity-0');
  }
});

// Initialize public data proactively
api.initPublicData();
