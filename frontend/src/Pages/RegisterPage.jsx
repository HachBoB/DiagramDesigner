import { Link } from "react-router-dom";
import { Database } from "lucide-react";

export default function RegisterPage() {
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
                    Регистрация
                </h1>

                <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                    Заглушка страницы регистрации. Позже подключим backend.
                </p>

                <div className="mt-8 space-y-4">
                    <input className="auth-input" placeholder="Имя" />
                    <input className="auth-input" placeholder="Email" type="email" />
                    <input className="auth-input" placeholder="Пароль" type="password" />

                    <Link
                        to="/projects"
                        className="block rounded-2xl bg-blue-600 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700"
                    >
                        Создать аккаунт
                    </Link>

                    <Link
                        to="/editor"
                        className="block rounded-2xl border border-slate-200 px-4 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        Продолжить без регистрации
                    </Link>

                    <p className="text-center text-sm text-slate-500">
                        Уже есть аккаунт?{" "}
                        <Link to="/login" className="font-semibold text-blue-600">
                            Войти
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}