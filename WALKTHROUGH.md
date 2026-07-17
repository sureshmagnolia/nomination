# Election App — Walkthrough

## What Was Built
A full-stack **College Union Election Management System** for Government Victoria College, Palakkad. It is a Vite (Vanilla JS + Tailwind CSS) single-page app backed by a Vercel Serverless Function that uses Neon Postgres as its database.

## Architecture

```
election-app/
├── index.html                    # Root HTML (Tailwind CDN, Google Fonts)
├── api/
│   └── main.js                   # Vercel Serverless backend ← deploy this
└── src/
    ├── main.js                   # Entry point, SPA router wiring
    ├── config.js                 # Election config (URL, rules)
    ├── api.js                    # All API calls to Vercel API
    ├── utils.js                  # Shared logic: eligibility, printing, toasts
    ├── router.js                 # Hash-based SPA router
    ├── style.css                 # Global styles (glassmorphism, animations, print)
    └── pages/
        ├── home.js               # Public landing page
        ├── submitNomination.js   # Nomination form + print preview
        ├── findNomination.js     # Look up nomination by 10-digit ID
        ├── validList.js          # Published valid nominations list
        ├── finalList.js          # Final list (active + withdrawn)
        ├── withdraw.js           # Withdrawal request + print form
        └── admin/
            ├── login.js          # Admin login (OTP via Resend)
            ├── layout.js         # Sidebar layout + session guard
            ├── dashboard.js      # Stats overview + quick actions
            ├── verify.js         # Scrutiny (Valid/Rejected) + Search
            ├── withdrawals.js    # Approve withdrawal requests + Search
            ├── booths.js         # Booth allotment & Electoral Roll printing
            ├── counting.js       # Booth-aligned Counting Matrix generation
            ├── resultsEntry.js   # Real-time vote entry with audit totals
            └── publish.js        # Publish valid/final lists
```

## Neon Postgres Database Schema

| Table | Columns |
|-------|---------|
| **nominal_roll** | serial_number, name, class, admission_no, dept |
| **nominations** | id, post, gender, dob, candidate_serial, proposer_serial, seconder_serial, status, withdrawal_status, timestamp, candidate_name, candidate_class, candidate_admission, candidate_dept, proposer_name, proposer_class, proposer_admission, proposer_dept, seconder_name, seconder_class, seconder_admission, seconder_dept |
| **settings** | key, value |
| **posts** | post, female_only, final_year_ineligible, year_restriction, dept_restriction |

## Setup Instructions (for deployment)

### Step 1 — Database
1. Create a new Neon project and Postgres database.
2. Get your connection string (e.g. `postgresql://user:pass@host/db`).

### Step 2 — Resend (For Admin Login)
1. Create a free account on Resend.com.
2. Verify your domain and get an API key.

### Step 3 — Vercel Deployment
1. Connect your GitHub repository to Vercel.
2. Under Project Settings -> Environment Variables, add:
   - `DATABASE_URL`: Your Neon connection string.
   - `RESEND_API_KEY`: Your Resend API key.
3. Deploy the project. Vercel will automatically build the Vite frontend and expose `/api/main` as a serverless endpoint.
4. Log into the app, go to Settings, and trigger the "Initialize Database" or run the `initDB` action to create your tables.

### Step 4 — Frontend Configuration
1. Open `src/config.js`.
2. Ensure `API_BASE_URL` points to `/api/main`.
3. Set `ELECTION_DATE` to the actual election date.

## Features Implemented

| Feature | Where |
|---------|-------|
| Nominal roll loaded from Neon Database | Auto on Submit Nomination page |
| Nomination form with eligibility rules | `submitNomination.js` |
| Candidate/Proposer/Seconder auto-fill | Serial number input → live API lookup |
| All GVC election rules enforced | `utils.js → checkEligibility()` |
| Math captcha on submission | `utils.js → generateCaptcha()` |
| Unique 10-digit random ID assigned | `api/main.js` |
| Print-ready nomination paper | `buildNominationPaper()` + CSS print media |
| Retrieve nomination by ID | `findNomination.js` |
| Withdrawal form + print (Post-submit) | `withdraw.js + buildWithdrawalPaper()` |
| Published valid/final lists (public) | `validList.js`, `finalList.js` |
| Admin Search & Filters | `admin/verify.js`, `admin/withdrawals.js` |
| Polling Booth & Location Allotment | `admin/booths.js` |
| Electoral Roll Printing (A4 Class-wise) | `admin/booths.js` |
| Counting Matrix Setup (Booth-Aligned) | `admin/counting.js` |
| Real-time Vote Entry Portal (Audit Ready) | `admin/resultsEntry.js` |
| Professional UI Design System | `style.css` |
| All data stored in Neon Serverless Postgres | `api/main.js` |

## Local Development
To run this project locally with the Serverless API:
1. Install the Vercel CLI: `npm i -g vercel`
2. Link the project: `vercel link`
3. Pull env vars: `vercel env pull`
4. Run the dev server: `vercel dev` (This will start both Vite and the `/api/main` backend).
