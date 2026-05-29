# MozzPCC — Resumen del Proyecto y Oportunidades de Mejora

> Documento generado el 26/05/2026. Resumen completo del estado actual del proyecto, trabajo realizado y roadmap de mejoras.

---

## 1. Descripcion del Proyecto

**MozzPCC** (Personal Command Center) es un dashboard personal con snap-scroll vertical, desarrollado en vanilla JavaScript sin frameworks. Cuenta con 8 secciones, 12 widgets, autenticacion via Supabase, UI glassmorphism oscura, y despliegue en GitHub Pages.

### Stack Tecnico

| Componente | Tecnologia |
|---|---|
| Frontend | Vanilla JS (21 archivos IIFE), CSS monolitico, HTML unico |
| Backend | Supabase (Auth, PostgreSQL, Realtime) |
| Graficos | Chart.js (donut, bar, line) |
| Export | SheetJS (XLSX) |
| Iconos | Font Awesome 6 |
| Fuentes | Google Fonts (Inter) |
| APIs externas | Open-Meteo, Bluelytics, TVmaze, GitHub REST, ESPN, RSS2JSON |

### Metricas del Proyecto

| Metrica | Valor |
|---|---:|
| Total lineas de codigo | ~17,114 |
| Archivos JavaScript | 21 |
| Archivo CSS | 1 (6,993 lineas) |
| Archivo HTML | 1 (1,057 lineas) |
| Secciones del dashboard | 8 |
| Widgets distinctos | 12 |
| Modales | 3 (Configuracion, Tips, Command Palette) |
| Metodos de autenticacion | 5 (email, registro, OAuth Google, OAuth GitHub, magic link) |
| APIs externas | 7 |
| Animaciones CSS | 19 keyframes |
| Breakpoints responsive | 3 (480px, 640px, 768px) |
| Tablas SQL | 8 |

---

## 2. Estructura del Dashboard

| # | Seccion | Widget(s) | Descripcion |
|---|---|---|---|
| 1 | `section-clock` | Reloj + Clima + Dolar + Reloj Mundial | Hora, fecha, saludo, clima (7 dias), USD/ARS con sparkline, 3 relojes mundiales |
| 2 | `section-quick-access` | Quick Access | Barra Google + grilla de links personalizables |
| 3 | `section-productivity` | Tasks | Lista 5 estados + tablero Kanban 3 columnas, drag & drop |
| 4 | `section-finances` | Finanzas | Tracking ingresos/gastos, 13 categorias, graficos donut/bar/line, export XLSX |
| 5 | `section-tv-shows` | TV Shows + GitHub | Tracker series (TVmaze) + perfil GitHub (actividad/repos/trending) |
| 6 | `section-notes` | Notas | Notas con color, contenteditable, auto-guardado |
| 7 | `section-read-later` | Read Later | Bookmarks con tags de 5 colores, filtros, drag & drop |
| 8 | `section-news-sports` | Noticias + Deportes | RSS (8 categorias, 50+ fuentes, custom) + resultados ESPN (10 ligas) |

### Overlays y Utilidades Globales

- **Clean Mode** — Esc oculta todo excepto reloj
- **Command Palette** — Ctrl+K busqueda difusa entre secciones, links, tareas, notas
- **Tips Modal** — Atajos y tips de funcionalidades
- **Settings Modal** — 4 tabs: Quick Links, Apariencia, Noticias, Backup
- **Undo Toast** — Deshacer global de 5s en eliminaciones
- **User Bar** — Nombre, indicador sync, botones Tips/Settings/Logout
- **Section Dots** — Navegacion lateral con tooltips e IntersectionObserver
- **Back to Top** — Boton flotante visible fuera de la primera seccion
- **URL Anchors** — Hash actualizable por seccion, restaurable en reload

---

## 3. Historial de Trabajo Realizado

### 3.1 Remocion de Dock y Pomodoro

Limpieza mayor eliminando ~2,000 lineas de codigo. El dock de navegacion y el timer Pomodoro fueron completamente removidos de 9 archivos.

- **9 archivos modificados**
- **1 archivo eliminado** (`js/dock.js`)
- **Net reduction:** ~2,000 lineas

### 3.2 Reemplazo Steam por GitHub Widget

El widget de estadisticas de Steam fue reemplazado completamente por un widget de GitHub con 4 tabs (Perfil, Actividad, Repos, Trending).

