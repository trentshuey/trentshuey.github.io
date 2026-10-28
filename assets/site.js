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
