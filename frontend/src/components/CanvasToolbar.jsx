import { useEffect, useRef, useState } from "react";
import { Check, GitBranch, Grid2x2, KeyRound, StickyNote, Table2 } from "lucide-react";

const DETAIL_LEVELS = [
    {
        value: "table-names",
        label: "Имена таблиц",
        icon: Table2
    },
    {
        value: "keys-only",
        label: "Только ключи",
        icon: KeyRound
    },
    {
        value: "all-fields",
        label: "Все поля",
        icon: Table2
    }
];

/**
 * Плавающий toolbar управляет визуальным режимом canvas: детализацией таблиц,
 * подсветкой связей, сеткой и заметками.
 */
export default function CanvasToolbar({
    detailLevel,
    onDetailLevelChange,
    relationsHighlighted,
    onToggleRelations,
    gridVisible,
    onToggleGrid,
    onAddNote,
    relationsCount = 0,
    notesCount = 0
}) {
    const [isDetailMenuOpen, setIsDetailMenuOpen] = useState(false);
    const closeTimeoutRef = useRef(null);
    const currentDetailLevel = DETAIL_LEVELS.find((item) => item.value === detailLevel)
        || DETAIL_LEVELS[2];
    const CurrentDetailIcon = currentDetailLevel.icon;

    // Таймер закрытия дает курсору перейти от кнопки к выпадающему меню.
    // При размонтировании его обязательно очищаем.
    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                window.clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    // Если пользователь вернулся курсором, отложенное закрытие отменяется.
    function openDetailMenu() {
        if (closeTimeoutRef.current) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }

        setIsDetailMenuOpen(true);
    }

    // Небольшая задержка предотвращает мигание меню на границе hover-зон.
    function closeDetailMenuSoon() {
        if (closeTimeoutRef.current) {
            window.clearTimeout(closeTimeoutRef.current);
        }

        closeTimeoutRef.current = window.setTimeout(() => {
            setIsDetailMenuOpen(false);
            closeTimeoutRef.current = null;
        }, 140);
    }

    // Выбранный режим сразу отдаем редактору и закрываем меню.
    function handleDetailLevelSelect(value) {
        onDetailLevelChange(value);
        setIsDetailMenuOpen(false);
    }

    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex items-end gap-1.5 rounded-lg border border-slate-200/90 bg-white/92 p-1 text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100">
                {onToggleRelations && (
                    <ToolbarButton
                        active={relationsHighlighted}
                        onClick={onToggleRelations}
                        title={relationsHighlighted ? "Спрятать связи" : "Подсветить связи"}
                        count={relationsCount}
                    >
                        <GitBranch size={17} />
                    </ToolbarButton>
                )}

                {onAddNote && (
                    <ToolbarButton
                        onClick={onAddNote}
                        title="Добавить заметку"
                        count={notesCount}
                    >
                        <StickyNote size={17} />
                    </ToolbarButton>
                )}

                {onToggleGrid && (
                    <ToolbarButton
                        active={gridVisible}
                        onClick={onToggleGrid}
                        title={gridVisible ? "Спрятать сетку" : "Показать сетку"}
                    >
                        <Grid2x2 size={17} />
                    </ToolbarButton>
                )}

                <div
                    className="relative"
                    onMouseEnter={openDetailMenu}
                    onMouseLeave={closeDetailMenuSoon}
                >
                    <ToolbarButton
                        title="Detail level"
                        active={isDetailMenuOpen}
                    >
                        <CurrentDetailIcon size={17} />
                    </ToolbarButton>

                    <div
                        className={[
                            "absolute bottom-full left-1/2 z-10 mb-1.5 h-3 w-32 -translate-x-1/2",
                            isDetailMenuOpen ? "pointer-events-auto" : "pointer-events-none"
                        ].join(" ")}
                    />

                    <div
                        className={[
                            "absolute bottom-full left-1/2 mb-2 w-52 -translate-x-1/2 overflow-hidden rounded-lg border bg-white text-sm text-slate-700 shadow-[0_18px_42px_rgba(15,23,42,0.16)] transition",
                            "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
                            isDetailMenuOpen
                                ? "visible opacity-100"
                                : "invisible opacity-0"
                        ].join(" ")}
                    >
                        <div className="border-b border-slate-200 px-3.5 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            Detail level
                        </div>

                        {DETAIL_LEVELS.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.value === detailLevel;

                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => handleDetailLevelSelect(item.value)}
                                    className={[
                                        "flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition",
                                        isActive
                                            ? "bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300"
                                            : "text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                                    ].join(" ")}
                                >
                                    <Icon size={16} />
                                    <span className="min-w-0 flex-1 font-medium">{item.label}</span>
                                    {isActive && <Check size={15} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="hidden items-center gap-1.5 border-l border-slate-200 pl-2 pr-1 text-[11px] font-semibold text-slate-500 sm:flex dark:border-slate-700 dark:text-slate-400">
                    <span>Уровень детализации:</span>
                    <span className="text-slate-700 dark:text-slate-200">
                        {currentDetailLevel.label}
                    </span>
                </div>
            </div>
        </div>
    );
}

/**
 * Общая кнопка toolbar фиксирует размеры, active-состояние и счетчик объектов.
 */
function ToolbarButton({ active = false, onClick, title, count, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={[
                "relative flex h-8 w-8 items-center justify-center rounded-md border transition",
                active
                    ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-300"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800"
            ].join(" ")}
        >
            {children}
            {typeof count === "number" && count > 0 && (
                <span className="absolute -bottom-1 -right-1 rounded bg-slate-800 px-1 py-0.5 text-[9px] font-extrabold leading-none text-white dark:bg-slate-700">
                    {count}
                </span>
            )}
        </button>
    );
}
