# MozzPCC — Personal Command Center

Un dashboard personal interactivo y moderno, diseñado como centro de comando diario. Construido con HTML, CSS y JavaScript puro (sin frameworks), ideal para GitHub Pages. Ahora con autenticación y persistencia en la nube gracias a Supabase.

## 🎯 Funcionalidades

- **Autenticación** — Login/registro con email y contraseña, Google OAuth, GitHub OAuth y Magic Link
- **Reloj y Saludo** — Reloj digital en tiempo real con fecha completa en español y saludo dinámico según la hora del día
- **Lista de Tareas** — Agrega, completa y elimina tareas con persistencia en Supabase (sincronizado entre dispositivos)
- **Temporizador Pomodoro** — Timer circular SVG (25min trabajo / 5min descanso) con notificación de audio y estadísticas en la nube
- **Notas Rápidas** — Notas adhesivas editables con colores seleccionables y persistencia en Supabase
- **Frases Motivacionales** — Colección de 25+ frases en español con animación de cambio

## 🎨 Diseño

- Tema oscuro con degradado profundo (tonos púrpura/azul)
- Tarjetas con efecto glassmorphism (vidrio esmerilado)
- Animaciones suaves de entrada y transiciones
- Diseño responsivo (escritorio, tablet y mobile)
- Tipografía moderna (Inter via Google Fonts)
- Iconos Font Awesome

## 📂 Estructura

```
├── index.html          # Página principal del dashboard
├── css/
│   └── styles.css      # Estilos completos (tema, glassmorphism, auth, grid, animaciones)
├── js/
│   ├── supabase.js     # Inicialización del cliente Supabase
│   ├── auth.js         # Sistema de autenticación (login, registro, OAuth)
│   ├── app.js          # Reloj, fecha y saludo
│   ├── tasks.js        # Lista de tareas con Supabase
│   ├── pomodoro.js     # Temporizador Pomodoro con Supabase
│   ├── notes.js        # Notas adhesivas con Supabase
│   └── quotes.js       # Frases motivacionales en español
├── sql/
│   └── schema.sql      # Schema de base de datos + RLS (ejecutar en Supabase)
└── README.md
```

## 🚀 Configuración

### 1. Crear proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) y creá un nuevo proyecto
2. Anotá el **Project URL** y el **anon/public key** del proyecto

### 2. Ejecutar el schema SQL

1. En el panel de Supabase, abrí el **SQL Editor**
2. Copiá y ejecutá todo el contenido del archivo `sql/schema.sql`
3. Esto creará las tablas (`tasks`, `notes`, `pomodoro_sessions`) y las políticas RLS

### 3. Configurar OAuth providers (opcional)

#### Google OAuth
1. Andá a **Authentication → Providers → Google**
2. Habilitá el provider
3. Agregá el **Client ID** y **Client Secret** desde la Google Cloud Console
4. Configurá los redirect URLs (ver abajo)

#### GitHub OAuth
1. Andá a **Authentication → Providers → GitHub**
2. Habilitá el provider
3. Agregá el **Client ID** y **Client Secret** desde GitHub Developer Settings
4. Configurá los redirect URLs (ver abajo)

### 4. Configurar Redirect URLs

1. Andá a **Authentication → URL Configuration**
2. En **Redirect URLs**, agregá:
   - `https://tu-usuario.github.io/MozzPCC/` (tu URL de GitHub Pages)
   - `http://localhost:5500/` (para desarrollo local, si usás Live Server)
3. En **Site URL**, configurá la URL principal del sitio

### 5. Configurar Magic Link (opcional)

1. Andá a **Authentication → Email Templates** para personalizar el email de Magic Link
2. En **Authentication → Providers → Email**, verificá que "Confirm email" esté habilitado

## 🛠️ Tecnologías

- HTML5 semántico
- CSS3 (Custom Properties, Grid, Glassmorphism, Animaciones)
- JavaScript ES6+ (vanilla)
- Supabase (Auth + PostgreSQL + RLS)
- Google Fonts (Inter)
- Font Awesome 6
- Web Audio API para notificaciones

## 🔒 Seguridad

- Row Level Security (RLS) en todas las tablas — cada usuario solo accede a sus propios datos
- Autenticación gestionada por Supabase Auth
- La anon key es segura para uso en el frontend (las RLS protegen los datos)

---

**MozzPCC** © 2025 — Hecho con ❤️
