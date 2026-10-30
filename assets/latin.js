/* Latin Grooves (latin.html)
 * Plays the Afro-Cuban parts drawn on the page, all locked to one clock, with parts that
 * can be muted, a clave that turns around (3-2 or 2-3), and son or rumba clave.
 * Every sound is synthesized here with the Web Audio API; there are no audio files.
 */
(function () {
  'use strict';
  var sheet = document.querySelector('.lp-sheet');
  var controls = document.querySelector('.lp-controls');
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!sheet || !controls) return;

  var playBtn = controls.querySelector('.lp-play');
  var bpmInput = document.getElementById('lp-bpm');
  var bpmOut = document.getElementById('lp-bpm-out');
  var dirGroup = controls.querySelector('.lp-dir');
  var typeGroup = controls.querySelector('.lp-type');
  var tabs = document.querySelector('.lp-tabs');

  var styleEl = sheet.querySelector('.lp-style:not([hidden])');
  var dir = '32';
  var clave = 'son';
  var BASS = { C: 48, G: 43, F: 41, D: 50 };

  /* ---------- Patterns as shown ---------- */

  function patternFor(row) {
    var p = row.getAttribute('data-pattern');
    if (row.getAttribute('data-part') === 'clave' && clave === 'rumba') p = row.getAttribute('data-rumba');
    if (p.length === 16 && dir === '23') p = p.slice(8) + p.slice(0, 8);
    return p;
  }

  function drawRow(row) {
    var p = patternFor(row);
    row.querySelectorAll('.lp-grid .st').forEach(function (cell, i) {
      var c = p.charAt(i);
      cell.textContent = c === '.' ? '' : (c === 'X' ? '●' : c);
      cell.classList.toggle('hit', c !== '.');
    });
  }

  function drawAll() {
    sheet.querySelectorAll('.lp-row[data-pattern]').forEach(drawRow);
    sheet.querySelectorAll('.lp-sides').forEach(function (s) {
      s.querySelector('.lp-side-a').textContent = dir === '32' ? '3 side' : '2 side';
      s.querySelector('.lp-side-b').textContent = dir === '32' ? '2 side' : '3 side';
    });
  }

  function press(group, attr, value) {
    group.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute(attr) === value ? 'true' : 'false');
    });
  }

  function showStyle(id, push) {
    stopMarks();
    sheet.querySelectorAll('.lp-style').forEach(function (s) { s.hidden = s.id !== id; });
    styleEl = document.getElementById(id);
    press(tabs, 'data-style', id);
    var hasClave = styleEl.getAttribute('data-clave') === 'yes';
    dirGroup.hidden = !hasClave;
    typeGroup.hidden = !hasClave;
    bpmInput.value = styleEl.getAttribute('data-tempo');
    bpmOut.textContent = bpmInput.value;
    if (playing) { playing.step = 0; }
    if (push && history.replaceState) history.replaceState(null, '', '#' + id);
  }

  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-style]');
    if (b) showStyle(b.getAttribute('data-style'), true);
  });
  dirGroup.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-dir]');
    if (!b) return;
    dir = b.getAttribute('data-dir');
    press(dirGroup, 'data-dir', dir);
    drawAll();
  });
  typeGroup.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-type]');
    if (!b) return;
    clave = b.getAttribute('data-type');
    press(typeGroup, 'data-type', clave);
    drawAll();
  });
  sheet.addEventListener('click', function (e) {
    var b = e.target.closest('.lp-mute');
    if (!b) return;
    var on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', b.textContent + (on ? ' on' : ' off'));
    b.closest('.lp-row').classList.toggle('is-muted', !on);
  });
  bpmInput.addEventListener('input', function () { bpmOut.textContent = bpmInput.value; });

  /* ---------- Sounds ---------- */

  var ctx = null;
  var master = null;
  var noise = null;

  function audio() {
    if (!ctx) {
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(comp);
      var len = Math.floor(ctx.sampleRate * 0.5);
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      var ch = noise.getChannelData(0);
      for (var i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function env(t, peak, decay, attack) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (attack || 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    g.connect(master);
    return g;
  }

  function tone(t, type, f, peak, decay, fEnd) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, t + decay);
    o.connect(env(t, peak, decay));
    o.start(t);
    o.stop(t + decay + 0.02);
  }

  function hiss(t, kind, f, q, peak, decay) {
    var s = ctx.createBufferSource();
    s.buffer = noise;
    var flt = ctx.createBiquadFilter();
    flt.type = kind;
    flt.frequency.value = f;
    flt.Q.value = q;
    s.connect(flt);
    flt.connect(env(t, peak, decay, 0.001));
    s.start(t, Math.random() * 0.3);
    s.stop(t + decay + 0.02);
  }

  var SOUND = {
    clave: function (t) { tone(t, 'sine', 2500, 0.5, 0.06); tone(t, 'triangle', 1250, 0.12, 0.03); },
    cascara: function (t) { hiss(t, 'bandpass', 2600, 2.5, 0.55, 0.035); tone(t, 'triangle', 1700, 0.08, 0.02); },
    mambo: function (t, c) {
      var mouth = c === 'M';
      var f = mouth ? 560 : 640;
      tone(t, 'square', f, mouth ? 0.11 : 0.07, mouth ? 0.28 : 0.09);
      tone(t, 'square', f * 1.48, mouth ? 0.08 : 0.06, mouth ? 0.22 : 0.07);
    },
    campana: function (t) { tone(t, 'square', 730, 0.08, 0.3); tone(t, 'square', 1085, 0.06, 0.24); },
    conga: function (t, c) {
      if (c === 'O') { tone(t, 'sine', 205, 0.55, 0.38, 192); tone(t, 'sine', 410, 0.08, 0.12); }
      else if (c === 'S') { hiss(t, 'bandpass', 1600, 1.2, 0.5, 0.07); tone(t, 'sine', 340, 0.2, 0.06); }
      else if (c === 'H') { tone(t, 'sine', 95, 0.28, 0.09, 80); }
      else { hiss(t, 'lowpass', 1100, 0.7, 0.12, 0.04); }
    },
    martillo: function (t, c) {
      if (c === 'O') tone(t, 'sine', 290, 0.45, 0.26, 276);
      else if (c === 'F') { tone(t, 'sine', 470, 0.32, 0.12, 455); hiss(t, 'bandpass', 3000, 1.5, 0.08, 0.02); }
      else tone(t, 'sine', 470, 0.1, 0.05);
    },
    guiro: function (t, c) {
      // A scrape is a quick run of ridges
      var long = c === 'L';
      var n = long ? 11 : 3;
      var gap = long ? 0.019 : 0.016;
      for (var i = 0; i < n; i++) hiss(t + i * gap, 'bandpass', 3300, 3, long ? 0.22 : 0.26, 0.014);
    },
    bass: function (t, c, dur) {
      var f = 440 * Math.pow(2, ((BASS[c] || 48) - 69) / 12);
      var o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      var sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = f;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      var g = ctx.createGain();
      var end = t + Math.max(0.12, dur - 0.03);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.012);
      g.gain.setTargetAtTime(0.32, t + 0.05, 0.25);
      g.gain.setTargetAtTime(0.0001, end, 0.03);
      o.connect(lp);
      sub.connect(lp);
      lp.connect(g);
      g.connect(master);
      o.start(t);
      sub.start(t);
      o.stop(end + 0.2);
      sub.stop(end + 0.2);
    },
    bell68: function (t) { tone(t, 'square', 880, 0.07, 0.16); tone(t, 'square', 1310, 0.05, 0.12); },
    pulse: function (t) { hiss(t, 'highpass', 6000, 0.7, 0.18, 0.07); }
  };

  /* ---------- Playback ---------- */

  var playing = null;

  function stopMarks() {
    sheet.querySelectorAll('.st.now').forEach(function (c) { c.classList.remove('now'); });
  }

  function mark(step) {
    stopMarks();
    if (!styleEl) return;
    styleEl.querySelectorAll('.lp-row .lp-grid .st[data-i="' + step + '"]').forEach(function (c) { c.classList.add('now'); });
    styleEl.querySelectorAll('.lp-counts .st').forEach(function (c, i) { if (i === step) c.classList.add('now'); });
  }

  function schedule() {
    var p = playing;
    if (!p) return;
    while (p.time < ctx.currentTime + 0.12) {
      var steps = parseInt(styleEl.getAttribute('data-steps'), 10);
      var perBeat = parseInt(styleEl.getAttribute('data-per-beat'), 10);
      var dt = 60 / parseFloat(bpmInput.value) / perBeat;
      var step = p.step % steps;
      styleEl.querySelectorAll('.lp-row[data-pattern]').forEach(function (row) {
        if (row.classList.contains('is-muted')) return;
        var pat = patternFor(row);
        var c = pat.charAt(step);
        if (c === '.' || !c) return;
        var part = row.getAttribute('data-part');
        var dur = dt;
        if (part === 'bass') {
          // hold each note until the next one, over the bar line
          var k = 1;
          while (k < steps && pat.charAt((step + k) % steps) === '.') k++;
          dur = k * dt;
        }
        SOUND[part](p.time, c, dur);
      });
      (function (s, when) {
        p.timeouts.push(setTimeout(function () { if (playing === p) mark(s); }, Math.max(0, (when - ctx.currentTime) * 1000)));
      })(step, p.time);
      p.time += dt;
      p.step = step + 1;
      if (p.timeouts.length > 200) p.timeouts = p.timeouts.slice(-100);
    }
  }

  function start() {
    audio();
    playing = { step: 0, time: ctx.currentTime + 0.08, timeouts: [] };
    playBtn.setAttribute('aria-pressed', 'true');
    playBtn.querySelector('span').textContent = 'Stop';
    schedule();
    playing.timer = setInterval(schedule, 25);
  }

  function stop() {
    if (!playing) return;
    clearInterval(playing.timer);
    playing.timeouts.forEach(clearTimeout);
    playing = null;
    playBtn.setAttribute('aria-pressed', 'false');
    playBtn.querySelector('span').textContent = 'Play';
    stopMarks();
  }

  playBtn.addEventListener('click', function () { if (playing) stop(); else start(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });

  if (!AC) playBtn.hidden = true;
  controls.hidden = false;
  tabs.hidden = false;
  var start0 = location.hash.slice(1);
  if (start0 && document.getElementById(start0) && document.getElementById(start0).classList.contains('lp-style')) showStyle(start0);
  else showStyle(styleEl.id);
  drawAll();
})();
