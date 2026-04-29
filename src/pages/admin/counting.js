/**
 * pages/admin/counting.js
 * Admin page to setup counting, preview matrices, and print counting forms.
 *
 * Matrix Design:
 *  Round 1   — Association posts. Preferred to their dept-matching table.
 *              Any unmatched association posts spill to least-loaded tables.
 *  Round 2+  — General (non-association, non-UUC) posts assigned SEQUENTIALLY:
 *              post[i] → Table (i % numTables), Round (floor(i/numTables) + 2)
 *              This guarantees NO duplicates within a round and NO post is ever missing.
 *  Last round— UUC. Every table counts simultaneously.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc } from '../../utils.js';

export async function renderAdminCounting(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'counting', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Generating Counting Logic...</p></div>
  `);

  try {
    const [posts, finalListRaw, booths, nominalRoll] = await Promise.all([
      api.getPosts(),
      api.getFinalNominations().catch(() => []),
      api.adminGetBooths(pwd),
      api.getNominalRoll()
    ]);

    // Safety: ensure finalList is always an array regardless of API response shape
    const finalList = Array.isArray(finalListRaw) ? finalListRaw : [];

    renderCountingUI(container.querySelector('#adminMain'), posts, finalList, booths, nominalRoll);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderCountingUI(main, posts, finalList, booths, nominalRoll) {
  if (!booths.length) {
    main.innerHTML = `<div class="alert alert-error">❌ No booths found. Please set up Polling Booths first.</div>`;
    return;
  }
  if (!posts.length) {
    main.innerHTML = `<div class="alert alert-error">❌ No posts found. Please configure Posts first.</div>`;
    return;
  }

  const T = booths.length;

  // ── Helper: normalise post name field (.post from API, .name from synthetic objs) ──
  const pName = (p) => String(p.post || p.name || '');

  // ── Build CLASS → Dept map from NominalRoll ──────────────────────────────────
  const classToDept = {};
  nominalRoll.forEach(st => {
    const c = String(st['CLASS'] || '').trim();
    const d = String(st['Dept']  || '').trim().toUpperCase();
    if (c && d) classToDept[c] = d;
  });

  // ── Segregate posts ───────────────────────────────────────────────────────────
  const uucPost      = posts.find(p => pName(p).toUpperCase().includes('UUC')) || null;
  const assocPosts   = posts.filter(p => pName(p).toUpperCase().includes('ASSOCIATION') && p !== uucPost);
  const generalPosts = posts.filter(p => p !== uucPost && !assocPosts.includes(p));

  // ── Round 1: Assign ALL association posts to tables ───────────────────────────
  // tableAssocSlots[t] = array of assoc posts for table t
  const tableAssocSlots = Array.from({ length: T }, () => []);

  // First pass: assign by dept match
  const matched = new Set();
  assocPosts.forEach(ap => {
    const apUp = pName(ap).toUpperCase();
    for (let t = 0; t < T; t++) {
      const boothDepts = new Set(
        (booths[t].classes || []).map(c => classToDept[c] || '').filter(Boolean)
      );
      if (Array.from(boothDepts).some(d => apUp.includes(d))) {
        tableAssocSlots[t].push(ap);
        matched.add(ap);
        break;
      }
    }
  });

  // Second pass: any unmatched assoc posts → least-loaded table
  assocPosts.forEach(ap => {
    if (matched.has(ap)) return;
    let minIdx = 0;
    tableAssocSlots.forEach((arr, i) => { if (arr.length < tableAssocSlots[minIdx].length) minIdx = i; });
    tableAssocSlots[minIdx].push(ap);
  });

  // ── General posts: sequential assignment (no wrap-around within a round) ──────
  // post[i] → table (i % T), in round floor(i/T)+1 (0-indexed general round)
  const numGeneralRounds = generalPosts.length > 0 ? Math.ceil(generalPosts.length / T) : 0;
  // tableGeneralSlots[t][r] = post or null
  const tableGeneralSlots = Array.from({ length: T }, () =>
    Array.from({ length: numGeneralRounds }, () => null)
  );
  generalPosts.forEach((p, i) => {
    const tIdx = i % T;
    const rIdx = Math.floor(i / T);
    tableGeneralSlots[tIdx][rIdx] = p;
  });

  // ── Build matrix[t][round] = Post[] ──────────────────────────────────────────
  const totalRounds = 1 + numGeneralRounds + (uucPost ? 1 : 0);
  const matrix = Array.from({ length: T }, (_, t) => {
    const rounds = [];
    rounds.push(tableAssocSlots[t]);                          // Round 0: associations
    for (let r = 0; r < numGeneralRounds; r++) {              // General rounds
      const p = tableGeneralSlots[t][r];
      rounds.push(p ? [p] : []);
    }
    if (uucPost) rounds.push([uucPost]);                      // Final round: UUC
    return rounds;
  });

  // ── Round header labels ───────────────────────────────────────────────────────
  const roundLabels = ['Round 1 (Associations)'];
  for (let r = 0; r < numGeneralRounds; r++) roundLabels.push(`Round ${r + 2}`);
  if (uucPost) roundLabels.push(`Final Round (UUC)`);

  main.innerHTML = `
    <div class="page-enter space-y-6">
      <div class="flex items-center justify-between no-print">
        <div>
          <h3 class="text-xl font-bold text-white">Counting Matrix Setup</h3>
          <p class="text-slate-400 text-sm">Review the counting plan below and print A4 forms for each table.</p>
        </div>
        <button id="btnPrintForms" class="btn btn-primary">🖨️ Print All Forms</button>
      </div>

      <div class="flex flex-wrap gap-2 text-xs no-print">
        <span class="badge badge-valid">${assocPosts.length} Association Posts</span>
        <span class="badge badge-pending">${generalPosts.length} General Posts</span>
        ${uucPost ? `<span class="badge badge-withdrawn">1 UUC Post</span>` : ''}
        <span class="badge" style="background:rgba(99,102,241,0.15);color:#a5b4fc;">${T} Tables · ${totalRounds} Rounds</span>
      </div>

      <div class="glass rounded-xl overflow-hidden no-print">
        <div class="overflow-x-auto">
          <table class="data-table text-xs">
            <thead>
              <tr>
                <th class="whitespace-nowrap">Table / Booth</th>
                ${roundLabels.map(l => `<th class="whitespace-nowrap">${l}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${booths.map((b, t) => `
                <tr>
                  <td class="font-bold text-indigo-300 whitespace-nowrap">
                    Table ${b.boothNumber}<br>
                    <span class="text-xs text-slate-500 font-normal">${esc(b.roomName || '')}</span>
                  </td>
                  ${matrix[t].map(roundPosts => `
                    <td class="align-top py-2">
                      ${roundPosts.length
                        ? roundPosts.map(p => `<div class="badge badge-valid mb-1 block" title="${esc(pName(p))}">${esc(pName(p))}</div>`).join('')
                        : '<span class="text-slate-600">–</span>'}
                    </td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // ── Print handler ─────────────────────────────────────────────────────────────
  main.querySelector('#btnPrintForms').addEventListener('click', () => {
    let printHtml = '';
    let formCount = 0;

    for (let t = 0; t < T; t++) {
      for (let r = 0; r < matrix[t].length; r++) {
        const roundPosts = matrix[t][r];
        if (!roundPosts || !roundPosts.length) continue;
        roundPosts.forEach(post => {
          const pn = pName(post);
          // finalList is guaranteed to be an array by this point
          const candidates = finalList.filter(c => c.post === pn);
          printHtml += buildFormHtml(booths[t].boothNumber, r + 1, pn, candidates);
          formCount++;
        });
      }
    }

    if (!printHtml || formCount === 0) {
      alert('No counting forms were generated. Make sure Posts and Booths are properly configured.');
      return;
    }

    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up blocked! Please allow pop-ups for this site and try again.');
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Counting Forms (${formCount} forms)</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: white; color: black; font-family: Arial, sans-serif; }
    .page { page-break-after: always; padding: 10px; }
    .page:last-child { page-break-after: avoid; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1.5px solid black; padding: 8px; }
    th { background: #f0f0f0; }
    .sig-line { border-top: 1.5px solid black; width: 200px; margin: 0 auto 6px; }
  </style>
</head>
<body>
${printHtml}
<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 400); };
<\/script>
</body>
</html>`);
    win.document.close();
  });
}

function buildFormHtml(tableNum, roundNum, postName, candidates) {
  const candidateRows = candidates.length === 0
    ? `<tr><td colspan="3" style="text-align:center;padding:14px;color:#555;">No Candidates Found for This Post</td></tr>`
    : candidates.map((c, i) => `
        <tr>
          <td style="text-align:center;padding:20px 8px;font-weight:bold;">${i + 1}</td>
          <td style="padding:20px 8px;font-size:15px;font-weight:bold;">${esc(c.candidateName || (c.candidate && c.candidate.NAME) || '—')}</td>
          <td style="padding:20px 8px;"></td>
        </tr>`).join('');

  return `
<div class="page">
  <div style="text-align:center;border-bottom:2px solid black;padding-bottom:12px;margin-bottom:18px;">
    <div style="font-size:12px;color:#444;margin-bottom:4px;">Government Victoria College, Palakkad — College Union Election</div>
    <h2 style="margin:0;font-size:20px;text-transform:uppercase;letter-spacing:2px;">Election Counting Form</h2>
    <div style="display:flex;justify-content:space-between;margin-top:14px;font-size:16px;font-weight:bold;">
      <span>TABLE NO: <u>${tableNum}</u></span>
      <span>ROUND: <u>${roundNum}</u></span>
    </div>
    <h3 style="margin:12px 0 0 0;font-size:16px;text-transform:uppercase;text-decoration:underline;">POST: ${esc(postName)}</h3>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:8%;text-align:center;">#</th>
        <th style="text-align:left;width:62%;">Candidate Name</th>
        <th style="width:30%;text-align:center;">Votes Counted</th>
      </tr>
    </thead>
    <tbody>
      ${candidateRows}
      <tr>
        <td style="text-align:center;padding:20px 8px;">–</td>
        <td style="padding:20px 8px;font-size:15px;font-weight:bold;">NOTA (None Of The Above)</td>
        <td style="padding:20px 8px;"></td>
      </tr>
      <tr>
        <td style="text-align:center;padding:20px 8px;">–</td>
        <td style="padding:20px 8px;font-size:15px;font-weight:bold;color:#555;">INVALID / BLANK VOTES</td>
        <td style="padding:20px 8px;"></td>
      </tr>
    </tbody>
  </table>

  <div style="display:flex;justify-content:space-between;margin-top:40px;text-align:center;">
    <div><div class="sig-line"></div><div style="font-size:12px;">Signature of Counting Officer</div></div>
    <div><div class="sig-line"></div><div style="font-size:12px;">Signature of Returning Officer</div></div>
  </div>
</div>`;
}
