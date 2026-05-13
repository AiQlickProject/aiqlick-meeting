import { useState } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { Text, View, YStack } from "tamagui";

interface Props extends Omit<TextInputProps, "placeholder"> {
  label: string;
  errorText?: string;
}

/**
 * Underlined input with a floating label — mirrors aiqlick-frontend's
 * `TWInput variant="underlined"`. Label sits centered when empty,
 * shrinks and floats above when focused or filled. Underline turns
 * primary on focus.
 */
export default function FloatingInput({ label, errorText, value, onChangeText, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const floated = focused || !!value;
  const underline = focused ? "#3D52A0" : errorText ? "#dc2626" : "#ADBBDA";

  return (
    <YStack paddingVertical={2}>
      <View height={48} justifyContent="flex-end" position="relative">
        <Text
          position="absolute"
          left={2}
          top={floated ? 0 : 16}
          fontSize={floated ? 11 : 14}
          color={focused ? "#3D52A0" : "#6b7280"}
          fontWeight={floated ? "600" : "500"}
          pointerEvents="none"
        >
          {label}
        </Text>
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            paddingTop: 18,
            paddingBottom: 6,
            paddingHorizontal: 2,
            fontSize: 14,
            color: "#2C3E50",
            borderBottomWidth: 2,
            borderBottomColor: underline,
            outlineStyle: "none" as unknown as undefined,
          }}
        />
      </View>
      {errorText ? (
        <Text color="#dc2626" fontSize={11} marginTop={2}>
          {errorText}
        </Text>
      ) : null}
    </YStack>
  );
}
