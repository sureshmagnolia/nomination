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
      return jsonOut(res, noms.map(n => ({ post: n.post, candidateName: n.candidate_name, candidateClass: n.candidate_class, candidateDept: n.candidate_dept, status: n.status })));
    }

    if (action === 'getFinalNominations') {
      const published = await getSetting('finalListPublished');
      if (published !== 'true') return errOut(res, 'Final list not published.');
      const noms = await sql`SELECT * FROM nominations WHERE status = 'Valid'`;
      return jsonOut(res, {
        active: noms.filter(n => n.withdrawal_status !== 'Approved').map(n => ({ post: n.post, candidateName: n.candidate_name, candidateClass: n.candidate_class, candidateDept: n.candidate_dept })),
        withdrawn: noms.filter(n => n.withdrawal_status === 'Approved').map(n => ({ post: n.post, candidateName: n.candidate_name, candidateClass: n.candidate_class, candidateDept: n.candidate_dept }))
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
      // Basic Identity Rules
      if (body.candidateSerial === body.proposerSerial) return errOut(res, 'Candidate cannot propose themselves.');
      if (body.candidateSerial === body.seconderSerial) return errOut(res, 'Candidate cannot second themselves.');
      if (body.proposerSerial === body.seconderSerial) return errOut(res, 'Proposer and Seconder cannot be the same person.');

      const cand = await sql`SELECT * FROM nominal_roll WHERE serial_number = ${body.candidateSerial}`;
      const prop = await sql`SELECT * FROM nominal_roll WHERE serial_number = ${body.proposerSerial}`;
      const sec = await sql`SELECT * FROM nominal_roll WHERE serial_number = ${body.seconderSerial}`;
      
      if (!cand.length || !prop.length || !sec.length) return errOut(res, 'Candidate/Proposer/Seconder serial not found.');
      if (cand[0].admission_no !== String(body.candidateAdmission)) return errOut(res, 'Authentication Failed: Invalid Admission Number for Candidate.');

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

    if (action === 'adminUploadNominalRoll') {
      await sql`DELETE FROM nominal_roll`;
      await sql`DELETE FROM nominations`;
      await sql`UPDATE settings SET value='false' WHERE key IN ('validListPublished', 'finalListPublished', 'isRollFinalized')`;
      await sql`DELETE FROM settings WHERE key IN ('results_data', 'ballotPlan', 'countingMatrix')`;
      
      const isLegacy = body.headers && body.headers.join() === ['Nominal Roll Serial Number', 'NAME', 'CLASS', 'ADMISION NO', 'Dept'].join();
      
      const toInsert = body.rows.map(r => {
        let cl = r[2], adm = r[3], dpt = r[4];
        if (!isLegacy) {
          cl = `${r[2] || ''} ${r[3] || ''} ${r[5] || ''}`.trim(); // Year + Stream + Dept
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
      }
      return jsonOut(res, { ok: true, count: toInsert.length });
    }

    if (action === 'adminAddStudent') {
      await sql`
        INSERT INTO nominal_roll (serial_number, name, class, admission_no, dept)
        VALUES (${body.serial_number}, ${body.name}, ${body.class}, ${body.admission_no}, ${body.dept})
      `;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminUpdateStudent') {
      // Update by old serial_number (in case serial_number itself is updated)
      await sql`
        UPDATE nominal_roll
        SET serial_number = ${body.serial_number}, name = ${body.name}, class = ${body.class}, admission_no = ${body.admission_no}, dept = ${body.dept}
        WHERE serial_number = ${body.old_serial}
      `;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminDeleteStudent') {
      await sql`DELETE FROM nominal_roll WHERE serial_number = ${body.serial}`;
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminFinalizeRoll') {
      await setSetting('isRollFinalized', 'true');
      return jsonOut(res, { ok: true });
    }

    if (action === 'adminUnfinalizeRoll') {
      await setSetting('isRollFinalized', 'false');
      return jsonOut(res, { ok: true });
    }

    return errOut(res, `Unknown or unimplemented action: ${action}`);
  } catch (error) {
    console.error('API Error:', error);
    const msg = error.message || 'Internal Server Error';
    const status = msg.startsWith('UNAUTHORIZED_') ? 401 : 500;
    return errOut(res, msg, status);
  }
}
