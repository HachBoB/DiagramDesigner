import { Link } from "react-router-dom";
import {
    CalendarDays,
    Database,
    FileCode2,
    LayoutDashboard,
    Plus,
    Search,
    Star,
    Users,
    ArrowLeft
} from "lucide-react";

const mockProjects = [
    {
        id: 1,
        name: "Интернет-магазин",
        description: "Схема для users, orders, products и order_items.",
        tables: 4,
        relations: 3,
        updatedAt: "Сегодня",
        favorite: true
    },
    {
        id: 2,
        name: "CRM система",
        description: "Клиенты, сделки, менеджеры, задачи и история изменений.",
        tables: 8,
        relations: 11,
        updatedAt: "Вчера",
        favorite: false
    },
    {
        id: 3,
        name: "Учебный проект",
        description: "Пример схемы базы данных для дипломного проекта.",
        tables: 5,
        relations: 4,
        updatedAt: "3 дня назад",
        favorite: false
    }
];

export default function ProjectsPage() {
    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <Link to="/" className="flex items-center gap-2 text-lg font-extrabold">
                        <Database className="text-blue-600 dark:text-blue-400" />
                        DB Schema Designer
                    </Link>

                    <nav className="flex items-center gap-2">
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
                            Docs
                        </Link>

                        <Link
                            to="/editor"
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            <Plus size={16} />
                            Создать проект
                        </Link>
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
                                Здесь будут храниться схемы баз данных пользователя. Пока без backend:
                                проекты отображаются как frontend-заглушки, а создание открывает редактор.
                            </p>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link
                                    to="/editor"
                                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                                >
                                    <Plus size={18} />
                                    Создать новый проект
                                </Link>

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
                                    <div className="text-sm text-slate-400">Всего проектов</div>
                                    <div className="mt-1 text-4xl font-extrabold">
                                        {mockProjects.length}
                                    </div>
                                </div>

                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                                    <Database size={28} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <StatCard
                                    label="Таблиц"
                                    value={mockProjects.reduce((sum, project) => sum + project.tables, 0)}
                                />
                                <StatCard
                                    label="Связей"
                                    value={mockProjects.reduce((sum, project) => sum + project.relations, 0)}
                                />
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
                            Позже здесь будут реальные проекты из базы данных.
                        </p>
                    </div>

                    <div className="relative w-full md:w-[360px]">
                        <Search
                            size={18}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            placeholder="Поиск проекта..."
                            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                        />
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <CreateProjectCard />

                    {mockProjects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
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

function CreateProjectCard() {
    return (
        <Link
            to="/editor"
            className="group flex min-h-[230px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white p-6 text-center transition hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
        >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition group-hover:scale-105">
                <Plus size={30} />
            </div>

            <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">
                Создать проект
            </h3>

            <p className="mt-2 max-w-[240px] text-sm leading-6 text-slate-500 dark:text-slate-400">
                Открыть редактор и начать проектирование новой схемы базы данных.
            </p>
        </Link>
    );
}

function ProjectCard({ project }) {
    return (
        <Link
            to="/editor"
            className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500"
        >
            <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                    <Database size={24} />
                </div>

                {project.favorite && (
                    <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        <Star size={13} fill="currentColor" />
                        Избранное
                    </div>
                )}
            </div>

            <h3 className="text-lg font-extrabold text-slate-950 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                {project.name}
            </h3>

            <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500 dark:text-slate-400">
                {project.description}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniInfo icon={<Database size={15} />} label="Таблиц" value={project.tables} />
                <MiniInfo icon={<Users size={15} />} label="Связей" value={project.relations} />
            </div>

            <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <CalendarDays size={15} />
                Обновлено: {project.updatedAt}
            </div>
        </Link>
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