import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    addEdge,
    useEdgesState,
    useNodesState
} from "reactflow";

import TableNode from "../nodes/TableNode.jsx";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import SqlEditor from "../components/SqlEditor.jsx";
import PropertiesPanel from "../components/PropertiesPanel.jsx";
import ExportModal from "../components/ExportModal.jsx";
import RecordsModal from "../components/RecordsModal.jsx";
import ShareSettingsModal from "../components/ShareSettingsModal.jsx";
import AiAssistantPanel from "../components/AiAssistantPanel.jsx";

import { DEFAULT_DIALECT } from "../types/databaseTypes.js";
import {
    createRelationEdge,
    createStarterSchema,
    createTableNode
} from "../utils/schemaFactory.js";
import { generateDBML, generateSQL } from "../utils/sqlGenerator.js";
import { parseDBMLToSchema } from "../utils/dbmlParser.js";
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
    tableNode: TableNode
};

export default function EditorPage({ theme, onToggleTheme }) {
    return (
        <ReactFlowProvider>
            <EditorPageContent theme={theme} onToggleTheme={onToggleTheme} />
        </ReactFlowProvider>
    );
}

function EditorPageContent({ theme, onToggleTheme }) {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const saved = loadFromStorage();
    const starter = saved?.nodes?.length ? saved : createStarterSchema();

    const sqlEditorRef = useRef(null);
    const changeSourceRef = useRef("canvas");
    const hasLoadedRemoteProjectRef = useRef(!projectId);

    const [projectName, setProjectName] = useState(
        saved?.projectName || "Схема базы данных"
    );

    const [dialect, setDialect] = useState(saved?.dialect || DEFAULT_DIALECT);
    const [nodes, setNodes, onNodesChangeBase] = useNodesState(starter.nodes);
    const [edges, setEdges, onEdgesChangeBase] = useEdgesState(starter.edges);

    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState(null);
    const [recordsTableId, setRecordsTableId] = useState(null);

    const [schemaCode, setSchemaCode] = useState(() =>
        saved?.schemaCode || generateDBML(starter.nodes, starter.edges)
    );

    const [schemaErrors, setSchemaErrors] = useState([]);
    const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
    const [remoteStatus, setRemoteStatus] = useState(projectId ? "loading" : "local");
    const [saveStatus, setSaveStatus] = useState(projectId ? "idle" : "local");
    const [remoteError, setRemoteError] = useState("");

    const selectedTable =
        nodes.find((node) => node.id === selectedNodeId) || null;

    const selectedRelation =
        edges.find((edge) => edge.id === selectedEdgeId) || null;

    const recordsTable =
        nodes.find((node) => node.id === recordsTableId) || null;

    const sql = useMemo(() => {
        return generateSQL(nodes, edges, dialect);
    }, [nodes, edges, dialect]);

    const flowNodes = useMemo(() => {
        return nodes.map((node) => ({
            ...node,
            data: {
                ...node.data,
                onDoubleClick: selectTableCode,
                onOpenRecords: openRecords,
                onConfigure: selectTable
            }
        }));
        // selectTableCode reads the current editor state when invoked from a node event.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, schemaCode]);

    const visibleEdges = useMemo(() => {
        return edges.map((edge) => {
            const isSelectedEdge = edge.id === selectedEdgeId;

            const isRelatedToSelectedTable =
                selectedNodeId &&
                (edge.source === selectedNodeId || edge.target === selectedNodeId);

            if (isSelectedEdge) {
                return {
                    ...edge,
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

            if (!selectedNodeId && !selectedEdgeId) {
                return {
                    ...edge,
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
                    ...edge,
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
                ...edge,
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
    }, [edges, selectedNodeId, selectedEdgeId]);

    useEffect(() => {
        saveToStorage({
            projectName,
            dialect,
            schemaCode,
            nodes,
            edges
        });
    }, [projectName, dialect, schemaCode, nodes, edges]);

    useEffect(() => {
        if (!projectId) {
            hasLoadedRemoteProjectRef.current = true;
            return;
        }

        if (!isAuthenticated()) {
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

                const schema = project.schema_json?.nodes?.length
                    ? project.schema_json
                    : createStarterSchema();

                changeSourceRef.current = "remote";
                setProjectName(project.name || "Новая схема базы данных");
                setDialect(project.dialect || DEFAULT_DIALECT);
                setNodes(schema.nodes);
                setEdges(schema.edges);
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

    useEffect(() => {
        if (!projectId || !hasLoadedRemoteProjectRef.current || schemaErrors.length > 0) {
            return;
        }

        setSaveStatus("saving");

        const timeoutId = window.setTimeout(() => {
            updateProject(projectId, {
                name: projectName || "Новая схема базы данных",
                dialect,
                schema_code: schemaCode,
                schema_json: {
                    nodes,
                    edges
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
    }, [projectId, projectName, dialect, schemaCode, nodes, edges, schemaErrors]);

    useEffect(() => {
        if (changeSourceRef.current !== "canvas") {
            if (changeSourceRef.current === "remote") {
                changeSourceRef.current = "canvas";
            }

            return;
        }

        setSchemaCode(generateDBML(nodes, edges));
        setSchemaErrors([]);
    }, [nodes, edges]);

    useEffect(() => {
        if (changeSourceRef.current !== "code") {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            const parsed = parseDBMLToSchema(schemaCode, nodes);

            if (parsed.errors.length > 0) {
                setSchemaErrors(parsed.errors);
                return;
            }

            setSchemaErrors([]);

            changeSourceRef.current = "code";
            setNodes(parsed.nodes);
            setEdges(parsed.edges);

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
            onNodesChangeBase(changes);
        },
        [onNodesChangeBase]
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

    function deleteSelected() {
        if (selectedEdgeId) {
            deleteRelation(selectedEdgeId);
            return;
        }

        if (!selectedNodeId) {
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
                edges
            },
            null,
            2
        );

        downloadTextFile(`${projectName || "schema"}.json`, content, "application/json");
    }

    function downloadSql() {
        downloadTextFile(`${projectName || "schema"}-${dialect}.sql`, sql, "text/sql");
    }

    function resetSchema() {
        const schema = createStarterSchema();

        if (!projectId) {
            localStorage.clear();
        }

        changeSourceRef.current = "canvas";

        setProjectName("Схема базы данных");
        setDialect(DEFAULT_DIALECT);
        setNodes(schema.nodes);
        setEdges(schema.edges);
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
                            nodes={flowNodes}
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
                            <Background gap={18} size={1} />
                            <Controls />
                            <MiniMap pannable zoomable />
                        </ReactFlow>
                    </div>
                </main>

                <PropertiesPanel
                    selectedTable={selectedTable}
                    selectedRelation={selectedRelation}
                    dialect={dialect}
                    onDialectChange={setDialect}
                    onUpdateTable={updateTable}
                    onDeleteField={deleteField}
                    onUpdateRelation={updateRelation}
                    onDeleteRelation={deleteRelation}
                />
            </div>

            <ExportModal
                open={isSqlModalOpen}
                dialect={dialect}
                onDialectChange={setDialect}
                sql={sql}
                onClose={() => setIsSqlModalOpen(false)}
                onDownload={downloadSql}
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
                schemaJson={{ nodes, edges }}
                sql={sql}
                onApplySchemaCode={handleSchemaCodeChange}
            />
        </div>
    );
}
