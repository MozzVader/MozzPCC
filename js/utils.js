/**
 * utils.js — Helpers compartidos entre widgets
 * Se carga antes que todos los demás scripts (después de auth.js)
 */

// --- Escape HTML para evitar XSS en innerHTML ---
function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// --- "hace X tiempo" relativo ---
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var now = new Date();
  var date = new Date(dateStr);
  var diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Ahora';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd';

  var days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
  var months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return days[date.getDay()] + ' ' + date.getDate() + ' ' + months[date.getMonth()];
}

// --- Acceso al cliente Supabase ---
function getSupabase() {
  return window.supabaseClient || null;
}

// --- Moneda preferida ---
function getCurrency() {
  return localStorage.getItem('mozzpcc-currency') || '$';
}

// =========================================================================
//  FOCUS TRAP — Mantiene el foco dentro de un contenedor (accesibilidad)
// =========================================================================

/**
 * Crea un focus trap para un elemento modal.
 * Cuando el modal está abierto, Tab/Shift+Tab solo ciclan entre los
 * elementos enfocables dentro del contenedor.
 *
 * @param {HTMLElement} container - El contenedor del modal (ej: el div.settings-modal)
 * @param {HTMLElement} overlay - El overlay completo (ej: el div#settings-modal)
 * @returns {{ activate: Function, deactivate: Function }}
 *
 * Uso:
 *   var trap = createFocusTrap(modal, overlay);
 *   // Al abrir:
 *   trap.activate(prevFocusedElement);
 *   // Al cerrar:
 *   trap.deactivate();
 */
function createFocusTrap(container, overlay) {
  var previouslyFocused = null;
  var handler = null;

  handler = function (e) {
    if (e.key !== 'Tab') return;

    // Obtener todos los elementos enfocables dentro del contenedor
    var focusable = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), ' +
      'input:not([disabled]), select:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])'
    );

    if (!focusable.length) {
      e.preventDefault();
      return;
    }

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: si está en el primero, ir al último
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: si está en el último, ir al primero
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return {
    activate: function (prevElement) {
      previouslyFocused = prevElement || document.activeElement;
      document.addEventListener('keydown', handler);
      // Enfocar el primer elemento del modal
      var firstFocusable = container.querySelector(
        'a[href], button:not([disabled]), textarea:not([disabled]), ' +
        'input:not([disabled]), select:not([disabled]), ' +
        '[tabindex]:not([tabindex="-1"])'
      );
      if (firstFocusable) {
        firstFocusable.focus();
      }
    },
    deactivate: function () {
      document.removeEventListener('keydown', handler);
      // Restaurar foco al elemento que tenía foco antes de abrir el modal
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
    }
  };
}

// --- Iconos disponibles (compartidos entre Quick Access y Read Later) ---
var BRAND_ICONS = [
  'fa-brands fa-github',
  'fa-brands fa-youtube',
  'fa-brands fa-twitter',
  'fa-brands fa-discord',
  'fa-brands fa-spotify',
  'fa-brands fa-linkedin',
  'fa-brands fa-reddit',
  'fa-brands fa-twitch',
  'fa-brands fa-instagram',
  'fa-brands fa-telegram',
  'fa-brands fa-whatsapp',
  'fa-brands fa-tiktok',
  'fa-brands fa-dribbble',
  'fa-brands fa-figma',
  'fa-brands fa-stack-overflow'
];

var GENERIC_ICONS = [
  'fa-solid fa-house',
  'fa-solid fa-star',
  'fa-solid fa-heart',
  'fa-solid fa-book',
  'fa-solid fa-code',
  'fa-solid fa-chart-line',
  'fa-solid fa-envelope',
  'fa-solid fa-calendar',
  'fa-solid fa-newspaper',
  'fa-solid fa-gamepad',
  'fa-solid fa-music',
  'fa-solid fa-graduation-cap',
  'fa-solid fa-briefcase',
  'fa-solid fa-camera',
  'fa-solid fa-palette',
  'fa-solid fa-globe',
  'fa-solid fa-robot',
  'fa-solid fa-bolt',
  'fa-solid fa-folder',
  'fa-solid fa-bell',
  'fa-solid fa-bookmark',
  'fa-solid fa-cloud',
  'fa-solid fa-compass',
  'fa-solid fa-magnifying-glass',
  'fa-solid fa-link',
  'fa-solid fa-shield',
  'fa-solid fa-wrench',
  'fa-solid fa-rocket'
];

var ALL_ICONS = BRAND_ICONS.concat(GENERIC_ICONS);

// --- Construir picker de iconos en un contenedor ---
function buildIconPicker(container, onSelect, selectedIcon) {
  container.innerHTML = '';
  ALL_ICONS.forEach(function (iconClass) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-picker-item' + (iconClass === selectedIcon ? ' selected' : '');
    btn.dataset.icon = iconClass;
    btn.innerHTML = '<i class="' + iconClass + '"></i>';
    btn.title = iconClass.split(' ').pop();
    btn.addEventListener('click', function () {
      container.querySelectorAll('.icon-picker-item').forEach(function (b) {
        b.classList.remove('selected');
      });
      btn.classList.add('selected');
      if (onSelect) onSelect(iconClass);
    });
    container.appendChild(btn);
  });
}
