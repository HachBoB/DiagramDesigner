const API_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "db-schema-designer-token";
const USER_KEY = "db-schema-designer-user";

// Один формат ошибки позволяет UI читать status, message и сырые details
// независимо от конкретного endpoint.
function createApiError(message, status, details = {}) {
    return Object.assign(new Error(message), { status, details });
}

// AI endpoint присылает расширенную диагностику, а UI выводит ее отдельным блоком.
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

// Токен хранится отдельно от пользователя, чтобы Bearer header брать быстро.
export function getAuthToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// Пользователь в localStorage нужен шапкам до запроса `/api/me`.
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

// Login, register и обновление профиля используют один способ обновить сессию.
export function setAuthSession({ token, user }) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    }

    if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
}

// Удаляем оба ключа, чтобы интерфейс не считал профиль авторизованным по кэшу.
export function clearAuthSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

// Для интерфейса признак сессии сейчас равен наличию Bearer token.
export function isAuthenticated() {
    return Boolean(getAuthToken());
}

// Один fetch-wrapper отвечает за Bearer token, Laravel validation errors и сброс битой сессии.
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
            // Токен больше не годится, значит frontend не должен продолжать считать сессию живой.
            clearAuthSession();
        }

        // Laravel Form Request возвращает errors по полям, форме удобнее первая причина.
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

// Auth endpoints возвращают `data` с token и user, поэтому сохраняют сессию тут.
export async function register(data) {
    const payload = await request("/api/register", {
        method: "POST",
        body: data,
        auth: false
    });

    setAuthSession(payload.data);

    return payload.data;
}

// Вход повторяет форму регистрации по shape результата.
export async function login(data) {
    const payload = await request("/api/login", {
        method: "POST",
        body: data,
        auth: false
    });

    setAuthSession(payload.data);

    return payload.data;
}

// Даже если logout route не ответит, локальный token больше использовать нельзя.
export async function logout() {
    try {
        await request("/api/logout", { method: "POST" });
    } finally {
        clearAuthSession();
    }
}

// `/api/me` проверяет жив ли токен и освежает кэш пользователя.
export async function fetchSession(signal) {
    if (!getAuthToken()) {
        return null;
    }

    const payload = await request("/api/me", { signal });
    setAuthSession({ user: payload.data });

    return payload.data;
}

// После изменения профиля обновляем тот же кэш, что читают ProfileButton и header.
export async function updateProfile(data) {
    const payload = await request("/api/me", {
        method: "PATCH",
        body: data
    });

    setAuthSession({ user: payload.data });

    return payload.data;
}

// Список проектов распаковываем до массива, потому что карточкам не нужен wrapper.
export async function listProjects(signal) {
    const payload = await request("/api/projects", { signal });

    return payload.data;
}

// Полный проект возвращает schema_code и schema_json для editor.
export async function getProject(projectId, signal) {
    return request(`/api/projects/${projectId}`, { signal });
}

// Создание проекта может отправить только метаданные или стартовый snapshot.
export async function createProject(project) {
    return request("/api/projects", {
        method: "POST",
        body: project
    });
}

// Editor обычно делает PATCH, но форма настроек может переиспользовать helper.
export async function updateProject(projectId, project, method = "PATCH") {
    return request(`/api/projects/${projectId}`, {
        method,
        body: project
    });
}

// DELETE возвращает короткое message, его и отдаем вызывающей странице.
export async function deleteProject(projectId) {
    const payload = await request(`/api/projects/${projectId}`, {
        method: "DELETE"
    });

    return payload.message;
}

// Участник удаляет у себя командный проект отдельным endpoint.
export async function leaveProject(projectId) {
    const payload = await request(`/api/projects/${projectId}/leave`, {
        method: "DELETE"
    });

    return payload.message;
}

// Владелец исключает конкретного участника из team списка.
export async function removeProjectViewer(projectId, viewerId) {
    const payload = await request(`/api/projects/${projectId}/team/${viewerId}`, {
        method: "DELETE"
    });

    return payload.message;
}

// Права участника меняются отдельно от публичной ссылки проекта.
export async function updateProjectViewerPermission(projectId, viewerId, permission) {
    return request(`/api/projects/${projectId}/team/${viewerId}`, {
        method: "PATCH",
        body: { permission }
    });
}

// Duplicate создает новый проект владельца на основе существующего snapshot.
export async function duplicateProject(projectId) {
    return request(`/api/projects/${projectId}/duplicate`, {
        method: "POST"
    });
}

// Если новое значение не передано, backend сам переключит текущее состояние.
export async function toggleProjectFavorite(projectId, isFavorite) {
    return request(`/api/projects/${projectId}/favorite`, {
        method: "PATCH",
        body: isFavorite === undefined ? {} : { is_favorite: isFavorite }
    });
}

// last_opened_at нужен сортировке и отметке недавних проектов.
export async function markProjectOpened(projectId) {
    return request(`/api/projects/${projectId}/last-opened`, {
        method: "PATCH"
    });
}

// Настройки шаринга доступны владельцу из редактора и страницы проектов.
export async function getProjectShare(projectId, signal) {
    return request(`/api/projects/${projectId}/share`, { signal });
}

// Access mode, password и permission публичной ссылки обновляются одним payload.
export async function updateProjectShare(projectId, data) {
    return request(`/api/projects/${projectId}/share`, {
        method: "PATCH",
        body: data
    });
}

// Shared route может увидеть авторизованного зрителя и прикрепить его к проекту.
export async function getSharedProject(token, signal) {
    return request(`/api/shared-projects/${token}`, {
        auth: true,
        signal
    });
}

// Пароль ссылки проверяется отдельно до показа закрытой схемы.
export async function unlockSharedProject(token, password) {
    return request(`/api/shared-projects/${token}/unlock`, {
        method: "POST",
        auth: true,
        body: { password }
    });
}

// Для редактируемой ссылки пароль повторно прикладываем при сохранении правок.
export async function updateSharedProject(token, project, password = "") {
    return request(`/api/shared-projects/${token}`, {
        method: "PATCH",
        auth: true,
        body: password ? { ...project, password } : project
    });
}

// UI AI-панели получает только полезную часть `data`, без HTTP envelope.
export async function askSchemaAssistant(payload) {
    const response = await request("/api/ai/schema-assistant", {
        method: "POST",
        body: payload
    });

    return response.data;
}

// Network TypeError превращаем в подсказку про Laravel/Vite proxy.
export function getApiErrorMessage(error, fallback = "Unexpected error.") {
    if (error instanceof TypeError) {
        return "Не удалось подключиться к API. Проверьте, что Laravel запущен на http://127.0.0.1:8000 и работает Vite proxy.";
    }

    return error instanceof Error && error.message ? error.message : fallback;
}
