# MozzPCC — Personal Command Center

Un dashboard personal interactivo y moderno, diseñado como centro de comando diario. Construido con HTML, CSS y JavaScript puro (sin frameworks), ideal para GitHub Pages.

## 🎯 Funcionalidades

- **Reloj y Saludo** — Reloj digital en tiempo real con fecha completa en español y saludo dinámico según la hora del día
- **Lista de Tareas** — Agrega, completa y elimina tareas con persistencia en LocalStorage
- **Temporizador Pomodoro** — Timer circular SVG (25min trabajo / 5min descanso) con notificación de audio
- **Notas Rápidas** — Notas adhesivas editables con colores seleccionables y persistencia en LocalStorage
- **Frases Motivacionales** — Colección de 25+ frases en español con animación de cambio

## 🎨 Diseño

- Tema oscuro con degradado profundo (tonos púrpura/azul)
- Tarjetas con efecto glassmorphism (vidrio esmerilado)
- Animaciones suaves de entrada y transiciones
- Diseño responsivo (escritorio y tablet)
- Tipografía moderna (Inter via Google Fonts)
- Iconos Font Awesome

## 📂 Estructura

```
├── index.html          # Página principal del dashboard
├── css/
│   └── styles.css      # Estilos completos (tema, glassmorphism, grid, animaciones)
├── js/
│   ├── app.js          # Reloj, fecha y saludo
│   ├── tasks.js        # Lista de tareas con LocalStorage
│   ├── pomodoro.js     # Temporizador Pomodoro con SVG
│   ├── notes.js        # Notas adhesivas con LocalStorage
│   └── quotes.js       # Frases motivacionales en español
└── assets/             # Recursos estáticos (si se necesitan)
```

## 🚀 Uso

Abre `index.html` en cualquier navegador moderno. No requiere servidor ni proceso de compilación.

## 🛠️ Tecnologías

- HTML5 semántico
- CSS3 (Custom Properties, Grid, Glassmorphism, Animaciones)
- JavaScript ES6+ (vanilla)
- Google Fonts (Inter)
- Font Awesome 6
- LocalStorage para persistencia
- Web Audio API para notificaciones

---

**MozzPCC** © 2025 — Hecho con ❤️
