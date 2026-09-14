# Dandy — guía de despliegue (sin experiencia técnica)

Vas a usar dos servicios gratuitos: **Supabase** (guarda usuarios, perfiles, fotos y chat) y **Vercel** (publica la app en internet).

## Paso 1 — Crear el proyecto en Supabase

1. Ve a https://supabase.com y crea una cuenta gratis.
2. Crea un nuevo proyecto (elige cualquier nombre y una contraseña de base de datos — guárdala).
3. Cuando el proyecto esté listo, ve a **SQL Editor** (menú izquierdo) → **New query**.
4. Abre el archivo `supabase/schema.sql` de esta carpeta, copia todo su contenido, pégalo ahí y presiona **Run**.
5. Ve a **Storage** (menú izquierdo) → **New bucket** → nómbralo `photos` → marca **Public bucket** → crea.
6. Ve a **Project Settings** → **API**. Ahí verás dos datos que necesitas:
   - **Project URL**
   - **anon public key**

## Paso 1.5 — Obtener tu API key de Ticketmaster (para la sección Eventos)

1. Ve a https://developer.ticketmaster.com y crea una cuenta gratis.
2. Click en **Get Your API Key** → crea una app (cualquier nombre).
3. Copia la **Consumer Key** que te dan — esa es tu `TICKETMASTER_API_KEY`.
4. Es gratis hasta 5,000 solicitudes al día, suficiente para empezar.

## Paso 2 — Subir el código a GitHub

1. Crea una cuenta gratis en https://github.com si no tienes.
2. Crea un repositorio nuevo (botón verde "New").
3. Sube todos los archivos de esta carpeta a ese repositorio (puedes arrastrar los archivos directamente desde la página de GitHub con "uploading an existing file").

## Paso 3 — Publicar en Vercel

1. Ve a https://vercel.com y entra con tu cuenta de GitHub.
2. Click en **Add New → Project** y elige el repositorio que acabas de subir.
3. Antes de darle a "Deploy", abre **Environment Variables** y agrega:
   - `NEXT_PUBLIC_SUPABASE_URL` = (el Project URL del paso 1)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (el anon public key del paso 1)
   - `TICKETMASTER_API_KEY` = (la Consumer Key del paso 1.5)
4. Click en **Deploy**. En unos minutos tendrás un link como `dandy.vercel.app` que puedes compartir con quien quieras.

## Notas

- Cada persona que se registre crea su cuenta con correo y contraseña.
- Las fotos se guardan en Supabase Storage, los mensajes se actualizan en tiempo real.
- Si más adelante quieres cambiar el nombre del dominio, en Vercel puedes conectar un dominio propio (ej. `dandyapp.com`) desde **Project → Settings → Domains**.
- Este es un MVP funcional: antes de lanzarlo públicamente, conviene agregar moderación de contenido, verificación de edad/identidad y un sistema de reportar/bloquear usuarios — puedo ayudarte a construir eso después.
