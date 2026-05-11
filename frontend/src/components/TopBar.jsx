import { Link } from "react-router-dom";
import { Database, FileJson, FileText, Home, RotateCcw } from "lucide-react";
import ThemeToggle from "./ThemeToggle.jsx";

export default function TopBar({
                                   projectName,
                                   onProjectNameChange,
                                   onExportJson,
                                   onExportSql,
                                   onReset,
                                   theme,
                                   onToggleTheme
                               }) {
    return (
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-4">
                <Link
                    to="/projects"
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    <Home size={18} />
                    Проекты
                </Link>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

                <div className="flex items-center gap-2">
                    <Database size={22} className="text-blue-600 dark:text-blue-400" />

                    <input
                        value={projectName}
                        onChange={(event) => onProjectNameChange(event.target.value)}
                        className="w-[320px] rounded-xl border border-transparent bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:bg-slate-900 dark:focus:ring-blue-950"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <ThemeToggle
                    theme={theme}
                    onToggle={onToggleTheme}
                />

                <button
                    onClick={onReset}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    <RotateCcw size={16} />
                    Сбросить
                </button>

                <button
                    onClick={onExportJson}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    <FileJson size={16} />
                    Экспорт JSON
                </button>

                <button
                    onClick={onExportSql}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                    <FileText size={16} />
                    Экспорт SQL
                </button>
            </div>
        </header>
    );
}