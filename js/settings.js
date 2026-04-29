/**
 * settings.js — Configuración del dock personalizable
 * CRUD de grupos y links con persistencia en Supabase
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

  // --- Datos default para seed ---
  var DEFAULT_GROUPS = [
    {
      name: 'Secciones',
      icon: 'fa-solid fa-grip',
      is_default: true,
      order: 0,
      links: [
        { name: 'Reloj', url: '#section-clock', icon: 'fa-regular fa-clock', order: 0 },
        { name: 'Acceso Rapido', url: '#section-quick-access', icon: 'fa-solid fa-rocket', order: 1 },
        { name: 'Productividad', url: '#section-productivity', icon: 'fa-solid fa-bolt', order: 2 },
        { name: 'Notas', url: '#section-notes', icon: 'fa-solid fa-note-sticky', order: 3 },
        { name: 'Inspiracion', url: '#section-quotes', icon: 'fa-solid fa-quote-left', order: 4 }
      ]
    },
    {
      name: 'Links',
      icon: 'fa-solid fa-globe',
      is_default: true,
      order: 1,
      links: [
        { name: 'GitHub', url: 'https://github.com/MozzVader', icon: 'fa-brands fa-github', order: 0 },
        { name: 'YouTube', url: 'https://youtube.com', icon: 'fa-brands fa-youtube', order: 1 },
        { name: 'Chat Z.AI', url: 'https://chat.z.ai', icon: 'fa-solid fa-robot', order: 2 }
      ]
    }
  ];

  // --- Elementos del DOM ---
  var settingsBtn = document.getElementById('settings-btn');
  var settingsModal = document.getElementById('settings-modal');
  var settingsClose = document.getElementById('settings-close');
  var groupsList = document.getElementById('settings-groups-list');
  var linksList = document.getElementById('settings-links-list');
  var linksTitle = document.getElementById('settings-links-title');
  var noGroupMsg = document.getElementById('settings-no-group');
  var addGroupBtn = document.getElementById('settings-add-group');
  var addLinkBtn = document.getElementById('settings-add-link');
  var themePaletteGrid = document.getElementById('theme-palette-grid');

  // Form: grupo
  var groupForm = document.getElementById('group-form');
  var groupFormTitle = document.getElementById('group-form-title');
  var groupNameInput = document.getElementById('group-name-input');
  var groupIconPicker = document.getElementById('group-icon-picker');
  var groupIconInput = document.getElementById('group-icon-input');
  var groupFormCancel = document.getElementById('group-form-cancel');
  var groupFormSave = document.getElementById('group-form-save');

  // Form: link
  var linkForm = document.getElementById('link-form');
  var linkFormTitle = document.getElementById('link-form-title');
  var linkNameInput = document.getElementById('link-name-input');
  var linkUrlInput = document.getElementById('link-url-input');
  var linkIconPicker = document.getElementById('link-icon-picker');
  var linkIconInput = document.getElementById('link-icon-input');
  var linkFormCancel = document.getElementById('link-form-cancel');
  var linkFormSave = document.getElementById('link-form-save');

  // --- Estado ---
  var groups = [];
  var selectedGroupId = null;
  var editingGroupId = null;
  var editingLinkId = null;
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
    loadGroups();
  }

  function closeSettings() {
    settingsModal.style.display = 'none';
    groupForm.style.display = 'none';
    linkForm.style.display = 'none';
    selectedGroupId = null;
  }

  // --- Cargar grupos desde Supabase ---
  async function loadGroups() {
    var client = getSupabase();
    if (!client || !userId) return;

    try {
      var { data, error } = await client
        .from('user_dock_groups')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true });

      if (error) {
        console.warn('Error al cargar grupos:', error);
        return;
      }

      groups = data || [];
      renderGroups();

      // Si no hay grupos, hacer seed con los defaults
      if (groups.length === 0) {
        await seedDefaults();
      } else {
        // Cargar links de cada grupo
        for (var i = 0; i < groups.length; i++) {
          await loadLinks(groups[i].id);
        }
        renderGroups();
        notifyDockUpdate();
      }
    } catch (e) {
      console.warn('Error al cargar grupos:', e);
    }
  }

  // --- Cargar links de un grupo ---
  async function loadLinks(groupId) {
    var client = getSupabase();
    if (!client || !groupId) return;

    try {
      var { data, error } = await client
        .from('user_dock_links')
        .select('*')
        .eq('user_id', userId)
        .eq('group_id', groupId)
        .order('order', { ascending: true });

      if (error) {
        console.warn('Error al cargar links:', error);
        return;
      }

      // Asignar links al grupo en el estado local
      var group = groups.find(function (g) { return g.id === groupId; });
      if (group) {
        group._links = data || [];
      }

      renderGroups();
      renderLinks();
    } catch (e) {
      console.warn('Error al cargar links:', e);
    }
  }

  // --- Renderizar grupos ---
  function renderGroups() {
    groupsList.innerHTML = '';

    if (groups.length === 0) {
      groupsList.innerHTML = '<p class="settings-empty-msg" style="padding:16px;">No hay grupos</p>';
      return;
    }

    groups.forEach(function (group) {
      var item = document.createElement('div');
      item.className = 'settings-group-item' + (group.id === selectedGroupId ? ' active' : '');
      item.dataset.id = group.id;

      item.innerHTML =
        '<div class="group-icon"><i class="' + group.icon + '"></i></div>' +
        '<div class="group-info">' +
          '<div class="group-name">' + escapeHtml(group.name) + '</div>' +
          '<div class="group-count">' + (group._links ? group._links.length : 0) + ' links</div>' +
        '</div>' +
        '<div class="group-actions">' +
          '<button class="group-action-btn edit" title="Editar" aria-label="Editar grupo"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="group-action-btn move-up" title="Subir" aria-label="Subir"><i class="fa-solid fa-chevron-up"></i></button>' +
          '<button class="group-action-btn move-down" title="Bajar" aria-label="Bajar"><i class="fa-solid fa-chevron-down"></i></button>' +
          (group.is_default ? '' : '<button class="group-action-btn delete" title="Eliminar" aria-label="Eliminar grupo"><i class="fa-solid fa-trash-can"></i></button>') +
        '</div>';

      // Click para seleccionar
      item.addEventListener('click', function (e) {
        if (e.target.closest('.group-action-btn')) return;
        selectedGroupId = group.id;
        renderGroups();
        loadLinks(group.id);
      });

      // Botones de acción
      var editBtn = item.querySelector('.edit');
      var upBtn = item.querySelector('.move-up');
      var downBtn = item.querySelector('.move-down');
      var deleteBtn = item.querySelector('.delete');

      if (editBtn) editBtn.addEventListener('click', function (e) { e.stopPropagation(); openGroupForm(group); });
      if (upBtn) upBtn.addEventListener('click', function (e) { e.stopPropagation(); moveGroup(group.id, -1); });
      if (downBtn) downBtn.addEventListener('click', function (e) { e.stopPropagation(); moveGroup(group.id, 1); });
      if (deleteBtn) deleteBtn.addEventListener('click', function (e) { e.stopPropagation(); deleteGroup(group.id); });

      groupsList.appendChild(item);
    });
  }

  // --- Renderizar links ---
  function renderLinks() {
    linksList.innerHTML = '';

    var group = groups.find(function (g) { return g.id === selectedGroupId; });
    if (!group) {
      linksTitle.textContent = 'Links';
      noGroupMsg.style.display = 'block';
      addLinkBtn.style.display = 'none';
      return;
    }

    linksTitle.textContent = group.name + ' — Links';
    noGroupMsg.style.display = 'none';
    addLinkBtn.style.display = 'flex';

    var links = group._links || [];

    if (links.length === 0) {
      linksList.innerHTML = '<p class="settings-empty-msg">No hay links en este grupo</p>';
      return;
    }

    links.forEach(function (link) {
      var item = document.createElement('div');
      item.className = 'settings-link-item';
      item.dataset.id = link.id;

      item.innerHTML =
        '<div class="link-icon"><i class="' + link.icon + '"></i></div>' +
        '<div class="link-info">' +
          '<div class="link-name">' + escapeHtml(link.name) + '</div>' +
          '<div class="link-url">' + escapeHtml(link.url) + '</div>' +
        '</div>' +
        '<div class="link-actions">' +
          '<button class="link-action-btn edit" title="Editar" aria-label="Editar link"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="link-action-btn move-up" title="Subir" aria-label="Subir"><i class="fa-solid fa-chevron-up"></i></button>' +
          '<button class="link-action-btn move-down" title="Bajar" aria-label="Bajar"><i class="fa-solid fa-chevron-down"></i></button>' +
          '<button class="link-action-btn delete" title="Eliminar" aria-label="Eliminar link"><i class="fa-solid fa-trash-can"></i></button>' +
        '</div>';

      var editBtn = item.querySelector('.edit');
      var upBtn = item.querySelector('.move-up');
      var downBtn = item.querySelector('.move-down');
      var deleteBtn = item.querySelector('.delete');

      if (editBtn) editBtn.addEventListener('click', function () { openLinkForm(link); });
      if (upBtn) upBtn.addEventListener('click', function () { moveLink(link.id, -1); });
      if (downBtn) downBtn.addEventListener('click', function () { moveLink(link.id, 1); });
      if (deleteBtn) deleteBtn.addEventListener('click', function () { deleteLink(link.id); });

      linksList.appendChild(item);
    });
  }

  // --- Formulario de grupo ---
  function openGroupForm(group) {
    if (group) {
      editingGroupId = group.id;
      groupFormTitle.textContent = 'Editar Grupo';
      groupNameInput.value = group.name;
      buildIconPicker(groupIconPicker, groupIconInput, group.icon);
    } else {
      editingGroupId = null;
      groupFormTitle.textContent = 'Nuevo Grupo';
      groupNameInput.value = '';
      buildIconPicker(groupIconPicker, groupIconInput, 'fa-solid fa-folder');
    }
    groupForm.style.display = 'flex';
    groupNameInput.focus();
  }

  function closeGroupForm() {
    groupForm.style.display = 'none';
    editingGroupId = null;
  }

  async function saveGroup() {
    var client = getSupabase();
    if (!client || !userId) return;

    var name = groupNameInput.value.trim();
    var icon = groupIconInput.value;

    if (!name) {
      groupNameInput.focus();
      return;
    }

    if (editingGroupId) {
      // Update
      try {
        var { error } = await client
          .from('user_dock_groups')
          .update({ name: name, icon: icon })
          .eq('id', editingGroupId);

        if (error) { console.warn('Error al actualizar grupo:', error); return; }

        var g = groups.find(function (g) { return g.id === editingGroupId; });
        if (g) { g.name = name; g.icon = icon; }
      } catch (e) {
        console.warn('Error al actualizar grupo:', e);
      }
    } else {
      // Create
      try {
        var order = groups.length;
        var { data, error } = await client
          .from('user_dock_groups')
          .insert({ user_id: userId, name: name, icon: icon, order: order })
          .select()
          .single();

        if (error) { console.warn('Error al crear grupo:', error); return; }

        data._links = [];
        groups.push(data);
      } catch (e) {
        console.warn('Error al crear grupo:', e);
      }
    }

    closeGroupForm();
    renderGroups();
    notifyDockUpdate();
  }

  // --- Formulario de link ---
  function openLinkForm(link) {
    if (link) {
      editingLinkId = link.id;
      linkFormTitle.textContent = 'Editar Link';
      linkNameInput.value = link.name;
      linkUrlInput.value = link.url;
      buildIconPicker(linkIconPicker, linkIconInput, link.icon);
    } else {
      editingLinkId = null;
      linkFormTitle.textContent = 'Nuevo Link';
      linkNameInput.value = '';
      linkUrlInput.value = '';
      buildIconPicker(linkIconPicker, linkIconInput, 'fa-solid fa-link');
    }
    linkForm.style.display = 'flex';
    linkNameInput.focus();
  }

  function closeLinkForm() {
    linkForm.style.display = 'none';
    editingLinkId = null;
  }

  async function saveLink() {
    var client = getSupabase();
    if (!client || !userId || !selectedGroupId) return;

    var name = linkNameInput.value.trim();
    var url = linkUrlInput.value.trim();
    var icon = linkIconInput.value;

    if (!name || !url) {
      if (!name) linkNameInput.focus();
      else linkUrlInput.focus();
      return;
    }

    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('#')) {
      url = 'https://' + url;
    }

    var group = groups.find(function (g) { return g.id === selectedGroupId; });
    if (!group) return;

    if (editingLinkId) {
      // Update
      try {
        var { error } = await client
          .from('user_dock_links')
          .update({ name: name, url: url, icon: icon })
          .eq('id', editingLinkId);

        if (error) { console.warn('Error al actualizar link:', error); return; }

        var link = (group._links || []).find(function (l) { return l.id === editingLinkId; });
        if (link) { link.name = name; link.url = url; link.icon = icon; }
      } catch (e) {
        console.warn('Error al actualizar link:', e);
      }
    } else {
      // Create
      try {
        var order = (group._links || []).length;
        var { data, error } = await client
          .from('user_dock_links')
          .insert({ user_id: userId, group_id: selectedGroupId, name: name, url: url, icon: icon, order: order })
          .select()
          .single();

        if (error) { console.warn('Error al crear link:', error); return; }

        if (!group._links) group._links = [];
        group._links.push(data);
      } catch (e) {
        console.warn('Error al crear link:', e);
      }
    }

    closeLinkForm();
    renderGroups();
    renderLinks();
    notifyDockUpdate();
  }

  // --- Eliminar grupo ---
  async function deleteGroup(groupId) {
    if (!confirm('Se eliminaran todos los links de este grupo.')) return;

    var client = getSupabase();
    if (!client) return;

    try {
      var { error } = await client
        .from('user_dock_groups')
        .delete()
        .eq('id', groupId);

      if (error) { console.warn('Error al eliminar grupo:', error); return; }

      groups = groups.filter(function (g) { return g.id !== groupId; });
      if (selectedGroupId === groupId) {
        selectedGroupId = null;
        renderLinks();
      }
      renderGroups();
      notifyDockUpdate();
    } catch (e) {
      console.warn('Error al eliminar grupo:', e);
    }
  }

  // --- Eliminar link ---
  async function deleteLink(linkId) {
    var client = getSupabase();
    if (!client) return;

    try {
      var { error } = await client
        .from('user_dock_links')
        .delete()
        .eq('id', linkId);

      if (error) { console.warn('Error al eliminar link:', error); return; }

      var group = groups.find(function (g) { return g.id === selectedGroupId; });
      if (group && group._links) {
        group._links = group._links.filter(function (l) { return l.id !== linkId; });
      }
      renderGroups();
      renderLinks();
      notifyDockUpdate();
    } catch (e) {
      console.warn('Error al eliminar link:', e);
    }
  }

  // --- Mover grupo (reordenar) ---
  async function moveGroup(groupId, direction) {
    var index = groups.findIndex(function (g) { return g.id === groupId; });
    if (index === -1) return;

    var newIndex = index + direction;
    if (newIndex < 0 || newIndex >= groups.length) return;

    // Swap en estado local
    var temp = groups[index];
    groups[index] = groups[newIndex];
    groups[newIndex] = temp;

    // Actualizar orders en Supabase
    var client = getSupabase();
    if (client) {
      try {
        await client
          .from('user_dock_groups')
          .update({ order: index })
          .eq('id', groups[index].id);

        await client
          .from('user_dock_groups')
          .update({ order: newIndex })
          .eq('id', groups[newIndex].id);
      } catch (e) {
        console.warn('Error al reordenar grupo:', e);
      }
    }

    renderGroups();
    notifyDockUpdate();
  }

  // --- Mover link (reordenar) ---
  async function moveLink(linkId, direction) {
    var group = groups.find(function (g) { return g.id === selectedGroupId; });
    if (!group || !group._links) return;

    var index = group._links.findIndex(function (l) { return l.id === linkId; });
    if (index === -1) return;

    var newIndex = index + direction;
    if (newIndex < 0 || newIndex >= group._links.length) return;

    var temp = group._links[index];
    group._links[index] = group._links[newIndex];
    group._links[newIndex] = temp;

    var client = getSupabase();
    if (client) {
      try {
        await client
          .from('user_dock_links')
          .update({ order: index })
          .eq('id', group._links[index].id);

        await client
          .from('user_dock_links')
          .update({ order: newIndex })
          .eq('id', group._links[newIndex].id);
      } catch (e) {
        console.warn('Error al reordenar link:', e);
      }
    }

    renderLinks();
    notifyDockUpdate();
  }

  // --- Seed de datos default ---
  async function seedDefaults() {
    var client = getSupabase();
    if (!client || !userId) return;

    try {
      for (var i = 0; i < DEFAULT_GROUPS.length; i++) {
        var dg = DEFAULT_GROUPS[i];

        // Crear grupo
        var { data: groupData, error: gError } = await client
          .from('user_dock_groups')
          .insert({
            user_id: userId,
            name: dg.name,
            icon: dg.icon,
            order: dg.order,
            is_default: dg.is_default
          })
          .select()
          .single();

        if (gError) { console.warn('Error al crear grupo default:', gError); continue; }

        groupData._links = [];

        // Crear links del grupo
        for (var j = 0; j < dg.links.length; j++) {
          var dl = dg.links[j];
          var { data: linkData, error: lError } = await client
            .from('user_dock_links')
            .insert({
              user_id: userId,
              group_id: groupData.id,
              name: dl.name,
              url: dl.url,
              icon: dl.icon,
              order: dl.order
            })
            .select()
            .single();

          if (!lError && linkData) {
            groupData._links.push(linkData);
          }
        }

        groups.push(groupData);
      }

      renderGroups();
      notifyDockUpdate();
    } catch (e) {
      console.warn('Error al seed datos default:', e);
    }
  }

  // --- Notificar al dock que los datos cambiaron ---
  function notifyDockUpdate() {
    window.dispatchEvent(new CustomEvent('dock:update', {
      detail: { groups: getDockData() }
    }));
  }

  // --- Obtener datos de grupos para el dock ---
  function getDockData() {
    return groups.map(function (g) {
      return {
        id: g.id,
        name: g.name,
        icon: g.icon,
        is_default: g.is_default,
        links: (g._links || []).map(function (l) {
          return { id: l.id, name: l.name, url: l.url, icon: l.icon };
        })
      };
    });
  }

  // Exponer para que dock.js pueda leer
  window.getDockData = getDockData;

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

    links.forEach(function (link) {
      var item = document.createElement('div');
      item.className = 'settings-quicklink-item';

      var iconHtml = '';
      if (link.icon_type === 'image' && link.icon_value) {
        iconHtml = '<img src="' + escapeHtml(link.icon_value) + '" alt="">';
      } else {
        iconHtml = '<i class="' + escapeHtml(link.icon_value) + '"></i>';
      }

      item.innerHTML =
        '<div class="ql-item-icon">' + iconHtml + '</div>' +
        '<div class="ql-item-info">' +
          '<div class="ql-item-name">' + escapeHtml(link.name) + '</div>' +
          '<div class="ql-item-url">' + escapeHtml(link.url) + '</div>' +
        '</div>' +
        '<div class="ql-item-actions">' +
          '<button class="ql-action-btn edit" title="Editar"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="ql-action-btn move-up" title="Subir"><i class="fa-solid fa-chevron-up"></i></button>' +
          '<button class="ql-action-btn move-down" title="Bajar"><i class="fa-solid fa-chevron-down"></i></button>' +
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

  addGroupBtn.addEventListener('click', function () { openGroupForm(null); });
  addLinkBtn.addEventListener('click', function () { openLinkForm(null); });

  groupFormCancel.addEventListener('click', closeGroupForm);
  groupFormSave.addEventListener('click', saveGroup);

  linkFormCancel.addEventListener('click', closeLinkForm);
  linkFormSave.addEventListener('click', saveLink);

  // Enter en formularios
  groupNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') saveGroup();
  });
  linkNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') linkUrlInput.focus();
  });
  linkUrlInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') saveLink();
  });

  // Click en overlay de forms para cerrar
  groupForm.addEventListener('click', function (e) {
    if (e.target === groupForm) closeGroupForm();
  });
  linkForm.addEventListener('click', function (e) {
    if (e.target === linkForm) closeLinkForm();
  });

  // Escape para cerrar todo
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (qlForm && qlForm.style.display === 'flex') closeQuicklinkForm();
      else if (linkForm.style.display === 'flex') closeLinkForm();
      else if (groupForm.style.display === 'flex') closeGroupForm();
      else if (settingsModal.style.display === 'flex') closeSettings();
    }
  });

  // --- Auth events ---
  window.addEventListener('auth:ready', function (e) {
    userId = e.detail.userId;
    loadGroups();
    loadTheme();
    renderQuickLinksSettings();
  });

  window.addEventListener('auth:logout', function () {
    groups = [];
    selectedGroupId = null;
    userId = null;
    currentTheme = 'cyber';
    applyTheme('cyber');
    closeSettings();
  });
})();
