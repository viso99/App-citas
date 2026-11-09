# Desarrollo: cómo correr y probar la app

## Requisitos

- Node.js 22 y npm.
- Un proyecto de **Supabase** (plan gratuito) en una **región de la UE** (D-6). Crearlo es una cuenta a nombre de Sergio: lo hace él (D-5).

## Configurar Supabase (una sola vez)

1. Crear el proyecto en [supabase.com](https://supabase.com) eligiendo una región de la UE (por ejemplo, Frankfurt).
2. **Base de datos:** en SQL Editor, ejecutar en orden los archivos de `supabase/migrations/`. (Con la CLI de Supabase: `supabase link` y `supabase db push`.)
3. **Correo con código (D-7):** en Authentication → Email Templates → "Magic Link", el texto tiene que incluir `{{ .Token }}` (el código de 6 dígitos), por ejemplo: `Tu código para entrar es {{ .Token }}`. Si no, Supabase manda un enlace en vez del código.
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
