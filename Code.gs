/**
 * ============================================================
 *  GVC College Union Election — Google Apps Script Backend
 *  File: Code.gs
 * ============================================================
 *
 *  SETUP INSTRUCTIONS:
 *  1. Create a new Google Sheet with 4 tabs:
 *     - "NominalRoll"  (columns: Nominal Roll Serial Number, NAME, CLASS, ADMISION NO, Dept)
 *     - "Nominations"  (leave blank — auto-initialized)
 *     - "Posts"        (leave blank — auto-initialized with defaults)
 *     - "Settings"     (leave blank — auto-initialized)
 *  2. In Google Apps Script (script.google.com), paste this entire file.
 *  3. IMPORTANT: Set SPREADSHEET_ID to your Google Sheet ID (the long string in the URL).
 *  4. Set ADMIN_PASSWORD to your desired password.
 *  5. Deploy → New Deployment → Web App:
 *       Execute as: Me | Who has access: Anyone
 *  6. Copy the URL into src/config.js → APPS_SCRIPT_URL
 * ============================================================
 */

// ─────────────────────────────────────────────────────────────
//  CONFIGURATION — UPDATE THESE
// ─────────────────────────────────────────────────────────────
const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; // <--- NOT the script URL!
const ADMIN_PASSWORD = 'YourSecurePasswordHere';

const SHEET_NOMINAL  = 'NominalRoll';
const SHEET_NOMS     = 'Nominations';
const SHEET_SETTINGS = 'Settings';
const SHEET_POSTS    = 'Posts';

const NOM_COLS = [
  'ID', 'Post', 'Gender', 'DOB',
  'CandidateSerial', 'ProposerSerial', 'SeconderSerial',
  'Status', 'WithdrawalStatus', 'Timestamp',
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
  // NOTE: Google Apps Script automatically handles CORS for public Web Apps.
  // Do NOT add manual Access-Control-Allow-Origin headers; they cause crashes.
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
    throw new Error('SPREADSHEET_ID is not configured in Code.gs');
  }
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureNomHeaders() {
  const s = getSheet(SHEET_NOMS);
  if (s.getLastRow() === 0) {
    s.appendRow(NOM_COLS);
    s.getRange(1, 1, 1, NOM_COLS.length).setFontWeight('bold');
  }
}

function ensureSettings() {
  const s = getSheet(SHEET_SETTINGS);
  if (s.getLastRow() === 0) {
    s.appendRow(['Key', 'Value']);
    s.appendRow(['validListPublished', 'false']);
    s.appendRow(['finalListPublished', 'false']);
  }
}

