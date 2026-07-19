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
  error: string | null;
  signInWithLinkedIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFrom(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [linkedinEnabled, setLinkedinEnabled] = useState(false);
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
      const [sessionResult, configResult] = await Promise.all([
        client.auth.getCurrentUser(),
        client.auth.getPublicAuthConfig(),
      ]);

      if (sessionResult.error) throw sessionResult.error;
      setUser(sessionResult.data?.user ?? null);

      if (!configResult.error) {
        setLinkedinEnabled(configResult.data?.oAuthProviders?.includes("linkedin") ?? false);
      }
    } catch (nextError) {
      setUser(null);
      setError(messageFrom(nextError, "We could not restore your session."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
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
    error,
    signInWithLinkedIn,
    signOut,
    refresh,
  }), [error, isLoading, linkedinEnabled, refresh, signInWithLinkedIn, signOut, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