- Creado `js/githubWidget.js` (516 lineas)
- Eliminado `js/steamStats.js`
- Actualizado settings: Steam ID → GitHub username
- ~200 lineas CSS eliminadas, ~250 agregadas

### 3.3 Widget de Noticias (RSS)

Desarrollo integral del widget de noticias:

1. **Demo standalone** — Prototipo con RSS2JSON, 8 feeds, dos vistas (lista/destacadas)
2. **Integracion como Seccion 8** — Layout 2 columnas (Noticias + Deportes) con snap-section-grid
3. **Fix Infobae + Settings** — Reemplazo de fuentes fallidas, panel de configuracion con toggles
4. **Expansion v2** — 8 categorias, 4-8 fuentes por categoria, feeds custom, categorias personalizables, multi-select

### 3.4 Correcciones de Bugs

| Bug | Causa | Solucion |
|---|---|---|
| Tarea incorrecta al arrastrar (DnD) | `var` en for loop → closure compartia ultima iteracion | IIFE wrapper para aislar el contexto |
| GitHub API 403 (Rate Limit) | 60 req/hr agotadas, sin cache | sessionStorage cache (5 min TTL) + abort-early + mensaje amigable |
| Infobae RSS fallando | RSS2JSON devolvia 500 con URLs de Infobae | Reemplazo por TN, Clarin, Perfil como fuentes alternativas |

### 3.5 Patrones de Calidad Identificados

**Buenas practicas:**
- IIFE consistente en todos los archivos JS
- Auth event-driven (desacoplamiento total)
- UI optimista con rollback en error
- Undo toast centralizado (5s + barra progreso)
- Cache por widget con TTLs diferenciados
- Rate limit detection en GitHub
- Escape HTML dedicado por widget
- 19 animaciones CSS keyframe
- 12 breakpoints responsive
- Accesibilidad: aria-labels, roles, tabindex, teclado

**Problemas detectados:**
- CSS monolitico de 6,993 lineas sin modularizacion
- `escapeHtml()` duplicado 10+ veces
- Codigo DnD duplicado entre tasks.js y readLater.js
- `getSupabase()` repetido en cada archivo
- `dollar.js` limpia cache innecesariamente
- Edge Function de Steam aun existe (codigo muerto)
- Sin Service Worker / soporte offline
- `settings.js` creciendo como god-module (815 lineas)
- Moneda guardada en localStorage vs Supabase (inconsistencia)

---

## 4. Cuadro de Mejoras y Nuevas Funcionalidades

### Resumen por Categoria

| Categoria | Total | Prioridad Alta | Prioridad Media | Prioridad Baja |
|---|---:|---:|---:|---:|
| Widgets Existentes | 31 | 8 | 15 | 8 |
| Nuevos Widgets | 12 | 1 | 5 | 6 |
| UX / UI | 14 | 3 | 6 | 5 |
| Tecnico | 15 | 4 | 10 | 1 |
| **TOTAL** | **72** | **16** | **36** | **20** |

---

### 4.1 Widgets Existentes

