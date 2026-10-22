document.addEventListener('DOMContentLoaded', async () => {
  const shell = document.getElementById('admin-shell');

  const authRes = await fetch('/api/me');
  const auth = await authRes.json();
  if (!auth.authenticated) {
    window.location.href = '/admin/login';
    return;
  }
  const isAdmin = auth.role === 'admin';
  shell.hidden = false;
  document.getElementById('welcome-note').textContent = `Signed in as ${auth.name} (${auth.role})`;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  });

  if (!isAdmin) {
    document.querySelectorAll('[data-admin-only]').forEach((el) => (el.hidden = true));
  }

  initNav(isAdmin);
  initExecutives(isAdmin);
  initEvents(isAdmin);
  initSuggestions();

  if (isAdmin) {
    initMetrics();
    initUserProfileModal();
    initCreateUserModal();
    initUsers();
    initSiteImages(isAdmin);
    initSubmissions(isAdmin);
    loadSummary();
  }
});

function initNav(isAdmin) {
  const navItems = document.querySelectorAll('.admin-nav-item');
  const panels = document.querySelectorAll('.admin-view');
  const loaders = {
    dashboard: loadSummary,
    executives: () => window.__loadExecutives && window.__loadExecutives(),
    events: () => window.__loadEvents && window.__loadEvents(),
    users: () => window.__loadUsers && window.__loadUsers(),
    suggestions: () => window.__loadSuggestions && window.__loadSuggestions(),
    'site-images': () => window.__loadSiteImages && window.__loadSiteImages(),
    submissions: () => window.__loadSubmissions && window.__loadSubmissions(),
  };

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      navItems.forEach((i) => i.classList.toggle('is-active', i === item));
      panels.forEach((p) => p.classList.toggle('is-active', p.dataset.viewPanel === view));
      if (loaders[view]) loaders[view]();
    });
  });

  if (!isAdmin) {
    const eventsNav = document.querySelector('.admin-nav-item[data-view="events"]');
    if (eventsNav) eventsNav.click();
  }
}

async function loadSummary() {
  const grid = document.getElementById('summary-grid');
  try {
    const res = await fetch('/api/admin/summary');
    const s = await res.json();
    grid.innerHTML = `
      <div class="admin-summary-tile"><span class="value">${s.members}</span><span class="label">Members</span></div>
      <div class="admin-summary-tile"><span class="value">${s.admins}</span><span class="label">Admins</span></div>
      <div class="admin-summary-tile"><span class="value">${s.upcomingEvents}</span><span class="label">Upcoming events</span></div>
      <div class="admin-summary-tile"><span class="value">${s.suggestions}</span><span class="label">Suggestions received</span></div>
      <div class="admin-summary-tile"><span class="value">${s.executives}</span><span class="label">Executive members listed</span></div>
    `;
  } catch (err) {
    grid.innerHTML = '<p class="admin-panel-note">Could not load summary.</p>';
  }
}

/* ---------- Metrics (admin only) ---------- */
async function initMetrics() {
  const form = document.getElementById('metrics-form');
  const status = document.getElementById('metrics-status');

  const res = await fetch('/api/metrics');
  const metrics = await res.json();

  form.innerHTML = metrics
    .map(
      (m) => `
        <div class="form-row">
          <label for="metric-${m.key}">${m.label}</label>
          <input type="number" min="0" step="1" id="metric-${m.key}" data-key="${m.key}" value="${m.value}">
        </div>`
    )
    .join('');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    const inputs = form.querySelectorAll('input[data-key]');
    const payload = Array.from(inputs).map((input) => ({
      key: input.dataset.key,
      value: Number(input.value),
    }));

    try {
      const res = await fetch('/api/admin/metrics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: payload }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save metrics.');
      status.textContent = 'Saved.';
      status.className = 'form-status success';
    } catch (err) {
      status.textContent = err.message || 'Failed to save metrics.';
      status.className = 'form-status error';
    }
  });
}

