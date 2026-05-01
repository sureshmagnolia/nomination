/**
 * ============================================================
 *  GVC College Union Election ΓÇö Google Apps Script Backend
 *  File: Code.gs
 * ============================================================
 */

// CONFIGURATION ΓÇö NO SECRETS HERE (Stored in Script Properties)
const SHEET_NOMINAL  = 'NominalRoll';
const SHEET_NOMS     = 'Nominations'; // All submissions
const SHEET_VALID    = 'ValidList';   // Verified by admin
const SHEET_FINAL    = 'FinalList';   // Published after withdrawals
const SHEET_SETTINGS = 'Settings';
const SHEET_POSTS    = 'Posts';
const SHEET_BOOTHS   = 'Booths';
const SHEET_RESULTS  = 'Results';
const SHEET_MATRIX   = 'CountingMatrix';
const SHEET_BALLOT_PLAN = 'BallotPlan';

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

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  OUTPUT HELPERS
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
function errOut(msg) { return jsonOut({ error: msg }); }

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  SHEET HELPERS
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function getSheet(name) {
  const ssId = PropertiesService.getScriptProperties().getProperty('SS_ID');
  if (!ssId) {
    throw new Error('SPREADSHEET_ID (SS_ID) is not configured in Script Properties. Please run setSpreadsheetId() once.');
  }
  const ss = SpreadsheetApp.openById(ssId);
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
  ensureSheet(SHEET_BOOTHS, ['BoothNumber', 'RoomName', 'AllocatedClasses']);
  ensureSheet(SHEET_RESULTS, ['TableNumber', 'Post', 'CandidateId', 'CandidateName', 'Votes']);
  ensureSheet(SHEET_SETTINGS, ['Key', 'Value']);
  ensureSheet(SHEET_BALLOT_PLAN, ['PlanJSON']);
  
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

/**
 * Validates admin credentials and (optionally) the active session token.
 * @param {string} pwd         - The daily password.
 * @param {string} sessionToken - The UUID session token from the client.
 * @param {boolean} isLogin    - Set true during adminLogin so we skip token check.
 */
function checkAdmin(pwd, sessionToken, isLogin = false) {
  // Generate dynamic password based on current date in India (Asia/Kolkata)
  // Format: ddmmyyyyday (e.g., 29042026wednesday)
  const now = new Date();
  const dateStr = Utilities.formatDate(now, "Asia/Kolkata", "ddMMyyyy");
  const dayStr = Utilities.formatDate(now, "Asia/Kolkata", "EEEE").toLowerCase();
  const dynamicPassword = dateStr + dayStr;

  if (pwd !== dynamicPassword) {
    throw new Error('Invalid admin password.');
  }

  if (!isLogin) {
    const activeToken = PropertiesService.getScriptProperties().getProperty('activeAdminSession');
    if (activeToken && activeToken !== sessionToken) {
      throw new Error('SESSION_EXPIRED');
    }
  }
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  doGet
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
    if (action === 'getPosts') {
      return cachedJsonOut('public_posts', () => getPostsData(), 30);
    }

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
      checkAdmin(e.parameter.password, e.parameter.sessionToken);
      return jsonOut(getAllNominations());
    }

    if (action === 'adminGetSettings') {
      checkAdmin(e.parameter.password, e.parameter.sessionToken);
      return jsonOut({
        validListPublished: getSetting('validListPublished'),
        finalListPublished: getSetting('finalListPublished'),
        collegeName: getSetting('collegeName') || 'GOVERNMENT VICTORIA COLLEGE PALAKKAD',
        collegeShortName: getSetting('collegeShortName') || 'GVC'
      });
    }

    if (action === 'adminGetPosts') {
      checkAdmin(e.parameter.password, e.parameter.sessionToken);
      return jsonOut(getPostsData());
    }

    if (action === 'adminGetBooths') {
      checkAdmin(e.parameter.password, e.parameter.sessionToken);
      const s = getSheet(SHEET_BOOTHS);
      const d = s.getDataRange().getValues();
      if (d.length < 2) return jsonOut([]);
      return jsonOut(d.slice(1).map(r => ({
        boothNumber: r[0],
        roomName: String(r[1] || ''),
        classes: JSON.parse(r[2] || '[]')
      })));
    }

    if (action === 'adminGetLocations') {
      checkAdmin(e.parameter.password, e.parameter.sessionToken);
      const locStr = getSetting('availableLocations');
      try {
        return jsonOut(locStr ? JSON.parse(locStr) : []);
      } catch (e) {
        return jsonOut([]);
      }
    }

    if (action === 'getResults') {
      return cachedJsonOut('public_results', () => {
        const s = getSheet(SHEET_RESULTS);
        const d = s.getDataRange().getValues();
        if (d.length < 2) return [];
        const headers = d[0];
        return d.slice(1).map(r => {
          let obj = {};
          headers.forEach((h, i) => obj[h] = r[i]);
          return obj;
        });
      }, 30);
    }

    if (action === 'getPublicSchedule') {
      return cachedJsonOut('public_schedule', () => ({
        nominationDeadline: getSetting('nominationDeadline'),
        withdrawalStart: getSetting('withdrawalStart'),
        withdrawalEnd: getSetting('withdrawalEnd'),
        notificationDate: getSetting('notificationDate') || '2026-04-20',
        electionYear: getSetting('electionYear') || new Date().getFullYear().toString()
      }), 30);
    }

    if (action === 'getSettings') {
      // Only return non-sensitive public flags by default
      return jsonOut({
        validListPublished: getSetting('validListPublished'),
        finalListPublished: getSetting('finalListPublished'),
        isRollFinalized: getSetting('isRollFinalized')
      });
    }

    if (action === 'adminGetCountingMatrix') {
      checkAdmin(e.parameter.password, e.parameter.sessionToken);
      const s = getSheet(SHEET_MATRIX);
      const d = s.getDataRange().getValues();
      if (d.length < 2) return jsonOut(null);
      return jsonOut(JSON.parse(d[1][0]));
    }

    if (action === 'adminGetBallotPlan') {
      checkAdmin(e.parameter.password, e.parameter.sessionToken);
      const s = getSheet(SHEET_BALLOT_PLAN);
      const d = s.getDataRange().getValues();
      if (d.length < 2) return errOut('No ballot plan generated yet. Please generate it from the Ballot Printing page.');
      return jsonOut(JSON.parse(d[1][0]));
    }

    return errOut(`Unknown action: ${action}`);
  } catch (err) {
    return errOut(err.message);
  }
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  doPost
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function doPost(e) {
  try {
    ensureAll();
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'adminSaveSchedule') {
      checkAdmin(body.password, body.sessionToken);
      setSetting('nominationDeadline', body.nominationDeadline);
      setSetting('withdrawalStart', body.withdrawalStart);
      setSetting('withdrawalEnd', body.withdrawalEnd);
      setSetting('notificationDate', body.notificationDate);
      setSetting('electionYear', body.electionYear || new Date().getFullYear().toString());
      return jsonOut({ ok: true });
    }

    if (action === 'adminLogin') {
      checkAdmin(body.password, null, true);
      const sessionToken = Utilities.getUuid();
      PropertiesService.getScriptProperties().setProperty('activeAdminSession', sessionToken);
      return jsonOut({ ok: true, sessionToken });
    }

    if (action === 'adminUpdateSettings') {
      checkAdmin(body.password, body.sessionToken);
      if (body.collegeName) setSetting('collegeName', body.collegeName);
      if (body.collegeShortName) setSetting('collegeShortName', body.collegeShortName);
      return jsonOut({ ok: true });
    }

    if (action === 'adminSendOTP') {
      checkAdmin(body.password, body.sessionToken);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      let email = "";
      try {
        email = Session.getEffectiveUser().getEmail();
        if (!email) throw new Error("Email is empty");
      } catch (e) {
        return errOut("AUTHORIZATION_REQUIRED: The script needs permission to send emails. Please open the Apps Script editor, run 'triggerAuthorization' once, grant permissions, and then re-deploy.");
      }

      // SECURE: Store OTP in Script Properties (Not in Spreadsheet)
      PropertiesService.getScriptProperties().setProperty('lastOTP', otp);
      PropertiesService.getScriptProperties().setProperty('lastOTPTime', new Date().toISOString());
      
      const subject = `Admin Login OTP - GVC Election Portal`;
      const message = `Your administrative One-Time Password (OTP) is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this, please change your admin password immediately.`;
      
      MailApp.sendEmail(email, subject, message);
      return jsonOut({ ok: true, email: email.replace(/(.{2})(.*)(@.*)/, "$1***$3") });
    }

    if (action === 'adminVerifyOTP') {
      checkAdmin(body.password, body.sessionToken);
      const savedOTP = PropertiesService.getScriptProperties().getProperty('lastOTP');
      const savedTime = PropertiesService.getScriptProperties().getProperty('lastOTPTime');
      
      if (!savedOTP || !savedTime) return errOut('OTP not found. Please request a new one.');
      
      const diff = (new Date() - new Date(savedTime)) / 1000 / 60;
      if (diff > 5) return errOut('OTP has expired. Please request a new one.');
      
      if (body.otp !== savedOTP) return errOut('Invalid OTP code.');
      
      // Clear OTP after successful use
      PropertiesService.getScriptProperties().deleteProperty('lastOTP');
      return jsonOut({ ok: true });
    }

    if (action === 'submitNomination') {
      let isAdmin = false;
      if (body.password) { try { checkAdmin(body); isAdmin = true; } catch(e) {} }

      const deadline = getSetting('nominationDeadline');
      const deadlineDate = (deadline && deadline.trim()) ? new Date(deadline) : null;
      
      if (!isAdmin && deadlineDate && !isNaN(deadlineDate.getTime()) && new Date() > deadlineDate) {
        return errOut('Nomination filing period has ended.');
      }
      
      const { post, gender, dob, candidateSerial, proposerSerial, seconderSerial } = body;
      const roll = getNominalRollData();
      const findS = (sn) => roll.find(r => String(r['Nominal Roll Serial Number']) === String(sn));
      
      const c = findS(candidateSerial);
      const p = findS(proposerSerial);
      const st = findS(seconderSerial);

      if (!c || !p || !st) return errOut('Candidate/Proposer/Seconder serial not found in Nominal Roll.');

      // Rule: Same student can't propose or second 2 candidates for the same post
      const allNoms = getAllNominations();
      const samePostNoms = allNoms.filter(n => n.post === post && n.status !== 'Rejected');
      
      const pExists = samePostNoms.find(n => n.proposerSerial === String(proposerSerial) || n.seconderSerial === String(proposerSerial));
      const sExists = samePostNoms.find(n => n.proposerSerial === String(seconderSerial) || n.seconderSerial === String(seconderSerial));
      
      if (!isAdmin) {
        if (pExists) return errOut(`Proposer (Serial ${proposerSerial}) has already endorsed a candidate for this post.`);
        if (sExists) return errOut(`Seconder (Serial ${seconderSerial}) has already endorsed a candidate for this post.`);
      }

      const existingIds = new Set(allNoms.map(n => n.id));
      let id; do { id = String(Math.floor(1000000000 + Math.random() * 9000000000)); } while (existingIds.has(id));

      const getAdm = (obj) => obj['ADMISION NO'] || obj['ADMISSION NO'] || 'N/A';

      const row = [
        id, post, gender, dob, new Date().toISOString(),
        String(candidateSerial), c.NAME, c.CLASS, getAdm(c), c.Dept || 'N/A',
        String(proposerSerial),  p.NAME, p.CLASS, getAdm(p), p.Dept || 'N/A',
        String(seconderSerial),  st.NAME, st.CLASS, getAdm(st), st.Dept || 'N/A',
        'Pending', 'None'
      ];
      
      getSheet(SHEET_NOMS).appendRow(row);
      return jsonOut({ ok: true, id });
    }

    if (action === 'submitWithdrawal') {
      let isAdmin = false;
      if (body.password) { try { checkAdmin(body); isAdmin = true; } catch(e) {} }
      
      const start = getSetting('withdrawalStart'), end = getSetting('withdrawalEnd'), now = new Date();
      const startDate = (start && start.trim()) ? new Date(start) : null;
      const endDate = (end && end.trim()) ? new Date(end) : null;

      if (!isAdmin) {
        if (startDate && !isNaN(startDate.getTime()) && now < startDate) return errOut('Withdrawal window has not opened yet.');
        if (endDate && !isNaN(endDate.getTime()) && now > endDate) return errOut('Withdrawal window has closed.');
      }
      
      const nom = getAllNominations().find(n => n.id === body.id);
      if (!nom || nom.status !== 'Valid') return errOut(`Invalid nomination status.`);
      getSheet(SHEET_NOMS).getRange(nom._row, 22).setValue('Requested');
      return jsonOut({ ok: true });
    }

    if (action === 'adminVerifyNomination') {
      checkAdmin(body.password, body.sessionToken);
      const nom = getAllNominations().find(n => n.id === body.id);
      if (!nom) return errOut(`Not found.`);
      getSheet(SHEET_NOMS).getRange(nom._row, 21).setValue(body.status);
      
      // Auto-sync to published lists
      syncNominationToPublished(body.id);
      
      return jsonOut({ ok: true });
    }

    if (action === 'adminApproveWithdrawal') {
      checkAdmin(body.password, body.sessionToken);
      const nom = getAllNominations().find(n => n.id === body.id);
      if (!nom) return errOut(`Not found.`);
      getSheet(SHEET_NOMS).getRange(nom._row, 22).setValue('Approved');
      
      // Auto-sync to published lists
      syncNominationToPublished(body.id);
      
      return jsonOut({ ok: true });
    }

    if (action === 'adminPublishValidList') {
      checkAdmin(body.password, body.sessionToken);
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
      checkAdmin(body.password, body.sessionToken);
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
      checkAdmin(body.password, body.sessionToken);
      const s = getSheet(SHEET_POSTS);
      const d = s.getDataRange().getValues();
      for (let i = 1; i < d.length; i++) {
        if (d[i][0] === body.postName) { 
          s.deleteRow(i + 1); 
          CacheService.getScriptCache().remove('public_posts');
          return jsonOut({ ok: true }); 
        }
      }
      return errOut('Post not found.');
    }

    if (action === 'adminAddPost') {
      checkAdmin(body.password, body.sessionToken);
      const s = getSheet(SHEET_POSTS);
      s.appendRow([body.post, body.femaleOnly, body.finalYearIneligible, body.yearRestriction, body.deptRestriction]);
      CacheService.getScriptCache().remove('public_posts');
      return jsonOut({ ok: true });
    }

    if (action === 'adminUpdatePost') {
      checkAdmin(body.password, body.sessionToken);
      const s = getSheet(SHEET_POSTS);
      const d = s.getDataRange().getValues();
      for (let i = 1; i < d.length; i++) {
        if (d[i][0] === body.post) {
          s.getRange(i + 1, 1, 1, 5).setValues([[body.post, body.femaleOnly, body.finalYearIneligible, body.yearRestriction, body.deptRestriction]]);
          CacheService.getScriptCache().remove('public_posts');
          return jsonOut({ ok: true });
        }
      }
      return errOut('Post not found.');
    }

    if (action === 'adminDeleteStudent') {
      checkAdmin(body.password, body.sessionToken);
      if (getSetting('nominalRollFinalized') === 'true') return errOut('Roll is finalized. No changes allowed.');
      const s = getSheet(SHEET_ROLL);
      const d = s.getDataRange().getValues();
      for (let i = 1; i < d.length; i++) {
        if (String(d[i][0]) === String(body.serial)) { s.deleteRow(i + 1); return jsonOut({ ok: true }); }
      }
      return errOut('Student not found.');
    }

    if (action === 'adminAddStudent') {
      checkAdmin(body.password, body.sessionToken);
      if (getSetting('nominalRollFinalized') === 'true') return errOut('Roll is finalized. No changes allowed.');
      const s = getSheet(SHEET_ROLL);
      s.appendRow([body.serial, body.name, body.class, body.admission, body.dept]);
      return jsonOut({ ok: true });
    }

    if (action === 'adminFinalizeRoll') {
      checkAdmin(body.password, body.sessionToken);
      if (getSetting('nominalRollFinalized') === 'true') return errOut('Already finalized.');
      
      const s = getSheet(SHEET_ROLL);
      const d = s.getDataRange().getValues();
      const headers = d.shift();
      
      // Sort by Class then Name
      d.sort((a, b) => {
        const cA = String(a[2]).toUpperCase();
        const cB = String(b[2]).toUpperCase();
        if (cA !== cB) return cA.localeCompare(cB);
        return String(a[1]).toUpperCase().localeCompare(String(b[1]).toUpperCase());
      });

      // Re-assign Serial Numbers sequentially in the sorted order
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
      checkAdmin(body.password, body.sessionToken);
      const s = getSheet(SHEET_POSTS);
      const d = s.getDataRange().getValues();
      if (d.length <= 1) return jsonOut({ ok: true });
      
      const headers = d[0];
      const postsMap = new Map();
      for (let i = 1; i < d.length; i++) {
        postsMap.set(String(d[i][0]), d[i]);
      }
      
      s.clear();
      s.appendRow(headers);
      
      body.posts.forEach(postName => {
        if (postsMap.has(postName)) {
          s.appendRow(postsMap.get(postName));
        }
      });
      
      CacheService.getScriptCache().remove('public_posts');
      return jsonOut({ ok: true });
    }

    if (action === 'adminSaveBooths') {
      checkAdmin(body.password, body.sessionToken);
      const s = getSheet(SHEET_BOOTHS);
      s.clear();
      s.appendRow(['BoothNumber', 'RoomName', 'AllocatedClasses']);
      if (Array.isArray(body.booths)) {
        body.booths.forEach(b => {
          s.appendRow([b.boothNumber, b.roomName, JSON.stringify(b.classes || [])]);
        });
      }
      return jsonOut({ ok: true });
    }

    if (action === 'adminSaveLocations') {
      checkAdmin(body.password, body.sessionToken);
      if (Array.isArray(body.locations)) {
        setSetting('availableLocations', JSON.stringify(body.locations));
        return jsonOut({ ok: true });
      }
      return errOut('Invalid locations data.');
    }

    if (action === 'adminSaveResults') {
      checkAdmin(body.password, body.sessionToken);
      // body.results = [{ TableNumber, Post, CandidateId, CandidateName, Votes }]
      const s = getSheet(SHEET_RESULTS);
      const d = s.getDataRange().getValues();
      const headers = ['TableNumber', 'RoundNumber', 'Post', 'CandidateId', 'CandidateName', 'Votes', 'FormSerial'];
      
      if (!Array.isArray(body.results) || body.results.length === 0) return jsonOut({ ok: true });
      
      const targetTable = String(body.results[0].TableNumber);
      const targetPost = String(body.results[0].Post);
      
      // Filter out existing rows that match the target table and post
      const rowsToKeep = d.slice(1).filter(r => String(r[0]) !== targetTable || String(r[2]) !== targetPost);
      
      s.clear();
      s.appendRow(headers);
      rowsToKeep.forEach(r => {
        const row = [...r];
        while (row.length < headers.length) row.push('');
        s.appendRow(row);
      });
      
      body.results.forEach(res => {
        s.appendRow([
          res.TableNumber, 
          res.RoundNumber || 'N/A',
          res.Post, 
          res.CandidateId, 
          res.CandidateName, 
          Number(res.Votes) || 0, 
          res.FormSerial || 'N/A'
        ]);
      });
      
      return jsonOut({ ok: true });
    }

    if (action === 'adminSaveCountingMatrix') {
      checkAdmin(body.password, body.sessionToken);
      const s = getSheet(SHEET_MATRIX);
      s.clear();
      s.appendRow(['MatrixDataJSON']);
      s.appendRow([JSON.stringify(body.matrixData)]);
      return jsonOut({ ok: true });
    }

    if (action === 'adminGenerateBallotPlan') {
      checkAdmin(body.password, body.sessionToken);
      const plan = calculateBallotPlanServer();
      const s = getSheet(SHEET_BALLOT_PLAN);
      s.clear();
      s.appendRow(['PlanJSON']);
      s.appendRow([JSON.stringify(plan)]);
      return jsonOut({ ok: true, plan });
    }

    if (action === 'adminInjectTestData') {
      checkAdmin(body);

      const nomSheet   = getSheet(SHEET_NOMS);
      const validSheet = getSheet(SHEET_VALID);
      const finalSheet = getSheet(SHEET_FINAL);
      const students   = getNominalRollData();
      const posts      = getPostsData();

      if (students.length < 9) return errOut('Not enough students in NominalRoll to generate test data.');
      if (posts.length === 0)  return errOut('No posts configured. Add posts first.');

      // ΓöÇΓöÇ Eligibility filter: mirrors frontend checkEligibility() ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
      function isEligibleCandidate(student, postRule) {
        const cls  = String(student['CLASS'] || '').toUpperCase();
        const dept = String(student['Dept']  || '').toUpperCase();

        // Dept restriction (Association posts)
        if (postRule.deptRestriction) {
          const prefix  = 'Association Secretary ';
          const postName = String(postRule.post || '');
          const reqDept  = postName.startsWith(prefix) ? postName.replace(prefix, '').toUpperCase() : null;
          if (reqDept && dept !== reqDept) return false;
        }

        // Year restriction
        const yr = String(postRule.yearRestriction || '');
        if (yr === '1'  && !cls.includes('1ST YEAR')) return false;
        if (yr === '2'  && !cls.includes('2ND YEAR')) return false;
        if (yr === '3'  && !cls.includes('3RD YEAR')) return false;
        if (yr === 'PG') {
          const isPG = cls.includes('MA') || cls.includes('MSC') || cls.includes('MCOM') ||
                       cls.includes('M.SC') || cls.includes('M.COM') || cls.includes('M.A');
          if (!isPG) return false;
        }

        // Final year ineligible
        if (postRule.finalYearIneligible) {
          if (cls.includes('3RD YEAR') || cls.includes('2ND YEAR M')) return false;
        }

        // NOTE: femaleOnly is NOT filtered from NominalRoll ΓÇö gender is self-declared.
        // The nomination row will have gender set to 'Female' for femaleOnly posts.
        return true;
      }

      function isEligibleSupporter(student, postRule) {
        if (!postRule.deptRestriction) return true;
        const dept    = String(student['Dept'] || '').toUpperCase();
        const prefix  = 'Association Secretary ';
        const postName = String(postRule.post || '');
        const reqDept  = postName.startsWith(prefix) ? postName.replace(prefix, '').toUpperCase() : null;
        if (reqDept && dept !== reqDept) return false;
        return true;
      }

      // ΓöÇΓöÇ Fisher-Yates shuffle for variety ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
      function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }

      // ΓöÇΓöÇ Unique ID generator ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
      const existingIds = new Set(getAllNominations().map(n => n.id));
      function makeTestId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id;
        do {
          id = 'TEST' + Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        } while (existingIds.has(id));
        existingIds.add(id);
        return id;
      }

      const injected = [];
      const skipped  = [];
      const now      = new Date().toISOString();
      const getAdm   = (st) => st['ADMISION NO'] || st['ADMISSION NO'] || 'N/A';

      // Global offsets advance across posts so each post gets DIFFERENT students
      let globalCandidateOffset = 0;
      let globalSupporterOffset = 0;

      const nomRows = [];
      const resRows = [];
      const resHeaders = ['TableNumber', 'RoundNumber', 'Post', 'CandidateId', 'CandidateName', 'Votes', 'FormSerial'];

      posts.forEach((p) => {
        // Shuffle eligible lists for this post
        const eligibleCandidates = shuffle(students.filter(s => isEligibleCandidate(s, p)));
        const eligibleSupporters = shuffle(students.filter(s => isEligibleSupporter(s, p)));

        if (eligibleCandidates.length < 2 || eligibleSupporters.length < 4) {
          skipped.push(p.post);
          return;
        }

        // Inject 2 candidates per post
        for (let i = 0; i < 2; i++) {
          // Use global offset so candidate selection differs across posts
          const candidate = eligibleCandidates[(globalCandidateOffset + i) % eligibleCandidates.length];

          // Pick proposer + seconder ΓÇö must be different from candidate and each other
          const usedSerials = new Set([String(candidate['Nominal Roll Serial Number'])]);
          const availSupporters = [];
          for (let k = 0; k < eligibleSupporters.length; k++) {
            const s = eligibleSupporters[(globalSupporterOffset + k) % eligibleSupporters.length];
            if (!usedSerials.has(String(s['Nominal Roll Serial Number']))) {
              availSupporters.push(s);
              usedSerials.add(String(s['Nominal Roll Serial Number']));
              if (availSupporters.length === 2) break;
            }
          }
          if (availSupporters.length < 2) { skipped.push(p.post); break; }

          const [proposer, seconder] = availSupporters;
          const id     = makeTestId();
          const gender = p.femaleOnly ? 'Female' : (String(candidate['Gender'] || 'Male'));
          const dob    = candidate['DOB'] ? String(candidate['DOB']) : '2003-06-15';

          const row = [
            id, p.post, gender, dob, now,
            String(candidate['Nominal Roll Serial Number']),
            candidate['NAME'], candidate['CLASS'], getAdm(candidate), candidate['Dept'] || 'N/A',
            String(proposer['Nominal Roll Serial Number']),
            proposer['NAME'], proposer['CLASS'], getAdm(proposer), proposer['Dept'] || 'N/A',
            String(seconder['Nominal Roll Serial Number']),
            seconder['NAME'], seconder['CLASS'], getAdm(seconder), seconder['Dept'] || 'N/A',
            'Valid', 'None'
          ];
          
          nomRows.push(row);
          injected.push(id);
          
          // Prepare random votes
          resRows.push([1, 1, p.post, id, candidate['NAME'], Math.floor(Math.random() * 100) + 50, 'TEST-AUTO']);
        }

        // Prepare NOTA & INVALID
        resRows.push([1, 1, p.post, 'NOTA', 'NOTA', Math.floor(Math.random() * 20), 'TEST-AUTO']);
        resRows.push([1, 1, p.post, 'INVALID', 'Invalid', Math.floor(Math.random() * 10), 'TEST-AUTO']);

        globalCandidateOffset += 5;
        globalSupporterOffset += 7;
      });

      // Batch write to sheets
      if (nomRows.length > 0) {
        nomSheet.getRange(nomSheet.getLastRow() + 1, 1, nomRows.length, nomRows[0].length).setValues(nomRows);
        validSheet.getRange(validSheet.getLastRow() + 1, 1, nomRows.length, nomRows[0].length).setValues(nomRows);
        finalSheet.getRange(finalSheet.getLastRow() + 1, 1, nomRows.length, nomRows[0].length).setValues(nomRows);
      }
      if (resRows.length > 0) {
        const resSheet = getSheet(SHEET_RESULTS);
        if (resSheet.getLastRow() === 0) {
          resSheet.appendRow(resHeaders);
          resSheet.getRange(1, 1, 1, resHeaders.length).setFontWeight('bold');
        }
        resSheet.getRange(resSheet.getLastRow() + 1, 1, resRows.length, resRows[0].length).setValues(resRows);
      }

      return jsonOut({ ok: true, injected: injected.length, skipped: skipped.length, skippedPosts: skipped });
    }

    if (action === 'adminWipeData') {
      checkAdmin(body);
      
      // Wipe transactional data only ΓÇö never wipe NominalRoll, Posts, or Booths
      const sheetsToWipe = [SHEET_NOMS, SHEET_VALID, SHEET_FINAL, SHEET_RESULTS, SHEET_MATRIX];
      sheetsToWipe.forEach(name => {
        const s = getSheet(name);
        const firstRow = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
        s.clear();
        s.appendRow(firstRow);
        s.getRange(1, 1, 1, firstRow.length).setFontWeight('bold');
      });
      
      // Also reset the publish flags
      setSetting('validListPublished', 'false');
      setSetting('finalListPublished', 'false');
      
      return jsonOut({ ok: true });
    }

    return errOut(`Unknown action: ${action}`);
  } catch (err) {
    return errOut(err.message);
  }
}

