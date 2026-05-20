import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle.jsx";
import ProfileButton from "../components/ProfileButton.jsx";

export default function DocsPage({ theme, onToggleTheme }) {
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
            <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-5">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300">
                        <ArrowLeft size={17} />
                        Назад
                    </Link>

                    <div className="flex items-center gap-2">
                        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                        <ProfileButton />

                        <Link to="/editor" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                            Открыть редактор
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-6 py-10">
                <div className="mb-8 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                        <BookOpen />
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            Документация
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            Краткое описание возможностей редактора схем баз данных.
                        </p>
                    </div>
                </div>

                <div className="space-y-5">
                    <DocBlock title="1. Таблицы">
                        Создавайте таблицы через кнопку добавления. Таблицу можно перемещать мышкой,
                        выделять, редактировать и удалять.
                    </DocBlock>

                    <DocBlock title="2. Поля">
                        У каждого поля есть название, тип данных и признаки PK, FK, Unique, Nullable.
                    </DocBlock>

                    <DocBlock title="3. Связи">
                        Связи создаются перетаскиванием от handle одного поля к handle другого поля.
                        Связь отображается линией React Flow.
                    </DocBlock>

                    <DocBlock title="4. DBML-like код">
                        В левой панели можно менять текстовое описание схемы. После корректного изменения
                        canvas пересобирается по DBML-like коду.
                    </DocBlock>

                    <DocBlock title="5. Записи таблиц">
                        Для таблицы можно добавить блок Records users(id, email, name) {"{"} ... {"}"}.
                        После этого в карточке таблицы появится содержимое, которое открывается кнопкой с иконкой таблицы.
                    </DocBlock>

                    <DocBlock title="6. Доступ по ссылке">
                        В сохраненном проекте можно открыть окно «Поделиться» и выбрать режим:
                        только владелец, просмотр по ссылке или просмотр по ссылке с паролем.
                    </DocBlock>

                    <DocBlock title="7. Экспорт">
                        Можно скачать JSON всей схемы или SQL CREATE TABLE под разные СУБД:
                        PostgreSQL, MySQL, SQLite, SQL Server, Oracle.
                    </DocBlock>

                    <DocBlock title="8. Хранение">
                        После входа проекты сохраняются в вашем аккаунте и доступны на странице
                        «Мои проекты». Режим без аккаунта используется только для быстрых черновиков.
                    </DocBlock>
                </div>
            </main>
        </div>
    );
}

function DocBlock({ title, children }) {
    return (
        <section className="rounded-3xl bg-white p-6 shadow-soft dark:bg-slate-900">
            <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
                {title}
            </h2>

            <p className="leading-7 text-slate-600 dark:text-slate-300">
                {children}
            </p>
        </section>
    );
}
