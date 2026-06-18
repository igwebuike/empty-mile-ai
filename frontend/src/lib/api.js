export const API = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://empty-mile-ai-api.onrender.com').replace(/\/$/, '');
export async function api(path, options={}) {
  const res = await fetch(`${API}${path}`, {
    headers: {'Content-Type': 'application/json', ...(options.headers||{})},
    ...options
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}
