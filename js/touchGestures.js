/**
 * touchGestures.js — Swipe lateral para navegar entre secciones en mobile
 * Detecta swipes verticales (arriba/abajo) sobre el dashboard scroll container
 * y navega a la sección anterior/siguiente del snap-scroll.
 */

(function () {
  'use strict';

  var MIN_SWIPE_DIST = 50;   // px mínimos para considerar un swipe
  var MAX_SWIPE_TIME = 400;   // ms máximos entre touchstart y touchend
  var MAX_VERTICAL = 80;      // px máximos de desplazamiento lateral para no interferir

  var startX = 0;
  var startY = 0;
  var startTime = 0;
  var tracking = false;

  function init() {
    var dashboard = document.getElementById('dashboard-scroll');
    if (!dashboard) return;

    dashboard.addEventListener('touchstart', onTouchStart, { passive: true });
    dashboard.addEventListener('touchmove', onTouchMove, { passive: true });
    dashboard.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  function onTouchStart(e) {
    var touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
    tracking = true;
  }

  function onTouchMove(e) {
    // Cancelar si se desplaza demasiado horizontalmente (scroll horizontal dentro de widget)
    if (!tracking) return;
    var touch = e.touches[0];
    var dx = Math.abs(touch.clientX - startX);
    if (dx > MAX_VERTICAL) {
      tracking = false;
    }
  }

  function onTouchEnd(e) {
    if (!tracking) return;
    tracking = false;

    var touch = e.changedTouches[0];
    var dx = touch.clientX - startX;
    var dy = touch.clientY - startY;
    var elapsed = Date.now() - startTime;

    // Solo procesar swipes verticales (arriba/abajo) que sean rápidos y suficientemente largos
    if (elapsed > MAX_SWIPE_TIME) return;

    var absDy = Math.abs(dy);
    var absDx = Math.abs(dx);

    // El swipe vertical debe ser predominante
    if (absDy < MIN_SWIPE_DIST || absDx > absDy * 0.6) return;

    var sections = window._sectionList;
    if (!sections || !sections.length) return;

    var current = window._currentSectionIndex();
    var total = sections.length;

    if (dy < 0) {
      // Swipe arriba → sección siguiente
      if (current < total - 1) {
        sections[current + 1].scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Swipe abajo → sección anterior
      if (current > 0) {
        sections[current - 1].scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  // Inicializar cuando el dashboard sea visible
  window.addEventListener('auth:ready', function () {
    init();
  });
})();
