export async function fetchClient(
  input: RequestInfo,
  init: RequestInit = {}
) {
  const headers = new Headers(init.headers || {})

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "include",
  })
}
