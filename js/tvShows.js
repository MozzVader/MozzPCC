/**
 * tvShows.js — Widget de seguimiento de series con TVmaze API
 * Busca series, agrega a tu lista, muestra próximos episodios por estrenar
 * TVmaze API: gratutita, sin key, CORS habilitado
 */

(function () {
  'use strict';

  var client = null;
  var userId = null;
  var initialized = false;
  var shows = [];
  var upcomingEpisodes = [];

  var TVMAZE_SEARCH = 'https://api.tvmaze.com/search/shows?q=';
  var TVMAZE_EPISODES = 'https://api.tvmaze.com/shows/{id}/episodes';
  var CACHE_KEY = 'mozzpcc-tv-episodes';
  var CACHE_MS = 2 * 60 * 60 * 1000;

  // --- Helpers ---
  function getSupabase() { return window.supabaseClient || null; }

  // --- Supabase CRUD ---
  async function loadShows() {
    var c = getSupabase();
    if (!c || !userId) return;
    try {
      var res = await c.from('tv_shows').select('*').eq('user_id', userId);
      if (res.error) {
        console.warn('[TV] Error loading:', res.error);
        window.showWidgetError('tv-upcoming-list', {
          message: 'No se pudieron cargar las series',
          retry: loadShows,
          skeletons: ['skel-tv-agenda', 'skel-tv-series']
        });
        return;
      }
      window.clearWidgetError('tv-upcoming-list');
      shows = res.data || [];
      render();
      loadUpcoming();
    } catch (e) {
      console.warn('[TV] Error:', e);
      window.showWidgetError('tv-upcoming-list', {
        message: 'Error de conexion. Verifica tu internet.',
        retry: loadShows,
        skeletons: ['skel-tv-agenda', 'skel-tv-series']
      });
    }
  }

  async function addShow(tvmazeId, title, posterUrl, status) {
    var c = getSupabase();
    if (!c || !userId) return;
    // Evitar duplicados
    if (shows.some(function (s) { return s.tvmaze_id === tvmazeId; })) return;
    try {
      var res = await c.from('tv_shows').insert({
        user_id: userId,
        tvmaze_id: tvmazeId,
        title: title,
        poster_url: posterUrl || null,
        status: status || 'Running'
      }).select().single();
      if (res.error) { console.warn('[TV] Error inserting:', res.error); return; }
      shows.push(res.data);
      render();
      loadUpcoming();
    } catch (e) { console.warn('[TV] Error:', e); }
  }

  async function removeShow(id) {
    var c = getSupabase();
    if (!c || !userId) return;
    shows = shows.filter(function (s) { return s.id !== id; });
    render();
    try {
      await c.from('tv_shows').delete().eq('id', id);
      loadUpcoming();
    } catch (e) { loadShows(); }
  }

  // --- TVmaze: Próximos episodios ---
  function loadEpisodesCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d.ts && (Date.now() - d.ts) < CACHE_MS) {
          // Re-parse airDate strings back to Date objects (JSON.stringify converts Dates to strings)
          upcomingEpisodes = (d.episodes || []).map(function (ep) {
            if (ep.airDate && typeof ep.airDate === 'string') {
              ep.airDate = new Date(ep.airDate);
            }
            return ep;
          });
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  function saveEpisodesCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), episodes: upcomingEpisodes })); } catch (e) {}
  }

  async function loadUpcoming() {
    if (shows.length === 0) {
      upcomingEpisodes = [];
      render();
      return;
    }

    if (loadEpisodesCache()) {
      render();
      return;
    }

    upcomingEpisodes = [];
    var now = new Date();
    var promises = shows.map(function (show) {
      return fetch(TVMAZE_EPISODES.replace('{id}', show.tvmaze_id))
        .then(function (r) { return r.json(); })
        .then(function (eps) {
          if (!Array.isArray(eps)) return;
          eps.forEach(function (ep) {
            if (!ep.airstamp) return;
            var airDate = new Date(ep.airstamp);
            // Solo episodios que NO pasaron aún (con margen de 1 día)
            var cutoff = new Date(now);
            cutoff.setDate(cutoff.getDate() - 1);
            if (airDate > cutoff) {
              upcomingEpisodes.push({
                showId: show.tvmaze_id,
                showTitle: show.title,
                poster: show.poster_url,
                name: ep.name || 'Sin título',
                season: ep.season || 0,
                number: ep.number || 0,
                airstamp: ep.airstamp,
                airDate: airDate
              });
            }
          });
        })
        .catch(function () {});
    });

    await Promise.all(promises);

    // Ordenar por fecha de estreno
    upcomingEpisodes.sort(function (a, b) { return a.airDate - b.airDate; });
    saveEpisodesCache();
    render();
  }

  // --- TVmaze: Búsqueda ---
  function searchShows(query) {
    if (!query || query.length < 2) return Promise.resolve([]);
    return fetch(TVMAZE_SEARCH + encodeURIComponent(query))
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        return (data || []).slice(0, 8).map(function (item) {
          var s = item.show;
          return {
            id: s.id,
            name: s.name || 'Sin nombre',
            year: s.premiered ? s.premiered.substring(0, 4) : '',
            image: s.image ? (s.image.medium || s.image.original) : null,
            status: s.status || 'Unknown',
            genres: (s.genres || []).join(', ')
          };
        });
      })
      .catch(function () { return []; });
  }

  // --- Fecha legible ---
  function formatDate(date) {
    var now = new Date();
    var diff = date.getTime() - now.getTime();
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      var hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours <= 1) return 'Pronto';
      return 'Hoy, en ' + hours + 'h';
    }
    if (days === 1) return 'Mañana';
    if (days < 7) return days === 2 ? 'Pasado mañana' : 'En ' + days + ' días';
    if (days < 14) return 'En 1 semana';
    if (days < 30) return 'En ' + Math.ceil(days / 7) + ' semanas';
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  }

  function epLabel(ep) {
    return 'T' + ep.season + 'E' + ep.number;
  }

  // --- Render Agenda (próximos episodios) ---
  function renderAgenda() {
    var container = document.getElementById('tv-upcoming-list');
    if (!container) return;

    if (shows.length === 0) {
      container.innerHTML = '<div class="tv-empty">' +
        '<i class="fa-solid fa-tv"></i>' +
        '<span>Agregá series para ver los próximos estrenos</span></div>';
      return;
    }

    if (upcomingEpisodes.length === 0) {
      container.innerHTML = '<div class="tv-empty">' +
        '<i class="fa-solid fa-clock"></i>' +
        '<span>No hay episodios próximos por estrenar</span></div>';
      return;
    }

    var h = '';
    upcomingEpisodes.forEach(function (ep) {
      var poster = ep.poster ? '<img class="tv-poster" src="' + ep.poster + '" alt="" onerror="this.style.display=\'none\'">' : '';
      h += '<div class="tv-ep-item">' +
        '<div class="tv-ep-poster">' + poster + '</div>' +
        '<div class="tv-ep-info">' +
        '<div class="tv-ep-show">' + ep.showTitle + '</div>' +
        '<div class="tv-ep-meta">' + epLabel(ep) + ' — ' + ep.name + '</div>' +
        '<div class="tv-ep-date">' + formatDate(ep.airDate) + '</div>' +
        '</div></div>';
    });

    container.innerHTML = h;
  }

  // --- Render Series (lista de series seguidas) ---
  function renderSeries() {
    var container = document.getElementById('tv-series-list');
    if (!container) return;

    if (shows.length === 0) {
      container.innerHTML = '<div class="tv-series-empty">' +
        '<i class="fa-solid fa-film"></i>' +
        '<span>Agregá series con el botón +</span></div>';
      return;
    }

    container.innerHTML = '';
    shows.forEach(function (show) {
      var item = document.createElement('div');
      item.className = 'tv-series-item';

      var posterHtml;
      if (show.poster_url) {
        posterHtml = '<img src="' + show.poster_url + '" alt="" onerror="this.outerHTML=\'<div class=tv-no-poster><i class=fa-solid fa-film></i></div>\'">';
      } else {
        posterHtml = '<div class="tv-no-poster"><i class="fa-solid fa-film"></i></div>';
      }

      var statusLabel = show.status === 'Running' ? 'En emisión' :
                        show.status === 'Ended' ? 'Finalizada' :
                        show.status || '';

      item.innerHTML =
        '<div class="tv-series-poster">' + posterHtml + '</div>' +
        '<div class="tv-series-info">' +
          '<div class="tv-series-name">' + escapeHtml(show.title) + '</div>' +
          '<div class="tv-series-status">' + escapeHtml(statusLabel) + '</div>' +
        '</div>' +
        '<button class="tv-series-remove" aria-label="Eliminar ' + escapeHtml(show.title) + '"><i class="fa-solid fa-trash-can"></i></button>';

      item.querySelector('.tv-series-remove').addEventListener('click', function (e) {
        e.stopPropagation();
        removeShow(show.id);
        localStorage.removeItem(CACHE_KEY);
      });

      item.addEventListener('click', function () {
        if (show.tvmaze_id) {
          window.open('https://www.tvmaze.com/shows/' + show.tvmaze_id, '_blank');
        }
      });
      item.style.cursor = 'pointer';

      container.appendChild(item);
    });
  }

  // --- Render principal ---
  function render() {
    hideSkeleton('skel-tv-agenda');
    hideSkeleton('skel-tv-series');
    renderAgenda();
    renderSeries();
  }

  // --- Tab switching ---
  function initTabs() {
    var tvTabs = document.querySelectorAll('.tv-tab');
    for (var i = 0; i < tvTabs.length; i++) {
      tvTabs[i].addEventListener('click', function () {
        var tabName = this.dataset.tab;
        if (!tabName) return;

        // Update tab buttons
        for (var j = 0; j < tvTabs.length; j++) {
          tvTabs[j].classList.remove('active');
        }
        this.classList.add('active');

        // Update tab content
        var contents = document.querySelectorAll('.tv-tab-content');
        for (var k = 0; k < contents.length; k++) {
          contents[k].classList.remove('active');
        }
        var target = document.getElementById('tv-tab-' + tabName);
        if (target) target.classList.add('active');
      });
    }
  }

  // --- Search UI ---
  function openSearch() {
    closeSearch();
    var overlay = document.createElement('div');
    overlay.className = 'tv-search-overlay';
    overlay.id = 'tv-search-overlay';

    var box = document.createElement('div');
    box.className = 'tv-search-box';
    box.innerHTML =
      '<div class="tv-search-header">' +
        '<input type="text" class="tv-search-input" placeholder="Buscar serie..." autocomplete="off">' +
        '<button class="tv-search-close" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>' +
      '</div>' +
      '<div class="tv-search-results"></div>' +
      '<div class="tv-search-hint">Escribí al menos 2 caracteres para buscar</div>';

    overlay.appendChild(box);
    var widget = document.getElementById('widget-tv-shows');
    if (widget) widget.appendChild(overlay);

    var input = box.querySelector('.tv-search-input');
    var results = box.querySelector('.tv-search-results');
    var hint = box.querySelector('.tv-search-hint');
    var closeBtn = box.querySelector('.tv-search-close');
    var debounceTimer = null;

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var q = input.value.trim();
      if (q.length < 2) {
        results.innerHTML = '';
        hint.style.display = '';
        return;
      }
      hint.style.display = 'none';
      results.innerHTML = '<div class="tv-search-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>';
      debounceTimer = setTimeout(function () {
        searchShows(q).then(function (items) {
          if (items.length === 0) {
            results.innerHTML = '<div class="tv-search-empty">No se encontraron series</div>';
            return;
          }
          results.innerHTML = '';
          items.forEach(function (item) {
            var isAdded = shows.some(function (s) { return s.tvmaze_id === item.id; });
            var poster = item.image ? '<img class="tv-result-poster" src="' + item.image + '" alt="" onerror="this.style.display=\'none\'">' : '<div class="tv-result-poster tv-no-poster"><i class="fa-solid fa-film"></i></div>';
            var opt = document.createElement('div');
            opt.className = 'tv-result-item';
            if (isAdded) opt.classList.add('tv-already-added');
            opt.innerHTML =
              poster +
              '<div class="tv-result-info">' +
                '<div class="tv-result-name">' + item.name + '</div>' +
                '<div class="tv-result-meta">' + (item.year ? item.year : '') + (item.genres ? ' · ' + item.genres : '') + '</div>' +
                '<div class="tv-result-status">' + (isAdded ? '<i class="fa-solid fa-check"></i> En tu lista' : item.status) + '</div>' +
              '</div>';
            if (!isAdded) {
              opt.addEventListener('click', function () {
                addShow(item.id, item.name, item.image, item.status);
                opt.classList.add('tv-already-added');
                opt.classList.remove('tv-removable');
                var statusEl = opt.querySelector('.tv-result-status');
                if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-check"></i> Agregada';
                localStorage.removeItem(CACHE_KEY);
                loadUpcoming();
              });
            } else {
              // Serie ya agregada: click para eliminar
              opt.classList.add('tv-removable');
              opt.addEventListener('click', function () {
                var dbShow = shows.find(function (s) { return s.tvmaze_id === item.id; });
                if (dbShow) {
                  removeShow(dbShow.id);
                  localStorage.removeItem(CACHE_KEY);
                  opt.classList.remove('tv-already-added', 'tv-removable');
                  var statusEl = opt.querySelector('.tv-result-status');
                  if (statusEl) statusEl.innerHTML = item.status;
                }
              });
            }
            results.appendChild(opt);
          });
        });
      }, 350);
    });

    closeBtn.addEventListener('click', closeSearch);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeSearch();
    });

    setTimeout(function () { input.focus(); }, 10);

    // Close on outside click
    function handler(e) {
      if (!overlay.contains(e.target)) { closeSearch(); document.removeEventListener('click', handler); }
    }
    setTimeout(function () { document.addEventListener('click', handler); }, 20);
  }

  function closeSearch() {
    var el = document.getElementById('tv-search-overlay');
    if (el) el.remove();
  }

  // --- Init ---
  async function init() {
    if (initialized) return;
    initialized = true;

    client = getSupabase();
    if (!client) {
      console.warn('[TV] Supabase client no disponible');
      initialized = false;
      return;
    }

    try {
      var { data, error } = await client.auth.getSession();
      if (error || !data || !data.session) {
        initialized = false;
        return;
      }
      userId = data.session.user.id;
    } catch (e) {
      initialized = false;
      return;
    }

    // Botón agregar
    var addBtn = document.getElementById('tv-add-btn');
    if (addBtn) addBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openSearch();
    });

    // Tab switching
    initTabs();

    loadShows();
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function cleanup() {
    shows = [];
    upcomingEpisodes = [];
    userId = null;
    initialized = false;
    closeSearch();

    var container = document.getElementById('tv-upcoming-list');
    if (container) container.innerHTML = '';
    var seriesList = document.getElementById('tv-series-list');
    if (seriesList) seriesList.innerHTML = '';
  }

  // --- Events ---
  window.addEventListener('auth:ready', function () {
    init();
  });

  window.addEventListener('auth:logout', function () {
    cleanup();
  });
})();
