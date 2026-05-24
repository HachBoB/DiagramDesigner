import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactFlow, {
    Background,
    Controls,
    ReactFlowProvider,
    addEdge,
    applyNodeChanges,
    useEdgesState,
    useNodesState
} from "reactflow";
import { CheckCircle2, CloudOff, Database, Eye, FileJson, FileText, FileUp, Loader2, Lock, RotateCcw, Unlock } from "lucide-react";

import TableNode from "../nodes/TableNode.jsx";
import StickyNoteNode from "../nodes/StickyNoteNode.jsx";
import RecordsModal from "../components/RecordsModal.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import ProfileButton from "../components/ProfileButton.jsx";
import Sidebar from "../components/Sidebar.jsx";
import SqlEditor from "../components/SqlEditor.jsx";
import PropertiesPanel from "../components/PropertiesPanel.jsx";
import ExportModal from "../components/ExportModal.jsx";
import ImportSqlModal from "../components/ImportSqlModal.jsx";
import CanvasToolbar from "../components/CanvasToolbar.jsx";
import { DEFAULT_DIALECT } from "../types/databaseTypes.js";
import { generateDBML, generateSQL } from "../utils/sqlGenerator.js";
import { parseDBMLToSchema } from "../utils/dbmlParser.js";
import { parseSQLToSchema } from "../utils/sqlImporter.js";
import {
    createRelationEdge,
    createStarterSchema,
    createTableNode,
    hasSchemaSnapshot,
    normalizeSchemaSnapshot
} from "../utils/schemaFactory.js";
import { downloadTextFile } from "../utils/download.js";
import {
    getApiErrorMessage,
    getSharedProject,
    unlockSharedProject,
    updateSharedProject
} from "../lib/api.js";

const nodeTypes = {
    tableNode: TableNode,
    stickyNote: StickyNoteNode
};

// Shared editor создает заметки в том же snapshot формате, что личный editor.
function createStickyNote(position = { x: 180, y: 160 }) {
    const noteId = `note-${crypto.randomUUID()}`;

    return {
        id: noteId,
        type: "stickyNote",
        position,
        data: {
            noteId,
            text: "New note"
        }
    };
}

// React Flow handle id содержит технический префикс, убираем его до сравнения.
function getFieldIdFromHandle(handleId) {
    return String(handleId || "")
        .replace("source-", "")
        .replace("target-", "");
}

// Возвращаем только поля, для которых handles реально видны на текущем canvas.
function getVisibleFieldIds(node, detailLevel) {
    if (!node || detailLevel === "all-fields") {
        return null;
    }

    const fields = Array.isArray(node.data?.fields) ? node.data.fields : [];

    if (detailLevel === "table-names") {
        return new Set();
    }

    const indexedFields = new Set();

    (node.data?.indexes || []).forEach((indexItem) => {
        (indexItem.columns || []).forEach((column) => indexedFields.add(column));
    });

    return new Set(
        fields
            .filter((field) => field.pk || field.fk || field.unique || indexedFields.has(field.name))
            .map((field) => field.id)
    );
}

// Связь остается видимой даже когда режим детализации скрыл ее строку поля.
function getEdgeForDetailLevel(edge, nodes, detailLevel) {
    if (detailLevel === "all-fields") {
        return edge;
    }

    const sourceNode = nodes.find((node) => node.id === edge.source);
    const targetNode = nodes.find((node) => node.id === edge.target);
    const sourceFieldIds = getVisibleFieldIds(sourceNode, detailLevel);
    const targetFieldIds = getVisibleFieldIds(targetNode, detailLevel);
    const nextEdge = { ...edge };

    if (!sourceFieldIds?.has(getFieldIdFromHandle(edge.sourceHandle))) {
        delete nextEdge.sourceHandle;
    }

    if (!targetFieldIds?.has(getFieldIdFromHandle(edge.targetHandle))) {
        delete nextEdge.targetHandle;
    }

    return nextEdge;
}

/**
 * Shared canvas выделяет связи выбранной таблицы или выбранной линии и заодно
 * переводит handles в форму, допустимую для текущего detail level.
 */
