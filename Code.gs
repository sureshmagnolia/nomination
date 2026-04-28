/**
 * ============================================================
 *  GVC College Union Election — Google Apps Script Backend
 *  File: Code.gs
 * ============================================================
 */

// ─────────────────────────────────────────────────────────────
//  CONFIGURATION — UPDATE THESE
// ─────────────────────────────────────────────────────────────
const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; 
const ADMIN_PASSWORD = '678001alliswell$';

const SHEET_NOMINAL  = 'NominalRoll';
const SHEET_NOMS     = 'Nominations'; // All submissions
const SHEET_VALID    = 'ValidList';   // Verified by admin
const SHEET_FINAL    = 'FinalList';   // Published after withdrawals
const SHEET_SETTINGS = 'Settings';
const SHEET_POSTS    = 'Posts';

// Expanded columns to store full details of candidate, proposer, and seconder
const NOM_COLS = [
  'ID', 'Post', 'Gender', 'DOB', 'Timestamp',
  'CandidateSerial', 'CandidateName', 'CandidateClass', 'CandidateAdmission', 'CandidateDept',
  'ProposerSerial',  'ProposerName',  'ProposerClass',  'ProposerAdmission',  'ProposerDept',
  'SeconderSerial',  'SeconderName',  'SeconderClass',  'SeconderAdmission',  'SeconderDept',
  'Status', 'WithdrawalStatus'
];

const POST_COLS = [
  'Post', 'FemaleOnly', 'FinalYearIneligible', 'YearRestriction', 'DeptRestriction',
];

const DEFAULT_POSTS = [
  ['The Chairman',                          false, false, '',   false],
  ['The Vice Chairman',                     true,  false, '',   false],
  ['The Secretary',                         false, false, '',   false],
  ['The Joint Secretary',                   true,  false, '',   false],
  ['The Chief Student Editor',              false, true,  '',   false],
  ['The Secretary Fine Arts',               false, false, '',   false],
  ['The General Captain For Sports And Games', false, false, '', false],
  ['The University Union Councillor',       false, false, '',   false],
  ['I UG Representative',                   false, false, '1',  false],
  ['II UG Representative',                  false, false, '2',  false],
  ['III UG Representative',                 false, false, '3',  false],
  ['PG Representative',                     false, false, 'PG', false],
  ['Association Secretary Botany',          false, false, '',   true],
  ['Association Secretary Chemistry',       false, false, '',   true],
  ['Association Secretary Commerce',        false, false, '',   true],
  ['Association Secretary Computer Science',false, false, '',   true],
  ['Association Secretary Economics',       false, false, '',   true],
  ['Association Secretary English',         false, false, '',   true],
  ['Association Secretary Hindi',           false, false, '',   true],
  ['Association Secretary History',         false, false, '',   true],
  ['Association Secretary Malayalam',       false, false, '',   true],
  ['Association Secretary Mathematics',     false, false, '',   true],
  ['Association Secretary Physics',         false, false, '',   true],
  ['Association Secretary Psychology',      false, false, '',   true],
  ['Association Secretary Sanskrit',        false, false, '',   true],
  ['Association Secretary Tamil',           false, false, '',   true],
  ['Association Secretary Zoology',         false, false, '',   true],
];

// ─────────────────────────────────────────────────────────────
//  OUTPUT HELPERS
// ─────────────────────────────────────────────────────────────
function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
function errOut(msg) { return jsonOut({ error: msg }); }

// ─────────────────────────────────────────────────────────────
//  SHEET HELPERS
// ─────────────────────────────────────────────────────────────
function getSheet(name) {
  if (SPREADSHEET_ID === 'YOUR_GOOGLE_SHEET_ID_HERE') {
    throw new Error('SPREADSHEET_ID is not configured in Code.gs. Please put your Google Sheet ID.');
  }
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureSheet(name, headers) {
  const s = getSheet(name);
  if (s.getLastRow() === 0) {
    s.appendRow(headers);
    s.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
}

function ensureAll() {
  ensureSheet(SHEET_NOMS, NOM_COLS);
  ensureSheet(SHEET_VALID, NOM_COLS);
  ensureSheet(SHEET_FINAL, NOM_COLS);
  ensureSheet(SHEET_POSTS, POST_COLS);
  ensureSheet(SHEET_SETTINGS, ['Key', 'Value']);
  
  const s = getSheet(SHEET_SETTINGS);
  if (s.getLastRow() <= 1) {
    s.appendRow(['validListPublished', 'false']);
    s.appendRow(['finalListPublished', 'false']);
  }
  
  const ps = getSheet(SHEET_POSTS);
  if (ps.getLastRow() <= 1) {
    DEFAULT_POSTS.forEach(row => ps.appendRow(row));
  }
}

function getSetting(key) {
  const data = getSheet(SHEET_SETTINGS).getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return String(data[i][1]);
  }
  return null;
}

function setSetting(key, value) {
  const s    = getSheet(SHEET_SETTINGS);
  const data = s.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) { s.getRange(i + 1, 2).setValue(value); return; }
  }
  s.appendRow([key, value]);
}

