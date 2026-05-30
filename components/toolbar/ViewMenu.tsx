import { Maximize2, LayoutGrid, User } from "@tamagui/lucide-icons";
import { Platform } from "react-native";
import { YStack } from "tamagui";

import type { LayoutMode } from "@/hooks/jitsi-types";

import MenuItem, { MenuSectionLabel } from "./MenuItem";

interface Props {
  layout: LayoutMode;
  onSetLayout: (mode: LayoutMode) => void;
  close: () => void;
}

export default function ViewMenu({ layout, onSetLayout, close }: Props) {
  const enterFullscreen = () => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    try {
      const el = document.documentElement;
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void el.requestFullscreen();
      }
    } catch {
      /* ignore — some browsers throw if not user-initiated */
    }
  };

  return (
    <YStack>
      <MenuSectionLabel>Layout</MenuSectionLabel>
      <MenuItem
        icon={<LayoutGrid size={16} color={layout === "tile" ? "#7091E6" : "#e5e7eb"} />}
        label="Gallery"
        description="Show everyone in a grid"
        selected={layout === "tile"}
        onPress={() => {
          onSetLayout("tile");
          close();
        }}
      />
      <MenuItem
        icon={<User size={16} color={layout === "speaker" ? "#7091E6" : "#e5e7eb"} />}
        label="Speaker"
        description="Focus on the active speaker"
        selected={layout === "speaker"}
        onPress={() => {
          onSetLayout("speaker");
          close();
        }}
      />
      {Platform.OS === "web" ? (
        <MenuItem
          icon={<Maximize2 size={16} color="#e5e7eb" />}
          label="Full screen"
          description="Hide the browser chrome"
          onPress={() => {
            enterFullscreen();
            close();
          }}
        />
      ) : null}
    </YStack>
  );
}