/* ---------- Executive Members (admin edits, everyone views) ---------- */
function initExecutives(isAdmin) {
  const listEl = document.getElementById('exec-list');

  if (!isAdmin) {
    async function loadReadOnly() {
      const res = await fetch('/api/executives');
      const execs = await res.json();
      if (execs.length === 0) {
        listEl.innerHTML = '<p class="admin-panel-note">No executive members listed yet.</p>';
        return;
      }
      listEl.innerHTML = execs
        .map(
          (x) => `
          <div class="admin-exec-card">
            <div class="admin-exec-avatar" style="${x.photo_url ? `background-image:url('${x.photo_url}')` : ''}"></div>
            <div class="admin-exec-info">
              <h3>${escapeHtml(x.name)}</h3>
              <p>${escapeHtml(x.position)}</p>
            </div>
          </div>`
        )
        .join('');
    }
    window.__loadExecutives = loadReadOnly;
    loadReadOnly();
    return;
  }

  const form = document.getElementById('exec-form');
  const status = document.getElementById('exec-status');
  const idField = document.getElementById('exec-id');
  const nameField = document.getElementById('exec-name');
  const positionField = document.getElementById('exec-position');
  const orderField = document.getElementById('exec-order');
  const photoField = document.getElementById('exec-photo');
  const submitBtn = document.getElementById('exec-submit-btn');
  const cancelBtn = document.getElementById('exec-cancel-btn');

  function resetForm() {
    idField.value = '';
    form.reset();
    orderField.value = 0;
    submitBtn.textContent = 'Add executive';
    cancelBtn.style.display = 'none';
  }

  async function loadExecutives() {
    const res = await fetch('/api/admin/executives');
    const execs = await res.json();

    if (execs.length === 0) {
      listEl.innerHTML = '<p class="admin-panel-note">No executive members added yet.</p>';
      return;
    }

    listEl.innerHTML = execs
      .map(
        (x) => `
        <div class="admin-exec-card" data-id="${x.id}">
          <div class="admin-exec-avatar" style="${x.photo_url ? `background-image:url('${x.photo_url}')` : ''}"></div>
          <div class="admin-exec-info">
            <h3>${escapeHtml(x.name)}</h3>
            <p>${escapeHtml(x.position)}</p>
          </div>
          <div class="admin-list-item-actions">
            <button type="button" class="admin-link-btn" data-action="edit">Edit</button>
            <button type="button" class="admin-link-btn admin-link-btn-danger" data-action="delete">Delete</button>
          </div>
        </div>`
      )
      .join('');

    listEl.querySelectorAll('.admin-exec-card').forEach((card) => {
      const id = card.dataset.id;
      const exec = execs.find((x) => String(x.id) === id);

      card.querySelector('[data-action="edit"]').addEventListener('click', () => {
        idField.value = exec.id;
        nameField.value = exec.name;
        positionField.value = exec.position;
        orderField.value = exec.sort_order;
        submitBtn.textContent = 'Save changes';
        cancelBtn.style.display = 'inline-flex';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm(`Remove "${exec.name}"?`)) return;
        await fetch(`/api/admin/executives/${exec.id}`, { method: 'DELETE' });
        if (idField.value === String(exec.id)) resetForm();
        loadExecutives();
      });
    });
  }

  cancelBtn.addEventListener('click', resetForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    const formData = new FormData();
    formData.append('name', nameField.value);
    formData.append('position', positionField.value);
    formData.append('sortOrder', orderField.value);
    if (photoField.files[0]) formData.append('photo', photoField.files[0]);

    const isEdit = Boolean(idField.value);
    const url = isEdit ? `/api/admin/executives/${idField.value}` : '/api/admin/executives';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method, body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save executive.');

      status.textContent = 'Saved.';
      status.className = 'form-status success';
      resetForm();
      loadExecutives();
    } catch (err) {
      status.textContent = err.message || 'Failed to save executive.';
      status.className = 'form-status error';
    }
  });

  window.__loadExecutives = loadExecutives;
  loadExecutives();
}

