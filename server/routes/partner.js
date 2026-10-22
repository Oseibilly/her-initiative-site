const express = require('express');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { sendPartnerInquiryNotification } = require('../mailer');

const router = express.Router();

const partnerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many inquiries. Please try again later.' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/partner-inquiry', partnerLimiter, async (req, res) => {
  const { organization, contactName, role, email, phone, message, interests = {} } = req.body || {};

  if (typeof organization !== 'string' || organization.trim().length === 0) {
    return res.status(400).json({ error: 'Organisation name is required.' });
  }
  if (typeof contactName !== 'string' || contactName.trim().length === 0) {
    return res.status(400).json({ error: 'Contact name is required.' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  const partnershipOpportunities = Boolean(interests.partnershipOpportunities);
  const healthcareCollaboration = Boolean(interests.healthcareCollaboration);
  const corporatePartnerships = Boolean(interests.corporatePartnerships);
  const researchCollaborations = Boolean(interests.researchCollaborations);
  const sponsorshipInformation = Boolean(interests.sponsorshipInformation);
  const trimmedOrg = organization.trim();
  const trimmedContact = contactName.trim();
  const trimmedRole = typeof role === 'string' ? role.trim() : '';
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  try {
    const result = await pool.query(
      `INSERT INTO partner_inquiries
         (organization, contact_name, role, email, phone, message, partnership_opportunities,
          healthcare_collaboration, corporate_partnerships, research_collaborations, sponsorship_information)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        trimmedOrg,
        trimmedContact,
        trimmedRole || null,
        trimmedEmail,
        trimmedPhone || null,
        trimmedMessage,
        partnershipOpportunities,
        healthcareCollaboration,
        corporatePartnerships,
        researchCollaborations,
        sponsorshipInformation,
      ]
    );

    sendPartnerInquiryNotification({
      organization: trimmedOrg,
      contactName: trimmedContact,
      role: trimmedRole,
      email: trimmedEmail,
      phone: trimmedPhone,
      message: trimmedMessage,
      interests: {
        partnershipOpportunities,
        healthcareCollaboration,
        corporatePartnerships,
        researchCollaborations,
        sponsorshipInformation,
      },
    }).catch((err) => console.error('Failed to send partner inquiry notification email:', err));

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Partner inquiry failed:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
