document.addEventListener('DOMContentLoaded', () => {
  const intentSelector = document.getElementById('intent-selector');
  if (intentSelector) {
    intentSelector.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const href = pill.getAttribute('data-href');
        if (href) {
          window.location.href = href;
          return;
        }
        intentSelector.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');
        const checkName = pill.getAttribute('data-check');
        if (checkName) {
          const checkbox = document.querySelector(`#join-form input[name="${checkName}"]`);
          if (checkbox) checkbox.checked = true;
        }
        const formSection = document.getElementById('join-form-section');
        if (formSection) formSection.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('join-form');
  if (!form) return;

  const status = document.getElementById('join-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    const data = new FormData(form);
    const payload = {
      name: data.get('name'),
      email: data.get('email'),
      interests: {
        newsletter: data.get('newsletter') === 'on',
        supportGroups: data.get('supportGroups') === 'on',
        events: data.get('events') === 'on',
        volunteering: data.get('volunteering') === 'on',
        partnership: data.get('partnership') === 'on',
        financialSupport: data.get('financialSupport') === 'on',
      },
    };

    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/community-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Something went wrong.');

      status.textContent = "You're in! We'll be in touch soon.";
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
