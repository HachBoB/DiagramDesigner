import { Link } from "react-router-dom";
import {
    ArrowLeft,
    BookOpen,
    Braces,
    CheckCircle2,
    Code2,
    Database,
    Download,
    FileCode2,
    GitBranch,
    KeyRound,
    Layers3,
    ListTree,
    MousePointer2,
    ScanLine,
    Share2,
    Sparkles,
    Table2,
    Users
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle.jsx";
import ProfileButton from "../components/ProfileButton.jsx";

const docsNavigation = [
    { id: "start", label: "Быстрый старт" },
    { id: "workspace", label: "Как устроен редактор" },
    { id: "syntax", label: "DBML-like синтаксис" },
    { id: "tables", label: "Таблицы и поля" },
    { id: "relations", label: "Связи" },
    { id: "indexes", label: "Индексы и Records" },
    { id: "projects", label: "Проекты и доступ" },
    { id: "export", label: "Экспорт и AI" }
];

const starterSchema = `Table users {
  id SERIAL [pk, not null]
  email VARCHAR(255) [unique, not null]
  name VARCHAR(120) [not null]
}

Table orders {
  id SERIAL [pk, not null]
  user_id INTEGER [fk, not null]
  status VARCHAR(40) [not null]
}

Ref one-to-many: users.id > orders.user_id`;

const syntaxExample = `// Таблица и индекс
Table products {
  id SERIAL [pk, not null]
  title VARCHAR(255) [not null]
  price DECIMAL(10,2) [not null]

  Indexes {
    idx_products_title title
  }
}

Records products(id, title, price) {
  1, 'Keyboard', 6490
}`;

/**
 * Документация собирается из самостоятельных секций. Так навигация слева,
 * превью редактора и поясняющие блоки остаются читаемыми в одном файле.
 */
export default function DocsPage({ theme, onToggleTheme }) {
    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <DocsHeader theme={theme} onToggleTheme={onToggleTheme} />

            <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
                <DocsIntro />

                <div className="mt-8 grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
                    <DocsSidebar />

                    <article className="min-w-0 space-y-6">
                        <QuickStartSection />
                        <WorkspaceSection />
                        <SyntaxSection />
                        <TablesSection />
                        <RelationsSection />
                        <IndexesSection />
                        <ProjectsSection />
                        <ExportSection />
                    </article>
                </div>
            </main>
        </div>
    );
}

// Шапка документации повторяет основные маршруты приложения и тему.
function DocsHeader({ theme, onToggleTheme }) {
    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <div className="mx-auto flex min-h-16 max-w-[1480px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-blue-300"
                    >
                        <ArrowLeft size={16} />
                        Главная
                    </Link>

                    <Link
                        to="/projects"
                        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-blue-300"
                    >
                        <Database size={16} />
                        Проекты
                    </Link>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                    <ProfileButton />

                    <Link
                        to="/editor"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
                    >
                        <MousePointer2 size={16} />
                        Открыть редактор
                    </Link>
                </div>
            </div>
        </header>
    );
}

// Вступление показывает полный маршрут работы до подробных правил синтаксиса.
function DocsIntro() {
    return (
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="flex flex-col justify-center border-b border-slate-200 p-6 sm:p-8 lg:border-b-0 lg:border-r dark:border-slate-800">
                    <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-extrabold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        <BookOpen size={16} />
                        Документация редактора
                    </div>

                    <h1 className="max-w-2xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl dark:text-white">
                        От первой таблицы до схемы, которой можно поделиться
                    </h1>

                    <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">
                        Здесь собран рабочий маршрут по редактору: создайте проект, опишите таблицы
                        визуально или кодом, добавьте связи и индексы, экспортируйте SQL и откройте
                        схему команде.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            to="/projects"
                            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-blue-700"
                        >
                            <Layers3 size={17} />
                            Мои проекты
                        </Link>

                        <a
                            href="#syntax"
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <Code2 size={17} />
                            Смотреть синтаксис
                        </a>
                    </div>
                </div>

                <EditorPreview />
            </div>
        </section>
    );
}

