import { forwardRef, useMemo, useRef } from "react";
import { AlertTriangle, CheckCircle2, Code2 } from "lucide-react";

const SqlEditor = forwardRef(function SqlEditor(
    {
        value,
        onChange,
        errors = []
    },
    textareaRef
) {
    const lineNumbersRef = useRef(null);
    const hasErrors = errors.length > 0;

    const lineCount = useMemo(() => {
        return Math.max(1, value.split("\n").length);
    }, [value]);

    const errorLines = useMemo(() => {
        return new Set(errors.map((error) => error.line));
    }, [errors]);

    function handleScroll(event) {
        if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
        }
    }

    return (
        <section className="flex w-[390px] shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-white">
            <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
                <div className="flex items-center gap-2 font-semibold">
                    <Code2 size={18} className="text-blue-400" />
                    DBML / Schema Code
                </div>

                {hasErrors ? (
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300">
                        <AlertTriangle size={14} />
                        Ошибка
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                        <CheckCircle2 size={14} />
                        OK
                    </div>
                )}
            </div>

            <div className="flex min-h-0 flex-1 bg-slate-950">
                <div
                    ref={lineNumbersRef}
                    className="schema-line-numbers w-12 shrink-0 overflow-hidden border-r border-slate-800 bg-slate-900/70 py-4 text-right font-mono text-sm leading-6 text-slate-500"
                >
                    {Array.from({ length: lineCount }).map((_, index) => {
                        const lineNumber = index + 1;
                        const isErrorLine = errorLines.has(lineNumber);

                        return (
                            <div
                                key={lineNumber}
                                className={[
                                    "h-6 pr-3",
                                    isErrorLine
                                        ? "font-bold text-red-300"
                                        : "text-slate-500"
                                ].join(" ")}
                            >
                                {lineNumber}
                            </div>
                        );
                    })}
                </div>

                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onScroll={handleScroll}
                    spellCheck={false}
                    className={[
                        "schema-scroll min-h-0 flex-1 resize-none bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none",
                        "pl-4",
                        hasErrors ? "selection:bg-red-500/30" : "selection:bg-blue-500/30"
                    ].join(" ")}
                />
            </div>

            <div className="border-t border-slate-800 bg-slate-950 px-4 py-3">
                {hasErrors ? (
                    <div className="space-y-2">
                        {errors.slice(0, 4).map((error, index) => (
                            <button
                                key={`${error.line}-${error.column}-${index}`}
                                type="button"
                                onClick={() => {
                                    const textarea = textareaRef.current;

                                    if (!textarea) {
                                        return;
                                    }

                                    const lines = value.split("\n");
                                    const before = lines
                                        .slice(0, Math.max(0, error.line - 1))
                                        .join("\n");

                                    const start =
                                        before.length +
                                        (error.line > 1 ? 1 : 0) +
                                        Math.max(0, error.column - 1);

                                    textarea.focus();
                                    textarea.setSelectionRange(start, start);
                                    textarea.scrollTop = Math.max(0, (error.line - 1) * 24 - 80);

                                    if (lineNumbersRef.current) {
                                        lineNumbersRef.current.scrollTop = textarea.scrollTop;
                                    }
                                }}
                                className="block w-full rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-left transition hover:bg-red-500/15"
                            >
                                <div className="flex items-start gap-2">
                                    <AlertTriangle
                                        size={16}
                                        className="mt-0.5 shrink-0 text-red-300"
                                    />

                                    <div className="min-w-0">
                                        <div className="font-mono text-xs font-bold text-red-200">
                                            ({error.line}:{error.column}) {error.message}
                                        </div>

                                        {error.hint && (
                                            <div className="mt-1 text-xs leading-5 text-red-200/70">
                                                {error.hint}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}

                        {errors.length > 4 && (
                            <div className="text-xs font-medium text-red-200/70">
                                Ещё ошибок: {errors.length - 4}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <CheckCircle2 size={15} className="text-emerald-400" />
                        Схема валидна. Canvas обновляется автоматически.
                    </div>
                )}
            </div>
        </section>
    );
});

export default SqlEditor;