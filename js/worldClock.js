/**
 * worldClock.js — Widget de reloj mundial con ciudades seleccionables
 * Click en un reloj para cambiar la ciudad. Persiste en localStorage.
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'mozzpcc-world-clocks';
  var MAX_CLOCKS = 3;

  var CITIES = [
    { name: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires', flag: '\u{1F1E6}\u{1F1F7}' },
    { name: 'Santiago', tz: 'America/Santiago', flag: '\u{1F1E8}\u{1F1F1}' },
    { name: 'São Paulo', tz: 'America/Sao_Paulo', flag: '\u{1F1E7}\u{1F1F7}' },
    { name: 'Ciudad de México', tz: 'America/Mexico_City', flag: '\u{1F1F2}\u{1F1FD}' },
    { name: 'Guadalajara', tz: 'America/Mexico_City', flag: '\u{1F1F2}\u{1F1FD}' },
    { name: 'Bogotá', tz: 'America/Bogota', flag: '\u{1F1E8}\u{1F1F4}' },
    { name: 'Lima', tz: 'America/Lima', flag: '\u{1F1F5}\u{1F1EA}' },
    { name: 'New York', tz: 'America/New_York', flag: '\u{1F1FA}\u{1F1F8}' },
    { name: 'Los Ángeles', tz: 'America/Los_Angeles', flag: '\u{1F1FA}\u{1F1F8}' },
    { name: 'Toronto', tz: 'America/Toronto', flag: '\u{1F1E8}\u{1F1E6}' },
    { name: 'Londres', tz: 'Europe/London', flag: '\u{1F1EC}\u{1F1E7}' },
    { name: 'Madrid', tz: 'Europe/Madrid', flag: '\u{1F1EA}\u{1F1F8}' },
    { name: 'París', tz: 'Europe/Paris', flag: '\u{1F1EB}\u{1F1F7}' },
    { name: 'Berlín', tz: 'Europe/Berlin', flag: '\u{1F1E9}\u{1F1EA}' },
    { name: 'Roma', tz: 'Europe/Rome', flag: '\u{1F1EE}\u{1F1F9}' },
    { name: 'Moscú', tz: 'Europe/Moscow', flag: '\u{1F1F7}\u{1F1FA}' },
    { name: 'Dubái', tz: 'Asia/Dubai', flag: '\u{1F1E6}\u{1F1EA}' },
    { name: 'Tokio', tz: 'Asia/Tokyo', flag: '\u{1F1EF}\u{1F1F5}' },
    { name: 'Shanghái', tz: 'Asia/Shanghai', flag: '\u{1F1E8}\u{1F1F3}' },
    { name: 'Seúl', tz: 'Asia/Seoul', flag: '\u{1F1F0}\u{1F1F7}' },
    { name: 'Sídney', tz: 'Australia/Sydney', flag: '\u{1F1E6}\u{1F1FA}' },
    { name: 'Auckland', tz: 'Pacific/Auckland', flag: '\u{1F1F3}\u{1F1FF}' }
  ];

  var selectedCities = [];

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) selectedCities = JSON.parse(raw);
    } catch (e) { selectedCities = []; }
    selectedCities = selectedCities.filter(function (tz) {
      return CITIES.some(function (c) { return c.tz === tz; });
    });
    if (selectedCities.length === 0) {
      selectedCities = ['America/New_York', 'Europe/London', 'Asia/Tokyo'];
      save();
    }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCities)); } catch (e) {}
  }

  function info(tz) { return CITIES.find(function (c) { return c.tz === tz; }); }

  function timeStr(tz) {
    return new Date().toLocaleTimeString('es-AR', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  function dateStr(tz) {
    return new Date().toLocaleDateString('es-AR', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' });
  }

  function offsetStr(tz) {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
      var p = parts.find(function (x) { return x.type === 'timeZoneName'; });
      return p ? p.value : '';
    } catch (e) { return ''; }
  }

  // --- Render ---
  function render() {
    var el = document.getElementById('world-clock-list');
    if (!el) return;
    var h = '';
    for (var i = 0; i < selectedCities.length; i++) {
      var c = info(selectedCities[i]);
      if (!c) continue;
      h += '<div class="wc-item" data-idx="' + i + '">' +
        '<div class="wc-info">' +
        '<span class="wc-flag">' + c.flag + '</span>' +
        '<div class="wc-details">' +
        '<span class="wc-city">' + c.name + '</span>' +
        '<span class="wc-meta">' + dateStr(c.tz) + ' &middot; ' + offsetStr(c.tz) + '</span>' +
        '</div></div>' +
        '<span class="wc-time">' + timeStr(c.tz) + '</span></div>';
    }
    if (selectedCities.length < MAX_CLOCKS) {
      h += '<div class="wc-add" id="wc-add"><i class="fa-solid fa-plus"></i> Agregar reloj</div>';
    }
    el.innerHTML = h;

    // Events
    var addBtn = document.getElementById('wc-add');
    if (addBtn) addBtn.addEventListener('click', function (e) { e.stopPropagation(); openPicker(-1); });
    el.querySelectorAll('.wc-item').forEach(function (item) {
      item.addEventListener('click', function (e) { e.stopPropagation(); openPicker(parseInt(item.dataset.idx)); });
    });
  }

  // --- City picker dropdown ---
  function openPicker(idx) {
    closePicker();
    var dd = document.createElement('div');
    dd.className = 'wc-dropdown';
    dd.id = 'wc-picker';
    dd.innerHTML = '<input type="text" class="wc-search" placeholder="Buscar ciudad..." autocomplete="off">';
    var list = document.createElement('div');
    list.className = 'wc-list';

    var available = CITIES.filter(function (c) {
      if (idx >= 0 && selectedCities[idx] === c.tz) return true;
      return selectedCities.indexOf(c.tz) === -1;
    });

    available.forEach(function (city) {
      var opt = document.createElement('div');
      opt.className = 'wc-opt';
      opt.innerHTML = '<span class="wc-opt-flag">' + city.flag + '</span>' +
        '<span class="wc-opt-name">' + city.name + '</span>' +
        '<span class="wc-opt-tz">' + offsetStr(city.tz) + '</span>';
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        if (idx >= 0) selectedCities[idx] = city.tz;
        else selectedCities.push(city.tz);
        save();
        closePicker();
        render();
      });
      list.appendChild(opt);
    });

    dd.appendChild(list);
    var widget = document.getElementById('widget-world-clock');
    if (widget) widget.appendChild(dd);

    var search = dd.querySelector('.wc-search');
    search.addEventListener('input', function () {
      var q = search.value.toLowerCase();
      list.querySelectorAll('.wc-opt').forEach(function (o) {
        var name = o.querySelector('.wc-opt-name').textContent.toLowerCase();
        o.style.display = name.indexOf(q) !== -1 ? '' : 'none';
      });
    });

    setTimeout(function () { search.focus(); }, 10);

    // Close on outside click
    function handler(e) {
      if (!dd.contains(e.target)) { closePicker(); document.removeEventListener('click', handler); }
    }
    setTimeout(function () { document.addEventListener('click', handler); }, 20);
  }

  function closePicker() {
    var old = document.getElementById('wc-picker');
    if (old) old.remove();
  }

  // --- Tick each second ---
  function tick() {
    var el = document.getElementById('world-clock-list');
    if (!el) return;
    var items = el.querySelectorAll('.wc-item');
    items.forEach(function (item, i) {
      if (i >= selectedCities.length) return;
      var c = info(selectedCities[i]);
      if (!c) return;
      var timeEl = item.querySelector('.wc-time');
      var metaEl = item.querySelector('.wc-meta');
      if (timeEl) timeEl.textContent = timeStr(c.tz);
      if (metaEl) metaEl.textContent = dateStr(c.tz) + ' \u00B7 ' + offsetStr(c.tz);
    });
  }

  // --- Init (no auth needed) ---
  function init() {
    load();
    render();
    setInterval(tick, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
