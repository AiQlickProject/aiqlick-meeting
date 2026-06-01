import { Brain, MicOff, Sparkles } from "@tamagui/lucide-icons";
import { View, XStack, YStack, Text } from "tamagui";

import { TWButton } from "@/components/ux/TWButton";
import { TWModal } from "@/components/ux/TWModal";
import { aiqlickTokens } from "@/tamagui.config";

interface Props {
  isOpen: boolean;
  /**
   * `onAgree` and `onDecline` are intentionally separate (rather
   * than a single onSubmit(boolean)) because the wording on the
   * modal's two buttons is asymmetric — "Continue with mic" vs
   * "Stay muted" — and they correspond to materially different
   * downstream behaviour.
   */
  onAgree: () => void;
  onDecline: () => void;
}

/**
 * Consent gate shown when a participant joins a meeting room.
 *
 * The meeting transcript is captured and analysed by AI to produce
 * meeting insights (summaries, action items, etc.). That's a clear
 * privacy event for the speaker, so we ask before letting them
 * unmute — they can stay muted and still see/hear the meeting if
 * they decline.
 *
 * The modal is intentionally non-dismissable (no backdrop / X
 * close): the user has to make a choice, because either choice
 * is a deliberate decision about their voice data.
 */
export function MeetingConsentModal({ isOpen, onAgree, onDecline }: Props) {
  return (
    <TWModal
      isOpen={isOpen}
      onClose={() => {
        /* no-op — user must pick agree or decline */
      }}
      size="md"
      closeOnBackdrop={false}
      header={
        <XStack alignItems="center" gap={10}>
          <View
            width={32}
            height={32}
            borderRadius={9999}
            backgroundColor="rgba(112,145,230,0.12)"
            borderWidth={1}
            borderColor="rgba(112,145,230,0.30)"
            alignItems="center"
            justifyContent="center"
          >
            <Brain size={16} color={aiqlickTokens.primary} />
          </View>
          <Text color={aiqlickTokens.textDark} fontSize={16} fontWeight="700">
            This meeting uses AI transcription
          </Text>
        </XStack>
      }
      footer={
        <>
          <TWButton
            label="Stay muted"
            variant="ghost"
            color="default"
            size="md"
            icon={<MicOff size={14} color={aiqlickTokens.gray700} />}
            onPress={onDecline}
          />
          <TWButton
            label="I agree — continue"
            variant="primary"
            color="primary"
            size="md"
            icon={<Sparkles size={14} color="#fff" />}
            onPress={onAgree}
          />
        </>
      }
    >
      <YStack gap={10}>
        <Text color={aiqlickTokens.gray700} fontSize={13} lineHeight={20}>
          The audio and speech in this meeting will be transcribed and
          analysed by AI to generate meeting insights — summaries,
          action items, key discussion points, and similar.
        </Text>
        <Text color={aiqlickTokens.gray700} fontSize={13} lineHeight={20}>
          To take part in the conversation, you'll need to agree. If you
          prefer not to, you can stay muted and still see and hear the
          meeting; you just won't be able to speak.
        </Text>
      </YStack>

      <YStack
        gap={6}
        padding={12}
        borderRadius={10}
        backgroundColor={aiqlickTokens.gray50}
        borderWidth={1}
        borderColor={aiqlickTokens.gray200}
      >
        <Text color={aiqlickTokens.gray600} fontSize={11} fontWeight="700" letterSpacing={0.6}>
          WHAT THIS MEANS
        </Text>
        <BulletRow text="Your voice is recorded as text for the transcript." />
        <BulletRow text="An AI model reads the transcript to produce insights." />
        <BulletRow text="You can change your mind during the meeting via the consent banner." />
      </YStack>
    </TWModal>
  );
}

function BulletRow({ text }: { text: string }) {
  return (
    <XStack alignItems="flex-start" gap={8}>
      <View
        width={4}
        height={4}
        borderRadius={9999}
        backgroundColor={aiqlickTokens.primary}
        marginTop={7}
        flexShrink={0}
      />
      <Text color={aiqlickTokens.gray700} fontSize={12} lineHeight={18} flex={1}>
        {text}
      </Text>
    </XStack>
  );
}
