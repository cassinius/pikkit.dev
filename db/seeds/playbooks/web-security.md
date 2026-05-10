# Web Security — Application Hardening Checklist

Audit checklist for production web applications.
Run before deployment, after adding new endpoints or user-facing features.

---

## 1. Content Security Policy

- [ ] CSP present (meta tag or HTTP header)
- [ ] `script-src 'self'` — no `unsafe-inline`, no `unsafe-eval`
- [ ] `connect-src` whitelist — only known API/CDN origins
- [ ] `frame-ancestors 'self'` or `'none'` — prevents clickjacking
- [ ] `object-src 'none'` — blocks Flash/plugins
- [ ] `base-uri 'self'` — prevents base tag injection
- [ ] CSP disabled in dev only, not stripped from staging

**Red flag:** No CSP, or `default-src *`.

---

## 2. Input Sanitization & Output Encoding

- [ ] User input never inserted into DOM via `innerHTML` or `{@html}` (Svelte)
- [ ] URL parameters validated/sanitized before use
- [ ] SVG content from external sources sanitized (SVG can contain scripts)
- [ ] Markdown rendering uses a sanitizer (e.g., DOMPurify)
- [ ] DICOM/medical metadata displayed as text, never as HTML

**Red flag:** `element.innerHTML = userInput` or `{@html dicomField}`.

---

## 3. Authentication & Session

- [ ] Session tokens in HttpOnly cookies (not localStorage)
- [ ] CSRF protection on state-changing endpoints
- [ ] Auto-logout on inactivity (especially for medical/sensitive apps)
- [ ] No credentials in URL parameters (visible in logs, referer headers)
- [ ] Token expiry validated client-side (don't wait for 401)

**Red flag:** `localStorage.setItem('token', ...)` for auth tokens.

---

## 4. Transport Security

- [ ] All API calls over HTTPS (no mixed content)
- [ ] HSTS header set on production server
- [ ] No sensitive data in URL query strings (logged by proxies)
- [ ] WebSocket connections use `wss://`

**Red flag:** `http://` URLs in production config or fetch calls.

---

## 5. Sensitive Data Handling

- [ ] Patient/user data not logged to console in production
- [ ] Error messages don't expose stack traces or internal paths to users
- [ ] Browser caching headers appropriate for sensitive pages (`Cache-Control: no-store`)
- [ ] Sensitive data cleared from memory when no longer needed (see memory-audit)
- [ ] No sensitive data in `postMessage` without origin checks

**Red flag:** `console.log('Patient data:', patientObject)` in production code.

---

## 6. Third-Party Risk

- [ ] No external scripts loaded (`<script src="https://...">`)
- [ ] If CDN needed: use Subresource Integrity (`integrity="sha384-..."`)
- [ ] Analytics/tracking scripts: evaluate if they need access to page content
- [ ] Fonts: self-host rather than Google Fonts (privacy, CSP simplicity)
- [ ] No `postMessage` listeners that accept messages from any origin

**Red flag:** External script tags without SRI, or `event.origin` not checked in message handlers.

---

## 7. Build & Deployment

- [ ] Source maps NOT served in production (expose code structure)
- [ ] Environment variables don't leak to client bundle
- [ ] `.env` files in `.gitignore`
- [ ] API keys are server-side only, never bundled into client
- [ ] Debug/dev features gated behind build flags, not runtime checks

**Red flag:** `VITE_SECRET_KEY` or similar in client-accessible code.
