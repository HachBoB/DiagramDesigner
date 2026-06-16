import { createRelationEdge } from "./schemaFactory.js";
import { createId } from "./createId.js";

/*
 * SQL importer не пытается быть полноценным SQL engine.
 * Его задача уже: извлечь из DDL/DML ту часть, которую умеет хранить визуальный редактор:
 * таблицы, поля, простые constraints, связи, индексы и preview-records.
 *
 * SQL у пяти СУБД отличается кавычками и типами, поэтому здесь много маленьких scanner-функций.
 * Они проходят текст посимвольно и следят, находимся ли мы внутри строки, identifier или скобок.
 * Это надежнее простого split(",") / split(";") для VARCHAR(255), DECIMAL(10,2) и строковых значений.
 */

// Когда тип колонки закончился, дальше в ее тексте обычно начинается один из constraints.
const COLUMN_CONSTRAINT = /\s+(?=NOT\s+NULL\b|NULL\b|PRIMARY\s+KEY\b|UNIQUE\b|REFERENCES\b|CHECK\b|DEFAULT\b|COLLATE\b|CONSTRAINT\b)/i;

// Import modal показывает короткие ошибки без line/column: SQL может быть многострочным statement.
function makeError(message, hint = "") {
    return { message, hint };
}

// Удаляем комментарии до разбиения на statements, но не трогаем маркеры внутри строковых литералов.
function stripSqlComments(sql) {
    let result = "";
    let index = 0;
    // quote хранит текущую кавычку строкового литерала или quoted identifier.
    let quote = "";

    while (index < sql.length) {
        const char = sql[index];
        const nextChar = sql[index + 1];

        // Пока мы внутри строки, последовательности вроде "--" остаются обычным текстом.
        if (quote) {
            result += char;

            if (char === quote) {
                if (quote === "'" && nextChar === "'") {
                    result += nextChar;
                    index += 2;
                    continue;
                }

                quote = "";
            }

            index += 1;
            continue;
        }

        if (char === "'" || char === '"' || char === "`") {
            // С этого символа комментарии временно не распознаются.
            quote = char;
            result += char;
            index += 1;
            continue;
        }

        // Однострочный комментарий вырезаем до перевода строки.
        if (char === "-" && nextChar === "-") {
            while (index < sql.length && sql[index] !== "\n") {
                index += 1;
            }

            result += "\n";
            continue;
        }

        // Блочный комментарий заменяем пробелом, чтобы соседние токены не склеились.
        if (char === "/" && nextChar === "*") {
            index += 2;

            while (index < sql.length && !(sql[index] === "*" && sql[index + 1] === "/")) {
                index += 1;
            }

            index += 2;
            result += " ";
            continue;
        }

        result += char;
        index += 1;
    }

    return result;
}

// Точка с запятой внутри строки или quoted identifier не завершает SQL statement.
function splitSqlStatements(sql) {
    const statements = [];
    let current = "";
    // Для 'text', "postgres_identifier" и `mysql_identifier` закрывающий символ одинаков с открывающим.
    let quote = "";
    // SQL Server использует [identifier], где ] может экранироваться как ]].
    let bracketIdentifier = false;

    for (let index = 0; index < sql.length; index += 1) {
        const char = sql[index];
        const nextChar = sql[index + 1];

        current += char;

        if (quote) {
            // Две одинарные кавычки внутри SQL-строки означают одну кавычку, а не конец строки.
            if (char === quote) {
                if (quote === "'" && nextChar === "'") {
                    current += nextChar;
                    index += 1;
                    continue;
                }

                quote = "";
            }

            continue;
        }

        if (bracketIdentifier) {
            // Пока не закрыли [identifier], ; не должен завершить statement.
            if (char === "]") {
                if (nextChar === "]") {
                    current += nextChar;
                    index += 1;
                    continue;
                }

                bracketIdentifier = false;
            }

            continue;
        }

        if (char === "'" || char === '"' || char === "`") {
            quote = char;
            continue;
        }

        if (char === "[") {
            bracketIdentifier = true;
            continue;
        }

        // До этой ветки доходят только разделители верхнего уровня.
        if (char === ";") {
            const statement = current.slice(0, -1).trim();

            if (statement) {
                statements.push(statement);
            }

            current = "";
        }
    }

    if (current.trim()) {
        // Последний statement может не иметь ;, особенно если SQL вставлен вручную.
        statements.push(current.trim());
    }

    return statements;
}

