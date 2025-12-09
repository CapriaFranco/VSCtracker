# VSCTracker Architecture

## High-Level Overview

VSCTracker is a VS Code extension designed with an **offline-first architecture** that tracks coding time locally and optionally synchronizes with Firebase.

```
┌────────────────────────────────────────────────────────────────┐
│                    VS Code Extension                           │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Event Listeners (Focus, Editor, Terminal)                │  │
│  │                          ↓↓↓                             │  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │ Ticker (1s interval)                                 │ │  │
│  │ │ • Track active file                                  │ │  │
│  │ │ • Accumulate milliseconds                            │ │  │
│  │ │ • Update local store                                 │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  │                          ↓↓↓                             │  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │ Local Store (JSON)                                   │ │  │
│  │ │ • Per-file tracking                                  │ │  │
│  │ │ • Per-language aggregation                           │ │  │
│  │ │ • Framework detection                                │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  │ ↓↓↓ (Every 60s)              ↓↓↓ (Every 3h, optional)    │  │
│  │ ┌──────────────┐              ┌──────────────┐           │  │
│  │ │ Persist to   │              │ Sync with    │           │  │
│  │ │ Disk         │              │ Firebase     │           │  │
│  │ └──────────────┘              └──────────────┘           │  │
│  │                                     ↓↓↓                  │  │
│  │                               ┌──────────────┐           │  │
│  │                               │ Reconcile    │           │  │
│  │                               │ & Backup     │           │  │
│  │                               └──────────────┘           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Commands & UI                                            │  │
│  │ • vt help, status, save, show-local, show-remote...      │  │
│  │ • Status bar display                                     │  │
│  │ • Output channel logging                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Data Model

#### LocalStore Interface
```typescript
interface LocalStore {
    files: { [filePath: string]: FileEntry };
    languages: { [language: string]: number };  // ms
    frameworks: { [framework: string]: number }; // ms
    updatedAt: number;  // timestamp
}

interface FileEntry {
    language: string;
    ms: number;  // milliseconds
}
```

#### Storage Location
- **OS**: `<User>/AppData/Roaming/Code/User/globalStorage/` (Windows)
- **File**: `localCodingStore.json`
- **Format**: JSON with 2-space indentation

### 2. Event System

The extension tracks user activity through VS Code events:

#### Window Events
- `onDidChangeWindowState`: Focus changes
- `onDidChangeActiveTextEditor`: File/editor switches
- `onDidChangeActiveTerminal`: Terminal switches

#### Tracked Information
- Current file path
- Current language (from document languageId)
- Last focus source (editor/terminal)
- Time delta since last update

### 3. Ticker & Time Accumulation

#### Ticker Loop (1-second interval)
```typescript
startTicker() {
    interval = setInterval(() => {
        // 1. Check if window is focused
        // 2. Calculate time delta since last tick
        // 3. Call tickAdd(delta) with accumulated milliseconds
        // 4. Update status bar
    }, 1000);  // 1 second
}
```

#### Time Attribution
- **Editor focus**: Attributed to current file and language
- **Terminal focus**: Attributed to "terminal" language
- **No focus**: Time not counted

#### Framework Attribution
- Time is attributed to detected frameworks
- Detection happens during activation
- Patterns matched against file contents

### 4. Persistence Layer

#### Save Strategy
- **Local save**: Every 60 seconds (periodic)
- **Remote sync**: Every 3 hours (optional)
- **Manual save**: Via `vt save` command
- **On deactivate**: Final save before unload

#### Load Strategy
- **On activate**: Load from disk if exists
- **Error handling**: Fallback to empty store

### 5. Firebase Synchronization

#### Initialization
```
Environment Variables
  ↓
tryInitFirebase()
  ↓
Firebase App Instance
  ↓
Realtime Database Reference
```

#### Database Schema
```
vscTracker/
├── languages/
│   ├── typescript: 3600000
│   ├── python: 1800000
│   └── updatedAt: 1702200000000
└── (future: per-file storage)
```

#### Reconciliation Algorithm

**Goal**: Recover lost local data while preventing duplication

```
For each language:
  local_ms = localStore.languages[lang] || 0
  remote_ms = remoteStore.languages[lang] || 0

  if (local_ms >= remote_ms):
    // Local has more data, push it
    if (local_ms > remote_ms):
      updateRemote(lang, local_ms)
  else:
    // Remote has more, sum it to local
    // (user was tracking elsewhere, recover the data)
    localStore.languages[lang] = local_ms + remote_ms
    saveLocal()
```

#### Backup Generation
- Triggered after successful reconciliation
- Filename: `backup-2025-12-09T22-28-54-000Z.json`
- Content: `{ generatedAt, isSynced, store }`
- Location: User-configured or fallback

### 6. Command System

#### Command Registration
```typescript
// Individual command registration
context.subscriptions.push(
    vscode.commands.registerCommand('VSCtracker.vt.help', () => showHelp())
);

// Unified vt command with subcommand routing
context.subscriptions.push(
    vscode.commands.registerCommand('VSCtracker.vt', async (arg) => {
        // Parse input
        // Route to appropriate handler
    })
);
```

#### Command Flow
```
User Input → Parse Command → Route → Handler → Result
                               ↓
                         Update Store
                               ↓
                         Update Display
                               ↓
                         Output Channel
