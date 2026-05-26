/**
 * readLater.js — Ver Mas Tarde
 * CRUD de links guardados con persistencia en Supabase
 * Tags de colores opcionales + filtros + iconos
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
  var iconPreview = document.getElementById('rl-icon-preview');
  var iconPickerWrap = document.getElementById('rl-icon-picker-wrap');
  var iconPickerEl = document.getElementById('rl-icon-picker');

  var items = [];
  var userId = null;
  var selectedTagColor = null; // null = sin tag
  var selectedIcon = 'fa-solid fa-bookmark';
  var activeFilter = null;    // null = todos
  var initialized = false;

  var TAG_COLORS = ['yellow', 'green', 'pink', 'blue', 'purple'];
  var DEFAULT_ICON = 'fa-solid fa-bookmark';

  // --- Drag & Drop state ---
  var dragElement = null;
  var placeholder = null;
  var dragging = false;

  // =============================================
  // TAG PICKER (color dots below inputs)
  // =============================================

  function buildTagPicker() {
    tagPicker.querySelectorAll('.rl-tag-dot').forEach(function (d) { d.remove(); });

    tagPicker.appendChild(createTagDot('none', null));
    TAG_COLORS.forEach(function (color) {
      tagPicker.appendChild(createTagDot(color, color));
    });
  }

  function createTagDot(colorName, colorValue) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'rl-tag-dot';
    dot.dataset.color = colorName;
    dot.setAttribute('aria-label', 'Tag ' + colorName);

    if (selectedTagColor === colorValue) dot.classList.add('active');

    dot.addEventListener('click', function () {
      selectedTagColor = (selectedTagColor === colorValue) ? null : colorValue;
      tagPicker.querySelectorAll('.rl-tag-dot').forEach(function (d) {
        d.classList.toggle('active', d.dataset.color === colorName);
      });
    });

    return dot;
  }

  // =============================================
  // ICON PICKER (toggle al hacer click en preview)
  // =============================================

  var iconPickerOpen = false;

  function toggleIconPicker() {
    iconPickerOpen = !iconPickerOpen;
    if (iconPickerOpen) {
      iconPickerWrap.style.display = 'block';
      buildIconPicker(iconPickerEl, function (iconClass) {
        selectedIcon = iconClass;
        iconPreview.innerHTML = '<i class="' + iconClass + '"></i>';
      }, selectedIcon);
    } else {
      iconPickerWrap.style.display = 'none';
    }
  }

  function closeIconPicker() {
    iconPickerOpen = false;
    iconPickerWrap.style.display = 'none';
  }

  // =============================================
  // FILTER CHIPS
  // =============================================

  function renderFilters() {
    filtersContainer.innerHTML = '';

    var colorCounts = {};
    var hasTagged = false;
    items.forEach(function (item) {
      if (item.tag_color) {
        colorCounts[item.tag_color] = (colorCounts[item.tag_color] || 0) + 1;
        hasTagged = true;
      }
    });

    if (!hasTagged) return;

    var allChip = document.createElement('button');
    allChip.className = 'rl-filter-chip' + (activeFilter === null ? ' active' : '');
    allChip.textContent = 'Todos';
    allChip.addEventListener('click', function () {
      activeFilter = null;
      render();
    });
    filtersContainer.appendChild(allChip);

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
        window.showWidgetError('rl-list', {
          message: 'No se pudieron cargar los marcadores',
          retry: loadItems,
          skeletons: ['skel-readlater']
        });
        return;
      }

      window.clearWidgetError('rl-list');
      items = (result.data || []).map(function (r) {
        return {
          id: r.id,
          title: r.title,
          url: r.url,
          tag_color: r.tag_color || null,
          icon: r.icon || DEFAULT_ICON,
          order_index: r.order_index || 0,
          created_at: r.created_at
        };
      });

      render();
    } catch (e) {
      console.warn('MozzPCC: Error cargando read later:', e);
      window.showWidgetError('rl-list', {
        message: 'Error de conexion. Verifica tu internet.',
        retry: loadItems,
        skeletons: ['skel-readlater']
      });
    }
  }

  function render() {
    hideSkeleton('skel-readlater');
    list.innerHTML = '';

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
    if (item.tag_color) li.dataset.tag = item.tag_color;

    // Icon (always visible, colored by tag, cycles tag color on click)
    var iconBtn = document.createElement('button');
    iconBtn.className = 'rl-item-icon';
    iconBtn.setAttribute('aria-label', 'Cambiar tag');
    var iconEl = document.createElement('i');
    iconEl.className = item.icon || DEFAULT_ICON;
    if (item.tag_color) {
      iconEl.style.color = 'var(--note-' + item.tag_color + ')';
    }
    iconBtn.appendChild(iconEl);
    iconBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      cycleTagColor(item);
    });

    // Grip handle (hover)
    var grip = document.createElement('button');
    grip.className = 'rl-grip';
    grip.setAttribute('aria-label', 'Arrastrar para reordenar');
    grip.innerHTML = '<i class="fa-solid fa-grip-vertical"></i>';
    grip.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      startDrag(e, item, li);
    });

    // Link
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

    // Edit button (hover)
    var editBtn = document.createElement('button');
    editBtn.className = 'rl-edit';
    editBtn.setAttribute('aria-label', 'Editar');
    editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
    editBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openInlineEdit(item, li);
    });

    // Delete button (hover)
    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'rl-delete';
    deleteBtn.setAttribute('aria-label', 'Eliminar');
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    deleteBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      deleteItem(item.id);
    });

    li.appendChild(iconBtn);
    li.appendChild(grip);
    li.appendChild(link);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);

    return li;
  }

  // =============================================
  // INLINE EDIT
  // =============================================

  function openInlineEdit(item, li) {
    // Prevent double-editing
    if (li.querySelector('.rl-edit-form')) return;

    li.classList.add('rl-editing');

    var editForm = document.createElement('div');
    editForm.className = 'rl-edit-form';

    // Title input
    var titleEdit = document.createElement('input');
    titleEdit.type = 'text';
    titleEdit.className = 'rl-edit-input';
    titleEdit.value = item.title;
    titleEdit.maxLength = 120;
    titleEdit.placeholder = 'Descripcion...';

    // URL display (readonly)
    var urlEdit = document.createElement('input');
    urlEdit.type = 'url';
    urlEdit.className = 'rl-edit-input';
    urlEdit.value = item.url;
    urlEdit.readOnly = true;

    // Icon picker for edit
    var editIconPicker = document.createElement('div');
    editIconPicker.className = 'icon-picker rl-edit-icon-picker';

    // Action buttons
    var actions = document.createElement('div');
    actions.className = 'rl-edit-actions';

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'rl-edit-save';
    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    saveBtn.setAttribute('aria-label', 'Guardar');

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'rl-edit-cancel';
    cancelBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    cancelBtn.setAttribute('aria-label', 'Cancelar');

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    editForm.appendChild(titleEdit);
    editForm.appendChild(urlEdit);
    editForm.appendChild(editIconPicker);
    editForm.appendChild(actions);

    // Hide the link, show edit form
    var linkEl = li.querySelector('.read-later-link');
    var editBtnEl = li.querySelector('.rl-edit');
    if (linkEl) linkEl.style.display = 'none';
    if (editBtnEl) editBtnEl.style.display = 'none';

    li.appendChild(editForm);
    titleEdit.focus();
    titleEdit.select();

    // Build icon picker with current icon selected
    var currentIcon = item.icon || DEFAULT_ICON;
    buildIconPicker(editIconPicker, function (iconClass) {
      currentIcon = iconClass;
    }, currentIcon);

    // Cancel
    function cancelEdit() {
      if (linkEl) linkEl.style.display = '';
      if (editBtnEl) editBtnEl.style.display = '';
      if (editForm.parentNode) editForm.remove();
      li.classList.remove('rl-editing');
    }

    // Save
    async function saveEdit() {
      var newTitle = titleEdit.value.trim();
      if (!newTitle) {
        titleEdit.focus();
        return;
      }

      var client = getSupabase();
      if (client) {
        try {
          var result = await client
            .from('read_later_items')
            .update({ title: newTitle, icon: currentIcon })
            .eq('id', item.id);

          if (!result.error) {
            item.title = newTitle;
            item.icon = currentIcon;
          }
        } catch (e) {
          console.warn('MozzPCC: Error editando item:', e);
        }
      }

      cancelEdit();
      render();
    }

    cancelBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      cancelEdit();
    });
    saveBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      saveEdit();
    });
    titleEdit.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
      if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
      e.stopPropagation();
    });
    urlEdit.addEventListener('keydown', function (e) { e.stopPropagation(); });
  }

  // --- Cycle tag color ---
  async function cycleTagColor(item) {
    var current = item.tag_color;
    var nextIndex = current ? TAG_COLORS.indexOf(current) : -1;

    var nextColor = TAG_COLORS[(nextIndex + 1) % TAG_COLORS.length];
    if (nextIndex === TAG_COLORS.length - 1) {
      nextColor = null;
    }

    item.tag_color = nextColor;

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
          tag_color: selectedTagColor,
          icon: selectedIcon
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
        icon: selectedIcon,
        order_index: 0,
        created_at: result.data.created_at
      });

      await saveOrder();
      render();
      titleInput.value = '';
      urlInput.value = '';
      selectedIcon = DEFAULT_ICON;
      iconPreview.innerHTML = '<i class="' + DEFAULT_ICON + '"></i>';
      closeIconPicker();
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

    var itemEliminado = items.find(function (i) { return i.id === id; });
    var originalIndex = items.findIndex(function (i) { return i.id === id; });

    items = items.filter(function (i) { return i.id !== id; });
    await saveOrder();
    render();

    if (window.UndoToast) {
      window.UndoToast.show({
        message: 'Articulo eliminado',
        onUndo: function () {
          if (itemEliminado) {
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

  // --- Guardar orden ---
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
    selectedIcon = DEFAULT_ICON;
    activeFilter = null;
    initialized = false;
    list.innerHTML = '';
    filtersContainer.innerHTML = '';
    titleInput.value = '';
    urlInput.value = '';
    iconPreview.innerHTML = '<i class="' + DEFAULT_ICON + '"></i>';
    closeIconPicker();
    tagPicker.querySelectorAll('.rl-tag-dot').forEach(function (d) {
      d.classList.toggle('active', d.dataset.color === 'none');
    });
  }

  // --- Events ---
  addBtn.addEventListener('click', addItem);
  iconPreview.addEventListener('click', toggleIconPicker);

  titleInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      if (urlInput.value.trim()) addItem();
      else urlInput.focus();
    }
  });

  urlInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addItem();
  });

  // Close icon picker on outside click
  document.addEventListener('click', function (e) {
    if (iconPickerOpen && !iconPickerWrap.contains(e.target) && e.target !== iconPreview && !iconPreview.contains(e.target)) {
      closeIconPicker();
    }
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
