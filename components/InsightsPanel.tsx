import { createContext, useContext, useEffect, useState } from "react";
import { useMutation, useQuery, type ApolloError } from "@apollo/client";
import {
  Brain,
  Sparkles,
  X,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Lightbulb,
  ShieldAlert,
  Clock,
  FileText,
  Target,
  Users,
  Download,
} from "@tamagui/lucide-icons";
import { Platform } from "react-native";
import { ActivityIndicator, Pressable } from "react-native";
import { ScrollView, View, XStack, YStack, Text } from "tamagui";

import { BillingBlock } from "@/components/BillingBlock";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { RegenerateConfirmModal } from "@/components/RegenerateConfirmModal";
import { TWButton } from "@/components/ux/TWButton";
import { TWChip } from "@/components/ux/TWChip";
import {
  GET_LATEST_MEETING_INSIGHT,
  GET_MEETING_INSIGHTS_HISTORY,
  INITIALIZE_MEETING_INSIGHT,
  type GetLatestMeetingInsightResult,
  type GetMeetingInsightsHistoryResult,
  type InitializeMeetingInsightResult,
  type MeetingInsight,
} from "@/graphql/operations/insights";
import {
  GET_MEETING_TRANSCRIPT,
  type GetMeetingTranscriptResult,
} from "@/graphql/operations/transcript";
import { useCreditBalance } from "@/lib/hooks/useCreditBalance";
import { useLastInsightCost } from "@/lib/hooks/useLastInsightCost";
import { detectBillingError, type BillingErrorInfo } from "@/lib/billing/billingError";
import { formatCredits } from "@/lib/billing/estimateInsightCost";

type Theme = "dark" | "light";

interface Props {
  meetingId: string | null;
  interviewId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ContentProps {
  meetingId: string | null;
  interviewId?: string | null;
  /**
   * Palette to render with. Default `dark` keeps the in-call side
   * panel looking right against the meeting room's dark background.
   * Pass `light` when embedding inside a white TWCard (meeting detail
   * page) so the text and surfaces have enough contrast.
   */
  theme?: Theme;
  /**
   * Jitsi room name. Used as the lookup key for the current
   * transcript text so the cost estimator can size the bill from
   * live char count, not stale `insight.transcriptLength`. When
   * omitted (e.g., the in-call side panel which doesn't have it
   * handy), the estimator falls back to the latest insight's
   * reported transcript length.
   */
  roomName?: string | null;
  /** Display name of the meeting organizer. Surfaced in the
   * regenerate-confirm modal's "host is not billed" line so the
   * disclosure is concrete instead of generic. */
  organizerName?: string | null;
}

// ─── Palettes ────────────────────────────────────────────────────────────────
interface Palette {
  primary: string;
  primaryDim: string;
  primaryHoverDim: string;
  primaryBorder: string;
  surface: string;
  surfaceHover: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  green: string;
  greenDim: string;
  greenBorder: string;
  yellow: string;
  yellowDim: string;
  yellowBorder: string;
  red: string;
  redDim: string;
  redBorder: string;
  blue: string;
  blueDim: string;
  blueBorder: string;
}

const DARK_PALETTE: Palette = {
  primary: "#7091E6",
  primaryDim: "rgba(112,145,230,0.15)",
  primaryHoverDim: "rgba(112,145,230,0.28)",
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
  blue: "#60a5fa",
  blueDim: "rgba(96,165,250,0.12)",
  blueBorder: "rgba(96,165,250,0.3)",
};

const LIGHT_PALETTE: Palette = {
  primary: "#4F6BBE",
  primaryDim: "rgba(79,107,190,0.10)",
  primaryHoverDim: "rgba(79,107,190,0.18)",
  primaryBorder: "rgba(79,107,190,0.30)",
  surface: "rgba(15,23,42,0.035)",
  surfaceHover: "rgba(15,23,42,0.07)",
  border: "rgba(15,23,42,0.12)",
  textPrimary: "#0f172a",
  textSecondary: "rgba(15,23,42,0.72)",
  textMuted: "rgba(15,23,42,0.48)",
  green: "#047857",
  greenDim: "rgba(4,120,87,0.10)",
  greenBorder: "rgba(4,120,87,0.30)",
  yellow: "#a16207",
  yellowDim: "rgba(161,98,7,0.10)",
  yellowBorder: "rgba(161,98,7,0.30)",
  red: "#b91c1c",
  redDim: "rgba(185,28,28,0.08)",
  redBorder: "rgba(185,28,28,0.30)",
  blue: "#1d4ed8",
  blueDim: "rgba(29,78,216,0.10)",
  blueBorder: "rgba(29,78,216,0.30)",
};

const PaletteContext = createContext<Palette>(DARK_PALETTE);
const usePalette = () => useContext(PaletteContext);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function safeJson(raw: any): any {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return raw; }
}

function severityColor(sev: string | undefined, C: Palette) {
  const s = (sev ?? "").toUpperCase();
  if (s === "HIGH" || s === "CRITICAL") return { text: C.red, bg: C.redDim, border: C.redBorder };
  if (s === "MEDIUM") return { text: C.yellow, bg: C.yellowDim, border: C.yellowBorder };
  return { text: C.green, bg: C.greenDim, border: C.greenBorder };
}