/* ---------- Events & Meetings (admin edits, everyone views) ---------- */
function initEvents(isAdmin) {
  const listEl = document.getElementById('event-list');

  if (!isAdmin) {
    async function loadReadOnly() {
      const res = await fetch('/api/events');
      const events = await res.json();
      if (events.length === 0) {
        listEl.innerHTML = '<p class="admin-panel-note">No upcoming events right now.</p>';
        return;
      }
      listEl.innerHTML = events
        .map(
          (ev) => `
          <div class="admin-list-item">
            <h3>${escapeHtml(ev.title)}</h3>
            <p class="admin-list-item-meta">${formatDateTime(ev.event_date)}${ev.location ? ` · ${escapeHtml(ev.location)}` : ''}</p>
            ${ev.description ? `<p class="admin-suggestion-message">${escapeHtml(ev.description)}</p>` : ''}
          </div>`
        )
        .join('');
    }
    window.__loadEvents = loadReadOnly;
    loadReadOnly();
    return;
  }

  const form = document.getElementById('event-form');
  const status = document.getElementById('event-status');
  const idField = document.getElementById('event-id');
  const titleField = document.getElementById('event-title');
  const dateField = document.getElementById('event-date');
  const locationField = document.getElementById('event-location');
  const descField = document.getElementById('event-description');
  const notifyField = document.getElementById('event-notify');
  const submitBtn = document.getElementById('event-submit-btn');
  const cancelBtn = document.getElementById('event-cancel-btn');

  function resetForm() {
    idField.value = '';
    form.reset();
    submitBtn.textContent = 'Schedule event';
    cancelBtn.style.display = 'none';
  }

  async function loadEvents() {
    const res = await fetch('/api/admin/events');
    const events = await res.json();

    if (events.length === 0) {
      listEl.innerHTML = '<p class="admin-panel-note">No events scheduled yet.</p>';
      return;
    }

    listEl.innerHTML = events
      .map((ev) => {
        const isPast = new Date(ev.event_date) < new Date();
        return `
        <div class="admin-list-item" data-id="${ev.id}">
          <div class="admin-list-item-head">
            <h3>${escapeHtml(ev.title)}</h3>
            <span class="admin-badge ${isPast ? 'is-neutral' : 'is-good'}">${isPast ? 'Past' : 'Upcoming'}</span>
          </div>
          <p class="admin-list-item-meta">${formatDateTime(ev.event_date)}${ev.location ? ` · ${escapeHtml(ev.location)}` : ''}${ev.notified_at ? ' · Members notified' : ''}</p>
          <div class="admin-list-item-actions">
            <button type="button" class="admin-link-btn" data-action="edit">Edit</button>
            <button type="button" class="admin-link-btn admin-link-btn-danger" data-action="delete">Delete</button>
          </div>
        </div>`;
      })
      .join('');

    listEl.querySelectorAll('.admin-list-item').forEach((item) => {
      const id = item.dataset.id;
      const ev = events.find((e) => String(e.id) === id);

      item.querySelector('[data-action="edit"]').addEventListener('click', () => {
        idField.value = ev.id;
        titleField.value = ev.title;
        dateField.value = toLocalDatetimeInputValue(ev.event_date);
        locationField.value = ev.location || '';
        descField.value = ev.description || '';
        notifyField.checked = ev.notify_members;
        notifyField.disabled = Boolean(ev.notified_at);
        submitBtn.textContent = 'Save changes';
        cancelBtn.style.display = 'inline-flex';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      item.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm(`Delete "${ev.title}"?`)) return;
        await fetch(`/api/admin/events/${ev.id}`, { method: 'DELETE' });
        if (idField.value === String(ev.id)) resetForm();
        loadEvents();
      });
    });
  }

  cancelBtn.addEventListener('click', () => {
    notifyField.disabled = false;
    resetForm();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    const payload = {
      title: titleField.value,
      description: descField.value,
      eventDate: dateField.value ? new Date(dateField.value).toISOString() : '',
      location: locationField.value,
      notifyMembers: notifyField.checked,
    };

    const isEdit = Boolean(idField.value);
    const url = isEdit ? `/api/admin/events/${idField.value}` : '/api/admin/events';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save event.');

      status.textContent = 'Saved.';
      status.className = 'form-status success';
      notifyField.disabled = false;
      resetForm();
      loadEvents();
      loadSummary();
    } catch (err) {
      status.textContent = err.message || 'Failed to save event.';
      status.className = 'form-status error';
    }
  });

  window.__loadEvents = loadEvents;
  loadEvents();
}

/* ---------- Photo Placeholders (admin only) ---------- */
const SITE_IMAGE_SLOTS = [
  { key: 'home_hero', label: 'Homepage — Hero background' },
  { key: 'home_problem', label: 'Homepage — "The Problem" image' },
  { key: 'work_her_women', label: 'Homepage — Our Work: HER Women card' },
  { key: 'work_her_men', label: 'Homepage — Our Work: HER Men card' },
  { key: 'work_her_youth', label: 'Homepage — Our Work: HER Youth card' },
  { key: 'work_her_community', label: 'Homepage — Our Work: HER Community card' },
  { key: 'story_voices', label: 'Homepage — HER Stories: HER Voices card' },
  { key: 'story_conversations', label: 'Homepage — HER Stories: HER Conversations card' },
  { key: 'story_experts', label: 'Homepage — HER Stories: HER Experts card' },
  { key: 'home_community', label: 'Homepage — Community section (full-width)' },
  { key: 'home_final_cta', label: 'Homepage — Final call-to-action (full-width)' },
  { key: 'about_intro', label: 'About page — Intro banner image' },
];

