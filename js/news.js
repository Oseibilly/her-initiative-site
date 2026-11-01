(function () {
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function paragraphs(text) {
    return String(text || '')
      .split(/\n{2,}/)
      .map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function summaryOf(post) {
    if (post.excerpt) return post.excerpt;
    const plain = String(post.body || '').replace(/\s+/g, ' ').trim();
    return plain.length > 180 ? `${plain.slice(0, 177)}…` : plain;
  }

  function cardHtml(post) {
    const cover = post.cover_url
      ? `<a class="news-card-cover" href="/news/${post.id}"><img src="${esc(post.cover_url)}" alt="" loading="lazy"></a>`
      : '';
    const hasVideo = post.media.some((m) => m.type === 'video');
    return `
      <article class="news-item news-card${post.cover_url ? ' has-cover' : ''}">
        ${cover}
        <div class="news-card-text">
          <span class="date">${esc(fmtDate(post.published_at))}${hasVideo ? ' · Video' : ''}</span>
          <h3><a href="/news/${post.id}">${esc(post.title)}</a></h3>
          <p>${esc(summaryOf(post))}</p>
          <a class="news-read-more" href="/news/${post.id}">Read more</a>
        </div>
      </article>`;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }

  // Full list (News page) or latest few (Impact page)
  async function renderList(el) {
    const limit = Number(el.dataset.limit) || 50;
    try {
      const posts = await fetchJson(`/api/news?limit=${limit}`);
      if (posts.length === 0) {
        el.innerHTML = '<p class="news-empty">No news yet — check back soon.</p>';
        return;
      }
      el.innerHTML = posts.map(cardHtml).join('');
    } catch (err) {
      el.innerHTML = '<p class="news-empty">News could not be loaded right now. Please try again later.</p>';
    }
  }

  // Home page teaser list
  async function renderTeaser(el) {
    const limit = Number(el.dataset.limit) || 3;
    try {
      const posts = await fetchJson(`/api/news?limit=${limit}`);
      if (posts.length === 0) {
        const section = el.closest('.home-news');
        if (section) section.hidden = true;
        return;
      }
      el.innerHTML = posts
        .map(
          (p) => `<a class="item" href="/news/${p.id}"><span class="title">${esc(p.title)}</span><span class="date">${esc(fmtDate(p.published_at))}</span></a>`
        )
        .join('');
    } catch (err) {
      const section = el.closest('.home-news');
      if (section) section.hidden = true;
    }
  }

  // Single post (News page at /news/:id)
  async function renderPost(el, id) {
    const intro = document.getElementById('news-intro');
    try {
      const post = await fetchJson(`/api/news/${id}`);
      document.title = `${post.title} — HER Initiative`;
      if (intro) intro.hidden = true;

      const images = post.media.filter((m) => m.type === 'image');
      const videos = post.media.filter((m) => m.type === 'video');

      el.innerHTML = `
        <article class="news-detail">
          <a class="news-back" href="/news">&larr; All news</a>
          <span class="date">${esc(fmtDate(post.published_at))}</span>
          <h1>${esc(post.title)}</h1>
          <div class="news-detail-body">${paragraphs(post.body)}</div>
          ${
            videos.length
              ? `<div class="news-videos">${videos
                  .map((v) => `<video controls preload="metadata" playsinline src="${esc(v.url)}"></video>`)
                  .join('')}</div>`
              : ''
          }
          ${
            images.length
              ? `<div class="news-gallery">${images
                  .map(
                    (i) => `<a href="${esc(i.url)}" target="_blank" rel="noopener"><img src="${esc(i.url)}" alt="" loading="lazy"></a>`
                  )
                  .join('')}</div>`
              : ''
          }
        </article>`;
    } catch (err) {
      if (intro) intro.hidden = true;
      el.innerHTML =
        '<div class="news-detail"><a class="news-back" href="/news">&larr; All news</a><h1>Post not found</h1><p class="news-empty">This news post may have been removed or is not published.</p></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const postMatch = window.location.pathname.match(/^\/news\/(\d+)\/?$/);
    const detailEl = document.getElementById('news-detail-root');
    if (detailEl && postMatch) {
      const listEl = document.getElementById('news-list');
      if (listEl) listEl.hidden = true;
      renderPost(detailEl, postMatch[1]);
      return;
    }

    document.querySelectorAll('[data-news-list]').forEach(renderList);
    document.querySelectorAll('[data-news-teaser]').forEach(renderTeaser);
  });
})();
