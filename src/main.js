/**
 * main.js - Application entry point
 * Sets up the router and background decorations, then starts the app.
 */
import './style.css';
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

// ─── Background decoration ────────────────────────────────────────────────────
const app = document.getElementById('app');
document.body.insertAdjacentHTML('afterbegin', `
  <div class="bg-blob bg-blob-1"></div>
  <div class="bg-blob bg-blob-2"></div>
  <div class="bg-blob bg-blob-3"></div>
`);

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