function initSiteImages(isAdmin) {
  if (!isAdmin) return;
  const grid = document.getElementById('site-images-grid');
  if (!grid) return;

  async function load() {
    const res = await fetch('/api/admin/site-images');
    const rows = await res.json();
    const byKey = {};
    rows.forEach((r) => (byKey[r.key] = r.image_url));

    grid.innerHTML = SITE_IMAGE_SLOTS.map((slot) => {
      const url = byKey[slot.key];
      return `
      <div class="site-image-card" data-key="${slot.key}">
        <div class="site-image-thumb${url ? '' : ' is-empty'}" style="${url ? `background-image:url('${url}')` : ''}"></div>
        <div class="site-image-info">
          <h3>${escapeHtml(slot.label)}</h3>
          <p class="admin-panel-note">${url ? 'Custom image set.' : 'Using the abstract placeholder.'}</p>
          <div class="site-image-actions">
            <label class="btn btn-ghost site-image-upload-btn">${url ? 'Replace' : 'Upload'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden></label>
            <button type="button" class="admin-link-btn admin-link-btn-danger" data-action="remove"${url ? '' : ' hidden'}>Remove</button>
          </div>
          <p class="form-status"></p>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.site-image-card').forEach((card) => {
      const key = card.dataset.key;
      const status = card.querySelector('.form-status');
      const fileInput = card.querySelector('input[type="file"]');
      const removeBtn = card.querySelector('[data-action="remove"]');

      fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        status.textContent = 'Uploading…';
        status.className = 'form-status';

        const formData = new FormData();
        formData.append('image', file);

        try {
          const res = await fetch(`/api/admin/site-images/${key}`, { method: 'POST', body: formData });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Failed to upload image.');
          load();
        } catch (err) {
          status.textContent = err.message || 'Failed to upload image.';
          status.className = 'form-status error';
        }
      });

      if (removeBtn) {
        removeBtn.addEventListener('click', async () => {
          if (!confirm('Remove this image and go back to the abstract placeholder?')) return;
          try {
            const res = await fetch(`/api/admin/site-images/${key}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            load();
          } catch (err) {
            status.textContent = 'Failed to remove image.';
            status.className = 'form-status error';
          }
        });
      }
    });
  }

  window.__loadSiteImages = load;
  load();
}

