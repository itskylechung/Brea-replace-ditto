import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  fetchModerationQueue,
  resolveModerationReport,
  type ModerationQueue,
} from "../lib/api";
import { BreaMark } from "./BreaMark";
import { SignInScreen } from "./SignInScreen";

function when(iso: string): string {
  return new Date(iso).toLocaleString();
}

// Minimal admin view over profile_reports / profile_blocks (issue #68).
// Access is enforced server-side by the moderation-console function.
export function ModerationConsole() {
  const auth = useAuth();
  const [queue, setQueue] = useState<ModerationQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchModerationQueue();
      setQueue(next);
      setError(null);
    } catch (loadError) {
      setQueue(null);
      setError(loadError instanceof Error ? loadError.message : "The queue could not be loaded.");
    }
  }, []);

  useEffect(() => {
    if (!auth.user) return;
    void Promise.resolve().then(load);
  }, [auth.user, load]);

  if (auth.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream text-ink" role="status">
        <BreaMark />
      </div>
    );
  }

  if (!auth.user) {
    return (
      <SignInScreen
        linkedinEnabled={auth.linkedinEnabled}
        configFailed={auth.configFailed}
        backendError={auth.error}
        onSignIn={auth.signInWithLinkedIn}
        onRetry={auth.refresh}
      />
    );
  }

  async function act(reportId: string, resolution: "resolved" | "dismissed", hideProfile: boolean) {
    setBusyReportId(reportId);
    setError(null);
    try {
      await resolveModerationReport({ reportId, resolution, hideProfile });
      await load();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "The report could not be updated.",
      );
    } finally {
      setBusyReportId(null);
    }
  }

  return (
    <div className="min-h-screen bg-cream px-5 py-10 text-ink">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <BreaMark />
            <h1 className="mt-4 font-editorial text-3xl">Moderation console</h1>
            <p className="mt-1 text-sm text-steel">
              Open reports and recent blocks. Signed in as {auth.user.email}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-hairline-strong px-4 py-2 text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        {error && <p className="mt-6 rounded-lg bg-white p-4 text-sm text-signal">{error}</p>}

        <h2 className="mt-8 text-lg font-semibold">
          Open reports {queue ? `(${queue.reports.length})` : ""}
        </h2>
        {queue && queue.reports.length === 0 && (
          <p className="mt-2 text-sm text-steel">The report queue is empty.</p>
        )}
        <ul className="mt-3 space-y-3">
          {queue?.reports.map((report) => (
            <li key={report.id} className="rounded-xl border border-hairline-soft bg-canvas p-5 shadow-card">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm">
                  <span className="font-semibold uppercase">{report.reason}</span>
                  {" · "}
                  <span className="font-medium">{report.reported?.name ?? "Deleted profile"}</span>
                  {report.reported && !report.reported.isDiscoverable && (
                    <span className="ml-2 rounded bg-ink px-1.5 py-0.5 text-xs text-white">hidden</span>
                  )}
                </p>
                <p className="text-xs text-steel">{when(report.createdAt)}</p>
              </div>
              <p className="mt-1 text-xs text-steel">
                Reported by {report.reporter?.name ?? "a deleted profile"}
                {report.reported?.headline ? ` · ${report.reported.headline}` : ""}
              </p>
              {report.details && <p className="mt-2 text-sm leading-6">{report.details}</p>}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={busyReportId === report.id}
                  onClick={() => void act(report.id, "resolved", true)}
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Hide profile & resolve
                </button>
                <button
                  type="button"
                  disabled={busyReportId === report.id}
                  onClick={() => void act(report.id, "resolved", false)}
                  className="rounded-lg border border-hairline-strong px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Resolve
                </button>
                <button
                  type="button"
                  disabled={busyReportId === report.id}
                  onClick={() => void act(report.id, "dismissed", false)}
                  className="rounded-lg border border-hairline-strong px-4 py-2 text-sm font-medium text-steel disabled:opacity-50"
                >
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-lg font-semibold">
          Recent blocks {queue ? `(${queue.blocks.length})` : ""}
        </h2>
        {queue && queue.blocks.length === 0 && (
          <p className="mt-2 text-sm text-steel">No blocks recorded.</p>
        )}
        <ul className="mt-3 space-y-2">
          {queue?.blocks.map((block) => (
            <li key={block.id} className="rounded-lg border border-hairline-soft bg-canvas px-4 py-3 text-sm">
              <span className="font-medium">{block.blocker?.name ?? "Deleted profile"}</span>
              {" blocked "}
              <span className="font-medium">{block.blocked?.name ?? "a deleted profile"}</span>
              <span className="ml-2 text-xs text-steel">{when(block.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
