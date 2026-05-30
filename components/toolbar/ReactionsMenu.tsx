import { Pressable } from "react-native";
import { Hand } from "@tamagui/lucide-icons";
import { View, XStack, YStack, Text } from "tamagui";

import type { ReactionKind } from "@/hooks/jitsi-types";

import MenuItem, { MenuSeparator } from "./MenuItem";

interface Props {
  isHandRaised: boolean;
  onReact: (kind: ReactionKind) => void;
  onToggleRaiseHand: () => void;
  close: () => void;
}

interface ReactionEntry {
  kind: ReactionKind;
  emoji: string;
  label: string;
}

const REACTIONS: ReactionEntry[] = [
  { kind: "thumbs-up", emoji: "👍", label: "Like" },
  { kind: "love", emoji: "❤️", label: "Love" },
  { kind: "laugh", emoji: "😂", label: "Laugh" },
  { kind: "surprised", emoji: "😮", label: "Wow" },
  { kind: "clap", emoji: "👏", label: "Applause" },
  { kind: "boo", emoji: "👎", label: "Dislike" },
];

export default function ReactionsMenu({
  isHandRaised,
  onReact,
  onToggleRaiseHand,
  close,
}: Props) {
  return (
    <YStack>
      <XStack justifyContent="space-between" paddingHorizontal={6} paddingVertical={6}>
        {REACTIONS.map((r) => (
          <Pressable
            key={r.kind}
            accessibilityRole="button"
            accessibilityLabel={r.label}
            onPress={() => {
              onReact(r.kind);
              close();
            }}
            style={({ pressed, hovered }) => ({
              width: 36,
              height: 36,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed
                ? "rgba(112, 145, 230, 0.3)"
                : hovered
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
              transform: pressed ? [{ scale: 0.92 }] : undefined,
            })}
          >
            <Text fontSize={22}>{r.emoji}</Text>
          </Pressable>
        ))}
      </XStack>
      <MenuSeparator />
      <MenuItem
        icon={
          <View>
            <Hand size={16} color={isHandRaised ? "#7091E6" : "#e5e7eb"} />
          </View>
        }
        label={isHandRaised ? "Lower hand" : "Raise hand"}
        description={isHandRaised ? "Lower your raised hand" : "Notify the host you'd like to speak"}
        selected={isHandRaised}
        hideCheckmark
        onPress={() => {
          onToggleRaiseHand();
          close();
        }}
      />
    </YStack>
  );
}
