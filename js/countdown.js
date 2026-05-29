/**
 * countdown.js — Countdown flotante con estilo flip clock
 * Se configura desde Settings (Apariencia) o via Command Palette.
 * Persiste en localStorage. Muestra modal de celebracion al llegar.
 */

(function () {
  'use strict';

  // --- Elementos ---
  var floatWidget = document.getElementById('countdown-float');
  var cdNameEl = document.getElementById('cd-event-name');
  var cdDaysEl = document.getElementById('cd-days');
  var cdHoursEl = document.getElementById('cd-hours');
  var cdMinsEl = document.getElementById('cd-mins');
  var cdCloseBtn = document.getElementById('cd-close');
  var cdCelebrationModal = document.getElementById('cd-celebration-modal');
  var cdCelebrationTitle = document.getElementById('cd-celebration-title');
  var cdCelebrationClose = document.getElementById('cd-celebration-close');

  // Settings elements
  var cdNameInput = document.getElementById('cd-name-input');
  var cdDateInput = document.getElementById('cd-date-input');
  var cdSaveBtn = document.getElementById('cd-save-btn');
  var cdRemoveBtn = document.getElementById('cd-remove-btn');
  var cdSettingsStatus = document.getElementById('cd-settings-status');

  // --- Estado ---
  var config = null; // { name, date (ISO string) }
  var timerInterval = null;
  var celebrationShown = false;
  var dismissed = false;

  // --- Constantes ---
  var STORAGE_KEY = 'mozzpcc-countdown';
  var CELEBRATED_KEY = 'mozzpcc-countdown-celebrated';

  // =============================================
  // PERSISTENCIA
  // =============================================

  function loadConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        config = JSON.parse(raw);
      }
    } catch (e) {
      config = null;
    }
  }

  function saveConfig(name, date) {
    config = { name: name, date: date };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Reset celebration flag when config changes
    localStorage.removeItem(CELEBRATED_KEY);
    celebrationShown = false;
    dismissed = false;
  }

  function removeConfig() {
    config = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CELEBRATED_KEY);
    celebrationShown = false;
    dismissed = false;
  }

  function wasCelebrated() {
    return localStorage.getItem(CELEBRATED_KEY) === 'true';
  }

  function markCelebrated() {
    localStorage.setItem(CELEBRATED_KEY, 'true');
    celebrationShown = true;
  }

  // =============================================
  // CALCULO
  // =============================================

  function getRemaining() {
    if (!config || !config.date) return null;
    var target = new Date(config.date).getTime();
    var now = Date.now();
    var diff = target - now;
    if (diff <= 0) return { total: 0, days: 0, hours: 0, mins: 0, arrived: true };
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { total: diff, days: days, hours: hours, mins: mins, arrived: false };
  }

  // =============================================
  // RENDER
  // =============================================

  function updateDisplay() {
    if (!config) {
      floatWidget.style.display = 'none';
      return;
    }

    var remaining = getRemaining();

    if (!remaining) {
      floatWidget.style.display = 'none';
      return;
    }

    // Llego el momento
    if (remaining.arrived) {
      floatWidget.style.display = 'none';
      stopTimer();
      if (!celebrationShown && !wasCelebrated()) {
        showCelebration();
      }
      return;
    }

    // Mostrar widget
    if (!dismissed) {
      floatWidget.style.display = 'flex';
    }

    // Nombre del evento
    if (cdNameEl) {
      cdNameEl.textContent = config.name;
    }

    // Numeros
    if (cdDaysEl) cdDaysEl.textContent = String(remaining.days).padStart(2, '0');
    if (cdHoursEl) cdHoursEl.textContent = String(remaining.hours).padStart(2, '0');
    if (cdMinsEl) cdMinsEl.textContent = String(remaining.mins).padStart(2, '0');

    // Color segun proximidad
    updateProximityState(remaining);
  }

  function updateProximityState(remaining) {
    if (!floatWidget) return;

    // Limpiar clases previas
    floatWidget.classList.remove('cd-safe', 'cd-warning', 'cd-urgent', 'cd-imminent');

    var totalHours = remaining.total / (1000 * 60 * 60);

    if (totalHours < 1) {
      floatWidget.classList.add('cd-imminent'); // < 1h: rojo pulsante
    } else if (totalHours < 24) {
      floatWidget.classList.add('cd-urgent'); // < 24h: rojo
    } else if (remaining.days < 7) {
      floatWidget.classList.add('cd-warning'); // < 7 dias: amarillo
    } else {
      floatWidget.classList.add('cd-safe'); // >= 7 dias: verde
    }
  }

  // =============================================
  // CELEBRACION
  // =============================================

  function showCelebration() {
    if (!cdCelebrationModal || !cdCelebrationTitle || !config) return;

    cdCelebrationTitle.textContent = config.name;
    cdCelebrationModal.style.display = 'flex';
    markCelebrated();

    // Sonido sutil con Web Audio API
    playCelebrationSound();
  }

  function hideCelebration() {
    if (cdCelebrationModal) {
      cdCelebrationModal.style.display = 'none';
    }
  }

  function playCelebrationSound() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Nota ascendente simple
      var notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.value = 0.08;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.5);
      });
    } catch (e) {
      // Silencioso si no hay Web Audio
    }
  }

  // =============================================
  // TIMER
  // =============================================

  function startTimer() {
    stopTimer();
    updateDisplay();
    timerInterval = setInterval(updateDisplay, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // =============================================
  // SETTINGS INTEGRATION
  // =============================================

  function populateSettings() {
    if (!cdNameInput || !cdDateInput) return;

    if (config) {
      cdNameInput.value = config.name || '';
      // datetime-local necesita formato YYYY-MM-DDTHH:mm
      if (config.date) {
        var d = new Date(config.date);
        var pad = function (n) { return String(n).padStart(2, '0'); };
        cdDateInput.value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      }
    } else {
      cdNameInput.value = '';
      cdDateInput.value = '';
    }
  }

  function showSettingsStatus(msg, isError) {
    if (!cdSettingsStatus) return;
    cdSettingsStatus.textContent = msg;
    cdSettingsStatus.style.color = isError ? '#fb7185' : 'var(--note-green)';
    setTimeout(function () { cdSettingsStatus.textContent = ''; }, 3000);
  }

  function handleSave() {
    if (!cdNameInput || !cdDateInput) return;

    var name = cdNameInput.value.trim();
    var dateVal = cdDateInput.value;

    if (!name) {
      showSettingsStatus('Ponele un nombre al evento', true);
      cdNameInput.focus();
      return;
    }

    if (!dateVal) {
      showSettingsStatus('Elegi una fecha y hora', true);
      cdDateInput.focus();
      return;
    }

    var targetDate = new Date(dateVal).getTime();
    if (targetDate <= Date.now()) {
      showSettingsStatus('La fecha tiene que ser en el futuro', true);
      return;
    }

    saveConfig(name, new Date(dateVal).toISOString());
    showSettingsStatus('Countdown guardado!');
    startTimer();
  }

  function handleRemove() {
    if (!config) {
      showSettingsStatus('No hay countdown activo', true);
      return;
    }
    if (confirm('Eliminar el countdown "' + config.name + '"?')) {
      removeConfig();
      stopTimer();
      floatWidget.style.display = 'none';
      populateSettings();
      showSettingsStatus('Countdown eliminado');
    }
  }

  // =============================================
  // EVENTOS
  // =============================================

  // Cerrar widget flotante
  if (cdCloseBtn) {
    cdCloseBtn.addEventListener('click', function () {
      floatWidget.style.display = 'none';
      dismissed = true;
    });
  }

  // Cerrar celebracion
  if (cdCelebrationClose) {
    cdCelebrationClose.addEventListener('click', hideCelebration);
  }
  if (cdCelebrationModal) {
    cdCelebrationModal.addEventListener('click', function (e) {
      if (e.target === cdCelebrationModal) hideCelebration();
    });
  }

  // Settings
  if (cdSaveBtn) cdSaveBtn.addEventListener('click', handleSave);
  if (cdRemoveBtn) cdRemoveBtn.addEventListener('click', handleRemove);

  // Enter en inputs
  if (cdNameInput) cdNameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') cdDateInput.focus(); });
  if (cdDateInput) cdDateInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSave(); });

  // Auto-fill minimum date (now)
  if (cdDateInput) {
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    cdDateInput.min = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  // Escape para cerrar celebracion
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cdCelebrationModal && cdCelebrationModal.style.display === 'flex') {
      hideCelebration();
    }
  });

  // =============================================
  // INIT
  // =============================================

  loadConfig();
  populateSettings();

  if (config) {
    var remaining = getRemaining();
    if (remaining && !remaining.arrived) {
      startTimer();
    } else if (remaining && remaining.arrived && !wasCelebrated()) {
      showCelebration();
    }
  }

  // --- API publica ---
  window.Countdown = {
    getConfig: function () { return config; },
    save: handleSave,
    remove: handleRemove,
    populate: populateSettings
  };

})();
