/**
 * noticesPrinter.js
 * Dedicated print rendering engine for Official Election Notices,
 * Individual Polling Booth Door Posters, and Campus Master Directory Posters.
 */

import { esc, triggerPrint, todayFormatted, compareClassesByYearOrder } from './utils.js';
import { CONFIG } from './config.js';
import { OFFICIAL_COUNTING_ROSTER_BACKUP } from './data/officialCountingRoster.js';

// Markdown-to-HTML formatter for notice text
function formatMarkdown(text) {
  if (!text) return '';
  let html = esc(text);

  // Auto-group posts into 2 columns if not already inside :::columns
  if (!html.includes(':::columns') && html.includes('### Main Office Bearers') && html.includes('### Association Secretaries')) {
    const postPattern = /(### Main Office Bearers[\s\S]*?)(### Association Secretaries[\s\S]*?)(?=(?:\n---|\n\||$))/i;
    html = html.replace(postPattern, (match, col1, col2) => {
      return `:::columns\n${col1.trim()}\n:::split:::\n${col2.trim()}\n:::\n`;
    });
  }

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size:11.5px;font-weight:bold;margin:4px 0 2px 0;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:1px;text-transform:uppercase;">$1</h3>');
  html = html.replace(/^#### (.*$)/gim, '<h4 style="font-size:10.5px;font-weight:bold;margin:3px 0 2px 0;color:#374151;">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size:12.5px;font-weight:bold;margin:5px 0 2px 0;color:#111827;">$1</h2>');

  // Bold and Italic
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Horizontal Rule
  html = html.replace(/^---$/gim, '<hr class="notice-hr">');

  // Unordered list items
  html = html.replace(/^\s*• (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\s*\- (.*$)/gim, '<li>$1</li>');

  // Ordered list items
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<div class="ordered-list-item"><strong>$1.</strong> $2</div>');

  // Two columns conversion
  if (html.includes(':::columns')) {
    html = html.replace(/:::columns([\s\S]*?):::split:::([\s\S]*?):::/gi, (match, col1, col2) => {
      return `<div class="notice-two-columns" style="display:flex;gap:14px;margin:3px 0;align-items:flex-start;">\n<div style="flex:1;min-width:0;">\n${col1.trim()}\n</div>\n<div style="flex:1;min-width:0;">\n${col2.trim()}\n</div>\n</div>`;
    });
  }

  // Tables (detect markdown table lines)
  const lines = html.split('\n');
  let inTable = false;
  let tableHtml = '';
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHtml = '<table style="width:100%;border-collapse:collapse;margin:4px 0;font-size:9px;">';
      }
      if (line.includes(':---') || line.includes('---:')) {
        continue; // separator
      }
      const cols = line.split('|').slice(1, -1).map(c => c.trim());
      const isHeader = !tableHtml.includes('<tbody>');
      if (isHeader && !tableHtml.includes('<thead>')) {
        tableHtml += '<thead><tr style="background:#f3f4f6;border-bottom:1.5px solid #000;">' + cols.map(c => `<th style="border:1px solid #9ca3af;padding:2px 5px;text-align:left;font-size:9.5px;">${c}</th>`).join('') + '</tr></thead><tbody>';
      } else {
        tableHtml += '<tr style="border-bottom:1px solid #e5e7eb;">' + cols.map(c => `<td style="border:1px solid #d1d5db;padding:1.5px 5px;line-height:1.2;">${c}</td>`).join('') + '</tr>';
      }
    } else {
      if (inTable) {
        tableHtml += '</tbody></table>';
        newLines.push(tableHtml);
        inTable = false;
        tableHtml = '';
      }
      newLines.push(line);
    }
  }
  if (inTable) {
    tableHtml += '</tbody></table>';
    newLines.push(tableHtml);
  }

  return newLines.map(l => {
    if (l.startsWith('<h') || l.startsWith('<hr') || l.startsWith('<li') || l.startsWith('<div') || l.startsWith('</div') || l.startsWith('<table') || l.startsWith('</table') || l.startsWith('<thead') || l.startsWith('<tbody') || l.startsWith('<tr')) return l;
    if (!l.trim()) return '<div class="spacer"></div>';
    return `<p>${l}</p>`;
  }).join('\n');
}

/**
 * Print a formal official notice with government/college letterhead
 */
