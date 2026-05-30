import { YStack, Text } from "tamagui";

import type { AvailableDevices, MediaDevice, SelectedDevices } from "@/hooks/jitsi-types";

import MenuItem, { MenuSectionLabel, MenuSeparator } from "./MenuItem";

type Kind = "audio" | "video";

interface Props {
  kind: Kind;
  devices: AvailableDevices;
  selected: SelectedDevices;
  onPickAudioInput: (d: MediaDevice) => void;
  onPickAudioOutput: (d: MediaDevice) => void;
  onPickVideoInput: (d: MediaDevice) => void;
  close: () => void;
}

/**
 * Device picker shown by the caret half of a SplitToolbarButton.
 * For the mic caret we show audio inputs *and* outputs; for the camera
 * caret only video inputs. Output selection is fairly hidden in Teams
 * too — putting it under the mic feels natural.
 */
export default function DeviceMenu({
  kind,
  devices,
  selected,
  onPickAudioInput,
  onPickAudioOutput,
  onPickVideoInput,
  close,
}: Props) {
  if (kind === "video") {
    return (
      <YStack>
        <MenuSectionLabel>Camera</MenuSectionLabel>
        <DeviceList
          list={devices.videoInput}
          selectedId={selected.videoInput}
          onPick={(d) => {
            onPickVideoInput(d);
            close();
          }}
          emptyText="No cameras detected"
        />
      </YStack>
    );
  }

  return (
    <YStack>
      <MenuSectionLabel>Microphone</MenuSectionLabel>
      <DeviceList
        list={devices.audioInput}
        selectedId={selected.audioInput}
        onPick={(d) => {
          onPickAudioInput(d);
          close();
        }}
        emptyText="No microphones detected"
      />
      <MenuSeparator />
      <MenuSectionLabel>Speaker</MenuSectionLabel>
      <DeviceList
        list={devices.audioOutput}
        selectedId={selected.audioOutput}
        onPick={(d) => {
          onPickAudioOutput(d);
          close();
        }}
        emptyText="System default"
      />
    </YStack>
  );
}

function DeviceList({
  list,
  selectedId,
  onPick,
  emptyText,
}: {
  list: MediaDevice[];
  selectedId: string | null;
  onPick: (d: MediaDevice) => void;
  emptyText: string;
}) {
  if (list.length === 0) {
    return (
      <Text
        color="rgba(255,255,255,0.5)"
        fontSize={12}
        paddingHorizontal={10}
        paddingVertical={8}
      >
        {emptyText}
      </Text>
    );
  }
  return (
    <>
      {list.map((d) => (
        <MenuItem
          key={d.deviceId}
          label={d.label}
          selected={selectedId === d.deviceId}
          onPress={() => onPick(d)}
        />
      ))}
    </>
  );
}