| #      | Widget            | Mejora                                    | Descripcion                                                                                                             | Complejidad | Prioridad    |
| ------ | ----------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------- | ------------ |
| 1      | ~~Reloj Mundial~~ | ~~Reordenar relojes con D&D~~             | ~~Permitir arrastrar las cards individuales de relojes para reordenarlos manualmente. Persistir el orden en Supabase.~~ | ~~Media~~   | ~~Media~~    |
| 2      | ~~Reloj Mundial~~ | ~~Agregar/remover relojes desde UI~~      | ~~Boton para agregar nuevas ciudades con un buscador de timezone, sin necesidad de ir a settings.~~                     | ~~Media~~   | ~~**Alta**~~ |
| 3      | ~~Clima~~         | ~~Pronostico extendido (5-7 dias)~~       | ~~Mostrar una fila con los proximos 5-7 dias debajo del clima actual, con iconos y temperaturas min/max.~~              | ~~Media~~   | ~~Media~~    |
| 4      | ~~Clima~~         | ~~Selector de ubicacion multiple~~        | ~~Permitir guardar varias ciudades y cambiar entre ellas con un mini selector o swipe.~~                                | ~~Media~~   | ~~Baja~~     |
| 5      | ~~Clima~~         | ~~Indicador de calidad del aire (AQI)~~   | ~~Mostrar indice AQI con color semantico (verde/amarillo/naranja/rojo).~~                                               | ~~Baja~~    | ~~Baja~~     |
| 6      | ~~Dolar~~         | ~~Grafico mini de variacion (sparkline)~~ | ~~Agregar un sparkline de los ultimos 30 dias mostrando la tendencia de cada tipo de cambio.~~                          | ~~Media~~   | ~~Media~~    |
| 7      | ~~Dolar~~         | ~~Alertas de cotizacion~~                 | ~~Notificacion cuando el dolar blue supera o baja de un valor umbral configurado.~~                                     | ~~Media~~   | ~~**Alta**~~ |
| 8      | ~~Tasks~~         | ~~Fechas de vencimiento~~                 | ~~Agregar datepicker a cada tarea para marcar fecha limite. Resaltar tareas vencidas.~~                                 | ~~Media~~   | ~~**Alta**~~ |
| 9      | ~~Tasks~~         | ~~Tareas recurrentes~~                    | ~~Opcion para marcar una tarea como recurrente (diaria, semanal, mensual).~~                                            | ~~Alta~~    | ~~Media~~    |
| 10     | ~~Tasks~~         | ~~Etiquetas/categorias por color~~        | ~~Asignar una etiqueta de color a cada tarea (trabajo, personal, estudio) para filtrar.~~                               | ~~Media~~   | ~~Media~~    |
| 11     | ~~Tasks~~         | ~~Estadisticas de productividad~~         | ~~Mini grafico de tareas completadas por dia/semana, racha actual (streak).~~                                           | ~~Alta~~    | ~~Media~~    |
| 12     | ~~Finanzas~~      | ~~Presupuesto mensual por categoria~~     | ~~Definir un tope de gasto mensual por categoria. Barra de progreso visual al acercarse al limite.~~                    | ~~Alta~~    | ~~**Alta**~~ |
| 13     | ~~Finanzas~~      | ~~Exportar datos a CSV/PDF~~              | ~~Boton para descargar el historial de transacciones filtrado en formato CSV o PDF.~~                                   | ~~Media~~   | ~~Media~~    |
| 14     | ~~Finanzas~~      | ~~Soporte multi-moneda~~                  | ~~Registrar transacciones en diferentes monedas (ARS, USD, EUR). Conversion automatica.~~                               | ~~Alta~~    | ~~Media~~    |
| 15     | ~~Finanzas~~      | ~~Recordatorios de gastos fijos~~         | ~~Agendar gastos recurrentes (alquiler, servicios, suscripciones) con alertas de vencimiento.~~                         | ~~Media~~   | ~~**Alta**~~ |
| ~~16~~ | ~~Finanzas~~      | ~~Transacciones split (dividir)~~         | ~~Dividir una transaccion en varias categorias (ej: supermercado con comida + limpieza).~~                              | ~~Media~~   | ~~Baja~~     |
| 17     | ~~Finanzas~~      | ~~Resumen anual comparativo~~             | ~~Pestana con comparacion mes a mes, gastos por categoria anual, tendencia de ingresos.~~                               | ~~Alta~~    | ~~Media~~    |
| 18     | ~~TV Shows~~      | ~~Chips colapsables (+N mas)~~            | ~~Mostrar las primeras 5-6 chips y un boton para expandir el resto.~~                                                   | ~~Baja~~    | ~~**Alta**~~ |
| 19     | ~~TV Shows~~      | ~~Rating y poster por serie~~             | ~~Mostrar calificacion (TMDB) y poster junto al nombre de cada serie en las chips.~~                                    | ~~Media~~   | ~~Baja~~     |
| 20     | ~~TV Shows~~      | ~~Notificaciones de nuevo episodio~~      | ~~Toast notification cuando se estrena un episodio de una serie seguida.~~                                              | ~~Media~~   | ~~Media~~    |
| 21     | ~~TV Shows~~      | ~~Temporadas vistas/no vistas~~           | ~~Marcar episodios como vistos con check. Contador de progreso por temporada.~~                                         | ~~Alta~~    | ~~Media~~    |
| 22     | ~~Notas~~         | ~~Formato rico (bold, italic, listas)~~   | ~~Toolbar con negrita, cursiva, listas, headers en las notas.~~                                                         | ~~Alta~~    | ~~Media~~    |
| 23     | ~~Notas~~         | ~~Busqueda entre notas~~                  | ~~Input que filtre notas por titulo y contenido en tiempo real.~~                                                       | ~~Baja~~    | ~~**Alta**~~ |
| 24     | ~~Notas~~         | ~~Etiquetas/colores por nota~~            | ~~Asignar un color o etiqueta a cada nota para organizacion visual.~~                                                   | ~~Baja~~    | ~~Media~~    |
| ~~25~~ | ~~Read Later~~    | ~~Auto-fetch de metadatos~~               | ~~Extraer automaticamente titulo, imagen OG y descripcion al guardar un enlace.~~                                       | ~~Media~~   | ~~Media~~    |
| 26     | ~~Read Later~~    | ~~Indicador de progreso de lectura~~      | ~~Marcar articulos como leidos/parciales/no leidos con badge visual.~~                                                  | ~~Baja~~    | ~~Baja~~     |
| 27     | ~~Read Later~~    | ~~Filtros por categoria/etiqueta~~        | ~~Sistema de tags a los enlaces guardados para filtrar por tema.~~                                                      | ~~Media~~   | ~~Media~~    |
| 28     | ~~Quick Access~~      | ~~Favicon automatico para links~~             | ~~Obtener automaticamente el favicon de cada enlace usando Google Favicon API.~~                                            | ~~Baja~~        | ~~**Alta**~~     |
| 29     | ~~Quick Access~~  | ~~Estadisticas de uso (top links)~~       | ~~Mostrar links mas clickeados con un ranking visual.~~                                                                 | ~~Baja~~    | ~~Baja~~     |
| 30     | ~~GitHub~~        | ~~Wishlist de juegos~~                    | ~~Mostrar wishlist del perfil con precios actuales y descuentos.~~                                                      | ~~Media~~   | ~~Baja~~     |
| 31     | ~~GitHub~~        | ~~Logros recientes~~                      | ~~Mostrar ultimos logros desbloqueados con descripcion y rareza.~~                                                      | ~~Media~~   | ~~Baja~~     |

