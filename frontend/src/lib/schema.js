export const STORAGE_KEY = 'db-designer-studio:v1'

export const COMMON_FIELD_TYPES = [
  'UUID',
  'INTEGER',
  'BIGINT',
  'VARCHAR(255)',
  'TEXT',
  'BOOLEAN',
  'DATE',
  'TIMESTAMP',
  'DECIMAL(10,2)',
]

const RELATION_META = {
  'one-to-one': {
    label: 'One-to-one',
    shortLabel: '1:1',
    color: '#38bdf8',
    dasharray: undefined,
  },
  'one-to-many': {
    label: 'One-to-many',
    shortLabel: '1:N',
    color: '#fb923c',
    dasharray: undefined,
  },
  'many-to-many': {
    label: 'Many-to-many',
    shortLabel: 'N:M',
    color: '#f472b6',
    dasharray: '7 4',
  },
}

export function getRelationMeta(relationType = 'one-to-many') {
  return RELATION_META[relationType] ?? RELATION_META['one-to-many']
}

export function buildFieldHandleId(direction, side, fieldId) {
  return `field-${direction}-${side}:${fieldId}`
}

export function buildTableHandleId(direction, side) {
  return `table-${direction}-${side}`
}

export function extractFieldIdFromHandle(handleId) {
  if (!handleId) {
    return null
  }

  const positionedMatch = /^field-(?:source|target)-(?:left|right):(.+)$/.exec(handleId)

  if (positionedMatch) {
    return positionedMatch[1]
  }

  const match = /^field-(?:source|target):(.+)$/.exec(handleId)
  return match ? match[1] : null
}

export function resolveEdgeHandles(edge, nodes) {
  const sourceNode = nodes.find((node) => node.id === edge.source)
  const targetNode = nodes.find((node) => node.id === edge.target)

  if (!sourceNode || !targetNode) {
    return {
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }
  }

  const sourceSide = sourceNode.position.x <= targetNode.position.x ? 'right' : 'left'
  const targetSide = sourceSide === 'right' ? 'left' : 'right'
  const sourceFieldId = extractFieldIdFromHandle(edge.sourceHandle)
  const targetFieldId = extractFieldIdFromHandle(edge.targetHandle)

  return {
    sourceHandle: sourceFieldId
      ? buildFieldHandleId('source', sourceSide, sourceFieldId)
      : buildTableHandleId('source', sourceSide),
    targetHandle: targetFieldId
      ? buildFieldHandleId('target', targetSide, targetFieldId)
      : buildTableHandleId('target', targetSide),
  }
}

export function createField(overrides = {}) {
  return normalizeField({
    id: `field-${crypto.randomUUID()}`,
    name: 'new_field',
    type: 'VARCHAR(255)',
    isPrimary: false,
    isForeign: false,
    isUnique: false,
    isNullable: false,
    ...overrides,
  })
}

export function createTable({ name = 'new_table', position = { x: 120, y: 120 } } = {}) {
  return {
    id: `table-${crypto.randomUUID()}`,
    type: 'tableNode',
    position,
    data: {
      label: name,
      fields: [
        createField({
          name: 'id',
          type: 'UUID',
          isPrimary: true,
          isUnique: true,
        }),
        createField({
          name: 'created_at',
          type: 'TIMESTAMP',
        }),
      ],
    },
  }
}

export function getNextTablePosition(index) {
  return {
    x: 120 + (index % 3) * 320,
    y: 120 + Math.floor(index / 3) * 230,
  }
}

