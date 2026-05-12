const LIBRARY_KEY = 'primedraft_user_library_v1';
const TEMPLATES_KEY = 'primedraft_user_templates_v1';

/** @returns {Array<{ id: string, name: string, src: string, addedAt: string }>} */
export function loadUserImageLibrary() {
    try {
        const raw = localStorage.getItem(LIBRARY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.src === 'string') : [];
    } catch {
        return [];
    }
}

/** @param {Array<{ id: string, name: string, src: string, addedAt: string }>} items */
export function saveUserImageLibrary(items) {
    try {
        localStorage.setItem(LIBRARY_KEY, JSON.stringify(items.slice(0, 200)));
    } catch {
        /* quota */
    }
}

/** @returns {Array<{ id: string, name: string, description?: string, layers: unknown[] }>} */
export function loadUserTemplates() {
    try {
        const raw = localStorage.getItem(TEMPLATES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((x) => x && Array.isArray(x.layers)) : [];
    } catch {
        return [];
    }
}

/** @param {Array<{ id: string, name: string, description?: string, layers: unknown[] }>} items */
export function saveUserTemplates(items) {
    try {
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(items.slice(0, 50)));
    } catch {
        /* quota */
    }
}
