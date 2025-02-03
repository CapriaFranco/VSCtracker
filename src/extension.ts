import * as vscode from 'vscode';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY!,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.FIREBASE_PROJECT_ID!,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.FIREBASE_APP_ID!,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID!,
    databaseURL: process.env.FIREBASE_DATABASE_URL!,
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

interface CodingTime {
    timeInSeconds: number;
}

let codingTimeInSeconds: number = 0;
let lastSavedTimeInSeconds: number = -1;
let isVSCodeActive: boolean = true;
let statusBarItem: vscode.StatusBarItem;
let localStoragePath: string;

export function activate(context: vscode.ExtensionContext) {
    const timeRef = ref(database, 'codingTime');
    localStoragePath = path.join(context.globalStoragePath, 'localCodingTime.json');

    // Cargar tiempo desde almacenamiento local y Firebase
    loadCodingTime().then(() => {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        updateStatusBar();
        statusBarItem.show();

        const interval = setInterval(() => {
            if (isVSCodeActive) {
                codingTimeInSeconds++;
                updateStatusBar();

                if (codingTimeInSeconds - lastSavedTimeInSeconds >= 60) {
                    saveAndSyncCodingTime();
                    lastSavedTimeInSeconds = codingTimeInSeconds;
                }
            }
        }, 1000);

        // Detectar cuando VSCode está en segundo plano
        vscode.window.onDidChangeWindowState((e) => {
            isVSCodeActive = e.focused;
        });

        context.subscriptions.push({
            dispose: () => {
                clearInterval(interval);
                saveAndSyncCodingTime();
            },
        });

        let showTimeCommand = vscode.commands.registerCommand('VSCtracker.showTime', () => {
            vscode.window.showInformationMessage(`Tiempo total programando: ${formatTime(codingTimeInSeconds)}`);
        });

        context.subscriptions.push(showTimeCommand);
    }).catch(error => {
        console.error('Error al cargar el tiempo:', error);
    });
}

async function loadCodingTime(): Promise<void> {
    try {
        // Cargar desde almacenamiento local
        if (fs.existsSync(localStoragePath)) {
            const localData = JSON.parse(fs.readFileSync(localStoragePath, 'utf8'));
            codingTimeInSeconds = localData.timeInSeconds;
        }

        // Intentar cargar desde Firebase
        const snapshot = await get(ref(database, 'codingTime'));
        const savedTime: CodingTime | null = snapshot.val();
        if (savedTime && savedTime.timeInSeconds !== undefined) {
            // Usar el tiempo más grande entre local y Firebase
            codingTimeInSeconds = Math.max(codingTimeInSeconds, savedTime.timeInSeconds);
        }
    } catch (error) {
        console.error('Error al cargar el tiempo:', error);
    }
}

function saveAndSyncCodingTime(): void {
    // Guardar localmente
    fs.writeFileSync(localStoragePath, JSON.stringify({ timeInSeconds: codingTimeInSeconds }));

    // Intentar sincronizar con Firebase
    set(ref(database, 'codingTime'), { timeInSeconds: codingTimeInSeconds })
        .catch(error => console.error('Error al sincronizar con Firebase:', error));
}

function updateStatusBar(): void {
    statusBarItem.text = `🕒 ${formatTime(codingTimeInSeconds)}`;
}

function formatTime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s${days > 0 ? ` (${days}d)` : ''}`;
}

export function deactivate() {
    saveAndSyncCodingTime();
}
