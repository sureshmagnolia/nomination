/**
 * pages/admin/posts.js
 * Admin page to manage election posts and their eligibility rules.
 * Posts are stored in the database with expanded multi-year Include/Exclude policy.
 */
import { api } from '../../api.js';
import { CONFIG } from '../../config.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading, YEAR_LEVELS, formatYearRuleDescription } from '../../utils.js';

export async function renderAdminPosts(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'posts', `
    <div class="text-center py-16">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 mt-4 text-sm">Loading posts and departments...</p>
    </div>
  `);

  try {
    const [postsRes, rollRes] = await Promise.all([
      api.adminGetPosts(pwd).catch(() => null),
      api.getNominalRoll().catch(() => [])
    ]);

    let posts = Array.isArray(postsRes) && postsRes.length > 0 ? postsRes : CONFIG.DEFAULT_POSTS;

    // 1. Collect distinct departments directly from the uploaded Nominal Roll
    const nominalDeptSet = new Set();
    if (Array.isArray(rollRes)) {
      rollRes.forEach(r => {
        const d = String(r.Dept || r.dept || r.DEPARTMENT || r.Department || '').trim();
        if (d && d !== '-' && d !== '–') nominalDeptSet.add(d);
      });
    }

    // 2. Collect any departments configured on existing posts
    const existingPostDeptSet = new Set();
    if (Array.isArray(posts)) {
      posts.forEach(p => {
        const d = (p.restrictedDept || (p.deptRestriction && String(p.post || '').startsWith('Association Secretary ') ? p.post.replace('Association Secretary ', '').trim() : '')).trim();
        if (d && d !== '-' && d !== '–') existingPostDeptSet.add(d);
      });
    }

    const defaultDepts = [
      'Botany', 'Chemistry', 'Commerce', 'Computer Science', 'Economics',
      'English', 'Hindi', 'History', 'Malayalam', 'Mathematics',
      'Physics', 'Psychology', 'Sanskrit', 'Tamil', 'Zoology'
    ];

    const hasNominalRoll = nominalDeptSet.size > 0;
    const nominalDepts = hasNominalRoll ? Array.from(nominalDeptSet).sort() : defaultDepts;
    const otherDepts = Array.from(existingPostDeptSet).filter(d => !nominalDeptSet.has(d) && (!hasNominalRoll ? !defaultDepts.includes(d) : true)).sort();
    const allDepartments = Array.from(new Set([...nominalDepts, ...otherDepts])).sort();

    renderPostsPage(container.querySelector('#adminMain'), posts, { nominalDepts, otherDepts, allDepartments, hasNominalRoll }, pwd);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderPostsPage(main, posts, deptInfo, pwd) {
  main.innerHTML = `
    <div class="page-enter space-y-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 class="text-xl font-bold text-white flex items-center gap-2">
            <span>🗳️ Manage Election Posts</span>
            <span class="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">${posts.length} Posts</span>
          </h3>
          <p class="text-slate-400 text-sm mt-1">Configure post eligibility rules: gender, multi-year include/exclude policies, and department associations.</p>
        </div>
        <button id="addPostBtn" class="btn btn-primary gap-2">
          <span>+</span> Add New Post
        </button>
      </div>

      <!-- Add / Edit form (hidden by default) -->
      <div id="postFormWrap" class="hidden glass rounded-2xl p-6 space-y-5 border border-indigo-500/30 shadow-xl">
        <div class="flex items-center justify-between border-b border-white/10 pb-4">
          <div class="flex items-center gap-3">
            <span class="text-2xl" id="postFormIcon">✏️</span>
            <div>
              <h4 id="postFormTitle" class="font-bold text-white text-lg">Add New Post</h4>
              <p class="text-xs text-slate-400">Configure election restrictions and eligibility criteria</p>
            </div>
          </div>
          <button id="closePostFormBtn" class="text-slate-400 hover:text-white text-lg px-2">✕</button>
        </div>

        <!-- Post Name -->
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">
            Post Name <span class="text-red-400">*</span>
          </label>
          <input id="pfPost" type="text" class="field" placeholder="e.g. Association Secretary Physics, III UG Representative, Lady Vice-Chairperson" />
          <p class="text-[11px] text-slate-500 mt-1">Typing a department name or year will auto-configure eligibility settings.</p>
        </div>

        <!-- Expanded Year & Level Eligibility Policy -->
        <div class="glass rounded-xl p-5 border border-indigo-500/20 bg-slate-900/40 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h5 class="text-sm font-bold text-white flex items-center gap-2">
                <span>🎓</span> Year &amp; Class Level Eligibility Policy
              </h5>
              <p class="text-xs text-slate-400">Choose whether all years can apply, include specific years only, or exclude/bar certain years.</p>
            </div>
            
            <!-- Policy Mode Radios -->
            <div class="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 text-xs self-start sm:self-auto">
              <label class="px-2.5 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-white bg-indigo-600 font-semibold" id="lblModeAll">
                <input type="radio" name="pfYearMode" value="ALL" class="hidden" checked />
                <span>🌐 All Years</span>
              </label>
              <label class="px-2.5 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-slate-300 hover:text-white" id="lblModeInclude">
                <input type="radio" name="pfYearMode" value="INCLUDE" class="hidden" />
                <span>✅ Include Only</span>
              </label>
              <label class="px-2.5 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-slate-300 hover:text-white" id="lblModeExclude">
                <input type="radio" name="pfYearMode" value="EXCLUDE" class="hidden" />
                <span>🚫 Exclude (Bar)</span>
              </label>
            </div>
          </div>

          <!-- Quick Presets -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Presets:</span>
            <button type="button" class="btn btn-secondary btn-xs py-1 px-2.5 text-[11px] bg-white/5 border-white/10 hover:bg-white/10 preset-btn" data-preset="all">Open All</button>
            <button type="button" class="btn btn-secondary btn-xs py-1 px-2.5 text-[11px] bg-white/5 border-white/10 hover:bg-white/10 preset-btn" data-preset="ug">UG Only</button>
            <button type="button" class="btn btn-secondary btn-xs py-1 px-2.5 text-[11px] bg-white/5 border-white/10 hover:bg-white/10 preset-btn" data-preset="pg">PG Only</button>
            <button type="button" class="btn btn-secondary btn-xs py-1 px-2.5 text-[11px] bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 preset-btn" data-preset="bar-final">🚫 Bar Final Years (3rd UG &amp; 2nd PG)</button>
            <button type="button" class="btn btn-secondary btn-xs py-1 px-2.5 text-[11px] bg-white/5 border-white/10 hover:bg-white/10 preset-btn" data-preset="1_ug">1st UG Only</button>
            <button type="button" class="btn btn-secondary btn-xs py-1 px-2.5 text-[11px] bg-white/5 border-white/10 hover:bg-white/10 preset-btn" data-preset="2_ug">2nd UG Only</button>
            <button type="button" class="btn btn-secondary btn-xs py-1 px-2.5 text-[11px] bg-white/5 border-white/10 hover:bg-white/10 preset-btn" data-preset="3_ug">3rd UG Only</button>
          </div>

          <!-- Multi-Year Checkbox Grid -->
          <div id="yearCheckboxesWrap" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
            ${YEAR_LEVELS.map(yl => `
              <label class="year-card flex items-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-indigo-500/40 cursor-pointer transition-all">
                <input type="checkbox" value="${yl.id}" class="pf-year-cb accent-indigo-500 w-4 h-4 rounded cursor-pointer" />
                <span class="text-xs font-semibold text-slate-200">${esc(yl.label)}</span>
              </label>
            `).join('')}
          </div>

          <p id="yearPolicyHint" class="text-[11px] text-slate-400 italic">Students from any year level can contest, propose, or second for this post.</p>
        </div>

        <!-- Hidden legacy inputs for backward compatibility -->
        <select id="pfYear" class="hidden">
          <option value="">None</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="UG">UG</option>
          <option value="PG">PG</option>
          <option value="1,2">1,2</option>
        </select>
        <input id="pfFinalYear" type="checkbox" class="hidden" />

        <!-- Checkbox Options -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Female Only -->
          <label class="flex items-start gap-3 cursor-pointer glass rounded-xl p-4 border border-white/5 hover:border-pink-500/30 transition-all">
            <input id="pfFemale" type="checkbox" class="accent-pink-500 w-5 h-5 mt-0.5 rounded cursor-pointer" />
            <div>
              <p class="text-sm font-semibold text-white flex items-center gap-1.5">
                <span>👩</span> Female Candidates Only
              </p>
              <p class="text-xs text-slate-400 mt-1 leading-relaxed">
                Reserved exclusively for female candidates. Male students cannot file nomination.
              </p>
            </div>
          </label>

          <!-- Department Restricted -->
          <label class="flex items-start gap-3 cursor-pointer glass rounded-xl p-4 border border-white/5 hover:border-amber-500/30 transition-all">
            <input id="pfDept" type="checkbox" class="accent-amber-500 w-5 h-5 mt-0.5 rounded cursor-pointer" />
            <div>
              <p class="text-sm font-semibold text-white flex items-center gap-1.5">
                <span>🏢</span> Department Restricted
              </p>
              <p class="text-xs text-slate-400 mt-1 leading-relaxed">
                Candidate, Proposer, and Seconder must all belong to the designated department.
              </p>
            </div>
          </label>
        </div>

        <!-- Department Chooser (Shown when Department Restricted is checked) -->
        <div id="deptChooserWrap" class="hidden p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-bold text-amber-300 uppercase tracking-wider">
              Designated Department <span class="text-red-400">*</span>
            </label>
            <span class="text-xs text-amber-200/70">Candidate &amp; Supporters must belong to this department</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">
                ${deptInfo.hasNominalRoll ? `Departments from Nominal Roll (${deptInfo.nominalDepts.length})` : 'Select from Known College Departments'}
              </label>
              <select id="pfDeptSelect" class="field">
                <option value="">-- Choose Department --</option>
                ${deptInfo.hasNominalRoll ? `
                  <optgroup label="📋 Departments from Nominal Roll (${deptInfo.nominalDepts.length})">
                    ${deptInfo.nominalDepts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
                  </optgroup>
                  ${deptInfo.otherDepts.length > 0 ? `
                  <optgroup label="🏢 Other Configured Departments">
                    ${deptInfo.otherDepts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
                  </optgroup>` : ''}
                ` : `
                  ${deptInfo.allDepartments.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
                `}
                <option value="__custom__">✏️ Custom / Other Department...</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">Department Name (Exact match)</label>
              <input id="pfDeptCustom" type="text" class="field" placeholder="e.g. Physics, Computer Science" />
            </div>
          </div>
        </div>

        <!-- Live Rule Summary Card -->
        <div class="rounded-xl p-4 bg-slate-900/60 border border-indigo-500/20 flex items-start gap-3 text-xs">
          <span class="text-base text-indigo-400">💡</span>
          <div class="flex-1 space-y-1">
            <p class="font-bold text-indigo-300">Live Eligibility Preview</p>
            <p id="ruleSummaryText" class="text-slate-300 leading-relaxed"></p>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button id="savePostBtn" class="btn btn-primary gap-2">
            <span>💾</span> Save Post
          </button>
          <button id="cancelPostBtn" class="btn btn-secondary">Cancel</button>
        </div>
        <input type="hidden" id="pfOriginalName" value="" />
      </div>

      <!-- Posts table -->
      <div class="glass rounded-2xl overflow-hidden border border-white/10 shadow-lg">
        <div class="p-4 border-b border-white/10 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <input id="filterPostsInput" type="text" class="field text-xs py-1.5 max-w-xs" placeholder="Search posts or departments..." />
          </div>
          <p class="text-xs text-slate-400">Total: <strong class="text-white" id="postCountBadge">${posts.length}</strong> configured</p>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table" id="postsTable">
            <thead>
              <tr>
                <th class="w-10 text-center">#</th>
                <th>Post Name</th>
                <th>Gender</th>
                <th>Year / Level Policy</th>
                <th>Department Scope</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="postsBody"></tbody>
          </table>
        </div>
      </div>
      
      <p class="text-xs text-slate-500 flex items-center gap-2">
        <span>ℹ️</span>
        <span>All changes apply directly to live nomination validation, ballot generation, booth assignments, and the counting matrix.</span>
      </p>
    </div>`;

  renderPostRows(main, posts, pwd);
  wirePostForm(main, posts, deptInfo.allDepartments, pwd);
}

function renderPostRows(main, posts, pwd, filterQuery = '') {
  const tbody = main.querySelector('#postsBody');
  const q = filterQuery.toLowerCase().trim();

  const filtered = q ? posts.filter(p => {
    const name = String(p.post || '').toLowerCase();
    const dept = String(p.restrictedDept || '').toLowerCase();
    return name.includes(q) || dept.includes(q);
  }) : posts;

  main.querySelector('#postCountBadge').textContent = filtered.length;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-slate-500 py-10">No matching posts found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((p, i) => {
    // Year Policy badge
    const yearDesc = formatYearRuleDescription(p);
    let yearBadge = '<span class="text-slate-500 text-xs">— All Years —</span>';
    const isExcluded = p.yearRuleMode === 'EXCLUDE' || p.finalYearIneligible;
    const isIncluded = p.yearRuleMode === 'INCLUDE' || (!p.yearRuleMode && p.yearRestriction);
    if (isExcluded) {
      yearBadge = `<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium">🚫 ${esc(yearDesc)}</span>`;
    } else if (isIncluded) {
      yearBadge = `<span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium">🎓 ${esc(yearDesc)}</span>`;
    }

    // Gender badge
    const genderBadge = p.femaleOnly
      ? '<span class="badge bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-semibold">♀ Female Only</span>'
      : '<span class="text-slate-400 text-xs">All Genders</span>';

    // Department badge
    const deptName = p.restrictedDept || (p.deptRestriction && String(p.post || '').startsWith('Association Secretary ') ? p.post.replace('Association Secretary ', '').trim() : '');
    const deptBadge = (p.deptRestriction || deptName)
      ? `<span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium">🏢 ${esc(deptName || 'Restricted')}</span>`
      : '<span class="text-slate-400 text-xs">All Departments</span>';

    return `
      <tr class="hover:bg-white/[0.02] transition-colors">
        <td class="text-slate-500 text-xs text-center">${i + 1}</td>
        <td>
          <span class="font-semibold text-white text-sm">${esc(p.post)}</span>
        </td>
        <td>${genderBadge}</td>
        <td>${yearBadge}</td>
        <td>${deptBadge}</td>
        <td class="text-right">
          <div class="flex items-center justify-end gap-2">
            <button class="btn btn-secondary btn-sm edit-post-btn" data-name="${esc(p.post)}">
              ✏️ Edit
            </button>
            <button class="btn btn-danger btn-sm delete-post-btn" data-name="${esc(p.post)}">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Delete handlers
  tbody.querySelectorAll('.delete-post-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.name;
      if (!confirm(`Delete post "${name}"?\n\nThis cannot be undone. Are you sure?`)) return;
      btn.disabled = true;
      try {
        await api.adminDeletePost(pwd, name);
        showToast(`Post "${name}" deleted.`, 'success');
        const updated = await api.adminGetPosts(pwd);
        posts.length = 0;
        posts.push(...updated);
        renderPostRows(main, posts, pwd, main.querySelector('#filterPostsInput').value);
      } catch (e) {
        showToast(`Failed: ${e.message}`, 'error');
        btn.disabled = false;
      }
    });
  });

  // Edit handlers
  tbody.querySelectorAll('.edit-post-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const p = posts.find(item => item.post === name);
      if (!p) return;

      const formWrap = main.querySelector('#postFormWrap');
      main.querySelector('#postFormTitle').textContent = 'Edit Post';
      main.querySelector('#postFormIcon').textContent = '✏️';
      main.querySelector('#pfPost').value = p.post;
      main.querySelector('#pfFemale').checked = !!p.femaleOnly;
      main.querySelector('#pfDept').checked = !!p.deptRestriction || !!p.restrictedDept;

      // Extract Year Policy
      let mode = p.yearRuleMode;
      let years = Array.isArray(p.yearRuleYears) ? p.yearRuleYears : (p.yearRuleYears ? String(p.yearRuleYears).split(',').map(y => y.trim()).filter(Boolean) : []);
      if (!mode) {
        if (p.finalYearIneligible) {
          mode = 'EXCLUDE';
          years = ['3_UG', '2_PG'];
        } else if (p.yearRestriction) {
          mode = 'INCLUDE';
          if (p.yearRestriction === '1') years = ['1_UG'];
          else if (p.yearRestriction === '2') years = ['2_UG'];
          else if (p.yearRestriction === '3') years = ['3_UG'];
          else if (p.yearRestriction === 'PG') years = ['1_PG', '2_PG'];
          else if (p.yearRestriction === 'UG') years = ['1_UG', '2_UG', '3_UG'];
          else if (p.yearRestriction === '1,2') years = ['1_UG', '2_UG'];
        } else {
          mode = 'ALL';
          years = [];
        }
      }

      window._setPostYearPolicy(mode, years);

      const deptName = p.restrictedDept || (p.deptRestriction && String(p.post || '').startsWith('Association Secretary ') ? p.post.replace('Association Secretary ', '').trim() : '');
      const deptSelect = main.querySelector('#pfDeptSelect');
      const deptCustom = main.querySelector('#pfDeptCustom');

      if (deptName) {
        deptCustom.value = deptName;
        const opt = Array.from(deptSelect.options).find(o => o.value.toLowerCase() === deptName.toLowerCase());
        if (opt) deptSelect.value = opt.value;
        else deptSelect.value = '__custom__';
      } else {
        deptSelect.value = '';
        deptCustom.value = '';
      }

      main.querySelector('#pfOriginalName').value = p.post;
      updateDeptVisibility(main);
      updateRuleSummary(main);

      formWrap.classList.remove('hidden');
      formWrap.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function updateDeptVisibility(main) {
  const isDept = main.querySelector('#pfDept').checked;
  const chooser = main.querySelector('#deptChooserWrap');
  if (isDept) chooser.classList.remove('hidden');
  else chooser.classList.add('hidden');
}

function updateRuleSummary(main) {
  const mode = main.querySelector('input[name="pfYearMode"]:checked')?.value || 'ALL';
  const selectedYears = Array.from(main.querySelectorAll('.pf-year-cb:checked')).map(cb => cb.value);
  const femaleOnly = main.querySelector('#pfFemale').checked;
  const isDept = main.querySelector('#pfDept').checked;
  const dept = main.querySelector('#pfDeptCustom').value.trim();

  const parts = [];
  parts.push(`<strong>Candidate:</strong> ${femaleOnly ? 'Female students only' : 'Any gender'}.`);

  if (isDept) {
    if (dept) {
      parts.push(`<strong>Department:</strong> Candidate, Proposer & Seconder must all belong to <strong>${esc(dept)}</strong>.`);
    } else {
      parts.push(`<strong>Department:</strong> Department restricted (select a department above).`);
    }
  } else {
    parts.push(`<strong>Department:</strong> Open across all college departments.`);
  }

  const yrDesc = formatYearRuleDescription({ yearRuleMode: mode, yearRuleYears: selectedYears });
  if (mode === 'ALL' || selectedYears.length === 0) {
    parts.push(`<strong>Year Level:</strong> All year levels eligible (UG &amp; PG).`);
  } else if (mode === 'INCLUDE') {
    parts.push(`<strong>Year Level:</strong> <span class="text-indigo-300 font-semibold">Strictly restricted to ${esc(yrDesc.replace('Only: ', ''))}</span> (Candidate &amp; Supporters).`);
  } else if (mode === 'EXCLUDE') {
    parts.push(`<strong>Year Level:</strong> <span class="text-rose-400 font-semibold">Ineligible / Barred: ${esc(yrDesc.replace('Barred: ', ''))}</span> (Cannot contest or support).`);
  }

  main.querySelector('#ruleSummaryText').innerHTML = parts.join(' • ');
}

function wirePostForm(main, posts, allDepartments, pwd) {
  const formWrap    = main.querySelector('#postFormWrap');
  const addPostBtn  = main.querySelector('#addPostBtn');
  const cancelBtn   = main.querySelector('#cancelPostBtn');
  const closeBtn    = main.querySelector('#closePostFormBtn');
  const saveBtn     = main.querySelector('#savePostBtn');
  const filterInput = main.querySelector('#filterPostsInput');

  const pfPost = main.querySelector('#pfPost');
  const pfFemale = main.querySelector('#pfFemale');
  const pfDept = main.querySelector('#pfDept');
  const pfDeptSelect = main.querySelector('#pfDeptSelect');
  const pfDeptCustom = main.querySelector('#pfDeptCustom');
  const yearHint = main.querySelector('#yearPolicyHint');

  const modeRadios = main.querySelectorAll('input[name="pfYearMode"]');
  const yearCards = main.querySelectorAll('.year-card');
  const yearCheckboxes = main.querySelectorAll('.pf-year-cb');

  const updateModeStyles = (activeMode) => {
    const lblAll = main.querySelector('#lblModeAll');
    const lblInc = main.querySelector('#lblModeInclude');
    const lblExc = main.querySelector('#lblModeExclude');

    [lblAll, lblInc, lblExc].forEach(l => {
      l.className = 'px-2.5 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-slate-300 hover:text-white';
    });

    if (activeMode === 'ALL') {
      lblAll.className = 'px-2.5 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-white bg-indigo-600 font-semibold shadow';
      yearHint.textContent = 'Students from any year level (I UG through II PG) can contest, propose, or second.';
      yearCards.forEach(c => {
        c.classList.add('opacity-50', 'pointer-events-none');
      });
    } else if (activeMode === 'INCLUDE') {
      lblInc.className = 'px-2.5 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-white bg-emerald-600 font-semibold shadow';
      yearHint.textContent = 'ONLY students in the checked year levels below can contest, propose, or second.';
      yearCards.forEach(c => {
        c.classList.remove('opacity-50', 'pointer-events-none');
      });
    } else if (activeMode === 'EXCLUDE') {
      lblExc.className = 'px-2.5 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-white bg-rose-600 font-semibold shadow';
      yearHint.textContent = 'Students in the checked year levels below are BARRED from contesting or endorsing nominations.';
      yearCards.forEach(c => {
        c.classList.remove('opacity-50', 'pointer-events-none');
      });
    }
  };

  const setYearPolicy = (mode, years = []) => {
    const radio = main.querySelector(`input[name="pfYearMode"][value="${mode}"]`);
    if (radio) radio.checked = true;
    updateModeStyles(mode);

    yearCheckboxes.forEach(cb => {
      cb.checked = years.includes(cb.value);
      const parentCard = cb.closest('.year-card');
      if (cb.checked) {
        parentCard?.classList.add('border-indigo-500', 'bg-indigo-500/10');
      } else {
        parentCard?.classList.remove('border-indigo-500', 'bg-indigo-500/10');
      }
    });

    updateRuleSummary(main);
  };

  // Expose helper globally on window for edit handlers
  window._setPostYearPolicy = setYearPolicy;

  modeRadios.forEach(r => {
    r.addEventListener('change', () => {
      updateModeStyles(r.value);
      updateRuleSummary(main);
    });
  });

  yearCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const parentCard = cb.closest('.year-card');
      if (cb.checked) parentCard?.classList.add('border-indigo-500', 'bg-indigo-500/10');
      else parentCard?.classList.remove('border-indigo-500', 'bg-indigo-500/10');
      updateRuleSummary(main);
    });
  });

  // Preset buttons
  main.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      if (p === 'all') setYearPolicy('ALL', []);
      else if (p === 'ug') setYearPolicy('INCLUDE', ['1_UG', '2_UG', '3_UG']);
      else if (p === 'pg') setYearPolicy('INCLUDE', ['1_PG', '2_PG']);
      else if (p === 'bar-final') setYearPolicy('EXCLUDE', ['3_UG', '2_PG']);
      else if (p === '1_ug') setYearPolicy('INCLUDE', ['1_UG']);
      else if (p === '2_ug') setYearPolicy('INCLUDE', ['2_UG']);
      else if (p === '3_ug') setYearPolicy('INCLUDE', ['3_UG']);
    });
  });

  // Filter
  filterInput.addEventListener('input', () => {
    renderPostRows(main, posts, pwd, filterInput.value);
  });

  // Department selector sync
  pfDeptSelect.addEventListener('change', () => {
    if (pfDeptSelect.value && pfDeptSelect.value !== '__custom__') {
      pfDeptCustom.value = pfDeptSelect.value;
    } else if (pfDeptSelect.value === '__custom__') {
      pfDeptCustom.focus();
    }
    updateRuleSummary(main);
  });

  pfDeptCustom.addEventListener('input', () => {
    const val = pfDeptCustom.value.trim();
    const opt = Array.from(pfDeptSelect.options).find(o => o.value.toLowerCase() === val.toLowerCase());
    if (opt) pfDeptSelect.value = opt.value;
    else if (val) pfDeptSelect.value = '__custom__';
    else pfDeptSelect.value = '';
    updateRuleSummary(main);
  });

  // Department checkbox toggle
  pfDept.addEventListener('change', () => {
    updateDeptVisibility(main);
    updateRuleSummary(main);
  });

  // Auto-detect department and rules from post name
  pfPost.addEventListener('input', () => {
    const val = pfPost.value;
    const prefix = 'Association Secretary ';
    if (val.startsWith(prefix)) {
      const detected = val.replace(prefix, '').trim();
      pfDept.checked = true;
      updateDeptVisibility(main);
      if (detected) {
        pfDeptCustom.value = detected;
        const opt = Array.from(pfDeptSelect.options).find(o => o.value.toLowerCase() === detected.toLowerCase());
        if (opt) pfDeptSelect.value = opt.value;
        else pfDeptSelect.value = '__custom__';
      }
    } else {
      // Check if title mentions a known department
      for (const d of allDepartments) {
        if (val.toLowerCase().includes(d.toLowerCase())) {
          pfDept.checked = true;
          updateDeptVisibility(main);
          pfDeptCustom.value = d;
          pfDeptSelect.value = d;
          break;
        }
      }
    }

    // Auto-detect year
    if (val.includes('I UG') || val.includes('1st Year') || val.includes('1st UG')) {
      setYearPolicy('INCLUDE', ['1_UG']);
    } else if (val.includes('II UG') || val.includes('2nd Year') || val.includes('2nd UG')) {
      setYearPolicy('INCLUDE', ['2_UG']);
    } else if (val.includes('III UG') || val.includes('3rd Year') || val.includes('3rd UG')) {
      setYearPolicy('INCLUDE', ['3_UG']);
    } else if (val.includes('PG Rep')) {
      setYearPolicy('INCLUDE', ['1_PG', '2_PG']);
    } else if (val.toLowerCase().includes('chief student editor')) {
      setYearPolicy('EXCLUDE', ['3_UG', '2_PG']);
    }

    // Auto-detect female
    if (val.includes('Vice Chairman') || val.includes('Joint Secretary') || val.toLowerCase().includes('lady') || val.toLowerCase().includes('female')) {
      pfFemale.checked = true;
    }

    updateRuleSummary(main);
  });

  pfFemale.addEventListener('change', () => updateRuleSummary(main));

  // Add post button
  addPostBtn.addEventListener('click', () => {
    main.querySelector('#postFormTitle').textContent = 'Add New Post';
    main.querySelector('#postFormIcon').textContent = '✨';
    pfPost.value = '';
    pfFemale.checked = false;
    pfDept.checked = false;
    pfDeptSelect.value = '';
    pfDeptCustom.value = '';
    main.querySelector('#pfOriginalName').value = '';

    setYearPolicy('ALL', []);
    updateDeptVisibility(main);
    updateRuleSummary(main);

    formWrap.classList.remove('hidden');
    formWrap.scrollIntoView({ behavior: 'smooth' });
    pfPost.focus();
  });

  cancelBtn.addEventListener('click', () => formWrap.classList.add('hidden'));
  closeBtn.addEventListener('click', () => formWrap.classList.add('hidden'));

  // Save post
  saveBtn.addEventListener('click', async () => {
    const postName = pfPost.value.trim();
    const mode = main.querySelector('input[name="pfYearMode"]:checked')?.value || 'ALL';
    const selectedYears = Array.from(main.querySelectorAll('.pf-year-cb:checked')).map(cb => cb.value);
    const femaleOnly = pfFemale.checked;
    const deptRestriction = pfDept.checked;
    const restrictedDept = deptRestriction ? pfDeptCustom.value.trim() : '';
    const originalName = main.querySelector('#pfOriginalName').value.trim();

    if (!postName) {
      showToast('Post name is required.', 'error');
      pfPost.focus();
      return;
    }

    if (deptRestriction && !restrictedDept) {
      showToast('Please select or specify the restricted department.', 'warning');
      pfDeptCustom.focus();
      return;
    }

    // Backward compatibility mappings
    const isFinalIneligible = mode === 'EXCLUDE' && selectedYears.includes('3_UG') && selectedYears.includes('2_PG');
    let legacyYr = '';
    if (mode === 'INCLUDE') {
      const joined = selectedYears.join(',');
      if (joined === '1_UG') legacyYr = '1';
      else if (joined === '2_UG') legacyYr = '2';
      else if (joined === '3_UG') legacyYr = '3';
      else if (joined === '1_PG,2_PG' || joined === '2_PG,1_PG') legacyYr = 'PG';
      else if (selectedYears.length === 3 && selectedYears.includes('1_UG') && selectedYears.includes('2_UG') && selectedYears.includes('3_UG')) legacyYr = 'UG';
      else if (selectedYears.length === 2 && selectedYears.includes('1_UG') && selectedYears.includes('2_UG')) legacyYr = '1,2';
    }

    const postData = {
      post: postName,
      postName,
      yearRuleMode: mode,
      yearRuleYears: selectedYears,
      yearRestriction: legacyYr,
      femaleOnly,
      finalYearIneligible: isFinalIneligible,
      deptRestriction,
      restrictedDept,
      originalName
    };

    setLoading(saveBtn, true, '💾 Saving...');
    try {
      if (originalName) {
        await api.adminUpdatePost(pwd, postData);
        showToast(`Post "${postName}" updated successfully!`, 'success');
      } else {
        await api.adminAddPost(pwd, postData);
        showToast(`Post "${postName}" created successfully!`, 'success');
      }

      formWrap.classList.add('hidden');
      const updated = await api.adminGetPosts(pwd);
      posts.length = 0;
      posts.push(...updated);

      // Reset filter so the newly saved/renamed post is not hidden by a stale search query
      const filterInput = main.querySelector('#filterPostsInput');
      if (filterInput) filterInput.value = '';

      renderPostRows(main, posts, pwd, '');

      // Highlight the saved/updated post row with a smooth pulse effect
      const rows = Array.from(main.querySelectorAll('#postsBody tr'));
      const targetRow = rows.find(tr => {
        const nameEl = tr.querySelector('td:nth-child(2) span');
        return nameEl && nameEl.textContent.trim().toLowerCase() === postName.toLowerCase();
      });
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetRow.classList.add('bg-indigo-500/30', 'transition-all', 'duration-500');
        setTimeout(() => {
          targetRow.classList.remove('bg-indigo-500/30');
        }, 3500);
      }
    } catch (e) {
      showToast(`Failed: ${e.message}`, 'error');
    } finally {
      setLoading(saveBtn, false, '💾 Save Post');
    }
  });
}
