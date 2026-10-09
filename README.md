# Personal Planner

## Preparar y crear el APK para Android

La app usa Capacitor e incluye la interfaz dentro del proyecto Android. Una vez instalado, abre sin necesitar un servidor web ni conexión a Internet.

### Requisitos

- Node.js 22 o posterior y pnpm
- Android Studio con el SDK de Android API 36
- Un JDK compatible, configurado en Android Studio

### Ejecutar en el teléfono

1. Instala las dependencias: `corepack pnpm install --frozen-lockfile`.
2. Compila la app y sincroniza los recursos Android: `corepack pnpm android:sync`.
3. Abre el proyecto nativo: `corepack pnpm android:open`.
4. Espera a que termine la sincronización de Gradle, conecta el teléfono con la depuración USB activada y pulsa **Run** en Android Studio.

También puedes usar `corepack pnpm android:run` con un emulador o un dispositivo Android conectado.

### Generar el APK

Después de sincronizar, en Android Studio selecciona **Build > Build Bundle(s) / APK(s) > Build APK(s)**. El APK de depuración se genera en:

`android/app/build/outputs/apk/debug/app-debug.apk`

Copia ese archivo al teléfono y ábrelo para instalarlo. Android podría pedir permiso para instalar aplicaciones desde esa fuente.

Ejecuta `corepack pnpm android:sync` después de cambiar la interfaz para que el APK incluya la versión más reciente. Los datos del planner se guardan en el almacenamiento local de la app; borrar sus datos o desinstalarla podría eliminarlos. Usa **Settings > Data & privacy > Export backup** para guardar una copia.
