import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading, isYearEligible } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { saveCountingMeta, getCountingMeta } from '../../offlineStorage.js';
import { router } from '../../router.js';

export async function renderAdminCounting(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'counting', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading Counting Setup...</p></div>
  `);

  try {
    const [savedMatrix, posts, nominationsRaw, booths, nominalRoll, settings] = await Promise.all([
      api.adminGetCountingMatrix(pwd, true).catch(() => null),
      api.getPosts().catch(() => []),
      api.adminGetNominations(pwd).catch(() => []),
      api.adminGetBooths(pwd, true).catch(() => []),
      api.getNominalRoll().catch(() => []),
      api.adminGetSettings(pwd).catch(() => ({}))
    ]);

    const allNoms = Array.isArray(nominationsRaw) ? nominationsRaw : [];
    const finalList = allNoms.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');
    const boothsList = Array.isArray(booths) ? booths : (Array.isArray(booths?.booths) ? booths.booths : []);
    const postsList = Array.isArray(posts) ? posts : (Array.isArray(posts?.posts) ? posts.posts : []);
    const nominalRollList = Array.isArray(nominalRoll) ? nominalRoll : [];

    // Cache metadata in IndexedDB for offline access
    await saveCountingMeta({ savedMatrix, posts: postsList, finalList, booths: boothsList, settings });

    renderCountingUI(container.querySelector('#adminMain'), pwd, savedMatrix, postsList, finalList, boothsList, nominalRollList, settings, false);
  } catch (e) {
    console.warn('Counting online load failed, checking IndexedDB cache:', e);
    const cached = await getCountingMeta();
    if (cached && cached.savedMatrix) {
      renderCountingUI(
        container.querySelector('#adminMain'),
        pwd,
        cached.savedMatrix,
        cached.posts || [],
        cached.finalList || [],
        cached.booths || [],
        [],
        cached.settings || {},
        true
      );
    } else {
      container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
    }
  }
}

function renderCountingUI(main, pwd, savedMatrix, posts, finalList, booths, nominalRoll, settings = {}, isOffline = false) {
  const collegeName = settings?.collegeName || CONFIG.COLLEGE_NAME || 'Government Victoria College Palakkad';
  const electionYear = settings?.electionYear || new Date().getFullYear().toString();
  const collegeLogo = settings?.collegeLogo || '';
  
  const boothsList = Array.isArray(booths) ? booths : [];
  const postsList = Array.isArray(posts) ? posts : [];
  const nominalRollList = Array.isArray(nominalRoll) ? nominalRoll : [];
  const candidatesList = Array.isArray(finalList) ? finalList : [];

  if (!boothsList.length) { 
    main.innerHTML = `
      <div class="page-enter text-center py-16 bg-white/5 rounded-2xl border border-white/10 max-w-lg mx-auto p-8 shadow-xl">
        <div class="text-4xl mb-3">🗳️</div>
        <h3 class="text-lg font-bold text-white mb-2">No Polling Booths Configured</h3>
        <p class="text-slate-400 text-xs leading-relaxed mb-6">Polling booths must be created before the counting matrix can allocate counting tables.</p>
        <button id="btnGoToBooths" class="btn btn-primary btn-sm text-xs font-bold">Go to Polling Booths Setup</button>
      </div>
    `;
    main.querySelector('#btnGoToBooths')?.addEventListener('click', () => router.navigate('/admin/booths'));
    return; 
  }
  if (!postsList.length) { 
    main.innerHTML = `<div class="alert alert-error">❌ No election posts found.</div>`; 
    return; 
  }

  const pName = p => String(p?.post || p?.name || '');

  const getBoothClasses = (b) => {
    if (Array.isArray(b?.classes)) return b.classes;
    if (typeof b?.classes === 'string') return b.classes.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };

  // ── This function handles the actual rendering of whatever data we have ──────
  const renderDisplay = (data) => {
    const matrix = Array.isArray(data?.matrix) ? data.matrix : [];
    const formSerials = data?.formSerials && typeof data.formSerials === 'object' ? data.formSerials : {};
    const totalRounds = Number(data?.totalRounds) || (matrix[0] ? matrix[0].length : 0);
    const roundLabels = Array.isArray(data?.roundLabels) && data.roundLabels.length === totalRounds
      ? data.roundLabels
      : Array.from({ length: totalRounds }, (_, i) => `Round ${i + 1}`);
    const T = boothsList.length;
    const isMismatch = matrix.length !== T;

    main.innerHTML = `
      <div class="page-enter space-y-6">
        ${isMismatch ? `
          <div class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">⚠️</span>
              <div>
                <strong>Booth Configuration Mismatch:</strong>
                <span>The saved counting matrix was generated for <strong>${matrix.length} tables</strong>, but there are currently <strong>${T} polling booths</strong> configured.</span>
              </div>
            </div>
            <button id="btnNoticeRegenerate" class="btn btn-sm bg-amber-500 hover:bg-amber-600 text-black font-bold shrink-0">
              🔄 Regenerate Matrix Now
            </button>
          </div>
        ` : ''}

        <div class="flex items-center justify-between no-print flex-wrap gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-xl font-bold text-white">Counting Matrix Setup</h3>
              ${isOffline ? '<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold">Offline Mode (IndexedDB)</span>' : ''}
            </div>
            <p class="text-slate-400 text-sm">${T} tables · ${totalRounds} rounds · ${postsList.length} posts total</p>
          </div>
          <div class="flex gap-2 flex-wrap">
            <a href="#/admin/officials" class="btn btn-secondary border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white text-xs font-semibold">👥 Allot Counting Teams</a>
            <button id="btnRegenerate" class="btn btn-secondary bg-white/5 border-white/10 hover:bg-white/10 text-xs font-semibold">🔄 Regenerate</button>
            <button id="btnPrintForms" class="btn btn-primary text-xs font-bold">🖨️ Print All Forms</button>
          </div>
        </div>

        <div class="glass rounded-xl overflow-hidden no-print">
          <div class="overflow-x-auto">
            <table class="data-table text-xs">
              <thead><tr>
                <th>Table</th>
                ${roundLabels.map(l => `<th>${esc(l)}</th>`).join('')}
              </tr></thead>
              <tbody>
                ${boothsList.map((b, t) => {
                  const tableRow = Array.isArray(matrix[t]) 
                    ? matrix[t] 
                    : Array.from({ length: totalRounds }, () => null);
                  return `
                  <tr>
                    <td class="font-bold text-indigo-300 whitespace-nowrap">
                      Table ${b.boothNumber || (t + 1)}<br>
                      <span class="text-xs text-slate-500 font-normal">${esc(b.roomName || '')}</span>
                    </td>
                    ${tableRow.map((post, r) => `
                      <td class="align-top py-2 min-w-[100px]">
                        ${post
                          ? `<div class="text-[10px] text-slate-500 mb-0.5 font-mono">#${esc(formSerials[`${t}-${r}`] || '')}</div>
                             <div class="badge badge-valid block text-left" title="${esc(pName(post))}">${esc(pName(post))}</div>`
                          : '<span class="text-slate-600">–</span>'}
                      </td>`).join('')}
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;

    main.querySelector('#btnRegenerate')?.addEventListener('click', () => {
      if (confirm('Are you sure? This will discard the current matrix and generate a new one based on current Booths and Posts. Results entry serial numbers may change!')) {
        generateAndSave();
      }
    });

    main.querySelector('#btnNoticeRegenerate')?.addEventListener('click', () => {
      if (confirm('Regenerate counting matrix to align with all ' + T + ' polling booths?')) {
        generateAndSave();
      }
    });

    main.querySelector('#btnPrintForms')?.addEventListener('click', () => {
      let html = ''; let count = 0;
      for (let r = 0; r < totalRounds; r++) {
        for (let t = 0; t < T; t++) {
          const post = matrix[t] ? matrix[t][r] : null;
          if (!post) continue;
          const pn = pName(post);
          const serial = formSerials[`${t}-${r}`] || `${t + 1}-${r + 1}`;
          const cands = candidatesList.filter(c => c.post === pn).sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));
          const bNum = boothsList[t]?.boothNumber || (t + 1);
          html += buildFormHtml(bNum, r + 1, pn, cands, serial, collegeName, electionYear, collegeLogo);
          count++;
        }
      }
      if (!count) { alert('No forms generated.'); return; }
      const w = window.open('', '_blank');
      if (!w) { alert('Pop-up blocked.'); return; }
      w.document.write(`<!DOCTYPE html><html><head><title>Counting Forms</title><style>
        @page{size:A4;margin:12mm}*{box-sizing:border-box}
        body{margin:0;font-family:Arial,sans-serif;background:#fff;color:#000}
        .pg{page-break-after:always;padding:10px;position:relative}.pg:last-child{page-break-after:avoid}
        .serial-tag{position:absolute;top:10px;right:10px;border:2px solid #000;padding:5px 12px;font-family:monospace;font-size:18px;font-weight:bold}
        table{width:100%;border-collapse:collapse;margin-bottom:18px}
        th,td{border:1.5px solid #000;padding:8px}th{background:#eee}
        .watermark-global{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:450px;height:450px;opacity:0.1;pointer-events:none;z-index:-1;background-size:contain;background-repeat:no-repeat;background-position:center;}
      </style></head><body>${collegeLogo ? `<div class="watermark-global" style="background-image: url('${collegeLogo}');"></div>` : ''}${html}<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);
      w.document.close();
    });
  };

  // ── Function to generate matrix from scratch and save to backend ──────────────
  const generateAndSave = async () => {
    const T = boothsList.length;
    
    // Helper to get department from post name
    const getPostDept = (p) => {
      if (p?.restrictedDept) return String(p.restrictedDept).toUpperCase().trim();
      const name = pName(p);
      const prefix = 'Association Secretary ';
      if (name.toUpperCase().startsWith(prefix.toUpperCase())) {
        return name.substring(prefix.length).toUpperCase().trim();
      }
      return null;
    };

    const classToDept = {};
    nominalRollList.forEach(s => {
      const c = String(s['CLASS'] || '').trim();
      const d = String(s['Dept']  || '').trim().toUpperCase();
      if (c && d) {
        classToDept[c] = d;
        const u = c.toUpperCase();
        if (u.includes('RESEARCH') || u.includes('SCHOLAR') || u.includes('PHD') || u.includes('PH.D')) {
          classToDept[`RESEARCH SCHOLAR - ${s['Dept']}`] = d;
        }
      }
    });

    const boothDepts = boothsList.map(b => new Set(getBoothClasses(b).map(c => classToDept[c] || '').filter(Boolean)));
    const boothYears = boothsList.map(b => {
      const yrs = new Set();
      getBoothClasses(b).forEach(c => {
        const u = c.toUpperCase();
        const isPG = ['MA','MSC','MCOM','M.SC','M.COM','M.A'].some(pg => u.includes(pg));
        if (isPG) {
          yrs.add('PG');
        } else {
          if (u.includes('1ST YEAR') || /^\s*(1|1ST|I)\b/.test(u) || /\b1ST\b/.test(u)) yrs.add('1');
          if (u.includes('2ND YEAR') || /^\s*(2|2ND|II)\b/.test(u) || /\b2ND\b/.test(u)) yrs.add('2');
          if (u.includes('3RD YEAR') || /^\s*(3|3RD|III)\b/.test(u) || /\b3RD\b/.test(u)) yrs.add('3');
        }
      });
      return yrs;
    });

    const activeContestablePosts = postsList.filter(p => {
      const pCands = candidatesList.filter(c => c.post === pName(p));
      return pCands.length > 1;
    });
    const pool = (candidatesList.length > 0 && activeContestablePosts.length > 0) ? activeContestablePosts : postsList;

    const uucPosts     = pool.filter(p => {
      const name = pName(p).toUpperCase();
      return name.includes('UUC') || name.includes('UNIVERSITY UNION COUNCILLOR');
    });
    const assocPosts   = pool.filter(p => !uucPosts.includes(p) && (pName(p).toUpperCase().includes('ASSOCIATION') || !!p.deptRestriction)).sort((a, b) => pName(a).localeCompare(pName(b)));
    const yearRepPosts = pool.filter(p => !uucPosts.includes(p) && !assocPosts.includes(p) && (pName(p).toUpperCase().includes('REPRESENTATIVE') || pName(p).toUpperCase().includes('REP')));
    const generalPosts = pool.filter(p => !uucPosts.includes(p) && !assocPosts.includes(p) && !yearRepPosts.includes(p));
    const G = generalPosts.length;

    // Generate individual table schedules based on booth eligibility
    const matrix = Array.from({ length: T }, (_, t) => {
      const rounds = [];
      
      // 1. Association Posts (FIRST)
      assocPosts.forEach(ap => {
        const d = getPostDept(ap);
        if (d && boothDepts[t]?.has(d)) {
          rounds.push(ap);
        }
      });

      // 2. Year Reps (Filtered by isYearEligible against booth classes)
      yearRepPosts.forEach(yp => {
        const bClasses = getBoothClasses(boothsList[t]);
        const hasEligibleClass = bClasses.some(c => isYearEligible(c, yp));
        if (hasEligibleClass) {
          rounds.push(yp);
        }
      });
      
      // 3. General Posts (Rotated per table)
      if (G > 0) {
        for (let i = 0; i < G; i++) {
          rounds.push(generalPosts[(t + i) % G]);
        }
      }
      
      // 4. UUC Posts (LAST)
      uucPosts.forEach(up => rounds.push(up));
      
      return rounds;
    });

    const totalRounds = matrix.length > 0 ? Math.max(...matrix.map(m => (Array.isArray(m) ? m.length : 0)), 0) : 0;
    // Pad all tables to same number of rounds
    matrix.forEach(m => {
      while (m.length < totalRounds) m.push(null);
    });
    const formSerials = {};
    let serialCounter = 1;
    for (let r = 0; r < totalRounds; r++) {
      for (let t = 0; t < T; t++) {
        if (matrix[t] && matrix[t][r]) formSerials[`${t}-${r}`] = serialCounter++;
      }
    }

    const roundLabels = [];
    for (let r = 0; r < totalRounds; r++) {
      roundLabels.push(`Round ${r + 1}`);
    }

    const matrixData = { matrix, formSerials, totalRounds, roundLabels };
    
    try {
      main.innerHTML = `<div class="text-center py-20"><span class="spinner"></span><p class="mt-4 text-slate-400">Saving Matrix...</p></div>`;
      await api.adminSaveCountingMatrix(pwd, matrixData);
      // Cache immediately to IndexedDB
      await saveCountingMeta({ savedMatrix: matrixData, booths: boothsList, posts: postsList, finalList: candidatesList, settings });
      showToast('Counting Matrix saved successfully!', 'success');
      renderDisplay(matrixData);
    } catch (e) {
      // Even if cloud save fails due to network, save locally to IndexedDB!
      await saveCountingMeta({ savedMatrix: matrixData, booths: boothsList, posts: postsList, finalList: candidatesList, settings });
      showToast('Matrix saved locally to IndexedDB (offline). Cloud error: ' + e.message, 'warning');
      renderDisplay(matrixData);
    }
  };

  // ── Initial Logic: Show Saved Matrix OR Ask to Generate ────────────────────────
  const isValidMatrix = savedMatrix && 
    typeof savedMatrix === 'object' && 
    Array.isArray(savedMatrix.matrix) && 
    savedMatrix.matrix.length > 0;

  if (isValidMatrix) {
    renderDisplay(savedMatrix);
  } else {
    main.innerHTML = `
      <div class="page-enter text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10 max-w-xl mx-auto p-8 shadow-xl">
        <div class="text-5xl mb-4">🧩</div>
        <h3 class="text-xl font-bold text-white mb-2">No Counting Matrix Generated</h3>
        <p class="text-slate-400 text-sm mb-6 leading-relaxed">
          The counting matrix has not been generated yet. Generating will automatically distribute posts across ${boothsList.length} counting tables and assign Form # serials.
        </p>
        <button id="btnInitialGenerate" class="btn btn-primary px-8 font-bold shadow-lg">Generate Matrix Now</button>
      </div>
    `;
    main.querySelector('#btnInitialGenerate')?.addEventListener('click', generateAndSave);
  }
}

function buildFormHtml(tableNum, roundNum, postName, candidates, serial, collegeName = CONFIG.COLLEGE_NAME || 'Government Victoria College Palakkad', electionYear = '', collegeLogo = '') {
  const pName = p => String(p?.post || p?.name || '');
  const yearStr = electionYear || new Date().getFullYear().toString();
  const candsList = Array.isArray(candidates) ? candidates : [];
  const rows = candsList.length
    ? candsList.map((c, i) => `<tr>
        <td style="text-align:center;padding:18px 8px;font-weight:bold">${i+1}</td>
        <td style="padding:18px 8px;font-size:15px;font-weight:bold">
          ${esc(c.candidateName || '')}
          <div style="font-size:11px;font-weight:normal;color:#333;margin-top:2px;">${esc(c.candidateClass || '')}</div>
        </td>
        <td style="padding:18px 8px"></td></tr>`).join('')
    : `<tr><td colspan="3" style="padding:14px;text-align:center;color:#555">No Candidates Found</td></tr>`;

  return `<div class="pg">
    <div class="serial-tag">FORM #${serial}</div>
    <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:16px;padding-right:100px;">
      ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:45px;max-width:120px;margin:0 auto 4px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
      <div style="font-size:13px;font-weight:bold;color:#111;text-transform:uppercase;">${esc(collegeName)}</div>
      <div style="font-size:12px;font-weight:bold;color:#444;margin-top:2px;">College Union Election ${esc(yearStr)}</div>
      <h2 style="margin:6px 0 0;font-size:20px;text-transform:uppercase;letter-spacing:2px">Counting Form</h2>
      <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:15px;font-weight:bold">
        <span>TABLE: <u>${tableNum}</u></span><span>ROUND: <u>${roundNum}</u></span>
      </div>
      <h3 style="margin:10px 0 0;font-size:15px;text-decoration:underline;text-transform:uppercase">POST: ${esc(postName)}</h3>
    </div>
    <table>
      <thead><tr>
        <th style="width:8%;text-align:center">#</th>
        <th style="text-align:left;width:62%">Candidate Name & Class</th>
        <th style="width:30%;text-align:center">Votes</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr><td style="text-align:center;padding:18px 8px">–</td><td style="padding:18px 8px;font-weight:bold">NOTA</td><td></td></tr>
        <tr><td style="text-align:center;padding:18px 8px">–</td><td style="padding:18px 8px;font-weight:bold;color:#555">INVALID</td><td></td></tr>
        <tr style="background:#eee"><td style="text-align:center;padding:18px 8px">–</td><td style="padding:18px 8px;font-weight:black;font-size:16px">TOTAL</td><td></td></tr>
      </tbody>
    </table>
    <div style="display:flex;justify-content:space-between;margin-top:60px;text-align:center">
      <div><div style="border-top:1.5px solid #000;width:200px;margin-bottom:5px"></div><div style="font-size:11px">Signature of the Agents</div></div>
      <div><div style="border-top:1.5px solid #000;width:200px;margin-bottom:5px"></div><div style="font-size:11px">Counting Supervisor Signature</div></div>
    </div>
  </div>`;
}
