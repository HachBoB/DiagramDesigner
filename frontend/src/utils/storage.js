const STORAGE_KEY = "db-schema-designer-state";

export function saveToStorage(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error("Ошибка сохранения в localStorage:", error);
    }
}

export function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return null;
        }

        return JSON.parse(raw);
    } catch (error) {
        console.error("Ошибка загрузки из localStorage:", error);
        return null;
    }
}

export function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
}