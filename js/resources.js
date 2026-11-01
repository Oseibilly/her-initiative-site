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

// Show a "Read N articles" link on each section card that has published articles.
document.addEventListener('DOMContentLoaded', async () => {
  const sectionCards = document.querySelectorAll('#resource-card-grid .info-card[data-section]');
  if (sectionCards.length === 0) return;

  try {
    const res = await fetch('/api/resources/sections');
    if (!res.ok) return;
    const sections = await res.json();
    sectionCards.forEach((card) => {
      const section = sections.find((s) => s.slug === card.getAttribute('data-section'));
      if (!section || section.count === 0) return;
      const link = document.createElement('a');
      link.className = 'home-link';
      link.href = `/resources/${section.slug}`;
      link.textContent = section.count === 1 ? 'Read 1 article' : `Read ${section.count} articles`;
      card.appendChild(link);
    });
  } catch (err) {
    // Cards stay as plain text if the API is unreachable.
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
