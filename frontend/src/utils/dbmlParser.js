import { createRelationEdge } from "./schemaFactory.js";
import { createId } from "./createId.js";

/*
 * DBML parser читает не полный стандарт DBML, а наш небольшой DBML-like формат редактора.
 * Он специально line-oriented: пользователю проще получить ошибку "на строке 12",
 * а нам проще поддерживать блоки вида:
 *
 * Table users { ... }
 * Ref one-to-many: users.id > orders.user_id
 * Records users(id, email) { ... }
 *
 * Сначала текст собирается в промежуточные tables/refs/records,
 * а React Flow nodes и edges создаются позже, когда уже известны все имена и поля.
 */

// Все ошибки parser возвращает в одной форме, чтобы SqlEditor показал строку, колонку и подсказку.
function createParserError(line, column, message, hint = "") {
    return {
        line,
        column,
        message,
        hint
    };
}

function parseFlags(rawFlags = "", lineNumber = 1) {
    // Формат flags простой: элементы разделены запятыми внутри квадратных скобок поля.
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
            // В текстовом формате отсутствие "not null" означает nullable по умолчанию.
            pk: flags.includes("pk"),
            fk: flags.includes("fk"),
            unique: flags.includes("unique"),
            nullable: flags.includes("nullable") || !flags.includes("not null")
        },
        errors
    };
}

// При редактировании текста сохраняем прежнюю позицию таблицы, если имя таблицы не поменялось.
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

// Стабильный table id не дает React Flow считать старую таблицу удаленной при каждом вводе текста.
function getExistingTableId(existingNodes, tableName) {
    const existingNode = existingNodes.find((node) => {
        return node.data?.name === tableName;
    });

    return existingNode?.id || createId();
}

// Стабильный field id нужен связям: edge привязан к handle поля, а не только к имени.
function getExistingFieldId(existingNodes, tableName, fieldName) {
    const existingNode = existingNodes.find((node) => {
        return node.data?.name === tableName;
    });

    const existingField = existingNode?.data?.fields?.find((field) => {
        return field.name === fieldName;
    });

    return existingField?.id || createId();
}

// Index id сохраняем по имени или составу колонок, чтобы UI не пересоздавал карточку индекса.
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

    return existingIndex?.id || createId();
}

// Парсим поле отдельно, чтобы ошибки в одной строке не рушили весь Table-блок.
function parseFieldLine(line, lineNumber, tableName, existingNodes) {
    const errors = [];

    // Квадратные скобки нужны только для списка flags после типа поля.
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

    // fieldPart оставляем для "name TYPE", а rawFlags отдельно для parseFlags.
    let fieldPart = line;
    let rawFlags = "";

    const flagsStart = line.indexOf("[");

    if (flagsStart !== -1) {
        const flagsEnd = line.lastIndexOf("]");

        // Все после закрывающей ] считается ошибкой, иначе опечатка потерялась бы без следа.
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

    // Минимальный валидный field declaration: имя поля и хотя бы один токен типа.
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

    // Flags парсим после имени и типа, чтобы даже при ошибке flag сохранить само поле.
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

    // В Indexes поддерживаем короткие формы: email, idx_email email, (a, b), idx_ab (a, b).
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
        // Сейчас для индекса в скобках разрешен только [unique].
        const flagsEnd = line.lastIndexOf("]");
        indexPart = line.slice(0, flagsStart).trim();
        rawFlags = line.slice(flagsStart + 1, flagsEnd).trim();
    }

    const flags = rawFlags
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

    // Неизвестный flag не ломает всю таблицу, а появляется отдельной ошибкой редактора.
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

    // Сначала отделяем имя индекса от списка колонок, если пользователь его указал.
    if (namedCompositeMatch) {
        name = namedCompositeMatch[1];
        rawColumns = namedCompositeMatch[2];
    } else if (compositeMatch) {
        rawColumns = compositeMatch[1];
    } else if (namedSingleMatch) {
        name = namedSingleMatch[1];
        rawColumns = namedSingleMatch[2];
    }

    // Колонки остаются строками; существование полей проверится после полного разбора таблиц.
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

    // Новые таблицы из кода раскладываем сеткой, иначе они появились бы в одной точке canvas.
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
    // Комментарий // внутри строки Records или note значения не обрезаем.
    let quote = null;

    for (let index = 0; index < line.length - 1; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if ((char === "'" || char === "\"") && line[index - 1] !== "\\") {
            // quote переключается только на неэкранированной кавычке.
            quote = quote === char ? null : quote || char;
        }

        if (!quote && char === "/" && nextChar === "/") {
            return line.slice(0, index);
        }
    }

    return line;
}