/* ---------- Submissions (admin only) ---------- */
function initSubmissions(isAdmin) {
  if (!isAdmin) return;
  const listEl = document.getElementById('submissions-list');
  const pills = document.querySelectorAll('#submissions-type-pills .filter-pill');
  if (!listEl) return;

  let activeType = 'support';

  const JOIN_INTEREST_LABELS = {
    newsletter: 'Newsletter',
    support_groups: 'Support groups',
    events: 'Events',
    volunteering: 'Volunteering',
    financial_support: 'Financial support',
  };
  const SUPPORT_INTEREST_LABELS = {
    donating: 'Make a donation',
    sponsorship: 'Explore sponsorship options',
    programmes: 'Support a specific programme',
  };
  const PARTNER_INTEREST_LABELS = {
    partnership_opportunities: 'Partnership opportunities',
    healthcare_collaboration: 'Healthcare collaboration',
    corporate_partnerships: 'Corporate partnerships',
    research_collaborations: 'Research collaborations',
    sponsorship_information: 'Sponsorship information',
  };

  function interestList(item, labels) {
    return Object.keys(labels)
      .filter((k) => item[k])
      .map((k) => labels[k]);
  }

  function renderItem(type, item) {
    let title = '';
    let meta = '';
    let extra = '';

    if (type === 'support') {
      title = item.name;
      meta = item.email;
      const interests = interestList(item, SUPPORT_INTEREST_LABELS);
      extra = `${interests.length ? `<p class="admin-list-item-meta">Interested in: ${interests.join(', ')}</p>` : ''}${item.message ? `<p class="admin-suggestion-message">${escapeHtml(item.message)}</p>` : ''}`;
    } else if (type === 'partner') {
      title = `${item.organization}${item.contact_name ? ` — ${item.contact_name}` : ''}${item.role ? ` (${item.role})` : ''}`;
      meta = `${item.email}${item.phone ? ` · ${item.phone}` : ''}`;
      const interests = interestList(item, PARTNER_INTEREST_LABELS);
      extra = `${interests.length ? `<p class="admin-list-item-meta">Interested in: ${interests.join(', ')}</p>` : ''}${item.message ? `<p class="admin-suggestion-message">${escapeHtml(item.message)}</p>` : ''}`;
    } else if (type === 'volunteer') {
      title = item.name;
      meta = item.email;
      const interests = item.interests || [];
      extra = `${interests.length ? `<p class="admin-list-item-meta">Interested in: ${interests.join(', ')}</p>` : ''}${item.message ? `<p class="admin-suggestion-message">${escapeHtml(item.message)}</p>` : ''}`;
    } else if (type === 'join') {
      title = item.name;
      meta = item.email;
      const interests = interestList(item, JOIN_INTEREST_LABELS);
      extra = interests.length ? `<p class="admin-list-item-meta">Interested in: ${interests.join(', ')}</p>` : '';
    } else if (type === 'contact') {
      title = item.name;
      meta = `${item.email} · ${escapeHtml(item.category)}`;
      extra = `<p class="admin-suggestion-message">${escapeHtml(item.message)}</p>`;
    }

    return `
      <div class="admin-list-item" data-id="${item.id}">
        <div class="admin-list-item-head">
          <h3>${escapeHtml(title)}</h3>
        </div>
        <p class="admin-list-item-meta">${escapeHtml(meta)} · ${formatDateTime(item.created_at)}</p>
        ${extra}
        <div class="admin-list-item-actions">
          <button type="button" class="admin-link-btn admin-link-btn-danger" data-action="delete">Delete</button>
        </div>
      </div>`;
  }

  async function load() {
    listEl.innerHTML = '<p class="admin-panel-note">Loading…</p>';
    const res = await fetch(`/api/admin/submissions/${activeType}`);
    const items = await res.json();

    if (items.length === 0) {
      listEl.innerHTML = '<p class="admin-panel-note">No submissions here yet.</p>';
      return;
    }

    listEl.innerHTML = items.map((item) => renderItem(activeType, item)).join('');

    listEl.querySelectorAll('.admin-list-item').forEach((el) => {
      const id = el.dataset.id;
      el.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm('Delete this submission? This cannot be undone.')) return;
        await fetch(`/api/admin/submissions/${activeType}/${id}`, { method: 'DELETE' });
        load();
      });
    });
  }

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.toggle('is-active', p === pill));
      activeType = pill.dataset.submissionType;
      load();
    });
  });

  window.__loadSubmissions = load;
  load();
}

/* ---------- Manage Users (admin only) ---------- */
function initUsers() {
  const tbody = document.getElementById('user-list');
  const statsRow = document.getElementById('users-stats-row');
  const searchField = document.getElementById('users-search');
  const filterPills = document.querySelectorAll('.filter-pill');
  const emptyNote = document.getElementById('users-empty-note');

  let allUsers = [];
  let activeRoleFilter = 'all';

  function renderStats() {
    const admins = allUsers.filter((u) => u.role === 'admin').length;
    const members = allUsers.filter((u) => u.role === 'member').length;
    statsRow.innerHTML = `
      <div class="admin-summary-tile"><span class="value">${allUsers.length}</span><span class="label">Total users</span></div>
      <div class="admin-summary-tile"><span class="value">${admins}</span><span class="label">Admins</span></div>
      <div class="admin-summary-tile"><span class="value">${members}</span><span class="label">Members</span></div>
    `;
  }

  function renderTable() {
    const query = searchField.value.trim().toLowerCase();
    const filtered = allUsers.filter((u) => {
      const matchesRole = activeRoleFilter === 'all' || u.role === activeRoleFilter;
      const matchesQuery =
        !query || u.full_name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
      return matchesRole && matchesQuery;
    });

    emptyNote.hidden = filtered.length !== 0;
    tbody.innerHTML = filtered
      .map(
        (u) => `
        <tr data-id="${u.id}">
          <td>
            <div class="name-cell">
              <span class="row-avatar">${initials(u.full_name)}</span>
              <strong>${escapeHtml(u.full_name)}</strong>
            </div>
          </td>
          <td class="email-cell">${escapeHtml(u.email)}</td>
          <td><span class="admin-badge ${u.role === 'admin' ? 'is-good' : 'is-neutral'}">${u.role === 'admin' ? 'Admin' : 'Member'}</span></td>
          <td class="date-cell">${formatDate(u.created_at)}</td>
        </tr>`
      )
      .join('');

    tbody.querySelectorAll('tr').forEach((row) => {
      row.addEventListener('click', () => {
        const user = allUsers.find((u) => String(u.id) === row.dataset.id);
        if (user) openUserProfile(user);
      });
    });
  }

  async function loadUsers() {
    const res = await fetch('/api/admin/users');
    allUsers = await res.json();
    renderStats();
    renderTable();
  }

  searchField.addEventListener('input', renderTable);
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.toggle('is-active', p === pill));
      activeRoleFilter = pill.dataset.roleFilter;
      renderTable();
    });
  });

  window.__loadUsers = loadUsers;
  loadUsers();
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

