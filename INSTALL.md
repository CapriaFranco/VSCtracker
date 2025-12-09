# Guía de Instalación — VSCTracker

## 📥 Instalación desde la tienda de VS Code

### Opción 1: Búsqueda directa (Recomendado)

1. Abre **Visual Studio Code**
2. Ve a la sección de **Extensiones** (Ctrl+Shift+X / Cmd+Shift+X)
3. Busca **"VSCTracker"**
4. Haz clic en **Instalar**
5. Una vez instalado, se activará automáticamente

### Opción 2: Desde el menú de Aplicaciones

1. Ve a **Ver → Extensiones** (o Ctrl+Shift+X)
2. Haz clic en **Buscar en Marketplace**
3. Escribe `VSCTracker`
4. Selecciona el resultado y haz clic en **Instalar**

---

## 🔧 Instalación desde archivo `.vsix` (Local)

### Requisitos
- Visual Studio Code 1.96.0 o superior
- Permiso de escritura en el directorio de VS Code
- (Opcional) Node.js 20.x si vas a desarrollar

### Generar el archivo `.vsix`

Si prefieres generar tu propio archivo `.vsix`:

#### Opción A: Usar `npx` (Recomendado - sin instalación global)

```bash
# 1. Clona el repositorio
git clone https://github.com/CapriaFranco/VSCTracker.git
cd VSCTracker

# 2. Instala dependencias
npm install

# 3. Compila el código
npm run compile

# 4. Genera el paquete .vsix (sin necesidad de instalar vsce)
npx vsce package
# Resultado: vsctracker-x.x.x.vsix
```

#### Opción B: Instalar `vsce` globalmente

```bash
# 1. Instala vsce globalmente (una sola vez)
npm install -g @vscode/vsce

# 2. Clona el repositorio
git clone https://github.com/CapriaFranco/VSCTracker.git
cd VSCTracker

# 3. Instala dependencias
npm install

# 4. Compila el código
npm run compile

# 5. Genera el paquete .vsix
vsce package
# Resultado: vsctracker-x.x.x.vsix
```

### Instalar el `.vsix`

#### Opción A: Terminal PowerShell (Windows/Linux/macOS)

```powershell
code --install-extension .\vsctracker-x.x.x.vsix
```

#### Opción B: Terminal Bash (macOS/Linux)

```bash
code --install-extension ./vsctracker-x.x.x.vsix
```

#### Opción C: Interfaz gráfica de VS Code

1. Abre VS Code
2. Ve a **Extensiones** (Ctrl+Shift+X)
3. Haz clic en los **tres puntos** (menú superior)
4. Selecciona **Install from VSIX...**
5. Navega y selecciona el archivo `vsctracker-x.x.x.vsix`
6. Haz clic en **Instalar**

#### Opción D: Arrastrar y soltar (VS Code 1.90+)

1. Abre la sección de **Extensiones** en VS Code
2. Arrastra el archivo `.vsix` a la ventana de extensiones
3. Confirma la instalación

---

## ✅ Verificar la instalación

### Método 1: Comprobar en la lista de extensiones

1. Ve a **Extensiones** (Ctrl+Shift+X)
2. Busca "VSCTracker"
3. Deberías ver:
   - Nombre: **vsctracker**
   - Estado: **Instalado**
   - Icono de la extensión visible

### Método 2: Usar un comando

1. Abre la **Paleta de comandos** (Ctrl+Shift+P)
2. Escribe: `vt help`
3. Presiona Enter
4. Deberías ver la ayuda en el panel **Output → VSCTracker**

### Método 3: Verificar la barra de estado

- Mira la esquina **inferior izquierda** de VS Code
- Deberías ver: `⚠️ VSCTracker Inactive` o `✅ VSCTracker Active`
- (Inactivo es normal hasta que configures Firebase)

---

## ⚙️ Configuración inicial

### Configuración básica (recomendada)

VSCTracker funciona **out-of-the-box** sin configuración adicional. Simplemente:

1. Instala la extensión
2. Abre un archivo o proyecto
3. ¡Comienza a codificar! El tiempo se cuenta automáticamente

### Configuración avanzada (Opcional)

#### 1. Configurar directorio de backups

```
Paleta de Comandos (Ctrl+Shift+P) → vt set-backup-dir
```

Ingresa una ruta absoluta o relativa al home:
```
D:\backups
~/vsctracker/backups
/home/user/backups
```

#### 2. Configurar Firebase (Sincronización remota)

Si deseas sincronizar con Firebase:

**En PowerShell (Windows):**
```powershell
$env:FIREBASE_API_KEY = 'tu-api-key-aqui'
$env:FIREBASE_DATABASE_URL = 'https://tu-proyecto.firebaseio.com'
code  # Abre VS Code con las variables disponibles
```

**En Terminal (macOS/Linux):**
```bash
export FIREBASE_API_KEY='tu-api-key-aqui'
export FIREBASE_DATABASE_URL='https://tu-proyecto.firebaseio.com'
code  # Abre VS Code
```

**Alternativamente, crear archivo `.env` (NO commitear):**
```env
FIREBASE_API_KEY=tu-api-key-aqui
FIREBASE_DATABASE_URL=https://tu-proyecto.firebaseio.com
```

#### 3. Configurar en `.vscode/settings.json`

En tu proyecto, crea o edita `.vscode/settings.json`:

```json
{
  "vscTracker.backupDir": "./backups"  // Ruta relativa al workspace
}
```

---

## 🚀 Primeros pasos

### Usar VSCTracker

