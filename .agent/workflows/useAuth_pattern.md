1. Import `withTimeout` or implement `Promise.race([fetchPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))])`
2. Wrap database calls in timeout.
3. On success, save to `localStorage`.
4. On failure, load from `localStorage` as fallback.
