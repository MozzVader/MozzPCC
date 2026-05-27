/**
 * commandPalette.js — Command Palette (Ctrl+K / Cmd+K)
 * Busca secciones, accesos rapidos, tareas, notas, finanzas,
 * links guardados, series y ejecuta comandos de busqueda web
 */

(function () {
  'use strict';

  // --- Elementos ---
  var overlay = document.getElementById('cmd-palette');
  var input = document.getElementById('cmd-palette-input');
  var resultsEl = document.getElementById('cmd-palette-results');
  var paletteInner = overlay ? overlay.querySelector('.cmd-palette') : null;
  var paletteTrap = paletteInner && overlay ? createFocusTrap(paletteInner, overlay) : null;

  // --- Estado ---
  var isOpen = false;
  var items = [];
  var selectedIndex = 0;

  // =============================================
  // COMANDOS DE BUSQUEDA WEB
  // =============================================

  var WEB_COMMANDS = [
    { prefix: '/yt',  label: 'YouTube',    icon: 'fa-brands fa-youtube',     color: '#ff0000', url: 'https://www.youtube.com/results?search_query=' },
    { prefix: '/g',   label: 'Google',     icon: 'fa-brands fa-google',      color: '#4285f4', url: 'https://www.google.com/search?q=' },
    { prefix: '/w',   label: 'Wikipedia',  icon: 'fa-brands fa-wikipedia-w', color: '#636466', url: 'https://es.wikipedia.org/w/index.php?search=' },
    { prefix: '/tw',  label: 'X / Twitter',icon: 'fa-brands fa-x-twitter',   color: '#e7e9ea', url: 'https://x.com/search?q=' },
    { prefix: '/r',   label: 'Reddit',     icon: 'fa-brands fa-reddit-alien',color: '#ff4500', url: 'https://www.reddit.com/search/?q=' },
    { prefix: '/gh',  label: 'GitHub',     icon: 'fa-brands fa-github',      color: '#f0f6fc', url: 'https://github.com/search?q=' },
    { prefix: '/d',   label: 'DuckDuckGo', icon: 'fa-solid fa-magnifying-glass', color: '#de5833', url: 'https://duckduckgo.com/?q=' }
  ];

  /**
   * Detecta si el query es un comando de busqueda web
   * Retorna { command, query } o null
   */
  function parseWebCommand(raw) {
    var trimmed = raw.trim();
    for (var i = 0; i < WEB_COMMANDS.length; i++) {
      var cmd = WEB_COMMANDS[i];
      if (trimmed.toLowerCase().indexOf(cmd.prefix) === 0) {
        var query = trimmed.substring(cmd.prefix.length).trim();
        return { command: cmd, query: query };
      }
    }
    return null;
  }

  /**
   * Construye los items para busqueda web (sugerencias de comandos)
   */
  function getWebSuggestions(query) {
    var q = query.toLowerCase().trim();
    if (!q) return [];

    return WEB_COMMANDS.map(function (cmd) {
      var fullQuery = cmd.prefix + ' ' + q;
      return {
        id: 'web-' + cmd.prefix,
        group: 'Busqueda Web',
        icon: cmd.icon,
        label: cmd.label,
        hint: 'Buscar "' + q + '" en ' + cmd.label,
        shortcut: cmd.prefix,
        action: function () {
          window.open(cmd.url + encodeURIComponent(q), '_blank', 'noopener');
        }
      };
    });
  }

  /**
   * Construye un item de busqueda web ya confirmado
   */
  function getWebResult(command, query) {
    return {
      id: 'web-exec-' + command.prefix,
      group: 'Busqueda Web',
      icon: command.icon,
      label: 'Buscar en ' + command.label,
      hint: query,
      shortcut: 'Enter para abrir',
      action: function () {
        window.open(command.url + encodeURIComponent(query), '_blank', 'noopener');
      }
    };
  }

  // =============================================
  // FUENTES DE DATOS
  // =============================================

  /** Secciones del dashboard */
  function getSections() {
    return [
      { id: 'sec-clock',    group: 'Secciones', icon: 'fa-regular fa-clock',      label: 'Reloj',         hint: 'Ir al reloj',            action: function () { scrollTo('section-clock'); } },
      { id: 'sec-quick',    group: 'Secciones', icon: 'fa-solid fa-rocket',        label: 'Acceso Rapido', hint: 'Accesos directos',      action: function () { scrollTo('section-quick-access'); } },
      { id: 'sec-product',  group: 'Secciones', icon: 'fa-solid fa-bolt',         label: 'Productividad', hint: 'Lista de tareas',         action: function () { scrollTo('section-productivity'); } },
      { id: 'sec-finances', group: 'Secciones', icon: 'fa-solid fa-wallet',        label: 'Finanzas',      hint: 'Finanzas personales',    action: function () { scrollTo('section-finances'); } },
      { id: 'sec-tv',       group: 'Secciones', icon: 'fa-solid fa-tv',            label: 'Entretenimiento', hint: 'TV Shows y GitHub',      action: function () { scrollTo('section-tv-shows'); } },
      { id: 'sec-notes',    group: 'Secciones', icon: 'fa-solid fa-note-sticky',   label: 'Notas',         hint: 'Notas rapidas',          action: function () { scrollTo('section-notes'); } },
      { id: 'sec-rl',       group: 'Secciones', icon: 'fa-solid fa-bookmark',    label: 'Ver Mas Tarde', hint: 'Links guardados',        action: function () { scrollTo('section-read-later'); } }
    ];
  }

  /** Quick links desde quickAccess.js */
  function getQuickLinks() {
    var links = (typeof window.QuickAccess !== 'undefined') ? window.QuickAccess.getAll() : [];
    return links.map(function (link) {
      var icon = link.icon_type === 'image' ? 'fa-solid fa-image' : link.icon_value;
      return {
        id: 'ql-' + link.id,
        group: 'Accesos Rapidos',
        icon: icon,
        label: link.name,
        hint: link.url,
        action: function () { window.open(link.url, '_blank', 'noopener'); }
      };
    });
  }

  /** Acciones rapidas */
  function getActions() {
    return [
      { id: 'act-newtask',  group: 'Acciones', icon: 'fa-solid fa-plus',        label: 'Nueva tarea',          hint: 'Agregar tarea',    shortcut: '',    action: function () { focusElement('task-input'); } },
      { id: 'act-newnote',  group: 'Acciones', icon: 'fa-solid fa-note-sticky', label: 'Nueva nota',           hint: 'Crear nota',        shortcut: '',    action: function () { clickElement('new-note-btn'); } },
      { id: 'act-newrl',    group: 'Acciones', icon: 'fa-solid fa-bookmark',   label: 'Guardar link',         hint: 'Ver mas tarde',     shortcut: '',    action: function () { focusElement('rl-title-input'); } },
      { id: 'act-settings', group: 'Acciones', icon: 'fa-solid fa-gear',        label: 'Configuracion',        hint: 'Abrir settings',    shortcut: '',    action: function () { clickElement('settings-btn'); } },
      { id: 'act-countdown', group: 'Acciones', icon: 'fa-solid fa-hourglass-half', label: 'Configurar countdown', hint: 'Contador regresivo', shortcut: '', action: function () { openCountdownSettings(); } }
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

  /** Titulos de notas */
  function getNotes() {
    var grid = document.getElementById('notes-grid');
    if (!grid) return [];
    var noteEls = grid.querySelectorAll('.note');
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

  /** Transacciones de finanzas (via window.Finanzas) */
  function getFinances() {
    if (typeof window.Finanzas === 'undefined') return [];
    var transactions = window.Finanzas.getTransactions();
    var categories = window.Finanzas.getCategories();

    return transactions.slice(0, 10).map(function (t) {
      var cat = null;
      for (var i = 0; i < categories.length; i++) {
        if (categories[i].id === t.category_id) { cat = categories[i]; break; }
      }
      var desc = t.description || (cat ? cat.name : 'Sin descripcion');
      var prefix = t.type === 'ingreso' ? '+' : '-';
      var amount = prefix + parseFloat(t.amount || 0).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      return {
        id: 'fin-' + t.id,
        group: 'Finanzas',
        icon: cat ? cat.icon : 'fa-solid fa-receipt',
        label: desc.length > 35 ? desc.substring(0, 35) + '...' : desc,
        hint: amount + (t.date ? ' · ' + t.date.substring(5) : ''),
        action: function () { scrollTo('section-finances'); }
      };
    });
  }

  /** Links guardados en Ver Mas Tarde (via window.ReadLater) */
  function getReadLater() {
    if (typeof window.ReadLater === 'undefined') return [];
    var rlItems = window.ReadLater.getAll();

    return rlItems.map(function (item) {
      return {
        id: 'rl-' + item.id,
        group: 'Ver Mas Tarde',
        icon: item.icon || 'fa-solid fa-bookmark',
        label: item.title.length > 40 ? item.title.substring(0, 40) + '...' : item.title,
        hint: extractDomain(item.url),
        action: function () { window.open(item.url, '_blank', 'noopener'); }
      };
    });
  }

  /** Series seguidas (via window.TVShows) */
  function getTVShows() {
    if (typeof window.TVShows === 'undefined') return [];
    var shows = window.TVShows.getShows();

    return shows.map(function (show) {
      var statusLabel = show.status === 'Running' ? 'En emision' :
                        show.status === 'Ended' ? 'Finalizada' :
                        show.status || '';
      return {
        id: 'tv-' + show.id,
        group: 'Series',
        icon: 'fa-solid fa-tv',
        label: show.title,
        hint: statusLabel,
        action: function () {
          if (show.tvmaze_id) {
            window.open('https://www.tvmaze.com/shows/' + show.tvmaze_id, '_blank');
          }
        }
      };
    });
  }

  // =============================================
  // BÚSQUEDA
  // =============================================

  function search(query) {
    var raw = query.trim();
    var q = raw.toLowerCase();

    // Si el query empieza con /, es un comando web
    var webCmd = parseWebCommand(raw);
    if (webCmd) {
      // Si ya tiene texto despues del comando, mostrar el resultado ejecutable
      if (webCmd.query) {
        var results = [getWebResult(webCmd.command, webCmd.query)];
        // Tambien sugerir otros motores con el mismo query
        results = results.concat(getWebSuggestions(webCmd.query));
        return results;
      }
      // Si solo escribio "/yt" sin query, mostrar todos los comandos disponibles
      return getWebSuggestions('');
    }

    // Si el query no es vacio, agregar sugerencias web al final
    var allItems = []
      .concat(getSections())
      .concat(getQuickLinks())
      .concat(getActions())
      .concat(getTasks())
      .concat(getNotes())
      .concat(getFinances())
      .concat(getReadLater())
      .concat(getTVShows());

    // Agregar sugerencias de busqueda web si hay texto
    if (q) {
      var webSuggestions = getWebSuggestions(raw);
      if (webSuggestions.length > 0) {
        allItems = allItems.concat(webSuggestions);
      }
    }

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
        ? '<span class="cmd-item-shortcut">' + escapeHtml(item.shortcut) + '</span>'
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
    render('');
    if (paletteTrap) paletteTrap.activate();
    else input.focus();
  }

  function close() {
    isOpen = false;
    overlay.style.display = 'none';
    if (paletteTrap) paletteTrap.deactivate();
    else input.blur();
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

  function openCountdownSettings() {
    var settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.click();
    // Esperar a que se abra y cambiar al tab de apariencia
    setTimeout(function () {
      var appearanceTab = document.querySelector('.settings-tab[data-tab="appearance"]');
      if (appearanceTab) appearanceTab.click();
      // Scroll al section de countdown
      var cdSection = document.getElementById('cd-settings-section');
      if (cdSection) cdSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  }

  function extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // =============================================
  // EVENTOS
  // =============================================

  // Keyboard shortcut: Cmd+K / Ctrl+K (capture phase para evitar que Chrome lo intercepte)
  document.addEventListener('keydown', function (e) {
    // No abrir si estamos en un input/textarea (excepto el propio input del palette)
    var tag = (e.target.tagName || '').toLowerCase();
    var isInput = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      e.stopPropagation();
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
  }, true); // true = capture phase — atrapa el evento antes que el browser

  // Input typing
  input.addEventListener('input', function () {
    render(input.value);
  });

  // Click outside to close
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

})();
