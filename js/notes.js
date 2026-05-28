/**
 * notes.js — Notas rápidas con persistencia en Supabase
 * Se inicializa cuando se recibe el evento 'auth:ready'
 * Soporte para múltiples notas con colores editables
 * Debounced save (800ms) para contenteditable
 */

(function () {
  'use strict';

  // --- Colores disponibles para las notas ---
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
  let notas = [];
  let userId = null;
  let isInitialized = false;

  // Mapa de debounce timers por nota ID
  const debounceTimers = {};

  // --- Mini Markdown parser (bold, italic, unordered lists) ---
  function parseMarkdown(text) {
    if (!text) return '';
    // Escape HTML
    var html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*|__(.+?)__/g, '<strong>$1$2</strong>');
    // Italic: *text* (single, not part of bold — no lookbehind for compat)
    html = html.replace(/(^|\s)\*([^*\n]+)\*(\s|$)/gm, '$1<em>$2</em>$3');
    // Unordered lists: lines starting with - or * (not inside existing tags)
    html = html.replace(/^([-*])\s+(.+)$/gm, '<li>$2</li>');
    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
    // Clean extra whitespace/newlines inside <ul> blocks
    html = html.replace(/<\/li>\s+<li>/g, '</li><li>');
    // Line breaks (only outside <ul> blocks)
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  /**
   * Carga las notas desde Supabase
   */
  async function cargarNotas() {
    const client = getSupabase();
    if (!client || !userId) return;

    try {
      const { data, error } = await client
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error al cargar notas:', error);
        window.showWidgetError('notes-grid', {
          message: 'No se pudieron cargar las notas',
          retry: cargarNotas,
          skeletons: ['skel-notes']
        });
        return;
      }

      window.clearWidgetError('notes-grid');
      // Mapear datos de Supabase al formato local
      notas = (data || []).map(n => ({
        id: n.id,
        titulo: n.title || '',
        contenido: n.content || '',
        color: n.color || 'yellow',
        created_at: n.created_at
      }));

      renderizarNotas();
    } catch (e) {
      console.warn('Error al cargar notas:', e);
      window.showWidgetError('notes-grid', {
        message: 'Error de conexion. Verifica tu internet.',
        retry: cargarNotas,
        skeletons: ['skel-notes']
      });
    }
  }

  /**
   * Guarda una nota en Supabase (debounced)
   * @param {string} id - ID de la nota
   * @param {Object} updates - Campos a actualizar
   */
  function guardarNotaDebounced(id, updates) {
    // Limpiar timer anterior si existe
    if (debounceTimers[id]) {
      clearTimeout(debounceTimers[id]);
    }

    debounceTimers[id] = setTimeout(async () => {
      const client = getSupabase();
      if (!client || !userId) return;

      try {
        const { error } = await client
          .from('notes')
          .update(updates)
          .eq('id', id);

        if (error) {
          console.warn('Error al guardar nota:', error);
        } else {
          window.dispatchEvent(new CustomEvent('sync:success'));
        }
      } catch (e) {
        console.warn('Error al guardar nota:', e);
      }
    }, 800);
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
    titulo.value = nota.titulo || '';
    titulo.placeholder = 'Título...';
    titulo.addEventListener('input', () => {
      nota.titulo = titulo.value;
      guardarNotaDebounced(nota.id, { title: nota.titulo });
    });

    const acciones = document.createElement('div');
    acciones.className = 'note-actions';

    const btnCopiar = document.createElement('button');
    btnCopiar.className = 'note-btn copy';
    btnCopiar.setAttribute('aria-label', 'Copiar nota');
    btnCopiar.innerHTML = '<i class="fa-regular fa-copy"></i>';
    btnCopiar.addEventListener('click', () => {
      var texto = (nota.titulo ? nota.titulo + '\n' : '') + (nota.contenido || '');
      if (!texto.trim()) return;
      navigator.clipboard.writeText(texto).then(() => {
        btnCopiar.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => {
          btnCopiar.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 1500);
      });
    });

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'note-btn delete';
    btnEliminar.setAttribute('aria-label', 'Eliminar nota');
    btnEliminar.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    btnEliminar.addEventListener('click', () => eliminarNota(nota.id));

    acciones.appendChild(btnCopiar);
    acciones.appendChild(btnEliminar);
    header.appendChild(titulo);
    header.appendChild(acciones);

    // Contenido: toggle entre Markdown renderizado y contenteditable
    const contenido = document.createElement('div');
    contenido.className = 'note-content';
    contenido.setAttribute('data-placeholder', 'Escribe algo...');
    contenido.innerHTML = parseMarkdown(nota.contenido);
    // Start in view mode (not editable)
    contenido.setAttribute('data-editing', 'false');

    function enterEditMode() {
      if (contenido.getAttribute('data-editing') === 'true') return;
      contenido.setAttribute('data-editing', 'true');
      contenido.setAttribute('contenteditable', 'true');
      // innerHTML con <br> para que los \n se muestren como saltos de línea
      contenido.innerHTML = escapeHtml(nota.contenido || '').replace(/\n/g, '<br>');
      contenido.classList.add('note-editing');
      // Move cursor to end
      var range = document.createRange();
      range.selectNodeContents(contenido);
      range.collapse(false);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    function exitEditMode() {
      if (contenido.getAttribute('data-editing') !== 'true') return;
      // Leer con innerText para capturar los saltos de línea reales
      nota.contenido = contenido.innerText;
      guardarNotaDebounced(nota.id, { content: nota.contenido });
      contenido.setAttribute('data-editing', 'false');
      contenido.removeAttribute('contenteditable');
      contenido.classList.remove('note-editing');
      contenido.innerHTML = parseMarkdown(nota.contenido);
      contenido.removeAttribute('data-empty');
    }

    // Use mousedown to enter edit mode (div isn't focusable without contenteditable)
    contenido.addEventListener('mousedown', function (e) {
      if (contenido.getAttribute('data-editing') !== 'true') {
        e.preventDefault(); // prevent text selection before entering edit
        enterEditMode();
        contenido.focus();
      }
    });
    contenido.addEventListener('blur', exitEditMode);
    contenido.addEventListener('input', () => {
      // innerText preserva saltos de línea del contenteditable (texto no)
      nota.contenido = contenido.innerText;
      guardarNotaDebounced(nota.id, { content: nota.contenido });
    });

    // Selector de color
    const colorPicker = document.createElement('div');
    colorPicker.className = 'note-color-picker';

    COLORES.forEach(color => {
      const dot = document.createElement('div');
      dot.className = `color-dot${color.nombre === nota.color ? ' active' : ''}`;
      dot.dataset.color = color.nombre;
      dot.setAttribute('title', color.nombre);
      dot.addEventListener('click', async () => {
        // Actualizar UI inmediatamente
        nota.color = color.nombre;
        colorBar.style.background = color.valor;

        // Actualizar dots activos
        colorPicker.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');

        // Guardar en Supabase
        const client = getSupabase();
        if (client && userId) {
          try {
            await client
              .from('notes')
              .update({ color: color.nombre })
              .eq('id', nota.id);
          } catch (e) {
            console.warn('Error al cambiar color:', e);
          }
        }
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
    hideSkeleton('skel-notes');
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
  async function crearNota() {
    const client = getSupabase();
    if (!client || !userId) return;

    newNoteBtn.disabled = true;
    newNoteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      const randomColor = COLORES[Math.floor(Math.random() * COLORES.length)].nombre;

      const { data, error } = await client
        .from('notes')
        .insert({
          user_id: userId,
          title: '',
          content: '',
          color: randomColor
        })
        .select()
        .single();

      if (error) {
        console.warn('Error al crear nota:', error);
        return;
      }

      // Agregar al inicio
      notas.unshift({
        id: data.id,
        titulo: data.title || '',
        contenido: data.content || '',
        color: data.color,
        created_at: data.created_at
      });

      renderizarNotas();
      window.dispatchEvent(new CustomEvent('sync:success'));

      // Enfocar el título de la nueva nota
      const primeraNota = notesGrid.querySelector('.note');
      if (primeraNota) {
        const tituloInput = primeraNota.querySelector('.note-title');
        if (tituloInput) tituloInput.focus();
      }
    } catch (e) {
      console.warn('Error al crear nota:', e);
    } finally {
      newNoteBtn.disabled = false;
      newNoteBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Nueva nota';
    }
  }

  /**
   * Elimina una nota
   * @param {string} id - ID de la nota
   */
  async function eliminarNota(id) {
    const client = getSupabase();
    if (!client || !userId) return;

    // Guardar nota para posible undo
    var notaEliminada = notas.find(n => n.id === id);

    // Optimistic update
    notas = notas.filter(n => n.id !== id);
    renderizarNotas();

    // Mostrar toast con undo
    if (window.UndoToast) {
      window.UndoToast.show({
        message: 'Nota eliminada',
        onUndo: function () {
          if (notaEliminada) {
            notas.push(notaEliminada);
            renderizarNotas();
          }
        },
        onConfirm: function () {
          client.from('notes').delete().eq('id', id)
            .then(function (result) {
              if (result.error) {
                console.warn('Error al eliminar nota:', result.error);
                cargarNotas();
              } else {
                window.dispatchEvent(new CustomEvent('sync:success'));
              }
            })
            .catch(function (e) {
              console.warn('Error al eliminar nota:', e);
              cargarNotas();
            });
        }
      });
    } else {
      try {
        const { error } = await client
          .from('notes')
          .delete()
          .eq('id', id);
        if (!error) window.dispatchEvent(new CustomEvent('sync:success'));

        if (error) {
          console.warn('Error al eliminar nota:', error);
          cargarNotas();
        }
      } catch (e) {
        console.warn('Error al eliminar nota:', e);
        cargarNotas();
      }
    }
  }

  /**
   * Limpia el estado (al cerrar sesión)
   */
  function cleanup() {
    notas = [];
    userId = null;
    // Limpiar todos los timers de debounce
    Object.keys(debounceTimers).forEach(key => {
      clearTimeout(debounceTimers[key]);
      delete debounceTimers[key];
    });
    notesGrid.innerHTML = '';
  }

  // --- Eventos ---
  newNoteBtn.addEventListener('click', crearNota);

  // Escuchar evento de autenticación lista
  window.addEventListener('auth:ready', (e) => {
    userId = e.detail.userId;
    if (!isInitialized) {
      isInitialized = true;
    }
    cargarNotas();
  });

  // Escuchar cierre de sesión
  window.addEventListener('auth:logout', () => {
    cleanup();
  });
})();
