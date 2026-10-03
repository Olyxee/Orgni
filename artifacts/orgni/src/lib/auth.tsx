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
  resendVerification as apiResendVerification,
  verifyEmail as apiVerifyEmail,
  type Session,
} from "./api";

const STORAGE_KEY = "orgni.session";
const PENDING_KEY = "orgni.pendingVerification";

interface AuthValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    organization: string,
    password: string,
    confirmation: string,
  ) => Promise<"verified" | "pending">;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  /** Address awaiting confirmation, so the UI can offer a resend after a reload. */
  pendingVerification: string | null;
  clearPendingVerification: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function readPending(): string | null {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

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
  const [pendingVerification, setPendingVerification] = useState<string | null>(readPending);

  const adopt = useCallback((s: Session) => {
    localStorage.removeItem(PENDING_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setPendingVerification(null);
    setSession(s);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      adopt(await apiLogin(email, password));
    },
    [adopt],
  );

  const signup = useCallback(
    async (
      email: string,
      organization: string,
      password: string,
      confirmation: string,
    ): Promise<"verified" | "pending"> => {
      const result = await apiRegister({
        email,
        organization,
        password,
        confirmPassword: confirmation,
      });
      if (result.pending) {
        // No session yet: keep the address so the page can offer a resend.
        localStorage.setItem(PENDING_KEY, result.email);
        setPendingVerification(result.email);
        return "pending";
      }
      adopt(result.session);
      return "verified";
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

  // Confirmation also returns a session, landing the user in onboarding.
  const verifyEmail = useCallback(
    async (token: string) => {
      adopt(await apiVerifyEmail(token));
    },
    [adopt],
  );

  const resendVerification = useCallback(async (email: string) => {
    await apiResendVerification(email);
  }, []);

  const clearPendingVerification = useCallback(() => {
    localStorage.removeItem(PENDING_KEY);
    setPendingVerification(null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      login,
      signup,
      requestPasswordReset,
      confirmPasswordReset,
      verifyEmail,
      resendVerification,
      pendingVerification,
      clearPendingVerification,
      logout,
    }),
    [
      session,
      login,
      signup,
      requestPasswordReset,
      confirmPasswordReset,
      verifyEmail,
      resendVerification,
      pendingVerification,
      clearPendingVerification,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
