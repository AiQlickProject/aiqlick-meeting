import { useState } from "react";
import { Calendar } from "@tamagui/lucide-icons";
import { Platform, Pressable, TextInput } from "react-native";
import { Text, View, XStack, YStack } from "tamagui";

import { aiqlickTokens } from "@/tamagui.config";

interface Props {
  label?: string;
  value?: string | null; // YYYY-MM-DD
  onChange: (v: string) => void;
  isRequired?: boolean;
  errorText?: string;
  min?: string;
  max?: string;
}

/**
 * Cross-platform date input. On web we hand off to the browser's
 * native `<input type="date">` (best UX, calendar opens on click).
 * On native we fall back to a textual "YYYY-MM-DD" entry — a richer
 * picker can be added later via `@react-native-community/datetimepicker`
 * without changing the public prop surface.
 */
export function TWDatepicker({
  label,
  value,
  onChange,
  isRequired,
  errorText,
  min,
  max,
}: Props) {
  const [focused, setFocused] = useState(false);
  const borderColor = errorText
    ? aiqlickTokens.danger
    : focused
      ? aiqlickTokens.primary
      : aiqlickTokens.primaryTint;

  return (
    <YStack gap={4}>
      <YStack
        height={58}
        paddingHorizontal={12}
        borderRadius={aiqlickTokens.radiusLg}
        borderWidth={2}
        borderColor={borderColor}
        backgroundColor={aiqlickTokens.surface}
        justifyContent="flex-end"
        position="relative"
      >
        {label && (
          <Text
            position="absolute"
            left={12}
            top={6}
            fontSize={11}
            color={focused ? aiqlickTokens.primary : aiqlickTokens.gray500}
            fontWeight="600"
            pointerEvents="none"
          >
            {label}
            {isRequired ? " *" : ""}
          </Text>
        )}
        <XStack alignItems="center" gap={8} paddingBottom={8}>
          {Platform.OS === "web" ? (
            // react-native-web maps <input type="date"> through this
            // unsupported-but-accepted type prop on TextInput. The
            // resulting DOM node is a real `<input type="date">`, so
            // the browser's native calendar UI opens on click.
            <TextInput
              {...({
                type: "date",
                min,
                max,
              } as object)}
              value={value ?? ""}
              onChangeText={onChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                flex: 1,
                paddingTop: 14,
                fontSize: 14,
                color: aiqlickTokens.textDark,
                outlineStyle: "none" as unknown as undefined,
                background: "transparent" as unknown as undefined,
                border: "none" as unknown as undefined,
              }}
            />
          ) : (
            <TextInput
              value={value ?? ""}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={aiqlickTokens.gray400}
              onChangeText={onChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCapitalize="none"
              style={{
                flex: 1,
                paddingTop: 14,
                fontSize: 14,
                color: aiqlickTokens.textDark,
              }}
            />
          )}
          <Pressable hitSlop={4} onPress={() => {}}>
            <Calendar size={16} color={aiqlickTokens.gray500} />
          </Pressable>
        </XStack>
      </YStack>
      {errorText && (
        <Text fontSize={11} color={aiqlickTokens.danger} marginLeft={2}>
          {errorText}
        </Text>
      )}
    </YStack>
  );
}

/**
 * Format a `YYYY-MM-DD` (datepicker) + `HH:MM` (time input) pair into
 * an ISO datetime string for backend submission. Time fields use
 * 24-hour format on web; if `time` is empty, defaults to 00:00.
 */
export function combineDateTime(date: string, time: string, timezone?: string) {
  const t = time && /^\d{2}:\d{2}/.test(time) ? time : "00:00";
  // Local-time interpretation — the caller is responsible for the
  // timezone offset if they want a non-local interpretation.
  const dt = new Date(`${date}T${t}:00`);
  return {
    iso: dt.toISOString(),
    timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
