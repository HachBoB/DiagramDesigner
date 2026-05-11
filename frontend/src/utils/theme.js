const THEME_KEY = "db-schema-designer-theme";

export function getSavedTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
}

export function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

export function applyTheme(theme) {
    if (theme === "dark") {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }
}