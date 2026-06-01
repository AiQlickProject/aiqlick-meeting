import { ActivityIndicator } from "react-native";
import { AlertCircle, Sparkles } from "@tamagui/lucide-icons";
import { View, XStack, YStack, Text } from "tamagui";

import { TWButton } from "@/components/ux/TWButton";
import { TWModal } from "@/components/ux/TWModal";
import { useUserAuth } from "@/contexts/UserAuthProvider";
import { useCreditBalance } from "@/lib/hooks/useCreditBalance";
import { useEstimateInsightCost } from "@/lib/hooks/useEstimateInsightCost";
import { formatCredits } from "@/lib/billing/estimateInsightCost";
import { aiqlickTokens } from "@/tamagui.config";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /**
   * `null` means "first-time generate" — the wording shifts from
   * "Regenerate" to "Generate" but the rest of the flow is the same.
   */
  currentVersion: number | null;
  /** Current transcript char count — drives the cost estimate. */
  transcriptChars: number | null | undefined;
  /** While the actual mutation is in-flight. Disables Continue. */
  submitting: boolean;
  /**
   * Optional name of the meeting organizer — shown in the "host is
   * not billed" line so users know who they're *not* charging.
   */
  organizerName?: string | null;
}

/**
 * Confirm dialog that fires before the insight generation mutation.
 * Shows the user:
 *   - what it'll cost (≈ X credits)
 *   - what they have right now
 *   - whose wallet pays (their own — personal or selected company)
 *   - explicit "the meeting organizer is not billed" line, because
 *     the prior UI made it look like the meeting host paid
 *
 * Continue calls `onConfirm()` and the parent fires the actual
 * `initializeMeetingInsight` mutation. Cancel just closes.
 */
export function RegenerateConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  currentVersion,
  transcriptChars,
  submitting,
  organizerName,
}: Props) {
  const { user } = useUserAuth();
  const { balance, loading: balanceLoading } = useCreditBalance();
  const { estimate, loading: estimateLoading } = useEstimateInsightCost(transcriptChars);

  const isFirstRun = currentVersion == null || currentVersion === 0;
  const balanceValue = balance?.balance ?? null;
  const estimateValue = estimate?.credits ?? null;
  const shortfall =
    estimateValue != null && balanceValue != null && estimateValue > balanceValue
      ? estimateValue - balanceValue
      : 0;

  // Charged-to label: personal vs the selected company.
  const chargedToLabel = user?.selectedCompanyId
    ? "Selected company account"
    : "Your personal account";

  return (
    <TWModal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      size="md"
      header={isFirstRun ? "Generate AI Insights" : `Regenerate insight (v${(currentVersion ?? 0) + 1})`}
      closeOnBackdrop={!submitting}
      footer={
        <>
          <TWButton
            label="Cancel"
            variant="ghost"
            color="default"
            size="md"
            onPress={onClose}
            disabled={submitting}
          />
          <TWButton
            label={
              submitting
                ? "Starting…"
                : shortfall > 0
                  ? "Continue anyway"
                  : isFirstRun
                    ? "Generate"
                    : "Regenerate"
            }
            variant="primary"
            color="primary"
            size="md"
            icon={
              submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Sparkles size={14} color="#fff" />
              )
            }
            onPress={onConfirm}
            disabled={submitting}
          />
        </>
      }
    >
      {/* Headline copy: who pays + what it costs */}
      <YStack gap={6}>
        <Text color={aiqlickTokens.gray700} fontSize={13} lineHeight={20}>
          This will run a new AI analysis on the meeting transcript. The credits are charged to{" "}
          <Text color={aiqlickTokens.textDark} fontSize={13} fontWeight="700">
            {chargedToLabel}
          </Text>
          {" "}— whichever wallet is active for you right now.
        </Text>
        <Text color={aiqlickTokens.gray500} fontSize={12} lineHeight={18}>
          The meeting organizer{organizerName ? ` (${organizerName})` : ""} is not billed for this action.
        </Text>
      </YStack>

      {/* Cost + balance summary */}
      <YStack
        gap={8}
        padding={14}
        borderRadius={10}
        backgroundColor={aiqlickTokens.gray50}
        borderWidth={1}
        borderColor={aiqlickTokens.gray200}
      >
        <SummaryRow
          label="Estimated cost"
          value={
            estimateLoading
              ? "…"
              : estimate?.credits != null
                ? `≈ ${formatCredits(estimate.credits)}`
                : "—"
          }
          emphasised
        />
        <SummaryRow
          label="Your balance"
          value={
            balanceLoading
              ? "…"
              : balanceValue != null
                ? formatCredits(balanceValue)
                : "—"
          }
        />
        {estimate?.basis && (
          <SummaryRow
            label="Model"
            value={estimate.basis.displayName ?? estimate.basis.modelId}
            muted
          />
        )}
      </YStack>

      {/* Shortfall warning */}
      {shortfall > 0 && (
        <XStack
          gap={8}
          padding={10}
          alignItems="flex-start"
          borderRadius={8}
          backgroundColor={aiqlickTokens.dangerLight}
          borderWidth={1}
          borderColor="rgba(220, 38, 38, 0.3)"
        >
          <View paddingTop={2}>
            <AlertCircle size={14} color={aiqlickTokens.danger} />
          </View>
          <YStack flex={1} gap={2}>
            <Text color={aiqlickTokens.danger} fontSize={12} fontWeight="700">
              Not enough credits
            </Text>
            <Text color={aiqlickTokens.gray700} fontSize={11} lineHeight={16}>
              You'll need about {formatCredits(shortfall)} more. The generation may fail with an
              "Insufficient credits" error — you can top up first via the credits page.
            </Text>
          </YStack>
        </XStack>
      )}

      {/* Estimate caveat */}
      <Text color={aiqlickTokens.gray500} fontSize={11} lineHeight={16}>
        The estimate is based on the current transcript length and the model's per-token
        pricing. The actual charge can differ slightly depending on how much the model
        writes back.
      </Text>
    </TWModal>
  );
}

function SummaryRow({
  label,
  value,
  emphasised,
  muted,
}: {
  label: string;
  value: string;
  emphasised?: boolean;
  muted?: boolean;
}) {
  return (
    <XStack alignItems="baseline" justifyContent="space-between" gap={12}>
      <Text
        color={muted ? aiqlickTokens.gray500 : aiqlickTokens.gray600}
        fontSize={11}
        fontWeight="600"
        letterSpacing={0.6}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        color={emphasised ? aiqlickTokens.textDark : aiqlickTokens.gray700}
        fontSize={emphasised ? 14 : 12}
        fontWeight={emphasised ? "700" : "600"}
      >
        {value}
      </Text>
    </XStack>
  );
}
