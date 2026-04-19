// ── Nav burger menu ──
const burger = document.getElementById('navBurger');
const mobile = document.getElementById('navMobile');
if (burger && mobile) {
  burger.addEventListener('click', () => {
    const isOpen = burger.classList.toggle('open');
    mobile.classList.toggle('open');
    document.body.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', isOpen);
    mobile.setAttribute('aria-hidden', !isOpen);
  });
  mobile.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      burger.classList.remove('open');
      mobile.classList.remove('open');
      document.body.classList.remove('nav-open');
    });
  });
}

// ── Auto footer year ──
document.querySelectorAll('.footer-year').forEach(el => {
  el.textContent = new Date().getFullYear();
});

// ================================================================
// COOKIE CONSENT
// ================================================================
(function () {
  const COOKIE_KEY = 'tg_cookie_consent';

  function setCookieConsent(value) {
    localStorage.setItem(COOKIE_KEY, value);
  }

  function getCookieConsent() {
    return localStorage.getItem(COOKIE_KEY);
  }

  function buildBanner() {
    const banner = document.createElement('div');
    banner.id = 'cookieBanner';
    banner.innerHTML = `
      <div class="cookie-icon">🍪</div>
      <div class="cookie-text">
        <strong>We use cookies</strong>
        <p>We use cookies to improve your browsing experience on our site.</p>
      </div>
      <div class="cookie-actions">
        <button class="cookie-btn cookie-accept" id="cookieAccept">Accept</button>
        <button class="cookie-btn cookie-decline" id="cookieDecline">Decline</button>
      </div>
    `;
    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => banner.classList.add('visible'));
    });

    document.getElementById('cookieAccept').addEventListener('click', () => {
      setCookieConsent('accepted');
      hideBanner(banner);
    });

    document.getElementById('cookieDecline').addEventListener('click', () => {
      setCookieConsent('declined');
      hideBanner(banner);
    });
  }

  function hideBanner(banner) {
    banner.classList.remove('visible');
    banner.classList.add('hiding');
    setTimeout(() => banner.remove(), 400);
  }

  if (!getCookieConsent()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildBanner);
    } else {
      setTimeout(buildBanner, 800);
    }
  }
})();

// ================================================================
// NEWSLETTER POPUP
// ================================================================
(function () {
  const NEWSLETTER_KEY  = 'tg_newsletter_dismissed';
  const RESHOW_DAYS     = 7;
  // !! Replace YOUR_FORM_ID with your Formspree form ID !!
  const FORMSPREE_ID    = 'xrerkonr';

  function shouldShow() {
    const stored = localStorage.getItem(NEWSLETTER_KEY);
    if (!stored) return true;
    const dismissedAt = parseInt(stored, 10);
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return daysSince >= RESHOW_DAYS;
  }

  function dismiss() {
    localStorage.setItem(NEWSLETTER_KEY, Date.now().toString());
  }

  function buildPopup() {
    const overlay = document.createElement('div');
    overlay.id = 'newsletterOverlay';
    overlay.innerHTML = `
      <div class="newsletter-modal" id="newsletterModal">
        <button class="newsletter-close" id="newsletterClose" aria-label="Close">✕</button>
        <img class="newsletter-logo" src="/images/logos/tilt_guild_logo_for_website.png" alt="Tilt Guild">
        <h2 class="newsletter-title">Stay Tilted. Stay Locked In.</h2>
        <p class="newsletter-sub">Get notified about new releases, shows and band news.</p>
        <form class="newsletter-form" id="newsletterForm" action="https://formspree.io/f/${FORMSPREE_ID}" method="POST">
          <div class="newsletter-input-row">
            <input type="email" name="email" placeholder="Your email address" required class="newsletter-input">
            <button type="submit" class="newsletter-submit">Subscribe</button>
          </div>
          <p class="newsletter-privacy">No spam. Unsubscribe anytime.</p>
        </form>
        <div class="newsletter-success" id="newsletterSuccess" style="display:none">
          <span>✓</span> You're in! Thanks for subscribing.
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add('visible'));
    });

    function closePopup() {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 400);
      dismiss();
    }

    document.getElementById('newsletterClose').addEventListener('click', closePopup);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePopup();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePopup();
    });

    document.getElementById('newsletterForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          form.style.display = 'none';
          document.getElementById('newsletterSuccess').style.display = 'flex';
          dismiss();
          setTimeout(closePopup, 2500);
        }
      } catch (err) {
        console.error('Newsletter error:', err);
      }
    });
  }

  if (shouldShow()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(buildPopup, 5000));
    } else {
      setTimeout(buildPopup, 5000);
    }
  }
})();
