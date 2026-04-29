/**
 * ballots.js
 * Professional ballot printing for General, Year Rep, and Association posts.
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
            Print Ballots
          </h2>
          <p class="text-slate-400 mt-1">Generate official ballots for General, Year Rep, and Association posts.</p>
        </div>
        <div class="flex gap-3">
          <button id="btnPrintBallots" class="btn btn-primary px-8">
            🖨️ Generate All Ballots
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass p-6 rounded-2xl border border-white/10 space-y-4">
          <div class="text-indigo-400 font-bold flex items-center gap-2">
            <span>🏆</span> General Ballot
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Major union posts (Chairman, Secretary, etc.) in a 2-column professional layout. Chairman & Vice Chairman on top.
          </p>
          <button data-type="general" class="btn btn-secondary w-full py-2 text-xs preview-btn">Preview General</button>
        </div>

        <div class="glass p-6 rounded-2xl border border-white/10 space-y-4">
          <div class="text-emerald-400 font-bold flex items-center gap-2">
            <span>📅</span> Year Rep Ballots
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Separate ballots for 1st, 2nd, and 3rd year representatives. Each year on a new page.
          </p>
          <button data-type="year" class="btn btn-secondary w-full py-2 text-xs preview-btn">Preview Year Reps</button>
        </div>

        <div class="glass p-6 rounded-2xl border border-white/10 space-y-4">
          <div class="text-amber-400 font-bold flex items-center gap-2">
            <span>🤝</span> Association Ballots
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Departmental Association Secretary ballots. Each department on a dedicated page.
          </p>
          <button data-type="assoc" class="btn btn-secondary w-full py-2 text-xs preview-btn">Preview Associations</button>
        </div>
      </div>

      <div id="ballotPreviewArea" class="hidden glass p-8 rounded-3xl border border-white/20 bg-white/5 overflow-auto max-h-[600px]">
        <!-- Preview will be rendered here -->
      </div>
    </div>

    <style>
      @media print {
        body * { visibility: hidden; }
        #printSection, #printSection * { visibility: visible; }
        #printSection { position: absolute; left: 0; top: 0; width: 100%; }
        .page-break { page-break-after: always; }
        .no-print { display: none !important; }
      }
      
      .ballot-container {
        background: white;
        color: black;
        padding: 40px;
        font-family: "Times New Roman", Times, serif;
        width: 210mm; /* A4 width */
        margin: 0 auto;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
      }
      
      .ballot-header {
        text-align: center;
        border-bottom: 3px double #000;
        margin-bottom: 30px;
        padding-bottom: 10px;
      }
      
      .ballot-header h1 { font-size: 24px; margin: 0; text-transform: uppercase; }
      .ballot-header h2 { font-size: 18px; margin: 5px 0 0 0; }
      
      .ballot-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      
      .post-box {
        border: 2px solid #000;
        padding: 10px;
        display: flex;
        flex-direction: column;
      }
      
      .post-box.full-width {
        grid-column: span 2;
      }
      
      .post-title {
        background: #000;
        color: #fff;
        text-align: center;
        padding: 5px;
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 10px;
        text-transform: uppercase;
      }
      
      .candidate-row {
        display: flex;
        align-items: center;
        border: 1px solid #000;
        margin-bottom: 5px;
        height: 50px;
      }
      
      .sl-no {
        width: 30px;
        text-align: center;
        border-right: 1px solid #000;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
      
      .c-name {
        flex-grow: 1;
        padding: 0 10px;
        font-size: 14px;
        font-weight: bold;
      }
      
      .stamp-box {
        width: 60px;
        height: 100%;
        border-left: 1px solid #000;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      
      .stamp-box::after {
        content: "";
        width: 30px;
        height: 30px;
        border: 1px dashed #ccc;
        border-radius: 4px;
      }
      
      .ballot-footer {
        margin-top: 40px;
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        font-style: italic;
      }
    </style>
  `;

  const previewArea = main.querySelector('#ballotPreviewArea');

  const generateBallotsHTML = async (filterType = 'all') => {
    let posts, candidatesResponse;
    try {
      [posts, candidatesResponse] = await Promise.all([
        api.adminGetPosts(pwd),
        api.getFinalNominations()
      ]);
    } catch (err) {
      if (err.message.includes('not published')) {
        throw new Error('Final List Not Published. Please finalize and publish the list before printing ballots.');
      }
      throw err;
    }

    const candidates = candidatesResponse.active || [];
    if (candidates.length === 0) {
      throw new Error('No active candidates found in the Final List. Please ensure candidates are verified and the list is published.');
    }

    // Categorize posts
    const isYear = (p) => p.post.toLowerCase().includes('year');
    const isAssoc = (p) => p.post.toLowerCase().includes('assoc') || p.post.toLowerCase().includes('association');
    const isGeneral = (p) => !isYear(p) && !isAssoc(p);

    let html = '<div id="printSection">';

    // 1. General Ballot
    if (filterType === 'all' || filterType === 'general') {
      const generalPosts = posts.filter(isGeneral);
      if (generalPosts.length > 0) {
        html += `
          <div class="ballot-container page-break">
            <div class="ballot-header">
              <h1 style="font-size: 18px;">COLLEGE UNION ELECTION ${new Date().getFullYear()}</h1>
              <h1 style="font-size: 16px;">GOVERNMENT VICTORIA COLLEGE PALAKKAD</h1>
              <h2 style="font-size: 15px; margin-top: 5px; font-weight: bold;">BALLOT PAPER</h2>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold; font-size: 14px;">
              <div>SL.NO. ____________</div>
              <div>Signature of PRO</div>
            </div>

            <div style="text-align: center; border: 1px solid #000; padding: 5px; margin-bottom: 20px; font-weight: bold; font-size: 13px; text-transform: uppercase;">
              MARK THE VOTER'S CHOICE WITH THE MARKING SEAL IN THE SPACE PROVIDED
            </div>

            <div class="ballot-grid">
        `;

        // Sort: Chairman, Vice Chairman first, then rest
        const sortedGeneral = [...generalPosts].sort((a, b) => {
          const aL = a.post.toLowerCase();
          const bL = b.post.toLowerCase();
          if (aL.includes('chairman') && !aL.includes('vice')) return -1;
          if (bL.includes('chairman') && !bL.includes('vice')) return 1;
          if (aL.includes('vice chairman')) return -1;
          if (bL.includes('vice chairman')) return 1;
          return 0;
        });

        sortedGeneral.forEach(p => {
          const pCandidates = candidates.filter(c => c.post === p.post);
          if (pCandidates.length === 0) return;

          html += `
            <div class="post-box">
              <div class="post-title" style="background: #ccc; color: #000; border-bottom: 1px solid #000;">${esc(p.post.toUpperCase())}</div>
              ${pCandidates.map((c, i) => `
                <div class="candidate-row">
                  <div class="sl-no">${i + 1}</div>
                  <div class="c-name">
                    <div style="font-size: 12px; text-transform: uppercase;">${esc(c.candidateName)}</div>
                    <div style="font-size: 10px; font-weight: normal; color: #444;">${esc(c.candidateClass)}</div>
                  </div>
                  <div class="stamp-box"></div>
                </div>
              `).join('')}
              <!-- NOTA Entry -->
              <div class="candidate-row">
                <div class="sl-no">${pCandidates.length + 1}</div>
                <div class="c-name">
                  <div style="font-size: 12px; text-transform: uppercase;">NOTA</div>
                </div>
                <div class="stamp-box"></div>
              </div>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      }
    }

    // 2. Year Rep Ballots (One per page)
    if (filterType === 'all' || filterType === 'year') {
      const yearPosts = posts.filter(isYear);
      yearPosts.forEach(p => {
        const pCandidates = candidates.filter(c => c.post === p.post);
        if (pCandidates.length === 0) return;

        html += `
          <div class="ballot-container page-break">
            <div class="ballot-header">
              <h1 style="font-size: 18px;">COLLEGE UNION ELECTION ${new Date().getFullYear()}</h1>
              <h1 style="font-size: 16px;">GOVERNMENT VICTORIA COLLEGE PALAKKAD</h1>
              <h2 style="font-size: 15px; margin-top: 5px; font-weight: bold;">BALLOT PAPER</h2>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold; font-size: 14px;">
              <div>SL.NO. ____________</div>
              <div>Signature of PRO</div>
            </div>

            <div style="text-align: center; border: 1px solid #000; padding: 5px; margin-bottom: 20px; font-weight: bold; font-size: 13px; text-transform: uppercase;">
              MARK THE VOTER'S CHOICE WITH THE MARKING SEAL IN THE SPACE PROVIDED
            </div>

            <div style="max-width: 500px; margin: 0 auto; border: 2px solid #000;">
              <div class="post-title" style="background: #ccc; color: #000; border-bottom: 1px solid #000; text-align: center; padding: 5px; font-weight: bold;">${esc(p.post.toUpperCase())}</div>
              ${pCandidates.map((c, i) => `
                <div class="candidate-row">
                  <div class="sl-no">${i + 1}</div>
                  <div class="c-name">
                    <div style="font-size: 12px; text-transform: uppercase;">${esc(c.candidateName)}</div>
                    <div style="font-size: 10px; font-weight: normal; color: #444;">${esc(c.candidateClass)}</div>
                  </div>
                  <div class="stamp-box"></div>
                </div>
              `).join('')}
              <div class="candidate-row">
                <div class="sl-no">${pCandidates.length + 1}</div>
                <div class="c-name">
                  <div style="font-size: 12px; text-transform: uppercase;">NOTA</div>
                </div>
                <div class="stamp-box"></div>
              </div>
            </div>
          </div>
        `;
      });
    }

    // 3. Association Ballots (One per page)
    if (filterType === 'all' || filterType === 'assoc') {
      const assocPosts = posts.filter(isAssoc);
      assocPosts.forEach(p => {
        const pCandidates = candidates.filter(c => c.post === p.post);
        if (pCandidates.length === 0) return;

        html += `
          <div class="ballot-container page-break">
            <div class="ballot-header">
              <h1 style="font-size: 18px;">COLLEGE UNION ELECTION ${new Date().getFullYear()}</h1>
              <h1 style="font-size: 16px;">GOVERNMENT VICTORIA COLLEGE PALAKKAD</h1>
              <h2 style="font-size: 15px; margin-top: 5px; font-weight: bold;">BALLOT PAPER</h2>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold; font-size: 14px;">
              <div>SL.NO. ____________</div>
              <div>Signature of PRO</div>
            </div>

            <div style="text-align: center; border: 1px solid #000; padding: 5px; margin-bottom: 20px; font-weight: bold; font-size: 13px; text-transform: uppercase;">
              MARK THE VOTER'S CHOICE WITH THE MARKING SEAL IN THE SPACE PROVIDED
            </div>

            <div style="max-width: 500px; margin: 0 auto; border: 2px solid #000;">
              <div class="post-title" style="background: #ccc; color: #000; border-bottom: 1px solid #000; text-align: center; padding: 5px; font-weight: bold;">${esc(p.post.toUpperCase())}</div>
              ${pCandidates.map((c, i) => `
                <div class="candidate-row">
                  <div class="sl-no">${i + 1}</div>
                  <div class="c-name">
                    <div style="font-size: 12px; text-transform: uppercase;">${esc(c.candidateName)}</div>
                    <div style="font-size: 10px; font-weight: normal; color: #444;">${esc(c.candidateClass)}</div>
                  </div>
                  <div class="stamp-box"></div>
                </div>
              `).join('')}
              <div class="candidate-row">
                <div class="sl-no">${pCandidates.length + 1}</div>
                <div class="c-name">
                  <div style="font-size: 12px; text-transform: uppercase;">NOTA</div>
                </div>
                <div class="stamp-box"></div>
              </div>
            </div>
          </div>
        `;
      });
    }

    html += '</div>';
    return html;
  };

  const triggerPrint = (html) => {
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html>
        <head>
          <title>Print Ballots - GVC Election</title>
          <style>
            @media print {
              .no-print { display: none !important; }
              .page-break { page-break-after: always; }
            }
            body { margin: 0; padding: 0; background: #eee; }
            .ballot-container {
              background: white;
              color: black;
              padding: 40px;
              font-family: "Times New Roman", Times, serif;
              width: 210mm;
              min-height: 297mm;
              margin: 20px auto;
              box-shadow: 0 0 10px rgba(0,0,0,0.2);
              box-sizing: border-box;
            }
            @media print {
              body { background: white; }
              .ballot-container { margin: 0; box-shadow: none; width: 100%; }
            }
            .ballot-header { text-align: center; border-bottom: 3px double #000; margin-bottom: 30px; padding-bottom: 10px; }
            .ballot-header h1 { font-size: 18px; margin: 0; text-transform: uppercase; }
            .ballot-header h2 { font-size: 15px; margin: 5px 0 0 0; }
            .ballot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .post-box { border: 2px solid #000; padding: 0; display: flex; flex-direction: column; margin-bottom: 10px; break-inside: avoid; }
            .post-title { background: #ccc; color: #000; text-align: center; padding: 5px; font-weight: bold; font-size: 13px; text-transform: uppercase; border-bottom: 1px solid #000; }
            .candidate-row { display: flex; align-items: center; border-bottom: 1px solid #000; height: 50px; }
            .candidate-row:last-child { border-bottom: none; }
            .sl-no { width: 30px; text-align: center; border-right: 1px solid #000; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
            .c-name { flex-grow: 1; padding: 0 10px; font-weight: bold; display: flex; flex-direction: column; justify-content: center; }
            .stamp-box { width: 60px; height: 100%; border-left: 1px solid #000; display: flex; align-items: center; justify-content: center; position: relative; }
            .stamp-box::after { content: ""; width: 30px; height: 30px; border: 1px dashed #ccc; border-radius: 4px; }
          </style>
        </head>
        <body>
          ${html}
          <script>
            // Wait for images if any, then print
            window.onload = () => {
              // window.print(); 
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
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

  main.querySelector('#btnPrintBallots').onclick = async (e) => {
    try {
      setLoading(e.target, true, 'Generating...');
      const html = await generateBallotsHTML('all');
      triggerPrint(html);
      setLoading(e.target, false, '🖨️ Generate All Ballots');
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(e.target, false, '🖨️ Generate All Ballots');
    }
  };
}
