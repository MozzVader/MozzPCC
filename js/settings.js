/**
 * settings.js — Configuracion general del dashboard
 * Temas, accesos rapidos, moneda, GitHub username, clima
 * Icon picker con iconos curados de Font Awesome
 * Se inicializa cuando se recibe el evento 'auth:ready'
 */

(function () {
  'use strict';

  // Iconos disponibles — importados desde utils.js (ALL_ICONS)

  // --- Elementos del DOM ---
  var settingsBtn = document.getElementById('settings-btn');
  var settingsModal = document.getElementById('settings-modal');
  var settingsClose = document.getElementById('settings-close');
  var settingsInner = settingsModal ? settingsModal.querySelector('.settings-modal') : null;
  var settingsTrap = settingsInner && settingsModal ? createFocusTrap(settingsInner, settingsModal) : null;
  var themePaletteGrid = document.getElementById('theme-palette-grid');

  // --- Estado ---
  var userId = null;
  var currentTheme = 'cyber';
  var currentThemeSkin = 'default';
  var themeSkinGrid = document.getElementById('theme-skin-grid');

  // --- Tema skins (estructura visual) ---
  var THEME_SKINS = [
    {
      id: 'default',
      name: 'Dark Glass',
      desc: 'Glassmorphism oscuro',
      icon: 'fa-solid fa-moon',
      available: true,
      preview: {
        bg: '#0a0a1a',
        bars: ['rgba(37,37,37,0.4)', 'rgba(37,37,37,0.3)', 'rgba(37,37,37,0.35)', 'rgba(37,37,37,0.25)']
      }
    },
    {
      id: 'notion',
      name: 'Notion',
      desc: 'Claro y minimalista',
      icon: 'fa-solid fa-file-lines',
      available: true,
      preview: {
        bg: '#ffffff',
        bars: ['#f1f1ef', '#e8e8e6', '#ededec', '#f4f4f3']
      }
    },
    {
      id: 'linear',
      name: 'Linear',
      desc: 'Dark minimalista',
      icon: 'fa-solid fa-bolt',
      available: true,
      preview: {
        bg: '#08080a',
        bars: ['#111113', '#161618', '#1c1c1f', '#222225']
      }
    },
    {
      id: 'macos',
      name: 'macOS',
      desc: 'Vibrancy y transparencia',
      icon: 'fa-brands fa-apple',
      available: true,
      preview: {
        bg: '#1a1a2e',
        bars: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0.05)']
      }
    },
    {
      id: 'windows',
      name: 'Windows 11',
      desc: 'Fluent Design',
      icon: 'fa-brands fa-windows',
      available: false,
      preview: {
        bg: '#202020',
        bars: ['#2d2d2d', '#333333', '#2a2a2a', '#383838']
      }
    },
    {
      id: 'retro',
      name: 'Retro',
      desc: 'CRT / Fallout',
      icon: 'fa-solid fa-tv',
      available: false,
      preview: {
        bg: '#0c0c0c',
        bars: ['#1a3a1a', '#1a2a1a', '#0f2f0f', '#142814']
      }
    },
    {
      id: 'zai',
      name: 'Zai',
      desc: 'Aurora Neural',
      icon: 'fa-solid fa-wand-magic-sparkles',
      available: true,
      preview: {
        bg: '#06080f',
        bars: ['#141630', '#181c34', '#1e1a40', '#141828']
      }
    }
  ];

  // --- Paletas de colores ---
  var THEMES = [
    {
      id: 'cyber',
      name: 'Cyber',
      swatches: ['#00d4ff', '#7c3aed', '#00ff88', '#0ea5e9'],
      vars: {
        '--accent': '#00d4ff',
        '--accent-dim': 'rgba(0, 212, 255, 0.15)',
        '--accent-glow': 'rgba(0, 212, 255, 0.4)',
        '--accent-secondary': '#7c3aed',
        '--shadow-glow': '0 0 20px rgba(0, 212, 255, 0.15)',
        '--bg-glow-a': 'rgba(124, 58, 237, 0.15)',
        '--bg-glow-b': 'rgba(0, 212, 255, 0.1)',
        '--bg-glow-c': 'rgba(124, 58, 237, 0.08)',
        '--border-accent': 'rgba(0, 212, 255, 0.3)'
      }
    },
    {
      id: 'violet',
      name: 'Violet',
      swatches: ['#a78bfa', '#c084fc', '#f472b6', '#818cf8'],
      vars: {
        '--accent': '#a78bfa',
        '--accent-dim': 'rgba(167, 139, 250, 0.15)',
        '--accent-glow': 'rgba(167, 139, 250, 0.4)',
        '--accent-secondary': '#f472b6',
        '--shadow-glow': '0 0 20px rgba(167, 139, 250, 0.15)',
        '--bg-glow-a': 'rgba(244, 114, 182, 0.12)',
        '--bg-glow-b': 'rgba(167, 139, 250, 0.1)',
        '--bg-glow-c': 'rgba(129, 140, 248, 0.08)',
        '--border-accent': 'rgba(167, 139, 250, 0.3)'
      }
    },
    {
      id: 'emerald',
      name: 'Emerald',
      swatches: ['#34d399', '#10b981', '#3b82f6', '#6ee7b7'],
      vars: {
        '--accent': '#34d399',
        '--accent-dim': 'rgba(52, 211, 153, 0.15)',
        '--accent-glow': 'rgba(52, 211, 153, 0.4)',
        '--accent-secondary': '#3b82f6',
        '--shadow-glow': '0 0 20px rgba(52, 211, 153, 0.15)',
        '--bg-glow-a': 'rgba(59, 130, 246, 0.12)',
        '--bg-glow-b': 'rgba(52, 211, 153, 0.1)',
        '--bg-glow-c': 'rgba(16, 185, 129, 0.08)',
        '--border-accent': 'rgba(52, 211, 153, 0.3)'
      }
    },
    {
      id: 'rose',
      name: 'Rose',
      swatches: ['#fb7185', '#f43f5e', '#fda4af', '#e879f9'],
      vars: {
        '--accent': '#fb7185',
        '--accent-dim': 'rgba(251, 113, 133, 0.15)',
        '--accent-glow': 'rgba(251, 113, 133, 0.4)',
        '--accent-secondary': '#e879f9',
        '--shadow-glow': '0 0 20px rgba(251, 113, 133, 0.15)',
        '--bg-glow-a': 'rgba(232, 121, 249, 0.12)',
        '--bg-glow-b': 'rgba(251, 113, 133, 0.1)',
        '--bg-glow-c': 'rgba(244, 63, 94, 0.08)',
        '--border-accent': 'rgba(251, 113, 133, 0.3)'
      }
    },
    {
      id: 'amber',
      name: 'Amber',
      swatches: ['#fbbf24', '#f59e0b', '#f97316', '#fde68a'],
      vars: {
        '--accent': '#fbbf24',
        '--accent-dim': 'rgba(251, 191, 36, 0.15)',
        '--accent-glow': 'rgba(251, 191, 36, 0.4)',
        '--accent-secondary': '#f97316',
        '--shadow-glow': '0 0 20px rgba(251, 191, 36, 0.15)',
        '--bg-glow-a': 'rgba(249, 115, 22, 0.12)',
        '--bg-glow-b': 'rgba(251, 191, 36, 0.1)',
        '--bg-glow-c': 'rgba(245, 158, 11, 0.08)',
        '--border-accent': 'rgba(251, 191, 36, 0.3)'
      }
    },
    {
      id: 'twitter',
      name: 'Twitter',
      swatches: ['#1d9bf0', '#0d8bd9', '#8899a6', '#c4d4e0'],
      vars: {
        '--accent': '#1d9bf0',
        '--accent-dim': 'rgba(29, 155, 240, 0.15)',
        '--accent-glow': 'rgba(29, 155, 240, 0.4)',
        '--accent-secondary': '#0d8bd9',
        '--shadow-glow': '0 0 20px rgba(29, 155, 240, 0.15)',
        '--bg-glow-a': 'rgba(29, 155, 240, 0.12)',
        '--bg-glow-b': 'rgba(13, 139, 217, 0.1)',
        '--bg-glow-c': 'rgba(136, 153, 166, 0.08)',
        '--border-accent': 'rgba(29, 155, 240, 0.3)'
      }
    },
    {
      id: 'zai',
      name: 'Zai',
      swatches: ['#a78bfa', '#2dd4bf', '#f472b6', '#818cf8'],
      vars: {
        '--accent': '#a78bfa',
        '--accent-dim': 'rgba(167, 139, 250, 0.12)',
        '--accent-glow': 'rgba(167, 139, 250, 0.3)',
        '--accent-secondary': '#2dd4bf',
        '--shadow-glow': '0 0 20px rgba(167, 139, 250, 0.1)',
        '--bg-glow-a': 'rgba(167, 139, 250, 0.1)',
        '--bg-glow-b': 'rgba(45, 212, 191, 0.06)',
        '--bg-glow-c': 'rgba(244, 114, 182, 0.05)',
        '--border-accent': 'rgba(167, 139, 250, 0.25)'
      }
    },
    {
      id: 'macos',
      name: 'macOS',
      swatches: ['#64d2ff', '#bf5af2', '#ff9f0a', '#30d158'],
      vars: {
        '--accent': '#64d2ff',
        '--accent-dim': 'rgba(100, 210, 255, 0.1)',
        '--accent-glow': 'rgba(100, 210, 255, 0.25)',
        '--accent-secondary': '#bf5af2',
        '--shadow-glow': '0 0 20px rgba(100, 210, 255, 0.08)',
        '--bg-glow-a': 'rgba(100, 210, 255, 0.08)',
        '--bg-glow-b': 'rgba(255, 255, 255, 0.02)',
        '--bg-glow-c': 'rgba(100, 210, 255, 0.06)',
        '--border-accent': 'rgba(100, 210, 255, 0.2)'
      }
    }
  ];

  // --- News Sources Settings (v2: toggles multi-select + custom) ---
  function renderNewsSourcesSettings() {
    var container = document.getElementById('news-sources-list');
    if (!container || !window.NewsWidget) return;

    var categories = window.NewsWidget.getCategories();
    var html = '';

    categories.forEach(function (cat) {
      var activeIds = window.NewsWidget.getActiveIds(cat.id);
      var catLabel = escapeHtml(cat.name) + (cat.custom ? ' <span style="color:var(--accent);font-size:0.75rem;">*</span>' : '');
      var deleteBtn = cat.custom ? '<button class="ns-delete-cat-btn" data-cat="' + cat.id + '" title="Eliminar categoria"><i class="fa-solid fa-trash-can"></i></button>' : '';

      html += '<div class="news-source-group">';
      html += '<div class="news-source-group-title"><i class="' + cat.icon + '"></i> ' + catLabel + deleteBtn + '</div>';
      html += '<div class="news-source-options">';

      cat.sources.forEach(function (source) {
        var isOn = activeIds.indexOf(source.id) >= 0;
        var deleteFeedBtn = source.custom ? '<button class="ns-delete-feed-btn" data-cat="' + cat.id + '" data-source="' + source.id + '" title="Quitar feed"><i class="fa-solid fa-xmark"></i></button>' : '';
        html += '<label class="news-source-toggle' + (isOn ? ' active' : '') + '" data-cat="' + cat.id + '" data-source="' + source.id + '">' +
          '<span class="ns-toggle-track"><span class="ns-toggle-thumb"></span></span>' +
          '<span class="ns-toggle-label">' + escapeHtml(source.name) + '</span>' +
          deleteFeedBtn +
          '</label>';
      });

      if (cat.sources.length === 0) {
        html += '<span class="ns-empty-cat">Sin fuentes. Agregá un feed RSS debajo.</span>';
      }

      html += '</div>';
      html += '</div>';
    });

    container.innerHTML = html;

    // Bind toggle events
    container.querySelectorAll('.news-source-toggle').forEach(function (toggle) {
      toggle.addEventListener('click', function (e) {
        // Don't toggle if clicking delete button
        if (e.target.closest('.ns-delete-feed-btn')) return;
        var catId = toggle.dataset.cat;
        var sourceId = toggle.dataset.source;
        toggle.classList.toggle('active');
        window.NewsWidget.toggleSource(catId, sourceId);
      });
    });

    // Bind delete custom category
    container.querySelectorAll('.ns-delete-cat-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var catId = btn.dataset.cat;
        if (confirm('Eliminar esta categoria personalizada?')) {
          window.NewsWidget.removeCustomCategory(catId);
          renderNewsSourcesSettings();
          populateFeedCatSelect();
        }
      });
    });

    // Bind delete custom feed
    container.querySelectorAll('.ns-delete-feed-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var catId = btn.dataset.cat;
        var sourceId = btn.dataset.source;
        window.NewsWidget.removeCustomFeed(catId, sourceId);
        renderNewsSourcesSettings();
      });
    });

    // Populate category select for "add feed" form
    populateFeedCatSelect();
  }

  function populateFeedCatSelect() {
    var select = document.getElementById('ns-feed-cat-select');
    if (!select || !window.NewsWidget) return;
    var cats = window.NewsWidget.getCategories();
    select.innerHTML = '<option value="">Elegir categoria...</option>';
    cats.forEach(function (cat) {
      var opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name + (cat.custom ? ' *' : '');
      select.appendChild(opt);
    });
  }

  // --- News clear cache ---
  var newsClearCacheBtn = document.getElementById('news-clear-cache');
  if (newsClearCacheBtn) {
    newsClearCacheBtn.addEventListener('click', function () {
      if (window.NewsWidget) {
        window.NewsWidget.clearCache();
        newsClearCacheBtn.innerHTML = '<i class="fa-solid fa-check"></i> Cache limpiado';
        setTimeout(function () {
          newsClearCacheBtn.innerHTML = '<i class="fa-solid fa-broom"></i> Limpiar cache de noticias';
        }, 2000);
      }
    });
  }

  // --- Add custom feed RSS ---
  var nsFeedAddBtn = document.getElementById('ns-feed-add-btn');
  if (nsFeedAddBtn) {
    nsFeedAddBtn.addEventListener('click', function () {
      var catSelect = document.getElementById('ns-feed-cat-select');
      var nameInput = document.getElementById('ns-feed-name-input');
      var urlInput = document.getElementById('ns-feed-url-input');
      var statusEl = document.getElementById('ns-feed-status');

      var catId = catSelect.value;
      var name = nameInput.value.trim();
      var url = urlInput.value.trim();

      if (!catId) {
        if (statusEl) { statusEl.textContent = 'Elegi una categoria'; statusEl.style.color = '#fb7185'; }
        return;
      }
      if (!name) {
        if (statusEl) { statusEl.textContent = 'Ingresa un nombre para el medio'; statusEl.style.color = '#fb7185'; }
        nameInput.focus();
        return;
      }
      if (!url || !url.startsWith('http')) {
        if (statusEl) { statusEl.textContent = 'Ingresa una URL valida (https://...)'; statusEl.style.color = '#fb7185'; }
        urlInput.focus();
        return;
      }

      if (window.NewsWidget) {
        window.NewsWidget.addCustomFeed(catId, name, url);
        nameInput.value = '';
        urlInput.value = '';
        if (statusEl) { statusEl.textContent = 'Feed agregado correctamente'; statusEl.style.color = '#57cbde'; }
        setTimeout(function () { if (statusEl) statusEl.textContent = ''; }, 2500);
        renderNewsSourcesSettings();
      }
    });
  }

  // --- Add custom category ---
  var nsCatAddBtn = document.getElementById('ns-cat-add-btn');
  if (nsCatAddBtn) {
    nsCatAddBtn.addEventListener('click', function () {
      var nameInput = document.getElementById('ns-cat-name-input');
      var statusEl = document.getElementById('ns-cat-status');
      var name = nameInput.value.trim();

      if (!name) {
        if (statusEl) { statusEl.textContent = 'Ingresa un nombre para la categoria'; statusEl.style.color = '#fb7185'; }
        nameInput.focus();
        return;
      }

      if (window.NewsWidget) {
        window.NewsWidget.addCustomCategory(name);
        nameInput.value = '';
        if (statusEl) { statusEl.textContent = 'Categoria creada. Ahora agregale feeds.'; statusEl.style.color = '#57cbde'; }
        setTimeout(function () { if (statusEl) statusEl.textContent = ''; }, 3000);
        renderNewsSourcesSettings();
      }
    });
  }

  // --- Tabs ---
  function initTabs() {
    var tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.dataset.tab;
        // Actualizar tabs
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        // Actualizar contenido
        document.querySelectorAll('.settings-tab-content').forEach(function (c) {
          c.classList.remove('active');
        });
        var targetEl = document.getElementById('tab-' + target);
        if (targetEl) targetEl.classList.add('active');
        // Renderizar quick links al abrir la pestaña
        if (target === 'quickaccess' && typeof renderQuickLinksSettings === 'function') {
          // Asegurar que los datos estén cargados desde Supabase
          if (window.QuickAccess && typeof window.QuickAccess.load === 'function') {
            window.QuickAccess.load().then(function () {
              renderQuickLinksSettings();
            });
          } else {
            renderQuickLinksSettings();
          }
        }
        // Renderizar fuentes de noticias al abrir la pestaña
        if (target === 'news' && typeof renderNewsSourcesSettings === 'function') {
          renderNewsSourcesSettings();
        }
      });
    });
  }

  // --- Tema skin: carga dinámica de CSS ---
  function loadThemeCSS(themeSkinName) {
    // Remover theme CSS anterior (si existe)
    var oldLink = document.getElementById('theme-skin-css');
    if (oldLink) oldLink.remove();

    currentThemeSkin = themeSkinName;

    // Si no es default, cargar el CSS extra.
    // El default ya está cargado desde index.html.
    if (themeSkinName !== 'default') {
      var link = document.createElement('link');
      link.id = 'theme-skin-css';
      link.rel = 'stylesheet';
      link.href = '/MozzPCC/css/themes/' + themeSkinName + '.css';
      document.head.appendChild(link);
    }

    // Setear data-theme en body
    document.body.setAttribute('data-theme', themeSkinName);
  }

  // --- Tema: aplicar ---
  function applyTheme(themeId) {
    var theme = THEMES.find(function (t) { return t.id === themeId; });
    if (!theme) return;

    currentTheme = themeId;
    var root = document.documentElement;

    // Aplicar variables legacy (los aliases en :root las propagan a --t-* / --p-*)
    Object.keys(theme.vars).forEach(function (key) {
      root.style.setProperty(key, theme.vars[key]);
    });

    // Mapeo legacy → nuevas variables --p-*
    var accent = theme.vars['--accent'] || '';
    if (accent) {
      root.style.setProperty('--p-accent', accent);
      // Calcular derivados si no están explícitos en la paleta
      root.style.setProperty('--p-border-accent', theme.vars['--border-accent'] || (accent + '4D'));
      root.style.setProperty('--p-shadow-glow', theme.vars['--shadow-glow'] || ('0 0 20px ' + accent + '26'));
    }

    // Setear data-palette en body
    document.body.setAttribute('data-palette', themeId);

    // Actualizar UI del grid de paletas
    document.querySelectorAll('.theme-palette-card').forEach(function (card) {
      card.classList.toggle('active', card.dataset.theme === themeId);
    });
  }

  // --- Tema skin: renderizar selector ---
  function renderThemeSkins() {
    if (!themeSkinGrid) return;
    themeSkinGrid.innerHTML = '';

    THEME_SKINS.forEach(function (skin) {
      var card = document.createElement('div');
      card.className = 'theme-skin-card' + (skin.id === currentThemeSkin ? ' active' : '') + (!skin.available ? ' locked' : '');
      card.dataset.skin = skin.id;

      // Mini preview
      var previewHTML = '<div class="theme-skin-preview" style="background:' + skin.preview.bg + '">' +
        '<div class="theme-skin-preview-inner">';
      skin.preview.bars.forEach(function (color) {
        previewHTML += '<div class="theme-skin-preview-bar" style="background:' + color + ';height:' + (40 + Math.random() * 50) + '%;"></div>';
      });
      previewHTML += '</div></div>';

      // Info
      var badgeClass = skin.available ? 'available' : 'soon';
      var badgeText = skin.available ? 'Disponible' : 'Proximo';
      var infoHTML = '<div class="theme-skin-info">' +
        '<div class="theme-skin-icon" style="color:var(--accent);"><i class="' + skin.icon + '"></i></div>' +
        '<div class="theme-skin-details">' +
          '<div class="theme-skin-name">' + skin.name + '</div>' +
          '<div class="theme-skin-desc">' + skin.desc + '</div>' +
        '</div>' +
        '<span class="theme-skin-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</div>';

      card.innerHTML = previewHTML + infoHTML;

      if (skin.available) {
        card.addEventListener('click', function () {
          applyThemeSkin(skin.id);
          saveThemeSkin(skin.id);
        });
      }

      themeSkinGrid.appendChild(card);
    });
  }

  // --- Tema skin: aplicar ---
  // Algunos skins sugieren una paleta por defecto (mismo id que el skin)
  var SKIN_PALETTES = { zai: 'zai', macos: 'macos' };

  function applyThemeSkin(skinId) {
    currentThemeSkin = skinId;
    loadThemeCSS(skinId);

    // Auto-aplicar paleta sugerida si existe
    if (SKIN_PALETTES[skinId]) {
      var suggested = THEMES.find(function (t) { return t.id === SKIN_PALETTES[skinId]; });
      if (suggested) applyTheme(suggested.id);
    }

    // macOS: inyectar/remover traffic lights
    if (skinId === 'macos') {
      injectMacOSTitleBars();
    } else {
      removeMacOSTitleBars();
    }

    // Actualizar UI
    document.querySelectorAll('.theme-skin-card').forEach(function (card) {
      card.classList.toggle('active', card.dataset.skin === skinId);
    });
  }

  // --- macOS: inyectar traffic lights en card-headers ---
  var macOSInjected = false;

  function injectMacOSTitleBars() {
    if (macOSInjected) return;
    macOSInjected = true;

    document.querySelectorAll('.card-header').forEach(function (header) {
      injectTrafficLights(header);
    });

    // Observer para card-headers que se agregen o modifiquen despues
    if (!macOSObserver) {
      var pendingReinject = {};
      var reinjectTimer = null;

      macOSObserver = new MutationObserver(function (mutations) {
        if (currentThemeSkin !== 'macos') return;

        mutations.forEach(function (m) {
          // 1) Detectar nuevos card-headers (nodos agregados)
          m.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            if (node.classList && node.classList.contains('card-header')) {
              injectTrafficLights(node);
            }
            var headers = node.querySelectorAll ? node.querySelectorAll('.card-header') : [];
            headers.forEach(function (h) { injectTrafficLights(h); });
          });

          // 2) Detectar card-headers existentes que perdieron sus traffic lights
          //    (ej: dollar.js initDropdown hace innerHTML='' y reconstruye)
          var target = m.target;
          if (target.nodeType === 1) {
            var header = (target.classList && target.classList.contains('card-header'))
              ? target
              : (target.closest ? target.closest('.card-header') : null);
            if (header && !header.querySelector('.ch-traffic')) {
              pendingReinject[header.className || 'unknown'] = header;
            }
          }
        });

        // Re-inyectar con un pequeño delay para dejar que el codigo externo termine
        var keys = Object.keys(pendingReinject);
        if (keys.length > 0) {
          var toFix = keys.map(function (k) { return pendingReinject[k]; });
          pendingReinject = {};
          if (reinjectTimer) clearTimeout(reinjectTimer);
          reinjectTimer = setTimeout(function () {
            toFix.forEach(function (h) {
              if (currentThemeSkin === 'macos' && !h.querySelector('.ch-traffic')) {
                injectTrafficLights(h);
              }
            });
          }, 50);
        }
      });
      macOSObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  var macOSObserver = null;

  function injectTrafficLights(header) {
    if (header.querySelector('.ch-traffic')) return;

    // Extraer el titulo del h2 (busca a cualquier profundidad)
    var h2 = header.querySelector('h2');
    var titleText = h2 ? h2.textContent.trim() : '';

    // Recolectar acciones y ocultar titulo/icono
    // Maneja dos estructuras:
    //  A) Simple: <i>, <h2>, <button>/<a> como hijos directos
    //  B) Compleja (ej: dolar): wrappers como leftWrap(contiene i+h2) y dropdown(contiene button+menu)
    var actions = [];
    var children = Array.prototype.slice.call(header.children);

    children.forEach(function (child) {
      if (child.tagName === 'H2' || child.tagName === 'I') {
        // Icono o titulo directo → CSS fallback los oculta
        return;
      }

      if (child.tagName === 'BUTTON' || child.tagName === 'A' ||
          (child.classList && (child.classList.contains('btn-add') || child.classList.contains('tv-add-btn')))) {
        // Boton/link directo → mover a ch-actions
        actions.push(child);
      } else {
        // Es un contenedor (div). Verificar que contiene
        var containsH2 = child.querySelector && child.querySelector('h2');
        var containsAction = child.querySelectorAll && child.querySelectorAll('button, a');

        if (containsH2) {
          // Wrapper con titulo (ej: leftWrap del dolar) → ocultar
          child.classList.add('ch-original-hidden');
        } else if (containsAction && containsAction.length > 0) {
          // Wrapper con acciones pero sin titulo (ej: dropdown del dolar)
          // → mover TODO el contenedor para preservar estructura (button+menu)
          actions.push(child);
        } else {
          // Elemento desconocido sin acciones ni titulo → ocultar
          child.classList.add('ch-original-hidden');
        }
      }
    });

    // Construir wrapper
    var newContent = document.createElement('div');
    newContent.className = 'ch-wrap';

    // Traffic lights
    var traffic = document.createElement('div');
    traffic.className = 'ch-traffic';
    traffic.innerHTML = '<span class="ch-tl-close"></span><span class="ch-tl-min"></span><span class="ch-tl-max"></span>';
    newContent.appendChild(traffic);

    // Titulo centrado
    var title = document.createElement('div');
    title.className = 'ch-title';
    title.textContent = titleText;
    newContent.appendChild(title);

    // Acciones (movidas desde su posicion original)
    if (actions.length > 0) {
      var actionsWrap = document.createElement('div');
      actionsWrap.className = 'ch-actions';
      actions.forEach(function (el) { actionsWrap.appendChild(el); });
      newContent.appendChild(actionsWrap);
    }

    header.appendChild(newContent);
  }

  function removeMacOSTitleBars() {
    if (!macOSInjected) return;
    macOSInjected = false;

    if (macOSObserver) {
      macOSObserver.disconnect();
      macOSObserver = null;
    }

    document.querySelectorAll('.card-header').forEach(function (header) {
      var wrapper = header.querySelector('.ch-wrap');
      if (wrapper) {
        // Mover acciones de vuelta al header
        var actionsWrap = wrapper.querySelector('.ch-actions');
        if (actionsWrap) {
          while (actionsWrap.firstChild) {
            header.appendChild(actionsWrap.firstChild);
          }
        }
        wrapper.remove();
      }

      // Restaurar hijos originales (quitar clase de ocultamiento)
      header.querySelectorAll('.ch-original-hidden').forEach(function (el) {
        el.classList.remove('ch-original-hidden');
      });
    });
  }

  // --- Tema skin: persistencia ---
  async function saveThemeSkin(skinId) {
    var client = getSupabase();
    if (!client || !userId) return;

    try {
      await client
        .from('user_preferences')
        .upsert({
          user_id: userId,
          theme_skin: skinId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (e) {
      // Silencioso — tema funciona en memoria
    }
  }

  // --- Tema: renderizar paletas ---
  function renderPalettes() {
    if (!themePaletteGrid) return;
    themePaletteGrid.innerHTML = '';

    THEMES.forEach(function (theme) {
      var card = document.createElement('div');
      card.className = 'theme-palette-card' + (theme.id === currentTheme ? ' active' : '');
      card.dataset.theme = theme.id;

      // Swatches
      var swatchesHTML = '<div class="theme-palette-swatches">';
      theme.swatches.forEach(function (color) {
        swatchesHTML += '<div class="theme-palette-swatch" style="background:' + color + ';"></div>';
      });
      swatchesHTML += '</div>';

      card.innerHTML = swatchesHTML + '<div class="theme-palette-name">' + theme.name + '</div>';

      card.addEventListener('click', function () {
        applyTheme(theme.id);
        saveTheme(theme.id);
      });

      themePaletteGrid.appendChild(card);
    });
  }

  // --- Tema: persistencia en Supabase ---
  async function loadTheme() {
    var client = getSupabase();
    if (!client || !userId) return;

    try {
      var { data, error } = await client
        .from('user_preferences')
        .select('theme, theme_skin, city')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        // Columna theme_skin puede no existir todavía — reintentar sin ella
        if (error.code === '42P01' || error.message.includes('does not exist') || error.status === 400) {
          var fallback = await client
            .from('user_preferences')
            .select('theme, city')
            .eq('user_id', userId)
            .maybeSingle();
          if (!fallback.error && fallback.data) {
            if (fallback.data.theme) applyTheme(fallback.data.theme);
            if (fallback.data.city) {
              var cityInput2 = document.getElementById('weather-city-input');
              if (cityInput2) cityInput2.value = fallback.data.city;
            }
          }
          return;
        }
        console.warn('MozzPCC: Error cargando preferencias (theme):', error.message);
        return;
      }

      if (data) {
        if (data.theme) applyTheme(data.theme);
        if (data.theme_skin) applyThemeSkin(data.theme_skin);
        if (data.city) {
          var cityInput = document.getElementById('weather-city-input');
          if (cityInput) cityInput.value = data.city;
        }
      }
    } catch (e) {
      console.warn('MozzPCC: Error cargando preferencias (theme):', e.message || e);
    }
  }

  async function saveTheme(themeId) {
    var client = getSupabase();
    if (!client || !userId) return;

    try {
      await client
        .from('user_preferences')
        .upsert({
          user_id: userId,
          theme: themeId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (e) {
      // Silencioso — tema funciona en memoria
    }
  }

  // --- Icon Picker ---
  // buildIconPicker ahora vive en utils.js (global)
  // Wrapper local que pasa el callback para actualizar hiddenInput
  function buildIconPicker(container, hiddenInput, selectedIcon) {
    window.buildIconPicker(container, function (iconClass) {
      hiddenInput.value = iconClass;
    }, selectedIcon);
  }

  // --- Modal open/close ---
  function openSettings() {
    settingsModal.style.display = 'flex';
    if (settingsTrap) settingsTrap.activate();
    // Activar tab Apariencia por defecto
    var defaultTab = document.querySelector('.settings-tab[data-tab="appearance"]');
    if (defaultTab) defaultTab.click();
    renderThemeSkins();
    renderPalettes();
  }

  function closeSettings() {
    settingsModal.style.display = 'none';
    if (settingsTrap) settingsTrap.deactivate();
  }

  // --- Quick Links Settings (Tab "Rápidos") ---
  var qlList = document.getElementById('settings-quicklinks-list');
  var qlNoMsg = document.getElementById('settings-no-quicklinks');
  var qlAddBtn = document.getElementById('settings-add-quicklink');
  var qlForm = document.getElementById('quicklink-form');
  var qlFormTitle = document.getElementById('quicklink-form-title');
  var qlNameInput = document.getElementById('quicklink-name-input');
  var qlUrlInput = document.getElementById('quicklink-url-input');
  var qlIconPicker = document.getElementById('quicklink-icon-picker');
  var qlIconInput = document.getElementById('quicklink-icon-input');
  var qlImageRow = document.getElementById('ql-image-row');
  var qlFaRow = document.getElementById('ql-fontawesome-row');
  var qlImageInput = document.getElementById('quicklink-image-input');
  var qlFormCancel = document.getElementById('quicklink-form-cancel');
  var qlFormSave = document.getElementById('quicklink-form-save');
  var qlTypeToggle = document.querySelectorAll('.ql-type-btn');

  var editingQuickLinkId = null;
  var qlIconType = 'fontawesome';

  function renderQuickLinksSettings() {
    if (!qlList) return;
    qlList.innerHTML = '';

    var links = (typeof window.QuickAccess !== 'undefined') ? window.QuickAccess.getAll() : [];

    if (links.length === 0) {
      qlNoMsg.style.display = 'block';
      qlAddBtn.style.display = 'flex';
      return;
    }

    qlNoMsg.style.display = 'none';
    qlAddBtn.style.display = 'flex';

    links.forEach(function (link, index) {
      var item = document.createElement('div');
      item.className = 'settings-quicklink-item';

      var iconHtml = '';
      if (link.icon_type === 'image' && link.icon_value) {
        iconHtml = '<img src="' + escapeHtml(link.icon_value) + '" alt="">';
      } else if (link.icon_type === 'favicon' && link.icon_value) {
        try {
          var domain = new URL(link.icon_value.startsWith('http') ? link.icon_value : 'https://' + link.icon_value).hostname;
          iconHtml = '<img src="https://www.google.com/s2/favicons?domain=' + escapeHtml(domain) + '&sz=32" alt="">';
        } catch (e) {
          iconHtml = '<i class="fa-solid fa-globe"></i>';
        }
      } else {
        iconHtml = '<i class="' + escapeHtml(link.icon_value || 'fa-solid fa-globe') + '"></i>';
      }

      item.innerHTML =
        '<div class="ql-item-pos">' + (index + 1) + '</div>' +
        '<div class="ql-item-icon">' + iconHtml + '</div>' +
        '<div class="ql-item-name">' + escapeHtml(link.name) + '</div>' +
        '<div class="ql-item-url">' + escapeHtml(link.url) + '</div>' +
        '<div class="ql-item-actions">' +
          '<button class="ql-action-btn edit" title="Editar"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="ql-action-btn move-up" title="Subir"' + (index === 0 ? ' disabled style="opacity:0.3;pointer-events:none"' : '') + '><i class="fa-solid fa-chevron-up"></i></button>' +
          '<button class="ql-action-btn move-down" title="Bajar"' + (index === links.length - 1 ? ' disabled style="opacity:0.3;pointer-events:none"' : '') + '><i class="fa-solid fa-chevron-down"></i></button>' +
          '<button class="ql-action-btn delete" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>' +
        '</div>';

      item.querySelector('.edit').addEventListener('click', function () { openQuicklinkForm(link); });
      item.querySelector('.move-up').addEventListener('click', function () {
        if (window.QuickAccess) window.QuickAccess.move(link.id, -1);
        renderQuickLinksSettings();
      });
      item.querySelector('.move-down').addEventListener('click', function () {
        if (window.QuickAccess) window.QuickAccess.move(link.id, 1);
        renderQuickLinksSettings();
      });
      item.querySelector('.delete').addEventListener('click', function () {
        if (confirm('Eliminar este acceso rapido?')) {
          if (window.QuickAccess) window.QuickAccess.delete(link.id);
          renderQuickLinksSettings();
        }
      });

      qlList.appendChild(item);
    });
  }

  // Exponer para que quickAccess.js pueda llamar
  window.renderQuickLinksSettings = renderQuickLinksSettings;

  function openQuicklinkForm(link) {
    editingQuickLinkId = link ? link.id : null;
    qlFormTitle.textContent = link ? 'Editar Acceso Rapido' : 'Nuevo Acceso Rapido';
    qlNameInput.value = link ? link.name : '';
    qlUrlInput.value = link ? link.url : '';

    // Determinar tipo de icono
    if (link && link.icon_type === 'favicon') {
      qlIconType = 'favicon';
      qlImageInput.value = '';
      qlImageRow.style.display = 'none';
      qlFaRow.style.display = 'none';
      qlTypeToggle.forEach(function (b) { b.classList.toggle('active', b.dataset.type === 'favicon'); });
    } else if (link && link.icon_type === 'image') {
      qlIconType = 'image';
      qlImageInput.value = link.icon_value;
      qlImageRow.style.display = 'flex';
      qlFaRow.style.display = 'none';
      qlTypeToggle.forEach(function (b) { b.classList.toggle('active', b.dataset.type === 'image'); });
    } else {
      qlIconType = 'fontawesome';
      qlImageInput.value = '';
      qlImageRow.style.display = 'none';
      qlFaRow.style.display = 'flex';
      qlTypeToggle.forEach(function (b) { b.classList.toggle('active', b.dataset.type === 'fontawesome'); });
      buildIconPicker(qlIconPicker, qlIconInput, link ? link.icon_value : 'fa-solid fa-globe');
    }

    qlForm.style.display = 'flex';
    qlNameInput.focus();
  }

  function closeQuicklinkForm() {
    qlForm.style.display = 'none';
    editingQuickLinkId = null;
  }

  async function saveQuicklink() {
    var name = qlNameInput.value.trim();
    var url = qlUrlInput.value.trim();

    if (!name || !url) {
      if (!name) qlNameInput.focus();
      else qlUrlInput.focus();
      return;
    }

    // Ensure protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    var iconType = qlIconType;
    var iconValue;

    if (iconType === 'favicon') {
      iconValue = url;
    } else if (iconType === 'image') {
      iconValue = qlImageInput.value.trim();
    } else {
      iconValue = qlIconInput.value;
    }

    if (!iconValue && iconType !== 'favicon') {
      iconType = 'fontawesome';
      iconValue = 'fa-solid fa-globe';
    }

    if (editingQuickLinkId) {
      if (window.QuickAccess) await window.QuickAccess.update(editingQuickLinkId, { name: name, url: url, icon_type: iconType, icon_value: iconValue });
    } else {
      if (window.QuickAccess) await window.QuickAccess.add({ name: name, url: url, icon_type: iconType, icon_value: iconValue });
    }

    closeQuicklinkForm();
    renderQuickLinksSettings();
  }

  // --- Eventos Quick Links ---
  if (qlAddBtn) qlAddBtn.addEventListener('click', function () { openQuicklinkForm(null); });
  if (qlFormCancel) qlFormCancel.addEventListener('click', closeQuicklinkForm);
  if (qlFormSave) qlFormSave.addEventListener('click', saveQuicklink);

  if (qlForm) qlForm.addEventListener('click', function (e) {
    if (e.target === qlForm) closeQuicklinkForm();
  });

  qlNameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') qlUrlInput.focus(); });
  qlUrlInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') saveQuicklink(); });

  // Toggle icon type
  qlTypeToggle.forEach(function (btn) {
    btn.addEventListener('click', function () {
      qlIconType = btn.dataset.type;
      qlTypeToggle.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      if (qlIconType === 'favicon') {
        qlImageRow.style.display = 'none';
        qlFaRow.style.display = 'none';
      } else if (qlIconType === 'image') {
        qlImageRow.style.display = 'flex';
        qlFaRow.style.display = 'none';
      } else {
        qlImageRow.style.display = 'none';
        qlFaRow.style.display = 'flex';
        buildIconPicker(qlIconPicker, qlIconInput, qlIconInput.value);
      }
    });
  });

  // --- GitHub Username Settings ---
  var ghUsernameInput = document.getElementById('gh-username-input');
  var ghUsernameSave = document.getElementById('gh-username-save');
  var ghUsernameStatus = document.getElementById('gh-username-status');

  async function loadGithubUsername() {
    var client = getSupabase();
    if (!client || !userId) return;
    try {
      var result = await client
        .from('user_preferences')
        .select('github_username')
        .eq('user_id', userId)
        .maybeSingle();
      if (!result.error && result.data && result.data.github_username && ghUsernameInput) {
        ghUsernameInput.value = result.data.github_username;
      }
    } catch (e) { /* ignore */ }
  }

  async function saveGithubUsername() {
    var value = ghUsernameInput.value.trim();
    if (!value) {
      if (ghUsernameStatus) {
        ghUsernameStatus.textContent = 'Ingresa un usuario de GitHub';
        ghUsernameStatus.style.color = '#fb7185';
      }
      return;
    }

    var client = getSupabase();
    if (!client || !userId) return;

    if (ghUsernameSave) {
      ghUsernameSave.disabled = true;
      ghUsernameSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    try {
      var result = await client
        .from('user_preferences')
        .upsert(
          { user_id: userId, github_username: value, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );

      if (result.error) {
        if (ghUsernameStatus) {
          ghUsernameStatus.textContent = 'Error: ' + result.error.message;
          ghUsernameStatus.style.color = '#fb7185';
        }
      } else {
        if (ghUsernameStatus) {
          ghUsernameStatus.textContent = 'Usuario guardado correctamente';
          ghUsernameStatus.style.color = '#57cbde';
        }
        if (typeof window.GitHubWidget !== 'undefined' && typeof window.GitHubWidget.load === 'function') {
          window.GitHubWidget.load();
        }
      }
    } catch (e) {
      if (ghUsernameStatus) {
        ghUsernameStatus.textContent = 'Error: ' + e.message;
        ghUsernameStatus.style.color = '#fb7185';
      }
    }

    if (ghUsernameSave) {
      ghUsernameSave.disabled = false;
      ghUsernameSave.innerHTML = '<i class="fa-solid fa-check"></i>';
    }
  }

  if (ghUsernameSave) ghUsernameSave.addEventListener('click', saveGithubUsername);
  if (ghUsernameInput) ghUsernameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') saveGithubUsername();
  });

  // --- Currency Settings ---
  var currencySelect = document.getElementById('currency-select');
  var currencyStatus = document.getElementById('currency-status');

  function loadCurrency() {
    var saved = localStorage.getItem('mozzpcc-currency');
    if (saved && currencySelect) {
      currencySelect.value = saved;
    }
  }

  function saveCurrency() {
    if (!currencySelect) return;
    var val = currencySelect.value;
    localStorage.setItem('mozzpcc-currency', val);
    if (currencyStatus) {
      currencyStatus.textContent = 'Moneda guardada';
      currencyStatus.style.color = 'var(--note-green)';
      setTimeout(function () { currencyStatus.textContent = ''; }, 2000);
    }
  }

  loadCurrency();
  if (currencySelect) {
    currencySelect.addEventListener('change', saveCurrency);
  }

  // --- Auto-lock Settings ---
  var autolockSelect = document.getElementById('autolock-select');
  var autolockStatus = document.getElementById('autolock-status');

  function loadAutolock() {
    var saved = localStorage.getItem('mozzpcc-autolock-minutes');
    if (saved !== null && autolockSelect) {
      autolockSelect.value = saved;
    }
  }

  function saveAutolock() {
    if (!autolockSelect) return;
    var val = autolockSelect.value;
    localStorage.setItem('mozzpcc-autolock-minutes', val);
    if (autolockStatus) {
      var minutes = parseInt(val, 10);
      autolockStatus.textContent = minutes > 0
        ? 'Auto-lock: ' + minutes + ' minutos'
        : 'Auto-lock desactivado';
      autolockStatus.style.color = 'var(--note-green)';
      setTimeout(function () { autolockStatus.textContent = ''; }, 2000);
    }
    // Reiniciar el timer de inactividad con el nuevo valor
    if (window._resetAutoLock) window._resetAutoLock();
  }

  loadAutolock();
  if (autolockSelect) {
    autolockSelect.addEventListener('change', saveAutolock);
  }

  // --- Password Change (Tab Seguridad) ---
  var newPwInput = document.getElementById('security-new-password');
  var confirmPwInput = document.getElementById('security-confirm-password');
  var changePwBtn = document.getElementById('security-change-pw');
  var securityStatus = document.getElementById('security-status');

  function setSecurityStatus(msg, isError) {
    if (!securityStatus) return;
    securityStatus.textContent = msg;
    securityStatus.style.color = isError ? 'var(--t-danger)' : 'var(--t-success)';
    if (!isError) {
      setTimeout(function () { if (securityStatus) securityStatus.textContent = ''; }, 4000);
    }
  }

  async function changePassword() {
    if (!newPwInput || !confirmPwInput || !changePwBtn) return;

    var pw = newPwInput.value;
    var confirm = confirmPwInput.value;

    if (!pw || pw.length < 6) {
      setSecurityStatus('La contrasena debe tener al menos 6 caracteres', true);
      newPwInput.focus();
      return;
    }

    if (pw !== confirm) {
      setSecurityStatus('Las contrasenas no coinciden', true);
      confirmPwInput.focus();
      return;
    }

    var client = getSupabase();
    if (!client) {
      setSecurityStatus('Error: no hay sesion activa', true);
      return;
    }

    changePwBtn.disabled = true;
    changePwBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cambiando...';

    try {
      var { error } = await client.auth.updateUser({ password: pw });

      if (error) {
        setSecurityStatus('Error: ' + error.message, true);
      } else {
        setSecurityStatus('Contrasena actualizada correctamente', false);
        newPwInput.value = '';
        confirmPwInput.value = '';
      }
    } catch (e) {
      setSecurityStatus('Error inesperado: ' + (e.message || e), true);
    }

    changePwBtn.disabled = false;
    changePwBtn.innerHTML = '<i class="fa-solid fa-key"></i> Cambiar contrasena';
  }

  if (changePwBtn) changePwBtn.addEventListener('click', changePassword);
  if (confirmPwInput) confirmPwInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') changePassword();
  });
  if (newPwInput) newPwInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') confirmPwInput.focus();
  });

  // Toggle password visibility
  document.querySelectorAll('.security-toggle-pw').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.dataset.target;
      var input = document.getElementById(targetId);
      if (!input) return;
      var isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.querySelector('i').className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    });
  });

  // --- Eventos ---
  initTabs();
  settingsBtn.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);

  // Click en overlay para cerrar (no en el modal)
  settingsModal.addEventListener('click', function (e) {
    if (e.target === settingsModal) {
      closeQuicklinkForm();
      closeSettings();
    }
  });

  // Escape para cerrar todo
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (qlForm && qlForm.style.display === 'flex') closeQuicklinkForm();
      else if (settingsModal.style.display === 'flex') closeSettings();
    }
  });

  // --- Auth events ---
  window.addEventListener('auth:ready', function (e) {
    userId = e.detail.userId;
    loadTheme();
    loadGithubUsername();
    renderQuickLinksSettings();
  });

  window.addEventListener('auth:logout', function () {
    userId = null;
    currentTheme = 'cyber';
    currentThemeSkin = 'default';
    applyTheme('cyber');
    applyThemeSkin('default');
    closeSettings();
  });
})();