1. **Abre un proyecto** en VS Code
2. **Abre algunos archivos** (TypeScript, Python, etc.)
3. **Comienza a escribir código**
4. **Mira la barra de estado** (esquina inferior izquierda) → verás el tiempo total

### Comandos básicos

```
Paleta de Comandos (Ctrl+Shift+P) y escribe:

vt help              → Muestra todos los comandos disponibles
vt status            → Verifica conexión con Firebase (si está configurado)
vt show-local        → Muestra tiempo tracked por lenguaje
vt backup            → Genera un backup manual
vt backup-dir        → Abre carpeta de backups
```

### Ver datos

1. **Panel de salida**: Ve a **View → Output** y selecciona **VSCTracker**
2. **Barra de estado**: Mira esquina inferior izquierda (muestra tiempo total)
3. **Archivo local**: `~/.config/Code/User/globalStorage/vsctracker/localCodingStore.json` (Linux/macOS) o `%APPDATA%\Code\User\globalStorage\vsctracker\` (Windows)

---

## 🆘 Troubleshooting

### La extensión no aparece en la lista de extensiones

**Solución**:
1. Recarga VS Code completamente: **File → Exit** y reabre
2. Ve a **Extensiones** y busca "VSCTracker"
3. Si aún no aparece, intenta:
   ```bash
   code --list-extensions  # Ver extensiones instaladas
   code --uninstall-extension capria-franco.vsctracker  # Desinstalar
   code --install-extension ./vsctracker-x.x.x.vsix      # Reinstalar
   ```

### El comando `vt help` no funciona

**Solución**:
1. Verifica que la extensión está habilitada: **Extensiones** → VSCTracker → **Enable**
2. Recarga la ventana: **Ctrl+Shift+P** → `Developer: Reload Window`
3. Abre la **Paleta de Comandos** y escribe `vt help` (con espacios)

### Los datos no se guardando

**Solución**:
1. Verifica permisos: El directorio `globalStorage` debe ser escribible
2. En Windows: `%APPDATA%\Code\User\globalStorage\vsctracker\`
3. En macOS: `~/Library/Application Support/Code/User/globalStorage/vsctracker/`
4. En Linux: `~/.config/Code/User/globalStorage/vsctracker/`

### Firebase no conecta

**Solución**:
1. Verifica que las variables de entorno estén establecidas:
   ```powershell
   $env:FIREBASE_API_KEY      # Debería mostrar tu API key
   $env:FIREBASE_DATABASE_URL # Debería mostrar tu URL
   ```
2. Si falta algo, configúralas nuevamente y recarga VS Code
3. Ejecuta `vt status` para ver el estado de conexión

### Los backups no se generan

**Solución**:
1. Configura un directorio de backups:
   ```
   Paleta de Comandos → vt set-backup-dir
   ```
2. Especifica una ruta absoluta que exista o que VS Code pueda crear
3. Verifica permisos de escritura en esa carpeta

---

## 🔄 Actualizar VSCTracker

### Desde la tienda de VS Code

1. Ve a **Extensiones**
2. Busca **VSCTracker**
3. Si hay actualización disponible, verás un botón **"Actualizar"**
4. Haz clic y espera a que se reinicie

### Desde `.vsix` (Local)

1. Descarga el nuevo archivo `.vsix` o genera uno:
   ```bash
   git pull origin master  # Obtén el código más reciente
   npm run compile
   npx vsce package       # Genera nuevo .vsix
   ```

2. Desinstala la versión actual:
   ```bash
   code --uninstall-extension capria-franco.vsctracker
   ```

3. Instala la nueva versión:
   ```bash
   code --install-extension ./vsctracker-x.x.x.vsix
   ```

---

## 🗑️ Desinstalar VSCTracker

### Opción 1: Desde VS Code

1. Ve a **Extensiones**
2. Busca **VSCTracker**
3. Haz clic en los **tres puntos** del lado derecho
4. Selecciona **Desinstalar**

### Opción 2: Desde terminal

```bash
code --uninstall-extension capria-franco.vsctracker
```

### Limpiar datos

VSCTracker almacena datos en:
- Windows: `%APPDATA%\Code\User\globalStorage\vsctracker\`
- macOS: `~/Library/Application Support/Code/User/globalStorage/vsctracker/`
- Linux: `~/.config/Code/User/globalStorage/vsctracker/`

Para eliminar todos los datos:
1. Desinstala la extensión
2. Elimina manualmente el directorio anterior
3. Vaciá la papelera

---

## 📚 Recursos adicionales

- **Documentación completa**: Ver [README.md](README.md) (español) o [README.en.md](README.en.md) (inglés)
- **Guía de contribución**: Ver [CONTRIBUTING.md](CONTRIBUTING.md)
- **Arquitectura**: Ver [ARCHITECTURE.md](ARCHITECTURE.md)
- **Seguridad**: Ver [SECURITY.md](SECURITY.md)
- **Cambios**: Ver [CHANGELOG.md](CHANGELOG.md)

---

## 📞 Soporte

Si tienes problemas:

1. **Revisa la documentación**: [README.md](README.md)
2. **Busca en Issues**: [GitHub Issues](https://github.com/CapriaFranco/VSCTracker/issues)
3. **Abre un nuevo Issue**: Describe tu problema con detalles
4. **Participa en Discusiones**: [GitHub Discussions](https://github.com/CapriaFranco/VSCTracker/discussions)

---

**Última actualización**: 9 de diciembre de 2025  
**Versión**: 1.2.1
