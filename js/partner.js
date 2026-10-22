document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('partner-form');
  if (!form) return;

  const status = document.getElementById('partner-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    const data = new FormData(form);
    const payload = {
      organization: data.get('organization'),
      contactName: data.get('contactName'),
      role: data.get('role'),
      email: data.get('email'),
      phone: data.get('phone'),
      message: data.get('message'),
      interests: {
        partnershipOpportunities: data.get('partnershipOpportunities') === 'on',
        healthcareCollaboration: data.get('healthcareCollaboration') === 'on',
        corporatePartnerships: data.get('corporatePartnerships') === 'on',
        researchCollaborations: data.get('researchCollaborations') === 'on',
        sponsorshipInformation: data.get('sponsorshipInformation') === 'on',
      },
    };

    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/partner-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Something went wrong.');

      status.textContent = "Thanks! We'll be in touch soon.";
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
