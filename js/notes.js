/**
 * notes.js — Notas rápidas con persistencia en LocalStorage
 * Soporte para múltiples notas con colores editables
 */

(function () {
  'use strict';

  // --- Constantes ---
  const STORAGE_KEY = 'mozzpcc_notas';

  // Colores disponibles para las notas
  const COLORES = [
    { nombre: 'yellow', valor: '#fbbf24' },
    { nombre: 'green', valor: '#34d399' },
    { nombre: 'pink', valor: '#f472b6' },
    { nombre: 'blue', valor: '#60a5fa' },
    { nombre: 'purple', valor: '#a78bfa' }
  ];

  // --- Elementos del DOM ---
  const notesGrid = document.getElementById('notes-grid');
  const newNoteBtn = document.getElementById('new-note-btn');

  // --- Estado ---
  let notas = cargarNotas();

  /**
   * Carga las notas desde LocalStorage
   * @returns {Array} Lista de notas
   */
  function cargarNotas() {
    try {
      const datos = localStorage.getItem(STORAGE_KEY);
      return datos ? JSON.parse(datos) : [];
    } catch (e) {
      console.warn('Error al cargar notas:', e);
      return [];
    }
  }

  /**
   * Guarda las notas en LocalStorage
   */
  function guardarNotas() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notas));
    } catch (e) {
      console.warn('Error al guardar notas:', e);
    }
  }

  /**
   * Crea el HTML para una nota individual
   * @param {Object} nota - Objeto nota { id, titulo, contenido, color }
   * @returns {HTMLDivElement} Elemento de nota
   */
  function crearElementoNota(nota) {
    const div = document.createElement('div');
    div.className = 'note';
    div.dataset.id = nota.id;

    const colorObj = COLORES.find(c => c.nombre === nota.color) || COLORES[0];

    // Barra de color superior
    const colorBar = document.createElement('div');
    colorBar.className = 'note-color-bar';
    colorBar.style.background = colorObj.valor;

    // Encabezado con título y acciones
    const header = document.createElement('div');
    header.className = 'note-header';

    const titulo = document.createElement('input');
    titulo.className = 'note-title';
    titulo.type = 'text';
    titulo.value = nota.titulo || 'Sin título';
    titulo.placeholder = 'Título...';
    titulo.addEventListener('input', () => {
      nota.titulo = titulo.value;
      guardarNotas();
    });

    const acciones = document.createElement('div');
    acciones.className = 'note-actions';

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'note-btn delete';
    btnEliminar.setAttribute('aria-label', 'Eliminar nota');
    btnEliminar.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    btnEliminar.addEventListener('click', () => eliminarNota(nota.id));

    acciones.appendChild(btnEliminar);
    header.appendChild(titulo);
    header.appendChild(acciones);

    // Contenido editable
    const contenido = document.createElement('div');
    contenido.className = 'note-content';
    contenido.setAttribute('contenteditable', 'true');
    contenido.setAttribute('data-placeholder', 'Escribe algo...');
    contenido.textContent = nota.contenido || '';
    contenido.addEventListener('input', () => {
      nota.contenido = contenido.textContent;
      guardarNotas();
    });

    // Placeholder personalizado
    contenido.addEventListener('focus', function () {
      if (this.textContent === '') {
        this.setAttribute('data-empty', 'true');
      }
    });
    contenido.addEventListener('blur', function () {
      this.removeAttribute('data-empty');
    });

    // Selector de color
    const colorPicker = document.createElement('div');
    colorPicker.className = 'note-color-picker';

    COLORES.forEach(color => {
      const dot = document.createElement('div');
      dot.className = `color-dot${color.nombre === nota.color ? ' active' : ''}`;
      dot.dataset.color = color.nombre;
      dot.setAttribute('title', color.nombre);
      dot.addEventListener('click', () => {
        nota.color = color.nombre;
        guardarNotas();
        renderizarNotas();
      });
      colorPicker.appendChild(dot);
    });

    // Ensamblar la nota
    div.appendChild(colorBar);
    div.appendChild(header);
    div.appendChild(contenido);
    div.appendChild(colorPicker);

    return div;
  }

  /**
   * Renderiza todas las notas
   */
  function renderizarNotas() {
    notesGrid.innerHTML = '';

    if (notas.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center; padding:30px; color:var(--text-muted); grid-column:1/-1;';
      empty.innerHTML = '<i class="fa-regular fa-note-sticky" style="font-size:2rem; display:block; margin-bottom:8px; opacity:0.5;"></i>No hay notas todavía';
      notesGrid.appendChild(empty);
    } else {
      notas.forEach(nota => {
        notesGrid.appendChild(crearElementoNota(nota));
      });
    }
  }

  /**
   * Crea una nueva nota
   */
  function crearNota() {
    const nuevaNota = {
      id: Date.now().toString(),
      titulo: '',
      contenido: '',
      color: COLORES[Math.floor(Math.random() * COLORES.length)].nombre
    };

    notas.unshift(nuevaNota);
    guardarNotas();
    renderizarNotas();

    // Enfocar el título de la nueva nota
    const primeraNota = notesGrid.querySelector('.note');
    if (primeraNota) {
      const tituloInput = primeraNota.querySelector('.note-title');
      if (tituloInput) tituloInput.focus();
    }
  }

  /**
   * Elimina una nota
   * @param {string} id - ID de la nota
   */
  function eliminarNota(id) {
    notas = notas.filter(n => n.id !== id);
    guardarNotas();
    renderizarNotas();
  }

  // --- Eventos ---
  newNoteBtn.addEventListener('click', crearNota);

  // --- Inicialización ---
  function init() {
    renderizarNotas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
