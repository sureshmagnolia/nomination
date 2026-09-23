/**
 * pages/admin/schedule.js
 * Central Election Lifecycle & Operations Hub
 * Provides Dual-Control Architecture (Automated Schedule + Real-time Manual Override)
 * across all 8 election operations:
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

  // Helper to compute stage status badge and description
  const computeStageMeta = (override, startIso, endIso, legacyActive) => {
    const now = new Date();
    const s = startIso ? new Date(startIso) : null;
    const e = endIso ? new Date(endIso) : null;
    const hasValidStart = s && !isNaN(s.getTime());
    const hasValidEnd = e && !isNaN(e.getTime());

    if (override === 'FORCE_OPEN') {
      return {
        badge: '<span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold animate-pulse">⚡ MANUAL OVERRIDE (FORCED OPEN / LIVE)</span>',
        statusText: 'Active immediately via Administrator Manual Override (Schedule bypassed)',
        color: 'emerald',
        isActive: true
      };
    }
    if (override === 'FORCE_CLOSED') {
      return {
        badge: '<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">🛑 MANUAL OVERRIDE (FORCED CLOSED)</span>',
        statusText: 'Closed / Hidden immediately via Administrator Manual Override',
        color: 'rose',
        isActive: false
      };
    }

    // AUTO Mode (Follow Schedule)
    if (hasValidStart && hasValidEnd) {
      if (now < s) {
        return {
          badge: `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">🟡 SCHEDULED (Opens ${s.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} at ${s.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})</span>`,
          statusText: `Opens in ${formatTimeRemaining(s - now)} (Auto-Schedule)`,
          color: 'amber',
          isActive: false
        };
      } else if (now > e) {
        return {
          badge: '<span class="badge bg-slate-700 text-slate-300 border border-slate-600 text-xs font-bold">🔴 CLOSED (Schedule ended)</span>',
          statusText: `Window expired on ${e.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          color: 'slate',
          isActive: false
        };
      } else {
        return {
          badge: '<span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">🟢 ACTIVE (Auto Schedule)</span>',
          statusText: `Currently live until ${e.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          color: 'emerald',
          isActive: true
        };
      }
    } else if (hasValidStart) {
      if (now < s) {
        return {
          badge: `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">🟡 SCHEDULED (Opens ${s.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })})</span>`,
          statusText: `Opens in ${formatTimeRemaining(s - now)} (Auto-Schedule)`,
          color: 'amber',
          isActive: false
        };
      } else {
        return {
          badge: '<span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">🟢 ACTIVE (Published via Schedule)</span>',
          statusText: `Published on ${s.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          color: 'emerald',
          isActive: true
        };
      }
    }

    // Default when no schedule set
    if (legacyActive === true || legacyActive === 'true') {
      return {
        badge: '<span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">🟢 ACTIVE (Flag Active)</span>',
        statusText: 'Active (No timed schedule configured; follow manual flag)',
        color: 'emerald',
        isActive: true
      };
    }

    return {
      badge: '<span class="badge bg-slate-800 text-slate-400 border border-slate-700 text-xs">⚪ NOT SET / INACTIVE</span>',
      statusText: 'Schedule timing not set (Set dates or force manual override)',
      color: 'slate',
      isActive: false
    };
  };

  function formatTimeRemaining(ms) {
    if (ms <= 0) return '0m';
    const mins = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
  }

  main.innerHTML = `
    <div class="page-enter space-y-8 max-w-5xl mx-auto pb-16">
      <!-- Header Banner -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-2xl font-black text-white tracking-tight">Election Lifecycle & Operations Hub</h3>
            <span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs">Dual-Control</span>
          </div>
          <p class="text-slate-400 text-sm mt-1">
            Automate stage publications by specific date and time, or exercise real-time Returning Officer manual overrides for all 8 milestones.
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
            Order dated 22.09.2026. (Draft Roll: 24.09 11 AM, Claims Deadline: 25.09 4 PM, Final Roll: 28.09 4 PM, Nominations: 29.09 to 05.10 12 Noon, Polling: 15.10). Click to auto-fill all schedule fields below. You can freely modify any dates as needed.
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
        <h4 class="text-sm font-bold uppercase tracking-wider text-indigo-300">🏛️ General Statutory Framework</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase mb-2">Election Year</label>
            <input type="number" id="electionYear" class="field w-full font-mono text-base" value="${schedule.electionYear || new Date().getFullYear()}">
            <p class="text-[11px] text-slate-400 mt-1">Rendered on all ballot papers, nominal rolls, lists, and declarations.</p>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase mb-2">Notification Date (Lyngdoh Age Cut-Off)</label>
            <input type="date" id="notificationDate" class="field w-full font-mono text-base" value="${schedule.notificationDate || ''}">
            <p class="text-[11px] text-slate-400 mt-1">Student age limits (UG: &lt;22, PG: &lt;25) are strictly computed as of this official date.</p>
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
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Publication</label>
                <input type="datetime-local" id="draftRollStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.draftRollStart)}">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Claims / Objections Deadline (Corrections)</label>
                <input type="datetime-local" id="draftRollEnd" class="field w-full text-xs font-mono" value="${toLocal(schedule.draftRollEnd)}">
                <p class="text-[11px] text-amber-300/80 mt-1">📌 Dynamically displayed on Draft Nominal Roll footnote as the statutory deadline for corrections.</p>
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Real-Time Override:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override ${schedule.draftRollOverride === 'FORCE_OPEN' ? 'bg-emerald-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="draftRoll" data-mode="FORCE_OPEN">
                  ⚡ Force Publish
                </button>
                <button type="button" class="btn btn-sm btn-override ${schedule.draftRollOverride === 'FORCE_CLOSED' ? 'bg-rose-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="draftRoll" data-mode="FORCE_CLOSED">
                  🛑 Force Unpublish
                </button>
                <button type="button" class="btn btn-sm btn-override ${(!schedule.draftRollOverride || schedule.draftRollOverride === 'AUTO') ? 'bg-indigo-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="draftRoll" data-mode="AUTO">
                  🔄 Auto (Schedule)
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
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Finalization Time</label>
                <input type="datetime-local" id="finalRollStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.finalRollStart)}">
              </div>
              <div class="flex items-end">
                <p class="text-[11px] text-slate-400">When final roll becomes active, student correction claims close and official candidate nominations unlock.</p>
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Real-Time Override:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override ${schedule.finalRollOverride === 'FORCE_OPEN' ? 'bg-emerald-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="finalRoll" data-mode="FORCE_OPEN">
                  ⚡ Force Finalize
                </button>
                <button type="button" class="btn btn-sm btn-override ${schedule.finalRollOverride === 'FORCE_CLOSED' ? 'bg-rose-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="finalRoll" data-mode="FORCE_CLOSED">
                  🔓 Force Unfinalize
                </button>
                <button type="button" class="btn btn-sm btn-override ${(!schedule.finalRollOverride || schedule.finalRollOverride === 'AUTO') ? 'bg-indigo-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="finalRoll" data-mode="AUTO">
                  🔄 Auto (Schedule)
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
              <p class="text-slate-400 text-xs mt-0.5">Online candidate nomination filing window for candidates, proposers, and seconders.</p>
            </div>
            <div id="badge_nomination"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nomination Start Date & Time</label>
                <input type="datetime-local" id="nominationStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.nominationStart)}">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nomination Deadline Date & Time</label>
                <input type="datetime-local" id="nominationDeadline" class="field w-full text-xs font-mono" value="${toLocal(schedule.nominationDeadline)}">
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Real-Time Override:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override ${schedule.nominationOverride === 'FORCE_OPEN' ? 'bg-emerald-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="nomination" data-mode="FORCE_OPEN">
                  ⚡ Force Open
                </button>
                <button type="button" class="btn btn-sm btn-override ${schedule.nominationOverride === 'FORCE_CLOSED' ? 'bg-rose-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="nomination" data-mode="FORCE_CLOSED">
                  🛑 Force Close
                </button>
                <button type="button" class="btn btn-sm btn-override ${(!schedule.nominationOverride || schedule.nominationOverride === 'AUTO') ? 'bg-indigo-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="nomination" data-mode="AUTO">
                  🔄 Auto (Schedule)
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
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Publication Date & Time</label>
                <input type="datetime-local" id="validListStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.validListStart)}">
              </div>
              <div class="flex items-end">
                <p class="text-[11px] text-slate-400">Publishing this list allows candidates whose papers were accepted to inspect valid contestants and submit withdrawals.</p>
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Real-Time Override:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override ${schedule.validListOverride === 'FORCE_OPEN' ? 'bg-emerald-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="validList" data-mode="FORCE_OPEN">
                  ⚡ Force Publish
                </button>
                <button type="button" class="btn btn-sm btn-override ${schedule.validListOverride === 'FORCE_CLOSED' ? 'bg-rose-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="validList" data-mode="FORCE_CLOSED">
                  🛑 Force Unpublish
                </button>
                <button type="button" class="btn btn-sm btn-override ${(!schedule.validListOverride || schedule.validListOverride === 'AUTO') ? 'bg-indigo-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="validList" data-mode="AUTO">
                  🔄 Auto (Schedule)
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
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Withdrawal Start Date & Time</label>
                <input type="datetime-local" id="withdrawalStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.withdrawalStart)}">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Withdrawal Deadline Date & Time</label>
                <input type="datetime-local" id="withdrawalEnd" class="field w-full text-xs font-mono" value="${toLocal(schedule.withdrawalEnd)}">
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Real-Time Override:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override ${schedule.withdrawalOverride === 'FORCE_OPEN' ? 'bg-emerald-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="withdrawal" data-mode="FORCE_OPEN">
                  ⚡ Force Open
                </button>
                <button type="button" class="btn btn-sm btn-override ${schedule.withdrawalOverride === 'FORCE_CLOSED' ? 'bg-rose-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="withdrawal" data-mode="FORCE_CLOSED">
                  🛑 Force Close
                </button>
                <button type="button" class="btn btn-sm btn-override ${(!schedule.withdrawalOverride || schedule.withdrawalOverride === 'AUTO') ? 'bg-indigo-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="withdrawal" data-mode="AUTO">
                  🔄 Auto (Schedule)
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
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Publication Date & Time</label>
                <input type="datetime-local" id="finalListStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.finalListStart)}">
              </div>
              <div class="flex items-end">
                <p class="text-[11px] text-slate-400">When published, the public portal displays official contesting candidates and enables ballot sheet printing.</p>
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Real-Time Override:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override ${schedule.finalListOverride === 'FORCE_OPEN' ? 'bg-emerald-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="finalList" data-mode="FORCE_OPEN">
                  ⚡ Force Publish
                </button>
                <button type="button" class="btn btn-sm btn-override ${schedule.finalListOverride === 'FORCE_CLOSED' ? 'bg-rose-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="finalList" data-mode="FORCE_CLOSED">
                  🛑 Force Unpublish
                </button>
                <button type="button" class="btn btn-sm btn-override ${(!schedule.finalListOverride || schedule.finalListOverride === 'AUTO') ? 'bg-indigo-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="finalList" data-mode="AUTO">
                  🔄 Auto (Schedule)
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
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Polling Commencement Date & Time</label>
                <input type="datetime-local" id="pollingStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.pollingStart)}">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Polling Conclusion Date & Time</label>
                <input type="datetime-local" id="pollingEnd" class="field w-full text-xs font-mono" value="${toLocal(schedule.pollingEnd)}">
              </div>
            </div>
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Real-Time Override:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override ${schedule.pollingOverride === 'FORCE_OPEN' ? 'bg-emerald-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="polling" data-mode="FORCE_OPEN">
                  ⚡ Force Open Polling
                </button>
                <button type="button" class="btn btn-sm btn-override ${schedule.pollingOverride === 'FORCE_CLOSED' ? 'bg-rose-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="polling" data-mode="FORCE_CLOSED">
                  🛑 Force Close Polling
                </button>
                <button type="button" class="btn btn-sm btn-override ${(!schedule.pollingOverride || schedule.pollingOverride === 'AUTO') ? 'bg-indigo-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="polling" data-mode="AUTO">
                  🔄 Auto (Schedule)
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
              <p class="text-slate-400 text-xs mt-0.5">Control "Counting in Progress" live ticker and scheduled or instant release of election results.</p>
            </div>
            <div id="badge_results"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div class="lg:col-span-7 space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Scheduled Results Release Date & Time</label>
                <input type="datetime-local" id="resultsStart" class="field w-full text-xs font-mono" value="${toLocal(schedule.resultsStart)}">
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
            <div class="lg:col-span-5 bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Manual Real-Time Override:</div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-override ${schedule.resultsOverride === 'FORCE_OPEN' ? 'bg-emerald-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="results" data-mode="FORCE_OPEN">
                  ⚡ Force Publish Results
                </button>
                <button type="button" class="btn btn-sm btn-override ${schedule.resultsOverride === 'FORCE_CLOSED' ? 'bg-rose-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="results" data-mode="FORCE_CLOSED">
                  🛑 Force Hide Results
                </button>
                <button type="button" class="btn btn-sm btn-override ${(!schedule.resultsOverride || schedule.resultsOverride === 'AUTO') ? 'bg-indigo-600 text-white font-bold' : 'btn-secondary text-xs'}" data-stage="results" data-mode="AUTO">
                  🔄 Auto (Schedule)
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Bottom Save Action -->
      <div class="glass rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h4 class="font-bold text-white text-base">Save All Schedule Changes</h4>
          <p class="text-slate-400 text-xs">All scheduled dates, times, and overrides will be recorded into system settings.</p>
        </div>
        <button id="btnSaveScheduleBottom" class="btn btn-primary px-8 py-3 font-bold text-base flex items-center gap-2">
          <span>💾</span> Save All Election Schedules
        </button>
      </div>

    </div>
  `;

  // Local state tracker for overrides
  const overrides = {
    draftRoll: schedule.draftRollOverride || 'AUTO',
    finalRoll: schedule.finalRollOverride || 'AUTO',
    nomination: schedule.nominationOverride || 'AUTO',
    validList: schedule.validListOverride || 'AUTO',
    withdrawal: schedule.withdrawalOverride || 'AUTO',
    finalList: schedule.finalListOverride || 'AUTO',
    polling: schedule.pollingOverride || 'AUTO',
    results: schedule.resultsOverride || 'AUTO'
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
        legacy: false
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
        legacy: false
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
        legacy: false
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

    // 1. Update individual card badges
    stages.forEach(st => {
      const meta = computeStageMeta(st.override, st.start, st.end, st.legacy);
      const bEl = main.querySelector(`#badge_${st.id}`);
      if (bEl) bEl.innerHTML = meta.badge;

      // Update override button styles on the card
      const card = main.querySelector(`#card_${st.id}`);
      if (card) {
        card.querySelectorAll('.btn-override').forEach(btn => {
          const mode = btn.dataset.mode;
          if (mode === st.override) {
            btn.className = `btn btn-sm btn-override ${mode === 'FORCE_OPEN' ? 'bg-emerald-600 text-white font-bold' : (mode === 'FORCE_CLOSED' ? 'bg-rose-600 text-white font-bold' : 'bg-indigo-600 text-white font-bold')}`;
          } else {
            btn.className = 'btn btn-sm btn-override btn-secondary text-xs';
          }
        });
      }
    });

    // 2. Update Quick Pipeline Overview Bar
    const qGrid = main.querySelector('#quickPipelineGrid');
    if (qGrid) {
      qGrid.innerHTML = stages.map((st, i) => {
        const meta = computeStageMeta(st.override, st.start, st.end, st.legacy);
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

  // Re-evaluate badges on any input change
  main.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', updateBadgesAndPipeline);
    inp.addEventListener('change', updateBadgesAndPipeline);
  });

  // Handle Quick Override Buttons (Instant Real-time Toggle)
  main.querySelectorAll('.btn-override').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const stage = btn.dataset.stage;
      const mode = btn.dataset.mode;
      if (!stage || !mode) return;

      setLoading(btn, true, '...');
      try {
        await api.adminSetStageOverride(pwd, stage, mode);
        overrides[stage] = mode;
        showToast(`${stage.toUpperCase()} override updated to ${mode}!`, 'success');
        updateBadgesAndPipeline();
      } catch (err) {
        showToast(`Override failed: ${err.message}`, 'error');
      } finally {
        setLoading(btn, false);
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
