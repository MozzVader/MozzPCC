/**
 * tasks.js — Lista de tareas con persistencia en Supabase
 * Se inicializa cuando se recibe el evento 'auth:ready'
 * Permite agregar, completar y eliminar tareas
 */

(function () {
  'use strict';

  // --- Elementos del DOM ---
  const taskInput = document.getElementById('task-input');
  const taskAddBtn = document.getElementById('task-add-btn');
  const taskList = document.getElementById('task-list');
  const taskCounter = document.getElementById('task-counter');

  // --- Estado ---
  let tareas = [];
  let userId = null;
  let isInitialized = false;

  /**
   * Obtiene el cliente Supabase
   * @returns {Object|null}
   */
  function getSupabase() {
    return window.supabaseClient || null;
  }

  /**
   * Carga las tareas desde Supabase
   */
  async function cargarTareas() {
    const client = getSupabase();
    if (!client || !userId) return;

    try {
      const { data, error } = await client
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error al cargar tareas:', error);
        return;
      }

      // Mapear datos de Supabase al formato local
      tareas = (data || []).map(t => ({
        id: t.id,
        texto: t.text,
        completada: t.completed,
        created_at: t.created_at
      }));

      renderizarTareas();
    } catch (e) {
      console.warn('Error al cargar tareas:', e);
    }
  }

  /**
   * Crea el HTML para un elemento de tarea
   * @param {Object} tarea - Objeto tarea { id, texto, completada }
   * @returns {HTMLLIElement} Elemento de lista
   */
  function crearElementoTarea(tarea) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = tarea.id;

    // Checkbox
    const checkbox = document.createElement('div');
    checkbox.className = `task-checkbox${tarea.completada ? ' checked' : ''}`;
    checkbox.setAttribute('role', 'checkbox');
    checkbox.setAttribute('aria-checked', tarea.completada);
    checkbox.setAttribute('tabindex', '0');
    checkbox.innerHTML = tarea.completada ? '<i class="fa-solid fa-check"></i>' : '';
    checkbox.addEventListener('click', () => toggleTarea(tarea.id, !tarea.completada));
    checkbox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTarea(tarea.id, !tarea.completada);
      }
    });

    // Texto
    const texto = document.createElement('span');
    texto.className = `task-text${tarea.completada ? ' completed' : ''}`;
    texto.textContent = tarea.texto;

    // Botón eliminar
    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'task-delete';
    btnEliminar.setAttribute('aria-label', 'Eliminar tarea');
    btnEliminar.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    btnEliminar.addEventListener('click', () => eliminarTarea(tarea.id));

    li.appendChild(checkbox);
    li.appendChild(texto);
    li.appendChild(btnEliminar);

    return li;
  }

  /**
   * Renderiza todas las tareas en la lista
   */
  function renderizarTareas() {
    taskList.innerHTML = '';

    if (tareas.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'task-empty';
      empty.innerHTML = '<i class="fa-regular fa-clipboard"></i>No hay tareas pendientes';
      taskList.appendChild(empty);
    } else {
      tareas.forEach(tarea => {
        taskList.appendChild(crearElementoTarea(tarea));
      });
    }

    actualizarContador();
  }

  /**
   * Actualiza el contador de tareas completadas
   */
  function actualizarContador() {
    const total = tareas.length;
    const completadas = tareas.filter(t => t.completada).length;
    const spans = taskCounter.querySelectorAll('span');
    if (spans.length >= 2) {
      spans[0].textContent = completadas;
      spans[1].textContent = total;
    }
  }

  /**
   * Agrega una nueva tarea
   */
  async function agregarTarea() {
    const client = getSupabase();
    if (!client || !userId) return;

    const texto = taskInput.value.trim();
    if (!texto) return;

    // Deshabilitar botón mientras se agrega
    taskAddBtn.disabled = true;
    taskAddBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      const { data, error } = await client
        .from('tasks')
        .insert({
          user_id: userId,
          text: texto,
          completed: false
        })
        .select()
        .single();

      if (error) {
        console.warn('Error al agregar tarea:', error);
        return;
      }

      window.dispatchEvent(new CustomEvent('sync:success'));

      // Agregar al inicio de la lista local
      tareas.unshift({
        id: data.id,
        texto: data.text,
        completada: data.completed,
        created_at: data.created_at
      });

      renderizarTareas();
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
   * Alterna el estado de una tarea (completada/pendiente)
   * @param {string} id - ID de la tarea
   * @param {boolean} newStatus - Nuevo estado
   */
  async function toggleTarea(id, newStatus) {
    const client = getSupabase();
    if (!client || !userId) return;

    // Optimistic update en la UI
    const tarea = tareas.find(t => t.id === id);
    if (tarea) {
      tarea.completada = newStatus;
      renderizarTareas();
    }

    try {
      const { error } = await client
        .from('tasks')
        .update({ completed: newStatus })
        .eq('id', id);

      if (error) {
        console.warn('Error al actualizar tarea:', error);
        // Revertir en caso de error
        if (tarea) {
          tarea.completada = !newStatus;
          renderizarTareas();
        }
      } else {
        window.dispatchEvent(new CustomEvent('sync:success'));
      }
    } catch (e) {
      console.warn('Error al actualizar tarea:', e);
    }
  }

  /**
   * Elimina una tarea
   * @param {string} id - ID de la tarea
   */
  async function eliminarTarea(id) {
    const client = getSupabase();
    if (!client || !userId) return;

    // Optimistic update en la UI
    tareas = tareas.filter(t => t.id !== id);
    renderizarTareas();

    try {
      const { error } = await client
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Error al eliminar tarea:', error);
        // Recargar tareas para restaurar el estado correcto
        cargarTareas();
      } else {
        window.dispatchEvent(new CustomEvent('sync:success'));
      }
    } catch (e) {
      console.warn('Error al eliminar tarea:', e);
      cargarTareas();
    }
  }

  /**
   * Limpia el estado (al cerrar sesión)
   */
  function cleanup() {
    tareas = [];
    userId = null;
    taskList.innerHTML = '';
    taskInput.value = '';
    const spans = taskCounter.querySelectorAll('span');
    if (spans.length >= 2) {
      spans[0].textContent = '0';
      spans[1].textContent = '0';
    }
  }

  // --- Eventos ---
  taskAddBtn.addEventListener('click', agregarTarea);

  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      agregarTarea();
    }
  });

  // Escuchar evento de autenticación lista
  window.addEventListener('auth:ready', (e) => {
    userId = e.detail.userId;
    if (!isInitialized) {
      isInitialized = true;
    }
    cargarTareas();
  });

  // Escuchar cierre de sesión
  window.addEventListener('auth:logout', () => {
    cleanup();
  });
})();
