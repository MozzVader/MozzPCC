/**
 * tasks.js — Lista de tareas con persistencia en Supabase
 * Soporta multiples estados, vista Kanban y reordenamiento
 */

(function () {
  'use strict';

  // --- Statuses disponibles ---
  var STATUSES = [
    { id: 'pending',   nombre: 'Pendiente',     icon: 'fa-regular fa-circle',      color: '#94a3b8' },
    { id: 'analisis',  nombre: 'En análisis',   icon: 'fa-solid fa-magnifying-glass', color: '#22d3ee' },
    { id: 'progreso',  nombre: 'En progreso',   icon: 'fa-solid fa-code',          color: '#fbbf24' },
    { id: 'completada', nombre: 'Completada',    icon: 'fa-solid fa-check',         color: '#4ade80' },
    { id: 'descartada', nombre: 'Descartada',    icon: 'fa-solid fa-ban',           color: '#f87171' }
  ];

  // Kanban column mapping
  var KANBAN_COLUMNS = [
    { id: 'por-hacer',    nombre: 'Por hacer',    icon: 'fa-regular fa-circle',     statuses: ['pending', 'analisis'] },
    { id: 'en-progreso',  nombre: 'En progreso',  icon: 'fa-solid fa-spinner',      statuses: ['progreso'] },
    { id: 'hecho',        nombre: 'Hecho',         icon: 'fa-solid fa-check-double', statuses: ['completada', 'descartada'] }
  ];

  // --- Elementos del DOM ---
  var taskInput = document.getElementById('task-input');
  var taskAddBtn = document.getElementById('task-add-btn');
  var taskList = document.getElementById('task-list');
  var taskCounter = document.getElementById('task-counter');
  var taskKanban = document.getElementById('task-kanban');

  // --- Priorities ---
  var PRIORITIES = [
    { id: 'alta',  nombre: 'Alta',  color: '#f87171' },
    { id: 'media', nombre: 'Media', color: '#fbbf24' },
    { id: 'baja',  nombre: 'Baja',  color: '#4ade80' }
  ];

  // --- Estado ---
  var tareas = [];
  var userId = null;
  var isInitialized = false;
  var currentTab = 'lista';
  var openDropdown = null; // reference to currently open dropdown
  var STORAGE_KEY = 'mozzpcc_tasks_order';
  var activeFilter = 'all'; // filtro de prioridad
  var searchQuery = ''; // búsqueda de texto
  var editingTaskId = null; // ID de tarea en edición
  var openPriorityDropdown = null; // reference to priority dropdown

  // --- Drag & Drop state ---
  var dragElement = null;
  var placeholder = null;
  var isDragging = false;

  function getSupabase() {
    return window.supabaseClient || null;
  }

  function getStatusById(statusId) {
    for (var i = 0; i < STATUSES.length; i++) {
      if (STATUSES[i].id === statusId) return STATUSES[i];
    }
    return STATUSES[0]; // fallback: pending
  }

  /**
   * Cierra cualquier dropdown de status abierto
   */
  function closeAllDropdowns() {
    if (openDropdown) {
      if (openDropdown.parentNode) openDropdown.parentNode.removeChild(openDropdown);
      openDropdown = null;
    }
    closePriorityDropdown();
  }

  /**
   * Carga las tareas desde Supabase, ordenadas por sort_order
   */
  async function cargarTareas() {
    var client = getSupabase();
    if (!client || !userId) return;

    try {
      var { data, error } = await client
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        // If sort_order column doesn't exist yet, fallback to created_at
        if (error.message && error.message.indexOf('sort_order') !== -1) {
          var { data: fallbackData, error: fallbackError } = await client
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (fallbackError) {
            console.warn('Error al cargar tareas:', fallbackError);
            return;
          }
          data = fallbackData;
        } else {
          console.warn('Error al cargar tareas:', error);
          return;
        }
      }

      // Check if data has 'status' or 'completed' field (migration not run yet)
      tareas = (data || []).map(function(t, idx) {
        var status = t.status || 'pending';
        // If old schema with 'completed' boolean
        if (t.completed === true) status = 'completada';
        if (t.completed === false && !t.status) status = 'pending';
        
        return {
          id: t.id,
          texto: t.text,
          status: status,
          priority: t.priority || 'media',
          sort_order: t.sort_order !== undefined ? t.sort_order : idx,
          created_at: t.created_at
        };
      });

      // Apply custom order from localStorage
      applyCustomOrder();

      render();
    } catch (e) {
      console.warn('Error al cargar tareas:', e);
    }
  }

  /**
   * Renderiza según la tab activa
   */
  function render() {
    hideSkeleton('skel-tasks-list');
    hideSkeleton('skel-tasks-kanban');
    if (currentTab === 'lista') {
      renderLista();
    } else {
      renderKanban();
    }
    actualizarContador();
  }

  /**
   * Filtra tareas según filtro activo y búsqueda
   */
  function getFilteredTasks() {
    var filtered = tareas;
    // Filtro por prioridad
    if (activeFilter !== 'all') {
      filtered = filtered.filter(function(t) { return t.priority === activeFilter; });
    }
    // Filtro por búsqueda
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      filtered = filtered.filter(function(t) { return t.texto.toLowerCase().indexOf(q) !== -1; });
    }
    return filtered;
  }

  function renderLista() {
    taskList.innerHTML = '';

    var filtered = getFilteredTasks();

    if (filtered.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'task-empty';
      if (tareas.length > 0 && (activeFilter !== 'all' || searchQuery)) {
        empty.innerHTML = '<i class="fa-solid fa-filter"></i>No hay tareas con este filtro';
      } else {
        empty.innerHTML = '<i class="fa-regular fa-clipboard"></i>No hay tareas pendientes';
      }
      taskList.appendChild(empty);
      return;
    }

    for (var i = 0; i < filtered.length; i++) {
      var tarea = tareas[i];
      var status = getStatusById(tarea.status);
      var isCompleted = tarea.status === 'completada' || tarea.status === 'descartada';

      var li = document.createElement('li');
      li.className = 'task-item';
      li.dataset.id = tarea.id;

      // Checkbox (clic cycles: pending -> completada -> pending)
      var checkbox = document.createElement('div');
      checkbox.className = 'task-checkbox' + (isCompleted ? ' checked' : '');
      checkbox.setAttribute('role', 'checkbox');
      checkbox.setAttribute('aria-checked', isCompleted);
      checkbox.setAttribute('tabindex', '0');
      checkbox.innerHTML = isCompleted ? '<i class="fa-solid fa-check"></i>' : '';
      checkbox.addEventListener('click', (function(t) {
        return function() { toggleCompletada(t.id); };
      })(tarea));
      checkbox.addEventListener('keydown', (function(t) {
        return function(e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCompletada(t.id); }
        };
      })(tarea));

      // Priority dot (clic cambia prioridad)
      var priorityDot = document.createElement('span');
      priorityDot.className = 'task-priority-dot ' + tarea.priority;
      priorityDot.title = 'Prioridad: ' + (tarea.priority.charAt(0).toUpperCase() + tarea.priority.slice(1));
      priorityDot.addEventListener('click', (function(t) {
        return function(e) { e.stopPropagation(); togglePriorityDropdown(e, t.id); };
      })(tarea));

      // Texto (o input de edición)
      var texto;
      if (editingTaskId === tarea.id) {
        texto = document.createElement('input');
        texto.className = 'task-text-editing';
        texto.value = tarea.texto;
        texto.setAttribute('aria-label', 'Editar tarea');
        texto.addEventListener('keydown', (function(t) {
          return function(e) {
            if (e.key === 'Enter') { e.preventDefault(); finishEdit(t.id, texto.value); }
            if (e.key === 'Escape') { editingTaskId = null; render(); }
          };
        })(tarea));
        texto.addEventListener('blur', (function(t) {
          return function() { finishEdit(t.id, texto.value); };
        })(tarea));
      } else {
        texto = document.createElement('span');
        texto.className = 'task-text' + (tarea.status === 'completada' ? ' completada' : '') + (tarea.status === 'descartada' ? ' descartada' : '');
        texto.textContent = tarea.texto;
        texto.title = tarea.texto;
        // Double click para editar
        texto.addEventListener('dblclick', (function(t) {
          return function(e) { e.stopPropagation(); startEditTask(t.id); };
        })(tarea));
      }

      // Status badge (clic abre dropdown)
      var badgeWrap = document.createElement('div');
      badgeWrap.style.position = 'relative';
      badgeWrap.style.flexShrink = '0';

      var badge = document.createElement('span');
      badge.className = 'task-status-badge status-' + tarea.status;
      badge.innerHTML = '<i class="' + status.icon + '"></i> ' + status.nombre;
      badge.addEventListener('click', (function(t) {
        return function(e) { e.stopPropagation(); toggleStatusDropdown(e, t.id); };
      })(tarea));

      badgeWrap.appendChild(badge);

      // Edit button
      var btnEdit = document.createElement('button');
      btnEdit.className = 'task-edit-btn';
      btnEdit.setAttribute('aria-label', 'Editar tarea');
      btnEdit.innerHTML = '<i class="fa-solid fa-pen"></i>';
      btnEdit.addEventListener('click', (function(t) {
        return function(e) { e.stopPropagation(); startEditTask(t.id); };
      })(tarea));

      // Grip handle for drag & drop
      var grip = document.createElement('button');
      grip.className = 'task-grip';
      grip.setAttribute('aria-label', 'Arrastrar para reordenar');
      grip.innerHTML = '<i class="fa-solid fa-grip-vertical"></i>';
      grip.addEventListener('pointerdown', (function(t, el) {
        return function (e) {
          e.preventDefault();
          startDrag(e, t, el);
        };
      })(tarea, li));

      // Delete button
      var btnEliminar = document.createElement('button');
      btnEliminar.className = 'task-delete';
      btnEliminar.setAttribute('aria-label', 'Eliminar tarea');
      btnEliminar.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
      btnEliminar.addEventListener('click', (function(t) {
        return function() { eliminarTarea(t.id); };
      })(tarea));

      li.appendChild(grip);
      li.appendChild(btnEdit);
      li.appendChild(checkbox);
      li.appendChild(priorityDot);
      li.appendChild(texto);
      li.appendChild(badgeWrap);
      li.appendChild(btnEliminar);
      taskList.appendChild(li);
    }

    // Focus input de edición si existe
    if (editingTaskId) {
      var editInput = taskList.querySelector('.task-text-editing');
      if (editInput) {
        editInput.focus();
        editInput.setSelectionRange(editInput.value.length, editInput.value.length);
      }
    }
  }

  /**
   * Toggle status dropdown for a task
   */
  function toggleStatusDropdown(event, taskId) {
    closeAllDropdowns();

    var tarea = tareas.find(function(t) { return t.id === taskId; });
    if (!tarea) return;

    var dropdown = document.createElement('div');
    dropdown.className = 'task-status-dropdown';

    for (var i = 0; i < STATUSES.length; i++) {
      var s = STATUSES[i];
      var option = document.createElement('button');
      option.className = 'task-status-option' + (tarea.status === s.id ? ' active-status' : '');
      option.innerHTML = '<i class="' + s.icon + '" style="color:' + s.color + '"></i> ' + s.nombre;
      option.addEventListener('click', (function(taskId, statusId) {
        return function(e) {
          e.stopPropagation();
          closeAllDropdowns();
          cambiarStatus(taskId, statusId);
        };
      })(taskId, s.id));
      dropdown.appendChild(option);
    }

    // Position near the badge
    var rect = event.currentTarget.getBoundingClientRect();
    var card = document.querySelector('.widget-tasks');
    var cardRect = card ? card.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth };

    dropdown.style.position = 'fixed';
    dropdown.style.top = (rect.bottom + 4) + 'px';
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';

    document.body.appendChild(dropdown);
    openDropdown = dropdown;

    // Close on click outside
    setTimeout(function() {
      document.addEventListener('click', closeAllDropdowns, { once: true });
    }, 0);
  }

  /**
   * Renderiza vista Kanban
   */
  function renderKanban() {
    taskKanban.innerHTML = '';

    for (var c = 0; c < KANBAN_COLUMNS.length; c++) {
      var col = KANBAN_COLUMNS[c];
      var columnEl = document.createElement('div');
      columnEl.className = 'kanban-column ' + col.id;

      // Header
      var header = document.createElement('div');
      header.className = 'kanban-column-header';
      header.innerHTML = '<i class="' + col.icon + '"></i> ' + col.nombre + ' <span class="kanban-count">(' + getTasksForColumn(col.statuses).length + ')</span>';
      columnEl.appendChild(header);

      // List
      var ul = document.createElement('ul');
      ul.className = 'kanban-list';

      var columnTasks = getTasksForColumn(col.statuses);
      if (columnTasks.length === 0) {
        var emptyCard = document.createElement('li');
        emptyCard.className = 'kanban-empty';
        emptyCard.textContent = 'Sin tareas';
        ul.appendChild(emptyCard);
      } else {
        for (var t = 0; t < columnTasks.length; t++) {
          var tarea = columnTasks[t];
          var status = getStatusById(tarea.status);

          var card = document.createElement('li');
          card.className = 'kanban-card';
          card.dataset.id = tarea.id;

          var cardText = document.createElement('div');
          cardText.className = 'kanban-card-text' + (tarea.status === 'completada' ? ' completada' : '') + (tarea.status === 'descartada' ? ' descartada' : '');
          cardText.textContent = tarea.texto;
          cardText.title = tarea.texto;

          var footer = document.createElement('div');
          footer.className = 'kanban-card-footer';

          var statusBadge = document.createElement('span');
          statusBadge.className = 'kanban-card-status status-' + tarea.status;
          statusBadge.textContent = status.nombre;

          // Priority dot
          var prioDot = document.createElement('span');
          prioDot.className = 'task-priority-dot ' + tarea.priority;
          prioDot.title = tarea.priority.charAt(0).toUpperCase() + tarea.priority.slice(1);
          prioDot.addEventListener('click', (function(t) {
            return function(e) { e.stopPropagation(); togglePriorityDropdown(e, t.id); };
          })(tarea));

          // Edit button
          var editBtn = document.createElement('button');
          editBtn.className = 'kanban-card-edit';
          editBtn.title = 'Editar';
          editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
          editBtn.addEventListener('click', (function(taskId) {
            return function(e) { e.stopPropagation(); startEditTask(taskId); };
          })(tarea.id));

          // Delete button
          var deleteBtn = document.createElement('button');
          deleteBtn.className = 'kanban-card-delete';
          deleteBtn.title = 'Eliminar';
          deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
          deleteBtn.style.opacity = '0';
          deleteBtn.addEventListener('click', (function(taskId) {
            return function(e) { e.stopPropagation(); eliminarTarea(taskId); };
          })(tarea.id));

          // Click card to advance status
          card.addEventListener('click', (function(taskId, currentStatus) {
            return function() { advanceTaskStatus(taskId, currentStatus); };
          })(tarea.id, tarea.status));

          footer.appendChild(statusBadge);
          footer.appendChild(prioDot);
          footer.appendChild(editBtn);
          footer.appendChild(deleteBtn);
          card.appendChild(cardText);
          card.appendChild(footer);
          ul.appendChild(card);
        }
      }

      columnEl.appendChild(ul);
      taskKanban.appendChild(columnEl);
    }
  }

  function getTasksForColumn(statuses) {
    return getFilteredTasks().filter(function(t) { return statuses.indexOf(t.status) !== -1; });
  }

  /**
   * Advance task to next logical status (for kanban click)
   */
  function advanceTaskStatus(taskId, currentStatus) {
    var nextMap = {
      'pending': 'analisis',
      'analisis': 'progreso',
      'progreso': 'completada',
      'completada': 'pending',
      'descartada': 'pending'
    };
    var next = nextMap[currentStatus] || 'pending';
    cambiarStatus(taskId, next);
  }

  /**
   * Toggle between pending and completada (checkbox click)
   */
  function toggleCompletada(id) {
    var tarea = tareas.find(function(t) { return t.id === id; });
    if (!tarea) return;
    var newStatus = (tarea.status === 'completada') ? 'pending' : 'completada';
    cambiarStatus(id, newStatus);
  }

  /**
   * Cambia el status de una tarea
   */
  async function cambiarStatus(id, newStatus) {
    var client = getSupabase();
    if (!client || !userId) return;

    // Optimistic update
    var tarea = tareas.find(function(t) { return t.id === id; });
    if (tarea) {
      tarea.status = newStatus;
      render();
    }

    try {
      var { error } = await client
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        console.warn('Error al actualizar tarea:', error);
        if (tarea) render(); // will re-render with old data after reload
      } else {
        window.dispatchEvent(new CustomEvent('sync:success'));
      }
    } catch (e) {
      console.warn('Error al actualizar tarea:', e);
    }
  }

  /**
   * Actualiza el contador
   */
  function actualizarContador() {
    var total = tareas.length;
    var completadas = tareas.filter(function(t) { return t.status === 'completada'; }).length;
    if (taskCounter) {
      taskCounter.innerHTML = '<span>' + completadas + '</span> / <span>' + total + '</span> completadas';
    }
  }

  /**
   * Agrega una nueva tarea
   */
  async function agregarTarea() {
    var client = getSupabase();
    if (!client || !userId) return;

    var texto = taskInput.value.trim();
    if (!texto) return;

    taskAddBtn.disabled = true;
    taskAddBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      // Get max sort_order
      var maxSort = 0;
      for (var i = 0; i < tareas.length; i++) {
        if (tareas[i].sort_order > maxSort) maxSort = tareas[i].sort_order;
      }

      var insertData = {
        user_id: userId,
        text: texto,
        status: 'pending',
        priority: 'media',
        sort_order: maxSort + 1
      };

      var { data, error } = await client
        .from('tasks')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        // If status column doesn't exist, try with completed
        if (error.message && (error.message.indexOf('status') !== -1)) {
          delete insertData.status;
          delete insertData.sort_order;
          insertData.completed = false;
          var fallback = await client.from('tasks').insert(insertData).select().single();
          if (fallback.error) {
            console.warn('Error al agregar tarea:', fallback.error);
            return;
          }
          data = fallback.data;
        } else {
          console.warn('Error al agregar tarea:', error);
          return;
        }
      }

      window.dispatchEvent(new CustomEvent('sync:success'));

      tareas.unshift({
        id: data.id,
        texto: data.text,
        status: data.status || 'pending',
        priority: data.priority || 'media',
        sort_order: data.sort_order !== undefined ? data.sort_order : 0,
        created_at: data.created_at
      });

      saveCustomOrder();
      render();
      taskInput.value = '';
      taskInput.focus();
    } catch (e) {
      console.warn('Error al agregar tarea:', e);
    } finally {
      taskAddBtn.disabled = false;
      taskAddBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Agregar';
    }
  }

  /**
   * Obtiene el orden personalizado desde localStorage
   * @returns {string[]|null} Array de task IDs en orden, o null
   */
  function getCustomOrder() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
  }

  /**
   * Guarda el orden actual de las tareas en localStorage
   */
  function saveCustomOrder() {
    var ids = [];
    for (var i = 0; i < tareas.length; i++) {
      ids.push(tareas[i].id);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (e) { /* ignore */ }
  }

  /**
   * Reordena el array tareas según localStorage.
   * Tareas que no estén en localStorage se mantienen al final.
   */
  function applyCustomOrder() {
    var order = getCustomOrder();
    if (!order || !order.length) return;

    // Build a map for fast lookup
    var taskMap = {};
    for (var i = 0; i < tareas.length; i++) {
      taskMap[tareas[i].id] = tareas[i];
    }

    // Reorder: follow localStorage order, append unknowns at end
    var reordered = [];
    var seen = {};
    for (var j = 0; j < order.length; j++) {
      if (taskMap[order[j]] && !seen[order[j]]) {
        reordered.push(taskMap[order[j]]);
        seen[order[j]] = true;
      }
    }
    // Append tasks not in localStorage (newly created, etc.)
    for (var k = 0; k < tareas.length; k++) {
      if (!seen[tareas[k].id]) {
        reordered.push(tareas[k]);
      }
    }

    tareas = reordered;
  }

  // =============================================
  // DRAG & DROP (Pointer Events) — adapted from readLater
  // =============================================

  function startDrag(e, item, element) {
    if (isDragging) return;
    isDragging = true;

    dragElement = element;

    element.classList.add('dragging');

    placeholder = document.createElement('li');
    placeholder.className = 'task-item';
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
    if (!isDragging || !dragElement) return;

    var listItems = taskList.querySelectorAll('.task-item:not(.dragging):not([style*="visibility: hidden"])');
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
        taskList.insertBefore(placeholder, closestItem);
      } else {
        closestItem.classList.add('drop-after');
        var nextSibling = closestItem.nextSibling;
        if (nextSibling) {
          taskList.insertBefore(placeholder, nextSibling);
        } else {
          taskList.appendChild(placeholder);
        }
      }
    }
  }

  function onDragEnd(e) {
    if (!isDragging || !dragElement) return;

    dragElement.removeEventListener('pointermove', onDragMove);
    dragElement.removeEventListener('pointerup', onDragEnd);
    dragElement.removeEventListener('pointercancel', onDragEnd);

    clearDropIndicators();

    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(dragElement, placeholder);
      placeholder.parentNode.removeChild(placeholder);
    }

    dragElement.classList.remove('dragging');

    // Reorder tareas array from DOM order
    var newOrder = [];
    var listElements = taskList.querySelectorAll('.task-item[data-id]');
    listElements.forEach(function (el) {
      var id = el.dataset.id;
      var item = tareas.find(function (t) { return t.id === id; });
      if (item) newOrder.push(item);
    });

    if (newOrder.length === tareas.length) {
      tareas = newOrder;
      saveCustomOrder();
    }

    dragElement = null;
    placeholder = null;
    isDragging = false;
  }

  function clearDropIndicators() {
    var indicators = taskList.querySelectorAll('.drop-before, .drop-after');
    indicators.forEach(function (el) {
      el.classList.remove('drop-before');
      el.classList.remove('drop-after');
    });
  }

  /**
   * Elimina una tarea (con undo toast)
   */
  async function eliminarTarea(id) {
    var client = getSupabase();
    if (!client || !userId) return;

    var tareaEliminada = null;
    var tareaIndex = -1;
    for (var i = 0; i < tareas.length; i++) {
      if (tareas[i].id === id) {
        tareaEliminada = tareas[i];
        tareaIndex = i;
        break;
      }
    }

    // Optimistic update
    tareas.splice(tareaIndex, 1);
    saveCustomOrder();
    render();

    if (window.UndoToast) {
      window.UndoToast.show({
        message: 'Tarea eliminada',
        onUndo: function () {
          if (tareaEliminada) {
            tareas.splice(tareaIndex, 0, tareaEliminada);
            saveCustomOrder();
            render();
          }
        },
        onConfirm: function () {
          client.from('tasks').delete().eq('id', id)
            .then(function (result) {
              if (result.error) {
                console.warn('Error al eliminar tarea:', result.error);
                cargarTareas();
              } else {
                window.dispatchEvent(new CustomEvent('sync:success'));
              }
            })
            .catch(function (e) {
              console.warn('Error al eliminar tarea:', e);
              cargarTareas();
            });
        }
      });
    } else {
      try {
        var { error } = await client.from('tasks').delete().eq('id', id);
        if (error) {
          console.warn('Error al eliminar tarea:', error);
          cargarTareas();
        } else {
          window.dispatchEvent(new CustomEvent('sync:success'));
        }
      } catch (e) {
        console.warn('Error al eliminar tarea:', e);
        cargarTareas();
      }
    }
  }

  /**
   * Limpia el estado (al cerrar sesión)
   */
  function cleanup() {
    tareas = [];
    userId = null;
    currentTab = 'lista';
    activeFilter = 'all';
    searchQuery = '';
    editingTaskId = null;
    if (taskList) taskList.innerHTML = '';
    if (taskKanban) taskKanban.innerHTML = '';
    if (taskInput) taskInput.value = '';
    if (taskCounter) taskCounter.innerHTML = '<span>0</span> / <span>0</span> completadas';
    var searchEl = document.getElementById('task-search');
    if (searchEl) searchEl.value = '';
  }

  // --- Priority dropdown ---
  function closePriorityDropdown() {
    if (openPriorityDropdown) {
      if (openPriorityDropdown.parentNode) openPriorityDropdown.parentNode.removeChild(openPriorityDropdown);
      openPriorityDropdown = null;
    }
  }

  function togglePriorityDropdown(event, taskId) {
    closePriorityDropdown();
    closeAllDropdowns();

    var tarea = tareas.find(function(t) { return t.id === taskId; });
    if (!tarea) return;

    var dropdown = document.createElement('div');
    dropdown.className = 'task-status-dropdown';

    for (var i = 0; i < PRIORITIES.length; i++) {
      var p = PRIORITIES[i];
      var option = document.createElement('button');
      option.className = 'task-priority-option' + (tarea.priority === p.id ? ' active-priority' : '');
      option.innerHTML = '<span class="task-priority-dot ' + p.id + '" style="width:10px;height:10px"></span> ' + p.nombre;
      option.addEventListener('click', (function(taskId, priorityId) {
        return function(e) {
          e.stopPropagation();
          closePriorityDropdown();
          cambiarPrioridad(taskId, priorityId);
        };
      })(taskId, p.id));
      dropdown.appendChild(option);
    }

    var rect = event.currentTarget.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = (rect.bottom + 4) + 'px';
    dropdown.style.left = rect.left + 'px';

    document.body.appendChild(dropdown);
    openPriorityDropdown = dropdown;

    setTimeout(function() {
      document.addEventListener('click', closePriorityDropdown, { once: true });
    }, 0);
  }

  async function cambiarPrioridad(id, newPriority) {
    var client = getSupabase();
    if (!client || !userId) return;

    var tarea = tareas.find(function(t) { return t.id === id; });
    if (tarea) {
      tarea.priority = newPriority;
      render();
    }

    try {
      var { error } = await client
        .from('tasks')
        .update({ priority: newPriority })
        .eq('id', id);

      if (error) {
        console.warn('Error al cambiar prioridad:', error);
      } else {
        window.dispatchEvent(new CustomEvent('sync:success'));
      }
    } catch (e) {
      console.warn('Error al cambiar prioridad:', e);
    }
  }

  // --- Edit task inline ---
  function startEditTask(taskId) {
    if (editingTaskId) return;
    editingTaskId = taskId;
    render(); // re-render para mostrar el input de edición
  }

  function finishEdit(taskId, newText) {
    editingTaskId = null;
    var trimmed = newText.trim();
    if (!trimmed) { render(); return; }

    var tarea = tareas.find(function(t) { return t.id === taskId; });
    if (!tarea || tarea.texto === trimmed) { render(); return; }

    editarTarea(taskId, trimmed);
  }

  async function editarTarea(id, newText) {
    var client = getSupabase();
    if (!client || !userId) return;

    // Optimistic update
    var tarea = tareas.find(function(t) { return t.id === id; });
    if (tarea) {
      tarea.texto = newText;
      render();
    }

    try {
      var { error } = await client
        .from('tasks')
        .update({ text: newText })
        .eq('id', id);

      if (error) {
        console.warn('Error al editar tarea:', error);
      } else {
        window.dispatchEvent(new CustomEvent('sync:success'));
      }
    } catch (e) {
      console.warn('Error al editar tarea:', e);
    }
  }

  // --- Filter chips & search ---
  function initFilters() {
    var filtersEl = document.getElementById('task-filters');
    if (!filtersEl) return;

    filtersEl.addEventListener('click', function(e) {
      var chip = e.target.closest('.task-filter-chip');
      if (!chip) return;

      var filter = chip.dataset.filter;
      activeFilter = filter;

      filtersEl.querySelectorAll('.task-filter-chip').forEach(function(c) {
        c.classList.toggle('active', c.dataset.filter === filter);
      });

      render();
    });
  }

  function initSearch() {
    var searchEl = document.getElementById('task-search');
    if (!searchEl) return;

    var debounceTimer = null;
    searchEl.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        searchQuery = searchEl.value.trim();
        render();
      }, 250);
    });
  }

  // --- Tab switching ---
  function initTabs() {
    var tabs = document.querySelectorAll('.task-tab');
    var contents = document.querySelectorAll('.task-tab-content');

    tabs.forEach(function(tab) {
      tab.addEventListener('click', function () {
        var tabId = tab.dataset.tab;
        currentTab = tabId;

        tabs.forEach(function(t) { t.classList.remove('active'); });
        contents.forEach(function(c) { c.classList.remove('active'); });

        tab.classList.add('active');
        var targetContent = document.getElementById('task-tab-' + tabId);
        if (targetContent) targetContent.classList.add('active');

        render();
      });
    });
  }

  // --- Eventos ---
  taskAddBtn.addEventListener('click', agregarTarea);
  taskInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') agregarTarea();
  });

  // Close dropdowns on scroll
  var taskContent = document.querySelector('.task-content');
  if (taskContent) {
    taskContent.addEventListener('scroll', closeAllDropdowns);
  }

  // Escuchar evento de autenticación lista
  window.addEventListener('auth:ready', function (e) {
    userId = e.detail.userId;
    if (!isInitialized) {
      isInitialized = true;
      initTabs();
      initFilters();
      initSearch();
    }
    cargarTareas();
  });

  // Escuchar cierre de sesión
  window.addEventListener('auth:logout', function () {
    cleanup();
  });
})();
