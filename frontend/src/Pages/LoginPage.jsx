import { Link } from "react-router-dom";
import { Database } from "lucide-react";

export default function LoginPage() {
    return (
        <AuthLayout
            title="Вход в аккаунт"
            subtitle="Пока это frontend-заглушка. Backend добавим позже."
        >
            <input className="auth-input" placeholder="Email" type="email" />
            <input className="auth-input" placeholder="Пароль" type="password" />

            <Link
                to="/projects"
                className="block rounded-2xl bg-blue-600 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700"
            >
                Войти
            </Link>

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

                <div className="mt-8 space-y-4">
                    {children}
                </div>
            </div>
        </div>
    );
}