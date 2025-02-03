# VSCTracker - VSCode Extension

![Version](https://img.shields.io/badge/version-1.0.0-yellow.svg)
[![License](https://img.shields.io/badge/license-MIT-darkred.svg)](LICENCE)
![VSCode](https://img.shields.io/badge/VSCode-1.96+-blue.svg)

> **Versión en español** [aqui](readme.md)

## Description

**VSCTracker** is a Visual Studio Code extension that allows users to track the total time spent programming inside the editor. It uses Firebase to sync time across different devices and stores data locally in case there is no internet connection.

## Prerequisites

- Node.js (version 12 or higher)
- Visual Studio Code (version 1.96 or higher)
- A Firebase account

## Features

- **Time Tracking**: Measures the time spent programming in VSCode.
- **Synchronization**: Saves and syncs time with Firebase.
- **Local Storage**: Stores time locally for offline use.
- **Custom Status Bar**: Displays total programming time in the VSCode status bar.
- **Easy Configuration**: Set up Firebase through a `.env` file.

## Installation

### 1. Clone the repository

To get started, clone the repository with the following command:

```bash
git clone https://github.com/your-username/vsctracker.git
cd vsctracker
```

### 2. Install dependencies

Make sure you have **Node.js** installed. Then, run the following command to install the necessary dependencies:

```bash
npm install
```

### 3. Firebase Setup

The extension uses **Firebase** to sync programming time across devices. Create a project in [Firebase Console](https://console.firebase.google.com/) and set up your project.

#### Environment Variables

In the root of your project, create a `.env` file with the following variables. You will obtain these credentials from your Firebase project:

```env
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-auth-domain
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-storage-bucket
FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=your-measurement-id
```

## Usage

### 1. Activate the Extension

Once the extension is installed, it will automatically start tracking the time you spend programming in VSCode. The total time will be displayed in the status bar.

### 2. View Total Time

To check the total time spent programming, you can run the following command in the VSCode command palette:

```bash
VSCtracker.showTime
```

### 3. Firebase Synchronization

The extension syncs time with Firebase whenever an update occurs. If there is no internet connection, the time is stored locally on your device.

## Code Structure

### **File `extension.ts`**

This file contains the main logic for initializing Firebase, tracking time, and handling synchronization:

```typescript
// Firebase Initialization
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Coding Time
let codingTimeInSeconds: number = 0;
let lastSavedTimeInSeconds: number = -1;

// Load time from Firebase or local storage
loadCodingTime().then(() => {
    updateStatusBar();
});
```

### **File `.env`**

The necessary Firebase credentials for the connection are stored in this file:

```env
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-auth-domain
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-storage-bucket
FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### **Function `saveAndSyncCodingTime()`**

This function saves the coding time and syncs it with Firebase:

```typescript
function saveAndSyncCodingTime(): void {
    // Save locally
    fs.writeFileSync(localStoragePath, JSON.stringify({ timeInSeconds: codingTimeInSeconds }));

    // Sync with Firebase
    set(ref(database, 'codingTime'), { timeInSeconds: codingTimeInSeconds })
        .catch(error => console.error('Error syncing with Firebase:', error));
}
```

## Contribution

If you want to contribute to this project, follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/new-feature`).
3. Make your changes and commit (`git commit -am 'Add new feature'`).
4. Push your changes (`git push origin feature/new-feature`).
5. Open a Pull Request on GitHub.

## License

This project is licensed under the **MIT** license. For more details, check the `LICENSE` file.

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Guide to Creating a .env File](https://www.npmjs.com/package/dotenv)

