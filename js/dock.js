/**
 * dock.js — Dock estilo macOS con magnificación
 * Efecto de escala basado en distancia al mouse
 * Scroll suave a widgets, apertura de links externos
 * Soporte touch para mobile (tap to toggle)
 */

(function () {
  'use strict';

  const dock = document.getElementById('dock');
  if (!dock) return;

  // --- Configuración de magnificación ---
  const MAX_SCALE = 1.5;
  const RANGE = 120; // píxeles de radio de influencia

  /**
   * Aplica efecto de magnificación a un contenedor de iconos
   * @param {MouseEvent} e - Evento del mouse
   * @param {HTMLElement} container - Contenedor con iconos .dock-icon
   */
  function applyMagnification(e, container) {
    const icons = container.querySelectorAll('.dock-icon');
    const mouseX = e.clientX;

    icons.forEach(function (icon) {
      const rect = icon.getBoundingClientRect();
      const iconCenterX = rect.left + rect.width / 2;
      const distance = Math.abs(mouseX - iconCenterX);

      let scale = 1;
      if (distance < RANGE) {
        // Curva coseno para efecto suave (como macOS)
        scale = 1 + (MAX_SCALE - 1) * Math.cos((distance / RANGE) * (Math.PI / 2));
      }

      icon.style.transform = 'scale(' + scale + ')';
    });
  }

  /**
   * Resetea la escala de los iconos de un contenedor
   * @param {HTMLElement} container
   */
  function resetMagnification(container) {
    const icons = container.querySelectorAll('.dock-icon');
    icons.forEach(function (icon) {
      icon.style.transform = '';
    });
  }

  // --- Magnificación en paneles expandidos ---
  document.querySelectorAll('.dock-expand').forEach(function (expand) {
    expand.addEventListener('mousemove', function (e) {
      applyMagnification(e, expand);
    });

    expand.addEventListener('mouseleave', function () {
      resetMagnification(expand);
    });
  });

  // --- Magnificación en triggers principales ---
  var dockPanel = dock.querySelector('.dock-panel');
  if (dockPanel) {
    dockPanel.addEventListener('mousemove', function (e) {
      var triggers = dockPanel.querySelectorAll('.dock-trigger');
      var mouseX = e.clientX;

      triggers.forEach(function (trigger) {
        var rect = trigger.getBoundingClientRect();
        var iconCenterX = rect.left + rect.width / 2;
        var distance = Math.abs(mouseX - iconCenterX);

        var scale = 1;
        if (distance < RANGE) {
          scale = 1 + (MAX_SCALE - 1) * Math.cos((distance / RANGE) * (Math.PI / 2));
        }

        trigger.style.transform = 'scale(' + scale + ')';
      });
    });

    dockPanel.addEventListener('mouseleave', function () {
      dockPanel.querySelectorAll('.dock-trigger').forEach(function (trigger) {
        trigger.style.transform = '';
      });
    });
  }

  // --- Scroll suave a widgets ---
  document.querySelectorAll('[data-scroll]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.querySelector('.' + btn.dataset.scroll);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // --- Mobile: tap para toggle (hover no funciona bien en touch) ---
  var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (isTouchDevice) {
    // Tap en triggers para expandir/colapsar
    document.querySelectorAll('.dock-trigger').forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        var group = trigger.closest('.dock-group');
        var isActive = group.classList.contains('active');

        // Cerrar todos los grupos
        document.querySelectorAll('.dock-group').forEach(function (g) {
          g.classList.remove('active');
        });

        // Toggle este grupo
        if (!isActive) {
          group.classList.add('active');
        }

        e.stopPropagation();
      });
    });

    // Tap fuera del dock para cerrar
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.dock')) {
        document.querySelectorAll('.dock-group').forEach(function (g) {
          g.classList.remove('active');
        });
      }
    });

    // Tap en un sub-icono también cierra el grupo después
    document.querySelectorAll('.dock-expand .dock-icon').forEach(function (icon) {
      icon.addEventListener('click', function () {
        setTimeout(function () {
          document.querySelectorAll('.dock-group').forEach(function (g) {
            g.classList.remove('active');
          });
        }, 300);
      });
    });
  }
})();
