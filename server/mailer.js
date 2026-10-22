require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

const SIGNUP_INTEREST_LABELS = {
  newsletter: 'Newsletter',
  supportGroups: 'Support groups',
  events: 'Events',
  volunteering: 'Volunteering',
  financialSupport: 'Financial support',
};

const PARTNER_INTEREST_LABELS = {
  partnershipOpportunities: 'Partnership opportunities',
  healthcareCollaboration: 'Healthcare collaboration',
  corporatePartnerships: 'Corporate partnerships',
  researchCollaborations: 'Research collaborations',
  sponsorshipInformation: 'Sponsorship information',
};

const SUPPORT_INTEREST_LABELS = {
  donating: 'Make a donation',
  sponsorship: 'Explore sponsorship options',
  programmes: 'Support a specific programme',
};

function formatInterests(interests, labels) {
  return (
    Object.entries(interests)
      .filter(([, checked]) => checked)
      .map(([key]) => labels[key] || key)
      .join(', ') || 'None selected'
  );
}

async function sendSignupNotification({ name, email, interests }) {
  const interestList = formatInterests(interests, SIGNUP_INTEREST_LABELS);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.NOTIFY_EMAIL,
    subject: 'New HER Community sign-up',
    text: `Name: ${name}\nEmail: ${email}\nInterested in: ${interestList}`,
  });
}

async function sendPartnerInquiryNotification({ organization, contactName, role, email, phone, message, interests }) {
  const interestList = formatInterests(interests, PARTNER_INTEREST_LABELS);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.NOTIFY_EMAIL,
    subject: 'New partner inquiry',
    text: `Organisation: ${organization}\nContact: ${contactName}${role ? ` (${role})` : ''}\nEmail: ${email}\nPhone: ${phone || '(none)'}\nInterested in: ${interestList}\nMessage: ${message || '(none)'}`,
  });
}

async function sendSupportInterestNotification({ name, email, message, interests }) {
  const interestList = formatInterests(interests, SUPPORT_INTEREST_LABELS);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.NOTIFY_EMAIL,
    subject: 'New support-our-mission interest',
    text: `Name: ${name}\nEmail: ${email}\nInterested in: ${interestList}\nNote: ${message || '(none)'}`,
  });
}

async function sendEventNotification({ title, description, eventDate, location, recipients }) {
  if (!recipients || recipients.length === 0) return;

  const when = new Date(eventDate).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.SMTP_FROM,
    bcc: recipients,
    subject: `New event: ${title}`,
    text: `${title}\n\nWhen: ${when}\n${location ? `Where: ${location}\n` : ''}${description ? `\n${description}\n` : ''}`,
  });
}

async function sendVolunteerApplicationNotification({ name, email, interests, message }) {
  const interestList = interests && interests.length > 0 ? interests.join(', ') : 'None selected';

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.NOTIFY_EMAIL,
    subject: 'New volunteer application',
    text: `Name: ${name}\nEmail: ${email}\nInterested in: ${interestList}\nMessage: ${message || '(none)'}`,
  });
}

const CONTACT_CATEGORY_LABELS = {
  general: 'General enquiries',
  partnerships: 'Partnerships',
  programs: 'Programs',
  media: 'Media',
};

async function sendContactMessageNotification({ name, email, category, message }) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.NOTIFY_EMAIL,
    subject: `New contact message — ${CONTACT_CATEGORY_LABELS[category] || category}`,
    text: `Name: ${name}\nEmail: ${email}\nCategory: ${CONTACT_CATEGORY_LABELS[category] || category}\nMessage: ${message}`,
  });
}

module.exports = {
  sendSignupNotification,
  sendPartnerInquiryNotification,
  sendSupportInterestNotification,
  sendEventNotification,
  sendVolunteerApplicationNotification,
  sendContactMessageNotification,
};
