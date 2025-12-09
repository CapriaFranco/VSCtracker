
# VSCTracker - VSCode Extension

![Version](https://img.shields.io/badge/version-1.0.0-yellow.svg)
[![License](https://img.shields.io/badge/license-MIT-darkred.svg)](LICENCE)
![VSCode](https://img.shields.io/badge/VSCode-1.96+-blue.svg)

## Descripción

VSCTracker es una extensión ligera para Visual Studio Code que registra el tiempo de edición por archivo y resume por lenguaje. Los datos se mantienen localmente y se pueden sincronizar con Firebase (opcional) usando un esquema simple por lenguaje.

Principios clave:
- Guardado local por archivo y agregados por lenguaje en `localCodingStore.json` dentro de `context.globalStoragePath`.
- Sincronización remota por lenguaje bajo `vscTracker/languages` en Firebase (mapa { <language>: ms }).
- Operaciones offline seguras: el local siempre guarda los milisegundos; la sincronización suma/recupera según corresponda.

## Requisitos

- Node.js (>=12)
- Visual Studio Code (>=1.96)
- (Opcional) Cuenta/Proyecto de Firebase si quieres sincronizar remotamente

## Instalación rápida

```powershell
git clone https://github.com/capriafranco/VSCTracker.git
cd VSCTracker
npm install
```

## Configurar Firebase (opcional)

Si quieres que la extensión sincronice con Firebase, configura estas variables de entorno antes de iniciar VS Code:

PowerShell (temporal para la sesión):

```powershell
$env:FIREBASE_API_KEY = 'tu-api-key'
$env:FIREBASE_DATABASE_URL = 'https://tu-proyecto-default-rtdb.firebaseio.com'
```

También puedes usar un `.env` y la dependencia `dotenv` si prefieres (ya incluida en el proyecto).

Nota: la extensión sólo iniciará la sincronización remota si las variables necesarias están presentes. Si no, solo funciona offline con almacenamiento local.

## Almacenamiento local

- Archivo: `localCodingStore.json` (guardado en `context.globalStoragePath` del usuario para la extensión).
- Estructura principal:

```json
{
    "files": {
        "C:/ruta/al/archivo.ts": { "language": "typescript", "ms": 1234567 }
    },
    "languages": {
        "typescript": 1234567,
        "javascript": 987654
    },
    "updatedAt": 1710000000000
}
```

## Comandos (`vt`)

La extensión expone una familia de comandos con prefijo `vt` (abreviatura de VSC Tracker):

- `vt` — abre un prompt para escribir subcomandos o muestra la ayuda si no ingresas nada.
- `vt help` — muestra la ayuda (Output → VSCTracker).
- `vt status` — comprueba la conexión/configuración de Firebase y lista conteos remotos (si existen).
- `vt save` — fuerza la reconciliación local → remoto (sube lo que corresponda).
- `vt show-local` — muestra los totales locales por lenguaje en Output → VSCTracker.
- `vt show-remote` — muestra los totales remotos por lenguaje (requiere Firebase configurado).
- `vt pull` — descarga datos remotos y los SUMA al local (útil para recuperar tiempo perdido).

La extensión también sincroniza automáticamente con el remoto cada 3 horas cuando está configurado.

## Comportamiento de sincronización (resumen)

- En `reconcileWithRemote()` la extensión compara los valores por lenguaje:
    - Si `local >= remote` → se marcará para actualizar el remoto (se sube el valor local).
    - Si `remote > local` → se SUMA el valor remoto al local (recuperación) y se guarda localmente.
- Esto permite trabajar offline y resolver conflictos sumando en el lado local si hubo pérdida de datos.

## Desarrollo y pruebas

Compilar y lint:

```powershell
npm run compile
npm run lint
```

Ejecutar tests (usa el runner de VS Code):

```powershell
npm test
```

Notas:
- Para los tests que usan `vscode-test` es recomendable que la ruta del proyecto no contenga espacios problemáticos. Si tienes errores relacionados a rutas, mueve el repo a una carpeta simple (por ejemplo `D:\projects\VSCtracker`).

## Uso rápido (ejemplo)

1. Abre VS Code en la carpeta del proyecto.
2. (Opcional) exporta variables de Firebase en PowerShell como se indicó arriba.
3. Instala dependencias: `npm install`.
4. Ejecuta la extensión en modo desarrollo (F5) o usa los comandos del Command Palette:
     - `vt` → escribe `help` → verás la ayuda en Output → `VSCTracker`.

## Contribuir

1. Haz fork del repositorio.
2. Crea una rama: `git checkout -b feature/nombre`.
3. Haz tus cambios y commitea.
4. Abre un Pull Request.

## Licencia

MIT — ver archivo `LICENCE`.