// Боковая навигация использует id секций, чтобы работать как оглавление.
function DocsSidebar() {
    return (
        <aside className="xl:sticky xl:top-24 xl:h-fit">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2 px-2 text-sm font-black text-slate-950 dark:text-white">
                    <ListTree size={16} className="text-blue-600 dark:text-blue-300" />
                    Содержание
                </div>

                <nav className="grid gap-1">
                    {docsNavigation.map((item) => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            className="rounded-2xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-950 dark:hover:text-blue-200"
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div className="rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                        Схема хранится как код и JSON, поэтому canvas, экспорт и совместный доступ
                        работают с одной структурой проекта.
                    </div>
                </div>
            </div>
        </aside>
    );
}

// Раздел быстрого старта раскладывает первый проект на короткие шаги.
function QuickStartSection() {
    return (
        <DocsSection
            id="start"
            eyebrow="Быстрый старт"
            icon={<Sparkles size={20} />}
            title="Создайте схему за четыре шага"
            description="Новый проект уже открывается со стартовой схемой. Ее можно оставить как шаблон или сразу заменить своими таблицами."
        >
            <div className="grid gap-3 md:grid-cols-2">
                <GuideStep
                    number="01"
                    title="Откройте проект"
                    text="Создайте проект в личном кабинете или запустите редактор как быстрый черновик."
                    icon={<Layers3 size={18} />}
                />
                <GuideStep
                    number="02"
                    title="Опишите таблицы"
                    text="Добавляйте сущности через панель свойств или меняйте DBML-like код слева."
                    icon={<Table2 size={18} />}
                />
                <GuideStep
                    number="03"
                    title="Свяжите данные"
                    text="Проведите связь между полями и уточните индексы для частых запросов."
                    icon={<GitBranch size={18} />}
                />
                <GuideStep
                    number="04"
                    title="Заберите результат"
                    text="Скачайте JSON или SQL для выбранной СУБД и поделитесь проектом с командой."
                    icon={<Download size={18} />}
                />
            </div>
        </DocsSection>
    );
}

// Раздел сравнивает два входа в одну схему: текст и визуальный canvas.
function WorkspaceSection() {
    return (
        <DocsSection
            id="workspace"
            eyebrow="Рабочая область"
            icon={<Layers3 size={20} />}
            title="Одна схема, два способа редактирования"
            description="Редактор разделяет работу на код, canvas и панели свойств. Пользователь выбирает удобный вход в одну и ту же схему."
        >
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <FeaturePanel
                    title="DBML-like панель"
                    text="Подходит, когда нужно быстро создать несколько таблиц, скопировать связи или применить правку от AI-помощника."
                    bullets={[
                        "подсветка ключевых слов, типов, строк и комментариев",
                        "проверка блоков Table, Ref, Indexes и Records",
                        "пересборка canvas после корректного изменения кода"
                    ]}
                    icon={<FileCode2 size={20} />}
                />
                <FeaturePanel
                    title="Визуальный canvas"
                    text="Подходит для чтения структуры, перестановки таблиц и работы со связями между полями."
                    bullets={[
                        "карточки таблиц с полями и типами",
                        "линии связей между сущностями",
                        "панель свойств для таблиц, полей и индексов"
                    ]}
                    icon={<MousePointer2 size={20} />}
                />
            </div>
        </DocsSection>
    );
}

// Здесь фиксируются базовые DBML-like блоки, которые понимает parser.
function SyntaxSection() {
    return (
        <DocsSection
            id="syntax"
            eyebrow="Синтаксис"
            icon={<Braces size={20} />}
            title="Пишите структуру схемы понятными блоками"
            description="Код редактора похож на DBML: таблица начинается с Table, связи задаются через Ref, а дополнительные данные живут в Indexes и Records."
        >
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <CodePreview title="Пример схемы" code={syntaxExample} />

                <div className="grid gap-3">
                    <SyntaxNote
                        token="Table"
                        title="Таблица"
                        text="Внутри фигурных скобок перечисляются поля, типы и атрибуты."
                        tone="blue"
                    />
                    <SyntaxNote
                        token="[pk, not null]"
                        title="Атрибуты поля"
                        text="Используйте признаки для ключей, обязательных значений и уникальности."
                        tone="violet"
                    />
                    <SyntaxNote
                        token="Ref"
                        title="Связь"
                        text="Стрелка показывает направление связи между полем источника и полем назначения."
                        tone="emerald"
                    />
                    <SyntaxNote
                        token="//"
                        title="Комментарий"
                        text="Комментарии остаются в коде и не мешают построению схемы."
                        tone="amber"
                    />
                </div>
            </div>
        </DocsSection>
    );
}

// Табличный раздел связывает свойства полей с карточкой таблицы на canvas.
function TablesSection() {
    return (
        <DocsSection
            id="tables"
            eyebrow="Таблицы"
            icon={<Table2 size={20} />}
            title="Таблица собирается из полей, типов и ограничений"
            description="Каждая карточка на canvas соответствует блоку Table в коде. Изменения в панели свойств помогают не держать синтаксис в голове."
        >
            <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
                <MiniTablePreview />

                <div className="grid gap-3">
                    <RuleRow
                        icon={<KeyRound size={17} />}
                        title="Первичный ключ"
                        text="Пометьте идентификатор флагом PK, чтобы генератор SQL сформировал первичный ключ."
                    />
                    <RuleRow
                        icon={<CheckCircle2 size={17} />}
                        title="Ограничения"
                        text="Для поля доступны обязательность, уникальность и другие атрибуты, нужные в схеме."
                    />
                    <RuleRow
                        icon={<ScanLine size={17} />}
                        title="SQL-диалект"
                        text="Проект хранит выбранную СУБД, а экспорт адаптирует типы и кавычки идентификаторов."
                    />
                </div>
            </div>
        </DocsSection>
    );
}

// Раздел связей объясняет стрелки Ref и их роль для foreign keys.
function RelationsSection() {
    return (
        <DocsSection
            id="relations"
            eyebrow="Связи"
            icon={<GitBranch size={20} />}
            title="Ref превращает разрозненные таблицы в модель данных"
            description="Связи можно создать на canvas между полями или описать текстом. На диаграмме они сразу помогают увидеть владельца данных и зависимые сущности."
        >
            <div className="grid gap-4 md:grid-cols-3">
                <RelationCard
                    title="One-to-many"
                    code="users.id > orders.user_id"
                    text="Один пользователь может иметь много заказов."
                />
                <RelationCard
                    title="One-to-one"
                    code="users.id - profiles.user_id"
                    text="Одна запись дополняет другую без коллекции дочерних записей."
                />
                <RelationCard
                    title="Many-to-many"
                    code="orders.id <> products.id"
                    text="Для сложной связи обычно добавляется связующая таблица."
                />
            </div>
        </DocsSection>
    );
}

// Индексы и Records показаны вместе, потому что оба блока расширяют Table.
function IndexesSection() {
    return (
        <DocsSection
            id="indexes"
            eyebrow="Оптимизация и данные"
            icon={<Database size={20} />}
            title="Добавляйте индексы и показывайте тестовые записи"
            description="Индексы задаются в таблице, а Records позволяют открыть содержимое карточки как пример данных для обсуждения схемы."
        >
            <div className="grid gap-4 lg:grid-cols-2">
                <FeaturePanel
                    title="Индексы"
                    text="В панели свойств поля выбираются из выпадающего списка. Имя индекса подстраивается под таблицу и выбранные колонки."
                    bullets={[
                        "одиночные и составные индексы",
                        "уникальные индексы",
                        "CREATE INDEX в SQL-экспорте"
                    ]}
                    icon={<ScanLine size={20} />}
                />
                <FeaturePanel
                    title="Records"
                    text="Блок Records добавляет демонстрационные строки. Кнопка в карточке таблицы открывает их в отдельном окне."
                    bullets={[
                        "колонки задаются в заголовке блока",
                        "строки удобно использовать для примеров",
                        "данные остаются рядом со схемой"
                    ]}
                    icon={<Table2 size={20} />}
                />
            </div>
        </DocsSection>
    );
}

// Раздел проектов описывает сохранение, шаринг и командный доступ.
function ProjectsSection() {
    return (
        <DocsSection
            id="projects"
            eyebrow="Проекты"
            icon={<Users size={20} />}
            title="Храните личные схемы и открывайте доступ команде"
            description="После входа проекты сохраняются в backend. Для совместной работы владелец может создать ссылку, пароль и права участника."
        >
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="grid gap-3">
                    <RuleRow
                        icon={<Layers3 size={17} />}
                        title="Личные проекты"
                        text="Список проектов показывает избранное, последние изменения, количество таблиц и связей."
                    />
                    <RuleRow
                        icon={<Share2 size={17} />}
                        title="Ссылка"
                        text="Проект можно открыть публично или защитить паролем для нужного сценария."
                    />
                    <RuleRow
                        icon={<Users size={17} />}
                        title="Команда"
                        text="Владелец видит участников, меняет их права и может удалить пользователя из проекта."
                    />
                </div>

                <AccessPreview />
            </div>
        </DocsSection>
    );
}

// Последний раздел показывает выходные форматы и место AI-помощника.
function ExportSection() {
    return (
        <DocsSection
            id="export"
            eyebrow="Результат"
            icon={<Download size={20} />}
            title="Экспортируйте схему и подключайте AI к текущему коду"
            description="Редактор сохраняет рабочую схему, а наружу отдает тот формат, который нужен следующему этапу проекта."
        >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <OutcomeCard
                    icon={<Download size={18} />}
                    title="JSON"
                    text="Полное внутреннее представление узлов и связей для переноса или отладки."
                />
                <OutcomeCard
                    icon={<Database size={18} />}
                    title="SQL"
                    text="Генерация скрипта под PostgreSQL, MySQL, SQLite, SQL Server и Oracle."
                />
                <OutcomeCard
                    icon={<Sparkles size={18} />}
                    title="AI-помощник"
                    text="Анализирует видимый код схемы, отвечает в панели и может предложить правки."
                />
            </div>
        </DocsSection>
    );
}

// Общая рамка раздела задает anchor id и единый визуальный ритм документации.
function DocsSection({ id, eyebrow, icon, title, description, children }) {
    return (
        <section
            id={id}
            className="scroll-mt-24 rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft sm:p-6 dark:border-slate-800 dark:bg-slate-900"
        >
            <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-start">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                    {icon}
                </div>

                <div className="min-w-0">
                    <div className="text-xs font-black uppercase text-blue-600 dark:text-blue-300">
                        {eyebrow}
                    </div>
                    <h2 className="mt-1 text-xl font-black leading-tight text-slate-950 sm:text-2xl dark:text-white">
                        {title}
                    </h2>
                    <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {description}
                    </p>
                </div>
            </div>

            {children}
        </section>
    );
}

// Статичное превью похоже на редактор, но не тянет интерактивный canvas.
function EditorPreview() {
    return (
        <div className="bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-slate-950 dark:text-white">
                        <Database size={17} className="text-blue-600 dark:text-blue-300" />
                        Интернет-магазин
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">DBML</span>
                        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">Сохранено</span>
                    </div>
                </div>

                <div className="grid min-h-[390px] md:grid-cols-[0.98fr_1.02fr]">
                    <CodePreview title="schema.dbml" code={starterSchema} dark />
                    <div className="relative border-t border-slate-200 bg-slate-100 p-4 dark:border-slate-700 dark:bg-slate-800/70 md:border-l md:border-t-0">
                        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(#94a3b8_1px,transparent_1px),linear-gradient(90deg,#94a3b8_1px,transparent_1px)] [background-size:30px_30px] dark:[background-image:linear-gradient(#64748b_1px,transparent_1px),linear-gradient(90deg,#64748b_1px,transparent_1px)]" />

                        <div className="relative min-h-[350px] overflow-hidden">
                            <svg
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                            >
                                <path
                                    d="M236 82 C300 82 300 272 236 272"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    className="text-blue-500 dark:text-blue-300"
                                />
                                <circle cx="236" cy="82" r="5" className="fill-blue-500 dark:fill-blue-300" />
                                <circle cx="236" cy="272" r="5" className="fill-blue-500 dark:fill-blue-300" />
                            </svg>

                            <PreviewTable
                                title="users"
                                rows={["id SERIAL PK", "email VARCHAR unique", "name VARCHAR"]}
                                sourceRow="id SERIAL PK"
                                className="absolute left-4 top-6 z-20"
                            />
                            <PreviewTable
                                title="orders"
                                rows={["id SERIAL PK", "user_id INTEGER FK", "status VARCHAR"]}
                                targetRow="user_id INTEGER FK"
                                className="absolute bottom-6 left-4 z-20"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Превью кода используется и как самостоятельный блок, и внутри mock editor.
function CodePreview({ title, code, dark = false }) {
    return (
        <div className={dark
            ? "min-w-0 bg-white dark:bg-slate-950"
            : "overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"}
        >
            <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 text-xs font-black ${
                dark
                    ? "border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-300"
                    : "border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-200"
            }`}>
                <span>{title}</span>
                <Code2 size={15} className="text-blue-600 dark:text-blue-300" />
            </div>

            <pre className="overflow-x-auto p-4 text-[13px] font-semibold leading-6 text-slate-800 sm:text-sm dark:text-slate-100">
                <code>{code}</code>
            </pre>
        </div>
    );
}

// Mock-таблица отмечает source/target строки, чтобы линия связи попадала в поля.
function PreviewTable({ title, rows, sourceRow = "", targetRow = "", className = "" }) {
    return (
        <div className={`w-[220px] overflow-visible rounded-2xl border border-blue-300/70 bg-white text-sm shadow-xl dark:bg-slate-950 ${className}`}>
            <div className="flex h-10 items-center justify-between border-b border-slate-200 px-3 font-black text-slate-950 dark:border-slate-700 dark:text-white">
                {title}
                <Table2 size={15} className="text-blue-600 dark:text-blue-200" />
            </div>
            <div className="divide-y divide-slate-100 text-slate-600 dark:divide-slate-800 dark:text-slate-300">
                {rows.map((row) => (
                    <div key={row} className="relative flex h-9 items-center px-3">
                        {targetRow === row && (
                            <span className="absolute -right-1.5 top-1/2 z-30 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500 shadow dark:border-slate-950 dark:bg-blue-300" />
                        )}
                        {row}
                        {sourceRow === row && (
                            <span className="absolute -right-1.5 top-1/2 z-30 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500 shadow dark:border-slate-950 dark:bg-blue-300" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Одна карточка шага удерживает quick start от длинного сплошного текста.
function GuideStep({ number, title, text, icon }) {
    return (
        <div className="flex gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xs font-black text-white">
                {number}
            </div>
            <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 font-black text-slate-950 dark:text-white">
                    <span className="text-blue-600 dark:text-blue-300">{icon}</span>
                    {title}
                </div>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
            </div>
        </div>
    );
}

// Панель сравнения добавляет bullets к большому поясняющему тексту.
function FeaturePanel({ title, text, bullets, icon }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center gap-2 font-black text-slate-950 dark:text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-blue-600 dark:bg-slate-900 dark:text-blue-300">
                    {icon}
                </span>
                {title}
            </div>

            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>

            <div className="mt-4 grid gap-2">
                {bullets.map((bullet) => (
                    <div key={bullet} className="flex gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                        {bullet}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Цвет токена помогает визуально связать подсказку с примером синтаксиса.
function SyntaxNote({ token, title, text, tone }) {
    const tones = {
        blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        violet: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
        emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
    };

    return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-center gap-2">
                <code className={`rounded-xl px-2.5 py-1 text-xs font-black ${tones[tone]}`}>
                    {token}
                </code>
                <h3 className="font-black text-slate-950 dark:text-white">{title}</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
        </div>
    );
}

// Мини-таблица нужна документации для показа полей и badges без editor state.
function MiniTablePreview() {
    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 px-4 py-3 font-black text-slate-950 dark:border-slate-800 dark:text-white">
                products
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
                <MiniField name="id" type="SERIAL" badges={["PK", "NN"]} />
                <MiniField name="title" type="VARCHAR(255)" badges={["NN"]} />
                <MiniField name="price" type="DECIMAL(10,2)" badges={["NN"]} />
                <MiniField name="stock" type="INTEGER" badges={[]} />
            </div>
        </div>
    );
}

// Поле mini preview рендерит имя, тип и короткие признаки ограничений.
function MiniField({ name, type, badges }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="font-black text-slate-900 dark:text-white">{name}</div>
            <div className="flex flex-wrap items-center gap-2">
                <code className="font-bold text-sky-600 dark:text-sky-300">{type}</code>
                {badges.map((badge) => (
                    <span key={badge} className="rounded-lg bg-slate-200 px-2 py-0.5 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {badge}
                    </span>
                ))}
            </div>
        </div>
    );
}

// Повторяемая строка правила используется в нескольких тематических блоках.
function RuleRow({ icon, title, text }) {
    return (
        <div className="flex gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 dark:bg-slate-900 dark:text-blue-300">
                {icon}
            </div>
            <div>
                <h3 className="font-black text-slate-950 dark:text-white">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
            </div>
        </div>
    );
}

// Карточка связи ставит синтаксис Ref рядом с человеческим объяснением.
function RelationCard({ title, code, text }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-black text-slate-950 dark:text-white">{title}</h3>
            <code className="mt-3 block overflow-x-auto rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-blue-700 dark:border-slate-800 dark:bg-slate-950 dark:text-blue-100">
                {code}
            </code>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
        </div>
    );
}

// Превью команды показывает, как выглядят роли и права участников.
function AccessPreview() {
    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="font-black text-slate-950 dark:text-white">Команда проекта</div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    2 участника
                </span>
            </div>

            <div className="grid gap-2 p-3">
                <MemberPreview name="Костя" role="Владелец" permission="Редактирование" />
                <MemberPreview name="Алина" role="Участник" permission="Просмотр" />
                <MemberPreview name="Игорь" role="Участник" permission="Редактирование" />
            </div>
        </div>
    );
}

// Одна строка участника нужна только статичному AccessPreview.
function MemberPreview({ name, role, permission }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 dark:bg-slate-900">
            <div>
                <div className="font-black text-slate-950 dark:text-white">{name}</div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{role}</div>
            </div>
            <span className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {permission}
            </span>
        </div>
    );
}

// Карточка результата завершает документацию списком выходных сценариев.
function OutcomeCard({ icon, title, text }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-600 dark:bg-slate-900 dark:text-blue-300">
                {icon}
            </div>
            <h3 className="font-black text-slate-950 dark:text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
        </div>
    );
}
