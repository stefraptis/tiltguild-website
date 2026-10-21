// Tilt Guild site script: menu, forms, video, home page slideshow, ticker,
// photo strip and viewer, and the news list.
// The home page reads /data/news.json. Edit that file to change the
// featured release, add a countdown for an upcoming release, or post news.

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var icon = function (id) {
    return '<svg class="icon" aria-hidden="true"><use href="/images/icons.svg#' + id + '"/></svg>';
  };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var isExternal = function (url) { return /^https?:\/\//.test(url); };
  var linkAttrs = function (url) { return isExternal(url) ? ' target="_blank" rel="noopener"' : ''; };

  // ---------- footer year ----------
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // ---------- mobile menu ----------
  var menuBtn = $('.menu-btn');
  var menu = $('#menu');
  if (menuBtn && menu) {
    var label = $('span', menuBtn);
    var use = $('use', menuBtn);
    var setMenu = function (open) {
      menu.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('menu-open', open);
      if (label) label.textContent = open ? 'Close' : 'Menu';
      if (use) use.setAttribute('href', '/images/icons.svg#' + (open ? 'close' : 'menu'));
    };
    menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });
    window.matchMedia('(min-width: 821px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false);
    });
  }

  // ---------- top bar over the hero: turns solid once you scroll past the photo ----------
  var bar = $('.bar-over');
  var heroEl = $('#hero');
  if (bar && heroEl && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-solid', !entries[0].isIntersecting);
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(heroEl);
  }

  // ---------- forms (newsletter + contact, sent through Formspree) ----------
  $$('form[data-form]').forEach(function (form) {
    var status = $('.form-status', form);
    var button = $('button[type="submit"]', form);
    var okText = form.getAttribute('data-ok');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      button.disabled = true;
      status.textContent = 'Sending…';
      status.removeAttribute('data-state');
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          form.reset();
          status.textContent = okText;
          status.setAttribute('data-state', 'ok');
        })
        .catch(function () {
          status.textContent = 'Not sent. Check your connection and try again.';
          status.setAttribute('data-state', 'error');
        })
        .then(function () { button.disabled = false; });
    });
  });

  // ---------- video posters: load YouTube only when someone presses play ----------
  $$('.video[data-yt]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + btn.getAttribute('data-yt') + '?autoplay=1&playsinline=1&rel=0';
      frame.title = btn.getAttribute('aria-label').replace('Play the video: ', '');
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      var box = document.createElement('div');
      box.className = 'video';
      box.appendChild(frame);
      btn.replaceWith(box);
      frame.focus();
    });
  });

  // ---------- hero slideshow: crossfades live photos, with a pause button ----------
  (function () {
    var slides = $$('.hero-media img');
    var bars = $$('.hero-bars span');
    var pauseBtn = $('.hero-pause');
    if (slides.length < 2 || !pauseBtn) return;
    var i = 0, timer = null;
    var paused = reduceMotion;  // people who ask for less motion start paused
    // let the other photos start loading once the page has settled
    window.addEventListener('load', function () { slides.forEach(function (s) { s.loading = 'eager'; }); });
    var show = function (n) {
      n = (n + slides.length) % slides.length;
      // never fade to a photo that hasn't arrived yet (that would flash an empty frame)
      if (!(slides[n].complete && slides[n].naturalWidth)) return;
      slides[i].classList.remove('is-on'); bars[i] && bars[i].classList.remove('is-on');
      i = n;
      slides[i].classList.add('is-on'); bars[i] && bars[i].classList.add('is-on');
    };
    var setPaused = function (p) {
      paused = p;
      clearInterval(timer);
      if (!p) timer = setInterval(function () { show(i + 1); }, 6500);
      pauseBtn.setAttribute('aria-pressed', String(p));
      pauseBtn.setAttribute('aria-label', p ? 'Play the photo slideshow' : 'Pause the photo slideshow');
      pauseBtn.innerHTML = icon(p ? 'play' : 'pause');
    };
    pauseBtn.addEventListener('click', function () { setPaused(!paused); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearInterval(timer); else if (!paused) setPaused(false);
    });
    setPaused(paused);
  })();

  // ---------- live photo strip + full-screen viewer ----------
  (function () {
    var strip = $('.gallery');
    if (!strip) return;
    var items = $$('li', strip);
    var count = $('.gallery-count');
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var current = function () {
      var left = strip.getBoundingClientRect().left + parseFloat(getComputedStyle(strip).paddingLeft);
      var best = 0, bestDist = Infinity;
      items.forEach(function (li, n) {
        var d = Math.abs(li.getBoundingClientRect().left - left);
        if (d < bestDist) { bestDist = d; best = n; }
      });
      return best;
    };
    var update = function () { if (count) count.textContent = pad(current() + 1) + ' / ' + pad(items.length); };
    strip.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    $$('.gallery-nav [data-dir]').forEach(function (b) {
      b.addEventListener('click', function () {
        var n = Math.max(0, Math.min(items.length - 1, current() + Number(b.getAttribute('data-dir'))));
        strip.scrollTo({ left: items[n].offsetLeft - items[0].offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });

    var box = $('.lightbox');
    if (!box || typeof box.showModal !== 'function') return;
    var img = $('.lb-stage img', box);
    var cap = $('.lb-caption', box);
    var lbCount = $('.lb-count', box);
    var buttons = $$('button[data-full]', strip);
    var at = 0, opener = null;
    var open = function (n) {
      at = (n + buttons.length) % buttons.length;
      img.src = buttons[at].getAttribute('data-full');
      img.alt = buttons[at].getAttribute('data-alt');
      cap.textContent = buttons[at].getAttribute('data-alt');
      lbCount.textContent = pad(at + 1) + ' / ' + pad(buttons.length);
    };
    buttons.forEach(function (b, n) {
      b.addEventListener('click', function () { opener = b; open(n); box.showModal(); });
    });
    $$('[data-step]', box).forEach(function (b) {
      b.addEventListener('click', function () { open(at + Number(b.getAttribute('data-step'))); });
    });
    $('.lb-close', box).addEventListener('click', function () { box.close(); });
    box.addEventListener('close', function () { if (opener) opener.focus(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') open(at + 1);
      if (e.key === 'ArrowLeft') open(at - 1);
    });
    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) open(at + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  })();

  // ---------- home page: featured release, ticker, countdown and news from news.json ----------
  var feed = $('#feed');
  if (!feed) return;

  fetch('/data/news.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var items = (data.news || []).slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      renderFeatured(data.featured_release);
      renderTicker(data.featured_release, items);
      renderNext(items);
      renderFeed(items);
      describeShows(items);
    })
    .catch(function () {
      feed.innerHTML = '<li class="feed-empty">News didn\'t load. Refresh the page to try again.</li>';
    });

  function renderFeatured(r) {
    var hero = $('#hero');
    // The page ships with the featured release already in place; only redraw if news.json changed it.
    if (!r || !hero || hero.getAttribute('data-title') === r.title) return;
    hero.setAttribute('data-title', r.title);
    var badge = r.badge || 'New release';
    $('#hero-copy').innerHTML =
      '<p class="tag label">' + esc(badge) + ', out now</p>' +
      '<h1 class="display hero-title">' + esc(r.title) + '</h1>' +
      '<div class="actions">' +
        (r.spotify ? '<a class="btn btn-accent" href="' + esc(r.spotify) + '" target="_blank" rel="noopener">' + icon('spotify') + 'Play on Spotify</a>' : '') +
        '<a class="btn" href="' + esc(r.url) + '">All platforms</a>' +
      '</div>';
    var cover = $('#hero-cover');
    cover.href = r.url;
    cover.setAttribute('aria-label', r.title + ', all platforms');
    $('img', cover).src = String(r.artwork).replace(/\.jpg$/, '-600.jpg').replace(/ /g, '%20');
    $('p', cover).textContent = badge;
  }

  function renderTicker(r, items) {
    var track = $('.ticker-track');
    if (!track || !r) return;
    var list = [[(r.badge || 'New release') + ': ' + r.title, r.url]]
      .concat(items.slice(0, 4).map(function (n) { return [n.title, n.url || n.source || '']; }))
      .concat([['Rap metal from Athens', '/press/#bio']]);
    var ul = function (hidden) {
      return '<ul' + (hidden ? ' aria-hidden="true"' : '') + '>' + list.map(function (x) {
        return '<li>' + (x[1] ? '<a href="' + esc(x[1]) + '"' + linkAttrs(x[1]) + (hidden ? ' tabindex="-1"' : '') + '>' + esc(x[0]) + '</a>' : esc(x[0])) + '</li>';
      }).join('') + '</ul>';
    };
    track.innerHTML = ul(false) + ul(true);
  }

  function renderNext(items) {
    var band = $('#next');
    if (!band) return;
    var now = Date.now();
    var upcoming = items.filter(function (i) {
      return i.type === 'release' && new Date(i.date).getTime() > now;
    }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); })[0];
    if (!upcoming) { band.hidden = true; return; }
    var link = upcoming.url || upcoming.source;
    $('.next-inner', band).innerHTML =
      (upcoming.artwork ? '<img class="next-art" src="' + esc(upcoming.artwork) + '" alt="">' : '<span></span>') +
      '<div><span class="sticker">Next release</span>' +
        '<p class="next-title">' + (link ? '<a href="' + esc(link) + '"' + linkAttrs(link) + '>' + esc(upcoming.title) + '</a>' : esc(upcoming.title)) + '</p></div>' +
      '<div class="clock" role="timer" aria-label="Time until release">' +
        '<div><b data-u="d">00</b><span>days</span></div>' +
        '<div><b data-u="h">00</b><span>hours</span></div>' +
        '<div><b data-u="m">00</b><span>min</span></div>' +
        '<div><b data-u="s">00</b><span>sec</span></div>' +
      '</div>';
    band.hidden = false;
    var target = new Date(upcoming.date).getTime();
    var cells = {};
    $$('[data-u]', band).forEach(function (b) { cells[b.getAttribute('data-u')] = b; });
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var timer;
    var tick = function () {
      var diff = target - Date.now();
      if (diff <= 0) { clearInterval(timer); $('.clock', band).innerHTML = '<span class="sticker">Out now</span>'; return; }
      cells.d.textContent = pad(Math.floor(diff / 864e5));
      cells.h.textContent = pad(Math.floor(diff / 36e5) % 24);
      cells.m.textContent = pad(Math.floor(diff / 6e4) % 60);
      cells.s.textContent = pad(Math.floor(diff / 1e3) % 60);
    };
    timer = setInterval(tick, 1000);
    tick();
  }

  // Tell search engines about shows, so gigs can appear in Google results.
  // A show needs "venue" and "city" in news.json for this; "country" is optional.
  function describeShows(items) {
    var events = items.filter(function (i) {
      return i.type === 'show' && i.venue && i.city && i.date;
    }).map(function (i) {
      return {
        '@context': 'https://schema.org',
        '@type': 'MusicEvent',
        name: i.title,
        description: i.description || undefined,
        startDate: i.date,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        url: i.url || undefined,
        image: 'https://www.tiltguild.com/images/share/tilt-guild.jpg',
        location: {
          '@type': 'Place',
          name: i.venue,
          address: { '@type': 'PostalAddress', addressLocality: i.city, addressCountry: i.country || undefined }
        },
        performer: { '@type': 'MusicGroup', '@id': 'https://www.tiltguild.com/#band', name: 'Tilt Guild', url: 'https://www.tiltguild.com/' }
      };
    });
    if (!events.length) return;
    var tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.textContent = JSON.stringify(events);
    document.head.appendChild(tag);
  }

  function renderFeed(items) {
    if (!items.length) {
      feed.innerHTML = '<li class="feed-empty">No news yet. Follow us on Instagram for updates.</li>';
      return;
    }
    var now = Date.now();
    var kinds = { release: 'Release', show: 'Show', press: 'Press' };
    var actions = { release: 'Listen', show: 'Event details', press: 'Read' };
    feed.innerHTML = items.map(function (item) {
      var d = item.date ? new Date(item.date) : null;
      var day = d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
      var year = d ? d.getFullYear() : '';
      var url = item.url || item.source || '';
      var upcoming = item.type === 'show' && d && d.getTime() > now;
      var kind = kinds[item.type] || 'News';
      return '<li>' +
        '<p class="feed-date">' + esc(day) + '<small>' + esc(year) + '</small></p>' +
        '<div>' +
          '<p class="feed-kind">' + kind + (upcoming ? ' <span class="sticker dot">Upcoming</span>' : '') + '</p>' +
          '<h3>' + esc(item.title || item.headline) + '</h3>' +
          '<p class="feed-desc">' + esc(item.description || item.summary) + '</p>' +
        '</div>' +
        (url ? '<a class="btn" href="' + esc(url) + '"' + linkAttrs(url) + '>' + (actions[item.type] || 'Read more') + '</a>' : '') +
      '</li>';
    }).join('');
  }
})();
