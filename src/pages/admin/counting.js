/**
 * pages/admin/counting.js
 * Admin page to setup counting, preview matrices, and print counting forms.
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

  // Map classes to their departments based on NominalRoll
  const classToDept = {};
  nominalRoll.forEach(student => {
    const c = String(student['CLASS'] || 'Unknown').trim();
    const d = String(student['Dept'] || 'Unknown').trim();
    classToDept[c] = d;
  });

  // Segregate Posts
  const uucPostName = posts.find(p => (p.post||p.name||'').toUpperCase().includes('UUC'))?.post
    || posts.find(p => (p.post||p.name||'').toUpperCase().includes('UUC'))?.name || null;
  const associationPosts = posts.filter(p => (p.post||p.name||'').toUpperCase().includes('ASSOCIATION'));
  const generalPosts = posts.filter(p => (p.post||p.name) !== uucPostName && !associationPosts.includes(p));

  // Determine what each table counts in Round 1 (Associations)
  // We look at the booths, see what classes are there, map to Depts, and check if an association post matches that Dept.
  const tableAssociations = booths.map(b => {
    const tableDepts = new Set(b.classes.map(c => classToDept[c]).filter(Boolean));
    // Find association posts that match these departments. 
    // E.g., "Association Secretary Physics" matches Dept "PHYSICS".
    const assignedAssocs = associationPosts.filter(ap => {
      const apName = (ap.post || ap.name || '').toUpperCase();
      return Array.from(tableDepts).some(dept => apName.includes(dept.toUpperCase()));
    });
    return assignedAssocs;
  });

  // Matrix generation
  const roundsCount = 1 + generalPosts.length + (uucPostName ? 1 : 0);
  const matrix = []; // matrix[tableIndex][roundIndex] = Post[]

  for (let t = 0; t < booths.length; t++) {
    matrix[t] = [];
    // Round 1
    matrix[t].push(tableAssociations[t]);

    // General Rounds (Rounds 2 to 2 + generalPosts.length - 1)
    for (let r = 0; r < generalPosts.length; r++) {
      const postIdx = (t + r) % generalPosts.length;
      matrix[t].push([generalPosts[postIdx]]);
    }

    // Final Round
    if (uucPostName) {
      matrix[t].push([{ post: uucPostName, name: uucPostName }]);
    }
  }

  main.innerHTML = `
    <div class="page-enter space-y-6">
      <div class="flex items-center justify-between no-print">
        <div>
          <h3 class="text-xl font-bold text-white">Counting Matrix Setup</h3>
          <p class="text-slate-400 text-sm">Review the cyclic counting plan and print the forms.</p>
        </div>
        <button id="btnPrintForms" class="btn btn-primary">🖨️ Print All Forms</button>
      </div>

      <div class="glass rounded-xl overflow-hidden no-print">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Table</th>
                <th>Round 1 (Associations)</th>
                ${generalPosts.map((_, i) => `<th>Round ${i + 2}</th>`).join('')}
                ${uucPostName ? `<th>Final Round</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${booths.map((b, t) => `
                <tr>
                  <td class="font-bold text-indigo-300 whitespace-nowrap">Table ${b.boothNumber} <br><span class="text-xs text-slate-500 font-normal">${esc(b.roomName)}</span></td>
                  ${matrix[t].map(roundPosts => `
                    <td class="text-xs">
                      ${roundPosts.length ? roundPosts.map(p => `<div class="badge badge-valid mb-1 truncate max-w-[120px]" title="${esc(p.post||p.name)}">${esc(p.post||p.name)}</div>`).join('') : '<span class="text-slate-600">Idle</span>'}
                    </td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Hidden Print Area -->
      <div id="printFormsContainer" class="hidden"></div>
    </div>
  `;

  // Print Logic
  main.querySelector('#btnPrintForms').addEventListener('click', () => {
    let printHtml = '';

    for (let t = 0; t < booths.length; t++) {
      for (let r = 0; r < roundsCount; r++) {
        const postsToCount = matrix[t][r];
        if (!postsToCount || !postsToCount.length) continue;

        postsToCount.forEach(post => {
          // Get Final Candidates for this post
          const candidates = finalList.filter(c => c.post === (post.post || post.name));
          printHtml += generateCountingFormHtml(booths[t].boothNumber, r + 1, post.post || post.name, candidates);
        });
      }
    }

    triggerMatrixPrint(printHtml);
  });
}

function generateCountingFormHtml(tableNum, roundNum, postName, candidates) {
  // Page break after each form so they print individually
  return `
    <div style="page-break-after: always; width: 100%; max-width: 210mm; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; box-sizing: border-box; color: black;">
      <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 24px; text-transform: uppercase;">Election Counting Form</h2>
        <div style="display: flex; justify-content: space-between; margin-top: 15px; font-weight: bold;">
          <span>TABLE: ${tableNum}</span>
          <span>ROUND: ${roundNum}</span>
        </div>
        <h3 style="margin: 15px 0 0 0; font-size: 20px; text-decoration: underline;">POST: ${esc(postName)}</h3>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr>
            <th style="border: 1px solid black; padding: 10px; width: 10%;">#</th>
            <th style="border: 1px solid black; padding: 10px; text-align: left; width: 60%;">Candidate Name</th>
            <th style="border: 1px solid black; padding: 10px; width: 30%;">Total Votes Counted</th>
          </tr>
        </thead>
        <tbody>
          ${candidates.length === 0 ? `<tr><td colspan="3" style="border: 1px solid black; padding: 10px; text-align: center;">No Candidates (Uncontested/Vacant)</td></tr>` : ''}
          ${candidates.map((c, i) => `
            <tr>
              <td style="border: 1px solid black; padding: 20px 10px; text-align: center; font-weight: bold;">${i + 1}</td>
              <td style="border: 1px solid black; padding: 20px 10px; font-size: 16px; font-weight: bold;">${esc(c.candidateName || c.candidate?.NAME)}</td>
              <td style="border: 1px solid black; padding: 20px 10px;"></td>
            </tr>
          `).join('')}
            <tr>
              <td style="border: 1px solid black; padding: 20px 10px; text-align: center; font-weight: bold;">-</td>
              <td style="border: 1px solid black; padding: 20px 10px; font-size: 16px; font-weight: bold; color: #333;">NOTA (None Of The Above)</td>
              <td style="border: 1px solid black; padding: 20px 10px;"></td>
            </tr>
            <tr>
              <td style="border: 1px solid black; padding: 20px 10px; text-align: center; font-weight: bold;">-</td>
              <td style="border: 1px solid black; padding: 20px 10px; font-size: 16px; font-weight: bold; color: #555;">INVALID / BLANK VOTES</td>
              <td style="border: 1px solid black; padding: 20px 10px;"></td>
            </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; margin-top: 50px;">
        <div style="text-align: center;">
          <p>___________________________</p>
          <p style="margin-top: 5px; font-size: 12px;">Signature of Counting Officer</p>
        </div>
        <div style="text-align: center;">
          <p>___________________________</p>
          <p style="margin-top: 5px; font-size: 12px;">Signature of Returning Officer</p>
        </div>
      </div>
    </div>
  `;
}

function triggerMatrixPrint(htmlContent) {
  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Counting Forms</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: white; color: black; }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 200);
          };
        </script>
      </body>
    </html>
  `);
  win.document.close();
}
