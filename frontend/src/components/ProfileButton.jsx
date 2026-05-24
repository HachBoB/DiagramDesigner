import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Mail, Save, User, X } from "lucide-react";
import {
    getApiErrorMessage,
    getStoredUser,
    isAuthenticated,
    logout,
    updateProfile
} from "../lib/api.js";

/**
 * Иконка профиля одновременно служит входом в модалку настроек аккаунта.
 * Она читает локальную сессию, а после сохранения синхронизирует ее с API.
 */
export default function ProfileButton({ onProfileUpdated }) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(getStoredUser);
    const [form, setForm] = useState(() => profileForm(getStoredUser()));
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");

    // Перед открытием перечитываем сохраненного пользователя, чтобы модалка
    // не показывала устаревшие данные после обновления профиля в другой шапке.
    function handleOpen() {
        const storedUser = getStoredUser();
        setUser(storedUser);
        setForm(profileForm(storedUser));
        setError("");
        setStatus("idle");
        setIsOpen(true);
    }

    if (!isAuthenticated()) {
        return null;
    }

    const initials = getInitials(user?.name || user?.email || "П");

    /**
     * Почта и имя отправляются всегда. Поля смены пароля добавляются в payload
     * только когда пользователь действительно ввел новый пароль.
     */
    async function handleSubmit(event) {
        event.preventDefault();
        setStatus("saving");
        setError("");

        try {
            const payload = {
                name: form.name.trim(),
                email: form.email.trim()
            };

            if (form.password) {
                payload.current_password = form.current_password;
                payload.password = form.password;
                payload.password_confirmation = form.password_confirmation;
            }

            const updatedUser = await updateProfile(payload);
            setUser(updatedUser);
            setForm(profileForm(updatedUser));
            onProfileUpdated?.(updatedUser);
            setStatus("saved");
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Не удалось обновить профиль."));
            setStatus("idle");
        }
    }

    // logout очищает token даже если сервер уже недоступен, это делает api-слой.
    async function handleLogout() {
        await logout();
        setIsOpen(false);
        onProfileUpdated?.(null);
        navigate("/login");
    }

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-sm hover:bg-blue-700"
                title="Профиль"
                aria-label="Открыть профиль"
            >
                {initials}
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
                    <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                                    <User size={24} />
                                </div>

                                <div>
                                    <h3 className="text-2xl font-extrabold text-slate-950 dark:text-white">
                                        Профиль
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Имя, почта и пароль аккаунта
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                aria-label="Закрыть"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        {status === "saved" && (
                            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                                Профиль обновлён.
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="grid gap-4">
                            <label className="grid gap-2">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Имя
                                </span>
                                <input
                                    value={form.name}
                                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                                    placeholder="Ваше имя"
                                />
                            </label>

                            <label className="grid gap-2">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Почта
                                </span>
                                <div className="relative">
                                    <Mail
                                        size={17}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                                        placeholder="mail@example.com"
                                    />
                                </div>
                            </label>

                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                                <div className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Смена пароля
                                </div>

                                <div className="grid gap-3">
                                    <input
                                        type="password"
                                        value={form.current_password}
                                        onChange={(event) => setForm((current) => ({ ...current, current_password: event.target.value }))}
                                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                                        placeholder="Текущий пароль"
                                    />
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                                        placeholder="Новый пароль"
                                    />
                                    <input
                                        type="password"
                                        value={form.password_confirmation}
                                        onChange={(event) => setForm((current) => ({ ...current, password_confirmation: event.target.value }))}
                                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                                        placeholder="Повторите новый пароль"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-between gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    <LogOut size={16} />
                                    Выйти
                                </button>

                                <button
                                    type="submit"
                                    disabled={status === "saving" || !form.name.trim() || !form.email.trim()}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Save size={16} />
                                    {status === "saving" ? "Сохраняем..." : "Сохранить"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

// Из API в форму переносим только профильные поля, а password поля каждый раз
// открываем пустыми.
function profileForm(user) {
    return {
        name: user?.name || "",
        email: user?.email || "",
        current_password: "",
        password: "",
        password_confirmation: ""
    };
}

// Аватар без картинки строится из первых букв первых двух частей имени.
function getInitials(value) {
    return value
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}
