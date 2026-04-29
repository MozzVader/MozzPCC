<p align="center">
  <img src="assets/logo-readme.png" alt="MozzPCC Logo" width="120">
</p>

<h1 align="center">MozzPCC</h1>
<p align="center">
  <strong>Personal Command Center</strong> — Tu dashboard personal, interactivo y moderno.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/GitHub_Pages-222222?style=flat-square&logo=github&logoColor=white" alt="GitHub Pages">
  <br>
  <img src="https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/No_Frameworks-vanilla_JS-purple?style=flat-square" alt="No Frameworks">
  <img src="https://img.shields.io/badge/Auth-Email%20%7C%20Google%20%7C%20GitHub%20%7C%20Magic_Link-7c3aed?style=flat-square" alt="Auth Providers">
</p>

---

## Descripcion

MozzPCC es un dashboard personal disenado como centro de comando diario. Construido con HTML, CSS y JavaScript puro (sin frameworks), alojado en GitHub Pages y con persistencia en la nube gracias a Supabase. Pensado para tener todo lo que necesitas en un solo lugar: tareas, notas, pomodoro y mas.

## Funcionalidades

| Feature | Descripcion |
|---------|-------------|
| Autenticacion | Login/registro con email, Google OAuth, GitHub OAuth y Magic Link |
| Reloj y Saludo | Reloj digital en tiempo real con fecha en espanol y saludo personalizado |
| Lista de Tareas | CRUD completo con persistencia en Supabase (sincronizado entre dispositivos) |
| Pomodoro Timer | Timer circular SVG 25/5 con notificacion de audio y estadisticas en la nube |
| Notas Rapidas | Notas adhesivas editables con 5 colores y persistencia en Supabase |
| Finanzas Personales | Transacciones de ingresos/gastos con categorias, graficos (donut + barras) y resumen mensual |
| Ver Mas Tarde | Links guardados con tags de color, filtros y drag & drop |
| Backup/Restore | Exportar e importar todos tus datos en JSON |
| Steam Stats | Perfil, estado online, juegos recientes, total de juegos y horas (via Steam API) |
| Dock Personalizable | Dock estilo macOS con magnificacion, grupos y links editables |
| Clima | Temperatura actual via Open-Meteo (sin API key), ciudad configurable |
| Command Palette | Busqueda rapida con Ctrl+K (secciones, links, tareas, notas, finanzas, acciones) |
| Paletas de Colores | 6 temas personalizables que cambian accent, glow y fondo en tiempo real |
| Snap Scroll | Navegacion vertical con snap sections e indicadores con tooltips |
| Moneda Configurable | Simbolo de moneda personalizable (ARS, USD, EUR, etc.) |

## Diseno

- Tema oscuro con degradado profundo
- Tarjetas con efecto glassmorphism (vidrio esmerilado)
- Navegacion vertical con snap scroll e indicadores laterales
- Dock estilo macOS con magnificacion al hover
- 6 paletas de colores personalizables:

| Tema | Colores | Vibra |
|------|---------|-------|
| Cyber | cyan + violet + green + sky | Futurista |
| Violet | purple + pink + blue | Futurista calido |
| Emerald | green + teal + blue | Matrix / nature |
| Rose | pink + red + magenta | Calido y bold |
| Amber | gold + orange + yellow | Calido y premium |
| Twitter | blue + dark blue + gray | Social / clean |

- Animaciones suaves de entrada y transiciones
- Diseno responsivo (escritorio, tablet y mobile)
- Tipografia moderna (Inter via Google Fonts)
- Iconos Font Awesome 6

## Estructura

```
MozzPCC/
├── index.html              # Pagina principal (dashboard + auth)
├── favicon.ico             # Favicon del sitio
├── assets/
│   └── logo.png            # Logo del proyecto
├── css/
│   └── styles.css          # Estilos completos
├── js/
│   ├── supabase.js         # Cliente Supabase
│   ├── auth.js             # Sistema de autenticacion
│   ├── app.js              # Reloj, fecha y saludo
│   ├── weather.js           # Widget de clima (Open-Meteo)
│   ├── quickAccess.js       # Accesos rapidos
│   ├── tasks.js            # Lista de tareas
│   ├── pomodoro.js         # Temporizador Pomodoro
│   ├── notes.js            # Notas adhesivas
│   ├── finances.js         # Finanzas personales (transacciones + graficos)
│   ├── readLater.js        # Links guardados para leer mas tarde
│   ├── backup.js           # Backup/restore de datos
│   ├── steamStats.js       # Widget de Steam Stats (perfil + juegos)
│   ├── tips.js             # Tips de uso
│   ├── quotes.js           # Frases motivacionales
│   ├── dock.js             # Dock estilo macOS con magnificacion
│   ├── settings.js         # Configuracion (dock + temas + moneda)
│   └── commandPalette.js   # Command Palette (Ctrl+K)
├── sql/
│   ├── schema.sql          # Schema de BD + RLS
│   ├── steam_migration.sql # Migration para tabla user_steam_settings
│   ├── read_later_migration.sql      # Migration para tabla read_later_items
│   └── read_later_tag_migration.sql  # Migration para tabla read_later_tags
├── supabase/
│   └── functions/
│       └── steam-proxy/
│           └── index.ts    # Edge Function: proxy para Steam Web API
├── README.md               # Este archivo
└── SETUP.md                # Guia de configuracion paso a paso
```

## Configuracion Rapida

Querés tu propia instancia? Seguí la [guia de configuracion completa](SETUP.md).

Resumen rapido:

1. Creá un proyecto en [Supabase](https://supabase.com)
2. Ejecutá `sql/schema.sql` en el SQL Editor
3. (Opcional) Ejecutá `sql/steam_migration.sql` y deployá la Edge Function para Steam Stats — ver [SETUP.md](SETUP.md#paso-9-configurar-steam-stats-opcional)
4. Actualizá las credenciales en `js/supabase.js`
5. Configurá las Redirect URLs en Authentication
6. (Opcional) Activá Google/GitHub OAuth
7. Deployá en GitHub Pages

## Tecnologias

- HTML5 semantico
- CSS3 (Custom Properties, Grid, Glassmorphism, Animaciones)
- JavaScript ES6+ (vanilla, sin frameworks)
- Supabase (Auth + PostgreSQL + RLS)
- Chart.js 4 (graficos de dona y barras para finanzas)
- Google Fonts (Inter)
- Font Awesome 6
- Web Audio API
- Steam Web API (via Supabase Edge Functions)

## Seguridad

- Row Level Security (RLS) en todas las tablas
- Cada usuario solo accede a sus propios datos
- Autenticacion gestionada por Supabase Auth
- La anon key es segura para uso en el frontend

## Licencia

Este proyecto esta licenciado bajo **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)**.

Que significa esto en criollo:
- Atribucion: tenes que acreditar al autor original ([MozzVader](https://github.com/MozzVader)) si usas el codigo.
- No Comercial: no podes usar este proyecto para fines comerciales.
- Sin Derivadas: no podes crear proyectos derivados basados en este codigo.

Lee la licencia completa: [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode)

---

<p align="center">
  <img src="https://img.shields.io/badge/Hecho%20por-MozzVader-00d4ff?style=for-the-badge" alt="Made by MozzVader">
</p>