// Поля и значения делятся запятыми только на верхнем уровне, а не внутри DECIMAL(10,2) или строк.
function splitTopLevel(value, delimiter = ",") {
    const parts = [];
    let current = "";
    let quote = "";
    let bracketIdentifier = false;
    // depth показывает вложенность круглых скобок.
    // При depth > 0 запятая относится к типу, выражению или VALUES, а не к списку верхнего уровня.
    let depth = 0;

    for (let index = 0; index < value.length; index += 1) {
        const char = value[index];
        const nextChar = value[index + 1];

        if (quote) {
            current += char;

            if (char === quote) {
                if (quote === "'" && nextChar === "'") {
                    current += nextChar;
                    index += 1;
                    continue;
                }

                quote = "";
            }

            continue;
        }

        if (bracketIdentifier) {
            current += char;

            if (char === "]") {
                if (nextChar === "]") {
                    current += nextChar;
                    index += 1;
                    continue;
                }

                bracketIdentifier = false;
            }

            continue;
        }

        if (char === "'" || char === '"' || char === "`") {
            quote = char;
            current += char;
            continue;
        }

        if (char === "[") {
            bracketIdentifier = true;
            current += char;
            continue;
        }

        if (char === "(") {
            depth += 1;
            current += char;
            continue;
        }

        if (char === ")") {
            depth = Math.max(0, depth - 1);
            current += char;
            continue;
        }

        if (char === delimiter && depth === 0) {
            // Разделитель найден на уровне текущего списка.
            parts.push(current.trim());
            current = "";
            continue;
        }

        current += char;
    }

    if (current.trim()) {
        parts.push(current.trim());
    }

    return parts;
}

// Общий поиск закрывающей скобки нужен для таблиц, списков колонок и VALUES с вложенными скобками.
function findMatchingParen(value, openIndex) {
    let quote = "";
    let bracketIdentifier = false;
    // Начинаем с openIndex, поэтому первая "(" поднимет depth до 1.
    let depth = 0;

    for (let index = openIndex; index < value.length; index += 1) {
        const char = value[index];
        const nextChar = value[index + 1];

        if (quote) {
            if (char === quote) {
                if (quote === "'" && nextChar === "'") {
                    index += 1;
                    continue;
                }

                quote = "";
            }

            continue;
        }

        if (bracketIdentifier) {
            if (char === "]") {
                if (nextChar === "]") {
                    index += 1;
                    continue;
                }

                bracketIdentifier = false;
            }

            continue;
        }

        if (char === "'" || char === '"' || char === "`") {
            quote = char;
            continue;
        }

        if (char === "[") {
            bracketIdentifier = true;
            continue;
        }

        if (char === "(") {
            depth += 1;
            continue;
        }

        if (char === ")") {
            depth -= 1;

            if (depth === 0) {
                // Это закрывающая скобка именно для той "(", с которой стартовали.
                return index;
            }
        }
    }

    return -1;
}

// Приводим "users", `users` и [users] к одному имени table/field в snapshot редактора.
function unquoteIdentifier(rawIdentifier) {
    const clean = String(rawIdentifier || "").trim();

    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("`") && clean.endsWith("`"))) {
        return clean.slice(1, -1).replace(/""/g, '"').replace(/``/g, "`");
    }

    if (clean.startsWith("[") && clean.endsWith("]")) {
        return clean.slice(1, -1).replace(/]]/g, "]");
    }

    return clean;
}

/*
 * Читает один SQL identifier и возвращает:
 * - name: имя без внешних кавычек;
 * - end: позицию сразу после identifier, чтобы следующий parser продолжил с нее.
 */
