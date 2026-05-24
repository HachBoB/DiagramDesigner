import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ReactFlow, {
    Background,
    Controls,
    ReactFlowProvider,
    addEdge,
    applyNodeChanges,
    useEdgesState,
    useNodesState
} from "reactflow";

import TableNode from "../nodes/TableNode.jsx";
import StickyNoteNode from "../nodes/StickyNoteNode.jsx";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import SqlEditor from "../components/SqlEditor.jsx";
import PropertiesPanel from "../components/PropertiesPanel.jsx";
import ExportModal from "../components/ExportModal.jsx";
import ImportSqlModal from "../components/ImportSqlModal.jsx";
import RecordsModal from "../components/RecordsModal.jsx";
import ShareSettingsModal from "../components/ShareSettingsModal.jsx";
import AiAssistantPanel from "../components/AiAssistantPanel.jsx";
import CanvasToolbar from "../components/CanvasToolbar.jsx";

import { DEFAULT_DIALECT } from "../types/databaseTypes.js";
import {
    createEmptySchema,
    createRelationEdge,
    createStarterSchema,
    createTableNode,
    hasSchemaSnapshot,
    normalizeSchemaSnapshot
} from "../utils/schemaFactory.js";
import { generateDBML, generateSQL } from "../utils/sqlGenerator.js";
import { parseDBMLToSchema } from "../utils/dbmlParser.js";
import { parseSQLToSchema } from "../utils/sqlImporter.js";
import { downloadTextFile } from "../utils/download.js";
import { loadFromStorage, saveToStorage } from "../utils/storage.js";
import {
    getApiErrorMessage,
    getProject,
    isAuthenticated,
    markProjectOpened,
    updateProject
} from "../lib/api.js";

const nodeTypes = {
    tableNode: TableNode,
    stickyNote: StickyNoteNode
};

// Новая заметка имеет тот же shape React Flow node, что и заметки из snapshot.
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

// Handles связей хранят префикс source/target, а данным поля нужен чистый id.
function getFieldIdFromHandle(handleId) {
    return String(handleId || "")
        .replace("source-", "")
        .replace("target-", "");
}

/**
 * Уровень детализации скрывает часть строк таблицы, поэтому edge нужно знать,
 * видны ли его source/target handles в текущем режиме canvas.
 */
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

// Если нужное поле скрыто, связь цепляется к таблице, а не исчезает с canvas.
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
 * Гостевой editor выбирает между snapshot из localStorage, пустым режимом
 * создания и стартовой схемой по умолчанию.
 */
function resolveInitialLocalSchema(saved, createMode) {
    if (createMode === "empty") {
        return createEmptySchema();
    }

    if (createMode === "starter") {
        return createStarterSchema();
    }

    return hasSchemaSnapshot(saved)
        ? normalizeSchemaSnapshot(saved)
        : createStarterSchema();
}

// React Flow provider ставится над содержимым страницы, где живут nodes/edges.
export default function EditorPage({ theme, onToggleTheme }) {
    return (
        <ReactFlowProvider>
            <EditorPageContent theme={theme} onToggleTheme={onToggleTheme} />
        </ReactFlowProvider>
    );
}

/**
 * Главная рабочая страница связывает parser, canvas, свойства таблиц,
 * backend autosave, импорт/экспорт, records и AI-помощника.
 */
