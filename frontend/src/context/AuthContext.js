
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const mockUsers = {
  'benedikt.thomas@smb-ai-solution.com': { id: 1, name: 'Benedikt Thomas', email: 'benedikt.thomas@smb-ai-solution.com', password: 'smb2025_beni!', role: 'admin' },
  'moritz.lange@smb-ai-solution.com': { id: 2, name: 'Moritz Lange', email: 'moritz.lange@smb-ai-solution.com', password: 'smb2025_moritz!', role: 'admin' },
  'simon.lange@smb-ai-solution.com': { id: 3, name: 'Simon Lange', email: 'simon.lange@smb-ai-solution.com', password: 'smb2025_simon!', role: 'admin' },
  'user@example.com': { id: 4, name: 'Test User', email: 'user@example.com', password: 'password', role: 'user' },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('user');
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const foundUser = Object.values(mockUsers).find(u => u.email === email && u.password === password);
        if (foundUser) {
          const userToStore = { ...foundUser };
          delete userToStore.password; // Do not store password
          setUser(userToStore);
          localStorage.setItem('user', JSON.stringify(userToStore));
          setLoading(false);
          resolve(userToStore);
        } else {
          setLoading(false);
          reject(new Error('Invalid email or password'));
        }
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = { user, loading, login, logout, isAuthenticated: !!user };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
