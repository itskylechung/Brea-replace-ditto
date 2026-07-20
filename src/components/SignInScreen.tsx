import { useState } from "react";
import { BreaMark } from "./BreaMark";

export function SignInScreen({
  linkedinEnabled,
  configFailed,
  backendError,
  onSignIn,
  onRetry,
}: {
  linkedinEnabled: boolean;
  configFailed: boolean;
  backendError: string | null;
  onSignIn: () => Promise<void>;
  onRetry: () => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSignIn();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "LinkedIn sign-in could not start.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative grid min-h-screen overflow-hidden bg-cream px-5 py-8 text-ink sm:px-8">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
        <BreaMark />
        <span className="rounded-full border border-forest/15 bg-paper/60 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-forest">
          Private by default
        </span>
      </header>

      <main className="relative z-[1] mx-auto grid w-full max-w-6xl items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.75fr]">
        <section>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-coral">LinkedIn sign-in</p>
          <h1 className="mt-4 max-w-3xl text-[clamp(3rem,8vw,6.4rem)] font-semibold leading-[0.9] tracking-[-0.075em]">
            Meet the right people, nearby.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-moss">
            Start with your verified LinkedIn identity, then choose what Brea can show to other members. Your precise location stays private.
          </p>
        </section>

        <section className="rounded-[2rem] border border-paper/80 bg-paper/70 p-7 shadow-card backdrop-blur-sm sm:p-9" aria-labelledby="signin-title">
          <h2 id="signin-title" className="text-2xl font-bold tracking-[-0.04em]">Create your Brea profile</h2>
          <p className="mt-3 text-sm leading-relaxed text-moss">
            LinkedIn provides your name, email address, and profile photo. Brea creates a private profile that you review before becoming discoverable.
          </p>

          <button
            type="button"
            disabled={(!linkedinEnabled && !configFailed) || isSubmitting}
            onClick={() => void signIn()}
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-[#0a66c2] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#084f96] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="grid h-6 w-6 place-items-center rounded bg-white text-sm font-black text-[#0a66c2]" aria-hidden="true">in</span>
            {isSubmitting ? "Opening LinkedIn…" : "Continue with LinkedIn"}
          </button>

          {configFailed && (
            <div className="mt-4 rounded-2xl border border-[#d8aa4d]/30 bg-[#fff5d8] px-4 py-3 text-sm leading-relaxed text-[#715719]" role="status">
              <p>
                We're having trouble reaching the backend right now. You can try signing in anyway, or retry.
              </p>
              <button
                type="button"
                onClick={() => void onRetry()}
                className="mt-2 font-bold underline underline-offset-2 transition hover:text-[#5a4514]"
              >
                Retry
              </button>
            </div>
          )}
          {!linkedinEnabled && !configFailed && (
            <p className="mt-4 rounded-2xl border border-[#d8aa4d]/30 bg-[#fff5d8] px-4 py-3 text-sm leading-relaxed text-[#715719]" role="status">
              LinkedIn is not enabled in this InsForge project yet. Add the LinkedIn OAuth client ID and secret in InsForge, then reload this page.
            </p>
          )}
          {(error || backendError) && (
            <p className="mt-4 text-sm text-[#a44734]" role="alert">{error ?? backendError}</p>
          )}

          <p className="mt-6 border-t border-ink/10 pt-5 text-xs leading-relaxed text-moss">
            Brea does not scrape LinkedIn or import your connections. You can hide your profile or sign out at any time.
          </p>
        </section>
      </main>
    </div>
  );
}