function EditorPageContent({ theme, onToggleTheme }) {
    const { projectId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const saved = loadFromStorage();
    const createMode = !projectId ? location.state?.createMode : null;
    const createDialect = !projectId ? location.state?.createDialect : null;
    const starter = resolveInitialLocalSchema(saved, createMode);

    const sqlEditorRef = useRef(null);
    // Canvas и текстовый редактор изменяют одну схему; маркер источника не дает им спорить в эффектах.
    const changeSourceRef = useRef("canvas");
    // Автосохранение remote-проекта включаем только после первого ответа API.
    const hasLoadedRemoteProjectRef = useRef(!projectId);

    const [projectName, setProjectName] = useState(() => {
        const explicitProjectName = createMode === "empty"
            ? "Пустой проект"
            : createMode === "starter"
                ? "Новая схема базы данных"
                : null;

        if (explicitProjectName) {
            return explicitProjectName;
        }

        return (
        saved?.projectName || "Схема базы данных"
        );
    });

    const [dialect, setDialect] = useState(createDialect || (createMode ? DEFAULT_DIALECT : saved?.dialect || DEFAULT_DIALECT));
    const [exportDialect, setExportDialect] = useState(createDialect || (createMode ? DEFAULT_DIALECT : saved?.dialect || DEFAULT_DIALECT));
    const [nodes, setNodes, onNodesChangeBase] = useNodesState(starter.nodes);
    const [edges, setEdges, onEdgesChangeBase] = useEdgesState(starter.edges);
    const [notes, setNotes] = useState(() => Array.isArray(starter.notes) ? starter.notes : []);
    const [detailLevel, setDetailLevel] = useState(saved?.detailLevel || "all-fields");
    const [showGrid, setShowGrid] = useState(saved?.showGrid !== false);
    const [relationsHighlighted, setRelationsHighlighted] = useState(false);

    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState(null);
    const [recordsTableId, setRecordsTableId] = useState(null);

    const [schemaCode, setSchemaCode] = useState(() =>
        createMode ? generateDBML(starter.nodes, starter.edges) : saved?.schemaCode || generateDBML(starter.nodes, starter.edges)
    );

    const [schemaErrors, setSchemaErrors] = useState([]);
    const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
    const [isImportSqlModalOpen, setIsImportSqlModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
    const [remoteStatus, setRemoteStatus] = useState(projectId ? "loading" : "local");
    const [saveStatus, setSaveStatus] = useState(projectId ? "idle" : "local");
    const [remoteError, setRemoteError] = useState("");

    const selectedTable =
        nodes.find((node) => node.id === selectedNodeId && node.type === "tableNode") || null;

    const selectedRelation =
        edges.find((edge) => edge.id === selectedEdgeId) || null;

    const recordsTable =
        nodes.find((node) => node.id === recordsTableId) || null;

    const sql = useMemo(() => {
        return generateSQL(nodes, edges, dialect);
    }, [nodes, edges, dialect]);

    const exportSql = useMemo(() => {
        return generateSQL(nodes, edges, exportDialect);
    }, [nodes, edges, exportDialect]);

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
        // selectTableCode reads the current editor state when invoked from a node event.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, schemaCode, detailLevel]);

    const flowNotes = useMemo(() => {
        return notes.map((note) => ({
            ...note,
            data: {
                ...note.data,
                onChange: (noteId, text) => {
                    setNotes((currentNotes) =>
                        currentNotes.map((currentNote) => {
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
                        })
                    );
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
        return edges.map((edge) => {
            const displayEdge = getEdgeForDetailLevel(edge, nodes, detailLevel);
            const isSelectedEdge = edge.id === selectedEdgeId;

            const isRelatedToSelectedTable =
                selectedNodeId &&
                (edge.source === selectedNodeId || edge.target === selectedNodeId);

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
                    },
                    labelStyle: {
                        ...(edge.labelStyle || {}),
                        fill: "#92400e",
                        fontWeight: 900
                    },
                    labelBgStyle: {
                        ...(edge.labelBgStyle || {}),
                        fill: "#fef3c7",
                        fillOpacity: 0.98
                    }
                };
            }

            if (relationsHighlighted) {
                return {
                    ...displayEdge,
                    animated: true,
                    className: "edge-electric",
                    style: {
                        ...(edge.style || {}),
                        stroke: "#38bdf8",
                        strokeWidth: 3,
                        opacity: 1
                    },
                    labelStyle: {
                        ...(edge.labelStyle || {}),
                        fill: "#0369a1",
                        fontWeight: 800
                    },
                    labelBgStyle: {
                        ...(edge.labelBgStyle || {}),
                        fill: "#e0f2fe",
                        fillOpacity: 0.95
                    }
                };
            }

            if (!selectedNodeId && !selectedEdgeId) {
                return {
                    ...displayEdge,
                    animated: false,
                    className: "",
                    style: {
                        ...(edge.style || {}),
                        stroke: "#2563eb",
                        strokeWidth: 2,
                        opacity: 1
                    },
                    labelStyle: {
                        ...(edge.labelStyle || {}),
                        fill: "#334155",
                        fontWeight: 700
                    },
                    labelBgStyle: {
                        ...(edge.labelBgStyle || {}),
                        fill: "#ffffff",
                        fillOpacity: 0.9
                    }
                };
            }

            if (isRelatedToSelectedTable) {
                return {
                    ...displayEdge,
                    animated: true,
                    className: "edge-electric",
                    style: {
                        ...(edge.style || {}),
                        stroke: "#0ea5e9",
                        strokeWidth: 3,
                        opacity: 1
                    },
                    labelStyle: {
                        ...(edge.labelStyle || {}),
                        fill: "#0369a1",
                        fontWeight: 800
                    },
                    labelBgStyle: {
                        ...(edge.labelBgStyle || {}),
                        fill: "#e0f2fe",
                        fillOpacity: 0.95
                    }
                };
            }

            return {
                ...displayEdge,
                animated: false,
                className: "edge-muted",
                style: {
                    ...(edge.style || {}),
                    stroke: "#94a3b8",
                    strokeWidth: 1.5,
                    opacity: 0.35
                },
                labelStyle: {
                    ...(edge.labelStyle || {}),
                    fill: "#94a3b8",
                    fontWeight: 600
                },
                labelBgStyle: {
                    ...(edge.labelBgStyle || {}),
                    fill: "#ffffff",
                    fillOpacity: 0.55
                }
            };
        });
    }, [edges, nodes, detailLevel, relationsHighlighted, selectedNodeId, selectedEdgeId]);

    // Local snapshot оставляем даже для remote-проекта, чтобы редактор не терял последнее состояние.
    useEffect(() => {
        saveToStorage({
            projectName,
            dialect,
            schemaCode,
            nodes,
            edges,
            notes,
            detailLevel,
            showGrid
        });
    }, [projectName, dialect, schemaCode, nodes, edges, notes, detailLevel, showGrid]);

    // Отдельная загрузка remote-проекта заменяет локальный starter только после успешного ответа API.
    useEffect(() => {
        if (!projectId) {
            // Локальному editor route API-загрузка не нужна, можно сразу разрешить дальнейшие эффекты.
            hasLoadedRemoteProjectRef.current = true;
            return;
        }

        if (!isAuthenticated()) {
            // Remote project нельзя запросить без Bearer token.
            navigate("/login");
            return;
        }

        let isMounted = true;
        hasLoadedRemoteProjectRef.current = false;

        getProject(projectId)
            .then((project) => {
                if (!isMounted) {
                    return;
                }

                // Старые проекты могут не иметь schema_json, тогда показываем знакомый starter.
                const schema = hasSchemaSnapshot(project.schema_json)
                    ? normalizeSchemaSnapshot(project.schema_json)
                    : createStarterSchema();

                // Помечаем массовую установку state как remote, чтобы canvas-effect не перезаписал schema_code.
                changeSourceRef.current = "remote";
                setProjectName(project.name || "Новая схема базы данных");
                setDialect(project.dialect || DEFAULT_DIALECT);
                setExportDialect(project.dialect || DEFAULT_DIALECT);
                setNodes(schema.nodes);
                setEdges(schema.edges);
                setNotes(Array.isArray(schema.notes) ? schema.notes : []);
                setSchemaCode(project.schema_code || generateDBML(schema.nodes, schema.edges));
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
                setSchemaErrors([]);
                setRemoteStatus("ready");
                setSaveStatus("saved");
                hasLoadedRemoteProjectRef.current = true;

                markProjectOpened(projectId).catch(() => {});
            })
            .catch((requestError) => {
                if (!isMounted) {
                    return;
                }

                setRemoteStatus("error");
                setSaveStatus("idle");
                setRemoteError(getApiErrorMessage(requestError, "Не удалось загрузить проект."));
            });

        return () => {
            isMounted = false;
        };
    }, [projectId, navigate, setEdges, setNodes]);

    // Серверное сохранение debounce'ится, иначе перетаскивание таблицы создаст поток PATCH-запросов.
    useEffect(() => {
        // Ошибочный DBML-like код не отправляем в проект, пока parser не соберет корректную схему.
        if (!projectId || !hasLoadedRemoteProjectRef.current || schemaErrors.length > 0) {
            return;
        }

        setSaveStatus("saving");

        const timeoutId = window.setTimeout(() => {
            // В API отправляется и человекочитаемый код, и JSON snapshot canvas.
            updateProject(projectId, {
                name: projectName || "Новая схема базы данных",
                dialect,
                schema_code: schemaCode,
                schema_json: {
                    nodes,
                    edges,
                    notes
                }
            })
                .then(() => {
                    setSaveStatus("saved");
                    setRemoteError("");
                })
                .catch((requestError) => {
                    setSaveStatus("error");
                    setRemoteError(getApiErrorMessage(requestError, "Не удалось сохранить проект."));
                });
        }, 900);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [projectId, projectName, dialect, schemaCode, nodes, edges, notes, schemaErrors]);

    // Изменения canvas становятся новым DBML-like текстом.
    useEffect(() => {
        // Если nodes изменил parser или remote load, текст уже считается источником истины.
        if (changeSourceRef.current !== "canvas") {
            if (changeSourceRef.current === "remote") {
                changeSourceRef.current = "canvas";
            }

            return;
        }

        // Любая ручная правка таблиц/связей на canvas отражается в текстовом editor слева.
        setSchemaCode(generateDBML(nodes, edges));
        setSchemaErrors([]);
    }, [nodes, edges]);

    // Изменения текста парсятся обратно в canvas только после небольшой паузы при наборе.
    useEffect(() => {
        // Этот эффект нужен только после ввода текста в DBML-like editor.
        if (changeSourceRef.current !== "code") {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            // Передаем текущие nodes, чтобы parser сохранил позиции и id таблиц с теми же именами.
            const parsed = parseDBMLToSchema(schemaCode, nodes);

            if (parsed.errors.length > 0) {
                setSchemaErrors(parsed.errors);
                return;
            }

            setSchemaErrors([]);

            changeSourceRef.current = "code";
            setNodes(parsed.nodes);
            setEdges(parsed.edges);

            // После удаления таблицы или связи текстом снимаем selection с исчезнувших объектов.
            setSelectedNodeId((currentSelectedNodeId) => {
                const stillExists = parsed.nodes.some((node) => {
                    return node.id === currentSelectedNodeId;
                });

                return stillExists ? currentSelectedNodeId : null;
            });

            setSelectedEdgeId((currentSelectedEdgeId) => {
                const stillExists = parsed.edges.some((edge) => {
                    return edge.id === currentSelectedEdgeId;
                });

                return stillExists ? currentSelectedEdgeId : null;
            });
        }, 450);

        return () => {
            window.clearTimeout(timeoutId);
        };
        // This parser effect is intentionally driven only by DBML text edits.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schemaCode]);

    const onConnect = useCallback(
        (connection) => {
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
        },
        [setEdges]
    );

    const onNodesChange = useCallback(
        (changes) => {
            changeSourceRef.current = "canvas";
            // Sticky notes хранятся отдельно от tables, хотя React Flow присылает один список changes.
            const noteIds = new Set(notes.map((note) => note.id));
            const noteChanges = changes.filter((change) => noteIds.has(change.id));
            const tableChanges = changes.filter((change) => !noteIds.has(change.id));

            if (tableChanges.length > 0) {
                onNodesChangeBase(tableChanges);
            }

            if (noteChanges.length > 0) {
                setNotes((currentNotes) => applyNodeChanges(noteChanges, currentNotes));
            }
        },
        [notes, onNodesChangeBase]
    );

    const onEdgesChange = useCallback(
        (changes) => {
            changeSourceRef.current = "canvas";
            onEdgesChangeBase(changes);
        },
        [onEdgesChangeBase]
    );

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
            deleteRelation(selectedEdgeId);
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

        setNodes((currentNodes) =>
            currentNodes.filter((node) => node.id !== selectedNodeId)
        );

        setEdges((currentEdges) =>
            currentEdges.filter(
                (edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId
            )
        );

        setSelectedNodeId(null);
        setSelectedEdgeId(null);
    }

    function updateTable(updatedTable) {
        changeSourceRef.current = "canvas";

        setNodes((currentNodes) =>
            currentNodes.map((node) => {
                if (node.id !== updatedTable.id) {
                    return node;
                }

                return updatedTable;
            })
        );
    }

    function deleteField(tableId, fieldId) {
        changeSourceRef.current = "canvas";

        setNodes((currentNodes) =>
            currentNodes.map((node) => {
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
            })
        );

        setEdges((currentEdges) =>
            currentEdges.filter((edge) => {
                return (
                    edge.sourceHandle !== `source-${fieldId}` &&
                    edge.targetHandle !== `target-${fieldId}`
                );
            })
        );
    }

    function updateRelation(updatedRelation) {
        changeSourceRef.current = "canvas";

        setEdges((currentEdges) =>
            currentEdges.map((edge) => {
                if (edge.id !== updatedRelation.id) {
                    return edge;
                }

                return {
                    ...edge,
                    ...updatedRelation,
                    label: updatedRelation.data?.relationType || updatedRelation.label
                };
            })
        );
    }

    function deleteRelation(relationId) {
        changeSourceRef.current = "canvas";

        setEdges((currentEdges) =>
            currentEdges.filter((edge) => edge.id !== relationId)
        );

        setSelectedEdgeId(null);
    }

    function exportJson() {
        const content = JSON.stringify(
            {
                projectName,
                dialect,
                nodes,
                edges,
                notes
            },
            null,
            2
        );

        downloadTextFile(`${projectName || "schema"}.json`, content, "application/json");
    }

    function downloadSql() {
        downloadTextFile(`${projectName || "schema"}-${exportDialect}.sql`, exportSql, "text/sql");
    }

    // Импорт заменяет рабочую схему целиком и сразу нормализует ее в DBML-like код редактора.
    function importSql(nextSql, nextDialect) {
        const parsed = parseSQLToSchema(nextSql);

        // До замены рабочей схемы показываем ошибки модалке импорта.
        if (parsed.errors.length > 0) {
            return parsed;
        }

        // Успешный SQL import становится обычной canvas-схемой и дальше живет через autosave.
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

    function resetSchema() {
        const schema = createStarterSchema();

        if (!projectId) {
            localStorage.clear();
        }

        changeSourceRef.current = "canvas";

        setProjectName("Схема базы данных");
        setDialect(DEFAULT_DIALECT);
        setExportDialect(DEFAULT_DIALECT);
        setNodes(schema.nodes);
        setEdges(schema.edges);
        setNotes([]);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setSchemaErrors([]);
        setSchemaCode(generateDBML(schema.nodes, schema.edges));
    }

    function escapeRegExp(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function selectTableCode(tableName) {
        const textarea = sqlEditorRef.current;

        if (!textarea) {
            console.log("Textarea ref не найден");
            return;
        }

        const escapedTableName = escapeRegExp(tableName);

        const tableRegex = new RegExp(
            `Table\\s+${escapedTableName}\\s*\\{[\\s\\S]*?\\}`,
            "m"
        );

        const match = tableRegex.exec(schemaCode);

        if (!match) {
            console.log(`Блок Table ${tableName} не найден в коде`);
            return;
        }

        const start = match.index;
        const end = start + match[0].length;

        const node = nodes.find((item) => item.data.name === tableName);
        setSelectedNodeId(node?.id || null);
        setSelectedEdgeId(null);

        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(start, end);

            const textBeforeSelection = schemaCode.slice(0, start);
            const lineNumber = textBeforeSelection.split("\n").length - 1;
            const lineHeight = 24;

            textarea.scrollTop = Math.max(0, lineNumber * lineHeight - 80);
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

    function handleNodeClick(_, node) {
        setSelectedNodeId(node.id);
        setSelectedEdgeId(null);
    }

    function handleEdgeClick(event, edge) {
        event.stopPropagation();
        setSelectedEdgeId(edge.id);
        setSelectedNodeId(null);
    }

    function handlePaneClick() {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
    }

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-app-bg dark:bg-slate-950">
            <TopBar
                projectName={projectName}
                onProjectNameChange={setProjectName}
                onExportJson={exportJson}
                onExportSql={() => setIsSqlModalOpen(true)}
                onImportSql={() => setIsImportSqlModalOpen(true)}
                onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                onShare={projectId ? () => setIsShareModalOpen(true) : null}
                onReset={resetSchema}
                theme={theme}
                onToggleTheme={onToggleTheme}
                saveStatus={saveStatus}
                remoteStatus={remoteStatus}
                remoteError={remoteError}
            />

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
                    <div className="absolute inset-0">
                        <ReactFlow
                            nodes={[...flowNodes, ...flowNotes]}
                            edges={visibleEdges}
                            nodeTypes={nodeTypes}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={handleNodeClick}
                            onEdgeClick={handleEdgeClick}
                            onPaneClick={handlePaneClick}
                            nodesDraggable={true}
                            nodesConnectable={true}
                            nodesFocusable={true}
                            edgesFocusable={true}
                            elementsSelectable={true}
                            selectNodesOnDrag={false}
                            panOnDrag={true}
                            zoomOnScroll={true}
                            zoomOnPinch={true}
                            zoomOnDoubleClick={false}
                            nodeDragThreshold={1}
                            deleteKeyCode={["Backspace", "Delete"]}
                            fitView
                            fitViewOptions={{
                                padding: 0.2
                            }}
                            defaultEdgeOptions={{
                                type: "smoothstep",
                                style: {
                                    strokeWidth: 2,
                                    stroke: "#2563eb"
                                }
                            }}
                            connectionLineStyle={{
                                strokeWidth: 2,
                                stroke: "#2563eb"
                            }}
                        >
                            {showGrid && <Background gap={18} size={1} />}
                            <Controls />
                        </ReactFlow>
                    </div>
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

            <ShareSettingsModal
                projectId={projectId}
                open={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
            />

            <AiAssistantPanel
                open={isAiAssistantOpen}
                onClose={() => setIsAiAssistantOpen(false)}
                projectName={projectName}
                dialect={dialect}
                schemaCode={schemaCode}
                schemaJson={{ nodes, edges, notes }}
                sql={sql}
                onApplySchemaCode={handleSchemaCodeChange}
            />
        </div>
    );
}
