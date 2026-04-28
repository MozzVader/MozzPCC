/**
 * dock.js — Dock estilo macOS con magnificación + Snap Scroll Navigation
 * Efecto de escala basado en distancia al mouse
 * Scroll suave a secciones, apertura de links externos
 * IntersectionObserver para indicadores de sección activa
 * Soporte touch para mobile (tap to toggle)
 */

(function () {
  'use strict';

  var dock = document.getElementById('dock');
  var dashboardScroll = document.getElementById('dashboard-scroll');
  var indicatorsContainer = document.getElementById('section-indicators');

  if (!dock || !dashboardScroll) return;

  // --- Configuración de magnificación ---
  var MAX_SCALE = 1.5;
  var RANGE = 120; // píxeles de radio de influencia

  // --- Secciones snap ---
  var sections = document.querySelectorAll('.snap-section');
  var dots = document.querySelectorAll('.section-dot');
  var currentSectionIndex = 0;

  /**
   * Aplica efecto de magnificación a un contenedor de iconos
   * @param {MouseEvent} e - Evento del mouse
   * @param {HTMLElement} container - Contenedor con iconos .dock-icon
   */
  function applyMagnification(e, container) {
    var icons = container.querySelectorAll('.dock-icon');
    var mouseX = e.clientX;

    icons.forEach(function (icon) {
      var rect = icon.getBoundingClientRect();
      var iconCenterX = rect.left + rect.width / 2;
      var distance = Math.abs(mouseX - iconCenterX);

      var scale = 1;
      if (distance < RANGE) {
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
    var icons = container.querySelectorAll('.dock-icon');
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

  // --- Scroll suave a secciones (desde dock) ---
  document.querySelectorAll('[data-scroll]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.dataset.scroll;
      var target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }

      // Cerrar grupos en mobile
      document.querySelectorAll('.dock-group').forEach(function (g) {
        g.classList.remove('active');
      });
    });
  });

  // --- Scroll desde dots (indicadores laterales) ---
  if (dots.length > 0) {
    dots.forEach(function (dot, index) {
      dot.addEventListener('click', function () {
        if (sections[index]) {
          sections[index].scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // --- IntersectionObserver: detectar sección activa ---
  function setActiveDot(index) {
    if (index === currentSectionIndex) return;
    currentSectionIndex = index;

    dots.forEach(function (dot, i) {
      if (i === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  if ('IntersectionObserver' in window && sections.length > 0) {
    var observerOptions = {
      root: dashboardScroll,
      threshold: 0.6 // 60% visible = sección activa
    };

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var index = Array.prototype.indexOf.call(sections, entry.target);
          if (index !== -1) {
            setActiveDot(index);
          }
        }
      });
    }, observerOptions);

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

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
