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
          @page { size: A4 portrait; margin: 6mm 10mm; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            color: black !important;
            background: white !important;
            font-size: 11pt;
            line-height: 1.4;
            margin: 0;
            padding: 0;
          }
          /* Reset dark theme classes to clean B&W for printing */
          * { color: black !important; background: transparent !important; border-color: #333 !important; }
          .print-paper { width: 100%; margin: 0 auto; padding: 15px 18px 18px 18px; }
          .border { border: 1px solid #333; }
          .border-b { border-bottom: 1px solid #333; }
          .border-y { border-top: 1px solid #333; border-bottom: 1px solid #333; }
          .border-t { border-top: 1px solid #333; }
          .rounded-lg, .rounded-xl { border-radius: 4px; }
          .p-8 { padding: 1.25rem 1.5rem; }
          .p-4 { padding: 0.85rem 1rem; }
          .p-3 { padding: 0.65rem 0.85rem; }
          .p-3\.5 { padding: 11px 15px 13px 15px; }
          .pt-6 { padding-top: 1.25rem; }
          .pb-1 { padding-bottom: 0.25rem; }
          .pb-1\.5 { padding-bottom: 0.35rem; }
          .pb-2 { padding-bottom: 0.5rem; }
          .pb-3 { padding-bottom: 0.75rem; }
          .mt-1 { margin-top: 0.25rem; }
          .mt-2 { margin-top: 0.5rem; }
          .mt-3 { margin-top: 0.75rem; }
          .mt-3\.5 { margin-top: 0.85rem; }
          .mt-4 { margin-top: 1rem; }
          .mt-6 { margin-top: 1.25rem; }
          .mb-1 { margin-bottom: 0.25rem; }
          .mb-1\.5 { margin-bottom: 0.35rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .space-y-4 > * + * { margin-top: 0.85rem; }
          .space-y-3 > * + * { margin-top: 0.8rem; }
          .space-y-2\.5 > * + * { margin-top: 0.7rem; }
          .space-y-2 > * + * { margin-top: 0.55rem; }
          .space-y-1 > * + * { margin-top: 0.25rem; }
          .flex { display: flex; }
          .flex-1 { flex: 1 1 0%; }
          .shrink-0 { flex-shrink: 0; }
          .justify-between { justify-content: space-between; }
          .justify-around { justify-content: space-around; }
          .items-start { align-items: flex-start; }
          .items-center { align-items: center; }
          .items-baseline { align-items: baseline; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-xs { font-size: 0.82rem; }
          .text-sm { font-size: 0.92rem; }
          .text-base { font-size: 1rem; }
          .text-lg { font-size: 1.15rem; }
          .text-xl { font-size: 1.25rem; }
          .text-3xl { font-size: 1.875rem; }
          .font-bold { font-weight: bold; }
          .font-semibold { font-weight: 600; }
          .font-mono { font-family: monospace; }
          .uppercase { text-transform: uppercase; }
          .tracking-wide { letter-spacing: 0.025em; }
          .tracking-widest { letter-spacing: 0.08em; }
          .w-40 { width: 10rem; }
          .inline-block { display: inline-block; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
          .col-span-2 { grid-column: span 2; }
          .gap-x-4 { column-gap: 1rem; }
          .gap-x-6 { column-gap: 1.5rem; }
          .gap-x-8 { column-gap: 2rem; }
          .gap-y-1 { row-gap: 0.25rem; }
          .gap-y-1\.5 { row-gap: 0.375rem; }
          .gap-y-2 { row-gap: 0.5rem; }
          .gap-y-2\.5 { row-gap: 0.65rem; }
          .gap-y-3 { row-gap: 0.82rem; }
          .italic { font-style: italic; }
          .badge { border: 1px solid #000; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
          .dotted-line { display: inline-block; border-bottom: 1.5px dotted #000 !important; height: 24px; vertical-align: bottom; }
          h2, h3, p { margin: 0; }
          @media print {
            .print-paper { page-break-inside: avoid !important; break-inside: avoid !important; }
          }
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

// ─── Electoral Roll Serial Parsing & Natural Alphanumeric Comparison (supports 1, 2, 124a, 124b, D10) ─────
export function parseSl(s) {
  const raw = String(s?.['Nominal Roll Serial Number'] || s?.serial_number || s?.SL_NO || s?.['SL. NO'] || '').trim();
  const digits = raw.replace(/^D/i, '').replace(/[^0-9]/g, '');
  const num = parseInt(digits, 10);
  const suffixMatch = raw.match(/[a-zA-Z]+$/);
  const suffix = suffixMatch ? suffixMatch[0].toLowerCase() : '';
  return {
    num: isNaN(num) ? 999999999 : num,
    suffix,
    raw: raw.toLowerCase()
  };
}

export function compareSl(a, b) {
  const pA = parseSl(a);
  const pB = parseSl(b);
  if (pA.num !== pB.num) return pA.num - pB.num;
  if (pA.suffix !== pB.suffix) return pA.suffix.localeCompare(pB.suffix);
  return pA.raw.localeCompare(pB.raw);
}

// ─── Department-Scoped Class Identification for Research Scholars ────────────
export function getStudentDeptClassKey(student) {
  const rawClass = String(student?.['CLASS'] || student?.class || 'UNSPECIFIED').trim();
  const dept = String(student?.['Dept'] || student?.dept || '').trim();
  const isRS = rawClass.toUpperCase().includes('RESEARCH') || rawClass.toUpperCase().includes('SCHOLAR') || rawClass.toUpperCase().includes('PHD');
  if (isRS) {
    return dept ? `RESEARCH SCHOLAR - ${dept}` : 'RESEARCH SCHOLAR';
  }
  return rawClass;
}

// ─── Program Level Progression Weight (RS placed at the end of each department) ───
export function getProgWeight(className) {
  const c = String(className || '').toUpperCase().trim();
  
  // 1. Research Scholars (end of department)
  if (c.includes('RESEARCH') || c.includes('SCHOLAR') || c.includes('PHD') || c.includes('PH.D') || c.includes('PH D')) {
    return 6000;
  }
  
  // 2. Post-Graduate (PG) Classes: Check PG indicators first
  const isPg = /(^|[^A-Z])(PG|POST\s*GRADUATE|M\.?A|M\.?SC|M\.?COM|MCA|MSW|M\.?VOC|M\.?ED|M\.?TECH|MASTER)([^A-Z]|$)/i.test(c) ||
               /^(I|II|III|1ST|2ND|3RD|1|2|3)\s*(YEAR\s*)?(M|PG)\b/i.test(c);
  
  if (isPg) {
    // PG 2nd Year
    if (/(^|[^A-Z])(2ND|II|SECOND)([^A-Z]|$)/i.test(c) || /2ND\s+YEAR/i.test(c) || /(^|[^A-Z])(SEM\s*[34]|S[34]|[34](RD|TH)\s*SEM)([^A-Z]|$)/i.test(c)) {
      return 5000;
    }
    // PG 3rd Year (e.g. 3-year MCA)
    if (/(^|[^A-Z])(3RD|III|THIRD)([^A-Z]|$)/i.test(c) || /3RD\s+YEAR/i.test(c) || /(^|[^A-Z])(SEM\s*[56]|S[56]|[56](TH)\s*SEM)([^A-Z]|$)/i.test(c)) {
      return 5500;
    }
    // PG 1st Year (or general PG default)
    return 4000;
  }
  
  // 3. Under-Graduate (UG) Classes
  // 1st Year UG
  if (/(^|[^A-Z])(1ST|I|FIRST)([^A-Z]|$)/i.test(c) || /1ST\s+YEAR/i.test(c) || /(^|[^A-Z])(SEM\s*[12]|S[12]|[12](ST|ND)\s*SEM)([^A-Z]|$)/i.test(c) || /^I\s+(B|UG)/i.test(c)) {
    return 1000;
  }
  // 2nd Year UG
  if (/(^|[^A-Z])(2ND|II|SECOND)([^A-Z]|$)/i.test(c) || /2ND\s+YEAR/i.test(c) || /(^|[^A-Z])(SEM\s*[34]|S[34]|[34](RD|TH)\s*SEM)([^A-Z]|$)/i.test(c) || /^II\s+(B|UG)/i.test(c)) {
    return 2000;
  }
  // 3rd Year UG
  if (/(^|[^A-Z])(3RD|III|THIRD)([^A-Z]|$)/i.test(c) || /3RD\s+YEAR/i.test(c) || /(^|[^A-Z])(SEM\s*[56]|S[56]|[56](TH)\s*SEM)([^A-Z]|$)/i.test(c) || /^III\s+(B|UG)/i.test(c)) {
    return 3000;
  }
  // 4th Year UG (FYUGP)
  if (/(^|[^A-Z])(4TH|IV|FOURTH)([^A-Z]|$)/i.test(c) || /4TH\s+YEAR/i.test(c) || /(^|[^A-Z])(SEM\s*[78]|S[78]|[78](TH)\s*SEM)([^A-Z]|$)/i.test(c) || /^IV\s+(B|UG)/i.test(c)) {
    return 3500;
  }
  
  return 3800;
}

// ─── Post Classification & Alphabetical Association Secretary Sorting ────────
export function isAssocPost(postOrRule) {
  const p = typeof postOrRule === 'string' ? postOrRule : (postOrRule?.post || postOrRule?.name || '');
  const u = String(p).toUpperCase().trim();
  return u.startsWith('ASSOCIATION SECRETARY') || 
         u.includes('ASSOCIATION') || 
         Boolean(postOrRule?.deptRestriction) || 
         Boolean(postOrRule?.restrictedDept);
}

export function isYearRepPost(postOrRule) {
  if (isAssocPost(postOrRule)) return false;
  const p = typeof postOrRule === 'string' ? postOrRule : (postOrRule?.post || postOrRule?.name || '');
  const u = String(p).toUpperCase().trim();
  if (u.includes('UUC') || u.includes('UNIVERSITY UNION COUNCILLOR')) return false;
  return u.includes('REPRESENTATIVE') || u.includes('REP');
}

export function getPostOrderRank(postOrRule) {
  const p = typeof postOrRule === 'string' ? postOrRule : (postOrRule?.post || postOrRule?.name || '');
  const u = String(p).toUpperCase().trim();

  // Major Executive Posts (Ranks 1 - 20)
  if (u === 'THE CHAIRMAN' || u === 'CHAIRMAN') return 1;
  if (u.includes('VICE CHAIRMAN') || u.includes('VICE-CHAIRMAN')) return 2;
  if (u === 'THE SECRETARY' || u === 'SECRETARY' || u === 'GENERAL SECRETARY') return 3;
  if (u.includes('JOINT SECRETARY')) return 4;
  if (u.includes('STUDENT EDITOR') || u.includes('CHIEF STUDENT EDITOR')) return 5;
  if (u.includes('FINE ARTS') || u.includes('ARTS CLUB')) return 6;
  if (u.includes('GENERAL CAPTAIN') || u.includes('SPORTS')) return 7;
  if (u.includes('UNIVERSITY UNION COUNCILLOR') || u.includes('UUC')) return 8;

  // Other general campus-wide union posts (Rank 50)
  if (!isYearRepPost(postOrRule) && !isAssocPost(postOrRule)) return 50;

  // Class / Year Representatives (Rank 100 - 150)
  if (isYearRepPost(postOrRule)) {
    if (u.includes('I UG') || u.includes('1ST UG') || u.includes('1_UG') || u.includes('1ST YEAR UG')) return 101;
    if (u.includes('II UG') || u.includes('2ND UG') || u.includes('2_UG') || u.includes('2ND YEAR UG')) return 102;
    if (u.includes('III UG') || u.includes('3RD UG') || u.includes('3_UG') || u.includes('3RD YEAR UG')) return 103;
    if (u.includes('I PG') || u.includes('1ST PG') || u.includes('1_PG')) return 104;
    if (u.includes('II PG') || u.includes('2ND PG') || u.includes('2_PG')) return 105;
    if (u.includes('PG')) return 106;
    return 120;
  }

  // Association Secretaries (Rank 200 - Always Alphabetically Sorted by Dept / Post Name)
  return 200;
}

export function getAssocPostSortKey(postOrRule) {
  const p = typeof postOrRule === 'string' ? postOrRule : (postOrRule?.post || postOrRule?.name || '');
  let s = String(p).trim();
  const prefixRegex = /^ASSOCIATION\s+SECRETARY\s*(FOR\s*|\s*-\s*|\s*:\s*|\s+OF\s*)?/i;
  s = s.replace(prefixRegex, '').trim();
  return s.toLowerCase();
}

export function comparePosts(a, b) {
  const rankA = getPostOrderRank(a);
  const rankB = getPostOrderRank(b);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  // If both are Association Secretaries (rank 200), sort strictly ALPHABETICALLY
  if (rankA === 200 && rankB === 200) {
    const keyA = getAssocPostSortKey(a);
    const keyB = getAssocPostSortKey(b);
    if (keyA !== keyB) return keyA.localeCompare(keyB);
    const nameA = typeof a === 'string' ? a : (a?.post || a?.name || '');
    const nameB = typeof b === 'string' ? b : (b?.post || b?.name || '');
    return String(nameA).localeCompare(String(nameB));
  }

  const nameA = typeof a === 'string' ? a : (a?.post || a?.name || '');
  const nameB = typeof b === 'string' ? b : (b?.post || b?.name || '');
  return String(nameA).localeCompare(String(nameB));
}

export function sortPosts(postsList) {
  if (!Array.isArray(postsList)) return [];
  return [...postsList].sort(comparePosts);
}

/**
 * Formats a date string (ISO or local) into a human-readable statutory deadline,
 * e.g. "25th September, 04:00 PM".
 */
export function formatCorrectionDeadline(dateStr) {
  if (!dateStr) return '25th September, 04:00 PM';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);

    const day = d.getDate();
    const getOrdinal = (n) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    const dayOrdinal = getOrdinal(day);
    const month = d.toLocaleDateString('en-IN', { month: 'long' });

    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;

    return `${dayOrdinal} ${month}, ${timeStr}`;
  } catch (_) {
    return '25th September, 04:00 PM';
  }
}

