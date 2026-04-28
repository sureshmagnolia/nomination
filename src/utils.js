/**
 * utils.js
 * Shared utility functions: eligibility checking, age calculation,
 * captcha generation, printing, etc.
 */
import { CONFIG } from './config.js';

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

export function checkEligibility(student, post, role, gender = null) {
  if (!student) return [];
  const warnings = [];
  const cls = String(student['CLASS'] || '').toUpperCase();
  const dept = String(student['Dept'] || '').toUpperCase();

  if (post.startsWith('Association Secretary ')) {
    const reqDept = post.replace('Association Secretary ', '').toUpperCase();
    if (dept !== reqDept) {
      warnings.push(`${role} for "${post}" must be from the ${reqDept} dept (current: ${student['Dept'] || 'N/A'}).`);
    }
  }

  if (post === 'I UG Representative'   && !cls.includes('1ST YEAR')) warnings.push(`${role} must be a 1st Year student for this post.`);
  if (post === 'II UG Representative'  && !cls.includes('2ND YEAR')) warnings.push(`${role} must be a 2nd Year student for this post.`);
  if (post === 'III UG Representative' && !cls.includes('3RD YEAR')) warnings.push(`${role} must be a 3rd Year student for this post.`);

  if (post === 'PG Representative') {
    const isPG = cls.includes('MA') || cls.includes('MSC') || cls.includes('MCOM') || cls.includes('M.SC') || cls.includes('M.COM') || cls.includes('M.A');
    if (!isPG) warnings.push(`${role} for PG Representative must be a PG student (MA/MSc/MCom).`);
  }

  if (role === 'Candidate' && gender) {
    if (CONFIG.FEMALE_ONLY_POSTS.includes(post) && gender === 'Male') {
      warnings.push(`The post of "${post}" is reserved for female candidates only.`);
    }
    if (CONFIG.FINAL_YEAR_INELIGIBLE_POSTS.includes(post)) {
      const isFinalYear = cls.includes('3RD YEAR') || cls.includes('2ND YEAR M');
      if (isFinalYear) warnings.push(`Final year students are not eligible for "${post}".`);
    }
  }
  return warnings;
}

export function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `${a} + ${b}`, answer: String(a + b) };
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB');
}

export function todayFormatted() {
  return new Date().toLocaleDateString('en-GB');
}

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

export function triggerPrint() { window.print(); }

export function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function setLoading(btn, isLoading, defaultText) {
  if (isLoading) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Please wait...`;
  } else {
    btn.disabled = false;
    btn.innerHTML = defaultText;
  }
}

export function showToast(message, type = 'info') {
  const colors = { info: '#6366f1', success: '#10b981', error: '#ef4444', warning: '#f59e0b' };
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;padding:0.75rem 1.25rem;border-radius:0.5rem;color:white;font-size:0.875rem;font-weight:500;background:${colors[type]||colors.info};box-shadow:0 10px 40px rgba(0,0,0,0.4);max-width:320px;transition:opacity 0.4s;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3500);
}
