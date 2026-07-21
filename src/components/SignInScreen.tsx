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
    <div className="hero-sunset flex min-h-screen flex-col text-ink">
      <header className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-4 sm:px-8">
        <BreaMark />
        <span className="rounded-full bg-canvas/70 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-ink">
          Private by default
        </span>
      </header>

      <main className="mx-auto grid w-full max-w-[1280px] flex-1 items-center gap-12 px-4 py-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="max-w-2xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-tint">
            LinkedIn sign-in
          </p>
          <h1 className="mt-4 font-editorial text-[clamp(3rem,7vw,5.25rem)] font-normal leading-[1.03] tracking-[-0.025em] text-ink">
            Meet the right people, nearby.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-ink-tint sm:text-lg">
            Start with your verified LinkedIn identity, then choose what Brea can show to other
            members. Your precise location stays private.
          </p>
        </section>

        <section
          className="w-full max-w-md rounded-xl border border-hairline-soft bg-canvas p-7 shadow-card sm:p-9"
          aria-labelledby="signin-title"
        >
          <h2 id="signin-title" className="font-editorial text-3xl font-normal tracking-[-0.02em] text-ink">
            Create your Brea profile
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate">
            LinkedIn provides your name, email address, and profile photo. Brea creates a private
            profile that you review before becoming discoverable.
          </p>

          <button
            type="button"
            disabled={(!linkedinEnabled && !configFailed) || isSubmitting}
            onClick={() => void signIn()}
            className="mt-7 flex min-h-11 w-full items-center justify-center gap-3 rounded-lg bg-[#0a66c2] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#084f96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="grid h-6 w-6 place-items-center rounded bg-white text-sm font-black text-[#0a66c2]" aria-hidden="true">in</span>
            {isSubmitting ? "Opening LinkedIn…" : "Continue with LinkedIn"}
          </button>

          {configFailed && (
            <div className="mt-4 rounded-lg border border-beige bg-cream-light px-4 py-3 text-sm leading-6 text-slate" role="status">
              <p>
                We're having trouble reaching the backend right now. You can try signing in anyway,
                or retry.
              </p>
              <button
                type="button"
                onClick={() => void onRetry()}
                className="mt-2 font-medium text-ink underline underline-offset-2 transition hover:text-charcoal"
              >
                Retry
              </button>
            </div>
          )}
          {!linkedinEnabled && !configFailed && (
            <p className="mt-4 rounded-lg border border-beige bg-cream-light px-4 py-3 text-sm leading-6 text-slate" role="status">
              LinkedIn is not enabled in this InsForge project yet. Add the LinkedIn OAuth client ID
              and secret in InsForge, then reload this page.
            </p>
          )}
          {(error || backendError) && (
            <p className="mt-4 text-sm text-signal" role="alert">{error ?? backendError}</p>
          )}

          <p className="mt-6 border-t border-hairline-soft pt-5 text-xs leading-5 text-steel">
            Brea does not scrape LinkedIn or import your connections. You can hide your profile or
            sign out at any time.
          </p>
        </section>
      </main>
    </div>
  );
}
