/**
 * readLater.js — Ver Mas Tarde
 * CRUD de links guardados con persistencia en Supabase
 * Tags de colores opcionales + filtros
 * Drag & Drop para reordenar items (pointer events)
 */

(function () {
  'use strict';

  var titleInput = document.getElementById('rl-title-input');
  var urlInput = document.getElementById('rl-url-input');
  var addBtn = document.getElementById('rl-add-btn');
  var list = document.getElementById('rl-list');
  var counter = document.getElementById('rl-counter');
  var tagPicker = document.getElementById('rl-tag-picker');
  var filtersContainer = document.getElementById('rl-filters');

  var items = [];
  var userId = null;
  var selectedTagColor = null; // null = sin tag
  var activeFilter = null;    // null = todos
  var initialized = false;

  var TAG_COLORS = ['yellow', 'green', 'pink', 'blue', 'purple'];

  // --- Drag & Drop state ---
  var dragElement = null;
  var placeholder = null;
  var dragging = false;

  function getSupabase() {
    return window.supabaseClient || null;
  }

  // =============================================
  // TAG PICKER (color dots below inputs)
  // =============================================

  function buildTagPicker() {
    // Limpiar dots existentes (excepto el label)
    tagPicker.querySelectorAll('.rl-tag-dot').forEach(function (d) { d.remove(); });

    // "None" dot
    var noneDot = createTagDot('none', null);
    tagPicker.appendChild(noneDot);

    // Color dots
    TAG_COLORS.forEach(function (color) {
      var dot = createTagDot(color, color);
      tagPicker.appendChild(dot);
    });
  }

  function createTagDot(colorName, colorValue) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'rl-tag-dot';
    dot.dataset.color = colorName;
    dot.setAttribute('aria-label', 'Tag ' + colorName);

    if (selectedTagColor === colorValue) {
      dot.classList.add('active');
    }

    dot.addEventListener('click', function () {
      selectedTagColor = (selectedTagColor === colorValue) ? null : colorValue;
      tagPicker.querySelectorAll('.rl-tag-dot').forEach(function (d) {
        d.classList.toggle('active', d.dataset.color === colorName);
      });
    });

    return dot;
  }

  // =============================================
  // FILTER CHIPS
  // =============================================

  function renderFilters() {
    filtersContainer.innerHTML = '';

    // Contar items por color
    var colorCounts = {};
    var hasTagged = false;
    items.forEach(function (item) {
      if (item.tag_color) {
        colorCounts[item.tag_color] = (colorCounts[item.tag_color] || 0) + 1;
        hasTagged = true;
      }
    });

    if (!hasTagged) return;

    // "Todos" chip
    var allChip = document.createElement('button');
    allChip.className = 'rl-filter-chip' + (activeFilter === null ? ' active' : '');
    allChip.textContent = 'Todos';
    allChip.addEventListener('click', function () {
      activeFilter = null;
      render();
    });
    filtersContainer.appendChild(allChip);

    // Color chips (solo los colores que tienen items)
    TAG_COLORS.forEach(function (color) {
      var count = colorCounts[color];
      if (!count) return;

      var chip = document.createElement('button');
      chip.className = 'rl-filter-chip' + (activeFilter === color ? ' active' : '');
      chip.innerHTML =
        '<span class="rl-filter-chip-dot" style="background:var(--note-' + color + ')"></span>' +
        '<span class="rl-filter-chip-count">' + count + '</span>';

      chip.addEventListener('click', function () {
        activeFilter = (activeFilter === color) ? null : color;
        render();
      });

      filtersContainer.appendChild(chip);
    });
  }

  // =============================================
  // CRUD
  // =============================================

  async function loadItems() {
    var client = getSupabase();
    if (!client || !userId) return;

    try {
      var result = await client
        .from('read_later_items')
        .select('*')
        .eq('user_id', userId)
        .order('order_index', { ascending: true });

      if (result.error) {
        console.warn('MozzPCC: Error cargando read later:', result.error);
        return;
      }

      items = (result.data || []).map(function (r) {
        return {
          id: r.id,
          title: r.title,
          url: r.url,
          tag_color: r.tag_color || null,
          order_index: r.order_index || 0,
          created_at: r.created_at
        };
      });

      render();
    } catch (e) {
      console.warn('MozzPCC: Error cargando read later:', e);
    }
  }

  function render() {
    hideSkeleton('skel-readlater');
    list.innerHTML = '';

    // Filtrar items
    var filteredItems = items;
    if (activeFilter) {
      filteredItems = items.filter(function (i) { return i.tag_color === activeFilter; });
    }

    if (filteredItems.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'read-later-empty';
      if (items.length > 0 && activeFilter) {
        empty.innerHTML = '<i class="fa-solid fa-filter"></i>No hay links con este tag';
      } else {
        empty.innerHTML = '<i class="fa-solid fa-bookmark"></i>No hay links guardados';
      }
      list.appendChild(empty);
    } else {
      filteredItems.forEach(function (item, index) {
        list.appendChild(createItem(item, index));
      });
    }

    renderFilters();
    updateCounter(filteredItems.length, items.length);
  }

  function createItem(item, index) {
    var li = document.createElement('li');
    li.className = 'read-later-item';
    li.dataset.id = item.id;
    li.dataset.index = index;
    if (item.tag_color) {
      li.dataset.tag = item.tag_color;
    }

    // Tag color button (cycle colors on click)
    var tagBtn = document.createElement('button');
    tagBtn.className = 'rl-item-tag';
    tagBtn.setAttribute('aria-label', 'Cambiar tag');
    var tagDot = document.createElement('span');
    tagDot.className = 'rl-item-tag-dot';
    tagDot.dataset.color = item.tag_color || 'none';
    tagBtn.appendChild(tagDot);
    tagBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      cycleTagColor(item);
    });

    // Grip handle
    var grip = document.createElement('button');
    grip.className = 'rl-grip';
    grip.setAttribute('aria-label', 'Arrastrar para reordenar');
    grip.innerHTML = '<i class="fa-solid fa-grip-vertical"></i>';
    grip.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      startDrag(e, item, li);
    });

    var link = document.createElement('a');
    link.className = 'read-later-link';
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener';

    var titleSpan = document.createElement('span');
    titleSpan.className = 'read-later-title';
    titleSpan.textContent = item.title;

    var urlSpan = document.createElement('span');
    urlSpan.className = 'read-later-url';
    urlSpan.textContent = extractDomain(item.url);

    link.appendChild(titleSpan);
    link.appendChild(urlSpan);

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'rl-delete';
    deleteBtn.setAttribute('aria-label', 'Eliminar');
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    deleteBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      deleteItem(item.id);
    });

    li.appendChild(tagBtn);
    li.appendChild(grip);
    li.appendChild(link);
    li.appendChild(deleteBtn);

    return li;
  }

  // --- Cycle tag color: none → yellow → green → pink → blue → purple → none ---
  async function cycleTagColor(item) {
    var current = item.tag_color;
    var nextIndex = current
      ? TAG_COLORS.indexOf(current)
      : -1;

    var nextColor = TAG_COLORS[(nextIndex + 1) % TAG_COLORS.length];
    // Si ya era purple (último), volver a null
    if (nextIndex === TAG_COLORS.length - 1) {
      nextColor = null;
    }

    item.tag_color = nextColor;

    // Actualizar en Supabase
    var client = getSupabase();
    if (client) {
      try {
        await client
          .from('read_later_items')
          .update({ tag_color: nextColor })
          .eq('id', item.id);
      } catch (e) {
        console.warn('MozzPCC: Error actualizando tag:', e);
      }
    }

    render();
  }

  function extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  }

  function updateCounter(filtered, total) {
    var span = counter.querySelector('span');
    if (span) span.textContent = filtered;
    // Si hay filtro activo, mostrar filtered/total
    if (activeFilter && filtered !== total) {
      counter.innerHTML = '<span>' + filtered + '</span> / ' + total + ' links';
    } else {
      counter.innerHTML = '<span>' + total + '</span> links guardados';
    }
  }

  // --- Agregar ---
  async function addItem() {
    var client = getSupabase();
    if (!client || !userId) return;

    var title = titleInput.value.trim();
    var url = urlInput.value.trim();

    if (!title || !url) {
      if (!title) titleInput.focus();
      else urlInput.focus();
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    addBtn.disabled = true;
    addBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      var result = await client
        .from('read_later_items')
        .insert({
          user_id: userId,
          title: title,
          url: url,
          order_index: 0,
          tag_color: selectedTagColor
        })
        .select()
        .single();

      if (result.error) {
        console.warn('MozzPCC: Error agregando read later:', result.error);
        return;
      }

      items.unshift({
        id: result.data.id,
        title: result.data.title,
        url: result.data.url,
        tag_color: selectedTagColor,
        order_index: 0,
        created_at: result.data.created_at
      });

      await saveOrder();

      render();
      titleInput.value = '';
      urlInput.value = '';
      titleInput.focus();
    } catch (e) {
      console.warn('MozzPCC: Error agregando read later:', e);
    } finally {
      addBtn.disabled = false;
      addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
    }
  }

  // --- Eliminar ---
  async function deleteItem(id) {
    var client = getSupabase();
    if (!client || !userId) return;

    // Guardar item para posible undo
    var itemEliminado = items.find(function (i) { return i.id === id; });
    var originalIndex = items.findIndex(function (i) { return i.id === id; });

    // Optimistic update
    items = items.filter(function (i) { return i.id !== id; });
    await saveOrder();
    render();

    // Mostrar toast con undo
    if (window.UndoToast) {
      window.UndoToast.show({
        message: 'Articulo eliminado',
        onUndo: function () {
          if (itemEliminado) {
            // Restaurar en posición original
            items.splice(Math.min(originalIndex, items.length), 0, itemEliminado);
            saveOrder();
            render();
          }
        },
        onConfirm: function () {
          client.from('read_later_items').delete().eq('id', id)
            .then(function (result) {
              if (result.error) {
                console.warn('MozzPCC: Error eliminando read later:', result.error);
                loadItems();
              }
            })
            .catch(function (e) {
              console.warn('MozzPCC: Error eliminando read later:', e);
              loadItems();
            });
        }
      });
    } else {
      try {
        var result = await client
          .from('read_later_items')
          .delete()
          .eq('id', id);

        if (result.error) {
          console.warn('MozzPCC: Error eliminando read later:', result.error);
          loadItems();
        }
      } catch (e) {
        console.warn('MozzPCC: Error eliminando read later:', e);
        loadItems();
      }
    }
  }

  // --- Guardar orden en Supabase ---
  async function saveOrder() {
    var client = getSupabase();
    if (!client || !userId) return;

    try {
      for (var i = 0; i < items.length; i++) {
        await client
          .from('read_later_items')
          .update({ order_index: i })
          .eq('id', items[i].id);
      }
    } catch (e) {
      console.warn('MozzPCC: Error guardando orden read later:', e);
    }
  }

  // =============================================
  // DRAG & DROP (Pointer Events)
  // =============================================

  function startDrag(e, item, element) {
    if (dragging) return;
    dragging = true;

    dragElement = element;

    element.classList.add('dragging');

    placeholder = document.createElement('li');
    placeholder.className = 'read-later-item';
    placeholder.style.visibility = 'hidden';
    placeholder.style.height = element.offsetHeight + 'px';
    placeholder.style.padding = '0';

    element.parentNode.insertBefore(placeholder, element.nextSibling);
    element.setPointerCapture(e.pointerId);

    element.addEventListener('pointermove', onDragMove);
    element.addEventListener('pointerup', onDragEnd);
    element.addEventListener('pointercancel', onDragEnd);
  }

  function onDragMove(e) {
    if (!dragging || !dragElement) return;

    var listItems = list.querySelectorAll('.read-later-item:not(.dragging):not([style*="visibility: hidden"])');
    var closestItem = null;
    var closestOffset = Number.POSITIVE_INFINITY;
    var insertBefore = true;

    for (var i = 0; i < listItems.length; i++) {
      var box = listItems[i].getBoundingClientRect();
      var midY = box.top + box.height / 2;
      var offset = e.clientY - midY;

      if (Math.abs(offset) < Math.abs(closestOffset)) {
        closestOffset = offset;
        closestItem = listItems[i];
        insertBefore = offset < 0;
      }
    }

    clearDropIndicators();

    if (closestItem) {
      if (insertBefore) {
        closestItem.classList.add('drop-before');
        list.insertBefore(placeholder, closestItem);
      } else {
        closestItem.classList.add('drop-after');
        var nextSibling = closestItem.nextSibling;
        if (nextSibling) {
          list.insertBefore(placeholder, nextSibling);
        } else {
          list.appendChild(placeholder);
        }
      }
    }
  }

  function onDragEnd(e) {
    if (!dragging || !dragElement) return;

    dragElement.removeEventListener('pointermove', onDragMove);
    dragElement.removeEventListener('pointerup', onDragEnd);
    dragElement.removeEventListener('pointercancel', onDragEnd);

    clearDropIndicators();

    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(dragElement, placeholder);
      placeholder.parentNode.removeChild(placeholder);
    }

    dragElement.classList.remove('dragging');

    var newOrder = [];
    var listElements = list.querySelectorAll('.read-later-item[data-id]');
    listElements.forEach(function (el) {
      var id = el.dataset.id;
      var item = items.find(function (i) { return i.id === id; });
      if (item) newOrder.push(item);
    });

    if (newOrder.length === items.length) {
      items = newOrder;
      saveOrder();
    }

    dragElement = null;
    placeholder = null;
    dragging = false;
  }

  function clearDropIndicators() {
    var indicators = list.querySelectorAll('.drop-before, .drop-after');
    indicators.forEach(function (el) {
      el.classList.remove('drop-before');
      el.classList.remove('drop-after');
    });
  }

  // --- Cleanup ---
  function cleanup() {
    items = [];
    userId = null;
    selectedTagColor = null;
    activeFilter = null;
    initialized = false;
    list.innerHTML = '';
    filtersContainer.innerHTML = '';
    titleInput.value = '';
    urlInput.value = '';
    // Reset tag picker
    tagPicker.querySelectorAll('.rl-tag-dot').forEach(function (d) {
      d.classList.toggle('active', d.dataset.color === 'none');
    });
  }

  // --- Events ---
  addBtn.addEventListener('click', addItem);

  titleInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      if (urlInput.value.trim()) addItem();
      else urlInput.focus();
    }
  });

  urlInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addItem();
  });

  window.addEventListener('auth:ready', function (e) {
    userId = e.detail.userId;
    if (!initialized) {
      initialized = true;
      buildTagPicker();
    }
    loadItems();
  });

  window.addEventListener('auth:logout', function () {
    cleanup();
  });
})();
