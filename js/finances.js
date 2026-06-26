/**
 * finances.js — Modulo de finanzas personales con persistencia en Supabase
 * Se inicializa cuando se recibe el evento 'auth:ready'
 * Permite agregar, eliminar y visualizar transacciones (ingresos/gastos)
 * Incluye graficos con Chart.js (donut + bar)
 */

(function () {
  'use strict';

  // =========================================================================
  //  LAZY LOADING DE CDN (Chart.js + SheetJS)
  // =========================================================================

  var CDN_URLS = {
    chartjs: 'https://cdn.jsdelivr.net/npm/chart.js@4',
    xlsx: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
  };
  var _cdnLoaded = { chartjs: false, xlsx: false };
  var _cdnLoading = { chartjs: null, xlsx: null };

  /**
   * Carga un script CDN dinámicamente. Solo se carga una vez.
   * @param {string} name - Clave en CDN_URLS
   * @returns {Promise<boolean>} true si ya estaba cargado o se cargó ok
   */
  function loadCDN(name) {
    if (_cdnLoaded[name]) return Promise.resolve(true);
    if (_cdnLoading[name]) return _cdnLoading[name];
    _cdnLoading[name] = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = CDN_URLS[name];
      s.onload = function () {
        _cdnLoaded[name] = true;
        _cdnLoading[name] = null;
        resolve(true);
      };
      s.onerror = function () {
        console.warn('[Finanzas] Error al cargar ' + name);
        _cdnLoading[name] = null;
        resolve(false);
      };
      document.head.appendChild(s);
    });
    return _cdnLoading[name];
  }

  // --- Estado global del modulo ---
  var client = null;
  var userId = null;
  var initialized = false;
  var categories = [];
  var transactions = [];
  var currentType = 'gasto';
  var donutChart = null;
  var barChart = null;
  var lineChart = null;
  var currentTab = 'movimientos';
  var finSummaryHidden;
  var editingId = null; // ID de transaccion en modo edicion (null = modo agregar)

  // Leer preferencia de privacidad (persiste entre sesiones)
  function loadPrivacyPref() {
    finSummaryHidden = localStorage.getItem('mozzpcc-fin-summary-hidden') === 'true';
  }
  loadPrivacyPref();

  // Meses en espanol (corto)
  var MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var MONTH_NAMES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Categorias por defecto (se siembran solo la primera vez)
  var DEFAULT_CATEGORIES = [
    // GASTOS
    { name: 'Compras', icon: 'fa-solid fa-bag-shopping', color: '#ef4444', type: 'gasto', order: 0 },
    { name: 'Transporte', icon: 'fa-solid fa-car', color: '#f97316', type: 'gasto', order: 1 },
    { name: 'Entretenimiento', icon: 'fa-solid fa-gamepad', color: '#a855f7', type: 'gasto', order: 2 },
    { name: 'Salud', icon: 'fa-solid fa-heart-pulse', color: '#ec4899', type: 'gasto', order: 3 },
    { name: 'Educacion', icon: 'fa-solid fa-graduation-cap', color: '#3b82f6', type: 'gasto', order: 4 },
    { name: 'Supermercado', icon: 'fa-solid fa-cart-shopping', color: '#22c55e', type: 'gasto', order: 5 },
    { name: 'Vivienda', icon: 'fa-solid fa-house', color: '#14b8a6', type: 'gasto', order: 6 },
    { name: 'Servicios', icon: 'fa-solid fa-file-invoice-dollar', color: '#eab308', type: 'gasto', order: 7 },
    { name: 'Delivery', icon: 'fa-solid fa-motorcycle', color: '#c2410c', type: 'gasto', order: 8 },
    { name: 'Otros', icon: 'fa-solid fa-ellipsis', color: '#6b7280', type: 'gasto', order: 9 },
    // INGRESOS
    { name: 'Sueldo', icon: 'fa-solid fa-wallet', color: '#22c55e', type: 'ingreso', order: 10 },
    { name: 'Freelance', icon: 'fa-solid fa-laptop-code', color: '#3b82f6', type: 'ingreso', order: 11 },
    { name: 'Inversiones', icon: 'fa-solid fa-chart-line', color: '#a855f7', type: 'ingreso', order: 12 },
    { name: 'Otros', icon: 'fa-solid fa-ellipsis', color: '#6b7280', type: 'ingreso', order: 13 }
  ];

  // =========================================================================
  //  FUNCIONES AUXILIARES
  // =========================================================================

  /**
   * Obtiene la fecha actual en formato YYYY-MM-DD
   * @returns {string}
   */
  function getToday() {
    var d = new Date();
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  /**
   * Obtiene el mes actual en formato YYYY-MM
   * @returns {string}
   */
  function getCurrentMonth() {
    var d = new Date();
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    return year + '-' + month;
  }

  /**
   * Convierte fecha ISO (YYYY-MM-DD) a DD/MM/YYYY
   * @param {string} dateStr
   * @returns {string}
   */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  /**
   * Obtiene la categoria por ID del array local
   * @param {string} id
   * @returns {Object|null}
   */
  function getCategoryById(id) {
    if (!id || !categories.length) return null;
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].id === id) return categories[i];
    }
    return null;
  }


  /**
   * Formatea un numero con formato argentino: 1.234,56
   * @param {number} number
   * @returns {string}
   */
  function formatAmount(number) {
    if (number === null || number === undefined || isNaN(number)) {
      return getCurrency() + '0,00';
    }
    var abs = Math.abs(number);
    var formatted = abs.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    var prefix = number < 0 ? '-' + getCurrency() : getCurrency();
    return prefix + formatted;
  }

  // =========================================================================
  //  CATEGORIAS
  // =========================================================================

  /**
   * Siembra las categorias por defecto si el usuario no tiene ninguna
   */
  async function seedCategories() {
    if (!client || !userId) return;

    try {
      var { count, error } = await client
        .from('finance_categories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.warn('[Finanzas] Error al verificar categorias:', error);
        return;
      }

      if (count === 0) {
        var rows = [];
        for (var i = 0; i < DEFAULT_CATEGORIES.length; i++) {
          var cat = DEFAULT_CATEGORIES[i];
          rows.push({
            user_id: userId,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            type: cat.type,
            order: cat.order
          });
        }

        var { error: insertError } = await client
          .from('finance_categories')
          .insert(rows);

        if (insertError) {
          console.warn('[Finanzas] Error al sembrar categorias:', insertError);
        }
      }
    } catch (e) {
      console.warn('[Finanzas] Error en seedCategories:', e);
    }
  }

  /**
   * Carga todas las categorias del usuario desde Supabase
   */
  async function loadCategories() {
    if (!client || !userId) return;

    try {
      var { data, error } = await client
        .from('finance_categories')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true });

      if (error) {
        console.warn('[Finanzas] Error al cargar categorias:', error);
        return;
      }

      categories = data || [];
      populateCategorySelect(currentType);
      populateCategoryFilter();
    } catch (e) {
      console.warn('[Finanzas] Error en loadCategories:', e);
    }
  }

  /**
   * Llena el select de categorias en el formulario
   * @param {string} typeFilter - 'gasto' o 'ingreso'
   */
  function populateCategorySelect(typeFilter) {
    var select = document.getElementById('fin-category-select');
    if (!select) return;

    select.innerHTML = '';

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Seleccionar...';
    select.appendChild(placeholder);

    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      if (cat.type !== typeFilter) continue;

      var option = document.createElement('option');
      option.value = cat.id;
      option.innerHTML = '<i class="' + escapeHtml(cat.icon) + '" style="margin-right:4px;"></i> ' + escapeHtml(cat.name);
      select.appendChild(option);
    }
  }

  /**
   * Llena el select de filtro de categorias
   */
  function populateCategoryFilter() {
    var select = document.getElementById('fin-category-filter');
    if (!select) return;

    select.innerHTML = '';

    var allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Todas';
    select.appendChild(allOption);

    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      select.appendChild(option);
    }
  }

  // =========================================================================
  //  TRANSACCIONES
  // =========================================================================

  /**
   * Carga todas las transacciones del usuario desde Supabase
   */
  async function loadTransactions() {
    if (!client || !userId) return;

    try {
      var { data, error } = await client
        .from('finance_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.warn('[Finanzas] Error al cargar transacciones:', error);
        window.showWidgetError('fin-list', {
          message: 'No se pudieron cargar las transacciones',
          retry: loadTransactions,
          skeletons: ['skel-finances']
        });
        return;
      }

      window.clearWidgetError('fin-list');
      transactions = data || [];
      filterTransactions();
    } catch (e) {
      console.warn('[Finanzas] Error en loadTransactions:', e);
      window.showWidgetError('fin-list', {
        message: 'Error de conexion. Verifica tu internet.',
        retry: loadTransactions,
        skeletons: ['skel-finances']
      });
    }
  }

  /**
   * Aplica los filtros de mes y categoria, y re-renderiza
   */
  function filterTransactions() {
    var monthFilter = document.getElementById('fin-month-filter');
    var categoryFilter = document.getElementById('fin-category-filter');

    var monthVal = monthFilter ? monthFilter.value : 'all';
    var catVal = categoryFilter ? categoryFilter.value : 'all';

    var filtered = [];

    for (var i = 0; i < transactions.length; i++) {
      var t = transactions[i];

      // Filtro de mes
      if (monthVal !== 'all') {
        var txMonth = t.date ? t.date.substring(0, 7) : '';
        if (txMonth !== monthVal) continue;
      }

      // Filtro de categoria
      if (catVal !== 'all') {
        if (t.category_id !== catVal) continue;
      }

      filtered.push(t);
    }

    renderTransactions(filtered);
  }

  /**
   * Renderiza la lista de transacciones filtradas
   * @param {Array} filtered
   */
  function renderTransactions(filtered) {
    hideSkeleton('skel-finances');
    var list = document.getElementById('fin-list');
    var counter = document.getElementById('fin-counter');
    if (!list) return;

    list.innerHTML = '';

    if (!filtered || filtered.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'fin-empty';
      empty.innerHTML = '<i class="fa-regular fa-credit-card" style="font-size:1.5rem;display:block;margin-bottom:6px;opacity:0.5;"></i>No hay transacciones';
      list.appendChild(empty);

      if (counter) {
        counter.textContent = '0 transacciones';
      }
      return;
    }

    for (var i = 0; i < filtered.length; i++) {
      var t = filtered[i];
      var cat = getCategoryById(t.category_id);

      var item = document.createElement('div');
      item.className = 'fin-item';
      item.dataset.id = t.id;

      // Indicador de color + icono de categoria
      var colorDot = cat ? cat.color : '#6b7280';
      var catIcon = cat ? cat.icon : 'fa-solid fa-circle';

      // Icono de categoria (columna izquierda)
      var iconWrap = document.createElement('div');
      iconWrap.className = 'fin-item-icon';
      iconWrap.style.background = colorDot + '22';
      iconWrap.innerHTML = '<i class="' + escapeHtml(catIcon) + '" style="color:' + colorDot + ';"></i>';

      // Info + Amount wrapper (columna central)
      var infoWrap = document.createElement('div');
      infoWrap.className = 'fin-item-info-wrap';

      var info = document.createElement('div');
      info.className = 'fin-item-info';

      var desc = document.createElement('span');
      desc.className = 'fin-item-desc';
      desc.textContent = t.description || (cat ? cat.name : 'Sin descripcion');

      var date = document.createElement('span');
      date.className = 'fin-item-date';
      date.textContent = formatDate(t.date);

      info.appendChild(desc);
      info.appendChild(date);

      // Monto
      var amount = document.createElement('span');
      amount.className = 'fin-item-amount';
      if (t.type === 'ingreso') {
        amount.classList.add('fin-income');
        amount.textContent = '+' + formatAmount(t.amount);
      } else {
        amount.classList.add('fin-expense');
        amount.textContent = '-' + formatAmount(t.amount);
      }

      infoWrap.appendChild(info);
      infoWrap.appendChild(amount);

      // Botones editar + eliminar
      var actions = document.createElement('div');
      actions.className = 'fin-item-actions';

      var editBtn = document.createElement('button');
      editBtn.className = 'fin-item-edit';
      editBtn.setAttribute('aria-label', 'Editar transaccion');
      editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
      editBtn.dataset.id = t.id;

      var delBtn = document.createElement('button');
      delBtn.className = 'fin-item-delete';
      delBtn.setAttribute('aria-label', 'Eliminar transaccion');
      delBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
      delBtn.dataset.id = t.id;

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      item.appendChild(iconWrap);
      item.appendChild(infoWrap);
      item.appendChild(actions);
      list.appendChild(item);
    }

    if (counter) {
      counter.textContent = filtered.length + (filtered.length === 1 ? ' transaccion' : ' transacciones');
    }
  }

  /**
   * Agrega una nueva transaccion o actualiza si esta en modo edicion
   */
  async function addTransaction() {
    if (!client || !userId) return;

    var categorySelect = document.getElementById('fin-category-select');
    var descriptionInput = document.getElementById('fin-description-input');
    var amountInput = document.getElementById('fin-amount-input');
    var dateInput = document.getElementById('fin-date-input');
    var addBtn = document.getElementById('fin-add-btn');

    var categoryId = categorySelect ? categorySelect.value : '';
    var description = descriptionInput ? descriptionInput.value.trim() : '';
    var amountStr = amountInput ? amountInput.value.trim() : '';
    var dateVal = dateInput ? dateInput.value : getToday();

    // Validaciones
    if (!categoryId) {
      console.warn('[Finanzas] Categoria requerida');
      if (categorySelect) categorySelect.focus();
      return;
    }

    // Normalizar notacion numerica argentina e internacional:
    // "1.234,56" → 1234.56  |  "1234,56" → 1234.56  |  "1234.56" → 1234.56  |  "1234" → 1234
    // Estrategia: si tiene coma Y punto, el punto es miles y la coma es decimal.
    // Si solo tiene coma, la coma es decimal. Si solo tiene punto, el punto es decimal.
    var raw = amountStr.replace(/\s/g, '');
    var normalized;
    if (raw.indexOf(',') !== -1 && raw.lastIndexOf('.') > raw.indexOf(',')) {
      // Caso raro: "1,234.56" (formato US con punto decimal) — punto como decimal
      normalized = raw.replace(/,/g, '');
    } else if (raw.indexOf(',') !== -1 && raw.indexOf('.') !== -1) {
      // "1.234,56" — punto=miles, coma=decimal
      normalized = raw.replace(/\./g, '').replace(',', '.');
    } else if (raw.indexOf(',') !== -1) {
      // "1234,56" — coma=decimal
      normalized = raw.replace(',', '.');
    } else {
      // "1234" o "1234.56" — sin coma, punto es decimal (o entero)
      normalized = raw;
    }
    var amount = parseFloat(normalized);
    if (!amountStr || isNaN(amount) || amount <= 0) {
      console.warn('[Finanzas] Monto invalido');
      if (amountInput) amountInput.focus();
      return;
    }

    if (!dateVal) {
      dateVal = getToday();
    }

    // Deshabilitar boton mientras se inserta/actualiza
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    try {
      if (editingId) {
        // --- MODO EDICION: actualizar transaccion existente ---
        var { data, error } = await client
          .from('finance_transactions')
          .update({
            type: currentType,
            amount: amount,
            category_id: categoryId,
            description: description,
            date: dateVal
          })
          .eq('id', editingId)
          .select()
          .single();

        if (error) {
          console.warn('[Finanzas] Error al actualizar transaccion:', error);
          return;
        }

        cancelEdit();
        window.dispatchEvent(new CustomEvent('sync:success'));
        await loadTransactions();
        updateSummary();
        renderCharts();
      } else {
        // --- MODO AGREGAR: nueva transaccion ---
        var { data, error } = await client
          .from('finance_transactions')
          .insert({
            user_id: userId,
            type: currentType,
            amount: amount,
            category_id: categoryId,
            description: description,
            date: dateVal
          })
          .select()
          .single();

        if (error) {
          console.warn('[Finanzas] Error al agregar transaccion:', error);
          return;
        }

        window.dispatchEvent(new CustomEvent('sync:success'));

        // Limpiar formulario
        if (categorySelect) categorySelect.value = '';
        if (descriptionInput) descriptionInput.value = '';
        if (amountInput) amountInput.value = '';
        if (dateInput) dateInput.value = getToday();

        // Recargar datos
        await loadTransactions();
        updateSummary();
        renderCharts();
      }
    } catch (e) {
      console.warn('[Finanzas] Error en addTransaction:', e);
    } finally {
      if (addBtn) {
        addBtn.disabled = false;
        addBtn.innerHTML = editingId
          ? '<i class="fa-solid fa-check"></i> Guardar'
          : '<i class="fa-solid fa-plus"></i> Agregar';
      }
    }
  }

  /**
   * Elimina una transaccion por ID
   * @param {string} id
   */
  async function deleteTransaction(id) {
    if (!client || !userId) return;

    // Guardar transacción para posible undo
    var txEliminada = transactions.find(function (t) { return t.id === id; });

    // Optimistic update: quitar del array local y re-renderizar
    transactions = transactions.filter(function (t) { return t.id !== id; });
    filterTransactions();

    // Mostrar toast con undo
    if (window.UndoToast) {
      window.UndoToast.show({
        message: 'Transaccion eliminada',
        onUndo: function () {
          if (txEliminada) {
            transactions.push(txEliminada);
            filterTransactions();
          }
        },
        onConfirm: function () {
          client.from('finance_transactions').delete().eq('id', id)
            .then(function (result) {
              if (result.error) {
                console.warn('[Finanzas] Error al eliminar transaccion:', result.error);
                loadTransactions();
              } else {
                window.dispatchEvent(new CustomEvent('sync:success'));
                updateSummary();
                renderCharts();
              }
            })
            .catch(function (e) {
              console.warn('[Finanzas] Error en deleteTransaction:', e);
              loadTransactions();
            });
        }
      });
    } else {
      try {
        var { error } = await client
          .from('finance_transactions')
          .delete()
          .eq('id', id);

        if (error) {
          console.warn('[Finanzas] Error al eliminar transaccion:', error);
          await loadTransactions();
        } else {
          window.dispatchEvent(new CustomEvent('sync:success'));
          updateSummary();
          renderCharts();
        }
      } catch (e) {
        console.warn('[Finanzas] Error en deleteTransaction:', e);
        await loadTransactions();
      }
    }
  }

  // =========================================================================
  //  EDITAR TRANSACCION
  // =========================================================================

  /**
   * Entra en modo edicion: pre-llena el formulario con los datos de la transaccion
   * @param {string} id - ID de la transaccion a editar
   */
  function editTransaction(id) {
    var tx = null;
    for (var i = 0; i < transactions.length; i++) {
      if (transactions[i].id === id) { tx = transactions[i]; break; }
    }
    if (!tx) return;

    editingId = id;

    // Setear tipo (gasto/ingreso)
    if (tx.type !== currentType) {
      currentType = tx.type;
      toggleFormType();
    }

    // Abrir formulario
    var panel = document.getElementById('fin-form-panel');
    if (panel) panel.classList.add('fin-form-open');

    // Pre-llenar campos
    var categorySelect = document.getElementById('fin-category-select');
    var descriptionInput = document.getElementById('fin-description-input');
    var amountInput = document.getElementById('fin-amount-input');
    var dateInput = document.getElementById('fin-date-input');

    if (categorySelect) categorySelect.value = tx.category_id || '';
    if (descriptionInput) descriptionInput.value = tx.description || '';
    if (amountInput) amountInput.value = (parseFloat(tx.amount) || 0).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    if (dateInput) dateInput.value = tx.date || getToday();

    // Cambiar boton a "Guardar" y mostrar cancelar
    var addBtn = document.getElementById('fin-add-btn');
    var cancelBtn = document.getElementById('fin-cancel-btn');
    if (addBtn) addBtn.innerHTML = '<i class="fa-solid fa-check"></i> Guardar';
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    // Borde visual de edicion
    if (panel) panel.classList.add('fin-editing');

    // Scroll al formulario
    panel && panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Focus en descripcion o monto
    if (descriptionInput) descriptionInput.focus();
  }

  /**
   * Sale del modo edicion y vuelve al modo agregar
   */
  function cancelEdit() {
    editingId = null;

    // Limpiar formulario
    var categorySelect = document.getElementById('fin-category-select');
    var descriptionInput = document.getElementById('fin-description-input');
    var amountInput = document.getElementById('fin-amount-input');
    var dateInput = document.getElementById('fin-date-input');
    if (categorySelect) categorySelect.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (amountInput) amountInput.value = '';
    if (dateInput) dateInput.value = getToday();

    // Volver tipo a gasto
    if (currentType !== 'gasto') {
      currentType = 'ingreso'; // toggleFormType lo va a cambiar a gasto
      toggleFormType();
    }

    // Restaurar boton y ocultar cancelar
    var addBtn = document.getElementById('fin-add-btn');
    var cancelBtn = document.getElementById('fin-cancel-btn');
    if (addBtn) addBtn.innerHTML = '<i class="fa-solid fa-check"></i> Agregar';
    if (cancelBtn) cancelBtn.style.display = 'none';

    // Quitar borde de edicion
    var panel = document.getElementById('fin-form-panel');
    if (panel) panel.classList.remove('fin-editing');
  }

  // =========================================================================
  //  RESUMEN
  // =========================================================================

  /**
   * Calcula y actualiza el resumen: balance, ingresos y gastos del mes
   */
  function updateSummary() {
    var balanceEl = document.getElementById('fin-balance-value');
    var incomeEl = document.getElementById('fin-income-value');
    var expenseEl = document.getElementById('fin-expense-value');

    var currentMonth = getCurrentMonth();
    var totalIncome = 0;
    var totalExpense = 0;
    var allIncome = 0;
    var allExpense = 0;

    for (var i = 0; i < transactions.length; i++) {
      var t = transactions[i];
      var amount = parseFloat(t.amount) || 0;
      var txMonth = t.date ? t.date.substring(0, 7) : '';

      if (t.type === 'ingreso') {
        allIncome += amount;
        if (txMonth === currentMonth) {
          totalIncome += amount;
        }
      } else {
        allExpense += amount;
        if (txMonth === currentMonth) {
          totalExpense += amount;
        }
      }
    }

    var balance = allIncome - allExpense;

    var balText = formatAmount(balance);
    var incText = '+' + formatAmount(totalIncome);
    var expText = '-' + formatAmount(totalExpense);

    if (balanceEl) {
      balanceEl.dataset.realValue = balText;
      balanceEl.textContent = finSummaryHidden ? '●●●●●●●' : balText;
    }
    if (incomeEl) {
      incomeEl.dataset.realValue = incText;
      incomeEl.textContent = finSummaryHidden ? '●●●●●●●' : incText;
    }
    if (expenseEl) {
      expenseEl.dataset.realValue = expText;
      expenseEl.textContent = finSummaryHidden ? '●●●●●●●' : expText;
    }
  }

  // =========================================================================
  //  GRAFICOS (Chart.js)
  // =========================================================================

  /**
   * Renderiza graficos segun el tab activo (carga Chart.js on-demand si hace falta)
   */
  function renderCharts() {
    if (typeof Chart === 'undefined') {
      loadCDN('chartjs').then(function (ok) {
        if (ok) { renderCharts(); }
      });
      return;
    }
    renderDonutChart();
    if (currentTab === 'graficos') {
      renderGraficosTab();
    }
  }

  /**
   * Renderiza todo el tab de graficos: barras, linea, comparacion
   */
  function renderGraficosTab() {
    renderBarChart();
    renderLineChart();
    updateComparison();
  }

  /**
   * Renderiza el grafico de dona con gastos del mes por categoria
   */
  function renderDonutChart() {
    var canvas = document.getElementById('fin-donut-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    // Destruir instancia anterior si existe
    if (donutChart) {
      donutChart.destroy();
      donutChart = null;
    }

    var currentMonth = getCurrentMonth();
    var categoryMap = {};

    for (var i = 0; i < transactions.length; i++) {
      var t = transactions[i];
      if (t.type !== 'gasto') continue;
      var txMonth = t.date ? t.date.substring(0, 7) : '';
      if (txMonth !== currentMonth) continue;

      var cat = getCategoryById(t.category_id);
      var catName = cat ? cat.name : 'Sin categoria';
      var catColor = cat ? cat.color : '#6b7280';

      if (!categoryMap[t.category_id]) {
        categoryMap[t.category_id] = { name: catName, color: catColor, total: 0 };
      }
      categoryMap[t.category_id].total += parseFloat(t.amount) || 0;
    }

    var keys = Object.keys(categoryMap);

    if (keys.length === 0) {
      // Sin datos: mostrar dona vacia con gris
      donutChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            data: [1],
            backgroundColor: ['#334155'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '65%',
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          }
        }
      });
      return;
    }

    var labels = [];
    var values = [];
    var colors = [];

    for (var j = 0; j < keys.length; j++) {
      var entry = categoryMap[keys[j]];
      labels.push(entry.name);
      values.push(parseFloat(entry.total.toFixed(2)));
      colors.push(entry.color);
    }

    // Calcular total para texto central
    var grandTotal = 0;
    for (var k = 0; k < values.length; k++) {
      grandTotal += values[k];
    }

    var currency = getCurrency();

    donutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: 'rgba(0,0,0,0.1)',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 8,
              font: { size: 11 },
              color: '#94a3b8'
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                var label = context.label || '';
                var value = context.parsed || 0;
                return label + ': ' + currency + value.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                });
              }
            }
          }
        },
        plugins: [{
          id: 'centerText',
          afterDraw: function (chart) {
            var ctx = chart.ctx;
            var width = chart.width;
            var height = chart.height;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            var centerX = width / 2;
            var centerY = height / 2 - 8;

            ctx.font = 'bold 14px sans-serif';
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(currency + grandTotal.toLocaleString('es-AR', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }), centerX, centerY);

            ctx.font = '11px sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Gastos del mes', centerX, centerY + 18);

            ctx.restore();
          }
        }]
      }
    });
  }

  /**
   * Renderiza el grafico de barras (ingresos vs gastos ultimos 6 meses)
   */
  function renderBarChart() {
    var canvas = document.getElementById('fin-bar-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    // Destruir instancia anterior si existe
    if (barChart) {
      barChart.destroy();
      barChart = null;
    }

    // Calcular ultimos 6 meses
    var labels = [];
    var incomeData = [];
    var expenseData = [];
    var now = new Date();

    for (var m = 5; m >= 0; m--) {
      var d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      var year = d.getFullYear();
      var month = String(d.getMonth() + 1).padStart(2, '0');
      var ym = year + '-' + month;
      var monthLabel = MONTH_NAMES[d.getMonth()];

      labels.push(monthLabel);

      var monthIncome = 0;
      var monthExpense = 0;

      for (var i = 0; i < transactions.length; i++) {
        var t = transactions[i];
        var txMonth = t.date ? t.date.substring(0, 7) : '';
        if (txMonth !== ym) continue;

        var amount = parseFloat(t.amount) || 0;
        if (t.type === 'ingreso') {
          monthIncome += amount;
        } else {
          monthExpense += amount;
        }
      }

      incomeData.push(parseFloat(monthIncome.toFixed(2)));
      expenseData.push(parseFloat(monthExpense.toFixed(2)));
    }

    barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Ingresos',
            data: incomeData,
            backgroundColor: 'rgba(34, 197, 94, 0.7)',
            borderColor: '#22c55e',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.7
          },
          {
            label: 'Gastos',
            data: expenseData,
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 10 },
              callback: function (value) {
                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                return value;
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 8,
              font: { size: 11 },
              color: '#94a3b8'
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                var label = context.dataset.label || '';
                var value = context.parsed.y || 0;
                return label + ': ' + getCurrency() + value.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                });
              }
            }
          }
        }
      }
    });
  }

  /**
   * Renderiza el grafico de linea (balance acumulado a lo largo del tiempo)
   */
  function renderLineChart() {
    var canvas = document.getElementById('fin-line-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    if (lineChart) {
      lineChart.destroy();
      lineChart = null;
    }

    // Calcular balance acumulado por mes (ultimos 6 meses)
    var labels = [];
    var balanceData = [];
    var runningBalance = 0;
    var now = new Date();
    var months = [];

    for (var m = 5; m >= 0; m--) {
      var d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      var year = d.getFullYear();
      var month = String(d.getMonth() + 1).padStart(2, '0');
      var ym = year + '-' + month;
      months.push({ ym: ym, label: MONTH_NAMES[d.getMonth()] });
    }

    // Calcular balance acumulado desde el mes 5 hasta el actual
    for (var i = 0; i < months.length; i++) {
      var monthIncome = 0;
      var monthExpense = 0;

      for (var j = 0; j < transactions.length; j++) {
        var t = transactions[j];
        var txMonth = t.date ? t.date.substring(0, 7) : '';
        if (txMonth !== months[i].ym) continue;

        var amount = parseFloat(t.amount) || 0;
        if (t.type === 'ingreso') {
          monthIncome += amount;
        } else {
          monthExpense += amount;
        }
      }

      runningBalance += (monthIncome - monthExpense);
      labels.push(months[i].label);
      balanceData.push(parseFloat(runningBalance.toFixed(2)));
    }

    lineChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Balance',
          data: balanceData,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: '#06b6d4',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 10 },
              callback: function (value) {
                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                return value;
              }
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                var value = context.parsed.y || 0;
                var prefix = value >= 0 ? '' : '-';
                return 'Balance: ' + prefix + getCurrency() + Math.abs(value).toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                });
              }
            }
          }
        }
      }
    });
  }

  /**
   * Actualiza las cards de comparacion (mes actual vs anterior)
   */
  function updateComparison() {
    var now = new Date();
    var currentMonth = getCurrentMonth();
    var prevMonth;
    if (now.getMonth() === 0) {
      prevMonth = (now.getFullYear() - 1) + '-12';
    } else {
      prevMonth = now.getFullYear() + '-' + String(now.getMonth()).padStart(2, '0');
    }

    var currentIncome = 0, currentExpense = 0;
    var prevIncome = 0, prevExpense = 0;

    for (var i = 0; i < transactions.length; i++) {
      var t = transactions[i];
      var amount = parseFloat(t.amount) || 0;
      var txMonth = t.date ? t.date.substring(0, 7) : '';

      if (txMonth === currentMonth) {
        if (t.type === 'ingreso') currentIncome += amount;
        else currentExpense += amount;
      } else if (txMonth === prevMonth) {
        if (t.type === 'ingreso') prevIncome += amount;
        else prevExpense += amount;
      }
    }

    // Income comparison
    setComparisonCard('income', currentIncome, prevIncome);
    // Expense comparison
    setComparisonCard('expense', currentExpense, prevExpense);
  }

  /**
   * Setea una card de comparacion individual
   * @param {string} type - 'income' o 'expense'
   * @param {number} current - monto del mes actual
   * @param {number} prev - monto del mes anterior
   */
  function setComparisonCard(type, current, prev) {
    var currentEl = document.getElementById('fin-cmp-' + type + '-current');
    var changeEl = document.getElementById('fin-cmp-' + type + '-change');
    var arrowEl = document.getElementById('fin-cmp-' + type + '-arrow');

    if (!currentEl || !changeEl || !arrowEl) return;

    currentEl.textContent = formatAmount(current);

    // Para gastos, subir es malo. Para ingresos, subir es bueno.
    if (prev === 0 && current === 0) {
      changeEl.textContent = '0%';
      changeEl.className = 'fin-cmp-change neutral';
      arrowEl.className = 'fin-cmp-arrow neutral';
      arrowEl.innerHTML = '<i class="fa-solid fa-minus"></i>';
    } else if (prev === 0) {
      changeEl.textContent = '+100%';
      changeEl.className = 'fin-cmp-change positive';
      arrowEl.className = 'fin-cmp-arrow positive';
      arrowEl.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    } else {
      var pctChange = ((current - prev) / prev) * 100;
      var sign = pctChange >= 0 ? '+' : '';
      changeEl.textContent = sign + pctChange.toFixed(1) + '%';

      if (type === 'expense') {
        // Gastos: subir es malo, bajar es bueno
        if (pctChange > 0) {
          changeEl.className = 'fin-cmp-change negative';
          arrowEl.className = 'fin-cmp-arrow negative';
          arrowEl.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        } else if (pctChange < 0) {
          changeEl.className = 'fin-cmp-change positive';
          arrowEl.className = 'fin-cmp-arrow positive';
          arrowEl.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
        } else {
          changeEl.className = 'fin-cmp-change neutral';
          arrowEl.className = 'fin-cmp-arrow neutral';
          arrowEl.innerHTML = '<i class="fa-solid fa-minus"></i>';
        }
      } else {
        // Ingresos: subir es bueno, bajar es malo
        if (pctChange > 0) {
          changeEl.className = 'fin-cmp-change positive';
          arrowEl.className = 'fin-cmp-arrow positive';
          arrowEl.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        } else if (pctChange < 0) {
          changeEl.className = 'fin-cmp-change negative';
          arrowEl.className = 'fin-cmp-arrow negative';
          arrowEl.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
        } else {
          changeEl.className = 'fin-cmp-change neutral';
          arrowEl.className = 'fin-cmp-arrow neutral';
          arrowEl.innerHTML = '<i class="fa-solid fa-minus"></i>';
        }
      }
    }
  }

  // =========================================================================
  //  FORMULARIO
  // =========================================================================

  /**
   * Alterna entre tipo 'gasto' e 'ingreso' en el formulario
   */
  function toggleFormType() {
    var btn = document.getElementById('fin-type-btn');
    var formPanel = document.getElementById('fin-form-panel');

    if (currentType === 'gasto') {
      currentType = 'ingreso';
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-arrow-trend-up"></i> Ingreso';
        btn.classList.remove('fin-type-gasto');
        btn.classList.add('fin-type-ingreso');
      }
      if (formPanel) {
        formPanel.classList.remove('fin-type-gasto');
        formPanel.classList.add('fin-type-ingreso');
      }
    } else {
      currentType = 'gasto';
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-arrow-trend-down"></i> Gasto';
        btn.classList.remove('fin-type-ingreso');
        btn.classList.add('fin-type-gasto');
      }
      if (formPanel) {
        formPanel.classList.remove('fin-type-ingreso');
        formPanel.classList.add('fin-type-gasto');
      }
    }

    // Re-popular categorias para el nuevo tipo
    populateCategorySelect(currentType);
  }

  /**
   * Muestra/oculta el panel del formulario
   */
  function toggleFormPanel() {
    var panel = document.getElementById('fin-form-panel');
    if (!panel) return;
    panel.classList.toggle('fin-form-open');
  }

  /**
   * Llena el filtro de meses con opciones
   */
  function populateMonthFilter() {
    var select = document.getElementById('fin-month-filter');
    if (!select) return;

    select.innerHTML = '';

    // Opcion "Todos"
    var allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Todos los meses';
    select.appendChild(allOption);

    // Generar ultimos 12 meses
    var now = new Date();
    for (var m = 0; m < 12; m++) {
      var d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      var year = d.getFullYear();
      var month = String(d.getMonth() + 1).padStart(2, '0');
      var ym = year + '-' + month;
      var label = MONTH_NAMES_FULL[d.getMonth()] + ' ' + year;

      var option = document.createElement('option');
      option.value = ym;
      option.textContent = label;

      // Seleccionar mes actual por defecto
      if (m === 0) option.selected = true;

      select.appendChild(option);
    }
  }

  /**
   * Limpia el estado del modulo (al cerrar sesion)
   */
  function cleanup() {
    categories = [];
    transactions = [];
    userId = null;
    currentType = 'gasto';
    editingId = null;
    donutChart = null;
    barChart = null;
    lineChart = null;
    initialized = false;
    var summaryRow = document.querySelector('.fin-summary-row');
    if (summaryRow) summaryRow.classList.remove('fin-privacy-on');

    var list = document.getElementById('fin-list');
    if (list) list.innerHTML = '';

    var balanceEl = document.getElementById('fin-balance-value');
    if (balanceEl) balanceEl.textContent = getCurrency() + '0,00';

    var incomeEl = document.getElementById('fin-income-value');
    if (incomeEl) incomeEl.textContent = '+' + getCurrency() + '0,00';

    var expenseEl = document.getElementById('fin-expense-value');
    if (expenseEl) expenseEl.textContent = '-' + getCurrency() + '0,00';

    var counter = document.getElementById('fin-counter');
    if (counter) counter.textContent = '0 transacciones';
  }

  // =========================================================================
  //  EXPORTAR A XLSX
  // =========================================================================

  /**
   * Exporta las transacciones filtradas actualmente a un archivo XLSX
   * Carga SheetJS on-demand si no está disponible
   */
  function exportToXlsx() {
    if (typeof XLSX === 'undefined') {
      var exportBtn = document.getElementById('fin-export-btn');
      if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      }
      loadCDN('xlsx').then(function (ok) {
        if (exportBtn) {
          exportBtn.disabled = false;
          exportBtn.innerHTML = '<i class="fa-solid fa-file-excel"></i>';
        }
        if (ok) { exportToXlsx(); }
        else { console.warn('[Finanzas] No se pudo cargar SheetJS'); }
      });
      return;
    }

    // Obtener filtros actuales
    var monthFilter = document.getElementById('fin-month-filter');
    var categoryFilter = document.getElementById('fin-category-filter');
    var monthVal = monthFilter ? monthFilter.value : 'all';
    var catVal = categoryFilter ? categoryFilter.value : 'all';

    // Filtrar transacciones (misma lógica que filterTransactions)
    var filtered = [];
    for (var i = 0; i < transactions.length; i++) {
      var t = transactions[i];
      if (monthVal !== 'all') {
        var txMonth = t.date ? t.date.substring(0, 7) : '';
        if (txMonth !== monthVal) continue;
      }
      if (catVal !== 'all') {
        if (t.category_id !== catVal) continue;
      }
      filtered.push(t);
    }

    if (filtered.length === 0) {
      console.warn('[Finanzas] No hay transacciones para exportar');
      return;
    }

    // Ordenar por fecha ascendente para el archivo
    filtered.sort(function (a, b) {
      return (a.date || '').localeCompare(b.date || '');
    });

    // Generar nombre de archivo
    var monthLabel = monthVal === 'all' ? 'todos' : monthVal.replace('-', '_');
    var fileName = 'MozzPCC_Finanzas_' + monthLabel + '.xlsx';

    // Construir filas de datos
    var rows = [];
    var currency = getCurrency();

    for (var j = 0; j < filtered.length; j++) {
      var tx = filtered[j];
      var cat = getCategoryById(tx.category_id);
      var amount = parseFloat(tx.amount) || 0;
      var sign = tx.type === 'ingreso' ? '+' : '-';
      var description = tx.description || (cat ? cat.name : 'Sin descripcion');

      rows.push({
        'Fecha': tx.date ? formatDate(tx.date) : '',
        'Tipo': tx.type === 'ingreso' ? 'Ingreso' : 'Gasto',
        'Categoria': cat ? cat.name : 'Sin categoria',
        'Descripcion': description,
        ['Monto (' + currency + ')']: parseFloat(sign + amount)
      });
    }

    // Calcular totales
    var totalIncome = 0;
    var totalExpense = 0;
    for (var k = 0; k < filtered.length; k++) {
      var amt = parseFloat(filtered[k].amount) || 0;
      if (filtered[k].type === 'ingreso') totalIncome += amt;
      else totalExpense += amt;
    }
    rows.push({});
    rows.push({
      'Fecha': '',
      'Tipo': '',
      'Categoria': 'Total Ingresos',
      'Descripcion': '',
      ['Monto (' + currency + ')']: parseFloat('+' + totalIncome)
    });
    rows.push({
      'Fecha': '',
      'Tipo': '',
      'Categoria': 'Total Gastos',
      'Descripcion': '',
      ['Monto (' + currency + ')']: parseFloat('-' + totalExpense)
    });
    rows.push({
      'Fecha': '',
      'Tipo': '',
      'Categoria': 'Balance',
      'Descripcion': '',
      ['Monto (' + currency + ')']: parseFloat(totalIncome - totalExpense)
    });

    // Crear workbook
    var ws = XLSX.utils.json_to_sheet(rows);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 12 },  // Fecha
      { wch: 10 },  // Tipo
      { wch: 18 },  // Categoria
      { wch: 30 },  // Descripcion
      { wch: 16 }   // Monto
    ];

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
    XLSX.writeFile(wb, fileName);
  }

  // =========================================================================
  //  INICIALIZACION
  // =========================================================================

  /**
   * Inicializa el modulo de finanzas
   */
  async function init() {
    if (initialized) return;
    initialized = true;

    client = window.supabaseClient || null;
    if (!client) {
      console.warn('[Finanzas] Supabase client no disponible');
      initialized = false;
      return;
    }

    try {
      var { data, error } = await client.auth.getSession();
      if (error || !data || !data.session) {
        console.warn('[Finanzas] No hay sesion activa');
        initialized = false;
        return;
      }

      userId = data.session.user.id;
    } catch (e) {
      console.warn('[Finanzas] Error al obtener sesion:', e);
      initialized = false;
      return;
    }

    // Sembrar categorias por defecto si es necesario
    await seedCategories();

    // Cargar categorias
    await loadCategories();

    // Poblar filtro de meses
    populateMonthFilter();

    // Establecer tipo inicial del formulario
    var formPanel = document.getElementById('fin-form-panel');
    if (formPanel) {
      formPanel.classList.add('fin-type-gasto');
    }

    // Cargar transacciones
    await loadTransactions();

    // Actualizar resumen
    updateSummary();

    // Restaurar estado de privacidad del resumen
    if (finSummaryHidden) {
      var sRow = document.querySelector('.fin-summary-row');
      if (sRow) sRow.classList.add('fin-privacy-on');
    }

    // Renderizar graficos (con pequeño delay para asegurar canvas esta visible)
    setTimeout(function () {
      renderCharts();
    }, 300);

    // Configurar fecha por defecto
    var dateInput = document.getElementById('fin-date-input');
    if (dateInput && !dateInput.value) {
      dateInput.value = getToday();
    }
  }

  // =========================================================================
  //  EVENT LISTENERS (se configuran una vez)
  // =========================================================================

  // Boton toggle tipo (gasto/ingreso)
  var typeBtn = document.getElementById('fin-type-btn');
  if (typeBtn) {
    typeBtn.addEventListener('click', function () {
      toggleFormType();
    });
  }

  // Boton agregar transaccion
  var addBtn = document.getElementById('fin-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      addTransaction();
    });
  }

  // Boton cancelar edicion
  var cancelBtn = document.getElementById('fin-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
      cancelEdit();
    });
  }

  // Boton toggle panel del formulario
  var formToggle = document.getElementById('fin-form-toggle');
  if (formToggle) {
    formToggle.addEventListener('click', function () {
      toggleFormPanel();
    });
  }

  // Filtro de mes
  var monthFilter = document.getElementById('fin-month-filter');
  if (monthFilter) {
    monthFilter.addEventListener('change', function () {
      filterTransactions();
      updateSummary();
      renderCharts();
    });
  }

  // Filtro de categoria
  var categoryFilter = document.getElementById('fin-category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', function () {
      filterTransactions();
    });
  }

  // Exportar a XLSX
  var exportBtn = document.getElementById('fin-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      exportToXlsx();
    });
  }

  // Tab switching
  var finTabs = document.querySelectorAll('.fin-tab');
  for (var ti = 0; ti < finTabs.length; ti++) {
    finTabs[ti].addEventListener('click', function () {
      var tabName = this.dataset.tab;
      if (!tabName) return;

      // Update tab buttons
      for (var j = 0; j < finTabs.length; j++) {
        finTabs[j].classList.remove('active');
      }
      this.classList.add('active');

      // Update tab content
      var contents = document.querySelectorAll('.fin-tab-content');
      for (var k = 0; k < contents.length; k++) {
        contents[k].classList.remove('active');
      }
      var targetContent = document.getElementById('fin-tab-' + tabName);
      if (targetContent) targetContent.classList.add('active');

      currentTab = tabName;

      // Render charts for the new tab (needed because Chart.js requires visible canvas)
      setTimeout(function () {
        if (typeof Chart === 'undefined') {
          loadCDN('chartjs').then(function (ok) {
            if (ok) {
              if (tabName === 'graficos') { renderGraficosTab(); }
              else { renderDonutChart(); }
            }
          });
          return;
        }
        if (tabName === 'graficos') {
          renderGraficosTab();
        } else {
          renderDonutChart();
        }
      }, 50);
    });
  }

  // Delegacion de eventos para botones de editar y eliminar en la lista
  var finList = document.getElementById('fin-list');
  if (finList) {
    finList.addEventListener('click', function (e) {
      var editTarget = e.target.closest('.fin-item-edit');
      if (editTarget && editTarget.dataset.id) {
        editTransaction(editTarget.dataset.id);
        return;
      }
      var deleteTarget = e.target.closest('.fin-item-delete');
      if (deleteTarget && deleteTarget.dataset.id) {
        deleteTransaction(deleteTarget.dataset.id);
      }
    });
  }

  // Enter en campo de monto para agregar
  var amountInput = document.getElementById('fin-amount-input');
  if (amountInput) {
    amountInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        addTransaction();
      }
    });
  }

  // Toggle privacidad del resumen financiero
  var summaryRow = document.querySelector('.fin-summary-row');
  if (summaryRow) {
    summaryRow.addEventListener('click', function () {
      finSummaryHidden = !finSummaryHidden;
      var vals = document.querySelectorAll('.fin-summary-value');
      for (var i = 0; i < vals.length; i++) {
        if (finSummaryHidden) {
          vals[i].dataset.realValue = vals[i].textContent;
          vals[i].textContent = '●●●●●●●';
        } else {
          vals[i].textContent = vals[i].dataset.realValue || vals[i].textContent;
        }
      }
      summaryRow.classList.toggle('fin-privacy-on', finSummaryHidden);
      localStorage.setItem('mozzpcc-fin-summary-hidden', finSummaryHidden ? 'true' : 'false');
    });

    // Restaurar estado guardado al cargar
    if (finSummaryHidden) {
      var vals = document.querySelectorAll('.fin-summary-value');
      for (var j = 0; j < vals.length; j++) {
        vals[j].dataset.realValue = vals[j].textContent;
        vals[j].textContent = '●●●●●●●';
      }
      summaryRow.classList.add('fin-privacy-on');
    }
  }

  // Enter en campo de descripcion para saltar a monto
  var descriptionInput = document.getElementById('fin-description-input');
  if (descriptionInput) {
    descriptionInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        if (amountInput) amountInput.focus();
      }
    });
  }

  // Escuchar evento de autenticacion lista
  window.addEventListener('auth:ready', function () {
    init();
  });

  // Escuchar cierre de sesion
  window.addEventListener('auth:logout', function () {
    cleanup();
  });

  // =============================================
  // API PUBLICA (para commandPalette.js)
  // =============================================

  window.Finanzas = {
    getTransactions: function () {
      return transactions.slice();
    },
    getCategories: function () {
      return categories.slice();
    }
  };

})();
