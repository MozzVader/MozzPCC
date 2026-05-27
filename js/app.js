/**
 * app.js — Lógica principal de la aplicación
 * Reloj en tiempo real, fecha y saludo según hora del día
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

  // --- Inicialización ---
  function init() {
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
    console.log('MozzPCC: sync:success event fired');
    if (!syncDot) { console.warn('MozzPCC: sync-dot element not found'); return; }
    clearTimeout(syncTimer);
    syncDot.classList.add('active');
    console.log('MozzPCC: sync-dot classes:', syncDot.className, 'computed opacity:', getComputedStyle(syncDot).opacity);
    syncTimer = setTimeout(function () {
      syncDot.classList.remove('active');
    }, 2500);
  });

  // --- Section Dots (indicadores de navegación) ---
  function initSectionDots() {
    var sections = document.querySelectorAll('.snap-section');
    var dots = document.querySelectorAll('.section-dot');
    var bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    if (!sections.length || !dots.length) return;

    // --- URL anchors: update hash on section change, restore on load ---
    var dashboard = document.getElementById('dashboard-scroll');
    var updatingHash = false; // prevent scroll event feedback loop

    function setSectionHash(id) {
      if (updatingHash) return;
      updatingHash = true;
      var hash = '#' + id;
      if (window.location.hash !== hash) {
        history.replaceState(null, '', hash);
      }
      updatingHash = false;
    }

    // Restore section from hash on load
    function restoreFromHash() {
      var hash = window.location.hash.replace('#', '');
      if (!hash) return;
      var target = document.getElementById(hash);
      if (!target || !target.classList.contains('snap-section')) return;
      // Try multiple times because dashboard may become visible after auth
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
      tryScroll(15); // retry for up to 3 seconds
    }

    // --- Estado de navegación (compartido con keyboard nav) ---
    var sectionList = Array.from(sections);
    var currentSectionIndex = -1;

    // Exponer para acceso global
    window._sectionList = sectionList;
    window._currentSectionIndex = function () { return currentSectionIndex; };

    function getSectionIndex(el) {
      return sectionList.indexOf(el);
    }

    function scrollToSection(index) {
      if (index < 0 || index >= sectionList.length) return;
      sectionList[index].scrollIntoView({ behavior: 'smooth' });
    }

    // IntersectionObserver: detecta qué sección está visible
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          currentSectionIndex = getSectionIndex(entry.target);
          dots.forEach(function (dot) {
            dot.classList.toggle('active', dot.getAttribute('data-section') === id);
          });
          bottomNavItems.forEach(function (item) {
            item.classList.toggle('active', item.getAttribute('data-section') === id);
          });
          setSectionHash(id);
        }
      });
    }, {
      root: dashboard,
      threshold: 0.6
    });

    sections.forEach(function (section) {
      observer.observe(section);
    });

    // Click en dot → scroll a la sección correspondiente
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var targetId = dot.getAttribute('data-section');
        var target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Click en bottom nav item → scroll a la sección correspondiente
    bottomNavItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var targetId = item.getAttribute('data-section');
        var target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // --- Back to Top button ---
    var btt = document.getElementById('back-to-top');
    if (btt && dashboard) {
      // Show/hide based on scroll position
      var bttObserver = new IntersectionObserver(function (entries) {
        var clockVisible = entries[0].isIntersecting;
        btt.classList.toggle('visible', !clockVisible);
      }, { root: dashboard, threshold: 0.5 });

      var clockSection = document.getElementById('section-clock');
      if (clockSection) bttObserver.observe(clockSection);

      btt.addEventListener('click', function () {
        var target = document.getElementById('section-clock');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Restore hash after a short delay (after dashboard is visible)
    restoreFromHash();
  }

  // --- Keyboard Navigation: números 1-8, flechas, Home/End, PgUp/PgDn ---
  document.addEventListener('keydown', function (e) {
    // Ignorar si hay un input/textarea/select enfocado
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    // Ignorar si hay un modal abierto (checking style.display property)
    // Nota: style.display devuelve '' si nunca fue modificado via JS (hereda del HTML)
    // pero el HTML tiene style="display:none;" así que comprobamos ambos
    var tipsModal = document.getElementById('tips-modal');
    var settingsModal = document.getElementById('settings-modal');
    if ((tipsModal && tipsModal.style.display === 'flex') ||
        (settingsModal && settingsModal.style.display === 'flex')) return;

    var sections = window._sectionList;
    if (!sections || !sections.length) return;
    var total = sections.length;
    var current = window._currentSectionIndex();

    // Teclas numéricas: 1-8 saltan a la sección correspondiente
    var num = parseInt(e.key, 10);
    if (num >= 1 && num <= total) {
      e.preventDefault();
      sections[num - 1].scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Flecha abajo / PgDn: sección siguiente
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      sections[Math.min(current + 1, total - 1)].scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Flecha arriba / PgUp: sección anterior
    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      sections[Math.max(current - 1, 0)].scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Home: ir al inicio
    if (e.key === 'Home') {
      e.preventDefault();
      sections[0].scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // End: ir al final
    if (e.key === 'End') {
      e.preventDefault();
      sections[total - 1].scrollIntoView({ behavior: 'smooth' });
      return;
    }
  });

  // Exponer scrollToSection globalmente (para reutilizar desde otros módulos)
  window.navigateToSection = function (index) {
    if (typeof index !== 'number') return;
    var secs = document.querySelectorAll('.snap-section');
    if (index >= 0 && index < secs.length) {
      secs[index].scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Inicializar dots cuando el dashboard sea visible
  window.addEventListener('auth:ready', function () {
    initSectionDots();
  });

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
