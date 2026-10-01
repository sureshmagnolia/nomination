/**
 * pages/results.js
 * Public dashboard to view live election results, with both:
 * 1. Standard Results View (detailed breakdown, progress bars, departmental tables)
 * 2. Counting Trends Dashboard (responsive screen-adaptive cards, rolling odometer digit animations, color themes & test data simulation)
 * 
 * Rules:
 * - Admin view updates live in real-time as new data is entered (NO 5-min timer).
 * - 5-minute timer lock applies ONLY to public student view when unlocked/published by admin.
 */
import { api } from '../api.js';
import { esc, sortPosts } from '../utils.js';
import { router } from '../router.js';

const CACHE_KEY = 'election_results_cache';
const CACHE_TIME_KEY = 'election_results_last_fetch';
const PUBLIC_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes (for public electors only)

const CARD_THEMES = [
  { bg: 'bg-sky-950/25', border: 'border-t-4 border-sky-500', text: 'text-sky-400', leadBg: 'bg-sky-600', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { bg: 'bg-emerald-950/25', border: 'border-t-4 border-emerald-500', text: 'text-emerald-400', leadBg: 'bg-emerald-600', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { bg: 'bg-amber-950/25', border: 'border-t-4 border-amber-500', text: 'text-amber-400', leadBg: 'bg-amber-600', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { bg: 'bg-indigo-950/25', border: 'border-t-4 border-indigo-500', text: 'text-indigo-400', leadBg: 'bg-indigo-600', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { bg: 'bg-rose-950/25', border: 'border-t-4 border-rose-500', text: 'text-rose-400', leadBg: 'bg-rose-600', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { bg: 'bg-teal-950/25', border: 'border-t-4 border-teal-500', text: 'text-teal-400', leadBg: 'bg-teal-600', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
];

const DEFAULT_TEST_TRENDS = [
  {
    post: 'The Chairperson',
    femaleOnly: false,
    candidates: [
      { name: 'Arun Kumar M', votes: 482 },
      { name: 'Sneha R', votes: 429 },
      { name: 'NOTA', votes: 14 }
    ]
  },
  {
    post: 'The Vice Chairperson',
    femaleOnly: true,
    candidates: [
      { name: 'Ananya Krishna', votes: 518 },
      { name: 'Fathima Zahra', votes: 394 },
      { name: 'NOTA', votes: 8 }
    ]
  },
  {
    post: 'The Secretary',
    femaleOnly: false,
    candidates: [
      { name: 'Muhammed Bilal', votes: 468 },
      { name: 'Rahul K V', votes: 451 },
      { name: 'Abhishek S', votes: 112 },
      { name: 'NOTA', votes: 11 }
    ]
  },
  {
    post: 'The Joint Secretary',
    femaleOnly: true,
    candidates: [
      { name: 'Devika S', votes: 504 },
      { name: 'Malavika Nair', votes: 488 },
      { name: 'NOTA', votes: 6 }
    ]
  },
  {
    post: 'The University Union Councillor (UUC)',
    isUUC: true,
    seats: 2,
    candidates: [
      { name: 'Gokul Das P', votes: 542 },
      { name: 'Kavya Menon', votes: 498 },
      { name: 'Nikhil Raj', votes: 412 },
      { name: 'Siddharth V', votes: 265 },
      { name: 'NOTA', votes: 19 }
    ]
  },
  {
    post: 'The Chief Student Editor',
    candidates: [
      { name: 'Adithya S', votes: 440 },
      { name: 'Haritha K', votes: 388 },
      { name: 'NOTA', votes: 15 }
    ]
  },
  {
    post: 'The General Captain',
    candidates: [
      { name: 'Aravind R', votes: 515 },
      { name: 'Vishnu Prasad', votes: 476 },
      { name: 'NOTA', votes: 9 }
    ]
  },
  {
    post: 'The Secretary Fine Arts',
    candidates: [
      { name: 'Meera Nambiar', votes: 462 },
      { name: 'Diya Pradeep', votes: 438 },
      { name: 'NOTA', votes: 12 }
    ]
  },
  {
    post: 'I UG Representative',
    candidates: [
      { name: 'Alan Joseph', votes: 168 },
      { name: 'Rhea Mathew', votes: 142 },
      { name: 'NOTA', votes: 4 }
    ]
  },
  {
    post: 'II UG Representative',
    candidates: [
      { name: 'Sanjay Mohan', votes: 179 },
      { name: 'Farhan Ali', votes: 158 },
      { name: 'NOTA', votes: 3 }
    ]
  },
  {
    post: 'III UG Representative',
    candidates: [
      { name: 'Vignesh R', votes: 194 },
      { name: 'Anjali Suresh', votes: 181 },
      { name: 'NOTA', votes: 5 }
    ]
  },
  {
    post: 'PG Representative',
    candidates: [
      { name: 'Drishya K', votes: 96 },
      { name: 'Anoop Krishnan', votes: 78 },
      { name: 'NOTA', votes: 2 }
    ]
  },
  {
    post: 'Association Secretary Commerce',
    deptRestriction: true,
    candidates: [
      { name: 'Nandana P', votes: 142 },
      { name: 'Rohan S', votes: 118 },
      { name: 'NOTA', votes: 4 }
    ]
  },
  {
    post: 'Association Secretary Computer Science',
    deptRestriction: true,
    candidates: [
      { name: 'Midhun C', votes: 131 },
      { name: 'Sreeram K', votes: 114 },
      { name: 'NOTA', votes: 3 }
    ]
  }
];

export async function renderResults(container, options = {}) {
  const adminPwd = localStorage.getItem('adminPwd') || sessionStorage.getItem('adminPwd');
  const isAdmin = !!adminPwd;

  let activeTab = options.initialTab || (window.location.hash.includes('trends') ? 'trends' : 'standard');
  let testData = null;
  let previousTrendsState = {};
  let cachedPayload = null;

  container.innerHTML = `
    <div class="page-enter min-h-screen">
      <header class="no-print sticky top-0 z-20 border-b border-white/10 glass">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm flex items-center gap-1 font-medium">
              <span>←</span> Home
            </button>
            <span class="text-slate-600">|</span>
            <h1 id="pageTitle" class="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <span>📊</span> Live Election Results
            </h1>
          </div>
          
          <div class="flex items-center gap-3">
            <span id="cacheTimer" class="text-[10px] sm:text-xs text-slate-400 font-mono"></span>
            <button id="btnRefresh" class="btn btn-secondary btn-sm flex items-center gap-1.5">
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>

        <!-- Tab & Action Controls Subheader -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 border-t border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <!-- View Tabs -->
          <div class="inline-flex p-1 bg-slate-900/90 rounded-xl border border-white/10 shadow-inner">
            <button id="tabBtnStandard" class="px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-2">
              <span>📊</span> Results Breakdown
            </button>
            <button id="tabBtnTrends" class="px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-2">
              <span>🎯</span> Counting Trends (Screen View)
              <span class="px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">Odometer</span>
            </button>
          </div>

          <!-- Test Data Simulator Toolbar (Admin only, Active for Trends tab) -->
          ${isAdmin ? `
          <div id="trendsToolbar" class="flex flex-wrap items-center gap-2">
            <div id="testModeBadge" class="hidden text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold items-center gap-1.5 animate-pulse">
              <span>🧪</span> Test Simulation Active
            </div>
            <button id="btnLoadTest" class="btn btn-secondary btn-sm text-xs font-semibold flex items-center gap-1.5 hover:border-sky-500/50">
              <span>🧪</span> Load Test Data
            </button>
            <button id="btnSimulateVotes" class="btn btn-secondary btn-sm text-xs font-semibold flex items-center gap-1.5 hover:border-amber-500/50 hidden">
              <span>🎲</span> +Simulate Live Votes
            </button>
            <button id="btnClearTest" class="btn btn-secondary btn-sm text-xs font-semibold flex items-center gap-1.5 text-rose-400 hover:text-rose-300 hover:border-rose-500/50 hidden">
              <span>🧹</span> Clear Test Data
            </button>
          </div>
          ` : ''}
        </div>
      </header>

      <main id="resultsMain" class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Fetching Live Results...</p></div>
      </main>
    </div>
  `;

  const timerEl = container.querySelector('#cacheTimer');
  const btnRefresh = container.querySelector('#btnRefresh');
  const tabBtnStandard = container.querySelector('#tabBtnStandard');
  const tabBtnTrends = container.querySelector('#tabBtnTrends');
  const trendsToolbar = container.querySelector('#trendsToolbar');
  const btnLoadTest = container.querySelector('#btnLoadTest');
  const btnSimulateVotes = container.querySelector('#btnSimulateVotes');
  const btnClearTest = container.querySelector('#btnClearTest');
  const testModeBadge = container.querySelector('#testModeBadge');
  const resultsMain = container.querySelector('#resultsMain');

  function updateTabButtons() {
    if (activeTab === 'standard') {
      tabBtnStandard.className = 'px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-indigo-600 text-white shadow-lg transition flex items-center gap-2';
      tabBtnTrends.className = 'px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition flex items-center gap-2';
      if (trendsToolbar) trendsToolbar.style.display = 'none';
    } else {
      tabBtnStandard.className = 'px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition flex items-center gap-2';
      tabBtnTrends.className = 'px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-sky-600 text-white shadow-lg transition flex items-center gap-2';
      if (trendsToolbar) trendsToolbar.style.display = '';
    }
  }

  function updateTimer() {
    // 1. ADMIN VIEW: NO 5-MINUTE TIMER LOCK. Updates real-time live as data is entered.
    if (isAdmin) {
      timerEl.innerHTML = `<span class="inline-flex items-center gap-1.5 text-amber-300 font-bold"><span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> 👑 Admin Live Stream (Real-Time)</span>`;
      btnRefresh.disabled = false;
      btnRefresh.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
      return;
    }

    // 2. PUBLIC VIEW: If results not published yet, no 5-min timer needed (results are locked/hidden).
    const isPublished = cachedPayload?.isResultsPublished;
    if (!isPublished) {
      timerEl.textContent = '🔒 Results Not Yet Released';
      timerEl.classList.remove('text-green-400');
      btnRefresh.disabled = false;
      btnRefresh.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
      return;
    }

    // 3. PUBLIC VIEW (UNLOCKED / PUBLISHED): Enforce the 5-minute timer lock to rate-limit traffic.
    const lastFetch = localStorage.getItem(CACHE_TIME_KEY);
    if (!lastFetch) { 
      timerEl.textContent = ''; 
      btnRefresh.disabled = false;
      btnRefresh.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
      return; 
    }
    const nextUpdate = parseInt(lastFetch, 10) + PUBLIC_REFRESH_INTERVAL;
    const remaining = Math.max(0, nextUpdate - Date.now());
    if (remaining <= 0) {
      timerEl.textContent = 'Live Update Available';
      timerEl.classList.add('text-green-400');
      btnRefresh.disabled = false;
      btnRefresh.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
    } else {
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      timerEl.textContent = `Update in ${mins}:${secs.toString().padStart(2, '0')}`;
      timerEl.classList.remove('text-green-400');
      btnRefresh.disabled = true;
      btnRefresh.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
    }
  }

  const timerInterval = setInterval(updateTimer, 1000);
  updateTimer();

  // If viewing as administrator, auto-poll every 3.5 seconds so as new counting entries are submitted,
  // the Results / Counting Trends views automatically update live on screen without page refresh.
  let adminLivePoll = null;
  if (isAdmin) {
    adminLivePoll = setInterval(() => {
      if (!document.body.contains(container) || !container.querySelector('#resultsMain')) {
        clearInterval(adminLivePoll);
        clearInterval(timerInterval);
        return;
      }
      loadData(true, true); // silent live background update
    }, 3500);
  }

  container.querySelector('#backToHome').addEventListener('click', () => {
    if (adminLivePoll) clearInterval(adminLivePoll);
    clearInterval(timerInterval);
    router.navigate('/');
  });

  tabBtnStandard.addEventListener('click', () => {
    activeTab = 'standard';
    updateTabButtons();
    renderCurrentView();
  });

  tabBtnTrends.addEventListener('click', () => {
    activeTab = 'trends';
    updateTabButtons();
    renderCurrentView();
  });

  if (isAdmin) {
    btnLoadTest?.addEventListener('click', () => {
      testData = JSON.parse(JSON.stringify(DEFAULT_TEST_TRENDS));
      btnSimulateVotes?.classList.remove('hidden');
      btnClearTest?.classList.remove('hidden');
      testModeBadge?.classList.remove('hidden');
      testModeBadge?.classList.add('inline-flex');
      btnLoadTest?.classList.add('hidden');
      if (activeTab !== 'trends') {
        activeTab = 'trends';
        updateTabButtons();
      }
      renderCurrentView();
    });

    btnSimulateVotes?.addEventListener('click', () => {
      if (!testData || testData.length === 0) return;
      // Pick 3 random posts and add 5 to 25 votes to random candidates
      const postIndices = [
        Math.floor(Math.random() * testData.length),
        Math.floor(Math.random() * testData.length),
        Math.floor(Math.random() * testData.length)
      ];
      postIndices.forEach(idx => {
        const postObj = testData[idx];
        if (postObj && postObj.candidates && postObj.candidates.length > 0) {
          const candIdx = Math.floor(Math.random() * postObj.candidates.length);
          const added = Math.floor(Math.random() * 20) + 6;
          postObj.candidates[candIdx].votes += added;
        }
      });
      renderTrendsCards(resultsMain, testData, previousTrendsState, false);
      previousTrendsState = JSON.parse(JSON.stringify(testData));
    });

    btnClearTest?.addEventListener('click', () => {
      testData = null;
      previousTrendsState = {};
      btnSimulateVotes?.classList.add('hidden');
      btnClearTest?.classList.add('hidden');
      testModeBadge?.classList.add('hidden');
      testModeBadge?.classList.remove('inline-flex');
      btnLoadTest?.classList.remove('hidden');
      renderCurrentView();
    });
  }

  btnRefresh.addEventListener('click', (e) => {
    if (btnRefresh.disabled || btnRefresh.classList.contains('pointer-events-none')) {
      e.preventDefault();
      return;
    }
    loadData(true);
  });

  async function loadData(force = false, silent = false) {
    try {
      // Public visitors use localStorage cache during the 5-minute interval; Admins ALWAYS bypass it
      if (!isAdmin && !force) {
        const lastFetch = localStorage.getItem(CACHE_TIME_KEY);
        const cached = localStorage.getItem(CACHE_KEY);

        if (lastFetch && cached && (Date.now() - parseInt(lastFetch, 10) < PUBLIC_REFRESH_INTERVAL)) {
          try {
            cachedPayload = JSON.parse(cached);
            renderCurrentView();
            return;
          } catch (_) {
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(CACHE_TIME_KEY);
          }
        }
      }

      if (!silent && !resultsMain.querySelector('#trendsGrid') && !resultsMain.querySelector('.candidates-container')) {
        resultsMain.innerHTML = `
          <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Fetching Live Results...</p></div>
        `;
      }

      if (force || isAdmin) {
        api.invalidateCache('getResults');
        api.invalidateCache('adminGetResults');
        api.invalidateCache('getPosts');
        api.invalidateCache('getPublicSchedule');
        api.invalidateCache('getSettings');
      }

      // If viewing as admin, fetch via adminGetResults to see live tallies instantly
      const resultsPromise = isAdmin
        ? api.adminGetResults(adminPwd, true).catch(() => api.getResults(true).catch(() => ({ results: [], published: false })))
        : api.getResults(force).catch(() => ({ results: [], published: false, countingActive: false }));

      const [posts, rawResults, schedule, sets] = await Promise.all([
        api.getPosts(),
        resultsPromise,
        api.getPublicSchedule().catch(() => ({})),
        api.getSettings().catch(() => ({}))
      ]);

      const results = Array.isArray(rawResults) ? rawResults : (rawResults?.results || []);
      const isCountingActive = (rawResults && rawResults.countingActive === true) || schedule?.countingActive === 'true' || sets?.countingActive === 'true';
      const isResultsPublished = (rawResults && rawResults.published === true) || schedule?.resultsPublished === 'true' || sets?.resultsPublished === 'true';
      const isResultsLocked = (rawResults && rawResults.locked === true) || sets?.resultsLocked === 'true';
      const year = schedule?.electionYear || sets?.electionYear || new Date().getFullYear();

      cachedPayload = { posts, results, schedule, isCountingActive, isResultsPublished, isResultsLocked, year };
      
      // Store cache for public users only
      if (!isAdmin) {
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        localStorage.setItem(CACHE_KEY, JSON.stringify(cachedPayload));
      }

      const titleEl = container.querySelector('#pageTitle');
      if (titleEl) titleEl.innerHTML = `<span>📊</span> Live Election Results ${year}`;

      renderCurrentView();
    } catch (err) {
      if (!silent) {
        resultsMain.innerHTML = `<div class="alert alert-error">❌ Failed to load results: ${esc(err.message)}</div>`;
      }
    }
  }

  function renderCurrentView() {
    updateTabButtons();
    if (!cachedPayload && !testData) return;

    if (activeTab === 'standard') {
      renderStandardView(resultsMain, cachedPayload, isAdmin);
    } else {
      renderTrendsView(resultsMain, cachedPayload, testData, isAdmin);
    }
  }

  function renderTrendsView(main, payload, overrideTestData, isViewerAdmin) {
    if (overrideTestData && overrideTestData.length > 0) {
      renderTrendsCards(main, overrideTestData, previousTrendsState, Object.keys(previousTrendsState).length === 0);
      previousTrendsState = JSON.parse(JSON.stringify(overrideTestData));
      return;
    }

    const { results, isResultsPublished, isCountingActive } = payload || {};

    // For public users: strictly hide until released by Returning Officer
    // For admins: allow viewing live trends stream directly
    if ((!isResultsPublished && !isViewerAdmin) || !results || results.length === 0) {
      main.innerHTML = `
        <div class="glass p-8 sm:p-12 rounded-3xl border border-sky-500/20 text-center max-w-2xl mx-auto shadow-2xl mt-4">
          <div class="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto mb-5 text-3xl animate-pulse">
            🎯
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-white mb-2">Counting Trends Live Screen</h2>
          <p class="text-slate-300 text-sm leading-relaxed mb-6">
            ${isCountingActive 
              ? 'Vote counting is actively underway. Real-time trend cards and mechanical rolling counters will activate on this screen as soon as rounds are released by the Returning Officer.' 
              : 'Vote counting has not commenced or results have not been declared yet. Live trend cards with rolling counters will appear here during live counting.'}
          </p>
          ${isViewerAdmin ? `
          <div class="p-4 rounded-2xl bg-slate-900/60 border border-white/10 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div>
              <p class="text-xs font-bold text-sky-400 uppercase tracking-wider">Preview the Visual Experience</p>
              <p class="text-xs text-slate-400 mt-0.5">Test screen-adaptive cards, rolling odometer digit reels, and lead calculation.</p>
            </div>
            <button id="btnLoadTestInner" class="btn btn-primary btn-sm shrink-0 flex items-center gap-1.5 shadow-lg">
              <span>🧪</span> Load Test Data
            </button>
          </div>
          ` : ''}
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs">
            <span>🔒</span> Live public stream locked until manual release by Administrator
          </div>
        </div>
      `;
      if (isViewerAdmin) {
        main.querySelector('#btnLoadTestInner')?.addEventListener('click', () => {
          btnLoadTest?.click();
        });
      }
      return;
    }

    // Convert live results into trend posts
    const liveTrendsData = buildTrendsDataFromResults(payload.posts, payload.results);
    renderTrendsCards(main, liveTrendsData, previousTrendsState, Object.keys(previousTrendsState).length === 0);
    previousTrendsState = JSON.parse(JSON.stringify(liveTrendsData));
  }

  // Initial load
  updateTabButtons();
  await loadData(false);
}

/**
 * Builds data structure for the Trends view from active posts and vote records
 */
function buildTrendsDataFromResults(posts, results) {
  const sorted = sortPosts(posts || []);
  const agg = {};
  sorted.forEach(p => {
    const name = p.post || p.name;
    agg[name] = {};
  });

  (results || []).forEach(r => {
    const pName = r.Post;
    if (!agg[pName]) agg[pName] = {};
    if (!agg[pName][r.CandidateId]) {
      agg[pName][r.CandidateId] = { name: r.CandidateName, votes: 0 };
    }
    agg[pName][r.CandidateId].votes += Number(r.Votes) || 0;
  });

  const list = [];
  sorted.forEach(p => {
    const pName = p.post || p.name;
    const pAgg = agg[pName] || {};
    const candidateIds = Object.keys(pAgg);
    if (candidateIds.length === 0) return;

    const candidates = candidateIds.map(id => ({
      name: pAgg[id].name || id,
      votes: pAgg[id].votes || 0,
      isNota: id === 'NOTA',
      isInvalid: id === 'INVALID'
    }));

    const isUUC = pName.toUpperCase().includes('UUC') || pName.toUpperCase().includes('UNIVERSITY');
    list.push({
      post: pName,
      isUUC,
      seats: isUUC ? 2 : 1,
      candidates
    });
  });

  return list;
}

/**
 * Renders the screen-adaptive card grid adopting the CountingDash style with rolling counters
 */
async function renderTrendsCards(container, postsData, oldDataObj, isFirstLoad = false) {
  let grid = container.querySelector('#trendsGrid');
  if (!grid) {
    container.innerHTML = `
      <div id="trendsGrid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 page-enter"></div>
    `;
    grid = container.querySelector('#trendsGrid');
  }

  const oldDataMap = {};
  if (Array.isArray(oldDataObj)) {
    oldDataObj.forEach(p => { oldDataMap[p.post] = p; });
  }

  const animationPromises = [];

  postsData.forEach((postObj, postIndex) => {
    const postName = postObj.post;
    const theme = CARD_THEMES[postIndex % CARD_THEMES.length];
    const isUUC = postObj.isUUC || postName.toUpperCase().includes('UUC') || postName.toUpperCase().includes('UNIVERSITY');
    const seats = postObj.seats || (isUUC ? 2 : 1);

    const safeSlug = 'card-' + postName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    let card = grid.querySelector(`#${safeSlug}`);

    // Sort candidates descending by votes
    const sortedCandidates = [...(postObj.candidates || [])].sort((a, b) => b.votes - a.votes);

    if (!card) {
      card = document.createElement('div');
      card.id = safeSlug;
      card.className = `p-5 rounded-2xl shadow-xl border border-white/10 ${theme.border} glass ${theme.bg} flex flex-col justify-between transition-all duration-300 hover:shadow-2xl`;
      card.innerHTML = `
        <div>
          <div class="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 class="text-lg sm:text-xl font-black ${theme.text} uppercase tracking-wide leading-tight">${esc(postName)}</h2>
              ${seats > 1 ? `<span class="badge ${theme.badge} text-[10px] font-extrabold uppercase tracking-wider mt-1 inline-block">${seats} SEATS ELECTION</span>` : ''}
            </div>
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-widest pt-1">
              Votes
            </div>
          </div>
          <div class="candidates-container space-y-2.5 mt-4"></div>
        </div>

        <div class="total-row flex items-center justify-between p-3 mt-5 border-t border-white/10 bg-slate-900/60 rounded-xl">
          <div class="text-xs font-bold text-slate-300 uppercase tracking-wider">Total Votes Polled</div>
          <div class="rolling-counter-container"></div>
        </div>
      `;
      grid.appendChild(card);
    }

    const candContainer = card.querySelector('.candidates-container');

    // Sync candidate rows count
    while (candContainer.children.length < sortedCandidates.length) {
      const row = document.createElement('div');
      row.className = 'candidate-row flex items-center justify-between p-3 rounded-xl transition duration-300';
      row.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 pr-2">
          <div class="rank font-black text-base w-6 text-center shrink-0"></div>
          <div class="name font-bold text-white text-sm sm:text-base truncate"></div>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <div class="lead-container"></div>
          <div class="rolling-counter-container"></div>
        </div>
      `;
      candContainer.appendChild(row);
    }
    while (candContainer.children.length > sortedCandidates.length) {
      candContainer.removeChild(candContainer.lastChild);
    }

    // Lead calculations
    const candidateRows = candContainer.querySelectorAll('.candidate-row');
    const oldPostData = oldDataMap[postName] || { candidates: [] };
    const oldCandidatesMap = {};
    (oldPostData.candidates || []).forEach(c => { oldCandidatesMap[c.name] = c.votes; });

    let leadThreshold = 0;
    if (sortedCandidates.length > seats) {
      leadThreshold = sortedCandidates[seats].votes;
    }

    sortedCandidates.forEach((c, i) => {
      const row = candidateRows[i];
      const rankEl = row.querySelector('.rank');
      const nameEl = row.querySelector('.name');
      const leadEl = row.querySelector('.lead-container');
      const counterEl = row.querySelector('.rolling-counter-container');

      const isLeading = i < seats && c.votes > 0;
      const lead = isLeading ? (c.votes - leadThreshold) : 0;

      rankEl.textContent = i + 1;
      rankEl.className = `rank font-black text-base w-6 text-center shrink-0 ${isLeading ? theme.text : 'text-slate-400'}`;
      nameEl.textContent = c.name;

      if (isLeading) {
        row.className = `candidate-row flex items-center justify-between p-3 rounded-xl transition duration-300 bg-white/10 shadow border border-white/15`;
        leadEl.innerHTML = lead > 0 ? `
          <div class="flex items-center gap-1.5 text-white px-2.5 py-0.5 rounded-full ${theme.leadBg} shadow-md animate-pulse">
            <span class="text-[9px] uppercase tracking-wider font-black opacity-90">LEAD</span>
            <span class="font-extrabold text-xs sm:text-sm">${lead.toLocaleString()}</span>
          </div>
        ` : '';
      } else {
        row.className = `candidate-row flex items-center justify-between p-3 rounded-xl transition duration-300 bg-slate-900/40 hover:bg-slate-800/40 border border-transparent`;
        leadEl.innerHTML = '';
      }

      const oldVotes = oldCandidatesMap[c.name] || 0;
      animationPromises.push(updateRollingCounter(counterEl, oldVotes, c.votes, isFirstLoad));
    });

    // Update total row
    const totalVotes = sortedCandidates.reduce((sum, c) => sum + (Number(c.votes) || 0), 0);
    const oldTotalVotes = (oldPostData.candidates || []).reduce((sum, c) => sum + (Number(c.votes) || 0), 0);
    const totalCounterEl = card.querySelector('.total-row .rolling-counter-container');
    animationPromises.push(updateRollingCounter(totalCounterEl, oldTotalVotes, totalVotes, isFirstLoad));
  });

  await Promise.all(animationPromises);
}

/**
 * Mechanical Rolling Odometer Digit Animation
 */
function updateRollingCounter(container, oldValue, newValue, isFirstLoad = false) {
  return new Promise(resolve => {
    const oldValueToUse = isFirstLoad ? 0 : (Number(oldValue) || 0);
    const val = Number(newValue) || 0;
    const oldValueStr = String(oldValueToUse);
    const newValueStr = String(val);
    const maxLength = Math.max(oldValueStr.length, newValueStr.length, 1);
    const newValuePadded = newValueStr.padStart(maxLength, '0');
    const oldValuePadded = oldValueStr.padStart(maxLength, '0');

    const digitHeight = 28; // Matches span and digit-container in style.css

    while (container.children.length < maxLength) {
      const digitContainer = document.createElement('div');
      digitContainer.className = 'digit-container';
      const reel = document.createElement('div');
      reel.className = 'reel';
      for (let i = 0; i <= 9; i++) {
        const span = document.createElement('span');
        span.textContent = i;
        reel.appendChild(span);
      }
      digitContainer.appendChild(reel);
      container.appendChild(digitContainer);
    }
    while (container.children.length > maxLength && maxLength > 0) {
      container.removeChild(container.firstChild);
    }

    const digitContainers = container.children;
    for (let i = 0; i < digitContainers.length; i++) {
      const reel = digitContainers[i].querySelector('.reel');
      const targetDigit = parseInt(newValuePadded[i], 10);
      const transformY = -targetDigit * digitHeight;

      reel.style.transition = 'none';
      if (!isFirstLoad) {
        const oldDigit = parseInt(oldValuePadded[i], 10) || 0;
        reel.style.transform = `translateY(${-oldDigit * digitHeight}px)`;
      } else {
        reel.style.transform = `translateY(0px)`;
      }

      setTimeout(() => {
        reel.style.transition = `transform ${0.85 + i * 0.08}s cubic-bezier(0.68, -0.55, 0.27, 1.55)`;
        reel.style.transform = `translateY(${transformY}px)`;
      }, 40);
    }
    setTimeout(resolve, 950);
  });
}

/**
 * Standard View Renderer (detailed tables, leading candidate leaderboard, progress bars)
 */
function renderStandardView(main, payload, isViewerAdmin) {
  const { posts, results, isCountingActive, isResultsPublished, isResultsLocked } = payload || {};

  // For public visitors: strictly hide until released by Returning Officer
  // For admins: allow viewing live breakdown stream
  if ((!results || results.length === 0 || !isResultsPublished) && !isViewerAdmin) {
    if (isCountingActive) {
      main.innerHTML = `
        <div class="text-center py-20 bg-amber-500/10 rounded-2xl border border-amber-500/30 page-enter shadow-2xl">
          <div class="text-6xl mb-4 animate-bounce">🗳️</div>
          <div class="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> Live Counting Underway
          </div>
          <h2 class="text-3xl font-black text-white mb-2">Counting in Progress</h2>
          <p class="text-slate-300 max-w-lg mx-auto text-sm leading-relaxed mb-6">
            Vote counting is actively in progress under the supervision of the Returning Officer.
            Official post-wise counts and leaderboards will appear as rounds are completed.
          </p>
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs">
            <span>🔒</span> Published strictly on authorization by Returning Officer
          </div>
        </div>
      `;
    } else {
      main.innerHTML = `
        <div class="text-center py-20 bg-white/5 rounded-2xl border border-white/10 page-enter shadow-xl">
          <div class="text-6xl mb-4">⏳</div>
          <div class="inline-block bg-slate-500/20 text-slate-400 border border-slate-500/40 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3">
            Awaiting Counting
          </div>
          <h2 class="text-3xl font-black text-white mb-2">Counting Not Started</h2>
          <p class="text-slate-400 max-w-lg mx-auto text-sm leading-relaxed mb-6">
            The counting of votes has not commenced yet. Please wait for the Returning Officer to initiate the official counting process.
          </p>
          <div class="flex justify-center gap-3">
            <button id="btnWaitHome" class="btn btn-secondary">← Return to Home</button>
          </div>
        </div>
      `;
      main.querySelector('#btnWaitHome')?.addEventListener('click', () => router.navigate('/'));
    }
    return;
  }

  const sortedPosts = sortPosts(posts || []);
  const agg = {};
  sortedPosts.forEach(p => {
    const name = p.post || p.name;
    agg[name] = {};
  });

  (results || []).forEach(r => {
    const pName = r.Post;
    if (!agg[pName]) agg[pName] = {};
    if (!agg[pName][r.CandidateId]) {
      agg[pName][r.CandidateId] = { name: r.CandidateName, votes: 0 };
    }
    agg[pName][r.CandidateId].votes += Number(r.Votes) || 0;
  });

  let html = '';

  if (isViewerAdmin && !isResultsPublished) {
    html += `
      <div class="p-3 mb-6 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span>👑</span>
          <span>ADMIN LIVE STREAM • Unreleased data visible only to authenticated administrator</span>
        </div>
        <span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">Real-Time Feed</span>
      </div>
    `;
  }

  // Leaderboard (General & Reps only)
  const leaderboardPosts = sortedPosts.filter(p => {
    const name = p.post || p.name;
    return !p.deptRestriction && !name.toUpperCase().includes('ASSOCIATION');
  });

  if (leaderboardPosts.length > 0) {
    let leaderboardRows = '';
    leaderboardPosts.forEach(p => {
      const name = p.post || p.name;
      const pAgg = agg[name];
      if (!pAgg) return;
      const candidateIds = Object.keys(pAgg).filter(id => id !== 'INVALID' && id !== 'NOTA');
      if (candidateIds.length === 0) return;
      
      const valids = candidateIds.map(id => pAgg[id]);
      valids.sort((a, b) => b.votes - a.votes);
      
      const isUUC = name.toUpperCase().includes('UUC') || name.toUpperCase().includes('UNIVERSITY');
      const seats = isUUC ? 2 : 1;
      
      let leadThreshold = 0;
      if (valids.length > seats) {
        leadThreshold = valids[seats].votes;
      }
      
      const leadingCandidates = valids.filter((c, i) => i < seats && c.votes > 0);
      const leadingText = leadingCandidates.length > 0 
        ? leadingCandidates.map(c => {
            const lead = c.votes - leadThreshold;
            return `<div class="flex flex-wrap items-center gap-1.5 mb-1.5 last:mb-0">
                      <span class="whitespace-nowrap font-bold text-white">${esc(c.name)}</span>
                      <span class="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">${c.votes} votes</span>
                      ${lead > 0 ? `<span class="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded font-bold border border-green-500/30 whitespace-nowrap">Lead: ${lead}</span>` : ''}
                    </div>`;
          }).join('') 
        : '<span class="text-slate-500 italic text-xs font-normal">Awaiting Results</span>';
      
      leaderboardRows += `
        <tr class="border-b border-white/5 hover:bg-white/5 transition">
          <td class="py-3 px-4 font-bold text-slate-300 text-xs sm:text-sm leading-tight w-1/2">${esc(name)}</td>
          <td class="py-3 px-4 text-amber-400 font-bold text-sm leading-tight w-1/2">${leadingText}</td>
        </tr>
      `;
    });
    
    if (leaderboardRows) {
      html += `
        <div class="glass rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl mb-10 page-enter">
          <div class="bg-gradient-to-r from-slate-900/90 to-amber-900/40 p-4 border-b border-amber-500/20 flex items-center justify-center gap-2">
            <span class="text-2xl">🏆</span>
            <h2 class="text-lg font-black text-amber-400 uppercase tracking-widest m-0">Leading Candidates</h2>
          </div>
          <div class="overflow-x-auto bg-slate-900/40">
            <table class="w-full text-left">
              <tbody>
                ${leaderboardRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  }

  html += '<div class="space-y-10">';
  
  sortedPosts.forEach(post => {
    const name = post.post || post.name;
    const pAgg = agg[name];
    if (!pAgg) return;
    
    const candidateIds = Object.keys(pAgg);
    if (candidateIds.length === 0) return;

    const valids = candidateIds.filter(id => id !== 'INVALID' && id !== 'NOTA').map(id => pAgg[id]);
    const invalid = pAgg['INVALID'];
    const nota = pAgg['NOTA'];

    const isUUC = name.toUpperCase().includes('UUC') || name.toUpperCase().includes('UNIVERSITY');
    const seats = isUUC ? 2 : 1;

    valids.sort((a, b) => b.votes - a.votes);
    const maxVotes = valids.length ? valids[0].votes : 0;
    const totalValidVotes = valids.reduce((sum, c) => sum + c.votes, 0) + (nota ? nota.votes : 0);
    const grandTotal = totalValidVotes + (invalid ? invalid.votes : 0);

    let leadThreshold = 0;
    if (valids.length > seats) {
      leadThreshold = valids[seats].votes;
    }

    html += `
      <div class="glass rounded-2xl overflow-hidden border border-white/10 page-enter shadow-2xl">
        <div class="bg-gradient-to-r from-slate-900/80 to-indigo-900/80 p-5 border-b border-white/10 flex items-center justify-between">
          <h2 class="text-xl sm:text-2xl font-bold text-white tracking-tight">${esc(name)}</h2>
          ${seats > 1 ? `<span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">${seats} SEATS</span>` : ''}
        </div>
        <div class="p-6 space-y-6 bg-slate-900/20">
          ${valids.map((c, i) => {
            const percentage = grandTotal > 0 ? ((c.votes / grandTotal) * 100).toFixed(1) : 0;
            const barWidth = maxVotes > 0 ? (c.votes / maxVotes) * 100 : 0;
            const isLeading = i < seats && c.votes > 0;
            const lead = isLeading ? (c.votes - leadThreshold) : 0;

            return `
              <div class="relative">
                <div class="flex justify-between items-end mb-2 relative z-10">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full ${isLeading ? (isResultsLocked ? 'bg-emerald-500 text-emerald-950' : 'bg-amber-500 text-amber-950') : 'bg-white/10 text-white'} flex items-center justify-center font-bold text-sm shadow-lg">
                      ${isLeading ? (isResultsLocked ? '🏆' : '★') : i + 1}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-white text-base sm:text-lg">${esc(c.name)}</span>
                        ${isLeading ? (isResultsLocked ? 
                          `<span class="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-black border border-emerald-500/30 tracking-wider">ELECTED</span>` : 
                          `<span class="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-black border border-amber-500/30 tracking-wider">LEADING</span>`
                        ) : ''}
                        ${lead > 0 ? `<span class="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-green-500/30">LEAD: ${lead}</span>` : ''}
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="text-2xl font-black text-white">${c.votes}</span>
                    <span class="text-xs text-slate-400 ml-1">votes (${percentage}%)</span>
                  </div>
                </div>
                <div class="h-3.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                  <div class="h-full rounded-full transition-all duration-1000 ease-out ${isLeading ? (isResultsLocked ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-amber-400 to-amber-600') : 'bg-gradient-to-r from-indigo-500 to-purple-600'}" style="width: ${barWidth}%"></div>
                </div>
              </div>
            `;
          }).join('')}
          
          <div class="mt-8 pt-5 border-t border-white/10 space-y-3">
            ${nota && nota.votes > 0 ? `
              <div class="flex justify-between text-sm text-slate-400">
                <span>None of the Above (NOTA)</span>
                <span class="font-bold text-white">${nota.votes} <span class="text-xs text-slate-500 font-normal ml-1">(${((nota.votes / grandTotal) * 100).toFixed(1)}%)</span></span>
              </div>
            ` : ''}

            ${invalid && invalid.votes > 0 ? `
              <div class="flex justify-between text-sm text-slate-500">
                <span>Invalid / Rejected</span>
                <span class="font-bold text-red-400">${invalid.votes} <span class="text-xs text-slate-500 font-normal ml-1">(${((invalid.votes / grandTotal) * 100).toFixed(1)}%)</span></span>
              </div>
            ` : ''}

            <div class="flex justify-between items-center py-2 px-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 mt-4">
              <span class="text-xs font-bold text-indigo-300 uppercase tracking-widest">Total Valid Votes</span>
              <span class="text-lg font-black text-white">${totalValidVotes}</span>
            </div>

            <div class="flex justify-between items-center py-2 px-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <span class="text-xs font-bold text-purple-300 uppercase tracking-widest">Grand Total</span>
              <span class="text-lg font-black text-white">${grandTotal}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';

  if (html === '<div class="space-y-10"></div>') {
    main.innerHTML = `
      <div class="alert alert-info text-center">Results backend is initialized, but no votes have been aggregated for the configured posts yet.</div>
    `;
  } else {
    main.innerHTML = html;
  }
}
