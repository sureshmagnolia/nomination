/**
 * pages/home.js  - Public landing page
 */
import { router } from '../router.js';

export function renderHome(container) {
  container.innerHTML = `
  <div class="page-enter min-h-screen flex flex-col">
    <!-- Header -->
    <header class="no-print relative z-10 border-b border-white/10 glass">
      <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">G</div>
          <div>
            <div class="font-bold text-white text-sm leading-tight">Government Victoria College</div>
            <div class="text-xs text-slate-400">Palakkad · College Union Election</div>
          </div>
        </div>
        <button id="adminBtn" class="btn btn-secondary text-xs">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          Admin Login
        </button>
      </div>
    </header>

    <!-- Hero -->
    <section class="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6 uppercase tracking-widest">
        ✦ 2025 College Union Elections
      </div>
      <h1 class="text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
        Election <span class="gradient-text">Portal</span>
      </h1>
      <p class="text-slate-400 text-lg max-w-xl mb-12">
        Submit your nomination, track its status, and participate in the democratic process of your college union.
      </p>

      <!-- Action cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        ${card('submit', '📝', 'Submit Nomination', 'Fill and submit your nomination form with proposer and seconder details.', 'btn-primary')}
        ${card('find', '🔍', 'Find My Nomination', 'Retrieve a submitted nomination using your 10-digit unique ID.', 'btn-secondary')}
        ${card('valid-list', '📋', 'Valid Nominations', 'View the officially published list of valid nominations.', 'btn-secondary')}
        ${card('withdraw', '↩️', 'Withdraw Nomination', 'Submit a withdrawal request for a valid nomination.', 'btn-secondary')}
        ${card('final-list', '🏁', 'Final List', 'View the final list of candidates after withdrawals.', 'btn-secondary')}
      </div>
    </section>

    <footer class="no-print relative z-10 text-center py-4 text-slate-600 text-xs border-t border-white/5">
      Government Victoria College Palakkad · College Union Election Management System
    </footer>
  </div>`;

  container.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => router.navigate(el.dataset.nav));
  });
  container.querySelector('#adminBtn').addEventListener('click', () => router.navigate('/admin'));
}

function card(nav, icon, title, desc, btnClass) {
  return `
  <div class="glass rounded-2xl p-6 flex flex-col items-start gap-4 hover:border-white/20 transition-all cursor-pointer group" data-nav="/${nav}">
    <div class="text-3xl">${icon}</div>
    <div>
      <h3 class="font-bold text-white text-lg group-hover:text-indigo-300 transition-colors">${title}</h3>
      <p class="text-slate-400 text-sm mt-1">${desc}</p>
    </div>
    <button class="btn ${btnClass} btn-sm mt-auto w-full" data-nav="/${nav}">${title} →</button>
  </div>`;
}