function parseRefLine(line, lineNumber) {
    // Ref задает одну направленную связь в читаемом виде: source.field > target.field.
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

    // Список типов синхронизирован с вариантами отношения в PropertiesPanel.
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

// Строка Records похожа на CSV: запятые в кавычках остаются частью значения.
function splitRecordValues(line) {
    const values = [];
    let current = "";
    // quote говорит, что запятая относится к строке, а не разделяет колонки Records.
    let quote = null;
    // Backslash нужен, чтобы следующая кавычка не закрыла значение преждевременно.
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
            // Только запятая вне строки завершает одно значение records row.
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

    // Пустая ячейка остается пустой строкой, а null должен быть написан явно.
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
        // У строк снимаем внешние кавычки и возвращаем пользовательские escape-последовательности.
        return trimmed
            .slice(1, -1)
            .replace(/\\'/g, "'")
            .replace(/\\"/g, "\"")
            .replace(/\\\\/g, "\\");
    }

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        // Числа храним числами, чтобы Records modal и SQL export не квотировали их как текст.
        return Number(trimmed);
    }

    return trimmed;
}

function parseRecordsHeader(line, lineNumber) {
    // Header заранее фиксирует порядок колонок для всех следующих rows блока Records.
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

    // На этом этапе проверяем форму имен и дубли, а наличие полей сверяем позже с таблицей.
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

/**
 * Превращает DBML-like текст редактора обратно в nodes и edges.
 * Сохраняем id и позиции существующих таблиц, чтобы печать в коде не дергала canvas.
 */
export function parseDBMLToSchema(text, existingNodes = []) {
    const lines = String(text || "").split("\n");
    const errors = [];
    const tables = [];
    const refs = [];
    const recordsBlocks = [];

    let index = 0;

    // Первый проход читает верхнеуровневые блоки в том порядке, в котором их набрал пользователь.
    while (index < lines.length) {
        const rawLine = lines[index];
        // Комментарий справа от кода не должен влиять на синтаксис line parser.
        const line = stripInlineComment(rawLine).trim();
        const lineNumber = index + 1;

        if (!line || line.startsWith("//")) {
            // Пустые строки и комментарии разрешены между любыми блоками.
            index += 1;
            continue;
        }

        if (line.startsWith("Table")) {
            // Заголовок Table открывает отдельный вложенный цикл чтения fields/Indexes.
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
            // Пока Table не закрыт, поля и индексы храним во временных массивах этой таблицы.
            const fields = [];
            const indexes = [];
            const usedFieldNames = new Set();
            const tableStartLine = lineNumber;

            index += 1;

            let closed = false;

            // Внутри Table принимаем поля и вложенный Indexes до закрывающей скобки таблицы.
            while (index < lines.length) {
                const fieldRawLine = lines[index];
                const fieldLine = stripInlineComment(fieldRawLine).trim();
                const fieldLineNumber = index + 1;

                if (!fieldLine || fieldLine.startsWith("//")) {
                    index += 1;
                    continue;
                }

                if (fieldLine === "}") {
                    // Эта скобка закрывает Table, если мы не находимся во вложенном Indexes.
                    closed = true;
                    index += 1;
                    break;
                }

                if (/^Indexes\s*\{\s*$/i.test(fieldLine)) {
                    // Indexes разрешен только внутри Table и имеет собственный цикл чтения.
                    index += 1;
                    let indexesClosed = false;

                    // Indexes имеет свой уровень закрытия, его нельзя спутать со скобкой Table.
                    while (index < lines.length) {
                        const indexRawLine = lines[index];
                        const indexLine = stripInlineComment(indexRawLine).trim();
                        const indexLineNumber = index + 1;

                        if (!indexLine || indexLine.startsWith("//")) {
                            index += 1;
                            continue;
                        }

                        if (indexLine === "}") {
                            // Эта скобка закрывает только Indexes; внешний Table остается открытым.
                            indexesClosed = true;
                            index += 1;
                            break;
                        }

                        if (indexLine.startsWith("Table") || indexLine.startsWith("Ref") || indexLine.startsWith("Records")) {
                            // Новый верхнеуровневый блок внутри Indexes обычно означает пропущенную }.
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

                        // Каждую строку Indexes читаем независимо, чтобы показать точную ошибку.
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
                    // Новый Table до закрытия предыдущего почти всегда означает потерянную } выше.
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

                // Обычная строка внутри Table считается field declaration.
                const parsedField = parseFieldLine(
                    fieldLine,
                    fieldLineNumber,
                    tableName,
                    existingNodes
                );

                errors.push(...parsedField.errors);

                if (parsedField.field) {
                    if (usedFieldNames.has(parsedField.field.name)) {
                        // Дубликат поля оставляем ошибкой, а не затираем первое объявление.
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
                // Nodes ищутся по имени таблицы, поэтому одинаковые названия неоднозначны.
                errors.push(
                    createParserError(
                        tableStartLine,
                        1,
                        `Duplicate table "${tableName}"`,
                        "Названия таблиц должны быть уникальными."
                    )
                );
            }

            // После закрытия Table добавляем его промежуточную модель в общий список.
            tables.push({
                id: getExistingTableId(existingNodes, tableName),
                name: tableName,
                fields,
                indexes
            });

            continue;
        }

        // Ref пока сохраняем именами таблиц и полей. Id появятся после сборки nodes.
        if (line.startsWith("Ref")) {
            // Ref не создает edge сразу: нужные таблицы могут быть объявлены ниже.
            const parsedRef = parseRefLine(line, lineNumber);

            errors.push(...parsedRef.errors);

            if (parsedRef.ref) {
                refs.push(parsedRef.ref);
            }

            index += 1;
            continue;
        }

        if (line.startsWith("Records")) {
            // Header Records задает таблицу и порядок колонок для строк ниже.
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

            // Строки Records читаются отдельно от таблицы и позже проверяются по ее полям.
            while (index < lines.length) {
                const rowRawLine = lines[index];
                const rowLine = stripInlineComment(rowRawLine).trim();
                const rowLineNumber = index + 1;

                if (!rowLine || rowLine.startsWith("//")) {
                    index += 1;
                    continue;
                }

                if (rowLine === "}") {
                    // Закрыли только Records-блок, следующий line снова будет верхнеуровневым.
                    closed = true;
                    index += 1;
                    break;
                }

                if (rowLine.startsWith("Table") || rowLine.startsWith("Ref") || rowLine.startsWith("Records")) {
                    // Новый блок в Records означает, что закрывающая } была забыта.
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

                // Строка Records разбирается отдельно, потому что строковые значения могут содержать запятые.
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
                    // Без совпадения количества ячеек непонятно, к какой колонке отнести значение.
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
                // Если дошли до конца без }, редактор должен подсветить незакрытый Table.
                errors.push(
                    createParserError(
                        lines.length,
                        Math.max(1, lines[lines.length - 1]?.length || 1),
                        `Missing closing brace "}" for records "${records.tableName}"`,
                        `Блок Records был открыт на строке ${recordsStartLine}. Добавь } после последней строки записей.`
                    )
                );
            }

            // Rows временно сохраняются отдельно и позже прикрепятся к node таблицы.
            recordsBlocks.push(records);

            continue;
        }

        if (line === "}") {
            // На верхнем уровне } закрывать нечего, значит пользователь закрыл лишний блок.
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

        // Любой другой верхнеуровневый текст не входит в поддерживаемый DBML-like grammar.
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

    // Сначала строим таблицы, чтобы Records и Ref уже могли проверяться по реальным полям.
    const nodes = tables.map((table, tableIndex) => {
        // Records может находиться ниже таблицы в тексте, поэтому ищем его только на этапе node build.
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

    // После чтения всех Table-блоков уже можно проверить, что Records ссылается на реальные поля.
    recordsBlocks.forEach((records) => {
        const table = tables.find((item) => item.name === records.tableName);

        if (!table) {
            // Блок Records без Table нельзя прикрепить ни к одной карточке canvas.
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
            // Column header Records должен повторять имя поля таблицы один в один.
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

    // Indexes тоже валидируем после таблиц, чтобы UI не получил ссылку на несуществующее поле.
    tables.forEach((table) => {
        table.indexes.forEach((indexItem) => {
            indexItem.columns.forEach((column) => {
                // Индекс в editor указывает на поля по имени, поэтому проверяем каждую колонку.
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

    // Ref хранится текстом по именам, а React Flow ожидает id таблиц и id field handles.
    const edges = [];

    refs.forEach((ref) => {
        // На этом этапе таблицы уже nodes, поэтому source/target можно найти по их data.name.
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

        // Relation line крепится к строке поля, поэтому проверяются обе стороны Ref.
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

        // Текстовая связь становится React Flow edge с handle id полей.
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
