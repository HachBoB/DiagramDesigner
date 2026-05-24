import { Plus, Settings2, Trash2, GitBranch, Gauge } from "lucide-react";
import { DB_DIALECTS, RELATION_TYPES } from "../types/databaseTypes.js";
import { createField, createIndex } from "../utils/schemaFactory.js";

/**
 * Правая панель свойств редактирует выбранную таблицу: имя, поля, Records
 * и индексы. Изменения поднимаются в editor через переданные callbacks.
 */
export default function PropertiesPanel({
                                            selectedTable,
                                            selectedRelation,
                                            dialect,
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

    function updateIndexes(indexes) {
        onUpdateTable({
            ...selectedTable,
            data: {
                ...selectedTable.data,
                indexes
            }
        });
    }

    function addIndex() {
        // Новый индекс сразу получает подходящую колонку, чтобы пользователь не видел пустой блок.
        const firstField = selectedTable.data.fields.find((field) => !field.pk)
            || selectedTable.data.fields[0];
        const indexes = [
            ...(selectedTable.data.indexes || []),
            {
                ...createIndex(firstField ? [firstField.name] : []),
                name: firstField ? `idx_${selectedTable.data.name}_${firstField.name}` : ""
            }
        ];

        updateIndexes(indexes);
    }

    function updateIndex(indexId, patch) {
        const indexes = (selectedTable.data.indexes || []).map((indexItem) => {
            if (indexItem.id !== indexId) {
                return indexItem;
            }

            return {
                ...indexItem,
                ...patch
            };
        });

        updateIndexes(indexes);
    }

    function deleteIndex(indexId) {
        updateIndexes((selectedTable.data.indexes || []).filter((indexItem) => indexItem.id !== indexId));
    }

    function buildIndexName(columns) {
        const normalizedColumns = Array.isArray(columns)
            ? columns.filter(Boolean)
            : [];

        return `idx_${selectedTable.data.name}_${normalizedColumns.join("_") || "fields"}`;
    }

    // Автоимя следует за выбранными колонками, но ручное имя пользователя не перетираем.
    function getIndexNamePatch(indexItem, nextColumns) {
        const currentColumns = Array.isArray(indexItem.columns) ? indexItem.columns : [];
        const currentAutoName = buildIndexName(currentColumns);
        const hasManualName = Boolean(indexItem.name) && indexItem.name !== currentAutoName;

        // Пустой patch оставляет введенное пользователем имя без изменений.
        return hasManualName
            ? {}
            : { name: buildIndexName(nextColumns) };
    }

    function addIndexColumn(indexItem, columnName) {
        if (!columnName) {
            return;
        }

        const columns = Array.isArray(indexItem.columns) ? indexItem.columns : [];

        if (columns.includes(columnName)) {
            return;
        }

        updateIndex(indexItem.id, {
            columns: [...columns, columnName],
            ...getIndexNamePatch(indexItem, [...columns, columnName])
        });
    }

    function removeIndexColumn(indexItem, columnName) {
        const nextColumns = (indexItem.columns || []).filter((item) => item !== columnName);

        updateIndex(indexItem.id, {
            columns: nextColumns,
            ...getIndexNamePatch(indexItem, nextColumns)
        });
    }

    return (
        <aside className="w-[380px] overflow-y-auto border-l border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Диалект БД
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    {DB_DIALECTS[dialect]?.label || dialect}
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Диалект выбирается только при создании проекта.
                </p>
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

            <div className="mt-7 mb-3 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        Индексы
                    </h3>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Ускоряют поиск и могут быть уникальными.
                    </p>
                </div>

                <button
                    onClick={addIndex}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                >
                    <Plus size={16} />
                    Индекс
                </button>
            </div>

            <div className="space-y-3">
                {(selectedTable.data.indexes || []).length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Индексов пока нет. Можно добавить индекс на одно поле или составной индекс через запятую.
                    </div>
                )}

                {(selectedTable.data.indexes || []).map((indexItem) => (
                    <div
                        key={indexItem.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                                <Gauge size={16} />
                            </div>

                            <input
                                value={indexItem.name || ""}
                                onChange={(event) => updateIndex(indexItem.id, { name: event.target.value })}
                                placeholder={`idx_${selectedTable.data.name}`}
                                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                            />

                            <button
                                onClick={() => deleteIndex(indexItem.id)}
                                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-red-950 dark:hover:text-red-400"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="mb-3">
                            <select
                                value=""
                                onChange={(event) => {
                                    addIndexColumn(indexItem, event.target.value);
                                    event.target.value = "";
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                            >
                                <option value="">Выбрать поле для индекса</option>
                                {selectedTable.data.fields
                                    .filter((field) => !(indexItem.columns || []).includes(field.name))
                                    .map((field) => (
                                        <option key={field.id} value={field.name}>
                                            {field.name} - {field.type}
                                        </option>
                                    ))}
                            </select>

                            <div className="mt-2 flex flex-wrap gap-2">
                                {(indexItem.columns || []).length === 0 && (
                                    <div className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                        Поля не выбраны
                                    </div>
                                )}

                                {(indexItem.columns || []).map((column) => (
                                    <button
                                        key={column}
                                        type="button"
                                        onClick={() => removeIndexColumn(indexItem, column)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900"
                                        title="Убрать поле из индекса"
                                    >
                                        {column}
                                        <span className="text-blue-400">x</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <input
                            value={(indexItem.columns || []).join(", ")}
                            onChange={(event) => updateIndex(indexItem.id, {
                                columns: event.target.value
                                    .split(",")
                                    .map((column) => column.trim())
                                    .filter(Boolean)
                            })}
                            placeholder="email или user_id, status"
                            className="hidden"
                        />

                        <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                            <input
                                type="checkbox"
                                checked={Boolean(indexItem.unique)}
                                onChange={(event) => updateIndex(indexItem.id, { unique: event.target.checked })}
                                className="rounded border-slate-300 text-blue-600"
                            />
                            Unique index
                        </label>
                    </div>
                ))}
            </div>
        </aside>
    );
}

/**
 * Когда выбран edge, панель переключается с таблицы на тип связи и подсказку,
 * какие поля сейчас соединены.
 */
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

// Короткая поясняющая строка в панели выбранной связи.
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
