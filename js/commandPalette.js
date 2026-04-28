/**
 * commandPalette.js — Command Palette (Ctrl+K / Cmd+K)
 * Busca secciones, links del dock, tareas, notas y acciones rápidas
 * Se integra con los datos existentes en memoria
 */

(function () {
  'use strict';

  // --- Elementos ---
  var overlay = document.getElementById('cmd-palette');
  var input = document.getElementById('cmd-palette-input');
  var resultsEl = document.getElementById('cmd-palette-results');

  // --- Estado ---
  var isOpen = false;
  var items = [];       // Items renderizados en la lista
  var selectedIndex = 0; // Índice del item seleccionado

  // =============================================
  // FUENTES DE DATOS
  // =============================================

  /** Secciones del dashboard */
  function getSections() {
    return [
      { id: 'sec-clock',    group: 'Secciones', icon: 'fa-regular fa-clock',      label: 'Reloj',         hint: 'Ir al reloj',            action: function () { scrollTo('section-clock'); } },
      { id: 'sec-product',  group: 'Secciones', icon: 'fa-solid fa-bolt',         label: 'Productividad', hint: 'Tareas y pomodoro',      action: function () { scrollTo('section-productivity'); } },
      { id: 'sec-notes',    group: 'Secciones', icon: 'fa-solid fa-note-sticky',   label: 'Notas',         hint: 'Notas rápidas',          action: function () { scrollTo('section-notes'); } },
      { id: 'sec-quotes',   group: 'Secciones', icon: 'fa-solid fa-quote-left',    label: 'Inspiracion',   hint: 'Frase motivacional',     action: function () { scrollTo('section-quotes'); } }
    ];
  }

  /** Links del dock (desde settings.js) */
  function getDockLinks() {
    var dockData = (typeof window.getDockData === 'function') ? window.getDockData() : [];
    var links = [];
    dockData.forEach(function (group) {
      (group.links || []).forEach(function (link) {
        links.push({
          id: 'link-' + link.id,
          group: 'Dock — ' + group.name,
          icon: link.icon,
          label: link.name,
          hint: link.url,
          action: function () { window.open(link.url, '_blank', 'noopener'); }
        });
      });
    });
    return links;
  }

  /** Acciones rápidas */
  function getActions() {
    return [
      { id: 'act-newtask',  group: 'Acciones', icon: 'fa-solid fa-plus',        label: 'Nueva tarea',          hint: 'Agregar tarea',    shortcut: '',    action: function () { focusElement('task-input'); } },
      { id: 'act-newnote',  group: 'Acciones', icon: 'fa-solid fa-note-sticky', label: 'Nueva nota',           hint: 'Crear nota',        shortcut: '',    action: function () { clickElement('new-note-btn'); } },
      { id: 'act-pomo',     group: 'Acciones', icon: 'fa-solid fa-play',        label: 'Iniciar pomodoro',     hint: 'Empezar timer',     shortcut: '',    action: function () { clickElement('pomodoro-start'); } },
      { id: 'act-quote',    group: 'Acciones', icon: 'fa-solid fa-shuffle',     label: 'Nueva frase',          hint: 'Cambiar cita',      shortcut: '',    action: function () { clickElement('new-quote-btn'); } },
      { id: 'act-settings', group: 'Acciones', icon: 'fa-solid fa-gear',        label: 'Configuracion',        hint: 'Abrir settings',    shortcut: '',    action: function () { clickElement('settings-btn'); } }
    ];
  }

  /** Tareas pendientes */
  function getTasks() {
    var list = document.getElementById('task-list');
    if (!list) return [];
    var taskEls = list.querySelectorAll('.task-item');
    var tasks = [];
    taskEls.forEach(function (el) {
      var textEl = el.querySelector('.task-text');
      if (!textEl) return;
      var isCompleted = el.classList.contains('completed');
      tasks.push({
        id: 'task-' + (el.dataset.id || ''),
        group: 'Tareas',
        icon: isCompleted ? 'fa-regular fa-circle-check' : 'fa-regular fa-circle',
        label: textEl.textContent.trim(),
        hint: isCompleted ? 'Completada' : 'Pendiente',
        action: function () {
          var checkBtn = el.querySelector('.task-check');
          if (checkBtn) checkBtn.click();
        }
      });
    });
    return tasks;
  }

  /** Títulos de notas */
  function getNotes() {
    var grid = document.getElementById('notes-grid');
    if (!grid) return [];
    var noteEls = grid.querySelectorAll('.note-card');
    var notes = [];
    noteEls.forEach(function (el, i) {
      var titleEl = el.querySelector('.note-title');
      var text = titleEl ? titleEl.textContent.trim() : 'Nota ' + (i + 1);
      notes.push({
        id: 'note-' + i,
        group: 'Notas',
        icon: 'fa-solid fa-note-sticky',
        label: text.length > 40 ? text.substring(0, 40) + '...' : text,
        hint: 'Ir a notas',
        action: function () { scrollTo('section-notes'); }
      });
    });
    return notes;
  }

  // =============================================
  // BÚSQUEDA
  // =============================================

  function search(query) {
    var q = query.toLowerCase().trim();

    var allItems = []
      .concat(getSections())
      .concat(getDockLinks())
      .concat(getActions())
      .concat(getTasks())
      .concat(getNotes());

    if (!q) return allItems;

    return allItems.filter(function (item) {
      var label = item.label.toLowerCase();
      var hint = (item.hint || '').toLowerCase();
      var group = (item.group || '').toLowerCase();
      return label.indexOf(q) !== -1 || hint.indexOf(q) !== -1 || group.indexOf(q) !== -1;
    });
  }

  // =============================================
  // RENDER
  // =============================================

  function render(query) {
    items = search(query);
    selectedIndex = 0;
    resultsEl.innerHTML = '';

    if (items.length === 0) {
      resultsEl.innerHTML = '<div class="cmd-empty">No se encontraron resultados</div>';
      return;
    }

    var currentGroup = '';
    var html = '';

    items.forEach(function (item, index) {
      // Group label
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        html += '<div class="cmd-group-label">' + escapeHtml(currentGroup) + '</div>';
      }

      // Highlight matched text
      var labelHtml = escapeHtml(item.label);
      if (query && query.trim()) {
        var q = query.trim();
        var idx = item.label.toLowerCase().indexOf(q.toLowerCase());
        if (idx !== -1) {
          var before = escapeHtml(item.label.substring(0, idx));
          var match = escapeHtml(item.label.substring(idx, idx + q.length));
          var after = escapeHtml(item.label.substring(idx + q.length));
          labelHtml = before + '<mark>' + match + '</mark>' + after;
        }
      }

      var selected = index === 0 ? ' selected' : '';
      var shortcutHtml = item.shortcut
        ? '<span class="cmd-item-shortcut">' + item.shortcut + '</span>'
        : '';

      html += '<div class="cmd-item' + selected + '" data-index="' + index + '">' +
        '<div class="cmd-item-icon"><i class="' + item.icon + '"></i></div>' +
        '<div class="cmd-item-text">' +
          '<div class="cmd-item-label">' + labelHtml + '</div>' +
        '</div>' +
        '<span class="cmd-item-hint">' + escapeHtml(item.hint || '') + '</span>' +
        shortcutHtml +
      '</div>';
    });

    resultsEl.innerHTML = html;

    // Click events
    resultsEl.querySelectorAll('.cmd-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = parseInt(el.dataset.index, 10);
        executeItem(idx);
      });
      el.addEventListener('mouseenter', function () {
        setSelected(parseInt(el.dataset.index, 10));
      });
    });
  }

  // =============================================
  // NAVEGACIÓN
  // =============================================

  function setSelected(index) {
    if (items.length === 0) return;
    index = Math.max(0, Math.min(index, items.length - 1));
    selectedIndex = index;

    resultsEl.querySelectorAll('.cmd-item').forEach(function (el, i) {
      el.classList.toggle('selected', i === index);
    });

    // Scroll into view
    var selectedEl = resultsEl.querySelector('.cmd-item.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }

  function moveUp() {
    setSelected(selectedIndex - 1);
  }

  function moveDown() {
    setSelected(selectedIndex + 1);
  }

  function executeItem(index) {
    if (items[index] && typeof items[index].action === 'function') {
      close();
      items[index].action();
    }
  }

  // =============================================
  // OPEN / CLOSE
  // =============================================

  function open() {
    isOpen = true;
    overlay.style.display = 'flex';
    input.value = '';
    input.focus();
    render('');
  }

  function close() {
    isOpen = false;
    overlay.style.display = 'none';
    input.blur();
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  // =============================================
  // HELPERS
  // =============================================

  function scrollTo(id) {
    var el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function focusElement(id) {
    var el = document.getElementById(id);
    if (el) {
      scrollTo(el.closest('.snap-section') ? el.closest('.snap-section').id : '');
      setTimeout(function () { el.focus(); }, 300);
    }
  }

  function clickElement(id) {
    var el = document.getElementById(id);
    if (el) el.click();
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // =============================================
  // EVENTOS
  // =============================================

  // Keyboard shortcut: Cmd+K / Ctrl+K
  document.addEventListener('keydown', function (e) {
    // No abrir si estamos en un input/textarea (excepto el propio input)
    var tag = (e.target.tagName || '').toLowerCase();
    var isInput = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggle();
      return;
    }

    if (!isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveDown();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveUp();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      executeItem(selectedIndex);
      return;
    }
  });

  // Input typing
  input.addEventListener('input', function () {
    render(input.value);
  });

  // Click outside to close
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  // Re-render al abrir el palette (por si cambiaron los datos)
  window.addEventListener('dock:update', function () {
    if (isOpen) render(input.value);
  });
})();
