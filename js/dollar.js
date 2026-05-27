/**
 * dollar.js — Widget de cotización del dólar con sparkline
 * API Bluelytics: /v2/latest (cotización actual) + /v2/evolution (historial)
 * Soporta: Oficial, Blue, MEP/TCCL, CCL
 */

(function () {
  'use strict';

  var TYPE_KEY = 'mozzpcc-dollar-type';
  var REFRESH_MS = 30 * 60 * 1000;
  var API_LATEST = 'https://api.bluelytics.com.ar/v2/latest';
  var API_EVOLUTION = 'https://api.bluelytics.com.ar/v2/evolution.json';
  var DOLLAR_CACHE_TTL = 30 * 60 * 1000; // 30 minutos

  var dollarData = null;
  var evolution = [];
  var evolutionLoaded = false;
  var activeType = 'oficial';

  // Available dollar types
  var DOLLAR_TYPES = [
    { id: 'oficial', label: 'Oficial' },
    { id: 'blue',    label: 'Blue' },
    { id: 'mep',     label: 'MEP' },
    { id: 'ccl',     label: 'CCL' }
  ];

  // Map type id to Bluelytics data key
  function dataKey(typeId) {
    return typeId; // oficial, blue, mep, ccl match Bluelytics keys
  }

  // --- Persistencia ---
  function loadTypePreference() {
    try {
      var saved = localStorage.getItem(TYPE_KEY);
      if (saved && DOLLAR_TYPES.some(function(t) { return t.id === saved; })) {
        activeType = saved;
      }
    } catch (e) {}
  }

  function saveTypePreference() {
    try { localStorage.setItem(TYPE_KEY, activeType); } catch (e) {}
  }

  // --- Fetch evolución diaria ---
  async function fetchEvolution() {
    if (evolutionLoaded) return;
    try {
      // Intentar cache
      var cachedEvo = apiCacheGet('dollar_evolution');
      var data;

      if (cachedEvo) {
        data = cachedEvo;
      } else {
        var res = await fetch(API_EVOLUTION);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        data = await res.json();
        apiCacheSet('dollar_evolution', data, DOLLAR_CACHE_TTL);
      }

      // Build evolution per type
      var seriesMap = {};
      if (Array.isArray(data)) {
        DOLLAR_TYPES.forEach(function(t) {
          seriesMap[t.id] = data
            .filter(function(s) {
              return s.source === t.label || s.source === t.id;
            })
            .slice(0, 30)
            .reverse()
            .map(function(v) {
              return { d: v.date, v: v.value_buy || 0 };
            });
        });
      }

      evolution = seriesMap;
      evolutionLoaded = true;
    } catch (e) {
      console.warn('[Dólar] Error evolución:', e.message);
    }
  }

  // --- Fetch cotización actual ---
  async function fetchLatest() {
    try {
      // Intentar cache
      var cached = apiCacheGet('dollar_latest');
      if (cached) {
        dollarData = cached;
        render();
        return;
      }

      var res = await fetch(API_LATEST);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      dollarData = await res.json();
      apiCacheSet('dollar_latest', dollarData, DOLLAR_CACHE_TTL);
      render();
    } catch (e) {
      console.warn('[Dólar] Error:', e.message);
      renderError();
    }
  }

  // --- Sparkline SVG ---
  function sparklineSVG() {
    var evo = evolution[activeType] || evolution.oficial || [];
    if (evo.length < 2) return '';
    var vals = evo.map(function (p) { return p.v; });
    var min = Math.min.apply(null, vals);
    var max = Math.max.apply(null, vals);
    var range = max - min || 1;
    var W = 200, H = 48;
    var pts = vals.map(function (v, i) {
      var x = (i / (vals.length - 1)) * W;
      var y = H - 3 - ((v - min) / range) * (H - 6);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    var area = '0,' + H + ' ' + pts + ' ' + W + ',' + H;
    var up = vals[vals.length - 1] >= vals[0];
    var col = up ? '#22c55e' : '#ef4444';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="dollar-sparkline">' +
      '<polygon points="' + area + '" fill="' + col + '" opacity="0.08"/>' +
      '<polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  // --- Tendencia ---
  function trendInfo() {
    var evo = evolution[activeType] || evolution.oficial || [];
    if (evo.length < 2) return { dir: 'neutral', diff: 0, pct: 0 };
    var first = evo[0].v;
    var last = evo[evo.length - 1].v;
    var diff = last - first;
    var pct = first > 0 ? ((diff / first) * 100) : 0;
    return { dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral', diff: diff, pct: pct };
  }

  // --- Formato ---
  function fmt(n) {
    return '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // --- Render ---
  function render() {
    var el = document.getElementById('dollar-content');
    if (!el) return;
    if (!dollarData) { renderLoading(el); return; }

    var key = dataKey(activeType);
    var rate = dollarData[key];
    var lastUpdate = dollarData.last_update;
    var t = trendInfo();
    var tIcon = t.dir === 'up' ? 'fa-arrow-trend-up' : t.dir === 'down' ? 'fa-arrow-trend-down' : 'fa-minus';
    var tColor = t.dir === 'up' ? '#22c55e' : t.dir === 'down' ? '#ef4444' : 'var(--text-muted)';

    var h = '';

    if (rate) {
      h += '<div class="dollar-main">';
      h += '<div class="dollar-rate-main">';
      h += '<span class="dollar-buy">' + fmt(rate.value_buy) + '</span>';
      h += '<span class="dollar-sep">/</span>';
      h += '<span class="dollar-sell">' + fmt(rate.value_sell) + '</span>';
      h += '</div>';
      h += '<div class="dollar-trend" style="color:' + tColor + '">';
      h += '<i class="fa-solid ' + tIcon + '"></i>';
      h += '<span>' + (t.diff >= 0 ? '+' : '') + t.pct.toFixed(1) + '%</span>';
      h += '</div></div>';
    } else {
      h += '<div class="dollar-main"><div class="dollar-rate-main" style="color:var(--text-muted)">No disponible</div></div>';
    }

    // Sparkline
    var sp = sparklineSVG();
    if (sp) {
      h += '<div class="dollar-sparkline-wrap">' + sp + '</div>';
    }

    // Actualizado
    if (lastUpdate) {
      var d = new Date(lastUpdate);
      var timeStr = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      h += '<div class="dollar-updated">Actualizado: ' + timeStr + '</div>';
    }

    el.innerHTML = h;
  }

  function renderLoading(el) {
    if (!el) return;
    el.innerHTML = '<div class="dollar-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>';
  }

  function renderError() {
    var el = document.getElementById('dollar-content');
    if (!el) return;
    el.innerHTML = '<div class="dollar-error">No se pudo obtener la cotización</div>';
  }

  // --- Dropdown de tipo de dólar ---
  function initDropdown() {
    var header = document.querySelector('.widget-dollar .card-header');
    if (!header) return;

    // Make header a flex row with space-between
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';

    // Wrap icon + title
    var icon = header.querySelector('i');
    var title = header.querySelector('h2');
    var leftWrap = document.createElement('div');
    leftWrap.style.display = 'flex';
    leftWrap.style.alignItems = 'center';
    leftWrap.style.gap = '8px';
    if (icon) leftWrap.appendChild(icon);
    if (title) leftWrap.appendChild(title);

    // Build dropdown
    var dropdown = document.createElement('div');
    dropdown.className = 'dollar-type-dropdown';
    dropdown.id = 'dollar-type-dropdown';

    var btn = document.createElement('button');
    btn.className = 'dollar-type-btn';
    btn.id = 'dollar-type-btn';
    var activeLabel = DOLLAR_TYPES.find(function(t) { return t.id === activeType; });
    btn.innerHTML = (activeLabel ? activeLabel.label : 'Oficial') + ' <i class="fa-solid fa-chevron-down"></i>';

    var menu = document.createElement('div');
    menu.className = 'dollar-type-menu';
    menu.id = 'dollar-type-menu';

    DOLLAR_TYPES.forEach(function(t) {
      var opt = document.createElement('button');
      opt.className = 'dollar-type-option' + (t.id === activeType ? ' active' : '');
      opt.dataset.type = t.id;
      opt.textContent = t.label;
      opt.addEventListener('click', function(e) {
        e.stopPropagation();
        activeType = t.id;
        saveTypePreference();
        btn.innerHTML = t.label + ' <i class="fa-solid fa-chevron-down"></i>';
        menu.querySelectorAll('.dollar-type-option').forEach(function(o) {
          o.classList.toggle('active', o.dataset.type === t.id);
        });
        closeAllDollarMenus();
        render();
      });
      menu.appendChild(opt);
    });

    dropdown.appendChild(btn);
    dropdown.appendChild(menu);

    // Toggle menu
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = menu.classList.contains('open');
      closeAllDollarMenus();
      if (!isOpen) {
        menu.classList.add('open');
      }
    });

    // Close on outside click
    document.addEventListener('click', closeAllDollarMenus);

    // Assemble header
    header.innerHTML = '';
    header.appendChild(leftWrap);
    header.appendChild(dropdown);
  }

  function closeAllDollarMenus() {
    var menu = document.getElementById('dollar-type-menu');
    if (menu) menu.classList.remove('open');
  }

  // --- Init ---
  async function init() {
    loadTypePreference();
    renderLoading(document.getElementById('dollar-content'));
    initDropdown();

    // Cargar evolución (historial) y luego la cotización actual
    await fetchEvolution();
    await fetchLatest();

    // Refresh periódico
    setInterval(function () {
      evolutionLoaded = false;
      fetchEvolution();
      fetchLatest();
    }, REFRESH_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
