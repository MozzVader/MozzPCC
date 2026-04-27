/**
 * tasks.js — Lista de tareas con persistencia en LocalStorage
 * Permite agregar, completar y eliminar tareas
 */

(function () {
  'use strict';

  // --- Constantes ---
  const STORAGE_KEY = 'mozzpcc_tareas';

  // --- Elementos del DOM ---
  const taskInput = document.getElementById('task-input');
  const taskAddBtn = document.getElementById('task-add-btn');
  const taskList = document.getElementById('task-list');
  const taskCounter = document.getElementById('task-counter');

  // --- Estado ---
  let tareas = cargarTareas();

  /**
   * Carga las tareas desde LocalStorage
   * @returns {Array} Lista de tareas
   */
  function cargarTareas() {
    try {
      const datos = localStorage.getItem(STORAGE_KEY);
      return datos ? JSON.parse(datos) : [];
    } catch (e) {
      console.warn('Error al cargar tareas:', e);
      return [];
    }
  }

  /**
   * Guarda las tareas en LocalStorage
   */
  function guardarTareas() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tareas));
    } catch (e) {
      console.warn('Error al guardar tareas:', e);
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
    checkbox.addEventListener('click', () => toggleTarea(tarea.id));
    checkbox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTarea(tarea.id);
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
  function agregarTarea() {
    const texto = taskInput.value.trim();
    if (!texto) return;

    const nuevaTarea = {
      id: Date.now().toString(),
      texto: texto,
      completada: false
    };

    tareas.unshift(nuevaTarea); // Agregar al inicio
    guardarTareas();
    renderizarTareas();
    taskInput.value = '';
    taskInput.focus();
  }

  /**
   * Alterna el estado de una tarea (completada/pendiente)
   * @param {string} id - ID de la tarea
   */
  function toggleTarea(id) {
    const tarea = tareas.find(t => t.id === id);
    if (tarea) {
      tarea.completada = !tarea.completada;
      guardarTareas();
      renderizarTareas();
    }
  }

  /**
   * Elimina una tarea
   * @param {string} id - ID de la tarea
   */
  function eliminarTarea(id) {
    tareas = tareas.filter(t => t.id !== id);
    guardarTareas();
    renderizarTareas();
  }

  // --- Eventos ---
  taskAddBtn.addEventListener('click', agregarTarea);

  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      agregarTarea();
    }
  });

  // --- Inicialización ---
  function init() {
    renderizarTareas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
