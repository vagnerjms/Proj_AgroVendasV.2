// Centralized API Client for AgroVenda V2

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const buildUrl = (endpoint, params) => {
  if (!params) return endpoint;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      searchParams.append(key, value);
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
};

const request = async (endpoint, options = {}) => {
  const isFormData = options.body instanceof FormData;
  const token = typeof window !== 'undefined' ? localStorage.getItem('agrovenda_token') : null;
  const headers = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  const response = await fetch(endpoint, config);

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => null);
  }

  if (!response.ok) {
    const errorMsg = (data && typeof data === 'object' && (data.error || data.message))
      ? (data.error || data.message)
      : `Erro na requisição (${response.status}): ${response.statusText}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data;
};

export const api = {
  get: (endpoint, params) => request(buildUrl(endpoint, params), { method: 'GET' }),
  
  post: (endpoint, body) => request(endpoint, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  
  put: (endpoint, body) => request(endpoint, {
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),

  upload: (endpoint, formData) => request(endpoint, {
    method: 'POST',
    body: formData
  })
};

export { ApiError };
