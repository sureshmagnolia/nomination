import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

export async function renderAdminCounting(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'counting', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading Counting Setup...</p></div>
  `);

  try {
    const [savedMatrix, posts, nominationsRaw, booths, nominalRoll] = await Promise.all([
      api.adminGetCountingMatrix(pwd).catch(() => null),
      api.getPosts(),
      api.adminGetNominations(pwd).catch(() => []),
      api.adminGetBooths(pwd),
      api.getNominalRoll()
    ]);

    const allNoms = Array.isArray(nominationsRaw) ? nominationsRaw : [];
    const finalList = allNoms.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');

    renderCountingUI(container.querySelector('#adminMain'), pwd, savedMatrix, posts, finalList, booths, nominalRoll);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderCountingUI(main, pwd, savedMatrix, posts, finalList, booths, nominalRoll) {
  if (!booths.length) { main.innerHTML = `<div class="alert alert-error">❌ No booths configured.</div>`; return; }
  if (!posts.length)  { main.innerHTML = `<div class="alert alert-error">❌ No posts configured.</div>`; return; }

  const pName = p => String(p.post || p.name || '');

  // ── This function handles the actual rendering of whatever data we have ──────
  const renderDisplay = (data) => {
    const { matrix, formSerials, totalRounds, roundLabels } = data;
    const T = booths.length;

    main.innerHTML = `
      <div class="page-enter space-y-6">
        <div class="flex items-center justify-between no-print">
          <div>
            <h3 class="text-xl font-bold text-white">Counting Matrix Setup</h3>
            <p class="text-slate-400 text-sm">${T} tables · ${totalRounds} rounds · ${posts.length} posts total</p>
          </div>
          <div class="flex gap-2">
            <button id="btnRegenerate" class="btn btn-secondary bg-white/5 border-white/10 hover:bg-white/10">🔄 Regenerate</button>
            <button id="btnPrintForms" class="btn btn-primary">🖨️ Print All Forms</button>
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
                ${booths.map((b, t) => `
                  <tr>
                    <td class="font-bold text-indigo-300 whitespace-nowrap">
                      Table ${b.boothNumber}<br>
                      <span class="text-xs text-slate-500 font-normal">${esc(b.roomName || '')}</span>
                    </td>
                    ${matrix[t].map((post, r) => `
                      <td class="align-top py-2 min-w-[100px]">
                        ${post
                          ? `<div class="text-[10px] text-slate-500 mb-0.5 font-mono">#${formSerials[`${t}-${r}`]}</div>
                             <div class="badge badge-valid block text-left" title="${esc(pName(post))}">${esc(pName(post))}</div>`
                          : '<span class="text-slate-600">–</span>'}
                      </td>`).join('')}
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;

    main.querySelector('#btnRegenerate').addEventListener('click', () => {
      if (confirm('Are you sure? This will discard the current matrix and generate a new one based on current Booths and Posts. Results entry serial numbers may change!')) {
        generateAndSave();
      }
    });

    main.querySelector('#btnPrintForms').addEventListener('click', () => {
      let html = ''; let count = 0;
      for (let r = 0; r < totalRounds; r++) {
        for (let t = 0; t < T; t++) {
          const post = matrix[t][r];
          if (!post) continue;
          const pn = pName(post);
          const serial = formSerials[`${t}-${r}`];
          const cands = finalList.filter(c => c.post === pn);
          html += buildFormHtml(booths[t].boothNumber, r + 1, pn, cands, serial);
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
      </style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);
      w.document.close();
    });
  };

  // ── Function to generate matrix from scratch and save to backend ──────────────
  const generateAndSave = async () => {
    const T = booths.length;
    
    const classToDept = {};
    nominalRoll.forEach(s => {
      const c = String(s['CLASS'] || '').trim();
      const d = String(s['Dept']  || '').trim().toUpperCase();
      if (c && d) classToDept[c] = d;
    });

    const boothDepts = booths.map(b => new Set((b.classes || []).map(c => classToDept[c] || '').filter(Boolean)));
    const boothYears = booths.map(b => {
      const yrs = new Set();
      (b.classes || []).forEach(c => {
        const u = c.toUpperCase();
        if (u.includes('1ST YEAR')) yrs.add('1');
        if (u.includes('2ND YEAR') && !u.includes('M')) yrs.add('2');
        if (u.includes('3RD YEAR') && !u.includes('M')) yrs.add('3');
        if (['MA ','MSC ','MCOM','M.SC','M.COM','M.A '].some(pg => u.includes(pg.trim()))) yrs.add('PG');
      });
      return yrs;
    });

    const uucPosts     = posts.filter(p => {
      const name = pName(p).toUpperCase();
      return name.includes('UUC') || name.includes('UNIVERSITY UNION COUNCILLOR');
    });
    const assocPosts   = posts.filter(p => !uucPosts.includes(p) && pName(p).toUpperCase().includes('ASSOCIATION'));
    const yearRepPosts = posts.filter(p => !uucPosts.includes(p) && !assocPosts.includes(p) && p.yearRestriction && String(p.yearRestriction).trim() !== '');
    const generalPosts = posts.filter(p => !uucPosts.includes(p) && !assocPosts.includes(p) && !yearRepPosts.includes(p));
    const G = generalPosts.length;

    const tableR1 = Array.from({ length: T }, () => []);
    assocPosts.forEach(ap => {
      const apUp = pName(ap).toUpperCase();
      let assigned = false;
      for (let t = 0; t < T; t++) {
        if (Array.from(boothDepts[t]).some(d => apUp.includes(d))) {
          tableR1[t].push(ap); assigned = true; break;
        }
      }
      if (!assigned) {
        let mi = 0;
        tableR1.forEach((a, i) => { if (a.length < tableR1[mi].length) mi = i; });
        tableR1[mi].push(ap);
      }
    });

    yearRepPosts.forEach(yp => {
      const yr = String(yp.yearRestriction || '');
      for (let t = 0; t < T; t++) {
        if (boothYears[t].has(yr)) tableR1[t].push(yp);
      }
      const any = tableR1.some(r => r.includes(yp));
      if (!any) { let mi = 0; tableR1.forEach((a,i) => { if (a.length < tableR1[mi].length) mi=i; }); tableR1[mi].push(yp); }
    });

    const maxRestricted = Math.max(...tableR1.map(r => r.length), 0);

    const matrix = Array.from({ length: T }, (_, t) => {
      const rounds = [];
      for (let r = 0; r < maxRestricted; r++) rounds.push(tableR1[t][r] || null);
      for (let r = 0; r < G; r++) rounds.push(generalPosts[(t + r) % G]);
      uucPosts.forEach(up => rounds.push(up));
      return rounds;
    });

    const totalRounds = maxRestricted + G + uucPosts.length;
    const formSerials = {};
    let serialCounter = 1;
    for (let r = 0; r < totalRounds; r++) {
      for (let t = 0; t < T; t++) {
        if (matrix[t][r]) formSerials[`${t}-${r}`] = serialCounter++;
      }
    }

    const roundLabels = [];
    for (let r = 0; r < maxRestricted; r++)      roundLabels.push(`Round ${r + 1}${r === 0 ? ' (Assoc/Reps)' : ''}`);
    for (let r = 0; r < G; r++)                  roundLabels.push(`Round ${maxRestricted + r + 1}`);
    uucPosts.forEach((up, i) => roundLabels.push(`Round ${maxRestricted + G + i + 1} (UUC)`));

    const matrixData = { matrix, formSerials, totalRounds, roundLabels };
    
    try {
      main.innerHTML = `<div class="text-center py-20"><span class="spinner"></span><p class="mt-4 text-slate-400">Saving Matrix...</p></div>`;
      await api.adminSaveCountingMatrix(pwd, matrixData);
      showToast('Counting Matrix saved successfully!', 'success');
      renderDisplay(matrixData);
    } catch (e) {
      showToast('Error saving matrix: ' + e.message, 'error');
      renderDisplay(matrixData);
    }
  };

  // ── Initial Logic: Show Saved Matrix OR Ask to Generate ────────────────────────
  if (savedMatrix) {
    renderDisplay(savedMatrix);
  } else {
    main.innerHTML = `
      <div class="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
        <div class="text-5xl mb-4">🧩</div>
        <h3 class="text-xl font-bold text-white mb-2">No Matrix Found</h3>
        <p class="text-slate-400 mb-6">The counting matrix has not been generated and saved yet.</p>
        <button id="btnInitialGenerate" class="btn btn-primary px-10">Generate Matrix Now</button>
      </div>
    `;
    main.querySelector('#btnInitialGenerate').addEventListener('click', generateAndSave);
  }
}

function buildFormHtml(tableNum, roundNum, postName, candidates, serial) {
  const pName = p => String(p.post || p.name || '');
  const rows = candidates.length
    ? candidates.map((c, i) => `<tr>
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
      <div style="font-size:11px;color:#555">Government Victoria College, Palakkad — College Union Election</div>
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
        <tr style="background:#eee"><td style="text-align:center;padding:18px 8px">–</td><td style="padding:18px 8px;font-weight:black;font-size:16px">TOTAL VOTES COUNTED</td><td></td></tr>
      </tbody>
    </table>
    <div style="display:flex;justify-content:space-between;margin-top:60px;text-align:center">
      <div><div style="border-top:1.5px solid #000;width:200px;margin-bottom:5px"></div><div style="font-size:11px">Signature of the Agents</div></div>
      <div><div style="border-top:1.5px solid #000;width:200px;margin-bottom:5px"></div><div style="font-size:11px">Counting Supervisor Signature</div></div>
    </div>
  </div>`;
}
