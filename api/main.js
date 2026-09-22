import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';
import crypto from 'crypto';

// Ensure DATABASE_URL is set in your Vercel project environment variables
// If missing, use a valid placeholder format so the module doesn't crash on load
const sql = neon(process.env.DATABASE_URL || 'postgresql://user:pass@host.com/db');
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_to_prevent_crash');

// Helper to standardise responses
const jsonOut = (res, data, status = 200) => res.status(status).json(data);
const errOut = (res, msg, status = 400) => res.status(status).json({ error: msg });

const safeJsonParse = (val, fallback = null) => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch (_) {
    return fallback;
  }
};

const getAuthToken = (req) => (req && req.headers ? (req.headers['x-session-token'] || req.headers['x-admin-password'] || req.headers['authorization'] || '') : '');

const checkAdmin = async (password, sessionToken, action) => {
  if (!action.startsWith('admin')) return;
  if (action === 'adminSendOTP' || action === 'adminVerifyOTP' || action === 'adminLogin') return; // Auth handled in endpoint

  const rows = await sql`SELECT value FROM settings WHERE key = 'adminPassword'`;
  const realPwd = rows.length > 0 ? rows[0].value : 'admin123';
  
  if (password !== realPwd) {
    throw new Error(`UNAUTHORIZED_PASSWORD_MISMATCH`);
  }

  if (!sessionToken) {
    throw new Error('UNAUTHORIZED_SESSION_MISSING');
  }

  let validSession = [];
  try {
    validSession = await sql`SELECT token FROM admin_sessions WHERE token = ${sessionToken} AND created_at > NOW() - INTERVAL '24 hours'`;
  } catch (sessionErr) {
    if (String(sessionErr.message).toLowerCase().includes('created_at')) {
      try { await sql`ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`; } catch (_) {}
      validSession = await sql`SELECT token FROM admin_sessions WHERE token = ${sessionToken}`;
    } else {
      throw sessionErr;
    }
  }
  if (validSession.length === 0) {
    throw new Error('UNAUTHORIZED_SESSION_INVALID_OR_EXPIRED');
  }
};

function getStudentYearLevelServer(cls) {
  const c = String(cls || '').toUpperCase().trim();
  if (c.includes('RESEARCH') || c.includes('SCHOLAR') || c.includes('PHD')) return 'RS';
  const isPG = /\b(MA|MSC|MCOM|M\.SC|M\.COM|M\.A|MBA|MCA|MSW)\b/.test(c) || c.includes('POST GRADUATE') || c.includes('PG');
  const isYr1 = c.includes('1ST') || /^\s*(1|1ST|I)\b/.test(c) || /\b1ST\s+YEAR\b/.test(c) || /\bI\s+(YEAR|UG|PG|DC|DEG|BA|BSC|BCOM|MA|MSC|MCOM)\b/.test(c);
  const isYr2 = c.includes('2ND') || /^\s*(2|2ND|II)\b/.test(c) || /\b2ND\s+YEAR\b/.test(c) || /\bII\s+(YEAR|UG|PG|DC|DEG|BA|BSC|BCOM|MA|MSC|MCOM)\b/.test(c);
  const isYr3 = c.includes('3RD') || /^\s*(3|3RD|III)\b/.test(c) || /\b3RD\s+YEAR\b/.test(c) || /\bIII\s+(YEAR|UG|DC|DEG|BA|BSC|BCOM)\b/.test(c);

  if (isPG) {
    if (isYr2) return '2_PG';
    return '1_PG';
  } else {
    if (isYr3) return '3_UG';
    if (isYr2) return '2_UG';
    return '1_UG';
  }
}

function isYearEligibleServer(cls, rule) {
  if (!rule) return true;
  const studentLvl = getStudentYearLevelServer(cls);
  const mode = rule.yearRuleMode || rule.year_rule_mode || (rule.finalYearIneligible || rule.final_year_ineligible ? 'EXCLUDE' : ((rule.yearRestriction || rule.year_restriction) ? 'INCLUDE' : 'ALL'));

  let targetYears = [];
  const yrRaw = rule.yearRuleYears !== undefined ? rule.yearRuleYears : rule.year_rule_years;
  if (Array.isArray(yrRaw)) {
    targetYears = yrRaw;
  } else if (typeof yrRaw === 'string' && yrRaw.trim()) {
    targetYears = yrRaw.split(',').map(y => y.trim()).filter(Boolean);
  } else {
    const finalInelig = rule.finalYearIneligible || rule.final_year_ineligible;
    const yrRestr = rule.yearRestriction || rule.year_restriction;
    if (finalInelig) targetYears = ['3_UG', '2_PG'];
    else if (yrRestr === '1') targetYears = ['1_UG'];
    else if (yrRestr === '2') targetYears = ['2_UG'];
    else if (yrRestr === '3') targetYears = ['3_UG'];
    else if (yrRestr === 'PG') targetYears = ['1_PG', '2_PG'];
    else if (yrRestr === 'UG') targetYears = ['1_UG', '2_UG', '3_UG'];
    else if (yrRestr === '1,2') targetYears = ['1_UG', '2_UG'];
  }

  if (mode === 'ALL' || targetYears.length === 0) {
    if ((rule.finalYearIneligible || rule.final_year_ineligible) && (studentLvl === '3_UG' || studentLvl === '2_PG')) return false;
    return true;
  }

  const matches = (lvl, list) => {
    if (list.includes(lvl)) return true;
    if (lvl.endsWith('_UG') && list.includes('UG')) return true;
    if (lvl.endsWith('_PG') && list.includes('PG')) return true;
    if (lvl.startsWith('1_') && list.includes('1')) return true;
    if (lvl.startsWith('2_') && list.includes('2')) return true;
    if (lvl.startsWith('3_') && list.includes('3')) return true;
    return false;
  };

  if (mode === 'INCLUDE') {
    return matches(studentLvl, targetYears);
  }
  if (mode === 'EXCLUDE') {
    return !matches(studentLvl, targetYears);
  }
  return true;
}

