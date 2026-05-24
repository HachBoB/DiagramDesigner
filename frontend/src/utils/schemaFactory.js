import { MarkerType } from "reactflow";

// Пустая схема имеет все коллекции сразу, чтобы editor не проверял undefined.
export function createEmptySchema() {
    return {
        nodes: [],
        edges: [],
        notes: []
    };
}

// Snapshot считаем схемой даже если в нем есть только nodes, edges или notes.
export function hasSchemaSnapshot(schema) {
    return Boolean(
        schema
        && (
            Array.isArray(schema.nodes)
            || Array.isArray(schema.edges)
            || Array.isArray(schema.notes)
        )
    );
}

/**
 * Backend, localStorage и старые проекты могут прислать неполный snapshot.
 * Нормализация оставляет editor с массивами вместо ветвлений по null.
 */
export function normalizeSchemaSnapshot(schema, fallback = createEmptySchema()) {
    if (!hasSchemaSnapshot(schema)) {
        return fallback;
    }

    return {
        nodes: Array.isArray(schema.nodes) ? schema.nodes : [],
        edges: Array.isArray(schema.edges) ? schema.edges : [],
        notes: Array.isArray(schema.notes) ? schema.notes : []
    };
}

// Новое поле получает id сразу, потому что handles и React keys завязаны на него.
export function createField(name = "field", type = "INTEGER") {
    return {
        id: crypto.randomUUID(),
        name,
        type,
        pk: false,
        fk: false,
        unique: false,
        nullable: true
    };
}

// Индекс хранит список колонок: одиночный и составной индекс имеют одну форму.
export function createIndex(columns = []) {
    const normalizedColumns = Array.isArray(columns)
        ? columns.filter(Boolean)
        : [];

    return {
        id: crypto.randomUUID(),
        name: "",
        columns: normalizedColumns,
        unique: false
    };
}

/**
 * Новая таблица сразу совместима с React Flow и schema snapshot:
 * есть node id, data.tableId, стартовый primary key и пустые Records/Indexes.
 */
export function createTableNode(index = 1, position = { x: 200, y: 120 }) {
    const tableId = crypto.randomUUID();

    return {
        id: tableId,
        type: "tableNode",
        position,
        data: {
            tableId,
            name: `table_${index}`,
            fields: [
                {
                    ...createField("id", "INTEGER"),
                    pk: true,
                    unique: true,
                    nullable: false
                }
            ],
            records: {
                columns: [],
                rows: []
            },
            indexes: []
        }
    };
}

// Все связи создаются одинаковыми, чтобы canvas, SQL generator и DBML generator видели одну форму edge.
export function createRelationEdge(
    source,
    target,
    sourceHandle,
    targetHandle,
    relationType = "one-to-many"
) {
    return {
        id: `edge-${crypto.randomUUID()}`,
        source,
        target,
        sourceHandle,
        targetHandle,
        type: "smoothstep",
        animated: false,
        label: relationType,
        data: {
            relationType
        },
        markerEnd: {
            type: MarkerType.ArrowClosed
        },
        style: {
            strokeWidth: 2,
            stroke: "#2563eb"
        },
        labelStyle: {
            fill: "#334155",
            fontWeight: 600,
            fontSize: 12
        },
        labelBgStyle: {
            fill: "#ffffff",
            fillOpacity: 0.9
        },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 8
    };
}

/**
 * Стартовая схема дает пользователю живой пример: таблицы, связи, records и индексы.
 * ID генерируются заново для каждого проекта, иначе связи из разных snapshots могли бы пересечься.
 */
