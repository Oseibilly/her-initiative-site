document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('support-form');
  if (!form) return;

  const status = document.getElementById('support-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    const data = new FormData(form);
    const payload = {
      name: data.get('name'),
      email: data.get('email'),
      message: data.get('message'),
      interests: {
        donating: data.get('donating') === 'on',
        sponsorship: data.get('sponsorship') === 'on',
        programmes: data.get('programmes') === 'on',
      },
    };

    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/support-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Something went wrong.');

      status.textContent = "Thank you! We'll be in touch soon.";
      status.className = 'form-status success';
      form.reset();
    } catch (err) {
      status.textContent = err.message || 'Something went wrong. Please try again.';
      status.className = 'form-status error';
    } finally {
      submitBtn.disabled = false;
    }
  });
});
