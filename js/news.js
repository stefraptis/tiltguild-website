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
          <a href="${release.url}" class="featured-inner" target="_blank">
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

    container.innerHTML = items.map((item, i) => `
      <article class="news-card" style="animation-delay:${i * 0.07}s">
        <div class="news-card-inner">
          <span class="news-tag">${item.tag || 'News'}</span>
          <h3 class="news-headline">${item.headline}</h3>
          <p class="news-summary">${item.summary}</p>
          ${item.url ? `<a href="${item.url}" target="_blank" class="news-link">Read more →</a>` : ''}
          ${item.date ? `<time class="news-date">${item.date}</time>` : ''}
        </div>
      </article>
    `).join('');

  } catch (e) {
    if (loading) loading.remove();
    container.innerHTML = `
      <p class="news-empty">News unavailable right now — check back soon.</p>
    `;
  }
}

document.addEventListener('DOMContentLoaded', loadNews);
