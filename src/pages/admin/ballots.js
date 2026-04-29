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

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            
            .a3 .ballot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            .a5 .ballot-grid { display: block; }

            .post-box { border: 2px solid #000; padding: 0; display: flex; flex-direction: column; margin-bottom: 15px; break-inside: avoid; }
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
    let posts, candidatesResponse;
    try {
      [posts, candidatesResponse] = await Promise.all([
        api.adminGetPosts(pwd),
        api.getFinalNominations()
      ]);
    } catch (err) {
      throw new Error(err.message.includes('not published') 
        ? 'Final List Not Published. Please finalize and publish the list first.' 
        : err.message);
    }

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

    let html = '';

    // 1. General Ballot (A3)
    if (filterType === 'all' || filterType === 'general') {
      const gPosts = posts.filter(isGeneral);
      if (gPosts.length > 0) {
        html += `
          <div class="ballot-container a3 page-break">
            <div class="ballot-header">
              <h1>COLLEGE UNION ELECTION ${new Date().getFullYear()}</h1>
              <h1>GOVERNMENT VICTORIA COLLEGE PALAKKAD</h1>
              <h2>OFFICIAL BALLOT PAPER (GENERAL)</h2>
            </div>
            <div class="meta-row"><div>SL.NO. ____________</div><div>Signature of PRO</div></div>
            <div class="instr-box">MARK THE VOTER'S CHOICE WITH THE MARKING SEAL IN THE SPACE PROVIDED</div>
            <div class="ballot-grid">
        `;

        const sorted = [...gPosts].sort((a, b) => {
          const aL = a.post.toLowerCase(), bL = b.post.toLowerCase();
          if (aL.includes('chairman') && !aL.includes('vice')) return -1;
          if (bL.includes('chairman') && !bL.includes('vice')) return 1;
          if (aL.includes('vice chairman')) return -1;
          if (bL.includes('vice chairman')) return 1;
          return 0;
        });

        sorted.forEach(p => {
          const pCands = candidates.filter(c => c.post === p.post);
          if (pCands.length === 0) return;
          html += `
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
        });
        html += `</div></div>`;
      }
    }

    // 2. Year Rep & Association Ballots (A5, One post per page)
    const otherPosts = posts.filter(p => isYear(p) || isAssoc(p));
    if (filterType === 'all' || filterType === 'year' || filterType === 'assoc') {
      const filteredOthers = otherPosts.filter(p => 
        (filterType === 'all') || 
        (filterType === 'year' && isYear(p)) || 
        (filterType === 'assoc' && isAssoc(p))
      );

      filteredOthers.forEach(p => {
        const pCands = candidates.filter(c => c.post === p.post);
        if (pCands.length === 0) return;

        html += `
          <div class="ballot-container a5 page-break">
            <div class="ballot-header">
              <h1>GVC ELECTION ${new Date().getFullYear()}</h1>
              <h2>${isYear(p) ? 'YEAR REP' : 'ASSOCIATION'} BALLOT</h2>
            </div>
            <div class="meta-row" style="font-size: 12px;"><div>SL.NO. ______</div><div>PRO Sign</div></div>
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

  main.querySelectorAll('.preview-btn').forEach(btn => {
    btn.onclick = () => handlePreview(btn.dataset.type);
  });
}
