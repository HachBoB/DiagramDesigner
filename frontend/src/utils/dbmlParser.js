import { createRelationEdge } from "./schemaFactory.js";

function createParserError(line, column, message, hint = "") {
    return {
        line,
        column,
        message,
        hint
    };
}

function parseFlags(rawFlags = "", lineNumber = 1) {
    const allowedFlags = ["pk", "fk", "unique", "not null", "nullable"];

    const flags = rawFlags
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

    const errors = [];

    flags.forEach((flag) => {
        if (!allowedFlags.includes(flag)) {
            errors.push(
                createParserError(
                    lineNumber,
                    1,
                    `Unknown field option "${flag}"`,
                    `Допустимые признаки: ${allowedFlags.join(", ")}.`
                )
            );
        }
    });

    return {
        result: {
            pk: flags.includes("pk"),
            fk: flags.includes("fk"),
            unique: flags.includes("unique"),
            nullable: flags.includes("nullable") || !flags.includes("not null")
        },
        errors
    };
}

function getExistingPosition(existingNodes, tableName, index) {
    const existingNode = existingNodes.find((node) => {
        return node.data?.name === tableName;
    });

    if (existingNode?.position) {
        return existingNode.position;
    }

    return {
        x: 360 + (index % 2) * 380,
        y: 100 + Math.floor(index / 2) * 280
    };
}

function getExistingTableId(existingNodes, tableName) {
    const existingNode = existingNodes.find((node) => {
        return node.data?.name === tableName;
    });

    return existingNode?.id || crypto.randomUUID();
}

function getExistingFieldId(existingNodes, tableName, fieldName) {
    const existingNode = existingNodes.find((node) => {
        return node.data?.name === tableName;
    });

    const existingField = existingNode?.data?.fields?.find((field) => {
        return field.name === fieldName;
    });

    return existingField?.id || crypto.randomUUID();
}

function getExistingIndexId(existingNodes, tableName, indexName, columns) {
    const existingNode = existingNodes.find((node) => {
        return node.data?.name === tableName;
    });

    const normalizedColumns = columns.join(",");
    const existingIndex = existingNode?.data?.indexes?.find((item) => {
        if (indexName && item.name === indexName) {
            return true;
        }

        return Array.isArray(item.columns) && item.columns.join(",") === normalizedColumns;
    });

    return existingIndex?.id || crypto.randomUUID();
}

function parseFieldLine(line, lineNumber, tableName, existingNodes) {
    const errors = [];

    if (line.includes("[") && !line.includes("]")) {
        errors.push(
            createParserError(
                lineNumber,
                line.indexOf("[") + 1,
                'Missing closing bracket "]"',
                "Закрой список признаков поля. Например: id SERIAL [pk, unique, not null]"
            )
        );

        return {
            field: null,
            errors
        };
    }

    if (!line.includes("[") && line.includes("]")) {
        errors.push(
            createParserError(
                lineNumber,
                line.indexOf("]") + 1,
                'Unexpected closing bracket "]"',
                "Убери лишнюю скобку или добавь открывающую [. "
            )
        );

        return {
            field: null,
            errors
        };
    }

    let fieldPart = line;
    let rawFlags = "";

    const flagsStart = line.indexOf("[");

    if (flagsStart !== -1) {
        const flagsEnd = line.lastIndexOf("]");

        fieldPart = line.slice(0, flagsStart).trim();
        rawFlags = line.slice(flagsStart + 1, flagsEnd).trim();

        const afterFlags = line.slice(flagsEnd + 1).trim();

        if (afterFlags) {
            errors.push(
                createParserError(
                    lineNumber,
                    flagsEnd + 2,
                    `Unexpected token "${afterFlags}" after field options`,
                    "После закрывающей ] в строке поля ничего быть не должно."
                )
            );
        }
    }

    const fieldMatch = fieldPart.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+(.+)$/);

    if (!fieldMatch) {
        errors.push(
            createParserError(
                lineNumber,
                1,
                `Invalid field declaration "${line}"`,
                "Формат поля: field_name TYPE [pk, unique, not null]"
            )
        );

        return {
            field: null,
            errors
        };
    }

    const [, fieldName, rawType] = fieldMatch;
    const type = rawType.trim();

    if (!type) {
        errors.push(
            createParserError(
                lineNumber,
                fieldName.length + 2,
                `Missing type for field "${fieldName}"`,
                "Укажи тип данных. Например: id SERIAL [pk]"
            )
        );
    }

    const parsedFlags = parseFlags(rawFlags, lineNumber);
    errors.push(...parsedFlags.errors);

    return {
        field: {
            id: getExistingFieldId(existingNodes, tableName, fieldName),
            name: fieldName,
            type,
            ...parsedFlags.result
        },
        errors
    };
}

