/**
 * pages/admin/posts.js
 * Admin page to manage election posts and their eligibility rules.
 * Posts are stored in the database.
 */
import { api } from '../../api.js';
import { CONFIG } from '../../config.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';

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

    // Collect distinct departments from nominal roll + fallback list
    const deptSet = new Set();
    if (Array.isArray(rollRes)) {
      rollRes.forEach(r => {
        const d = String(r.Dept || r.dept || '').trim();
        if (d) deptSet.add(d);
      });
    }
    const defaultDepts = [
      'Botany', 'Chemistry', 'Commerce', 'Computer Science', 'Economics',
      'English', 'Hindi', 'History', 'Malayalam', 'Mathematics',
      'Physics', 'Psychology', 'Sanskrit', 'Tamil', 'Zoology'
    ];
    defaultDepts.forEach(d => deptSet.add(d));
    const allDepartments = Array.from(deptSet).filter(Boolean).sort();

    renderPostsPage(container.querySelector('#adminMain'), posts, allDepartments, pwd);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderPostsPage(main, posts, allDepartments, pwd) {
  main.innerHTML = `
    <div class="page-enter space-y-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 class="text-xl font-bold text-white flex items-center gap-2">
            <span>🗳️ Manage Election Posts</span>
            <span class="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">${posts.length} Posts</span>
          </h3>
          <p class="text-slate-400 text-sm mt-1">Configure post eligibility rules: gender, class/year, final year restrictions, and department associations.</p>
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

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Post Name -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">
              Post Name <span class="text-red-400">*</span>
            </label>
            <input id="pfPost" type="text" class="field" placeholder="e.g. Association Secretary Physics, III UG Representative" />
            <p class="text-[11px] text-slate-500 mt-1">Typing a department name will auto-configure department restriction.</p>
          </div>

          <!-- Year Restriction -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">
              Year / Level Restriction
            </label>
            <select id="pfYear" class="field">
              <option value="">None (Open to All Years)</option>
              <option value="1">1st Year Only (1st UG / 1st PG)</option>
              <option value="2">2nd Year Only (2nd UG / 2nd PG)</option>
              <option value="3">3rd Year Only (3rd UG)</option>
              <option value="UG">Undergraduate Only (1st, 2nd, 3rd UG)</option>
              <option value="PG">Postgraduate Only (MA / MSc / MCom)</option>
              <option value="1,2">1st &amp; 2nd Year Only (Non-Final UG)</option>
            </select>
          </div>
        </div>

        <!-- Checkbox Options -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <!-- Final Year Ineligible -->
          <label class="flex items-start gap-3 cursor-pointer glass rounded-xl p-4 border border-white/5 hover:border-rose-500/30 transition-all">
            <input id="pfFinalYear" type="checkbox" class="accent-rose-500 w-5 h-5 mt-0.5 rounded cursor-pointer" />
            <div>
              <p class="text-sm font-semibold text-white flex items-center gap-1.5">
                <span>🚫</span> Final Year Ineligible
              </p>
              <p class="text-xs text-slate-400 mt-1 leading-relaxed">
                <strong>3rd Year UG</strong> &amp; <strong>2nd Year PG</strong> cannot apply (e.g. Chief Student Editor).
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
              <label class="block text-[11px] text-slate-400 mb-1">Select from Known College Departments</label>
              <select id="pfDeptSelect" class="field">
                <option value="">-- Choose Department --</option>
                ${allDepartments.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
                <option value="__custom__">Custom / Other Department...</option>
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
                <th>Year / Level</th>
                <th>Final Year Status</th>
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
        <span>All changes apply directly to the live election rules and nomination verification engine.</span>
      </p>
    </div>`;

  renderPostRows(main, posts, pwd);
  wirePostForm(main, posts, allDepartments, pwd);
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
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-slate-500 py-10">No matching posts found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((p, i) => {
    // Year label
    let yearBadge = '<span class="text-slate-500 text-xs">— All Years —</span>';
    if (p.yearRestriction === '1') yearBadge = '<span class="badge bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs">🎓 1st Year Only</span>';
    else if (p.yearRestriction === '2') yearBadge = '<span class="badge bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs">🎓 2nd Year Only</span>';
    else if (p.yearRestriction === '3') yearBadge = '<span class="badge bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs">🎓 3rd Year Only</span>';
    else if (p.yearRestriction === 'PG') yearBadge = '<span class="badge bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs">🎓 PG Only</span>';
    else if (p.yearRestriction === 'UG') yearBadge = '<span class="badge bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs">🎓 UG Only</span>';
    else if (p.yearRestriction === '1,2') yearBadge = '<span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs">🎓 1st &amp; 2nd Year</span>';

    // Gender badge
    const genderBadge = p.femaleOnly
      ? '<span class="badge bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-semibold">♀ Female Only</span>'
      : '<span class="text-slate-400 text-xs">All Genders</span>';

    // Final year ineligible badge
    const finalYearBadge = p.finalYearIneligible
      ? '<span class="badge bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs">🚫 3rd UG / 2nd PG Barred</span>'
      : '<span class="text-emerald-400/80 text-xs">✓ Eligible</span>';

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
        <td>${finalYearBadge}</td>
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
        renderPostRows(main, updated, pwd, main.querySelector('#filterPostsInput').value);
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
      main.querySelector('#pfYear').value = p.yearRestriction || '';
      main.querySelector('#pfFemale').checked = !!p.femaleOnly;
      main.querySelector('#pfFinalYear').checked = !!p.finalYearIneligible;
      main.querySelector('#pfDept').checked = !!p.deptRestriction || !!p.restrictedDept;

      const deptName = p.restrictedDept || (p.deptRestriction && String(p.post || '').startsWith('Association Secretary ') ? p.post.replace('Association Secretary ', '').trim() : '');
      const deptSelect = main.querySelector('#pfDeptSelect');
      const deptCustom = main.querySelector('#pfDeptCustom');

      if (deptName) {
        deptCustom.value = deptName;
        // check if option exists
        const opt = Array.from(deptSelect.options).find(o => o.value.toLowerCase() === deptName.toLowerCase());
        if (opt) {
          deptSelect.value = opt.value;
        } else {
          deptSelect.value = '__custom__';
        }
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
  const postName = main.querySelector('#pfPost').value.trim() || 'This post';
  const yr = main.querySelector('#pfYear').value;
  const femaleOnly = main.querySelector('#pfFemale').checked;
  const finalYearIneligible = main.querySelector('#pfFinalYear').checked;
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

  if (yr === '1') parts.push(`<strong>Year Level:</strong> 1st Year students only (supporters must also be 1st Year).`);
  else if (yr === '2') parts.push(`<strong>Year Level:</strong> 2nd Year students only (supporters must also be 2nd Year).`);
  else if (yr === '3') parts.push(`<strong>Year Level:</strong> 3rd Year students only (supporters must also be 3rd Year).`);
  else if (yr === 'UG') parts.push(`<strong>Year Level:</strong> UG students only.`);
  else if (yr === 'PG') parts.push(`<strong>Year Level:</strong> PG students only (MA / MSc / MCom).`);
  else if (yr === '1,2') parts.push(`<strong>Year Level:</strong> 1st and 2nd Year students only.`);
  else parts.push(`<strong>Year Level:</strong> All year levels eligible.`);

  if (finalYearIneligible) {
    parts.push(`<span class="text-rose-400 font-semibold">⚠️ Final Year Barred: 3rd Year UG and 2nd Year PG students CANNOT apply.</span>`);
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
  const pfYear = main.querySelector('#pfYear');
  const pfFemale = main.querySelector('#pfFemale');
  const pfFinalYear = main.querySelector('#pfFinalYear');
  const pfDept = main.querySelector('#pfDept');
  const pfDeptSelect = main.querySelector('#pfDeptSelect');
  const pfDeptCustom = main.querySelector('#pfDeptCustom');

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
      pfYear.value = '1';
    } else if (val.includes('II UG') || val.includes('2nd Year') || val.includes('2nd UG')) {
      pfYear.value = '2';
    } else if (val.includes('III UG') || val.includes('3rd Year') || val.includes('3rd UG')) {
      pfYear.value = '3';
    } else if (val.includes('PG Rep')) {
      pfYear.value = 'PG';
    }

    // Auto-detect female
    if (val.includes('Vice Chairman') || val.includes('Joint Secretary') || val.toLowerCase().includes('lady') || val.toLowerCase().includes('female')) {
      pfFemale.checked = true;
    }

    // Auto-detect final year ineligible
    if (val.toLowerCase().includes('chief student editor')) {
      pfFinalYear.checked = true;
    }

    updateRuleSummary(main);
  });

  pfYear.addEventListener('change', () => updateRuleSummary(main));
  pfFemale.addEventListener('change', () => updateRuleSummary(main));
  pfFinalYear.addEventListener('change', () => updateRuleSummary(main));

  // Add post button
  addPostBtn.addEventListener('click', () => {
    main.querySelector('#postFormTitle').textContent = 'Add New Post';
    main.querySelector('#postFormIcon').textContent = '✨';
    pfPost.value = '';
    pfYear.value = '';
    pfFemale.checked = false;
    pfFinalYear.checked = false;
    pfDept.checked = false;
    pfDeptSelect.value = '';
    pfDeptCustom.value = '';
    main.querySelector('#pfOriginalName').value = '';

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
    const yearRestr = pfYear.value;
    const femaleOnly = pfFemale.checked;
    const finalYearIneligible = pfFinalYear.checked;
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

    const postData = {
      post: postName,
      postName,
      yearRestriction: yearRestr,
      femaleOnly,
      finalYearIneligible,
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
      posts = updated;
      renderPostRows(main, updated, pwd, filterInput.value);
    } catch (e) {
      showToast(`Failed: ${e.message}`, 'error');
    } finally {
      setLoading(saveBtn, false, '💾 Save Post');
    }
  });
}
