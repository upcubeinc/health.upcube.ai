import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  role: string; // Add role property
  // Add other user properties as needed
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (userId: string, userEmail: string, token: string | null, userRole: string, authType: 'oidc' | 'password') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const authType = localStorage.getItem('authType');
        const token = localStorage.getItem('token');

        let response;
        if (authType === 'password' && token) {
          response = await fetch('/api/auth/user', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        } else {
          response = await fetch('/openid/api/me', { credentials: 'include' });
        }

        if (response.ok) {
          const userData = await response.json();
          if (userData && userData.userId && userData.email) {
            const role = userData.role || localStorage.getItem('userRole') || 'user';
            setUser({ id: userData.userId, email: userData.email, role: role });
          } else {
            setUser(null);
            if (authType === 'password') {
              localStorage.removeItem('userId');
              localStorage.removeItem('userEmail');
              localStorage.removeItem('token');
              localStorage.removeItem('userRole');
              localStorage.removeItem('authType');
            }
          }
        } else {
          setUser(null);
          if (authType === 'password') {
            localStorage.removeItem('userId');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            localStorage.removeItem('authType');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setUser(null);
        const authType = localStorage.getItem('authType');
        if (authType === 'password') {
          localStorage.removeItem('userId');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('authType');
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signOut = async () => {
    try {
      // For OIDC users, the session is managed by cookies, so no token is sent.
      // For JWT users, the token is sent.
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({}),
      });

      if (response.ok) {
        // Clear all local storage items related to authentication
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        setUser(null);
      } else {
        const errorData = await response.json();
        console.error('Logout failed on server:', errorData);
        // Even if server logout fails, clear client-side state to avoid inconsistent state
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('authType'); // Clear authType on sign out
        setUser(null);
      }
    } catch (error) {
      console.error('Network error during logout:', error);
    }
  };

  const signIn = (userId: string, userEmail: string, token: string | null, userRole: string, authType: 'oidc' | 'password') => {
    if (token) {
      localStorage.setItem('token', token);
    }
    localStorage.setItem('userId', userId);
    localStorage.setItem('userEmail', userEmail);
    localStorage.setItem('userRole', userRole);
    localStorage.setItem('authType', authType); // Store authType on sign in
    setUser({ id: userId, email: userEmail, role: userRole });
  };

  const value = {
    user,
    loading,
    signOut,
    signIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
