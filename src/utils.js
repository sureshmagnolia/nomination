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
  const today = new Date(asOfDate);
  const birth = new Date(dobString);
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  if (days < 0) { months--; days += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  return `${years} Years, ${months} Months, ${days} Days`;
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

  // 2. Department restriction
  if (rule.deptRestriction) {
    const prefix = 'Association Secretary ';
    const reqDept = postName.startsWith(prefix) ? postName.replace(prefix, '').toUpperCase() : null;
    if (reqDept && dept !== reqDept) {
      warnings.push(`${role} for "${postName}" must be from the ${reqDept} dept (current: ${student['Dept'] || 'N/A'}).`);
    }
  }

  // 3. Year restriction
  const yr = String(rule.yearRestriction || '');
  if (yr === '1' && !cls.includes('1ST YEAR')) warnings.push(`${role} must be a 1st Year student for this post.`);
  if (yr === '2' && !cls.includes('2ND YEAR')) warnings.push(`${role} must be a 2nd Year student for this post.`);
  if (yr === '3' && !cls.includes('3RD YEAR')) warnings.push(`${role} must be a 3rd Year student for this post.`);
  if (yr === 'PG') {
    const isPG = cls.includes('MA') || cls.includes('MSC') || cls.includes('MCOM') ||
                 cls.includes('M.SC') || cls.includes('M.COM') || cls.includes('M.A');
    if (!isPG) warnings.push(`${role} for PG Representative must be a PG student (MA/MSc/MCom).`);
  }

  // 4. Candidate-only rules
  if (role === 'Candidate') {
    // Cannot propose/second themselves (common sense check)
    // Handled in UI, but safe to keep.

    if (gender) {
      if (rule.femaleOnly && gender === 'Male') {
        warnings.push(`The post of "${postName}" is reserved for female candidates only.`);
      }
      if (rule.finalYearIneligible) {
        const isFinalYear = cls.includes('3RD YEAR') || cls.includes('2ND YEAR M');
        if (isFinalYear) warnings.push(`Final year students are not eligible for "${postName}".`);
      }
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
