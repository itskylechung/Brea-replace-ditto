import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserSchema } from "@insforge/sdk";
import { getInsforgeClient, hasInsforgeConfig } from "../lib/insforge";

type AuthContextValue = {
  user: UserSchema | null;
  isLoading: boolean;
  linkedinEnabled: boolean;
  configFailed: boolean;
  error: string | null;
  signInWithLinkedIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const BOOTSTRAP_RETRY_DELAY_MS = 1_500;

function messageFrom(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function isSignedOutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { statusCode?: unknown }).statusCode === 401;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [linkedinEnabled, setLinkedinEnabled] = useState(false);
  const [configFailed, setConfigFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!hasInsforgeConfig) {
      setError("The InsForge backend is not configured for this build.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const client = getInsforgeClient();
      const bootstrap = () =>
        Promise.all([client.auth.getCurrentUser(), client.auth.getPublicAuthConfig()]);

      let [sessionResult, configResult] = await bootstrap();

      // The backend can intermittently stall a request past its timeout. A
      // non-401 session error or any config error is treated as transient, so
      // retry both calls once before surfacing the outcome. A bare 401 is the
      // normal signed-out path and needs no retry.
      const shouldRetry =
        (sessionResult.error && !isSignedOutError(sessionResult.error)) ||
        Boolean(configResult.error);
      if (shouldRetry) {
        await wait(BOOTSTRAP_RETRY_DELAY_MS);
        [sessionResult, configResult] = await bootstrap();
      }

      setConfigFailed(Boolean(configResult.error));
      setLinkedinEnabled(
        !configResult.error && (configResult.data?.oAuthProviders?.includes("linkedin") ?? false),
      );

      if (sessionResult.error && !isSignedOutError(sessionResult.error)) {
        throw sessionResult.error;
      }
      setUser(sessionResult.data?.user ?? null);
    } catch (nextError) {
      setUser(null);
      setError(messageFrom(nextError, "We could not restore your session."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) return refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const signInWithLinkedIn = useCallback(async () => {
    setError(null);
    const client = getInsforgeClient();
    const { error: oauthError } = await client.auth.signInWithOAuth("linkedin", {
      redirectTo: window.location.origin,
    });
    if (oauthError) {
      const message = messageFrom(oauthError, "LinkedIn sign-in could not start.");
      setError(message);
      throw new Error(message);
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await getInsforgeClient().auth.signOut();
    if (signOutError) throw signOutError;
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    linkedinEnabled,
    configFailed,
    error,
    signInWithLinkedIn,
    signOut,
    refresh,
  }), [configFailed, error, isLoading, linkedinEnabled, refresh, signInWithLinkedIn, signOut, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
