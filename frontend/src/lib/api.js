function createApiError(message, status, details = {}) {
  return Object.assign(new Error(message), { status, details })
}

async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    csrfToken,
    headers = {},
    signal,
  } = options

  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() }

  if (!response.ok) {
    const validationMessage = payload?.errors
      ? Object.values(payload.errors).flat().filter(Boolean)[0]
      : null
    const message =
      validationMessage ||
      payload?.message ||
      `Request failed with status ${response.status}.`

    throw createApiError(message, response.status, payload)
  }

  return payload
}

export async function fetchSession(signal) {
  const payload = await request('/api/auth/session', { signal })
  return payload.data
}

export async function login(data, csrfToken) {
  const payload = await request('/api/auth/login', {
    method: 'POST',
    body: data,
    csrfToken,
  })

  return payload.data
}

export async function register(data, csrfToken) {
  const payload = await request('/api/auth/register', {
    method: 'POST',
    body: data,
    csrfToken,
  })

  return payload.data
}

export async function logout(csrfToken) {
  const payload = await request('/api/auth/logout', {
    method: 'POST',
    csrfToken,
  })

  return payload.data
}

export async function listProjects() {
  const payload = await request('/api/projects')
  return payload.data
}

export async function createProject(project, csrfToken) {
  const payload = await request('/api/projects', {
    method: 'POST',
    body: project,
    csrfToken,
  })

  return payload.data
}

export async function updateProject(projectId, project, csrfToken) {
  const payload = await request(`/api/projects/${projectId}`, {
    method: 'PUT',
    body: project,
    csrfToken,
  })

  return payload.data
}

export async function deleteProject(projectId, csrfToken) {
  const payload = await request(`/api/projects/${projectId}`, {
    method: 'DELETE',
    csrfToken,
  })

  return payload.message
}

export function getApiErrorMessage(error, fallback = 'Unexpected error.') {
  return error instanceof Error && error.message ? error.message : fallback
}
