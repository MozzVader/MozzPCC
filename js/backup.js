/**
 * backup.js — Backup & Restore de datos del usuario
 * Exporta/importa todas las tablas del usuario como JSON
 * Se accede desde Configuracion → Backup
 */

(function () {
  'use strict';

  var exportBtn = document.getElementById('backup-export-btn');
  var exportStatus = document.getElementById('backup-export-status');
  var importFile = document.getElementById('backup-import-file');
  var importFilename = document.getElementById('backup-import-filename');
  var importBtn = document.getElementById('backup-import-btn');
  var importStatus = document.getElementById('backup-import-status');

  var pendingBackupData = null;

  // Tablas a backupear (orden importa para restore)
  var TABLES = [
    'user_preferences',
    'user_quick_links',
    'tasks',
    'notes',
    'finance_categories',
    'finance_transactions',
    'read_later_items',
    'tv_shows'
  ];

  async function getUserId() {
    var client = getSupabase();
    if (!client) return null;
    try {
      var result = await client.auth.getSession();
      if (result && result.data && result.data.session) {
        return result.data.session.user.id;
      }
    } catch (e) {
      console.warn('MozzPCC: Error obteniendo sesión:', e);
    }
    return null;
  }

  // =============================================
  // EXPORT
  // =============================================

  async function exportBackup() {
    var client = getSupabase();
    var userId = await getUserId();
    if (!client || !userId) {
      setStatus(exportStatus, 'Error: no hay sesion activa', 'error');
      return;
    }

    exportBtn.disabled = true;
    exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exportando...';
    setStatus(exportStatus, '', '');

    try {
      var backup = {
        version: 1,
        app: 'MozzPCC',
        exported_at: new Date().toISOString(),
        user_id: userId,
        tables: {}
      };

      for (var i = 0; i < TABLES.length; i++) {
        var table = TABLES[i];
        var result = await client
          .from(table)
          .select('*')
          .eq('user_id', userId);

        if (result.error) {
          // La tabla puede no existir
          if (result.error.code === '42P01') {
            backup.tables[table] = [];
            continue;
          }
          console.warn('MozzPCC: Error exportando ' + table + ':', result.error);
          backup.tables[table] = [];
          continue;
        }

        backup.tables[table] = result.data || [];
      }

      // Descargar como JSON
      var json = JSON.stringify(backup, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);

      var a = document.createElement('a');
      a.href = url;
      var dateStr = new Date().toISOString().slice(0, 10);
      a.download = 'mozzpcc-backup-' + dateStr + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Contar total de registros
      var totalCount = 0;
      TABLES.forEach(function (t) {
        totalCount += (backup.tables[t] || []).length;
      });

      setStatus(exportStatus, 'Backup descargado (' + totalCount + ' registros en ' + TABLES.length + ' tablas)', 'success');
    } catch (e) {
      console.warn('MozzPCC: Error exportando backup:', e);
      setStatus(exportStatus, 'Error al exportar: ' + e.message, 'error');
    } finally {
      exportBtn.disabled = false;
      exportBtn.innerHTML = '<i class="fa-solid fa-download"></i> Descargar backup';
    }
  }

  // =============================================
  // IMPORT
  // =============================================

  function handleFileSelect(e) {
    var file = e.target.files[0];
    if (!file) {
      pendingBackupData = null;
      importFilename.textContent = '';
      importBtn.style.display = 'none';
      return;
    }

    importFilename.textContent = file.name;

    // Validar que sea JSON
    if (!file.name.endsWith('.json')) {
      setStatus(importStatus, 'El archivo debe ser .json', 'error');
      pendingBackupData = null;
      importBtn.style.display = 'none';
      return;
    }

    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var data = JSON.parse(ev.target.result);

        // Validar estructura
        if (!data.app || data.app !== 'MozzPCC' || !data.tables) {
          setStatus(importStatus, 'Archivo invalido: no es un backup de MozzPCC', 'error');
          pendingBackupData = null;
          importBtn.style.display = 'none';
          return;
        }

        if (!data.version || data.version > 1) {
          setStatus(importStatus, 'Version de backup no compatible', 'error');
          pendingBackupData = null;
          importBtn.style.display = 'none';
          return;
        }

        // Contar registros
        var totalCount = 0;
        TABLES.forEach(function (t) {
          totalCount += (data.tables[t] || []).length;
        });

        pendingBackupData = data;
        importBtn.style.display = 'inline-flex';
        setStatus(importStatus, 'Archivo valido: ' + totalCount + ' registros (' + new Date(data.exported_at).toLocaleDateString() + ')', 'info');
      } catch (parseErr) {
        console.warn('MozzPCC: Error parseando backup:', parseErr);
        setStatus(importStatus, 'Error al leer el archivo: no es JSON valido', 'error');
        pendingBackupData = null;
        importBtn.style.display = 'none';
      }
    };
    reader.readAsText(file);
  }

  async function importBackup() {
    if (!pendingBackupData) return;
    if (!confirm('Esto reemplazara todos tus datos actuales con los del backup. Continuar?')) return;
    if (!confirm('Estas seguro? Esta accion no se puede deshacer.')) return;

    var client = getSupabase();
    var userId = await getUserId();
    if (!client || !userId) {
      setStatus(importStatus, 'Error: no hay sesion activa', 'error');
      return;
    }

    importBtn.disabled = true;
    importBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Restaurando...';
    setStatus(importStatus, '', '');

    try {
      // Para cada tabla: borrar los datos actuales, insertar los del backup
      for (var i = 0; i < TABLES.length; i++) {
        var table = TABLES[i];
        var backupRows = pendingBackupData.tables[table] || [];

        if (backupRows.length === 0) continue;

        // Verificar que la tabla existe
        var checkResult = await client.from(table).select('id').limit(1);
        if (checkResult.error && checkResult.error.code === '42P01') {
          // Tabla no existe, skip
          continue;
        }

        // Borrar datos actuales del usuario
        await client.from(table).delete().eq('user_id', userId);

        // Insertar datos del backup (remplazar user_id por el actual, limpiar id para que se generen nuevos)
        var cleanRows = backupRows.map(function (row) {
          var clean = {};
          Object.keys(row).forEach(function (key) {
            // Skip id y campos de auditoría
            if (key === 'id') return;
            if (key === 'created_at' && table !== 'tasks' && table !== 'notes' && table !== 'user_quick_links' && table !== 'read_later_items' && table !== 'finance_categories') return;
            if (key === 'updated_at') return;

            // Forzar el user_id actual
            if (key === 'user_id') {
              clean[key] = userId;
            } else {
              clean[key] = row[key];
            }
          });
          return clean;
        });

        if (cleanRows.length > 0) {
          // Insertar en batches de 100 (Supabase limit)
          var batchSize = 100;
          for (var b = 0; b < cleanRows.length; b += batchSize) {
            var batch = cleanRows.slice(b, b + batchSize);
            var insertResult = await client.from(table).insert(batch);
            if (insertResult.error) {
              console.warn('MozzPCC: Error importando ' + table + ' batch ' + Math.floor(b / batchSize) + ':', insertResult.error);
            }
          }
        }
      }

      setStatus(importStatus, 'Backup restaurado correctamente. Recarga la pagina para ver los cambios.', 'success');

      // Limpiar estado
      pendingBackupData = null;
      importFile.value = '';
      importFilename.textContent = '';
      importBtn.style.display = 'none';

    } catch (e) {
      console.warn('MozzPCC: Error importando backup:', e);
      setStatus(importStatus, 'Error al restaurar: ' + e.message, 'error');
    } finally {
      importBtn.disabled = false;
      importBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Restaurar backup';
    }
  }

  // =============================================
  // UTILIDADES
  // =============================================

  function setStatus(el, message, type) {
    el.textContent = message;
    el.className = 'backup-status';
    if (type) el.classList.add(type);
  }

  // =============================================
  // EVENTOS
  // =============================================

  if (exportBtn) exportBtn.addEventListener('click', exportBackup);
  if (importFile) importFile.addEventListener('change', handleFileSelect);
  if (importBtn) importBtn.addEventListener('click', importBackup);

})();
