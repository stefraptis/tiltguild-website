// ── Tilt Guild News & Events Loader ──
// Reads from /data/news.json which is auto-updated daily by GitHub Actions

// ── Countdown Timer ──
function startCountdown(targetDate, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  function update() {
    const now  = new Date().getTime();
    const diff = new Date(targetDate).getTime() - now;

    if (diff <= 0) {
      container.innerHTML = '<span class="countdown-out">Out Now!</span>';
      return;
    }

    const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    container.innerHTML = `
      <div class="countdown-unit"><span class="countdown-num">${String(days).padStart(2,'0')}</span><span class="countdown-label">Days</span></div>
      <div class="countdown-sep">:</div>
      <div class="countdown-unit"><span class="countdown-num">${String(hours).padStart(2,'0')}</span><span class="countdown-label">Hours</span></div>
      <div class="countdown-sep">:</div>
      <div class="countdown-unit"><span class="countdown-num">${String(minutes).padStart(2,'0')}</span><span class="countdown-label">Min</span></div>
      <div class="countdown-sep">:</div>
      <div class="countdown-unit"><span class="countdown-num">${String(seconds).padStart(2,'0')}</span><span class="countdown-label">Sec</span></div>
    `;
  }

  update();
  setInterval(update, 1000);
}

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

    // ── Countdown: find first upcoming release ──
    const items = data.news || [];
    const now = new Date().getTime();
    const upcoming = items.find(item =>
      item.type === 'release' && new Date(item.date).getTime() > now
    );

    const countdownSection = document.getElementById('countdownSection');
    if (upcoming && countdownSection) {
      const title   = upcoming.title || upcoming.headline || '';
      const artwork = upcoming.artwork || '';
      const link    = upcoming.source || upcoming.url || '';
      countdownSection.innerHTML = `
        <div class="countdown-card">
          ${artwork ? `<img class="countdown-artwork" src="${artwork}" alt="${title}">` : ''}
          <div class="countdown-body">
            <span class="countdown-badge">Upcoming Release</span>
            <h3 class="countdown-title">${title}</h3>
            <div class="countdown-timer" id="countdownTimer"></div>
            ${link ? `<a href="${link}" class="countdown-link">More info →</a>` : ''}
          </div>
        </div>
      `;
      countdownSection.style.display = 'block';
      startCountdown(upcoming.date, 'countdownTimer');
    }

    // ── News items ──
    if (items.length === 0) {
      container.innerHTML = '<p class="news-empty">No recent news found.</p>';
      return;
    }

    container.innerHTML = items.map((item, i) => {
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
