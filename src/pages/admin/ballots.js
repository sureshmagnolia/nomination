/**
 * ballots.js
 * Professional ballot printing for General (Single A3 or Split Parts), Year Rep (A5), and Association (A5) posts.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading, comparePosts, sortPosts } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { exportBallotsToExcel } from '../../excelExporter.js';

export const isAssocPostCheck = (p) => {
  const name = String(p?.post || p?.name || '').toUpperCase();
  return name.includes('ASSOCIATION') || name.includes('ASSOC') || !!p?.deptRestriction;
};
export const isUUCPostCheck = (p) => {
  const name = String(p?.post || p?.name || '').toUpperCase();
  return name.includes('UUC') || name.includes('UNIVERSITY UNION COUNCILLOR');
};
export const isYearPostCheck = (p) => {
  if (isAssocPostCheck(p) || isUUCPostCheck(p)) return false;
  const name = String(p?.post || p?.name || '').toUpperCase();
  return name.includes('REPRESENTATIVE') || name.includes('REP');
};
export const isGeneralPostCheck = (p) => !isAssocPostCheck(p) && !isYearPostCheck(p);

export async function renderAdminBallots(container) {
  const pwd = getAdminPassword(); if (!pwd) return;

  renderAdminLayout(container, 'Ballot Printing', `
    <div class="text-center py-16">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 mt-4 text-sm">Preparing ballot generator...</p>
    </div>
  `);

  const main = container.querySelector('#adminMain');

  let posts = [];
  let ballotConfig = null;
  let plan = null;

  try {
    const [fetchedPosts, fetchedConfig, fetchedPlan] = await Promise.all([
      api.adminGetPosts(pwd).catch(() => []),
      api.adminGetBallotConfig(pwd).catch(() => null),
      api.adminGetBallotPlan(pwd).catch(() => null)
    ]);
    posts = sortPosts(fetchedPosts);
    ballotConfig = fetchedConfig;
    plan = fetchedPlan;
  } catch (err) {
    console.warn('Error fetching initial ballot data:', err);
  }

  const isAssoc = isAssocPostCheck;
  const isUUC = isUUCPostCheck;
  const isYear = isYearPostCheck;
  const isGeneral = isGeneralPostCheck;

  const generalPosts = posts.filter(isGeneral);

  const getPostIcon = (name) => {
    const n = String(name || '').toLowerCase();
    if (n.includes('chair') && !n.includes('vice')) return '🏆';
    if (n.includes('vice') && n.includes('chair')) return '🥈';
    if (n.includes('joint secretary')) return '🤝';
    if (n.includes('secretary') && !n.includes('fine arts')) return '📝';
    if (n.includes('councillor') || n.includes('uuc')) return '🏛️';
    if (n.includes('editor')) return '📰';
    if (n.includes('fine arts') || n.includes('arts')) return '🎨';
    if (n.includes('captain') || n.includes('sports')) return '⚽';
    return '🎖️';
  };

  const defaultBallots = [
    {
      id: 'gen_1',
      partNumber: 1,
      title: 'General Union Posts - Main',
      shortCode: 'G1',
      bookPrefix: 'GB1-',
      paperSize: 'A3',
      posts: []
    },
    {
      id: 'gen_2',
      partNumber: 2,
      title: 'Additional General Ballot (Arts, Sports & Editorial)',
      shortCode: 'G2',
      bookPrefix: 'GB2-',
      paperSize: 'A3',
      posts: []
    }
  ];

  let currentConfig = ballotConfig || {
    isSplit: false,
    ballots: defaultBallots
  };

  if (!Array.isArray(currentConfig.ballots) || currentConfig.ballots.length === 0) {
    currentConfig.ballots = defaultBallots;
  }
  if (currentConfig.ballots.length === 1) {
    currentConfig.ballots.push({
      id: 'gen_2',
      partNumber: 2,
      title: 'Additional General Ballot (Arts, Sports & Editorial)',
      shortCode: 'G2',
      bookPrefix: 'GB2-',
      paperSize: 'A3',
      posts: []
    });
  }

  // Set of post names selected by admin to be split into Part 2
  const splitSet = new Set();
  if (currentConfig.isSplit && currentConfig.ballots[1] && Array.isArray(currentConfig.ballots[1].posts)) {
    currentConfig.ballots[1].posts.forEach(p => splitSet.add(p));
  }

  const syncConfig = () => {
    const isSplit = splitSet.size > 0;
    currentConfig.isSplit = isSplit;

    const allGenNames = generalPosts.map(p => p.post);
    const part2Posts = allGenNames.filter(p => splitSet.has(p));
    const part1Posts = allGenNames.filter(p => !splitSet.has(p));

    currentConfig.ballots[0].posts = part1Posts;
    currentConfig.ballots[0].shortCode = isSplit ? 'G1' : 'G';
    currentConfig.ballots[0].bookPrefix = isSplit ? 'GB1-' : 'GB';

    if (!currentConfig.ballots[1]) {
      currentConfig.ballots[1] = {
        id: 'gen_2',
        partNumber: 2,
        title: 'Additional General Ballot (Arts, Sports & Editorial)',
        shortCode: 'G2',
        bookPrefix: 'GB2-',
        paperSize: 'A3',
        posts: []
      };
    }
    currentConfig.ballots[1].posts = part2Posts;
    currentConfig.ballots[1].shortCode = 'G2';
    currentConfig.ballots[1].bookPrefix = 'GB2-';
  };

  syncConfig();

  const renderUI = () => {
    const isSplit = !!currentConfig.isSplit;
    const part1Posts = currentConfig.ballots[0].posts || [];
    const part2Posts = (currentConfig.ballots[1] && currentConfig.ballots[1].posts) || [];

    main.innerHTML = `
      <div class="space-y-6 page-enter">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
          <div>
            <h2 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">🗳️</span>
              Ballot Planning &amp; Printing
            </h2>
            <p class="text-slate-400 mt-1 text-sm">
              Select which posts to split in ballots, configure paper formats, and generate print-ready ballots &amp; PO accounts.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button id="btnDownloadBallotsExcel" class="btn btn-secondary py-2.5 px-4 text-xs font-bold flex items-center gap-2 bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white shadow-lg shadow-emerald-950/20 transition-all" title="Download all ballots, candidate rosters, and serial distributions in Excel (.xlsx) format">
              <span>📊</span> Download Ballots (Excel)
            </button>
            <button id="btnRegenPlanTop" class="btn btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500 hover:text-white">
              🔄 Finalize Master Plan
            </button>
          </div>
        </div>

        <!-- Ballot Planning & Post Split Panel -->
        <div class="glass p-6 rounded-2xl border border-white/10 space-y-6 bg-gradient-to-b from-indigo-950/20 to-transparent">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span>⚙️</span> General Ballot Post Selection &amp; Splitter
              </h3>
              <p class="text-xs text-slate-400 mt-1">
                Select the specific posts you want to detach into an <strong>Additional Ballot (Part 2)</strong>. Unselected posts remain on the <strong>Main Ballot (Part 1)</strong>.
              </p>
            </div>
            
            <div class="flex items-center gap-2">
              <span class="text-xs px-3 py-1.5 rounded-xl border ${isSplit ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-bold' : 'bg-slate-800 text-slate-400 border-white/10'}">
                ${isSplit ? '🔀 Split Ballot Active (' + part1Posts.length + ' Main + ' + part2Posts.length + ' Split)' : '📄 Single Unified Ballot (' + part1Posts.length + ' Posts)'}
              </span>
            </div>
          </div>

          <!-- Quick Selection Helper Actions -->
          <div class="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-slate-400 font-semibold mr-1">Quick Select:</span>
              <button id="btnQuickArtsSports" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-300 transition-all flex items-center gap-1.5">
                <span>🎨</span> Fine Arts, Sports &amp; Editor
              </button>
              <button id="btnQuickCouncil" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-300 transition-all flex items-center gap-1.5">
                <span>🏛️</span> Council &amp; Activities
              </button>
              <button id="btnInvertSelect" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all">
                ☑️ Invert Selection
              </button>
            </div>
            <div>
              <button id="btnClearSplit" class="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 transition-all flex items-center gap-1.5">
                <span>🔄</span> Reset to Single Ballot (Clear Selection)
              </button>
            </div>
          </div>

          <!-- Post Selection Checklist -->
          <div class="space-y-2">
            <div class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>General Union Posts (${generalPosts.length})</span>
              <span class="text-slate-400 font-normal">Click a post or check the box to toggle between Main &amp; Additional ballot</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${generalPosts.map(p => {
                const isChecked = splitSet.has(p.post);
                const icon = getPostIcon(p.post);
                return `
                  <div class="p-3.5 rounded-xl border transition-all cursor-pointer post-select-card flex items-center justify-between select-none ${
                    isChecked 
                      ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-950/20' 
                      : 'bg-slate-900/60 border-white/5 hover:border-white/20 hover:bg-slate-900/90'
                  }" data-post-name="${esc(p.post)}">
                    <div class="flex items-center gap-3 min-w-0">
                      <input type="checkbox" class="w-5 h-5 rounded cursor-pointer accent-emerald-500 post-checkbox pointer-events-none" ${isChecked ? 'checked' : ''} />
                      <div class="min-w-0">
                        <div class="font-bold text-sm text-white flex items-center gap-2 truncate">
                          <span>${icon}</span>
                          <span class="truncate">${esc(p.post)}</span>
                        </div>
                        <div class="text-[11px] text-slate-400 mt-0.5">
                          ${isChecked ? 'Split off to Additional Ballot (Part 2)' : 'Included on Main Ballot (Part 1)'}
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex-shrink-0 ml-3">
                      ${isChecked ? `
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                          📑 Part 2 (G2)
                        </span>
                      ` : `
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                          📄 Main (G1)
                        </span>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            ${generalPosts.length === 0 ? `
              <div class="p-4 rounded-xl bg-slate-800/50 text-center text-xs text-slate-400 italic">
                No general posts found. Ensure posts are created under Post Settings.
              </div>
            ` : ''}
          </div>

          <!-- Live Ballot Partition Preview -->
          <div class="pt-4 border-t border-white/10 space-y-4">
            <div class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Live Ballot Partition Preview</span>
              <span class="text-xs text-slate-400 font-normal">Continuous serial numbers &amp; 50-slip booklets</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Part 1: Main Ballot Card -->
              <div class="bg-slate-900/70 p-4 rounded-xl border border-indigo-500/30 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 uppercase tracking-wider">
                      ${isSplit ? 'Ballot Part 1 (G1)' : 'Single Unified Ballot (G)'}
                    </span>
                    <span class="text-xs text-slate-400">(${part1Posts.length} posts)</span>
                  </div>
                  <div class="text-[11px] text-slate-400 font-mono">
                    ${isSplit ? 'Serial: G1-1... | Books: GB1-...' : 'Serial: G1... | Books: GB1...'}
                  </div>
                </div>

                <div>
                  <label class="text-[11px] font-semibold text-slate-400 block mb-1">Printed Title on Ballot:</label>
                  <input type="text" id="inputPart1Title" class="input input-sm w-full bg-slate-800 border-white/10 text-xs text-white" value="${esc(currentConfig.ballots[0].title)}" placeholder="e.g. General Union Posts - Main" />
                </div>

                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="text-slate-400 text-[11px]">Paper:</span>
                    <select id="selectPart1Size" class="input input-sm bg-slate-800 border-white/10 text-xs text-white py-0 px-2 h-7">
                      <option value="A3" ${currentConfig.ballots[0].paperSize === 'A3' ? 'selected' : ''}>A3 (2-Column Standard)</option>
                      <option value="A4" ${currentConfig.ballots[0].paperSize === 'A4' ? 'selected' : ''}>A4 Sheet</option>
                    </select>
                  </div>
                  <div class="text-[11px] text-indigo-300 font-medium">
                    All voters receive this ballot
                  </div>
                </div>

                <div class="pt-2 border-t border-white/5">
                  <div class="text-[11px] font-semibold text-slate-400 mb-1.5">Included Posts:</div>
                  <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    ${part1Posts.map(name => `
                      <span class="px-2 py-0.5 rounded bg-slate-800 border border-white/10 text-[11px] text-slate-200 flex items-center gap-1">
                        <span>${getPostIcon(name)}</span> ${esc(name)}
                      </span>
                    `).join('')}
                    ${part1Posts.length === 0 ? '<span class="text-xs text-amber-400 italic">No posts assigned to Part 1.</span>' : ''}
                  </div>
                </div>
              </div>

              <!-- Part 2: Additional Ballot Card -->
              <div class="bg-slate-900/70 p-4 rounded-xl border ${isSplit ? 'border-emerald-500/30' : 'border-white/10 opacity-70'} space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded text-xs font-bold ${isSplit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'} uppercase tracking-wider">
                      Ballot Part 2 (G2)
                    </span>
                    <span class="text-xs ${isSplit ? 'text-slate-300 font-semibold' : 'text-slate-500'}">
                      (${part2Posts.length} posts)
                    </span>
                  </div>
                  <div class="text-[11px] font-mono ${isSplit ? 'text-emerald-400' : 'text-slate-500'}">
                    ${isSplit ? 'Serial: G2-1... | Books: GB2-...' : 'Inactive'}
                  </div>
                </div>

                ${isSplit ? `
                  <div>
                    <label class="text-[11px] font-semibold text-slate-400 block mb-1">Printed Title on Ballot:</label>
                    <input type="text" id="inputPart2Title" class="input input-sm w-full bg-slate-800 border-white/10 text-xs text-white" value="${esc(currentConfig.ballots[1]?.title || 'Additional General Ballot')}" placeholder="e.g. Additional General Ballot" />
                  </div>

                  <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                      <span class="text-slate-400 text-[11px]">Paper:</span>
                      <select id="selectPart2Size" class="input input-sm bg-slate-800 border-white/10 text-xs text-white py-0 px-2 h-7">
                        <option value="A3" ${(currentConfig.ballots[1]?.paperSize || 'A3') === 'A3' ? 'selected' : ''}>A3 (2-Column Standard)</option>
                        <option value="A4" ${(currentConfig.ballots[1]?.paperSize) === 'A4' ? 'selected' : ''}>A4 Sheet</option>
                        <option value="A5" ${(currentConfig.ballots[1]?.paperSize) === 'A5' ? 'selected' : ''}>A5 Sheet</option>
                      </select>
                    </div>
                    <div class="text-[11px] text-emerald-300 font-medium">
                      All voters receive this ballot
                    </div>
                  </div>

                  <div class="pt-2 border-t border-white/5">
                    <div class="text-[11px] font-semibold text-slate-400 mb-1.5">Split Posts:</div>
                    <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      ${part2Posts.map(name => `
                        <span class="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 flex items-center gap-1">
                          <span>${getPostIcon(name)}</span> ${esc(name)}
                        </span>
                      `).join('')}
                    </div>
                  </div>
                ` : `
                  <div class="py-8 px-4 text-center rounded-lg bg-slate-800/30 border border-dashed border-white/10 text-slate-400 text-xs space-y-1.5">
                    <div class="text-sm font-semibold text-slate-300 flex items-center justify-center gap-1.5">
                      <span>📄</span> All Posts on Single Master Ballot
                    </div>
                    <p class="text-[11px] text-slate-500 max-w-sm mx-auto">
                      No posts selected to split. To detach posts into an Additional Ballot, check any of the posts above.
                    </p>
                  </div>
                `}
              </div>
            </div>

            <!-- Save Action Button -->
            <div class="flex justify-end pt-2">
              <button id="btnSaveConfig" class="btn btn-primary py-2.5 px-6 text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                💾 Save Selection &amp; Finalize Master Plan
              </button>
            </div>
          </div>
        </div>

        <!-- Ballot Generation Action Cards -->
        <div>
          <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>🖨️</span> Official Ballot Generation
          </h3>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${isSplit ? `
              <!-- Part 1 Ballot -->
              <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-indigo-500/50 transition-all">
                <div class="text-indigo-400 font-bold flex items-center justify-between">
                  <span class="flex items-center gap-2"><span>🏆</span> Part 1 (G1)</span>
                  <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">${currentConfig.ballots[0].paperSize || 'A3'}</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed truncate" title="${esc(currentConfig.ballots[0].title)}">
                  ${esc(currentConfig.ballots[0].title)}
                </p>
                <div class="text-[11px] text-slate-500">
                  ${part1Posts.length} Posts (${esc(part1Posts.slice(0, 2).join(', ') + (part1Posts.length > 2 ? '...' : ''))})
                </div>
                <div class="flex gap-2">
                  <button data-type="general_part:gen_1" class="btn btn-primary flex-1 py-2 text-xs preview-btn">
                    🖨️ Part 1 (G1)
                  </button>
                  <button data-excel-type="general_part:gen_1" class="btn btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white excel-btn" title="Download Part 1 Ballots in Excel (.xlsx)">
                    <span>📊</span> Excel
                  </button>
                </div>
              </div>

              <!-- Part 2 Ballot -->
              <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-emerald-500/50 transition-all">
                <div class="text-emerald-400 font-bold flex items-center justify-between">
                  <span class="flex items-center gap-2"><span>📑</span> Part 2 (G2)</span>
                  <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">${currentConfig.ballots[1]?.paperSize || 'A3'}</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed truncate" title="${esc(currentConfig.ballots[1]?.title || 'Additional General Ballot')}">
                  ${esc(currentConfig.ballots[1]?.title || 'Additional General Ballot')}
                </p>
                <div class="text-[11px] text-slate-500">
                  ${part2Posts.length} Posts (${esc(part2Posts.slice(0, 2).join(', ') + (part2Posts.length > 2 ? '...' : ''))})
                </div>
                <div class="flex gap-2">
                  <button data-type="general_part:gen_2" class="btn btn-primary flex-1 py-2 text-xs preview-btn">
                    🖨️ Part 2 (G2)
                  </button>
                  <button data-excel-type="general_part:gen_2" class="btn btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white excel-btn" title="Download Part 2 Ballots in Excel (.xlsx)">
                    <span>📊</span> Excel
                  </button>
                </div>
              </div>

              <!-- All General Parts Combined -->
              <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-indigo-500/50 transition-all bg-indigo-500/5">
                <div class="text-indigo-300 font-bold flex items-center gap-2">
                  <span>📚</span> All General Ballots
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Batch generates both Part 1 and Part 2 in sequence with page breaks.
                </p>
                <div class="text-[11px] text-indigo-400/80">
                  Combined print run for press
                </div>
                <div class="flex gap-2">
                  <button data-type="general" class="btn btn-secondary flex-1 py-2 text-xs border-indigo-500/30 text-indigo-200 hover:bg-indigo-600 hover:text-white preview-btn">
                    🖨️ All Parts
                  </button>
                  <button data-excel-type="general" class="btn btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white excel-btn" title="Download All General Ballots in Excel (.xlsx)">
                    <span>📊</span> Excel
                  </button>
                </div>
              </div>
            ` : `
              <!-- Single General Ballot Card -->
              <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-indigo-500/50 transition-all">
                <div class="text-indigo-400 font-bold flex items-center gap-2">
                  <span>🏆</span> General Union (A3)
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  All executive union posts in 2 columns. Designed for A3 paper.
                </p>
                <div class="text-[11px] text-slate-500">
                  ${part1Posts.length} Posts (Single Master Sheet)
                </div>
                <div class="flex gap-2">
                  <button data-type="general" class="btn btn-primary flex-1 py-2 text-xs preview-btn">
                    🖨️ General Ballot
                  </button>
                  <button data-excel-type="general" class="btn btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white excel-btn" title="Download General Ballots in Excel (.xlsx)">
                    <span>📊</span> Excel
                  </button>
                </div>
              </div>
            `}

            <!-- Year Reps -->
            <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-emerald-500/50 transition-all">
              <div class="text-emerald-400 font-bold flex items-center gap-2">
                <span>📅</span> Year Reps (A5)
              </div>
              <p class="text-xs text-slate-400 leading-relaxed">
                1st, 2nd, 3rd Year &amp; PG Reps. Designed for A5 paper (one post per page).
              </p>
              <div class="flex gap-2">
                <button data-type="year" class="btn btn-primary flex-1 py-2 text-xs preview-btn">
                  🖨️ Year Reps
                </button>
                <button data-excel-type="year" class="btn btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white excel-btn" title="Download Year Rep Ballots in Excel (.xlsx)">
                  <span>📊</span> Excel
                </button>
              </div>
            </div>

            <!-- Association Reps -->
            <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-amber-500/50 transition-all">
              <div class="text-amber-400 font-bold flex items-center gap-2">
                <span>🤝</span> Association Reps (A5)
              </div>
              <p class="text-xs text-slate-400 leading-relaxed">
                Departmental Association Secretaries. Designed for A5 paper (one post per page).
              </p>
              <div class="flex gap-2">
                <button data-type="assoc" class="btn btn-primary flex-1 py-2 text-xs preview-btn">
                  🖨️ Associations
                </button>
                <button data-excel-type="assoc" class="btn btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white excel-btn" title="Download Association Ballots in Excel (.xlsx)">
                  <span>📊</span> Excel
                </button>
              </div>
            </div>

            <!-- Summary Report -->
            <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-purple-500/50 transition-all bg-purple-500/5">
              <div class="text-purple-400 font-bold flex items-center gap-2">
                <span>📊</span> Printing Summary
              </div>
              <p class="text-xs text-slate-400 leading-relaxed">
                Detailed serial number ranges, book counts, and packaging breakdown for printing press.
              </p>
              <div class="flex gap-2">
                <button id="btnGenSummary" class="btn btn-secondary flex-1 py-2 text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white">
                  📑 View Summary
                </button>
                <button id="btnExcelSummaryTop" class="btn btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white" title="Download Serial Ranges & Packaging Plan in Excel (.xlsx)">
                  <span>📊</span> Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    // Post Card / Checkbox click toggle
    main.querySelectorAll('.post-select-card').forEach(card => {
      card.onclick = () => {
        const postName = card.dataset.postName;
        if (!postName) return;
        if (splitSet.has(postName)) {
          splitSet.delete(postName);
        } else {
          splitSet.add(postName);
        }
        syncConfig();
        renderUI();
      };
    });

    // Quick selection buttons
    const btnQuickArtsSports = main.querySelector('#btnQuickArtsSports');
    if (btnQuickArtsSports) {
      btnQuickArtsSports.onclick = () => {
        splitSet.clear();
        generalPosts.forEach(p => {
          const n = p.post.toLowerCase();
          if (n.includes('editor') || n.includes('arts') || n.includes('captain') || n.includes('sports')) {
            splitSet.add(p.post);
          }
        });
        syncConfig();
        renderUI();
        showToast('Selected Arts, Sports & Editorial for Additional Ballot', 'info');
      };
    }

    const btnQuickCouncil = main.querySelector('#btnQuickCouncil');
    if (btnQuickCouncil) {
      btnQuickCouncil.onclick = () => {
        splitSet.clear();
        generalPosts.forEach(p => {
          const n = p.post.toLowerCase();
          if (n.includes('uuc') || n.includes('councillor') || n.includes('editor') || n.includes('arts') || n.includes('captain') || n.includes('sports')) {
            splitSet.add(p.post);
          }
        });
        syncConfig();
        renderUI();
        showToast('Selected Council & Activities for Additional Ballot', 'info');
      };
    }

    const btnInvertSelect = main.querySelector('#btnInvertSelect');
    if (btnInvertSelect) {
      btnInvertSelect.onclick = () => {
        generalPosts.forEach(p => {
          if (splitSet.has(p.post)) splitSet.delete(p.post);
          else splitSet.add(p.post);
        });
        syncConfig();
        renderUI();
      };
    }

    const btnClearSplit = main.querySelector('#btnClearSplit');
    if (btnClearSplit) {
      btnClearSplit.onclick = () => {
        splitSet.clear();
        syncConfig();
        renderUI();
        showToast('Selection cleared. Reset to Single Unified Ballot.', 'info');
      };
    }

    // Title and size inputs
    const inputPart1Title = main.querySelector('#inputPart1Title');
    if (inputPart1Title) {
      inputPart1Title.onchange = () => {
        currentConfig.ballots[0].title = inputPart1Title.value.trim() || 'General Union Posts - Main';
      };
    }

    const selectPart1Size = main.querySelector('#selectPart1Size');
    if (selectPart1Size) {
      selectPart1Size.onchange = () => {
        currentConfig.ballots[0].paperSize = selectPart1Size.value;
      };
    }

    const inputPart2Title = main.querySelector('#inputPart2Title');
    if (inputPart2Title) {
      inputPart2Title.onchange = () => {
        if (currentConfig.ballots[1]) {
          currentConfig.ballots[1].title = inputPart2Title.value.trim() || 'Additional General Ballot';
        }
      };
    }

    const selectPart2Size = main.querySelector('#selectPart2Size');
    if (selectPart2Size) {
      selectPart2Size.onchange = () => {
        if (currentConfig.ballots[1]) {
          currentConfig.ballots[1].paperSize = selectPart2Size.value;
        }
      };
    }

    // Save configuration and finalize plan
    const btnSaveConfig = main.querySelector('#btnSaveConfig');
    if (btnSaveConfig) {
      btnSaveConfig.onclick = async () => {
        const defaultText = btnSaveConfig.innerHTML;
        try {
          setLoading(btnSaveConfig, true, defaultText);
          showToast('Saving ballot selection & calculating Master Plan...', 'info');
          await api.adminSaveBallotConfig(pwd, currentConfig);
          const res = await api.adminGenerateBallotPlan(pwd);
          plan = res.plan;
          showToast('Ballot selection saved & Master Plan finalized!', 'success');
          renderUI();
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error');
        } finally {
          setLoading(btnSaveConfig, false, defaultText);
        }
      };
    }

    const btnRegenPlanTop = main.querySelector('#btnRegenPlanTop');
    if (btnRegenPlanTop) {
      btnRegenPlanTop.onclick = async () => {
        const defaultText = '🔄 Finalize Master Plan';
        try {
          setLoading(btnRegenPlanTop, true, defaultText);
          showToast('Calculating and saving Master Plan on server...', 'info');
          await api.adminGenerateBallotPlan(pwd);
          plan = await api.adminGetBallotPlan(pwd).catch(() => null);
          showToast('Master Plan finalized successfully!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          setLoading(btnRegenPlanTop, false, defaultText);
        }
      };
    }

    // Summary Report
    const btnGenSummary = main.querySelector('#btnGenSummary');
    if (btnGenSummary) {
      btnGenSummary.onclick = () => openBallotSummaryConfigModal(pwd);
    }

    // Top Download Ballots Excel button
    const btnDownloadBallotsExcel = main.querySelector('#btnDownloadBallotsExcel');
    if (btnDownloadBallotsExcel) {
      btnDownloadBallotsExcel.onclick = () => openBallotExcelDownloadModal(pwd, currentConfig);
    }

    // Excel button on summary card
    const btnExcelSummaryTop = main.querySelector('#btnExcelSummaryTop');
    if (btnExcelSummaryTop) {
      btnExcelSummaryTop.onclick = () => openBallotSummaryConfigModal(pwd);
    }

    // Excel buttons on action cards
    main.querySelectorAll('.excel-btn').forEach(btn => {
      btn.onclick = () => downloadBallotsExcel(pwd, btn.dataset.excelType, currentConfig);
    });

    // Print Preview buttons
    main.querySelectorAll('.preview-btn').forEach(btn => {
      btn.onclick = () => handlePreview(btn.dataset.type);
    });
  };

  const handlePreview = async (type) => {
    await generateAndPrintBallots(pwd, type, currentConfig);
  };

  const handleSummaryReport = async () => {
    openBallotSummaryConfigModal(pwd);
  };

  // Expose global helper for summary window
  window.gccDownloadBallotsExcel = (type) => downloadBallotsExcel(pwd, type, currentConfig);

  renderUI();
}

export function openBallotExcelDownloadModal(pwd, currentConfig = null) {
  const existingModal = document.getElementById('modalBallotExcelDownload');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'modalBallotExcelDownload';
  modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in';
  modal.innerHTML = `
    <div class="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-200 space-y-5 animate-scale-up" style="max-height: 90vh; overflow-y: auto;">
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-white/10 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl text-emerald-300">
            📊
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Download Ballots in Excel (.xlsx)</h3>
            <p class="text-xs text-slate-400">Contesting candidates, ballot numbers, and packaging plan</p>
          </div>
        </div>
        <button id="btnExcelModalClose" class="text-slate-400 hover:text-white text-lg px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">✕</button>
      </div>

      <!-- Master Option -->
      <div class="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-800/80 border border-emerald-500/40 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🌟</span> All-In-One Master Workbook (Recommended)
          </span>
          <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono font-bold">Multi-Tab XLSX</span>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Formatted identically to official HTML printed ballot papers: <strong>General Union (A3 2-Column Grid)</strong>, <strong>Year Reps (A5)</strong>, <strong>Associations (A5)</strong>, plus <strong>Serial Ranges &amp; Packaging Plan</strong> and <strong>Post Election Summary</strong>.
        </p>
        <button id="btnDownloadMasterExcel" class="btn btn-primary w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2">
          <span>📥</span> Download Master Ballot Workbook
        </button>
      </div>

      <!-- Category Options Grid -->
      <div class="space-y-2">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Or Download Specific Category
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <!-- General Ballots -->
          <button data-excel-modal-type="general" class="excel-modal-option-btn p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/50 text-left transition-all flex items-center justify-between group">
            <div>
              <div class="text-xs font-bold text-white group-hover:text-indigo-300 flex items-center gap-1.5">
                <span>🏆</span> General Union
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5">Chairman, Secretary, UUC...</div>
            </div>
            <span class="text-xs text-slate-400 group-hover:text-white">📥</span>
          </button>

          <!-- Year Reps -->
          <button data-excel-modal-type="year" class="excel-modal-option-btn p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-white/10 hover:border-emerald-500/50 text-left transition-all flex items-center justify-between group">
            <div>
              <div class="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1.5">
                <span>📅</span> Year Reps
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5">I UG, II UG, III UG, PG</div>
            </div>
            <span class="text-xs text-slate-400 group-hover:text-white">📥</span>
          </button>

          <!-- Associations -->
          <button data-excel-modal-type="assoc" class="excel-modal-option-btn p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-white/10 hover:border-amber-500/50 text-left transition-all flex items-center justify-between group">
            <div>
              <div class="text-xs font-bold text-white group-hover:text-amber-300 flex items-center gap-1.5">
                <span>🤝</span> Associations
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5">Department Secretaries</div>
            </div>
            <span class="text-xs text-slate-400 group-hover:text-white">📥</span>
          </button>

          <!-- Packaging Plan -->
          <button data-excel-modal-type="summary" class="excel-modal-option-btn p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-white/10 hover:border-purple-500/50 text-left transition-all flex items-center justify-between group">
            <div>
              <div class="text-xs font-bold text-white group-hover:text-purple-300 flex items-center gap-1.5">
                <span>📑</span> Packaging Plan
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5">Booth Serials &amp; Booklets</div>
            </div>
            <span class="text-xs text-slate-400 group-hover:text-white">📥</span>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end pt-3 border-t border-white/10">
        <button type="button" id="btnExcelModalDismiss" class="btn btn-secondary py-2 px-5 text-xs">
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#btnExcelModalClose').onclick = closeModal;
  modal.querySelector('#btnExcelModalDismiss').onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };

  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);

  modal.querySelector('#btnDownloadMasterExcel').onclick = () => {
    closeModal();
    downloadBallotsExcel(pwd, 'all', currentConfig);
  };

  modal.querySelectorAll('.excel-modal-option-btn').forEach(btn => {
    btn.onclick = () => {
      const type = btn.dataset.excelModalType;
      closeModal();
      downloadBallotsExcel(pwd, type, currentConfig);
    };
  });
}

export async function downloadBallotsExcel(pwd, filterType = 'all', overrideConfig = null) {
  try {
    showToast('Preparing Excel workbook...', 'info');
    const [postsData, candidatesResponse, schedule, settings, ballotConfig, rawPlan] = await Promise.all([
      api.adminGetPosts(pwd).catch(() => []),
      api.adminGetFinalNominations(pwd).catch(async () => {
        const all = await api.adminGetNominations(pwd).catch(() => []);
        return {
          active: all.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved'),
          withdrawn: all.filter(n => n.withdrawalStatus === 'Approved'),
          isPublished: false
        };
      }),
      api.getPublicSchedule().catch(() => ({})),
      api.adminGetSettings(pwd).catch(() => ({})),
      overrideConfig ? Promise.resolve(overrideConfig) : api.adminGetBallotConfig(pwd).catch(() => null),
      api.adminGetBallotPlan(pwd).catch(() => null)
    ]);

    const activeConfig = overrideConfig || ballotConfig || {
      isSplit: false,
      ballots: [
        { id: 'gen_main', title: 'General Union Posts', shortCode: 'G', paperSize: 'A3', posts: [] }
      ]
    };

    let plan = rawPlan;
    if (!plan) {
      const genRes = await api.adminGenerateBallotPlan(pwd).catch(() => null);
      plan = genRes?.plan || null;
    }

    const savedSize = parseInt(localStorage.getItem('gcc_ballot_book_size') || '50', 10);
    const savedMerge = localStorage.getItem('gcc_ballot_merge_remainders') !== 'false';
    const activePlan = plan ? recalculateBallotPlanBooks(plan, savedSize, savedMerge) : null;

    const fileName = exportBallotsToExcel({
      postsData,
      candidatesResponse,
      schedule,
      settings,
      currentConfig: activeConfig,
      masterPlan: activePlan,
      filterType
    });

    showToast(`✅ Excel downloaded: ${fileName}`, 'success');
  } catch (err) {
    showToast(`Failed to export Excel: ${err.message}`, 'error');
  }
}

export function openBallotSummaryConfigModal(pwd) {
  const existingModal = document.getElementById('modalBallotSummaryConfig');
  if (existingModal) existingModal.remove();

  const savedSize = parseInt(localStorage.getItem('gcc_ballot_book_size') || '50', 10);
  const savedMerge = localStorage.getItem('gcc_ballot_merge_remainders') !== 'false';
  let currentSelectedSize = [25, 50, 100].includes(savedSize) ? savedSize : 'custom';
  let customValue = ![25, 50, 100].includes(savedSize) ? savedSize : '';

  const modal = document.createElement('div');
  modal.id = 'modalBallotSummaryConfig';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in';
  modal.innerHTML = `
    <div class="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-200 space-y-5 animate-scale-up" style="max-height: 90vh; overflow-y: auto;">
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-white/10 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xl text-purple-300">
            📑
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Ballot Booklet Packaging Setup</h3>
            <p class="text-xs text-slate-400">Configure book breakdown rules for Printing Press</p>
          </div>
        </div>
        <button id="btnModalClose" class="text-slate-400 hover:text-white text-lg px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">✕</button>
      </div>

      <!-- Presets & Size -->
      <div class="space-y-3">
        <label class="text-xs font-semibold text-slate-300 block">
          Default Ballots per Book (Stitched Booklet):
        </label>
        <p class="text-[11px] text-slate-400 leading-relaxed">
          Standard collegiate elections use 50-slip stitched booklets with counterfoils. You can customize this based on agreements with your printing press.
        </p>

        <!-- Presets Grid -->
        <div class="grid grid-cols-3 gap-2.5">
          <button type="button" data-preset="25" class="preset-size-btn p-3 rounded-xl border text-center transition-all ${currentSelectedSize === 25 ? 'bg-purple-500/25 border-purple-500 text-purple-200 font-bold shadow-md shadow-purple-500/20' : 'bg-slate-800/80 border-white/10 hover:border-purple-500/40'}">
            <div class="text-base font-bold text-white">25</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Compact / Small</div>
          </button>
          <button type="button" data-preset="50" class="preset-size-btn p-3 rounded-xl border text-center transition-all ${currentSelectedSize === 50 ? 'bg-purple-500/25 border-purple-500 text-purple-200 font-bold shadow-md shadow-purple-500/20' : 'bg-slate-800/80 border-white/10 hover:border-purple-500/40'}">
            <div class="text-base font-bold text-white">50</div>
            <div class="text-[10px] text-purple-300 mt-0.5">Official Standard</div>
          </button>
          <button type="button" data-preset="100" class="preset-size-btn p-3 rounded-xl border text-center transition-all ${currentSelectedSize === 100 ? 'bg-purple-500/25 border-purple-500 text-purple-200 font-bold shadow-md shadow-purple-500/20' : 'bg-slate-800/80 border-white/10 hover:border-purple-500/40'}">
            <div class="text-base font-bold text-white">100</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Jumbo / High Vol</div>
          </button>
        </div>

        <!-- Custom Input Field -->
        <div class="bg-slate-800/50 border border-white/10 p-3 rounded-xl space-y-2">
          <div class="flex items-center justify-between">
            <label for="inputModalCustomSize" class="text-xs font-semibold text-slate-300">Or Custom Slips per Book:</label>
            <span class="text-[10px] text-slate-400">(e.g. 20, 30, 40, 75)</span>
          </div>
          <div class="flex items-center gap-2">
            <input type="number" id="inputModalCustomSize" min="5" max="500" value="${customValue}" placeholder="Enter custom size (5 - 500)" class="input input-sm w-full bg-slate-900 border-white/10 text-xs text-white" />
          </div>
        </div>
      </div>

      <!-- Smart Remainder Merging Option -->
      <label class="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-white/10 cursor-pointer hover:bg-slate-800/70 transition-colors">
        <input type="checkbox" id="chkModalMerge" class="mt-0.5 accent-purple-500 w-4 h-4 cursor-pointer" ${savedMerge ? 'checked' : ''} />
        <div class="space-y-0.5">
          <div class="text-xs font-semibold text-white">Smart Remainder Merging (Recommended)</div>
          <p class="text-[11px] text-slate-400 leading-relaxed">
            When remaining ballots for a booth are small (≤30% of booklet size), merge them into the last booklet instead of creating a tiny partial book (e.g. 62 voters become 1 book of 62 instead of 50 + 12).
          </p>
        </div>
      </label>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-between pt-3 border-t border-white/10">
        <button type="button" id="btnModalExcel" class="btn btn-secondary py-2 px-3 text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white font-bold flex items-center gap-1.5" title="Export this calculated summary directly to Excel (.xlsx)">
          <span>📊</span> Export to Excel
        </button>
        <div class="flex items-center gap-2">
          <button type="button" id="btnModalCancel" class="btn btn-secondary py-2 px-3 text-xs">
            Cancel
          </button>
          <button type="button" id="btnModalConfirm" class="btn btn-primary py-2 px-4 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/30 flex items-center gap-1.5">
            <span>📑</span> View Report
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const customInput = modal.querySelector('#inputModalCustomSize');
  const chkMerge = modal.querySelector('#chkModalMerge');
  const presetButtons = modal.querySelectorAll('.preset-size-btn');

  const updatePresetHighlight = () => {
    presetButtons.forEach(btn => {
      const p = parseInt(btn.dataset.preset, 10);
      if (currentSelectedSize === p) {
        btn.className = 'preset-size-btn p-3 rounded-xl border text-center transition-all bg-purple-500/25 border-purple-500 text-purple-200 font-bold shadow-md shadow-purple-500/20';
      } else {
        btn.className = 'preset-size-btn p-3 rounded-xl border text-center transition-all bg-slate-800/80 border-white/10 hover:border-purple-500/40';
      }
    });
  };

  presetButtons.forEach(btn => {
    btn.onclick = () => {
      currentSelectedSize = parseInt(btn.dataset.preset, 10);
      customInput.value = '';
      updatePresetHighlight();
    };
  });

  customInput.oninput = () => {
    const val = parseInt(customInput.value, 10);
    if (!isNaN(val) && val > 0) {
      currentSelectedSize = 'custom';
      updatePresetHighlight();
    }
  };

  const closeModal = () => {
    modal.remove();
  };

  modal.querySelector('#btnModalClose').onclick = closeModal;
  modal.querySelector('#btnModalCancel').onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  const getModalConfigValues = () => {
    let finalSize = 50;
    if (currentSelectedSize === 'custom') {
      const val = parseInt(customInput.value, 10);
      if (isNaN(val) || val < 5 || val > 500) {
        alert('Please enter a valid booklet size between 5 and 500.');
        customInput.focus();
        return null;
      }
      finalSize = val;
    } else {
      finalSize = currentSelectedSize;
    }
    const finalMerge = chkMerge.checked;
    return { finalSize, finalMerge };
  };

  modal.querySelector('#btnModalExcel').onclick = async () => {
    const cfg = getModalConfigValues();
    if (!cfg) return;
    localStorage.setItem('gcc_ballot_book_size', String(cfg.finalSize));
    localStorage.setItem('gcc_ballot_merge_remainders', cfg.finalMerge ? 'true' : 'false');
    closeModal();
    showToast(`Saving Packaging Plan (${cfg.finalSize} ballots/book) to server...`, 'info');
    await api.adminGenerateBallotPlan(pwd, { bookSize: cfg.finalSize, mergeRemainders: cfg.finalMerge }).catch(() => null);
    await downloadBallotsExcel(pwd, 'summary');
  };

  modal.querySelector('#btnModalConfirm').onclick = async () => {
    const cfg = getModalConfigValues();
    if (!cfg) return;
    localStorage.setItem('gcc_ballot_book_size', String(cfg.finalSize));
    localStorage.setItem('gcc_ballot_merge_remainders', cfg.finalMerge ? 'true' : 'false');
    closeModal();
    await generateAndPrintBallotPressSummary(pwd, cfg.finalSize, cfg.finalMerge);
  };
}

export const triggerBallotPrint = (html, customTitle = null) => {
  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Popup blocked! Please allow popups for this site to print.');
    return;
  }
  const pageTitle = customTitle || `Official Ballots - ${CONFIG.COLLEGE_SHORT_NAME} Election`;
  printWin.document.write(`
    <html>
      <head>
        <title>${esc(pageTitle)}</title>
        <style>
          @media print {
            .no-print { display: none !important; }
            .page-break { page-break-after: always; }
            body { background: white !important; }
            .ballot-container { margin: 0 !important; box-shadow: none !important; }
          }
          body { margin: 0; padding: 0; background: #eee; }
          
          .ballot-container {
            background: white;
            color: black;
            font-family: "Times New Roman", Times, serif;
            margin: 20px auto;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            box-sizing: border-box;
            overflow: hidden;
          }

          .a3 { width: 297mm; min-height: 420mm; padding: 45px; }
          .a4 { width: 210mm; min-height: 297mm; padding: 30px; }
          .a5 { width: 148mm; min-height: 210mm; padding: 25px; }

          .ballot-header { text-align: center; border-bottom: 3px double #000; margin-bottom: 25px; padding-bottom: 10px; }
          .ballot-header h1 { font-size: 20px; margin: 0; text-transform: uppercase; }
          .ballot-header h2 { font-size: 16px; margin: 5px 0 0 0; }
          
          .a3 .ballot-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 30px; 
            width: 100%;
            align-items: flex-start;
          }
          .a4 .ballot-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
            width: 100%;
            align-items: flex-start;
          }
          .a5 .ballot-grid { display: block; }

          .post-box { 
            border: 2px solid #000; 
            padding: 0; 
            display: flex; 
            flex-direction: column; 
            margin-bottom: 22px; 
            break-inside: avoid; 
            -webkit-column-break-inside: avoid;
            page-break-inside: avoid;
            width: 100%;
          }
          .post-title { background: #ccc; color: #000; text-align: center; padding: 7px; font-weight: bold; font-size: 13px; text-transform: uppercase; border-bottom: 1px solid #000; }
          
          .candidate-row { display: flex; align-items: center; border-bottom: 1px solid #000; height: 50px; }
          .candidate-row:last-child { border-bottom: none; }
          
          .sl-no { width: 40px; text-align: center; border-right: 1px solid #000; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px; }
          .c-name { flex-grow: 1; padding: 0 15px; font-weight: bold; display: flex; flex-direction: column; justify-content: center; }
          .stamp-box { width: 70px; height: 100%; border-left: 1px solid #000; display: flex; align-items: center; justify-content: center; position: relative; }
          .stamp-box::after { content: ""; width: 32px; height: 32px; border: 1px dashed #ccc; border-radius: 4px; }
          
          .instr-box { text-align: center; border: 1px solid #000; padding: 7px; margin-bottom: 20px; font-weight: bold; font-size: 12px; text-transform: uppercase; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold; font-size: 13px; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
  printWin.document.close();
};

export function buildBallotsSheetHtml({ postsData = [], candidatesResponse, schedule = {}, settings = {}, currentConfig = {}, filterType = 'all' }) {
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;
  const collegeLogo = settings.collegeLogo || '';
  const year = settings.electionYear || schedule.electionYear || new Date().getFullYear().toString();
  const candidates = Array.isArray(candidatesResponse) ? candidatesResponse : (candidatesResponse?.active || []);
  if (candidates.length === 0) throw new Error('No active candidates found. Please ensure candidates are nominated and verified.');

  const contestablePosts = postsData.filter(p => {
    const pCands = candidates.filter(c => c.post === p.post);
    return pCands.length > 1;
  });

  const isSplit = !!currentConfig.isSplit;
  let html = '';

  const renderGeneralBallotPart = (partConfig, partPosts) => {
    if (!partPosts || partPosts.length === 0) return '';
    const paperClass = (partConfig.paperSize || 'A3').toLowerCase();
    const prefix = partConfig.shortCode === 'G' ? 'G' : (partConfig.shortCode || 'G1') + '-';
    const partTitle = partConfig.title || 'OFFICIAL BALLOT PAPER (GENERAL)';

    const sorted = [...partPosts].sort((a, b) => comparePosts(a, b));

    let col1Html = '', col2Html = '';
    sorted.forEach((p, idx) => {
      const pCands = candidates.filter(c => c.post === p.post).sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));
      const pContent = `
        <div class="post-box">
          <div class="post-title">${esc(p.post.toUpperCase())}</div>
          ${pCands.map((c, i) => `
            <div class="candidate-row">
              <div class="sl-no">${i + 1}</div>
              <div class="c-name">
                <div style="font-size: 13px; text-transform: uppercase;">${esc(c.candidateName)}</div>
                <div style="font-size: 10px; font-weight: normal; color: #444;">${esc(c.candidateClass)}</div>
              </div>
              <div class="stamp-box"></div>
            </div>
          `).join('')}
          <div class="candidate-row"><div class="sl-no">${pCands.length + 1}</div><div class="c-name">NOTA</div><div class="stamp-box"></div></div>
        </div>
      `;
      if (idx % 2 === 0) col1Html += pContent;
      else col2Html += pContent;
    });

    return `
      <div class="ballot-container ${paperClass} page-break">
        <!-- Counterfoil -->
        <div style="border-bottom: 2px dotted #000; padding-bottom: 18px; margin-bottom: 25px; text-align: center;">
          ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:40px;max-width:110px;margin:0 auto 4px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
          <h1 style="font-size: 16px; margin: 2px 0; text-transform: uppercase;">${esc(collegeName)}</h1>
          <h2 style="font-size: 14px; margin: 2px 0; font-weight: bold;">COLLEGE UNION ELECTION ${year}</h2>
          <h3 style="font-size: 13px; margin: 2px 0 0 0;">${esc(partTitle.toUpperCase())} - COUNTERFOIL</h3>
          <div style="margin-top: 12px; font-weight: bold; text-align: left; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between;">
              <span>SL.NO. ${prefix}____________</span>
              <span style="font-size: 10px; color: #666; font-style: italic;">(To be detached before voting)</span>
            </div>
            <div style="font-size: 12px;">Sl. No of Voter in Marked Copy: ____________</div>
          </div>
        </div>

        <div class="ballot-header">
          ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:45px;max-width:120px;margin:0 auto 4px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
          <h1>${esc(collegeName)}</h1>
          <h2>COLLEGE UNION ELECTION ${year}</h2>
          <h3>${esc(partTitle.toUpperCase())}</h3>
        </div>
        <div class="meta-row"><div>SL.NO. ${prefix}____________</div><div>Signature of PRO</div></div>
        <div class="instr-box">MARK THE VOTER'S CHOICE WITH THE MARKING SEAL IN THE SPACE PROVIDED</div>
        <div class="ballot-grid">
          <div class="ballot-col">${col1Html}</div>
          <div class="ballot-col">${col2Html}</div>
        </div>
      </div>
    `;
  };

  // 1. General Ballots
  if (filterType === 'all' || filterType === 'general' || filterType.startsWith('general_part:')) {
    const gPosts = contestablePosts.filter(isGeneralPostCheck);

    if (isSplit) {
      let partsToGenerate = currentConfig.ballots || [];
      if (filterType.startsWith('general_part:')) {
        const targetId = filterType.replace('general_part:', '');
        partsToGenerate = (currentConfig.ballots || []).filter(b => b.id === targetId);
      }

      partsToGenerate.forEach(partConfig => {
        const partPosts = gPosts.filter(p => (partConfig.posts || []).includes(p.post));
        html += renderGeneralBallotPart(partConfig, partPosts);
      });
    } else {
      const singleConfig = {
        title: 'OFFICIAL BALLOT PAPER (GENERAL)',
        shortCode: 'G',
        paperSize: 'A3'
      };
      html += renderGeneralBallotPart(singleConfig, gPosts);
    }
  }

  // 2. Year Rep & Association Ballots (A5, One post per page)
  const otherPosts = contestablePosts.filter(p => isYearPostCheck(p) || isAssocPostCheck(p)).sort(comparePosts);
  if (filterType === 'all' || filterType === 'year' || filterType === 'assoc') {
    const filteredOthers = otherPosts.filter(p => 
      (filterType === 'all') || 
      (filterType === 'year' && isYearPostCheck(p)) || 
      (filterType === 'assoc' && isAssocPostCheck(p))
    );

    filteredOthers.forEach(p => {
      const pCands = candidates.filter(c => c.post === p.post).sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));
      const prefix = isYearPostCheck(p) ? 'R' : 'A';
      html += `
        <div class="ballot-container a5 page-break">
          <!-- Counterfoil -->
          <div style="border-bottom: 2px dotted #000; padding-bottom: 15px; margin-bottom: 20px; text-align: center;">
            ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:35px;max-width:90px;margin:0 auto 4px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
            <h1 style="font-size: 15px; margin: 2px 0;">${esc(collegeName)}</h1>
            <h2 style="font-size: 13px; margin: 0; font-weight: bold;">COLLEGE UNION ELECTION ${year}</h2>
            <h3 style="font-size: 11px; margin: 2px 0 0 0;">OFFICIAL BALLOT (${prefix}) - COUNTERFOIL</h3>
            <div style="margin-top: 10px; font-weight: bold; text-align: left; display: flex; flex-direction: column; gap: 5px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between;">
                <span>SL.NO. ${prefix}____________</span>
                <span style="font-size: 9px; color: #666; font-style: italic;">(To be detached)</span>
              </div>
              <div>Sl. No of Voter in Marked Copy: ____________</div>
            </div>
          </div>

          <div class="ballot-header">
            ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:40px;max-width:100px;margin:0 auto 4px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
            <h1>${esc(collegeName)}</h1>
            <h2 style="font-size: 14px; margin: 2px 0; font-weight: bold;">COLLEGE UNION ELECTION ${year}</h2>
            <h3 style="font-size: 15px; margin-top: 5px; font-weight: bold;">BALLOT PAPER (${prefix})</h3>
          </div>
          <div class="meta-row" style="font-size: 12px;"><div>SL.NO. ${prefix}____________</div><div>PRO Sign</div></div>
          <div class="post-box">
            <div class="post-title">${esc(p.post.toUpperCase())}</div>
            ${pCands.map((c, i) => `
              <div class="candidate-row">
                <div class="sl-no">${i + 1}</div>
                <div class="c-name">
                  <div style="font-size: 13px; text-transform: uppercase;">${esc(c.candidateName)}</div>
                  <div style="font-size: 10px; font-weight: normal; color: #444;">${esc(c.candidateClass)}</div>
                </div>
                <div class="stamp-box"></div>
              </div>
            `).join('')}
            <div class="candidate-row"><div class="sl-no">${pCands.length + 1}</div><div class="c-name">NOTA</div><div class="stamp-box"></div></div>
          </div>
        </div>
      `;
    });
  }

  return html;
}

export async function generateAndPrintBallots(pwd, filterType = 'all', overrideConfig = null) {
  try {
    showToast('Generating ballots...', 'info');
    const [postsData, candidatesResponse, schedule, settings, ballotConfig] = await Promise.all([
      api.adminGetPosts(pwd),
      api.adminGetFinalNominations(pwd).catch(async () => {
        const all = await api.adminGetNominations(pwd).catch(() => []);
        return {
          active: all.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved'),
          withdrawn: all.filter(n => n.withdrawalStatus === 'Approved'),
          isPublished: false
        };
      }),
      api.getPublicSchedule(),
      api.adminGetSettings(pwd).catch(() => ({})),
      overrideConfig ? Promise.resolve(overrideConfig) : api.adminGetBallotConfig(pwd).catch(() => null)
    ]);

    const activeConfig = overrideConfig || ballotConfig || {
      isSplit: false,
      ballots: [
        { id: 'gen_main', title: 'General Union Posts', shortCode: 'G', paperSize: 'A3', posts: [] }
      ]
    };

    const html = buildBallotsSheetHtml({
      postsData,
      candidatesResponse,
      schedule,
      settings,
      currentConfig: activeConfig,
      filterType
    });

    triggerBallotPrint(html);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export function calcBooksHelper(count, start, prefix, currentGlobalBookCount, customBookPrefix, standard, enableMerge) {
  if (!count || count <= 0) return { books: [], ids: '-', count: 0, nextCounter: currentGlobalBookCount };
  let current = start;
  let books = [];
  const idPrefix = customBookPrefix || (prefix === 'G' ? 'GB' : (prefix === 'R' ? 'RB' : 'AB'));
  let counter = currentGlobalBookCount;
  let ids = [];

  const formatSlip = (num) => {
    if (prefix === 'G' || prefix === 'R' || prefix === 'A') {
      return `${prefix}${num}`;
    }
    return `${prefix}-${num}`;
  };

  const createRange = (size) => {
    counter++;
    const id = (idPrefix.endsWith('-') ? idPrefix : idPrefix) + counter;
    ids.push(id);
    const range = `${formatSlip(current)} - ${formatSlip(current + size - 1)}`;
    current += size;
    return { id, range };
  };

  const threshold = enableMerge ? Math.max(5, Math.round(standard * 0.3)) : 0;

  if (count <= (standard + threshold)) {
    books.push({ qty: 1, size: count, items: [createRange(count)] });
  } else {
    const fullBooks = Math.floor(count / standard);
    const remainder = count % standard;
    if (remainder === 0) {
      let items = [];
      for (let i = 0; i < fullBooks; i++) items.push(createRange(standard));
      books.push({ qty: fullBooks, size: standard, items });
    } else if (remainder <= threshold) {
      let items = [];
      for (let i = 0; i < fullBooks - 1; i++) items.push(createRange(standard));
      if (items.length > 0) books.push({ qty: fullBooks - 1, size: standard, items });
      const lastSize = standard + remainder;
      books.push({ qty: 1, size: lastSize, items: [createRange(lastSize)] });
    } else {
      let items = [];
      for (let i = 0; i < fullBooks; i++) items.push(createRange(standard));
      books.push({ qty: fullBooks, size: standard, items });
      books.push({ qty: 1, size: remainder, items: [createRange(remainder)] });
    }
  }

  return {
    books,
    ids: ids.length === 1 ? ids[0] : `${ids[0]} to ${ids[ids.length - 1]}`,
    nextCounter: counter
  };
}

export const getRepCohortGroup = (postName) => {
  const p = String(postName || '').toUpperCase();
  if (p.includes('III UG') || p.includes('3RD YEAR') || p.includes('3 UG') || p.includes('THIRD YEAR')) {
    return { key: 'III_UG', title: 'III UG Representative', short: 'III UG', rank: 3 };
  }
  if (p.includes('II UG') || p.includes('2ND YEAR') || p.includes('2 UG') || p.includes('SECOND YEAR')) {
    return { key: 'II_UG', title: 'II UG Representative', short: 'II UG', rank: 2 };
  }
  if (p.includes('I UG') || p.includes('1ST YEAR') || p.includes('1 UG') || p.includes('FIRST YEAR')) {
    return { key: 'I_UG', title: 'I UG Representative', short: 'I UG', rank: 1 };
  }
  if (p.includes('PG') || p.includes('POST GRADUATE') || p.includes('POSTGRADUATE')) {
    return { key: 'PG', title: 'PG Representative', short: 'PG', rank: 4 };
  }
  return { key: p, title: postName, short: postName, rank: 5 };
};

export function recalculateBallotPlanBooks(rawPlan, bookSize = 50, enableMerge = true) {
  const plan = JSON.parse(JSON.stringify(rawPlan || {}));
  const standard = Number(bookSize) > 0 ? Number(bookSize) : 50;

  // 1. General
  if (plan.isSplit && Array.isArray(plan.generalParts)) {
    plan.generalParts.forEach(gp => {
      let partSl = 1, partBookCount = 0;
      (gp.results || []).forEach(s => {
        const count = s.count || 0;
        const start = partSl;
        const end = start + count - 1;
        const bookData = calcBooksHelper(count, start, gp.shortCode, partBookCount, gp.bookPrefix, standard, enableMerge);
        partBookCount = bookData.nextCounter;
        s.start = start;
        s.end = end;
        s.books = bookData.books;
        s.bookIds = bookData.ids;
        if (s.rsCount > 0) {
          const reg = s.regCount !== undefined ? s.regCount : (count - s.rsCount);
          s.reserveSlipsRange = `${gp.shortCode}${start + reg} - ${gp.shortCode}${end}`;
        }
        partSl += count;
      });
      gp.total = partSl - 1;
    });
  } else if (plan.general) {
    let genSl = 1, gbCount = 0;
    (plan.general.results || []).forEach(s => {
      const count = s.count || 0;
      const start = genSl;
      const end = start + count - 1;
      const bookData = calcBooksHelper(count, start, 'G', gbCount, 'GB', standard, enableMerge);
      gbCount = bookData.nextCounter;
      s.start = start;
      s.end = end;
      s.books = bookData.books;
      s.bookIds = bookData.ids;
      if (s.rsCount > 0) {
        const reg = s.regCount !== undefined ? s.regCount : (count - s.rsCount);
        s.reserveSlipsRange = `G${start + reg} - G${end}`;
      }
      genSl += count;
    });
    plan.general.total = genSl - 1;
  }

  // 2. Year Reps (Sorted systematically by Cohort Rank then Booth)
  if (plan.reps && Array.isArray(plan.reps.results)) {
    plan.reps.results.sort((a, b) => {
      const rA = getRepCohortGroup(a.post).rank;
      const rB = getRepCohortGroup(b.post).rank;
      if (rA !== rB) return rA - rB;
      return Number(a.booth) - Number(b.booth);
    });

    let repSl = 1, rbCount = 0;
    plan.reps.results.forEach(s => {
      const count = s.count || 0;
      const start = repSl;
      const end = start + count - 1;
      const bookData = calcBooksHelper(count, start, 'R', rbCount, 'RB', standard, enableMerge);
      rbCount = bookData.nextCounter;
      s.start = start;
      s.end = end;
      s.books = bookData.books;
      s.bookIds = bookData.ids;
      repSl += count;
    });
    plan.reps.total = repSl - 1;
  }

  // 3. Assocs
  if (plan.assocs && Array.isArray(plan.assocs.results)) {
    let assocSl = 1, abCount = 0;
    plan.assocs.results.forEach(s => {
      const count = s.count || 0;
      const start = assocSl;
      const end = start + count - 1;
      const bookData = calcBooksHelper(count, start, 'A', abCount, 'AB', standard, enableMerge);
      abCount = bookData.nextCounter;
      s.start = start;
      s.end = end;
      s.books = bookData.books;
      s.bookIds = bookData.ids;
      if (s.rsCount > 0) {
        const reg = s.regCount !== undefined ? s.regCount : (count - s.rsCount);
        s.reserveSlipsRange = `A${start + reg} - A${end}`;
      }
      assocSl += count;
    });
    plan.assocs.total = assocSl - 1;
  }

  return plan;
}

export const renderBooksHtml = (booksOrHtml) => {
  if (!booksOrHtml || (Array.isArray(booksOrHtml) && booksOrHtml.length === 0)) return '-';
  if (typeof booksOrHtml === 'string') return booksOrHtml;
  const books = booksOrHtml;
  return `
    <table style="width:100%; border-collapse:collapse; font-size:10px; background:rgba(0,0,0,0.02);">
      ${books.map(b => `
        <tr>
          <td style="padding:4px; border:1px solid #eee; font-weight:bold; width:45px;">${b.qty} x ${b.size}</td>
          <td style="padding:4px; border:1px solid #eee; line-height:1.4;">
            ${b.items.map(it => `<span style="display:inline-block; margin-right:8px;"><strong style="color:#4f46e5;">${it.id}:</strong> ${it.range}</span>`).join(' ')}
          </td>
        </tr>
      `).join('')}
    </table>
  `;
};

export function buildSummaryContentHtml(masterPlan, settings = {}, schedule = {}, bookSize = 50, enableMerge = true) {
  const year = settings.electionYear || schedule.electionYear || new Date().getFullYear().toString();
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;
  const collegeLogo = settings.collegeLogo || '';

  const isSplitPlan = !!(masterPlan.isSplit && Array.isArray(masterPlan.generalParts) && masterPlan.generalParts.length > 1);

  // Split Year Reps into Cohorts
  const cohortMap = new Map();
  (masterPlan.reps?.results || []).forEach(item => {
    const cohort = getRepCohortGroup(item.post);
    if (!cohortMap.has(cohort.key)) {
      cohortMap.set(cohort.key, { cohort, items: [] });
    }
    cohortMap.get(cohort.key).items.push(item);
  });
  const sortedCohorts = Array.from(cohortMap.values()).sort((a, b) => a.cohort.rank - b.cohort.rank);

  // Calculate total rep books
  let totalRepBooksCount = 0;
  let firstRepBookId = null;
  let lastRepBookId = null;
  (masterPlan.reps?.results || []).forEach(it => {
    (it.books || []).forEach(b => {
      totalRepBooksCount += (b.items || []).length;
      (b.items || []).forEach(bi => {
        if (!firstRepBookId) firstRepBookId = bi.id;
        lastRepBookId = bi.id;
      });
    });
  });

  return `
    <div style="padding: 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 1200px; margin: 0 auto; background: white;">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px;">
        ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:55px;max-width:130px;margin:0 auto 6px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
        <h2 style="margin: 0; font-size: 18px; color: #1e293b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${esc(collegeName)}</h2>
        <h1 style="margin: 6px 0 0 0; font-size: 21px; color: #0f172a; font-weight: 800;">College Union Election ${year} — Ballot Printing Summary</h1>
        <div style="margin-top: 6px; font-size: 12px; color: #64748b; font-weight: 500;">
          Specification: <strong>${bookSize} Ballots per Book</strong> ${enableMerge ? '(Smart Remainder Merging ≤30% Active)' : '(Exact Split)'}
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 25px; font-size: 12.5px; line-height: 1.5; color: #334155;">
        This document provides the sequential serial number ranges and booklet packaging breakdown for printing press execution.
        ${isSplitPlan ? '<br><strong>Note:</strong> General Union posts are split into <strong>' + masterPlan.generalParts.length + ' separate ballot papers</strong> with distinct series numbering and booklet prefixes.' : ''}
      </div>

      <!-- Statutory Notice for Court Addendum / Reserves -->
      <div style="margin-bottom: 20px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; font-size: 11.5px; color: #92400e; line-height: 1.45;">
        <strong>⚖️ COURT ADDENDUM &amp; CONTINGENCY BALLOT PLANNING:</strong><br>
        This Master Ballot Plan accommodates 21 Ph.D. Research Scholars across the 5 department booths (Economics, Geography, Mathematics, Music, Tamil) as contingency allocations. 
        If the University formally decides to permit Research Scholars to vote, Presiding Officers issue these allocated ballot serials to verified scholars on the Court Addendum roll.
        If excluded by University decision, these extra ballots remain unissued and act as official <strong>Booth Reserve Ballots</strong> without disrupting standard serial numbers or packaging.
      </div>

      <!-- 1. General Ballots -->
      ${isSplitPlan ? `
        <!-- Split General Parts Tables -->
        ${masterPlan.generalParts.map((part, pIdx) => `
          <div style="margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; background: #f1f5f9; padding: 8px 14px; border-left: 5px solid #4f46e5; margin-bottom: 8px;">
              <h3 style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 700;">
                1.${pIdx + 1} ${esc(part.title)} (Series: ${part.shortCode}-1, ${part.shortCode}-2... / Books: ${part.bookPrefix}1...)
              </h3>
              <span style="font-size: 11px; color: #4f46e5; font-weight: 600;">Paper: ${esc(part.paperSize || 'A3')}</span>
            </div>
            <div style="font-size: 11px; margin-bottom: 8px; color: #64748b;">
              <strong>Included Posts:</strong> ${(part.posts || []).map(p => esc(p)).join(', ')}
            </div>
            <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; font-size: 11.5px;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1.5px solid #0f172a;">
                  <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; width: 14%;">Booth No</th>
                  <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 10%;">Voters</th>
                  <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 14%;">Sl No From</th>
                  <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 14%;">Sl No To</th>
                  <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; width: 48%;">Book Breakdowns</th>
                </tr>
              </thead>
              <tbody>
                ${part.results.map(s => `
                  <tr>
                    <td style="border: 1px solid #e2e8f0; padding: 7px 8px; font-weight: 600;">Booth ${s.booth}</td>
                    <td style="border: 1px solid #e2e8f0; padding: 7px 8px; text-align: center;">
                      ${s.count}
                      ${s.rsCount > 0 ? `<div style="font-size:9.5px; color:#d97706; font-weight:600;">(${s.regCount || (s.count - s.rsCount)} Reg + ${s.rsCount} RS)</div>` : ''}
                    </td>
                    <td style="border: 1px solid #e2e8f0; padding: 7px 8px; text-align: center; font-weight: bold; color: #1e293b;">${part.shortCode}-${s.start}</td>
                    <td style="border: 1px solid #e2e8f0; padding: 7px 8px; text-align: center; font-weight: bold; color: #1e293b;">${part.shortCode}-${s.end}</td>
                    <td style="border: 1px solid #e2e8f0; padding: 3px 6px;">
                      ${renderBooksHtml(s.books)}
                      ${s.rsCount > 0 ? `<div style="font-size:9.5px; color:#b45309; margin-top:2px;">⚖️ RS Reserve Range: <strong>${s.reserveSlipsRange}</strong></div>` : ''}
                    </td>
                  </tr>
                `).join('')}
                <tr style="background: #f1f5f9; font-weight: bold; border-top: 1.5px solid #0f172a;">
                  <td style="border: 1px solid #cbd5e1; padding: 8px;">TOTAL PART ${pIdx + 1}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${part.total}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${part.shortCode}-1</td>
                  <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${part.shortCode}-${part.total}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #64748b;">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        `).join('')}
      ` : `
        <!-- Single General Ballots Table -->
        <div style="margin-bottom: 30px;">
          <h3 style="background: #f1f5f9; padding: 8px 14px; border-left: 5px solid #4f46e5; margin: 0 0 10px 0; font-size: 14px; color: #0f172a; font-weight: 700;">
            1. General Union Ballots (Series: G1, G2, G3... / Books: GB1, GB2...)
          </h3>
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; font-size: 11.5px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1.5px solid #0f172a;">
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; width: 14%;">Booth No</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 10%;">Voters</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 14%;">Sl No From</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 14%;">Sl No To</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; width: 48%;">Book Breakdowns</th>
              </tr>
            </thead>
            <tbody>
              ${(masterPlan.general?.results || []).map(s => `
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 7px 8px; font-weight: 600;">Booth ${s.booth}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 7px 8px; text-align: center;">
                    ${s.count}
                    ${s.rsCount > 0 ? `<div style="font-size:9.5px; color:#d97706; font-weight:600;">(${s.regCount || (s.count - s.rsCount)} Reg + ${s.rsCount} RS)</div>` : ''}
                  </td>
                  <td style="border: 1px solid #e2e8f0; padding: 7px 8px; text-align: center; font-weight: bold; color: #1e293b;">G${s.start}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 7px 8px; text-align: center; font-weight: bold; color: #1e293b;">G${s.end}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 3px 6px;">
                    ${renderBooksHtml(s.books || s.bookHtml)}
                    ${s.rsCount > 0 ? `<div style="font-size:9.5px; color:#b45309; margin-top:2px;">⚖️ RS Reserve Range: <strong>${s.reserveSlipsRange}</strong></div>` : ''}
                  </td>
                </tr>
              `).join('')}
              <tr style="background: #f1f5f9; font-weight: bold; border-top: 1.5px solid #0f172a;">
                <td style="border: 1px solid #cbd5e1; padding: 8px;">TOTAL GENERAL</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${masterPlan.general?.total || 0}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">G1</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">G${masterPlan.general?.total || 0}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #64748b;">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      `}

      <!-- 2. Year Representative Ballots (Split into Cohort Tables) -->
      <div style="margin-top: 35px; margin-bottom: 30px;">
        <div style="background: #f1f5f9; padding: 8px 14px; border-left: 5px solid #10b981; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 700;">
            2. Year Representative Ballots (Series: R1, R2, R3... / Books: RB1, RB2...)
          </h3>
          <span style="font-size: 11px; color: #047857; font-weight: 600; background: #ecfdf5; padding: 3px 8px; border-radius: 4px; border: 1px solid #a7f3d0;">
            Separate Cohort Tables: I UG, II UG, III UG &amp; PG
          </span>
        </div>

        ${sortedCohorts.length === 0 ? `
          <div style="padding: 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; font-style: italic; color: #64748b; font-size: 12px; margin-bottom: 20px;">
            No contested Year Representative posts requiring printed ballot papers.
          </div>
        ` : `
          ${sortedCohorts.map((cGroup, cIdx) => {
            const cohortVoters = cGroup.items.reduce((sum, it) => sum + (it.count || 0), 0);
            const cMinStart = cGroup.items.length ? cGroup.items[0].start : '-';
            const cMaxEnd = cGroup.items.length ? cGroup.items[cGroup.items.length - 1].end : '-';

            // Gather book ids for this cohort
            const cBookIds = [];
            cGroup.items.forEach(it => {
              (it.books || []).forEach(b => {
                (b.items || []).forEach(bi => cBookIds.push(bi.id));
              });
            });
            const cBookSummary = cBookIds.length > 0 
              ? `${cBookIds.length} Books (${cBookIds[0]}${cBookIds.length > 1 ? ' to ' + cBookIds[cBookIds.length - 1] : ''})`
              : '—';

            return `
              <div style="margin-bottom: 25px; break-inside: avoid;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <h4 style="margin: 0; font-size: 13px; color: #0f172a; font-weight: 700;">
                    2.${cIdx + 1} ${esc(cGroup.cohort.title)} Ballots
                  </h4>
                  <span style="font-size: 11px; color: #047857; font-weight: 600;">
                    Serial: R${cMinStart} to R${cMaxEnd} | ${cBookSummary}
                  </span>
                </div>
                <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; font-size: 11.5px;">
                  <thead>
                    <tr style="background: #f8fafc; border-bottom: 1.5px solid #0f172a;">
                      <th style="border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; width: 14%;">Booth No</th>
                      <th style="border: 1px solid #cbd5e1; padding: 7px 8px; text-align: center; width: 10%;">Voters</th>
                      <th style="border: 1px solid #cbd5e1; padding: 7px 8px; text-align: center; width: 14%;">Sl No From</th>
                      <th style="border: 1px solid #cbd5e1; padding: 7px 8px; text-align: center; width: 14%;">Sl No To</th>
                      <th style="border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; width: 48%;">Book Breakdowns</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${cGroup.items.map(s => `
                      <tr>
                        <td style="border: 1px solid #e2e8f0; padding: 6px 8px; font-weight: 600;">Booth ${s.booth}</td>
                        <td style="border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center;">${s.count}</td>
                        <td style="border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center; font-weight: bold; color: #1e293b;">R${s.start}</td>
                        <td style="border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center; font-weight: bold; color: #1e293b;">R${s.end}</td>
                        <td style="border: 1px solid #e2e8f0; padding: 3px 6px;">${renderBooksHtml(s.books || s.bookHtml)}</td>
                      </tr>
                    `).join('')}
                    <tr style="background: #f1f5f9; font-weight: bold; border-top: 1.5px solid #0f172a;">
                      <td style="border: 1px solid #cbd5e1; padding: 7px 8px;">SUBTOTAL ${esc(cGroup.cohort.short.toUpperCase())}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 7px 8px; text-align: center;">${cohortVoters}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 7px 8px; text-align: center;">R${cMinStart}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 7px 8px; text-align: center;">R${cMaxEnd}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 7px 8px; font-weight: 600; color: #047857;">${cBookSummary}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `;
          }).join('')}

          <!-- Grand Total for Year Representatives -->
          <div style="background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 6px; padding: 10px 16px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold; color: #065f46;">
            <span>TOTAL ALL YEAR REPRESENTATIVES (I UG + II UG + III UG + PG)</span>
            <span>Voters: ${masterPlan.reps?.total || 0} (R1 to R${masterPlan.reps?.total || 0})</span>
            <span>Total Packaging: ${totalRepBooksCount} Books (${firstRepBookId || '-'} to ${lastRepBookId || '-'})</span>
          </div>
        `}
      </div>

      <!-- 3. Association Secretary Ballots -->
      <div style="margin-top: 35px; margin-bottom: 30px;">
        <h3 style="background: #f1f5f9; padding: 8px 14px; border-left: 5px solid #f59e0b; margin: 0 0 10px 0; font-size: 14px; color: #0f172a; font-weight: 700;">
          3. Departmental Association Secretary Ballots (Series: A1, A2, A3... / Books: AB1, AB2...)
        </h3>
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; font-size: 11.5px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1.5px solid #0f172a;">
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; width: 25%;">Association Post</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 9%;">Booth</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 9%;">Voters</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 13%;">From</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 13%;">To</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; width: 31%;">Book Breakdowns</th>
            </tr>
          </thead>
          <tbody>
            ${(masterPlan.assocs?.results || []).slice().sort((a, b) => String(a.post || '').localeCompare(String(b.post || ''))).map(s => `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 6px 8px; font-weight: 600;">${esc(s.post)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center;">Booth ${s.booth}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center;">
                  ${s.count}
                  ${s.rsCount > 0 ? `<div style="font-size:9.5px; color:#d97706; font-weight:600;">(${s.regCount || (s.count - s.rsCount)} Reg + ${s.rsCount} RS)</div>` : ''}
                </td>
                <td style="border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center; font-weight: bold; color: #1e293b;">A${s.start}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center; font-weight: bold; color: #1e293b;">A${s.end}</td>
                <td style="border: 1px solid #e2e8f0; padding: 3px 6px;">
                  ${renderBooksHtml(s.books || s.bookHtml)}
                  ${s.rsCount > 0 ? `<div style="font-size:9.5px; color:#b45309; margin-top:2px;">⚖️ RS Reserve Range: <strong>${s.reserveSlipsRange}</strong></div>` : ''}
                </td>
              </tr>
            `).join('')}
            <tr style="background: #f1f5f9; font-weight: bold; border-top: 1.5px solid #0f172a;">
              <td colspan="2" style="border: 1px solid #cbd5e1; padding: 8px;">TOTAL ASSOCIATION</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${masterPlan.assocs?.total || 0}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">A1</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">A${masterPlan.assocs?.total || 0}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #64748b;">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Signatures -->
      <div style="margin-top: 60px; display: flex; justify-content: space-between; padding: 0 30px; font-size: 12px; color: #0f172a;">
        <div style="text-align: center;">
          <div style="width: 180px; border-top: 1.5px solid #0f172a; margin-bottom: 5px;"></div>
          <strong>Returning Officer</strong><br>
          <span style="font-size: 11px; color: #64748b;">College Union Election</span>
        </div>
        <div style="text-align: center;">
          <div style="width: 180px; border-top: 1.5px solid #0f172a; margin-bottom: 5px;"></div>
          <strong>Principal / Patron</strong><br>
          <span style="font-size: 11px; color: #64748b;">${esc(collegeName)}</span>
        </div>
        <div style="text-align: center;">
          <div style="width: 180px; border-top: 1.5px solid #0f172a; margin-bottom: 5px;"></div>
          <strong>Printing Press Acknowledgement</strong><br>
          <span style="font-size: 11px; color: #64748b;">Signature &amp; Seal</span>
        </div>
      </div>

      <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center;">
        Generated on ${new Date().toLocaleString()} | Official ${esc(collegeName)} Election Portal
      </div>
    </div>
  `;
}

export function buildBallotPressSummaryHtml(masterPlan, settings = {}, schedule = {}, defaultBookSize = 50, defaultMerge = true) {
  const activeBookSize = Number(defaultBookSize) > 0 ? Number(defaultBookSize) : 50;
  const activePlan = recalculateBallotPlanBooks(masterPlan, activeBookSize, defaultMerge);
  const initialContent = buildSummaryContentHtml(activePlan, settings, schedule, activeBookSize, defaultMerge);

  return `
    <div style="min-height: 100vh; background: #f8fafc;">
      <!-- Official Printing Press Status & Action Bar (Hidden on Print) -->
      <div class="no-print" style="position: sticky; top: 0; z-index: 9999; background: #0f172a; color: #f8fafc; padding: 12px 24px; box-shadow: 0 4px 18px rgba(0,0,0,0.4); border-bottom: 2px solid #6366f1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px;">
          
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4); display: flex; align-items: center; justify-content: center; font-size: 20px;">
              📑
            </div>
            <div>
              <div style="font-weight: 800; font-size: 13.5px; color: #ffffff; letter-spacing: 0.3px;">Official Printing Press Summary &amp; Serial Ledger</div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; margin-top: 3px;">
                <span style="background: rgba(99,102,241,0.25); color: #c7d2fe; padding: 2px 9px; border-radius: 4px; font-weight: 700; border: 1px solid rgba(99,102,241,0.4);">
                  📦 Stitched Booklets: ${activeBookSize} Ballots / Book
                </span>
                <span style="background: rgba(16,185,129,0.2); color: #a7f3d0; padding: 2px 9px; border-radius: 4px; font-weight: 600; border: 1px solid rgba(16,185,129,0.3);">
                  ${defaultMerge ? '✔ Smart Remainder Merge (≤30%) Active' : 'Strict Size Partition'}
                </span>
                <span style="color: #94a3b8; font-size: 10.5px;">(Saved in Master Ballot Plan)</span>
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <!-- Print Button -->
            <button id="btnToolbarPrint" onclick="window.print()" style="background: #4f46e5; color: #ffffff; border: none; padding: 8px 18px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.4);">
              <span>🖨️</span> Print / Save PDF
            </button>

            <!-- Excel Export Button -->
            <button id="btnToolbarExcel" onclick="if (window.opener && window.opener.gccDownloadBallotsExcel) { window.opener.gccDownloadBallotsExcel('summary'); } else { alert('Please use the Download Excel option in the main Ballot Printing dashboard.'); }" style="background: #059669; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.4);">
              <span>📊</span> Download Excel
            </button>

            <!-- Close Window Button -->
            <button onclick="window.close()" style="background: #334155; color: #cbd5e1; border: 1px solid #475569; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
              ✕ Close
            </button>
          </div>
        </div>
      </div>

      <!-- Report Tables Container -->
      <div id="reportTablesContainer">
        ${initialContent}
      </div>
    </div>

    <script>
      (function() {
        var btnPrint = document.getElementById("btnToolbarPrint");
        if (btnPrint) {
          btnPrint.onclick = function() { window.print(); };
        }
      })();
    </script>
  `;
}

export async function generateAndPrintBallotPressSummary(pwd, customBookSize = null, customMerge = null) {
  try {
    const savedSize = parseInt(localStorage.getItem('gcc_ballot_book_size') || '50', 10);
    const savedMerge = localStorage.getItem('gcc_ballot_merge_remainders') !== 'false';
    const bookSize = customBookSize || savedSize || 50;
    const mergeRemainders = customMerge !== null ? customMerge : savedMerge;

    showToast(`Calculating Master Plan (${bookSize} ballots/book)...`, 'info');
    const [schedule, settings] = await Promise.all([
      api.getPublicSchedule(),
      api.adminGetSettings(pwd).catch(() => ({}))
    ]);
    
    // Generate or refresh Master Plan with requested book size and merge setting
    const genRes = await api.adminGenerateBallotPlan(pwd, { bookSize, mergeRemainders }).catch(() => null);
    let masterPlan = genRes?.plan || await api.adminGetBallotPlan(pwd).catch(() => null);

    if (!masterPlan) {
      throw new Error('Master Ballot Plan could not be generated. Please ensure nominations and booths are configured.');
    }

    const reportHtml = buildBallotPressSummaryHtml(masterPlan, settings, schedule, bookSize, mergeRemainders);
    triggerBallotPrint(reportHtml, 'Ballot Printing Summary - College Union Election');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

