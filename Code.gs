/**
 * Code.gs
 * Google Apps Script backend for the College Union Election Management System.
 * 
 * Features:
 * - Dynamic post configuration and validation.
 * - Nominal roll lookups with serial number.
 * - Nomination submission with unique ID generation.
 * - Scrutiny (Valid/Rejected) and Withdrawal management.
 * - Polling booth and counting table matrix generation.
 * - Result entry and live updates.
 * - Secure admin operations via password.
 */

const SHEET_ROLL      = 'NominalRoll';
const SHEET_POSTS     = 'Posts';
const SHEET_NOMS      = 'Nominations';
const SHEET_VALID     = 'ValidList';
const SHEET_FINAL     = 'FinalList';
const SHEET_BOOTHS    = 'Booths';
const SHEET_LOCATIONS = 'Locations';
const SHEET_RESULTS   = 'Results';
const SHEET_SETTINGS  = 'Settings';
const SHEET_MATRIX    = 'CountingMatrix';

const NOM_COLS = [
  'ID', 'Post', 'Gender', 'DOB', 'Timestamp',
  'Candidate Serial', 'Candidate Name', 'Candidate Class', 'Candidate Admission', 'Candidate Dept',
  'Proposer Serial',  'Proposer Name',  'Proposer Class',  'Proposer Admission',  'Proposer Dept',
  'Seconder Serial',  'Seconder Name',  'Seconder Class',  'Seconder Admission',  'Seconder Dept',
  'Status', 'Withdrawal Status'
];

function doGet(e) {
  try {
    ensureAll();
    const action = e.parameter.action;

    if (action === 'getPublicNominations') {
      const all = getAllNominations().filter(n => n.status !== 'Rejected');
      return jsonOut(all.map(n => ({
        post: n.post,
        proposerSerial: n.proposerSerial,
        seconderSerial: n.seconderSerial,
        status: n.status
      })));
    }

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
      return jsonOut(getAllNominations(SHEET_FINAL));
    }

    if (action === 'getResults') {
      const s = getSheet(SHEET_RESULTS);
      const d = s.getDataRange().getValues();
      if (d.length < 2) return jsonOut([]);
      const headers = d[0];
      return jsonOut(d.slice(1).map(r => {
        let obj = {};
        headers.forEach((h, i) => obj[h] = r[i]);
        return obj;
      }));
    }

    if (action === 'getPublicSchedule') {
      return jsonOut({
        nominationDeadline: getSetting('nominationDeadline'),
        withdrawalStart: getSetting('withdrawalStart'),
        withdrawalEnd: getSetting('withdrawalEnd'),
        notificationDate: getSetting('notificationDate') || '2026-04-20'
      });
    }

    if (action === 'getSettings') {
      const s = getSheet(SHEET_SETTINGS);
      const d = s.getDataRange().getValues();
      const obj = {};
      d.forEach(r => { if (r[0]) obj[r[0]] = r[1]; });
      return jsonOut(obj);
    }

    if (action === 'adminGetCountingMatrix') {
      checkAdmin(e.parameter.password);
      const s = getSheet(SHEET_MATRIX);
      const d = s.getDataRange().getValues();
      if (d.length < 2) return jsonOut(null);
      return jsonOut(JSON.parse(d[1][0]));
    }

    return errOut(`Unknown action: ${action}`);
  } catch (err) {
    return errOut(err.message);
  }
}