function buildHighlightedEdges(edges, nodes, detailLevel, relationsHighlighted = false, selectedEdgeId = null, selectedNodeId = null) {
    return edges.map((edge) => {
        const displayEdge = getEdgeForDetailLevel(edge, nodes, detailLevel);
        const isSelectedEdge = edge.id === selectedEdgeId;
        const isRelatedToSelectedTable = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);

        if (isSelectedEdge) {
            return {
                ...displayEdge,
                animated: true,
                className: "edge-electric",
                style: {
                    ...(edge.style || {}),
                    stroke: "#f59e0b",
                    strokeWidth: 4,
                    opacity: 1
                }
            };
        }

        if (relationsHighlighted || isRelatedToSelectedTable) {
            return {
                ...displayEdge,
                animated: true,
                className: "edge-electric",
                style: {
                    ...(edge.style || {}),
                    stroke: "#38bdf8",
                    strokeWidth: 3,
                    opacity: 1
                }
            };
        }

        if (!selectedNodeId && !selectedEdgeId) {
            return displayEdge;
        }

        return {
            ...displayEdge,
            className: "edge-muted",
            style: {
                ...(edge.style || {}),
                opacity: 0.35
            }
        };
    });
}

// React Flow provider нужен и read-only, и редактируемому shared проекту.
export default function SharedProjectPage({ theme, onToggleTheme }) {
    return (
        <ReactFlowProvider>
            <SharedProjectContent theme={theme} onToggleTheme={onToggleTheme} />
        </ReactFlowProvider>
    );
}

/**
 * Обертка shared route проверяет token, пароль ссылки и permission,
 * а потом выбирает read-only показ или совместный редактор.
 */
