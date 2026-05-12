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

  // --- Estado ---
  var tareas = [];
  var userId = null;
  var isInitialized = false;
  var currentTab = 'lista';
  var openDropdown = null; // reference to currently open dropdown

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
          sort_order: t.sort_order !== undefined ? t.sort_order : idx,
          created_at: t.created_at
        };
      });

      // If no sort_order values, assign sequential ones
      var needsSortUpdate = false;
      for (var i = 0; i < tareas.length; i++) {
        if (tareas[i].sort_order === undefined || tareas[i].sort_order === null) {
          tareas[i].sort_order = i;
          needsSortUpdate = true;
        }
      }
      if (needsSortUpdate && tareas.length > 0) {
        // Try to update sort orders in batch (fire and forget)
        try {
          for (var j = 0; j < tareas.length; j++) {
            client.from('tasks').update({ sort_order: j }).eq('id', tareas[j].id);
          }
        } catch(e) { /* ignore */ }
      }

      render();
    } catch (e) {
      console.warn('Error al cargar tareas:', e);
    }
  }

  /**
   * Renderiza según la tab activa
   */
  function render() {
    if (currentTab === 'lista') {
      renderLista();
    } else {
      renderKanban();
    }
    actualizarContador();
  }

  /**
   * Renderiza vista de lista
   */
  function renderLista() {
    taskList.innerHTML = '';

    if (tareas.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'task-empty';
      empty.innerHTML = '<i class="fa-regular fa-clipboard"></i>No hay tareas pendientes';
      taskList.appendChild(empty);
      return;
    }

    for (var i = 0; i < tareas.length; i++) {
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

      // Texto
      var texto = document.createElement('span');
      texto.className = 'task-text' + (tarea.status === 'completada' ? ' completada' : '') + (tarea.status === 'descartada' ? ' descartada' : '');
      texto.textContent = tarea.texto;
      texto.title = tarea.texto;

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

      // Reorder buttons
      var reorder = document.createElement('div');
      reorder.className = 'task-reorder';

      var upBtn = document.createElement('button');
      upBtn.className = 'task-reorder-btn';
      upBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
      upBtn.title = 'Subir';
      upBtn.disabled = (i === 0);
      upBtn.addEventListener('click', (function(t) {
        return function(e) { e.stopPropagation(); moveTask(t.id, -1); };
      })(tarea));

      var downBtn = document.createElement('button');
      downBtn.className = 'task-reorder-btn';
      downBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
      downBtn.title = 'Bajar';
      downBtn.disabled = (i === tareas.length - 1);
      downBtn.addEventListener('click', (function(t) {
        return function(e) { e.stopPropagation(); moveTask(t.id, 1); };
      })(tarea));

      reorder.appendChild(upBtn);
      reorder.appendChild(downBtn);

      // Delete button
      var btnEliminar = document.createElement('button');
      btnEliminar.className = 'task-delete';
      btnEliminar.setAttribute('aria-label', 'Eliminar tarea');
      btnEliminar.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
      btnEliminar.addEventListener('click', (function(t) {
        return function() { eliminarTarea(t.id); };
      })(tarea));

      li.appendChild(checkbox);
      li.appendChild(texto);
      li.appendChild(badgeWrap);
      li.appendChild(reorder);
      li.appendChild(btnEliminar);
      taskList.appendChild(li);
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
    return tareas.filter(function(t) { return statuses.indexOf(t.status) !== -1; });
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
        sort_order: data.sort_order !== undefined ? data.sort_order : 0,
        created_at: data.created_at
      });

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
   * Mueve una tarea arriba/abajo (reordenar)
   */
  async function moveTask(id, direction) {
    var client = getSupabase();
    var index = -1;
    for (var i = 0; i < tareas.length; i++) {
      if (tareas[i].id === id) { index = i; break; }
    }
    if (index === -1) return;

    var newIndex = index + direction;
    if (newIndex < 0 || newIndex >= tareas.length) return;

    // Swap local
    var temp = tareas[index];
    tareas[index] = tareas[newIndex];
    tareas[newIndex] = temp;

    // Swap sort_orders
    var tempOrder = tareas[index].sort_order;
    tareas[index].sort_order = tareas[newIndex].sort_order;
    tareas[newIndex].sort_order = tempOrder;

    render();

    // Persist sort_order changes
    if (client && userId) {
      try {
        await client.from('tasks').update({ sort_order: tareas[index].sort_order }).eq('id', tareas[index].id);
        await client.from('tasks').update({ sort_order: tareas[newIndex].sort_order }).eq('id', tareas[newIndex].id);
      } catch (e) {
        console.warn('Error al reordenar tarea:', e);
      }
    }
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
    render();

    if (window.UndoToast) {
      window.UndoToast.show({
        message: 'Tarea eliminada',
        onUndo: function () {
          if (tareaEliminada) {
            tareas.splice(tareaIndex, 0, tareaEliminada);
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
    if (taskList) taskList.innerHTML = '';
    if (taskKanban) taskKanban.innerHTML = '';
    if (taskInput) taskInput.value = '';
    if (taskCounter) taskCounter.innerHTML = '<span>0</span> / <span>0</span> completadas';
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
    }
    cargarTareas();
  });

  // Escuchar cierre de sesión
  window.addEventListener('auth:logout', function () {
    cleanup();
  });
})();
