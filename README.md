# GVC College Union Election Management System

> **Comprehensive Reference Document for Developers and AI Assistants**
> This README is the authoritative source of truth for the project's architecture, data structures, workflows, and conventions. Always read this first before making any changes.

---

## Table of Contents
1. [Project Purpose](#1-project-purpose)
2. [Technology Stack](#2-technology-stack)
3. [Repository Structure](#3-repository-structure)
4. [Deployment Model](#4-deployment-model)
5. [Backend — Google Apps Script (`Code.gs`)](#5-backend--google-apps-script-codegs)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Page-by-Page Reference (Public)](#7-page-by-page-reference-public)
8. [Page-by-Page Reference (Admin)](#8-page-by-page-reference-admin)
9. [Complete API Reference](#9-complete-api-reference)
10. [Core Workflows](#10-core-workflows)
11. [Security Model](#11-security-model)
12. [Data Structures](#12-data-structures)
13. [Known Conventions and Gotchas](#13-known-conventions-and-gotchas)

---

## 1. Project Purpose

The GVC College Union Election Management System is a fully digital solution for running the annual college union elections at Government Victoria College (GVC), Palakkad. It replaces paper-based processes with a controlled, multi-phase digital workflow.

**The four phases it covers:**
1. **Pre-Election**: Student nomination submission with live eligibility checking.
2. **Scrutiny**: Admin verification of nominations and publication of the Valid List.
3. **Withdrawal Window**: Candidates may request withdrawal; admin approves; Final List is published.
4. **Election Day & Results**: Polling booth allotment, round-based counting matrix generation, vote entry, and a live public results dashboard.

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend UI | Vanilla JavaScript (ES Modules) | No framework; pure DOM manipulation |
| Bundler | Vite v8 | Builds to `/dist` |
| CSS | TailwindCSS v4 + Custom CSS | Utility classes + `src/style.css` for custom design tokens |
| Backend / API | Google Apps Script (GAS) | Deployed as a Web App at a fixed URL |
| Database | Google Sheets | Each sheet acts as a database table |
| Hosting (Frontend) | GitHub Pages | Served from the `/docs` folder on the `V1` branch |
| Version Control | Git / GitHub | Repo: `sureshmagnolia/nomination`, Branch: `V1` |

---

## 3. Repository Structure

```
election-app/
├── Code.gs                   # ENTIRE backend: API, database logic, authentication
├── WALKTHROUGH.md            # Developer notes on recent changes
├── package.json              # npm project config, Vite dependency
├── vite.config.js            # Vite configuration
├── index.html                # Single HTML entry point
├── docs/                     # PRODUCTION BUILD — served by GitHub Pages
│   ├── index.html
│   └── assets/
│       ├── index-XXXX.js
│       └── index-XXXX.css
└── src/
    ├── main.js               # App entry point: imports all pages, configures router
    ├── router.js             # Lightweight hash-based SPA router
    ├── api.js                # All fetch() calls to the GAS backend, organized by feature
    ├── config.js             # Single source of truth for APPS_SCRIPT_URL
    ├── style.css             # Global design tokens, glass effects, spinner, alerts
    ├── utils.js              # Shared helpers: showToast, setLoading, esc, calculateAge, triggerPrint
    └── pages/
        ├── home.js           # Public landing page with navigation cards
        ├── submitNomination.js # Student nomination form with live eligibility checks
        ├── findNomination.js # Find & print a submitted nomination by ID
        ├── validList.js      # Public view of verified nominations (post-scrutiny)
        ├── finalList.js      # Public view of the final candidate list (post-withdrawal)
        ├── withdraw.js       # Student withdrawal request form
        ├── results.js        # Public live election results dashboard
        └── admin/
            ├── layout.js     # Shared admin layout (sidebar, session guard)
            ├── login.js      # Admin login with dynamic password
            ├── dashboard.js  # Admin overview / stats
            ├── verify.js     # Nomination scrutiny and approval/rejection
            ├── withdrawals.js# Withdrawal request approval
            ├── publish.js    # Publish Valid/Final lists
            ├── posts.js      # Manage election posts and their eligibility rules
            ├── booths.js     # Manage polling booths, locations, and student allotment
            ├── counting.js   # Generate counting matrix and printable A4 counting forms
            └── resultsEntry.js # Enter vote counts per table and post
```

---

## 4. Deployment Model

### Frontend Deployment
1. Run `npm run build` in the project root. Vite builds to `/dist`.
2. **Manually** copy (`Remove-Item docs; Copy-Item dist docs -Recurse`) or use the `docs` output dir pattern.
3. Commit & push to the `V1` branch on GitHub. GitHub Pages serves from the `docs/` folder automatically.

### Backend Deployment (Google Apps Script)
1. Open the linked Google Apps Script project from the Google Sheet.
2. Copy the entire content of `Code.gs` and paste it, replacing all existing content.
3. Click **Deploy → Manage Deployments → Edit (pencil icon) → New Version → Save**.
4. The Web App URL does **not change** between deployments — it is the same URL configured in `src/config.js`.

> **CRITICAL**: The backend must be redeployed whenever `Code.gs` changes. The frontend automatically reads from the latest deployment URL.

---

## 5. Backend — Google Apps Script (`Code.gs`)

### Sheet Constants
```javascript
const SHEET_ROLL     = 'NominalRoll';   // Pre-populated student data
const SHEET_VALID    = 'ValidList';     // All submitted nominations
const SHEET_FINAL    = 'FinalList';     // Final confirmed candidates
const SHEET_SETTINGS = 'Settings';      // Key-Value global settings
const SHEET_POSTS    = 'Posts';         // Election post definitions
const SHEET_BOOTHS   = 'Booths';        // Polling booth configurations
const SHEET_RESULTS  = 'Results';       // Vote tally entries
```

### Key Functions in `Code.gs`
| Function | Purpose |
|---|---|
| `doGet(e)` | Handles all GET requests. Routes via `e.parameter.action`. |
| `doPost(e)` | Handles all POST requests. Routes via parsed `body.action`. |
| `ensureAll()` | Idempotently creates all required sheets with correct headers. Called on every request. |
| `checkAdmin(pwd)` | Validates the admin password against the dynamic date-based algorithm. Throws on failure. |
| `getSetting(key)` / `setSetting(key, val)` | Read/write from the `Settings` K-V sheet. |
| `getSheet(name)` | Gets or creates a sheet by name. |
| `jsonOut(data)` | Wraps a JSON object in a CORS-friendly `ContentService` response. |
| `errOut(msg)` | Returns a standardized error JSON response. |

### Admin Password Algorithm
The admin password changes daily. The format is `DDMMYYYYday` (all lowercase), where `day` is the full English day name.

Example: If today is Wednesday, 29 April 2026 → password is `29042026wednesday`.

This is computed and checked **server-side** in `checkAdmin()`.

---

## 6. Frontend Architecture

### `src/config.js`
```javascript
export const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  SHEET_ID: '10p-3qWklthNnDUp-MqOHEjJLmWRpgkvVX2QpmGreKxA'
};
```
> The `SHEET_ID` is the ID of the linked Google Spreadsheet. It's stored here for reference but the frontend uses only `APPS_SCRIPT_URL`.

### `src/router.js`
A minimal hash-based SPA router. Routes are registered with `.on('/path', handlerFn)`. The router listens to the `hashchange` event. It does **not** support URL parameters (no dynamic routes like `/post/:id`).

### `src/api.js`
All backend communication is centralized here. Pattern:
- **GET**: Parameters are appended to the URL as query strings. Uses `cache: 'no-store'`.
- **POST**: Body is `JSON.stringify(payload)`. Sets the CORS-compatible headers.

All calls are async and reject on non-OK responses.

### `src/utils.js`
Key helpers:
- `esc(str)` — HTML-encodes a string for safe injection into template literals.
- `showToast(message, type)` — Shows a dismissible notification. `type` is `'success'|'error'|'warning'|'info'`.
- `setLoading(btn, isLoading, originalText)` — Toggles a button's loading spinner state.
- `calculateAge(dobISO, referenceDateISO)` — Returns `{ years, months, days }` from two ISO date strings.
- `triggerPrint(htmlContent)` — Opens a new blank tab, writes the provided HTML into it with full A4 print styles, and triggers `window.print()`.

### `src/style.css`
Uses Tailwind utility classes as well as custom classes:
- `.glass` — The glassmorphism card background (used everywhere).
- `.field` — Standardized dark-theme form input/select styling.
- `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-success` — Button variants.
- `.alert` / `.alert-warning` / `.alert-error` / `.alert-info` — Notification banners.
- `.badge` / `.badge-valid` / `.badge-pending` / `.badge-withdrawn` — Status chips.
- `.spinner` — CSS loading spinner animation.
- `.page-enter` — Subtle fade-in animation applied to page containers.
- `.sidebar-item` / `.sidebar-item.active` — Admin sidebar navigation buttons.
- `.data-table` — Pre-styled HTML table for data grids.
- `.no-print` — Elements hidden when the page is printed.

---

## 7. Page-by-Page Reference (Public)

| Route | File | Function Exported | Description |
|---|---|---|---|
| `/` | `home.js` | `renderHome` | Landing page with navigation cards |
| `/submit` | `submitNomination.js` | `renderSubmitNomination` | 3-step nomination form (candidate → proposer → seconder) |
| `/find` | `findNomination.js` | `renderFindNomination` | Find nomination by ID and print |
| `/valid-list` | `validList.js` | `renderValidList` | Public valid nominations list |
| `/final-list` | `finalList.js` | `renderFinalList` | Public final candidates list |
| `/withdraw` | `withdraw.js` | `renderWithdraw` | Withdrawal request form |
| `/results` | `results.js` | `renderResults` | Live vote aggregation and results dashboard |

---

## 8. Page-by-Page Reference (Admin)

All admin pages call `getAdminPassword()` from `layout.js` first. If the session is expired, they redirect to `/admin`.

| Route | File | Section Key | Description |
|---|---|---|---|
| `/admin` | `login.js` | — | Login page; stores password in `sessionStorage` |
| `/admin/dashboard` | `dashboard.js` | `dashboard` | Summary stats and quick links |
| `/admin/verify` | `verify.js` | `verify` | Nomination scrutiny table; Approve or Reject |
| `/admin/withdrawals` | `withdrawals.js` | `withdrawals` | Withdrawal approval |
| `/admin/publish` | `publish.js` | `publish` | Toggle Valid/Final list publication |
| `/admin/posts` | `posts.js` | `posts` | Create, edit, reorder election posts |
| `/admin/booths` | `booths.js` | `booths` | Location management, booth setup, auto-allotment |
| `/admin/counting` | `counting.js` | `counting` | Counting matrix and printable A4 forms |
| `/admin/results-entry` | `resultsEntry.js` | `results-entry` | Enter physical vote counts by table and post |

---

## 9. Complete API Reference

> All GET requests: `GET {APPS_SCRIPT_URL}?action=<ACTION>&<params>`
> All POST requests: `POST {APPS_SCRIPT_URL}` with JSON body `{ action: '<ACTION>', ...payload }`

### Public GET Endpoints
| Action | Parameters | Returns |
|---|---|---|
| `getNominalRoll` | — | Array of all student objects from `NominalRoll` |
| `getPosts` | — | Array of post objects `{ name, femaleOnly, finalYearIneligible, yearRestriction, deptRestriction }` |
| `getValidList` | — | Array of validated nomination objects |
| `getFinalList` | — | Array of finalized nomination objects |
| `getResults` | — | Array of raw result rows `{ TableNumber, Post, CandidateId, CandidateName, Votes }` |

### Admin GET Endpoints (require `password` param)
| Action | Parameters | Returns |
|---|---|---|
| `adminGetNominations` | `password` | All nominations from `ValidList` |
| `adminGetSettings` | `password` | `{ validListPublished, finalListPublished }` |
| `adminGetPosts` | `password` | All posts from `Posts` sheet |
| `adminGetBooths` | `password` | Array of booth objects |
| `adminGetLocations` | `password` | Array of location strings from Settings |

### Admin POST Endpoints (require `password` in body)
| Action | Key Body Fields | Effect |
|---|---|---|
| `submitNomination` | `nomination {}` | Append new nomination row to `ValidList` |
| `adminVerifyNomination` | `password, id, status, comment` | Update nomination status in `ValidList` |
| `adminSaveWithdrawal` | `password, id, decision` | Update withdrawal status, replicate to `FinalList` |
| `adminPublishList` | `password, listType ('valid'/'final')` | Update Settings key; copies Valid→Final on 'final' |
| `adminAddPost` | `password, post` | Append to `Posts` sheet |
| `adminUpdatePost` | `password, post {}` | Overwrite existing post row |
| `adminReorderPosts` | `password, posts []` | Clears and rewrites `Posts` sheet in given order |
| `adminSaveBooths` | `password, booths []` | Clears and rewrites `Booths` sheet |
| `adminSaveLocations` | `password, locations []` | Saves JSON array to `Settings` key `availableLocations` |
| `adminSaveResults` | `password, results []` | Replaces all rows for a given `TableNumber + Post` |

---

## 10. Core Workflows

### Nomination Submission Flow
1. Student opens `/submit`.
2. Enters Roll Number → system looks up `NominalRoll` and auto-fills personal data.
3. Student selects a Post → system validates eligibility rules from `Posts`.
4. Student fills in Proposer and Seconder Roll Numbers (same validation).
5. On submit → `submitNomination` POST action → a unique 10-character ID is generated (`do...while` loop checks for collisions against existing `ValidList` IDs).
6. Nomination stored in `ValidList` with status `Pending`.
7. A printable A4 nomination paper is opened in a new tab for the student.

### Auto-Allotment Algorithm (`booths.js`)
1. All classes are grouped by Department.
2. Mean students per booth is calculated: `totalStudents / numberOfBooths`.
3. The `maxTolerance` is `mean * 1.25` (25% over mean).
4. Departments are sorted by size (largest first).
5. For each department: if adding the whole department to the emptiest booth exceeds `maxTolerance` AND the department has more than 1 class → **split into exactly 2 booths** (the two emptiest at that moment). Otherwise, place the entire department in the emptiest booth.
6. This ensures subjects are kept together and a single subject never spans more than 2 booths.

### Counting Matrix Generation (`counting.js`)
1. Fetches Posts, FinalList, Booths, and NominalRoll.
2. Identifies the UUC post (name contains "UUC").
3. Identifies Association posts (name contains "ASSOCIATION").
4. All remaining posts are "General Posts".
5. **Matrix Construction** per Table (`t`), per Round (`r`):
   - `Round 1`: The table counts Association posts matching the Departments of its allocated classes.
   - `Rounds 2 to N`: Post assigned = `generalPosts[(t + r) % generalPosts.length]` — a standard modulo rotation.
   - **Final Round**: Every table counts UUC.
6. The matrix is rendered as a visual grid and can be printed as one A4 form per Table+Round+Post.

### Results Aggregation (`results.js`)
1. Fetches all raw result rows and all posts (in order).
2. Aggregates by: `agg[PostName][CandidateId].votes += votes`.
3. Special IDs `'NOTA'` and `'INVALID'` are excluded from candidate rankings but displayed separately.
4. `totalValidVotes` for a post = sum of all candidate votes + NOTA votes (INVALID is excluded from totals).
5. Results displayed in the exact order posts are defined in the `Posts` sheet.

---

## 11. Security Model

| Concern | Implementation |
|---|---|
| Admin access | Dynamic date-based password: `DDMMYYYYday` (e.g., `29042026wednesday`). Checked server-side. |
| Session persistence | Admin password stored in `sessionStorage`. Cleared on logout or tab close. |
| Data write protection | Students can only `submit` new rows. They cannot edit or delete. |
| Admin mutations | All write operations require the admin password in the body. |
| CORS | GAS Web App is deployed as "Anyone can access". Response headers set by `ContentService`. |
| Nomination uniqueness | Server-side `do...while` loop checks for ID collisions before writing. |

---

## 12. Data Structures

### Nomination Object (Row in `ValidList` / `FinalList`)
Key columns in the sheet (as stored by `adminVerifyNomination` and read back):
- `id` — 10-char unique alphanumeric string
- `post` — Name of the post being contested
- `timestamp` — ISO date string
- `status` — `'Pending' | 'Approved' | 'Rejected'`
- `withdrawalStatus` — `'None' | 'Requested' | 'Approved'`
- `candidateName`, `candidateRoll`, `candidateDOB`, `candidateClass`, `candidateDept`
- `proposerName`, `proposerRoll`, `proposerClass`
- `seconderName`, `seconderRoll`, `seconderClass`

### Booth Object (Row in `Booths`)
```json
{
  "boothNumber": 1,
  "roomName": "Main Hall",
  "classes": ["1st Year Physics", "2nd Year Physics"]
}
```
Note: `classes` is stored as a JSON string in the sheet and parsed on load.

### Result Row Object (Row in `Results`)
```json
{
  "TableNumber": "1",
  "Post": "Chairman",
  "CandidateId": "NOM1234567",
  "CandidateName": "John Doe",
  "Votes": 45
}
```
Special `CandidateId` values: `'NOTA'` (None Of The Above), `'INVALID'` (blank/rejected ballots).

### Post Object (Row in `Posts`)
```json
{
  "name": "Chairman",
  "femaleOnly": false,
  "finalYearIneligible": false,
  "yearRestriction": "2",
  "deptRestriction": ""
}
```

---

## 13. Known Conventions and Gotchas

1. **Template Literals in `counting.js`**: The `generateCountingFormHtml()` and `triggerMatrixPrint()` functions use regular template literals (not nested escaped ones). Do not add backslash-escaping to `\`` or `\${}` — this will cause a Vite parse error.

2. **`esc()` is mandatory**: Always wrap any user-generated or database-fetched string in `esc()` before injecting into HTML templates to prevent XSS.

3. **`refreshUI()` pattern**: Admin pages that have interactive state (like `booths.js`) use a `refreshUI()` inner function that completely re-renders the section and re-attaches all event listeners. This is intentional — do not try to do partial DOM updates.

4. **`setDefault('/')` in router**: The router's `setDefault` must be the final `.on()` chain call in `main.js`. It catches all unmatched routes.

5. **Google Apps Script CORS**: GAS does not support standard CORS preflight. All requests must be simple requests (no custom headers on GET, `application/json` body on POST which GAS handles fine).

6. **Build → Docs pipeline**: There is no automated script to copy `dist` → `docs`. It is a manual `Remove-Item docs -Recurse -Force ; Copy-Item dist docs -Recurse` PowerShell command run before every `git commit`.

7. **Tailwind v4 CDN**: The Tailwind utility classes are loaded from a CDN link in `index.html`. This means build-time purging does not happen for Tailwind — all utility classes are available but the CSS bundle is larger.

8. **NominalRoll headers**: The auto-allotment and counting logic depends on `NominalRoll` having columns named exactly `CLASS` and `Dept`. Any rename will break class grouping.

9. **Election Post Order**: Posts are always displayed and processed in the exact order they appear in the `Posts` sheet. Use the "Reorder Posts" drag-and-drop UI in `posts.js` to change the display order.

10. **NOTA Counting**: NOTA votes count toward `totalValidVotes` for the purpose of percentage calculation. INVALID votes do not.
