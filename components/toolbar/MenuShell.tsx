import { type ReactNode, useEffect } from "react";
import { Platform, Pressable } from "react-native";
import { View, YStack } from "tamagui";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Distance from the button's *bottom* edge to the menu's bottom edge. */
  bottomOffset?: number;
  /** Horizontal anchor — pixels from the trigger's left edge. */
  leftOffset?: number;
  /** Width of the menu panel. */
  width?: number;
  /** Render the menu aligned right of the trigger instead of left. */
  alignRight?: boolean;
  children: ReactNode;
}

/**
 * Floating menu panel anchored to a toolbar button. Positioned absolutely
 * relative to its parent (the toolbar button wrapper), opening upward
 * because the toolbar lives at the bottom of the meeting stage. A full-
 * viewport backdrop captures outside clicks so the menu dismisses
 * cleanly on web.
 */
export default function MenuShell({
  open,
  onClose,
  bottomOffset = 52,
  leftOffset = 0,
  width = 240,
  alignRight,
  children,
}: Props) {
  // Close on Escape — standard menu behaviour on web.
  useEffect(() => {
    if (!open || Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <Pressable
        accessibilityElementsHidden
        onPress={onClose}
        style={{
          position: Platform.OS === "web" ? ("fixed" as never) : "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
        }}
      />
      <View
        position="absolute"
        bottom={bottomOffset}
        {...(alignRight ? { right: 0 } : { left: leftOffset })}
        zIndex={1000}
        pointerEvents="auto"
      >
        <YStack
          width={width}
          padding={6}
          borderRadius={12}
          backgroundColor="rgba(17, 24, 39, 0.98)"
          borderWidth={1}
          borderColor="rgba(255,255,255,0.08)"
          shadowColor="#000"
          shadowOpacity={0.55}
          shadowRadius={32}
          shadowOffset={{ width: 0, height: 14 }}
        >
          {children}
        </YStack>
      </View>
    </>
  );
}