function parseIndexLine(line, lineNumber, tableName, indexNumber, existingNodes) {
    const errors = [];

    if (line.includes("[") && !line.includes("]")) {
        return {
            index: null,
            errors: [
                createParserError(
                    lineNumber,
                    line.indexOf("[") + 1,
                    'Missing closing bracket "]"',
                    "Закрой список настроек индекса. Например: email [unique]"
                )
            ]
        };
    }

    let indexPart = line;
    let rawFlags = "";
    const flagsStart = line.indexOf("[");

    if (flagsStart !== -1) {
        const flagsEnd = line.lastIndexOf("]");
        indexPart = line.slice(0, flagsStart).trim();
        rawFlags = line.slice(flagsStart + 1, flagsEnd).trim();
    }

    const flags = rawFlags
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

    flags.forEach((flag) => {
        if (flag !== "unique") {
            errors.push(
                createParserError(
                    lineNumber,
                    1,
                    `Unknown index option "${flag}"`,
                    'Для индексов пока доступен только флаг "unique".'
                )
            );
        }
    });

    let name = "";
    let rawColumns = indexPart;
    const namedCompositeMatch = indexPart.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+\(([^)]*)\)$/);
    const compositeMatch = indexPart.match(/^\(([^)]*)\)$/);
    const namedSingleMatch = indexPart.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);

    if (namedCompositeMatch) {
        name = namedCompositeMatch[1];
        rawColumns = namedCompositeMatch[2];
    } else if (compositeMatch) {
        rawColumns = compositeMatch[1];
    } else if (namedSingleMatch) {
        name = namedSingleMatch[1];
        rawColumns = namedSingleMatch[2];
    }

    const columns = rawColumns
        .split(",")
        .map((column) => column.trim())
        .filter(Boolean);

    if (columns.length === 0) {
        errors.push(
            createParserError(
                lineNumber,
                1,
                "Index must include at least one column",
                "Пример: email [unique] или (user_id, status)"
            )
        );
    }

    columns.forEach((column) => {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
            errors.push(
                createParserError(
                    lineNumber,
                    1,
                    `Invalid index column "${column}"`,
                    "Колонки индекса должны совпадать с названиями полей таблицы."
                )
            );
        }
    });

    return {
        index: columns.length > 0
            ? {
                id: getExistingIndexId(existingNodes, tableName, name, columns),
                name: name || `idx_${tableName}_${columns.join("_") || indexNumber}`,
                columns,
                unique: flags.includes("unique")
            }
            : null,
        errors
    };
}

function stripInlineComment(value) {
    const line = String(value || "");
    let quote = null;

    for (let index = 0; index < line.length - 1; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if ((char === "'" || char === "\"") && line[index - 1] !== "\\") {
            quote = quote === char ? null : quote || char;
        }

        if (!quote && char === "/" && nextChar === "/") {
            return line.slice(0, index);
        }
    }

    return line;
}

