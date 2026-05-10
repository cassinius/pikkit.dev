# Memory Audit — Leak & Bloat Detection Checklist

Audit checklist for JavaScript/TypeScript web applications.
Run when investigating memory growth, long-session degradation, or before shipping features with caching.

---

## 1. Unbounded Collections

- [ ] Every `Map`, `Set`, or plain object used as a cache has a max size
- [ ] Eviction strategy exists (LRU, TTL, or clear-on-context-switch)
- [ ] `WeakMap` / `WeakRef` used where the key lifecycle is tied to DOM or objects
- [ ] Arrays that accumulate entries have a cap or periodic flush

**Red flag:** `const cache = new Map()` with `.set()` but no `.delete()` or size check.

---

## 2. Subscriptions & Listeners

- [ ] Every `addEventListener` has a matching `removeEventListener` (or uses `{ once: true }`)
- [ ] `setInterval` / `setTimeout` references are cleared on destroy/unmount
- [ ] RxJS/Observable subscriptions use `takeUntil` or unsubscribe in cleanup
- [ ] Module-level subscriptions are intentional and documented (they live forever)

For Svelte store subscriptions specifically, see [`sveltekit.md`](sveltekit.md) sections 1-2.

**Red flag:** `addEventListener(...)` in setup code with no matching removal on teardown.

---

## 3. DOM & Component Leaks

- [ ] Detached DOM nodes: no references held to removed elements
- [ ] Event handlers on `window`/`document` removed on component destroy
- [ ] `MutationObserver` / `IntersectionObserver` / `ResizeObserver` disconnected on cleanup
- [ ] Canvas/WebGL contexts released when component unmounts

**Red flag:** `window.addEventListener(...)` in `onMount` with no `onDestroy` cleanup.

---

## 4. Web Workers

- [ ] Workers terminated when no longer needed, OR pool stays constant size
- [ ] Pending job maps cleared when jobs complete (no orphaned entries)
- [ ] `transferable` objects used for large buffers (avoids copy retention)
- [ ] Crashed workers don't leave dangling promises that hold references

**Red flag:** `new Worker(...)` created per-request without termination.

---

## 5. Blob & ObjectURL Leaks

- [ ] Every `URL.createObjectURL()` has a matching `URL.revokeObjectURL()`
- [ ] Blob references released after use (not held in closures)
- [ ] File reader results not retained beyond their use

**Red flag:** `createObjectURL` in a loop or reactive block without revocation.

---

## 6. Context-Switch Cleanup

- [ ] When user switches case/patient/route: all caches for previous context are cleared
- [ ] Previous context's image data / decoded buffers are released
- [ ] Stores reset to initial state on context switch (not just overwritten)
- [ ] No stale closures referencing previous context's data

**Red flag:** Opening 10 different cases in sequence causes linear memory growth.

---

## 7. Verification Techniques

- [ ] Chrome DevTools → Memory → Heap snapshot: compare before/after repeated action
- [ ] Performance monitor: JS Heap size over time during typical workflow
- [ ] `performance.measureUserAgentSpecificMemory()` for programmatic checks
- [ ] Forced GC (`--expose-gc` flag) + heap snapshot to confirm true leaks vs GC delay