export function layoutSchemaNodes(nodes, edges) {
  if (nodes.length === 0) {
    return nodes
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const outgoing = new Map(nodes.map((node) => [node.id, new Set()]))
  const indegree = new Map(nodes.map((node) => [node.id, 0]))

  edges.forEach((edge) => {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target) || edge.source === edge.target) {
      return
    }

    if (outgoing.get(edge.source)?.has(edge.target)) {
      return
    }

    outgoing.get(edge.source)?.add(edge.target)
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1)
  })

  const sortedNodes = [...nodes].sort(
    (left, right) => left.position.y - right.position.y || left.position.x - right.position.x,
  )
  const queue = sortedNodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id)
  const levels = new Map(queue.map((nodeId) => [nodeId, 0]))

  while (queue.length > 0) {
    const currentId = queue.shift()
    const currentLevel = levels.get(currentId) ?? 0

    for (const targetId of outgoing.get(currentId) ?? []) {
      levels.set(targetId, Math.max(levels.get(targetId) ?? 0, currentLevel + 1))
      indegree.set(targetId, (indegree.get(targetId) ?? 1) - 1)

      if ((indegree.get(targetId) ?? 0) === 0) {
        queue.push(targetId)
      }
    }
  }

  let fallbackLevel = Math.max(0, ...levels.values()) + 1

  sortedNodes.forEach((node) => {
    if (!levels.has(node.id)) {
      levels.set(node.id, fallbackLevel)
      fallbackLevel += 1
    }
  })

  const columns = new Map()

  sortedNodes.forEach((node) => {
    const level = levels.get(node.id) ?? 0

    if (!columns.has(level)) {
      columns.set(level, [])
    }

    columns.get(level)?.push(node)
  })

  const positions = new Map()

  ;[...columns.keys()]
    .sort((left, right) => left - right)
    .forEach((level, columnIndex) => {
      let y = 80

      columns.get(level)?.forEach((node) => {
        positions.set(node.id, {
          x: 80 + columnIndex * 420,
          y,
        })

        y += estimateNodeHeight(node) + 92
      })
    })

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }))
}

export function createDemoState() {
  const usersFields = [
    createField({
      id: 'users-id',
      name: 'id',
      type: 'UUID',
      isPrimary: true,
      isUnique: true,
    }),
    createField({
      id: 'users-email',
      name: 'email',
      type: 'VARCHAR(255)',
      isUnique: true,
    }),
    createField({
      id: 'users-name',
      name: 'full_name',
      type: 'VARCHAR(255)',
    }),
    createField({
      id: 'users-created-at',
      name: 'created_at',
      type: 'TIMESTAMP',
    }),
  ]

  const ordersFields = [
    createField({
      id: 'orders-id',
      name: 'id',
      type: 'UUID',
      isPrimary: true,
      isUnique: true,
    }),
    createField({
      id: 'orders-user-id',
      name: 'user_id',
      type: 'UUID',
      isForeign: true,
    }),
    createField({
      id: 'orders-status',
      name: 'status',
      type: 'VARCHAR(64)',
    }),
    createField({
      id: 'orders-total',
      name: 'total_amount',
      type: 'DECIMAL(10,2)',
    }),
  ]

  const productsFields = [
    createField({
      id: 'products-id',
      name: 'id',
      type: 'UUID',
      isPrimary: true,
      isUnique: true,
    }),
    createField({
      id: 'products-name',
      name: 'name',
      type: 'VARCHAR(255)',
    }),
    createField({
      id: 'products-price',
      name: 'price',
      type: 'DECIMAL(10,2)',
    }),
    createField({
      id: 'products-sku',
      name: 'sku',
      type: 'VARCHAR(64)',
      isUnique: true,
    }),
  ]

  const orderItemsFields = [
    createField({
      id: 'order-items-id',
      name: 'id',
      type: 'UUID',
      isPrimary: true,
      isUnique: true,
    }),
    createField({
      id: 'order-items-order-id',
      name: 'order_id',
      type: 'UUID',
      isForeign: true,
    }),
    createField({
      id: 'order-items-product-id',
      name: 'product_id',
      type: 'UUID',
      isForeign: true,
    }),
    createField({
      id: 'order-items-quantity',
      name: 'quantity',
      type: 'INTEGER',
    }),
  ]

  return {
    projectName: 'DB Design Diploma Workspace',
    description: 'Interactive database schema editor prototype with demo relations.',
    nodes: [
      {
        id: 'users',
        type: 'tableNode',
        position: { x: 70, y: 120 },
        data: {
          label: 'users',
          fields: usersFields,
        },
      },
      {
        id: 'orders',
        type: 'tableNode',
        position: { x: 470, y: 120 },
        data: {
          label: 'orders',
          fields: ordersFields,
        },
      },
      {
        id: 'products',
        type: 'tableNode',
        position: { x: 70, y: 470 },
        data: {
          label: 'products',
          fields: productsFields,
        },
      },
      {
        id: 'order-items',
        type: 'tableNode',
        position: { x: 470, y: 470 },
        data: {
          label: 'order_items',
          fields: orderItemsFields,
        },
      },
    ],
    edges: [
      {
        id: 'edge-users-orders',
        source: 'users',
        sourceHandle: buildFieldHandleId('source', 'right', 'users-id'),
        target: 'orders',
        targetHandle: buildFieldHandleId('target', 'left', 'orders-user-id'),
        data: {
          relationType: 'one-to-many',
        },
      },
      {
        id: 'edge-orders-order-items',
        source: 'orders',
        sourceHandle: buildFieldHandleId('source', 'right', 'orders-id'),
        target: 'order-items',
        targetHandle: buildFieldHandleId('target', 'left', 'order-items-order-id'),
        data: {
          relationType: 'one-to-many',
        },
      },
      {
        id: 'edge-products-order-items',
        source: 'products',
        sourceHandle: buildFieldHandleId('source', 'right', 'products-id'),
        target: 'order-items',
        targetHandle: buildFieldHandleId('target', 'left', 'order-items-product-id'),
        data: {
          relationType: 'one-to-many',
        },
      },
    ],
  }
}

