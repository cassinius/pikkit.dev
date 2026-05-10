# Harden Frontend — Defensive Patterns Checklist

Audit checklist for Svelte/SvelteKit/Vite web applications.
Run before any PR that touches services, caching, workers, or initialization.

---

## 1. Fetch Resilience

- [ ] Every `fetch()` call has a timeout (AbortController, 10s default)
- [ ] GET requests retry on network error/timeout (2 retries default)
- [ ] POST/PUT/DELETE requests do NOT retry (non-idempotent)
- [ ] Failed fetches throw a structured error with `status` and `url`
- [ ] Streaming/long-poll requests can opt out of timeout (`timeoutMs: 0`)

**Red flag:** bare `fetch()` without AbortController anywhere in `src/services/`.

---

## 2. Worker Pool Resilience

- [ ] Crashed workers are replaced automatically (pool size stays constant)
- [ ] Each job has a timeout — hung workers get terminated and replaced
- [ ] Job queue has a max size to prevent unbounded memory growth
- [ ] A single worker crash does NOT reject all pending jobs
- [ ] Worker error handler only rejects the job that was on the crashed worker

**Red flag:** `pendingJobs.clear()` in an error handler, or no timeout on dispatched jobs.

---

## 3. Bounded Caches

- [ ] Every `Map` or object used as a cache has a max size
- [ ] Prefer LRU eviction (Map delete+reinsert trick is O(1))
- [ ] Cache is cleared on context switch (e.g., user/case/route change)
- [ ] Cache size scales with device capability when possible (`navigator.deviceMemory`)
- [ ] No module-level subscriptions that hold references to large data indefinitely

**Red flag:** `new Map()` storing decoded images/buffers with no eviction path.

---

## 4. Initialization Error Boundaries

- [ ] Top-level init procedure is wrapped in try/catch
- [ ] On failure: user sees an error message + retry action (not blank screen)
- [ ] Errors are not swallowed by `.catch()` that doesn't re-throw
- [ ] Error message shown is internal (service errors), never raw user input

**Red flag:** `await someService().catch(e => log(e))` where the outer function continues as if nothing happened.

---

## 5. Content Security Policy

- [ ] Production builds have a CSP (meta tag or HTTP header)
- [ ] `script-src 'self'` — no inline scripts, no external scripts
- [ ] `connect-src` whitelist — only known API origins
- [ ] `worker-src 'self' blob:` — allow web workers
- [ ] No inline event handlers in HTML (`oncontextmenu`, `onclick`, etc.)
- [ ] CSP is NOT applied in dev (would break HMR/dev server)

**Red flag:** No CSP anywhere, or `script-src 'unsafe-inline' 'unsafe-eval'`.

---

## 6. Dependency Hygiene

- [ ] No unmaintained dependencies with known CVEs in `package.json`
- [ ] XML parsers: use `fast-xml-parser` (not `xml2js`, not `libxmljs`)
- [ ] Distinguish build-only vs runtime deps when assessing severity
- [ ] Run `npm audit` / `bun audit` and address high/critical findings

**Red flag:** `xml2js`, `lodash` (full), `moment` in dependencies.

---

## 7. Framework-Specific Checks

For Svelte/SvelteKit projects, see [`sveltekit.md`](sveltekit.md) — covers store subscriptions, immutable updates, reactive statements, context API, lifecycle cleanup, and SSR safety.
