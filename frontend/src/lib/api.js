const API_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "db-schema-designer-token";
const USER_KEY = "db-schema-designer-user";

function createApiError(message, status, details = {}) {
    return Object.assign(new Error(message), { status, details });
}

export function getApiErrorDetails(error) {
    const details = error?.details?.error;

    if (!details || typeof details !== "object") {
        return "";
    }

    const lines = [];

    if (details.provider) lines.push(`Провайдер: ${details.provider}`);
    if (details.model) lines.push(`Модель: ${details.model}`);
    if (details.type) lines.push(`Тип ошибки: ${details.type}`);
    if (details.reason) lines.push(`Причина: ${details.reason}`);
    if (details.previous?.reason) lines.push(`Нижеуровневая ошибка: ${details.previous.reason}`);
    if (details.base_url) lines.push(`Endpoint: ${details.base_url}`);
    if (details.file && details.line) lines.push(`Файл: ${details.file}:${details.line}`);

    return lines.join("\n");
}

export function getAuthToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
    const raw = localStorage.getItem(USER_KEY);

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function setAuthSession({ token, user }) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    }

    if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
}

export function clearAuthSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
    return Boolean(getAuthToken());
}

async function request(path, options = {}) {
    const {
        method = "GET",
        body,
        auth = true,
        headers = {},
        signal
    } = options;

    const token = getAuthToken();

    const response = await fetch(`${API_URL}${path}`, {
        method,
        credentials: "omit",
        headers: {
            Accept: "application/json",
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
        ? await response.json()
        : { message: await response.text() };

    if (!response.ok) {
        if (response.status === 401) {
            clearAuthSession();
        }

        const validationMessage = payload?.errors
            ? Object.values(payload.errors).flat().filter(Boolean)[0]
            : null;

        throw createApiError(
            validationMessage || payload?.message || `Request failed with status ${response.status}.`,
            response.status,
            payload
        );
    }

    return payload;
}

export async function register(data) {
    const payload = await request("/api/register", {
        method: "POST",
        body: data,
        auth: false
    });

    setAuthSession(payload.data);

    return payload.data;
}

export async function login(data) {
    const payload = await request("/api/login", {
        method: "POST",
        body: data,
        auth: false
    });

    setAuthSession(payload.data);

    return payload.data;
}

export async function logout() {
    try {
        await request("/api/logout", { method: "POST" });
    } finally {
        clearAuthSession();
    }
}

export async function fetchSession(signal) {
    if (!getAuthToken()) {
        return null;
    }

    const payload = await request("/api/me", { signal });
    setAuthSession({ user: payload.data });

    return payload.data;
}

export async function updateProfile(data) {
    const payload = await request("/api/me", {
        method: "PATCH",
        body: data
    });

    setAuthSession({ user: payload.data });

    return payload.data;
}

export async function listProjects(signal) {
    const payload = await request("/api/projects", { signal });

    return payload.data;
}

export async function getProject(projectId, signal) {
    return request(`/api/projects/${projectId}`, { signal });
}

export async function createProject(project) {
    return request("/api/projects", {
        method: "POST",
        body: project
    });
}

export async function updateProject(projectId, project, method = "PATCH") {
    return request(`/api/projects/${projectId}`, {
        method,
        body: project
    });
}

export async function deleteProject(projectId) {
    const payload = await request(`/api/projects/${projectId}`, {
        method: "DELETE"
    });

    return payload.message;
}

export async function leaveProject(projectId) {
    const payload = await request(`/api/projects/${projectId}/leave`, {
        method: "DELETE"
    });

    return payload.message;
}

export async function removeProjectViewer(projectId, viewerId) {
    const payload = await request(`/api/projects/${projectId}/team/${viewerId}`, {
        method: "DELETE"
    });

    return payload.message;
}

export async function updateProjectViewerPermission(projectId, viewerId, permission) {
    return request(`/api/projects/${projectId}/team/${viewerId}`, {
        method: "PATCH",
        body: { permission }
    });
}

export async function duplicateProject(projectId) {
    return request(`/api/projects/${projectId}/duplicate`, {
        method: "POST"
    });
}

export async function toggleProjectFavorite(projectId, isFavorite) {
    return request(`/api/projects/${projectId}/favorite`, {
        method: "PATCH",
        body: isFavorite === undefined ? {} : { is_favorite: isFavorite }
    });
}

export async function markProjectOpened(projectId) {
    return request(`/api/projects/${projectId}/last-opened`, {
        method: "PATCH"
    });
}

export async function getProjectShare(projectId, signal) {
    return request(`/api/projects/${projectId}/share`, { signal });
}

export async function updateProjectShare(projectId, data) {
    return request(`/api/projects/${projectId}/share`, {
        method: "PATCH",
        body: data
    });
}

export async function getSharedProject(token, signal) {
    return request(`/api/shared-projects/${token}`, {
        auth: true,
        signal
    });
}

export async function unlockSharedProject(token, password) {
    return request(`/api/shared-projects/${token}/unlock`, {
        method: "POST",
        auth: true,
        body: { password }
    });
}

export async function updateSharedProject(token, project, password = "") {
    return request(`/api/shared-projects/${token}`, {
        method: "PATCH",
        auth: true,
        body: password ? { ...project, password } : project
    });
}

export async function askSchemaAssistant(payload) {
    const response = await request("/api/ai/schema-assistant", {
        method: "POST",
        body: payload
    });

    return response.data;
}

export function getApiErrorMessage(error, fallback = "Unexpected error.") {
    if (error instanceof TypeError) {
        return "Не удалось подключиться к API. Проверьте, что Laravel запущен на http://127.0.0.1:8000 и работает Vite proxy.";
    }

    return error instanceof Error && error.message ? error.message : fallback;
}
