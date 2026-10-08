import { writeFileSync, copyFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { DEFAULT_COLLEGE_LOGO } from './src/data/defaultEmblem.js';

const collegeName = 'GOVERNMENT COLLEGE CHITTUR';
const shortName = 'GCC';
const year = '2026';
const emblemPath = DEFAULT_COLLEGE_LOGO;

// 15 Departments of Government College Chittur with 1 UG to PG progression and realistic booth allotment
const departmentsData = [
  {
    name: 'Botany',
    icon: '🌿',
    classes: [
      { name: '1st B.Sc Botany', rank: 1, rankLabel: '1 UG', booth: 1, room: 'Room B1, Botany Block', voters: 42 },
      { name: '2nd B.Sc Botany', rank: 2, rankLabel: '2 UG', booth: 1, room: 'Room B1, Botany Block', voters: 40 },
      { name: '3rd B.Sc Botany', rank: 3, rankLabel: '3 UG', booth: 1, room: 'Room B1, Botany Block', voters: 38 },
      { name: '1st M.Sc Botany', rank: 5, rankLabel: '1 PG', booth: 2, room: 'Room B2, Botany PG Hall', voters: 16 },
      { name: '2nd M.Sc Botany', rank: 6, rankLabel: '2 PG', booth: 2, room: 'Room B2, Botany PG Hall', voters: 15 }
    ]
  },
  {
    name: 'Chemistry',
    icon: '🔬',
    classes: [
      { name: '1st B.Sc Chemistry', rank: 1, rankLabel: '1 UG', booth: 3, room: 'Room CH1, Chemistry Block', voters: 48 },
      { name: '2nd B.Sc Chemistry', rank: 2, rankLabel: '2 UG', booth: 3, room: 'Room CH1, Chemistry Block', voters: 46 },
      { name: '3rd B.Sc Chemistry', rank: 3, rankLabel: '3 UG', booth: 3, room: 'Room CH1, Chemistry Block', voters: 44 },
      { name: '1st M.Sc Chemistry', rank: 5, rankLabel: '1 PG', booth: 4, room: 'Room CH2, Chemistry PG Seminar Hall', voters: 18 },
      { name: '2nd M.Sc Chemistry', rank: 6, rankLabel: '2 PG', booth: 4, room: 'Room CH2, Chemistry PG Seminar Hall', voters: 17 }
    ]
  },
  {
    name: 'Commerce',
    icon: '🏛️',
    classes: [
      { name: '1st B.Com (Finance)', rank: 1, rankLabel: '1 UG', booth: 5, room: 'Room C1, Commerce Block (GF)', voters: 62 },
      { name: '2nd B.Com (Finance)', rank: 2, rankLabel: '2 UG', booth: 5, room: 'Room C1, Commerce Block (GF)', voters: 60 },
      { name: '3rd B.Com (Finance)', rank: 3, rankLabel: '3 UG', booth: 6, room: 'Room C2, Commerce Block (1st Floor)', voters: 58 },
      { name: '1st M.Com (Finance)', rank: 5, rankLabel: '1 PG', booth: 6, room: 'Room C2, Commerce Block (1st Floor)', voters: 22 },
      { name: '2nd M.Com (Finance)', rank: 6, rankLabel: '2 PG', booth: 6, room: 'Room C2, Commerce Block (1st Floor)', voters: 20 }
    ]
  },
  {
    name: 'Economics',
    icon: '📈',
    classes: [
      { name: '1st B.A Economics', rank: 1, rankLabel: '1 UG', booth: 7, room: 'Room E1, Arts Block (GF)', voters: 55 },
      { name: '2nd B.A Economics', rank: 2, rankLabel: '2 UG', booth: 7, room: 'Room E1, Arts Block (GF)', voters: 52 },
      { name: '3rd B.A Economics', rank: 3, rankLabel: '3 UG', booth: 7, room: 'Room E1, Arts Block (GF)', voters: 50 },
      { name: '1st M.A Economics', rank: 5, rankLabel: '1 PG', booth: 8, room: 'Room E2, Arts Block (1st Floor)', voters: 20 },
      { name: '2nd M.A Economics', rank: 6, rankLabel: '2 PG', booth: 8, room: 'Room E2, Arts Block (1st Floor)', voters: 19 },
      { name: 'Research Scholars (Ph.D)', rank: 7, rankLabel: 'RS', booth: 8, room: 'Room E2, Arts Block (1st Floor)', voters: 2 }
    ]
  },
  {
    name: 'Electronics',
    icon: '🔌',
    classes: [
      { name: '1st B.Sc Electronics', rank: 1, rankLabel: '1 UG', booth: 9, room: 'Room EL1, Science Block Annex', voters: 38 },
      { name: '2nd B.Sc Electronics', rank: 2, rankLabel: '2 UG', booth: 9, room: 'Room EL1, Science Block Annex', voters: 36 },
      { name: '3rd B.Sc Electronics', rank: 3, rankLabel: '3 UG', booth: 9, room: 'Room EL1, Science Block Annex', voters: 35 },
      { name: '1st M.Sc Electronics', rank: 5, rankLabel: '1 PG', booth: 10, room: 'Room EL2, Microprocessor Lab Hall', voters: 14 },
      { name: '2nd M.Sc Electronics', rank: 6, rankLabel: '2 PG', booth: 10, room: 'Room EL2, Microprocessor Lab Hall', voters: 14 }
    ]
  },
  {
    name: 'English',
    icon: '📖',
    classes: [
      { name: '1st B.A English', rank: 1, rankLabel: '1 UG', booth: 11, room: 'Room ENG1, Humanities Block', voters: 45 },
      { name: '2nd B.A English', rank: 2, rankLabel: '2 UG', booth: 11, room: 'Room ENG1, Humanities Block', voters: 44 },
      { name: '3rd B.A English', rank: 3, rankLabel: '3 UG', booth: 11, room: 'Room ENG1, Humanities Block', voters: 42 },
      { name: '1st M.A English', rank: 5, rankLabel: '1 PG', booth: 12, room: 'Room ENG2, Language Lab Hall', voters: 18 },
      { name: '2nd M.A English', rank: 6, rankLabel: '2 PG', booth: 12, room: 'Room ENG2, Language Lab Hall', voters: 18 }
    ]
  },
  {
    name: 'Geography',
    icon: '🌍',
    classes: [
      { name: '1st B.Sc Geography', rank: 1, rankLabel: '1 UG', booth: 13, room: 'Room G1, Geography Department Hall', voters: 40 },
      { name: '2nd B.Sc Geography', rank: 2, rankLabel: '2 UG', booth: 13, room: 'Room G1, Geography Department Hall', voters: 38 },
      { name: '3rd B.Sc Geography', rank: 3, rankLabel: '3 UG', booth: 13, room: 'Room G1, Geography Department Hall', voters: 36 },
      { name: '1st M.Sc Geography', rank: 5, rankLabel: '1 PG', booth: 14, room: 'Room G2, GIS & Cartography Lab', voters: 15 },
      { name: '2nd M.Sc Geography', rank: 6, rankLabel: '2 PG', booth: 14, room: 'Room G2, GIS & Cartography Lab', voters: 15 },
      { name: 'Research Scholars (Ph.D)', rank: 7, rankLabel: 'RS', booth: 14, room: 'Room G2, GIS & Cartography Lab', voters: 2 }
    ]
  },
  {
    name: 'History',
    icon: '📜',
    classes: [
      { name: '1st B.A History', rank: 1, rankLabel: '1 UG', booth: 15, room: 'Room H1, Social Sciences Block', voters: 54 },
      { name: '2nd B.A History', rank: 2, rankLabel: '2 UG', booth: 15, room: 'Room H1, Social Sciences Block', voters: 50 },
      { name: '3rd B.A History', rank: 3, rankLabel: '3 UG', booth: 15, room: 'Room H1, Social Sciences Block', voters: 48 },
      { name: '1st M.A History', rank: 5, rankLabel: '1 PG', booth: 16, room: 'Room H2, History Archives Hall', voters: 20 },
      { name: '2nd M.A History', rank: 6, rankLabel: '2 PG', booth: 16, room: 'Room H2, History Archives Hall', voters: 19 }
    ]
  },
  {
    name: 'Malayalam',
    icon: '✍️',
    classes: [
      { name: '1st B.A Malayalam', rank: 1, rankLabel: '1 UG', booth: 17, room: 'Room M1, Oriental Languages Block', voters: 46 },
      { name: '2nd B.A Malayalam', rank: 2, rankLabel: '2 UG', booth: 17, room: 'Room M1, Oriental Languages Block', voters: 44 },
      { name: '3rd B.A Malayalam', rank: 3, rankLabel: '3 UG', booth: 17, room: 'Room M1, Oriental Languages Block', voters: 42 },
      { name: '1st M.A Malayalam', rank: 5, rankLabel: '1 PG', booth: 18, room: 'Room M2, Bhasha Seminar Hall', voters: 17 },
      { name: '2nd M.A Malayalam', rank: 6, rankLabel: '2 PG', booth: 18, room: 'Room M2, Bhasha Seminar Hall', voters: 16 }
    ]
  },
  {
    name: 'Mathematics',
    icon: '📐',
    classes: [
      { name: '1st B.Sc Mathematics', rank: 1, rankLabel: '1 UG', booth: 19, room: 'Room MATH1, Main Science Wing', voters: 48 },
      { name: '2nd B.Sc Mathematics', rank: 2, rankLabel: '2 UG', booth: 19, room: 'Room MATH1, Main Science Wing', voters: 45 },
      { name: '3rd B.Sc Mathematics', rank: 3, rankLabel: '3 UG', booth: 19, room: 'Room MATH1, Main Science Wing', voters: 43 },
      { name: '1st M.Sc Mathematics', rank: 5, rankLabel: '1 PG', booth: 20, room: 'Room MATH2, Ramanujan Seminar Hall', voters: 18 },
      { name: '2nd M.Sc Mathematics', rank: 6, rankLabel: '2 PG', booth: 20, room: 'Room MATH2, Ramanujan Seminar Hall', voters: 18 },
      { name: 'Research Scholars (Ph.D)', rank: 7, rankLabel: 'RS', booth: 20, room: 'Room MATH2, Ramanujan Seminar Hall', voters: 3 }
    ]
  },
  {
    name: 'Music',
    icon: '🎵',
    classes: [
      { name: '1st B.A Music', rank: 1, rankLabel: '1 UG', booth: 21, room: 'Room MUS1, Fine Arts & Music Block', voters: 32 },
      { name: '2nd B.A Music', rank: 2, rankLabel: '2 UG', booth: 21, room: 'Room MUS1, Fine Arts & Music Block', voters: 30 },
      { name: '3rd B.A Music', rank: 3, rankLabel: '3 UG', booth: 21, room: 'Room MUS1, Fine Arts & Music Block', voters: 28 },
      { name: '1st M.A Music', rank: 5, rankLabel: '1 PG', booth: 22, room: 'Room MUS2, Sangeetha Sabha Hall', voters: 12 },
      { name: '2nd M.A Music', rank: 6, rankLabel: '2 PG', booth: 22, room: 'Room MUS2, Sangeetha Sabha Hall', voters: 12 },
      { name: 'Research Scholars (Ph.D)', rank: 7, rankLabel: 'RS', booth: 22, room: 'Room MUS2, Sangeetha Sabha Hall', voters: 4 }
    ]
  },
  {
    name: 'Philosophy',
    icon: '💡',
    classes: [
      { name: '1st B.A Philosophy', rank: 1, rankLabel: '1 UG', booth: 23, room: 'Room P1, Humanities Wing', voters: 42 },
      { name: '2nd B.A Philosophy', rank: 2, rankLabel: '2 UG', booth: 23, room: 'Room P1, Humanities Wing', voters: 40 },
      { name: '3rd B.A Philosophy', rank: 3, rankLabel: '3 UG', booth: 23, room: 'Room P1, Humanities Wing', voters: 38 },
      { name: '1st M.A Philosophy', rank: 5, rankLabel: '1 PG', booth: 24, room: 'Room P2, Ethics Seminar Hall', voters: 15 },
      { name: '2nd M.A Philosophy', rank: 6, rankLabel: '2 PG', booth: 24, room: 'Room P2, Ethics Seminar Hall', voters: 15 }
    ]
  },
  {
    name: 'Physics',
    icon: '⚡',
    classes: [
      { name: '1st B.Sc Physics', rank: 1, rankLabel: '1 UG', booth: 25, room: 'Room PHY1, C.V. Raman Physics Wing', voters: 46 },
      { name: '2nd B.Sc Physics', rank: 2, rankLabel: '2 UG', booth: 25, room: 'Room PHY1, C.V. Raman Physics Wing', voters: 44 },
      { name: '3rd B.Sc Physics', rank: 3, rankLabel: '3 UG', booth: 25, room: 'Room PHY1, C.V. Raman Physics Wing', voters: 42 },
      { name: '1st M.Sc Physics', rank: 5, rankLabel: '1 PG', booth: 26, room: 'Room PHY2, Physics Research Hall', voters: 17 },
      { name: '2nd M.Sc Physics', rank: 6, rankLabel: '2 PG', booth: 26, room: 'Room PHY2, Physics Research Hall', voters: 16 }
    ]
  },
  {
    name: 'Tamil',
    icon: '🪔',
    classes: [
      { name: '1st B.A Tamil', rank: 1, rankLabel: '1 UG', booth: 27, room: 'Room T1, South Indian Languages Wing', voters: 40 },
      { name: '2nd B.A Tamil', rank: 2, rankLabel: '2 UG', booth: 27, room: 'Room T1, South Indian Languages Wing', voters: 38 },
      { name: '3rd B.A Tamil', rank: 3, rankLabel: '3 UG', booth: 27, room: 'Room T1, South Indian Languages Wing', voters: 36 },
      { name: '1st M.A Tamil', rank: 5, rankLabel: '1 PG', booth: 28, room: 'Room T2, Sangam Literature Hall', voters: 14 },
      { name: '2nd M.A Tamil', rank: 6, rankLabel: '2 PG', booth: 28, room: 'Room T2, Sangam Literature Hall', voters: 14 },
      { name: 'Research Scholars (Ph.D)', rank: 7, rankLabel: 'RS', booth: 28, room: 'Room T2, Sangam Literature Hall', voters: 10 }
    ]
  },
  {
    name: 'Zoology',
    icon: '🐾',
    classes: [
      { name: '1st B.Sc Zoology', rank: 1, rankLabel: '1 UG', booth: 29, room: 'Room Z1, Life Sciences Block (GF)', voters: 44 },
      { name: '2nd B.Sc Zoology', rank: 2, rankLabel: '2 UG', booth: 29, room: 'Room Z1, Life Sciences Block (GF)', voters: 42 },
      { name: '3rd B.Sc Zoology', rank: 3, rankLabel: '3 UG', booth: 29, room: 'Room Z1, Life Sciences Block (GF)', voters: 40 },
      { name: '1st M.Sc Zoology', rank: 5, rankLabel: '1 PG', booth: 30, room: 'Room Z2, Entomology & Genetics Lab', voters: 16 },
      { name: '2nd M.Sc Zoology', rank: 6, rankLabel: '2 PG', booth: 30, room: 'Room Z2, Entomology & Genetics Lab', voters: 15 }
    ]
  }
];

const totalElectors = departmentsData.reduce((sum, d) => sum + d.classes.reduce((cs, c) => cs + c.voters, 0), 0);
const totalClasses = departmentsData.reduce((sum, d) => sum + d.classes.length, 0);

function generateHtml() {
  const deptCardsHtml = departmentsData.map(d => {
    const deptTotal = d.classes.reduce((sum, c) => sum + c.voters, 0);
    const rowsHtml = d.classes.map(c => `
      <tr class="cls-row" data-search="${c.name.toLowerCase()} ${d.name.toLowerCase()} booth ${c.booth}">
        <td class="col-class">
          <div class="class-title-cell">
            <span class="yr-badge yr-${c.rankLabel.toLowerCase().replace(' ', '')}">${c.rankLabel}</span>
            <span class="class-name-txt">${c.name}</span>
          </div>
        </td>
        <td class="col-booth">
          <span class="booth-badge">BOOTH ${c.booth}</span>
        </td>
        <td class="col-location">
          <div class="loc-cell">
            <span class="loc-pin">📍</span>
            <span class="loc-text">${c.room}</span>
          </div>
        </td>
        <td class="col-voters">
          <span class="voter-pill">${c.voters}</span>
        </td>
      </tr>
    `).join('');

    return `
      <div class="dept-card" data-dept="${d.name.toLowerCase()}">
        <div class="dept-header">
          <div class="dept-title-wrap">
            <span class="dept-icon">${d.icon}</span>
            <span class="dept-name">DEPARTMENT OF ${d.name.toUpperCase()}</span>
          </div>
          <div class="dept-summary-pill">${deptTotal} Voters &bull; ${d.classes.length} Classes</div>
        </div>
        <table class="dept-table">
          <thead>
            <tr>
              <th style="width: 44%;">CLASS (1 UG &rarr; PG &rarr; RS)</th>
              <th style="width: 17%; text-align: center;">BOOTH NO</th>
              <th style="width: 31%;">LOCATION OF VOTING BOOTH</th>
              <th style="width: 8%; text-align: center;">VOTERS</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Campus Voter Directory Poster - ${shortName} Election ${year}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    @page {
      size: A3 portrait;
      margin: 8mm 10mm 10mm 10mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: 'Inter', sans-serif;
        font-size: 8pt;
        font-weight: 700;
        color: #475569;
      }
      @bottom-left {
        content: "Government College Chittur — Department & Class Polling Directory (1 UG to PG & Research Scholars)";
        font-family: 'Inter', sans-serif;
        font-size: 8pt;
        color: #475569;
      }
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }

    /* Fixed Top Control Bar (Screen only) */
    .screen-bar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #0f172a;
      border-bottom: 2px solid #f59e0b;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      color: #fff;
    }
    .screen-bar-title {
      font-weight: 800;
      font-size: 13px;
      color: #fde047;
      letter-spacing: 0.4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .search-input {
      background: #1e293b;
      border: 1px solid #475569;
      color: #fff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      width: 280px;
      outline: none;
    }
    .search-input:focus { border-color: #f59e0b; }
    .print-btn {
      background: #f59e0b;
      color: #000;
      font-weight: 800;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .print-btn:hover { background: #fbbf24; transform: scale(1.02); }

    /* Poster Container */
    .poster-page {
      max-width: 100%;
      margin: 0 auto;
      padding: 12px 14px;
      background: #ffffff;
    }

    /* Outer Poster Frame */
    .poster-frame {
      border: 3px solid #0f172a;
      outline: 1.5px solid #d97706;
      outline-offset: -5px;
      padding: 10px 14px 14px 14px;
      background: #ffffff;
      position: relative;
    }

    /* Header */
    .poster-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 8px;
      gap: 12px;
    }
    .header-logo-wrap {
      width: 75px;
      height: 75px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-logo {
      max-width: 75px;
      max-height: 75px;
      object-fit: contain;
    }
    .header-text-center {
      flex: 1;
      text-align: center;
    }
    .college-heading {
      font-size: 21pt;
      font-weight: 900;
      letter-spacing: 1.2px;
      color: #0f172a;
      margin: 0;
      line-height: 1.1;
      text-transform: uppercase;
    }
    .election-heading {
      font-size: 11pt;
      font-weight: 800;
      letter-spacing: 2px;
      color: #991b1b;
      margin-top: 3px;
      text-transform: uppercase;
    }
    .office-sub {
      font-size: 8pt;
      font-weight: 700;
      color: #475569;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }

    /* Main Poster Banner */
    .main-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: #ffffff;
      padding: 7px 12px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      border: 1px solid #1e293b;
    }
    .banner-title {
      font-size: 13pt;
      font-weight: 900;
      letter-spacing: 0.8px;
      color: #fde047;
      text-transform: uppercase;
    }
    .banner-subtitle {
      font-size: 8pt;
      font-weight: 700;
      color: #e2e8f0;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    /* Schedule & Instructions Bar */
    .directive-bar {
      display: grid;
      grid-template-columns: 2.2fr 1fr 1fr;
      gap: 8px;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 10px;
      font-size: 8pt;
    }
    .directive-item { display: flex; align-items: center; gap: 5px; }
    .directive-item strong { color: #0f172a; font-weight: 800; }
    .directive-item.highlight {
      background: #fef3c7;
      border-left: 3px solid #d97706;
      padding: 2px 6px;
      border-radius: 2px;
    }

    /* Grid of Department Cards */
    .dept-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 9px;
      margin-bottom: 10px;
    }

    /* Department Card */
    .dept-card {
      background: #ffffff;
      border: 1.5px solid #1e293b;
      border-radius: 4px;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .dept-header {
      background: linear-gradient(90deg, #0f172a 0%, #1e3a8a 100%);
      color: #ffffff;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #d97706;
    }
    .dept-title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dept-icon { font-size: 10pt; }
    .dept-name {
      font-size: 8.5pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #fde047;
    }
    .dept-summary-pill {
      font-size: 6.8pt;
      font-weight: 800;
      background: rgba(255,255,255,0.18);
      color: #ffffff;
      padding: 1.5px 6px;
      border-radius: 3px;
      letter-spacing: 0.3px;
    }

    /* Department Table */
    .dept-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
    }
    .dept-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 800;
      font-size: 6.8pt;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      padding: 3.5px 6px;
      border-bottom: 1.2px solid #cbd5e1;
      text-align: left;
    }
    .dept-table td {
      padding: 3.5px 6px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .dept-table tr:last-child td { border-bottom: none; }
    .dept-table tr:nth-child(even) td { background: #fafafa; }

    /* Class cell */
    .class-title-cell {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .class-name-txt {
      font-weight: 700;
      color: #0f172a;
      font-size: 7.8pt;
    }

    /* Progression badges */
    .yr-badge {
      display: inline-block;
      font-size: 6pt;
      font-weight: 900;
      padding: 1px 4px;
      border-radius: 3px;
      letter-spacing: 0.3px;
      flex-shrink: 0;
      text-transform: uppercase;
    }
    .yr-1ug { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .yr-2ug { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
    .yr-3ug { background: #ede9fe; color: #5b21b6; border: 1px solid #ddd6fe; }
    .yr-1pg { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .yr-2pg { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .yr-rs  { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; font-weight: 900; }

    /* Booth Badge */
    .col-booth { text-align: center; }
    .booth-badge {
      display: inline-block;
      background: #047857;
      color: #ffffff;
      font-size: 7pt;
      font-weight: 900;
      padding: 2px 7px;
      border-radius: 3px;
      letter-spacing: 0.5px;
      box-shadow: 0 1px 2px rgba(4,120,87,0.25);
      border: 1px solid #065f46;
      white-space: nowrap;
    }

    /* Location Cell */
    .loc-cell {
      display: flex;
      align-items: baseline;
      gap: 3px;
    }
    .loc-pin { font-size: 7pt; flex-shrink: 0; }
    .loc-text {
      font-size: 7.2pt;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.2;
    }

    /* Voter count */
    .col-voters { text-align: center; }
    .voter-pill {
      font-size: 7pt;
      font-weight: 800;
      color: #475569;
      background: #f1f5f9;
      padding: 1px 5px;
      border-radius: 3px;
      display: inline-block;
    }

    /* Poster Statutory Footer */
    .poster-footer {
      border-top: 2px solid #0f172a;
      padding-top: 6px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 15px;
      font-size: 7pt;
      margin-top: 6px;
    }
    .footer-rules {
      flex: 1;
      color: #334155;
      line-height: 1.35;
    }
    .footer-rules strong { color: #0f172a; }
    .footer-seal-block {
      text-align: right;
      flex-shrink: 0;
      width: 220px;
    }
    .sign-line {
      border-top: 1.5px solid #0f172a;
      margin-top: 25px;
      padding-top: 3px;
      font-weight: 900;
      font-size: 8pt;
      color: #0f172a;
      text-align: center;
      text-transform: uppercase;
    }
    .sign-sub {
      font-size: 6.8pt;
      color: #64748b;
      font-weight: 700;
      text-align: center;
    }

    @media print {
      .screen-bar { display: none !important; }
      body { background: #ffffff !important; }
      .poster-page { padding: 0 !important; }
      .poster-frame { border: 2.5px solid #000 !important; outline: none !important; padding: 6px 10px !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>

  <!-- Screen Action Toolbar -->
  <div class="screen-bar">
    <div class="screen-bar-title">
      <span>🏛️</span>
      <span>GCC College Union Election 2026 &bull; Department &amp; Class Polling Directory (1 UG to PG)</span>
    </div>
    <div style="display: flex; align-items: center; gap: 12px;">
      <input type="text" id="liveSearchInput" class="search-input" placeholder="🔍 Quick Search Department, Class, or Booth...">
      <button class="print-btn" onclick="window.print()">
        <span>🖨️</span>
        <span>Print Poster (A3 / A4)</span>
      </button>
      <a href="Department_Class_Voting_Directory_Poster.pdf" target="_blank" style="color:#fde047; font-size:11px; text-decoration:none; font-weight:700;">📄 Ready PDF</a>
    </div>
  </div>

  <div class="poster-page">
    <div class="poster-frame">
      
      <!-- Top Emblem & Authority Header -->
      <div class="poster-header">
        <div class="header-logo-wrap">
          <img src="${emblemPath}" class="header-logo" alt="GCC Emblem">
        </div>
        <div class="header-text-center">
          <h1 class="college-heading">${collegeName}</h1>
          <div class="election-heading">College Union Election ${year}</div>
          <div class="office-sub">Office of the Returning Officer &bull; Statutory Campus Polling Directory</div>
        </div>
        <div class="header-logo-wrap">
          <img src="${emblemPath}" class="header-logo" alt="GCC Emblem">
        </div>
      </div>

      <!-- Main Poster Ribbon -->
      <div class="main-banner">
        <div>
          <div class="banner-title">DEPARTMENT &amp; CLASS-WISE POLLING BOOTH DIRECTORY</div>
          <div class="banner-subtitle">Official Student Polling Station Guide &bull; Progression 1st UG through PG &amp; Research Scholars</div>
        </div>
        <div style="text-align: right; font-size: 7.5pt; font-weight: 800; color: #fde047;">
          15 DEPARTMENTS &bull; ${totalClasses} CLASSES &amp; COHORTS &bull; 30 POLLING BOOTHS &bull; ${totalElectors} ELECTORS
        </div>
      </div>

      <!-- Schedule & Voter Guidance Bar -->
      <div class="directive-bar">
        <div class="directive-item highlight">
          <span>👉</span>
          <span><strong>INSTRUCTIONS FOR VOTERS:</strong> Locate your Department and Class (1 UG &rarr; PG &rarr; RS) below to find your allotted Polling Booth Number and Room Venue.</span>
        </div>
        <div class="directive-item">
          <span>📅</span>
          <span><strong>Date of Poll:</strong> Wednesday, 14 Oct 2026</span>
        </div>
        <div class="directive-item">
          <span>⏰</span>
          <span><strong>Polling Hours:</strong> 09:30 AM to 12:30 PM</span>
        </div>
      </div>

      <!-- 2-Column Department Cards Grid -->
      <div class="dept-grid" id="deptGrid">
        ${deptCardsHtml}
      </div>

      <!-- Poster Footer -->
      <div class="poster-footer">
        <div class="footer-rules">
          <strong>STATUTORY NOTICE:</strong> Every elector must carry and present their valid <strong>College Identity Card with photograph</strong> before the Polling Officer. Mobile phones, smart watches, and cameras are strictly prohibited inside the voting booth compartment. Preserving the secrecy of the ballot is statutory.
        </div>
        <div class="footer-seal-block">
          <div class="sign-line">Returning Officer</div>
          <div class="sign-sub">${collegeName}</div>
        </div>
      </div>

    </div>
  </div>

  <script>
    // Auto-trigger print if requested
    if (new URLSearchParams(window.location.search).get('print') === 'true') {
      window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 400);
      });
    }

    // Live filter script on screen
    document.getElementById('liveSearchInput')?.addEventListener('input', function(e) {
      const q = e.target.value.toLowerCase().trim();
      const rows = document.querySelectorAll('.cls-row');
      const cards = document.querySelectorAll('.dept-card');

      if (!q) {
        rows.forEach(r => r.style.display = '');
        cards.forEach(c => c.style.display = '');
        return;
      }

      cards.forEach(card => {
        let cardHasMatch = false;
        const cardRows = card.querySelectorAll('.cls-row');
        cardRows.forEach(r => {
          const match = r.getAttribute('data-search')?.includes(q);
          r.style.display = match ? '' : 'none';
          if (match) cardHasMatch = true;
        });
        card.style.display = cardHasMatch ? '' : 'none';
      });
    });
  </script>
</body>
</html>`;
}

console.log('Generating Department & Class Voting Directory Poster for GCC...');
const fullHtml = generateHtml();
const htmlPath = resolve('Department_Class_Voting_Directory_Poster.html');
const publicHtmlPath = resolve('public/Department_Class_Voting_Directory_Poster.html');

writeFileSync(htmlPath, fullHtml);
try { copyFileSync(htmlPath, publicHtmlPath); } catch (e) {}
console.log('Saved poster HTML to:', htmlPath, 'and', publicHtmlPath);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const pdfPath = resolve('Department_Class_Voting_Directory_Poster.pdf');
const tempPdfPath = resolve('scratch/Department_Class_Voting_Directory_Poster_rendered.pdf');
const publicPdfPath = resolve('public/Department_Class_Voting_Directory_Poster.pdf');

console.log('Rendering A3 Portrait PDF via Chrome headless...');
try {
  execSync(`"${chromePath}" --headless=new --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${tempPdfPath}" --no-pdf-header-footer "file:///${htmlPath.replace(/\\\\/g, '/')}"`);
  console.log('Headless Chrome successfully printed to temp PDF:', tempPdfPath);
  
  try {
    copyFileSync(tempPdfPath, pdfPath);
    console.log('Successfully updated primary PDF:', pdfPath);
  } catch (err) {
    console.warn('Primary PDF locked or copy err.');
  }

  try {
    copyFileSync(tempPdfPath, publicPdfPath);
    console.log('Successfully updated public PDF:', publicPdfPath);
  } catch (err) {
    console.warn('Public PDF copy err.');
  }
} catch (err) {
  console.error('Chrome PDF rendering error:', err);
}
