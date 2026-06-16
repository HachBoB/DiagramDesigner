import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    CalendarDays,
    Database,
    FileCode2,
    LayoutDashboard,
    LogOut,
    Pencil,
    Plus,
    Save,
    Search,
    Star,
    Trash2,
    UserMinus,
    Users,
    X
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle.jsx";
import ProfileButton from "../components/ProfileButton.jsx";
import CreateProjectModal from "../components/CreateProjectModal.jsx";
import {
    createProject,
    deleteProject,
    getApiErrorMessage,
    getProjectShare,
    getStoredUser,
    isAuthenticated,
    leaveProject,
    listProjects,
    removeProjectViewer,
    toggleProjectFavorite,
    updateProject,
    updateProjectViewerPermission
} from "../lib/api.js";
import { DB_DIALECTS, DEFAULT_DIALECT } from "../types/databaseTypes.js";
import { generateDBML } from "../utils/sqlGenerator.js";
import {
    createEmptySchema,
    createSchemaPattern,
    getSchemaPattern
} from "../utils/schemaFactory.js";

const demoProjects = [
    {
        id: "demo-1",
        name: "Интернет-магазин",
        description: "Схема для users, orders, products и order_items.",
        tables_count: 4,
        relations_count: 3,
        updated_at: new Date().toISOString(),
        is_favorite: true,
        isDemo: true
    },
    {
        id: "demo-2",
        name: "CRM система",
        description: "Клиенты, сделки, менеджеры, задачи и история изменений.",
        tables_count: 8,
        relations_count: 11,
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        is_favorite: false,
        isDemo: true
    },
    {
        id: "demo-3",
        name: "Учебный проект",
        description: "Пример схемы базы данных для дипломного проекта.",
        tables_count: 5,
        relations_count: 4,
        updated_at: new Date(Date.now() - 259200000).toISOString(),
        is_favorite: false,
        isDemo: true
    }
];

/**
 * Страница проектов объединяет личные и командные схемы, быстрые действия
 * по карточке и владельческие настройки состава команды.
 */