function ensurePostsSheet() {
  const s = getSheet(SHEET_POSTS);
  if (s.getLastRow() === 0) {
    s.appendRow(POST_COLS);
    s.getRange(1, 1, 1, POST_COLS.length).setFontWeight('bold');
    DEFAULT_POSTS.forEach(row => s.appendRow(row));
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
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getPostsData() {
  ensurePostsSheet();
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

function getAllNominations() {
  ensureNomHeaders();
  const s = getSheet(SHEET_NOMS);
  const v = s.getDataRange().getValues();
  if (v.length < 2) return [];
  return v.slice(1).map((row, idx) => ({
    _row:             idx + 2,
    id:               String(row[0]),
    post:             row[1],
    gender:           row[2],
    dob:              row[3],
    candidateSerial:  String(row[4]),
    proposerSerial:   String(row[5]),
    seconderSerial:   String(row[6]),
    status:           row[7],
    withdrawalStatus: row[8] || 'None',
    timestamp:        row[9],
  }));
}

function generateUniqueId(existingIds) {
  let id;
  do {
    id = String(Math.floor(1000000000 + Math.random() * 9000000000));
  } while (existingIds.has(id));
  return id;
}

function enrichNomination(nom, rollData) {
  const find = (serial) => rollData.find(s => String(s['Nominal Roll Serial Number']) === serial) || null;
  const candidate = find(nom.candidateSerial);
  const proposer  = find(nom.proposerSerial);
  const seconder  = find(nom.seconderSerial);
  return {
    ...nom,
    candidate,
    proposer,
    seconder,
    candidateName:  candidate?.NAME  || nom.candidateSerial,
    candidateClass: candidate?.CLASS || '',
    candidateDept:  candidate?.Dept  || '',
    proposerName:   proposer?.NAME   || nom.proposerSerial,
    seconderName:   seconder?.NAME   || nom.seconderSerial,
  };
}

function checkAdmin(pwd) {
  if (pwd !== ADMIN_PASSWORD) throw new Error('Invalid admin password.');
}

// ─────────────────────────────────────────────────────────────
//  doGet
// ─────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    ensureSettings();
    const action = e.parameter.action;

    if (action === 'getNominalRoll') {
      return jsonOut(getNominalRollData());
    }

    if (action === 'getPosts') {
      return jsonOut(getPostsData());
    }

    if (action === 'getNomination') {
      const id  = e.parameter.id;
      const nom = getAllNominations().find(n => n.id === id);
      if (!nom) return errOut(`No nomination found with ID: ${id}`);
      return jsonOut(enrichNomination(nom, getNominalRollData()));
    }

    if (action === 'getValidNominations') {
      if (getSetting('validListPublished') !== 'true')
        return errOut('The valid nominations list has not been published yet.');
      const roll = getNominalRollData();
      return jsonOut(getAllNominations().filter(n => n.status === 'Valid').map(n => enrichNomination(n, roll)));
    }

    if (action === 'getFinalNominations') {
      if (getSetting('finalListPublished') !== 'true')
        return errOut('The final nominations list has not been published yet.');
      const roll  = getNominalRollData();
      const valid = getAllNominations().filter(n => n.status === 'Valid');
      return jsonOut({
        active:    valid.filter(n => n.withdrawalStatus !== 'Approved').map(n => enrichNomination(n, roll)),
        withdrawn: valid.filter(n => n.withdrawalStatus === 'Approved').map(n => enrichNomination(n, roll)),
      });
    }

    if (action === 'adminGetNominations') {
      checkAdmin(e.parameter.password);
      const roll = getNominalRollData();
      return jsonOut(getAllNominations().map(n => enrichNomination(n, roll)));
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
    ensureSettings();
    ensureNomHeaders();
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'adminLogin') {
      checkAdmin(body.password);
      return jsonOut({ ok: true });
    }

    if (action === 'submitNomination') {
      const { post, gender, dob, candidateSerial, proposerSerial, seconderSerial } = body;
      if (!post || !gender || !dob || !candidateSerial || !proposerSerial || !seconderSerial)
        return errOut('Missing required nomination fields.');
      const roll     = getNominalRollData();
      const findS    = (s) => roll.find(r => String(r['Nominal Roll Serial Number']) === String(s));
      if (!findS(candidateSerial)) return errOut(`Candidate serial ${candidateSerial} not found in nominal roll.`);
      if (!findS(proposerSerial))  return errOut(`Proposer serial ${proposerSerial} not found in nominal roll.`);
      if (!findS(seconderSerial))  return errOut(`Seconder serial ${seconderSerial} not found in nominal roll.`);
      if (candidateSerial === proposerSerial) return errOut('Candidate and Proposer cannot be the same.');
      if (candidateSerial === seconderSerial) return errOut('Candidate and Seconder cannot be the same.');
      if (proposerSerial  === seconderSerial) return errOut('Proposer and Seconder cannot be the same.');
      const existingIds = new Set(getAllNominations().map(n => n.id));
      const id = generateUniqueId(existingIds);
      getSheet(SHEET_NOMS).appendRow([
        id, post, gender, dob,
        String(candidateSerial), String(proposerSerial), String(seconderSerial),
        'Pending', 'None', new Date().toISOString(),
      ]);
      return jsonOut({ ok: true, id });
    }

    if (action === 'submitWithdrawal') {
      const noms = getAllNominations();
      const nom  = noms.find(n => n.id === body.id);
      if (!nom) return errOut(`Nomination ${body.id} not found.`);
      if (nom.status !== 'Valid') return errOut(`Only Valid nominations can be withdrawn.`);
      if (nom.withdrawalStatus !== 'None') return errOut('A withdrawal has already been submitted.');
      getSheet(SHEET_NOMS).getRange(nom._row, 9).setValue('Requested');
      return jsonOut({ ok: true });
    }

    if (action === 'adminVerifyNomination') {
      checkAdmin(body.password);
      if (!['Valid','Rejected'].includes(body.status)) return errOut('Status must be Valid or Rejected.');
      const nom = getAllNominations().find(n => n.id === body.id);
      if (!nom) return errOut(`Nomination ${body.id} not found.`);
      getSheet(SHEET_NOMS).getRange(nom._row, 8).setValue(body.status);
      return jsonOut({ ok: true });
    }

    if (action === 'adminApproveWithdrawal') {
      checkAdmin(body.password);
      const nom = getAllNominations().find(n => n.id === body.id);
      if (!nom) return errOut(`Nomination ${body.id} not found.`);
      if (nom.withdrawalStatus !== 'Requested') return errOut('No withdrawal request pending.');
      getSheet(SHEET_NOMS).getRange(nom._row, 9).setValue('Approved');
      return jsonOut({ ok: true });
    }

    if (action === 'adminPublishValidList') {
      checkAdmin(body.password);
      setSetting('validListPublished', 'true');
      return jsonOut({ ok: true });
    }

    if (action === 'adminPublishFinalList') {
      checkAdmin(body.password);
      setSetting('finalListPublished', 'true');
      return jsonOut({ ok: true });
    }

    // ─── Posts Management ───────────────────────────────────

    if (action === 'adminAddPost') {
      checkAdmin(body.password);
      ensurePostsSheet();
      const { postName, yearRestriction, femaleOnly, finalYearIneligible, deptRestriction } = body;
      if (!postName) return errOut('Post name is required.');
      const existing = getPostsData();
      if (existing.find(p => p.post === postName)) return errOut(`Post "${postName}" already exists.`);
      getSheet(SHEET_POSTS).appendRow([postName, !!femaleOnly, !!finalYearIneligible, yearRestriction || '', !!deptRestriction]);
      return jsonOut({ ok: true });
    }

    if (action === 'adminUpdatePost') {
      checkAdmin(body.password);
      ensurePostsSheet();
      const { postName, originalName, yearRestriction, femaleOnly, finalYearIneligible, deptRestriction } = body;
      const s    = getSheet(SHEET_POSTS);
      const data = s.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === originalName) {
          s.getRange(i + 1, 1, 1, 5).setValues([[postName, !!femaleOnly, !!finalYearIneligible, yearRestriction || '', !!deptRestriction]]);
          return jsonOut({ ok: true });
        }
      }
      return errOut(`Post "${originalName}" not found.`);
    }

    if (action === 'adminDeletePost') {
      checkAdmin(body.password);
      const s    = getSheet(SHEET_POSTS);
      const data = s.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.postName) {
          s.deleteRow(i + 1);
          return jsonOut({ ok: true });
        }
      }
      return errOut(`Post "${body.postName}" not found.`);
    }

    return errOut(`Unknown action: ${action}`);
  } catch (err) {
    return errOut(err.message);
  }
}
