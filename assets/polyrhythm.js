/* Polyrhythm (polyrhythm.html)
 * One beat of five against three with a triplet inside it, drawn as notation and as bubbles,
 * and played with the Web Audio API. The beat is the first beat of measure 21 of Iannis
 * Xenakis's Rebonds a (Editions Salabert).
 *
 * Every position is counted in ninetieths of a dotted eighth, the smallest ruler that holds
 * the five, the thirty-seconds and the triplet at once. A sixteenth is 30 units and the whole
 * beat is 120. Each bubble is as wide as its note is long.
 */
(function () {
  'use strict';
  var root = document.getElementById('polyrhythm');
  if (!root) return;

  var AC = window.AudioContext || window.webkitAudioContext;
  var NS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- The beat ---------- */

  // line: staff position in spaces below the top line. f: pitch in Hz. len: ring in seconds.
  var DRUMS = {
    hb: { name: 'High bongo', where: 'Space above the staff', line: -0.5, f: 540, len: 0.16, gain: 0.8 },
    lb: { name: 'Low bongo', where: 'Top space', line: 0.5, f: 404, len: 0.19, gain: 0.85 },
    ht: { name: 'High tom', where: 'Second space', line: 1.5, f: 262, len: 0.27, gain: 0.95 },
    mt: { name: 'Middle tom', where: 'Third space', line: 2.5, f: 196, len: 0.31, gain: 1 },
    lt: { name: 'Low tom', where: 'Bottom space', line: 3.5, f: 147, len: 0.35, gain: 1 },
    hd: { name: 'High bass drum', where: 'Space below the staff', line: 4.5, f: 92, len: 0.44, gain: 1.15 }
  };
  var KIT = ['hb', 'lb', 'ht', 'mt', 'lt', 'hd'];
  var VOICE = { u: 'Upper', l: 'Lower', p: 'Alone' };

  function ev(u, d, drum, voice, more) {
    var e = { u: u, d: d, drum: drum, voice: voice, beams: 3, vel: 0.74 };
    for (var k in more) e[k] = more[k];
    return e;
  }

  // As written: one sixteenth alone, then five in the upper voice against two, three, two below
  var PICKUP = ev(0, 30, 'hb', 'p', { beams: 2, key: 'p0', vel: 0.82, label: 'high bongo' });
  var UPPER = [30, 48, 66, 84, 102].map(function (u, i) {
    return ev(u, 18, i % 2 ? 'ht' : 'lb', 'u', {
      beams: 2, key: 'u' + i, label: String(i + 1), accent: i === 0, vel: i === 0 ? 1 : 0.74
    });
  });
  var LOWER = [
    ev(30, 15, 'lt', 'l', { key: 'l0', label: '1' }),
    ev(45, 15, 'lt', 'l', { key: 'l1', label: '2', brk: 2 }),
    ev(60, 10, 'lt', 'l', { key: 'l2', label: '1', tup: 1 }),
    ev(70, 10, 'hd', 'l', { key: 'l3', label: '2', tup: 1 }),
    ev(80, 10, 'lt', 'l', { key: 'l4', label: '3', tup: 1, brk: 3 }),
    ev(90, 15, 'mt', 'l', { key: 'l5', label: '1' }),
    ev(105, 15, 'hd', 'l', { key: 'l6', label: '2' })
  ];
  // The frame: the lower voice reduced to the three sixteenths it outlines
  var PULSES = [
    ev(30, 30, 'lt', 'l', { key: 'l0', label: 'e', beams: 2 }),
    ev(60, 30, 'lt', 'l', { key: 'l2', label: '&', beams: 2 }),
    ev(90, 30, 'mt', 'l', { key: 'l5', label: 'a', beams: 2 })
  ];
  // The middle sixteenth with all five counts in the upper voice; only 2 and 5 are in the piece
  var MINI5 = [0, 1, 2, 3, 4].map(function (i) {
    var real = i === 1 || i === 4;
    return ev(60 + 6 * i, 6, i === 4 ? 'ht' : 'lb', 'u', {
      key: i === 1 ? 'u2' : i === 4 ? 'u3' : 'g' + i, label: String(i + 1), vel: real ? 0.95 : 0.34, soft: !real
    });
  });
  var TRIPLET = LOWER.slice(2, 5);

  var STEPS = [
    {
      id: 'whole', name: 'The whole beat', range: [0, 120], up: UPPER, low: LOWER, pickup: true, tupUp: '5:3',
      text: 'This is the beat as written: one sixteenth alone on the high bongo, then five in the upper voice against two, three, and two in the lower. Listen a few times before you play anything. The printed tempo is about quarter note = 40, so the whole beat lasts a second and a half.',
      cue: 'Find the three sixteenths after the high bongo: low tom, low tom, middle tom. They are the frame for everything else.'
    },
    {
      id: 'frame', name: 'Five against three', range: [30, 120], up: UPPER, low: PULSES, pickup: true, tupUp: '5:3',
      band: { fives: [0, 1, 2] },
      text: 'Strip the lower voice down to its three sixteenths and what is left is plain five against three. Count each sixteenth in five. The upper voice plays every third count: 1 and 4 of the first sixteenth, 2 and 5 of the second, 3 of the third.',
      cue: 'Loop it until the five is even and the three is steady. Nothing else on this page works until this does.'
    },
    {
      id: 'first', name: 'First sixteenth', range: [30, 60], up: UPPER, low: LOWER, pickup: true, tupUp: '5:3',
      band: { fives: [0] },
      text: 'Both voices start together. The lower voice plays its second note exactly halfway through, and the upper voice plays its second note on count 4, a hair later. Play it as a unison, then a flam with the low tom leading.',
      cue: 'The flam is tight: the two strokes are one tenth of the sixteenth apart.'
    },
    {
      id: 'second-all', name: 'Second sixteenth, all five', range: [60, 90], up: MINI5, low: TRIPLET, pickup: false, tupUp: '5',
      band: { fives: [1] },
      text: 'The middle sixteenth is five against three in miniature. Loop the triplet in the lower voice against a full five in the upper voice until both are even.',
      cue: 'The loud counts are 2 and 5. Those are the only two the upper voice keeps.'
    },
    {
      id: 'second', name: 'Second sixteenth, as written', range: [60, 90], up: UPPER, low: LOWER, pickup: true, tupUp: '5:3',
      band: { fives: [1] },
      text: 'Now drop counts 1, 3, and 4. The upper voice keeps only counts 2 and 5, the third and fourth notes of its five. The first lands a little past halfway between the first two triplet notes, and the second lands just after the last one.',
      cue: 'Keep the triplet even. The upper notes fit around it; the triplet does not bend to meet them.'
    },
    {
      id: 'third', name: 'Third sixteenth', range: [90, 120], up: UPPER, low: LOWER, pickup: true, tupUp: '5:3',
      band: { fives: [2] },
      text: 'The mirror image of the first. The lower voice plays the middle tom alone on the front, the upper voice plays its last note on count 3, and the lower voice answers a hair later: a flam with the low bongo leading, into the downbeat of beat 2.',
      cue: 'Same tight flam as the first sixteenth, with the hands trading places.'
    },
    {
      id: 'shortcut', name: 'The shortcut', range: [30, 120], up: UPPER, low: LOWER, pickup: true, tupUp: '5:3',
      band: { shortcut: true },
      text: 'Once the exact version is in your hands, this is how to think it at tempo: unison, flam, a sextuplet with a hole in it, single, flam. In the middle sixteenth the lower voice plays 1, 3, and 5 of the sextuplet, the upper voice plays 2 and 6, and 4 is silent.',
      cue: 'The true upper notes sit one unit inside the sextuplet, toward the middle. Lean them in; do not land them square.'
    },
    {
      id: 'line', name: 'One line', range: [0, 120], up: UPPER, low: LOWER, pickup: true, tupUp: '5:3', view: 'line',
      text: 'Put both voices on one line and the beat turns out to be a palindrome. After the high bongo, the gaps between strokes run 15, 3, 12, 6, 4, 10, 4, 6, 12, 3, 15: the second half is the first half backward.',
      cue: 'Switch the sound to one block and learn the line as a single rhythm. Then go back to step 1 and split it between the drums.'
    }
  ];
  var byId = {};
  STEPS.forEach(function (s, i) { s.n = i + 1; byId[s.id] = s; });

  function eventsOf(st) { return (st.pickup ? [PICKUP] : []).concat(st.up, st.low); }
  function inRange(e, st) { return e.u >= st.range[0] && e.u < st.range[1]; }

  // Strokes in order, with simultaneous ones merged and the wait until the next stroke
  function composite(list, end) {
    var out = [];
    list.slice().sort(function (a, b) { return a.u - b.u || (a.voice < b.voice ? 1 : -1); }).forEach(function (e) {
      var last = out[out.length - 1];
      if (last && last.u === e.u) last.evs.push(e); else out.push({ u: e.u, evs: [e] });
    });
    out.forEach(function (c, i) { c.d = (i + 1 < out.length ? out[i + 1].u : end) - c.u; });
    return out;
  }
  var WRITTEN = composite([PICKUP].concat(UPPER, LOWER), 120);

  /* ---------- Page elements ---------- */

  var app = root.querySelector('.po-app');
  var stage = root.querySelector('.po-stage');
  var stepsBox = root.querySelector('.po-steps');
  var countEl = root.querySelector('.po-count');
  var titleEl = root.querySelector('.po-title');
  var textEl = root.querySelector('.po-text');
  var cueEl = root.querySelector('.po-cue');
  var turnEl = root.querySelector('.po-turn');
  var nextBtn = root.querySelector('.po-next');
  var kitBox = root.querySelector('.po-kit');
  var tbody = root.querySelector('.po-table tbody');
  var unitOut = root.querySelector('.po-unit');
  var soundBox = root.querySelector('.po-sound');
  var upBox = document.getElementById('po-up');
  var lowBox = document.getElementById('po-low');
  var controls = document.querySelector('.po-controls');
  var nowEl = controls.querySelector('.po-now');
  var bpmInput = document.getElementById('po-bpm');
  var bpmOut = document.getElementById('po-bpm-out');
  var clickBox = document.getElementById('po-click');
  var tradeBox = document.getElementById('po-trade');
  var playBtns = document.querySelectorAll('.po-play');

  var step = STEPS[0];
  var sound = 'drums';
  var refs = {};          // event key -> { note: element, bubble: element }
  var grads = {};         // voice -> gradient stops
  var cursor = null;
  var rows = [];

  /* ---------- Drawing ---------- */

  var W = 1000, H = 574;
  var X0 = 84, SCALE = (964 - X0) / 120;
  var STAFF_TOP = 96, SP = 12;
  var UP_BEAM = 40, LOW_BEAM = 210, BEAM_H = 6, BEAM_STEP = 9.6;
  var UP_BASE = 392, LO_TOP = 428, MID = 410, LANE = 15 * SCALE;
  var PAINT = {
    u: { pale: '#E3EBF9', full: '#6E95D9', edge: '#22359A' },
    l: { pale: '#FCE7CF', full: '#F08A1C', edge: '#E1261C' },
    p: { pale: '#FCF3CC', full: '#F5C518', edge: '#8A4A22' }
  };

  function X(u) { return X0 + u * SCALE; }

  function S(name, attrs, parent, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (text !== undefined) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function f1(v) { return Math.round(v * 10) / 10; }
  function ref(key) { return refs[key] || (refs[key] = {}); }

  function drawVoice(g, list, dir, st) {
    var hw = 6.9;
    var beamY = dir > 0 ? UP_BEAM : LOW_BEAM;
    var sx = list.map(function (e) { return X(e.u) + dir * hw; });
    var dim = list.map(function (e) { return !inRange(e, st); });

    // beams first, so stems and heads sit on top
    var most = Math.max.apply(null, list.map(function (e) { return e.beams; }));
    for (var L = 1; L <= most; L++) {
      var top = dir > 0 ? UP_BEAM + (L - 1) * BEAM_STEP : LOW_BEAM - BEAM_H - (L - 1) * BEAM_STEP;
      for (var i = 0; i < list.length; i++) {
        if (list[i].beams < L) continue;
        var next = i + 1 < list.length && list[i + 1].beams >= L && !(list[i].brk && list[i].brk <= L);
        var prev = i > 0 && list[i - 1].beams >= L && !(list[i - 1].brk && list[i - 1].brk <= L);
        var a, b, faint;
        if (next) { a = sx[i]; b = sx[i + 1]; faint = dim[i] || dim[i + 1]; }
        else if (!prev) { a = i > 0 ? sx[i] - 10 : sx[i]; b = i > 0 ? sx[i] : sx[i] + 10; faint = dim[i]; }
        else continue;
        S('rect', { 'class': 'po-beam' + (faint ? ' dim' : ''), x: f1(a - 0.75), y: f1(top), width: f1(b - a + 1.5), height: BEAM_H }, g);
      }
    }

    list.forEach(function (e, i) {
      var x = X(e.u), y = STAFF_TOP + DRUMS[e.drum].line * SP;
      var n = S('g', { 'class': 'po-n po-v-' + e.voice + (dim[i] ? ' dim' : '') + (e.soft ? ' soft' : ''), 'data-key': e.key }, g);
      S('title', {}, n, DRUMS[e.drum].name);
      S('line', { 'class': 'po-stem', x1: f1(sx[i]), x2: f1(sx[i]), y1: f1(y - dir * 1.5), y2: beamY }, n);
      S('ellipse', { 'class': 'po-head', cx: f1(x), cy: y, rx: 7.4, ry: 5.3, transform: 'rotate(-20 ' + f1(x) + ' ' + y + ')' }, n);
      if (e.accent) S('path', { 'class': 'po-accent', d: 'M' + f1(x - 7) + ' 17 L' + f1(x + 7) + ' 22 L' + f1(x - 7) + ' 27' }, n);
      ref(e.key).note = n;
    });

    // tuplet numbers, in italics
    if (dir > 0 && st.tupUp) {
      S('text', { 'class': 'po-tup', x: f1((sx[0] + sx[sx.length - 1]) / 2), y: 31 }, g, st.tupUp);
    }
    if (dir < 0) {
      var trip = [];
      list.forEach(function (e, i) { if (e.tup) trip.push(sx[i]); });
      if (trip.length) S('text', { 'class': 'po-tup', x: f1((trip[0] + trip[trip.length - 1]) / 2), y: 230 }, g, '3');
    }
  }

  function shine(g, cx, cy, r) {
    if (r < 15) return;
    var rr = r * 0.7;
    var p1 = [cx + rr * Math.cos(3.52), cy + rr * Math.sin(3.52)];
    var p2 = [cx + rr * Math.cos(4.3), cy + rr * Math.sin(4.3)];
    S('path', {
      'class': 'po-shine', 'stroke-width': f1(Math.max(2.4, r * 0.075)),
      d: 'M' + f1(p1[0]) + ' ' + f1(p1[1]) + ' A' + f1(rr) + ' ' + f1(rr) + ' 0 0 1 ' + f1(p2[0]) + ' ' + f1(p2[1])
    }, g);
  }

  // One bubble: a circle as wide as the note is long, or a long bubble when it will not fit the lane
  function bubble(parent, e, lane, st, keys) {
    var wide = e.d * SCALE;
    var r = wide / 2;
    var cap = lane === 'up' ? 18 * SCALE : LANE;
    var long = wide > cap + 1;
    var cx = X(e.u) + r;
    var cy = lane === 'up' ? UP_BASE - r : lane === 'low' ? LO_TOP + (long ? cap / 2 : r) : MID;
    var voice = e.voice;
    var cls = 'po-b po-b-' + voice + (inRange(e, st) ? '' : ' dim') + (e.soft ? ' soft' : '');
    var g = S('g', { 'class': cls, 'data-key': (keys || [e.key]).join(' ') }, parent);
    S('title', {}, g, e.title || DRUMS[e.drum].name);
    var shape;
    if (long) {
      shape = { x: f1(X(e.u) + 1.5), y: f1(cy - cap / 2), width: f1(wide - 3), height: cap, rx: cap / 2 };
      S('rect', merge(shape, { 'class': 'po-ring', stroke: PAINT[voice].edge }), g);
      S('rect', merge(shape, { 'class': 'po-shape', fill: 'url(#po-grad-' + voice + ')', stroke: PAINT[voice].edge }), g);
      shine(g, X(e.u) + cap / 2, cy, cap / 2 - 1.5);
    } else if (e.both) {
      var rr = Math.max(r - 1.5, 2);
      S('circle', { 'class': 'po-ring', cx: f1(cx), cy: cy, r: f1(rr), stroke: '#17204A' }, g);
      S('path', { 'class': 'po-half', fill: 'url(#po-grad-u)', d: 'M' + f1(cx - rr) + ' ' + cy + ' A' + f1(rr) + ' ' + f1(rr) + ' 0 0 1 ' + f1(cx + rr) + ' ' + cy + ' Z' }, g);
      S('path', { 'class': 'po-half', fill: 'url(#po-grad-l)', d: 'M' + f1(cx - rr) + ' ' + cy + ' A' + f1(rr) + ' ' + f1(rr) + ' 0 0 0 ' + f1(cx + rr) + ' ' + cy + ' Z' }, g);
      S('circle', { 'class': 'po-shape', cx: f1(cx), cy: cy, r: f1(rr), fill: 'none', stroke: '#17204A' }, g);
      shine(g, cx, cy, rr);
    } else {
      var rad = Math.max(r - 1.5, 2);
      shape = { cx: f1(cx), cy: f1(cy), r: f1(rad) };
      S('circle', merge(shape, { 'class': 'po-ring', stroke: PAINT[voice].edge }), g);
      S('circle', merge(shape, { 'class': 'po-shape', fill: 'url(#po-grad-' + voice + ')', stroke: PAINT[voice].edge }), g);
      shine(g, cx, cy, rad);
    }
    if (e.label && (long || r >= 18)) {
      var size = long ? (e.label.length > 2 ? 21 : 30) : r >= 50 ? 30 : r >= 30 ? 24 : 17;
      S('text', { 'class': 'po-bl', x: f1(long ? X(e.u) + wide / 2 : cx), y: f1(cy + size * 0.35), 'font-size': size }, g, e.label);
    }
    (keys || [e.key]).forEach(function (k) { ref(k).bubble = g; });
    return g;
  }
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }

  function digit(g, u, label, state) {
    var d = S('g', { 'class': 'po-dig' + (state ? ' ' + state : '') }, g);
    S('circle', { cx: f1(X(u)), cy: MID, r: 11.5 }, d);
    S('text', { x: f1(X(u)), y: MID + 5 }, d, label);
  }

  function drawBand(g, st) {
    var a = st.view === 'line' ? 2 : 30;
    S('line', { 'class': 'po-surface', x1: f1(X(a)), x2: f1(X(120)), y1: MID, y2: MID }, g);
    if (!st.band) return;
    var ups = {}, lows = {};
    st.up.forEach(function (e) { if (!e.soft) ups[e.u] = 1; });
    st.low.forEach(function (e) { lows[e.u] = 1; });
    if (st.band.fives) {
      st.band.fives.forEach(function (k) {
        var start = 30 + 30 * k;
        st.low.forEach(function (e) {
          if (e.u > start && e.u < start + 30 && (e.u - start) % 6) S('circle', { 'class': 'po-dot', cx: f1(X(e.u)), cy: MID, r: 5 }, g);
        });
        for (var j = 0; j < 5; j++) {
          var u = start + 6 * j;
          digit(g, u, String(j + 1), ups[u] && lows[u] ? 'hit-both' : ups[u] ? 'hit-u' : lows[u] ? 'hit-l' : '');
        }
      });
    }
    if (st.band.shortcut) {
      for (var j = 0; j < 6; j++) digit(g, 60 + 5 * j, String(j + 1), j === 3 ? 'rest' : j % 2 ? 'hit-u' : 'hit-l');
      S('text', { 'class': 'po-tag', x: f1(X(46.5)), y: MID + 5 }, g, 'flam');
      S('text', { 'class': 'po-tag', x: f1(X(103.5)), y: MID + 5 }, g, 'flam');
    }
  }

  function render() {
    var st = step;
    refs = {};
    stage.textContent = '';
    var svg = S('svg', { 'class': 'po-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': st.name + ': notation above, and the same strokes as bubbles below, each as wide as its note is long.' }, stage);
    var defs = S('defs', {}, svg);
    ['u', 'l', 'p'].forEach(function (v) {
      var gr = S('linearGradient', { id: 'po-grad-' + v, gradientUnits: 'userSpaceOnUse', x1: X(0), x2: X(120), y1: 0, y2: 0 }, defs);
      grads[v] = [PAINT[v].pale, PAINT[v].full, PAINT[v].full, PAINT[v].pale].map(function (c) {
        return S('stop', { offset: 0, 'stop-color': c }, gr);
      });
    });

    // sixteenth guides and their counts
    var guides = S('g', { 'aria-hidden': 'true' }, svg);
    ['1', 'e', '&', 'a', '2'].forEach(function (c, i) {
      S('line', { 'class': 'po-guide', x1: f1(X(30 * i)), x2: f1(X(30 * i)), y1: 66, y2: 546 }, guides);
      S('text', { 'class': 'po-beat' + (i === 4 ? ' next' : ''), x: f1(X(30 * i)), y: 566 }, guides, c);
    });

    // notation
    var score = S('g', { 'class': 'po-score' }, svg);
    for (var i = 0; i < 5; i++) S('line', { 'class': 'po-staff', x1: 24, x2: 976, y1: STAFF_TOP + SP * i, y2: STAFF_TOP + SP * i }, score);
    S('line', { 'class': 'po-bar', x1: 24, x2: 24, y1: STAFF_TOP, y2: STAFF_TOP + SP * 4 }, score);
    S('rect', { 'class': 'po-clef', x: 35, y: STAFF_TOP + SP, width: 4.6, height: SP * 2 }, score);
    S('rect', { 'class': 'po-clef', x: 44, y: STAFF_TOP + SP, width: 4.6, height: SP * 2 }, score);
    S('text', { 'class': 'po-mnum', x: 30, y: 82 }, score, '21');
    drawVoice(score, (st.pickup ? [PICKUP] : []).concat(st.low), -1, st);
    drawVoice(score, st.up, 1, st);

    // bubbles
    var lanes = S('g', { 'class': 'po-lanes' }, svg);
    drawBand(lanes, st);
    if (st.view === 'line') {
      S('line', { 'class': 'po-mirror', x1: f1(X(75)), x2: f1(X(75)), y1: 300, y2: 472 }, lanes);
      S('text', { 'class': 'po-mirror-text', x: f1(X(75)), y: 290 }, lanes, 'mirror');
      WRITTEN.forEach(function (c) {
        var first = c.evs[0];
        var e = ev(c.u, c.d, first.drum, c.evs.length > 1 ? 'u' : first.voice, {
          both: c.evs.length > 1, label: first.voice === 'p' ? first.label : '',
          title: c.evs.map(function (x) { return DRUMS[x.drum].name; }).join(' and ')
        });
        bubble(lanes, e, 'mid', st, c.evs.map(function (x) { return x.key; }));
        if (first.voice !== 'p') S('text', { 'class': 'po-gap', x: f1(X(c.u) + c.d * SCALE / 2), y: 492 }, lanes, String(c.d));
      });
    } else {
      if (st.pickup) bubble(lanes, PICKUP, 'mid', st);
      st.up.forEach(function (e) { bubble(lanes, e, 'up', st); });
      st.low.forEach(function (e) { bubble(lanes, e, 'low', st); });
    }

    // playhead
    cursor = S('g', { 'class': 'po-cursor', 'aria-hidden': 'true' }, svg);
    S('line', { x1: 0, x2: 0, y1: 58, y2: 546 }, cursor);
    S('path', { d: 'M-7 48 L7 48 L0 60 Z' }, cursor);
    cursor.style.display = 'none';

    sweep(st.range[1]);
    describe();
  }

  // Everything the playhead has passed is in full color; the rest waits in a pale wash
  function sweep(u) {
    var a = step.range[0] / 120, p = Math.max(a, Math.min(1, u / 120));
    for (var v in grads) {
      grads[v][0].setAttribute('offset', a);
      grads[v][1].setAttribute('offset', a);
      grads[v][2].setAttribute('offset', p);
      grads[v][3].setAttribute('offset', p);
    }
  }

  function describe() {
    var st = step;
    countEl.textContent = 'Step ' + st.n + ' of ' + STEPS.length;
    titleEl.textContent = st.name;
    textEl.textContent = st.text;
    cueEl.textContent = '';
    var b = document.createElement('b');
    b.textContent = 'Listen for: ';
    cueEl.appendChild(b);
    cueEl.appendChild(document.createTextNode(st.cue));
    nowEl.textContent = st.name;
    nextBtn.textContent = st.n === STEPS.length ? 'Back to step 1' : 'Next step';
    stepsBox.querySelectorAll('button').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-step') === st.id ? 'true' : 'false');
    });
  }

  function setStep(st, keepHash) {
    var was = !!play;
    stop();
    step = st;
    render();
    if (!keepHash) {
      try { history.replaceState(null, '', '#' + st.id); } catch (e) { /* the address is a convenience */ }
    }
    if (was) start();
  }

  /* ---------- Steps, drums and the table ---------- */

  STEPS.forEach(function (st) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'po-step';
    b.setAttribute('data-step', st.id);
    b.setAttribute('aria-pressed', 'false');
    var n = document.createElement('span');
    n.className = 'po-num';
    n.textContent = st.n;
    b.appendChild(n);
    b.appendChild(document.createTextNode(st.name));
    stepsBox.appendChild(b);
  });
  stepsBox.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-step]');
    if (b) setStep(byId[b.getAttribute('data-step')]);
  });
  nextBtn.addEventListener('click', function () { setStep(STEPS[step.n % STEPS.length]); });

  KIT.forEach(function (k) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-drum', k);
    b.textContent = DRUMS[k].name;
    var s = document.createElement('small');
    s.textContent = DRUMS[k].where;
    b.appendChild(s);
    li.appendChild(b);
    kitBox.appendChild(li);
  });
  kitBox.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-drum]');
    if (!b || !AC) return;
    audio();
    drum(ctx.currentTime + 0.01, DRUMS[b.getAttribute('data-drum')], 0.9, 0);
  });

  function ms(units) {
    var v = Math.round(units * 500 / tempo() * 10) / 10;
    return (v % 1 ? v.toFixed(1) : String(v)) + ' ms';
  }
  function cell(tr, text, cls, tag) {
    var c = document.createElement(tag || 'td');
    if (cls) c.className = cls;
    c.textContent = text;
    tr.appendChild(c);
    return c;
  }
  function buildTable() {
    tbody.textContent = '';
    rows = WRITTEN.map(function (c) {
      var tr = document.createElement('tr');
      var first = c.evs[0];
      var v = cell(tr, '', 'po-voice', 'th');
      v.setAttribute('scope', 'row');
      var sw = document.createElement('span');
      sw.className = 'po-swatch ' + (c.evs.length > 1 ? 'both' : first.voice);
      v.appendChild(sw);
      v.appendChild(document.createTextNode(c.evs.length > 1 ? 'Both' : VOICE[first.voice]));
      cell(tr, c.evs.map(function (x, i) { var n = DRUMS[x.drum].name; return i ? n.toLowerCase() : n; }).join(' and '));
      cell(tr, c.u < 30 ? '−30' : String(c.u - 30), 'num');
      var row = { c: c, tr: tr, at: cell(tr, '', 'num'), wait: cell(tr, '', 'num') };
      var units = document.createElement('span');
      units.className = 'detail';
      units.textContent = c.d + ' units';
      row.waitText = document.createTextNode('');
      row.wait.appendChild(row.waitText);
      row.wait.appendChild(units);
      tbody.appendChild(tr);
      return row;
    });
    var end = document.createElement('tr');
    end.className = 'po-end';
    var h = cell(end, 'Beat 2', '', 'th');
    h.setAttribute('scope', 'row');
    cell(end, 'The downbeat the last flam leads to');
    cell(end, '90', 'num');
    rows.end = cell(end, '', 'num');
    cell(end, '');
    tbody.appendChild(end);
    times();
  }
  function times() {
    rows.forEach(function (r) {
      r.at.textContent = ms(r.c.u);
      r.waitText.nodeValue = ms(r.c.d);
    });
    rows.end.textContent = ms(120);
    unitOut.textContent = ms(1);
  }

  /* ---------- Sound ---------- */

  var ctx, master, noiseBuf;

  function tempo() { return parseInt(bpmInput.value, 10) || 40; }
  function secPerUnit() { return 0.5 / tempo(); }   // a quarter note is 120 units

  function audio() {
    if (!ctx) {
      ctx = new AC();
      master = ctx.createDynamicsCompressor();
      master.connect(ctx.destination);
      var len = Math.floor(ctx.sampleRate * 0.5);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var ch = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function out(pan) {
    var g = ctx.createGain();
    if (ctx.createStereoPanner && pan) {
      var p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      p.connect(master);
    } else {
      g.connect(master);
    }
    return g;
  }

  function tone(dest, t, type, f0, f1hz, glide, peak, ring) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1hz !== f0) o.frequency.exponentialRampToValueAtTime(f1hz, t + glide);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + ring + 0.05);
  }

  // A drum: the head (a pitch that settles), a little body above it, and the stick
  function drum(t, d, vel, pan) {
    var dest = out(pan);
    var v = vel * d.gain;
    tone(dest, t, 'sine', d.f * 1.7, d.f, 0.035, 0.85 * v, d.len);
    tone(dest, t, 'triangle', d.f * 2.4, d.f * 1.52, 0.03, 0.3 * v, d.len * 0.45);
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(5200, Math.max(900, d.f * 7));
    bp.Q.value = 0.9;
    var ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.5 * vel, t + 0.002);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    src.connect(bp);
    bp.connect(ng);
    ng.connect(dest);
    src.start(t, Math.random() * 0.3);
    src.stop(t + 0.06);
  }

  // A wood block, for hearing the rhythm without the drums
  function block(t, f, vel, pan) {
    var dest = out(pan);
    tone(dest, t, 'sine', f, f, 0, 0.7 * vel, 0.075);
    tone(dest, t, 'sine', f * 2.76, f * 2.76, 0, 0.22 * vel, 0.04);
  }

  function click(t, strong) {
    tone(master, t, 'sine', strong ? 2093 : 1568, strong ? 2093 : 1568, 0, strong ? 0.16 : 0.1, 0.04);
  }

  function strike(t, e) {
    var pan = e.voice === 'u' ? 0.32 : e.voice === 'l' ? -0.32 : 0;
    if (sound === 'drums') drum(t, DRUMS[e.drum], e.vel, pan);
    else if (sound === 'one') block(t, 880, e.vel, 0);
    else block(t, e.voice === 'u' ? 1175 : e.voice === 'l' ? 784 : 1568, e.vel, pan);
  }

  function voiceOn(e) { return e.voice === 'u' ? upBox.checked : e.voice === 'l' ? lowBox.checked : true; }

  /* ---------- Playback ---------- */

  var play = null;

  function start() {
    if (!AC) return;
    audio();
    stop();
    var st = step, a = st.range[0], period = st.range[1] - a, items = [], c;
    eventsOf(st).forEach(function (e) { if (inRange(e, st)) items.push({ o: e.u - a, e: e }); });
    for (c = 0; c < period; c += 30) items.push({ o: c, click: true, strong: c === 0 });
    items.sort(function (x, y) { return x.o - y.o || (x.click ? -1 : 1); });
    var keys = {};
    items.forEach(function (it) { if (it.e) keys[it.e.key] = 1; });
    var lead = clickBox.checked ? 120 : 10;          // one beat of sixteenths to count in
    play = {
      st: st, a: a, period: period, items: items, keys: keys, idx: 0, pass: 0,
      anchorT: ctx.currentTime + 0.07, anchorS: -lead, spu: secPerUnit(), on: {}, row: null, turn: null,
      // on a narrow screen the stage scrolls sideways, so it follows the playhead
      follow: stage.scrollWidth > stage.clientWidth + 4, wide: stage.scrollWidth
    };
    if (clickBox.checked) for (c = 0; c < 4; c++) click(play.anchorT + c * 30 * play.spu, c === 0);
    playBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'true'); b.querySelector('span').textContent = 'Stop'; });
    app.classList.add('is-playing');
    sweep(a);
    tick();
    play.timer = setInterval(tick, 25);
    play.raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (!play) return;
    var p = play;
    play = null;
    clearInterval(p.timer);
    cancelAnimationFrame(p.raf);
    playBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); b.querySelector('span').textContent = 'Play'; });
    app.classList.remove('is-playing');
    stage.querySelectorAll('.on').forEach(function (n) { n.classList.remove('on'); });
    rows.forEach(function (r) { r.tr.classList.remove('on'); });
    if (cursor) cursor.style.display = 'none';
    turnEl.textContent = '';
    sweep(step.range[1]);
  }

  // Schedule every stroke and click that falls in the next moment
  function tick() {
    var p = play;
    if (!p) return;
    for (;;) {
      var it = p.items[p.idx];
      var t = p.anchorT + (p.pass * p.period + it.o - p.anchorS) * p.spu;
      if (t > ctx.currentTime + 0.14) break;
      t = Math.max(t, ctx.currentTime);
      if (it.click) { if (clickBox.checked) click(t, it.strong); }
      else if (voiceOn(it.e) && !(tradeBox.checked && p.pass % 2)) strike(t, it.e);
      if (++p.idx >= p.items.length) { p.idx = 0; p.pass++; }
    }
  }

  // A tempo change takes hold from where the playhead is now
  function retime() {
    var p = play;
    if (!p) return;
    var now = ctx.currentTime;
    p.anchorS += (now - p.anchorT) / p.spu;
    p.anchorT = now;
    p.spu = secPerUnit();
  }

  function pop(el) {
    if (!el || reduceMotion) return;
    el.classList.remove('pop');
    void el.getBoundingClientRect();
    el.classList.add('pop');
  }

  function frame() {
    var p = play;
    if (!p) return;
    var late = ctx.outputLatency || ctx.baseLatency || 0;
    var pos = p.anchorS + (ctx.currentTime - late - p.anchorT) / p.spu;
    if (pos >= 0) {
      var pass = Math.floor(pos / p.period);
      var u = p.a + pos - pass * p.period;
      cursor.style.display = '';
      cursor.setAttribute('transform', 'translate(' + f1(X(u)) + ' 0)');
      sweep(u);
      if (p.follow) stage.scrollLeft = Math.max(0, X(u) / W * p.wide - stage.clientWidth * 0.4);

      var yours = tradeBox.checked && pass % 2 === 1;
      var turn = tradeBox.checked ? (yours ? 'Your turn' : 'Listen') : '';
      if (turn !== p.turn) { p.turn = turn; turnEl.textContent = turn; turnEl.classList.toggle('yours', yours); }

      // which stroke each voice is on
      ['p', 'u', 'l'].forEach(function (v) {
        var list = v === 'p' ? (p.st.pickup ? [PICKUP] : []) : v === 'u' ? p.st.up : p.st.low;
        var cur = null;
        for (var i = 0; i < list.length; i++) {
          if (inRange(list[i], p.st) && list[i].u <= u && u < list[i].u + list[i].d) cur = list[i];
        }
        var id = cur ? pass + ':' + cur.key : '';
        if (p.on[v] === id) return;
        p.on[v] = id;
        stage.querySelectorAll('.po-v-' + v + '.on').forEach(function (n) { n.classList.remove('on'); });
        if (!cur || !voiceOn(cur)) return;
        var r = refs[cur.key] || {};
        if (r.note) r.note.classList.add('on');
        pop(r.bubble);
      });

      var row = null;
      rows.forEach(function (r) {
        if (r.c.u <= u && u < r.c.u + r.c.d && r.c.evs.some(function (e) { return p.keys[e.key] && voiceOn(e); })) row = r;
      });
      if (row !== p.row) {
        if (p.row) p.row.tr.classList.remove('on');
        if (row) row.tr.classList.add('on');
        p.row = row;
      }
    }
    p.raf = requestAnimationFrame(frame);
  }

  function toggle() { if (play) stop(); else start(); }

  /* ---------- Controls ---------- */

  playBtns.forEach(function (b) { b.addEventListener('click', toggle); });

  try {
    var saved = parseInt(localStorage.getItem('polyrhythmTempo'), 10);
    if (saved >= 8 && saved <= 60) bpmInput.value = saved;
  } catch (e) { /* storage is optional */ }
  bpmOut.textContent = bpmInput.value;
  bpmInput.addEventListener('input', function () {
    bpmOut.textContent = bpmInput.value;
    retime();
    times();
    try { localStorage.setItem('polyrhythmTempo', bpmInput.value); } catch (e) { /* optional */ }
  });

  function mutes() {
    app.classList.toggle('mute-u', !upBox.checked);
    app.classList.toggle('mute-l', !lowBox.checked);
  }
  upBox.addEventListener('change', mutes);
  lowBox.addEventListener('change', mutes);

  soundBox.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-sound]');
    if (!b) return;
    sound = b.getAttribute('data-sound');
    soundBox.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
  });

  // Tap a bubble or a note to hear that stroke
  stage.addEventListener('click', function (e) {
    var g = e.target.closest('[data-key]');
    if (!g || !AC) return;
    audio();
    var keys = g.getAttribute('data-key').split(' ');
    eventsOf(step).forEach(function (x) {
      if (keys.indexOf(x.key) !== -1) strike(ctx.currentTime + 0.01, x);
    });
    pop(refs[keys[0]] && refs[keys[0]].bubble);
  });

  document.addEventListener('keydown', function (e) {
    if (e.code !== 'Space' || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^(INPUT|BUTTON|SELECT|TEXTAREA|A|SUMMARY)$/.test(e.target.tagName)) return;
    if (!AC) return;
    e.preventDefault();
    toggle();
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
  window.addEventListener('hashchange', function () {
    var st = byId[location.hash.slice(1)];
    if (st && st !== step) setStep(st, true);
  });

  if (!AC) {
    playBtns.forEach(function (b) { b.hidden = true; });
    controls.querySelectorAll('.rud-tempo, .rud-opt').forEach(function (x) { x.hidden = true; });
  }
  buildTable();
  mutes();
  step = byId[location.hash.slice(1)] || STEPS[0];
  render();
  controls.hidden = false;
  app.hidden = false;
})();
