/**
 * pages/results.js
 * Public dashboard to view live election results.
 */
import { api } from '../api.js';
import { esc } from '../utils.js';
import { router } from '../router.js';

const CACHE_KEY = 'election_results_cache';
const CACHE_TIME_KEY = 'election_results_last_fetch';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export async function renderResults(container) {
  container.innerHTML = `
    <div class="page-enter min-h-screen">
      <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
        <div class="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
            <span class="text-slate-600">|</span>
            <h1 class="font-bold text-white text-sm">Live Election Results</h1>
          </div>
          <div class="flex items-center gap-3">
            <span id="cacheTimer" class="text-[10px] text-slate-500 font-mono"></span>
            <button id="btnRefresh" class="btn btn-secondary btn-sm">🔄 Refresh</button>
          </div>
        </div>
      </header>
      <main id="resultsMain" class="max-w-5xl mx-auto px-4 py-8">
        <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Fetching Live Results...</p></div>
      </main>
    </div>
  `;

  const timerEl = container.querySelector('#cacheTimer');
  const updateTimer = () => {
    const lastFetch = localStorage.getItem(CACHE_TIME_KEY);
    if (!lastFetch) { timerEl.textContent = ''; return; }
    const nextUpdate = parseInt(lastFetch, 10) + REFRESH_INTERVAL;
    const remaining = Math.max(0, nextUpdate - Date.now());
    if (remaining <= 0) {
      timerEl.textContent = 'Live Update Available';
      timerEl.classList.add('text-green-400');
    } else {
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      timerEl.textContent = `Update in ${mins}:${secs.toString().padStart(2, '0')}`;
      timerEl.classList.remove('text-green-400');
    }
  };

  setInterval(updateTimer, 1000);
  updateTimer();

  container.querySelector('#backToHome').addEventListener('click', () => router.navigate('/'));
  container.querySelector('#btnRefresh').addEventListener('click', () => fetchAndRender(container.querySelector('#resultsMain'), true));

  await fetchAndRender(container.querySelector('#resultsMain'));
}

async function fetchAndRender(main, force = false) {
  try {
    const lastFetch = localStorage.getItem(CACHE_TIME_KEY);
    const cachedData = localStorage.getItem(CACHE_KEY);
    
    let posts, results;

    if (!force && lastFetch && cachedData && (Date.now() - parseInt(lastFetch, 10) < REFRESH_INTERVAL)) {
      // Use cache
      const parsed = JSON.parse(cachedData);
      posts = parsed.posts;
      results = parsed.results;
      const schedule = parsed.schedule || {};
      const year = schedule.electionYear || new Date().getFullYear();
      updateHeader(main, year);
    } else {
      // Fetch fresh
      let schedule;
      [posts, results, schedule] = await Promise.all([
        api.getPosts(),
        api.getResults().catch(() => []),
        api.getPublicSchedule().catch(() => ({}))
      ]);
      
      // Save to cache
      localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      localStorage.setItem(CACHE_KEY, JSON.stringify({ posts, results, schedule }));
      
      const year = schedule.electionYear || new Date().getFullYear();
      updateHeader(main, year);
    }

function updateHeader(main, year) {
  const header = main.closest('.page-enter')?.querySelector('h1');
  if (header) header.textContent = `Live Election Results ${year}`;
}

    if (results.length === 0) {
      main.innerHTML = `
        <div class="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
          <div class="text-5xl mb-4">📊</div>
          <h2 class="text-2xl font-bold text-white mb-2">Counting in Progress</h2>
          <p class="text-slate-400">No results have been published yet. Please check back later.</p>
        </div>
      `;
      return;
    }

    const agg = {};
    posts.forEach(p => {
      const name = p.post || p.name; // Robust naming check
      agg[name] = {};
    });

    results.forEach(r => {
      const pName = r.Post;
      if (!agg[pName]) agg[pName] = {};
      if (!agg[pName][r.CandidateId]) {
        agg[pName][r.CandidateId] = { name: r.CandidateName, votes: 0 };
      }
      agg[pName][r.CandidateId].votes += Number(r.Votes) || 0;
    });

    let html = '<div class="space-y-12">';
    
    posts.forEach(post => {
      const name = post.post || post.name;
      const pAgg = agg[name];
      if (!pAgg) return;
      
      const candidateIds = Object.keys(pAgg);
      if (candidateIds.length === 0) return;

      const valids = candidateIds.filter(id => id !== 'INVALID' && id !== 'NOTA').map(id => pAgg[id]);
      const invalid = pAgg['INVALID'];
      const nota = pAgg['NOTA'];

      valids.sort((a, b) => b.votes - a.votes);
      const maxVotes = valids.length ? valids[0].votes : 0;
      const totalValidVotes = valids.reduce((sum, c) => sum + c.votes, 0) + (nota ? nota.votes : 0);

      html += `
        <div class="glass rounded-2xl overflow-hidden border border-white/10 page-enter">
          <div class="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 p-5 border-b border-white/10 flex justify-between items-end">
            <div>
              <h2 class="text-2xl font-bold text-white">${esc(name)}</h2>
              <p class="text-sm text-indigo-300 mt-1">${totalValidVotes} Total Valid Votes Counted</p>
            </div>
          </div>
          <div class="p-6 space-y-6">
            ${valids.map((c, i) => {
              const percentage = totalValidVotes > 0 ? ((c.votes / totalValidVotes) * 100).toFixed(1) : 0;
              const barWidth = maxVotes > 0 ? (c.votes / maxVotes) * 100 : 0;
              const isWinner = i === 0 && c.votes > 0;
              return `
                <div class="relative">
                  <div class="flex justify-between items-end mb-2 relative z-10">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full ${isWinner ? 'bg-amber-500 text-amber-950' : 'bg-white/10 text-white'} flex items-center justify-center font-bold text-sm shadow-lg">
                        ${isWinner ? '🏆' : i + 1}
                      </div>
                      <span class="font-bold text-white text-lg">${esc(c.name)}</span>
                    </div>
                    <div class="text-right">
                      <span class="text-2xl font-black text-white">${c.votes}</span>
                      <span class="text-xs text-slate-400 ml-1">votes (${percentage}%)</span>
                    </div>
                  </div>
                  <div class="h-4 w-full bg-slate-800 rounded-full overflow-hidden relative">
                    <div class="h-full rounded-full transition-all duration-1000 ease-out ${isWinner ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}" style="width: ${barWidth}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
            
            ${nota && nota.votes > 0 ? `
              <div class="border-t border-white/10 pt-4 mt-6 flex justify-between text-sm text-slate-400">
                <span>NOTA</span>
                <span class="font-bold text-white">${nota.votes} <span class="text-xs text-slate-500 font-normal">votes (${((nota.votes / totalValidVotes) * 100).toFixed(1)}%)</span></span>
              </div>
            ` : ''}

            ${invalid && invalid.votes > 0 ? `
              <div class="${nota && nota.votes > 0 ? 'border-t border-white/10 pt-4 mt-4' : 'border-t border-white/10 pt-4 mt-6'} flex justify-between text-sm text-slate-500">
                <span>INVALID</span>
                <span class="font-bold text-red-400">${invalid.votes}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });

    html += '</div>';
    
    if (html === '<div class="space-y-12"></div>') {
      main.innerHTML = `
        <div class="alert alert-info text-center">Results backend is initialized, but no votes have been aggregated for the configured posts yet.</div>
      `;
    } else {
      main.innerHTML = html;
    }

  } catch (err) {
    main.innerHTML = `<div class="alert alert-error">❌ Failed to load results: ${esc(err.message)}</div>`;
  }
}
