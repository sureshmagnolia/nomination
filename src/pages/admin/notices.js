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

    renderAdminNoticesHub(main, pwd, settings, schedule, notices, booths, classMap, posts);
  } catch (err) {
    console.error('Error loading admin notices:', err);
    main.innerHTML = `<div class="alert alert-error">❌ ${esc(err.message || 'Failed to load notices')}</div>`;
  }
}

function renderAdminNoticesHub(main, pwd, settings, schedule, notices, booths, classMap, posts = []) {
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
          <h3 class="text-xl font-bold text-white">Official Notices &amp; Polling Posters Center</h3>
          <p class="text-slate-400 text-sm">Generate high-contrast door posters, print campus directory banners, and publish formal election circulars.</p>
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
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Public Lookup</div>
          <div class="text-2xl font-bold text-white mt-1">Active</div>
          <div class="text-xs text-slate-400 mt-0.5">Find My Booth Widget Live</div>
        </div>
      </div>

      <!-- Primary Tabs -->
      <div class="glass rounded-2xl overflow-hidden border border-white/10">
        <div class="flex border-b border-white/10 bg-slate-900/60 p-2 gap-2">
          <button id="adminTabPosters" class="px-5 py-2.5 text-xs font-bold rounded-xl transition bg-indigo-600 text-white shadow-lg">
            🚪 Polling Booth Posters (${booths.length})
          </button>
          <button id="adminTabNotices" class="px-5 py-2.5 text-xs font-bold rounded-xl transition text-slate-400 hover:text-white">
            📢 Official Notifications (${notices.length})
          </button>
          <button id="adminTabIndex" class="px-5 py-2.5 text-xs font-bold rounded-xl transition text-slate-400 hover:text-white">
            📋 Class-to-Booth Master Index
          </button>
        </div>

        <!-- PANEL 1: POLLING BOOTH POSTERS -->
        <div id="adminPanelPosters" class="p-6 space-y-6">
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
  attachAdminNoticesEvents(main, pwd, settings, schedule, notices, booths, posts);
}

function attachAdminNoticesEvents(main, pwd, settings, schedule, notices, booths, posts = []) {
  // Navigation Tabs: Posters vs Notices vs Index
  const tabPosters = main.querySelector('#adminTabPosters');
  const tabNotices = main.querySelector('#adminTabNotices');
  const tabIndex = main.querySelector('#adminTabIndex');
  const panelPosters = main.querySelector('#adminPanelPosters');
  const panelNotices = main.querySelector('#adminPanelNotices');
  const panelIndex = main.querySelector('#adminPanelIndex');

  const switchTab = (activeTab, activePanel) => {
    [tabPosters, tabNotices, tabIndex].forEach(t => {
      t.classList.remove('bg-indigo-600', 'text-white', 'shadow-lg');
      t.classList.add('text-slate-400');
    });
    [panelPosters, panelNotices, panelIndex].forEach(p => p.classList.add('hidden'));

    activeTab.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
    activeTab.classList.remove('text-slate-400');
    activePanel.classList.remove('hidden');
  };

  tabPosters?.addEventListener('click', () => switchTab(tabPosters, panelPosters));
  tabNotices?.addEventListener('click', () => switchTab(tabNotices, panelNotices));
  tabIndex?.addEventListener('click', () => switchTab(tabIndex, panelIndex));

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
