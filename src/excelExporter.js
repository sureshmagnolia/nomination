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

// ─── Post Category Classification Helpers ─────────────────────────────────────
const isAssocPost = (p) => {
  const name = String(typeof p === 'string' ? p : (p?.post || p?.name || '')).toUpperCase();
  return name.includes('ASSOCIATION') || name.includes('ASSOC') || !!(typeof p === 'object' && p?.deptRestriction);
};

const isUUCPost = (p) => {
  const name = String(typeof p === 'string' ? p : (p?.post || p?.name || '')).toUpperCase();
  return name.includes('UUC') || name.includes('UNIVERSITY UNION COUNCILLOR');
};

const isYearPost = (p) => {
  if (isAssocPost(p) || isUUCPost(p)) return false;
  const name = String(typeof p === 'string' ? p : (p?.post || p?.name || '')).toUpperCase();
  return name.includes('REPRESENTATIVE') || name.includes('REP');
};

const isGeneralPost = (p) => !isAssocPost(p) && !isYearPost(p);

const getCohortInfo = (postName) => {
  const p = String(postName || '').toUpperCase();
  if (p.includes('III UG') || p.includes('3RD YEAR') || p.includes('3 UG') || p.includes('THIRD YEAR')) {
    return { title: 'III UG Representative', short: 'III UG', rank: 3 };
  }
  if (p.includes('II UG') || p.includes('2ND YEAR') || p.includes('2 UG') || p.includes('SECOND YEAR')) {
    return { title: 'II UG Representative', short: 'II UG', rank: 2 };
  }
  if (p.includes('I UG') || p.includes('1ST YEAR') || p.includes('1 UG') || p.includes('FIRST YEAR')) {
    return { title: 'I UG Representative', short: 'I UG', rank: 1 };
  }
  if (p.includes('PG') || p.includes('POST GRADUATE') || p.includes('POSTGRADUATE')) {
    return { title: 'PG Representative', short: 'PG', rank: 4 };
  }
  return { title: postName, short: postName, rank: 5 };
};

const formatBooksText = (books) => {
  if (!books || !Array.isArray(books) || books.length === 0) return '–';
  return books.map(b => {
    const itemDetails = (b.items || []).map(it => `${it.id}: ${it.range}`).join(', ');
    return `${b.qty} x ${b.size}${itemDetails ? ` (${itemDetails})` : ''}`;
  }).join(' | ');
};

/**
 * Export Official Ballots (Candidate Rosters, Serial Ranges & Packaging Plan) to Excel (.xlsx)
 * Formatted to be structurally and visually identical to the official HTML printed ballot papers.
 * @param {Object} options
 * @param {Array} options.postsData - List of posts from API
 * @param {Object|Array} options.candidatesResponse - Contesting candidates
 * @param {Object} options.schedule - Election schedule
 * @param {Object} options.settings - College and election settings
 * @param {Object} options.currentConfig - Ballot configuration (split/unified)
 * @param {Object} options.masterPlan - Ballot Master Plan (booth serials & booklet numbers)
 * @param {string} options.filterType - 'all' | 'general' | 'year' | 'assoc' | 'summary' | 'general_part:...'
 */