function getNominalRollData() {
  const s = getSheet(SHEET_NOMINAL);
  const v = s.getDataRange().getValues();
  if (v.length < 2) return [];
  const headers = v[0];
  return v.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = row[i]);
    return obj;
  });
}

function getAllNominations(sheetName = SHEET_NOMS) {
  const s = getSheet(sheetName);
  const v = s.getDataRange().getValues();
  if (v.length < 2) return [];
  return v.slice(1).map((row, idx) => {
    const nom = {
      _row:             idx + 2,
      id:               String(row[0]),
      post:             row[1],
      gender:           row[2],
      dob:              row[3],
      timestamp:        row[4],
      candidateSerial:  String(row[5]),
      proposerSerial:   String(row[10]),
      seconderSerial:   String(row[15]),
      status:           row[20],
      withdrawalStatus: row[21] || 'None',
    };
    
    // Reconstruct objects for frontend compatibility
    nom.candidate = {
      'Nominal Roll Serial Number': nom.candidateSerial,
      'NAME': row[6], 'CLASS': row[7], 'ADMISION NO': row[8], 'Dept': row[9]
    };
    nom.proposer = {
      'Nominal Roll Serial Number': nom.proposerSerial,
      'NAME': row[11], 'CLASS': row[12], 'ADMISION NO': row[13], 'Dept': row[14]
    };
    nom.seconder = {
      'Nominal Roll Serial Number': nom.seconderSerial,
      'NAME': row[16], 'CLASS': row[17], 'ADMISION NO': row[18], 'Dept': row[19]
    };

    // Add convenience fields
    nom.candidateName  = nom.candidate.NAME;
    nom.candidateClass = nom.candidate.CLASS;
    nom.candidateDept  = nom.candidate.Dept;
    nom.proposerName   = nom.proposer.NAME;
    nom.seconderName   = nom.seconder.NAME;
    
    return nom;
  });
}

function getPostsData() {
  const s = getSheet(SHEET_POSTS);
  const v = s.getDataRange().getValues();
  if (v.length < 2) return [];
  return v.slice(1).map(row => ({
    post:               String(row[0]),
    femaleOnly:         row[1] === true || String(row[1]).toLowerCase() === 'true',
    finalYearIneligible:row[2] === true || String(row[2]).toLowerCase() === 'true',
    yearRestriction:    String(row[3] || ''),
    deptRestriction:    row[4] === true || String(row[4]).toLowerCase() === 'true',
  }));
}

function checkAdmin(pwd) {
  if (pwd !== ADMIN_PASSWORD) throw new Error('Invalid admin password.');
}

// ─────────────────────────────────────────────────────────────
//  doGet
// ─────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    ensureAll();
    const action = e.parameter.action;

    if (action === 'getNominalRoll') return jsonOut(getNominalRollData());
    if (action === 'getPosts') return jsonOut(getPostsData());

    if (action === 'getNomination') {
      const id  = e.parameter.id;
      const nom = getAllNominations().find(n => n.id === id);
      return nom ? jsonOut(nom) : errOut(`No nomination found with ID: ${id}`);
    }

    if (action === 'getValidNominations') {
      if (getSetting('validListPublished') !== 'true') return errOut('Valid list not published.');
      return jsonOut(getAllNominations(SHEET_VALID));
    }

    if (action === 'getFinalNominations') {
      if (getSetting('finalListPublished') !== 'true') return errOut('Final list not published.');
      const all = getAllNominations(SHEET_FINAL);
      return jsonOut({
        active:    all.filter(n => n.withdrawalStatus !== 'Approved'),
        withdrawn: all.filter(n => n.withdrawalStatus === 'Approved'),
      });
    }

    if (action === 'adminGetNominations') {
      checkAdmin(e.parameter.password);
      return jsonOut(getAllNominations());
    }

    if (action === 'adminGetSettings') {
      checkAdmin(e.parameter.password);
      return jsonOut({
        validListPublished: getSetting('validListPublished'),
        finalListPublished: getSetting('finalListPublished'),
      });
    }

    if (action === 'adminGetPosts') {
      checkAdmin(e.parameter.password);
      return jsonOut(getPostsData());
    }

    return errOut(`Unknown action: ${action}`);
  } catch (err) {
    return errOut(err.message);
  }
}

