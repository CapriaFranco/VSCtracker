
# VSCTracker - VSCode Extension

![Version](https://img.shields.io/badge/version-1.0.0-yellow.svg)
[![License](https://img.shields.io/badge/license-MIT-darkred.svg)](LICENCE)
![VSCode](https://img.shields.io/badge/VSCode-1.96+-blue.svg)

> **English version** [here](readme.en.md)

## Descripción

**VSCTracker** es una extensión para Visual Studio Code que permite rastrear el tiempo total que un usuario pasa programando dentro del editor. Utiliza Firebase para sincronizar el tiempo entre diferentes dispositivos y almacena los datos localmente en caso de que no haya conexión a Internet.

## Requisitos previos

- Node.js (versión 12 o superior)
- Visual Studio Code (versión 1.96 o superior)
- Una cuenta de Firebase

## Características

- **Rastreo de tiempo**: Mide el tiempo que estás programando en VSCode.
- **Sincronización**: Guarda y sincroniza el tiempo con Firebase.
- **Almacenamiento local**: Guarda el tiempo localmente para un uso fuera de línea.
- **Barra de estado personalizada**: Muestra el tiempo total programando en la barra de estado de VSCode.
- **Configuración fácil**: Configura Firebase a través de un archivo `.env`.

## Instalación

### 1. Clonar el repositorio

Para comenzar, clona el repositorio con el siguiente comando:

```bash
git clone https://github.com/tu-usuario/vsctracker.git
cd vsctracker
```

### 2. Instalar dependencias

Asegúrate de tener **Node.js** instalado. Luego, ejecuta el siguiente comando para instalar las dependencias necesarias:

```bash
npm install
```

### 3. Configuración de Firebase

La extensión utiliza **Firebase** para sincronizar el tiempo de programación entre dispositivos. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/) y configura tu proyecto.

#### Variables de entorno

En la raíz de tu proyecto, crea un archivo `.env` con las siguientes variables. Estas credenciales las obtendrás desde tu proyecto de Firebase:

```env
FIREBASE_API_KEY=tu-api-key
FIREBASE_AUTH_DOMAIN=tu-auth-domain
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_STORAGE_BUCKET=tu-storage-bucket
FIREBASE_MESSAGING_SENDER_ID=tu-messaging-sender-id
FIREBASE_APP_ID=tu-app-id
FIREBASE_MEASUREMENT_ID=tu-measurement-id
```

## Uso

### 1. Activar la extensión

Una vez que la extensión esté instalada, comenzará a rastrear automáticamente el tiempo que pasas programando en VSCode. El tiempo total se mostrará en la barra de estado.

### 2. Ver el tiempo total

Para ver el tiempo total transcurrido programando, puedes ejecutar el siguiente comando en la paleta de comandos de VSCode:

```bash
VSCtracker.showTime
```

### 3. Sincronización con Firebase

La extensión sincroniza el tiempo con Firebase cada vez que se actualiza. Si no hay conexión a Internet, se guarda localmente en tu dispositivo.

## Estructura del código

### **Archivo `extension.ts`**

Este archivo contiene la lógica principal para inicializar Firebase, rastrear el tiempo, y manejar la sincronización:

```typescript
// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Tiempo de codificación
let codingTimeInSeconds: number = 0;
let lastSavedTimeInSeconds: number = -1;

// Cargar el tiempo desde Firebase o almacenamiento local
loadCodingTime().then(() => {
    updateStatusBar();
});
```

### **Archivo `.env`**

Las credenciales de Firebase necesarias para la conexión están en este archivo:

```env
FIREBASE_API_KEY=tu-api-key
FIREBASE_AUTH_DOMAIN=tu-auth-domain
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_STORAGE_BUCKET=tu-storage-bucket
FIREBASE_MESSAGING_SENDER_ID=tu-messaging-sender-id
FIREBASE_APP_ID=tu-app-id
FIREBASE_MEASUREMENT_ID=tu-measurement-id
```

### **Función `saveAndSyncCodingTime()`**

Esta función guarda el tiempo de codificación y lo sincroniza con Firebase:

```typescript
function saveAndSyncCodingTime(): void {
    // Guardar localmente
    fs.writeFileSync(localStoragePath, JSON.stringify({ timeInSeconds: codingTimeInSeconds }));

    // Sincronizar con Firebase
    set(ref(database, 'codingTime'), { timeInSeconds: codingTimeInSeconds })
        .catch(error => console.error('Error al sincronizar con Firebase:', error));
}
```

## Contribución

Si deseas contribuir a este proyecto, sigue estos pasos:

1. Haz un fork del proyecto.
2. Crea una nueva rama (`git checkout -b feature/nueva-funcionalidad`).
3. Realiza tus cambios y haz un commit (`git commit -am 'Añadir nueva funcionalidad'`).
4. Empuja tus cambios (`git push origin feature/nueva-funcionalidad`).
5. Abre un Pull Request en GitHub.

## Licencia

Este proyecto está bajo la licencia **MIT**. Para más detalles, revisa el archivo `LICENSE`.

## Recursos

- [Documentación de Firebase](https://firebase.google.com/docs)
- [Guía para crear un archivo .env](https://www.npmjs.com/package/dotenv)
