// The sections shown on the public Resources page. Articles posted from the
// admin are filed under one of these. To add or rename a section, edit this
// list and the matching card in pages/resources.html (data-section="<slug>").
const SECTIONS = [
  {
    slug: 'hormonal-health',
    title: 'Hormonal Health',
    audience: 'all',
    description: 'Foundational articles on how hormones affect development, mood, and everyday well-being.',
  },
  {
    slug: 'her-women',
    title: 'HER Women',
    audience: 'women',
    description: 'Menstrual health, reproductive health, PCOS awareness, and hormonal well-being.',
  },
  {
    slug: 'her-men',
    title: 'HER Men',
    audience: 'men',
    description: 'Male hormonal health, changes across life stages, and open conversation.',
  },
  {
    slug: 'her-youth',
    title: 'HER Youth',
    audience: 'youth',
    description: 'Puberty, body awareness, and age-appropriate hormonal-health education.',
  },
  {
    slug: 'community-health',
    title: 'Community Health',
    audience: 'community',
    description: 'Outreach guides and toolkits for schools, workplaces, and community organisations.',
  },
  {
    slug: 'expert-conversations',
    title: 'Expert Conversations',
    audience: 'all',
    description: 'Discussions with qualified professionals who can help deepen our understanding.',
  },
  {
    slug: 'myths-and-facts',
    title: 'Myths & Facts',
    audience: 'all',
    description: 'Clear, evidence-informed answers to common hormonal-health misconceptions.',
  },
];

const SECTION_SLUGS = SECTIONS.map((s) => s.slug);

function getSection(slug) {
  return SECTIONS.find((s) => s.slug === slug) || null;
}

module.exports = { SECTIONS, SECTION_SLUGS, getSection };
