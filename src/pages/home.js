import { api } from '../api.js';
import { esc } from '../utils.js';
import { CONFIG } from '../config.js';

export async function renderHome(container) {
  // Show loading state for year fetch
  container.innerHTML = `<div class="min-h-screen flex items-center justify-center"><span class="spinner"></span></div>`;
  
  let year = new Date().getFullYear();
  let collegeName = CONFIG.COLLEGE_NAME;
  let shortName = CONFIG.COLLEGE_SHORT_NAME;
  let schedule = {};
  let sets = {};

  try {
    const [fetchedSchedule, fetchedSets] = await Promise.all([
      api.getPublicSchedule().catch(() => ({})),
      api.getSettings().catch(() => ({}))
    ]);
    if (fetchedSchedule) schedule = fetchedSchedule;
    if (fetchedSets) sets = fetchedSets;
    if (schedule.electionYear) year = schedule.electionYear;
    if (sets.electionYear) year = sets.electionYear;
    if (sets.collegeName) collegeName = sets.collegeName;
    if (sets.collegeShortName) shortName = sets.collegeShortName;
  } catch(e) {
    console.warn('Failed to load schedule or settings for home page:', e);
  }

  try {
    const now = new Date();

    // 1. Nominal Roll
  const isRollFinal = sets.nominalRollFinalized === 'true' || sets.isRollFinalized === 'true' || schedule.isRollFinalized === 'true';
  const isDraftRoll = !isRollFinal && (sets.draftRollPublished === 'true' || schedule.draftRollPublished === 'true');
  let rollBadge = `<span class="badge bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[10px]">⏳ Unpublished</span>`;
  let rollDesc = 'View the official voter list for the election.';
  if (isRollFinal) {
    rollBadge = `<span class="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">🔒 Final List Live</span>`;
    rollDesc = 'Finalized nominal roll verified by Returning Officer.';
  } else if (isDraftRoll) {
    rollBadge = `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">📋 Draft Published</span>`;
    rollDesc = 'Draft nominal roll published for student verification.';
  }

  // 2. Submit Nomination
  const nomStart = schedule.nominationStart ? new Date(schedule.nominationStart) : null;
  const nomEnd = schedule.nominationDeadline ? new Date(schedule.nominationDeadline) : null;
  let nomBadge = '';
  let nomDesc = 'New nomination form with automatic eligibility check.';
  if (!isRollFinal) {
    nomBadge = `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">⏳ Awaiting Final Roll</span>`;
    nomDesc = 'Opens only after the Final Nominal Roll is published.';
  } else if (nomStart && !isNaN(nomStart.getTime()) && now < nomStart) {
    nomBadge = `<span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">📅 Opens ${nomStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>`;
    nomDesc = `Filing begins on ${nomStart.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.`;
  } else if (nomEnd && !isNaN(nomEnd.getTime()) && now > nomEnd) {
    nomBadge = `<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">🔴 Filing Closed</span>`;
    nomDesc = 'The official deadline for filing nominations has passed.';
  } else {
    nomBadge = `<span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">🟢 Open Now</span>`;
    nomDesc = 'Submit your candidate nomination online.';
  }

  // 3. Find My Nomination
  const findBadge = `<span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">🔍 Lookup</span>`;

  // 4. Withdraw Nomination
  const isValidPublished = sets.validListPublished === 'true' || schedule.validListPublished === 'true';
  const withStart = schedule.withdrawalStart ? new Date(schedule.withdrawalStart) : null;
  const withEnd = schedule.withdrawalEnd ? new Date(schedule.withdrawalEnd) : null;
  let withBadge = '';
  let withDesc = 'Submit formal withdrawal of your candidature.';
  if (!isValidPublished) {
    withBadge = `<span class="badge bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[10px]">⏳ Awaiting Scrutiny</span>`;
    withDesc = 'Opens after the Valid Nominations List is published.';
  } else if (withStart && !isNaN(withStart.getTime()) && now < withStart) {
    withBadge = `<span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">📅 Opens ${withStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>`;
    withDesc = `Opens on ${withStart.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.`;
  } else if (withEnd && !isNaN(withEnd.getTime()) && now > withEnd) {
    withBadge = `<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">🔴 Closed</span>`;
    withDesc = 'The official deadline for withdrawals has ended.';
  } else {
    withBadge = `<span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">🟢 Open Now</span>`;
    withDesc = 'Withdraw your nomination with admission number verification.';
  }

  // 5. Valid Nominations
  const validBadge = isValidPublished 
    ? `<span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">🟢 Published</span>`
    : `<span class="badge bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[10px]">⏳ Pending Scrutiny</span>`;

  // 6. Final Candidate List
  const isFinalPublished = sets.finalListPublished === 'true' || schedule.finalListPublished === 'true';
  const finalBadge = isFinalPublished
    ? `<span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">🏆 Published</span>`
    : `<span class="badge bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[10px]">⏳ Pending Final List</span>`;

  // 7. Live Results
  const isResultsPublished = sets.resultsPublished === 'true' || schedule.resultsPublished === 'true';
  const isCountingActive = sets.countingActive === 'true' || schedule.countingActive === 'true';
  let resultsBadge = '';
  let resultsDesc = 'View live vote counting and official declarations.';
  if (isResultsPublished) {
    resultsBadge = `<span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">📢 Results Declared</span>`;
    resultsDesc = 'Official election results published and verified.';
  } else if (isCountingActive) {
    resultsBadge = `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] animate-pulse">🗳️ Counting in Progress</span>`;
    resultsDesc = 'Live vote counting is currently underway.';
  } else {
    resultsBadge = `<span class="badge bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[10px]">⏳ Awaiting Counting</span>`;
    resultsDesc = 'Check back when counting commences.';
  }

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

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${card('/notices', '📢', 'Notices & Booth Info', 'Find where to vote, polling booth allotments, and official notifications.', `<span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">📢 Official Board</span>`)}
          ${card('/nominal-roll', '📜', 'Nominal Roll', rollDesc, rollBadge)}
          ${card('/submit', '📝', 'Submit Nomination', nomDesc, nomBadge)}
          ${card('/find',   '🔍', 'Find My Nomination', 'Retrieve and print your submitted nomination form.', findBadge)}
          ${card('/withdraw', '↩️', 'Withdraw Nomination', withDesc, withBadge)}
          ${card('/valid-list', '✅', 'Valid Nominations', 'List of verified candidates before withdrawal.', validBadge)}
          ${card('/final-list', '🏆', 'Final Candidate List', 'Approved final candidate list for ballot.', finalBadge)}
          ${card('/results', '📊', 'Live Results', resultsDesc, resultsBadge)}
        </div>
      </main>

      <footer class="py-12 border-t border-white/5 text-center text-slate-500 text-sm">
        <p>&copy; Magnolia 🌸</p>
      </footer>
    </div>
  `;
  } catch (err) {
    console.error('Error rendering home page:', err);
    container.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div class="glass p-8 rounded-2xl max-w-lg border border-red-500/20">
          <h2 class="text-2xl font-bold text-white mb-2">College Union Election Portal</h2>
          <p class="text-slate-400 mb-6">Unable to render dashboard cards right now.</p>
          <button data-nav="/" class="btn btn-primary" onclick="window.location.reload()">Reload</button>
        </div>
      </div>
    `;
  }
}

function card(nav, icon, title, desc, badgeHtml = '') {
  return `
  <div data-nav="${nav}" class="glass p-6 rounded-2xl hover:bg-white/5 transition group cursor-pointer border border-white/5 hover:border-indigo-500/30 flex flex-col justify-between">
    <div>
      <div class="flex items-center justify-between mb-4">
        <div class="text-3xl transform group-hover:scale-110 transition duration-300">${icon}</div>
        ${badgeHtml ? `<div>${badgeHtml}</div>` : ''}
      </div>
      <h3 class="text-lg font-bold text-white mb-2 group-hover:text-indigo-300 transition">${esc(title)}</h3>
      <p class="text-sm text-slate-400 leading-relaxed">${esc(desc)}</p>
    </div>
    <div class="mt-6 flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition">
      Continue <span>→</span>
    </div>
  </div>`;
}
