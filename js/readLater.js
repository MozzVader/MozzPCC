/**
 * readLater.js — Ver Mas Tarde
 * CRUD de links guardados con persistencia en Supabase
 * Drag & Drop para reordenar items (pointer events, funciona en mouse y touch)
 */

(function () {
  'use strict';

  var titleInput = document.getElementById('rl-title-input');
  var urlInput = document.getElementById('rl-url-input');
  var addBtn = document.getElementById('rl-add-btn');
  var list = document.getElementById('rl-list');
  var counter = document.getElementById('rl-counter');

  var items = [];
  var userId = null;

  // --- Drag & Drop state ---
  var dragItem = null;
  var dragElement = null;
  var placeholder = null;
  var startY = 0;
  var dragging = false;

  function getSupabase() {
    return window.supabaseClient || null;
  }

  // --- Cargar items (ordenados por order_index) ---
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
        return { id: r.id, title: r.title, url: r.url, order_index: r.order_index || 0, created_at: r.created_at };
      });

      render();
    } catch (e) {
      console.warn('MozzPCC: Error cargando read later:', e);
    }
  }

  // --- Render ---
  function render() {
    list.innerHTML = '';

    if (items.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'read-later-empty';
      empty.innerHTML = '<i class="fa-solid fa-bookmark"></i>No hay links guardados';
      list.appendChild(empty);
    } else {
      items.forEach(function (item, index) {
        list.appendChild(createItem(item, index));
      });
    }

    updateCounter();
  }

  function createItem(item, index) {
    var li = document.createElement('li');
    li.className = 'read-later-item';
    li.dataset.id = item.id;
    li.dataset.index = index;

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

    li.appendChild(grip);
    li.appendChild(link);
    li.appendChild(deleteBtn);

    return li;
  }

  function extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  }

  function updateCounter() {
    var span = counter.querySelector('span');
    if (span) span.textContent = items.length;
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
          order_index: 0
        })
        .select()
        .single();

      if (result.error) {
        console.warn('MozzPCC: Error agregando read later:', result.error);
        return;
      }

      // Insertar al principio y recalcular order_index
      items.unshift({
        id: result.data.id,
        title: result.data.title,
        url: result.data.url,
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

    items = items.filter(function (i) { return i.id !== id; });
    await saveOrder();
    render();

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

  // --- Guardar orden en Supabase ---
  async function saveOrder() {
    var client = getSupabase();
    if (!client || !userId) return;

    var updates = items.map(function (item, index) {
      return {
        id: item.id,
        order_index: index
      };
    });

    try {
      // Actualizar cada item con su nuevo order_index
      for (var i = 0; i < updates.length; i++) {
        await client
          .from('read_later_items')
          .update({ order_index: updates[i].order_index })
          .eq('id', updates[i].id);
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

    dragItem = item;
    dragElement = element;
    startY = e.clientY;

    // Crear placeholder invisible del mismo tamaño
    placeholder = document.createElement('li');
    placeholder.className = 'read-later-item';
    placeholder.style.visibility = 'hidden';
    placeholder.style.height = element.offsetHeight + 'px';
    placeholder.style.padding = '0';

    // Marcar el elemento original como dragging
    element.classList.add('dragging');

    // Insertar placeholder justo después del elemento
    element.parentNode.insertBefore(placeholder, element.nextSibling);

    // Capturar pointer para eventos fuera del elemento
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

    // Limpiar clases previas
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

    // Limpiar eventos
    dragElement.removeEventListener('pointermove', onDragMove);
    dragElement.removeEventListener('pointerup', onDragEnd);
    dragElement.removeEventListener('pointercancel', onDragEnd);

    clearDropIndicators();

    if (placeholder && placeholder.parentNode) {
      // Mover el elemento original donde está el placeholder
      placeholder.parentNode.insertBefore(dragElement, placeholder);
      placeholder.parentNode.removeChild(placeholder);
    }

    // Quitar clase dragging
    dragElement.classList.remove('dragging');

    // Calcular nuevo orden a partir del DOM
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

    // Reset state
    dragItem = null;
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
    list.innerHTML = '';
    titleInput.value = '';
    urlInput.value = '';
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
    loadItems();
  });

  window.addEventListener('auth:logout', function () {
    cleanup();
  });
})();
