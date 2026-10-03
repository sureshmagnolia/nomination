/**
 * pages/admin/notices.js
 * Admin Management Hub for Official Notices, Formal Notifications,
 * and Polling Booth Public Display Posters.
 */

import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { printOfficialNotice, printBoothDoorPoster, printBatchBoothDoorPosters, printCampusMasterDirectory } from '../../noticesPrinter.js';
import { getDefaultStatutoryNotices } from '../../noticesTemplates.js';
import { generateAndPrintBallots, generateAndPrintBallotPressSummary } from './ballots.js';
import { generateAndPrintElectoralRolls, generateAndPrintBallotAccounts } from './booths.js';
import { openPrintRollModal } from '../../rollPrinter.js';


export async function renderAdminNotices(container) {
  const pwd = getAdminPassword();
  if (!pwd) return;

  renderAdminLayout(container, 'notices', `
    <div class="text-center py-16">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 mt-4 text-sm">Loading notices and polling booth poster center...</p>
    </div>
  `);

  await loadAdminNoticesData(container.querySelector('#adminMain'), pwd);
}

async function loadAdminNoticesData(main, pwd) {
  if (!main) return;

  try {
    const [noticesData, nominalRoll] = await Promise.all([
      api.adminGetNotices(pwd, true).catch(() => ({})),
      api.getNominalRoll().catch(() => [])
    ]);

    const settings = noticesData.settings || {};
    const schedule = noticesData.schedule || {};
    const booths = Array.isArray(noticesData.booths) ? noticesData.booths : [];
    const locations = Array.isArray(noticesData.locations) ? noticesData.locations : [];
    const posts = Array.isArray(noticesData.posts) && noticesData.posts.length > 0 ? noticesData.posts : (CONFIG.DEFAULT_POSTS || []);
    let notices = Array.isArray(noticesData.notices) ? noticesData.notices : [];

    if (notices.length === 0) {
      notices = getDefaultStatutoryNotices(settings, schedule, booths, posts);
    } else {
      // Auto-sanitize Notice #1 on the client if it contains obsolete Lyngdoh, old reference header, or is missing posts/columns
      const n1 = notices.find(n => n.id === 'statutory_notice_election_notification');
      if (n1) {
        const text = String(n1.content || '');
        const hasLyngdoh = text.toLowerCase().includes('lyngdoh');
        const hasOldRef = text.includes('UNIVERSITY REGULATION & ELECTION NOTIFICATION') || text.includes('Reference: University of Calicut Order');
        const missingPosts = !text.includes('Main Office Bearers') && !text.includes('Class Representatives');
        const missingColumns = !text.includes(':::columns');
        if (hasLyngdoh || hasOldRef || missingPosts || missingColumns) {
          const fresh = getDefaultStatutoryNotices(settings, schedule, booths, posts).find(t => t.id === 'statutory_notice_election_notification');
          if (fresh) {
            Object.assign(n1, fresh);
            api.adminSaveNotice(pwd, n1).catch(console.error);
          }
        }
      }
    }

    // Calculate class statistics from nominal roll
    const classMap = {};
    nominalRoll.forEach(s => {
      const rawCls = String(s['CLASS'] || '').trim();
      const dept = String(s['Dept'] || '').trim();
      const isRS = rawCls.toUpperCase().includes('RESEARCH') || rawCls.toUpperCase().includes('SCHOLAR') || rawCls.toUpperCase().includes('PHD');
      const key = isRS ? `RESEARCH SCHOLAR - ${dept}` : rawCls;
      if (key) {
        if (!classMap[key]) classMap[key] = { name: key, dept, count: 0 };
        classMap[key].count++;
      }
    });

    // Calculate voters per booth
    booths.forEach(b => {
      const bClasses = Array.isArray(b.classes) ? b.classes : [];
      b.totalStudents = 0;
      bClasses.forEach(cName => {
        if (classMap[cName]) b.totalStudents += classMap[cName].count;
      });
    });

    renderAdminNoticesHub(main, pwd, settings, schedule, notices, booths, classMap, posts, nominalRoll);
  } catch (err) {
    console.error('Error loading admin notices:', err);
    main.innerHTML = `<div class="alert alert-error">❌ ${esc(err.message || 'Failed to load notices')}</div>`;
  }
}

