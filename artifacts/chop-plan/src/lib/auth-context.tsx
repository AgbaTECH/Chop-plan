import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Role = 'user' | 'vendor' | 'admin' | null;

interface AuthContextType {
  token: string | null;
  role: Role;
  name: string | null;
  login: (token: string, role: Role, name?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('chop_plan_token');
    const storedRole = localStorage.getItem('chop_plan_role') as Role;
    const storedName = localStorage.getItem('chop_plan_name');
    
    if (storedToken) {
      setToken(storedToken);
      setRole(storedRole);
      if (storedName) setName(storedName);
    }
  }, []);

  const login = (newToken: string, newRole: Role, newName?: string) => {
    setToken(newToken);
    setRole(newRole);
    if (newName) setName(newName);
    
    localStorage.setItem('chop_plan_token', newToken);
    if (newRole) localStorage.setItem('chop_plan_role', newRole);
    if (newName) localStorage.setItem('chop_plan_name', newName);
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setName(null);
    
    localStorage.removeItem('chop_plan_token');
    localStorage.removeItem('chop_plan_role');
    localStorage.removeItem('chop_plan_name');
  };

  return (
    <AuthContext.Provider value={{ token, role, name, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
