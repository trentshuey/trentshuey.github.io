/* Polyrhythm Lab (polyrhythm-lab.html)
 * Any polyrhythm from 2 to 16, in two to four layers, with notes that can be split or rested.
 * Draws each layer as notation and as bubbles (each bubble as wide as its note is long), plays
 * it with the Web Audio API, and works the math out loud: the common ruler, where every note
 * falls, the composite, the clock times, how to count it, and how to write it.
 *
 * A cycle is one pass through every layer. Positions are fractions of the cycle; when the
 * numbers allow, they are also counted in whole "marks" of the lowest common multiple.
 */
(function () {
  'use strict';
  var root = document.getElementById('lab');
  if (!root) return;

  var AC = window.AudioContext || window.webkitAudioContext;
  var NS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var MAXN = 16, MAXLAYERS = 4;
  var WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen'];
  var VALUES = { '-2': 'whole', '-1': 'half', '0': 'quarter', '1': 'eighth', '2': 'sixteenth', '3': 'thirty-second', '4': 'sixty-fourth' };
  // One paint and one drum per layer
  var PAINT = [
    { name: 'Blue', pale: '#E3EBF9', full: '#6E95D9', edge: '#22359A', f: 404, len: 0.19, gain: 0.85, block: 1175, pan: 0.3 },
    { name: 'Orange', pale: '#FCE7CF', full: '#F08A1C', edge: '#E1261C', f: 147, len: 0.35, gain: 1, block: 784, pan: -0.3 },
    { name: 'Green', pale: '#E2F2D9', full: '#5DAE34', edge: '#2F6B14', f: 262, len: 0.27, gain: 0.95, block: 1568, pan: 0.12 },
    { name: 'Yellow', pale: '#FCF3CC', full: '#F5C518', edge: '#8A4A22', f: 92, len: 0.44, gain: 1.15, block: 587, pan: -0.12 }
  ];
  var PRESETS = [
    { name: '3 : 2', note: 'Nice cup of tea', ns: [3, 2] },
    { name: '4 : 3', note: 'Pass the golden butter', ns: [4, 3] },
    { name: '5 : 4', note: 'Five across a bar of four', ns: [5, 4] },
    { name: '5 : 3', note: 'The frame of the Xenakis beat', ns: [5, 3] },
    { name: '7 : 4', note: 'Seven across a bar of four', ns: [7, 4] },
    { name: '3 : 4 : 5', note: 'Three layers, sixty marks', ns: [3, 4, 5], beat: 1 },
    { name: '4 : 5 : 6', note: 'Sped up, a major chord', ns: [4, 5, 6], beat: 0 },
    { name: 'Xenakis', note: 'Rebonds a, measure 21', ns: [5, 3], splits: { 1: [2, 3, 2] } }
  ];

  /* ---------- Numbers ---------- */

  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }
  function pow2(k) { return (k & (k - 1)) === 0; }
  function log2floor(v) { return Math.floor(Math.log(v) / Math.LN2 + 1e-9); }
  function trim(v, places) { var s = v.toFixed(places); return s.indexOf('.') === -1 ? s : s.replace(/0+$/, '').replace(/\.$/, ''); }
  function ord(n) { var t = n % 100; return n + (t > 10 && t < 14 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][n % 10]); }
  function listing(items) {
    if (items.length < 2) return items.join('');
    if (items.length === 2) return items[0] + ' and ' + items[1];
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function secs(v, places) { var t = trim(v, places); return t + (t === '1' ? ' second' : ' seconds'); }

  // How n even notes are written when the cycle is p quarter-note beats: the note value
  // (0 = quarter, 1 = eighth, -1 = half) and the m in "n in the time of m"
  function written(n, p) {
    var k = Math.max(-2, Math.min(3, log2floor(n / p)));
    while (k < 0 && (p * Math.pow(2, k)) % 1) k++;
    return { e: k, m: p * Math.pow(2, k) };
  }

  /* ---------- The rhythm ---------- */

  function fresh(n) { var a = []; for (var i = 0; i < n; i++) a.push({ k: 1, rest: [false] }); return a; }
  function layer(n, c) { return { n: n, c: c, on: true, notes: fresh(n) }; }

  var layers = [layer(3, 0), layer(2, 1)];
  var beat = 1;             // which layer keeps the tempo
  var model = null;
  var tap = 'hear';
  var sound = 'drums';

  function edited(ly) { return ly.notes.some(function (nt) { return nt.k > 1 || nt.rest[0]; }); }
  function anyEdited() { return layers.some(edited); }

  function compute() {
    var L = 1, exact = true;
    layers.forEach(function (ly) {
      ly.notes.forEach(function (nt) { if (exact) { L = lcm(L, ly.n * nt.k); if (L > 1e9) exact = false; } });
    });
    var evs = [];
    layers.forEach(function (ly, li) {
      ly.notes.forEach(function (nt, i) {
        for (var j = 0; j < nt.k; j++) {
          evs.push({
            li: li, i: i, j: j, k: nt.k, pos: (i + j / nt.k) / ly.n, len: 1 / (ly.n * nt.k), rest: !!nt.rest[j],
            u: exact ? L / (ly.n * nt.k) * (i * nt.k + j) : null, key: li + '-' + i + '-' + j,
            vel: i === 0 && j === 0 ? 1 : j === 0 ? 0.78 : 0.6
          });
        }
      });
    });
    var comp = [];
    evs.filter(function (e) { return !e.rest; }).sort(function (a, b) { return a.pos - b.pos || a.li - b.li; }).forEach(function (e) {
      var last = comp[comp.length - 1];
      if (last && Math.abs(last.pos - e.pos) < 1e-9) last.evs.push(e); else comp.push({ pos: e.pos, u: e.u, evs: [e] });
    });
    comp.forEach(function (c, i) { c.len = (i + 1 < comp.length ? comp[i + 1].pos : 1 + comp[0].pos) - c.pos; });
    model = { L: L, exact: exact, evs: evs, comp: comp };
  }

  // The finest split a note can take and still be printed and told apart
  function maxSplit(ly) {
    var e = written(ly.n, layers[beat].n).e, k = Math.min(7, Math.floor(SPAN / (ly.n * 13)));
    while (k > 1 && e + log2floor(k) > 4) k--;
    return Math.max(1, k);
  }

  /* ---------- Page elements ---------- */

  var app = root.querySelector('.lab-app');
  var stage = root.querySelector('.lab-stage');
  var layersBox = root.querySelector('.lab-layers');
  var titleEl = root.querySelector('.lab-title');
  var factsEl = root.querySelector('.lab-facts');
  var statusEl = root.querySelector('.lab-status');
  var mathBox = root.querySelector('.lab-math');
  var tapBox = root.querySelector('.lab-tap');
  var soundBox = root.querySelector('.lab-sound');
  var presetBox = document.querySelector('.lab-presets');
  var atlasBox = document.querySelector('.lab-atlas');
  var atlasCount = document.querySelector('.lab-atlas-count');
  var controls = document.querySelector('.lab-controls');
  var nowEl = controls.querySelector('.lab-now');
  var bpmInput = document.getElementById('lab-bpm');
  var bpmOut = document.getElementById('lab-bpm-out');
  var countBox = document.getElementById('lab-countin');
  var tickBox = document.getElementById('lab-ticks');
  var tradeBox = document.getElementById('lab-trade');
  var playBtns = document.querySelectorAll('.lab-play');

  /* ---------- Drawing ---------- */

  var W = 1000, X0 = 74, X1 = 968, SPAN = X1 - X0, RX = 6.4;
  var refs = {}, grads = [], cursor = null;

  function X(pos) { return X0 + pos * SPAN; }
  function S(name, attrs, parent, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (text !== undefined) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function E(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function f1(v) { return Math.round(v * 10) / 10; }
  function ref(key) { return refs[key] || (refs[key] = {}); }
  function key(li, i, j) { return li + '-' + i + '-' + j; }

  /* Notation, one line per layer */

  function noteGlyph(g, x, lineY, top, e, k, rx) {
    var n = S('g', { 'class': 'lab-note', 'data-key': k }, g);
    if (e > -2) S('line', { 'class': 'po-stem', x1: f1(x + rx - 0.5), x2: f1(x + rx - 0.5), y1: lineY - 1.5, y2: top }, n);
    S('ellipse', {
      'class': 'po-head' + (e < 0 ? ' open' : ''), cx: f1(x), cy: lineY, rx: f1(e <= -2 ? rx * 1.15 : rx), ry: f1(rx * 0.72),
      transform: 'rotate(-20 ' + f1(x) + ' ' + lineY + ')'
    }, n);
    ref(k).note = n;
    return n;
  }
  function flags(n, sx, top, count) {
    for (var h = 0; h < count; h++) S('path', { 'class': 'lab-flag', d: 'M' + f1(sx) + ' ' + (top + 7 * h) + ' q8 6 6.5 17' }, n);
  }
  function beams(g, a, b, top, count) {
    for (var h = 0; h < count; h++) S('rect', { 'class': 'po-beam', x: f1(a - 0.75), y: top + 8 * h, width: f1(b - a + 1.5), height: 5 }, g);
  }
  function label(g, x, y, text) { S('text', { 'class': 'po-tup lab-tup', x: f1(x), y: y }, g, text); }
  function bracket(g, x1, x2, y, text) {
    var mid = (x1 + x2) / 2, half = text.length * 4.6 + 5;
    if (x2 - x1 > half * 2 + 8) {
      S('path', { 'class': 'lab-bracket', d: 'M' + f1(x1) + ' ' + (y + 6) + ' V' + y + ' H' + f1(mid - half) + ' M' + f1(mid + half) + ' ' + y + ' H' + f1(x2) + ' V' + (y + 6) }, g);
    }
    label(g, mid, y + 5, text);
  }
  function restGlyph(g, x, lineY, e) {
    var r = S('g', { 'class': 'lab-rest' }, g);
    if (e <= -2) S('rect', { x: f1(x - 6.5), y: lineY, width: 13, height: 5.5 }, r);
    else if (e === -1) S('rect', { x: f1(x - 6.5), y: lineY - 5.5, width: 13, height: 5.5 }, r);
    else if (e === 0) {
      S('path', { 'class': 'stroke', d: 'M' + f1(x - 3.5) + ' ' + (lineY - 13) + ' L' + f1(x + 3) + ' ' + (lineY - 5.5) + ' L' + f1(x - 3) + ' ' + (lineY + 1.5) + ' L' + f1(x + 3.5) + ' ' + (lineY + 8) + ' C' + f1(x - 3) + ' ' + (lineY + 6) + ' ' + f1(x - 6) + ' ' + (lineY + 10) + ' ' + f1(x - 1) + ' ' + (lineY + 14) }, r);
    } else {
      var hooks = Math.min(e, 4), y0 = lineY - 9 - (hooks - 1) * 3.5;
      for (var h = 0; h < hooks; h++) {
        var hx = x + 1.5 - h * 2.2, hy = y0 + h * 7;
        S('circle', { cx: f1(hx - 2.4), cy: f1(hy), r: 2.5 }, r);
        S('path', { 'class': 'stroke', d: 'M' + f1(hx - 1.6) + ' ' + f1(hy + 2.2) + ' q4 1.6 6.6 -2.8' }, r);
      }
      S('path', { 'class': 'stroke', d: 'M' + f1(x + 6.5) + ' ' + f1(y0 - 0.6) + ' l' + f1(-5.2 - (hooks - 1) * 2.2) + ' ' + f1(17 + (hooks - 1) * 7) }, r);
    }
  }

  // Stem length a layer needs for its busiest beam
  function stemFor(ly) {
    var e = written(ly.n, layers[beat].n).e, most = Math.max(e, 0);
    ly.notes.forEach(function (nt) { if (nt.k > 1) most = Math.max(most, e + log2floor(nt.k)); });
    return 30 + 8 * Math.max(0, most - 1);
  }

  function drawScore(g, ly, li, lineY, stemLen) {
    var p = layers[beat].n, n = ly.n, wr = written(n, p), e = wr.e, top = lineY - stemLen;
    var ratio = n !== wr.m ? n + ':' + wr.m : '';
    var px = function (i) { return X(i / n); };
    var sx = function (x, rx) { return x + (rx || RX) - 0.5; };
    var i;
    if (!edited(ly)) {
      for (i = 0; i < n; i++) noteGlyph(g, px(i), lineY, top, e, key(li, i, 0), RX);
      if (e >= 1) {
        var q = n % p === 0 ? n / p : 0;
        if (q > 1) {
          for (i = 0; i < n; i += q) {
            beams(g, sx(px(i)), sx(px(i + q - 1)), top, e);
            if (!pow2(q)) label(g, (sx(px(i)) + sx(px(i + q - 1))) / 2, top - 6, String(q));
          }
        } else {
          beams(g, sx(px(0)), sx(px(n - 1)), top, e);
          if (ratio) label(g, (sx(px(0)) + sx(px(n - 1))) / 2, top - 6, ratio);
        }
      } else if (ratio) bracket(g, px(0) - 7, px(n - 1) + 13, top - 10, ratio);
      return;
    }
    ly.notes.forEach(function (nt, i) {
      var x = px(i), ng;
      if (nt.k === 1) {
        if (nt.rest[0]) restGlyph(g, x, lineY, e);
        else { ng = noteGlyph(g, x, lineY, top, e, key(li, i, 0), RX); if (e >= 1) flags(ng, sx(x), top, e); }
        return;
      }
      var e2 = e + log2floor(nt.k), step = SPAN / (n * nt.k), rx = Math.min(RX, step * 0.46), xs = [];
      for (var j = 0; j < nt.k; j++) xs.push(x + j * step);
      var all = nt.rest.every(function (r) { return !r; });
      if (all && e2 >= 1) {
        xs.forEach(function (xx, j) { noteGlyph(g, xx, lineY, top, e2, key(li, i, j), rx); });
        beams(g, sx(xs[0], rx), sx(xs[xs.length - 1], rx), top, e2);
        if (!pow2(nt.k)) label(g, (sx(xs[0], rx) + sx(xs[xs.length - 1], rx)) / 2, top - 6, String(nt.k));
      } else {
        xs.forEach(function (xx, j) {
          if (nt.rest[j]) { restGlyph(g, xx, lineY, e2); return; }
          var sg = noteGlyph(g, xx, lineY, top, e2, key(li, i, j), rx);
          if (e2 >= 1) flags(sg, sx(xx, rx), top, e2);
        });
        if (!pow2(nt.k)) bracket(g, xs[0] - 6, xs[xs.length - 1] + 11, top - 10, String(nt.k));
      }
    });
    if (ratio) bracket(g, px(0) - 7, px(n - 1) + 13, top - 27, ratio);
  }

  /* Bubbles */

  function shine(g, cx, cy, r) {
    if (r < 13) return;
    var rr = r * 0.7;
    S('path', {
      'class': 'po-shine', 'stroke-width': f1(Math.max(2.2, r * 0.075)),
      d: 'M' + f1(cx + rr * Math.cos(3.52)) + ' ' + f1(cy + rr * Math.sin(3.52)) + ' A' + f1(rr) + ' ' + f1(rr) + ' 0 0 1 ' + f1(cx + rr * Math.cos(4.3)) + ' ' + f1(cy + rr * Math.sin(4.3))
    }, g);
  }

  // A bubble as wide as its note is long: a circle, or a long bubble when it is wider than the lane
  function bubble(parent, pos, len, top, LH, colors, o) {
    var wide = len * SPAN, long = wide > LH + 1, r = Math.max(wide / 2 - 1.5, 1.4);
    var cx = X(pos) + wide / 2, cy = top + LH / 2;
    var g = S('g', { 'class': 'po-b lab-b' + (o.rest ? ' rest' : '') + (o.comp ? ' lab-comp' : ''), 'data-key': o.keys.join(' ') }, parent);
    S('title', {}, g, o.title);
    var shape = long ? { x: f1(X(pos) + 1.5), y: top, width: f1(wide - 3), height: LH, rx: LH / 2 } : { cx: f1(cx), cy: cy, r: f1(r) };
    var tag = long ? 'rect' : 'circle';
    var edge = colors.length > 1 ? '#17204A' : PAINT[colors[0]].edge;
    function add(more) { var a = {}, k; for (k in shape) a[k] = shape[k]; for (k in more) a[k] = more[k]; return S(tag, a, g); }
    if (o.rest) {
      add({ 'class': 'po-shape', fill: 'transparent', stroke: edge });
      return g;
    }
    add({ 'class': 'po-ring', stroke: edge });
    if (colors.length === 1) {
      add({ 'class': 'po-shape', fill: 'url(#lab-grad-' + colors[0] + ')', stroke: edge });
    } else {
      // layers that land together share the bubble in stripes
      var id = 'lab-clip-' + (bubble.n = (bubble.n || 0) + 1);
      var cp = S('clipPath', { id: id }, g);
      var a = {}, k2; for (k2 in shape) a[k2] = shape[k2];
      S(tag, a, cp);
      var band = S('g', { 'clip-path': 'url(#' + id + ')' }, g);
      var h = (long ? LH : r * 2) / colors.length, y0 = long ? top : cy - r;
      colors.forEach(function (c, idx) {
        S('rect', { x: f1(X(pos)), y: f1(y0 + idx * h), width: f1(wide), height: f1(h + 0.5), fill: 'url(#lab-grad-' + c + ')' }, band);
      });
      add({ 'class': 'po-shape', fill: 'none', stroke: edge });
    }
    shine(g, long ? X(pos) + LH / 2 : cx, cy, long ? LH / 2 - 1.5 : r);
    if (o.label && (long || r >= 8.5)) {
      var size = long || r >= 40 ? 26 : r >= 26 ? 21 : r >= 16 ? 15 : 11;
      S('text', { 'class': 'po-bl', x: f1(cx), y: f1(cy + size * 0.35), 'font-size': size }, g, o.label);
    }
    return g;
  }

  function render() {
    refs = {};
    grads = [];
    bubble.n = 0;
    stage.textContent = '';
    var p = layers[beat].n, nL = layers.length;
    var LH = nL === 2 ? 96 : nL === 3 ? 84 : 72;
    var stems = layers.map(stemFor);
    var scoreH = stems.reduce(function (a, s) { return a + s + 60; }, 0);
    var lanesTop = scoreH + 22;
    var compTop = lanesTop + nL * (LH + 10) + 8;
    var H = compTop + LH + 56;

    var svg = S('svg', { 'class': 'po-svg lab-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': describe() + ': notation above, and the same notes as bubbles below, each as wide as its note is long.' }, stage);
    var defs = S('defs', {}, svg);
    PAINT.forEach(function (pt, c) {
      var gr = S('linearGradient', { id: 'lab-grad-' + c, gradientUnits: 'userSpaceOnUse', x1: X0, x2: X1, y1: 0, y2: 0 }, defs);
      grads.push([pt.full, pt.full, pt.pale, pt.pale].map(function (col, i) { return S('stop', { offset: i < 1 ? 0 : 1, 'stop-color': col }, gr); }));
    });

    // beat guides and beat numbers
    var guides = S('g', { 'aria-hidden': 'true' }, svg);
    for (var t = 0; t <= p; t++) {
      S('line', { 'class': 'po-guide', x1: f1(X(t / p)), x2: f1(X(t / p)), y1: 14, y2: compTop + LH + 4 }, guides);
      S('text', { 'class': 'po-beat' + (t === p ? ' next' : ''), x: f1(X(t / p)), y: H - 10 }, guides, t === p ? '1' : String(t + 1));
    }

    // notation
    var score = S('g', { 'class': 'lab-score' }, svg);
    var y = 0, lines = [];
    layers.forEach(function (ly, li) {
      var lineY = y + 44 + stems[li];
      lines.push(lineY);
      S('line', { 'class': 'po-staff', x1: X0 - 14, x2: X1 + 14, y1: lineY, y2: lineY }, score);
      S('circle', { cx: 34, cy: lineY, r: 7, fill: PAINT[ly.c].full, stroke: PAINT[ly.c].edge, 'stroke-width': 2.5 }, score);
      S('circle', { cx: f1(X1 + 4), cy: lineY - 5, r: 1.9, 'class': 'po-clef' }, score);
      S('circle', { cx: f1(X1 + 4), cy: lineY + 5, r: 1.9, 'class': 'po-clef' }, score);
      drawScore(score, ly, li, lineY, stems[li]);
      y += stems[li] + 60;
    });
    var a = lines[0] - 12, b = lines[lines.length - 1] + 12;
    S('line', { 'class': 'po-bar', x1: X0 - 14, x2: X0 - 14, y1: a, y2: b }, score);
    S('line', { 'class': 'po-bar', x1: X1 + 9, x2: X1 + 9, y1: a, y2: b }, score);
    S('rect', { 'class': 'po-clef', x: X1 + 12, y: a, width: 4, height: b - a }, score);

    // one lane of bubbles per layer
    var lanes = S('g', { 'class': 'po-lanes' }, svg);
    layers.forEach(function (ly, li) {
      var top = lanesTop + li * (LH + 10), pt = PAINT[ly.c];
      var tag = S('g', { 'class': 'lab-tag' }, lanes);
      S('ellipse', { cx: 36, cy: top + LH / 2, rx: 21, ry: 19, fill: pt.full, stroke: pt.edge, 'stroke-width': 2.5, transform: 'rotate(-8 36 ' + (top + LH / 2) + ')' }, tag);
      S('text', { 'class': 'po-bl', x: 36, y: top + LH / 2 + 7, 'font-size': 20 }, tag, String(ly.n));
      if (li === beat) S('text', { 'class': 'lab-beat-tag', x: 36, y: top + LH / 2 + 34 }, tag, 'beat');
      var lane = S('g', { 'class': 'lab-lane lab-lane-' + li + (ly.on ? '' : ' off') }, lanes);
      ly.notes.forEach(function (nt, i) {
        if (nt.k > 1) {
          var w = SPAN / ly.n;
          S('rect', { 'class': 'lab-pod', x: f1(X(i / ly.n) + 1), y: top - 3, width: f1(w - 2), height: LH + 6, rx: f1(Math.min(LH / 2 + 3, w / 2)), fill: pt.pale, stroke: pt.edge }, lane);
        }
      });
      model.evs.forEach(function (ev) {
        if (ev.li !== li) return;
        var g = bubble(lane, ev.pos, ev.len, top, LH, [ly.c], {
          keys: [ev.key], rest: ev.rest, label: ev.k > 1 ? String(ev.j + 1) : String(ev.i + 1),
          title: pt.name + ' layer, note ' + (ev.i + 1) + (ev.k > 1 ? ', part ' + (ev.j + 1) + ' of ' + ev.k : '') + (ev.rest ? ' (rest)' : '')
        });
        ref(ev.key).bubble = g;
      });
    });

    // everything together on one line
    S('text', { 'class': 'lab-all-tag', x: 36, y: compTop + LH / 2 + 5 }, lanes, 'all');
    var gapsOK = model.exact && model.comp.length <= 64;
    model.comp.forEach(function (c, ci) {
      var colors = [];
      c.evs.forEach(function (ev) { var col = layers[ev.li].c; if (colors.indexOf(col) === -1) colors.push(col); });
      var g = bubble(lanes, c.pos, c.len, compTop, LH, colors, {
        comp: true, keys: c.evs.map(function (ev) { return ev.key; }),
        title: listing(c.evs.map(function (ev) { return PAINT[layers[ev.li].c].name.toLowerCase(); })) + (c.evs.length > 1 ? ' together' : '')
      });
      c.evs.forEach(function (ev) { ref(ev.key).comp = g; });
      if (gapsOK && c.len * SPAN >= 13) S('text', { 'class': 'po-gap lab-gap', x: f1(X(c.pos) + c.len * SPAN / 2), y: compTop + LH + 19 }, lanes, String(Math.round(c.len * model.L)));
    });

    cursor = S('g', { 'class': 'po-cursor', 'aria-hidden': 'true' }, svg);
    S('line', { x1: 0, x2: 0, y1: 12, y2: compTop + LH + 4 }, cursor);
    S('path', { d: 'M-7 2 L7 2 L0 14 Z' }, cursor);
    cursor.style.display = 'none';
    sweep(1);
  }

  // Everything the playhead has passed is in full color; the rest waits in a pale wash
  function sweep(frac) {
    var p = Math.max(0, Math.min(1, frac));
    grads.forEach(function (st) { st[1].setAttribute('offset', p); st[2].setAttribute('offset', p); });
  }

  /* ---------- Words ---------- */

  function nonBeat() { return layers.filter(function (ly, i) { return i !== beat; }); }
  function inOrder() { return layers.length === 2 ? nonBeat().concat([layers[beat]]) : layers; }
  function describe() { return cap(inOrder().map(function (ly) { return WORDS[ly.n]; }).join(' against ')); }
  function ratioText() { return inOrder().map(function (ly) { return ly.n; }).join(' : '); }
  function cname(ly) { return PAINT[ly.c].name; }

  var NOTE_NAMES = ['unison', 'minor second', 'major second', 'minor third', 'major third', 'perfect fourth', 'tritone',
    'perfect fifth', 'minor sixth', 'major sixth', 'minor seventh', 'major seventh'];
  var PURE = { '2:1': 1, '3:2': 1, '4:3': 1, '5:4': 1, '6:5': 1, '5:3': 1, '8:5': 1, '9:8': 1, '16:15': 1, '15:8': 1, '9:5': 1, '16:9': 1 };
  function interval(a, b) {
    var hi = Math.max(a, b), lo = Math.min(a, b), g = gcd(hi, lo);
    hi /= g; lo /= g;
    if (hi === lo) return 'a unison: both layers become the same pitch';
    var cents = 1200 * Math.log(hi / lo) / Math.LN2, oct = Math.floor(cents / 1200 + 1e-9), within = cents - 1200 * oct;
    var semi = Math.round(within / 100), off = within - 100 * semi;
    if (semi === 12) { semi = 0; oct++; off = within - 1200; }
    var octs = oct === 1 ? 'an octave' : oct === 2 ? 'two octaves' : oct === 3 ? 'three octaves' : oct + ' octaves';
    var pure = oct === 0 && PURE[hi + ':' + lo] ? 'pure ' : '';
    var name = oct === 0 ? 'a ' + pure + NOTE_NAMES[semi] : semi === 0 ? octs : octs + ' plus a ' + NOTE_NAMES[semi];
    var tail = Math.abs(off) < 0.5 ? 'exactly' : Math.round(Math.abs(off)) + ' cents ' + (off > 0 ? 'above' : 'below') + ' the piano\'s';
    return name + ' (' + hi + ':' + lo + ', ' + tail + ')';
  }
  var CHORDS = { '4:5:6': 'a major triad', '3:4:5': 'a major triad with its fifth on the bottom', '5:6:8': 'a major triad with its third on the bottom', '10:12:15': 'a minor triad', '2:3:4': 'a fifth with the octave on top', '3:4:6': 'a fourth with the octave on top', '6:7:8': 'a tight cluster from high in the harmonic series' };

  /* ---------- The math, worked for the rhythm on the stage ---------- */

  function para(parent, parts, cls) {
    var p = E('p', cls);
    parts.forEach(function (part) {
      if (typeof part === 'string') p.appendChild(document.createTextNode(part));
      else { var b = E(part.i ? 'i' : 'b', '', part.b || part.i); if (part.c !== undefined) b.style.color = PAINT[part.c].edge; p.appendChild(b); }
    });
    parent.appendChild(p);
    return p;
  }
  function stepItem(title) {
    var li = E('li');
    li.appendChild(E('h3', '', title));
    mathBox.appendChild(li);
    return li;
  }
  function seq(list, most) { return list.slice(0, most).join(', ') + (list.length > most ? ', and so on' : ''); }

  // The counting exercise in notation: every beat cut into even counts, with accents where the layer plays
  function countScore(n, p, cA, cB) {
    var g = gcd(n, p), q = n / g, s = p / g, total = p * q, step = 900 / total;
    if (step < 9) return null;
    var b = q <= 1 ? 0 : q <= 3 ? 1 : q <= 7 ? 2 : q <= 15 ? 3 : 4;
    var lineA = 92, lineB = 124, top = lineA - (30 + 8 * Math.max(0, b - 1)), rx = Math.min(6.2, step * 0.42);
    var svg = S('svg', { 'class': 'lab-count', viewBox: '0 0 1000 162', role: 'img', 'aria-label': p + ' beats, each counted in ' + q + ', with an accent on every ' + ord(s) + ' count' });
    S('line', { 'class': 'po-staff', x1: 26, x2: 978, y1: lineA, y2: lineA }, svg);
    S('line', { 'class': 'po-staff', x1: 26, x2: 978, y1: lineB, y2: lineB }, svg);
    S('line', { 'class': 'po-bar', x1: 26, x2: 26, y1: lineA, y2: lineB }, svg);
    S('line', { 'class': 'po-bar', x1: 978, x2: 978, y1: lineA, y2: lineB }, svg);
    for (var t = 0; t < p; t++) {
      var first = 50 + t * q * step, last = first + (q - 1) * step;
      for (var c = 0; c < q; c++) {
        var x = first + c * step, hit = (t * q + c) % s === 0;
        var col = hit ? PAINT[cA].edge : null;
        S('line', { 'class': 'po-stem', x1: f1(x + rx - 0.5), x2: f1(x + rx - 0.5), y1: lineA - 1.5, y2: top, style: col ? 'stroke:' + col : null }, svg);
        S('ellipse', { 'class': 'po-head', cx: f1(x), cy: lineA, rx: f1(rx), ry: f1(rx * 0.72), transform: 'rotate(-20 ' + f1(x) + ' ' + lineA + ')', style: col ? 'fill:' + col : 'opacity:0.45' }, svg);
        if (hit) S('path', { 'class': 'po-accent', style: 'stroke:' + col, d: 'M' + f1(x - 6) + ' ' + (top - 33) + ' L' + f1(x + 6) + ' ' + (top - 29) + ' L' + f1(x - 6) + ' ' + (top - 25) }, svg);
        if (step >= 13 && q > 1) S('text', { 'class': 'lab-num' + (hit ? ' hit' : ''), x: f1(x), y: lineA + 20, style: hit ? 'fill:' + col : null }, svg, String(c + 1));
      }
      if (b && q > 1) beams(svg, first + rx - 0.5, last + rx - 0.5, top, b);
      if (q > 1 && !pow2(q)) label(svg, (first + last) / 2 + rx - 0.5, top - 6, String(q));
      S('line', { 'class': 'po-stem', x1: f1(first - RX + 0.5), x2: f1(first - RX + 0.5), y1: lineB + 1.5, y2: lineB + 28, style: 'stroke:' + PAINT[cB].edge }, svg);
      S('ellipse', { 'class': 'po-head', cx: f1(first), cy: lineB, rx: RX, ry: f1(RX * 0.72), transform: 'rotate(-20 ' + f1(first) + ' ' + lineB + ')', style: 'fill:' + PAINT[cB].edge }, svg);
    }
    return svg;
  }

  function countStep(li, A, B) {
    var n = A.n, p = B.n, g = gcd(n, p), q = n / g, s = p / g;
    if (q === 1) {
      para(li, [{ b: cname(A), c: A.c }, ' against ', { b: cname(B), c: B.c }, ': the ' + WORDS[n] + ' lands right on ' + cname(B).toLowerCase() + '\'s beats, on every ' + ord(s) + ' one. There is nothing to subdivide.']);
    } else if (s === 1) {
      para(li, [{ b: cname(A), c: A.c }, ' against ', { b: cname(B), c: B.c }, ': ' + WORDS[q] + ' even notes on every beat. That is a subdivision, not a cross-rhythm.']);
    } else {
      var hits = [];
      for (var t = 0; t < Math.min(p, 8); t++) {
        var counts = [];
        for (var c = 0; c < q; c++) if ((t * q + c) % s === 0) counts.push(c + 1);
        hits.push(counts.length ? 'beat ' + (t + 1) + ' gets ' + listing(counts.map(String)) : 'beat ' + (t + 1) + ' gets none');
      }
      para(li, [{ b: cname(A), c: A.c }, ' against ', { b: cname(B), c: B.c }, ': count each of ' + cname(B).toLowerCase() + '\'s ' + WORDS[p] + ' beats in ', { b: String(q) }, ', and play ' + cname(A).toLowerCase() + ' on every ', { b: ord(s) }, ' count. So ' + hits.join(', ') + (p > 8 ? ', and so on.' : '.')]);
    }
    var sc = countScore(n, p, A.c, B.c);
    if (sc) {
      var wrap = E('div', 'lab-count-wrap');
      wrap.appendChild(sc);
      li.appendChild(wrap);
      para(li, ['Play the accents and let the small notes go silent; what is left is ' + n + ' against ' + p + '.'], 'muted small');
    } else {
      para(li, ['That is ' + p * q + ' counts in the cycle, too many to print legibly. The counting still works exactly as described.'], 'muted small');
    }
  }

  function math() {
    mathBox.textContent = '';
    var ns = layers.map(function (ly) { return ly.n; });
    var p = layers[beat].n, L = model.L, B = layers[beat];
    var allG = ns.reduce(function (a, b) { return gcd(a, b); });
    var plainL = ns.reduce(function (a, b) { return lcm(a, b); }, 1);
    var ed = anyEdited();
    var li;

    // 1. Reduce
    li = stepItem('Reduce it');
    if (layers.length === 2) {
      if (allG > 1) para(li, [ns[0] + ' and ' + ns[1] + ' share a factor of ' + allG + ', so this is really ', { b: ns[0] / allG + ' against ' + ns[1] / allG }, ' played ' + (allG === 2 ? 'twice' : allG + ' times') + ' in one cycle. Learn the smaller one and you have it.']);
      else para(li, [ns[0] + ' and ' + ns[1] + ' share no factor, so this is a true ', { b: WORDS[ns[0]] + ' against ' + WORDS[ns[1]] }, ': the two layers meet on the downbeat and nowhere else.']);
    } else {
      if (allG > 1) para(li, ['All of ' + listing(ns.map(String)) + ' divide by ' + allG + ', so the whole pattern happens ' + (allG === 2 ? 'twice' : allG + ' times') + ' in one cycle. It is really ', { b: ns.map(function (x) { return x / allG; }).join(' against ') }, '.']);
      else para(li, ['No number divides all of ' + listing(ns.map(String)) + ', so every layer lines up together only on the downbeat. Any two of them may still meet along the way.']);
    }
    if (ed) para(li, ['Splits and rests do not change this frame. They add finer notes inside it, or take notes out of it.'], 'muted small');

    // 2. The ruler
    li = stepItem('Find the ruler');
    if (!ed) {
      if (layers.length === 2 && allG === 1) para(li, ['The numbers share no factor, so just multiply them: ' + ns[0] + ' × ' + ns[1] + ' = ', { b: String(L) }, '. That is their lowest common multiple, and it is how many equal marks one cycle needs to hold both layers.']);
      else if (layers.length === 2) para(li, ['Multiply the two numbers and divide by the factor they share: ' + ns[0] + ' × ' + ns[1] + ' ÷ ' + allG + ' = ', { b: String(L) }, '. That is their lowest common multiple, and it is how many equal marks one cycle needs to hold both layers.']);
      else para(li, ['The lowest common multiple of ' + listing(ns.map(String)) + ' is ', { b: String(L) }, ': the smallest number every one of them divides. One cycle needs that many equal marks.']);
    } else {
      var needs = [];
      layers.forEach(function (ly) {
        var ks = [];
        ly.notes.forEach(function (nt) { if (ks.indexOf(nt.k) === -1) ks.push(nt.k); });
        ks.sort(function (x, y) { return x - y; });
        needs.push(cname(ly).toLowerCase() + ' needs ' + listing(ks.map(function (k) { return k === 1 ? String(ly.n) : ly.n + ' × ' + k + ' = ' + ly.n * k; })));
      });
      if (model.exact) para(li, ['A note split into smaller notes needs finer marks: multiply its layer\'s number by the split. Here ' + needs.join('; ') + '. The lowest common multiple of all of those is ', { b: String(L) }, ', so one cycle needs ' + L + ' equal marks. Without the splits it would need only ' + plainL + '.']);
      else para(li, ['A note split into smaller notes needs finer marks: multiply its layer\'s number by the split. Here ' + needs.join('; ') + '. Their lowest common multiple is past a billion, so the page keeps every position as a fraction of the cycle instead.']);
    }
    if (model.exact) {
      para(li, ['Each note is then a whole number of marks long: ' + listing(layers.map(function (ly) { return L / ly.n + ' for ' + cname(ly).toLowerCase(); })) + (ed ? ', before any split.' : '.')], 'muted small');
    }

    // 3. Place the notes
    if (model.exact) {
      li = stepItem('Place the notes');
      para(li, ['Start every layer on mark 0 and step by its note length.']);
      layers.forEach(function (ly, i) {
        var marks = model.evs.filter(function (e) { return e.li === i && !e.rest; }).map(function (e) { return e.u; });
        para(li, [{ b: cname(ly) + ': ', c: ly.c }, marks.length ? seq(marks, 40) : 'nothing but rests'], 'lab-marks');
      });

      // 4. The composite
      li = stepItem('Read the composite');
      var all = model.comp.map(function (c) { return Math.round(c.pos * L); });
      var gaps = model.comp.map(function (c) { return Math.round(c.len * L); });
      if (!all.length) para(li, ['Every note is resting, so there is nothing to merge.']);
      else {
        para(li, ['Merge the lists into one line, then subtract each mark from the next to get the gaps. The last gap runs to the next downbeat.']);
        para(li, [{ b: 'Together: ' }, seq(all, 48)], 'lab-marks');
        para(li, [{ b: 'Gaps: ' }, seq(gaps, 48)], 'lab-marks');
        var same = gaps.join() === gaps.slice().reverse().join();
        para(li, [gaps.length + (gaps.length === 1 ? ' attack' : ' attacks') + ' in the cycle.' + (same && gaps.length > 1 ? ' The gaps read the same backward, so the second half is the first half in reverse. Every plain polyrhythm does this.' : ed ? ' Splits and rests can break the mirror that plain polyrhythms always have.' : '')], 'muted small');
      }
    }

    // 5. The clock
    li = stepItem('Put it on the clock');
    var bpm = tempo(), cycle = p * 60 / bpm;
    para(li, [{ b: cname(B), c: B.c }, ' is the beat at ' + bpm + ' beats per minute, so one beat lasts 60 ÷ ' + bpm + ' = ' + secs(60 / bpm, 3) + ' and the cycle of ' + p + ' beats lasts ', { b: secs(cycle, 3) }, model.exact ? '. Divide by the ruler and one mark is ' + trim(cycle * 1000 / L, 2) + ' milliseconds.' : '.']);
    layers.forEach(function (ly) {
      para(li, [{ b: cname(ly) + ': ', c: ly.c }, 'a note every ' + trim(cycle * 1000 / ly.n, 1) + ' ms, which is a metronome at ' + bpm + ' × ' + ly.n + ' ÷ ' + p + ' = ' + trim(bpm * ly.n / p, 1) + '.'], 'lab-marks');
    });

    // 6. Count it
    li = stepItem('Count it');
    var others = nonBeat();
    others.forEach(function (A) { countStep(li, A, B); });
    if (layers.length === 2) {
      para(li, [{ b: 'Now flip it. ' }, 'The same rhythm, felt from the other side:']);
      countStep(li, B, others[0]);
      var pair = [ns[0], ns[1]].sort(function (x, y) { return x - y; }).join(':');
      if (!ed && pair === '2:3') para(li, [{ b: 'Say it: ' }, '“Nice cup of tea.” The four syllables fall on gaps of 2, 1, 1, 2.']);
      if (!ed && pair === '3:4') para(li, [{ b: 'Say it: ' }, '“Pass the golden butter.” The six syllables fall on gaps of 3, 1, 2, 2, 1, 3.']);
    }

    // 7. Write it
    li = stepItem('Write it down');
    layers.forEach(function (ly) {
      var wr = written(ly.n, p), val = VALUES[wr.e], q = ly.n % p === 0 ? ly.n / p : 0, text;
      if (ly === B) text = WORDS[p] + ' quarter notes, one to a beat.';
      else if (ly.n === wr.m) text = WORDS[ly.n] + ' ' + val + ' notes' + (q > 1 ? ', ' + WORDS[q] + ' to a beat.' : ', with no bracket needed.');
      else if (q > 1) text = WORDS[ly.n] + ' ' + val + ' notes, ' + WORDS[q] + ' to a beat under a ' + q + '.';
      else text = WORDS[ly.n] + ' ' + val + ' notes under a ' + ly.n + ':' + wr.m + ' bracket, which reads “' + ly.n + ' in the time of ' + wr.m + '.”';
      para(li, [{ b: cname(ly) + ': ', c: ly.c }, text + (edited(ly) ? ' A split note becomes a group of shorter notes, with its own number when the split is not 2 or 4; a rested note becomes a rest of the same length.' : '')], 'lab-marks');
    });
    para(li, ['The notation at the top of the stage is written exactly this way, with ' + cname(B).toLowerCase() + '\'s beat as the quarter note.'], 'muted small');

    // 8. Hear it as harmony
    li = stepItem('Hear it as harmony');
    var sorted = ns.slice().sort(function (x, y) { return x - y; });
    if (layers.length === 2) {
      para(li, ['Speed a polyrhythm up until the notes blur and it turns into two pitches, because pitch is rhythm heard very fast. ' + ratioText().replace(/ /g, '') + ' becomes ', { b: interval(ns[0], ns[1]) }, '. Press ', { b: 'Hear it as harmony' }, ' under the stage to check.']);
    } else {
      var red = sorted.map(function (x) { return x / allG; }).join(':');
      var parts = [];
      for (var i = 1; i < sorted.length; i++) parts.push(interval(sorted[i], sorted[i - 1]));
      para(li, ['Sped up, each layer becomes a pitch, and ' + sorted.join(':') + ' becomes a chord' + (CHORDS[red] ? ': ' : '.'), CHORDS[red] ? { b: CHORDS[red] } : '', CHORDS[red] ? '.' : '', ' From the bottom up it stacks ' + listing(parts) + '. Press ', { b: 'Hear it as harmony' }, ' under the stage to check.']);
    }
  }

  /* ---------- Layer controls, presets and the atlas ---------- */

  function drawLayers() {
    layersBox.textContent = '';
    layers.forEach(function (ly, li) {
      var pt = PAINT[ly.c];
      var box = E('div', 'lab-layer');
      box.style.setProperty('--lc', pt.full);
      box.style.setProperty('--le', pt.edge);
      var row = E('div', 'lab-count-row');
      var minus = E('button', 'lab-step', '−');
      minus.type = 'button';
      minus.setAttribute('data-act', 'minus');
      minus.setAttribute('aria-label', 'One fewer note in the ' + pt.name.toLowerCase() + ' layer');
      minus.disabled = ly.n <= 2;
      var num = E('output', 'lab-n', String(ly.n));
      num.setAttribute('aria-label', pt.name + ' layer: ' + ly.n + ' notes');
      var plus = E('button', 'lab-step', '+');
      plus.type = 'button';
      plus.setAttribute('data-act', 'plus');
      plus.setAttribute('aria-label', 'One more note in the ' + pt.name.toLowerCase() + ' layer');
      plus.disabled = ly.n >= MAXN;
      row.appendChild(minus); row.appendChild(num); row.appendChild(plus);
      box.appendChild(row);
      var opts = E('div', 'lab-layer-opts');
      var bl = E('label', 'check');
      var radio = E('input');
      radio.type = 'radio'; radio.name = 'lab-beat'; radio.checked = li === beat;
      radio.setAttribute('data-act', 'beat');
      bl.appendChild(radio); bl.appendChild(document.createTextNode(' Beat'));
      var sl = E('label', 'check');
      var on = E('input');
      on.type = 'checkbox'; on.checked = ly.on;
      on.setAttribute('data-act', 'on');
      sl.appendChild(on); sl.appendChild(document.createTextNode(' Sound'));
      opts.appendChild(bl); opts.appendChild(sl);
      if (layers.length > 2) {
        var rm = E('button', 'lab-remove', 'Remove');
        rm.type = 'button';
        rm.setAttribute('data-act', 'remove');
        rm.setAttribute('aria-label', 'Remove the ' + pt.name.toLowerCase() + ' layer');
        opts.appendChild(rm);
      }
      box.appendChild(opts);
      box.setAttribute('data-li', li);
      layersBox.appendChild(box);
      if (li < layers.length - 1) layersBox.appendChild(E('span', 'lab-colon', ':'));
    });
    if (layers.length < MAXLAYERS) {
      var add = E('button', 'btn btn-outline-dark lab-add', 'Add a layer');
      add.type = 'button';
      add.setAttribute('data-act', 'add');
      layersBox.appendChild(add);
    }
  }

  function act(e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var a = el.getAttribute('data-act');
    if (e.type === 'click' && (a === 'beat' || a === 'on')) return;      // those two answer to change
    if (e.type === 'change' && a !== 'beat' && a !== 'on') return;
    var box = el.closest('[data-li]'), li = box ? parseInt(box.getAttribute('data-li'), 10) : -1, ly = layers[li];
    if (a === 'add') {
      var used = layers.map(function (x) { return x.c; }), c = 0, ns = layers.map(function (x) { return x.n; }), n = 2;
      while (used.indexOf(c) !== -1) c++;
      while (ns.indexOf(n) !== -1 && n < MAXN) n++;
      layers.push(layer(n, c));
    } else if (a === 'remove') {
      layers.splice(li, 1);
      if (beat === li) beat = layers.length - 1; else if (beat > li) beat--;
    } else if (a === 'minus' || a === 'plus') {
      ly.n = Math.max(2, Math.min(MAXN, ly.n + (a === 'plus' ? 1 : -1)));
      ly.notes = fresh(ly.n);
    } else if (a === 'beat') {
      beat = li;
      clamp();
    } else if (a === 'on') {
      ly.on = el.checked;
    }
    changed(a !== 'on');
    var again = a === 'add' ? layersBox.querySelector('[data-act="add"]') : layersBox.querySelector('[data-li="' + li + '"] [data-act="' + a + '"]');
    if (again && again.disabled && (a === 'minus' || a === 'plus')) again = layersBox.querySelector('[data-li="' + li + '"] [data-act="' + (a === 'minus' ? 'plus' : 'minus') + '"]');
    if (again && a !== 'on') again.focus();
  }

  // After the beat moves, a split may be finer than the page can print; pull it back
  function clamp() {
    layers.forEach(function (ly) {
      var most = maxSplit(ly);
      ly.notes.forEach(function (nt) { if (nt.k > most) { nt.k = 1; nt.rest = [false]; } });
    });
  }

  function load(ns, b, splits) {
    layers = ns.slice(0, MAXLAYERS).map(function (n, i) { return layer(Math.max(2, Math.min(MAXN, n)), i); });
    beat = b === undefined ? layers.length - 1 : b;
    if (splits) {
      Object.keys(splits).forEach(function (li) {
        splits[li].forEach(function (k, i) {
          var nt = layers[li].notes[i];
          nt.k = k; nt.rest = []; for (var j = 0; j < k; j++) nt.rest.push(false);
        });
      });
    }
    changed(true);
  }

  function coprimePairs(max) {
    var out = [];
    for (var a = 3; a <= max; a++) for (var b = 2; b < a; b++) if (gcd(a, b) === 1) out.push([a, b]);
    return out;
  }

  function drawPresets() {
    var fixed = PRESETS.map(function (ps) { return ps.ns.join(':'); });
    var today = coprimePairs(9).filter(function (pr) { return fixed.indexOf(pr.join(':')) === -1; });
    var pick = today[Math.floor(Date.now() / 86400000) % today.length];
    var list = [{ name: pick[0] + ' : ' + pick[1], note: 'Today’s polyrhythm', ns: pick, today: true }].concat(PRESETS);
    list.forEach(function (ps, i) {
      var b = E('button', 'lab-preset' + (ps.today ? ' today' : ''));
      b.type = 'button';
      b.setAttribute('data-preset', i);
      b.appendChild(E('strong', '', ps.name));
      b.appendChild(E('span', '', ps.note));
      presetBox.appendChild(b);
    });
    var sup = E('button', 'lab-preset surprise');
    sup.type = 'button';
    sup.setAttribute('data-preset', 'surprise');
    sup.appendChild(E('strong', '', '? : ?'));
    sup.appendChild(E('span', '', 'Surprise me'));
    presetBox.appendChild(sup);
    presetBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-preset]');
      if (!b) return;
      var id = b.getAttribute('data-preset');
      if (id === 'surprise') {
        var pool = coprimePairs(11), pr = pool[Math.floor(Math.random() * pool.length)];
        load(Math.random() < 0.5 ? pr : [pr[1], pr[0]]);
      } else {
        var ps = list[parseInt(id, 10)];
        load(ps.ns, ps.beat, ps.splits);
      }
      toStage();
    });
  }

  function drawAtlas() {
    var true_ = 0, total = 0;
    for (var a = 3; a <= MAXN; a++) {
      var row = E('div', 'lab-atlas-row');
      row.appendChild(E('span', 'lab-atlas-n', String(a)));
      for (var b = 2; b < a; b++) {
        var g = gcd(a, b), btn = E('button', 'lab-pair' + (g > 1 ? ' reducible' : ' tone-' + (b % 5)), a + ':' + b);
        btn.type = 'button';
        btn.setAttribute('data-a', a);
        btn.setAttribute('data-b', b);
        btn.title = g > 1 ? a + ':' + b + ' is ' + a / g + ':' + b / g + ' played ' + (g === 2 ? 'twice' : g + ' times') : cap(WORDS[a]) + ' against ' + WORDS[b];
        row.appendChild(btn);
        total++;
        if (g === 1) true_++;
      }
      atlasBox.appendChild(row);
    }
    if (atlasCount) atlasCount.textContent = 'There are ' + total + ' ways to pair two different numbers from 2 to ' + MAXN + '. ' + true_ + ' of them are true polyrhythms, shown in color; the other ' + (total - true_) + ' are smaller ones repeated, shown in outline.';
    atlasBox.addEventListener('click', function (e) {
      var b = e.target.closest('.lab-pair');
      if (!b) return;
      load([parseInt(b.getAttribute('data-a'), 10), parseInt(b.getAttribute('data-b'), 10)]);
      toStage();
    });
  }
  function toStage() {
    var card = root.querySelector('.lab-card');
    if (card.scrollIntoView) card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function syncAtlas() {
    var plain = layers.length === 2 && !anyEdited();
    var hi = plain ? Math.max(layers[0].n, layers[1].n) : 0, lo = plain ? Math.min(layers[0].n, layers[1].n) : 0;
    atlasBox.querySelectorAll('.lab-pair').forEach(function (b) {
      b.setAttribute('aria-pressed', plain && +b.getAttribute('data-a') === hi && +b.getAttribute('data-b') === lo ? 'true' : 'false');
    });
  }

  function facts() {
    titleEl.textContent = describe();
    nowEl.textContent = ratioText();
    factsEl.textContent = '';
    var items = [];
    if (model.exact) items.push(model.L + (model.L === 1 ? ' mark' : ' marks') + ' in the cycle');
    items.push(model.comp.length + (model.comp.length === 1 ? ' attack' : ' attacks'));
    items.push(secs(layers[beat].n * 60 / tempo(), 2) + ' a cycle');
    if (anyEdited()) items.push('with splits or rests');
    items.forEach(function (t) { factsEl.appendChild(E('li', '', t)); });
  }

  function changed(structure) {
    compute();
    if (structure) drawLayers();
    render();
    facts();
    math();
    syncAtlas();
    statusEl.textContent = '';
    try {
      if (!anyEdited()) history.replaceState(null, '', '#' + layers.map(function (ly) { return ly.n; }).join('-'));
    } catch (e) { /* the address is a convenience */ }
    refreshPlay();
  }

  /* ---------- Sound ---------- */

  var ctx, master, noiseBuf;

  function tempo() { return parseInt(bpmInput.value, 10) || 60; }
  function cycleSec() { return layers[beat].n * 60 / tempo(); }

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
    } else g.connect(master);
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
  function drum(t, d, vel) {
    var dest = out(d.pan), v = vel * d.gain;
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
    src.connect(bp); bp.connect(ng); ng.connect(dest);
    src.start(t, Math.random() * 0.3);
    src.stop(t + 0.06);
  }
  function block(t, d, vel) {
    var dest = out(d.pan);
    tone(dest, t, 'sine', d.block, d.block, 0, 0.7 * vel, 0.075);
    tone(dest, t, 'sine', d.block * 2.76, d.block * 2.76, 0, 0.22 * vel, 0.04);
  }
  function click(t, strong, soft) {
    var f = soft ? 3136 : strong ? 2093 : 1568;
    tone(master, t, 'sine', f, f, 0, soft ? 0.035 : strong ? 0.16 : 0.1, soft ? 0.02 : 0.04);
  }
  function strike(t, ev) {
    var d = PAINT[layers[ev.li].c];
    if (sound === 'drums') drum(t, d, ev.vel); else block(t, d, ev.vel);
  }

  // Sped up far enough, each layer is a pitch and the polyrhythm is an interval or a chord
  function harmony() {
    if (!AC) return;
    audio();
    var ns = layers.map(function (ly) { return ly.n; }).sort(function (a, b) { return a - b; });
    var base = 220 / ns[0];
    if (base * ns[ns.length - 1] > 1760) base = 1760 / ns[ns.length - 1];
    var now = ctx.currentTime + 0.05, end = now + 0.45 * (ns.length - 1) + 2.2;
    ns.forEach(function (n, i) {
      var t0 = now + 0.45 * i;
      [['sine', 0.15], ['triangle', 0.05]].forEach(function (v) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = v[0];
        o.frequency.value = base * n;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(v[1], t0 + 0.06);
        g.gain.setValueAtTime(v[1], end - 0.5);
        g.gain.exponentialRampToValueAtTime(0.0001, end);
        o.connect(g); g.connect(master);
        o.start(t0); o.stop(end + 0.05);
      });
    });
    statusEl.textContent = layers.length === 2 ? 'That was ' + interval(ns[0], ns[1]) + '.' : 'That was ' + ns.join(':') + ' as a chord.';
  }

  /* ---------- Playback ---------- */

  var play = null;

  // Everything that sounds in one cycle, in order: strokes, and the soft counting notes if they are on
  function items() {
    var list = model.evs.filter(function (e) { return !e.rest; }).map(function (e) { return { o: e.pos, e: e }; });
    var p = layers[beat].n, plain = layers.reduce(function (a, ly) { return lcm(a, ly.n); }, 1), per = plain / p;
    if (per > 1 && per <= 12) for (var i = 0; i < plain; i++) list.push({ o: i / plain, tick: true });
    list.sort(function (a, b) { return a.o - b.o || (a.tick ? -1 : 1); });
    return list;
  }

  function start() {
    if (!AC) return;
    audio();
    stop();
    var p = layers[beat].n, lead = countBox.checked ? Math.min(4, p) : 0, c;
    play = { items: items(), idx: 0, pass: 0, anchorT: ctx.currentTime + 0.08, anchorS: -lead / p, sec: cycleSec(), on: {}, comp: null, turn: null };
    for (c = 0; c < lead; c++) click(play.anchorT + c * 60 / tempo(), c === 0);
    playBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'true'); b.querySelector('span').textContent = 'Stop'; });
    app.classList.add('is-playing');
    sweep(0);
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
    if (cursor) cursor.style.display = 'none';
    sweep(1);
  }

  function tick() {
    var p = play;
    if (!p) return;
    if (!p.items.length) return;
    for (;;) {
      var it = p.items[p.idx];
      var t = p.anchorT + (p.pass + it.o - p.anchorS) * p.sec;
      if (t > ctx.currentTime + 0.14) break;
      t = Math.max(t, ctx.currentTime);
      if (it.tick) { if (tickBox.checked) click(t, false, true); }
      else if (layers[it.e.li] && layers[it.e.li].on && !(tradeBox.checked && p.pass % 2)) strike(t, it.e);
      if (++p.idx >= p.items.length) { p.idx = 0; p.pass++; }
    }
  }

  // Keep playing through a change: pick the new cycle up just past what is already scheduled
  function refreshPlay() {
    var p = play;
    if (!p) return;
    var now = ctx.currentTime, sec = cycleSec();
    var pos = p.anchorS + (now - p.anchorT) / p.sec;
    p.anchorS = pos; p.anchorT = now; p.sec = sec;
    p.items = items();
    var edge = pos + 0.14 / sec;
    p.pass = Math.max(0, Math.floor(edge));
    var frac = edge < 0 ? 0 : edge - p.pass;
    p.idx = 0;
    while (p.idx < p.items.length && p.items[p.idx].o < frac) p.idx++;
    if (p.idx >= p.items.length) { p.idx = 0; p.pass++; }
    p.on = {}; p.comp = null;
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
    var pos = p.anchorS + (ctx.currentTime - late - p.anchorT) / p.sec;
    if (pos >= 0) {
      var pass = Math.floor(pos), frac = pos - pass;
      cursor.style.display = '';
      cursor.setAttribute('transform', 'translate(' + f1(X(frac)) + ' 0)');
      sweep(frac);
      if (stage.scrollWidth > stage.clientWidth + 4) stage.scrollLeft = Math.max(0, X(frac) / W * stage.scrollWidth - stage.clientWidth * 0.4);

      var yours = tradeBox.checked && pass % 2 === 1;
      var turn = tradeBox.checked ? (yours ? 'Your turn' : 'Listen') : '';
      if (turn !== p.turn) { p.turn = turn; statusEl.textContent = turn; statusEl.classList.toggle('yours', yours); }

      layers.forEach(function (ly, li) {
        var cur = null;
        for (var i = 0; i < model.evs.length; i++) {
          var e = model.evs[i];
          if (e.li === li && !e.rest && e.pos <= frac + 1e-9 && frac < e.pos + e.len) { cur = e; break; }
        }
        var id = cur ? pass + ':' + cur.key : '';
        if (p.on[li] === id) return;
        p.on[li] = id;
        stage.querySelectorAll('.lab-note.on[data-key^="' + li + '-"]').forEach(function (n) { n.classList.remove('on'); });
        if (!cur || !ly.on) return;
        var r = refs[cur.key] || {};
        if (r.note) r.note.classList.add('on');
        pop(r.bubble);
      });
      var cc = null;
      for (var k = 0; k < model.comp.length; k++) if (model.comp[k].pos <= frac + 1e-9) cc = model.comp[k];
      var cid = cc ? pass + ':' + cc.evs[0].key : '';
      if (cid !== p.comp) { p.comp = cid; if (cc) pop((refs[cc.evs[0].key] || {}).comp); }
    }
    p.raf = requestAnimationFrame(frame);
  }

  function toggle() { if (play) stop(); else start(); }

  /* ---------- Controls ---------- */

  playBtns.forEach(function (b) { b.addEventListener('click', toggle); });
  layersBox.addEventListener('click', act);
  layersBox.addEventListener('change', act);

  try {
    var saved = parseInt(localStorage.getItem('labTempo'), 10);
    if (saved >= 30 && saved <= 200) bpmInput.value = saved;
  } catch (e) { /* storage is optional */ }
  bpmOut.textContent = bpmInput.value;
  bpmInput.addEventListener('input', function () {
    bpmOut.textContent = bpmInput.value;
    if (play) { var now = ctx.currentTime; play.anchorS += (now - play.anchorT) / play.sec; play.anchorT = now; play.sec = cycleSec(); }
    if (!mathDue) {
      mathDue = true;
      requestAnimationFrame(function () { mathDue = false; facts(); math(); });
    }
    try { localStorage.setItem('labTempo', bpmInput.value); } catch (e) { /* optional */ }
  });

  var mathDue = false;

  function segment(box, attr, set) {
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[' + attr + ']');
      if (!b) return;
      set(b.getAttribute(attr));
      box.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
  }
  segment(tapBox, 'data-tap', function (v) { tap = v; app.setAttribute('data-tap', v); });
  segment(soundBox, 'data-sound', function (v) { sound = v; });

  root.querySelector('.lab-harmony').addEventListener('click', harmony);
  root.querySelector('.lab-clear').addEventListener('click', function () {
    layers.forEach(function (ly) { ly.notes = fresh(ly.n); });
    changed(false);
  });

  // Tap a bubble or a note: hear it, split it, or rest it
  stage.addEventListener('click', function (e) {
    var g = e.target.closest('[data-key]');
    if (!g) return;
    var keys = g.getAttribute('data-key').split(' ');
    if (tap === 'hear' || g.classList.contains('lab-comp')) {
      if (!AC) return;
      audio();
      model.evs.forEach(function (ev) { if (keys.indexOf(ev.key) !== -1 && !ev.rest) strike(ctx.currentTime + 0.01, ev); });
      pop(g);
      return;
    }
    var parts = keys[0].split('-'), ly = layers[+parts[0]], nt = ly.notes[+parts[1]];
    if (tap === 'split') {
      var most = maxSplit(ly);
      nt.k = nt.k >= most ? 1 : nt.k + 1;
      nt.rest = [];
      for (var j = 0; j < nt.k; j++) nt.rest.push(false);
      changed(false);
      statusEl.textContent = most === 1 ? 'These notes are already as fine as the page can print.' : nt.k === 1 ? 'Back to one note.' : 'Split in ' + nt.k + (nt.k === most ? '. One more tap goes back to one note.' : '.');
    } else {
      nt.rest[+parts[2]] = !nt.rest[+parts[2]];
      changed(false);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.code !== 'Space' || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^(INPUT|BUTTON|SELECT|TEXTAREA|A|SUMMARY)$/.test(e.target.tagName)) return;
    if (!AC) return;
    e.preventDefault();
    toggle();
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
  [countBox, tickBox, tradeBox].forEach(function (b) { b.addEventListener('change', function () { if (b === tradeBox && !b.checked) statusEl.textContent = ''; }); });

  function fromHash() {
    var m = /^#(\d{1,2}(?:-\d{1,2}){1,3})$/.exec(location.hash);
    if (!m) return false;
    var ns = m[1].split('-').map(Number);
    if (ns.some(function (n) { return n < 2 || n > MAXN; })) return false;
    if (ns.join('-') === layers.map(function (ly) { return ly.n; }).join('-') && !anyEdited()) return true;
    load(ns);
    return true;
  }
  window.addEventListener('hashchange', fromHash);

  if (!AC) {
    playBtns.forEach(function (b) { b.hidden = true; });
    controls.querySelectorAll('.rud-tempo, .rud-opt').forEach(function (x) { x.hidden = true; });
    root.querySelector('.lab-harmony').hidden = true;
  }
  drawPresets();
  drawAtlas();
  app.setAttribute('data-tap', tap);
  compute();
  drawLayers(); render(); facts(); math(); syncAtlas();
  fromHash();
  controls.hidden = false;
  app.hidden = false;
})();