export function printOfficialNotice(notice, settings = {}) {
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;
  const year = settings.electionYear || new Date().getFullYear();
  const collegeLogo = settings.collegeLogo || '';
  const collegePlace = settings.collegePlace || CONFIG.COLLEGE_PLACE || 'Palakkad';

  const w = window.open('', '_blank');
  if (!w) {
    alert('Pop-up blocker prevented opening the print window. Please allow pop-ups for this site.');
    return;
  }

  const formattedBody = formatMarkdown(notice.content || '');

  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(notice.refNo || 'Notice')} - ${esc(notice.title)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 12mm 6mm 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Times New Roman', Times, Georgia, serif;
      color: #111;
      background: #fff;
      font-size: 11px;
      line-height: 1.35;
      height: 100%;
    }
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 10mm; /* Added padding to act as page margins */
      box-sizing: border-box;
      height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .watermark-global {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 450px;
      height: 450px;
      opacity: 0.08;
      filter: grayscale(100%);
      pointer-events: none;
      z-index: -1;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1.5px solid #000;
      padding-bottom: 4px;
      margin-bottom: 5px;
    }
    .college-name {
      font-size: 16px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
      color: #000;
    }
    .sub-header {
      font-size: 10.5px;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #374151;
      margin-top: 1px;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #ddd;
      padding: 2.5px 0;
      margin-bottom: 5px;
      font-family: Arial, sans-serif;
      font-size: 9.5px;
      color: #333;
    }
    .notice-title-box {
      text-align: center;
      margin: 5px 0 6px 0;
      border: 1.5px solid #000;
      padding: 4px 8px;
      background: #fafafa;
    }
    .notice-title {
      font-size: 12.5px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .category-tag {
      font-family: Arial, sans-serif;
      font-size: 8.5px;
      font-weight: bold;
      text-transform: uppercase;
      color: #4b5563;
      margin-top: 1px;
    }
    .content-area {
      font-size: 16px;
      text-align: justify;
      line-height: 1.6;
      flex-grow: 1;
      overflow: hidden;
      padding-top: 15px;
    }
    .content-area p {
      margin-bottom: 12px;
      margin-top: 0;
    }
    .content-area ul, .content-area ol {
      margin-bottom: 12px;
      margin-top: 0;
      padding-left: 0;
      list-style-type: none;
    }
    .content-area li {
      margin-left: 20px;
      margin-bottom: 4px;
      font-size: 0.85em;
      line-height: 1.4;
      position: relative;
    }
    .content-area li::before {
      content: '•';
      position: absolute;
      left: -15px;
      font-weight: bold;
    }
    .content-area h3, .content-area h4 {
      margin-top: 24px;
      margin-bottom: 10px;
      font-size: 1.1em;
    }
    .content-area hr.notice-hr {
      border: none;
      border-top: 1px dashed #aaa;
      margin: 25px 0;
    }
    .content-area .spacer {
      height: 10px;
    }
    .content-area .ordered-list-item {
      margin-left: 15px;
      margin-bottom: 4px;
      font-size: 0.9em;
    }
    .signature-area {
      margin-top: 60px;
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
      page-break-inside: avoid;
      padding-bottom: 20px;
    }
    .signatory-box {
      text-align: right;
      font-family: 'Times New Roman', Times, serif;
    }
    .signatory-name {
      font-size: 16px;
      font-weight: bold;
      margin: 0;
    }
    .signatory-title {
      font-size: 14px;
      color: #333;
      margin-top: 4px;
      max-width: 320px;
    }
    .footer-note {
      display: none;
    }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color: #000000 !important; border-color: #000000 !important; }
      body { margin: 0; padding: 0; height: 100vh; overflow: hidden; }
      .page-container { max-width: 100%; margin: 0; padding: 0; height: 100vh; page-break-after: avoid; }
      .signature-area { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${collegeLogo ? `<div class="watermark-global" style="background-image: url('${collegeLogo}');"></div>` : ''}
  <div class="page-container">
    <table class="header-table">
      <tr>
        ${collegeLogo ? `
          <td style="width: 70px; vertical-align: middle; text-align: left; padding-right: 12px;">
            <img src="${collegeLogo}" style="max-width: 65px; max-height: 65px; object-fit: contain;" alt="College Logo">
          </td>
        ` : ''}
        <td style="vertical-align: middle; text-align: center;">
          <h1 class="college-name">${esc(collegeName)}</h1>
          <div class="sub-header">Office of the Returning Officer — College Union Elections ${esc(year)}</div>
        </td>
      </tr>
    </table>

    <div class="meta-bar">
      <div><strong>Ref No:</strong> ${esc(notice.refNo || 'N/A')}</div>
      <div><strong>Place:</strong> ${esc(collegePlace)} &nbsp;&bull;&nbsp; <strong>Date:</strong> ${esc(notice.date || new Date().toISOString().split('T')[0])}</div>
    </div>

    <div class="notice-title-box">
      <h2 class="notice-title">${esc(notice.title)}</h2>
      <div class="category-tag">Official Publication • ${esc(notice.category || 'General Notice')}</div>
    </div>

    <div class="content-area">
      ${formattedBody}
    </div>

    <div class="signature-area">
      <div class="signatory-box">
        <div style="height: 35px;"></div>
        ${notice.signatoryName && notice.signatoryName !== 'Returning Officer' ? `<p class="signatory-name">${esc(notice.signatoryName)}</p>` : ''}
        <p class="signatory-title">${esc(notice.signatoryTitle || `Returning Officer, ${collegeName}`)}</p>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      // Auto adjust font size to prevent overflow
      const container = document.querySelector('.page-container');
      const content = document.querySelector('.content-area');
      let fontSize = 18; // Start with a large font size
      content.style.fontSize = fontSize + 'px';
      
      // Keep shrinking font size until the content fits exactly without scrolling
      while (container.scrollHeight > window.innerHeight && fontSize > 8) {
        fontSize -= 0.5;
        content.style.fontSize = fontSize + 'px';
      }

      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`);
  w.document.close();
}

/**
 * Print individual Polling Booth Door Poster (A4 / A3 door notice)
 */
export function printBoothDoorPoster(booth, settings = {}, schedule = {}, options = {}) {
  printBatchBoothDoorPosters([booth], settings, schedule, options);
}

/**
 * Batch print door posters for ALL booths, separated cleanly by page breaks
 */
export function printBatchBoothDoorPosters(boothsList, settings = {}, schedule = {}, options = {}) {
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;
  const year = settings.electionYear || new Date().getFullYear();
  const collegeLogo = settings.collegeLogo || '';
  const plan = options?.plan || settings?.ballotPlan || null;

  const w = window.open('', '_blank');
  if (!w) {
    alert('Pop-up blocker prevented opening the print window. Please allow pop-ups for this site.');
    return;
  }

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const pollStart = formatTime(schedule.pollingStart) || '09:30 AM';
  const pollEnd = formatTime(schedule.pollingEnd) || '12:30 PM';

  const postersHtml = boothsList.map((booth, idx) => {
    const classes = Array.isArray(booth.classes) ? booth.classes : [];
    const totalVoters = booth.totalStudents || 0;
    const bNum = Number(booth.boothNumber);
    const bAssign = plan?.boothAssignments?.[bNum] || null;

    // Determine actual ballots issued for this specific booth
    const ballotsIssued = [];

    // 1. General Union Ballot
    if (bAssign?.generalParts && bAssign.generalParts.length > 1) {
      bAssign.generalParts.forEach((gp, gIdx) => {
        ballotsIssued.push({
          num: ballotsIssued.length + 1,
          title: gp.title || `General Union Posts - Part ${gIdx + 1}`,
          code: gp.prefix || `G${gIdx + 1}`,
          desc: 'Executive & University Councillors'
        });
      });
    } else {
      ballotsIssued.push({
        num: ballotsIssued.length + 1,
        title: 'General Union Posts',
        code: 'G-Series',
        desc: 'Executive & University Councillors'
      });
    }

    // 2. Department Association Secretary Ballot: ONLY if contested in this booth!
    let hasAssocContest = false;
    let assocDepts = [];
    if (bAssign?.assocs && Array.isArray(bAssign.assocs) && bAssign.assocs.length > 0) {
      hasAssocContest = true;
      assocDepts = bAssign.assocs.map(a => String(a.post || '').replace(/^Association Secretary\s*/i, '').trim()).filter(Boolean);
    } else if (Array.isArray(booth.assocDepts) && booth.assocDepts.length > 0) {
      hasAssocContest = true;
      assocDepts = booth.assocDepts;
    } else if (Number(booth.assocBooksCount) > 0) {
      hasAssocContest = true;
      assocDepts = booth.assocDepts || [];
    }

    if (hasAssocContest) {
      const assocNameStr = assocDepts.length > 0 ? ` (${assocDepts.join(', ')})` : '';
      ballotsIssued.push({
        num: ballotsIssued.length + 1,
        title: `Dept Association Secretary${assocNameStr}`,
        code: 'A-Series',
        desc: 'Department Student Association'
      });
    }

    // 3. Year Representative Ballot: ONLY if contested in this booth!
    let hasRepContest = false;
    let repPosts = [];
    if (bAssign?.reps && Array.isArray(bAssign.reps) && bAssign.reps.length > 0) {
      hasRepContest = true;
      repPosts = bAssign.reps.map(r => String(r.post || '').replace(/Representative/i, 'Rep').trim()).filter(Boolean);
    } else if (Array.isArray(booth.repPosts) && booth.repPosts.length > 0) {
      hasRepContest = true;
      repPosts = booth.repPosts.map(p => String(p).replace(/Representative/i, 'Rep').trim());
    } else if (Number(booth.repBooksCount) > 0) {
      hasRepContest = true;
      repPosts = booth.repPosts || [];
    } else {
      const hasUGPG = classes.some(c => {
        const u = String(c).toUpperCase();
        return !u.includes('PH.D') && !u.includes('PH D') && !u.includes('RESEARCH') && !u.includes('SCHOLAR');
      });
      if (hasUGPG && (booth.repBooksCount === undefined || booth.repBooksCount > 0)) {
        hasRepContest = true;
      }
    }

    if (hasRepContest) {
      const repNameStr = repPosts.length > 0 ? ` (${repPosts.join(', ')})` : '';
      ballotsIssued.push({
        num: ballotsIssued.length + 1,
        title: `Year Representative${repNameStr}`,
        code: 'R-Series',
        desc: 'Class / Cohort Representative'
      });
    }

    return `
      <div class="poster-page ${idx < boothsList.length - 1 ? 'page-break' : ''}">
        <!-- Outer High-Contrast Border -->
        <div class="poster-border">
          
          <!-- Top Header -->
          <div class="poster-header">
            ${collegeLogo ? `<img src="${collegeLogo}" class="poster-logo" alt="Logo">` : ''}
            <div>
              <div class="college-title">${esc(collegeName)}</div>
              <div class="election-title">College Union Elections ${esc(year)} — Official Polling Station</div>
            </div>
          </div>

          <!-- Booth Number Banner (Compact) -->
          <div class="booth-giant-banner">
            <div class="booth-sub-label">OFFICIAL DESIGNATED POLLING BOOTH</div>
            <div class="booth-main-number">BOOTH NO. ${esc(booth.boothNumber)}</div>
          </div>

          <!-- Room Location Callout (Prominent & Large) -->
          <div class="location-banner">
            <div class="location-header">
              <span class="location-icon">📍</span>
              <span class="location-label">POLLING STATION VENUE</span>
            </div>
            <div class="location-name">${esc(booth.roomName || 'Classroom / Designated Hall')}</div>
          </div>

          <!-- Allotted Classes Section (Primary Focus - Expands to Fill Empty Space) -->
          <div class="classes-container">
            <div class="classes-heading">
              <span>📋 CLASSES ALLOTTED TO VOTE AT THIS BOOTH:</span>
              <span class="voter-badge">${totalVoters ? `${totalVoters} Registered Electors` : 'Electors as Per Roll'}</span>
            </div>

            <div class="classes-grid ${classes.length <= 4 ? 'classes-grid-spacious' : (classes.length <= 8 ? 'classes-grid-medium' : '')}">
              ${classes.length ? classes.map(c => `
                <div class="class-card">
                  <span class="check-icon">✔</span>
                  <span class="class-text">${esc(c)}</span>
                </div>
              `).join('') : `
                <div class="class-card" style="grid-column: 1 / -1; text-align: center; color: #000;">
                  Allotted as per Department Electoral Schedule
                </div>
              `}
            </div>
          </div>

          <!-- Ballots Issued Section -->
          <div class="ballots-section">
            <div class="ballots-heading">
              <span>🗳️ OFFICIAL BALLOT PAPERS TO BE ISSUED:</span>
              <span class="ballot-count-badge">${ballotsIssued.length} Ballot${ballotsIssued.length > 1 ? 's' : ''} per Elector</span>
            </div>

            <div class="ballots-grid">
              ${ballotsIssued.map(b => `
                <div class="ballot-card">
                  <div class="ballot-card-top">
                    <span class="ballot-pill">Ballot ${b.num}</span>
                    <span class="ballot-code">${esc(b.code)}</span>
                  </div>
                  <div class="ballot-title">${esc(b.title)}</div>
                  <div class="ballot-desc">${esc(b.desc)}</div>
                </div>
              `).join('')}
            </div>

            ${!hasAssocContest ? `
              <div class="uncontested-notice">
                ℹ️ <strong>Department Association:</strong> Uncontested / Elected Unopposed — <em>No Association Ballot issued at this booth</em>.
              </div>
            ` : ''}
          </div>

          <!-- Voter Directives Warning Box -->
          <div class="rules-box">
            <div class="rule-row">
              <span class="rule-icon">🪪</span>
              <span><strong>MANDATORY IDENTIFICATION:</strong> Must produce College ID Card or Identity Certificate to Polling Officer.</span>
            </div>
            <div class="rule-row">
              <span class="rule-icon">⏰</span>
              <span><strong>POLLING HOURS:</strong> <strong>${esc(pollStart)} to ${esc(pollEnd)} strictly</strong>. (Late arrivals strictly barred from entry).</span>
            </div>
            <div class="rule-row">
              <span class="rule-icon">🚫</span>
              <span><strong>PROHIBITED INSIDE BOOTH:</strong> Mobile phones, cameras, or electronic recording devices strictly barred.</span>
            </div>
            <div class="rule-row">
              <span class="rule-icon">✍️</span>
              <span><strong>MARKING PROCEDURE:</strong> Place arrow cross mark only in designated candidate column. Placing Tick mark, Finger Prints etc on the ballot will make it invalid.</span>
            </div>
          </div>

        </div>
      </div>
    `;
  }).join('');

  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Polling Booth Door Posters - ${esc(shortName)} Election ${esc(year)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 8mm 8mm 8mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: Arial, sans-serif;
        font-size: 8pt;
        font-weight: bold;
        color: #000000;
      }
      @bottom-left {
        content: "College Union Election — Official Polling Booth Poster";
        font-family: Arial, sans-serif;
        font-size: 8pt;
        color: #000000;
      }
    }
    .watermark-global {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 450px;
      height: 450px;
      opacity: 0.08;
      filter: grayscale(100%);
      pointer-events: none;
      z-index: -1;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .poster-page {
      width: 100%;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @media screen {
      .poster-page {
        min-height: 270mm;
        max-width: 210mm;
        margin: 0 auto 20px auto;
        padding: 4px;
      }
    }
    @media print {
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
      }
      .poster-page {
        height: 275mm;
        max-height: 275mm;
        overflow: hidden;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .page-break {
        page-break-after: always;
        break-after: page;
      }
    }
    .poster-border {
      border: 3.5px solid #000;
      border-radius: 6px;
      padding: 12px 14px;
      height: 100%;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      gap: 7px;
    }
    .poster-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 5px;
      flex-shrink: 0;
    }
    .poster-logo {
      max-height: 42px;
      max-width: 42px;
      object-fit: contain;
    }
    .college-title {
      font-size: 15px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000;
    }
    .election-title {
      font-size: 11px;
      font-weight: 700;
      color: #000;
      margin-top: 1px;
    }
    .booth-giant-banner {
      background: #000;
      color: #fff;
      text-align: center;
      padding: 5px 8px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .booth-sub-label {
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 1.5px;
      opacity: 0.95;
    }
    .booth-main-number {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 1px;
      margin-top: 1px;
    }
    .location-banner {
      border: 2.5px solid #000;
      background: #fff;
      border-radius: 6px;
      padding: 8px 12px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      flex-shrink: 0;
    }
    .location-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .location-icon {
      font-size: 16px;
    }
    .location-label {
      font-weight: 900;
      color: #000;
      font-size: 12px;
      letter-spacing: 1px;
    }
    .location-name {
      font-size: 22px;
      font-weight: 900;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }
    .classes-container {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      border: 3px solid #000;
      border-radius: 6px;
      padding: 10px 12px;
      background: #fff;
    }
    .classes-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13.5px;
      font-weight: 900;
      color: #000;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
      margin-bottom: 10px;
      flex-shrink: 0;
    }
    .voter-badge {
      background: #fff;
      border: 1.5px solid #000;
      color: #000;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11.5px;
      font-weight: 800;
    }
    .classes-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      align-content: stretch;
    }
    .classes-grid-spacious {
      gap: 12px;
    }
    .class-card {
      border: 2px solid #000;
      border-radius: 6px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fff;
      box-sizing: border-box;
    }
    .classes-grid-spacious .class-card {
      padding: 16px 18px;
    }
    .classes-grid-medium .class-card {
      padding: 10px 12px;
    }
    .check-icon {
      font-size: 18px;
      font-weight: 900;
      color: #000;
      flex-shrink: 0;
    }
    .classes-grid-spacious .check-icon {
      font-size: 24px;
    }
    .class-text {
      font-size: 15px;
      font-weight: 900;
      color: #000;
      line-height: 1.25;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .classes-grid-spacious .class-text {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.6px;
    }
    .ballots-section {
      border: 2px solid #000;
      border-radius: 5px;
      padding: 6px 9px;
      background: #fff;
      flex-shrink: 0;
    }
    .ballots-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
      font-weight: 900;
      color: #000;
      border-bottom: 1.5px solid #000;
      padding-bottom: 4px;
      margin-bottom: 5px;
    }
    .ballot-count-badge {
      background: #000;
      color: #fff;
      padding: 1.5px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;
    }
    .ballots-grid {
      display: flex;
      gap: 6px;
      justify-content: space-between;
    }
    .ballot-card {
      flex: 1;
      border: 1.5px solid #000;
      border-radius: 4px;
      padding: 5px 6px;
      background: #fff;
      display: flex;
      flex-direction: column;
      gap: 1.5px;
    }
    .ballot-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1px;
    }
    .ballot-pill {
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      background: #fff;
      padding: 1px 4px;
      border-radius: 2px;
      border: 1px solid #000;
      color: #000;
    }
    .ballot-code {
      font-size: 9px;
      font-weight: bold;
      color: #000;
      font-family: monospace;
    }
    .ballot-title {
      font-size: 11px;
      font-weight: 800;
      color: #000;
      line-height: 1.15;
    }
    .ballot-desc {
      font-size: 8.5px;
      color: #000;
      line-height: 1.15;
    }
    .uncontested-notice {
      margin-top: 4px;
      padding: 3px 6px;
      background: #fff;
      border: 1px dashed #000;
      border-radius: 3px;
      font-size: 9.5px;
      color: #000;
      line-height: 1.25;
    }
    .rules-box {
      border: 1.5px solid #000;
      background: #fff;
      border-radius: 5px;
      padding: 6px 9px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 9.5px;
      color: #000;
      flex-shrink: 0;
    }
    .rule-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .rule-icon {
      font-size: 11px;
      width: 14px;
      text-align: center;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  ${collegeLogo ? `<div class="watermark-global" style="background-image: url('${collegeLogo}');"></div>` : ''}
  ${postersHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`);
  w.document.close();
}

