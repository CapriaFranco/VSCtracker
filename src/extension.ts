import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
let activeWorkspaceRoot: string | undefined;
const outputChannel = vscode.window.createOutputChannel('VSCTracker');

// Tracking runtime state
let currentFilePath: string | null = null;
let lastTick = Date.now();
let tickInterval: ReturnType<typeof setInterval> | undefined;
let remoteSyncInterval: ReturnType<typeof setInterval> | undefined;
let firebaseDatabase: any = null;
let lastFocus: 'editor' | 'terminal' | 'other' = 'other';
let backupsRoot: string | null = null;

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
        console.error('Firebase no inicializado:', err);
        vscode.window.showErrorMessage('VSCTracker: Error inicializando Firebase. Revisa la salida.');
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
        vscode.window.showErrorMessage('VSCTracker: Error leyendo datos remotos. Revisa la salida.');
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
        vscode.window.showErrorMessage('VSCTracker: Error subiendo datos remotos. Revisa la salida.');
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
        // default workspace root is the first, active workspace will be set later
        workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        activeWorkspaceRoot = workspaceRoot;
    } else {
        // fallback to extension folder parent
        workspaceRoot = path.dirname(context.extensionPath || process.cwd());
        activeWorkspaceRoot = workspaceRoot;
    }
}

function getWorkspaceForPath(filePath: string | null): string | undefined {
    if (!filePath) { return activeWorkspaceRoot || workspaceRoot; }
    const folders = vscode.workspace.workspaceFolders || [];
    for (const f of folders) {
        const fsPath = f.uri.fsPath;
        if (filePath.startsWith(fsPath)) { return fsPath; }
    }
    return activeWorkspaceRoot || workspaceRoot;
}

async function detectFrameworksInWorkspace(): Promise<string[]> {
    const detected: string[] = [];
    try {
        if (!workspaceRoot) { return detected; }
        const pkgPath = path.join(workspaceRoot, 'package.json');
        if (!fs.existsSync(pkgPath)) { return detected; }
        const raw = fs.readFileSync(pkgPath, 'utf8');
        const pkg = JSON.parse(raw || '{}');
        const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {}, pkg.peerDependencies || {});

        // Map of package keys -> framework name
        const mapping: { keys: string[]; name: string }[] = [
            { keys: ['react', 'react-dom', 'next'], name: 'React' },
            { keys: ['vue', '@vue/runtime-dom', 'nuxt'], name: 'Vue' },
            { keys: ['@angular/core', '@angular/common'], name: 'Angular' },
            { keys: ['svelte'], name: 'Svelte' },
            { keys: ['ember-source', 'ember'], name: 'Ember' },
            { keys: ['backbone'], name: 'Backbone' },
            { keys: ['next'], name: 'Next.js' },
            { keys: ['nuxt'], name: 'Nuxt.js' },
            { keys: ['bootstrap'], name: 'Bootstrap' },
            { keys: ['tailwindcss'], name: 'Tailwind CSS' },
            { keys: ['express'], name: 'Express.js' },
            { keys: ['@nestjs/core', 'nestjs'], name: 'NestJS' },
            { keys: ['hapi', '@hapi/hapi'], name: 'Hapi.js' },
            { keys: ['meteor-node-stubs', 'meteor-base'], name: 'Meteor' },
            { keys: ['@adonisjs/core'], name: 'AdonisJS' },
            { keys: ['deno'], name: 'Deno' },
            { keys: ['node'], name: 'Node.js' }
        ];

        for (const m of mapping) {
            for (const k of m.keys) {
                    if (deps[k]) { 
                        if (!detected.includes(m.name)) { 
                            detected.push(m.name); 
                        } 
                }
            }
        }
        // Additional non-NPM detections by scanning common files
        // Python: requirements.txt, pyproject.toml
        const reqPath = path.join(workspaceRoot, 'requirements.txt');
        if (fs.existsSync(reqPath)) {
            const req = fs.readFileSync(reqPath, 'utf8');
            if (/django/i.test(req)) {
                detected.push('Django');
            }
            if (/flask/i.test(req)) {
                detected.push('Flask');
            }
        }
        const pyproject = path.join(workspaceRoot, 'pyproject.toml');
        if (fs.existsSync(pyproject)) {
            const p = fs.readFileSync(pyproject, 'utf8');
            if (/django/i.test(p)) {
                detected.push('Django');
            }
            if (/flask/i.test(p)) {
                detected.push('Flask');
            }
        }

        // PHP: composer.json -> laravel/framework
        const composer = path.join(workspaceRoot, 'composer.json');
        if (fs.existsSync(composer)) {
            try {
                const comp = JSON.parse(fs.readFileSync(composer, 'utf8') || '{}');
                const compDeps = Object.assign({}, comp.require || {}, comp['require-dev'] || {});
                if (compDeps['laravel/framework'] || compDeps['laravel/laravel']) {
                    detected.push('Laravel');
                }
            } catch (e) { /* ignore */ }
        }

        // Ruby: Gemfile -> rails
        const gemfile = path.join(workspaceRoot, 'Gemfile');
        if (fs.existsSync(gemfile)) {
            const g = fs.readFileSync(gemfile, 'utf8');
            if (/rails/i.test(g)) {
                detected.push('Ruby on Rails');
            }
        }

        // Java: pom.xml or build.gradle -> spring-boot
        const pom = path.join(workspaceRoot, 'pom.xml');
        if (fs.existsSync(pom)) {
            const pcont = fs.readFileSync(pom, 'utf8');
            if (/spring-boot/i.test(pcont) || /org.springframework.boot/i.test(pcont)) {
                detected.push('Spring Boot');
            }
        }
        const gradle = path.join(workspaceRoot, 'build.gradle');
        if (fs.existsSync(gradle)) {
            const gcont = fs.readFileSync(gradle, 'utf8');
            if (/spring-boot/i.test(gcont) || /org.springframework.boot/i.test(gcont)) {
                detected.push('Spring Boot');
            }
        }

        // Deno
        const denoConfig = path.join(workspaceRoot, 'deno.json');
        const depsTs = path.join(workspaceRoot, 'deps.ts');
        if (fs.existsSync(denoConfig) || fs.existsSync(depsTs)) {
            detected.push('Deno');
        }

        // ASP.NET Core: look for .csproj files
        const files = fs.readdirSync(workspaceRoot);
        if (files.some(f => f.endsWith('.csproj'))) {
            detected.push('ASP.NET Core');
        }

        // Avoid duplicates
        const unique = Array.from(new Set(detected));
        return unique;
    } catch (err) {
        console.warn('detectFrameworksInWorkspace error:', err);
    }
    return detected;
}

