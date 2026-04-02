export const API_URL = "http://localhost:8000";

export async function apiFetch(path: string, token: string, method = "GET", body?: unknown) {
  const tenantId = localStorage.getItem("tenant_id") || "afqa";
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      "X-Tenant-ID": tenantId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("401 Unauthorized");
    let detail = "Erro na API";
    try {
      const data = await response.json();
      detail = data.detail || JSON.stringify(data);
    } catch {
      detail = await response.text();
    }
    throw new Error(detail || "Erro na API");
  }

  if (response.status === 204) return null;
  return response.json();
}

