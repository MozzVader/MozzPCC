# MozzPCC — Sistema de Temas

## Arquitectura

El sistema de temas se basa en **dos dimensiones independientes**:

| Dimensión | Atributo HTML | Qué controla | Ejemplo |
|-----------|--------------|--------------|---------|
| **Tema** | `data-theme` | Estructura de cards, fondo, chrome, tipografía, bordes, sombras, blur | `default`, `notion`, `macos`, `windows`, `retro` |
| **Paleta** | `data-palette` | Color de acento, glow, gradientes | `cyan`, `orange`, `purple`, `green`, etc. |

```html
<body data-theme="notion" data-palette="cyan">
```

Cualquier combinación es posible: Notion + Cyan, macOS + Purple, Retro + Orange, etc.

## Estructura de archivos

```
css/
├── styles.css            ← BASE: layout, estructura, componentes compartidos (usa variables)
├── palettes.css          ← PALETAS: variantes de color de acento
└── themes/
    ├── default.css       ← Tema actual (dark glassmorphism)
    ├── notion.css        ← Notion / Linear (claro, minimalista)
    ├── macos.css         ← macOS (traffic lights, vibrancy)
    ├── windows.css       ← Windows 11 (Fluent Design)
    └── retro.css         ← CRT / Fallout (scanlines, phosphor)
```

### Carga dinámica

Solo se carga la paleta activa + el tema activo (1 archivo cada uno). El tema `default` está embebido en `styles.css` y no requiere archivo extra.

```js
function loadTheme(themeName) {
  const old = document.getElementById('theme-css');
  if (old) old.remove();
  if (themeName !== 'default') {
    const link = document.createElement('link');
    link.id = 'theme-css';
    link.rel = 'stylesheet';
    link.href = `css/themes/${themeName}.css`;
    document.head.appendChild(link);
  }
  document.body.setAttribute('data-theme', themeName);
}
```

## Convención de nombres — Variables CSS

### `--t-*` — THEME Variables

Cambia entre Default / Notion / macOS / Windows / Retro. Controla la estructura visual.

#### Fondo y body
| Variable | Descripción | Default (Glassmorphism) |
|----------|-------------|------------------------|
| `--t-body-bg` | Fondo principal del body | `#0a0a1a` |
| `--t-body-secondary` | Fondo secundario | `#111128` |
| `--t-body-pattern` | Patrón decorativo (grid, etc.) | `rgba(255,255,255,0.03)` |
| `--t-body-glow-a` | Glow de fondo color A | `rgba(124,58,237,0.15)` |
| `--t-body-glow-b` | Glow de fondo color B | `rgba(0,212,255,0.1)` |
| `--t-body-glow-c` | Glow de fondo color C | `rgba(124,58,237,0.08)` |

#### Cards
| Variable | Descripción | Default (Glassmorphism) |
|----------|-------------|------------------------|
| `--t-card-bg` | Fondo de cards | `rgba(37,37,37,0.3)` |
| `--t-card-hover` | Fondo de cards en hover | `rgba(255,255,255,0.08)` |
| `--t-card-border` | Borde de cards | `rgba(255,255,255,0.1)` |
| `--t-card-border-hover` | Borde de cards en hover | `rgba(255,255,255,0.2)` |
| `--t-card-radius` | Border-radius de cards | `10px` |
| `--t-card-shadow` | Box-shadow de cards | `0 8px 32px rgba(0,0,0,0.3)` |
| `--t-card-shine` | Gradiente decorativo superior de cards | `linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)` |
| `--t-card-chrome` | Tipo de chrome (`none` / `traffic-lights` / `titlebar`) | `none` |
| `--t-card-padding-top` | Padding top extra para title bars | `0px` |

