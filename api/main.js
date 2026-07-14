import { neon } from '@neondatabase/serverless';

// Ensure DATABASE_URL is set in your Vercel project environment variables
const sql = neon(process.env.DATABASE_URL || 'postgresql://placeholder');

// Helper to standardise responses
const jsonOut = (res, data, status = 200) => res.status(status).json(data);
const errOut = (res, msg, status = 400) => res.status(status).json({ error: msg });

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
      // Initialize Tables
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
          withdrawal_status VARCHAR(50) DEFAULT 'None'
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

    if (action === 'getPublicNominations') {
      const noms = await sql`SELECT * FROM nominations WHERE status != 'Rejected'`;
      return jsonOut(res, noms.map(n => ({
        post: n.post,
        proposerSerial: n.proposer_serial,
        seconderSerial: n.seconder_serial,
        status: n.status
      })));
    }
    
    if (action === 'getNominalRoll') {
      const roll = await sql`SELECT serial_number as "Nominal Roll Serial Number", name as "NAME", class as "CLASS", admission_no as "ADMISION NO", dept as "Dept" FROM nominal_roll`;
      return jsonOut(res, roll);
    }
    
    if (action === 'getPosts') {
      const posts = await sql`SELECT post, female_only as "femaleOnly", final_year_ineligible as "finalYearIneligible", year_restriction as "yearRestriction", dept_restriction as "deptRestriction" FROM posts`;
      return jsonOut(res, posts);
    }

    if (action === 'getSettings') {
      return jsonOut(res, {
        validListPublished: await getSetting('validListPublished'),
        finalListPublished: await getSetting('finalListPublished'),
        isRollFinalized: await getSetting('isRollFinalized'),
        collegeName: await getSetting('collegeName'),
        collegeShortName: await getSetting('collegeShortName'),
        electionYear: await getSetting('electionYear')
      });
    }

    // Return mock for undefined actions for now
    return jsonOut(res, { ok: true, note: 'Mock response for ' + action });
  } catch (error) {
    console.error('API Error:', error);
    return errOut(res, error.message, 500);
  }
}
