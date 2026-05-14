/**
 * settings.js — Configuracion general del dashboard
 * Temas, accesos rapidos, moneda, Steam ID, clima
 * Icon picker con iconos curados de Font Awesome
 * Se inicializa cuando se recibe el evento 'auth:ready'
 */

(function () {
  'use strict';

  // --- Iconos disponibles ---
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

  // --- Elementos del DOM ---
  var settingsBtn = document.getElementById('settings-btn');
  var settingsModal = document.getElementById('settings-modal');
  var settingsClose = document.getElementById('settings-close');
  var themePaletteGrid = document.getElementById('theme-palette-grid');

  // --- Estado ---
  var userId = null;
  var currentTheme = 'cyber';

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
    }
  ];

  function getSupabase() {
    return window.supabaseClient || null;
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
      });
    });
  }

  // --- Tema: aplicar ---
  function applyTheme(themeId) {
    var theme = THEMES.find(function (t) { return t.id === themeId; });
    if (!theme) return;

    currentTheme = themeId;
    var root = document.documentElement;
    Object.keys(theme.vars).forEach(function (key) {
      root.style.setProperty(key, theme.vars[key]);
    });

    // Actualizar UI del grid de paletas
    document.querySelectorAll('.theme-palette-card').forEach(function (card) {
      card.classList.toggle('active', card.dataset.theme === themeId);
    });
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
        .select('theme, city')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        if (data.theme) applyTheme(data.theme);
        if (data.city) {
          var cityInput = document.getElementById('weather-city-input');
          if (cityInput) cityInput.value = data.city;
        }
      }
    } catch (e) {
      // Tabla quizás no existe aún, usar default
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
  function buildIconPicker(container, hiddenInput, selectedIcon) {
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
        hiddenInput.value = iconClass;
      });
      container.appendChild(btn);
    });
  }

  // --- Modal open/close ---
  function openSettings() {
    settingsModal.style.display = 'flex';
    renderPalettes();
  }

  function closeSettings() {
    settingsModal.style.display = 'none';
  }

  // --- Utilidad: escape HTML ---
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
      } else {
        iconHtml = '<i class="' + escapeHtml(link.icon_value) + '"></i>';
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
    if (link && link.icon_type === 'image') {
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
    var iconValue = iconType === 'image' ? qlImageInput.value.trim() : qlIconInput.value;

    if (!iconValue) {
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

      if (qlIconType === 'image') {
        qlImageRow.style.display = 'flex';
        qlFaRow.style.display = 'none';
      } else {
        qlImageRow.style.display = 'none';
        qlFaRow.style.display = 'flex';
        buildIconPicker(qlIconPicker, qlIconInput, qlIconInput.value);
      }
    });
  });

  // --- Steam ID Settings ---
  var steamIdInput = document.getElementById('steam-id-input');
  var steamIdSave = document.getElementById('steam-id-save');
  var steamIdStatus = document.getElementById('steam-id-status');

  async function loadSteamId() {
    var client = getSupabase();
    if (!client || !userId) return;

    try {
      var result = await client
        .from('user_steam_settings')
        .select('steam_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (result.data && result.data.steam_id && steamIdInput) {
        steamIdInput.value = result.data.steam_id;
      }
    } catch (e) {
      // Tabla quizás no existe aún
    }
  }

  async function saveSteamId() {
    var value = steamIdInput.value.trim();
    if (!value) {
      if (steamIdStatus) {
        steamIdStatus.textContent = 'Ingresa un Steam ID';
        steamIdStatus.style.color = '#fb7185';
      }
      return;
    }

    var client = getSupabase();
    if (!client || !userId) return;

    if (steamIdSave) {
      steamIdSave.disabled = true;
      steamIdSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    try {
      var result = await client
        .from('user_steam_settings')
        .upsert(
          { user_id: userId, steam_id: value },
          { onConflict: 'user_id' }
        );

      if (result.error) {
        if (steamIdStatus) {
          steamIdStatus.textContent = 'Error: ' + result.error.message;
          steamIdStatus.style.color = '#fb7185';
        }
      } else {
        if (steamIdStatus) {
          steamIdStatus.textContent = 'Steam ID guardado correctamente';
          steamIdStatus.style.color = '#57cbde';
        }
        // Refresh Steam widget
        if (typeof window.SteamStats !== 'undefined' && typeof window.SteamStats.load === 'function') {
          window.SteamStats.load();
        }
      }
    } catch (e) {
      if (steamIdStatus) {
        steamIdStatus.textContent = 'Error: ' + e.message;
        steamIdStatus.style.color = '#fb7185';
      }
    }

    if (steamIdSave) {
      steamIdSave.disabled = false;
      steamIdSave.innerHTML = '<i class="fa-solid fa-check"></i>';
    }
  }

  if (steamIdSave) steamIdSave.addEventListener('click', saveSteamId);
  if (steamIdInput) steamIdInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') saveSteamId();
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
    loadSteamId();
    renderQuickLinksSettings();
  });

  window.addEventListener('auth:logout', function () {
    userId = null;
    currentTheme = 'cyber';
    applyTheme('cyber');
    closeSettings();
  });
})();
