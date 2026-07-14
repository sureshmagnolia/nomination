import { neon } from '@neondatabase/serverless';

// Ensure DATABASE_URL is set in your Vercel project environment variables
const sql = neon(process.env.DATABASE_URL || 'postgresql://placeholder');

// Helper to standardise responses
const jsonOut = (res, data, status = 200) => res.status(status).json(data);
const errOut = (res, msg, status = 400) => res.status(status).json({ error: msg });

// Simple auth check (in production, use JWT or proper sessions)
const checkAdmin = (password, sessionToken, isLogin = false) => {
  const now = new Date();
  // Using simple UTC date for demo - adjust timezone logic if needed
  const dateStr = String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0') + now.getFullYear();
  const dayStr = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const dynamicPassword = dateStr + dayStr;

  // Minimal token check stub
  if (!isLogin && !sessionToken) {
    throw new Error('SESSION_EXPIRED');
  }
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let action;
    let body = {};
    
    if (req.method === 'GET') {
      action = req.query.action;
      body = req.query;
    } else if (req.method === 'POST') {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      action = body.action;
    }

    if (action === 'initDB') {
      await sql`
        CREATE TABLE IF NOT EXISTS settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS posts (
          post VARCHAR(255) PRIMARY KEY,
          female_only BOOLEAN,
          final_year_ineligible BOOLEAN,
          year_restriction VARCHAR(50),
          dept_restriction BOOLEAN
        );
      `;
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
          seconder_dept VARCHAR(255)
        );
      `;
      await sql`INSERT INTO settings (key, value) VALUES ('validListPublished', 'false') ON CONFLICT (key) DO NOTHING;`;
      await sql`INSERT INTO settings (key, value) VALUES ('finalListPublished', 'false') ON CONFLICT (key) DO NOTHING;`;

      return jsonOut(res, { ok: true, message: 'Database initialized' });
    }

    // Settings helpers
    const getSetting = async (key) => {
      const rows = await sql`SELECT value FROM settings WHERE key = ${key}`;
      return rows.length > 0 ? rows[0].value : null;
    };
    
    const setSetting = async (key, value) => {
      await sql`
        INSERT INTO settings (key, value) 
        VALUES (${key}, ${value}) 
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `;
    };

    // ─── GET ENDPOINTS ────────────────────────────────────────────────────────

    if (action === 'getPublicNominations') {
      const noms = await sql`SELECT post, proposer_serial, seconder_serial, status FROM nominations WHERE status != 'Rejected'`;
      return jsonOut(res, noms.map(n => ({
        post: n.post, proposerSerial: n.proposer_serial, seconderSerial: n.seconder_serial, status: n.status
      })));
    }
    
    if (action === 'getNominalRoll') {
      const roll = await sql`SELECT serial_number as "Nominal Roll Serial Number", name as "NAME", class as "CLASS", admission_no as "ADMISION NO", dept as "Dept" FROM nominal_roll`;
      return jsonOut(res, roll);
    }
    
    if (action === 'getPosts' || action === 'adminGetPosts') {
      const posts = await sql`SELECT post, female_only as "femaleOnly", final_year_ineligible as "finalYearIneligible", year_restriction as "yearRestriction", dept_restriction as "deptRestriction" FROM posts`;
      return jsonOut(res, posts);
    }

    if (action === 'getSettings' || action === 'adminGetSettings') {
      return jsonOut(res, {
        validListPublished: await getSetting('validListPublished'),
        finalListPublished: await getSetting('finalListPublished'),
        isRollFinalized: await getSetting('isRollFinalized'),
        collegeName: await getSetting('collegeName'),
        collegeShortName: await getSetting('collegeShortName'),
        electionYear: await getSetting('electionYear'),
        notificationDate: await getSetting('notificationDate')
      });
    }

    if (action === 'getPublicSchedule') {
      return jsonOut(res, {
        nominationDeadline: await getSetting('nominationDeadline'),
        withdrawalStart: await getSetting('withdrawalStart'),
        withdrawalEnd: await getSetting('withdrawalEnd'),
        notificationDate: await getSetting('notificationDate'),
        electionYear: await getSetting('electionYear')
      });
    }

    if (action === 'adminGetNominations') {
      const noms = await sql`SELECT * FROM nominations`;
      return jsonOut(res, noms.map(n => ({
        id: n.id, post: n.post, gender: n.gender, dob: n.dob, timestamp: n.timestamp,
        candidateSerial: n.candidate_serial, proposerSerial: n.proposer_serial, seconderSerial: n.seconder_serial,
        status: n.status, withdrawalStatus: n.withdrawal_status,
        candidate: { 'Nominal Roll Serial Number': n.candidate_serial, 'NAME': n.candidate_name, 'CLASS': n.candidate_class, 'ADMISION NO': n.candidate_admission, 'Dept': n.candidate_dept },
        proposer: { 'Nominal Roll Serial Number': n.proposer_serial, 'NAME': n.proposer_name, 'CLASS': n.proposer_class, 'ADMISION NO': n.proposer_admission, 'Dept': n.proposer_dept },
        seconder: { 'Nominal Roll Serial Number': n.seconder_serial, 'NAME': n.seconder_name, 'CLASS': n.seconder_class, 'ADMISION NO': n.seconder_admission, 'Dept': n.seconder_dept },
        candidateName: n.candidate_name, candidateClass: n.candidate_class, candidateDept: n.candidate_dept,
        proposerName: n.proposer_name, seconderName: n.seconder_name
      })));
    }

    if (action === 'getValidNominations') {
      const published = await getSetting('validListPublished');
      if (published !== 'true') return errOut(res, 'Valid list not published.');
      const noms = await sql`SELECT * FROM nominations WHERE status = 'Valid'`;
      return jsonOut(res, noms.map(n => ({ id: n.id, post: n.post, candidateName: n.candidate_name, candidateClass: n.candidate_class, status: n.status })));
    }

    if (action === 'getFinalNominations') {
      const published = await getSetting('finalListPublished');
      if (published !== 'true') return errOut(res, 'Final list not published.');
      const noms = await sql`SELECT * FROM nominations WHERE status = 'Valid'`;
      return jsonOut(res, {
        active: noms.filter(n => n.withdrawal_status !== 'Approved').map(n => ({ id: n.id, post: n.post, candidateName: n.candidate_name, candidateClass: n.candidate_class })),
        withdrawn: noms.filter(n => n.withdrawal_status === 'Approved').map(n => ({ id: n.id, post: n.post, candidateName: n.candidate_name, candidateClass: n.candidate_class }))
      });
    }

    if (action === 'adminGetBooths') {
      const data = await getSetting('booths_data');
      return jsonOut(res, data ? JSON.parse(data) : []);
    }

    if (action === 'adminGetLocations') {
      const data = await getSetting('availableLocations');
      return jsonOut(res, data ? JSON.parse(data) : []);
    }

    if (action === 'getResults') {
      const data = await getSetting('results_data');
      return jsonOut(res, data ? JSON.parse(data) : []);
    }

    if (action === 'adminGetCountingMatrix') {
      const data = await getSetting('countingMatrix');
      return jsonOut(res, data ? JSON.parse(data) : null);
    }

    if (action === 'adminGetBallotPlan') {
      const data = await getSetting('ballotPlan');
      if (!data) return errOut(res, 'No ballot plan generated yet.');
      return jsonOut(res, JSON.parse(data));
    }

    // ─── POST ENDPOINTS ───────────────────────────────────────────────────────

    if (action === 'adminLogin') {
      return jsonOut(res, { ok: true, sessionToken: 'admin-token-1234' });
    }

    if (action === 'adminSendOTP') {
      return jsonOut(res, { ok: true, email: 'ad***@example.com' });
    }

    if (action === 'adminVerifyOTP') {
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminSaveSchedule') {
      await setSetting('nominationDeadline', body.nominationDeadline);
      await setSetting('withdrawalStart', body.withdrawalStart);
      await setSetting('withdrawalEnd', body.withdrawalEnd);
      await setSetting('notificationDate', body.notificationDate);
      await setSetting('electionYear', body.electionYear || new Date().getFullYear().toString());
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminUpdateSettings') {
      if (body.collegeName) await setSetting('collegeName', body.collegeName);
      if (body.collegeShortName) await setSetting('collegeShortName', body.collegeShortName);
      return jsonOut(res, { ok: true });
    }

    if (action === 'submitNomination') {
      const id = String(Math.floor(1000000000 + Math.random() * 9000000000));
      
      const cand = await sql`SELECT * FROM nominal_roll WHERE serial_number = ${body.candidateSerial}`;
      const prop = await sql`SELECT * FROM nominal_roll WHERE serial_number = ${body.proposerSerial}`;
      const sec = await sql`SELECT * FROM nominal_roll WHERE serial_number = ${body.seconderSerial}`;
      
      if (!cand.length || !prop.length || !sec.length) return errOut(res, 'Candidate/Proposer/Seconder serial not found.');

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
      const nom = await sql`SELECT status FROM nominations WHERE id = ${body.id}`;
      if (!nom.length || nom[0].status !== 'Valid') return errOut(res, 'Invalid nomination status.');
      await sql`UPDATE nominations SET withdrawal_status = 'Requested' WHERE id = ${body.id}`;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminVerifyNomination') {
      await sql`UPDATE nominations SET status = ${body.status} WHERE id = ${body.id}`;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminApproveWithdrawal' || action === 'adminDirectWithdrawal') {
      await sql`UPDATE nominations SET withdrawal_status = 'Approved' WHERE id = ${body.id}`;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminPublishValidList') {
      await setSetting('validListPublished', 'true');
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminPublishFinalList') {
      await setSetting('finalListPublished', 'true');
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminUnpublishValidList') {
      await setSetting('validListPublished', 'false');
      await setSetting('finalListPublished', 'false');
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminUnpublishFinalList') {
      await setSetting('finalListPublished', 'false');
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminAddPost') {
      await sql`
        INSERT INTO posts (post, female_only, final_year_ineligible, year_restriction, dept_restriction)
        VALUES (${body.post}, ${body.femaleOnly}, ${body.finalYearIneligible}, ${body.yearRestriction}, ${body.deptRestriction})
      `;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminUpdatePost') {
      await sql`
        UPDATE posts 
        SET female_only = ${body.femaleOnly}, final_year_ineligible = ${body.finalYearIneligible}, year_restriction = ${body.yearRestriction}, dept_restriction = ${body.deptRestriction}
        WHERE post = ${body.post}
      `;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminDeletePost') {
      await sql`DELETE FROM posts WHERE post = ${body.postName}`;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminSaveBooths') {
      await setSetting('booths_data', JSON.stringify(body.booths));
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminSaveLocations') {
      await setSetting('availableLocations', JSON.stringify(body.locations));
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminSaveResults') {
      await setSetting('results_data', JSON.stringify(body.results));
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminSaveCountingMatrix') {
      await setSetting('countingMatrix', JSON.stringify(body.matrix));
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminSaveBallotPlan') {
      await setSetting('ballotPlan', JSON.stringify(body.plan));
      return jsonOut(res, { ok: true });
    }

    return errOut(res, `Unknown or unimplemented action: ${action}`);
  } catch (error) {
    console.error('API Error:', error);
    return errOut(res, error.message, 500);
  }
}