### 4.2 Nuevos Widgets

| #   | Widget                   | Mejora                               | Descripcion                                                                              | Complejidad | Prioridad    |
| --- | ------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------- | ----------- | ------------ |
| 32  | ~~Musica (Now Playing)~~ | ~~Integracion con Spotify/YT Music~~ | ~~Cancion actual con portada, artista, y controles de play/pause/skip. Requiere OAuth.~~ | ~~Alta~~    | ~~Media~~    |
| 33  | ~~Calendario~~           | ~~Google Calendar sync~~             | ~~Calendario mensual y eventos del dia. Sync con Google Calendar API o CalDAV.~~         | ~~Alta~~    | ~~**Alta**~~ |
| 34  | ~~Pomodoro Timer~~       | ~~Timer Pomodoro~~                   | ~~Completar JS con timer 25/5, rondas, sonidos. Parte del CSS base ya existe.~~          | ~~Media~~   | ~~Media~~    |
| 35  | ~~GitHub Activity~~      | ~~Commits y PRs recientes~~          | ~~Ultimos commits, PRs y issues de repos configurados del usuario.~~                     | ~~Media~~   | ~~Baja~~     |
| 36  | ~~Habit Tracker~~        | ~~Seguimiento de habitos diarios~~   | ~~Grid tipo contribution graph para marcar habitos (ejercicio, lectura, meditacion).~~   | ~~Alta~~    | ~~Media~~    |
| 37  | ~~Crypto Tracker~~       | ~~Cotizacion de criptomonedas~~      | ~~Precios de BTC, ETH y criptos configurables usando CoinGecko API.~~                    | ~~Media~~   | ~~Baja~~     |
| 38  | ~~News/RSS Feed~~        | ~~Feed de noticias personalizables~~ | ~~Agregador RSS con fuentes configurables. Cards con titular, fuente y fecha.~~          | ~~Alta~~    | ~~Media~~    |
| 39  | ~~Countdown~~                | ~~Cuenta regresiva a eventos~~           | ~~Configurar fechas importantes (cumpleanos, viajes, lanzamientos) con cuenta regresiva.~~   | ~~Baja~~        | ~~Media~~        |
| 40  | ~~Quotes~~               | ~~Frase del dia~~                    | ~~Frase inspiradora que cambie diariamente usando API gratuita (ZenQuotes).~~            | ~~Baja~~    | ~~Baja~~     |
| 41  | ~~Breathing Exercise~~   | ~~Ejercicio de respiracion guiado~~  | ~~Animacion circular para ejercicios de respiracion (4-7-8, box breathing).~~            | ~~Media~~   | ~~Baja~~     |
| 42  | ~~Password Generator~~   | ~~Generador de contrasenas~~         | ~~Generar contrasenas seguras con opciones de longitud y caracteres.~~                   | ~~Baja~~    | ~~Baja~~     |
| 43  | ~~System Monitor~~       | ~~Estado del servidor/dispositivo~~  | ~~Uptime, uso de CPU/RAM si se despliega en un servidor propio.~~                        | ~~Alta~~    | ~~Baja~~     |

