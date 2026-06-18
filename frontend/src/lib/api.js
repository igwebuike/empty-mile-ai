export const API = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://empty-mile-ai-api.onrender.com').replace(/\/$/, '');

export async function api(path, options={}) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData ? (options.headers || {}) : {'Content-Type': 'application/json', ...(options.headers||{})};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 45000);
  try {
    const res = await fetch(`${API}${path}`, {...options, headers, mode: 'cors', signal: controller.signal});
    if (!res.ok) {
      const detail = await res.text().catch(()=>res.statusText);
      throw new Error(detail || `${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Request timed out calling ${API}${path}`);
    if (err instanceof TypeError) throw new Error(`Network/CORS fetch failed calling ${API}${path}. Confirm backend is live and CORS_ORIGINS includes your frontend URL or *.`);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
