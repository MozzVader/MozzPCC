# Guia de Configuracion — MozzPCC

> Si clonaste este repo y queres tener tu propia instancia de MozzPCC funcional, este es tu lugar. Aca te guiamos paso a paso para configurar todo desde cero.

---

## Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Paso 1: Crear un Proyecto en Supabase](#paso-1-crear-un-proyecto-en-supabase)
- [Paso 2: Ejecutar el Schema de Base de Datos](#paso-2-ejecutar-el-schema-de-base-de-datos)
- [Paso 3: Configurar las Credenciales en el Proyecto](#paso-3-configurar-las-credenciales-en-el-proyecto)
- [Paso 4: Configurar Redirect URLs](#paso-4-configurar-redirect-urls)
- [Paso 5: Configurar Google OAuth (Opcional)](#paso-5-configurar-google-oauth-opcional)
- [Paso 6: Configurar GitHub OAuth (Opcional)](#paso-6-configurar-github-oauth-opcional)
- [Paso 7: Desplegar en GitHub Pages](#paso-7-desplegar-en-github-pages)
- [Paso 8: Probar Localmente](#paso-8-probar-localmente)
- [Paso 9: Configurar Steam Stats (Opcional)](#paso-9-configurar-steam-stats-opcional)
- [Solucion de Problemas](#solucion-de-problemas)

---

## Requisitos Previos

Antes de empezar necesitas tener:

- Una cuenta en [Supabase](https://supabase.com) (gratis)
- Una cuenta en [GitHub](https://github.com) (para clonar el repo y deployar)
- (Opcional) Una cuenta de Google para configurar Google OAuth
- (Opcional) Una cuenta de GitHub Developer para configurar GitHub OAuth
- (Opcional) Una [Steam Web API Key](https://steamcommunity.com/dev/apikey) para el widget de Steam Stats

No necesitas instalar nada en tu computadora si solo vas a deployar. Si queres usar el widget de Steam Stats, vas a necesitar el [Supabase CLI](https://supabase.com/docs/guides/cli) para deployar la Edge Function. Si queres probar localmente, te sirve tener un servidor como [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) para VS Code.

---

## Paso 1: Crear un Proyecto en Supabase

Supabase es nuestro backend: maneja la autenticacion, la base de datos y el almacenamiento en la nube de todas tus tareas, notas, finanzas y demas datos del dashboard.

1. Andá a [https://supabase.com](https://supabase.com) e iniciá sesion (podes usar GitHub para loguearte mas rapido)
2. Una vez dentro del dashboard, hacé clic en **"New Project"**
3. Completá el formulario:
   - **Name**: `MozzPCC` (o el nombre que prefieras)
   - **Database Password**: elegí una contraseña segura (guárdala, no la vas a poder ver despues)
   - **Region**: elegí la mas cercana a tu ubicacion (ej: `South America (Sao Paulo)`)
4. Hacé clic en **"Create new project"** y esperá a que se inicialice (puede tardar un par de minutos)

### Obtener las credenciales

Una vez que el proyecto esté listo:

1. En el panel izquierdo, andá a **Settings** (el icono de engranaje)
2. Seleccioná **"API"** en el menu
3. Anotá estos dos valores que vas a necesitar despues:
   - **Project URL**: se ve algo como `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key**: es una clave larga que empieza con `eyJ...`

> **Importante**: La `anon key` es segura para usar en el frontend. Las politicas RLS (Row Level Security) se encargan de que nadie pueda acceder a datos que no le corresponden.

---

## Paso 2: Ejecutar el Schema de Base de Datos

El proyecto incluye un archivo SQL que crea todas las tablas necesarias con sus respectivas politicas de seguridad.

1. En tu proyecto de Supabase, andá al **SQL Editor** en el menu izquierdo
2. Hacé clic en **"+ New query"**
3. Abrí el archivo `sql/schema.sql` que esta en este repo y copiá **TODO** su contenido
4. Pegalo en el editor SQL de Supabase
5. Hacé clic en **"Run"** (o presioná `Ctrl+Enter`)

Si todo sale bien, vas a ver un mensaje de exito y se habran creado:

| Tabla | Para que sirve |
|-------|---------------|
| `tasks` | Almacena las tareas de cada usuario |
| `notes` | Almacena las notas adhesivas |
| `user_preferences` | Preferencias del usuario (tema, ciudad, etc.) |
| `user_quick_links` | Accesos rapidos del usuario |
| `finance_categories` | Categorias de ingresos/gastos |
| `finance_transactions` | Transacciones financieras del usuario |
| `read_later_items` | Links guardados para leer mas tarde |
| `user_steam_settings` | Configuracion de Steam Stats |

Ademas se configuran:
- **Row Level Security (RLS)** en todas las tablas: cada usuario solo puede ver, crear, editar y eliminar sus propios datos
- **Indices** en las columnas `user_id` y `created_at` para mejor performance

### Verificar que se crearon correctamente

1. Andá a **Table Editor** en el menu izquierdo
2. Deberias ver todas las tablas listadas arriba
3. Si hacés clic en cada una, vas a ver la estructura de las columnas

---

## Paso 3: Configurar las Credenciales en el Proyecto

Ahora necesitamos que tu proyecto web se conecte a tu instancia de Supabase.

1. Abrí el archivo `js/supabase.js`
2. Buscá estas dos lineas:
   ```javascript
   const SUPABASE_URL = 'https://diaezbthqjvroexesbrr.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...';
   ```
3. Reemplazá los valores con **tus credenciales** del Paso 1:
   ```javascript
   const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
   const SUPABASE_ANON_KEY = 'TU-ANON-KEY-COMPLETA';
   ```
4. Guardá el archivo

> **Nota**: Si estas forkeando el repo, estos valores van a ser diferentes a los del repositorio original. Si no los cambias, tu instancia se conectara al Supabase del proyecto original, no al tuyo.

---

## Paso 4: Configurar Redirect URLs

Las redirect URLs le dicen a Supabase a donde enviar al usuario despues de un login exitoso (por ejemplo, con Google o GitHub).

1. En tu proyecto de Supabase, andá a **Authentication** en el menu izquierdo
2. Seleccioná **"URL Configuration"**
3. En el campo **Site URL**, poné la URL de tu sitio:
   ```
   https://TU-USUARIO.github.io/MozzPCC/
   ```
4. En **Redirect URLs**, agregá estas URLs (una por linea):
   ```
   https://TU-USUARIO.github.io/MozzPCC/
   http://localhost:5500/
   ```
   - La primera es para produccion (GitHub Pages)
   - La segunda es para desarrollo local (si usas Live Server en VS Code)

5. Hacé clic en **"Save"**

---

## Paso 5: Configurar Google OAuth (Opcional)

Esto permite a los usuarios loguearse con su cuenta de Google con un solo clic.

### 5.1: Crear el proyecto en Google Cloud Console

1. Entrá a [Google Cloud Console](https://console.cloud.google.com/)
2. Hacé clic en el selector de proyecto (arriba a la izquierda, al lado del logo de Google Cloud) y despues en **"New Project"**
3. Poné un nombre como `MozzPCC` y creá el proyecto
4. Esperá a que se inicialice

### 5.2: Configurar la pantalla de consentimiento OAuth

1. En el menu izquierdo, andá a **APIs & Services → OAuth consent screen**
2. Elegi **"External"** como tipo de usuario y hacé clic en **"Create"**
3. Completá el formulario:
   - **App name**: `MozzPCC`
   - **User support email**: tu email
   - **App domain**: dejá en blanco
   - **Developer contact email**: tu email
4. Hacé clic en **"Save and Continue"**
5. En **Scopes**, dejá todo como está y hacé clic en **"Save and Continue"**
6. En **Test users**, agregá tu email de Google (mientras la app esté en modo test, solo los usuarios que agregues aca pueden loguearse)
7. Hacé clic en **"Save and Continue"** y despues **"Back to Dashboard"**

> **Nota**: Si queres que cualquier persona pueda loguearse con Google (no solo los test users), tenes que publicar la app en "OAuth consent screen → Publish App". Google puede pedir una verificacion si tu app accede a datos sensibles, pero para MozzPCC con scopes basicos de perfil deberia estar bien.

### 5.3: Crear las credenciales OAuth

1. En el menu izquierdo, andá a **APIs & Services → Credentials**
2. Hacé clic en **"+ CREATE CREDENTIALS" → "OAuth client ID"**
3. Completá:
   - **Application type**: `Web application`
   - **Name**: `MozzPCC Web`
4. En **Authorized JavaScript origins**, agregá:
   ```
   https://TU-PROYECTO.supabase.co
   ```
   Reemplazá `TU-PROYECTO` con el ID de tu proyecto Supabase (es la parte antes de `.supabase.co` en tu Project URL).
5. En **Authorized redirect URIs**, agregá:
   ```
   https://TU-PROYECTO.supabase.co/auth/v1/callback
   ```
6. Hacé clic en **"Create"**
7. Se te mostrara una ventana con tu **Client ID** y **Client Secret**. Copialos ambos.

### 5.4: Configurar en Supabase

1. Volvé a tu proyecto de Supabase
2. Andá a **Authentication → Providers**
3. Buscá **Google** y hacé clic en ella
4. Activá el toggle **"Enable Google provider"**
5. Pegá el **Client ID** de Google Cloud Console
6. Pegá el **Client Secret** de Google Cloud Console
7. Hacé clic en **"Save"**

---

## Paso 6: Configurar GitHub OAuth (Opcional)

Esto permite a los usuarios loguearse con su cuenta de GitHub con un solo clic.

### 6.1: Crear la OAuth App en GitHub

1. Entrá a [GitHub Developer Settings](https://github.com/settings/developers)
2. Hacé clic en **"New OAuth App"**
3. Completá el formulario:
   - **Application name**: `MozzPCC`
   - **Homepage URL**: `https://TU-USUARIO.github.io/MozzPCC/`
   - **Authorization callback URL**: `https://TU-PROYECTO.supabase.co/auth/v1/callback`
   - **Application description**: (opcional) `Personal Command Center Dashboard`
4. Hacé clic en **"Register application"**

### 6.2: Obtener el Client Secret

1. En la pagina de tu OAuth App, vas a ver el **Client ID** (ya visible)
2. Hacé clic en **"Generate a new client secret"**
3. GitHub te pedirá tu contraseña para confirmar
4. Se te mostrará el **Client Secret**. Copialo rapido porque GitHub solo lo muestra una vez.

### 6.3: Configurar en Supabase

1. Volvé a tu proyecto de Supabase
2. Andá a **Authentication → Providers**
3. Buscá **GitHub** y hacé clic en ella
4. Activá el toggle **"Enable GitHub provider"**
5. Pegá el **Client ID** de GitHub
6. Pegá el **Client Secret** de GitHub
7. Hacé clic en **"Save"**

---

## Paso 7: Desplegar en GitHub Pages

### 7.1: Forkear o Clonar el Repo

Si queres usar tu propia version modificada:

1. Andá al repo original y hacé clic en **"Fork"**
2. O clonealo directamente: `git clone https://github.com/TU-USER/MozzPCC.git`

### 7.2: Activar GitHub Pages

1. Andá a tu repo en GitHub
2. Seleccioná **Settings** (pestaña arriba a la derecha)
3. En el menu izquierdo, buscá **"Pages"**
4. En **Source**, seleccioná **"Deploy from a branch"**
5. En **Branch**, seleccioná `main` y la carpeta `/ (root)`
6. Hacé clic en **"Save"**

GitHub Pages tarda entre 1-3 minutos en deployar. Cuando esté listo, tu sitio estara disponible en:

```
https://TU-USUARIO.github.io/MozzPCC/
```

### 7.3: Verificar el deploy

- En la seccion Pages de Settings vas a ver un banner con el link a tu sitio cuando esté listo
- Cada vez que hagas un push a la rama `main`, GitHub Pages se actualiza automaticamente

---

## Paso 8: Probar Localmente

Si queres hacer cambios y probar antes de pushear:

1. Instalá [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) en VS Code (o cualquier servidor HTTP local)
2. Abri la carpeta del proyecto en VS Code
3. Hacé clic derecho en `index.html` y elegí **"Open with Live Server"**
4. El sitio se abre en `http://localhost:5500/`

Asegurate de haber agregado `http://localhost:5500/` en las Redirect URLs de Supabase (Paso 4).

---

## Paso 9: Configurar Steam Stats (Opcional)

El widget de Steam Stats muestra tu perfil, juegos recientes, total de juegos y horas acumuladas directamente en el dashboard. Para que funcione, necesita una **Edge Function** en Supabase que hace de proxy hacia la Steam Web API (esto resuelve el problema de CORS que tiene Steam).

### 9.1: Obtener tu Steam Web API Key

1. Andá a [https://steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
2. Iniciá sesion con tu cuenta de Steam
3. En "Domain Name", poné cualquier cosa (ej: `localhost`) — no es relevante para uso personal
4. Hacé clic en **"Register"**
5. Copiá la **API Key** que te muestra (formato: 32 caracteres hexadecimales)

> **Importante**: Esta clave es **SECRETA**. Nunca la pongas en el codigo frontend ni la compartas. Se almacena directamente en Supabase como un secret de la Edge Function.

### 9.2: Ejecutar la Migration de Steam

El widget usa una tabla separada para guardar el Steam ID de cada usuario.

1. En tu proyecto de Supabase, andá al **SQL Editor**
2. Hacé clic en **"+ New query"**
3. Abrí el archivo `sql/steam_migration.sql` que esta en este repo y copiá **TODO** su contenido
4. Pegalo en el editor SQL de Supabase
5. Hacé clic en **"Run"** (o presiona `Ctrl+Enter`)

Esto crea la tabla `user_steam_settings` con RLS habilitado (cada usuario solo ve y edita su propio Steam ID).

Para verificar:
1. Andá al **Table Editor**
2. Deberias ver la nueva tabla `user_steam_settings` con las columnas: `user_id`, `steam_id`, `vanity_url`, `created_at`

### 9.3: Deployar la Edge Function (Steam Proxy)

La Edge Function es el intermediario entre tu navegador y la Steam API. El codigo ya esta en el repo en `supabase/functions/steam-proxy/index.ts`.

#### Opcion A: Via Supabase CLI (recomendado)

```bash
# Instalar Supabase CLI (solo la primera vez)
npm install -g supabase

# Loguearse a Supabase
supabase login

# Linkear al proyecto (reemplazá TU-PROYECTO-REF)
supabase link --project-ref TU-PROYECTO-REF

# Deployar la Edge Function
supabase functions deploy steam-proxy
```

> El `project-ref` es la parte antes de `.supabase.co` en tu Project URL. Ejemplo: si tu URL es `https://abc123def.supabase.co`, el ref es `abc123def`.

#### Opcion B: Via Dashboard de Supabase

1. En tu proyecto de Supabase, andá a **Edge Functions** en el menu izquierdo
2. Hacé clic en **"+ Create function"**
3. Poné el nombre exacto: `steam-proxy` (todo en minuscula)
4. Seleccioná **"TypeScript"** como lenguaje
5. Borra el contenido por defecto y reemplazalo con TODO el contenido del archivo `supabase/functions/steam-proxy/index.ts`
6. Hacé clic en **"Deploy"**

> **Importante**: El nombre de la funcion DEBE ser `steam-proxy` (todo en minuscula). Supabase es case-sensitive y el codigo frontend lo llama asi.

### 9.4: Configurar el Secret de la API Key

La API Key de Steam se configura como un secret dentro de Supabase. De esta manera, nunca queda expuesta en el codigo.

#### Via Supabase CLI:

```bash
supabase secrets set STEAM_API_KEY=TU-STEAM-API-KEY
```

#### Via Dashboard de Supabase:

1. Andá a **Settings** (engranaje) → **Edge Functions**
2. Seccion **"Function secrets"**
3. Hacé clic en **"Add a new secret"**
4. Name: `STEAM_API_KEY`
5. Value: pegá tu API Key de Steam
6. Hacé clic en **"Add secret"**

### 9.5: Configurar tu Steam ID

Una vez que todo este deployado:

1. Logueate en tu instancia de MozzPCC
2. Hacé clic en el icono de engranaje (ajustes)
3. En la pestana **"Apariencia"**, busca la seccion **"Steam Stats"**
4. Ingresá tu **Steam ID** (numerico, 17 digitos, ej: `76561198XXXXXXXXX`)
5. Hacé clic en **"Guardar"**

Tu Steam ID numerico lo podes encontrar en: [https://steamid.io/](https://steamid.io/) — ingresá tu perfil de Steam y te muestra el `steamID64`.

### 9.6: Verificar que funciona

1. Cerrá y volvé a abrir el dashboard (o hacé clic en el boton "Actualizar" del widget)
2. Deberias ver tu avatar, nombre, estado online y juegos recientes
3. Si no ves nada, revisá la seccion de [Solucion de Problemas](#steam-stats-no-carga-o-muestra-error)

---

## Solucion de Problemas

### "No puedo iniciar sesion con Google"

- Verificá que el Client ID y Client Secret en Supabase sean correctos
- Verificá que el **Authorized JavaScript origin** en Google Cloud Console sea `https://TU-PROYECTO.supabase.co`
- Verificá que el **Authorized redirect URI** sea `https://TU-PROYECTO.supabase.co/auth/v1/callback`
- Si la app esta en modo "Testing", asegurate de que tu email de Google esté en la lista de Test Users

### "No puedo iniciar sesion con GitHub"

- Verificá que el Client ID y Client Secret en Supabase sean correctos
- Verificá que la **Authorization callback URL** en GitHub sea `https://TU-PROYECTO.supabase.co/auth/v1/callback`
- Si generaste un nuevo Client Secret, asegurate de actualizarlo tambien en Supabase

### "Error al cargar datos" o las tareas/notas no se guardan

- Verificá que ejecutaste el archivo `sql/schema.sql` en el SQL Editor de Supabase
- Verificá que las tablas existen en el Table Editor
- Abrí la consola del navegador (F12) y buscá errores en la consola
- Verificá que las credenciales en `js/supabase.js` sean correctas

### "La pagina queda en blanco" o no carga

- Verificá que tu URL de GitHub Pages sea correcta
- Verificá que el archivo `index.html` exista en la raiz del repo
- Revisá la consola del navegador (F12) para ver errores de JavaScript
- Asegurate de que la extension del archivo sea `.html` y no `.txt`

### "Despues de loguearme, no veo nada"

- Esto puede pasar si las tablas no fueron creadas correctamente
- Verificá en el SQL Editor que no hubo errores al ejecutar el schema
- Probá borrar las tablas y re-ejecutar el schema SQL
- Revisá la consola del navegador para ver el error exacto

### "Steam Stats no carga" o muestra error

- Verificá que ejecutaste `sql/steam_migration.sql` en el SQL Editor de Supabase (tabla `user_steam_settings`)
- Verificá que la Edge Function `steam-proxy` este deployada (andá a Edge Functions en el dashboard)
- **El nombre de la Edge Function debe ser `steam-proxy` (minuscula)**. Si la creaste con mayusculas (`Steam-Proxy`), renombrala o borra y volvé a crearla
- Verificá que el secret `STEAM_API_KEY` este configurado en Settings → Edge Functions → Secrets
- Verificá que tu Steam ID sea el correcto (17 digitos, formato `76561198XXXXXXXXX`). Lo podes verificar en [steamid.io](https://steamid.io/)
- Verificá que tu perfil de Steam tenga **"Detalles del juego"** en Publico (Perfil → Editar perfil → Privacidad)
- Si usás Supabase CLI para deployar, asegurate de haber hecho `supabase link` con el project-ref correcto
- Revisá la consola del navegador (F12) para ver el error exacto

### "Quiero resetear todo mi datos"

Podes borrar los datos directamente desde Supabase:

1. Andá al **Table Editor**
2. Seleccioná la tabla que queres limpiar
3. Seleccioná todas las filas y elimínalas
4. O ejecutá en el SQL Editor:
   ```sql
   DELETE FROM tasks WHERE user_id = 'TU-USER-ID';
   DELETE FROM notes WHERE user_id = 'TU-USER-ID';
   DELETE FROM user_steam_settings WHERE user_id = 'TU-USER-ID';
   ```

Para obtener tu user ID, podes buscarlo en **Authentication → Users** en Supabase.

---

## Estructura del Proyecto

```
MozzPCC/
├── index.html              # Pagina principal (dashboard + auth)
├── css/
│   └── styles.css          # Todos los estilos (tema, auth, widgets)
├── js/
│   ├── supabase.js         # Configuracion del cliente Supabase
│   ├── auth.js             # Sistema de autenticacion completo
│   ├── app.js              # Reloj, fecha y saludo dinamico
│   ├── quickAccess.js      # Accesos rapidos
│   ├── tasks.js            # CRUD de tareas (Supabase)
│   ├── notes.js            # Notas adhesivas (Supabase)
│   ├── finances.js         # Finanzas personales (transacciones + graficos)
│   ├── readLater.js        # Links guardados para leer mas tarde
│   ├── backup.js           # Backup/restore de datos
│   ├── steamStats.js       # Widget de Steam Stats (perfil + juegos)
│   ├── tips.js             # Tips de uso
│   ├── weather.js           # Widget de clima (Open-Meteo)
│   ├── settings.js         # Configuracion (temas + moneda + accesos rapidos)
│   ├── commandPalette.js   # Command Palette (Ctrl+K)
├── sql/
│   ├── schema.sql          # Schema de BD + RLS (ejecutar en Supabase)
│   ├── steam_migration.sql # Migration para tabla user_steam_settings
│   ├── read_later_migration.sql      # Migration para tabla read_later_items
│   └── read_later_tag_migration.sql  # Migration para tabla read_later_tags
├── supabase/
│   └── functions/
│       └── steam-proxy/
│           └── index.ts    # Edge Function: proxy para Steam Web API
├── README.md               # Descripcion general del proyecto
└── SETUP.md                # Esta guia de configuracion
```

---

## Tecnologias

| Tecnologia | Uso |
|-----------|-----|
| HTML5 | Estructura semantica del dashboard |
| CSS3 | Glassmorphism, Grid, animaciones, responsive |
| JavaScript ES6+ | Logica de la app (vanilla, sin frameworks) |
| Supabase Auth | Autenticacion (email, Google, GitHub, Magic Link) |
| Supabase PostgreSQL | Base de datos relacional |
| Row Level Security | Seguridad a nivel de fila (cada usuario ve solo sus datos) |
| Google Fonts | Tipografia (Inter) |
| Font Awesome 6 | Iconos |
| Chart.js 4 | Graficos (donut + barras) para finanzas |
| Steam Web API | Datos de perfil y juegos del widget Steam Stats |
| Supabase Edge Functions | Proxy para Steam API (resuelve CORS) |

---

**MozzPCC** &copy; 2026 — Hecho con effort
