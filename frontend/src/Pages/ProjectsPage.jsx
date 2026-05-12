import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    CalendarDays,
    Database,
    FileCode2,
    LayoutDashboard,
    LogOut,
    Plus,
    Search,
    Star,
    Users
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle.jsx";
import {
    createProject,
    getApiErrorMessage,
    getStoredUser,
    isAuthenticated,
    listProjects,
    logout,
    toggleProjectFavorite
} from "../lib/api.js";

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

export default function ProjectsPage({ theme, onToggleTheme }) {
    const navigate = useNavigate();
    const hasSession = isAuthenticated();
    const [projects, setProjects] = useState([]);
    const [query, setQuery] = useState("");
    const [user, setUser] = useState(getStoredUser);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");
    const [isCreating, setIsCreating] = useState(false);

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

    async function handleCreateProject() {
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
    }

    async function handleLogout() {
        await logout();
        setUser(null);
        setProjects([]);
        navigate("/login");
    }

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
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                <LogOut size={16} />
                                Выйти
                            </button>
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
                            onClick={handleCreateProject}
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
                                    onClick={handleCreateProject}
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

                        <div className="rounded-3xl bg-slate-950 p-5 text-white">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-slate-400">Проектов</div>
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
                    <CreateProjectCard onCreate={handleCreateProject} isCreating={isCreating} />

                    {filteredProjects.map((project) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            onToggleFavorite={handleToggleFavorite}
                        />
                    ))}
                </section>
            </main>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-sm text-slate-400">{label}</div>
            <div className="mt-1 text-2xl font-extrabold">{value}</div>
        </div>
    );
}

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

function ProjectCard({ project, onToggleFavorite }) {
    const editorPath = project.isDemo ? "/editor" : `/editor/${project.id}`;

    return (
        <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500">
            <div className="mb-5 flex items-start justify-between gap-4">
                <Link
                    to={editorPath}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
                >
                    <Database size={24} />
                </Link>

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
            </div>

            <Link to={editorPath}>
                <h3 className="text-lg font-extrabold text-slate-950 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {project.name}
                </h3>

                <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {project.description || "Описание пока не добавлено."}
                </p>

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
