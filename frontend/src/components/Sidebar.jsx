import { Link } from "react-router-dom";
import { BookOpen, MousePointer2, Plus, Trash2 } from "lucide-react";

/**
 * Компактная панель инструментов canvas. Она не меняет схему напрямую,
 * а вызывает команды редактора, который владеет nodes и edges.
 */
export default function Sidebar({
                                    onAddTable,
                                    onDeleteSelected,
                                    selectedTable
                                }) {
    return (
        <aside className="flex w-16 flex-col items-center gap-3 border-r border-slate-200 bg-white px-2 py-4 dark:border-slate-800 dark:bg-slate-950">
            <button
                title="Выделение"
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
                <MousePointer2 size={19} />
            </button>

            <button
                onClick={onAddTable}
                title="Добавить таблицу"
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm hover:bg-blue-700"
            >
                <Plus size={21} />
            </button>

            <button
                onClick={onDeleteSelected}
                disabled={!selectedTable}
                title="Удалить таблицу"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-red-950 dark:hover:text-red-400"
            >
                <Trash2 size={19} />
            </button>

            <div className="mt-auto">
                <Link
                    to="/docs"
                    title="Документация"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    <BookOpen size={19} />
                </Link>
            </div>
        </aside>
    );
}
