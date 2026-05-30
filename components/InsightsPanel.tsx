import { useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Brain, Sparkles, X, RefreshCw, AlertCircle } from "@tamagui/lucide-icons";
import { ActivityIndicator, Pressable } from "react-native";
import { ScrollView, View, XStack, YStack, Text } from "tamagui";

import { TWButton } from "@/components/ux/TWButton";
import { TWChip } from "@/components/ux/TWChip";
import {
  GET_LATEST_MEETING_INSIGHT,
  INITIALIZE_MEETING_INSIGHT,
  type GetLatestMeetingInsightResult,
  type InitializeMeetingInsightResult,
  type MeetingInsight,
} from "@/graphql/operations/insights";
import { aiqlickTokens } from "@/tamagui.config";

interface Props {
  meetingId: string | null;
  interviewId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Right-rail AI Insights panel. Replaces the in-iframe panel from
 * the aiqlick Jitsi-Web fork so the UX lives in our chrome.
 *
 *   • "Generate Insights" kicks off `initializeMeetingInsight`.
 *   • While generating we poll `latestMeetingInsight` every 4 s.
 *   • Sections rendered: full report, skills, communication,
 *     key topics, red flags. Each renders as Markdown-ish text
 *     (no MD parser — backend returns plaintext with line breaks).
 *   • Errors surface inline; users can hit Regenerate to retry.
 */
export default function InsightsPanel({ meetingId, interviewId, isOpen, onClose }: Props) {
  const { data, refetch, loading, error, startPolling, stopPolling } =
    useQuery<GetLatestMeetingInsightResult>(GET_LATEST_MEETING_INSIGHT, {
      variables: { meetingId },
      skip: !isOpen || !meetingId,
      fetchPolicy: "cache-and-network",
      errorPolicy: "ignore",
    });

  const insight = data?.latestMeetingInsight ?? null;
  const status = insight?.status;
  const isGenerating = status === "PENDING" || status === "GENERATING" || status === "PROCESSING";

  // Start/stop polling based on whether an active generation is in
  // flight. Matches the heuristic in aiqlick-frontend's
  // `useMeetingInsights` without the streaming-subscription complexity.
  useEffect(() => {
    if (isGenerating) {
      startPolling(4000);
    } else {
      stopPolling();
    }
    return () => {
      stopPolling();
    };
  }, [isGenerating, startPolling, stopPolling]);

  const [initialize, { loading: initializing }] = useMutation<InitializeMeetingInsightResult>(
    INITIALIZE_MEETING_INSIGHT,
  );

  const onGenerate = async () => {
    if (!meetingId) return;
    try {
      await initialize({
        variables: { input: { meetingId, interviewId: interviewId ?? null } },
      });
      await refetch();
      startPolling(4000);
    } catch {
      /* error surfaced via the query refetch / latest insight */
    }
  };

  if (!isOpen) return null;

  return (
    <YStack
      flex={1}
      backgroundColor="rgba(11, 18, 32, 0.97)"
      borderLeftWidth={1}
      borderColor="rgba(255,255,255,0.08)"
    >
      <XStack
        height={56}
        paddingHorizontal={16}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderColor="rgba(255,255,255,0.08)"
      >
        <XStack alignItems="center" gap={8}>
          <View
            width={26}
            height={26}
            borderRadius={8}
            backgroundColor={aiqlickTokens.primary}
            alignItems="center"
            justifyContent="center"
          >
            <Sparkles size={14} color="#fff" />
          </View>
          <Text color="#fff" fontSize={14} fontWeight="700">
            AI Insights
          </Text>
          {insight ? (
            <TWChip
              label={`v${insight.version}`}
              color="primary"
              variant="flat"
              size="sm"
            />
          ) : null}
        </XStack>
        <Pressable
          onPress={onClose}
          hitSlop={6}
          style={({ pressed, hovered }) => ({
            width: 28,
            height: 28,
            borderRadius: 6,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed || hovered ? "rgba(255,255,255,0.08)" : "transparent",
          })}
        >
          <X size={14} color="#e5e7eb" />
        </Pressable>
      </XStack>

      <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {!meetingId && <MissingMeetingIdState />}

        {meetingId && loading && !data && (
          <YStack alignItems="center" paddingVertical={32}>
            <ActivityIndicator color="#7091E6" />
          </YStack>
        )}

        {meetingId && error && !insight && !isGenerating && (
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        )}

        {meetingId && !loading && !insight && !isGenerating && (
          <EmptyState onGenerate={onGenerate} loading={initializing} />
        )}

        {meetingId && isGenerating && <GeneratingState />}

        {meetingId && insight?.status === "FAILED" && (
          <FailureState
            message={insight.errorMessage}
            onRetry={onGenerate}
            retrying={initializing}
          />
        )}

        {meetingId && insight?.status === "COMPLETED" && (
          <ResultsView insight={insight} onRegenerate={onGenerate} regenerating={initializing} />
        )}
      </ScrollView>
    </YStack>
  );
}

function MissingMeetingIdState() {
  return (
    <YStack alignItems="center" paddingVertical={32} gap={12}>
      <View
        width={64}
        height={64}
        borderRadius={9999}
        alignItems="center"
        justifyContent="center"
        backgroundColor="rgba(112, 145, 230, 0.12)"
      >
        <Brain size={28} color="#7091E6" />
      </View>
      <YStack gap={4} alignItems="center">
        <Text color="#fff" fontSize={13} fontWeight="700">
          AI Insights unavailable
        </Text>
        <Text color="rgba(255,255,255,0.6)" fontSize={11} textAlign="center" maxWidth={260}>
          Join this meeting from the aiqlick Meetings list to enable AI-powered insights for this conversation.
        </Text>
      </YStack>
    </YStack>
  );
}

function EmptyState({ onGenerate, loading }: { onGenerate: () => void; loading: boolean }) {
  return (
    <YStack alignItems="center" paddingVertical={32} gap={12}>
      <View
        width={64}
        height={64}
        borderRadius={9999}
        alignItems="center"
        justifyContent="center"
        backgroundColor="rgba(112, 145, 230, 0.15)"
      >
        <Brain size={28} color="#7091E6" />
      </View>
      <YStack gap={4} alignItems="center">
        <Text color="#fff" fontSize={14} fontWeight="700">
          Generate AI insights
        </Text>
        <Text color="rgba(255,255,255,0.6)" fontSize={12} textAlign="center" maxWidth={260}>
          Summarise this meeting's skills, communication, key topics, and red flags.
        </Text>
      </YStack>
      <TWButton
        label="Generate Insights"
        variant="primary"
        color="primary"
        size="md"
        icon={<Sparkles size={14} color="#fff" />}
        isLoading={loading}
        onPress={onGenerate}
      />
    </YStack>
  );
}

function GeneratingState() {
  return (
    <YStack alignItems="center" paddingVertical={32} gap={12}>
      <ActivityIndicator color="#7091E6" />
      <YStack gap={4} alignItems="center">
        <Text color="#fff" fontSize={13} fontWeight="600">
          Working on your insights…
        </Text>
        <Text color="rgba(255,255,255,0.6)" fontSize={11} textAlign="center">
          The AI is reading the transcript. This usually takes 30-60 seconds.
        </Text>
      </YStack>
    </YStack>
  );
}

function FailureState({
  message,
  onRetry,
  retrying,
}: {
  message: string | null;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <YStack gap={12}>
      <YStack
        padding={12}
        gap={6}
        borderRadius={10}
        backgroundColor="rgba(220, 38, 38, 0.15)"
        borderWidth={1}
        borderColor="rgba(220, 38, 38, 0.35)"
      >
        <XStack alignItems="center" gap={6}>
          <AlertCircle size={14} color="#fca5a5" />
          <Text color="#fca5a5" fontSize={12} fontWeight="700">
            Generation failed
          </Text>
        </XStack>
        {message && (
          <Text color="rgba(255,255,255,0.85)" fontSize={11}>
            {message}
          </Text>
        )}
      </YStack>
      <TWButton
        label="Try again"
        variant="primary"
        color="primary"
        size="sm"
        icon={<RefreshCw size={12} color="#fff" />}
        isLoading={retrying}
        onPress={onRetry}
      />
    </YStack>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <YStack gap={12}>
      <Text color="#fca5a5" fontSize={12}>
        {message}
      </Text>
      <TWButton label="Retry" variant="outline" color="primary" size="sm" onPress={onRetry} />
    </YStack>
  );
}

function formatBody(body: any): string {
  if (!body) return "";
  if (typeof body === "string") return body;

  try {
    const formatValue = (val: any, depth = 0): string => {
      const indent = "  ".repeat(depth);
      if (val === null || val === undefined) return "";

      if (Array.isArray(val)) {
        if (val.length === 0) return "None";
        return val
          .map((item) => {
            if (typeof item === "object") {
              return formatValue(item, depth);
            }
            return `${indent}• ${item}`;
          })
          .join("\n");
      }

      if (typeof val === "object") {
        return Object.entries(val)
          .map(([key, value]) => {
            const formattedKey = key
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());

            if (typeof value === "object" && value !== null) {
              const inner = formatValue(value, depth + 1);
              return `${indent}${formattedKey}:\n${inner}`;
            }
            return `${indent}${formattedKey}: ${value}`;
          })
          .join("\n");
      }

      return `${indent}${val}`;
    };

    return formatValue(body);
  } catch {
    return JSON.stringify(body, null, 2);
  }
}

