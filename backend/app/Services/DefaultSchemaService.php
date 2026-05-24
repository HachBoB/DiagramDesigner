<?php

namespace App\Services;

/**
 * Держит стартовую схему в JSON и DBML-like виде, чтобы backend мог создать полноценный проект.
 */
class DefaultSchemaService
{
    /**
     * Возвращает snapshot в точной форме, которую React Flow и frontend resources уже умеют читать.
     */
    public function schemaJson(): array
    {
        // Таблицы описываем компактно, а ниже превращаем их в React Flow nodes.
        $tables = [
            'users' => [
                'position' => ['x' => 420, 'y' => 80],
                'fields' => [
                    ['id' => 'users-id', 'name' => 'id', 'type' => 'SERIAL', 'pk' => true, 'fk' => false, 'unique' => true, 'nullable' => false],
                    ['id' => 'users-email', 'name' => 'email', 'type' => 'VARCHAR', 'pk' => false, 'fk' => false, 'unique' => true, 'nullable' => false],
                    ['id' => 'users-name', 'name' => 'name', 'type' => 'VARCHAR', 'pk' => false, 'fk' => false, 'unique' => false, 'nullable' => false],
                    ['id' => 'users-created-at', 'name' => 'created_at', 'type' => 'TIMESTAMP', 'pk' => false, 'fk' => false, 'unique' => false, 'nullable' => false],
                ],
                'records' => [
                    'columns' => ['id', 'email', 'name'],
                    'rows' => [
                        [1, 'alice@example.com', 'Alice'],
                        [2, 'bob@example.com', 'Bob'],
                        [3, 'candice@example.com', 'Candice'],
                    ],
                ],
                'indexes' => [
                    [
                        'id' => 'idx-users-email',
                        'name' => 'idx_users_email',
                        'columns' => ['email'],
                        'unique' => true,
                    ],
                ],
            ],
            'orders' => [
                'position' => ['x' => 780, 'y' => 120],
                'fields' => [
                    ['id' => 'orders-id', 'name' => 'id', 'type' => 'SERIAL', 'pk' => true, 'fk' => false, 'unique' => true, 'nullable' => false],
                    ['id' => 'orders-user-id', 'name' => 'user_id', 'type' => 'INTEGER', 'pk' => false, 'fk' => true, 'unique' => false, 'nullable' => false],
                    ['id' => 'orders-status', 'name' => 'status', 'type' => 'VARCHAR', 'pk' => false, 'fk' => false, 'unique' => false, 'nullable' => false],
                    ['id' => 'orders-created-at', 'name' => 'created_at', 'type' => 'TIMESTAMP', 'pk' => false, 'fk' => false, 'unique' => false, 'nullable' => false],
                ],
                'records' => [
                    'columns' => ['id', 'user_id', 'status'],
                    'rows' => [
                        [101, 1, 'paid'],
                        [102, 2, 'pending'],
                    ],
                ],
                'indexes' => [
                    [
                        'id' => 'idx-orders-user-id',
                        'name' => 'idx_orders_user_id',
                        'columns' => ['user_id'],
                        'unique' => false,
                    ],
                    [
                        'id' => 'idx-orders-status-created',
                        'name' => 'idx_orders_status_created',
                        'columns' => ['status', 'created_at'],
                        'unique' => false,
                    ],
                ],
            ],
            'products' => [
                'position' => ['x' => 420, 'y' => 420],
                'fields' => [
                    ['id' => 'products-id', 'name' => 'id', 'type' => 'SERIAL', 'pk' => true, 'fk' => false, 'unique' => true, 'nullable' => false],
                    ['id' => 'products-title', 'name' => 'title', 'type' => 'VARCHAR', 'pk' => false, 'fk' => false, 'unique' => false, 'nullable' => false],
                    ['id' => 'products-price', 'name' => 'price', 'type' => 'DECIMAL', 'pk' => false, 'fk' => false, 'unique' => false, 'nullable' => false],
                    ['id' => 'products-stock', 'name' => 'stock', 'type' => 'INTEGER', 'pk' => false, 'fk' => false, 'unique' => false, 'nullable' => false],
                ],
                'records' => [
                    'columns' => ['id', 'title', 'price', 'stock'],
                    'rows' => [
                        [201, 'Keyboard', 89.99, 14],
                        [202, 'Mouse', 39.99, 28],
                    ],
                ],
                'indexes' => [
                    [
                        'id' => 'idx-products-title',
                        'name' => 'idx_products_title',
                        'columns' => ['title'],
                        'unique' => false,
                    ],
                ],
            ],
            'order_items' => [
                'position' => ['x' => 780, 'y' => 420],
                'fields' => [
                    ['id' => 'order-items-id', 'name' => 'id', 'type' => 'SERIAL', 'pk' => true, 'fk' => false, 'unique' => true, 'nullable' => false],
                    ['id' => 'order-items-order-id', 'name' => 'order_id', 'type' => 'INTEGER', 'pk' => false, 'fk' => true, 'unique' => false, 'nullable' => false],
                    ['id' => 'order-items-product-id', 'name' => 'product_id', 'type' => 'INTEGER', 'pk' => false, 'fk' => true, 'unique' => false, 'nullable' => false],
                    ['id' => 'order-items-quantity', 'name' => 'quantity', 'type' => 'INTEGER', 'pk' => false, 'fk' => false, 'unique' => false, 'nullable' => false],
                ],
                'records' => [
                    'columns' => ['id', 'order_id', 'product_id', 'quantity'],
                    'rows' => [
                        [301, 101, 201, 1],
                        [302, 102, 202, 2],
                    ],
                ],
                'indexes' => [
                    [
                        'id' => 'idx-order-items-order-product',
                        'name' => 'idx_order_items_order_product',
                        'columns' => ['order_id', 'product_id'],
                        'unique' => false,
                    ],
                ],
            ],
        ];

        return [
            // Frontend ожидает handle id полей внутри edges, поэтому ids таблиц и полей фиксированы.
            'nodes' => array_map(fn (string $name, array $table): array => [
                'id' => $name,
                'type' => 'tableNode',
                'position' => $table['position'],
                'data' => [
                    'tableId' => $name,
                    'name' => $name,
                    'fields' => $table['fields'],
                    'records' => $table['records'] ?? [
                        'columns' => [],
                        'rows' => [],
                    ],
                    'indexes' => $table['indexes'] ?? [],
                ],
            ], array_keys($tables), $tables),
            'edges' => [
                $this->edge('edge-users-orders', 'users', 'orders', 'users-id', 'orders-user-id'),
                $this->edge('edge-orders-order-items', 'orders', 'order_items', 'orders-id', 'order-items-order-id'),
                $this->edge('edge-products-order-items', 'products', 'order_items', 'products-id', 'order-items-product-id'),
            ],
        ];
    }

