# Desarrollo: cómo correr y probar la app

## Requisitos

- Node.js 22 y npm.
- Un proyecto de **Supabase** (plan gratuito) en una **región de la UE** (D-6). Crearlo es una cuenta a nombre de Sergio: lo hace él (D-5).

## Dónde está publicada

**[Verificado 2026-11-09]** Todo a nombre de Sergio y en planes gratuitos:

- **Supabase:** proyecto `app-citas` (ref `wrjewtfkvzhcwmltpgvw`), región eu-west-1 (Irlanda). Migraciones aplicadas a mano desde SQL Editor.
- **Vercel:** proyecto `viso99/app-citas`, dirección de prueba **https://app-citas-khaki.vercel.app**. Se publica solo con cada cambio en `main`. Variables: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **URL Configuration de Supabase:** Site URL = la dirección de Vercel; Redirect URLs = `https://app-citas-khaki.vercel.app/**` y `http://localhost:3000/**`.
- Una migración nueva **no** se aplica sola: hay que ejecutarla en SQL Editor (o con la CLI) antes o junto con el merge que la usa.

## Configurar Supabase (una sola vez)

1. Crear el proyecto en [supabase.com](https://supabase.com) eligiendo una región de la UE (por ejemplo, Frankfurt).
2. **Base de datos:** en SQL Editor, ejecutar en orden los archivos de `supabase/migrations/`. (Con la CLI de Supabase: `supabase link` y `supabase db push`.)
3. **Correo de acceso (D-7):** **[Verificado 2026-11-09]** sin un servicio de correo propio (SMTP), Supabase no deja editar las plantillas y manda solo un **enlace**. La app acepta las dos cosas: el enlace lleva a `/auth/confirmar`, que inicia la sesión (hay que abrirlo en el mismo navegador donde se pidió). Cuando haya SMTP, en Authentication → Emails → "Magic link or OTP" agregar `{{ .Token }}` a la plantilla para que llegue también el código.
   En Authentication → URL Configuration, el **Site URL** y las **Redirect URLs** tienen que incluir la dirección donde está publicada la app (y `http://localhost:3000/**` para desarrollo).
4. **Correos reales:** el envío de correos incluido en Supabase es solo para pruebas y tiene un límite muy bajo por hora. Antes de abrir a más gente hace falta un servicio de correo propio (SMTP), que puede tener costo: lo decide Sergio.
5. Copiar `.env.example` a `.env.local` y completar la URL y la clave "publishable" (Project Settings → API).

## Comandos

```
npm install
npm run dev        # la app en http://localhost:3000
npm test           # pruebas de las reglas del perfil
npm run lint
npm run typecheck
npm run build
```

La CI de GitHub (`.github/workflows/ci.yml`) corre lint, typecheck, pruebas y build en cada PR.

## Avisos para quien programe

- **Next.js 16:** cambió respecto de versiones anteriores. Leé `AGENTS.md` y la guía en `node_modules/next/dist/docs/` antes de escribir código de Next. Por ejemplo: el "middleware" ahora se llama `src/proxy.ts`, y con `cacheComponents` todo lo que lee la sesión tiene que estar dentro de un `<Suspense>`.
- **Supabase:** en el servidor, usá `getUser()` de `src/lib/supabase/server.ts` (verifica la sesión contra Supabase). No confíes en `getSession()` del lado del servidor.
- Las reglas de acceso (RLS) de la base son la protección real de los datos. Cualquier tabla nueva lleva RLS en la misma migración.
