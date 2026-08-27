(function () {
  'use strict';

  var topbar = document.getElementById('topbar');
  var navToggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');

  function closeNav() {
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    if (navLinks) navLinks.classList.remove('is-open');
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      if (!navLinks) return;
      var isOpen = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  if (navLinks) {
    navLinks.addEventListener('click', function (event) {
      if (event.target instanceof Element && event.target.closest('a')) closeNav();
    });
  }

  window.addEventListener('resize', function () {
    if (window.innerWidth > 820) closeNav();
  });

  window.addEventListener('scroll', function () {
    if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  window.requestAnimationFrame(function () {
    document.documentElement.classList.add('is-ready');
  });
})();
