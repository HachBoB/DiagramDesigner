export default {
    darkMode: "class",
    content: [
        "./index.html",
        "./src/**/*.{js,jsx}"
    ],
    theme: {
        extend: {
            colors: {
                app: {
                    bg: "#f6f7f9",
                    panel: "#ffffff",
                    border: "#e5e7eb",
                    text: "#111827",
                    muted: "#6b7280",
                    dark: "#0f172a"
                }
            },
            boxShadow: {
                soft: "0 10px 30px rgba(15, 23, 42, 0.08)"
            }
        }
    },
    plugins: []
};