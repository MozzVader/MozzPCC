/**
 * dollar.js — Widget de cotización del dólar (Oficial) con sparkline
 * API Bluelytics: /v2/latest (cotización actual) + /v2/evolution (historial)
 * El sparkline muestra los últimos ~30 días de evolución
 */

(function () {
  'use strict';

  var HISTORY_KEY = 'mozzpcc-dollar-evolution';
  var CACHE_MS = 60 * 60 * 1000;
  var REFRESH_MS = 30 * 60 * 1000;
  var API_LATEST = 'https://api.bluelytics.com.ar/v2/latest';
  var API_EVOLUTION = 'https://api.bluelytics.com.ar/v2/evolution.json';

  var dollarData = null;
  var evolution = [];
  var evolutionLoaded = false;

  // --- Historial en localStorage (evolución diaria) ---
  function loadEvolution() {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {}
  }

  function saveEvolution() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify({ ts: Date.now(), values: evolution }));
    } catch (e) {}
  }

  // --- Fetch evolución diaria ---
  async function fetchEvolution() {
    if (evolutionLoaded) return;
    try {
      var res = await fetch(API_EVOLUTION);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();

      // Buscar serie "Oficial" en la respuesta
      var oficialSerie = null;
      if (Array.isArray(data)) {
        oficialSerie = data.filter(function (s) { return s.source === 'Oficial'; });
      }

      if (oficialSerie && oficialSerie.length > 0) {
        evolution = oficialSerie.slice(0, 30).reverse().map(function (v) {
          return { d: v.date, v: v.value_buy || 0 };
        });
        saveEvolution();
        evolutionLoaded = true;
      }
    } catch (e) {
      console.warn('[Dólar] Error evolución:', e.message);
    }
  }

  // --- Fetch cotización actual ---
  async function fetchLatest() {
    try {
      var res = await fetch(API_LATEST);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      dollarData = await res.json();
      render();
    } catch (e) {
      console.warn('[Dólar] Error:', e.message);
      renderError();
    }
  }

  // --- Sparkline SVG ---
  function sparklineSVG() {
    if (evolution.length < 2) return '';
    var vals = evolution.map(function (p) { return p.v; });
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
    if (evolution.length < 2) return { dir: 'neutral', diff: 0, pct: 0 };
    var first = evolution[0].v;
    var last = evolution[evolution.length - 1].v;
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

    var oficial = dollarData.oficial;
    var lastUpdate = dollarData.last_update;
    var t = trendInfo();
    var tIcon = t.dir === 'up' ? 'fa-arrow-trend-up' : t.dir === 'down' ? 'fa-arrow-trend-down' : 'fa-minus';
    var tColor = t.dir === 'up' ? '#22c55e' : t.dir === 'down' ? '#ef4444' : 'var(--text-muted)';

    var h = '';

    if (oficial) {
      h += '<div class="dollar-main">';
      h += '<div class="dollar-rate-main">';
      h += '<span class="dollar-buy">' + fmt(oficial.value_buy) + '</span>';
      h += '<span class="dollar-sep">/</span>';
      h += '<span class="dollar-sell">' + fmt(oficial.value_sell) + '</span>';
      h += '</div>';
      h += '<div class="dollar-trend" style="color:' + tColor + '">';
      h += '<i class="fa-solid ' + tIcon + '"></i>';
      h += '<span>' + (t.diff >= 0 ? '+' : '') + t.pct.toFixed(1) + '%</span>';
      h += '</div></div>';
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

  // --- Init ---
  async function init() {
    loadEvolution();
    renderLoading(document.getElementById('dollar-content'));

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
