# Desarrollo: cómo correr y probar la app

## Requisitos

- Node.js 22 y npm.
- Un proyecto de **Supabase** (plan gratuito) en una **región de la UE** (D-6). Crearlo es una cuenta a nombre de Sergio: lo hace él (D-5).

## Dónde está publicada

**[Verificado 2026-11-09]** Todo a nombre de Sergio y en planes gratuitos:

- **Supabase:** proyecto `app-citas` (ref `wrjewtfkvzhcwmltpgvw`), región eu-west-1 (Irlanda). Migraciones aplicadas a mano desde SQL Editor.
- **Vercel:** proyecto `viso99/app-citas`, dirección de prueba **https://app-citas-khaki.vercel.app**. Se publica solo con cada cambio en `main`. Variables: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **URL Configuration de Supabase:** Site URL = la dirección de Vercel; Redirect URLs = `https://app-citas-khaki.vercel.app/**` y `http://localhost:3000/**`.
- Una migración nueva **no** se aplica sola: hay que ejecutarla en SQL Editor (o con la CLI) antes o junto con el merge que la usa. Las que solo agregan cosas las aplica Claude y lo avisa en el PR; las que borran o cambian datos, con el visto bueno de Sergio (D-13).

## Configurar Supabase (una sola vez)

1. Crear el proyecto en [supabase.com](https://supabase.com) eligiendo una región de la UE (por ejemplo, Frankfurt).
2. **Base de datos:** en SQL Editor, ejecutar en orden los archivos de `supabase/migrations/`. (Con la CLI de Supabase: `supabase link` y `supabase db push`.)
3. **Correo de acceso (D-7):** el correo trae un **código** (`{{ .Token }}`) y un **enlace**. La app pide el código; el enlace lleva a `/auth/confirmar` y solo funciona en el mismo navegador donde se pidió. La plantilla se edita en Authentication → Emails → "Magic link" (hace falta SMTP propio, D-16).
   En Authentication → URL Configuration, el **Site URL** y las **Redirect URLs** tienen que incluir la dirección donde está publicada la app (y `http://localhost:3000/**` para desarrollo).
4. **Envío de correos (D-16):** **[Verificado 2026-11-09]** sale por el Gmail de Sergio (SMTP `smtp.gmail.com`, puerto 465, contraseña de aplicación que cargó él), con nombre "Zuvi". Límite: 30 correos por hora y 60 segundos entre correos a la misma dirección (Authentication → Rate Limits). Antes de abrir a gente real hay que pasarlo a una dirección de zuvi.es (P-1).
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

## Revisar denuncias (D-14)

En Supabase, **Table Editor → `reports`**: cada fila es una denuncia con quién denuncia (`reporter_id`), a quién (`reported_id`), el motivo y el texto. Las que tienen `reviewed_at` vacío están sin revisar. Un perfil con 3 o más sin revisar está oculto de Descubrir.

- Para dar por revisada una denuncia, completá `reviewed_at` con la fecha y hora actual. Si el perfil estaba oculto y quedan menos de 3 sin revisar, vuelve a aparecer.
- Los bloqueos están en `blocks`. Qué hacer con un perfil denunciado de verdad todavía no está decidido (P-5).

## Revisar verificaciones (D-23)

En Supabase, **Table Editor → `verifications`**: las filas con `verified_at` y `rejected_at` vacíos están pendientes. El selfie está en **Storage → `verification-photos`**, en la ruta `photo_path`; el gesto pedido está en `gesture` (lista en `src/lib/profileExtras.ts`). Compará el selfie con las fotos del perfil (`profile-photos/<user_id>/`).

- Si coincide y hace el gesto: completá `verified_at` con la fecha y hora actual. La tarjeta pasa a llevar "✔".
- Si no: completá `rejected_at`. La persona verá que no se pudo verificar y podrá enviar otro.

## Avisos en el móvil (D-24)

Necesitan tres variables en Vercel (Settings → Environment Variables) y en `.env.local` para probar en local:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`: se generan una vez con `npx web-push generate-vapid-keys`. La privada es secreta: nunca en el repositorio ni en el chat. Si se cambian, los avisos ya activados dejan de funcionar y cada persona tiene que volver a activarlos.
- `VAPID_SUBJECT`: la dirección de la app (`https://app-citas-khaki.vercel.app`, y la de zuvi.es cuando exista).

Sin ellas la app funciona, pero el botón de Perfil dice que el navegador no permite avisos.

## Avisos para quien programe

- **Next.js 16:** cambió respecto de versiones anteriores. Leé `AGENTS.md` y la guía en `node_modules/next/dist/docs/` antes de escribir código de Next. Por ejemplo: el "middleware" ahora se llama `src/proxy.ts`, y con `cacheComponents` todo lo que lee la sesión tiene que estar dentro de un `<Suspense>`.
- **Supabase:** en el servidor, usá `getUser()` de `src/lib/supabase/server.ts` (verifica la sesión contra Supabase). No confíes en `getSession()` del lado del servidor.
- Las reglas de acceso (RLS) de la base son la protección real de los datos. Cualquier tabla nueva lleva RLS en la misma migración.
