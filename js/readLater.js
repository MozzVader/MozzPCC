/**
 * readLater.js — Ver Mas Tarde
 * CRUD de links guardados con persistencia en Supabase
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

  function getSupabase() {
    return window.supabaseClient || null;
  }

  // --- Cargar items ---
  async function loadItems() {
    var client = getSupabase();
    if (!client || !userId) return;

    try {
      var result = await client
        .from('read_later_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (result.error) {
        console.warn('MozzPCC: Error cargando read later:', result.error);
        return;
      }

      items = (result.data || []).map(function (r) {
        return { id: r.id, title: r.title, url: r.url, created_at: r.created_at };
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
      items.forEach(function (item) {
        list.appendChild(createItem(item));
      });
    }

    updateCounter();
  }

  function createItem(item) {
    var li = document.createElement('li');
    li.className = 'read-later-item';
    li.dataset.id = item.id;

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

    // Auto-prepend https://
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
          url: url
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
        created_at: result.data.created_at
      });

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
