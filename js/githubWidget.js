/**
 * githubWidget.js — GitHub widget for MozzPCC dashboard
 * Shows profile, activity, repos, and trending repos
 * Uses GitHub REST API (public, no auth, 60 req/hr)
 * Reads github_username from Supabase user_preferences table
 */

(function() {
  'use strict';

  var API = 'https://api.github.com';
  var loadingEl, emptyEl, profileEl;
  var userId = null;

  // --- Cache & Rate Limit ---
  var CACHE_PREFIX = 'mozzpcc_gh_';
  var CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  var rateLimited = false;

  function cacheKey(url) {
    return CACHE_PREFIX + url;
  }

  function getCached(url) {
    try {
      var raw = sessionStorage.getItem(cacheKey(url));
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (Date.now() - entry.ts < CACHE_TTL) return entry.data;
      sessionStorage.removeItem(cacheKey(url));
      return null;
    } catch(e) { return null; }
  }

  function setCache(url, data) {
    try {
      sessionStorage.setItem(cacheKey(url), JSON.stringify({ data: data, ts: Date.now() }));
    } catch(e) { /* full, ignore */ }
  }

  async function fetchWithCache(url) {
    // Si ya sabemos que estamos rate-limited, no insistir
    if (rateLimited) return null;

    // Devolver cache si es válido
    var cached = getCached(url);
    if (cached) return cached;

    var res;
    try {
      res = await fetch(url);
    } catch(e) {
      console.warn('GitHub fetch network error:', e);
      return null;
    }

    // Detectar rate limit
    var remaining = res.headers.get('X-RateLimit-Remaining');
    if (remaining !== null && parseInt(remaining, 10) <= 0) {
      rateLimited = true;
      var reset = res.headers.get('X-RateLimit-Reset');
      var resetDate = reset ? new Date(parseInt(reset, 10) * 1000) : null;
      var waitMin = resetDate ? Math.ceil((resetDate - Date.now()) / 60000) : '?';
      console.warn('GitHub API rate limit alcanzado. Se reinicia en ~' + waitMin + ' min.');
      return null;
    }

    if (!res.ok) {
      // 403 puede ser rate limit sin header (ocurre a veces)
      if (res.status === 403) {
        rateLimited = true;
        console.warn('GitHub API 403 — posible rate limit.');
      }
      return null;
    }

    var data = await res.json();
    setCache(url, data);
    return data;
  }

  // --- Load github_username from user_preferences ---
  async function loadGithubUsername() {
    var client = getSupabase();
    if (!client || !userId) return null;
    try {
      var result = await client
        .from('user_preferences')
        .select('github_username')
        .eq('user_id', userId)
        .maybeSingle();
      if (result.error) return null;
      return result.data ? result.data.github_username : null;
    } catch(e) { return null; }
  }


  // --- Language colors ---
  var LANG_COLORS = {
    'JavaScript': '#f1e05a',
    'TypeScript': '#3178c6',
    'Python': '#3572A5',
    'Java': '#b07219',
    'Go': '#00ADD8',
    'Rust': '#dea584',
    'Ruby': '#701516',
    'PHP': '#4F5D95',
    'C++': '#f34b7d',
    'C': '#555555',
    'C#': '#178600',
    'Swift': '#F05138',
    'Kotlin': '#A97BFF',
    'Dart': '#00B4AB',
    'Shell': '#89e051',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'SCSS': '#c6538c',
    'Vue': '#41b883',
    'Svelte': '#ff3e00',
    'Lua': '#000080',
    'Zig': '#ec915c',
    'Scala': '#c22d40',
    'Elixir': '#6e4a7e',
    'Haskell': '#5e5086',
    'R': '#198CE7',
    'Objective-C': '#438eff',
    'Perl': '#0298c3',
    'Jupyter Notebook': '#DA5B0B',
    'Dockerfile': '#384d54',
    'Makefile': '#427819',
    'Nix': '#7e7eff',
    'Vim script': '#199f4b',
    'MATLAB': '#e16737',
    'GraphQL': '#e535ab'
  };

  function getLangColor(lang) {
    return LANG_COLORS[lang] || '#8b949e';
  }

  // --- Format numbers ---
  function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  // --- Show view ---
  function showView(view) {
    if (loadingEl) loadingEl.style.display = view === 'loading' ? 'flex' : 'none';
    if (emptyEl) emptyEl.style.display = view === 'empty' ? 'flex' : 'none';
    // #gh-profile uses CSS flex display; toggle via class instead of inline style
    if (profileEl) profileEl.style.display = view === 'profile' ? 'flex' : 'none';
  }

  // --- Tab switching ---
  function initTabs() {
    var tabs = document.querySelectorAll('.gh-tab');
    var contents = document.querySelectorAll('.gh-tab-content');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        var target = tab.dataset.tab;
        tabs.forEach(function(t) { t.classList.remove('active'); });
        contents.forEach(function(c) { c.classList.remove('active'); });
        tab.classList.add('active');
        var el = document.getElementById('gh-tab-' + target);
        if (el) el.classList.add('active');
      });
    });
  }

  // --- Load profile ---
  async function loadProfile(username) {
    try {
      var data = await fetchWithCache(API + '/users/' + encodeURIComponent(username));
      if (!data) {
        if (rateLimited) showRateLimitView();
        else showView('empty');
        return;
      }

      var avatarEl = document.getElementById('gh-avatar');
      var nameEl = document.getElementById('gh-name');
      var usernameEl = document.getElementById('gh-username');
      var reposCountEl = document.getElementById('gh-repos-count');
      var followersEl = document.getElementById('gh-followers');
      var followingEl = document.getElementById('gh-following');
      var profileLink = document.getElementById('gh-profile-link');

      if (avatarEl) avatarEl.src = data.avatar_url;
      if (avatarEl) avatarEl.alt = data.login;
      if (nameEl) nameEl.textContent = data.name || data.login;
      if (usernameEl) usernameEl.textContent = '@' + data.login;
      if (reposCountEl) reposCountEl.textContent = formatNum(data.public_repos);
      if (followersEl) followersEl.textContent = formatNum(data.followers);
      if (followingEl) followingEl.textContent = formatNum(data.following);
      if (profileLink) profileLink.href = data.html_url;

      showView('profile');
    } catch(e) {
      console.warn('GitHub profile error:', e);
      showView('empty');
    }
  }

  // --- Render event item ---
  function renderEvent(event) {
    var type = event.type;
    var repo = event.repo ? event.repo.name : '';
    var created = event.created_at;
    var icon = '';
    var iconClass = '';
    var text = '';
    var detail = '';

    switch(type) {
      case 'PushEvent':
        icon = 'fa-solid fa-arrow-up';
        iconClass = 'push';
        var count = (event.payload && event.payload.commits) ? event.payload.commits.length : 0;
        text = '<strong>' + escapeHtml(repo.split('/')[1] || repo) + '</strong>';
        detail = count + ' commit' + (count !== 1 ? 's' : '') + ' pushed';
        break;
      case 'PullRequestEvent':
        icon = 'fa-solid fa-code-pull-request';
        iconClass = 'pr';
        var pr = event.payload && event.payload.pull_request;
        var action = (event.payload && event.payload.action) || 'opened';
        text = '<strong>' + escapeHtml(pr ? pr.title : repo) + '</strong>';
        detail = 'PR ' + action + ' en ' + escapeHtml(repo.split('/')[0] || '');
        break;
      case 'IssuesEvent':
        icon = 'fa-solid fa-circle-dot';
        iconClass = 'issue';
        var issue = event.payload && event.payload.issue;
        var iAction = (event.payload && event.payload.action) || 'opened';
        text = '<strong>' + escapeHtml(issue ? issue.title : repo) + '</strong>';
        detail = 'Issue ' + iAction + ' en ' + escapeHtml(repo.split('/')[0] || '');
        break;
      case 'WatchEvent':
        icon = 'fa-solid fa-star';
        iconClass = 'star';
        text = '<strong>' + escapeHtml(repo.split('/')[1] || repo) + '</strong>';
        detail = 'Starred';
        break;
      case 'ForkEvent':
        icon = 'fa-solid fa-code-fork';
        iconClass = 'fork';
        text = '<strong>' + escapeHtml(repo.split('/')[1] || repo) + '</strong>';
        detail = 'Forked';
        break;
      case 'CreateEvent':
        icon = 'fa-solid fa-plus';
        iconClass = 'push';
        var refType = (event.payload && event.payload.ref_type) || 'ref';
        text = '<strong>' + escapeHtml(repo.split('/')[1] || repo) + '</strong>';
        detail = refType.charAt(0).toUpperCase() + refType.slice(1) + ' created';
        break;
      case 'DeleteEvent':
        icon = 'fa-solid fa-trash';
        iconClass = 'delete';
        text = '<strong>' + escapeHtml(repo.split('/')[1] || repo) + '</strong>';
        detail = (event.payload && event.payload.ref_type || 'ref') + ' deleted';
        break;
      case 'ReleaseEvent':
        icon = 'fa-solid fa-tag';
        iconClass = 'release';
        var rel = event.payload && event.payload.release;
        text = '<strong>' + escapeHtml(rel ? rel.name || rel.tag_name : repo) + '</strong>';
        detail = 'Release en ' + escapeHtml(repo.split('/')[0] || '');
        break;
      default:
        icon = 'fa-solid fa-circle';
        iconClass = 'push';
        text = '<strong>' + escapeHtml(repo) + '</strong>';
        detail = type.replace('Event', '');
        break;
    }

    var li = document.createElement('li');
    li.className = 'gh-activity-item';
    li.innerHTML =
      '<div class="gh-activity-icon ' + iconClass + '"><i class="' + icon + '"></i></div>' +
      '<div class="gh-activity-content">' +
        text +
        '<span class="gh-act-detail">' + detail + '</span>' +
      '</div>' +
      '<span class="gh-activity-time">' + timeAgo(created) + '</span>';
    return li;
  }

  // --- Load activity ---
  async function loadActivity(username) {
    var list = document.getElementById('gh-activity-list');
    if (!list) return;
    try {
      var events = await fetchWithCache(API + '/users/' + encodeURIComponent(username) + '/events/public?per_page=15');
      if (!events) return;
      list.innerHTML = '';
      if (events.length === 0) {
        list.innerHTML = '<li class="gh-activity-item" style="justify-content:center;color:var(--text-muted);">Sin actividad reciente</li>';
        return;
      }
      events.forEach(function(ev) {
        list.appendChild(renderEvent(ev));
      });
    } catch(e) {
      console.warn('GitHub activity error:', e);
    }
  }

  // --- Load repos ---
  async function loadRepos(username) {
    var container = document.getElementById('gh-repos-list');
    if (!container) return;
    try {
      var repos = await fetchWithCache(API + '/users/' + encodeURIComponent(username) + '/repos?sort=updated&per_page=30');
      if (!repos) return;
      container.innerHTML = '';

      // --- Update streak: repos updated in the last 30 days ---
      var streakEl = document.getElementById('gh-streak-value');
      if (streakEl) {
        var monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        var activeRepos = repos.filter(function(r) { return r.updated_at > monthAgo; });
        streakEl.textContent = activeRepos.length;
      }

      // Show top 10 repos
      var displayRepos = repos.slice(0, 10);
      if (displayRepos.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;padding:20px;">Sin repositorios</p>';
        return;
      }
      displayRepos.forEach(function(repo) {
        var card = document.createElement('a');
        card.className = 'gh-repo-card';
        card.href = repo.html_url;
        card.target = '_blank';
        card.rel = 'noopener';

        var langDot = '';
        if (repo.language) {
          var color = getLangColor(repo.language);
          langDot = '<span class="gh-repo-meta"><span><span class="gh-repo-lang-dot" style="background:' + color + '"></span>' + escapeHtml(repo.language) + '</span></span>';
        }

        card.innerHTML =
          '<div class="gh-repo-name">' + escapeHtml(repo.name) + '</div>' +
          '<div class="gh-repo-desc">' + escapeHtml(repo.description || '') + '</div>' +
          '<div class="gh-repo-meta">' +
            '<span><i class="fa-regular fa-star"></i> ' + formatNum(repo.stargazers_count) + '</span>' +
            '<span><i class="fa-solid fa-code-fork"></i> ' + formatNum(repo.forks_count) + '</span>' +
          '</div>' +
          langDot;

        container.appendChild(card);
      });
    } catch(e) {
      console.warn('GitHub repos error:', e);
    }
  }

  // --- Load trending ---
  async function loadTrending() {
    var list = document.getElementById('gh-trending-list');
    if (!list) return;
    try {
      var date = new Date();
      date.setDate(date.getDate() - 7);
      var since = date.toISOString().split('T')[0];
      var data = await fetchWithCache(API + '/search/repositories?q=created:>' + since + '&sort=stars&order=desc&per_page=10');
      if (!data) return;
      var items = data.items || [];
      list.innerHTML = '';
      if (items.length === 0) {
        list.innerHTML = '<li class="gh-trending-item" style="justify-content:center;color:var(--text-muted);">Sin datos</li>';
        return;
      }
      items.forEach(function(repo, idx) {
        var fullName = repo.full_name || '';
        var parts = fullName.split('/');
        var owner = parts[0] || '';
        var name = parts[1] || '';

        var li = document.createElement('li');
        li.className = 'gh-trending-item';
        li.style.cursor = 'pointer';
        li.addEventListener('click', function() {
          window.open(repo.html_url, '_blank', 'noopener');
        });

        var langHtml = '';
        if (repo.language) {
          var color = getLangColor(repo.language);
          langHtml = '<span class="gh-trending-lang"><span class="gh-repo-lang-dot" style="background:' + color + '"></span>' + escapeHtml(repo.language) + '</span>';
        }

        li.innerHTML =
          '<span class="gh-trending-rank' + (idx < 3 ? ' top3' : '') + '">' + (idx + 1) + '</span>' +
          '<div class="gh-trending-info">' +
            '<div class="gh-trending-name">' + escapeHtml(name) + ' <span>' + escapeHtml(owner) + '</span></div>' +
            '<div class="gh-trending-desc">' + escapeHtml(repo.description || '') + '</div>' +
          '</div>' +
          '<div class="gh-trending-stats">' +
            '<span class="gh-trending-stars"><i class="fa-regular fa-star"></i> ' + formatNum(repo.stargazers_count) + '</span>' +
            '<span class="gh-trending-forks"><i class="fa-solid fa-code-fork"></i> ' + formatNum(repo.forks_count) + '</span>' +
            langHtml +
          '</div>';

        list.appendChild(li);
      });
    } catch(e) {
      console.warn('GitHub trending error:', e);
    }
  }

  // --- Rate limit view ---
  function showRateLimitView() {
    var existing = document.getElementById('gh-rate-limit-msg');
    if (existing) return;
    var msg = document.createElement('div');
    msg.id = 'gh-rate-limit-msg';
    msg.style.cssText = 'text-align:center;padding:30px 16px;color:var(--text-muted);';
    msg.innerHTML =
      '<i class="fa-solid fa-hourglass-half" style="font-size:1.5rem;display:block;margin-bottom:10px;"></i>' +
      '<p style="margin:0;font-size:0.85rem;">GitHub API rate limit alcanzado</p>' +
      '<p style="margin:4px 0 0;font-size:0.75rem;opacity:0.7;">Los datos se recargarán automáticamente en unos minutos</p>';

    // Insertar en el contenedor del widget
    var widget = document.querySelector('.widget-github');
    if (widget) {
      var container = widget.querySelector('.widget-body') || widget;
      container.appendChild(msg);
    }
    showView('empty');
  }

  // --- Main load ---
  async function loadGithubWidget() {
    // Reset rate limit flag si ya pasó suficiente tiempo
    try {
      var rlTs = sessionStorage.getItem(CACHE_PREFIX + 'ratelimited_at');
      if (rlTs && Date.now() - parseInt(rlTs, 10) > 10 * 60 * 1000) {
        rateLimited = false;
        sessionStorage.removeItem(CACHE_PREFIX + 'ratelimited_at');
      }
    } catch(e) { /* ignore */ }

    showView('loading');
    var username = await loadGithubUsername();
    if (!username) { showView('empty'); return; }

    // Cargar profile primero (es la que decide si mostramos datos o empty)
    await loadProfile(username);

    // Si profile falló por rate limit, no seguir gastando requests
    if (rateLimited) return;

    // Cargar el resto en paralelo
    try {
      await Promise.all([
        loadActivity(username),
        loadRepos(username),
        loadTrending()
      ]);
    } catch(e) {
      console.warn('GitHub error:', e);
    }
  }

  // --- Auth events ---
  window.addEventListener('auth:ready', function(e) {
    userId = e.detail.userId;
    initTabs();
    loadGithubWidget();
  });

  window.addEventListener('auth:logout', function() {
    userId = null;
    rateLimited = false;
    showView('empty');
  });

  // --- Init DOM refs ---
  loadingEl = document.getElementById('gh-loading');
  emptyEl = document.getElementById('gh-empty');
  profileEl = document.getElementById('gh-profile');

  // --- Public API ---
  window.GitHubWidget = { load: loadGithubWidget };
})();
