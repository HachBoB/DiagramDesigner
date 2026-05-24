const STORAGE_KEY = "db-schema-designer-state";

/**
 * Локальный snapshot нужен гостевому редактору и страховке между reload.
 * Ошибка localStorage не должна ломать работу canvas, поэтому ее только логируем.
 */
export function saveToStorage(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error("Ошибка сохранения в localStorage:", error);
    }
}

// Невалидный JSON считаем отсутствующим snapshot, чтобы editor открылся заново.
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

// Сброс локального проекта удаляет только ключ schema designer.
export function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
}
