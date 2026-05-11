import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-slate-100">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600">
                        <ArrowLeft size={17} />
                        Назад
                    </Link>

                    <Link to="/editor" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        Открыть редактор
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-6 py-10">
                <div className="mb-8 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                        <BookOpen />
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            Документация
                        </h1>
                        <p className="text-slate-500">
                            Краткое описание возможностей frontend-редактора.
                        </p>
                    </div>
                </div>

                <div className="space-y-5">
                    <DocBlock title="1. Таблицы">
                        Создавайте таблицы через кнопку «Добавить таблицу». Таблицу можно перемещать мышкой, выделять и удалять.
                    </DocBlock>

                    <DocBlock title="2. Поля">
                        У каждого поля есть название, тип данных и признаки PK, FK, Unique, Nullable.
                    </DocBlock>

                    <DocBlock title="3. Связи">
                        Связи создаются перетаскиванием от handle одного поля к handle другого поля. Связь отображается линией React Flow.
                    </DocBlock>

                    <DocBlock title="4. DBML-like код">
                        В левой панели можно менять текстовое описание схемы. После нажатия «Применить» canvas будет пересобран.
                    </DocBlock>

                    <DocBlock title="5. Экспорт">
                        Можно скачать JSON всей схемы или SQL CREATE TABLE под разные СУБД: PostgreSQL, MySQL, SQLite, SQL Server, Oracle.
                    </DocBlock>

                    <DocBlock title="6. Хранение">
                        Пока данные сохраняются только во frontend через localStorage. Backend и база данных будут добавлены позже.
                    </DocBlock>
                </div>
            </main>
        </div>
    );
}

function DocBlock({ title, children }) {
    return (
        <section className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="mb-2 text-lg font-bold text-slate-900">
                {title}
            </h2>

            <p className="leading-7 text-slate-600">
                {children}
            </p>
        </section>
    );
}