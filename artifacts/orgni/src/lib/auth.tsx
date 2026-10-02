/**
 * Auth context for the web console.
 *
 * Holds the session (token + principal) and persists it in localStorage so a
 * refresh keeps you logged in. `useAuth` is the single source of truth for
 * "am I logged in / who am I".
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  confirmPasswordReset as apiConfirmPasswordReset,
  login as apiLogin,
  register as apiRegister,
  requestPasswordReset as apiRequestPasswordReset,
  type Session,
} from "./api";

const STORAGE_KEY = "orgni.session";

interface AuthValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, organization: string, password: string, confirmation: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession);

  const adopt = useCallback((s: Session) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      adopt(await apiLogin(email, password));
    },
    [adopt],
  );

  const signup = useCallback(
    async (email: string, organization: string, password: string, confirmation: string) => {
      adopt(await apiRegister({ email, organization, password, confirmPassword: confirmation }));
    },
    [adopt],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    await apiRequestPasswordReset(email);
  }, []);

  // A completed reset hands back a session, so adopt it and skip the sign-in form.
  const confirmPasswordReset = useCallback(
    async (token: string, password: string) => {
      adopt(await apiConfirmPasswordReset(token, password));
    },
    [adopt],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, login, signup, requestPasswordReset, confirmPasswordReset, logout }),
    [session, login, signup, requestPasswordReset, confirmPasswordReset, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
