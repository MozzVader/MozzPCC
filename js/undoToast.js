/**
 * undoToast.js — Toast de "Deshacer" global
 * Muestra un toast al eliminar algo con botón de undo.
 * Si no se deshace en 5s, ejecuta la eliminación real.
 */

(function () {
  'use strict';

  var container = document.getElementById('undo-toast-container');
  var timer = null;
  var pendingAction = null;
  var pendingUndo = null;
  var toastEl = null;
  var undoBtn = null;

  function show(options) {
    // options: { message, onConfirm, onUndo }
    // Cancelar toast anterior
    cancel(false);

    // Crear toast
    toastEl = document.createElement('div');
    toastEl.className = 'undo-toast';

    var msg = document.createElement('span');
    msg.className = 'undo-toast-message';
    msg.textContent = options.message || 'Elemento eliminado';

    undoBtn = document.createElement('button');
    undoBtn.className = 'undo-toast-btn';
    undoBtn.textContent = 'Deshacer';
    undoBtn.addEventListener('click', function () {
      cancel(true);
    });

    toastEl.appendChild(msg);
    toastEl.appendChild(undoBtn);
    container.appendChild(toastEl);

    // Trigger animation
    requestAnimationFrame(function () {
      toastEl.classList.add('visible');
    });

    // Guardar callbacks
    pendingAction = options.onConfirm || null;
    pendingUndo = options.onUndo || null;

    // Timer de 5 segundos
    timer = setTimeout(function () {
      cancel(false);
    }, 5000);
  }

  function cancel(undone) {
    // Limpiar timer
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    // Si se deshizo, ejecutar onUndo y NO ejecutar onConfirm
    if (undone) {
      if (pendingUndo) {
        try { pendingUndo(); } catch (e) { console.warn('UndoToast: error en onUndo', e); }
      }
    } else if (pendingAction) {
      try { pendingAction(); } catch (e) { console.warn('UndoToast: error en onConfirm', e); }
    }
    pendingAction = null;
    pendingUndo = null;

    // Animar salida y remover
    if (toastEl) {
      toastEl.classList.remove('visible');
      toastEl.classList.add('hiding');
      var el = toastEl;
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 300);
      toastEl = null;
    }
  }

  // API pública
  window.UndoToast = {
    show: show
  };
})();
