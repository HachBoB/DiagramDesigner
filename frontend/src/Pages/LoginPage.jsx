import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Database } from "lucide-react";
import { getApiErrorMessage, login } from "../lib/api.js";

/**
 * Форма входа не знает деталей хранения токена: после успешного API-вызова
 * `login` сам сохраняет сессию, а страница переводит пользователя к проектам.
 */
export default function LoginPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Блокируем обычную отправку формы, чтобы показать ошибку API без reload.
    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            await login(form);
            navigate("/projects");
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Не удалось войти."));
        } finally {
            setIsSubmitting(false);
        }
    }

    // Один updater обслуживает оба controlled input поля формы.
    function updateField(field, value) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value
        }));
    }

    return (
        <AuthLayout
            title="Вход в аккаунт"
            subtitle="Войдите, чтобы сохранять проекты схем в своем аккаунте."
        >
            <form className="space-y-4" onSubmit={handleSubmit}>
                <input
                    className="auth-input"
                    placeholder="Email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    required
                />

                <input
                    className="auth-input"
                    placeholder="Пароль"
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    required
                />

                {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="block w-full rounded-2xl bg-blue-600 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting ? "Входим..." : "Войти"}
                </button>
            </form>

            <Link
                to="/editor"
                className="block rounded-2xl border border-slate-200 px-4 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
                Продолжить без входа
            </Link>

            <p className="text-center text-sm text-slate-500">
                Нет аккаунта?{" "}
                <Link to="/register" className="font-semibold text-blue-600">
                    Зарегистрироваться
                </Link>
            </p>
        </AuthLayout>
    );
}

/**
 * Общая оболочка формы входа отделена от submit-логики и может принимать
 * разные поля и ссылки через `children`.
 */
function AuthLayout({ title, subtitle, children }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950">
            <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft dark:bg-slate-900">
                <Link
                    to="/"
                    className="mb-8 flex items-center justify-center gap-2 text-xl font-bold text-slate-950 dark:text-white"
                >
                    <Database className="text-blue-600" />
                    DB Schema Designer
                </Link>

                <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-white">
                    {title}
                </h1>

                <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                    {subtitle}
                </p>

                <div className="mt-8 space-y-4">{children}</div>
            </div>
        </div>
    );
}
