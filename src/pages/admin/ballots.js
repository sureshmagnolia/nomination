/**
 * ballots.js
 * Professional ballot printing for General (Single A3 or Split Parts), Year Rep (A5), and Association (A5) posts.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';
import { CONFIG } from '../../config.js';

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
    posts = fetchedPosts;
    ballotConfig = fetchedConfig;
    plan = fetchedPlan;
  } catch (err) {
    console.warn('Error fetching initial ballot data:', err);
  }

  const isAssoc = (p) => {
    const name = String(p.post || p.name || '').toUpperCase();
    return name.includes('ASSOCIATION') || name.includes('ASSOC') || !!p.deptRestriction;
  };
  const isUUC = (p) => {
    const name = String(p.post || p.name || '').toUpperCase();
    return name.includes('UUC') || name.includes('UNIVERSITY UNION COUNCILLOR');
  };
  const isYear = (p) => {
    if (isAssoc(p) || isUUC(p)) return false;
    const name = String(p.post || p.name || '').toUpperCase();
    return name.includes('REPRESENTATIVE') || name.includes('REP');
  };
  const isGeneral = (p) => !isAssoc(p) && !isYear(p);

  const generalPosts = posts.filter(isGeneral);

  // Default 2-way split preset if not configured
  const defaultSplitBallots = [
    {
      id: 'gen_1',
      partNumber: 1,
      title: 'General Union Posts - Part 1 (Major Executive)',
      shortCode: 'G1',
      bookPrefix: 'GB1-',
      paperSize: 'A3',
      posts: [
        'The Chairman',
        'The Vice Chairman',
        'The Secretary',
        'The Joint Secretary',
        'The University Union Councillor'
      ]
    },
    {
      id: 'gen_2',
      partNumber: 2,
      title: 'General Union Posts - Part 2 (Arts, Sports & Editorial)',
      shortCode: 'G2',
      bookPrefix: 'GB2-',
      paperSize: 'A3',
      posts: [
        'The Chief Student Editor',
        'The Secretary Fine Arts',
        'The General Captain For Sports And Games'
      ]
    }
  ];

  let currentConfig = ballotConfig || {
    isSplit: false,
    ballots: defaultSplitBallots
  };

  if (!Array.isArray(currentConfig.ballots) || currentConfig.ballots.length === 0) {
    currentConfig.ballots = defaultSplitBallots;
  }

  const renderUI = () => {
    const isSplit = !!currentConfig.isSplit;

    main.innerHTML = `
      <div class="space-y-6 page-enter">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
          <div>
            <h2 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">🗳️</span>
              Ballot Planning & Printing
            </h2>
            <p class="text-slate-400 mt-1 text-sm">
              Configure ballot layout, split general posts if needed, and generate print-ready ballots & PO accounts.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button id="btnRegenPlanTop" class="btn btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500 hover:text-white">
              🔄 Finalize Master Plan
            </button>
          </div>
        </div>

        <!-- Ballot Planning & Post Split Panel -->
        <div class="glass p-6 rounded-2xl border border-white/10 space-y-5 bg-gradient-to-b from-indigo-950/20 to-transparent">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span>⚙️</span> General Ballot Layout &amp; Post Splitter
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">
                Keep all general posts on a single A3 master ballot or split into separate numbered ballots (e.g. Executive and Arts/Sports).
              </p>
            </div>
            
            <!-- Mode Switcher -->
            <div class="flex items-center bg-slate-900/80 p-1.5 rounded-xl border border-white/10 text-xs font-medium">
              <button id="btnModeSingle" class="px-4 py-2 rounded-lg transition-all ${!isSplit ? 'bg-indigo-600 text-white shadow-lg font-bold' : 'text-slate-400 hover:text-white'}">
                📄 Single Unified Ballot
              </button>
              <button id="btnModeSplit" class="px-4 py-2 rounded-lg transition-all ${isSplit ? 'bg-indigo-600 text-white shadow-lg font-bold' : 'text-slate-400 hover:text-white'}">
                🔀 Split into Multiple Ballots
              </button>
            </div>
          </div>

          ${isSplit ? `
            <!-- Split Configuration Controls -->
            <div class="space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div class="flex items-center gap-2">
                  <span class="text-slate-400">Quick Presets:</span>
                  <button id="btnPresetExec" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-300 transition-all">
                    ⚡ Executive + Activities Split
                  </button>
                  <button id="btnPreset3Way" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-300 transition-all">
                    ⚡ 3-Way Split (Exec / Council / Sports)
                  </button>
                </div>
                <button id="btnAddPart" class="btn btn-secondary py-1.5 px-3 text-xs border-dashed border-white/20 text-slate-300 hover:text-white hover:border-indigo-400">
                  ➕ Add Additional Ballot Part
                </button>
              </div>

              <!-- Parts Grid -->
              <div class="grid grid-cols-1 lg:grid-cols-${Math.min(currentConfig.ballots.length, 3)} gap-4" id="partsGrid">
                ${currentConfig.ballots.map((part, pIdx) => `
                  <div class="bg-slate-900/60 p-4 rounded-xl border border-indigo-500/20 space-y-3 relative group" data-part-index="${pIdx}">
                    <div class="flex justify-between items-center">
                      <span class="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase tracking-wider">
                        Part ${pIdx + 1} (${esc(part.shortCode || 'G' + (pIdx + 1))})
                      </span>
                      ${currentConfig.ballots.length > 2 ? `
                        <button class="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 rounded hover:bg-red-500/10 btn-remove-part" data-part-index="${pIdx}" title="Remove Part">
                          ✕ Remove
                        </button>
                      ` : ''}
                    </div>

                    <div class="space-y-2">
                      <div>
                        <label class="text-[11px] font-semibold text-slate-400 block mb-1">Ballot Title (Printed on Paper):</label>
                        <input type="text" class="input input-sm w-full bg-slate-800/80 border-white/10 text-xs text-white part-title-input" data-part-index="${pIdx}" value="${esc(part.title)}" placeholder="e.g. General Union - Part 1" />
                      </div>

                      <div class="grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <label class="text-slate-400 block mb-0.5">Series Code</label>
                          <input type="text" class="input input-sm w-full bg-slate-800/80 border-white/10 text-xs text-white font-mono part-code-input" data-part-index="${pIdx}" value="${esc(part.shortCode || 'G' + (pIdx + 1))}" placeholder="G1" />
                        </div>
                        <div>
                          <label class="text-slate-400 block mb-0.5">Book Prefix</label>
                          <input type="text" class="input input-sm w-full bg-slate-800/80 border-white/10 text-xs text-white font-mono part-book-input" data-part-index="${pIdx}" value="${esc(part.bookPrefix || 'GB' + (pIdx + 1) + '-')}" placeholder="GB1-" />
                        </div>
                        <div>
                          <label class="text-slate-400 block mb-0.5">Paper Size</label>
                          <select class="input input-sm w-full bg-slate-800/80 border-white/10 text-xs text-white part-size-select" data-part-index="${pIdx}">
                            <option value="A3" ${part.paperSize === 'A3' ? 'selected' : ''}>A3 (2-Col)</option>
                            <option value="A4" ${part.paperSize === 'A4' ? 'selected' : ''}>A4 Sheet</option>
                            <option value="A5" ${part.paperSize === 'A5' ? 'selected' : ''}>A5 Sheet</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <!-- Assigned Posts List -->
                    <div class="pt-2 border-t border-white/5 space-y-1.5">
                      <label class="text-[11px] font-semibold text-slate-400 block">Assigned Posts (${part.posts ? part.posts.length : 0}):</label>
                      <div class="space-y-1 max-h-48 overflow-y-auto pr-1">
                        ${(part.posts || []).map(postName => `
                          <div class="flex items-center justify-between p-2 rounded bg-slate-800/60 border border-white/5 text-xs">
                            <span class="text-slate-200 font-medium truncate" title="${esc(postName)}">${esc(postName)}</span>
                            <select class="bg-slate-900 border border-white/10 text-[10px] text-slate-300 rounded px-1.5 py-0.5 move-post-select" data-post="${esc(postName)}" data-from-part="${pIdx}">
                              ${currentConfig.ballots.map((targetPart, tIdx) => `
                                <option value="${tIdx}" ${tIdx === pIdx ? 'selected' : ''}>Part ${tIdx + 1}</option>
                              `).join('')}
                            </select>
                          </div>
                        `).join('')}
                        ${(!part.posts || part.posts.length === 0) ? `
                          <div class="text-[11px] text-amber-400/80 italic p-2 text-center bg-amber-500/5 rounded">
                            No posts assigned. Move posts here from other parts.
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- Unassigned Posts Warning if any -->
              ${(() => {
                const assigned = new Set();
                currentConfig.ballots.forEach(b => (b.posts || []).forEach(p => assigned.add(p)));
                const unassigned = generalPosts.filter(p => !assigned.has(p.post));
                if (unassigned.length === 0) return '';
                return `
                  <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                    <div>
                      <strong>⚠️ Unassigned General Posts (${unassigned.length}):</strong> ${unassigned.map(p => esc(p.post)).join(', ')}
                    </div>
                    <button id="btnAutoAssign" class="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold text-[11px]">
                      Assign to Part 1
                    </button>
                  </div>
                `;
              })()}

              <div class="flex justify-end pt-2">
                <button id="btnSaveConfig" class="btn btn-primary py-2.5 px-6 text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                  💾 Save Structure &amp; Finalize Master Plan
                </button>
              </div>
            </div>
          ` : `
            <!-- Single Mode Summary -->
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-white/5">
              <div class="space-y-1">
                <div class="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span>📄</span> All ${generalPosts.length} General Union Posts are printed on a single <strong>A3 Master Ballot Sheet</strong>.
                </div>
                <div class="text-xs text-slate-400">
                  Continuous sequential numbering: <code>G1, G2, G3...</code> | Standard 50-slip booklets: <code>GB1, GB2...</code>
                </div>
              </div>
              <button id="btnSaveConfig" class="btn btn-secondary py-2 px-4 text-xs whitespace-nowrap border-indigo-500/30 text-indigo-300 hover:bg-indigo-500 hover:text-white">
                💾 Confirm Single Mode &amp; Finalize
              </button>
            </div>
          `}
        </div>

        <!-- Ballot Generation Action Cards -->
        <div>
          <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>🖨️</span> Official Ballot Generation
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-${isSplit ? '4' : '4'} gap-6">
            ${isSplit ? `
              <!-- Split General Ballots Cards -->
              ${currentConfig.ballots.map((part, pIdx) => `
                <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-indigo-500/50 transition-all">
                  <div class="text-indigo-400 font-bold flex items-center justify-between">
                    <span class="flex items-center gap-2"><span>🏆</span> Part ${pIdx + 1} (${esc(part.shortCode || 'G' + (pIdx + 1))})</span>
                    <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">${part.paperSize || 'A3'}</span>
                  </div>
                  <p class="text-xs text-slate-400 leading-relaxed truncate" title="${esc(part.title)}">
                    ${esc(part.title)}
                  </p>
                  <div class="text-[11px] text-slate-500">
                    ${(part.posts || []).length} Posts (${esc(part.posts ? part.posts.slice(0, 2).join(', ') + (part.posts.length > 2 ? '...' : '') : 'None')})
                  </div>
                  <button data-type="general_part:${part.id || 'gen_' + (pIdx + 1)}" class="btn btn-primary w-full py-2.5 text-xs preview-btn">
                    🖨️ Generate Part ${pIdx + 1}
                  </button>
                </div>
              `).join('')}

              <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-indigo-500/50 transition-all bg-indigo-500/5">
                <div class="text-indigo-300 font-bold flex items-center gap-2">
                  <span>📑</span> All General Ballots
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Batch generates all ${currentConfig.ballots.length} General Ballot parts in sequence with page breaks.
                </p>
                <div class="text-[11px] text-indigo-400/80">
                  Combined print run for press
                </div>
                <button data-type="general" class="btn btn-secondary w-full py-2.5 text-xs border-indigo-500/30 text-indigo-200 hover:bg-indigo-600 hover:text-white preview-btn">
                  🖨️ Generate All Parts
                </button>
              </div>
            ` : `
              <!-- Single General Ballot Card -->
              <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-indigo-500/50 transition-all">
                <div class="text-indigo-400 font-bold flex items-center gap-2">
                  <span>🏆</span> General Union (A3)
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  All executive union posts in 2 columns. Designed for A3 paper. Chairman &amp; Vice Chairman on top.
                </p>
                <button data-type="general" class="btn btn-primary w-full py-3 preview-btn">🖨️ Generate General Ballot</button>
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
              <button data-type="year" class="btn btn-primary w-full py-3 preview-btn">🖨️ Generate Year Reps</button>
            </div>

            <!-- Association Reps -->
            <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-amber-500/50 transition-all">
              <div class="text-amber-400 font-bold flex items-center gap-2">
                <span>🤝</span> Association Reps (A5)
              </div>
              <p class="text-xs text-slate-400 leading-relaxed">
                Departmental Association Secretaries. Designed for A5 paper (one post per page).
              </p>
              <button data-type="assoc" class="btn btn-primary w-full py-3 preview-btn">🖨️ Generate Associations</button>
            </div>

            <!-- Summary Report -->
            <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-purple-500/50 transition-all bg-purple-500/5">
              <div class="text-purple-400 font-bold flex items-center gap-2">
                <span>📊</span> Printing Summary
              </div>
              <p class="text-xs text-slate-400 leading-relaxed">
                Detailed serial number ranges, part splits, and book counts for the printing company.
              </p>
              <button id="btnGenSummary" class="btn btn-secondary w-full py-3 border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white">📑 View Summary Report</button>
            </div>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    // Mode toggles
    const btnModeSingle = main.querySelector('#btnModeSingle');
    const btnModeSplit = main.querySelector('#btnModeSplit');

    if (btnModeSingle) {
      btnModeSingle.onclick = () => {
        currentConfig.isSplit = false;
        renderUI();
      };
    }
    if (btnModeSplit) {
      btnModeSplit.onclick = () => {
        currentConfig.isSplit = true;
        renderUI();
      };
    }

    // Presets
    const btnPresetExec = main.querySelector('#btnPresetExec');
    if (btnPresetExec) {
      btnPresetExec.onclick = () => {
        currentConfig.isSplit = true;
        currentConfig.ballots = [
          {
            id: 'gen_1',
            partNumber: 1,
            title: 'General Union Posts - Part 1 (Major Executive)',
            shortCode: 'G1',
            bookPrefix: 'GB1-',
            paperSize: 'A3',
            posts: [
              'The Chairman',
              'The Vice Chairman',
              'The Secretary',
              'The Joint Secretary',
              'The University Union Councillor'
            ]
          },
          {
            id: 'gen_2',
            partNumber: 2,
            title: 'General Union Posts - Part 2 (Arts, Sports & Editorial)',
            shortCode: 'G2',
            bookPrefix: 'GB2-',
            paperSize: 'A3',
            posts: [
              'The Chief Student Editor',
              'The Secretary Fine Arts',
              'The General Captain For Sports And Games'
            ]
          }
        ];
        renderUI();
        showToast('Applied Executive + Activities Split Preset', 'info');
      };
    }

    const btnPreset3Way = main.querySelector('#btnPreset3Way');
    if (btnPreset3Way) {
      btnPreset3Way.onclick = () => {
        currentConfig.isSplit = true;
        currentConfig.ballots = [
          {
            id: 'gen_1',
            partNumber: 1,
            title: 'General Union Posts - Part 1 (Executive Officers)',
            shortCode: 'G1',
            bookPrefix: 'GB1-',
            paperSize: 'A4',
            posts: ['The Chairman', 'The Vice Chairman', 'The Secretary', 'The Joint Secretary']
          },
          {
            id: 'gen_2',
            partNumber: 2,
            title: 'General Union Posts - Part 2 (University Councillors)',
            shortCode: 'G2',
            bookPrefix: 'GB2-',
            paperSize: 'A4',
            posts: ['The University Union Councillor']
          },
          {
            id: 'gen_3',
            partNumber: 3,
            title: 'General Union Posts - Part 3 (Arts, Sports & Editor)',
            shortCode: 'G3',
            bookPrefix: 'GB3-',
            paperSize: 'A4',
            posts: ['The Chief Student Editor', 'The Secretary Fine Arts', 'The General Captain For Sports And Games']
          }
        ];
        renderUI();
        showToast('Applied 3-Way Split Preset', 'info');
      };
    }

    // Add Part
    const btnAddPart = main.querySelector('#btnAddPart');
    if (btnAddPart) {
      btnAddPart.onclick = () => {
        const nextNum = currentConfig.ballots.length + 1;
        currentConfig.ballots.push({
          id: `gen_${nextNum}`,
          partNumber: nextNum,
          title: `General Union Posts - Part ${nextNum}`,
          shortCode: `G${nextNum}`,
          bookPrefix: `GB${nextNum}-`,
          paperSize: 'A3',
          posts: []
        });
        renderUI();
      };
    }

    // Remove Part
    main.querySelectorAll('.btn-remove-part').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.partIndex, 10);
        if (currentConfig.ballots.length <= 2) {
          showToast('At least 2 parts are required for split mode. To keep all in one, switch to Single Unified Ballot.', 'warning');
          return;
        }
        const removed = currentConfig.ballots.splice(idx, 1)[0];
        // Reallocate removed posts to part 0
        if (removed && removed.posts && removed.posts.length > 0) {
          currentConfig.ballots[0].posts.push(...removed.posts);
        }
        // Renumber parts
        currentConfig.ballots.forEach((b, i) => {
          b.partNumber = i + 1;
        });
        renderUI();
      };
    });

    // Inputs inside part cards
    main.querySelectorAll('.part-title-input').forEach(inp => {
      inp.onchange = () => {
        const idx = parseInt(inp.dataset.partIndex, 10);
        if (currentConfig.ballots[idx]) currentConfig.ballots[idx].title = inp.value.trim();
      };
    });

    main.querySelectorAll('.part-code-input').forEach(inp => {
      inp.onchange = () => {
        const idx = parseInt(inp.dataset.partIndex, 10);
        if (currentConfig.ballots[idx]) currentConfig.ballots[idx].shortCode = inp.value.trim().toUpperCase();
      };
    });

    main.querySelectorAll('.part-book-input').forEach(inp => {
      inp.onchange = () => {
        const idx = parseInt(inp.dataset.partIndex, 10);
        if (currentConfig.ballots[idx]) currentConfig.ballots[idx].bookPrefix = inp.value.trim().toUpperCase();
      };
    });

    main.querySelectorAll('.part-size-select').forEach(sel => {
      sel.onchange = () => {
        const idx = parseInt(sel.dataset.partIndex, 10);
        if (currentConfig.ballots[idx]) currentConfig.ballots[idx].paperSize = sel.value;
      };
    });

    // Move post between parts
    main.querySelectorAll('.move-post-select').forEach(sel => {
      sel.onchange = () => {
        const postName = sel.dataset.post;
        const fromIdx = parseInt(sel.dataset.fromPart, 10);
        const toIdx = parseInt(sel.value, 10);
        if (fromIdx === toIdx) return;

        // Remove from fromIdx
        currentConfig.ballots[fromIdx].posts = currentConfig.ballots[fromIdx].posts.filter(p => p !== postName);
        // Add to toIdx
        if (!currentConfig.ballots[toIdx].posts.includes(postName)) {
          currentConfig.ballots[toIdx].posts.push(postName);
        }
        renderUI();
      };
    });

    // Auto assign unassigned posts
    const btnAutoAssign = main.querySelector('#btnAutoAssign');
    if (btnAutoAssign) {
      btnAutoAssign.onclick = () => {
        const assigned = new Set();
        currentConfig.ballots.forEach(b => (b.posts || []).forEach(p => assigned.add(p)));
        generalPosts.forEach(p => {
          if (!assigned.has(p.post)) {
            currentConfig.ballots[0].posts.push(p.post);
            assigned.add(p.post);
          }
        });
        renderUI();
      };
    }

    // Save configuration and finalize plan
    main.querySelectorAll('#btnSaveConfig').forEach(btn => {
      btn.onclick = async () => {
        const defaultText = btn.innerHTML;
        try {
          setLoading(btn, true, defaultText);
          showToast('Saving ballot structure & regenerating plan...', 'info');
          await api.adminSaveBallotConfig(pwd, currentConfig);
          const res = await api.adminGenerateBallotPlan(pwd);
          plan = res.plan;
          showToast('Ballot structure saved & Master Plan finalized!', 'success');
          renderUI();
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error');
        } finally {
          setLoading(btn, false, defaultText);
        }
      };
    });

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
      btnGenSummary.onclick = handleSummaryReport;
    }

    // Print Preview buttons
    main.querySelectorAll('.preview-btn').forEach(btn => {
      btn.onclick = () => handlePreview(btn.dataset.type);
    });
  };

  const triggerPrint = (html) => {
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html>
        <head>
          <title>Official Ballots - ${CONFIG.COLLEGE_SHORT_NAME} Election</title>
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

  const generateBallotsHTML = async (filterType = 'all') => {
    let postsData, candidatesResponse, schedule, settings;
    try {
      [postsData, candidatesResponse, schedule, settings] = await Promise.all([
        api.adminGetPosts(pwd),
        api.adminGetFinalNominations(pwd).catch(async () => {
          const all = await api.adminGetNominations(pwd).catch(() => []);
          return {
            active: all.filter(n => n.status !== 'Rejected' && n.withdrawalStatus !== 'Approved'),
            withdrawn: all.filter(n => n.withdrawalStatus === 'Approved'),
            isPublished: false
          };
        }),
        api.getPublicSchedule(),
        api.adminGetSettings(pwd).catch(() => ({}))
      ]);
    } catch (err) {
      throw new Error(err.message.includes('not published') 
        ? 'Final List Not Published. Please finalize and publish the list first.' 
        : err.message);
    }

    const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;
    const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;

    const year = schedule.electionYear || new Date().getFullYear().toString();
    const candidates = Array.isArray(candidatesResponse) ? candidatesResponse : (candidatesResponse?.active || []);
    if (candidates.length === 0) throw new Error('No active candidates found. Please ensure candidates are nominated and verified.');

    // Contestable Posts
    const contestablePosts = postsData.filter(p => {
      const pCands = candidates.filter(c => c.post === p.post);
      return pCands.length > 1;
    });

    const isSplit = !!currentConfig.isSplit;
    let html = '';

    // Render a General Ballot Part
    const renderGeneralBallotPart = (partConfig, partPosts) => {
      if (!partPosts || partPosts.length === 0) return '';
      const paperClass = (partConfig.paperSize || 'A3').toLowerCase();
      const prefix = partConfig.shortCode === 'G' ? 'G' : (partConfig.shortCode || 'G1') + '-';
      const partTitle = partConfig.title || 'OFFICIAL BALLOT PAPER (GENERAL)';

      const sorted = [...partPosts].sort((a, b) => {
        const aL = a.post.toLowerCase(), bL = b.post.toLowerCase();
        if (aL.includes('chairman') && !aL.includes('vice')) return -1;
        if (bL.includes('chairman') && !bL.includes('vice')) return 1;
        if (aL.includes('vice chairman')) return -1;
        if (bL.includes('vice chairman')) return 1;
        if (aL.includes('university union councillor') || aL.includes('uuc')) return 1;
        if (bL.includes('university union councillor') || bL.includes('uuc')) return -1;
        return 0;
      });

      let col1Html = '', col2Html = '';
      sorted.forEach((p, idx) => {
        const pCands = candidates.filter(c => c.post === p.post);
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
            <h1 style="font-size: 15px; margin: 0;">COLLEGE UNION ELECTION ${year}</h1>
            <h1 style="font-size: 17px; margin: 4px 0;">${esc(collegeName)}</h1>
            <h2 style="font-size: 13px; margin: 0;">${esc(partTitle.toUpperCase())} - COUNTERFOIL</h2>
            <div style="margin-top: 12px; font-weight: bold; text-align: left; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between;">
                <span>SL.NO. ${prefix}____________</span>
                <span style="font-size: 10px; color: #666; font-style: italic;">(To be detached before voting)</span>
              </div>
              <div style="font-size: 12px;">Sl. No of Voter in Marked Copy: ____________</div>
            </div>
          </div>

          <div class="ballot-header">
            <h1>COLLEGE UNION ELECTION ${year}</h1>
            <h1>${esc(collegeName)}</h1>
            <h2>${esc(partTitle.toUpperCase())}</h2>
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
      const gPosts = contestablePosts.filter(isGeneral);

      if (isSplit) {
        let partsToGenerate = currentConfig.ballots;
        if (filterType.startsWith('general_part:')) {
          const targetId = filterType.replace('general_part:', '');
          partsToGenerate = currentConfig.ballots.filter(b => b.id === targetId);
        }

        partsToGenerate.forEach(partConfig => {
          const partPosts = gPosts.filter(p => (partConfig.posts || []).includes(p.post));
          html += renderGeneralBallotPart(partConfig, partPosts);
        });
      } else {
        // Single unified A3 ballot
        const singleConfig = {
          title: 'OFFICIAL BALLOT PAPER (GENERAL)',
          shortCode: 'G',
          paperSize: 'A3'
        };
        html += renderGeneralBallotPart(singleConfig, gPosts);
      }
    }

    // 2. Year Rep & Association Ballots (A5, One post per page)
    const otherPosts = contestablePosts.filter(p => isYear(p) || isAssoc(p));
    if (filterType === 'all' || filterType === 'year' || filterType === 'assoc') {
      const filteredOthers = otherPosts.filter(p => 
        (filterType === 'all') || 
        (filterType === 'year' && isYear(p)) || 
        (filterType === 'assoc' && isAssoc(p))
      );

      filteredOthers.forEach(p => {
        const pCands = candidates.filter(c => c.post === p.post);
        const prefix = isYear(p) ? 'R' : 'A';
        html += `
          <div class="ballot-container a5 page-break">
            <!-- Counterfoil -->
            <div style="border-bottom: 2px dotted #000; padding-bottom: 15px; margin-bottom: 20px; text-align: center;">
              <h1 style="font-size: 14px; margin: 0;">${esc(shortName)} ELECTION ${year}</h1>
              <h2 style="font-size: 12px; margin: 2px 0;">OFFICIAL BALLOT (${prefix}) - COUNTERFOIL</h2>
              <div style="margin-top: 10px; font-weight: bold; text-align: left; display: flex; flex-direction: column; gap: 5px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between;">
                  <span>SL.NO. ${prefix}____________</span>
                  <span style="font-size: 9px; color: #666; font-style: italic;">(To be detached)</span>
                </div>
                <div>Sl. No of Voter in Marked Copy: ____________</div>
              </div>
            </div>

            <div class="ballot-header">
              <h1>${esc(shortName)} ELECTION ${year}</h1>
              <h2 style="font-size: 15px; margin-top: 5px; font-weight: bold;">BALLOT PAPER (${prefix})</h2>
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
  };

  const handlePreview = async (type) => {
    try {
      showToast('Generating ballots...', 'info');
      const html = await generateBallotsHTML(type);
      triggerPrint(html);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSummaryReport = async () => {
    try {
      showToast('Calculating Master Plan...', 'info');
      const [schedule, settings, planResponse] = await Promise.all([
        api.getPublicSchedule(),
        api.adminGetSettings(pwd).catch(() => ({})),
        api.adminGetBallotPlan(pwd).catch(() => null)
      ]);
      
      let masterPlan = planResponse;
      if (!masterPlan) {
        if (confirm('No Master Plan found. Generate it now based on current final list and booths?')) {
          await api.adminGenerateBallotPlan(pwd);
          masterPlan = await api.adminGetBallotPlan(pwd).catch(() => null);
        } else {
          return;
        }
      }

      const year = schedule.electionYear || new Date().getFullYear();
      const collegeName = settings.collegeName || 'Government Victoria College Palakkad';

      const renderBooks = (booksOrHtml) => {
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

      const isSplitPlan = !!(masterPlan.isSplit && Array.isArray(masterPlan.generalParts) && masterPlan.generalParts.length > 1);

      const reportHtml = `
        <div style="padding: 40px; font-family: sans-serif; color: #333;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px;">BALLOT PRINTING SUMMARY - ${year}</h1>
            <h2 style="margin: 5px 0 0 0; font-size: 18px; color: #666;">${esc(collegeName)}</h2>
          </div>

          <p style="font-size: 14px; margin-bottom: 20px;">
            This document provides the sequential serial number ranges and booklet packaging for each ballot category.
            ${isSplitPlan ? '<br><strong>Note:</strong> General Union posts are split into <strong>' + masterPlan.generalParts.length + ' separate ballot papers</strong> with distinct series numbering and booklet codes.' : ''}
          </p>

          ${isSplitPlan ? `
            <!-- Split General Parts Tables -->
            ${masterPlan.generalParts.map((part, pIdx) => `
              <h3 style="background: #eee; padding: 8px 15px; border-left: 5px solid #4f46e5; margin-top: 25px;">
                1.${pIdx + 1} ${esc(part.title)} (Series: ${part.shortCode}-1, ${part.shortCode}-2... / Books: ${part.bookPrefix}1...)
              </h3>
              <div style="font-size: 12px; margin-bottom: 8px; color: #555;">
                <strong>Assigned Posts:</strong> ${(part.posts || []).map(p => esc(p)).join(', ')}
              </div>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 2px solid #000;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 15%;">Booth No</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 10%;">Voters</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 15%;">Sl No From</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 15%;">Sl No To</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 45%;">Book Breakdowns</th>
                  </tr>
                </thead>
                <tbody>
                  ${part.results.map(s => `
                    <tr>
                      <td style="border: 1px solid #ddd; padding: 8px;">Booth ${s.booth}</td>
                      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${s.count}</td>
                      <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${part.shortCode}-${s.start}</td>
                      <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${part.shortCode}-${s.end}</td>
                      <td style="border: 1px solid #ddd; padding: 4px;">${renderBooks(s.books)}</td>
                    </tr>
                  `).join('')}
                  <tr style="background: #f1f5f9; font-weight: bold;">
                    <td style="border: 1px solid #ddd; padding: 8px;">TOTAL PART ${pIdx + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${part.total}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${part.shortCode}-1</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${part.shortCode}-${part.total}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">—</td>
                  </tr>
                </tbody>
              </table>
            `).join('')}
          ` : `
            <!-- Single General Ballots Table -->
            <h3 style="background: #eee; padding: 8px 15px; border-left: 5px solid #4f46e5;">1. General Union Ballots (Series: G1, G2, G3...)</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 2px solid #000;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 15%;">Booth No</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">Voters</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 15%;">Sl No From</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 15%;">Sl No To</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 45%;">Book Breakdowns</th>
                </tr>
              </thead>
              <tbody>
                ${(masterPlan.general?.results || []).map(s => `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 10px;">Booth ${s.booth}</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${s.count}</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">G${s.start}</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">G${s.end}</td>
                    <td style="border: 1px solid #ddd; padding: 4px;">${renderBooks(s.books || s.bookHtml)}</td>
                  </tr>
                `).join('')}
                <tr style="background: #f1f5f9; font-weight: bold;">
                  <td style="border: 1px solid #ddd; padding: 10px;">TOTAL GENERAL</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${masterPlan.general?.total || 0}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">G1</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">G${masterPlan.general?.total || 0}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">—</td>
                </tr>
              </tbody>
            </table>
          `}

          <h3 style="background: #eee; padding: 8px 15px; border-left: 5px solid #10b981; margin-top: 30px;">2. Year Representative Ballots (Series: R1, R2, R3...)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 2px solid #000;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 25%;">Post Name</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 10%;">Booth</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">Voters</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">From</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">To</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 35%;">Book Breakdowns</th>
              </tr>
            </thead>
            <tbody>
              ${(masterPlan.reps?.results || []).map(s => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px; font-size: 11px;">${esc(s.post)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">B${s.booth}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${s.count}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">R${s.start}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">R${s.end}</td>
                  <td style="border: 1px solid #ddd; padding: 4px;">${renderBooks(s.books || s.bookHtml)}</td>
                </tr>
              `).join('')}
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="2" style="border: 1px solid #ddd; padding: 10px;">TOTAL REPRESENTATIVE</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${masterPlan.reps?.total || 0}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">R1</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">R${masterPlan.reps?.total || 0}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">—</td>
              </tr>
            </tbody>
          </table>

          <h3 style="background: #eee; padding: 8px 15px; border-left: 5px solid #f59e0b;">3. Association Secretary Ballots (Series: A1, A2, A3...)</h3>
          <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 25%;">Post Name</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 10%;">Booth</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">Voters</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">From</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">To</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 35%;">Book Breakdowns</th>
              </tr>
            </thead>
            <tbody>
              ${(masterPlan.assocs?.results || []).map(s => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px; font-size: 11px;">${esc(s.post)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">B${s.booth}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${s.count}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">A${s.start}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">A${s.end}</td>
                  <td style="border: 1px solid #ddd; padding: 4px;">${renderBooks(s.books || s.bookHtml)}</td>
                </tr>
              `).join('')}
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="2" style="border: 1px solid #ddd; padding: 10px;">TOTAL ASSOCIATION</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${masterPlan.assocs?.total || 0}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">A1</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">A${masterPlan.assocs?.total || 0}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">—</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; text-align: center;">
            Generated on ${new Date().toLocaleString()} | Official ${CONFIG.COLLEGE_SHORT_NAME} Election Portal
          </div>
        </div>
      `;
      triggerPrint(reportHtml);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  renderUI();
}
