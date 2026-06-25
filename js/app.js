/**
 * app.js — Lógica principal de la aplicación
 * Reloj en tiempo real, fecha, saludo y navegación sidebar
 */

(function () {
  'use strict';

  // --- Elementos del DOM ---
  const clockTimeEl = document.getElementById('clock-time');
  const clockDateEl = document.getElementById('clock-date');
  const greetingEl = document.getElementById('greeting');
  const yearEl = document.getElementById('year');

  // --- Nombres de días y meses en español ---
  const DIAS = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles',
    'Jueves', 'Viernes', 'Sábado'
  ];

  const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril',
    'Mayo', 'Junio', 'Julio', 'Agosto',
    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // --- Estado ---
  let nombreUsuario = '';

  /**
   * Obtiene el saludo según la hora del día
   * @param {number} hora - Hora actual (0-23)
   * @returns {string} Saludo apropiado
   */
  function obtenerSaludo(hora) {
    let saludo;
    if (hora >= 5 && hora < 12) saludo = 'Buenos días ☀️';
    else if (hora >= 12 && hora < 19) saludo = 'Buenas tardes 🌤️';
    else saludo = 'Buenas noches 🌙';

    // Agregar nombre del usuario si está disponible
    if (nombreUsuario) {
      saludo += ', ' + nombreUsuario;
    }

    return saludo;
  }

  /**
   * Formatea un número con dos dígitos (ej: 5 → "05")
   * @param {number} num - Número a formatear
   * @returns {string} Número con dos dígitos
   */
  function dosDigitos(num) {
    return num.toString().padStart(2, '0');
  }

  /**
   * Actualiza el reloj, la fecha y el saludo cada segundo
   */
  function actualizarReloj() {
    const ahora = new Date();

    // Hora, minutos, segundos
    const horas = dosDigitos(ahora.getHours());
    const minutos = dosDigitos(ahora.getMinutes());
    const segundos = dosDigitos(ahora.getSeconds());

    clockTimeEl.innerHTML = `${horas}:${minutos}<span class="seconds">${segundos}</span>`;

    // Fecha completa en español
    const diaSemana = DIAS[ahora.getDay()];
    const dia = ahora.getDate();
    const mes = MESES[ahora.getMonth()];
    const anio = ahora.getFullYear();

    clockDateEl.textContent = `${diaSemana}, ${dia} de ${mes} de ${anio}`;

    // Saludo
    greetingEl.textContent = obtenerSaludo(ahora.getHours());
  }

  // --- Inicialización del reloj ---
  function initClock() {
    // Establecer el año en el footer
    yearEl.textContent = new Date().getFullYear();

    // Escuchar eventos de autenticación para obtener/limpiar el nombre
    window.addEventListener('auth:ready', function (e) {
      nombreUsuario = e.detail.displayName || '';
      actualizarReloj(); // Actualizar inmediatamente con el nombre
    });

    window.addEventListener('auth:logout', function () {
      nombreUsuario = '';
      actualizarReloj(); // Actualizar sin nombre
    });

    // Actualizar inmediatamente y luego cada segundo
    actualizarReloj();
    setInterval(actualizarReloj, 1000);
  }

  // --- Sync dot indicator ---
  var syncDot = document.getElementById('sync-dot');
  var syncTimer = null;

  window.addEventListener('sync:success', function () {
    if (!syncDot) return;
    clearTimeout(syncTimer);
    syncDot.classList.add('active');
    syncTimer = setTimeout(function () {
      syncDot.classList.remove('active');
    }, 2500);
  });

  // --- Sidebar Navigation ---
  function initSidebar() {
    var sidebar = document.getElementById('sidebar');
    var sidebarNav = document.getElementById('sidebar-nav');
    var mobileTopbar = document.getElementById('mobile-topbar');
    var mobileBurger = document.getElementById('mobile-burger');
    var overlay = document.getElementById('sidebar-overlay');
    var collapseBtn = document.getElementById('sidebar-collapse-btn');
    var cleanBtn = document.getElementById('sidebar-clean-btn');
    var dashboard = document.getElementById('dashboard-scroll');

    if (!sidebar || !sidebarNav || !dashboard) return;

    var navItems = sidebarNav.querySelectorAll('.sidebar-item[data-section]');
    var isMobile = window.innerWidth <= 768;

    // --- URL hash management ---
    var updatingHash = false;

    function setSectionHash(id) {
      if (updatingHash) return;
      updatingHash = true;
      var hash = '#' + id;
      if (window.location.hash !== hash) {
        history.replaceState(null, '', hash);
      }
      updatingHash = false;
    }

    function restoreFromHash() {
      var hash = window.location.hash.replace('#', '');
      if (!hash) return;
      var target = document.getElementById(hash);
      if (!target || !target.classList.contains('snap-section')) return;
      function tryScroll(attempts) {
        if (attempts <= 0) return;
        if (dashboard.offsetHeight === 0) {
          setTimeout(function () { tryScroll(attempts - 1); }, 200);
          return;
        }
        setTimeout(function () {
          target.scrollIntoView({ behavior: 'instant' });
        }, 50);
      }
      tryScroll(15);
    }

    // --- Scroll spy (IntersectionObserver) ---
    // root MUST be the dashboard (scroll container), not null (viewport)
    var scrollSpyReady = false;
    var observer = new IntersectionObserver(function (entries) {
      if (!scrollSpyReady) return;
      // Encontrar la seccion mas visible
      var bestId = null;
      var bestRatio = 0;
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
          bestRatio = entry.intersectionRatio;
          bestId = entry.target.id;
        }
      });
      if (bestId) {
        navItems.forEach(function (item) {
          item.classList.toggle('active', item.getAttribute('data-section') === bestId);
        });
        setSectionHash(bestId);
      }
    }, {
      root: dashboard,
      threshold: [0.2, 0.4, 0.6]
    });

    var sections = document.querySelectorAll('.snap-section');
    sections.forEach(function (section) {
      observer.observe(section);
    });

    // --- Click en nav item → scroll suave ---
    navItems.forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var targetId = item.getAttribute('data-section');
        var target = document.getElementById(targetId);
        if (target) {
          // Actualizar active manualmente inmediatamente
          navItems.forEach(function (ni) { ni.classList.remove('active'); });
          item.classList.add('active');
          // Actualizar hash
          history.replaceState(null, '', '#' + targetId);
          // Scroll suave
          target.scrollIntoView({ behavior: 'smooth' });
        }
        // Cerrar drawer en mobile
        if (isMobile) {
          closeMobileDrawer();
        }
      });
    });

    // --- Collapse toggle (desktop) ---
    // Ensure sidebar starts expanded
    document.body.classList.remove('sidebar-collapsed');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function () {
        document.body.classList.toggle('sidebar-collapsed');
      });
    }

    // --- Mobile drawer ---
    function openMobileDrawer() {
      sidebar.classList.add('sidebar-open');
      overlay.classList.add('sidebar-overlay-visible');
    }

    function closeMobileDrawer() {
      sidebar.classList.remove('sidebar-open');
      overlay.classList.remove('sidebar-overlay-visible');
    }

    if (mobileBurger) {
      mobileBurger.addEventListener('click', function () {
        if (sidebar.classList.contains('sidebar-open')) {
          closeMobileDrawer();
        } else {
          openMobileDrawer();
        }
      });
    }

    if (overlay) {
      overlay.addEventListener('click', closeMobileDrawer);
    }

    // --- Clean Mode toggle ---
    if (cleanBtn) {
      cleanBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (typeof window._cleanModeToggle === 'function') {
          window._cleanModeToggle();
        } else {
          document.body.classList.toggle('clean-mode');
        }
      });
    }

    // --- Responsive listener ---
    window.addEventListener('resize', function () {
      var wasMobile = isMobile;
      isMobile = window.innerWidth <= 768;

      if (wasMobile && !isMobile) {
        // Mobile → Desktop: clean up mobile state
        closeMobileDrawer();
        sidebar.classList.remove('sidebar-open');
        if (mobileTopbar) mobileTopbar.classList.remove('mobile-visible');
      } else if (!wasMobile && isMobile) {
        // Desktop → Mobile: show topbar
        if (mobileTopbar) mobileTopbar.classList.add('mobile-visible');
        closeMobileDrawer();
      }
    });

    // Initial mobile state
    if (isMobile) {
      if (mobileTopbar) mobileTopbar.classList.add('mobile-visible');
    }

    // Restore hash after a short delay, then enable scroll spy
    restoreFromHash();
    setTimeout(function () {
      scrollSpyReady = true;
      // Forzar actualizacion inicial del sidebar active
      var clockItem = sidebarNav.querySelector('[data-section="section-clock"]');
      if (clockItem && !window.location.hash) {
        navItems.forEach(function (item) { item.classList.remove('active'); });
        clockItem.classList.add('active');
      }
    }, 500);
  }

  // --- Keyboard Navigation ---
  document.addEventListener('keydown', function (e) {
    // Ignorar si hay un input/textarea/select enfocado
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    // Ignorar si hay un modal abierto
    var tipsModal = document.getElementById('tips-modal');
    var settingsModal = document.getElementById('settings-modal');
    if ((tipsModal && tipsModal.style.display === 'flex') ||
        (settingsModal && settingsModal.style.display === 'flex')) return;

    var sections = document.querySelectorAll('.snap-section');
    if (!sections || !sections.length) return;
    var total = sections.length;

    // Teclas numéricas: 1-8 saltan a la sección correspondiente
    var num = parseInt(e.key, 10);
    if (num >= 1 && num <= total) {
      e.preventDefault();
      sections[num - 1].scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Flecha abajo / PgDn
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      var current = getCurrentVisibleSection();
      sections[Math.min(current + 1, total - 1)].scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Flecha arriba / PgUp
    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      var current = getCurrentVisibleSection();
      sections[Math.max(current - 1, 0)].scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Home
    if (e.key === 'Home') {
      e.preventDefault();
      sections[0].scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // End
    if (e.key === 'End') {
      e.preventDefault();
      sections[total - 1].scrollIntoView({ behavior: 'smooth' });
      return;
    }
  });

  function getCurrentVisibleSection() {
    var sections = document.querySelectorAll('.snap-section');
    var dashboard = document.getElementById('dashboard-scroll');
    if (!dashboard || !sections.length) return 0;
    var scrollTop = dashboard.scrollTop;
    var best = 0;
    var bestDist = Infinity;
    sections.forEach(function (s, i) {
      var dist = Math.abs(s.offsetTop - scrollTop);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }

  window.navigateToSection = function (index) {
    if (typeof index !== 'number') return;
    var secs = document.querySelectorAll('.snap-section');
    if (index >= 0 && index < secs.length) {
      secs[index].scrollIntoView({ behavior: 'smooth' });
    }
  };

  // --- Inicializar cuando el dashboard sea visible ---
  window.addEventListener('auth:ready', function () {
    initSidebar();
  });

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClock);
  } else {
    initClock();
  }
})();
