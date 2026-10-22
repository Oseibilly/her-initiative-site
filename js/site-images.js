document.addEventListener('DOMContentLoaded', async () => {
  const targets = document.querySelectorAll('[data-image-key]');
  if (targets.length === 0) return;

  try {
    const res = await fetch('/api/site-images');
    if (!res.ok) return;
    const images = await res.json();
    if (images.length === 0) return;

    const byKey = {};
    images.forEach((img) => (byKey[img.key] = img.image_url));

    targets.forEach((el) => {
      const url = byKey[el.dataset.imageKey];
      if (!url) return;
      el.style.backgroundImage = `url('${url}')`;
      el.classList.add('has-image');
    });
  } catch (err) {
    // Leave the abstract placeholder pattern in place if the API is unreachable.
  }
});
