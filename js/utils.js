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

// --- Imagen fallback handler (CSP-safe, reemplaza inline onerror) ---
function setupImageErrors(root) {
  if (!root) return;
  root.querySelectorAll('img[data-img-error]').forEach(function (img) {
    img.addEventListener('error', function () {
      var action = img.dataset.imgError;
      if (action === 'hide') {
        img.style.display = 'none';
      } else if (action === 'poster-fallback') {
        var el = document.createElement('div');
        el.className = 'tv-no-poster';
        el.innerHTML = '<i class="fa-solid fa-film"></i>';
        img.replaceWith(el);
      } else if (action === 'thumb-fallback') {
        var el = document.createElement('div');
        el.className = 'nw-thumb-placeholder';
        el.innerHTML = '<i class="fa-regular fa-image"></i>';
        img.replaceWith(el);
      } else if (action === 'featured-fallback') {
        var el = document.createElement('div');
        el.className = 'nw-featured-img-placeholder';
        el.innerHTML = '<i class="fa-regular fa-image"></i>';
        img.replaceWith(el);
      }
    });
  });
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
//  API CACHE — Cache centralizado para respuestas de APIs externas
//  Usa localStorage con timestamps y TTL configurable por clave.
// =========================================================================

var _apiCachePrefix = 'mozzpcc_apicache_';

/**
 * Obtiene datos cacheados para una clave dada.
 * @param {string} key - Identificador único (ej: 'weather', 'dollar-latest')
 * @returns {*} Los datos cacheados, o null si no existen o expiraron.
 */
function apiCacheGet(key) {
  try {
    var raw = localStorage.getItem(_apiCachePrefix + key);
    if (!raw) return null;
    var entry = JSON.parse(raw);
    if (Date.now() - entry.ts > entry.ttl) {
      localStorage.removeItem(_apiCachePrefix + key);
      return null;
    }
    return entry.data;
  } catch (e) {
    return null;
  }
}

/**
 * Guarda datos en cache con un TTL.
 * @param {string} key - Identificador único
 * @param {*} data - Los datos a cachear (se serializan con JSON.stringify)
 * @param {number} ttlMs - Tiempo de vida en milisegundos
 */
function apiCacheSet(key, data, ttlMs) {
  try {
    localStorage.setItem(_apiCachePrefix + key, JSON.stringify({
      ts: Date.now(),
      ttl: ttlMs,
      data: data
    }));
  } catch (e) {
    // localStorage lleno — limpiar caches viejos y reintentar
    apiCacheCleanup();
    try {
      localStorage.setItem(_apiCachePrefix + key, JSON.stringify({
        ts: Date.now(),
        ttl: ttlMs,
        data: data
      }));
    } catch (e2) {
      // No se pudo guardar, seguir sin cache
    }
  }
}

/**
 * Invalida (borra) el cache para una clave específica.
 * @param {string} key - Identificador único
 */
function apiCacheInvalidate(key) {
  try {
    localStorage.removeItem(_apiCachePrefix + key);
  } catch (e) {}
}

/**
 * Limpia todas las entradas de API cache que ya expiraron.
 */
function apiCacheCleanup() {
  try {
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(_apiCachePrefix) === 0) {
        try {
          var entry = JSON.parse(localStorage.getItem(k));
          if (Date.now() - entry.ts > entry.ttl) {
            keysToRemove.push(k);
          }
        } catch (e) {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
  } catch (e) {}
}

/**
 * Wrapper para fetch con cache: retorna datos cacheados si son válidos,
 * si no hace el fetch real y cachea el resultado.
 *
 * @param {string} cacheKey - Clave para el cache
 * @param {string} url - URL a fetchear
 * @param {number} ttlMs - TTL del cache en ms
 * @param {object} [opts] - Opciones adicionales para fetch
 * @returns {Promise<*>} Los datos (JSON parseado)
 */
async function fetchWithCache(cacheKey, url, ttlMs, opts) {
  var cached = apiCacheGet(cacheKey);
  if (cached !== null) return cached;

  var res = await fetch(url, opts);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var data = await res.json();

  apiCacheSet(cacheKey, data, ttlMs);
  return data;
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
