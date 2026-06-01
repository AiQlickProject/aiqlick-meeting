import { useState } from "react";
import { ApolloError } from "@apollo/client";
import { AlertCircle, ChevronDown, ChevronRight, Copy } from "@tamagui/lucide-icons";
import { Pressable } from "react-native";
import { View, XStack, YStack, Text } from "tamagui";

import { aiqlickTokens } from "@/tamagui.config";

interface Props {
  /**
   * Apollo error, native Error, or a custom shape. Anything truthy
   * gets rendered; falsy short-circuits to null so callers can
   * unconditionally embed `<ErrorDisplay error={error} />`.
   */
  error?: ApolloError | Error | null;
  /**
   * Optional intro shown above the structured fields. Use when the
   * surrounding context doesn't already imply what failed.
   */
  title?: string;
  /**
   * "card" (default) renders a full danger-toned card with chips and
   * details. "inline" renders a tighter single-line variant suitable
   * for inside a form row.
   */
  variant?: "card" | "inline";
}

interface NormalisedGraphqlError {
  message: string;
  code?: string;
  statusCode?: number | string;
  correlationId?: string;
  path?: ReadonlyArray<string | number>;
  details?: Record<string, unknown>;
  timestamp?: string;
}

interface NormalisedError {
  headline: string;
  graphqlErrors: NormalisedGraphqlError[];
  networkStatus?: number;
  networkMessage?: string;
}

/**
 * Unifies the three Apollo error shapes (graphQLErrors, networkError,
 * generic Error) into a flat structure we can render. We deliberately
 * keep the raw `message` field even when `code`/`statusCode` are
 * present — the message is often the most useful line.
 */
function normaliseError(error: ApolloError | Error | null | undefined): NormalisedError | null {
  if (!error) return null;
  const apollo = error as ApolloError;
  const isApollo = Array.isArray(apollo.graphQLErrors) || !!apollo.networkError;
  if (!isApollo) {
    return {
      headline: error.message || "Unknown error",
      graphqlErrors: [],
    };
  }
  const graphqlErrors: NormalisedGraphqlError[] = (apollo.graphQLErrors || []).map((e) => {
    const ext = (e.extensions ?? {}) as Record<string, unknown>;
    const details =
      typeof ext.details === "object" && ext.details !== null
        ? (ext.details as Record<string, unknown>)
        : undefined;
    return {
      message: e.message,
      code: typeof ext.code === "string" ? ext.code : undefined,
      statusCode:
        typeof ext.statusCode === "number" || typeof ext.statusCode === "string"
          ? (ext.statusCode as number | string)
          : undefined,
      correlationId:
        typeof ext.correlationId === "string" ? ext.correlationId : undefined,
      timestamp: typeof ext.timestamp === "string" ? ext.timestamp : undefined,
      path: e.path as ReadonlyArray<string | number> | undefined,
      details,
    };
  });
  const networkError = apollo.networkError as
    | (Error & { statusCode?: number; status?: number; result?: unknown })
    | null
    | undefined;
  return {
    headline:
      graphqlErrors[0]?.message ?? networkError?.message ?? apollo.message ?? "Request failed",
    graphqlErrors,
    networkStatus: networkError?.statusCode ?? networkError?.status,
    networkMessage: networkError?.message,
  };
}