function doPost(e) {
  try {
    ensureAll();
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'adminSaveSchedule') {
      checkAdmin(body.password);
      setSetting('nominationDeadline', body.nominationDeadline);
      setSetting('withdrawalStart', body.withdrawalStart);
      setSetting('withdrawalEnd', body.withdrawalEnd);
      setSetting('notificationDate', body.notificationDate);
      return jsonOut({ ok: true });
    }

    if (action === 'adminLogin') {
      checkAdmin(body.password);
      return jsonOut({ ok: true });
    }

    if (action === 'submitNomination') {
      let isAdmin = false;
      if (body.password) { try { checkAdmin(body.password); isAdmin = true; } catch(e) {} }

      const deadline = getSetting('nominationDeadline');
      if (!isAdmin && deadline && new Date() > new Date(deadline)) return errOut('Nomination filing period has ended.');
      
      const { post, gender, dob, candidateSerial, proposerSerial, seconderSerial } = body;
      const roll = getNominalRollData();
      const findS = (s) => roll.find(r => String(r['Nominal Roll Serial Number']) === String(s));
      
      const c = findS(candidateSerial);
      const p = findS(proposerSerial);
      const st = findS(seconderSerial);

      if (!c || !p || !st) return errOut('Candidate/Proposer/Seconder serial not found.');

      const existingIds = new Set(getAllNominations().map(n => n.id));
      let id; do { id = String(Math.floor(1000000000 + Math.random() * 9000000000)); } while (existingIds.has(id));

      const getAdm = (s) => s['ADMISION NO'] || s['ADMISSION NO'] || 'N/A';
      const row = [
        id, post, gender, dob, new Date().toISOString(),
        candidateSerial, c['NAME'], c['CLASS'], getAdm(c), c['Dept'] || 'None',
        proposerSerial,  p['NAME'], p['CLASS'], getAdm(p), p['Dept'] || 'None',
        seconderSerial,  st['NAME'], st['CLASS'], getAdm(st), st['Dept'] || 'None',
        'Pending', 'None'
      ];
      
      getSheet(SHEET_NOMS).appendRow(row);
      return jsonOut({ ok: true, id });
    }

    if (action === 'submitWithdrawal') {
      let isAdmin = false;
      if (body.password) { try { checkAdmin(body.password); isAdmin = true; } catch(e) {} }

      const start = getSetting('withdrawalStart');
      const end = getSetting('withdrawalEnd');
      const now = new Date();
      if (!isAdmin) {
        if (start && now < new Date(start)) return errOut('Withdrawal window has not opened yet.');
        if (end && now > new Date(end)) return errOut('Withdrawal window has closed.');
      }

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

    if (action === 'adminAddPost') {
      checkAdmin(body.password);
      const s = getSheet(SHEET_POSTS);
      s.appendRow([body.post, body.femaleOnly, body.finalYearIneligible, body.yearRestriction, body.deptRestriction]);
      return jsonOut({ ok: true });
    }

    if (action === 'adminUpdatePost') {
      checkAdmin(body.password);
      const s = getSheet(SHEET_POSTS);
      const d = s.getDataRange().getValues();
      for (let i = 1; i < d.length; i++) {
        if (d[i][0] === body.post) {
          s.getRange(i + 1, 1, 1, 5).setValues([[body.post, body.femaleOnly, body.finalYearIneligible, body.yearRestriction, body.deptRestriction]]);
          return jsonOut({ ok: true });
        }
      }
      return errOut('Post not found.');
    }

    if (action === 'adminDeleteStudent') {
      checkAdmin(body.password);
      if (getSetting('nominalRollFinalized') === 'true') return errOut('Roll is finalized. No changes allowed.');
      const s = getSheet(SHEET_ROLL);
      const d = s.getDataRange().getValues();
      for (let i = 1; i < d.length; i++) {
        if (String(d[i][0]) === String(body.serial)) { s.deleteRow(i + 1); return jsonOut({ ok: true }); }
      }
      return errOut('Student not found.');
    }

    if (action === 'adminAddStudent') {
      checkAdmin(body.password);
      if (getSetting('nominalRollFinalized') === 'true') return errOut('Roll is finalized. No changes allowed.');
      const s = getSheet(SHEET_ROLL);
      s.appendRow([body.serial, body.name, body.class, body.admission, body.dept]);
      return jsonOut({ ok: true });
    }

    if (action === 'adminFinalizeRoll') {
      checkAdmin(body.password);
      if (getSetting('nominalRollFinalized') === 'true') return errOut('Already finalized.');
      
      const s = getSheet(SHEET_ROLL);
      const d = s.getDataRange().getValues();
      const headers = d.shift();
      
      d.sort((a, b) => {
        const cA = String(a[2]).toUpperCase();
        const cB = String(b[2]).toUpperCase();
        if (cA !== cB) return cA.localeCompare(cB);
        return String(a[1]).toUpperCase().localeCompare(String(b[1]).toUpperCase());
      });

      d.forEach((row, i) => {
        row[0] = i + 1;
      });

      s.clear();
      s.appendRow(headers);
      if (d.length > 0) s.getRange(2, 1, d.length, headers.length).setValues(d);
      
      setSetting('nominalRollFinalized', 'true');
      return jsonOut({ ok: true });
    }

    if (action === 'adminReorderPosts') {
      checkAdmin(body.password);
      const s = getSheet(SHEET_POSTS);
      const d = s.getDataRange().getValues();
      const headers = d[0];
      const newRows = body.posts.map(postName => {
        const row = d.find(r => r[0] === postName);
        return row || [postName, false, false, '', ''];
      });
      s.clear();
      s.appendRow(headers);
      s.getRange(2, 1, newRows.length, headers.length).setValues(newRows);
      return jsonOut({ ok: true });
    }

    if (action === 'adminSaveBooths') {
      checkAdmin(body.password);
      const s = getSheet(SHEET_BOOTHS);
      s.clear();
      s.appendRow(['Booth Number', 'Room Name', 'Classes (JSON)']);
      body.booths.forEach(b => {
        s.appendRow([b.boothNumber, b.roomName, JSON.stringify(b.classes)]);
      });
      return jsonOut({ ok: true });
    }

    if (action === 'adminSaveLocations') {
      checkAdmin(body.password);
      const s = getSheet(SHEET_LOCATIONS);
      s.clear();
      s.appendRow(['Location Name']);
      body.locations.forEach(loc => s.appendRow([loc]));
      return jsonOut({ ok: true });
    }

    if (action === 'adminSaveCountingMatrix') {
      checkAdmin(body.password);
      const s = getSheet(SHEET_MATRIX);
      s.clear();
      s.appendRow(['Matrix JSON']);
      s.appendRow([JSON.stringify(body.matrixData)]);
      return jsonOut({ ok: true });
    }

    if (action === 'adminSaveResults') {
      checkAdmin(body.password);
      const s = getSheet(SHEET_RESULTS);
      const data = s.getDataRange().getValues();
      const headers = ['Table', 'Post', 'Candidate', 'Votes'];
      
      const newEntries = body.results;
      const existing = data.slice(1);
      
      newEntries.forEach(ne => {
        const idx = existing.findIndex(e => e[0] == ne.table && e[1] == ne.post && e[2] == ne.candidate);
        if (idx > -1) existing[idx][3] = ne.votes;
        else existing.push([ne.table, ne.post, ne.candidate, ne.votes]);
      });
      
      s.clear();
      s.appendRow(headers);
      if (existing.length > 0) s.getRange(2, 1, existing.length, headers.length).setValues(existing);
      return jsonOut({ ok: true });
    }

    if (action === 'adminInjectTestData') {
      checkAdmin(body.password);
      const posts = getPostsData();
      const roll  = getNominalRollData();
      const sNoms = getSheet(SHEET_NOMS);
      
      posts.forEach(p => {
        const eligible = roll.slice(0, 5); // Just pick first 5 for speed
        eligible.forEach((c, i) => {
          const id = String(Math.floor(1000000000 + Math.random() * 9000000000));
          const row = [
            id, p.post, 'Female', '2004-01-01', new Date().toISOString(),
            c['Nominal Roll Serial Number'], c.NAME, c.CLASS, c['ADMISION NO']||'N/A', c.Dept||'None',
            roll[10]['Nominal Roll Serial Number'], roll[10].NAME, roll[10].CLASS, roll[10]['ADMISION NO']||'N/A', roll[10].Dept||'None',
            roll[11]['Nominal Roll Serial Number'], roll[11].NAME, roll[11].CLASS, roll[11]['ADMISION NO']||'N/A', roll[11].Dept||'None',
            'Pending', 'None'
          ];
          sNoms.appendRow(row);
        });
      });
      return jsonOut({ ok: true });
    }

    if (action === 'adminWipeData') {
      checkAdmin(body.password);
      getSheet(SHEET_NOMS).clear().appendRow(NOM_COLS);
      getSheet(SHEET_VALID).clear().appendRow(NOM_COLS);
      getSheet(SHEET_FINAL).clear().appendRow(NOM_COLS);
      getSheet(SHEET_RESULTS).clear().appendRow(['Table', 'Post', 'Candidate', 'Votes']);
      getSheet(SHEET_MATRIX).clear().appendRow(['Matrix JSON']);
      setSetting('validListPublished', 'false');
      setSetting('finalListPublished', 'false');
      return jsonOut({ ok: true });
    }

    return errOut(`Unknown action: ${action}`);
  } catch (err) {
    return errOut(err.message);
  }
}

