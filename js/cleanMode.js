/**
 * Clean Mode - MozzPCC
 *
 * Pulsa Esc para activar: fade-out de todo excepto el reloj.
 * Clic o Esc para volver al dashboard completo.
 *
 * Auto-lock: activa Clean Mode automaticamente tras N minutos de inactividad.
 * El tiempo se configura en Apariencia → Auto-lock (guardado en localStorage).
 */

(function () {
  'use strict';

  var isActive = false;
  var savedScrollTop = 0;

  // --- Auto-lock (inactividad) ---
  var inactivityTimer = null;
  var ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

  function getAutoLockMinutes() {
    var val = localStorage.getItem('mozzpcc-autolock-minutes');
    if (val === null) return 20; // Default
    return parseInt(val, 10) || 0;
  }

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    var minutes = getAutoLockMinutes();
    if (minutes <= 0) return; // Desactivado

    inactivityTimer = setTimeout(function () {
      if (!isActive && !isOverlayOpen()) {
        activate();
      }
    }, minutes * 60 * 1000);
  }

  function startInactivityTracking() {
    // Limpiar listeners previos si existen
    stopInactivityTracking();

    for (var i = 0; i < ACTIVITY_EVENTS.length; i++) {
      document.addEventListener(ACTIVITY_EVENTS[i], resetInactivityTimer, { passive: true });
    }
    resetInactivityTimer();
  }

  function stopInactivityTracking() {
    clearTimeout(inactivityTimer);
    for (var i = 0; i < ACTIVITY_EVENTS.length; i++) {
      document.removeEventListener(ACTIVITY_EVENTS[i], resetInactivityTimer);
    }
  }

  // Exponer para que settings.js pueda reiniciar el timer al cambiar la config
  window._resetAutoLock = function () {
    clearTimeout(inactivityTimer);
    var minutes = getAutoLockMinutes();
    if (minutes > 0) {
      resetInactivityTimer();
    }
  };

  /**
   * Verifica si hay algun overlay/modal abierto
   */
  function isOverlayOpen() {
    var selectors = [
      '#settings-modal',
      '#tips-modal',
      '#cmd-palette',
      '#auth-screen',
      '#app-loading'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && el.style.display !== 'none' && el.offsetParent !== null) {
        return true;
      }
    }
    return false;
  }

  /**
   * Activa el clean mode
   */
  function activate() {
    if (isActive) return;
    isActive = true;

    // Guardar posicion actual del scroll
    var dashboard = document.querySelector('.dashboard');
    if (dashboard) {
      savedScrollTop = dashboard.scrollTop;
    }

    document.body.classList.add('clean-mode');

    // Scroll al reloj
    var clockSection = document.getElementById('section-clock');
    if (clockSection) {
      clockSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Desactiva el clean mode — restaura scroll y scroll spy
   */
  function deactivate() {
    if (!isActive) return;
    isActive = false;
    document.body.classList.remove('clean-mode');

    // Restaurar scroll a la posicion guardada
    var dashboard = document.querySelector('.dashboard');
    if (dashboard) {
      dashboard.scrollTop = savedScrollTop;
    }

    // Forzar actualizacion del scroll spy
    if (typeof window._forceScrollSpy === 'function') {
      window._forceScrollSpy();
    }

    // Resetear el timer de inactividad al volver
    resetInactivityTimer();
  }

  /**
   * Toggle clean mode (solo si no hay overlays abiertos)
   */
  function toggle() {
    if (isOverlayOpen()) return;
    if (isActive) {
      deactivate();
    } else {
      activate();
    }
  }

  // Exponer toggle para que otros modulos (sidebar) puedan usarlo
  window._cleanModeToggle = toggle;

  // Esc para toggle
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      // Si clean mode esta activo, siempre desactivar (sin importar overlays)
      if (isActive) {
        e.preventDefault();
        e.stopPropagation();
        deactivate();
      }
      // Si no esta activo, solo activar si no hay overlays
      // (los otros listeners de Esc cierran los overlays primero)
    }
  });

  // Listener separado con prioridad para activar (se ejecuta antes)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !isActive && !isOverlayOpen()) {
      e.preventDefault();
      e.stopPropagation();
      activate();
    }
  }, true); // capture phase para que corra antes que los demas

  // Clic para desactivar
  document.addEventListener('click', function (e) {
    if (!isActive) return;
    // Ignorar clicks en overlays que puedan abrirse
    if (e.target.closest('#settings-modal') ||
        e.target.closest('#tips-modal') ||
        e.target.closest('#cmd-palette')) {
      return;
    }
    deactivate();
  });

  // Iniciar tracking de inactividad cuando el dashboard esté visible
  window.addEventListener('auth:ready', function () {
    startInactivityTracking();
  });
})();