#### Superficies (inputs, tooltips, dropdowns, overlays, modales)
| Variable | Descripción | Default (Glassmorphism) |
|----------|-------------|------------------------|
| `--t-surface-1` | Superficie sutil | `rgba(255,255,255,0.03)` |
| `--t-surface-2` | Superficie leve | `rgba(255,255,255,0.04)` |
| `--t-surface-3` | Superficie media | `rgba(255,255,255,0.06)` |
| `--t-surface-4` | Superficie notable | `rgba(255,255,255,0.08)` |
| `--t-surface-5` | Superficie fuerte | `rgba(255,255,255,0.1)` |
| `--t-surface-tooltip` | Fondo de tooltips | `rgb(37 37 37 / 90%)` |
| `--t-surface-dropdown` | Fondo de selects/options | `#1e1e2e` |
| `--t-surface-overlay` | Fondo de overlays | `rgba(10,10,26,0.7)` |
| `--t-surface-modal` | Fondo de modales | `rgb(37 37 37 / 85%)` |
| `--t-surface-toast` | Fondo de toasts | `rgba(30,30,40,0.9)` |
| `--t-surface-input` | Fondo de inputs | `rgba(255,255,255,0.04)` |
| `--t-surface-input-focus` | Fondo de inputs en focus | `rgba(255,255,255,0.06)` |

#### Bordes
| Variable | Descripción | Default (Glassmorphism) |
|----------|-------------|------------------------|
| `--t-border-subtle` | Borde muy sutil | `rgba(255,255,255,0.06)` |
| `--t-border-default` | Borde estándar | `rgba(255,255,255,0.1)` |
| `--t-border-strong` | Borde fuerte | `rgba(255,255,255,0.2)` |
| `--t-input-border` | Borde de inputs | `rgba(255,255,255,0.08)` |
| `--t-input-border-focus` | Borde de inputs en focus | Usa `var(--p-accent)` |

#### Sombras
| Variable | Descripción | Default (Glassmorphism) |
|----------|-------------|------------------------|
| `--t-shadow-sm` | Sombra pequeña | `0 2px 8px rgba(0,0,0,0.2)` |
| `--t-shadow-md` | Sombra media | `0 4px 16px rgba(0,0,0,0.3)` |
| `--t-shadow-lg` | Sombra grande | `0 8px 32px rgba(0,0,0,0.4)` |
| `--t-shadow-xl` | Sombra extra grande | `0 20px 60px rgba(0,0,0,0.5)` |
| `--t-shadow-card` | Sombra específica de cards | `0 8px 32px rgba(0,0,0,0.3)` |

#### Blur
| Variable | Descripción | Default (Glassmorphism) |
|----------|-------------|------------------------|
| `--t-blur-sm` | Blur sutil | `8px` |
| `--t-blur-md` | Blur medio | `12px` |
| `--t-blur-lg` | Blur grande | `16px` |
| `--t-blur-xl` | Blur extra grande | `20px` |
| `--t-blur-2xl` | Blur muy grande | `24px` |
| `--t-blur-3xl` | Blur máximo | `40px` |
| `--t-blur-card` | Blur específico de cards | `20px` |

#### Tipografía
| Variable | Descripción | Default (Glassmorphism) |
|----------|-------------|------------------------|
| `--t-font` | Tipografía principal | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| `--t-font-mono` | Tipografía monospace | `'Inter', monospace` |

#### Radios
| Variable | Descripción | Default |
|----------|-------------|---------|
| `--t-radius-xs` | Radio extra pequeño | `6px` |
| `--t-radius-sm` | Radio pequeño | `8px` |
| `--t-radius-md` | Radio mediano | `10px` |
| `--t-radius-lg` | Radio grande | `14px` |
| `--t-radius-xl` | Radio extra grande | `20px` |

#### Colores semánticos
| Variable | Descripción | Default |
|----------|-------------|---------|
| `--t-danger` | Color de error/delete | `#ef4444` |
| `--t-danger-dim` | Fondo hover danger | `rgba(239,68,68,0.1)` |
| `--t-danger-light` | Texto danger suavizado | `#fca5a5` |
| `--t-danger-hover` | Hover danger más claro | `#f87171` |
| `--t-success` | Color de éxito/ingreso | `#22c55e` |
| `--t-success-dim` | Fondo hover success | `rgba(34,197,94,0.1)` |
| `--t-success-light` | Texto success suavizado | `#86efac` |
| `--t-success-hover` | Hover success más claro | `#4ade80` |
| `--t-warning` | Color de warning | `#fbbf24` |
| `--t-info` | Color informativo | `#3b82f6` |

