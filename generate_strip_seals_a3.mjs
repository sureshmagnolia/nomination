import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const emblemDataUrl = 'images/gcc_logo_emblem_golden.png';

const TOTAL_SEALS = 30;
const SEALS_PER_PAGE = 3;
const TOTAL_PAGES = Math.ceil(TOTAL_SEALS / SEALS_PER_PAGE);

function buildStripSealHtml(slNum) {
  const padSl = String(slNum).padStart(3, '0');
  const fullCode = `GCC-CUE2026-SS-${padSl}`;

  return `
    <div class="strip-seal-wrapper">
      <div class="strip-seal">
        
        <!-- Top Micro-Security Border -->
        <div class="micro-border-top">
          GOVERNMENT COLLEGE CHITTUR &bull; COLLEGE UNION ELECTION 2026 &bull; BALLOT BOX APERTURE STRIP SEAL &bull; SECURITY BAND &bull; GOVERNMENT COLLEGE CHITTUR &bull; COLLEGE UNION ELECTION 2026 &bull; BALLOT BOX APERTURE STRIP SEAL &bull; SECURITY BAND &bull; GOVERNMENT COLLEGE CHITTUR &bull; COLLEGE UNION ELECTION 2026
        </div>

        <div class="strip-body">
          
          <!-- SECTION 1: LEFT FLANK / END TAB (42mm) -->
          <div class="flank-col flank-left">
            <div class="flank-emblem-wrap">
              <img src="${emblemDataUrl}" class="flank-emblem" alt="GCC Emblem">
            </div>
            <div class="flank-serial-box">
              <span class="flank-serial-lbl">SL. NO.</span>
              <span class="flank-serial-num">${padSl}</span>
            </div>
            <div class="flank-sub">${fullCode}</div>
            <div class="flank-tag left-tag">LEFT WING TAB</div>
          </div>

          <!-- SECTION 2: LEFT DETAILS / STATION RECORD (96mm) -->
          <div class="details-col">
            <div class="col-title-bar green-bar">
              <span class="col-icon">🗳️</span>
              <span class="col-title-txt">POLLING STATION RECORD</span>
            </div>
            <div class="field-list">
              <div class="field-row">
                <span class="f-lbl">Booth No.:</span>
                <span class="f-line short"></span>
                <span class="f-lbl ml">Box No.:</span>
                <span class="f-line tiny"></span>
                <span class="f-sub">of</span>
                <span class="f-line tiny"></span>
              </div>
              <div class="field-row">
                <span class="f-lbl">Venue / Room:</span>
                <span class="f-line long"></span>
              </div>
              <div class="field-row">
                <span class="f-lbl">Date of Poll:</span>
                <span class="f-line mid"></span>
                <span class="f-lbl ml">Time:</span>
                <span class="f-line mid"></span>
              </div>
              <div class="field-row note-row">
                <span class="sec-note-text">Affix firmly across the ballot drop aperture immediately at close of poll.</span>
              </div>
            </div>
          </div>

          <!-- SECTION 3: CENTER APERTURE TARGET & BIG GOLDEN EMBLEM (124mm) -->
          <div class="center-col">
            
            <div class="center-header">
              <div class="inst-name">GOVERNMENT COLLEGE CHITTUR</div>
              <div class="elect-name">COLLEGE UNION ELECTION 2026</div>
              <div class="seal-badge-box">
                <span class="seal-badge-txt">BALLOT BOX APERTURE STRIP SEAL</span>
              </div>
            </div>

            <!-- APERTURE TARGET SHOWCASE WITH PROMINENT GOLDEN EMBLEM -->
            <div class="aperture-target-box">
              <div class="target-crosshair top-left"></div>
              <div class="target-crosshair top-right"></div>
              <div class="target-crosshair btm-left"></div>
              <div class="target-crosshair btm-right"></div>
              <div class="target-axis-line"></div>
              
              <div class="aperture-flex-row">
                <!-- Left Target Instructions -->
                <div class="target-side-col">
                  <div class="target-side-icon">⬚</div>
                  <div class="target-side-title">ALIGN DIRECTLY</div>
                  <div class="target-side-sub">OVER BALLOT DROP SLIT</div>
                  <div class="target-arrow-indicator">➔ ➔ ➔</div>
                </div>

                <!-- Center: BIG PROMINENT GOLDEN EMBLEM -->
                <div class="center-emblem-container">
                  <img src="${emblemDataUrl}" class="center-big-emblem" alt="GCC Golden Emblem">
                  <div class="center-emblem-caption">SECURITY APERTURE SEAL</div>
                </div>

                <!-- Right Target Instructions -->
                <div class="target-side-col">
                  <div class="target-side-icon">🔒</div>
                  <div class="target-side-title">TAMPER-EVIDENT</div>
                  <div class="target-side-sub">DO NOT PUNCTURE OR TEAR</div>
                  <div class="target-arrow-indicator">⬅ ⬅ ⬅</div>
                </div>
              </div>
            </div>

            <div class="tamper-warning-bar">
              ⚠ TAMPER-EVIDENT SECURITY SEAL &bull; ANY DAMAGE OR BREACH WILL BE REPORTED TO RETURNING OFFICER ⚠
            </div>
          </div>

          <!-- SECTION 4: RIGHT WING / SIGNATURES (96mm) -->
          <div class="sign-col">
            <div class="col-title-bar indigo-bar">
              <span class="col-icon">✍️</span>
              <span class="col-title-txt">SIGNATURES</span>
            </div>
            
            <!-- Presiding Officer -->
            <div class="sign-box-po">
              <div class="sign-dotted-line"></div>
              <div class="sign-label">Signature of Presiding Officer (with Station Seal)</div>
            </div>

            <!-- Polling Agents -->
            <div class="agents-box">
              <div class="agents-hdr">Signatures of Polling Agents / Representatives:</div>
              <div class="agents-grid">
                <div class="agent-slot">1. <span class="agent-line"></span></div>
                <div class="agent-slot">2. <span class="agent-line"></span></div>
                <div class="agent-slot">3. <span class="agent-line"></span></div>
                <div class="agent-slot">4. <span class="agent-line"></span></div>
              </div>
            </div>
          </div>

          <!-- SECTION 5: RIGHT FLANK / END TAB (42mm) -->
          <div class="flank-col flank-right">
            <div class="flank-emblem-wrap">
              <img src="${emblemDataUrl}" class="flank-emblem" alt="GCC Emblem">
            </div>
            <div class="flank-serial-box">
              <span class="flank-serial-lbl">SL. NO.</span>
              <span class="flank-serial-num">${padSl}</span>
            </div>
            <div class="flank-sub">${fullCode}</div>
            <div class="flank-verify-box">
              <div class="chk-box"></div>
              <span class="chk-txt">VERIFIED INTACT AT COUNTING</span>
            </div>
            <div class="flank-tag right-tag">RIGHT WING TAB</div>
          </div>

        </div>

        <!-- Bottom Micro-Security Border -->
        <div class="micro-border-btm">
          GOVERNMENT COLLEGE CHITTUR &bull; COLLEGE UNION ELECTION 2026 &bull; BALLOT BOX APERTURE STRIP SEAL &bull; SECURITY BAND &bull; GOVERNMENT COLLEGE CHITTUR &bull; COLLEGE UNION ELECTION 2026 &bull; BALLOT BOX APERTURE STRIP SEAL &bull; SECURITY BAND &bull; GOVERNMENT COLLEGE CHITTUR &bull; COLLEGE UNION ELECTION 2026
        </div>

      </div>

      <!-- Scissor Cut Guide (between strips) -->
      ${(slNum % SEALS_PER_PAGE !== 0 && slNum < TOTAL_SEALS) ? `
        <div class="cut-guide">
          <span class="cut-icon">✂</span>
          <span class="cut-dash"></span>
          <span class="cut-txt">CUT ALONG LINE TO DETACH 8 CM STRIP SEAL</span>
          <span class="cut-dash"></span>
          <span class="cut-icon">✂</span>
        </div>
      ` : ''}
    </div>
  `;
}

