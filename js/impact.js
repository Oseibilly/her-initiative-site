document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('impact-grid');
  if (!grid) return;

  try {
    const res = await fetch('/api/metrics');
    if (!res.ok) return;
    const metrics = await res.json();

    metrics.forEach((m) => {
      const el = grid.querySelector(`[data-metric="${m.key}"]`);
      if (el && Number(m.value) > 0) {
        el.textContent = Number(m.value).toLocaleString();
      }
    });
  } catch (err) {
    // Leave the "—" placeholders in place if the API is unreachable.
  }
});
