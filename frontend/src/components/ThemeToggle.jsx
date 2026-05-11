import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ theme, onToggle }) {
    const isDark = theme === "dark";

    return (
        <button
            onClick={onToggle}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
        >
            {isDark ? (
                <>
                    <Sun size={16} />
                    Светлая
                </>
            ) : (
                <>
                    <Moon size={16} />
                    Тёмная
                </>
            )}
        </button>
    );
}