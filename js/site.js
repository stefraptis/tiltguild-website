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
  $$('[data-need-one] input[type="checkbox"]').forEach(function (b) {
    b.addEventListener('change', function () { $$('input', b.closest('[data-need-one]')).forEach(function (x) { x.setCustomValidity(''); }); });
  });
  $$('form[data-form]').forEach(function (form) {
    var status = $('.form-status', form);
    var button = $('button[type="submit"]', form);
    var okText = form.getAttribute('data-ok');
    // a group marked data-need-one (the merch picks) needs at least one box ticked;
    // checked on click too, because the browser checks the form before the submit event
    var needOne = function () {
      var group = $('[data-need-one]', form);
      if (!group) return;
      var boxes = $$('input[type="checkbox"]', group);
      var none = !boxes.some(function (b) { return b.checked; });
      boxes[0].setCustomValidity(none ? 'Pick at least one item.' : '');
    };
    button.addEventListener('click', needOne);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      needOne();
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

  // ---------- merch bento: tiles rise in when the grid first comes into view ----------
  (function () {
    var grid = $('.bento');
    if (!grid || reduceMotion || !('IntersectionObserver' in window)) return;
    var box = grid.getBoundingClientRect();
    if (box.top < window.innerHeight * 0.85) return;  // already on screen: show it as is
    grid.classList.add('is-armed');
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      grid.classList.add('is-in');
      io.disconnect();
      setTimeout(function () { grid.classList.remove('is-armed'); }, 1400);
    }, { threshold: 0.12 });
    io.observe(grid);
  })();

  // ---------- live photo strip + full-screen viewer ----------
  (function () {
    var strip = $('.gallery, .bento');  // sideways strip (home) or bento grid (merch)
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

  // ---------- giveaways: the /giveaway/ page and the home page band, from /data/giveaway.json ----------
  // The file decides everything: set "active" to true and fill in the dates to run one.
  (function () {
    var page = $('[data-gw]');
    var band = $('#gw-band');
    if (!page && !band) return;

    var stateOf = function (g, now) {
      if (!g || !g.active) return 'none';
      var start = Date.parse(g.starts), end = Date.parse(g.ends);
      if (isNaN(end)) return 'none';
      if (!isNaN(start) && now < start) return 'upcoming';
      return now < end ? 'open' : 'ended';
    };
    var when = function (iso) {  // "Sunday 15 November, 21:00" in Athens time
      try {
        return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' }).format(new Date(iso));
      } catch (e) { return new Date(iso).toLocaleString(); }
    };
    var pad = function (n) { return String(n).padStart(2, '0'); };
    // counts down in the [data-u] cells inside root; calls done() once at zero
    var countdown = function (root, target, done) {
      var cells = {};
      $$('[data-u]', root).forEach(function (b) { cells[b.getAttribute('data-u')] = b; });
      var timer = null;
      var tick = function () {
        var diff = target - Date.now();
        if (diff <= 0) { clearInterval(timer); if (done) done(); return; }
        cells.d.textContent = pad(Math.floor(diff / 864e5));
        cells.h.textContent = pad(Math.floor(diff / 36e5) % 24);
        cells.m.textContent = pad(Math.floor(diff / 6e4) % 60);
        cells.s.textContent = pad(Math.floor(diff / 1e3) % 60);
      };
      timer = setInterval(tick, 1000);
      tick();
      return function () { clearInterval(timer); };
    };

    fetch('/data/giveaway.json', { cache: 'no-cache' })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (g) { if (page) renderPage(g); if (band) renderBand(g); })
      .catch(function () { if (page) renderPage(null); });

    // ---- home page band: only while a giveaway is upcoming or open ----
    function renderBand(g) {
      var st = stateOf(g, Date.now());
      if (st !== 'upcoming' && st !== 'open') { band.hidden = true; return; }
      $('.gw-band-inner', band).innerHTML =
        '<div><span class="sticker">' + (st === 'open' ? 'Giveaway, open now' : 'Giveaway, opens soon') + '</span>' +
          '<p class="gw-band-title">' + esc(g.title) + '</p></div>' +
        '<div class="clock" role="timer" aria-label="' + (st === 'open' ? 'Time left to enter' : 'Time until entries open') + '">' +
          '<div><b data-u="d">00</b><span>days</span></div><div><b data-u="h">00</b><span>hours</span></div>' +
          '<div><b data-u="m">00</b><span>min</span></div><div><b data-u="s">00</b><span>sec</span></div></div>' +
        '<a class="btn btn-accent" href="/giveaway/">' + (st === 'open' ? 'Enter now' : 'See the prize') + '</a>';
      band.hidden = false;
      countdown(band, Date.parse(st === 'open' ? g.ends : g.starts), function () { renderBand(g); });
    }

    // ---- the giveaway page ----
    var stopClock = null;
    function renderPage(g) {
      var st = stateOf(g, Date.now());
      $('#gw-loading').hidden = true;
      var show = function (sel, on) { $(sel).hidden = !on; };
      show('#gw', st !== 'none');
      show('#gw-how', st === 'upcoming' || st === 'open');
      show('#gw-rules', st !== 'none' && (g.rules || []).length > 0);
      show('#gw-empty', st === 'none');
      if (st === 'none') return;

      var img = $('#gw-img');
      if (g.image) { img.src = g.image; img.alt = g.image_alt || ''; } else { $('.gw-media').hidden = true; }
      $('#gw-badge').textContent = { upcoming: 'Opens soon', open: 'Open now', ended: 'Closed' }[st];
      $('#gw-kicker').textContent = { upcoming: 'Giveaway, opens soon', open: 'Giveaway, open now', ended: 'Giveaway, closed' }[st];
      $('#gw-title').textContent = g.title || 'Giveaway';
      $('#gw-prize').innerHTML = (g.prize || []).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('');
      $('#gw-desc').innerHTML = String(g.description || '').split(/\n\s*\n/).filter(Boolean)
        .map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
      $('#gw-rules-list').innerHTML = (g.rules || []).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('');

      // countdown: to the start while upcoming, to the end while open
      if (stopClock) stopClock();
      var clockBox = $('#gw-clock');
      clockBox.hidden = st === 'ended';
      if (st !== 'ended') {
        $('#gw-clock-label').textContent = st === 'open' ? 'Closes in' : 'Opens in';
        $('#gw-when').textContent = (st === 'open' ? 'Entries close ' : 'Entries open ') + when(st === 'open' ? g.ends : g.starts) + ', Athens time.';
        stopClock = countdown(clockBox, Date.parse(st === 'open' ? g.ends : g.starts), function () { renderPage(g); });
      }

      var state = $('#gw-state');
      var form = $('#gw-form');
      if (st === 'upcoming') {
        state.innerHTML = '<p>Entries open ' + esc(when(g.starts)) + '. Come back then, or follow us on Instagram so you don\'t miss it.</p>';
      } else if (st === 'ended') {
        state.innerHTML = g.winner
          ? '<p class="gw-winner"><span class="label">Winner</span>' + esc(g.winner) + '</p><p>Congratulations! Thanks to everyone who entered.</p>'
          : '<p>Entries are closed. We\'re picking the winner at random and will announce them here and on Instagram.</p>';
      } else {
        state.innerHTML = '';
      }
      // the form only shows while the giveaway is open (and never again after a successful entry)
      form.hidden = st !== 'open' || form.getAttribute('data-done') === 'yes';
      if (st === 'open' && !g.endpoint) {
        $('.gw-submit', form).disabled = true;
        $('#gw-status').textContent = 'Entries open very soon.';
      }
      if (!form.getAttribute('data-wired')) { teeFields(g); wireForm(form, g); }
    }

    // T-shirt size and colour, asked up front when giveaway.json lists "sizes" or "colours"
    function teeFields(g) {
      var sizes = g.sizes || [], colours = g.colours || [];
      var box = $('#gw-tee');
      if (!sizes.length && !colours.length) { box.hidden = true; return; }
      box.innerHTML =
        (sizes.length
          ? '<div class="field"><label for="gw-size">T-shirt size</label><select id="gw-size" name="size" required>' +
            '<option value="">Choose your size</option>' +
            sizes.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select></div>'
          : '') +
        (colours.length
          ? '<fieldset class="picks gw-colours"><legend>T-shirt colour</legend>' +
            colours.map(function (c, i) {
              return '<label class="pick"><input type="radio" name="colour" value="' + esc(c) + '"' + (i === 0 ? ' required' : '') + '><span>' + esc(c) + '</span></label>';
            }).join('') + '</fieldset>'
          : '');
      box.hidden = false;
    }

    function wireForm(form, g) {
      form.setAttribute('data-wired', 'yes');
      var button = $('.gw-submit', form);
      var status = $('#gw-status');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;
        if (stateOf(g, Date.now()) !== 'open') { renderPage(g); return; }
        var body = new URLSearchParams(new FormData(form));
        body.set('id', g.id || '');
        button.disabled = true;
        status.removeAttribute('data-state');
        status.textContent = 'Sending…';
        fetch(g.endpoint, { method: 'POST', body: body })
          .then(function (res) { return res.json(); })
          .then(function (res) {
            if (res && res.ok) return done(res.duplicate);
            if (res && res.error === 'closed') { status.textContent = 'Sorry, this giveaway has closed.'; status.setAttribute('data-state', 'error'); return; }
            throw new Error((res && res.error) || 'failed');
          })
          .catch(function () {
            status.textContent = 'Not sent. Check your connection and try again.';
            status.setAttribute('data-state', 'error');
          })
          .then(function () { button.disabled = false; });
      });
      function done(duplicate) {
        var name = $('#gw-name').value.trim();
        var sizeBox = $('#gw-size'), colourBox = $('input[name="colour"]:checked', form);
        var tee = [sizeBox && sizeBox.value, colourBox && colourBox.value.toLowerCase()].filter(Boolean).join(', ');
        form.setAttribute('data-done', 'yes');
        form.hidden = true;
        var state = $('#gw-state');
        state.innerHTML =
          '<div class="gw-done"><p class="gw-done-title">' + (duplicate ? 'You\'re already in' : 'You\'re in' + (name ? ', ' + esc(name) : '')) + '</p>' +
          (!duplicate && tee ? '<p>T-shirt noted: ' + esc(tee) + '.</p>' : '') +
          '<p>' + (duplicate ? 'This email is already entered, so you\'re all set. ' : '') +
          'We pick the winner after ' + esc(when(g.ends)) + ' and email them. Good luck!</p>' +
          '<button class="btn gw-share" type="button">Tell a friend</button><span class="gw-share-note" role="status"></span></div>';
        var share = $('.gw-share', state);
        share.addEventListener('click', function () {
          var url = location.origin + '/giveaway/';
          if (navigator.share) { navigator.share({ title: g.title, url: url }).catch(function () {}); return; }
          var note = $('.gw-share-note', state);
          (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
            .then(function () { note.textContent = 'Link copied.'; })
            .catch(function () { note.textContent = url; });
        });
        share.focus();
      }
    }
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
      .concat([['Merch: T-shirts and To Kolpo CDs', '/merch/'], ['Rap metal from Athens', '/press/#bio']]);
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