const DEFAULT_POSTS = [
  { post: 'The Chairman', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: false, restrictedDept: '' },
  { post: 'The Vice Chairman', femaleOnly: true, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: false, restrictedDept: '' },
  { post: 'The Secretary', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: false, restrictedDept: '' },
  { post: 'The Joint Secretary', femaleOnly: true, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: false, restrictedDept: '' },
  { post: 'The Chief Student Editor', femaleOnly: false, finalYearIneligible: true, yearRestriction: '', yearRuleMode: 'EXCLUDE', yearRuleYears: '3_UG,2_PG', deptRestriction: false, restrictedDept: '' },
  { post: 'The Secretary Fine Arts', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: false, restrictedDept: '' },
  { post: 'The General Captain For Sports And Games', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: false, restrictedDept: '' },
  { post: 'The University Union Councillor', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: false, restrictedDept: '' },
  { post: 'I UG Representative', femaleOnly: false, finalYearIneligible: false, yearRestriction: '1', yearRuleMode: 'INCLUDE', yearRuleYears: '1_UG', deptRestriction: false, restrictedDept: '' },
  { post: 'II UG Representative', femaleOnly: false, finalYearIneligible: false, yearRestriction: '2', yearRuleMode: 'INCLUDE', yearRuleYears: '2_UG', deptRestriction: false, restrictedDept: '' },
  { post: 'III UG Representative', femaleOnly: false, finalYearIneligible: false, yearRestriction: '3', yearRuleMode: 'INCLUDE', yearRuleYears: '3_UG', deptRestriction: false, restrictedDept: '' },
  { post: 'PG Representative', femaleOnly: false, finalYearIneligible: false, yearRestriction: 'PG', yearRuleMode: 'INCLUDE', yearRuleYears: '1_PG,2_PG', deptRestriction: false, restrictedDept: '' },
  { post: 'Association Secretary Botany', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'Botany' },
  { post: 'Association Secretary Chemistry', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'Chemistry' },
  { post: 'Association Secretary Commerce', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'Commerce' },
  { post: 'Association Secretary Computer Science', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'Computer Science' },
  { post: 'Association Secretary Economics', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'Economics' },
  { post: 'Association Secretary English', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'English' },
  { post: 'Association Secretary Hindi', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'Hindi' },
  { post: 'Association Secretary History', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'History' },
  { post: 'Association Secretary Malayalam', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'Malayalam' },
  { post: 'Association Secretary Mathematics', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'Mathematics' },
  { post: 'Association Secretary Physics', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'Physics' },
  { post: 'Association Secretary Psychology', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'Psychology' },
  { post: 'Association Secretary Sanskrit', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'Sanskrit' },
  { post: 'Association Secretary Tamil', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'Tamil' },
  { post: 'Association Secretary Zoology', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', yearRuleMode: 'ALL', yearRuleYears: '', deptRestriction: true, restrictedDept: 'Zoology' }
];

async function seedDefaultPostsIfEmpty() {
  try {
    const existing = await sql`SELECT COUNT(*)::int as count FROM posts`;
    if ((existing[0]?.count || 0) === 0) {
      for (const p of DEFAULT_POSTS) {
        await sql`
          INSERT INTO posts (
            post, female_only, final_year_ineligible, year_restriction, dept_restriction,
            restricted_dept, year_rule_mode, year_rule_years
          ) VALUES (
            ${p.post}, ${p.femaleOnly}, ${p.finalYearIneligible}, ${p.yearRestriction}, ${p.deptRestriction},
            ${p.restrictedDept}, ${p.yearRuleMode}, ${p.yearRuleYears}
          ) ON CONFLICT (post) DO NOTHING
        `;
      }
    }
  } catch (err) {
    console.warn('seedDefaultPostsIfEmpty warning:', err.message);
  }
}

// Settings helpers (Module Scope)
const getSetting = async (key) => {
  try {
    const rows = await sql`SELECT value FROM settings WHERE key = ${key}`;
    return rows.length > 0 ? rows[0].value : null;
  } catch (err) {
    console.warn(`getSetting(${key}) warning:`, err.message);
    return null;
  }
};

const setSetting = async (key, value) => {
  await sql`
    INSERT INTO settings (key, value) 
    VALUES (${key}, ${value}) 
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
};

// Stage Evaluation Helper: Manual Override trumps Schedule; AUTO follows Date/Time
function evaluateStageStatus(overrideMode, legacyFlag, scheduledStart, scheduledEnd) {
  if (overrideMode === 'FORCE_OPEN' || overrideMode === 'FORCE_PUBLISHED') return true;
  if (overrideMode === 'FORCE_CLOSED' || overrideMode === 'FORCE_UNPUBLISHED') return false;

  const now = new Date();
  const hasStart = scheduledStart && typeof scheduledStart === 'string' && scheduledStart.trim();
  const hasEnd = scheduledEnd && typeof scheduledEnd === 'string' && scheduledEnd.trim();

  if (hasStart || hasEnd) {
    if (hasStart && hasEnd) {
      const s = new Date(scheduledStart);
      const e = new Date(scheduledEnd);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        return now >= s && now <= e;
      }
    } else if (hasStart) {
      const s = new Date(scheduledStart);
      if (!isNaN(s.getTime())) {
        return now >= s;
      }
    } else if (hasEnd) {
      const e = new Date(scheduledEnd);
      if (!isNaN(e.getTime())) {
        return now <= e;
      }
    }
  }

  return legacyFlag === 'true' || legacyFlag === true;
}

async function getFullElectionStatus() {
  const [
    draftRollOverride, draftRollStart, draftRollEnd, legacyDraftPub,
    finalRollOverride, finalRollStart, finalRollEnd, legacyRollFinal,
    nomOverride, nomStart, nomDeadline,
    validListOverride, validListStart, validListEnd, legacyValidPub,
    withOverride, withStart, withEnd,
    finalListOverride, finalListStart, finalListEnd, legacyFinalPub,
    pollingOverride, pollingStart, pollingEnd,
    resultsOverride, resultsStart, resultsEnd, legacyResPub,
    countingActive, resultsLocked,
    electionYear, notificationDate
  ] = await Promise.all([
    getSetting('draftRollOverride'), getSetting('draftRollStart'), getSetting('draftRollEnd'), getSetting('draftRollPublished'),
    getSetting('finalRollOverride'), getSetting('finalRollStart'), getSetting('finalRollEnd'), getSetting('isRollFinalized'),
    getSetting('nominationOverride'), getSetting('nominationStart'), getSetting('nominationDeadline'),
    getSetting('validListOverride'), getSetting('validListStart'), getSetting('validListEnd'), getSetting('validListPublished'),
    getSetting('withdrawalOverride'), getSetting('withdrawalStart'), getSetting('withdrawalEnd'),
    getSetting('finalListOverride'), getSetting('finalListStart'), getSetting('finalListEnd'), getSetting('finalListPublished'),
    getSetting('pollingOverride'), getSetting('pollingStart'), getSetting('pollingEnd'),
    getSetting('resultsOverride'), getSetting('resultsStart'), getSetting('resultsEnd'), getSetting('resultsPublished'),
    getSetting('countingActive'), getSetting('resultsLocked'),
    getSetting('electionYear'), getSetting('notificationDate')
  ]);

  const isFinalRollActive = evaluateStageStatus(finalRollOverride || 'AUTO', legacyRollFinal || 'false', finalRollStart, finalRollEnd);
  const isDraftRollActive = evaluateStageStatus(draftRollOverride || 'AUTO', legacyDraftPub || 'false', draftRollStart, draftRollEnd);
  const isNomActive       = evaluateStageStatus(nomOverride || 'AUTO', 'false', nomStart, nomDeadline);
  const isValidListActive = evaluateStageStatus(validListOverride || 'AUTO', legacyValidPub || 'false', validListStart, validListEnd);
  const isWithActive      = evaluateStageStatus(withOverride || 'AUTO', 'false', withStart, withEnd);
  const isFinalListActive = evaluateStageStatus(finalListOverride || 'AUTO', legacyFinalPub || 'false', finalListStart, finalListEnd);
  const isPollingActive   = evaluateStageStatus(pollingOverride || 'AUTO', 'false', pollingStart, pollingEnd);
  const isResultsActive   = evaluateStageStatus(resultsOverride || 'AUTO', legacyResPub || 'false', resultsStart, resultsEnd);

  return {
    electionYear: electionYear || new Date().getFullYear().toString(),
    notificationDate: notificationDate || '',

    // 1. Draft Roll
    draftRollStart: draftRollStart || '',
    draftRollEnd: draftRollEnd || '',
    draftRollOverride: draftRollOverride || 'AUTO',
    isDraftRollActive,
    draftRollPublished: (isDraftRollActive || isFinalRollActive) ? 'true' : 'false',

    // 2. Final Roll
    finalRollStart: finalRollStart || '',
    finalRollEnd: finalRollEnd || '',
    finalRollOverride: finalRollOverride || 'AUTO',
    isFinalRollActive,
    isRollFinalized: isFinalRollActive ? 'true' : 'false',
    nominalRollFinalized: isFinalRollActive ? 'true' : 'false',

    // 3. Nomination Window
    nominationStart: nomStart || '',
    nominationDeadline: nomDeadline || '',
    nominationOverride: nomOverride || 'AUTO',
    isNominationActive: isNomActive,

    // 4. Valid List
    validListStart: validListStart || '',
    validListEnd: validListEnd || '',
    validListOverride: validListOverride || 'AUTO',
    isValidListActive,
    validListPublished: isValidListActive ? 'true' : 'false',

    // 5. Withdrawal Window
    withdrawalStart: withStart || '',
    withdrawalEnd: withEnd || '',
    withdrawalOverride: withOverride || 'AUTO',
    isWithdrawalActive: isWithActive,

    // 6. Final List
    finalListStart: finalListStart || '',
    finalListEnd: finalListEnd || '',
    finalListOverride: finalListOverride || 'AUTO',
    isFinalListActive,
    finalListPublished: isFinalListActive ? 'true' : 'false',

    // 7. Polling Window
    pollingStart: pollingStart || '',
    pollingEnd: pollingEnd || '',
    pollingOverride: pollingOverride || 'AUTO',
    isPollingActive,

    // 8. Results & Counting
    resultsStart: resultsStart || '',
    resultsEnd: resultsEnd || '',
    resultsOverride: resultsOverride || 'AUTO',
    isResultsActive,
    resultsPublished: isResultsActive ? 'true' : 'false',
    countingActive: countingActive || 'false',
    resultsLocked: resultsLocked || 'false'
  };
}

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS posts (
        post VARCHAR(255) PRIMARY KEY,
        female_only BOOLEAN,
        final_year_ineligible BOOLEAN,
        year_restriction VARCHAR(50),
        dept_restriction BOOLEAN,
        restricted_dept VARCHAR(255),
        year_rule_mode VARCHAR(20) DEFAULT 'ALL',
        year_rule_years VARCHAR(255) DEFAULT ''
      );
    `;
    try { await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS restricted_dept VARCHAR(255);`; } catch (_) {}
    try { await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS year_rule_mode VARCHAR(20) DEFAULT 'ALL';`; } catch (_) {}
    try { await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS year_rule_years VARCHAR(255) DEFAULT '';`; } catch (_) {}
    try { await sql`ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`; } catch (_) {}
    try { await sql`ALTER TABLE nominations ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`; } catch (_) {}
    try { await sql`ALTER TABLE nominations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`; } catch (_) {}
    try { await sql`ALTER TABLE nominations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`; } catch (_) {}
    try { await sql`ALTER TABLE backup_snapshots ADD COLUMN IF NOT EXISTS created_at VARCHAR(100);`; } catch (_) {}
    
    await sql`
      CREATE TABLE IF NOT EXISTS nominal_roll (
        serial_number VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        class VARCHAR(255),
        admission_no VARCHAR(255),
        dept VARCHAR(255)
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS nominations (
        id VARCHAR(255) PRIMARY KEY,
        post VARCHAR(255),
        gender VARCHAR(50),
        dob VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        candidate_serial VARCHAR(255),
        proposer_serial VARCHAR(255),
        seconder_serial VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Pending',
        withdrawal_status VARCHAR(50) DEFAULT 'None',
        candidate_name VARCHAR(255),
        candidate_class VARCHAR(255),
        candidate_admission VARCHAR(255),
        candidate_dept VARCHAR(255),
        proposer_name VARCHAR(255),
        proposer_class VARCHAR(255),
        proposer_admission VARCHAR(255),
        proposer_dept VARCHAR(255),
        seconder_name VARCHAR(255),
        seconder_class VARCHAR(255),
        seconder_admission VARCHAR(255),
        seconder_dept VARCHAR(255),
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS roll_corrections (
        id VARCHAR(64) PRIMARY KEY,
        admission_no VARCHAR(255) NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        class_name VARCHAR(255),
        correction_type VARCHAR(100) NOT NULL,
        details TEXT NOT NULL,
        contact_info VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Pending',
        admin_notes TEXT,
        timestamp VARCHAR(100)
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS backup_snapshots (
        id VARCHAR(64) PRIMARY KEY,
        snapshot_name VARCHAR(255) NOT NULL,
        trigger_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        summary_json TEXT,
        data_json TEXT
      );
    `;
    await seedDefaultPostsIfEmpty();
    schemaEnsured = true;
  } catch (err) {
    console.warn('ensureSchema warning:', err.message);
  }
}

async function fetchPostsFromDb() {
  await ensureSchema();
  let rawPosts;
  try {
    rawPosts = await sql`
      SELECT 
        post, 
        female_only as "femaleOnly", 
        final_year_ineligible as "finalYearIneligible", 
        year_restriction as "yearRestriction", 
        dept_restriction as "deptRestriction",
        restricted_dept as "restrictedDept",
        year_rule_mode as "yearRuleMode",
        year_rule_years as "yearRuleYears"
      FROM posts
    `;
  } catch (err) {
    try {
      await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS restricted_dept VARCHAR(255);`;
      await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS year_rule_mode VARCHAR(20) DEFAULT 'ALL';`;
      await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS year_rule_years VARCHAR(255) DEFAULT '';`;
      rawPosts = await sql`
        SELECT 
          post, 
          female_only as "femaleOnly", 
          final_year_ineligible as "finalYearIneligible", 
          year_restriction as "yearRestriction", 
          dept_restriction as "deptRestriction",
          restricted_dept as "restrictedDept",
          year_rule_mode as "yearRuleMode",
          year_rule_years as "yearRuleYears"
        FROM posts
      `;
    } catch (retryErr) {
      console.warn('fetchPostsFromDb fallback to basic columns:', retryErr.message);
      try {
        const basic = await sql`
          SELECT 
            post, 
            female_only as "femaleOnly", 
            final_year_ineligible as "finalYearIneligible", 
            year_restriction as "yearRestriction", 
            dept_restriction as "deptRestriction"
          FROM posts
        `;
        rawPosts = basic.map(p => ({
          ...p,
          restrictedDept: p.deptRestriction && String(p.post || '').startsWith('Association Secretary ') ? p.post.replace('Association Secretary ', '').trim() : '',
          yearRuleMode: p.finalYearIneligible ? 'EXCLUDE' : (p.yearRestriction ? 'INCLUDE' : 'ALL'),
          yearRuleYears: p.finalYearIneligible ? '3_UG,2_PG' : (p.yearRestriction || '')
        }));
      } catch (finalErr) {
        console.warn('fetchPostsFromDb fallback to DEFAULT_POSTS:', finalErr.message);
        rawPosts = DEFAULT_POSTS;
      }
    }
  }

  if (!rawPosts || rawPosts.length === 0) {
    await seedDefaultPostsIfEmpty();
    try {
      rawPosts = await sql`
        SELECT 
          post, 
          female_only as "femaleOnly", 
          final_year_ineligible as "finalYearIneligible", 
          year_restriction as "yearRestriction", 
          dept_restriction as "deptRestriction",
          restricted_dept as "restrictedDept",
          year_rule_mode as "yearRuleMode",
          year_rule_years as "yearRuleYears"
        FROM posts
      `;
    } catch (_) {
      rawPosts = DEFAULT_POSTS;
    }
  }

  const orderRaw = await getSetting('posts_order');
  let orderList = safeJsonParse(orderRaw, []);
  let sortedPosts = (rawPosts || []);
  if (Array.isArray(orderList) && orderList.length > 0) {
    const orderMap = new Map(orderList.map((name, idx) => [name, idx]));
    sortedPosts = [...sortedPosts].sort((a, b) => {
      const idxA = orderMap.has(a.post) ? orderMap.get(a.post) : 9999;
      const idxB = orderMap.has(b.post) ? orderMap.get(b.post) : 9999;
      return idxA - idxB;
    });
  }

  return sortedPosts.map(p => {
    let yrYears = [];
    if (p.yearRuleYears) {
      yrYears = Array.isArray(p.yearRuleYears) ? p.yearRuleYears : String(p.yearRuleYears).split(',').map(y => y.trim()).filter(Boolean);
    } else {
      if (p.finalYearIneligible) yrYears = ['3_UG', '2_PG'];
      else if (p.yearRestriction === '1') yrYears = ['1_UG'];
      else if (p.yearRestriction === '2') yrYears = ['2_UG'];
      else if (p.yearRestriction === '3') yrYears = ['3_UG'];
      else if (p.yearRestriction === 'PG') yrYears = ['1_PG', '2_PG'];
      else if (p.yearRestriction === 'UG') yrYears = ['1_UG', '2_UG', '3_UG'];
      else if (p.yearRestriction === '1,2') yrYears = ['1_UG', '2_UG'];
    }
    const yrMode = p.yearRuleMode || (p.finalYearIneligible ? 'EXCLUDE' : (p.yearRestriction ? 'INCLUDE' : 'ALL'));

    return {
      post: p.post,
      femaleOnly: !!p.femaleOnly,
      finalYearIneligible: !!p.finalYearIneligible,
      yearRestriction: p.yearRestriction || '',
      deptRestriction: !!p.deptRestriction,
      restrictedDept: p.restrictedDept || (p.deptRestriction && String(p.post || '').startsWith('Association Secretary ') ? p.post.replace('Association Secretary ', '').trim() : ''),
      yearRuleMode: yrMode,
      yearRuleYears: yrYears
    };
  });
}

export default async function handler(req, res) {
  // CORS setup
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Password, X-Session-Token'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await ensureSchema();
    let action;
    let body = {};
    
    if (req.method === 'GET' || req.method === 'HEAD') {
      action = req.query?.action;
      body = req.query || {};
    } else if (req.method === 'POST') {
      if (typeof req.body === 'string') {
        try {
          body = JSON.parse(req.body) || {};
        } catch (_) {
          return errOut(res, 'Invalid JSON body in request', 400);
        }
      } else {
        body = req.body || {};
      }
      action = body.action;
    }

    // Extract auth from custom headers (preferred for GET) or body
    const adminPwd = req.headers['x-admin-password'] || body.password;
    const adminToken = req.headers['x-session-token'] || body.sessionToken;

    // Authenticate Admin Endpoints
    await checkAdmin(adminPwd, adminToken, action);

    // Cache-Control: Cache public read-only GET requests on Vercel's Edge CDN for 30s
    // with stale-while-revalidate=60 to absorb massive traffic surges (10,000+ students)
    const PUBLIC_CACHEABLE_ACTIONS = new Set([
      'getNominalRoll',
      'getPublicSchedule',
      'getSettings',
      'getPosts',
      'getResults',
      'getValidNominations',
      'getFinalNominations',
      'getPublicNominations'
    ]);

    const isPublicCacheable = req.method === 'GET' && 
      PUBLIC_CACHEABLE_ACTIONS.has(action) && 
      !adminPwd && 
      !adminToken;

    if (isPublicCacheable) {
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    } else {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }

    if (action === 'initDB') {
      await sql`
        CREATE TABLE IF NOT EXISTS settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS admin_sessions (
          token VARCHAR(255) PRIMARY KEY,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS posts (
          post VARCHAR(255) PRIMARY KEY,
          female_only BOOLEAN,
          final_year_ineligible BOOLEAN,
          year_restriction VARCHAR(50),
          dept_restriction BOOLEAN,
          restricted_dept VARCHAR(255),
          year_rule_mode VARCHAR(20) DEFAULT 'ALL',
          year_rule_years VARCHAR(255) DEFAULT ''
        );
      `;
      try {
        await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS restricted_dept VARCHAR(255);`;
        await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS year_rule_mode VARCHAR(20) DEFAULT 'ALL';`;
        await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS year_rule_years VARCHAR(255) DEFAULT '';`;
      } catch (e) {}
      await sql`
        CREATE TABLE IF NOT EXISTS nominal_roll (
          serial_number VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255),
          class VARCHAR(255),
          admission_no VARCHAR(255),
          dept VARCHAR(255)
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS nominations (
          id VARCHAR(255) PRIMARY KEY,
          post VARCHAR(255),
          gender VARCHAR(50),
          dob VARCHAR(50),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          candidate_serial VARCHAR(255),
          proposer_serial VARCHAR(255),
          seconder_serial VARCHAR(255),
          status VARCHAR(50) DEFAULT 'Pending',
          withdrawal_status VARCHAR(50) DEFAULT 'None',
          candidate_name VARCHAR(255),
          candidate_class VARCHAR(255),
          candidate_admission VARCHAR(255),
          candidate_dept VARCHAR(255),
          proposer_name VARCHAR(255),
          proposer_class VARCHAR(255),
          proposer_admission VARCHAR(255),
          proposer_dept VARCHAR(255),
          seconder_name VARCHAR(255),
          seconder_class VARCHAR(255),
          seconder_admission VARCHAR(255),
          seconder_dept VARCHAR(255),
          rejection_reason TEXT
        );
      `;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS unq_candidate_active ON nominations (candidate_serial) WHERE status != 'Rejected'`;
      await sql`
        CREATE TABLE IF NOT EXISTS roll_corrections (
          id VARCHAR(64) PRIMARY KEY,
          admission_no VARCHAR(255) NOT NULL,
          student_name VARCHAR(255) NOT NULL,
          department VARCHAR(255),
          class_name VARCHAR(255),
          correction_type VARCHAR(100) NOT NULL,
          details TEXT NOT NULL,
          contact_info VARCHAR(255),
          status VARCHAR(50) DEFAULT 'Pending',
          admin_notes TEXT,
          timestamp VARCHAR(100)
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS backup_snapshots (
          id VARCHAR(64) PRIMARY KEY,
          snapshot_name VARCHAR(255) NOT NULL,
          trigger_type VARCHAR(50) NOT NULL,
          created_at VARCHAR(100) NOT NULL,
          summary_json TEXT NOT NULL,
          data_json TEXT NOT NULL
        );
      `;
      await sql`INSERT INTO settings (key, value) VALUES ('draftRollPublished', 'false') ON CONFLICT (key) DO NOTHING;`;
      await sql`INSERT INTO settings (key, value) VALUES ('validListPublished', 'false') ON CONFLICT (key) DO NOTHING;`;
      await sql`INSERT INTO settings (key, value) VALUES ('finalListPublished', 'false') ON CONFLICT (key) DO NOTHING;`;
      await sql`INSERT INTO settings (key, value) VALUES ('resultsPublished', 'false') ON CONFLICT (key) DO NOTHING;`;
      await sql`INSERT INTO settings (key, value) VALUES ('resultsLocked', 'false') ON CONFLICT (key) DO NOTHING;`;
      await sql`INSERT INTO settings (key, value) VALUES ('countingActive', 'false') ON CONFLICT (key) DO NOTHING;`;
      await sql`INSERT INTO settings (key, value) VALUES ('nominationStart', '') ON CONFLICT (key) DO NOTHING;`;
      await sql`INSERT INTO settings (key, value) VALUES ('collegeName', 'Government Victoria College, Palakkad') ON CONFLICT (key) DO NOTHING;`;
      await sql`INSERT INTO settings (key, value) VALUES ('collegeShortName', 'GVC') ON CONFLICT (key) DO NOTHING;`;

      return jsonOut(res, { ok: true, message: 'Database initialized' });
    }


    const remapNominationsWithRoll = async () => {
      const existingNoms = await sql`
        SELECT id, post, candidate_admission, candidate_name, 
               proposer_admission, proposer_name, 
               seconder_admission, seconder_name 
        FROM nominations
      `;
      if (existingNoms.length === 0) return { total: 0, remapped: 0, details: [] };

      const allStudents = await sql`
        SELECT serial_number, name, class, admission_no, dept 
        FROM nominal_roll
      `;
      
      const admMap = new Map();
      const nameMap = new Map();

      for (const s of allStudents) {
        const admClean = String(s.admission_no || '').trim().toLowerCase();
        if (admClean) admMap.set(admClean, s);

        const nameClean = String(s.name || '').trim().toLowerCase();
        if (nameClean && !nameMap.has(nameClean)) nameMap.set(nameClean, s);
      }

      const findStudent = (adm, name) => {
        const admClean = String(adm || '').trim().toLowerCase();
        if (admClean && admMap.has(admClean)) return admMap.get(admClean);

        const nameClean = String(name || '').trim().toLowerCase();
        if (nameClean && nameMap.has(nameClean)) return nameMap.get(nameClean);

        return null;
      };

      let remappedCount = 0;
      const details = [];

      for (const n of existingNoms) {
        const cand = findStudent(n.candidate_admission, n.candidate_name);
        const prop = findStudent(n.proposer_admission, n.proposer_name);
        const sec = findStudent(n.seconder_admission, n.seconder_name);

        await sql`
          UPDATE nominations SET
            candidate_serial = ${cand ? cand.serial_number : null},
            candidate_name = ${cand ? cand.name : n.candidate_name},
            candidate_class = ${cand ? cand.class : null},
            candidate_dept = ${cand ? cand.dept : null},
            proposer_serial = ${prop ? prop.serial_number : null},
            proposer_name = ${prop ? prop.name : n.proposer_name},
            proposer_class = ${prop ? prop.class : null},
            proposer_dept = ${prop ? prop.dept : null},
            seconder_serial = ${sec ? sec.serial_number : null},
            seconder_name = ${sec ? sec.name : n.seconder_name},
            seconder_class = ${sec ? sec.class : null},
            seconder_dept = ${sec ? sec.dept : null}
          WHERE id = ${n.id}
        `;

        if (cand || prop || sec) {
          remappedCount++;
        }

        details.push({
          id: n.id,
          post: n.post,
          candidate: cand ? { serial: cand.serial_number, name: cand.name, adm: cand.admission_no } : null,
          proposer: prop ? { serial: prop.serial_number, name: prop.name, adm: prop.admission_no } : null,
          seconder: sec ? { serial: sec.serial_number, name: sec.name, adm: sec.admission_no } : null
        });
      }

      return { total: existingNoms.length, remapped: remappedCount, details };
    };


    // ─── GET ENDPOINTS ────────────────────────────────────────────────────────

    if (action === 'getPublicNominations') {
      const noms = await sql`SELECT post, candidate_serial, proposer_serial, seconder_serial, status FROM nominations WHERE status != 'Rejected'`;
      return jsonOut(res, noms.map(n => ({
        post: n.post, candidateSerial: n.candidate_serial, proposerSerial: n.proposer_serial, seconderSerial: n.seconder_serial, status: n.status
      })));
    }
    
    if (action === 'getNominalRoll') {
      const roll = await sql`
        SELECT serial_number as "Nominal Roll Serial Number", name as "NAME", class as "CLASS", admission_no as "ADMISION NO", dept as "Dept" 
        FROM nominal_roll
        ORDER BY 
          CASE 
            WHEN serial_number ~ '^[0-9]+$' THEN CAST(serial_number AS BIGINT) 
            WHEN regexp_replace(serial_number, '^D', '', 'i') ~ '^[0-9]+[a-zA-Z]*$' THEN CAST(regexp_replace(regexp_replace(serial_number, '^D', '', 'i'), '[^0-9]', '', 'g') AS BIGINT)
            ELSE 999999999 
          END ASC, 
          serial_number ASC
      `;
      return jsonOut(res, roll);
    }
    
    if (action === 'getPosts' || action === 'adminGetPosts') {
      const normalized = await fetchPostsFromDb();
      return jsonOut(res, normalized);
    }

    if (action === 'getSettings' || action === 'adminGetSettings') {
      const status = await getFullElectionStatus();
      const [colName, colShort, colLogo] = await Promise.all([
        getSetting('collegeName'),
        getSetting('collegeShortName'),
        getSetting('collegeLogo')
      ]);
      const obj = {
        ...status,
        collegeName: colName || 'Government Victoria College, Palakkad',
        collegeShortName: colShort || 'GVC',
        collegeLogo: colLogo || ''
      };
      if (action === 'adminGetSettings') {
        const rows = await sql`SELECT value FROM settings WHERE key = 'adminEmail'`;
        obj.adminEmail = rows.length > 0 ? rows[0].value : 'admin@example.com';
      }
      return jsonOut(res, obj);
    }

    if (action === 'getPublicSchedule') {
      const status = await getFullElectionStatus();
      return jsonOut(res, status);
    }

    if (action === 'adminGetNominations') {
      const noms = await sql`
        SELECT * FROM nominations 
        ORDER BY 
          CASE 
            WHEN candidate_serial ~ '^[0-9]+$' THEN CAST(candidate_serial AS BIGINT) 
            ELSE 999999999 
          END ASC, 
          timestamp ASC,
          id ASC
      `;
      return jsonOut(res, noms.map(n => ({
        id: n.id, post: n.post, gender: n.gender, dob: n.dob, timestamp: n.timestamp || n.created_at,
        candidateSerial: n.candidate_serial, proposerSerial: n.proposer_serial, seconderSerial: n.seconder_serial,
        candidateAdmission: n.candidate_admission, proposerAdmission: n.proposer_admission, seconderAdmission: n.seconder_admission,
        status: n.status, withdrawalStatus: n.withdrawal_status, rejectionReason: n.rejection_reason,
        candidate: { 'Nominal Roll Serial Number': n.candidate_serial, 'NAME': n.candidate_name, 'CLASS': n.candidate_class, 'ADMISION NO': n.candidate_admission, 'Dept': n.candidate_dept },
        proposer: { 'Nominal Roll Serial Number': n.proposer_serial, 'NAME': n.proposer_name, 'CLASS': n.proposer_class, 'ADMISION NO': n.proposer_admission, 'Dept': n.proposer_dept },
        seconder: { 'Nominal Roll Serial Number': n.seconder_serial, 'NAME': n.seconder_name, 'CLASS': n.seconder_class, 'ADMISION NO': n.seconder_admission, 'Dept': n.seconder_dept },
        candidateName: n.candidate_name, candidateClass: n.candidate_class, candidateDept: n.candidate_dept,
        proposerName: n.proposer_name, seconderName: n.seconder_name
      })));
    }

    if (action === 'getNomination') {
      const id = body.id;
      const rows = await sql`SELECT * FROM nominations WHERE id = ${id}`;
      if (!rows.length) return errOut(res, 'Nomination not found.', 404);
      const n = rows[0];
      return jsonOut(res, {
        id: n.id, post: n.post, gender: n.gender, dob: n.dob, timestamp: n.timestamp,
        candidateSerial: n.candidate_serial, proposerSerial: n.proposer_serial, seconderSerial: n.seconder_serial,
        candidateAdmission: n.candidate_admission, proposerAdmission: n.proposer_admission, seconderAdmission: n.seconder_admission,
        status: n.status, withdrawalStatus: n.withdrawal_status, rejectionReason: n.rejection_reason,
        candidate: { 'Nominal Roll Serial Number': n.candidate_serial, 'NAME': n.candidate_name, 'CLASS': n.candidate_class, 'ADMISION NO': n.candidate_admission, 'Dept': n.candidate_dept },
        proposer: { 'Nominal Roll Serial Number': n.proposer_serial, 'NAME': n.proposer_name, 'CLASS': n.proposer_class, 'ADMISION NO': n.proposer_admission, 'Dept': n.proposer_dept },
        seconder: { 'Nominal Roll Serial Number': n.seconder_serial, 'NAME': n.seconder_name, 'CLASS': n.seconder_class, 'ADMISION NO': n.seconder_admission, 'Dept': n.seconder_dept },
        candidateName: n.candidate_name, candidateClass: n.candidate_class, candidateDept: n.candidate_dept,
        proposerName: n.proposer_name, seconderName: n.seconder_name
      });
    }

    if (action === 'getValidNominations') {
      const validOverride = (await getSetting('validListOverride')) || 'AUTO';
      const legacyPublished = await getSetting('validListPublished');
      const validStart = await getSetting('validListStart');
      const validEnd = await getSetting('validListEnd');
      const published = evaluateStageStatus(validOverride, legacyPublished, validStart, validEnd);
      if (!published) return jsonOut(res, []);
      const noms = await sql`
        SELECT * FROM nominations 
        WHERE status = 'Valid'
        ORDER BY 
          CASE 
            WHEN candidate_serial ~ '^[0-9]+$' THEN CAST(candidate_serial AS BIGINT) 
            ELSE 999999999 
          END ASC,
          candidate_name ASC
      `;
      return jsonOut(res, noms.map(n => ({ 
        post: n.post, 
        candidateSerial: n.candidate_serial,
        candidateAdmission: n.candidate_admission,
        candidateName: n.candidate_name, 
        candidateClass: n.candidate_class, 
        candidateDept: n.candidate_dept, 
        status: n.status 
      })));
    }

    if (action === 'getFinalNominations') {
      const finalOverride = (await getSetting('finalListOverride')) || 'AUTO';
      const legacyPublished = await getSetting('finalListPublished');
      const finalStart = await getSetting('finalListStart');
      const finalEnd = await getSetting('finalListEnd');
      const published = evaluateStageStatus(finalOverride, legacyPublished, finalStart, finalEnd);
      if (!published) return jsonOut(res, { active: [], withdrawn: [] });
      const noms = await sql`
        SELECT * FROM nominations 
        WHERE status = 'Valid'
        ORDER BY 
          CASE 
            WHEN candidate_serial ~ '^[0-9]+$' THEN CAST(candidate_serial AS BIGINT) 
            ELSE 999999999 
          END ASC,
          candidate_name ASC
      `;
      return jsonOut(res, {
        active: noms.filter(n => n.withdrawal_status !== 'Approved').map(n => ({ 
          id: n.id, 
          post: n.post, 
          candidateSerial: n.candidate_serial,
          candidateAdmission: n.candidate_admission,
          candidateName: n.candidate_name, 
          candidateClass: n.candidate_class, 
          candidateDept: n.candidate_dept 
        })),
        withdrawn: noms.filter(n => n.withdrawal_status === 'Approved').map(n => ({ 
          id: n.id, 
          post: n.post, 
          candidateSerial: n.candidate_serial,
          candidateAdmission: n.candidate_admission,
          candidateName: n.candidate_name, 
          candidateClass: n.candidate_class, 
          candidateDept: n.candidate_dept 
        }))
      });
    }

    if (action === 'adminGetFinalNominations') {
      const published = await getSetting('finalListPublished');
      const isPublished = published === 'true';
      let noms;
      if (isPublished) {
        noms = await sql`
          SELECT * FROM nominations 
          WHERE status = 'Valid'
          ORDER BY 
            CASE 
              WHEN candidate_serial ~ '^[0-9]+$' THEN CAST(candidate_serial AS BIGINT) 
              ELSE 999999999 
            END ASC,
            candidate_name ASC
        `;
      } else {
        noms = await sql`
          SELECT * FROM nominations 
          WHERE status != 'Rejected'
          ORDER BY 
            CASE 
              WHEN candidate_serial ~ '^[0-9]+$' THEN CAST(candidate_serial AS BIGINT) 
              ELSE 999999999 
            END ASC,
            candidate_name ASC
        `;
      }
      return jsonOut(res, {
        isPublished,
        active: noms.filter(n => n.withdrawal_status !== 'Approved').map(n => ({ 
          id: n.id, 
          post: n.post, 
          candidateSerial: n.candidate_serial,
          candidateAdmission: n.candidate_admission,
          candidateName: n.candidate_name, 
          candidateClass: n.candidate_class, 
          candidateDept: n.candidate_dept 
        })),
        withdrawn: noms.filter(n => n.withdrawal_status === 'Approved').map(n => ({ 
          id: n.id, 
          post: n.post, 
          candidateSerial: n.candidate_serial,
          candidateAdmission: n.candidate_admission,
          candidateName: n.candidate_name, 
          candidateClass: n.candidate_class, 
          candidateDept: n.candidate_dept 
        }))
      });
    }

    if (action === 'adminGetBooths') {
      const data = await getSetting('booths_data');
      return jsonOut(res, safeJsonParse(data, []));
    }

    if (action === 'adminGetLocations') {
      const data = await getSetting('availableLocations');
      return jsonOut(res, safeJsonParse(data, []));
    }

    if (action === 'adminGetNotices') {
      const [noticesRaw, boothsRaw, locationsRaw, status, colName, colShort, colLogo, electionYearSetting, postsList] = await Promise.all([
        getSetting('official_notices'),
        getSetting('booths_data'),
        getSetting('availableLocations'),
        getFullElectionStatus(),
        getSetting('collegeName'),
        getSetting('collegeShortName'),
        getSetting('collegeLogo'),
        getSetting('electionYear'),
        fetchPostsFromDb()
      ]);

      let parsedNotices = safeJsonParse(noticesRaw, []);

      // Auto-sanitize notice #1 if it contains obsolete Lyngdoh norms or is missing the configured posts
      const statNotif = parsedNotices.find(n => n.id === 'statutory_notice_election_notification');
      if (statNotif) {
        const text = String(statNotif.content || '');
        const hasLyngdoh = text.toLowerCase().includes('lyngdoh');
        const missingPosts = !text.includes('### Main Office Bearers') || !text.includes('### Association Secretaries');
        if (hasLyngdoh || missingPosts) {
          const freshPosts = Array.isArray(postsList) && postsList.length > 0 ? postsList : [];
          const assocSec = freshPosts.filter(p => {
            const pName = String(p.post || '').trim().toLowerCase();
            return pName.startsWith('association secretary') || (p.deptRestriction && pName.includes('secretary')) || p.deptRestriction || p.restrictedDept;
          });
          const classRep = freshPosts.filter(p => {
            const pName = String(p.post || '').trim().toLowerCase();
            return !assocSec.includes(p) && (pName.includes('representative') || pName.includes('rep') || p.yearRestriction);
          });
          const mainOffice = freshPosts.filter(p => !assocSec.includes(p) && !classRep.includes(p));

          const fmt = (p) => {
            const pN = String(p.post || '').trim().toUpperCase();
            const notes = [];
            if (pN.includes('UNIVERSITY UNION COUNCILLOR') && !pN.includes('POST')) notes.push('2 Posts');
            if (p.femaleOnly && !pN.includes('WOMEN') && !pN.includes('FEMALE') && !pN.includes('LADY')) notes.push('Reserved for Women');
            if (p.finalYearIneligible) notes.push('Final Year Ineligible');
            if (p.deptRestriction && p.restrictedDept && !pN.includes(p.restrictedDept.toUpperCase())) notes.push(`Dept: ${p.restrictedDept}`);
            return `- **${pN}**${notes.length ? ` *(${notes.join(', ')})*` : ''}`;
          };

          const mText = mainOffice.length ? mainOffice.map(fmt).join('\n') : '- **THE CHAIRMAN**\n- **THE VICE CHAIRMAN** *(Reserved for Women)*\n- **THE SECRETARY**\n- **THE JOINT SECRETARY** *(Reserved for Women)*\n- **THE CHIEF STUDENT EDITOR** *(Final Year Ineligible)*\n- **THE SECRETARY FINE ARTS**\n- **THE GENERAL CAPTAIN FOR SPORTS AND GAMES**\n- **THE UNIVERSITY UNION COUNCILLOR** *(2 Posts)*';
          const cText = classRep.length ? classRep.map(fmt).join('\n') : '- **I UG REPRESENTATIVE**\n- **II UG REPRESENTATIVE**\n- **III UG REPRESENTATIVE**\n- **PG REPRESENTATIVE**';
          const aText = assocSec.length ? assocSec.map(fmt).join('\n') : '- **ASSOCIATION SECRETARY BOTANY**\n- **ASSOCIATION SECRETARY CHEMISTRY**\n- **ASSOCIATION SECRETARY COMMERCE**\n- **ASSOCIATION SECRETARY COMPUTER SCIENCE**\n- **ASSOCIATION SECRETARY ECONOMICS**\n- **ASSOCIATION SECRETARY ENGLISH**\n- **ASSOCIATION SECRETARY HINDI**\n- **ASSOCIATION SECRETARY HISTORY**\n- **ASSOCIATION SECRETARY MALAYALAM**\n- **ASSOCIATION SECRETARY MATHEMATICS**\n- **ASSOCIATION SECRETARY PHYSICS**\n- **ASSOCIATION SECRETARY PSYCHOLOGY**\n- **ASSOCIATION SECRETARY SANSKRIT**\n- **ASSOCIATION SECRETARY TAMIL**\n- **ASSOCIATION SECRETARY ZOOLOGY**';

          const yr = electionYearSetting || status?.electionYear || '2026';
          const nxtYr = String(parseInt(yr, 10) + 1);
          const cName = colName || 'College Union';

          statNotif.title = `ELECTION NOTIFICATION ${yr}`;
          statNotif.refNo = `U.O.No. 12646/2026/Admn (File Ref.No.190115/DSW-ASST-2/2026/Admn)`;
          statNotif.date = `29-09-2026`;
          statNotif.signatoryTitle = `Returning Officer, ${cName}`;
          statNotif.content = `### UNIVERSITY REGULATION & ELECTION NOTIFICATION
**Reference:** University of Calicut Order **U.O.No. 12646/2026/Admn** dated **11.09.2026** (File Ref.No. **190115/DSW-ASST-2/2026/Admn**), Department of Students' Welfare.  
**Read:** Orders of the Hon'ble Vice-Chancellor dated 11.09.2026 approving the College Union Election Schedule for the Academic Year ${yr}–${nxtYr}.

---

In pursuance of the University of Calicut Order cited above and in accordance with the provisions of the Calicut University Act and College Union Election Statutes, it is hereby notified for the information of all students and electors of **${cName}** that the election to the College Union for the Academic Year **${yr}–${nxtYr}** will be conducted as per the statutory schedule mandated by the University.

The election will be held for the following posts:

### Main Office Bearers
${mText}

### Class Representatives
${cText}

### Association Secretaries
${aText}

---

### Official Election Schedule (Academic Year ${yr}–${nxtYr})

| Activity | Date | Day | Time |
| :--- | :---: | :---: | :---: |
| Publication of the Preliminary Electoral Roll | 23-09-2026 | Wednesday | 11:00 AM |
| Last date and time for correction/addition/deletion in the Preliminary Electoral Roll | 25-09-2026 | Friday | 4:00 PM |
| Publication of the Final Electoral Roll | 28-09-2026 | Monday | 4:00 PM |
| Date of Notification of the Election for the Academic Year 2026–27 | 29-09-2026 | Tuesday | 4:00 PM |
| Last Date and Time for Submission of Nominations | 01-10-2026 | Thursday | Until 12:00 Noon |
| Date and Time for Scrutiny of Nominations | 01-10-2026 | Thursday | 2:00 PM |
| Date and Time for Publication of the List of Valid Nominations | 01-10-2026 | Thursday | 5:00 PM |
| Last Date and Time for Withdrawal of Nominations | 05-10-2026 | Monday | Until 12:00 Noon |
| Date and Time for Publication of the Final List of Nominations | 05-10-2026 | Monday | 5:00 PM |
| Date and Time for Polling – Presidential Mode &amp; Union Office Bearers Election | 15-10-2026 | Thursday | 9:30 AM to 12:30 PM |
| Date and Time for Counting of Votes &amp; Declaration of Results | 15-10-2026 | Thursday | From 2:00 PM onwards |

---

All students are directed to strictly adhere to the University Code of Conduct, the Calicut University Student Union Election Bye-laws, and campus discipline rules. Nomination forms and related documents are available at the college election portal.

**Returning Officer**  
*(College Seal)*`;

          await setSetting('official_notices', JSON.stringify(parsedNotices));
        }
      }

      return jsonOut(res, {
        notices: parsedNotices,
        booths: safeJsonParse(boothsRaw, []),
        locations: safeJsonParse(locationsRaw, []),
        posts: postsList || [],
        schedule: status,
        settings: {
          collegeName: colName || '',
          collegeShortName: colShort || '',
          electionYear: electionYearSetting || status?.electionYear || '',
          collegeLogo: colLogo || ''
        }
      });
    }

    if (action === 'getResults') {
      const resOverride = (await getSetting('resultsOverride')) || 'AUTO';
      const legacyPublished = await getSetting('resultsPublished');
      const resultsStart = await getSetting('resultsStart');
      const resultsEnd = await getSetting('resultsEnd');
      const published = evaluateStageStatus(resOverride, legacyPublished, resultsStart, resultsEnd);
      const countingActive = (await getSetting('countingActive')) === 'true';
      const locked = (await getSetting('resultsLocked')) === 'true';
      if (!published) {
        return jsonOut(res, { results: [], published: false, countingActive, locked });
      }
      const data = await getSetting('results_data');
      return jsonOut(res, {
        results: safeJsonParse(data, []),
        published: true,
        countingActive,
        locked
      });
    }

    if (action === 'adminGetResults') {
      const data = await getSetting('results_data');
      return jsonOut(res, safeJsonParse(data, []));
    }

    if (action === 'adminGetCountingMatrix') {
      const data = await getSetting('countingMatrix');
      return jsonOut(res, safeJsonParse(data, null));
    }

    if (action === 'adminGetBallotConfig') {
      const data = await getSetting('general_ballot_config');
      return jsonOut(res, safeJsonParse(data, null));
    }

    if (action === 'adminSaveBallotConfig') {
      const config = body.config;
      await setSetting('general_ballot_config', JSON.stringify(config));
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminGetBallotPlan') {
      const data = await getSetting('ballotPlan');
      if (!data) return jsonOut(res, null);
      return jsonOut(res, safeJsonParse(data, null));
    }

    if (action === 'adminGenerateBallotPlan') {
      const posts = await fetchPostsFromDb();

      let nomRows = await sql`SELECT * FROM nominations WHERE status = 'Valid'`;
      if (nomRows.length === 0) {
        nomRows = await sql`SELECT * FROM nominations WHERE status != 'Rejected'`;
      }
      const candidates = nomRows.filter(n => n.withdrawal_status !== 'Approved');

      const boothsDataRaw = await getSetting('booths_data');
      const booths = safeJsonParse(boothsDataRaw, []);
      booths.sort((a, b) => Number(a.boothNumber) - Number(b.boothNumber));

      const students = await sql`SELECT serial_number as "Nominal Roll Serial Number", name as "NAME", class as "CLASS", admission_no as "ADMISION NO", dept as "Dept" FROM nominal_roll`;

      const isAssoc = (p) => {
        const name = String(p.post || '').toUpperCase();
        return name.includes('ASSOCIATION') || name.includes('ASSOC') || !!p.deptRestriction;
      };
      const isUUC = (p) => {
        const name = String(p.post || '').toUpperCase();
        return name.includes('UUC') || name.includes('UNIVERSITY UNION COUNCILLOR');
      };
      const isYear = (p) => {
        if (isAssoc(p) || isUUC(p)) return false;
        const name = String(p.post || '').toUpperCase();
        return name.includes('REPRESENTATIVE') || name.includes('REP');
      };

      const contestablePosts = posts.filter(p => {
        const pCands = candidates.filter(c => c.post === p.post);
        return pCands.length > 1;
      });

      const genContestablePosts = contestablePosts.filter(p => !isAssoc(p) && !isYear(p));

      // Retrieve Ballot Configuration for General Posts (Split or Unified)
      const rawBallotConfig = await getSetting('general_ballot_config');
      const ballotConfig = safeJsonParse(rawBallotConfig, null);
      const isSplit = !!(ballotConfig && ballotConfig.isSplit && Array.isArray(ballotConfig.ballots) && ballotConfig.ballots.length > 1);

      let generalParts = [];
      if (isSplit) {
        generalParts = ballotConfig.ballots.map((b, idx) => ({
          id: b.id || `gen_${idx + 1}`,
          partNumber: idx + 1,
          title: b.title || `General Union Posts - Part ${idx + 1}`,
          shortCode: b.shortCode || `G${idx + 1}`,
          bookPrefix: b.bookPrefix || `GB${idx + 1}-`,
          paperSize: b.paperSize || 'A3',
          posts: Array.isArray(b.posts) ? [...b.posts] : []
        }));
      } else {
        generalParts = [{
          id: 'gen_main',
          partNumber: 1,
          title: 'General Union Posts',
          shortCode: 'G',
          bookPrefix: 'GB',
          paperSize: 'A3',
          posts: genContestablePosts.map(p => p.post)
        }];
      }

      // Ensure any unassigned general contestable posts are allocated to Part 1
      const allAssigned = new Set();
      generalParts.forEach(gp => gp.posts.forEach(p => allAssigned.add(p)));
      genContestablePosts.forEach(p => {
        if (!allAssigned.has(p.post)) {
          generalParts[0].posts.push(p.post);
          allAssigned.add(p.post);
        }
      });

      let repSl = 1, assocSl = 1;
      let rbCount = 0, abCount = 0;

      const standard = 50;
      const threshold = 15;

      const calcBooks = (count, start, prefix, currentGlobalBookCount, customBookPrefix = null) => {
        if (!count || count <= 0) return { books: [], ids: '-', count: 0, nextCounter: currentGlobalBookCount };
        let current = start;
        let books = [];
        const idPrefix = customBookPrefix || (prefix === 'G' ? 'GB' : (prefix === 'R' ? 'RB' : 'AB'));
        let counter = currentGlobalBookCount;
        let ids = [];

        const formatSlip = (num) => {
          if (prefix === 'G' || prefix === 'R' || prefix === 'A') {
            return `${prefix}${num}`;
          }
          return `${prefix}-${num}`;
        };

        const createRange = (size) => {
          counter++;
          const id = (idPrefix.endsWith('-') ? idPrefix : idPrefix) + counter;
          ids.push(id);
          const range = `${formatSlip(current)} - ${formatSlip(current + size - 1)}`;
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

        return { 
          books, 
          ids: ids.length === 1 ? ids[0] : `${ids[0]} to ${ids[ids.length - 1]}`, 
          nextCounter: counter 
        };
      };

      const boothMap = {};
      booths.forEach(b => {
        boothMap[b.boothNumber] = { general: null, generalParts: [], reps: [], assocs: [] };
      });

      const isStudentInBoothServer = (s, bClasses) => {
        if (!bClasses || !bClasses.length) return false;
        const rawClass = String(s.CLASS || '').trim().toUpperCase();
        if (bClasses.includes(rawClass)) return true;
        const dept = String(s.Dept || '').trim().toUpperCase();
        if (rawClass.includes('RESEARCH') || rawClass.includes('SCHOLAR') || rawClass.includes('PHD') || rawClass.includes('PH.D')) {
          const deptKey = `RESEARCH SCHOLAR - ${dept}`.toUpperCase();
          return bClasses.includes(deptKey);
        }
        return false;
      };

      // 1. General Posts (Single or Split Parts)
      const genPartsResults = [];
      generalParts.forEach(gp => {
        let partSl = 1;
        let partBookCount = 0;
        const partBoothResults = [];

        booths.forEach(b => {
          const bClasses = (Array.isArray(b.classes) ? b.classes : safeJsonParse(b.classes, [])).map(c => String(c).trim().toUpperCase());
          const boothStudents = students.filter(s => isStudentInBoothServer(s, bClasses));
          const count = boothStudents.length;
          const start = partSl;
          const end = start + count - 1;
          const bookData = calcBooks(count, start, gp.shortCode, partBookCount, gp.bookPrefix);
          partBookCount = bookData.nextCounter;

          const data = {
            partId: gp.id,
            partNumber: gp.partNumber,
            title: gp.title,
            prefix: gp.shortCode,
            booth: b.boothNumber,
            count,
            start,
            end,
            books: bookData.books,
            bookIds: bookData.ids
          };
          partBoothResults.push(data);
          boothMap[b.boothNumber].generalParts.push(data);
          partSl += count;
        });

        const partSummary = {
          id: gp.id,
          partNumber: gp.partNumber,
          title: gp.title,
          shortCode: gp.shortCode,
          bookPrefix: gp.bookPrefix,
          paperSize: gp.paperSize,
          posts: gp.posts,
          results: partBoothResults,
          total: partSl - 1
        };
        genPartsResults.push(partSummary);
      });

      // Backward compatibility: boothMap[b.boothNumber].general points to Part 1
      booths.forEach(b => {
        boothMap[b.boothNumber].general = boothMap[b.boothNumber].generalParts[0] || null;
      });

      // 2. Reps (filtered using isYearEligibleServer)
      const repResults = [];
      const yrPosts = contestablePosts.filter(p => isYear(p) && !isAssoc(p));
      yrPosts.forEach(p => {
        booths.forEach(b => {
          const bClasses = (Array.isArray(b.classes) ? b.classes : safeJsonParse(b.classes, [])).map(c => String(c).trim().toUpperCase());
          const boothStudents = students.filter(s => isStudentInBoothServer(s, bClasses));
          const targetStudents = boothStudents.filter(s => {
            const cls = String(s.CLASS || '').toUpperCase();
            if (cls.includes('PH D') || cls.includes('PH.D')) return false;
            return isYearEligibleServer(cls, p);
          });

          if (targetStudents.length > 0) {
            const count = targetStudents.length;
            const start = repSl;
            const end = start + count - 1;
            const bookData = calcBooks(count, start, 'R', rbCount);
            rbCount = bookData.nextCounter;

            const data = { post: p.post, booth: b.boothNumber, count, start, end, books: bookData.books, bookIds: bookData.ids };
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
        let dept = String(p.restrictedDept || p.post || '').toUpperCase();
        if (dept.includes(prefix.toUpperCase())) dept = dept.split(prefix.toUpperCase())[1].trim();
        dept = dept.replace(/[-\s]/g, ' ').trim();

        booths.forEach(b => {
          const bClasses = (Array.isArray(b.classes) ? b.classes : safeJsonParse(b.classes, [])).map(c => String(c).trim().toUpperCase());
          const boothStudents = students.filter(s => isStudentInBoothServer(s, bClasses));
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

            const data = { post: p.post, booth: b.boothNumber, count, start, end, books: bookData.books, bookIds: bookData.ids };
            assocResults.push(data);
            boothMap[b.boothNumber].assocs.push(data);
            assocSl += count;
          }
        });
      });

      const plan = {
        isSplit,
        general: genPartsResults[0] || { results: [], total: 0 },
        generalParts: genPartsResults,
        reps: { results: repResults, total: repSl - 1 },
        assocs: { results: assocResults, total: assocSl - 1 },
        boothAssignments: boothMap
      };

      await setSetting('ballotPlan', JSON.stringify(plan));
      return jsonOut(res, { ok: true, plan });
    }

    if (action === 'adminGetNominalRollTemplate') {
      const headers = ['Nominal Roll Serial Number', 'NAME', 'YEAR', 'STREAM', 'ADMISION NO', 'Dept'];
      const rows = [
        ['1', 'Jane Doe', '1', 'B.A', '12345', 'Economics'],
        ['2', 'John Smith', '2', 'B.Sc', '12346', 'Physics']
      ];
      return jsonOut(res, { headers, rows });
    }

    // ─── POST ENDPOINTS ───────────────────────────────────────────────────────

    if (action === 'adminLogin') {
      // In a real app, generate a JWT. For this, we'll just check password and return a static token for demo,
      // but OTP is required in the UI, so adminLogin just checks if password is correct before proceeding.
      const rows = await sql`SELECT value FROM settings WHERE key = 'adminPassword'`;
      const realPwd = rows.length > 0 ? rows[0].value : 'admin123';
      if (body.password !== realPwd) return errOut(res, 'Invalid password', 401);
      return jsonOut(res, { ok: true }); // UI proceeds to OTP
    }

    if (action === 'adminSendOTP') {
      const pwdRows = await sql`SELECT value FROM settings WHERE key = 'adminPassword'`;
      const realPwd = pwdRows.length > 0 ? pwdRows[0].value : 'admin123';
      if (body.password !== realPwd) return errOut(res, 'UNAUTHORIZED_PASSWORD_MISMATCH', 401);

      const rows = await sql`SELECT value FROM settings WHERE key = 'adminEmail'`;
      const adminEmail = rows.length > 0 ? rows[0].value : 'admin@example.com';
      
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await setSetting('adminOTP', otp); // Store it
      
      if (adminEmail === 'admin@example.com') {
        // Initial setup fallback: Don't send email, just tell them to use a master code
        return jsonOut(res, { ok: true, email: 'admin@example.com (Initial Setup: Use OTP 000000)' });
      }
      
      try {
        await resend.emails.send({
          from: 'Election Admin <onboarding@resend.dev>',
          to: adminEmail,
          subject: 'Your Admin Login OTP',
          text: `Your OTP for the Election Admin Portal is: ${otp}`
        });
        const masked = adminEmail.replace(/^(..)(.*)(@.*)$/, '$1***$3');
        return jsonOut(res, { ok: true, email: masked });
      } catch (err) {
        return errOut(res, 'Failed to send OTP email. Please check your Resend configuration.');
      }
    }

    if (action === 'adminLogout') {
      if (sessionToken) {
        await sql`DELETE FROM admin_sessions WHERE token = ${sessionToken}`;
      }
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminFactoryReset') {
      await checkAdmin(adminPwd, adminToken, action);

      // Verify OTP again
      const emailRows = await sql`SELECT value FROM settings WHERE key = 'adminEmail'`;
      const adminEmail = emailRows.length > 0 ? emailRows[0].value : 'admin@example.com';
      
      let otpValid = false;
      if (adminEmail === 'admin@example.com' && body.otp === '000000') {
        otpValid = true;
      } else {
        const stored = await getSetting('adminOTP');
        if (stored && stored === body.otp) {
          otpValid = true;
        }
      }
      
      if (!otpValid) return errOut(res, 'Invalid or expired OTP', 401);
      
      // Clear the OTP to prevent reuse
      await setSetting('adminOTP', '');

      // Wipe transactional data
      await sql`TRUNCATE TABLE nominal_roll`;
      await sql`TRUNCATE TABLE nominations`;
      try { await sql`TRUNCATE TABLE roll_corrections`; } catch(_) {}

      // Reset election state flags and delete transactional settings
      await setSetting('isRollFinalized', 'false');
      await setSetting('draftRollPublished', 'false');
      await setSetting('validListPublished', 'false');
      await setSetting('finalListPublished', 'false');
      await setSetting('resultsPublished', 'false');
      await setSetting('resultsLocked', 'false');
      await setSetting('countingActive', 'false');
      await sql`DELETE FROM settings WHERE key IN ('ballotPlan', 'general_ballot_config', 'booths_data', 'availableLocations', 'results_data', 'countingMatrix', 'posts_order')`;

      return jsonOut(res, { ok: true });
    }

    if (action === 'adminVerifyOTP') {
      const pwdRows = await sql`SELECT value FROM settings WHERE key = 'adminPassword'`;
      const realPwd = pwdRows.length > 0 ? pwdRows[0].value : 'admin123';
      if (body.password !== realPwd) return errOut(res, 'UNAUTHORIZED_PASSWORD_MISMATCH', 401);

      const emailRows = await sql`SELECT value FROM settings WHERE key = 'adminEmail'`;
      const adminEmail = emailRows.length > 0 ? emailRows[0].value : 'admin@example.com';
      
      let verified = false;
      if (adminEmail === 'admin@example.com' && body.otp === '000000') {
        verified = true;
      } else {
        const stored = await getSetting('adminOTP');
        
        // Always clear the OTP upon any verification attempt to prevent brute-force
        if (stored) await setSetting('adminOTP', ''); 
        
        if (!stored || stored !== body.otp) return errOut(res, 'Invalid or expired OTP', 401);
        verified = true;
      }

      if (verified) {
        const token = crypto.randomUUID();
        await sql`INSERT INTO admin_sessions (token) VALUES (${token})`;
        return jsonOut(res, { ok: true, sessionToken: token });
      }
    }

    if (action === 'adminUpdateCredentials') {
      if (body.newPassword) await setSetting('adminPassword', body.newPassword);
      if (body.newEmail) await setSetting('adminEmail', body.newEmail);
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminSaveSchedule') {
      // General
      if (body.electionYear !== undefined) await setSetting('electionYear', body.electionYear || new Date().getFullYear().toString());
      if (body.notificationDate !== undefined) await setSetting('notificationDate', body.notificationDate || '');

      // 1. Draft Roll
      if (body.draftRollStart !== undefined) await setSetting('draftRollStart', body.draftRollStart || '');
      if (body.draftRollEnd !== undefined) await setSetting('draftRollEnd', body.draftRollEnd || '');
      if (body.draftRollOverride !== undefined) await setSetting('draftRollOverride', body.draftRollOverride || 'AUTO');

      // 2. Final Roll
      if (body.finalRollStart !== undefined) await setSetting('finalRollStart', body.finalRollStart || '');
      if (body.finalRollEnd !== undefined) await setSetting('finalRollEnd', body.finalRollEnd || '');
      if (body.finalRollOverride !== undefined) await setSetting('finalRollOverride', body.finalRollOverride || 'AUTO');

      // 3. Nomination Window
      if (body.nominationStart !== undefined) await setSetting('nominationStart', body.nominationStart || '');
      if (body.nominationDeadline !== undefined) await setSetting('nominationDeadline', body.nominationDeadline || '');
      if (body.nominationOverride !== undefined) await setSetting('nominationOverride', body.nominationOverride || 'AUTO');

      // 4. Valid List
      if (body.validListStart !== undefined) await setSetting('validListStart', body.validListStart || '');
      if (body.validListEnd !== undefined) await setSetting('validListEnd', body.validListEnd || '');
      if (body.validListOverride !== undefined) await setSetting('validListOverride', body.validListOverride || 'AUTO');

      // 5. Withdrawal Window
      if (body.withdrawalStart !== undefined) await setSetting('withdrawalStart', body.withdrawalStart || '');
      if (body.withdrawalEnd !== undefined) await setSetting('withdrawalEnd', body.withdrawalEnd || '');
      if (body.withdrawalOverride !== undefined) await setSetting('withdrawalOverride', body.withdrawalOverride || 'AUTO');

      // 6. Final List
      if (body.finalListStart !== undefined) await setSetting('finalListStart', body.finalListStart || '');
      if (body.finalListEnd !== undefined) await setSetting('finalListEnd', body.finalListEnd || '');
      if (body.finalListOverride !== undefined) await setSetting('finalListOverride', body.finalListOverride || 'AUTO');

      // 7. Polling Window
      if (body.pollingStart !== undefined) await setSetting('pollingStart', body.pollingStart || '');
      if (body.pollingEnd !== undefined) await setSetting('pollingEnd', body.pollingEnd || '');
      if (body.pollingOverride !== undefined) await setSetting('pollingOverride', body.pollingOverride || 'AUTO');

      // 8. Results & Counting
      if (body.resultsStart !== undefined) await setSetting('resultsStart', body.resultsStart || '');
      if (body.resultsEnd !== undefined) await setSetting('resultsEnd', body.resultsEnd || '');
      if (body.resultsOverride !== undefined) await setSetting('resultsOverride', body.resultsOverride || 'AUTO');
      if (body.countingActive !== undefined) {
        await setSetting('countingActive', body.countingActive === true || body.countingActive === 'true' ? 'true' : 'false');
      }

      return jsonOut(res, { ok: true });
    }

    if (action === 'adminSetStageOverride') {
      const stage = body.stage;
      const mode = body.mode; // 'AUTO' | 'FORCE_OPEN' | 'FORCE_CLOSED'
      if (!stage || !mode) return errOut(res, 'Stage and mode are required.');

      await setSetting(`${stage}Override`, mode);

      if (stage === 'draftRoll') {
        if (mode === 'FORCE_OPEN') await setSetting('draftRollPublished', 'true');
        else if (mode === 'FORCE_CLOSED') await setSetting('draftRollPublished', 'false');
      } else if (stage === 'finalRoll') {
        if (mode === 'FORCE_OPEN') {
          await setSetting('isRollFinalized', 'true');
          await setSetting('draftRollPublished', 'true');
        } else if (mode === 'FORCE_CLOSED') {
          await setSetting('isRollFinalized', 'false');
        }
      } else if (stage === 'validList') {
        if (mode === 'FORCE_OPEN') await setSetting('validListPublished', 'true');
        else if (mode === 'FORCE_CLOSED') {
          await setSetting('validListPublished', 'false');
          await setSetting('finalListPublished', 'false');
        }
      } else if (stage === 'finalList') {
        if (mode === 'FORCE_OPEN') await setSetting('finalListPublished', 'true');
        else if (mode === 'FORCE_CLOSED') await setSetting('finalListPublished', 'false');
      } else if (stage === 'results') {
        if (mode === 'FORCE_OPEN') await setSetting('resultsPublished', 'true');
        else if (mode === 'FORCE_CLOSED') await setSetting('resultsPublished', 'false');
      }

      return jsonOut(res, { ok: true, stage, mode });
    }

    if (action === 'adminUpdateSettings') {
      if (body.collegeName !== undefined) await setSetting('collegeName', body.collegeName);
      if (body.collegeShortName !== undefined) await setSetting('collegeShortName', body.collegeShortName);
      if (body.electionYear !== undefined) await setSetting('electionYear', body.electionYear);
      if (body.collegeLogo !== undefined) await setSetting('collegeLogo', body.collegeLogo);
      return jsonOut(res, { ok: true });
    }

    if (action === 'submitNomination') {
      const rollOverride = (await getSetting('finalRollOverride')) || 'AUTO';
      const legacyRollFinal = (await getSetting('isRollFinalized')) === 'true' || (await getSetting('nominalRollFinalized')) === 'true';
      const finalRollStart = await getSetting('finalRollStart');
      const isRollFinal = evaluateStageStatus(rollOverride, legacyRollFinal ? 'true' : 'false', finalRollStart);

      if (!isRollFinal && !body.password) {
        return errOut(res, 'Nominations can only be submitted after the Final Nominal Roll is published by the Returning Officer.');
      }

      // Schedule window and override check
      const now = new Date();
      const nomOverride = (await getSetting('nominationOverride')) || 'AUTO';
      const nomStart = await getSetting('nominationStart');
      const nomEnd = await getSetting('nominationDeadline');
      const isNomActive = evaluateStageStatus(nomOverride, 'false', nomStart, nomEnd);

      if (!isNomActive && !body.password) {
        if (nomOverride === 'FORCE_CLOSED') {
          return errOut(res, 'Nomination submission window has been manually closed by the Returning Officer.');
        }
        if (nomStart && nomStart.trim()) {
          const startDate = new Date(nomStart);
          if (!isNaN(startDate.getTime()) && now < startDate) {
            return errOut(res, `Nomination submission has not opened yet (Opens on ${startDate.toLocaleString('en-IN')}).`);
          }
        }
        if (nomEnd && nomEnd.trim()) {
          const endDate = new Date(nomEnd);
          if (!isNaN(endDate.getTime()) && now > endDate) {
            return errOut(res, 'Nomination submission window has closed.');
          }
        }
        return errOut(res, 'Nomination submission window is currently closed.');
      }

      // Basic Identity Rules
      if (body.candidateSerial === body.proposerSerial) return errOut(res, 'Candidate cannot propose themselves.');
      if (body.candidateSerial === body.seconderSerial) return errOut(res, 'Candidate cannot second themselves.');
      if (body.proposerSerial === body.seconderSerial) return errOut(res, 'Proposer and Seconder cannot be the same person.');

      const cand = await sql`SELECT * FROM nominal_roll WHERE serial_number = ${body.candidateSerial}`;
      const prop = await sql`SELECT * FROM nominal_roll WHERE serial_number = ${body.proposerSerial}`;
      const sec = await sql`SELECT * FROM nominal_roll WHERE serial_number = ${body.seconderSerial}`;
      
      if (!cand.length || !prop.length || !sec.length) return errOut(res, 'Candidate/Proposer/Seconder serial not found.');
      if (String(cand[0].admission_no || '').trim().toLowerCase() !== String(body.candidateAdmission || '').trim().toLowerCase()) {
        return errOut(res, 'Authentication Failed: Invalid Admission Number for Candidate.');
      }

      // Strict Election Integrity Rules enforced on the Server
      const existing = await sql`SELECT post, candidate_serial, proposer_serial, seconder_serial FROM nominations WHERE status != 'Rejected'`;
      if (existing.some(n => n.candidate_serial === body.candidateSerial)) {
        return errOut(res, 'Candidate is already nominated for a post.');
      }
      if (existing.some(n => n.post === body.post && (n.proposer_serial === body.proposerSerial || n.seconder_serial === body.proposerSerial))) {
        return errOut(res, 'Proposer has already signed a nomination for this post.');
      }
      if (existing.some(n => n.post === body.post && (n.proposer_serial === body.seconderSerial || n.seconder_serial === body.seconderSerial))) {
        return errOut(res, 'Seconder has already signed a nomination for this post.');
      }
      const allPosts = await fetchPostsFromDb();
      const rule = allPosts.find(p => p.post === body.post);
      if (rule) {
        if (rule.femaleOnly && body.gender !== 'Female') {
          return errOut(res, 'This post is reserved for Female candidates only.');
        }

        const cCls = String(cand[0].class || '').toUpperCase();
        if (getStudentYearLevelServer(cCls) === 'RS') {
          return errOut(res, 'Research Scholars are not eligible to contest in College Union Elections.');
        }

        const pCls = String(prop[0].class || '').toUpperCase();
        const sCls = String(sec[0].class || '').toUpperCase();
        const cDept = String(cand[0].dept || '').toUpperCase();
        const pDept = String(prop[0].dept || '').toUpperCase();
        const sDept = String(sec[0].dept || '').toUpperCase();

        if (!isYearEligibleServer(cCls, rule)) {
          return errOut(res, `Candidate class (${cand[0].class || 'Unspecified'}) is ineligible under the year restriction for this post.`);
        }
        if (!isYearEligibleServer(pCls, rule)) {
          return errOut(res, `Proposer class (${prop[0].class || 'Unspecified'}) is ineligible under the year restriction for this post.`);
        }
        if (!isYearEligibleServer(sCls, rule)) {
          return errOut(res, `Seconder class (${sec[0].class || 'Unspecified'}) is ineligible under the year restriction for this post.`);
        }

        if (rule.deptRestriction) {
          const reqD = (rule.restrictedDept || (String(body.post).startsWith('Association Secretary ') ? body.post.replace('Association Secretary ', '').trim() : '')).trim();
          if (reqD) {
            const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            const nReq = norm(reqD);
            const matches = d => {
              const nd = norm(d);
              return nd === nReq || nd.includes(nReq) || nReq.includes(nd);
            };
            if (!matches(cDept)) return errOut(res, `Candidate must belong to the ${reqD} department (found: ${cand[0].dept}).`);
            if (!matches(pDept)) return errOut(res, `Proposer must belong to the ${reqD} department (found: ${prop[0].dept}).`);
            if (!matches(sDept)) return errOut(res, `Seconder must belong to the ${reqD} department (found: ${sec[0].dept}).`);
          }
        }
      }

      const id = String(Math.floor(1000000000 + Math.random() * 9000000000));
      
      await sql`
        INSERT INTO nominations (
          id, post, gender, dob, candidate_serial, proposer_serial, seconder_serial,
          candidate_name, candidate_class, candidate_admission, candidate_dept,
          proposer_name, proposer_class, proposer_admission, proposer_dept,
          seconder_name, seconder_class, seconder_admission, seconder_dept
        ) VALUES (
          ${id}, ${body.post}, ${body.gender}, ${body.dob}, ${body.candidateSerial}, ${body.proposerSerial}, ${body.seconderSerial},
          ${cand[0].name}, ${cand[0].class}, ${cand[0].admission_no}, ${cand[0].dept},
          ${prop[0].name}, ${prop[0].class}, ${prop[0].admission_no}, ${prop[0].dept},
          ${sec[0].name}, ${sec[0].class}, ${sec[0].admission_no}, ${sec[0].dept}
        )
      `;
      return jsonOut(res, { ok: true, id });
    }

    if (action === 'submitWithdrawal') {
      const validOverride = (await getSetting('validListOverride')) || 'AUTO';
      const validLegacy = (await getSetting('validListPublished')) === 'true';
      const validStart = await getSetting('validListStart');
      const validEnd = await getSetting('validListEnd');
      const validPublished = evaluateStageStatus(validOverride, validLegacy ? 'true' : 'false', validStart, validEnd);

      if (!validPublished && !body.password) {
        return errOut(res, 'Withdrawals can only be submitted after the Valid Nominations List is published.');
      }

      // Schedule window and override check
      const now = new Date();
      const withOverride = (await getSetting('withdrawalOverride')) || 'AUTO';
      const withStart = await getSetting('withdrawalStart');
      const withEnd = await getSetting('withdrawalEnd');
      const isWithActive = evaluateStageStatus(withOverride, 'false', withStart, withEnd);

      if (!isWithActive && !body.password) {
        if (withOverride === 'FORCE_CLOSED') {
          return errOut(res, 'Withdrawal window has been manually closed by the Returning Officer.');
        }
        if (withStart && withStart.trim()) {
          const startDate = new Date(withStart);
          if (!isNaN(startDate.getTime()) && now < startDate) {
            return errOut(res, `Withdrawal window has not opened yet (Opens on ${startDate.toLocaleString('en-IN')}).`);
          }
        }
        if (withEnd && withEnd.trim()) {
          const endDate = new Date(withEnd);
          if (!isNaN(endDate.getTime()) && now > endDate) {
            return errOut(res, 'Withdrawal window has closed.');
          }
        }
        return errOut(res, 'Withdrawal window is currently closed.');
      }

      const id = body.id;
      const nom = await sql`SELECT * FROM nominations WHERE id = ${id}`;
      if (!nom.length) return errOut(res, 'Nomination not found.');
      if (nom[0].candidate_admission !== String(body.admissionNo)) return errOut(res, 'Authentication Failed: Invalid Admission Number.');

      await sql`UPDATE nominations SET withdrawal_status = 'Pending' WHERE id = ${id}`;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminVerifyNomination') {
      const reason = body.reason || null;
      await sql`UPDATE nominations SET status = ${body.status}, rejection_reason = ${reason} WHERE id = ${body.id}`;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminApproveWithdrawal' || action === 'adminDirectWithdrawal') {
      await sql`UPDATE nominations SET withdrawal_status = 'Approved' WHERE id = ${body.id}`;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminRestoreWithdrawal') {
      const targetStatus = body.targetStatus || 'None';
      await sql`UPDATE nominations SET withdrawal_status = ${targetStatus} WHERE id = ${body.id}`;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminRejectWithdrawal') {
      await sql`UPDATE nominations SET withdrawal_status = 'Rejected' WHERE id = ${body.id}`;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminPublishValidList') {
      await setSetting('validListPublished', 'true');
      await setSetting('validListOverride', 'FORCE_OPEN');
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminPublishFinalList') {
      await setSetting('finalListPublished', 'true');
      await setSetting('finalListOverride', 'FORCE_OPEN');
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminUnpublishValidList') {
      await setSetting('validListPublished', 'false');
      await setSetting('finalListPublished', 'false');
      await setSetting('validListOverride', 'FORCE_CLOSED');
      await setSetting('finalListOverride', 'FORCE_CLOSED');
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminUnpublishFinalList') {
      await setSetting('finalListPublished', 'false');
      await setSetting('finalListOverride', 'FORCE_CLOSED');
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminAddPost') {
      await ensureSchema();
      const pName = (body.post || body.postName || '').trim();
      if (!pName) return errOut(res, 'Post name is required');
      const rDept = (body.restrictedDept || (body.deptRestriction && pName.startsWith('Association Secretary ') ? pName.replace('Association Secretary ', '').trim() : '')).trim();
      const yrMode = body.yearRuleMode || (body.finalYearIneligible ? 'EXCLUDE' : (body.yearRestriction ? 'INCLUDE' : 'ALL'));
      const yrYears = Array.isArray(body.yearRuleYears) ? body.yearRuleYears.join(',') : (body.yearRuleYears || '');
      
      // Keep legacy fields in sync for full backward compatibility
      const isFinalIneligible = yrMode === 'EXCLUDE' && yrYears.includes('3_UG') && yrYears.includes('2_PG');
      let yrRestr = body.yearRestriction || '';
      if (yrMode === 'INCLUDE') {
        if (yrYears === '1_UG') yrRestr = '1';
        else if (yrYears === '2_UG') yrRestr = '2';
        else if (yrYears === '3_UG') yrRestr = '3';
        else if (yrYears === '1_PG,2_PG' || yrYears === '2_PG,1_PG') yrRestr = 'PG';
        else if (yrYears === '1_UG,2_UG,3_UG') yrRestr = 'UG';
        else if (yrYears === '1_UG,2_UG') yrRestr = '1,2';
      }

      await sql`
        INSERT INTO posts (
          post, female_only, final_year_ineligible, year_restriction, dept_restriction, restricted_dept,
          year_rule_mode, year_rule_years
        )
        VALUES (
          ${pName}, ${!!body.femaleOnly}, ${isFinalIneligible || !!body.finalYearIneligible}, ${yrRestr}, ${!!body.deptRestriction}, ${rDept || null},
          ${yrMode}, ${yrYears}
        )
        ON CONFLICT (post) DO UPDATE SET
          female_only = EXCLUDED.female_only,
          final_year_ineligible = EXCLUDED.final_year_ineligible,
          year_restriction = EXCLUDED.year_restriction,
          dept_restriction = EXCLUDED.dept_restriction,
          restricted_dept = EXCLUDED.restricted_dept,
          year_rule_mode = EXCLUDED.year_rule_mode,
          year_rule_years = EXCLUDED.year_rule_years
      `;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminUpdatePost') {
      await ensureSchema();
      const newName = (body.post || body.postName || '').trim();
      const origName = (body.originalName || newName).trim();
      if (!newName) return errOut(res, 'Post name is required');
      const rDept = (body.restrictedDept || (body.deptRestriction && newName.startsWith('Association Secretary ') ? newName.replace('Association Secretary ', '').trim() : '')).trim();
      const yrMode = body.yearRuleMode || (body.finalYearIneligible ? 'EXCLUDE' : (body.yearRestriction ? 'INCLUDE' : 'ALL'));
      const yrYears = Array.isArray(body.yearRuleYears) ? body.yearRuleYears.join(',') : (body.yearRuleYears || '');
      
      const isFinalIneligible = yrMode === 'EXCLUDE' && yrYears.includes('3_UG') && yrYears.includes('2_PG');
      let yrRestr = body.yearRestriction || '';
      if (yrMode === 'INCLUDE') {
        if (yrYears === '1_UG') yrRestr = '1';
        else if (yrYears === '2_UG') yrRestr = '2';
        else if (yrYears === '3_UG') yrRestr = '3';
        else if (yrYears === '1_PG,2_PG' || yrYears === '2_PG,1_PG') yrRestr = 'PG';
        else if (yrYears === '1_UG,2_UG,3_UG') yrRestr = 'UG';
        else if (yrYears === '1_UG,2_UG') yrRestr = '1,2';
      }

      // 1. If post name was changed, delete any old record for origName so we don't leave duplicate or stale entries
      if (origName && origName.toLowerCase() !== newName.toLowerCase()) {
        await sql`DELETE FROM posts WHERE LOWER(TRIM(post)) = LOWER(TRIM(${origName}))`;
        await sql`UPDATE nominations SET post = ${newName} WHERE post = ${origName} OR LOWER(TRIM(post)) = LOWER(TRIM(${origName}))`;
      }

      // 2. Perform atomic UPSERT for newName - guarantees the post is saved even if it was previously an unseeded default
      await sql`
        INSERT INTO posts (
          post, female_only, final_year_ineligible, year_restriction, dept_restriction,
          restricted_dept, year_rule_mode, year_rule_years
        ) VALUES (
          ${newName}, ${!!body.femaleOnly}, ${isFinalIneligible || !!body.finalYearIneligible},
          ${yrRestr}, ${!!body.deptRestriction}, ${rDept || null},
          ${yrMode}, ${yrYears}
        )
        ON CONFLICT (post) DO UPDATE SET
          female_only = EXCLUDED.female_only,
          final_year_ineligible = EXCLUDED.final_year_ineligible,
          year_restriction = EXCLUDED.year_restriction,
          dept_restriction = EXCLUDED.dept_restriction,
          restricted_dept = EXCLUDED.restricted_dept,
          year_rule_mode = EXCLUDED.year_rule_mode,
          year_rule_years = EXCLUDED.year_rule_years
      `;

      // 3. Keep posts_order setting array in sync so the renamed post preserves its exact position
      try {
        const orderRaw = await getSetting('posts_order');
        if (orderRaw) {
          let orderList = safeJsonParse(orderRaw, []);
          if (Array.isArray(orderList) && orderList.length > 0) {
            let changed = false;
            if (origName && origName.toLowerCase() !== newName.toLowerCase()) {
              const idx = orderList.findIndex(p => p.toLowerCase() === origName.toLowerCase());
              if (idx !== -1) {
                orderList[idx] = newName;
                changed = true;
              } else if (!orderList.includes(newName)) {
                orderList.push(newName);
                changed = true;
              }
            } else if (!orderList.includes(newName)) {
              orderList.push(newName);
              changed = true;
            }
            if (changed) {
              await setSetting('posts_order', JSON.stringify(orderList));
            }
          }
        }
      } catch (err) {
        console.warn('posts_order sync warning:', err.message);
      }

      return jsonOut(res, { ok: true });
    }

    if (action === 'adminDeletePost') {
      const pName = (body.postName || body.post || '').trim();
      await sql`DELETE FROM posts WHERE LOWER(TRIM(post)) = LOWER(TRIM(${pName}))`;
      try {
        const orderRaw = await getSetting('posts_order');
        if (orderRaw) {
          let orderList = safeJsonParse(orderRaw, []);
          if (Array.isArray(orderList) && orderList.length > 0) {
            orderList = orderList.filter(p => p !== pName && p.toLowerCase() !== pName.toLowerCase());
            await setSetting('posts_order', JSON.stringify(orderList));
          }
        }
      } catch (_) {}
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminReorderPosts') {
      const order = Array.isArray(body.posts) ? body.posts : [];
      await setSetting('posts_order', JSON.stringify(order));
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminSaveBooths') {
      const bData = typeof body.booths === 'string' ? body.booths : JSON.stringify(body.booths || []);
      await setSetting('booths_data', bData);
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminSaveLocations') {
      const lData = typeof body.locations === 'string' ? body.locations : JSON.stringify(body.locations || []);
      await setSetting('availableLocations', lData);
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminSaveNotices') {
      const noticesData = Array.isArray(body.notices) ? body.notices : [];
      await setSetting('official_notices', JSON.stringify(noticesData));
      return jsonOut(res, { ok: true, count: noticesData.length });
    }

    if (action === 'adminSaveNotice') {
      const notice = body.notice;
      if (!notice || !notice.title) return errOut(res, 'Notice title is required', 400);
      const existingRaw = await getSetting('official_notices');
      let list = safeJsonParse(existingRaw, []);
      if (!Array.isArray(list)) list = [];

      const idx = list.findIndex(n => String(n.id) === String(notice.id));
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...notice, updatedAt: new Date().toISOString() };
      } else {
        const newNotice = {
          ...notice,
          id: notice.id || ('notice_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)),
          createdAt: new Date().toISOString()
        };
        list.unshift(newNotice);
      }
      await setSetting('official_notices', JSON.stringify(list));
      return jsonOut(res, { ok: true, notice: idx >= 0 ? list[idx] : list[0] });
    }

    if (action === 'adminDeleteNotice') {
      const id = body.id;
      if (!id) return errOut(res, 'Notice ID is required', 400);
      const existingRaw = await getSetting('official_notices');
      let list = safeJsonParse(existingRaw, []);
      if (Array.isArray(list)) {
        list = list.filter(n => String(n.id) !== String(id));
        await setSetting('official_notices', JSON.stringify(list));
      }
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminToggleLockResults') {
      const current = await getSetting('resultsLocked');
      const next = current === 'true' ? 'false' : 'true';
      await setSetting('resultsLocked', next);
      return jsonOut(res, { ok: true, locked: next === 'true', resultsLocked: next });
    }

    if (action === 'adminTogglePublishResults') {
      const current = await getSetting('resultsPublished');
      const next = current === 'true' ? 'false' : 'true';
      await setSetting('resultsPublished', next);
      await setSetting('resultsOverride', next === 'true' ? 'FORCE_OPEN' : 'FORCE_CLOSED');
      return jsonOut(res, { ok: true, published: next === 'true', resultsPublished: next });
    }

    if (action === 'adminToggleCounting') {
      const current = await getSetting('countingActive');
      const next = current === 'true' ? 'false' : 'true';
      await setSetting('countingActive', next);
      return jsonOut(res, { ok: true, active: next === 'true', countingActive: next });
    }

    if (action === 'adminSetCountingActive') {
      const active = body.active === true || body.active === 'true';
      const next = active ? 'true' : 'false';
      await setSetting('countingActive', next);
      return jsonOut(res, { ok: true, active, countingActive: next });
    }

    if (action === 'adminLockResults') {
      await setSetting('resultsLocked', 'true');
      return jsonOut(res, { ok: true, locked: true, resultsLocked: 'true' });
    }

    if (action === 'adminUnlockResults') {
      await setSetting('resultsLocked', 'false');
      return jsonOut(res, { ok: true, locked: false, resultsLocked: 'false' });
    }

    if (action === 'adminPublishResults') {
      await setSetting('resultsPublished', 'true');
      await setSetting('resultsOverride', 'FORCE_OPEN');
      return jsonOut(res, { ok: true, published: true, resultsPublished: 'true' });
    }

    if (action === 'adminUnpublishResults') {
      await setSetting('resultsPublished', 'false');
      await setSetting('resultsOverride', 'FORCE_CLOSED');
      return jsonOut(res, { ok: true, published: false, resultsPublished: 'false' });
    }

    if (action === 'adminSaveResults') {
      const isLocked = await getSetting('resultsLocked');
      if (isLocked === 'true') {
        return errOut(res, 'Results are locked and frozen. No further vote entries are allowed.');
      }
      const existingRaw = await getSetting('results_data');
      let allResults = [];
      try {
        allResults = existingRaw ? JSON.parse(existingRaw) : [];
      } catch (e) {
        allResults = [];
      }
      if (!Array.isArray(allResults)) allResults = [];

      const toSave = Array.isArray(body.results) ? body.results : [];
      toSave.forEach(resItem => {
        const idx = allResults.findIndex(r => 
          String(r.TableNumber) === String(resItem.TableNumber) &&
          String(r.Post) === String(resItem.Post) &&
          String(r.CandidateId) === String(resItem.CandidateId)
        );
        if (idx >= 0) {
          allResults[idx] = { ...allResults[idx], ...resItem };
        } else {
          allResults.push(resItem);
        }
      });

      await setSetting('results_data', JSON.stringify(allResults));
      return jsonOut(res, { ok: true, count: allResults.length });
    }

    if (action === 'adminSaveCountingMatrix') {
      const isLocked = await getSetting('resultsLocked');
      if (isLocked === 'true') {
        return errOut(res, 'Results are locked and frozen. No further vote entries are allowed.');
      }
      const dataToSave = body.matrixData || body.matrix;
      if (!dataToSave) {
        return errOut(res, 'No matrix data provided to save.', 400);
      }
      const stringified = typeof dataToSave === 'string' ? dataToSave : JSON.stringify(dataToSave);
      await setSetting('countingMatrix', stringified);
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminSaveBallotPlan') {
      await setSetting('ballotPlan', JSON.stringify(body.plan));
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminUploadNominalRoll') {
      const isRollFinal = await getSetting('isRollFinalized');
      if (isRollFinal === 'true') {
        return errOut(res, 'Nominal Roll is finalized and locked. Please unfinalize with admin password before replacing the roll.', 400);
      }

      await sql`DELETE FROM nominal_roll`;
      // DO NOT DELETE NOMINATIONS! Preserve nominations and auto-remap
      await sql`UPDATE settings SET value='false' WHERE key IN ('validListPublished', 'finalListPublished', 'isRollFinalized', 'draftRollPublished')`;
      await sql`DELETE FROM settings WHERE key IN ('results_data', 'ballotPlan', 'countingMatrix')`;
      
      const isLegacy = body.headers && body.headers.some(h => String(h).toUpperCase().includes('CLASS'));
      
      const formatYearPrefix = (y) => {
        const u = String(y || '').trim().toUpperCase();
        if (u === '1' || u === '1ST' || u === 'I') return '1ST YEAR';
        if (u === '2' || u === '2ND' || u === 'II') return '2ND YEAR';
        if (u === '3' || u === '3RD' || u === 'III') return '3RD YEAR';
        if (u && !u.includes('YEAR')) return `${u} YEAR`;
        return u;
      };

      const toInsert = body.rows.map(r => {
        let cl = r[2], adm = r[3], dpt = r[4];
        if (!isLegacy) {
          const yr = formatYearPrefix(r[2]);
          cl = `${yr} ${r[3] || ''} ${r[5] || ''}`.replace(/\s+/g, ' ').trim(); // e.g. 1ST YEAR B.A Economics
          adm = r[4] || ''; // Admission No
          dpt = r[5] || ''; // Dept
        }
        return { serial_number: String(r[0] || ''), name: String(r[1] || ''), class: String(cl), admission_no: String(adm), dept: String(dpt) };
      });
      
      if (toInsert.length > 0) {
        // Check if uploaded data already has unique serial numbers
        const hasValidSerials = toInsert.every(r => r.serial_number && r.serial_number.trim() && !isNaN(Number(r.serial_number))) &&
          new Set(toInsert.map(r => r.serial_number.trim())).size === toInsert.length;

        // Bulk insert using concurrent Neon HTTP requests (chunked to avoid Vercel timeouts)
        const batchSize = 50;
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const batch = toInsert.slice(i, i + batchSize);
          await Promise.all(batch.map(r => 
            sql`INSERT INTO nominal_roll (serial_number, name, class, admission_no, dept) VALUES (${r.serial_number}, ${r.name}, ${r.class}, ${r.admission_no}, ${r.dept})`
          ));
        }
        
        // Only renumber if uploaded roll lacked valid serials or explicit forceRenumber was requested
        if (!hasValidSerials || body.forceRenumber === true) {
          await sql`UPDATE nominal_roll SET serial_number = serial_number || '_' || gen_random_uuid()::varchar`;
          await sql`
            WITH renumbered AS (
              SELECT serial_number as old_serial,
                ROW_NUMBER() OVER (
                  ORDER BY 
                    LOWER(TRIM(dept)) ASC,
                    CASE 
                      WHEN UPPER(class) LIKE '%RESEARCH%' OR UPPER(class) LIKE '%PH%D%' THEN 6000
                      WHEN UPPER(class) ~ '^I\s+M' OR UPPER(class) ~ '^I\s+PG' THEN 4000
                      WHEN UPPER(class) ~ '^II\s+M' OR UPPER(class) ~ '^II\s+PG' THEN 5000
                      WHEN UPPER(class) ~ '^III\s+M' THEN 5500
                      WHEN UPPER(class) ~ '^I\s+(B|UG)' OR UPPER(class) LIKE '1ST YEAR%' THEN 1000
                      WHEN UPPER(class) ~ '^II\s+(B|UG)' OR UPPER(class) LIKE '2ND YEAR%' THEN 2000
                      WHEN UPPER(class) ~ '^III\s+(B|UG)' OR UPPER(class) LIKE '3RD YEAR%' THEN 3000
                      ELSE 3500
                    END ASC,
                    class ASC,
                    LOWER(TRIM(name)) ASC,
                    name ASC,
                    CASE WHEN split_part(serial_number, '_', 1) ~ '^[0-9]+$' THEN CAST(split_part(serial_number, '_', 1) AS BIGINT) ELSE 999999 END ASC,
                    CASE WHEN admission_no ~ '^[0-9]+$' THEN CAST(admission_no AS BIGINT) ELSE 999999 END ASC
                ) as new_serial
              FROM nominal_roll
            )
            UPDATE nominal_roll SET serial_number = CAST(renumbered.new_serial AS VARCHAR)
            FROM renumbered WHERE nominal_roll.serial_number = renumbered.old_serial
          `;
        }
      }

      // Automatically re-map existing nominations against newly uploaded roll
      const remapResult = await remapNominationsWithRoll();

      return jsonOut(res, { ok: true, count: toInsert.length, remappedNominations: remapResult.remapped, totalNominations: remapResult.total });
    }

    if (action === 'adminFixSerialNumbersDeptWise') {
      const isRollFinal = await getSetting('isRollFinalized');
      if (isRollFinal === 'true') {
        return errOut(res, 'Nominal Roll is finalized and locked. Re-serialising is strictly prohibited on the Final Electoral Roll.', 400);
      }

      const countRows = await sql`SELECT COUNT(*)::int as count FROM nominal_roll`;
      const rollCount = countRows[0]?.count || 0;
      if (rollCount === 0) {
        return jsonOut(res, { ok: true, count: 0, message: 'Nominal roll is empty.' });
      }

      // Step 1: Temporarily suffix all serial numbers with random UUIDs to eliminate any uniqueness/primary key collisions
      await sql`UPDATE nominal_roll SET serial_number = serial_number || '_' || gen_random_uuid()::varchar`;

      // Step 2: Assign contiguous sequential numbers finishing each department at a time:
      // Department (A-Z) -> Program Level (I UG -> II UG -> III UG -> I PG -> II PG -> RS) -> Class Name -> Serial/Adm/Name
      await sql`
        WITH renumbered AS (
          SELECT serial_number as old_serial,
            ROW_NUMBER() OVER (
              ORDER BY 
                LOWER(TRIM(dept)) ASC,
                CASE 
                  WHEN UPPER(class) LIKE '%RESEARCH%' OR UPPER(class) LIKE '%PH%D%' THEN 6000
                  WHEN UPPER(class) ~ '^I\s+M' OR UPPER(class) ~ '^I\s+PG' THEN 4000
                  WHEN UPPER(class) ~ '^II\s+M' OR UPPER(class) ~ '^II\s+PG' THEN 5000
                  WHEN UPPER(class) ~ '^III\s+M' THEN 5500
                  WHEN UPPER(class) ~ '^I\s+(B|UG)' OR UPPER(class) LIKE '1ST YEAR%' THEN 1000
                  WHEN UPPER(class) ~ '^II\s+(B|UG)' OR UPPER(class) LIKE '2ND YEAR%' THEN 2000
                  WHEN UPPER(class) ~ '^III\s+(B|UG)' OR UPPER(class) LIKE '3RD YEAR%' THEN 3000
                  ELSE 3500
                END ASC,
                class ASC,
                LOWER(TRIM(name)) ASC,
                name ASC,
                CASE WHEN split_part(serial_number, '_', 1) ~ '^[0-9]+$' THEN CAST(split_part(serial_number, '_', 1) AS BIGINT) ELSE 999999 END ASC,
                CASE WHEN admission_no ~ '^[0-9]+$' THEN CAST(admission_no AS BIGINT) ELSE 999999 END ASC
            ) as new_serial
          FROM nominal_roll
        )
        UPDATE nominal_roll SET serial_number = CAST(renumbered.new_serial AS VARCHAR)
        FROM renumbered WHERE nominal_roll.serial_number = renumbered.old_serial
      `;

      // Step 3: Automatically remap candidate, proposer, and seconder serial numbers in existing nominations
      const remapResult = await remapNominationsWithRoll();

      return jsonOut(res, {
        ok: true,
        count: rollCount,
        remappedNominations: remapResult.remapped,
        totalNominations: remapResult.total
      });
    }

    if (action === 'adminClearNominalRoll') {
      const isRollFinal = await getSetting('isRollFinalized');
      if (isRollFinal === 'true') {
        return errOut(res, 'Nominal Roll is finalized and locked. Please unfinalize with admin password before clearing the roll.', 400);
      }

      const countRows = await sql`SELECT COUNT(*)::int as count FROM nominal_roll`;
      const clearedCount = countRows[0]?.count || 0;

      // Delete nominal roll data ALONE
      await sql`DELETE FROM nominal_roll`;

      // Serials in nominations reset to NULL, while keeping admission numbers, names, classes, departments, and posts fully intact!
      await sql`UPDATE nominations SET candidate_serial = NULL, proposer_serial = NULL, seconder_serial = NULL`;

      // Reset publication and finalized state for the nominal roll
      await setSetting('draftRollPublished', 'false');
      await setSetting('isRollFinalized', 'false');

      const nomsRows = await sql`SELECT COUNT(*)::int as count FROM nominations`;
      const preservedNominations = nomsRows[0]?.count || 0;

      return jsonOut(res, { ok: true, clearedCount, preservedNominations });
    }

    if (action === 'adminRemapNominations') {
      const remapResult = await remapNominationsWithRoll();
      return jsonOut(res, { ok: true, ...remapResult });
    }

    if (action === 'adminAddStudent') {
      const isRollFinal = (await getSetting('isRollFinalized')) === 'true';
      let newSerial = body.serial_number ? String(body.serial_number).trim() : '';

      if (isRollFinal) {
        // Final Roll addition: Assign serial number with suffix 'a' (or 'b', 'c'...) after the preceding student,
        // without altering any existing serial numbers!
        if (!newSerial) {
          const dept = String(body.dept || '').trim();
          const cls = String(body.class || '').trim();
          const newName = String(body.name || '').trim().toUpperCase();

          // Fetch existing students in this department and class
          const classStudents = await sql`
            SELECT serial_number, name, class, dept 
            FROM nominal_roll 
            WHERE LOWER(TRIM(dept)) = LOWER(TRIM(${dept})) 
              AND LOWER(TRIM(class)) = LOWER(TRIM(${cls}))
          `;

          // Sort classStudents alphabetically by name
          classStudents.sort((a, b) => String(a.name || '').trim().toUpperCase().localeCompare(String(b.name || '').trim().toUpperCase()));

          // Find student immediately preceding the alphabetical insertion point
          let prevStudent = null;
          for (let i = 0; i < classStudents.length; i++) {
            if (newName.localeCompare(String(classStudents[i].name || '').trim().toUpperCase()) < 0) {
              break;
            }
            prevStudent = classStudents[i];
          }

          let baseSerial = '';
          if (prevStudent) {
            baseSerial = String(prevStudent.serial_number || '').trim();
          } else if (classStudents.length > 0) {
            // New student is alphabetically before the first student of this class
            const firstSl = String(classStudents[0].serial_number || '').trim();
            const firstNum = parseInt(firstSl.replace(/\D/g, ''), 10) || 1;
            baseSerial = String(Math.max(1, firstNum - 1));
          } else {
            const maxSlRows = await sql`
              SELECT COALESCE(MAX(CASE WHEN serial_number ~ '^[0-9]+$' THEN CAST(serial_number AS BIGINT) ELSE 0 END), 0) as max_sl 
              FROM nominal_roll
            `;
            baseSerial = String(maxSlRows[0]?.max_sl || 1);
          }

          const baseNumMatch = baseSerial.match(/^(\d+)/);
          const baseNum = baseNumMatch ? baseNumMatch[1] : baseSerial;

          // Find existing serials with baseNum prefix (e.g. 124, 124a, 124b...)
          const existingSerials = (await sql`
            SELECT serial_number FROM nominal_roll WHERE serial_number LIKE ${baseNum + '%'}
          `).map(r => String(r.serial_number).trim().toLowerCase());

          let suffixChar = 'a';
          let candidate = `${baseNum}${suffixChar}`;
          while (existingSerials.includes(candidate.toLowerCase())) {
            suffixChar = String.fromCharCode(suffixChar.charCodeAt(0) + 1);
            candidate = `${baseNum}${suffixChar}`;
          }
          newSerial = candidate;
        }
      } else {
        // Draft roll addition: default to next contiguous number if not provided
        if (!newSerial) {
          const maxSlRows = await sql`
            SELECT COALESCE(MAX(CASE WHEN serial_number ~ '^[0-9]+$' THEN CAST(serial_number AS BIGINT) ELSE 0 END), 0) + 1 as next_sl 
            FROM nominal_roll
          `;
          newSerial = String(maxSlRows[0]?.next_sl || 1);
        }
      }

      await sql`
        INSERT INTO nominal_roll (serial_number, name, class, admission_no, dept)
        VALUES (${newSerial}, ${body.name}, ${body.class}, ${body.admission_no}, ${body.dept})
        ON CONFLICT (serial_number) DO UPDATE SET
          name = EXCLUDED.name, class = EXCLUDED.class, admission_no = EXCLUDED.admission_no, dept = EXCLUDED.dept
      `;
      await remapNominationsWithRoll();
      return jsonOut(res, { ok: true, serial: newSerial, isFinalAddition: isRollFinal });
    }

    if (action === 'adminUpdateStudent') {
      await sql`
        UPDATE nominal_roll
        SET name = ${body.name}, class = ${body.class}, admission_no = ${body.admission_no}, dept = ${body.dept}
        WHERE serial_number = ${body.old_serial}
      `;
      await remapNominationsWithRoll();
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminDeleteStudent') {
      // Deletions allowed on both draft and final roll without shifting other serial numbers
      await sql`DELETE FROM nominal_roll WHERE serial_number = ${body.serial}`;
      await remapNominationsWithRoll();
      return jsonOut(res, { ok: true, deletedSerial: body.serial });
    }

    if (action === 'adminPublishDraftRoll') {
      await setSetting('draftRollPublished', 'true');
      await setSetting('draftRollOverride', 'FORCE_OPEN');
      return jsonOut(res, { ok: true, draftRollPublished: 'true' });
    }

    if (action === 'adminUnpublishDraftRoll') {
      await setSetting('draftRollPublished', 'false');
      await setSetting('draftRollOverride', 'FORCE_CLOSED');
      return jsonOut(res, { ok: true, draftRollPublished: 'false' });
    }

    if (action === 'adminFinalizeRoll') {
      const existingNoms = await sql`SELECT id, candidate_admission, proposer_admission, seconder_admission FROM nominations`;
      if (existingNoms.length > 0 && !body.matchNominations) {
        return jsonOut(res, { ok: false, requiresMatching: true, count: existingNoms.length });
      }

      if (body.matchNominations && existingNoms.length > 0) {
        await remapNominationsWithRoll();
      }

      await setSetting('isRollFinalized', 'true');
      await setSetting('draftRollPublished', 'true');
      await setSetting('finalRollOverride', 'FORCE_OPEN');
      return jsonOut(res, { ok: true, isRollFinalized: 'true' });
    }

    if (action === 'adminUnfinalizeRoll') {
      const enteredPwd = body.confirmPassword || body.password;
      const rows = await sql`SELECT value FROM settings WHERE key = 'adminPassword'`;
      const realPwd = rows.length > 0 ? rows[0].value : 'admin123';
      if (!enteredPwd || enteredPwd !== realPwd) {
        return errOut(res, 'Incorrect admin password. Unfinalize denied.', 401);
      }

      await setSetting('isRollFinalized', 'false');
      await setSetting('draftRollPublished', 'true');
      await setSetting('finalRollOverride', 'FORCE_CLOSED');
      return jsonOut(res, { ok: true, isRollFinalized: 'false' });
    }

    if (action === 'submitRollCorrection') {
      const draftOverride = (await getSetting('draftRollOverride')) || 'AUTO';
      const legacyDraft = await getSetting('draftRollPublished');
      const draftStart = await getSetting('draftRollStart');
      const draftEnd = await getSetting('draftRollEnd');
      const isDraftOpen = evaluateStageStatus(draftOverride, legacyDraft, draftStart, draftEnd);

      const rollOverride = (await getSetting('finalRollOverride')) || 'AUTO';
      const legacyFinal = await getSetting('isRollFinalized');
      const finalStart = await getSetting('finalRollStart');
      const isFinal = evaluateStageStatus(rollOverride, legacyFinal, finalStart);

      if (isFinal) {
        return errOut(res, 'The Nominal Roll has been finalized. Correction requests are no longer accepted.');
      }
      if (!isDraftOpen) {
        return errOut(res, 'The Draft Nominal Roll is not currently open for correction requests.');
      }
      if (!body.admissionNo || !body.studentName || !body.details) {
        return errOut(res, 'Admission number, student name, and details are required.');
      }

      await sql`
        CREATE TABLE IF NOT EXISTS roll_corrections (
          id VARCHAR(64) PRIMARY KEY,
          admission_no VARCHAR(255) NOT NULL,
          student_name VARCHAR(255) NOT NULL,
          department VARCHAR(255),
          class_name VARCHAR(255),
          correction_type VARCHAR(100) NOT NULL,
          details TEXT NOT NULL,
          contact_info VARCHAR(255),
          status VARCHAR(50) DEFAULT 'Pending',
          admin_notes TEXT,
          timestamp VARCHAR(100)
        );
      `;

      const id = 'CORR_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const ts = new Date().toISOString();
      await sql`
        INSERT INTO roll_corrections (id, admission_no, student_name, department, class_name, correction_type, details, contact_info, status, timestamp)
        VALUES (${id}, ${body.admissionNo}, ${body.studentName}, ${body.department || ''}, ${body.className || ''}, ${body.correctionType || 'General'}, ${body.details}, ${body.contactInfo || ''}, 'Pending', ${ts})
      `;
      return jsonOut(res, { ok: true, id });
    }

    if (action === 'adminGetRollCorrections') {
      await sql`
        CREATE TABLE IF NOT EXISTS roll_corrections (
          id VARCHAR(64) PRIMARY KEY,
          admission_no VARCHAR(255) NOT NULL,
          student_name VARCHAR(255) NOT NULL,
          department VARCHAR(255),
          class_name VARCHAR(255),
          correction_type VARCHAR(100) NOT NULL,
          details TEXT NOT NULL,
          contact_info VARCHAR(255),
          status VARCHAR(50) DEFAULT 'Pending',
          admin_notes TEXT,
          timestamp VARCHAR(100)
        );
      `;
      const rows = await sql`SELECT * FROM roll_corrections ORDER BY timestamp DESC`;
      return jsonOut(res, rows);
    }

    if (action === 'adminUpdateRollCorrection') {
      const status = body.status || 'Resolved';
      const notes = body.notes || '';
      await sql`UPDATE roll_corrections SET status = ${status}, admin_notes = ${notes} WHERE id = ${body.id}`;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminDeleteNomination') {
      const enteredPwd = body.confirmPassword || body.password;
      const rows = await sql`SELECT value FROM settings WHERE key = 'adminPassword'`;
      const realPwd = rows.length > 0 ? rows[0].value : 'admin123';
      if (!enteredPwd || enteredPwd !== realPwd) {
        return errOut(res, 'Incorrect admin password. Deletion denied.', 401);
      }
      const id = body.id;
      if (!id) return errOut(res, 'Nomination ID is required.', 400);

      await sql`DELETE FROM nominations WHERE id = ${id}`;
      return jsonOut(res, { ok: true, deletedId: id });
    }

    // ─── BACKUP & RESTORE SUITE ───────────────────────────────────────────────

    const ensureBackupTable = async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS backup_snapshots (
          id VARCHAR(64) PRIMARY KEY,
          snapshot_name VARCHAR(255) NOT NULL,
          trigger_type VARCHAR(50) NOT NULL,
          created_at VARCHAR(100) NOT NULL,
          summary_json TEXT NOT NULL,
          data_json TEXT NOT NULL
        );
      `;
    };

    const restoreDatabasePayload = async (backupData, options = {}) => {
      const modules = options.selectedModules || {
        nominalRoll: true,
        rollCorrections: true,
        posts: true,
        nominations: true,
        settings: true
      };
      const restoreMode = options.restoreMode || 'full_wipe_and_replace';
      const restoredCounts = {
        nominalRoll: 0,
        rollCorrections: 0,
        posts: 0,
        nominations: 0,
        settings: 0
      };
      const nowIso = new Date().toISOString();

      // 1. Nominal Roll
      if (modules.nominalRoll && Array.isArray(backupData.data?.nominal_roll)) {
        if (restoreMode === 'full_wipe_and_replace') {
          await sql`DELETE FROM nominal_roll`;
        }
        const rollItems = backupData.data.nominal_roll;
        const batchSize = 50;
        for (let i = 0; i < rollItems.length; i += batchSize) {
          const batch = rollItems.slice(i, i + batchSize);
          await Promise.all(batch.map(r => 
            sql`
              INSERT INTO nominal_roll (serial_number, name, class, admission_no, dept)
              VALUES (
                ${String(r.serial_number || r['Nominal Roll Serial Number'] || r['SL_NO'] || r['SL NO'] || r['Serial Number'] || '')},
                ${String(r.name || r['NAME'] || r['Name'] || '')},
                ${String(r.class || r['CLASS'] || r['Class'] || '')},
                ${String(r.admission_no || r['ADMISION NO'] || r['ADMISSION NO'] || r['Admission No'] || '')},
                ${String(r.dept || r['Dept'] || r['DEPT'] || '')}
              )
              ON CONFLICT (serial_number) DO UPDATE SET
                name = EXCLUDED.name,
                class = EXCLUDED.class,
                admission_no = EXCLUDED.admission_no,
                dept = EXCLUDED.dept
            `
          ));
        }
        restoredCounts.nominalRoll = rollItems.length;
      }

      // 2. Roll Corrections
      if (modules.rollCorrections && Array.isArray(backupData.data?.roll_corrections)) {
        if (restoreMode === 'full_wipe_and_replace') {
          await sql`DELETE FROM roll_corrections`;
        }
        const corrItems = backupData.data.roll_corrections;
        for (const c of corrItems) {
          await sql`
            INSERT INTO roll_corrections (id, admission_no, student_name, department, class_name, correction_type, details, contact_info, status, admin_notes, timestamp)
            VALUES (${c.id}, ${c.admission_no}, ${c.student_name}, ${c.department || ''}, ${c.class_name || ''}, ${c.correction_type || ''}, ${c.details || ''}, ${c.contact_info || ''}, ${c.status || 'Pending'}, ${c.admin_notes || ''}, ${c.timestamp || nowIso})
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              admin_notes = EXCLUDED.admin_notes
          `;
        }
        restoredCounts.rollCorrections = corrItems.length;
      }

      // 3. Posts
      if (modules.posts && Array.isArray(backupData.data?.posts)) {
        if (restoreMode === 'full_wipe_and_replace') {
          await sql`DELETE FROM posts`;
        }
        const postItems = backupData.data.posts;
        for (const p of postItems) {
          await sql`
            INSERT INTO posts (
              post, female_only, final_year_ineligible, year_restriction, dept_restriction,
              restricted_dept, year_rule_mode, year_rule_years
            ) VALUES (
              ${p.post},
              ${p.femaleOnly ? true : false},
              ${p.finalYearIneligible ? true : false},
              ${p.yearRestriction || null},
              ${p.deptRestriction ? true : false},
              ${p.restrictedDept || null},
              ${p.yearRuleMode || 'ALL'},
              ${Array.isArray(p.yearRuleYears) ? p.yearRuleYears.join(',') : (p.yearRuleYears || '')}
            )
            ON CONFLICT (post) DO UPDATE SET
              female_only = EXCLUDED.female_only,
              final_year_ineligible = EXCLUDED.final_year_ineligible,
              year_restriction = EXCLUDED.year_restriction,
              dept_restriction = EXCLUDED.dept_restriction,
              restricted_dept = EXCLUDED.restricted_dept,
              year_rule_mode = EXCLUDED.year_rule_mode,
              year_rule_years = EXCLUDED.year_rule_years
          `;
        }
        restoredCounts.posts = postItems.length;
      }

      // 4. Nominations
      if (modules.nominations && Array.isArray(backupData.data?.nominations)) {
        if (restoreMode === 'full_wipe_and_replace') {
          await sql`DELETE FROM nominations`;
        }
        const nomItems = backupData.data.nominations;
        const nomBatchSize = 50;
        for (let i = 0; i < nomItems.length; i += nomBatchSize) {
          const batch = nomItems.slice(i, i + nomBatchSize);
          await Promise.all(batch.map(n => 
            sql`
              INSERT INTO nominations (
                id, post, candidate_serial, candidate_admission, proposer_serial, proposer_admission,
                seconder_serial, seconder_admission, status, withdrawal_status, candidate_name,
                candidate_class, candidate_dept, gender, dob, proposer_name, proposer_class,
                proposer_admission, proposer_dept, seconder_name, seconder_class, seconder_admission,
                seconder_dept, rejection_reason
              ) VALUES (
                ${n.id}, ${n.post}, ${n.candidate_serial}, ${n.candidate_admission}, ${n.proposer_serial}, ${n.proposer_admission},
                ${n.seconder_serial}, ${n.seconder_admission}, ${n.status || 'Pending'}, ${n.withdrawal_status || 'None'}, ${n.candidate_name || ''},
                ${n.candidate_class || ''}, ${n.candidate_dept || ''}, ${n.gender || ''}, ${n.dob || ''}, ${n.proposer_name || ''}, ${n.proposer_class || ''},
                ${n.proposer_admission || ''}, ${n.proposer_dept || ''}, ${n.seconder_name || ''}, ${n.seconder_class || ''}, ${n.seconder_admission || ''},
                ${n.seconder_dept || ''}, ${n.rejection_reason || null}
              )
              ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                withdrawal_status = EXCLUDED.withdrawal_status,
                rejection_reason = EXCLUDED.rejection_reason
            `
          ));
        }
        restoredCounts.nominations = nomItems.length;
      }

      // 5. Settings (including Booths, Ballots, Counting Matrix & Results)
      if (modules.settings && Array.isArray(backupData.data?.settings)) {
        const settingItems = backupData.data.settings;
        if (restoreMode === 'full_wipe_and_replace') {
          const backupKeys = new Set(settingItems.map(s => s.key));
          const allCurrent = await sql`SELECT key FROM settings WHERE key NOT IN ('adminPassword', 'adminOTP', 'adminEmail')`;
          for (const s of allCurrent) {
            if (!backupKeys.has(s.key)) {
              await sql`DELETE FROM settings WHERE key = ${s.key}`;
            }
          }
        }
        for (const s of settingItems) {
          if (['adminPassword', 'adminOTP', 'adminEmail'].includes(s.key)) continue;
          await setSetting(s.key, s.value);
        }
        restoredCounts.settings = settingItems.length;
      }

      return restoredCounts;
    };

    if (action === 'adminExportBackup') {
      const enteredPwd = adminPwd || body.password || getAuthToken(req);
      const pwdRows = await sql`SELECT value FROM settings WHERE key = 'adminPassword'`;
      const realPwd = pwdRows.length > 0 ? pwdRows[0].value : 'admin123';
      const isPwdValid = enteredPwd === realPwd;
      let isSessionValid = false;
      if (!isPwdValid && enteredPwd) {
        const sess = await sql`SELECT token FROM admin_sessions WHERE token = ${enteredPwd}`;
        isSessionValid = sess.length > 0;
      }
      if (!isPwdValid && !isSessionValid) {
        return errOut(res, 'Unauthorized: Invalid Admin Credentials', 401);
      }

      await ensureBackupTable();

      const [rollRows, correctionRows, postRows, nominationRows, settingRows] = await Promise.all([
        sql`
          SELECT serial_number, name, class, admission_no, dept 
          FROM nominal_roll 
          ORDER BY 
            CASE 
              WHEN serial_number ~ '^[0-9]+$' THEN CAST(serial_number AS BIGINT) 
              ELSE 999999999 
            END ASC, 
            serial_number ASC
        `,
        sql`SELECT * FROM roll_corrections ORDER BY timestamp DESC`,
        sql`SELECT post, female_only as "femaleOnly", final_year_ineligible as "finalYearIneligible", year_restriction as "yearRestriction", dept_restriction as "deptRestriction", restricted_dept as "restrictedDept", year_rule_mode as "yearRuleMode", year_rule_years as "yearRuleYears" FROM posts ORDER BY post ASC`,
        sql`SELECT * FROM nominations ORDER BY timestamp ASC`,
        sql`SELECT key, value FROM settings WHERE key NOT IN ('adminPassword', 'adminOTP', 'adminEmail')`
      ]);

      const nowIso = new Date().toISOString();
      const cName = (await getSetting('collegeName')) || 'Government Victoria College, Palakkad';
      const cShort = (await getSetting('collegeShortName')) || 'GVC';
      const eYear = (await getSetting('electionYear')) || new Date().getFullYear().toString();

      const counts = {
        nominalRoll: rollRows.length,
        rollCorrections: correctionRows.length,
        posts: postRows.length,
        nominations: nominationRows.length,
        settingsCount: settingRows.length,
        isRollFinalized: (await getSetting('isRollFinalized')) === 'true',
        draftRollPublished: (await getSetting('draftRollPublished')) === 'true',
        resultsRecorded: !!(await getSetting('results_data'))
      };

      const dataPayload = {
        nominal_roll: rollRows,
        roll_corrections: correctionRows,
        posts: postRows,
        nominations: nominationRows,
        settings: settingRows
      };

      const dataStr = JSON.stringify(dataPayload);
      const checksum = crypto.createHash('sha256').update(dataStr).digest('hex');

      const backupPackage = {
        metadata: {
          app: 'College Union Election Portal',
          schemaVersion: '2.0',
          exportedAt: nowIso,
          collegeName: cName,
          collegeShortName: cShort,
          electionYear: eYear,
          counts,
          checksum
        },
        data: dataPayload
      };

      // Save internal snapshot (retain up to 10)
      try {
        const snapId = 'SNAP_' + Date.now();
        await sql`
          INSERT INTO backup_snapshots (id, snapshot_name, trigger_type, created_at, summary_json, data_json)
          VALUES (${snapId}, ${'Export Snapshot (' + nowIso.slice(0, 16).replace('T', ' ') + ')'}, 'export', ${nowIso}, ${JSON.stringify(counts)}, ${JSON.stringify(backupPackage)})
        `;
        await sql`
          DELETE FROM backup_snapshots WHERE id NOT IN (
            SELECT id FROM backup_snapshots ORDER BY created_at DESC LIMIT 10
          )
        `;
      } catch (err) {
        console.error('Snapshot store warning:', err);
      }

      return jsonOut(res, backupPackage);
    }

    if (action === 'adminGetSnapshots') {
      await ensureBackupTable();
      const rows = await sql`
        SELECT id, snapshot_name as "snapshotName", trigger_type as "triggerType", created_at as "createdAt", summary_json as "summaryJson"
        FROM backup_snapshots
        ORDER BY created_at DESC
        LIMIT 10
      `;
      const snapshots = rows.map(r => ({
        id: r.id,
        snapshotName: r.snapshotName,
        triggerType: r.triggerType,
        createdAt: r.createdAt,
        summary: safeJsonParse(r.summaryJson, {})
      }));
      return jsonOut(res, snapshots);
    }

    if (action === 'adminDownloadSnapshot') {
      await ensureBackupTable();
      const snapId = body.snapshotId;
      if (!snapId) return errOut(res, 'Snapshot ID is required.');
      const rows = await sql`SELECT data_json FROM backup_snapshots WHERE id = ${snapId}`;
      if (!rows.length) return errOut(res, 'Snapshot not found.');
      let parsed = null;
      try {
        parsed = JSON.parse(rows[0].data_json);
      } catch (err) {
        return errOut(res, 'Snapshot payload is corrupted or invalid JSON', 500);
      }
      return jsonOut(res, parsed);
    }

    if (action === 'adminRestoreBackup') {
      const enteredPwd = body.password;
      const pwdRows = await sql`SELECT value FROM settings WHERE key = 'adminPassword'`;
      const realPwd = pwdRows.length > 0 ? pwdRows[0].value : 'admin123';
      if (!enteredPwd || enteredPwd !== realPwd) {
        return errOut(res, 'Incorrect admin password. Restore denied.', 401);
      }

      if (body.confirmPhrase !== 'CONFIRM RESTORE') {
        return errOut(res, 'Security validation failed: Confirmation phrase "CONFIRM RESTORE" is required.', 400);
      }

      const backupData = body.backupData;
      if (!backupData || !backupData.data) {
        return errOut(res, 'Invalid backup format: Missing data payload.', 400);
      }

      await ensureBackupTable();

      // ── Pre-Restore Safety Snapshot ──
      const preRestoreSnapId = 'PRE_RESTORE_' + Date.now();
      const nowIso = new Date().toISOString();
      try {
        const [curRoll, curCorr, curPosts, curNoms, curSettings] = await Promise.all([
          sql`SELECT serial_number, name, class, admission_no, dept FROM nominal_roll`,
          sql`SELECT * FROM roll_corrections`,
          sql`SELECT post, female_only as "femaleOnly", final_year_ineligible as "finalYearIneligible", year_restriction as "yearRestriction", dept_restriction as "deptRestriction", restricted_dept as "restrictedDept", year_rule_mode as "yearRuleMode", year_rule_years as "yearRuleYears" FROM posts ORDER BY post ASC`,
          sql`SELECT * FROM nominations`,
          sql`SELECT key, value FROM settings WHERE key NOT IN ('adminPassword', 'adminOTP')`
        ]);

        const preCounts = {
          nominalRoll: curRoll.length,
          rollCorrections: curCorr.length,
          posts: curPosts.length,
          nominations: curNoms.length,
          settingsCount: curSettings.length
        };

        const prePackage = {
          metadata: {
            app: 'College Union Election Portal',
            schemaVersion: '2.0',
            exportedAt: nowIso,
            type: 'pre_restore_safety_snapshot',
            counts: preCounts
          },
          data: {
            nominal_roll: curRoll,
            roll_corrections: curCorr,
            posts: curPosts,
            nominations: curNoms,
            settings: curSettings
          }
        };

        await sql`
          INSERT INTO backup_snapshots (id, snapshot_name, trigger_type, created_at, summary_json, data_json)
          VALUES (${preRestoreSnapId}, ${'Pre-Restore Safety Snapshot (' + nowIso.slice(0, 16).replace('T', ' ') + ')'}, 'pre_restore', ${nowIso}, ${JSON.stringify(preCounts)}, ${JSON.stringify(prePackage)})
        `;
      } catch (snapErr) {
        console.error('Failed to create pre-restore snapshot:', snapErr);
      }

      const restoredCounts = await restoreDatabasePayload(backupData, {
        selectedModules: body.selectedModules,
        restoreMode: body.restoreMode
      });

      return jsonOut(res, {
        ok: true,
        message: 'System restore completed successfully.',
        restoredCounts,
        preRestoreSnapshotId: preRestoreSnapId
      });
    }

    if (action === 'adminRevertSnapshot') {
      const enteredPwd = body.password;
      const pwdRows = await sql`SELECT value FROM settings WHERE key = 'adminPassword'`;
      const realPwd = pwdRows.length > 0 ? pwdRows[0].value : 'admin123';
      if (!enteredPwd || enteredPwd !== realPwd) {
        return errOut(res, 'Incorrect admin password. Revert denied.', 401);
      }

      const snapId = body.snapshotId;
      if (!snapId) return errOut(res, 'Snapshot ID is required.');
      await ensureBackupTable();

      const snapRows = await sql`SELECT data_json FROM backup_snapshots WHERE id = ${snapId}`;
      if (!snapRows.length) return errOut(res, 'Snapshot record not found.');

      let backupPackage = null;
      try {
        backupPackage = JSON.parse(snapRows[0].data_json);
      } catch (err) {
        return errOut(res, 'Snapshot record is corrupted or invalid JSON. Revert aborted.', 500);
      }
      const restoredCounts = await restoreDatabasePayload(backupPackage, {
        selectedModules: { nominalRoll: true, rollCorrections: true, posts: true, nominations: true, settings: true },
        restoreMode: 'full_wipe_and_replace'
      });

      return jsonOut(res, {
        ok: true,
        message: 'System successfully reverted to snapshot.',
        restoredCounts
      });
    }

    if (action === 'adminRunAudit') {
      const enteredPwd = adminPwd || body.password || getAuthToken(req);
      const pwdRows = await sql`SELECT value FROM settings WHERE key = 'adminPassword'`;
      const realPwd = pwdRows.length > 0 ? pwdRows[0].value : 'admin123';
      if (!enteredPwd || enteredPwd !== realPwd) {
        return errOut(res, 'Unauthorized: Invalid credentials', 401);
      }

      const rollCheck = { pass: true, details: [] };
      const serialCheck = { pass: true, details: [] };
      const resultsCheck = { pass: true, details: [] };
      const formsCheck = { pass: true, details: [] };

      const [students, noms, planRaw, matrixRaw, resultsRaw] = await Promise.all([
        sql`SELECT serial_number as "SL_NO", name as "NAME", class as "CLASS", admission_no as "ADMISION NO", dept as "Dept" FROM nominal_roll`,
        sql`SELECT id, post, candidate_serial as "candidateSerial", candidate_name as "candidateName", proposer_serial as "proposerSerial", seconder_serial as "seconderSerial" FROM nominations WHERE status != 'Rejected'`,
        getSetting('ballotPlan'),
        getSetting('countingMatrix'),
        getSetting('results_data')
      ]);

      const plan = safeJsonParse(planRaw, null);
      const matrix = safeJsonParse(matrixRaw, null);
      const resultsData = safeJsonParse(resultsRaw, []);

      // Check 1: Nominal Roll vs Ballot Plan
      if (plan) {
        const expectedGeneral = students.length;
        if (plan.isSplit && Array.isArray(plan.generalParts) && plan.generalParts.length > 1) {
          plan.generalParts.forEach(gp => {
            if (gp.total !== expectedGeneral) {
              rollCheck.pass = false;
              rollCheck.details.push(`${gp.title || 'General Part'}: Expected ${expectedGeneral} voters, Planned ${gp.total}`);
            }
          });
        } else if (plan.general && plan.general.total !== expectedGeneral) {
          rollCheck.pass = false;
          rollCheck.details.push(`General Ballots mismatch: Expected ${expectedGeneral}, Planned ${plan.general.total}`);
        }
      } else {
        rollCheck.pass = false;
        rollCheck.details.push('Ballot Plan not generated yet.');
      }

      // Check 2: Serial Number Integrity
      const getStudent = (sl) => students.find(s => String(s.SL_NO).trim() === String(sl).trim());
      noms.forEach(n => {
        if (!n.candidateSerial) return;
        const c = getStudent(n.candidateSerial);
        if (!c) {
          serialCheck.pass = false;
          serialCheck.details.push(`Nom ID ${n.id}: Candidate Serial ${n.candidateSerial} not found in Nominal Roll.`);
        } else {
          if (String(c.NAME).trim().toUpperCase() !== String(n.candidateName || '').trim().toUpperCase()) {
            serialCheck.pass = false;
            serialCheck.details.push(`Nom ID ${n.id}: Candidate Name mismatch (Roll: ${c.NAME}, Nom: ${n.candidateName})`);
          }
        }

        if (n.proposerSerial) {
          const p = getStudent(n.proposerSerial);
          if (!p) {
            serialCheck.pass = false;
            serialCheck.details.push(`Nom ID ${n.id}: Proposer Serial ${n.proposerSerial} not found in Nominal Roll.`);
          }
        }

        if (n.seconderSerial) {
          const s = getStudent(n.seconderSerial);
          if (!s) {
            serialCheck.pass = false;
            serialCheck.details.push(`Nom ID ${n.id}: Seconder Serial ${n.seconderSerial} not found in Nominal Roll.`);
          }
        }
      });

      // Check 3: Results Math Match & Check 4: Forms Accounting
      if (matrix && Array.isArray(resultsData) && resultsData.length > 0) {
        const matrixTotals = {};
        if (typeof matrix === 'object') {
          Object.keys(matrix).forEach(post => {
            const postData = matrix[post];
            if (!postData || typeof postData !== 'object') return;
            matrixTotals[post] = {};
            Object.keys(postData).forEach(candId => {
              const rounds = postData[candId];
              if (!rounds || typeof rounds !== 'object') return;
              let candSum = 0;
              Object.keys(rounds).forEach(roundKey => {
                if (roundKey === 'FormSerial') return;
                candSum += parseInt(rounds[roundKey]) || 0;
              });
              matrixTotals[post][candId] = candSum;
            });
          });
        }

        const finalResults = {};
        resultsData.forEach(r => {
          const post = String(r.Post || '');
          const cId = String(r.CandidateId || '');
          const votes = parseInt(r.Votes) || 0;
          if (!finalResults[post]) finalResults[post] = {};
          finalResults[post][cId] = (finalResults[post][cId] || 0) + votes;
        });

        if (Object.keys(matrixTotals).length > 0) {
          Object.keys(finalResults).forEach(post => {
            Object.keys(finalResults[post]).forEach(cId => {
              const finalVotes = finalResults[post][cId];
              const matrixVotes = (matrixTotals[post] && matrixTotals[post][cId]) ? matrixTotals[post][cId] : 0;
              if (finalVotes !== matrixVotes) {
                resultsCheck.pass = false;
                resultsCheck.details.push(`Math mismatch for ${post} (Cand/Type: ${cId}): Final says ${finalVotes}, Matrix sum is ${matrixVotes}.`);
              }
            });
          });
        }

        if (plan) {
          const postVotesMap = {};
          resultsData.forEach(r => {
            const post = String(r.Post || '');
            postVotesMap[post] = (postVotesMap[post] || 0) + (parseInt(r.Votes) || 0);
          });

          Object.keys(postVotesMap).forEach(post => {
            const postVotesCast = postVotesMap[post];
            let generated = 0;
            const isYear = post.toLowerCase().includes('representative') || post.toLowerCase().includes('year');
            const isAssoc = post.toLowerCase().includes('association') || post.toLowerCase().includes('assoc');

            if (isYear && plan.reps) {
              const repPlan = (plan.reps.results || []).filter(r => r.post === post);
              generated = repPlan.reduce((sum, r) => sum + r.count, 0);
            } else if (isAssoc && plan.assocs) {
              const assocPlan = (plan.assocs.results || []).filter(r => r.post === post);
              generated = assocPlan.reduce((sum, r) => sum + r.count, 0);
            } else if (plan.general) {
              generated = plan.general.total || 0;
            }

            if (generated > 0 && postVotesCast > generated) {
              formsCheck.pass = false;
              formsCheck.details.push(`Post '${post}': Votes cast (${postVotesCast}) exceeds ballots generated (${generated}).`);
            }
          });
        } else {
          formsCheck.pass = false;
          formsCheck.details.push('Cannot verify forms accounting because Ballot Plan is missing.');
        }
      } else {
        if (!matrix) {
          resultsCheck.pass = false;
          resultsCheck.details.push('Counting Matrix has not been generated and saved yet.');
        }
        if (!Array.isArray(resultsData) || resultsData.length === 0) {
          resultsCheck.pass = false;
          resultsCheck.details.push('No vote results entered yet.');
        }
        formsCheck.pass = false;
        formsCheck.details.push('Counting Matrix or Results not found/empty.');
      }

      return jsonOut(res, { ok: true, report: { rollCheck, serialCheck, resultsCheck, formsCheck } });
    }

    if (action === 'adminInjectTestData') {
      const students = await sql`SELECT serial_number as "Nominal Roll Serial Number", name as "NAME", class as "CLASS", admission_no as "ADMISION NO", dept as "Dept" FROM nominal_roll`;
      const posts = await fetchPostsFromDb();

      if (students.length < 9) return errOut(res, 'Not enough students in Nominal Roll to generate test data. Please upload Nominal Roll first.');
      if (posts.length === 0) return errOut(res, 'No posts configured. Add posts first.');

      function isEligibleCandidate(student, postRule) {
        const cls = String(student['CLASS'] || '').toUpperCase();
        const dept = String(student['Dept'] || '').toUpperCase();

        if (postRule.deptRestriction) {
          const reqDept = (postRule.restrictedDept || (String(postRule.post || '').startsWith('Association Secretary ') ? postRule.post.replace('Association Secretary ', '').trim() : '')).trim().toUpperCase();
          if (reqDept) {
            const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            const nd = norm(dept);
            const nReq = norm(reqDept);
            if (nd !== nReq && !nd.includes(nReq) && !nReq.includes(nd)) return false;
          }
        }

        return isYearEligibleServer(cls, postRule);
      }

      function isEligibleSupporter(student, postRule) {
        const cls = String(student['CLASS'] || '').toUpperCase();
        const dept = String(student['Dept'] || '').toUpperCase();

        if (postRule.deptRestriction) {
          const reqDept = (postRule.restrictedDept || (String(postRule.post || '').startsWith('Association Secretary ') ? postRule.post.replace('Association Secretary ', '').trim() : '')).trim().toUpperCase();
          if (reqDept) {
            const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            const nd = norm(dept);
            const nReq = norm(reqDept);
            if (nd !== nReq && !nd.includes(nReq) && !nReq.includes(nd)) return false;
          }
        }

        return isYearEligibleServer(cls, postRule);
      }

      function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }

      const existingNoms = await sql`SELECT id, candidate_serial FROM nominations WHERE status != 'Rejected'`;
      const existingIds = new Set(existingNoms.map(n => n.id));
      const usedCandidateSerials = new Set(existingNoms.map(n => String(n.candidate_serial)));

      function makeTestId() {
        let id;
        do {
          id = String(Math.floor(1000000000 + Math.random() * 9000000000));
        } while (existingIds.has(id));
        existingIds.add(id);
        return id;
      }

      const injected = [];
      const skipped = [];
      const resultsData = [];
      let globalCandidateOffset = 0;
      let globalSupporterOffset = 0;

      for (const p of posts) {
        const eligibleCandidates = shuffle(students.filter(s =>
          !usedCandidateSerials.has(String(s['Nominal Roll Serial Number'])) && isEligibleCandidate(s, p)
        ));
        const eligibleSupporters = shuffle(students.filter(s => isEligibleSupporter(s, p)));

        if (eligibleCandidates.length < 2 || eligibleSupporters.length < 4) {
          skipped.push(p.post);
          continue;
        }

        for (let i = 0; i < 2; i++) {
          const candidate = eligibleCandidates[(globalCandidateOffset + i) % eligibleCandidates.length];
          usedCandidateSerials.add(String(candidate['Nominal Roll Serial Number']));

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
          const id = makeTestId();
          const gender = p.femaleOnly ? 'Female' : 'Male';
          const dob = '2003-05-15';
          const candName = candidate['NAME'];
          const candClass = candidate['CLASS'];
          const candAdm = candidate['ADMISION NO'];
          const candDept = candidate['Dept'] || 'N/A';

          await sql`
            INSERT INTO nominations (
              id, post, gender, dob, candidate_serial, proposer_serial, seconder_serial,
              status, withdrawal_status,
              candidate_name, candidate_class, candidate_admission, candidate_dept,
              proposer_name, proposer_class, proposer_admission, proposer_dept,
              seconder_name, seconder_class, seconder_admission, seconder_dept
            ) VALUES (
              ${id}, ${p.post}, ${gender}, ${dob},
              ${String(candidate['Nominal Roll Serial Number'])},
              ${String(proposer['Nominal Roll Serial Number'])},
              ${String(seconder['Nominal Roll Serial Number'])},
              'Valid', 'None',
              ${candName}, ${candClass}, ${candAdm}, ${candDept},
              ${proposer['NAME']}, ${proposer['CLASS']}, ${proposer['ADMISION NO']}, ${proposer['Dept'] || 'N/A'},
              ${seconder['NAME']}, ${seconder['CLASS']}, ${seconder['ADMISION NO']}, ${seconder['Dept'] || 'N/A'}
            )
          `;
          injected.push(id);

          resultsData.push({
            TableNumber: 1,
            RoundNumber: 1,
            Post: p.post,
            CandidateId: id,
            CandidateName: candName,
            Votes: Math.floor(Math.random() * 100) + 50,
            FormSerial: 'TEST-AUTO'
          });
        }

        resultsData.push({
          TableNumber: 1,
          RoundNumber: 1,
          Post: p.post,
          CandidateId: 'NOTA',
          CandidateName: 'NOTA',
          Votes: Math.floor(Math.random() * 20),
          FormSerial: 'TEST-AUTO'
        });
        resultsData.push({
          TableNumber: 1,
          RoundNumber: 1,
          Post: p.post,
          CandidateId: 'INVALID',
          CandidateName: 'Invalid',
          Votes: Math.floor(Math.random() * 10),
          FormSerial: 'TEST-AUTO'
        });

        globalCandidateOffset += 5;
        globalSupporterOffset += 7;
      }

      // Save results
      if (resultsData.length > 0) {
        const existingResultsRaw = await getSetting('results_data');
        let existingResults = [];
        if (existingResultsRaw) {
          try { existingResults = JSON.parse(existingResultsRaw); } catch(e) {}
        }
        await setSetting('results_data', JSON.stringify([...existingResults, ...resultsData]));
      }

      return jsonOut(res, { ok: true, injected: injected.length, skipped: skipped.length, skippedPosts: skipped });
    }

    if (action === 'adminWipeData') {
      await sql`DELETE FROM nominations`;
      await sql`UPDATE settings SET value = 'false' WHERE key IN ('validListPublished', 'finalListPublished', 'resultsPublished', 'resultsLocked', 'countingActive')`;
      await sql`DELETE FROM settings WHERE key IN ('results_data', 'ballotPlan', 'countingMatrix')`;
      return jsonOut(res, { ok: true });
    }

    return errOut(res, `Unknown or unimplemented action: ${action}`);
  } catch (error) {
    console.error('API Error:', error);
    const msg = error.message || 'Internal Server Error';
    const status = msg.startsWith('UNAUTHORIZED_') ? 401 : 500;
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return errOut(res, msg, status);
  }
}
