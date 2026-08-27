(function () {
  'use strict';

  var topbar = document.getElementById('topbar');
  var navToggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  var navToggleText = navToggle && navToggle.querySelector('.sr-only');

  function setNavState(isOpen) {
    var label = isOpen ? '关闭主导航' : '打开主导航';
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', label);
    }
    if (navToggleText) navToggleText.textContent = label;
    if (navLinks) navLinks.classList.toggle('is-open', isOpen);
  }

  function closeNav(restoreFocus) {
    setNavState(false);
    if (restoreFocus && navToggle) navToggle.focus();
  }

  function syncHeader() {
    if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 8);
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      if (!navLinks) return;
      setNavState(navToggle.getAttribute('aria-expanded') !== 'true');
    });
  }

  if (navLinks) {
    navLinks.addEventListener('click', function (event) {
      if (event.target instanceof Element && event.target.closest('a')) closeNav(false);
    });
  }

  window.addEventListener('resize', function () {
    if (window.innerWidth > 820) closeNav(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && navToggle && navToggle.getAttribute('aria-expanded') === 'true') {
      closeNav(true);
    }
  });

  setNavState(false);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  window.requestAnimationFrame(function () {
    document.documentElement.classList.add('is-ready');
  });
})();
