import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { authService } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const params = new URLSearchParams(window.location.search);
    const incomingToken = params.get('token');
    if (incomingToken) {
      localStorage.setItem('sparc_token', incomingToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${incomingToken}`;
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    const token = localStorage.getItem('sparc_token');
    if (token) {
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await authService.getMe();
        setUser(response.data.user);
      } catch (err) {
        // Try to restore from local storage (demo mode)
        const savedUser = localStorage.getItem('sparc_user');
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {
            localStorage.removeItem('sparc_token');
            localStorage.removeItem('sparc_user');
            delete api.defaults.headers.common['Authorization'];
          }
        } else {
          localStorage.removeItem('sparc_token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      setError(null);
      console.log('🔓 Attempting login for:', email);
      
      const response = await authService.login(email, password);
      console.log('✅ Login successful:', response.data);
      
      const { token, user } = response.data;
      
      if (!token || !user) {
        throw new Error('Server returned invalid response - missing token or user');
      }
      
      localStorage.setItem('sparc_token', token);
      localStorage.setItem('sparc_user', JSON.stringify(user));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return { success: true, user };
    } catch (err) {
      const status = err.response?.status;
      const errorData = err.response?.data;
      
      let message = 'Login failed';
      if (status === 401) {
        message = errorData?.message || 'Invalid email or password';
      } else if (status === 400) {
        message = errorData?.message || 'Missing email or password';
      } else if (status >= 500) {
        message = 'Server error. Check console for details.';
      } else if (err.message) {
        message = err.message;
      }
      
      console.error('❌ Login failed:', {
        status,
        message,
        errorData,
        error: err.message
      });
      
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      console.log('📝 Attempting registration for:', userData.email);
      
      const response = await authService.register(userData);
      console.log('✅ Registration successful:', response.data);
      
      const responseData = response.data;
      if (!responseData.success) {
        throw new Error(responseData.message || 'Registration failed');
      }
      
      const { token, user } = responseData;
      
      if (!token || !user) {
        throw new Error('Server returned incomplete registration response');
      }
      
      localStorage.setItem('sparc_token', token);
      localStorage.setItem('sparc_user', JSON.stringify(user));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return { success: true, user };
    } catch (err) {
      const status = err.response?.status;
      const errorData = err.response?.data;
      
      let message = 'Registration failed';
      if (status === 400) {
        message = errorData?.message || 'Invalid input data';
      } else if (status === 409 || status === 422) {
        message = errorData?.message || 'Email already registered';
      } else if (status >= 500) {
        message = 'Server error. Check server permissions for users.json';
      } else if (err.message) {
        message = err.message;
      }
      
      console.error('❌ Registration failed:', {
        status,
        message,
        errorData,
        error: err.message
      });
      
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('sparc_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
