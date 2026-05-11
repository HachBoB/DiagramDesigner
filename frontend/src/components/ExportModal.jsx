import { X } from "lucide-react";
import { DB_DIALECTS } from "../types/databaseTypes.js";

export default function ExportModal({
                                        open,
                                        dialect,
                                        onDialectChange,
                                        sql,
                                        onClose,
                                        onDownload
                                    }) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-6">
            <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            Экспорт SQL
                        </h2>

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Можно выбрать диалект и скачать отдельный SQL-файл.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-[240px_1fr]">
                    <div className="border-r border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Диалект
                        </div>

                        <select
                            value={dialect}
                            onChange={(event) => onDialectChange(event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                        >
                            {Object.entries(DB_DIALECTS).map(([key, item]) => (
                                <option key={key} value={key}>
                                    {item.label}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={onDownload}
                            className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            Скачать .sql
                        </button>
                    </div>

                    <pre className="max-h-[560px] overflow-auto bg-slate-950 p-5 text-sm leading-6 text-slate-100">
            <code>{sql}</code>
          </pre>
                </div>
            </div>
        </div>
    );
}