import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, TextInput as RNTextInput } from "react-native";
import { Send, X } from "@tamagui/lucide-icons";
import { Circle, ScrollView, View, XStack, YStack, Text } from "tamagui";

import type { ChatMessage, JitsiState } from "@/hooks/jitsi-types";
import { aiqlickTokens } from "@/tamagui.config";

interface Props {
  state: JitsiState;
  onClose: () => void;
  onSend: (text: string) => void;
}

/**
 * Custom chat side panel. Replaces Jitsi's native chat (hidden via
 * nginx-injected CSS) so the meeting wrapper owns the visual
 * language — message bubbles, sender pills, timestamps — and so the
 * sender name is always visible per message (Jitsi groups consecutive
 * messages by sender and was hiding the name in compact view).
 *
 * Driven entirely by `state.chatMessages`, which the JitsiEmbed
 * populates from the `incomingMessage` / `outgoingMessage` events.
 */
export default function ChatPanel({ state, onClose, onSend }: Props) {
  if (!state.isChatOpen) return null;
  return (
    <YStack
      flex={1}
      backgroundColor="rgba(11, 18, 32, 0.97)"
      borderLeftWidth={1}
      borderColor="rgba(255,255,255,0.06)"
    >
      <ChatHeader onClose={onClose} count={state.chatMessages.length} />
      <ChatMessageList messages={state.chatMessages} />
      <ChatComposer onSend={onSend} />
    </YStack>
  );
}

function ChatHeader({ onClose, count }: { onClose: () => void; count: number }) {
  return (
    <XStack
      height={56}
      paddingHorizontal={16}
      alignItems="center"
      justifyContent="space-between"
      borderBottomWidth={1}
      borderColor="rgba(255,255,255,0.06)"
    >
      <YStack>
        <Text color="#fff" fontSize={14} fontWeight="700">
          Chat
        </Text>
        {count > 0 ? (
          <Text color="rgba(255,255,255,0.45)" fontSize={11}>
            {count === 1 ? "1 message" : `${count} messages`}
          </Text>
        ) : null}
      </YStack>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close chat"
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
  );
}

function ChatMessageList({ messages }: { messages: ChatMessage[] }) {
  const scrollRef = useRef<{ scrollToEnd?: (opts?: { animated: boolean }) => void } | null>(
    null,
  );

  // Auto-scroll to the latest message whenever the message list grows.
  // We only watch length, not the full array, so adding a new bubble
  // triggers exactly one scroll. Older messages mutating in-place
  // (which we don't do — messages are append-only) would not.
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, 40);
    return () => clearTimeout(t);
  }, [messages.length]);

  // Group consecutive messages from the same sender within a 2-min
  // window — same heuristic Teams / Slack / Meet use. The first
  // message in a group shows the avatar and name; the rest are bare
  // bubbles, much less visual noise in a chatty conference.
  const groups = useMemo(() => groupMessages(messages), [messages]);

  if (messages.length === 0) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
        <Text color="rgba(255,255,255,0.4)" fontSize={13} textAlign="center">
          No messages yet — say hi to start the conversation.
        </Text>
      </YStack>
    );
  }

  return (
    <ScrollView
      flex={1}
      ref={scrollRef as never}
      contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12, gap: 12 }}
    >
      {groups.map((g) => (
        <MessageGroup key={g.id} group={g} />
      ))}
    </ScrollView>
  );
}

interface MessageGroupT {
  id: string;
  senderName: string;
  isOwn: boolean;
  messages: ChatMessage[];
}

function groupMessages(messages: ChatMessage[]): MessageGroupT[] {
  const out: MessageGroupT[] = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    const within = last && m.timestamp - last.messages[last.messages.length - 1].timestamp < 120_000;
    if (last && last.senderName === m.senderName && last.isOwn === m.isOwn && within) {
      last.messages.push(m);
    } else {
      out.push({
        id: m.id,
        senderName: m.senderName,
        isOwn: m.isOwn,
        messages: [m],
      });
    }
  }
  return out;
}

