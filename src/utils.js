/**
 * utils.js
 * Shared utility functions: eligibility checking, age calculation,
 * captcha generation, printing, etc.
 *
 * Posts are now dynamic — passed in as an array of post rule objects.
 * Each object has the shape:
 *   { post, femaleOnly, finalYearIneligible, yearRestriction, deptRestriction }
 */
import { CONFIG } from './config.js';

// ─── Age Calculation ───────────────────────────────────────────────────────────
export function calculateAge(dobString, asOfDate = CONFIG.ELECTION_DATE) {
  if (!dobString) return 'N/A';
  let birth;
  if (typeof dobString === 'string' && dobString.includes('-')) {
    const parts = dobString.split('-');
    if (parts[0].length === 4) {
      birth = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      birth = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
  } else {
    birth = new Date(dobString);
  }
  if (isNaN(birth.getTime())) return 'N/A';
  const today = new Date(asOfDate);
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  if (days < 0) { months--; days += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  return `${years} Years, ${months} Months, ${days} Days`;
}

// ─── Year Levels & Classification ─────────────────────────────────────────────
export const YEAR_LEVELS = [
  { id: '1_UG', label: '1st Year UG (I UG)', short: 'I UG' },
  { id: '2_UG', label: '2nd Year UG (II UG)', short: 'II UG' },
  { id: '3_UG', label: '3rd Year UG (III UG)', short: 'III UG' },
  { id: '1_PG', label: '1st Year PG (I PG)', short: 'I PG' },
  { id: '2_PG', label: '2nd Year PG (II PG)', short: 'II PG' },
  { id: 'RS', label: 'Research Scholar (Ph.D)', short: 'RS' }
];

export function getStudentYearLevel(cls) {
  const c = String(cls || '').toUpperCase().trim();
  if (c.includes('RESEARCH') || c.includes('SCHOLAR') || c.includes('PHD')) return 'RS';
  const isPG = /\b(MA|MSC|MCOM|M\.SC|M\.COM|M\.A|MBA|MCA|MSW)\b/.test(c) || c.includes('POST GRADUATE') || c.includes('PG');
  const isYr1 = c.includes('1ST') || /^\s*(1|1ST|I)\b/.test(c) || /\b1ST\s+YEAR\b/.test(c) || /\bI\s+(YEAR|UG|PG|DC|DEG|BA|BSC|BCOM|MA|MSC|MCOM)\b/.test(c);
  const isYr2 = c.includes('2ND') || /^\s*(2|2ND|II)\b/.test(c) || /\b2ND\s+YEAR\b/.test(c) || /\bII\s+(YEAR|UG|PG|DC|DEG|BA|BSC|BCOM|MA|MSC|MCOM)\b/.test(c);
  const isYr3 = c.includes('3RD') || /^\s*(3|3RD|III)\b/.test(c) || /\b3RD\s+YEAR\b/.test(c) || /\bIII\s+(YEAR|UG|DC|DEG|BA|BSC|BCOM)\b/.test(c);

  if (isPG) {
    if (isYr2) return '2_PG';
    return '1_PG';
  } else {
    if (isYr3) return '3_UG';
    if (isYr2) return '2_UG';
    return '1_UG';
  }
}

export function isYearEligible(cls, rule) {
  if (!rule) return true;
  const studentLvl = getStudentYearLevel(cls);
  const mode = rule.yearRuleMode || (rule.finalYearIneligible ? 'EXCLUDE' : (rule.yearRestriction ? 'INCLUDE' : 'ALL'));

  let targetYears = [];
  if (Array.isArray(rule.yearRuleYears)) {
    targetYears = rule.yearRuleYears;
  } else if (typeof rule.yearRuleYears === 'string' && rule.yearRuleYears.trim()) {
    targetYears = rule.yearRuleYears.split(',').map(y => y.trim()).filter(Boolean);
  } else {
    if (rule.finalYearIneligible) targetYears = ['3_UG', '2_PG'];
    else if (rule.yearRestriction === '1') targetYears = ['1_UG'];
    else if (rule.yearRestriction === '2') targetYears = ['2_UG'];
    else if (rule.yearRestriction === '3') targetYears = ['3_UG'];
    else if (rule.yearRestriction === 'PG') targetYears = ['1_PG', '2_PG'];
    else if (rule.yearRestriction === 'UG') targetYears = ['1_UG', '2_UG', '3_UG'];
    else if (rule.yearRestriction === '1,2') targetYears = ['1_UG', '2_UG'];
  }

  if (mode === 'ALL' || targetYears.length === 0) {
    if (rule.finalYearIneligible && (studentLvl === '3_UG' || studentLvl === '2_PG')) return false;
    return true;
  }

  const matches = (lvl, list) => {
    if (list.includes(lvl)) return true;
    if (lvl.endsWith('_UG') && list.includes('UG')) return true;
    if (lvl.endsWith('_PG') && list.includes('PG')) return true;
    if (lvl.startsWith('1_') && list.includes('1')) return true;
    if (lvl.startsWith('2_') && list.includes('2')) return true;
    if (lvl.startsWith('3_') && list.includes('3')) return true;
    return false;
  };

  if (mode === 'INCLUDE') {
    return matches(studentLvl, targetYears);
  }
  if (mode === 'EXCLUDE') {
    return !matches(studentLvl, targetYears);
  }
  return true;
}

export function formatYearRuleDescription(rule) {
  if (!rule) return 'All Years Eligible';
  const mode = rule.yearRuleMode || (rule.finalYearIneligible ? 'EXCLUDE' : (rule.yearRestriction ? 'INCLUDE' : 'ALL'));
  let targetYears = [];
  if (Array.isArray(rule.yearRuleYears)) targetYears = rule.yearRuleYears;
  else if (typeof rule.yearRuleYears === 'string' && rule.yearRuleYears.trim()) targetYears = rule.yearRuleYears.split(',').map(y => y.trim()).filter(Boolean);
  else {
    if (rule.finalYearIneligible) targetYears = ['3_UG', '2_PG'];
    else if (rule.yearRestriction === '1') targetYears = ['1_UG'];
    else if (rule.yearRestriction === '2') targetYears = ['2_UG'];
    else if (rule.yearRestriction === '3') targetYears = ['3_UG'];
    else if (rule.yearRestriction === 'PG') targetYears = ['1_PG', '2_PG'];
    else if (rule.yearRestriction === 'UG') targetYears = ['1_UG', '2_UG', '3_UG'];
    else if (rule.yearRestriction === '1,2') targetYears = ['1_UG', '2_UG'];
  }

  if (mode === 'ALL' || targetYears.length === 0) {
    if (rule.finalYearIneligible) return 'Final Years Barred (3rd UG & 2nd PG)';
    return 'All Years Eligible';
  }

  const mapShort = y => {
    const found = YEAR_LEVELS.find(l => l.id === y);
    return found ? found.short : y;
  };

  const labels = targetYears.map(mapShort).join(', ');
  if (mode === 'INCLUDE') return `Only: ${labels}`;
  if (mode === 'EXCLUDE') return `Barred: ${labels}`;
  return 'All Years';
}

// ─── Eligibility Rules ─────────────────────────────────────────────────────────
/**
 * Returns array of warning strings. Empty = eligible.
 * @param {object} student    - Row from nominal roll
 * @param {string} postName   - Name of the selected post
 * @param {string} role       - 'Candidate' | 'Proposer' | 'Seconder'
 * @param {string|null} gender
 * @param {object[]} allPosts - Array of post-rule objects from the database/config
 */
export function checkEligibility(student, postName, role, gender = null, allPosts = [], existingNominations = []) {
  if (!student) return [];
  const warnings = [];
  const cls  = String(student['CLASS'] || '').toUpperCase();
  const dept = String(student['Dept'] || '').toUpperCase();
  const serial = String(student['Nominal Roll Serial Number']);

  // Find the rule for this post
  const rule = allPosts.find(p => p.post === postName) || {};

  // 1. Multi-Proposing/Seconding Check (ONLY for Proposer/Seconder)
  if (role === 'Proposer' || role === 'Seconder') {
    const alreadyEndorsedThisPost = existingNominations.some(n => 
      n.post === postName && 
      n.status !== 'Rejected' && 
      (String(n.proposerSerial) === serial || String(n.seconderSerial) === serial)
    );
    if (alreadyEndorsedThisPost) {
      warnings.push(`Student #${serial} has already proposed or seconded a candidate for "${postName}". They cannot endorse multiple candidates for the same post.`);
    }
  }

  // 2. Department restriction (Applies to Candidate, Proposer, and Seconder)
  if (rule.deptRestriction) {
    const targetDept = (rule.restrictedDept || (postName.startsWith('Association Secretary ') ? postName.replace('Association Secretary ', '') : '')).trim();
    if (targetDept) {
      const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const sNorm = norm(dept);
      const tNorm = norm(targetDept);
      const isMatch = sNorm === tNorm || sNorm.includes(tNorm) || tNorm.includes(sNorm);
      if (!isMatch) {
        warnings.push(`${role} for "${postName}" must belong to the ${targetDept} department (current student: ${student['Dept'] || 'N/A'}).`);
      }
    }
  }

  // 3. Year / Level Policy (Supports Include / Exclude modes for any combination of years)
  if (!isYearEligible(cls, rule)) {
    const desc = formatYearRuleDescription(rule);
    warnings.push(`${role} (${cls || 'Unspecified'}) is not eligible under year restriction for "${postName}" (${desc}).`);
  }

  // 4. Candidate-only rules
  if (role === 'Candidate') {
    if (getStudentYearLevel(cls) === 'RS') {
      warnings.push('Research Scholars are not eligible to contest in College Union Elections.');
    }
    // Gender restriction
    if (rule.femaleOnly && gender && gender !== 'Female') {
      warnings.push(`The post of "${postName}" is reserved for female candidates only.`);
    }
  }

  return warnings;
}

// ─── Captcha ───────────────────────────────────────────────────────────────────
export function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `${a} + ${b}`, answer: String(a + b) };
}

