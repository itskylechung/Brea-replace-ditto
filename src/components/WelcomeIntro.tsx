import { useEffect, useState, type JSX } from "react";
import { BreaMark } from "./BreaMark";

type IntroStep = {
  title: string;
  body: string;
};

const STEPS: IntroStep[] = [
  {
    title: "Search with intent",
    body: "Describe who you're hoping to meet — a skill, an interest, a kind of collaborator. Brea shortlists nearby members and shows why each one fits.",
  },
  {
    title: "Send a lightweight request",
    body: "One tap sends a connection request with your search as context. The other member sees why you reached out — no cold messages.",
  },
  {
    title: "Connect on your terms",
    body: "When someone accepts, you exchange LinkedIn profiles. Declines are silent, and your exact location is never shared.",
  },
];

export function WelcomeIntro({ onDone }: { onDone: () => void }): JSX.Element {
  const [step, setStep] = useState(0);
  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDone();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDone]);

  function advance() {
    if (isLastStep) {
      onDone();
    } else {
      setStep((previous) => previous + 1);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Brea"
      className="hero-sunset fixed inset-0 z-50 flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-4 sm:px-8">
        <BreaMark />
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-3 py-2 text-sm font-medium text-ink-tint transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Skip intro
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="max-w-lg w-full rounded-xl border border-hairline-soft bg-canvas p-8 shadow-card text-center">
          <div key={step} className="motion-safe:transition-opacity motion-safe:duration-300">
            <h2 className="font-editorial text-3xl text-ink">{current.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate">{current.body}</p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2" aria-hidden="true">
            {STEPS.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 w-1.5 rounded-full ${
                  index === step ? "bg-ink" : "bg-hairline-strong"
                }`}
              />
            ))}
          </div>
          <p className="sr-only" aria-live="polite">Step {step + 1} of 3</p>

          <button
            type="button"
            autoFocus
            onClick={advance}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {isLastStep ? "Start exploring" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
