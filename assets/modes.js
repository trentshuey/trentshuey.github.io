/* Modes (modes.html)
 * Draws and plays William Moersch's "Modes (Version 3.0)" exercise in any key: the eight modes in
 * order of alteration, one at a time, chained up and down, or through all twelve pitch levels.
 * The data (modes, tonics, registers) comes from _src/modes_render.py. Notation symbols are from
 * the Bravura font by Steinberg, SIL Open Font License (assets/fonts/bravura-OFL.txt).
 */
(function () {
  'use strict';
  var dataEl = document.getElementById('modes-data');
  var root = document.getElementById('modes');
  if (!dataEl || !root) return;

  var DATA = JSON.parse(dataEl.textContent);
  var G = DATA.glyphs;
  var NS = 'http://www.w3.org/2000/svg';
  var MODES = DATA.modes;
  var TONICS = DATA.tonics;                      // chromatic order, C first
  var NAT = [0, 2, 4, 5, 7, 9, 11];
  var LETTERS = 'CDEFGAB';
  var SHARPS = [3, 0, 4, 1, 5, 2, 6];            // F C G D A E B
  var FLATS = [6, 2, 5, 1, 4, 0, 3];             // B E A D G C F
  var SIG_STEPS = { sharp: [38, 35, 39, 36, 33, 37, 34], flat: [34, 37, 33, 36, 32, 35, 31] };
  var ACC_SHOW = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯' };
  var ACC_GLYPH = { '-1': 'accidentalFlat', '0': 'accidentalNatural', '1': 'accidentalSharp' };
  var UP = '↑', DOWN = '↓';
  // Moersch's four steps, in order
  var STAGES = {
    single: 'One mode at a time',
    chain: 'All modes together',
    levels: 'All modes, twelve keys',
    full: 'Full version'
  };
  var HOW = {
    single: 'Begin slowly, within a single octave: up and down the same mode before changing to the next, listening to how the quality changes.',
    chain: 'All eight modes in order, still within a single octave: ascend in one mode and descend in the next, Ionian through Locrian, ending on the tonic.',
    levels: 'The same eight modes, up one and down the next, transposed up by half steps until all twelve pitch levels have been completed.',
    full: 'All eight modes at all twelve pitch levels without a pause: the descending Locrian stops on ♭2 and strikes it twice, and that second strike is the new tonic, a half step up. The goal is to start on C, in eighth-note triplets, three octaves, at quarter note = 120.'
  };
  var RHYTHM = { 1: 'q', 2: '8', 3: 't' };
  var DUR = { q: 1, '8': 0.5, t: 1 / 3 };
  var NOTE_W = { q: 4.5, '8': 2.8, t: 2.6 };
  var RHYTHM_NAME = { q: 'quarter notes', '8': 'eighth notes', t: 'eighth-note triplets' };

  // Engraving sizes, in staff spaces (Bravura's engraving defaults where it has them)
  var SYS_H = 4, MID = 2;                       // one treble staff; its middle line
  var HEAD_W = 1.18, STEM_W = 0.12, STEM_LEN = 3.5, BEAM_T = 0.5, LEDGER_T = 0.16, LEDGER_X = 0.4;
  var ACC_SLOT = 1.3, DBL_SLOT = 2.1, BAR_LEAD = 1.6, PICKUP_LEAD = 0.6;

  MODES.forEach(function (m) {
    m.altIdx = m.alt.map(function (a) { return parseInt(a.slice(1), 10) - 1; });
    m.altKind = {};                                   // degree index -> 'sharp' | 'flat'
    m.alt.forEach(function (a) { m.altKind[parseInt(a.slice(1), 10) - 1] = a.charAt(0) === '#' ? 'sharp' : 'flat'; });
    m.chips = m.alt.map(function (a) { return { kind: a.charAt(0) === '#' ? 'sharp' : 'flat', text: (a.charAt(0) === '#' ? '♯' : '♭') + a.slice(1) }; });
    m.altText = m.chips.map(function (c) { return c.text; }).join(' ');
  });
  var byId = {};
  TONICS.forEach(function (t) { byId[t.id] = t; });

  var sheet = root.querySelector('.mo-sections');
  var titleEl = root.querySelector('.mo-title');
  var howEl = root.querySelector('.mo-how');
  var rangeEl = root.querySelector('.mo-range');
  var tonicNameEl = root.querySelector('.mo-tonic-name');
  var controls = document.querySelector('.sc-controls');
  var nowEl = controls.querySelector('.mo-now');
  var nowLevelEl = controls.querySelector('.mo-now-level');
  var bpmInput = document.getElementById('mo-bpm');
  var bpmOut = document.getElementById('mo-bpm-out');
  var clickBox = document.getElementById('mo-click');
  var loopBox = document.getElementById('mo-loop');
  var playBtns = document.querySelectorAll('.mo-play-all');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = { tonic: 'c', stage: 'single', oct: 1, simple: false };
  var ex = null;           // the built exercise
  var evEls = {};          // note index -> svg groups
  var lastWidth = 0;

  /* ---------- Spelling ---------- */

  function accOf(pc, letter) {
    var d = ((pc - NAT[letter]) % 12 + 12) % 12;
    return d > 6 ? d - 12 : d;
  }

  function sigArray(sig) {
    var a = [0, 0, 0, 0, 0, 0, 0];
    var i;
    if (sig > 0) for (i = 0; i < sig; i++) a[SHARPS[i]] = 1;
    else for (i = 0; i < -sig; i++) a[FLATS[i]] = -1;
    return a;
  }

  function noteName(letter, acc) {
    return LETTERS.charAt(letter) + (ACC_SHOW[String(acc)] || '');
  }

  // How one mode on one tonic is spelled. The letters follow from the tonic's letter; the
  // alterations of the major key are written as accidentals against that key's signature.
  // "Simplest" spelling drops the signature and may respell the tonic (D flat Dorian is written
  // C sharp Dorian) so that no note needs a double flat.
  function spelling(tonic, mode, simple) {
    var cands = [{ letter: tonic.letter, acc: tonic.acc }];
    if (simple && tonic.acc < 0) {
      var l2 = (tonic.letter + 6) % 7;
      cands.push({ letter: l2, acc: accOf(tonic.pc, l2) });
    }
    var pick = null;
    cands.forEach(function (c, ci) {
      if (pick) return;
      var degs = mode.steps.map(function (s, d) {
        var letter = (c.letter + d) % 7;
        var pc = (tonic.pc + s) % 12;
        return { letter: letter, pc: pc, acc: accOf(pc, letter) };
      });
      var ok = degs.every(function (x) { return Math.abs(x.acc) <= (simple ? 1 : 2); });
      if (ok || ci === cands.length - 1) pick = { letter: c.letter, acc: c.acc, degs: degs };
    });
    pick.sig = simple ? 0 : tonic.sig;
    pick.name = noteName(pick.letter, pick.acc);
    return pick;
  }

  /* ---------- Building the exercise ---------- */

  // The low tonic of the exercise, as a MIDI note. One octave sits around middle C; two and three
  // octaves use the register of the skills test, except that the twelve-level version starts low
  // enough for its last level to stay under the top C of the marimba.
  function registerFor(st, tonic) {
    if (st.oct === 1) return 60 + tonic.pc;
    if (st.stage === 'single' || st.stage === 'chain') return tonic.low;
    if (st.oct === 2) return 48 + tonic.pc;
    return tonic.pc <= 1 ? 48 + tonic.pc : 36 + tonic.pc;
  }

  function build(st) {
    var oct = st.oct;
    var r = RHYTHM[oct];
    var n = 7 * oct;
    var tonic0 = byId[st.tonic];
    var groups = [];
    var notes = [];
    var bars = [];
    var clock = 0;

    function makeNote(spell, mode, low, d, rh) {
      var deg = spell.degs[d % 7];
      var o = Math.floor(d / 7);
      var octave = Math.floor((low - spell.acc) / 12) - 1;    // octave of the written tonic letter
      var nt = {
        i: notes.length, midi: low + 12 * o + mode.steps[d % 7], step: octave * 7 + spell.letter + d,
        letter: deg.letter, acc: deg.acc, alt: mode.altIdx.indexOf(d % 7) >= 0, altKind: mode.altKind[d % 7] || '',
        r: rh, dur: DUR[rh], t: clock, show: null
      };
      clock += nt.dur;
      notes.push(nt);
      return nt;
    }

    function addBar(group, spell, mode, low, kind) {
      var degrees = [];
      var k;
      if (kind === 'pickup') degrees = [0];
      else {
        if (kind === 'up' || kind === 'updown') for (k = 1; k <= n; k++) degrees.push(k);
        if (kind === 'down' || kind === 'updown') for (k = n - 1; k >= 0; k--) degrees.push(k);
        if (kind === 'downb2') { for (k = n - 1; k >= 1; k--) degrees.push(k); degrees.push(1); }
      }
      var bar = {
        index: bars.length, pickup: kind === 'pickup', sig: spell.sig, units: [], notes: [], group: group,
        label: kind === 'pickup' ? null : {
          name: spell.name + ' ' + mode.name,
          dir: kind === 'up' ? UP : kind === 'updown' ? UP + DOWN : DOWN,
          alts: mode.altText || 'no alterations', chips: mode.chips
        }
      };
      var per = kind === 'pickup' ? 1 : oct;
      degrees.forEach(function (d, j) {
        var nt = makeNote(spell, mode, low, d, kind === 'pickup' ? 'q' : r);
        nt.bar = bar.index;
        var ui = Math.floor(j / per);
        if (!bar.units[ui]) bar.units.push({ notes: [], index: ui, bar: bar, tuplet: per === 3 });
        bar.units[ui].notes.push(nt);
        nt.unit = ui;
        bar.notes.push(nt);
      });
      // Accidentals: the key signature holds until a note contradicts it, then the mark holds to
      // the end of the bar for that note in that octave.
      var memo = {};
      var sigArr = sigArray(spell.sig);
      bar.notes.forEach(function (nt) {
        var cur = memo[nt.step] === undefined ? sigArr[nt.letter] : memo[nt.step];
        if (nt.acc !== cur) { nt.show = nt.acc; memo[nt.step] = nt.acc; }
      });
      bar.notes.forEach(function (nt) {
        nt.w = NOTE_W[nt.r] + (nt.show === null ? 0 : nt.show === -2 ? DBL_SLOT : ACC_SLOT);
      });
      bar.units.forEach(function (u) {
        u.w = u.notes.reduce(function (s, x) { return s + x.w; }, 0);
      });
      bar.lead = bar.pickup ? PICKUP_LEAD : BAR_LEAD;
      bar.w = bar.lead + bar.units.reduce(function (s, u) { return s + u.w; }, 0);
      bars.push(bar);
      group.bars.push(bar);
      return bar;
    }

    if (st.stage === 'single') {
      MODES.forEach(function (mode) {
        var spell = spelling(tonic0, mode, st.simple);
        var low = registerFor(st, tonic0);
        var names = spell.degs.map(function (d, k) {
          var kind = mode.altKind[k];
          return kind ? '<b class="' + kind + '">' + noteName(d.letter, d.acc) + '</b>' : noteName(d.letter, d.acc);
        });
        var chips = mode.chips.length
          ? mode.chips.map(function (c) { return '<span class="mo-deg ' + c.kind + '">' + c.text + '</span>'; }).join('')
          : '<span class="mo-deg">0</span>';
        var group = { bars: [], head: {
          title: spell.name + ' ' + mode.name,
          sub: '<span class="mo-chips">' + chips + '</span> ' + names.join(' ') + ' ' + names[0].replace(/<\/?b[^>]*>/g, '')
        } };
        groups.push(group);
        addBar(group, spell, mode, low, 'pickup');
        addBar(group, spell, mode, low, 'updown');
      });
    } else if (st.stage === 'chain') {
      var group = { bars: [], head: null };
      groups.push(group);
      var low0 = registerFor(st, tonic0);
      var first = spelling(tonic0, MODES[0], st.simple);
      addBar(group, first, MODES[0], low0, 'pickup');
      MODES.forEach(function (mode, k) {
        addBar(group, spelling(tonic0, mode, st.simple), mode, low0, k % 2 === 0 ? 'up' : 'down');
      });
    } else {
      // Twelve pitch levels, a half step apart. In the full version the levels are linked by the
      // double-struck flat 2 at the end of each Locrian; in the transposed single-octave version
      // each level ends on its tonic and the next begins on a new one.
      var linked = st.stage === 'full';
      var start = registerFor(st, tonic0);
      for (var L = 0; L < 12; L++) {
        var tonicL = TONICS[(tonic0.pc + L) % 12];
        var lowL = start + L;
        var spellL = spelling(tonicL, MODES[0], st.simple);
        var head = { title: 'Pitch level ' + (L + 1) + ' of 12: ' + tonicL.label, sub: '' };
        if (!st.simple) head.sub = 'Key signature of ' + tonicL.label + ' major';
        if (linked && L > 0) head.sub += (head.sub ? '. ' : '') + 'The new tonic is the second strike of the ♭2 that ended the last Locrian.';
        var g = { bars: [], head: head };
        groups.push(g);
        if (L === 0 || !linked) addBar(g, spellL, MODES[0], lowL, 'pickup');
        MODES.forEach(function (mode, k) {
          var kind = k % 2 === 0 ? 'up' : (k === 7 && linked) ? 'downb2' : 'down';
          addBar(g, spelling(tonicL, mode, st.simple), mode, lowL, kind);
        });
      }
    }

    // One treble staff. A beamed group that would need three or more ledger lines below the
    // staff is written an octave higher under 8vb; one that would need three or more above,
    // an octave lower under 8va. The group decides, so a beam is never split by a bracket.
    bars.forEach(function (bar) {
      bar.units.forEach(function (u) {
        var steps = u.notes.map(function (x) { return x.step; });
        var lo = Math.min.apply(null, steps);
        var hi = Math.max.apply(null, steps);
        u.shift = lo <= 25 ? -1 : hi >= 44 ? 1 : 0;        // G3 and below; E6 and above
        u.notes.forEach(function (x) { x.wstep = x.step - 7 * u.shift; });
      });
    });
    var lo = Infinity, hi = -Infinity;
    notes.forEach(function (x) { if (x.midi < lo) lo = x.midi; if (x.midi > hi) hi = x.midi; });
    return { groups: groups, bars: bars, notes: notes, beats: clock, lo: lo, hi: hi, rhythm: r };
  }

  /* ---------- Layout ---------- */

  function prefixWidth(sig) {
    return 3.9 + Math.abs(sig) * 1.05 + 1.2;
  }

  // Lines for one group: whole bars when they fit, split at the beams when they do not,
  // and the pickup always stays with the bar that follows it. When the scales are long
  // (more than half a line), every scale gets a line of its own so the group reads evenly.
  function layoutGroup(group, cap) {
    var lines = [];
    var cur = [];
    var curW = 0;
    var widest = Math.max.apply(null, group.bars.map(function (b) { return b.pickup ? 0 : b.w; }));
    var onePerLine = widest > cap * 0.6;
    function flush() {
      if (cur.length) lines.push({ chunks: cur, w: curW });
      cur = [];
      curW = 0;
    }
    function push(bar, ui) {
      var lead = ui === 0 ? bar.lead : 0;
      cur.push({ bar: bar, unit: bar.units[ui], lead: lead, start: ui === 0, end: ui === bar.units.length - 1 });
      curW += lead + bar.units[ui].w;
    }
    group.bars.forEach(function (bar) {
      var afterPickup = cur.length === 1 && cur[0].bar.pickup;
      if (onePerLine && cur.length && !afterPickup) flush();
      if (curW + bar.w <= cap) { bar.units.forEach(function (u, ui) { push(bar, ui); }); return; }
      if (cur.length && !afterPickup && bar.w <= cap) {
        flush();
        bar.units.forEach(function (u, ui) { push(bar, ui); });
        return;
      }
      // The bar is wider than a line: split it at the beams into parts of equal length
      if (cur.length && !afterPickup) flush();
      var room = cap - curW;
      var count = bar.units.length;
      var parts = Math.max(2, Math.ceil(bar.w / room));
      var slices;
      for (;;) {
        var per = Math.ceil(count / parts);
        var ok = true;
        slices = [];
        for (var s = 0; s < count; s += per) {
          var slice = bar.units.slice(s, s + per);
          var w = slice.reduce(function (a, u) { return a + u.w; }, 0) + (s === 0 ? bar.lead : 0);
          if (w > (s === 0 ? room : cap)) ok = false;
          slices.push(slice);
        }
        if (ok || parts >= count) break;
        parts++;
      }
      slices.forEach(function (slice, si) {
        if (si > 0) flush();
        slice.forEach(function (u) { push(bar, u.index); });
      });
    });
    flush();
    return lines;
  }

  function placeLine(line, li, count, prefix, cap) {
    var f = Math.max(1, cap / line.w);
    var ragged = false;
    if (count > 1 && li === count - 1 && f > 1.45) { f = 1.12; ragged = true; }   // a short last line
    else if (f > 2.0) { f = 2.0; ragged = true; }                                  // a short scale on a wide screen
    var x = prefix;
    line.placed = [];
    line.chunks.forEach(function (c) {
      c.x0 = x;
      x += c.lead * f;
      c.notes = c.unit.notes.map(function (nt) {
        var slot = nt.w * f;
        var p = { nt: nt, x: x + (nt.show === null ? 0 : (nt.show === -2 ? DBL_SLOT : ACC_SLOT) * Math.min(f, 1.25)), slot: slot, chunk: c };
        x += slot;
        return p;
      });
      c.x1 = x;
    });
    line.end = ragged ? x + 0.6 : prefix + cap + 1.0;
    line.first = li === 0;
    line.last = li === count - 1;
    return line;
  }

  /* ---------- Drawing ---------- */

  function r3(v) { return Math.round(v * 1000) / 1000; }

  function make(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function Drawing(sysH) {
    this.min = 0;
    this.max = sysH;
  }
  Drawing.prototype.see = function (a, b) {
    if (a < this.min) this.min = a;
    if (b > this.max) this.max = b;
  };
  Drawing.prototype.rect = function (parent, x, y, w, h, cls) {
    this.see(y, y + h);
    var a = { x: r3(x), y: r3(y), width: r3(w), height: r3(h) };
    if (cls) a['class'] = cls;
    return make('rect', a, parent);
  };
  Drawing.prototype.glyph = function (parent, name, x, y, sx, sy, top, bottom) {
    if (top !== undefined) this.see(y + top, y + bottom);
    var tf = 'translate(' + r3(x) + ' ' + r3(y) + ')' + (sx ? ' scale(' + sx + ' ' + (sy || sx) + ')' : '');
    return make('path', { d: G[name].d, transform: tf }, parent);
  };
  Drawing.prototype.text = function (parent, str, x, y, size, cls) {
    this.see(y - size * 0.8, y + size * 0.25);
    var t = make('text', { x: r3(x), y: r3(y), 'font-size': size, 'class': cls }, parent);
    t.textContent = str;
    return t;
  };

  function yOf(wstep) {
    return (38 - wstep) / 2;
  }

  function stemDir(ys) {
    var top = Math.min.apply(null, ys);
    var bot = Math.max.apply(null, ys);
    return (bot - MID) > (MID - top) ? 'up' : 'down';
  }

  function idealEnd(y, dir) {
    return dir === 'up' ? Math.min(y - STEM_LEN, MID) : Math.max(y + STEM_LEN, MID);
  }

  function ledgers(dw, g, nt, x) {
    var s;
    for (s = 28; s >= nt.wstep; s -= 2) dw.rect(g, x - LEDGER_X, yOf(s) - LEDGER_T / 2, HEAD_W + 2 * LEDGER_X, LEDGER_T);
    for (s = 40; s <= nt.wstep; s += 2) dw.rect(g, x - LEDGER_X, yOf(s) - LEDGER_T / 2, HEAD_W + 2 * LEDGER_X, LEDGER_T);
  }

  function head(dw, g, nt, x, y) {
    if (nt.show !== null) {
      if (nt.show === -2) {
        var w = G.accidentalFlat.w;
        dw.glyph(g, 'accidentalFlat', x - w - 0.22, y, 0, 0, -1.8, 1.4);
        dw.glyph(g, 'accidentalFlat', x - 2 * w - 0.22 + 0.16, y, 0, 0, -1.8, 1.4);
      } else {
        var name = ACC_GLYPH[String(nt.show)];
        dw.glyph(g, name, x - G[name].w - 0.22, y, 0, 0, -1.8, 1.4);
      }
    }
    dw.glyph(g, 'noteheadBlack', x, y, 0, 0, -0.5, 0.5);
  }

  function stemRect(dw, g, x, dir, fromY, toY) {
    var sx = dir === 'up' ? x + HEAD_W - STEM_W : x;
    var a = Math.min(fromY, toY);
    var b = Math.max(fromY, toY);
    dw.rect(g, sx, a, STEM_W, b - a);
    return sx;
  }

  function drawSystem(line, S, sig) {
    var dw = new Drawing(SYS_H);
    var svg = make('svg', { 'class': 'sc-system mo-system', role: 'img' });
    var g = make('g', {}, svg);

    for (var l = 0; l < 5; l++) dw.rect(g, 0, l - 0.065, line.end, 0.13);
    dw.rect(g, -0.08, 0, 0.16, SYS_H);
    dw.glyph(g, 'gClef', 0.6, 3, 0, 0, -4.4, 2.64);
    var n = Math.abs(sig);
    var kind = sig > 0 ? 'sharp' : 'flat';
    var accName = sig > 0 ? 'accidentalSharp' : 'accidentalFlat';
    for (var i = 0; i < n; i++) {
      dw.glyph(g, accName, 3.85 + i * 1.05, (38 - SIG_STEPS[kind][i]) / 2, 0, 0, -1.8, 1.4);
    }

    var tops = {};        // bar index -> highest point drawn in its first beats (for the label)
    function seeTop(bar, unitIndex, y) {
      if (unitIndex > 2) return;
      if (tops[bar.index] === undefined || y < tops[bar.index]) tops[bar.index] = y;
    }
    // Extent of what each chunk drew, for the ottava brackets
    line.chunks.forEach(function (c) { c.top = Infinity; c.bottom = -Infinity; });
    function extent(c, top, bottom) {
      if (top < c.top) c.top = top;
      if (bottom > c.bottom) c.bottom = bottom;
    }

    function groupFor(nt, extra) {
      var gg = make('g', { 'class': 'ev' + (nt.alt ? ' alt ' + nt.altKind : '') + (extra || ''), 'data-i': nt.i }, g);
      (evEls[nt.i] = evEls[nt.i] || []).push(gg);
      return gg;
    }

    // A beamed group (eighths or a triplet), the beam sloped with the line of notes
    function beamed(c) {
      var ps = c.notes;
      var ys = ps.map(function (p) { return yOf(p.nt.wstep); });
      var dir = stemDir(ys);
      var xs = ps.map(function (p) { return dir === 'up' ? p.x + HEAD_W - STEM_W : p.x; });
      var req = ys.map(function (y) { return idealEnd(y, dir); });
      var m = ps.length;
      var rise = Math.max(-1.25, Math.min(1.25, (ys[m - 1] - ys[0]) * 0.5));
      var inner = ys.slice(1, -1);
      if (inner.length) {
        if (dir === 'up' && Math.min.apply(null, inner) < Math.min(ys[0], ys[m - 1])) rise = 0;
        if (dir === 'down' && Math.max.apply(null, inner) > Math.max(ys[0], ys[m - 1])) rise = 0;
      }
      var slope = m > 1 ? rise / (xs[m - 1] - xs[0]) : 0;
      var startY = dir === 'up' ? Infinity : -Infinity;
      req.forEach(function (rq, k) {
        var cand = rq - slope * (xs[k] - xs[0]);
        startY = dir === 'up' ? Math.min(startY, cand) : Math.max(startY, cand);
      });
      var L = function (x) { return startY + slope * (x - xs[0]); };
      ps.forEach(function (p, k) {
        var gg = groupFor(p.nt);
        var y = ys[k];
        ledgers(dw, gg, p.nt, p.x);
        head(dw, gg, p.nt, p.x, y);
        var end = L(xs[k]);
        stemRect(dw, gg, p.x, dir, dir === 'up' ? y - 0.168 : y + 0.168, end);
        var top = Math.min(dir === 'up' ? end : y - 0.5, p.nt.show === null ? y : y - 1.8);
        var bottom = Math.max(dir === 'up' ? y + 0.5 : end, p.nt.show === null ? y : y + 1.4);
        seeTop(c.bar, c.unit.index, top);
        extent(c, top, bottom);
      });
      var x1 = xs[0];
      var x2 = xs[m - 1] + STEM_W;
      var y1 = L(x1);
      var y2 = L(x2);
      var off = dir === 'up' ? BEAM_T : -BEAM_T;
      dw.see(Math.min(y1, y2, y1 + off, y2 + off), Math.max(y1, y2, y1 + off, y2 + off));
      extent(c, Math.min(y1, y2, y1 + off, y2 + off), Math.max(y1, y2, y1 + off, y2 + off));
      make('polygon', {
        points: [[x1, y1], [x2, y2], [x2, y2 + off], [x1, y1 + off]].map(function (q) { return r3(q[0]) + ',' + r3(q[1]); }).join(' '),
        'class': 'beam'
      }, g);
      if (c.unit.tuplet) {
        var cx = (x1 + x2) / 2;
        var cy = L(cx);
        var ty = dir === 'up' ? cy - 0.75 : cy + 1.75;
        dw.text(g, '3', cx, ty, 1.5, 'tup');
        seeTop(c.bar, c.unit.index, ty - 1.3);
        extent(c, ty - 1.3, ty + 0.3);
      }
    }

    // A quarter note on its own
    function single(p) {
      var c = p.chunk;
      var gg = groupFor(p.nt);
      var y = yOf(p.nt.wstep);
      ledgers(dw, gg, p.nt, p.x);
      head(dw, gg, p.nt, p.x, y);
      var dir = stemDir([y]);
      var end = idealEnd(y, dir);
      stemRect(dw, gg, p.x, dir, dir === 'up' ? y - 0.168 : y + 0.168, end);
      var top = Math.min(dir === 'up' ? end : y - 0.5, p.nt.show === null ? y : y - 1.8);
      var bottom = Math.max(dir === 'up' ? y + 0.5 : end, p.nt.show === null ? y : y + 1.4);
      seeTop(c.bar, c.unit.index, top);
      extent(c, top, bottom);
    }

    line.chunks.forEach(function (c, ci) {
      // Barline before a bar that starts here (the system line covers the first one)
      if (c.start && ci > 0) dw.rect(g, c.x0 - 0.08, 0, 0.16, SYS_H);
      if (c.unit.notes[0].r === 'q') c.notes.forEach(single);
      else beamed(c);
    });

    // Ottava brackets: a run of neighboring groups written an octave away from where they sound
    var runs = [];
    var open = null;
    line.chunks.forEach(function (c) {
      if (c.unit.shift && open && open.shift === c.unit.shift) open.chunks.push(c);
      else if (c.unit.shift) { open = { shift: c.unit.shift, chunks: [c] }; runs.push(open); }
      else open = null;
    });
    runs.forEach(function (run) {
      var first = run.chunks[0];
      var lastC = run.chunks[run.chunks.length - 1];
      var p0 = first.notes[0];
      var pN = lastC.notes[lastC.notes.length - 1];
      var xa = p0.x - (p0.nt.show === null ? 0 : (p0.nt.show === -2 ? 1.9 : 1.2));
      var xb = pN.x + HEAD_W + 0.2;
      var top = Math.min.apply(null, run.chunks.map(function (c) { return c.top; }));
      var bottom = Math.max.apply(null, run.chunks.map(function (c) { return c.bottom; }));
      var y, hook;
      if (run.shift > 0) {
        y = Math.min(-1.6, top - 1.1);
        hook = 1.0;
        dw.text(g, '8va', xa, y + 0.45, 1.45, 'ott-text');
      } else {
        y = Math.max(SYS_H + 1.6, bottom + 1.3);
        hook = -1.0;
        dw.text(g, '8vb', xa, y + 0.45, 1.45, 'ott-text');
      }
      var xText = xa + 2.9;
      if (xb > xText + 0.6) {
        make('path', { d: 'M' + r3(xText) + ' ' + r3(y) + 'H' + r3(xb) + 'v' + r3(hook), 'class': 'ott', 'stroke-dasharray': '0.9 0.55' }, g);
      }
      run.chunks.forEach(function (c) { if (c.start) seeTop(c.bar, 0, y - 1.3); });
    });

    // Mode names over the start of each bar
    line.chunks.forEach(function (c) {
      if (!c.start || !c.bar.label) return;
      var top = tops[c.bar.index] === undefined ? -1 : tops[c.bar.index];
      var base = Math.min(-3.1, top - 1.1);
      var x = c.notes[0].x - (c.notes[0].nt.show === null ? 0 : 1.0);
      // The alterations come first, as colored chips, then the mode
      var chips = c.bar.label.chips.length ? c.bar.label.chips : [{ kind: 'none', text: '0' }];
      var CH = 1.75, CW = 2.45, GAP = 0.3;
      chips.forEach(function (ch, k) {
        var cx = x + k * (CW + GAP);
        make('rect', { x: r3(cx), y: r3(base - 1.3), width: CW, height: CH, rx: 0.45, 'class': 'chip ' + ch.kind }, g);
        var ct = make('text', { x: r3(cx + CW / 2), y: r3(base + 0.02), 'font-size': 1.25, 'class': 'chip-text ' + ch.kind }, g);
        ct.textContent = ch.text;
      });
      var t = make('text', { x: r3(x + chips.length * (CW + GAP) + 0.5), y: r3(base), 'class': 'lbl' }, g);
      t.textContent = c.bar.label.name + ' ' + c.bar.label.dir;
      dw.see(base - 1.9, base + 0.5);
    });

    // The end of the line: a final barline when the exercise ends, a barline when a bar ends
    var lastChunk = line.chunks[line.chunks.length - 1];
    if (line.final) {
      dw.rect(g, line.end - 0.98, 0, 0.16, SYS_H);
      dw.rect(g, line.end - 0.5, 0, 0.5, SYS_H);
    } else if (lastChunk.end) {
      dw.rect(g, line.end - 0.16, 0, 0.16, SYS_H);
    }

    var x0 = -0.5;
    var y0 = dw.min - 0.9;
    var w = line.end - x0 + 0.3;
    var h = dw.max - y0 + 0.9;
    svg.setAttribute('viewBox', [r3(x0), r3(y0), r3(w), r3(h)].join(' '));
    svg.setAttribute('width', Math.round(w * S));
    svg.setAttribute('height', Math.round(h * S));
    return svg;
  }

  /* ---------- Page ---------- */

  function midiName(m) {
    var names = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
    return names[m % 12] + (Math.floor(m / 12) - 1);
  }

  function render() {
    stop();
    var width = sheet.clientWidth || root.clientWidth;
    lastWidth = width;
    var S = width < 560 ? 6.4 : width < 900 ? 7.4 : 8.6;
    var avail = width / S - 1.9;
    ex = build(state);
    evEls = {};
    sheet.innerHTML = '';
    var tonic = byId[state.tonic];

    titleEl.textContent = STAGES[state.stage];
    howEl.textContent = HOW[state.stage];
    nowEl.textContent = tonic.label + ', ' + STAGES[state.stage].toLowerCase() + ', ' + state.oct + (state.oct === 1 ? ' octave' : ' octaves');
    nowLevelEl.textContent = '';
    var range = 'Range: ' + midiName(ex.lo) + ' to ' + midiName(ex.hi) + ', in ' + RHYTHM_NAME[ex.rhythm] + '.';
    if (ex.lo < 45) range += ' Below A2 this needs a five-octave marimba; on a 4.3-octave instrument start on C or D♭.';
    rangeEl.textContent = range;

    var groupCount = ex.groups.length;
    ex.groups.forEach(function (group, gi) {
      var wrap = document.createElement('section');
      wrap.className = 'sc-sec mo-group';
      wrap.setAttribute('data-group', gi);
      if (group.head) {
        var headEl = document.createElement('div');
        headEl.className = 'sc-sec-head';
        var hid = 'mo-h-' + gi;
        headEl.innerHTML = '<div><h3 id="' + hid + '">' + group.head.title + '</h3>' +
          (group.head.sub ? '<p>' + group.head.sub + '</p>' : '') + '</div>' +
          (state.stage === 'single' ? '<button class="btn btn-outline-dark mo-play-group" type="button" data-group="' + gi + '" aria-pressed="false"><span>Play</span></button>' : '');
        wrap.setAttribute('aria-labelledby', hid);
        wrap.appendChild(headEl);
      }
      var score = document.createElement('div');
      score.className = 'sc-score';
      var sig = group.bars[0].sig;
      var cap = Math.max(12, avail - prefixWidth(sig) - 1.0);
      var lines = layoutGroup(group, cap);
      lines.forEach(function (line, li) {
        placeLine(line, li, lines.length, prefixWidth(sig), cap);
        line.final = gi === groupCount - 1 && li === lines.length - 1;
        var svg = drawSystem(line, S, sig);
        svg.setAttribute('aria-label', (group.head ? group.head.title : STAGES[state.stage]) + (li ? ', continued' : ''));
        score.appendChild(svg);
      });
      wrap.appendChild(score);
      sheet.appendChild(wrap);
    });
    fillTable();
  }

  // The reference table: the notes of every mode on the chosen tonic
  function fillTable() {
    var tonic = byId[state.tonic];
    tonicNameEl.textContent = tonic.label;
    MODES.forEach(function (mode) {
      var spell = spelling(tonic, mode, state.simple);
      var row = root.querySelector('.mo-table tr[data-mode="' + mode.id + '"]');
      if (!row) return;
      var cell = row.querySelector('.mo-notes');
      cell.innerHTML = '';
      spell.degs.concat([spell.degs[0]]).forEach(function (d, k) {
        var span = document.createElement('span');
        var kind = mode.altKind[k % 7];
        span.className = kind ? 'mo-n alt ' + kind : 'mo-n';
        span.textContent = noteName(d.letter, d.acc);
        cell.appendChild(span);
      });
    });
  }

  function setState(changes, push) {
    var k;
    for (k in changes) if (Object.prototype.hasOwnProperty.call(changes, k)) state[k] = changes[k];
    var tonic = byId[state.tonic] || byId.c;
    state.tonic = tonic.id;
    root.querySelectorAll('.sc-key[data-tonic]').forEach(function (a) {
      if (a.getAttribute('data-tonic') === tonic.id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    root.querySelectorAll('.mo-stage button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-stage') === state.stage ? 'true' : 'false');
    });
    root.querySelectorAll('.mo-oct button').forEach(function (b) {
      b.setAttribute('aria-pressed', parseInt(b.getAttribute('data-oct'), 10) === state.oct ? 'true' : 'false');
    });
    root.querySelectorAll('.mo-spell button').forEach(function (b) {
      b.setAttribute('aria-pressed', (b.getAttribute('data-spell') === 'simple') === state.simple ? 'true' : 'false');
    });
    if (push && location.hash !== '#' + tonic.id) history.replaceState(null, '', '#' + tonic.id);
    try { localStorage.setItem('modesState', JSON.stringify({ stage: state.stage, oct: state.oct, simple: state.simple })); } catch (e) { /* optional */ }
    render();
  }

  root.addEventListener('click', function (e) {
    var a = e.target.closest('a.sc-key[data-tonic]');
    if (a) { e.preventDefault(); setState({ tonic: a.getAttribute('data-tonic') }, true); return; }
    var b = e.target.closest('.mo-stage button, .mo-oct button, .mo-spell button');
    if (b) {
      if (b.hasAttribute('data-stage')) setState({ stage: b.getAttribute('data-stage') });
      else if (b.hasAttribute('data-oct')) setState({ oct: parseInt(b.getAttribute('data-oct'), 10) });
      else setState({ simple: b.getAttribute('data-spell') === 'simple' });
      return;
    }
    var pg = e.target.closest('.mo-play-group');
    if (pg) {
      if (playing && playing.source === pg) { stop(); return; }
      var gi = parseInt(pg.getAttribute('data-group'), 10);
      var items = ex.groups[gi].bars.reduce(function (list, bar) {
        return list.concat(bar.notes.map(function (nt) { return { b: nt.t, midis: [nt.midi], id: nt.i }; }));
      }, []);
      var t0 = items[0].b;
      items.forEach(function (it) { it.b -= t0; });
      var last = ex.groups[gi].bars[ex.groups[gi].bars.length - 1].notes;
      start(items, last[last.length - 1].t + last[last.length - 1].dur - t0, pg);
      return;
    }
    var hear = e.target.closest('.mo-hear-btn');
    if (hear) {
      if (playing && playing.source === hear) { stop(); return; }
      var mode = MODES.filter(function (m) { return m.id === hear.getAttribute('data-mode'); })[0];
      var tonic = byId[state.tonic];
      var low = 60 + tonic.pc;
      var seq = [];
      var k;
      for (k = 0; k <= 7; k++) seq.push(k);
      for (k = 6; k >= 0; k--) seq.push(k);
      var list = seq.map(function (d, j) {
        return { b: j * 0.5, midis: [low + 12 * Math.floor(d / 7) + mode.steps[d % 7]], id: -1 };
      });
      start(list, seq.length * 0.5 + 0.5, hear, 'half');
    }
  });

  window.addEventListener('hashchange', function () {
    var id = location.hash.slice(1);
    if (byId[id] && byId[id].id !== state.tonic) setState({ tonic: id });
  });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (Math.abs((sheet.clientWidth || 0) - lastWidth) > 4) render();
    }, 160);
  });

  /* ---------- Sound ---------- */

  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var master = null;
  var playing = null;

  function audio() {
    if (!ctx) {
      ctx = new AC();
      master = chain();
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function chain() {
    var comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    var gain = ctx.createGain();
    gain.gain.value = 0.5;
    gain.connect(comp);
    return gain;
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
      var gn = ctx.createGain();
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(p[1], t + 0.004);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
      o.connect(gn);
      gn.connect(master);
      o.start(t);
      o.stop(t + p[2] + 0.05);
    });
  }

  function click(t, strong) {
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = strong ? 1760 : 1320;
    var gn = ctx.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(strong ? 0.22 : 0.14, t + 0.001);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    o.connect(gn);
    gn.connect(master);
    o.start(t);
    o.stop(t + 0.06);
  }

  function clearMarks() {
    sheet.querySelectorAll('.ev.on').forEach(function (x) { x.classList.remove('on'); });
  }

  function mark(id) {
    clearMarks();
    var els = evEls[id];
    if (!els || !playing) return;
    els.forEach(function (x) { x.classList.add('on'); });
    // The sticky bar follows the pitch level as the exercise moves through the keys
    var bar = ex.bars[ex.notes[id].bar];
    var head = bar.group.head;
    var parts = [];
    if (head && ex.groups.length > 1 && playing.source && playing.source.classList.contains('mo-play-all')) parts.push(head.title);
    if (bar.label) parts.push(bar.label.name + ' ' + bar.label.dir + ' ' + (bar.label.chips.length ? bar.label.alts : 'no alterations'));
    var where = parts.join(' · ');
    if (where !== playing.where) {
      playing.where = where;
      nowLevelEl.textContent = where ? ' · ' + where : '';
    }
    var sys = els[0].closest('svg');
    if (sys && sys !== playing.lastSystem) {
      playing.lastSystem = sys;
      var box = sys.getBoundingClientRect();
      if (box.top < 150 || box.bottom > window.innerHeight - 20) {
        sys.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }
  }

  function setButtons(on, source) {
    var whole = !source || source.classList.contains('mo-play-all');
    playBtns.forEach(function (btn) {
      btn.setAttribute('aria-pressed', on && whole ? 'true' : 'false');
      btn.querySelector('span').textContent = on && whole ? 'Stop' : 'Play';
    });
    root.querySelectorAll('.mo-play-group').forEach(function (btn) {
      var mine = on && source === btn;
      btn.setAttribute('aria-pressed', mine ? 'true' : 'false');
      btn.querySelector('span').textContent = mine ? 'Stop' : 'Play';
    });
    root.querySelectorAll('.mo-hear-btn').forEach(function (btn) {
      var mine = on && source === btn;
      btn.classList.toggle('on', mine);
      var row = btn.closest('tr');
      if (row) row.classList.toggle('on', mine);
    });
  }

  function stop() {
    if (!playing) return;
    clearInterval(playing.timer);
    playing.timeouts.forEach(clearTimeout);
    setButtons(false);
    clearMarks();
    nowLevelEl.textContent = '';
    if (ctx) {
      master.disconnect();
      master = chain();
    }
    playing = null;
  }

  // items: [{b: beat, midis: [...], id: note index or -1}], total: length in beats
  function start(items, total, source, clickMode) {
    audio();
    stop();
    var useClick = clickBox.checked && clickMode !== 'half';
    playing = {
      items: items, total: total, idx: 0, timeouts: [], lastSystem: null, source: source,
      beat: useClick ? -4 : 0, time: ctx.currentTime + 0.12, click: useClick, noLoop: clickMode === 'half'
    };
    setButtons(true, source);
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
        if (loopBox.checked && !p.noLoop) {
          p.idx = 0;
          p.beat = 0;
          continue;
        }
        var endAt = p.time;
        p.timeouts.push(setTimeout(function () { if (playing === p) stop(); }, Math.max(0, (endAt - ctx.currentTime) * 1000 + 700)));
        clearInterval(p.timer);
        return;
      }
      if (p.click && Math.abs(b - Math.round(b)) < 1e-6) click(p.time, b === -4 || b === 0);
      while (p.idx < p.items.length && p.items[p.idx].b < b + 1e-6) {
        var it = p.items[p.idx];
        it.midis.forEach(function (m) { bar(p.time, m, 0.34); });
        (function (id, when) {
          p.timeouts.push(setTimeout(function () { if (playing === p) mark(id); }, Math.max(0, (when - ctx.currentTime) * 1000)));
        })(it.id, p.time);
        p.idx++;
      }
      var nextNote = p.idx < p.items.length ? p.items[p.idx].b : p.total;
      var nextBeat = Math.floor(b + 1e-6) + 1;
      var nb = Math.min(nextNote, p.click || b < 0 ? nextBeat : Infinity);
      if (nb <= b + 1e-6) nb = nextBeat;
      p.time += (nb - b) * spb;
      p.beat = nb;
      if (p.timeouts.length > 600) p.timeouts = p.timeouts.slice(-300);
    }
  }

  playBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (playing && playing.source && playing.source.classList.contains('mo-play-all')) { stop(); return; }
      var items = ex.notes.map(function (nt) { return { b: nt.t, midis: [nt.midi], id: nt.i }; });
      start(items, ex.beats, btn);
    });
  });
  bpmInput.addEventListener('input', function () {
    bpmOut.textContent = bpmInput.value;
    try { localStorage.setItem('modesTempo', bpmInput.value); } catch (e) { /* optional */ }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });

  try {
    var savedTempo = parseInt(localStorage.getItem('modesTempo'), 10);
    if (savedTempo >= 40 && savedTempo <= 160) bpmInput.value = savedTempo;
    var saved = JSON.parse(localStorage.getItem('modesState') || 'null');
    if (saved) {
      if (STAGES[saved.stage]) state.stage = saved.stage;
      if ([1, 2, 3].indexOf(saved.oct) >= 0) state.oct = saved.oct;
      state.simple = !!saved.simple;
    }
  } catch (e) { /* storage is optional */ }
  bpmOut.textContent = bpmInput.value;

  if (!AC) {
    playBtns.forEach(function (b) { b.hidden = true; });
    controls.querySelectorAll('.rud-tempo, .rud-opt').forEach(function (x) { x.hidden = true; });
  } else {
    playBtns.forEach(function (b) { b.hidden = false; });
    root.querySelectorAll('.mo-hear-btn').forEach(function (b) { b.hidden = false; });
  }
  controls.hidden = false;
  var startId = location.hash.slice(1);
  setState({ tonic: byId[startId] ? startId : 'c' }, false);
})();