function outcomeColor(outcome: string | undefined, C: Palette) {
  const o = (outcome ?? "").toUpperCase();
  if (o.includes("SUCCESS") || o.includes("ACHIEVED") || o.includes("POSITIVE")) return { text: C.green, bg: C.greenDim, border: C.greenBorder };
  if (o.includes("FAIL") || o.includes("NEGATIVE")) return { text: C.red, bg: C.redDim, border: C.redBorder };
  return { text: C.yellow, bg: C.yellowDim, border: C.yellowBorder };
}

function scoreColor(score: number, C: Palette, max = 10) {
  const ratio = score / max;
  if (ratio >= 0.7) return C.green;
  if (ratio >= 0.4) return C.yellow;
  return C.red;
}

// ─── Primitive components ─────────────────────────────────────────────────────
function SectionCard({ children, gap = 10 }: { children: React.ReactNode; gap?: number }) {
  const C = usePalette();
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
  iconBg,
}: {
  icon: React.ReactNode;
  title: string;
  iconColor?: string;
  iconBg?: string;
}) {
  const C = usePalette();
  return (
    <XStack alignItems="center" gap={8}>
      <View
        width={26}
        height={26}
        borderRadius={7}
        backgroundColor={iconBg ?? C.primaryDim}
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
  const C = usePalette();
  const color = scoreColor(score, C, max);
  return (
    <XStack alignItems="baseline" gap={2}>
      <Text color={color} fontSize={18} fontWeight="800">{score}</Text>
      <Text color={C.textMuted} fontSize={10}>/{max}</Text>
    </XStack>
  );
}

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const C = usePalette();
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = scoreColor(score, C, max);
  return (
    <View height={4} borderRadius={999} backgroundColor={C.border} overflow="hidden">
      <View height={4} width={`${pct}%` as any} borderRadius={999} backgroundColor={color} />
    </View>
  );
}

function Divider() {
  const C = usePalette();
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
    try {
      return { primary: JSON.stringify(item) };
    } catch {
      return { primary: "" };
    }
  }
  return { primary: String(item) };
}

