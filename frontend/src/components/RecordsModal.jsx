import { Download, Table2, X } from "lucide-react";
import { downloadTextFile } from "../utils/download.js";

function formatCellValue(value) {
    if (value === null || value === undefined) {
        return "(null)";
    }

    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }

    return String(value);
}

function getColumnType(table, column) {
    return table?.data?.fields?.find((field) => field.name === column)?.type || "";
}

function toCsvValue(value) {
    if (value === null || value === undefined) {
        return "";
    }

    const text = String(value);

    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, "\"\"")}"`;
    }

    return text;
}

export default function RecordsModal({ table, onClose }) {
    if (!table) {
        return null;
    }

    const records = table.data.records || {};
    const columns = Array.isArray(records.columns) && records.columns.length > 0
        ? records.columns
        : table.data.fields.map((field) => field.name);

    const rows = Array.isArray(records.rows) ? records.rows : [];

    function downloadCsv() {
        const content = [
            columns.join(","),
            ...rows.map((row) => columns.map((_, index) => toCsvValue(row?.[index])).join(","))
        ].join("\n");

        downloadTextFile(`${table.data.name}-records.csv`, content, "text/csv");
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6">
            <div className="flex max-h-[82vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Table2 className="text-blue-600 dark:text-blue-400" size={20} />
                            <h2 className="truncate text-lg font-extrabold text-slate-900 dark:text-white">
                                Записи таблицы {table.data.name}
                            </h2>
                        </div>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {rows.length > 0
                                ? `${rows.length} строк, ${columns.length} колонок`
                                : "Для этой таблицы пока нет записей в блоке Records."}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={downloadCsv}
                            disabled={rows.length === 0}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <Download size={16} />
                            CSV
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto p-5">
                    {rows.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                            <div className="text-lg font-bold text-slate-900 dark:text-white">
                                Записей нет
                            </div>
                            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Добавьте блок Records в код схемы, и строки появятся здесь.
                            </p>
                            <pre className="mx-auto mt-4 max-w-xl overflow-auto rounded-2xl bg-slate-950 p-4 text-left text-sm leading-6 text-slate-100">
{`Records ${table.data.name}(${columns.join(", ")}) {
  1, 'пример'
}`}
                            </pre>
                        </div>
                    ) : (
                        <table className="w-full min-w-max border-separate border-spacing-0 text-left text-sm">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 top-0 z-20 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                        #
                                    </th>
                                    {columns.map((column) => (
                                        <th
                                            key={column}
                                            className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                                        >
                                            <div className="font-extrabold text-slate-900 dark:text-white">
                                                {column}
                                            </div>
                                            <div className="mt-1 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                                                {getColumnType(table, column) || "value"}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {rows.map((row, rowIndex) => (
                                    <tr key={`${table.id}-record-${rowIndex}`}>
                                        <td className="sticky left-0 border-b border-slate-100 bg-white px-4 py-3 font-mono text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500">
                                            {rowIndex + 1}
                                        </td>

                                        {columns.map((column, columnIndex) => (
                                            <td
                                                key={`${column}-${columnIndex}`}
                                                className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200"
                                            >
                                                <span className={row?.[columnIndex] == null ? "italic text-slate-400 dark:text-slate-500" : ""}>
                                                    {formatCellValue(row?.[columnIndex])}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