/**
 * Syncs a single nomination to SHEET_VALID and SHEET_FINAL if they are published.
 */
function syncNominationToPublished(id) {
  const nom = getAllNominations().find(n => n.id === id);
  if (!nom) return;

  const validPub = getSetting('validListPublished') === 'true';
  const finalPub = getSetting('finalListPublished') === 'true';

  const row = [
    nom.id, nom.post, nom.gender, nom.dob, nom.timestamp,
    nom.candidateSerial, nom.candidateName, nom.candidateClass, nom.candidateAdmission, nom.candidateDept,
    nom.proposerSerial,  nom.proposerName,  nom.proposerClass,  nom.proposerAdmission,  nom.proposerDept,
    nom.seconderSerial,  nom.seconderName,  nom.seconderClass,  nom.seconderAdmission,  nom.seconderDept,
    nom.status, nom.withdrawalStatus
  ];

  if (validPub) syncToSheet(SHEET_VALID, id, row, nom.status === 'Valid');
  if (finalPub) {
    const isFinalValid = nom.status === 'Valid' && nom.withdrawalStatus !== 'Approved';
    syncToSheet(SHEET_FINAL, id, row, isFinalValid);
  }
}

function syncToSheet(sheetName, id, rowData, shouldExist) {
  const s = getSheet(sheetName);
  const d = s.getDataRange().getValues();
  let foundRow = -1;
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(id)) {
      foundRow = i + 1;
      break;
    }
  }

  if (shouldExist) {
    if (foundRow > 0) {
      s.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      s.appendRow(rowData);
    }
  } else {
    if (foundRow > 0) {
      s.deleteRow(foundRow);
    }
  }
}

