const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token')

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    throw new Error(message || `HTTP ${response.status}`)
  }

  return response
}
