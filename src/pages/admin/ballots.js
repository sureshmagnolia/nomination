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
          <button id="btnGenSummary" class="btn btn-secondary w-full py-3 border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white">📑 Generate Summary Report</button>
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
              <div style="margin-top: 15px; font-weight: bold; text-align: left; display: flex; justify-content: space-between;">
                <span>SL.NO. G____________</span>
                <span style="font-size: 10px; color: #666; font-style: italic;">(To be detached before voting)</span>
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
            <div class="ballot-header">
              <h1>${esc(shortName)} ELECTION ${year}</h1>
              <h2 style="font-size: 15px; margin-top: 5px; font-weight: bold;">BALLOT PAPER</h2>
            </div>
            <div class="meta-row" style="font-size: 12px;"><div>SL.NO. ${prefix}______</div><div>PRO Sign</div></div>
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
      showToast('Calculating ranges...', 'info');
      const [booths, nominalRoll, posts, candidatesResponse, schedule, settings] = await Promise.all([
        api.adminGetBooths(pwd),
        api.getNominalRoll(),
        api.adminGetPosts(pwd),
        api.getFinalNominations(),
        api.getPublicSchedule(),
        api.adminGetSettings(pwd).catch(() => ({}))
      ]);

      const candidates = candidatesResponse.active || [];
      const year = schedule.electionYear || new Date().getFullYear();
      const collegeName = settings.collegeName || 'Government Victoria College Palakkad';
      const shortName = settings.collegeShortName || 'GVC';
      
      const isYear = (p) => p.post.toLowerCase().includes('representative') || p.post.toLowerCase().includes('year');
      const isAssoc = (p) => p.post.toLowerCase().includes('association') || p.post.toLowerCase().includes('assoc');
      
      // Calculate Ranges
      let genSl = 1, repSl = 1, assocSl = 1;
      const sortedBooths = [...booths].sort((a, b) => a.boothNumber - b.boothNumber);
      
      const genSummary = [];
      const repSummary = [];
      const assocSummary = [];

      // 1. General Series (Booth-wise)
      sortedBooths.forEach(b => {
        const boothStudents = nominalRoll.filter(s => b.classes.includes(String(s.CLASS).trim()));
        if (boothStudents.length === 0) return;
        genSummary.push({
          booth: b.boothNumber,
          count: boothStudents.length,
          start: genSl,
          end: genSl + boothStudents.length - 1
        });
        genSl += boothStudents.length;
      });

      // 2. Year Rep Series (Post-wise, then Booth-wise)
      const contestableReps = posts.filter(isYear).filter(p => candidates.filter(c => c.post === p.post).length > 1);
      contestableReps.forEach(p => {
        const yr = String(p.yearRestriction || '').trim().toUpperCase();
        if (!yr) return;

        const postBooths = [];
        sortedBooths.forEach(b => {
          const boothStudents = nominalRoll.filter(s => b.classes.includes(String(s.CLASS).trim()));
          const targetStudents = boothStudents.filter(s => {
            const cls = String(s.CLASS || '').toUpperCase();
            
            // 1. PhD scholars NEVER vote for reps
            if (cls.includes('PH D') || cls.includes('PH.D')) return false; 

            // 2. Define PG logic (Priority: PG students only vote for PG Rep)
            const isPG = /\b(MA|MSC|MCOM|M\.SC|M\.COM|M\.A)\b/i.test(cls);

            if (yr === 'PG') return isPG;
            
            // 3. UG Rep logic (Mutually Exclusive: Must NOT be a PG student)
            if (isPG) return false; 

            if (yr === '1') return cls.startsWith('1ST YEAR');
            if (yr === '2') return cls.startsWith('2ND YEAR');
            if (yr === '3') return cls.startsWith('3RD YEAR');
            
            return false;
          });
          
          if (targetStudents.length > 0) {
            postBooths.push({
              booth: b.boothNumber,
              post: p.post,
              count: targetStudents.length,
              start: repSl,
              end: repSl + targetStudents.length - 1
            });
            repSl += targetStudents.length;
          }
        });
        if (postBooths.length > 0) repSummary.push(...postBooths);
      });

      // 3. Association Series (Post-wise, then Booth-wise)
      const contestableAssocs = posts.filter(isAssoc).filter(p => candidates.filter(c => c.post === p.post).length > 1);
      contestableAssocs.forEach(p => {
        // Normalize: "Association Secretary Computer Science" -> "COMPUTER SCIENCE"
        const dept = p.post.replace('Association Secretary ', '').trim().toUpperCase().replace(/[-\s]/g, ' ');
        const postBooths = [];
        sortedBooths.forEach(b => {
          const boothStudents = nominalRoll.filter(s => b.classes.includes(String(s.CLASS).trim()));
          const targetStudents = boothStudents.filter(s => {
            const sDept = String(s.Dept || '').trim().toUpperCase().replace(/[-\s]/g, ' ');
            const sCls  = String(s.CLASS || '').trim().toUpperCase().replace(/[-\s]/g, ' ');
            // Check if normalized target dept is in student's Dept or CLASS string
            return sDept.includes(dept) || sCls.includes(dept);
          });
          if (targetStudents.length > 0) {
            postBooths.push({
              booth: b.boothNumber,
              post: p.post,
              count: targetStudents.length,
              start: assocSl,
              end: assocSl + targetStudents.length - 1
            });
            assocSl += targetStudents.length;
          }
        });
        if (postBooths.length > 0) assocSummary.push(...postBooths);
      });

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
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Booth No</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Total Voters</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Sl No From</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Sl No To</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Books Needed</th>
              </tr>
            </thead>
            <tbody>
              ${genSummary.map(s => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px;">Booth ${s.booth}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${s.count}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">G${s.start}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">G${s.end}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${Math.ceil(s.count / 50)} (of 50)</td>
                </tr>
              `).join('')}
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td style="border: 1px solid #ddd; padding: 10px;">TOTAL GENERAL</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${genSl - 1}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">G1</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">G${genSl - 1}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${Math.ceil((genSl - 1) / 50)}</td>
              </tr>
            </tbody>
          </table>

          <h3 style="background: #eee; padding: 8px 15px; border-left: 5px solid #10b981;">2. Year Representative Ballots (Series: R1, R2, R3...)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Post Name</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Booth No</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Count</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Sl No From</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Sl No To</th>
              </tr>
            </thead>
            <tbody>
              ${repSummary.map(r => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px;">${esc(r.post)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px;">Booth ${r.booth}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${r.count}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">R${r.start}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">R${r.end}</td>
                </tr>
              `).join('')}
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="2" style="border: 1px solid #ddd; padding: 10px;">TOTAL REPRESENTATIVE</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${repSl - 1}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">R1</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">R${repSl - 1}</td>
              </tr>
            </tbody>
          </table>

          <h3 style="background: #eee; padding: 8px 15px; border-left: 5px solid #f59e0b;">3. Association Secretary Ballots (Series: A1, A2, A3...)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Post Name</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Booth No</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Count</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Sl No From</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Sl No To</th>
              </tr>
            </thead>
            <tbody>
              ${assocSummary.map(a => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px;">${esc(a.post)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px;">Booth ${a.booth}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${a.count}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">A${a.start}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">A${a.end}</td>
                </tr>
              `).join('')}
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="2" style="border: 1px solid #ddd; padding: 10px;">TOTAL ASSOCIATION</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${assocSl - 1}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">A1</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">A${assocSl - 1}</td>
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

  main.querySelector('#btnGenSummary').onclick = handleSummaryReport;

  main.querySelectorAll('.preview-btn').forEach(btn => {
    btn.onclick = () => handlePreview(btn.dataset.type);
  });
}
