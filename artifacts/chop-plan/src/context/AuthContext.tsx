import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { setAuthTokenGetter, useGetMe, AuthResponseRole } from "@workspace/api-client-react";

interface AuthState {
  token: string | null;
  role: AuthResponseRole | null;
  name: string | null;
  email: string | null;
  id: number | null;
}

interface AuthContextType extends AuthState {
  login: (token: string, role: AuthResponseRole, name: string, email: string, id: number) => void;
  logoutLocally: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    token: localStorage.getItem("chop_plan_token"),
    role: localStorage.getItem("chop_plan_role") as AuthResponseRole | null,
    name: null,
    email: null,
    id: null,
  });

  // Rehydrate full state using API if token exists
  const { data: me, isLoading, error } = useGetMe({
    query: {
      enabled: !!authState.token,
      retry: false,
    }
  });

  useEffect(() => {
    // Only configure client once at mount
    setAuthTokenGetter(() => localStorage.getItem("chop_plan_token"));
  }, []);

  useEffect(() => {
    if (me) {
      setAuthState(prev => ({
        ...prev,
        role: me.role,
        name: me.name,
        email: me.email,
        id: me.id,
      }));
    } else if (error) {
      // If unauthorized, clear
      logoutLocally();
    }
  }, [me, error]);

  const login = (token: string, role: AuthResponseRole, name: string, email: string, id: number) => {
    localStorage.setItem("chop_plan_token", token);
    localStorage.setItem("chop_plan_role", role);
    setAuthState({ token, role, name, email, id });
  };

  const logoutLocally = () => {
    localStorage.removeItem("chop_plan_token");
    localStorage.removeItem("chop_plan_role");
    setAuthState({ token: null, role: null, name: null, email: null, id: null });
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logoutLocally,
        isAuthenticated: !!authState.token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
