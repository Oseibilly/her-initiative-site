document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const status = document.getElementById('login-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    const data = new FormData(form);
    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          password: data.get('password'),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Login failed.');

      window.location.href = '/admin';
    } catch (err) {
      status.textContent = err.message || 'Login failed. Please try again.';
      status.className = 'form-status error';
      submitBtn.disabled = false;
    }
  });
});
