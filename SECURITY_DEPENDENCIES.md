# Dependency Security & Vulnerability Management

## Regular Dependency Audits

### Built-in Yarn Audit

```bash
# Check for vulnerabilities
yarn audit

# Fix fixable vulnerabilities automatically
yarn audit --fix

# Show audit report with JSON output
yarn audit --json
```

### NPM Audit (if using npm)

```bash
npm audit
npm audit fix
```

## Detailed Vulnerability Scanning

### Using Snyk

```bash
# Install snyk globally
npm install -g snyk

# Test current project
snyk test

# Monitor vulnerabilities over time
snyk monitor --all-projects

# Test specific package
snyk test --file=package.json
```

### Using OWASP Dependency-Check

```bash
# Install via Homebrew (macOS)
brew install dependency-check

# Scan the project
dependency-check.sh --project "ai-musician-helper" --scan .
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Security Audit

on:
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: Run security audit
        run: yarn audit --all-projects
      
      - name: Check for vulnerabilities
        run: |
          if yarn audit --all-projects 2>&1 | grep -q "vulnerabilities"; then
            exit 1
          fi
```

## Automated Updates

### Dependabot (GitHub)

Configure in `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      - dependency-type: "dev"
        dependency-types: ["dev"]
      - dependency-type: "prod"
        dependency-types: ["prod"]
  
  - package-ecosystem: "npm"
    directory: "/admin-dashboard"
    schedule:
      interval: "weekly"
```

### Renovate (Alternative)

Create `.renovaterc`:

```json
{
  "extends": ["config:base"],
  "prCreation": "not-pending",
  "semanticCommits": true,
  "grouping": {
    "major": [],
    "minor": [],
    "patch": []
  }
}
```

## Key Dependencies to Monitor

### Critical Security Dependencies

| Package | Version | Purpose | Risk Level |
|---------|---------|---------|-----------|
| next | ^15.2.0 | Framework | HIGH - Security updates critical |
| @prisma/client | ^5.10.0 | Database ORM | HIGH - SQL injection prevention |
| react | ^19.0.0 | UI Library | MEDIUM - XSS prevention |
| openai | ^5.0.0 | AI API Client | MEDIUM - API credential handling |
| jspdf | ^4.2.1 | PDF Generation | LOW - But check for XXE |

### Security-Focused Packages (Consider Adding)

- `helmet` - Express middleware offering various HTTP headers
- `express-rate-limit` - Rate limiting middleware (if not using Next.js middleware)
- `jsonwebtoken` - JWT library (currently using custom implementation)
- `bcrypt` - Password hashing (currently using scrypt)
- `dotenv` - Environment variable management

## Vulnerability Check Checklist

### Before Each Release

- [ ] Run `yarn audit` and address all non-trivial vulnerabilities
- [ ] Check GitHub's Security tab for Dependabot alerts
- [ ] Review changelogs of major dependencies for security fixes
- [ ] Test with `yarn test` to ensure no regression
- [ ] Manual security testing (rate limiting, CSRF, auth)

### Weekly

- [ ] Review automated dependency update PRs
- [ ] Test and merge patch updates immediately
- [ ] For major/minor updates: test in staging first

### Monthly

- [ ] Full security audit with Snyk or OWASP tools
- [ ] Review and update this document
- [ ] Check security advisories for Node.js runtime

### Quarterly

- [ ] Full penetration testing
- [ ] Dependency audit report to stakeholders
- [ ] Update security policies and procedures

## Response to Vulnerabilities

### If Critical Vulnerability Found

1. **Immediately**: Assess impact on your application
2. **Urgent**: Check if affected code is actually used
3. **ASAP**: 
   - Update to patched version
   - If no patch: implement workaround or disable feature
   - Deploy to production
4. **Follow-up**: Document incident and preventive measures

### If High-Risk Vulnerability

1. **Update** to patched version within 1-2 days
2. **Test** thoroughly in staging
3. **Deploy** during next maintenance window (24-48 hours)

### If Medium-Risk Vulnerability

1. **Plan** update in next sprint
2. **Test** before merge to main
3. **Deploy** in next regular release

### If Low-Risk Vulnerability

1. **Group** with other dependency updates
2. **Review** quarterly for patterns
3. **Update** as part of regular maintenance

## Known Vulnerabilities We're Accepting

(None currently identified - update as needed)

## Transitive Dependencies Risk

Be aware of transitive dependencies:

```bash
# See dependency tree
yarn list

# Find specific package in tree
yarn list openai

# Check for duplicate versions
yarn list --pattern "^@types/"
```

High-risk transitive dependencies should be monitored extra carefully.

## Security Best Practices for Dependencies

1. **Keep dependencies updated** - Older versions = more vulnerabilities
2. **Use exact versions** - Avoid wildcards that auto-update
3. **Lock files are critical** - Commit yarn.lock and package-lock.json
4. **Minimal dependencies** - Don't add packages you don't need
5. **Review new dependencies** - Check npm security scores before adding
   - Visit: https://www.npmjs.com/package/[package-name]
   - Check GitHub repository health and maintenance

## Helpful Resources

- [Node.js Security Best Practices](https://nodejs.org/en/security/)
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)
- [npm Audit Results](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk Security Intelligence](https://snyk.io/reports/)
- [GitHub Security Advisories](https://github.com/advisories)
- [CVE Details](https://www.cvedetails.com/)

## Current Tool Recommendations

**For this project, prioritize:**

1. `yarn audit` (built-in, use regularly)
2. GitHub Dependabot (automatic PR creation)
3. Snyk (advanced vulnerability detection)
4. GitHub Security tab (easy oversight)

**Optional for enterprise:**

1. OWASP DependencyCheck (detailed reports)
2. Renovate (advanced grouping and scheduling)
3. Black Duck (enterprise supply chain management)