function renderAdminNoticesHub(main, pwd, settings, schedule, notices, booths, classMap, posts = [], nominalRoll = []) {
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;
  const year = settings.electionYear || new Date().getFullYear();

  const publishedCount = notices.filter(n => n.isPublished !== false && n.isPublished !== 'false').length;
  const totalElectors = booths.reduce((sum, b) => sum + (b.totalStudents || 0), 0);

  main.innerHTML = `
    <div class="page-enter space-y-6">
      
      <!-- Top Action Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 class="text-xl font-bold text-white">Official Notices, Posters &amp; Master Prints</h3>
          <p class="text-slate-400 text-sm">Unified statutory publishing center: ballots, press summaries, marked rolls, booth accounts, door posters, and notices.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button id="btnDraftNewNotice" class="btn btn-primary btn-sm flex items-center gap-1.5 shadow-lg shadow-indigo-500/20">
            <span>➕</span> Draft New Notice
          </button>
          <button id="btnRefreshNoticeOne" class="btn bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 btn-sm flex items-center gap-1.5" title="Re-sync Election Notification #1 with current Election Posts and University Regulation U.O.No. 12646/2026/Admn">
            <span>🔄</span> Refresh Notification Posts
          </button>
          <button id="btnLoadTemplates" class="btn btn-secondary btn-sm flex items-center gap-1.5" title="Auto-populate official statutory notices">
            <span>⚡</span> Load Statutory Templates
          </button>
        </div>
      </div>

      <!-- Quick Telemetry Stats Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="glass rounded-xl p-4 border border-white/10">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Notices</div>
          <div class="text-2xl font-bold text-white mt-1">${notices.length}</div>
          <div class="text-xs text-indigo-400 mt-0.5">${publishedCount} Finalized</div>
        </div>

        <div class="glass rounded-xl p-4 border border-white/10">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Configured Booths</div>
          <div class="text-2xl font-bold text-white mt-1">${booths.length}</div>
          <div class="text-xs text-emerald-400 mt-0.5">${totalElectors} Total Electors</div>
        </div>

        <div class="glass rounded-xl p-4 border border-white/10">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Door Posters Ready</div>
          <div class="text-2xl font-bold text-white mt-1">${booths.length}</div>
          <div class="text-xs text-amber-400 mt-0.5">1-Click Batch Printable</div>
        </div>

        <div class="glass rounded-xl p-4 border border-white/10">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Statutory Print Hub</div>
          <div class="text-2xl font-bold text-white mt-1">Ready</div>
          <div class="text-xs text-emerald-400 mt-0.5">5 Official Packets Active</div>
        </div>
      </div>

      <!-- Primary Tabs -->
      <div class="glass rounded-2xl overflow-hidden border border-white/10">
        <div class="flex border-b border-white/10 bg-slate-900/60 p-2 gap-2 overflow-x-auto">
          <button id="adminTabMasterPrint" class="px-5 py-2.5 text-xs font-bold rounded-xl transition bg-indigo-600 text-white shadow-lg flex items-center gap-1.5 shrink-0">
            <span>🖨️</span> Master Print Hub (All Documents)
          </button>
          <button id="adminTabPosters" class="px-5 py-2.5 text-xs font-bold rounded-xl transition text-slate-400 hover:text-white shrink-0">
            🚪 Polling Booth Posters (${booths.length})
          </button>
          <button id="adminTabNotices" class="px-5 py-2.5 text-xs font-bold rounded-xl transition text-slate-400 hover:text-white shrink-0">
            📢 Official Notifications (${notices.length})
          </button>
          <button id="adminTabIndex" class="px-5 py-2.5 text-xs font-bold rounded-xl transition text-slate-400 hover:text-white shrink-0">
            📋 Class-to-Booth Master Index
          </button>
        </div>

        <!-- PANEL 0: MASTER PRINT & DISPATCH HUB -->
        <div id="adminPanelMasterPrint" class="p-6 space-y-8">
          
          <!-- Banner Overview -->
          <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 shadow-2xl">
            <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div class="space-y-2 max-w-2xl">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  <span>🏛️</span> Returning Officer Master Dispatch Center
                </div>
                <h3 class="text-2xl font-black text-white tracking-tight">Master Print &amp; Statutory Dispatch Hub</h3>
                <p class="text-slate-300 text-sm leading-relaxed">
                  Consolidated election dispatch headquarters. Generate, preview, and print every statutory document, printing press ballot bundles with book serial numbers, presiding officer booth packets, official duty orders, and counting tallies from a single unified hub.
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-3 shrink-0">
                <button id="btnHubQuickNominalRoll" class="btn bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2">
                  <span>📜</span> Print Master Roll
                </button>
                <button id="btnHubQuickPressSummary" class="btn bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2">
                  <span>🗳️</span> Press Summary Sheet
                </button>
              </div>
            </div>
          </div>

          <!-- 5 Statutory Packets Grid -->
          <div class="space-y-6">

            <!-- PACKET 1: BALLOT PAPERS & PRINTING PRESS -->
            <div class="glass rounded-2xl border border-amber-500/30 overflow-hidden shadow-xl">
              <div class="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent px-6 py-4 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="text-2xl p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">🗳️</span>
                  <div>
                    <h4 class="text-base font-bold text-white flex items-center gap-2">
                      1. Ballot Papers &amp; Printing Press Bundles
                      <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Press Requisition</span>
                    </h4>
                    <p class="text-xs text-slate-400">Government / Commercial Printing Press packets, master bundle serial registries, and candidate voting sheets.</p>
                  </div>
                </div>
                <a href="#/admin/ballots" class="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1">
                  <span>⚙️</span> Go to Ballot Setup &rarr;
                </a>
              </div>

              <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Press Summary -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-amber-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">Master Docket</span>
                      <span class="text-[10px] font-mono text-slate-400">A4 Portrait</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Printing Press Summary &amp; Serial Ledger</h5>
                    <p class="text-xs text-slate-400 mt-1">Full serial ranges (e.g. G1001-G2500), book numbers, total quantities per booth, and color-coded paper stocks for delivery to the printer.</p>
                  </div>
                  <button id="btnHubPressSummary" class="btn bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 shadow-md">
                    <span>🖨️</span> Print Press Summary
                  </button>
                </div>

                <!-- General Ballots -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-amber-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20">Executive Posts</span>
                      <span class="text-[10px] font-mono text-slate-400">A3 / Split</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">General Union Ballot Papers</h5>
                    <p class="text-xs text-slate-400 mt-1">Chairman, Vice-Chairman, General Secretary, Joint Secretary, UUC, Arts Club, Student Editor, and Sports with counterfoils.</p>
                  </div>
                  <button id="btnHubPrintGeneral" class="btn btn-secondary text-xs font-bold py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 hover:bg-white/10">
                    <span>🖨️</span> Print General Ballots
                  </button>
                </div>

                <!-- Year Rep Ballots -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-amber-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">Class Batches</span>
                      <span class="text-[10px] font-mono text-slate-400">A5 Portrait</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Year Representative Ballots</h5>
                    <p class="text-xs text-slate-400 mt-1">Year-wise representative voting slips for I DC, II DC, III DC, I PG, II PG, and Research Scholars across all allotted booths.</p>
                  </div>
                  <button id="btnHubPrintRep" class="btn btn-secondary text-xs font-bold py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 hover:bg-white/10">
                    <span>🖨️</span> Print Year Rep Ballots
                  </button>
                </div>

                <!-- Association Ballots -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-amber-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20">Departments</span>
                      <span class="text-[10px] font-mono text-slate-400">A5 Portrait</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Subject Association Ballots</h5>
                    <p class="text-xs text-slate-400 mt-1">Department-specific Association Secretary ballots distributed strictly to eligible major students with book ID tracking.</p>
                  </div>
                  <button id="btnHubPrintAssoc" class="btn btn-secondary text-xs font-bold py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 hover:bg-white/10">
                    <span>🖨️</span> Print Assoc. Ballots
                  </button>
                </div>
              </div>
            </div>

            <!-- PACKET 2: POLLING BOOTH KITS (FOR PRESIDING OFFICERS) -->
            <div class="glass rounded-2xl border border-emerald-500/30 overflow-hidden shadow-xl">
              <div class="bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent px-6 py-4 border-b border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="text-2xl p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">🏢</span>
                  <div>
                    <h4 class="text-base font-bold text-white flex items-center gap-2">
                      2. Polling Booth Kits (Presiding Officer Packets)
                      <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Station Statutory Kit</span>
                    </h4>
                    <p class="text-xs text-slate-400">Marked copies of electoral rolls, statutory ballot account covers, and public door guidance notices.</p>
                  </div>
                </div>
                <a href="#/admin/booths" class="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                  <span>⚙️</span> Go to Booth Allotment &rarr;
                </a>
              </div>

              <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Marked Electoral Rolls -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-emerald-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">Voter Signature Roll</span>
                      <span class="text-[10px] font-mono text-slate-400">A4 Portrait</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Marked Copy of Electoral Rolls</h5>
                    <p class="text-xs text-slate-400 mt-1">Official booth-wise register with Sl.No, Admission No, Name, Class, and signature column with Booth Facing Sheet.</p>
                  </div>
                  <button id="btnHubPrintElectoralRolls" class="btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 shadow-md">
                    <span>🖨️</span> Print Marked Rolls
                  </button>
                </div>

                <!-- Ballots & Books Account (Form 2) -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-emerald-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">Form 2 Statutory</span>
                      <span class="text-[10px] font-mono text-slate-400">A4 Portrait</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Ballots &amp; Books Account</h5>
                    <p class="text-xs text-slate-400 mt-1">Statutory account of ballot papers received, issued to electors, and returned unused or cancelled in sealed covers.</p>
                  </div>
                  <button id="btnHubPrintBallotAccounts" class="btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 shadow-md">
                    <span>🖨️</span> Print Ballot Accounts
                  </button>
                </div>

                <!-- Batch Polling Booth Door Posters -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-emerald-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20">Public Display</span>
                      <span class="text-[10px] font-mono text-slate-400">Batch A4</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Booth Door Posters (All Booths)</h5>
                    <p class="text-xs text-slate-400 mt-1">High-visibility posters for classroom doors specifying booth numbers, venues, and allotted departments/classes.</p>
                  </div>
                  <button id="btnHubPrintBatchPosters" class="btn btn-secondary text-xs font-bold py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 hover:bg-white/10">
                    <span>🖨️</span> Print ALL Door Posters
                  </button>
                </div>

                <!-- Campus Master Directory -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-emerald-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded border border-sky-400/20">Notice Board</span>
                      <span class="text-[10px] font-mono text-slate-400">A4 / Banner</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Campus Master Directory</h5>
                    <p class="text-xs text-slate-400 mt-1">Complete alphabetical class-to-booth guide for college notice boards, entry gates, and help desks.</p>
                  </div>
                  <button id="btnHubPrintCampusDirectory" class="btn btn-secondary text-xs font-bold py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 hover:bg-white/10">
                    <span>🖨️</span> Print Campus Directory
                  </button>
                </div>
              </div>
            </div>

            <!-- PACKET 3: STATUTORY NOTIFICATIONS, ROLLS & CANDIDATE LISTS -->
            <div class="glass rounded-2xl border border-indigo-500/30 overflow-hidden shadow-xl">
              <div class="bg-gradient-to-r from-indigo-500/15 via-indigo-500/5 to-transparent px-6 py-4 border-b border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="text-2xl p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30">📦</span>
                  <div>
                    <h4 class="text-base font-bold text-white flex items-center gap-2">
                      3. Statutory Notifications, Rolls &amp; Candidate Lists
                      <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Official Gazettes</span>
                    </h4>
                    <p class="text-xs text-slate-400">Nominal rolls, university election notices, code of conduct, voter guidelines, and candidate registers.</p>
                  </div>
                </div>
                <a href="#/admin/publish" class="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  <span>⚙️</span> Go to Candidate Publishing &rarr;
                </a>
              </div>

              <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Nominal Roll Studio -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-indigo-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20">Master Roll</span>
                      <span class="text-[10px] font-mono text-slate-400">Studio Modal</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Nominal Roll (Draft / Final)</h5>
                    <p class="text-xs text-slate-400 mt-1">Full interactive print engine: single/two column format, department filter, and statutory certification.</p>
                  </div>
                  <button id="btnHubOpenRollModal" class="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 shadow-md">
                    <span>📜</span> Open Roll Print Studio
                  </button>
                </div>

                <!-- Notice #1 -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-indigo-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">Statutory #1</span>
                      <span class="text-[10px] font-mono text-slate-400">Formal Order</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Election Notification &amp; Schedule</h5>
                    <p class="text-xs text-slate-400 mt-1">Statutory order under University Regulation with schedule of nominations, scrutiny, and polling.</p>
                  </div>
                  <button id="btnHubPrintNotice1" class="btn btn-secondary text-xs font-bold py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 hover:bg-white/10">
                    <span>📢</span> Print Notice #1
                  </button>
                </div>

                <!-- Notice #2 -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-indigo-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20">Statutory #2</span>
                      <span class="text-[10px] font-mono text-slate-400">Conduct Code</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Model Code of Conduct</h5>
                    <p class="text-xs text-slate-400 mt-1">Campaign rules, spending caps, noise restrictions, and disciplinary sanctions for contestants.</p>
                  </div>
                  <button id="btnHubPrintNotice2" class="btn btn-secondary text-xs font-bold py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 hover:bg-white/10">
                    <span>📢</span> Print Notice #2
                  </button>
                </div>

                <!-- Notice #3 -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-indigo-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded border border-sky-400/20">Statutory #3</span>
                      <span class="text-[10px] font-mono text-slate-400">Voter Rules</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Voter Guidelines &amp; ID Proofs</h5>
                    <p class="text-xs text-slate-400 mt-1">Approved photo identity cards, ballot marking instructions, and secret ballot safeguards.</p>
                  </div>
                  <button id="btnHubPrintNotice3" class="btn btn-secondary text-xs font-bold py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 hover:bg-white/10">
                    <span>📢</span> Print Notice #3
                  </button>
                </div>
              </div>
            </div>

            <!-- PACKET 4: OFFICIALS & PERSONNEL DUTY ORDERS -->
            <div class="glass rounded-2xl border border-purple-500/30 overflow-hidden shadow-xl">
              <div class="bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-transparent px-6 py-4 border-b border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="text-2xl p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">👥</span>
                  <div>
                    <h4 class="text-base font-bold text-white flex items-center gap-2">
                      4. Election Personnel &amp; Staff Duty Orders
                      <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Official Orders</span>
                    </h4>
                    <p class="text-xs text-slate-400">Presiding Officer and Polling Officer duty orders, counting team rosters, and individual appointment slips.</p>
                  </div>
                </div>
                <a href="#/admin/officials" class="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  <span>⚙️</span> Go to Officials Hub &rarr;
                </a>
              </div>

              <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Polling Duty Orders -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20">Polling Day</span>
                      <span class="text-[10px] font-mono text-slate-400">Landscape Roster + Slips</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Polling Personnel Appointment Orders &amp; Slips</h5>
                    <p class="text-xs text-slate-400 mt-1">Consolidated duty roster for all polling booths, along with individualized appointment slips with cut-off acknowledgement coupons.</p>
                  </div>
                  <a href="#/admin/officials" class="btn bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 shadow-md">
                    <span>📜</span> Open Polling Orders &amp; Slips Studio
                  </a>
                </div>

                <!-- Counting Duty Orders -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20">Counting Day</span>
                      <span class="text-[10px] font-mono text-slate-400">Table Allocations</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Counting Supervisors &amp; Tabulators Orders</h5>
                    <p class="text-xs text-slate-400 mt-1">Table allocation orders for counting assistants, tabulators, and hall supervisors with reporting schedules.</p>
                  </div>
                  <a href="#/admin/officials" class="btn bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 shadow-md">
                    <span>📜</span> Open Counting Orders &amp; Slips Studio
                  </a>
                </div>
              </div>
            </div>

            <!-- PACKET 5: COUNTING HALL & RESULTS FORMS -->
            <div class="glass rounded-2xl border border-rose-500/30 overflow-hidden shadow-xl">
              <div class="bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent px-6 py-4 border-b border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="text-2xl p-2 rounded-xl bg-rose-500/20 border border-rose-500/30">🧮</span>
                  <div>
                    <h4 class="text-base font-bold text-white flex items-center gap-2">
                      5. Counting Hall Forms &amp; Result Proclamations
                      <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">Statutory Forms 6 &amp; 7</span>
                    </h4>
                    <p class="text-xs text-slate-400">Working tabulator tally sheets, 25-ballot milestones, and Form 7 declaration of winners.</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <a href="#/admin/counting" class="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1">
                    <span>⚙️</span> Counting Hall &rarr;
                  </a>
                  <a href="#/admin/results" class="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                    <span>🏆</span> Results Proclamation &rarr;
                  </a>
                </div>
              </div>

              <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Milestone Sheets -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-rose-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20">Progressive Tally</span>
                      <span class="text-[10px] font-mono text-slate-400">25-Ballot Bundles</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Milestone Working Sheets</h5>
                    <p class="text-xs text-slate-400 mt-1">Live working calculation sheets for counting tables to tally candidate votes in progressive 25-ballot bundles.</p>
                  </div>
                  <a href="#/admin/counting" class="btn btn-secondary text-xs font-bold py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 hover:bg-white/10">
                    <span>🧮</span> Generate Milestone Sheets
                  </a>
                </div>

                <!-- Form 6 -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-rose-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">Form 6 Statutory</span>
                      <span class="text-[10px] font-mono text-slate-400">Table Tally Sheet</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Form 6 Counting Sheets</h5>
                    <p class="text-xs text-slate-400 mt-1">Official round-wise counting sheets with candidate names, supervisor signatures, and seal verification.</p>
                  </div>
                  <a href="#/admin/counting" class="btn btn-secondary text-xs font-bold py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 hover:bg-white/10">
                    <span>📋</span> Print Form 6 Sheets
                  </a>
                </div>

                <!-- Form 7 -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-rose-500/40 transition flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">Form 7 Proclamation</span>
                      <span class="text-[10px] font-mono text-slate-400">Final Declaration</span>
                    </div>
                    <h5 class="text-sm font-bold text-white">Form 7 — Results Proclamation</h5>
                    <p class="text-xs text-slate-400 mt-1">Official Declaration of Results and Certificate of Election signed by the Returning Officer for publication.</p>
                  </div>
                  <a href="#/admin/results" class="btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-lg w-full flex items-center justify-center gap-2 shadow-md">
                    <span>🏆</span> Open Form 7 Proclamation
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- PANEL 1: POLLING BOOTH POSTERS -->
        <div id="adminPanelPosters" class="p-6 space-y-6 hidden">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
            <div>
              <h4 class="font-bold text-white text-base">Polling Booth Door Posters &amp; Notice Board Banners</h4>
              <p class="text-slate-400 text-xs mt-0.5">High-contrast, large-format door notices with assigned classes, room numbers, and presiding officer voter rules.</p>
            </div>
            <div class="flex flex-wrap items-center gap-2 shrink-0">
              <button id="btnPrintAllDoorPosters" class="btn btn-primary btn-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30">
                <span>🖨️</span> Print ALL Door Posters (Batch A4)
              </button>
              <button id="btnPrintMasterDirectory" class="btn btn-secondary btn-sm flex items-center gap-1.5">
                <span>📋</span> Print Master Campus Directory
              </button>
            </div>
          </div>

          <!-- Booths Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${booths.length ? booths.map(b => {
              const classes = Array.isArray(b.classes) ? b.classes : [];
              return `
                <div class="glass p-5 rounded-2xl border border-white/10 hover:border-indigo-500/40 transition flex flex-col justify-between space-y-4">
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-black text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                        BOOTH NO. ${esc(b.boothNumber)}
                      </span>
                      <span class="text-xs font-mono font-bold text-slate-300">
                        ${b.totalStudents || 0} Voters
                      </span>
                    </div>

                    <div>
                      <div class="text-[11px] text-slate-400 font-semibold uppercase">Room / Venue:</div>
                      <div class="text-base font-bold text-white mt-0.5">📍 ${esc(b.roomName || 'Room Not Specified')}</div>
                    </div>

                    <div>
                      <div class="text-[11px] text-slate-400 font-semibold uppercase mb-1.5">Allotted Classes (${classes.length}):</div>
                      <div class="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                        ${classes.map(c => `
                          <span class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[11px] leading-tight">
                            ${esc(c)}
                          </span>
                        `).join('')}
                      </div>
                    </div>
                  </div>

                  <div class="pt-3 border-t border-white/10 flex items-center justify-between">
                    <span class="text-[11px] text-slate-500">Door Poster Ready</span>
                    <button class="btn btn-secondary btn-sm print-single-booth-btn flex items-center gap-1 text-xs" data-num="${esc(b.boothNumber)}">
                      <span>🖨️</span> Print Door Poster
                    </button>
                  </div>
                </div>
              `;
            }).join('') : `
              <div class="col-span-full text-center py-12 text-slate-500 italic">
                No polling booths found. Please configure booths in <a href="#/admin/booths" class="text-indigo-400 underline">Polling Booths</a> first.
              </div>
            `}
          </div>
        </div>

        <!-- PANEL 2: OFFICIAL NOTIFICATIONS -->
        <div id="adminPanelNotices" class="p-6 space-y-6 hidden">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
            <div>
              <h4 class="font-bold text-white text-base">Formal Election Notifications &amp; Circulars</h4>
              <p class="text-slate-400 text-xs mt-0.5">Publish formal statutory orders, code of conduct, and voter guidelines with official signatures.</p>
            </div>
            <button id="btnCreateNoticeSecondary" class="btn btn-primary btn-sm flex items-center gap-1.5">
              <span>➕</span> Draft New Notice
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-white/10 bg-slate-900/50 text-slate-300 font-semibold uppercase tracking-wider">
                  <th class="p-3 w-12 text-center">Pin</th>
                  <th class="p-3">Title &amp; Reference No.</th>
                  <th class="p-3 w-40">Category</th>
                  <th class="p-3 w-28">Date</th>
                  <th class="p-3 w-28 text-center">Status</th>
                  <th class="p-3 w-48 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                ${notices.length ? notices.map(n => {
                  const isPub = n.isPublished !== false && n.isPublished !== 'false';
                  return `
                    <tr class="hover:bg-white/5 transition">
                      <td class="p-3 text-center">
                        ${n.pinned ? `<span class="text-amber-400 font-bold" title="Pinned to top">📌</span>` : '<span class="text-slate-600">–</span>'}
                      </td>
                      <td class="p-3">
                        <div class="font-bold text-white text-sm leading-snug">${esc(n.title)}</div>
                        <div class="text-[11px] font-mono text-slate-400 mt-0.5">${esc(n.refNo || 'N/A')}</div>
                      </td>
                      <td class="p-3">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          ${esc(n.category || 'General')}
                        </span>
                      </td>
                      <td class="p-3 text-slate-300 font-mono">
                        ${esc(n.date || '')}
                      </td>
                      <td class="p-3 text-center">
                        <span class="badge ${isPub ? 'badge-valid' : 'badge-pending'} text-[10px]">
                          ${isPub ? '🟢 Live' : '📝 Draft'}
                        </span>
                      </td>
                      <td class="p-3 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <button class="btn btn-secondary btn-sm py-1 px-2 print-notice-btn text-xs" data-id="${esc(n.id)}" title="Print Official Letterhead">
                            🖨️
                          </button>
                          <button class="btn btn-secondary btn-sm py-1 px-2 edit-notice-btn text-xs" data-id="${esc(n.id)}" title="Edit Notice">
                            ✏️
                          </button>
                          <button class="btn btn-secondary btn-sm py-1 px-2 toggle-notice-btn text-xs" data-id="${esc(n.id)}" title="${isPub ? 'Unpublish from Public Portal' : 'Publish to Public Portal'}">
                            ${isPub ? '🚫' : '📢'}
                          </button>
                          <button class="btn btn-sm py-1 px-2 delete-notice-btn text-xs bg-rose-500/20 text-rose-300 hover:bg-rose-500/30" data-id="${esc(n.id)}" title="Delete Notice">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="6" class="p-8 text-center text-slate-500 italic">
                      No notices created yet. Click "⚡ Load Statutory Templates" to provision default election circulars.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

        <!-- PANEL 3: CLASS-TO-BOOTH MASTER INDEX -->
        <div id="adminPanelIndex" class="p-6 space-y-4 hidden">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h4 class="font-bold text-white text-base">Class-to-Booth Alphabetical Quick Reference</h4>
              <p class="text-slate-400 text-xs mt-0.5">Alphabetical class lookup for campus help desk, polling officers, and queue control.</p>
            </div>
            <div class="w-full sm:w-72">
              <input type="text" id="classIndexSearch" class="field text-xs w-full py-1.5 px-3" placeholder="🔍 Search class, dept, or booth...">
            </div>
          </div>

          <div id="classIndexGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            ${Object.values(classMap).sort((a, b) => a.name.localeCompare(b.name)).map(cls => {
              const assignedBooth = booths.find(b => {
                const bClasses = Array.isArray(b.classes) ? b.classes : [];
                return bClasses.includes(cls.name);
              });
              const boothNum = assignedBooth ? assignedBooth.boothNumber : '';
              return `
                <div class="glass p-3.5 rounded-xl border border-white/10 flex items-center justify-between class-index-card" 
                     data-name="${esc(cls.name)}" 
                     data-dept="${esc(cls.dept)}"
                     data-booth="${esc(boothNum)}">
                  <div>
                    <div class="font-bold text-white text-xs">${esc(cls.name)}</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">${esc(cls.dept)} • ${cls.count} Voters</div>
                  </div>
                  <div class="text-right">
                    ${assignedBooth ? `
                      <span class="font-black text-indigo-300 text-xs bg-indigo-500/20 px-2 py-1 rounded border border-indigo-500/30">
                        Booth ${esc(assignedBooth.boothNumber)}
                      </span>
                      <div class="text-[10px] text-slate-400 mt-1">📍 ${esc(assignedBooth.roomName || 'Hall')}</div>
                    ` : `
                      <span class="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Unassigned
                      </span>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <div id="classIndexNoResults" class="p-8 text-center text-slate-500 italic hidden">
            No classes matching your search criteria.
          </div>
        </div>

      </div>

      <!-- Draft / Edit Notice Modal -->
      <div id="noticeEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 hidden">
        <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" id="noticeEditOverlay"></div>
        <div class="relative bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden z-10">
          <div class="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
            <h4 id="editModalHeading" class="font-bold text-white text-base">Draft Official Notice</h4>
            <button id="editModalCloseBtn" class="text-slate-400 hover:text-white text-xl p-1">&times;</button>
          </div>

          <form id="formNoticeEdit" class="p-6 overflow-y-auto space-y-4 text-xs">
            <input type="hidden" id="editNoticeId">

            <div class="space-y-1">
              <label class="font-semibold text-slate-300 uppercase tracking-wider">Notice Title *</label>
              <input type="text" id="editNoticeTitle" class="field text-sm w-full py-2" required placeholder="e.g. Polling Booth Allotment Notice">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="font-semibold text-slate-300 uppercase tracking-wider">Reference / Circular No.</label>
                <input type="text" id="editNoticeRef" class="field text-xs w-full py-2" placeholder="e.g. GVC/ELEC/2026/NOTIF-01">
              </div>

              <div class="space-y-1">
                <label class="font-semibold text-slate-300 uppercase tracking-wider">Issue Date</label>
                <input type="date" id="editNoticeDate" class="field text-xs w-full py-2">
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="font-semibold text-slate-300 uppercase tracking-wider">Notice Category</label>
                <select id="editNoticeCategory" class="field text-xs w-full py-2">
                  <option value="Statutory Notification">Statutory Notification</option>
                  <option value="Polling Booth Info">Polling Booth Info</option>
                  <option value="Code of Conduct">Code of Conduct</option>
                  <option value="Voter Instructions">Voter Instructions</option>
                  <option value="Counting & Results">Counting &amp; Results</option>
                  <option value="General Announcement">General Announcement</option>
                </select>
              </div>

              <div class="space-y-1">
                <label class="font-semibold text-slate-300 uppercase tracking-wider">Signatory Designation</label>
                <input type="text" id="editNoticeSignatory" class="field text-xs w-full py-2" placeholder="Returning Officer">
              </div>
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-slate-300 uppercase tracking-wider">Signatory Sub-Title / College</label>
              <input type="text" id="editNoticeSignTitle" class="field text-xs w-full py-2" placeholder="Returning Officer, Government Victoria College Palakkad">
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-slate-300 uppercase tracking-wider">Notice Body (Markdown supported) *</label>
              <textarea id="editNoticeContent" class="field text-xs w-full p-3 h-48 font-mono leading-relaxed" required placeholder="Type notice content here..."></textarea>
              <p class="text-[10px] text-slate-500">Supports headers (###), bold (**text**), lists (- or •), and markdown tables (| Col | Col |).</p>
            </div>

            <div class="flex items-center gap-6 pt-2 border-t border-white/10">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="editNoticePublished" class="w-4 h-4 rounded text-indigo-600">
                <span class="text-slate-300 font-semibold">Mark as Final (Ready for Printing &amp; Public Display)</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="editNoticePinned" class="w-4 h-4 rounded text-amber-500">
                <span class="text-slate-300 font-semibold">Pin to top of list</span>
              </label>
            </div>

            <div class="pt-4 border-t border-white/10 flex justify-end gap-2">
              <button type="button" id="btnCancelNoticeEdit" class="btn btn-secondary btn-sm">Cancel</button>
              <button type="submit" id="btnSaveNoticeSubmit" class="btn btn-primary btn-sm px-6">Save Notice</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `;

  // Attach event handlers
  attachAdminNoticesEvents(main, pwd, settings, schedule, notices, booths, posts, nominalRoll);
}

