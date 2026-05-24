import { Handle, Position } from "reactflow";
import { Gauge, KeyRound, Link2, Settings, ShieldCheck, Table2 } from "lucide-react";

/**
 * Узел таблицы на React Flow. Он получает уже подготовленные поля и индексы,
 * а наружу сообщает только пользовательские действия по конкретной таблице.
 */
export default function TableNode({ data, selected }) {
    // Двойной клик нужен для быстрого перехода к настройкам таблицы,
    // но событие не должно всплывать до canvas и менять его selection.
    function handleDoubleClick(event) {
        event.stopPropagation();

        if (typeof data.onDoubleClick === "function") {
            data.onDoubleClick(data.name);
        }
    }

    // Records открываются по id таблицы: родитель найдет актуальный node сам.
    function openRecords(event) {
        event.stopPropagation();

        if (typeof data.onOpenRecords === "function") {
            data.onOpenRecords(data.tableId);
        }
    }

    // Настройки также живут на уровне редактора, а узел остается легким view.
    function openSettings(event) {
        event.stopPropagation();

        if (typeof data.onConfigure === "function") {
            data.onConfigure(data.tableId);
        }
    }

    const recordsCount = Array.isArray(data.records?.rows) ? data.records.rows.length : 0;
    const indexedFields = new Set();
    const detailLevel = data.detailLevel || "all-fields";

    // Индекс может охватывать несколько колонок. Для строки поля достаточно
    // быстрого множества имен, чтобы показать значок IDX без вложенных поисков.
    (data.indexes || []).forEach((indexItem) => {
        (indexItem.columns || []).forEach((column) => indexedFields.add(column));
    });

    const fields = Array.isArray(data.fields) ? data.fields : [];
    const visibleFields = detailLevel === "table-names"
        ? []
        : detailLevel === "keys-only"
            ? fields.filter((field) => field.pk || field.fk || field.unique || indexedFields.has(field.name))
            : fields;

    return (
        <div
            onDoubleClick={handleDoubleClick}
            className={[
                detailLevel === "table-names" ? "min-w-[220px]" : "min-w-[280px]",
                "overflow-hidden rounded-2xl border bg-white shadow-soft",
                "cursor-grab select-none active:cursor-grabbing dark:bg-slate-950",
                "font-sans tracking-[0.01em]",
                selected
                    ? "border-blue-500 ring-4 ring-blue-100 dark:ring-blue-950"
                    : "border-slate-200 dark:border-slate-700"
            ].join(" ")}
        >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="truncate text-[15px] font-extrabold uppercase tracking-wide text-slate-950 dark:text-slate-50">
                    {data.name}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={openRecords}
                        title={recordsCount > 0 ? `Open records: ${recordsCount}` : "Open records"}
                        className="nodrag flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                    >
                        <Table2 size={16} />
                    </button>

                    <button
                        type="button"
                        onClick={openSettings}
                        title="Table settings"
                        className="nodrag flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {detailLevel !== "table-names" && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visibleFields.map((field) => (
                        <FieldRow
                            key={field.id}
                            field={field}
                            indexedFields={indexedFields}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Отдельная строка поля содержит handles React Flow. По ним пользователь
 * соединяет конкретные колонки, а не таблицы целиком.
 */
function FieldRow({ field, indexedFields }) {
    return (
        <div className="relative flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <Handle
                type="target"
                position={Position.Left}
                id={`target-${field.id}`}
                className="nodrag !left-[-6px] !h-3 !w-3 !border-2 !border-white !bg-blue-600"
                isConnectable={true}
            />

            <div className="pointer-events-none min-w-0">
                <div className="flex items-center gap-2">
                    {field.pk && <KeyRound size={14} className="text-amber-500" />}
                    {field.fk && <Link2 size={14} className="text-blue-500" />}
                    {field.unique && (
                        <ShieldCheck size={14} className="text-emerald-500" />
                    )}
                    {indexedFields.has(field.name) && !field.unique && (
                        <Gauge size={14} className="text-violet-500" />
                    )}

                    <span className="truncate text-[14px] font-bold text-slate-900 dark:text-slate-50">
                        {field.name}
                    </span>
                </div>

                <div className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {field.type}
                    {!field.nullable && " - NOT NULL"}
                    {indexedFields.has(field.name) && " - IDX"}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                id={`source-${field.id}`}
                className="nodrag !right-[-6px] !h-3 !w-3 !border-2 !border-white !bg-blue-600"
                isConnectable={true}
            />
        </div>
    );
}