/** 
 * MANUALLY RUN THIS ONCE from the Apps Script editor to trigger 
 * the authorization dialog for OTP emails.
 */
function triggerAuthorization() {
  // SET YOUR SPREADSHEET ID HERE ONCE, then clear it or delete this function.
  // PropertiesService.getScriptProperties().setProperty('SS_ID', 'YOUR_ACTUAL_ID_HERE');
  
  const email = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail(email, "Authorization Trigger", "If you received this, the election portal is now authorized to send OTPs.");
  Logger.log("Authorized for: " + email);
}

/**
 * Run this ONCE to link your Spreadsheet ID securely.
 * This way, the ID never stays in your public GitHub code.
 */
function setupSecureSpreadsheet() {
  const id = '10p-3qWklthNnDUp-MqOHEjJLmWRpgkvVX2QpmGreKxA';
  PropertiesService.getScriptProperties().setProperty('SS_ID', id);
  Logger.log("Successfully linked Spreadsheet ID securely.");
}

/**
 * High-performance JSON output with server-side caching.
 * Prevents multiple spreadsheet reads during high traffic.
 */
/**
 * Centralized Ballot Master Plan Calculation (Server-Side)
 * This logic is the SINGLE SOURCE OF TRUTH for all ballot serial ranges and Book IDs.
 */
