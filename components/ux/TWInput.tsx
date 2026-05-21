import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, TextInput, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "@tamagui/lucide-icons";
import { Text, View, XStack, YStack } from "tamagui";

import { aiqlickTokens } from "@/tamagui.config";

export type TWInputVariant = "bordered" | "underlined";
export type TWInputSize = "sm" | "md" | "lg";

interface Props extends Omit<TextInputProps, "style"> {
  label?: string;
  placeholder?: string;
  variant?: TWInputVariant;
  size?: TWInputSize;
  isRequired?: boolean;
  errorText?: string;
  helperText?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

// Box heights are the *final* field height (no +14 inflation). These
// are standard, comfortable form heights — the previous values left a
// large hollow gap between the floated label and the value.
const SIZE_SPEC: Record<TWInputSize, { height: number; font: number }> = {
  sm: { height: 42, font: 14 },
  md: { height: 52, font: 14 },
  lg: { height: 58, font: 15 },
};

/**
 * Port of TWInput with the two variants the frontend uses:
 *
 *   bordered    full 2-px rounded box (default for forms)
 *   underlined  bottom border only, used on auth screens
 *
 * Both variants float the label above the field when focused or
 * filled (no separate placeholder needed). `secureTextEntry` enables
 * a built-in show/hide toggle on the right.
 */
export function TWInput({
  label,
  placeholder,
  variant = "bordered",
  size = "md",
  isRequired,
  errorText,
  helperText,
  startIcon,
  endIcon,
  clearable: _clearable,
  onClear: _onClear,
  value,
  onChangeText,
  onFocus,
  onBlur,
  secureTextEntry,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const s = SIZE_SPEC[size];
  const filled = !!value && String(value).length > 0;
  const floated = focused || filled;

  const borderColor = errorText
    ? aiqlickTokens.danger
    : focused
      ? aiqlickTokens.primary
      : aiqlickTokens.gray200;

  return (
    <YStack gap={4}>
      {variant === "bordered" ? (
        <YStack
          height={s.height}
          paddingHorizontal={14}
          borderRadius={aiqlickTokens.radiusLg}
          borderWidth={1.5}
          borderColor={borderColor}
          backgroundColor={aiqlickTokens.surface}
          justifyContent="center"
          position="relative"
        >
          {label && (
            <Text
              position="absolute"
              left={startIcon && !floated ? 38 : 14}
              top={floated ? 7 : s.height / 2 - 9}
              fontSize={floated ? 11 : s.font}
              color={focused ? aiqlickTokens.primary : aiqlickTokens.gray500}
              fontWeight={floated ? "600" : "400"}
              pointerEvents="none"
            >
              {label}
              {isRequired ? " *" : ""}
            </Text>
          )}
          <XStack alignItems="center" gap={8}>
            {startIcon}
            <TextInput
              {...rest}
              value={value}
              onChangeText={onChangeText}
              placeholder={floated ? placeholder : undefined}
              placeholderTextColor={aiqlickTokens.gray400}
              onFocus={(e) => {
                setFocused(true);
                onFocus?.(e);
              }}
              onBlur={(e) => {
                setFocused(false);
                onBlur?.(e);
              }}
              secureTextEntry={secureTextEntry && !revealed}
              style={{
                flex: 1,
                paddingTop: label ? 16 : 0,
                fontSize: s.font,
                color: aiqlickTokens.textDark,
                outlineStyle: "none" as unknown as undefined,
              }}
            />
            {secureTextEntry ? (
              <Pressable onPress={() => setRevealed((v) => !v)} hitSlop={6}>
                {revealed ? (
                  <EyeOff size={16} color={aiqlickTokens.gray500} />
                ) : (
                  <Eye size={16} color={aiqlickTokens.gray500} />
                )}
              </Pressable>
            ) : (
              endIcon
            )}
          </XStack>
        </YStack>
      ) : (
        <View height={s.height + 14} justifyContent="flex-end" position="relative">
          {label && (
            <Text
              position="absolute"
              left={2}
              top={floated ? 0 : (s.height + 14) / 2 - 8}
              fontSize={floated ? 11 : s.font}
              color={focused ? aiqlickTokens.primary : aiqlickTokens.gray500}
              fontWeight={floated ? "600" : "500"}
              pointerEvents="none"
            >
              {label}
              {isRequired ? " *" : ""}
            </Text>
          )}
          <TextInput
            {...rest}
            value={value}
            onChangeText={onChangeText}
            placeholder={floated ? placeholder : undefined}
            placeholderTextColor={aiqlickTokens.gray400}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            secureTextEntry={secureTextEntry && !revealed}
            style={{
              paddingTop: label ? 18 : 0,
              paddingBottom: 6,
              fontSize: s.font,
              color: aiqlickTokens.textDark,
              borderBottomWidth: 2,
              borderBottomColor: borderColor,
              outlineStyle: "none" as unknown as undefined,
            }}
          />
        </View>
      )}
      {(errorText || helperText) && (
        <Text
          fontSize={11}
          color={errorText ? aiqlickTokens.danger : aiqlickTokens.gray500}
          marginLeft={2}
        >
          {errorText ?? helperText}
        </Text>
      )}
    </YStack>
  );
}

export function TWTextarea({
  label,
  placeholder,
  value,
  onChangeText,
  isRequired,
  errorText,
  rows = 3,
}: {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (v: string) => void;
  isRequired?: boolean;
  errorText?: string;
  rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  const filled = !!value && value.length > 0;
  const floated = focused || filled;
  const borderColor = errorText
    ? aiqlickTokens.danger
    : focused
      ? aiqlickTokens.primary
      : aiqlickTokens.gray200;
  return (
    <YStack gap={4}>
      <YStack
        paddingHorizontal={14}
        paddingTop={20}
        paddingBottom={8}
        borderRadius={aiqlickTokens.radiusLg}
        borderWidth={1.5}
        borderColor={borderColor}
        backgroundColor={aiqlickTokens.surface}
        position="relative"
      >
        {label && (
          <Text
            position="absolute"
            left={14}
            top={floated ? 7 : 18}
            fontSize={floated ? 11 : 14}
            color={focused ? aiqlickTokens.primary : aiqlickTokens.gray500}
            fontWeight={floated ? "600" : "400"}
            pointerEvents="none"
          >
            {label}
            {isRequired ? " *" : ""}
          </Text>
        )}
        <TextInput
          multiline
          numberOfLines={rows}
          value={value}
          onChangeText={onChangeText}
          placeholder={floated ? placeholder : undefined}
          placeholderTextColor={aiqlickTokens.gray400}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            minHeight: rows * 20,
            fontSize: 14,
            color: aiqlickTokens.textDark,
            outlineStyle: "none" as unknown as undefined,
            textAlignVertical: "top",
          }}
        />
      </YStack>
      {errorText && (
        <Text fontSize={11} color={aiqlickTokens.danger} marginLeft={2}>
          {errorText}
        </Text>
      )}
    </YStack>
  );
}
