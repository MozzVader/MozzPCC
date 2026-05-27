/**
 * sportsWidget.js — Widget de deportes
 * Resultados en vivo y posiciones via ESPN Public API
 * No requiere autenticación ni API key
 */

(function () {
  'use strict';

  var API = 'https://site.api.espn.com/apis/site/v2/sports';

  // --- LEAGUES (sorted alphabetically by name) ---
  var LEAGUES = [
    { id: 'soccer/arg.1',                name: 'Liga Profesional',     code: 'AR',  flag: '\u{1F1E6}\u{1F1F7}' },
    { id: 'soccer/conmebol.libertadores', name: 'Copa Libertadores',    code: 'CON', flag: '\u{1F3C6}' },
    { id: 'soccer/conmebol.sudamericana', name: 'Copa Sudamericana',    code: 'CON', flag: '\u{1F3C6}' },
    { id: 'soccer/eng.1',                name: 'Premier League',       code: 'EN',  flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}' },
    { id: 'soccer/esp.1',                name: 'La Liga',              code: 'ES',  flag: '\u{1F1EA}\u{1F1F8}' },
    { id: 'soccer/ita.1',                name: 'Serie A',              code: 'IT',  flag: '\u{1F1EE}\u{1F1F9}' },
    { id: 'soccer/uefa.champions',       name: 'Champions League',     code: 'UCL', flag: '\u{1F3C6}' },
    { id: 'soccer/mex.1',                name: 'Liga MX',              code: 'MX',  flag: '\u{1F1F2}\u{1F1FD}' },
    { id: 'soccer/usa.1',                name: 'MLS',                  code: 'US',  flag: '\u{1F1FA}\u{1F1F8}' },
    { id: 'basketball/nba',              name: 'NBA',                  code: 'NBA', flag: '\u{1F3C0}' },
  ];

  var currentLeague = LEAGUES[0].id;
  var currentDate = new Date();
  var isLoading = false;
  var SPORTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  // --- DOM ---
  var selectEl = document.getElementById('sp-league-select');
  var matchList = document.getElementById('sp-match-list');
  var standingsDiv = document.getElementById('sp-standings-list');
  var dateLabel = document.getElementById('sp-date-label');
  var flagEl = document.getElementById('sp-league-flag');

  // --- TWEMOJI HELPER ---
  function updateFlag(flagEmoji) {
    if (!flagEl) return;
    flagEl.innerHTML = flagEmoji;
    if (window.twemoji) {
      twemoji.parse(flagEl, {
        base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',
        folder: 'svg', ext: '.svg', size: 'svg'
      });
    }
  }

  // --- INIT LEAGUE SELECT ---
  function initSelect() {
    if (!selectEl) return;
    LEAGUES.forEach(function (l, i) {
      var opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = '[' + l.code + '] ' + l.name;
      if (i === 0) opt.selected = true;
      selectEl.appendChild(opt);
    });
    updateFlag(LEAGUES[0].flag);
    selectEl.addEventListener('change', function () {
      currentLeague = selectEl.value;
      var league = LEAGUES.find(function (l) { return l.id === currentLeague; });
      if (league) updateFlag(league.flag);
      loadMatches();
      loadStandings();
    });
  }

  // --- TABS ---
  var tabs = document.querySelectorAll('.sp-tab');
  var contents = document.querySelectorAll('.sp-tab-content');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.dataset.tab;
      tabs.forEach(function (t) { t.classList.remove('active'); });
      contents.forEach(function (c) { c.classList.remove('active'); });
      tab.classList.add('active');
      var targetEl = document.getElementById('sp-tab-' + target);
      if (targetEl) targetEl.classList.add('active');
    });
  });

  // --- DATE NAVIGATION ---
  function formatDate(date) {
    var today = new Date();
    var yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    var tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
    if (date.toDateString() === tomorrow.toDateString()) return 'Manana';

    var days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    var months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return days[date.getDay()] + ' ' + date.getDate() + ' ' + months[date.getMonth()];
  }

  function dateStr(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + m + day;
  }

  var prevBtn = document.getElementById('sp-date-prev');
  var nextBtn = document.getElementById('sp-date-next');
  if (prevBtn) prevBtn.addEventListener('click', function () { currentDate.setDate(currentDate.getDate() - 1); loadMatches(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { currentDate.setDate(currentDate.getDate() + 1); loadMatches(); });

  // --- TIME HELPERS ---
  function formatTime(isoStr) {
    var d = new Date(isoStr);
    var h = d.getHours();
    var m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  // --- ESCAPE ---
  function esc(text) {
    var d = document.createElement('div');
    d.textContent = text || '';
    return d.innerHTML;
  }

  // --- LOAD MATCHES ---
  async function loadMatches() {
    if (isLoading || !matchList || !dateLabel) return;
    isLoading = true;

    dateLabel.textContent = formatDate(currentDate);
    matchList.innerHTML = '<div class="sp-loading"><i class="fa-solid fa-spinner fa-spin"></i><span>Cargando partidos...</span></div>';

    try {
      var cacheKey = 'sports_matches_' + currentLeague + '_' + dateStr(currentDate);

      // Intentar cache
      var cached = apiCacheGet(cacheKey);
      var events;

      if (cached) {
        events = cached;
      } else {
        var res = await fetch(API + '/' + currentLeague + '/scoreboard?dates=' + dateStr(currentDate));
        if (!res.ok) throw new Error('API error');
        var data = await res.json();
        events = data.events || [];
        apiCacheSet(cacheKey, events, SPORTS_CACHE_TTL);
      }

      renderMatches(events);
    } catch (e) {
      console.error('Error loading matches:', e);
      matchList.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--red);font-size:0.82rem;">Error al cargar partidos</div>';
    }

    isLoading = false;
  }

  // --- RENDER MATCHES ---
  function renderMatches(events) {
    matchList.innerHTML = '';

    if (events.length === 0) {
      matchList.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);font-size:0.82rem;">No hay partidos para este dia</div>';
      return;
    }

    events.forEach(function (ev) {
      var comp = ev.competitions[0] || {};
      var status = comp.status || {};
      var statusType = status.type || {};
      var state = statusType.state;
      var detail = statusType.shortDetail || statusType.description || '';
      var clock = status.displayClock || '';

      var competitors = (comp.competitors || []).slice().sort(function (a, b) {
        return a.homeAway === 'home' ? -1 : 1;
      });

      var home = competitors[0] || {};
      var away = competitors[1] || {};

      var li = document.createElement('li');
      li.className = 'sp-match-item' + (state === 'in' ? ' live' : '');

      var metaHtml = '';
      if (state === 'in') {
        metaHtml = '<span class="live-dot"></span>' + esc(clock || detail);
      } else if (state === 'pre') {
        metaHtml = '<i class="fa-regular fa-clock"></i> ' + formatTime(ev.date);
      } else {
        metaHtml = detail || 'Finalizado';
      }

      var homeWinner = state === 'post' && parseInt(home.score) > parseInt(away.score);
      var awayWinner = state === 'post' && parseInt(away.score) > parseInt(home.score);

      li.innerHTML =
        '<div class="sp-match-meta">' + metaHtml + '</div>' +
        '<div class="sp-match-teams">' +
          '<div class="sp-team home">' +
            '<img class="sp-team-logo" src="' + (home.team ? home.team.logo : '') + '" alt="" onerror="this.style.display=\'none\'">' +
            '<span class="sp-team-name' + (homeWinner ? ' winner' : '') + (awayWinner ? ' loser' : '') + '">' + esc(home.team ? home.team.shortDisplayName || home.team.displayName : 'Home') + '</span>' +
          '</div>' +
          '<div class="sp-score">' +
            '<span>' + esc(home.score || '-') + '</span>' +
            '<span class="sp-score-dash">-</span>' +
            '<span>' + esc(away.score || '-') + '</span>' +
          '</div>' +
          '<div class="sp-team away">' +
            '<img class="sp-team-logo" src="' + (away.team ? away.team.logo : '') + '" alt="" onerror="this.style.display=\'none\'">' +
            '<span class="sp-team-name' + (awayWinner ? ' winner' : '') + (homeWinner ? ' loser' : '') + '">' + esc(away.team ? away.team.shortDisplayName || away.team.displayName : 'Away') + '</span>' +
          '</div>' +
        '</div>';

      if (state === 'post') {
        var links = (comp.links || []).filter(function (l) { return l.rel.indexOf('recap') > -1 || l.rel.indexOf('summary') > -1; });
        if (links.length > 0) {
          li.style.cursor = 'pointer';
          li.addEventListener('click', function () { window.open(links[0].href, '_blank', 'noopener'); });
        }
      }

      matchList.appendChild(li);
    });
  }

  // --- LOAD STANDINGS ---
  async function loadStandings() {
    if (!standingsDiv) return;
    standingsDiv.innerHTML = '<div class="sp-loading"><i class="fa-solid fa-spinner fa-spin"></i><span>Cargando posiciones...</span></div>';

    try {
      var cacheKey = 'sports_standings_' + currentLeague;

      // Intentar cache
      var cached = apiCacheGet(cacheKey);
      var data;

      if (cached) {
        data = cached;
      } else {
        var res = await fetch(API + '/' + currentLeague + '/standings');
        if (!res.ok) throw new Error('Not found');
        data = await res.json();
        apiCacheSet(cacheKey, data, SPORTS_CACHE_TTL);
      }

      var children = data.children || [];
      if (children.length === 0) {
        standingsDiv.innerHTML = '<div class="sp-standings-note"><i class="fa-solid fa-table-list"></i><span>Posiciones no disponibles para esta liga</span></div>';
        return;
      }

      var group = children[0];
      var entries = (group.standings || {}).entries || [];

      if (entries.length === 0) {
        standingsDiv.innerHTML = '<div class="sp-standings-note"><i class="fa-solid fa-table-list"></i><span>Sin datos de posiciones</span></div>';
        return;
      }

      var html = '<table class="sp-table"><thead><tr>' +
        '<th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th>' +
        '</tr></thead><tbody>';

      entries.forEach(function (entry) {
        var team = entry.team || {};
        var stats = entry.stats || [];
        function stat(name) {
          var s = stats.filter(function (st) { return st.name === name; })[0];
          return s ? s.displayValue : '-';
        }

        var pos = parseInt(entry.rank || entry.standing || '0');
        var posClass = pos <= 4 ? ' top4' : (pos > entries.length - 3 ? ' bot3' : '');

        html += '<tr>' +
          '<td class="pos' + posClass + '">' + pos + '</td>' +
          '<td><div class="team-cell">' +
            '<img src="' + (team.logo || '') + '" alt="" onerror="this.style.display=\'none\'">' +
            '<span>' + esc(team.shortDisplayName || team.displayName || team.abbreviation || '') + '</span>' +
          '</div></td>' +
          '<td>' + stat('gamesPlayed') + '</td>' +
          '<td>' + stat('wins') + '</td>' +
          '<td>' + stat('ties') + '</td>' +
          '<td>' + stat('losses') + '</td>' +
          '<td>' + stat('pointsFor') + '</td>' +
          '<td>' + stat('pointsAgainst') + '</td>' +
          '<td>' + stat('pointsDifferential') + '</td>' +
          '<td style="font-weight:700;color:var(--text-primary)">' + stat('points') + '</td>' +
          '</tr>';
      });

      html += '</tbody></table>';
      standingsDiv.innerHTML = html;
    } catch (e) {
      console.warn('Standings not available:', e);
      standingsDiv.innerHTML = '<div class="sp-standings-note"><i class="fa-solid fa-table-list"></i><span>Posiciones no disponibles temporalmente</span></div>';
    }
  }

  // --- INIT ---
  initSelect();
  loadMatches();
  loadStandings();
})();
