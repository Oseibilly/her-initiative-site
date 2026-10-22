document.addEventListener('DOMContentLoaded', () => {
  const searchTrigger = document.getElementById('resources-search-trigger');
  const searchBtn = document.getElementById('search-btn');
  if (searchTrigger && searchBtn) {
    searchTrigger.addEventListener('click', () => searchBtn.click());
  }

  const filters = document.querySelectorAll('#resource-filters .filter-pill');
  const cards = document.querySelectorAll('#resource-card-grid .info-card');
  const emptyNote = document.getElementById('resource-filter-empty');
  filters.forEach((pill) => {
    pill.addEventListener('click', () => {
      filters.forEach((p) => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      const audience = pill.getAttribute('data-audience');
      let visibleCount = 0;
      cards.forEach((card) => {
        const match = audience === 'all' || card.getAttribute('data-audience') === audience || card.getAttribute('data-audience') === 'all';
        card.hidden = !match;
        if (match) visibleCount += 1;
      });
      if (emptyNote) emptyNote.hidden = visibleCount > 0;
    });
  });
});

document.addEventListener('DOMContentLoaded', async () => {
  const listEl = document.getElementById('resources-event-list');
  if (!listEl) return;

  try {
    const res = await fetch('/api/events');
    if (!res.ok) return;
    const events = await res.json();

    if (events.length === 0) return;

    listEl.innerHTML = events
      .map(
        (ev) => `
        <div class="event-item">
          <h3>${escapeHtml(ev.title)}</h3>
          <p class="meta">${formatDateTime(ev.event_date)}${ev.location ? ` · ${escapeHtml(ev.location)}` : ''}</p>
          ${ev.description ? `<p>${escapeHtml(ev.description)}</p>` : ''}
        </div>`
      )
      .join('');
  } catch (err) {
    // Leave the "check back soon" placeholder in place if the API is unreachable.
  }
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
}
