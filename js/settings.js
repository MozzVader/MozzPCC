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
        { name: 'Productividad', url: '#section-productivity', icon: 'fa-solid fa-bolt', order: 1 },
        { name: 'Notas', url: '#section-notes', icon: 'fa-solid fa-note-sticky', order: 2 },
        { name: 'Inspiracion', url: '#section-quotes', icon: 'fa-solid fa-quote-left', order: 3 }
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

  function getSupabase() {
    return window.supabaseClient || null;
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

  // --- Eventos ---
  settingsBtn.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);

  // Click en overlay para cerrar (no en el modal)
  settingsModal.addEventListener('click', function (e) {
    if (e.target === settingsModal) closeSettings();
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
      if (linkForm.style.display === 'flex') closeLinkForm();
      else if (groupForm.style.display === 'flex') closeGroupForm();
      else if (settingsModal.style.display === 'flex') closeSettings();
    }
  });

  // --- Auth events ---
  window.addEventListener('auth:ready', function (e) {
    userId = e.detail.userId;
    loadGroups();
  });

  window.addEventListener('auth:logout', function () {
    groups = [];
    selectedGroupId = null;
    userId = null;
    closeSettings();
  });
})();
