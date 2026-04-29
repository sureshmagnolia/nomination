/**
 * main.js - Application entry point
 * Sets up the router and background decorations, then starts the app.
 */
import './style.css';
import { CONFIG } from './config.js';
import { router } from './router.js';
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
  .on('/admin',             render(renderAdminLogin))
  .on('/admin/dashboard',   render(renderAdminDashboard))
  .on('/admin/verify',      render(renderAdminVerify))
  .on('/admin/withdrawals', render(renderAdminWithdrawals))
  .on('/admin/publish',     render(renderAdminPublish))
  .on('/admin/posts',       render(renderAdminPosts))
  .on('/admin/booths',      render(renderAdminBooths))
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
