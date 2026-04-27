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

    // Bloquear animaciones de entrada de cards después de que terminen
    // Esto evita que parpadeen al cambiar de pestaña
    setTimeout(function () {
      document.querySelectorAll('.card').forEach(function (card) {
        card.classList.add('card-entered');
      });
    }, 800); // tiempo suficiente para que la última card (0.5s delay + 0.6s animación) termine

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

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
