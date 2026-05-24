import { useRef, useState } from "react";
import { DatabaseZap, FileUp, X } from "lucide-react";
import { DB_DIALECTS } from "../types/databaseTypes.js";

/**
 * Внешняя обертка размонтирует содержимое при закрытии. Это удобно для импорта:
 * введенный SQL и ошибки сбрасываются при следующем открытии окна.
 */
export default function ImportSqlModal({
    open,
    dialect,
    onClose,
    onImport
}) {
    if (!open) {
        return null;
    }

    return (
        <ImportSqlModalContent
            dialect={dialect}
            onClose={onClose}
            onImport={onImport}
        />
    );
}

/**
 * Внутренняя часть импорта хранит SQL из textarea или файла и показывает
 * ошибки парсера, которые возвращает редактор после попытки импорта.
 */
function ImportSqlModalContent({
    dialect,
    onClose,
    onImport
}) {
    const fileInputRef = useRef(null);
    const [sql, setSql] = useState("");
    const [errors, setErrors] = useState([]);
    const [selectedDialect, setSelectedDialect] = useState(dialect);

    // Читаем файл браузером как текст, не отправляя его на сервер.
    async function handleFileChange(event) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setSql(await file.text());
        setErrors([]);
        event.target.value = "";
    }

    // Родитель применяет новый snapshot только когда sqlImporter не нашел
    // блокирующих ошибок, а модалка отображает найденные проблемы.
    function handleImport() {
        const result = onImport(sql, selectedDialect);

        if (result?.errors?.length) {
            setErrors(result.errors);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-6">
            <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                    <div className="flex gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                            <DatabaseZap size={21} />
                        </span>
                        <div>
                            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
                                Импорт SQL
                            </h2>
                            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Вставьте SQL или выберите файл. Текущая схема будет заменена таблицами,
                                связями, индексами и записями из скрипта.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        aria-label="Закрыть импорт"
                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid min-h-[560px] grid-cols-[280px_1fr]">
                    <aside className="border-r border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                        <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                            СУБД исходного SQL
                        </label>
                        <select
                            value={selectedDialect}
                            onChange={(event) => setSelectedDialect(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                        >
                            {Object.entries(DB_DIALECTS).map(([key, item]) => (
                                <option key={key} value={key}>
                                    {item.label}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            <FileUp size={17} />
                            Выбрать .sql
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".sql,text/sql,text/plain"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        <button
                            type="button"
                            onClick={handleImport}
                            disabled={!sql.trim()}
                            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Импортировать
                        </button>

                        <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            Поддерживаются те же пять диалектов, что и в экспорте: PostgreSQL,
                            MySQL, SQLite, SQL Server и Oracle.
                        </p>
                    </aside>

                    <section className="flex min-h-0 flex-col p-5">
                        <textarea
                            value={sql}
                            onChange={(event) => {
                                setSql(event.target.value);
                                setErrors([]);
                            }}
                            spellCheck={false}
                            placeholder={'CREATE TABLE "users" (\n  "id" SERIAL NOT NULL,\n  PRIMARY KEY ("id")\n);'}
                            className="min-h-0 flex-1 resize-none rounded-2xl border border-slate-200 bg-white p-4 font-mono text-sm leading-6 text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                        />

                        {errors.length > 0 && (
                            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/35 dark:text-red-200">
                                {errors.map((error) => (
                                    <p key={`${error.message}-${error.hint}`} className="leading-6">
                                        <span className="font-bold">{error.message}</span>
                                        {error.hint ? ` ${error.hint}` : ""}
                                    </p>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
