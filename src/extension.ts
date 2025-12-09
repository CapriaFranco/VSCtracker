import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Firebase imports are kept but initialization is optional (configurable by env/settings)
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

type FileEntry = { language: string; ms: number };
type LocalStore = {
    files: { [filePath: string]: FileEntry };
    languages: { [language: string]: number };
    frameworks: { [framework: string]: number };
    updatedAt: number;
};

let statusBarItem: vscode.StatusBarItem | undefined;
let localStorageFile: string;
let store: LocalStore = { files: {}, languages: {}, frameworks: {}, updatedAt: Date.now() };
let isSynced: boolean = false;
let workspaceRoot: string | undefined;
const outputChannel = vscode.window.createOutputChannel('VSCTracker');

// Tracking runtime state
let currentFilePath: string | null = null;
let lastTick = Date.now();
let tickInterval: ReturnType<typeof setInterval> | undefined;
let remoteSyncInterval: ReturnType<typeof setInterval> | undefined;
let firebaseDatabase: any = null;

function safeNumber(n: any) { return typeof n === 'number' && !isNaN(n) ? n : 0; }

async function tryInitFirebase(): Promise<void> {
    // Intentamos inicializar Firebase sólo si la variable de entorno FIREBASE_API_KEY está presente
    try {
        const apiKey = process.env.FIREBASE_API_KEY;
        const dbUrl = process.env.FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASEURL;
        if (!apiKey || !dbUrl) {
            return;
        }

        const firebaseConfig = {
            apiKey,
            databaseURL: dbUrl
        } as any;

        const app = initializeApp(firebaseConfig);
        firebaseDatabase = getDatabase(app);
    } catch (err) {
        console.warn('Firebase no inicializado (falla silenciosa):', err);
        firebaseDatabase = null;
    }
}

async function fetchRemoteLanguages(): Promise<{ [lang: string]: number } | null> {
    if (!firebaseDatabase) {
        return null;
    }
    try {
        const snap = await get(ref(firebaseDatabase, 'vscTracker/languages'));
        const data = snap.val();
        if (!data) {
            return null;
        }
        const { updatedAt, ...langs } = data;
        return langs as { [lang: string]: number };
    } catch (err) {
        console.error('Error fetchRemoteLanguages:', err);
        return null;
    }
}

async function pushLanguagesToRemote(languages: { [lang: string]: number } | null): Promise<void> {
    if (!firebaseDatabase || !languages) {
        return;
    }
    try {
        const rootRef = ref(firebaseDatabase, 'vscTracker/languages');
        const payload = { ...languages, updatedAt: Date.now() } as any;
        await set(rootRef, payload);
    } catch (err) {
        console.error('Error pushLanguagesToRemote:', err);
    }
}

function ensureStorageDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function loadLocalStore(): void {
    try {
        if (fs.existsSync(localStorageFile)) {
            const raw = fs.readFileSync(localStorageFile, 'utf8');
            const parsed = JSON.parse(raw);
            store = {
                files: parsed.files || {},
                languages: parsed.languages || {},
                frameworks: parsed.frameworks || {},
                updatedAt: parsed.updatedAt || Date.now()
            };
        }
    } catch (err) {
        console.error('Error leyendo storage local:', err);
        store = { files: {}, languages: {}, frameworks: {}, updatedAt: Date.now() };
    }
}

function saveLocalStore(): void {
    try {
        store.updatedAt = Date.now();
        fs.writeFileSync(localStorageFile, JSON.stringify(store, null, 2));
    } catch (err) {
        console.error('Error guardando storage local:', err);
    }
}

function ensureWorkspaceRoot(context: vscode.ExtensionContext) {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    } else {
        // fallback to extension folder parent
        workspaceRoot = path.dirname(context.extensionPath || process.cwd());
    }
}

async function generateBackup(): Promise<string | null> {
    try {
        if (!workspaceRoot) { return null; }
        const backupsDir = path.join(workspaceRoot, 'backups');
        ensureStorageDir(backupsDir);
        const ts = new Date();
        const name = `backup-${ts.toISOString().replace(/[:.]/g, '-')}.json`;
        const filePath = path.join(backupsDir, name);
        const payload = { generatedAt: ts.toISOString(), isSynced, store };
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
        outputChannel.appendLine(`Backup generado: ${filePath}`);
        return filePath;
    } catch (err) {
        console.error('Error generando backup:', err);
        return null;
    }
}

