import { useState } from "react";
import { ChevronDown, Check } from "@tamagui/lucide-icons";
import { Pressable } from "react-native";
import { ScrollView, Text, View, XStack, YStack } from "tamagui";

import { aiqlickTokens } from "@/tamagui.config";

export interface TWSelectOption<V extends string = string> {
  value: V;
  label: string;
}

interface Props<V extends string = string> {
  label?: string;
  options: TWSelectOption<V>[];
  value: V;
  onChange: (v: V) => void;
  isRequired?: boolean;
  errorText?: string;
}

/**
 * Bordered dropdown matching `TWSelect variant="bordered"` from the
 * frontend. Floats the label, opens a vertically-scrolling popover
 * pinned beneath the trigger. Works the same on web + native because
 * we render our own overlay rather than relying on the platform
 * <select>.
 */
export function TWSelect<V extends string = string>({
  label,
  options,
  value,
  onChange,
  isRequired,
  errorText,
}: Props<V>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const borderColor = errorText
    ? aiqlickTokens.danger
    : open
      ? aiqlickTokens.primary
      : aiqlickTokens.primaryTint;

  return (
    <YStack gap={4} position="relative" zIndex={open ? 100 : 1}>
      <Pressable onPress={() => setOpen((v) => !v)}>
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
              color={open ? aiqlickTokens.primary : aiqlickTokens.gray500}
              fontWeight="600"
            >
              {label}
              {isRequired ? " *" : ""}
            </Text>
          )}
          <XStack alignItems="center" paddingBottom={8} justifyContent="space-between" gap={6}>
            <Text
              fontSize={14}
              color={selected ? aiqlickTokens.textDark : aiqlickTokens.gray400}
              numberOfLines={1}
              flex={1}
            >
              {selected?.label ?? "Select…"}
            </Text>
            <ChevronDown size={16} color={aiqlickTokens.gray500} />
          </XStack>
        </YStack>
      </Pressable>

      {open && (
        <View
          position="absolute"
          top={62}
          left={0}
          right={0}
          maxHeight={240}
          borderRadius={aiqlickTokens.radiusLg}
          backgroundColor={aiqlickTokens.surface}
          borderWidth={1}
          borderColor={aiqlickTokens.gray200}
          shadowColor="#1A2556"
          shadowOpacity={0.18}
          shadowRadius={16}
          shadowOffset={{ width: 0, height: 8 }}
          overflow="hidden"
        >
          <ScrollView>
            {options.map((opt) => {
              const isSel = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={({ pressed, hovered }) => ({
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: isSel
                      ? aiqlickTokens.primaryFaint
                      : pressed || hovered
                        ? aiqlickTokens.gray50
                        : "transparent",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  })}
                >
                  <Text
                    fontSize={13}
                    color={isSel ? aiqlickTokens.primary : aiqlickTokens.textDark}
                    fontWeight={isSel ? "600" : "500"}
                  >
                    {opt.label}
                  </Text>
                  {isSel && <Check size={14} color={aiqlickTokens.primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {errorText && (
        <Text fontSize={11} color={aiqlickTokens.danger} marginLeft={2}>
          {errorText}
        </Text>
      )}
    </YStack>
  );
}
