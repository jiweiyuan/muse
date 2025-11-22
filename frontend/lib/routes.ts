export const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "")

export const API_ROUTE_MODELS = `${API_BASE}/v1/models`
export const API_ROUTE_MODELS_REFRESH = `${API_BASE}/v1/models/refresh`
export const API_ROUTE_USER_KEY_STATUS = `${API_BASE}/v1/users/keys/status`
export const API_ROUTE_USER_KEYS = `${API_BASE}/v1/users/keys`
export const API_ROUTE_USER_PROVIDERS_CHECK = `${API_BASE}/v1/users/providers/check`
export const API_ROUTE_USER_ME = `${API_BASE}/v1/users/me`
export const API_ROUTE_USER_PREFERENCES = `${API_BASE}/v1/preferences`
export const API_ROUTE_PROJECTS = `${API_BASE}/v1/projects`