function generateFullHtml() {
  let pagesHtml = '';

  for (let p = 0; p < TOTAL_PAGES; p++) {
    const startIdx = p * SEALS_PER_PAGE + 1;
    const endIdx = Math.min((p + 1) * SEALS_PER_PAGE, TOTAL_SEALS);

    let sealsHtml = '';
    for (let s = startIdx; s <= endIdx; s++) {
      sealsHtml += buildStripSealHtml(s);
    }

    pagesHtml += `
      <div class="a3-page ${p < TOTAL_PAGES - 1 ? 'page-break' : ''}">
        <div class="page-meta-header">
          <span>GOVERNMENT COLLEGE CHITTUR &bull; COLLEGE UNION ELECTION 2026 &bull; BALLOT BOX APERTURE STRIP SEALS</span>
          <span>A3 HORIZONTAL &bull; 8 CM HEIGHT &bull; SHEET ${p + 1} OF ${TOTAL_PAGES} (SEALS ${String(startIdx).padStart(3, '0')} TO ${String(endIdx).padStart(3, '0')})</span>
        </div>
        <div class="page-content-box">
          ${sealsHtml}
        </div>
        <div class="page-meta-footer">
          <span>DIMENSIONS: 400 mm Width &times; 80 mm Height per Strip Seal &bull; Material: Heavy Gummed Sticker Paper / Self-Adhesive Stock</span>
          <span>Returning Officer Record Copy &bull; Page ${p + 1} of ${TOTAL_PAGES}</span>
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Government College Chittur - Ballot Box Strip Seals (A3 Horizontal)</title>
  <style>
    @page {
      size: A3 landscape;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #e2e8f0;
      color: #000;
    }
    @media screen {
      .a3-page {
        margin: 20px auto;
        box-shadow: 0 10px 25px rgba(0,0,0,0.25);
        background: #fff;
      }
    }
    @media print {
      body { background: #fff; }
      .a3-page {
        margin: 0;
        box-shadow: none;
        page-break-after: always;
        break-after: page;
      }
      .page-break {
        page-break-after: always;
        break-after: page;
      }
    }

    /* A3 Landscape: 420mm x 297mm */
    .a3-page {
      width: 420mm;
      height: 297mm;
      padding: 8mm 10mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      background: #fff;
      overflow: hidden;
    }

    .page-meta-header {
      font-size: 7.5pt;
      font-weight: 800;
      color: #1e3a8a;
      display: flex;
      justify-content: space-between;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 1.5mm;
      margin-bottom: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .page-meta-footer {
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      border-top: 1.5px solid #cbd5e1;
      padding-top: 1.5mm;
      margin-top: 2mm;
    }

    .page-content-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Strip Seal: Exactly 400mm Wide x 80mm High (8 cm) */
    .strip-seal-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .strip-seal {
      width: 400mm;
      height: 80mm;
      border: 2.5px solid #1e3a8a;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
      position: relative;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      overflow: hidden;
    }

    /* Micro text security border */
    .micro-border-top, .micro-border-btm {
      background: linear-gradient(90deg, #1e3a8a 0%, #065f46 25%, #991b1b 50%, #d97706 75%, #1e3a8a 100%);
      color: #ffffff;
      font-family: monospace;
      font-size: 4.8pt;
      font-weight: 800;
      text-align: center;
      letter-spacing: 1px;
      padding: 1px 0;
      text-transform: uppercase;
      overflow: hidden;
      white-space: nowrap;
      height: 3.5mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .strip-body {
      flex: 1;
      display: flex;
      height: 73mm;
    }

    /* Column 1 & 5: Flanks (42mm each) */
    .flank-col {
      width: 42mm;
      background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%);
      border-right: 2.5px solid #b91c1c;
      padding: 2mm 2.5mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
    }
    .flank-right {
      border-right: none;
      border-left: 2.5px solid #b91c1c;
    }

    .flank-emblem-wrap {
      width: 23mm;
      height: 23mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .flank-emblem {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 1px 3px rgba(217, 119, 6, 0.4));
    }

    .flank-serial-box {
      border: 2px solid #7f1d1d;
      background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%);
      border-radius: 4px;
      padding: 1mm 2mm;
      width: 100%;
      box-shadow: 0 2px 4px rgba(185, 28, 28, 0.3);
    }
    .flank-serial-lbl {
      display: block;
      font-size: 5.5pt;
      font-weight: 900;
      color: #fef08a;
      letter-spacing: 0.8px;
    }
    .flank-serial-num {
      display: block;
      font-family: 'Courier New', monospace;
      font-size: 15pt;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 1.5px;
      line-height: 1;
      text-shadow: 0 1px 2px rgba(0,0,0,0.4);
    }
    .flank-sub {
      font-size: 5.2pt;
      font-family: monospace;
      font-weight: 800;
      color: #1e3a8a;
    }
    .flank-tag {
      font-size: 5.2pt;
      font-weight: 800;
      padding: 0.8mm 2mm;
      border-radius: 3px;
      letter-spacing: 0.5px;
      width: 100%;
      box-sizing: border-box;
    }
    .flank-tag.left-tag {
      color: #ffffff;
      background: #1d4ed8;
      box-shadow: 0 1px 2px rgba(29, 78, 216, 0.3);
    }
    .flank-tag.right-tag {
      color: #ffffff;
      background: #b91c1c;
      box-shadow: 0 1px 2px rgba(185, 28, 28, 0.3);
    }
    .flank-verify-box {
      display: flex;
      align-items: center;
      gap: 1.5mm;
      border: 1.5px solid #059669;
      padding: 0.8mm 1.5mm;
      border-radius: 3px;
      background: #ecfdf5;
      width: 100%;
      box-sizing: border-box;
    }
    .chk-box {
      width: 3.5mm;
      height: 3.5mm;
      border: 1.5px solid #059669;
      background: #fff;
      flex-shrink: 0;
    }
    .chk-txt {
      font-size: 4.8pt;
      font-weight: 800;
      color: #065f46;
      line-height: 1.1;
      text-align: left;
    }

    /* Column 2: Station Record (96mm) */
    .details-col {
      width: 96mm;
      padding: 2mm 3.5mm;
      border-right: 2.5px solid #059669;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 45%, #ffffff 70%, #f0fdf4 100%);
    }

    .col-title-bar {
      display: flex;
      align-items: center;
      gap: 2mm;
      border-radius: 3px;
      padding: 1.2mm 2.5mm;
      margin-bottom: 1mm;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    .col-title-bar.green-bar {
      background: linear-gradient(90deg, #047857 0%, #059669 100%);
      color: #ffffff;
    }
    .col-title-bar.indigo-bar {
      background: linear-gradient(90deg, #4338ca 0%, #6366f1 100%);
      color: #ffffff;
    }
    .col-icon { font-size: 9pt; }
    .col-title-txt {
      font-size: 7.5pt;
      font-weight: 900;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }

    .field-list {
      display: flex;
      flex-direction: column;
      gap: 3.2mm;
    }
    .field-row {
      display: flex;
      align-items: baseline;
      font-size: 7.2pt;
    }
    .f-lbl {
      font-weight: 800;
      color: #064e3b;
      margin-right: 1.5mm;
      white-space: nowrap;
    }
    .f-lbl.ml { margin-left: 2.5mm; }
    .f-sub {
      font-size: 6.5pt;
      color: #047857;
      margin: 0 1mm;
      font-weight: 700;
    }
    .f-line {
      border-bottom: 1.2px dotted #0f172a;
      height: 10px;
    }
    .f-line.short { width: 22mm; }
    .f-line.tiny { width: 10mm; }
    .f-line.mid { width: 20mm; }
    .f-line.long { flex: 1; }

    .note-row {
      margin-top: 1mm;
      padding: 1.2mm 2mm;
      background: #dcfce7;
      border-left: 3.5px solid #16a34a;
      border-radius: 2px;
    }
    .sec-note-text {
      font-size: 5.5pt;
      color: #14532d;
      font-weight: 700;
      line-height: 1.2;
    }

    /* Column 3: Center Aperture Target & Big Golden Emblem (124mm) */
    .center-col {
      width: 124mm;
      padding: 1.5mm 3mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      position: relative;
      background: linear-gradient(180deg, #fffdf2 0%, #ffffff 35%, #ffffff 65%, #fffdf2 100%);
    }

    .center-header {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6mm;
    }
    .inst-name {
      font-size: 10.5pt;
      font-weight: 900;
      letter-spacing: 1px;
      color: #1e3a8a;
      text-transform: uppercase;
      line-height: 1.1;
      text-shadow: 0 1px 1px rgba(30, 58, 138, 0.1);
    }
    .elect-name {
      font-size: 8.2pt;
      font-weight: 800;
      color: #b91c1c;
      letter-spacing: 0.8px;
    }
    .seal-badge-box {
      margin-top: 0.5mm;
      background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #1e3a8a 100%);
      color: #fef08a;
      border: 1.5px solid #d97706;
      padding: 0.8mm 4mm;
      border-radius: 3px;
      display: inline-block;
      box-shadow: 0 1px 3px rgba(30, 58, 138, 0.25);
    }
    .seal-badge-txt {
      font-size: 8.5pt;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    /* Aperture Target Alignment Box with BIG EMBLEM */
    .aperture-target-box {
      position: relative;
      width: 100%;
      border: 2px dashed #dc2626;
      background: linear-gradient(180deg, #fff7ed 0%, #fffdf5 50%, #fff7ed 100%);
      border-radius: 4px;
      padding: 1.5mm 2.5mm;
      margin: 1mm 0;
      box-shadow: inset 0 0 4px rgba(220, 38, 38, 0.1);
    }
    .target-crosshair {
      position: absolute;
      width: 4mm;
      height: 4mm;
      border-color: #dc2626;
      border-style: solid;
      pointer-events: none;
    }
    .target-crosshair.top-left { top: 1mm; left: 1mm; border-width: 2px 0 0 2px; }
    .target-crosshair.top-right { top: 1mm; right: 1mm; border-width: 2px 2px 0 0; }
    .target-crosshair.btm-left { bottom: 1mm; left: 1mm; border-width: 0 0 2px 2px; }
    .target-crosshair.btm-right { bottom: 1mm; right: 1mm; border-width: 0 2px 2px 0; }

    .target-axis-line {
      position: absolute;
      top: 50%;
      left: 3mm;
      right: 3mm;
      height: 1px;
      border-top: 1px dotted #f97316;
      z-index: 0;
    }

    .aperture-flex-row {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 38mm;
    }

    .target-side-col {
      width: 28mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 1mm;
      background: rgba(255, 255, 255, 0.85);
      border-radius: 3px;
      border: 1px solid #fed7aa;
    }
    .target-side-icon {
      font-size: 11pt;
      color: #dc2626;
      line-height: 1;
      margin-bottom: 0.5mm;
    }
    .target-side-title {
      font-size: 6.2pt;
      font-weight: 900;
      color: #991b1b;
      letter-spacing: 0.3px;
      line-height: 1.15;
    }
    .target-side-sub {
      font-size: 5.2pt;
      font-weight: 800;
      color: #c2410c;
      letter-spacing: 0.2px;
      margin-top: 0.5mm;
      line-height: 1.15;
    }
    .target-arrow-indicator {
      font-size: 7pt;
      font-weight: 900;
      color: #ea580c;
      margin-top: 0.8mm;
      letter-spacing: 1px;
    }

    .center-emblem-container {
      width: 48mm;
      height: 39mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      background: radial-gradient(circle, rgba(254, 240, 138, 0.5) 0%, rgba(255, 255, 255, 0) 72%);
    }
    .center-big-emblem {
      width: 36mm;
      height: 36mm;
      object-fit: contain;
      filter: drop-shadow(0 3px 6px rgba(217, 119, 6, 0.45));
    }
    .center-emblem-caption {
      font-size: 5pt;
      font-weight: 900;
      color: #b45309;
      letter-spacing: 0.8px;
      margin-top: 0.5mm;
      text-transform: uppercase;
      background: #fffbeb;
      padding: 0.2mm 2mm;
      border-radius: 2px;
      border: 1px solid #fde68a;
    }

    .tamper-warning-bar {
      font-size: 5.4pt;
      font-weight: 900;
      color: #78350f;
      background: linear-gradient(90deg, #fef08a 0%, #fde047 50%, #fef08a 100%);
      border: 1.5px solid #ca8a04;
      border-radius: 3px;
      padding: 0.8mm 2mm;
      width: 100%;
      letter-spacing: 0.3px;
      box-shadow: 0 1px 2px rgba(202, 138, 4, 0.2);
    }

    /* Column 4: Right Wing Signatures (96mm) */
    .sign-col {
      width: 96mm;
      padding: 2mm 3.5mm;
      border-left: 2.5px solid #4f46e5;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(180deg, #f5f3ff 0%, #ffffff 45%, #ffffff 70%, #f5f3ff 100%);
    }

    .sign-box-po {
      border: 1.2px solid #818cf8;
      border-radius: 3px;
      padding: 1.5mm 2mm;
      background: #eef2ff;
      text-align: center;
    }
    .sign-dotted-line {
      border-bottom: 1.2px dotted #1e1b4b;
      height: 6mm;
      margin-bottom: 1mm;
    }
    .sign-label {
      font-size: 6.2pt;
      font-weight: 800;
      color: #1e1b4b;
    }

    .agents-box {
      border: 1.2px solid #cbd5e1;
      border-radius: 3px;
      padding: 1.5mm 2mm;
      background: #ffffff;
    }
    .agents-hdr {
      font-size: 6pt;
      font-weight: 800;
      color: #312e81;
      margin-bottom: 1mm;
      border-bottom: 1px solid #e0e7ff;
      padding-bottom: 0.5mm;
    }
    .agents-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5mm 3mm;
    }
    .agent-slot {
      display: flex;
      align-items: baseline;
      font-size: 6.2pt;
      font-weight: 700;
      color: #0f172a;
    }
    .agent-line {
      flex: 1;
      border-bottom: 1px dotted #0f172a;
      height: 8px;
      margin-left: 1mm;
    }

    /* Cut Guideline between seals */
    .cut-guide {
      width: 400mm;
      display: flex;
      align-items: center;
      gap: 3mm;
      margin: 1.5mm 0;
      color: #b45309;
      height: 3.5mm;
    }
    .cut-icon { font-size: 8pt; font-weight: bold; color: #b45309; }
    .cut-dash { flex: 1; border-top: 1.5px dashed #d97706; }
    .cut-txt {
      font-size: 5.8pt;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #92400e;
    }

    @media print {
      .no-print-bar { display: none !important; }
    }
    .no-print-bar {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f172a;
      color: #f8fafc;
      padding: 10px 22px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      gap: 16px;
      z-index: 99999;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
    }
    .no-print-bar button {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 7px 16px;
      border-radius: 9999px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .no-print-bar button:hover {
      background: #4338ca;
    }
    .no-print-bar a {
      background: #059669;
      color: white;
      text-decoration: none;
      padding: 7px 16px;
      border-radius: 9999px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .no-print-bar a:hover {
      background: #047857;
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <span style="font-weight: 800; color: #fde047; letter-spacing: 0.3px;">🗳️ GCC College Union Election 2026 &bull; 30 Strip Seals</span>
    <span style="color: #64748b;">|</span>
    <span style="color: #cbd5e1; font-weight: 500;">A3 Landscape &bull; 8 cm &times; 40 cm (3/Sheet &bull; 10 Sheets)</span>
    <button onclick="window.print()">🖨️ Print Sheets (A3)</button>
    <a href="Ballot_Box_Strip_Seals_A3_30_Seals.pdf" target="_blank">📄 Ready PDF</a>
  </div>
  ${pagesHtml}
</body>
</html>`;
}

console.log('Generating 30 Ballot Box Strip Seals for Government College Chittur (A3 Landscape)...');
const fullHtml = generateFullHtml();
const htmlPath = resolve('Ballot_Box_Strip_Seals_A3_30_Seals.html');
writeFileSync(htmlPath, fullHtml);
console.log('Saved HTML to:', htmlPath);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const pdfPath = resolve('Ballot_Box_Strip_Seals_A3_30_Seals.pdf');

console.log('Rendering A3 Landscape PDF via Chrome headless...');
try {
  execSync(`"${chromePath}" --headless=new --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" --no-pdf-header-footer "file:///${htmlPath.replace(/\\\\/g, '/')}"`);
  console.log('Successfully created PDF:', pdfPath);
} catch (err) {
  console.error('Chrome PDF rendering error:', err);
}