export default function ProjectsPage({ theme, onToggleTheme }) {
    const navigate = useNavigate();
    const hasSession = isAuthenticated();
    const [projects, setProjects] = useState([]);
    const [query, setQuery] = useState("");
    const [user, setUser] = useState(getStoredUser);
    const [status, setStatus] = useState(hasSession ? "loading" : "idle");
    const [error, setError] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deletingProjectId, setDeletingProjectId] = useState(null);
    const [leavingProjectId, setLeavingProjectId] = useState(null);
    const [settingsProject, setSettingsProject] = useState(null);
    const [settingsForm, setSettingsForm] = useState({
        name: "",
        description: ""
    });
    const [teamInfo, setTeamInfo] = useState(null);
    const [settingsStatus, setSettingsStatus] = useState("idle");
    const [settingsError, setSettingsError] = useState("");
    const [removingViewerId, setRemovingViewerId] = useState(null);
    const [changingViewerId, setChangingViewerId] = useState(null);

    const displayedProjects = hasSession ? projects : demoProjects;

    const filteredProjects = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (!normalizedQuery) {
            return displayedProjects;
        }

        return displayedProjects.filter((project) => {
            return [project.name, project.description]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [displayedProjects, query]);

    const totals = useMemo(() => {
        return displayedProjects.reduce(
            (summary, project) => ({
                tables: summary.tables + (project.tables_count || 0),
                relations: summary.relations + (project.relations_count || 0)
            }),
            { tables: 0, relations: 0 }
        );
    }, [displayedProjects]);

    // Гостю показываем demoProjects, а личный список запрашиваем только после сессии.
    useEffect(() => {
        if (!hasSession) {
            return;
        }

        const controller = new AbortController();

        listProjects(controller.signal)
            .then((items) => {
                setProjects(items);
                setUser(getStoredUser());
                setStatus("ready");
            })
            .catch((requestError) => {
                if (requestError.name === "AbortError") {
                    return;
                }

                setProjects([]);
                setStatus("error");
                setError(getApiErrorMessage(requestError, "Не удалось загрузить проекты."));
            });

        return () => controller.abort();
    }, [hasSession]);

    function handleOpenCreateProjectModal() {
        setError("");
        setIsCreateModalOpen(true);
    }

    function handleCloseCreateProjectModal() {
        if (isCreating) {
            return;
        }

        setIsCreateModalOpen(false);
    }

    // Для гостя открываем локальный редактор, для аккаунта сразу создаем remote-проект.
    async function handleCreateProject({ mode = "starter", dialect = DEFAULT_DIALECT } = {}) {
        const selectedPattern = mode === "empty" ? null : getSchemaPattern(mode);
        // Одинаковый snapshot используем и при local route, и в теле POST /projects.
        const schema = mode === "empty" ? createEmptySchema() : createSchemaPattern(mode);
        const schemaJson = {
            nodes: schema.nodes,
            edges: schema.edges,
            notes: Array.isArray(schema.notes) ? schema.notes : []
        };
        const schemaCode = generateDBML(schemaJson.nodes, schemaJson.edges);
        const projectName = mode === "empty" ? "Пустой проект" : selectedPattern.projectName;

        if (!hasSession) {
            // Без аккаунта передаем готовый snapshot прямо в редактор, чтобы его
            // не заменил старый localStorage или дефолтный starter.
            setIsCreateModalOpen(false);
            navigate("/editor", {
                state: {
                    createMode: mode,
                    createDialect: dialect,
                    createProjectName: projectName,
                    createSchemaJson: schemaJson,
                    createSchemaCode: schemaCode
                }
            });
            return;
        }

        setIsCreating(true);
        setError("");

        try {
            // Для backend передаем и текстовую, и визуальную форму схемы.
            const project = await createProject({
                name: projectName,
                description: selectedPattern?.description || null,
                dialect,
                schema_code: schemaCode,
                schema_json: schemaJson
            });

            setIsCreateModalOpen(false);
            // Пока remote-проект догружается, редактор уже показывает выбранный
            // паттерн, а не локальный starter интернет-магазина.
            navigate(`/editor/${project.id}`, {
                state: {
                    createMode: mode,
                    createDialect: dialect,
                    createProjectName: projectName,
                    createSchemaJson: schemaJson,
                    createSchemaCode: schemaCode
                }
            });
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ РїСЂРѕРµРєС‚."));
        } finally {
            setIsCreating(false);
        }
    }

    function handleCreateProjectAction(options = {}) {
        return handleCreateProject(typeof options === "string" ? { mode: options } : options);
        /*
        if (!hasSession) {
            navigate("/editor");
            return;
        }

        setIsCreating(true);
        setError("");

        try {
            const project = await createProject({
                name: "Новая схема базы данных"
            });

            navigate(`/editor/${project.id}`);
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Не удалось создать проект."));
        } finally {
            setIsCreating(false);
        }
        */
    }

    // Избранное обновляем оптимистично, чтобы карточка реагировала без ожидания сети.
    async function handleToggleFavorite(projectId, isFavorite) {
        if (!hasSession) {
            return;
        }

        const previousProjects = projects;

        setProjects((currentProjects) =>
            currentProjects.map((project) =>
                project.id === projectId
                    ? { ...project, is_favorite: !isFavorite }
                    : project
            )
        );

        try {
            const updatedProject = await toggleProjectFavorite(projectId, !isFavorite);
            setProjects((currentProjects) =>
                currentProjects.map((project) =>
                    project.id === projectId
                        ? { ...project, is_favorite: updatedProject.is_favorite }
                        : project
                )
            );
        } catch (requestError) {
            setProjects(previousProjects);
            setError(getApiErrorMessage(requestError, "Не удалось обновить избранное."));
        }
    }

    async function handleDeleteProject(project) {
        if (!hasSession || project.access_role === "collaborator" || project.isDemo) {
            return;
        }

        const confirmed = window.confirm(`Удалить проект "${project.name}"? Это действие нельзя отменить.`);

        if (!confirmed) {
            return;
        }

        const previousProjects = projects;

        setDeletingProjectId(project.id);
        setProjects((currentProjects) => currentProjects.filter((item) => item.id !== project.id));
        setError("");

        try {
            await deleteProject(project.id);
        } catch (requestError) {
            setProjects(previousProjects);
            setError(getApiErrorMessage(requestError, "Не удалось удалить проект."));
        } finally {
            setDeletingProjectId(null);
        }
    }

    async function handleLeaveProject(project) {
        if (!hasSession || project.access_role !== "collaborator" || project.isDemo) {
            return;
        }

        const confirmed = window.confirm(`Выйти из командного проекта "${project.name}"? Он пропадёт из списка ваших проектов.`);

        if (!confirmed) {
            return;
        }

        const previousProjects = projects;

        setLeavingProjectId(project.id);
        setProjects((currentProjects) => currentProjects.filter((item) => item.id !== project.id));
        setError("");

        try {
            await leaveProject(project.id);
        } catch (requestError) {
            setProjects(previousProjects);
            setError(getApiErrorMessage(requestError, "Не удалось выйти из командного проекта."));
        } finally {
            setLeavingProjectId(null);
        }
    }

    // Владельцу в настройках нужна команда, а collaborator меняет только доступные свойства проекта.
    async function handleOpenSettings(project) {
        if (project.isDemo) {
            return;
        }

        // Модалка сразу показывает базовые поля проекта, пока команда при необходимости догружается.
        setSettingsProject(project);
        setSettingsForm({
            name: project.name || "",
            description: project.description || ""
        });
        setTeamInfo(null);
        setSettingsError("");

        if (project.access_role !== "collaborator") {
            // Только owner может смотреть viewers и менять их permissions.
            setSettingsStatus("loading-team");

            try {
                const share = await getProjectShare(project.id);
                setTeamInfo(share);
                setSettingsStatus("idle");
            } catch (requestError) {
                setSettingsStatus("idle");
                setSettingsError(getApiErrorMessage(requestError, "Не удалось загрузить команду проекта."));
            }
        } else {
            setSettingsStatus("idle");
        }
    }

    function handleCloseSettings() {
        setSettingsProject(null);
        setTeamInfo(null);
        setSettingsError("");
        setRemovingViewerId(null);
        setChangingViewerId(null);
    }

    async function handleSaveSettings(event) {
        event.preventDefault();

        if (!settingsProject) {
            return;
        }

        setSettingsStatus("saving");
        setSettingsError("");

        try {
            const updatedProject = await updateProject(settingsProject.id, {
                name: settingsForm.name.trim(),
                description: settingsForm.description.trim() || null
            });

            setProjects((currentProjects) =>
                currentProjects.map((project) =>
                    project.id === settingsProject.id
                        ? {
                            ...project,
                            ...updatedProject,
                            tables_count: project.tables_count,
                            relations_count: project.relations_count,
                            owner: updatedProject.owner || project.owner,
                            viewers_count: project.viewers_count
                        }
                        : project
                )
            );
            setSettingsProject((currentProject) => currentProject ? { ...currentProject, ...updatedProject } : currentProject);
            setSettingsStatus("idle");
        } catch (requestError) {
            setSettingsStatus("idle");
            setSettingsError(getApiErrorMessage(requestError, "Не удалось сохранить настройки проекта."));
        }
    }

    async function handleRemoveViewer(viewer) {
        if (!settingsProject || settingsProject.access_role === "collaborator") {
            return;
        }

        const confirmed = window.confirm(`Удалить участника "${viewer.name}" из проекта?`);

        if (!confirmed) {
            return;
        }

        setRemovingViewerId(viewer.id);
        setSettingsError("");

        try {
            await removeProjectViewer(settingsProject.id, viewer.id);
            setTeamInfo((currentInfo) => currentInfo
                ? {
                    ...currentInfo,
                    viewers: currentInfo.viewers.filter((item) => item.id !== viewer.id)
                }
                : currentInfo);
            setProjects((currentProjects) =>
                currentProjects.map((project) =>
                    project.id === settingsProject.id
                        ? {
                            ...project,
                            viewers_count: Math.max((project.viewers_count || 1) - 1, 0),
                            is_team_project: Math.max((project.viewers_count || 1) - 1, 0) > 0
                        }
                        : project
                )
            );
        } catch (requestError) {
            setSettingsError(getApiErrorMessage(requestError, "Не удалось удалить участника."));
        } finally {
            setRemovingViewerId(null);
        }
    }

    async function handleChangeViewerPermission(viewer, permission) {
        if (!settingsProject || settingsProject.access_role === "collaborator") {
            return;
        }

        const previousTeamInfo = teamInfo;

        setChangingViewerId(viewer.id);
        setSettingsError("");
        setTeamInfo((currentInfo) => currentInfo
            ? {
                ...currentInfo,
                viewers: currentInfo.viewers.map((item) =>
                    item.id === viewer.id ? { ...item, permission } : item
                )
            }
            : currentInfo);

        try {
            const updatedShare = await updateProjectViewerPermission(settingsProject.id, viewer.id, permission);
            setTeamInfo(updatedShare);
        } catch (requestError) {
            setTeamInfo(previousTeamInfo);
            setSettingsError(getApiErrorMessage(requestError, "Не удалось изменить права участника."));
        } finally {
            setChangingViewerId(null);
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
                    <Link to="/" className="flex items-center gap-2 text-lg font-extrabold">
                        <Database className="text-blue-600 dark:text-blue-400" />
                        DB Schema Designer
                    </Link>

                    <nav className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <ArrowLeft size={16} />
                            Главная
                        </Link>

                        <Link
                            to="/docs"
                            className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Документация
                        </Link>

                        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

                        {hasSession ? (
                            <ProfileButton onProfileUpdated={setUser} />
                        ) : (
                            <Link
                                to="/login"
                                className="rounded-xl px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950"
                            >
                                Войти
                            </Link>
                        )}

                        <button
                            type="button"
                            onClick={handleOpenCreateProjectModal}
                            disabled={isCreating}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Plus size={16} />
                            {isCreating ? "Создаём..." : "Новый проект"}
                        </button>
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8">
                <section className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
                    <div className="grid gap-8 p-8 lg:grid-cols-[1.3fr_0.7fr]">
                        <div>
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                <LayoutDashboard size={16} />
                                Рабочее пространство
                            </div>

                            <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                                Мои проекты
                            </h1>

                            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500 dark:text-slate-400">
                                {hasSession
                                    ? `Вы вошли${user?.name ? ` как ${user.name}` : ""}. Проекты сохраняются в вашем аккаунте и доступны только вам.`
                                    : "Вы в режиме быстрого черновика. Войдите, чтобы сохранять проекты в аккаунте."}
                            </p>

                            {error && (
                                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                                    {error}
                                </div>
                            )}

                            <div className="mt-6 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handleOpenCreateProjectModal}
                                    disabled={isCreating}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Plus size={18} />
                                    Новый проект
                                </button>

                                <Link
                                    to="/docs"
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    <FileCode2 size={18} />
                                    Документация
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Проектов</div>
                                    <div className="mt-1 text-4xl font-extrabold">
                                        {displayedProjects.length}
                                    </div>
                                </div>

                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                                    <Database size={28} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <StatCard label="Таблиц" value={totals.tables} />
                                <StatCard label="Связей" value={totals.relations} />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
                            Последние проекты
                        </h2>

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {status === "loading" ? "Загружаем ваши проекты..." : "Откройте проект, чтобы продолжить редактирование схемы."}
                        </p>
                    </div>

                    <div className="relative w-full md:w-[360px]">
                        <Search
                            size={18}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            placeholder="Поиск проекта..."
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                        />
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <CreateProjectCard onCreate={handleOpenCreateProjectModal} isCreating={isCreating} />

                    {filteredProjects.map((project) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            onToggleFavorite={handleToggleFavorite}
                            onDelete={handleDeleteProject}
                            onLeave={handleLeaveProject}
                            onOpenSettings={handleOpenSettings}
                            isDeleting={deletingProjectId === project.id}
                            isLeaving={leavingProjectId === project.id}
                        />
                    ))}
                </section>
            </main>

            {settingsProject && (
                <ProjectSettingsModal
                    project={settingsProject}
                    form={settingsForm}
                    teamInfo={teamInfo}
                    status={settingsStatus}
                    error={settingsError}
                    removingViewerId={removingViewerId}
                    changingViewerId={changingViewerId}
                    onChange={setSettingsForm}
                    onClose={handleCloseSettings}
                    onSave={handleSaveSettings}
                    onRemoveViewer={handleRemoveViewer}
                    onChangeViewerPermission={handleChangeViewerPermission}
                />
            )}

            <CreateProjectModal
                open={isCreateModalOpen}
                isCreating={isCreating}
                error={error}
                hasSession={hasSession}
                onClose={handleCloseCreateProjectModal}
                onCreate={handleCreateProjectAction}
            />
        </div>
    );
}