function SharedProjectContent({ theme, onToggleTheme }) {
    const { token } = useParams();
    const [project, setProject] = useState(null);
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState("");
    const [password, setPassword] = useState("");
    const [accessPassword, setAccessPassword] = useState("");
    const [recordsTableId, setRecordsTableId] = useState(null);
    const [detailLevel, setDetailLevel] = useState("all-fields");
    const [showGrid, setShowGrid] = useState(true);
    const [relationsHighlighted, setRelationsHighlighted] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        getSharedProject(token, controller.signal)
            .then((payload) => {
                setProject(payload);
                setAccessPassword("");
                setStatus("ready");
            })
            .catch((requestError) => {
                if (requestError.name === "AbortError") {
                    return;
                }

                if (requestError.status === 423) {
                    setProject({
                        name: requestError.details?.name || "Закрытый проект",
                        owner: requestError.details?.owner
                    });
                    setStatus("password");
                    return;
                }

                setStatus("error");
                setError(getApiErrorMessage(requestError, "Не удалось открыть проект по ссылке."));
            });

        return () => controller.abort();
    }, [token]);

    const schema = hasSchemaSnapshot(project?.schema_json)
        ? normalizeSchemaSnapshot(project.schema_json)
        : { nodes: [], edges: [], notes: [] };

    const nodes = useMemo(() => {
        return schema.nodes.map((node) => ({
            ...node,
            data: {
                ...node.data,
                detailLevel,
                onOpenRecords: setRecordsTableId
            }
        }));
    }, [schema.nodes, detailLevel]);

    const noteNodes = useMemo(() => {
        return Array.isArray(schema.notes) ? schema.notes : [];
    }, [schema.notes]);

    const visibleEdges = useMemo(() => {
        return buildHighlightedEdges(schema.edges || [], schema.nodes || [], detailLevel, relationsHighlighted);
    }, [schema.edges, schema.nodes, detailLevel, relationsHighlighted]);

    const recordsTable = nodes.find((node) => node.id === recordsTableId) || null;

    const schemaCode = project?.schema_code || generateDBML(schema.nodes, schema.edges);

    async function unlockProject(event) {
        event.preventDefault();
        setStatus("unlocking");
        setError("");

        try {
            const payload = await unlockSharedProject(token, password);
            setProject(payload);
            setAccessPassword(password);
            setStatus("ready");
            setPassword("");
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Не удалось открыть проект."));
            setStatus("password");
        }
    }

    if (status === "loading") {
        return <SharedShell theme={theme} onToggleTheme={onToggleTheme} title="Открываем проект..." />;
    }

    if (status === "password" || status === "unlocking") {
        return (
            <SharedShell theme={theme} onToggleTheme={onToggleTheme} title={project?.name || "Проект защищен"}>
                <form
                    onSubmit={unlockProject}
                    className="mx-auto mt-16 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900"
                >
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                        <Lock size={26} />
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        Нужен пароль
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Владелец защитил ссылку паролем. Введите пароль, чтобы посмотреть схему.
                    </p>

                    {error && (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                            {error}
                        </div>
                    )}

                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Пароль"
                        className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-950"
                    />

                    <button
                        type="submit"
                        disabled={status === "unlocking"}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Unlock size={17} />
                        {status === "unlocking" ? "Открываем..." : "Открыть проект"}
                    </button>
                </form>
            </SharedShell>
        );
    }

    if (status === "error") {
        return (
            <SharedShell theme={theme} onToggleTheme={onToggleTheme} title="Ссылка недоступна">
                <div className="mx-auto mt-16 max-w-xl rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                    <h1 className="text-2xl font-extrabold">Не удалось открыть проект</h1>
                    <p className="mt-2 text-sm leading-6">{error}</p>
                </div>
            </SharedShell>
        );
    }

    if (project.can_edit) {
        return (
            <SharedEditableProject
                token={token}
                project={project}
                accessPassword={accessPassword}
                theme={theme}
                onToggleTheme={onToggleTheme}
            />
        );
    }

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
            <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex min-w-0 items-center gap-3">
                    <Database className="shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-extrabold text-slate-900 dark:text-white">
                            {project.name}
                        </h1>
                        <p className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <Eye size={14} />
                            Просмотр по ссылке
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                    <ProfileButton />
                    <Link
                        to="/"
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        На главную
                    </Link>
                </div>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-[420px_1fr] overflow-hidden">
                <aside className="overflow-auto border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-3 text-xs font-bold uppercase text-slate-500">
                        Код схемы
                    </div>
                    <pre className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                        {schemaCode}
                    </pre>
                </aside>

                <main className="relative min-h-0 overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <ReactFlow
                        nodes={[...nodes, ...noteNodes]}
                        edges={visibleEdges}
                        nodeTypes={nodeTypes}
                        nodesDraggable={false}
                        nodesConnectable={false}
                        elementsSelectable={false}
                        panOnDrag
                        zoomOnScroll
                        zoomOnPinch
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                    >
                        {showGrid && <Background gap={18} size={1} />}
                        <Controls />
                    </ReactFlow>
                    <CanvasToolbar
                        detailLevel={detailLevel}
                        onDetailLevelChange={setDetailLevel}
                        relationsHighlighted={relationsHighlighted}
                        onToggleRelations={() => setRelationsHighlighted((value) => !value)}
                        gridVisible={showGrid}
                        onToggleGrid={() => setShowGrid((value) => !value)}
                        relationsCount={(schema.edges || []).length}
                        notesCount={noteNodes.length}
                    />
                </main>
            </div>

            <RecordsModal
                table={recordsTable}
                onClose={() => setRecordsTableId(null)}
            />
        </div>
    );
}

/**
 * Совместный редактор сохраняет schema snapshot через share token.
 * Он похож на EditorPage, но не дает владельческих действий вроде share settings.
 */
