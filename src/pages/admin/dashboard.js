/**
 * pages/admin/dashboard.js
 * Comprehensive Executive Command Center & Election Operational Dashboard.
 * Overhauled to provide full statutory lifecycle tracking, voter roll analytics,
 * candidate battlegrounds, polling infrastructure, and quick command shortcuts.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { 
  esc, 
  showToast, 
  sortPosts, 
  isAssocPost, 
  isYearRepPost, 
  normalizePostName,
  getStudentYearLevel 
} from '../../utils.js';
import { CONFIG } from '../../config.js';
import { openOathModal } from '../../oathPrinter.js';

export async function renderAdminDashboard(container) {
  const pwd = getAdminPassword();
  if (!pwd) return;

  renderAdminLayout(container, 'dashboard', `
    <div class="text-center py-20">
      <span class="spinner" style="width:3rem;height:3rem;border-width:4px;"></span>
      <p class="text-slate-300 font-semibold mt-4 text-base">Initializing Election Command Center...</p>
      <p class="text-slate-500 text-xs mt-1">Aggregating voter rolls, nominations, posts, and polling infrastructure...</p>
    </div>
  `);

  await loadDashboardData(container, pwd);
}

async function loadDashboardData(container, pwd) {
  const main = container.querySelector('#adminMain');
  if (!main) return;

  try {
    const [noms, settings, schedule, posts, nominalRoll, booths, resultsResp] = await Promise.all([
      api.adminGetNominations(pwd, true).catch(() => []),
      api.adminGetSettings(pwd).catch(() => ({})),
      api.getPublicSchedule().catch(() => ({})),
      api.getPosts().catch(() => []),
      api.getNominalRoll().catch(() => []),
      api.adminGetBooths(pwd).catch(() => []),
      api.adminGetResults(pwd, false).catch(() => api.getResults(false).catch(() => []))
    ]);

    renderDashboardContent(main, pwd, {
      noms: Array.isArray(noms) ? noms : (noms?.nominations || []),
      settings: settings || {},
      schedule: schedule || {},
      posts: Array.isArray(posts) ? posts : (posts?.posts || CONFIG.DEFAULT_POSTS || []),
      nominalRoll: Array.isArray(nominalRoll) ? nominalRoll : [],
      booths: Array.isArray(booths) ? booths : [],
      results: resultsResp || []
    });
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    main.innerHTML = `
      <div class="glass p-8 rounded-3xl border border-rose-500/30 text-center max-w-lg mx-auto my-12 shadow-2xl">
        <div class="text-4xl mb-3">📡</div>
        <h3 class="text-xl font-bold text-rose-300">Data Synchronization Issue</h3>
        <p class="text-slate-400 text-sm mt-2">Could not retrieve live dashboard feeds from the server.</p>
        <p class="text-slate-500 text-xs mt-1 font-mono">${esc(err.message || 'Network error')}</p>
        <div class="mt-6 flex justify-center gap-3">
          <button id="btnRetryDashboard" class="btn btn-primary text-xs font-bold py-2.5 px-6 rounded-xl">
            🔄 Retry Synchronization
          </button>
        </div>
      </div>
    `;
    main.querySelector('#btnRetryDashboard')?.addEventListener('click', () => loadDashboardData(container, pwd));
  }
}

function renderDashboardContent(main, pwd, data) {
  const { noms, settings, schedule, posts, nominalRoll, booths, results } = data;

  // ─── STATUTORY VOTER ROLL METRICS ───────────────────────────────────────────
  const totalVoters = nominalRoll.length;
  let ugVoters = 0;
  let pgVoters = 0;
  let rsVoters = 0;
  const deptSet = new Set();
  const classSet = new Set();

  nominalRoll.forEach(s => {
    const cls = s['CLASS'] || s['class'] || '';
    const dept = s['Dept'] || s['dept'] || '';
    const sl = String(s['Nominal Roll Serial Number'] || s['serial_number'] || '').toUpperCase();
    if (dept) deptSet.add(dept.trim());
    if (cls) classSet.add(cls.trim());

    const cUpper = String(cls).toUpperCase();
    if (cUpper.includes('RESEARCH') || cUpper.includes('SCHOLAR') || cUpper.includes('PHD') || sl.startsWith('RS')) {
      rsVoters++;
    } else {
      const lvl = getStudentYearLevel(cls);
      if (lvl.endsWith('_UG')) ugVoters++;
      else if (lvl.endsWith('_PG')) pgVoters++;
      else ugVoters++;
    }
  });

  const isRollFinal = settings.nominalRollFinalized === 'true' || settings.isRollFinalized === 'true';
  const isDraftRollPub = settings.draftRollPublished === 'true';

  // ─── POSTS BREAKDOWN ────────────────────────────────────────────────────────
  const totalPosts = posts.length;
  const generalPosts = posts.filter(p => !isAssocPost(p) && !isYearRepPost(p));
  const assocPosts = posts.filter(isAssocPost);
  const yearRepPosts = posts.filter(isYearRepPost);

  // ─── NOMINATIONS & SCRUTINY OVERVIEW ─────────────────────────────────────────
  const totalNoms = noms.length;
  const pendingNoms = noms.filter(n => n.status === 'Pending').length;
  const validNoms = noms.filter(n => n.status === 'Valid').length;
  const rejectedNoms = noms.filter(n => n.status === 'Rejected').length;
  const withdrawnApproved = noms.filter(n => n.withdrawalStatus === 'Approved').length;
  const withdrawalPending = noms.filter(n => n.withdrawalStatus === 'Requested' || n.withdrawalStatus === 'Pending').length;
  const physicalReceived = noms.filter(n => n.physicalReceived === true || n.physical_received === true).length;

  // Active Candidates in race (Valid and not officially withdrawn)
  const activeCandidates = noms.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');

  // Contest status across all posts
  let uncontestedPostsCount = 0;
  let contestedPostsCount = 0;
  let vacantPostsCount = 0;

  posts.forEach(p => {
    const postName = typeof p === 'string' ? p : (p.post || p.name);
    const isUUC = String(postName).toUpperCase().includes('UUC') || String(postName).toUpperCase().includes('UNIVERSITY');
    const cands = activeCandidates.filter(n => String(n.post).trim().toLowerCase() === String(postName).trim().toLowerCase());
    if (cands.length === 0) {
      vacantPostsCount++;
    } else if (isUUC) {
      if (cands.length <= 2) uncontestedPostsCount++;
      else contestedPostsCount++;
    } else {
      if (cands.length === 1) uncontestedPostsCount++;
      else contestedPostsCount++;
    }
  });

  // ─── POLLING INFRASTRUCTURE ──────────────────────────────────────────────────
  const totalBooths = booths.length;
  const mappedClassesSet = new Set();
  let totalBoothAllocatedVoters = 0;
  booths.forEach(b => {
    if (Array.isArray(b.classes)) b.classes.forEach(c => mappedClassesSet.add(c));
    totalBoothAllocatedVoters += Number(b.voterCount || b.votersCount || 0);
  });
  const bindingMode = (settings.ballot_binding_mode || 'definite') === 'definite' ? 'Definite Uniform' : 'Precise Custom';
  const bookSize = settings.ballot_book_size || 50;

  // ─── RESULTS & OUTCOME ───────────────────────────────────────────────────────
  const isResultsPublished = (settings.resultsPublished === 'true') || (schedule.resultsPublished === 'true');
  const isCountingActive = (settings.countingActive === 'true');
  const isResultsLocked = (settings.resultsLocked === 'true');

  const resultsList = Array.isArray(results) ? results : (results?.results || []);
  let totalDeclaredWinners = 0;
  resultsList.forEach(r => {
    if (Array.isArray(r.winners) && r.winners.length > 0) {
      totalDeclaredWinners += r.winners.length;
    }
  });

  // ─── ACTIVE LIFECYCLE STAGE ─────────────────────────────────────────────────
  let currentStage = {
    badge: 'Stage 0 • Pre-Election Planning',
    title: 'Pre-Election Institutional Preparation',
    desc: 'Statutory election notification, schedule ratification, and nominal roll upload.',
    color: 'from-slate-700/40 to-slate-900/60 border-slate-600/30 text-slate-300',
    dot: 'bg-slate-400'
  };

  if (isResultsPublished) {
    currentStage = {
      badge: 'Stage 3 • Election Concluded',
      title: 'Official Election Results Declared & Published',
      desc: 'Counting completed and results published. Swearing-in Ceremony Oaths (സത്യപ്രതിജ്ഞ) are ready for print.',
      color: 'from-emerald-500/20 to-emerald-950/40 border-emerald-500/40 text-emerald-300',
      dot: 'bg-emerald-400 animate-pulse'
    };
  } else if (isCountingActive) {
    currentStage = {
      badge: 'Stage 2 • Counting Live',
      title: 'Official Vote Counting in Progress',
      desc: 'Table counting underway with official ledgers, candidate agents, and Returning Officer audit.',
      color: 'from-purple-500/20 to-purple-950/40 border-purple-500/40 text-purple-300',
      dot: 'bg-purple-400 animate-pulse'
    };
  } else if (settings.pollingActive === 'true' || schedule.isPollingActive) {
    currentStage = {
      badge: 'Stage 1 • Polling Day',
      title: 'Secret Ballot Voting in Progress',
      desc: 'Polling booths operational across academic blocks. Class electors casting official ballots.',
      color: 'from-cyan-500/20 to-cyan-950/40 border-cyan-500/40 text-cyan-300',
      dot: 'bg-cyan-400 animate-pulse'
    };
  } else if (settings.finalListPublished === 'true') {
    currentStage = {
      badge: 'Phase 5 • Final Contestants Ready',
      title: 'Final Contestants List Declared & Published',
      desc: 'Withdrawals finalized. Ballot booklets packaging and booth polling rosters ready for printing.',
      color: 'from-emerald-500/20 to-slate-900/40 border-emerald-500/30 text-emerald-300',
      dot: 'bg-emerald-400'
    };
  } else if (settings.withdrawalOpen === 'true' || schedule.isWithActive) {
    currentStage = {
      badge: 'Phase 4 • Withdrawals',
      title: 'Nomination Withdrawal Window Active',
      desc: 'Statutory window for candidates submitting voluntary withdrawal notices to the Returning Officer.',
      color: 'from-indigo-500/20 to-indigo-950/40 border-indigo-500/30 text-indigo-300',
      dot: 'bg-indigo-400 animate-pulse'
    };
  } else if (settings.validListPublished === 'true') {
    currentStage = {
      badge: 'Phase 3 • Scrutiny Complete',
      title: 'Valid Nominations List Published',
      desc: 'Returning Officer scrutiny complete. Provisional valid candidate list open for scrutiny and withdrawals.',
      color: 'from-sky-500/20 to-sky-950/40 border-sky-500/30 text-sky-300',
      dot: 'bg-sky-400'
    };
  } else if (settings.nominationOpen === 'true' || schedule.isNomActive) {
    currentStage = {
      badge: 'Phase 2 • Nominations Live',
      title: 'Nomination Submission Window Open',
      desc: 'Eligible student candidates submitting nominations and delivering signed physical forms.',
      color: 'from-amber-500/20 to-amber-950/40 border-amber-500/30 text-amber-300',
      dot: 'bg-amber-400 animate-pulse'
    };
  } else if (isRollFinal) {
    currentStage = {
      badge: 'Phase 1 • Electoral Roll Locked',
      title: 'Final Nominal Roll Certified',
      desc: 'Electoral college finalized and locked. Campus ready for statutory nomination submission window.',
      color: 'from-indigo-500/20 to-slate-900/40 border-indigo-500/30 text-indigo-300',
      dot: 'bg-indigo-400'
    };
  } else if (isDraftRollPub) {
    currentStage = {
      badge: 'Phase 0 • Draft Roll Review',
      title: 'Draft Nominal Roll Published',
      desc: 'Draft electoral roll published for student inspection, claims, and correction requests.',
      color: 'from-amber-500/20 to-slate-900/40 border-amber-500/30 text-amber-300',
      dot: 'bg-amber-400'
    };
  }

  // ─── DERIVED COLLEGE & ACADEMIC YEAR INFO ────────────────────────────────────
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME || 'Government College Chittur, Palakkad';
  const collegeShort = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME || 'GCC';
  const electionYear = settings.electionYear || schedule.electionYear || new Date().getFullYear().toString();
  const academicYear = settings.academicYear || `${electionYear} - ${Number(electionYear) + 1}`;

  // ─── DEPARTMENT ENGAGEMENT CALCULATION ──────────────────────────────────────
  const deptCounts = {};
  noms.forEach(n => {
    const d = n.candidateDept || n.candidate_dept || 'Unassigned';
    deptCounts[d] = (deptCounts[d] || 0) + 1;
  });
  const sortedDepts = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxDeptNoms = sortedDepts[0]?.[1] || 1;

  // ─── SCRUTINY FUNNEL PERCENTAGES ───────────────────────────────────────────
  const validPct = totalNoms > 0 ? Math.round((validNoms / totalNoms) * 100) : 0;
  const pendingPct = totalNoms > 0 ? Math.round((pendingNoms / totalNoms) * 100) : 0;
  const rejectedPct = totalNoms > 0 ? Math.round((rejectedNoms / totalNoms) * 100) : 0;
  const withdrawnPct = totalNoms > 0 ? Math.round((withdrawnApproved / totalNoms) * 100) : 0;

  main.innerHTML = `
    <div class="page-enter space-y-7 max-w-7xl mx-auto">
      
      <!-- ── TOP EXECUTIVE BANNER & STATUS PULSE ────────────────────────────── -->
      <div class="glass rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl relative overflow-hidden bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90">
        <div class="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-16 -bottom-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase border ${currentStage.color}">
                <span class="w-2 h-2 rounded-full ${currentStage.dot}"></span>
                ${currentStage.badge}
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/5 text-slate-300 border border-white/10">
                Academic Year ${esc(academicYear)}
              </span>
              ${!navigator.onLine ? `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  <span>📡</span> Offline (IndexedDB)
                </span>` : ''}
            </div>

            <div>
              <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                <span>${esc(collegeShort)} Election Command Center</span>
                <span class="text-xs font-mono font-normal text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                  ${esc(electionYear)}
                </span>
              </h2>
              <p class="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                ${esc(collegeName)} • ${currentStage.desc}
              </p>
            </div>
          </div>

          <!-- Quick Action Buttons on Header -->
          <div class="flex flex-wrap items-center gap-2.5 shrink-0">
            <button id="btnDashboardRefresh" class="btn btn-secondary text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 hover:border-indigo-500/40 transition shadow-sm">
              <span id="refreshIcon">🔄</span> Refresh Feed
            </button>
            <button id="btnHeaderOaths" class="btn bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition transform hover:-translate-y-0.5">
              <span>📜</span>
              <span>Swearing-in Oaths</span>
              ${isResultsPublished ? `<span class="bg-white/20 text-[10px] font-mono px-1.5 py-0.5 rounded">Ready</span>` : ''}
            </button>
          </div>
        </div>
      </div>

      <!-- ── 6 CORE STATUTORY PERFORMANCE METRICS (KPIs) ────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        <!-- 1. Registered Voters -->
        <div class="glass p-5 rounded-2xl border border-white/10 hover:border-indigo-500/40 transition group relative overflow-hidden flex flex-col justify-between">
          <div class="space-y-1">
            <div class="flex items-center justify-between text-slate-400 text-xs">
              <span class="font-bold uppercase tracking-wider text-[10px]">Electoral Roll</span>
              <span class="text-lg">📜</span>
            </div>
            <div class="text-2xl font-black text-white group-hover:text-indigo-300 transition">
              ${totalVoters.toLocaleString()}
            </div>
          </div>
          <div class="pt-3 border-t border-white/5 space-y-1 text-[11px] text-slate-400">
            <div class="flex items-center justify-between">
              <span>UG: <strong class="text-slate-200">${ugVoters}</strong></span>
              <span>PG: <strong class="text-slate-200">${pgVoters}</strong></span>
              <span>RS: <strong class="text-slate-200">${rsVoters}</strong></span>
            </div>
            <div class="flex items-center justify-between text-[10px] font-mono">
              <span class="text-slate-500">${deptSet.size} Depts • ${classSet.size} Classes</span>
              <span class="${isRollFinal ? 'text-emerald-400' : (isDraftRollPub ? 'text-amber-400' : 'text-slate-500')}">
                ${isRollFinal ? '● Finalized' : (isDraftRollPub ? '● Draft' : '○ Pending')}
              </span>
            </div>
          </div>
        </div>

        <!-- 2. Union Posts -->
        <div class="glass p-5 rounded-2xl border border-white/10 hover:border-indigo-500/40 transition group relative overflow-hidden flex flex-col justify-between">
          <div class="space-y-1">
            <div class="flex items-center justify-between text-slate-400 text-xs">
              <span class="font-bold uppercase tracking-wider text-[10px]">Union Posts</span>
              <span class="text-lg">📋</span>
            </div>
            <div class="text-2xl font-black text-white group-hover:text-indigo-300 transition">
              ${totalPosts}
            </div>
          </div>
          <div class="pt-3 border-t border-white/5 space-y-1 text-[11px] text-slate-400">
            <div class="flex items-center justify-between">
              <span>General: <strong class="text-indigo-300">${generalPosts.length}</strong></span>
              <span>Assoc: <strong class="text-purple-300">${assocPosts.length}</strong></span>
            </div>
            <div class="flex items-center justify-between text-[10px] font-mono">
              <span>Year Reps: <strong class="text-slate-300">${yearRepPosts.length}</strong></span>
              <span class="text-slate-400 cursor-pointer hover:underline" data-admin-nav="posts">Config →</span>
            </div>
          </div>
        </div>

        <!-- 3. Nominations Filed -->
        <div class="glass p-5 rounded-2xl border border-white/10 hover:border-amber-500/40 transition group relative overflow-hidden flex flex-col justify-between">
          <div class="space-y-1">
            <div class="flex items-center justify-between text-slate-400 text-xs">
              <span class="font-bold uppercase tracking-wider text-[10px]">Nominations</span>
              <span class="text-lg">📝</span>
            </div>
            <div class="text-2xl font-black text-white group-hover:text-amber-300 transition flex items-baseline gap-2">
              <span>${totalNoms}</span>
              ${pendingNoms > 0 ? `
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  ${pendingNoms} Pending
                </span>` : ''}
            </div>
          </div>
          <div class="pt-3 border-t border-white/5 space-y-1 text-[11px] text-slate-400">
            <div class="flex items-center justify-between">
              <span>Valid: <strong class="text-emerald-400">${validNoms}</strong></span>
              <span>Reject: <strong class="text-rose-400">${rejectedNoms}</strong></span>
            </div>
            <div class="flex items-center justify-between text-[10px] font-mono">
              <span>Withdrawn: <strong class="text-purple-400">${withdrawnApproved}</strong></span>
              <span>Physical: <strong class="text-slate-300">${physicalReceived}</strong></span>
            </div>
          </div>
        </div>

        <!-- 4. Contest Battleground -->
        <div class="glass p-5 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition group relative overflow-hidden flex flex-col justify-between">
          <div class="space-y-1">
            <div class="flex items-center justify-between text-slate-400 text-xs">
              <span class="font-bold uppercase tracking-wider text-[10px]">Contest Races</span>
              <span class="text-lg">⚔️</span>
            </div>
            <div class="text-2xl font-black text-white group-hover:text-emerald-300 transition">
              ${activeCandidates.length}
              <span class="text-xs font-normal text-slate-400">Candidates</span>
            </div>
          </div>
          <div class="pt-3 border-t border-white/5 space-y-1 text-[11px] text-slate-400">
            <div class="flex items-center justify-between">
              <span>Contested: <strong class="text-sky-300">${contestedPostsCount}</strong></span>
              <span>Unopposed: <strong class="text-emerald-400">${uncontestedPostsCount}</strong></span>
            </div>
            <div class="flex items-center justify-between text-[10px] font-mono">
              <span class="${vacantPostsCount > 0 ? 'text-amber-400' : 'text-slate-500'}">
                ${vacantPostsCount > 0 ? `⚠️ ${vacantPostsCount} Vacant` : 'All Posts Filed'}
              </span>
              <span class="text-indigo-400 cursor-pointer hover:underline" data-admin-nav="publish">Lists →</span>
            </div>
          </div>
        </div>

        <!-- 5. Polling Infrastructure -->
        <div class="glass p-5 rounded-2xl border border-white/10 hover:border-cyan-500/40 transition group relative overflow-hidden flex flex-col justify-between">
          <div class="space-y-1">
            <div class="flex items-center justify-between text-slate-400 text-xs">
              <span class="font-bold uppercase tracking-wider text-[10px]">Polling Booths</span>
              <span class="text-lg">🏫</span>
            </div>
            <div class="text-2xl font-black text-white group-hover:text-cyan-300 transition">
              ${totalBooths}
              <span class="text-xs font-normal text-slate-400">Booths</span>
            </div>
          </div>
          <div class="pt-3 border-t border-white/5 space-y-1 text-[11px] text-slate-400">
            <div class="flex items-center justify-between">
              <span>Classes: <strong class="text-slate-200">${mappedClassesSet.size}</strong></span>
              <span>Allocated: <strong class="text-cyan-300">${totalBoothAllocatedVoters}</strong></span>
            </div>
            <div class="flex items-center justify-between text-[10px] font-mono">
              <span class="truncate text-slate-500">${bindingMode}</span>
              <span class="text-cyan-400 cursor-pointer hover:underline" data-admin-nav="ballots">Press →</span>
            </div>
          </div>
        </div>

        <!-- 6. Election Outcome / Results -->
        <div class="glass p-5 rounded-2xl border border-white/10 hover:border-purple-500/40 transition group relative overflow-hidden flex flex-col justify-between">
          <div class="space-y-1">
            <div class="flex items-center justify-between text-slate-400 text-xs">
              <span class="font-bold uppercase tracking-wider text-[10px]">Results Hub</span>
              <span class="text-lg">🏆</span>
            </div>
            <div class="text-2xl font-black text-white group-hover:text-purple-300 transition">
              ${totalDeclaredWinners > 0 ? totalDeclaredWinners : (isCountingActive ? 'Counting' : (isResultsPublished ? 'Declared' : 'Pending'))}
              ${totalDeclaredWinners > 0 ? '<span class="text-xs font-normal text-slate-400">Winners</span>' : ''}
            </div>
          </div>
          <div class="pt-3 border-t border-white/5 space-y-1 text-[11px] text-slate-400">
            <div class="flex items-center justify-between">
              <span>Status: <strong class="${isResultsPublished ? 'text-emerald-400' : 'text-amber-400'}">${isResultsPublished ? 'Published' : 'Stage 1/2'}</strong></span>
            </div>
            <div class="flex items-center justify-between text-[10px] font-mono">
              <span>${isResultsLocked ? '🔒 Locked' : 'Live Ledgers'}</span>
              <span class="text-purple-400 cursor-pointer hover:underline" data-admin-nav="results">Command →</span>
            </div>
          </div>
        </div>

      </div>

      <!-- ── QUICK COMMAND SHORTCUTS HUB (8 Direct Action Tiles) ────────────── -->
      <div class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span>⚡ Statutory Command Shortcuts</span>
          </h3>
          <span class="text-[11px] text-slate-500 font-mono">1-Click Direct Workflow Access</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          
          <button class="glass p-3.5 rounded-2xl border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-600/10 text-left transition flex flex-col justify-between gap-3 group" data-admin-nav="verify">
            <div class="flex items-center justify-between">
              <span class="text-xl p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">✅</span>
              ${pendingNoms > 0 ? `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono px-1.5 py-0.2">${pendingNoms}</span>` : ''}
            </div>
            <div>
              <div class="text-xs font-bold text-white group-hover:text-indigo-300 transition">Verify Noms</div>
              <p class="text-[10px] text-slate-400 leading-tight mt-0.5">Scrutiny &amp; Grounds</p>
            </div>
          </button>

          <button class="glass p-3.5 rounded-2xl border border-white/10 hover:border-purple-500/50 hover:bg-purple-600/10 text-left transition flex flex-col justify-between gap-3 group" data-admin-nav="withdrawals">
            <div class="flex items-center justify-between">
              <span class="text-xl p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">↩️</span>
              ${withdrawalPending > 0 ? `<span class="badge bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono px-1.5 py-0.2">${withdrawalPending}</span>` : ''}
            </div>
            <div>
              <div class="text-xs font-bold text-white group-hover:text-purple-300 transition">Withdrawals</div>
              <p class="text-[10px] text-slate-400 leading-tight mt-0.5">Notices &amp; Forms</p>
            </div>
          </button>

          <button class="glass p-3.5 rounded-2xl border border-white/10 hover:border-sky-500/50 hover:bg-sky-600/10 text-left transition flex flex-col justify-between gap-3 group" data-admin-nav="publish">
            <div class="flex items-center justify-between">
              <span class="text-xl p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300">📢</span>
              <span class="text-[9px] font-mono text-sky-400">${settings.finalListPublished === 'true' ? 'Final' : (settings.validListPublished === 'true' ? 'Valid' : 'Draft')}</span>
            </div>
            <div>
              <div class="text-xs font-bold text-white group-hover:text-sky-300 transition">Publish Hub</div>
              <p class="text-[10px] text-slate-400 leading-tight mt-0.5">Public List Controls</p>
            </div>
          </button>

          <button class="glass p-3.5 rounded-2xl border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-600/10 text-left transition flex flex-col justify-between gap-3 group" data-admin-nav="booths">
            <div class="flex items-center justify-between">
              <span class="text-xl p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">🏫</span>
              <span class="text-[10px] font-mono text-slate-400">${totalBooths}</span>
            </div>
            <div>
              <div class="text-xs font-bold text-white group-hover:text-cyan-300 transition">Booths Setup</div>
              <p class="text-[10px] text-slate-400 leading-tight mt-0.5">Rooms &amp; Classes</p>
            </div>
          </button>

          <button class="glass p-3.5 rounded-2xl border border-white/10 hover:border-amber-500/50 hover:bg-amber-600/10 text-left transition flex flex-col justify-between gap-3 group" data-admin-nav="ballots">
            <div class="flex items-center justify-between">
              <span class="text-xl p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">🗳️</span>
              <span class="text-[9px] font-mono text-amber-400">${bookSize}/bk</span>
            </div>
            <div>
              <div class="text-xs font-bold text-white group-hover:text-amber-300 transition">Ballot Press</div>
              <p class="text-[10px] text-slate-400 leading-tight mt-0.5">Serials &amp; Books</p>
            </div>
          </button>

          <button class="glass p-3.5 rounded-2xl border border-white/10 hover:border-rose-500/50 hover:bg-rose-600/10 text-left transition flex flex-col justify-between gap-3 group" data-admin-nav="counting">
            <div class="flex items-center justify-between">
              <span class="text-xl p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">🧮</span>
              <span class="text-[9px] font-mono ${isCountingActive ? 'text-rose-400 animate-pulse' : 'text-slate-500'}">${isCountingActive ? 'Active' : 'Setup'}</span>
            </div>
            <div>
              <div class="text-xs font-bold text-white group-hover:text-rose-300 transition">Counting Matrix</div>
              <p class="text-[10px] text-slate-400 leading-tight mt-0.5">Tables &amp; Tallies</p>
            </div>
          </button>

          <button class="glass p-3.5 rounded-2xl border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-600/10 text-left transition flex flex-col justify-between gap-3 group" data-admin-nav="results">
            <div class="flex items-center justify-between">
              <span class="text-xl p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">🏆</span>
              <span class="text-[9px] font-mono ${isResultsPublished ? 'text-emerald-400' : 'text-slate-500'}">${isResultsPublished ? 'Declared' : 'Stage 3'}</span>
            </div>
            <div>
              <div class="text-xs font-bold text-white group-hover:text-emerald-300 transition">Results Center</div>
              <p class="text-[10px] text-slate-400 leading-tight mt-0.5">Declare &amp; Publish</p>
            </div>
          </button>

          <button id="btnTileOaths" class="glass p-3.5 rounded-2xl border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-600/15 text-left transition flex flex-col justify-between gap-3 group bg-emerald-950/20">
            <div class="flex items-center justify-between">
              <span class="text-xl p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">📜</span>
              <span class="text-[9px] font-mono text-emerald-400 font-bold">A4 Oath</span>
            </div>
            <div>
              <div class="text-xs font-bold text-white group-hover:text-emerald-300 transition">Swearing-in</div>
              <p class="text-[10px] text-slate-400 leading-tight mt-0.5">സത്യപ്രതിജ്ഞ</p>
            </div>
          </button>

        </div>
      </div>

      <!-- ── TWO-COLUMN ANALYTICS: SCRUTINY FUNNEL & DEPT ENGAGEMENT ────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Scrutiny Funnel & Health Card (Cols 1-7) -->
        <div class="lg:col-span-7 glass rounded-3xl p-6 border border-white/10 shadow-xl space-y-5 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span>📊 Nomination Scrutiny Health &amp; Funnel</span>
              </h3>
              <span class="text-[10px] font-mono text-slate-400">Total: ${totalNoms} Nominations</span>
            </div>
            <p class="text-xs text-slate-400">
              Statutory verification breakdown across active submissions, scrutiny approvals, rejection grounds, and approved withdrawals.
            </p>
          </div>

          <!-- Multi-Segmented Visual Progress Bar -->
          <div class="space-y-2">
            <div class="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex border border-white/10 p-0.5">
              <div style="width: ${validPct}%" class="h-full bg-emerald-500 rounded-l-full transition-all duration-700" title="Valid: ${validNoms} (${validPct}%)"></div>
              <div style="width: ${pendingPct}%" class="h-full bg-amber-500 transition-all duration-700" title="Pending: ${pendingNoms} (${pendingPct}%)"></div>
              <div style="width: ${rejectedPct}%" class="h-full bg-rose-500 transition-all duration-700" title="Rejected: ${rejectedNoms} (${rejectedPct}%)"></div>
              <div style="width: ${withdrawnPct}%" class="h-full bg-purple-500 rounded-r-full transition-all duration-700" title="Withdrawn: ${withdrawnApproved} (${withdrawnPct}%)"></div>
            </div>

            <!-- Funnel Legend -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <div class="text-[10px] font-semibold text-emerald-400 uppercase">Valid</div>
                <div class="text-base font-black text-white mt-0.5">${validNoms} <span class="text-[10px] font-normal text-emerald-400">(${validPct}%)</span></div>
              </div>
              <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <div class="text-[10px] font-semibold text-amber-400 uppercase">Pending Review</div>
                <div class="text-base font-black text-white mt-0.5">${pendingNoms} <span class="text-[10px] font-normal text-amber-400">(${pendingPct}%)</span></div>
              </div>
              <div class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                <div class="text-[10px] font-semibold text-rose-400 uppercase">Rejected</div>
                <div class="text-base font-black text-white mt-0.5">${rejectedNoms} <span class="text-[10px] font-normal text-rose-400">(${rejectedPct}%)</span></div>
              </div>
              <div class="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
                <div class="text-[10px] font-semibold text-purple-400 uppercase">Withdrawn</div>
                <div class="text-base font-black text-white mt-0.5">${withdrawnApproved} <span class="text-[10px] font-normal text-purple-400">(${withdrawnPct}%)</span></div>
              </div>
            </div>
          </div>

          <!-- Physical Form Compliance -->
          <div class="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between text-xs text-slate-300">
            <div class="flex items-center gap-2.5">
              <span class="text-lg">📄</span>
              <div>
                <span class="font-bold text-white">Physical Hard Copy Submission Compliance</span>
                <p class="text-[11px] text-slate-400">${physicalReceived} of ${totalNoms} forms officially received and verified by RO</p>
              </div>
            </div>
            <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              ${totalNoms > 0 ? Math.round((physicalReceived / totalNoms) * 100) : 0}% Verified
            </span>
          </div>
        </div>

        <!-- Department Participation Analytics (Cols 8-12) -->
        <div class="lg:col-span-5 glass rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <span>🏛️ Faculty &amp; Dept Participation</span>
            </h3>
            <span class="text-[10px] font-mono text-slate-400">${deptSet.size} Active Departments</span>
          </div>
          <p class="text-xs text-slate-400">
            Top academic departments submitting candidate nominations across union offices:
          </p>

          <div class="space-y-3 pt-1">
            ${sortedDepts.length > 0 ? sortedDepts.map(([deptName, count]) => {
              const pct = Math.round((count / maxDeptNoms) * 100);
              return `
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-slate-200 truncate pr-2 max-w-[220px]">${esc(deptName)}</span>
                    <span class="text-xs font-mono font-bold text-indigo-400">${count} noms</span>
                  </div>
                  <div class="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                    <div style="width: ${pct}%" class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                  </div>
                </div>
              `;
            }).join('') : `
              <div class="py-8 text-center text-slate-500 text-xs">
                No nominations recorded yet.
              </div>
            `}
          </div>
        </div>

      </div>

      <!-- ── EXECUTIVE GENERAL UNION POSTS BATTLEGROUND ────────────────────── -->
      <div class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <span>⚔️ Major Executive Union Battleground</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                ${generalPosts.length} Offices
              </span>
            </h3>
            <p class="text-xs text-slate-400">
              Live contestant status and declared winners for the campus-wide Executive Union posts.
            </p>
          </div>
          <button class="text-xs text-indigo-400 font-bold hover:text-indigo-300 transition" data-admin-nav="publish">
            View Final Candidates List →
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          ${generalPosts.slice(0, 8).map(p => {
            const postName = typeof p === 'string' ? p : (p.post || p.name);
            const stdName = normalizePostName(postName);
            const isUUC = stdName.toUpperCase().includes('UUC') || stdName.toUpperCase().includes('UNIVERSITY');
            const cands = activeCandidates.filter(n => String(n.post).trim().toLowerCase() === String(postName).trim().toLowerCase());
            
            // Check if results declared
            const postRes = resultsList.find(r => String(r.post).trim().toLowerCase() === String(postName).trim().toLowerCase());
            const hasWinners = isResultsPublished && Array.isArray(postRes?.winners) && postRes.winners.length > 0;

            let badgeHtml = '';
            if (hasWinners) {
              badgeHtml = `<span class="badge bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-mono font-bold">🏆 Declared</span>`;
            } else if (cands.length === 0) {
              badgeHtml = `<span class="badge bg-slate-800 text-slate-400 border-slate-700 text-[10px] font-mono">⚪ Vacant</span>`;
            } else if (isUUC ? cands.length <= 2 : cands.length === 1) {
              badgeHtml = `<span class="badge bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono">🟢 Uncontested</span>`;
            } else {
              badgeHtml = `<span class="badge bg-sky-500/20 text-sky-300 border-sky-500/30 text-[10px] font-mono">🔵 Contested (${cands.length})</span>`;
            }

            return `
              <div class="glass p-4 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition flex flex-col justify-between space-y-3 bg-slate-900/40">
                <div class="space-y-1">
                  <div class="flex items-start justify-between gap-2">
                    <h4 class="text-xs font-bold text-white truncate max-w-[170px]" title="${esc(stdName)}">${esc(stdName)}</h4>
                    ${badgeHtml}
                  </div>
                  <div class="text-[10px] text-slate-400 font-mono">
                    ${isUUC ? '2 Seats (University Council)' : '1 Executive Seat'}
                  </div>
                </div>

                <div class="space-y-1.5 pt-2 border-t border-white/5">
                  ${hasWinners ? `
                    <div class="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                      <div class="text-[10px] text-emerald-400 font-bold uppercase">Official Winner</div>
                      <div class="font-bold text-white truncate">${esc(postRes.winners.map(w => w.name || w.candidateName).join(', '))}</div>
                    </div>
                  ` : (cands.length > 0 ? cands.slice(0, 3).map(c => `
                    <div class="flex items-center justify-between text-xs py-0.5">
                      <div class="truncate max-w-[140px]">
                        <span class="font-semibold text-slate-200">${esc(c.candidateName)}</span>
                      </div>
                      <span class="text-[10px] font-mono text-slate-400 truncate max-w-[90px]">${esc(c.candidateDept || c.candidateClass)}</span>
                    </div>
                  `).join('') + (cands.length > 3 ? `<div class="text-[10px] text-slate-500 font-mono text-right">+${cands.length - 3} more contestants</div>` : '') : `
                    <div class="text-[11px] text-slate-500 italic py-1">No active candidates filed.</div>
                  `)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- ── STATUTORY PUBLICATION STATUS TRACKER ──────────────────────────── -->
      <div class="glass rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <span>🌐 Public Student Portal Live Visibility</span>
            </h3>
            <p class="text-xs text-slate-400">
              Statutory documents and search tools currently visible to students on the public election portal.
            </p>
          </div>
          <button class="btn btn-secondary text-xs font-bold py-1.5 px-3.5 rounded-xl flex items-center gap-1.5" data-admin-nav="publish">
            <span>⚙️</span> Manage All Publications
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          
          <div class="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="text-xs font-bold text-white">Draft Nominal Roll</div>
              <div class="text-[10px] text-slate-400">Initial roll inspection &amp; claims</div>
            </div>
            <span class="badge ${isDraftRollPub ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'} text-[10px] font-mono">
              ${isDraftRollPub ? '● Published' : 'Hidden'}
            </span>
          </div>

          <div class="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="text-xs font-bold text-white">Final Nominal Roll</div>
              <div class="text-[10px] text-slate-400">Certified electoral roll</div>
            </div>
            <span class="badge ${isRollFinal ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'} text-[10px] font-mono">
              ${isRollFinal ? '● Finalized' : 'In Progress'}
            </span>
          </div>

          <div class="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="text-xs font-bold text-white">Valid Nominations List</div>
              <div class="text-[10px] text-slate-400">Scrutinized candidate forms</div>
            </div>
            <span class="badge ${settings.validListPublished === 'true' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'} text-[10px] font-mono">
              ${settings.validListPublished === 'true' ? '● Published' : 'Hidden'}
            </span>
          </div>

          <div class="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="text-xs font-bold text-white">Final Contestants List</div>
              <div class="text-[10px] text-slate-400">Official candidates after withdrawals</div>
            </div>
            <span class="badge ${settings.finalListPublished === 'true' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'} text-[10px] font-mono">
              ${settings.finalListPublished === 'true' ? '● Published' : 'Hidden'}
            </span>
          </div>

          <div class="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="text-xs font-bold text-white">Voter Booth Lookup</div>
              <div class="text-[10px] text-slate-400">Student booth &amp; room finder</div>
            </div>
            <span class="badge ${settings.boothSearchPublished === 'true' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'} text-[10px] font-mono">
              ${settings.boothSearchPublished === 'true' ? '● Published' : 'Hidden'}
            </span>
          </div>

          <div class="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="text-xs font-bold text-white">Election Results (Stage 3)</div>
              <div class="text-[10px] text-slate-400">Public winner declaration</div>
            </div>
            <span class="badge ${isResultsPublished ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'} text-[10px] font-mono">
              ${isResultsPublished ? '● Published' : 'Unpublished'}
            </span>
          </div>

        </div>
      </div>

      <!-- ── RECENT OPERATIONAL ACTIVITY STREAM WITH QUICK FILTERS ─────────── -->
      <div class="glass rounded-3xl overflow-hidden shadow-2xl border border-white/10 space-y-0">
        
        <div class="px-6 py-4 border-b border-white/10 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <span>📋 Candidate Submissions &amp; Scrutiny Stream</span>
              <span class="text-[10px] font-mono text-slate-400">(${totalNoms} Total)</span>
            </h3>
            <p class="text-xs text-slate-400">Recent student candidate nomination filings and Returning Officer decisions.</p>
          </div>

          <!-- Quick Tab Filters -->
          <div class="flex flex-wrap items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5" id="dashActivityFilterTabs">
            <button class="activity-tab-btn px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-indigo-600 shadow-sm" data-filter="all">All (${totalNoms})</button>
            <button class="activity-tab-btn px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white" data-filter="Pending">Pending (${pendingNoms})</button>
            <button class="activity-tab-btn px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white" data-filter="Valid">Valid (${validNoms})</button>
            <button class="activity-tab-btn px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white" data-filter="Rejected">Rejected (${rejectedNoms})</button>
            <button class="activity-tab-btn px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white" data-filter="withdrawn">Withdrawn (${withdrawnApproved})</button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="data-table w-full" id="dashActivityTable">
            <thead>
              <tr>
                <th class="w-24">Nomination ID</th>
                <th>Candidate Name &amp; Class</th>
                <th>Post Applied</th>
                <th>Department</th>
                <th>Physical Form</th>
                <th>Status</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody id="dashActivityTbody">
              ${renderActivityRows(noms.slice(-15).reverse())}
            </tbody>
          </table>
        </div>

        <div class="p-4 border-t border-white/10 bg-slate-950/30 flex items-center justify-between">
          <span class="text-xs text-slate-400 font-mono">Showing latest submissions</span>
          <button class="btn btn-secondary text-xs font-bold py-1.5 px-4 rounded-xl" data-admin-nav="verify">
            Full Verification Screen (${totalNoms}) →
          </button>
        </div>

      </div>

    </div>
  `;

  // ─── ATTACH EVENT LISTENERS ─────────────────────────────────────────────────
  
  // Navigation buttons
  main.querySelectorAll('[data-admin-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      import('../../router.js').then(({ router }) => router.navigate(`/admin/${btn.dataset.adminNav}`));
    });
  });

  // Refresh feed button
  main.querySelector('#btnDashboardRefresh')?.addEventListener('click', () => {
    const icon = main.querySelector('#refreshIcon');
    if (icon) icon.classList.add('animate-spin');
    loadDashboardData(main.parentElement, pwd);
  });

  // Oaths Launchers
  const launchOaths = () => {
    openOathModal({
      pwd,
      settings,
      schedule,
      posts,
      candidates: activeCandidates,
      results,
      nominalRoll,
      isResultsPublished
    });
  };

  main.querySelector('#btnHeaderOaths')?.addEventListener('click', launchOaths);
  main.querySelector('#btnTileOaths')?.addEventListener('click', launchOaths);

  // Activity filter tabs
  const filterBtns = main.querySelectorAll('#dashActivityFilterTabs .activity-tab-btn');
  const tbody = main.querySelector('#dashActivityTbody');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.className = 'activity-tab-btn px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white';
      });
      btn.className = 'activity-tab-btn px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-indigo-600 shadow-sm';

      const filter = btn.dataset.filter;
      let filtered = [...noms].reverse();
      if (filter === 'Pending') filtered = filtered.filter(n => n.status === 'Pending');
      else if (filter === 'Valid') filtered = filtered.filter(n => n.status === 'Valid');
      else if (filter === 'Rejected') filtered = filtered.filter(n => n.status === 'Rejected');
      else if (filter === 'withdrawn') filtered = filtered.filter(n => n.withdrawalStatus === 'Approved');

      if (tbody) {
        tbody.innerHTML = renderActivityRows(filtered.slice(0, 15));
        // Rebind navigation
        tbody.querySelectorAll('[data-admin-nav]').forEach(b => {
          b.addEventListener('click', () => {
            import('../../router.js').then(({ router }) => router.navigate(`/admin/${b.dataset.adminNav}`));
          });
        });
      }
    });
  });
}

function renderActivityRows(items) {
  if (!items || items.length === 0) {
    return `
      <tr>
        <td colspan="7" class="text-center py-8 text-slate-500 text-xs italic">
          No nominations found matching filter.
        </td>
      </tr>
    `;
  }

  return items.map(n => {
    const isPhysical = n.physicalReceived === true || n.physical_received === true;
    const isWithdrawn = n.withdrawalStatus === 'Approved';

    return `
      <tr class="hover:bg-white/[0.02] transition">
        <td class="font-mono text-indigo-400 text-xs font-bold">${esc(n.id || 'N/A')}</td>
        <td>
          <div class="font-semibold text-white text-xs">${esc(n.candidateName || 'Unnamed')}</div>
          <div class="text-[10px] text-slate-400 font-mono">Class: ${esc(n.candidateClass || 'N/A')}</div>
        </td>
        <td class="text-xs text-slate-200 font-medium">${esc(n.post || 'N/A')}</td>
        <td class="text-xs text-slate-400">${esc(n.candidateDept || 'N/A')}</td>
        <td>
          ${isPhysical ? `
            <span class="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span>✓</span> Received
            </span>` : `
            <span class="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <span>⏳</span> Awaiting
            </span>`}
        </td>
        <td>
          ${isWithdrawn ? `
            <span class="badge bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] font-mono">Withdrawn</span>` : `
            <span class="badge badge-${(n.status || 'pending').toLowerCase()} text-[10px] font-mono">${esc(n.status || 'Pending')}</span>`}
        </td>
        <td class="text-right">
          <button class="btn btn-secondary text-[11px] font-bold py-1 px-3 rounded-lg hover:border-indigo-500/40" data-admin-nav="verify">
            Review →
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
