import { useState } from "react";
import { Pressable } from "react-native";
import {
  Check,
  Copy,
  Mic,
  MicOff,
  UserPlus,
  Video,
  VideoOff,
  X,
} from "@tamagui/lucide-icons";
import { Circle, ScrollView, View, XStack, YStack, Text } from "tamagui";

import type { JitsiState, ParticipantInfo } from "@/hooks/jitsi-types";
import { aiqlickTokens } from "@/tamagui.config";

interface Props {
  state: JitsiState;
  onClose: () => void;
  /**
   * Sharable URL for invites. Caller is expected to have stripped the
   * JWT — never let tokens leak through copy.
   */
  inviteUrl: string;
}

/**
 * Right-rail participants panel. Driven entirely by `JitsiState` so
 * it works across all Jitsi versions and matches the aiqlick chrome.
 *
 * Layout (top-down):
 *   • Header: "Participants (N)" + close X
 *   • Scrolling participant list with per-row mic / cam indicator
 *   • Sticky bottom "Invite people" section with copy-link button.
 *     Replaces the previous standalone toolbar invite button so the
 *     "add participant" affordance lives where users naturally look
 *     for it.
 */
export default function ParticipantsPanel({ state, onClose, inviteUrl }: Props) {
  if (!state.isParticipantsOpen) return null;

  const list = state.participants.length
    ? state.participants
    : ([
        {
          id: "self",
          displayName: "You",
          isLocal: true,
          audioMuted: false,
          videoMuted: false,
        },
      ] as ParticipantInfo[]);

  return (
    <YStack
      flex={1}
      backgroundColor="rgba(11, 18, 32, 0.97)"
      borderLeftWidth={1}
      borderColor="rgba(255,255,255,0.06)"
    >
      <XStack
        height={56}
        paddingHorizontal={16}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderColor="rgba(255,255,255,0.06)"
      >
        <Text color="#fff" fontSize={14} fontWeight="700">
          Participants ({state.participantCount})
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close participants"
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
          <X size={16} color="#e5e7eb" />
        </Pressable>
      </XStack>

      <ScrollView flex={1}>
        <YStack paddingVertical={8}>
          {list.map((p) => (
            <ParticipantRow key={p.id} participant={p} state={state} />
          ))}
        </YStack>
      </ScrollView>

      <InviteFooter inviteUrl={inviteUrl} />
    </YStack>
  );
}

function InviteFooter({ inviteUrl }: { inviteUrl: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [expanded, setExpanded] = useState(false);

  const copy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
        setStatus("copied");
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 2200);
  };

  return (
    <YStack
      paddingHorizontal={16}
      paddingVertical={14}
      gap={10}
      borderTopWidth={1}
      borderColor="rgba(255,255,255,0.06)"
      backgroundColor="rgba(255,255,255,0.02)"
    >
      <XStack alignItems="center" gap={8}>
        <View
          width={28}
          height={28}
          borderRadius={8}
          alignItems="center"
          justifyContent="center"
          backgroundColor="rgba(112, 145, 230, 0.18)"
        >
          <UserPlus size={14} color={aiqlickTokens.primaryLight} />
        </View>
        <YStack flex={1} gap={1}>
          <Text color="#fff" fontSize={13} fontWeight="600">
            Invite people
          </Text>
          <Text color="rgba(255,255,255,0.55)" fontSize={11}>
            Share this meeting link to add a participant.
          </Text>
        </YStack>
      </XStack>

      <Pressable
        onPress={copy}
        onHoverIn={() => setExpanded(true)}
        onHoverOut={() => setExpanded(false)}
        style={({ pressed, hovered }) => ({
          height: 40,
          borderRadius: 8,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor:
            status === "copied"
              ? "rgba(34, 197, 94, 0.18)"
              : status === "failed"
                ? "rgba(220, 38, 38, 0.18)"
                : pressed
                  ? "rgba(61, 82, 160, 0.4)"
                  : hovered
                    ? "rgba(61, 82, 160, 0.3)"
                    : "rgba(61, 82, 160, 0.2)",
          borderWidth: 1,
          borderColor:
            status === "copied"
              ? "rgba(34, 197, 94, 0.4)"
              : status === "failed"
                ? "rgba(220, 38, 38, 0.4)"
                : "rgba(112, 145, 230, 0.3)",
        })}
      >
        {status === "copied" ? (
          <Check size={14} color="#22c55e" />
        ) : (
          <Copy size={14} color={aiqlickTokens.primaryLight} />
        )}
        <Text
          color={
            status === "copied"
              ? "#22c55e"
              : status === "failed"
                ? "#fca5a5"
                : "#fff"
          }
          fontSize={12}
          fontWeight="600"
          numberOfLines={1}
          flex={1}
        >
          {status === "copied"
            ? "Link copied to clipboard"
            : status === "failed"
              ? "Couldn't copy — try again"
              : expanded
                ? truncate(inviteUrl, 38)
                : "Copy invite link"}
        </Text>
      </Pressable>
    </YStack>
  );
}

function ParticipantRow({
  participant,
  state,
}: {
  participant: ParticipantInfo;
  state: JitsiState;
}) {
  const audioMuted = participant.isLocal ? state.isAudioMuted : participant.audioMuted;
  const videoMuted = participant.isLocal ? state.isVideoMuted : participant.videoMuted;
  const name = participant.isLocal
    ? `${participant.displayName} (you)`
    : participant.displayName;
  return (
    <XStack
      paddingHorizontal={16}
      paddingVertical={10}
      alignItems="center"
      gap={12}
      hoverStyle={{ backgroundColor: "rgba(255,255,255,0.03)" }}
    >
      <Avatar name={participant.displayName} />
      <YStack flex={1}>
        <Text color="#fff" fontSize={13} fontWeight="500" numberOfLines={1}>
          {name}
        </Text>
      </YStack>
      <XStack gap={6}>
        <IconDot muted={audioMuted}>
          {audioMuted ? (
            <MicOff size={14} color="#fff" />
          ) : (
            <Mic size={14} color="#9ca3af" />
          )}
        </IconDot>
        <IconDot muted={videoMuted}>
          {videoMuted ? (
            <VideoOff size={14} color="#fff" />
          ) : (
            <Video size={14} color="#9ca3af" />
          )}
        </IconDot>
      </XStack>
    </XStack>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <Circle size={32} backgroundColor={aiqlickTokens.primary}>
      <Text color="#fff" fontSize={12} fontWeight="600">
        {initials || "?"}
      </Text>
    </Circle>
  );
}

function IconDot({
  muted,
  children,
}: {
  muted: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      width={26}
      height={26}
      borderRadius={6}
      alignItems="center"
      justifyContent="center"
      backgroundColor={muted ? "rgba(239, 68, 68, 0.85)" : "transparent"}
    >
      {children}
    </View>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
