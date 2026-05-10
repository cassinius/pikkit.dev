# SvelteKit / Svelte — Reactivity & Lifecycle Checklist

Audit checklist for Svelte 4/5 and SvelteKit applications.
Run when adding stores, reactive logic, context-based state, or route-level data loading.

---

## 1. Store Subscription Hygiene

- [ ] No module-level `store.subscribe()` without matching unsubscribe
- [ ] Use `$store` auto-subscription in `.svelte` files (auto-unsubs on destroy)
- [ ] Use `get(store)` for one-shot synchronous reads in plain `.ts` files
- [ ] Derived stores (`derived()`) preferred over manual subscription + local var
- [ ] If a module-level subscription is intentional (singleton lifetime), document why

**Red flag:** `someStore.subscribe(v => moduleVar = v)` at file top level with no `unsub()`.

---

## 2. Immutable Store Updates

- [ ] Never mutate a store's array/object in-place (`.push()`, `.splice()`, `.sort()`)
- [ ] Always create a new reference: spread, `.slice()`, `.filter()`, `.map()`
- [ ] `store.update(arr => [...arr, newItem])` — not `arr.push(newItem); store.set(arr)`
- [ ] Object stores: `store.update(obj => ({ ...obj, key: newVal }))` — not `obj.key = newVal`

**Red flag:** `.splice(idx, 1)` followed by `store.set(sameReference)` — Svelte may skip reactive updates.

---

## 3. Reactive Statements (`$:`) — Svelte 4

- [ ] `$:` blocks don't trigger side effects that modify other reactive deps (infinite loops)
- [ ] `$:` blocks don't contain async calls (they re-run before the promise resolves)
- [ ] Complex derived logic lives in `derived()` stores, not long `$:` chains
- [ ] `$:` used for declaration, not imperative side effects — prefer `afterUpdate` or explicit handlers

**Red flag:** `$: { await fetchSomething(); result = ... }` — the await doesn't work as expected.

---

## 4. Svelte 5 Runes (`$state`, `$derived`, `$effect`)

- [ ] `$effect` returns a cleanup function for any subscriptions/timers/listeners it creates
- [ ] `$effect` does not write to `$state` that it reads (circular dependency)
- [ ] `$derived` used for computed values (replaces `$:` declarations)
- [ ] `$state` objects: use `$state.snapshot()` when passing to external APIs that don't expect proxies
- [ ] Migration: `$:` reactive statements → `$derived` / `$effect` (not a 1:1 mapping)

**Red flag:** `$effect(() => { count = items.length })` — should be `count = $derived(items.length)`.

---

## 5. Context API Lifecycle

- [ ] `setContext()` called only during component initialization (not in event handlers or async)
- [ ] `getContext()` called only during component initialization (cache in a variable if needed later)
- [ ] Context keys are constants (imported from a shared module), not string literals
- [ ] Context does NOT replace stores for cross-component communication outside the tree
- [ ] Per-instance state passed via context uses separate store instances (not shared singletons)

**Red flag:** Hardcoded string keys (`getContext('myStore')`) duplicated across files — typo = silent `undefined`.

---

## 6. Component Cleanup (`onDestroy` / `onMount` return)

- [ ] `onMount` return function cleans up resources (equivalent to `onDestroy`)
- [ ] `addEventListener` on `window`/`document` has matching `removeEventListener` in destroy
- [ ] `setInterval` / `setTimeout` cleared in destroy
- [ ] `IntersectionObserver` / `ResizeObserver` / `MutationObserver` disconnected
- [ ] WebGL contexts released, canvas references nulled
- [ ] Abort controllers aborted on component destroy (cancel in-flight fetches)

**Red flag:** `onMount(() => { window.addEventListener('resize', handler) })` with no cleanup.

---

## 7. SvelteKit Load Functions & Data Ownership

- [ ] `+page.ts` / `+layout.ts` `load` functions don't hold mutable singleton state
- [ ] Data returned from `load` is treated as owned by the page (not mutated elsewhere)
- [ ] `depends()` / `invalidate()` used for reactive re-fetching (not manual stores)
- [ ] Server-only data stays in `+page.server.ts` (never leaks secrets to client)
- [ ] `fetch` inside `load` uses the provided `fetch` param (handles cookies, relative URLs)

**Red flag:** Global store set inside a `load` function — runs on every navigation, overwrites concurrently.

---

## 8. SSR & Hydration Safety (SvelteKit)

- [ ] No `window` / `document` / `navigator` access at module top level (breaks SSR)
- [ ] Browser-only code gated with `browser` from `$app/environment` or inside `onMount`
- [ ] Stores initialized with SSR-safe defaults (no DOM references as initial values)
- [ ] `afterNavigate` / `beforeNavigate` used instead of raw `popstate` listeners

**Red flag:** `const width = window.innerWidth` at file top level — crashes during SSR.
