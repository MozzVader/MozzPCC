/**
 * auth.js — Sistema de autenticación con Supabase
 * Debe cargarse DESPUÉS de js/supabase.js
 * 
 * Eventos globales que despacha:
 *   - auth:ready  → { detail: { userId, email, session } }
 *   - auth:logout → { detail: {} }
 */

(function () {
  'use strict';

  // --- Referencia al cliente Supabase ---
  const client = window.supabaseClient;

  // --- Elementos del DOM ---
  const authScreen = document.getElementById('auth-screen');
  const authCard = document.getElementById('auth-card');
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authToggleBtn = document.getElementById('auth-toggle-btn');
  const authError = document.getElementById('auth-error');
  const authPasswordToggle = document.getElementById('auth-password-toggle');
  const dashboardMain = document.querySelector('.dashboard');
  const userInfoBar = document.getElementById('user-info-bar');
  const userEmailDisplay = document.getElementById('user-email-display');
  const logoutBtn = document.getElementById('logout-btn');

  // --- Estado ---
  let isLoginMode = true; // true = login, false = register

  // --- Funciones de utilidad ---

  /**
   * Muestra un error en el formulario de auth
   * @param {string} message - Mensaje de error en español
   */
  function showError(message) {
    authError.textContent = message;
    authError.style.display = 'block';
    // Auto-ocultar después de 6 segundos
    clearTimeout(showError._timer);
    showError._timer = setTimeout(() => {
      authError.style.display = 'none';
    }, 6000);
  }

  /**
   * Oculta el mensaje de error
   */
  function hideError() {
    authError.style.display = 'none';
  }

  /**
   * Traduce errores de Supabase a mensajes amigables en español
   * @param {string} error - Mensaje de error de Supabase
   * @returns {string} Mensaje en español
   */
  function translateError(error) {
    const msg = (error.message || error.msg || error || '').toLowerCase();

    if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
      return 'Correo o contraseña incorrectos. Verificá tus datos.';
    }
    if (msg.includes('user already registered') || msg.includes('already registered')) {
      return 'Este correo ya está registrado. Intentá iniciar sesión.';
    }
    if (msg.includes('password should be at least')) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Tu correo no fue confirmado. Revisá tu bandeja de entrada.';
    }
    if (msg.includes('too many requests') || msg.includes('rate limit')) {
      return 'Demasiados intentos. Esperá un momento y volvé a intentar.';
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed')) {
      return 'Error de conexión. Verificá tu conexión a internet.';
    }
    if (msg.includes('invalid email')) {
      return 'El formato del correo no es válido.';
    }

    return 'Ocurrió un error inesperado. Intentá de nuevo.';
  }

  /**
   * Establece el botón en estado de carga
   * @param {boolean} loading - Si está cargando
   * @param {string} text - Texto del botón
   */
  function setLoading(loading, text) {
    if (loading) {
      authSubmitBtn.disabled = true;
      authSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (text || 'Procesando...');
      authSubmitBtn.classList.add('loading');
    } else {
      authSubmitBtn.disabled = false;
      authSubmitBtn.classList.remove('loading');
      authSubmitBtn.textContent = isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta';
    }
  }

  /**
   * Muestra la pantalla de autenticación
   */
  function showAuthScreen() {
    authScreen.style.display = 'flex';
    dashboardMain.style.display = 'none';
    userInfoBar.style.display = 'none';

    // Resetear formulario
    emailInput.value = '';
    passwordInput.value = '';
    hideError();
    setLoading(false);

    // Forzar reflow para animación
    void authCard.offsetWidth;
    authScreen.classList.remove('auth-fade-out');
    authScreen.classList.add('auth-fade-in');
    authCard.classList.add('auth-card-enter');
  }

  /**
   * Extrae el nombre para mostrar del usuario
   * Google: user_metadata.given_name o full_name
   * GitHub: user_metadata.preferred_username o user_name
   * Email: primer parte del email si no hay nombre
   * @param {Object} user - Objeto usuario de Supabase
   * @returns {string} Nombre para mostrar
   */
  function extractDisplayName(user) {
    const meta = user.user_metadata || {};

    // Google prioriza given_name, después full_name
    if (meta.given_name) return meta.given_name;
    if (meta.full_name) {
      // Si full_name tiene espacios (ej: "Juan Perez"), tomar solo el nombre
      const partes = meta.full_name.trim().split(' ');
      return partes[0];
    }
    // GitHub usa preferred_username o user_name
    if (meta.preferred_username) return meta.preferred_username;
    if (meta.user_name) return meta.user_name;
    // Fallback: usar la parte antes del @ del email
    if (user.email) return user.email.split('@')[0];
    return 'Usuario';
  }

  function showDashboard(session) {
    const userId = session.user.id;
    const email = session.user.email;
    const displayName = extractDisplayName(session.user);

    // Actualizar barra de usuario con nombre
    userEmailDisplay.textContent = displayName;
    userInfoBar.style.display = 'flex';

    // Transición: fade out auth, fade in dashboard
    authScreen.classList.remove('auth-fade-in');
    authScreen.classList.add('auth-fade-out');

    setTimeout(() => {
      authScreen.style.display = 'none';
      dashboardMain.style.display = 'flex';
      dashboardMain.classList.add('dashboard-fade-in');
      setTimeout(() => {
        dashboardMain.classList.remove('dashboard-fade-in');
      }, 500);
    }, 300);

    // Disparar evento de autenticación lista (incluye nombre del usuario)
    window.dispatchEvent(new CustomEvent('auth:ready', {
      detail: { userId, email, displayName, session }
    }));
  }

  /**
   * Maneja el cierre de sesión
   */
  async function handleLogout() {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('Error al cerrar sesión:', e);
    }
    // Siempre limpiar UI, incluso si falla el signOut
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: {} }));
    showAuthScreen();
  }

  /**
   * Alterna entre modo login y registro
   */
  function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    hideError();
    emailInput.value = '';
    passwordInput.value = '';

    if (isLoginMode) {
      authTitle.textContent = 'MozzPCC';
      authSubtitle.textContent = 'Ingresá a tu centro de comando personal';
      authSubmitBtn.textContent = 'Iniciar Sesión';
      authToggleBtn.innerHTML = '¿No tenés cuenta? <strong>Creá una</strong>';
    } else {
      authTitle.textContent = 'Crear Cuenta';
      authSubtitle.textContent = 'Registrate para guardar tus datos en la nube';
      authSubmitBtn.textContent = 'Crear Cuenta';
      authToggleBtn.innerHTML = '¿Ya tenés cuenta? <strong>Iniciá sesión</strong>';
    }

    emailInput.focus();
  }

  /**
   * Maneja el envío del formulario (login o registro)
   */
  async function handleSubmit(e) {
    e.preventDefault();
    hideError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('Completá todos los campos.');
      return;
    }

    if (!isValidEmail(email)) {
      showError('Ingresá un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true, isLoginMode ? 'Ingresando...' : 'Creando cuenta...');

    try {
      let result;

      if (isLoginMode) {
        result = await client.auth.signInWithPassword({ email, password });
      } else {
        result = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + window.location.pathname
          }
        });
      }

      const { error } = result;

      if (error) {
        showError(translateError(error));
        setLoading(false);
        return;
      }

      // Si es registro y requiere confirmación
      if (!isLoginMode && result.data?.user && !result.data.session) {
        setLoading(false);
        showError('Te enviamos un correo de confirmación. Revisá tu bandeja de entrada y hacé clic en el enlace.');
        return;
      }

      // Si todo salió bien, showDashboard será llamado por onAuthStateChange
    } catch (err) {
      console.error('Error de auth:', err);
      showError(translateError(err));
      setLoading(false);
    }
  }

  /**
   * Maneja el login con OAuth (Google o GitHub)
   * @param {string} provider - 'google' o 'github'
   */
  async function handleOAuth(provider) {
    hideError();

    try {
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });

      if (error) {
        showError(translateError(error));
      }
    } catch (err) {
      console.error('Error OAuth:', err);
      showError(translateError(err));
    }
  }

  /**
   * Maneja el envío de Magic Link
   */
  async function handleMagicLink(e) {
    e.preventDefault();
    hideError();

    const email = emailInput.value.trim();

    if (!email) {
      showError('Ingresá tu correo electrónico.');
      return;
    }

    if (!isValidEmail(email)) {
      showError('Ingresá un correo electrónico válido.');
      return;
    }

    setLoading(true, 'Enviando enlace...');

    try {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      });

      if (error) {
        showError(translateError(error));
        setLoading(false);
        return;
      }

      setLoading(false);
      showError('Te enviamos un enlace mágico a tu correo. Hacé clic en el enlace para ingresar.');
    } catch (err) {
      console.error('Error Magic Link:', err);
      showError(translateError(err));
      setLoading(false);
    }
  }

  /**
   * Valida formato de email
   * @param {string} email
   * @returns {boolean}
   */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Muestra/oculta la contraseña
   */
  function togglePasswordVisibility() {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      authPasswordToggle.innerHTML = '<i class="fa-regular fa-eye"></i>';
    } else {
      passwordInput.type = 'password';
      authPasswordToggle.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
    }
  }

  // --- Inicialización ---

  async function init() {
    // Verificar que Supabase está disponible
    if (!client) {
      console.error('MozzPCC: Supabase no está disponible. La autenticación está deshabilitada.');
      // Mostrar dashboard sin auth como fallback
      dashboardMain.style.display = 'flex';
      userInfoBar.style.display = 'none';
      authScreen.style.display = 'none';
      return;
    }

    // Registrar listener de cambios de auth
    client.auth.onAuthStateChange((event, session) => {
      console.log('MozzPCC: Auth state change:', event);

      if (session) {
        showDashboard(session);
      } else {
        // Auth logout event
        if (event === 'SIGNED_OUT') {
          window.dispatchEvent(new CustomEvent('auth:logout', { detail: {} }));
        }
        showAuthScreen();
      }
    });

    // Verificar sesión existente
    try {
      const { data: { session }, error } = await client.auth.getSession();

      if (error) {
        console.warn('MozzPCC: Error al obtener sesión:', error);
        showAuthScreen();
        return;
      }

      if (session) {
        showDashboard(session);
      } else {
        showAuthScreen();
      }
    } catch (err) {
      console.error('MozzPCC: Error al verificar sesión:', err);
      showAuthScreen();
    }

    // --- Eventos ---

    // Formulario principal
    authSubmitBtn.addEventListener('click', handleSubmit);

    // Enter en inputs
    emailInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') passwordInput.focus();
    });
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSubmit(e);
    });

    // Toggle login/register
    authToggleBtn.addEventListener('click', toggleAuthMode);

    // OAuth buttons
    document.getElementById('auth-google-btn').addEventListener('click', () => handleOAuth('google'));
    document.getElementById('auth-github-btn').addEventListener('click', () => handleOAuth('github'));

    // Magic link
    document.getElementById('auth-magic-btn').addEventListener('click', handleMagicLink);

    // Toggle password visibility
    authPasswordToggle.addEventListener('click', togglePasswordVisibility);

    // Logout
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
