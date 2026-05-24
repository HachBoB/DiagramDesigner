import { StickyNote, Trash2 } from "lucide-react";

/**
 * Заметка хранится рядом со схемой как отдельный node на canvas. Сам компонент
 * редактирует только текст, а сохранение snapshot оставляет странице редактора.
 */
export default function StickyNoteNode({ data, selected }) {
    // Родителю передается id заметки, потому что один обработчик обслуживает
    // все заметки текущего проекта.
    function handleTextChange(event) {
        if (typeof data.onChange === "function") {
            data.onChange(data.noteId, event.target.value);
        }
    }

    // Клик по удалению не должен выбирать или перетаскивать node под кнопкой.
    function handleDelete(event) {
        event.stopPropagation();

        if (typeof data.onDelete === "function") {
            data.onDelete(data.noteId);
        }
    }

    return (
        <div
            className={[
                "w-[240px] rounded-2xl border bg-amber-100 text-amber-950 shadow-soft",
                "dark:border-amber-700 dark:bg-amber-900 dark:text-amber-100",
                selected
                    ? "border-amber-500 ring-4 ring-amber-200 dark:ring-amber-500/30"
                    : "border-amber-300 dark:border-amber-700"
            ].join(" ")}
        >
            <div className="flex items-center justify-between gap-2 border-b border-amber-200 px-3 py-2 text-xs font-extrabold uppercase text-amber-900 dark:border-amber-700 dark:text-amber-100">
                <div className="flex items-center gap-2">
                    <StickyNote size={15} />
                    Note
                </div>

                {typeof data.onDelete === "function" && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        title="Delete note"
                        className="nodrag flex h-7 w-7 items-center justify-center rounded-md text-amber-700 transition hover:bg-amber-200 hover:text-red-700 dark:text-amber-200 dark:hover:bg-amber-800 dark:hover:text-red-300"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            <textarea
                value={data.text || ""}
                onChange={handleTextChange}
                placeholder="Write a note..."
                className="nodrag h-32 w-full resize-none bg-transparent px-3 py-3 text-sm font-semibold leading-5 text-amber-950 outline-none placeholder:text-amber-700/70 dark:text-amber-50 dark:placeholder:text-amber-200/55"
            />
        </div>
    );
}
