/**
 * ============================================================
 *  GVC College Union Election — Google Apps Script Backend
 *  File: Code.gs
 * ============================================================
 *
 *  SETUP INSTRUCTIONS:
 *  1. Create a new Google Sheet with 3 tabs:
 *     - "NominalRoll"   (columns: Nominal Roll Serial Number, NAME, CLASS, ADMISION NO, Dept)
 *     - "Nominations"   (leave blank — script creates headers automatically)
 *     - "Settings"      (leave blank — script initializes on first run)
 *  2. In Google Apps Script (script.google.com), paste this entire code.
 *  3. Update SPREADSHEET_ID below to your Google Sheet's ID.
 *  4. Update ADMIN_PASSWORD to your desired admin password.
 *  5. Deploy → New Deployment → Web App:
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  6. Copy the resulting URL into src/config.js → APPS_SCRIPT_URL
 * ============================================================
 */

// ─────────────────────────────────────────────────────────────
//  CONFIGURATION — EDIT THESE
// ─────────────────────────────────────────────────────────────
const SPREADSHEET_ID  = 'YOUR_GOOGLE_SHEET_ID_HERE';
const ADMIN_PASSWORD  = 'YourSecurePasswordHere';

// Sheet (tab) names
const SHEET_NOMINAL   = 'NominalRoll';
const SHEET_NOMS      = 'Nominations';
const SHEET_SETTINGS  = 'Settings';

// Nomination columns (order matters — matches what we write/read)
const NOM_COLS = [
  'ID',              // A - 10-digit unique ID
  'Post',            // B
  'Gender',          // C
  'DOB',             // D
  'CandidateSerial', // E
  'ProposerSerial',  // F
  'SeconderSerial',  // G
  'Status',          // H - Pending / Valid / Rejected
  'WithdrawalStatus',// I - None / Requested / Approved
  'Timestamp',       // J
];


// ─────────────────────────────────────────────────────────────
//  CORS HELPER
// ─────────────────────────────────────────────────────────────
function cors(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON)
    .addHeader('Access-Control-Allow-Origin', '*')
    .addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .addHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function jsonOut(data) {
  return cors(ContentService.createTextOutput(JSON.stringify(data)));
}

function errOut(msg) {
  return jsonOut({ error: msg });
}


// ─────────────────────────────────────────────────────────────
//  SHEET HELPERS
// ─────────────────────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function ensureNomHeaders() {
  const sheet = getSheet(SHEET_NOMS);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(NOM_COLS);
    sheet.getRange(1, 1, 1, NOM_COLS.length).setFontWeight('bold');
  }
}

function ensureSettings() {
  const sheet = getSheet(SHEET_SETTINGS);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Key', 'Value']);
    sheet.appendRow(['validListPublished', 'false']);
    sheet.appendRow(['finalListPublished', 'false']);
  }
}

function getSetting(key) {
  const sheet = getSheet(SHEET_SETTINGS);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return String(data[i][1]);
  }
  return null;
}