function MessageGroup({ group }: { group: MessageGroupT }) {
  const align = group.isOwn ? "flex-end" : "flex-start";
  return (
    <YStack alignItems={align} gap={2}>
      <XStack
        gap={8}
        alignItems="flex-start"
        flexDirection={group.isOwn ? "row-reverse" : "row"}
      >
        {!group.isOwn ? <Avatar name={group.senderName} /> : null}
        <YStack alignItems={align} maxWidth="80%">
          <XStack
            gap={6}
            alignItems="baseline"
            flexDirection={group.isOwn ? "row-reverse" : "row"}
          >
            <Text color="#fff" fontSize={12} fontWeight="600" numberOfLines={1}>
              {group.isOwn ? "You" : group.senderName}
            </Text>
            <Text color="rgba(255,255,255,0.45)" fontSize={10}>
              {formatTime(group.messages[0].timestamp)}
            </Text>
          </XStack>
          <YStack gap={4} alignItems={align} marginTop={2}>
            {group.messages.map((m) => (
              <Bubble key={m.id} message={m} isOwn={group.isOwn} />
            ))}
          </YStack>
        </YStack>
      </XStack>
    </YStack>
  );
}

function Bubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <View
      paddingHorizontal={12}
      paddingVertical={8}
      borderRadius={12}
      borderTopRightRadius={isOwn ? 4 : 12}
      borderTopLeftRadius={isOwn ? 12 : 4}
      backgroundColor={
        isOwn ? "rgba(61, 82, 160, 0.35)" : "rgba(255, 255, 255, 0.06)"
      }
      borderWidth={1}
      borderColor={
        isOwn ? "rgba(112, 145, 230, 0.35)" : "rgba(255, 255, 255, 0.08)"
      }
    >
      <Text color="#fff" fontSize={13} lineHeight={18}>
        {message.text}
      </Text>
      {message.isPrivate ? (
        <Text color="rgba(255,255,255,0.5)" fontSize={10} marginTop={2} fontStyle="italic">
          Private message
        </Text>
      ) : null}
    </View>
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
    <Circle size={28} backgroundColor={aiqlickTokens.primary}>
      <Text color="#fff" fontSize={11} fontWeight="600">
        {initials || "?"}
      </Text>
    </Circle>
  );
}

function ChatComposer({ onSend }: { onSend: (text: string) => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<RNTextInput | null>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    // Keep keyboard focus so the user can keep typing without
    // re-clicking the input (matches Teams / Slack behaviour).
    inputRef.current?.focus?.();
  };

  return (
    <YStack
      paddingHorizontal={12}
      paddingVertical={10}
      borderTopWidth={1}
      borderColor="rgba(255,255,255,0.06)"
      backgroundColor="rgba(255,255,255,0.02)"
      gap={8}
    >
      <XStack
        alignItems="center"
        gap={8}
        borderRadius={10}
        borderWidth={1}
        borderColor="rgba(255,255,255,0.1)"
        backgroundColor="rgba(255,255,255,0.04)"
        paddingHorizontal={12}
        paddingVertical={6}
      >
        <RNTextInput
          ref={inputRef}
          value={value}
          onChangeText={setValue}
          placeholder="Type a message"
          placeholderTextColor="rgba(255,255,255,0.4)"
          accessibilityLabel="Chat message"
          // Enter sends, Shift+Enter inserts a newline (web). Native
          // RN ignores `onKeyPress` for Enter, so we also wire
          // onSubmitEditing as a fallback.
          onSubmitEditing={submit}
          blurOnSubmit={false}
          multiline={Platform.OS !== "web"}
          onKeyPress={
            Platform.OS === "web"
              ? (e) => {
                  // React Native types onKeyPress as KeyboardEvent;
                  // on web it is a native DOM KeyboardEvent. Cast and
                  // suppress for shift+enter to allow newlines.
                  const ke = e.nativeEvent as unknown as {
                    key?: string;
                    shiftKey?: boolean;
                    preventDefault?: () => void;
                  };
                  if (ke.key === "Enter" && !ke.shiftKey) {
                    ke.preventDefault?.();
                    submit();
                  }
                }
              : undefined
          }
          style={{
            flex: 1,
            color: "#fff",
            fontSize: 13,
            paddingVertical: 6,
            // outlineStyle is web-only; cast for the type checker.
            ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          onPress={submit}
          disabled={!value.trim()}
          style={({ pressed, hovered }) => ({
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            opacity: value.trim() ? 1 : 0.4,
            backgroundColor: value.trim()
              ? pressed
                ? aiqlickTokens.primaryActive
                : hovered
                  ? aiqlickTokens.primaryHover
                  : aiqlickTokens.primary
              : "rgba(255,255,255,0.05)",
          })}
        >
          <Send size={14} color="#fff" />
        </Pressable>
      </XStack>
    </YStack>
  );
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}
