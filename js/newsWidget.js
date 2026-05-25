/**
 * newsWidget.js — Widget de noticias
 * RSS feeds via RSS2JSON API (free, no key needed, 10k req/day)
 * Categorías con múltiples medios seleccionables.
 * La configuración de medios activos se persiste en localStorage.
 */

(function () {
  'use strict';

  var RSS_API = 'https://api.rss2json.com/v1/api.json';
  var CACHE_KEY = 'mozzpcc-news-cache';
  var CACHE_TTL = 10 * 60 * 1000; // 10 minutos
  var SOURCES_KEY = 'mozzpcc-news-sources';

  // --- CATEGORIAS CON FEEDS (sorted alphabetically by category name) ---
  var CATEGORIES = [
    {
      id: 'ar', name: 'Argentina', icon: 'fa-solid fa-location-dot',
      sources: [
        { id: 'tn',     name: 'TN',           url: 'https://tn.com.ar/rss.xml' },
        { id: 'clarin', name: 'Clarin',       url: 'https://www.clarin.com/rss/' },
        { id: 'perfil', name: 'Perfil',       url: 'https://www.perfil.com/feed' },
      ],
    },
    {
      id: 'deportes', name: 'Deportes', icon: 'fa-solid fa-futbol',
      sources: [
        { id: 'ole', name: 'Ole', url: 'https://www.ole.com.ar/rss/' },
      ],
    },
    {
      id: 'gaming', name: 'Gaming', icon: 'fa-solid fa-gamepad',
      sources: [
        { id: 'polygon', name: 'Polygon', url: 'https://www.polygon.com/rss/index.xml' },
      ],
    },
    {
      id: 'tech', name: 'Tecnologia', icon: 'fa-solid fa-microchip',
      sources: [
        { id: 'techcrunch', name: 'TechCrunch', url: 'https://feeds.feedburner.com/TechCrunch/' },
      ],
    },
  ];

  // --- State ---
  var currentCategory = CATEGORIES[0];
  var currentFeed = currentCategory.sources[0];
  var currentView = 'all';
  var isLoading = false;
  var articles = [];

  // --- Active source per category (localStorage) ---
  var activeSources = {};

  function loadActiveSources() {
    try {
      var raw = localStorage.getItem(SOURCES_KEY);
      if (raw) activeSources = JSON.parse(raw);
    } catch (e) { /* ignore */ }
  }

  function saveActiveSources() {
    try {
      localStorage.setItem(SOURCES_KEY, JSON.stringify(activeSources));
    } catch (e) { /* ignore */ }
  }

  function resolveActiveFeed(category) {
    var saved = activeSources[category.id];
    if (saved) {
      var found = category.sources.find(function (s) { return s.id === saved; });
      if (found) return found;
    }
    return category.sources[0];
  }

  loadActiveSources();

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
    CATEGORIES.forEach(function (cat, i) {
      var opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      if (i === 0) opt.selected = true;
      selectEl.appendChild(opt);
    });
    if (feedIconEl) feedIconEl.innerHTML = '<i class="' + CATEGORIES[0].icon + '"></i>';

    selectEl.addEventListener('change', function () {
      currentCategory = CATEGORIES.find(function (c) { return c.id === selectEl.value; }) || CATEGORIES[0];
      currentFeed = resolveActiveFeed(currentCategory);
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

  // --- LOAD FEED ---
  async function loadFeed() {
    if (isLoading || !listEl) return;
    isLoading = true;

    // Check cache first (key by feed source id)
    var cached = getCache(currentFeed.id);
    if (cached) {
      articles = cached;
      renderArticles();
      isLoading = false;
      return;
    }

    showLoading();

    try {
      var res = await fetch(RSS_API + '?rss_url=' + encodeURIComponent(currentFeed.url));
      if (!res.ok) throw new Error('API error');
      var data = await res.json();

      if (data.status !== 'ok' || !data.items || data.items.length === 0) {
        showEmpty('No hay articulos disponibles');
        articles = [];
        isLoading = false;
        return;
      }

      articles = data.items.map(function (item) {
        return {
          title: item.title || '',
          link: item.link || '#',
          description: stripHtml(item.description || ''),
          pubDate: item.pubDate || '',
          thumbnail: item.thumbnail || (item.enclosure ? (item.enclosure.link || '') : ''),
          author: item.author || '',
          source: data.feed ? data.feed.title : currentFeed.name,
        };
      });

      // Cache results
      setCache(currentFeed.id, articles);
      renderArticles();
    } catch (e) {
      console.error('Error loading feed:', e);
      showError('Error al cargar noticias');
      articles = [];
    }

    isLoading = false;
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

      html += '<a class="nw-item" href="' + esc(article.link) + '" target="_blank" rel="noopener" style="animation-delay:' + (i * 0.04) + 's">' +
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
    var featured = articles.slice(0, 5);
    var html = '';

    featured.forEach(function (article, i) {
      var imgHtml = article.thumbnail
        ? '<img class="nw-featured-img" src="' + esc(article.thumbnail) + '" alt="" loading="lazy" onerror="this.outerHTML=\'<div class=\\\'nw-featured-img-placeholder\\\'><i class=\\\'fa-regular fa-image\\\'></i></div>\'">'
        : '<div class="nw-featured-img-placeholder"><i class="fa-regular fa-newspaper"></i></div>';

      var descText = article.description.substring(0, 150);

      html += '<a class="nw-featured-item" href="' + esc(article.link) + '" target="_blank" rel="noopener" style="animation-delay:' + (i * 0.06) + 's">' +
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

  // --- Public API (for settings panel) ---
  window.NewsWidget = {
    getCategories: function () { return CATEGORIES; },
    getActiveSources: function () { return activeSources; },
    setActiveSource: function (categoryId, sourceId) {
      activeSources[categoryId] = sourceId;
      saveActiveSources();
      // If this category is currently selected, reload
      if (currentCategory && currentCategory.id === categoryId) {
        currentFeed = resolveActiveFeed(currentCategory);
        loadFeed();
      }
    },
    reload: function () { loadFeed(); },
    clearCache: function () {
      CATEGORIES.forEach(function (cat) {
        cat.sources.forEach(function (s) {
          localStorage.removeItem(CACHE_KEY + '-' + s.id);
        });
      });
      loadFeed();
    },
  };

  // --- INIT ---
  initSelect();
  loadFeed();
})();