function setSetting(key, value) {
  const sheet = getSheet(SHEET_SETTINGS);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function getNominalRollData() {
  const sheet = getSheet(SHEET_NOMINAL);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getAllNominations() {
  ensureNomHeaders();
  const sheet  = getSheet(SHEET_NOMS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  return values.slice(1).map((row, idx) => ({
    _row: idx + 2, // 1-indexed sheet row
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
    // 10-digit random number (1000000000 – 9999999999)
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


// ─────────────────────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────────────────────
function checkAdmin(pwd) {
  if (pwd !== ADMIN_PASSWORD) throw new Error('Invalid admin password.');
}


// ─────────────────────────────────────────────────────────────
//  doGet — Handle GET requests
// ─────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    ensureSettings();
    const action = e.parameter.action;

    // ── getNominalRoll ──────────────────────────────────────
    if (action === 'getNominalRoll') {
      return jsonOut(getNominalRollData());
    }

    // ── getNomination ───────────────────────────────────────
    if (action === 'getNomination') {
      const id   = e.parameter.id;
      const noms = getAllNominations();
      const nom  = noms.find(n => n.id === id);
      if (!nom) return errOut(`No nomination found with ID: ${id}`);
      const roll = getNominalRollData();
      return jsonOut(enrichNomination(nom, roll));
    }

    // ── getValidNominations (public — checks publish flag) ──
    if (action === 'getValidNominations') {
      if (getSetting('validListPublished') !== 'true') {
        return errOut('The valid nominations list has not been published yet. Please check back later.');
      }
      const roll = getNominalRollData();
      const noms = getAllNominations().filter(n => n.status === 'Valid');
      return jsonOut(noms.map(n => enrichNomination(n, roll)));
    }

    // ── getFinalNominations (public — checks publish flag) ──
    if (action === 'getFinalNominations') {
      if (getSetting('finalListPublished') !== 'true') {
        return errOut('The final nominations list has not been published yet. Please check back later.');
      }
      const roll = getNominalRollData();
      const validNoms = getAllNominations().filter(n => n.status === 'Valid');
      const active    = validNoms.filter(n => n.withdrawalStatus !== 'Approved').map(n => enrichNomination(n, roll));
      const withdrawn = validNoms.filter(n => n.withdrawalStatus === 'Approved').map(n => enrichNomination(n, roll));
      return jsonOut({ active, withdrawn });
    }

    // ── adminGetNominations ─────────────────────────────────
    if (action === 'adminGetNominations') {
      checkAdmin(e.parameter.password);
      const roll = getNominalRollData();
      return jsonOut(getAllNominations().map(n => enrichNomination(n, roll)));
    }

    // ── adminGetSettings ────────────────────────────────────
    if (action === 'adminGetSettings') {
      checkAdmin(e.parameter.password);
      return jsonOut({
        validListPublished: getSetting('validListPublished'),
        finalListPublished: getSetting('finalListPublished'),
      });
    }

    return errOut(`Unknown action: ${action}`);
  } catch (err) {
    return errOut(err.message);
  }
}


// ─────────────────────────────────────────────────────────────
//  doPost — Handle POST requests
// ─────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    ensureSettings();
    ensureNomHeaders();

    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    // ── adminLogin ──────────────────────────────────────────
    if (action === 'adminLogin') {
      checkAdmin(body.password);
      return jsonOut({ ok: true });
    }

    // ── submitNomination ────────────────────────────────────
    if (action === 'submitNomination') {
      const { post, gender, dob, candidateSerial, proposerSerial, seconderSerial } = body;
      if (!post || !gender || !dob || !candidateSerial || !proposerSerial || !seconderSerial) {
        return errOut('Missing required nomination fields.');
      }
      // Validate serials against nominal roll
      const roll = getNominalRollData();
      const findStudent = (s) => roll.find(r => String(r['Nominal Roll Serial Number']) === String(s));
      if (!findStudent(candidateSerial)) return errOut(`Candidate serial ${candidateSerial} not found in nominal roll.`);
      if (!findStudent(proposerSerial))  return errOut(`Proposer serial ${proposerSerial} not found in nominal roll.`);
      if (!findStudent(seconderSerial))  return errOut(`Seconder serial ${seconderSerial} not found in nominal roll.`);

      // Uniqueness check
      if (candidateSerial === proposerSerial) return errOut('Candidate and Proposer cannot be the same.');
      if (candidateSerial === seconderSerial) return errOut('Candidate and Seconder cannot be the same.');
      if (proposerSerial  === seconderSerial) return errOut('Proposer and Seconder cannot be the same.');

      const existingNoms = getAllNominations();
      const existingIds  = new Set(existingNoms.map(n => n.id));
      const id = generateUniqueId(existingIds);

      getSheet(SHEET_NOMS).appendRow([
        id, post, gender, dob,
        String(candidateSerial), String(proposerSerial), String(seconderSerial),
        'Pending', 'None', new Date().toISOString(),
      ]);

      return jsonOut({ ok: true, id });
    }

    // ── submitWithdrawal ────────────────────────────────────
    if (action === 'submitWithdrawal') {
      const id   = body.id;
      const noms = getAllNominations();
      const nom  = noms.find(n => n.id === id);
      if (!nom) return errOut(`Nomination ${id} not found.`);
      if (nom.status !== 'Valid') return errOut(`Only Valid nominations can be withdrawn (current status: ${nom.status}).`);
      if (nom.withdrawalStatus !== 'None') return errOut(`A withdrawal has already been submitted for this nomination.`);

      getSheet(SHEET_NOMS).getRange(nom._row, 9).setValue('Requested');
      return jsonOut({ ok: true });
    }

    // ── adminVerifyNomination ───────────────────────────────
    if (action === 'adminVerifyNomination') {
      checkAdmin(body.password);
      const { id, status } = body;
      if (!['Valid','Rejected'].includes(status)) return errOut('Status must be Valid or Rejected.');
      const noms = getAllNominations();
      const nom  = noms.find(n => n.id === id);
      if (!nom) return errOut(`Nomination ${id} not found.`);
      getSheet(SHEET_NOMS).getRange(nom._row, 8).setValue(status);
      return jsonOut({ ok: true });
    }

    // ── adminApproveWithdrawal ──────────────────────────────
    if (action === 'adminApproveWithdrawal') {
      checkAdmin(body.password);
      const { id } = body;
      const noms = getAllNominations();
      const nom  = noms.find(n => n.id === id);
      if (!nom) return errOut(`Nomination ${id} not found.`);
      if (nom.withdrawalStatus !== 'Requested') return errOut(`No withdrawal request pending for nomination ${id}.`);
      getSheet(SHEET_NOMS).getRange(nom._row, 9).setValue('Approved');
      return jsonOut({ ok: true });
    }

    // ── adminPublishValidList ───────────────────────────────
    if (action === 'adminPublishValidList') {
      checkAdmin(body.password);
      setSetting('validListPublished', 'true');
      return jsonOut({ ok: true });
    }

    // ── adminPublishFinalList ───────────────────────────────
    if (action === 'adminPublishFinalList') {
      checkAdmin(body.password);
      setSetting('finalListPublished', 'true');
      return jsonOut({ ok: true });
    }

    return errOut(`Unknown action: ${action}`);
  } catch (err) {
    return errOut(err.message);
  }
}
