/**
 * quickAccess.js — Acceso Rápido (Sección 2)
 * Grid de accesos directos + barra de búsqueda Google
 * CRUD con persistencia en Supabase (tabla user_quick_links)
 * Se integra con settings.js (tab "Rápidos") y commandPalette.js
 */

(function () {
  'use strict';

  // --- Elementos del widget ---
  var grid = document.getElementById('quick-links-grid');
  var emptyMsg = document.getElementById('quick-empty');
  var searchInput = document.getElementById('quick-search-input');

  // --- Estado ---
  var quickLinks = [];
  var userId = null;

  function getSupabase() {
    return window.supabaseClient || null;
  }

  // =============================================
  // CARGA DESDE SUPABASE
  // =============================================

  async function loadQuickLinks() {
    var client = getSupabase();
    if (!client || !userId) return;

    try {
      var result = await client
        .from('user_quick_links')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true });

      if (result.error) {
        console.warn('MozzPCC: Error cargando quick links:', result.error);
        return;
      }

      quickLinks = result.data || [];
      renderGrid();
    } catch (e) {
      console.warn('MozzPCC: Error cargando quick links:', e);
    }
  }

  // =============================================
  // RENDERIZADO DEL WIDGET
  // =============================================

  function renderGrid() {
    grid.innerHTML = '';

    if (quickLinks.length === 0) {
      emptyMsg.style.display = 'block';
      return;
    }

    emptyMsg.style.display = 'none';

    quickLinks.forEach(function (link) {
      var a = document.createElement('a');
      a.className = 'quick-link-item';
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', link.name);

      var iconHtml = '';
      if (link.icon_type === 'image' && link.icon_value) {
        iconHtml = '<img src="' + escapeAttr(link.icon_value) + '" alt="" class="quick-link-img">';
      } else {
        iconHtml = '<i class="' + escapeAttr(link.icon_value) + '"></i>';
      }

      a.innerHTML =
        '<div class="quick-link-icon-wrap">' + iconHtml + '</div>' +
        '<span class="quick-link-label">' + escapeHtml(link.name) + '</span>';

      grid.appendChild(a);
    });
  }

  // =============================================
  // CRUD
  // =============================================

  async function addQuickLink(data) {
    var client = getSupabase();
    if (!client || !userId) return { error: 'No auth' };

    var position = quickLinks.length;
    var result = await client
      .from('user_quick_links')
      .insert({
        user_id: userId,
        name: data.name,
        url: data.url,
        icon_type: data.icon_type,
        icon_value: data.icon_value,
        position: position
      })
      .select()
      .single();

    if (!result.error && result.data) {
      quickLinks.push(result.data);
      renderGrid();
    }
    return result;
  }

  async function updateQuickLink(id, updates) {
    var client = getSupabase();
    if (!client) return { error: 'No client' };

    var result = await client
      .from('user_quick_links')
      .update(updates)
      .eq('id', id);

    if (!result.error) {
      var link = quickLinks.find(function (l) { return l.id === id; });
      if (link) {
        if (updates.name !== undefined) link.name = updates.name;
        if (updates.url !== undefined) link.url = updates.url;
        if (updates.icon_type !== undefined) link.icon_type = updates.icon_type;
        if (updates.icon_value !== undefined) link.icon_value = updates.icon_value;
      }
      renderGrid();
    }
    return result;
  }

  async function deleteQuickLink(id) {
    var client = getSupabase();
    if (!client) return;

    // Guardar link para posible undo
    var linkEliminado = quickLinks.find(function (l) { return l.id === id; });

    // Optimistic update
    quickLinks = quickLinks.filter(function (l) { return l.id !== id; });
    renderGrid();

    // Mostrar toast con undo
    if (window.UndoToast) {
      window.UndoToast.show({
        message: 'Acceso rapido eliminado',
        onUndo: function () {
          if (linkEliminado) {
            quickLinks.push(linkEliminado);
            renderGrid();
          }
        },
        onConfirm: function () {
          client.from('user_quick_links').delete().eq('id', id)
            .then(function (result) {
              if (result.error) {
                console.warn('Error al eliminar acceso rapido:', result.error);
                loadLinks();
              }
            })
            .catch(function (e) {
              console.warn('Error al eliminar acceso rapido:', e);
            });
        }
      });
    } else {
      var result = await client
        .from('user_quick_links')
        .delete()
        .eq('id', id);

      if (!result.error) {
        quickLinks = quickLinks.filter(function (l) { return l.id !== id; });
        renderGrid();
      }
    }
  }

  async function moveQuickLink(id, direction) {
    var index = quickLinks.findIndex(function (l) { return l.id === id; });
    if (index === -1) return;

    var newIndex = index + direction;
    if (newIndex < 0 || newIndex >= quickLinks.length) return;

    // Swap local
    var temp = quickLinks[index];
    quickLinks[index] = quickLinks[newIndex];
    quickLinks[newIndex] = temp;

    // Update positions in DB
    var client = getSupabase();
    if (client) {
      try {
        await client.from('user_quick_links').update({ position: index }).eq('id', quickLinks[index].id);
        await client.from('user_quick_links').update({ position: newIndex }).eq('id', quickLinks[newIndex].id);
      } catch (e) { /* silent */ }
    }

    renderGrid();
    // Re-render settings list if open
    if (typeof window.renderQuickLinksSettings === 'function') {
      window.renderQuickLinksSettings();
    }
  }

  // =============================================
  // BÚSQUEDA GOOGLE
  // =============================================

  if (searchInput) {
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var query = searchInput.value.trim();
        if (query) {
          window.open('https://www.google.com/search?q=' + encodeURIComponent(query), '_blank');
        }
      }
    });
  }

  // =============================================
  // HELPERS
  // =============================================

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeAttr(text) {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // =============================================
  // EVENTOS AUTH
  // =============================================

  window.addEventListener('auth:ready', function (e) {
    userId = e.detail.userId;
    loadQuickLinks();
  });

  window.addEventListener('auth:logout', function () {
    quickLinks = [];
    userId = null;
    grid.innerHTML = '';
    emptyMsg.style.display = 'block';
  });

  // =============================================
  // API PÚBLICA (para settings.js y commandPalette.js)
  // =============================================

  window.QuickAccess = {
    getAll: function () { return quickLinks.slice(); },
    load: loadQuickLinks,
    render: renderGrid,
    add: addQuickLink,
    update: updateQuickLink,
    delete: deleteQuickLink,
    move: moveQuickLink
  };
})();
