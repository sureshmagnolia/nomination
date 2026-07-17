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
      <p class="text-slate-400 mt-4 text-sm">Loading posts...</p>
    </div>
  `);

  try {
    let posts = await api.adminGetPosts(pwd).catch(() => null);
    if (!Array.isArray(posts) || posts.length === 0) {
      posts = CONFIG.DEFAULT_POSTS;
    }
    renderPostsPage(container.querySelector('#adminMain'), posts, pwd);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderPostsPage(main, posts, pwd) {
  main.innerHTML = `
    <div class="page-enter space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-white">Manage Election Posts</h3>
          <p class="text-slate-400 text-sm mt-1">Add, edit, delete, or reorder the posts available for nomination.</p>
        </div>
        <button id="addPostBtn" class="btn btn-primary">+ Add New Post</button>
      </div>

      <!-- Add / Edit form (hidden by default) -->
      <div id="postFormWrap" class="hidden glass rounded-xl p-6 space-y-4 border border-indigo-500/30">
        <h4 id="postFormTitle" class="font-bold text-white">Add New Post</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Post Name <span class="text-red-400">*</span></label>
            <input id="pfPost" type="text" class="field" placeholder="e.g. The Chairman" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Year Restriction</label>
            <select id="pfYear" class="field">
              <option value="">None</option>
              <option value="1">1st Year Only</option>
              <option value="2">2nd Year Only</option>
              <option value="3">3rd Year Only</option>
              <option value="PG">PG Only (MA/MSc/MCom)</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label class="flex items-center gap-3 cursor-pointer glass rounded-lg p-3">
            <input id="pfFemale" type="checkbox" class="accent-indigo-500 w-4 h-4" />
            <div>
              <p class="text-sm font-medium text-white">Female Candidates Only</p>
              <p class="text-xs text-slate-500">Male candidates cannot apply</p>
            </div>
          </label>
          <label class="flex items-center gap-3 cursor-pointer glass rounded-lg p-3">
            <input id="pfFinalYear" type="checkbox" class="accent-indigo-500 w-4 h-4" />
            <div>
              <p class="text-sm font-medium text-white">Final Year Ineligible</p>
              <p class="text-xs text-slate-500">3rd year / 2nd year PG cannot apply</p>
            </div>
          </label>
          <label class="flex items-center gap-3 cursor-pointer glass rounded-lg p-3">
            <input id="pfDept" type="checkbox" class="accent-indigo-500 w-4 h-4" />
            <div>
              <p class="text-sm font-medium text-white">Department Restricted</p>
              <p class="text-xs text-slate-500">Candidate dept must match post dept</p>
            </div>
          </label>
        </div>
        <div class="flex gap-3">
          <button id="savePostBtn" class="btn btn-primary">💾 Save Post</button>
          <button id="cancelPostBtn" class="btn btn-secondary">Cancel</button>
        </div>
        <input type="hidden" id="pfOriginalName" value="" />
      </div>

      <!-- Posts table -->
      <div class="glass rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table" id="postsTable">
            <thead><tr>
              <th class="w-8">#</th>
              <th>Post Name</th>
              <th class="text-center">Female Only</th>
              <th class="text-center">Final Year Ineligible</th>
              <th class="text-center">Dept Restricted</th>
              <th class="text-center">Year Restriction</th>
              <th>Actions</th>
            </tr></thead>
            <tbody id="postsBody"></tbody>
          </table>
        </div>
      </div>
      <p class="text-xs text-slate-500">
        ℹ Changes are saved to the database. The nomination form will reflect these immediately after saving.
      </p>
    </div>`;

  renderPostRows(main, posts, pwd);
  wirePostForm(main, posts, pwd);
}

function renderPostRows(main, posts, pwd) {
  const tbody = main.querySelector('#postsBody');
  tbody.innerHTML = posts.length ? posts.map((p, i) => `
    <tr id="post-row-${i}">
      <td class="text-slate-500 text-xs">${i + 1}</td>
      <td class="font-medium text-white">${esc(p.post)}</td>
      <td class="text-center">${p.femaleOnly ? '✅' : '—'}</td>
      <td class="text-center">${p.finalYearIneligible ? '✅' : '—'}</td>
      <td class="text-center">${p.deptRestriction ? '✅' : '—'}</td>
      <td class="text-center text-slate-400 text-xs">${p.yearRestriction ? (p.yearRestriction === 'PG' ? 'PG' : `${p.yearRestriction}rd/nd/st Year`) : '—'}</td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm edit-post-btn" data-idx="${i}">✏️ Edit</button>
          <button class="btn btn-danger btn-sm delete-post-btn" data-idx="${i}" data-name="${esc(p.post)}">🗑️</button>
        </div>
      </td>
    </tr>`).join('') : `<tr><td colspan="7" class="text-center text-slate-500 py-8">No posts configured.</td></tr>`;

  // Delete buttons
  tbody.querySelectorAll('.delete-post-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.name;
      if (!confirm(`Delete post "${name}"? This cannot be undone.`)) return;
      btn.disabled = true;
      try {
        await api.adminDeletePost(pwd, name);
        showToast(`Post "${name}" deleted.`, 'success');
        // Reload
        const updated = await api.adminGetPosts(pwd);
        renderPostRows(main, updated, pwd);
      } catch (e) {
        showToast(`Failed: ${e.message}`, 'error');
        btn.disabled = false;
      }
    });
  });

  // Edit buttons
  const formWrap = main.querySelector('#postFormWrap');
  tbody.querySelectorAll('.edit-post-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const p = posts[idx];
      main.querySelector('#postFormTitle').textContent = 'Edit Post';
      main.querySelector('#pfPost').value = p.post;
      main.querySelector('#pfYear').value = p.yearRestriction || '';
      main.querySelector('#pfFemale').checked = !!p.femaleOnly;
      main.querySelector('#pfFinalYear').checked = !!p.finalYearIneligible;
      main.querySelector('#pfDept').checked = !!p.deptRestriction;
      main.querySelector('#pfOriginalName').value = p.post;
      formWrap.classList.remove('hidden');
      formWrap.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function wirePostForm(main, posts, pwd) {
  const formWrap    = main.querySelector('#postFormWrap');
  const addPostBtn  = main.querySelector('#addPostBtn');
  const cancelBtn   = main.querySelector('#cancelPostBtn');
  const saveBtn     = main.querySelector('#savePostBtn');

  addPostBtn.addEventListener('click', () => {
    main.querySelector('#postFormTitle').textContent = 'Add New Post';
    main.querySelector('#pfPost').value = '';
    main.querySelector('#pfYear').value = '';
    main.querySelector('#pfFemale').checked = false;
    main.querySelector('#pfFinalYear').checked = false;
    main.querySelector('#pfDept').checked = false;
    main.querySelector('#pfOriginalName').value = '';
    formWrap.classList.remove('hidden');
    formWrap.scrollIntoView({ behavior: 'smooth' });
  });

  cancelBtn.addEventListener('click', () => formWrap.classList.add('hidden'));

  saveBtn.addEventListener('click', async () => {
    const postName    = main.querySelector('#pfPost').value.trim();
    const yearRestr   = main.querySelector('#pfYear').value;
    const femaleOnly  = main.querySelector('#pfFemale').checked;
    const finalYearIneligible = main.querySelector('#pfFinalYear').checked;
    const deptRestriction     = main.querySelector('#pfDept').checked;
    const originalName        = main.querySelector('#pfOriginalName').value;

    if (!postName) { showToast('Post name is required.', 'error'); return; }

    const postData = { postName, yearRestriction: yearRestr, femaleOnly, finalYearIneligible, deptRestriction, originalName };

    setLoading(saveBtn, true, '💾 Save Post');
    try {
      if (originalName) {
        await api.adminUpdatePost(pwd, postData);
        showToast('Post updated successfully!', 'success');
      } else {
        await api.adminAddPost(pwd, postData);
        showToast('Post added successfully!', 'success');
      }
      formWrap.classList.add('hidden');
      const updated = await api.adminGetPosts(pwd);
      renderPostRows(main, updated, pwd);
    } catch (e) {
      showToast(`Failed: ${e.message}`, 'error');
    } finally {
      setLoading(saveBtn, false, '💾 Save Post');
    }
  });
}
