import { Platform } from "react-native";
import { AlertCircle, CreditCard, ExternalLink, RefreshCw } from "@tamagui/lucide-icons";
import { View, XStack, YStack, Text } from "tamagui";

import { TWButton } from "@/components/ux/TWButton";
import type { BillingErrorInfo } from "@/lib/billing/billingError";
import { extractCreditShortfall } from "@/lib/billing/billingError";
import { formatCredits } from "@/lib/billing/estimateInsightCost";
import { getBillingPageUrl, getCreditsPageUrl } from "@/lib/urls";
import { aiqlickTokens } from "@/tamagui.config";

interface Props {
  info: BillingErrorInfo;
  /** Optional Retry button — shown next to the recovery CTA. */
  onRetry?: () => void;
  retrying?: boolean;
}

/**
 * Recovery card for billing-related failures (INSUFFICIENT_CREDITS,
 * SUBSCRIPTION_INACTIVE, PLAN_LIMIT_EXCEEDED, INVALID_PLAN_PRICING).
 *
 * Shows the structured error + a single deep-link CTA aimed at the
 * right recovery page on the main aiqlick web app. We don't host a
 * BuyCreditsModal locally — auth carries on a JWT in the URL would
 * be a cross-domain risk; instead the user lands on the main app
 * (where they're already logged in) and completes the flow there.
 */
export function BillingBlock({ info, onRetry, retrying }: Props) {
  const { required, available } = extractCreditShortfall(info);

  const ctaLabel = (() => {
    switch (info.cta) {
      case "buy-credits":
        return "Buy credits";
      case "renew-subscription":
        return "Manage subscription";
      case "upgrade-plan":
        return "Upgrade plan";
      case "contact-support":
        return "Contact support";
    }
  })();

  const ctaUrl = (() => {
    switch (info.cta) {
      case "buy-credits":
        return getCreditsPageUrl();
      case "renew-subscription":
      case "upgrade-plan":
        return getBillingPageUrl();
      case "contact-support":
        return null; // Could mailto: support@ but keeping minimal for now.
    }
  })();

  const openCta = () => {
    if (!ctaUrl) return;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(ctaUrl, "_blank", "noopener,noreferrer");
    } else {
      // On native, expo-linking would handle this; the meeting client
      // is web-first today, so we no-op gracefully.
    }
  };

  return (
    <YStack
      padding={14}
      gap={12}
      borderRadius={10}
      backgroundColor={aiqlickTokens.dangerLight}
      borderWidth={1}
      borderColor="rgba(220, 38, 38, 0.3)"
    >
      <XStack gap={10} alignItems="flex-start">
        <View paddingTop={2}>
          <AlertCircle size={16} color={aiqlickTokens.danger} />
        </View>
        <YStack flex={1} gap={6}>
          <Text color={aiqlickTokens.danger} fontSize={13} fontWeight="700">
            {info.title}
          </Text>
          <Text color={aiqlickTokens.gray700} fontSize={12} lineHeight={18}>
            {info.description}
          </Text>
          {required != null && available != null && (
            <Text color={aiqlickTokens.gray600} fontSize={11}>
              Required: {formatCredits(required)} · Available: {formatCredits(available)} · Short by{" "}
              <Text color={aiqlickTokens.danger} fontSize={11} fontWeight="700">
                {formatCredits(Math.max(0, required - available))}
              </Text>
            </Text>
          )}
        </YStack>
      </XStack>

      <XStack gap={8} flexWrap="wrap">
        {ctaUrl && (
          <TWButton
            label={ctaLabel}
            variant="primary"
            color="primary"
            size="sm"
            icon={
              info.cta === "buy-credits" ? (
                <CreditCard size={14} color="#fff" />
              ) : (
                <ExternalLink size={14} color="#fff" />
              )
            }
            onPress={openCta}
          />
        )}
        {onRetry && (
          <TWButton
            label="Try again"
            variant="outline"
            color="default"
            size="sm"
            icon={<RefreshCw size={12} color={aiqlickTokens.gray700} />}
            onPress={onRetry}
            isLoading={!!retrying}
          />
        )}
      </XStack>
    </YStack>
  );
}
