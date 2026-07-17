# GVC College Union Election Management System

> **Comprehensive Reference Document for Developers and AI Assistants**
> This README is the authoritative source of truth for the project's architecture, data structures, workflows, and CSS constraints. 
> 
> **FOR AI ASSISTANTS:** You MUST read this entire document before making architectural changes or CSS modifications. Assume no prior knowledge of the project. Pay special attention to the "Known Conventions and Gotchas" and "CSS & Print Layouts Constraints" sections to avoid breaking the delicate print engine or SPA layout.

---

## Table of Contents
1. [Project Purpose](#1-project-purpose)
2. [Technology Stack](#2-technology-stack)
3. [Repository Structure](#3-repository-structure)
4. [Deployment Model](#4-deployment-model)
5. [Backend — Vercel & Neon Postgres](#5-backend--vercel--neon-postgres)
6. [Frontend Architecture & Caching](#6-frontend-architecture--caching)
7. [CSS & Print Layouts Constraints (CRITICAL)](#7-css--print-layouts-constraints-critical)
8. [Page-by-Page Reference (Public)](#8-page-by-page-reference-public)
9. [Page-by-Page Reference (Admin)](#9-page-by-page-reference-admin)
10. [Complete API Reference](#10-complete-api-reference)
11. [Core Workflows](#11-core-workflows)
12. [Security Model](#12-security-model)
13. [Data Structures](#13-data-structures)
14. [Known Conventions and Gotchas](#14-known-conventions-and-gotchas)

---

## 1. Project Purpose

The GVC College Union Election Management System is a fully digital solution for running the annual college union elections at Government Victoria College (GVC), Palakkad. It replaces paper-based processes with a controlled, multi-phase digital workflow.

**The four phases it covers:**
1. **Pre-Election**: Student nomination submission with live eligibility checking.
2. **Scrutiny**: Admin verification of nominations and publication of the Valid List.
3. **Withdrawal Window**: Candidates may request withdrawal; admin approves; Final List is published.
4. **Election Logistics**: Polling booth allotment, room-wise class distribution, and automated generation of printable Electoral Rolls (class-wise).
5. **Counting & Results**: Booth-aligned counting matrix generation, real-time vote entry with audit trails, and a live results dashboard.

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend UI | Vanilla JavaScript (ES Modules) | No framework; pure DOM manipulation |
| Bundler | Vite v8 | Builds to `/dist` |
| CSS | TailwindCSS v4 + Custom CSS | Utility classes + `src/style.css` for custom design tokens |
| Backend / API | Vercel Serverless Functions | `api/main.js` |
| Database | Neon (Serverless Postgres) | Relational database mapping to app entities |
| Hosting | Vercel | Hosts both the static frontend and serverless API |
| Version Control | Git / GitHub | Repo: `sureshmagnolia/nomination`, Branch: `main` |

---

## 3. Repository Structure

```
election-app/
├── api/
│   └── main.js               # ENTIRE backend: API, database logic, authentication
├── WALKTHROUGH.md            # Developer notes on recent changes
├── package.json              # npm project config, Vite dependency
├── vite.config.js            # Vite configuration
├── index.html                # Single HTML entry point
├── src/
│   ├── main.js               # App entry point: imports all pages, configures router, runs init
│   ├── router.js             # Lightweight hash-based SPA router
│   ├── api.js                # Background sync queue, global cache, and all fetch() calls to Vercel API
│   ├── config.js             # Single source of truth for API_BASE_URL
│   ├── style.css             # Global design tokens, glass effects, spinner, alerts
│   ├── utils.js              # Shared helpers: showToast, setLoading, esc, calculateAge, triggerPrint
│   └── pages/
│       ├── home.js           # Public landing page with navigation cards
│       ├── submitNomination.js # Student nomination form with live eligibility checks
│       ├── findNomination.js # Find & print a submitted nomination by ID
│       ├── validList.js      # Public view of verified nominations (post-scrutiny)
│       ├── finalList.js      # Public view of the final candidate list (post-withdrawal)
│       ├── withdraw.js       # Student withdrawal request form
│       ├── results.js        # Public live election results dashboard
│       └── admin/
│           ├── layout.js     # Shared admin layout (sidebar, session guard)
│           ├── login.js      # Admin login with OTP via Resend
│           ├── dashboard.js  # Admin overview / stats
│           ├── verify.js     # Nomination scrutiny and approval/rejection
│           ├── withdrawals.js# Withdrawal request approval
│           ├── publish.js    # Publish Valid/Final lists
│           ├── posts.js      # Manage election posts and their eligibility rules
│           ├── booths.js     # Manage polling booths, locations, and student allotment
│           ├── counting.js   # Generate counting matrix and printable A4 forms
│           └── resultsEntry.js # Enter physical vote counts by table and post
```

---

## 4. Deployment Model

### Full-Stack Vercel Deployment
The application is designed to be deployed entirely on Vercel.
1. Connect the GitHub repository to Vercel.
2. Vercel automatically detects the Vite frontend and builds it.
3. Vercel automatically deploys the `api/main.js` file as a Serverless Function.
4. **Environment Variables**: Ensure `DATABASE_URL` (Neon Postgres) and `RESEND_API_KEY` (Resend Email OTP) are set in the Vercel Project Settings.

---

## 5. Backend — Vercel & Neon Postgres

### Database Schema
The database uses standard PostgreSQL tables hosted on Neon:
- `settings`: Key-Value global settings.
- `posts`: Election post definitions and rules.
- `nominal_roll`: Pre-populated student data.
- `nominations`: All submitted nominations and their state.

### Key Features in `api/main.js`
- **Single Endpoint Architecture**: Handles both `GET` and `POST` requests based on the `action` payload.
- **Admin Authentication**: Uses OTPs sent via Resend. A session token is returned and required for all subsequent admin actions.
- **SQL Execution**: Uses `@neondatabase/serverless` to interact directly with the Postgres database.

---

## 6. Frontend Architecture & Caching

### Background Sync & Optimistic UI
To ensure a zero-lag experience, the application implements a robust **Background Sync Architecture** in `src/api.js`:
- **Global Cache**: `_cache` holds all data (Nominations, Posts, Settings, etc.) fetched at application startup (`initPublicData()`) or upon admin login (`initAdminData()`).
- **Optimistic Updates**: When the user performs a write action (e.g., verifying a nomination), the local `_cache` is updated synchronously, allowing the UI to re-render instantly without waiting for the network.
- **Sequential Sync Queue**: The actual HTTP POST request is pushed to `syncQueue` and processed asynchronously in the background in strict order. A global UI indicator in `src/main.js` (`sync-status-indicator`) provides real-time feedback ("Saving changes..." vs "All changes saved").
- **Safety Guards**: A `beforeunload` event listener prevents the user from closing the tab if background syncs are still pending to prevent data loss.

### `src/api.js`
All backend communication is centralized here. Pattern:
- **GET**: Reads from `_cache` first. If cache miss, it fetches from the Vercel API and caches the result.
- **POST**: Utilizes the `bgPost(action, body, cacheUpdater)` wrapper to push the request to the sync queue while instantly executing the `cacheUpdater` to modify local state.

### `src/style.css`
Uses Tailwind utility classes as well as custom classes:
- `.glass` — The glassmorphism card background (used everywhere).
- `.field` — Standardized dark-theme form input/select styling. **Note**: If using `.field` alongside Tailwind layout classes, ensure it's wrapped in a sizing container (e.g., `w-full md:w-56 shrink-0`) to prevent `.field`'s inherent `width: 100%` from hijacking flex rows.
- `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-success` — Button variants.
- `.alert` / `.alert-warning` / `.alert-error` / `.alert-info` — Notification banners.
- `.badge` / `.badge-valid` / `.badge-pending` / `.badge-withdrawn` — Status chips.
- `.spinner` — CSS loading spinner animation.
- `.data-table` — Pre-styled HTML table for data grids.

---

## 7. CSS & Print Layouts Constraints (CRITICAL)

**FOR AI AGENTS: Read this before modifying Modals or Print Layouts!**

### The Transform Stacking Context Trap
- The `.page-enter` animation applies a CSS `transform: translateY()`.
- **WARNING**: In CSS, any element with a `transform`, `filter`, or `perspective` creates a new "Containing Block" for `fixed` and `absolute` positioned descendants.
- **Rule**: NEVER place a full-screen Modal (`fixed inset-0`) inside `.page-enter` or `#adminMain` if `.page-enter` is wrapping it. The modal will be trapped inside the animated box and squished or hidden by `overflow-auto`. Modals must be placed directly inside `main.innerHTML` but **OUTSIDE** of the `<div class="page-enter">` wrapper.

### Modal Glassmorphism Bugs
- **Rule**: NEVER stack `.glass` (which uses `backdrop-filter: blur`) inside an overlay that also uses `backdrop-blur`. Browsers like Chrome will fail to paint the inner element, making the modal box invisible. Use a solid background (`bg-slate-800`) for the modal box if the overlay is semi-transparent.

### Print Layouts (PDF Generation)
Physical printing of A4 forms (Ballots, Rolls, Matrix) is a massive part of this app.
- **Table Borders Disappearing in PDF**: When tables are exactly `100%` width, the right-most and bottom-most borders often get clipped by the browser's internal PDF margins.
  - **Fix/Rule**: Always use `width: 99.5%; margin: 0 auto; border-collapse: collapse; border: 1.5px solid #555;` for print tables. This guarantees all borders render perfectly in Chrome/Edge.
- **Pagination**: Do not use JavaScript `for`-loops to chunk rows per page. Rely entirely on CSS-native pagination:
  - `<table style="page-break-inside: auto;">`
  - `<thead style="display: table-header-group;">` (Repeats headers on every printed page)
  - `<tr style="page-break-inside: avoid; break-inside: avoid;">` (Prevents rows splitting across pages)

---

## 8. Page-by-Page Reference (Public)

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

## 9. Page-by-Page Reference (Admin)

All admin pages call `getSessionToken()` logic via API. If the session is expired, they redirect to `/admin`.

| Route | File | Section Key | Description |
|---|---|---|---|
| `/admin` | `login.js` | — | Login page; initiates OTP via Resend |
| `/admin/dashboard` | `dashboard.js` | `dashboard` | Summary stats and quick links |
| `/admin/verify` | `verify.js` | `verify` | Nomination scrutiny table; Approve or Reject |
| `/admin/withdrawals` | `withdrawals.js` | `withdrawals` | Withdrawal approval |
| `/admin/publish` | `publish.js` | `publish` | Toggle Valid/Final list publication |
| `/admin/posts` | `posts.js` | `posts` | Create, edit, reorder election posts |
| `/admin/booths` | `booths.js` | `booths` | Location management, booth setup, auto-allotment |
| `/admin/counting` | `counting.js` | `counting` | Counting matrix and printable A4 forms |
| `/admin/results-entry` | `resultsEntry.js` | `results-entry` | Enter physical vote counts by table and post |

---

## 10. Complete API Reference

> All GET requests: `GET {API_BASE_URL}?action=<ACTION>&<params>`
> All POST requests: `POST {API_BASE_URL}` with JSON body `{ action: '<ACTION>', ...payload }`

### Public GET Endpoints
| Action | Parameters | Returns |
|---|---|---|
| `getNominalRoll` | — | Array of all student objects |
| `getPosts` | — | Array of post objects `{ name, femaleOnly, finalYearIneligible, yearRestriction, deptRestriction }` |
| `getValidList` | — | Array of validated nomination objects |
| `getFinalList` | — | Array of finalized nomination objects |
| `getResults` | — | Array of raw result rows `{ TableNumber, Post, CandidateId, CandidateName, Votes }` |

### Admin GET Endpoints (require `sessionToken` param)
| Action | Parameters | Returns |
|---|---|---|
| `adminGetNominations` | `sessionToken` | All nominations from `nominations` table |
| `adminGetSettings` | `sessionToken` | `{ validListPublished, finalListPublished }` |
| `adminGetPosts` | `sessionToken` | All posts from `posts` table |
| `adminGetBooths` | `sessionToken` | Array of booth objects |
| `adminGetLocations` | `sessionToken` | Array of location strings |

### Admin POST Endpoints (require `sessionToken` in body)
All admin POST requests are handled via the `bgPost` sync queue to prevent UI blocking.
| Action | Key Body Fields | Effect |
|---|---|---|
| `submitNomination` | `nomination {}` | Append new nomination row to `nominations` |
| `adminVerifyNomination` | `sessionToken, id, status, comment` | Update nomination status |
| `adminSaveWithdrawal` | `sessionToken, id, decision` | Update withdrawal status |
| `adminPublishList` | `sessionToken, listType ('valid'/'final')` | Update Settings key |
| `adminAddPost` | `sessionToken, post` | Append to `posts` table |
| `adminUpdatePost` | `sessionToken, post {}` | Overwrite existing post row |
| `adminReorderPosts` | `sessionToken, posts []` | Rewrites `posts` table in given order |
| `adminSaveBooths` | `sessionToken, booths []` | Saves JSON array to `Settings` key `booths_data` |
| `adminSaveLocations` | `sessionToken, locations []` | Saves JSON array to `Settings` key `availableLocations` |
| `adminSaveResults` | `sessionToken, results []` | Replaces all rows for a given `TableNumber + Post` |

---

## 11. Core Workflows

### Nomination Submission Flow
1. Student opens `/submit`.
2. Enters Roll Number → system looks up `nominal_roll` and auto-fills personal data.
3. Student selects a Post → system validates eligibility rules from `posts`.
4. Student fills in Proposer and Seconder Roll Numbers (same validation).
5. On submit → `submitNomination` POST action → a unique 10-character ID is generated.
6. Nomination stored in `nominations` with status `Pending`.
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

---

## 12. Security Model

| Concern | Implementation |
|---|---|
| Admin access | Handled via `resend` Email OTP inside `api/main.js`. Returns a session token upon verification. |
| Session persistence | Admin session token stored in `sessionStorage`. Cleared on logout or tab close. |
| Data write protection | Public can only `submit` new nominations and withdrawal requests. They cannot edit or delete. |
| Admin mutations | All write operations require the admin session token. |
| Nomination uniqueness | Server-side logic prevents duplicate IDs. |

---

## 13. Data Structures

### Nomination Object (Row in `nominations` table)
- `id` — 10-char unique alphanumeric string
- `post` — Name of the post being contested
- `timestamp` — ISO date string
- `status` — `'Pending' | 'Approved' | 'Rejected'`
- `withdrawalStatus` — `'None' | 'Requested' | 'Approved'`
- `candidateName`, `candidateRoll`, `candidateDOB`, `candidateClass`, `candidateDept`
- `proposerName`, `proposerRoll`, `proposerClass`
- `seconderName`, `seconderRoll`, `seconderClass`

---

## 14. Known Conventions and Gotchas

1. **Background Caching**: If creating a new admin page that relies on data, ensure the data is prefetched in `initAdminData()` inside `api.js` to prevent loading spinners. All GET requests rely on `_cache` first.
2. **UI Layout Standards**: All admin data tables (Nominal Roll, Verify, Withdrawals) must use the professional full-width `.glass` filter bar that spans the entire screen beneath the page title, cleanly separating controls from the data grid.
3. **Template Literals in `counting.js`**: The `generateCountingFormHtml()` and `triggerMatrixPrint()` functions use regular template literals. Do not add backslash-escaping to `\`` or `\${}` — this will cause a Vite parse error.
4. **`esc()` is mandatory**: Always wrap any user-generated or database-fetched string in `esc()` before injecting into HTML templates to prevent XSS.
5. **`refreshUI()` pattern**: Admin pages that have interactive state use a `refreshUI()` inner function that completely re-renders the section and re-attaches all event listeners. This is intentional — do not try to do partial DOM updates.
6. **`setDefault('/')` in router**: The router's `setDefault` must be the final `.on()` chain call in `main.js`. It catches all unmatched routes.
7. **Print Layouts**: All print layouts (Nominations, Counting Forms, Official Results) use strict inline CSS and table formatting within `window.open` templates to ensure they render perfectly on A4 paper across different browsers. Avoid external stylesheets for printed components.
8. **NOTA Counting**: Both NOTA and INVALID votes count toward the total base when computing the final vote percentage for candidates.
9. **Do not run formatting/linting scripts without permission**: The codebase relies on specific string literal structures and `.js` file templates. Do not blindly run Prettier or ESLint over the whole repository unless specifically instructed.
