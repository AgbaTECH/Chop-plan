import { createContext, useContext, useState, ReactNode } from 'react';

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
  // Read straight from localStorage during the initial render (not in a
  // useEffect) so `isAuthenticated` is correct on the very first render
  // after a page refresh. Previously this state started as null/false and
  // was only populated a tick later in an effect, which meant any guard
  // that checked isAuthenticated on mount (e.g. VendorLayout, AdminLayout)
  // would see "logged out" for one render and redirect to the login page,
  // even though a valid token existed in storage the whole time.
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('chop_plan_token'));
  const [role, setRole] = useState<Role>(() => (localStorage.getItem('chop_plan_role') as Role) ?? null);
  const [name, setName] = useState<string | null>(() => localStorage.getItem('chop_plan_name'));

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