export function readStoredSchema() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return createDemoState()
    }

    return JSON.parse(stored)
  } catch {
    return createDemoState()
  }
}

export function normalizeSchemaState(input) {
  const fallback = createDemoState()

  if (!input || typeof input !== 'object') {
    return fallback
  }

  const projectName =
    typeof input.projectName === 'string' && input.projectName.trim()
      ? input.projectName
      : fallback.projectName
  const description = typeof input.description === 'string' ? input.description : fallback.description

  const nodes = Array.isArray(input.nodes) ? input.nodes.map(normalizeNode).filter(Boolean) : []
  const edges = Array.isArray(input.edges) ? input.edges.map(normalizeEdge).filter(Boolean) : []

  return {
    projectName,
    description,
    nodes: nodes.length > 0 ? nodes : fallback.nodes,
    edges,
  }
}

export function createBlankState(projectName = 'Untitled project') {
  return {
    version: 1,
    projectName,
    description: '',
    nodes: [],
    edges: [],
  }
}

export function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function generateSqlScript(projectName, nodes, edges) {
  const statements = nodes.map((node) => buildCreateTableStatement(node, nodes, edges))

  return [
    `-- ${projectName || 'DB schema'}`,
    `-- Generated at ${new Date().toISOString()}`,
    '',
    ...statements,
  ].join('\n')
}

function normalizeNode(node) {
  if (!node || typeof node !== 'object') {
    return null
  }

  const fields = Array.isArray(node.data?.fields)
    ? node.data.fields.map(normalizeField).filter(Boolean)
    : []

  return {
    id: String(node.id || `table-${crypto.randomUUID()}`),
    type: 'tableNode',
    position: normalizePosition(node.position),
    selected: Boolean(node.selected),
    data: {
      label:
        typeof node.data?.label === 'string' && node.data.label.trim()
          ? node.data.label
          : 'new_table',
      fields,
    },
  }
}

function normalizeField(field) {
  if (!field || typeof field !== 'object') {
    return null
  }

  const normalized = {
    id: String(field.id || `field-${crypto.randomUUID()}`),
    name: typeof field.name === 'string' ? field.name : 'new_field',
    type: typeof field.type === 'string' && field.type.trim() ? field.type : 'TEXT',
    isPrimary: Boolean(field.isPrimary),
    isForeign: Boolean(field.isForeign),
    isUnique: Boolean(field.isUnique),
    isNullable: Boolean(field.isNullable),
  }

  if (normalized.isPrimary) {
    normalized.isUnique = true
    normalized.isNullable = false
  }

  return normalized
}

