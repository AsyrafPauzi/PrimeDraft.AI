const THEME_STORAGE_KEY = 'primedraft-theme';

export function loadTheme() {
    if (typeof window === 'undefined') {
        return 'light';
    }

    let stored = null;
    try {
        stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
        return 'light';
    }

    return stored === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme) {
    if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }

    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
        // Ignore storage failures and keep app usable.
    }
}
