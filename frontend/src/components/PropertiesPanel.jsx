import { Plus, Settings2, Trash2, GitBranch } from "lucide-react";
import { DB_DIALECTS, RELATION_TYPES } from "../types/databaseTypes.js";
import { createField } from "../utils/schemaFactory.js";

export default function PropertiesPanel({
                                            selectedTable,
                                            selectedRelation,
                                            dialect,
                                            onDialectChange,
                                            onUpdateTable,
                                            onDeleteField,
                                            onUpdateRelation,
                                            onDeleteRelation
                                        }) {
    const currentTypes = DB_DIALECTS[dialect]?.types || [];

    if (selectedRelation) {
        return (
            <RelationPropertiesPanel
                relation={selectedRelation}
                onUpdateRelation={onUpdateRelation}
                onDeleteRelation={onDeleteRelation}
            />
        );
    }

    if (!selectedTable) {
        return (
            <aside className="w-[340px] border-l border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                    <Settings2 className="mx-auto mb-3 text-slate-400" size={26} />

                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                        Ничего не выбрано
                    </h3>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Выберите таблицу или связь на canvas, чтобы редактировать свойства.
                    </p>
                </div>
            </aside>
        );
    }

    function updateTableName(name) {
        onUpdateTable({
            ...selectedTable,
            data: {
                ...selectedTable.data,
                name
            }
        });
    }

    function updateField(fieldId, patch) {
        const fields = selectedTable.data.fields.map((field) => {
            if (field.id !== fieldId) {
                return field;
            }

            return {
                ...field,
                ...patch
            };
        });

        onUpdateTable({
            ...selectedTable,
            data: {
                ...selectedTable.data,
                fields
            }
        });
    }

    function addField() {
        const fields = [
            ...selectedTable.data.fields,
            createField(`field_${selectedTable.data.fields.length + 1}`, currentTypes[0] || "TEXT")
        ];

        onUpdateTable({
            ...selectedTable,
            data: {
                ...selectedTable.data,
                fields
            }
        });
    }

    return (
        <aside className="w-[380px] overflow-y-auto border-l border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Диалект БД
                </div>

                <select
                    value={dialect}
                    onChange={(event) => onDialectChange(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                >
                    {Object.entries(DB_DIALECTS).map(([key, item]) => (
                        <option key={key} value={key}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mb-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Название таблицы
                </div>

                <input
                    value={selectedTable.data.name}
                    onChange={(event) => updateTableName(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                />
            </div>

            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        Поля таблицы
                    </h3>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Название, тип и признаки поля.
                    </p>
                </div>

                <button
                    onClick={addField}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                    <Plus size={16} />
                    Поле
                </button>
            </div>

            <div className="space-y-3">
                {selectedTable.data.fields.map((field) => (
                    <div
                        key={field.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <input
                                value={field.name}
                                onChange={(event) => updateField(field.id, { name: event.target.value })}
                                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                            />

                            <button
                                onClick={() => onDeleteField(selectedTable.id, field.id)}
                                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-red-950 dark:hover:text-red-400"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <select
                            value={field.type}
                            onChange={(event) => updateField(field.id, { type: event.target.value })}
                            className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                        >
                            {currentTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {[
                                ["pk", "PK"],
                                ["fk", "FK"],
                                ["unique", "Unique"],
                                ["nullable", "Nullable"]
                            ].map(([key, label]) => (
                                <label
                                    key={key}
                                    className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                >
                                    <input
                                        type="checkbox"
                                        checked={Boolean(field[key])}
                                        onChange={(event) => updateField(field.id, { [key]: event.target.checked })}
                                        className="rounded border-slate-300 text-blue-600"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}

function RelationPropertiesPanel({
                                     relation,
                                     onUpdateRelation,
                                     onDeleteRelation
                                 }) {
    const relationType = relation.data?.relationType || relation.label || "one-to-many";

    function updateRelationType(nextRelationType) {
        onUpdateRelation({
            ...relation,
            label: nextRelationType,
            data: {
                ...(relation.data || {}),
                relationType: nextRelationType
            }
        });
    }

    return (
        <aside className="w-[380px] overflow-y-auto border-l border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5 rounded-3xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <GitBranch size={24} />
                </div>

                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">
                    Связь между таблицами
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Здесь можно изменить тип связи или удалить выбранную связь.
                </p>
            </div>

            <div className="mb-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Тип связи
                </div>

                <select
                    value={relationType}
                    onChange={(event) => updateRelationType(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                >
                    {RELATION_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                            {type.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Текущее значение
                </div>

                <div className="font-mono text-sm font-bold text-blue-700 dark:text-blue-300">
                    {relationType}
                </div>
            </div>

            <div className="space-y-3">
                <RelationHint
                    title="one-to-one"
                    text="Одна запись из первой таблицы соответствует одной записи из второй."
                />

                <RelationHint
                    title="one-to-many"
                    text="Одна запись из первой таблицы может иметь много связанных записей во второй."
                />

                <RelationHint
                    title="many-to-many"
                    text="Много записей из первой таблицы могут быть связаны со многими записями из второй."
                />
            </div>

            <button
                onClick={() => onDeleteRelation(relation.id)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950"
            >
                <Trash2 size={17} />
                Удалить связь
            </button>
        </aside>
    );
}

function RelationHint({ title, text }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="font-mono text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {title}
            </div>

            <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {text}
            </div>
        </div>
    );
}