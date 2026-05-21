import { useRef, useState } from "react";
import { ChevronDown, Check } from "@tamagui/lucide-icons";
import {
  Dimensions,
  Modal,
  Pressable,
  View as RNView,
} from "react-native";
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

const MENU_MAX_HEIGHT = 240;

/**
 * Bordered dropdown matching `TWSelect variant="bordered"` from the
 * frontend. The option list renders inside a transparent React Native
 * `Modal` anchored to the trigger via `measureInWindow`, so it escapes
 * any clipping ancestor (e.g. a modal body `ScrollView` with
 * `overflow:"hidden"`) and is never cut off — the previous in-flow
 * absolute popover was clipped and unusable inside TWModal.
 * Public prop surface is unchanged.
 */
export function TWSelect<V extends string = string>({
  label,
  options,
  value,
  onChange,
  isRequired,
  errorText,
}: Props<V>) {
  const triggerRef = useRef<RNView>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const selected = options.find((o) => o.value === value);
  const borderColor = errorText
    ? aiqlickTokens.danger
    : open
      ? aiqlickTokens.primary
      : aiqlickTokens.gray200;

  const openMenu = () => {
    const node = triggerRef.current;
    if (node && typeof node.measureInWindow === "function") {
      node.measureInWindow((x, y, w, h) => {
        setAnchor({ x, y, w, h });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  const screen = Dimensions.get("window");
  const spaceBelow = anchor ? screen.height - (anchor.y + anchor.h) : 0;
  // Flip upward only when there genuinely isn't room below but is above.
  const openUp =
    !!anchor &&
    spaceBelow < Math.min(MENU_MAX_HEIGHT, 160) &&
    anchor.y > spaceBelow;

  return (
    <YStack gap={4}>
      <RNView ref={triggerRef} collapsable={false}>
        <Pressable onPress={openMenu} accessibilityRole="button">
          <YStack
            height={52}
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
                left={14}
                top={7}
                fontSize={11}
                color={open ? aiqlickTokens.primary : aiqlickTokens.gray500}
                fontWeight="600"
                pointerEvents="none"
              >
                {label}
                {isRequired ? " *" : ""}
              </Text>
            )}
            <XStack
              alignItems="center"
              justifyContent="space-between"
              gap={6}
              paddingTop={16}
            >
              <Text
                fontSize={14}
                color={selected ? aiqlickTokens.textDark : aiqlickTokens.gray400}
                numberOfLines={1}
                flex={1}
                textAlign="left"
              >
                {selected?.label ?? "Select…"}
              </Text>
              <ChevronDown size={16} color={aiqlickTokens.gray500} />
            </XStack>
          </YStack>
        </Pressable>
      </RNView>

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          {anchor && (
            <Pressable
              onPress={(e) => e.stopPropagation?.()}
              style={{
                position: "absolute",
                left: anchor.x,
                width: anchor.w,
                ...(openUp
                  ? { bottom: screen.height - anchor.y + 4 }
                  : { top: anchor.y + anchor.h + 4 }),
              }}
            >
              <View
                maxHeight={MENU_MAX_HEIGHT}
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
                <ScrollView keyboardShouldPersistTaps="handled">
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
                          color={
                            isSel ? aiqlickTokens.primary : aiqlickTokens.textDark
                          }
                          fontWeight={isSel ? "600" : "500"}
                        >
                          {opt.label}
                        </Text>
                        {isSel && (
                          <Check size={14} color={aiqlickTokens.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </Pressable>
          )}
        </Pressable>
      </Modal>

      {errorText && (
        <Text fontSize={11} color={aiqlickTokens.danger} marginLeft={2}>
          {errorText}
        </Text>
      )}
    </YStack>
  );
}
