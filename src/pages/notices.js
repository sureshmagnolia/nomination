/**
 * pages/notices.js
 * Public Student Portal for Official Election Notices & "Find My Polling Booth".
 */

import { api } from '../api.js';
import { esc, showToast } from '../utils.js';
import { CONFIG } from '../config.js';
import { printOfficialNotice, printCampusMasterDirectory } from '../noticesPrinter.js';
import { getDefaultStatutoryNotices } from '../noticesTemplates.js';

export async function renderNotices(container) {
  container.innerHTML = `
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
        <p class="text-slate-400 mt-4 text-sm">Loading notices and polling booth allotments...</p>
      </div>
    </div>
  `;

  try {
    const [publicData, nominalRoll] = await Promise.all([
      api.getPublicNotices(true).catch(() => ({})),
      api.getNominalRoll().catch(() => [])
    ]);

    const settings = publicData.settings || {};
    const schedule = publicData.schedule || {};
    let notices = Array.isArray(publicData.notices) ? publicData.notices : [];
    const booths = Array.isArray(publicData.booths) ? publicData.booths : [];
    const locations = Array.isArray(publicData.locations) ? publicData.locations : [];

    // If no notices are saved in database yet, show default statutory ones as fallback
    if (!notices.length) {
      notices = getDefaultStatutoryNotices(settings, schedule, booths);
    }

    // Sort notices: pinned first, then newest date
    notices.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    renderPublicNoticesUI(container, settings, schedule, notices, booths, nominalRoll);
  } catch (err) {
    console.error('Error rendering public notices:', err);
    container.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div class="glass p-8 rounded-2xl max-w-lg border border-red-500/20">
          <div class="text-4xl mb-3">⚠️</div>
          <h2 class="text-xl font-bold text-white mb-2">Unable to Load Notices</h2>
          <p class="text-slate-400 text-sm mb-6">${esc(err.message || 'Please check your connection.')}</p>
          <button data-nav="/" class="btn btn-primary">Return to Home</button>
        </div>
      </div>
    `;
  }
}

function renderPublicNoticesUI(container, settings, schedule, notices, booths, nominalRoll) {
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;
  const year = settings.electionYear || new Date().getFullYear();
  const collegeLogo = settings.collegeLogo || '';

  // Extract unique classes from nominal roll
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
  const classList = Object.values(classMap).sort((a, b) => a.dept.localeCompare(b.dept) || a.name.localeCompare(b.name));

  // Compute booth total voters
  booths.forEach(b => {
    const bClasses = Array.isArray(b.classes) ? b.classes : [];
    b.totalStudents = 0;
    bClasses.forEach(cName => {
      if (classMap[cName]) b.totalStudents += classMap[cName].count;
    });
  });

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };
  const pollStart = formatTime(schedule.pollingStart) || '9:30 AM';
  const pollEnd = formatTime(schedule.pollingEnd) || '1:30 PM';

  container.innerHTML = `
    <div class="page-enter min-h-screen flex flex-col">
      
      <!-- Top Navigation Bar -->
      <header class="glass sticky top-0 z-40 border-b border-white/10">
        <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            ${collegeLogo ? `
              <img src="${collegeLogo}" class="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5" alt="Logo">
            ` : `
              <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">${shortName.charAt(0)}</div>
            `}
            <div>
              <h1 class="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">${esc(shortName)} Election Notices</h1>
              <p class="text-[11px] text-slate-400">Official Notifications &amp; Polling Booth Allotments ${year}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button data-nav="/" class="btn btn-secondary btn-sm flex items-center gap-1.5">
              <span>🏠</span> <span class="hidden sm:inline">Home</span>
            </button>
            <button data-nav="/admin" class="btn btn-secondary btn-sm flex items-center gap-1.5">
              <span>🔒</span> <span class="hidden sm:inline">Admin</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Container -->
      <main class="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
        
        <!-- Hero Banner -->
        <div class="text-center max-w-3xl mx-auto space-y-3">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <span>📢</span> Official Publication Board
          </div>
          <h2 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Notices &amp; Polling Station Directory
          </h2>
          <p class="text-slate-400 text-sm leading-relaxed">
            Find where you need to vote on election day, look up your assigned booth and classroom, and read formal statutory notifications issued by the Returning Officer.
          </p>
        </div>

        <!-- 🔍 FIND MY POLLING BOOTH (Interactive Widget) -->
        <div class="glass rounded-2xl p-6 sm:p-8 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
          <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-2xl">🗳️</span>
                <h3 class="text-xl font-bold text-white">Find My Polling Booth</h3>
              </div>
              <p class="text-slate-400 text-xs mt-1">Instant voter lookup: Enter your Admission Number or select your Class to find your designated voting room.</p>
            </div>
            <div class="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full border border-indigo-500/30 font-semibold flex items-center gap-1.5 shrink-0">
              <span>⏰</span> Polling Hours: ${esc(pollStart)} – ${esc(pollEnd)}
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <!-- Search by Admission / Name -->
            <div class="md:col-span-6 space-y-1.5">
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">Option 1: Search by Admission No. or Name</label>
              <div class="relative">
                <input type="text" id="boothSearchInput" class="field text-sm w-full pl-9 pr-4 py-2.5" placeholder="e.g. 12345 or Priya...">
                <span class="absolute left-3 top-2.5 text-slate-500 text-sm">🔍</span>
              </div>
            </div>

            <!-- Dropdown: Select Class -->
            <div class="md:col-span-4 space-y-1.5">
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">Option 2: Or Select Your Class</label>
              <select id="boothClassSelect" class="field text-sm w-full py-2.5">
                <option value="">-- Choose Class / Department --</option>
                ${classList.map(c => `<option value="${esc(c.name)}">${esc(c.name)} (${c.dept})</option>`).join('')}
              </select>
            </div>

            <!-- Clear button -->
            <div class="md:col-span-2">
              <button id="btnClearLookup" class="btn btn-secondary w-full py-2.5 text-xs">Clear</button>
            </div>
          </div>

          <!-- Booth Result Card Container -->
          <div id="boothLookupResult" class="mt-6"></div>
        </div>

        <!-- Campus Polling Directory & Notice Board Tabs -->
        <div class="space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div class="flex gap-2 bg-slate-900/60 p-1 rounded-xl border border-white/10">
              <button id="tabNotices" class="px-4 py-2 text-xs font-bold rounded-lg transition bg-indigo-600 text-white shadow-lg">
                📢 Official Notifications (${notices.length})
              </button>
              <button id="tabDirectory" class="px-4 py-2 text-xs font-bold rounded-lg transition text-slate-400 hover:text-white">
                🏫 Campus Booths Directory (${booths.length})
              </button>
            </div>

            <div id="noticesActionTools" class="flex items-center gap-2">
              <button id="btnPrintMasterDir" class="btn btn-secondary btn-sm flex items-center gap-1.5">
                <span>🖨️</span> Print Master Directory
              </button>
            </div>
          </div>

          <!-- TAB 1: NOTICES BOARD -->
          <div id="panelNotices" class="space-y-4">
            <!-- Category Filter Pills -->
            <div class="flex flex-wrap gap-2 pt-1 pb-2">
              <button class="notice-filter-btn active-pill text-xs px-3 py-1.5 rounded-full font-semibold transition" data-cat="ALL">All Notices</button>
              <button class="notice-filter-btn text-xs px-3 py-1.5 rounded-full font-semibold transition bg-white/5 text-slate-400 hover:text-white hover:bg-white/10" data-cat="Statutory Notification">Statutory Notifications</button>
              <button class="notice-filter-btn text-xs px-3 py-1.5 rounded-full font-semibold transition bg-white/5 text-slate-400 hover:text-white hover:bg-white/10" data-cat="Polling Booth Info">Polling Booth Info</button>
              <button class="notice-filter-btn text-xs px-3 py-1.5 rounded-full font-semibold transition bg-white/5 text-slate-400 hover:text-white hover:bg-white/10" data-cat="Code of Conduct">Code of Conduct</button>
              <button class="notice-filter-btn text-xs px-3 py-1.5 rounded-full font-semibold transition bg-white/5 text-slate-400 hover:text-white hover:bg-white/10" data-cat="Voter Instructions">Voter Instructions</button>
              <button class="notice-filter-btn text-xs px-3 py-1.5 rounded-full font-semibold transition bg-white/5 text-slate-400 hover:text-white hover:bg-white/10" data-cat="Counting & Results">Counting &amp; Results</button>
            </div>

            <!-- Notices Grid -->
            <div id="noticesGrid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
          </div>

          <!-- TAB 2: MASTER CAMPUS BOOTHS DIRECTORY -->
          <div id="panelDirectory" class="hidden space-y-4">
            <div class="glass rounded-2xl p-6 border border-white/10 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h4 class="font-bold text-white text-base">Campus Polling Stations Master Directory</h4>
                  <p class="text-slate-400 text-xs mt-0.5">Comprehensive list of all active polling booths and their assigned classes.</p>
                </div>
                <div class="text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  Total Campus Booths: <strong class="text-white">${booths.length}</strong>
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-white/10 bg-slate-900/50 text-slate-300 font-semibold uppercase tracking-wider">
                      <th class="p-3 w-16 text-center">Booth</th>
                      <th class="p-3 w-48">Station / Room</th>
                      <th class="p-3">Allotted Classes &amp; Departments</th>
                      <th class="p-3 w-28 text-center">Voters</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/5">
                    ${booths.length ? booths.map(b => {
                      const classes = Array.isArray(b.classes) ? b.classes : [];
                      return `
                        <tr class="hover:bg-white/5 transition">
                          <td class="p-3 text-center font-bold text-indigo-300 text-sm">
                            #${esc(b.boothNumber)}
                          </td>
                          <td class="p-3 font-semibold text-white">
                            <div class="flex items-center gap-1.5">
                              <span>📍</span>
                              <span>${esc(b.roomName || 'Designated Hall')}</span>
                            </div>
                          </td>
                          <td class="p-3">
                            <div class="flex flex-wrap gap-1.5">
                              ${classes.map(c => `
                                <span class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[11px]">
                                  ${esc(c)}
                                </span>
                              `).join('')}
                            </div>
                          </td>
                          <td class="p-3 text-center font-mono font-bold text-slate-300">
                            ${b.totalStudents || '–'}
                          </td>
                        </tr>
                      `;
                    }).join('') : `
                      <tr>
                        <td colspan="4" class="p-8 text-center text-slate-500 italic">No polling booths configured yet.</td>
                      </tr>
                    `}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </main>

      <!-- Full Notice Reader Modal -->
      <div id="noticeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 hidden">
        <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" id="noticeModalOverlay"></div>
        <div class="relative bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden z-10">
          <div class="p-5 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
            <div>
              <span id="modalCategory" class="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"></span>
              <h3 id="modalTitle" class="text-lg font-bold text-white mt-1 leading-snug"></h3>
              <p id="modalRefDate" class="text-xs text-slate-400 mt-0.5"></p>
            </div>
            <button id="modalCloseBtn" class="text-slate-400 hover:text-white text-xl p-1">&times;</button>
          </div>
          <div id="modalBody" class="p-6 overflow-y-auto text-sm text-slate-300 space-y-3 leading-relaxed"></div>
          <div class="p-4 border-t border-white/10 bg-slate-800/50 flex justify-between items-center">
            <button id="modalPrintBtn" class="btn btn-primary btn-sm flex items-center gap-1.5">
              <span>🖨️</span> Print Official Document
            </button>
            <button id="modalDismissBtn" class="btn btn-secondary btn-sm">Close</button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="py-8 border-t border-white/5 text-center text-slate-500 text-xs mt-12">
        <p>&copy; ${esc(collegeName)} — College Union Election Portal ${esc(year)}</p>
      </footer>
    </div>
  `;

  // Attach interactive behaviors
  attachPublicNoticesEvents(container, settings, schedule, notices, booths, nominalRoll, classMap);
}

function attachPublicNoticesEvents(container, settings, schedule, notices, booths, nominalRoll, classMap) {
  const searchInput = container.querySelector('#boothSearchInput');
  const classSelect = container.querySelector('#boothClassSelect');
  const clearBtn = container.querySelector('#btnClearLookup');
  const resultDiv = container.querySelector('#boothLookupResult');

  // Interactive Find My Booth Engine
  const performLookup = () => {
    const query = String(searchInput.value || '').trim().toLowerCase();
    const selClass = String(classSelect.value || '').trim();

    if (!query && !selClass) {
      resultDiv.innerHTML = '';
      return;
    }

    let matchedStudent = null;
    let matchedClassName = '';

    if (query) {
      matchedStudent = nominalRoll.find(s => {
        const adm = String(s['ADMISION NO'] || s['admission_no'] || '').toLowerCase().trim();
        const name = String(s['NAME'] || s['name'] || '').toLowerCase().trim();
        const sl = String(s['Nominal Roll Serial Number'] || s['serial_number'] || '').toLowerCase().trim();
        return adm === query || name === query || sl === query || (query.length >= 3 && name.includes(query));
      });

      if (matchedStudent) {
        const rawCls = String(matchedStudent['CLASS'] || matchedStudent['class'] || '').trim();
        const dept = String(matchedStudent['Dept'] || matchedStudent['dept'] || '').trim();
        const isRS = rawCls.toUpperCase().includes('RESEARCH') || rawCls.toUpperCase().includes('SCHOLAR') || rawCls.toUpperCase().includes('PHD');
        matchedClassName = isRS ? `RESEARCH SCHOLAR - ${dept}` : rawCls;
      }
    } else if (selClass) {
      matchedClassName = selClass;
    }

    if (!matchedClassName && query) {
      resultDiv.innerHTML = `
        <div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <span class="text-xl">⚠️</span>
          <div>
            <strong>No matching student found for "${esc(query)}"</strong>
            <p class="text-xs text-rose-200/70 mt-0.5">Please check your admission number or select your department/class from the dropdown.</p>
          </div>
        </div>
      `;
      return;
    }

    // Find assigned booth
    const assignedBooth = booths.find(b => {
      const bClasses = Array.isArray(b.classes) ? b.classes : [];
      return bClasses.includes(matchedClassName);
    });

    if (assignedBooth) {
      resultDiv.innerHTML = `
        <div class="p-5 rounded-xl bg-gradient-to-br from-emerald-950/40 to-indigo-950/40 border border-emerald-500/40 shadow-xl space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🎉</span>
              <div>
                <h4 class="text-base font-bold text-white">
                  ${matchedStudent ? `Voter Found: ${esc(matchedStudent['NAME'] || matchedStudent['name'])}` : 'Class Allotment Confirmed'}
                </h4>
                <p class="text-xs text-emerald-300 font-medium">
                  Class: <strong>${esc(matchedClassName)}</strong>
                  ${matchedStudent ? ` • Adm No: <strong>${esc(matchedStudent['ADMISION NO'] || matchedStudent['admission_no'])}</strong> • Sl. No: <strong>#${esc(matchedStudent['Nominal Roll Serial Number'] || matchedStudent['serial_number'])}</strong>` : ''}
                </p>
              </div>
            </div>
            <span class="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 font-bold self-start sm:self-auto">
              Ready to Vote
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
              <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Your Polling Booth</div>
              <div class="text-2xl font-extrabold text-indigo-300 mt-1">BOOTH NO. ${esc(assignedBooth.boothNumber)}</div>
            </div>

            <div class="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
              <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Station / Room Venue</div>
              <div class="text-base font-bold text-white mt-1">📍 ${esc(assignedBooth.roomName || 'Designated Hall')}</div>
            </div>

            <div class="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
              <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Electors at Booth</div>
              <div class="text-base font-bold text-slate-300 mt-1">${assignedBooth.totalStudents || '–'} Voters</div>
            </div>
          </div>

          <div class="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span>🗳️ <strong>Ballots to receive:</strong> 1. General Union Ballot &bull; 2. Dept Association Ballot &bull; 3. Year Rep Ballot</span>
            <span class="text-emerald-400 font-semibold shrink-0">✔ Bring your College ID Card</span>
          </div>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-center gap-3">
          <span class="text-xl">⏳</span>
          <div>
            <strong>Class "${esc(matchedClassName)}" is currently unassigned to any booth.</strong>
            <p class="text-xs text-amber-200/70 mt-0.5">The Returning Officer will finalize the booth allocation shortly. Please check back soon.</p>
          </div>
        </div>
      `;
    }
  };

  searchInput?.addEventListener('input', () => {
    if (searchInput.value.trim()) classSelect.value = '';
    performLookup();
  });

  classSelect?.addEventListener('change', () => {
    if (classSelect.value) searchInput.value = '';
    performLookup();
  });

  clearBtn?.addEventListener('click', () => {
    searchInput.value = '';
    classSelect.value = '';
    resultDiv.innerHTML = '';
  });

  // Render Notices Grid with Category Filtering
  const noticesGrid = container.querySelector('#noticesGrid');
  let activeCategory = 'ALL';

  const renderNoticesCards = () => {
    const filtered = activeCategory === 'ALL'
      ? notices
      : notices.filter(n => (n.category || '').toLowerCase() === activeCategory.toLowerCase());

    if (!filtered.length) {
      noticesGrid.innerHTML = `
        <div class="col-span-full text-center py-12 text-slate-500 italic bg-white/5 rounded-2xl border border-white/5">
          No notices found under this category.
        </div>
      `;
      return;
    }

    noticesGrid.innerHTML = filtered.map(n => {
      const preview = (n.content || '').replace(/[#*`_>\[\]]/g, '').slice(0, 160) + '...';
      return `
        <div class="glass p-5 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition flex flex-col justify-between space-y-4 group">
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                ${esc(n.category || 'Official Notice')}
              </span>
              ${n.pinned ? `<span class="text-xs text-amber-400 font-bold flex items-center gap-1">📌 Pinned</span>` : ''}
              <span class="text-[11px] text-slate-400">${esc(n.date || '')}</span>
            </div>

            <h4 class="font-bold text-white text-base leading-snug group-hover:text-indigo-300 transition cursor-pointer read-notice-trigger" data-id="${esc(n.id)}">
              ${esc(n.title)}
            </h4>

            <p class="text-xs text-slate-400 line-clamp-3 leading-relaxed">
              ${esc(preview)}
            </p>
          </div>

          <div class="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span class="text-[11px] text-slate-500 font-mono">${esc(n.refNo || '')}</span>
            <div class="flex items-center gap-2">
              <button class="btn btn-secondary btn-sm py-1 px-2.5 read-notice-trigger" data-id="${esc(n.id)}">
                <span>📄 Read Full</span>
              </button>
              <button class="btn btn-primary btn-sm py-1 px-2.5 print-notice-trigger" data-id="${esc(n.id)}" title="Print Official Letterhead Document">
                <span>🖨️ Print</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach read triggers
    container.querySelectorAll('.read-notice-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const n = notices.find(item => String(item.id) === String(id));
        if (n) openNoticeModal(n);
      });
    });

    // Attach print triggers
    container.querySelectorAll('.print-notice-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const n = notices.find(item => String(item.id) === String(id));
        if (n) printOfficialNotice(n, settings);
      });
    });
  };

  renderNoticesCards();

  // Category filter button handling
  container.querySelectorAll('.notice-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.notice-filter-btn').forEach(b => {
        b.classList.remove('bg-indigo-600', 'text-white', 'shadow-lg');
        b.classList.add('bg-white/5', 'text-slate-400');
      });
      btn.classList.remove('bg-white/5', 'text-slate-400');
      btn.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
      activeCategory = btn.dataset.cat;
      renderNoticesCards();
    });
  });

  // Tab switching: Notices vs Directory
  const tabNotices = container.querySelector('#tabNotices');
  const tabDirectory = container.querySelector('#tabDirectory');
  const panelNotices = container.querySelector('#panelNotices');
  const panelDirectory = container.querySelector('#panelDirectory');

  tabNotices?.addEventListener('click', () => {
    tabNotices.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
    tabNotices.classList.remove('text-slate-400');
    tabDirectory.classList.remove('bg-indigo-600', 'text-white', 'shadow-lg');
    tabDirectory.classList.add('text-slate-400');
    panelNotices.classList.remove('hidden');
    panelDirectory.classList.add('hidden');
  });

  tabDirectory?.addEventListener('click', () => {
    tabDirectory.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
    tabDirectory.classList.remove('text-slate-400');
    tabNotices.classList.remove('bg-indigo-600', 'text-white', 'shadow-lg');
    tabNotices.classList.add('text-slate-400');
    panelDirectory.classList.remove('hidden');
    panelNotices.classList.add('hidden');
  });

  // Print Master Directory button
  container.querySelector('#btnPrintMasterDir')?.addEventListener('click', () => {
    printCampusMasterDirectory(booths, settings, schedule);
  });

  // Full Notice Modal Handler
  const modal = container.querySelector('#noticeModal');
  const overlay = container.querySelector('#noticeModalOverlay');
  const closeBtn = container.querySelector('#modalCloseBtn');
  const dismissBtn = container.querySelector('#modalDismissBtn');
  const printBtn = container.querySelector('#modalPrintBtn');
  let currentModalNotice = null;

  const openNoticeModal = (n) => {
    currentModalNotice = n;
    container.querySelector('#modalCategory').textContent = n.category || 'Official Publication';
    container.querySelector('#modalTitle').textContent = n.title;
    container.querySelector('#modalRefDate').textContent = `${n.refNo ? `Ref: ${n.refNo} • ` : ''}Date: ${n.date || 'Today'}`;
    
    // Format text with basic markdown/paragraphing
    const formatted = (n.content || '')
      .split('\n\n')
      .map(p => `<p class="mb-3 leading-relaxed">${esc(p).replace(/\n/g, '<br/>')}</p>`)
      .join('');
    container.querySelector('#modalBody').innerHTML = formatted;

    modal.classList.remove('hidden');
  };

  const closeNoticeModal = () => {
    modal.classList.add('hidden');
    currentModalNotice = null;
  };

  overlay?.addEventListener('click', closeNoticeModal);
  closeBtn?.addEventListener('click', closeNoticeModal);
  dismissBtn?.addEventListener('click', closeNoticeModal);

  printBtn?.addEventListener('click', () => {
    if (currentModalNotice) printOfficialNotice(currentModalNotice, settings);
  });
}