// ─── Helpers ───────────────────────────────────────────────────

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  return s;
}

function ensureAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  [SHEET_ROLL, SHEET_POSTS, SHEET_NOMS, SHEET_VALID, SHEET_FINAL, SHEET_BOOTHS, SHEET_LOCATIONS, SHEET_RESULTS, SHEET_SETTINGS, SHEET_MATRIX].forEach(n => {
    if (!ss.getSheetByName(n)) {
      const s = ss.insertSheet(n);
      if (n === SHEET_NOMS || n === SHEET_VALID || n === SHEET_FINAL) s.appendRow(NOM_COLS);
    }
  });
}

function getSetting(key) {
  const s = getSheet(SHEET_SETTINGS);
  const d = s.getDataRange().getValues();
  const r = d.find(row => row[0] === key);
  return r ? String(r[1]) : null;
}

function setSetting(key, val) {
  const s = getSheet(SHEET_SETTINGS);
  const d = s.getDataRange().getValues();
  const idx = d.findIndex(r => r[0] === key);
  if (idx > -1) s.getRange(idx + 1, 2).setValue(val);
  else s.appendRow([key, val]);
}

function checkAdmin(pwd) {
  const actual = getSetting('adminPassword') || 'admin123';
  if (pwd !== actual) throw new Error('Invalid administrator password.');
}

function getNominalRollData() {
  const s = getSheet(SHEET_ROLL);
  const d = s.getDataRange().getValues();
  if (d.length < 2) return [];
  const headers = d[0];
  return d.slice(1).map((r, idx) => {
    let obj = { _row: idx + 2 };
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

function getPostsData() {
  const s = getSheet(SHEET_POSTS);
  const d = s.getDataRange().getValues();
  if (d.length < 2) return [];
  return d.slice(1).map(r => ({
    post: r[0], femaleOnly: !!r[1], finalYearIneligible: !!r[2], yearRestriction: r[3], deptRestriction: !!r[4]
  }));
}

function getAllNominations(sheetName = SHEET_NOMS) {
  const s = getSheet(sheetName);
  const d = s.getDataRange().getValues();
  if (d.length < 2) return [];
  const headers = d[0];
  return d.slice(1).map((r, idx) => {
    let obj = { _row: idx + 2 };
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function errOut(msg) {
  return jsonOut({ error: msg });
}
