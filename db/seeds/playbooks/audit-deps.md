# Audit Dependencies — Security & Maintenance Checklist

Audit checklist for JavaScript/TypeScript projects.
Run periodically or before releases.

---

## 1. Known Vulnerabilities

- [ ] `npm audit` / `bun audit` shows no high or critical findings
- [ ] No dependencies with unpatched CVEs older than 90 days
- [ ] Transitive dependencies checked (not just direct)

**Red flag:** `npm audit` output ignored or suppressed in CI.

---

## 2. Unmaintained Packages

- [ ] No dependencies with last publish > 2 years ago AND open security issues
- [ ] No dependencies marked as deprecated on npm
- [ ] Check: `npm outdated` for major version drift

Known bad actors to replace:
| Package | Problem | Replacement |
|---|---|---|
| `xml2js` | Unmaintained, XXE/prototype pollution | `fast-xml-parser` |
| `moment` | Unmaintained, massive bundle | `date-fns` or `dayjs` |
| `lodash` (full) | Bundle bloat | `lodash-es` or native |
| `request` | Deprecated | `node-fetch` or native `fetch` |
| `uuid` (v3 or below) | Old, no ESM | `uuid@9+` or `crypto.randomUUID()` |
| `node-sass` | Deprecated | `sass` (dart-sass) |

---

## 3. Build-only vs Runtime Distinction

- [ ] Vulnerable package is categorized: runtime (critical) vs build-only (low risk)
- [ ] Build scripts processing static, version-controlled files are low-risk even with vulnerable parsers
- [ ] Dev-only tools (`devDependencies`) with CVEs: lower priority but still fix

---

## 4. Supply Chain Basics

- [ ] Lock file (`package-lock.json` / `bun.lockb`) is committed
- [ ] No `postinstall` scripts from untrusted packages running arbitrary code
- [ ] Pinned versions for critical dependencies (not `^` or `*`)
- [ ] Review: any new dependency added in this PR — is it necessary?

**Red flag:** `"postinstall": "node setup.js"` in an unfamiliar package.

---

## 5. Bundle Impact

- [ ] New dependencies checked for bundle size (`bundlephobia.com`)
- [ ] No duplicated functionality (two packages doing the same thing)
- [ ] Tree-shakeable (ESM) preferred over CJS-only packages
- [ ] Optional: check for packages that pull in heavy transitive deps

**Red flag:** Adding a 500KB package for a single utility function.
