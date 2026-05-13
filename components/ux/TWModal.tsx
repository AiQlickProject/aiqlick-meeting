import type { ReactNode } from "react";
import { X } from "@tamagui/lucide-icons";
import { Modal, Pressable } from "react-native";
import { ScrollView, Text, View, XStack, YStack } from "tamagui";

import { aiqlickTokens } from "@/tamagui.config";

type Size = "sm" | "md" | "lg" | "xl" | "2xl";

const WIDTHS: Record<Size, number> = {
  sm: 360,
  md: 480,
  lg: 640,
  xl: 800,
  "2xl": 960,
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  size?: Size;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  closeOnBackdrop?: boolean;
}

/**
 * Centered modal using React Native's built-in Modal primitive (which
 * renders a real platform modal on iOS/Android and a fixed overlay on
 * web). Anatomy mirrors `<TWModal>` in the frontend:
 *
 *   ┌─ header  ─────────────  X ┐
 *   │  body (scrollable)         │
 *   └─ footer (right-aligned) ───┘
 */
export function TWModal({
  isOpen,
  onClose,
  size = "md",
  header,
  footer,
  children,
  closeOnBackdrop = true,
}: Props) {
  const w = WIDTHS[size];
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={closeOnBackdrop ? onClose : undefined}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(11, 18, 32, 0.55)",
          padding: 16,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: w,
            maxHeight: "100%",
          }}
        >
          <YStack
            backgroundColor={aiqlickTokens.surface}
            borderRadius={aiqlickTokens.radius2xl}
            borderWidth={1}
            borderColor={aiqlickTokens.gray200}
            shadowColor="#1A2556"
            shadowOpacity={0.3}
            shadowRadius={48}
            shadowOffset={{ width: 0, height: 24 }}
            overflow="hidden"
            maxHeight="100%"
          >
            {header != null && (
              <XStack
                paddingHorizontal={20}
                paddingVertical={14}
                alignItems="center"
                justifyContent="space-between"
                borderBottomWidth={1}
                borderColor={aiqlickTokens.gray100}
                gap={12}
              >
                <View flex={1}>
                  {typeof header === "string" ? (
                    <Text color={aiqlickTokens.textDark} fontSize={16} fontWeight="700">
                      {header}
                    </Text>
                  ) : (
                    header
                  )}
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={6}
                  style={({ pressed, hovered }) => ({
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      pressed || hovered ? aiqlickTokens.gray100 : "transparent",
                  })}
                >
                  <X size={16} color={aiqlickTokens.gray600} />
                </Pressable>
              </XStack>
            )}

            <ScrollView>
              <YStack padding={20} gap={16}>
                {children}
              </YStack>
            </ScrollView>

            {footer != null && (
              <XStack
                paddingHorizontal={20}
                paddingVertical={14}
                alignItems="center"
                justifyContent="flex-end"
                gap={8}
                borderTopWidth={1}
                borderColor={aiqlickTokens.gray100}
                backgroundColor={aiqlickTokens.gray50}
              >
                {footer}
              </XStack>
            )}
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
