# VSCTracker — Mini WakaTime personalizado

[![Version](https://img.shields.io/badge/version-1.2.0-yellow.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-darkred.svg)](LICENSE)
[![VSCode](https://img.shields.io/badge/VSCode-1.96+-blue.svg)](https://code.visualstudio.com)
[![Node](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org)

## 📋 Descripción

VSCTracker es una **extensión minimalista para Visual Studio Code** que mide tu tiempo de trabajo por archivo y lo agrega por lenguaje de programación. Funciona **offline por defecto** y ofrece sincronización opcional con Firebase para mantener tu historial en la nube.

Ideal para desarrolladores que desean:
- Rastrear tiempo de codificación sin dependencias externas complejas
- Análisis por lenguaje y framework
- Backups automáticos y contrarseñables
- Sincronización opcional y segura con bases de datos remotas

## 🏃 Características principales

- ✅ **Rastreo por archivo** — almacena tiempo por archivo (milisegundos)
- 📊 **Agregación por lenguaje** — totales automáticos por lenguaje de programación
- 🔌 **Offline-first** — funciona sin conexión; sincroniza cuando esté disponible
- 🔐 **Firebase opcional** — sincronización segura con Realtime Database (configurable)
- 📁 **Backups automáticos** — copia de seguridad tras cada sincronización remota
- 🖥️ **Controles vía comandos `vt`** — interfaz de línea de comandos integrada
- 🎨 **Detección de frameworks** — reconoce React, Vue, Angular, Django, Flask, etc.
- 📈 **Terminal tracking** — cuenta tiempo en terminal de VS Code

## 🚀 Guía rápida de inicio

### Instalación (para usuarios)

1. Abre VS Code
2. Busca `VSCTracker` en la tienda de extensiones (o instala desde `.vsix`)
3. ¡Listo! Comienza a rastrear tu tiempo automáticamente

### Desarrollo local

```bash
# Clonar el repositorio
git clone https://github.com/CapriaFranco/VSCTracker.git
cd VSCTracker

# Instalar dependencias
npm install

# Compilar TypeScript
npm run compile

# Ejecutar en modo desarrollo (F5 en VS Code)
npm run watch  # o usar F5 en el editor
```

## 📦 Requisitos y compatibilidad

### Requisitos del sistema

| Requisito | Versión | Estado |
|-----------|---------|--------|
| **Visual Studio Code** | ≥ 1.96.0 | Requerido |
| **Node.js** | 20.x | Dev: Requerido |
| **npm** | 9+ | Dev: Requerido |
| **TypeScript** | 5.7+ | Dev: Requerido |

### Dependencias de producción

```json
{
  "firebase": "^11.2.0",
  "dotenv": "^16.4.7"
}
```

### Dependencias de desarrollo

```json
{
  "@types/vscode": "^1.96.0",
  "@types/node": "20.x",
  "@types/mocha": "^10.0.10",
  "typescript": "^5.7.3",
  "eslint": "^9.19.0",
  "@typescript-eslint/parser": "^8.22.0",
  "@typescript-eslint/eslint-plugin": "^8.22.0",
  "@vscode/test-cli": "^0.0.10",
  "@vscode/test-electron": "^2.4.1"
}
```

### Compatibilidad del SO

- ✅ Windows 10/11
- ✅ macOS (Intel y Apple Silicon)
- ✅ Linux (Ubuntu, Debian, Fedora, etc.)

## 🛠️ Almacenamiento y backups

### Almacenamiento local

- **Ubicación**: `localCodingStore.json` en el storage global de VS Code (no en la carpeta del proyecto)
- **Contenido**: archivos tracked, lenguajes, frameworks detectados y timestamps
- **Formato**: JSON con estructura `{ files, languages, frameworks, updatedAt }`

### Sistema de backups

1. **Automáticos**: se generan tras cada sincronización remota exitosa
2. **Manuales**: usando comando `vt backup`
3. **Configurables**: ruta personalizable via `vt set-backup-dir`
4. **Prioridad de rutas**:
   - Ruta configurada por el usuario (globalState) — máxima prioridad
   - Configuración de workspace `vscTracker.backupDir`
   - Storage local de la extensión — fallback

## 💡 Comandos `vt` disponibles

| Comando | Alias | Descripción |
|---------|-------|-------------|
| `vt help` | — | Muestra ayuda completa en Output |
| `vt status` | — | Verifica conexión con Firebase |
| `vt save` | — | Fuerza sincronización local → remoto |
| `vt show-local` | `showlocal` | Muestra totales locales por lenguaje |
| `vt show-remote` | `showremote` | Muestra totales en DB remota |
| `vt pull` | — | Descarga datos remotos y suma a local |
| `vt list` | `detected` | Lista lenguajes y frameworks detectados |
| `vt backup` | — | Genera backup manual en JSON |
| `vt backup-dir` | `backupdir` | Muestra y abre carpeta de backups |
| `vt set-backup-dir` | — | Configura ruta personalizada para backups |
| `vt clear-backup-dir` | — | Elimina ruta configurada, vuelve a defecto |

## ⚙️ Configuración avanzada

### Firebase (Sincronización remota)

Si deseas sincronizar con Firebase Realtime Database:

1. **Crear proyecto en Firebase**:
   - Accede a [firebase.google.com](https://firebase.google.com)
   - Crea un nuevo proyecto
   - Habilita Realtime Database
   - Copia `API_KEY` y `DATABASE_URL`

2. **Configurar variables de entorno** en PowerShell:

```powershell
$env:FIREBASE_API_KEY = 'tu-api-key-aqui'
$env:FIREBASE_DATABASE_URL = 'https://tu-proyecto.firebaseio.com'
code  # abre VS Code con las variables disponibles
```

3. **Alternativamente, en `.env`** (no incluir en repo):

```env
FIREBASE_API_KEY=tu-api-key-aqui
FIREBASE_DATABASE_URL=https://tu-proyecto.firebaseio.com
```

4. **Algoritmo de reconciliación**:
   - Si `local ≥ remote`: envía local a remoto
   - Si `remote > local`: suma remoto a local (recupera datos perdidos)

### Configuración de workspace

En `.vscode/settings.json` puedes establecer:

```json
{
  "vscTracker.backupDir": "./backups"  // ruta relativa al workspace
}
```

## 📦 Empaquetar e instalar

### Generar `.vsix`

```bash
npx vsce package
# Genera: vsctracker-1.2.0.vsix
```

### Instalar localmente

**Opción 1: Terminal PowerShell**

```powershell
code --install-extension .\vsctracker-1.2.0.vsix
```

**Opción 2: Interface VS Code**

1. Cmd+Shift+P (Mac) / Ctrl+Shift+P (Win/Linux)
2. Escribe: `Extensions: Install from VSIX...`
3. Selecciona el archivo `.vsix`

## 🧪 Desarrollo y pruebas

### Comandos disponibles

```bash
# Compilar TypeScript
npm run compile

# Compilar en modo watch (desarrollo)
npm run watch

# Lint (ESLint)
npm run lint

# Tests (integración con vscode-test)
npm test

# Prepublish (compila y prepara para empaquetar)
npm run vscode:prepublish
```

### Ejecutar en modo debug

1. Abre el proyecto en VS Code
2. Presiona **F5** (Start Debugging)
3. Se abrirá una ventana de VS Code con la extensión cargada
4. Prueba los comandos en la paleta de comandos (`Cmd+Shift+P` / `Ctrl+Shift+P`)

### Estructura del proyecto

```
VSCTracker/
├── src/
│   ├── extension.ts          # Lógica principal
│   └── test/
│       └── extension.test.ts # Tests
├── out/                      # Compilado (ignorado en git)
├── img/
│   └── VSCtracker.png        # Icono de la extensión
├── package.json              # Manifest y dependencias
├── tsconfig.json             # Config TypeScript
├── eslint.config.mjs         # Config ESLint
├── README.md                 # Este archivo
├── README.en.md              # Versión en inglés
└── LICENCE                   # MIT License
```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor sigue estos pasos:

### Proceso de contribución

1. **Fork el repositorio**
   ```bash
   # En GitHub: Click en 'Fork'
   # Luego clona tu fork:
   git clone https://github.com/TU_USUARIO/VSCTracker.git
   cd VSCTracker
   ```

2. **Crea una rama feature**
   ```bash
   git checkout -b feature/nombre-descriptivo
   # o para bugfix:
   git checkout -b bugfix/nombre-bug
   ```

3. **Realiza tus cambios**
   - Edita el código siguiendo el estilo existente
   - Mantén los archivos `.ts` con tipado completo
   - Asegúrate de que pase lint: `npm run lint`

4. **Prueba localmente**
   ```bash
   npm run compile
   npm run lint
   npm test
   ```

5. **Commit con mensajes descriptivos**
   ```bash
   git add .
   git commit -m "feat: añade soporte para lenguaje X"
   # Ejemplos: feat:, fix:, docs:, refactor:, test:, chore:
   ```

6. **Push a tu fork**
   ```bash
   git push origin feature/nombre-descriptivo
   ```

7. **Abre un Pull Request**
   - Ve a GitHub y abre un PR desde tu rama a `master`
   - Describe qué cambia y por qué
   - Solicita review

### Pautas de código

- **TypeScript**: tipado completo, evita `any` si es posible
- **Estilo**: sigue ESLint (ejecuta `npm run lint`)
- **Commits**: usa prefijos semánticos (feat, fix, docs, refactor, test, chore)
- **Tests**: agrega tests para nuevas funcionalidades
- **Documentación**: actualiza README si cambias comportamiento

### Reportar bugs

Si encuentras un bug:

1. Verifica que no exista issue abierto
2. Abre un nuevo issue con:
   - Título descriptivo
   - Versión de VS Code y SO
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Logs si aplica

### Sugerir mejoras

Para sugerencias de nuevas funcionalidades:

1. Abre un issue con etiqueta `enhancement`
2. Describe el caso de uso
3. Explica por qué sería útil
4. Proporciona ejemplos si es posible

## 📝 Changelog

Ver [CHANGELOG.md](CHANGELOG.md) para historial de cambios.

## 👤 Autor

**Capria Franco**
- GitHub: [@CapriaFranco](https://github.com/CapriaFranco)
- Repositorio: [VSCTracker](https://github.com/CapriaFranco/VSCTracker)

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver archivo [LICENCE](LICENCE) para más detalles.

Permitido:
- ✅ Uso comercial
- ✅ Modificación
- ✅ Distribución
- ✅ Uso privado

Required:
- 📋 Incluir licencia y copyright
- 📋 Establecer cambios

## 🙏 Agradecimientos

- Inspirado en [WakaTime](https://wakatime.com)
- Construido con [VS Code Extension API](https://code.visualstudio.com/api)
- Firebase para sincronización remota
- TypeScript y ESLint para calidad de código

## 📞 Soporte

- 📖 [Documentación oficial VS Code](https://code.visualstudio.com/docs)
- 🐛 [Issues en GitHub](https://github.com/CapriaFranco/VSCTracker/issues)
- 💬 [Discusiones en GitHub](https://github.com/CapriaFranco/VSCTracker/discussions)

---

**Versión actual**: 1.2.0 | **Última actualización**: 9 de diciembre de 2025

> 🌍 **English version** [here](README.en.md)