    /**
     * Текстовая версия стартовой схемы синхронизирована с JSON snapshot для code editor.
     */
    public function schemaCode(): string
    {
        return <<<'DBML'
Table users {
  id SERIAL [pk, unique]
  email VARCHAR [unique, not null]
  name VARCHAR [not null]
  created_at TIMESTAMP [not null]

  Indexes {
    idx_users_email email [unique]
  }
}

Table orders {
  id SERIAL [pk, unique]
  user_id INTEGER [fk, not null]
  status VARCHAR [not null]
  created_at TIMESTAMP [not null]

  Indexes {
    idx_orders_user_id user_id
    idx_orders_status_created (status, created_at)
  }
}

Table products {
  id SERIAL [pk, unique]
  title VARCHAR [not null]
  price DECIMAL [not null]
  stock INTEGER [not null]

  Indexes {
    idx_products_title title
  }
}

Table order_items {
  id SERIAL [pk, unique]
  order_id INTEGER [fk, not null]
  product_id INTEGER [fk, not null]
  quantity INTEGER [not null]

  Indexes {
    idx_order_items_order_product (order_id, product_id)
  }
}

Ref one-to-many: users.id > orders.user_id
Ref one-to-many: orders.id > order_items.order_id
Ref one-to-many: products.id > order_items.product_id

Records users(id, email, name) {
  1, 'alice@example.com', 'Alice'
  2, 'bob@example.com', 'Bob'
  3, 'candice@example.com', 'Candice'
}

Records orders(id, user_id, status) {
  101, 1, 'paid'
  102, 2, 'pending'
}

Records products(id, title, price, stock) {
  201, 'Keyboard', 89.99, 14
  202, 'Mouse', 39.99, 28
}

Records order_items(id, order_id, product_id, quantity) {
  301, 101, 201, 1
  302, 102, 202, 2
}
DBML;
    }

    /**
     * Handle поля хранится внутри edge, иначе линия связи не прикрепится к строке таблицы.
     */
    private function edge(string $id, string $source, string $target, string $sourceField, string $targetField): array
    {
        return [
            'id' => $id,
            'source' => $source,
            'target' => $target,
            'sourceHandle' => "source-{$sourceField}",
            'targetHandle' => "target-{$targetField}",
            'type' => 'smoothstep',
            'animated' => false,
            'label' => 'one-to-many',
            'data' => [
                'relationType' => 'one-to-many',
            ],
            'markerEnd' => [
                'type' => 'arrowclosed',
            ],
            'style' => [
                'strokeWidth' => 2,
                'stroke' => '#2563eb',
            ],
            'labelStyle' => [
                'fill' => '#334155',
                'fontWeight' => 600,
                'fontSize' => 12,
            ],
            'labelBgStyle' => [
                'fill' => '#ffffff',
                'fillOpacity' => 0.9,
            ],
            'labelBgPadding' => [8, 4],
            'labelBgBorderRadius' => 8,
        ];
    }
}