export function ErrorDisplay({ error, title, variant = "card" }: Props) {
  const [open, setOpen] = useState(false);
  const norm = normaliseError(error);
  if (!norm) return null;

  if (variant === "inline") {
    const primary = norm.graphqlErrors[0];
    const code = primary?.code ?? (norm.networkStatus ? `HTTP_${norm.networkStatus}` : undefined);
    return (
      <XStack
        padding={8}
        gap={8}
        alignItems="center"
        borderRadius={6}
        backgroundColor={aiqlickTokens.dangerLight}
        borderWidth={1}
        borderColor="rgba(220, 38, 38, 0.3)"
      >
        <AlertCircle size={12} color={aiqlickTokens.danger} />
        <Text color={aiqlickTokens.danger} fontSize={11} flex={1} flexShrink={1}>
          {code ? `[${code}] ` : ""}
          {norm.headline}
        </Text>
      </XStack>
    );
  }

  return (
    <YStack
      padding={12}
      gap={10}
      borderRadius={10}
      backgroundColor={aiqlickTokens.dangerLight}
      borderWidth={1}
      borderColor="rgba(220, 38, 38, 0.3)"
    >
      <XStack alignItems="center" gap={8}>
        <AlertCircle size={14} color={aiqlickTokens.danger} />
        <Text color={aiqlickTokens.danger} fontSize={13} fontWeight="700">
          {title ?? "Something went wrong"}
        </Text>
      </XStack>

      {norm.graphqlErrors.length === 0 && (
        <YStack gap={6}>
          <Text color={aiqlickTokens.gray900} fontSize={12} fontWeight="600">
            {norm.headline}
          </Text>
          {norm.networkStatus != null && (
            <ChipRow>
              <Chip label={`HTTP ${norm.networkStatus}`} tone="danger" />
            </ChipRow>
          )}
        </YStack>
      )}

      {norm.graphqlErrors.map((e, i) => (
        <YStack key={i} gap={6}>
          <Text color={aiqlickTokens.gray900} fontSize={12} fontWeight="600">
            {e.message}
          </Text>
          <ChipRow>
            {e.code && <Chip label={e.code} tone="danger" />}
            {e.statusCode != null && <Chip label={`HTTP ${e.statusCode}`} tone="neutral" />}
            {e.path && e.path.length > 0 && (
              <Chip label={`path: ${e.path.join(".")}`} tone="neutral" />
            )}
          </ChipRow>
          {e.correlationId && <CorrelationIdRow id={e.correlationId} />}
          {(e.details || e.timestamp) && (
            <YStack gap={4}>
              <Pressable
                onPress={() => setOpen((v) => !v)}
                style={({ pressed, hovered }: any) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  alignSelf: "flex-start",
                  paddingVertical: 2,
                  opacity: pressed || hovered ? 0.7 : 1,
                })}
              >
                {open ? (
                  <ChevronDown size={11} color={aiqlickTokens.gray500} />
                ) : (
                  <ChevronRight size={11} color={aiqlickTokens.gray500} />
                )}
                <Text color={aiqlickTokens.gray700} fontSize={10} fontWeight="600">
                  {open ? "Hide details" : "Show details"}
                </Text>
              </Pressable>
              {open && (
                <View
                  padding={8}
                  borderRadius={6}
                  backgroundColor="rgba(15, 23, 42, 0.04)"
                  borderWidth={1}
                  borderColor="rgba(15, 23, 42, 0.08)"
                >
                  <Text
                    color={aiqlickTokens.gray700}
                    fontSize={10}
                    // @ts-expect-error rn-web monospace + wrap passthrough
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                    }}
                  >
                    {JSON.stringify(
                      { timestamp: e.timestamp, details: e.details },
                      null,
                      2,
                    )}
                  </Text>
                </View>
              )}
            </YStack>
          )}
        </YStack>
      ))}
    </YStack>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <XStack gap={6} flexWrap="wrap">
      {children}
    </XStack>
  );
}

function Chip({ label, tone }: { label: string; tone: "danger" | "neutral" }) {
  const palette =
    tone === "danger"
      ? {
          bg: "rgba(220, 38, 38, 0.10)",
          border: "rgba(220, 38, 38, 0.30)",
          text: aiqlickTokens.danger,
        }
      : {
          bg: "rgba(15, 23, 42, 0.05)",
          border: "rgba(15, 23, 42, 0.12)",
          text: aiqlickTokens.gray700,
        };
  return (
    <View
      paddingHorizontal={7}
      paddingVertical={2}
      borderRadius={999}
      backgroundColor={palette.bg}
      borderWidth={1}
      borderColor={palette.border}
    >
      <Text color={palette.text} fontSize={10} fontWeight="700" letterSpacing={0.4}>
        {label}
      </Text>
    </View>
  );
}

function CorrelationIdRow({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(id).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };
  return (
    <XStack alignItems="center" gap={6}>
      <Text color={aiqlickTokens.gray500} fontSize={10} fontWeight="600" letterSpacing={0.4}>
        REF
      </Text>
      <Text
        color={aiqlickTokens.gray700}
        fontSize={10}
        // @ts-expect-error rn-web monospace passthrough
        style={{
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        }}
        flexShrink={1}
        numberOfLines={1}
      >
        {id}
      </Text>
      <Pressable
        onPress={onCopy}
        accessibilityRole="button"
        accessibilityLabel="Copy correlation id"
        style={({ pressed, hovered }: any) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          paddingHorizontal: 5,
          paddingVertical: 2,
          borderRadius: 4,
          backgroundColor: pressed || hovered ? "rgba(15, 23, 42, 0.08)" : "transparent",
        })}
      >
        <Copy size={10} color={aiqlickTokens.gray500} />
        <Text color={aiqlickTokens.gray500} fontSize={10}>
          {copied ? "Copied" : "Copy"}
        </Text>
      </Pressable>
    </XStack>
  );
}