function ResultsView({
  insight,
  onRegenerate,
  regenerating,
}: {
  insight: MeetingInsight;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const sections: Array<{ title: string; body: any }> = [
    { title: "Overview", body: insight.fullReport },
    { title: "Skills assessment", body: insight.skillsAssessment },
    { title: "Communication", body: insight.communicationAnalysis },
    { title: "Key topics", body: insight.keyTopicsSummary },
    { title: "Red flags", body: insight.redFlagsAndConcerns },
  ];
  return (
    <YStack gap={14}>
      <XStack alignItems="center" justifyContent="space-between">
        <YStack gap={2}>
          <Text color="rgba(255,255,255,0.7)" fontSize={10} fontWeight="700" letterSpacing={1}>
            GENERATED
          </Text>
          <Text color="#fff" fontSize={12}>
            {insight.generatedAt ? new Date(insight.generatedAt).toLocaleString() : "—"}
          </Text>
        </YStack>
        <TWButton
          label="Regenerate"
          variant="ghost"
          color="default"
          size="sm"
          icon={<RefreshCw size={12} color="#e5e7eb" />}
          isLoading={regenerating}
          onPress={onRegenerate}
        />
      </XStack>

      {sections.map((s) => {
        const formattedBody = formatBody(s.body);
        return formattedBody ? (
          <YStack key={s.title} gap={6}>
            <Text color="rgba(255,255,255,0.7)" fontSize={10} fontWeight="700" letterSpacing={1}>
              {s.title.toUpperCase()}
            </Text>
            <Text color="#fff" fontSize={12} lineHeight={18}>
              {formattedBody}
            </Text>
          </YStack>
        ) : null;
      })}
    </YStack>
  );
}
