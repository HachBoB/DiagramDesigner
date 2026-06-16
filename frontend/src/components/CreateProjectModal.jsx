import { useState } from "react";
import { Briefcase, FileCode2, GraduationCap, Newspaper, ShoppingCart, X } from "lucide-react";
import { DB_DIALECTS, DEFAULT_DIALECT } from "../types/databaseTypes.js";
import { SCHEMA_PATTERNS } from "../utils/schemaFactory.js";

const PATTERN_ICONS = {
    starter: ShoppingCart,
    crm: Briefcase,
    education: GraduationCap,
    content: Newspaper
};

const PROJECT_OPTIONS = [
    ...SCHEMA_PATTERNS.map((pattern) => ({
        ...pattern,
        icon: PATTERN_ICONS[pattern.id] || FileCode2
    })),
    {
        id: "empty",
        icon: FileCode2,
        title: "Пустой проект",
        projectName: "Пустой проект",
        description: "Чистый canvas и пустой DBML-код, чтобы начать схему с нуля.",
        badge: "Blank",
        tablesCount: 0,
        relationsCount: 0
    }
];

/**
 * Модалка создания проекта собирает только выбор старта и диалекта.
 * Создание backend-проекта или локального черновика выполняет родитель.
 */
export default function CreateProjectModal({
    open,
    isCreating,
    error,
    hasSession,
    onClose,
    onCreate
}) {
    const [dialect, setDialect] = useState(DEFAULT_DIALECT);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            <ShoppingCart size={13} />
                            Новый проект
                        </div>

                        <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
                            Какой проект создать?
                        </h2>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Выберите стартовый вариант. {hasSession
                                ? "Проект сразу создастся в вашем аккаунте."
                                : "Откроется локальный черновик в редакторе."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isCreating}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
                        aria-label="Закрыть"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="max-h-[calc(92vh-132px)] overflow-y-auto p-6">
                    {error && (
                        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {PROJECT_OPTIONS.map((option) => {
                            const Icon = option.icon;

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => onCreate({ mode: option.id, dialect })}
                                    disabled={isCreating}
                                    className="group flex min-h-[240px] flex-col rounded-3xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-500 dark:hover:bg-slate-800"
                                >
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition group-hover:scale-105">
                                            <Icon size={22} />
                                        </div>

                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                            {option.badge}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">
                                        {option.title}
                                    </h3>

                                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                        {option.description}
                                    </p>

                                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                                        <span className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                                            Таблиц: {option.tablesCount}
                                        </span>
                                        <span className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                                            Связей: {option.relationsCount}
                                        </span>
                                    </div>

                                    <div className="mt-5 inline-flex items-center rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-blue-500">
                                        {isCreating ? "Создаём..." : "Выбрать"}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Диалект базы данных
                        </div>

                        <select
                            value={dialect}
                            onChange={(event) => setDialect(event.target.value)}
                            disabled={isCreating}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                        >
                            {Object.entries(DB_DIALECTS).map(([key, item]) => (
                                <option key={key} value={key}>
                                    {item.label}
                                </option>
                            ))}
                        </select>

                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Этот диалект станет основным для проекта и дальше будет только отображаться в редакторе и экспорте.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
