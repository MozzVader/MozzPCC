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
    if (!syncDot) return;
    clearTimeout(syncTimer);
    syncDot.classList.add('active');
    syncTimer = setTimeout(function () {
      syncDot.classList.remove('active');
    }, 2500);
  });

  // --- Section Dots (indicadores de navegación) ---
  function initSectionDots() {
    var sections = document.querySelectorAll('.snap-section');
    var dots = document.querySelectorAll('.section-dot');
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

    // --- Transiciones animadas entre secciones ---
    var currentSectionIndex = -1;
    var sectionList = Array.from(sections);
    var isAnimating = false;

    function getSectionIndex(el) {
      return sectionList.indexOf(el);
    }

    // Limpiar clase de entrada cuando termina la animación CSS
    sectionList.forEach(function (section) {
      section.addEventListener('animationend', function () {
        section.classList.remove('is-entering', 'from-above');
        isAnimating = false;
      });
    });

    function animateSection(section, fromAbove) {
      // Remover clases previas de cualquier sección
      sectionList.forEach(function (s) {
        s.classList.remove('is-entering', 'from-above');
      });
      // Forzar reflow para reiniciar la animación si es la misma sección
      void section.offsetWidth;
      // Agregar clases de entrada
      if (fromAbove) {
        section.classList.add('is-entering', 'from-above');
      } else {
        section.classList.add('is-entering');
      }
    }

    // IntersectionObserver: detecta qué sección está visible
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var idx = getSectionIndex(entry.target);

        if (entry.isIntersecting) {
          var id = entry.target.id;
          var prevIdx = currentSectionIndex;
          var fromAbove = idx < prevIdx;

          currentSectionIndex = idx;

          // Animar entrada de la nueva sección (no la primera vez)
          if (prevIdx >= 0 && prevIdx !== idx) {
            animateSection(entry.target, fromAbove);
          }

          dots.forEach(function (dot) {
            dot.classList.toggle('active', dot.getAttribute('data-section') === id);
          });
          setSectionHash(id);
        }
      });
    }, {
      root: dashboard,
      threshold: 0.5
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
