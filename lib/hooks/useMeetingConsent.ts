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
 *   - "declined"  — explicit no; mute is enforced
 *
 * Stored under `aiqlick:meeting-consent:<roomName>` so re-joining
 * the same room within the same browser session doesn't re-prompt.
 * A fresh tab / cleared storage re-prompts — that matches the
 * legal expectation that consent is given at the start of each
 * session, not "remembered forever."
 */
export type ConsentStatus = "pending" | "consented" | "declined";

const STORAGE_PREFIX = "aiqlick:meeting-consent:";

interface UseMeetingConsentArgs {
  roomName: string | null | undefined;
  /** From `useJitsi().state.isJoined`. */
  isJoined: boolean;
  /** From `useJitsi().state.isAudioMuted`. */
  isAudioMuted: boolean;
  /** From `useJitsi().commands.toggleAudio`. Called when consent is
   * declined and the local user is currently unmuted, to push them
   * back to mute. */
  toggleAudio: () => void;
}

export function useMeetingConsent({
  roomName,
  isJoined,
  isAudioMuted,
  toggleAudio,
}: UseMeetingConsentArgs) {
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // Tracks "we just re-prompted because the user tried to unmute while
  // their stored answer was declined." If they now agree, we'll
  // restore the unmute they originally wanted instead of leaving
  // them silently muted.
  const [reaskFromUnmute, setReaskFromUnmute] = useState(false);

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

  // Declined-state enforcement: if the user toggles their mic on
  // (Jitsi flips isAudioMuted to false), interpret that as a "I want
  // to change my mind" signal — force-mute them immediately so no
  // audio leaks, and re-prompt with the consent modal. They can:
  //   - Agree → we restore the unmute they wanted (see setConsent).
  //   - Decline → status stays declined, mic stays muted.
  // toggleAudio is a toggle (not a setter), so we only fire it when
  // they're currently unmuted.
  useEffect(() => {
    if (status === "declined" && !isAudioMuted) {
      toggleAudio();
      setReaskFromUnmute(true);
      setStatus("pending");
    }
  }, [status, isAudioMuted, toggleAudio]);

  const setConsent = useCallback(
    async (consent: boolean) => {
      const next: ConsentStatus = consent ? "consented" : "declined";
      setStatus(next);
      if (storageKey) {
        await writeItem(storageKey, next);
      }
      // If we got here from an unmute-attempt re-prompt and the user
      // now agrees, restore the unmute they were trying to do. Their
      // mic is currently force-muted because of the re-ask flow.
      if (reaskFromUnmute && consent) {
        toggleAudio();
      }
      setReaskFromUnmute(false);
    },
    [storageKey, reaskFromUnmute, toggleAudio],
  );

  /** Re-open the consent prompt (used by the "Change my mind" link). */
  const reopenPrompt = useCallback(() => {
    setReaskFromUnmute(false);
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
