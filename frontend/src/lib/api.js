export const API = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://empty-mile-ai-api.onrender.com').replace(/\/$/, '');

export async function api(path, options={}) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData ? (options.headers || {}) : {'Content-Type': 'application/json', ...(options.headers||{})};
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}