function normalizeEdge(edge) {
  if (!edge || typeof edge !== 'object' || !edge.source || !edge.target) {
    return null
  }

  return {
    id: String(edge.id || `edge-${crypto.randomUUID()}`),
    source: String(edge.source),
    sourceHandle: edge.sourceHandle ? String(edge.sourceHandle) : undefined,
    target: String(edge.target),
    targetHandle: edge.targetHandle ? String(edge.targetHandle) : undefined,
    selected: Boolean(edge.selected),
    data: {
      relationType:
        edge.data?.relationType && RELATION_META[edge.data.relationType]
          ? edge.data.relationType
          : 'one-to-many',
    },
  }
}

function normalizePosition(position) {
  return {
    x: Number.isFinite(position?.x) ? position.x : 120,
    y: Number.isFinite(position?.y) ? position.y : 120,
  }
}

function estimateNodeHeight(node) {
  return 210 + node.data.fields.length * 74
}

function buildCreateTableStatement(node, nodes, edges) {
  const tableName = sanitizeIdentifier(node.data.label || node.id)
  const fields = node.data.fields
  const primaryKeys = fields.filter((field) => field.isPrimary)
  const referencedByTable = collectForeignKeysForTable(node, nodes, edges)
  const relationUniqueFields = new Set(
    referencedByTable
      .filter((relation) => relation.relationType === 'one-to-one')
      .map((relation) => relation.targetFieldName),
  )

  const lines = fields.map((field) => {
    const columnName = sanitizeIdentifier(field.name || 'column_name')
    const dataType = field.type || 'TEXT'
    const parts = [`  "${columnName}" ${dataType}`]

    if (!field.isNullable || field.isPrimary) {
      parts.push('NOT NULL')
    }

    if (field.isUnique && !field.isPrimary) {
      parts.push('UNIQUE')
    }

    return parts.join(' ')
  })

  if (primaryKeys.length > 0) {
    lines.push(
      `  PRIMARY KEY (${primaryKeys.map((field) => `"${sanitizeIdentifier(field.name)}"`).join(', ')})`,
    )
  }

  relationUniqueFields.forEach((fieldName) => {
    const field = fields.find((item) => sanitizeIdentifier(item.name) === fieldName)

    if (field && !field.isPrimary && !field.isUnique) {
      lines.push(`  UNIQUE ("${fieldName}")`)
    }
  })

  referencedByTable.forEach((relation, index) => {
    lines.push(
      `  CONSTRAINT "fk_${tableName}_${relation.targetFieldName}_${index + 1}" FOREIGN KEY ("${relation.targetFieldName}") REFERENCES "${relation.sourceTableName}" ("${relation.sourceFieldName}")`,
    )
  })

  return `CREATE TABLE "${tableName}" (\n${lines.join(',\n')}\n);\n`
}

function collectForeignKeysForTable(targetNode, nodes, edges) {
  return edges
    .filter((edge) => edge.target === targetNode.id)
    .map((edge) => {
      const sourceFieldId = extractFieldIdFromHandle(edge.sourceHandle)
      const targetFieldId = extractFieldIdFromHandle(edge.targetHandle)
      const sourceNode = nodes.find((node) => node.id === edge.source)
      const target = nodes.find((node) => node.id === edge.target)
      const sourceField = sourceNode?.data.fields.find((field) => field.id === sourceFieldId)
      const targetField = target?.data.fields.find((field) => field.id === targetFieldId)

      if (!sourceNode || !target || !sourceField || !targetField) {
        return null
      }

      return {
        relationType: edge.data?.relationType || 'one-to-many',
        sourceTableName: sanitizeIdentifier(sourceNode.data.label),
        sourceFieldName: sanitizeIdentifier(sourceField.name),
        targetFieldName: sanitizeIdentifier(targetField.name),
      }
    })
    .filter(Boolean)
}

function sanitizeIdentifier(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/"/g, '')
}
