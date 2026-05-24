import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, lineNumbers } from "@codemirror/view";
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

/**
 * Ищем начало `//` комментария только вне строк. Иначе подсветка поломает
 * значения вроде URL или текстовые примеры внутри Records.
 */
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

// CodeMirror не принимает пустые decoration ranges, поэтому проверка живет
// в маленьком общем helper.
function addMark(builder, from, to, className) {
    if (to > from) {
        builder.add(from, to, Decoration.mark({ class: className }));
    }
}

/**
 * Легкий lexer для DBML-like кода строит CodeMirror decorations:
 * ключевые слова, типы, строки, числа, комментарии и rainbow brackets.
 */
function buildDbmlDecorations(doc) {
    const builder = new RangeSetBuilder();
    const lines = doc.toString().split("\n");
    let offset = 0;
    let bracketDepth = 0;

    // Глубина скобок меняется до закрывающей скобки и после открывающей,
    // чтобы пара получила один и тот же цвет.
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

    lines.forEach((line) => {
        const commentIndex = findCommentIndex(line);
        const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
        let index = 0;

        while (index < codePart.length) {
            const char = codePart[index];
            const absoluteIndex = offset + index;

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

                addMark(builder, absoluteIndex, offset + end, "sql-token-string");
                index = end;
                continue;
            }

            if ("{}()[]".includes(char)) {
                addMark(builder, absoluteIndex, absoluteIndex + 1, bracketClass(char));
                index += 1;
                continue;
            }

            if (/[0-9]/.test(char)) {
                const match = codePart.slice(index).match(/^\d+(\.\d+)?/);

                if (match) {
                    addMark(builder, absoluteIndex, absoluteIndex + match[0].length, "sql-token-number");
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
                        addMark(builder, absoluteIndex, absoluteIndex + word.length, "sql-token-keyword");
                    } else if (TYPES.has(lowerWord)) {
                        addMark(builder, absoluteIndex, absoluteIndex + word.length, "sql-token-type");
                    }

                    index += word.length;
                    continue;
                }
            }

            if (":,<>-=".includes(char)) {
                addMark(builder, absoluteIndex, absoluteIndex + 1, "sql-token-operator");
            }

            index += 1;
        }

        if (commentIndex >= 0) {
            addMark(builder, offset + commentIndex, offset + line.length, "sql-token-comment");
        }

        offset += line.length + 1;
    });

    return builder.finish();
}

// Подсветка пересчитывается только после изменения документа, а не на каждом
// React render страницы редактора.
const dbmlHighlightPlugin = ViewPlugin.fromClass(
    class {
        constructor(view) {
            this.decorations = buildDbmlDecorations(view.state.doc);
        }

        update(update) {
            if (update.docChanged) {
                this.decorations = buildDbmlDecorations(update.state.doc);
            }
        }
    },
    {
        decorations: (plugin) => plugin.decorations
    }
);

/**
 * Обертка над CodeMirror держит редактор синхронизированным с React:
 * пользовательский ввод идет наружу через onChange, а входной prop `value`
 * может заменить документ после импорта, AI-правки или загрузки проекта.
 */
const SqlEditor = forwardRef(function SqlEditor(
    {
        value,
        onChange,
        errors = []
    },
    editorApiRef
) {
    const containerRef = useRef(null);
    const viewRef = useRef(null);
    const initialValueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    const syncingFromPropsRef = useRef(false);
    const hasErrors = errors.length > 0;

    const errorLines = useMemo(() => {
        return new Set(errors.map((error) => error.line));
    }, [errors]);

    // Ref защищает updateListener CodeMirror от замыкания на старый onChange.
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // CodeMirror создается один раз на DOM-контейнер и уничтожается вместе
    // с компонентом, иначе после rerender появились бы несколько editor views.
    useEffect(() => {
        if (!containerRef.current || viewRef.current) {
            return;
        }

        const view = new EditorView({
            parent: containerRef.current,
            state: EditorState.create({
                doc: initialValueRef.current,
                extensions: [
                    lineNumbers({
                        formatNumber: (lineNumber) => String(lineNumber),
                        domEventHandlers: {
                            mousedown: () => true
                        }
                    }),
                    dbmlHighlightPlugin,
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged && !syncingFromPropsRef.current) {
                            onChangeRef.current(update.state.doc.toString());
                        }
                    }),
                    EditorView.theme({
                        "&": {
                            height: "100%"
                        },
                        ".cm-scroller": {
                            overflow: "auto"
                        }
                    })
                ]
            })
        });

        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, []);

    // Внешнее изменение документа не должно повторно вызвать onChange и
    // зациклить React state -> CodeMirror -> React state.
    useEffect(() => {
        const view = viewRef.current;

        if (!view) {
            return;
        }

        const currentValue = view.state.doc.toString();

        if (currentValue === value) {
            return;
        }

        syncingFromPropsRef.current = true;
        view.dispatch({
            changes: {
                from: 0,
                to: currentValue.length,
                insert: value
            }
        });
        syncingFromPropsRef.current = false;
    }, [value]);

    // Ошибочные строки подсвечиваем в gutter уже после рендера номеров строк.
    useEffect(() => {
        const view = viewRef.current;

        if (!view) {
            return;
        }

        view.dom.querySelectorAll(".cm-lineNumbers .cm-gutterElement").forEach((element) => {
            const lineNumber = Number(element.textContent);
            element.classList.toggle("cm-line-error", errorLines.has(lineNumber));
        });
    }, [errorLines, value]);

    // Страница редактора получает минимальный imperative API для фокуса,
    // прокрутки к ошибке и восстановления scroll position.
    useImperativeHandle(editorApiRef, () => ({
        focus() {
            viewRef.current?.focus();
        },
        setSelectionRange(start, end) {
            const view = viewRef.current;

            if (!view) {
                return;
            }

            view.dispatch({
                selection: {
                    anchor: start,
                    head: end
                },
                effects: EditorView.scrollIntoView(start, {
                    y: "center"
                })
            });
        },
        get value() {
            return viewRef.current?.state.doc.toString() || "";
        },
        get scrollTop() {
            return viewRef.current?.scrollDOM.scrollTop || 0;
        },
        set scrollTop(nextScrollTop) {
            const view = viewRef.current;

            if (view) {
                view.scrollDOM.scrollTop = nextScrollTop;
            }
        }
    }), []);

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

            <div className="min-h-0 flex-1 bg-white dark:bg-slate-950">
                <div ref={containerRef} className="schema-codemirror h-full" />
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                {hasErrors ? (
                    <div className="space-y-2">
                        {errors.slice(0, 4).map((error, index) => (
                            <button
                                key={`${error.line}-${error.column}-${index}`}
                                type="button"
                                onClick={() => {
                                    const editor = editorApiRef.current;

                                    if (!editor) {
                                        return;
                                    }

                                    // Парсер возвращает line/column, а CodeMirror
                                    // ожидает абсолютный offset внутри документа.
                                    const lines = value.split("\n");
                                    const before = lines
                                        .slice(0, Math.max(0, error.line - 1))
                                        .join("\n");

                                    const start =
                                        before.length +
                                        (error.line > 1 ? 1 : 0) +
                                        Math.max(0, error.column - 1);

                                    editor.focus();
                                    editor.setSelectionRange(start, start);
                                    editor.scrollTop = Math.max(0, (error.line - 1) * 24 - 80);
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
