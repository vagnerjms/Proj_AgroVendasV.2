import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// Universal Fetch Token Interceptor: Automatically attaches JWT Bearer token to all /api/ requests
const originalFetch = window.fetch;
window.fetch = async function (resource, config = {}) {
  let url = typeof resource === 'string' ? resource : (resource?.url || '');
  if (url.startsWith('/api') || url.includes('/api/')) {
    const token = localStorage.getItem('agrovenda_token');
    if (token) {
      config = config || {};
      const headers = new Headers(config.headers || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      config.headers = headers;
    }
  }
  return originalFetch(resource, config);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

