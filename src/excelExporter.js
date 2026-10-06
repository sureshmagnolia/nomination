/**
 * excelExporter.js
 * Utility to generate and download official election lists in Excel (.xlsx) format
 * using SheetJS (xlsx).
 */
import * as XLSX from 'xlsx';
import { comparePosts } from './utils.js';

/**
 * Export Valid List or Final Candidates List to Excel (.xlsx)
 * @param {Array} list - Array of nomination objects
 * @param {'valid'|'final'} type - Type of list to export
 * @param {Object} options - { collegeName, year, shortName }
 */
export function exportNominationsToExcel(list = [], type = 'valid', options = {}) {
  const isFinal = type === 'final';
  const collegeName = options.collegeName || 'Government College Chittur';
  const year = options.year || new Date().getFullYear();
  const shortName = options.shortName || 'GCC';

  if (!list || list.length === 0) {
    throw new Error(isFinal ? 'No approved contesting candidates to export.' : 'No valid nominations to export.');
  }

  // 1. Group nominations by post
  const grouped = {};
  if (Array.isArray(options.posts)) {
    options.posts.forEach(p => {
      const pName = typeof p === 'string' ? p : p.post;
      if (pName && !grouped[pName]) grouped[pName] = [];
    });
  }
  list.forEach(n => {
    const p = n.post || 'Unknown Post';
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(n);
  });

  // 2. Sort posts using official University election rules (comparePosts)
  const orderedPostNames = Object.keys(grouped).sort(comparePosts);

  // 3. Build Sheet 1: Master Candidate List
  const candidateRows = [
    [collegeName.toUpperCase()],
    [`COLLEGE UNION ELECTION ${year}`],
    [isFinal ? 'FINAL LIST OF CANDIDATES' : 'LIST OF VALID NOMINATIONS'],
    [`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`],
    [] // Blank row separator
  ];

  const headers = isFinal
    ? ['Post', 'Sl. No.', 'Candidate Name', 'Roll Sl. No.', 'Admission No.', 'Class', 'Remarks']
    : ['Post', 'Sl. No.', 'Candidate Name', 'Roll Sl. No.', 'Admission No.', 'Class', 'Department'];
  candidateRows.push(headers);

  let totalCandidateCount = 0;

  orderedPostNames.forEach(post => {
    const noms = grouped[post] || [];
    const isUncontested = isFinal && noms.length === 1;

    if (noms.length === 0) {
      const row = isFinal ? [
        post,
        '–',
        'NO VALID NOMINATIONS',
        '–',
        '–',
        '–',
        'NO VALID NOMINATIONS'
      ] : [
        post,
        '–',
        'NO VALID NOMINATIONS',
        '–',
        '–',
        '–',
        '–'
      ];
      candidateRows.push(row);
      return;
    }

    // Sort alphabetically by candidate name within post
    noms.sort((a, b) => String(a.candidateName || a.candidate?.NAME || '').localeCompare(String(b.candidateName || b.candidate?.NAME || '')));

    noms.forEach((n, idx) => {
      totalCandidateCount++;
      const sl  = n.candidateSerial || n.candidate?.['Nominal Roll Serial Number'] || n.candidate?.serial_number || '–';
      const adm = n.candidate?.['ADMISION NO'] || n.candidate?.['ADMISSION NO'] || n.candidateAdmission || n.candidate?.admission_no || n.admissionNo || '–';
      const cls = n.candidateClass || n.candidate?.CLASS || '–';
      const dept = n.candidateDept || n.candidate?.Dept || '–';
      const name = n.candidateName || n.candidate?.NAME || '–';

      const row = isFinal ? [
        post,
        idx + 1,
        name,
        sl,
        adm,
        cls,
        isUncontested ? 'ELECTED UNOPPOSED' : 'CONTESTING'
      ] : [
        post,
        idx + 1,
        name,
        sl,
        adm,
        cls,
        dept
      ];
      candidateRows.push(row);
    });
  });

  if (!isFinal) {
    candidateRows.push([]);
    candidateRows.push(['⚠️ STATUTORY WARNING / NOTICE TO CANDIDATES:']);
    candidateRows.push(['Candidates who have submitted nominations for more than 1 post must withdraw all additional nominations on or before the official withdrawal deadline. If any candidate fails to withdraw in time, ALL nominations submitted by that candidate shall automatically get CANCELLED under the College Union Election Rules.']);
  }

  const wsCandidates = XLSX.utils.aoa_to_sheet(candidateRows);

  // Column widths for readability
  wsCandidates['!cols'] = isFinal ? [
    { wch: 34 }, // Post
    { wch: 8 },  // Sl. No
    { wch: 28 }, // Candidate Name
    { wch: 14 }, // Roll Sl. No
    { wch: 14 }, // Admission No
    { wch: 20 }, // Class
    { wch: 24 }  // Remarks
  ] : [
    { wch: 34 }, // Post
    { wch: 8 },  // Sl. No
    { wch: 28 }, // Candidate Name
    { wch: 14 }, // Roll Sl. No
    { wch: 14 }, // Admission No
    { wch: 18 }, // Class
    { wch: 22 }  // Department
  ];

  // 4. Build Sheet 2: Post Summary
  const summaryRows = [
    [collegeName.toUpperCase()],
    [`COLLEGE UNION ELECTION ${year} — POST SUMMARY`],
    [`Total Posts: ${orderedPostNames.length} | Total Candidates: ${totalCandidateCount}`],
    [],
    ['#', 'Post Name', 'Candidates Count', isFinal ? 'Election Status' : 'Status']
  ];

  orderedPostNames.forEach((post, i) => {
    const count = grouped[post]?.length || 0;
    let status = `${count} Candidate${count > 1 ? 's' : ''}`;
    if (count === 0) {
      status = 'NO VALID NOMINATIONS';
    } else if (isFinal) {
      if (count === 1) status = 'ELECTED UNOPPOSED (Uncontested)';
      else if (count > 1) status = `CONTESTING (${count} Candidates)`;
    }
    summaryRows.push([i + 1, post, count, status]);
  });

  summaryRows.push([]);
  summaryRows.push(['TOTAL', `${orderedPostNames.length} Posts`, totalCandidateCount, '']);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 6 },  // #
    { wch: 36 }, // Post Name
    { wch: 18 }, // Candidates Count
    { wch: 34 }  // Status
  ];

  // 5. Create workbook & append sheets
  const wb = XLSX.utils.book_new();
  const mainSheetName = isFinal ? 'Final Candidates' : 'Valid Nominations';
  XLSX.utils.book_append_sheet(wb, wsCandidates, mainSheetName);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Post Summary');

  // 6. Trigger download
  const cleanShortName = String(shortName).replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `${cleanShortName}_Election_${year}_${isFinal ? 'Final_Candidate_List' : 'Valid_Nominations_List'}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}

/**
 * Export Nominal Roll (Voter List) to Excel (.xlsx)
 * @param {Array} students - Array of nominal roll student records
 * @param {Object} options - { collegeName, year, shortName, isFinal, isDraft }
 */
export function exportNominalRollToExcel(students = [], options = {}) {
  const collegeName = options.collegeName || 'Government College Chittur';
  const year = options.year || new Date().getFullYear();
  const shortName = options.shortName || 'GCC';
  const isFinal = !!options.isFinal;
  const isDraft = !!options.isDraft;

  if (!students || students.length === 0) {
    throw new Error('Nominal Roll is empty.');
  }

  const rollType = isFinal ? 'FINAL ELECTORAL ROLL' : (isDraft ? 'DRAFT ELECTORAL ROLL' : 'ELECTORAL ROLL');

  const rows = [
    [collegeName.toUpperCase()],
    [`COLLEGE UNION ELECTION ${year}`],
    [rollType],
    [`Total Voters: ${students.length} | Generated: ${new Date().toLocaleString('en-IN')}`],
    [],
    ['Roll Sl. No.', 'Admission No.', 'Student Name', 'Class', 'Department', 'Gender', 'Second Language']
  ];

  // Sort by serial number cleanly
  const sortedStudents = [...students].sort((a, b) => {
    const slA = a['Nominal Roll Serial Number'] || a.serial_number || a.sl || '';
    const slB = b['Nominal Roll Serial Number'] || b.serial_number || b.sl || '';
    const numA = parseInt(String(slA).replace(/\D/g, ''), 10);
    const numB = parseInt(String(slB).replace(/\D/g, ''), 10);
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
    return String(slA).localeCompare(String(slB));
  });

  sortedStudents.forEach(s => {
    const sl   = s['Nominal Roll Serial Number'] || s.serial_number || s.sl || '';
    const adm  = s['ADMISION NO'] || s['ADMISSION NO'] || s.admission_no || s.admission || '';
    const name = s['NAME'] || s.name || '';
    const cls  = s['CLASS'] || s.class || '';
    const dept = s['Dept'] || s.dept || s.department || '';
    const gen  = s['Gender'] || s.gender || '';
    const lang = s['Second Language'] || s.secondLanguage || s.lang || '';

    rows.push([sl, adm, name, cls, dept, gen, lang]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 }, // Roll Sl. No.
    { wch: 16 }, // Admission No.
    { wch: 30 }, // Student Name
    { wch: 18 }, // Class
    { wch: 22 }, // Department
    { wch: 10 }, // Gender
    { wch: 18 }  // Second Language
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nominal Roll');

  const cleanShortName = String(shortName).replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `${cleanShortName}_Nominal_Roll_${isFinal ? 'Final' : (isDraft ? 'Draft' : 'Unpublished')}_${year}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
