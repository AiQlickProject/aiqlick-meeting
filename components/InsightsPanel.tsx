import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Brain,
  Sparkles,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Lightbulb,
  ShieldAlert,
  Clock,
  Cpu,
  FileText,
  ChevronRight,
  Target,
  Users,
  TrendingUp,
  Download,
} from "@tamagui/lucide-icons";
import { Platform } from "react-native";
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

// ─── Colour palette ──────────────────────────────────────────────────────────
const C = {
  primary: "#7091E6",
  primaryDim: "rgba(112,145,230,0.15)",
  primaryBorder: "rgba(112,145,230,0.3)",
  surface: "rgba(255,255,255,0.04)",
  surfaceHover: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.08)",
  textPrimary: "#f1f5f9",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.35)",
  green: "#34d399",
  greenDim: "rgba(52,211,153,0.12)",
  greenBorder: "rgba(52,211,153,0.3)",
  yellow: "#fbbf24",
  yellowDim: "rgba(251,191,36,0.12)",
  yellowBorder: "rgba(251,191,36,0.3)",
  red: "#f87171",
  redDim: "rgba(248,113,113,0.12)",
  redBorder: "rgba(248,113,113,0.3)",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.12)",
  purpleBorder: "rgba(167,139,250,0.3)",
  blue: "#60a5fa",
  blueDim: "rgba(96,165,250,0.12)",
  blueBorder: "rgba(96,165,250,0.3)",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function safeJson(raw: any): any {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return raw; }
}

function severityColor(sev: string | undefined) {
  const s = (sev ?? "").toUpperCase();
  if (s === "HIGH" || s === "CRITICAL") return { text: C.red, bg: C.redDim, border: C.redBorder };
  if (s === "MEDIUM") return { text: C.yellow, bg: C.yellowDim, border: C.yellowBorder };
  return { text: C.green, bg: C.greenDim, border: C.greenBorder };
}

function outcomeColor(outcome: string | undefined) {
  const o = (outcome ?? "").toUpperCase();
  if (o.includes("SUCCESS") || o.includes("ACHIEVED") || o.includes("POSITIVE")) return { text: C.green, bg: C.greenDim, border: C.greenBorder };
  if (o.includes("FAIL") || o.includes("NEGATIVE")) return { text: C.red, bg: C.redDim, border: C.redBorder };
  return { text: C.yellow, bg: C.yellowDim, border: C.yellowBorder };
}

function scoreColor(score: number, max = 10) {
  const ratio = score / max;
  if (ratio >= 0.7) return C.green;
  if (ratio >= 0.4) return C.yellow;
  return C.red;
}

// ─── Primitive components ─────────────────────────────────────────────────────
function SectionCard({ children, gap = 10 }: { children: React.ReactNode; gap?: number }) {
  return (
    <YStack
      backgroundColor={C.surface}
      borderRadius={12}
      borderWidth={1}
      borderColor={C.border}
      padding={14}
      gap={gap}
    >
      {children}
    </YStack>
  );
}

function SectionHeader({
  icon,
  title,
  iconColor = C.primary,
  iconBg = C.primaryDim,
}: {
  icon: React.ReactNode;
  title: string;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <XStack alignItems="center" gap={8}>
      <View
        width={26}
        height={26}
        borderRadius={7}
        backgroundColor={iconBg}
        alignItems="center"
        justifyContent="center"
      >
        {icon}
      </View>
      <Text color={C.textPrimary} fontSize={12} fontWeight="700" letterSpacing={0.3}>
        {title}
      </Text>
    </XStack>
  );
}

