# GVC College Union Election Management System

This document serves as the comprehensive architectural and functional blueprint of the GVC College Union Election Management System. It is designed to provide future developers and AI assistants with complete context of the project's codebase, data structures, and operational workflows.

## 1. System Overview
A serverless Single Page Application (SPA) designed to digitize the entire college union election process. It handles everything from student nomination submission and administrative verification, to polling booth allotment, round-based counting matrices, and live public result tracking.

## 2. Technology Stack
*   **Frontend**: Vanilla JavaScript (ES Modules), Vite (Bundler), TailwindCSS v4 (Styling via CDN for simplicity).
*   **Backend / Database**: Google Apps Script (GAS) functioning as a RESTful API Backend-as-a-Service (BaaS).
*   **Database Engine**: Google Sheets (used as relational tables).
*   **Hosting**: GitHub Pages (Frontend) + Google Apps Script Web App (Backend API).

## 3. Database Architecture (Google Sheets)
The backend `Code.gs` automatically ensures the creation of the following sheets which act as database tables:
1.  **`NominalRoll`**: (Pre-populated) Contains the definitive list of eligible students (`Roll No`, `NAME`, `CLASS`, `Dept`, `Age`, etc.).
2.  **`ValidList`**: Stores all submitted nominations. Columns include exhaustive details (Nomination ID, Post, Candidate details, Proposer details, Seconder details, Timestamp, IP Address, Status, etc.).
3.  **`FinalList`**: A finalized copy of `ValidList` representing candidates who have survived scrutiny and the withdrawal window.
4.  **`Posts`**: Dynamic configuration of available election posts, including boolean eligibility rules (e.g., `Female Only`, `Final Year Ineligible`, `Year Restriction`, `Dept Restriction`).
5.  **`Booths`**: Stores Polling Booth infrastructure (`BoothNumber`, `RoomName`, `AllocatedClasses` [JSON array]).
6.  **`Results`**: Stores vote tallies. Columns: `TableNumber`, `Post`, `CandidateId`, `CandidateName`, `Votes`. (Special `CandidateId = 'NOTA'` tracks NOTA votes, and `INVALID` tracks rejected blank votes).
7.  **`Settings`**: Key-Value store for global states (e.g., `validListPublished`, `finalListPublished`, `availableLocations`).

## 4. Frontend Architecture & Design Patterns

### `src/router.js`
A custom, lightweight, hash-based client-side router. It intercepts `#` URL changes and maps them to specific rendering functions.

### `src/api.js`
A wrapper around the native `fetch` API. It handles URL encoding of parameters for `GET` requests, JSON stringification for `POST` requests, and interacts exclusively with the `CONFIG.APPS_SCRIPT_URL`. It abstracts the Google Apps Script CORS bridging mechanism.

### View Rendering (`src/pages/*`)
The application uses pure DOM manipulation via template literals.
*   **Component Pattern**: Each page exports a `renderPageName(container)` function that injects HTML into the main `#app` div and attaches event listeners.
*   **Admin Layout**: `src/pages/admin/layout.js` acts as a Higher-Order Component, wrapping admin pages with a persistent sidebar and enforcing a session-storage-based password check.

## 5. Core Workflows

### Phase 1: Nomination & Scrutiny
*   **Submit**: Students use `submitNomination.js`. The system performs live eligibility checks against `NominalRoll` data and the rules defined in `Posts` before allowing submission. Upon success, a unique 10-digit alphanumeric ID is generated and printed.
*   **Verification (Admin)**: In `verify.js`, admins review incoming nominations, approving or rejecting them. 
*   **Publish Valid List**: The admin publishes the list, making it visible to the public via `/valid-list`.

### Phase 2: Withdrawals & Final List
*   **Withdrawal Request**: Students use their unique Nomination ID + DOB + Roll No to submit a withdrawal request.
*   **Withdrawal Approval (Admin)**: Admins approve withdrawals in `withdrawals.js`.
*   **Publish Final List**: The admin locks the final list, transferring approved, non-withdrawn candidates to `SHEET_FINAL`.

### Phase 3: Election Day Logistics
*   **Polling Booths**: In `booths.js`, admins designate rooms and use an **Auto-Allotment Algorithm** to distribute classes across booths. The algorithm uses Greedy Bin Packing to keep Departments together, splitting them into a maximum of 2 booths only if the load exceeds 125% of the mean booth capacity.
*   **Counting Matrix**: In `counting.js`, the system maps the Polling Booths to Counting Tables. It generates a round-based matrix (Round 1: Associations, Middle Rounds: Cyclic General Posts, Final Round: UUC). It auto-generates printable A4 Counting Forms tailored for each table and round.

### Phase 4: Results
*   **Results Entry (Admin)**: `resultsEntry.js` provides a grid to input physical vote counts (including NOTA and Invalid votes) for specific Table + Post combinations.
*   **Live Dashboard (Public)**: `results.js` aggregates the raw table data in real-time, displaying ordered candidate rankings with dynamic progress bars.

## 6. Security Model
*   **Public Write**: The GAS Web App is deployed to run as the owner but is accessible to "Anyone".
*   **Admin Authentication**: Admin endpoints require a dynamic password passed in the payload. The password algorithm is date-based: `DDMMYYYYday` (e.g., `24042026wednesday`). This is verified server-side in `Code.gs` via the `checkAdmin()` function.
*   **Data Integrity**: Users can never overwrite data; they can only append (submit nomination/withdrawal request). Only the Admin endpoints can mutate statuses or configurations.

## 7. Deployment Instructions
1.  **Frontend Update**: Run `npm run build`. The `dist` folder is automatically mirrored to the `docs` folder via a custom build script, which is served by GitHub Pages.
2.  **Backend Update**: Any structural changes to `Code.gs` must be manually copied into the Google Apps Script editor tied to the specific Google Sheet. A "New Version" deployment must be published to reflect changes.
