/**
 * ballots.js
 * Professional ballot printing for General, Year Rep, and Association posts.
 */
import { api } from '../../api.js';
import { renderAdminLayout } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

export function renderAdminBallots(container) {
  const pwd = sessionStorage.getItem('adminPassword');
  if (!pwd) { window.location.hash = '/admin'; return; }

  renderAdminLayout(container, 'Ballot Printing');
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
    const [posts, candidates] = await Promise.all([
      api.adminGetPosts(pwd),
      api.getFinalNominations()
    ]);

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
              <h1>COLLEGE UNION ELECTION 2026-27</h1>
              <h2>OFFICIAL BALLOT PAPER — GENERAL UNION</h2>
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
          return 0; // Keep original relative order
        });

        sortedGeneral.forEach(p => {
          const pCandidates = candidates.filter(c => c.post === p.post);
          if (pCandidates.length === 0) return;

          // Chairman and Vice Chairman take half grid each in first row
          const isTop = p.post.toLowerCase().includes('chairman');
          const boxClass = isTop ? 'post-box' : 'post-box';
          
          html += `
            <div class="${boxClass}">
              <div class="post-title">${esc(p.post)}</div>
              ${pCandidates.map((c, i) => `
                <div class="candidate-row">
                  <div class="sl-no">${i + 1}</div>
                  <div class="c-name">${esc(c.candidateName)}</div>
                  <div class="stamp-box"></div>
                </div>
              `).join('')}
            </div>
          `;
        });

        html += `
            </div>
            <div class="ballot-footer">
              <div>Facsimile of Returning Officer</div>
              <div>Series: GEN-${Date.now().toString().slice(-6)}</div>
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
              <h1>COLLEGE UNION ELECTION 2026-27</h1>
              <h2>BALLOT PAPER — ${esc(p.post.toUpperCase())}</h2>
            </div>
            <div style="max-width: 500px; margin: 0 auto; border: 2px solid #000; padding: 20px;">
              <div class="post-title">${esc(p.post)}</div>
              ${pCandidates.map((c, i) => `
                <div class="candidate-row">
                  <div class="sl-no">${i + 1}</div>
                  <div class="c-name">${esc(c.candidateName)}</div>
                  <div class="stamp-box"></div>
                </div>
              `).join('')}
            </div>
            <div class="ballot-footer">
              <div>Facsimile of Returning Officer</div>
              <div>Series: YR-${Date.now().toString().slice(-6)}</div>
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
              <h1>COLLEGE UNION ELECTION 2026-27</h1>
              <h2>BALLOT PAPER — ASSOCIATION</h2>
            </div>
            <div style="max-width: 500px; margin: 0 auto; border: 2px solid #000; padding: 20px;">
              <div class="post-title">${esc(p.post)}</div>
              ${pCandidates.map((c, i) => `
                <div class="candidate-row">
                  <div class="sl-no">${i + 1}</div>
                  <div class="c-name">${esc(c.candidateName)}</div>
                  <div class="stamp-box"></div>
                </div>
              `).join('')}
            </div>
            <div class="ballot-footer" style="margin-top: 100px;">
              <div>Facsimile of Returning Officer</div>
              <div>Series: ASC-${Date.now().toString().slice(-6)}</div>
            </div>
          </div>
        `;
      });
    }

    html += '</div>';
    return html;
  };

  const handlePreview = async (type) => {
    try {
      showToast('Generating preview...', 'info');
      const html = await generateBallotsHTML(type);
      previewArea.innerHTML = `
        <div class="flex justify-between items-center mb-6 no-print">
          <h3 class="text-white font-bold">Ballot Preview</h3>
          <button id="btnPrintNow" class="btn btn-success btn-sm">🖨️ Print This Preview</button>
        </div>
        <div class="scale-75 origin-top">
          ${html}
        </div>
      `;
      previewArea.classList.remove('hidden');
      previewArea.querySelector('#btnPrintNow').onclick = () => window.print();
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
      
      // Temporary injection for printing
      const oldPrint = document.getElementById('printSection');
      if (oldPrint) oldPrint.remove();
      document.body.insertAdjacentHTML('beforeend', html);
      
      window.print();
      setLoading(e.target, false, '🖨️ Generate All Ballots');
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(e.target, false, '🖨️ Generate All Ballots');
    }
  };
}