function Pill({
  label,
  color,
  bg,
  border,
}: {
  label: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <View
      paddingHorizontal={8}
      paddingVertical={3}
      borderRadius={999}
      backgroundColor={bg}
      borderWidth={1}
      borderColor={border}
    >
      <Text color={color} fontSize={10} fontWeight="700" letterSpacing={0.5}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function ScoreBadge({ score, max = 10 }: { score: number; max?: number }) {
  const color = scoreColor(score, max);
  return (
    <XStack alignItems="baseline" gap={2}>
      <Text color={color} fontSize={18} fontWeight="800">{score}</Text>
      <Text color={C.textMuted} fontSize={10}>/{max}</Text>
    </XStack>
  );
}

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = scoreColor(score, max);
  return (
    <View height={4} borderRadius={999} backgroundColor={C.border} overflow="hidden">
      <View height={4} width={`${pct}%` as any} borderRadius={999} backgroundColor={color} />
    </View>
  );
}

function Divider() {
  return <View height={1} backgroundColor={C.border} />;
}

/**
 * Normalises a list entry that may be either a plain string OR a
 * structured object (e.g. `{ decision, context }` for key decisions).
 * Returns `{ primary, secondary }` so the renderer can stack the two
 * lines without leaking `[object Object]` for the object shape.
 */
function normalizeBulletItem(item: unknown): { primary: string; secondary?: string } {
  if (item == null) return { primary: "" };
  if (typeof item === "string") return { primary: item };
  if (typeof item === "object") {
    const o = item as Record<string, unknown>;
    const primary =
      (o.decision as string) ??
      (o.action as string) ??
      (o.point as string) ??
      (o.text as string) ??
      (o.title as string) ??
      (o.name as string) ??
      (o.description as string) ??
      "";
    const secondary =
      (o.context as string) ??
      (o.detail as string) ??
      (o.note as string) ??
      undefined;
    if (primary) return { primary, secondary };
    // Fallback — pretty-print the object so we never show
    // "[object Object]" to the user.
    try {
      return { primary: JSON.stringify(item) };
    } catch {
      return { primary: "" };
    }
  }
  return { primary: String(item) };
}

function BulletList({ items }: { items: unknown[] }) {
  if (!items?.length) return <Text color={C.textMuted} fontSize={11}>None</Text>;
  return (
    <YStack gap={5}>
      {items.map((item, i) => {
        const { primary, secondary } = normalizeBulletItem(item);
        return (
          <XStack key={i} gap={7} alignItems="flex-start">
            <View width={4} height={4} borderRadius={999} backgroundColor={C.primary} marginTop={5} flexShrink={0} />
            <YStack flex={1} gap={2}>
              <Text color={C.textSecondary} fontSize={11} lineHeight={17}>{primary}</Text>
              {secondary ? (
                <Text color={C.textMuted} fontSize={10} lineHeight={14} fontStyle="italic">
                  {secondary}
                </Text>
              ) : null}
            </YStack>
          </XStack>
        );
      })}
    </YStack>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text color={C.textMuted} fontSize={10} fontWeight="700" letterSpacing={0.8}>
      {children.toUpperCase()}
    </Text>
  );
}

function MetaChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <XStack
      alignItems="center"
      gap={5}
      paddingHorizontal={8}
      paddingVertical={4}
      borderRadius={8}
      backgroundColor={C.surface}
      borderWidth={1}
      borderColor={C.border}
    >
      {icon}
      <Text color={C.textSecondary} fontSize={10}>{label}</Text>
    </XStack>
  );
}

// ─── Section renderers ────────────────────────────────────────────────────────

function OverviewSection({ data }: { data: any }) {
  if (!data) return null;
  const outcome = data.outcome ?? data.Outcome;
  const purpose = data.purpose ?? data.Purpose;
  const summary = data.summary ?? data.Summary;
  // `key_decisions` comes through as either string[] (older payloads)
  // or [{ decision, context }, ...] (current LLM template). The
  // BulletList renderer handles both shapes via normalizeBulletItem.
  const keyDecisions: unknown[] = data.key_decisions ?? data["Key Decisions"] ?? [];
  const durationAssessment = data.duration_assessment ?? data["Duration Assessment"];

  const oc = outcomeColor(outcome);

  return (
    <SectionCard>
      <SectionHeader icon={<Target size={13} color={C.primary} />} title="Overview" />
      <Divider />

      {/* Outcome + Purpose */}
      <XStack gap={8} flexWrap="wrap">
        {outcome && (
          <Pill label={outcome} color={oc.text} bg={oc.bg} border={oc.border} />
        )}
      </XStack>

      {purpose && (
        <YStack gap={3}>
          <Label>Purpose</Label>
          <Text color={C.textSecondary} fontSize={11} lineHeight={17}>{purpose}</Text>
        </YStack>
      )}

      {summary && (
        <YStack gap={3}>
          <Label>Summary</Label>
          <Text color={C.textSecondary} fontSize={11} lineHeight={17}>{summary}</Text>
        </YStack>
      )}

      {Array.isArray(keyDecisions) && keyDecisions.length > 0 && (
        <YStack gap={6}>
          <Label>Key Decisions</Label>
          <BulletList items={keyDecisions} />
        </YStack>
      )}

      {durationAssessment && (
        <YStack gap={3}>
          <Label>Duration Assessment</Label>
          <Text color={C.textSecondary} fontSize={11} lineHeight={17}>{durationAssessment}</Text>
        </YStack>
      )}
    </SectionCard>
  );
}