async function generateBackup(): Promise<string | null> {
    try {
        if (!workspaceRoot && !backupsRoot) { return null; }
        const backupsDir = backupsRoot || path.join(workspaceRoot || process.cwd(), 'backups');
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
    // Framework attribution: when we have detected frameworks for the active workspace,
    // attribute the ms to any matching frameworks. This avoids relying on extensions.
    const ws = getWorkspaceForPath(currentFilePath);
    if (ws) {
        // simple mapping: if detectFrameworksInWorkspace includes framework X, add ms
        // We'll not synchronously scan the workspace here; use the cached store.frameworks keys
        for (const fw of Object.keys(store.frameworks || {})) {
            // do a lightweight check: if fw appears in store.frameworks keys (detected earlier), attribute
            if (fw && fw !== 'terminal') {
                // conservative attribution: add only a small portion to frameworks to avoid double counting
                // here we attribute the same ms so frameworks reflect real activity
                store.frameworks[fw] = (store.frameworks[fw] || 0) + ms;
            }
        }
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
        // Decide source: if terminal was last focused, attribute to terminal
        if (lastFocus === 'terminal') {
            store.languages['terminal'] = (store.languages['terminal'] || 0) + delta;
            store.frameworks['terminal'] = (store.frameworks['terminal'] || 0) + delta;
        } else {
            if (active.path) {
                currentFilePath = active.path;
                tickAdd(delta);
            }
        }

        // Only persist to disk infrequently (every 60s handled elsewhere), but we can throttle updates to status bar
        if (statusBarItem) {
            updateStatusBar();
        }
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

function updateStatusBar() {
    if (!statusBarItem) { return; }
    const icon = isSynced ? '✅' : '⚠️';
    const total = formatMs(totalMs());
    statusBarItem.text = `${icon} VSCTracker ${total}`;
    statusBarItem.tooltip = `VSCTracker - Total time: ${total}\nDB synced: ${isSynced}`;
    statusBarItem.show();
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

    // Setup backups root: prefer a user-configured path stored in extension globalState,
    // fallback to workspace setting `vscTracker.backupDir`, otherwise use extension globalStoragePath.
    try {
        const stored = context.globalState.get<string>('backupPath');
        if (stored) {
            backupsRoot = stored;
            ensureStorageDir(backupsRoot);
        } else {
            const cfg = vscode.workspace.getConfiguration('vscTracker');
            const configured = cfg.get<string>('backupDir');
            if (configured) {
                backupsRoot = path.isAbsolute(configured) ? configured : path.join(workspaceRoot || process.cwd(), configured);
                ensureStorageDir(backupsRoot);
            } else {
                backupsRoot = null;
            }
        }
    } catch (err) {
        backupsRoot = null;
    }

    // Launch async scan to populate framework totals from existing files
    (async () => {
        try {
            const detected = await detectFrameworksInWorkspace();
            for (const d of detected) {
                if (!store.frameworks[d]) {
                    store.frameworks[d] = 0;
                }
            }
            // quick heuristic: scan tracked files content for imports matching frameworks
            const patterns: { [framework: string]: RegExp[] } = {
                'React': [/import\s+React/i, /from\s+['\"]react['\"]/i, /react-dom/i],
                'Vue': [/from\s+['\"]vue['\"]/i, /createApp\(/i],
                'Angular': [/from\s+['\"]@angular\//i, /Component\(/i],
                'Svelte': [/from\s+['\"]svelte['\"]/i, /<svelte:component/i],
                'Django': [/from\s+django/i, /import\s+django/i],
                'Flask': [/from\s+flask/i, /import\s+flask/i],
                'Laravel': [/(Illuminate\/|laravel)/i],
                'Ruby on Rails': [/rails/i],
                'Spring Boot': [/org\.springframework|@SpringBootApplication/i],
                'Next.js': [/next\/link|next\/router|getServerSideProps/i],
                'Nuxt.js': [/nuxt\/link|nuxt/i]
            };

            for (const filePath of Object.keys(store.files)) {
                try {
                    if (!fs.existsSync(filePath)) {
                        continue;
                    }
                    const content = fs.readFileSync(filePath, 'utf8').slice(0, 16 * 1024);
                    for (const fw of Object.keys(patterns)) {
                        for (const rx of patterns[fw]) {
                            if (rx.test(content)) {
                                store.frameworks[fw] = (store.frameworks[fw] || 0) + (store.files[filePath].ms || 0);
                                break;
                            }
                        }
                    }
                } catch (e) { /* ignore file read errors */ }
            }
            saveLocalStore();
        } catch (e) { /* ignore */ }
    })();

    // Commands to set/clear backup path stored in extension globalState
    async function cmdSetBackupDir() {
        const input = await vscode.window.showInputBox({ prompt: 'Ruta absoluta para backups (ej: D:\\backups) o ruta relativa al home (ej: vsctracker/backups).', placeHolder: '~/vsctracker/backups' });
        if (!input) { return; }
        let resolved = input;
        if (resolved.startsWith('~')) {
            resolved = path.join(os.homedir(), resolved.slice(1));
        }
        if (!path.isAbsolute(resolved)) {
            resolved = path.join(os.homedir(), resolved);
        }
        try {
            ensureStorageDir(resolved);
            backupsRoot = resolved;
            await context.globalState.update('backupPath', backupsRoot);
            vscode.window.showInformationMessage(`VSCTracker: backupPath configurado en ${backupsRoot}`);
        } catch (err) {
            vscode.window.showErrorMessage(`VSCTracker: No se pudo configurar backupPath: ${String(err)}`);
        }
    }

    async function cmdClearBackupDir() {
        try {
            await context.globalState.update('backupPath', undefined);
            backupsRoot = null;
            vscode.window.showInformationMessage('VSCTracker: backupPath removido; se usará storage local por defecto.');
        } catch (err) {
            vscode.window.showErrorMessage(`VSCTracker: Error al borrar backupPath: ${String(err)}`);
        }
    }

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
            'vt pull - carga datos de la DB en local (se SUMAN a local)',
            'vt list - muestra lenguajes, frameworks detectados y frameworks con tiempo',
            'vt backup - genera un backup JSON local en la carpeta backups/',
            'vt backup-dir - muestra la carpeta donde se guardan los backups'
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
        const detected = await detectFrameworksInWorkspace();
        const detectedLines = detected.length ? detected : ['(none detected)'];
        appendOutput([
            'Detected languages (local):',
            ...langs,
            '',
            'Detected frameworks (by package.json):',
            ...detectedLines,
            '',
            'Frameworks time (local):',
            ...frameworks
        ]);
    }

    async function cmdBackup() {
        const file = await generateBackup();
        if (file) {
            vscode.window.showInformationMessage(`VSCTracker: Backup generado en ${file}`);
        } else {
            vscode.window.showErrorMessage('VSCTracker: Error generando backup. Revisa salida.');
        }
    }

    function cmdShowBackupDir() {
        if (!workspaceRoot) {
            vscode.window.showInformationMessage('VSCTracker: No se detectó workspace.');
            return;
        }
        const backupsDir = backupsRoot || path.join(workspaceRoot, 'backups');
        const exists = fs.existsSync(backupsDir);
        if (!exists) {
            try {
                ensureStorageDir(backupsDir);
                appendOutput([`Backups directory created: ${backupsDir}`]);
                vscode.window.showInformationMessage(`VSCTracker: Backups directory created: ${backupsDir}`);
                return;
            } catch (err) {
                appendOutput([`Backups directory: ${backupsDir} (failed to create)`]);
                vscode.window.showErrorMessage(`VSCTracker: No se pudo crear backups dir: ${backupsDir}`);
                return;
            }
        }

        appendOutput([`Backups directory: ${backupsDir}`]);
        vscode.window.showInformationMessage(`VSCTracker backups directory: ${backupsDir}`);
        // Reveal in OS file explorer
        try {
            vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(backupsDir));
        } catch (e) {
            // ignore if command not available
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
    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.vt.backupDir', () => cmdShowBackupDir()));

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
            case 'backup-dir':
            case 'backupdir':
                cmdShowBackupDir();
                break;
            default:
                showHelp();
                break;
        }
    }));

    // Terminal write events are intentionally not used for counting to avoid double-counting.
    // The ticker uses `lastFocus` to decide whether to attribute time to terminal or editor.

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

    // Register backup path commands
    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.vt.setBackupDir', () => cmdSetBackupDir()));
    context.subscriptions.push(vscode.commands.registerCommand('VSCtracker.vt.clearBackupDir', () => cmdClearBackupDir()));

    function updateStatusBar() {
        if (!statusBarItem) { return; }
        const icon = isSynced ? '✅' : '⚠️';
        const total = formatMs(totalMs());
        statusBarItem.text = `${icon} VSCTracker ${total}`;
        statusBarItem.tooltip = `VSCTracker - Total time: ${total}\nDB synced: ${isSynced}`;
        statusBarItem.show();
    }

    // Eventos
    context.subscriptions.push(vscode.window.onDidChangeWindowState((e) => {
        if (!e.focused) {
            return; // al recuperar foco no hacemos nada especial
        }
    }));

    // Track last focus source: when editor becomes active, mark editor; when terminal becomes active, mark terminal.
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            lastFocus = 'editor';
            // update active workspace root based on editor
            activeWorkspaceRoot = getWorkspaceForPath(editor.document.uri.fsPath);
            const info = getActiveEditorFile();
            currentFilePath = info.path;
            if (currentFilePath && info.language) {
                if (!store.files[currentFilePath]) {
                    store.files[currentFilePath] = { language: info.language, ms: 0 };
                }
            }
            if (statusBarItem) { updateStatusBar(); }
        }
    }));

    if ((vscode.window as any).onDidChangeActiveTerminal) {
        context.subscriptions.push((vscode.window as any).onDidChangeActiveTerminal((t: any) => {
            if (t) {
                lastFocus = 'terminal';
                if (statusBarItem) { updateStatusBar(); }
            }
        }));
    }

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
