/**
 * dock.js — Dock estilo macOS dinámico
 * Se renderiza a partir de los datos de la DB (via settings.js)
 * Efecto de magnificación basado en distancia al mouse
 * Scroll suave a secciones, apertura de links externos
 * IntersectionObserver para indicadores de sección activa
 * Soporte touch para mobile (tap to toggle)
 */

(function () {
  'use strict';

  var dock = document.getElementById('dock');
  var dockPanel = document.getElementById('dock-panel');
  var dashboardScroll = document.getElementById('dashboard-scroll');
  var indicatorsContainer = document.getElementById('section-indicators');

  if (!dock || !dockPanel || !dashboardScroll) return;

  // --- Configuración de magnificación ---
  var MAX_SCALE = 1.5;
  var RANGE = 120;

  // --- Secciones snap ---
  var sections = document.querySelectorAll('.snap-section');
  var dots = document.querySelectorAll('.section-dot');
  var currentSectionIndex = 0;

  // =============================================
  // RENDERIZADO DINÁMICO DEL DOCK
  // =============================================

  /**
   * Renderiza todo el dock a partir de los datos
   * @param {Array} dockGroups - Array de grupos con links
   */
  function renderDock(dockGroups) {
    dockPanel.innerHTML = '';

    if (!dockGroups || dockGroups.length === 0) return;

    dockGroups.forEach(function (group, groupIndex) {
      // Separador entre grupos (no antes del primero)
      if (groupIndex > 0) {
        var separator = document.createElement('div');
        separator.className = 'dock-separator';
        dockPanel.appendChild(separator);
      }

      // Contenedor del grupo
      var groupEl = document.createElement('div');
      groupEl.className = 'dock-group';
      groupEl.dataset.group = group.id;

      // Panel expandido con los links
      var expandEl = document.createElement('div');
      expandEl.className = 'dock-expand';

      if (group.links && group.links.length > 0) {
        group.links.forEach(function (link) {
          // Los links que empiezan con # son scroll a secciones internas
          if (link.url.startsWith('#')) {
            var btn = document.createElement('button');
            btn.className = 'dock-icon';
            btn.dataset.scroll = link.url.substring(1);
            btn.setAttribute('aria-label', link.name);
            btn.innerHTML = '<i class="' + link.icon + '"></i><span class="dock-tooltip">' + escapeHtml(link.name) + '</span>';
            expandEl.appendChild(btn);
          } else {
            var a = document.createElement('a');
            a.className = 'dock-icon';
            a.href = link.url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.setAttribute('aria-label', link.name);
            a.innerHTML = '<i class="' + link.icon + '"></i><span class="dock-tooltip">' + escapeHtml(link.name) + '</span>';
            expandEl.appendChild(a);
          }
        });
      }

      // Trigger (icono principal del grupo)
      var trigger = document.createElement('button');
      trigger.className = 'dock-icon dock-trigger';
      trigger.setAttribute('aria-label', group.name);
      trigger.innerHTML = '<i class="' + group.icon + '"></i><span class="dock-tooltip">' + escapeHtml(group.name) + '</span>';

      groupEl.appendChild(expandEl);
      groupEl.appendChild(trigger);
      dockPanel.appendChild(groupEl);
    });

    // Re-aplicar event listeners después de renderizar
    setupScrollListeners();
    setupMagnification();
    setupMobileTouch();
  }

  /**
   * Utilidad: escape HTML
   */
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // =============================================
  // MAGNIFICACIÓN
  // =============================================

  function setupMagnification() {
    // Magnificación en paneles expandidos
    dockPanel.querySelectorAll('.dock-expand').forEach(function (expand) {
      expand.addEventListener('mousemove', function (e) {
        applyMagnification(e, expand);
      });
      expand.addEventListener('mouseleave', function () {
        resetMagnification(expand);
      });
    });

    // Magnificación en triggers principales
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

  function resetMagnification(container) {
    var icons = container.querySelectorAll('.dock-icon');
    icons.forEach(function (icon) {
      icon.style.transform = '';
    });
  }

  // =============================================
  // SCROLL A SECCIONES
  // =============================================

  function setupScrollListeners() {
    // Click en dock icons con data-scroll
    dockPanel.querySelectorAll('[data-scroll]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.dataset.scroll;
        var target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }

        // Cerrar grupos en mobile
        dockPanel.querySelectorAll('.dock-group').forEach(function (g) {
          g.classList.remove('active');
        });
      });
    });
  }

  // Click en dots (indicadores laterales)
  if (dots.length > 0) {
    dots.forEach(function (dot, index) {
      dot.addEventListener('click', function () {
        if (sections[index]) {
          sections[index].scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // =============================================
  // INTERSECTION OBSERVER — Sección activa
  // =============================================

  var currentActiveDot = 0;

  function setActiveDot(index) {
    if (index === currentActiveDot) return;
    currentActiveDot = index;

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
      threshold: 0.6
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

  // =============================================
  // MOBILE: Tap para toggle
  // =============================================

  function setupMobileTouch() {
    var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    dockPanel.querySelectorAll('.dock-trigger').forEach(function (trigger) {
      // Remove old listeners by cloning (simpler approach)
      var newTrigger = trigger.cloneNode(true);
      trigger.parentNode.replaceChild(newTrigger, trigger);

      newTrigger.addEventListener('click', function (e) {
        var group = newTrigger.closest('.dock-group');
        var isActive = group.classList.contains('active');

        dockPanel.querySelectorAll('.dock-group').forEach(function (g) {
          g.classList.remove('active');
        });

        if (!isActive) {
          group.classList.add('active');
        }

        e.stopPropagation();
      });
    });

    dockPanel.querySelectorAll('.dock-expand .dock-icon').forEach(function (icon) {
      var newIcon = icon.cloneNode(true);
      icon.parentNode.replaceChild(newIcon, icon);

      newIcon.addEventListener('click', function () {
        setTimeout(function () {
          dockPanel.querySelectorAll('.dock-group').forEach(function (g) {
            g.classList.remove('active');
          });
        }, 300);
      });
    });
  }

  // =============================================
  // ESCUCHAR EVENTOS DE ACTUALIZACIÓN
  // =============================================

  // Cuando settings.js carga datos, renderizar el dock
  window.addEventListener('dock:update', function (e) {
    if (e.detail && e.detail.groups) {
      renderDock(e.detail.groups);
    }
  });

  // También escuchar auth:ready para renderizar dock con los datos del settings
  window.addEventListener('auth:ready', function () {
    // Dar tiempo a que settings.js cargue y haga seed
    setTimeout(function () {
      if (typeof window.getDockData === 'function') {
        renderDock(window.getDockData());
      }
    }, 500);
  });

  // Cleanup al logout
  window.addEventListener('auth:logout', function () {
    dockPanel.innerHTML = '';
  });

})();