function SkillsSection({ data }: { data: any }) {
  if (!data) return null;
  const outcome = data.outcome ?? data.Outcome;
  const purpose = data.purpose ?? data.Purpose;
  const summary = data.summary ?? data.Summary;
  const keyDecisions: unknown[] = data.key_decisions ?? data["Key Decisions"] ?? [];

  const oc = outcomeColor(outcome);

  return (
    <SectionCard>
      <SectionHeader icon={<TrendingUp size={13} color={C.purple} />} title="Skills Assessment" iconColor={C.purple} iconBg={C.purpleDim} />
      <Divider />

      {outcome && (
        <XStack gap={8}>
          <Pill label={`Outcome: ${outcome}`} color={oc.text} bg={oc.bg} border={oc.border} />
        </XStack>
      )}

      {purpose && (
        <YStack gap={3}>
          <Label>Purpose</Label>
          <Text color={C.textSecondary} fontSize={11} lineHeight={17}>{purpose}</Text>
        </YStack>
      )}

      {summary && (
        <YStack gap={3}>
          <Label>Summary</Label>
          <Text color={C.textSecondary} fontSize={11} lineHeight={17}>{summary}</Text>
        </YStack>
      )}

      {Array.isArray(keyDecisions) && keyDecisions.length > 0 && (
        <YStack gap={6}>
          <Label>Key Decisions</Label>
          <BulletList items={keyDecisions} />
        </YStack>
      )}
    </SectionCard>
  );
}

function CommunicationSection({ data }: { data: any }) {
  if (!data) return null;

  const clarityScore: number = data.clarity_score ?? data["Clarity Score"] ?? 0;
  const engagementScore: number = data.engagement_score ?? data["Engagement Score"] ?? 0;
  const collaborationScore: number = data.collaboration_score ?? data["Collaboration Score"] ?? 0;
  const quotes: string[] = data.notable_quotes ?? data["Notable Quotes"] ?? [];
  const contributors: string[] = data.key_contributors ?? data["Key Contributors"] ?? [];
  const issues: string[] = data.communication_issues ?? data["Communication Issues"] ?? [];
  const highlights: string[] = data.communication_highlights ?? data["Communication Highlights"] ?? [];

  const scores = [
    { label: "Clarity", score: clarityScore },
    { label: "Engagement", score: engagementScore },
    { label: "Collaboration", score: collaborationScore },
  ];

  return (
    <SectionCard>
      <SectionHeader icon={<MessageSquare size={13} color={C.blue} />} title="Communication" iconColor={C.blue} iconBg={C.blueDim} />
      <Divider />

      {/* Score grid */}
      <YStack gap={8}>
        {scores.map(({ label, score }) => (
          <YStack key={label} gap={5}>
            <XStack justifyContent="space-between" alignItems="center">
              <Label>{label}</Label>
              <ScoreBadge score={score} />
            </XStack>
            <ScoreBar score={score} />
          </YStack>
        ))}
      </YStack>

      {contributors.length > 0 && (
        <>
          <Divider />
          <YStack gap={6}>
            <SectionHeader icon={<Users size={11} color={C.primary} />} title="Key Contributors" iconBg="transparent" />
            <XStack flexWrap="wrap" gap={6}>
              {contributors.map((c, i) => (
                <View key={i} paddingHorizontal={8} paddingVertical={3} borderRadius={999} backgroundColor={C.primaryDim} borderWidth={1} borderColor={C.primaryBorder}>
                  <Text color={C.primary} fontSize={10} fontWeight="600">{String(c)}</Text>
                </View>
              ))}
            </XStack>
          </YStack>
        </>
      )}

      {quotes.length > 0 && (
        <>
          <Divider />
          <YStack gap={6}>
            <Label>Notable Quotes</Label>
            {quotes.map((q, i) => (
              <View key={i} paddingHorizontal={10} paddingVertical={7} borderRadius={8} backgroundColor={C.primaryDim} borderLeftWidth={2} borderColor={C.primary}>
                <Text color={C.textPrimary} fontSize={11} lineHeight={17} fontStyle="italic">"{String(q)}"</Text>
              </View>
            ))}
          </YStack>
        </>
      )}

      {highlights.length > 0 && (
        <>
          <Divider />
          <YStack gap={6}>
            <Label>Highlights</Label>
            <BulletList items={highlights} />
          </YStack>
        </>
      )}

      {issues.length > 0 && (
        <>
          <Divider />
          <YStack gap={6}>
            <Label>Issues</Label>
            <BulletList items={issues} />
          </YStack>
        </>
      )}
    </SectionCard>
  );
}

