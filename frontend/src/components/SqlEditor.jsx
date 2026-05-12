import { forwardRef, useMemo, useRef } from "react";
import { AlertTriangle, CheckCircle2, Code2 } from "lucide-react";

const KEYWORDS = new Set([
    "table",
    "ref",
    "records",
    "enum",
    "indexes",
    "note",
    "project"
]);

const TYPES = new Set([
    "bigint",
    "bigserial",
    "boolean",
    "char",
    "date",
    "datetime",
    "decimal",
    "double",
    "float",
    "int",
    "integer",
    "json",
    "jsonb",
    "numeric",
    "real",
    "serial",
    "smallint",
    "text",
    "time",
    "timestamp",
    "uuid",
    "varchar"
]);

function findCommentIndex(line) {
    let quote = null;

    for (let index = 0; index < line.length - 1; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if ((char === "'" || char === "\"") && line[index - 1] !== "\\") {
            quote = quote === char ? null : quote || char;
        }

        if (!quote && char === "/" && nextChar === "/") {
            return index;
        }
    }

    return -1;
}

function highlightDbml(value) {
    const lines = value.split("\n");
    const elements = [];
    let bracketDepth = 0;
    let key = 0;

    function push(content, className = "") {
        elements.push(
            <span key={key} className={className}>
                {content}
            </span>
        );
        key += 1;
    }

    function bracketClass(char) {
        if (char === "}" || char === ")" || char === "]") {
            bracketDepth = Math.max(0, bracketDepth - 1);
        }

        const className = `sql-token-bracket sql-token-bracket-${bracketDepth % 5}`;

        if (char === "{" || char === "(" || char === "[") {
            bracketDepth += 1;
        }

        return className;
    }

    lines.forEach((line, lineIndex) => {
        const commentIndex = findCommentIndex(line);
        const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
        const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : "";
        let index = 0;

        while (index < codePart.length) {
            const char = codePart[index];

            if (char === "'" || char === "\"") {
                const quote = char;
                let end = index + 1;

                while (end < codePart.length) {
                    if (codePart[end] === quote && codePart[end - 1] !== "\\") {
                        end += 1;
                        break;
                    }

                    end += 1;
                }

                push(codePart.slice(index, end), "sql-token-string");
                index = end;
                continue;
            }

            if ("{}()[]".includes(char)) {
                push(char, bracketClass(char));
                index += 1;
                continue;
            }

            if (/[0-9]/.test(char)) {
                const match = codePart.slice(index).match(/^\d+(\.\d+)?/);

                if (match) {
                    push(match[0], "sql-token-number");
                    index += match[0].length;
                    continue;
                }
            }

            if (/[A-Za-z_]/.test(char)) {
                const match = codePart.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);

                if (match) {
                    const word = match[0];
                    const lowerWord = word.toLowerCase();

                    if (KEYWORDS.has(lowerWord)) {
                        push(word, "sql-token-keyword");
                    } else if (TYPES.has(lowerWord)) {
                        push(word, "sql-token-type");
                    } else {
                        push(word);
                    }

                    index += word.length;
                    continue;
                }
            }

            if (":,<>-=".includes(char)) {
                push(char, "sql-token-operator");
                index += 1;
                continue;
            }

            push(char);
            index += 1;
        }

        if (commentPart) {
            push(commentPart, "sql-token-comment");
        }

        if (lineIndex < lines.length - 1) {
            elements.push("\n");
        }
    });

    return elements;
}

const SqlEditor = forwardRef(function SqlEditor(
    {
        value,
        onChange,
        errors = []
    },
    textareaRef
) {
    const lineNumbersRef = useRef(null);
    const highlightRef = useRef(null);
    const hasErrors = errors.length > 0;

    const lineCount = useMemo(() => {
        return Math.max(1, value.split("\n").length);
    }, [value]);

    const errorLines = useMemo(() => {
        return new Set(errors.map((error) => error.line));
    }, [errors]);

    const highlightedCode = useMemo(() => {
        return highlightDbml(value);
    }, [value]);

    function handleScroll(event) {
        if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
        }

        if (highlightRef.current) {
            highlightRef.current.scrollTop = event.currentTarget.scrollTop;
            highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
        }
    }

    return (
        <section className="flex w-[390px] shrink-0 flex-col border-r border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
                <div className="flex items-center gap-2 font-semibold">
                    <Code2 size={18} className="text-blue-600 dark:text-blue-400" />
                    DBML / Schema Code
                </div>

                {hasErrors ? (
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300">
                        <AlertTriangle size={14} />
                        Ошибка
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <CheckCircle2 size={14} />
                        OK
                    </div>
                )}
            </div>

            <div className="flex min-h-0 flex-1 bg-white dark:bg-slate-950">
                <div
                    ref={lineNumbersRef}
                    className="schema-line-numbers w-12 shrink-0 overflow-hidden border-r border-slate-200 bg-slate-50 py-4 text-right font-mono text-[13px] leading-6 text-slate-400 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-500"
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
                                        ? "font-bold text-red-500 dark:text-red-300"
                                        : "text-slate-400 dark:text-slate-500"
                                ].join(" ")}
                            >
                                {lineNumber}
                            </div>
                        );
                    })}
                </div>

                <div className="relative min-h-0 flex-1 overflow-hidden bg-white dark:bg-slate-950">
                    <pre
                        ref={highlightRef}
                        aria-hidden="true"
                        className="schema-highlight pointer-events-none absolute inset-0 m-0 overflow-auto whitespace-pre p-4 pl-4 font-mono text-[15px] font-medium leading-6"
                    >
                        <code>{highlightedCode}</code>
                    </pre>

                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        onScroll={handleScroll}
                        spellCheck={false}
                        wrap="off"
                        className={[
                            "schema-scroll relative z-10 min-h-0 h-full w-full resize-none bg-transparent p-4 pl-4 font-mono text-[15px] font-medium leading-6 text-transparent caret-slate-900 outline-none dark:caret-slate-100",
                            hasErrors ? "selection:bg-red-500/30" : "selection:bg-blue-500/30"
                        ].join(" ")}
                    />
                </div>
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
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
                                className="block w-full rounded-2xl border border-red-200 bg-red-50 p-3 text-left transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:hover:bg-red-500/15"
                            >
                                <div className="flex items-start gap-2">
                                    <AlertTriangle
                                        size={16}
                                        className="mt-0.5 shrink-0 text-red-500 dark:text-red-300"
                                    />

                                    <div className="min-w-0">
                                        <div className="font-mono text-xs font-bold text-red-700 dark:text-red-200">
                                            ({error.line}:{error.column}) {error.message}
                                        </div>

                                        {error.hint && (
                                            <div className="mt-1 text-xs leading-5 text-red-600 dark:text-red-200/70">
                                                {error.hint}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}

                        {errors.length > 4 && (
                            <div className="text-xs font-medium text-red-600 dark:text-red-200/70">
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
