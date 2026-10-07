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

  // Helper to get candidates for a post sorted alphabetically
  const getSortedCandidates = (postName) => {
    return candidates
      .filter(c => c.post === postName)
      .sort((a, b) => String(a.candidateName || a.candidate?.NAME || '').localeCompare(String(b.candidateName || b.candidate?.NAME || '')));
  };

  // Helper to extract candidate metadata
  const getCandidateMeta = (c) => {
    const name = c.candidateName || c.candidate?.NAME || '–';
    const cls = c.candidateClass || c.candidate?.CLASS || '–';
    const adm = c.candidateAdmission || c.candidate?.['ADMISION NO'] || c.candidate?.['ADMISSION NO'] || c.admissionNo || '–';
    const sl = c.candidateSerial || c.candidate?.['Nominal Roll Serial Number'] || c.candidate?.serial_number || '–';
    return { name, cls, adm, sl };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SHEET 1: ALL CONTESTED BALLOTS (MASTER CANDIDATE ROSTER)
  // ─────────────────────────────────────────────────────────────────────────────
  if (filterType === 'all') {
    const allRows = [
      [collegeName.toUpperCase()],
      [`COLLEGE UNION ELECTION ${year} — OFFICIAL BALLOT PAPERS`],
      [`MASTER CANDIDATE ROSTER FOR ALL CONTESTED POSTS`],
      [`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`],
      [`Total Contested Posts: ${contestablePosts.length} | Notice: Mark voter's choice with the official stamping seal in the designated box.`],
      []
    ];

    if (contestablePosts.length === 0) {
      allRows.push(['NO CONTESTED POSTS REQUIRING PRINTED BALLOT PAPERS']);
      allRows.push(['All nominations were either uncontested (single candidate elected unopposed) or received no nominations.']);
    } else {
      contestablePosts.forEach((p, pIdx) => {
        const pCands = getSortedCandidates(p.post);
        let category = 'General Union';
        let paperFormat = 'A3 (2-Column)';
        let seriesCode = isSplit ? (part2PostsSet.has(p.post) ? 'G2' : 'G1') : 'G';

        if (isAssocPost(p)) {
          category = 'Subject Association';
          paperFormat = 'A5 Portrait';
          seriesCode = 'A';
        } else if (isYearPost(p)) {
          category = getCohortInfo(p.post).title;
          paperFormat = 'A5 Portrait';
          seriesCode = 'R';
        }

        // Post Banner
        allRows.push([`POST #${pIdx + 1}: ${p.post.toUpperCase()}`]);
        allRows.push([
          `Category: ${category}`,
          `Series: ${seriesCode}`,
          `Paper: ${paperFormat}`,
          `Contesting: ${pCands.length} Candidates + NOTA`
        ]);
        allRows.push(['Ballot Sl. No.', 'Candidate Name', 'Class / Department', 'Admission No.', 'Roll Sl. No.', 'Post Name', 'Voter Mark / Stamp Box']);

        // Candidates
        pCands.forEach((c, idx) => {
          const meta = getCandidateMeta(c);
          allRows.push([idx + 1, meta.name, meta.cls, meta.adm, meta.sl, p.post, '[   ]']);
        });

        // NOTA
        allRows.push([pCands.length + 1, 'NOTA (None of the Above)', 'Official Statutory Option', '–', '–', p.post, '[   ]']);
        allRows.push([]); // blank separator
      });
    }

    const wsAll = XLSX.utils.aoa_to_sheet(allRows);
    wsAll['!cols'] = [
      { wch: 15 }, // Ballot Sl. No.
      { wch: 32 }, // Candidate Name
      { wch: 24 }, // Class / Dept
      { wch: 16 }, // Admission No.
      { wch: 14 }, // Roll Sl. No.
      { wch: 34 }, // Post Name
      { wch: 24 }  // Stamp Box
    ];
    XLSX.utils.book_append_sheet(wb, wsAll, 'All Contested Ballots');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SHEET 2: GENERAL UNION BALLOTS
  // ─────────────────────────────────────────────────────────────────────────────
  if (filterType === 'all' || filterType === 'general' || filterType.startsWith('general_part:')) {
    let genPosts = contestablePosts.filter(isGeneralPost);

    if (filterType.startsWith('general_part:')) {
      const partId = filterType.replace('general_part:', '');
      const partCfg = (currentConfig?.ballots || []).find(b => b.id === partId);
      if (partCfg && Array.isArray(partCfg.posts)) {
        genPosts = genPosts.filter(p => partCfg.posts.includes(p.post));
      }
    }

    const genRows = [
      [collegeName.toUpperCase()],
      [`COLLEGE UNION ELECTION ${year} — GENERAL UNION BALLOT PAPERS`],
      [isSplit ? 'BALLOT CONFIGURATION: SPLIT (PART 1 & PART 2)' : 'BALLOT CONFIGURATION: SINGLE UNIFIED MASTER SHEET'],
      [`Total General Contested Posts: ${genPosts.length}`],
      []
    ];

    if (genPosts.length === 0) {
      genRows.push(['NO CONTESTED GENERAL UNION POSTS']);
    } else {
      genPosts.forEach((p, pIdx) => {
        const pCands = getSortedCandidates(p.post);
        const partLabel = isSplit 
          ? (part2PostsSet.has(p.post) ? 'Part 2 (G2 - Additional Ballot)' : 'Part 1 (G1 - Main Ballot)')
          : 'General Ballot (G)';

        genRows.push([`POST #${pIdx + 1}: ${p.post.toUpperCase()}`, `[${partLabel}]`]);
        genRows.push(['Ballot Sl. No.', 'Candidate Name', 'Class / Department', 'Admission No.', 'Roll Sl. No.', 'Ballot Part / Series', 'Voter Mark']);

        pCands.forEach((c, idx) => {
          const meta = getCandidateMeta(c);
          genRows.push([idx + 1, meta.name, meta.cls, meta.adm, meta.sl, partLabel, '[   ]']);
        });
        genRows.push([pCands.length + 1, 'NOTA (None of the Above)', 'Official Statutory Option', '–', '–', partLabel, '[   ]']);
        genRows.push([]);
      });
    }

    const wsGen = XLSX.utils.aoa_to_sheet(genRows);
    wsGen['!cols'] = [
      { wch: 15 }, // Sl No
      { wch: 32 }, // Candidate Name
      { wch: 24 }, // Class
      { wch: 16 }, // Adm No
      { wch: 14 }, // Roll Sl
      { wch: 30 }, // Part / Series
      { wch: 20 }  // Voter Mark
    ];
    XLSX.utils.book_append_sheet(wb, wsGen, 'General Ballots');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SHEET 3: YEAR REPRESENTATIVE BALLOTS
  // ─────────────────────────────────────────────────────────────────────────────
  if (filterType === 'all' || filterType === 'year') {
    const yrPosts = contestablePosts.filter(isYearPost).sort((a, b) => {
      const rA = getCohortInfo(a.post).rank;
      const rB = getCohortInfo(b.post).rank;
      if (rA !== rB) return rA - rB;
      return comparePosts(a, b);
    });

    const yrRows = [
      [collegeName.toUpperCase()],
      [`COLLEGE UNION ELECTION ${year} — YEAR REPRESENTATIVE BALLOT PAPERS`],
      [`Format: A5 Portrait | Series Code: R (R1, R2, R3...)`],
      [`Total Contested Year Rep Posts: ${yrPosts.length}`],
      []
    ];

    if (yrPosts.length === 0) {
      yrRows.push(['NO CONTESTED YEAR REPRESENTATIVE POSTS']);
    } else {
      yrPosts.forEach((p, pIdx) => {
        const pCands = getSortedCandidates(p.post);
        const cohort = getCohortInfo(p.post);

        yrRows.push([`POST #${pIdx + 1}: ${p.post.toUpperCase()}`, `[Cohort: ${cohort.title}]`]);
        yrRows.push(['Ballot Sl. No.', 'Candidate Name', 'Class / Batch', 'Admission No.', 'Roll Sl. No.', 'Cohort Group', 'Voter Mark']);

        pCands.forEach((c, idx) => {
          const meta = getCandidateMeta(c);
          yrRows.push([idx + 1, meta.name, meta.cls, meta.adm, meta.sl, cohort.short, '[   ]']);
        });
        yrRows.push([pCands.length + 1, 'NOTA (None of the Above)', 'Official Statutory Option', '–', '–', cohort.short, '[   ]']);
        yrRows.push([]);
      });
    }

    const wsYr = XLSX.utils.aoa_to_sheet(yrRows);
    wsYr['!cols'] = [
      { wch: 15 },
      { wch: 32 },
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 24 },
      { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, wsYr, 'Year Rep Ballots');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SHEET 4: SUBJECT ASSOCIATION BALLOTS
  // ─────────────────────────────────────────────────────────────────────────────
  if (filterType === 'all' || filterType === 'assoc') {
    const assocPosts = contestablePosts.filter(isAssocPost).sort((a, b) => {
      const nameA = String(a.post || '');
      const nameB = String(b.post || '');
      return nameA.localeCompare(nameB);
    });

    const assocRows = [
      [collegeName.toUpperCase()],
      [`COLLEGE UNION ELECTION ${year} — DEPARTMENTAL ASSOCIATION SECRETARY BALLOTS`],
      [`Format: A5 Portrait | Series Code: A (A1, A2, A3...)`],
      [`Total Contested Association Posts: ${assocPosts.length}`],
      []
    ];

    if (assocPosts.length === 0) {
      assocRows.push(['NO CONTESTED SUBJECT ASSOCIATION POSTS']);
    } else {
      assocPosts.forEach((p, pIdx) => {
        const pCands = getSortedCandidates(p.post);
        assocRows.push([`POST #${pIdx + 1}: ${p.post.toUpperCase()}`]);
        assocRows.push(['Ballot Sl. No.', 'Candidate Name', 'Class / Department', 'Admission No.', 'Roll Sl. No.', 'Association Post', 'Voter Mark']);

        pCands.forEach((c, idx) => {
          const meta = getCandidateMeta(c);
          assocRows.push([idx + 1, meta.name, meta.cls, meta.adm, meta.sl, p.post, '[   ]']);
        });
        assocRows.push([pCands.length + 1, 'NOTA (None of the Above)', 'Official Statutory Option', '–', '–', p.post, '[   ]']);
        assocRows.push([]);
      });
    }

    const wsAssoc = XLSX.utils.aoa_to_sheet(assocRows);
    wsAssoc['!cols'] = [
      { wch: 15 },
      { wch: 32 },
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 34 },
      { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, wsAssoc, 'Association Ballots');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SHEET 5: PRINTING PRESS SERIAL & BOOKLET PACKAGING PLAN
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

    // 1. General Union Parts
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

    // 2. Year Representatives
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

    // 3. Departmental Associations
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
  // SHEET 6: POST-WISE ELECTION SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  const summaryRows = [
    [collegeName.toUpperCase()],
    [`COLLEGE UNION ELECTION ${year} — POST-WISE BALLOT SUMMARY`],
    [`Total Election Posts: ${allPosts.length} | Contested Posts: ${contestablePosts.length}`],
    [],
    ['#', 'Post Name', 'Category', 'Contesting Candidates', 'Ballot Status', 'Paper Size', 'Series Code']
  ];

  allPosts.forEach((p, idx) => {
    const pCands = getSortedCandidates(p.post);
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
  return fileName;
}
