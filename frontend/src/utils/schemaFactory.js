import { MarkerType } from "reactflow";

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
            }
        }
    };
}

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
                    columns: ["id", "email", "name"],
                    rows: [
                        [1, "alice@example.com", "Alice"],
                        [2, "bob@example.com", "Bob"],
                        [3, "candice@example.com", "Candice"]
                    ]
                }
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
                    columns: ["id", "user_id", "status"],
                    rows: [
                        [101, 1, "paid"],
                        [102, 2, "pending"]
                    ]
                }
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
                        [201, "Keyboard", 89.99, 14],
                        [202, "Mouse", 39.99, 28]
                    ]
                }
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
                        [302, 102, 202, 2]
                    ]
                }
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
        edges
    };
}
