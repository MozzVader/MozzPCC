/**
 * weather.js — Widget de clima usando Open-Meteo API
 * Gratuito, sin API key, geocoding incluido
 * Se integra con settings.js para guardar la ciudad en Supabase
 */

(function () {
  'use strict';

  var GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  var WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

  // Códigos WMO → descripción en español + icono FA
  var WMO = {
    0:  { desc: 'Despejado',       icon: 'fa-solid fa-sun' },
    1:  { desc: 'Mayormente despejado', icon: 'fa-solid fa-sun' },
    2:  { desc: 'Parcialmente nublado', icon: 'fa-solid fa-cloud-sun' },
    3:  { desc: 'Nublado',         icon: 'fa-solid fa-cloud' },
    45: { desc: 'Neblina',         icon: 'fa-solid fa-smog' },
    48: { desc: 'Neblina con escarcha', icon: 'fa-solid fa-smog' },
    51: { desc: 'Llovizna leve',   icon: 'fa-solid fa-cloud-rain' },
    53: { desc: 'Llovizna moderada', icon: 'fa-solid fa-cloud-rain' },
    55: { desc: 'Llovizna intensa', icon: 'fa-solid fa-cloud-showers-heavy' },
    56: { desc: 'Llovizna congelante', icon: 'fa-solid fa-cloud-rain' },
    57: { desc: 'Llovizna congelante intensa', icon: 'fa-solid fa-cloud-showers-heavy' },
    61: { desc: 'Lluvia leve',     icon: 'fa-solid fa-cloud-rain' },
    63: { desc: 'Lluvia moderada', icon: 'fa-solid fa-cloud-showers-heavy' },
    65: { desc: 'Lluvia intensa',  icon: 'fa-solid fa-cloud-showers-heavy' },
    66: { desc: 'Lluvia congelante', icon: 'fa-solid fa-cloud-rain' },
    67: { desc: 'Lluvia congelante intensa', icon: 'fa-solid fa-cloud-showers-heavy' },
    71: { desc: 'Nieve leve',      icon: 'fa-solid fa-snowflake' },
    73: { desc: 'Nieve moderada',  icon: 'fa-solid fa-snowflake' },
    75: { desc: 'Nieve intensa',   icon: 'fa-solid fa-snowflake' },
    77: { desc: 'Granos de nieve', icon: 'fa-solid fa-snowflake' },
    80: { desc: 'Chubascos',       icon: 'fa-solid fa-cloud-showers-heavy' },
    81: { desc: 'Chubascos moderados', icon: 'fa-solid fa-cloud-showers-heavy' },
    82: { desc: 'Chubascos fuertes', icon: 'fa-solid fa-cloud-showers-heavy' },
    85: { desc: 'Nevadas',         icon: 'fa-solid fa-snowflake' },
    86: { desc: 'Nevadas fuertes', icon: 'fa-solid fa-snowflake' },
    95: { desc: 'Tormenta',        icon: 'fa-solid fa-cloud-bolt' },
    96: { desc: 'Tormenta con granizo', icon: 'fa-solid fa-cloud-bolt' },
    99: { desc: 'Tormenta con granizo fuerte', icon: 'fa-solid fa-cloud-bolt' }
  };

  // Elementos del DOM
  var elIcon = document.getElementById('weather-icon');
  var elTemp = document.getElementById('weather-temp');
  var elDesc = document.getElementById('weather-desc');
  var elLocation = document.getElementById('weather-location');
  var elFeels = document.getElementById('weather-feels');
  var elHilo = document.getElementById('weather-hilo');
  var elForecast = document.getElementById('weather-forecast');

  // Settings: campo de ciudad
  var cityInput = document.getElementById('weather-city-input');
  var citySaveBtn = document.getElementById('weather-city-save');
  var cityStatus = document.getElementById('weather-city-status');

  // Estado
  var userId = null;
  var city = '';
  var coords = null; // { lat, lon, name }
  var refreshTimer = null;

  // --- Geocoding: ciudad → coordenadas ---
  async function geocode(query) {
    try {
      var res = await fetch(GEO_URL + '?name=' + encodeURIComponent(query) + '&count=1&language=es');
      var data = await res.json();
      if (data.results && data.results.length > 0) {
        var r = data.results[0];
        return {
          lat: r.latitude,
          lon: r.longitude,
          name: (r.name + ', ' + (r.admin1 || '') + ' ' + (r.country_code || '')).trim()
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // --- Fetch clima ---
  async function fetchWeather() {
    if (!coords) {
      setEmpty();
      return;
    }

    try {
      var url = WEATHER_URL +
        '?latitude=' + coords.lat +
        '&longitude=' + coords.lon +
        '&current=temperature_2m,apparent_temperature,weather_code' +
        '&daily=temperature_2m_max,temperature_2m_min,weather_code' +
        '&timezone=auto&forecast_days=7';

      var res = await fetch(url);
      var data = await res.json();

      if (data.error) {
        setEmpty();
        return;
      }

      var current = data.current;
      var daily = data.daily;
      var wmo = WMO[current.weather_code] || { desc: 'Desconocido', icon: 'fa-solid fa-cloud' };

      elIcon.innerHTML = '<i class="' + wmo.icon + '"></i>';
      elTemp.textContent = Math.round(current.temperature_2m) + '°';
      elDesc.textContent = wmo.desc;
      elLocation.innerHTML = '<i class="fa-solid fa-location-dot"></i> ' + coords.name;
      elFeels.textContent = 'Sensacion ' + Math.round(current.apparent_temperature) + '°';
      elHilo.innerHTML = '<i class="fa-solid fa-arrow-up"></i>' +
        Math.round(daily.temperature_2m_max[0]) + '° ' +
        '<i class="fa-solid fa-arrow-down"></i>' +
        Math.round(daily.temperature_2m_min[0]) + '°';

      // Renderizar pronóstico extendido (saltar hoy = índice 0)
      renderForecast(daily);

    } catch (e) {
      setEmpty();
    }
  }

  // --- Renderizar pronóstico 7 días ---
  function renderForecast(daily) {
    if (!elForecast || !daily || !daily.time) {
      return;
    }

    var DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    var html = '';

    for (var i = 1; i < daily.time.length; i++) {
      var date = new Date(daily.time[i] + 'T12:00:00');
      var dayName = DIAS[date.getDay()];
      var icon = (WMO[daily.weather_code[i]] || WMO[0]).icon;
      var max = Math.round(daily.temperature_2m_max[i]);
      var min = Math.round(daily.temperature_2m_min[i]);

      html += '<div class="forecast-day">' +
        '<span class="forecast-day-name">' + dayName + '</span>' +
        '<i class="' + icon + ' forecast-day-icon"></i>' +
        '<span class="forecast-day-temps">' +
          '<span class="forecast-max">' + max + '°</span>' +
          '<span class="forecast-sep">/</span>' +
          '<span class="forecast-min">' + min + '°</span>' +
        '</span>' +
      '</div>';
    }

    elForecast.innerHTML = html;
  }

  function clearForecast() {
    if (elForecast) elForecast.innerHTML = '';
  }

  function setEmpty() {
    elIcon.innerHTML = '<i class="fa-solid fa-cloud-sun"></i>';
    elTemp.textContent = '--°';
    elDesc.textContent = city ? 'Sin datos' : 'Configura tu ciudad';
    elLocation.innerHTML = '<i class="fa-solid fa-location-dot"></i> ' + (city || '--');
    elFeels.textContent = 'Sensacion --°';
    elHilo.innerHTML = '<i class="fa-solid fa-arrow-up"></i>--° <i class="fa-solid fa-arrow-down"></i>--°';
    clearForecast();
  }

  // --- Guardar ciudad en Supabase ---
  async function saveCity(newCity) {
    var client = window.supabaseClient;
    if (!client || !userId) return false;

    try {
      var { error } = await client
        .from('user_preferences')
        .upsert({
          user_id: userId,
          city: newCity,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      return !error;
    } catch (e) {
      return false;
    }
  }

  // --- Cargar ciudad desde Supabase ---
  async function loadCityPref() {
    var client = window.supabaseClient;
    if (!client || !userId) return;

    try {
      var { data, error } = await client
        .from('user_preferences')
        .select('city')
        .eq('user_id', userId)
        .single();

      if (!error && data && data.city) {
        city = data.city;
        if (cityInput) cityInput.value = city;
        var result = await geocode(city);
        if (result) {
          coords = result;
          fetchWeather();
          startRefresh();
        }
      }
    } catch (e) {
      // Tabla quizá no tiene columna city aún
    }
  }

  // --- Auto-refresh cada 10 minutos ---
  function startRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(fetchWeather, 10 * 60 * 1000);
  }

  // --- Botón guardar ciudad ---
  async function handleCitySave() {
    var val = cityInput.value.trim();
    if (!val) return;

    if (cityStatus) {
      cityStatus.textContent = 'Buscando...';
      cityStatus.className = 'weather-city-status';
    }

    var result = await geocode(val);
    if (!result) {
      if (cityStatus) {
        cityStatus.textContent = 'No se encontro la ciudad';
        cityStatus.className = 'weather-city-status error';
      }
      return;
    }

    city = val;
    coords = result;

    var saved = await saveCity(val);
    if (saved) {
      if (cityStatus) {
        cityStatus.textContent = 'Guardado: ' + result.name;
        cityStatus.className = 'weather-city-status success';
      }
    } else {
      if (cityStatus) {
        cityStatus.textContent = 'Guardado localmente';
        cityStatus.className = 'weather-city-status';
      }
    }

    fetchWeather();
    startRefresh();
  }

  // --- Eventos ---
  if (citySaveBtn) {
    citySaveBtn.addEventListener('click', handleCitySave);
  }
  if (cityInput) {
    cityInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleCitySave();
    });
  }

  // --- Auth events ---
  window.addEventListener('auth:ready', function (e) {
    userId = e.detail.userId;
    loadCityPref();
  });

  window.addEventListener('auth:logout', function () {
    userId = null;
    city = '';
    coords = null;
    if (refreshTimer) clearInterval(refreshTimer);
    setEmpty();
    if (cityInput) cityInput.value = '';
  });

  // Escuchar cuando settings.js carga las prefs para actualizar el input
  window.addEventListener('weather:city-loaded', function (e) {
    if (e.detail && e.detail.city && cityInput) {
      cityInput.value = e.detail.city;
    }
  });

  // Estado inicial vacío
  setEmpty();
})();
