import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setApiSessionToken } from "../api/client";
import { AuthResponse, AuthSnapshot, GoogleAuthInput, LoginInput, RegisterInput } from "../types";

const STORAGE_KEY = "autoblog-session-token";

const guestSnapshot: AuthSnapshot = {
  isAuthenticated: false,
  hasActiveSubscription: false,
  user: null,
  subscription: null
};

type AccessContextValue = {
  auth: AuthSnapshot;
  sessionToken: string | null;
  loading: boolean;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  login: (input: LoginInput) => Promise<AuthResponse>;
  loginWithGoogle: (input: GoogleAuthInput) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<AuthSnapshot>;
};

const AccessContext = createContext<AccessContextValue | null>(null);

function readStoredSessionToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

function persistSessionToken(sessionToken: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!sessionToken) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, sessionToken);
}

export function AccessProvider({ children }: PropsWithChildren) {
  const [sessionToken, setSessionToken] = useState<string | null>(() => readStoredSessionToken());
  const [auth, setAuth] = useState<AuthSnapshot>(guestSnapshot);
  const [loading, setLoading] = useState<boolean>(() => Boolean(readStoredSessionToken()));

  async function refreshAuth() {
    if (!sessionToken) {
      setAuth(guestSnapshot);
      return guestSnapshot;
    }

    setApiSessionToken(sessionToken);
    const snapshot = await api.getSession();
    setAuth(snapshot);

    if (!snapshot.user) {
      setSessionToken(null);
      persistSessionToken(null);
      setApiSessionToken(null);
    }

    return snapshot;
  }

  useEffect(() => {
    setApiSessionToken(sessionToken);

    if (!sessionToken) {
      setAuth(guestSnapshot);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const snapshot = await api.getSession();
        if (!cancelled) {
          setAuth(snapshot);
          if (!snapshot.user) {
            setSessionToken(null);
            persistSessionToken(null);
            setApiSessionToken(null);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  const value = useMemo<AccessContextValue>(
    () => ({
      auth,
      sessionToken,
      loading,
      async register(input) {
        const response = await api.register(input);
        setAuth(response.session);
        setSessionToken(response.sessionToken);
        persistSessionToken(response.sessionToken);
        setApiSessionToken(response.sessionToken);
        return response;
      },
      async login(input) {
        const response = await api.login(input);
        setAuth(response.session);
        setSessionToken(response.sessionToken);
        persistSessionToken(response.sessionToken);
        setApiSessionToken(response.sessionToken);
        return response;
      },
      async loginWithGoogle(input) {
        const response = await api.googleLogin(input);
        setAuth(response.session);
        setSessionToken(response.sessionToken);
        persistSessionToken(response.sessionToken);
        setApiSessionToken(response.sessionToken);
        return response;
      },
      async logout() {
        try {
          await api.logout();
        } finally {
          setAuth(guestSnapshot);
          setSessionToken(null);
          persistSessionToken(null);
          setApiSessionToken(null);
        }
      },
      async refreshAuth() {
        return refreshAuth();
      }
    }),
    [auth, sessionToken, loading]
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error("useAccess must be used within an AccessProvider.");
  }

  return context;
}

export const useAuth = useAccess;
