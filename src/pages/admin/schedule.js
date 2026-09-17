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
  // Convert ISO to local datetime-local format (YYYY-MM-DDTHH:mm) using browser local timezone
  const toLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

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

        <div class="space-y-6">
          <!-- Nomination Window Start -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-white/5 bg-black/20 rounded-lg">
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nomination Start Date</label>
              <input type="date" id="nominationStartDate" class="field w-full" value="${toLocal(schedule.nominationStart).split('T')[0] || ''}">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nomination Start Time</label>
              <input type="time" id="nominationStartTime" class="field w-full" value="${toLocal(schedule.nominationStart).split('T')[1] || ''}">
            </div>
          </div>

          <!-- Nomination Deadline -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-white/5 bg-black/20 rounded-lg">
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nomination Deadline Date (End)</label>
              <input type="date" id="nominationDeadlineDate" class="field w-full" value="${toLocal(schedule.nominationDeadline).split('T')[0] || ''}">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nomination Deadline Time</label>
              <input type="time" id="nominationDeadlineTime" class="field w-full" value="${toLocal(schedule.nominationDeadline).split('T')[1] || ''}">
            </div>
          </div>

          <!-- Withdrawal Window Start -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-white/5 bg-black/20 rounded-lg">
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Withdrawal Start Date</label>
              <input type="date" id="withdrawalStartDate" class="field w-full" value="${toLocal(schedule.withdrawalStart).split('T')[0] || ''}">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Withdrawal Start Time</label>
              <input type="time" id="withdrawalStartTime" class="field w-full" value="${toLocal(schedule.withdrawalStart).split('T')[1] || ''}">
            </div>
          </div>

          <!-- Withdrawal Window End -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-white/5 bg-black/20 rounded-lg">
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Withdrawal End Date</label>
              <input type="date" id="withdrawalEndDate" class="field w-full" value="${toLocal(schedule.withdrawalEnd).split('T')[0] || ''}">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Withdrawal End Time</label>
              <input type="time" id="withdrawalEndTime" class="field w-full" value="${toLocal(schedule.withdrawalEnd).split('T')[1] || ''}">
            </div>
          </div>

          <!-- Live Counting Status -->
          <div class="p-4 border border-amber-500/20 bg-amber-500/5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <label class="block text-xs font-bold text-amber-300 uppercase mb-1">Live Vote Counting Mode</label>
              <p class="text-[11px] text-slate-400">When active, public Results page shows "Counting in Progress". When inactive, it asks users to wait.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="countingActiveCheckbox" class="sr-only peer" ${schedule.countingActive === 'true' ? 'checked' : ''}>
              <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
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
          <div class="flex justify-between">
            <span class="text-slate-500">Counting Status:</span>
            <span id="statusCount" class="font-medium">Checking...</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const updateStatus = () => {
    const now = new Date();
    const nsD = main.querySelector('#nominationStartDate').value;
    const nsT = main.querySelector('#nominationStartTime').value;
    const nomStart = nsD && nsT ? `${nsD}T${nsT}` : null;

    const ndD = main.querySelector('#nominationDeadlineDate').value;
    const ndT = main.querySelector('#nominationDeadlineTime').value;
    const nomEnd = ndD && ndT ? `${ndD}T${ndT}` : null;
    
    const wsD = main.querySelector('#withdrawalStartDate').value;
    const wsT = main.querySelector('#withdrawalStartTime').value;
    const wStart = wsD && wsT ? `${wsD}T${wsT}` : null;
    
    const weD = main.querySelector('#withdrawalEndDate').value;
    const weT = main.querySelector('#withdrawalEndTime').value;
    const wEnd = weD && weT ? `${weD}T${weT}` : null;

    let nomStatus = '<span class="text-slate-500">Not Set</span>';
    if (nomStart && nomEnd) {
      if (now < new Date(nomStart)) nomStatus = `<span class="text-amber-400">PENDING (Opens ${new Date(nomStart).toLocaleDateString()} ${nsT})</span>`;
      else if (now > new Date(nomEnd)) nomStatus = '<span class="text-rose-400">CLOSED</span>';
      else nomStatus = '<span class="text-emerald-400 font-bold">ACTIVE (Open now)</span>';
    } else if (nomEnd) {
      nomStatus = now > new Date(nomEnd) ? '<span class="text-rose-400">CLOSED</span>' : '<span class="text-emerald-400 font-bold">ACTIVE (Open now)</span>';
    } else if (nomStart) {
      nomStatus = now < new Date(nomStart) ? '<span class="text-amber-400">PENDING</span>' : '<span class="text-emerald-400 font-bold">ACTIVE</span>';
    }
    main.querySelector('#statusNom').innerHTML = nomStatus;

    let withText = '<span class="text-slate-500">Not Set</span>';
    if (wStart && wEnd) {
      if (now < new Date(wStart)) withText = `<span class="text-amber-400">PENDING (Opens ${new Date(wStart).toLocaleDateString()} ${wsT})</span>`;
      else if (now > new Date(wEnd)) withText = '<span class="text-rose-400">CLOSED</span>';
      else withText = '<span class="text-emerald-400 font-bold">ACTIVE (Open now)</span>';
    } else if (wEnd) {
      withText = now > new Date(wEnd) ? '<span class="text-rose-400">CLOSED</span>' : '<span class="text-emerald-400 font-bold">ACTIVE (Open now)</span>';
    }
    main.querySelector('#statusWith').innerHTML = withText;

    const isCounting = main.querySelector('#countingActiveCheckbox')?.checked;
    main.querySelector('#statusCount').innerHTML = isCounting 
      ? '<span class="text-amber-400 font-bold">⚡ ACTIVE ("Counting in Progress" shown to public)</span>' 
      : '<span class="text-slate-400">⏳ INACTIVE (Public asked to wait)</span>';
  };

  updateStatus();
  main.querySelectorAll('input').forEach(i => i.onchange = updateStatus);

  main.querySelector('#btnSaveSchedule').onclick = async (e) => {
    const nomStartDate = main.querySelector('#nominationStartDate').value;
    const nomStartTime = main.querySelector('#nominationStartTime').value;
    const nomDate = main.querySelector('#nominationDeadlineDate').value;
    const nomTime = main.querySelector('#nominationDeadlineTime').value;
    const wStartDate = main.querySelector('#withdrawalStartDate').value;
    const wStartTime = main.querySelector('#withdrawalStartTime').value;
    const wEndDate = main.querySelector('#withdrawalEndDate').value;
    const wEndTime = main.querySelector('#withdrawalEndTime').value;
    const isCountingActive = main.querySelector('#countingActiveCheckbox').checked;

    const payload = {
      electionYear: main.querySelector('#electionYear').value,
      notificationDate: main.querySelector('#notificationDate').value,
      nominationStart: nomStartDate && nomStartTime ? new Date(`${nomStartDate}T${nomStartTime}`).toISOString() : '',
      nominationDeadline: nomDate && nomTime ? new Date(`${nomDate}T${nomTime}`).toISOString() : '',
      withdrawalStart: wStartDate && wStartTime ? new Date(`${wStartDate}T${wStartTime}`).toISOString() : '',
      withdrawalEnd: wEndDate && wEndTime ? new Date(`${wEndDate}T${wEndTime}`).toISOString() : '',
      countingActive: isCountingActive ? 'true' : 'false'
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
