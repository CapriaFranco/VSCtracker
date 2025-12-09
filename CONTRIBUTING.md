# Contributing to VSCTracker

¡Gracias por tu interés en contribuir a VSCTracker! Este documento proporciona pautas e instrucciones para ayudarte a contribuir de manera efectiva.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style Guide](#code-style-guide)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Questions or Need Help?](#questions-or-need-help)

---

## Code of Conduct

This project and everyone participating in it is governed by a simple principle: **be respectful and inclusive**. We do not tolerate harassment or discrimination of any kind.

---

## Getting Started

### Prerequisites

- **Git**: Version control system
- **Node.js**: 20.x or later
- **npm**: 9+ (comes with Node.js)
- **VS Code**: Latest version recommended
- **TypeScript**: Knowledge of TypeScript basics

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub
   - Navigate to https://github.com/CapriaFranco/VSCTracker
   - Click the "Fork" button

2. **Clone your fork locally**
   ```bash
   git clone https://github.com/YOUR_USERNAME/VSCTracker.git
   cd VSCTracker
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/CapriaFranco/VSCTracker.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Verify installation**
   ```bash
   npm run compile
   npm run lint
   npm test
   ```

---

## Development Workflow

### Branch Naming Convention

Use descriptive branch names with prefixes:

- **Feature**: `feature/add-python-support`
- **Bugfix**: `bugfix/fix-crash-on-startup`
- **Documentation**: `docs/update-readme`
- **Refactor**: `refactor/clean-up-timer-logic`
- **Test**: `test/add-firebase-tests`

### Create a Feature Branch

```bash
# Update master first
git checkout master
git pull upstream master

# Create your feature branch
git checkout -b feature/your-feature-name
```

### Keep Your Branch Updated

```bash
# Fetch latest changes from upstream
git fetch upstream

# Rebase your branch on top of master
git rebase upstream/master
```

---

## Making Changes

### Project Structure

```
src/
├── extension.ts          # Main extension logic
│   ├── Type definitions (FileEntry, LocalStore)
│   ├── Core functions (tryInitFirebase, loadLocalStore, etc.)
│   ├── Timer and ticker logic (startTicker, tickAdd)
│   ├── Command handlers (cmdSave, cmdStatus, etc.)
│   ├── Activate and deactivate functions
│   └── Event listeners
└── test/
    └── extension.test.ts # Integration tests
```

### Code Organization

When adding new features:

1. **Keep concerns separated**: Don't mix UI, storage, and sync logic
2. **Use descriptive names**: Variable and function names should be self-documenting
3. **Add comments for complex logic**: Especially for reconciliation and sync algorithms
4. **Export necessary functions**: For testing purposes

### Example: Adding a New Command

```typescript
// 1. Define the command handler
async function cmdNewFeature() {
    try {
        // Implementation
        vscode.window.showInformationMessage('Success!');
    } catch (err) {
        vscode.window.showErrorMessage(`Error: ${String(err)}`);
    }
}

// 2. Register the command in activate()
context.subscriptions.push(
    vscode.commands.registerCommand('VSCtracker.vt.newFeature', () => cmdNewFeature())
);

// 3. Update package.json with the command entry
// 4. Add to help text
// 5. Write tests
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Compile and lint before running tests
npm run compile && npm run lint && npm test
```

### Writing Tests

Add integration tests in `src/test/extension.test.ts`:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('VSCTracker Extension Test Suite', () => {
    test('My new feature works', async () => {
        const result = await vscode.commands.executeCommand('VSCtracker.vt.myCommand');
        assert.ok(result);
    });
});
```

### Test Guidelines

- ✅ Test public APIs and command handlers
- ✅ Test error handling (try/catch blocks)
- ✅ Test with various input scenarios
- ✅ Use descriptive test names
- ⚠️ Keep tests fast (< 5 seconds each ideally)
- ⚠️ Mock external services (Firebase) when possible

---

## Submitting Changes

### Commit Messages

Use semantic commit messages:

```bash
git commit -m "type(scope): description"
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without feature change
- `perf`: Performance improvement
- `test`: Test additions or changes
- `chore`: Dependency or config changes

**Examples**:
```bash
git commit -m "feat(commands): add vt list-frameworks command"
git commit -m "fix(ticker): resolve double-counting in terminal"
git commit -m "docs(readme): update Firebase setup instructions"
git commit -m "refactor(storage): simplify reconciliation logic"
```

### Push Your Changes

```bash
git push origin feature/your-feature-name
```

### Create a Pull Request

1. Go to the original repository: https://github.com/CapriaFranco/VSCTracker
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill in the PR template:

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## How Has This Been Tested?
Describe your test process

## Screenshots (if applicable)
Add screenshots or GIFs

## Checklist
- [ ] I have tested locally
- [ ] I have updated documentation
- [ ] I have added tests
- [ ] ESLint passes (`npm run lint`)
- [ ] Tests pass (`npm test`)
```

### PR Review Process

- At least one maintainer review required
- Address feedback constructively
- Push new commits for changes (don't force push to keep history)
- Squash commits before merging if requested

---

## Code Style Guide

### TypeScript Standards

✅ **Do**:
- Use full type annotations
- Prefer `interface` for object shapes
- Use `const` by default, `let` when needed
- Use arrow functions when appropriate
- Handle errors explicitly

❌ **Don't**:
- Use `any` type (use `unknown` if needed)
- Omit semicolons
- Use `var` keyword
- Leave console.log() statements in production code
- Ignore TypeScript errors

### Example

```typescript
// ✅ Good
interface StoredData {
    ms: number;
    language: string;
}

function calculateTotal(data: StoredData[]): number {
    return data.reduce((acc, item) => acc + item.ms, 0);
}

// ❌ Bad
function calculateTotal(data: any): any {
    return data.reduce((a, b) => a + b.ms, 0)
}
```

### Linting

The project uses ESLint. Before committing:

```bash
npm run lint          # Check for issues
npm run lint -- --fix # Auto-fix issues
```

### Formatting

- **Indentation**: 4 spaces (configured in ESLint)
- **Line length**: Keep under 100 characters when reasonable
- **Imports**: Group and sort at the top
- **Exports**: Name exports preferred over default

---

## Reporting Bugs

### Before Reporting

1. Check existing issues: https://github.com/CapriaFranco/VSCTracker/issues
2. Try latest version
3. Check documentation
4. Try isolating the problem

### Bug Report Template

```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. ...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- VS Code version: 1.96.x
- Extension version: 1.2.0
- OS: Windows 10 / macOS / Linux
- Node.js version: 20.x

## Additional Context
Logs, screenshots, or error messages

## Possible Solution (optional)
If you have ideas how to fix it
```

---

## Requesting Features

### Feature Request Template

```markdown
## Description
Clear description of the requested feature

## Use Case
Why would this be useful?

## Proposed Solution
How should this feature work?

## Alternatives Considered
Other approaches to solve this?

## Additional Context
Examples or mockups
```

### Feature Evaluation Criteria

Features are evaluated based on:
- ✅ Alignment with project goals
- ✅ User demand
- ✅ Implementation complexity
- ✅ Maintenance burden
- ✅ Performance impact

---

## Questions or Need Help?

- 📖 **Documentation**: Check [README.md](README.md) and [README.en.md](README.en.md)
- 🐛 **Issues**: Open or search on [GitHub Issues](https://github.com/CapriaFranco/VSCTracker/issues)
- 💬 **Discussions**: Join [GitHub Discussions](https://github.com/CapriaFranco/VSCTracker/discussions)
- 📧 **Contact**: Reach out to the maintainers

---

## Additional Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [GitHub Collaborative Development](https://guides.github.com/)

---

Thank you for contributing to VSCTracker! Your efforts help make this project better for everyone. 🙌