/**
 * Print the Master Campus Polling Directory (large poster for notice boards and gates)
 */
export function printCampusMasterDirectory(boothsList, settings = {}, schedule = {}) {
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;
  const year = settings.electionYear || new Date().getFullYear();
  const collegeLogo = settings.collegeLogo || '';

  const w = window.open('', '_blank');
  if (!w) {
    alert('Pop-up blocker prevented opening the print window. Please allow pop-ups for this site.');
    return;
  }

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const pollDateStr = schedule.pollingStart
    ? new Date(schedule.pollingStart).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Election Day';

  const pollStart = formatTime(schedule.pollingStart) || '09:30 AM';
  const pollEnd = formatTime(schedule.pollingEnd) || '12:30 PM';

  const totalCampusVoters = boothsList.reduce((acc, b) => acc + (b.totalStudents || 0), 0);

  const tableRows = boothsList.map(b => {
    const classes = (Array.isArray(b.classes) ? b.classes : []).join(', ') || 'Classes as designated';
    return `
      <tr>
        <td style="text-align: center; font-weight: 900; font-size: 14px; background: #f9fafb;">${b.boothNumber}</td>
        <td style="font-weight: bold; font-size: 13px; text-transform: uppercase;">${esc(b.roomName || 'Designated Hall')}</td>
        <td style="font-size: 12px; line-height: 1.4;">${esc(classes)}</td>
        <td style="text-align: center; font-weight: bold; font-size: 13px;">${b.totalStudents || '–'}</td>
      </tr>
    `;
  }).join('');

  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Campus Master Polling Directory - ${esc(shortName)} Election ${esc(year)}</title>
  <style>
    @page {
      margin: 10mm 12mm 14mm 12mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: Arial, sans-serif;
        font-size: 8.5pt;
        font-weight: bold;
        color: #000000;
      }
      @bottom-left {
        content: "College Union Election — Master Polling Directory";
        font-family: Arial, sans-serif;
        font-size: 8pt;
        color: #000000;
      }
    }
    .watermark-global {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 450px;
      height: 450px;
      opacity: 0.08;
      filter: grayscale(100%);
      pointer-events: none;
      z-index: -1;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      color: #000;
      font-size: 12px;
    }
    .master-container {
      border: 3px solid #000;
      padding: 12px;
      min-height: 98vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .master-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .master-logo {
      max-height: 60px;
      max-width: 60px;
      object-fit: contain;
    }
    .college-name {
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      margin: 0;
    }
    .election-title {
      font-size: 13px;
      font-weight: 700;
      color: #333;
      margin-top: 2px;
    }
    .directory-banner {
      background: #000;
      color: #fff;
      text-align: center;
      padding: 8px;
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    .info-bar {
      display: flex;
      justify-content: space-between;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .directory-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .directory-table th {
      background: #111;
      color: #fff;
      border: 1.5px solid #000;
      padding: 8px 6px;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: bold;
    }
    .directory-table td {
      border: 1.5px solid #000;
      padding: 6px 8px;
    }
    .rules-grid {
      border: 1.5px solid #000;
      padding: 8px 10px;
      border-radius: 4px;
      background: #fff;
      margin-bottom: 12px;
    }
    .rules-title {
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3px;
      margin-bottom: 4px;
    }
    .rules-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      font-size: 10px;
    }
    .master-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 2px solid #000;
      padding-top: 8px;
    }
    .footer-seal {
      width: 130px;
      height: 45px;
      border: 1px dashed #666;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #666;
      font-weight: bold;
      text-align: center;
    }
    .footer-sign {
      text-align: right;
    }
    .sign-line {
      width: 180px;
      border-bottom: 1px solid #000;
      margin-bottom: 4px;
      margin-left: auto;
    }
  </style>
</head>
<body>
  ${collegeLogo ? `<div class="watermark-global" style="background-image: url('${collegeLogo}');"></div>` : ''}
  <div class="master-container">
    <div>
      <div class="master-header">
        ${collegeLogo ? `<img src="${collegeLogo}" class="master-logo" alt="Logo">` : ''}
        <div>
          <h1 class="college-name">${esc(collegeName)}</h1>
          <div class="election-title">College Union Elections ${esc(year)} — Office of the Returning Officer</div>
        </div>
      </div>

      <div class="directory-banner">
        CAMPUS POLLING STATIONS &amp; BOOTH ALLOTMENT DIRECTORY
      </div>

      <div class="info-bar">
        <div>📅 <strong>Polling Date:</strong> ${esc(pollDateStr)}</div>
        <div>⏰ <strong>Polling Hours:</strong> ${esc(pollStart)} to ${esc(pollEnd)}</div>
        <div>👥 <strong>Total Registered Electors:</strong> ${totalCampusVoters ? `${totalCampusVoters} Students` : 'All Bona Fide Students'}</div>
      </div>

      <table class="directory-table">
        <thead>
          <tr>
            <th style="width: 75px;">Booth</th>
            <th style="width: 150px;">Station / Room Location</th>
            <th>Departments &amp; Classes Allotted to Vote</th>
            <th style="width: 75px;">Electors</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <div>
      <div class="rules-grid">
        <div class="rules-title">⚠️ Mandatory Directives for All Voters:</div>
        <div class="rules-list">
          <div>• <strong>Compulsory Identity Card:</strong> Every voter must present their College ID Card with photo.</div>
          <div>• <strong>No Electronic Gadgets:</strong> Mobile phones and cameras are prohibited inside voting booths.</div>
          <div>• <strong>Ballots Issued:</strong> General Executive Ballot (White), Dept Association (Colored), Year Rep.</div>
          <div>• <strong>Queue Discipline:</strong> Verify your nominal roll serial number at the door before entering.</div>
        </div>
      </div>

      <div class="master-footer">
        <div class="footer-seal">[ RETURNING OFFICER OFFICIAL SEAL ]</div>
        <div class="footer-sign">
          <div class="sign-line"></div>
          <div style="font-weight: bold; font-size: 12px;">Returning Officer</div>
          <div style="font-size: 10px; color: #444;">${esc(collegeName)}</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`);
  w.document.close();
}

/**
 * Print a blank official nomination form for physical manual submission
 * Exactly matches the structure, styling, and sections of the generated nomination paper.
 */
export function printBlankNominationForm(settings = {}) {
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;
  const year = settings.electionYear || new Date().getFullYear();
  const collegeLogo = settings.collegeLogo || '';
  const collegePlace = settings.collegePlace || CONFIG.COLLEGE_PLACE || 'Palakkad';

  const fillLine = (width = 'flex:1') => {
    if (width.startsWith('flex')) {
      return `<span class="dotted-line" style="flex:1;display:inline-block;border-bottom:1.5px dotted #000;height:24px;vertical-align:bottom;margin-left:6px;"></span>`;
    }
    return `<span class="dotted-line" style="width:${width};display:inline-block;border-bottom:1.5px dotted #000;height:24px;vertical-align:bottom;margin-left:6px;"></span>`;
  };

  const html = `
  <div class="print-paper border border-slate-700 rounded-xl bg-slate-900 text-slate-200" style="padding: 14px 18px;">
    <!-- Centered Clean Header -->
    <div class="text-center pb-2 border-b border-white/10" style="margin-bottom: 8px;">
      <h1 class="font-bold text-white uppercase tracking-wide" style="font-size: 16px; margin: 0 0 2px 0; letter-spacing: 0.04em;">${esc(collegeName)}</h1>
      <p class="text-slate-400 font-semibold tracking-wider uppercase" style="font-size: 11px; margin: 0 0 6px 0;">College Union Election ${esc(year)}</p>
      <div style="display:inline-block; border-top: 1.5px solid #333; border-bottom: 1.5px solid #333; padding: 2.5px 28px; font-weight: bold; font-size: 13.5px; letter-spacing: 0.1em;" class="text-white uppercase">
        NOMINATION PAPER
      </div>
    </div>
    
    <!-- Post Applied For -->
    <div class="flex items-baseline" style="margin: 8px 0 10px 0; font-size: 13px;">
      <span class="font-bold text-white shrink-0" style="font-size: 13.5px;">Post Applied For:</span> 
      ${fillLine('flex:1')}
    </div>

    <!-- Candidate Details -->
    <div class="glass rounded-lg border border-white/10" style="padding: 10px 14px; margin-bottom: 10px;">
      <div class="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
        <h3 class="font-bold text-white uppercase tracking-wider" style="font-size: 11.5px;">Candidate Details</h3>
        <span class="badge font-mono font-bold px-2 py-0.5" style="font-size: 11px; border: 1px solid #555;">
          Electoral Roll Sl. #: <span class="dotted-line" style="display:inline-block;width:95px;height:18px;border-bottom:1.5px dotted #000;margin-left:4px;">&nbsp;</span>
        </span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div class="flex items-baseline">
          <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Name:</span>
          ${fillLine('flex:1')}
        </div>
        <div class="grid grid-cols-2 gap-x-8" style="row-gap: 8px;">
          <div class="flex items-baseline">
            <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Admission No:</span>
            ${fillLine('flex:1')}
          </div>
          <div class="flex items-baseline">
            <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Class:</span>
            ${fillLine('flex:1')}
          </div>
          <div class="flex items-baseline">
            <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Dept:</span>
            ${fillLine('flex:1')}
          </div>
          <div class="flex items-baseline">
            <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Gender:</span>
            ${fillLine('flex:1')}
          </div>
        </div>
        <div class="flex items-baseline" style="margin-top: 1px;">
          <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Date of Birth (DD / MM / YYYY):</span>
          <span class="dotted-line" style="width:210px;display:inline-block;border-bottom:1.5px dotted #000;height:20px;margin-left:6px;"></span>
        </div>
      </div>
    </div>

    <!-- Proposer Details -->
    <div class="glass rounded-lg border border-white/10" style="padding: 10px 14px; margin-bottom: 10px;">
      <div class="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
        <h3 class="font-bold text-white uppercase tracking-wider" style="font-size: 11.5px;">Proposer Details</h3>
        <span class="badge font-mono font-bold px-2 py-0.5" style="font-size: 11px; border: 1px solid #555;">
          Electoral Roll Sl. #: <span class="dotted-line" style="display:inline-block;width:95px;height:18px;border-bottom:1.5px dotted #000;margin-left:4px;">&nbsp;</span>
        </span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div class="flex items-baseline">
          <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Name:</span>
          ${fillLine('flex:1')}
        </div>
        <div class="grid grid-cols-3 gap-x-6">
          <div class="flex items-baseline">
            <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Adm No:</span>
            ${fillLine('flex:1')}
          </div>
          <div class="flex items-baseline">
            <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Class:</span>
            ${fillLine('flex:1')}
          </div>
          <div class="flex items-baseline">
            <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Dept:</span>
            ${fillLine('flex:1')}
          </div>
        </div>
        <div class="flex justify-between items-end border-t border-white/5" style="padding-top: 6px; margin-top: 2px; font-size: 12px;">
          <span class="text-slate-400">Date: _____ / _____ / 202___</span>
          <span class="text-slate-400"><strong>Signature of Proposer:</strong> <span class="dotted-line" style="width:240px;border-bottom:1.5px solid #000;height:22px;margin-left:6px;">&nbsp;</span></span>
        </div>
      </div>
    </div>

    <!-- Seconder Details -->
    <div class="glass rounded-lg border border-white/10" style="padding: 10px 14px; margin-bottom: 10px;">
      <div class="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
        <h3 class="font-bold text-white uppercase tracking-wider" style="font-size: 11.5px;">Seconder Details</h3>
        <span class="badge font-mono font-bold px-2 py-0.5" style="font-size: 11px; border: 1px solid #555;">
          Electoral Roll Sl. #: <span class="dotted-line" style="display:inline-block;width:95px;height:18px;border-bottom:1.5px dotted #000;margin-left:4px;">&nbsp;</span>
        </span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div class="flex items-baseline">
          <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Name:</span>
          ${fillLine('flex:1')}
        </div>
        <div class="grid grid-cols-3 gap-x-6">
          <div class="flex items-baseline">
            <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Adm No:</span>
            ${fillLine('flex:1')}
          </div>
          <div class="flex items-baseline">
            <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Class:</span>
            ${fillLine('flex:1')}
          </div>
          <div class="flex items-baseline">
            <span class="text-slate-400 font-semibold shrink-0" style="font-size: 12px;">Dept:</span>
            ${fillLine('flex:1')}
          </div>
        </div>
        <div class="flex justify-between items-end border-t border-white/5" style="padding-top: 6px; margin-top: 2px; font-size: 12px;">
          <span class="text-slate-400">Date: _____ / _____ / 202___</span>
          <span class="text-slate-400"><strong>Signature of Seconder:</strong> <span class="dotted-line" style="width:240px;border-bottom:1.5px solid #000;height:22px;margin-left:6px;">&nbsp;</span></span>
        </div>
      </div>
    </div>

    <!-- Consent of Candidate -->
    <div class="border-t border-white/10 text-center" style="padding-top: 10px; margin-top: 8px; margin-bottom: 4px;">
      <h3 class="font-bold text-white uppercase tracking-wider" style="font-size: 12px; margin-bottom: 3px;">Consent of Candidate</h3>
      <p class="text-slate-400 italic" style="font-size: 11.5px; margin-bottom: 8px;">"I agree, if elected, to serve on the body to which I am proposed as a candidate."</p>
      <div class="flex justify-around items-start text-slate-400" style="font-size: 12px; margin-top: 6px;">
        <div class="text-center">
          <div><strong>Signature of Candidate:</strong> <span class="dotted-line" style="width:240px;border-bottom:1.5px solid #000;height:22px;margin-left:6px;">&nbsp;</span></div>
          <div class="text-slate-500 italic" style="font-size: 9.5px; margin-top: 4px;">(To be signed in front of the Returning Officer)</div>
        </div>
        <div style="padding-top: 2px;">
          <span><strong>Date:</strong> _____ / _____ / 202___</span>
        </div>
      </div>
    </div>

    <!-- Tear-off Dotted Line (Generous buffer so tearing never impairs candidate signature) -->
    <div style="display:flex;align-items:center;margin: 28px 0 16px 0;">
      <div style="flex:1;border-top:1.5px dashed #444;"></div>
      <span style="padding:0 10px;font-size:8pt;font-weight:bold;text-transform:uppercase;white-space:nowrap;letter-spacing:0.02em;">
        ✂ Tear-off Acknowledgement Slip (To be signed &amp; returned to Candidate by Returning Officer) ✂
      </span>
      <div style="flex:1;border-top:1.5px dashed #444;"></div>
    </div>

    <!-- RO Acknowledgement Slip -->
    <div class="border border-white/20 rounded-lg bg-white/[0.03]" style="padding: 10px 14px;">
      <div class="flex justify-between items-start border-b border-white/10 pb-1" style="margin-bottom: 6px;">
        <div>
          <p class="font-bold text-white uppercase tracking-wide" style="font-size: 11.5px;">RECEIPT / ACKNOWLEDGEMENT SLIP</p>
          <p class="text-slate-400" style="font-size: 10px; margin-top: 1px;">${esc(collegeName)} • College Union Election ${esc(year)}</p>
        </div>
        <div class="text-right font-mono text-slate-400" style="font-size: 10.5px;">
          <p>Receipt No: <span class="dotted-line" style="width:120px;height:16px;margin-left:4px;">&nbsp;</span></p>
        </div>
      </div>
      <div class="text-slate-300" style="font-size: 11.5px; line-height: 1.6; display: flex; flex-direction: column; gap: 6px;">
        <div class="flex items-baseline">
          <span class="shrink-0">Received nomination paper of Candidate:</span>
          ${fillLine('flex:1')}
          <span class="shrink-0 ml-2">Roll Sl. #:</span>
          <span class="dotted-line" style="width:65px;height:16px;margin-left:3px;">&nbsp;</span>
          <span class="shrink-0 ml-2">Adm No:</span>
          <span class="dotted-line" style="width:75px;height:16px;margin-left:3px;">&nbsp;</span>
        </div>
        <div class="flex items-baseline">
          <span class="shrink-0">for the post of:</span>
          ${fillLine('flex:1')}
          <span class="shrink-0 ml-3">on _____ / _____ / 202___</span>
          <span class="shrink-0 ml-2">at _____ : _____ AM/PM</span>
        </div>
      </div>
      <div class="flex justify-between items-end pt-1.5 text-slate-400" style="margin-top: 6px; font-size: 11px;">
        <div>
          <p class="italic text-slate-500" style="font-size: 9.5px;">(To be handed over to the candidate as official proof of submission)</p>
        </div>
        <div class="text-center">
          <div style="border-top:1.5px dashed #000;width:220px;margin-top:16px;margin-bottom:3px;"></div>
          <p class="font-bold text-white" style="font-size: 10px;">Signature &amp; Seal of Returning Officer</p>
        </div>
      </div>
    </div>
  </div>
  
  <div class="print-paper border border-slate-700 rounded-xl p-8 bg-slate-900 text-slate-200 space-y-4" style="page-break-before: always; margin-top: 20px;">
    <div class="flex justify-between items-start text-sm border-b border-white/10 pb-4">
      <div>
        ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:45px;max-width:120px;margin-bottom:4px;display:block;object-fit:contain" alt="College Logo">` : ''}
        <p class="font-bold text-white text-base">${esc(collegeName)}</p>
        <p class="text-slate-400">College Union Election ${year}</p>
      </div>
      <div class="text-right text-xs text-slate-400">
        <p>Supporting Document</p>
      </div>
    </div>
    
    <h2 class="text-center font-bold text-xl text-white py-3 uppercase underline" style="margin-top:20px;margin-bottom:20px;">Certificate from Head of Department</h2>
    
    <div class="my-6 text-base leading-relaxed space-y-6 text-slate-300">
      <p class="text-justify" style="line-height: 1.8;">
        This is to certify that <strong class="text-white">....................................................................</strong> (Admission No: <strong class="text-white">.......................</strong>, Nominal Roll Sl. No: <strong class="text-white">.......................</strong>), a student of <strong class="text-white">.............................................</strong> class in this department, has no academic arrears and maintains the necessary minimum attendance as prescribed by the University election rules and bylaws to contest in the College Union Election ${year}.
      </p>
      
      <div class="flex justify-between text-sm text-slate-400" style="margin-top: 80px;">
        <div class="space-y-3">
          <p>Date: ______ / ______ / ${year}</p>
          <p>Place: ${collegePlace ? esc(collegePlace) : '____________________'}</p>
        </div>
        <div class="text-center space-y-2">
          <p>_______________________</p>
          <p class="font-bold text-white">Name & Signature of the HoD</p>
          <p>Department of _________________</p>
          <p class="text-xs italic">(Office Seal)</p>
        </div>
      </div>
    </div>
  </div>`;
  triggerPrint(html, `Blank Nomination Paper - ${esc(shortName)} Election ${esc(year)}`, collegeLogo);
}

/**
 * Renders the clean official withdrawal paper layout for both filled (official) and blank forms.
 * Matches the exact portal format without any Faculty Advisor/Tutor/Proposer attestation.
 */
export function buildWithdrawalPaper(id = '', nom = {}, collegeName = null, year = null, isBlank = false, collegeLogo = '', collegePlace = null) {
  const today = isBlank ? '' : todayFormatted();
  const cName = collegeName || CONFIG.COLLEGE_NAME;
  const y = year || new Date().getFullYear();
  const cPlace = collegePlace || CONFIG.COLLEGE_PLACE || 'Palakkad';
  const name = isBlank ? '' : (nom.candidate?.NAME || nom.candidateName || nom.name || '');
  const cls  = isBlank ? '' : (nom.candidate?.CLASS || nom.candidateClass || nom.class || '');
  const dept = isBlank ? '' : (nom.candidate?.Dept || nom.candidateDept || nom.dept || '');
  const post = isBlank ? '' : (nom.post || '');
  const adm  = isBlank ? '' : (
    nom.candidate?.['ADMISION NO'] || 
    nom.candidate?.['ADMISSION NO'] || 
    nom.candidate?.['Admission No'] || 
    nom.candidate?.admission_no || 
    nom.candidate?.admission || 
    nom.candidateAdmission || 
    nom.admissionNo || 
    nom.admission_no || 
    nom.adm || 
    ''
  );
  const nomId = isBlank ? '' : id;

  const fillDotted = (width = '300px') => `<span class="dotted-line" style="display:inline-block;width:${width};height:20px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;">&nbsp;</span>`;

  return `
  <div class="print-paper border border-slate-700 rounded-xl p-7 bg-slate-900 text-slate-200 space-y-5" style="max-width: 185mm; margin: 0 auto; box-sizing: border-box;">
    <!-- Header -->
    <div class="flex justify-between items-start text-sm border-b border-white/10 pb-3">
      <div>
        ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:48px;max-width:120px;margin-bottom:6px;display:block;object-fit:contain" alt="Logo">` : ''}
        <p class="font-bold text-white text-base">${esc(cName)}</p>
        <p class="text-slate-400 text-xs">College Union Election ${esc(y)} — Notice of Withdrawal</p>
      </div>
      <div class="text-right text-xs text-slate-400 space-y-1.5">
        ${!isBlank ? `
          <p>Date: ${today}</p>
          ${nomId ? `<p class="font-mono text-indigo-300 font-bold text-sm">ID: ${esc(nomId)}</p>` : ''}
        ` : ''}
      </div>
    </div>

    <!-- Title -->
    <h2 class="text-center font-bold text-lg text-white border-y border-white/10 py-2.5 uppercase tracking-wide">
      FORM FOR WITHDRAWAL OF CANDIDATE
    </h2>

    <!-- Particulars (Relaxed & Full-Width) -->
    <div class="space-y-4 text-sm" style="margin: 20px 0 24px 0;">
      ${!isBlank && nomId ? `
        <div class="flex items-baseline" style="padding: 2px 0;">
          <span class="text-slate-400 font-semibold shrink-0" style="width: 215px; font-size: 13.5px;">Nomination ID:</span>
          <strong class="font-mono text-indigo-300 text-base font-bold">${esc(nomId)}</strong>
        </div>
      ` : ''}
      <div class="flex items-baseline" style="padding: 2px 0;">
        <span class="text-slate-400 font-semibold shrink-0" style="width: 215px; font-size: 13.5px;">Post Contested:</span>
        ${isBlank ? `<span class="dotted-line" style="flex:1;display:inline-block;height:20px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;margin-left:8px;">&nbsp;</span>` : `<strong class="text-white text-base font-bold">${esc(post)}</strong>`}
      </div>
      <div class="flex items-baseline" style="padding: 2px 0;">
        <span class="text-slate-400 font-semibold shrink-0" style="width: 215px; font-size: 13.5px;">Candidate Name:</span>
        ${isBlank ? `<span class="dotted-line" style="flex:1;display:inline-block;height:20px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;margin-left:8px;">&nbsp;</span>` : `<span class="font-bold text-white text-base">${esc(name)}</span>`}
      </div>
      <div class="flex items-baseline" style="padding: 2px 0;">
        <span class="text-slate-400 font-semibold shrink-0" style="width: 215px; font-size: 13.5px;">Admission Number:</span>
        ${isBlank ? `<span class="dotted-line" style="flex:1;display:inline-block;height:20px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;margin-left:8px;">&nbsp;</span>` : `<span class="font-mono text-white text-base font-semibold">${esc(adm)}</span>`}
      </div>
      <div class="flex items-baseline" style="padding: 2px 0;">
        <span class="text-slate-400 font-semibold shrink-0" style="width: 215px; font-size: 13.5px;">Class &amp; Semester:</span>
        ${isBlank ? `<span class="dotted-line" style="flex:1;display:inline-block;height:20px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;margin-left:8px;">&nbsp;</span>` : `<span>${esc(cls)}</span>`}
      </div>
      <div class="flex items-baseline" style="padding: 2px 0;">
        <span class="text-slate-400 font-semibold shrink-0" style="width: 215px; font-size: 13.5px;">Department:</span>
        ${isBlank ? `<span class="dotted-line" style="flex:1;display:inline-block;height:20px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;margin-left:8px;">&nbsp;</span>` : `<span>${esc(dept)}</span>`}
      </div>
    </div>

    <!-- Candidate Declaration (Prescribed University Format) -->
    <div class="text-sm text-slate-300 border border-white/10 rounded-xl p-5 bg-white/5" style="padding: 18px 22px; margin-bottom: 22px;">
      ${isBlank 
        ? `<div class="space-y-3" style="line-height: 2.2; font-size: 14px;">
             <div class="flex items-baseline">
               <span class="shrink-0 font-medium">I</span>
               <span class="dotted-line" style="flex:1;display:inline-block;height:20px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;margin-left:8px;">&nbsp;</span>
             </div>
             <div class="flex items-baseline">
               <span class="dotted-line" style="flex:1;display:inline-block;height:20px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;margin-right:8px;">&nbsp;</span>
               <span class="shrink-0 font-medium">hereby withdraw</span>
             </div>
             <div class="flex items-baseline">
               <span class="shrink-0 font-medium">my candidature for the office of</span>
               <span class="dotted-line" style="flex:1;display:inline-block;height:20px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;margin-left:8px;">&nbsp;</span>
             </div>
             <div class="flex items-baseline">
               <span class="dotted-line" style="flex:1;display:inline-block;height:20px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;margin-right:8px;">&nbsp;</span>
               <span class="shrink-0 font-medium">of the College Union.</span>
             </div>
           </div>`
        : `<div style="line-height: 2.0; font-size: 14px;">
             <p>
               I, <strong class="text-white font-bold">${esc(name)}</strong>, hereby withdraw my candidature for the office of <strong class="text-white font-bold">${esc(post)}</strong> of the College Union.
             </p>
           </div>`
      }
    </div>

    <!-- Candidate Signature Section -->
    <div class="flex justify-between items-end pt-3 text-sm text-slate-400">
      <div class="space-y-2.5" style="line-height: 1.8;">
        <p>Place: ${isBlank ? '___________________________' : esc(cPlace)}</p>
        <p>Date: ${isBlank ? `_____ / _____ / ${esc(y)}` : today}</p>
      </div>
      <div class="text-center" style="width: 260px;">
        <div style="height: 40px;"></div>
        <div style="border-top: 1.5px solid #000; margin-bottom: 4px;"></div>
        <p class="font-bold text-white text-xs">Signature of Candidate</p>
        ${!isBlank && name ? `<p class="text-xs text-slate-400">(${esc(name)})</p>` : ''}
        <p class="text-[11px] text-slate-400 mt-1 font-medium">(To be signed in front of the Returning Officer)</p>
      </div>
    </div>

    <!-- Tear-off / Receipt Separator -->
    <div style="display:flex;align-items:center;margin:18px 0 14px 0;">
      <div style="flex:1;border-top:1.5px dashed #555;"></div>
      <span style="padding:0 12px;font-size:8.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;">
        ✂ RECEIPT ✂
      </span>
      <div style="flex:1;border-top:1.5px dashed #555;"></div>
    </div>

    <!-- Receipt -->
    <div class="border border-white/20 rounded-xl p-5 bg-white/[0.03] space-y-3.5 text-xs" style="padding: 16px 20px;">
      <div class="flex justify-between items-center border-b border-white/10 pb-2">
        <span class="font-bold text-white uppercase tracking-wider text-sm font-bold">RECEIPT</span>
        <span class="text-slate-400">Receipt Ref: ${isBlank ? fillDotted('120px') : `<strong class="font-mono text-indigo-300 font-bold">${esc(nomId)}/WD</strong>`}</span>
      </div>

      <!-- Candidate Details in Receipt -->
      <div class="grid grid-cols-2 gap-x-6 gap-y-2 py-1 text-xs border-b border-white/10 pb-3" style="line-height: 1.6;">
        <div class="flex items-baseline">
          <span class="text-slate-400 font-semibold shrink-0" style="width: 120px;">Candidate Name:</span>
          ${isBlank ? `<span class="dotted-line" style="flex:1;display:inline-block;height:18px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;margin-left:6px;">&nbsp;</span>` : `<strong class="text-white text-xs font-bold">${esc(name)}</strong>`}
        </div>
        <div class="flex items-baseline">
          <span class="text-slate-400 font-semibold shrink-0" style="width: 120px;">Admission No.:</span>
          ${isBlank ? `<span class="dotted-line" style="flex:1;display:inline-block;height:18px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;margin-left:6px;">&nbsp;</span>` : `<span class="font-mono text-white text-xs font-semibold">${esc(adm)}</span>`}
        </div>
        <div class="flex items-baseline">
          <span class="text-slate-400 font-semibold shrink-0" style="width: 120px;">Class:</span>
          ${isBlank ? `<span class="dotted-line" style="flex:1;display:inline-block;height:18px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;margin-left:6px;">&nbsp;</span>` : `<span class="text-slate-200 text-xs">${esc(cls)}</span>`}
        </div>
        <div class="flex items-baseline">
          <span class="text-slate-400 font-semibold shrink-0" style="width: 120px;">Post Contested:</span>
          ${isBlank ? `<span class="dotted-line" style="flex:1;display:inline-block;height:18px;vertical-align:bottom;border-bottom:1.5px dotted #333 !important;margin-left:6px;">&nbsp;</span>` : `<strong class="text-white text-xs font-bold">${esc(post)}</strong>`}
        </div>
      </div>

      <p class="text-slate-300" style="line-height: 1.85; font-size: 12px; margin-top: 4px;">
        Received the notice of withdrawal of candidature for the above office/post, delivered at my office on <span style="white-space:nowrap;">Date: <strong>_____ / _____ / ${esc(y)}</strong></span> at <span style="white-space:nowrap;">Time: <strong>_____ : _____ AM/PM</strong></span>.
      </p>

      <div class="flex justify-end pt-2 text-slate-400" style="display:flex;justify-content:flex-end;">
        <div class="text-center" style="width: 240px;">
          <div style="border-top: 1.5px dashed #000; margin-top: 28px; margin-bottom: 4px;"></div>
          <p class="font-bold text-white text-xs">Returning Officer</p>
          <p class="text-[10px] text-slate-400">${esc(cName)}</p>
        </div>
      </div>
    </div>
  </div>`;
}

/**
 * Print a blank official withdrawal notice form for physical manual submission
 * Uses the exact same format as the portal withdrawal notice without any attestation box.
 */
export function printBlankWithdrawalForm(settings = {}) {
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME;
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME;
  const year = settings.electionYear || new Date().getFullYear();
  const collegeLogo = settings.collegeLogo || '';
  const collegePlace = settings.collegePlace || CONFIG.COLLEGE_PLACE || 'Palakkad';

  const html = buildWithdrawalPaper('', {}, collegeName, year, true, collegeLogo, collegePlace);
  triggerPrint(html, `Blank Withdrawal Form - ${esc(shortName)} Election ${esc(year)}`, collegeLogo);
}

/**
 * Open high-precision A3 landscape Ballot Box Strip Seal printable sheets (30 Nos).
 */
export function printBallotBoxStripSeals() {
  const w = window.open('./Ballot_Box_Strip_Seals_A3_30_Seals.html', '_blank');
  if (!w) {
    alert('Pop-up blocker prevented opening the strip seal print sheets. Please allow pop-ups for this site.');
  }
}

/**
 * Open pre-compiled high-resolution PDF for Ballot Box Strip Seals (A3 Landscape, 30 Nos).
 */
export function openBallotBoxStripSealsPdf() {
  const w = window.open('./Ballot_Box_Strip_Seals_A3_30_Seals.pdf', '_blank');
  if (!w) {
    alert('Pop-up blocker prevented opening the strip seal PDF. Please allow pop-ups for this site.');
  }
}

/**
 * Helper to infer department name from class label if not explicit in nominal roll
 */
function inferDeptFromClassName(clsName) {
  const u = String(clsName || '').toUpperCase();
  if (u.includes('COMMERCE') || u.includes('BCOM') || u.includes('B.COM') || u.includes('MCOM') || u.includes('M.COM')) return 'Commerce';
  if (u.includes('ECONOMICS') || u.includes('BA ECON')) return 'Economics';
  if (u.includes('HISTORY') || u.includes('BA HIST')) return 'History';
  if (u.includes('MATH')) return 'Mathematics';
  if (u.includes('PHYSIC')) return 'Physics';
  if (u.includes('CHEMIS')) return 'Chemistry';
  if (u.includes('BOTANY')) return 'Botany';
  if (u.includes('ZOOLOGY')) return 'Zoology';
  if (u.includes('ENGLISH') || u.includes('BA ENG') || u.includes('MA ENG')) return 'English';
  if (u.includes('MALAYALAM') || u.includes('BA MAL') || u.includes('MA MAL')) return 'Malayalam';
  if (u.includes('TAMIL') || u.includes('BA TAMIL') || u.includes('MA TAMIL')) return 'Tamil';
  if (u.includes('MUSIC')) return 'Music';
  if (u.includes('PHILOSOPHY') || u.includes('BA PHIL')) return 'Philosophy';
  if (u.includes('GEOGRAPHY')) return 'Geography';
  if (u.includes('ELECTRONIC')) return 'Electronics';
  if (u.includes('POLITIC') || u.includes('POLITICAL')) return 'Political Science';
  return 'General / Multidisciplinary';
}

/**
 * Dynamically renders and prints the Official Department & Class Polling Directory Poster (1 UG to PG)
 * using the LIVE system data (booths, nominalRoll, settings, schedule).
 */
export function printDepartmentClassDirectoryPoster(options = {}) {
  const boothsList = Array.isArray(options.booths) ? options.booths : (Array.isArray(options) ? options : []);
  const settings = options.settings || {};
  const schedule = options.schedule || {};
  const nominalRoll = Array.isArray(options.nominalRoll) ? options.nominalRoll : [];
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME || 'GOVERNMENT COLLEGE CHITTUR';
  const collegePlace = settings.collegePlace || CONFIG.COLLEGE_PLACE || 'Chittur, Palakkad';
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME || 'GCC';
  const year = settings.electionYear || new Date().getFullYear().toString();
  const collegeLogo = settings.collegeLogo || CONFIG.COLLEGE_LOGO || '';

  // 1. Build class-to-booth lookup from live booths
  const classToBoothMap = {};
  boothsList.forEach(b => {
    const bNum = b.boothNumber || b.tableNumber;
    const room = b.roomName || b.room || `Booth ${bNum}`;
    const bClasses = Array.isArray(b.classes) ? b.classes : (typeof b.classes === 'string' ? b.classes.split(',').map(s => s.trim()) : []);
    bClasses.forEach(cName => {
      const trimmed = String(cName).trim();
      if (trimmed) {
        classToBoothMap[trimmed] = {
          boothNumber: bNum,
          roomName: room,
          booth: b
        };
      }
    });
  });

  // 2. Aggregate actual statistics from nominal roll
  const classStats = {};
  const deptMap = {}; // deptName -> Set of classKeys

  nominalRoll.forEach(s => {
    const rawCls = String(s['CLASS'] || '').trim();
    const rawDept = String(s['Dept'] || '').trim();
    const dept = rawDept || inferDeptFromClassName(rawCls);
    const isRS = rawCls.toUpperCase().includes('RESEARCH') || rawCls.toUpperCase().includes('SCHOLAR') || rawCls.toUpperCase().includes('PHD');
    const cKey = isRS ? `RESEARCH SCHOLAR - ${dept}` : rawCls;
    if (!cKey) return;

    if (!classStats[cKey]) {
      classStats[cKey] = {
        name: cKey,
        dept: dept,
        count: 0
      };
    }
    classStats[cKey].count++;

    if (!deptMap[dept]) deptMap[dept] = new Set();
    deptMap[dept].add(cKey);
  });

  // Also include any classes assigned in booths that might have 0 voters in nominal roll
  boothsList.forEach(b => {
    const bClasses = Array.isArray(b.classes) ? b.classes : (typeof b.classes === 'string' ? b.classes.split(',').map(s => s.trim()) : []);
    bClasses.forEach(cName => {
      const cKey = String(cName).trim();
      if (!cKey) return;
      if (!classStats[cKey]) {
        const dept = inferDeptFromClassName(cKey);
        classStats[cKey] = {
          name: cKey,
          dept: dept,
          count: 0
        };
        if (!deptMap[dept]) deptMap[dept] = new Set();
        deptMap[dept].add(cKey);
      }
    });
  });

  const sortClasses = (cA, cB) => compareClassesByYearOrder(cA, cB);

  const sortedDepts = Object.keys(deptMap).sort((a, b) => a.localeCompare(b));
  const totalClasses = Object.keys(classStats).length;
  const totalElectors = nominalRoll.length || Object.values(classStats).reduce((sum, c) => sum + c.count, 0);

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  const pollStart = formatTime(schedule.pollingStart) || '09:30 AM';
  const pollEnd = formatTime(schedule.pollingEnd) || '12:30 PM';

  const w = window.open('', '_blank');
  if (!w) {
    alert('Pop-up blocker prevented opening the directory poster. Please allow pop-ups for this site.');
    return;
  }

  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Department &amp; Class Polling Directory - ${esc(shortName)} Election ${esc(year)}</title>
  <style>
    @page {
      size: A3 portrait;
      margin: 8mm 10mm 10mm 10mm;
      @bottom-right {
        content: "Campus Polling Directory &bull; Page " counter(page) " of " counter(pages);
        font-family: Arial, sans-serif;
        font-size: 8pt;
        font-weight: 700;
        color: #000000;
      }
      @bottom-left {
        content: "${esc(collegeName)} — Official Department & Class Polling Directory";
        font-family: Arial, sans-serif;
        font-size: 8pt;
        color: #000000;
      }
    }

    @media print {
      html, body {
        width: 100%;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print { display: none !important; }
      .dept-card {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #ffffff;
      color: #000000;
      line-height: 1.25;
      font-size: 11pt;
      -webkit-font-smoothing: antialiased;
    }

    .screen-topbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #000000;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .topbar-btn {
      background: #000000;
      color: #ffffff;
      border: 1.5px solid #ffffff;
      padding: 7px 16px;
      font-weight: 800;
      font-size: 13px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .topbar-btn:hover { background: #333333; color: #fff; }

    .poster-container {
      max-width: 1200px;
      margin: 15px auto;
      background: #ffffff;
      border: 3px solid #000000;
      padding: 12px 16px;
      box-shadow: none;
    }

    /* Header */
    .header-box {
      border-bottom: 2.5px solid #000000;
      padding-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
    }
    .emblem-img {
      width: 65px;
      height: 65px;
      object-fit: contain;
      filter: grayscale(100%);
    }
    .header-center {
      text-align: center;
      flex: 1;
    }
    .inst-name {
      font-size: 24pt;
      font-weight: 900;
      color: #000000;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .inst-sub {
      font-size: 11pt;
      font-weight: 700;
      color: #000000;
    }
    .election-title {
      font-size: 14pt;
      font-weight: 900;
      color: #000000;
      letter-spacing: 1px;
      margin-top: 3px;
    }
    .poster-main-badge {
      display: inline-block;
      background: #000000;
      color: #ffffff;
      font-size: 14pt;
      font-weight: 900;
      padding: 6px 24px;
      border-radius: 4px;
      letter-spacing: 1px;
      margin-top: 8px;
      text-transform: uppercase;
      border: 1.5px solid #000000;
    }
    .poster-sub-note {
      font-size: 10pt;
      font-weight: 800;
      color: #000000;
      margin-top: 6px;
      letter-spacing: 0.3px;
    }

    /* Meta Info Bar */
    .meta-bar {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      background: #000000;
      color: #ffffff;
      padding: 10px 16px;
      margin-top: 12px;
      border-radius: 4px;
      text-align: center;
      border: 1.5px solid #000000;
    }
    .meta-item strong {
      display: block;
      font-size: 9pt;
      color: #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-item span {
      font-size: 12pt;
      font-weight: 900;
      color: #ffffff;
    }

    /* Department Cards Grid */
    .depts-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      margin-top: 16px;
    }
    .dept-card {
      border: 2px solid #000000;
      border-radius: 4px;
      overflow: hidden;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }
    .dept-card-header {
      background: #000000;
      color: #ffffff;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #000000;
    }
    .dept-title {
      font-size: 14pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #ffffff;
    }
    .dept-badge {
      background: #ffffff;
      color: #000000;
      font-size: 10pt;
      font-weight: 900;
      padding: 2.5px 8px;
      border-radius: 3px;
      border: 1px solid #000000;
    }

    /* Class Table inside card */
    .dept-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12pt;
      color: #000000;
    }
    .dept-table th {
      background: #f4f4f5;
      color: #000000;
      font-size: 11pt;
      font-weight: 900;
      text-transform: uppercase;
      padding: 6px 10px;
      border-bottom: 2px solid #000000;
      text-align: left;
    }
    .dept-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #000000;
      vertical-align: middle;
      line-height: 1.3;
      color: #000000;
    }
    .dept-table tr:nth-child(even) td {
      background: #fafafa;
    }
    .col-class {
      font-weight: 900;
      color: #000000;
      width: 38%;
      font-size: 13pt;
      padding: 10px 14px;
      border-right: 2px solid #000000;
    }
    .col-destination {
      width: 62%;
      background: #ffffff;
      padding: 12px 16px;
      vertical-align: middle;
      color: #000000;
    }
    .venue-main {
      font-size: 15pt;
      font-weight: 900;
      color: #000000;
      line-height: 1.25;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .venue-icon {
      font-size: 13pt;
      margin-right: 2px;
    }
    .booth-tag-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .booth-tag {
      display: inline-block;
      background: #000000;
      color: #ffffff;
      font-weight: 900;
      font-size: 11pt;
      padding: 3.5px 12px;
      border-radius: 3px;
      letter-spacing: 0.5px;
      white-space: nowrap;
      text-transform: uppercase;
      border: 1.5px solid #000000;
    }
    .booth-unassigned {
      background: #ffffff;
      color: #000000;
      border: 1.5px dashed #000000;
    }

    /* Footer Directives */
    .poster-footer {
      margin-top: 10px;
      border-top: 2px solid #000000;
      padding-top: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #000000;
    }
    .footer-stamp {
      border: 1.5px dashed #000000;
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: 700;
      text-align: center;
      color: #000000;
    }
  </style>
</head>
<body>

  <!-- Screen Control Bar -->
  <div class="screen-topbar no-print">
    <div style="display: flex; align-items: center; gap: 12px;">
      <strong style="font-size: 14px; color: #fff;">Department &amp; Class Polling Directory Poster</strong>
      <span style="font-size: 11px; color: #cbd5e1;">${sortedDepts.length} Departments &bull; ${totalClasses} Classes &bull; ${boothsList.length} Booths (Live Data)</span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <button class="topbar-btn" onclick="window.print()">
        <span>🖨️</span> Print Directory Poster (A3 / A4)
      </button>
      <button class="topbar-btn" style="background: #333333; color: #fff; border: 1.5px solid #666;" onclick="window.close()">
        <span>✕</span> Close
      </button>
    </div>
  </div>

  <div class="poster-container">
    <!-- Header -->
    <div class="header-box">
      ${collegeLogo ? `<img src="${collegeLogo}" class="emblem-img" alt="Emblem">` : ''}
      <div class="header-center">
        <div class="inst-name">${esc(collegeName)}</div>
        <div class="inst-sub">${esc(collegePlace)} &bull; Established Under Govt. of Kerala</div>
        <div class="election-title">COLLEGE UNION ELECTIONS ${esc(year)}</div>
        <div class="poster-main-badge">DEPARTMENT &amp; CLASS-WISE POLLING DIRECTORY</div>
        <div class="poster-sub-note">OFFICIAL NOTICE BOARD &amp; ENTRY GATE GUIDE &bull; ALLOTTED POLLING BOOTHS &amp; ROOM VENUES</div>
      </div>
      ${collegeLogo ? `<img src="${collegeLogo}" class="emblem-img" alt="Emblem">` : ''}
    </div>

    <!-- Meta Information Bar -->
    <div class="meta-bar">
      <div class="meta-item">
        <strong>Polling Schedule</strong>
        <span>${esc(pollStart)} – ${esc(pollEnd)}</span>
      </div>
      <div class="meta-item">
        <strong>Voter Identification</strong>
        <span>College ID Mandatory</span>
      </div>
      <div class="meta-item">
        <strong>Polling Booths</strong>
        <span>${boothsList.length} Physical Booths</span>
      </div>
    </div>

    <!-- Departments & Classes Grid -->
    <div class="depts-grid">
      ${sortedDepts.map(deptName => {
        const classKeys = Array.from(deptMap[deptName] || []).sort(sortClasses);
        const deptElectors = classKeys.reduce((sum, cn) => sum + (classStats[cn]?.count || 0), 0);
        
        // Group consecutive adjacent classes that share the exact same booth & room venue
        const groups = [];
        classKeys.forEach(cName => {
          const boothInfo = classToBoothMap[cName];
          const bNum = boothInfo?.boothNumber;
          const rName = boothInfo?.roomName;
          const key = boothInfo ? `${bNum}____${rName}` : '__unassigned';
          const lastGroup = groups[groups.length - 1];
          if (lastGroup && lastGroup.key === key) {
            lastGroup.classes.push(cName);
          } else {
            groups.push({
              key,
              boothInfo,
              classes: [cName]
            });
          }
        });

        return `
          <div class="dept-card">
            <div class="dept-card-header">
              <span class="dept-title">${esc(deptName)}</span>
              <span class="dept-badge">${classKeys.length} Classes</span>
            </div>
            <table class="dept-table">
              <thead>
                <tr>
                  <th class="col-class">CLASS / COHORT (1 UG &rarr; PG)</th>
                  <th class="col-destination">ALLOTTED ROOM VENUE &amp; POLLING BOOTH</th>
                </tr>
              </thead>
              <tbody>
                ${groups.map(g => {
                  return g.classes.map((cName, idx) => {
                    const isFirst = idx === 0;
                    const span = g.classes.length;
                    return `
                      <tr>
                        <td class="col-class">${esc(cName)}</td>
                        ${isFirst ? `
                          <td class="col-destination" rowspan="${span}">
                            ${g.boothInfo ? `
                              <div class="venue-main">
                                ${esc(g.boothInfo.roomName)}
                              </div>
                              <div class="booth-tag-container">
                                <span class="booth-tag">POLLING BOOTH ${g.boothInfo.boothNumber}</span>
                              </div>
                            ` : `
                              <span class="booth-tag booth-unassigned">Not Allotted</span>
                            `}
                          </td>
                        ` : ''}
                      </tr>
                    `;
                  }).join('');
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Footer -->
    <div class="poster-footer">
      <div></div>
      <div class="footer-stamp">
        RETURNING OFFICER (RO)<br>
        <span style="font-size: 6.5pt; color: #000000;">${esc(collegeName)}</span>
      </div>
    </div>
  </div>

</body>
</html>`);

  w.document.close();
  setTimeout(() => w.print(), 350);
}

/**
 * Open high-resolution printable PDF view for Department & Class Polling Directory Poster.
 */
export function openDepartmentClassPosterPdf(options = {}) {
  printDepartmentClassDirectoryPoster(options);
}



/**
 * Dynamically renders and prints Official Counting Table Sequence Placards (A4 Portrait)
 * for the exact number of tables set in the system (e.g. 12 tables).
 */

export function printCountingTablePlacards(options = {}) {
  const settings = options.settings || {};
  const collegeName = settings.collegeName || CONFIG.COLLEGE_NAME || 'GOVERNMENT COLLEGE CHITTUR';
  const collegePlace = settings.collegePlace || CONFIG.COLLEGE_PLACE || 'Chittur, Palakkad';
  const shortName = settings.collegeShortName || CONFIG.COLLEGE_SHORT_NAME || 'GCC';
  const year = settings.electionYear || new Date().getFullYear().toString();
  const collegeLogo = settings.collegeLogo || CONFIG.COLLEGE_LOGO || '';

  // All configured booths/tables
  const allBooths = Array.isArray(options.booths) && options.booths.length > 0
    ? options.booths
    : OFFICIAL_COUNTING_ROSTER_BACKUP.map(t => ({
        boothNumber: t.tableNumber,
        roomName: t.roomName || `Table ${t.tableNumber}`,
        classes: [],
        dept: t.supervisor?.department || ''
      }));

  // Target tables to print
  let boothsList = [...allBooths];
  const targetTable = options.tableNumber && options.tableNumber !== 'all' ? String(options.tableNumber) : null;
  if (targetTable) {
    boothsList = boothsList.filter(b => String(b.boothNumber || b.tableNumber) === targetTable);
  }

  if (!boothsList.length) {
    alert('No counting tables found to print.');
    return;
  }

  const rawMatrix = options.matrix || options.countingMatrixData || options.savedMatrix || null;
  const matrix = Array.isArray(rawMatrix) 
    ? rawMatrix 
    : (Array.isArray(rawMatrix?.matrix) ? rawMatrix.matrix : null);
  const formSerials = (options.formSerials && typeof options.formSerials === 'object') 
    ? options.formSerials 
    : (rawMatrix?.formSerials || {});
  const roundLabels = Array.isArray(options.roundLabels) 
    ? options.roundLabels 
    : (Array.isArray(rawMatrix?.roundLabels) ? rawMatrix.roundLabels : null);
  const countingTeams = Array.isArray(options.countingTeams) ? options.countingTeams : [];
  const nominalRoll = Array.isArray(options.nominalRoll) ? options.nominalRoll : [];
  const postsList = Array.isArray(options.posts) ? options.posts : [];

  // Helper to resolve official squad for a table
  const getSquadForTable = (tableNum) => {
    const live = countingTeams.find(t => String(t.tableNumber || t.boothNumber) === String(tableNum));
    if (live) {
      const sup = live.supervisorName || (typeof live.supervisor === 'string' ? live.supervisor : live.supervisor?.name) || 'Senior Faculty (HoD)';
      const supDesig = live.supervisor?.designation || 'Counting Supervisor';
      const supDept = live.supervisor?.department || '';
      const asst = live.assistantName || (typeof live.assistant === 'string' ? live.assistant : live.assistant?.name) || live.countingAssistant?.name || 'Senior Staff';
      const asstDesig = live.assistant?.designation || live.countingAssistant?.designation || 'Counting Assistant';
      const off1 = live.countingOfficer1?.name || (Array.isArray(live.countingOfficers) && live.countingOfficers[0]?.name) || '';
      return { sup, supDesig, supDept, asst, asstDesig, off1 };
    }
    const backup = OFFICIAL_COUNTING_ROSTER_BACKUP.find(t => String(t.tableNumber) === String(tableNum));
    if (backup) {
      const sup = backup.supervisor?.name || 'Senior Faculty';
      const supDesig = backup.supervisor?.designation || 'Associate Professor';
      const supDept = backup.supervisor?.department || '';
      const asst = backup.countingAssistant?.name || 'Senior Staff';
      const asstDesig = backup.countingAssistant?.designation || 'Counting Assistant';
      const off1 = backup.countingOfficer1?.name || '';
      return { sup, supDesig, supDept, asst, asstDesig, off1 };
    }
    return {
      sup: 'Faculty Counting Supervisor',
      supDesig: 'Associate Professor',
      supDept: '',
      asst: 'Staff Counting Assistant',
      asstDesig: 'Counting Assistant',
      off1: ''
    };
  };

  // Helper to count voters for a booth
  const getVoterCount = (b) => {
    if (b.totalStudents && b.totalStudents > 0) return b.totalStudents;
    const bClasses = Array.isArray(b.classes) ? b.classes : (typeof b.classes === 'string' ? b.classes.split(',').map(s => s.trim()) : []);
    if (!bClasses.length || !nominalRoll.length) return 0;
    return nominalRoll.filter(s => {
      const c = String(s['CLASS'] || '').trim();
      return bClasses.includes(c);
    }).length;
  };

  const isUucPost = (p) => {
    if (!p) return false;
    const str = String(typeof p === 'string' ? p : (p.post || p.name || '')).toUpperCase();
    return str.includes('UUC') || str.includes('UNIVERSITY UNION COUNCILLOR') || str.includes('COUNCILLOR');
  };

  const pagesHtml = boothsList.map((b, idx) => {
    const tableNum = b.boothNumber || b.tableNumber || (idx + 1);
    const origT = allBooths.findIndex(booth => String(booth.boothNumber || booth.tableNumber) === String(tableNum));
    const tIndex = origT >= 0 ? origT : idx;
    const roomName = b.roomName || b.room || `Table ${tableNum}`;
    const squad = getSquadForTable(tableNum);
    const voterCount = getVoterCount(b);
    const classesList = Array.isArray(b.classes) ? b.classes : (typeof b.classes === 'string' ? b.classes.split(',').map(s => s.trim()) : []);
    const classesDesc = classesList.length ? classesList.join(', ') : 'Allotted Electoral Cohort';
    const deptName = b.dept || squad.supDept || 'Academic Department';

    // Build the exact round-by-round sequence for this table from Counting Matrix
    const tableRounds = [];
    const matrixRow = (matrix && Array.isArray(matrix[tIndex])) ? matrix[tIndex] : null;

    if (matrixRow && matrixRow.length > 0) {
      let prevRoundNum = 0;
      matrixRow.forEach((post, rIdx) => {
        const curRoundNum = rIdx + 1;
        if (!post) return;

        // If there was an idle gap in the matrix between earlier rounds and UUC / next post
        if (prevRoundNum > 0 && curRoundNum > prevRoundNum + 1) {
          const gapStart = prevRoundNum + 1;
          const gapEnd = curRoundNum - 1;
          const gapLabel = gapStart === gapEnd ? `Round ${gapStart}` : `Rounds ${gapStart}–${gapEnd}`;
          tableRounds.push({
            isGap: true,
            roundNum: gapLabel,
            roundLabel: gapLabel,
            postName: 'Table Standby & Reconciliation (No seat allotted for this table • Await RO call for next round)',
            serial: '—',
            isUuc: false
          });
        }
        prevRoundNum = curRoundNum;

        const pName = String(typeof post === 'string' ? post : (post.post || post.name || '')).trim();
        if (!pName) return;
        const isUuc = isUucPost(pName);
        const rLabel = (roundLabels && roundLabels[rIdx]) ? roundLabels[rIdx] : `Round ${curRoundNum}`;
        const rawSerial = (formSerials && (formSerials[`${tIndex}-${rIdx}`] || formSerials[`${tableNum}-${curRoundNum}`])) || '';
        const serial = rawSerial ? (String(rawSerial).startsWith('#') ? rawSerial : `#${rawSerial}`) : `#${tableNum}-${curRoundNum}`;

        tableRounds.push({
          isGap: false,
          roundNum: `Round ${curRoundNum}`,
          roundNumVal: curRoundNum,
          roundLabel: rLabel,
          postName: pName,
          serial,
          isUuc
        });
      });
    }

    // Fallback: If matrix not saved yet, build statutory rounds dynamically
    if (!tableRounds.length && postsList.length > 0) {
      const uuc = postsList.filter(p => isUucPost(p));
      const nonUuc = postsList.filter(p => !isUucPost(p));
      let rCounter = 1;
      nonUuc.forEach(p => {
        const pName = String(p?.post || p?.name || p).trim();
        tableRounds.push({
          roundNum: rCounter,
          roundLabel: `Round ${rCounter}`,
          postName: pName,
          serial: `${tableNum}-${rCounter}`,
          isUuc: false
        });
        rCounter++;
      });
      uuc.forEach(p => {
        const pName = String(p?.post || p?.name || p).trim();
        tableRounds.push({
          roundNum: rCounter,
          roundLabel: `Round ${rCounter} (UUC)`,
          postName: pName,
          serial: `${tableNum}-${rCounter}`,
          isUuc: true
        });
        rCounter++;
      });
    }

    // Total rounds count for this table
    const totalTableRounds = tableRounds.length;

    return `
      <div class="placard-page ${idx < boothsList.length - 1 ? 'page-break' : ''}" id="table-${tableNum}">
        <div class="placard-frame">
          
          <!-- Header -->
          <div class="header-box">
            <div class="header-top">
              ${collegeLogo ? `<img src="${collegeLogo}" class="emblem-img" alt="Emblem">` : ''}
              <div class="header-center">
                <div class="institution-title">${esc(collegeName)}</div>
                <div class="institution-subtitle">${esc(collegePlace)} &bull; Established Under Govt. of Kerala</div>
                <div class="election-banner-title">COLLEGE UNION ELECTIONS ${esc(year)}</div>
                <div class="placard-badge-title">COUNTING SEQUENCE</div>
              </div>
              ${collegeLogo ? `<img src="${collegeLogo}" class="emblem-img" alt="Emblem">` : ''}
            </div>
          </div>

          <!-- Table Meta Details Banner (Table Number & Officials Squad only) -->
          <div class="table-meta-grid">
            <div class="meta-col-table">
              <div class="meta-label">STATUTORY COUNTING TABLE</div>
              <div class="table-giant-pill">TABLE ${tableNum}</div>
              <div class="booth-sub-link">Polling Booth ${tableNum} &bull; ${totalTableRounds} Scheduled Rounds</div>
            </div>
            <div class="meta-col-officials">
              <div class="meta-label">TABLE OFFICIALS SQUAD</div>
              <div class="official-row">
                <span class="officer-role">Supervisor:</span>
                <span class="officer-name">${esc(squad.sup)}</span>
              </div>
              <div class="official-sub-role">${esc(squad.supDesig)} ${squad.supDept ? `(${esc(squad.supDept)})` : ''}</div>
              <div class="official-row" style="margin-top:4px;">
                <span class="officer-role">Assistant:</span>
                <span class="officer-name">${esc(squad.asst)}</span>
              </div>
              ${squad.off1 ? `
                <div class="official-row" style="margin-top:4px;">
                  <span class="officer-role">Officer 1:</span>
                  <span class="officer-name">${esc(squad.off1)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Section 3: EXACT TABLE ROUND-BY-ROUND COUNTING SEQUENCE (2 Clean Columns: Round & Form, Post Title) -->
          <div class="section-container">
            <div class="section-title-bar navy-bar">
              <span>TABLE COUNTING SEQUENCE &bull; ROUND 1 TO UUC</span>
              <span class="section-sub-badge">${totalTableRounds} SCHEDULED ROUNDS</span>
            </div>
            <table class="rounds-sequence-table">
              <thead>
                <tr>
                  <th style="width: 26%; text-align: center;">Round &amp; Form Serial</th>
                  <th style="width: 74%;">Election Post / Contesting Seat Title</th>
                </tr>
              </thead>
              <tbody>
                ${tableRounds.map(r => {
                  if (r.isGap) {
                    return `
                      <tr class="row-standby">
                        <td class="col-round text-center">
                          <span class="round-badge badge-standby">${esc(r.roundNum)}</span>
                          <span class="serial-tag" style="background:#ffffff; border-color:#000000; color:#000000;">—</span>
                        </td>
                        <td class="col-post">
                          <div class="standby-post-title">
                            ⏸ ${esc(r.postName)}
                          </div>
                        </td>
                      </tr>
                    `;
                  }
                  return `
                    <tr class="${r.isUuc ? 'row-uuc' : ''}">
                      <td class="col-round text-center">
                        <span class="round-badge ${r.isUuc ? 'badge-uuc' : ''}">${esc(r.roundNum)}</span>
                        <span class="serial-tag">${esc(r.serial)}</span>
                      </td>
                      <td class="col-post">
                        <div class="post-title ${r.isUuc ? 'post-uuc' : ''}">
                          ${r.isUuc ? '★ ' : ''}${esc(r.postName)}
                        </div>
                        ${r.isUuc ? '<div class="uuc-sub-note">⚠ AWAIT RETURNING OFFICER CLEARANCE BEFORE COUNTING</div>' : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Prominent Statutory UUC Directive Callout Banner -->
          <div class="uuc-callout-banner">
            <span class="uuc-callout-icon">⚠</span>
            <span class="uuc-callout-text">DO NOT COUNT UUC BALLOTS WITHOUT EXPLICIT CLEARANCE FROM THE RETURNING OFFICER (RO).</span>
          </div>

        </div>
      </div>
    `;
  }).join('\n');

  const w = window.open('', '_blank');
  if (!w) {
    alert('Pop-up was blocked. Please allow pop-ups for this site to print table placards.');
    return;
  }

  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Counting Table Sequence Placards - ${esc(shortName)} Election ${esc(year)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 4mm 5mm 4mm 5mm;
      @bottom-right {
        content: "Table Sequence Placard &bull; Page " counter(page) " of " counter(pages);
        font-family: Arial, sans-serif;
        font-size: 7pt;
        font-weight: 700;
        color: #000000;
      }
      @bottom-left {
        content: "${esc(collegeName)} — Official Statutory Counting Placard";
        font-family: Arial, sans-serif;
        font-size: 7pt;
        color: #000000;
      }
    }

    @media print {
      html, body {
        width: 210mm;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .page-break {
        page-break-after: always !important;
        break-after: page !important;
      }
      .no-print {
        display: none !important;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #e2e8f0;
      color: #000000;
      line-height: 1.2;
      font-size: 8pt;
    }

    .screen-topbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #000000;
      color: #fff;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .topbar-btn {
      background: #000000;
      color: #fff;
      border: 1.5px solid #ffffff;
      padding: 6px 14px;
      font-weight: 700;
      font-size: 12px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .topbar-btn:hover { background: #333333; }

    .placard-page {
      width: 202mm;
      height: 289mm;
      max-height: 289mm;
      margin: 4mm auto;
      background: #ffffff;
      padding: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-sizing: border-box;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }

    @media print {
      .placard-page {
        width: 100% !important;
        height: 289mm !important;
        max-height: 289mm !important;
        margin: 0 !important;
        box-shadow: none !important;
      }
    }

    .placard-frame {
      border: 2.5px solid #000000;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 2.5mm 3.5mm;
      box-sizing: border-box;
    }

    .header-box {
      border-bottom: 2px solid #000000;
      padding-bottom: 1.5mm;
      background: #ffffff;
      padding-top: 0.5mm;
    }
    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .emblem-img {
      width: 44px;
      height: 44px;
      object-fit: contain;
      filter: grayscale(100%);
    }
    .header-center {
      text-align: center;
      flex: 1;
    }
    .institution-title {
      font-size: 12pt;
      font-weight: 900;
      letter-spacing: 0.3px;
      color: #000000;
      line-height: 1.1;
    }
    .institution-subtitle {
      font-size: 6.8pt;
      font-weight: 700;
      color: #000000;
      margin-top: 0.5px;
    }
    .election-banner-title {
      font-size: 8.5pt;
      font-weight: 900;
      letter-spacing: 0.8px;
      color: #000000;
      margin-top: 1px;
    }
    .placard-badge-title {
      display: inline-block;
      background: #000000;
      color: #ffffff;
      font-size: 7.5pt;
      font-weight: 900;
      letter-spacing: 0.8px;
      padding: 1.5px 12px;
      border-radius: 3px;
      margin-top: 1.5px;
    }

    .table-meta-grid {
      display: grid;
      grid-template-columns: 1.15fr 1.85fr;
      gap: 8px;
      margin-top: 2.5mm;
      border: 2.5px solid #000000;
      background: #ffffff;
      border-radius: 4px;
      padding: 6px;
    }
    .meta-col-table {
      background: #000000;
      color: #ffffff;
      padding: 8px 12px;
      border-radius: 3px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .meta-col-table .meta-label {
      font-size: 7pt;
      font-weight: 900;
      letter-spacing: 0.8px;
      color: #ffffff;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .table-giant-pill {
      font-size: 26pt;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: #ffffff;
      line-height: 1.05;
    }
    .booth-sub-link {
      font-size: 7.5pt;
      font-weight: 700;
      color: #ffffff;
      margin-top: 3px;
      opacity: 0.95;
    }
    .meta-col-officials {
      padding: 6px 12px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: #ffffff;
      border-radius: 3px;
      border: 1.5px solid #000000;
    }
    .meta-col-officials .meta-label {
      font-size: 7pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #000000;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .official-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 8.5pt;
      line-height: 1.25;
      color: #000000;
    }
    .officer-role {
      font-weight: 900;
      color: #000000;
      width: 74px;
      flex-shrink: 0;
    }
    .officer-name {
      font-weight: 900;
      color: #000000;
      font-size: 9pt;
    }
    .official-sub-role {
      font-size: 7pt;
      color: #333333;
      margin-left: 80px;
      line-height: 1.1;
    }

    .section-container {
      margin-top: 3mm;
      flex: 1;
    }
    .section-title-bar {
      color: #ffffff;
      font-size: 8pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      padding: 4px 8px;
      border-radius: 3px 3px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #000000;
      border: 2px solid #000000;
      border-bottom: none;
    }
    .section-sub-badge {
      font-size: 6.5pt;
      font-weight: 900;
      background: #ffffff;
      color: #000000;
      padding: 1.5px 6px;
      border-radius: 2px;
    }

    .rounds-sequence-table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000000;
      border-top: none;
      background: #ffffff;
      font-size: 9.5pt;
      color: #000000;
    }
    .rounds-sequence-table th {
      background: #f4f4f5;
      color: #000000;
      font-size: 8pt;
      font-weight: 900;
      text-transform: uppercase;
      padding: 5px 8px;
      border: 1.5px solid #000000;
      letter-spacing: 0.3px;
    }
    .rounds-sequence-table td {
      padding: 5px 8px;
      border: 1px solid #000000;
      vertical-align: middle;
      line-height: 1.2;
      color: #000000;
    }
    .rounds-sequence-table tbody tr:nth-child(even) {
      background: #fafafa;
    }
    .row-uuc {
      background: #ffffff !important;
      border-top: 2.5px solid #000000 !important;
      border-bottom: 2.5px solid #000000 !important;
    }
    .col-round {
      white-space: nowrap;
    }
    .text-center { text-align: center; }
    .round-badge {
      display: inline-block;
      font-size: 8pt;
      font-weight: 900;
      background: #000000;
      color: #ffffff;
      padding: 2px 7px;
      border-radius: 3px;
      margin-right: 5px;
      letter-spacing: 0.2px;
      border: 1px solid #000000;
    }
    .badge-uuc {
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
    }
    .badge-standby {
      background: #ffffff;
      color: #000000;
      border: 1.5px solid #000000;
    }
    .serial-tag {
      font-size: 8.5pt;
      font-weight: 900;
      color: #000000;
      font-family: monospace;
      background: #ffffff;
      padding: 1.5px 6px;
      border-radius: 3px;
      border: 1.5px solid #000000;
    }
    .post-title {
      font-size: 9.5pt;
      font-weight: 900;
      color: #000000;
      letter-spacing: 0.2px;
    }
    .post-uuc {
      color: #000000;
      font-size: 10.5pt;
      font-weight: 900;
      text-transform: uppercase;
    }
    .uuc-sub-note {
      font-size: 7.5pt;
      font-weight: 900;
      color: #000000;
      letter-spacing: 0.5px;
      margin-top: 2px;
      text-transform: uppercase;
    }
    .standby-post-title {
      font-size: 8pt;
      color: #333333;
      font-style: italic;
    }
    .row-standby {
      background: #f4f4f5 !important;
    }

    .uuc-callout-banner {
      margin-top: 3mm;
      background: #ffffff;
      border: 2.5px solid #000000;
      border-radius: 4px;
      padding: 7px 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .uuc-callout-icon {
      font-size: 13pt;
      font-weight: 900;
      color: #000000;
      line-height: 1;
    }
    .uuc-callout-text {
      font-size: 10pt;
      font-weight: 900;
      color: #000000;
      letter-spacing: 0.4px;
      text-align: center;
      text-transform: uppercase;
    }
  </style>
</head>
<body>

  <!-- Screen Top Bar -->
  <div class="screen-topbar no-print">
    <div style="display: flex; align-items: center; gap: 12px;">
      <strong style="font-size: 14px; color: #fff;">Official Counting Table Sequence Placards</strong>
      <span style="font-size: 11px; color: #cbd5e1;">${boothsList.length} Tables Configured in System &bull; Round-by-Round from Matrix</span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <label style="font-size: 11px; font-weight: 600; color: #cbd5e1;">Filter Table:</label>
      <select id="selPlacardTable" style="background: #000000; color: #fff; border: 1.5px solid #666; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
        <option value="all">🌟 All ${boothsList.length} Tables (Batch A4)</option>
        ${boothsList.map(b => {
          const num = b.boothNumber || b.tableNumber;
          return `<option value="${num}">Table ${num} &bull; ${esc(b.roomName || 'Table ' + num)}</option>`;
        }).join('')}
      </select>
      <button class="topbar-btn" onclick="window.print()">
        <span>🖨️</span> <span id="placardPrintLabel">Print All ${boothsList.length} Tables (A4)</span>
      </button>
      <button class="topbar-btn" style="background: #333333; border: 1.5px solid #666;" onclick="window.close()">
        <span>✕</span> Close
      </button>
    </div>
  </div>

  ${pagesHtml}

  <script>
    const sel = document.getElementById('selPlacardTable');
    const btnLabel = document.getElementById('placardPrintLabel');
    function applyFilter(val) {
      const pages = document.querySelectorAll('.placard-page');
      pages.forEach(p => {
        if (val === 'all') {
          p.style.display = 'flex';
        } else {
          p.style.display = p.id === ('table-' + val) ? 'flex' : 'none';
        }
      });
      if (btnLabel) {
        btnLabel.textContent = val === 'all' ? 'Print All ${boothsList.length} Tables (A4)' : ('Print Table ' + val + ' Placard (A4)');
      }
    }
    if (sel) {
      sel.addEventListener('change', (e) => {
        applyFilter(e.target.value);
      });
    }
  </script>
</body>
</html>`);

  w.document.close();
  setTimeout(() => w.print(), 350);
}
