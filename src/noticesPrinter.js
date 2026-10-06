/**
 * noticesPrinter.js
 * Dedicated print rendering engine for Official Election Notices,
 * Individual Polling Booth Door Posters, and Campus Master Directory Posters.
 */

import { esc, triggerPrint, todayFormatted } from './utils.js';
import { CONFIG } from './config.js';

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
      <div><strong>Date of Issue:</strong> ${esc(notice.date || new Date().toISOString().split('T')[0])}</div>
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
export function printBoothDoorPoster(booth, settings = {}, schedule = {}) {
  printBatchBoothDoorPosters([booth], settings, schedule);
}

/**
 * Batch print door posters for ALL booths, separated cleanly by page breaks
 */
export function printBatchBoothDoorPosters(boothsList, settings = {}, schedule = {}) {
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

  const pollStart = formatTime(schedule.pollingStart) || '9:30 AM';
  const pollEnd = formatTime(schedule.pollingEnd) || '1:30 PM';

  const postersHtml = boothsList.map((booth, idx) => {
    const classes = Array.isArray(booth.classes) ? booth.classes : [];
    const totalVoters = booth.totalStudents || 0;

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

          <!-- Giant Booth Number Banner -->
          <div class="booth-giant-banner">
            <div class="booth-sub-label">DESIGNATED POLLING BOOTH</div>
            <div class="booth-main-number">BOOTH NO. ${esc(booth.boothNumber)}</div>
          </div>

          <!-- Room Location Callout -->
          <div class="location-banner">
            <span class="location-icon">📍</span>
            <span class="location-label">POLLING STATION VENUE:</span>
            <span class="location-name">${esc(booth.roomName || 'Classroom / Designated Hall')}</span>
          </div>

          <!-- Allotted Classes Section -->
          <div class="classes-container">
            <div class="classes-heading">
              <span>📋 CLASSES ALLOTTED TO VOTE AT THIS BOOTH:</span>
              <span class="voter-badge">${totalVoters ? `${totalVoters} Registered Electors` : 'Electors as Per Roll'}</span>
            </div>

            <div class="classes-grid">
              ${classes.length ? classes.map(c => `
                <div class="class-card">
                  <span class="check-icon">✔</span>
                  <span class="class-text">${esc(c)}</span>
                </div>
              `).join('') : `
                <div class="class-card" style="grid-column: 1 / -1; text-align: center; color: #666;">
                  Allotted as per Department Electoral Schedule
                </div>
              `}
            </div>
          </div>

          <!-- Ballots Issued Bar -->
          <div class="ballots-bar">
            <div class="ballot-chip"><strong>Ballot 1:</strong> General Union Posts</div>
            <div class="ballot-chip"><strong>Ballot 2:</strong> Dept Association Secretary</div>
            <div class="ballot-chip"><strong>Ballot 3:</strong> Year Representative</div>
          </div>

          <!-- Voter Directives Warning Box -->
          <div class="rules-box">
            <div class="rule-item">
              <span class="rule-icon">🪪</span>
              <span><strong>MANDATORY:</strong> Must produce College ID Card to Polling Officer</span>
            </div>
            <div class="rule-item">
              <span class="rule-icon">⏰</span>
              <span><strong>POLLING HOURS:</strong> ${esc(pollStart)} to ${esc(pollEnd)} strictly</span>
            </div>
            <div class="rule-item">
              <span class="rule-icon">🚫</span>
              <span><strong>PROHIBITED:</strong> Mobile phones / Cameras strictly barred inside booth</span>
            </div>
          </div>

          <!-- Bottom Footer with Seal and Presiding Officer Line -->
          <div class="poster-footer">
            <div class="footer-seal">
              [ OFFICIAL ELECTION SEAL ]
            </div>
            <div class="footer-sign">
              <div class="sign-line"></div>
              <div class="sign-text">By Order of the Returning Officer</div>
              <div class="sign-sub">${esc(collegeName)}</div>
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
      margin: 8mm 10mm 12mm 10mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: Arial, sans-serif;
        font-size: 8.5pt;
        font-weight: bold;
        color: #000000;
      }
      @bottom-left {
        content: "College Union Election — Polling Booth Poster";
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
    }
    .poster-page {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 4px;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    .poster-border {
      border: 4px solid #000;
      border-radius: 8px;
      padding: 14px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .poster-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
    }
    .poster-logo {
      max-height: 50px;
      max-width: 50px;
      object-fit: contain;
    }
    .college-title {
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .election-title {
      font-size: 12px;
      font-weight: 600;
      color: #333;
      margin-top: 2px;
    }
    .booth-giant-banner {
      background: #000;
      color: #fff;
      text-align: center;
      padding: 14px 10px;
      margin: 10px 0;
      border-radius: 6px;
    }
    .booth-sub-label {
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 2px;
      opacity: 0.9;
    }
    .booth-main-number {
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .location-banner {
      border: 2px solid #000;
      background: #f3f4f6;
      border-radius: 6px;
      padding: 10px 14px;
      text-align: center;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .location-icon {
      font-size: 20px;
    }
    .location-label {
      font-weight: bold;
      color: #4b5563;
      font-size: 12px;
    }
    .location-name {
      font-size: 19px;
      font-weight: 900;
      color: #111;
      text-transform: uppercase;
    }
    .classes-container {
      flex: 1;
      margin: 10px 0;
      border: 2px solid #000;
      border-radius: 6px;
      padding: 10px;
      display: flex;
      flex-direction: column;
    }
    .classes-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 800;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .voter-badge {
      background: #e5e7eb;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }
    .classes-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      overflow: hidden;
    }
    .class-card {
      border: 1.5px solid #374151;
      border-radius: 4px;
      padding: 6px 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      background: #fafafa;
    }
    .check-icon {
      font-size: 12px;
      font-weight: bold;
      color: #000000;
    }
    .class-text {
      font-size: 13px;
      font-weight: 700;
      color: #111;
      line-height: 1.2;
    }
    .ballots-bar {
      display: flex;
      justify-content: space-around;
      gap: 6px;
      margin-bottom: 8px;
    }
    .ballot-chip {
      flex: 1;
      border: 1.5px solid #000;
      border-radius: 4px;
      padding: 5px 6px;
      font-size: 11px;
      text-align: center;
      background: #fff;
    }
    .rules-box {
      border: 1.5px solid #000000;
      background: #f9f9f9;
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
      font-size: 11px;
      color: #000000;
    }
    .rule-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .rule-icon {
      font-size: 14px;
    }
    .poster-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 2px solid #000;
      padding-top: 8px;
    }
    .footer-seal {
      width: 140px;
      height: 48px;
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
    .sign-text {
      font-size: 12px;
      font-weight: bold;
    }
    .sign-sub {
      font-size: 10px;
      color: #444;
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

  const pollStart = formatTime(schedule.pollingStart) || '9:30 AM';
  const pollEnd = formatTime(schedule.pollingEnd) || '1:30 PM';

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
          <p>Place: ____________________</p>
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
export function buildWithdrawalPaper(id = '', nom = {}, collegeName = null, year = null, isBlank = false, collegeLogo = '') {
  const today = isBlank ? '' : todayFormatted();
  const cName = collegeName || CONFIG.COLLEGE_NAME;
  const y = year || new Date().getFullYear();
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
        <p>Place: ${isBlank ? '___________________________' : 'Palakkad'}</p>
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

  const html = buildWithdrawalPaper('', {}, collegeName, year, true, collegeLogo);
  triggerPrint(html, `Blank Withdrawal Form - ${esc(shortName)} Election ${esc(year)}`, collegeLogo);
}
