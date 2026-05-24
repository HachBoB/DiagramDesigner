const THEME_KEY = "db-schema-designer-theme";

// Тему читаем до первого render App, чтобы не мигать неправильной палитрой.
export function getSavedTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
}

// Выбор пользователя переживает перезагрузку всех страниц приложения.
export function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

// Tailwind dark variant завязан на класс `dark` у documentElement.
export function applyTheme(theme) {
    if (theme === "dark") {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }
}
