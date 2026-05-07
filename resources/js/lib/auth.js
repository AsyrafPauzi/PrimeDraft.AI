const AUTH_STORAGE_KEY = 'primedraft-auth';

export function loadAuth() {
    if (typeof window === 'undefined') {
        return null;
    }

    let raw = null;
    try {
        raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    } catch {
        return null;
    }

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        try {
            window.localStorage.removeItem(AUTH_STORAGE_KEY);
        } catch {
            // Ignore storage failures and keep app usable.
        }
        return null;
    }
}

export function saveAuth(authState) {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
    } catch {
        // Ignore storage failures and keep app usable.
    }
}

export function clearAuth() {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
        // Ignore storage failures and keep app usable.
    }
}
