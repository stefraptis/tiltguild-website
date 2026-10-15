// Tilt Guild site script: menu, forms, and the home page feed.
// The home page reads /data/news.json. Edit that file to change the
// featured release, add a countdown for an upcoming release, or post news.

(function () {
  'use strict';

  // ---------- footer year ----------
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // ---------- mobile menu ----------
  var menuBtn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  if (menuBtn && menu) {
    var label = menuBtn.querySelector('span');
    var use = menuBtn.querySelector('use');
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
    window.matchMedia('(min-width: 761px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false);
    });
  }

  // ---------- forms (newsletter + contact, sent through Formspree) ----------
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var status = form.querySelector('.form-status');
    var button = form.querySelector('button[type="submit"]');
    var okText = form.getAttribute('data-ok');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      button.disabled = true;
      status.textContent = 'Sending…';
      status.removeAttribute('data-state');

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        status.textContent = okText;
        status.setAttribute('data-state', 'ok');
      }).catch(function () {
        status.textContent = 'Not sent. Check your connection and try again.';
        status.setAttribute('data-state', 'error');
      }).then(function () {
        button.disabled = false;
      });
    });
  });

  // ---------- video posters: load YouTube only when someone presses play ----------
  document.querySelectorAll('.video[data-yt]').forEach(function (btn) {
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

  // ---------- home page ----------
  var feed = document.getElementById('feed');
  if (!feed) return;

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var isExternal = function (url) { return /^https?:\/\//.test(url); };
  var linkAttrs = function (url) { return isExternal(url) ? ' target="_blank" rel="noopener"' : ''; };
  var icon = function (id) {
    return '<svg class="icon" aria-hidden="true"><use href="/images/icons.svg#' + id + '"/></svg>';
  };

  fetch('/data/news.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      renderFeatured(data.featured_release);
      var items = (data.news || []).slice().sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
      });
      renderNext(items);
      renderFeed(items);
      describeShows(items);
    })
    .catch(function () {
      feed.innerHTML = '<li class="feed-empty">News didn\'t load. Refresh the page to try again.</li>';
    });

  function renderFeatured(r) {
    var hero = document.getElementById('hero');
    // The page ships with the featured release already in place; only redraw if news.json changed it.
    if (!r || !hero || hero.getAttribute('data-title') === r.title) return;
    hero.setAttribute('data-title', r.title);
    var listen = r.spotify
      ? '<a class="btn btn-ink" href="' + esc(r.spotify) + '" target="_blank" rel="noopener">' + icon('spotify') + 'Play on Spotify</a>'
      : '';
    hero.innerHTML =
      '<div class="hero-art">' +
        (r.badge ? '<span class="sticker">' + esc(r.badge) + '</span>' : '') +
        '<img src="' + esc(r.artwork) + '" width="1200" height="1200" alt="' + esc(r.title) + ' cover art">' +
      '</div>' +
      '<div class="hero-text">' +
        '<h1 class="display hero-title">' + esc(r.title) + '</h1>' +
        (r.meta ? '<p class="lede hero-meta">' + esc(r.meta) + '</p>' : '') +
        '<div class="actions">' + listen +
          '<a class="btn" href="' + esc(r.url) + '">All platforms</a>' +
        '</div>' +
      '</div>';
  }

  function renderNext(items) {
    var band = document.getElementById('next');
    if (!band) return;
    var now = Date.now();
    var upcoming = items.filter(function (i) {
      return i.type === 'release' && new Date(i.date).getTime() > now;
    }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); })[0];
    if (!upcoming) { band.hidden = true; return; }

    var link = upcoming.url || upcoming.source;
    band.querySelector('.next-inner').innerHTML =
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
    band.querySelectorAll('[data-u]').forEach(function (b) { cells[b.getAttribute('data-u')] = b; });
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var tick = function () {
      var diff = target - Date.now();
      if (diff <= 0) {
        clearInterval(timer);
        band.querySelector('.clock').innerHTML = '<span class="sticker">Out now</span>';
        return;
      }
      cells.d.textContent = pad(Math.floor(diff / 864e5));
      cells.h.textContent = pad(Math.floor(diff / 36e5) % 24);
      cells.m.textContent = pad(Math.floor(diff / 6e4) % 60);
      cells.s.textContent = pad(Math.floor(diff / 1e3) % 60);
    };
    var timer = setInterval(tick, 1000);
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
        image: 'https://tiltguild.com/images/share/tilt-guild.jpg',
        location: {
          '@type': 'Place',
          name: i.venue,
          address: { '@type': 'PostalAddress', addressLocality: i.city, addressCountry: i.country || undefined }
        },
        performer: { '@type': 'MusicGroup', '@id': 'https://tiltguild.com/#band', name: 'Tilt Guild', url: 'https://tiltguild.com/' }
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
          '<p class="feed-kind">' + kind + (upcoming ? ' <span class="sticker">Upcoming</span>' : '') + '</p>' +
          '<h3>' + esc(item.title || item.headline) + '</h3>' +
          '<p class="feed-desc">' + esc(item.description || item.summary) + '</p>' +
        '</div>' +
        (url ? '<a class="btn" href="' + esc(url) + '"' + linkAttrs(url) + '>' + (actions[item.type] || 'Read more') + '</a>' : '') +
      '</li>';
    }).join('');
  }
})();
