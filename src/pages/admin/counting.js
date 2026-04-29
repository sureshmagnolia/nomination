import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc } from '../../utils.js';

export async function renderAdminCounting(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'counting', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Generating Counting Matrix...</p></div>
  `);
  try {
    const [posts, nominationsRaw, booths, nominalRoll] = await Promise.all([
      api.getPosts(), api.adminGetNominations(pwd).catch(() => []),
      api.adminGetBooths(pwd), api.getNominalRoll()
    ]);
    // Use all Valid nominations regardless of whether the list has been published
    const allNoms = Array.isArray(nominationsRaw) ? nominationsRaw : [];
    const finalList = allNoms.filter(n => n.status === 'Valid' && n.withdrawalStatus !== 'Approved');
    renderCountingUI(container.querySelector('#adminMain'), posts, finalList, booths, nominalRoll);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderCountingUI(main, posts, finalList, booths, nominalRoll) {
  if (!booths.length) { main.innerHTML = `<div class="alert alert-error">❌ No booths configured.</div>`; return; }
  if (!posts.length)  { main.innerHTML = `<div class="alert alert-error">❌ No posts configured.</div>`; return; }

  const T = booths.length;
  const pName = p => String(p.post || p.name || '');

  // ── Build class→dept and booth year-group maps from NominalRoll ──────────────
  const classToDept = {};
  nominalRoll.forEach(s => {
    const c = String(s['CLASS'] || '').trim();
    const d = String(s['Dept']  || '').trim().toUpperCase();
    if (c && d) classToDept[c] = d;
  });

  const boothDepts = booths.map(b =>
    new Set((b.classes || []).map(c => classToDept[c] || '').filter(Boolean))
  );

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

  // ── Classify posts ────────────────────────────────────────────────────────────
  const uucPosts     = posts.filter(p => {
    const name = pName(p).toUpperCase();
    return name.includes('UUC') || name.includes('UNIVERSITY UNION COUNCILLOR');
  });
  const assocPosts   = posts.filter(p => !uucPosts.includes(p) && pName(p).toUpperCase().includes('ASSOCIATION'));
  const yearRepPosts = posts.filter(p => !uucPosts.includes(p) && !assocPosts.includes(p) && p.yearRestriction && String(p.yearRestriction).trim() !== '');
  const generalPosts = posts.filter(p => !uucPosts.includes(p) && !assocPosts.includes(p) && !yearRepPosts.includes(p));
  const G = generalPosts.length;

  // ── Round 1: Restricted posts per booth ───────────────────────────────────────
  // Each table counts the association + year-rep posts whose voters are IN that booth.
  const tableR1 = Array.from({ length: T }, () => []);

  // Association posts → booths whose classes match the dept in the post name
  const assocMatched = new Set();
  assocPosts.forEach(ap => {
    const apUp = pName(ap).toUpperCase();
    let assigned = false;
    for (let t = 0; t < T; t++) {
      if (Array.from(boothDepts[t]).some(d => apUp.includes(d))) {
        tableR1[t].push(ap); assocMatched.add(ap); assigned = true; break;
      }
    }
    if (!assigned) {
      // Fallback: least-loaded table
      let mi = 0;
      tableR1.forEach((a, i) => { if (a.length < tableR1[mi].length) mi = i; });
      tableR1[mi].push(ap);
    }
  });

  // Year rep posts → every booth that has students from that year
  yearRepPosts.forEach(yp => {
    const yr = String(yp.yearRestriction || '');
    for (let t = 0; t < T; t++) {
      if (boothYears[t].has(yr)) tableR1[t].push(yp);
    }
    // Fallback if no booth matched (year data missing)
    const any = tableR1.some(r => r.includes(yp));
    if (!any) { let mi = 0; tableR1.forEach((a,i) => { if (a.length < tableR1[mi].length) mi=i; }); tableR1[mi].push(yp); }
  });

  // ── General rounds: ALL tables cycle through ALL general posts ────────────────
  // Each table counts ALL general posts, one per round, in cyclic rotation.
  const numGeneralRounds = G;

  // ── Restricted rounds: each restricted post gets its OWN round ───────────────
  // Find the maximum number of restricted posts any single table has.
  const maxRestricted = Math.max(...tableR1.map(r => r.length), 0);

  // ── Build matrix[t][round] = Post | null ─────────────────────────────────────
  // Each element is a single post (or null = idle) — NEVER multiple per slot.
  const matrix = Array.from({ length: T }, (_, t) => {
    const rounds = [];
    // Restricted rounds: one post per round, pad shorter tables with null
    for (let r = 0; r < maxRestricted; r++) {
      rounds.push(tableR1[t][r] || null);
    }
    // General rounds: cyclic across all tables
    for (let r = 0; r < numGeneralRounds; r++) {
      rounds.push(generalPosts[(t + r) % G]);
    }
    // Final rounds: UUC(s) for every table
    uucPosts.forEach(up => rounds.push(up));
    return rounds;
  });

  const totalRounds = maxRestricted + numGeneralRounds + uucPosts.length;
  const roundLabels = [];
  for (let r = 0; r < maxRestricted; r++)      roundLabels.push(`Round ${r + 1}${r === 0 ? ' (Assoc/Reps)' : ''}`);
  for (let r = 0; r < numGeneralRounds; r++)   roundLabels.push(`Round ${maxRestricted + r + 1}`);
  uucPosts.forEach((up, i) => {
    roundLabels.push(`Round ${maxRestricted + numGeneralRounds + i + 1} (UUC)`);
  });

  main.innerHTML = `
    <div class="page-enter space-y-6">
      <div class="flex items-center justify-between no-print">
        <div>
          <h3 class="text-xl font-bold text-white">Counting Matrix Setup</h3>
          <p class="text-slate-400 text-sm">${T} tables · ${totalRounds} rounds · ${posts.length} posts total</p>
        </div>
        <button id="btnPrintForms" class="btn btn-primary">🖨️ Print All Forms</button>
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
                  ${matrix[t].map(post => `
                    <td class="align-top py-2 min-w-[100px]">
                      ${post
                        ? `<div class="badge badge-valid block text-left" title="${esc(pName(post))}">${esc(pName(post))}</div>`
                        : '<span class="text-slate-600">–</span>'}
                    </td>`).join('')}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

  // ── Print ─────────────────────────────────────────────────────────────────────
  main.querySelector('#btnPrintForms').addEventListener('click', () => {
    let html = ''; let count = 0;
    for (let t = 0; t < T; t++) {
      for (let r = 0; r < matrix[t].length; r++) {
        const post = matrix[t][r];
        if (!post) continue;                          // idle slot — skip
        const pn = pName(post);
        const cands = finalList.filter(c => c.post === pn);
        html += buildForm(booths[t].boothNumber, r + 1, pn, cands);
        count++;
      }
    }
    if (!count) { alert('No forms generated. Check Posts and Booths are configured.'); return; }
    const w = window.open('', '_blank');
    if (!w) { alert('Pop-up blocked — please allow pop-ups for this site.'); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>Counting Forms</title><style>
      @page{size:A4;margin:12mm}*{box-sizing:border-box}
      body{margin:0;font-family:Arial,sans-serif;background:#fff;color:#000}
      .pg{page-break-after:always;padding:10px}.pg:last-child{page-break-after:avoid}
      table{width:100%;border-collapse:collapse;margin-bottom:18px}
      th,td{border:1.5px solid #000;padding:8px}th{background:#eee}
    </style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);
    w.document.close();
  });
}

function buildForm(tableNum, roundNum, postName, candidates) {
  const rows = candidates.length
    ? candidates.map((c, i) => `<tr>
        <td style="text-align:center;padding:18px 8px;font-weight:bold">${i+1}</td>
        <td style="padding:18px 8px;font-size:15px;font-weight:bold">${esc(c.candidateName || '')}</td>
        <td style="padding:18px 8px"></td></tr>`).join('')
    : `<tr><td colspan="3" style="padding:14px;text-align:center;color:#555">No Candidates Found</td></tr>`;

  return `<div class="pg">
    <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:16px">
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
        <th style="text-align:left;width:62%">Candidate Name</th>
        <th style="width:30%;text-align:center">Votes</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr><td style="text-align:center;padding:18px 8px">–</td><td style="padding:18px 8px;font-weight:bold">NOTA (None Of The Above)</td><td></td></tr>
        <tr><td style="text-align:center;padding:18px 8px">–</td><td style="padding:18px 8px;font-weight:bold;color:#555">INVALID / BLANK VOTES</td><td></td></tr>
      </tbody>
    </table>
    <div style="display:flex;justify-content:space-between;margin-top:40px;text-align:center">
      <div><div style="border-top:1.5px solid #000;width:200px;margin-bottom:5px"></div><div style="font-size:11px">Counting Officer Signature</div></div>
      <div><div style="border-top:1.5px solid #000;width:200px;margin-bottom:5px"></div><div style="font-size:11px">Returning Officer Signature</div></div>
    </div>
  </div>`;
}
