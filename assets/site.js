// trentshuey.com: small enhancements. The site works without this file.
(function () {
  // Open every page at the top unless the link points to a spot on the page
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var toTop = function () {
    if (location.hash) return;
    window.scrollTo(0, 0);
    try { document.body.scrollIntoView({ block: 'start' }); } catch (e) { /* older browsers */ }
  };
  toTop();
  window.addEventListener('pageshow', toTop);

  // Back to top: a button that appears once the page is scrolled, plus the footer link
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var topBtn = document.querySelector('.to-top');
  if (topBtn) {
    var showTop = function () { topBtn.classList.toggle('is-shown', window.scrollY > 700); };
    window.addEventListener('scroll', showTop, { passive: true });
    showTop();
  }
  document.querySelectorAll('a[href="#top"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      var brand = document.querySelector('.brand');
      if (brand) brand.focus({ preventScroll: true });
    });
  });

  // Mobile menu
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('site-nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  }

  // YouTube: load the player only when someone presses play
  document.querySelectorAll('a.video[data-video]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var id = link.getAttribute('data-video');
      var title = link.getAttribute('data-title') || 'Video';
      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      frame.title = title;
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      frame.allowFullscreen = true;
      var box = document.createElement('div');
      box.className = 'video';
      box.appendChild(frame);
      link.replaceWith(box);
      frame.focus();
    });
  });

  // Photo galleries: open the full-size photo in a viewer
  var viewer;
  document.querySelectorAll('.gallery-item').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (!window.HTMLDialogElement) return; // older browsers just open the image
      e.preventDefault();
      if (!viewer) {
        viewer = document.createElement('dialog');
        viewer.className = 'viewer';
        viewer.innerHTML = '<button class="viewer-close" type="button">Close</button><img alt=""><p></p>';
        document.body.appendChild(viewer);
        viewer.querySelector('.viewer-close').addEventListener('click', function () { viewer.close(); });
        viewer.addEventListener('click', function (ev) { if (ev.target === viewer) viewer.close(); });
      }
      var thumb = link.querySelector('img');
      var big = viewer.querySelector('img');
      big.src = link.getAttribute('href');
      big.alt = thumb ? thumb.alt : '';
      viewer.querySelector('p').textContent = thumb ? thumb.alt : '';
      viewer.showModal();
    });
  });

  // Events: drop anything that has already ended, keep short lists full, and say so when nothing is left
  var now = Date.now();
  document.querySelectorAll('.event[data-end]').forEach(function (item) {
    var end = Date.parse(item.getAttribute('data-end'));
    if (!isNaN(end) && end < now) item.remove();
  });
  document.querySelectorAll('.badge[data-until]').forEach(function (b) {
    var until = Date.parse(b.getAttribute('data-until') + 'T12:00:00Z');
    if (!isNaN(until) && until < now) b.remove();
  });
  document.querySelectorAll('.events[data-limit]').forEach(function (list) {
    var limit = parseInt(list.getAttribute('data-limit'), 10) || 3;
    list.querySelectorAll('.event').forEach(function (item, i) { item.hidden = i >= limit; });
  });
  // Recent sessions: add concerts once they have happened, and keep the list to its limit
  document.querySelectorAll('.sessions[data-limit]').forEach(function (list) {
    var limit = parseInt(list.getAttribute('data-limit'), 10) || 8;
    var shown = 0;
    Array.prototype.forEach.call(list.children, function (item) {
      var after = Date.parse(item.getAttribute('data-after') || '');
      var ready = isNaN(after) || after < now;
      item.hidden = !ready || shown >= limit;
      if (!item.hidden) shown++;
    });
  });
  document.querySelectorAll('.event-month').forEach(function (month) {
    if (!month.querySelector('.event')) month.remove();
  });
  document.querySelectorAll('.events-empty[hidden]').forEach(function (msg) {
    var scope = msg.parentElement;
    if (!scope.querySelector('.event')) {
      msg.hidden = false;
      scope.querySelectorAll('.events').forEach(function (l) { l.hidden = true; });
    }
  });

  // Program archive: filter by ensemble
  var filters = document.querySelector('.filters[data-target]');
  if (filters) {
    var programs = document.querySelectorAll(filters.getAttribute('data-target') + ' > li');
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-filter]');
      if (!b) return;
      var want = b.getAttribute('data-filter');
      filters.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      programs.forEach(function (p) {
        p.hidden = want !== 'all' && (p.getAttribute('data-group') || '').split(' ').indexOf(want) === -1;
      });
    });
    filters.hidden = false;
    // programs.html#jazz (or #percussion, #other) opens with that filter already on
    var want = location.hash.slice(1);
    var start = /^[a-z]+$/.test(want) && filters.querySelector('button[data-filter="' + want + '"]');
    if (start) start.click();
  }

  // Request forms: build a ready-to-send email from the answers (nothing is stored on this site)
  document.querySelectorAll('form[data-mailto]').forEach(function (form) {
    var status = form.querySelector('.form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.reportValidity && !form.reportValidity()) return;
      var lines = [];
      var done = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || done[el.name] || el.type === 'submit' || el.type === 'button') return;
        var label = el.getAttribute('data-label') || el.name;
        var value;
        if (el.type === 'checkbox' || el.type === 'radio') {
          done[el.name] = true;
          var picked = form.querySelectorAll('[name="' + el.name + '"]:checked');
          value = Array.prototype.map.call(picked, function (x) { return x.value; }).join(', ');
          label = el.closest('fieldset') ? el.closest('fieldset').getAttribute('data-label') || label : label;
        } else {
          value = el.value.trim();
        }
        if (value) lines.push(label + ': ' + value);
      });
      var subject = form.getAttribute('data-subject') || 'Website message';
      var who = form.querySelector('[name="name"]');
      if (who && who.value.trim()) subject += ': ' + who.value.trim();
      var href = 'mailto:' + form.getAttribute('data-mailto') +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n') + '\n');
      window.location.href = href;
      if (status) status.textContent = 'Your email app should open with the message filled in. Press send there to finish. If nothing opens, email ' + form.getAttribute('data-mailto') + ' directly.';
    });
  });

  // Instagram posts: load Instagram's embed script only when the section comes into view
  var insta = document.querySelector('.insta-posts[data-embed]');
  if (insta && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (!entries.some(function (en) { return en.isIntersecting; })) return;
      io.disconnect();
      var sc = document.createElement('script');
      sc.async = true;
      sc.src = insta.getAttribute('data-embed');
      document.body.appendChild(sc);
    }, { rootMargin: '400px' });
    io.observe(insta);
  }

  // Small visitor count in the footer (only when a counter is set up)
  var visits = document.querySelector('.visits[data-total]');
  if (visits && window.fetch) {
    fetch(visits.getAttribute('data-total'))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.count) { visits.textContent = d.count + ' visits'; visits.hidden = false; }
      })
      .catch(function () { /* the count is optional */ });
  }

  // Rudiments: synthesized snare drum playback with the Web Audio API
  var rudData = document.getElementById('rudiment-data');
  if (rudData && (window.AudioContext || window.webkitAudioContext)) (function () {
    var data = JSON.parse(rudData.textContent);
    var byN = {};
    data.forEach(function (r) { byN[r.n] = r; });
    var controls = document.querySelector('.rud-controls');
    var bpmInput = document.getElementById('rud-bpm');
    var bpmOut = document.getElementById('rud-bpm-out');
    var clickBox = document.getElementById('rud-click');
    var leftBox = document.getElementById('rud-left');
    var ctx, master, noiseBuf, playing = null;

    try {
      var saved = parseInt(localStorage.getItem('rudimentTempo'), 10);
      if (saved >= 40 && saved <= 200) bpmInput.value = saved;
    } catch (e) { /* storage is optional */ }
    bpmOut.textContent = bpmInput.value;
    bpmInput.addEventListener('input', function () {
      bpmOut.textContent = bpmInput.value;
      try { localStorage.setItem('rudimentTempo', bpmInput.value); } catch (e) { /* optional */ }
    });
    controls.hidden = false;
    document.querySelectorAll('.rud-play').forEach(function (b) { b.hidden = false; });

    var swap = { R: 'L', L: 'R', r: 'l', l: 'r' };
    var flip = function (s) { return (s || '').replace(/[RLrl]/g, function (c) { return swap[c]; }); };

    leftBox.addEventListener('change', function () {
      document.querySelectorAll('.notation .st').forEach(function (t) { t.textContent = flip(t.textContent); });
    });

    function audio() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        master = ctx.createDynamicsCompressor();
        master.connect(ctx.destination);
        var len = Math.floor(ctx.sampleRate * 0.6);
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        var ch = noiseBuf.getChannelData(0);
        for (var i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
    }

    function hit(t, vel, hand) {
      var dest = ctx.createGain();
      if (ctx.createStereoPanner) {
        var pan = ctx.createStereoPanner();
        pan.pan.value = hand === 'R' ? 0.3 : hand === 'L' ? -0.3 : 0;
        dest.connect(pan);
        pan.connect(master);
      } else {
        dest.connect(master);
      }
      var src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      var hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1100;
      var pk = ctx.createBiquadFilter();
      pk.type = 'peaking';
      pk.frequency.value = 3800;
      pk.gain.value = 5;
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(0.8 * vel, t + 0.002);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08 + 0.08 * vel);
      src.connect(hp); hp.connect(pk); pk.connect(ng); ng.connect(dest);
      src.start(t, Math.random() * 0.4);
      src.stop(t + 0.2);
      var o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(240, t);
      o.frequency.exponentialRampToValueAtTime(160, t + 0.05);
      var og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.6 * vel, t + 0.002);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(og); og.connect(dest);
      o.start(t);
      o.stop(t + 0.1);
    }

    function click(t, strong) {
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = strong ? 1760 : 1320;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(strong ? 0.28 : 0.18, t + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      o.connect(g); g.connect(master);
      o.start(t);
      o.stop(t + 0.06);
    }

    // One pass through a rudiment: strokes (in beats, plus a small offset in seconds for grace notes)
    function plan(r, left) {
      var ev = [], marks = [], beat = 0;
      r.notes.forEach(function (n, i) {
        marks.push({ b: beat, i: i });
        if (!n.rest) {
          var hand = left ? flip(n.h) : n.h;
          var vel = n.a ? 1 : 0.48;
          if (n.g) {
            var g = left ? flip(n.g) : n.g;
            for (var k = 0; k < g.length; k++) {
              ev.push({ b: beat, off: -(g.length - k) * 0.03, h: g[k].toUpperCase(), v: 0.2 });
            }
          }
          if (n.s) {
            var s = left ? flip(n.s) : n.s;
            var step = n.d / s.length;
            for (var j = 0; j < s.length; j++) {
              ev.push({ b: beat + j * step, off: 0, h: s[j], v: j === 0 ? vel : (j % 2 ? 0.34 : 0.42) });
            }
          } else if (n.z) {
            var strokes = Math.max(2, Math.round(n.d * 4));
            var each = n.d / strokes;
            for (var q = 0; q < strokes; q++) {
              for (var m = 0; m < 6; m++) {
                ev.push({ b: beat + q * each + m * each / 6, off: 0, h: q % 2 ? 'L' : 'R', v: 0.32 * Math.pow(0.78, m) });
              }
            }
          } else {
            ev.push({ b: beat, off: 0, h: hand, v: vel });
          }
        }
        beat += n.d;
      });
      return { ev: ev, marks: marks, beats: beat };
    }

    function clearMarks(p) {
      p.card.querySelectorAll('.rn.on').forEach(function (x) { x.classList.remove('on'); });
    }

    function stop() {
      if (!playing) return;
      var p = playing;
      playing = null;
      clearInterval(p.timer);
      p.timeouts.forEach(clearTimeout);
      p.btn.setAttribute('aria-pressed', 'false');
      p.btn.querySelector('span').textContent = 'Play';
      p.card.classList.remove('is-playing');
      clearMarks(p);
    }

    function schedule() {
      var p = playing;
      if (!p) return;
      while (p.next < ctx.currentTime + 0.25) {
        var spb = 60 / parseInt(bpmInput.value, 10);
        var pl = plan(p.r, leftBox.checked);
        var t0 = p.next;
        pl.ev.forEach(function (e) { hit(Math.max(ctx.currentTime, t0 + e.b * spb + e.off), e.v, e.h); });
        if (clickBox.checked) {
          for (var b = 0; b < pl.beats - 1e-6; b += p.r.pulse) click(t0 + b * spb, b === 0);
        }
        pl.marks.forEach(function (m) {
          var delay = (t0 + m.b * spb - ctx.currentTime) * 1000;
          p.timeouts.push(setTimeout(function () {
            if (playing !== p) return;
            clearMarks(p);
            if (p.notes[m.i]) p.notes[m.i].classList.add('on');
          }, Math.max(0, delay)));
        });
        p.next = t0 + pl.beats * spb;
        if (p.timeouts.length > 400) p.timeouts = p.timeouts.slice(-200);
      }
    }

    function start(btn) {
      audio();
      stop();
      var card = btn.closest('.rud');
      playing = {
        r: byN[parseInt(btn.getAttribute('data-n'), 10)],
        btn: btn, card: card, notes: card.querySelectorAll('.rn'),
        timeouts: [], next: ctx.currentTime + 0.1
      };
      btn.setAttribute('aria-pressed', 'true');
      btn.querySelector('span').textContent = 'Stop';
      card.classList.add('is-playing');
      schedule();
      playing.timer = setInterval(schedule, 40);
    }

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.rud-play');
      if (!btn) return;
      if (playing && playing.btn === btn) stop(); else start(btn);
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });

    // Draw four at random, like the Skills Assessment Test
    var drawBtn = document.querySelector('.rud-draw');
    var drawn = document.querySelector('.rud-drawn');
    drawBtn.addEventListener('click', function () {
      var pool = data.map(function (r) { return r.n; });
      var pick = [];
      while (pick.length < 4) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      document.querySelectorAll('.rud.is-drawn').forEach(function (c) { c.classList.remove('is-drawn'); });
      var list = drawn.querySelector('ol');
      list.innerHTML = '';
      pick.forEach(function (n) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#r' + n;
        a.textContent = byN[n].name;
        li.appendChild(a);
        list.appendChild(li);
        var card = document.getElementById('r' + n);
        if (card) card.classList.add('is-drawn');
      });
      drawn.hidden = false;
      drawBtn.textContent = 'Draw again';
    });
  })();

  // Jam sessions: show every tune's key for the visitor's instrument
  var inst = document.querySelector('.jam-inst');
  if (inst) (function () {
    var LET = 'CDEFGAB';
    var PC = [0, 2, 4, 5, 7, 9, 11];
    var SHIFT = { C: [0, 0], Bb: [1, 2], Eb: [5, 9], F: [4, 7] };   // letter steps and semitones up
    var ACC = { '-2': '♭♭', '-1': '♭', '0': '', '1': '♯', '2': '♯♯' };
    var MODE = { major: ' major', minor: ' minor', dorian: ' Dorian', blues: ' blues', '': '' };
    var HEAD = { C: 'Concert key', Bb: 'Key for B♭ instruments', Eb: 'Key for E♭ instruments', F: 'Key for F instruments' };
    var head = document.querySelector('.tunes .key-head');
    function spell(el, t) {
      var li = LET.indexOf(el.getAttribute('data-l'));
      var a = el.getAttribute('data-a');
      var nl = (li + SHIFT[t][0]) % 7;
      var pc = (((PC[li] + (a === 'b' ? -1 : a === '#' ? 1 : 0) + SHIFT[t][1]) % 12) + 12) % 12;
      var diff = (((pc - PC[nl]) % 12) + 12) % 12;
      if (diff > 6) diff -= 12;
      return LET[nl] + ACC[String(diff)] + MODE[el.getAttribute('data-m') || ''];
    }
    function show(t) {
      document.querySelectorAll('.tunes .tk').forEach(function (el) { el.textContent = spell(el, t); });
      if (head) head.textContent = HEAD[t];
      inst.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-t') === t ? 'true' : 'false');
      });
      try { localStorage.setItem('jam-instrument', t); } catch (e) { /* a convenience only */ }
    }
    inst.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-t]');
      if (b) show(b.getAttribute('data-t'));
    });
    inst.hidden = false;
    var saved = null;
    try { saved = localStorage.getItem('jam-instrument'); } catch (e) { /* private mode */ }
    if (saved && SHIFT[saved] && saved !== 'C') show(saved);
  })();

  // Marimba: play a 3-2 son clave once on load; bars ring when hovered
  var marimba = document.querySelector('.marimba');
  if (marimba) {
    var bars = marimba.querySelectorAll('.bar-group');
    var strike = function (g) {
      if (!g) return;
      g.classList.remove('is-struck');
      void g.getBBox(); // restart the animation
      g.classList.add('is-struck');
      setTimeout(function () { g.classList.remove('is-struck'); }, 340);
    };
    bars.forEach(function (g) {
      g.addEventListener('mouseenter', function () { strike(g); });
    });
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      // 16 sixteenth notes; 3-2 son clave lands on steps 0, 3, 6, 10, 12
      var hits = [[0, 4], [3, 8], [6, 12], [10, 15], [12, 18]];
      var sixteenth = 140; // ms, about 107 bpm
      setTimeout(function () {
        hits.forEach(function (h) {
          setTimeout(function () { strike(bars[h[1]]); }, h[0] * sixteenth);
        });
      }, 700);
    }
  }
})();
