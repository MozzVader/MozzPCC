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
  const appLoading = document.getElementById('app-loading');
  const dashboardMain = document.querySelector('.dashboard');
  const userInfoBar = document.getElementById('user-info-bar');
  const userEmailDisplay = document.getElementById('user-email-display');
  const logoutBtn = document.getElementById('logout-btn');

  // --- Elementos de reset de contraseña ---
  const authForm = document.getElementById('auth-form');
  const authForgotBtn = document.getElementById('auth-forgot-btn');
  const authDivider = document.querySelector('.auth-divider');
  const authOAuth = document.querySelector('.auth-oauth');
  const authMagicBtn = document.getElementById('auth-magic-btn');
  const authUpdateForm = document.getElementById('auth-update-password-form');
  const authNewPassword = document.getElementById('auth-new-password');
  const authNewPasswordConfirm = document.getElementById('auth-new-password-confirm');
  const authUpdateBtn = document.getElementById('auth-update-password-btn');
  const authUpdateError = document.getElementById('auth-update-error');
  const authUpdateBackBtn = document.getElementById('auth-update-back-btn');
  const authNewPasswordToggle = document.getElementById('auth-new-password-toggle');

  // --- Estado ---
  let isLoginMode = true; // true = login, false = register
  let isDashboardVisible = false; // trackea si el dashboard ya está mostrándose
  let isRecoveryMode = false; // true cuando venimos de un link de reset de contraseña

  // --- Funciones de utilidad ---

  /**
   * Oculta la pantalla de carga inicial
   */
  function hideLoadingScreen() {
    if (appLoading) {
      appLoading.style.opacity = '0';
      appLoading.style.transition = 'opacity 0.2s ease';
      setTimeout(() => {
        appLoading.style.display = 'none';
      }, 200);
    }
  }

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
   * Muestra un error en el formulario de nueva contraseña
   * @param {string} message - Mensaje de error en español
   */
  function showUpdateError(message) {
    authUpdateError.textContent = message;
    authUpdateError.style.display = 'block';
    clearTimeout(showUpdateError._timer);
    showUpdateError._timer = setTimeout(() => {
      authUpdateError.style.display = 'none';
    }, 6000);
  }

  function hideUpdateError() {
    authUpdateError.style.display = 'none';
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
    if (msg.includes('same password') || msg.includes('new password should be different')) {
      return 'La nueva contraseña debe ser diferente a la actual.';
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
    hideLoadingScreen();
    isDashboardVisible = false;
    authScreen.style.display = 'flex';
    dashboardMain.style.display = 'none';
    userInfoBar.style.display = 'none';

    // Si no estamos en modo recuperación, resetear al estado normal
    if (!isRecoveryMode) {
      showLoginForm();
    }

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
   * Muestra el formulario principal (login/register) y oculta el de nueva contraseña
   */
  function showLoginForm() {
    isRecoveryMode = false;
    authForm.style.display = 'flex';
    authUpdateForm.style.display = 'none';
    if (authDivider) authDivider.style.display = 'flex';
    if (authOAuth) authOAuth.style.display = 'flex';

    // Mostrar u ocultar botones según modo
    if (authForgotBtn) authForgotBtn.style.display = isLoginMode ? 'block' : 'none';
    if (authMagicBtn) authMagicBtn.style.display = 'block';

    // Resetear título
    if (isLoginMode) {
      authTitle.textContent = 'MozzPCC';
      authSubtitle.textContent = 'Ingresá a tu centro de comando personal';
    }
  }

  /**
   * Muestra el formulario de nueva contraseña (después de clickear el link de recovery)
   */
  function showUpdatePasswordForm() {
    isRecoveryMode = true;
    authForm.style.display = 'none';
    authUpdateForm.style.display = 'flex';
    if (authDivider) authDivider.style.display = 'none';
    if (authOAuth) authOAuth.style.display = 'none';

    authTitle.textContent = 'Nueva Contraseña';
    authSubtitle.textContent = 'Ingresá y confirmá tu nueva contraseña';

    // Limpiar campos
    authNewPassword.value = '';
    authNewPasswordConfirm.value = '';
    hideUpdateError();
    authUpdateBtn.disabled = false;
    authUpdateBtn.textContent = 'Actualizar contraseña';
    authUpdateBtn.classList.remove('loading');
  }

  /**
   * Muestra un mensaje de éxito dentro de la auth card (reemplaza los forms)
   * @param {string} message - Mensaje de éxito en HTML
   */
  function showAuthSuccess(message) {
    authForm.style.display = 'none';
    authUpdateForm.style.display = 'none';
    if (authDivider) authDivider.style.display = 'none';
    if (authOAuth) authOAuth.style.display = 'none';

    // Crear div de éxito dinámicamente
    var oldSuccess = authCard.querySelector('.auth-success');
    if (oldSuccess) oldSuccess.remove();

    var successDiv = document.createElement('div');
    successDiv.className = 'auth-success';
    successDiv.innerHTML = '<i class="fa-solid fa-circle-check" style="font-size:1.6rem;display:block;margin-bottom:10px;"></i>' + message;

    // Insertar después del logo
    var authLogo = authCard.querySelector('.auth-logo');
    authLogo.insertAdjacentElement('afterend', successDiv);
  }

  /**
   * Remueve el mensaje de éxito si existe
   */
  function removeAuthSuccess() {
    var oldSuccess = authCard.querySelector('.auth-success');
    if (oldSuccess) oldSuccess.remove();
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

  function showDashboard(session, skipTransition) {
    hideLoadingScreen();
    const userId = session.user.id;
    const email = session.user.email;
    const displayName = extractDisplayName(session.user);

    // Actualizar barra de usuario con nombre
    userEmailDisplay.textContent = displayName;
    userInfoBar.style.display = 'flex';

    // Si el dashboard ya está visible (ej: Supabase re-verificó sesión al cambiar de pestaña),
    // NO repetir la transición ni re-disparar auth:ready
    if (isDashboardVisible && !skipTransition) {
      return;
    }

    // Transición: fade out auth, fade in dashboard
    authScreen.classList.remove('auth-fade-in');
    authScreen.classList.add('auth-fade-out');

    setTimeout(() => {
      authScreen.style.display = 'none';
      dashboardMain.style.display = 'block';
      document.body.classList.add('dashboard-visible');
      isDashboardVisible = true;
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
   * Skeleton loading helper
   * Cada widget llama hideSkeleton(id) cuando sus datos están listos
   */
  window.hideSkeleton = function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add('fade-out');
    setTimeout(function() {
      el.setAttribute('data-loaded', 'true');
    }, 200);
  };

  /**
   * Widget error/retry helper
   * Muestra un error user-friendly con botón de reintentar dentro de un contenedor.
   * @param {string} containerId - ID del contenedor donde mostrar el error
   * @param {object} opts
   * @param {string} opts.message - Mensaje de error
   * @param {Function} [opts.retry] - Callback al presionar "Reintentar"
   * @param {string[]} [opts.skeletons] - IDs de skeletons a ocultar
   */
  window.showWidgetError = function(containerId, opts) {
    var el = document.getElementById(containerId);
    if (!el) return;

    // Clear previous error if any
    clearWidgetError(containerId);

    // Hide skeletons
    if (opts.skeletons) {
      for (var i = 0; i < opts.skeletons.length; i++) {
        window.hideSkeleton(opts.skeletons[i]);
      }
    }

    var errorDiv = document.createElement('div');
    errorDiv.className = 'widget-error';
    errorDiv.id = containerId + '-error';

    var icon = document.createElement('i');
    icon.className = 'fa-solid fa-triangle-exclamation';

    var msg = document.createElement('span');
    msg.className = 'widget-error-msg';
    msg.textContent = opts.message || 'Error de conexión';

    errorDiv.appendChild(icon);
    errorDiv.appendChild(msg);

    if (opts.retry) {
      var btn = document.createElement('button');
      btn.className = 'widget-error-retry';
      btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Reintentar';
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        clearWidgetError(containerId);
        opts.retry();
      });
      errorDiv.appendChild(btn);
    }

    el.appendChild(errorDiv);
  };

  function clearWidgetError(containerId) {
    var old = document.getElementById(containerId + '-error');
    if (old) old.remove();
  }

  window.clearWidgetError = clearWidgetError;

  // Mostrar skeletons en auth:ready (los widgets los ocultan al cargar)
  window.addEventListener('auth:ready', function() {
    // Los skeletons ya son visibles por default (display normal).
    // Solo necesitamos resetearlos por si el usuario hace logout+login.
    var skels = document.querySelectorAll('.skeleton-container');
    skels.forEach(function(s) {
      s.removeAttribute('data-loaded');
      s.classList.remove('fade-out');
    });
  });

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
    document.body.classList.remove('dashboard-visible');
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: {} }));
    showAuthScreen();
  }

  /**
   * Alterna entre modo login y registro
   */
  function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    isRecoveryMode = false;
    removeAuthSuccess();
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

    // Mostrar/ocultar botón de forgot según modo
    if (authForgotBtn) authForgotBtn.style.display = isLoginMode ? 'block' : 'none';
    if (authMagicBtn) authMagicBtn.style.display = 'block';

    // Asegurar que el form principal está visible
    authForm.style.display = 'flex';
    authUpdateForm.style.display = 'none';
    if (authDivider) authDivider.style.display = 'flex';
    if (authOAuth) authOAuth.style.display = 'flex';

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
   * Maneja el envío del email de recuperación de contraseña
   */
  async function handleForgotPassword() {
    hideError();
    removeAuthSuccess();

    const email = emailInput.value.trim();

    if (!email) {
      showError('Ingresá tu correo electrónico para recuperar la contraseña.');
      return;
    }

    if (!isValidEmail(email)) {
      showError('Ingresá un correo electrónico válido.');
      return;
    }

    setLoading(true, 'Enviando correo...');

    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
      });

      if (error) {
        showError(translateError(error));
        setLoading(false);
        return;
      }

      setLoading(false);
      // Mostrar mensaje de éxito
      showAuthSuccess('Te enviamos un correo con el link para resetear tu contraseña. Revisá tu bandeja de entrada (y la carpeta de spam) y hacé clic en el enlace.');
    } catch (err) {
      console.error('Error forgot password:', err);
      showError(translateError(err));
      setLoading(false);
    }
  }

  /**
   * Maneja la actualización de la contraseña (después de recovery)
   */
  async function handleUpdatePassword() {
    hideUpdateError();

    const newPassword = authNewPassword.value;
    const confirmPassword = authNewPasswordConfirm.value;

    if (!newPassword || !confirmPassword) {
      showUpdateError('Completá ambos campos.');
      return;
    }

    if (newPassword.length < 6) {
      showUpdateError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showUpdateError('Las contraseñas no coinciden.');
      return;
    }

    authUpdateBtn.disabled = true;
    authUpdateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Actualizando...';
    authUpdateBtn.classList.add('loading');

    try {
      const { data, error } = await client.auth.updateUser({
        password: newPassword
      });

      if (error) {
        showUpdateError(translateError(error));
        authUpdateBtn.disabled = false;
        authUpdateBtn.textContent = 'Actualizar contraseña';
        authUpdateBtn.classList.remove('loading');
        return;
      }

      // Contraseña actualizada con éxito — el onAuthStateChange disparará showDashboard
      isRecoveryMode = false;
    } catch (err) {
      console.error('Error update password:', err);
      showUpdateError(translateError(err));
      authUpdateBtn.disabled = false;
      authUpdateBtn.textContent = 'Actualizar contraseña';
      authUpdateBtn.classList.remove('loading');
    }
  }

  /**
   * Toggle visibilidad de la nueva contraseña
   */
  function toggleNewPasswordVisibility() {
    if (authNewPassword.type === 'password') {
      authNewPassword.type = 'text';
      authNewPasswordToggle.innerHTML = '<i class="fa-regular fa-eye"></i>';
    } else {
      authNewPassword.type = 'password';
      authNewPasswordToggle.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
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
      dashboardMain.style.display = 'block';
      userInfoBar.style.display = 'none';
      authScreen.style.display = 'none';
      return;
    }

    // Registrar listener de cambios de auth
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // El usuario clickeó un link de recuperación de contraseña
        // Mostrar el form de nueva contraseña (authScreen ya debería estar visible)
        showUpdatePasswordForm();
        return; // NO mostrar el dashboard todavía
      }

      if (session) {
        // Si venimos de actualizar contraseña, mostrar dashboard
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

    // Forgot password
    authForgotBtn.addEventListener('click', handleForgotPassword);

    // Update password form
    authUpdateBtn.addEventListener('click', handleUpdatePassword);
    authUpdateBackBtn.addEventListener('click', function() {
      removeAuthSuccess();
      showLoginForm();
    });
    authNewPassword.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') authNewPasswordConfirm.focus();
    });
    authNewPasswordConfirm.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleUpdatePassword();
    });
    authNewPasswordToggle.addEventListener('click', toggleNewPasswordVisibility);

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
