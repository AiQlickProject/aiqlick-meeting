import {
  AudioWaveform,
  Circle as Disc,
  Image as ImageIcon,
  LayoutGrid as Apps,
  Sparkles,
  Users2,
} from "@tamagui/lucide-icons";
import { Switch, YStack } from "tamagui";

import MenuItem, { MenuSectionLabel, MenuSeparator } from "./MenuItem";

interface Props {
  isBlurEnabled: boolean;
  isNoiseSuppressionOn: boolean;
  isInsightsOpen: boolean;
  onToggleBlur: () => void;
  onToggleNoiseSuppression: () => void;
  onToggleInsights: () => void;
  close: () => void;
}

export default function MoreMenu({
  isBlurEnabled,
  isNoiseSuppressionOn,
  isInsightsOpen,
  onToggleBlur,
  onToggleNoiseSuppression,
  onToggleInsights,
  close,
}: Props) {
  return (
    <YStack>
      <MenuSectionLabel>Video</MenuSectionLabel>
      <MenuItem
        icon={<ImageIcon size={16} color={isBlurEnabled ? "#7091E6" : "#e5e7eb"} />}
        label="Background blur"
        description="Hide what's behind you"
        rightSlot={
          <Switch
            size="$2"
            checked={isBlurEnabled}
            onCheckedChange={() => onToggleBlur()}
          >
            <Switch.Thumb animation="quick" />
          </Switch>
        }
        onPress={onToggleBlur}
        hideCheckmark
      />

      <MenuSectionLabel>Audio</MenuSectionLabel>
      <MenuItem
        icon={
          <AudioWaveform
            size={16}
            color={isNoiseSuppressionOn ? "#7091E6" : "#e5e7eb"}
          />
        }
        label="Noise suppression"
        description="Reduce background noise on your mic"
        rightSlot={
          <Switch
            size="$2"
            checked={isNoiseSuppressionOn}
            onCheckedChange={() => onToggleNoiseSuppression()}
          >
            <Switch.Thumb animation="quick" />
          </Switch>
        }
        onPress={onToggleNoiseSuppression}
        hideCheckmark
      />

      <MenuSeparator />

      <MenuItem
        icon={<Sparkles size={16} color={isInsightsOpen ? "#7091E6" : "#e5e7eb"} />}
        label="AI Insights"
        description="Summary, skills, topics, red flags"
        selected={isInsightsOpen}
        onPress={() => {
          onToggleInsights();
          close();
        }}
      />
      <MenuItem
        icon={<Disc size={16} color="#e5e7eb" />}
        label="Record meeting"
        description="Coming soon"
        disabled
      />
      <MenuItem
        icon={<Users2 size={16} color="#e5e7eb" />}
        label="Breakout rooms"
        description="Coming soon"
        disabled
      />
      <MenuItem
        icon={<Apps size={16} color="#e5e7eb" />}
        label="Apps"
        description="Coming soon"
        disabled
      />
    </YStack>
  );
}
