import { useState } from "react";
import { Bot, Check, Loader2, Send, Sparkles, Wand2, X } from "lucide-react";
import {
    askSchemaAssistant,
    getApiErrorDetails,
    getApiErrorMessage,
    isAuthenticated
} from "../lib/api.js";

const QUICK_PROMPTS = [
    "Проверь связи и внешние ключи",
    "Какие индексы стоит добавить?",
    "Найди слабые места схемы"
];

/**
 * Боковое окно AI получает ту же схему, SQL и диалект, которые сейчас видит
 * пользователь. Ответ может быть обычным разбором или новой версией schema code.
 */
export default function AiAssistantPanel({
                                            open,
                                            onClose,
                                            projectName,
                                            dialect,
                                            schemaCode,
                                            schemaJson,
                                            sql,
                                            onApplySchemaCode
                                        }) {
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [proposedSchemaCode, setProposedSchemaCode] = useState("");
    const [isApplied, setIsApplied] = useState(false);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");
    const [errorDetails, setErrorDetails] = useState("");

    if (!open) {
        return null;
    }

    /**
     * Собираем единый запрос к backend AI endpoint. Режим `review` ожидает
     * советы текстом, а `edit` просит вернуть код, который можно применить.
     */
    async function askAssistant(nextQuestion = question, mode = "review") {
        if (!isAuthenticated()) {
            setError("Войдите в аккаунт, чтобы пользоваться AI-помощником.");
            return;
        }

        setStatus("loading");
        setError("");
        setErrorDetails("");
        setIsApplied(false);

        try {
            const payload = await askSchemaAssistant({
                question: nextQuestion || "Проверь текущую схему и дай рекомендации.",
                mode,
                project_name: projectName,
                dialect,
                schema_code: schemaCode,
                schema_json: schemaJson,
                sql
            });

            setAnswer(payload.message);
            setProposedSchemaCode(payload.schema_code || "");
            setStatus("ready");
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "AI-помощник сейчас недоступен."));
            setErrorDetails(getApiErrorDetails(requestError));
            setStatus("idle");
        }
    }

    /**
     * Кнопка отправки сама решает, просит ли пользователь именно правку кода.
     * Это дает одинаковое поведение для свободного текста и отдельной кнопки.
     */
    function detectIntentMode(value) {
        const text = String(value || "").toLowerCase();
        const editWords = [
            "измени",
            "изменить",
            "исправь",
            "исправить",
            "добавь",
            "добавить",
            "удали",
            "удалить",
            "переименуй",
            "переименовать",
            "создай",
            "создать",
            "сделай",
            "сгенерируй",
            "перепиши",
            "обнови",
            "внеси",
            "правки",
            "поправь",
            "замени",
            "дополни"
        ];

        return editWords.some((word) => text.includes(word)) ? "edit" : "review";
    }

    // Предложенный код не заменяет схему автоматически: пользователь сначала
    // видит diff-like preview и сам подтверждает применение.
    function applySchemaCode() {
        if (!proposedSchemaCode || typeof onApplySchemaCode !== "function") {
            return;
        }

        onApplySchemaCode(proposedSchemaCode);
        setIsApplied(true);
    }

    return (
        <div className="fixed bottom-5 right-5 z-40 flex max-h-[72vh] w-[420px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                        <Bot size={20} />
                    </div>
                    <div>
                        <div className="font-extrabold text-slate-900 dark:text-white">
                            AI-помощник
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            Видит текущий SQL и схему
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((prompt) => (
                        <button
                            key={prompt}
                            type="button"
                            onClick={() => {
                                setQuestion(prompt);
                                askAssistant(prompt);
                            }}
                            className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-blue-950 dark:hover:text-blue-300"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => askAssistant(question || "Внеси безопасные улучшения в код схемы: исправь явные проблемы с ключами, nullability, связями и названиями.", "edit")}
                    disabled={status === "loading"}
                    className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {status === "loading" ? <Loader2 size={17} className="animate-spin" /> : <Wand2 size={17} />}
                    Предложить правки в код
                </button>

                {error && (
                    <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        <div>{error}</div>
                        {errorDetails && (
                            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border border-red-200 bg-white p-3 text-xs font-medium leading-5 text-red-800 dark:border-red-900 dark:bg-slate-950 dark:text-red-200">
                                {errorDetails}
                            </pre>
                        )}
                    </div>
                )}

                <div className="min-h-[180px] rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {status === "loading" ? (
                        <div className="flex items-center gap-2 font-semibold text-slate-500 dark:text-slate-400">
                            <Loader2 size={17} className="animate-spin" />
                            Думаю над схемой...
                        </div>
                    ) : answer ? (
                        <div className="space-y-3">
                            <div className="whitespace-pre-wrap">{answer}</div>

                            {proposedSchemaCode && (
                                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                                    <div className="mb-2 text-xs font-bold uppercase text-blue-700 dark:text-blue-300">
                                        AI подготовил новую версию кода
                                    </div>
                                    <pre className="max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                                        {proposedSchemaCode}
                                    </pre>
                                    <button
                                        type="button"
                                        onClick={applySchemaCode}
                                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                                    >
                                        {isApplied ? <Check size={16} /> : <Wand2 size={16} />}
                                        {isApplied ? "Правки применены" : "Применить правки"}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
                            <Sparkles size={17} className="mt-0.5 shrink-0" />
                            <span>
                                Спросите, что улучшить в схеме, или нажмите одну из быстрых подсказок.
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <form
                className="border-t border-slate-200 p-3 dark:border-slate-800"
                onSubmit={(event) => {
                    event.preventDefault();
                    askAssistant(question, detectIntentMode(question));
                }}
            >
                <div className="flex gap-2">
                    <input
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        placeholder="Например: проверь нормализацию"
                        className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-950"
                    />
                    <button
                        type="submit"
                        disabled={status === "loading"}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {status === "loading" ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </form>
        </div>
    );
}
