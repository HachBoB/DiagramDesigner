import { MarkerType } from "reactflow";
import { createId } from "./createId.js";

export const SCHEMA_PATTERNS = [
    {
        id: "starter",
        title: "Интернет-магазин",
        projectName: "Интернет-магазин",
        description: "Покупатели, заказы, товары и позиции заказа.",
        badge: "E-commerce",
        tablesCount: 4,
        relationsCount: 3
    },
    {
        id: "crm",
        title: "CRM система",
        projectName: "CRM система",
        description: "Клиенты, менеджеры, сделки и задачи по продажам.",
        badge: "CRM",
        tablesCount: 4,
        relationsCount: 4
    },
    {
        id: "education",
        title: "Учебная платформа",
        projectName: "Учебная платформа",
        description: "Студенты, курсы, занятия, записи на курсы и работы.",
        badge: "Education",
        tablesCount: 5,
        relationsCount: 5
    },
    {
        id: "content",
        title: "Блог и контент",
        projectName: "Блог и контент",
        description: "Авторы, категории, публикации, комментарии, теги.",
        badge: "Content",
        tablesCount: 6,
        relationsCount: 5
    }
];

export function getSchemaPattern(patternId = "starter") {
    return SCHEMA_PATTERNS.find((pattern) => pattern.id === patternId) || SCHEMA_PATTERNS[0];
}

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
        id: createId(),
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
        id: createId(),
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
    const tableId = createId();

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
        id: `edge-${createId()}`,
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
    const usersId = createId();
    const ordersId = createId();
    const productsId = createId();
    const orderItemsId = createId();

    const usersFields = [
        { id: createId(), name: "id", type: "SERIAL", pk: true, fk: false, unique: true, nullable: false },
        { id: createId(), name: "email", type: "VARCHAR", pk: false, fk: false, unique: true, nullable: false },
        { id: createId(), name: "name", type: "VARCHAR", pk: false, fk: false, unique: false, nullable: false },
        { id: createId(), name: "created_at", type: "TIMESTAMP", pk: false, fk: false, unique: false, nullable: false }
    ];

    const ordersFields = [
        { id: createId(), name: "id", type: "SERIAL", pk: true, fk: false, unique: true, nullable: false },
        { id: createId(), name: "user_id", type: "INTEGER", pk: false, fk: true, unique: false, nullable: false },
        { id: createId(), name: "status", type: "VARCHAR", pk: false, fk: false, unique: false, nullable: false },
        { id: createId(), name: "created_at", type: "TIMESTAMP", pk: false, fk: false, unique: false, nullable: false }
    ];

    const productsFields = [
        { id: createId(), name: "id", type: "SERIAL", pk: true, fk: false, unique: true, nullable: false },
        { id: createId(), name: "title", type: "VARCHAR", pk: false, fk: false, unique: false, nullable: false },
        { id: createId(), name: "price", type: "DECIMAL", pk: false, fk: false, unique: false, nullable: false },
        { id: createId(), name: "stock", type: "INTEGER", pk: false, fk: false, unique: false, nullable: false }
    ];

    const orderItemsFields = [
        { id: createId(), name: "id", type: "SERIAL", pk: true, fk: false, unique: true, nullable: false },
        { id: createId(), name: "order_id", type: "INTEGER", pk: false, fk: true, unique: false, nullable: false },
        { id: createId(), name: "product_id", type: "INTEGER", pk: false, fk: true, unique: false, nullable: false },
        { id: createId(), name: "quantity", type: "INTEGER", pk: false, fk: false, unique: false, nullable: false }
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
                        id: createId(),
                        name: "idx_orders_user_id",
                        columns: ["user_id"],
                        unique: false
                    },
                    {
                        id: createId(),
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
                        id: createId(),
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
                        id: createId(),
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

function createPatternField(name, type, options = {}) {
    return {
        id: createId(),
        name,
        type,
        pk: false,
        fk: false,
        unique: false,
        nullable: true,
        ...options
    };
}

function createPatternIndex(name, columns, unique = false) {
    return {
        id: createId(),
        name,
        columns,
        unique
    };
}

function createPatternTable(name, position, fields, records = {}, indexes = []) {
    const tableId = createId();

    return {
        id: tableId,
        type: "tableNode",
        position,
        data: {
            tableId,
            name,
            fields,
            records: {
                columns: records.columns || [],
                rows: records.rows || []
            },
            indexes
        }
    };
}

function findField(node, fieldName) {
    return node.data.fields.find((field) => field.name === fieldName);
}

function createPatternRelation(sourceNode, sourceFieldName, targetNode, targetFieldName, relationType = "one-to-many") {
    const sourceField = findField(sourceNode, sourceFieldName);
    const targetField = findField(targetNode, targetFieldName);

    return createRelationEdge(
        sourceNode.id,
        targetNode.id,
        `source-${sourceField.id}`,
        `target-${targetField.id}`,
        relationType
    );
}

function createCrmSchema() {
    const customers = createPatternTable(
        "customers",
        { x: 260, y: 80 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("name", "VARCHAR", { nullable: false }),
            createPatternField("email", "VARCHAR", { unique: true, nullable: false }),
            createPatternField("phone", "VARCHAR"),
            createPatternField("created_at", "TIMESTAMP", { nullable: false })
        ],
        {
            columns: ["id", "name", "email", "phone"],
            rows: [
                [1, "ООО Север", "hello@sever.ru", "+7 900 111-22-33"],
                [2, "ИП Волков", "volkov@example.com", "+7 901 444-55-66"]
            ]
        },
        [
            createPatternIndex("idx_customers_email", ["email"], true),
            createPatternIndex("idx_customers_name", ["name"])
        ]
    );

    const managers = createPatternTable(
        "managers",
        { x: 260, y: 420 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("name", "VARCHAR", { nullable: false }),
            createPatternField("email", "VARCHAR", { unique: true, nullable: false })
        ],
        {
            columns: ["id", "name", "email"],
            rows: [
                [1, "Анна Смирнова", "anna@example.com"],
                [2, "Игорь Павлов", "igor@example.com"]
            ]
        },
        [createPatternIndex("idx_managers_email", ["email"], true)]
    );

    const deals = createPatternTable(
        "deals",
        { x: 680, y: 120 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("customer_id", "INTEGER", { fk: true, nullable: false }),
            createPatternField("manager_id", "INTEGER", { fk: true, nullable: false }),
            createPatternField("title", "VARCHAR", { nullable: false }),
            createPatternField("amount", "DECIMAL", { nullable: false }),
            createPatternField("status", "VARCHAR", { nullable: false })
        ],
        {
            columns: ["id", "customer_id", "manager_id", "title", "amount", "status"],
            rows: [
                [101, 1, 1, "Внедрение CRM", 180000, "negotiation"],
                [102, 2, 2, "Поддержка сайта", 65000, "new"]
            ]
        },
        [
            createPatternIndex("idx_deals_customer", ["customer_id"]),
            createPatternIndex("idx_deals_manager_status", ["manager_id", "status"])
        ]
    );

    const tasks = createPatternTable(
        "tasks",
        { x: 1080, y: 160 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("deal_id", "INTEGER", { fk: true, nullable: false }),
            createPatternField("manager_id", "INTEGER", { fk: true, nullable: false }),
            createPatternField("title", "VARCHAR", { nullable: false }),
            createPatternField("due_date", "DATE"),
            createPatternField("completed", "BOOLEAN", { nullable: false })
        ],
        {
            columns: ["id", "deal_id", "manager_id", "title", "due_date", "completed"],
            rows: [
                [201, 101, 1, "Подготовить КП", "2026-03-10", false],
                [202, 102, 2, "Созвониться с клиентом", "2026-03-12", false]
            ]
        },
        [
            createPatternIndex("idx_tasks_deal", ["deal_id"]),
            createPatternIndex("idx_tasks_due_date", ["due_date"])
        ]
    );

    return {
        nodes: [customers, managers, deals, tasks],
        edges: [
            createPatternRelation(customers, "id", deals, "customer_id"),
            createPatternRelation(managers, "id", deals, "manager_id"),
            createPatternRelation(deals, "id", tasks, "deal_id"),
            createPatternRelation(managers, "id", tasks, "manager_id")
        ],
        notes: []
    };
}

function createEducationSchema() {
    const students = createPatternTable(
        "students",
        { x: 220, y: 80 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("name", "VARCHAR", { nullable: false }),
            createPatternField("email", "VARCHAR", { unique: true, nullable: false }),
            createPatternField("registered_at", "TIMESTAMP", { nullable: false })
        ],
        {
            columns: ["id", "name", "email"],
            rows: [
                [1, "Мария Иванова", "maria@example.com"],
                [2, "Павел Орлов", "pavel@example.com"]
            ]
        },
        [createPatternIndex("idx_students_email", ["email"], true)]
    );

    const courses = createPatternTable(
        "courses",
        { x: 220, y: 420 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("code", "VARCHAR", { unique: true, nullable: false }),
            createPatternField("title", "VARCHAR", { nullable: false }),
            createPatternField("level", "VARCHAR", { nullable: false })
        ],
        {
            columns: ["id", "code", "title", "level"],
            rows: [
                [10, "DB-101", "Проектирование баз данных", "beginner"],
                [11, "SQL-201", "SQL для аналитики", "middle"]
            ]
        },
        [
            createPatternIndex("idx_courses_code", ["code"], true),
            createPatternIndex("idx_courses_level", ["level"])
        ]
    );

    const enrollments = createPatternTable(
        "enrollments",
        { x: 640, y: 180 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("student_id", "INTEGER", { fk: true, nullable: false }),
            createPatternField("course_id", "INTEGER", { fk: true, nullable: false }),
            createPatternField("status", "VARCHAR", { nullable: false }),
            createPatternField("grade", "INTEGER")
        ],
        {
            columns: ["id", "student_id", "course_id", "status", "grade"],
            rows: [
                [100, 1, 10, "active", null],
                [101, 2, 11, "completed", 92]
            ]
        },
        [
            createPatternIndex("idx_enrollments_student_course", ["student_id", "course_id"], true),
            createPatternIndex("idx_enrollments_course_status", ["course_id", "status"])
        ]
    );

    const lessons = createPatternTable(
        "lessons",
        { x: 1040, y: 80 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("course_id", "INTEGER", { fk: true, nullable: false }),
            createPatternField("title", "VARCHAR", { nullable: false }),
            createPatternField("starts_at", "TIMESTAMP")
        ],
        {
            columns: ["id", "course_id", "title"],
            rows: [
                [1001, 10, "Нормализация"],
                [1002, 11, "Оконные функции"]
            ]
        },
        [createPatternIndex("idx_lessons_course", ["course_id"])]
    );

    const submissions = createPatternTable(
        "submissions",
        { x: 1040, y: 420 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("lesson_id", "INTEGER", { fk: true, nullable: false }),
            createPatternField("student_id", "INTEGER", { fk: true, nullable: false }),
            createPatternField("submitted_at", "TIMESTAMP", { nullable: false }),
            createPatternField("score", "INTEGER")
        ],
        {
            columns: ["id", "lesson_id", "student_id", "score"],
            rows: [
                [5001, 1001, 1, 88],
                [5002, 1002, 2, 92]
            ]
        },
        [createPatternIndex("idx_submissions_lesson_student", ["lesson_id", "student_id"], true)]
    );

    return {
        nodes: [students, courses, enrollments, lessons, submissions],
        edges: [
            createPatternRelation(students, "id", enrollments, "student_id"),
            createPatternRelation(courses, "id", enrollments, "course_id"),
            createPatternRelation(courses, "id", lessons, "course_id"),
            createPatternRelation(lessons, "id", submissions, "lesson_id"),
            createPatternRelation(students, "id", submissions, "student_id")
        ],
        notes: []
    };
}

function createContentSchema() {
    const authors = createPatternTable(
        "authors",
        { x: 160, y: 80 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("name", "VARCHAR", { nullable: false }),
            createPatternField("email", "VARCHAR", { unique: true, nullable: false })
        ],
        {
            columns: ["id", "name", "email"],
            rows: [
                [1, "Редактор", "editor@example.com"],
                [2, "Автор", "author@example.com"]
            ]
        },
        [createPatternIndex("idx_authors_email", ["email"], true)]
    );

    const categories = createPatternTable(
        "categories",
        { x: 160, y: 400 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("name", "VARCHAR", { nullable: false }),
            createPatternField("slug", "VARCHAR", { unique: true, nullable: false })
        ],
        {
            columns: ["id", "name", "slug"],
            rows: [
                [10, "Базы данных", "databases"],
                [11, "Backend", "backend"]
            ]
        },
        [createPatternIndex("idx_categories_slug", ["slug"], true)]
    );

    const posts = createPatternTable(
        "posts",
        { x: 560, y: 140 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("author_id", "INTEGER", { fk: true, nullable: false }),
            createPatternField("category_id", "INTEGER", { fk: true, nullable: false }),
            createPatternField("title", "VARCHAR", { nullable: false }),
            createPatternField("slug", "VARCHAR", { unique: true, nullable: false }),
            createPatternField("status", "VARCHAR", { nullable: false }),
            createPatternField("published_at", "TIMESTAMP")
        ],
        {
            columns: ["id", "author_id", "category_id", "title", "slug", "status"],
            rows: [
                [100, 1, 10, "Как читать ER-диаграммы", "read-er-diagrams", "published"],
                [101, 2, 11, "REST API на Laravel", "laravel-rest-api", "draft"]
            ]
        },
        [
            createPatternIndex("idx_posts_slug", ["slug"], true),
            createPatternIndex("idx_posts_status_published", ["status", "published_at"])
        ]
    );

    const comments = createPatternTable(
        "comments",
        { x: 980, y: 80 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("post_id", "INTEGER", { fk: true, nullable: false }),
            createPatternField("author_name", "VARCHAR", { nullable: false }),
            createPatternField("body", "TEXT", { nullable: false }),
            createPatternField("created_at", "TIMESTAMP", { nullable: false })
        ],
        {
            columns: ["id", "post_id", "author_name", "body"],
            rows: [
                [1000, 100, "Костя", "Полезный материал"],
                [1001, 100, "Алина", "Нужно больше примеров"]
            ]
        },
        [createPatternIndex("idx_comments_post", ["post_id"])]
    );

    const tags = createPatternTable(
        "tags",
        { x: 980, y: 420 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("name", "VARCHAR", { nullable: false }),
            createPatternField("slug", "VARCHAR", { unique: true, nullable: false })
        ],
        {
            columns: ["id", "name", "slug"],
            rows: [
                [200, "SQL", "sql"],
                [201, "Laravel", "laravel"]
            ]
        },
        [createPatternIndex("idx_tags_slug", ["slug"], true)]
    );

    const postTags = createPatternTable(
        "post_tags",
        { x: 1360, y: 260 },
        [
            createPatternField("id", "SERIAL", { pk: true, unique: true, nullable: false }),
            createPatternField("post_id", "INTEGER", { fk: true, nullable: false }),
            createPatternField("tag_id", "INTEGER", { fk: true, nullable: false })
        ],
        {
            columns: ["id", "post_id", "tag_id"],
            rows: [
                [1, 100, 200],
                [2, 101, 201]
            ]
        },
        [createPatternIndex("idx_post_tags_post_tag", ["post_id", "tag_id"], true)]
    );

    return {
        nodes: [authors, categories, posts, comments, tags, postTags],
        edges: [
            createPatternRelation(authors, "id", posts, "author_id"),
            createPatternRelation(categories, "id", posts, "category_id"),
            createPatternRelation(posts, "id", comments, "post_id"),
            createPatternRelation(posts, "id", postTags, "post_id"),
            createPatternRelation(tags, "id", postTags, "tag_id")
        ],
        notes: []
    };
}

export function createSchemaPattern(patternId = "starter") {
    if (patternId === "crm") {
        return createCrmSchema();
    }

    if (patternId === "education") {
        return createEducationSchema();
    }

    if (patternId === "content") {
        return createContentSchema();
    }

    return createStarterSchema();
}
