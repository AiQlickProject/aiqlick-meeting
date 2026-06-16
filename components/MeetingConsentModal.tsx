import { Brain, Sparkles, X } from "@tamagui/lucide-icons";
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
 * privacy event for the speaker, so we surface the notice and
 * record their answer.
 *
 * **Does not technically mute anyone.** A previous version of this
 * flow force-muted users who declined, and re-muted them whenever
 * they tried to unmute. That silenced participants whose audio
 * was needed for the actual meeting (notably a candidate in an
 * interview on 2026-06-16 whose voice never reached Jigasi).
 * The choice is now informational — recorded for compliance, but
 * the user remains in full control of their mic.
 *
 * The modal is non-dismissable (no backdrop / X close) so the
 * consent is a deliberate choice rather than something the user
 * can ignore by clicking away.
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
            label="I do not consent"
            variant="ghost"
            color="default"
            size="md"
            icon={<X size={14} color={aiqlickTokens.gray700} />}
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
          We'll record your answer for our compliance log. If you do
          not consent, your audio still works — please remain quiet
          or mute yourself so your voice isn't transcribed.
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
        <BulletRow text="Your choice here is logged once per room, per browser." />
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
