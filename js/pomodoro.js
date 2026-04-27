/**
 * pomodoro.js — Temporizador Pomodoro con indicador circular SVG
 * Incluye notificación de audio via Web Audio API
 */

(function () {
  'use strict';

  // --- Constantes ---
  const WORK_DURATION = 25 * 60;    // 25 minutos en segundos
  const BREAK_DURATION = 5 * 60;    // 5 minutos en segundos
  const CIRCUMFERENCE = 2 * Math.PI * 90; // ~565.48 (radio SVG = 90)
  const STORAGE_KEY = 'mozzpcc_pomodoro';

  // --- Elementos del DOM ---
  const timeEl = document.getElementById('pomodoro-time');
  const labelEl = document.getElementById('pomodoro-label');
  const ringEl = document.getElementById('pomodoro-ring');
  const startBtn = document.getElementById('pomodoro-start');
  const resetBtn = document.getElementById('pomodoro-reset');
  const countEl = document.getElementById('pomodoro-count');
  const totalEl = document.getElementById('pomodoro-total');

  // --- Estado ---
  let modo = 'work';           // 'work' o 'break'
  let tiempoRestante = WORK_DURATION;
  let estaCorriendo = false;
  let intervalo = null;
  let sesiones = 0;
  let totalMinutos = 0;

  // Cargar estadísticas desde LocalStorage
  try {
    const datos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    sesiones = datos.sesiones || 0;
    totalMinutos = datos.totalMinutos || 0;
  } catch (e) {
    // Ignorar errores de carga
  }

  // --- Audio via Web Audio API ---
  let audioCtx = null;

  /**
   * Reproduce un sonido de notificación (beep)
   */
  function reproducirBeep() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Crear un beep agradable
      const oscilador = audioCtx.createOscillator();
      const ganancia = audioCtx.createGain();

      oscilador.connect(ganancia);
      ganancia.connect(audioCtx.destination);

      // Frecuencia y tipo de onda
      oscilador.type = 'sine';
      oscilador.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscilador.frequency.setValueAtTime(600, audioCtx.currentTime + 0.15);
      oscilador.frequency.setValueAtTime(800, audioCtx.currentTime + 0.3);

      // Volumen con fade out
      ganancia.gain.setValueAtTime(0.3, audioCtx.currentTime);
      ganancia.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscilador.start(audioCtx.currentTime);
      oscilador.stop(audioCtx.currentTime + 0.5);

      // Segundo beep después de una pausa
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.4);
      }, 600);
    } catch (e) {
      console.warn('Error al reproducir audio:', e);
    }
  }

  /**
   * Formatea segundos a MM:SS
   * @param {number} segundos - Total de segundos
   * @returns {string} Tiempo formateado
   */
  function formatearTiempo(segundos) {
    const m = Math.floor(segundos / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  /**
   * Actualiza el anillo de progreso SVG
   */
  function actualizarAnillo() {
    const duracionTotal = modo === 'work' ? WORK_DURATION : BREAK_DURATION;
    const progreso = tiempoRestante / duracionTotal;
    const offset = CIRCUMFERENCE * progreso;
    ringEl.style.strokeDashoffset = CIRCUMFERENCE - offset;

    // Cambiar color según modo
    if (modo === 'break') {
      ringEl.classList.add('break-mode');
    } else {
      ringEl.classList.remove('break-mode');
    }
  }

  /**
   * Actualiza la interfaz del temporizador
   */
  function actualizarDisplay() {
    timeEl.textContent = formatearTiempo(tiempoRestante);
    actualizarAnillo();

    // Actualizar etiqueta y título
    if (modo === 'work') {
      labelEl.textContent = 'Enfoque';
    } else {
      labelEl.textContent = 'Descanso';
    }

    // Actualizar estadísticas
    countEl.textContent = sesiones;
    totalEl.textContent = totalMinutos + 'm';
  }

  /**
   * Cambia entre modo trabajo y descanso
   */
  function cambiarModo() {
    if (modo === 'work') {
      // Terminó un pomodoro de trabajo
      sesiones++;
      totalMinutos += 25;
      guardarEstadisticas();
      modo = 'break';
      tiempoRestante = BREAK_DURATION;
    } else {
      // Terminó el descanso, volver al trabajo
      modo = 'work';
      tiempoRestante = WORK_DURATION;
    }

    reproducirBeep();
    actualizarDisplay();
  }

  /**
   * Guarda las estadísticas en LocalStorage
   */
  function guardarEstadisticas() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sesiones,
        totalMinutos
      }));
    } catch (e) {
      // Ignorar
    }
  }

  /**
   * Inicia o pausa el temporizador
   */
  function toggleTimer() {
    if (estaCorriendo) {
      // Pausar
      clearInterval(intervalo);
      intervalo = null;
      estaCorriendo = false;
      startBtn.innerHTML = '<i class="fa-solid fa-play"></i> Continuar';
    } else {
      // Iniciar
      estaCorriendo = true;
      startBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';

      intervalo = setInterval(() => {
        tiempoRestante--;

        if (tiempoRestante <= 0) {
          cambiarModo();
        }

        actualizarDisplay();
      }, 1000);
    }
  }

  /**
   * Reinicia el temporizador al estado inicial del modo actual
   */
  function resetTimer() {
    // Detener el temporizador si está corriendo
    if (intervalo) {
      clearInterval(intervalo);
      intervalo = null;
    }

    estaCorriendo = false;
    modo = 'work';
    tiempoRestante = WORK_DURATION;
    startBtn.innerHTML = '<i class="fa-solid fa-play"></i> Iniciar';
    actualizarDisplay();
  }

  // --- Eventos ---
  startBtn.addEventListener('click', toggleTimer);
  resetBtn.addEventListener('click', resetTimer);

  // --- Inicialización ---
  function init() {
    // Inicializar el anillo SVG
    ringEl.style.strokeDasharray = CIRCUMFERENCE;
    ringEl.style.strokeDashoffset = 0;
    actualizarDisplay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
