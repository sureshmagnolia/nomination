import { api } from '../api.js';
import { esc } from '../utils.js';

export async function renderHome(container) {
  // Show loading state for year fetch
  container.innerHTML = `<div class="min-h-screen flex items-center justify-center"><span class="spinner"></span></div>`;
  
  let year = new Date().getFullYear();
  let collegeName = 'Government Victoria College, Palakkad';
  let shortName = 'GVC';

  try {
    const [schedule, sets] = await Promise.all([
      api.getPublicSchedule(),
      api.getSettings().catch(() => ({}))
    ]);
    if (schedule.electionYear) year = schedule.electionYear;
    if (sets.collegeName) collegeName = sets.collegeName;
    if (sets.collegeShortName) shortName = sets.collegeShortName;
  } catch(e) {}

  container.innerHTML = `
    <div class="page-enter min-h-screen flex flex-col">
      <header class="glass sticky top-0 z-50 border-b border-white/10">
        <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">${shortName.charAt(0)}</div>
            <h1 class="text-xl font-bold text-white tracking-tight">${esc(shortName)} Election Portal ${year}</h1>
          </div>
          <button data-nav="/admin" class="btn btn-secondary btn-sm flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            Admin Login
          </button>
        </div>
      </header>

      <main class="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <div class="text-center mb-16 space-y-4">
          <h2 class="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
            College Union <br/>
            <span class="gradient-text">Election Management ${year}</span>
          </h2>
          <p class="text-slate-400 text-lg max-w-2xl mx-auto">
            Welcome to the official election portal of ${esc(collegeName)}. 
            Submit your nominations, track status, and view the finalized candidate lists for the year ${year}.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${card('/nominal-roll', '📜', 'Nominal Roll', 'View the official voter list (Draft/Final).')}
          ${card('/submit', '📝', 'Submit Nomination', 'New nomination form with eligibility check.')}
          ${card('/find',   '🔍', 'Find My Nomination', 'Retrieve and print your submitted nomination.')}
          ${card('/withdraw', '↩️', 'Withdraw Nomination', 'Request withdrawal of your candidacy.')}
          ${card('/valid-list', '✅', 'Valid Nominations', 'View the list of verified candidates.')}
          ${card('/final-list', '🏆', 'Final Candidate List', 'View the final list post-withdrawals.')}
          ${card('/results', '📊', 'Live Results', 'View live vote counting and election results.')}
        </div>
      </main>

      <footer class="py-12 border-t border-white/5 text-center text-slate-500 text-sm">
        <p>&copy; Magnolia 🌸</p>
      </footer>
    </div>
  `;
}

function card(nav, icon, title, desc) {
  return `
  <div data-nav="${nav}" class="glass p-6 rounded-2xl hover:bg-white/5 transition group cursor-pointer border border-white/5 hover:border-indigo-500/30">
    <div class="text-3xl mb-4 transform group-hover:scale-110 transition duration-300">${icon}</div>
    <h3 class="text-lg font-bold text-white mb-2 group-hover:text-indigo-300 transition">${esc(title)}</h3>
    <p class="text-sm text-slate-400 leading-relaxed">${esc(desc)}</p>
    <div class="mt-6 flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition">
      Continue <span>→</span>
    </div>
  </div>`;
}
