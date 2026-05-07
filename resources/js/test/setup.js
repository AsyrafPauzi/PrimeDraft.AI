import '@testing-library/jest-dom/vitest';

if (
    typeof window !== 'undefined' &&
    (!window.localStorage || typeof window.localStorage.getItem !== 'function')
) {
    const storage = new Map();
    Object.defineProperty(window, 'localStorage', {
        value: {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, String(value)),
            removeItem: (key) => storage.delete(key),
            clear: () => storage.clear(),
        },
        configurable: true,
    });
}
