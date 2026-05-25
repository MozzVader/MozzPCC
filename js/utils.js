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