### 4.3 UX / UI

| #   | Area        | Mejora                                   | Descripcion                                                                                | Complejidad | Prioridad    |
| --- | ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ | ----------- | ------------ |
| 44  | ~~General~~ | ~~Drag & drop para reordenar secciones~~ | ~~Permitir reordenar las secciones snap del dashboard. Persistir en Supabase.~~            | ~~Alta~~    | ~~**Alta**~~ |
| 45  | ~~General~~ | ~~Widget collapse/expand~~               | ~~Boton para colapsar o expandir widgets individuales dentro de cada seccion.~~            | ~~Baja~~    | ~~Media~~    |
| 46  | ~~General~~ | ~~Buscador global (Command Palette)~~    | ~~Mejorar command palette para buscar entre transacciones, notas, links, series, tareas.~~ | ~~Media~~   | ~~**Alta**~~ |
| 47  | ~~General~~     | ~~Transiciones animadas entre secciones~~    | ~~Animaciones suaves al hacer snap entre secciones (fade, slide o parallax sutil).~~           | ~~Media~~       | ~~Baja~~         |
| 48  | ~~General~~ | ~~Indicador visual de seccion activa~~   | ~~Dots de navegacion lateral que indiquen seccion activa, clickeables.~~                   | ~~Baja~~    | ~~Media~~    |
| 49  | ~~General~~ | ~~Loading skeletons~~                    | ~~Mostrar skeletons animados mientras cargan los datos en vez de spinners.~~               | ~~Media~~   | ~~Media~~    |
| 50  | ~~General~~ | ~~Tooltips informativos~~                | ~~Tooltips en botones e iconos para mejorar discoverability de funcionalidades.~~          | ~~Baja~~    | ~~Baja~~     |
| 51  | ~~General~~ | ~~Onboarding tutorial~~                  | ~~Tour guiado la primera vez explicando cada seccion y widget.~~                           | ~~Alta~~    | ~~Baja~~     |
| 52  | ~~General~~ | ~~Tema claro/oscuro automatico~~         | ~~Detectar prefers-color-scheme y cambiar automaticamente el tema.~~                       | ~~Media~~   | ~~Media~~    |
| 53  | General     | Atajos de teclado globales               | Overlay con atajos (Ctrl+K busqueda, 1-7 secciones, T nueva tarea).                        | Media       | Media        |
| 54  | ~~Dock~~    | ~~Gestion completa de items~~            | ~~Agregar, eliminar, reordenar items del dock directamente desde la UI.~~                  | ~~Media~~   | ~~**Alta**~~ |
| 55  | ~~Dock~~    | ~~Sub-menus en dock items~~              | ~~Hover sobre un item muestra mini-menu con sub-opciones o categorias.~~                   | ~~Media~~   | ~~Baja~~     |
| 56  | Fondos      | Selector de wallpapers dinamicos         | Cargar wallpapers desde Unsplash por categoria con rotacion automatica.                    | Media       | Media        |
| 57  | Fondos      | Efectos blur/glass personalizable        | Ajustar nivel de blur y opacidad del glassmorphism globalmente.                            | Baja        | Baja         |

### 4.4 Tecnico

