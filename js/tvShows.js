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
  var TVMAZE_SHOW = 'https://api.tvmaze.com/shows/';
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
      if (res.error) { console.warn('[TV] Error loading:', res.error); return; }
      shows = res.data || [];
      render();
      loadUpcoming();
    } catch (e) { console.warn('[TV] Error:', e); }
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

  // --- Render ---
  function render() {
    var container = document.getElementById('tv-upcoming-list');
    if (!container) return;

    var h = '';

    if (shows.length === 0) {
      h = '<div class="tv-empty">' +
        '<i class="fa-solid fa-tv"></i>' +
        '<span>Agregá series para ver los próximos estrenos</span></div>';
      container.innerHTML = h;
      return;
    }

    if (upcomingEpisodes.length === 0) {
      h = '<div class="tv-empty">' +
        '<i class="fa-solid fa-clock"></i>' +
        '<span>No hay episodios próximos por estrenar</span></div>';
      container.innerHTML = h;
      return;
    }

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
                var statusEl = opt.querySelector('.tv-result-status');
                if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-check"></i> Agregada';
                // Clear cache so upcoming episodes reload
                localStorage.removeItem(CACHE_KEY);
                loadUpcoming();
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

    loadShows();
  }

  function cleanup() {
    shows = [];
    upcomingEpisodes = [];
    userId = null;
    initialized = false;
    closeSearch();

    var container = document.getElementById('tv-upcoming-list');
    if (container) container.innerHTML = '';
  }

  // --- Events ---
  window.addEventListener('auth:ready', function () {
    init();
  });

  window.addEventListener('auth:logout', function () {
    cleanup();
  });
})();