function parseIdentifier(value, startIndex = 0) {
    let index = startIndex;

    // После SQL keyword обычно есть пробелы, их identifier parser не должен включать в имя.
    while (/\s/.test(value[index] || "")) {
        index += 1;
    }

    const start = index;
    const opener = value[index];
    const closer = opener === "[" ? "]" : opener;

    if (opener === '"' || opener === "`" || opener === "[") {
        // Quoted identifier может содержать символы, которые нельзя читать обычным regexp.
        index += 1;

        while (index < value.length) {
            if (value[index] === closer) {
                if (value[index + 1] === closer) {
                    index += 2;
                    continue;
                }

                index += 1;
                break;
            }

            index += 1;
        }

        return {
            name: unquoteIdentifier(value.slice(start, index)),
            end: index
        };
    }

    while (index < value.length && /[A-Za-z0-9_$#]/.test(value[index])) {
        // Для обычного identifier читаем непрерывный набор разрешенных символов.
        index += 1;
    }

    return {
        name: unquoteIdentifier(value.slice(start, index)),
        end: index
    };
}

// Из public.users или dbo.orders берем последнее имя, а schema в нашем editor snapshot не храним.
function parseQualifiedIdentifier(value, startIndex = 0) {
    const parts = [];
    let nextIndex = startIndex;

    while (nextIndex < value.length) {
        const part = parseIdentifier(value, nextIndex);

        if (!part.name) {
            break;
        }

        parts.push(part.name);
        nextIndex = part.end;

        while (/\s/.test(value[nextIndex] || "")) {
            nextIndex += 1;
        }

        if (value[nextIndex] !== ".") {
            // Точки больше нет: qualified identifier закончился.
            break;
        }

        nextIndex += 1;
    }

    return {
        name: parts.at(-1) || "",
        end: nextIndex
    };
}

// Списки колонок проходят через общий top-level split, чтобы не ломаться на выражениях со скобками.
function parseIdentifierList(value) {
    return splitTopLevel(value)
        .map((item) => parseQualifiedIdentifier(item).name)
        .filter(Boolean);
}

// Здесь ищем keyword уже внутри statement известного типа, поэтому простого case-insensitive indexOf хватает.
function findKeyword(statement, keyword) {
    return statement.toUpperCase().indexOf(keyword.toUpperCase());
}

// SQL не хранит координаты canvas, поэтому импорт раскладывает таблицы простой сеткой.
function createTablePosition(index) {
    return {
        x: 320 + (index % 2) * 400,
        y: 90 + Math.floor(index / 2) * 320
    };
}

// Сразу создаем форму поля, которую используют node, свойства таблицы и DBML generator.
function createImportedField(name, type, options = {}) {
    return {
        id: createId(),
        name,
        type: type || "TEXT",
        pk: Boolean(options.pk),
        fk: Boolean(options.fk),
        unique: Boolean(options.unique),
        nullable: options.nullable !== false
    };
}

/*
 * В definition поля после имени лежит и тип, и constraints:
 *   price DECIMAL(10,2) NOT NULL
 * Эта функция оставляет только DECIMAL(10,2), не разбирая полный SQL grammar.
 */
function trimColumnType(rest) {
    const splitAt = rest.search(COLUMN_CONSTRAINT);

    return (splitAt === -1 ? rest : rest.slice(0, splitAt)).trim();
}

// Возвращаем направление связи в формате редактора: source = referenced table, target = FK table.
function parseForeignKey(definition) {
    const foreignKeyIndex = findKeyword(definition, "FOREIGN KEY");
    const referencesIndex = findKeyword(definition, "REFERENCES");

    if (foreignKeyIndex === -1 || referencesIndex === -1) {
        return null;
    }

    // Сначала читаем колонки FK-таблицы: FOREIGN KEY (target_columns).
    const columnsOpen = definition.indexOf("(", foreignKeyIndex);
    const columnsClose = findMatchingParen(definition, columnsOpen);
    // Затем читаем таблицу и колонки, на которые ссылается REFERENCES.
    const referenceTable = parseQualifiedIdentifier(definition, referencesIndex + "REFERENCES".length);
    const referenceOpen = definition.indexOf("(", referenceTable.end);
    const referenceClose = findMatchingParen(definition, referenceOpen);

    if (columnsOpen === -1 || columnsClose === -1 || !referenceTable.name || referenceOpen === -1 || referenceClose === -1) {
        return null;
    }

    return {
        // В терминах canvas targetColumns принадлежат таблице с FK.
        targetColumns: parseIdentifierList(definition.slice(columnsOpen + 1, columnsClose)),
        // sourceTable/sourceColumns принадлежат родительской таблице, на которую указывает FK.
        sourceTable: referenceTable.name,
        sourceColumns: parseIdentifierList(definition.slice(referenceOpen + 1, referenceClose))
    };
}

/**
 * Собирает таблицу из CREATE TABLE.
 * Ограничения могут быть объявлены у колонки или отдельной строкой после списка полей.
 */
function parseCreateTable(statement, errors) {
    // Если statement другого типа, возвращаем null: верхний orchestrator прогоняет эту функцию по всему SQL.
    const prefix = statement.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/i);

    if (!prefix) {
        return null;
    }

    // Имя может быть quoted и schema-qualified, но в snapshot храним только имя самой таблицы.
    const tableIdentifier = parseQualifiedIdentifier(statement, prefix[0].length);
    // Body таблицы начинается с первой "(" после имени таблицы.
    const bodyOpen = statement.indexOf("(", tableIdentifier.end);
    const bodyClose = findMatchingParen(statement, bodyOpen);

    if (!tableIdentifier.name || bodyOpen === -1 || bodyClose === -1) {
        errors.push(makeError("Не удалось прочитать CREATE TABLE.", "Проверь имя таблицы и круглые скобки с полями."));
        return null;
    }

    /*
     * Часть данных временная:
     * primaryKeys, uniqueColumns и foreignKeys нужны во время импорта,
     * а в React node останутся уже fields, indexes и edges.
     */
    const table = {
        id: createId(),
        name: tableIdentifier.name,
        fields: [],
        indexes: [],
        primaryKeys: [],
        uniqueColumns: [],
        foreignKeys: []
    };

    // Каждая верхнеуровневая часть CREATE TABLE либо объявляет поле, либо constraint таблицы.
    splitTopLevel(statement.slice(bodyOpen + 1, bodyClose)).forEach((definition) => {
        // Имя CONSTRAINT для визуальной схемы не нужно, поэтому снимаем его перед разбором тела.
        const normalizedDefinition = definition.replace(/^CONSTRAINT\s+(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|\S+)\s+/i, "").trim();

        // PRIMARY KEY на уровне таблицы встречается и в нашем экспорте, и в обычных дампах.
        if (/^PRIMARY\s+KEY\b/i.test(normalizedDefinition)) {
            const openIndex = normalizedDefinition.indexOf("(");
            const closeIndex = findMatchingParen(normalizedDefinition, openIndex);

            if (openIndex !== -1 && closeIndex !== -1) {
                // Сохраняем имена, а флаг pk наложим после чтения всех column definitions.
                table.primaryKeys.push(...parseIdentifierList(normalizedDefinition.slice(openIndex + 1, closeIndex)));
            }

            return;
        }

        // UNIQUE(column) позже станет unique-флагом соответствующего поля.
        if (/^UNIQUE\b/i.test(normalizedDefinition)) {
            const openIndex = normalizedDefinition.indexOf("(");
            const closeIndex = findMatchingParen(normalizedDefinition, openIndex);

            if (openIndex !== -1 && closeIndex !== -1) {
                table.uniqueColumns.push(...parseIdentifierList(normalizedDefinition.slice(openIndex + 1, closeIndex)));
            }

            return;
        }

        // Связь откладываем: referenced table может встретиться ниже по SQL.
        if (/^FOREIGN\s+KEY\b/i.test(normalizedDefinition)) {
            const foreignKey = parseForeignKey(normalizedDefinition);

            if (foreignKey) {
                table.foreignKeys.push(foreignKey);
            }

            return;
        }

        const fieldIdentifier = parseIdentifier(normalizedDefinition);
        const rest = normalizedDefinition.slice(fieldIdentifier.end).trim();

        if (!fieldIdentifier.name || !rest) {
            // Неполная строка не становится полем. Общая ошибка таблицы уже будет видна по результату импорта.
            return;
        }

        // Отделяем тип от constraints и переносим простые флаги в модель поля редактора.
        const field = createImportedField(fieldIdentifier.name, trimColumnType(rest), {
            pk: /\bPRIMARY\s+KEY\b/i.test(rest),
            unique: /\bUNIQUE\b/i.test(rest),
            nullable: !/\bNOT\s+NULL\b/i.test(rest)
        });
        // Inline REFERENCES приводим к той же форме, что и table-level FOREIGN KEY.
        const inlineForeignKey = parseForeignKey(`FOREIGN KEY (${fieldIdentifier.name}) ${rest}`);

        if (inlineForeignKey) {
            field.fk = true;
            table.foreignKeys.push(inlineForeignKey);
        }

        table.fields.push(field);
    });

    // Constraints уровня таблицы накладываются после того, как все поля уже известны.
    table.fields.forEach((field) => {
        if (table.primaryKeys.includes(field.name)) {
            // PK в editor одновременно означает уникальность и запрет NULL.
            field.pk = true;
            field.unique = true;
            field.nullable = false;
        }

        if (table.uniqueColumns.includes(field.name)) {
            field.unique = true;
        }
    });

    // FK-флаг нужен карточке поля еще до построения React Flow edge.
    table.foreignKeys.forEach((foreignKey) => {
        foreignKey.targetColumns.forEach((column) => {
            const field = table.fields.find((item) => item.name === column);

            if (field) {
                field.fk = true;
            }
        });
    });

    return table;
}