function TopicsSection({ data }: { data: any }) {
  if (!data) return null;

  const questionsRaised: string[] = data.questions_raised ?? data["Questions Raised"] ?? [];
  const topicsDiscussed: any[] = data.topics_discussed ?? data["Topics Discussed"] ?? [];
  const topicsNotCovered: string[] = data.topics_not_covered ?? data["Topics Not Covered"] ?? [];

  return (
    <SectionCard>
      <SectionHeader icon={<Lightbulb size={13} color={C.yellow} />} title="Key Topics" iconColor={C.yellow} iconBg={C.yellowDim} />
      <Divider />

      {topicsDiscussed.length > 0 && (
        <YStack gap={8}>
          <Label>Discussed</Label>
          {topicsDiscussed.map((topic, i) => {
            const topicName = topic.topic ?? topic.Topic ?? topic.name ?? `Topic ${i + 1}`;
            const keyPoints: string[] = topic.key_points ?? topic["Key Points"] ?? [];
            const resolution = topic.resolution_status ?? topic["Resolution Status"];
            const isResolved = (resolution ?? "").toUpperCase().includes("RESOLV");
            return (
              <YStack key={i} gap={6} padding={10} borderRadius={9} backgroundColor={C.surfaceHover} borderWidth={1} borderColor={C.border}>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text color={C.textPrimary} fontSize={11} fontWeight="700" flex={1}>{String(topicName)}</Text>
                  {resolution && (
                    <Pill
                      label={isResolved ? "Resolved" : "Unresolved"}
                      color={isResolved ? C.green : C.yellow}
                      bg={isResolved ? C.greenDim : C.yellowDim}
                      border={isResolved ? C.greenBorder : C.yellowBorder}
                    />
                  )}
                </XStack>
                {keyPoints.length > 0 && <BulletList items={keyPoints} />}
              </YStack>
            );
          })}
        </YStack>
      )}

      {questionsRaised.length > 0 && (
        <>
          <Divider />
          <YStack gap={6}>
            <Label>Questions Raised</Label>
            <BulletList items={questionsRaised} />
          </YStack>
        </>
      )}

      {topicsNotCovered.length > 0 && (
        <>
          <Divider />
          <YStack gap={6}>
            <Label>Not Covered</Label>
            <BulletList items={topicsNotCovered} />
          </YStack>
        </>
      )}
    </SectionCard>
  );
}

