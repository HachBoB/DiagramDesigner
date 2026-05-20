import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    addEdge,
    useEdgesState,
    useNodesState
} from "reactflow";
import { CheckCircle2, CloudOff, Database, Eye, FileJson, FileText, Loader2, Lock, RotateCcw, Unlock } from "lucide-react";

import TableNode from "../nodes/TableNode.jsx";
import RecordsModal from "../components/RecordsModal.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import ProfileButton from "../components/ProfileButton.jsx";
import Sidebar from "../components/Sidebar.jsx";
import SqlEditor from "../components/SqlEditor.jsx";
import PropertiesPanel from "../components/PropertiesPanel.jsx";
import ExportModal from "../components/ExportModal.jsx";
import { DEFAULT_DIALECT } from "../types/databaseTypes.js";
import { generateDBML, generateSQL } from "../utils/sqlGenerator.js";
import { parseDBMLToSchema } from "../utils/dbmlParser.js";
import { createRelationEdge, createStarterSchema, createTableNode } from "../utils/schemaFactory.js";
import { downloadTextFile } from "../utils/download.js";
import {
    getApiErrorMessage,
    getSharedProject,
    unlockSharedProject,
    updateSharedProject
} from "../lib/api.js";

const nodeTypes = {
    tableNode: TableNode
};

export default function SharedProjectPage({ theme, onToggleTheme }) {
    return (
        <ReactFlowProvider>
            <SharedProjectContent theme={theme} onToggleTheme={onToggleTheme} />
        </ReactFlowProvider>
    );
}

function SharedProjectContent({ theme, onToggleTheme }) {
    const { token } = useParams();
    const [project, setProject] = useState(null);
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState("");
    const [password, setPassword] = useState("");
    const [accessPassword, setAccessPassword] = useState("");
    const [recordsTableId, setRecordsTableId] = useState(null);

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

    const schema = project?.schema_json?.nodes?.length
        ? project.schema_json
        : { nodes: [], edges: [] };

    const nodes = useMemo(() => {
        return schema.nodes.map((node) => ({
            ...node,
            data: {
                ...node.data,
                onOpenRecords: setRecordsTableId
            }
        }));
    }, [schema.nodes]);

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
                        nodes={nodes}
                        edges={schema.edges}
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
                        <Background gap={18} size={1} />
                        <Controls />
                        <MiniMap pannable zoomable />
                    </ReactFlow>
                </main>
            </div>

            <RecordsModal
                table={recordsTable}
                onClose={() => setRecordsTableId(null)}
            />
        </div>
    );
}

function SharedEditableProject({ token, project, accessPassword, theme, onToggleTheme }) {
    const schema = project.schema_json?.nodes?.length ? project.schema_json : createStarterSchema();
    const sqlEditorRef = useRef(null);
    const changeSourceRef = useRef("remote");
    const hasLoadedRef = useRef(false);

    const [projectName, setProjectName] = useState(project.name || "Проект");
    const [dialect, setDialect] = useState(project.dialect || DEFAULT_DIALECT);
    const [nodes, setNodes, onNodesChangeBase] = useNodesState(schema.nodes);
    const [edges, setEdges, onEdgesChangeBase] = useEdgesState(schema.edges);
    const [schemaCode, setSchemaCode] = useState(project.schema_code || generateDBML(schema.nodes, schema.edges));
    const [schemaErrors, setSchemaErrors] = useState([]);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState(null);
    const [recordsTableId, setRecordsTableId] = useState(null);
    const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState("saved");
    const [saveError, setSaveError] = useState("");

    const selectedTable = nodes.find((node) => node.id === selectedNodeId) || null;
    const selectedRelation = edges.find((edge) => edge.id === selectedEdgeId) || null;
    const recordsTable = nodes.find((node) => node.id === recordsTableId) || null;

    const sql = useMemo(() => generateSQL(nodes, edges, dialect), [nodes, edges, dialect]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, schemaCode]);

    useEffect(() => {
        if (!hasLoadedRef.current) {
            hasLoadedRef.current = true;
            return;
        }

        if (schemaErrors.length > 0) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setSaveStatus("saving");

            updateSharedProject(token, {
                name: projectName || "Проект",
                dialect,
                schema_code: schemaCode,
                schema_json: {
                    nodes,
                    edges
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
    }, [accessPassword, dialect, edges, nodes, projectName, schemaCode, schemaErrors, token]);

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
        onNodesChangeBase(changes);
    }, [onNodesChangeBase]);

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

    function deleteSelected() {
        if (selectedEdgeId) {
            setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== selectedEdgeId));
            setSelectedEdgeId(null);
            return;
        }

        if (!selectedNodeId) {
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
            edges
        }, null, 2), "application/json");
    }

    function downloadSql() {
        downloadTextFile(`${projectName || "schema"}-${dialect}.sql`, sql, "text/sql");
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
                        nodes={flowNodes}
                        edges={edges}
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
                        <Background gap={18} size={1} />
                        <Controls />
                        <MiniMap pannable zoomable />
                    </ReactFlow>
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
        </div>
    );
}

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
