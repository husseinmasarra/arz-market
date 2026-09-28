import React, { createContext, useState, useEffect, useContext } from 'react';
import { useApp } from './AppContext';

const AuthContext = createContext();

function safeGetItem(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch (e) {
    return fallback;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
}

function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}

export const AuthProvider = ({ children }) => {
  const { apiBase } = useApp();
  const [token, setToken] = useState(() => safeGetItem('token', null));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authToken) => {
    try {
      const res = await fetch(`${apiBase}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token invalid or expired
        logout();
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_ar || data.error_en || 'Login failed');
    }

    setToken(data.token);
    setUser(data.user);
    safeSetItem('token', data.token);
    return data;
  };

  const register = async (username, password, fullName, phone, email) => {
    const res = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, full_name: fullName, phone, email })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_ar || data.error_en || 'Registration failed');
    }

    if (data.token) {
      setToken(data.token);
      setUser(data.user);
      safeSetItem('token', data.token);
    }

    return data;
  };

  const loginWithGoogle = async (googlePayload) => {
    const body = typeof googlePayload === 'string' ? { credential: googlePayload } : googlePayload;
    const res = await fetch(`${apiBase}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_ar || data.error_en || 'Google authentication failed');
    }

    setToken(data.token);
    setUser(data.user);
    safeSetItem('token', data.token);
    return data;
  };

  const loginWithApple = async (applePayload) => {
    const res = await fetch(`${apiBase}/auth/apple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applePayload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_ar || data.error_en || 'Apple authentication failed');
    }

    setToken(data.token);
    setUser(data.user);
    safeSetItem('token', data.token);
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    safeRemoveItem('token');
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin has all permissions
    return user.permissions && user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      loading,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      logout,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