function attachAdminNoticesEvents(main, pwd, settings, schedule, notices, booths, posts = [], nominalRoll = []) {
  // Navigation Tabs: Master Print vs Posters vs Notices vs Index
  const tabMaster = main.querySelector('#adminTabMasterPrint');
  const tabPosters = main.querySelector('#adminTabPosters');
  const tabNotices = main.querySelector('#adminTabNotices');
  const tabIndex = main.querySelector('#adminTabIndex');
  const panelMaster = main.querySelector('#adminPanelMasterPrint');
  const panelPosters = main.querySelector('#adminPanelPosters');
  const panelNotices = main.querySelector('#adminPanelNotices');
  const panelIndex = main.querySelector('#adminPanelIndex');

  const switchTab = (activeTab, activePanel) => {
    [tabMaster, tabPosters, tabNotices, tabIndex].forEach(t => {
      if (!t) return;
      t.classList.remove('bg-indigo-600', 'text-white', 'shadow-lg');
      t.classList.add('text-slate-400');
    });
    [panelMaster, panelPosters, panelNotices, panelIndex].forEach(p => {
      if (!p) return;
      p.classList.add('hidden');
    });

    if (activeTab) {
      activeTab.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
      activeTab.classList.remove('text-slate-400');
    }
    if (activePanel) {
      activePanel.classList.remove('hidden');
    }
  };

  tabMaster?.addEventListener('click', () => switchTab(tabMaster, panelMaster));
  tabPosters?.addEventListener('click', () => switchTab(tabPosters, panelPosters));
  tabNotices?.addEventListener('click', () => switchTab(tabNotices, panelNotices));
  tabIndex?.addEventListener('click', () => switchTab(tabIndex, panelIndex));

  // ── Master Hub 1-Click Print Actions ─────────────────────────────────────
  
  // Press Summary
  const handlePrintPressSummary = () => {
    generateAndPrintBallotPressSummary(pwd);
  };
  main.querySelector('#btnHubPressSummary')?.addEventListener('click', handlePrintPressSummary);
  main.querySelector('#btnHubQuickPressSummary')?.addEventListener('click', handlePrintPressSummary);

  // Ballots
  main.querySelector('#btnHubPrintGeneral')?.addEventListener('click', () => {
    generateAndPrintBallots(pwd, 'general');
  });
  main.querySelector('#btnHubPrintRep')?.addEventListener('click', () => {
    generateAndPrintBallots(pwd, 'rep');
  });
  main.querySelector('#btnHubPrintAssoc')?.addEventListener('click', () => {
    generateAndPrintBallots(pwd, 'assoc');
  });

  // Marked Rolls & Ballot Accounts
  main.querySelector('#btnHubPrintElectoralRolls')?.addEventListener('click', () => {
    generateAndPrintElectoralRolls(pwd);
  });
  main.querySelector('#btnHubPrintBallotAccounts')?.addEventListener('click', () => {
    generateAndPrintBallotAccounts(pwd);
  });

  // Batch Door Posters & Campus Directory
  main.querySelector('#btnHubPrintBatchPosters')?.addEventListener('click', () => {
    if (!booths.length) {
      showToast('No polling booths configured to print.', 'error');
      return;
    }
    printBatchBoothDoorPosters(booths, settings, schedule);
  });
  main.querySelector('#btnHubPrintCampusDirectory')?.addEventListener('click', () => {
    if (!booths.length) {
      showToast('No polling booths configured to print.', 'error');
      return;
    }
    printCampusMasterDirectory(booths, settings, schedule);
  });

  // Nominal Roll Studio
  const handleOpenRollModal = () => {
    const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME || 'COLLEGE UNION ELECTION';
    const year = settings.electionYear || new Date().getFullYear();
    openPrintRollModal({
      students: nominalRoll,
      isFinal: true,
      isDraft: false,
      collegeName,
      collegeLogo: settings.collegeLogo || '',
      electionYear: year,
      draftRollEnd: schedule.draftRollEnd || ''
    });
  };
  main.querySelector('#btnHubOpenRollModal')?.addEventListener('click', handleOpenRollModal);
  main.querySelector('#btnHubQuickNominalRoll')?.addEventListener('click', handleOpenRollModal);

  // Statutory Notices #1, #2, #3
  main.querySelector('#btnHubPrintNotice1')?.addEventListener('click', () => {
    const n = notices.find(item => item.id === 'statutory_notice_election_notification') || notices[0];
    if (n) {
      printOfficialNotice(n, settings, schedule, booths, posts);
    } else {
      showToast('Notice #1 not found. Click "Load Statutory Templates" first.', 'error');
    }
  });

  main.querySelector('#btnHubPrintNotice2')?.addEventListener('click', () => {
    const n = notices.find(item => item.id === 'statutory_notice_code_of_conduct') || notices[1];
    if (n) {
      printOfficialNotice(n, settings, schedule, booths, posts);
    } else {
      showToast('Code of Conduct Notice not found. Click "Load Statutory Templates" first.', 'error');
    }
  });

  main.querySelector('#btnHubPrintNotice3')?.addEventListener('click', () => {
    const n = notices.find(item => item.id === 'statutory_notice_voter_guidelines') || notices[2];
    if (n) {
      printOfficialNotice(n, settings, schedule, booths, posts);
    } else {
      showToast('Voter Guidelines Notice not found. Click "Load Statutory Templates" first.', 'error');
    }
  });


  // Print ALL Door Posters
  main.querySelector('#btnPrintAllDoorPosters')?.addEventListener('click', () => {
    if (!booths.length) {
      alert('No polling booths configured to print.');
      return;
    }
    printBatchBoothDoorPosters(booths, settings, schedule);
  });

  // Print Master Campus Directory
  main.querySelector('#btnPrintMasterDirectory')?.addEventListener('click', () => {
    if (!booths.length) {
      alert('No polling booths configured to print.');
      return;
    }
    printCampusMasterDirectory(booths, settings, schedule);
  });

  // Print Single Booth Door Poster
  main.querySelectorAll('.print-single-booth-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const num = Number(btn.dataset.num);
      const b = booths.find(item => Number(item.boothNumber) === num);
      if (b) {
        printBoothDoorPoster(b, settings, schedule);
      }
    });
  });

  // Print Single Official Notice
  main.querySelectorAll('.print-notice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const n = notices.find(item => String(item.id) === String(id));
      if (n) printOfficialNotice(n, settings);
    });
  });

  // Search filter in Tab 3 (Class-to-Booth index)
  main.querySelector('#classIndexSearch')?.addEventListener('input', (e) => {
    const q = (e.target.value || '').toLowerCase().trim();
    let visibleCount = 0;
    main.querySelectorAll('.class-index-card').forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const dept = (card.dataset.dept || '').toLowerCase();
      const booth = (card.dataset.booth || '').toLowerCase();
      const match = !q || name.includes(q) || dept.includes(q) || booth.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    const emptyState = main.querySelector('#classIndexNoResults');
    if (emptyState) emptyState.classList.toggle('hidden', visibleCount > 0);
  });

  // Load Statutory Templates Button
  main.querySelector('#btnLoadTemplates')?.addEventListener('click', async () => {
    const defaultTemplates = getDefaultStatutoryNotices(settings, schedule, booths, posts);
    if (confirm(`Load ${defaultTemplates.length} standard statutory notices (Election Notification, Booth Allotments, Code of Conduct, Voter Guidelines, Counting Notice)? Any existing notices with same IDs will be updated.`)) {
      try {
        const btn = main.querySelector('#btnLoadTemplates');
        setLoading(btn, true, 'Loading...');
        
        // Merge with existing notices
        const existingMap = new Map(notices.map(n => [n.id, n]));
        defaultTemplates.forEach(t => {
          existingMap.set(t.id, t);
        });
        const mergedList = Array.from(existingMap.values());

        await api.adminSaveNotices(pwd, mergedList);
        showToast('Statutory templates loaded successfully!', 'success');
        await loadAdminNoticesData(main, pwd);
      } catch (e) {
        showToast('Error loading templates: ' + e.message, 'error');
        setLoading(main.querySelector('#btnLoadTemplates'), false, '⚡ Load Statutory Templates');
      }
    }
  });

  // Refresh Election Notification #1 with Latest Posts & University Order
  main.querySelector('#btnRefreshNoticeOne')?.addEventListener('click', async () => {
    try {
      const btn = main.querySelector('#btnRefreshNoticeOne');
      setLoading(btn, true, 'Refreshing...');
      const freshTemplate = getDefaultStatutoryNotices(settings, schedule, booths, posts).find(t => t.id === 'statutory_notice_election_notification');
      if (freshTemplate) {
        await api.adminSaveNotice(pwd, freshTemplate);
        showToast('Election Notification #1 refreshed with latest posts and University Regulation!', 'success');
        await loadAdminNoticesData(main, pwd);
      }
    } catch (e) {
      showToast('Error refreshing notice: ' + e.message, 'error');
      setLoading(main.querySelector('#btnRefreshNoticeOne'), false, '🔄 Refresh Notification Posts');
    }
  });

  // Toggle Notice Publish Status
  main.querySelectorAll('.toggle-notice-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const n = notices.find(item => String(item.id) === String(id));
      if (!n) return;
      const nextStatus = !(n.isPublished !== false && n.isPublished !== 'false');
      n.isPublished = nextStatus;

      try {
        await api.adminSaveNotice(pwd, n);
        showToast(`Notice ${nextStatus ? 'published' : 'unpublished'}.`, 'info');
        await loadAdminNoticesData(main, pwd);
      } catch (e) {
        showToast('Error updating status: ' + e.message, 'error');
      }
    });
  });

  // Delete Notice
  main.querySelectorAll('.delete-notice-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const n = notices.find(item => String(item.id) === String(id));
      if (!n) return;
      if (confirm(`Delete notice "${n.title}"? This cannot be undone.`)) {
        try {
          await api.adminDeleteNotice(pwd, id);
          showToast('Notice deleted.', 'info');
          await loadAdminNoticesData(main, pwd);
        } catch (e) {
          showToast('Error deleting notice: ' + e.message, 'error');
        }
      }
    });
  });

  // Modal Editing & Drafting
  const modal = main.querySelector('#noticeEditModal');
  const overlay = main.querySelector('#noticeEditOverlay');
  const closeBtn = main.querySelector('#editModalCloseBtn');
  const cancelBtn = main.querySelector('#btnCancelNoticeEdit');
  const form = main.querySelector('#formNoticeEdit');

  const openNoticeEditor = (notice = null) => {
    main.querySelector('#editModalHeading').textContent = notice ? 'Edit Official Notice' : 'Draft New Official Notice';
    main.querySelector('#editNoticeId').value = notice ? notice.id : '';
    main.querySelector('#editNoticeTitle').value = notice ? notice.title : '';
    main.querySelector('#editNoticeRef').value = notice ? (notice.refNo || '') : `${settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME || 'CUE'}/ELEC/${settings.electionYear || new Date().getFullYear()}/NOTIF-${String(notices.length + 1).padStart(2, '0')}`;
    main.querySelector('#editNoticeDate').value = notice ? (notice.date || '') : new Date().toISOString().split('T')[0];
    main.querySelector('#editNoticeCategory').value = notice ? (notice.category || 'Statutory Notification') : 'Statutory Notification';
    main.querySelector('#editNoticeSignatory').value = notice ? (notice.signatoryName || '') : (settings.returningOfficerName || 'Returning Officer');
    main.querySelector('#editNoticeSignTitle').value = notice ? (notice.signatoryTitle || '') : (settings.returningOfficerDesignation || `Returning Officer, ${settings.collegeName || CONFIG.COLLEGE_NAME || 'College Union'}`);
    main.querySelector('#editNoticeContent').value = notice ? (notice.content || '') : '';
    main.querySelector('#editNoticePublished').checked = notice ? (notice.isPublished !== false && notice.isPublished !== 'false') : true;
    main.querySelector('#editNoticePinned').checked = notice ? !!notice.pinned : false;

    modal.classList.remove('hidden');
    main.querySelector('#editNoticeTitle').focus();
  };

  const closeNoticeEditor = () => {
    modal.classList.add('hidden');
    form.reset();
  };

  main.querySelector('#btnDraftNewNotice')?.addEventListener('click', () => openNoticeEditor(null));
  main.querySelector('#btnCreateNoticeSecondary')?.addEventListener('click', () => openNoticeEditor(null));

  main.querySelectorAll('.edit-notice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const n = notices.find(item => String(item.id) === String(id));
      if (n) openNoticeEditor(n);
    });
  });

  overlay?.addEventListener('click', closeNoticeEditor);
  closeBtn?.addEventListener('click', closeNoticeEditor);
  cancelBtn?.addEventListener('click', closeNoticeEditor);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = main.querySelector('#editNoticeId').value.trim();
    const title = main.querySelector('#editNoticeTitle').value.trim();
    const refNo = main.querySelector('#editNoticeRef').value.trim();
    const date = main.querySelector('#editNoticeDate').value.trim();
    const category = main.querySelector('#editNoticeCategory').value.trim();
    const signatoryName = main.querySelector('#editNoticeSignatory').value.trim();
    const signatoryTitle = main.querySelector('#editNoticeSignTitle').value.trim();
    const content = main.querySelector('#editNoticeContent').value.trim();
    const isPublished = main.querySelector('#editNoticePublished').checked;
    const pinned = main.querySelector('#editNoticePinned').checked;

    if (!title || !content) {
      alert('Title and notice content are required.');
      return;
    }

    const payload = {
      id: id || ('notice_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)),
      title,
      refNo,
      date,
      category,
      signatoryName,
      signatoryTitle,
      content,
      isPublished,
      pinned
    };

    try {
      const saveBtn = main.querySelector('#btnSaveNoticeSubmit');
      setLoading(saveBtn, true, 'Saving...');
      await api.adminSaveNotice(pwd, payload);
      showToast('Notice saved successfully!', 'success');
      closeNoticeEditor();
      await loadAdminNoticesData(main, pwd);
    } catch (err) {
      showToast('Error saving notice: ' + err.message, 'error');
      setLoading(main.querySelector('#btnSaveNoticeSubmit'), false, 'Save Notice');
    }
  });
}
