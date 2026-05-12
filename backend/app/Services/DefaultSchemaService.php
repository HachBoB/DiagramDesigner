<?php

namespace App\Services;

class DefaultSchemaService
{
    public function schemaJson(): array
    {
        $tables = [
            'users' => [
                'position' => ['x' => 420, 'y' => 80],
                'fields' => [
                    ['id' => 'users-id', 'name' => 'id', 'type' => 'SERIAL', 'pk' => true, 'fk' => false, 'unique' => true, 'nullable' => false],
                    ['id' => 'users-email', 'name' => 'email', 'type' => 'VARCHAR', 'pk' => false, 'fk' => false, 'unique' => true, 'nullable' => false],
                    ['id' => 'users-name', 'name' => 'name', 'type' => 'VARCHAR', 'pk' => false, 'fk' => false, 'unique' => false, 'nullable' => false],
                    ['id' => 'users-created-at', 'name' => 'created_at', 'type' => 'TIMESTAMP', 'pk' => false, 'fk' => false, 'unique' => false, 'nullable' => false],
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
            ],
            'products' => [
                'position' => ['x' => 420, 'y' => 420],
                'fields' => [
                    ['id' => 'products-id', 'name' => 'id', 'type' => 'SERIAL', 'pk' => true, 'fk' => false, 'unique' => true, 'nullable' => false],
                    ['id' => 'products-title', 'name' => 'title', 'type' => 'VARCHAR', 'pk' => false, 'fk' => false, 'unique' => false, 'nullable' => false],
                    ['id' => 'products-price', 'name' => 'price', 'type' => 'DECIMAL', 'pk' => false, 'fk' => false, 'unique' => false, 'nullable' => false],
                    ['id' => 'products-stock', 'name' => 'stock', 'type' => 'INTEGER', 'pk' => false, 'fk' => false, 'unique' => false, 'nullable' => false],
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
            ],
        ];

        return [
            'nodes' => array_map(fn (string $name, array $table): array => [
                'id' => $name,
                'type' => 'tableNode',
                'position' => $table['position'],
                'data' => [
                    'tableId' => $name,
                    'name' => $name,
                    'fields' => $table['fields'],
                ],
            ], array_keys($tables), $tables),
            'edges' => [
                $this->edge('edge-users-orders', 'users', 'orders', 'users-id', 'orders-user-id'),
                $this->edge('edge-orders-order-items', 'orders', 'order_items', 'orders-id', 'order-items-order-id'),
                $this->edge('edge-products-order-items', 'products', 'order_items', 'products-id', 'order-items-product-id'),
            ],
        ];
    }

    public function schemaCode(): string
    {
        return <<<'DBML'
Table users {
  id SERIAL [pk, unique]
  email VARCHAR [unique, not null]
  name VARCHAR [not null]
  created_at TIMESTAMP [not null]
}

Table orders {
  id SERIAL [pk, unique]
  user_id INTEGER [ref: > users.id, not null]
  status VARCHAR [not null]
  created_at TIMESTAMP [not null]
}

Table products {
  id SERIAL [pk, unique]
  title VARCHAR [not null]
  price DECIMAL [not null]
  stock INTEGER [not null]
}

Table order_items {
  id SERIAL [pk, unique]
  order_id INTEGER [ref: > orders.id, not null]
  product_id INTEGER [ref: > products.id, not null]
  quantity INTEGER [not null]
}

Ref one-to-many: users.id > orders.user_id
Ref one-to-many: orders.id > order_items.order_id
Ref one-to-many: products.id > order_items.product_id
DBML;
    }

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