async function reconcileWithRemote(): Promise<boolean> {
    try {
        const remoteLangs = await fetchRemoteLanguages();

        // Si no hay remoto, subimos las lenguajes locales
        if (!remoteLangs) {
            await pushLanguagesToRemote(store.languages);
            await generateBackup();
            return true;
        }

        const updatesToRemote: { [lang: string]: number } = {};

        const allLangs = new Set([...Object.keys(store.languages), ...Object.keys(remoteLangs || {})]);
        for (const lang of allLangs) {
            const localVal = safeNumber(store.languages[lang]);
            const remoteVal = safeNumber(remoteLangs[lang]);

            if (localVal >= remoteVal) {
                if (localVal > remoteVal) {
                    updatesToRemote[lang] = localVal;
                }
            } else {
                // remote tiene más -> sumamos al local
                store.languages[lang] = localVal + remoteVal;
            }
        }

        // Guardamos local siempre luego del reconcile
        saveLocalStore();

        if (Object.keys(updatesToRemote).length > 0) {
            await pushLanguagesToRemote({ ...remoteLangs, ...updatesToRemote });
        }

        // Generar backup local tras un reconcile exitoso
        await generateBackup();

        return true;
    } catch (err) {
        console.error('Error en reconcileWithRemote:', err);
        return false;
    }
}

function getActiveEditorFile(): { path: string | null; language: string | null } {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return { path: null, language: null };
    }
    const doc = editor.document;
    return { path: doc.uri.fsPath, language: doc.languageId };
}

function tickAdd(ms: number) {
    if (!currentFilePath) {
        return;
    }
    const langFromEditor = getActiveEditorFile().language || 'unknown';
    const lang = store.files[currentFilePath]?.language || langFromEditor;
    if (!store.files[currentFilePath]) {
        store.files[currentFilePath] = { language: lang, ms: 0 };
    }
    store.files[currentFilePath].ms += ms;
    // add to language total
    store.languages[lang] = (store.languages[lang] || 0) + ms;

    // Framework detection: .tsx -> typescript + react framework
    const ext = path.extname(currentFilePath).toLowerCase();
    if (ext === '.tsx') {
        // add React framework
        store.frameworks['react'] = (store.frameworks['react'] || 0) + ms;
        // ensure typescript already counted via language
    }
}

function startTicker() {
    lastTick = Date.now();
    tickInterval = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTick;
        lastTick = now;

        const winState = vscode.window.state;
        if (!winState.focused) {
            // ventana sin foco -> no contamos
            return;
        }

        const active = getActiveEditorFile();
        if (!active.path) {
            return;
        }
        currentFilePath = active.path;
        tickAdd(delta);
    }, 1000);
}

function stopTicker() {
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = undefined;
    }
}

