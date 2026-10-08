import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

/**
 * 2 Receipts per A4 Landscape sheet generator
 * For Govt. Victoria College, Palakkad
 * Fixes:
 *  - Added missing utility classes: .flex-1, .w-full, .ml-1, .ml-2, .ml-3, .ml-4, .font-bold, .font-mono
 *  - Ensured all fields (Name, Class & Sem, Dept, Adm No, Roll No, Post, Constituency) have proper, visible, full-width dotted lines
 *  - Uniform dotted border styling (#334155, 1.4px dotted)
 */
function generateLandscapeReceiptHTML({
  count = 500,
  startSl = 1,
  collegeName = 'GOVERNMENT VICTORIA COLLEGE',
  collegeShort = 'GOVT. VICTORIA COLLEGE, PALAKKAD',
  collegeAffil = 'Palakkad, Kerala &bull; Affiliated to the University of Calicut (Est. 1857)',
  signInst = 'Government Victoria College, Palakkad',
  electionTitle = 'COLLEGE UNION ELECTION 2026–2027',
  watermarkText = 'GVC ELECTION 2026',
  receiptsPerBook = 50,
  feeAmount = '50.00',
  feeWords = 'Rupees Fifty Only'
}) {
  const perPage = 2;
  const numPages = Math.ceil(count / perPage);

  let pagesHtml = '';
  let currentSlNo = startSl;

  for (let p = 0; p < numPages; p++) {
    let receiptsHtml = '';

    for (let r = 0; r < perPage; r++) {
      if (currentSlNo > startSl + count - 1) break;

      const slStr = String(currentSlNo).padStart(3, '0');
      const bookNumber = String(Math.floor((currentSlNo - 1) / receiptsPerBook) + 1).padStart(2, '0');
      const isLastOnPage = r === perPage - 1;

      receiptsHtml += `
      <div class="receipt-wrapper-ls2">
        <div class="receipt-item ls2-item">
          <!-- BINDING MARGIN / STUB (LEFT) -->
          <div class="binding-stub-ls">
            <div class="punch-guide-ls">
              <div class="punch-hole-ls"></div>
              <div class="punch-txt-ls">BINDING</div>
            </div>
            <div class="stub-label-ls">STAPLE / STITCH MARGIN</div>
            <div class="punch-guide-ls">
              <div class="punch-hole-ls"></div>
              <div class="punch-txt-ls">BINDING</div>
            </div>
          </div>

          <!-- COUNTERFOIL (LEFT) -->
          <div class="counterfoil-ls2">
            <div class="cf-head-ls2">
              <div class="cf-inst-ls2">${collegeShort}</div>
              <div class="cf-sub-ls2">${electionTitle}</div>
              <div class="cf-badge-row-ls2">
                <span class="cf-badge-ls2">OFFICE COUNTERFOIL</span>
                <span class="cf-amt-badge-ls2">₹ ${feeAmount}</span>
              </div>
            </div>

            <div class="cf-meta-ls2">
              <div class="cf-meta-cell">
                <span class="meta-k">Sl. No:</span>
                <span class="sl-box-ls2 font-mono font-bold">${slStr}</span>
              </div>
              <div class="cf-meta-cell">
                <span class="meta-k">Book:</span>
                <span class="meta-v font-bold">${bookNumber}</span>
              </div>
              <div class="cf-meta-cell">
                <span class="meta-k">Date:</span>
                <span class="dotted-fill font-mono" style="width:58px;"></span>
              </div>
            </div>

            <div class="cf-fields-ls2">
              <div class="f-row">
                <span class="f-tag">Candidate:</span>
                <span class="dotted-fill flex-1"></span>
              </div>
              <div class="f-row">
                <span class="f-tag">Adm No:</span>
                <span class="dotted-fill" style="width:55px;"></span>
                <span class="f-tag ml-2">Roll No:</span>
                <span class="dotted-fill flex-1"></span>
              </div>
              <div class="f-row">
                <span class="f-tag">Class &amp; Sem:</span>
                <span class="dotted-fill flex-1"></span>
              </div>
              <div class="f-row">
                <span class="f-tag">Dept / Sub:</span>
                <span class="dotted-fill flex-1"></span>
              </div>
              <div class="f-row">
                <span class="f-tag">Post Nominated:</span>
                <span class="dotted-fill flex-1"></span>
              </div>
              <div class="f-row amt-row-cf">
                <span class="f-tag">Fee Remitted:</span>
                <span class="amt-bold-txt">₹ ${feeAmount}</span>
                <span class="amt-words-sm">(${feeWords})</span>
              </div>
            </div>

            <div class="cf-foot-ls2">
              <div class="cf-sign-col-full">
                <div class="cf-dash"></div>
                <div class="cf-sign-name">Returning Officer / Asst. RO Initials</div>
                <div class="cf-sign-sub">(Office Record &amp; Verification)</div>
              </div>
            </div>
          </div>

          <!-- PERFORATION DIVIDER -->
          <div class="perforation-divider-ls">
            <div class="cut-icon-ls">✂</div>
            <div class="perf-line-ls"></div>
            <div class="perf-txt-ls">✂ PERFORATE / TEAR HERE ✂</div>
            <div class="perf-line-ls"></div>
            <div class="cut-icon-ls">✂</div>
          </div>

          <!-- MAIN RECEIPT (RIGHT - CANDIDATE COPY) -->
          <div class="main-receipt-ls2">
            <div class="watermark-ls">${watermarkText}</div>

            <div class="mr-top-ls2">
              <div class="mr-title-block-ls2">
                <div class="inst-name-ls2">${collegeName}</div>
                <div class="inst-affil-ls2">${collegeAffil}</div>
                <div class="election-title-ls2">${electionTitle} &bull; OFFICE OF THE RETURNING OFFICER</div>
              </div>

              <div class="mr-badge-cluster-ls2">
                <span class="mr-receipt-badge-ls2">NOMINATION PAPER FEE RECEIPT</span>
                <span class="mr-copy-tag-ls2">ORIGINAL &bull; CANDIDATE COPY</span>
              </div>
            </div>

            <div class="mr-meta-strip-ls2">
              <div class="meta-strip-cell">
                <span class="strip-k">BOOK NO:</span>
                <span class="strip-v font-bold">${bookNumber}</span>
              </div>
              <div class="meta-strip-cell highlight-sl">
                <span class="strip-k">RECEIPT SL. NO:</span>
                <span class="strip-sl font-mono font-bold">${slStr}</span>
              </div>
              <div class="meta-strip-cell">
                <span class="strip-k">DATE OF ISSUE:</span>
                <span class="dotted-fill font-mono" style="width:75px;"></span>
              </div>
            </div>

            <div class="mr-body-ls2">
              <div class="body-row-ls2">
                <span class="lead-prompt">Received with thanks from Shri / Smt.</span>
                <span class="dotted-fill flex-1"></span>
              </div>

              <div class="body-row-ls2">
                <span class="lead-prompt">Class &amp; Semester:</span>
                <span class="dotted-fill" style="width:190px;"></span>
                <span class="lead-prompt ml-4">Department / Subject:</span>
                <span class="dotted-fill flex-1"></span>
              </div>

              <div class="body-row-ls2">
                <span class="lead-prompt">Admission No:</span>
                <span class="dotted-fill" style="width:170px;"></span>
                <span class="lead-prompt ml-4">College Roll No:</span>
                <span class="dotted-fill flex-1"></span>
              </div>

              <div class="body-row-ls2">
                <span class="lead-prompt">Nomination for Election to the Post of:</span>
                <span class="dotted-fill flex-1"></span>
              </div>

              <div class="body-row-ls2">
                <span class="lead-prompt">Department / Constituency:</span>
                <span class="dotted-fill flex-1"></span>
                <span class="lead-prompt ml-4">Fee Remitted:</span>
                <span class="lead-prompt font-bold text-emerald-800">Rupees Fifty Only (₹ ${feeAmount})</span>
              </div>

              <div class="mr-endorsement-box">
                <div class="endorsement-line">
                  <span>&bull; Head of Account: <strong>Nomination Paper Fee / Security Deposit</strong></span>
                  <span class="end-sep">&bull;</span>
                  <span>Amount: <strong>₹ ${feeAmount}</strong> (${feeWords})</span>
                  <span class="end-sep">&bull;</span>
                  <span>Valid with Signature of Returning Officer</span>
                </div>
              </div>
            </div>

            <div class="mr-foot-ls2">
              <div class="amt-badge-ls2">
                <div class="amt-title">AMOUNT RECEIVED</div>
                <div class="amt-val-ls2">₹ ${feeAmount}</div>
                <div class="amt-lbl-ls2">RUPEES FIFTY ONLY</div>
              </div>

              <div class="ro-sign-ls2">
                <div class="sign-space-ls"></div>
                <div class="sign-rule-ls"></div>
                <div class="sign-desig-ls">RETURNING OFFICER / ASSISTANT RETURNING OFFICER</div>
                <div class="sign-sub-ls">${electionTitle}</div>
                <div class="sign-inst-ls">${signInst}</div>
              </div>
            </div>
          </div>
        </div>

        ${!isLastOnPage ? `
        <div class="cut-guide-ls2">
          <span class="cut-icon">✂</span>
          <div class="cut-dash"></div>
          <span class="cut-txt">CUT ALONG THIS LINE TO SEPARATE RECEIPTS</span>
          <div class="cut-dash"></div>
          <span class="cut-icon">✂</span>
        </div>
        ` : ''}
      </div>
      `;

      currentSlNo++;
    }

    pagesHtml += `
    <div class="page page-ls2">
      ${receiptsHtml}
    </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt Book - Govt. Victoria College (A4 Landscape)</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #525659;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }

    /* Core layout and utility classes */
    .flex-1 { flex: 1 !important; }
    .w-full { width: 100% !important; }
    .font-bold { font-weight: 700 !important; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }
    .ml-1 { margin-left: 1mm !important; }
    .ml-2 { margin-left: 2mm !important; }
    .ml-3 { margin-left: 3mm !important; }
    .ml-4 { margin-left: 4mm !important; }
    .text-emerald-800 { color: #065f46 !important; }

    .page {
      width: 297mm;
      height: 210mm;
      margin: 0 auto;
      background: #ffffff;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      page-break-after: always;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 6.5mm 8mm 5.5mm 8mm;
    }

    @media print {
      body { background: transparent; }
      .page {
        box-shadow: none;
        margin: 0;
        width: 297mm;
        height: 210mm;
      }
    }

    .receipt-wrapper-ls2 {
      display: flex;
      flex-direction: column;
      height: 97mm;
    }

    .receipt-item.ls2-item {
      display: flex;
      height: 93.5mm;
      border: 1.5px solid #0f172a;
      border-radius: 4px;
      overflow: hidden;
      background: #ffffff;
      position: relative;
    }

    /* BINDING MARGIN / STUB */
    .binding-stub-ls {
      width: 14mm;
      background: #f8fafc;
      border-right: 1px dashed #64748b;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 3mm 0;
      user-select: none;
    }

    .punch-guide-ls {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1mm;
    }

    .punch-hole-ls {
      width: 5mm;
      height: 5mm;
      border-radius: 50%;
      border: 1px dashed #94a3b8;
      background: #ffffff;
    }

    .punch-txt-ls {
      font-size: 4.5pt;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.5px;
    }

    .stub-label-ls {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: 5pt;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    /* COUNTERFOIL (LEFT) */
    .counterfoil-ls2 {
      width: 78mm;
      padding: 4mm 4.5mm 3.5mm 4.5mm;
      display: flex;
      flex-direction: column;
      background: #fdfdfd;
      border-right: 1.5px dashed #0f172a;
      position: relative;
    }

    .cf-head-ls2 {
      border-bottom: 1.2px solid #0f172a;
      padding-bottom: 1.8mm;
      margin-bottom: 1.8mm;
    }

    .cf-inst-ls2 {
      font-size: 7.8pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    .cf-sub-ls2 {
      font-size: 5.6pt;
      font-weight: 700;
      color: #475569;
      margin-top: 0.4mm;
    }

    .cf-badge-row-ls2 {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.2mm;
    }

    .cf-badge-ls2 {
      font-size: 5.2pt;
      font-weight: 800;
      background: #0f172a;
      color: #ffffff;
      padding: 0.5mm 1.8mm;
      border-radius: 2px;
      letter-spacing: 0.5px;
    }

    .cf-amt-badge-ls2 {
      font-size: 6.8pt;
      font-weight: 900;
      color: #047857;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 0.4mm 1.8mm;
      border-radius: 2px;
    }

    .cf-meta-ls2 {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 2px;
      padding: 1.2mm 2mm;
      margin-bottom: 2.2mm;
    }

    .cf-meta-cell {
      display: flex;
      align-items: flex-end;
      gap: 1mm;
      font-size: 6.2pt;
    }

    .meta-k {
      color: #475569;
      font-weight: 600;
      font-size: 5.5pt;
    }

    .meta-v {
      color: #0f172a;
    }

    .sl-box-ls2 {
      color: #b91c1c;
      font-size: 7.8pt;
      letter-spacing: 0.5px;
    }

    .cf-fields-ls2 {
      display: flex;
      flex-direction: column;
      gap: 2.2mm;
      flex: 1;
    }

    .f-row {
      display: flex;
      align-items: flex-end;
      font-size: 6.5pt;
      line-height: 1.1;
      width: 100%;
    }

    .f-tag {
      font-weight: 700;
      color: #334155;
      font-size: 6.2pt;
      white-space: nowrap;
      margin-right: 1.5mm;
    }

    .dotted-fill {
      border-bottom: 1.4px dotted #334155 !important;
      min-height: 4mm;
      display: inline-block;
    }

    .amt-row-cf {
      background: #ecfdf5;
      border: 1px solid #d1fae5;
      border-radius: 2px;
      padding: 1mm 1.8mm;
      margin-top: 1mm;
      align-items: center;
    }

    .amt-bold-txt {
      font-weight: 900;
      font-size: 7.2pt;
      color: #065f46;
      margin-right: 2mm;
    }

    .amt-words-sm {
      font-size: 5.4pt;
      color: #047857;
      font-weight: 600;
    }

    .cf-foot-ls2 {
      display: flex;
      justify-content: center;
      border-top: 1.2px solid #e2e8f0;
      padding-top: 2.5mm;
      margin-top: auto;
    }

    .cf-sign-col-full {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    .cf-dash {
      width: 52mm;
      border-bottom: 1.4px dotted #0f172a;
      height: 5mm;
    }

    .cf-sign-name {
      font-size: 5.6pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 1mm;
      text-align: center;
    }

    .cf-sign-sub {
      font-size: 4.8pt;
      color: #64748b;
      margin-top: 0.3mm;
    }

    /* PERFORATION DIVIDER */
    .perforation-divider-ls {
      width: 4.5mm;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 1.5mm 0;
      border-right: 1.5px dashed #0f172a;
      user-select: none;
    }

    .cut-icon-ls {
      font-size: 6pt;
      color: #64748b;
    }

    .perf-line-ls {
      flex: 1;
      width: 0;
      border-right: 1px dotted #94a3b8;
    }

    .perf-txt-ls {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: 4pt;
      font-weight: 800;
      color: #94a3b8;
      letter-spacing: 0.8px;
      margin: 1.5mm 0;
    }

    /* MAIN RECEIPT (RIGHT - CANDIDATE COPY) */
    .main-receipt-ls2 {
      flex: 1;
      padding: 4mm 6mm 3.5mm 6mm;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      position: relative;
    }

    .watermark-ls {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-12deg);
      font-size: 34pt;
      font-weight: 900;
      color: rgba(15, 23, 42, 0.035);
      letter-spacing: 3px;
      pointer-events: none;
      white-space: nowrap;
      user-select: none;
    }

    .mr-top-ls2 {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 1.8mm;
      margin-bottom: 2mm;
    }

    .mr-title-block-ls2 {
      display: flex;
      flex-direction: column;
    }

    .inst-name-ls2 {
      font-size: 11.8pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.5px;
    }

    .inst-affil-ls2 {
      font-size: 6pt;
      color: #475569;
      font-weight: 500;
      margin-top: 0.4mm;
    }

    .election-title-ls2 {
      font-size: 7.2pt;
      font-weight: 800;
      color: #1e3a8a;
      margin-top: 1mm;
      letter-spacing: 0.3px;
    }

    .mr-badge-cluster-ls2 {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1.2mm;
    }

    .mr-receipt-badge-ls2 {
      font-size: 7pt;
      font-weight: 900;
      background: #0f172a;
      color: #ffffff;
      padding: 1mm 2.8mm;
      border-radius: 2px;
      letter-spacing: 0.5px;
    }

    .mr-copy-tag-ls2 {
      font-size: 5.4pt;
      font-weight: 800;
      color: #047857;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 0.4mm 1.8mm;
      border-radius: 2px;
      letter-spacing: 0.5px;
    }

    .mr-meta-strip-ls2 {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1.2px solid #cbd5e1;
      border-radius: 3px;
      padding: 1.4mm 3mm;
      margin-bottom: 2.8mm;
    }

    .meta-strip-cell {
      display: flex;
      align-items: flex-end;
      gap: 1.8mm;
      font-size: 7pt;
    }

    .strip-k {
      font-weight: 700;
      color: #475569;
      font-size: 6.2pt;
    }

    .strip-v {
      color: #0f172a;
    }

    .highlight-sl {
      background: #ffffff;
      border: 1.2px solid #f87171;
      border-radius: 2px;
      padding: 0.2mm 2.5mm;
    }

    .strip-sl {
      font-size: 9pt;
      color: #b91c1c;
      letter-spacing: 0.8px;
    }

    .mr-body-ls2 {
      display: flex;
      flex-direction: column;
      gap: 2.6mm;
      flex: 1;
    }

    .body-row-ls2 {
      display: flex;
      align-items: flex-end;
      font-size: 7.8pt;
      line-height: 1.15;
      width: 100%;
    }

    .lead-prompt {
      font-weight: 600;
      color: #334155;
      white-space: nowrap;
      margin-right: 1.8mm;
    }

    .mr-endorsement-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      padding: 1.4mm 2.5mm;
      margin-top: 1.5mm;
    }

    .endorsement-line {
      display: flex;
      justify-content: space-between;
      font-size: 6pt;
      color: #475569;
    }

    .end-sep {
      color: #cbd5e1;
    }

    .mr-foot-ls2 {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1.5px solid #0f172a;
      padding-top: 2.5mm;
      margin-top: auto;
    }

    .amt-badge-ls2 {
      border: 1.8px solid #047857;
      background: #f0fdf4;
      border-radius: 4px;
      padding: 1.5mm 3.5mm;
      text-align: center;
      min-width: 40mm;
    }

    .amt-title {
      font-size: 5.2pt;
      font-weight: 800;
      color: #047857;
      letter-spacing: 0.6px;
    }

    .amt-val-ls2 {
      font-size: 11.5pt;
      font-weight: 900;
      color: #065f46;
      line-height: 1.1;
      margin: 0.4mm 0;
    }

    .amt-lbl-ls2 {
      font-size: 5.2pt;
      font-weight: 800;
      color: #047857;
      letter-spacing: 0.6px;
    }

    .ro-sign-ls2 {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 75mm;
    }

    .sign-space-ls {
      height: 9mm;
    }

    .sign-rule-ls {
      width: 68mm;
      border-bottom: 1.4px solid #0f172a;
      margin-bottom: 1.2mm;
    }

    .sign-desig-ls {
      font-size: 6.8pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.4px;
    }

    .sign-sub-ls {
      font-size: 5.6pt;
      color: #475569;
      font-weight: 600;
    }

    .sign-inst-ls {
      font-size: 5.6pt;
      color: #64748b;
    }

    .cut-guide-ls2 {
      display: flex;
      align-items: center;
      gap: 2mm;
      height: 3.5mm;
      color: #64748b;
    }

    .cut-icon { font-size: 7pt; }
    .cut-dash { flex: 1; border-top: 1px dashed #94a3b8; }
    .cut-txt { font-size: 5.2pt; font-weight: 700; letter-spacing: 1px; }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
}

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('Generating 500 relaxed receipts (250 A4 Landscape sheets) for Govt. Victoria College...');
const html500 = generateLandscapeReceiptHTML({
  count: 500,
  startSl: 1,
  collegeName: 'GOVERNMENT VICTORIA COLLEGE',
  collegeShort: 'GOVT. VICTORIA COLLEGE, PALAKKAD',
  collegeAffil: 'Palakkad, Kerala &bull; Affiliated to the University of Calicut (Est. 1857)',
  signInst: 'Government Victoria College, Palakkad',
  electionTitle: 'COLLEGE UNION ELECTION 2026–2027',
  watermarkText: 'GVC ELECTION 2026',
  receiptsPerBook: 50,
  feeAmount: '50.00',
  feeWords: 'Rupees Fifty Only'
});

const htmlPath = resolve('scratch/receipt_ls2_500_gvc.html');
writeFileSync(htmlPath, html500);

const outPdf = resolve('Receipt_Book_Landscape_2_per_sheet_500_Victoria_College.pdf');
console.log('Rendering PDF via Headless Chrome...');
execSync(`"${chromePath}" --headless=new --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${outPdf}" --no-pdf-header-footer "file:///${htmlPath.replace(/\\\\/g, '/')}"`, {
  maxBuffer: 50 * 1024 * 1024
});

console.log('Successfully created:', outPdf);
