const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function extractErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  const firstField = Object.keys(data)[0];
  if (firstField) {
    const value = data[firstField];
    if (Array.isArray(value) && value.length > 0) {
      const msg = value[0];
      return typeof msg === "string" ? msg : fallback;
    }
    if (typeof value === "string") return value;
  }
  return fallback;
}

function buildUrl(path, params) {
  if (!params) return path;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") usp.append(k, v);
  }
  const qs = usp.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request(path, options = {}) {
  const url = buildUrl(path, options.params);
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = extractErrorMessage(data, `请求失败（${response.status} ${response.statusText}）`);
    throw new Error(message);
  }
  return data;
}

export const api = {
  get: (path, config) => request(path, { ...config }),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
};