// Короткая метрика над сеткой проектов.
function StatCard({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/10">
            <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
            <div className="mt-1 text-2xl font-extrabold">{value}</div>
        </div>
    );
}

// Пустая карточка в сетке открывает модалку выбора стартового проекта.
function CreateProjectCard({ onCreate, isCreating }) {
    return (
        <button
            type="button"
            onClick={onCreate}
            disabled={isCreating}
            className="group flex min-h-[230px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white p-6 text-center transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
        >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition group-hover:scale-105">
                <Plus size={30} />
            </div>

            <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">
                {isCreating ? "Создаём..." : "Создать проект"}
            </h3>

            <p className="mt-2 max-w-[240px] text-sm leading-6 text-slate-500 dark:text-slate-400">
                Откройте редактор и начните проектировать новую схему базы данных.
            </p>
        </button>
    );
}

/**
 * Карточка проекта собирает favorite, duplicate, edit, delete и leave действия,
 * различая владельческий проект и командный проект участника.
 */
function ProjectCard({
    project,
    onToggleFavorite,
    onDelete,
    onLeave,
    onOpenSettings,
    isDeleting,
    isLeaving
}) {
    const isTeamProject = Boolean(project.is_team_project);
    const isCollaborator = project.access_role === "collaborator";
    const canEdit = !project.isDemo && Boolean(project.can_edit ?? (!isCollaborator || project.share_permission === "edit"));
    const canDelete = !project.isDemo && !isCollaborator;
    const description = project.description
        || (isCollaborator && project.owner?.name
            ? `Проект владельца ${project.owner.name}.`
            : "Описание пока не добавлено.");
    const editorPath = project.isDemo
        ? "/editor"
        : isCollaborator && project.share_token
            ? `/share/${project.share_token}`
            : `/editor/${project.id}`;

    return (
        <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        to={editorPath}
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                            isTeamProject
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                        title={isTeamProject ? "Командный проект" : "Личный проект"}
                    >
                        {isTeamProject ? <Users size={24} /> : <Database size={24} />}
                    </Link>

                    {isTeamProject && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <Users size={13} />
                            Командный
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => onOpenSettings(project)}
                            className="flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                            title="Изменить проект"
                        >
                            <Pencil size={13} />
                            Изменить
                        </button>
                    )}

                    {!isCollaborator && (
                        <button
                            type="button"
                            onClick={() => onToggleFavorite(project.id, project.is_favorite)}
                            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                                project.is_favorite
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400"
                            }`}
                        >
                            <Star size={13} fill={project.is_favorite ? "currentColor" : "none"} />
                            Избранное
                        </button>
                    )}

                    {canDelete && (
                        <button
                            type="button"
                            onClick={() => onDelete(project)}
                            disabled={isDeleting}
                            className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950"
                            title="Удалить проект"
                        >
                            <Trash2 size={13} />
                            {isDeleting ? "Удаляем..." : "Удалить"}
                        </button>
                    )}

                    {isCollaborator && (
                        <button
                            type="button"
                            onClick={() => onLeave(project)}
                            disabled={isLeaving}
                            className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950"
                            title="Выйти из командного проекта"
                        >
                            <LogOut size={13} />
                            {isLeaving ? "Выходим..." : "Выйти"}
                        </button>
                    )}
                </div>
            </div>

            <Link to={editorPath}>
                <h3 className="text-lg font-extrabold text-slate-950 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {project.name}
                </h3>

                <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {description}
                </p>

                {isCollaborator && project.owner && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                        <Users size={13} />
                        Владелец: {project.owner.name}
                    </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-3">
                    <MiniInfo icon={<Database size={15} />} label="Таблиц" value={project.tables_count || 0} />
                    <MiniInfo icon={<Users size={15} />} label="Связей" value={project.relations_count || 0} />
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <CalendarDays size={15} />
                    Обновлено: {formatDate(project.updated_at)}
                </div>
            </Link>
        </div>
    );
}

/**
 * Модалка редактирует метаданные проекта, а для владельца еще показывает
 * участников команды и позволяет менять их права.
 */
function ProjectSettingsModal({
    project,
    form,
    teamInfo,
    status,
    error,
    removingViewerId,
    changingViewerId,
    onChange,
    onClose,
    onSave,
    onRemoveViewer,
    onChangeViewerPermission
}) {
    const isOwner = project.access_role !== "collaborator";
    const viewers = teamInfo?.viewers || [];
    const isSaving = status === "saving";
    const isLoadingTeam = status === "loading-team";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            <Pencil size={13} />
                            Настройки проекта
                        </div>

                        <h3 className="text-2xl font-extrabold text-slate-950 dark:text-white">
                            {project.name}
                        </h3>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        aria-label="Закрыть"
                    >
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        {error}
                    </div>
                )}

                <form onSubmit={onSave} className="grid gap-4">
                    <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            Название
                        </span>
                        <input
                            value={form.name}
                            onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                            placeholder="Название проекта"
                        />
                    </label>

                    <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            Описание
                        </span>
                        <textarea
                            value={form.description}
                            onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))}
                            rows={3}
                            className="resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                            placeholder="Коротко о схеме"
                        />
                    </label>

                    <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            База данных
                        </span>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                            {DB_DIALECTS[project.dialect || DEFAULT_DIALECT]?.label || project.dialect || DEFAULT_DIALECT}
                        </div>
                        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                            Диалект можно выбрать только при создании проекта.
                        </p>
                    </label>

                    <div className="flex flex-wrap justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            Отмена
                        </button>

                        <button
                            type="submit"
                            disabled={isSaving || !form.name.trim()}
                            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Save size={16} />
                            {isSaving ? "Сохраняем..." : "Сохранить"}
                        </button>
                    </div>
                </form>

                {isOwner && (
                    <section className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <h4 className="text-lg font-extrabold text-slate-950 dark:text-white">
                                    Команда проекта
                                </h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Здесь видны пользователи, которые открывали проект по ссылке.
                                </p>
                            </div>

                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                {viewers.length}
                            </span>
                        </div>

                        {isLoadingTeam ? (
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                                Загружаем участников...
                            </div>
                        ) : viewers.length > 0 ? (
                            <div className="grid gap-2">
                                {viewers.map((viewer) => (
                                    <div
                                        key={viewer.id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-950 dark:text-white">
                                                {viewer.name}
                                            </div>
                                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                {viewer.email || "Гость без аккаунта"}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <select
                                                value={viewer.permission || "view"}
                                                onChange={(event) => onChangeViewerPermission(viewer, event.target.value)}
                                                disabled={viewer.is_guest || changingViewerId === viewer.id || removingViewerId === viewer.id}
                                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                                                title={viewer.is_guest ? "Гость не привязан к аккаунту" : "Права участника"}
                                            >
                                                <option value="view">Просмотр</option>
                                                <option value="edit">Редактирование</option>
                                            </select>

                                            <button
                                                type="button"
                                                onClick={() => onRemoveViewer(viewer)}
                                                disabled={removingViewerId === viewer.id}
                                                className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950"
                                            >
                                                <UserMinus size={14} />
                                                {removingViewerId === viewer.id ? "Удаляем..." : "Удалить"}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                                В команде пока никого нет.
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}

// Маленькая строка метаданных держит карточку проекта читаемой.
function MiniInfo({ icon, label, value }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {icon}
                {label}
            </div>

            <div className="text-lg font-extrabold text-slate-950 dark:text-white">
                {value}
            </div>
        </div>
    );
}

// Пустую дату показываем как отсутствие открытия, а не как Invalid Date.
function formatDate(value) {
    if (!value) {
        return "никогда";
    }

    return new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
}
