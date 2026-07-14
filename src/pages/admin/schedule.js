/**
 * pages/admin/schedule.js
 * Admin page to manage Election Schedule (deadlines, windows, notification date).
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

export async function renderAdminSchedule(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'schedule', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading schedule...</p></div>
  `);

  try {
    const schedule = await api.getPublicSchedule();
    renderScheduleUI(container.querySelector('#adminMain'), pwd, schedule);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderScheduleUI(main, pwd, schedule) {
  // Convert ISO to local datetime-local format (YYYY-MM-DDTHH:mm)
  const toLocal = (iso) => iso ? new Date(iso).toISOString().slice(0, 16) : '';

  main.innerHTML = `
    <div class="page-enter space-y-6 max-w-4xl">
      <div>
        <h3 class="text-xl font-bold text-white">Election Schedule</h3>
        <p class="text-slate-400 text-sm">Set official deadlines and windows for the election process.</p>
      </div>

      <div class="glass rounded-xl p-6 border-l-4 border-l-indigo-500 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Election Year -->
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Election Year</label>
            <input type="number" id="electionYear" class="field" value="${schedule.electionYear || new Date().getFullYear()}">
            <p class="text-[10px] text-slate-500 mt-1">Used in all ballot headers and titles (e.g., 2026).</p>
          </div>

          <!-- Notification Date -->
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Notification Date (For Age Calculation)</label>
            <input type="date" id="notificationDate" class="field" value="${schedule.notificationDate || ''}">
            <p class="text-[10px] text-slate-500 mt-1">Student age will be calculated as of this date.</p>
          </div>
        </div>

        <hr class="border-white/10" />

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Nomination Deadline -->
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nomination Deadline</label>
            <input type="datetime-local" id="nominationDeadline" class="field" value="${toLocal(schedule.nominationDeadline)}">
          </div>

          <!-- Withdrawal Window Start -->
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Withdrawal Start</label>
            <input type="datetime-local" id="withdrawalStart" class="field" value="${toLocal(schedule.withdrawalStart)}">
          </div>

          <!-- Withdrawal Window End -->
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Withdrawal End</label>
            <input type="datetime-local" id="withdrawalEnd" class="field" value="${toLocal(schedule.withdrawalEnd)}">
          </div>
        </div>
        
        <div class="pt-4">
          <button id="btnSaveSchedule" class="btn btn-primary w-full md:w-auto px-8">💾 Save Election Schedule</button>
        </div>
      </div>

      <!-- Current Status Information -->
      <div class="glass rounded-xl p-5 border border-white/5">
        <h4 class="text-sm font-bold text-slate-300 mb-3">Live Status Information</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-slate-500">Nomination Status:</span>
            <span id="statusNom" class="font-medium">Checking...</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Withdrawal Window:</span>
            <span id="statusWith" class="font-medium">Checking...</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const updateStatus = () => {
    const now = new Date();
    const nomEnd = main.querySelector('#nominationDeadline').value;
    const withStart = main.querySelector('#withdrawalStart').value;
    const withEnd = main.querySelector('#withdrawalEnd').value;

    const nomStatus = nomEnd && now > new Date(nomEnd) ? '<span class="text-rose-400">CLOSED</span>' : '<span class="text-emerald-400">OPEN</span>';
    main.querySelector('#statusNom').innerHTML = nomStatus;

    let withText = '<span class="text-slate-500">Not Set</span>';
    if (withStart && withEnd) {
      if (now < new Date(withStart)) withText = '<span class="text-amber-400">PENDING (Starts soon)</span>';
      else if (now > new Date(withEnd)) withText = '<span class="text-rose-400">CLOSED</span>';
      else withText = '<span class="text-emerald-400">ACTIVE (Open now)</span>';
    }
    main.querySelector('#statusWith').innerHTML = withText;
  };

  updateStatus();
  main.querySelectorAll('input').forEach(i => i.onchange = updateStatus);

    main.querySelector('#btnSaveSchedule').onclick = async (e) => {
      const payload = {
        electionYear: main.querySelector('#electionYear').value,
        notificationDate: main.querySelector('#notificationDate').value,
        nominationDeadline: main.querySelector('#nominationDeadline').value ? new Date(main.querySelector('#nominationDeadline').value).toISOString() : '',
        withdrawalStart: main.querySelector('#withdrawalStart').value ? new Date(main.querySelector('#withdrawalStart').value).toISOString() : '',
        withdrawalEnd: main.querySelector('#withdrawalEnd').value ? new Date(main.querySelector('#withdrawalEnd').value).toISOString() : '',
      };

    setLoading(e.target, true, 'Saving Schedule...');
    try {
      await api.adminSaveSchedule(pwd, payload);
      showToast('Election schedule updated successfully!', 'success');
      updateStatus();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(e.target, false, '💾 Save Election Schedule');
    }
  };
}
