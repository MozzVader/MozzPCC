/**
 * steamStats.js — Steam Stats Widget
 * Muestra perfil, stats y juegos recientes de Steam
 * Usa Edge Function como proxy (evita CORS)
 */

(function () {
  'use strict';

  var loadingEl = document.getElementById('steam-loading');
  var emptyEl = document.getElementById('steam-empty');
  var profileEl = document.getElementById('steam-profile');
  var avatarEl = document.getElementById('steam-avatar');
  var nameEl = document.getElementById('steam-name');
  var statusEl = document.getElementById('steam-status');
  var gameEl = document.getElementById('steam-game');
  var totalGamesEl = document.getElementById('steam-total-games');
  var totalHoursEl = document.getElementById('steam-total-hours');
  var recentSection = document.getElementById('steam-recent-section');
  var recentGamesEl = document.getElementById('steam-recent-games');

  var SUPABASE_URL = 'https://diaezbthqjvroexesbrr.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpYWV6YnRocWp2cm9leGVzYnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjExMDgsImV4cCI6MjA5Mjg5NzEwOH0.G2VeKwY5to87N0_FoHm_5SdnwQFWY636TeFPU4dmz84';
  var FUNCTION_URL = SUPABASE_URL + '/functions/v1/steam-proxy';
  var userId = null;

  function getSupabase() {
    return window.supabaseClient || null;
  }

  // --- Carga Steam ID desde Supabase ---
  async function loadSteamId() {
    var client = getSupabase();
    if (!client || !userId) return null;

    try {
      var result = await client
        .from('user_steam_settings')
        .select('steam_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (result.error) {
        console.warn('MozzPCC: Error cargando Steam ID:', result.error);
        return null;
      }
      return result.data ? result.data.steam_id : null;
    } catch (e) {
      console.warn('MozzPCC: Error cargando Steam ID:', e);
      return null;
    }
  }

  // --- Fetch via Edge Function ---
  async function fetchSteamData(steamId) {
    var url = FUNCTION_URL + '?steam_id=' + encodeURIComponent(steamId);
    var res = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      }
    });
    if (!res.ok) {
      var err = await res.json().catch(function () { return { error: 'Network error' }; });
      throw new Error(err.error || 'Error ' + res.status);
    }
    return res.json();
  }

  // --- Render ---
  var STATUS_MAP = {
    0: { text: 'Offline', cls: 'offline' },
    1: { text: 'Online', cls: 'online' },
    2: { text: 'Ocupado', cls: 'away' },
    3: { text: 'Ausente', cls: 'away' },
    4: { text: 'No molestar', cls: 'away' },
    5: { text: 'Buscando tradeo', cls: 'online' },
    6: { text: 'Buscando partida', cls: 'online' }
  };

  function showView(view) {
    loadingEl.style.display = view === 'loading' ? 'block' : 'none';
    emptyEl.style.display = view === 'empty' ? 'block' : 'none';
    profileEl.style.display = view === 'profile' ? 'block' : 'none';
  }

  function renderProfile(data) {
    var p = data.profile;

    avatarEl.src = p.avatar;
    nameEl.textContent = p.personaName;
    nameEl.title = p.personaName;

    if (p.gameName) {
      statusEl.textContent = STATUS_MAP[p.onlineState] ? STATUS_MAP[p.onlineState].text : 'Online';
      statusEl.className = 'steam-status in-game';
      gameEl.innerHTML = '<i class="fa-solid fa-gamepad"></i> ' + escapeHtml(p.gameName);
      gameEl.style.display = 'inline';
    } else {
      var s = STATUS_MAP[p.onlineState] || STATUS_MAP[0];
      statusEl.textContent = s.text;
      statusEl.className = 'steam-status ' + s.cls;
      gameEl.style.display = 'none';
    }

    totalGamesEl.textContent = data.totalGames.toLocaleString();
    totalHoursEl.textContent = data.totalHours.toLocaleString() + 'h';

    // Recent games
    if (data.recentGames && data.recentGames.length > 0) {
      recentSection.style.display = 'block';
      recentGamesEl.innerHTML = '';

      data.recentGames.forEach(function (game) {
        var item = document.createElement('div');
        item.className = 'steam-recent-game';

        var iconHtml = '';
        if (game.imgIconUrl) {
          iconHtml = '<img class="steam-game-icon" src="' + escapeAttr(game.imgIconUrl) + '" alt="" onerror="this.outerHTML=\'<div class=steam-game-icon-placeholder><i class=fa-solid fa-gamepad></i></div>\'">';
        } else {
          iconHtml = '<div class="steam-game-icon-placeholder"><i class="fa-solid fa-gamepad"></i></div>';
        }

        var hoursText = '';
        if (game.playtime2weeks > 0) {
          hoursText = game.playtime2weeks + 'h recientes / ' + game.playtimeForever + 'h total';
        } else {
          hoursText = game.playtimeForever + 'h total';
        }

        item.innerHTML =
          iconHtml +
          '<div class="steam-game-info">' +
            '<div class="steam-game-name">' + escapeHtml(game.name) + '</div>' +
            '<div class="steam-game-hours">' + hoursText + '</div>' +
          '</div>';

        item.addEventListener('click', function () {
          window.open('https://store.steampowered.com/app/' + game.appId, '_blank');
        });

        recentGamesEl.appendChild(item);
      });
    } else {
      recentSection.style.display = 'none';
    }

    // Refresh button
    var existingBtn = profileEl.querySelector('.steam-refresh-btn');
    if (!existingBtn) {
      var btn = document.createElement('button');
      btn.className = 'steam-refresh-btn';
      btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Actualizar';
      btn.addEventListener('click', function () {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Actualizando...';
        loadSteamWidget();
      });
      profileEl.appendChild(btn);
    }
  }

  // --- Load ---
  async function loadSteamWidget() {
    showView('loading');

    var steamId = await loadSteamId();
    if (!steamId) {
      showView('empty');
      return;
    }

    try {
      var data = await fetchSteamData(steamId);
      showView('profile');
      renderProfile(data);
    } catch (e) {
      console.warn('MozzPCC: Steam error:', e);
      showView('empty');
      emptyEl.querySelector('p').innerHTML = 'Error al cargar: ' + escapeHtml(e.message);
    }
  }

  // --- Helpers ---
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeAttr(text) {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- Auth events ---
  window.addEventListener('auth:ready', function (e) {
    userId = e.detail.userId;
    loadSteamWidget();
  });

  window.addEventListener('auth:logout', function () {
    userId = null;
    showView('empty');
    emptyEl.querySelector('p').innerHTML = 'Configura tu Steam ID en <strong>Ajustes</strong>';
  });

  // --- API pública ---
  window.SteamStats = {
    load: loadSteamWidget
  };
})();
