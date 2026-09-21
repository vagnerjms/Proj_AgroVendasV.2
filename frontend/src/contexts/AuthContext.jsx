import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const SESSION_KEY = 'agrovenda_user_v2';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function getCookie(name) {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  } catch (e) {}
  return null;
}

function setCookie(name, value, days) {
  try {
    const expires = days ? `; max-age=${days * 24 * 60 * 60}` : '';
    document.cookie = `${name}=${encodeURIComponent(value || '')}${expires}; path=/; SameSite=Lax`;
  } catch (e) {}
}

function eraseCookie(name) {
  try {
    document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
  } catch (e) {}
}

function getStoredUser() {
  try {
    // 1. Try LocalStorage (Permanent / 1-year)
    const localRaw = localStorage.getItem(SESSION_KEY) || localStorage.getItem('agrovenda_user');
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (parsed) {
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem('agrovenda_user');
        } else {
          return parsed.user || (parsed.id ? parsed : null);
        }
      }
    }

    // 2. Try SessionStorage (Transient browser session)
    const sessionRaw = sessionStorage.getItem(SESSION_KEY) || sessionStorage.getItem('agrovenda_user');
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (parsed) return parsed.user || (parsed.id ? parsed : null);
    }

    // 3. Try Cookie Fallback
    const cookieRaw = getCookie('agrovenda_session');
    if (cookieRaw) {
      const parsed = JSON.parse(cookieRaw);
      if (parsed) return parsed.user || (parsed.id ? parsed : null);
    }
  } catch (err) {
    console.warn('Erro ao recuperar sessão:', err);
  }
  return null;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  useEffect(() => {
    try {
      const token = localStorage.getItem('agrovenda_token');
      if (token) {
        setCookie('agrovenda_token', token, 7);
      }
    } catch (e) {}
  }, []);

  const login = (user, rememberMe = true) => {
    setCurrentUser(user);
    try {
      const sessionPayload = {
        user,
        rememberMe,
        savedAt: Date.now(),
        expiresAt: rememberMe ? (Date.now() + ONE_YEAR_MS) : null
      };
      const serialized = JSON.stringify(sessionPayload);

      if (rememberMe) {
        localStorage.setItem(SESSION_KEY, serialized);
        localStorage.setItem('agrovenda_user', JSON.stringify(user));
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem('agrovenda_user');
        setCookie('agrovenda_session', serialized, 365);
      } else {
        sessionStorage.setItem(SESSION_KEY, serialized);
        sessionStorage.setItem('agrovenda_user', JSON.stringify(user));
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('agrovenda_user');
        eraseCookie('agrovenda_session');
      }
    } catch (err) {
      console.warn('Erro ao persistir sessão:', err);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('agrovenda_user');
      localStorage.removeItem('agrovenda_token');
      localStorage.removeItem('token');
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem('agrovenda_user');
      eraseCookie('agrovenda_session');
      eraseCookie('agrovenda_token');
    } catch (err) {
      console.warn('Erro ao limpar sessão:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, login, logout, isAuthenticated: !!currentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