export function createStarterSchema() {
    const usersId = crypto.randomUUID();
    const ordersId = crypto.randomUUID();
    const productsId = crypto.randomUUID();
    const orderItemsId = crypto.randomUUID();

    const usersFields = [
        { id: crypto.randomUUID(), name: "id", type: "SERIAL", pk: true, fk: false, unique: true, nullable: false },
        { id: crypto.randomUUID(), name: "email", type: "VARCHAR", pk: false, fk: false, unique: true, nullable: false },
        { id: crypto.randomUUID(), name: "name", type: "VARCHAR", pk: false, fk: false, unique: false, nullable: false },
        { id: crypto.randomUUID(), name: "created_at", type: "TIMESTAMP", pk: false, fk: false, unique: false, nullable: false }
    ];

    const ordersFields = [
        { id: crypto.randomUUID(), name: "id", type: "SERIAL", pk: true, fk: false, unique: true, nullable: false },
        { id: crypto.randomUUID(), name: "user_id", type: "INTEGER", pk: false, fk: true, unique: false, nullable: false },
        { id: crypto.randomUUID(), name: "status", type: "VARCHAR", pk: false, fk: false, unique: false, nullable: false },
        { id: crypto.randomUUID(), name: "created_at", type: "TIMESTAMP", pk: false, fk: false, unique: false, nullable: false }
    ];

    const productsFields = [
        { id: crypto.randomUUID(), name: "id", type: "SERIAL", pk: true, fk: false, unique: true, nullable: false },
        { id: crypto.randomUUID(), name: "title", type: "VARCHAR", pk: false, fk: false, unique: false, nullable: false },
        { id: crypto.randomUUID(), name: "price", type: "DECIMAL", pk: false, fk: false, unique: false, nullable: false },
        { id: crypto.randomUUID(), name: "stock", type: "INTEGER", pk: false, fk: false, unique: false, nullable: false }
    ];

    const orderItemsFields = [
        { id: crypto.randomUUID(), name: "id", type: "SERIAL", pk: true, fk: false, unique: true, nullable: false },
        { id: crypto.randomUUID(), name: "order_id", type: "INTEGER", pk: false, fk: true, unique: false, nullable: false },
        { id: crypto.randomUUID(), name: "product_id", type: "INTEGER", pk: false, fk: true, unique: false, nullable: false },
        { id: crypto.randomUUID(), name: "quantity", type: "INTEGER", pk: false, fk: false, unique: false, nullable: false }
    ];

    const nodes = [
        {
            id: usersId,
            type: "tableNode",
            position: { x: 420, y: 80 },
            data: {
                tableId: usersId,
                name: "users",
                fields: usersFields,
                records: {
                    columns: ["id", "email", "name", "created_at"],
                    rows: [
                        [1, "alice@example.com", "Alice Johnson", "2026-01-10 09:00:00"],
                        [2, "bob@example.com", "Bob Smith", "2026-01-12 11:30:00"],
                        [3, "candice@example.com", "Candice Lee", "2026-01-15 14:45:00"]
                    ]
                },
                indexes: []
            }
        },
        {
            id: ordersId,
            type: "tableNode",
            position: { x: 780, y: 120 },
            data: {
                tableId: ordersId,
                name: "orders",
                fields: ordersFields,
                records: {
                    columns: ["id", "user_id", "status", "created_at"],
                    rows: [
                        [101, 1, "paid", "2026-02-03 10:15:00"],
                        [102, 2, "pending", "2026-02-04 16:20:00"],
                        [103, 1, "shipped", "2026-02-05 09:40:00"]
                    ]
                },
                indexes: [
                    {
                        id: crypto.randomUUID(),
                        name: "idx_orders_user_id",
                        columns: ["user_id"],
                        unique: false
                    },
                    {
                        id: crypto.randomUUID(),
                        name: "idx_orders_status",
                        columns: ["status"],
                        unique: false
                    }
                ]
            }
        },
        {
            id: productsId,
            type: "tableNode",
            position: { x: 420, y: 420 },
            data: {
                tableId: productsId,
                name: "products",
                fields: productsFields,
                records: {
                    columns: ["id", "title", "price", "stock"],
                    rows: [
                        [201, "Mechanical Keyboard", 89.99, 14],
                        [202, "Wireless Mouse", 39.99, 28],
                        [203, "USB-C Hub", 59.5, 9]
                    ]
                },
                indexes: [
                    {
                        id: crypto.randomUUID(),
                        name: "idx_products_title",
                        columns: ["title"],
                        unique: false
                    }
                ]
            }
        },
        {
            id: orderItemsId,
            type: "tableNode",
            position: { x: 780, y: 420 },
            data: {
                tableId: orderItemsId,
                name: "order_items",
                fields: orderItemsFields,
                records: {
                    columns: ["id", "order_id", "product_id", "quantity"],
                    rows: [
                        [301, 101, 201, 1],
                        [302, 101, 202, 2],
                        [303, 102, 203, 1],
                        [304, 103, 202, 1]
                    ]
                },
                indexes: [
                    {
                        id: crypto.randomUUID(),
                        name: "idx_order_items_order_product",
                        columns: ["order_id", "product_id"],
                        unique: false
                    }
                ]
            }
        }
    ];

    const edges = [
        createRelationEdge(
            usersId,
            ordersId,
            `source-${usersFields[0].id}`,
            `target-${ordersFields[1].id}`,
            "one-to-many"
        ),
        createRelationEdge(
            ordersId,
            orderItemsId,
            `source-${ordersFields[0].id}`,
            `target-${orderItemsFields[1].id}`,
            "one-to-many"
        ),
        createRelationEdge(
            productsId,
            orderItemsId,
            `source-${productsFields[0].id}`,
            `target-${orderItemsFields[2].id}`,
            "one-to-many"
        )
    ];

    return {
        nodes,
        edges,
        notes: []
    };
}
