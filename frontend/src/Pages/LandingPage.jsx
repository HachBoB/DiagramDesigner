import { Link } from "react-router-dom";
import {
    ArrowRight,
    Database,
    FileCode2,
    GitBranch,
    LayoutDashboard,
    Shield,
    Sparkles
} from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
                <Link to="/" className="flex items-center gap-2 text-lg font-bold">
                    <Database className="text-blue-400" />
                    DB Schema Designer
                </Link>

                <nav className="flex items-center gap-3 text-sm">
                    <Link
                        to="/projects"
                        className="rounded-xl px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                        Мои проекты
                    </Link>

                    <Link
                        to="/docs"
                        className="rounded-xl px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                        Docs
                    </Link>

                    <Link
                        to="/login"
                        className="rounded-xl px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                        Войти
                    </Link>

                    <Link
                        to="/register"
                        className="rounded-xl bg-white px-4 py-2 font-semibold text-slate-950 hover:bg-slate-100"
                    >
                        Регистрация
                    </Link>
                </nav>
            </header>

            <main className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-2">
                <section>
                    <div className="mb-5 inline-flex rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-sm font-medium text-blue-200">
                        Frontend-оболочка редактора схем баз данных
                    </div>

                    <h1 className="text-5xl font-extrabold leading-tight tracking-tight lg:text-6xl">
                        Проектируй базы данных визуально, как в dbdiagram.io
                    </h1>

                    <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                        Интерактивный редактор схем БД на React Flow: таблицы, поля, связи,
                        DBML-like код, экспорт JSON и SQL под разные СУБД.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            to="/projects"
                            className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400"
                        >
                            <LayoutDashboard size={18} />
                            Мои проекты
                            <ArrowRight size={18} />
                        </Link>

                        <Link
                            to="/editor"
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-5 py-3 font-semibold text-white hover:bg-white/10"
                        >
                            <Sparkles size={18} />
                            Перейти сразу в редактор
                        </Link>
                    </div>

                    <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
                        Сейчас можно пользоваться редактором без регистрации. Позже, когда
                        подключим backend, проекты будут сохраняться в аккаунте пользователя.
                    </p>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
                    <div className="rounded-2xl bg-slate-900 p-4">
                        <div className="mb-4 flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-red-400" />
                            <span className="h-3 w-3 rounded-full bg-yellow-400" />
                            <span className="h-3 w-3 rounded-full bg-green-400" />
                        </div>

                        <div className="grid grid-cols-[1fr_1.2fr] gap-4">
              <pre className="rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-blue-100">
{`Table users {
  id SERIAL [pk]
  email VARCHAR [unique]
}

Table orders {
  id SERIAL [pk]
  user_id INTEGER [fk]
}

Ref one-to-many:
users.id > orders.user_id`}
              </pre>

                            <div className="space-y-4">
                                <MockTable
                                    title="users"
                                    fields={["🔑 id SERIAL", "email VARCHAR", "name VARCHAR"]}
                                />
                                <MockTable
                                    title="orders"
                                    fields={["🔑 id SERIAL", "🔗 user_id INTEGER", "status VARCHAR"]}
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 pb-20 md:grid-cols-3">
                <Feature
                    icon={<FileCode2 />}
                    title="DBML-like editor"
                    text="Слева можно редактировать схему кодом и применять её к canvas."
                />

                <Feature
                    icon={<GitBranch />}
                    title="Связи"
                    text="React Flow отображает связи между таблицами и полями."
                />

                <Feature
                    icon={<Shield />}
                    title="Frontend only"
                    text="Без сервера и базы данных. Данные пока сохраняются в localStorage."
                />
            </section>
        </div>
    );
}

function MockTable({ title, fields }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white p-4 text-slate-900 shadow-xl">
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

function Feature({ icon, title, text }) {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                {icon}
            </div>

            <h3 className="font-bold">{title}</h3>

            <p className="mt-2 text-sm leading-6 text-slate-300">
                {text}
            </p>
        </div>
    );
}