function parseCreateIndex(statement, tables) {
    // Функция молча игнорирует statements не про индекс: это часть многошагового обхода SQL.
    const prefix = statement.match(/^CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?/i);

    if (!prefix) {
        return;
    }

    // Имя индекса отображается пользователю и потом участвует в повторном SQL export.
    const indexIdentifier = parseQualifiedIdentifier(statement, prefix[0].length);
    const onIndex = findKeyword(statement, " ON ");

    if (!indexIdentifier.name || onIndex === -1) {
        return;
    }

    const tableIdentifier = parseQualifiedIdentifier(statement, onIndex + 4);
    const columnsOpen = statement.indexOf("(", tableIdentifier.end);
    const columnsClose = findMatchingParen(statement, columnsOpen);
    // Индекс можно сохранить только если соответствующая таблица уже попала в первый pass.
    const table = tables.find((item) => item.name === tableIdentifier.name);

    if (!table || columnsOpen === -1 || columnsClose === -1) {
        return;
    }

    // Индекс на выражение пока не импортируем: редактор хранит ссылки только на реальные поля.
    const columns = parseIdentifierList(statement.slice(columnsOpen + 1, columnsClose))
        .filter((column) => table.fields.some((field) => field.name === column));

    if (columns.length === 0) {
        return;
    }

    table.indexes.push({
        id: createId(),
        name: indexIdentifier.name,
        columns,
        unique: Boolean(prefix[1])
    });
}

