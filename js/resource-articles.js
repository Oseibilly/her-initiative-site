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

  // Article text: blank line = new paragraph; "## " = heading; lines starting "- " = bullet list.
  function renderBlock(block) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return '';
    if (/^##\s+/.test(lines[0])) {
      const heading = `<h2>${esc(lines[0].replace(/^##\s+/, ''))}</h2>`;
      return heading + renderBlock(lines.slice(1).join('\n'));
    }
    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      return `<ul>${lines.map((l) => `<li>${esc(l.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    return `<p>${lines.map(esc).join('<br>')}</p>`;
  }

  function renderBody(text) {
    return String(text || '')
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map((b) => renderBlock(b.trim()))
      .join('');
  }

  function summaryOf(a) {
    if (a.excerpt) return a.excerpt;
    const plain = String(a.preview || '')
      .replace(/^##\s+/gm, '')
      .replace(/^[-*]\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.length > 180 ? `${plain.slice(0, 177)}…` : plain;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }

  function cardHtml(a, slug) {
    const href = `/resources/${slug}/${a.id}`;
    const cover = a.cover_url
      ? `<a class="news-card-cover" href="${href}"><img src="${esc(a.cover_url)}" alt="" loading="lazy"></a>`
      : '';
    const hasVideo = a.media.some((m) => m.type === 'video');
    return `
      <article class="news-item news-card${a.cover_url ? ' has-cover' : ''}">
        ${cover}
        <div class="news-card-text">
          <span class="date">${esc(fmtDate(a.published_at))}${a.author ? ` · ${esc(a.author)}` : ''}${hasVideo ? ' · Video' : ''}</span>
          <h3><a href="${href}">${esc(a.title)}</a></h3>
          <p>${esc(summaryOf(a))}</p>
          <a class="news-read-more" href="${href}">Read article</a>
        </div>
      </article>`;
  }

  function showMessage(root, text) {
    root.innerHTML = `<p class="news-empty">${esc(text)}</p>`;
  }

  async function renderList(section) {
    const listEl = document.getElementById('ra-list');
    document.title = `${section.title} — Resources — HER Initiative`;
    document.getElementById('ra-title').textContent = section.title;
    document.getElementById('ra-description').textContent = section.description;
    try {
      const articles = await fetchJson(`/api/resources/articles?section=${encodeURIComponent(section.slug)}`);
      if (articles.length === 0) {
        showMessage(listEl, 'No articles in this section yet — check back soon.');
        return;
      }
      listEl.innerHTML = articles.map((a) => cardHtml(a, section.slug)).join('');
    } catch (err) {
      showMessage(listEl, 'Articles could not be loaded right now. Please try again later.');
    }
  }

  async function renderArticle(slug, id, sections) {
    const intro = document.getElementById('ra-intro');
    const listEl = document.getElementById('ra-list');
    const detailEl = document.getElementById('ra-detail');
    listEl.style.display = 'none';
    intro.style.display = 'none';

    try {
      const a = await fetchJson(`/api/resources/articles/${id}`);
      const section = sections.find((s) => s.slug === a.section) || { slug: a.section, title: a.section_title };
      document.title = `${a.title} — HER Initiative`;

      const images = a.media.filter((m) => m.type === 'image');
      const videos = a.media.filter((m) => m.type === 'video');
      detailEl.innerHTML = `
        <article class="news-detail ra-article">
          <a class="ra-back" href="/resources/${esc(section.slug)}">&larr; ${esc(section.title)}</a>
          <div class="ra-meta">
            <a class="ra-badge" href="/resources/${esc(section.slug)}">${esc(section.title)}</a>
            <span>${esc(fmtDate(a.published_at))}</span>
            ${a.author ? `<span>By ${esc(a.author)}</span>` : ''}
          </div>
          <h1>${esc(a.title)}</h1>
          <div class="news-detail-body">${renderBody(a.body)}</div>
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
      detailEl.innerHTML =
        '<div class="news-detail"><a class="ra-back" href="/resources">&larr; All resources</a><h1>Article not found</h1><p class="news-empty">This article may have been removed or is not published.</p></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const match = window.location.pathname.match(/^\/resources\/([a-z0-9-]+)(?:\/(\d+))?\/?$/);
    if (!match) return;
    const slug = match[1];
    const id = match[2];

    let sections = [];
    try {
      sections = await fetchJson('/api/resources/sections');
    } catch (err) {
      /* fall through; handled below */
    }

    if (id) {
      renderArticle(slug, id, sections);
      return;
    }

    const section = sections.find((s) => s.slug === slug);
    if (!section) {
      document.getElementById('ra-title').textContent = 'Section not found';
      showMessage(document.getElementById('ra-list'), 'We could not find that section.');
      return;
    }
    renderList(section);
  });
})();