function SharedEditableProject({ token, project, accessPassword, theme, onToggleTheme }) {
    const schema = hasSchemaSnapshot(project.schema_json)
        ? normalizeSchemaSnapshot(project.schema_json)
        : createStarterSchema();
    const sqlEditorRef = useRef(null);
    // Общий проект использует тот же цикл canvas <-> code, но сохраняется по share token.
    const changeSourceRef = useRef("remote");
    // Первое render-состояние уже пришло из API, его не нужно сразу отправлять обратно.
    const hasLoadedRef = useRef(false);

    const [projectName, setProjectName] = useState(project.name || "Проект");
    const [dialect, setDialect] = useState(project.dialect || DEFAULT_DIALECT);
    const [exportDialect, setExportDialect] = useState(project.dialect || DEFAULT_DIALECT);
    const [nodes, setNodes, onNodesChangeBase] = useNodesState(schema.nodes);
    const [edges, setEdges, onEdgesChangeBase] = useEdgesState(schema.edges);
    const [notes, setNotes] = useState(() => Array.isArray(schema.notes) ? schema.notes : []);
    const [detailLevel, setDetailLevel] = useState("all-fields");
    const [showGrid, setShowGrid] = useState(true);
    const [relationsHighlighted, setRelationsHighlighted] = useState(false);
    const [schemaCode, setSchemaCode] = useState(project.schema_code || generateDBML(schema.nodes, schema.edges));
    const [schemaErrors, setSchemaErrors] = useState([]);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState(null);
    const [recordsTableId, setRecordsTableId] = useState(null);
    const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
    const [isImportSqlModalOpen, setIsImportSqlModalOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState("saved");
    const [saveError, setSaveError] = useState("");

    const selectedTable = nodes.find((node) => node.id === selectedNodeId && node.type === "tableNode") || null;
    const selectedRelation = edges.find((edge) => edge.id === selectedEdgeId) || null;
    const recordsTable = nodes.find((node) => node.id === recordsTableId) || null;

    const exportSql = useMemo(() => generateSQL(nodes, edges, exportDialect), [nodes, edges, exportDialect]);

    const flowNodes = useMemo(() => {
        return nodes.map((node) => ({
            ...node,
            data: {
                ...node.data,
                detailLevel,
                onDoubleClick: selectTableCode,
                onOpenRecords: openRecords,
                onConfigure: selectTable
            }
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, schemaCode, detailLevel]);

    const flowNotes = useMemo(() => {
        return notes.map((note) => ({
            ...note,
            data: {
                ...note.data,
                onChange: (noteId, text) => {
                    setNotes((currentNotes) => currentNotes.map((currentNote) => {
                        if (currentNote.id !== noteId) {
                            return currentNote;
                        }

                        return {
                            ...currentNote,
                            data: {
                                ...currentNote.data,
                                text
                            }
                        };
                    }));
                },
                onDelete: (noteId) => {
                    setNotes((currentNotes) =>
                        currentNotes.filter((currentNote) => currentNote.id !== noteId)
                    );

                    if (selectedNodeId === noteId) {
                        setSelectedNodeId(null);
                    }
                }
            }
        }));
    }, [notes, selectedNodeId]);

    const visibleEdges = useMemo(() => {
        return buildHighlightedEdges(edges, nodes, detailLevel, relationsHighlighted, selectedEdgeId, selectedNodeId);
    }, [edges, nodes, detailLevel, relationsHighlighted, selectedEdgeId, selectedNodeId]);

    // Для shared edit сохраняем snapshot с debounce и пароль добавляем только когда ссылка этого требует.
    useEffect(() => {
        if (!hasLoadedRef.current) {
            // Первый render отражает данные, которые уже пришли по share-link.
            hasLoadedRef.current = true;
            return;
        }

        // Некорректный DBML-like код остается локально в editor до исправления.
        if (schemaErrors.length > 0) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setSaveStatus("saving");

            // В shared route project id скрыт, поэтому сохранение идет по token и опциональному паролю.
            updateSharedProject(token, {
                name: projectName || "Проект",
                dialect,
                schema_code: schemaCode,
                schema_json: {
                    nodes,
                    edges,
                    notes
                }
            }, accessPassword)
                .then(() => {
                    setSaveStatus("saved");
                    setSaveError("");
                })
                .catch((requestError) => {
                    setSaveStatus("error");
                    setSaveError(getApiErrorMessage(requestError, "Не удалось сохранить изменения."));
                });
        }, 900);

        return () => window.clearTimeout(timeoutId);
    }, [accessPassword, dialect, edges, nodes, notes, projectName, schemaCode, schemaErrors, token]);

    // Изменения на canvas обновляют текст схемы, если источником был не parser.
    useEffect(() => {
        // Parser и remote initialization уже знают текущий текст, повторно генерировать его не надо.
        if (changeSourceRef.current !== "canvas") {
            if (changeSourceRef.current === "remote") {
                changeSourceRef.current = "canvas";
            }

            return;
        }

        // Canvas-редактирование должно быть видно всем участникам и в текстовом виде.
        setSchemaCode(generateDBML(nodes, edges));
        setSchemaErrors([]);
    }, [nodes, edges]);

    // Редактирование DBML-like кода пересобирает shared canvas после паузы набора.
    useEffect(() => {
        // Этот parser запускается только после ручного редактирования DBML-like панели.
        if (changeSourceRef.current !== "code") {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            // Текущие nodes нужны parser'у, чтобы не пересоздавать id и позиции при каждом вводе.
            const parsed = parseDBMLToSchema(schemaCode, nodes);

            if (parsed.errors.length > 0) {
                setSchemaErrors(parsed.errors);
                return;
            }

            setSchemaErrors([]);
            changeSourceRef.current = "code";
            setNodes(parsed.nodes);
            setEdges(parsed.edges);
        }, 450);

        return () => window.clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schemaCode]);

    const onConnect = useCallback((connection) => {
        const edge = createRelationEdge(
            connection.source,
            connection.target,
            connection.sourceHandle,
            connection.targetHandle,
            "one-to-many"
        );

        changeSourceRef.current = "canvas";
        setEdges((currentEdges) => addEdge(edge, currentEdges));
        setSelectedNodeId(null);
        setSelectedEdgeId(edge.id);
    }, [setEdges]);

    const onNodesChange = useCallback((changes) => {
        changeSourceRef.current = "canvas";
        // React Flow смешивает table nodes и заметки, а snapshot хранит их раздельно.
        const noteIds = new Set(notes.map((note) => note.id));
        const noteChanges = changes.filter((change) => noteIds.has(change.id));
        const tableChanges = changes.filter((change) => !noteIds.has(change.id));

        if (tableChanges.length > 0) {
            onNodesChangeBase(tableChanges);
        }

        if (noteChanges.length > 0) {
            setNotes((currentNotes) => applyNodeChanges(noteChanges, currentNotes));
        }
    }, [notes, onNodesChangeBase]);

    const onEdgesChange = useCallback((changes) => {
        changeSourceRef.current = "canvas";
        onEdgesChangeBase(changes);
    }, [onEdgesChangeBase]);

    function handleSchemaCodeChange(nextCode) {
        changeSourceRef.current = "code";
        setSchemaCode(nextCode);
    }

    function addTable() {
        const node = createTableNode(nodes.length + 1, {
            x: 250 + nodes.length * 40,
            y: 100 + nodes.length * 40
        });

        changeSourceRef.current = "canvas";
        setNodes((currentNodes) => [...currentNodes, node]);
        setSelectedNodeId(node.id);
        setSelectedEdgeId(null);
    }

    function addStickyNote() {
        const note = createStickyNote({
            x: 180 + notes.length * 28,
            y: 140 + notes.length * 28
        });

        setNotes((currentNotes) => [...currentNotes, note]);
        setSelectedNodeId(note.id);
        setSelectedEdgeId(null);
    }

    function deleteSelected() {
        if (selectedEdgeId) {
            setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== selectedEdgeId));
            setSelectedEdgeId(null);
            return;
        }

        if (!selectedNodeId) {
            return;
        }

        if (notes.some((note) => note.id === selectedNodeId)) {
            setNotes((currentNotes) => currentNotes.filter((note) => note.id !== selectedNodeId));
            setSelectedNodeId(null);
            return;
        }

        changeSourceRef.current = "canvas";
        setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNodeId));
        setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
        setSelectedNodeId(null);
    }

    function updateTable(updatedTable) {
        changeSourceRef.current = "canvas";
        setNodes((currentNodes) => currentNodes.map((node) => node.id === updatedTable.id ? updatedTable : node));
    }

    function deleteField(tableId, fieldId) {
        changeSourceRef.current = "canvas";
        setNodes((currentNodes) => currentNodes.map((node) => {
            if (node.id !== tableId) {
                return node;
            }

            return {
                ...node,
                data: {
                    ...node.data,
                    fields: node.data.fields.filter((field) => field.id !== fieldId)
                }
            };
        }));
        setEdges((currentEdges) => currentEdges.filter((edge) => edge.sourceHandle !== `source-${fieldId}` && edge.targetHandle !== `target-${fieldId}`));
    }

    function updateRelation(updatedRelation) {
        changeSourceRef.current = "canvas";
        setEdges((currentEdges) => currentEdges.map((edge) => {
            if (edge.id !== updatedRelation.id) {
                return edge;
            }

            return {
                ...edge,
                ...updatedRelation,
                label: updatedRelation.data?.relationType || updatedRelation.label
            };
        }));
    }

    function deleteRelation(relationId) {
        changeSourceRef.current = "canvas";
        setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== relationId));
        setSelectedEdgeId(null);
    }

    function resetSchema() {
        const nextSchema = createStarterSchema();
        changeSourceRef.current = "canvas";
        setNodes(nextSchema.nodes);
        setEdges(nextSchema.edges);
        setNotes([]);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setSchemaErrors([]);
        setSchemaCode(generateDBML(nextSchema.nodes, nextSchema.edges));
    }

    function exportJson() {
        downloadTextFile(`${projectName || "schema"}.json`, JSON.stringify({
            projectName,
            dialect,
            nodes,
            edges,
            notes
        }, null, 2), "application/json");
    }

    function downloadSql() {
        downloadTextFile(`${projectName || "schema"}-${exportDialect}.sql`, exportSql, "text/sql");
    }

    // SQL-import в командном проекте работает как обычное редактирование и уйдет в shared autosave.
    function importSql(nextSql, nextDialect) {
        const parsed = parseSQLToSchema(nextSql);

        // Ошибочный SQL не должен затирать общий проект для остальных участников.
        if (parsed.errors.length > 0) {
            return parsed;
        }

        // После успешного импорта изменения уйдут через обычный shared autosave.
        changeSourceRef.current = "canvas";
        setDialect(nextDialect || dialect);
        setExportDialect(nextDialect || dialect);
        setNodes(parsed.nodes);
        setEdges(parsed.edges);
        setNotes([]);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setRecordsTableId(null);
        setSchemaErrors([]);
        setSchemaCode(generateDBML(parsed.nodes, parsed.edges));
        setIsImportSqlModalOpen(false);

        return parsed;
    }

    function selectTableCode(tableName) {
        const textarea = sqlEditorRef.current;

        if (!textarea) {
            return;
        }

        const escapedTableName = String(tableName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const tableRegex = new RegExp(`Table\\s+${escapedTableName}\\s*\\{[\\s\\S]*?\\}`, "m");
        const match = tableRegex.exec(schemaCode);

        if (!match) {
            return;
        }

        setSelectedNodeId(nodes.find((item) => item.data.name === tableName)?.id || null);
        setSelectedEdgeId(null);

        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(match.index, match.index + match[0].length);
        });
    }

    function openRecords(tableId) {
        setRecordsTableId(tableId);
        setSelectedNodeId(tableId);
        setSelectedEdgeId(null);
    }

    function selectTable(tableId) {
        setSelectedNodeId(tableId);
        setSelectedEdgeId(null);
    }

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-app-bg dark:bg-slate-950">
            <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex min-w-0 items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Database size={22} className="text-blue-600 dark:text-blue-400" />
                        <input
                            value={projectName}
                            onChange={(event) => setProjectName(event.target.value)}
                            className="w-[320px] rounded-xl border border-transparent bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:bg-slate-900 dark:focus:ring-blue-950"
                        />
                    </div>

                    <span className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        <Eye size={15} />
                        Совместное редактирование
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <SharedSaveIndicator saveStatus={saveStatus} error={saveError} />
                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                    <ProfileButton />
                    <button
                        onClick={resetSchema}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <RotateCcw size={16} />
                        Сбросить
                    </button>
                    <button
                        onClick={() => setIsImportSqlModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <FileUp size={16} />
                        Импорт SQL
                    </button>
                    <button
                        onClick={exportJson}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <FileJson size={16} />
                        JSON
                    </button>
                    <button
                        onClick={() => setIsSqlModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                    >
                        <FileText size={16} />
                        SQL
                    </button>
                </div>
            </header>

            <div className="flex min-h-0 flex-1 overflow-hidden">
                <Sidebar
                    onAddTable={addTable}
                    onDeleteSelected={deleteSelected}
                    selectedTable={selectedTable || selectedRelation}
                />
                <SqlEditor
                    ref={sqlEditorRef}
                    value={schemaCode}
                    onChange={handleSchemaCodeChange}
                    errors={schemaErrors}
                />
                <main className="relative h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <ReactFlow
                        nodes={[...flowNodes, ...flowNotes]}
                        edges={visibleEdges}
                        nodeTypes={nodeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={(_, node) => {
                            setSelectedNodeId(node.id);
                            setSelectedEdgeId(null);
                        }}
                        onEdgeClick={(event, edge) => {
                            event.stopPropagation();
                            setSelectedEdgeId(edge.id);
                            setSelectedNodeId(null);
                        }}
                        onPaneClick={() => {
                            setSelectedNodeId(null);
                            setSelectedEdgeId(null);
                        }}
                        nodesDraggable
                        nodesConnectable
                        elementsSelectable
                        selectNodesOnDrag={false}
                        panOnDrag
                        zoomOnScroll
                        zoomOnPinch
                        zoomOnDoubleClick={false}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                    >
                        {showGrid && <Background gap={18} size={1} />}
                        <Controls />
                    </ReactFlow>
                    <CanvasToolbar
                        detailLevel={detailLevel}
                        onDetailLevelChange={setDetailLevel}
                        relationsHighlighted={relationsHighlighted}
                        onToggleRelations={() => setRelationsHighlighted((value) => !value)}
                        gridVisible={showGrid}
                        onToggleGrid={() => setShowGrid((value) => !value)}
                        onAddNote={addStickyNote}
                        relationsCount={edges.length}
                        notesCount={notes.length}
                    />
                </main>
                <PropertiesPanel
                    selectedTable={selectedTable}
                    selectedRelation={selectedRelation}
                    dialect={dialect}
                    onUpdateTable={updateTable}
                    onDeleteField={deleteField}
                    onUpdateRelation={updateRelation}
                    onDeleteRelation={deleteRelation}
                />
            </div>

            <ExportModal
                open={isSqlModalOpen}
                dialect={exportDialect}
                onDialectChange={setExportDialect}
                sql={exportSql}
                onClose={() => setIsSqlModalOpen(false)}
                onDownload={downloadSql}
            />
            <ImportSqlModal
                open={isImportSqlModalOpen}
                dialect={dialect}
                onClose={() => setIsImportSqlModalOpen(false)}
                onImport={importSql}
            />
            <RecordsModal
                table={recordsTable}
                onClose={() => setRecordsTableId(null)}
            />
        </div>
    );
}

// Статус shared autosave вынесен отдельно от тяжелой разметки canvas.
function SharedSaveIndicator({ saveStatus, error }) {
    if (saveStatus === "saving") {
        return (
            <span className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Loader2 size={15} className="animate-spin" />
                Сохранение
            </span>
        );
    }

    if (saveStatus === "error") {
        return (
            <span title={error} className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                <CloudOff size={15} />
                Ошибка
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 size={15} />
            Сохранено
        </span>
    );
}

// Общая оболочка для загрузки, ошибки пароля и read-only shared просмотра.
function SharedShell({ title, theme, onToggleTheme, children }) {
    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
            <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 font-extrabold">
                    <Database className="text-blue-600 dark:text-blue-400" />
                    {title}
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                    <ProfileButton />
                </div>
            </header>
            <main className="px-6 py-8">
                {children}
            </main>
        </div>
    );
}