// Многие дампы выносят foreign keys после CREATE TABLE, поэтому импортируем и этот вариант.
function parseAlterTableForeignKey(statement, tables) {
    const prefix = statement.match(/^ALTER\s+TABLE\s+(?:ONLY\s+)?/i);

    if (!prefix) {
        return;
    }

    // ALTER TABLE target_table ... FOREIGN KEY (...) REFERENCES source_table (...)
    const tableIdentifier = parseQualifiedIdentifier(statement, prefix[0].length);
    const foreignKey = parseForeignKey(statement);
    const table = tables.find((item) => item.name === tableIdentifier.name);

    if (!table || !foreignKey) {
        return;
    }

    // ALTER TABLE дополняет тот же список FK, что наполняется внутри CREATE TABLE.
    table.foreignKeys.push(foreignKey);
    foreignKey.targetColumns.forEach((column) => {
        const field = table.fields.find((item) => item.name === column);

        if (field) {
            field.fk = true;
        }
    });
}

// В SQL одинарная кавычка внутри литерала экранируется второй одинарной кавычкой.
function decodeSqlString(value) {
    return value.slice(1, -1).replace(/''/g, "'");
}

function parseInsertValue(value) {
    const clean = value.trim();
    // PostgreSQL/Oracle date literals имеют префикс DATE/TIMESTAMP перед строкой.
    const typedLiteral = clean.match(/^(?:DATE|TIMESTAMP)\s+('(?:''|[^'])*')$/i);

    if (typedLiteral) {
        return decodeSqlString(typedLiteral[1]);
    }

    // Далее приводим типы к JSON-friendly значениям, которые понимает Records modal.
    if (/^NULL$/i.test(clean)) {
        return null;
    }

    if (/^TRUE$/i.test(clean)) {
        return true;
    }

    if (/^FALSE$/i.test(clean)) {
        return false;
    }

    if (/^'(?:''|[^'])*'$/.test(clean)) {
        return decodeSqlString(clean);
    }

    if (/^-?\d+(?:\.\d+)?$/.test(clean)) {
        return Number(clean);
    }

    // Неизвестный expression сохраняем текстом: так импорт не теряет значение полностью.
    return clean;
}