function calculateBallotPlanServer() {
  const posts = getPostsData();
  const noms = getAllNominations(SHEET_FINAL);
  const candidates = noms.filter(n => n.withdrawalStatus !== 'Approved');
  
  // Get Booths
  const sB = getSheet(SHEET_BOOTHS);
  const dB = sB.getDataRange().getValues();
  const booths = dB.length < 2 ? [] : dB.slice(1).map(r => ({
    boothNumber: r[0],
    roomName: String(r[1] || ''),
    classes: JSON.parse(r[2] || '[]')
  })).sort((a, b) => a.boothNumber - b.boothNumber);

  const students = getNominalRollData();

  const isYear = (p) => p.post.toLowerCase().includes('representative') || p.post.toLowerCase().includes('year');
  const isAssoc = (p) => p.post.toLowerCase().includes('association') || p.post.toLowerCase().includes('assoc');
  const isGeneral = (p) => !isYear(p) && !isAssoc(p);

  const contestablePosts = posts.filter(p => {
    const pCands = candidates.filter(c => c.post === p.post);
    return pCands.length > 1;
  });

  // Master counters
  let genSl = 1, repSl = 1, assocSl = 1;
  let gbCount = 0, rbCount = 0, abCount = 0;

  const standard = 50;
  const threshold = 15;

  const calcBooks = (count, start, prefix, currentGlobalBookCount) => {
    if (!count || count <= 0) return { html: '-', ids: '-', count: 0 };
    let current = start;
    let books = [];
    const idPrefix = prefix === 'G' ? 'GB' : (prefix === 'R' ? 'RB' : 'AB');
    let counter = currentGlobalBookCount;
    let ids = [];

    const createRange = (size) => {
      counter++;
      const id = idPrefix + counter;
      ids.push(id);
      const range = `${prefix}${current}-${current + size - 1}`;
      current += size;
      return { id, range };
    };

    if (count <= (standard + threshold)) {
      books.push({ qty: 1, size: count, items: [createRange(count)] });
    } else {
      const fullBooks = Math.floor(count / standard);
      const remainder = count % standard;
      if (remainder === 0) {
        let items = [];
        for (let i = 0; i < fullBooks; i++) items.push(createRange(standard));
        books.push({ qty: fullBooks, size: standard, items });
      } else if (remainder <= threshold) {
        let items = [];
        for (let i = 0; i < fullBooks - 1; i++) items.push(createRange(standard));
        if (items.length > 0) books.push({ qty: fullBooks - 1, size: standard, items });
        const lastSize = standard + remainder;
        books.push({ qty: 1, size: lastSize, items: [createRange(lastSize)] });
      } else {
        let items = [];
        for (let i = 0; i < fullBooks; i++) items.push(createRange(standard));
        books.push({ qty: fullBooks, size: standard, items });
        books.push({ qty: 1, size: remainder, items: [createRange(remainder)] });
      }
    }

    const html = `
      <table style="width:100%; border-collapse:collapse; font-size:10px; background:rgba(0,0,0,0.02);">
        ${books.map(b => `
          <tr>
            <td style="padding:4px; border:1px solid #eee; font-weight:bold; width:45px;">${b.qty} x ${b.size}</td>
            <td style="padding:4px; border:1px solid #eee; line-height:1.4;">
              ${b.items.map(it => `<span style="display:inline-block; margin-right:8px;"><strong style="color:#4f46e5;">${it.id}:</strong> ${it.range}</span>`).join(' ')}
            </td>
          </tr>
        `).join('')}
      </table>
    `;

    return { 
      html, 
      ids: ids.length === 1 ? ids[0] : `${ids[0]} to ${ids[ids.length - 1]}`, 
      nextCounter: counter 
    };
  };

  const boothMap = {};
  booths.forEach(b => {
    boothMap[b.boothNumber] = { general: null, reps: [], assocs: [] };
  });

  // 1. General
  const genResults = [];
  booths.forEach(b => {
    const boothStudents = students.filter(s => b.classes.includes(String(s.CLASS).trim()));
    const count = boothStudents.length;
    const start = genSl;
    const end = start + count - 1;
    const bookData = calcBooks(count, start, 'G', gbCount);
    gbCount = bookData.nextCounter;

    const data = { booth: b.boothNumber, count, start, end, bookHtml: bookData.html, bookIds: bookData.ids };
    genResults.push(data);
    boothMap[b.boothNumber].general = data;
    genSl += count;
  });

  // 2. Reps
  const repResults = [];
  const yrPosts = contestablePosts.filter(isYear);
  yrPosts.forEach(p => {
    const yr = String(p.yearRestriction || '').trim().toUpperCase();
    booths.forEach(b => {
      const boothStudents = students.filter(s => b.classes.includes(String(s.CLASS).trim()));
      const targetStudents = boothStudents.filter(s => {
        const cls = String(s.CLASS || '').toUpperCase();
        if (cls.includes('PH D') || cls.includes('PH.D')) return false; 
        const isPG = /\b(MA|MSC|MCOM|M\.SC|M\.COM|M\.A)\b/i.test(cls);
        if (yr === 'PG') return isPG;
        if (isPG) return false; 
        if (yr === '1') return cls.startsWith('1ST YEAR');
        if (yr === '2') return cls.startsWith('2ND YEAR');
        if (yr === '3') return cls.startsWith('3RD YEAR');
        return false;
      });

      if (targetStudents.length > 0) {
        const count = targetStudents.length;
        const start = repSl;
        const end = start + count - 1;
        const bookData = calcBooks(count, start, 'R', rbCount);
        rbCount = bookData.nextCounter;

        const data = { post: p.post, booth: b.boothNumber, count, start, end, bookHtml: bookData.html, bookIds: bookData.ids };
        repResults.push(data);
        boothMap[b.boothNumber].reps.push(data);
        repSl += count;
      }
    });
  });

  // 3. Assocs
  const assocResults = [];
  const aPosts = contestablePosts.filter(isAssoc);
  aPosts.forEach(p => {
    const prefix = 'Association Secretary';
    let dept = p.post.toUpperCase();
    if (dept.includes(prefix.toUpperCase())) dept = dept.split(prefix.toUpperCase())[1].trim();
    dept = dept.replace(/[-\s]/g, ' ');

    booths.forEach(b => {
      const boothStudents = students.filter(s => b.classes.includes(String(s.CLASS).trim()));
      const targetStudents = boothStudents.filter(s => {
        const sDept = String(s.Dept || '').trim().toUpperCase().replace(/[-\s]/g, ' ');
        const sCls  = String(s.CLASS || '').trim().toUpperCase().replace(/[-\s]/g, ' ');
        return sDept === dept || sDept.includes(dept) || sCls.includes(dept);
      });

      if (targetStudents.length > 0) {
        const count = targetStudents.length;
        const start = assocSl;
        const end = start + count - 1;
        const bookData = calcBooks(count, start, 'A', abCount);
        abCount = bookData.nextCounter;

        const data = { post: p.post, booth: b.boothNumber, count, start, end, bookHtml: bookData.html, bookIds: bookData.ids };
        assocResults.push(data);
        boothMap[b.boothNumber].assocs.push(data);
        assocSl += count;
      }
    });
  });

  return {
    general: { results: genResults, total: genSl - 1 },
    reps: { results: repResults, total: repSl - 1 },
    assocs: { results: assocResults, total: assocSl - 1 },
    boothAssignments: boothMap
  };
}

function cachedJsonOut(key, dataFetcher, seconds = 30) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);
  if (cached) {
    return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = dataFetcher();
  const json = JSON.stringify(data);
  cache.put(key, json, seconds);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
