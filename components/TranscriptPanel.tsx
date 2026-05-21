import { useEffect, useRef } from "react";
import { Platform, Pressable } from "react-native";
import type { ScrollView as RNScrollView } from "react-native";
import { Download, X } from "@tamagui/lucide-icons";
import { ScrollView, Text, XStack, YStack } from "tamagui";

import type { JitsiState, TranscriptChunk } from "@/hooks/jitsi-types";
import { aiqlickTokens } from "@/tamagui.config";

interface Props {
  state: JitsiState;
  onClose: () => void;
  /**
   * Suggested filename (without extension) when downloading. Falls back
   * to a timestamped name so the file is still uniquely identifiable
   * when no meeting subject is available.
   */
  filenameBase?: string;
}

/**
 * Right-rail live transcript. Renders chunks as they stream from Jigasi
 * via the iframe API's `transcriptionChunkReceived` event. Partial
 * (stable/unstable) chunks update in place; final chunks lock in. The
 * download button serializes the current list to a plain-text file with
 * timestamps + speaker labels.
 */
export default function TranscriptPanel({ state, onClose, filenameBase }: Props) {
  const chunks = state.transcripts;

  const scrollRef = useRef<RNScrollView | null>(null);
  // Auto-scroll when new chunks arrive *if* the user is at the bottom.
  // On web we read the scroll position directly; on native we keep it
  // simple and always pin to bottom — RN doesn't expose contentOffset
  // synchronously without onScroll plumbing and this panel is web-first.
  useEffect(() => {
    const el = scrollRef.current as unknown as
      | { scrollToEnd?: (opts?: { animated?: boolean }) => void }
      | null;
    el?.scrollToEnd?.({ animated: true });
  }, [chunks]);

  const downloadDisabled = chunks.length === 0;

  const handleDownload = () => {
    if (downloadDisabled) return;
    const text = formatTranscriptForDownload(chunks);
    const base = (filenameBase || "transcript").replace(/[^\w.-]+/g, "-");
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `${base}-${stamp}.txt`;

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revoke so Safari has time to start the download.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    // Native download isn't wired yet — surface a clear console hint so
    // it's obvious why nothing happened. (The button is web-first; we
    // can wire expo-file-system + expo-sharing later if needed.)
    console.warn("[TranscriptPanel] download is web-only for now");
  };

  return (
    <YStack
      flex={1}
      backgroundColor="rgba(11, 18, 32, 0.97)"
      borderLeftWidth={1}
      borderColor="rgba(255,255,255,0.06)"
    >
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={16}
        paddingVertical={14}
        borderBottomWidth={1}
        borderColor="rgba(255,255,255,0.06)"
      >
        <Text color="#fff" fontSize={14} fontWeight="700">
          Live Transcript
        </Text>
        <XStack alignItems="center" gap={4}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Download transcript"
            disabled={downloadDisabled}
            onPress={handleDownload}
            style={({ pressed, hovered }) => ({
              width: 32,
              height: 32,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
              opacity: downloadDisabled ? 0.4 : 1,
              backgroundColor:
                !downloadDisabled && (pressed || hovered)
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
            })}
          >
            <Download size={18} color="#e5e7eb" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close transcript"
            onPress={onClose}
            style={({ pressed, hovered }) => ({
              width: 32,
              height: 32,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                pressed || hovered ? "rgba(255,255,255,0.08)" : "transparent",
            })}
          >
            <X size={18} color="#e5e7eb" />
          </Pressable>
        </XStack>
      </XStack>

      <ScrollView ref={scrollRef} flex={1} contentContainerStyle={{ padding: 16 }}>
        {chunks.length === 0 ? (
          <Empty isJoined={state.isJoined} isTranscribing={state.isTranscribing} />
        ) : (
          <YStack gap={12}>
            {chunks.map((c) => (
              <ChunkRow key={c.id} chunk={c} />
            ))}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}

function ChunkRow({ chunk }: { chunk: TranscriptChunk }) {
  const time = formatTime(chunk.timestamp);
  return (
    <YStack gap={2}>
      <XStack alignItems="center" gap={8}>
        <Text color="#9CA3AF" fontSize={11} fontWeight="600">
          {chunk.participantName}
        </Text>
        <Text color="#4B5563" fontSize={10}>
          {time}
        </Text>
      </XStack>
      <Text
        color="#e5e7eb"
        fontSize={13}
        lineHeight={18}
        opacity={chunk.isFinal ? 1 : 0.65}
      >
        {chunk.text}
      </Text>
    </YStack>
  );
}

function Empty({
  isJoined,
  isTranscribing,
}: {
  isJoined: boolean;
  isTranscribing: boolean;
}) {
  const message = !isJoined
    ? "Join the meeting to start transcription."
    : isTranscribing
      ? "Listening — captions will appear here as people speak."
      : "Starting transcription… this may take a few seconds.";
  return (
    <YStack alignItems="center" paddingVertical={32} gap={6}>
      <Text color={aiqlickTokens.gray500} fontSize={12} textAlign="center">
        {message}
      </Text>
    </YStack>
  );
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatTranscriptForDownload(chunks: TranscriptChunk[]) {
  const header = `Transcript — ${new Date().toISOString()}\n\n`;
  const body = chunks
    .map((c) => `[${formatTime(c.timestamp)}] ${c.participantName}: ${c.text}`)
    .join("\n");
  return header + body + "\n";
}

