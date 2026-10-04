/**
 * pages/admin/schedule.js
 * Central Election Lifecycle & Operations Hub
 * Strictly Manual Administrative Control Architecture.
 * Dates are stored as official reference points for statutory notices, printouts, and students.
 * No automatic publishing or status switching occurs based on date or time.
 * All 8 operations are controlled strictly manually by the Returning Officer:
 *   1. Draft Nominal Roll Publication & Claims
 *   2. Final Nominal Roll Publication (Roll Lock)
 *   3. Nomination Window (Start & Deadline)
 *   4. Valid Nominations List Publication (Scrutiny)
 *   5. Withdrawal Window (Start & Deadline)
 *   6. Final Candidates List Publication (Approved & Uncontested)
 *   7. Polling / Voting Window
 *   8. Vote Counting & Election Results Publication
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

export async function renderAdminSchedule(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'schedule', `
    <div class="text-center py-16">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 mt-4 text-sm">Loading election lifecycle & operational schedule...</p>
    </div>
  `);

  await loadScheduleData(container.querySelector('#adminMain'), pwd);
}

async function loadScheduleData(main, pwd) {
  if (!main) return;
  try {
    const schedule = await api.getPublicSchedule();
    renderScheduleHub(main, pwd, schedule);
  } catch (e) {
    main.innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderScheduleHub(main, pwd, schedule) {
  // Convert ISO string to browser datetime-local format (YYYY-MM-DDTHH:mm)
  const toLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const toIso = (localVal) => {
    if (!localVal) return '';
    const d = new Date(localVal);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  };

  // Helper to compute stage status badge and description (Strictly manual administrative control)
  const computeStageMeta = (override, startIso, endIso, legacyActive, stageId = '') => {
    const isLive = override === 'FORCE_OPEN' || override === 'FORCE_PUBLISHED' || ((override === 'AUTO' || !override) && (legacyActive === 'true' || legacyActive === true));

    if (isLive) {
      return {
        badge: '<span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold animate-pulse">🟢 ACTIVE / LIVE (Manual)</span>',
        statusText: 'Published & active via Returning Officer manual action.',
        color: 'emerald',
        isActive: true
      };
    } else {
      return {
        badge: '<span class="badge bg-slate-700 text-slate-300 border border-slate-600 text-xs font-bold">🔒 INACTIVE / CLOSED (Manual)</span>',
        statusText: 'Closed / unpublished. Waiting for Returning Officer manual action.',
        color: 'slate',
        isActive: false
      };
    }
  };

  // Canonical action button labels for manual overrides
  const STAGE_ACTION_LABELS = {
    draftRoll: {
      FORCE_OPEN: '⚡ Publish Draft Roll',
      FORCE_CLOSED: '🛑 Unpublish Draft Roll'
    },
    finalRoll: {
      FORCE_OPEN: '🔒 Finalize Voter List',
      FORCE_CLOSED: '🔓 Unfinalize (Draft Mode)'
    },
    nomination: {
      FORCE_OPEN: '⚡ Open Nominations',
      FORCE_CLOSED: '🛑 Close Nominations'
    },
    validList: {
      FORCE_OPEN: '⚡ Publish Valid List',
      FORCE_CLOSED: '🛑 Unpublish Valid List'
    },
    withdrawal: {
      FORCE_OPEN: '⚡ Open Withdrawals',
      FORCE_CLOSED: '🛑 Close Withdrawals'
    },
    finalList: {
      FORCE_OPEN: '⚡ Publish Final List',
      FORCE_CLOSED: '🛑 Unpublish Final List'
    },
    polling: {
      FORCE_OPEN: '⚡ Open Polling',
      FORCE_CLOSED: '🛑 Close Polling'
    },
    results: {
      FORCE_OPEN: '📢 Push Results Live',
      FORCE_CLOSED: '🔒 Keep Results Hidden'
    }
  };

  main.innerHTML = `
    <div class="page-enter space-y-8 max-w-5xl mx-auto pb-16">
      <!-- Header Banner -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-2xl font-black text-white tracking-tight">Election Lifecycle & Schedule Hub</h3>
            <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">100% Manual Admin Control</span>
          </div>
          <p class="text-slate-400 text-sm mt-1">
            Official election schedule and reference timings. Dates are recorded for statutory notices and student informational reference; all milestone publications and state transitions are controlled strictly manually by the Returning Officer.
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button id="btnSaveScheduleTop" class="btn btn-primary px-6 flex items-center gap-2">
            <span>💾</span> Save All Schedules
          </button>
          <button id="btnRefreshSchedule" class="btn btn-secondary btn-sm" title="Refresh Live Status">
            <span>🔄</span>
          </button>
        </div>
      </div>

      <!-- University Revised Schedule Fast-Preset Banner -->
      <div class="glass rounded-2xl p-5 border border-sky-500/30 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="badge bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-bold">University Order</span>
            <h4 class="text-sm font-bold text-white tracking-wide">Calicut University Revised Schedule (U.O. 13009/2026/Admn)</h4>
          </div>
          <p class="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Order dated 22.09.2026. (Draft Roll: 24.09 11 AM, Claims Deadline: 25.09 4 PM, Final Roll: 28.09 4 PM, Nominations: 29.09 to 05.10 12 Noon, Polling: 15.10). Click to auto-fill all schedule reference fields below.
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" id="btnApplyCUOrder" class="btn bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all">
            <span>📋</span> Apply CU Revised Schedule
          </button>
        </div>
      </div>

      <!-- General Statutory Foundation -->
      <div class="glass rounded-2xl p-6 border-l-4 border-l-indigo-500 space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-3">
          <div>
            <h4 class="text-sm font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
              <span>🏛️</span> General Statutory Framework &amp; Candidate Age Limits
            </h4>
            <p class="text-xs text-slate-400 mt-0.5">
              Official University election dates and Lyngdoh Committee candidate age cut-off criteria.
            </p>
          </div>
          <span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold">Statutory Cut-Offs</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase mb-1.5">Election Year</label>
            <input type="number" id="electionYear" class="field w-full font-mono text-sm" value="${schedule.electionYear || new Date().getFullYear()}">
            <p class="text-[11px] text-slate-400 mt-1">Rendered on ballot papers, rolls, and declarations.</p>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase mb-1.5">Notification Date</label>
            <input type="date" id="notificationDate" class="field w-full font-mono text-sm" value="${schedule.notificationDate || ''}">
            <p class="text-[11px] text-slate-400 mt-1">Official date of election notification (29/09/2026).</p>
          </div>
          <div class="bg-indigo-950/30 p-3 rounded-xl border border-indigo-500/30 space-y-1">
            <label class="block text-xs font-bold text-indigo-200 uppercase flex items-center gap-1.5">
              <span>🎓</span> UG Born On or After
            </label>
            <input type="date" id="ugDobCutoff" class="field w-full font-mono text-sm bg-slate-900 border-indigo-500/40 text-indigo-100" value="${schedule.ugDobCutoff || '2004-09-29'}">
            <p class="text-[11px] text-indigo-300/80 leading-tight">
              UG max 22 yrs (<strong class="text-indigo-200">29/09/2004</strong>). Students born before this date will be flagged ineligible in scrutiny.
            </p>
          </div>
          <div class="bg-purple-950/30 p-3 rounded-xl border border-purple-500/30 space-y-1">
            <label class="block text-xs font-bold text-purple-200 uppercase flex items-center gap-1.5">
              <span>📚</span> PG Born On or After
            </label>
            <input type="date" id="pgDobCutoff" class="field w-full font-mono text-sm bg-slate-900 border-purple-500/40 text-purple-100" value="${schedule.pgDobCutoff || '2001-09-29'}">
            <p class="text-[11px] text-purple-300/80 leading-tight">
              PG max 25 yrs (<strong class="text-purple-200">29/09/2001</strong>). Students born before this date will be flagged ineligible in scrutiny.
            </p>
          </div>
        </div>
      </div>

      <!-- Live Operations Pipeline Quick Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" id="quickPipelineGrid">
        <!-- Will be populated dynamically -->
      </div>

      <!-- 8 Modular Operation Cards -->
      <div class="space-y-6">

        <!-- 1. Draft Nominal Roll -->
        <div class="glass rounded-2xl p-6 border border-white/10 space-y-5" id="card_draftRoll">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl">📜</span>
                <h4 class="font-bold text-white text-base">1. Draft Nominal Roll Publication & Claims Window</h4>
              </div>
              <p class="text-slate-400 text-xs mt-0.5">Publish provisional electoral roll (D1, D2...) for student verification, claims, and objections.</p>
            </div>
            <div id="badge_draftRoll"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Reference Publication</label>
                <input type="datetime-local" id="draftRollStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.draftRollStart)}">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Claims / Objections Deadline (Notice)</label>
                <input type="datetime-local" id="draftRollEnd" class="field w-full text-xs font-mono" value="${toLocal(schedule.draftRollEnd)}">
                <p class="text-[11px] text-amber-300/80 mt-1">📌 Displayed on Draft Nominal Roll footnote as statutory deadline for student corrections.</p>
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Returning Officer Action:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override" data-stage="draftRoll" data-mode="FORCE_OPEN" data-default-text="⚡ Publish Draft Roll">
                  ⚡ Publish Draft Roll
                </button>
                <button type="button" class="btn btn-sm btn-override" data-stage="draftRoll" data-mode="FORCE_CLOSED" data-default-text="🛑 Unpublish Draft Roll">
                  🛑 Unpublish Draft Roll
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Final Nominal Roll -->
        <div class="glass rounded-2xl p-6 border border-white/10 space-y-5" id="card_finalRoll">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl">🔒</span>
                <h4 class="font-bold text-white text-base">2. Final Nominal Roll Publication & Roll Lock</h4>
              </div>
              <p class="text-slate-400 text-xs mt-0.5">Freezes voter list with permanent sequential serial numbers (1, 2, 3...). Prerequisite for nomination filing.</p>
            </div>
            <div id="badge_finalRoll"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Reference Finalization Time</label>
                <input type="datetime-local" id="finalRollStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.finalRollStart)}">
              </div>
              <div class="flex items-end">
                <p class="text-[11px] text-slate-400">Finalizing closes student correction claims and enables candidate nomination filing.</p>
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Returning Officer Action:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override" data-stage="finalRoll" data-mode="FORCE_OPEN" data-default-text="🔒 Finalize Voter List">
                  🔒 Finalize Voter List
                </button>
                <button type="button" class="btn btn-sm btn-override" data-stage="finalRoll" data-mode="FORCE_CLOSED" data-default-text="🔓 Unfinalize (Draft Mode)">
                  🔓 Unfinalize (Draft Mode)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Nomination Window -->
        <div class="glass rounded-2xl p-6 border border-white/10 space-y-5" id="card_nomination">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl">📝</span>
                <h4 class="font-bold text-white text-base">3. Nomination Submission Window</h4>
              </div>
              <p class="text-slate-400 text-xs mt-0.5">Candidate nomination filing window for candidates, proposers, and seconders.</p>
            </div>
            <div id="badge_nomination"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Reference Start Time</label>
                <input type="datetime-local" id="nominationStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.nominationStart)}">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Reference Deadline</label>
                <input type="datetime-local" id="nominationDeadline" class="field w-full text-xs font-mono" value="${toLocal(schedule.nominationDeadline)}">
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Returning Officer Action:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override" data-stage="nomination" data-mode="FORCE_OPEN" data-default-text="⚡ Open Nominations">
                  ⚡ Open Nominations
                </button>
                <button type="button" class="btn btn-sm btn-override" data-stage="nomination" data-mode="FORCE_CLOSED" data-default-text="🛑 Close Nominations">
                  🛑 Close Nominations
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Valid Nominations List -->
        <div class="glass rounded-2xl p-6 border border-white/10 space-y-5" id="card_validList">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl">📋</span>
                <h4 class="font-bold text-white text-base">4. Publication of Valid Nominations List (Scrutiny)</h4>
              </div>
              <p class="text-slate-400 text-xs mt-0.5">Pre-withdrawal scrutinized candidates list. Necessary prerequisite for candidate withdrawals.</p>
            </div>
            <div id="badge_validList"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Reference Publication</label>
                <input type="datetime-local" id="validListStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.validListStart)}">
              </div>
              <div class="flex items-end">
                <p class="text-[11px] text-slate-400">Publishing allows accepted candidates to inspect opponents and submit withdrawals.</p>
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Returning Officer Action:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override" data-stage="validList" data-mode="FORCE_OPEN" data-default-text="⚡ Publish Valid List">
                  ⚡ Publish Valid List
                </button>
                <button type="button" class="btn btn-sm btn-override" data-stage="validList" data-mode="FORCE_CLOSED" data-default-text="🛑 Unpublish Valid List">
                  🛑 Unpublish Valid List
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Withdrawal Window -->
        <div class="glass rounded-2xl p-6 border border-white/10 space-y-5" id="card_withdrawal">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl">↩️</span>
                <h4 class="font-bold text-white text-base">5. Candidature Withdrawal Window</h4>
              </div>
              <p class="text-slate-400 text-xs mt-0.5">Formal submission window for candidates wishing to withdraw their nomination with admission authentication.</p>
            </div>
            <div id="badge_withdrawal"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Reference Start</label>
                <input type="datetime-local" id="withdrawalStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.withdrawalStart)}">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Reference Deadline</label>
                <input type="datetime-local" id="withdrawalEnd" class="field w-full text-xs font-mono" value="${toLocal(schedule.withdrawalEnd)}">
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Returning Officer Action:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override" data-stage="withdrawal" data-mode="FORCE_OPEN" data-default-text="⚡ Open Withdrawals">
                  ⚡ Open Withdrawals
                </button>
                <button type="button" class="btn btn-sm btn-override" data-stage="withdrawal" data-mode="FORCE_CLOSED" data-default-text="🛑 Close Withdrawals">
                  🛑 Close Withdrawals
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Final Candidates List -->
        <div class="glass rounded-2xl p-6 border border-white/10 space-y-5" id="card_finalList">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl">🏁</span>
                <h4 class="font-bold text-white text-base">6. Publication of Final List of Contesting Candidates</h4>
              </div>
              <p class="text-slate-400 text-xs mt-0.5">Post-withdrawal approved contesting candidates. Automatically flags unopposed/uncontested candidates.</p>
            </div>
            <div id="badge_finalList"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Reference Publication</label>
                <input type="datetime-local" id="finalListStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.finalListStart)}">
              </div>
              <div class="flex items-end">
                <p class="text-[11px] text-slate-400">When published, the public portal displays official contesting candidates and enables ballot sheet printing.</p>
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Returning Officer Action:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override" data-stage="finalList" data-mode="FORCE_OPEN" data-default-text="⚡ Publish Final List">
                  ⚡ Publish Final List
                </button>
                <button type="button" class="btn btn-sm btn-override" data-stage="finalList" data-mode="FORCE_CLOSED" data-default-text="🛑 Unpublish Final List">
                  🛑 Unpublish Final List
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 7. Polling / Voting Window -->
        <div class="glass rounded-2xl p-6 border border-white/10 space-y-5" id="card_polling">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl">🗳️</span>
                <h4 class="font-bold text-white text-base">7. Polling / Voting Day Hours</h4>
              </div>
              <p class="text-slate-400 text-xs mt-0.5">Designated voting hours at physical booths. Displayed on student portal and polling officer notices.</p>
            </div>
            <div id="badge_polling"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Polling Commencement Reference</label>
                <input type="datetime-local" id="pollingStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.pollingStart)}">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Polling Conclusion Reference</label>
                <input type="datetime-local" id="pollingEnd" class="field w-full text-xs font-mono" value="${toLocal(schedule.pollingEnd)}">
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Returning Officer Action:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override" data-stage="polling" data-mode="FORCE_OPEN" data-default-text="⚡ Open Polling">
                  ⚡ Open Polling
                </button>
                <button type="button" class="btn btn-sm btn-override" data-stage="polling" data-mode="FORCE_CLOSED" data-default-text="🛑 Close Polling">
                  🛑 Close Polling
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 8. Results & Counting -->
        <div class="glass rounded-2xl p-6 border border-white/10 space-y-5" id="card_results">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl">📊</span>
                <h4 class="font-bold text-white text-base">8. Vote Counting & Official Results Declaration</h4>
              </div>
              <p class="text-slate-400 text-xs mt-0.5">Strictly Manual Release: Results go live ONLY when manually pushed by Admin / Returning Officer. No automatic scheduled release.</p>
            </div>
            <div id="badge_results"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div class="lg:col-span-7 space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Results Release Date & Time (Display Notice)</label>
                <input type="datetime-local" id="resultsStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.resultsStart)}">
                <p class="text-[11px] text-slate-400 mt-1">📅 For election calendar & notice display only. Results will NOT auto-publish on this date/time. Release requires Admin manual push.</p>
              </div>
              <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div class="text-xs font-bold text-amber-300 uppercase">Live Counting Mode Switch</div>
                  <div class="text-[11px] text-slate-400">When enabled, public results portal displays animated "Counting in Progress" banner.</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" id="countingActiveCheckbox" class="sr-only peer" ${schedule.countingActive === 'true' ? 'checked' : ''}>
                  <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-3">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Real-Time Live Push:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override" data-stage="results" data-mode="FORCE_OPEN" data-default-text="📢 Push Results Live">
                  📢 Push Results Live
                </button>
                <button type="button" class="btn btn-sm btn-override" data-stage="results" data-mode="FORCE_CLOSED" data-default-text="🔒 Keep Results Hidden">
                  🔒 Keep Results Hidden
                </button>
              </div>
              <div class="text-[11px] text-amber-300/90 font-medium bg-amber-500/10 p-2 rounded border border-amber-500/20">
                🛡️ Safety Guarantee: Results cannot go live automatically on schedule. Only manual push will publish them to students.
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Bottom Save Action Bar -->
      <div class="flex justify-end gap-3 pt-6 border-t border-white/10">
        <button id="btnSaveScheduleBottom" class="btn btn-primary px-8 py-3 text-sm font-bold shadow-xl flex items-center gap-2">
          <span>💾</span> Save All Election Schedules
        </button>
      </div>

    </div>
  `;

  // Local state tracker for overrides
  const overrides = {
    draftRoll: (schedule.draftRollPublished === 'true' || schedule.draftRollOverride === 'FORCE_OPEN') ? 'FORCE_OPEN' : 'FORCE_CLOSED',
    finalRoll: (schedule.isRollFinalized === 'true' || schedule.finalRollOverride === 'FORCE_OPEN') ? 'FORCE_OPEN' : 'FORCE_CLOSED',
    nomination: (schedule.nominationOpen === 'true' || schedule.isNomActive === true || schedule.nominationOverride === 'FORCE_OPEN') ? 'FORCE_OPEN' : 'FORCE_CLOSED',
    validList: (schedule.validListPublished === 'true' || schedule.validListOverride === 'FORCE_OPEN') ? 'FORCE_OPEN' : 'FORCE_CLOSED',
    withdrawal: (schedule.withdrawalOpen === 'true' || schedule.isWithActive === true || schedule.withdrawalOverride === 'FORCE_OPEN') ? 'FORCE_OPEN' : 'FORCE_CLOSED',
    finalList: (schedule.finalListPublished === 'true' || schedule.finalListOverride === 'FORCE_OPEN') ? 'FORCE_OPEN' : 'FORCE_CLOSED',
    polling: (schedule.pollingActive === 'true' || schedule.pollingOverride === 'FORCE_OPEN') ? 'FORCE_OPEN' : 'FORCE_CLOSED',
    results: (schedule.resultsPublished === 'true' || schedule.resultsOverride === 'FORCE_OPEN') ? 'FORCE_OPEN' : 'FORCE_CLOSED'
  };

  const updateBadgesAndPipeline = () => {
    const stages = [
      {
        id: 'draftRoll',
        name: 'Draft Roll',
        icon: '📜',
        start: toIso(main.querySelector('#draftRollStart')?.value),
        end: toIso(main.querySelector('#draftRollEnd')?.value),
        override: overrides.draftRoll,
        legacy: schedule.draftRollPublished
      },
      {
        id: 'finalRoll',
        name: 'Final Roll',
        icon: '🔒',
        start: toIso(main.querySelector('#finalRollStart')?.value),
        end: null,
        override: overrides.finalRoll,
        legacy: schedule.isRollFinalized
      },
      {
        id: 'nomination',
        name: 'Nominations',
        icon: '📝',
        start: toIso(main.querySelector('#nominationStart')?.value),
        end: toIso(main.querySelector('#nominationDeadline')?.value),
        override: overrides.nomination,
        legacy: schedule.nominationOpen || schedule.isNomActive
      },
      {
        id: 'validList',
        name: 'Valid List',
        icon: '📋',
        start: toIso(main.querySelector('#validListStart')?.value),
        end: null,
        override: overrides.validList,
        legacy: schedule.validListPublished
      },
      {
        id: 'withdrawal',
        name: 'Withdrawals',
        icon: '↩️',
        start: toIso(main.querySelector('#withdrawalStart')?.value),
        end: toIso(main.querySelector('#withdrawalEnd')?.value),
        override: overrides.withdrawal,
        legacy: schedule.withdrawalOpen || schedule.isWithActive
      },
      {
        id: 'finalList',
        name: 'Final List',
        icon: '🏁',
        start: toIso(main.querySelector('#finalListStart')?.value),
        end: null,
        override: overrides.finalList,
        legacy: schedule.finalListPublished
      },
      {
        id: 'polling',
        name: 'Polling',
        icon: '🗳️',
        start: toIso(main.querySelector('#pollingStart')?.value),
        end: toIso(main.querySelector('#pollingEnd')?.value),
        override: overrides.polling,
        legacy: schedule.pollingActive
      },
      {
        id: 'results',
        name: 'Results',
        icon: '📊',
        start: toIso(main.querySelector('#resultsStart')?.value),
        end: null,
        override: overrides.results,
        legacy: schedule.resultsPublished
      }
    ];

    // 1. Update individual card badges and buttons
    stages.forEach(st => {
      const meta = computeStageMeta(st.override, st.start, st.end, st.legacy, st.id);
      const bEl = main.querySelector(`#badge_${st.id}`);
      if (bEl) bEl.innerHTML = meta.badge;

      // Update override button styles and labels on the card
      const card = main.querySelector(`#card_${st.id}`);
      if (card) {
        card.querySelectorAll('.btn-override').forEach(btn => {
          const mode = btn.dataset.mode;
          // Ensure button text is ALWAYS correct and never 'undefined'
          const expectedLabel = STAGE_ACTION_LABELS[st.id]?.[mode];
          if (expectedLabel && (!btn.disabled || btn.innerHTML.includes('undefined'))) {
            btn.innerHTML = expectedLabel;
          }
          if (mode === st.override) {
            btn.className = `btn btn-sm btn-override ${mode === 'FORCE_OPEN' ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400/50 shadow-lg' : 'bg-rose-600 text-white font-bold ring-2 ring-rose-400/50 shadow-lg'}`;
          } else {
            btn.className = 'btn btn-sm btn-override btn-secondary text-xs opacity-75 hover:opacity-100';
          }
        });
      }
    });

    // 2. Update Quick Pipeline Overview Bar
    const qGrid = main.querySelector('#quickPipelineGrid');
    if (qGrid) {
      qGrid.innerHTML = stages.map((st, i) => {
        const meta = computeStageMeta(st.override, st.start, st.end, st.legacy, st.id);
        const bg = meta.isActive ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-white/5';
        const txtCol = meta.isActive ? 'text-emerald-400' : 'text-slate-400';
        return `
          <div class="glass rounded-xl p-3 border ${bg} transition-all">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${i + 1}. ${esc(st.name)}</span>
              <span>${st.icon}</span>
            </div>
            <div class="text-xs font-bold ${txtCol} mt-1 truncate">${meta.isActive ? '● Live' : '○ Inactive'}</div>
            <div class="text-[10px] text-slate-500 truncate mt-0.5">${esc(meta.statusText)}</div>
          </div>
        `;
      }).join('');
    }
  };

  updateBadgesAndPipeline();

  // Re-evaluate pipeline on input changes
  main.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', updateBadgesAndPipeline);
    inp.addEventListener('change', updateBadgesAndPipeline);
  });

  // Handle Quick Override Buttons (Instant Real-time Toggle)
  main.querySelectorAll('.btn-override').forEach(btn => {
    btn.addEventListener('click', async () => {
      const stage = btn.dataset.stage;
      const mode = btn.dataset.mode;
      if (!stage || !mode) return;

      const targetLabel = STAGE_ACTION_LABELS[stage]?.[mode] || btn.dataset.defaultText || btn.innerHTML.trim();
      setLoading(btn, true, 'Updating...');
      try {
        await api.adminSetStageOverride(pwd, stage, mode);
        overrides[stage] = mode;
        if (stage === 'draftRoll') schedule.draftRollPublished = mode === 'FORCE_OPEN' ? 'true' : 'false';
        if (stage === 'finalRoll') schedule.isRollFinalized = mode === 'FORCE_OPEN' ? 'true' : 'false';
        if (stage === 'nomination') schedule.nominationOpen = mode === 'FORCE_OPEN' ? 'true' : 'false';
        if (stage === 'validList') schedule.validListPublished = mode === 'FORCE_OPEN' ? 'true' : 'false';
        if (stage === 'withdrawal') schedule.withdrawalOpen = mode === 'FORCE_OPEN' ? 'true' : 'false';
        if (stage === 'finalList') schedule.finalListPublished = mode === 'FORCE_OPEN' ? 'true' : 'false';
        if (stage === 'polling') schedule.pollingActive = mode === 'FORCE_OPEN' ? 'true' : 'false';
        if (stage === 'results') schedule.resultsPublished = mode === 'FORCE_OPEN' ? 'true' : 'false';

        showToast(`${stage.toUpperCase()} is now ${mode === 'FORCE_OPEN' ? 'OPEN / PUBLISHED' : 'CLOSED / HIDDEN'}!`, 'success');
      } catch (err) {
        showToast(`Action failed: ${err.message}`, 'error');
      } finally {
        setLoading(btn, false, targetLabel);
        updateBadgesAndPipeline();
      }
    });
  });

  // Handle Global Save Schedule
  const saveAll = async (triggerBtn) => {
    setLoading(triggerBtn, true, 'Saving...');

    const payload = {
      electionYear: main.querySelector('#electionYear')?.value || new Date().getFullYear().toString(),
      notificationDate: main.querySelector('#notificationDate')?.value || '',
      ugDobCutoff: main.querySelector('#ugDobCutoff')?.value || '2004-09-29',
      pgDobCutoff: main.querySelector('#pgDobCutoff')?.value || '2001-09-29',

      draftRollStart: toIso(main.querySelector('#draftRollStart')?.value),
      draftRollEnd: toIso(main.querySelector('#draftRollEnd')?.value),
      draftRollOverride: overrides.draftRoll,

      finalRollStart: toIso(main.querySelector('#finalRollStart')?.value),
      finalRollOverride: overrides.finalRoll,

      nominationStart: toIso(main.querySelector('#nominationStart')?.value),
      nominationDeadline: toIso(main.querySelector('#nominationDeadline')?.value),
      nominationOverride: overrides.nomination,

      validListStart: toIso(main.querySelector('#validListStart')?.value),
      validListOverride: overrides.validList,

      withdrawalStart: toIso(main.querySelector('#withdrawalStart')?.value),
      withdrawalEnd: toIso(main.querySelector('#withdrawalEnd')?.value),
      withdrawalOverride: overrides.withdrawal,

      finalListStart: toIso(main.querySelector('#finalListStart')?.value),
      finalListOverride: overrides.finalList,

      pollingStart: toIso(main.querySelector('#pollingStart')?.value),
      pollingEnd: toIso(main.querySelector('#pollingEnd')?.value),
      pollingOverride: overrides.polling,

      resultsStart: toIso(main.querySelector('#resultsStart')?.value),
      resultsOverride: overrides.results,
      countingActive: main.querySelector('#countingActiveCheckbox')?.checked ? 'true' : 'false'
    };

    try {
      await api.adminSaveSchedule(pwd, payload);
      showToast('Election schedule & operational rules saved successfully!', 'success');
      await loadScheduleData(main, pwd);
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
      setLoading(triggerBtn, false, '💾 Save All Schedules');
    }
  };

  main.querySelector('#btnApplyCUOrder')?.addEventListener('click', () => {
    const setVal = (id, val) => {
      const el = main.querySelector(`#${id}`);
      if (el) el.value = val;
    };
    setVal('electionYear', '2026');
    setVal('notificationDate', '2026-09-29');
    setVal('ugDobCutoff', '2004-09-29');
    setVal('pgDobCutoff', '2001-09-29');
    setVal('draftRollStart', '2026-09-24T11:00');
    setVal('draftRollEnd', '2026-09-25T16:00');
    setVal('finalRollStart', '2026-09-28T16:00');
    setVal('nominationStart', '2026-09-29T16:00');
    setVal('nominationDeadline', '2026-10-05T12:00');
    setVal('validListStart', '2026-10-05T17:00');
    setVal('withdrawalStart', '2026-10-05T17:00');
    setVal('withdrawalEnd', '2026-10-06T12:00');
    setVal('finalListStart', '2026-10-06T17:00');
    setVal('pollingStart', '2026-10-15T09:30');
    setVal('pollingEnd', '2026-10-15T12:30');
    setVal('resultsStart', '2026-10-15T14:00');

    updateBadgesAndPipeline();
    showToast('Applied Calicut University Revised Schedule (U.O. 13009/2026/Admn)! Click "Save All Schedules" to save.', 'success');
  });

  main.querySelector('#btnSaveScheduleTop')?.addEventListener('click', (e) => saveAll(e.currentTarget));
  main.querySelector('#btnSaveScheduleBottom')?.addEventListener('click', (e) => saveAll(e.currentTarget));
  main.querySelector('#btnRefreshSchedule')?.addEventListener('click', () => loadScheduleData(main, pwd));
}
