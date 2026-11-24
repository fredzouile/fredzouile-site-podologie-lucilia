/* Lucilia Afonso – Pédicure-podologue Paris 16e
   Petit script sans dépendance : menu mobile, consentement cookies, carte Google Maps à la demande.
   Le site reste entièrement utilisable sans JavaScript (la carte est alors remplacée par un lien). */
(function () {
  'use strict';

  /* ---------- Menu mobile (<details>) ---------- */
  var menu = document.querySelector('.mobile-menu');
  if (menu) {
    var toggle = menu.querySelector('summary');
    var close = function (focusToggle) {
      if (!menu.open) return;
      menu.open = false;
      if (focusToggle) toggle.focus();
    };
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close(true);
    });
    document.addEventListener('click', function (e) {
      if (menu.open && !menu.contains(e.target)) close(false);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) close(false);
    });
    window.matchMedia('(min-width: 1080px)').addEventListener('change', function (mq) {
      if (mq.matches) close(false);
    });
  }

  /* ---------- Consentement (une seule finalité : la carte Google Maps) ---------- */
  var KEY = 'consentement-carte';
  var banner = document.getElementById('cookie-banner');
  var days = banner ? parseInt(banner.getAttribute('data-days'), 10) || 180 : 180;

  function readConsent() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || Date.now() - data.date > days * 864e5) return null;
      return data.value;
    } catch (err) { return null; }
  }
  function saveConsent(value) {
    try { window.localStorage.setItem(KEY, JSON.stringify({ value: value, date: Date.now() })); } catch (err) { /* stockage indisponible */ }
  }
  function showBanner() {
    if (!banner) return;
    banner.hidden = false;
  }
  function hideBanner() {
    if (banner) banner.hidden = true;
  }

  /* ---------- Carte chargée uniquement après accord ---------- */
  var maps = Array.prototype.slice.call(document.querySelectorAll('[data-map]'));

  function loadMap(container) {
    if (container.querySelector('iframe')) return;
    var iframe = document.createElement('iframe');
    iframe.src = container.getAttribute('data-src');
    iframe.title = 'Plan d\'accès au cabinet de podologie, 24 rue Jouvenet, Paris 16e';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    container.appendChild(iframe);
    var placeholder = container.querySelector('.map__placeholder');
    if (placeholder) placeholder.hidden = true;
  }
  function unloadMaps() {
    maps.forEach(function (m) {
      var f = m.querySelector('iframe');
      if (f) f.remove();
      var p = m.querySelector('.map__placeholder');
      if (p) p.hidden = false;
    });
  }
  function loadMapsWhenVisible() {
    if (!('IntersectionObserver' in window)) { maps.forEach(loadMap); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { loadMap(entry.target); io.unobserve(entry.target); }
      });
    }, { rootMargin: '300px' });
    maps.forEach(function (m) { io.observe(m); });
  }

  maps.forEach(function (m) {
    var btn = m.querySelector('[data-map-load]');
    if (btn) btn.addEventListener('click', function () {
      saveConsent('accept');
      hideBanner();
      loadMap(m);
    });
  });

  if (banner) {
    banner.addEventListener('click', function (e) {
      var choice = e.target.closest('[data-consent]');
      if (!choice) return;
      var value = choice.getAttribute('data-consent');
      saveConsent(value);
      hideBanner();
      if (value === 'accept') loadMapsWhenVisible(); else unloadMaps();
    });
  }

  document.querySelectorAll('[data-cookie-settings]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showBanner();
      var first = banner && banner.querySelector('button');
      if (first) first.focus();
    });
  });

  var consent = readConsent();
  if (consent === 'accept') loadMapsWhenVisible();
  else if (consent === null) showBanner();
})();
