/**
 * noticesPrinter.js
 * Dedicated print rendering engine for Official Election Notices,
 * Individual Polling Booth Door Posters, and Campus Master Directory Posters.
 */

import { esc } from './utils.js';
import { CONFIG } from './config.js';

// Markdown-to-HTML formatter for notice text
function formatMarkdown(text) {
  if (!text) return '';
  let html = esc(text);

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size:16px;font-weight:bold;margin:14px 0 6px 0;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">$1</h3>');
  html = html.replace(/^#### (.*$)/gim, '<h4 style="font-size:14px;font-weight:bold;margin:12px 0 4px 0;color:#374151;">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size:18px;font-weight:bold;margin:16px 0 8px 0;color:#111827;">$1</h2>');

  // Bold and Italic
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Horizontal Rule
  html = html.replace(/^---$/gim, '<hr style="border:none;border-top:1px dashed #d1d5db;margin:12px 0;">');

  // Unordered list items
  html = html.replace(/^\s*• (.*$)/gim, '<li style="margin-left:20px;margin-bottom:4px;">$1</li>');
  html = html.replace(/^\s*\- (.*$)/gim, '<li style="margin-left:20px;margin-bottom:4px;">$1</li>');

  // Ordered list items
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<div style="margin-left:15px;margin-bottom:4px;"><strong>$1.</strong> $2</div>');

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
        tableHtml = '<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;">';
      }
      if (line.includes(':---') || line.includes('---:')) {
        continue; // separator
      }
      const cols = line.split('|').slice(1, -1).map(c => c.trim());
      const isHeader = !tableHtml.includes('<tbody>');
      if (isHeader && !tableHtml.includes('<thead>')) {
        tableHtml += '<thead><tr style="background:#f3f4f6;border-bottom:1.5px solid #000;">' + cols.map(c => `<th style="border:1px solid #9ca3af;padding:6px 8px;text-align:left;">${c}</th>`).join('') + '</tr></thead><tbody>';
      } else {
        tableHtml += '<tr style="border-bottom:1px solid #e5e7eb;">' + cols.map(c => `<td style="border:1px solid #d1d5db;padding:5px 8px;">${c}</td>`).join('') + '</tr>';
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
    if (l.startsWith('<h') || l.startsWith('<hr') || l.startsWith('<li') || l.startsWith('<div') || l.startsWith('<table')) return l;
    if (!l.trim()) return '<div style="height:8px;"></div>';
    return `<p style="margin:6px 0;line-height:1.5;">${l}</p>`;
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
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Times New Roman', Times, Georgia, serif;
      color: #111;
      background: #fff;
      font-size: 13px;
      line-height: 1.5;
    }
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 10px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .college-name {
      font-size: 19px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
      color: #000;
    }
    .sub-header {
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #374151;
      margin-top: 3px;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #ccc;
      padding: 6px 0;
      margin-bottom: 14px;
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #333;
    }
    .notice-title-box {
      text-align: center;
      margin: 14px 0 18px 0;
      border: 1.5px solid #000;
      padding: 8px 12px;
      background: #fafafa;
    }
    .notice-title {
      font-size: 15px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .category-tag {
      font-family: Arial, sans-serif;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      color: #4b5563;
      margin-top: 3px;
    }
    .content-area {
      font-size: 13px;
      text-align: justify;
      margin-bottom: 30px;
    }
    .signature-area {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      page-break-inside: avoid;
    }
    .seal-box {
      width: 130px;
      height: 80px;
      border: 1px dashed #999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
      font-size: 10px;
      color: #777;
      text-align: center;
    }
    .signatory-box {
      text-align: right;
      font-family: 'Times New Roman', Times, serif;
    }
    .signatory-name {
      font-size: 14px;
      font-weight: bold;
      margin: 0;
    }
    .signatory-title {
      font-size: 12px;
      color: #333;
      margin-top: 3px;
      max-width: 320px;
    }
    .footer-note {
      margin-top: 25px;
      border-top: 1px solid #e5e7eb;
      padding-top: 6px;
      font-family: Arial, sans-serif;
      font-size: 9px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
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
      <div class="seal-box">
        [ College Official Seal ]
      </div>
      <div class="signatory-box">
        <div style="height: 35px;"></div>
        <p class="signatory-name">${esc(notice.signatoryName || 'Returning Officer')}</p>
        <p class="signatory-title">${esc(notice.signatoryTitle || `Returning Officer, ${collegeName}`)}</p>
      </div>
    </div>

    <div class="footer-note">
      This is an official election document published by authority of the Returning Officer under University Statutes.
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
      size: A4 portrait;
      margin: 8mm;
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
      color: #059669;
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
      border: 1.5px solid #b91c1c;
      background: #fef2f2;
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
      font-size: 11px;
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
      size: A4 portrait;
      margin: 10mm;
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
