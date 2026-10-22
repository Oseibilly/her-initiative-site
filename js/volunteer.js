document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('volunteer-application-form');
  if (!form) return;

  const status = document.getElementById('volunteer-status');
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
      consentConfirmed: data.get('consentConfirmed') === 'on',
      interests: {
        communityOutreach: data.get('communityOutreach') === 'on',
        research: data.get('research') === 'on',
        communications: data.get('communications') === 'on',
        graphicDesign: data.get('graphicDesign') === 'on',
        socialMedia: data.get('socialMedia') === 'on',
        events: data.get('events') === 'on',
        administration: data.get('administration') === 'on',
        fundraising: data.get('fundraising') === 'on',
        photographyVideography: data.get('photographyVideography') === 'on',
        healthEducation: data.get('healthEducation') === 'on',
        projectManagement: data.get('projectManagement') === 'on',
      },
    };

    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/volunteer-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Something went wrong.');

      status.textContent = "Thank you! We'll be in touch about next steps.";
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