function formatMs(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s${days > 0 ? ` (${days}d)` : ''}`;
}

export async function activate(context: vscode.ExtensionContext) {
    // Preparar storage
    localStorageFile = path.join(context.globalStoragePath, 'localCodingStore.json');
    ensureStorageDir(context.globalStoragePath);
    loadLocalStore();
    ensureWorkspaceRoot(context);

    // Intentamos inicializar Firebase (si está configurado por env)
    await tryInitFirebase();

    // Reconciliación con remoto (si disponible)
    isSynced = await reconcileWithRemote();

    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    const statusText = isSynced ? 'VSCTracker: Active' : 'VSCTracker: Inactive';
    statusBarItem.text = `${isSynced ? '✅' : '⚠️'} ${statusText}`;
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Comandos VT (help, save, status, show-local, show-remote, pull)
    function appendOutput(lines: string | string[]) {
        const text = Array.isArray(lines) ? lines.join('\n') : String(lines);
        outputChannel.appendLine(text);
        outputChannel.show(true);
    }

    function showHelp() {
        const help = [
            'vt help - muestra esta ayuda',
            'vt status - comprueba conexión con la DB remota',
            'vt save - guarda datos locales en la DB (reconcile)',
            'vt show-local - muestra datos locales por lenguaje',
            'vt show-remote - muestra datos en la DB remota (por lenguaje)',
            'vt pull - carga datos de la DB en local (se SUMAN a local)'
        ];
        appendOutput(['VSCTracker Help:', ...help]);
    }

    async function cmdStatus() {
        if (!firebaseDatabase) {
            vscode.window.showInformationMessage('VSCTracker: No hay configuración de Firebase (variables de entorno faltantes)');
            return;
        }
        const remote = await fetchRemoteLanguages();
        if (!remote) {
            vscode.window.showInformationMessage('VSCTracker: Conexión a DB OK, pero no hay datos remotos.');
            return;
        }
        const keys = Object.keys(remote);
        vscode.window.showInformationMessage(`VSCTracker: Conectado. Lenguajes remotos: ${keys.length}`);
        appendOutput(['Remote languages:', ...keys.map(k => `${k}: ${formatMs(remote[k])}`)]);
    }

    async function cmdSave() {
        if (!firebaseDatabase) {
            vscode.window.showErrorMessage('VSCTracker: Firebase no está configurado. No se puede guardar.');
            return;
        }
        const ok = await reconcileWithRemote();
        if (ok) {
            vscode.window.showInformationMessage('VSCTracker: Datos locales sincronizados con DB correctamente.');
        } else {
            vscode.window.showErrorMessage('VSCTracker: Error al sincronizar con la DB. Revisa la salida.');
        }
    }

    function cmdShowLocal() {
        const langs = Object.keys(store.languages || {});
        if (langs.length === 0) {
            vscode.window.showInformationMessage('VSCTracker: No hay datos locales.');
            return;
        }
        appendOutput(['Local languages:', ...langs.map(l => `${l}: ${formatMs(store.languages[l])}`)]);
    }

    async function cmdShowRemote() {
        if (!firebaseDatabase) {
            vscode.window.showErrorMessage('VSCTracker: Firebase no está configurado.');
            return;
        }
        const remote = await fetchRemoteLanguages();
        if (!remote) {
            vscode.window.showInformationMessage('VSCTracker: No hay datos remotos.');
            return;
        }
        appendOutput(['Remote languages:', ...Object.keys(remote).map(k => `${k}: ${formatMs(remote[k])}`)]);
    }

    async function cmdList() {
        const langs = Object.keys(store.languages || {}).map(l => `${l}: ${formatMs(store.languages[l])}`);
        const frameworks = Object.keys(store.frameworks || {}).map(f => `${f}: ${formatMs(store.frameworks[f])}`);
        appendOutput(['Detected languages (local):', ...langs, '', 'Detected frameworks (local):', ...frameworks]);
    }

    async function cmdBackup() {
        const file = await generateBackup();
        if (file) {
            vscode.window.showInformationMessage(`VSCTracker: Backup generado en ${file}`);
        } else {
            vscode.window.showErrorMessage('VSCTracker: Error generando backup. Revisa salida.');
        }
    }

    async function cmdPull() {
        if (!firebaseDatabase) {
            vscode.window.showErrorMessage('VSCTracker: Firebase no está configurado.');
            return;
        }
        const remote = await fetchRemoteLanguages();
        if (!remote) {
            vscode.window.showInformationMessage('VSCTracker: No hay datos remotos para descargar.');
            return;
        }
        // Sumamos los valores remotos a los locales
        for (const lang of Object.keys(remote)) {
            store.languages[lang] = (store.languages[lang] || 0) + safeNumber(remote[lang]);
        }
        saveLocalStore();
        vscode.window.showInformationMessage('VSCTracker: Datos remotos importados y sumados a local.');
        appendOutput(['After pull - local languages:', ...Object.keys(store.languages).map(l => `${l}: ${formatMs(store.languages[l])}`)]);
    }

    // Registro de comandos individuales
    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.vt.help', () => showHelp()));
    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.vt.status', () => cmdStatus()));
    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.vt.save', () => cmdSave()));
    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.vt.showLocal', () => cmdShowLocal()));
    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.vt.showRemote', () => cmdShowRemote()));
    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.vt.pull', () => cmdPull()));
    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.vt.list', () => cmdList()));
    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.vt.backup', () => cmdBackup()));

    // Comando único 'vt' que acepta entrada o abre help
    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.vt', async (arg) => {
        let input: string | undefined;
        if (typeof arg === 'string') {
            input = arg;
        } else {
            input = await vscode.window.showInputBox({ prompt: 'vt command (help, status, save, show-local, show-remote, pull)' });
        }
        if (!input) {
            showHelp();
            return;
        }
        const parts = input.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        switch (cmd) {
            case 'help':
                showHelp();
                break;
            case 'status':
                await cmdStatus();
                break;
            case 'save':
                await cmdSave();
                break;
            case 'show-local':
            case 'show_local':
            case 'showlocal':
                cmdShowLocal();
                break;
            case 'show-remote':
            case 'showremote':
                await cmdShowRemote();
                break;
            case 'pull':
                await cmdPull();
                break;
            case 'list':
            case 'detected':
                await cmdList();
                break;
            case 'backup':
                await cmdBackup();
                break;
            default:
                showHelp();
                break;
        }
    }));

    // Terminal interaction counting (approximate): add fixed ms per terminal data event
    const TERMINAL_INTERACTION_MS = 5000;
    if ((vscode.window as any).onDidWriteTerminalData) {
        // `onDidWriteTerminalData` is available in newer APIs
        context.subscriptions.push((vscode.window as any).onDidWriteTerminalData((e: any) => {
            // increment terminal language/framework
            store.languages['terminal'] = (store.languages['terminal'] || 0) + TERMINAL_INTERACTION_MS;
            store.frameworks['terminal'] = (store.frameworks['terminal'] || 0) + TERMINAL_INTERACTION_MS;
            saveLocalStore();
        }));
    }

    // Comandos
    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.showTotalTime', () => {
        vscode.window.showInformationMessage(`Tiempo total: ${formatMs(totalMs())}`);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.showByLanguage', () => {
        const langs = Object.keys(store.languages).map(l => `${l}: ${formatMs(store.languages[l])}`);
        vscode.window.showInformationMessage(langs.join(' | ') || 'Sin datos');
    }));

    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.showFileStats', () => {
        const files = Object.keys(store.files).slice(0, 20).map(f => `${path.basename(f)} (${store.files[f].language}): ${formatMs(store.files[f].ms)}`);
        vscode.window.showInformationMessage(files.join(' | ') || 'Sin datos');
    }));

    // Eventos
    context.subscriptions.push(vscode.window.onDidChangeWindowState((e) => {
        if (!e.focused) {
            return; // al recuperar foco no hacemos nada especial
        }
    }));

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
        // cambio de archivo activo: actualizamos currentFilePath para el ticker
        const info = getActiveEditorFile();
        currentFilePath = info.path;
        if (currentFilePath && info.language) {
            if (!store.files[currentFilePath]) {
                store.files[currentFilePath] = { language: info.language, ms: 0 };
            }
        }
        // Actualizamos statusbar (indicador de sincronización)
        if (statusBarItem) {
            const statusNow = isSynced ? 'VSCTracker: Active' : 'VSCTracker: Inactive';
            statusBarItem.text = `${isSynced ? '✅' : '⚠️'} ${statusNow}`;
        }
    }));

    // Guardado periódico
    const saveInterval: ReturnType<typeof setInterval> = setInterval(async () => {
        saveLocalStore();
        if (!isSynced && firebaseDatabase) {
            try {
                isSynced = await reconcileWithRemote();
            } catch (e) {
                isSynced = false;
            }
        }
        if (statusBarItem) {
            const statusNow = isSynced ? 'VSCTracker: Active' : 'VSCTracker: Inactive';
            statusBarItem.text = `${isSynced ? '✅' : '⚠️'} ${statusNow}`;
        }
    }, 60 * 1000);

    context.subscriptions.push({ dispose: () => clearInterval(saveInterval) });

    // Iniciar ticker
    startTicker();

    // Iniciar sincronización remota periódica cada 3 horas
    remoteSyncInterval = setInterval(async () => {
        if (!firebaseDatabase) {
            return;
        }
        try {
            const result = await reconcileWithRemote();
            isSynced = !!result;
            if (statusBarItem) {
                const statusNow = isSynced ? 'VSCTracker: Active' : 'VSCTracker: Inactive';
                statusBarItem.text = `${isSynced ? '✅' : '⚠️'} ${statusNow}`;
            }
        } catch (err) {
            isSynced = false;
        }
    }, 3 * 60 * 60 * 1000); // 3 horas

    context.subscriptions.push({ dispose: () => clearInterval(remoteSyncInterval) });

    // On deactivate
    context.subscriptions.push({ dispose: () => {
        stopTicker();
        saveLocalStore();
    }});
}

function totalMs(): number {
    return Object.values(store.languages || {}).reduce((a, b) => a + (b || 0), 0);
}

export function deactivate() {
    stopTicker();
    saveLocalStore();
}