function RedFlagsSection({ data }: { data: any }) {
  if (!data) return null;

  const actionItems = data.action_items ?? data["Action Items"] ?? {};
  const risksAndBlockers = data.risks_and_blockers ?? data["Risks And Blockers"] ?? {};

  const items: any[] = actionItems.items ?? actionItems.Items ?? [];
  const pendingDecisions: string[] = actionItems.pending_decisions ?? actionItems["Pending Decisions"] ?? [];
  const followUpMeetings = actionItems.follow_up_meetings ?? actionItems["Follow Up Meetings"];

  const risks: any[] = risksAndBlockers.risks ?? risksAndBlockers.Risks ?? [];
  const blockers: string[] = risksAndBlockers.blockers ?? risksAndBlockers.Blockers ?? [];
  const concerns: string[] = risksAndBlockers.concerns ?? risksAndBlockers.Concerns ?? [];
  const overallRisk = risksAndBlockers.overall_risk_level ?? risksAndBlockers["Overall Risk Level"];

  const riskCol = severityColor(overallRisk);

  return (
    <SectionCard>
      <SectionHeader icon={<ShieldAlert size={13} color={C.red} />} title="Red Flags & Actions" iconColor={C.red} iconBg={C.redDim} />
      <Divider />

      {overallRisk && (
        <XStack alignItems="center" gap={8}>
          <Label>Overall Risk</Label>
          <Pill label={overallRisk} color={riskCol.text} bg={riskCol.bg} border={riskCol.border} />
        </XStack>
      )}

      {risks.length > 0 && (
        <YStack gap={6}>
          <Label>Identified Risks</Label>
          {risks.map((risk, i) => {
            const sev = risk.severity ?? risk.Severity;
            const desc = risk.description ?? risk.Description;
            const col = severityColor(sev);
            return (
              <XStack key={i} gap={8} alignItems="flex-start" padding={8} borderRadius={8} backgroundColor={col.bg} borderWidth={1} borderColor={col.border}>
                <AlertCircle size={12} color={col.text} style={{ marginTop: 2 }} />
                <YStack flex={1} gap={2}>
                  {sev && <Text color={col.text} fontSize={10} fontWeight="700">{sev.toUpperCase()}</Text>}
                  <Text color={C.textSecondary} fontSize={11} lineHeight={17}>{String(desc ?? "")}</Text>
                </YStack>
              </XStack>
            );
          })}
        </YStack>
      )}

      {items.length > 0 && (
        <>
          <Divider />
          <YStack gap={6}>
            <Label>Action Items</Label>
            {items.map((item, i) => {
              const action = item.action ?? item.Action;
              const owner = item.owner ?? item.Owner;
              const priority = item.priority ?? item.Priority;
              const deadline = item.deadline ?? item.Deadline;
              const pc = severityColor(priority);
              return (
                <YStack key={i} gap={5} padding={8} borderRadius={8} backgroundColor={C.surfaceHover} borderWidth={1} borderColor={C.border}>
                  <XStack justifyContent="space-between" alignItems="center">
                    {priority && <Pill label={priority} color={pc.text} bg={pc.bg} border={pc.border} />}
                    {owner && <Text color={C.textMuted} fontSize={10}>{String(owner)}</Text>}
                  </XStack>
                  {action && <Text color={C.textPrimary} fontSize={11} lineHeight={17}>{String(action)}</Text>}
                  {deadline && deadline !== "<UNKNOWN>" && (
                    <XStack alignItems="center" gap={4}>
                      <Clock size={10} color={C.textMuted} />
                      <Text color={C.textMuted} fontSize={10}>{String(deadline)}</Text>
                    </XStack>
                  )}
                </YStack>
              );
            })}
          </YStack>
        </>
      )}

      {pendingDecisions.length > 0 && (
        <>
          <Divider />
          <YStack gap={6}>
            <Label>Pending Decisions</Label>
            <BulletList items={pendingDecisions} />
          </YStack>
        </>
      )}

      {blockers.length > 0 && (
        <>
          <Divider />
          <YStack gap={6}>
            <Label>Blockers</Label>
            <BulletList items={blockers} />
          </YStack>
        </>
      )}

      {concerns.length > 0 && (
        <>
          <Divider />
          <YStack gap={6}>
            <Label>Concerns</Label>
            <BulletList items={concerns} />
          </YStack>
        </>
      )}

      {followUpMeetings && followUpMeetings !== "None" && typeof followUpMeetings === "string" && (
        <>
          <Divider />
          <YStack gap={3}>
            <Label>Follow-up Meetings</Label>
            <Text color={C.textSecondary} fontSize={11}>{followUpMeetings}</Text>
          </YStack>
        </>
      )}
    </SectionCard>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export default function InsightsPanel({ meetingId, interviewId, isOpen, onClose }: Props) {
  const { data, refetch, loading, error, startPolling, stopPolling } =
    useQuery<GetLatestMeetingInsightResult>(GET_LATEST_MEETING_INSIGHT, {
      variables: { meetingId },
      skip: !isOpen || !meetingId,
      fetchPolicy: "cache-and-network",
      errorPolicy: "ignore",
    });

  // Local flag so the UI transitions to "Generating" immediately on button
  // press, before the next poll confirms PENDING status from the backend.
  const [pendingGenerate, setPendingGenerate] = useState(false);

  const insight = data?.latestMeetingInsight ?? null;
  const status = insight?.status;
  const isServerGenerating = status === "PENDING" || status === "GENERATING" || status === "PROCESSING";
  // Treat as generating if either locally pending OR server confirmed
  const isGenerating = pendingGenerate || isServerGenerating;

  useEffect(() => {
    if (isServerGenerating) {
      // Backend confirmed generation — clear local flag and keep polling
      setPendingGenerate(false);
      startPolling(4000);
    } else if (!pendingGenerate) {
      // Only stop polling if we are not in a local-pending state
      stopPolling();
    }
    return () => { stopPolling(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isServerGenerating, startPolling, stopPolling]);

  const [initialize, { loading: initializing }] = useMutation<InitializeMeetingInsightResult>(
    INITIALIZE_MEETING_INSIGHT,
  );

  const onGenerate = async (forceRefresh: boolean = false) => {
    if (!meetingId) return;
    // Immediately flag as pending — prevents useEffect from killing the poll
    setPendingGenerate(true);
    try {
      await initialize({
        variables: {
          input: {
            meetingId,
            interviewId: interviewId ?? null,
            // The backend enforces a 5-minute cool-down between
            // generations per meeting. When the user explicitly hits
            // "Regenerate" we pass forceRefresh so the request
            // bypasses that gate and produces a new version.
            forceRefresh,
          },
        },
      });
      // Kick off the first refetch; useEffect will handle continued polling
      // once the backend confirms PENDING status
      startPolling(4000);
    } catch {
      setPendingGenerate(false);
    }
  };
  const onRegenerate = () => onGenerate(true);

  if (!isOpen) return null;

  return (
    <YStack
      flex={1}
      backgroundColor="rgba(10, 15, 28, 0.98)"
      borderLeftWidth={1}
      borderColor={C.border}
    >
      {/* Header */}
      <XStack
        height={56}
        paddingHorizontal={16}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderColor={C.border}
        backgroundColor="rgba(112,145,230,0.04)"
      >
        <XStack alignItems="center" gap={8}>
          <View
            width={28}
            height={28}
            borderRadius={8}
            backgroundColor={C.primaryDim}
            borderWidth={1}
            borderColor={C.primaryBorder}
            alignItems="center"
            justifyContent="center"
          >
            <Sparkles size={14} color={C.primary} />
          </View>
          <Text color={C.textPrimary} fontSize={13} fontWeight="700" letterSpacing={0.2}>
            AI Insights
          </Text>
          {insight ? (
            <TWChip label={`v${insight.version}`} color="primary" variant="flat" size="sm" />
          ) : null}
        </XStack>
        <Pressable
          onPress={onClose}
          hitSlop={6}
          style={({ pressed, hovered }: any) => ({
            width: 28,
            height: 28,
            borderRadius: 6,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed || hovered ? C.surfaceHover : "transparent",
          })}
        >
          <X size={14} color={C.textSecondary} />
        </Pressable>
      </XStack>

      <ScrollView flex={1} contentContainerStyle={{ padding: 14, gap: 10 }}>
        {!meetingId && <MissingMeetingIdState />}

        {meetingId && loading && !data && (
          <YStack alignItems="center" paddingVertical={40}>
            <ActivityIndicator color={C.primary} />
          </YStack>
        )}

        {meetingId && error && !insight && !isGenerating && (
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        )}

        {meetingId && !loading && !insight && !isGenerating && (
          <EmptyState onGenerate={() => onGenerate(false)} loading={initializing} />
        )}

        {meetingId && isGenerating && <GeneratingState />}

        {meetingId && insight?.status === "FAILED" && (
          <FailureState message={insight.errorMessage} onRetry={onRegenerate} retrying={initializing} />
        )}

        {meetingId && insight?.status === "COMPLETED" && (
          <ResultsView insight={insight} onRegenerate={onRegenerate} regenerating={initializing} />
        )}
      </ScrollView>
    </YStack>
  );
}

// ─── State screens ────────────────────────────────────────────────────────────
function MissingMeetingIdState() {
  return (
    <YStack alignItems="center" paddingVertical={40} gap={14}>
      <View width={64} height={64} borderRadius={9999} alignItems="center" justifyContent="center" backgroundColor={C.primaryDim} borderWidth={1} borderColor={C.primaryBorder}>
        <Brain size={28} color={C.primary} />
      </View>
      <YStack gap={5} alignItems="center">
        <Text color={C.textPrimary} fontSize={13} fontWeight="700">AI Insights unavailable</Text>
        <Text color={C.textSecondary} fontSize={11} textAlign="center" maxWidth={240} lineHeight={16}>
          Join this meeting from the aiqlick Meetings list to enable AI-powered insights.
        </Text>
      </YStack>
    </YStack>
  );
}

function EmptyState({ onGenerate, loading }: { onGenerate: () => void; loading: boolean }) {
  return (
    <YStack alignItems="center" paddingVertical={40} gap={16}>
      <View width={72} height={72} borderRadius={9999} alignItems="center" justifyContent="center" backgroundColor={C.primaryDim} borderWidth={1} borderColor={C.primaryBorder}>
        <Brain size={32} color={C.primary} />
      </View>
      <YStack gap={6} alignItems="center">
        <Text color={C.textPrimary} fontSize={14} fontWeight="700">Generate AI Insights</Text>
        <Text color={C.textSecondary} fontSize={11} textAlign="center" maxWidth={240} lineHeight={16}>
          Summarise skills, communication, key topics, and red flags from this meeting.
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
    <YStack alignItems="center" paddingVertical={40} gap={14}>
      <View width={64} height={64} borderRadius={9999} alignItems="center" justifyContent="center" backgroundColor={C.primaryDim} borderWidth={1} borderColor={C.primaryBorder}>
        <ActivityIndicator color={C.primary} />
      </View>
      <YStack gap={5} alignItems="center">
        <Text color={C.textPrimary} fontSize={13} fontWeight="600">Generating insights…</Text>
        <Text color={C.textSecondary} fontSize={11} textAlign="center" lineHeight={16}>
          The AI is analysing the transcript. Usually 15–30 seconds.
        </Text>
      </YStack>
    </YStack>
  );
}

function FailureState({ message, onRetry, retrying }: { message: string | null; onRetry: () => void; retrying: boolean }) {
  return (
    <YStack gap={12}>
      <YStack padding={12} gap={6} borderRadius={10} backgroundColor={C.redDim} borderWidth={1} borderColor={C.redBorder}>
        <XStack alignItems="center" gap={6}>
          <AlertCircle size={13} color={C.red} />
          <Text color={C.red} fontSize={12} fontWeight="700">Generation failed</Text>
        </XStack>
        {message && <Text color={C.textSecondary} fontSize={11} lineHeight={16}>{message}</Text>}
      </YStack>
      <TWButton label="Try again" variant="primary" color="primary" size="sm" icon={<RefreshCw size={12} color="#fff" />} isLoading={retrying} onPress={onRetry} />
    </YStack>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <YStack gap={12}>
      <XStack padding={10} gap={6} borderRadius={8} backgroundColor={C.redDim} borderWidth={1} borderColor={C.redBorder} alignItems="center">
        <AlertCircle size={12} color={C.red} />
        <Text color={C.textSecondary} fontSize={11} flex={1} lineHeight={16}>{message}</Text>
      </XStack>
      <TWButton label="Retry" variant="outline" color="primary" size="sm" onPress={onRetry} />
    </YStack>
  );
}

// ─── Results view ─────────────────────────────────────────────────────────────
function ResultsView({
  insight,
  onRegenerate,
  regenerating,
}: {
  insight: MeetingInsight;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const fullReport = safeJson(insight.fullReport);
  const skillsAssessment = safeJson(insight.skillsAssessment);
  const communicationAnalysis = safeJson(insight.communicationAnalysis);
  const keyTopicsSummary = safeJson(insight.keyTopicsSummary);
  const redFlagsAndConcerns = safeJson(insight.redFlagsAndConcerns);

  return (
    <YStack gap={10}>
      {/* Meta bar */}
      <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
        <XStack gap={6} flexWrap="wrap">
          {insight.generatedAt && (
            <MetaChip icon={<Clock size={10} color={C.textMuted} />} label={new Date(insight.generatedAt).toLocaleString()} />
          )}
          {insight.llmModel && (
            <MetaChip icon={<Cpu size={10} color={C.textMuted} />} label={insight.llmModel.split(".").pop() ?? insight.llmModel} />
          )}
          {insight.transcriptLength != null && (
            <MetaChip icon={<FileText size={10} color={C.textMuted} />} label={`${insight.transcriptLength} chars`} />
          )}
        </XStack>
        <XStack gap={6}>
          <TWButton
            label="Download"
            variant="ghost"
            color="default"
            size="sm"
            icon={<Download size={11} color={C.textSecondary} />}
            onPress={() => downloadInsightMarkdown(insight)}
          />
          <TWButton
            label="Regenerate"
            variant="ghost"
            color="default"
            size="sm"
            icon={<RefreshCw size={11} color={C.textSecondary} />}
            isLoading={regenerating}
            onPress={onRegenerate}
          />
        </XStack>
      </XStack>

      <OverviewSection data={fullReport} />
      <SkillsSection data={skillsAssessment} />
      <CommunicationSection data={communicationAnalysis} />
      <TopicsSection data={keyTopicsSummary} />
      <RedFlagsSection data={redFlagsAndConcerns} />
    </YStack>
  );
}

/**
 * Web-only: trigger a browser download of the insight's `fullReport`
 * markdown. The fullReport field is already a markdown string produced
 * by the bg-tasks pipeline (see `meeting_insight/service.py`), so we
 * just wrap it in a Blob and click an invisible <a download>. Native
 * Platforms get a no-op — adding share-sheet integration would mean
 * pulling in expo-sharing, which we can wire later if needed.
 */
function downloadInsightMarkdown(insight: MeetingInsight) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const report = insight.fullReport && insight.fullReport.trim().length > 0
    ? insight.fullReport
    : buildFallbackMarkdown(insight);
  const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ts = insight.generatedAt
    ? new Date(insight.generatedAt).toISOString().slice(0, 19).replace(/[:T]/g, "-")
    : new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.download = `meeting-insight-${ts}-v${insight.version}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Free the blob URL on the next tick — browsers keep the download
  // alive long enough.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Last-resort markdown builder when `fullReport` is empty but the
 * structured sections are populated. Stitches the JSON sections into a
 * readable doc so the download is never empty.
 */
function buildFallbackMarkdown(insight: MeetingInsight): string {
  const lines: string[] = [
    `# Meeting Insight Report (v${insight.version})`,
    "",
    insight.generatedAt ? `_Generated ${new Date(insight.generatedAt).toLocaleString()}_` : "",
    "",
  ];
  const push = (title: string, raw: string | null) => {
    if (!raw) return;
    const obj = safeJson(raw);
    if (!obj) return;
    lines.push(`## ${title}`, "", "```json", JSON.stringify(obj, null, 2), "```", "");
  };
  push("Skills Assessment", insight.skillsAssessment);
  push("Communication Analysis", insight.communicationAnalysis);
  push("Key Topics", insight.keyTopicsSummary);
  push("Red Flags & Concerns", insight.redFlagsAndConcerns);
  return lines.join("\n");
}