// ─── Date formatting ───────────────────────────────────────────────────────────
export function todayFormatted() {
  return new Date().toLocaleDateString('en-GB');
}

// ─── DOB dropdowns ─────────────────────────────────────────────────────────────
export function populateDobSelects(dayEl, monthEl, yearEl) {
  if (!dayEl || !monthEl || !yearEl) return;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  for (let i = 1; i <= 31; i++) dayEl.innerHTML += `<option value="${i}">${i}</option>`;
  months.forEach((m, i) => monthEl.innerHTML += `<option value="${i+1}">${m}</option>`);
  for (let y = 2015; y >= 1950; y--) yearEl.innerHTML += `<option value="${y}">${y}</option>`;
}

export function buildDobString(day, month, year) {
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

export function displayDob(day, month, year) {
  return `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`;
}

// ─── Print helper ──────────────────────────────────────────────────────────────
export function triggerPrint(htmlContent, title = 'Nomination Form') {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Popup blocked! Please allow popups for this site to print.');
    return;
  }
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            color: black !important;
            background: white !important;
            font-size: 11pt;
            line-height: 1.5;
            margin: 0;
            padding: 0;
          }
          /* Reset dark theme classes to clean B&W for printing */
          * { color: black !important; background: transparent !important; border-color: #333 !important; }
          .print-paper { width: 100%; margin: 0 auto; padding: 1rem; }
          .border { border: 1px solid #333; }
          .border-b { border-bottom: 1px solid #333; }
          .border-y { border-top: 1px solid #333; border-bottom: 1px solid #333; }
          .border-t { border-top: 1px solid #333; }
          .rounded-lg, .rounded-xl { border-radius: 4px; }
          .p-8 { padding: 2rem; }
          .p-4 { padding: 1rem; }
          .p-3 { padding: 0.75rem; }
          .pt-6 { padding-top: 1.5rem; }
          .pb-1 { padding-bottom: 0.25rem; }
          .pb-2 { padding-bottom: 0.5rem; }
          .pb-3 { padding-bottom: 0.75rem; }
          .mt-1 { margin-top: 0.25rem; }
          .mt-4 { margin-top: 1rem; }
          .mt-6 { margin-top: 1.5rem; }
          .mb-1 { margin-bottom: 0.25rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .space-y-4 > * + * { margin-top: 1rem; }
          .space-y-3 > * + * { margin-top: 0.75rem; }
          .space-y-1 > * + * { margin-top: 0.25rem; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .justify-around { justify-content: space-around; }
          .items-start { align-items: flex-start; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-xs { font-size: 0.8rem; }
          .text-sm { font-size: 0.9rem; }
          .text-base { font-size: 1rem; }
          .text-lg { font-size: 1.125rem; }
          .text-xl { font-size: 1.25rem; }
          .text-3xl { font-size: 1.875rem; }
          .font-bold { font-weight: bold; }
          .font-semibold { font-weight: 600; }
          .font-mono { font-family: monospace; }
          .uppercase { text-transform: uppercase; }
          .tracking-wide { letter-spacing: 0.025em; }
          .tracking-widest { letter-spacing: 0.1em; }
          .w-40 { width: 10rem; }
          .inline-block { display: inline-block; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
          .col-span-2 { grid-column: span 2; }
          .gap-x-4 { column-gap: 1rem; }
          .gap-y-1 { row-gap: 0.25rem; }
          .italic { font-style: italic; }
          .badge { border: 1px solid #000; padding: 2px 6px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; }
          h2, h3, p { margin: 0; }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 200);
          };
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

// ─── HTML escape ──────────────────────────────────────────────────────────────
export function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Loading state helper ─────────────────────────────────────────────────────
export function setLoading(btn, isLoading, defaultText) {
  if (isLoading) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Please wait...`;
  } else {
    btn.disabled = false;
    btn.innerHTML = defaultText;
  }
}

// ─── Toast notification ────────────────────────────────────────────────────────
export function showToast(message, type = 'info') {
  const colors = { info: '#6366f1', success: '#10b981', error: '#ef4444', warning: '#f59e0b' };
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;padding:0.75rem 1.25rem;border-radius:0.5rem;color:white;font-size:0.875rem;font-weight:500;background:${colors[type]||colors.info};box-shadow:0 10px 40px rgba(0,0,0,0.4);max-width:320px;transition:opacity 0.4s;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3500);
}
