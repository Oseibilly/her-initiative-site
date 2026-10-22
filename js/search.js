document.addEventListener('DOMContentLoaded', () => {
  const searchBtn = document.getElementById('search-btn');
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('site-search-input');
  const results = document.getElementById('site-search-results');
  if (!searchBtn || !overlay || !input || !results) return;

  const PAGES = [
    { title: 'Home', url: '/', keywords: 'home hormonal health her initiative' },
    { title: 'About HER', url: '/about', keywords: 'our story vision mission values approach founder trust credibility timeline' },
    { title: 'Our Work', url: '/programmes', keywords: 'her women her men her youth her community programmes' },
    { title: 'HER Stories', url: '/her-stories', keywords: 'stories voices conversations experts' },
    { title: 'The People Behind HER', url: '/leadership', keywords: 'team leadership founder hannah advisory board' },
    { title: 'Our Impact', url: '/impact', keywords: 'impact reach programs outcomes learning next chapter' },
    { title: 'Resources', url: '/resources', keywords: 'articles guides events faqs knowledge hub' },
    { title: 'Get Involved', url: '/get-involved', keywords: 'join volunteer partner support' },
    { title: 'Join HER', url: '/join', keywords: 'join community sign up newsletter' },
    { title: 'Volunteer', url: '/volunteer', keywords: 'volunteer opportunities apply' },
    { title: 'Partner With HER', url: '/partner', keywords: 'partner organisation collaboration' },
    { title: 'Support Our Mission', url: '/support', keywords: 'support donate sponsorship' },
    { title: 'Contact', url: '/contact', keywords: 'contact email phone message' },
    { title: 'Privacy Policy', url: '/privacy-policy', keywords: 'privacy data' },
    { title: 'Terms of Use', url: '/terms-of-use', keywords: 'terms use legal' },
    { title: 'Health Information Disclaimer', url: '/health-disclaimer', keywords: 'health disclaimer medical' },
  ];

  function openSearch() {
    overlay.classList.add('is-open');
    input.value = '';
    render(PAGES.slice(0, 6));
    setTimeout(() => input.focus(), 50);
  }

  function closeSearch() {
    overlay.classList.remove('is-open');
  }

  function render(list) {
    if (list.length === 0) {
      results.innerHTML = '<p class="search-empty">No pages found.</p>';
      return;
    }
    results.innerHTML = list
      .map(
        (p, i) => `<a href="${p.url}" class="${i === 0 ? 'is-active' : ''}">
          <div class="result-title">${p.title}</div>
          <div class="result-hint">${p.url}</div>
        </a>`
      )
      .join('');
  }

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      render(PAGES.slice(0, 6));
      return;
    }
    const matches = PAGES.filter(
      (p) => p.title.toLowerCase().includes(q) || p.keywords.includes(q)
    );
    render(matches.slice(0, 8));
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const top = results.querySelector('a');
      if (top) window.location.href = top.getAttribute('href');
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  });

  searchBtn.addEventListener('click', openSearch);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSearch();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeSearch();
  });
});