```

---

## Initialization Sequence

### On Extension Activate

1. **Setup Storage**
   ```
   Create globalStoragePath directory
   Load localCodingStore.json
   ```

2. **Initialize Firebase (optional)**
   ```
   Check FIREBASE_API_KEY env var
   If present: Initialize Firebase app and database
   If not: Use null database (all sync operations become no-ops)
   ```

3. **Reconcile with Remote**
   ```
   Fetch remote languages
   Compare with local
   Update local if remote > local
   Generate backup
   ```

4. **Setup Timers**
   ```
   Start ticker (1s interval) → time accumulation
   Start remote sync (3h interval) → Firebase sync
   Start periodic save (60s interval) → local persistence
   ```

5. **Register Commands**
   ```
   vt help
   vt status
   vt save
   vt show-local
   vt show-remote
   vt pull
   vt list
   vt backup
   vt backup-dir
   vt set-backup-dir
   vt clear-backup-dir
   ... and other legacy commands
   ```

6. **Setup Events**
   ```
   onDidChangeActiveTextEditor → update currentFile
   onDidChangeActiveTerminal → set lastFocus = 'terminal'
   onDidChangeWindowState → stop counting if not focused
   ```

7. **Create Status Bar**
   ```
   Display initial time + sync status
   Register as disposable
   ```

---

## File Structure

```
src/
├── extension.ts                    # Main file (874 lines)
│   ├── Type definitions
│   ├── Global variables
│   ├── Firebase functions
│   ├── Storage functions
│   ├── Workspace detection
│   ├── Framework detection
│   ├── Backup generation
│   ├── Reconciliation logic
│   ├── Time tracking (ticker)
│   ├── Command handlers
│   ├── activate() function
│   ├── deactivate() function
│   └── Helper functions
│
└── test/
    └── extension.test.ts           # Integration tests
        ├── Test suite setup
        ├── Command execution tests
        └── Sequence tests
```

---

## Configuration

### User Settings (`.vscode/settings.json`)

```json
{
    "vscTracker.backupDir": "./backups"  // Relative or absolute
}
```

### Extension State (globalState)

Persisted in VS Code's extension storage:
```
backupPath: "/Users/user/vsctracker/backups"  // User-configured
```

### Environment Variables

```bash
FIREBASE_API_KEY=your-api-key-here
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

---

## Error Handling

### Strategy: Graceful Degradation

- **Firebase unavailable**: Continue local tracking
- **File read error**: Log and skip file
- **Storage permission error**: Show user message
- **Sync failure**: Retry on next interval, log error

### User Notifications

- `vscode.window.showErrorMessage()`: Critical errors
- `vscode.window.showInformationMessage()`: Success messages
- `outputChannel.appendLine()`: Detailed logging

---

## Performance Considerations

### Time Complexity
- Ticker: O(1) per tick
- File attribution: O(n) where n = tracked files (lazy load)
- Reconciliation: O(m) where m = unique languages
- Backup: O(n) for store serialization

### Space Complexity
- Local store: O(n + m) where n = files, m = languages/frameworks
- Backups: ~1 KB per backup (JSON serialized)

### Resource Usage
- Memory: ~5-10 MB typical
- CPU: Negligible (1s interval, simple operations)
- Disk: ~1 KB per hour of usage

---

## Extension Lifecycle

### Activation
- Triggered when extension is enabled
- Loads configuration
- Initializes storage and timers
- Performs initial sync

### Running
- Continuously tracks time
- Updates store in memory
- Periodically persists to disk
- Periodically syncs to Firebase (if configured)

### Deactivation
- Triggered when VS Code closes or extension is disabled
- Saves final store state
- Clears timers
- Closes database connection

---

## Testing Strategy

### Types of Tests

1. **Unit Tests** (not currently implemented)
   - Would test individual functions in isolation
   - Mock Firebase, file system

2. **Integration Tests** (current approach)
   - Load actual extension
   - Execute commands
   - Verify no errors

3. **Manual Testing**
   - F5 → Start debugging
   - Test commands in debug window
   - Verify local store updates
   - Check backups created

### Test Coverage Areas

- ✅ Command registration
- ✅ Command execution (no-throw)
- ✅ Sequence operations (save → pull)
- ⏳ Firebase operations (mocked)
- ⏳ File I/O operations
- ⏳ Timer functionality

---

## Future Architecture Considerations

### Potential Improvements

1. **Event Bus Pattern**
   - Decouple components with event emitter
   - Allow plugin system

2. **Worker Threads**
   - Move heavy operations (file scanning) off main thread

3. **Caching Layer**
   - Cache framework detection results
   - Reduce file I/O

4. **Encrypted Storage**
   - Optionally encrypt local storage
   - Enhanced security for sensitive users

5. **Analytics**
   - Aggregate statistics
   - Trend analysis
   - Weekly/monthly reports

---

## Related Documentation

- [VS Code Extension API](https://code.visualstudio.com/api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [Contributing Guide](CONTRIBUTING.md)

---

**Last Updated**: December 9, 2025  
**Architecture Version**: 1.0 (for VSCTracker 1.2.0)
