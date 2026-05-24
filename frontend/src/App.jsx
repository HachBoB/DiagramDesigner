import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import EditorPage from "./pages/EditorPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DocsPage from "./pages/DocsPage.jsx";
import SharedProjectPage from "./pages/SharedProjectPage.jsx";
import { applyTheme, getSavedTheme, saveTheme } from "./utils/theme.js";

/**
 * Корневой компонент фронта хранит общую тему и передает ее тем страницам,
 * у которых есть переключатель светлого и темного режима.
 */
export default function App() {
    const [theme, setTheme] = useState(getSavedTheme);

    useEffect(() => {
        applyTheme(theme);
        saveTheme(theme);
    }, [theme]);

    // Тема меняется в одном месте, чтобы страница не расходилась с localStorage
    // и классом `dark` на корневом HTML-элементе.
    function toggleTheme() {
        setTheme((currentTheme) => currentTheme === "dark" ? "light" : "dark");
    }

    return (
        <Routes>
            <Route
                path="/"
                element={<LandingPage theme={theme} onToggleTheme={toggleTheme} />}
            />
            <Route
                path="/projects"
                element={<ProjectsPage theme={theme} onToggleTheme={toggleTheme} />}
            />
            <Route
                path="/editor"
                element={<EditorPage theme={theme} onToggleTheme={toggleTheme} />}
            />
            <Route
                path="/editor/:projectId"
                element={<EditorPage theme={theme} onToggleTheme={toggleTheme} />}
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
                path="/docs"
                element={<DocsPage theme={theme} onToggleTheme={toggleTheme} />}
            />
            <Route
                path="/share/:token"
                element={<SharedProjectPage theme={theme} onToggleTheme={toggleTheme} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