/* ---------- Add User modal ---------- */
function initCreateUserModal() {
  const backdrop = document.getElementById('add-user-modal-backdrop');
  const modal = document.getElementById('add-user-modal');
  const openBtn = document.getElementById('add-user-btn');
  const closeBtn = document.getElementById('add-user-close-btn');
  const form = document.getElementById('user-form');
  const status = document.getElementById('user-status');
  const nameField = document.getElementById('user-name');
  const emailField = document.getElementById('user-email');
  const passwordField = document.getElementById('user-password');
  const roleField = document.getElementById('user-role');

  function open() {
    form.reset();
    status.textContent = '';
    status.className = 'form-status';
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add('is-visible');
      modal.classList.add('is-open');
    });
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    nameField.focus();
  }

  function close() {
    modal.classList.remove('is-open');
    backdrop.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!modal.classList.contains('is-open')) backdrop.hidden = true;
    }, 300);
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    const payload = {
      fullName: nameField.value,
      email: emailField.value,
      password: passwordField.value,
      role: roleField.value,
    };

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create account.');

      status.textContent = 'Created. Share the login details with them directly.';
      status.className = 'form-status success';
      window.__loadUsers && window.__loadUsers();
      loadSummary();
      setTimeout(close, 900);
    } catch (err) {
      status.textContent = err.message || 'Failed to create account.';
      status.className = 'form-status error';
    }
  });
}

