document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-message-form');
  if (!form) return;

  const status = document.getElementById('contact-message-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    const data = new FormData(form);
    const payload = {
      name: data.get('name'),
      email: data.get('email'),
      category: data.get('category'),
      message: data.get('message'),
    };

    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/contact-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Something went wrong.');

      status.textContent = "Message sent — we'll get back to you soon.";
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
