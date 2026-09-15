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

  const validSession = await sql`SELECT token FROM admin_sessions WHERE token = ${sessionToken}`;
  if (validSession.length === 0) {
    throw new Error('UNAUTHORIZED_SESSION_INVALID_OR_EXPIRED');
  }
};

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
    let action;
    let body = {};
    
    if (req.method === 'GET') {
      action = req.query.action;
      body = req.query;
    } else if (req.method === 'POST') {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      action = body.action;
    }

    // Extract auth from custom headers (preferred for GET) or body
    const adminPwd = req.headers['x-admin-password'] || body.password;
    const adminToken = req.headers['x-session-token'] || body.sessionToken;

    // Authenticate Admin Endpoints
    await checkAdmin(adminPwd, adminToken, action);

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
      await sql`INSERT INTO settings (key, value) VALUES ('collegeName', 'Government Victoria College, Palakkad') ON CONFLICT (key) DO NOTHING;`;
      await sql`INSERT INTO settings (key, value) VALUES ('collegeShortName', 'GVC') ON CONFLICT (key) DO NOTHING;`;

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
      const noms = await sql`SELECT post, candidate_serial, proposer_serial, seconder_serial, status FROM nominations WHERE status != 'Rejected'`;
      return jsonOut(res, noms.map(n => ({
        post: n.post, candidateSerial: n.candidate_serial, proposerSerial: n.proposer_serial, seconderSerial: n.seconder_serial, status: n.status
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
      const rollFinal = (await getSetting('isRollFinalized')) || 'false';
      const draftPub  = (await getSetting('draftRollPublished')) || 'false';
      const obj = {
        validListPublished: await getSetting('validListPublished'),
        finalListPublished: await getSetting('finalListPublished'),
        resultsPublished: (await getSetting('resultsPublished')) || 'false',
        resultsLocked: (await getSetting('resultsLocked')) || 'false',
        isRollFinalized: rollFinal,
        nominalRollFinalized: rollFinal,
        draftRollPublished: draftPub,
        collegeName: (await getSetting('collegeName')) || 'Government Victoria College, Palakkad',
        collegeShortName: (await getSetting('collegeShortName')) || 'GVC',
        electionYear: (await getSetting('electionYear')) || new Date().getFullYear().toString(),
        notificationDate: await getSetting('notificationDate')
      };
      if (action === 'adminGetSettings') {
        const rows = await sql`SELECT value FROM settings WHERE key = 'adminEmail'`;
        obj.adminEmail = rows.length > 0 ? rows[0].value : 'admin@example.com';
      }
      return jsonOut(res, obj);
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

    if (action === 'getNomination') {
      const id = body.id;
      const rows = await sql`SELECT * FROM nominations WHERE id = ${id}`;
      if (!rows.length) return errOut(res, 'Nomination not found.', 404);
      const n = rows[0];
      return jsonOut(res, {
        id: n.id, post: n.post, gender: n.gender, dob: n.dob, timestamp: n.timestamp,
        candidateSerial: n.candidate_serial, proposerSerial: n.proposer_serial, seconderSerial: n.seconder_serial,
        status: n.status, withdrawalStatus: n.withdrawal_status,
        candidate: { 'Nominal Roll Serial Number': n.candidate_serial, 'NAME': n.candidate_name, 'CLASS': n.candidate_class, 'ADMISION NO': n.candidate_admission, 'Dept': n.candidate_dept },
        proposer: { 'Nominal Roll Serial Number': n.proposer_serial, 'NAME': n.proposer_name, 'CLASS': n.proposer_class, 'ADMISION NO': n.proposer_admission, 'Dept': n.proposer_dept },
        seconder: { 'Nominal Roll Serial Number': n.seconder_serial, 'NAME': n.seconder_name, 'CLASS': n.seconder_class, 'ADMISION NO': n.seconder_admission, 'Dept': n.seconder_dept },
        candidateName: n.candidate_name, candidateClass: n.candidate_class, candidateDept: n.candidate_dept,
        proposerName: n.proposer_name, seconderName: n.seconder_name
      });
    }

    if (action === 'getValidNominations') {
      const published = await getSetting('validListPublished');
      if (published !== 'true') return errOut(res, 'Valid list not published.');
      const noms = await sql`SELECT * FROM nominations WHERE status = 'Valid'`;
      return jsonOut(res, noms.map(n => ({ post: n.post, candidateName: n.candidate_name, candidateClass: n.candidate_class, candidateDept: n.candidate_dept, status: n.status })));
    }

    if (action === 'getFinalNominations') {
      const published = await getSetting('finalListPublished');
      if (published !== 'true') return errOut(res, 'Final list not published.');
      const noms = await sql`SELECT * FROM nominations WHERE status = 'Valid'`;
      return jsonOut(res, {
        active: noms.filter(n => n.withdrawal_status !== 'Approved').map(n => ({ id: n.id, post: n.post, candidateName: n.candidate_name, candidateClass: n.candidate_class, candidateDept: n.candidate_dept })),
        withdrawn: noms.filter(n => n.withdrawal_status === 'Approved').map(n => ({ id: n.id, post: n.post, candidateName: n.candidate_name, candidateClass: n.candidate_class, candidateDept: n.candidate_dept }))
      });
    }

    if (action === 'adminGetFinalNominations') {
      const published = await getSetting('finalListPublished');
      const isPublished = published === 'true';
      let noms;
      if (isPublished) {
        noms = await sql`SELECT * FROM nominations WHERE status = 'Valid'`;
      } else {
        noms = await sql`SELECT * FROM nominations WHERE status != 'Rejected'`;
      }
      return jsonOut(res, {
        isPublished,
        active: noms.filter(n => n.withdrawal_status !== 'Approved').map(n => ({ id: n.id, post: n.post, candidateName: n.candidate_name, candidateClass: n.candidate_class, candidateDept: n.candidate_dept })),
        withdrawn: noms.filter(n => n.withdrawal_status === 'Approved').map(n => ({ id: n.id, post: n.post, candidateName: n.candidate_name, candidateClass: n.candidate_class, candidateDept: n.candidate_dept }))
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
      const published = await getSetting('resultsPublished');
      if (published !== 'true') return jsonOut(res, []);
      const data = await getSetting('results_data');
      return jsonOut(res, data ? JSON.parse(data) : []);
    }

    if (action === 'adminGetResults') {
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
      await sql`TRUNCATE TABLE ballot_plan`;

      // Reset election state flags
      await setSetting('isRollFinalized', 'false');
      await setSetting('validListPublished', 'false');
      await setSetting('finalListPublished', 'false');
      await setSetting('resultsPublished', 'false');
      await setSetting('resultsLocked', 'false');

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
      const isRollFinal = await getSetting('isRollFinalized');
      if (isRollFinal !== 'true' && !body.password) {
        return errOut(res, 'Nominations cannot be submitted while the Nominal Roll is being edited (Draft Mode).');
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
      const postDef = await sql`SELECT female_only FROM posts WHERE post = ${body.post}`;
      if (postDef.length && postDef[0].female_only && body.gender !== 'Female') {
        return errOut(res, 'This post is reserved for Female candidates only.');
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
      const id = body.id;
      const nom = await sql`SELECT * FROM nominations WHERE id = ${id}`;
      if (!nom.length) return errOut(res, 'Nomination not found.');
      if (nom[0].candidate_admission !== String(body.admissionNo)) return errOut(res, 'Authentication Failed: Invalid Admission Number.');

      await sql`UPDATE nominations SET withdrawal_status = 'Pending' WHERE id = ${id}`;
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

    if (action === 'adminRestoreWithdrawal') {
      await sql`UPDATE nominations SET withdrawal_status = 'None' WHERE id = ${body.id}`;
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
      return jsonOut(res, { ok: true, published: next === 'true', resultsPublished: next });
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
      return jsonOut(res, { ok: true, published: true, resultsPublished: 'true' });
    }

    if (action === 'adminUnpublishResults') {
      await setSetting('resultsPublished', 'false');
      return jsonOut(res, { ok: true, published: false, resultsPublished: 'false' });
    }

    if (action === 'adminSaveResults') {
      const isLocked = await getSetting('resultsLocked');
      if (isLocked === 'true') {
        return errOut(res, 'Results are locked and frozen. No further vote entries are allowed.');
      }
      await setSetting('results_data', JSON.stringify(body.results));
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminSaveCountingMatrix') {
      const isLocked = await getSetting('resultsLocked');
      if (isLocked === 'true') {
        return errOut(res, 'Results are locked and frozen. No further vote entries are allowed.');
      }
      await setSetting('countingMatrix', JSON.stringify(body.matrix));
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
      await sql`DELETE FROM nominations`;
      await sql`UPDATE settings SET value='false' WHERE key IN ('validListPublished', 'finalListPublished', 'isRollFinalized')`;
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
        // Bulk insert using concurrent Neon HTTP requests (chunked to avoid Vercel timeouts)
        const batchSize = 50;
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const batch = toInsert.slice(i, i + batchSize);
          await Promise.all(batch.map(r => 
            sql`INSERT INTO nominal_roll (serial_number, name, class, admission_no, dept) VALUES (${r.serial_number}, ${r.name}, ${r.class}, ${r.admission_no}, ${r.dept})`
          ));
        }
        
        // Recalculate
        await sql`UPDATE nominal_roll SET serial_number = serial_number || '_' || gen_random_uuid()::varchar`;
        await sql`
          WITH renumbered AS (
            SELECT serial_number as old_serial, ROW_NUMBER() OVER (ORDER BY class ASC, name ASC) as new_serial
            FROM nominal_roll
          )
          UPDATE nominal_roll SET serial_number = CAST(renumbered.new_serial AS VARCHAR)
          FROM renumbered WHERE nominal_roll.serial_number = renumbered.old_serial
        `;
      }
      return jsonOut(res, { ok: true, count: toInsert.length });
    }


    if (action === 'adminAddStudent') {
      const isRollFinal = await getSetting('isRollFinalized');
      if (isRollFinal === 'true') {
        return errOut(res, 'Nominal Roll is finalized and locked. Please unfinalize with admin password before adding students.', 400);
      }

      await sql`
        INSERT INTO nominal_roll (serial_number, name, class, admission_no, dept)
        VALUES (gen_random_uuid()::varchar, ${body.name}, ${body.class}, ${body.admission_no}, ${body.dept})
      `;
      // Recalculate
      await sql`WITH temp AS (SELECT serial_number FROM nominal_roll) UPDATE nominal_roll SET serial_number = serial_number || '_temp'`;
      await sql`
        WITH renumbered AS (
          SELECT serial_number as old_serial, ROW_NUMBER() OVER (ORDER BY class ASC, name ASC) as new_serial
          FROM nominal_roll
        )
        UPDATE nominal_roll SET serial_number = CAST(renumbered.new_serial AS VARCHAR)
        FROM renumbered WHERE nominal_roll.serial_number = renumbered.old_serial
      `;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminUpdateStudent') {
      const isRollFinal = await getSetting('isRollFinalized');
      if (isRollFinal === 'true') {
        return errOut(res, 'Nominal Roll is finalized and locked. Please unfinalize with admin password before editing students.', 400);
      }

      await sql`
        UPDATE nominal_roll
        SET name = ${body.name}, class = ${body.class}, admission_no = ${body.admission_no}, dept = ${body.dept}
        WHERE serial_number = ${body.old_serial}
      `;
      // Recalculate
      await sql`UPDATE nominal_roll SET serial_number = serial_number || '_' || gen_random_uuid()::varchar`;
      await sql`
        WITH renumbered AS (
          SELECT serial_number as old_serial, ROW_NUMBER() OVER (ORDER BY class ASC, name ASC) as new_serial
          FROM nominal_roll
        )
        UPDATE nominal_roll SET serial_number = CAST(renumbered.new_serial AS VARCHAR)
        FROM renumbered WHERE nominal_roll.serial_number = renumbered.old_serial
      `;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminDeleteStudent') {
      const isRollFinal = await getSetting('isRollFinalized');
      if (isRollFinal === 'true') {
        return errOut(res, 'Nominal Roll is finalized and locked. Please unfinalize with admin password before deleting students.', 400);
      }

      await sql`DELETE FROM nominal_roll WHERE serial_number = ${body.serial}`;
      // Recalculate
      await sql`UPDATE nominal_roll SET serial_number = serial_number || '_' || gen_random_uuid()::varchar`;
      await sql`
        WITH renumbered AS (
          SELECT serial_number as old_serial, ROW_NUMBER() OVER (ORDER BY class ASC, name ASC) as new_serial
          FROM nominal_roll
        )
        UPDATE nominal_roll SET serial_number = CAST(renumbered.new_serial AS VARCHAR)
        FROM renumbered WHERE nominal_roll.serial_number = renumbered.old_serial
      `;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminPublishDraftRoll') {
      await setSetting('draftRollPublished', 'true');
      return jsonOut(res, { ok: true, draftRollPublished: 'true' });
    }

    if (action === 'adminUnpublishDraftRoll') {
      await setSetting('draftRollPublished', 'false');
      return jsonOut(res, { ok: true, draftRollPublished: 'false' });
    }

    if (action === 'adminFinalizeRoll') {
      const existingNoms = await sql`SELECT id, candidate_admission, proposer_admission, seconder_admission FROM nominations`;
      if (existingNoms.length > 0 && !body.matchNominations) {
        return jsonOut(res, { ok: false, requiresMatching: true, count: existingNoms.length });
      }

      if (body.matchNominations && existingNoms.length > 0) {
        for (const n of existingNoms) {
          const cand = await sql`SELECT serial_number FROM nominal_roll WHERE admission_no = ${n.candidate_admission}`;
          const prop = await sql`SELECT serial_number FROM nominal_roll WHERE admission_no = ${n.proposer_admission}`;
          const sec = await sql`SELECT serial_number FROM nominal_roll WHERE admission_no = ${n.seconder_admission}`;
          
          await sql`UPDATE nominations SET 
            candidate_serial = ${cand[0]?.serial_number || null},
            proposer_serial = ${prop[0]?.serial_number || null},
            seconder_serial = ${sec[0]?.serial_number || null}
          WHERE id = ${n.id}`;
        }
      }

      await setSetting('isRollFinalized', 'true');
      await setSetting('draftRollPublished', 'true');
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
      return jsonOut(res, { ok: true, isRollFinalized: 'false' });
    }

    if (action === 'submitRollCorrection') {
      const draftPub = await getSetting('draftRollPublished');
      const isFinal = await getSetting('isRollFinalized');
      if (isFinal === 'true') {
        return errOut(res, 'The Nominal Roll has been finalized. Correction requests are no longer accepted.');
      }
      if (draftPub !== 'true') {
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
              VALUES (${String(r.serial_number || '')}, ${String(r.name || '')}, ${String(r.class || '')}, ${String(r.admission_no || '')}, ${String(r.dept || '')})
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
            INSERT INTO posts (post, female_only, final_year_ineligible, year_restriction, dept_restriction)
            VALUES (${p.post}, ${p.femaleOnly ? true : false}, ${p.finalYearIneligible ? true : false}, ${p.yearRestriction || null}, ${p.deptRestriction || null})
            ON CONFLICT (post) DO UPDATE SET
              female_only = EXCLUDED.female_only,
              final_year_ineligible = EXCLUDED.final_year_ineligible,
              year_restriction = EXCLUDED.year_restriction,
              dept_restriction = EXCLUDED.dept_restriction
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

      // 5. Settings
      if (modules.settings && Array.isArray(backupData.data?.settings)) {
        const settingItems = backupData.data.settings;
        for (const s of settingItems) {
          if (s.key === 'adminPassword' || s.key === 'adminOTP') continue;
          await setSetting(s.key, s.value);
        }
        restoredCounts.settings = settingItems.length;
      }

      return restoredCounts;
    };

    if (action === 'adminExportBackup') {
      const enteredPwd = body.password || getAuthToken(req);
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
        sql`SELECT serial_number, name, class, admission_no, dept FROM nominal_roll ORDER BY serial_number ASC`,
        sql`SELECT * FROM roll_corrections ORDER BY timestamp DESC`,
        sql`SELECT post, female_only as "femaleOnly", final_year_ineligible as "finalYearIneligible", year_restriction as "yearRestriction", dept_restriction as "deptRestriction" FROM posts`,
        sql`SELECT * FROM nominations ORDER BY created_at ASC`,
        sql`SELECT key, value FROM settings WHERE key NOT IN ('adminPassword', 'adminOTP')`
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
        summary: r.summaryJson ? JSON.parse(r.summaryJson) : {}
      }));
      return jsonOut(res, snapshots);
    }

    if (action === 'adminDownloadSnapshot') {
      await ensureBackupTable();
      const snapId = body.snapshotId;
      if (!snapId) return errOut(res, 'Snapshot ID is required.');
      const rows = await sql`SELECT data_json FROM backup_snapshots WHERE id = ${snapId}`;
      if (!rows.length) return errOut(res, 'Snapshot not found.');
      return jsonOut(res, JSON.parse(rows[0].data_json));
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
          sql`SELECT post, female_only as "femaleOnly", final_year_ineligible as "finalYearIneligible", year_restriction as "yearRestriction", dept_restriction as "deptRestriction" FROM posts`,
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

      const backupPackage = JSON.parse(snapRows[0].data_json);
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
      const enteredPwd = body.password || getAuthToken(req);
      const pwdRows = await sql`SELECT value FROM settings WHERE key = 'adminPassword'`;
      const realPwd = pwdRows.length > 0 ? pwdRows[0].value : 'admin123';
      if (!enteredPwd || enteredPwd !== realPwd) {
        return errOut(res, 'Unauthorized: Invalid credentials', 401);
      }

      const [rollCount, postCount, nomCount, resultsRaw, ballotPlanRaw, boothDataRaw] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM nominal_roll`,
        sql`SELECT COUNT(*) as count FROM posts`,
        sql`SELECT COUNT(*) as count FROM nominations WHERE status = 'Valid'`,
        getSetting('results_data'),
        getSetting('ballotPlan'),
        getSetting('booths_data')
      ]);

      const report = {
        nominalRoll: { pass: Number(rollCount[0].count) > 0, count: Number(rollCount[0].count) },
        posts: { pass: Number(postCount[0].count) > 0, count: Number(postCount[0].count) },
        nominations: { pass: Number(nomCount[0].count) >= 0, count: Number(nomCount[0].count) },
        booths: { pass: !!boothDataRaw },
        ballots: { pass: !!ballotPlanRaw },
        results: { pass: !!resultsRaw }
      };

      return jsonOut(res, { ok: true, report });
    }

    return errOut(res, `Unknown or unimplemented action: ${action}`);
  } catch (error) {
    console.error('API Error:', error);
    const msg = error.message || 'Internal Server Error';
    const status = msg.startsWith('UNAUTHORIZED_') ? 401 : 500;
    return errOut(res, msg, status);
  }
}