function BulletList({ items }: { items: unknown[] }) {
  const C = usePalette();
  if (!items?.length) return <Text color={C.textMuted} fontSize={11}>None</Text>;
  return (
    <YStack gap={5}>
      {items.map((item, i) => {
        const { primary, secondary } = normalizeBulletItem(item);
        return (
          <XStack key={i} gap={7} alignItems="flex-start">
            <View width={4} height={4} borderRadius={999} backgroundColor={C.primary} marginTop={5} flexShrink={0} />
            <YStack flex={1} flexShrink={1} gap={2}>
              <Text
                color={C.textSecondary}
                fontSize={11}
                lineHeight={17}
                // @ts-expect-error rn-web break-word passthrough
                style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
              >
                {primary}
              </Text>
              {secondary ? (
                <Text
                  color={C.textMuted}
                  fontSize={10}
                  lineHeight={14}
                  fontStyle="italic"
                  // @ts-expect-error rn-web break-word passthrough
                  style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                >
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
  const C = usePalette();
  return (
    <Text color={C.textMuted} fontSize={10} fontWeight="700" letterSpacing={0.8}>
      {children.toUpperCase()}
    </Text>
  );
}

/**
 * Each contributor entry from the model arrives as a single string in
 * the shape "Name (id) - role/description". Pre-pill rendering shoved
 * the whole sentence into a rounded chip and pushed the panel sideways
 * for long bios. Now we split it into a stacked row — small initials
 * avatar + name on one line, the role below — so the row reflows
 * cleanly inside the side panel.
 */
function ContributorRow({ entry }: { entry: string }) {
  const C = usePalette();
  const stripped = entry.replace(/\s*\([^)]*\)\s*/, " ").trim();
  const sepIndex = stripped.search(/\s[-—:]\s/);
  const name = sepIndex > 0 ? stripped.slice(0, sepIndex).trim() : stripped;
  const role = sepIndex > 0 ? stripped.slice(sepIndex + 3).trim() : "";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <XStack gap={8} alignItems="flex-start">
      <View
        width={24}
        height={24}
        borderRadius={999}
        backgroundColor={C.primaryDim}
        borderWidth={1}
        borderColor={C.primaryBorder}
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <Text color={C.primary} fontSize={10} fontWeight="700">
          {initials || "?"}
        </Text>
      </View>
      <YStack flex={1} flexShrink={1} gap={1}>
        <Text color={C.textPrimary} fontSize={11} fontWeight="600">
          {name}
        </Text>
        {role ? (
          <Text
            color={C.textMuted}
            fontSize={10}
            lineHeight={14}
            // @ts-expect-error rn-web break-word passthrough
            style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
          >
            {role}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}

function MetaChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  const C = usePalette();
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

// Note: the previous `OverviewSection` consumed `insight.fullReport`
// expecting a JSON object, but `fullReport` is actually a markdown
// string — so the section rendered just an empty card header. The
// real "overview" data (outcome / purpose / summary / key decisions)
// lives inside `skillsAssessment`, so we render that under the
// "Overview" title via the section below.

function SkillsSection({ data }: { data: any }) {
  const C = usePalette();
  if (!data) return null;
  const outcome = data.outcome ?? data.Outcome;
  const purpose = data.purpose ?? data.Purpose;
  const summary = data.summary ?? data.Summary;
  const keyDecisions: unknown[] = data.key_decisions ?? data["Key Decisions"] ?? [];

  const oc = outcomeColor(outcome, C);

  return (
    <SectionCard>
      <SectionHeader icon={<Target size={13} color={C.primary} />} title="Overview" />
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
  const C = usePalette();
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
      <SectionHeader icon={<MessageSquare size={13} color={C.blue} />} title="Communication" iconBg={C.blueDim} />
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
            <YStack gap={6}>
              {contributors.map((c, i) => (
                <ContributorRow key={i} entry={String(c)} />
              ))}
            </YStack>
          </YStack>
        </>
      )}

      {quotes.length > 0 && (
        <>
          <Divider />
          <YStack gap={6}>
            <Label>Notable Quotes</Label>
            {quotes.map((q, i) => (
              <XStack
                key={i}
                paddingHorizontal={10}
                paddingVertical={7}
                borderRadius={8}
                backgroundColor={C.primaryDim}
                borderLeftWidth={2}
                borderColor={C.primary}
              >
                <Text
                  color={C.textPrimary}
                  fontSize={11}
                  lineHeight={17}
                  fontStyle="italic"
                  flex={1}
                  flexShrink={1}
                  // @ts-expect-error react-native-web style passthrough for break-word
                  style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                >
                  &ldquo;{String(q)}&rdquo;
                </Text>
              </XStack>
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
  const C = usePalette();
  if (!data) return null;

  const questionsRaised: string[] = data.questions_raised ?? data["Questions Raised"] ?? [];
  const topicsDiscussed: any[] = data.topics_discussed ?? data["Topics Discussed"] ?? [];
  const topicsNotCovered: string[] = data.topics_not_covered ?? data["Topics Not Covered"] ?? [];

  return (
    <SectionCard>
      <SectionHeader icon={<Lightbulb size={13} color={C.yellow} />} title="Key Topics" iconBg={C.yellowDim} />
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
  const C = usePalette();
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

  const riskCol = severityColor(overallRisk, C);

  return (
    <SectionCard>
      <SectionHeader icon={<ShieldAlert size={13} color={C.red} />} title="Red Flags & Actions" iconBg={C.redDim} />
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
            const col = severityColor(sev, C);
            return (
              <XStack key={i} gap={8} alignItems="flex-start" padding={8} borderRadius={8} backgroundColor={col.bg} borderWidth={1} borderColor={col.border}>
                <View flexShrink={0} marginTop={2}>
                  <AlertCircle size={12} color={col.text} />
                </View>
                <YStack flex={1} flexShrink={1} gap={2}>
                  {sev && <Text color={col.text} fontSize={10} fontWeight="700">{sev.toUpperCase()}</Text>}
                  <Text
                    color={C.textSecondary}
                    fontSize={11}
                    lineHeight={17}
                    // @ts-expect-error rn-web break-word passthrough
                    style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                  >
                    {String(desc ?? "")}
                  </Text>
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
              const pc = severityColor(priority, C);
              return (
                <YStack key={i} gap={5} padding={8} borderRadius={8} backgroundColor={C.surfaceHover} borderWidth={1} borderColor={C.border}>
                  <XStack justifyContent="space-between" alignItems="center" gap={6}>
                    {priority && <Pill label={priority} color={pc.text} bg={pc.bg} border={pc.border} />}
                    {owner && (
                      <Text color={C.textMuted} fontSize={10} flexShrink={1} numberOfLines={1}>
                        {String(owner)}
                      </Text>
                    )}
                  </XStack>
                  {action && (
                    <Text
                      color={C.textPrimary}
                      fontSize={11}
                      lineHeight={17}
                      flexShrink={1}
                      // @ts-expect-error rn-web break-word passthrough
                      style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                    >
                      {String(action)}
                    </Text>
                  )}
                  {deadline && deadline !== "<UNKNOWN>" && (
                    <XStack alignItems="center" gap={4}>
                      <Clock size={10} color={C.textMuted} />
                      <Text color={C.textMuted} fontSize={10} flexShrink={1} numberOfLines={1}>
                        {String(deadline)}
                      </Text>
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

/**
 * Headless body for the insight panel — owns the query + mutation +
 * polling state machine and renders the per-status section content
 * (empty / generating / failed / results). Used both by the in-call
 * `InsightsPanel` (with side-panel chrome) and by the meeting detail
 * page's AI Insights card (no chrome).
 *
 * Provides the palette context for everything it renders so all
 * descendants pick up the right light/dark variant automatically.
 */
export function InsightsContent({
  meetingId,
  interviewId,
  theme = "dark",
  roomName,
  organizerName,
}: ContentProps) {
  const palette = theme === "light" ? LIGHT_PALETTE : DARK_PALETTE;
  return (
    <PaletteContext.Provider value={palette}>
      <InsightsContentInner
        meetingId={meetingId}
        interviewId={interviewId}
        roomName={roomName}
        organizerName={organizerName}
      />
    </PaletteContext.Provider>
  );
}

function InsightsContentInner({
  meetingId,
  interviewId,
  roomName,
  organizerName,
}: {
  meetingId: string | null;
  interviewId?: string | null;
  roomName?: string | null;
  organizerName?: string | null;
}) {
  const C = usePalette();
  const { data, refetch, loading, error, startPolling, stopPolling } =
    useQuery<GetLatestMeetingInsightResult>(GET_LATEST_MEETING_INSIGHT, {
      variables: { meetingId },
      skip: !meetingId,
      fetchPolicy: "cache-and-network",
      // `all` so GraphQL errors surface on `error` and the ErrorState
      // renders them via <ErrorDisplay>. `ignore` silently dropped them
      // and made failures look like normal "no data" empty states.
      errorPolicy: "all",
    });

  // Full version history — backs the version switcher in ResultsView.
  // Fetched lazily (only when meetingId is set) and kept in sync via
  // the polling cycle below.
  const { data: historyData, refetch: refetchHistory } =
    useQuery<GetMeetingInsightsHistoryResult>(GET_MEETING_INSIGHTS_HISTORY, {
      variables: { meetingId },
      skip: !meetingId,
      fetchPolicy: "cache-and-network",
      // `all` so GraphQL errors surface on `error` and the ErrorState
      // renders them via <ErrorDisplay>. `ignore` silently dropped them
      // and made failures look like normal "no data" empty states.
      errorPolicy: "all",
    });

  // Live transcript size — used to size the cost estimate in the
  // confirm modal. Same `transcriptText` query the TranscriptionSection
  // uses; Apollo's cache deduplicates so the two requests collapse
  // into one network round-trip on the detail page. `cache-first` so
  // we don't trigger an extra fetch just to get the estimate.
  const { data: transcriptData } = useQuery<GetMeetingTranscriptResult>(
    GET_MEETING_TRANSCRIPT,
    {
      variables: { meetingId: roomName },
      skip: !roomName,
      fetchPolicy: "cache-first",
      errorPolicy: "ignore",
    },
  );
  const currentTranscriptChars =
    transcriptData?.transcriptText?.transcript?.length ?? null;

  // Local flag so the UI transitions to "Generating" immediately on button
  // press, before the next poll confirms PENDING status from the backend.
  const [pendingGenerate, setPendingGenerate] = useState(false);

  const insight = data?.latestMeetingInsight ?? null;
  const status = insight?.status;
  const isServerGenerating = status === "PENDING" || status === "GENERATING" || status === "PROCESSING";
  const isGenerating = pendingGenerate || isServerGenerating;

  useEffect(() => {
    if (isServerGenerating) {
      setPendingGenerate(false);
      startPolling(4000);
    } else if (!pendingGenerate) {
      stopPolling();
    }
    return () => { stopPolling(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isServerGenerating, startPolling, stopPolling]);

  const [initialize, { loading: initializing }] = useMutation<InitializeMeetingInsightResult>(
    INITIALIZE_MEETING_INSIGHT,
  );

  // Captures errors from the `initializeMeetingInsight` mutation.
  // Most useful for billing failures (INSUFFICIENT_CREDITS,
  // SUBSCRIPTION_INACTIVE) which arrive synchronously before the
  // subscription event stream begins — so they never appear on the
  // insight row itself. We render a BillingBlock at the top of the
  // panel until the user retries or buys credits.
  const [billingBlock, setBillingBlock] = useState<BillingErrorInfo | null>(null);
  const [genericMutationError, setGenericMutationError] = useState<Error | null>(null);

  const onGenerate = async (forceRefresh: boolean = false) => {
    if (!meetingId) return;
    setPendingGenerate(true);
    setBillingBlock(null);
    setGenericMutationError(null);
    try {
      await initialize({
        variables: {
          input: {
            meetingId,
            interviewId: interviewId ?? null,
            forceRefresh,
          },
        },
      });
      startPolling(4000);
      // Pull the freshly-created GENERATING row into the version list
      // so the switcher reflects the new pending version immediately.
      void refetchHistory();
    } catch (err) {
      setPendingGenerate(false);
      // Decode the error: billing failures get the dedicated
      // BillingBlock with a buy/renew CTA; anything else falls
      // through to a generic ErrorDisplay.
      const decoded = detectBillingError(err as Error);
      if (decoded) {
        setBillingBlock(decoded);
      } else {
        setGenericMutationError(err as Error);
      }
    }
  };

  // Confirm-before-charge flow. Every Generate / Regenerate click
  // opens the modal so the user sees the cost, balance, and "you're
  // billed, not the host" disclosure before the mutation fires.
  // We track whether the pending intent is a first-time generate or
  // a forced refresh (regenerate) so the modal can word things
  // correctly and the underlying call uses the right cooldown bypass.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingForceRefresh, setPendingForceRefresh] = useState(false);

  const requestGenerate = (forceRefresh: boolean) => {
    if (!meetingId) return;
    setPendingForceRefresh(forceRefresh);
    setConfirmOpen(true);
  };
  const onConfirmGenerate = async () => {
    setConfirmOpen(false);
    await onGenerate(pendingForceRefresh);
  };
  const onRegenerate = () => requestGenerate(true);

  // When polling finishes (status flips to COMPLETED/FAILED), refresh
  // history so the new version's full content lands in the switcher.
  useEffect(() => {
    if (status === "COMPLETED" || status === "FAILED") {
      void refetchHistory();
    }
  }, [status, refetchHistory]);

  return (
    <YStack gap={10}>
      {!meetingId && <MissingMeetingIdState />}

      {/* Mutation-level errors (most useful for billing failures
          that come back from `initializeMeetingInsight` before the
          subscription stream even starts). */}
      {billingBlock && (
        <BillingBlock
          info={billingBlock}
          onRetry={() => void onGenerate(true)}
          retrying={initializing}
        />
      )}
      {!billingBlock && genericMutationError && (
        <ErrorDisplay error={genericMutationError} title="Couldn't start generation" />
      )}

      {meetingId && loading && !data && (
        <YStack alignItems="center" paddingVertical={40}>
          <ActivityIndicator color={C.primary} />
        </YStack>
      )}

      {meetingId && error && !insight && !isGenerating && (
        <ErrorState error={error} onRetry={() => void refetch()} />
      )}

      {meetingId && !loading && !insight && !isGenerating && (
        <EmptyState
          onGenerate={() => requestGenerate(false)}
          loading={initializing}
        />
      )}

      {meetingId && isGenerating && <GeneratingState />}

      {meetingId && insight?.status === "FAILED" && (
        <FailureState message={insight.errorMessage} onRetry={onRegenerate} retrying={initializing} />
      )}

      {meetingId && insight?.status === "COMPLETED" && (
        <ResultsView
          insight={insight}
          history={historyData?.meetingInsights ?? []}
          onRegenerate={onRegenerate}
          regenerating={initializing}
          meetingId={meetingId}
          currentTranscriptChars={currentTranscriptChars}
        />
      )}

      <RegenerateConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onConfirmGenerate}
        currentVersion={insight?.version ?? null}
        // Prefer the freshly-loaded transcript char count; fall back
        // to the last insight's reported transcriptLength when the
        // surrounding surface didn't pass roomName (e.g., in-call
        // panel) so the estimate is at least a reasonable lower bound.
        transcriptChars={currentTranscriptChars ?? insight?.transcriptLength ?? null}
        submitting={initializing}
        organizerName={organizerName ?? null}
      />
    </YStack>
  );
}

// ─── Main panel (side-panel chrome wrapping InsightsContent) ─────────────────
export default function InsightsPanel({ meetingId, interviewId, isOpen, onClose }: Props) {
  // Read the latest insight separately so the chrome can show the version
  // chip without forcing InsightsContent to lift its `insight` state.
  const { data } = useQuery<GetLatestMeetingInsightResult>(GET_LATEST_MEETING_INSIGHT, {
    variables: { meetingId },
    skip: !isOpen || !meetingId,
    fetchPolicy: "cache-only",
  });
  const insight = data?.latestMeetingInsight ?? null;

  if (!isOpen) return null;

  // The in-call side panel always renders against the dark meeting
  // room background, so chrome + content both use the dark palette.
  return (
    <PaletteContext.Provider value={DARK_PALETTE}>
      <PanelChrome insight={insight} onClose={onClose}>
        <InsightsContentInner meetingId={meetingId} interviewId={interviewId} />
      </PanelChrome>
    </PaletteContext.Provider>
  );
}

function PanelChrome({
  insight,
  onClose,
  children,
}: {
  insight: MeetingInsight | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const C = usePalette();
  return (
    <YStack
      flex={1}
      backgroundColor="rgba(10, 15, 28, 0.98)"
      borderLeftWidth={1}
      borderColor={C.border}
    >
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
        {children}
      </ScrollView>
    </YStack>
  );
}

// ─── State screens ────────────────────────────────────────────────────────────
function MissingMeetingIdState() {
  const C = usePalette();
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
  const C = usePalette();
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
  const C = usePalette();
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
  const C = usePalette();
  // The errorMessage column is a string (no structured extension
  // shape). detectBillingError still handles strings via its message
  // pattern matcher, so a failed generation that's secretly an
  // INSUFFICIENT_CREDITS gets the right CTA instead of just "Try again".
  const billing = detectBillingError(message);
  if (billing) {
    return <BillingBlock info={billing} onRetry={onRetry} retrying={retrying} />;
  }
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

function ErrorState({ error, onRetry }: { error: ApolloError | Error | null; onRetry: () => void }) {
  return (
    <YStack gap={12}>
      <ErrorDisplay error={error} title="Couldn't load insight" />
      <TWButton label="Retry" variant="outline" color="primary" size="sm" onPress={onRetry} />
    </YStack>
  );
}

// ─── Results view ─────────────────────────────────────────────────────────────
function ResultsView({
  insight,
  history,
  onRegenerate,
  regenerating,
  meetingId,
  currentTranscriptChars,
}: {
  insight: MeetingInsight;
  history: MeetingInsight[];
  onRegenerate: () => void;
  meetingId: string | null;
  regenerating: boolean;
  /**
   * Live transcript char count — when present and materially larger
   * than the displayed insight's `transcriptLength`, we surface a
   * "transcript has grown" banner so users on recurring meetings
   * notice they're looking at a stale analysis.
   */
  currentTranscriptChars: number | null;
}) {
  const C = usePalette();

  // The "active" version. `null` = follow latest (insight prop). When
  // the user clicks an older pill, we pin to that id; if they click
  // the latest pill again we go back to null so a new regenerate
  // auto-promotes.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Show COMPLETED and STALE versions in the switcher. STALE = a
  // previously-COMPLETED version that the backend auto-superseded
  // when a new generation kicked off — its data is still fully
  // populated and downloadable. FAILED / GENERATING / PENDING rows
  // have no content, so they stay out of the picker.
  const completedHistory = history.filter(
    (v) => v.status === "COMPLETED" || v.status === "STALE",
  );
  const displayed =
    completedHistory.find((v) => v.id === selectedId) ?? insight;
  const isLatest = displayed.id === insight.id;

  const skillsAssessment = safeJson(displayed.skillsAssessment);
  const communicationAnalysis = safeJson(displayed.communicationAnalysis);
  const keyTopicsSummary = safeJson(displayed.keyTopicsSummary);
  const redFlagsAndConcerns = safeJson(displayed.redFlagsAndConcerns);

  // Balance + last-cost chips for the meta row. Both are best-effort:
  // if either query is loading or fails, we just don't render the
  // chip rather than show "—" placeholders.
  const { balance } = useCreditBalance();
  const { log: lastCostLog } = useLastInsightCost(meetingId);

  // "Transcript has grown" — recurring meetings (same Jitsi room
  // rejoined daily) keep accumulating transcript. The displayed
  // insight's `transcriptLength` is whatever was analysed when it
  // ran. If the live transcript is materially larger we surface a
  // banner pointing at Regenerate. Threshold: 1000 extra chars OR
  // a 10% increase, whichever is smaller — so trivial drift doesn't
  // nag the user but a new session lights up.
  const insightChars = displayed.transcriptLength ?? 0;
  const transcriptGrowth =
    currentTranscriptChars != null && insightChars > 0
      ? currentTranscriptChars - insightChars
      : 0;
  const transcriptGrew =
    transcriptGrowth >= Math.min(1000, Math.max(100, insightChars * 0.1));

  // Format the analysed window from `transcriptRange` (when bg-tasks
  // ships handoff #02 it'll start being populated; until then this
  // chip silently doesn't render).
  const rangeChip = (() => {
    const range = displayed.transcriptRange;
    if (!range?.startTime || !range?.endTime) return null;
    try {
      const s = new Date(range.startTime);
      const e = new Date(range.endTime);
      return `Analyzed: ${s.toLocaleTimeString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })} → ${e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return null;
    }
  })();

  return (
    <YStack gap={10}>
      {/* "Transcript grew" — visible when the live transcript is
          materially larger than what this insight analysed. The user
          on a daily standup needs this hint because regenerating
          picks up the entire history; without the banner they'd
          assume the displayed insight covers today's session. */}
      {isLatest && transcriptGrew && (
        <TranscriptGrewHint
          insightChars={insightChars}
          currentChars={currentTranscriptChars ?? 0}
          version={displayed.version}
          onRegenerate={onRegenerate}
          regenerating={regenerating}
        />
      )}

      {/* Version switcher — only shown when more than one COMPLETED
          version exists. Lets the user flip between regenerations and
          download whichever one is richest. */}
      {completedHistory.length > 1 && (
        <VersionSwitcher
          versions={completedHistory}
          activeId={displayed.id}
          latestId={insight.id}
          onSelect={(id) => setSelectedId(id === insight.id ? null : id)}
        />
      )}

      {/* Compact meta + action bar. Generated-at goes first (most
          glanceable), char count last. */}
      <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
        <XStack gap={6} flexWrap="wrap" alignItems="center">
          {displayed.generatedAt && (
            <MetaChip
              icon={<Clock size={10} color={C.textMuted} />}
              label={formatGeneratedAt(displayed.generatedAt)}
            />
          )}
          {displayed.transcriptLength != null && (
            <MetaChip
              icon={<FileText size={10} color={C.textMuted} />}
              label={`${displayed.transcriptLength.toLocaleString()} chars`}
            />
          )}
          {rangeChip && (
            <MetaChip
              icon={<Clock size={10} color={C.textMuted} />}
              label={rangeChip}
            />
          )}
          {!isLatest && (
            <MetaChip
              icon={<RefreshCw size={10} color={C.textMuted} />}
              label="Viewing older version"
            />
          )}
          {/* Balance + last-cost — best effort, hidden when null. */}
          {balance && (
            <MetaChip
              icon={<Sparkles size={10} color={C.textMuted} />}
              label={`Balance: ${formatCredits(balance.balance)}`}
            />
          )}
          {lastCostLog && (
            <MetaChip
              icon={<Sparkles size={10} color={C.textMuted} />}
              label={`Last cost: ${formatCredits(lastCostLog.creditsCost)}`}
            />
          )}
        </XStack>
        <XStack gap={6} alignItems="center" flexWrap="wrap">
          <ActionChip
            label="Download MD"
            icon={<Download size={12} color={C.textPrimary} />}
            onPress={() => downloadInsightMarkdown(displayed)}
          />
          <ActionChip
            label="Download PDF"
            icon={<Download size={12} color={C.textPrimary} />}
            onPress={() => downloadInsightPdf(displayed)}
          />
          <ActionChip
            label="Regenerate"
            variant="primary"
            icon={
              regenerating ? (
                <ActivityIndicator color={C.primary} size="small" />
              ) : (
                <RefreshCw size={12} color={C.primary} />
              )
            }
            onPress={regenerating ? undefined : onRegenerate}
            disabled={regenerating}
          />
        </XStack>
      </XStack>

      <SkillsSection data={skillsAssessment} />
      <CommunicationSection data={communicationAnalysis} />
      <TopicsSection data={keyTopicsSummary} />
      <RedFlagsSection data={redFlagsAndConcerns} />
    </YStack>
  );
}

/**
 * Horizontal pill row listing all COMPLETED versions of the insight,
 * newest first. Each pill shows the version number + generated-at
 * short form; the active one is filled, others are ghosted. Tapping
 * the currently-active pill is a no-op handled at the parent level
 * (treated as a select on the latest → unpins to null).
 */
/**
 * Banner for recurring meetings: when the live transcript is bigger
 * than what the displayed insight analysed, nudge the user to
 * regenerate so the analysis includes the new content. Specifically
 * helpful for daily-standup type rooms where the same Jitsi
 * room is rejoined over days and the saved insight gets stale.
 *
 * Wording is honest about the backend's current behaviour —
 * regenerate analyses the *entire accumulated* transcript, not just
 * the new portion. Per-session filtering is part of handoff #02.
 */
function TranscriptGrewHint({
  insightChars,
  currentChars,
  version,
  onRegenerate,
  regenerating,
}: {
  insightChars: number;
  currentChars: number;
  version: number;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const C = usePalette();
  const added = currentChars - insightChars;
  return (
    <YStack
      padding={12}
      gap={10}
      borderRadius={10}
      backgroundColor={C.yellowDim}
      borderWidth={1}
      borderColor={C.yellowBorder}
    >
      <XStack gap={8} alignItems="flex-start">
        <View paddingTop={2}>
          <RefreshCw size={14} color={C.yellow} />
        </View>
        <YStack flex={1} gap={3}>
          <Text color={C.textPrimary} fontSize={12} fontWeight="700">
            Transcript has grown since v{version}
          </Text>
          <Text color={C.textSecondary} fontSize={11} lineHeight={16}>
            {insightChars.toLocaleString()} → {currentChars.toLocaleString()} chars
            (+{added.toLocaleString()}). Regenerate to include the new content.
            Note: the analysis covers the full accumulated transcript, not just
            this latest session.
          </Text>
        </YStack>
      </XStack>
      <XStack>
        <TWButton
          label="Regenerate"
          variant="flat"
          color="primary"
          size="sm"
          icon={<RefreshCw size={12} color={C.primary} />}
          isLoading={regenerating}
          onPress={onRegenerate}
        />
      </XStack>
    </YStack>
  );
}

function VersionSwitcher({
  versions,
  activeId,
  latestId,
  onSelect,
}: {
  versions: MeetingInsight[];
  activeId: string;
  latestId: string;
  onSelect: (id: string) => void;
}) {
  const C = usePalette();
  return (
    <YStack gap={6}>
      <Label>Versions</Label>
      <XStack gap={6} flexWrap="wrap">
        {versions.map((v) => {
          const isActive = v.id === activeId;
          const isLatest = v.id === latestId;
          return (
            <Pressable
              key={v.id}
              onPress={() => onSelect(v.id)}
              accessibilityRole="button"
              accessibilityLabel={`Version ${v.version}`}
              style={({ pressed, hovered }: any) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                height: 26,
                paddingHorizontal: 10,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: isActive ? C.primaryBorder : C.border,
                backgroundColor: isActive
                  ? C.primaryDim
                  : pressed || hovered
                    ? C.surfaceHover
                    : C.surface,
              })}
            >
              <Text
                color={isActive ? C.primary : C.textPrimary}
                fontSize={11}
                fontWeight="700"
              >
                v{v.version}
              </Text>
              {isLatest && (
                <Text
                  color={isActive ? C.primary : C.textMuted}
                  fontSize={9}
                  fontWeight="600"
                  letterSpacing={0.6}
                >
                  LATEST
                </Text>
              )}
              {v.generatedAt && (
                <Text
                  color={isActive ? C.primary : C.textMuted}
                  fontSize={10}
                >
                  · {formatGeneratedAt(v.generatedAt)}
                </Text>
              )}
            </Pressable>
          );
        })}
      </XStack>
    </YStack>
  );
}

/** "01/06/2026, 10:40:55" is hard to scan — collapse to "Jun 1, 10:40". */
function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Filled action chip used by the Download / Regenerate buttons in the
 * meta row. Standard ghost buttons were too quiet against the dark
 * card surface and the meeting feedback called them out specifically.
 * Variants:
 *   - "primary": brand-tinted fill, used for the main affordance
 *     (Regenerate, which produces a brand-new version)
 *   - "neutral": muted surface fill, used for the secondary
 *     affordance (Download, which acts on existing data)
 */
function ActionChip({
  label,
  icon,
  onPress,
  disabled,
  variant = "neutral",
}: {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "primary" | "neutral";
}) {
  const C = usePalette();
  const isPrimary = variant === "primary";
  const palette = isPrimary
    ? {
        bg: C.primaryDim,
        hoverBg: C.primaryHoverDim,
        border: C.primaryBorder,
        text: C.primary,
      }
    : {
        bg: C.surface,
        hoverBg: C.surfaceHover,
        border: C.border,
        text: C.textPrimary,
      };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      // @ts-expect-error react-native-web forwards `title` to the DOM for tooltips
      title={label}
      style={({ pressed, hovered }: any) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 28,
        paddingHorizontal: 10,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: palette.border,
        opacity: disabled ? 0.55 : 1,
        backgroundColor: pressed || hovered ? palette.hoverBg : palette.bg,
      })}
    >
      {icon}
      <Text color={palette.text} fontSize={11} fontWeight="600">
        {label}
      </Text>
    </Pressable>
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

/**
 * Web-only: render the insight's markdown report as styled HTML in a
 * new window and trigger the browser's print dialog so the user can
 * Save as PDF. Zero-dependency approach — no jsPDF/pdfmake bundle
 * hit. The native Print dialog lets the user pick the destination
 * and filename. Markdown-to-HTML uses a tiny inline parser that
 * covers what bg-tasks emits: ATX headers, bullets (incl. nested),
 * **bold**, *italic*, blockquotes, tables, horizontal rules.
 */
function downloadInsightPdf(insight: MeetingInsight) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const md = insight.fullReport && insight.fullReport.trim().length > 0
    ? insight.fullReport
    : buildFallbackMarkdown(insight);
  const body = markdownToHtml(md);
  const title = `Meeting Insight v${insight.version}`;
  const meta = insight.generatedAt
    ? `Generated ${new Date(insight.generatedAt).toLocaleString()} · v${insight.version}`
    : `v${insight.version}`;
  printHtmlInIframe(buildPrintableHtml(title, meta, body));
}

/**
 * Wraps a body fragment with the page chrome we use for printed
 * insight + transcript exports. Centralised here so both downloads
 * share the same look.
 */
function buildPrintableHtml(title: string, meta: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 20mm 18mm; }
  html, body { background: #fff; color: #0f172a; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
    font-size: 11pt; line-height: 1.55;
    max-width: 760px; margin: 0 auto; padding: 24px;
  }
  h1 { font-size: 22pt; margin: 0 0 12px; }
  h2 { font-size: 15pt; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
  h3 { font-size: 12pt; margin: 16px 0 6px; color: #334155; }
  p { margin: 6px 0; }
  ul, ol { margin: 4px 0 8px; padding-left: 22px; }
  li { margin: 2px 0; }
  li > ul, li > ol { margin: 2px 0; }
  strong { color: #0f172a; }
  em { color: #475569; }
  blockquote {
    border-left: 3px solid #94a3b8; margin: 8px 0;
    padding: 4px 12px; color: #475569; background: #f8fafc;
    font-style: italic;
  }
  hr { border: 0; border-top: 1px solid #e2e8f0; margin: 18px 0; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 14px; font-size: 10pt; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; }
  code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 90%; }
  pre {
    white-space: pre-wrap; word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 10pt; line-height: 1.5;
    margin: 0;
  }
  .meta { color: #64748b; font-size: 10pt; margin-bottom: 18px; }
  @media print {
    body { padding: 0; }
    h2 { page-break-after: avoid; }
    tr, li, blockquote { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">${escapeHtml(meta)}</div>
${bodyHtml}
</body>
</html>`;
}

/**
 * Renders printable HTML into a hidden iframe and triggers the
 * browser's print dialog. Switched from `window.open` because Chrome
 * refused to fire scripts in `document.write`d about:blank windows —
 * the tab opened blank with no print dialog. An iframe is more
 * reliable: same origin, srcdoc loads synchronously, `load` fires
 * deterministically.
 */
export function printHtmlInIframe(html: string) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  iframe.srcdoc = html;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      // Surface in console — the print() call should rarely throw
      // outside of cross-origin restrictions (not our case here).
      // eslint-disable-next-line no-console
      console.error("[insights] print failed", err);
    }
    // Some browsers fire `afterprint` on the iframe, some don't.
    // Use a longer-than-the-dialog timeout fallback so the iframe is
    // always removed eventually.
    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };
    iframe.contentWindow?.addEventListener("afterprint", cleanup);
    setTimeout(cleanup, 60_000);
  };
  document.body.appendChild(iframe);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Tiny markdown → HTML converter scoped to what the bg-tasks pipeline
 * emits. Not a general markdown engine — keep additions narrow to
 * what `fullReport` actually contains. Inline patterns (bold / italic
 * / code) are applied per-line after block parsing so they work
 * inside list items + table cells.
 */
function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  // Track open block contexts so we close them when the block ends.
  let ulDepth = 0;
  let inQuote = false;
  let inTable = false;

  const closeUl = () => {
    while (ulDepth > 0) {
      out.push("</ul>");
      ulDepth--;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      out.push("</blockquote>");
      inQuote = false;
    }
  };
  const closeTable = () => {
    if (inTable) {
      out.push("</tbody></table>");
      inTable = false;
    }
  };
  const closeAll = () => { closeUl(); closeQuote(); closeTable(); };

  const inline = (s: string) =>
    escapeHtml(s)
      // bold
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      // italic — apply after bold so the **...** isn't eaten as *.*
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      // inline code
      .replace(/`([^`]+)`/g, "<code>$1</code>");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();
    // Horizontal rule
    if (/^---+\s*$/.test(line)) { closeAll(); out.push("<hr/>"); continue; }
    // Blank line — closes most blocks, paragraph break otherwise
    if (line.trim() === "") { closeAll(); continue; }
    // Headers
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      closeAll();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    // Blockquote
    if (/^>\s?/.test(line)) {
      closeUl(); closeTable();
      if (!inQuote) { out.push("<blockquote>"); inQuote = true; }
      out.push(`<p>${inline(line.replace(/^>\s?/, ""))}</p>`);
      continue;
    }
    closeQuote();
    // Table — detect header row by next line being |---|---|
    const isTableRow = /^\|.*\|\s*$/.test(line);
    const next = lines[i + 1] ?? "";
    const isSeparatorAhead = /^\s*\|?\s*[-:]+(\s*\|\s*[-:]+)+\s*\|?\s*$/.test(next);
    if (isTableRow && !inTable && isSeparatorAhead) {
      closeUl();
      out.push("<table><thead><tr>");
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      for (const c of cells) out.push(`<th>${inline(c)}</th>`);
      out.push("</tr></thead><tbody>");
      inTable = true;
      i++; // skip the separator
      continue;
    }
    if (isTableRow && inTable) {
      out.push("<tr>");
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      for (const c of cells) out.push(`<td>${inline(c)}</td>`);
      out.push("</tr>");
      continue;
    }
    closeTable();
    // Bullet list (with optional 2-space indent for nesting)
    const bullet = /^(\s*)[-*]\s+(.*)$/.exec(raw);
    if (bullet) {
      const indent = bullet[1].length;
      const depth = Math.min(3, 1 + Math.floor(indent / 2));
      while (ulDepth < depth) { out.push("<ul>"); ulDepth++; }
      while (ulDepth > depth) { out.push("</ul>"); ulDepth--; }
      out.push(`<li>${inline(bullet[2])}</li>`);
      continue;
    }
    closeUl();
    // Default: paragraph
    out.push(`<p>${inline(line)}</p>`);
  }
  closeAll();
  return out.join("\n");
}
