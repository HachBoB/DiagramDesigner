import { Link } from "react-router-dom";
import {
    ArrowRight,
    Database,
    Download,
    FileCode2,
    GitBranch,
    LayoutDashboard,
    MousePointer2,
    Save,
    Sparkles
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle.jsx";
import ProfileButton from "../components/ProfileButton.jsx";
import { isAuthenticated } from "../lib/api.js";

/**
 * Главная страница показывает продуктовый сценарий редактора и ведет
 * авторизованного пользователя к проектам, а гостя к входу или регистрации.
 */
export default function LandingPage({ theme, onToggleTheme }) {
    const hasSession = isAuthenticated();

    return (
        <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
            <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6">
                <Link to="/" className="flex items-center gap-2 text-lg font-bold">
                    <Database className="text-blue-600 dark:text-blue-400" />
                    Конструктор схем БД
                </Link>

                <nav className="flex flex-wrap items-center justify-end gap-3 text-sm">
                    <Link
                        to="/projects"
                        className="rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        Мои проекты
                    </Link>

                    <Link
                        to="/docs"
                        className="rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        Документация
                    </Link>

                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />

                    {hasSession ? (
                        <ProfileButton />
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                            >
                                Войти
                            </Link>

                            <Link
                                to="/register"
                                className="rounded-xl bg-slate-950 px-4 py-2 font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                            >
                                Регистрация
                            </Link>
                        </>
                    )}
                </nav>
            </header>

            <main className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-2">
                <section>
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200">
                        <Sparkles size={16} />
                        Удобный редактор для проектирования баз данных
                    </div>

                    <h1 className="text-5xl font-extrabold leading-tight tracking-tight lg:text-6xl">
                        Собирайте схемы баз данных без хаоса в таблицах и связях
                    </h1>

                    <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                        Создавайте таблицы, поля и связи на визуальном полотне, редактируйте структуру кодом
                        и сохраняйте проекты в своем аккаунте. Когда схема готова, выгружайте ее в SQL или JSON.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            to="/projects"
                            className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400"
                        >
                            <LayoutDashboard size={18} />
                            Перейти к проектам
                            <ArrowRight size={18} />
                        </Link>

                        <Link
                            to="/editor"
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-800 hover:bg-white dark:border-white/15 dark:text-white dark:hover:bg-white/10"
                        >
                            <MousePointer2 size={18} />
                            Попробовать редактор
                        </Link>
                    </div>

                    <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <Stat value="4" label="стартовые таблицы" />
                        <Stat value="3" label="готовые связи" />
                        <Stat value="5" label="форматов SQL" />
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-white/5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-red-400" />
                                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                                <span className="h-3 w-3 rounded-full bg-green-400" />
                            </div>

                            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                Автосохранение включено
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.2fr]">
                            <pre className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-blue-100">
{`Table users {
  id SERIAL [pk]
  email VARCHAR [unique]
}

Table orders {
  id SERIAL [pk]
  user_id INTEGER [fk]
}

Ref:
users.id > orders.user_id`}
                            </pre>

                            <div className="space-y-4">
                                <MockTable
                                    title="users"
                                    fields={["PK id SERIAL", "email VARCHAR", "name VARCHAR"]}
                                />
                                <MockTable
                                    title="orders"
                                    fields={["PK id SERIAL", "FK user_id INTEGER", "status VARCHAR"]}
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 pb-20 md:grid-cols-3">
                <Feature
                    icon={<MousePointer2 />}
                    title="Работайте визуально"
                    text="Перетаскивайте таблицы, добавляйте поля и соединяйте сущности так, как удобно читать вашу схему."
                />

                <Feature
                    icon={<FileCode2 />}
                    title="Редактируйте кодом"
                    text="Описание схемы можно менять текстом: это удобно, когда нужно быстро внести много правок."
                />

                <Feature
                    icon={<GitBranch />}
                    title="Следите за связями"
                    text="Первичные и внешние ключи видны сразу, поэтому легче заметить ошибки в структуре данных."
                />

                <Feature
                    icon={<Save />}
                    title="Возвращайтесь к проектам"
                    text="Сохраняйте схемы в аккаунте, отмечайте важные проекты и продолжайте работу с того же места."
                />

                <Feature
                    icon={<Download />}
                    title="Выгружайте результат"
                    text="Экспортируйте схему в JSON или SQL для PostgreSQL, MySQL, SQLite, SQL Server и Oracle."
                />

                <Feature
                    icon={<Database />}
                    title="Начинайте быстрее"
                    text="Новый проект открывается со стартовой схемой интернет-магазина: пользователи, заказы, товары и позиции заказа."
                />
            </section>
        </div>
    );
}

// Маленький счетчик помогает показать стартовые возможности редактора в hero.
function Stat({ value, label }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <div className="text-2xl font-black text-slate-950 dark:text-white">{value}</div>
            <div className="mt-1 leading-5 text-slate-500 dark:text-slate-400">{label}</div>
        </div>
    );
}

// Превью таблицы имитирует карточку canvas без зависимости от React Flow.
function MockTable({ title, fields }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl dark:border-white/10">
            <div className="mb-3 font-bold">{title}</div>

            <div className="space-y-2">
                {fields.map((field) => (
                    <div key={field} className="rounded-xl bg-slate-100 px-3 py-2 text-sm">
                        {field}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Повторяемый блок преимуществ держит нижнюю часть главной страницы компактной.
function Feature({ icon, title, text }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                {icon}
            </div>

            <h3 className="font-bold">{title}</h3>

            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {text}
            </p>
        </div>
    );
}
