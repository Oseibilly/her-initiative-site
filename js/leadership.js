document.addEventListener('DOMContentLoaded', async () => {
  const section = document.getElementById('leadership');
  const grid = document.getElementById('leadership-grid');
  if (!section || !grid) return;

  try {
    const res = await fetch('/api/executives');
    if (!res.ok) throw new Error('failed');
    const execs = await res.json();

    if (execs.length === 0) {
      section.style.display = 'none';
      return;
    }

    grid.innerHTML = execs
      .map((x) => {
        const avatar = x.photo_url
          ? `<div class="leadership-avatar" style="background-image:url('${x.photo_url}')"></div>`
          : `<div class="leadership-avatar leadership-avatar-initial"><span>${initials(x.name)}</span></div>`;
        return `
        <div class="leadership-card">
          ${avatar}
          <h3>${escapeHtml(x.name)}</h3>
          <p class="role">${escapeHtml(x.position)}</p>
        </div>`;
      })
      .join('');
  } catch (err) {
    section.style.display = 'none';
  }
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