| #      | Area               | Mejora                                     | Descripcion                                                                  | Complejidad | Prioridad    |
| ------ | ------------------ | ------------------------------------------ | ---------------------------------------------------------------------------- | ----------- | ------------ |
| 58     | Performance        | Service Worker (PWA offline)               | Cachear assets y permitir uso offline del dashboard.                         | Alta        | **Alta**     |
| 59     | ~~Performance~~    | ~~Lazy loading de widgets~~                | ~~Cargar solo widgets de la seccion visible. Los demas al navegar.~~         | ~~Media~~   | ~~**Alta**~~ |
| 60     | ~~Performance~~    | ~~Image lazy loading + WebP~~              | ~~Convertir imagenes a WebP y usar loading="lazy" para velocidad.~~          | ~~Baja~~    | ~~Media~~    |
| 61     | Performance        | Cache de API responses mejorado            | Cacheo inteligente con ETags o localStorage con TTL por API.                 | Media       | Media        |
| ~~62~~ | ~~Datos~~          | ~~Import/Export de toda la data (backup)~~ | ~~Exportar/importar toda la configuracion y datos del dashboard como JSON.~~ | ~~Media~~   | ~~**Alta**~~ |
| 63     | ~~Datos~~          | ~~Historial de cambios (audit log)~~       | ~~Registrar quien y cuando se modifico cada elemento.~~                      | ~~Alta~~    | ~~Baja~~     |
| 64     | ~~Datos~~          | ~~Sincronizacion multi-dispositivo~~       | ~~Supabase realtime para sincronizar cambios entre dispositivos.~~           | ~~Alta~~    | ~~Media~~    |
| ==65== | ==Seguridad==      | ==PIN o biometria para acceso==            | ==Requerir PIN o huella antes de mostrar datos financieros sensibles.==      | ==Alta==    | ==Media==    |
| 66     | ~~Seguridad~~      | ~~Auto-lock por inactividad~~              | ~~Bloquear pantalla automaticamente despues de N minutos de inactividad.~~   | ~~Media~~   | ~~Media~~    |
| 67     | Mobile             | PWA instalable en home screen              | Manifest.json e iconos para instalar como app nativa.                        | Media       | **Alta**     |
| 68     | Mobile             | Touch gestures para navegacion             | Swipe lateral para cambiar entre secciones en mobile.                        | Media       | Media        |
| 69     | Mobile             | Bottom navigation bar en mobile            | Navegacion inferior con iconos de cada seccion para acceso rapido.           | Media       | Media        |
| 70     | ~~Notificaciones~~ | ~~Sistema de notificaciones push~~         | ~~Para tareas vencidas, episodios nuevos, alertas del dolar.~~               | ~~Alta~~    | ~~Media~~    |
| 71     | ~~Notificaciones~~ | ~~Toast notifications con acciones~~       | ~~Toasts con botones de accion (deshacer, marcar leido, posponer).~~         | ~~Media~~   | ~~Media~~    |
| 72     | Accesibilidad      | Cumplimiento WCAG basico                   | Contraste minimo, aria-labels, navegacion por teclado, focus visible.        | Media       | Media        |

---

## 5. Top Mejoras Recomendadas (Prioridad Alta)

Las 16 mejoras de prioridad alta ordenadas por impacto sugerido:

| # | Mejora | Categoria | Impacto |
|---|---|---|---|
| 12 | Presupuesto mensual por categoria | Finanzas | Control de gastos, feedback visual inmediato |
| 15 | Recordatorios de gastos fijos | Finanzas | No olvidar pagos recurrentes |
| 8 | Fechas de vencimiento en tareas | Tasks | Organizacion temporal, evitar vencidos |
| 44 | Reordenar secciones con D&D | UX/UI | Personalizacion total del dashboard |
| 46 | Buscador global mejorado | UX/UI | Encuentro rapido de cualquier contenido |
| 2 | Agregar relojes desde UI | Reloj Mundial | No depender de settings para algo simple |
| 18 | Chips colapsables en TV Shows | TV Shows | Limpieza visual en series con muchas temporadas |
| 23 | Busqueda entre notas | Notas | Encontrar notas rapidamente |
| 28 | Favicon automatico | Quick Access | Mejora visual inmediata sin esfuerzo |
| 33 | Google Calendar sync | Nuevo Widget | Integracion con herramienta de productividad |
| 58 | Service Worker (PWA offline) | Tecnico | Usabilidad sin conexion |
| 59 | Lazy loading de widgets | Tecnico | Performance de carga |
| 62 | Import/Export completo | Tecnico | Backup total, migracion |
| 67 | PWA instalable | Tecnico | Experiencia nativa en mobile |
| 7 | Alertas de cotizacion del dolar | Dolar | Notificacion de cambios significativos |
| 54 | Gestion de items del dock | UX/UI | (*Depende de si se reimplementa el dock*) |

---

*Documento generado automaticamente a partir del analisis del repositorio MozzPCC.*
