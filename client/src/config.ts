// When VITE_API_URL is set (e.g. in Vercel), use it.
// In local development, empty string lets Vite proxy handle '/api' seamlessly without CORS/host mismatch.
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
