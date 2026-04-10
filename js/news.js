// ── Tilt Guild News & Events Loader ──
// Reads from /data/news.json which is auto-updated daily by GitHub Actions

async function loadNews() {
  const container = document.getElementById('newsContainer');
  const loading   = document.getElementById('newsLoading');
  if (!container) return;

  try {
    const res  = await fetch('/data/news.json?t=' + Date.now());
    if (!res.ok) throw new Error('No news data yet');
    const data = await res.json();

    if (loading) loading.remove();

    // ── Featured release banner ──
    const release = data.featured_release;
    if (release) {
      const featuredEl = document.getElementById('featuredRelease');
      if (featuredEl) {
        featuredEl.innerHTML = `
          <a href="${release.url}" class="featured-inner">
            <div class="featured-bg" style="background-image:url('${release.artwork}')"></div>
            <div class="featured-content">
              <span class="featured-badge">${release.badge || 'Latest Release'}</span>
              <h2 class="featured-title">${release.title}</h2>
              <p class="featured-meta">${release.meta || ''}</p>
              <span class="featured-cta">Listen Now →</span>
            </div>
            <img class="featured-artwork" src="${release.artwork}" alt="${release.title}">
          </a>
        `;
        featuredEl.classList.add('loaded');
      }
    }

    // ── News items ──
    const items = data.news || [];
    if (items.length === 0) {
      container.innerHTML = '<p class="news-empty">No recent news found.</p>';
      return;
    }

    container.innerHTML = items.map((item, i) => {
      // Support both field naming conventions
      const tag      = item.tag      || item.type        || 'News';
      const headline = item.headline || item.title       || '';
      const summary  = item.summary  || item.description || '';
      const url      = item.url      || item.source      || '';
      const rawDate  = item.date     || '';

      let displayDate = '';
      if (rawDate) {
        try {
          displayDate = new Date(rawDate).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
          });
        } catch(e) { displayDate = rawDate; }
      }

      const tagLabel = tag.charAt(0).toUpperCase() + tag.slice(1);

      return `
        <article class="news-card" style="animation-delay:${i * 0.07}s">
          <div class="news-card-inner">
            <span class="news-tag">${tagLabel}</span>
            <h3 class="news-headline">${headline}</h3>
            <p class="news-summary">${summary}</p>
            ${url       ? `<a href="${url}" target="_blank" class="news-link">Read more →</a>` : ''}
            ${displayDate ? `<time class="news-date">${displayDate}</time>` : ''}
          </div>
        </article>
      `;
    }).join('');

  } catch (e) {
    if (loading) loading.remove();
    container.innerHTML = '<p class="news-empty">News unavailable right now — check back soon.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadNews);
