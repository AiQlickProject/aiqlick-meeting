import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, View as RNView } from "react-native";
import { Text, View, XStack } from "tamagui";

import type { ReactionEvent, ReactionKind } from "@/hooks/jitsi-types";

interface Props {
  reactions: ReactionEvent[];
}

const EMOJI: Record<ReactionKind, string> = {
  "thumbs-up": "👍",
  clap: "👏",
  laugh: "😂",
  surprised: "😮",
  boo: "👎",
  love: "❤️",
};

const LIFETIME_MS = 3200;

/**
 * Floating reaction toast stack — overlays the video stage so every
 * participant sees "<name> reacted 👏" when anyone in the call sends
 * a reaction. Drives from `state.recentReactions`, which the embed
 * fills from:
 *   • our own toolbar (locally-pushed by the sendReaction command), or
 *   • `endpointTextMessageReceived` for everyone else's reactions.
 *
 * The overlay is positioned absolutely and `pointerEvents="none"` so
 * it never steals clicks from the video, toolbar, or any side panel.
 */
export default function ReactionsOverlay({ reactions }: Props) {
  if (reactions.length === 0) return null;
  return (
    <View
      position="absolute"
      left={0}
      right={0}
      bottom={100}
      alignItems="center"
      pointerEvents="none"
      zIndex={200}
    >
      <XStack
        gap={8}
        flexDirection="column-reverse"
        alignItems="center"
      >
        {reactions.slice(-5).map((r) => (
          <ReactionToast key={r.id} reaction={r} />
        ))}
      </XStack>
    </View>
  );
}

function ReactionToast({ reaction }: { reaction: ReactionEvent }) {
  const [visible, setVisible] = useState(true);
  // Web: rely on CSS transition driven by `opacity` / `transform`
  // toggling. Native: useNativeDriver Animated. We pick whichever the
  // platform supports cleanly.
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.delay(LIFETIME_MS - 440),
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start(() => setVisible(false));
  }, [anim]);

  const translateY = useMemo(
    () =>
      anim.interpolate({
        inputRange: [0, 1],
        outputRange: [16, 0],
      }),
    [anim],
  );

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY }],
      }}
    >
      <RNView
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <Text fontSize={22}>{EMOJI[reaction.kind]}</Text>
        <Text color="#fff" fontSize={13} fontWeight="600">
          {reaction.senderName}
        </Text>
        <Text color="rgba(255,255,255,0.55)" fontSize={12}>
          reacted
        </Text>
      </RNView>
    </Animated.View>
  );
}
