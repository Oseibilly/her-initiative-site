document.addEventListener('DOMContentLoaded', () => {
  loadFounderPhoto();
});

async function loadFounderPhoto() {
  const photoEl = document.getElementById('home-founder-photo');
  if (!photoEl) return;

  try {
    const res = await fetch('/api/executives');
    if (!res.ok) throw new Error('failed');
    const execs = await res.json();
    if (execs.length === 0) return;

    const founder = execs.find((x) => /founder/i.test(x.position)) || execs[0];
    if (founder.photo_url) {
      photoEl.style.backgroundImage = `url('${founder.photo_url}')`;
      photoEl.innerHTML = '';
    }
  } catch (err) {
    // Leave the initials placeholder in place if the API is unreachable.
  }
}