#### Texto
| Variable | Descripción | Default |
|----------|-------------|---------|
| `--t-text-primary` | Texto principal | `#f0f0f5` |
| `--t-text-secondary` | Texto secundario | `#a0a0b8` |
| `--t-text-muted` | Texto apagado | `#6b6b80` |
| `--t-text-tooltip` | Texto en tooltips | `#e2e8f0` |
| `--t-text-on-accent` | Texto sobre botones accent | `#ffffff` |

#### Skeleton
| Variable | Descripción | Default |
|----------|-------------|---------|
| `--t-skeleton-base` | Base del skeleton shimmer | `rgba(255,255,255,0.04)` |
| `--t-skeleton-shine` | Highlight del skeleton shimmer | `rgba(255,255,255,0.08)` |

---

### `--p-*` — PALETTE Variables

Cambia con el color picker del usuario. Controla el color de acento y derivados.

| Variable | Descripción | Cyan (default) |
|----------|-------------|----------------|
| `--p-accent` | Color de acento principal | `#00d4ff` |
| `--p-accent-dim` | Versión sutil (fondos, rings) | `rgba(0,212,255,0.15)` |
| `--p-accent-glow` | Glow principal | `rgba(0,212,255,0.4)` |
| `--p-accent-hover` | Hover más claro | `#33dfff` |
| `--p-accent-deep` | Extremo oscuro del gradient | `#0099cc` |
| `--p-accent-glow-far` | Glow lejano (clock, etc.) | `rgba(0,212,255,0.1)` |
| `--p-accent-secondary` | Color secundario | `#7c3aed` |
| `--p-border-accent` | Borde con accent | `rgba(0,212,255,0.3)` |
| `--p-shadow-glow` | Sombra con glow accent | `0 0 20px rgba(0,212,255,0.15)` |

---

### `--s-*` — SEMANTIC Variables

Colores de estado de badges, prioridades y categorías. Pueden variar ligeramente por tema.

| Variable | Descripción | Default |
|----------|-------------|---------|
| `--s-status-pending` | Badge pendiente | `#94a3b8` |
| `--s-status-analysis` | Badge en análisis | `#22d3ee` |
| `--s-status-progress` | Badge en progreso | `#fbbf24` |
| `--s-status-done` | Badge completada | `#4ade80` |
| `--s-status-discarded` | Badge descartada | `#f87171` |
| `--s-priority-high` | Prioridad alta | `#f87171` |
| `--s-priority-medium` | Prioridad media | `#fbbf24` |
| `--s-priority-low` | Prioridad baja | `#4ade80` |

---

### Variables que NO cambian (universales)

Estas variables son funcionales y no dependen del tema:

| Variable | Descripción |
|----------|-------------|
| `--note-yellow` | Color de nota amarilla |
| `--note-green` | Color de nota verde |
| `--note-pink` | Color de nota rosa |
| `--note-blue` | Color de nota azul |
| `--note-purple` | Color de nota violeta |
| `--transition` | Transición estándar |
| `--transition-fast` | Transición rápida |

## Migración desde variables actuales

Las variables existentes (`--bg-primary`, `--accent`, `--text-primary`, etc.) se migran al nuevo sistema mediante aliases en la Fase 1 para evitar romper nada:

```css
/* Alias temporal — se eliminan en la Fase 2 */
:root {
  --bg-primary: var(--t-body-bg);
  --bg-secondary: var(--t-body-secondary);
  --bg-glass: var(--t-card-bg);
  --accent: var(--p-accent);
  --text-primary: var(--t-text-primary);
  /* ... etc */
}
```

Una vez que todo `styles.css` usa directamente `--t-*` / `--p-*`, los aliases se eliminan.
