/**
 * Loads the Jitsi IFrame API external script and resolves with the
 * `JitsiMeetExternalAPI` constructor.
 *
 * The script comes from the deployed Jitsi domain (book.aiqlick.com)
 * — that's the same backend our iframe will join, and serving the
 * loader from there guarantees version parity with the conferencing
 * infra. No vendoring; no version drift.
 */

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiMeetExternalAPIConstructor;
  }
}

export type JitsiMeetExternalAPIConstructor = new (
  domain: string,
  options: JitsiOptions,
) => JitsiMeetExternalAPIInstance;

export interface JitsiOptions {
  roomName: string;
  parentNode: HTMLElement;
  width?: string | number;
  height?: string | number;
  jwt?: string;
  userInfo?: {
    displayName?: string;
    email?: string;
  };
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
}

export interface JitsiMeetExternalAPIInstance {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  addListener: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  getNumberOfParticipants: () => number;
  getParticipantsInfo: () => Array<{ participantId: string; displayName?: string }>;
  isAudioMuted: () => Promise<boolean>;
  isVideoMuted: () => Promise<boolean>;
}

/**
 * Default domain the iframe loads from. Override at runtime via
 * `?domain=...` in the page URL if you ever need to point local dev
 * at a different Jitsi backend.
 */
export const DEFAULT_JITSI_DOMAIN =
  import.meta.env.VITE_JITSI_DOMAIN ?? "book.aiqlick.com";

let loaderPromise: Promise<JitsiMeetExternalAPIConstructor> | null = null;

export function loadJitsiExternalApi(
  domain: string = DEFAULT_JITSI_DOMAIN,
): Promise<JitsiMeetExternalAPIConstructor> {
  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve(window.JitsiMeetExternalAPI);
  }
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => {
      if (window.JitsiMeetExternalAPI) {
        resolve(window.JitsiMeetExternalAPI);
      } else {
        reject(
          new Error("external_api.js loaded but JitsiMeetExternalAPI is undefined"),
        );
      }
    };
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error(`Failed to load Jitsi external_api.js from ${domain}`));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}
