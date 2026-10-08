import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

function generateLandscapeReceiptHTML({ count = 100, bookNo = '01', startSl = 1 }) {
  const perPage = 2;
  const numPages = Math.ceil(count / perPage);

  let pagesHtml = '';
  let currentSlNo = startSl;

  for (let p = 0; p < numPages; p++) {
    let receiptsHtml = '';

    for (let r = 0; r < perPage; r++) {
      if (currentSlNo > startSl + count - 1) break;
      const slStr = String(currentSlNo).padStart(3, '0');
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
              <div class="cf-inst-ls2">GOVT. COLLEGE CHITTUR</div>
              <div class="cf-sub-ls2">COLLEGE UNION ELECTION 2026–2027</div>
              <div class="cf-badge-row-ls2">
                <span class="cf-badge-ls2">OFFICE COUNTERFOIL</span>
                <span class="cf-amt-badge-ls2">₹ 50.00</span>
              </div>
            </div>

            <div class="cf-meta-ls2">
              <div class="cf-meta-cell">
                <span class="meta-k">Sl. No:</span>
                <span class="sl-box-ls2 font-mono font-bold">${slStr}</span>
              </div>
              <div class="cf-meta-cell">
                <span class="meta-k">Book:</span>
                <span class="meta-v font-bold">${bookNo}</span>
              </div>
              <div class="cf-meta-cell">
                <span class="meta-k">Date:</span>
                <span class="meta-v font-mono">____/____/2026</span>
              </div>
            </div>

            <div class="cf-fields-ls2">
              <div class="f-row">
                <span class="f-tag">Candidate:</span>
                <span class="dotted-fill flex-1"></span>
              </div>
              <div class="f-row">
                <span class="f-tag">Adm No:</span>
                <span class="dotted-fill" style="width:45px;"></span>
                <span class="f-tag ml-1">Roll No:</span>
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
              <div class="f-row">
                <span class="f-tag">Mobile No:</span>
                <span class="dotted-fill flex-1"></span>
              </div>
              <div class="f-row amt-row-cf">
                <span class="f-tag">Fee:</span>
                <span class="amt-bold-txt">₹ 50.00</span>
                <span class="amt-words-sm">(Rupees Fifty Only)</span>
              </div>
            </div>

            <div class="cf-foot-ls2">
              <div class="cf-sign-col">
                <div class="cf-dash"></div>
                <div class="cf-sign-name">Candidate Signature</div>
                <div class="cf-sign-sub">(Acknowledgment)</div>
              </div>
              <div class="cf-sign-col">
                <div class="cf-dash"></div>
                <div class="cf-sign-name">RO / Officer Initials</div>
                <div class="cf-sign-sub">(Office Record)</div>
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
            <div class="watermark-ls">GCC ELECTION 2026</div>

            <div class="mr-top-ls2">
              <div class="mr-title-block-ls2">
                <div class="inst-name-ls2">GOVERNMENT COLLEGE CHITTUR</div>
                <div class="inst-affil-ls2">Chittur, Palakkad, Kerala &bull; Affiliated to the University of Calicut (Est. 1947)</div>
                <div class="election-title-ls2">COLLEGE UNION ELECTION 2026–2027 &bull; OFFICE OF THE RETURNING OFFICER</div>
              </div>

              <div class="mr-badge-cluster-ls2">
                <span class="mr-receipt-badge-ls2">NOMINATION PAPER FEE RECEIPT</span>
                <span class="mr-copy-tag-ls2">ORIGINAL &bull; CANDIDATE COPY</span>
              </div>
            </div>

            <div class="mr-meta-strip-ls2">
              <div class="meta-strip-cell">
                <span class="strip-k">BOOK NO:</span>
                <span class="strip-v font-bold">${bookNo}</span>
              </div>
              <div class="meta-strip-cell highlight-sl">
                <span class="strip-k">RECEIPT SL. NO:</span>
                <span class="strip-sl font-mono font-bold">${slStr}</span>
              </div>
              <div class="meta-strip-cell">
                <span class="strip-k">DATE OF ISSUE:</span>
                <span class="strip-v font-mono">_____ / _____ / 2026</span>
              </div>
            </div>

            <div class="mr-body-ls2">
              <div class="body-row-ls2">
                <span class="lead-prompt">Received with thanks from Shri / Smt.</span>
                <span class="dotted-fill flex-1"></span>
              </div>

              <div class="body-row-ls2">
                <span class="lead-prompt">Class &amp; Semester:</span>
                <span class="dotted-fill" style="width:145px;"></span>
                <span class="lead-prompt ml-2">Department / Subject:</span>
                <span class="dotted-fill flex-1"></span>
              </div>

              <div class="body-row-ls2">
                <span class="lead-prompt">Admission No:</span>
                <span class="dotted-fill" style="width:105px;"></span>
                <span class="lead-prompt ml-2">College Roll No:</span>
                <span class="dotted-fill" style="width:90px;"></span>
                <span class="lead-prompt ml-2">Contact Mobile:</span>
                <span class="dotted-fill flex-1"></span>
              </div>

              <div class="body-row-ls2">
                <span class="lead-prompt">Nomination for Election to the Post of:</span>
                <span class="dotted-fill flex-1 font-bold"></span>
              </div>

              <div class="body-row-ls2">
                <span class="lead-prompt">Department / Constituency:</span>
                <span class="dotted-fill" style="width:205px;"></span>
                <span class="lead-prompt ml-2">Fee Remitted:</span>
                <span class="lead-prompt font-bold text-emerald-800">Rupees Fifty Only (₹ 50.00)</span>
              </div>

              <div class="mr-endorsement-box">
                <div class="endorsement-line">
                  <span>&bull; Head of Account: <strong>Nomination Paper Fee / Security Deposit</strong></span>
                  <span class="end-sep">&bull;</span>
                  <span>Fee Amount: <strong>₹ 50.00</strong></span>
                  <span class="end-sep">&bull;</span>
                  <span>Valid with Official Seal &amp; Signature of Returning Officer</span>
                </div>
              </div>
            </div>

            <div class="mr-foot-ls2">
              <div class="amt-badge-ls2">
                <div class="amt-title">AMOUNT RECEIVED</div>
                <div class="amt-val-ls2">₹ 50.00</div>
                <div class="amt-lbl-ls2">RUPEES FIFTY ONLY</div>
              </div>

              <div class="seal-area-ls2">
                <div class="seal-inner-txt">OFFICIAL SEAL</div>
              </div>

              <div class="ro-sign-ls2">
                <div class="sign-space-ls"></div>
                <div class="sign-rule-ls"></div>
                <div class="sign-desig-ls">RETURNING OFFICER / ASSISTANT RO</div>
                <div class="sign-sub-ls">College Union Election 2026–2027</div>
                <div class="sign-inst-ls">Government College Chittur, Palakkad</div>
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
  <title>Receipt Book - Govt. College Chittur (A4 Landscape)</title>
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
      background: #f8fafc;
      color: #0f172a;
    }

    .page {
      width: 297mm;
      height: 210mm;
      background: #ffffff;
      margin: 0 auto;
      page-break-after: always;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .flex-1 { flex: 1; }
    .w-full { width: 100%; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; }
    .ml-1 { margin-left: 1mm; }
    .ml-2 { margin-left: 2mm; }
    .ml-3 { margin-left: 3mm; }
    .text-emerald-800 { color: #065f46; }

    .dotted-fill {
      border-bottom: 1.2px dotted #334155;
      min-height: 15px;
      display: inline-block;
    }

    .meta-k {
      color: #475569;
      font-weight: 700;
    }

    .page-ls2 {
      padding: 5mm 6.5mm;
      height: 210mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .receipt-wrapper-ls2 {
      display: flex;
      flex-direction: column;
      height: 98mm;
      justify-content: space-between;
    }

    .ls2-item {
      width: 100%;
      height: 95mm;
      border: 1.5px solid #0f172a;
      border-radius: 4px;
      display: flex;
      flex-direction: row;
      background: #ffffff;
      box-shadow: 0 0 0 1px #94a3b8;
      position: relative;
    }

    .binding-stub-ls {
      width: 11mm;
      background: #f8fafc;
      border-right: 1px dotted #94a3b8;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 6mm 0;
    }
    .punch-guide-ls {
      text-align: center;
    }
    .punch-hole-ls {
      width: 6.5px;
      height: 6.5px;
      border-radius: 50%;
      border: 1.2px solid #64748b;
      margin: 0 auto 1px;
    }
    .punch-txt-ls {
      font-size: 4.8pt;
      color: #94a3b8;
      font-weight: 700;
    }
    .stub-label-ls {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: 6pt;
      color: #94a3b8;
      letter-spacing: 1.5px;
      font-weight: 700;
    }

    /* Counterfoil Left */
    .counterfoil-ls2 {
      width: 76mm;
      height: 100%;
      padding: 2.5mm 3.5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #fafafa;
    }
    .cf-head-ls2 {
      text-align: center;
      border-bottom: 1.2px solid #cbd5e1;
      padding-bottom: 1mm;
      margin-bottom: 1mm;
    }
    .cf-inst-ls2 {
      font-size: 8pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.3px;
      line-height: 1.15;
    }
    .cf-sub-ls2 {
      font-size: 6.2pt;
      font-weight: 600;
      color: #475569;
    }
    .cf-badge-row-ls2 {
      display: flex;
      justify-content: center;
      gap: 2mm;
      align-items: center;
      margin-top: 0.8mm;
    }
    .cf-badge-ls2 {
      font-size: 5.8pt;
      font-weight: 800;
      background: #e2e8f0;
      color: #1e293b;
      padding: 1px 5px;
      border-radius: 2px;
    }
    .cf-amt-badge-ls2 {
      font-size: 6.2pt;
      font-weight: 900;
      background: #dcfce7;
      color: #15803d;
      padding: 1px 4px;
      border-radius: 2px;
      border: 1px solid #86efac;
    }

    .cf-meta-ls2 {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 1.2mm 2.2mm;
      border-radius: 3px;
      font-size: 7.2pt;
    }
    .cf-meta-cell {
      display: flex;
      align-items: center;
      gap: 1mm;
    }
    .sl-box-ls2 {
      font-size: 8.5pt;
      color: #b91c1c;
    }

    /* Counterfoil Fields: spread vertically */
    .cf-fields-ls2 {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      flex: 1;
      font-size: 7.5pt;
      padding: 1mm 0;
    }
    .f-row {
      display: flex;
      align-items: flex-end;
      gap: 1mm;
      height: 6.2mm;
    }
    .f-tag {
      color: #334155;
      font-weight: 600;
      white-space: nowrap;
      font-size: 7.2pt;
    }
    .amt-row-cf {
      align-items: center;
      background: #f0fdf4;
      padding: 0.5mm 1mm;
      border-radius: 2px;
      border: 1px solid #bbf7d0;
    }
    .amt-bold-txt {
      font-weight: 900;
      color: #047857;
      font-size: 8.5pt;
    }
    .amt-words-sm {
      font-size: 6pt;
      color: #64748b;
    }

    .cf-foot-ls2 {
      display: flex;
      justify-content: space-between;
      gap: 2mm;
      height: 25mm;
      padding-top: 1.5mm;
      border-top: 1px dashed #cbd5e1;
    }
    .cf-sign-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      text-align: center;
    }
    .cf-dash {
      border-bottom: 1px solid #475569;
      height: 12mm;
      margin-bottom: 1.2mm;
    }
    .cf-sign-name {
      font-size: 6pt;
      font-weight: 700;
      color: #334155;
      line-height: 1.1;
    }
    .cf-sign-sub {
      font-size: 5pt;
      color: #64748b;
      margin-top: 0.5px;
    }

    /* Perforation Divider */
    .perforation-divider-ls {
      width: 6mm;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 1.5mm 0;
      background: #ffffff;
    }
    .cut-icon-ls {
      font-size: 8.5pt;
      color: #475569;
    }
    .perf-line-ls {
      flex: 1;
      border-left: 1.5px dashed #64748b;
      margin: 1mm 0;
    }
    .perf-txt-ls {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: 5pt;
      color: #64748b;
      letter-spacing: 1.5px;
      font-weight: 700;
      padding: 2mm 0;
    }

    /* Main Receipt (Right) */
    .main-receipt-ls2 {
      flex: 1;
      height: 100%;
      padding: 2.5mm 5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      background: #ffffff;
    }
    .watermark-ls {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-10deg);
      font-size: 40pt;
      font-weight: 900;
      color: rgba(15, 23, 42, 0.025);
      letter-spacing: 6px;
      pointer-events: none;
      white-space: nowrap;
      user-select: none;
    }

    .mr-top-ls2 {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 1mm;
      margin-bottom: 1mm;
    }
    .inst-name-ls2 {
      font-family: Georgia, serif;
      font-size: 12pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      line-height: 1.1;
    }
    .inst-affil-ls2 {
      font-size: 7.2pt;
      color: #475569;
      font-style: italic;
    }
    .election-title-ls2 {
      font-size: 8pt;
      font-weight: 800;
      color: #1e3a8a;
      margin-top: 0.5px;
      letter-spacing: 0.3px;
    }
    .mr-badge-cluster-ls2 {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1mm;
    }
    .mr-receipt-badge-ls2 {
      background: #0f172a;
      color: #ffffff;
      font-size: 8pt;
      font-weight: 800;
      padding: 1.5px 7px;
      border-radius: 2px;
      letter-spacing: 0.4px;
    }
    .mr-copy-tag-ls2 {
      font-size: 6.8pt;
      font-weight: 700;
      color: #dc2626;
      border: 1px solid #dc2626;
      padding: 0.5px 4px;
      border-radius: 2px;
      letter-spacing: 0.3px;
    }

    .mr-meta-strip-ls2 {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 1.2mm 3.5mm;
      border-radius: 3px;
      font-size: 8pt;
      margin-bottom: 1mm;
    }
    .meta-strip-cell {
      display: flex;
      align-items: center;
      gap: 1.2mm;
    }
    .strip-k {
      color: #475569;
      font-weight: 700;
      font-size: 7.5pt;
    }
    .strip-sl {
      font-size: 10.5pt;
      color: #b91c1c;
      background: #fee2e2;
      padding: 0 5px;
      border-radius: 2px;
      border: 1px solid #fca5a5;
    }

    /* THE BODY: each row has comfortable handwriting height */
    .mr-body-ls2 {
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: space-between;
      font-size: 8.8pt;
      padding: 0.5mm 0 1.5mm;
    }
    .body-row-ls2 {
      display: flex;
      align-items: flex-end;
      gap: 1.5mm;
      height: 6.8mm;
    }
    .lead-prompt {
      color: #0f172a;
      white-space: nowrap;
      font-weight: 500;
    }

    .mr-endorsement-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      padding: 1.2mm 3mm;
      font-size: 6.6pt;
      color: #334155;
      margin-top: 0.5mm;
    }
    .endorsement-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5mm;
    }
    .end-sep {
      color: #94a3b8;
      font-size: 7pt;
    }

    /* THE FOOTER: 25mm tall, perfectly balanced horizontally */
    .mr-foot-ls2 {
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      height: 25mm;
      padding-top: 1.5mm;
      border-top: 1.2px solid #cbd5e1;
      gap: 4mm;
    }
    .amt-badge-ls2 {
      border: 1.5px solid #059669;
      background: #ecfdf5;
      padding: 2mm 4mm;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-width: 48mm;
    }
    .amt-title {
      font-size: 5.5pt;
      font-weight: 800;
      color: #047857;
      letter-spacing: 0.5px;
    }
    .amt-val-ls2 {
      font-size: 13.5pt;
      font-weight: 900;
      color: #065f46;
      line-height: 1.1;
      margin: 0.5mm 0;
    }
    .amt-lbl-ls2 {
      font-size: 5.5pt;
      font-weight: 800;
      color: #047857;
      letter-spacing: 0.3px;
    }

    .seal-area-ls2 {
      width: 32mm;
      height: 23.5mm;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 1.5mm;
    }
    .seal-inner-txt {
      font-size: 6.8pt;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.8px;
    }

    .ro-sign-ls2 {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      text-align: center;
      min-width: 80mm;
    }
    .sign-space-ls {
      height: 12mm;
    }
    .sign-rule-ls {
      border-bottom: 1.2px solid #0f172a;
      margin-bottom: 1.2mm;
    }
    .sign-desig-ls {
      font-size: 7.8pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.3px;
      line-height: 1.15;
    }
    .sign-sub-ls {
      font-size: 6.5pt;
      font-weight: 600;
      color: #475569;
    }
    .sign-inst-ls {
      font-size: 6.5pt;
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

console.log('Rendering 50-sheet (100 receipts) Landscape PDF for Government College Chittur...');

const html100 = generateLandscapeReceiptHTML({ count: 100, bookNo: '01', startSl: 1 });
writeFileSync(resolve('scratch/receipt_ls2_100_perfect.html'), html100);

const outLS2_100 = resolve('Receipt_Book_Landscape_2_per_sheet_100_Receipts.pdf');
execSync(`"${chromePath}" --headless=new --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${outLS2_100}" --no-pdf-header-footer "file:///${resolve('scratch/receipt_ls2_100_perfect.html').replace(/\\\\/g, '/')}"`);
console.log('Rendered 100 receipts (50 sheets):', outLS2_100);

const htmlBlank = generateLandscapeReceiptHTML({ count: 2, bookNo: '___', startSl: 1, isBlank: true });
writeFileSync(resolve('scratch/receipt_ls2_blank_perfect.html'), htmlBlank);

const outBlank = resolve('Receipt_Book_Landscape_2_per_sheet_Blank.pdf');
execSync(`"${chromePath}" --headless=new --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${outBlank}" --no-pdf-header-footer "file:///${resolve('scratch/receipt_ls2_blank_perfect.html').replace(/\\\\/g, '/')}"`);
console.log('Rendered blank template:', outBlank);

console.log('All PDF files rendered successfully!');
