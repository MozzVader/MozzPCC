/**
 * newsWidget.js — Widget de noticias (v2)
 * RSS feeds via RSS2JSON API (free, no key needed, 10k req/day)
 * - Multiples medios activos por categoria (agregados y ordenados por fecha)
 * - Categorias custom y feeds RSS custom (localStorage)
 * - Toggle on/off por medio (no single-select)
 */

(function () {
  'use strict';

  var RSS_API = 'https://api.rss2json.com/v1/api.json';
  var CACHE_KEY = 'mozzpcc-news-cache';
  var CACHE_TTL = 10 * 60 * 1000; // 10 minutos
  var ACTIVE_KEY = 'mozzpcc-news-active';   // { catId: [sourceId, ...] }
  var CUSTOM_KEY = 'mozzpcc-news-custom';   // { categories: [...], feeds: [...] }

  // --- CATEGORIAS BASE (sorted alphabetically) ---
  var BASE_CATEGORIES = [
    {
      id: 'ar', name: 'Argentina', icon: 'fa-solid fa-location-dot',
      sources: [
        { id: 'tn',       name: 'TN',           url: 'https://tn.com.ar/rss.xml', builtin: true },
        { id: 'clarin',   name: 'Clarin',       url: 'https://www.clarin.com/rss/', builtin: true },
        { id: 'perfil',   name: 'Perfil',       url: 'https://www.perfil.com/feed', builtin: true },
        { id: 'pagina12', name: 'Pagina/12',    url: 'https://www.pagina12.com.ar/rss/', builtin: true },
        { id: 'cronista', name: 'El Cronista',  url: 'https://www.cronista.com.ar/rss/', builtin: true },
        { id: 'ambito',   name: 'Ambito',       url: 'https://www.ambito.com/rss/', builtin: true },
        { id: 'minutouno', name: 'Minuto Uno',  url: 'https://www.minutouno.com/rss.xml', builtin: true },
      ],
    },
    {
      id: 'ciencia', name: 'Ciencia', icon: 'fa-solid fa-flask',
      sources: [
        { id: 'natgeo',     name: 'NatGeo',       url: 'https://www.nationalgeographic.com.es/rss', builtin: true },
        { id: 'sciencedaily', name: 'ScienceDaily', url: 'https://www.sciencedaily.com/rss/all.xml', builtin: true },
        { id: 'wired-science', name: 'Wired Science', url: 'https://www.wired.com/feed/category/science/rss.xml', builtin: true },
        { id: 'arstechnica-science', name: 'Ars Technica Science', url: 'https://feeds.arstechnica.com/arstechnica/science', builtin: true },
      ],
    },
    {
      id: 'deportes', name: 'Deportes', icon: 'fa-solid fa-futbol',
      sources: [
        { id: 'ole',     name: 'Ole',            url: 'https://www.ole.com.ar/rss/', builtin: true },
        { id: 'espn-ar', name: 'ESPN Argentina',  url: 'https://www.espn.com.ar/rss/news', builtin: true },
        { id: 'tycsports', name: 'TyC Sports',    url: 'https://www.tycsports.com/feed', builtin: true },
        { id: 'mundodeportivo', name: 'Mundo Deportivo', url: 'https://www.mundodeportivo.com/rss', builtin: true },
        { id: 'marca',   name: 'Marca',           url: 'https://e00-marca.uecdn.es/rss/marca.xml', builtin: true },
      ],
    },
    {
      id: 'entretenimiento', name: 'Entretenimiento', icon: 'fa-solid fa-film',
      sources: [
        { id: 'ign',       name: 'IGN',           url: 'https://feeds.feedburner.com/ign/all', builtin: true },
        { id: 'deadline',  name: 'Deadline',       url: 'https://deadline.com/feed/', builtin: true },
        { id: 'variety',   name: 'Variety',        url: 'https://variety.com/feed/', builtin: true },
        { id: 'rollingstone', name: 'Rolling Stone', url: 'https://www.rollingstone.com/feed/', builtin: true },
      ],
    },
    {
      id: 'gaming', name: 'Gaming', icon: 'fa-solid fa-gamepad',
      sources: [
        { id: 'polygon',   name: 'Polygon',       url: 'https://www.polygon.com/rss/index.xml', builtin: true },
        { id: 'kotaku',    name: 'Kotaku',         url: 'https://kotaku.com/rss', builtin: true },
        { id: 'ign-gaming', name: 'IGN Gaming',    url: 'https://feeds.feedburner.com/ign/games-all', builtin: true },
        { id: 'pcgamer',   name: 'PC Gamer',       url: 'https://www.pcgamer.com/rss/', builtin: true },
        { id: 'eurogamer', name: 'Eurogamer',      url: 'https://www.eurogamer.net/?format=rss', builtin: true },
        { id: 'rockpapershotgun', name: 'Rock Paper Shotgun', url: 'https://www.rockpapershotgun.com/feed', builtin: true },
      ],
    },
    {
      id: 'mundo', name: 'Mundo', icon: 'fa-solid fa-globe',
      sources: [
        { id: 'bbc',         name: 'BBC Mundo',       url: 'https://feeds.bbci.co.uk/mundo/rss.xml', builtin: true },
        { id: 'reuters',     name: 'Reuters',          url: 'https://feeds.reuters.com/reuters/topNews', builtin: true },
        { id: 'aljazeera',   name: 'Al Jazeera',       url: 'https://www.aljazeera.com/xml/rss/all.xml', builtin: true },
        { id: 'elpais',      name: 'El Pais',          url: 'https://ep01.epimg.net/rss/elpais/comunes/', builtin: true },
        { id: 'france24',    name: 'France24 Espanol', url: 'https://www.france24.com/es/rss', builtin: true },
        { id: 'dw',          name: 'DW Espanol',       url: 'https://rss.dw.com/xml/rss-es-all', builtin: true },
      ],
    },
    {
      id: 'tech', name: 'Tecnologia', icon: 'fa-solid fa-microchip',
      sources: [
        { id: 'techcrunch',  name: 'TechCrunch',     url: 'https://feeds.feedburner.com/TechCrunch/', builtin: true },
        { id: 'verge',       name: 'The Verge',      url: 'https://www.theverge.com/rss/index.xml', builtin: true },
        { id: 'arstechnica', name: 'Ars Technica',   url: 'https://feeds.arstechnica.com/arstechnica/index', builtin: true },
        { id: 'wired',       name: 'Wired',           url: 'https://www.wired.com/feed/rss', builtin: true },
        { id: 'engadget',    name: 'Engadget',        url: 'https://www.engadget.com/rss.xml', builtin: true },
        { id: 'gizmodo',     name: 'Gizmodo',          url: 'https://gizmodo.com/rss', builtin: true },
        { id: 'theverge-sci', name: 'Verge Science',  url: 'https://www.theverge.com/rss/science/index.xml', builtin: true },
        { id: 'hackernews',  name: 'Hacker News',      url: 'https://hnrss.org/frontpage', builtin: true },
      ],
    },
  ];

  // --- State ---
  var categories = [];
  var currentCategory = null;
  var currentView = 'all';
  var isLoading = false;
  var articles = [];
  var activeSources = {};  // { catId: [sourceId, ...] }
  var customData = { categories: [], feeds: [] }; // user-defined

  // --- Persistence ---
  function loadActiveSources() {
    try {
      var raw = localStorage.getItem(ACTIVE_KEY);
      if (raw) activeSources = JSON.parse(raw);
    } catch (e) { activeSources = {}; }
  }

  function saveActiveSources() {
    try {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeSources));
    } catch (e) { /* ignore */ }
  }

  function loadCustomData() {
    try {
      var raw = localStorage.getItem(CUSTOM_KEY);
      if (raw) customData = JSON.parse(raw);
      if (!customData.categories) customData.categories = [];
      if (!customData.feeds) customData.feeds = [];
    } catch (e) { customData = { categories: [], feeds: [] }; }
  }

  function saveCustomData() {
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(customData));
    } catch (e) { /* ignore */ }
  }

  // --- Build full categories list (base + custom) ---
  function buildCategories() {
    categories = BASE_CATEGORIES.map(function (cat) {
      return Object.assign({}, cat, { sources: cat.sources.map(function (s) { return Object.assign({}, s); }) });
    });

    // Add custom categories
    customData.categories.forEach(function (cc) {
      var cat = {
        id: cc.id,
        name: cc.name,
        icon: cc.icon || 'fa-solid fa-rss',
        custom: true,
        sources: []
      };
      categories.push(cat);
    });

    // Add custom feeds to their respective categories
    customData.feeds.forEach(function (cf) {
      var cat = categories.find(function (c) { return c.id === cf.categoryId; });
      if (cat) {
        cat.sources.push({
          id: cf.id,
          name: cf.name,
          url: cf.url,
          builtin: false,
          custom: true
        });
      }
    });
  }

  function getActiveIds(catId) {
    var arr = activeSources[catId];
    return (arr && Array.isArray(arr)) ? arr : [];
  }

  function setActiveIds(catId, ids) {
    activeSources[catId] = ids;
    saveActiveSources();
  }

  function toggleSource(catId, sourceId) {
    var ids = getActiveIds(catId);
    var idx = ids.indexOf(sourceId);
    if (idx >= 0) {
      ids.splice(idx, 1);
    } else {
      ids.push(sourceId);
    }
    setActiveIds(catId, ids);
  }

  loadActiveSources();
  loadCustomData();
  buildCategories();
  currentCategory = categories[0];

  // Ensure default categories have all sources active
  categories.forEach(function (cat) {
    var active = getActiveIds(cat.id);
    if (active.length === 0) {
      var allIds = cat.sources.map(function (s) { return s.id; });
      setActiveIds(cat.id, allIds);
    }
  });

  // --- DOM ---
  var selectEl = document.getElementById('nw-feed-select');
  var feedIconEl = document.getElementById('nw-feed-icon');
  var listEl = document.getElementById('nw-list');

  // --- HELPERS ---
  function esc(text) {
    var d = document.createElement('div');
    d.textContent = text || '';
    return d.innerHTML;
  }

  function stripHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    var now = new Date();
    var date = new Date(dateStr);
    var diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Ahora';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd';

    var days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    var months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return days[date.getDay()] + ' ' + date.getDate() + ' ' + months[date.getMonth()];
  }

  // --- CACHE ---
  function getCache(feedId) {
    try {
      var raw = localStorage.getItem(CACHE_KEY + '-' + feedId);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (Date.now() - entry.ts > CACHE_TTL) return null;
      return entry.data;
    } catch (e) { return null; }
  }

  function setCache(feedId, data) {
    try {
      localStorage.setItem(CACHE_KEY + '-' + feedId, JSON.stringify({ ts: Date.now(), data: data }));
    } catch (e) { /* ignore */ }
  }

  // --- INIT CATEGORY SELECT ---
  function initSelect() {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    categories.forEach(function (cat, i) {
      var opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name + (cat.custom ? ' *' : '');
      if (i === 0) opt.selected = true;
      selectEl.appendChild(opt);
    });
    if (feedIconEl) feedIconEl.innerHTML = '<i class="' + categories[0].icon + '"></i>';

    selectEl.addEventListener('change', function () {
      currentCategory = categories.find(function (c) { return c.id === selectEl.value; }) || categories[0];
      if (feedIconEl) feedIconEl.innerHTML = '<i class="' + currentCategory.icon + '"></i>';
      loadFeed();
    });
  }

  // --- TABS ---
  var tabs = document.querySelectorAll('.nw-tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      currentView = tab.dataset.view;
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      renderArticles();
    });
  });

  // --- LOAD FEED (multi-source aggregation) ---
  async function loadFeed() {
    if (isLoading || !listEl || !currentCategory) return;
    isLoading = true;

    var activeIds = getActiveIds(currentCategory.id);

    // If nothing active, show message
    if (activeIds.length === 0) {
      showEmpty('No hay medios activos. Activá al menos uno en Configuracion.');
      articles = [];
      isLoading = false;
      return;
    }

    // Resolve active source objects
    var activeFeeds = currentCategory.sources.filter(function (s) {
      return activeIds.indexOf(s.id) >= 0;
    });

    // Try to load from cache for all feeds
    var allCached = true;
    var merged = [];
    activeFeeds.forEach(function (feed) {
      var cached = getCache(feed.id);
      if (cached) {
        merged = merged.concat(cached);
      } else {
        allCached = false;
      }
    });

    if (allCached && merged.length > 0) {
      articles = merged.sort(function (a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });
      renderArticles();
      isLoading = false;
      return;
    }

    showLoading();

    // Fetch all active feeds in parallel
    var promises = activeFeeds.map(function (feed) {
      return fetchFeed(feed);
    });

    var results = await Promise.allSettled(promises);
    merged = [];
    results.forEach(function (result) {
      if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
        merged = merged.concat(result.value);
      }
    });

    // Sort all by date descending
    articles = merged.sort(function (a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });

    if (articles.length === 0) {
      showEmpty('No se pudieron cargar noticias de los medios activos');
    } else {
      renderArticles();
    }

    isLoading = false;
  }

  async function fetchFeed(feed) {
    // Check cache
    var cached = getCache(feed.id);
    if (cached) return cached;

    try {
      var res = await fetch(RSS_API + '?rss_url=' + encodeURIComponent(feed.url));
      if (!res.ok) throw new Error('API error ' + res.status);
      var data = await res.json();

      if (data.status !== 'ok' || !data.items || data.items.length === 0) {
        return [];
      }

      var items = data.items.map(function (item) {
        return {
          title: item.title || '',
          link: item.link || '#',
          description: stripHtml(item.description || ''),
          pubDate: item.pubDate || '',
          thumbnail: item.thumbnail || (item.enclosure ? (item.enclosure.link || '') : ''),
          author: item.author || '',
          source: data.feed ? data.feed.title : feed.name,
        };
      });

      setCache(feed.id, items);
      return items;
    } catch (e) {
      console.warn('Error fetching feed "' + feed.name + '":', e.message);
      return [];
    }
  }

  // --- RENDER ---
  function renderArticles() {
    if (!listEl) return;
    if (articles.length === 0) {
      showEmpty('No hay articulos disponibles');
      return;
    }

    if (currentView === 'featured') {
      renderFeatured();
    } else {
      renderList();
    }
  }

  function renderList() {
    var html = '';
    articles.forEach(function (article, i) {
      var thumbHtml = article.thumbnail
        ? '<img class="nw-thumb" src="' + esc(article.thumbnail) + '" alt="" loading="lazy" onerror="this.outerHTML=\'<div class=\\\'nw-thumb-placeholder\\\'><i class=\\\'fa-regular fa-image\\\'></i></div>\'">'
        : '<div class="nw-thumb-placeholder"><i class="fa-regular fa-image"></i></div>';

      html += '<a class="nw-item" href="' + esc(article.link) + '" target="_blank" rel="noopener" style="animation-delay:' + (i * 0.03) + 's">' +
        thumbHtml +
        '<div class="nw-item-body">' +
          '<span class="nw-item-title">' + esc(article.title) + '</span>' +
          '<div class="nw-item-meta">' +
            '<span class="nw-item-source">' + esc(article.source) + '</span>' +
            '<span class="nw-item-sep">&middot;</span>' +
            '<span>' + timeAgo(article.pubDate) + '</span>' +
          '</div>' +
        '</div>' +
      '</a>';
    });

    listEl.className = 'nw-list';
    listEl.innerHTML = html;
  }

  function renderFeatured() {
    var featured = articles.slice(0, 8);
    var html = '';

    featured.forEach(function (article, i) {
      var imgHtml = article.thumbnail
        ? '<img class="nw-featured-img" src="' + esc(article.thumbnail) + '" alt="" loading="lazy" onerror="this.outerHTML=\'<div class=\\\'nw-featured-img-placeholder\\\'><i class=\\\'fa-regular fa-image\\\'></i></div>\'">'
        : '<div class="nw-featured-img-placeholder"><i class="fa-regular fa-newspaper"></i></div>';

      var descText = article.description.substring(0, 150);

      html += '<a class="nw-featured-item" href="' + esc(article.link) + '" target="_blank" rel="noopener" style="animation-delay:' + (i * 0.05) + 's">' +
        imgHtml +
        '<span class="nw-featured-title">' + esc(article.title) + '</span>' +
        (descText ? '<span class="nw-featured-desc">' + esc(descText) + '</span>' : '') +
        '<div class="nw-featured-meta">' +
          '<span class="nw-featured-source">' + esc(article.source) + '</span>' +
          '<span class="nw-item-sep">&middot;</span>' +
          '<span>' + timeAgo(article.pubDate) + '</span>' +
        '</div>' +
      '</a>';
    });

    listEl.className = 'nw-featured';
    listEl.innerHTML = html;
  }

  // --- STATES ---
  function showLoading() {
    listEl.className = 'nw-list';
    listEl.innerHTML = '<div class="nw-loading"><i class="fa-solid fa-spinner fa-spin"></i><span>Cargando noticias...</span></div>';
  }

  function showEmpty(msg) {
    listEl.className = 'nw-list';
    listEl.innerHTML = '<div class="nw-empty"><i class="fa-regular fa-newspaper"></i><span>' + esc(msg) + '</span></div>';
  }

  function showError(msg) {
    listEl.className = 'nw-list';
    listEl.innerHTML = '<div class="nw-error"><i class="fa-solid fa-triangle-exclamation"></i><span>' + esc(msg) + '</span></div>';
  }

  // --- PUBLIC API (for settings panel) ---
  window.NewsWidget = {
    getCategories: function () { return categories; },

    getActiveSources: function () { return activeSources; },

    getActiveIds: function (catId) { return getActiveIds(catId); },

    toggleSource: function (catId, sourceId) {
      toggleSource(catId, sourceId);
      // If currently viewing this category, reload
      if (currentCategory && currentCategory.id === catId) {
        loadFeed();
      }
    },

    addCustomCategory: function (name, icon) {
      var id = 'custom-' + Date.now();
      var cat = { id: id, name: name, icon: icon || 'fa-solid fa-rss', custom: true, sources: [] };
      customData.categories.push({ id: id, name: name, icon: cat.icon });
      saveCustomData();
      buildCategories();
      setActiveIds(id, []);
      // Refresh select
      initSelect();
      return cat;
    },

    removeCustomCategory: function (catId) {
      customData.categories = customData.categories.filter(function (c) { return c.id !== catId; });
      customData.feeds = customData.feeds.filter(function (f) { return f.categoryId !== catId; });
      delete activeSources[catId];
      saveCustomData();
      saveActiveSources();
      buildCategories();
      initSelect();
      if (currentCategory && currentCategory.id === catId) {
        currentCategory = categories[0];
        selectEl.value = currentCategory.id;
        loadFeed();
      }
    },

    addCustomFeed: function (catId, name, url) {
      var id = 'cf-' + Date.now();
      customData.feeds.push({ id: id, categoryId: catId, name: name, url: url });
      saveCustomData();
      buildCategories();
      // Auto-activate the new feed
      var ids = getActiveIds(catId);
      if (ids.indexOf(id) < 0) {
        ids.push(id);
        setActiveIds(catId, ids);
      }
      if (currentCategory && currentCategory.id === catId) {
        loadFeed();
      }
      return id;
    },

    removeCustomFeed: function (catId, feedId) {
      customData.feeds = customData.feeds.filter(function (f) { return f.id !== feedId; });
      var ids = getActiveIds(catId);
      ids = ids.filter(function (id) { return id !== feedId; });
      setActiveIds(catId, ids);
      saveCustomData();
      buildCategories();
      if (currentCategory && currentCategory.id === catId) {
        loadFeed();
      }
    },

    reload: function () { loadFeed(); },

    clearCache: function () {
      categories.forEach(function (cat) {
        cat.sources.forEach(function (s) {
          localStorage.removeItem(CACHE_KEY + '-' + s.id);
        });
      });
      loadFeed();
    },

    refreshCategories: function () {
      buildCategories();
      initSelect();
    },
  };

  // --- INIT ---
  initSelect();
  loadFeed();
})();
