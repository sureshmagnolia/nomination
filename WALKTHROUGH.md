# Election App — Walkthrough

## What Was Built
A full-stack **College Union Election Management System** for Government Victoria College, Palakkad. It is a Vite (Vanilla JS + Tailwind CSS) single-page app backed by a Google Apps Script Web App that uses Google Sheets as its database.

## Architecture

```
election-app/
├── index.html                    # Root HTML (Tailwind CDN, Google Fonts)
├── Code.gs                       # Google Apps Script backend ← deploy this
└── src/
    ├── main.js                   # Entry point, SPA router wiring
    ├── config.js                 # Election config (URL, posts, rules)
    ├── api.js                    # All API calls to Apps Script
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
            ├── login.js          # Admin login (dynamic password)
            ├── layout.js         # Sidebar layout + session guard
            ├── dashboard.js      # Stats overview + quick actions
            ├── verify.js         # Scrutiny (Valid/Rejected) + Search
            ├── withdrawals.js    # Approve withdrawal requests + Search
            ├── booths.js         # Booth allotment & Electoral Roll printing
            ├── counting.js       # Booth-aligned Counting Matrix generation
            ├── resultsEntry.js   # Real-time vote entry with audit totals
            └── publish.js        # Publish valid/final lists
```

## Google Sheets Database Schema

| Sheet | Columns |
|-------|---------|
| **NominalRoll** | Nominal Roll Serial Number, NAME, CLASS, ADMISION NO, Dept |
| **Nominations** | ID, Post, Gender, DOB, CandidateSerial, ProposerSerial, SeconderSerial, Status, WithdrawalStatus, Timestamp |
| **Settings** | Key, Value (validListPublished, finalListPublished) |

## Setup Instructions (for deployment)

### Step 1 — Google Sheets
1. Create a new Google Sheet with 3 tabs: `NominalRoll`, `Nominations`, `Settings`.
2. Populate `NominalRoll` with student data (copy from your Excel/CSV manually).
3. The `Nominations` and `Settings` tabs are auto-initialized by the script.

### Step 2 — Google Apps Script
1. Open [script.google.com](https://script.google.com) → New Project.
2. Paste the contents of `Code.gs` into `Code.gs`.
3. Set `SPREADSHEET_ID` to your Sheet's ID (from the URL).
4. Set `ADMIN_PASSWORD` to a secure password of your choice.
5. **Deploy → New Deployment → Web App**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the generated URL.

### Step 3 — Frontend Configuration
1. Open `src/config.js`.
2. Paste the Web App URL into `APPS_SCRIPT_URL`.
3. Set `ELECTION_DATE` to the actual election date.
4. Run `npm run dev` locally, or build with `npm run build` for deployment.

## Features Implemented

| Feature | Where |
|---------|-------|
| Nominal roll loaded from Google Sheet | Auto on Submit Nomination page |
| Nomination form with eligibility rules | `submitNomination.js` |
| Candidate/Proposer/Seconder auto-fill | Serial number input → live API lookup |
| All GVC election rules enforced | `utils.js → checkEligibility()` |
| Math captcha on submission | `utils.js → generateCaptcha()` |
| Unique 10-digit random ID assigned | `Code.gs → generateUniqueId()` |
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
| All data stored in Google Sheets | `Code.gs` |

## Dev Server
Running at: **http://localhost:5173**
