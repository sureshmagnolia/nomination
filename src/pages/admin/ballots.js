/**
 * ballots.js
 * Professional ballot printing for General (A3), Year Rep (A5), and Association (A5) posts.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

export async function renderAdminBallots(container) {
  const pwd = getAdminPassword(); if (!pwd) return;

  renderAdminLayout(container, 'Ballot Printing', `
    <div class="text-center py-16">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 mt-4 text-sm">Preparing ballot generator...</p>
    </div>
  `);

  const main = container.querySelector('#adminMain');

  main.innerHTML = `
    <div class="space-y-6 page-enter">
      <div class="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
        <div>
          <h2 class="text-2xl font-bold text-white flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">🗳️</span>
            Ballot Printing
          </h2>
          <p class="text-slate-400 mt-1">Generate official ballots by category. Each opens in a dedicated tab.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-indigo-500/50 transition-all">
          <div class="text-indigo-400 font-bold flex items-center gap-2">
            <span>🏆</span> General Union (A3)
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Main union posts in 2 columns. Designed for A3 paper. Chairman & Vice Chairman on top.
          </p>
          <button data-type="general" class="btn btn-primary w-full py-3 preview-btn">🖨️ Generate General Ballot</button>
        </div>

        <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-emerald-500/50 transition-all">
          <div class="text-emerald-400 font-bold flex items-center gap-2">
            <span>📅</span> Year Representatives (A5)
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            1st, 2nd, 3rd Year & PG Reps. Designed for A5 paper (one post per page).
          </p>
          <button data-type="year" class="btn btn-primary w-full py-3 preview-btn">🖨️ Generate Year Reps</button>
        </div>

        <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-amber-500/50 transition-all">
          <div class="text-amber-400 font-bold flex items-center gap-2">
            <span>🤝</span> Association Reps (A5)
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Departmental Association Secretaries. Designed for A5 paper (one post per page).
          </p>
          <button data-type="assoc" class="btn btn-primary w-full py-3 preview-btn">🖨️ Generate Association Ballots</button>
        </div>

        <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-purple-500/50 transition-all bg-purple-500/5">
          <div class="text-purple-400 font-bold flex items-center gap-2">
            <span>📊</span> Printing Summary
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Detailed serial number ranges and book counts for the printing company.
          </p>
          <button id="btnGenSummary" class="btn btn-secondary w-full py-3 border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white">📑 View Summary Report</button>
        </div>
      </div>
    </div>
  `;

  const triggerPrint = (html) => {
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html>
        <head>
          <title>Official Ballots - GVC Election</title>
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

            .a3 { width: 297mm; min-height: 420mm; padding: 50px; }
            .a5 { width: 148mm; min-height: 210mm; padding: 25px; }

            .ballot-header { text-align: center; border-bottom: 3px double #000; margin-bottom: 25px; padding-bottom: 10px; }
            .ballot-header h1 { font-size: 22px; margin: 0; text-transform: uppercase; }
            .ballot-header h2 { font-size: 18px; margin: 5px 0 0 0; }
            
            .a3 .ballot-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 30px; 
              width: 100%;
              align-items: flex-start;
            }
            .a5 .ballot-grid { display: block; }

            .post-box { 
              border: 2px solid #000; 
              padding: 0; 
              display: flex; 
              flex-direction: column; 
              margin-bottom: 25px; 
              break-inside: avoid; 
              -webkit-column-break-inside: avoid;
              page-break-inside: avoid;
              width: 100%;
            }
            .post-title { background: #ccc; color: #000; text-align: center; padding: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #000; }
            
            .candidate-row { display: flex; align-items: center; border-bottom: 1px solid #000; height: 55px; }
            .candidate-row:last-child { border-bottom: none; }
            
            .sl-no { width: 40px; text-align: center; border-right: 1px solid #000; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; }
            .c-name { flex-grow: 1; padding: 0 15px; font-weight: bold; display: flex; flex-direction: column; justify-content: center; }
            .stamp-box { width: 75px; height: 100%; border-left: 1px solid #000; display: flex; align-items: center; justify-content: center; position: relative; }
            .stamp-box::after { content: ""; width: 35px; height: 35px; border: 1px dashed #ccc; border-radius: 4px; }
            
            .instr-box { text-align: center; border: 1px solid #000; padding: 8px; margin-bottom: 25px; font-weight: bold; font-size: 13px; text-transform: uppercase; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold; font-size: 14px; }
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
    let posts, candidatesResponse, schedule, settings;
    try {
      [posts, candidatesResponse, schedule, settings] = await Promise.all([
        api.adminGetPosts(pwd),
        api.getFinalNominations(),
        api.getPublicSchedule(),
        api.adminGetSettings(pwd).catch(() => ({}))
      ]);
    } catch (err) {
      throw new Error(err.message.includes('not published') 
        ? 'Final List Not Published. Please finalize and publish the list first.' 
        : err.message);
    }

    const collegeName = settings.collegeName || 'GOVERNMENT VICTORIA COLLEGE PALAKKAD';
    const shortName = settings.collegeShortName || 'GVC';

    const year = schedule.electionYear || new Date().getFullYear().toString();
    const candidates = candidatesResponse.active || [];
    if (candidates.length === 0) throw new Error('No active candidates found.');

    const isYear = (p) => {
      const name = p.post.toLowerCase();
      return name.includes('representative') || name.includes('year');
    };
    const isAssoc = (p) => {
      const name = p.post.toLowerCase();
      return name.includes('association') || name.includes('assoc');
    };
    const isGeneral = (p) => !isYear(p) && !isAssoc(p);

    // Filter out Unanimous Winners (Posts with only 1 candidate)
    const contestablePosts = posts.filter(p => {
      const pCands = candidates.filter(c => c.post === p.post);
      return pCands.length > 1; // More than 1 candidate = Election needed
    });

    let html = '';

    // 1. General Ballot (A3)
    if (filterType === 'all' || filterType === 'general') {
      const gPosts = contestablePosts.filter(isGeneral);
      if (gPosts.length > 0) {
        html += `
          <div class="ballot-container a3 page-break">
            <!-- Counterfoil -->
            <div style="border-bottom: 2px dotted #000; padding-bottom: 20px; margin-bottom: 30px; text-align: center;">
              <h1 style="font-size: 16px; margin: 0;">COLLEGE UNION ELECTION ${year}</h1>
              <h1 style="font-size: 18px; margin: 5px 0;">${esc(collegeName)}</h1>
              <h2 style="font-size: 14px; margin: 0;">OFFICIAL BALLOT PAPER (GENERAL) - COUNTERFOIL</h2>
              <div style="margin-top: 15px; font-weight: bold; text-align: left; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between;">
                  <span>SL.NO. G____________</span>
                  <span style="font-size: 10px; color: #666; font-style: italic;">(To be detached before voting)</span>
                </div>
                <div style="font-size: 13px;">Sl. No of Voter in Marked Copy: ____________</div>
              </div>
            </div>

            <div class="ballot-header">
              <h1>COLLEGE UNION ELECTION ${year}</h1>
              <h1>${esc(collegeName)}</h1>
              <h2>OFFICIAL BALLOT PAPER (GENERAL)</h2>
            </div>
            <div class="meta-row"><div>SL.NO. G____________</div><div>Signature of PRO</div></div>
            <div class="instr-box">MARK THE VOTER'S CHOICE WITH THE MARKING SEAL IN THE SPACE PROVIDED</div>
            <div class="ballot-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: flex-start;">
              <div class="ballot-col" id="col1"></div>
              <div class="ballot-col" id="col2"></div>
            </div>
          </div>
        `;

        const sorted = [...gPosts].sort((a, b) => {
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
        html = html.replace('<div class="ballot-col" id="col1"></div>', `<div class="ballot-col" id="col1">${col1Html}</div>`);
        html = html.replace('<div class="ballot-col" id="col2"></div>', `<div class="ballot-col" id="col2">${col2Html}</div>`);
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
      
      if (!planResponse) {
        if (confirm('No Master Plan found. Generate it now based on current final list and booths?')) {
          await handleRegenPlan();
          return handleSummaryReport();
        }
        return;
      }

      const plan = planResponse;

      const year = schedule.electionYear || new Date().getFullYear();
      const collegeName = settings.collegeName || 'Government Victoria College Palakkad';

      const renderBooks = (books) => {
        if (!books || books.length === 0) return '-';
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

      const reportHtml = `
        <div style="padding: 40px; font-family: sans-serif; color: #333;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px;">BALLOT PRINTING SUMMARY - ${year}</h1>
            <h2 style="margin: 5px 0 0 0; font-size: 18px; color: #666;">${esc(collegeName)}</h2>
          </div>

          <p style="font-size: 14px; margin-bottom: 20px;">
            This document provides the sequential serial number ranges for each ballot category. 
            <strong>Note:</strong> Rep and Association ballots are numbered <strong>Post-wise</strong> (one post is completed across all assigned booths before starting the next).
          </p>

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
              ${plan.general.results.map(s => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px;">Booth ${s.booth}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${s.count}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">G${s.start}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">G${s.end}</td>
                  <td style="border: 1px solid #ddd; padding: 4px;">${renderBooks(s.books)}</td>
                </tr>
              `).join('')}
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td style="border: 1px solid #ddd; padding: 10px;">TOTAL GENERAL</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${plan.general.total}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">G1</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">G${plan.general.total}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">—</td>
              </tr>
            </tbody>
          </table>

          <h3 style="background: #eee; padding: 8px 15px; border-left: 5px solid #10b981;">2. Year Representative Ballots (Series: R1, R2, R3...)</h3>
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
              ${plan.reps.results.map(s => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px; font-size: 11px;">${esc(s.post)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">B${s.booth}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${s.count}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">R${s.start}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">R${s.end}</td>
                  <td style="border: 1px solid #ddd; padding: 4px;">${renderBooks(s.books)}</td>
                </tr>
              `).join('')}
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="2" style="border: 1px solid #ddd; padding: 10px;">TOTAL REPRESENTATIVE</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${plan.reps.total}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">R1</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">R${plan.reps.total}</td>
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
              ${plan.assocs.results.map(s => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px; font-size: 11px;">${esc(s.post)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">B${s.booth}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${s.count}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">A${s.start}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">A${s.end}</td>
                  <td style="border: 1px solid #ddd; padding: 4px;">${renderBooks(s.books)}</td>
                </tr>
              `).join('')}
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="2" style="border: 1px solid #ddd; padding: 10px;">TOTAL ASSOCIATION</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${plan.assocs.total}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">A1</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">A${plan.assocs.total}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">—</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; text-align: center;">
            Generated on ${new Date().toLocaleString()} | Official GVC Election Portal
          </div>
        </div>
      `;
      triggerPrint(reportHtml);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRegenPlan = async (e) => {
    const btn = e?.target;
    const defaultText = '🔄 Finalize Master Plan';
    try {
      if (btn) setLoading(btn, true, defaultText);
      showToast('Calculating and saving Master Plan on server...', 'info');
      await api.adminGenerateBallotPlan(pwd);
      showToast('Master Plan finalized successfully!', 'success');
      if (btn) setLoading(btn, false, defaultText);
    } catch (err) {
      if (btn) setLoading(btn, false, defaultText);
      showToast(err.message, 'error');
    }
  };

  main.querySelector('#btnGenSummary').onclick = handleSummaryReport;

  main.querySelectorAll('.preview-btn').forEach(btn => {
    btn.onclick = () => handlePreview(btn.dataset.type);
  });
}
