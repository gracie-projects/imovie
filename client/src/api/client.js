import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // send the HttpOnly session cookie
  timeout: 15000,
});

// ---- CSRF: fetch a token once, keep it in memory, send it with every state-changing request ----
let csrfToken = null;
let csrfRequest = null;

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = api
      .get('/auth/csrf-token')
      .then((res) => {
        csrfToken = res.data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }
  return csrfRequest;
}

const SAFE = new Set(['get', 'head', 'options']);

api.interceptors.request.use(async (config) => {
  if (!SAFE.has((config.method || 'get').toLowerCase())) {
    config.headers['X-CSRF-Token'] = await getCsrfToken();
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    // The CSRF cookie can disappear (e.g. cleared cookies); fetch a fresh token and retry once.
    if (response?.status === 403 && response.data?.details?.code === 'CSRF' && config && !config._csrfRetried) {
      csrfToken = null;
      config._csrfRetried = true;
      return api(config);
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (error?.request && !error.response) return 'Cannot reach the IMovies server. Please check that the backend is running.';
  return error?.message || fallback;
}

export default api;
