# VSCTracker — Personal Mini WakaTime

[![Version](https://img.shields.io/badge/version-1.2.0-yellow.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-darkred.svg)](LICENSE)
[![VSCode](https://img.shields.io/badge/VSCode-1.96+-blue.svg)](https://code.visualstudio.com)
[![Node](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org)

## 📋 Description

VSCTracker is a **minimalist extension for Visual Studio Code** that measures your coding time by file and aggregates it by programming language. It works **offline by default** and offers optional synchronization with Firebase to keep your history in the cloud.

Ideal for developers who want to:
- Track coding time without complex external dependencies
- Analysis by language and framework
- Automatic and configurable backups
- Optional and secure synchronization with remote databases

## 🏃 Main Features

- ✅ **Per-file tracking** — stores time per file (milliseconds)
- 📊 **Per-language aggregation** — automatic totals by programming language
- 🔌 **Offline-first** — works without connection; syncs when available
- 🔐 **Optional Firebase** — secure synchronization with Realtime Database (configurable)
- 📁 **Automatic backups** — backup after each remote synchronization
- 🖥️ **Controls via `vt` commands** — integrated command-line interface
- 🎨 **Framework detection** — recognizes React, Vue, Angular, Django, Flask, etc.
- 📈 **Terminal tracking** — counts time in VS Code terminal

## 🚀 Quick Start Guide

### Installation (for users)

1. Open VS Code
2. Search for `VSCTracker` in the extensions store (or install from `.vsix`)
3. Done! Start tracking your time automatically

### Local Development

```bash
# Clone the repository
git clone https://github.com/CapriaFranco/VSCTracker.git
cd VSCTracker

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run in development mode (F5 in VS Code)
npm run watch  # or use F5 in the editor
```

## 📦 Requirements and Compatibility

### System Requirements

| Requirement | Version | Status |
|-------------|---------|--------|
| **Visual Studio Code** | ≥ 1.96.0 | Required |
| **Node.js** | 20.x | Dev: Required |
| **npm** | 9+ | Dev: Required |
| **TypeScript** | 5.7+ | Dev: Required |

### Production Dependencies

```json
{
  "firebase": "^11.2.0",
  "dotenv": "^16.4.7"
}
```

### Development Dependencies

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

### OS Compatibility

- ✅ Windows 10/11
- ✅ macOS (Intel and Apple Silicon)
- ✅ Linux (Ubuntu, Debian, Fedora, etc.)

## 🛠️ Storage and Backups

### Local Storage

- **Location**: `localCodingStore.json` in VS Code's global storage (not in project folder)
- **Content**: tracked files, languages, detected frameworks and timestamps
- **Format**: JSON with structure `{ files, languages, frameworks, updatedAt }`

### Backup System

1. **Automatic**: generated after each successful remote synchronization
2. **Manual**: using `vt backup` command
3. **Configurable**: custom path via `vt set-backup-dir`
4. **Path Priority**:
   - User-configured path (globalState) — highest priority
   - Workspace setting `vscTracker.backupDir`
   - Extension local storage — fallback

## 💡 Available `vt` Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `vt help` | — | Show full help in Output |
| `vt status` | — | Check Firebase connection |
| `vt save` | — | Force synchronization local → remote |
| `vt show-local` | `showlocal` | Show local totals by language |
| `vt show-remote` | `showremote` | Show remote DB totals |
| `vt pull` | — | Download remote data and sum to local |
| `vt list` | `detected` | List detected languages and frameworks |
| `vt backup` | — | Generate manual JSON backup |
| `vt backup-dir` | `backupdir` | Show and open backups folder |
| `vt set-backup-dir` | — | Configure custom backup path |
| `vt clear-backup-dir` | — | Remove configured path, revert to default |

## ⚙️ Advanced Configuration

### Firebase (Remote Synchronization)

If you want to synchronize with Firebase Realtime Database:

1. **Create a Firebase project**:
   - Go to [firebase.google.com](https://firebase.google.com)
   - Create a new project
   - Enable Realtime Database
   - Copy `API_KEY` and `DATABASE_URL`

2. **Set environment variables** in PowerShell:

```powershell
$env:FIREBASE_API_KEY = 'your-api-key-here'
$env:FIREBASE_DATABASE_URL = 'https://your-project.firebaseio.com'
code  # opens VS Code with variables available
```

3. **Alternatively, in `.env`** (do not commit to repo):

```env
FIREBASE_API_KEY=your-api-key-here
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

4. **Reconciliation algorithm**:
   - If `local ≥ remote`: send local to remote
   - If `remote > local`: sum remote to local (recover lost data)

### Workspace Configuration

In `.vscode/settings.json` you can set:

```json
{
  "vscTracker.backupDir": "./backups"  // path relative to workspace
}
```

## 📦 Packaging and Installation

### Generate `.vsix`

```bash
npx vsce package
# Generates: vsctracker-1.2.0.vsix
```

### Install Locally

**Option 1: PowerShell Terminal**

```powershell
code --install-extension .\vsctracker-1.2.0.vsix
```

**Option 2: VS Code Interface**

1. Cmd+Shift+P (Mac) / Ctrl+Shift+P (Win/Linux)
2. Type: `Extensions: Install from VSIX...`
3. Select the `.vsix` file

## 🧪 Development and Testing

### Available Commands

```bash
# Compile TypeScript
npm run compile

# Compile in watch mode (development)
npm run watch

# Lint (ESLint)
npm run lint

# Tests (integration with vscode-test)
npm test

# Prepublish (compiles and prepares for packaging)
npm run vscode:prepublish
```

### Running in Debug Mode

1. Open the project in VS Code
2. Press **F5** (Start Debugging)
3. A new VS Code window will open with the extension loaded
4. Test the commands in the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)

### Project Structure

```
VSCTracker/
├── src/
│   ├── extension.ts          # Main logic
│   └── test/
│       └── extension.test.ts # Tests
├── out/                      # Compiled (ignored in git)
├── img/
│   └── VSCtracker.png        # Extension icon
├── package.json              # Manifest and dependencies
├── tsconfig.json             # TypeScript config
├── eslint.config.mjs         # ESLint config
├── README.md                 # Spanish version
├── README.en.md              # This file
└── LICENCE                   # MIT License
```

## 🤝 Contributing

Contributions are welcome. Please follow these steps:

### Contribution Process

1. **Fork the repository**
   ```bash
   # On GitHub: Click 'Fork'
   # Then clone your fork:
   git clone https://github.com/YOUR_USERNAME/VSCTracker.git
   cd VSCTracker
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/descriptive-name
   # or for bugfix:
   git checkout -b bugfix/bug-name
   ```

3. **Make your changes**
   - Edit the code following the existing style
   - Keep `.ts` files fully typed
   - Ensure it passes lint: `npm run lint`

4. **Test locally**
   ```bash
   npm run compile
   npm run lint
   npm test
   ```

5. **Commit with descriptive messages**
   ```bash
   git add .
   git commit -m "feat: add support for language X"
   # Examples: feat:, fix:, docs:, refactor:, test:, chore:
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/descriptive-name
   ```

7. **Open a Pull Request**
   - Go to GitHub and open a PR from your branch to `master`
   - Describe what changes and why
   - Request review

### Code Guidelines

- **TypeScript**: fully typed, avoid `any` if possible
- **Style**: follow ESLint (run `npm run lint`)
- **Commits**: use semantic prefixes (feat, fix, docs, refactor, test, chore)
- **Tests**: add tests for new features
- **Documentation**: update README if you change behavior

### Reporting Bugs

If you find a bug:

1. Verify no existing issue is open
2. Open a new issue with:
   - Descriptive title
   - VS Code version and OS
   - Steps to reproduce
   - Expected vs actual behavior
   - Logs if applicable

### Suggesting Improvements

For new feature suggestions:

1. Open an issue with `enhancement` label
2. Describe the use case
3. Explain why it would be useful
4. Provide examples if possible

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for change history.

## 👤 Author

**Capria Franco**
- GitHub: [@CapriaFranco](https://github.com/CapriaFranco)
- Repository: [VSCTracker](https://github.com/CapriaFranco/VSCTracker)

## 📄 License

This project is under the MIT License. See [LICENCE](LICENCE) file for details.

Permitted:
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use

Required:
- 📋 Include license and copyright
- 📋 State changes

## 🙏 Acknowledgments

- Inspired by [WakaTime](https://wakatime.com)
- Built with [VS Code Extension API](https://code.visualstudio.com/api)
- Firebase for remote synchronization
- TypeScript and ESLint for code quality

## 📞 Support

- 📖 [Official VS Code Documentation](https://code.visualstudio.com/docs)
- 🐛 [Issues on GitHub](https://github.com/CapriaFranco/VSCTracker/issues)
- 💬 [Discussions on GitHub](https://github.com/CapriaFranco/VSCTracker/discussions)

---

**Current version**: 1.2.0 | **Last update**: December 9, 2025

> 🌍 **Versión en español** [aquí](README.md)
