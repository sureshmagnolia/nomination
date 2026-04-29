/**
 * pages/admin/counting.js
 * Admin page to setup counting, preview matrices, and print counting forms.
 *
 * Matrix Rules:
 *  - Round 1: Association posts. Each table is assigned association posts whose dept
 *    matches their booth's classes. Any unmatched association posts are distributed
 *    round-robin to the least-loaded tables so NO post is missed.
 *  - General Rounds: All non-association, non-UUC posts are distributed cyclically.
 *    Each table counts exactly one general post per round.
 *  - Final Round: Every table counts UUC simultaneously.
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
    const [posts, finalList, booths, nominalRoll] = await Promise.all([
      api.getPosts(),
      api.getFinalNominations(),
      api.adminGetBooths(pwd),
      api.getNominalRoll()
    ]);
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

  // ── Normalise post name field (API returns .post, some synthetic objects use .name) ──
  const postName = (p) => String(p.post || p.name || '');

  // ── Build CLASS → Dept map from NominalRoll ──────────────────────────────────
  const classToDept = {};
  nominalRoll.forEach(st => {
    const c = String(st['CLASS'] || '').trim();
    const d = String(st['Dept']  || '').trim().toUpperCase();
    if (c && d) classToDept[c] = d;
  });

  // ── Segregate posts ───────────────────────────────────────────────────────────
  const uucPost     = posts.find(p => postName(p).toUpperCase().includes('UUC')) || null;
  const assocPosts  = posts.filter(p => postName(p).toUpperCase().includes('ASSOCIATION') && p !== uucPost);
  const generalPosts= posts.filter(p => p !== uucPost && !assocPosts.includes(p));

  // ── Round 1: Assign association posts to tables by dept match ─────────────────
  // tableAssocLoad[t] = array of posts assigned to table t in round 1
  const tableAssocLoad = booths.map(() => []);
  const assignedAssocPosts = new Set();

  assocPosts.forEach(ap => {
    const apNameUp = postName(ap).toUpperCase();
    // Find the booth whose classes have a dept matching this post's name
    let bestTable = -1;
    for (let t = 0; t < booths.length; t++) {
      const booth = booths[t];
      const boothDepts = new Set(
        (booth.classes || []).map(c => classToDept[c]).filter(Boolean)
      );
      const matches = Array.from(boothDepts).some(d => apNameUp.includes(d));
      if (matches) {
        bestTable = t;
        break;
      }
    }
    if (bestTable >= 0) {
      tableAssocLoad[bestTable].push(ap);
      assignedAssocPosts.add(ap);
    }
  });

  // ── Any unmatched association posts → distribute to least-loaded tables ───────
  assocPosts.forEach(ap => {
    if (assignedAssocPosts.has(ap)) return;
    // Find the table with the fewest association posts so far
    let minLoad = Infinity, minIdx = 0;
    tableAssocLoad.forEach((arr, i) => {
      if (arr.length < minLoad) { minLoad = arr.length; minIdx = i; }
    });
    tableAssocLoad[minIdx].push(ap);
  });

  // ── Build final matrix: matrix[tableIdx][roundIdx] = Post[] ──────────────────
  // Round 0   = Association round (each table may have multiple association posts)
  // Round 1..N= General posts (cyclic, one post per table per round)
  // Last round = UUC (all tables)
  const numGeneralRounds = generalPosts.length > 0
    ? Math.ceil(generalPosts.length / booths.length)
    : 0;
  // Number of general posts assigned per table per round (at most 1 each, but last round may be partial)
  const matrix = booths.map((_, t) => {
    const rounds = [];

    // Round 0: associations for this table
    rounds.push(tableAssocLoad[t]);

    // Rounds 1..numGeneralRounds: cyclic general post assignment
    for (let r = 0; r < numGeneralRounds; r++) {
      const postIdx = (t + r * booths.length) % generalPosts.length;
      // Only assign if this slot has a valid post
      const assignedPost = generalPosts[(t + r) % generalPosts.length] || null;
      rounds.push(assignedPost ? [assignedPost] : []);
    }

    // Final round: UUC
    if (uucPost) rounds.push([uucPost]);

    return rounds;
  });

  const totalRounds = 1 + numGeneralRounds + (uucPost ? 1 : 0);

  // ── Build round header labels ─────────────────────────────────────────────────
  const roundLabels = ['Round 1\n(Associations)'];
  for (let r = 0; r < numGeneralRounds; r++) roundLabels.push(`Round ${r + 2}`);
  if (uucPost) roundLabels.push(`Final Round\n(UUC)`);

  main.innerHTML = `
    <div class="page-enter space-y-6">
      <div class="flex items-center justify-between no-print">
        <div>
          <h3 class="text-xl font-bold text-white">Counting Matrix Setup</h3>
          <p class="text-slate-400 text-sm">Review the cyclic counting plan and print the forms.</p>
        </div>
        <button id="btnPrintForms" class="btn btn-primary">🖨️ Print All Forms</button>
      </div>

      <!-- Summary badges -->
      <div class="flex flex-wrap gap-3 no-print">
        <span class="badge badge-valid">${assocPosts.length} Association Posts</span>
        <span class="badge badge-pending">${generalPosts.length} General Posts</span>
        ${uucPost ? `<span class="badge badge-withdrawn">1 UUC Post</span>` : ''}
        <span class="badge" style="background:rgba(99,102,241,0.2);color:#a5b4fc;">${booths.length} Tables</span>
        <span class="badge" style="background:rgba(99,102,241,0.2);color:#a5b4fc;">${totalRounds} Rounds</span>
      </div>

      <div class="glass rounded-xl overflow-hidden no-print">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Table</th>
                ${roundLabels.map(l => `<th style="white-space:pre-line;">${l}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${booths.map((b, t) => `
                <tr>
                  <td class="font-bold text-indigo-300 whitespace-nowrap">
                    Table ${b.boothNumber}<br>
                    <span class="text-xs text-slate-500 font-normal">${esc(b.roomName)}</span>
                  </td>
                  ${matrix[t].map(roundPosts => `
                    <td class="text-xs align-top">
                      ${roundPosts.length
                        ? roundPosts.map(p => `<div class="badge badge-valid mb-1" title="${esc(postName(p))}">${esc(postName(p))}</div>`).join('')
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

    for (let t = 0; t < booths.length; t++) {
      for (let r = 0; r < matrix[t].length; r++) {
        const roundPosts = matrix[t][r];
        if (!roundPosts || !roundPosts.length) continue;

        roundPosts.forEach(post => {
          const pn = postName(post);
          const candidates = finalList.filter(c => c.post === pn);
          printHtml += generateCountingFormHtml(
            booths[t].boothNumber,
            r + 1,
            pn,
            candidates
          );
        });
      }
    }

    if (!printHtml) {
      alert('No counting forms to print. Check that Posts and Booths are configured correctly.');
      return;
    }

    // Open in a new tab for printing
    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up was blocked. Please allow pop-ups for this site to print forms.');
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>Counting Forms</title><style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; background: white; color: black; font-family: Arial, sans-serif; }
      .page { page-break-after: always; width: 100%; padding: 10px; }
    </style></head><body>${printHtml}<script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script></body></html>`);
    win.document.close();
  });
}

function generateCountingFormHtml(tableNum, roundNum, postName, candidates) {
  return `
    <div class="page">
      <div style="text-align:center; border-bottom:2px solid black; padding-bottom:10px; margin-bottom:20px;">
        <h2 style="margin:0; font-size:22px; text-transform:uppercase; letter-spacing:2px;">Election Counting Form</h2>
        <p style="margin:4px 0 0 0; font-size:13px; color:#555;">Government Victoria College, Palakkad</p>
        <div style="display:flex; justify-content:space-between; margin-top:15px; font-weight:bold; font-size:16px;">
          <span>TABLE NO: <strong>${tableNum}</strong></span>
          <span>ROUND: <strong>${roundNum}</strong></span>
        </div>
        <h3 style="margin:14px 0 0 0; font-size:18px; text-decoration:underline; text-transform:uppercase;">POST: ${postName}</h3>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
        <thead>
          <tr>
            <th style="border:1.5px solid black; padding:10px 8px; width:8%; text-align:center;">#</th>
            <th style="border:1.5px solid black; padding:10px 8px; text-align:left; width:62%;">Candidate Name</th>
            <th style="border:1.5px solid black; padding:10px 8px; width:30%; text-align:center;">Votes Counted</th>
          </tr>
        </thead>
        <tbody>
          ${candidates.length === 0
            ? `<tr><td colspan="3" style="border:1.5px solid black; padding:14px; text-align:center; color:#555;">No Candidates Found for this Post</td></tr>`
            : candidates.map((c, i) => `
              <tr>
                <td style="border:1.5px solid black; padding:22px 8px; text-align:center; font-weight:bold;">${i + 1}</td>
                <td style="border:1.5px solid black; padding:22px 8px; font-size:15px; font-weight:bold;">${c.candidateName || c.candidate?.NAME || '—'}</td>
                <td style="border:1.5px solid black; padding:22px 8px;"></td>
              </tr>`).join('')}
          <tr>
            <td style="border:1.5px solid black; padding:22px 8px; text-align:center;">–</td>
            <td style="border:1.5px solid black; padding:22px 8px; font-size:15px; font-weight:bold;">NOTA (None Of The Above)</td>
            <td style="border:1.5px solid black; padding:22px 8px;"></td>
          </tr>
          <tr>
            <td style="border:1.5px solid black; padding:22px 8px; text-align:center;">–</td>
            <td style="border:1.5px solid black; padding:22px 8px; font-size:15px; font-weight:bold; color:#555;">INVALID / BLANK VOTES</td>
            <td style="border:1.5px solid black; padding:22px 8px;"></td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex; justify-content:space-between; margin-top:40px;">
        <div style="text-align:center;">
          <div style="border-top:1.5px solid black; width:200px; margin-bottom:6px;"></div>
          <p style="margin:0; font-size:12px;">Signature of Counting Officer</p>
        </div>
        <div style="text-align:center;">
          <div style="border-top:1.5px solid black; width:200px; margin-bottom:6px;"></div>
          <p style="margin:0; font-size:12px;">Signature of Returning Officer</p>
        </div>
      </div>
    </div>
  `;
}
