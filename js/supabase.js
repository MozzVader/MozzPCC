/**
 * supabase.js — Inicialización del cliente Supabase
 * Debe cargarse DESPUÉS del CDN de Supabase JS
 */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://diaezbthqjvroexesbrr.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpYWV6YnRocWp2cm9leGVzYnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjExMDgsImV4cCI6MjA5Mjg5NzEwOH0.G2VeKwY5to87N0_FoHm_5SdnwQFWY636TeFPU4dmz84';

  try {
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
      console.error('MozzPCC: Supabase JS CDN no está cargado. Verifica el <script> en index.html.');
      window.supabaseClient = null;
      return;
    }

    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error('MozzPCC: Error al inicializar Supabase:', e);
    window.supabaseClient = null;
  }
})();
