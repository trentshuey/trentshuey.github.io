/* Scales and Arpeggios (scales.html)
 * Draws and plays the ASU marimba skills test in any major or harmonic minor key.
 * The pattern and stickings come from the printed packet (see _src/scales_render.py).
 * Notation symbols are from the Bravura font by Steinberg, SIL Open Font License
 * (assets/fonts/bravura-OFL.txt).
 */
(function () {
  'use strict';
  var dataEl = document.getElementById('scales-data');
  var root = document.getElementById('scales');
  if (!dataEl || !root) return;

  var DATA = JSON.parse(dataEl.textContent);
  var G = DATA.glyphs;
  var NS = 'http://www.w3.org/2000/svg';

  var MODES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 11] };
  var NAT = [0, 2, 4, 5, 7, 9, 11];
  var SHARPS = [3, 0, 4, 1, 5, 2, 6];            // F C G D A E B
  var FLATS = [6, 2, 5, 1, 4, 0, 3];             // B E A D G C F
  var SIG_STEPS = { sharp: [38, 35, 39, 36, 33, 37, 34], flat: [34, 37, 33, 36, 32, 35, 31] };
  var BEATS = { q: 1, '8': 0.5, h: 2 };
  var SUBTITLE = ['Block chords, four mallets', 'Arpeggios in inversions, four mallets', 'Inner mallets', 'Two mallets'];
  var ACC_GLYPH = { '-1': 'accidentalFlat', '0': 'accidentalNatural', '1': 'accidentalSharp', '2': 'accidentalDoubleSharp' };

  // Engraving sizes, in staff spaces (Bravura's engraving defaults where it has them)
  var BASS_TOP = 11, MID = { t: 2, b: 13 };
  var HEAD_W = 1.18, STEM_W = 0.12, STEM_LEN = 3.5, BEAM_T = 0.5, LEDGER_T = 0.16, LEDGER_X = 0.4;
  var ACC_SLOT = 1.3;

  var keys = DATA.keys;
  var byId = {};
  keys.forEach(function (k) { byId[k.id] = k; });

  var sheet = root.querySelector('.sc-sections');
  var titleKey = root.querySelector('.sc-title-key');
  var controls = document.querySelector('.sc-controls');
  var nowKey = controls.querySelector('.sc-now-key');
  var bpmInput = document.getElementById('sc-bpm');
  var bpmOut = document.getElementById('sc-bpm-out');
  var clickBox = document.getElementById('sc-click');
  var loopBox = document.getElementById('sc-loop');
  var playAllBtn = controls.querySelector('.sc-play-all');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var current = null;      // key object
  var sections = null;     // built sections for the current key
  var lastWidth = 0;

  /* ---------- Spelling ---------- */

  function sigAccidentals(key) {
    var a = [0, 0, 0, 0, 0, 0, 0];
    var i;
    if (key.sig > 0) for (i = 0; i < key.sig; i++) a[SHARPS[i]] = 1;
    else for (i = 0; i < -key.sig; i++) a[FLATS[i]] = -1;
    return a;
  }

  // d is the number of scale steps above the tonic
  function spell(key, d, sig) {
    var step = key.step + d;
    var letter = step % 7;
    var midi = key.midi + MODES[key.mode][d % 7] + 12 * Math.floor(d / 7);
    var natural = 12 * (Math.floor(step / 7) + 1) + NAT[letter];
    var acc = midi - natural;
    var staff = step >= 28 ? 't' : 'b';              // middle C and up on the treble staff
    return {
      step: step, letter: letter, midi: midi, acc: acc, show: acc !== sig[letter], staff: staff,
      y: staff === 't' ? (38 - step) / 2 : BASS_TOP + (26 - step) / 2
    };
  }

  function build(key) {
    var sig = sigAccidentals(key);
    return DATA.sections.map(function (sec, si) {
      var t = 0;
      var events = sec.events.map(function (e, i) {
        var ev = {
          i: i, r: e.r, st: e.s || '', t: t, beats: BEATS[e.r], deg: e.d[0],
          notes: e.d.map(function (d) { return spell(key, d, sig); })
        };
        ev.hasAcc = ev.notes.some(function (n) { return n.show; });
        t += ev.beats;
        return ev;
      });
      return { index: si, name: sec.name, events: events, beats: t };
    });
  }

  /* ---------- Layout ---------- */

  function units(sec) {
    var out = [];
    sec.events.forEach(function (ev) {
      var last = out[out.length - 1];
      if (ev.r === '8' && last && last.length === 1 && last[0].r === '8' && last[0].t % 1 === 0) last.push(ev);
      else out.push([ev]);
    });
    return out;
  }

  function evWidth(ev) {
    var w = ev.r === 'q' ? 4.5 : ev.r === 'h' ? 3.8 : 2.8;
    return ev.hasAcc ? w + ACC_SLOT : w;
  }

  function prefixWidth(key) {
    return 3.9 + Math.abs(key.sig) * 1.05 + 1.2;
  }

  function layout(sec, key, avail) {
    var prefix = prefixWidth(key);
    var cap = Math.max(10, avail - prefix - 1.0);
    var lines = [];
    var cur = [];
    var curW = 0;
    var us = units(sec);
    var widths = us.map(function (u) { return u.reduce(function (s, ev) { return s + evWidth(ev); }, 0); });
    function fill(limit) {
      var out = [];
      us.forEach(function (u, i) {
        if (cur.length && curW + widths[i] > limit) { out.push({ units: cur, w: curW }); cur = []; curW = 0; }
        cur.push(u);
        curW += widths[i];
      });
      if (cur.length) out.push({ units: cur, w: curW });
      cur = [];
      curW = 0;
      return out;
    }
    lines = fill(cap);
    // Even out the lines so the last one is not a few stray notes
    if (lines.length > 1) {
      var total = widths.reduce(function (a, b) { return a + b; }, 0);
      var even = fill(Math.max(total / lines.length * 1.04, Math.max.apply(null, widths)));
      if (even.length === lines.length) lines = even;
    }
    return lines.map(function (line, li) {
      var last = li === lines.length - 1;
      var f = Math.max(1, cap / line.w);
      var ragged = false;
      if (lines.length === 1 && f > 2.3) { f = 2.3; ragged = true; }       // a short section on a wide screen
      else if (lines.length > 1 && last && f > 1.6) { f = 1.12; ragged = true; }
      var x = prefix;
      var placed = [];
      line.units.forEach(function (u, ui) {
        u.forEach(function (ev) {
          var w = evWidth(ev) * f;
          placed.push({ ev: ev, x: x + (ev.hasAcc ? ACC_SLOT : 0), slot: x, unit: ui });
          x += w;
        });
      });
      return { placed: placed, units: line.units, end: ragged ? x - 0.4 : prefix + cap + 1.0, last: last, first: li === 0 };
    });
  }

  /* ---------- Drawing ---------- */

  function r3(v) { return Math.round(v * 1000) / 1000; }

  function make(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function Drawing() {
    this.min = 0;
    this.max = 15;
  }
  Drawing.prototype.see = function (a, b) {
    if (a < this.min) this.min = a;
    if (b > this.max) this.max = b;
  };
  Drawing.prototype.rect = function (parent, x, y, w, h) {
    this.see(y, y + h);
    return make('rect', { x: r3(x), y: r3(y), width: r3(w), height: r3(h) }, parent);
  };
  Drawing.prototype.glyph = function (parent, name, x, y, sx, sy, top, bottom) {
    if (top !== undefined) this.see(y + top, y + bottom);
    var tf = 'translate(' + r3(x) + ' ' + r3(y) + ')' + (sx ? ' scale(' + sx + ' ' + (sy || sx) + ')' : '');
    return make('path', { d: G[name].d, transform: tf }, parent);
  };
  Drawing.prototype.text = function (parent, str, x, y, size, cls) {
    this.see(y - size * 0.78, y + size * 0.2);
    var t = make('text', { x: r3(x), y: r3(y), 'font-size': size, 'class': cls }, parent);
    t.textContent = str;
    return t;
  };

  // Stem direction for notes on one staff: away from the side the notes lean toward
  function stemDir(ys, staff) {
    var top = Math.min.apply(null, ys);
    var bot = Math.max.apply(null, ys);
    return (bot - MID[staff]) > (MID[staff] - top) ? 'up' : 'down';
  }

  function idealEnd(ys, staff, dir) {
    var top = Math.min.apply(null, ys);
    var bot = Math.max.apply(null, ys);
    return dir === 'up' ? Math.min(top - STEM_LEN, MID[staff]) : Math.max(bot + STEM_LEN, MID[staff]);
  }

  function ledgers(dw, g, notes, staff, x) {
    var steps = notes.map(function (n) { return n.step; });
    var lo = Math.min.apply(null, steps);
    var hi = Math.max.apply(null, steps);
    var bottom = staff === 't' ? 30 : 18;
    var topLine = staff === 't' ? 38 : 26;
    var yOf = function (s) { return staff === 't' ? (38 - s) / 2 : BASS_TOP + (26 - s) / 2; };
    var s;
    for (s = bottom - 2; s >= lo; s -= 2) dw.rect(g, x - LEDGER_X, yOf(s) - LEDGER_T / 2, HEAD_W + 2 * LEDGER_X, LEDGER_T);
    for (s = topLine + 2; s <= hi; s += 2) dw.rect(g, x - LEDGER_X, yOf(s) - LEDGER_T / 2, HEAD_W + 2 * LEDGER_X, LEDGER_T);
  }

  function heads(dw, g, notes, x, half) {
    notes.forEach(function (n) {
      if (n.show) {
        var name = ACC_GLYPH[String(n.acc)];
        dw.glyph(g, name, x - G[name].w - 0.22, n.y, 0, 0, -1.8, 1.4);
      }
      dw.glyph(g, half ? 'noteheadHalf' : 'noteheadBlack', x, n.y, 0, 0, -0.5, 0.5);
    });
  }

  function stemRect(dw, g, x, dir, fromY, toY) {
    var sx = dir === 'up' ? x + HEAD_W - STEM_W : x;
    var a = Math.min(fromY, toY);
    var b = Math.max(fromY, toY);
    dw.rect(g, sx, a, STEM_W, b - a);
    return sx;
  }

  function drawSystem(line, sec, key, S, width) {
    var dw = new Drawing();
    var svg = make('svg', { 'class': 'sc-system', role: 'img' });
    var g = make('g', {}, svg);

    // Staves, system line, brace, clefs, key signatures
    [0, BASS_TOP].forEach(function (top) {
      for (var l = 0; l < 5; l++) dw.rect(g, 0, top + l - 0.065, line.end, 0.13);
    });
    dw.rect(g, -0.08, 0, 0.16, 15);
    dw.glyph(g, 'brace', -1.25, 15, 1.7, 3.75, -15, 0);
    dw.glyph(g, 'gClef', 0.6, 3, 0, 0, -4.4, 2.64);
    dw.glyph(g, 'fClef', 0.6, BASS_TOP + 1, 0, 0, -1.05, 2.55);
    var n = Math.abs(key.sig);
    var kind = key.sig > 0 ? 'sharp' : 'flat';
    var accName = key.sig > 0 ? 'accidentalSharp' : 'accidentalFlat';
    for (var i = 0; i < n; i++) {
      var st = SIG_STEPS[kind][i];
      var xk = 3.85 + i * 1.05;
      dw.glyph(g, accName, xk, (38 - st) / 2, 0, 0, -1.8, 1.4);
      dw.glyph(g, accName, xk, BASS_TOP + (40 - st) / 2, 0, 0, -1.8, 1.4);
    }

    // Group the placed events by staff, then work out stems and beams
    var groups = {};       // event index -> <g>
    function groupFor(ev) {
      if (!groups[ev.i]) groups[ev.i] = make('g', { 'class': 'ev', 'data-i': ev.i }, g);
      return groups[ev.i];
    }
    var tops = {};         // event index -> highest point per staff, for stickings
    var bottoms = {};      // event index -> lowest point per staff, for chord symbols
    function note(pi, staff, top, bottom) {
      tops[pi] = tops[pi] || {};
      bottoms[pi] = bottoms[pi] || {};
      tops[pi][staff] = Math.min(top, tops[pi][staff] === undefined ? Infinity : tops[pi][staff]);
      bottoms[pi][staff] = Math.max(bottom, bottoms[pi][staff] === undefined ? -Infinity : bottoms[pi][staff]);
    }

    var byUnit = {};
    line.placed.forEach(function (p) { (byUnit[p.unit] = byUnit[p.unit] || []).push(p); });

    Object.keys(byUnit).forEach(function (u) {
      var ps = byUnit[u];
      // Two eighths on one staff, one note each: beam them
      if (ps.length === 2 && ps[0].ev.r === '8' && ps[1].ev.r === '8' &&
          ps[0].ev.notes.length === 1 && ps[1].ev.notes.length === 1 &&
          ps[0].ev.notes[0].staff === ps[1].ev.notes[0].staff) {
        var a = ps[0];
        var b = ps[1];
        var na = a.ev.notes[0];
        var nb = b.ev.notes[0];
        var staff = na.staff;
        var dir = stemDir([na.y, nb.y], staff);
        var ea = idealEnd([na.y], staff, dir);
        var eb = idealEnd([nb.y], staff, dir);
        var xa = dir === 'up' ? a.x + HEAD_W - STEM_W : a.x;
        var xb = dir === 'up' ? b.x + HEAD_W - STEM_W : b.x;
        var rise = Math.max(-1, Math.min(1, (nb.y - na.y) * 0.5));
        var start = dir === 'up' ? Math.min(ea, eb - rise) : Math.max(ea, eb - rise);
        var slope = rise / (xb - xa);
        var L = function (x) { return start + slope * (x - xa); };
        [a, b].forEach(function (p) {
          var gg = groupFor(p.ev);
          var nn = p.ev.notes[0];
          ledgers(dw, gg, p.ev.notes, staff, p.x);
          heads(dw, gg, p.ev.notes, p.x, false);
          var sx = dir === 'up' ? p.x + HEAD_W - STEM_W : p.x;
          var end = L(sx);
          stemRect(dw, gg, p.x, dir, dir === 'up' ? nn.y - 0.168 : nn.y + 0.168, end);
          if (dir === 'up') note(p.ev.i, staff, end, nn.y + 0.5);
          else note(p.ev.i, staff, nn.y - 0.5, end);
        });
        var y1 = L(xa);
        var y2 = L(xb);
        var off = dir === 'up' ? BEAM_T : -BEAM_T;
        var pts = [[xa, y1], [xb + STEM_W, y2 + slope * STEM_W], [xb + STEM_W, y2 + slope * STEM_W + off], [xa, y1 + off]];
        dw.see(Math.min(y1, y2, y1 + off, y2 + off), Math.max(y1, y2, y1 + off, y2 + off));
        make('polygon', { points: pts.map(function (q) { return r3(q[0]) + ',' + r3(q[1]); }).join(' '), 'class': 'beam' }, g);
        return;
      }
      // Otherwise each event stands alone: one stem per staff, flags on eighths
      ps.forEach(function (p) {
        var gg = groupFor(p.ev);
        ['t', 'b'].forEach(function (staff) {
          var notes = p.ev.notes.filter(function (q) { return q.staff === staff; });
          if (!notes.length) return;
          var ys = notes.map(function (q) { return q.y; });
          var dir = stemDir(ys, staff);
          var end = idealEnd(ys, staff, dir);
          var top = Math.min.apply(null, ys);
          var bot = Math.max.apply(null, ys);
          ledgers(dw, gg, notes, staff, p.x);
          heads(dw, gg, notes, p.x, p.ev.r === 'h');
          var sx = stemRect(dw, gg, p.x, dir, dir === 'up' ? bot - 0.168 : top + 0.168, end);
          if (p.ev.r === '8') {
            if (dir === 'up') dw.glyph(gg, 'flag8thUp', sx, end + 0.04, 0, 0, 0, 3.3);
            else dw.glyph(gg, 'flag8thDown', sx, end - 0.13, 0, 0, -3.3, 0);
          }
          if (dir === 'up') note(p.ev.i, staff, end, bot + 0.5);
          else note(p.ev.i, staff, top - 0.5, end);
        });
      });
    });

    // Stickings above the notes they belong to (treble above the staff, bass between the staves)
    line.placed.forEach(function (p) {
      if (!p.ev.st) return;
      var staff = p.ev.notes[0].staff;
      var top = tops[p.ev.i][staff];
      var base = staff === 't' ? Math.min(-1.1, top - 0.8) : Math.min(BASS_TOP - 1.1, top - 0.8);
      // keep a beamed pair's numbers on one line
      var mate = line.placed.filter(function (q) { return q.unit === p.unit && q !== p && q.ev.st && q.ev.notes[0].staff === staff; })[0];
      if (mate) {
        var mt = tops[mate.ev.i][staff];
        var mb = staff === 't' ? Math.min(-1.1, mt - 0.8) : Math.min(BASS_TOP - 1.1, mt - 0.8);
        base = Math.min(base, mb);
      }
      dw.text(groupFor(p.ev), p.ev.st, p.x + HEAD_W / 2, base, 1.45, 'st');
    });

    // Chord symbols: I, I6, I64 under the staff that holds the bass of the chord
    if (sec.index === 0) {
      var rows = { t: 4 + 4.4, b: BASS_TOP + 4 + 3.4 };
      line.placed.forEach(function (p) {
        var staff = p.ev.notes[0].staff;
        rows[staff] = Math.max(rows[staff], bottoms[p.ev.i][staff] + 2.9);
      });
      line.placed.forEach(function (p) {
        var staff = p.ev.notes[0].staff;
        var cx = p.x + HEAD_W / 2;
        var y = rows[staff];
        var gg = groupFor(p.ev);
        var inv = p.ev.deg % 7;
        dw.text(gg, 'I', cx, y, 2.3, 'rn');
        if (inv === 2 || inv === 4) dw.text(gg, '6', cx + 0.85, y - 1.1, 1.3, 'rn-fig');
        if (inv === 4) dw.text(gg, '4', cx + 0.85, y + 0.25, 1.3, 'rn-fig');
      });
      if (line.first) {
        var p0 = line.placed[0];
        var yDyn = rows[p0.ev.notes[0].staff];
        var xDyn = p0.x - 3.6;
        dw.glyph(g, 'dynamicMezzo', xDyn, yDyn, 0, 0, -1.2, 0.1);
        dw.glyph(g, 'dynamicForte', xDyn + 1.5, yDyn, 0, 0, -1.8, 0.65);
      }
    }

    // Final barline at the end of the section
    if (line.last) {
      dw.rect(g, line.end - 0.98, 0, 0.16, 15);
      dw.rect(g, line.end - 0.5, 0, 0.5, 15);
    }

    var x0 = -1.7;
    var y0 = dw.min - 0.9;
    var w = line.end - x0 + 0.3;
    var h = dw.max - y0 + 0.9;
    svg.setAttribute('viewBox', [r3(x0), r3(y0), r3(w), r3(h)].join(' '));
    svg.setAttribute('width', Math.round(w * S));
    svg.setAttribute('height', Math.round(h * S));
    return svg;
  }

  /* ---------- Page ---------- */

  function render() {
    stop();
    var width = sheet.clientWidth || root.clientWidth;
    lastWidth = width;
    var S = width < 560 ? 6.4 : width < 900 ? 7.4 : 8.6;
    var avail = width / S - 1.9;
    sections = build(current);
    sheet.innerHTML = '';
    sections.forEach(function (sec) {
      var wrap = document.createElement('section');
      wrap.className = 'sc-sec';
      wrap.setAttribute('data-sec', sec.index);
      wrap.setAttribute('aria-labelledby', 'sc-h-' + sec.index);
      var head = document.createElement('div');
      head.className = 'sc-sec-head';
      head.innerHTML = '<div><h3 id="sc-h-' + sec.index + '">' + sec.name + '</h3><p>' + SUBTITLE[sec.index] + '</p></div>' +
        '<button class="btn btn-outline-dark sc-play" type="button" data-sec="' + sec.index + '" aria-pressed="false"><span>Play</span></button>';
      wrap.appendChild(head);
      var score = document.createElement('div');
      score.className = 'sc-score';
      layout(sec, current, avail).forEach(function (line, li) {
        var svg = drawSystem(line, sec, current, S, width);
        svg.setAttribute('aria-label', current.title + ', ' + sec.name.toLowerCase() + (li ? ', continued' : ''));
        score.appendChild(svg);
      });
      wrap.appendChild(score);
      sheet.appendChild(wrap);
    });
  }

  function setKey(id, push) {
    var key = byId[id] || byId['c-major'];
    current = key;
    titleKey.textContent = key.title;
    nowKey.textContent = key.title;
    root.querySelectorAll('.sc-mode button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-mode') === key.mode ? 'true' : 'false');
    });
    root.querySelectorAll('.sc-keys').forEach(function (nav) { nav.hidden = nav.getAttribute('data-mode') !== key.mode; });
    root.querySelectorAll('.sc-key').forEach(function (a) {
      if (a.getAttribute('data-key') === key.id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    if (push && location.hash !== '#' + key.id) history.replaceState(null, '', '#' + key.id);
    render();
  }

  // Switching mode keeps the tonic when that key exists, by name or by sound
  function pitchClass(k) { return (k.midi % 12 + 12) % 12; }
  root.querySelector('.sc-mode').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-mode]');
    if (!b || b.getAttribute('data-mode') === current.mode) return;
    var mode = b.getAttribute('data-mode');
    var pool = keys.filter(function (k) { return k.mode === mode; });
    var next = pool.filter(function (k) { return k.label === current.label; })[0] ||
      pool.filter(function (k) { return pitchClass(k) === pitchClass(current); })[0] || pool[0];
    setKey(next.id, true);
  });

  root.addEventListener('click', function (e) {
    var a = e.target.closest('a.sc-key');
    if (!a) return;
    e.preventDefault();
    setKey(a.getAttribute('data-key'), true);
  });

  window.addEventListener('hashchange', function () {
    var id = location.hash.slice(1);
    if (byId[id] && (!current || id !== current.id)) setKey(id, false);
  });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (Math.abs((sheet.clientWidth || 0) - lastWidth) > 4) render();
    }, 160);
  });

  // Draw four major and four harmonic minor keys, the way the panel does
  var drawBtn = root.querySelector('.sc-draw');
  var drawn = root.querySelector('.sc-drawn');
  drawBtn.addEventListener('click', function () {
    ['major', 'minor'].forEach(function (mode) {
      var pool = keys.filter(function (k) { return k.mode === mode; });
      var pick = [];
      while (pick.length < 4) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      var box = drawn.querySelector('.sc-drawn-' + mode);
      box.innerHTML = '';
      pick.forEach(function (k, i) {
        var a = document.createElement('a');
        a.className = 'sc-key sc-key-drawn';
        a.href = '#' + k.id;
        a.setAttribute('data-key', k.id);
        a.textContent = k.label;
        box.appendChild(a);
        if (i < pick.length - 1) box.appendChild(document.createTextNode(' '));
      });
    });
    drawn.hidden = false;
    drawBtn.textContent = 'Draw again';
  });

  /* ---------- Sound ---------- */

  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var master = null;
  var playing = null;

  function audio() {
    if (!ctx) {
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(comp);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  // A rosewood bar: the fundamental, the overtone tuned two octaves up, and the mallet's contact
  function bar(t, midi, vel) {
    var f = 440 * Math.pow(2, (midi - 69) / 12);
    var ring = 0.32 + 1.6 * Math.min(1, Math.max(0, (90 - midi) / 52));
    var parts = [[f, vel, ring, 'sine'], [f * 4, vel * 0.3, 0.16, 'sine'], [Math.min(f * 10, 9000), vel * 0.12, 0.025, 'triangle']];
    parts.forEach(function (p) {
      var o = ctx.createOscillator();
      o.type = p[3];
      o.frequency.value = p[0];
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(p[1], t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + p[2] + 0.05);
    });
  }

  function click(t, strong) {
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = strong ? 1760 : 1320;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(strong ? 0.22 : 0.14, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.06);
  }

  function clearMarks() {
    sheet.querySelectorAll('.ev.on').forEach(function (x) { x.classList.remove('on'); });
  }

  function mark(si, i) {
    clearMarks();
    var secEl = sheet.querySelector('.sc-sec[data-sec="' + si + '"]');
    if (!secEl) return;
    var els = secEl.querySelectorAll('.ev[data-i="' + i + '"]');
    els.forEach(function (x) { x.classList.add('on'); });
    if (els.length) {
      var sys = els[0].closest('svg');
      if (sys && sys !== playing.lastSystem) {
        playing.lastSystem = sys;
        var box = sys.getBoundingClientRect();
        if (box.top < 150 || box.bottom > window.innerHeight - 20) {
          sys.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      }
    }
  }

  function setButton(btn, on) {
    if (!btn) return;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    var label = btn.querySelector('span');
    label.textContent = on ? 'Stop' : (btn === playAllBtn ? 'Play all' : 'Play');
  }

  function stop() {
    if (!playing) return;
    clearInterval(playing.timer);
    playing.timeouts.forEach(clearTimeout);
    if (playing.sources) playing.sources = null;
    setButton(playing.btn, false);
    clearMarks();
    if (ctx) {
      // Silence anything already scheduled
      master.disconnect();
      var fresh = ctx.createGain();
      fresh.gain.value = 0.5;
      var comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      fresh.connect(comp);
      master = fresh;
    }
    playing = null;
  }

  function start(list, btn) {
    audio();
    stop();
    var items = [];
    var beat = 0;
    list.forEach(function (si) {
      var sec = sections[si];
      sec.events.forEach(function (ev) { items.push({ b: beat + ev.t, ev: ev, sec: si }); });
      beat += sec.beats;
    });
    playing = {
      items: items, total: beat, idx: 0, btn: btn, timeouts: [], lastSystem: null,
      beat: clickBox.checked ? -4 : 0, time: ctx.currentTime + 0.12
    };
    setButton(btn, true);
    schedule();
    playing.timer = setInterval(schedule, 40);
  }

  function schedule() {
    var p = playing;
    if (!p) return;
    var horizon = ctx.currentTime + 0.18;
    while (p.time < horizon) {
      var spb = 60 / parseFloat(bpmInput.value);
      var b = p.beat;
      if (b >= p.total - 1e-6) {
        if (loopBox.checked) {
          p.idx = 0;
          p.beat = 0;
          continue;
        }
        var endAt = p.time;
        p.timeouts.push(setTimeout(function () { if (playing === p) stop(); }, Math.max(0, (endAt - ctx.currentTime) * 1000 + 600)));
        clearInterval(p.timer);
        return;
      }
      if (clickBox.checked && Math.abs(b - Math.round(b)) < 1e-6) click(p.time, b === -4 || b === 0);
      while (p.idx < p.items.length && Math.abs(p.items[p.idx].b - b) < 1e-6) {
        var it = p.items[p.idx];
        var vel = it.ev.notes.length > 1 ? 0.2 : 0.34;
        it.ev.notes.forEach(function (n) { bar(p.time, n.midi, vel); });
        (function (si, i, when) {
          p.timeouts.push(setTimeout(function () { if (playing === p) mark(si, i); }, Math.max(0, (when - ctx.currentTime) * 1000)));
        })(it.sec, it.ev.i, p.time);
        p.idx++;
      }
      // Next thing to happen: a note or a metronome beat
      var nextNote = p.idx < p.items.length ? p.items[p.idx].b : p.total;
      var nextBeat = Math.floor(b + 1e-6) + 1;
      var nb = Math.min(nextNote, clickBox.checked || b < 0 ? nextBeat : Infinity);
      p.time += (nb - b) * spb;
      p.beat = nb;
      if (p.timeouts.length > 600) p.timeouts = p.timeouts.slice(-300);
    }
  }

  sheet.addEventListener('click', function (e) {
    var btn = e.target.closest('.sc-play');
    if (!btn) return;
    if (playing && playing.btn === btn) { stop(); return; }
    start([parseInt(btn.getAttribute('data-sec'), 10)], btn);
  });
  playAllBtn.addEventListener('click', function () {
    if (playing && playing.btn === playAllBtn) { stop(); return; }
    start([0, 1, 2, 3], playAllBtn);
  });
  bpmInput.addEventListener('input', function () { bpmOut.textContent = bpmInput.value; });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });

  if (!AC) {
    playAllBtn.hidden = true;
    controls.querySelectorAll('.rud-tempo, .rud-opt').forEach(function (x) { x.hidden = true; });
  }
  controls.hidden = false;
  setKey(byId[location.hash.slice(1)] ? location.hash.slice(1) : 'c-major', false);
  if (!AC) sheet.querySelectorAll('.sc-play').forEach(function (b) { b.hidden = true; });
})();
