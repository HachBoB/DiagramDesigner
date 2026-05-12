import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, Link2, Lock, UserRound, Users, X } from "lucide-react";
import {
    getApiErrorMessage,
    getProjectShare,
    updateProjectShare
} from "../lib/api.js";

const ACCESS_OPTIONS = [
    {
        value: "private",
        label: "Только я",
        description: "Проект доступен только владельцу."
    },
    {
        value: "link",
        label: "Все по ссылке",
        description: "Любой, у кого есть ссылка, сможет смотреть проект."
    },
    {
        value: "password",
        label: "Ссылка с паролем",
        description: "Для просмотра нужно будет ввести пароль."
    }
];

export default function ShareSettingsModal({ projectId, open, onClose }) {
    const [share, setShare] = useState(null);
    const [access, setAccess] = useState("private");
    const [permission, setPermission] = useState("view");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const shareUrl = useMemo(() => {
        if (!share?.share_token) {
            return "";
        }

        return `${window.location.origin}/share/${share.share_token}`;
    }, [share?.share_token]);

    useEffect(() => {
        if (!open || !projectId) {
            return;
        }

        const controller = new AbortController();

        getProjectShare(projectId, controller.signal)
            .then((payload) => {
                setShare(payload);
                setAccess(payload.access || "private");
                setPermission(payload.permission || "view");
                setPassword("");
                setStatus("ready");
            })
            .catch((requestError) => {
                if (requestError.name === "AbortError") {
                    return;
                }

                setError(getApiErrorMessage(requestError, "Не удалось загрузить настройки доступа."));
                setStatus("error");
            });

        return () => controller.abort();
    }, [open, projectId]);

    if (!open) {
        return null;
    }

    async function saveShare() {
        setStatus("saving");
        setError("");
        setCopied(false);

        try {
            const payload = await updateProjectShare(projectId, {
                access,
                permission,
                ...(access === "password" ? { password } : {})
            });

            setShare(payload);
            setPassword("");
            setStatus("ready");
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Не удалось сохранить настройки доступа."));
            setStatus("ready");
        }
    }

    async function copyLink() {
        if (!shareUrl) {
            return;
        }

        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
    }

    const viewers = Array.isArray(share?.viewers) ? share.viewers : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6">
            <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                            Поделиться проектом
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Настройте, кто сможет открыть проект для просмотра.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-auto p-5">
                    {status === "loading" ? (
                        <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                            Загружаем настройки доступа...
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {error && (
                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                                    {error}
                                </div>
                            )}

                            <div className="grid gap-3 md:grid-cols-3">
                                {ACCESS_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setAccess(option.value)}
                                        className={[
                                            "rounded-2xl border p-4 text-left transition",
                                            access === option.value
                                                ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100 dark:bg-blue-950/40 dark:ring-blue-950"
                                                : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                                        ].join(" ")}
                                    >
                                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                            {option.value === "private" && <UserRound size={18} />}
                                            {option.value === "link" && <Link2 size={18} />}
                                            {option.value === "password" && <Lock size={18} />}
                                        </div>
                                        <div className="font-extrabold text-slate-900 dark:text-white">
                                            {option.label}
                                        </div>
                                        <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                                            {option.description}
                                        </p>
                                    </button>
                                ))}
                            </div>

                            {access === "password" && (
                                <label className="block">
                                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Пароль для ссылки
                                    </span>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder={share?.password_required ? "Оставьте пустым, чтобы не менять пароль" : "Минимум 4 символа"}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-950"
                                    />
                                </label>
                            )}

                            {access !== "private" && (
                                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                                    <div className="mb-3 text-sm font-extrabold text-slate-900 dark:text-white">
                                        Что можно делать по ссылке
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => setPermission("view")}
                                            className={[
                                                "rounded-2xl border p-4 text-left transition",
                                                permission === "view"
                                                    ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100 dark:bg-blue-950/40 dark:ring-blue-950"
                                                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                                            ].join(" ")}
                                        >
                                            <div className="font-extrabold text-slate-900 dark:text-white">
                                                Только смотреть
                                            </div>
                                            <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                                                Гости смогут открыть схему, записи и код без сохранения изменений.
                                            </p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setPermission("edit")}
                                            className={[
                                                "rounded-2xl border p-4 text-left transition",
                                                permission === "edit"
                                                    ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100 dark:bg-blue-950/40 dark:ring-blue-950"
                                                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                                            ].join(" ")}
                                        >
                                            <div className="font-extrabold text-slate-900 dark:text-white">
                                                Можно редактировать
                                            </div>
                                            <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                                                Открывшие ссылку смогут менять проект и сохранять правки.
                                            </p>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {shareUrl && access !== "private" && (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <div className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Ссылка для просмотра
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={shareUrl}
                                            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={copyLink}
                                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                                        >
                                            <Copy size={16} />
                                            {copied ? "Скопировано" : "Копировать"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                                <div className="mb-3 flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
                                    <Users size={18} />
                                    Кто может смотреть
                                </div>

                                <div className="space-y-2 text-sm">
                                    <ViewerLine
                                        icon={<UserRound size={16} />}
                                        title={share?.owner?.name || "Владелец проекта"}
                                        description={share?.owner?.email || "Полный доступ"}
                                    />
                                    <ViewerLine
                                        icon={<Eye size={16} />}
                                        title={`${ACCESS_OPTIONS.find((option) => option.value === access)?.label} · ${permission === "edit" ? "редактирование" : "просмотр"}`}
                                        description={ACCESS_OPTIONS.find((option) => option.value === access)?.description}
                                    />

                                    {viewers.map((viewer) => (
                                        <ViewerLine
                                            key={viewer.id}
                                            icon={<Eye size={16} />}
                                            title={viewer.name}
                                            description={viewer.email || "Открывал проект по ссылке"}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        Закрыть
                    </button>
                    <button
                        type="button"
                        onClick={saveShare}
                        disabled={status === "saving"}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {status === "saving" ? "Сохраняем..." : "Сохранить доступ"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ViewerLine({ icon, title, description }) {
    return (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 dark:bg-slate-950 dark:text-slate-300">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="truncate font-bold text-slate-800 dark:text-slate-100">
                    {title}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {description}
                </div>
            </div>
        </div>
    );
}