export function exportBallotsToExcel({
  postsData = [],
  candidatesResponse = [],
  schedule = {},
  settings = {},
  currentConfig = {},
  masterPlan = null,
  filterType = 'all'
} = {}) {
  const collegeName = settings.collegeName || 'Government College Chittur';
  const shortName = settings.collegeShortName || settings.shortName || 'GCC';
  const year = settings.electionYear || schedule.electionYear || new Date().getFullYear().toString();
  const cleanShortName = String(shortName).replace(/[^a-zA-Z0-9_-]/g, '');

  const candidates = Array.isArray(candidatesResponse) 
    ? candidatesResponse 
    : (candidatesResponse?.active || []);

  // Normalize posts array
  const allPosts = postsData.map(p => typeof p === 'string' ? { post: p } : p);

  // Identify contestable posts (candidates > 1 requiring printed ballot)
  const contestablePosts = allPosts.filter(p => {
    const pCands = candidates.filter(c => c.post === p.post);
    return pCands.length > 1;
  }).sort(comparePosts);

  const isSplit = !!currentConfig?.isSplit;
  const part2PostsSet = new Set(
    (isSplit && currentConfig?.ballots?.[1]?.posts) || []
  );

  const wb = XLSX.utils.book_new();

  // Helper to sanitize Excel worksheet name (max 31 chars, no invalid characters)
  const sanitizeSheetName = (name) => {
    return String(name || 'Sheet')
      .replace(/[\\/?*[\]:]/g, ' ')
      .trim()
      .substring(0, 31);
  };

  // Helper to build 2-Column A3 Ballot Worksheet (Matches General Ballot HTML)
  const buildGeneralBallotWorksheet = (partConfig, partPosts) => {
    const prefix = partConfig.shortCode === 'G' ? 'G' : (partConfig.shortCode || 'G1') + '-';
    const partTitle = partConfig.title || 'OFFICIAL BALLOT PAPER (GENERAL)';
    const sorted = [...partPosts].sort((a, b) => comparePosts(a, b));

    const rows = [];
    const merges = [];

    const ensureRow = (rIndex) => {
      while (rows.length <= rIndex) {
        rows.push(['', '', '', '', '', '', '']);
      }
      return rows[rIndex];
    };

    // 1. Counterfoil Section
    let r = 0;
    ensureRow(r)[0] = collegeName.toUpperCase();
    merges.push({ s: { r, c: 0 }, e: { r, c: 6 } });

    r++;
    ensureRow(r)[0] = `COLLEGE UNION ELECTION ${year}`;
    merges.push({ s: { r, c: 0 }, e: { r, c: 6 } });

    r++;
    ensureRow(r)[0] = `${partTitle.toUpperCase()} - COUNTERFOIL`;
    merges.push({ s: { r, c: 0 }, e: { r, c: 6 } });

    r++;
    ensureRow(r)[0] = `SL.NO. ${prefix}____________`;
    ensureRow(r)[4] = `(To be detached before voting)`;
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
    merges.push({ s: { r, c: 4 }, e: { r, c: 6 } });

    r++;
    ensureRow(r)[0] = `Sl. No of Voter in Marked Copy: ____________`;
    merges.push({ s: { r, c: 0 }, e: { r, c: 6 } });

    r++;
    ensureRow(r)[0] = `✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -`;
    merges.push({ s: { r, c: 0 }, e: { r, c: 6 } });

    // 2. Ballot Paper Header Section
    r++;
    ensureRow(r)[0] = collegeName.toUpperCase();
    merges.push({ s: { r, c: 0 }, e: { r, c: 6 } });

    r++;
    ensureRow(r)[0] = `COLLEGE UNION ELECTION ${year}`;
    merges.push({ s: { r, c: 0 }, e: { r, c: 6 } });

    r++;
    ensureRow(r)[0] = partTitle.toUpperCase();
    merges.push({ s: { r, c: 0 }, e: { r, c: 6 } });

    r++;
    ensureRow(r)[0] = `SL.NO. ${prefix}____________`;
    ensureRow(r)[4] = `Signature of PRO`;
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
    merges.push({ s: { r, c: 4 }, e: { r, c: 6 } });

    r++;
    ensureRow(r)[0] = `MARK THE VOTER'S CHOICE WITH THE MARKING SEAL IN THE SPACE PROVIDED`;
    merges.push({ s: { r, c: 0 }, e: { r, c: 6 } });

    r++;
    ensureRow(r); // Blank row divider

    // 3. Ballot 2-Column Grid of Contested Posts
    if (sorted.length === 0) {
      r++;
      ensureRow(r)[0] = 'NO CONTESTED GENERAL UNION POSTS (All candidates elected unopposed or no nominations)';
      merges.push({ s: { r, c: 0 }, e: { r, c: 6 } });
    } else {
      const leftPosts = sorted.filter((_, idx) => idx % 2 === 0);
      const rightPosts = sorted.filter((_, idx) => idx % 2 === 1);
      const maxPairs = Math.max(leftPosts.length, rightPosts.length);

      for (let pIdx = 0; pIdx < maxPairs; pIdx++) {
        r++;
        const startRow = r;
        const lp = leftPosts[pIdx];
        const rp = rightPosts[pIdx];

        let leftRowsCount = 0;
        if (lp) {
          const pCands = candidates
            .filter(c => c.post === lp.post)
            .sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));

          // Post Title Banner
          ensureRow(startRow)[0] = lp.post.toUpperCase();
          merges.push({ s: { r: startRow, c: 0 }, e: { r: startRow, c: 2 } });

          // Candidates
          pCands.forEach((c, cIdx) => {
            const curR = startRow + 1 + cIdx;
            const row = ensureRow(curR);
            row[0] = cIdx + 1;
            row[1] = `${(c.candidateName || '').toUpperCase()}${c.candidateClass ? '\n(' + c.candidateClass + ')' : ''}`;
            row[2] = '[       ]';
          });

          // NOTA
          const notaR = startRow + 1 + pCands.length;
          const rowNota = ensureRow(notaR);
          rowNota[0] = pCands.length + 1;
          rowNota[1] = 'NOTA';
          rowNota[2] = '[       ]';

          leftRowsCount = 1 + pCands.length + 1;
        }

        let rightRowsCount = 0;
        if (rp) {
          const pCands = candidates
            .filter(c => c.post === rp.post)
            .sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));

          // Post Title Banner
          ensureRow(startRow)[4] = rp.post.toUpperCase();
          merges.push({ s: { r: startRow, c: 4 }, e: { r: startRow, c: 6 } });

          // Candidates
          pCands.forEach((c, cIdx) => {
            const curR = startRow + 1 + cIdx;
            const row = ensureRow(curR);
            row[4] = cIdx + 1;
            row[5] = `${(c.candidateName || '').toUpperCase()}${c.candidateClass ? '\n(' + c.candidateClass + ')' : ''}`;
            row[6] = '[       ]';
          });

          // NOTA
          const notaR = startRow + 1 + pCands.length;
          const rowNota = ensureRow(notaR);
          rowNota[4] = pCands.length + 1;
          rowNota[5] = 'NOTA';
          rowNota[6] = '[       ]';

          rightRowsCount = 1 + pCands.length + 1;
        }

        const pairHeight = Math.max(leftRowsCount, rightRowsCount);
        r = startRow + pairHeight;
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 },  // A: Sl. No.
      { wch: 38 }, // B: Candidate Name & Class
      { wch: 14 }, // C: Stamp Box
      { wch: 4 },  // D: Column Divider
      { wch: 8 },  // E: Sl. No.
      { wch: 38 }, // F: Candidate Name & Class
      { wch: 14 }  // G: Stamp Box
    ];
    ws['!merges'] = merges;
    return ws;
  };

  // Helper to build Single-Post Ballot Worksheet (Matches Year Rep & Association HTML Ballots)
  const buildSinglePostBallotWorksheet = (postList, prefix, sectionTitle) => {
    const sorted = [...postList].sort((a, b) => comparePosts(a, b));
    const rows = [];
    const merges = [];

    const ensureRow = (rIndex) => {
      while (rows.length <= rIndex) {
        rows.push(['', '', '']);
      }
      return rows[rIndex];
    };

    let r = -1;

    if (sorted.length === 0) {
      r++;
      ensureRow(r)[0] = collegeName.toUpperCase();
      merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
      r++;
      ensureRow(r)[0] = `COLLEGE UNION ELECTION ${year}`;
      merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
      r++;
      ensureRow(r)[0] = `${sectionTitle.toUpperCase()} BALLOTS (${prefix})`;
      merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
      r++;
      ensureRow(r)[0] = 'NO CONTESTED POSTS (All candidates elected unopposed or no valid nominations)';
      merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
    } else {
      sorted.forEach((p, pIdx) => {
        const pCands = candidates
          .filter(c => c.post === p.post)
          .sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));

        // 1. Counterfoil Section
        r++;
        ensureRow(r)[0] = collegeName.toUpperCase();
        merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });

        r++;
        ensureRow(r)[0] = `COLLEGE UNION ELECTION ${year}`;
        merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });

        r++;
        ensureRow(r)[0] = `OFFICIAL BALLOT (${prefix}) - COUNTERFOIL`;
        merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });

        r++;
        ensureRow(r)[0] = `SL.NO. ${prefix}____________`;
        ensureRow(r)[2] = `(To be detached)`;
        merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });

        r++;
        ensureRow(r)[0] = `Sl. No of Voter in Marked Copy: ____________`;
        merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });

        r++;
        ensureRow(r)[0] = `✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -`;
        merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });

        // 2. Ballot Paper Header Section
        r++;
        ensureRow(r)[0] = collegeName.toUpperCase();
        merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });

        r++;
        ensureRow(r)[0] = `COLLEGE UNION ELECTION ${year}`;
        merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });

        r++;
        ensureRow(r)[0] = `BALLOT PAPER (${prefix})`;
        merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });

        r++;
        ensureRow(r)[0] = `SL.NO. ${prefix}____________`;
        ensureRow(r)[2] = `PRO Sign`;
        merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });

        r++;
        ensureRow(r)[0] = `MARK THE VOTER'S CHOICE WITH THE MARKING SEAL IN THE SPACE PROVIDED`;
        merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });

        // 3. Post Box
        r++;
        ensureRow(r)[0] = p.post.toUpperCase();
        merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });

        // Candidates
        pCands.forEach((c, cIdx) => {
          r++;
          const row = ensureRow(r);
          row[0] = cIdx + 1;
          row[1] = `${(c.candidateName || '').toUpperCase()}${c.candidateClass ? '\n(' + c.candidateClass + ')' : ''}`;
          row[2] = '[       ]';
        });

        // NOTA
        r++;
        const rowNota = ensureRow(r);
        rowNota[0] = pCands.length + 1;
        rowNota[1] = 'NOTA';
        rowNota[2] = '[       ]';

        // Page break divider between consecutive ballots on the same sheet
        if (pIdx < sorted.length - 1) {
          r++;
          ensureRow(r); // Blank row
          r++;
          ensureRow(r)[0] = '═══════════════════════════════════════════════════════════════════════════════';
          merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
          r++;
          ensureRow(r)[0] = 'PAGE BREAK: NEXT BALLOT PAPER';
          merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
          r++;
          ensureRow(r)[0] = '═══════════════════════════════════════════════════════════════════════════════';
          merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
          r++;
          ensureRow(r); // Blank row
        }
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 },  // A: Sl. No.
      { wch: 48 }, // B: Candidate Name & Class
      { wch: 16 }  // C: Stamp Box
    ];
    ws['!merges'] = merges;
    return ws;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. GENERAL UNION BALLOTS (A3 2-Column Format)
  // ─────────────────────────────────────────────────────────────────────────────
  if (filterType === 'all' || filterType === 'general' || filterType.startsWith('general_part:')) {
    const gPosts = contestablePosts.filter(isGeneralPost);

    if (isSplit) {
      let partsToGenerate = currentConfig.ballots || [];
      if (filterType.startsWith('general_part:')) {
        const targetId = filterType.replace('general_part:', '');
        partsToGenerate = (currentConfig.ballots || []).filter(b => b.id === targetId);
      }

      partsToGenerate.forEach((partConfig, pIdx) => {
        const partPosts = gPosts.filter(p => (partConfig.posts || []).includes(p.post));
        const wsGen = buildGeneralBallotWorksheet(partConfig, partPosts);
        const sheetTitle = sanitizeSheetName(partConfig.title ? `${partConfig.title} Ballot` : `General Part ${pIdx + 1}`);
        XLSX.utils.book_append_sheet(wb, wsGen, sheetTitle);
      });
    } else {
      const singleConfig = {
        title: 'OFFICIAL BALLOT PAPER (GENERAL)',
        shortCode: 'G',
        paperSize: 'A3'
      };
      const wsGen = buildGeneralBallotWorksheet(singleConfig, gPosts);
      XLSX.utils.book_append_sheet(wb, wsGen, 'General Ballot');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. YEAR REPRESENTATIVE BALLOTS (A5 Single-Column Format)
  // ─────────────────────────────────────────────────────────────────────────────
  if (filterType === 'all' || filterType === 'year') {
    const yrPosts = contestablePosts.filter(isYearPost).sort((a, b) => {
      const rA = getCohortInfo(a.post).rank;
      const rB = getCohortInfo(b.post).rank;
      if (rA !== rB) return rA - rB;
      return comparePosts(a, b);
    });

    const wsYr = buildSinglePostBallotWorksheet(yrPosts, 'R', 'Year Representative');
    XLSX.utils.book_append_sheet(wb, wsYr, 'Year Rep Ballots');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SUBJECT ASSOCIATION BALLOTS (A5 Single-Column Format)
  // ─────────────────────────────────────────────────────────────────────────────
  if (filterType === 'all' || filterType === 'assoc') {
    const assocPosts = contestablePosts.filter(isAssocPost).sort((a, b) => {
      const nameA = String(a.post || '');
      const nameB = String(b.post || '');
      return nameA.localeCompare(nameB);
    });

    const wsAssoc = buildSinglePostBallotWorksheet(assocPosts, 'A', 'Subject Association');
    XLSX.utils.book_append_sheet(wb, wsAssoc, 'Association Ballots');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. PRINTING PRESS SERIAL & BOOKLET PACKAGING PLAN
  // ─────────────────────────────────────────────────────────────────────────────
  if (masterPlan && (filterType === 'all' || filterType === 'summary')) {
    const planRows = [
      [collegeName.toUpperCase()],
      [`COLLEGE UNION ELECTION ${year} — BALLOT SERIAL NUMBERS & PACKAGING PLAN`],
      [`Official Printing Press Specification & Booth Allocation Schedule`],
      [`Generated: ${new Date().toLocaleString('en-IN')}`],
      []
    ];

    const planHeaders = [
      'Ballot Series / Category',
      'Post / Description',
      'Booth No.',
      'Allotted Voters',
      'Serial From',
      'Serial To',
      'Booklet Breakdown',
      'Booklet IDs'
    ];
    planRows.push(planHeaders);

    let grandTotalVoters = 0;

    // General Union Parts
    if (masterPlan.isSplit && Array.isArray(masterPlan.generalParts)) {
      masterPlan.generalParts.forEach((part, pIdx) => {
        (part.results || []).forEach(s => {
          grandTotalVoters += (s.count || 0);
          planRows.push([
            `General Part ${pIdx + 1} (${part.shortCode})`,
            part.title,
            `Booth ${s.booth}`,
            s.count || 0,
            `${part.shortCode}-${s.start}`,
            `${part.shortCode}-${s.end}`,
            formatBooksText(s.books),
            s.bookIds || '–'
          ]);
        });
        planRows.push([
          `SUBTOTAL PART ${pIdx + 1}`,
          part.title,
          'All Booths',
          part.total || 0,
          `${part.shortCode}-1`,
          `${part.shortCode}-${part.total || 0}`,
          '—',
          '—'
        ]);
        planRows.push([]);
      });
    } else if (masterPlan.general) {
      (masterPlan.general.results || []).forEach(s => {
        grandTotalVoters += (s.count || 0);
        planRows.push([
          'General Union (G)',
          'General Union Posts (Main)',
          `Booth ${s.booth}`,
          s.count || 0,
          `G${s.start}`,
          `G${s.end}`,
          formatBooksText(s.books),
          s.bookIds || '–'
        ]);
      });
      planRows.push([
        'SUBTOTAL GENERAL',
        'All General Union Posts',
        'All Booths',
        masterPlan.general.total || 0,
        'G1',
        `G${masterPlan.general.total || 0}`,
        '—',
        '—'
      ]);
      planRows.push([]);
    }

    // Year Representatives
    if (masterPlan.reps && Array.isArray(masterPlan.reps.results)) {
      masterPlan.reps.results.forEach(s => {
        grandTotalVoters += (s.count || 0);
        planRows.push([
          'Year Representative (R)',
          s.post,
          `Booth ${s.booth}`,
          s.count || 0,
          `R${s.start}`,
          `R${s.end}`,
          formatBooksText(s.books),
          s.bookIds || '–'
        ]);
      });
      planRows.push([
        'SUBTOTAL YEAR REPS',
        'All Contested Cohorts',
        'All Contested Booths',
        masterPlan.reps.total || 0,
        'R1',
        `R${masterPlan.reps.total || 0}`,
        '—',
        '—'
      ]);
      planRows.push([]);
    }

    // Departmental Associations
    if (masterPlan.assocs && Array.isArray(masterPlan.assocs.results)) {
      const sortedAssocs = [...masterPlan.assocs.results].sort((a, b) => String(a.post || '').localeCompare(String(b.post || '')));
      sortedAssocs.forEach(s => {
        grandTotalVoters += (s.count || 0);
        planRows.push([
          'Association Secretary (A)',
          s.post,
          `Booth ${s.booth}`,
          s.count || 0,
          `A${s.start}`,
          `A${s.end}`,
          formatBooksText(s.books),
          s.bookIds || '–'
        ]);
      });
      planRows.push([
        'SUBTOTAL ASSOCIATIONS',
        'All Departments',
        'All Contested Booths',
        masterPlan.assocs.total || 0,
        'A1',
        `A${masterPlan.assocs.total || 0}`,
        '—',
        '—'
      ]);
      planRows.push([]);
    }

    // Grand Total Row
    planRows.push([
      'GRAND TOTAL BALLOTS ALLOTTED',
      'Combined Election Printing Schedule',
      'All Sections',
      grandTotalVoters,
      '—',
      '—',
      '—',
      '—'
    ]);

    const wsPlan = XLSX.utils.aoa_to_sheet(planRows);
    wsPlan['!cols'] = [
      { wch: 26 }, // Series
      { wch: 36 }, // Post
      { wch: 14 }, // Booth
      { wch: 16 }, // Allotted
      { wch: 16 }, // Sl From
      { wch: 16 }, // Sl To
      { wch: 40 }, // Booklet Breakdown
      { wch: 24 }  // Book IDs
    ];
    XLSX.utils.book_append_sheet(wb, wsPlan, 'Serial & Packaging Plan');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. POST-WISE ELECTION SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  if (filterType === 'all' || filterType === 'summary') {
    const summaryRows = [
      [collegeName.toUpperCase()],
      [`COLLEGE UNION ELECTION ${year} — POST-WISE BALLOT SUMMARY`],
      [`Total Election Posts: ${allPosts.length} | Contested Posts: ${contestablePosts.length}`],
      [],
      ['#', 'Post Name', 'Category', 'Contesting Candidates', 'Ballot Status', 'Paper Size', 'Series Code']
    ];

    allPosts.forEach((p, idx) => {
      const pCands = candidates.filter(c => c.post === p.post);
      let category = 'General Union';
      let paperSize = 'A3 (2-Column)';
      let seriesCode = isSplit ? (part2PostsSet.has(p.post) ? 'G2' : 'G1') : 'G';

      if (isAssocPost(p)) {
        category = 'Subject Association';
        paperSize = 'A5 Portrait';
        seriesCode = 'A';
      } else if (isYearPost(p)) {
        category = getCohortInfo(p.post).title;
        paperSize = 'A5 Portrait';
        seriesCode = 'R';
      }

      let status = 'CONTESTED (Ballot Paper Required)';
      if (pCands.length === 1) {
        status = 'ELECTED UNOPPOSED (Uncontested - No Ballot)';
      } else if (pCands.length === 0) {
        status = 'NO VALID NOMINATIONS';
      }

      summaryRows.push([
        idx + 1,
        p.post,
        category,
        pCands.length,
        status,
        paperSize,
        seriesCode
      ]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 6 },
      { wch: 38 },
      { wch: 24 },
      { wch: 22 },
      { wch: 42 },
      { wch: 16 },
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Post Election Summary');
  }

  // Determine appropriate filename
  let fileCategory = 'Official_Ballot_Papers';
  if (filterType === 'general') fileCategory = 'Ballot_Papers_General';
  else if (filterType.startsWith('general_part:')) {
    const pNum = filterType.replace('general_part:gen_', '');
    fileCategory = `Ballot_Papers_General_Part_${pNum}`;
  } else if (filterType === 'year') fileCategory = 'Ballot_Papers_Year_Reps';
  else if (filterType === 'assoc') fileCategory = 'Ballot_Papers_Associations';
  else if (filterType === 'summary') fileCategory = 'Ballot_Press_Packaging_Plan';

  const fileName = `${cleanShortName}_Election_${year}_${fileCategory}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