function parseRefLine(line, lineNumber) {
    const refRegex =
        /^Ref\s+([a-z-]+):\s+([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\s*>\s*([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\s*$/;

    const match = line.match(refRegex);

    if (!match) {
        return {
            ref: null,
            errors: [
                createParserError(
                    lineNumber,
                    1,
                    `Invalid relation declaration "${line}"`,
                    "Формат связи: Ref one-to-many: users.id > orders.user_id"
                )
            ]
        };
    }

    const [, relationType, sourceTable, sourceField, targetTable, targetField] = match;

    const allowedRelations = ["one-to-one", "one-to-many", "many-to-many"];

    if (!allowedRelations.includes(relationType)) {
        return {
            ref: null,
            errors: [
                createParserError(
                    lineNumber,
                    5,
                    `Unknown relation type "${relationType}"`,
                    `Допустимые типы связей: ${allowedRelations.join(", ")}.`
                )
            ]
        };
    }

    return {
        ref: {
            relationType,
            sourceTable,
            sourceField,
            targetTable,
            targetField
        },
        errors: []
    };
}

function splitRecordValues(line) {
    const values = [];
    let current = "";
    let quote = null;
    let isEscaped = false;

    for (const char of line) {
        if (isEscaped) {
            current += char;
            isEscaped = false;
            continue;
        }

        if (char === "\\") {
            current += char;
            isEscaped = true;
            continue;
        }

        if ((char === "'" || char === "\"") && !quote) {
            quote = char;
            current += char;
            continue;
        }

        if (char === quote) {
            quote = null;
            current += char;
            continue;
        }

        if (char === "," && !quote) {
            values.push(current.trim());
            current = "";
            continue;
        }

        current += char;
    }

    values.push(current.trim());

    return {
        values,
        hasOpenQuote: Boolean(quote)
    };
}

function parseRecordValue(value) {
    const trimmed = value.trim();

    if (!trimmed) {
        return "";
    }

    if (/^null$/i.test(trimmed)) {
        return null;
    }

    if (/^true$/i.test(trimmed)) {
        return true;
    }

    if (/^false$/i.test(trimmed)) {
        return false;
    }

    if (
        (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    ) {
        return trimmed
            .slice(1, -1)
            .replace(/\\'/g, "'")
            .replace(/\\"/g, "\"")
            .replace(/\\\\/g, "\\");
    }

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return Number(trimmed);
    }

    return trimmed;
}

function parseRecordsHeader(line, lineNumber) {
    const recordsMatch = line.match(
        /^Records\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*\{\s*$/
    );

    if (!recordsMatch) {
        return {
            records: null,
            errors: [
                createParserError(
                    lineNumber,
                    1,
                    `Invalid records declaration "${line}"`,
                    "Формат записей: Records users(id, username, role) {"
                )
            ]
        };
    }

    const [, tableName, rawColumns] = recordsMatch;
    const columns = rawColumns
        .split(",")
        .map((column) => column.trim())
        .filter(Boolean);

    const errors = [];
    const usedColumns = new Set();

    columns.forEach((column) => {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
            errors.push(
                createParserError(
                    lineNumber,
                    1,
                    `Invalid records column "${column}"`,
                    "Названия колонок должны совпадать с полями таблицы."
                )
            );
            return;
        }

        if (usedColumns.has(column)) {
            errors.push(
                createParserError(
                    lineNumber,
                    1,
                    `Duplicate records column "${column}"`,
                    "Колонки в блоке Records не должны повторяться."
                )
            );
            return;
        }

        usedColumns.add(column);
    });

    if (columns.length === 0) {
        errors.push(
            createParserError(
                lineNumber,
                1,
                `Records block for "${tableName}" has no columns`,
                "Укажи хотя бы одну колонку в скобках."
            )
        );
    }

    return {
        records: {
            tableName,
            columns,
            rows: []
        },
        errors
    };
}

export function parseDBMLToSchema(text, existingNodes = []) {
    const lines = String(text || "").split("\n");
    const errors = [];
    const tables = [];
    const refs = [];
    const recordsBlocks = [];

    let index = 0;

    while (index < lines.length) {
        const rawLine = lines[index];
        const line = stripInlineComment(rawLine).trim();
        const lineNumber = index + 1;

        if (!line || line.startsWith("//")) {
            index += 1;
            continue;
        }

        if (line.startsWith("Table")) {
            const tableMatch = line.match(/^Table\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{\s*$/);

            if (!tableMatch) {
                errors.push(
                    createParserError(
                        lineNumber,
                        1,
                        `Invalid table declaration "${line}"`,
                        "Формат таблицы: Table users {"
                    )
                );

                index += 1;
                continue;
            }

            const tableName = tableMatch[1];
            const fields = [];
            const indexes = [];
            const usedFieldNames = new Set();
            const tableStartLine = lineNumber;

            index += 1;

            let closed = false;

            while (index < lines.length) {
                const fieldRawLine = lines[index];
                const fieldLine = stripInlineComment(fieldRawLine).trim();
                const fieldLineNumber = index + 1;

                if (!fieldLine || fieldLine.startsWith("//")) {
                    index += 1;
                    continue;
                }

                if (fieldLine === "}") {
                    closed = true;
                    index += 1;
                    break;
                }

                if (/^Indexes\s*\{\s*$/i.test(fieldLine)) {
                    index += 1;
                    let indexesClosed = false;

                    while (index < lines.length) {
                        const indexRawLine = lines[index];
                        const indexLine = stripInlineComment(indexRawLine).trim();
                        const indexLineNumber = index + 1;

                        if (!indexLine || indexLine.startsWith("//")) {
                            index += 1;
                            continue;
                        }

                        if (indexLine === "}") {
                            indexesClosed = true;
                            index += 1;
                            break;
                        }

                        if (indexLine.startsWith("Table") || indexLine.startsWith("Ref") || indexLine.startsWith("Records")) {
                            errors.push(
                                createParserError(
                                    indexLineNumber,
                                    1,
                                    `Unexpected declaration inside Indexes "${tableName}"`,
                                    `Закрой блок Indexes таблицы "${tableName}" символом }, а затем объявляй следующую сущность.`
                                )
                            );
                            break;
                        }

                        const parsedIndex = parseIndexLine(indexLine, indexLineNumber, tableName, indexes.length + 1, existingNodes);
                        errors.push(...parsedIndex.errors);

                        if (parsedIndex.index) {
                            indexes.push(parsedIndex.index);
                        }

                        index += 1;
                    }

                    if (!indexesClosed) {
                        errors.push(
                            createParserError(
                                lines.length,
                                Math.max(1, lines[lines.length - 1]?.length || 1),
                                `Missing closing brace "}" for indexes "${tableName}"`,
                                `Блок Indexes таблицы "${tableName}" должен закрываться символом }.`
                            )
                        );
                    }

                    continue;
                }

                if (fieldLine.startsWith("Table")) {
                    errors.push(
                        createParserError(
                            fieldLineNumber,
                            1,
                            `Unexpected table declaration inside table "${tableName}"`,
                            `Скорее всего, выше пропущена закрывающая фигурная скобка } для таблицы "${tableName}".`
                        )
                    );

                    break;
                }

                if (fieldLine.startsWith("Ref")) {
                    errors.push(
                        createParserError(
                            fieldLineNumber,
                            1,
                            `Relation cannot be declared inside table "${tableName}"`,
                            `Закрой таблицу "${tableName}" символом }, а затем объяви связь.`
                        )
                    );

                    index += 1;
                    continue;
                }

                const parsedField = parseFieldLine(
                    fieldLine,
                    fieldLineNumber,
                    tableName,
                    existingNodes
                );

                errors.push(...parsedField.errors);

                if (parsedField.field) {
                    if (usedFieldNames.has(parsedField.field.name)) {
                        errors.push(
                            createParserError(
                                fieldLineNumber,
                                1,
                                `Duplicate field "${parsedField.field.name}" in table "${tableName}"`,
                                "Названия полей внутри одной таблицы должны быть уникальными."
                            )
                        );
                    } else {
                        usedFieldNames.add(parsedField.field.name);
                        fields.push(parsedField.field);
                    }
                }

                index += 1;
            }

            if (!closed) {
                errors.push(
                    createParserError(
                        lines.length,
                        Math.max(1, lines[lines.length - 1]?.length || 1),
                        `Missing closing brace "}" for table "${tableName}"`,
                        `Таблица была открыта на строке ${tableStartLine}. Добавь } после последнего поля таблицы.`
                    )
                );
            }

            const duplicateTable = tables.find((table) => table.name === tableName);

            if (duplicateTable) {
                errors.push(
                    createParserError(
                        tableStartLine,
                        1,
                        `Duplicate table "${tableName}"`,
                        "Названия таблиц должны быть уникальными."
                    )
                );
            }

            tables.push({
                id: getExistingTableId(existingNodes, tableName),
                name: tableName,
                fields,
                indexes
            });

            continue;
        }

        if (line.startsWith("Ref")) {
            const parsedRef = parseRefLine(line, lineNumber);

            errors.push(...parsedRef.errors);

            if (parsedRef.ref) {
                refs.push(parsedRef.ref);
            }

            index += 1;
            continue;
        }

        if (line.startsWith("Records")) {
            const parsedHeader = parseRecordsHeader(line, lineNumber);
            errors.push(...parsedHeader.errors);

            if (!parsedHeader.records) {
                index += 1;
                continue;
            }

            const records = parsedHeader.records;
            const recordsStartLine = lineNumber;

            index += 1;

            let closed = false;

            while (index < lines.length) {
                const rowRawLine = lines[index];
                const rowLine = stripInlineComment(rowRawLine).trim();
                const rowLineNumber = index + 1;

                if (!rowLine || rowLine.startsWith("//")) {
                    index += 1;
                    continue;
                }

                if (rowLine === "}") {
                    closed = true;
                    index += 1;
                    break;
                }

                if (rowLine.startsWith("Table") || rowLine.startsWith("Ref") || rowLine.startsWith("Records")) {
                    errors.push(
                        createParserError(
                            rowLineNumber,
                            1,
                            `Unexpected declaration inside Records "${records.tableName}"`,
                            `Закрой блок Records "${records.tableName}" символом }, а затем объявляй следующую сущность.`
                        )
                    );

                    break;
                }

                const parsedRow = splitRecordValues(rowLine);

                if (parsedRow.hasOpenQuote) {
                    errors.push(
                        createParserError(
                            rowLineNumber,
                            rowLine.length,
                            "Missing closing quote in record row",
                            "Закрой строковое значение одинарной или двойной кавычкой."
                        )
                    );
                }

                if (parsedRow.values.length !== records.columns.length) {
                    errors.push(
                        createParserError(
                            rowLineNumber,
                            1,
                            `Records row has ${parsedRow.values.length} values, expected ${records.columns.length}`,
                            "Количество значений в строке должно совпадать с количеством колонок в Records."
                        )
                    );
                } else {
                    records.rows.push(parsedRow.values.map(parseRecordValue));
                }

                index += 1;
            }

            if (!closed) {
                errors.push(
                    createParserError(
                        lines.length,
                        Math.max(1, lines[lines.length - 1]?.length || 1),
                        `Missing closing brace "}" for records "${records.tableName}"`,
                        `Блок Records был открыт на строке ${recordsStartLine}. Добавь } после последней строки записей.`
                    )
                );
            }

            recordsBlocks.push(records);

            continue;
        }

        if (line === "}") {
            errors.push(
                createParserError(
                    lineNumber,
                    1,
                    'Unexpected closing brace "}"',
                    "Эта скобка закрывает таблицу, которая не была открыта."
                )
            );

            index += 1;
            continue;
        }

        errors.push(
            createParserError(
                lineNumber,
                1,
                `Invalid start of statement "${line}"`,
                "Ожидалось объявление таблицы Table ... { или связи Ref ..."
            )
        );

        index += 1;
    }

    const nodes = tables.map((table, tableIndex) => {
        const records = recordsBlocks.find((item) => item.tableName === table.name);

        return {
            id: table.id,
            type: "tableNode",
            position: getExistingPosition(existingNodes, table.name, tableIndex),
            data: {
                tableId: table.id,
                name: table.name,
                fields: table.fields,
                indexes: table.indexes,
                records: records
                    ? {
                        columns: records.columns,
                        rows: records.rows
                    }
                    : {
                        columns: [],
                        rows: []
                    }
            }
        };
    });

    recordsBlocks.forEach((records) => {
        const table = tables.find((item) => item.name === records.tableName);

        if (!table) {
            errors.push(
                createParserError(
                    1,
                    1,
                    `Records declared for unknown table "${records.tableName}"`,
                    "Сначала объяви таблицу, а затем добавь для нее блок Records."
                )
            );
            return;
        }

        records.columns.forEach((column) => {
            const fieldExists = table.fields.some((field) => field.name === column);

            if (!fieldExists) {
                errors.push(
                    createParserError(
                        1,
                        1,
                        `Unknown field "${records.tableName}.${column}" in Records`,
                        "Колонки Records должны совпадать с полями таблицы."
                    )
                );
            }
        });
    });

    tables.forEach((table) => {
        table.indexes.forEach((indexItem) => {
            indexItem.columns.forEach((column) => {
                const fieldExists = table.fields.some((field) => field.name === column);

                if (!fieldExists) {
                    errors.push(
                        createParserError(
                            1,
                            1,
                            `Unknown field "${table.name}.${column}" in Indexes`,
                            "Колонки в Indexes должны совпадать с полями этой таблицы."
                        )
                    );
                }
            });
        });
    });

    const edges = [];

    refs.forEach((ref) => {
        const sourceNode = nodes.find((node) => node.data.name === ref.sourceTable);
        const targetNode = nodes.find((node) => node.data.name === ref.targetTable);

        if (!sourceNode) {
            errors.push(
                createParserError(
                    1,
                    1,
                    `Unknown source table "${ref.sourceTable}" in relation`,
                    "Проверь, что таблица существует выше в коде."
                )
            );

            return;
        }

        if (!targetNode) {
            errors.push(
                createParserError(
                    1,
                    1,
                    `Unknown target table "${ref.targetTable}" in relation`,
                    "Проверь, что таблица существует выше в коде."
                )
            );

            return;
        }

        const sourceField = sourceNode.data.fields.find((field) => {
            return field.name === ref.sourceField;
        });

        const targetField = targetNode.data.fields.find((field) => {
            return field.name === ref.targetField;
        });

        if (!sourceField) {
            errors.push(
                createParserError(
                    1,
                    1,
                    `Unknown field "${ref.sourceTable}.${ref.sourceField}" in relation`,
                    "Проверь название поля в левой части связи."
                )
            );

            return;
        }

        if (!targetField) {
            errors.push(
                createParserError(
                    1,
                    1,
                    `Unknown field "${ref.targetTable}.${ref.targetField}" in relation`,
                    "Проверь название поля в правой части связи."
                )
            );

            return;
        }

        edges.push(
            createRelationEdge(
                sourceNode.id,
                targetNode.id,
                `source-${sourceField.id}`,
                `target-${targetField.id}`,
                ref.relationType
            )
        );
    });

    return {
        nodes,
        edges,
        errors
    };
}
