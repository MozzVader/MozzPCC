/**
 * newsWidget.js — Widget de noticias
 * RSS feeds via RSS2JSON API (free, no key needed, 10k req/day)
 * Approach A: un medio por categoría (configurable en settings)
 */

(function () {
  'use strict';

  var RSS_API = 'https://api.rss2json.com/v1/api.json';
  var CACHE_KEY = 'mozzpcc-news-cache';
  var CACHE_TTL = 10 * 60 * 1000; // 10 minutos

  // --- FEEDS (sorted alphabetically) ---
  var FEEDS = [
    { id: 'ar',       name: 'Argentina',   icon: 'fa-solid fa-location-dot',  url: 'https://www.infobae.com/rss/' },
    { id: 'gaming',   name: 'Gaming',      icon: 'fa-solid fa-gamepad',       url: 'https://www.polygon.com/rss/index.xml' },
    { id: 'sports',   name: 'Deportes',    icon: 'fa-solid fa-futbol',        url: 'https://www.ole.com.ar/rss/' },
    { id: 'tech',     name: 'Tecnologia',  icon: 'fa-solid fa-microchip',     url: 'https://feeds.feedburner.com/TechCrunch/' },
  ];

  var currentFeed = FEEDS[0];
  var currentView = 'all';
  var isLoading = false;
  var articles = [];

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

  // --- INIT FEED SELECT ---
  function initSelect() {
    if (!selectEl) return;
    FEEDS.forEach(function (f, i) {
      var opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.name;
      if (i === 0) opt.selected = true;
      selectEl.appendChild(opt);
    });
    if (feedIconEl) feedIconEl.innerHTML = '<i class="' + FEEDS[0].icon + '"></i>';

    selectEl.addEventListener('change', function () {
      currentFeed = FEEDS.find(function (f) { return f.id === selectEl.value; }) || FEEDS[0];
      if (feedIconEl) feedIconEl.innerHTML = '<i class="' + currentFeed.icon + '"></i>';
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

    // Check cache first
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

  // --- INIT ---
  initSelect();
  loadFeed();
})();
