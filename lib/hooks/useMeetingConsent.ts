import { useCallback, useEffect, useState } from "react";

import { readItem, writeItem } from "@/lib/storage";

/**
 * Consent state for AI transcription / insight generation in a
 * Jitsi room. Per-meeting because a user might agree to recording
 * for one meeting and not another — we don't want a single global
 * "always consent" toggle that bypasses notice next time.
 *
 *   - "pending"   — joined but hasn't been asked yet
 *   - "consented" — explicit yes
 *   - "declined"  — explicit no
 *
 * Stored under `aiqlick:meeting-consent:<roomName>` so re-joining
 * the same room within the same browser session doesn't re-prompt.
 * A fresh tab / cleared storage re-prompts — that matches the
 * legal expectation that consent is given at the start of each
 * session, not "remembered forever."
 *
 * **No mic-mute enforcement.** This used to force-mute users who
 * declined, and re-mute them whenever they tried to unmute. In
 * practice that silenced participants whose audio was needed for
 * the actual meeting — most painfully, candidates in interviews
 * whose voice never reached Jigasi. The transcript came out near
 * empty and the AI insights produced garbage from 100 chars of
 * mic-check chatter.
 *
 * Now the hook only records the consent choice (for compliance /
 * audit trail) and exposes it via `status`. The modal still shows;
 * declining still writes "declined" to storage; but the user's
 * mic state is left entirely under their own control.
 */
export type ConsentStatus = "pending" | "consented" | "declined";

const STORAGE_PREFIX = "aiqlick:meeting-consent:";

interface UseMeetingConsentArgs {
  roomName: string | null | undefined;
  /** From `useJitsi().state.isJoined`. */
  isJoined: boolean;
}

export function useMeetingConsent({
  roomName,
  isJoined,
}: UseMeetingConsentArgs) {
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const storageKey = roomName ? `${STORAGE_PREFIX}${roomName}` : null;

  // Hydrate from storage on join.
  useEffect(() => {
    if (!isJoined || !storageKey) return;
    let cancelled = false;
    (async () => {
      const saved = await readItem(storageKey);
      if (cancelled) return;
      if (saved === "consented" || saved === "declined") {
        setStatus(saved);
      } else {
        setStatus("pending");
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isJoined, storageKey]);

  const setConsent = useCallback(
    async (consent: boolean) => {
      const next: ConsentStatus = consent ? "consented" : "declined";
      setStatus(next);
      if (storageKey) {
        await writeItem(storageKey, next);
      }
    },
    [storageKey],
  );

  /** Re-open the consent prompt (e.g., the user wants to revise
   * their earlier answer after the meeting has started). */
  const reopenPrompt = useCallback(() => {
    setStatus("pending");
  }, []);

  const showModal = isJoined && hydrated && status === "pending";

  return {
    status,
    showModal,
    setConsent,
    reopenPrompt,
  };
}
