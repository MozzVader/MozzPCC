/**
 * Clean Mode - MozzPCC
 *
 * Pulsa Esc para activar: fade-out de todo excepto el reloj.
 * Clic o Esc para volver al dashboard completo.
 */

(function () {
  'use strict';

  var isActive = false;

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
    document.body.classList.add('clean-mode');

    // Scroll al reloj
    var clockSection = document.getElementById('section-clock');
    if (clockSection) {
      clockSection.scrollIntoView({ behavior: 'smooth' });
    }

    console.log('[Clean Mode] Activado');
  }

  /**
   * Desactiva el clean mode
   */
  function deactivate() {
    if (!isActive) return;
    isActive = false;
    document.body.classList.remove('clean-mode');
    console.log('[Clean Mode] Desactivado');
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

  console.log('[Clean Mode] Listo - pulsá Esc para activar');
})();