/* ---------- User profile modal (view / edit / reset password / delete) ---------- */
function initUserProfileModal() {
  const backdrop = document.getElementById('user-modal-backdrop');
  const modal = document.getElementById('user-modal');
  const closeBtn = document.getElementById('profile-close-btn');
  const nameEl = document.getElementById('profile-name');
  const roleBadge = document.getElementById('profile-role-badge');
  const metaEl = document.getElementById('profile-meta');

  const detailsForm = document.getElementById('profile-details-form');
  const detailsNameField = document.getElementById('profile-name-input');
  const detailsEmailField = document.getElementById('profile-email-input');
  const detailsRoleField = document.getElementById('profile-role-input');
  const detailsStatus = document.getElementById('profile-details-status');

  const passwordForm = document.getElementById('profile-password-form');
  const passwordField = document.getElementById('profile-password-input');
  const passwordStatus = document.getElementById('profile-password-status');

  const deleteBtn = document.getElementById('profile-delete-btn');
  const deleteStatus = document.getElementById('profile-delete-status');

  function openProfile(user) {
    window.__activeProfileUser = user;
    nameEl.textContent = user.full_name;
    roleBadge.textContent = user.role === 'admin' ? 'Admin' : 'Member';
    roleBadge.className = `admin-badge ${user.role === 'admin' ? 'is-good' : 'is-neutral'}`;
    metaEl.textContent = `${user.email} · Added ${formatDate(user.created_at)}`;

    detailsNameField.value = user.full_name;
    detailsEmailField.value = user.email;
    detailsRoleField.value = user.role;
    detailsStatus.textContent = '';
    passwordField.value = '';
    passwordStatus.textContent = '';
    deleteStatus.textContent = '';

    backdrop.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add('is-visible');
      modal.classList.add('is-open');
    });
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeProfile() {
    modal.classList.remove('is-open');
    backdrop.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!modal.classList.contains('is-open')) backdrop.hidden = true;
    }, 300);
  }

  closeBtn.addEventListener('click', closeProfile);
  backdrop.addEventListener('click', closeProfile);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeProfile();
  });

  detailsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    detailsStatus.textContent = '';
    detailsStatus.className = 'form-status';
    const user = window.__activeProfileUser;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: detailsNameField.value,
          email: detailsEmailField.value,
          role: detailsRoleField.value,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save changes.');

      detailsStatus.textContent = 'Saved.';
      detailsStatus.className = 'form-status success';
      nameEl.textContent = detailsNameField.value;
      roleBadge.textContent = detailsRoleField.value === 'admin' ? 'Admin' : 'Member';
      roleBadge.className = `admin-badge ${detailsRoleField.value === 'admin' ? 'is-good' : 'is-neutral'}`;
      window.__loadUsers && window.__loadUsers();
      loadSummary();
    } catch (err) {
      detailsStatus.textContent = err.message || 'Failed to save changes.';
      detailsStatus.className = 'form-status error';
    }
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    passwordStatus.textContent = '';
    passwordStatus.className = 'form-status';
    const user = window.__activeProfileUser;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          password: passwordField.value,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to set new password.');

      passwordStatus.textContent = 'New password set. Share it with them directly.';
      passwordStatus.className = 'form-status success';
      passwordForm.reset();
    } catch (err) {
      passwordStatus.textContent = err.message || 'Failed to set new password.';
      passwordStatus.className = 'form-status error';
    }
  });

  deleteBtn.addEventListener('click', async () => {
    const user = window.__activeProfileUser;
    if (!confirm(`Permanently delete "${user.full_name}"'s account? They will no longer be able to log in.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Failed to delete this account.');

      closeProfile();
      window.__loadUsers && window.__loadUsers();
      loadSummary();
    } catch (err) {
      deleteStatus.textContent = err.message || 'Failed to delete this account.';
      deleteStatus.className = 'form-status error';
    }
  });

  window.__openUserProfile = openProfile;
}

function openUserProfile(user) {
  if (window.__openUserProfile) window.__openUserProfile(user);
}

/* ---------- Suggestion Box (everyone reads + posts; admin can delete) ---------- */
function initSuggestions() {
  const listEl = document.getElementById('suggestion-list');
  const form = document.getElementById('suggestion-form');
  const status = document.getElementById('suggestion-post-status');
  const messageField = document.getElementById('suggestion-message');

  async function loadSuggestions() {
    const meRes = await fetch('/api/me');
    const me = await meRes.json();
    const isAdmin = me.role === 'admin';

    const res = await fetch('/api/suggestions');
    const suggestions = await res.json();

    if (suggestions.length === 0) {
      listEl.innerHTML = '<p class="admin-panel-note">No messages yet — be the first to post.</p>';
      return;
    }

    listEl.innerHTML = suggestions
      .map(
        (s) => `
        <div class="admin-list-item" data-id="${s.id}">
          <div class="admin-list-item-head">
            <h3>${escapeHtml(s.member_name)}</h3>
          </div>
          <p class="admin-list-item-meta">${formatDateTime(s.created_at)}</p>
          <p class="admin-suggestion-message">${escapeHtml(s.message)}</p>
          ${isAdmin ? `<div class="admin-list-item-actions"><button type="button" class="admin-link-btn admin-link-btn-danger" data-action="delete">Delete</button></div>` : ''}
        </div>`
      )
      .join('');

    if (isAdmin) {
      listEl.querySelectorAll('.admin-list-item').forEach((item) => {
        const id = item.dataset.id;
        const deleteBtn = item.querySelector('[data-action="delete"]');
        if (!deleteBtn) return;
        deleteBtn.addEventListener('click', async () => {
          if (!confirm('Delete this suggestion?')) return;
          await fetch(`/api/admin/suggestions/${id}`, { method: 'DELETE' });
          loadSuggestions();
          if (window.location.pathname === '/admin') loadSummary();
        });
      });
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageField.value }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to post message.');

      status.textContent = 'Posted.';
      status.className = 'form-status success';
      form.reset();
      loadSuggestions();
    } catch (err) {
      status.textContent = err.message || 'Failed to post message.';
      status.className = 'form-status error';
    }
  });

  window.__loadSuggestions = loadSuggestions;
  loadSuggestions();
}

/* ---------- Helpers ---------- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
}

function toLocalDatetimeInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
