# Complete Vercel & Neon Deployment Guide
## College Union Election Management Portal

This document provides a step-by-step guide to deploying and configuring the College Union Election Management System on **Vercel** with a **Neon PostgreSQL** database and **Resend** for two-factor authentication (OTP).

---

## 1. Prerequisites (All Free Tier Services)

Before deploying, ensure you have free accounts on the following platforms:

| Service | Purpose | Free Tier Allowance | Link |
| :--- | :--- | :--- | :--- |
| **GitHub** | Source code hosting & continuous deployment | Unlimited public/private repositories | [github.com](https://github.com) |
| **Vercel** | Web hosting & serverless API execution | 100GB bandwidth, serverless functions | [vercel.com](https://vercel.com) |
| **Neon** | Serverless PostgreSQL database | 0.5 GB storage, auto-suspend, instant branching | [neon.tech](https://neon.tech) |
| **Resend** | Admin OTP email delivery | 3,000 emails/month, 100 emails/day | [resend.com](https://resend.com) |

---

## 2. Database Setup (Neon PostgreSQL)

The backend uses `@neondatabase/serverless` over WebSockets/HTTPS, making it immune to connection pool exhaustion during traffic surges.

### Step-by-Step Database Provisioning:
1. Go to **[https://neon.tech](https://neon.tech)** and log in with your GitHub or Google account.
2. Click **Create Project**:
   - **Project Name:** `college-union-election` (or any preferred name).
   - **Postgres Version:** Select `Postgres 16` (or `15`).
   - **Region:** Choose the region closest to your college/students (e.g., `AWS ap-south-1 Mumbai` or `AWS eu-central-1 Frankfurt`).
3. Once the database is created, the dashboard displays your **Connection String**.
4. Select the **Connection string** dropdown and choose:
   - Role: `neondb_owner`
   - Database: `neondb`
   - Connection Type: **Pooled connection** (recommended for serverless)
5. Copy the connection string. It will look like this:
   ```text
   postgresql://neondb_owner:npg_xYz123AbCdEf@ep-sample-pooler-a1b2c3d4.ap-south-1.aws.neon.tech/neondb?sslmode=require
   ```

> [!IMPORTANT]
> **No Manual SQL Script Required!**
> The backend features **auto-provisioning and self-healing schemas** (`ensureSchema()`). The very first time the app is accessed or when you visit `/api/main?action=initDB`, all 8 core tables, indexes, and initial settings are automatically created in the database.

---

## 3. Email Authentication Setup (Resend OTP)

Returning Officers and Admins authenticate using two-factor email OTPs to prevent unauthorized tampering.

1. Go to **[https://resend.com](https://resend.com)** and sign up.
2. In the Resend dashboard, navigate to **API Keys** and click **Create API Key**:
   - **Name:** `Election-Portal`
   - **Permission:** `Full Access` (or `Sending Access`)
3. Copy the generated key (starts with `re_...`).
   ```text
   re_123456789_abcdefghijklmnopqrstuv
   ```

> [!TIP]
> **Initial Bootstrap Login (Master OTP)**:
> If you haven't configured a custom email yet, the system default email is `admin@example.com`. In this initial state, the system automatically accepts the master emergency code:
> - **Default Password:** `admin123`
> - **Master Initial OTP:** `000000`
> Once logged in, you can configure the Returning Officer's official email address in **Settings** to receive live codes via Resend.

---

## 4. Deploying to Vercel

### Method A: Deploy via Vercel Web Dashboard (Recommended)

1. **Push your repository to GitHub**:
   - Ensure the repository (e.g., `sureshmagnolia/nomination`) is pushed to GitHub on branch `main`.
2. **Import Project on Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** → **Project**.
   - Select your GitHub repository (`nomination`) and click **Import**.
3. **Configure Project Settings**:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
   - **Install Command:** `npm install` (default)
4. **Add Environment Variables**:
   In the **Environment Variables** section, expand the accordion and add the following two keys:

   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://neondb_owner:PASSWORD@ep-...neon.tech/neondb?sslmode=require` | Your Neon pooled connection string |
   | `RESEND_API_KEY` | `re_123456789_abcdef...` | Your Resend API key |

   *(Select all environments: Production, Preview, Development)*.
5. Click **Deploy**.
6. Vercel will bundle the static frontend and deploy the serverless function `api/main.js`. Within 45 seconds, your site will be live at `https://your-project.vercel.app`.

---

### Method B: Deploy via Vercel CLI (Command Line)

If you prefer terminal deployment:
1. Install Vercel CLI globally:
   ```bash
   npm i -g vercel
   ```
2. In the project root (`nomination`), log in:
   ```bash
   vercel login
   ```
3. Link project and configure environment variables:
   ```bash
   vercel env add DATABASE_URL
   # (paste your Neon connection string when prompted)

   vercel env add RESEND_API_KEY
   # (paste your Resend key when prompted)
   ```
4. Deploy to production:
   ```bash
   vercel --prod
   ```

---

## 5. Post-Deployment Initial Setup Checklist

Follow these steps once your Vercel URL is live:

### 1. First-Time Returning Officer Login
1. Open your browser and navigate to:
   ```text
   https://your-project.vercel.app/#/admin
   ```
2. Enter the default credentials:
   - **Password:** `admin123`
   - Click **Next / Request OTP**.
   - Enter OTP: `000000` (Initial bootstrap master code).
3. You are now in the Election Admin Dashboard!

### 2. Secure Your Admin Account (Mandatory)
1. In the Admin sidebar, click **⚙️ Settings** (`/#/admin/settings`).
2. **Change Admin Password**: Enter a strong, private password for the Returning Officer.
3. **Set Returning Officer Email**: Enter the official email where real 2FA OTPs should be delivered.
4. Click **Save Settings**.
5. Log out and test logging in with your new password and the 6-digit code received in your inbox.

### 3. Customize College & Election Identity
In **Settings**, configure:
- **College Name:** e.g., `Government Victoria College, Palakkad`
- **Short Name:** e.g., `GVC`
- **Election Year:** `2026`
- **Polling Date:** e.g., `12 October 2026`

### 4. Upload the Student Nominal Roll
1. In the Admin sidebar, click **📜 Nominal Roll** (`/#/admin/nominal-roll`).
2. Click **Upload CSV / Excel**.
3. Your CSV file should contain the following headers (case-insensitive):
   ```csv
   Nominal Roll Serial Number,NAME,CLASS,ADMISION NO,Dept
   1,RAHUL K,III BA ENGLISH,4102,English
   2,ANANYA S,II BSC PHYSICS,4520,Physics
   3,MUHAMMED IRFAN,I BCOM,4891,Commerce
   ```
4. Click **Save / Upload to Database**.
5. The system saves the student roll with strict natural numeric ordering (`#1, #2, #3 ... #1500`).

### 5. Review Election Posts & Eligibility
1. In the Admin sidebar, click **🏛️ Manage Posts** (`/#/admin/posts`).
2. The standard posts (Chairman, Vice Chairman, Secretary, UUC, Magazine Editor, Association Secretaries, etc.) are pre-seeded.
3. Review post restrictions:
   - **Female Only:** (e.g. Vice Chairman, Joint Secretary).
   - **Final Year Ineligible:** (e.g. Magazine Editor).
   - **Year Specific:** (e.g. I UG Rep, II UG Rep, III UG Rep, PG Rep).
   - **Department Restrictions:** (e.g. Association Secretaries).
4. You can add new posts or adjust rules with a single click.

### 6. Set Election Schedule & Timeline
1. In the Admin sidebar, click **📅 Election Schedule** (`/#/admin/schedule`).
2. Enter the official dates & times for:
   - **Nomination Filing Window** (Start & End)
   - **Scrutiny of Nominations**
   - **Withdrawal Deadline**
   - **Polling Day & Counting**
3. Save the schedule. The public countdown timers and automated form locks will synchronize with these deadlines.

---

## 6. Architecture & Scalability Reference

| Layer | Implementation | Scalability Benefit |
| :--- | :--- | :--- |
| **Vercel Edge & CDN** | Static Vite bundle (`dist/`) distributed over global Edge CDN. | Static assets load in <50ms with 99.99% uptime during student rushes. |
| **Serverless API** | `api/main.js` auto-scales concurrently from 0 to 1,000+ instances. | Handles simultaneous submissions without server crashes. |
| **Neon PostgreSQL** | Serverless compute with connection pooling (`pooler` domain). | Prevents `max_connections` saturation during counting or roll searches. |
| **Client-side Caching** | `src/api.js` in-memory cache with sequential sync queue. | Instant optimistic UI updates; students and admins experience zero lag. |

---

## 7. Troubleshooting & FAQ

#### Q: The home page shows a rotating spinner or "Database Connection Error".
* **Check:** In Vercel Project Settings → **Environment Variables**, verify that `DATABASE_URL` is set and includes `?sslmode=require` at the end.
* **Redeploy:** After adding or editing environment variables in Vercel, trigger a redeploy from **Deployments** → **Redeploy** so the new variables are baked into the serverless functions.

#### Q: I didn't receive the Admin Login OTP email.
* **Check 1:** Check your spam/junk folder.
* **Check 2:** Verify that `RESEND_API_KEY` is set correctly in Vercel.
* **Check 3:** In the free tier of Resend without a custom domain, emails are sent from `onboarding@resend.dev` to the email address registered with your Resend account.
* **Fallback:** If you are locked out during initial setup, ensure `adminEmail` is `admin@example.com` to use master code `000000`.

#### Q: What if multiple Returning Officers or Scrutiny Committee members are logged in?
* The system enforces single-active-session security. If an admin logs in on another computer, previous sessions expire automatically, preventing conflicting approvals.

#### Q: How do I backup the election data?
* In the Admin Portal, visit **💾 Database & Backup** (`/#/admin/backup`).
* Click **Create Snapshot** or **Export Complete JSON Backup** to download an encrypted backup of the nominal roll, nominations, scrutiny logs, and results.
