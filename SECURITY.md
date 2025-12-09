# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in VSCTracker, please **do not** open a public GitHub issue. Instead, report it responsibly to the maintainers.

### Reporting Process

1. **Email**: Send details to the maintainers (via GitHub profile or project contact)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (if you have one)

3. **Response timeline**:
   - Acknowledgment: within 48 hours
   - Initial assessment: within 1 week
   - Fix and patch: as soon as possible

### What NOT to do

- ❌ Do not publicly disclose the vulnerability before notification
- ❌ Do not exploit the vulnerability beyond the scope of research
- ❌ Do not access other users' data or systems

---

## Security Considerations

### 1. Firebase Integration

**Risk**: Exposure of Firebase credentials could compromise user data.

**Mitigations**:
- Credentials are environment-variable based (never hardcoded)
- Only pushed to remote if explicitly configured
- Use Firebase security rules to limit database access
- Consider using Firebase Cloud Functions for server-side validation

**User Responsibility**:
- Never commit `.env` files with credentials to version control
- Rotate API keys periodically
- Use Firebase security rules to restrict access

### 2. Local Storage

**Risk**: Sensitive time tracking data stored locally could be accessed by other programs.

**Mitigations**:
- Data stored in VS Code's protected global storage directory
- Data is JSON format (human-readable but not encrypted by default)
- Backups stored in user-configured directory

**User Responsibility**:
- Protect access to your machine
- Use filesystem permissions to restrict backup directory access
- Consider encryption if storing on shared systems

### 3. Backup Files

**Risk**: Unencrypted backup JSON files could be exposed if backed up to cloud or shared storage.

**Mitigations**:
- Backups are generated locally only (not auto-uploaded)
- User controls backup directory location
- Backup filenames include timestamp for easy identification

**User Responsibility**:
- Store backups in secure location
- Consider encrypting backups before uploading to cloud
- Don't commit backup files to public repositories

### 4. Terminal Activity Tracking

**Risk**: Extension tracks all terminal activity, which could include sensitive commands.

**Mitigations**:
- Terminal tracking is purely time-based (no command content is captured)
- All data remains local unless explicitly synchronized
- User can disable terminal tracking by not focusing it

**User Responsibility**:
- Understand that time in terminal is being tracked
- Rotate credentials after entering them in terminal
- Review backups for accidental sensitive data inclusion

---

## Dependency Security

### Vulnerability Scanning

We recommend regular vulnerability checks:

```bash
# Check for known vulnerabilities
npm audit

# Update to latest secure versions
npm audit fix
npm update
```

### Dependencies Used

- **firebase** (`^11.2.0`): Google-maintained, regularly audited
- **dotenv** (`^16.4.7`): Simple, well-maintained, widely used

### Reporting Dependency Vulnerabilities

If you discover a vulnerability in a dependency:
1. Check if it's been patched in a newer version
2. Report to the dependency maintainers
3. Notify VSCTracker maintainers if immediate action needed

---

## Security Best Practices for Users

### For Local Use

1. **Secure Your Machine**
   - Keep OS and software updated
   - Use strong passwords
   - Enable disk encryption (BitLocker, FileVault, LUKS)

2. **Manage Credentials**
   - Use environment variables, not hardcoded values
   - Rotate Firebase keys periodically
   - Don't share credentials

3. **Backup Safety**
   - Store backups in encrypted locations
   - Don't sync to untrusted cloud services
   - Keep backups access-restricted

### For Development

1. **Code Review**
   - Review all PRs before merging
   - Check for hardcoded secrets
   - Validate input handling

2. **Dependency Management**
   - Regularly update dependencies: `npm update`
   - Audit for vulnerabilities: `npm audit`
   - Use `npm ci` in CI/CD for reproducible builds

3. **Environment Isolation**
   - Use `.env` files locally (never commit)
   - Use `.env.example` as template
   - Document required environment variables

---

## Security Features

### What This Extension Does NOT Do

- ❌ Does NOT upload code contents to any server
- ❌ Does NOT track keystrokes or command content
- ❌ Does NOT access other files or projects
- ❌ Does NOT install additional software
- ❌ Does NOT modify system settings
- ❌ Does NOT require authentication (optional)

### What This Extension DOES Do

- ✅ Tracks time spent in open files and terminal
- ✅ Stores timing data locally in VS Code storage
- ✅ Optionally synchronizes per-language totals to Firebase
- ✅ Generates local backups in user-specified directory
- ✅ Shows timing statistics in status bar and output

---

## Incident Response

If a security vulnerability is discovered:

1. **Immediate Actions**:
   - Verify the vulnerability
   - Assess impact and severity
   - Develop a fix

2. **Communication**:
   - Notify maintainers
   - Coordinate disclosure timeline
   - Prepare advisory if needed

3. **Release**:
   - Create patched version immediately
   - Bump version number (MAJOR/MINOR as needed)
   - Publish security advisory
   - Notify users through appropriate channels

---

## Security Resources

- [OWASP Security Guidelines](https://owasp.org/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [Firebase Security Rules](https://firebase.google.com/docs/database/security)
- [VS Code Extension Security](https://code.visualstudio.com/api/references/extension-manifest#security)

---

## Contact

For security-related questions or to report vulnerabilities:

- **GitHub**: [@CapriaFranco](https://github.com/CapriaFranco)
- **Issues**: Only for non-security issues

---

**Last Updated**: December 9, 2025  
**Version**: 1.2.1