// В records редактора храним только INSERT с явным списком колонок и совпадающей формой строк.
function parseInsert(statement, tables) {
    // Statements без INSERT тут не ошибка: orchestrator вызывает parser для каждого statement.
    const prefix = statement.match(/^INSERT\s+INTO\s+/i);

    if (!prefix) {
        return;
    }

    const tableIdentifier = parseQualifiedIdentifier(statement, prefix[0].length);
    const columnsOpen = statement.indexOf("(", tableIdentifier.end);
    const columnsClose = findMatchingParen(statement, columnsOpen);
    const valuesIndex = findKeyword(statement, "VALUES");
    // Поддерживаем однострочный VALUES (...) из нашего экспорта.
    const valuesOpen = statement.indexOf("(", valuesIndex);
    const valuesClose = findMatchingParen(statement, valuesOpen);
    const table = tables.find((item) => item.name === tableIdentifier.name);

    if (!table || columnsOpen === -1 || columnsClose === -1 || valuesIndex === -1 || valuesOpen === -1 || valuesClose === -1) {
        // INSERT без списка колонок или без распознанного VALUES нельзя безопасно положить в Records.
        return;
    }

    const columns = parseIdentifierList(statement.slice(columnsOpen + 1, columnsClose));
    const values = splitTopLevel(statement.slice(valuesOpen + 1, valuesClose)).map(parseInsertValue);

    if (columns.length === 0 || columns.length !== values.length) {
        return;
    }

    // Первый INSERT фиксирует форму Records для таблицы.
    if (table.records.columns.length === 0) {
        table.records.columns = columns;
    }

    // Разные формы INSERT нельзя сложить в одну preview-таблицу records.
    if (table.records.columns.join(",") !== columns.join(",")) {
        return;
    }

    table.records.rows.push(values);
}

// Временные таблицы importer превращает в реальные React Flow table nodes.
function buildNodes(tables) {
    return tables.map((table, index) => ({
        id: table.id,
        type: "tableNode",
        position: createTablePosition(index),
        data: {
            tableId: table.id,
            name: table.name,
            fields: table.fields,
            indexes: table.indexes,
            records: table.records
        }
    }));
}

// React Flow связывает поля по handle id, поэтому edge строится только после создания всех nodes.
function buildEdges(tables, nodes, errors) {
    const edges = [];

    tables.forEach((table) => {
        // Каждая table в этом проходе рассматривается как FK target.
        const targetNode = nodes.find((node) => node.data.name === table.name);

        table.foreignKeys.forEach((foreignKey) => {
            const sourceNode = nodes.find((node) => node.data.name === foreignKey.sourceTable);

            if (!sourceNode || !targetNode) {
                // Таблица связи отсутствует в импортированном DDL, поэтому линию нарисовать нельзя.
                errors.push(makeError(`Связь для таблицы "${table.name}" ссылается на неизвестную таблицу "${foreignKey.sourceTable}".`));
                return;
            }

            // Составной FK раскладываем на field-to-field линии, которые умеет рисовать canvas.
            foreignKey.targetColumns.forEach((targetColumn, columnIndex) => {
                const sourceColumn = foreignKey.sourceColumns[columnIndex];
                const sourceField = sourceNode.data.fields.find((field) => field.name === sourceColumn);
                const targetField = targetNode.data.fields.find((field) => field.name === targetColumn);

                if (!sourceField || !targetField) {
                    // То же касается поля: без field id невозможно создать handle line.
                    return;
                }

                edges.push(createRelationEdge(
                    sourceNode.id,
                    targetNode.id,
                    `source-${sourceField.id}`,
                    `target-${targetField.id}`,
                    "one-to-many"
                ));
            });
        });
    });

    return edges;
}

/**
 * Переводит поддерживаемый SQL DDL/DML в snapshot редактора.
 * Сначала регистрируем таблицы, затем индексы/связи/records, чтобы ссылки могли смотреть вперед.
 */
export function parseSQLToSchema(sql) {
    const errors = [];
    const statements = splitSqlStatements(stripSqlComments(String(sql || "")));

    // Первый проход создает таблицы и поля. Следующие statements уже могут на них ссылаться.
    const tables = statements
        .map((statement) => parseCreateTable(statement, errors))
        .filter(Boolean)
        .map((table) => ({
            ...table,
            records: {
                columns: [],
                rows: []
            }
        }));

    if (tables.length === 0) {
        errors.push(makeError("В SQL не найдено ни одной таблицы.", "Импорт ожидает CREATE TABLE с полями."));
    }

    // Дополнительные проходы наполняют таблицы индексами, вынесенными FK и record rows.
    statements.forEach((statement) => parseCreateIndex(statement, tables));
    statements.forEach((statement) => parseAlterTableForeignKey(statement, tables));
    statements.forEach((statement) => parseInsert(statement, tables));

    const nodes = buildNodes(tables);

    // Edges строятся последними: им нужны id готовых tables и fields.
    return {
        nodes,
        edges: buildEdges(tables, nodes, errors),
        errors
    };
}