// ─────────────────────────────────────────────────────────────
//  doPost
// ─────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    ensureAll();
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'adminLogin') {
      checkAdmin(body.password);
      return jsonOut({ ok: true });
    }

    if (action === 'submitNomination') {
      const { post, gender, dob, candidateSerial, proposerSerial, seconderSerial } = body;
      const roll = getNominalRollData();
      const findS = (s) => roll.find(r => String(r['Nominal Roll Serial Number']) === String(s));
      
      const c = findS(candidateSerial);
      const p = findS(proposerSerial);
      const s = findS(seconderSerial);

      if (!c || !p || !s) return errOut('Candidate/Proposer/Seconder serial not found.');

      const existingIds = new Set(getAllNominations().map(n => n.id));
      let id; do { id = String(Math.floor(1000000000 + Math.random() * 9000000000)); } while (existingIds.has(id));

      const getAdm = (st) => st['ADMISION NO'] || st['ADMISSION NO'] || 'N/A';

      const row = [
        id, post, gender, dob, new Date().toISOString(),
        String(candidateSerial), c.NAME, c.CLASS, getAdm(c), c.Dept || 'N/A',
        String(proposerSerial),  p.NAME, p.CLASS, getAdm(p), p.Dept || 'N/A',
        String(seconderSerial),  s.NAME, s.CLASS, getAdm(s), s.Dept || 'N/A',
        'Pending', 'None'
      ];
      
      getSheet(SHEET_NOMS).appendRow(row);
      return jsonOut({ ok: true, id });
    }

    if (action === 'submitWithdrawal') {
      const nom = getAllNominations().find(n => n.id === body.id);
      if (!nom || nom.status !== 'Valid') return errOut(`Invalid nomination status.`);
      getSheet(SHEET_NOMS).getRange(nom._row, 22).setValue('Requested');
      return jsonOut({ ok: true });
    }

    if (action === 'adminVerifyNomination') {
      checkAdmin(body.password);
      const nom = getAllNominations().find(n => n.id === body.id);
      if (!nom) return errOut(`Not found.`);
      getSheet(SHEET_NOMS).getRange(nom._row, 21).setValue(body.status);
      return jsonOut({ ok: true });
    }

    if (action === 'adminApproveWithdrawal') {
      checkAdmin(body.password);
      const nom = getAllNominations().find(n => n.id === body.id);
      if (!nom) return errOut(`Not found.`);
      getSheet(SHEET_NOMS).getRange(nom._row, 22).setValue('Approved');
      return jsonOut({ ok: true });
    }

    if (action === 'adminPublishValidList') {
      checkAdmin(body.password);
      const validNoms = getAllNominations().filter(n => n.status === 'Valid');
      const sValid = getSheet(SHEET_VALID);
      sValid.clear();
      sValid.appendRow(NOM_COLS);
      validNoms.forEach(n => {
        const row = [
          n.id, n.post, n.gender, n.dob, n.timestamp,
          n.candidateSerial, n.candidateName, n.candidateClass, n.candidateAdmission, n.candidateDept,
          n.proposerSerial,  n.proposerName,  n.proposerClass,  n.proposerAdmission,  n.proposerDept,
          n.seconderSerial,  n.seconderName,  n.seconderClass,  n.seconderAdmission,  n.seconderDept,
          n.status, n.withdrawalStatus
        ];
        sValid.appendRow(row);
      });
      setSetting('validListPublished', 'true');
      return jsonOut({ ok: true });
    }

    if (action === 'adminPublishFinalList') {
      checkAdmin(body.password);
      const finalNoms = getAllNominations().filter(n => n.status === 'Valid');
      const sFinal = getSheet(SHEET_FINAL);
      sFinal.clear();
      sFinal.appendRow(NOM_COLS);
      finalNoms.forEach(n => {
        const row = [
          n.id, n.post, n.gender, n.dob, n.timestamp,
          n.candidateSerial, n.candidateName, n.candidateClass, n.candidateAdmission, n.candidateDept,
          n.proposerSerial,  n.proposerName,  n.proposerClass,  n.proposerAdmission,  n.proposerDept,
          n.seconderSerial,  n.seconderName,  n.seconderClass,  n.seconderAdmission,  n.seconderDept,
          n.status, n.withdrawalStatus
        ];
        sFinal.appendRow(row);
      });
      setSetting('finalListPublished', 'true');
      return jsonOut({ ok: true });
    }

    if (action === 'adminDeletePost') {
      checkAdmin(body.password);
      const s = getSheet(SHEET_POSTS);
      const d = s.getDataRange().getValues();
      for (let i = 1; i < d.length; i++) {
        if (d[i][0] === body.postName) { s.deleteRow(i + 1); return jsonOut({ ok: true }); }
      }
      return errOut('Post not found.');
    }

    return errOut(`Unknown action: ${action}`);
  } catch (err) {
    return errOut(err.message);
  }
}
