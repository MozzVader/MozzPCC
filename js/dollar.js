/**
 * dollar.js — Widget de cotización del dólar en tiempo real
 * Muestra tipos de cambio (Blue, Oficial, MEP, CCL) con sparkline de tendencia
 * API: api.bluelytics.com.ar (gratuita, sin key)
 */

(function () {
  'use strict';

  var HISTORY_KEY = 'mozzpcc-dollar-history';
  var MAX_POINTS = 24;
  var REFRESH_MS = 30 * 60 * 1000;
  var API_URL = 'https://api.bluelytics.com.ar/v2/latest';

  var dollarData = null;
  var history = [];

  // --- Historial en localStorage ---
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (raw) history = JSON.parse(raw);
    } catch (e) { history = []; }
  }

  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) {}
  }

  function addPoint(price) {
    var now = Date.now();
    if (history.length > 0 && (now - history[history.length - 1].t) < 15 * 60 * 1000) return;
    history.push({ t: now, v: price });
    if (history.length > MAX_POINTS) history.shift();
    saveHistory();
  }

  // --- Fetch API ---
  async function fetchData() {
    try {
      var res = await fetch(API_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      dollarData = await res.json();
      if (dollarData.oficial) addPoint(dollarData.oficial.value_buy);
      render();
    } catch (e) {
      console.warn('[Dólar] Error:', e.message);
      renderError();
    }
  }

  // --- Sparkline SVG ---
  function sparkline() {
    if (history.length < 2) return '';
    var vals = history.map(function (p) { return p.v; });
    var min = Math.min.apply(null, vals);
    var max = Math.max.apply(null, vals);
    var range = max - min || 1;
    var W = 120, H = 32;
    var pts = vals.map(function (v, i) {
      var x = (i / (vals.length - 1)) * W;
      var y = H - 2 - ((v - min) / range) * (H - 4);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    var area = '0,' + H + ' ' + pts + ' ' + W + ',' + H;
    var up = vals[vals.length - 1] >= vals[0];
    var col = up ? '#22c55e' : '#ef4444';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="dollar-sparkline">' +
      '<polygon points="' + area + '" fill="' + col + '" opacity="0.1"/>' +
      '<polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  // --- Tendencia ---
  function trend() {
    if (history.length < 2) return { dir: 'neutral', diff: 0 };
    var d = history[history.length - 1].v - history[0].v;
    return { dir: d > 0 ? 'up' : d < 0 ? 'down' : 'neutral', diff: d };
  }

  // --- Formato ---
  function fmt(n) {
    return '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtShort(n) {
    return '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // --- Render ---
  function render() {
    var el = document.getElementById('dollar-content');
    if (!el || !dollarData) { renderLoading(el); return; }

    var t = trend();
    var tIcon = t.dir === 'up' ? 'fa-arrow-trend-up' : t.dir === 'down' ? 'fa-arrow-trend-down' : 'fa-minus';
    var tColor = t.dir === 'up' ? '#22c55e' : t.dir === 'down' ? '#ef4444' : 'var(--text-muted)';

    var blue = dollarData.blue;
    var oficial = dollarData.oficial;
    var mep = dollarData.mep;
    var ccl = dollarData.ccl;
    var lastUpdate = dollarData.last_update;

    var h = '';

    // Rate principal: Oficial
    if (oficial) {
      h += '<div class="dollar-main">';
      h += '<div class="dollar-rate-main">';
      h += '<span class="dollar-type">Oficial</span>';
      h += '<div class="dollar-prices">';
      h += '<span class="dollar-buy">' + fmt(oficial.value_buy) + '</span>';
      h += '<span class="dollar-sep">/</span>';
      h += '<span class="dollar-sell">' + fmt(oficial.value_sell) + '</span>';
      h += '</div></div>';
      h += '<div class="dollar-trend" style="color:' + tColor + '">';
      h += '<i class="fa-solid ' + tIcon + '"></i>';
      if (t.diff !== 0) h += '<span>' + (t.diff > 0 ? '+' : '') + t.diff.toFixed(2) + '</span>';
      h += '</div></div>';
    }

    // Sparkline
    var sp = sparkline();
    if (sp) h += '<div class="dollar-sparkline-wrap">' + sp + '</div>';

    // Otras cotizaciones
    h += '<div class="dollar-others">';
    if (blue) h += rateRow('Blue', blue.value_buy, blue.value_sell);
    if (mep) h += rateRow('MEP', mep.value_buy, mep.value_sell);
    if (ccl) h += rateRow('CCL', ccl.value_buy, ccl.value_sell);
    h += '</div>';

    // Última actualización
    if (lastUpdate) {
      var d = new Date(lastUpdate);
      var timeStr = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      h += '<div class="dollar-updated">Actualizado: ' + timeStr + '</div>';
    }

    el.innerHTML = h;
  }

  function rateRow(name, buy, sell) {
    return '<div class="dollar-rate-row">' +
      '<span class="dr-name">' + name + '</span>' +
      '<span class="dr-vals">' + fmtShort(buy) + ' / ' + fmtShort(sell) + '</span></div>';
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

  // --- Init (no requiere auth) ---
  function init() {
    loadHistory();
    renderLoading(document.getElementById('dollar-content'));
    fetchData();
    setInterval(fetchData, REFRESH_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
